/**
 * Kartendarstellung.
 *
 * Bewusst ohne Kachel-Dienst: Küstenlinien (Natural Earth) und historische
 * Grenzen werden als Vektoren gezeichnet. Dadurch ist der Atlas vollständig
 * eigenständig, funktioniert offline und lässt sich in beiden Farbwelten
 * frei gestalten.
 *
 * Ebenenfolge (unten → oben):
 *   Landfarbe (Hintergrund) → Gemeinwesen A/B (Überblendung) →
 *   Meer + Küstenlinie → Gewässer → Gradnetz → Auswahl → Beschriftung
 *
 * Der Kniff liegt in der Meeresebene: Sie ist nicht das Land, sondern dessen
 * Gegenstück – ein Polygon mit einem Loch je Landmasse. Weil sie ÜBER den
 * Grenzflächen liegt, enden diese exakt an der echten Küstenlinie, ohne dass
 * jeder Zeitschnitt die Küstenpunkte selbst mitschleppen müsste.
 */
import L from 'leaflet';
import { createLabelLayer } from './labels.js';
import {
  paletteFor, assignColorIndices, PRECISION_COLORS, withAlpha, shade,
} from './palette.js';

const PANES = {
  basemap: 200,
  polityA: 220,
  polityB: 230,
  ocean: 240,
  // Der Küstensaum liegt ÜBER dem Meer, nicht darunter: Das Meer ist eine
  // deckende Fläche mit einem Loch je Landmasse und würde alles Tiefere
  // überdecken. Von oben legt sich der Saum als Lichtkante über beide Seiten
  // der Küste – seewärts als Untiefenband, landwärts als Kantenlicht.
  //
  // Zwei Bänder, weil eines flach aussieht: ein breites, stark
  // weichgezeichnetes für die Tiefe und ein schmales, fast scharfes für die
  // Kante. Genau so haben Kupferstecher Untiefen angelegt – erst der weite
  // Ton, dann die enge Parallele.
  coastglow: 241,
  coastrim: 243,
  water: 246,
  graticule: 250,
  highlight: 256,
  places: 262,
  label: 270,
};

/**
 * Ab welcher Zoomstufe ein Ort welchen Ranges erscheint.
 *
 * Ohne Ortspunkte ist die Karte bei jedem Zoom über Stufe 6 orientierungslos –
 * eine einfarbige Fläche ohne Anhalt. Mit allen 5527 Orten wäre sie zugetextet.
 * Die Staffelung nach Rang (Natural Earth scalerank) löst beides: Weltstädte
 * ab Stufe 3, Kleinstädte erst ab Stufe 8.
 */
const PLACE_FROM_ZOOM = [3, 3.6, 4.4, 5.2, 6, 6.6, 7.4, 8.2];

/**
 * Eckenradius der Grenzflächen in Bildpunkten.
 *
 * Der Ursprungsdatensatz zeichnet viele Gemeinwesen mit sehr wenigen
 * Stützpunkten – Bayern 1815 besteht aus knapp fünfzig, jeder Zug ist eine
 * gerade Strecke mit einer spitzen Ecke am Ende. Das liest sich wie ein
 * Polygonzug, nicht wie eine Grenze.
 *
 * Der Radius ist nicht fest, sondern wächst mit der Länge der angrenzenden
 * Strecken: Eine Ecke zwischen zwei zweihundert Bildpunkte langen Zügen
 * verträgt eine weite Rundung, eine zwischen zwei kurzen nicht. Nach oben
 * begrenzt ihn die halbe Streckenlänge – dadurch kann keine Ecke über die
 * Nachbarecke hinaus abgeschnitten werden und keine Landzunge verschwinden.
 */
const ECKENRADIUS = 9;
const ECKENANTEIL = 0.22;

/**
 * Zeichenwerk für den Küstensaum – bewusst in einfacher Auflösung.
 *
 * Leaflet legt jede Zeichenfläche auf Bildschirmen mit doppelter Punktdichte
 * in doppelter Auflösung an. Für Grenzen und Beschriftungen ist das richtig.
 * Für den Saum ist es Verschwendung: Er wird anschließend um neun Bildpunkte
 * weichgezeichnet – eine Kante, die vier Mal so viele Bildpunkte hat, wird
 * dadurch nicht weicher, sie kostet nur vier Mal so viel.
 *
 * Und die Weichzeichnung ist der teuerste Posten des ganzen Kartenbildes: Sie
 * wird bei jedem Bild neu über die volle Fensterfläche gerechnet. In halber
 * Auflösung sind das ein Viertel der Bildpunkte. Gemessen: 50 ms je Bild
 * weniger beim Schwenken, ohne sichtbaren Unterschied.
 */
