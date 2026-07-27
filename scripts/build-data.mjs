#!/usr/bin/env node
/**
 * Erzeugt aus den Rohdaten in ./data-src die web-tauglichen Datensätze
 * in ./public/data:
 *
 *   public/data/epochs.json          Metadaten aller Zeitschnitte + Epochenbänder
 *   public/data/epochs/<key>.json    TopoJSON je Zeitschnitt (vereinfacht, quantisiert)
 *   public/data/base/ocean.json      Meeresfläche, grob (Natural Earth 10 m)
 *   public/data/base/ocean-hd.json   Meeresfläche, hochaufgelöst
 *   public/data/base/lakes.json      Seen
 *   public/data/base/rivers.json     Flüsse
 *
 * Jedes Feature im Epochen-TopoJSON trägt:
 *   n  NAME            Name des Gemeinwesens
 *   s  SUBJECTO        übergeordnete Macht (Kolonialmacht o. Ä.)
 *   p  PARTOF          übergeordneter Kulturraum
 *   b  BORDERPRECISION 1 = grob, 2 = mittel, 3 = völkerrechtlich fixiert
 *   c  [lon, lat]      Ankerpunkt für die Beschriftung (Pol der Unzugänglichkeit)
 *   a  Fläche in km²
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { feature as topoFeature } from 'topojson-client';
import { anchorPoint } from './lib/polylabel.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const HIST_DIR = path.join(ROOT, 'data-src/historical');
const NE_DIR = path.join(ROOT, 'data-src/naturalearth');
const OUT_DIR = path.join(ROOT, 'public/data');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'wmd-'));

const MAPSHAPER = path.join(ROOT, 'node_modules/.bin/mapshaper');

/**
 * Korrekturen am Ursprungsdatensatz (siehe src/data/corrections.json).
 * Sie werden vor allem anderen angewandt, damit gleichnamig gewordene
 * Nachbarflächen im TopoJSON verschmelzen statt eine Grenze zu behalten.
 */
const CORRECTIONS = (() => {
  const file = path.join(ROOT, 'src/data/corrections.json');
  if (!fs.existsSync(file)) return {};
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const out = {};
  for (const [year, entry] of Object.entries(raw)) {
    if (year.startsWith('_')) continue;
    out[Number(year)] = entry;
  }
  return out;
})();

/** mapshaper-Ausdruck, der die Umbenennungen eines Zeitschnitts anwendet. */
function renameExpression(year) {
  const rename = CORRECTIONS[year]?.rename;
  if (!rename) return null;
  const cases = Object.entries(rename)
    .map(([from, to]) => `if (NAME === ${JSON.stringify(from)}) NAME = ${JSON.stringify(to)};`)
    .join(' ');
  return cases;
}

/**
 * Auflösung der hochaufgelösten Küstenlinie in Metern. 300 m liegt unterhalb
 * der Pixelgröße der höchsten Zoomstufe (rund 150 m/px) und ist damit die
 * praktische Grenze des Sichtbaren. Über --kueste einstellbar.
 */
const COAST_INTERVAL = Number(
  process.argv.find((a, i, all) => all[i - 1] === '--kueste') ?? 300,
);

/* ------------------------------------------------------------------ Epochen */

