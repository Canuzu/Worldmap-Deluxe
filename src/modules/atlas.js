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
import { createLabelLayer, breiteVon } from './labels.js';
import { schriftdichte } from './dichte.js';
import RELIGION from '../data/religion/vokabular.json';
import {
  paletteFor, assignColorIndices, PRECISION_COLORS, withAlpha, shade,
} from './palette.js';

const PANES = {
  basemap: 200,
  polityA: 220,
  polityB: 230,
  // Über den Staatsflächen, unter dem Meer: Die Religionsgrenzen sollen auf
  // der Fläche liegen, aber an der Küste enden wie alles andere auch.
  relGrenze: 235,
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
  coast: 241,
  water: 246,
  graticule: 250,
  highlight: 256,
  places: 262,
  label: 270,
  // Über den Ländernamen: Im Religionsmodus ist der Gebietsname die Aussage
  // der Karte. Vorher lag er auf der Ortsnamen-Ebene und verschwand unter
  // „Osmanisches Reich" – genau dort, wo er gebraucht wird.
  relName: 274,
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
 * Was kleiner als anderthalb Bildpunkte ist, wird nicht gezeichnet.
 *
 * Im schwersten Zeitschnitt liegen 9.666 Ringe im Bild – aber nur 840 davon
 * sind größer als zehn Bildpunkte. Der Rest sind Schären, Riffe, Sandbänke,
 * Enklaven: Umrisse aus im Schnitt sieben Stützpunkten, die zusammen ein
 * Viertel aller Punkte ausmachen und auf dem Bildschirm einen Fleck ergeben,
 * den man nicht als Form erkennen kann.
 *
 * Jeder dieser Ringe kostet trotzdem einen eigenen Teilweg samt Füllung und
 * Kontur. Gemessen kostete das im Weltmaßstab 46 % der gesamten Zeichenzeit
 * eines Zoomsprungs – für nichts, was zu sehen wäre.
 *
 * Ausgelassen wird nur das **Zeichnen**. Die Geometrie bleibt vollständig
 * erhalten: Ein Kleinstaat, der im Weltmaßstab keinen Bildpunkt füllt, ist
 * weiter anklickbar, steht in der Legende und in der Suche, wird bei Auswahl
 * hervorgehoben – und zeichnet sich, sobald er beim Hineinzoomen groß genug
 * ist, um überhaupt eine Form zu haben.
 */
const RING_MIN = 1.5;

/**
 * Wie weit über den Bildrand hinaus gezeichnet wird – zwei Werte, weil die
 * Rechnung beim Zoomen anders steht als beim Ziehen.
 *
 * Leaflet legt jede Zeichenfläche größer an als das Fenster, damit beim
 * Verschieben nicht sofort ein leerer Rand auftaucht. Was dieser Vorrat
 * kostet und was er bringt, hängt davon ab, warum neu gezeichnet wird:
 *
 *   Beim **Ziehen** zeichnet `_reichtNoch` nur dann neu, wenn der Ausschnitt
 *   aus der gezeichneten Fläche gewandert ist. Ein großer Vorrat bedeutet
 *   hier *seltener* neu zeichnen – 35 % erlauben einen Zug über ein Drittel
 *   der Fensterbreite, ohne dass irgendetwas gerechnet wird.
 *
 *   Beim **Zoomen** hilft kein Vorrat: Der Maßstab ändert sich, es muss so
 *   oder so alles neu. Jeder zusätzliche Bildpunkt ist reine Zugabe. Bei
 *   35 % ist die Fläche das 2,9-Fache des Fensters, bei 12 % das 1,6-Fache.
 *
 * Gemessen im Zeitschnitt 1492, zwei Zoomsprünge, Rechenleistung geviertelt:
 *
 *   Vorrat   blockiert   längste Aufgabe
 *     35 %     4.290 ms      977 ms
 *     25 %     3.380 ms      790 ms
 *     15 %     3.080 ms      562 ms
 *
 * Die längste Aufgabe ist das, was man als Stocken sieht. Deshalb legt
 * `_update` die Fläche klein an, wenn der Anlass ein Zoomschritt war, und
 * groß, wenn es ein Zug war. Nach einem Zoomschritt löst der erste Zug
 * einmal ein Neuzeichnen aus – danach ist wieder Vorrat da.
 */
const RAND_ZUG = .35;
const RAND_ZOOM = .12;



/** Größte Ausdehnung eines Ringes in Bildpunkten. */
function ringAusdehnung(p) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let i = 0; i < p.length; i++) {
    const q = p[i];
    if (q.x < x0) x0 = q.x;
    if (q.x > x1) x1 = q.x;
    if (q.y < y0) y0 = q.y;
    if (q.y > y1) y1 = q.y;
  }
  const bx = x1 - x0;
  const by = y1 - y0;
  return bx > by ? bx : by;
}

