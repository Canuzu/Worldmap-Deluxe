#!/usr/bin/env node
/**
 * Rastert die Religionsebene – als Prüfwerkzeug, nicht als Kartenbild.
 *
 * Die Karte zeichnet die Religion je Gemeinwesen. Dieses Raster daneben
 * beantwortet dieselbe Frage Ort für Ort und dient zweierlei: Es rechnet
 * zurück, welche Religion in einem Gemeinwesen die vorherrschende ist – die
 * Tafel sagt dann „Hinduismus, 74 % der Fläche" statt eines Wortes vom
 * Schwerpunkt –, und es macht die Raumregeln prüfbar. Gegen 93 feste
 * Bezugspunkte gehalten hat es einen Haufen Fehler aufgedeckt, die auf einer
 * Karte je Land unsichtbar blieben: ein Tibet-Rechteck bis Delhi, ein
 * Britisch-Indien im Persischen Golf, ein afrikanisches Damaskus.
 *
 * Es wird deshalb nach `build/` geschrieben und nicht ausgeliefert.
 *
 * Die erste Fassung gab jedem Gemeinwesen eine Farbe. Damit war das Osmanische
 * Reich einfarbig – ein Reich, das von Ungarn bis Ägypten reichte und dessen
 * Konfessionsgrenzen quer hindurchliefen. Genau die waren nicht zu sehen, und
 * genau um sie ging es.
 *
 * Jetzt liegt unter der Karte ein Gitter von einem Viertelgrad – rund 28 km
 * am Äquator, 1440 mal 720 Zellen. Jede Landzelle bekommt zwei Angaben:
 *
 *   volk  – aus den Raum-Zeit-Regeln, also aus dem Ort und dem Jahr
 *   staat – von dem Gemeinwesen, dem die Zelle gehört
 *
 * Die Zellen wissen nichts von Staatsgrenzen, und das ist richtig: Der Glaube
 * einer Landschaft hört nicht an einer Grenze auf. Die Grenzen liegen als
 * dünne Linien darüber, und erst im Zusammenspiel wird die Aussage sichtbar –
 * dass eine Konfessionsgrenze mitten durch ein Reich läuft und nicht an
 * seinem Rand.
 *
 * Die Treppenstufen des Gitters sieht man nur im Landesinneren. An den Küsten
 * nicht: Dort liegt die Meeresfläche darüber, eine deckende Ebene mit einem
 * Loch je Landmasse. Sie schneidet das Raster sauber an der echten Uferlinie ab.
 *
 * Aufruf: npm run build:religion (läuft nach der Gemeinwesen-Tabelle)
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { feature as topoFeature } from 'topojson-client';

const ROOT = path.resolve(import.meta.dirname, '..');
const lies = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

const VOKABULAR = lies('src/data/religion/vokabular.json');
const REGELN = lies('src/data/religion/regeln.json').regeln;
const SCHNITTE = lies('public/data/epochs.json').epochs;

/** Ein Viertelgrad. Feiner lohnt nicht: Die Regeln dahinter sind gröber. */
const SCHRITT = .25;
const BREITE = Math.round(360 / SCHRITT);
const HOEHE = Math.round(180 / SCHRITT);

/* Feste Reihenfolge der Klassen – der Index landet im Raster, der Name nur
   einmal im Kopf der Datei. */
const KLASSEN = Object.keys(VOKABULAR.klassen);
const INDEX = new Map(KLASSEN.map((k, i) => [k, i + 1])); // 0 bleibt „kein Land"

/* --------------------------------------------------------- Regeln je Zelle */

const imFenster = (klasse, jahr) => {
  const m = VOKABULAR.klassen[klasse];
  if (!m) return false;
  return jahr >= (m.seit ?? -Infinity) && jahr <= (m.bis ?? Infinity);
};

/**
 * Regeln vorsortieren: Für ein festes Jahr fällt der größte Teil der Regeln
 * weg. Das einmal je Zeitschnitt zu tun statt einmal je Zelle spart bei
 * 300.000 Landzellen den Löwenanteil der Rechenzeit.
 */
function regelnFuer(jahr) {
  return REGELN.filter((r) => jahr >= (r.von ?? -Infinity)
    && jahr <= (r.bis ?? Infinity)
    && imFenster(r.volk, jahr));
}

function klasseFuer(regeln, lon, lat) {
  for (const r of regeln) {
    for (const [w, s, o, n] of r.felder) {
      if (lon >= w && lon <= o && lat >= s && lat <= n) return r.volk;
    }
  }
  return null;
}

/* ------------------------------------------------------ Flächen ins Gitter */

/**
 * Eine Fläche zeilenweise füllen.
 *
 * Für jede Gitterzeile wird die Breitenkreis-Linie mit allen Kanten der Fläche
 * geschnitten, die Schnittpunkte werden sortiert und paarweise gefüllt. Damit
 * sind Löcher – die Schweiz in Italien, der Vatikan in Rom – von selbst
 * richtig: Ein Loch liefert zwei weitere Schnittpunkte und dreht die Füllung
 * zweimal um.
 *
 * Das ist erheblich schneller als für jede Zelle zu prüfen, ob sie in der
 * Fläche liegt: Statt Zellen mal Kanten kostet es Zeilen mal Kanten.
 */