/** Epochenbänder – bestimmen Farbe und Beschriftung der Zeitleiste. */
const ERAS = [
  { id: 'iceage', from: -Infinity, to: -9001, name: 'Eiszeitalter', short: 'Eiszeit' },
  { id: 'neolithic', from: -9000, to: -3001, name: 'Jungsteinzeit', short: 'Neolithikum' },
  { id: 'bronze', from: -3000, to: -1201, name: 'Bronzezeit', short: 'Bronze' },
  { id: 'iron', from: -1200, to: -501, name: 'Eisenzeit', short: 'Eisen' },
  { id: 'antiquity', from: -500, to: 475, name: 'Antike', short: 'Antike' },
  { id: 'earlymiddle', from: 476, to: 1000, name: 'Frühmittelalter', short: 'Frühma.' },
  { id: 'highmiddle', from: 1001, to: 1300, name: 'Hochmittelalter', short: 'Hochma.' },
  { id: 'latemiddle', from: 1301, to: 1492, name: 'Spätmittelalter', short: 'Spätma.' },
  { id: 'earlymodern', from: 1493, to: 1648, name: 'Frühe Neuzeit', short: 'Frühe NZ' },
  { id: 'absolutism', from: 1649, to: 1788, name: 'Zeitalter des Absolutismus', short: 'Absolutismus' },
  { id: 'revolution', from: 1789, to: 1870, name: 'Revolutionen & Nationalstaaten', short: 'Revolutionen' },
  { id: 'imperialism', from: 1871, to: 1913, name: 'Hochimperialismus', short: 'Imperialismus' },
  { id: 'worldwars', from: 1914, to: 1945, name: 'Zeitalter der Weltkriege', short: 'Weltkriege' },
  { id: 'coldwar', from: 1946, to: 1991, name: 'Kalter Krieg', short: 'Kalter Krieg' },
  { id: 'present', from: 1992, to: Infinity, name: 'Gegenwart', short: 'Gegenwart' },
];

/** Kurze deutsche Überschriften für einzelne Zeitschnitte. */
const EPOCH_TITLES = {
  '-123000': 'Frühe Menschenformen',
  '-10000': 'Ende der letzten Eiszeit',
  '-8000': 'Beginn der Sesshaftigkeit',
  '-5000': 'Frühe Ackerbaukulturen',
  '-4000': 'Vor den ersten Städten',
  '-3000': 'Erste Hochkulturen',
  '-2000': 'Bronzezeitliche Reiche',
  '-1500': 'Blüte des Neuen Reichs',
  '-1000': 'Umbruch nach dem Bronzezeitkollaps',
  '-700': 'Assyrien und die Eisenzeit',
  '-500': 'Perserreich und griechische Poleis',
  '-400': 'Klassisches Griechenland',
  '-323': 'Tod Alexanders des Großen',
  '-300': 'Diadochenreiche',
  '-200': 'Rom und Han greifen aus',
  '-100': 'Späte Römische Republik',
  '-1': 'Zeitenwende',
  '100': 'Rom auf dem Höhepunkt',
  '200': 'Reiche im Umbruch',
  '300': 'Krise und Neuordnung',
  '400': 'Völkerwanderung',
  '500': 'Nach dem Fall Westroms',
  '600': 'Vorabend des Islam',
  '700': 'Arabische Expansion',
  '800': 'Karl der Große wird Kaiser',
  '900': 'Zerfall der Großreiche',
  '1000': 'Europa um die Jahrtausendwende',
  '1100': 'Zeit der Kreuzzüge',
  '1200': 'Aufstieg der Mongolen',
  '1279': 'Das Mongolenreich am Zenit',
  '1300': 'Spätmittelalterliche Ordnung',
  '1400': 'Nach der Großen Pest',
  '1492': 'Beginn der europäischen Expansion',
  '1500': 'Renaissance und Entdeckungen',
  '1530': 'Reformation und Konquista',
  '1600': 'Zeitalter der Handelskompanien',
  '1650': 'Nach dem Dreißigjährigen Krieg',
  '1700': 'Barockes Mächtesystem',
  '1715': 'Nach dem Spanischen Erbfolgekrieg',
  '1783': 'Unabhängigkeit der USA',
  '1800': 'Napoleonische Umwälzung',
  '1815': 'Wiener Kongress',
  '1880': 'Wettlauf um Afrika',
  '1900': 'Die Welt der Imperien',
  '1914': 'Vorabend des Ersten Weltkriegs',
  '1920': 'Nach den Pariser Vorortverträgen',
  '1930': 'Zwischenkriegszeit',
  '1938': 'Vorabend des Zweiten Weltkriegs',
  '1945': 'Ende des Zweiten Weltkriegs',
  '1960': 'Afrikanisches Jahr der Unabhängigkeit',
  '1994': 'Nach dem Ende der Sowjetunion',
  '2000': 'Jahrtausendwende',
  '2010': 'Gegenwart',
};

function eraFor(year) {
  return ERAS.find((e) => year >= e.from && year <= e.to) ?? ERAS[ERAS.length - 1];
}

