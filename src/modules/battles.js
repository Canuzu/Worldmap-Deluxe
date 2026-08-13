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
import { getJSON } from './data.js';
import { zeichendichte } from './dichte.js';

/**
 * Verläufe kommen einzeln – und erst, wenn jemand sie sehen will.
 *
 * Vorher lagen alle in einer Datei: zwölf Schlachten, 852 kB. Wer das Register
 * öffnete, um nachzusehen, welche Kriege 1815 liefen, lud alle zwölf
 * vollständig mit. Bei dreißig Verläufen wären das zwei Megabyte für einen
 * Blick in eine Liste, und genau daran wäre Punkt 2 der Verbesserungsliste
 * gescheitert, bevor der erste neue Verlauf geschrieben ist.
 *
 * Jetzt zweistufig:
 *
 *   BATTLES        die Kopfdaten aller Schlachten – Name, Ort, Datum, Jahr,
 *                  Ausschnitt. Sieben Kilobyte, fest ins Programm gebündelt,
 *                  weil das Register sie sofort braucht.
 *   ladeVerlauf()  die Stationen einer einzelnen Schlacht, rund 30 kB, geholt
 *                  in dem Augenblick, in dem jemand auf „abspielen“ tippt.
 *
 * `BATTLES` ist eine gewöhnliche Konstante geworden: Sie ist immer da. Die
 * lebendige Bindung von früher brauchte es nur, solange die Liste selbst
 * nachgeladen wurde.
 */
import INDEX from '../data/battles-index.json';

export const BATTLES = INDEX;

/** Bereits geholte Verläufe. Ein zweiter Anlauf auf dieselbe Schlacht ist frei. */
const verlaeufe = new Map();

/**
 * Den vollständigen Verlauf einer Schlacht holen.
 *
 * Gibt `null` zurück, wenn es ihn nicht gibt – aufrufende Stellen müssen damit
 * rechnen, denn das Register führt 177 Schlachten und nur ein Teil davon hat
 * einen Verlauf. Ein Fehlschlag darf die Karte nicht anhalten.
 */
export async function ladeVerlauf(id) {
  if (!verlaeufe.has(id)) {
    verlaeufe.set(id, getJSON(`data/battles/${id}.json`).catch(() => null));
  }
  return verlaeufe.get(id);
}