function malen(ziel, ringe, wert) {
  let sMin = 90; let sMax = -90;
  for (const ring of ringe) {
    for (const [, lat] of ring) {
      if (lat < sMin) sMin = lat;
      if (lat > sMax) sMax = lat;
    }
  }
  const y0 = Math.max(0, Math.floor((90 - sMax) / SCHRITT));
  const y1 = Math.min(HOEHE - 1, Math.ceil((90 - sMin) / SCHRITT));

  const treffer = [];
  for (let y = y0; y <= y1; y++) {
    const lat = 90 - (y + .5) * SCHRITT;
    treffer.length = 0;
    for (const ring of ringe) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];
        if ((yi > lat) !== (yj > lat)) {
          treffer.push(xi + ((lat - yi) / (yj - yi)) * (xj - xi));
        }
      }
    }
    if (treffer.length < 2) continue;
    treffer.sort((a, b) => a - b);
    for (let k = 0; k + 1 < treffer.length; k += 2) {
      const von = Math.max(0, Math.ceil((treffer[k] + 180) / SCHRITT - .5));
      const bis = Math.min(BREITE - 1, Math.floor((treffer[k + 1] + 180) / SCHRITT - .5));
      const reihe = y * BREITE;
      for (let x = von; x <= bis; x++) ziel[reihe + x] = wert;
    }
  }
}

/** Ringe einer GeoJSON-Geometrie, Fläche für Fläche. */
function* flaechen(geom) {
  if (!geom) return;
  if (geom.type === 'Polygon') yield geom.coordinates;
  else if (geom.type === 'MultiPolygon') yield* geom.coordinates;
}

/* ------------------------------------------------------------- Packen */

/**
 * Lauflängen je Zeile, dann durch zlib.
 *
 * Ein Raster von 1440 mal 720 wären roh eine Million Zahlen. Religionen liegen
 * aber in großen zusammenhängenden Flächen – zeilenweise gezählt bleiben ein
 * paar tausend Läufe übrig, und die packt zlib noch einmal auf einen Bruchteil.
 * Entpackt wird im Browser mit einer Schleife von zehn Zeilen.
 */
function packen(gitter) {
  const laeufe = [];
  let lauf = gitter[0];
  let zahl = 0;
  for (let i = 0; i < gitter.length; i++) {
    if (gitter[i] === lauf) { zahl++; continue; }
    laeufe.push(zahl, lauf);
    lauf = gitter[i];
    zahl = 1;
  }
  laeufe.push(zahl, lauf);
  return laeufe;
}

/* ------------------------------------------------------------ Landmaske

   Nicht alles Land gehört einem Gemeinwesen. Die Sahara zwischen den
   Sahelreichen, das Innere Australiens, weite Teile Sibiriens sind im
   Datensatz unbeansprucht – und blieben im Raster ein Loch, obwohl dort
   Menschen lebten und glaubten. Timbuktu fiel im Jahr 1000 aus der Karte.

   Die Maske kommt aus der Meeresfläche: Sie ist ein Polygon mit einem Loch je
   Landmasse. Wer sie zeilenweise füllt, hat das Meer – und alles Übrige ist
   Land. */
const MEER = (() => {
  const topo = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/base/ocean.json'), 'utf8'));
  const objKey = Object.keys(topo.objects)[0];
  const gitter = new Uint8Array(BREITE * HOEHE);
  for (const f of topoFeature(topo, topo.objects[objKey]).features) {
    for (const ringe of flaechen(f.geometry)) malen(gitter, ringe, 1);
  }
  return gitter;
})();

/* --------------------------------------------------------------- Bauen */

const ZIEL = path.join(ROOT, 'build/religion-raster');
fs.mkdirSync(ZIEL, { recursive: true });

let bytes = 0;
let zellenGesamt = 0;

