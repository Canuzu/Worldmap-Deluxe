#!/usr/bin/env node
/**
 * Prüft, wie gut die redaktionelle Wissensbasis den Kartendatensatz abdeckt.
 *
 * Ausgegeben wird je Zeitschnitt der Anteil der kartierten Fläche, für den
 * ein Steckbrief bzw. wenigstens eine deutsche Bezeichnung vorliegt. Am Ende
 * folgt eine Liste der größten Lücken – die Arbeitsliste für neue Einträge.
 *
 * Aufruf: npm run check:data [-- --luecken 40]
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA = path.join(ROOT, 'public/data');

const gapCount = Number(process.argv.find((a, i, all) => all[i - 1] === '--luecken')) || 25;

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

const index = readJSON(path.join(DATA, 'epochs.json'));
const knowledge = readJSON(path.join(DATA, 'knowledge/polities.de.json'));
const names = readJSON(path.join(DATA, 'knowledge/names.de.json'));

const entries = knowledge.entries ?? {};
const aliases = names.aliases ?? {};
const german = names.names ?? {};

const canonical = (n) => aliases[n] ?? n;
const hasEntry = (n) => Boolean(entries[canonical(n)] ?? entries[n]);
const hasName = (n) => Boolean(german[canonical(n)] ?? german[n]);

const gaps = new Map();
let totalArea = 0;
let coveredArea = 0;
let namedArea = 0;

console.log('Zeitschnitt        Fläche      Steckbrief   Bezeichnung');
console.log('─'.repeat(58));

for (const epoch of index.epochs) {
  const topo = readJSON(path.join(DATA, path.basename(path.dirname(epoch.file)), path.basename(epoch.file)));
  const objKey = Object.keys(topo.objects)[0];

  const areaByName = new Map();
  for (const geom of topo.objects[objKey].geometries) {
    const p = geom.properties ?? {};
    if (!p.n) continue;
    areaByName.set(p.n, p.a ?? 0);
  }

  let area = 0;
  let covered = 0;
  let named = 0;
  for (const [name, a] of areaByName) {
    area += a;
    if (hasEntry(name)) covered += a;
    else gaps.set(name, Math.max(gaps.get(name) ?? 0, a));
    if (hasName(name)) named += a;
  }

  totalArea += area;
  coveredArea += covered;
  namedArea += named;

  const pct = (v) => `${((v / (area || 1)) * 100).toFixed(0).padStart(3)} %`;
  console.log(
    `${epoch.label.padStart(15)}  ${String(Math.round(area / 1000)).padStart(9)} Tsd. km²` +
    `  ${pct(covered)}      ${pct(named)}`,
  );
}

console.log('─'.repeat(58));
console.log(
  `Gesamt über alle Zeitschnitte:  Steckbrief ${((coveredArea / totalArea) * 100).toFixed(1)} %, ` +
  `Bezeichnung ${((namedArea / totalArea) * 100).toFixed(1)} %`,
);
console.log(`${Object.keys(entries).length} Steckbriefe, ${Object.keys(german).length} Bezeichnungen.\n`);

const sorted = [...gaps.entries()].sort((a, b) => b[1] - a[1]).slice(0, gapCount);
console.log(`Größte Lücken ohne Steckbrief (Fläche im stärksten Zeitschnitt):`);
for (const [name, area] of sorted) {
  const mark = hasName(name) ? ' ' : '!';
  console.log(`  ${mark} ${name.padEnd(46)} ${String(Math.round(area / 1000)).padStart(7)} Tsd. km²`);
}
console.log('\n  ! = auch keine deutsche Bezeichnung hinterlegt');