/**
 * Leaflets Zeichenwerk, aber ohne die unsichtbaren Ringe.
 *
 * Alle Zeichenwerke des Atlas erben hiervon, damit die Regel an einer Stelle
 * steht und nicht in jeder Ebene neu.
 */
const PlainCanvas = L.Canvas.extend({
  /**
   * Beim Schwenken nur neu zeichnen, wenn der Vorrat aufgebraucht ist.
   *
   * Leaflet legt jede Zeichenfläche größer an als das Fenster und zeichnet
   * sie trotzdem **nach jeder Bewegung** vollständig neu – auch wenn man nur
   * zwanzig Bildpunkte weit gezogen hat und alles Nötige längst gezeichnet
   * dasteht. Bei einer Karte aus 1.300 Flächen und einer Küstenlinie aus
   * 140.000 Stützpunkten kostet das eine knappe Sekunde. Genau das war beim
   * Ziehen als Ruckeln zu spüren: Die Bewegung selbst läuft flüssig, weil
   * Leaflet die Fläche nur verschiebt – und am Ende steht die Karte.
   *
   * Die Fläche liegt in Kartenkoordinaten und wandert mit dem Pane mit. Sie
   * bleibt also richtig, solange der neue Ausschnitt noch in ihr liegt und
   * sich der Maßstab nicht geändert hat. Dann gibt es nichts zu tun.
   *
   * Gemessen: Von zwölf Zügen quer über den Bildschirm lösen noch zwei ein
   * Neuzeichnen aus statt zwölf.
   */
  _reichtNoch() {
    const map = this._map;
    if (!map) return true;
    if (map._animatingZoom && this._bounds) return true;
    if (!this._bounds || this._zoom !== map.getZoom()) return false;
    // `_bounds` liegt in Kartenkoordinaten. Deren Nullpunkt verschiebt Leaflet
    // bei jedem Sprung auf eine neue Mitte – danach wäre der Vergleich
    // zwischen alter und neuer Fläche ein Vergleich zweier Maßstäbe. Beim
    // bloßen Ziehen bleibt der Nullpunkt stehen, und nur darum geht es hier.
    const nullpunkt = map.getPixelOrigin();
    if (!this._nullpunkt || !this._nullpunkt.equals(nullpunkt)) return false;
    // Öffnet sich die Tafel, wird die Karte schmaler, ohne dass sich Maßstab
    // oder Nullpunkt ändern. Leaflet beschneidet dann jede Fläche gegen die
    // neue Größe – der alte Zuschnitt wäre danach falsch, und Klicks träfen
    // das falsche Gemeinwesen. Also bei jeder Größenänderung neu zeichnen.
    const groesse = map.getSize();
    if (!this._sichtgroesse || !this._sichtgroesse.equals(groesse)) return false;
    const ecke = map.containerPointToLayerPoint([0, 0]);
    const sicht = new L.Bounds(ecke, ecke.add(groesse));
    return this._bounds.contains(sicht.min) && this._bounds.contains(sicht.max);
  },

  /** Den Stand festhalten, gegen den `_reichtNoch` beim nächsten Mal prüft. */
  _merkeStand() {
    this._nullpunkt = this._map.getPixelOrigin();
    this._sichtgroesse = this._map.getSize();
  },

  _update() {
    if (this._reichtNoch()) return;
    this.options.padding = this._zoom === this._map.getZoom() ? RAND_ZUG : RAND_ZOOM;
    const dichte = this.options.dichte;
    if (dichte) this._legeFlaecheAn(dichte);
    else L.Canvas.prototype._update.call(this);
    this._merkeStand();
  },

  /**
   * Die Zeichenfläche in einer eigenen Punktdichte anlegen.
   *
   * Leaflet legt sie auf Bildschirmen mit doppelter Punktdichte ebenfalls
   * doppelt an – vier Mal so viele Bildpunkte, vier Mal so viel Rasterarbeit.
   * Gemessen kostet allein das beim Zoomen 58 % mehr, bei exakt gleicher Zahl
   * an Zeichenwegen: reine Rasterung, kein JavaScript.
   *
   * Ersetzt `L.Canvas.prototype._update` vollständig, statt hinterher noch
   * einmal umzustellen: Das Setzen von `width` legt den Bildspeicher neu an
   * und löscht ihn: zweimal je Bewegung ist teurer als der ganze Gewinn.
   *
   * Für die Grenzflächen lohnt es sich nicht – gemessen bleibt die längste
   * Aufgabe eines Zoomsprungs gleich, ob sie in einfacher oder in doppelter
   * Dichte gezeichnet werden. Der Saum dagegen wird ohnehin weich; dort sind
   * vier Mal so viele Bildpunkte reine Zugabe.
   */
  _legeFlaecheAn(dichte) {
    L.Renderer.prototype._update.call(this);
    const b = this._bounds;
    const size = b.getSize();
    const c = this._container;
    L.DomUtil.setPosition(c, b.min);
    c.width = Math.round(size.x * dichte);
    c.height = Math.round(size.y * dichte);
    c.style.width = `${size.x}px`;
    c.style.height = `${size.y}px`;
    if (dichte !== 1) this._ctx.scale(dichte, dichte);
    this._ctx.translate(-b.min.x, -b.min.y);
    this.fire('update');
  },

  _updatePoly(layer, closed) {
    if (!this._drawing) return;
    const ctx = this._ctx;
    ctx.beginPath();
    let etwas = false;
    for (const punkte of layer._parts) {
      if (punkte.length < 2) continue;
      if (ringAusdehnung(punkte) < RING_MIN) continue;
      for (let i = 0; i < punkte.length; i++) {
        ctx[i === 0 ? 'moveTo' : 'lineTo'](punkte[i].x, punkte[i].y);
      }
      if (closed) ctx.closePath();
      etwas = true;
    }
    if (etwas) this._fillStroke(ctx, layer);
  },
});
const plainCanvas = (opts) => new PlainCanvas(opts);

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
const CoastCanvas = PlainCanvas.extend({
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
    const baender = this.options.baender;
    if (!baender?.length) {
      L.Canvas.prototype._fillStroke.call(this, ctx, layer);
      return;
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // Das breite, blasse Band zuerst, die enge Kante darüber – dieselbe
    // Reihenfolge wie früher die zwei Ebenen, jetzt in einer Zeichenfläche.
    for (const band of baender) {
      ctx.strokeStyle = band.farbe;
      for (const [breite, deckung] of band.staffel) {
        ctx.globalAlpha = band.deckung * deckung;
        ctx.lineWidth = band.breite * breite;
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  },

  _update() {
    if (this._reichtNoch()) return;
    this.options.padding = this._zoom === this._map.getZoom() ? RAND_ZUG : RAND_ZOOM;
    // Rückwärtsauflösung: halb so viele Bildpunkte, gleiche Fläche auf dem
    // Bildschirm. Der Saum wird ohnehin weich - vier Mal so viele Bildpunkte
    // machen ihn nicht weicher, sie kosten nur vier Mal so viel.
    this._legeFlaecheAn(1);
    this._merkeStand();
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
  lo: [[3.4, .10], [2.4, .16], [1.7, .24], [1, .40]],
  hi: [[2.6, .17], [1, .47]],
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
const SmoothCanvas = PlainCanvas.extend({
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
    let etwas = false;
    for (const punkte of parts) {
      if (ringAusdehnung(punkte) < RING_MIN) continue;
      zeichnePfad(ctx, punkte, closed, r);
      if (closed) ctx.closePath();
      etwas = true;
    }
    if (etwas) this._fillStroke(ctx, layer);
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
  constructor(el, { theme = 'night', holeGrenzen = null } = {}) {
    this.hole = { grenzen: holeGrenzen };
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
      /*
       * Ein Mausrad gibt in einer Bewegung fünf bis zehn Rasten ab. Leaflet
       * wartet zwischen ihnen 40 ms und macht daraus fünf bis zehn einzelne
       * Zoomvorgänge – und jeder davon zeichnet die ganze Karte neu. Bei
       * 140 ms wird aus einer Radbewegung ein Zoomschritt: einmal rechnen
       * statt achtmal. Die Karte folgt dem Rad dabei genauso weit, nur eben
       * in einem Zug.
       */
      wheelDebounceTime: 140,
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
      renderer: plainCanvas({ pane: 'ocean', padding: RAND_ZUG }),
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
    this.coastLayer = L.geoJSON(null, {
      pane: 'coast',
      renderer: (this.saumZeichner = coastCanvas({
        pane: 'coast', padding: RAND_ZUG, baender: [],
      })),
      interactive: false,
      smoothFactor: 1.2,
    }).addTo(this.map);

    this.waterLayer = L.geoJSON(null, {
      pane: 'water',
      renderer: plainCanvas({ pane: 'water', padding: RAND_ZUG }),
      interactive: false,
      smoothFactor: 1.2,
    });

    this.graticuleLayer = L.geoJSON(graticule(), {
      pane: 'graticule',
      renderer: plainCanvas({ pane: 'graticule', padding: RAND_ZUG }),
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
      renderer: smoothCanvas({ pane, padding: RAND_ZUG }),
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
   * Eingesetzt wird nicht in einem Zug, sondern Ebene für Ebene über mehrere
   * Einzelbilder. Die Gesamtarbeit bleibt gleich, aber der Browser kommt
   * zwischendurch zum Zeichnen – aus einem Standbild wird ein kurzes
   * Nachschärfen.
   */
  _applyCoast(level) {
    const data = this.coast[level];
    if (!data) return;
    this.coast.level = level;
    this.saumStaffel = SAUM[level] ?? SAUM.lo;
    const schritte = [
      () => { this.oceanLayer.clearLayers(); this.oceanLayer.addData(data); },
      () => { this.coastLayer.clearLayers(); this.coastLayer.addData(data); },
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
    /* Der Wechsel selbst kostet gemessen 40 ms – die feine Küstenlinie ist
       ein Vielfaches der groben. Er läuft deshalb nicht nur nach der
       Zoom-Animation, sondern auch erst nach der nächsten Bildausgabe: Das
       eingeschachtelte `setTimeout` im `requestAnimationFrame` kommt dran,
       wenn das Bild beim Betrachter ist, nicht während es entsteht. */
    clearTimeout(this._coastTimer);
    this._coastTimer = window.setTimeout(() => {
      requestAnimationFrame(() => setTimeout(() => {
        const now = this.map.getZoom() >= COAST_HD_FROM_ZOOM && this.coast.hi ? 'hi' : 'lo';
        if (now !== this.coast.level) this._applyCoast(now);
      }, 0));
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
    if (this.placeCanvas) this._planeOrte();
    this.palette = paletteFor(theme);
    this._styleBase();
    if (this.epoch) {
      this._computeColors();
      this._restyleActive();
      this._refreshHighlight();
    }
    this._styleLabels();
  }

  /**
   * Wert aus dem Stilblatt – gemerkt statt jedes Mal erfragt.
   *
   * `getComputedStyle` ist kein Nachschlagen, sondern eine Frage an den
   * Browser, die er unter Umständen mit einer Neuberechnung des Stilbaums
   * beantwortet. Das Einfärben einer Epoche fragte zweimal je Fläche – bei
   * 170 Gemeinwesen also 340-mal je Jahressprung nach zwei Werten, die sich
   * zwischendurch gar nicht ändern können.
   *
   * Der Speicher hängt am Farbwelt-Merkmal der Wurzel. Wechselt die Farbwelt,
   * ist der alte Stand von selbst ungültig – man kann nicht vergessen,
   * ihn zu verwerfen.
   */
  _cssVar(name, fallback) {
    const welt = document.documentElement.dataset.theme ?? '';
    if (this._cssWelt !== welt || !this._cssMerker) {
      this._cssWelt = welt;
      this._cssMerker = new Map();
    }
    if (this._cssMerker.has(name)) return this._cssMerker.get(name) ?? fallback;
    const wert = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    this._cssMerker.set(name, wert || null);
    return wert || fallback;
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
    const staffel = this.saumStaffel ?? SAUM.lo;
    const fade = 1 - nah * 0.62;
    const gedaempft = this.hasBasemap ? .5 : 1;
    this.saumZeichner.options.baender = [
      {
        farbe: glow,
        breite: Math.max(2.5, 11 - z * 1.9),
        deckung: Number(this._cssVar('--coast-glow-alpha', '.85')) * fade * gedaempft,
        staffel,
      },
      {
        farbe: this._cssVar('--coast-rim', glow),
        breite: Math.max(1, 2.6 - z * .12),
        deckung: Number(this._cssVar('--coast-rim-alpha', '.5')) * fade * gedaempft,
        staffel: [[1, 1]],
      },
    ];
    this.coastLayer.setStyle({ fill: false, stroke: true, opacity: 1, weight: 1 });
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
      // Die Fläche trägt, was die Bevölkerung glaubt. Wozu sich die
      // Herrschaft bekennt, liegt als Schraffur darüber – siehe
      // _religionsSchraffur.
      case 'religion': return props.rv ? `r${props.rv}` : null;
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

    /* Religion bekommt eine feste Tabelle statt der Nachbarschaftsfärbung.
     *
     * Bei den Gemeinwesen wird die Farbe so vergeben, dass Nachbarn sich
     * unterscheiden – dort ist die Farbe nur ein Merkzeichen. Hier bedeutet
     * sie etwas: Zwei katholische Länder müssen dieselbe Farbe tragen, auch
     * wenn sie aneinandergrenzen. Genau daran erkennt man auf einen Blick,
     * wo eine Konfessionsgrenze verläuft und wo keine ist. */
    if (this.colorMode === 'religion') {
      const hell = this.theme !== 'night';
      for (const [k, m] of Object.entries(RELIGION.klassen)) {
        this.colors.set(`r${k}`, hell ? (m.hell ?? m.farbe) : m.farbe);
      }
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
    // Während einer Schlacht tritt die Staatenfläche fast ganz zurück: Auf
    // Schlachtfeldmaßstab ist sie eine einzige Farbfläche bis zum Bildrand
    // und sagt nichts. Die Grenzlinien bleiben – wo eine Grenze durchs Bild
    // läuft, wie bei Tannenberg die deutsch-russische, gehört sie zur Lage.
    if (this._schlacht) return basis * .16;
    return this.hasBasemap ? basis * .62 : basis;
  }

  /**
   * Schlachtmodus: Flächen zurück, Grenzen bleiben.
   *
   * Vorher hat die Bühne das über die Deckkraft der ganzen Ebene erledigt –
   * damit gingen aber die Grenzlinien mit unter, und die sind auf diesem
   * Maßstab oft das Einzige, was die Staatenkarte noch beizutragen hat.
   */
  setSchlachtmodus(an) {
    const neu = !!an;
    if (neu === !!this._schlacht) return;
    this._schlacht = neu;
    this._restyleActive();
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
      // Während einer Schlacht ebenso zurück wie die Fläche: Eine Schraffur
      // in Besatzungsfarbe quer über dem Schlachtfeld gehört zur Weltkarte,
      // nicht zum Blatt.
      fillOpacity: Number(this._cssVar('--hatch-alpha', '.85')) * (this._schlacht ? .22 : 1),
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

  /**
   * Schraffur für die Religion der Herrschaft.
   *
   * Sie liegt nur dort, wo Herrschaft und Bevölkerung auseinanderfallen –
   * über den 12 Prozent der Flächen, für die es diese Ebene überhaupt gibt.
   * Das Mogulreich trägt dann hinduistisches Orange mit sunnitisch grünen
   * Streifen, der osmanische Balkan orthodoxes Petrol mit denselben Streifen,
   * Sowjetrussland orthodoxes Petrol mit grauen. Wo nichts liegt, sind sich
   * Hof und Land einig.
   *
   * Gebaut wird sie nur, solange der Modus läuft: Sie ist eine zweite
   * Geometrieebene über allen Flächen, und die kostet bei jedem Jahressprung.
   * Wer die Religionskarte nie öffnet, soll dafür nicht zahlen.
   */
  _religionsSchraffur() {
    const slot = this.slots[this.activeSlot];
    if (slot.religion) {
      slot.religion.remove();
      slot.religion = null;
    }
    if (this.colorMode !== 'religion' || !this.epoch) return;

    const geteilt = this.epoch.geojson.features.filter((f) => {
      const p = f.properties;
      // „lokal" heißt: kein Bekenntnis der Herrschaft – ab 1920 der Regelfall.
      // Das ist keine Abweichung, sondern ihr Gegenteil, und trägt deshalb
      // auch keine Schraffur.
      return p.rv && p.rs && p.rs !== 'lokal' && p.rv !== p.rs;
    });
    if (!geteilt.length) return;

    slot.religion = L.geoJSON(
      { type: 'FeatureCollection', features: geteilt },
      {
        pane: slot.pane,
        renderer: slot.renderer,
        interactive: false,
        smoothFactor: .5,
        style: (f) => ({
          fill: true,
          fillColor: hatchFor(this.colors.get(`r${f.properties.rs}`) ?? '#888'),
          fillOpacity: Number(this._cssVar('--hatch-alpha', '.85')),
          stroke: false,
          bubblingMouseEvents: false,
        }),
      },
    ).addTo(this.map);
  }

  /**
   * Religionsgrenzen: gestrichelte Linien quer durch die Länder.
   *
   * Die Fläche eines Gemeinwesens trägt die Religion seiner Mehrheit – für ein
   * Reich von der Größe des osmanischen ist das zu wenig. Serbien war
   * christlich, auch als es osmanisch war, und auf einer einfarbigen Fläche
   * sieht man davon nichts. Diese Linien tragen es nach.
   *
   * Gestrichelt, weil es keine Grenzen im Rechtssinne sind, sondern Übergänge:
   * Wo eine Konfession aufhört und die nächste anfängt, ist eine Landschaft
   * und keine Linie. Deshalb liegen sie auch über der Fläche und nicht als
   * deren Rand – ein Rand behauptete, dort sei etwas zu Ende.
   *
   * Die Ebene wird nur hinzugefügt und wieder entfernt. An den Staatsflächen
   * ändert sie nichts: Ein Moduswechsel kann so nichts abschalten, was nicht
   * von selbst wiederkäme.
   */
  async _religionsGrenzen() {
    if (this._relLinien) { this._relLinien.remove(); this._relLinien = null; }
    this._relGebiete = null;
    if (this.colorMode !== 'religion' || !this.epoch) { this._planeOrte(); return; }

    const key = this.epoch.meta.key;
    this._relSchluessel = key;
    const daten = await this.hole?.grenzen?.(key);
    if (this._relSchluessel !== key || this.colorMode !== 'religion' || !daten) return;

    this._relGebiete = daten.gebiete ?? null;
    const farbe = this._cssVar('--rel-grenze', 'rgba(255,255,255,.55)');
    this._relLinien = L.polyline(
      (daten.zuege ?? []).map((zug) => zug.map(([x, y]) => [y, x])),
      {
        pane: 'relGrenze',
        renderer: plainCanvas({ pane: 'relGrenze', padding: RAND_ZUG }),
        interactive: false,
        color: farbe,
        weight: 1.3,
        opacity: 1,
        dashArray: '6 5',
        lineCap: 'butt',
        lineJoin: 'round',
        fill: false,
      },
    ).addTo(this.map);
    this._planeOrte();
  }

  setColorMode(mode) {
    if (this.colorMode === mode) return;
    this.colorMode = mode;
    if (!this.epoch) return;
    this._computeColors();
    this._restyleActive();
    this._religionsSchraffur();
    this._religionsGrenzen();
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
    if (to.religion) {
      to.religion.remove();
      to.religion = null;
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

    /* Besetztes Gebiet: zuletzt hinzugefügt, damit die Schraffur über der
       Füllung liegt. Ohne Zeigerereignisse – der Klick soll die Fläche
       darunter treffen, nicht die Schraffur.

       Und ein Bild später als die Flächen. Ein Jahressprung baut zwei
       vollständige Ebenen aus Geometrie auf; zusammen blockierten sie den
       Hauptstrang gemessen 50 bis 90 ms am Stück, und alles über 50 ms sieht
       man als Ruckler. Getrennt sind es zwei kürzere Blockaden mit einem
       ausgelieferten Bild dazwischen – dieselbe Arbeit, aber die Karte steht
       nicht mehr.

       Der Zähler schützt vor der Überholung: Wer schnell durch die Jahre
       fährt, löst den nächsten Sprung aus, bevor der vorige seine Schraffur
       gebaut hat. Ohne ihn legte sich die Besatzung des vorletzten Jahres
       über die Flächen des letzten. */
    const besetzte = data.geojson.features.filter((f) => f.properties.o);
    const stand = (this._epochenZaehler = (this._epochenZaehler ?? 0) + 1);
    if (besetzte.length) {
      // Nach der Bildausgabe, nicht in ihr: `requestAnimationFrame` allein
      // legte die Arbeit auf dasselbe Bild wie alles andere Gezeichnete und
      // machte aus zwei kurzen Blockaden eine lange. Das eingeschachtelte
      // `setTimeout` läuft erst, wenn das Bild beim Betrachter ist.
      requestAnimationFrame(() => setTimeout(() => {
        if (stand !== this._epochenZaehler || !to.layer) return;
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
      }, 0));
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
      from.religion?.remove();
      from.religion = null;
    }, animate ? 340 : 0);

    this._religionsSchraffur();
    this._religionsGrenzen();
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

    /*
     * Höchstens zwei Beschriftungen je Gemeinwesen – und die zweite nur, wenn
     * sie weit genug weg steht.
     *
     * Ein Gemeinwesen kann aus mehreren Teilstücken bestehen, und manchmal
     * gehört an jedes ein Name: Russland reicht über die Datumsgrenze, das
     * Vereinigte Königreich hat Übersee. Seit die Karte Besatzung zeigt, ist
     * aber der häufigere Fall ein anderer: Ein Land ist an einer Frontlinie
     * zerschnitten, und die Stücke liegen nebeneinander. Österreich 1945
     * bekam so zweimal „Österreich“ übereinander, keine zwei Handbreit
     * auseinander.
     *
     * Zehn Grad Abstand trennt die beiden Fälle sauber: Besatzungszonen
     * liegen darunter, Übersee darüber.
     */
    const perName = new Map();
    const items = [];
    for (const p of candidates) {
      const schon = perName.get(p.n);
      if (schon) {
        if (schon.length >= 2) continue;
        const [x, y] = schon[0];
        if (Math.abs(p.c[0] - x) < 10 && Math.abs(p.c[1] - y) < 10) continue;
        schon.push(p.c);
      } else {
        perName.set(p.n, [p.c]);
      }
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
    this._planeOrte();
  }

  /** Landschaftsnamen: Gebirge, Wüsten, Hochebenen. */
  setPhysical(stellen) {
    this.physical = stellen ?? [];
    this._buildPlaceCanvas();
    this._planeOrte();
  }

  setShowPhysical(on) {
    this.showPhysical = !!on;
    this._buildPlaceCanvas();
    this._planeOrte();
  }

  setShowPlaces(on) {
    this.showPlaces = !!on;
    if (on && this.places?.length) this.placeLayer.addTo(this.map);
    else this.placeLayer.remove();
    this._planeOrte();
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
    this.map.on('moveend zoomend viewreset resize', () => this._planeOrte());
    this.map.on('zoomstart', () => { canvas.style.visibility = 'hidden'; });
  }

  /**
   * Ortsnamen zeichnen – höchstens einmal je Bild.
   *
   * `moveend` und `zoomend` feuern bei jedem Zoomschritt beide; gemessen 24
   * Zeichnungen für zwölf Schritte, jede über alle zweitausend Orte samt
   * Kollisionsprüfung. Die zweite hat nie jemand gesehen: Sie überschrieb die
   * erste im selben Bild.
   */
  _planeOrte() {
    if (this._orteRahmen) return;
    this._orteRahmen = requestAnimationFrame(() => {
      this._orteRahmen = 0;
      this._drawPlaces();
    });
  }

  /**
   * Zeichenfläche für die Gebietsnamen der Religionsebene.
   *
   * Eine eigene, weil sie über den Ländernamen liegen muss: Im Religionsmodus
   * ist „Orthodox" mitten im Osmanischen Reich die Aussage der Karte, und auf
   * der Ortsnamen-Ebene verschwand sie unter dem Namen des Reiches.
   *
   * @param {boolean} nurLeeren Nur wegwischen, nichts anlegen
   */
  _relLeinwand(nurLeeren = false) {
    if (nurLeeren) {
      const c = this._relText;
      if (c) c.getContext('2d').clearRect(0, 0, c.width, c.height);
      return c;
    }
    if (!this._relText) {
      const c = L.DomUtil.create('canvas', 'religion-namen');
      c.style.position = 'absolute';
      c.style.pointerEvents = 'none';
      this.map.getPane('relName').appendChild(c);
      this._relText = c;
    }
    const groesse = this.map.getSize();
    const dpr = schriftdichte();
    const c = this._relText;
    if (c.width !== Math.round(groesse.x * dpr)) {
      c.width = Math.round(groesse.x * dpr);
      c.height = Math.round(groesse.y * dpr);
      c.style.width = `${groesse.x}px`;
      c.style.height = `${groesse.y}px`;
    }
    return c;
  }

  _drawPlaces() {
    const canvas = this.placeCanvas;
    if (!canvas) return;
    const map = this.map;
    const size = map.getSize();
    const dpr = schriftdichte();
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
    /* Dieselbe Rechnung wie bei den Ländernamen: Auf einem schmalen Bildschirm
       sind Ortsnamen kleiner und weniger. Zweihundert Punkte mit Namen auf
       390 Bildpunkten Breite wären ein Gitter, keine Karte. */
    const eng = size.x < 560;
    const hoechstOrte = eng ? 70 : 220;
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

    /* Im Religionsmodus zuerst die Gebietsnamen.
     *
     * Sie haben Vorrang vor Orten und Landschaften, weil sie in diesem Modus
     * die Aussage der Karte sind: Ohne sie sagt eine gestrichelte Linie nur,
     * dass hier etwas anderes anfängt, nicht was. Erst „Orthodox" im
     * serbischen Landesinneren macht sichtbar, was das osmanische Reich
     * einfarbig verschweigt.
     *
     * Gezeigt wird ein Gebiet erst, wenn es auf dem Schirm groß genug ist,
     * dass die Schrift hineinpasst – sonst überschriebe die halbe Karte sich
     * selbst. Die Zahl der Zellen steht in den Daten, den Rest rechnet die
     * Zoomstufe. */
    if (this.colorMode === 'religion' && this._relGebiete) {
      const rc = this._relLeinwand();
      const rctx = rc.getContext('2d');
      rctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      rctx.clearRect(0, 0, size.x, size.y);
      L.DomUtil.setPosition(rc, pos);
      rctx.textBaseline = 'middle';
      rctx.lineJoin = 'round';
      rctx.textAlign = 'center';
      for (const g of this._relGebiete) {
        const klasse = RELIGION.klassen[g.k];
        if (!klasse) continue;
        // Kantenlänge des Gebiets in Bildpunkten, grob aus seiner Zellenzahl.
        const seite = Math.sqrt(g.n) * .25 * (256 * 2 ** zoom) / 360;
        if (seite < (eng ? 100 : 72)) continue;
        const pt = map.latLngToContainerPoint([g.p[1], g.p[0]]);
        if (pt.x < 0 || pt.y < 0 || pt.x > size.x || pt.y > size.y) continue;
        const grad = Math.min(eng ? 11.5 : 14, Math.max(eng ? 8.5 : 9.5, seite / 12));
        rctx.font = `600 ${grad.toFixed(1)}px ${font}`;
        const breite = breiteVon(rctx, klasse.name);
        if (breite > seite * 1.1) continue;
        if (!frei(pt.x - breite / 2 - 5, pt.y - grad, breite + 10, grad * 2)) continue;
        belegt.push([pt.x - breite / 2 - 5, pt.y - grad, pt.x + breite / 2 + 5, pt.y + grad]);
        rctx.strokeStyle = halo;
        rctx.lineWidth = 3.4;
        rctx.strokeText(klasse.name, pt.x, pt.y);
        rctx.fillStyle = this.theme === 'night' ? klasse.farbe : (klasse.hell ?? klasse.farbe);
        rctx.fillText(klasse.name, pt.x, pt.y);
      }
      ctx.textAlign = 'left';
    } else {
      this._relLeinwand(true);
    }

    // Landschaftsnamen zuerst: Sie sind großräumig und sollen den Vorrang
    // haben, wenn sich Beschriftungen ins Gehege kommen.
    if (this.showPhysical) {
      const faint = this._cssVar('--ink-faint', 'rgba(255,255,255,.5)');
      for (const s of this.physical) {
        if (zoom < 3 + s.rang * .55) continue;
        const pt = map.latLngToContainerPoint([s.lat, s.lon]);
        if (pt.x < 0 || pt.y < 0 || pt.x > size.x || pt.y > size.y) continue;
        const grad = (s.rang <= 2 ? 12 : 11) - (eng ? 1.5 : 0);
        ctx.font = `italic 500 ${grad}px ${font}`;
        const breite = breiteVon(ctx, s.name);
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
      if (gezeichnet > hoechstOrte) break;
      if (zoom < (PLACE_FROM_ZOOM[ort.rang] ?? 9)) continue;
      const pt = map.latLngToContainerPoint([ort.lat, ort.lon]);
      if (pt.x < -40 || pt.y < -20 || pt.x > size.x + 40 || pt.y > size.y + 20) continue;

      const grad = (ort.rang <= 1 ? 12.5 : ort.rang <= 3 ? 11.5 : 10.5) - (eng ? 1.5 : 0);
      ctx.font = `500 ${grad}px ${font}`;
      const breite = breiteVon(ctx, ort.name);
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