const CoastCanvas = L.Canvas.extend({
  /**
   * Der Saum als Folge von Parallelen statt als Weichzeichner.
   *
   * Ein CSS-Filter über einem Pane wird bei jedem Bild neu über die ganze
   * Fensterfläche gerechnet – auch beim bloßen Schwenken, wo sich am Inhalt
   * nichts ändert. Er war damit der teuerste Posten des Kartenbildes.
   *
   * Dasselbe Bild entsteht auch ohne ihn: Die Küstenlinie wird mehrfach
   * gezeichnet, jedes Mal breiter und blasser. Übereinandergelegt ergeben die
   * Züge einen weichen Verlauf – genau das Verfahren, mit dem Kupferstecher
   * Untiefen angelegt haben, bevor es Weichzeichner gab. Die Arbeit fällt
   * dabei einmal beim Neuzeichnen an und nicht bei jedem Bild.
   */
  _fillStroke(ctx, layer) {
    const passes = this.options.saum;
    if (!passes || !layer.options.stroke) {
      L.Canvas.prototype._fillStroke.call(this, ctx, layer);
      return;
    }
    const o = layer.options;
    ctx.lineCap = o.lineCap ?? 'round';
    ctx.lineJoin = o.lineJoin ?? 'round';
    ctx.strokeStyle = o.color;
    // Von außen nach innen: Der breiteste, blasseste Zug zuerst, damit die
    // schmalen Züge oben liegen und die Mitte dicht wird.
    for (const [breite, deckung] of passes) {
      ctx.globalAlpha = (o.opacity ?? 1) * deckung;
      ctx.lineWidth = o.weight * breite;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },

  _update() {
    if (this._map._animatingZoom && this._bounds) return;
    L.Renderer.prototype._update.call(this);
    const b = this._bounds;
    const size = b.getSize();
    const container = this._container;
    L.DomUtil.setPosition(container, b.min);
    // Rückwärtsauflösung: halb so viele Bildpunkte, gleiche Fläche auf dem
    // Bildschirm. Das Setzen von width setzt zugleich den Zeichenzustand
    // zurück, deshalb kommt die Verschiebung erst danach.
    container.width = size.x;
    container.height = size.y;
    container.style.width = `${size.x}px`;
    container.style.height = `${size.y}px`;
    this._ctx.translate(-b.min.x, -b.min.y);
    this.fire('update');
  },
});
const coastCanvas = (opts) => new CoastCanvas(opts);

/**
 * Wie viele Parallelen der Saum bekommt – je nach Auflösung der Küstenlinie.
 *
 * Die Übersichtsküste hat rund 40.000 Stützpunkte, die hochaufgelöste
 * 400.000. Vier Züge über die feine Linie kosten das Zehnfache und sind
 * gemessen der teuerste Einzelposten beim Umschalten. Bei der feinen Linie
 * genügen zwei: Sie ist ohnehin dichter, und der Saum tritt in der Nahsicht
 * zurück.
 */
const SAUM = {
  lo: { glow: [[3.4, .10], [2.4, .16], [1.7, .24], [1, .40]], rim: [[2.2, .22], [1, .78]] },
  hi: { glow: [[2.6, .17], [1, .47]], rim: null },
};

/**
 * Zeichenwerk mit gerundeten Ecken.
 *
 * Leaflet verbindet Stützpunkte mit `lineTo` – jede Ecke bleibt spitz, egal
 * wie die Linienenden gesetzt sind, weil `lineJoin` nur die Außenkante der
 * Strichbreite betrifft und nichts an der Fläche darunter ändert.
 *
 * Hier wird stattdessen jede Ecke abgeschnitten: An jedem Stützpunkt geht die
 * Linie ein Stück vorher weg und kommt ein Stück später wieder an, dazwischen
 * liegt eine quadratische Kurve mit dem Stützpunkt als Griff. Der Radius ist
 * auf die halbe Länge der beiden angrenzenden Strecken begrenzt – dadurch
 * bleiben dicht gezeichnete Küsten und lange gerade Grenzen (der 49. Breiten-
 * grad etwa) unverändert, und nur die groben, spitzen Ecken werden weich.
 *
 * Fläche und Randlinie entstehen aus demselben Pfad, können also nicht
 * auseinanderlaufen.
 */
const SmoothCanvas = L.Canvas.extend({
  /**
   * Fläche, Grenzlinie und Randsaum in einem Zug.
   *
   * Der Saum weitet jede Fläche um gut einen Bildpunkt und schließt damit die
   * Lücke zur Küste. Er lag bisher in einer **zweiten** Ebene über denselben
   * Daten: 1.307 Gemeinwesen im Zeitschnitt 1492 wurden doppelt angelegt,
   * doppelt projiziert und bei jeder Bewegung doppelt gezeichnet.
   *
   * Nötig war die zweite Ebene wegen der Reihenfolge: Alle Säume müssen unter
   * allen Flächen liegen, sonst legt sich der Saum des zuletzt gezeichneten
   * Landes über die Fläche seines Nachbarn. Mit `destination-over` geht der
   * Saum unter alles, was auf dieser Zeichenfläche schon steht – dieselbe
   * Reihenfolge, halbe Arbeit.
   */
  _fillStroke(ctx, layer) {
    L.Canvas.prototype._fillStroke.call(this, ctx, layer);
    const saum = layer.options.saumFarbe;
    if (!saum) return;
    const alt = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'destination-over';
    ctx.globalAlpha = layer.options.saumDeckung ?? 1;
    ctx.lineWidth = layer.options.saumBreite ?? 2.6;
    ctx.strokeStyle = saum;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.setLineDash([]);
    ctx.stroke();
    ctx.globalCompositeOperation = alt;
    ctx.globalAlpha = 1;
  },

  _updatePoly(layer, closed) {
    if (!this._drawing) return;
    const parts = layer._parts;
    if (!parts.length) return;

    const ctx = this._ctx;
    const r = this.options.eckenradius ?? ECKENRADIUS;
    ctx.beginPath();
    for (const punkte of parts) {
      zeichnePfad(ctx, punkte, closed, r);
      if (closed) ctx.closePath();
    }
    this._fillStroke(ctx, layer);
  },
});

/** Einen Linienzug mit gerundeten Ecken in den Zeichenweg legen. */
function zeichnePfad(ctx, p, closed, radius) {
  const n = p.length;
  if (n < 3 || radius <= 0) {
    // Zu wenige Punkte zum Runden – gerade Verbindung, wie gehabt.
    for (let i = 0; i < n; i++) ctx[i === 0 ? 'moveTo' : 'lineTo'](p[i].x, p[i].y);
    return;
  }

  // Bei offenen Linien bleiben Anfang und Ende scharf, sonst wanderten die
  // Endpunkte einer Grenze oder eines Flusses vom Ort weg.
  const von = closed ? 0 : 1;
  const bis = closed ? n : n - 1;
  let begonnen = false;

  // Bewusst ohne Zwischenobjekte und ohne Math.hypot: Diese Schleife läuft im
  // schwersten Zeitschnitt über hunderttausend Punkte, mehrmals je Bild.
  // Math.sqrt auf der Quadratsumme ist dort messbar schneller, und jede
  // eingesparte Objektanlage entlastet die Speicherbereinigung.
  for (let i = von; i < bis; i++) {
    const cur = p[i];
    const vor = p[(i - 1 + n) % n];
    const nach = p[(i + 1) % n];
    const cx = cur.x;
    const cy = cur.y;

    const ax = vor.x - cx;
    const ay = vor.y - cy;
    const bx = nach.x - cx;
    const by = nach.y - cy;
    const la = Math.sqrt(ax * ax + ay * ay);
    const lb = Math.sqrt(bx * bx + by * by);

    // Doppelte Punkte kommen im Ursprungsdatensatz vor; sie hätten keine
    // Richtung und ergäben NaN.
    if (la < 1e-6 || lb < 1e-6) {
      if (begonnen) ctx.lineTo(cx, cy);
      else { ctx.moveTo(cx, cy); begonnen = true; }
      continue;
    }

    const kurz = la < lb ? la : lb;
    let s = radius > kurz * ECKENANTEIL ? radius : kurz * ECKENANTEIL;
    if (s > kurz / 2) s = kurz / 2;

    const fa = s / la;
    const fb = s / lb;
    const ax1 = cx + ax * fa;
    const ay1 = cy + ay * fa;

    if (!begonnen) {
      if (closed) ctx.moveTo(ax1, ay1);
      else { ctx.moveTo(p[0].x, p[0].y); ctx.lineTo(ax1, ay1); }
      begonnen = true;
    } else {
      ctx.lineTo(ax1, ay1);
    }
    ctx.quadraticCurveTo(cx, cy, cx + bx * fb, cy + by * fb);
  }

  if (!closed) ctx.lineTo(p[n - 1].x, p[n - 1].y);
}

/** Zeichenwerk mit gerundeten Ecken erzeugen. */
function smoothCanvas(options) {
  return new SmoothCanvas(options);
}

/**
 * Dasselbe für SVG.
 *
 * Die Auswahl-Hervorhebung liegt in einer eigenen SVG-Ebene, weil dort ein
 * weicher Schein möglich ist. Ohne dieselbe Rundung stünde ihr Umriss an jeder
 * spitzen Ecke ein Stück über der Fläche hervor, die er hervorheben soll.
 *
 * `zeichnePfad` schreibt in ein Ziel mit moveTo/lineTo/quadraticCurveTo – eine
 * Zeichenfläche erfüllt das, und diese Ablage tut es auch. So gibt es die
 * Eckenrundung genau einmal im Quelltext, nicht zweimal.
 */
const pfadAblage = {
  teile: [],
  moveTo(x, y) { this.teile.push(`M${round(x)} ${round(y)}`); },
  lineTo(x, y) { this.teile.push(`L${round(x)} ${round(y)}`); },
  quadraticCurveTo(cx, cy, x, y) {
    this.teile.push(`Q${round(cx)} ${round(cy)} ${round(x)} ${round(y)}`);
  },
};
const round = (v) => Math.round(v * 10) / 10;

const SmoothSvg = L.SVG.extend({
  _updatePoly(layer, closed) {
    const r = this.options.eckenradius ?? ECKENRADIUS;
    pfadAblage.teile = [];
    for (const punkte of layer._parts) {
      if (punkte.length < 2) continue;
      zeichnePfad(pfadAblage, punkte, closed, r);
      if (closed) pfadAblage.teile.push('z');
    }
    this._setPath(layer, pfadAblage.teile.join('') || 'M0 0');
  },
});

function smoothSvg(options) {
  return new SmoothSvg(options);
}

const HOME = { center: [26, 12], zoom: 2.4 };

/**
 * Kartengrundlagen.
 *
 * Bewusst nur Gelände, keine heutigen Straßen, Städte oder Staatsgrenzen: Auf
 * einer Karte des Jahres 700 wäre eine Autobahn ein Fehler, ein Gebirge nicht.
 * Beide Dienste liefern reines Relief und brauchen keinen Schlüssel.
 *
 * maxNativeZoom statt maxZoom: Über der letzten vorhandenen Kachelstufe wird
 * hochskaliert, statt dass die Grundlage einfach verschwindet.
 */
export const BASEMAPS = {
  relief: {
    name: 'Relief',
    beschreibung: 'Schummerung des Geländes, ohne Beschriftung',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}',
    maxNativeZoom: 13,
    quelle: 'Esri, USGS, NOAA',
  },
  physisch: {
    name: 'Physisch',
    beschreibung: 'Gelände mit Bewuchs und Höhenfarben',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}',
    maxNativeZoom: 8,
    quelle: 'Esri, US National Park Service',
  },
};

