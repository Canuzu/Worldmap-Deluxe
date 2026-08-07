/**
 * Beschriftungsebene.
 *
 * Leaflet bringt keine Kollisionserkennung für Text mit, deshalb eine eigene
 * Canvas-Ebene: Labels werden nach Flächenrang vergeben, jede Beschriftung
 * belegt ein Rechteck, spätere Kandidaten weichen aus oder entfallen. Das
 * ergibt ein ruhiges Kartenbild, das beim Zoomen immer mehr Details freigibt.
 */
import L from 'leaflet';
import { schriftdichte } from './dichte.js';

const PAD_X = 5;
const PAD_Y = 3;

/**
 * Textbreite – gemessen, dann gemerkt.
 *
 * `measureText` ist der größte einzelne Posten der Seite: In jeder Messung
 * stand es an erster Stelle der Selbstzeiten. Der Grund ist nicht, dass
 * Messen teuer wäre, sondern dass wir dieselbe Frage unablässig wiederholen.
 * Die Namen auf der Karte ändern sich nicht, die Schriftgrade sind aus einer
 * Handvoll Stufen – aber jedes Neuzeichnen misst alles noch einmal.
 *
 * Der Schlüssel enthält den Schriftschnitt, denn dieselbe Zeichenkette ist in
 * anderer Schrift anders breit. Bei Überlauf wird der Speicher ganz geleert
 * statt einzeln aufgeräumt: Das kommt selten vor, und ein halb geräumter
 * Speicher wäre schwerer zu beurteilen als ein leerer.
 */
const massSpeicher = new Map();

export function breiteVon(ctx, text) {
  const schluessel = `${ctx.font}\u001f${ctx.letterSpacing ?? ''}\u001f${text}`;
  const bekannt = massSpeicher.get(schluessel);
  if (bekannt !== undefined) return bekannt;
  const breite = ctx.measureText(text).width;
  if (massSpeicher.size > 4000) massSpeicher.clear();
  massSpeicher.set(schluessel, breite);
  return breite;
}

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

    /*
     * Beim Ziehen wird nicht neu gezeichnet.
     *
     * Vorher hing dieses Neuzeichnen an `move` – also an jedem einzelnen Bild
     * einer Ziehbewegung. Für jedes Bild lief die Kollisionsprüfung über alle
     * Gemeinwesen, samt Textausmessung: gemessen 34 ms je Bild, der
     * zweitgrößte Posten des ganzen Kartenbildes.
     *
     * Nötig war das, weil die Zeichenfläche in Bildschirmkoordinaten liegt und
     * bei jedem Bild gegen die Verschiebung der Kartenebene ausgeglichen wurde.
     * Lässt man diesen Ausgleich während des Ziehens weg, reitet sie einfach
     * mit der Karte mit – und das ist genau richtig, denn eine Beschriftung
     * gehört zu einem Ort, nicht zum Bildschirm. Ausgeglichen und neu belegt
     * wird erst, wenn die Bewegung steht.
     */
    map.on('moveend zoomend viewreset resize', this._reset, this);
    // Beim Zoomen skaliert Leaflet die ganze Kartenebene. Mitskalierter Text
    // sieht verwaschen aus; für die Dauer der Bewegung tritt er deshalb ab.
    map.on('zoomstart', this._verbergen, this);
    this._reset();
    return this;
  },

  onRemove(map) {
    map.off('moveend zoomend viewreset resize', this._reset, this);
    map.off('zoomstart', this._verbergen, this);
    this._canvas.remove();
    this._map = null;
  },

  _verbergen() {
    if (this._canvas) this._canvas.style.visibility = 'hidden';
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
    const dpr = schriftdichte();
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

    canvas.style.visibility = '';

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.x, size.y);

    const zoom = map.getZoom();
    const placed = [];
    let drawn = 0;

    /* Auf dem Telefon eine eigene Rechnung, nicht dieselbe kleiner.
     *
     * „Osmanisches Reich" nahm bei 390 Bildpunkten Breite 74 Prozent davon
     * ein – die Schrift war für einen Bildschirm gerechnet, der viermal so
     * breit ist. Ein Name, der über das halbe Bild läuft, ist keine
     * Beschriftung mehr, sondern ein Hindernis.
     *
     * Zugleich weniger Namen: Auf einem Telefon ist die Karte ein Ausschnitt,
     * und dreißig Namen darauf sind mehr, als man lesen will. Was wegfällt,
     * sind die kleinsten – die großen Reiche bleiben. */
    const eng = size.x < 560;
    const grenzGrad = eng ? 15 : 21;
    const mindestGroesse = this.options.minPixelSize * (eng ? 1.5 : 1);
    const hoechstZahl = eng ? 34 : this.options.maxLabels;

    for (const item of this._items) {
      if (drawn >= hoechstZahl) break;

      const nePt = map.latLngToContainerPoint(item.bounds.getNorthEast());
      const swPt = map.latLngToContainerPoint(item.bounds.getSouthWest());
      const w = Math.abs(nePt.x - swPt.x);
      const h = Math.abs(nePt.y - swPt.y);
      const extent = Math.min(Math.max(w, h), Math.max(Math.min(w, h) * 3.2, 20));

      const isFocus = item.key === this._selected || item.key === this._hover;
      if (!isFocus && extent < mindestGroesse) continue;

      const pt = map.latLngToContainerPoint(item.latlng);
      if (pt.x < -120 || pt.y < -60 || pt.x > size.x + 120 || pt.y > size.y + 60) continue;

      // Schriftgrad aus Bildschirmausdehnung und Zoomstufe
      let fontSize = Math.min(grenzGrad, Math.max(eng ? 9 : 9.5,
        6.2 + Math.sqrt(extent) * 0.72 + zoom * 0.28));
      if (isFocus) fontSize = Math.max(fontSize, 12.5);

      // Sammelbezeichnungen wie „Jäger und Sammler des östlichen Nordamerika“
      // würden sonst die Karte beherrschen – lange Namen werden kleiner gesetzt.
      let text = item.text;
      if (text.length > 30) fontSize *= .68;
      else if (text.length > 18) fontSize *= .82;
      fontSize = Math.max(8.5, fontSize);

      setFont(ctx, fontSize, this._style);

      const maxWidth = Math.max(84, w * 1.35);
      let breite = breiteVon(ctx, text);
      if (breite > maxWidth && text.includes(' ')) {
        // Mehrzeilig setzen statt abschneiden – bis zu drei Zeilen
        const parts = wrap(ctx, text, maxWidth);
        if (parts.length <= 3) {
          drawn += drawMultiline(ctx, parts, pt, fontSize, this._style, isFocus, item, placed) ? 1 : 0;
          continue;
        }
      }
      if (breite > size.x * (eng ? .5 : .42)) {
        text = `${text.slice(0, 26).trimEnd()}…`;
        breite = breiteVon(ctx, text);
      }

      const box = {
        x: pt.x - breite / 2 - PAD_X,
        y: pt.y - fontSize * 0.62 - PAD_Y,
        w: breite + PAD_X * 2,
        h: fontSize * 1.24 + PAD_Y * 2,
      };
      if (!isFocus && collides(box, placed)) continue;
      placed.push(box);

      paint(ctx, text, pt.x, pt.y, this._style, isFocus, item.color);
      drawn++;
    }
  },
});