function yearLabel(year) {
  // Jahreszahlen ohne Tausenderpunkt (1492, nicht 1.492); erst fünfstellige
  // Angaben werden gegliedert, sonst wird "123000 v. Chr." unlesbar.
  const abs = Math.abs(year);
  const digits = abs >= 10000 ? abs.toLocaleString('de-DE') : String(abs);
  return year < 0 ? `${digits} v. Chr.` : `${digits} n. Chr.`;
}

function keyFor(year) {
  return year < 0 ? `bc${Math.abs(year)}` : `ad${year}`;
}

/* ------------------------------------------------------------- Geo-Helfer */

const R_EARTH = 6371.0088;
const rad = (d) => (d * Math.PI) / 180;

/** Sphärische Ringfläche nach Chamberlain & Duquette (km²). */
function ringArea(ring) {
  let total = 0;
  for (let i = 0, n = ring.length; i < n; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % n];
    total += rad(x2 - x1) * (2 + Math.sin(rad(y1)) + Math.sin(rad(y2)));
  }
  return Math.abs((total * R_EARTH * R_EARTH) / 2);
}

function geometryArea(geom) {
  if (!geom) return 0;
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.type === 'MultiPolygon' ? geom.coordinates : [];
  let area = 0;
  for (const poly of polys) {
    poly.forEach((ring, i) => {
      area += i === 0 ? ringArea(ring) : -ringArea(ring);
    });
  }
  return Math.max(0, area);
}

/* --------------------------------------------------------------- Pipeline */

function mapshaper(args) {
  return execFileSync(MAPSHAPER, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 28 });
}

/**
 * Quantisierungsraster des TopoJSON. 1e6 entspricht über die Weltausdehnung
 * rund 40 m – deutlich feiner als ein Bildschirmpixel bei der höchsten
 * Zoomstufe und damit unsichtbar.
 */
const QUANT = '1e6';

/**
 * Grenzverläufe werden bewusst NICHT vereinfacht. Die Rohdaten enthalten je
 * Zeitschnitt nur 30.000 bis 110.000 Stützpunkte; als quantisiertes TopoJSON
 * mit geteilten Bögen bleibt das je Datei im Bereich weniger Hundert Kilobyte.
 * Jede Ausdünnung wäre sichtbar, ohne nennenswert Ladezeit zu sparen.
 */
function buildEpoch(entry) {
  const src = path.join(HIST_DIR, entry.filename);
  const key = keyFor(entry.year);
  const topoPath = path.join(TMP, `${key}.topo.json`);

  const fix = renameExpression(entry.year);

  mapshaper([
    src,
    '-filter', 'NAME != null && NAME !== ""',
    ...(fix ? ['-each', fix] : []),
    // Nach dem Umbenennen zusammengehörige Flächen verschmelzen, damit keine
    // Grenze mitten durch ein Reich läuft.
    ...(fix ? ['-dissolve2', 'NAME', 'copy-fields=SUBJECTO,PARTOF,BORDERPRECISION'] : []),
    '-filter-fields', 'NAME,SUBJECTO,PARTOF,BORDERPRECISION',
    '-rename-fields', 'n=NAME,s=SUBJECTO,p=PARTOF,b=BORDERPRECISION',
    '-o', 'format=topojson', `quantization=${QUANT}`, topoPath,
  ]);

  const topo = JSON.parse(fs.readFileSync(topoPath, 'utf8'));
  const objKey = Object.keys(topo.objects)[0];
  const geometries = topo.objects[objKey].geometries;

  // Beschriftungsanker aus der vereinfachten Geometrie – genau dort, wo das
  // Label später auch gezeichnet wird.
  const decoded = topoFeature(topo, topo.objects[objKey]).features;

  // Flächen aus dem *unvereinfachten* Original, damit die Angaben belastbar sind.
  const raw = JSON.parse(fs.readFileSync(src, 'utf8'));
  const rawArea = new Map();
  for (const f of raw.features) {
    const name = f.properties?.NAME;
    if (!name) continue;
    rawArea.set(name, (rawArea.get(name) ?? 0) + geometryArea(f.geometry));
  }

  const r3 = (v) => Math.round(v * 1000) / 1000;

  geometries.forEach((geom, i) => {
    const props = geom.properties ?? (geom.properties = {});
    const anchor = anchorPoint(decoded[i]?.geometry);
    if (anchor) {
      props.c = anchor.point.map(r3);
      // Ausdehnung des beschrifteten Polygons – steuert Schriftgrad und
      // Sichtbarkeitsschwelle der Beschriftung.
      props.bb = anchor.bbox.map(r3);
      props.pa = Math.round(anchor.area * 100) / 100;
    }
    props.a = Math.round(rawArea.get(props.n) ?? 0);
    if (props.s === props.n) delete props.s;
    if (props.p === props.n) delete props.p;
  });

  // Rang nach Fläche – steuert Priorität und Schriftgröße der Beschriftung.
  const byArea = [...new Set(geometries.map((g) => g.properties.n))]
    .sort((a, b) => (rawArea.get(b) ?? 0) - (rawArea.get(a) ?? 0));
  const rankOf = new Map(byArea.map((n, i) => [n, i]));
  geometries.forEach((g) => { g.properties.r = rankOf.get(g.properties.n) ?? 999; });

  const outFile = path.join(OUT_DIR, 'epochs', `${key}.json`);
  fs.writeFileSync(outFile, JSON.stringify(topo));

  const era = eraFor(entry.year);
  return {
    year: entry.year,
    key,
    file: `data/epochs/${key}.json`,
    label: yearLabel(entry.year),
    title: EPOCH_TITLES[String(entry.year)] ?? '',
    era: era.id,
    polities: byArea.length,
    features: geometries.length,
    bytes: fs.statSync(outFile).size,
  };
}

