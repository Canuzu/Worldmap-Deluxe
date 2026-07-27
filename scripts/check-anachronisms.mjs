#!/usr/bin/env node
/**
 * Sucht Anachronismen im Kartendatensatz.
 *
 * Die redaktionelle Wissensbasis hält zu vielen Gemeinwesen ein Gründungs-
 * und ein Auflösungsjahr. Beides lässt sich gegen die Zeitschnitte prüfen:
 * Taucht ein Reich in einem Jahr auf, in dem es nachweislich noch nicht oder
 * nicht mehr bestand, ist das ein belegbarer Fehler der Kartendaten.
 *
 * Das findet nicht jeden Fehler – falsche Grenzverläufe bei korrekt
 * datierten Reichen bleiben unentdeckt. Aber es findet die grobsten
 * automatisch und nachprüfbar.
 *
 * Aufruf: npm run check:zeit
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA = path.join(ROOT, 'public/data');

/** Toleranz in Jahren: Reiche vergehen selten an einem Stichtag. */
const GRACE = 25;

const readJSON = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

const index = readJSON(path.join(DATA, 'epochs.json'));
const knowledge = readJSON(path.join(DATA, 'knowledge/polities.de.json')).entries ?? {};
const names = readJSON(path.join(DATA, 'knowledge/names.de.json'));
const aliases = names.aliases ?? {};
const german = names.names ?? {};

const canon = (n) => aliases[n] ?? n;
const label = (n) => german[canon(n)] ?? n;

const findings = [];

for (const epoch of index.epochs) {
  const topo = readJSON(path.join(DATA, 'epochs', path.basename(epoch.file)));
  const objKey = Object.keys(topo.objects)[0];

  const areaByName = new Map();
  for (const geom of topo.objects[objKey].geometries) {
    const p = geom.properties ?? {};
    if (!p.n) continue;
    areaByName.set(p.n, Math.max(areaByName.get(p.n) ?? 0, p.a ?? 0));
  }

  for (const [name, area] of areaByName) {
    const entry = knowledge[canon(name)] ?? knowledge[name];
    if (!entry) continue;
    const { founded, dissolved } = entry;

    if (dissolved != null && epoch.year > dissolved + GRACE) {
      findings.push({
        epoch: epoch.year, label: epoch.label, name, area,
        kind: 'zu spät',
        detail: `bestand nur bis ${dissolved}, erscheint aber ${epoch.year}`,
      });
    }
    if (founded != null && epoch.year < founded - GRACE) {
      findings.push({
        epoch: epoch.year, label: epoch.label, name, area,
        kind: 'zu früh',
        detail: `entstand erst ${founded}, erscheint aber ${epoch.year}`,
      });
    }
  }
}

findings.sort((a, b) => b.area - a.area);

const nf = new Intl.NumberFormat('de-DE');
console.log(`${findings.length} Anachronismen (Toleranz ±${GRACE} Jahre), nach Fläche sortiert:\n`);
console.log('Zeitschnitt      Gemeinwesen                          Fläche        Befund');
console.log('─'.repeat(104));
for (const f of findings) {
  console.log(
    `${f.label.padStart(14)}   ${label(f.name).slice(0, 34).padEnd(34)} ` +
    `${(nf.format(Math.round(f.area / 1000)) + ' Tsd. km²').padStart(15)}  ${f.detail}`,
  );
}

const byEpoch = new Map();
for (const f of findings) byEpoch.set(f.epoch, (byEpoch.get(f.epoch) ?? 0) + 1);
console.log('\nBetroffene Zeitschnitte:');
for (const [year, n] of [...byEpoch].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(year).padStart(7)}  ${n}`);
}