/** Hat diese Schlacht einen abspielbaren Verlauf? Beantwortet aus dem Index. */
export function hatVerlauf(id) {
  return BATTLES.some((b) => b.id === id);
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
 * Bilder je Sekunde, solange der Verlauf steht.
 *
 * Rauch und Funken brauchen keine sechzig – zwanzig sehen genauso weich aus
 * und kosten ein Drittel. Wer die Karte anhält, will außerdem nicht, dass sein
 * Gebläse angeht.
 */
const REGUNG_TAKT = 20;

/* Pulverdampf: wie viele Ballen je Batterie, wie lang ihr Weg dauert und
   wohin der Wind steht. Der Wind ist für alle Schlachten derselbe – wo er
   wirklich stand, ist meist nicht überliefert, und eine erfundene Windrose
   je Schlacht wäre eine Behauptung mehr, als die Karte machen darf. */
const RAUCH_BALLEN = 7;
const RAUCH_DAUER = 5200;
const RAUCH_WIND = [.42, -.91];
/** Funken an den Nähten: wie viele gleichzeitig, wie lang jeder lebt. */
const FUNKEN_ZAHL = 26;
const FUNKEN_LEBEN = 620;
/** Splitter geschlagener Verbände. */
const SPLITTER_ZAHL = 14;
const SPLITTER_DAUER = 3400;

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
  see: { farbe: '#3f7fc0', flaeche: '#3f7fc0', deckung: .34, kante: .8, wellen: true },
  sumpf: { farbe: '#6f9a8c', flaeche: '#6f9a8c', deckung: .2, muster: 'sumpf', kante: 0 },
  wald: { farbe: '#4f8250', flaeche: '#4f8250', deckung: .26, muster: 'wald', kante: 1.1 },
  hoehe: {
    farbe: '#b08d55', flaeche: '#b08d55', deckung: .1, kante: 1.4,
    schraffur: true, schummer: true,
  },
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

/* ------------------------------------------------------- Truppenkörner */

/**
 * Statt einer Schraffur: einzelne Zeichen im Verband.
 *
 * Eine Musterfüllung sagt „hier steht Fußvolk“. Sie sagt nicht, wie viel –
 * zehntausend Mann und fünfhundert bekommen dieselbe Schraffur, nur auf
 * verschieden großer Fläche, und die Fläche ist gezeichnet, nicht gezählt.
 * Körner sagen beides: Ihre Zeichnung nennt die Gattung, ihre Zahl die Stärke.
 *
 * Sie liegen außerdem **ausgerichtet**. Ein Regiment steht nicht als Wolke im
 * Feld, es steht in Gliedern, quer zur Front. Die Richtung dafür wird nicht
 * gemessen – sie steht in keiner Datei –, sondern aus dem Umriss gewonnen: Die
 * Hauptachse eines Linienverbands ist die Front, die kurze Achse zeigt zum
 * Feind. Welche der beiden Richtungen der Kurzachse nach vorn weist, verrät
 * die Lage des Verbands zum eigenen Heer: Nach vorn ist vom eigenen Schwerpunkt
 * weg.
 */
const KORN_MIN = 5;
const KORN_MAX = 260;
/** Kleinster Abstand zweier Körner in Bildpunkten – darunter wird es Brei. */
const KORN_ENGE = 8;
/**
 * Ab welcher Mannschaftszahl die Stärkeangabe das Korn verdichtet.
 *
 * Sie ist Fließtext und meint nicht immer eine Heeresstärke: In Breitenfeld
 * steht „Brigaden zu 500“ und „siebzehn Haufen“, und die erste Zahl daraus ist
 * 500 beziehungsweise gar keine. Wer die Körner allein danach zählte, gäbe
 * einem Flügel von zwölftausend Mann fünf Zeichen. Grundlage ist deshalb die
 * Fläche; die Zahl verdichtet nur, und nur wenn sie nach einem Heer aussieht.
 */
const KORN_HEER = 2000;
/** Ab welcher Verbandsgröße Körner die Schraffur ablösen (Bildpunkte). */
const KORN_AB = 15;
const KORN_VOLL = 38;


/** Hauptachse einer Punktwolke – die Richtung, in der sie am längsten ist. */
function hauptachse(p) {
  let mx = 0;
  let my = 0;
  for (const [x, y] of p) { mx += x; my += y; }
  mx /= p.length;
  my /= p.length;
  let a = 0;
  let b = 0;
  let c = 0;
  for (const [x, y] of p) {
    const dx = x - mx;
    const dy = y - my;
    a += dx * dx; b += dx * dy; c += dy * dy;
  }
  const w = .5 * Math.atan2(2 * b, a - c);
  return [mx, my, Math.cos(w), Math.sin(w)];
}

/** Immer dieselbe Streuung für denselben Verband – sonst flimmert das Feld. */
function streuung(saat) {
  let s = 2166136261;
  for (let i = 0; i < saat.length; i++) {
    s ^= saat.charCodeAt(i);
    s = Math.imul(s, 16777619);
  }
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
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

/**
 * Der Untergrund des Schlachtfelds.
 *
 * Bei Zoomstufe 13 liegt unter den Truppen eine einzige tote Fläche – die
 * Staatenfarbe bis zum Bildrand. Das war die eigentliche Klage: Es sieht nicht
 * nach einem Ort aus, an dem etwas geschieht, sondern nach einem Formular.
 *
 * Zwei Lagen übereinander. Unten die Geländeschummerung des Atlas, die es
 * ohnehin gibt – echtes Gelände, der Höhenzug von Mont-Saint-Jean ist dann
 * wirklich da und nicht behauptet. Sie wird nur dort zugeschaltet, wo sie
 * nichts verfälscht: nicht auf See, und nicht dort, wo der Mensch die
 * Landschaft umgebaut hat (Stalingrad, die Normandie). Darüber diese
 * gezeichnete Struktur, die das Fremdbild in die Bildsprache des Atlas holt
 * und seine Schwächen abfedert – Unschärfe über der letzten Kachelstufe,
 * harte Kachelkanten.
 *
 * Die Kachel wird einmal gebaut und an der Karte verankert, nicht am Fenster:
 * Sonst schwämme die Struktur beim Schwenken über den Boden.
 */
/* ---------------------------------------------------------- Einflussfeld

   Wer hält gerade welchen Boden?

   Eine Schlacht ist keine Ansammlung von Rechtecken, sondern eine Front, die
   sich verschiebt. Die Rechtecke zeigen, wo Verbände stehen; sie zeigen nicht,
   wem das Feld dazwischen gehört. Genau das ist aber die Frage, um die es
   geht – und die Antwort ändert sich von Station zu Station.

   Deshalb legt sich unter die Truppen ein weiches Feld: Jeder Verband färbt
   den Boden um sich in seiner Parteifarbe ein, mit einer Reichweite, die aus
   seiner Größe folgt. Wo zwei Parteien ähnlich stark einwirken, entsteht eine
   Naht – die Kampfzone. Man sieht die Front kippen, ohne dass es jemand
   beschriftet.

   Gerechnet wird auf einem Sechstel der Auflösung: Ein Einflussfeld ist von
   Natur aus unscharf, und 240×150 Zellen kosten nichts. Die drei Parteien
   liegen dabei in den drei Farbkanälen **einer** Hilfsleinwand – so braucht
   es nur ein einziges Auslesen je Bild statt drei.
*/
/* ------------------------------------------------------------ Darstellung

   Zwei Fassungen derselben Karte.

   „Stich“ ist die Grundeinstellung und die Sprache des übrigen Atlasses:
   gedämpft, schraffiert, wie ein Blatt aus einem Generalstabswerk. Sie
   behauptet nichts, was sie nicht weiß, und man kann sie lange ansehen.

   „Schaubild“ dreht dieselben Angaben lauter: kräftigere Felder, glühende
   Nähte, sichtbarer Rauch. Es zeigt keine anderen Daten, nur andere Regler –
   wer eine Schlacht zum ersten Mal sieht, versteht sie damit schneller.
*/
const DARSTELLUNGEN = ['stich', 'schaubild'];
const DARSTELLUNG_SCHLUESSEL = 'wmd.schlacht.darstellung';
let _darstellung = null;

export function darstellung() {
  if (_darstellung) return _darstellung;
  let gemerkt = null;
  try { gemerkt = localStorage.getItem(DARSTELLUNG_SCHLUESSEL); } catch { /* ohne Speicher */ }
  _darstellung = DARSTELLUNGEN.includes(gemerkt) ? gemerkt : 'stich';
  return _darstellung;
}

export function setzeDarstellung(wert) {
  if (!DARSTELLUNGEN.includes(wert)) return darstellung();
  _darstellung = wert;
  try { localStorage.setItem(DARSTELLUNG_SCHLUESSEL, wert); } catch { /* ohne Speicher */ }
  return _darstellung;
}

const FELD_TEILER = 6;
const FELD_UNSCHAERFE = 5;
/* Ab welchem Anteil eine Zelle als umkämpft gilt: Liegen beide Parteien
   näher als das beieinander, ist der Boden strittig. */
const FELD_NAHT = .42;

let feldHilfe = null;
let feldBild = null;

function feldLeinwand(w, h) {
  if (!feldHilfe) {
    feldHilfe = document.createElement('canvas');
    feldBild = document.createElement('canvas');
  }
  if (feldHilfe.width !== w || feldHilfe.height !== h) {
    feldHilfe.width = w; feldHilfe.height = h;
    feldBild.width = w; feldBild.height = h;
  }
  return [feldHilfe, feldBild];
}

/** Hexfarbe zu [r,g,b]. */
function rgbAus(farbe) {
  const h = String(farbe).replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const GRUND_KACHEL = 72;
const GRUND = new Map();
function grundMuster(ctx, see) {
  const schluessel = see ? 'see' : 'land';
  if (GRUND.has(schluessel)) return GRUND.get(schluessel);
  const d = GRUND_KACHEL;
  const k = document.createElement('canvas');
  k.width = d;
  k.height = d;
  const c = k.getContext('2d');
  // Fester Zufall: Dieselbe Kachel bei jedem Aufruf, sonst flimmerte der
  // Boden bei jedem Neuaufbau anders.
  let saat = see ? 9176 : 4211;
  const wurf = () => {
    saat = (saat * 1103515245 + 12345) & 0x7fffffff;
    return saat / 0x7fffffff;
  };
  if (see) {
    // Wasser: kurze, flache Wellenstriche in lockeren Reihen.
    c.strokeStyle = 'rgba(150,196,226,.16)';
    c.lineWidth = 1;
    for (let i = 0; i < 9; i++) {
      const x = wurf() * d;
      const y = wurf() * d;
      const w = 7 + wurf() * 9;
      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo(x + w / 2, y - 2.2, x + w, y);
      c.stroke();
    }
  } else {
    // Land: ein paar Flecken und kurze Striche – angedeutete Flur, keine
    // gezeichneten Äcker. Wer Muster erkennt, sieht ein Raster; wer nichts
    // erkennt, sieht Boden.
    for (let i = 0; i < 7; i++) {
      const x = wurf() * d;
      const y = wurf() * d;
      const r = 6 + wurf() * 13;
      const hell = wurf() > .5;
      c.fillStyle = hell ? 'rgba(196,186,158,.05)' : 'rgba(28,34,26,.07)';
      c.beginPath();
      c.ellipse(x, y, r, r * (.5 + wurf() * .5), wurf() * Math.PI, 0, Math.PI * 2);
      c.fill();
    }
    c.strokeStyle = 'rgba(168,164,134,.09)';
    c.lineWidth = 1;
    for (let i = 0; i < 11; i++) {
      const x = wurf() * d;
      const y = wurf() * d;
      const l = 4 + wurf() * 7;
      const w = wurf() * Math.PI;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + Math.cos(w) * l, y + Math.sin(w) * l);
      c.stroke();
    }
  }
  const muster = ctx.createPattern(k, 'repeat');
  GRUND.set(schluessel, muster);
  return muster;
}

/**
 * Der Blattrand: die Fassung eines gestochenen Atlasblattes.
 *
 * Eine Schlacht schwebte bisher randlos im Browserfenster. Ein gedrucktes
 * Blatt hat eine Fassung, und die tut mehr, als hübsch zu sein: Sie sagt, wo
 * die Karte aufhört und der Apparat anfängt – die Tafel liegt dann sichtbar
 * *neben* dem Blatt und nicht darauf.
 *
 * Der Rand ist selbst die Skala. Ein Band aus abwechselnd hellen und dunklen
 * Abschnitten, je einer eine runde Gradzahl breit, dazu die Zahlen am oberen
 * und linken Rand. Das ist die Gradleiter, die Kartenblätter seit dem 17.
 * Jahrhundert tragen: Sie sieht nicht nur nach Karte aus, sie sagt auch etwas
 * – wie weit das Feld reicht und wo auf der Erde es liegt.
 */
const BAND = 13;
/** Dieselbe Auszeichnungsschrift wie die Kartusche der Hauptseite. */
const BLATT_SCHRIFT = '"Iowan Old Style", "Palatino Linotype", Palatino, '
  + '"Book Antiqua", Georgia, "Times New Roman", serif';
const GRAD_STUFEN = [10, 5, 2, 1, .5, .25, 1 / 6, 1 / 12, 1 / 30, 1 / 60,
  1 / 120, 1 / 300, 1 / 600, 1 / 1800, 1 / 3600];

/** Die größte runde Gradstufe, die noch mindestens vier Abschnitte ergibt. */
function gradStufe(spanne) {
  for (const s of GRAD_STUFEN) if (spanne / s >= 4) return s;
  return GRAD_STUFEN.at(-1);
}

/**
 * Gradzahl in der Schreibweise des Blattes: Grad, Minuten, Sekunden – aber
 * nur so fein, wie die Stufe es verlangt. „4° 25′“ statt „4,4167°“.
 */
function gradText(wert, stufe, achse) {
  const himmel = achse === 'lon'
    ? (wert < 0 ? 'W' : 'O')
    : (wert < 0 ? 'S' : 'N');
  const a = Math.abs(wert);
  const g = Math.floor(a + 1e-9);
  const restMin = (a - g) * 60;
  if (stufe >= 1) return `${Math.round(a)}° ${himmel}`;
  if (stufe >= 1 / 60) return `${g}° ${Math.round(restMin)}′ ${himmel}`;
  const m = Math.floor(restMin + 1e-9);
  return `${g}° ${m}′ ${Math.round((restMin - m) * 60)}″`;
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
    if (this._zeichenRahmen) cancelAnimationFrame(this._zeichenRahmen);
    this._zeichenRahmen = 0;
    this._leinwand.remove();
  },

  /** Was gezeichnet werden soll – wird je Bild neu gesetzt. */
  setInhalt(inhalt) { this._inhalt = inhalt; this._planeZeichnen(); },

  /**
   * Höchstens einmal je Bild zeichnen.
   *
   * Die Leinwand deckt das ganze Fenster ab; bei doppelter Punktdichte sind
   * das über fünf Millionen Bildpunkte, die der Browser nach jedem Zeichnen
   * neu auf die Grafikkarte schiebt. Das ist der teuerste Einzelposten des
   * Verlaufs – teurer als alles, was wir darauf zeichnen.
   *
   * Und wir taten es mehrfach je Bild: Leaflet feuert während einer
   * Kamerafahrt `zoomanim`, `zoom` und `move` nacheinander, und der Abspieler
   * setzt in seinem eigenen Bildtakt noch einmal neuen Inhalt. Gemessen 2,8
   * Zeichnungen je sichtbarem Bild – 1,8 davon hat nie jemand gesehen, denn
   * der Bildschirm zeigt nur den letzten Stand.
   *
   * Jetzt sammelt sich alles in einem `requestAnimationFrame`. Der Inhalt
   * steht weiterhin sofort im Feld – wer ihn ausliest, sieht den neuen Stand;
   * gezeichnet wird er einmal, kurz bevor das Bild wirklich gebraucht wird.
   */
  _planeZeichnen() {
    if (this._zeichenRahmen) return;
    this._zeichenRahmen = requestAnimationFrame(() => {
      this._zeichenRahmen = 0;
      this._zeichne();
    });
  },

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
    const dichte = zeichendichte();
    if (c.width !== Math.round(groesse.x * dichte) || c.height !== Math.round(groesse.y * dichte)) {
      c.width = Math.round(groesse.x * dichte);
      c.height = Math.round(groesse.y * dichte);
      c.style.width = `${groesse.x}px`;
      c.style.height = `${groesse.y}px`;
    }
    this._dichte = dichte;
    L.DomUtil.setPosition(c, map.containerPointToLayerPoint([0, 0]));
    this._planeZeichnen();
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

    this._grund(ctx, groesse, inhalt);
    this._buehne(ctx, groesse, inhalt);
    if (inhalt.ziel) { this._zielmarke(ctx, inhalt.ziel); return; }

    /* Alles Gezeichnete endet an der Fassung – wie ein Stich, der am
       Blattrand aufhört. Ohne den Beschnitt ragten Geländezüge und
       Beschriftungen über das Blatt hinaus in den Bereich, der gerade als
       „nicht mehr Karte“ ausgewiesen wird. */
    const masse = this._blattMasse(groesse, inhalt);
    ctx.save();
    if (masse) {
      ctx.beginPath();
      ctx.rect(
        masse.x0 + BAND, masse.y0 + BAND,
        masse.x1 - masse.x0 - BAND * 2, masse.y1 - masse.y0 - BAND * 2,
      );
      ctx.clip();
    }
    // Die Bildschirmlage einmal je Körper und Bild: Körper und Fähnchen
    // müssen dieselbe Größe sehen, sonst legt sich die Beschriftung auf einen
    // Verband, den sie für kleiner hält, als er gezeichnet wird. Das
    // Einflussfeld braucht sie ebenfalls – deshalb steht die Berechnung vor
    // allem anderen, was gezeichnet wird.
    for (const k of inhalt.koerper ?? []) k._lage = this._lage(k);
    this._lager = this._schwerpunkte(inhalt.koerper ?? []);
    /* Was gerade auf dem Schirm steht – im Unterschied zu `_inhalt`, das den
       zuletzt übergebenen Stand hält. Die beiden fielen früher zusammen, weil
       nur auf Anforderung gezeichnet wurde. Seit das Feld auch im Stillstand
       weiterläuft, liegt zwischen Übergabe und Zeichnung regelmäßig ein Bild –
       und `_lage` steht erst danach. Wer die Lage eines Verbands wissen will,
       fragt deshalb hier und nicht bei `_inhalt`. */
    this._gezeichnet = inhalt;
    /* Erst der Boden, dann das Gelände, dann die Truppe: Das Einflussfeld ist
       eine Aussage über die Fläche, nicht über die Zeichnung darauf. Läge es
       oben, verschluckte es die Höhenlinien und die Kanten der Verbände. */
    this._heiss = this._einfluss(ctx, groesse, inhalt);
    for (const g of inhalt.gelaende ?? []) this._gelaende(ctx, g);
    for (const k of inhalt.koerper ?? []) this._koerper(ctx, k);
    this._frontlinie(ctx, klemm(inhalt.buehne ?? 1, 0, 1), inhalt);
    /* Rauch, Funken und Splitter liegen über der Truppe und unter den Pfeilen:
       Sie verhüllen das Feld, aber nie die Aussage. */
    this._regungen(ctx, inhalt);
    this._pfeilPlaetze = [];
    for (const p of inhalt.pfeile ?? []) this._pfeil(ctx, p);
    // Erst die Verbände beschriften, dann das Gelände: Wo beides um denselben
    // Platz streitet, gewinnt die Truppe – sie ist die Aussage, der Flurname
    // ist der Hintergrund. Die Kartusche zählt dabei als besetzt, sonst
    // schriebe ein Fähnchen quer über den Titel des Blattes.
    const belegt = this._beschriftungen(
      ctx, inhalt.koerper ?? [],
      [...(this._pfeilPlaetze ?? []), ...(inhalt.sperren ?? []),
        ...(masse?.kartusche ? [masse.kartusche] : [])],
    );
    for (const g of inhalt.gelaende ?? []) this._gelaendeName(ctx, g, belegt);
    this._feldRahmen(ctx, inhalt);
    ctx.restore();
    this._blattrand(ctx, masse, inhalt);
  },

  /**
   * Auf dem Übersichtsblatt: das Rechteck um das Schlachtfeld.
   *
   * Der Sprung von hundert Kilometern auf zwei ist der größte Maßstabswechsel
   * im ganzen Atlas. Ohne Vorwarnung wirkt er wie ein Schnitt; mit dem
   * Rechteck sieht man vorher, wohin es geht – und nachher, wie klein das
   * Feld in der Landschaft war, über die die Heere tagelang marschiert sind.
   */
  _feldRahmen(ctx, inhalt) {
    const r = inhalt.feldRahmen;
    if (!r) return;
    const [x0, y1] = this._punkt([r[0][0], r[0][1]]);
    const [x1, y0] = this._punkt([r[1][0], r[1][1]]);
    const w = Math.max(x1 - x0, 10);
    const h = Math.max(y1 - y0, 10);
    ctx.save();
    ctx.globalAlpha = klemm(inhalt.buehne ?? 1, 0, 1);
    ctx.strokeStyle = 'rgba(233,196,106,.9)';
    ctx.lineWidth = 1.4;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(x0, y0, w, h);
    ctx.setLineDash([]);
    ctx.font = '500 10px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(233,196,106,.95)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('Schlachtfeld', x0 + w / 2, y0 - 4);
    ctx.restore();
  },

  /**
   * Maße des Blattes: das freie Feld zwischen Tafel, Zeichenerklärung,
   * Kopfleiste und Zeitleiste – also das, was tatsächlich Karte ist.
   *
   * Bleibt zu wenig übrig, gibt es keinen Rahmen: Ein Blattrand um ein Feld
   * von zweihundert Bildpunkten ist kein Blattrand, sondern ein Kasten.
   */
  _blattMasse(groesse, inhalt) {
    const r = inhalt.blatt;
    if (!r) return null;
    const x0 = Math.max(r.l, 6);
    const y0 = Math.max(r.o, 6);
    const x1 = groesse.x - Math.max(r.r, 6);
    const y1 = groesse.y - Math.max(r.u, 6);
    if (x1 - x0 < 260 || y1 - y0 < 200) return null;
    const titel = inhalt.titel ?? '';
    const datum = inhalt.datum ?? '';
    const ctx = this._ctx;
    ctx.save();
    ctx.font = '500 14px ' + BLATT_SCHRIFT;
    const wt = ctx.measureText(titel).width;
    ctx.font = '500 10.5px ui-sans-serif, system-ui, sans-serif';
    const wd = ctx.measureText(datum).width;
    ctx.restore();
    const kw = Math.min(Math.max(wt, wd) + 26, (x1 - x0) * .6);
    const kh = datum ? 44 : 30;
    return {
      x0, y0, x1, y1, titel, datum,
      kartusche: titel
        ? { x: x0 + BAND + 12 + kw / 2, y: y0 + BAND + 12 + kh / 2, w: kw + 12, h: kh + 10 }
        : null,
      kw,
      kh,
    };
  },

  /**
   * Die Gradleiter am Rand und die Kartusche mit Titel und Datum.
   *
   * Gezeichnet ganz zuletzt: Der Rahmen liegt über allem, auch über einer
   * Stellung, die über das Blatt hinausragt – genau wie auf Papier, wo der
   * Stich an der Fassung endet.
   */
  _blattrand(ctx, b, inhalt) {
    const a = inhalt.buehne ?? 1;
    if (!b || a <= .02) return;
    const karte = this._map;
    const { x0, y0, x1, y1 } = b;

    ctx.save();
    ctx.globalAlpha = a;

    // Der Streifen zwischen äußerer und innerer Linie.
    ctx.beginPath();
    ctx.rect(x0, y0, x1 - x0, y1 - y0);
    ctx.rect(x0 + BAND, y0 + BAND, x1 - x0 - BAND * 2, y1 - y0 - BAND * 2);
    ctx.fillStyle = 'rgba(12,17,26,.82)';
    ctx.fill('evenodd');

    // Die Abschnitte der Leiter: je einer eine runde Gradstufe breit.
    const nw = karte.containerPointToLatLng([x0 + BAND, y0 + BAND]);
    const se = karte.containerPointToLatLng([x1 - BAND, y1 - BAND]);
    const stufeX = gradStufe(Math.abs(se.lng - nw.lng));
    const stufeY = gradStufe(Math.abs(nw.lat - se.lat));

    const hell = 'rgba(226,232,240,.72)';
    const dunkel = 'rgba(16,22,32,.9)';
    const strichX = [];
    const strichY = [];
    for (let g = Math.ceil(nw.lng / stufeX) * stufeX; g <= se.lng + 1e-12; g += stufeX) {
      strichX.push({ g, x: karte.latLngToContainerPoint([nw.lat, g]).x });
    }
    for (let g = Math.ceil(se.lat / stufeY) * stufeY; g <= nw.lat + 1e-12; g += stufeY) {
      strichY.push({ g, y: karte.latLngToContainerPoint([g, nw.lng]).y });
    }

    const balken = (x, y, w, h, i) => {
      if (w <= .5 || h <= .5) return;
      ctx.fillStyle = i % 2 ? hell : dunkel;
      ctx.fillRect(x, y, w, h);
    };
    // Waagerecht: oben und unten dieselbe Teilung.
    let vorher = x0 + BAND;
    strichX.forEach((s, i) => {
      const x = klemm(s.x, x0 + BAND, x1 - BAND);
      balken(vorher, y0, x - vorher, BAND, i);
      balken(vorher, y1 - BAND, x - vorher, BAND, i);
      vorher = x;
    });
    balken(vorher, y0, x1 - BAND - vorher, BAND, strichX.length);
    balken(vorher, y1 - BAND, x1 - BAND - vorher, BAND, strichX.length);
    // Senkrecht: von unten nach oben, damit die Zählung mit der Breite läuft.
    vorher = y1 - BAND;
    strichY.forEach((s, i) => {
      const y = klemm(s.y, y0 + BAND, y1 - BAND);
      balken(x0, y, BAND, vorher - y, i);
      balken(x1 - BAND, y, BAND, vorher - y, i);
      vorher = y;
    });
    balken(x0, y0 + BAND, BAND, vorher - y0 - BAND, strichY.length);
    balken(x1 - BAND, y0 + BAND, BAND, vorher - y0 - BAND, strichY.length);

    // Die Ecken bleiben leer: Dort stößt waagerechte auf senkrechte Teilung,
    // und eine Ecke, die zu beiden gehört, gehört zu keiner.
    ctx.fillStyle = 'rgba(12,17,26,.92)';
    ctx.fillRect(x0, y0, BAND, BAND);
    ctx.fillRect(x1 - BAND, y0, BAND, BAND);
    ctx.fillRect(x0, y1 - BAND, BAND, BAND);
    ctx.fillRect(x1 - BAND, y1 - BAND, BAND, BAND);

    ctx.strokeStyle = 'rgba(196,214,232,.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x0 + .5, y0 + .5, x1 - x0 - 1, y1 - y0 - 1);
    ctx.strokeStyle = 'rgba(196,214,232,.72)';
    ctx.strokeRect(x0 + BAND + .5, y0 + BAND + .5, x1 - x0 - BAND * 2 - 1, y1 - y0 - BAND * 2 - 1);

    // Die Zahlen: innen an der Fassung, nicht auf der Leiter. Auf dem Band
    // stünden sie zwischen den Abschnitten und wären auf jedem zweiten
    // unlesbar.
    ctx.font = '500 9px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(210,222,236,.72)';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';
    let letzte = -Infinity;
    for (const s of strichX) {
      if (s.x < x0 + BAND + 20 || s.x > x1 - BAND - 20 || s.x - letzte < 74) continue;
      letzte = s.x;
      ctx.fillText(gradText(s.g, stufeX, 'lon'), s.x, y0 + BAND + 4);
    }
    ctx.textAlign = 'left';
    letzte = -Infinity;
    for (const s of strichY) {
      if (s.y < y0 + BAND + 22 || s.y > y1 - BAND - 16 || Math.abs(s.y - letzte) < 46) continue;
      letzte = s.y;
      ctx.fillText(gradText(s.g, stufeY, 'lat'), x0 + BAND + 5, s.y + 3);
    }

    // Die Kartusche. Das Blatt nennt selbst, was es zeigt – wer ein Bild
    // davon macht, hat den Titel mit im Bild.
    if (b.kartusche && b.titel) {
      const kx = x0 + BAND + 12;
      const ky = y0 + BAND + 12;
      ctx.beginPath();
      ctx.roundRect(kx, ky, b.kw, b.kh, 3);
      ctx.fillStyle = 'rgba(10,14,22,.88)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(233,196,106,.55)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(kx + 9, ky + b.kh - 15.5);
      ctx.lineTo(kx + b.kw - 9, ky + b.kh - 15.5);
      ctx.strokeStyle = 'rgba(233,196,106,.3)';
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '500 14px ' + BLATT_SCHRIFT;
      ctx.fillStyle = '#f2f5fa';
      ctx.fillText(b.titel, kx + b.kw / 2, ky + (b.datum ? 15 : b.kh / 2));
      if (b.datum) {
        ctx.font = '500 10.5px ui-sans-serif, system-ui, sans-serif';
        ctx.fillStyle = 'rgba(233,196,106,.9)';
        ctx.fillText(b.datum, kx + b.kw / 2, ky + b.kh - 8);
      }
    }
    ctx.restore();
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
  /** Mitte des Schlachtfelds auf dem Bildschirm – Bezug für Grund und Bühne. */
  _feldMitte(inhalt, groesse) {
    if (!inhalt.feldMitte) return [groesse.x / 2, groesse.y / 2];
    const [x, y] = this._punkt(inhalt.feldMitte);
    // Liegt das Feld weit außerhalb (während eines Flugs), bleibt die Mitte
    // die Bildmitte: Sonst zöge die Vignette am Bildrand zusammen.
    if (!Number.isFinite(x) || Math.abs(x - groesse.x / 2) > groesse.x
      || Math.abs(y - groesse.y / 2) > groesse.y) {
      return [groesse.x / 2, groesse.y / 2];
    }
    return [x, y];
  },

  /**
   * Der gezeichnete Untergrund: ein warmer Wasch über dem Feld, darauf eine
   * feine Struktur. Nach außen läuft beides aus – der Blick wird ohne Rahmen
   * und ohne Linie auf das Feld gezogen.
   */
  _grund(ctx, groesse, inhalt) {
    const a = inhalt.grund ?? 0;
    if (a <= 0) return;
    const [cx, cy] = this._feldMitte(inhalt, groesse);
    const r = Math.hypot(groesse.x, groesse.y) * .52;
    ctx.save();

    const ton = inhalt.see ? '78,116,150' : '124,112,80';
    const g = ctx.createRadialGradient(cx, cy, r * .06, cx, cy, r);
    g.addColorStop(0, `rgba(${ton},${(.26 * a).toFixed(3)})`);
    g.addColorStop(.55, `rgba(${ton},${(.13 * a).toFixed(3)})`);
    g.addColorStop(1, `rgba(${ton},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, groesse.x, groesse.y);

    const muster = grundMuster(ctx, inhalt.see);
    if (muster) {
      // An der Karte verankert: Der Ursprung der Weltkarte in
      // Fensterkoordinaten, auf die Kachelgröße gefaltet.
      const o = this._map.getPixelOrigin();
      const dx = ((-o.x % GRUND_KACHEL) + GRUND_KACHEL) % GRUND_KACHEL;
      const dy = ((-o.y % GRUND_KACHEL) + GRUND_KACHEL) % GRUND_KACHEL;
      /* Bewusst ohne eigene Vignette: Ein Ausblenden der Struktur bräuchte
         eine zweite Leinwand je Bild. Sie ist so schwach angelegt, dass der
         Schatten der Bühne, der gleich darüberkommt, sie am Rand von selbst
         verschluckt. */
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(dx - GRUND_KACHEL, dy - GRUND_KACHEL);
      ctx.fillStyle = muster;
      ctx.fillRect(0, 0, groesse.x + GRUND_KACHEL * 2, groesse.y + GRUND_KACHEL * 2);
      ctx.restore();
    }
    ctx.restore();
  },

  /**
   * Das Einflussfeld unter den Truppen.
   *
   * Ablauf je Bild:
   *   1. Jede Partei bekommt einen Farbkanal und wird dort als weiche Wolke
   *      um ihre Verbände eingezeichnet – Reichweite nach Ausdehnung.
   *   2. Ein einziges Auslesen liefert alle Kanäle auf einmal.
   *   3. Je Zelle gewinnt die stärkste Partei; liegt die zweite nahe genug
   *      dahinter, ist die Zelle umkämpft und bekommt die Nahtfarbe.
   *
   * Zurück kommt die Liste der umkämpften Stellen – daran hängen später
   * Funken und Rauch.
   */
  _einfluss(ctx, groesse, inhalt) {
    const a = klemm(inhalt.buehne ?? 1, 0, 1);
    const koerper = (inhalt.koerper ?? []).filter((k) => (k._lage?.p ?? k.punkte)?.length >= 3);
    if (a <= .01 || !koerper.length) return [];

    const parteien = [];
    for (const k of koerper) {
      const id = k.partei ?? k.farbe;
      if (!parteien.some((x) => x.id === id) && parteien.length < 3) {
        parteien.push({ id, farbe: k.farbe });
      }
    }
    if (!parteien.length) return [];

    const w = Math.max(2, Math.round(groesse.x / FELD_TEILER));
    const h = Math.max(2, Math.round(groesse.y / FELD_TEILER));
    const [hilfe, bild] = feldLeinwand(w, h);
    const hc = hilfe.getContext('2d', { willReadFrequently: true });
    hc.setTransform(1, 0, 0, 1, 0, 0);
    hc.clearRect(0, 0, w, h);
    /* Die Kanäle addieren sich: Rot ist Partei 1, Grün Partei 2, Blau
       Partei 3. Zwei Verbände derselben Partei verstärken einander. */
    hc.globalCompositeOperation = 'lighter';
    hc.filter = `blur(${FELD_UNSCHAERFE}px)`;

    for (const k of koerper) {
      const idx = parteien.findIndex((x) => x.id === (k.partei ?? k.farbe));
      if (idx < 0) continue;
      const p = (k._lage?.p ?? []).length >= 3 ? k._lage.p : null;
      if (!p) continue;
      /* Ein geschlagener Verband hält weniger Boden – das ist der ganze
         Unterschied zwischen „steht dort“ und „beherrscht dort“. */
      const staerke = (k.deckung ?? 1) * (k.geschlagen ? .45 : 1);
      hc.fillStyle = `rgb(${idx === 0 ? 255 : 0},${idx === 1 ? 255 : 0},${idx === 2 ? 255 : 0})`;
      hc.globalAlpha = klemm(staerke * .9, 0, 1);
      hc.beginPath();
      for (let i = 0; i < p.length; i++) {
        const x = p[i][0] / FELD_TEILER;
        const y = p[i][1] / FELD_TEILER;
        if (i === 0) hc.moveTo(x, y); else hc.lineTo(x, y);
      }
      hc.closePath();
      hc.fill();
    }
    hc.filter = 'none';
    hc.globalCompositeOperation = 'source-over';
    hc.globalAlpha = 1;

    const quelle = hc.getImageData(0, 0, w, h);
    const q = quelle.data;
    const bc = bild.getContext('2d');
    const ziel = bc.createImageData(w, h);
    const z = ziel.data;
    const rgb = parteien.map((x) => rgbAus(x.farbe));
    /* Die Naht: ein warmer Ton, der zu keiner Partei gehört. Er soll wie
       aufgewühlter Boden wirken, nicht wie eine dritte Fahne. */
    const naht = inhalt.schaubild ? [255, 196, 120] : [214, 168, 112];
    const grund = inhalt.schaubild ? .58 : .3;
    /* Wer je Zelle führt, wird gemerkt: Daraus wird gleich die Frontlinie –
       die Kette der Zellen, deren Nachbar einer anderen Partei gehört. */
    const fuehrer = new Int8Array(w * h).fill(-1);
    const wucht = new Uint8Array(w * h);
    const heiss = [];

    for (let i = 0, n = w * h; i < n; i++) {
      const v = [q[i * 4], q[i * 4 + 1], q[i * 4 + 2]];
      let erst = -1;
      let zweit = -1;
      let besteI = 0;
      for (let j = 0; j < parteien.length; j++) {
        if (v[j] > erst) { zweit = erst; erst = v[j]; besteI = j; } else if (v[j] > zweit) zweit = v[j];
      }
      if (erst < 12) continue;
      fuehrer[i] = besteI;
      wucht[i] = erst;
      const summe = erst + Math.max(zweit, 0);
      const anteil = summe > 0 ? (erst - Math.max(zweit, 0)) / summe : 1;
      const staerke = klemm(erst / 190, 0, 1);
      let farbe;
      let alpha;
      if (anteil < FELD_NAHT) {
        farbe = naht;
        // Die Naht ist dort am kräftigsten, wo beide am stärksten drücken.
        alpha = staerke * grund * (inhalt.schaubild ? 1.6 : 1.3);
        if (staerke > .3) heiss.push(i);
      } else {
        farbe = rgb[besteI];
        alpha = staerke * grund * klemm(anteil, .35, 1);
      }
      z[i * 4] = farbe[0];
      z[i * 4 + 1] = farbe[1];
      z[i * 4 + 2] = farbe[2];
      z[i * 4 + 3] = Math.round(klemm(alpha, 0, .92) * 255);
    }
    bc.putImageData(ziel, 0, 0);

    ctx.save();
    ctx.globalAlpha = a * (inhalt.schaubild ? 1 : .85);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bild, 0, 0, w, h, 0, 0, groesse.x, groesse.y);
    ctx.restore();

    /* Gezeichnet wird die Front erst nach den Truppen: Sie ist eine Aussage
       über das Bild, kein Untergrund darunter. Unter dem Gelände lag sie
       vorher – und war dort nicht zu sehen. */
    this._front = this._frontStriche(fuehrer, wucht, q, w, h);

    // Bildschirmlage der umkämpften Zellen, für Funken und Rauch.
    return heiss.map((i) => [
      ((i % w) + .5) * FELD_TEILER,
      (Math.floor(i / w) + .5) * FELD_TEILER,
    ]);
  },

  /**
   * Die Frontlinie: dort, wo der Einfluss kippt.
   *
   * Der eingefärbte Boden zeigt Mehrheiten, aber keine Kante – und die Kante
   * ist das, worauf man schaut. Gezeichnet wird sie als Kette kurzer Striche
   * längs der Front: So sieht eine Frontlinie auf einer Stabskarte aus.
   *
   * Gefunden wird sie zellenweise: Wo der rechte oder der untere Nachbar einer
   * anderen Partei gehört, liegt ein Stück Front. **Die Richtung des Strichs
   * kommt aber nicht von der Nachbarschaft**, sonst stünde er nur waagerecht
   * oder senkrecht und die Front liefe als Treppe über das Feld. Sie kommt aus
   * dem Gefälle: Zwischen den beiden beteiligten Kanälen wird die Differenz
   * gebildet, ihr Gradient zeigt quer zur Front, der Strich steht senkrecht
   * darauf. So dreht sich die Kette stetig mit und liest sich als Linie.
   */
  _frontStriche(fuehrer, wucht, q, w, h) {
    const striche = [];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const f = fuehrer[i];
        if (f < 0 || wucht[i] < 26) continue;
        /* Höchstens ein Strich je Zelle: Zwei Striche im selben Feld werden
           zum Doppelstrich, und der liest sich als Straße. */
        let g = -1;
        let mx = 0;
        let my = 0;
        let schwaechster = wucht[i];
        for (const [dx, dy, j] of [[1, 0, i + 1], [0, 1, i + w]]) {
          const n = fuehrer[j];
          if (n < 0 || n === f || wucht[j] < 26) continue;
          if (g < 0) g = n;
          mx += dx * .5;
          my += dy * .5;
          schwaechster = Math.min(schwaechster, wucht[j]);
        }
        if (g < 0) continue;
        const d = (xx, yy) => {
          const k = (yy * w + xx) * 4;
          return q[k + f] - q[k + g];
        };
        const gx = d(x + 1, y) - d(x - 1, y);
        const gy = d(x, y + 1) - d(x, y - 1);
        const laenge = Math.hypot(gx, gy);
        /* Ohne Gefälle keine Richtung – dann liegt der Strich quer zum
           Nachbarn, wie zuvor. */
        const quer = Math.hypot(mx, my) || 1;
        const [tx, ty] = laenge > 1 ? [-gy / laenge, gx / laenge] : [-my / quer, mx / quer];
        striche.push([
          (x + .5 + mx) * FELD_TEILER,
          (y + .5 + my) * FELD_TEILER,
          tx, ty, schwaechster / 255,
        ]);
      }
    }
    return striche;
  },

  /**
   * Was sich während einer Station bewegt.
   *
   * Eine Station ist kein Augenblick, sondern eine halbe Stunde Schlacht. Ein
   * Standbild davon ist eine Behauptung: dass in dieser halben Stunde nichts
   * geschah. Drei Dinge widersprechen dem, und alle drei stehen schon in den
   * Daten – es wurde nur nichts daraus gemacht:
   *
   *   Rauch über den Geschützen. Wo Rohre stehen, steht Pulverdampf, und er
   *   zieht ab. Er ist außerdem das einzige, was auf einem Schlachtfeld die
   *   Sicht nimmt – und die genommene Sicht entscheidet mehrere dieser
   *   Schlachten.
   *
   *   Funken an den Nähten. Das Einflussfeld weiß bereits, wo beide Parteien
   *   gleich stark drücken; dort wird gekämpft. Ein Aufblitzen dort sagt in
   *   einem Bild, was der Text in einem Absatz sagt.
   *
   *   Treibende Splitter bei Geschlagenen. Ein geschlagener Verband löst sich
   *   auf; das gestrichelte Kleid sagt „geschlagen“, aber es sagt nicht, wohin
   *   er geht. Die Splitter treiben nach hinten – von der eigenen Front weg.
   *
   * Alles davon ist zustandslos gerechnet: Aus der Uhrzeit und einer festen
   * Saat folgt jedes Teilchen. Es gibt keine Teilchenliste, die fortgeschrieben
   * würde, und deshalb auch nichts, was beim Umschalten, Zurückspringen oder
   * Zoomen aus dem Tritt geriete.
   */
  _regungen(ctx, inhalt) {
    const a = klemm(inhalt.buehne ?? 1, 0, 1);
    if (a <= .02) return;
    const jetzt = performance.now();
    this._rauch(ctx, inhalt, jetzt, a);
    this._funken(ctx, inhalt, jetzt, a);
    this._splitter(ctx, inhalt, jetzt, a);
  },

  /** Pulverdampf über den Rohren – er steigt, weitet sich und verzieht. */
  _rauch(ctx, inhalt, jetzt, a) {
    const rohre = (inhalt.koerper ?? []).filter((k) => k.gattung === 'geschuetz' && k._lage);
    if (!rohre.length) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const k of rohre) {
      const l = k._lage;
      const gross = klemm(Math.max(l.rx, l.ry) / 22, .8, 1.9);
      const wuerfel = streuung(`rauch|${k.partei}|${k.name}`);
      for (let i = 0; i < RAUCH_BALLEN; i++) {
        const wo = [wuerfel() - .5, wuerfel() - .5];
        const versatz = wuerfel();
        const phase = ((jetzt / RAUCH_DAUER) + versatz) % 1;
        /* Der Ballen steigt, und während er steigt, wird er größer und
           dünner – wie Rauch, nicht wie eine wandernde Scheibe. */
        const r = (5 + phase * 22) * gross;
        const x = l.cx + wo[0] * l.rx * 1.6 + RAUCH_WIND[0] * phase * 30 * gross;
        const y = l.cy + wo[1] * l.ry * 1.6 + RAUCH_WIND[1] * phase * 30 * gross;
        const dicht = Math.sin(phase * Math.PI) ** 1.5
          * (inhalt.schaubild ? .26 : .15) * a * k.deckung;
        if (dicht < .004) continue;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(226,222,212,${dicht.toFixed(4)})`);
        g.addColorStop(.6, `rgba(198,192,180,${(dicht * .42).toFixed(4)})`);
        g.addColorStop(1, 'rgba(180,176,166,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  },

  /**
   * Wird in dieser Station überhaupt gekämpft?
   *
   * Die Naht des Einflussfeldes entsteht schon, wenn zwei Heere nur nahe
   * beieinanderstehen. Funken darüber zu setzen hieße, den Kampf eine Station
   * zu früh zu behaupten – bei Breitenfeld zwei Stunden zu früh, denn die
   * Aufstellung dauerte einen halben Vormittag.
   *
   * Geraten wird das nicht, es steht in der Station: Ein Angriffspfeil, ein
   * geschlagener Verband oder auffahrende Geschütze. Wo nichts davon steht,
   * stehen die Heere einander gegenüber und warten – und das Feld bleibt
   * ruhig.
   */
  _gekaempft(inhalt) {
    if ((inhalt.pfeile ?? []).some((p) => !p.rueckzug && !p.finte)) return true;
    return (inhalt.koerper ?? []).some((k) => k.geschlagen || k.gattung === 'geschuetz');
  },

  /**
   * Aufblitzen dort, wo der Boden strittig ist.
   *
   * Die Zellen kommen aus dem Einflussfeld. Welche gerade brennt, folgt aus
   * der Uhr: Jedes Funkenfeld hat eine Lebenszeit, und aus der Nummer seines
   * Lebens wird die Zelle gezogen. Damit wandert das Feuer über die Naht,
   * ohne dass irgendwo eine Liste geführt würde.
   */
  _funken(ctx, inhalt, jetzt, a) {
    const heiss = this._heiss;
    if (!heiss?.length || !this._gekaempft(inhalt)) return;
    const zahl = Math.min(FUNKEN_ZAHL, Math.ceil(heiss.length / 3));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < zahl; i++) {
      const versatz = i * FUNKEN_LEBEN * .618;
      const leben = Math.floor((jetzt + versatz) / FUNKEN_LEBEN);
      // Aus der Nummer des Lebens die Zelle: derselbe Funke, dieselbe Stelle.
      let h = Math.imul(leben ^ (i * 0x9e3779b1), 0x85ebca6b);
      h ^= h >>> 13;
      const [x, y] = heiss[Math.abs(h) % heiss.length];
      const alter = ((jetzt + versatz) % FUNKEN_LEBEN) / FUNKEN_LEBEN;
      const hell = Math.sin(alter * Math.PI) ** 2.2 * a * (inhalt.schaubild ? .85 : .5);
      if (hell < .01) continue;
      const r = 2.2 + alter * 3.4;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.6);
      g.addColorStop(0, `rgba(255,236,196,${hell.toFixed(4)})`);
      g.addColorStop(.4, `rgba(255,186,104,${(hell * .5).toFixed(4)})`);
      g.addColorStop(1, 'rgba(255,150,70,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r * 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },

  /** Was sich von einem geschlagenen Verband löst und nach hinten treibt. */
  _splitter(ctx, inhalt, jetzt, a) {
    const weichende = (inhalt.koerper ?? []).filter((k) => k.geschlagen && k._lage);
    if (!weichende.length) return;
    ctx.save();
    ctx.lineCap = 'round';
    for (const k of weichende) {
      const l = k._lage;
      const [mx, my, ux, uy] = hauptachse(l.p);
      let vx = -uy;
      let vy = ux;
      const lager = this._lager?.get(k.partei);
      if (lager && ((mx - lager[0]) * vx + (my - lager[1]) * vy) < 0) { vx = -vx; vy = -vy; }
      // Nach hinten heißt: der Front den Rücken zu.
      vx = -vx; vy = -vy;
      const weit = Math.max(l.rx, l.ry) * 1.9 + 26;
      const wuerfel = streuung(`splitter|${k.partei}|${k.name}`);
      ctx.strokeStyle = mitAlpha(k.farbe, .9);
      for (let i = 0; i < SPLITTER_ZAHL; i++) {
        const quer = (wuerfel() - .5) * 1.7;
        const versatz = wuerfel();
        const phase = ((jetzt / SPLITTER_DAUER) + versatz) % 1;
        const s = phase * weit;
        const x = mx + (ux * quer * l.rx) + vx * s;
        const y = my + (uy * quer * l.ry) + vy * s;
        const sicht = Math.sin(phase * Math.PI) * a * k.deckung * (inhalt.schaubild ? .8 : .55);
        if (sicht < .02) continue;
        ctx.globalAlpha = sicht;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(x - vx * 3.5, y - vy * 3.5);
        ctx.lineTo(x + vx * 3.5, y + vy * 3.5);
        ctx.stroke();
      }
    }
    ctx.restore();
  },

  /** Die gesammelte Front zeichnen – über Gelände und Truppen. */
  _frontlinie(ctx, a, inhalt) {
    const striche = this._front;
    if (!striche?.length) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = inhalt.schaubild ? 'rgba(255,206,138,.95)' : 'rgba(226,178,116,.8)';
    for (const [x, y, tx, ty, staerke] of striche) {
      /* Der Strich liegt längs der Front. Im Schaubild überlappen die Striche
         leicht und ergeben eine durchgehende Linie; im Stich bleiben sie
         getrennt und lesen sich als Schraffur. */
      const laenge = FELD_TEILER * (inhalt.schaubild ? 1.25 : .85) * (.55 + staerke);
      ctx.globalAlpha = a * klemm(staerke * 2.1, .18, 1) * (inhalt.schaubild ? 1 : .8);
      ctx.lineWidth = inhalt.schaubild ? 2.1 : 1.5;
      ctx.beginPath();
      ctx.moveTo(x - tx * laenge / 2, y - ty * laenge / 2);
      ctx.lineTo(x + tx * laenge / 2, y + ty * laenge / 2);
      ctx.stroke();
    }
    ctx.restore();
  },

  _buehne(ctx, groesse, inhalt) {
    const a = inhalt.buehne ?? 1;
    if (a <= 0) return;
    const [cx, cy] = this._feldMitte(inhalt, groesse);
    const r = Math.hypot(groesse.x, groesse.y) / 2;
    const g = ctx.createRadialGradient(
      cx, cy, r * .34,
      cx, cy, r,
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
    if (art.schummer) this._schummer(ctx, art, p);
    if (art.wellen) this._wellen(ctx, art, p);
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
          /* Ein Kringel mit Stiel – das übliche Waldzeichen. Der Stiel stand
             im Kommentar, gezeichnet war er nie; und ohne ihn ist ein Wald
             eine Punktkörnung wie jede andere. */
          ctx.arc(x, y - 1.4, 2.1, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(x, y + .5);
          ctx.lineTo(x, y + 3.1);
          ctx.stroke();
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

  /**
   * Schummerung: der Höhenzug bekommt eine Sonne.
   *
   * Die Böschungsschraffur sagt, wo es hinaufgeht. Sie sagt es aber nur an der
   * Kante, und in der Mitte bleibt der Rücken eine flache Tönung. Ein
   * schräges Licht von Nordwesten – die Übereinkunft aller Reliefkarten seit
   * Dufour – macht daraus eine Form: helle Flanke gegen die Sonne, dunkle im
   * Schatten, und dazwischen die Höhe.
   *
   * Es ist eine Andeutung, keine Geländemessung: Woher der Hang wirklich
   * ansteigt, steht in keiner Datei. Was gezeichnet wird, ist die Wölbung, die
   * der Umriss ohnehin behauptet – nur so, dass man sie sieht.
   */
  _schummer(ctx, art, p) {
    let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
    for (const [x, y] of p) {
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    const r = Math.max(x1 - x0, y1 - y0) / 2;
    if (r < 8) return;
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    ctx.save();
    ctx.beginPath();
    weicherWeg(ctx, p, GELAENDE_SPANNUNG);
    ctx.clip();
    // Licht von Nordwesten, also von links oben.
    const g = ctx.createLinearGradient(cx - r * .7, cy - r * .7, cx + r * .7, cy + r * .7);
    g.addColorStop(0, 'rgba(255,238,204,.16)');
    g.addColorStop(.46, 'rgba(255,238,204,0)');
    g.addColorStop(.54, 'rgba(20,14,8,0)');
    g.addColorStop(1, 'rgba(20,14,8,.22)');
    ctx.fillStyle = g;
    ctx.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4);
    ctx.restore();
  },

  /**
   * Wellen auf dem Wasser.
   *
   * Eine blaue Fläche ist auf einer Stabskarte kein Meer, sondern ein Fleck.
   * Zwei kurze Bögen übereinander, versetzt gesetzt, sind das Zeichen für
   * offenes Wasser – dieselbe Signatur, die die Seekarten seit je führen. Sie
   * ruhen; bewegt wird auf diesem Blatt nur, was kämpft.
   */
  _wellen(ctx, art, p) {
    let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
    for (const [x, y] of p) {
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    if (x1 - x0 > 900 || y1 - y0 > 900) return;
    ctx.save();
    ctx.beginPath();
    weicherWeg(ctx, p, GELAENDE_SPANNUNG);
    ctx.clip();
    ctx.strokeStyle = mitAlpha(art.farbe, .4);
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    const d = 15;
    for (let y = y0; y < y1 + d; y += d) {
      for (let x = x0 + ((Math.round(y / d) % 2) * d) / 2; x < x1 + d; x += d) {
        ctx.beginPath();
        ctx.moveTo(x - 4.5, y);
        ctx.quadraticCurveTo(x - 2.2, y - 2.2, x, y);
        ctx.quadraticCurveTo(x + 2.2, y + 2.2, x + 4.5, y);
        ctx.stroke();
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

  /**
   * Der Schwerpunkt jeder Partei – die Mitte all ihrer Verbände.
   *
   * Er wird für nichts Sichtbares gebraucht, nur für eine Entscheidung: In
   * welche der beiden Richtungen quer zur Aufstellung ein Verband schaut.
   * Vom eigenen Heer weg ist nach vorn; das gilt bei jeder Aufstellung, die
   * nicht gerade eingekesselt ist.
   */
  _schwerpunkte(koerper) {
    const summe = new Map();
    for (const k of koerper) {
      const l = k._lage;
      if (!l || k.partei == null) continue;
      const s = summe.get(k.partei) ?? [0, 0, 0];
      s[0] += l.cx; s[1] += l.cy; s[2] += 1;
      summe.set(k.partei, s);
    }
    const mitte = new Map();
    for (const [id, [x, y, n]] of summe) if (n) mitte.set(id, [x / n, y / n]);
    return mitte;
  },

  /**
   * Die Körner eines Verbands setzen und zeichnen.
   *
   * Die Zahl der Körner folgt der Mannschaftszahl, nicht der Fläche: Ein
   * Verband von zwanzigtausend Mann trägt mehr Zeichen als einer von zweien,
   * auch wenn beide gleich groß gezeichnet sind – und genau das soll man
   * sehen. Nach oben begrenzt die Fläche: Wo kein Platz für ein Korn ist,
   * wird keines gesetzt, sonst entstünde eine zweite Schraffur.
   *
   * Gesetzt wird in einem Raster, das an der Hauptachse hängt und in jeder
   * Zelle einen festen Zufall trägt. Fest heißt: aus dem Namen des Verbands
   * gezogen, nicht aus der Zeit. Ein Raster, das in jedem Bild neu würfelt,
   * flimmert; eines, das gar nicht würfelt, sieht gedruckt aus.
   */
  _koerner(ctx, k, l, staerkeAn) {
    const p = l.p;
    const [mx, my, ux, uy] = hauptachse(p);
    /* Quer zur Hauptachse: dorthin schaut der Verband. Das Vorzeichen kommt
       vom eigenen Heer – nach vorn ist vom eigenen Schwerpunkt weg. */
    let vx = -uy;
    let vy = ux;
    const lager = this._lager?.get(k.partei);
    if (lager && ((mx - lager[0]) * vx + (my - lager[1]) * vy) < 0) { vx = -vx; vy = -vy; }

    /* Ausdehnung in beiden Achsen – daraus Zellenzahl und Zellengröße. */
    let u0 = Infinity; let u1 = -Infinity; let v0 = Infinity; let v1 = -Infinity;
    for (const [x, y] of p) {
      const dx = x - mx;
      const dy = y - my;
      const u = dx * ux + dy * uy;
      const v = dx * vx + dy * vy;
      if (u < u0) u0 = u; if (u > u1) u1 = u;
      if (v < v0) v0 = v; if (v > v1) v1 = v;
    }
    const lu = Math.max(u1 - u0, 1);
    const lv = Math.max(v1 - v0, 1);

    const platz = Math.floor((lu * lv) / (KORN_ENGE * KORN_ENGE));
    const mann = zahlAus(k.staerke);
    const dichte = mann >= KORN_HEER
      ? klemm(.55 + Math.log10(mann / KORN_HEER) * .45, .55, 1)
      : .55;
    const n = klemm(Math.round(platz * dichte), KORN_MIN, KORN_MAX);
    if (n < KORN_MIN) return;

    /* Zellen so aufteilen, dass sie ungefähr quadratisch werden. */
    const spalten = Math.max(1, Math.round(Math.sqrt((n * lu) / lv)));
    const reihen = Math.max(1, Math.ceil(n / spalten));
    const wuerfel = streuung(`${k.partei}|${k.name}|${k.gattung}|${n}`);
    const gross = klemm(Math.min(lu / spalten, lv / reihen) / 9, .55, 1.5);

    ctx.save();
    ctx.beginPath();
    weicherWeg(ctx, p);
    ctx.clip();
    ctx.globalAlpha = k.deckung * (1 - l.zeichen) * staerkeAn * (k.geschlagen ? .45 : .92);
    ctx.strokeStyle = mitAlpha(k.farbe, .95);
    ctx.fillStyle = mitAlpha(k.farbe, .95);
    ctx.lineWidth = Math.max(.9, 1.25 * gross);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let r = 0; r < reihen; r++) {
      for (let s = 0; s < spalten; s++) {
        const ju = wuerfel() - .5;
        const jv = wuerfel() - .5;
        /* Ein geschlagener Verband steht nicht mehr in Gliedern: Dort darf
           der Zufall doppelt so weit ausschlagen. */
        const streu = k.geschlagen ? .78 : .34;
        const u = u0 + ((s + .5) / spalten + ju * streu / spalten) * lu;
        const v = v0 + ((r + .5) / reihen + jv * streu / reihen) * lv;
        /* Kein Punkt-im-Umriss-Test: Der Umriss ist schon als Maske gesetzt,
           und er ist dort weich gezogen – ein Test an den rohen Ecken träfe
           eine andere Kante als die, an der wirklich beschnitten wird. */
        this._korn(ctx, k.gattung, mx + u * ux + v * vx, my + u * uy + v * vy, ux, uy, vx, vy, gross);
      }
    }
    ctx.restore();
  },

  /**
   * Ein einzelnes Korn.
   *
   * `u` liegt längs der Front, `v` zeigt nach vorn. Jede Gattung bekommt ein
   * Zeichen, das man auch einzeln erkennt: Fußvolk einen Querstrich, weil es
   * in Gliedern steht; Bogenschützen einen Winkel, der nach vorn zeigt;
   * Reiterei einen Schrägstrich in Bewegungsrichtung; Geschütze einen Punkt
   * mit Rohr; Schiffe einen Rumpf. Es sind dieselben Zeichen wie in der
   * Zeichenerklärung – nur einzeln statt gekachelt.
   */
  _korn(ctx, gattung, x, y, ux, uy, vx, vy, g) {
    const a = 3.1 * g;
    ctx.beginPath();
    if (gattung === 'reiter') {
      ctx.moveTo(x - (ux + vx) * a * .8, y - (uy + vy) * a * .8);
      ctx.lineTo(x + (ux + vx) * a * .8, y + (uy + vy) * a * .8);
      ctx.stroke();
    } else if (gattung === 'bogen') {
      ctx.moveTo(x - ux * a - vx * a * .7, y - uy * a - vy * a * .7);
      ctx.lineTo(x + vx * a * .7, y + vy * a * .7);
      ctx.lineTo(x + ux * a - vx * a * .7, y + uy * a - vy * a * .7);
      ctx.stroke();
    } else if (gattung === 'geschuetz') {
      ctx.arc(x, y, 1.5 * g, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + vx * 1.4 * g, y + vy * 1.4 * g);
      ctx.lineTo(x + vx * a * 1.5, y + vy * a * 1.5);
      ctx.stroke();
    } else if (gattung === 'schiff') {
      ctx.moveTo(x - vx * a * 1.3, y - vy * a * 1.3);
      ctx.quadraticCurveTo(x + ux * a * .8, y + uy * a * .8, x + vx * a * 1.3, y + vy * a * 1.3);
      ctx.quadraticCurveTo(x - ux * a * .8, y - uy * a * .8, x - vx * a * 1.3, y - vy * a * 1.3);
      ctx.stroke();
    } else if (gattung === 'fuss') {
      ctx.moveTo(x - ux * a, y - uy * a);
      ctx.lineTo(x + ux * a, y + uy * a);
      ctx.stroke();
    } else {
      // Gemischt: ein Korn ohne Aussage über die Waffe.
      ctx.arc(x, y, 1.35 * g, 0, Math.PI * 2);
      ctx.fill();
    }
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

    /* Schraffur und Körner lösen einander ab. Kleine Verbände tragen das
       Muster – dort wären fünf Körner nur fünf Flecken. Große tragen die
       Körner. Dazwischen liegt beides übereinander, sonst springt das Bild
       beim Zoomen. */
    const koernung = klemm((Math.max(l.rx, l.ry) * 2 - KORN_AB) / (KORN_VOLL - KORN_AB), 0, 1);
    const muster = musterFuer(ctx, k.farbe, k.gattung);
    if (muster && koernung < .995) {
      ctx.save();
      ctx.beginPath();
      weicherWeg(ctx, p);
      ctx.clip();
      ctx.globalAlpha = k.deckung * (1 - l.zeichen) * (k.geschlagen ? .4 : .85) * (1 - koernung);
      ctx.fillStyle = muster;
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = k.deckung * (1 - l.zeichen);
    }
    if (koernung > .005) this._koerner(ctx, k, l, koernung);

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
    this._regungRahmen = null;
    /* Einmal abgefragt, nicht je Bild: Wer weniger Bewegung eingestellt hat,
       bekommt ein stehendes Feld statt ziehendem Rauch. */
    this._wenigerBewegung = window.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null;
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
  start(battle, { danach } = {}) {
    // Nimmt jetzt den geladenen Verlauf statt einer Kennung: Er wird einzeln
    // geholt, und wer ihn holt, hat ihn schon in der Hand.
    if (!battle?.stationen?.length) return null;
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
    this._regung();

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
    /* Ein von Hand gesetzter Rahmen darf beides weiter: enger, weil wer ihn
       einträgt weiß, was er will – und vor allem weiter, denn das
       Übersichtsblatt zeigt den Anmarsch über hundert Kilometer, wo das
       Schlachtfeld zwei misst. */
    const zoom = rahmen.hand
      ? klemm(roh, 2, z0 + 1.5)
      : klemm(roh, z0 - 2, z0 + .8);
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

  /**
   * Zwischen „Stich“ und „Schaubild“ umschalten.
   *
   * Es sind dieselben Daten und dieselbe Station – nur andere Regler. Deshalb
   * wird auch nichts neu berechnet, nur neu gezeichnet: Wer im dritten Zug
   * umschaltet, bleibt im dritten Zug.
   */
  setzeBlick(wert) {
    setzeDarstellung(wert);
    this._bild();
    return darstellung();
  }

  close() {
    this.stop();
    clearTimeout(this._anflugTimer);
    cancelAnimationFrame(this._pulsRahmen);
    cancelAnimationFrame(this._regungRahmen);
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

  /**
   * Das Feld hört nicht auf zu leben, wenn der Verlauf steht.
   *
   * Bisher wurde nur gezeichnet, während der Verlauf lief – wer anhielt, sah
   * ein Standbild. Das ist falsch für das, was eine Station zeigt: Die Station
   * ist kein Augenblick, sondern eine Viertelstunde Schlacht. Rauch zieht
   * darin ab, Geschlagene treiben weiter, an den Nähten funkt es. Deshalb
   * läuft ein zweiter, langsamerer Takt, solange die Schlacht offen ist.
   *
   * Er zeichnet höchstens REGUNG_TAKT-mal in der Sekunde und schweigt ganz,
   * wenn der Verlauf ohnehin läuft oder das Betriebssystem weniger Bewegung
   * verlangt – dann steht das Bild still, wie es soll.
   */
  _regung() {
    cancelAnimationFrame(this._regungRahmen);
    if (this._wenigerBewegung?.matches) return;
    let zuletzt = 0;
    const takt = (jetzt) => {
      if (!this.battle) return;
      this._regungRahmen = requestAnimationFrame(takt);
      if (this.playing || this._anflug) return;
      if (jetzt - zuletzt < 1000 / REGUNG_TAKT) return;
      zuletzt = jetzt;
      this._bild();
    };
    this._regungRahmen = requestAnimationFrame(takt);
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
          /* Beim Anhalten steht der Pfeil ganz da.
           *
           * Er wächst nur, solange der Verlauf läuft - wer anhält, will die
           * Aussage der Station sehen, nicht den Stand einer Animation. Vorher
           * war eine angehaltene Station am Anfang ihres Fensters pfeillos,
           * und das Übersichtsblatt, das aus nichts als Wegen besteht, wäre
           * ein leeres Blatt gewesen. */
          fortschritt: this.playing ? klemm(teil / PFEIL_BIS, 0, 1) : 1,
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
        partei: s.partei,
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
          partei: s.partei,
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
    // Die Mitte des Feldes, nicht die des Fensters: Seit die Karte den
    // Ausschnitt je Station legt, sitzt das Feld im freien Raum neben der
    // Tafel. Eine Vignette auf die Fenstermitte zöge daneben zusammen.
    const rahmen = this._rahmenFuer(this._station);
    const feldMitte = rahmen
      ? [(rahmen[0][0] + rahmen[1][0]) / 2, (rahmen[0][1] + rahmen[1][1]) / 2]
      : b.mitte;

    this.leinwand.setInhalt({
      // Auf dem Übersichtsblatt kein Gelände: Der Höhenzug von Mont-Saint-Jean
      // wäre dort ein Strich von acht Bildpunkten, und acht solcher Striche
      // übereinander sind ein Fleck. Das Blatt zeigt den Anmarsch.
      gelaende: st[i].uebersicht ? [] : (b.gelaende ?? []),
      gelaendeDeckung: auf,
      buehne: auf,
      grund: auf,
      see: !!b.see,
      schaubild: darstellung() === 'schaubild',
      feldMitte,
      // Das Blatt liegt um das freie Feld – dieselbe Messung, mit der auch
      // der Ausschnitt je Station gelegt wird.
      blatt: this._randHolen(),
      titel: b.name,
      datum: b.datum,
      // Auf dem Übersichtsblatt liegt ein Rechteck um den Ausschnitt, den der
      // Verlauf gleich zeigt: Der Maßstabssprung wird dadurch sichtbar statt
      // überraschend – dasselbe, was das Beiblatt umgekehrt tut.
      feldRahmen: st[i].uebersicht ? this._rahmenFuer(i + 1) : null,
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
