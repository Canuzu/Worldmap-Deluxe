/**
 * Beschriftungsebene.
 *
 * Leaflet bringt keine Kollisionserkennung für Text mit, deshalb eine eigene
 * Canvas-Ebene: Labels werden nach Flächenrang vergeben, jede Beschriftung
 * belegt ein Rechteck, spätere Kandidaten weichen aus oder entfallen. Das
 * ergibt ein ruhiges Kartenbild, das beim Zoomen immer mehr Details freigibt.
 */
import L from 'leaflet';

const PAD_X = 5;
const PAD_Y = 3;

export const LabelLayer = L.Layer.extend({
  options: {
    pane: 'labelPane',
    minPixelSize: 34,   // kleinere Gebiete bekommen keinen Namen
    maxLabels: 90,
  },

  initialize(options) {
    L.setOptions(this, options);
    this._items = [];
    this._style = { ink: '#fff', halo: '#000', accent: '#e6bc79' };
    this._selected = null;
    this._hover = null;
    this._opacity = 1;
  },

  onAdd(map) {
    this._map = map;
    const canvas = (this._canvas = L.DomUtil.create('canvas', 'label-canvas'));
    canvas.style.position = 'absolute';
    canvas.style.pointerEvents = 'none';
    canvas.style.transformOrigin = '50% 50%';
    this.getPane().appendChild(canvas);

    map.on('move zoom viewreset resize zoomend moveend', this._reset, this);
    this._reset();
    return this;
  },

  onRemove(map) {
    map.off('move zoom viewreset resize zoomend moveend', this._reset, this);
    this._canvas.remove();
    this._map = null;
  },

  /** @param {{text:string, latlng:L.LatLng, bounds:L.LatLngBounds, rank:number, color:string}[]} items */
  setItems(items) {
    this._items = items;
    this._reset();
    return this;
  },

  setStyle(style) {
    Object.assign(this._style, style);
    this._reset();
    return this;
  },

  setHighlight({ selected, hover }) {
    this._selected = selected ?? null;
    this._hover = hover ?? null;
    this._reset();
    return this;
  },

  setOpacity(value) {
    this._opacity = value;
    if (this._canvas) this._canvas.style.opacity = value;
    return this;
  },

  _reset() {
    if (!this._map || !this._canvas) return;
    cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame(() => this._draw());
  },

  _draw() {
    const map = this._map;
    if (!map) return;

    const size = map.getSize();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const canvas = this._canvas;

    if (canvas.width !== Math.round(size.x * dpr) || canvas.height !== Math.round(size.y * dpr)) {
      canvas.width = Math.round(size.x * dpr);
      canvas.height = Math.round(size.y * dpr);
      canvas.style.width = `${size.x}px`;
      canvas.style.height = `${size.y}px`;
    }

    // Die Ebene liegt in einem Pane, das Leaflet beim Pannen verschiebt –
    // wir zeichnen aber in Container-Koordinaten und gleichen das aus.
    const topLeft = map.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(canvas, topLeft);

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.x, size.y);

    const zoom = map.getZoom();
    const placed = [];
    let drawn = 0;

    for (const item of this._items) {
      if (drawn >= this.options.maxLabels) break;

      const nePt = map.latLngToContainerPoint(item.bounds.getNorthEast());
      const swPt = map.latLngToContainerPoint(item.bounds.getSouthWest());
      const w = Math.abs(nePt.x - swPt.x);
      const h = Math.abs(nePt.y - swPt.y);
      const extent = Math.min(Math.max(w, h), Math.max(Math.min(w, h) * 3.2, 20));

      const isFocus = item.key === this._selected || item.key === this._hover;
      if (!isFocus && extent < this.options.minPixelSize) continue;

      const pt = map.latLngToContainerPoint(item.latlng);
      if (pt.x < -120 || pt.y < -60 || pt.x > size.x + 120 || pt.y > size.y + 60) continue;

      // Schriftgrad aus Bildschirmausdehnung und Zoomstufe
      let fontSize = Math.min(21, Math.max(9.5, 6.2 + Math.sqrt(extent) * 0.72 + zoom * 0.28));
      if (isFocus) fontSize = Math.max(fontSize, 12.5);

      // Sammelbezeichnungen wie „Jäger und Sammler des östlichen Nordamerika“
      // würden sonst die Karte beherrschen – lange Namen werden kleiner gesetzt.
      let text = item.text;
      if (text.length > 30) fontSize *= .68;
      else if (text.length > 18) fontSize *= .82;
      fontSize = Math.max(8.5, fontSize);

      const weight = fontSize >= 15 ? 600 : 500;
      ctx.font = `${weight} ${fontSize.toFixed(1)}px ${this._style.font}`;

      const maxWidth = Math.max(84, w * 1.35);
      let metrics = ctx.measureText(text);
      if (metrics.width > maxWidth && text.includes(' ')) {
        // Mehrzeilig setzen statt abschneiden – bis zu drei Zeilen
        const parts = wrap(ctx, text, maxWidth);
        if (parts.length <= 3) {
          drawn += drawMultiline(ctx, parts, pt, fontSize, this._style, isFocus, item, placed) ? 1 : 0;
          continue;
        }
      }
      if (metrics.width > size.x * 0.42) {
        text = `${text.slice(0, 26).trimEnd()}…`;
        metrics = ctx.measureText(text);
      }

      const box = {
        x: pt.x - metrics.width / 2 - PAD_X,
        y: pt.y - fontSize * 0.62 - PAD_Y,
        w: metrics.width + PAD_X * 2,
        h: fontSize * 1.24 + PAD_Y * 2,
      };
      if (!isFocus && collides(box, placed)) continue;
      placed.push(box);

      paint(ctx, text, pt.x, pt.y, this._style, isFocus, item.color);
      drawn++;
    }
  },
});

function wrap(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawMultiline(ctx, lines, pt, fontSize, style, isFocus, item, placed) {
  const lineHeight = fontSize * 1.18;
  const widths = lines.map((l) => ctx.measureText(l).width);
  const width = Math.max(...widths);
  const top = pt.y - ((lines.length - 1) * lineHeight) / 2;

  const box = {
    x: pt.x - width / 2 - PAD_X,
    y: top - fontSize * 0.62 - PAD_Y,
    w: width + PAD_X * 2,
    h: lineHeight * lines.length + PAD_Y * 2,
  };
  if (!isFocus && collides(box, placed)) return false;
  placed.push(box);

  lines.forEach((line, i) => {
    paint(ctx, line, pt.x, top + i * lineHeight, style, isFocus, item.color);
  });
  return true;
}

function paint(ctx, text, x, y, style, isFocus, color) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;

  ctx.strokeStyle = style.halo;
  ctx.lineWidth = isFocus ? 4.2 : 3.2;
  ctx.strokeText(text, x, y);

  ctx.fillStyle = isFocus ? style.accent : style.ink;
  ctx.fillText(text, x, y);

  if (isFocus) {
    ctx.save();
    ctx.globalAlpha = .28;
    ctx.fillStyle = color ?? style.accent;
    ctx.fillText(text, x, y);
    ctx.restore();
  }
}

function collides(box, placed) {
  for (const other of placed) {
    if (box.x < other.x + other.w && box.x + box.w > other.x &&
        box.y < other.y + other.h && box.y + box.h > other.y) {
      return true;
    }
  }
  return false;
}

export function createLabelLayer(options) {
  return new LabelLayer(options);
}