/**
 * Basisgeometrien aus Natural Earth 1:10 Mio.
 *
 * Erzeugt wird nicht die Landmasse, sondern ihr Gegenstück: **das Meer** als
 * ein Polygon mit einem Loch je Landmasse. Diese Ebene liegt in der Karte
 * über den Grenzflächen und schneidet sie damit an der echten Küstenlinie ab.
 *
 * Der Umweg lohnt sich: Ein Zuschnitt jedes einzelnen Zeitschnitts an der
 * Küste würde jede der 53 Dateien um dieselben Küstenpunkte aufblähen (rund
 * das Vierfache). So wird die Küstenlinie genau einmal geladen – und die
 * Umrisse sind trotzdem exakt.
 *
 * Zwei Stufen: eine schlanke Übersicht für den sofortigen Start und eine
 * hochaufgelöste Fassung, die im Hintergrund nachrückt.
 */
function buildBase() {
  const landSources = ['ne_10m_land.geojson', 'ne_10m_minor_islands.geojson']
    .map((f) => path.join(NE_DIR, f))
    .filter((f) => fs.existsSync(f));

  if (!landSources.length) {
    console.warn('  ! keine Landdaten gefunden – Basisebenen werden übersprungen');
    return;
  }

  const merged = path.join(TMP, 'land-merged.json');
  mapshaper([
    ...landSources, 'combine-files',
    '-merge-layers', 'force',
    '-filter-fields',
    '-o', 'format=geojson', merged,
  ]);

  // Große Binnenseen aus der Landmaske herausnehmen, damit Kaspisches Meer,
  // Große Seen und Baikalsee als Wasser erscheinen statt als Staatsgebiet.
  const lakesSrc = path.join(NE_DIR, 'ne_10m_lakes.geojson');
  let landNet = merged;
  if (fs.existsSync(lakesSrc)) {
    const bigLakes = path.join(TMP, 'big-lakes.json');
    mapshaper([
      lakesSrc,
      '-filter', 'scalerank <= 2',
      '-filter-fields',
      '-o', 'format=geojson', bigLakes,
    ]);
    landNet = path.join(TMP, 'land-net.json');
    mapshaper([merged, '-erase', `source=${bigLakes}`, '-o', 'format=geojson', landNet]);
  }

  const levels = [
    { out: 'ocean.json', interval: 4000, note: 'Übersicht' },
    { out: 'ocean-hd.json', interval: COAST_INTERVAL, note: 'Detail' },
  ];
  for (const level of levels) {
    const simplified = path.join(TMP, `land-${level.interval}.json`);
    mapshaper([
      landNet,
      '-simplify', `interval=${level.interval}`, 'keep-shapes',
      '-o', 'format=geojson', simplified,
    ]);
    const out = path.join(OUT_DIR, 'base', level.out);
    // Weltrechteck über den gesamten schwenkbaren Bereich, abzüglich Land.
    mapshaper([
      '-rectangle', 'bbox=-360,-90,360,90',
      '-erase', `source=${simplified}`,
      '-o', 'format=topojson', `quantization=${QUANT}`, out,
    ]);
    console.log(
      `  ${level.out.padEnd(14)} ${(fs.statSync(out).size / 1024).toFixed(0).padStart(5)} kB  ` +
      `(${level.note}, ${level.interval} m)`,
    );
  }

  const water = [
    { src: 'ne_10m_lakes.geojson', out: 'lakes.json', interval: 400 },
    { src: 'ne_10m_rivers_lake_centerlines.geojson', out: 'rivers.json', interval: 400 },
  ];
  for (const job of water) {
    const src = path.join(NE_DIR, job.src);
    if (!fs.existsSync(src)) {
      console.warn(`  ! übersprungen (fehlt): ${job.src}`);
      continue;
    }
    const out = path.join(OUT_DIR, 'base', job.out);
    mapshaper([
      src,
      '-simplify', `interval=${job.interval}`, 'keep-shapes',
      '-filter-fields',
      '-o', 'format=topojson', `quantization=${QUANT}`, out,
    ]);
    console.log(`  ${job.out.padEnd(14)} ${(fs.statSync(out).size / 1024).toFixed(0).padStart(5)} kB`);
  }
}

