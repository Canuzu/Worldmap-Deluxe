/**
 * Berühmte Schlachten als abspielbarer Verlauf.
 *
 * Der Atlas zeigt sonst Zustände – so sah die Welt im Jahr X aus. Eine
 * Schlacht ist aber kein Zustand, sondern eine Bewegung, und die fällt aus
 * einer Karte heraus, die nur Jahresschnitte kennt.
 *
 * Dieses Modul legt über die Karte eine eigene Zeichenfläche, auf der die
 * Truppenkörper **gleiten** statt umzuspringen. Der Unterschied ist nicht
 * Zierrat: Wer zwei Standbilder nacheinander sieht, muss sich die Bewegung
 * dazudenken; wer die Bewegung sieht, versteht sie. Genau darum geht es bei
 * einer Umfassung, einem Durchbruch, einem Rückzug.
 *
 * Drei Bausteine:
 *
 *   `Zeitachse`    – die Schlacht als durchgehende Größe statt als Folge von
 *                    Standbildern. Abspielen, Springen und freies Ziehen sind
 *                    derselbe Vorgang mit verschiedenen Antrieben.
 *   `formeUm`      – zwei Umrisse mit verschiedener Punktzahl ineinander
 *                    überführen, ohne dass die Form dabei umstülpt.
 *   `SchlachtLeinwand` – eine Leinwand über der Karte, die nur läuft, solange
 *                    eine Schlacht offen ist, und danach restlos verschwindet.
 *
 * Bewusst getrennt von den Zeitschnitten: Truppenstellungen sind keine
 * Staatsgrenzen. Sie liegen in einer eigenen Ebene, in eigenen Farben, und
 * sie verschwinden restlos, sobald man die Schlacht schließt.
 */
import L from 'leaflet';

/**
 * Die Verläufe kommen erst, wenn jemand sie sehen will.
 *
 * Zwölf Schlachten mit 1.006 Stellungen sind rund 350 kB. Fest eingebunden
 * lägen sie in jedem Erstaufruf, obwohl die meisten Besucher nie eine
 * Schlacht öffnen – gemessen wuchs der Erstaufruf dadurch um 366 kB und riss
 * die Grenze von `check:ladelast`. Als eigener Brocken kommt er beim Öffnen
 * des Registers nach, und das dauert keine hundert Millisekunden.
 *
 * `BATTLES` ist bewusst ein `let` mit lebendiger Bindung: Wer es einmal
 * importiert hat, sieht die geladene Liste, ohne sie sich reichen zu lassen.
 */
export let BATTLES = [];

export async function ladeBattles() {
  if (!BATTLES.length) {
    const spec = (await import('../data/battles.json')).default;
    BATTLES = spec.schlachten;
  }
  return BATTLES;
}

/* ------------------------------------------------------------ Choreografie */

/**
 * Wie sich ein Stationsfenster aufteilt.
 *
 * Eine Station ist kein Augenblick, sondern ein Abschnitt: Man liest, was
 * geschieht, sieht die Absicht als Pfeil, und erst dann setzt sich das Heer
 * in Bewegung. In dieser Reihenfolge – nicht gleichzeitig, sonst ist die
 * Bewegung vorbei, bevor man den Satz gelesen hat.
 *
 *   0 %  –  45 %   Die Stellungen ruhen. Die Pfeile zeichnen sich von hinten
 *                  nach vorn, die Spitze kommt zuletzt an.
 *  45 % – 100 %    Die Stellungen gleiten in die Lage der nächsten Station.
 *                  Die Pfeile verblassen dabei: Sie haben ihre Aussage
 *                  gemacht, jetzt zeigt sie die Bewegung selbst.
 */
const PFEIL_BIS = .45;
const ZUG_AB = .45;

/**
 * Der Anflug: erst die Region zeigen, kurz halten, dann hinein.
 *
 * 1.300 ms Weitwinkel, 900 ms Halt, 2.100 ms Hineinflug. Kürzer wirkt
 * gehetzt, länger lässt es warten – gemessen an einer Landung, die man ein
 * Dutzend Mal hintereinander ansieht, ohne dass sie lästig wird.
 */
const ANFLUG_HALT = 2200;
const ANFLUG_EIN = 2100;

/**
 * Der Ausschnitt je Station – und wann die Karte ihm folgt.
 *
 * Eine Schlacht hat nicht durchgehend denselben Maßstab. Bei Tannenberg
 * stehen die Heere am ersten Tag sechzig Kilometer auseinander und am dritten
 * auf einem Feld von drei; eine feste Zoomstufe zeigt entweder das eine als
 * Punktwolke oder das andere als leere Fläche. Deshalb rechnet jede Station
 * ihren eigenen Rahmen aus dem, was in ihr steht.
 *
 * Nur: Eine Karte, die bei jedem Stationswechsel nachfährt, ist unruhig, und
 * Unruhe kostet mehr Verständnis, als der genauere Maßstab bringt. Sie fährt
 * deshalb erst, wenn sich der geforderte Rahmen deutlich ändert – um mehr als
 * ein Drittel der Bildbreite verschoben oder um mehr als eine halbe Zoomstufe
 * anders. Bei Waterloo und Azincourt steht die Karte damit still, bei
 * Tannenberg und den Feldzügen fährt sie drei- bis viermal.
 *
 * Und sie fährt in der **zweiten Hälfte** des Stationsfensters, zusammen mit
 * dem Gleiten der Truppen. Eine Bewegung trägt beides: Wer sieht, wie sich
 * ein Flügel löst, sieht die Karte mit ihm gehen. Führe sie am Übergang
 * zwischen zwei Stationen, wäre es ein zweiter, unmotivierter Ruck.
 */
const SICHT_VERSATZ = .34;
const SICHT_STUFE = .46;
/** Weniger als vier Kilometer über die freie Breite wird nie gezeigt. */
const ENGSTE_BREITE = 4000;
/** Nachfahren beim Abspielen bzw. nach einem Sprung. */
const SICHT_DAUER = 2.3;
const SICHT_DAUER_KURZ = 1.1;

/** Weich anfahren, weich ankommen – kein Heer bewegt sich mit einem Ruck. */
const weich = (t) => (t < .5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2);
const klemm = (v, a, b) => (v < a ? a : v > b ? b : v);

/* -------------------------------------------------------------- Umformung */

/**
 * Einen Ring auf feste Punktzahl gleichmäßig nachabtasten.
 *
 * Zwei Stellungen derselben Truppe haben in zwei Stationen selten gleich
 * viele Stützpunkte – eine gedehnte Linie braucht mehr als ein geschlossenes
 * Karree. Ohne gemeinsames Raster gibt es nichts zu überblenden.
 */
function abtasten(ring, n) {
  const p = ring.length > 1 && ring[0][0] === ring.at(-1)[0] && ring[0][1] === ring.at(-1)[1]
    ? ring.slice(0, -1) : ring;
  const m = p.length;
  const laengen = [];
  let gesamt = 0;
  for (let i = 0; i < m; i++) {
    const a = p[i];
    const b = p[(i + 1) % m];
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    laengen.push(d);
    gesamt += d;
  }
  const out = [];
  if (gesamt < 1e-12) {
    for (let i = 0; i < n; i++) out.push([p[0][0], p[0][1]]);
    return out;
  }
  const schritt = gesamt / n;
  let kante = 0;
  let rest = 0;
  for (let i = 0; i < n; i++) {
    let weg = i * schritt - rest;
    while (kante < m && weg > laengen[kante]) {
      weg -= laengen[kante];
      rest += laengen[kante];
      kante++;
    }
    const k = Math.min(kante, m - 1);
    const a = p[k];
    const b = p[(k + 1) % m];
    const f = laengen[k] > 1e-12 ? weg / laengen[k] : 0;
    out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
  }
  return out;
}

/**
 * Den Anfangspunkt des zweiten Ringes so drehen, dass er zum ersten passt.
 *
 * Ohne diesen Schritt läuft der Umriss beim Überblenden in sich zusammen und
 * stülpt sich um – die Truppe würde sich beim Vorrücken einmal umkrempeln.
 * Gesucht ist die Drehung mit dem kleinsten Abstand über alle Punktpaare.
 */
function dreheZu(a, b) {
  const n = a.length;
  let bestes = 0;
  let bester = Infinity;
  for (let d = 0; d < n; d++) {
    let s = 0;
    for (let i = 0; i < n; i++) {
      const q = b[(i + d) % n];
      const dx = a[i][0] - q[0];
      const dy = a[i][1] - q[1];
      s += dx * dx + dy * dy;
      if (s > bester) break;
    }
    if (s < bester) { bester = s; bestes = d; }
  }
  return bestes ? [...b.slice(bestes), ...b.slice(0, bestes)] : b;
}

/** Punktzahl des gemeinsamen Rasters. Fein genug für jede Form hier. */
const RASTER = 48;

/** Zwei Umrisse ineinander überführen. `f` von 0 (a) bis 1 (b). */
function formeUm(a, b, f) {
  const n = a.length;
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = [a[i][0] + (b[i][0] - a[i][0]) * f, a[i][1] + (b[i][1] - a[i][1]) * f];
  }
  return out;
}

/* ---------------------------------------------------------------- Zeichnen */

/**
 * Einen geschlossenen Zug weich in den Zeichenweg legen.
 *
 * Ein Truppenkörper ist kein Kristall. Über die Stützpunkte läuft deshalb
 * eine Catmull-Rom-Kurve, in Bézier-Stücke umgerechnet – dadurch wird aus
 * acht Ecken eine Form, die aussieht wie mit dem Stift auf eine Stabskarte
 * gelegt, und nicht wie ein Polygonzug.
 */