/** Ab dieser Zoomstufe wird die hochaufgelöste Küstenlinie eingeblendet. */
const COAST_HD_FROM_ZOOM = 4.2;

/* --------------------------------------------------------- Besatzung */

/**
 * Schraffur für besetztes Gebiet.
 *
 * Besatzung ist kein Eigentum: Norwegen war 1942 nicht Deutschland, sondern
 * von Deutschland besetztes Norwegen. Die Karte muss deshalb beides zugleich
 * zeigen – die Fläche behält die Farbe des Landes, darüber liegen schräge
 * Streifen in der Farbe der Besatzungsmacht.
 *
 * Der Kniff: Leaflet schreibt die Füllfarbe unbesehen nach ctx.fillStyle, und
 * das nimmt außer Farben auch ein CanvasPattern. So lässt sich auf der
 * Zeichenfläche schraffieren, ohne Leaflet zu ändern.
 */
const HATCH_SIZE = 9;
const hatchCache = new Map();

function hatchFor(color) {
  const cached = hatchCache.get(color);
  if (cached) return cached;

  const tile = document.createElement('canvas');
  tile.width = HATCH_SIZE;
  tile.height = HATCH_SIZE;
  const c = tile.getContext('2d');
  c.strokeStyle = color;
  c.lineWidth = 2.4;
  c.lineCap = 'square';
  // Zwei versetzte Striche, damit die Schraffur über die Kachelgrenze hinweg
  // durchläuft und keine Treppe entsteht.
  for (const shift of [-HATCH_SIZE, 0]) {
    c.beginPath();
    c.moveTo(shift, HATCH_SIZE);
    c.lineTo(shift + HATCH_SIZE, 0);
    c.stroke();
  }

  const pattern = document.createElement('canvas').getContext('2d').createPattern(tile, 'repeat');
  hatchCache.set(color, pattern);
  return pattern;
}

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
    this.el = el;
    this.theme = theme;
    this.basemapId = null;
    this.basemapLayer = null;
    this.colorMode = 'polity';
    this.showLabels = true;
    this.showBorders = true;
    this.showWater = false;
    this.showGraticule = false;
    this.showOccupation = true;
    this.showPlaces = false;
    this.places = [];
    this.showPhysical = false;
    this.physical = [];

    this.epoch = null;
    this.coast = { lo: null, hi: null, eis: null, level: 'lo' };
    // Zeitschnitte, fuer die die eiszeitliche Kuestenlinie gilt.
    this.iceAge = false;
    this.colors = new Map();
    this.selected = null;
    this.hovered = null;
    this._handlers = { select: [], hover: [], view: [], basemap: [] };
    this._boundsCache = new Map();

    this.map = L.map(el, {
      center: HOME.center,
      zoom: HOME.zoom,
      minZoom: 1.6,
      maxZoom: 10,
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

    this.map.on('zoomend', () => { this._syncCoastLevel(); this._styleBase(); });
    this.map.on('zoomend moveend', () => this._emit('view'));
    this.map.on('mousedown', () => el.classList.add('is-grabbing'));
    this.map.on('mouseup', () => el.classList.remove('is-grabbing'));

    this.applyTheme(theme);
  }

  /* ------------------------------------------------------------ Aufbau */

  _initBaseLayers() {
    // Meer inklusive Küstenkontur – eine Ebene, dadurch sind Fläche und
    // Linie zwangsläufig deckungsgleich.
    this.oceanLayer = L.geoJSON(null, {
      pane: 'ocean',
      renderer: L.canvas({ pane: 'ocean', padding: .3 }),
      interactive: false,
      // Leaflet dünnt beim Projizieren auf Pixelgenauigkeit aus. Leaflets
      // Vorgabe von 1 px kappt sichtbar Buchten und Landzungen; 0.5 px
      // behält sie und bleibt beim Zoomen flüssig.
      smoothFactor: .5,
    }).addTo(this.map);

    // Küstensaum: dieselbe Geometrie, aber nur als Linie. Die Weichzeichnung
    // besorgt CSS auf dem Pane – ein Filter auf einer reinen Linienebene
    // kostet einen Kompositionsschritt und kann nichts unscharf machen, was
    // scharf sein müsste. Zwei Ebenen übereinander ergeben den Verlauf, den
    // Kupferstecher mit immer feineren Parallellinien erzeugt haben.
    this.coastGlowLayer = L.geoJSON(null, {
      pane: 'coastglow',
      renderer: (this.glowZeichner = coastCanvas({
        pane: 'coastglow', padding: .3, saum: SAUM.lo.glow,
      })),
      interactive: false,
      smoothFactor: 1.4,
    }).addTo(this.map);

    this.coastRimLayer = L.geoJSON(null, {
      pane: 'coastrim',
      renderer: (this.rimZeichner = coastCanvas({
        pane: 'coastrim', padding: .3, saum: SAUM.lo.rim,
      })),
      interactive: false,
      smoothFactor: 1,
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

    this.placeLayer = L.layerGroup([], { pane: 'places' });
    this.placeCanvas = null;

    this.highlightLayer = L.geoJSON(null, {
      pane: 'highlight',
      renderer: smoothSvg({ pane: 'highlight', padding: .4 }),
      interactive: false,
      className: 'sel-shape',
    }).addTo(this.map);
  }

  _initPolityLayers() {
    this.slots = ['polityA', 'polityB'].map((pane) => ({
      pane,
      el: this.map.getPane(pane),
      renderer: smoothCanvas({ pane, padding: .35 }),
      layer: null,
      occupation: null,
    }));
    this.slots.forEach((slot) => {
      slot.el.style.transition = 'opacity 300ms cubic-bezier(.32,.72,.29,1)';
      slot.el.style.opacity = '0';
    });
    this.activeSlot = 0;
  }

  /**
   * Kartengrundlage setzen (Kachelebene unter allem anderen).
   *
   * Die Klasse is-basemap am Kartenelement wird erst gesetzt, wenn wirklich
   * eine Kachel angekommen ist. Bleibt der Dienst stumm – gesperrtes Netz,
   * Ausfall, Offline-Betrieb –, sieht die Karte exakt so aus wie ohne
   * Grundlage, statt in einen halb leeren Zustand zu kippen.
   */
  setBasemap(id) {
    this.basemapId = id;
    if (this.basemapLayer) {
      this.basemapLayer.remove();
      this.basemapLayer = null;
    }
    this.el.classList.remove('is-basemap');
    this._emit('basemap');

    const spec = BASEMAPS[id];
    if (!spec) { this._styleBase(); return; }

    const layer = L.tileLayer(spec.url, {
      pane: 'basemap',
      maxNativeZoom: spec.maxNativeZoom,
      maxZoom: 10,
      minZoom: 0,
      noWrap: true,
      crossOrigin: true,
      attribution: spec.quelle,
    });
    layer.once('load', () => {
      if (this.basemapLayer !== layer) return;
      this.el.classList.add('is-basemap');
      this._styleBase();
      this._restyleActive();
      this._emit('basemap');
    });
    layer.addTo(this.map);
    this.basemapLayer = layer;
  }

  get hasBasemap() {
    return this.el.classList.contains('is-basemap');
  }

  setBaseData({ ocean }) {
    if (!ocean) return;
    this.coast.lo = ocean;
    this._applyCoast('lo');
  }

  /**
   * Hochaufgelöste Küstenlinie bereitstellen. Eingesetzt wird sie erst ab
   * mittlerer Zoomstufe: Im Weltmaßstab ist sie nicht von der Übersicht zu
   * unterscheiden, kostet aber ein Vielfaches an Rechenzeit beim Zoomen.
   */
  setDetailedCoastline(ocean) {
    if (!ocean) return;
    this.coast.hi = ocean;
    this._syncCoastLevel();
  }

  /**
   * Eiszeitliche Küstenlinie bereitstellen. Sie ersetzt die heutige in den
   * frühen Zeitschnitten – ohne sie fehlten genau die Landbrücken, über die
   * der Mensch die Erde besiedelt hat.
   */
  setIceAgeCoastline(ocean) {
    if (!ocean) return;
    this.coast.eis = ocean;
    if (this.iceAge) this._applyCoast('eis');
  }

  /** Umschalten zwischen heutiger und eiszeitlicher Küste. */
  setIceAge(on) {
    const neu = !!on;
    if (neu === this.iceAge) return;
    this.iceAge = neu;
    if (neu && this.coast.eis) this._applyCoast('eis');
    else if (!neu) {
      this.coast.level = 'eis';
      this._syncCoastLevel(true);
    }
  }

  /**
   * Die Küstenlinie in die drei Ebenen einsetzen.
   *
   * Zwei Kniffe halten das bezahlbar:
   *
   * Der breite Saum bekommt **immer** die Übersichtsküste, auch wenn Meer und
   * Kante die feine bekommen. Er ist ein weiches Band von über zehn
   * Bildpunkten Breite; ein Unterschied von einem Kilometer verschwindet
   * darin restlos. Das spart ein Drittel der Arbeit – beim Einsetzen wie bei
   * jeder späteren Bewegung.
   *
   * Und eingesetzt wird nicht in einem Zug, sondern Ebene für Ebene über
   * mehrere Einzelbilder. Die Gesamtarbeit bleibt gleich, aber der Browser
   * kommt zwischendurch zum Zeichnen – aus einem Standbild wird ein kurzes
   * Nachschärfen.
   */
  _applyCoast(level) {
    const data = this.coast[level];
    if (!data) return;
    this.coast.level = level;
    // Die Staffelung des Saums hängt daran, wie viele Stützpunkte die
    // Küstenlinie mitbringt – siehe SAUM.
    const staffel = SAUM[level] ?? SAUM.lo;
    this.glowZeichner.options.saum = staffel.glow;
    this.rimZeichner.options.saum = staffel.rim;

    const grob = this.coast.lo ?? data;
    const schritte = [
      () => { this.oceanLayer.clearLayers(); this.oceanLayer.addData(data); },
      () => { this.coastRimLayer.clearLayers(); this.coastRimLayer.addData(data); },
      () => { this.coastGlowLayer.clearLayers(); this.coastGlowLayer.addData(grob); },
      () => this._styleBase(),
    ];

    clearTimeout(this._coastSchritt);
    const naechster = () => {
      const schritt = schritte.shift();
      if (!schritt) return;
      schritt();
      if (schritte.length) this._coastSchritt = window.setTimeout(naechster, 0);
    };
    // Der erste Schritt sofort, damit das Meer nie fehlt.
    naechster();
  }

  /**
   * Auflösungsstufe der Küstenlinie an die Zoomstufe koppeln. Der Wechsel
   * wird kurz verzögert, damit er nicht in die laufende Zoom-Animation fällt.
   */
  _syncCoastLevel(sofort = false) {
    // In der Eiszeit gilt eine eigene Küstenlinie; die Auflösungsstufen der
    // heutigen sind dann ohne Bedeutung.
    if (this.iceAge && this.coast.eis) {
      if (this.coast.level !== 'eis') this._applyCoast('eis');
      return;
    }
    const wanted = this.map.getZoom() >= COAST_HD_FROM_ZOOM && this.coast.hi ? 'hi' : 'lo';
    if (wanted === this.coast.level) return;
    if (sofort) { this._applyCoast(wanted); return; }
    clearTimeout(this._coastTimer);
    this._coastTimer = window.setTimeout(() => {
      const now = this.map.getZoom() >= COAST_HD_FROM_ZOOM && this.coast.hi ? 'hi' : 'lo';
      if (now !== this.coast.level) this._applyCoast(now);
    }, 140);
  }

  setWaterData({ lakes, rivers }) {
    this.waterLayer.clearLayers();
    if (lakes) this.waterLayer.addData(lakes);
    if (rivers) this.waterLayer.addData(rivers);
    this._styleBase();
  }

  /* ------------------------------------------------------------ Themes */

  applyTheme(theme) {
    this.theme = theme;
    if (this.placeCanvas) requestAnimationFrame(() => this._drawPlaces());
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
    const edge = this._cssVar('--land-edge', '#2f4457');
    const river = this._cssVar('--river', '#5aa');
    const grat = this._cssVar('--grat', 'rgba(255,255,255,.08)');
    const ocean = this._cssVar('--ocean-2', '#0d1a28');

    this.oceanLayer.setStyle({
      fillColor: ocean,
      // Mit Kartengrundlage bleibt das Meer eine Spur durchscheinend, sonst
      // wirkt die Kueste wie ausgeschnitten statt wie gezeichnet.
      fillOpacity: this.hasBasemap ? .88 : 1,
      fillRule: 'evenodd',
      stroke: true,
      color: edge,
      weight: .9,
      opacity: .95,
      lineJoin: 'round',
    });

    // Der Saum wird schmaler, je näher man herangeht.
    //
    // Er ist eine Linie AUF der Küste, liegt also zur Hälfte auf dem Land. Im
    // Weltmaßstab stört das nicht – dort umreißt er die Kontinente und gibt
    // dem Bild seine Tiefe. In der Nahsicht überschwemmte er die Küstenländer:
    // Irland und Dänemark verschwanden im blauen Dunst. Breite und Deckung
    // laufen deshalb mit der Zoomstufe zurück, bis nur die Kante bleibt.
    const z = this.map.getZoom();
    const glow = this._cssVar('--coast-glow', '#6fb2e0');
    const nah = Math.min(1, Math.max(0, (z - 3) / 3));
    this.el.style.setProperty('--coast-zoom-fade', (1 - nah * 0.62).toFixed(3));
    this.coastGlowLayer.setStyle({
      fill: false,
      stroke: true,
      color: glow,
      weight: Math.max(2.5, 11 - z * 1.9),
      opacity: 1,
      lineJoin: 'round',
      lineCap: 'round',
    });
    this.coastRimLayer.setStyle({
      fill: false,
      stroke: true,
      color: this._cssVar('--coast-rim', glow),
      weight: Math.max(1, 2.6 - z * .12),
      opacity: 1,
      lineJoin: 'round',
      lineCap: 'round',
    });
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
      // Antiqua statt Grotesk: Länder tragen im gedruckten Atlas seit
      // Jahrhunderten eine Serifenschrift. Nichts sonst verändert den
      // Gesamteindruck der Karte so stark bei so wenig Aufwand.
      font: this._cssVar('--font-display', 'Georgia, serif'),
    });
  }

  /* ----------------------------------------------------------- Farben */

  _colorKey(props) {
    switch (this.colorMode) {
      // In der Oberhoheits-Ansicht zählt, wer tatsächlich herrscht: Über einem
      // besetzten Land steht die Besatzungsmacht, nicht seine eigene Krone.
      case 'sovereign': return props.o || props.s || props.n;
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

  /**
   * Deckkraft der Grenzflächen. Liegt eine Kartengrundlage darunter, treten
   * sie zurück: Das Gelände soll durchscheinen, sonst wäre die Grundlage
   * geladen und doch nicht zu sehen.
   */
  _fillAlpha() {
    const basis = Number(this._cssVar('--fill-alpha', '.58'));
    return this.hasBasemap ? basis * .62 : basis;
  }

  _styleFeature(feature) {
    const props = feature.properties;
    const color = this.colorOf(this._colorKey(props));
    const alpha = this._fillAlpha();
    const line = this._cssVar('--border-line-soft', 'rgba(255,255,255,.22)');
    const precision = props.b ?? 0;

    return {
      fillColor: color,
      fillOpacity: alpha,
      // Der Saum wird von SmoothCanvas aus demselben Pfad gezogen.
      saumFarbe: color,
      saumBreite: 2.6,
      saumDeckung: alpha,
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

  /**
   * Schraffur in der Farbe der Besatzungsmacht. Die Farbe wird über deren
   * eigenen Namen geholt, damit besetztes Frankreich dieselben Streifen trägt
   * wie das Deutsche Reich selbst – die Zuordnung soll ohne Legende lesbar sein.
   */
  _occupationStyle(feature) {
    const besetzer = feature.properties.o;
    if (!this.showOccupation || !besetzer) {
      return { fill: false, stroke: false };
    }
    return {
      fill: true,
      fillColor: hatchFor(this.colorOfPolity(besetzer)),
      fillOpacity: Number(this._cssVar('--hatch-alpha', '.85')),
      stroke: false,
      bubblingMouseEvents: false,
    };
  }

  setOccupationVisible(on) {
    this.showOccupation = !!on;
    this.slots[this.activeSlot].occupation?.setStyle((f) => this._occupationStyle(f));
  }

  _restyleActive() {
    const slot = this.slots[this.activeSlot];
    if (!slot.layer) return;
    const alpha = this._fillAlpha();
    slot.layer.setStyle((f) => this._styleFeature(f));
    slot.occupation?.setStyle((f) => this._occupationStyle(f));
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
    if (to.occupation) {
      to.occupation.remove();
      to.occupation = null;
    }

    // Saum in der eigenen Füllfarbe, nur als Linie. Er weitet jede Fläche um
    // gut einen Pixel und schließt damit die schmalen Lücken, die entstehen,
    // weil die historischen Umrisse nicht exakt an der heutigen Küste enden.
    // Nach außen schneidet die Meeresebene den Überschuss wieder ab, nach
    // innen deckt ihn die Füllung dieser Ebene ab.
    to.layer = L.geoJSON(data.geojson, {
      pane: to.pane,
      renderer: to.renderer,
      smoothFactor: .5,
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

    // Besetztes Gebiet: zuletzt hinzugefügt, damit die Schraffur über der
    // Füllung liegt. Ohne Zeigerereignisse – der Klick soll die Fläche
    // darunter treffen, nicht die Schraffur.
    const besetzte = data.geojson.features.filter((f) => f.properties.o);
    if (besetzte.length) {
      to.occupation = L.geoJSON(
        { type: 'FeatureCollection', features: besetzte },
        {
          pane: to.pane,
          renderer: to.renderer,
          interactive: false,
          smoothFactor: .5,
          style: (f) => this._occupationStyle(f),
        },
      ).addTo(this.map);
    }

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
      if (this.activeSlot === this.slots.indexOf(from)) return;
      from.layer?.remove();
      from.layer = null;
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

  get hasWaterData() {
    return this.waterLayer.getLayers().length > 0;
  }

  setShowGraticule(on) {
    this.showGraticule = on;
    if (on) this.graticuleLayer.addTo(this.map);
    else this.graticuleLayer.remove();
  }

  /* -------------------------------------------------------------- Orte */

  /**
   * Orte zur Orientierung setzen. Gezeichnet wird auf eine eigene
   * Zeichenfläche statt über Leaflet-Marker: 5527 DOM-Knoten würden das
   * Schwenken spürbar bremsen, ein Canvas kostet nichts.
   */
  setPlaces(orte) {
    this.places = orte ?? [];
    this._buildPlaceCanvas();
    this._drawPlaces();
  }

  /** Landschaftsnamen: Gebirge, Wüsten, Hochebenen. */
  setPhysical(stellen) {
    this.physical = stellen ?? [];
    this._buildPlaceCanvas();
    this._drawPlaces();
  }

  setShowPhysical(on) {
    this.showPhysical = !!on;
    this._buildPlaceCanvas();
    this._drawPlaces();
  }

  setShowPlaces(on) {
    this.showPlaces = !!on;
    if (on && this.places?.length) this.placeLayer.addTo(this.map);
    else this.placeLayer.remove();
    this._drawPlaces();
  }

  _buildPlaceCanvas() {
    if (this.placeCanvas) return;
    const pane = this.map.getPane('places');
    const canvas = document.createElement('canvas');
    canvas.className = 'place-canvas';
    canvas.style.position = 'absolute';
    canvas.style.pointerEvents = 'none';
    pane.appendChild(canvas);
    this.placeCanvas = canvas;
    // Wie bei den Beschriftungen: Während einer Bewegung reitet die
    // Zeichenfläche mit der Karte mit, statt bei jedem Bild neu gesetzt und
    // neu beschriftet zu werden.
    this.map.on('moveend zoomend viewreset resize', () => this._drawPlaces());
    this.map.on('zoomstart', () => { canvas.style.visibility = 'hidden'; });
  }

  _drawPlaces() {
    const canvas = this.placeCanvas;
    if (!canvas) return;
    const map = this.map;
    const size = map.getSize();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(size.x * dpr) || canvas.height !== Math.round(size.y * dpr)) {
      canvas.width = Math.round(size.x * dpr);
      canvas.height = Math.round(size.y * dpr);
      canvas.style.width = `${size.x}px`;
      canvas.style.height = `${size.y}px`;
    }
    // Die Zeichenfläche bleibt am Bildschirm stehen; die Verschiebung der
    // Kartenebene wird gegengerechnet.
    const pos = map.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(canvas, pos);
    canvas.style.visibility = '';

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.x, size.y);
    if (!(this.showPlaces && this.places?.length) && !(this.showPhysical && this.physical?.length)) return;

    const zoom = map.getZoom();
    const ink = this._cssVar('--label-ink', '#fff');
    const halo = this._cssVar('--label-halo', 'rgba(0,0,0,.9)');
    const font = this._cssVar('--font-ui', 'sans-serif');
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';

    const belegt = [];
    const frei = (x, y, w, h) => {
      for (const b of belegt) {
        if (x < b[2] && x + w > b[0] && y < b[3] && y + h > b[1]) return false;
      }
      return true;
    };

    // Landschaftsnamen zuerst: Sie sind großräumig und sollen den Vorrang
    // haben, wenn sich Beschriftungen ins Gehege kommen.
    if (this.showPhysical) {
      const faint = this._cssVar('--ink-faint', 'rgba(255,255,255,.5)');
      for (const s of this.physical) {
        if (zoom < 3 + s.rang * .55) continue;
        const pt = map.latLngToContainerPoint([s.lat, s.lon]);
        if (pt.x < 0 || pt.y < 0 || pt.x > size.x || pt.y > size.y) continue;
        const grad = s.rang <= 2 ? 12 : 11;
        ctx.font = `italic 500 ${grad}px ${font}`;
        const breite = ctx.measureText(s.name).width;
        if (!frei(pt.x - breite / 2 - 4, pt.y - grad, breite + 8, grad * 2)) continue;
        belegt.push([pt.x - breite / 2 - 4, pt.y - grad, pt.x + breite / 2 + 4, pt.y + grad]);
        ctx.textAlign = 'center';
        ctx.strokeStyle = halo;
        ctx.lineWidth = 3;
        ctx.strokeText(s.name, pt.x, pt.y);
        ctx.fillStyle = faint;
        ctx.fillText(s.name, pt.x, pt.y);
      }
      ctx.textAlign = 'left';
    }

    let gezeichnet = 0;
    if (!this.showPlaces) return;
    for (const ort of this.places) {
      if (gezeichnet > 220) break;
      if (zoom < (PLACE_FROM_ZOOM[ort.rang] ?? 9)) continue;
      const pt = map.latLngToContainerPoint([ort.lat, ort.lon]);
      if (pt.x < -40 || pt.y < -20 || pt.x > size.x + 40 || pt.y > size.y + 20) continue;

      const grad = ort.rang <= 1 ? 12.5 : ort.rang <= 3 ? 11.5 : 10.5;
      ctx.font = `500 ${grad}px ${font}`;
      const breite = ctx.measureText(ort.name).width;
      const x = pt.x + 6;
      const y = pt.y;
      if (!frei(pt.x - 4, y - grad, breite + 14, grad * 2)) continue;
      belegt.push([pt.x - 4, y - grad, x + breite + 3, y + grad]);

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, ort.rang <= 1 ? 3 : 2.2, 0, Math.PI * 2);
      ctx.fillStyle = ink;
      ctx.strokeStyle = halo;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fill();

      ctx.strokeStyle = halo;
      ctx.lineWidth = 3;
      ctx.strokeText(ort.name, x, y);
      ctx.fillStyle = ink;
      ctx.fillText(ort.name, x, y);
      gezeichnet++;
    }
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
