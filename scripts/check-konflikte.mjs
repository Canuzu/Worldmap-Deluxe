#!/usr/bin/env node
/**
 * Prüft das Kriegsregister gegen die Zeitschnitte der Karte.
 *
 * Drei Fragen, die man am fertigen Bild nur zufällig bemerkt:
 *
 *   1. Liegt jedes Schlachtfeld an Land? Ein vertauschtes Koordinatenpaar
 *      fällt sonst erst auf, wenn jemand zufällig in dieses Jahr springt.
 *      Seeschlachten tragen das ausdrücklich – über den Ort im Text.
 *   2. Erreicht man jeden Krieg? Ein Krieg, dessen Spanne zwischen zwei
 *      Zeitschnitte fällt, steht in keinem Register.
 *   3. Wo sind die Lücken? Welcher Zeitschnitt trägt keinen einzigen Krieg –
 *      das ist die Arbeitsliste für den nächsten Durchgang.
 *
 * Aufruf: npm run check:konflikte
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA = path.join(ROOT, 'public/data');
const readJSON = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

const index = readJSON(path.join(DATA, 'epochs.json'));
const { kriege, schlachten } = readJSON(path.join(DATA, 'knowledge/konflikte.de.json'));
const jahre = index.epochs.map((e) => e.year);

const fenster = (i) => [
  i <= 0 ? -Infinity : (jahre[i - 1] + jahre[i]) / 2,
  i >= jahre.length - 1 ? Infinity : (jahre[i] + jahre[i + 1]) / 2,
];

/* ------------------------------------------------------ Liegt es an Land? */

// Dieselbe Prüfung wie bei den Ereignissen: Die Meeresebene ist ein Polygon
// mit einem Loch je Landmasse, ein Punkt liegt also an Land, wenn er in einem
// der Löcher liegt.
const ocean = readJSON(path.join(DATA, 'base/ocean-hd.json'));
const objKey = Object.keys(ocean.objects)[0];

function decodeArc(arc) {
  const [sx, sy] = ocean.transform.scale;
  const [tx, ty] = ocean.transform.translate;
  let x = 0;
  let y = 0;
  return arc.map(([dx, dy]) => {
    x += dx;
    y += dy;
    return [x * sx + tx, y * sy + ty];
  });
}

function ringOf(indices) {
  const punkte = [];
  for (const idx of indices) {
    const linie = decodeArc(ocean.arcs[idx < 0 ? ~idx : idx]);
    for (const p of (idx < 0 ? linie.slice().reverse() : linie)) punkte.push(p);
  }
  return punkte;
}

const loecher = [];
for (const geom of ocean.objects[objKey].geometries) {
  const polys = geom.type === 'Polygon' ? [geom.arcs] : geom.arcs;
  for (const poly of polys) {
    for (const ring of poly.slice(1)) loecher.push(ringOf(ring));
  }
}

function imRing(ring, [x, y]) {
  let drin = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) drin = !drin;
  }
  return drin;
}

/* Seeschlachten und Landungen gehören ins Wasser. Sie werden am Namen
   erkannt – bewusst grob: Ein zusätzliches Feld nur für diese Prüfung wäre
   eine Angabe, die niemand sieht und die deshalb veraltet. */
const SEE = /(seeschlacht|flotte|armada|landung|meerenge|bucht|golf|kanal|see\b|pazifik|nordsee|untergang|fahrt|midway|tsushima|salamis|actium|trafalgar|jutland|skagerrak|abukir|lepanto|mylae|ägatischen|aigospotamoi|dan-no-ura|poyang|hakata)/i;

const imMeer = schlachten.filter((s) => {
  if (SEE.test(s.name) || SEE.test(s.wo ?? '')) return false;
  return !loecher.some((ring) => imRing(ring, s.ort));
});

/* ------------------------------------------------ Zuordnung nachrechnen */

const kriegeJeSchnitt = jahre.map(() => []);
const schlachtenJeSchnitt = jahre.map(() => []);
for (const k of kriege) {
  jahre.forEach((_, i) => {
    const [von, bis] = fenster(i);
    if ((k.von ?? -Infinity) < bis && von <= (k.bis ?? Infinity)) kriegeJeSchnitt[i].push(k);
  });
}
const heimatlos = [];
for (const s of schlachten) {
  const i = jahre.findIndex((_, k) => {
    const [von, bis] = fenster(k);
    return s.jahr >= von && s.jahr < bis;
  });
  if (i < 0) heimatlos.push(s);
  else schlachtenJeSchnitt[i].push(s);
}
const unerreichbar = kriege.filter((k) => !kriegeJeSchnitt.some((l) => l.includes(k)));

/* ------------------------------- Finden sich die Kriegsparteien im Datensatz? */