function weicherWeg(ctx, p, spannung = .5) {
  const n = p.length;
  if (n < 3) {
    ctx.moveTo(p[0][0], p[0][1]);
    for (let i = 1; i < n; i++) ctx.lineTo(p[i][0], p[i][1]);
    return;
  }
  ctx.moveTo(p[0][0], p[0][1]);
  for (let i = 0; i < n; i++) {
    const p0 = p[(i - 1 + n) % n];
    const p1 = p[i];
    const p2 = p[(i + 1) % n];
    const p3 = p[(i + 2) % n];
    ctx.bezierCurveTo(
      p1[0] + ((p2[0] - p0[0]) * spannung) / 6, p1[1] + ((p2[1] - p0[1]) * spannung) / 6,
      p2[0] - ((p3[0] - p1[0]) * spannung) / 6, p2[1] - ((p3[1] - p1[1]) * spannung) / 6,
      p2[0], p2[1],
    );
  }
  ctx.closePath();
}

/**
 * Offener Zug, ebenfalls weich – für Flüsse, Wege und Mauern.
 *
 * Die Spannung ist einstellbar, weil ein Fluss mit fünf Stützpunkten über
 * zwanzig Kilometer sonst weit über seine Punkte hinausschwingt: Aus dem
 * Aufidus wurde ein Bogen, der halb Apulien durchschnitt.
 */
function weicheLinie(ctx, p, spannung = 1) {
  const n = p.length;
  ctx.moveTo(p[0][0], p[0][1]);
  if (n < 3) { for (let i = 1; i < n; i++) ctx.lineTo(p[i][0], p[i][1]); return; }
  const f = spannung / 6;
  for (let i = 0; i < n - 1; i++) {
    const p0 = p[Math.max(0, i - 1)];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[Math.min(n - 1, i + 2)];
    ctx.bezierCurveTo(
      p1[0] + (p2[0] - p0[0]) * f, p1[1] + (p2[1] - p0[1]) * f,
      p2[0] - (p3[0] - p1[0]) * f, p2[1] - (p3[1] - p1[1]) * f,
      p2[0], p2[1],
    );
  }
}