/* ------------------------------------------------------------------ main */

function main() {
  if (!fs.existsSync(MAPSHAPER)) {
    console.error('mapshaper fehlt – bitte zuerst `npm install` ausführen.');
    process.exit(1);
  }
  const indexPath = path.join(HIST_DIR, 'index.json');
  if (!fs.existsSync(indexPath)) {
    console.error('Rohdaten fehlen – bitte zuerst `npm run fetch:data` ausführen.');
    process.exit(1);
  }

  fs.mkdirSync(path.join(OUT_DIR, 'epochs'), { recursive: true });
  fs.mkdirSync(path.join(OUT_DIR, 'base'), { recursive: true });

  console.log('› Basisgeometrien (Meer als Gegenstück zur Landmasse)');
  buildBase();

  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8')).years;
  console.log(`\n› ${index.length} Zeitschnitte`);
  const epochs = [];
  let total = 0;
  for (const entry of index) {
    if (!fs.existsSync(path.join(HIST_DIR, entry.filename))) {
      console.warn(`  ! übersprungen (fehlt): ${entry.filename}`);
      continue;
    }
    const meta = buildEpoch(entry);
    total += meta.bytes;
    console.log(
      `  ${meta.label.padStart(14)}  ${String(meta.polities).padStart(4)} Gemeinwesen  ` +
      `${(meta.bytes / 1024).toFixed(0).padStart(4)} kB` +
      (CORRECTIONS[entry.year] ? '  ← korrigiert' : ''),
    );
    epochs.push(meta);
  }

  fs.writeFileSync(
    path.join(OUT_DIR, 'epochs.json'),
    JSON.stringify({
      generated: new Date().toISOString().slice(0, 10),
      source: {
        name: 'Historical Basemaps',
        author: 'André Ourednik u. a.',
        url: 'https://github.com/aourednik/historical-basemaps',
        license: 'GPL-3.0',
      },
      eras: ERAS.map((e) => ({
        ...e,
        from: Number.isFinite(e.from) ? e.from : null,
        to: Number.isFinite(e.to) ? e.to : null,
      })),
      epochs,
    }, null, 1),
  );

  console.log(`\nFertig: ${epochs.length} Zeitschnitte, ${(total / 1024 / 1024).toFixed(1)} MB gesamt.`);
  fs.rmSync(TMP, { recursive: true, force: true });
}

main();
