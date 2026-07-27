/**
 * Kartendarstellung.
 *
 * Bewusst ohne Kachel-Dienst: Küstenlinien (Natural Earth) und historische
 * Grenzen werden als Vektoren gezeichnet. Dadurch ist der Atlas vollständig
 * eigenständig, funktioniert offline und lässt sich in beiden Farbwelten
 * frei gestalten.
 *
 * Ebenenfolge (unten → oben):
 *   Land → Gemeinwesen A/B (Überblendung) → Gewässer → Gradnetz →
 *   Küstenkontur → Auswahl-Hervorhebung → Beschriftung
 */
import L from 'leaflet';
import { createLabelLayer } from './labels.js';
import {
  paletteFor, assignColorIndices, PRECISION_COLORS, withAlpha, shade,
} from './palette.js';

const PANES = {
  land: 210,
  polityA: 220,
  polityB: 230,
  water: 240,
  graticule: 244,
  coast: 248,
  highlight: 256,
  label: 270,
};

const HOME = { center: [26, 12], zoom: 2.4 };

/** Gradnetz alle 15° als GeoJSON – billiger als ein weiterer Datensatz. */
function graticule(step = 15) {
  const lines = [];
  for (let lng = -180; lng <= 180; lng += step) {
    const coords = [];
    for (let lat = -85; lat <= 85; lat += 5) coords.push([lng, lat]);
    lines.push(coords);
  }
  for (let lat = -75; lat <= 75; lat += step) {
    const coords = [];
    for (let lng = -180; lng <= 180; lng += 5) coords.push([lng, lat]);
    lines.push(coords);
  }
  return { type: 'Feature', geometry: { type: 'MultiLineString', coordinates: lines }, properties: {} };
}

export class AtlasMap {
  constructor(el, { theme = 'night' } = {}) {
    this.theme = theme;
    this.colorMode = 'polity';
    this.showLabels = true;
    this.showBorders = true;
    this.showWater = false;
    this.showGraticule = false;

    this.epoch = null;
    this.colors = new Map();
    this.selected = null;
    this.hovered = null;
    this._handlers = { select: [], hover: [], view: [] };
    this._boundsCache = new Map();

    this.map = L.map(el, {
      center: HOME.center,
      zoom: HOME.zoom,
      minZoom: 1.6,
      maxZoom: 8,
      zoomControl: false,
      attributionControl: false,
      preferCanvas: true,
      zoomSnap: 0,
      zoomDelta: 0.6,
      wheelPxPerZoomLevel: 140,
      worldCopyJump: false,
      maxBounds: L.latLngBounds([-89, -220], [89, 220]),
      maxBoundsViscosity: .85,
      inertiaDeceleration: 2600,
    });

    for (const [name, z] of Object.entries(PANES)) {
      const pane = this.map.createPane(name);
      pane.style.zIndex = String(z);
      pane.style.pointerEvents = 'none';
    }

    this._initBaseLayers();
    this._initPolityLayers();

    this.labelLayer = createLabelLayer({ pane: 'label' });
    this.labelLayer.addTo(this.map);

    this.map.on('zoomend moveend', () => this._emit('view'));
    this.map.on('mousedown', () => el.classList.add('is-grabbing'));
    this.map.on('mouseup', () => el.classList.remove('is-grabbing'));

    this.applyTheme(theme);
  }

  /* ------------------------------------------------------------ Aufbau */

  _initBaseLayers() {
    this.landLayer = L.geoJSON(null, {
      pane: 'land',
      renderer: L.canvas({ pane: 'land', padding: .3 }),
      interactive: false,
      smoothFactor: 1.1,
    }).addTo(this.map);

    this.coastLayer = L.geoJSON(null, {
      pane: 'coast',
      renderer: L.canvas({ pane: 'coast', padding: .3 }),
      interactive: false,
      smoothFactor: 1.1,
    }).addTo(this.map);

    this.waterLayer = L.geoJSON(null, {
      pane: 'water',
      renderer: L.canvas({ pane: 'water', padding: .3 }),
      interactive: false,
      smoothFactor: 1.2,
    });

    this.graticuleLayer = L.geoJSON(graticule(), {
      pane: 'graticule',
      renderer: L.canvas({ pane: 'graticule', padding: .3 }),
      interactive: false,
    });

    this.highlightLayer = L.geoJSON(null, {
      pane: 'highlight',
      renderer: L.svg({ pane: 'highlight', padding: .4 }),
      interactive: false,
      className: 'sel-shape',
    }).addTo(this.map);
  }