/** Farbe mit anderer Deckkraft – die Daten führen nur Hexwerte. */
function mitAlpha(farbe, a) {
  const h = farbe.replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(v, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/**
 * Geländesignaturen.
 *
 * Bei fast jeder dieser Schlachten hat das Gelände mitentschieden: der
 * Hohlweg von Waterloo, der Schlamm von Azincourt, die Meerenge von Lepanto.
 * Ohne Andeutung sieht man auf der Karte nur farbige Flecken in einer Ebene.
 *
 * Anders als die Staatenkarte darunter wird hier **gezeichnet wie auf einer
 * Stabskarte**: Wald bekommt eine Punktkörnung, Höhen bekommen Höhenlinien,
 * Ortschaften eine Baublock-Schraffur, Wege eine doppelte Linie. Eine
 * einfarbige Fläche in Grün ist ein Fleck; eine gekörnte Fläche mit
 * geschlossener Kante liest sich als Wald.
 */
/**
 * Wie stark Geländeformen gerundet werden.
 *
 * Ein Truppenkörper darf rund sein, ein Höhenzug nicht: Eine lange, flache
 * Ellipse beult bei voller Spannung an den Enden weit über ihre Stützpunkte
 * hinaus, und aus einem schmalen Kamm wird ein Ei. Ein Drittel der Spannung
 * hält die Form, ohne sie eckig zu machen.
 */
const GELAENDE_SPANNUNG = .32;

const GELAENDE = {
  fluss: { farbe: '#4d92d8', breite: 4, linie: true, ader: true },
  see: { farbe: '#3f7fc0', flaeche: '#3f7fc0', deckung: .34, kante: .8 },
  sumpf: { farbe: '#6f9a8c', flaeche: '#6f9a8c', deckung: .2, muster: 'sumpf', kante: 0 },
  wald: { farbe: '#4f8250', flaeche: '#4f8250', deckung: .26, muster: 'wald', kante: 1.1 },
  hoehe: { farbe: '#b08d55', flaeche: '#b08d55', deckung: .1, kante: 1.4, schraffur: true },
  stadt: { farbe: '#c3b39a', flaeche: '#8d7f6c', deckung: .3, muster: 'stadt', kante: 1.2 },
  mauer: { farbe: '#e0d0b0', breite: 4.5, linie: true, zinnen: true },
  weg: { farbe: '#cbb894', breite: 2.6, linie: true, doppelt: true },
  furt: { farbe: '#9fc6e8', breite: 2.4, linie: true, gestrichelt: true },
  /* Wind und Strömung sind bei einer Ruder- oder Segelschlacht das, was bei
     einer Landschlacht der Hang ist. Bei Trafalgar erklärt der schwache
     Westwind, warum der Anlauf zwei Stunden dauerte und die Briten ihn
     wehrlos überstehen mussten. Gezeichnet als gefiederter Pfeil, wie auf
     einer Seekarte. */
  wind: { farbe: '#8fa8c4', breite: 2, linie: true, feder: true },
  stroemung: { farbe: '#6fb0d8', breite: 2, linie: true, feder: true, wellig: true },
};

/**
 * Waffengattungen als Füllmuster.
 *
 * Eine Farbe sagt, wer da steht. Sie sagt nicht, **was** da steht – und
 * genau davon hängt bei jeder dieser Schlachten der Ausgang ab: ob Reiterei
 * eine Lücke ausnutzen kann, ob Bogenschützen einen Hang decken, ob eine
 * Batterie den Anmarsch bestreicht. Auf gedruckten Stabskarten unterscheidet
 * man das seit dem 18. Jahrhundert durch Schraffuren, nicht durch Farben.
 * Dieselbe Sprache hier: Die Partei gibt den Farbton, die Gattung das Muster.
 */
const GATTUNGEN = {
  fuss: { strich: 'waagerecht', abstand: 5 },
  bogen: { strich: 'kreuz', abstand: 6 },
  reiter: { strich: 'schraeg', abstand: 5 },
  geschuetz: { strich: 'punkt', abstand: 6 },
  schiff: { strich: 'welle', abstand: 7 },
  gemischt: { strich: null },
};

/**
 * Mindestgröße eines Truppenkörpers – und wann aus ihm ein Zeichen wird.
 *
 * Der Ausschnitt folgt jetzt der Station, und bei einem Feldzug heißt das
 * Zoomstufe 8: Eine Division, die auf dem Boden vier Kilometer breit steht,
 * ist dort zwanzig Bildpunkte groß. Maßstabstreu ist das richtig und
 * unlesbar zugleich – man sieht einen Strich und weiß nicht, ob dort ein
 * Korps steht oder eine Brigade.
 *
 * Zwei Stufen, weich ineinander:
 *
 *   1. Der Umriss wächst auf eine Mindestgröße, behält aber seine Form. Ein
 *      Keil bleibt ein Keil, eine Linie eine Linie – die Aussage der
 *      Geometrie geht nicht verloren, sie wird nur lesbar gehalten.
 *   2. Wird es noch enger, blendet der Umriss in ein Truppenzeichen über:
 *      ein Rechteck mit dem Zeichen der Waffengattung, wie auf einer
 *      gedruckten Stabskarte. Kein Bruch in der Bildsprache – es ist
 *      dasselbe Zeichen wie die Schraffur der Fläche, nur ohne Fläche.
 *
 * Die Mindestgröße folgt der Mannschaftszahl: Fläche proportional zur Zahl,
 * also Durchmesser proportional zu ihrer Wurzel. Ein Korps von 25.000 bleibt
 * größer als eine Brigade von 3.000, auch wenn beide unter die Schranke
 * fallen. Das Kräfteverhältnis bleibt sichtbar, statt lesbar zu werden.
 */
const MIND_KLEIN = 17;
const MIND_GROSS = 46;
const ZEICHEN_OBEN = 30;
const ZEICHEN_UNTEN = 12;

/** Die erste Zahl aus einer Stärkeangabe: „ca. 24.000“ → 24000. */
function zahlAus(text) {
  if (!text) return 0;
  const m = String(text).replace(/\./g, '').match(/\d+/);
  return m ? Number(m[0]) : 0;
}

/** Musterkacheln je Farbe und Gattung – einmal angelegt, dann wiederverwendet. */
const MUSTER = new Map();
function musterFuer(ctx, farbe, gattung) {
  const g = GATTUNGEN[gattung] ?? GATTUNGEN.gemischt;
  if (!g.strich) return null;
  const schluessel = `${farbe}|${gattung}`;
  if (MUSTER.has(schluessel)) return MUSTER.get(schluessel);
  const d = g.abstand;
  const k = document.createElement('canvas');
  k.width = d;
  k.height = d;
  const c = k.getContext('2d');
  c.strokeStyle = mitAlpha(farbe, .55);
  c.fillStyle = mitAlpha(farbe, .55);
  c.lineWidth = 1;
  c.beginPath();
  if (g.strich === 'waagerecht') { c.moveTo(0, d / 2); c.lineTo(d, d / 2); }
  if (g.strich === 'schraeg') { c.moveTo(0, d); c.lineTo(d, 0); c.moveTo(-1, 1); c.lineTo(1, -1); }
  if (g.strich === 'kreuz') { c.moveTo(0, d); c.lineTo(d, 0); c.moveTo(0, 0); c.lineTo(d, d); }
  if (g.strich === 'welle') { c.moveTo(0, d * .7); c.quadraticCurveTo(d / 2, 0, d, d * .7); }
  if (g.strich === 'punkt') { c.arc(d / 2, d / 2, 1.1, 0, Math.PI * 2); c.fill(); }
  else c.stroke();
  const muster = ctx.createPattern(k, 'repeat');
  MUSTER.set(schluessel, muster);
  return muster;
}

/* ------------------------------------------------------------- Zeichenwerk */

/**
 * Eine Leinwand über der Karte, die es nur gibt, solange eine Schlacht läuft.
 *
 * Bewusst eine eigene Leinwand und keine Leaflet-Ebene aus Einzelformen: Die
 * Stellungen ändern sich bei laufender Schlacht in **jedem** Bild. Über
 * Leaflet-Ebenen hieße das, sechzig Mal in der Sekunde Objekte anzulegen,
 * zu projizieren und wieder wegzuwerfen. Hier wird stattdessen einmal je Bild
 * in Bildschirmkoordinaten gezeichnet – die Zahl der Formen liegt bei zwanzig,
 * das kostet nichts.
 */
const SchlachtLeinwand = L.Layer.extend({
  initialize(optionen) { L.setOptions(this, optionen); this._inhalt = null; },

  onAdd(map) {
    const c = this._leinwand = L.DomUtil.create('canvas', 'battle-canvas');
    c.style.pointerEvents = 'none';
    this._ctx = c.getContext('2d');
    map.getPane(this.options.pane).appendChild(c);
    map.on('move zoom viewreset resize zoomanim', this._stelleEin, this);
    this._stelleEin();
  },

  onRemove(map) {
    map.off('move zoom viewreset resize zoomanim', this._stelleEin, this);
    this._leinwand.remove();
  },

  /** Was gezeichnet werden soll – wird je Bild neu gesetzt. */
  setInhalt(inhalt) { this._inhalt = inhalt; this._zeichne(); },

  /**
   * Die Leinwand deckt genau das Fenster ab und wird bei jeder Bewegung
   * zurückgeschoben: Leaflet verschiebt die Ebene, wir zeichnen aber in
   * Bildschirmkoordinaten. Ohne das Zurückschieben wanderte sie mit.
   */
  _stelleEin() {
    const map = this._map;
    if (!map) return;
    const groesse = map.getSize();
    const c = this._leinwand;
    const dichte = Math.min(window.devicePixelRatio || 1, 2);
    if (c.width !== Math.round(groesse.x * dichte) || c.height !== Math.round(groesse.y * dichte)) {
      c.width = Math.round(groesse.x * dichte);
      c.height = Math.round(groesse.y * dichte);
      c.style.width = `${groesse.x}px`;
      c.style.height = `${groesse.y}px`;
    }
    this._dichte = dichte;
    L.DomUtil.setPosition(c, map.containerPointToLayerPoint([0, 0]));
    this._zeichne();
  },

  /** Von Längen-/Breitengrad auf Bildschirmpunkt. */
  _punkt(lonlat) {
    const p = this._map.latLngToContainerPoint([lonlat[1], lonlat[0]]);
    return [p.x, p.y];
  },

  _zeichne() {
    const ctx = this._ctx;
    if (!ctx || !this._map) return;
    const c = this._leinwand;
    ctx.setTransform(this._dichte, 0, 0, this._dichte, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    const inhalt = this._inhalt;
    if (!inhalt) return;
    const groesse = this._map.getSize();

    this._buehne(ctx, groesse, inhalt);
    if (inhalt.ziel) { this._zielmarke(ctx, inhalt.ziel); return; }
    for (const g of inhalt.gelaende ?? []) this._gelaende(ctx, g);
    // Die Bildschirmlage einmal je Körper und Bild: Körper und Fähnchen
    // müssen dieselbe Größe sehen, sonst legt sich die Beschriftung auf einen
    // Verband, den sie für kleiner hält, als er gezeichnet wird.
    for (const k of inhalt.koerper ?? []) k._lage = this._lage(k);
    for (const k of inhalt.koerper ?? []) this._koerper(ctx, k);
    this._pfeilPlaetze = [];
    for (const p of inhalt.pfeile ?? []) this._pfeil(ctx, p);
    // Erst die Verbände beschriften, dann das Gelände: Wo beides um denselben
    // Platz streitet, gewinnt die Truppe – sie ist die Aussage, der Flurname
    // ist der Hintergrund.
    const belegt = this._beschriftungen(
      ctx, inhalt.koerper ?? [], [...(this._pfeilPlaetze ?? []), ...(inhalt.sperren ?? [])],
    );
    for (const g of inhalt.gelaende ?? []) this._gelaendeName(ctx, g, belegt);
  },

  /**
   * Die Bühne: alles außerhalb des Schlachtfelds tritt zurück.
   *
   * Bei Zoomstufe 12 ist die Staatenkarte eine einzige Fläche bis zum
   * Bildrand. Das Auge findet darin keinen Halt und weiß nicht, wo die
   * Schlacht anfängt und wo bloß noch Landschaft ist. Ein weicher Schatten von
   * außen nach innen setzt das Feld in einen Rahmen – dasselbe, was ein
   * Kartograf mit einem angedeuteten Blattrand macht.
   */
  _buehne(ctx, groesse, inhalt) {
    const a = inhalt.buehne ?? 1;
    if (a <= 0) return;
    const r = Math.hypot(groesse.x, groesse.y) / 2;
    const g = ctx.createRadialGradient(
      groesse.x / 2, groesse.y / 2, r * .34,
      groesse.x / 2, groesse.y / 2, r,
    );
    g.addColorStop(0, 'rgba(6,9,15,0)');
    g.addColorStop(.55, `rgba(6,9,15,${(.26 * a).toFixed(3)})`);
    g.addColorStop(1, `rgba(4,6,11,${(.62 * a).toFixed(3)})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, groesse.x, groesse.y);
  },

  /**
   * Die Zielmarke des Anflugs: ein Ring, der pulst, bis die Karte steht.
   *
   * Ohne sie fliegt die Karte auf eine Stelle zu, die sich in nichts vom
   * Umland unterscheidet, und man weiß erst nach der Landung, wohin man
   * eigentlich gesehen hat.
   */
  _zielmarke(ctx, lonlat) {
    const [x, y] = this._punkt(lonlat);
    const t = (performance.now() % 1600) / 1600;
    ctx.save();
    for (let i = 0; i < 2; i++) {
      const f = (t + i * .5) % 1;
      ctx.globalAlpha = (1 - f) * .55;
      ctx.beginPath();
      ctx.arc(x, y, 10 + f * 34, 0, Math.PI * 2);
      ctx.strokeStyle = '#e9c46a';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
    ctx.globalAlpha = .95;
    ctx.beginPath();
    ctx.arc(x, y, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#e9c46a';
    ctx.fill();
    ctx.restore();
  },

  _gelaende(ctx, g) {
    const art = GELAENDE[g.art] ?? GELAENDE.hoehe;
    const p = g.punkte.map((q) => this._punkt(q));
    if (p.length < 2) return;
    ctx.save();
    ctx.globalAlpha = (g.deckung ?? 1) * (this._inhalt.gelaendeDeckung ?? 1);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    if (art.linie) { this._gelaendeLinie(ctx, art, p); ctx.restore(); return; }

    ctx.beginPath();
    weicherWeg(ctx, p, GELAENDE_SPANNUNG);
    if (art.flaeche) {
      ctx.fillStyle = mitAlpha(art.flaeche, art.deckung ?? .25);
      ctx.fill();
    }
    if (art.muster) this._gelaendeMuster(ctx, art, p);
    if (art.kante) {
      ctx.beginPath();
      weicherWeg(ctx, p, GELAENDE_SPANNUNG);
      ctx.strokeStyle = mitAlpha(art.farbe, .55);
      ctx.lineWidth = art.kante;
      ctx.stroke();
    }
    // Ein Höhenzug bekommt eine Böschungsschraffur: kurze Striche senkrecht
    // zur Kante, nach innen gerichtet. Das ist das Zeichen für „hier geht es
    // hinauf" – konzentrische Ringe sahen aus wie zufällige Schlingen und
    // sagten nichts über die Richtung des Hanges.
    if (art.schraffur) {
      let mx = 0;
      let my = 0;
      for (const q of p) { mx += q[0]; my += q[1]; }
      mx /= p.length;
      my /= p.length;
      ctx.strokeStyle = mitAlpha(art.farbe, .6);
      ctx.lineWidth = 1.1;
      for (let i = 0; i < p.length; i++) {
        const a = p[i];
        const b = p[(i + 1) % p.length];
        const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const n = Math.max(1, Math.round(d / 13));
        for (let k = 0; k < n; k++) {
          const t = (k + .5) / n;
          const x = a[0] + (b[0] - a[0]) * t;
          const y = a[1] + (b[1] - a[1]) * t;
          // Nach innen zeigen, Länge abwechselnd – wie im Kartenwerk üblich.
          let ux = mx - x;
          let uy = my - y;
          const l = Math.hypot(ux, uy) || 1;
          ux /= l;
          uy /= l;
          const laenge = k % 2 ? 4 : 7;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + ux * laenge, y + uy * laenge);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  },

  _gelaendeLinie(ctx, art, p) {
    ctx.beginPath();
    weicheLinie(ctx, p, GELAENDE_SPANNUNG);
    if (art.gestrichelt) ctx.setLineDash([7, 6]);
    if (art.doppelt) {
      // Ein Weg ist auf jeder Stabskarte eine doppelte Linie: heller Kern
      // zwischen zwei dunklen Rändern.
      ctx.strokeStyle = 'rgba(24,20,14,.55)';
      ctx.lineWidth = art.breite + 2.4;
      ctx.stroke();
      ctx.strokeStyle = mitAlpha(art.farbe, .95);
      ctx.lineWidth = art.breite;
      ctx.stroke();
      return;
    }
    ctx.strokeStyle = mitAlpha(art.farbe, .24);
    ctx.lineWidth = art.breite * 2.6;
    ctx.stroke();
    ctx.strokeStyle = mitAlpha(art.farbe, .9);
    ctx.lineWidth = art.breite;
    ctx.stroke();
    if (art.ader) {
      ctx.strokeStyle = mitAlpha('#cfe6ff', .5);
      ctx.lineWidth = Math.max(1, art.breite * .3);
      ctx.stroke();
    }
    // Ein Windpfeil bekommt Federn am hinteren Ende und eine Spitze vorn –
    // das Zeichen für Windrichtung auf jeder Seekarte.
    if (art.feder) {
      const [ax, ay] = p[0];
      const [bx, by] = p.at(-1);
      const d = Math.hypot(bx - ax, by - ay) || 1;
      const ux = (bx - ax) / d;
      const uy = (by - ay) / d;
      const sx = -uy;
      const sy = ux;
      ctx.strokeStyle = mitAlpha(art.farbe, .9);
      ctx.lineWidth = 1.6;
      for (let k = 0; k < 4; k++) {
        const t = .06 + k * .085;
        const x = ax + (bx - ax) * t;
        const y = ay + (by - ay) * t;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (sx - ux) * 9, y + (sy - uy) * 9);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx - ux * 12 + sx * 5, by - uy * 12 + sy * 5);
      ctx.lineTo(bx - ux * 12 - sx * 5, by - uy * 12 - sy * 5);
      ctx.closePath();
      ctx.fillStyle = mitAlpha(art.farbe, .9);
      ctx.fill();
    }

    // Eine Mauer bekommt Zinnen: kurze Striche quer zur Linie.
    if (art.zinnen) {
      ctx.strokeStyle = mitAlpha(art.farbe, .85);
      ctx.lineWidth = 1.6;
      for (let i = 0; i < p.length - 1; i++) {
        const [x1, y1] = p[i];
        const [x2, y2] = p[i + 1];
        const d = Math.hypot(x2 - x1, y2 - y1);
        const n = Math.max(1, Math.round(d / 11));
        for (let k = 0; k < n; k++) {
          const t = (k + .5) / n;
          const x = x1 + (x2 - x1) * t;
          const y = y1 + (y2 - y1) * t;
          const ux = -(y2 - y1) / d;
          const uy = (x2 - x1) / d;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + ux * 4.5, y + uy * 4.5);
          ctx.stroke();
        }
      }
    }
  },

  /** Körnung innerhalb einer Geländefläche – Wald, Sumpf, Baublöcke. */
  _gelaendeMuster(ctx, art, p) {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const [x, y] of p) {
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    if (x1 - x0 > 900 || y1 - y0 > 900) return;
    ctx.save();
    ctx.beginPath();
    weicherWeg(ctx, p, GELAENDE_SPANNUNG);
    ctx.clip();
    ctx.strokeStyle = mitAlpha(art.farbe, .55);
    ctx.fillStyle = mitAlpha(art.farbe, .5);
    ctx.lineWidth = 1;
    const d = art.muster === 'stadt' ? 9 : 11;
    for (let y = y0; y < y1 + d; y += d) {
      for (let x = x0 + ((Math.round(y / d) % 2) * d) / 2; x < x1 + d; x += d) {
        ctx.beginPath();
        if (art.muster === 'wald') {
          // Ein Kringel mit Stiel – das übliche Waldzeichen.
          ctx.arc(x, y - 1, 2.1, 0, Math.PI * 2);
          ctx.fill();
        } else if (art.muster === 'sumpf') {
          ctx.moveTo(x - 3, y);
          ctx.lineTo(x + 3, y);
          ctx.moveTo(x - 1.8, y + 2.4);
          ctx.lineTo(x + 1.8, y + 2.4);
          ctx.stroke();
        } else if (art.muster === 'stadt') {
          ctx.fillRect(x - 2.2, y - 2.2, 4.4, 4.4);
        }
      }
    }
    ctx.restore();
  },

  /** Ortsnamen und Flurnamen – klein, kursiv, wie auf einer Meßtischkarte. */
  _gelaendeName(ctx, g, belegt = []) {
    if (!g.name) return;
    const p = g.punkte.map((q) => this._punkt(q));
    let x = 0;
    let y = 0;
    for (const q of p) { x += q[0]; y += q[1]; }
    x /= p.length;
    y /= p.length;
    const art = GELAENDE[g.art] ?? GELAENDE.hoehe;
    ctx.font = 'italic 500 10.5px ui-serif, Georgia, serif';
    const w = ctx.measureText(g.name).width + 6;
    const platz = [[x, y], [x, y - 15], [x, y + 15], [x - w * .7, y], [x + w * .7, y]]
      .find(([px, py]) => !belegt.some(
        (b) => Math.abs(b.x - px) < (b.w + w) / 2 + 4 && Math.abs(b.y - py) < (b.h + 14) / 2 + 3,
      ));
    if (!platz) return;
    [x, y] = platz;
    belegt.push({ x, y, w, h: 14 });
    ctx.save();
    ctx.globalAlpha = .95 * (this._inhalt.gelaendeDeckung ?? 1);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'italic 500 10.5px ui-serif, Georgia, serif';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(8,12,20,.8)';
    ctx.lineWidth = 3;
    ctx.strokeText(g.name, x, y);
    ctx.fillStyle = mitAlpha(art.farbe, .95);
    ctx.fillText(g.name, x, y);
    ctx.restore();
  },

  /**
   * Ein Truppenkörper.
   *
   * Drei Lagen: eine gedeckte Grundfarbe, darüber die Schraffur der
   * Waffengattung, darüber eine klare Kante. Die Grundfarbe allein ergäbe
   * einen Fleck; erst die Schraffur macht daraus etwas, das aussieht, als
   * stünde jemand darin.
   */
  /**
   * Die Bildschirmlage eines Körpers: Umriss, Mitte, Ausdehnung – und wie
   * weit er schon Zeichen statt Fläche ist.
   *
   * Gewachsen wird um den Schwerpunkt, damit ein Verband dort stehen bleibt,
   * wo er steht. Der Anteil `zeichen` hängt an der **wahren** Größe, nicht an
   * der gewachsenen: Sonst hinge er an seinem eigenen Ergebnis.
   */
  _lage(k) {
    const roh = k.punkte.map((q) => this._punkt(q));
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    let sx = 0;
    let sy = 0;
    for (const [x, y] of roh) {
      sx += x;
      sy += y;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    const cx = sx / roh.length;
    const cy = sy / roh.length;
    const quer = Math.max(x1 - x0, y1 - y0);
    const mind = k.mindest ?? MIND_KLEIN;
    const wuchs = quer > 1e-6 && quer < mind ? mind / quer : 1;
    const p = wuchs === 1 ? roh
      : roh.map(([x, y]) => [cx + (x - cx) * wuchs, cy + (y - cy) * wuchs]);
    const zeichen = weich(
      1 - klemm((quer - ZEICHEN_UNTEN) / (ZEICHEN_OBEN - ZEICHEN_UNTEN), 0, 1),
    );
    return {
      p,
      cx,
      cy,
      quer,
      zeichen,
      breite: mind,
      hoehe: mind * .62,
      rx: Math.max((x1 - x0) * wuchs, zeichen > .5 ? mind : 0) / 2,
      ry: Math.max((y1 - y0) * wuchs, zeichen > .5 ? mind * .62 : 0) / 2,
    };
  },

  /**
   * Das Truppenzeichen: ein Rechteck mit dem Zeichen der Waffengattung.
   *
   * Bewusst dasselbe Zeichen wie die Schraffur der Fläche – Kreuz für Bogen,
   * Schrägstrich für Reiterei, Punkt für Geschütze. Wer die Zeichenerklärung
   * einmal gelesen hat, liest beides ohne zweites Nachschlagen.
   */
  _zeichen(ctx, k, l) {
    const w = l.breite;
    const h = l.hoehe;
    const x = l.cx - w / 2;
    const y = l.cy - h / 2;
    ctx.save();
    ctx.globalAlpha = k.deckung * l.zeichen;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 2);
    ctx.shadowColor = 'rgba(0,0,0,.5)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = mitAlpha(k.farbe, k.geschlagen ? .24 : .4);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = mitAlpha(k.farbe, k.geschlagen ? .7 : 1);
    ctx.lineWidth = k.geschlagen ? 1.2 : 1.8;
    if (k.geschlagen) ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    const strich = (GATTUNGEN[k.gattung] ?? GATTUNGEN.gemischt).strich;
    const ix = x + w * .18;
    const iy = y + h * .2;
    const iw = w * .64;
    const ih = h * .6;
    ctx.strokeStyle = mitAlpha(k.farbe, .95);
    ctx.fillStyle = mitAlpha(k.farbe, .95);
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    if (strich === 'waagerecht') {
      ctx.moveTo(ix, iy + ih * .3);
      ctx.lineTo(ix + iw, iy + ih * .3);
      ctx.moveTo(ix, iy + ih * .7);
      ctx.lineTo(ix + iw, iy + ih * .7);
      ctx.stroke();
    } else if (strich === 'kreuz') {
      ctx.moveTo(ix, iy);
      ctx.lineTo(ix + iw, iy + ih);
      ctx.moveTo(ix + iw, iy);
      ctx.lineTo(ix, iy + ih);
      ctx.stroke();
    } else if (strich === 'schraeg') {
      ctx.moveTo(ix, iy + ih);
      ctx.lineTo(ix + iw, iy);
      ctx.stroke();
    } else if (strich === 'welle') {
      ctx.moveTo(ix, iy + ih * .7);
      ctx.quadraticCurveTo(ix + iw / 2, iy - ih * .1, ix + iw, iy + ih * .7);
      ctx.stroke();
    } else if (strich === 'punkt') {
      ctx.arc(l.cx, l.cy, Math.min(h, w) * .18, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },

  _koerper(ctx, k) {
    const l = k._lage ?? this._lage(k);
    const p = l.p;
    if (p.length < 3) return;
    if (l.zeichen > .995) { this._zeichen(ctx, k, l); return; }
    ctx.save();
    ctx.globalAlpha = k.deckung * (1 - l.zeichen);

    ctx.beginPath();
    weicherWeg(ctx, p);
    ctx.shadowColor = 'rgba(0,0,0,.55)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = mitAlpha(k.farbe, k.geschlagen ? .2 : .34);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    const muster = musterFuer(ctx, k.farbe, k.gattung);
    if (muster) {
      ctx.save();
      ctx.beginPath();
      weicherWeg(ctx, p);
      ctx.clip();
      ctx.globalAlpha = k.deckung * (1 - l.zeichen) * (k.geschlagen ? .4 : .85);
      ctx.fillStyle = muster;
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = k.deckung * (1 - l.zeichen);
    }

    ctx.beginPath();
    weicherWeg(ctx, p);
    ctx.strokeStyle = k.geschlagen ? mitAlpha(k.farbe, .7) : mitAlpha(k.farbe, 1);
    ctx.lineWidth = k.geschlagen ? 1.4 : 2.6;
    ctx.lineJoin = 'round';
    if (k.geschlagen) ctx.setLineDash([5, 4]);
    ctx.stroke();
    ctx.restore();
    // Der Übergang: Beides liegt übereinander, das eine kommt, das andere
    // geht. Ein harter Wechsel wäre ein Zucken beim Zoomen.
    if (l.zeichen > .005) this._zeichen(ctx, k, l);
  },

  /**
   * Ein Pfeil, der sich zeichnet – in drei Ausführungen.
   *
   * `k.fortschritt` läuft von 0 bis 1: Der Schaft wächst von hinten nach
   * vorn, die Spitze setzt erst im letzten Viertel auf. Ein Pfeil, der als
   * Ganzes erscheint, zeigt eine Richtung; ein Pfeil, der sich zeichnet,
   * zeigt eine Bewegung.
   *
   * Angriff bekommt eine volle Spitze, Rückzug eine gestrichelte Linie mit
   * offener Spitze, eine Finte eine gepunktete. Die Unterscheidung ist nicht
   * Zierrat: Bei Hastings ist der Unterschied zwischen Flucht und
   * Scheinflucht die ganze Schlacht.
   */
  _pfeil(ctx, a) {
    const p = a.punkte.map((q) => this._punkt(q));
    if (p.length < 2) return;
    const f = klemm(a.fortschritt, 0, 1);
    if (f <= 0) return;

    const stuecke = [];
    let laenge = 0;
    for (let i = 1; i < p.length; i++) {
      const d = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
      stuecke.push(d);
      laenge += d;
    }
    if (laenge < 1) return;

    const spitzeGross = klemm(laenge * .2, 10, 30);
    const schaftZiel = laenge - spitzeGross * .8;
    const bis = klemm(f / .78, 0, 1) * schaftZiel;

    const weg = [p[0]];
    let gelaufen = 0;
    let richtung = [1, 0];
    for (let i = 0; i < stuecke.length; i++) {
      const d = stuecke[i];
      if (gelaufen + d < bis) {
        weg.push(p[i + 1]);
        gelaufen += d;
        continue;
      }
      const rest = (bis - gelaufen) / d;
      const x = p[i][0] + (p[i + 1][0] - p[i][0]) * rest;
      const y = p[i][1] + (p[i + 1][1] - p[i][1]) * rest;
      weg.push([x, y]);
      richtung = [(p[i + 1][0] - p[i][0]) / d, (p[i + 1][1] - p[i][1]) / d];
      break;
    }

    const breit = a.rueckzug ? 2.6 : a.finte ? 2.2 : 4;
    ctx.save();
    ctx.globalAlpha = a.deckung;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Dunkler Grund unter dem Pfeil: Über einer Truppenfläche derselben Farbe
    // wäre er sonst nicht zu sehen.
    ctx.beginPath();
    weicheLinie(ctx, weg);
    ctx.strokeStyle = 'rgba(6,9,15,.55)';
    ctx.lineWidth = breit + 3.4;
    ctx.stroke();

    ctx.beginPath();
    weicheLinie(ctx, weg);
    if (a.rueckzug) ctx.setLineDash([9, 6]);
    if (a.finte) ctx.setLineDash([2.5, 4]);
    ctx.strokeStyle = mitAlpha(a.farbe, 1);
    ctx.lineWidth = breit;
    ctx.stroke();
    ctx.setLineDash([]);

    const spitzeF = klemm((f - .72) / .28, 0, 1);
    if (spitzeF > 0) {
      const [ux, uy] = richtung;
      const s = spitzeGross * (.45 + .55 * spitzeF);
      const ende = weg.at(-1);
      const seite = [-uy, ux];
      const spitze = [ende[0] + ux * s * .5, ende[1] + uy * s * .5];
      const l = [ende[0] - ux * s * .42 + seite[0] * s * .4, ende[1] - uy * s * .42 + seite[1] * s * .4];
      const r = [ende[0] - ux * s * .42 - seite[0] * s * .4, ende[1] - uy * s * .42 - seite[1] * s * .4];
      ctx.beginPath();
      ctx.moveTo(...spitze);
      ctx.lineTo(...l);
      ctx.lineTo(...r);
      ctx.closePath();
      if (a.rueckzug) {
        // Offene Spitze: ein Rückzug ist kein Stoß.
        ctx.strokeStyle = mitAlpha(a.farbe, 1);
        ctx.lineWidth = 2.2;
        ctx.stroke();
      } else {
        ctx.strokeStyle = 'rgba(6,9,15,.55)';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = mitAlpha(a.farbe, 1);
        ctx.fill();
      }
    }

    if (a.name && f > .5) {
      const mitte = weg[Math.floor(weg.length / 2)] ?? weg[0];
      ctx.globalAlpha = a.deckung * klemm((f - .5) * 3, 0, 1);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '600 10.5px ui-sans-serif, system-ui, sans-serif';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(6,9,15,.9)';
      ctx.lineWidth = 3.5;
      ctx.strokeText(a.name, mitte[0], mitte[1] - 11);
      ctx.fillStyle = '#eef2f8';
      ctx.fillText(a.name, mitte[0], mitte[1] - 11);
      this._pfeilPlaetze?.push({
        x: mitte[0], y: mitte[1] - 11, w: ctx.measureText(a.name).width + 6, h: 14,
      });
    }
    ctx.restore();
  },

  /**
   * Verband und Stärke als Fähnchen mit Zeigerlinie.
   *
   * Text mitten auf der Fläche verdeckt die Schraffur und wird bei zwei
   * benachbarten Verbänden sofort unlesbar. Ein Fähnchen daneben, mit einer
   * dünnen Linie zum Körper, ist das, was auf jeder gedruckten Stabskarte
   * steht – und es lässt sich verschieben, wenn der Platz belegt ist.
   *
   * Die größte Fläche schreibt zuerst; wer keinen freien Platz findet,
   * entfällt. Lieber ein Name weniger als zwei übereinander.
   */
  _beschriftungen(ctx, koerper, vorbelegt = []) {
    const belegt = [...vorbelegt];
    this._entfallen = 0;
    const frei = (x, y, w, h) => !belegt.some(
      (b) => Math.abs(b.x - x) < (b.w + w) / 2 + 5 && Math.abs(b.y - y) < (b.h + h) / 2 + 4,
    );

    const mit = koerper
      .filter((k) => k.name && k.deckung >= .4)
      .map((k) => {
        const l = k._lage ?? this._lage(k);
        return {
          k, x: l.cx, y: l.cy, rx: l.rx, ry: l.ry, gross: l.rx * l.ry,
        };
      })
      .sort((a, b) => b.gross - a.gross);

    ctx.save();
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    for (const { k, x, y, rx, ry } of mit) {
      /* Drei Fassungen desselben Fähnchens, von voll bis knapp.
       *
       * Vorher entfiel ein Name, sobald kein Platz mehr war – und ein
       * unbeschrifteter Verband sieht nicht nach fehlendem Platz aus, sondern
       * nach einem Verband, den niemand für nennenswert hielt. Jetzt fällt
       * erst die Stärkeangabe, dann der Beiname („II. Korps · Reille“ wird zu
       * „II. Korps“); erst wenn auch das nirgends hinpasst, entfällt er. */
      const kurz = k.name.split('·')[0].trim();
      const fassungen = [
        { name: k.name, staerke: k.staerke },
        { name: k.name, staerke: '' },
      ];
      if (kurz && kurz !== k.name) fassungen.push({ name: kurz, staerke: '' });

      let gewaehlt = null;
      for (const f of fassungen) {
        ctx.font = '600 11.5px ui-sans-serif, system-ui, sans-serif';
        const wName = ctx.measureText(f.name).width;
        ctx.font = '500 10px ui-sans-serif, system-ui, sans-serif';
        const wZahl = f.staerke ? ctx.measureText(f.staerke).width : 0;
        const w = Math.max(wName, wZahl) + 14;
        const h = f.staerke ? 30 : 19;

        // Erst innen, dann in vier Richtungen nach außen ausweichen.
        const ax = Math.max(rx + w / 2 + 6, 26);
        const ay = Math.max(ry + h / 2 + 6, 20);
        const plaetze = [
          [x, y, false], [x, y - ay, true], [x, y + ay, true],
          [x + ax, y, true], [x - ax, y, true],
          [x + ax * .8, y - ay * .8, true], [x - ax * .8, y + ay * .8, true],
        ];
        const platz = plaetze.find(([px, py]) => frei(px, py, w, h));
        if (platz) { gewaehlt = { ...f, w, h, platz }; break; }
      }
      if (!gewaehlt) { this._entfallen = (this._entfallen ?? 0) + 1; continue; }
      const { w, h } = gewaehlt;
      const [px, py, zeiger] = gewaehlt.platz;
      belegt.push({ x: px, y: py, w, h });

      ctx.globalAlpha = klemm((k.deckung - .3) / .5, 0, 1);
      if (zeiger) {
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(x, y);
        ctx.strokeStyle = mitAlpha(k.farbe, .6);
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fillStyle = mitAlpha(k.farbe, .9);
        ctx.fill();
      }

      // Das Fähnchen selbst: dunkle Tafel mit farbigem Balken links.
      const l = px - w / 2;
      const o = py - h / 2;
      ctx.beginPath();
      ctx.roundRect(l, o, w, h, 3);
      ctx.fillStyle = 'rgba(10,14,22,.82)';
      ctx.fill();
      ctx.strokeStyle = mitAlpha(k.farbe, .8);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.roundRect(l, o, 3, h, [3, 0, 0, 3]);
      ctx.fillStyle = mitAlpha(k.farbe, 1);
      ctx.fill();

      ctx.textAlign = 'center';
      ctx.font = '600 11.5px ui-sans-serif, system-ui, sans-serif';
      ctx.fillStyle = '#f0f4fa';
      ctx.fillText(gewaehlt.name, px + 1.5, gewaehlt.staerke ? o + 11 : py);
      if (gewaehlt.staerke) {
        ctx.font = '500 10px ui-sans-serif, system-ui, sans-serif';
        ctx.fillStyle = mitAlpha(k.farbe, .95);
        ctx.fillText(gewaehlt.staerke, px + 1.5, o + 22);
      }
    }
    ctx.restore();
    return belegt;
  },
});

/* ---------------------------------------------------------------- Abspieler */

export class BattlePlayer {
  /**
   * @param {object} atlas
   * @param {{onStation?: Function, onTick?: Function, onKamera?: Function,
   *          rand?: Function}} rueckruf
   *   `onStation` bei Stationswechsel und beim Anhalten – die Tafel wird neu
   *   geschrieben. `onTick` in jedem Bild – nur der Schieber wandert.
   *   `onKamera` sagt, ob die Karte gerade von Hand geführt wird.
   *   `rand` liefert, wie weit Tafel, Zeichenerklärung und Beiblatt ins Bild
   *   ragen – der Ausschnitt wird in das freie Feld gelegt, nicht unter die
   *   Tafel.
   */
  constructor(atlas, { onStation, onTick, onKamera, rand } = {}) {
    this.atlas = atlas;
    this.onStation = onStation ?? (() => {});
    this.onTick = onTick ?? (() => {});
    this.onKamera = onKamera ?? (() => {});
    this.randGeber = rand ?? null;
    this.battle = null;
    this.zeit = 0;
    this.playing = false;
    this._rahmen = null;
    this._zuletzt = 0;
    this._station = 0;
    /** Wie lange ein Stationsfenster beim Abspielen dauert. */
    this.dauer = 6200;
    /** Lage, auf die zuletzt nachgefahren wurde – Bezug für die Schwelle. */
    this._sicht = null;
    this._sichtSchluessel = null;
    /** Solange wahr, führt der Betrachter die Karte selbst. */
    this._frei = false;
    /** Solange wahr, wird nicht nachgefahren (Ziehen am Schieber). */
    this._halt = false;
    this._flugBis = 0;
    this._eingriff = () => {
      // Eigene Flüge lösen dasselbe Ereignis aus – sie zählen nicht als
      // Eingriff, sonst gäbe die Karte nach dem ersten Nachfahren auf.
      if (this._anflug || performance.now() < this._flugBis) return;
      if (this._frei || !this.battle) return;
      this._frei = true;
      this.onKamera(true);
    };

    const pane = atlas.map.createPane('battle');
    pane.style.zIndex = '258';
    pane.style.pointerEvents = 'none';
    this.leinwand = new SchlachtLeinwand({ pane: 'battle' });
  }

  get count() { return this.battle?.stationen.length ?? 0; }
  get index() { return this._station; }
  get station() { return this.battle?.stationen[this._station] ?? null; }

  /** Zeitspanne der ganzen Schlacht in den Einheiten der Daten. */
  get spanne() {
    const st = this.battle?.stationen;
    if (!st?.length) return [0, 1];
    return [st[0].t, st.at(-1).t];
  }

  /** Fortschritt von 0 bis 1 über die ganze Schlacht – für den Schieber. */
  get fortschritt() {
    const [a, b] = this.spanne;
    return b > a ? klemm((this.zeit - a) / (b - a), 0, 1) : 0;
  }

  /**
   * Schlacht öffnen – mit Anflug statt Sprung.
   *
   * Die Karte stand bisher augenblicklich auf dem Schlachtfeld. Bei
   * Zoomstufe 13 sieht man dort eine einfarbige Fläche mit ein paar Formen
   * darauf und weiß nicht, wo auf der Welt man gelandet ist. Deshalb erst
   * die Region – „hier, südlich von Brüssel“ –, kurz halten, dann hinein.
   * Vier Sekunden, in denen man die Frage „wo ist das?“ beantwortet bekommt,
   * bevor die Frage „was geschah dort?“ überhaupt gestellt wird.
   *
   * Der Verlauf beginnt erst nach der Landung: `danach` wird gerufen, wenn
   * die Karte steht.
   */
  start(id, { danach } = {}) {
    const battle = BATTLES.find((b) => b.id === id);
    if (!battle) return null;
    this.battle = battle;
    this.farben = new Map(battle.parteien.map((p) => [p.id, p.farbe]));
    /* Der stärkste Verband der Schlacht gibt den Bezug für die Mindestgröße.
       Absolut ginge nicht: 25.000 Mann sind bei Waterloo ein Korps und bei
       Hastings die ganze Armee. */
    this._bezug = 1;
    for (const s of battle.stationen) {
      for (const st of s.stellungen) {
        const z = zahlAus(st.staerke);
        if (z > this._bezug) this._bezug = z;
      }
    }
    this._vorrat = new Map();
    this.zeit = battle.stationen[0].t;
    this._station = 0;
    if (!this.leinwand._map) this.leinwand.addTo(this.atlas.map);

    const map = this.atlas.map;
    const ziel = [battle.mitte[1], battle.mitte[0]];
    // Weit genug, dass Küste und Nachbarschaft im Bild sind, aber nicht so
    // weit, dass der Ort selbst verschwindet.
    const weit = klemm(battle.zoom - 4.6, 3.4, battle.zoom - 1.5);

    /* Die Weltkarte hört bei Stufe 10 auf – darüber hat sie nichts mehr zu
       zeigen. Ein Schlachtfeld schon: Waterloo steht auf 13. Die Grenze wird
       deshalb für die Dauer der Schlacht angehoben. Ohne das riss der erste
       eigene Zoomschritt die Karte von Stufe 13 auf 10 zurück – ein Sprung
       über drei Stufen, ausgelöst von einer Radraste. */
    if (this._maxAlt === undefined) this._maxAlt = map.options.maxZoom;
    map.setMaxZoom(Math.max(this._maxAlt ?? 10, battle.zoom + 2));

    this._frei = false;
    this._halt = false;
    this._sicht = null;
    this._sichtSchluessel = null;
    this._rand = null;
    this.onKamera(false);
    map.off('dragstart', this._eingriff);
    map.off('zoomstart', this._eingriff);
    map.on('dragstart', this._eingriff);
    map.on('zoomstart', this._eingriff);

    clearTimeout(this._anflugTimer);
    this._anflug = true;
    this._auf = performance.now() + ANFLUG_HALT + ANFLUG_EIN;
    this._bild();

    map.flyTo(ziel, weit, { duration: 1.3 });
    const pulsen = () => {
      if (!this._anflug) return;
      this._bild();
      this._pulsRahmen = requestAnimationFrame(pulsen);
    };
    pulsen();
    this._anflugTimer = window.setTimeout(() => {
      // Der Anflug landet nicht auf dem gesetzten Maßstab, sondern gleich auf
      // dem Rahmen der ersten Station: Sonst stünde die Karte einen Wimpernschlag
      // still und führe dann noch einmal – ein Ruck ohne Anlass.
      const erste = this._rahmenFuer(0);
      const lage = erste ? this._lageFuer(erste) : { mitte: ziel, zoom: battle.zoom };
      this._sicht = erste ? lage : null;
      this._sichtSchluessel = '0|0';
      map.flyTo(lage.mitte, lage.zoom, { duration: ANFLUG_EIN / 1000 });
      this._anflugTimer = window.setTimeout(() => {
        this._anflug = false;
        cancelAnimationFrame(this._pulsRahmen);
        this._bild();
        danach?.();
      }, ANFLUG_EIN);
    }, ANFLUG_HALT);

    this.onStation(this);
    return battle;
  }

  /** Wo die Karte beim Anflug steht – für die Beiblatt-Karte. */
  get imAnflug() { return !!this._anflug; }

  /* ------------------------------------------------------- Ausschnitt */

  /** Wahr, solange der Betrachter die Karte selbst führt. */
  get kameraFrei() { return !!this._frei; }

  /**
   * Nachfahren aussetzen – solange am Schieber gezogen wird.
   *
   * Wer am Schieber zieht, sucht eine Stelle im Verlauf und schaut dabei auf
   * die Truppen. Führe die Karte bei jedem Zwischenwert mit, wäre das ein
   * Ritt über die halbe Provinz. Sie steht deshalb still und holt erst beim
   * Loslassen nach.
   */
  setKameraHalt(an) {
    this._halt = !!an;
    if (!an) this._folge(true);
  }

  /** Die Führung zurückgeben: Die Karte nimmt den Faden wieder auf. */
  folgeWieder() {
    if (!this._frei) return;
    this._frei = false;
    this.onKamera(false);
    // Die Karte steht jetzt irgendwo – der alte Bezug taugt nicht mehr.
    this._sicht = null;
    this._sichtSchluessel = null;
    this._folge(true);
  }

  /**
   * Der Rahmen einer Station: was in ihr steht, mit etwas Luft darum.
   *
   * Gerechnet aus den Stellungen **und** den Pfeilen – ein Anmarschpfeil sagt,
   * wohin der Blick als Nächstes gehört. Wo die Rechnung schiefliegt, weil
   * eine Station nur ein Fähnchen enthält oder ein Pfeil weit über das Feld
   * hinausweist, steht in den Daten ein `sicht`-Rahmen als Handkorrektur.
   */
  _rahmenFuer(i) {
    const s = this.battle?.stationen[i];
    if (!s) return null;
    if (s.sicht) {
      const [[a, b], [c, d]] = s.sicht;
      const r = [[Math.min(a, c), Math.min(b, d)], [Math.max(a, c), Math.max(b, d)]];
      r.hand = true;
      return r;
    }
    let wl = Infinity;
    let sl = Infinity;
    let el = -Infinity;
    let nl = -Infinity;
    for (const st of s.stellungen) {
      for (const [x, y] of st.punkte) {
        if (x < wl) wl = x;
        if (x > el) el = x;
        if (y < sl) sl = y;
        if (y > nl) nl = y;
      }
    }
    if (!Number.isFinite(wl)) return null;
    // Etwas Luft: Ein Rahmen, der die Umrisse berührt, sieht abgeschnitten aus.
    const dx = Math.max((el - wl) * .12, 1e-4);
    const dy = Math.max((nl - sl) * .12, 1e-4);
    return [[wl - dx, sl - dy], [el + dx, nl + dy]];
  }

  /**
   * Welcher Rahmen jetzt gilt: der der laufenden Station – und ab der Mitte
   * des Fensters der der nächsten, denn dorthin gleiten die Truppen gerade.
   */
  _sichtZiel() {
    const i = this._station;
    const weiter = this._teil() >= ZUG_AB && i < this.count - 1;
    return this._rahmenFuer(weiter ? i + 1 : i) ?? this._rahmenFuer(i);
  }

  /** Wie weit Tafel und Beiblatt ins Bild ragen, höchstens alle 400 ms neu. */
  _randHolen() {
    const jetzt = performance.now();
    if (this._rand && jetzt - this._randZeit < 400) return this._rand;
    const r = this.randGeber?.() ?? null;
    this._rand = {
      l: r?.l || 0, r: r?.r || 0, o: r?.o || 0, u: r?.u || 0,
    };
    this._randZeit = jetzt;
    return this._rand;
  }

  /**
   * Kartenlage, die einen Rahmen mittig ins **freie** Feld legt.
   *
   * Die Tafel liegt über der Karte, nicht daneben. Zentriert man stumpf auf
   * das Kartenfenster, steht ein Drittel der Schlacht hinter der Tafel. Der
   * Mittelpunkt wird deshalb um die halbe Differenz der Ränder versetzt, und
   * die Zoomstufe rechnet nur mit dem, was übrig bleibt.
   *
   * Der Maßstab wird von Hand gerechnet, nicht mit `getBoundsZoom`: Das
   * klemmt auf `maxZoom` der Karte, und die steht bei 10, weil die Weltkarte
   * darüber nichts mehr zu zeigen hat. Ein Schlachtfeld braucht 13. (Dass die
   * Schlachten überhaupt dort ankommen, liegt daran, dass `flyTo` die Grenze
   * nicht anwendet – ein Fund dieser Rechnung. Beim Öffnen wird sie deshalb
   * angehoben, sonst risse ein eigener Zoomschritt die Karte auf Stufe 10
   * zurück.)
   */
  _lageFuer(rahmen) {
    const map = this.atlas.map;
    const rand = this._randHolen();
    const groesse = map.getSize();
    // Nie mehr als 60 Prozent verschenken – sonst bliebe auf schmalen
    // Fenstern ein Streifen übrig, und die Schlacht wäre ein Fleck darin.
    const kl = Math.min(rand.l, groesse.x * .45);
    const kr = Math.min(rand.r, groesse.x * .45);
    const ko = Math.min(rand.o, groesse.y * .4);
    const ku = Math.min(rand.u, groesse.y * .4);
    const frei = L.point(
      Math.max(groesse.x - kl - kr, groesse.x * .4),
      Math.max(groesse.y - ko - ku, groesse.y * .4),
    );
    const grenzen = L.latLngBounds(
      [rahmen[0][1], rahmen[0][0]], [rahmen[1][1], rahmen[1][0]],
    );
    const z0 = this.battle.zoom;
    const nw = map.project(grenzen.getNorthWest(), z0);
    const se = map.project(grenzen.getSouthEast(), z0);
    const breitePx = Math.max(Math.abs(se.x - nw.x), 1e-6);
    const skala = Math.min(
      frei.x / breitePx,
      frei.y / Math.max(Math.abs(se.y - nw.y), 1e-6),
    );
    /* Zwei Grenzen halten die Rechnung im Zaum.
     *
     * Die eine ist der gesetzte Maßstab: Er steckt die Absicht des
     * Verfassers, wie viel Umland zur Schlacht gehört. Zwei Stufen weiter
     * aufziehen darf die Rechnung – das braucht sie, wenn ein Abschnitt über
     * das Feld hinausgreift, wie bei Waterloo, sobald die Preußen kommen –,
     * aber nur eine reichliche halbe Stufe näher heran. Näher heranzugehen
     * war genau die Klage.
     *
     * Die andere ist absolut: Unter vier Kilometern über die freie Breite
     * wird nicht gezoomt. Bei Hastings stehen drei Bataillone auf anderthalb
     * Kilometern; die formatfüllend zu zeigen hieße, eine leere Wiese zu
     * vergrößern. Ohne diese Schranke zöge die Rechnung genau dort am
     * weitesten hinein, wo am wenigsten zu sehen ist.
     *
     * Ein von Hand gesetzter `sicht`-Rahmen darf enger: Wer ihn einträgt,
     * weiß, was er will.
     */
    const mProPx = map.distance(grenzen.getNorthWest(), grenzen.getNorthEast()) / breitePx;
    const eng = z0 + Math.log2(Math.max((frei.x * mProPx) / ENGSTE_BREITE, 1e-6));
    const roh = Math.min(map.getScaleZoom(skala, z0), eng);
    const zoom = klemm(roh, z0 - 2, z0 + (rahmen.hand ? 1.5 : .8));
    const p = map.project(grenzen.getCenter(), zoom)
      .add(L.point((kr - kl) / 2, (ku - ko) / 2));
    return { mitte: map.unproject(p, zoom), zoom, frei };
  }

  /**
   * Nachfahren, wenn es sich lohnt.
   *
   * @param {boolean} sofort Nach einem Sprung oder beim Loslassen des
   *   Schiebers – dann kürzer, weil keine Bewegung mitläuft, der man folgt.
   */
  _folge(sofort = false) {
    if (!this.battle || this._anflug || this._halt || this._frei) return;
    if (!this.leinwand._map) return;
    const schluessel = `${this._station}|${this._teil() >= ZUG_AB ? 1 : 0}`;
    if (schluessel === this._sichtSchluessel && !sofort) return;
    this._sichtSchluessel = schluessel;
    const rahmen = this._sichtZiel();
    if (!rahmen) return;
    const map = this.atlas.map;
    const neu = this._lageFuer(rahmen);
    if (this._sicht) {
      const d = map.project(neu.mitte, neu.zoom)
        .distanceTo(map.project(this._sicht.mitte, neu.zoom));
      const dz = Math.abs(neu.zoom - this._sicht.zoom);
      // Die Schwelle: darunter bleibt die Karte stehen. Das ist der ganze
      // Unterschied zwischen „folgt der Schlacht“ und „zappelt“. Gemessen an
      // der freien Breite, nicht an der des Fensters: Ein Drittel des Fensters
      // wäre bei offener Tafel mehr als das halbe sichtbare Feld.
      if (d < neu.frei.x * SICHT_VERSATZ && dz < SICHT_STUFE) return;
    }
    this._sicht = neu;
    const dauer = sofort || this._sprung ? SICHT_DAUER_KURZ : SICHT_DAUER;
    this._flugBis = performance.now() + dauer * 1000 + 200;
    map.flyTo(neu.mitte, neu.zoom, { duration: dauer });
  }

  /**
   * Flächen, die für Beschriftungen gesperrt sind.
   *
   * Zeichenerklärung und Beiblatt liegen über der Karte. Ein Verbandsfähnchen,
   * das dort landet, ist unlesbar – und man sieht nicht einmal, dass es
   * überdeckt ist. Die Fähnchen weichen deshalb aus, als stünde dort bereits
   * eine Beschriftung. Übergeben werden Bildschirmrechtecke relativ zur
   * Karte; sie ändern sich nur beim Öffnen und bei einer Größenänderung,
   * deshalb kein Auslesen je Bild.
   */
  setSperren(rechtecke) { this.sperren = rechtecke ?? []; this._bild(); }

  close() {
    this.stop();
    clearTimeout(this._anflugTimer);
    cancelAnimationFrame(this._pulsRahmen);
    this._anflug = false;
    this.atlas.map.off('dragstart', this._eingriff);
    this.atlas.map.off('zoomstart', this._eingriff);
    // Grenze zurücksetzen, aber ohne `setMaxZoom`: Das zöge die Karte sofort
    // auf Stufe 10 herunter, während sie noch auf dem Schlachtfeld steht.
    // Erst der nächste eigene Zoomschritt greift die Grenze wieder auf.
    if (this._maxAlt !== undefined) this.atlas.map.options.maxZoom = this._maxAlt;
    if (this._frei) { this._frei = false; this.onKamera(false); }
    this._sicht = null;
    this._sichtSchluessel = null;
    this.battle = null;
    if (this.leinwand._map) this.atlas.map.removeLayer(this.leinwand);
  }

  stop() {
    this.playing = false;
    if (this._rahmen) cancelAnimationFrame(this._rahmen);
    this._rahmen = null;
  }

  play() {
    if (!this.battle || this.playing) return;
    const [a, b] = this.spanne;
    if (this.zeit >= b - 1e-9) this.zeit = a;
    this.playing = true;
    this._zuletzt = performance.now();
    // Wer den Verlauf neu startet, will ihn sehen – also nimmt die Karte die
    // Führung wieder auf, auch wenn zwischendurch von Hand geschoben wurde.
    if (this._frei) this.folgeWieder();
    this.onStation(this);
    this._laufe();
  }

  toggle() { this.playing ? (this.stop(), this.onStation(this)) : this.play(); }

  /** Auf eine Station springen – der Verlauf setzt dort neu an. */
  goTo(index) {
    if (!this.battle) return;
    const i = klemm(Math.round(index), 0, this.count - 1);
    // Ein Sprung ist keine Bewegung, der man folgt: Die Karte fährt kürzer.
    this._sprung = true;
    this.setZeit(this.battle.stationen[i].t);
    this._sprung = false;
    // Wer eine Station anspringt, will sie sehen – die Karte übernimmt wieder.
    if (this._frei) this.folgeWieder();
  }

  step(dir) {
    if (!this.battle) return;
    // Beim Zurückgehen zählt die Station, in der man *steht*, nicht die davor:
    // Wer mitten in Station 3 zurückspringt, will an deren Anfang.
    const teil = this._teil();
    const ziel = dir < 0 && teil > .02 ? this._station : this._station + dir;
    if (ziel >= this.count) { this.stop(); this.goTo(this.count - 1); return; }
    this.goTo(ziel);
  }

  /** Freies Ziehen: Fortschritt von 0 bis 1 über die ganze Schlacht. */
  setFortschritt(f) {
    const [a, b] = this.spanne;
    this.setZeit(a + (b - a) * klemm(f, 0, 1));
  }

  setZeit(t) {
    if (!this.battle) return;
    const [a, b] = this.spanne;
    this.zeit = klemm(t, a, b);
    const vorher = this._station;
    this._bild();
    if (this._station !== vorher) this.onStation(this);
    else this.onTick(this);
  }

  /* ------------------------------------------------------------- Ablauf */

  _laufe() {
    this._rahmen = requestAnimationFrame((jetzt) => {
      const dt = Math.min(jetzt - this._zuletzt, 120);
      this._zuletzt = jetzt;
      const st = this.battle?.stationen;
      if (!st) return;
      // Jedes Stationsfenster dauert gleich lang, unabhängig davon, wie viele
      // Stunden es in der Schlacht umfasst: Sonst rauschte der eine Abschnitt
      // vorbei, während man beim anderen wartet.
      const i = Math.min(this._station, this.count - 2);
      const fenster = i >= 0 && st[i + 1] ? st[i + 1].t - st[i].t : 1;
      const vorher = this._station;
      this.zeit += (dt / this.dauer) * fenster;
      const ende = this.spanne[1];
      if (this.zeit >= ende) {
        this.zeit = ende;
        this._bild();
        this.stop();
        this.onStation(this);
        return;
      }
      this._bild();
      if (this._station !== vorher) this.onStation(this); else this.onTick(this);
      this._laufe();
    });
  }

  /**
   * Mindestgröße eines Verbands in Bildpunkten, aus seiner Mannschaftszahl.
   *
   * Fläche proportional zur Zahl heißt Durchmesser proportional zu ihrer
   * Wurzel – sonst wüchse ein doppelt so starkes Korps auf die vierfache
   * Fläche und träte alles andere aus dem Bild.
   */
  _mindest(text) {
    const z = zahlAus(text);
    if (!z || !this._bezug) return MIND_KLEIN;
    const anteil = Math.sqrt(klemm(z / this._bezug, 0, 1));
    return MIND_KLEIN + (MIND_GROSS - MIND_KLEIN) * anteil;
  }

  /** Anteil innerhalb des laufenden Stationsfensters, 0 bis 1. */
  _teil() {
    const st = this.battle?.stationen;
    if (!st) return 0;
    const i = this._station;
    if (i >= this.count - 1) return 1;
    const w = st[i + 1].t - st[i].t;
    return w > 1e-12 ? klemm((this.zeit - st[i].t) / w, 0, 1) : 0;
  }

  /* ------------------------------------------------------------ Zeichnen */

  /** Umrisse einer Stellung auf dem gemeinsamen Raster, gepuffert. */
  _ring(i, id) {
    const schluessel = `${i}\u0000${id}`;
    if (this._vorrat.has(schluessel)) return this._vorrat.get(schluessel);
    const s = this.battle.stationen[i]?.stellungen.find((x) => x.id === id && x.form !== 'pfeil');
    const r = s ? abtasten(s.punkte, RASTER) : null;
    this._vorrat.set(schluessel, r);
    return r;
  }

  /**
   * Ein Bild aufbauen: Welcher Körper steht wo, welcher Pfeil ist wie weit.
   *
   * Hier liegt die eigentliche Choreografie. Innerhalb eines Stationsfensters
   * ruhen die Körper zuerst, während sich die Pfeile zeichnen; danach gleiten
   * sie in die Lage der nächsten Station, und die Pfeile verblassen.
   */
  _bild() {
    const b = this.battle;
    if (!b) return;
    const st = b.stationen;

    let i = 0;
    while (i < st.length - 1 && st[i + 1].t <= this.zeit + 1e-9) i++;
    this._station = i;

    const teil = this._teil();
    const naechste = st[i + 1] ?? null;
    const zug = naechste ? weich(klemm((teil - ZUG_AB) / (1 - ZUG_AB), 0, 1)) : 0;

    const koerper = [];
    const pfeile = [];
    const gesehen = new Set();

    for (const s of st[i].stellungen) {
      if (s.form === 'pfeil') {
        pfeile.push({
          punkte: s.punkte,
          farbe: this.farben.get(s.partei) ?? '#8a94a6',
          name: s.name ?? '',
          rueckzug: !!s.rueckzug,
          finte: !!s.finte,
          fortschritt: klemm(teil / PFEIL_BIS, 0, 1),
          // Der Pfeil hat seine Aussage gemacht, sobald die Bewegung läuft.
          deckung: 1 - weich(klemm((teil - .72) / .28, 0, 1)) * .85,
        });
        continue;
      }
      gesehen.add(s.id);
      const a = this._ring(i, s.id);
      if (!a) continue;
      const zielRoh = naechste ? this._ring(i + 1, s.id) : null;
      const ziel = zielRoh ? dreheZu(a, zielRoh) : null;
      koerper.push({
        punkte: ziel && zug > 0 ? formeUm(a, ziel, zug) : a,
        farbe: this.farben.get(s.partei) ?? '#8a94a6',
        name: s.name ?? '',
        staerke: s.staerke ?? '',
        gattung: s.gattung ?? 'gemischt',
        geschlagen: !!s.geschlagen,
        mindest: this._mindest(s.staerke),
        // Wer in der nächsten Station fehlt, ist geschlagen oder abgezogen –
        // er verblasst, statt zu verschwinden.
        deckung: ziel || !naechste ? 1 : 1 - zug * .9,
      });
    }

    // Wer neu hinzukommt, blendet ein, statt aus dem Nichts dazustehen.
    if (naechste) {
      for (const s of naechste.stellungen) {
        if (s.form === 'pfeil' || gesehen.has(s.id)) continue;
        const r = this._ring(i + 1, s.id);
        if (!r) continue;
        koerper.push({
          punkte: r,
          farbe: this.farben.get(s.partei) ?? '#8a94a6',
          name: s.name ?? '',
          staerke: s.staerke ?? '',
          gattung: s.gattung ?? 'gemischt',
          geschlagen: !!s.geschlagen,
          mindest: this._mindest(s.staerke),
          deckung: zug,
        });
      }
    }

    const auf = klemm((performance.now() - this._auf) / 900, 0, 1);
    this.leinwand.setInhalt({
      gelaende: b.gelaende ?? [],
      gelaendeDeckung: auf,
      buehne: auf,
      sperren: this.sperren,
      // Während des Anflugs steht nur eine Zielmarke im Bild: Die Stellungen
      // wären auf Regionalmaßstab ohnehin Flecken, und sie würden die Frage
      // „wo ist das?“ überdecken, die der Anflug gerade beantwortet.
      ziel: this._anflug ? b.mitte : null,
      koerper: this._anflug ? [] : koerper,
      pfeile: this._anflug ? [] : pfeile,
    });

    // Zuletzt: Braucht dieser Abschnitt einen anderen Ausschnitt? `_folge`
    // entscheidet selbst, ob sich das Fahren lohnt, und tut in aller Regel
    // nichts – der Aufruf je Bild kostet einen Zeichenkettenvergleich.
    this._folge();
  }
}