// Die Seiten eines Krieges nennen Staaten so, wie der Kartendatensatz sie
// schreibt – und der schreibt sie je Zeitschnitt anders: 1942 heißt die
// Sowjetunion "USSR", 1960 "Soviet Union". Ein Name, der in keinem einzigen
// Zeitschnitt vorkommt, ist ein Tippfehler und wird nie einen Umriss ergeben.
const alleNamen = new Set();
for (const e of index.epochs) {
  const topo = readJSON(path.join(DATA, e.file.replace(/^data\//, '')));
  for (const obj of Object.values(topo.objects)) {
    for (const g of obj.geometries ?? []) {
      if (g.properties?.n) alleNamen.add(g.properties.n);
    }
  }
}
const unbekannt = [];
for (const k of kriege) {
  for (const seite of k.seiten) {
    for (const n of seite.staaten ?? []) {
      if (!alleNamen.has(n)) unbekannt.push(`${k.id}: „${n}“`);
    }
  }
}
const ohneUmriss = kriege.filter((k) => !k.seiten.some((s) => (s.staaten ?? []).some((n) => alleNamen.has(n))));

/* ------------------------------------------------------------- Ausgabe */

console.log(`${kriege.length} Kriege und ${schlachten.length} Schlachten auf ${jahre.length} Zeitschnitte verteilt.\n`);

const arten = new Map();
for (const k of kriege) arten.set(k.art, (arten.get(k.art) ?? 0) + 1);
console.log(`Nach Art: ${[...arten].sort((a, b) => b[1] - a[1]).map(([a, n]) => `${a} ${n}`).join(', ')}`);

const jeKrieg = new Map();
for (const s of schlachten) jeKrieg.set(s.krieg, (jeKrieg.get(s.krieg) ?? 0) + 1);
const ohne = kriege.filter((k) => !jeKrieg.has(k.id));
console.log(`Schlachten je Krieg: im Schnitt ${(schlachten.length / kriege.length).toFixed(1)}, `
  + `am meisten ${Math.max(...jeKrieg.values())}\n`);

const j = (v) => (!Number.isFinite(v) ? '…' : v < 0 ? `${-Math.round(v)} v.` : String(Math.round(v)));
console.log('Zeitschnitt   Spanne                Kriege  Schlachten');
console.log('─'.repeat(78));
jahre.forEach((jahr, i) => {
  const [von, bis] = fenster(i);
  const namen = kriegeJeSchnitt[i].map((k) => k.name).join(', ');
  console.log(
    `${String(jahr).padStart(9)}   ${`${j(von)}–${j(bis)}`.padEnd(20)}  `
    + `${String(kriegeJeSchnitt[i].length).padStart(4)}  ${String(schlachtenJeSchnitt[i].length).padStart(4)}  `
    + `${namen.slice(0, 40)}`,
  );
});
console.log('─'.repeat(78));

const leer = jahre.filter((jahr, i) => !kriegeJeSchnitt[i].length && jahr > -3000);
if (leer.length) {
  console.log(`\nOhne Krieg (nach 3000 v. Chr.): ${leer.join(', ')}`);
}

let fehler = 0;
if (imMeer.length) {
  fehler += imMeer.length;
  console.log(`\n✗ ${imMeer.length} Schlachtfeld(er) im Meer:`);
  for (const s of imMeer) console.log(`  · ${s.id} – ${s.name} (${s.ort.join(', ')})`);
}
if (heimatlos.length) {
  fehler += heimatlos.length;
  console.log(`\n✗ ${heimatlos.length} Schlacht(en) ohne Zeitschnitt:`);
  for (const s of heimatlos) console.log(`  · ${s.id} – ${s.name}, ${s.jahr}`);
}
if (unerreichbar.length) {
  fehler += unerreichbar.length;
  console.log(`\n✗ ${unerreichbar.length} Krieg(e) in keinem Zeitschnitt erreichbar:`);
  for (const k of unerreichbar) console.log(`  · ${k.id} – ${k.name}`);
}
if (unbekannt.length) {
  console.log(`\n! ${unbekannt.length} Staatsname(n) kommen in keinem Zeitschnitt vor `
    + '– diese Seiten bekommen nie einen Umriss:');
  for (const z of unbekannt.slice(0, 40)) console.log(`  · ${z}`);
  if (unbekannt.length > 40) console.log(`  … und ${unbekannt.length - 40} weitere`);
}
if (ohneUmriss.length) {
  console.log(`\n! ${ohneUmriss.length} Krieg(e) ohne einen einzigen auffindbaren Staat:`);
  for (const k of ohneUmriss) console.log(`  · ${k.id} – ${k.name}`);
}
if (ohne.length) {
  fehler += ohne.length;
  console.log(`\n✗ ${ohne.length} Krieg(e) ohne Schlacht:`);
  for (const k of ohne) console.log(`  · ${k.id} – ${k.name}`);
}

if (!fehler) console.log('\nAlle Schlachtfelder liegen an Land, jeder Krieg ist erreichbar.');
process.exit(fehler ? 1 : 0);