  _initPolityLayers() {
    this.slots = ['polityA', 'polityB'].map((pane) => ({
      pane,
      el: this.map.getPane(pane),
      renderer: L.canvas({ pane, padding: .35 }),
      layer: null,
    }));
    this.slots.forEach((slot) => {
      slot.el.style.transition = 'opacity 300ms cubic-bezier(.32,.72,.29,1)';
      slot.el.style.opacity = '0';
    });
    this.activeSlot = 0;
  }

  setBaseData({ land, lakes, rivers }) {
    if (land) {
      this.landLayer.addData(land);
      this.coastLayer.addData(land);
    }
    if (lakes) this.waterLayer.addData(lakes);
    if (rivers) this.waterLayer.addData(rivers);
    this._styleBase();
  }

  /* ------------------------------------------------------------ Themes */

  applyTheme(theme) {
    this.theme = theme;
    this.palette = paletteFor(theme);
    this._styleBase();
    if (this.epoch) {
      this._computeColors();
      this._restyleActive();
      this._refreshHighlight();
    }
    this._styleLabels();
  }

  _cssVar(name, fallback) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  }

  _styleBase() {
    const land = this._cssVar('--land', '#1b2733');
    const edge = this._cssVar('--land-edge', '#2f4457');
    const river = this._cssVar('--river', '#5aa');
    const grat = this._cssVar('--grat', 'rgba(255,255,255,.08)');
    const ocean = this._cssVar('--ocean-2', '#0d1a28');

    this.landLayer.setStyle({ fillColor: land, fillOpacity: 1, stroke: false });
    this.coastLayer.setStyle({ stroke: true, color: edge, weight: .8, opacity: .9, fill: false });
    this.waterLayer.setStyle((f) => (
      f.geometry.type.includes('Line')
        ? { stroke: true, color: river, weight: .7, opacity: .75, fill: false }
        : { fillColor: ocean, fillOpacity: .95, stroke: true, color: river, weight: .5, opacity: .6 }
    ));
    this.graticuleLayer.setStyle({ stroke: true, color: grat, weight: .6, opacity: 1, fill: false });
  }

  _styleLabels() {
    this.labelLayer.setStyle({
      ink: this._cssVar('--label-ink', '#fff'),
      halo: this._cssVar('--label-halo', 'rgba(0,0,0,.9)'),
      accent: this._cssVar('--gold', '#e6bc79'),
      font: this._cssVar('--font-ui', 'sans-serif'),
    });
  }

  /* ----------------------------------------------------------- Farben */

  _colorKey(props) {
    switch (this.colorMode) {
      case 'sovereign': return props.s || props.n;
      case 'culture': return props.p || props.n;
      case 'precision': return `p${props.b ?? 0}`;
      default: return props.n;
    }
  }

  _computeColors() {
    const data = this.epoch;
    this.colors = new Map();

    if (this.colorMode === 'precision') {
      const table = PRECISION_COLORS[this.theme] ?? PRECISION_COLORS.night;
      for (const [k, v] of Object.entries(table)) this.colors.set(`p${k}`, v);
      return;
    }

    const adjacency = this.colorMode === 'sovereign' ? data.sovereignAdjacency
      : this.colorMode === 'culture' ? data.cultureAdjacency
        : data.adjacency;

    const keys = new Set();
    for (const f of data.geojson.features) {
      const key = this._colorKey(f.properties);
      if (key) keys.add(key);
    }
    const indices = assignColorIndices([...keys], adjacency, this.palette.length);
    for (const [key, i] of indices) this.colors.set(key, this.palette[i]);
  }

  colorOf(key) {
    return this.colors.get(key) ?? this.palette[0];
  }

  /** Farbe eines Gemeinwesens – auch für Chips und Legende außerhalb der Karte. */
  colorOfPolity(name) {
    if (!this.epoch) return this.palette[0];
    const entry = this.epoch.byName.get(name);
    if (!entry) return this.colorOf(name);
    const props = { n: entry.name, s: entry.sovereign, p: entry.partOf, b: entry.precision };
    return this.colorOf(this._colorKey(props));
  }

  _styleFeature(feature) {
    const props = feature.properties;
    const color = this.colorOf(this._colorKey(props));
    const alpha = Number(this._cssVar('--fill-alpha', '.58'));
    const line = this._cssVar('--border-line-soft', 'rgba(255,255,255,.22)');
    const precision = props.b ?? 0;

    return {
      fillColor: color,
      fillOpacity: alpha,
      stroke: this.showBorders,
      color: this.showBorders ? line : 'transparent',
      weight: precision >= 3 ? .9 : precision === 2 ? .75 : .6,
      dashArray: precision === 1 ? '2.5 2.5' : null,
      lineJoin: 'round',
      lineCap: 'round',
      opacity: precision === 1 ? .7 : .95,
      bubblingMouseEvents: false,
    };
  }

  _restyleActive() {
    const slot = this.slots[this.activeSlot];
    if (slot.layer) slot.layer.setStyle((f) => this._styleFeature(f));
  }

  setColorMode(mode) {
    if (this.colorMode === mode) return;
    this.colorMode = mode;
    if (!this.epoch) return;
    this._computeColors();
    this._restyleActive();
    this._updateLabels();
    this._refreshHighlight();
  }

  /* ------------------------------------------------------- Zeitschnitt */

  /** Neuen Zeitschnitt einblenden und den alten ausblenden. */
  setEpoch(data, { animate = true } = {}) {
    this.epoch = data;
    this._boundsCache = new Map();
    this._computeColors();

    const next = (this.activeSlot + 1) % 2;
    const from = this.slots[this.activeSlot];
    const to = this.slots[next];

    if (to.layer) {
      to.layer.remove();
      to.layer = null;
    }

    to.layer = L.geoJSON(data.geojson, {
      pane: to.pane,
      renderer: to.renderer,
      smoothFactor: 1.0,
      style: (f) => this._styleFeature(f),
      onEachFeature: (feature, layer) => {
        layer.on('mouseover', () => this._onHover(feature.properties.n));
        layer.on('mouseout', () => this._onHover(null));
        layer.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          this._emit('select', feature.properties.n);
        });
      },
    }).addTo(this.map);

    from.el.style.pointerEvents = 'none';
    to.el.style.pointerEvents = 'auto';
    to.el.style.transition = animate ? 'opacity 300ms cubic-bezier(.32,.72,.29,1)' : 'none';
    from.el.style.transition = animate ? 'opacity 300ms cubic-bezier(.32,.72,.29,1)' : 'none';

    // Ein Frame Vorlauf, damit der Browser die Startdeckkraft übernimmt.
    requestAnimationFrame(() => {
      to.el.style.opacity = '1';
      from.el.style.opacity = '0';
    });

    this.activeSlot = next;
    window.setTimeout(() => {
      if (this.activeSlot !== this.slots.indexOf(from) && from.layer) {
        from.layer.remove();
        from.layer = null;
      }
    }, animate ? 340 : 0);

    this._updateLabels();
    this._refreshHighlight();
  }

  /* -------------------------------------------------------- Beschriftung */

  /** Gesamtausdehnung aller Teilstücke – Grundlage für „auf der Karte zeigen“. */
  boundsOf(name) {
    if (this._boundsCache.has(name)) return this._boundsCache.get(name);
    const entry = this.epoch?.byName.get(name);
    if (!entry) return null;
    const bounds = L.latLngBounds([]);
    for (const f of entry.features) {
      const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
      for (const poly of polys) {
        for (const [lng, lat] of poly[0] ?? []) bounds.extend([lat, lng]);
      }
    }
    this._boundsCache.set(name, bounds);
    return bounds;
  }

  /** Ausdehnung nur des beschrifteten Teilstücks. */
  labelBoundsOf(entry) {
    const box = entry.labelBox;
    if (!box) return null;
    return L.latLngBounds([box[1], box[0]], [box[3], box[2]]);
  }

  setLabelNames(resolver) {
    this._labelName = resolver;
    this._updateLabels();
  }

  /**
   * Beschriftungen entstehen je Teilstück, nicht je Gemeinwesen: Gedruckte
   * Atlanten setzen den Namen eines zerteilten Reiches auch mehrfach – etwa
   * Dänemark auf Jütland und auf Grönland. Höchstens zwei Nennungen pro
   * Name, sonst überschwemmen Inselketten die Karte.
   */
  _updateLabels() {
    if (!this.epoch) return;
    if (!this.showLabels) {
      this.labelLayer.setItems([]);
      return;
    }

    const candidates = [];
    for (const f of this.epoch.geojson.features) {
      const p = f.properties;
      if (!p.c || !p.bb) continue;
      candidates.push(p);
    }
    candidates.sort((a, b) => (b.pa ?? 0) - (a.pa ?? 0));

    const perName = new Map();
    const items = [];
    for (const p of candidates) {
      const used = perName.get(p.n) ?? 0;
      if (used >= 2) continue;
      perName.set(p.n, used + 1);
      items.push({
        key: p.n,
        text: this._labelName ? this._labelName(p.n) : p.n,
        latlng: L.latLng(p.c[1], p.c[0]),
        bounds: L.latLngBounds([p.bb[1], p.bb[0]], [p.bb[3], p.bb[2]]),
        color: this.colorOf(this._colorKey(p)),
      });
    }
    this.labelLayer.setItems(items);
  }

  setShowLabels(on) {
    this.showLabels = on;
    this._updateLabels();
  }

  setShowBorders(on) {
    this.showBorders = on;
    this._restyleActive();
  }

  setShowWater(on) {
    this.showWater = on;
    if (on) this.waterLayer.addTo(this.map);
    else this.waterLayer.remove();
  }

  setShowGraticule(on) {
    this.showGraticule = on;
    if (on) this.graticuleLayer.addTo(this.map);
    else this.graticuleLayer.remove();
  }

  /* ---------------------------------------------------------- Auswahl */

  _onHover(name) {
    if (this.hovered === name) return;
    this.hovered = name;
    this.labelLayer.setHighlight({ selected: this.selected, hover: name });
    this._emit('hover', name);
  }

  select(name, { zoom = false } = {}) {
    this.selected = name;
    this._refreshHighlight();
    this.labelLayer.setHighlight({ selected: name, hover: this.hovered });
    if (zoom && name) this.focus(name);
  }

  _refreshHighlight() {
    this.highlightLayer.clearLayers();
    if (!this.selected || !this.epoch) return;
    const entry = this.epoch.byName.get(this.selected);
    if (!entry) return;

    const color = this.colorOfPolity(this.selected);
    this.highlightLayer.addData({ type: 'FeatureCollection', features: entry.features });
    this.highlightLayer.setStyle({
      fillColor: color,
      fillOpacity: Math.min(.95, Number(this._cssVar('--fill-alpha', '.58')) + .3),
      color: shade(color, this.theme === 'night' ? .55 : -.35),
      weight: 1.8,
      opacity: 1,
      dashArray: null,
    });
  }

  /** Auf ein Gemeinwesen zoomen, ohne die Detailtafel zu verdecken. */
  focus(name, { padding = [70, 70] } = {}) {
    const bounds = this.boundsOf(name);
    if (!bounds || !bounds.isValid()) return;
    this.map.flyToBounds(bounds, {
      padding,
      maxZoom: 6,
      duration: .75,
      easeLinearity: .28,
    });
  }

  home() {
    this.map.flyTo(HOME.center, HOME.zoom, { duration: .8 });
  }

  zoomBy(delta) {
    this.map.setZoom(this.map.getZoom() + delta, { animate: true });
  }

  /** Länge und Beschriftung des Maßstabsbalkens für die aktuelle Ansicht. */
  scaleInfo(targetPx = 64) {
    const center = this.map.getCenter();
    const p1 = this.map.containerPointToLatLng([0, this.map.getSize().y / 2]);
    const p2 = this.map.containerPointToLatLng([targetPx, this.map.getSize().y / 2]);
    const meters = p1.distanceTo(p2);
    const km = meters / 1000;
    // auf eine „runde“ Zahl bringen
    const pow = 10 ** Math.floor(Math.log10(km));
    const steps = [1, 2, 5, 10];
    const nice = steps.map((s) => s * pow).reduce((a, b) => (Math.abs(b - km) < Math.abs(a - km) ? b : a));
    return { km: nice, px: Math.round((nice / km) * targetPx), center };
  }

  /* ------------------------------------------------------------ Events */

  on(event, handler) {
    this._handlers[event]?.push(handler);
    return this;
  }

  _emit(event, payload) {
    for (const handler of this._handlers[event] ?? []) handler(payload);
  }
}

export { withAlpha };