/**
 * Schriftschnitt einer Beschriftung setzen.
 *
 * Gedruckte Atlanten setzen Länder in einer Antiqua und sperren die großen
 * Namen – ein Reich, das einen Kontinent füllt, bekommt seinen Namen nicht
 * fett, sondern weit. Genau das macht den Unterschied zwischen einer Karte,
 * die nach Bildschirm aussieht, und einer, die nach Tafel aussieht.
 *
 * ctx.letterSpacing kennen nicht alle Browser; ohne die Eigenschaft fällt nur
 * die Sperrung weg, alles andere bleibt.
 */
function setFont(ctx, fontSize, style) {
  const gross = fontSize >= 14;
  const weight = gross ? 500 : 600;
  ctx.font = `${weight} ${fontSize.toFixed(1)}px ${style.font}`;
  if ('letterSpacing' in ctx) {
    ctx.letterSpacing = gross ? `${(fontSize * 0.075).toFixed(2)}px` : '0px';
  }
}

function wrap(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (breiteVon(ctx, candidate) > maxWidth && current) {
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
  setFont(ctx, fontSize, style);
  const lineHeight = fontSize * 1.18;
  const widths = lines.map((l) => breiteVon(ctx, l));
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

  // Zwei Lagen Rückhalt statt einer dicken: außen ein weicher Schatten, der
  // die Schrift von unruhigem Untergrund abhebt, innen eine schmale Kontur.
  // Eine einzelne dicke Kontur lässt Serifen zulaufen – bei einer Antiqua
  // fällt genau das auf.
  ctx.save();
  ctx.shadowColor = style.halo;
  ctx.shadowBlur = isFocus ? 7 : 5;
  ctx.strokeStyle = style.halo;
  ctx.lineWidth = isFocus ? 3 : 2.4;
  ctx.strokeText(text, x, y);
  ctx.strokeText(text, x, y);
  ctx.restore();

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
