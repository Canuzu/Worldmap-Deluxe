#!/usr/bin/env node
/**
 * Prüft die Ereignisebene gegen die Zeitschnitte der Karte.
 *
 * Ein Ereignis erscheint bei genau einem Zeitschnitt: bei dem, für dessen
 * Zeitspanne es gilt – von der Mitte zum vorigen bis zur Mitte zum nächsten.
 * Dieses Skript rechnet die Zuordnung nach und zeigt, welche Zeitschnitte
 * leer bleiben. Das ist die Arbeitsliste für neue Einträge.
 *
 * Geprüft wird außerdem, ob eine Marke im Meer liegt: Ein vertauschtes
 * Koordinatenpaar fällt sonst erst auf der Karte auf – und dort erst, wenn
 * man zufällig in dieses Jahr springt.
 *
 * Aufruf: npm run check:ereignisse
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA = path.join(ROOT, 'public/data');
const readJSON = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

const index = readJSON(path.join(DATA, 'epochs.json'));
const { ereignisse } = readJSON(path.join(DATA, 'knowledge/ereignisse.de.json'));
const jahre = index.epochs.map((e) => e.year);

const fenster = (i) => [
  i <= 0 ? -Infinity : (jahre[i - 1] + jahre[i]) / 2,
  i >= jahre.length - 1 ? Infinity : (jahre[i] + jahre[i + 1]) / 2,
];

/* ------------------------------------------------ Zuordnung nachrechnen */

const proSchnitt = jahre.map(() => []);
const heimatlos = [];
for (const e of ereignisse) {
  const i = jahre.findIndex((_, k) => {
    const [von, bis] = fenster(k);
    return e.jahr >= von && e.jahr < bis;
  });
  if (i < 0) heimatlos.push(e);
  else proSchnitt[i].push(e);
}

/* -------------------------------------------------- Liegt die Marke an Land? */

// Die Meeresebene ist ein Polygon mit einem Loch je Landmasse. Ein Punkt liegt
// also an Land, wenn er in einem der Löcher liegt – das ist mit reinem
// Punkt-in-Polygon zu prüfen, ohne weitere Daten.
//
// Geprüft wird gegen die hochaufgelöste Küstenlinie: Mit der Übersichtsküste
// fielen Manhattan, Danzig und Santorin ins Meer, weil sie dort vereinfacht
// weggeglättet sind.
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
    const teil = idx < 0 ? linie.slice().reverse() : linie;
    for (const p of teil) punkte.push(p);
  }
  return punkte;
}

const loecher = [];
for (const geom of ocean.objects[objKey].geometries) {
  const polys = geom.type === 'Polygon' ? [geom.arcs] : geom.arcs;
  for (const poly of polys) {
    // Ring 0 ist die Außenkante (das Meer), alles Weitere sind Landmassen.
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

const imMeer = ereignisse.filter((e) => {
  // Fahrten enden im Zweifel im Hafenbecken; was auf See geschah – eine
  // Seeschlacht, eine Landung, ein Seebeben –, trägt das ausdrücklich.
  if (e.art === 'fahrt' || e.aufSee) return false;
  return !loecher.some((ring) => imRing(ring, e.ort));
});

/* ------------------------------------------------------------- Ausgabe */

console.log(`${ereignisse.length} Ereignisse auf ${jahre.length} Zeitschnitte verteilt.\n`);

const belegt = proSchnitt.filter((l) => l.length).length;
console.log(`${belegt} von ${jahre.length} Zeitschnitten tragen mindestens ein Ereignis.`);

const arten = new Map();
for (const e of ereignisse) arten.set(e.art, (arten.get(e.art) ?? 0) + 1);
console.log(`Nach Art: ${[...arten].sort((a, b) => b[1] - a[1]).map(([a, n]) => `${a} ${n}`).join(', ')}\n`);

console.log('Zeitschnitt   Spanne                 Ereignisse');
console.log('─'.repeat(72));
jahre.forEach((jahr, i) => {
  const [von, bis] = fenster(i);
  const j = (v) => (!Number.isFinite(v) ? '…' : v < 0 ? `${-Math.round(v)} v.` : String(Math.round(v)));
  const namen = proSchnitt[i].map((e) => e.name).join(', ');
  console.log(
    `${String(jahr).padStart(9)}   ${`${j(von)}–${j(bis)}`.padEnd(20)}  ` +
    `${String(proSchnitt[i].length).padStart(2)}  ${namen.slice(0, 74)}`,
  );
});
console.log('─'.repeat(72));

// Vor 3000 v. Chr. ist die Quellenlage so dünn, dass ein leerer Zeitschnitt
// keine Lücke ist, sondern der Befund.
const leer = jahre.map((j, i) => [j, proSchnitt[i].length]).filter(([j, n]) => n === 0 && j >= -3000);
if (leer.length) {
  console.log(`\n${leer.length} Zeitschnitt(e) ab 3000 v. Chr. ohne Ereignis:`);
  console.log(`  ${leer.map(([j]) => (j < 0 ? `${-j} v.` : j)).join(', ')}`);
}

let fehler = 0;
if (heimatlos.length) {
  fehler += heimatlos.length;
  console.log(`\n${heimatlos.length} Ereignis(se) ohne Zeitschnitt:`);
  for (const e of heimatlos) console.log(`  · ${e.id} (${e.jahr})`);
}
if (imMeer.length) {
  fehler += imMeer.length;
  console.log(`\n${imMeer.length} Marke(n) liegen im Meer – Koordinaten prüfen:`);
  for (const e of imMeer) console.log(`  · ${e.id}: ${e.ort.join(', ')} — ${e.wo ?? e.name}`);
}
if (!fehler) console.log('\nAlle Marken liegen an Land, jedes Ereignis hat einen Zeitschnitt.');

process.exit(fehler ? 1 : 0);