for (const meta of SCHNITTE) {
  const topoPfad = path.join(ROOT, 'public', meta.file);
  if (!fs.existsSync(topoPfad)) continue;
  const tabellePfad = path.join(ROOT, 'public/data/religion', `${meta.key}.json`);
  if (!fs.existsSync(tabellePfad)) continue;

  const jahr = meta.year;
  const tabelle = JSON.parse(fs.readFileSync(tabellePfad, 'utf8')).klassen;
  const topo = JSON.parse(fs.readFileSync(topoPfad, 'utf8'));
  const objKey = Object.keys(topo.objects)[0];
  const teile = topoFeature(topo, topo.objects[objKey]).features;

  /* Erst das Land malen – die Zelle merkt sich, welchem Gemeinwesen sie
     gehört. Kleine Flächen zuletzt, damit ein Stadtstaat nicht vom Reich
     ringsum übermalt wird. */
  const besitz = new Int16Array(BREITE * HOEHE);
  const namen = [''];
  const namenIndex = new Map();
  const sortiert = [...teile].sort((a, b) => (b.properties?.a ?? 0) - (a.properties?.a ?? 0));
  for (const f of sortiert) {
    const name = f.properties?.n;
    if (!name) continue;
    let idx = namenIndex.get(name);
    if (idx === undefined) {
      idx = namen.length;
      namen.push(name);
      namenIndex.set(name, idx);
    }
    for (const ringe of flaechen(f.geometry)) malen(besitz, ringe, idx);
  }

  /* Dann die Religion je Zelle: das Volk aus den Regeln, die Herrschaft von
     dem Gemeinwesen, dem die Zelle gehört. */
  const regeln = regelnFuer(jahr);
  const volk = new Uint8Array(BREITE * HOEHE);
  const staat = new Uint8Array(BREITE * HOEHE);
  let land = 0;

  for (let y = 0; y < HOEHE; y++) {
    const lat = 90 - (y + .5) * SCHRITT;
    for (let x = 0; x < BREITE; x++) {
      const i = y * BREITE + x;
      const wem = besitz[i];
      // Land ist, was einem Gemeinwesen gehört – oder was schlicht nicht Meer
      // ist. Unbeanspruchtes Land bekommt seine Religion aus der Raumregel und
      // keine Herrschaft.
      if (!wem && MEER[i]) continue;
      land++;
      const lon = -180 + (x + .5) * SCHRITT;
      const eintrag = wem ? tabelle[namen[wem]] : null;
      const ausRegel = klasseFuer(regeln, lon, lat);
      // Ohne Regel gilt, was für das Gemeinwesen insgesamt gilt – besser eine
      // grobe Angabe als ein Loch in der Karte.
      const v = ausRegel ?? eintrag?.[0];
      /* „lokal" heißt: Die Herrschaft folgt dem Ort. Das Heilige Römische
         Reich nach 1555 hatte kein einheitliches Bekenntnis mehr – cuius
         regio, eius religio –, und ein katholischer Kaiser über einem
         lutherischen Hamburg wäre eine Behauptung, die die Reichsverfassung
         ausdrücklich aufhob. */
      const roh = eintrag?.[1];
      const s = (!roh || roh === 'lokal') ? v : roh;
      if (v) volk[i] = INDEX.get(v) ?? 0;
      if (s) staat[i] = INDEX.get(s) ?? 0;
    }
  }
  zellenGesamt += land;

  /* Rückrechnung: Was glaubt die Mehrheit eines Gemeinwesens?
   *
   * Die Tafel fragt nach einem Land, die Karte zeigt Orte. Bisher kam beides
   * aus verschiedenen Quellen – die Tafel aus dem Schwerpunkt, die Karte aus
   * den Zellen –, und sie widersprachen sich: Das Mogulreich stand auf der
   * Karte hinduistisch und in der Tafel sunnitisch, weil sein Schwerpunkt im
   * Indusraum lag.
   *
   * Jetzt zählt die Tafel die Zellen. „Überwiegend hinduistisch, 74 Prozent
   * der Fläche" ist außerdem eine bessere Auskunft als ein Wort, denn sie sagt
   * mit, wie eindeutig der Fall ist. */
  const zaehlung = new Map();
  for (let i = 0; i < besitz.length; i++) {
    const wem = besitz[i];
    if (!wem || !volk[i]) continue;
    let m = zaehlung.get(wem);
    if (!m) { m = new Map(); zaehlung.set(wem, m); }
    m.set(volk[i], (m.get(volk[i]) ?? 0) + 1);
  }
  for (const [wem, m] of zaehlung) {
    const eintrag = tabelle[namen[wem]];
    if (!eintrag) continue;
    let beste = 0;
    let bestZahl = 0;
    let summe = 0;
    for (const [k, n] of m) {
      summe += n;
      if (n > bestZahl) { bestZahl = n; beste = k; }
    }
    if (!beste) continue;
    eintrag[0] = KLASSEN[beste - 1];
    eintrag[3] = Math.round(100 * bestZahl / summe);
  }
  fs.writeFileSync(tabellePfad, `${JSON.stringify({ jahr, klassen: tabelle })}\n`);

  const roh = JSON.stringify({
    jahr,
    breite: BREITE,
    hoehe: HOEHE,
    schritt: SCHRITT,
    klassen: KLASSEN,
    volk: packen(volk),
    staat: packen(staat),
  });
  const gepackt = zlib.gzipSync(Buffer.from(roh), { level: 9 });
  fs.writeFileSync(path.join(ZIEL, `${meta.key}.json`), roh);
  bytes += gepackt.length;
}

const dateien = fs.readdirSync(ZIEL).length;
console.log(`Religionsraster gebaut: ${dateien} Zeitschnitte, `
  + `${BREITE}×${HOEHE} Zellen zu ${SCHRITT}°.`);
console.log(`Landzellen im Schnitt: ${Math.round(zellenGesamt / Math.max(1, dateien))}.`);
console.log(`Übertragung gepackt: ${Math.round(bytes / dateien / 1024)} kB je Zeitschnitt.`);
