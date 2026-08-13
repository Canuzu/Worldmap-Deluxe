#!/usr/bin/env node
/**
 * Prüft die Herrscherlisten gegen die Zeitschnitte der Karte.
 *
 * Für jedes Jahr, das der Atlas anbietet, und jedes dort kartierte Gemeinwesen
 * mit hinterlegter Liste wird gefragt: Steht für dieses Jahr jemand in der
 * Liste? Ausgegeben wird, wie oft die Antwort „ja“ lautet – und welche
 * Lücken am häufigsten getroffen werden. Das ist die Arbeitsliste, wenn eine
 * Liste ergänzt werden soll.
 *
 * Aufruf: npm run check:herrscher [-- --luecken 30]
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA = path.join(ROOT, 'public/data');
const zeigeLuecken = Number(process.argv.find((a, i, all) => all[i - 1] === '--luecken')) || 20;

const readJSON = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

const index = readJSON(path.join(DATA, 'epochs.json'));
const knowledge = readJSON(path.join(DATA, 'knowledge/polities.de.json'));
const names = readJSON(path.join(DATA, 'knowledge/names.de.json'));

const entries = knowledge.entries ?? {};
const aliases = names.aliases ?? {};
const canon = (n) => aliases[n] ?? n;

/* Muss mit `lookup` in src/modules/data.js übereinstimmen – sonst prüft das
   Skript etwas anderes als die Tafel zeigt. */
const RUECKFALL_REICHWEITE = 50;

/** Dieselbe Auswahl wie zur Laufzeit – sonst prüft das Skript etwas anderes. */
function periodeZu(entry, year) {
  const ps = entry.periods ?? [];
  const genau = ps.findLast((p) => (p.from ?? -Infinity) <= year && year <= (p.to ?? Infinity));
  if (genau) return genau;
  const davor = ps.findLast((p) => (p.from ?? -Infinity) <= year);
  return davor && (davor.to == null || year - davor.to <= RUECKFALL_REICHWEITE) ? davor : null;
}

let mitListe = 0;
let genau = 0;
const luecken = new Map();

for (const epoch of index.epochs) {
  const topo = readJSON(path.join(DATA, path.basename(path.dirname(epoch.file)), path.basename(epoch.file)));
  const objKey = Object.keys(topo.objects)[0];
  const jahr = epoch.year;

  const gesehen = new Set();
  for (const geom of topo.objects[objKey].geometries) {
    const name = geom.properties?.n;
    if (!name || gesehen.has(name)) continue;
    gesehen.add(name);

    const entry = entries[canon(name)] ?? entries[name];
    const period = entry && periodeZu(entry, jahr);
    const liste = period?.rulers;
    if (!liste?.length) continue;

    mitListe++;
    const treffer = liste.find((r) => (r.from ?? -Infinity) <= jahr && jahr <= (r.to ?? Infinity));
    if (treffer) genau++;
    else {
      const key = `${canon(name)} @ ${jahr}`;
      luecken.set(key, (luecken.get(key) ?? 0) + 1);
    }
  }
}

const quote = mitListe ? ((genau / mitListe) * 100).toFixed(1) : '0.0';
console.log(`${index.epochs.length} Zeitschnitte geprüft.`);
console.log(`${mitListe} Fälle mit hinterlegter Liste, davon ${genau} mit einem Namen für genau dieses Jahr (${quote} %).\n`);

if (luecken.size) {
  console.log(`${luecken.size} Lücke(n) – dort nennt die Tafel keinen Namen, sondern`);
  console.log('sagt, dass für dieses Jahr nichts verzeichnet ist. Das ist die Arbeitsliste:');
  for (const [key] of [...luecken].slice(0, zeigeLuecken)) console.log(`  · ${key}`);
  if (luecken.size > zeigeLuecken) console.log(`  … und ${luecken.size - zeigeLuecken} weitere`);
} else {
  console.log('Keine Lücke: Für jedes kartierte Jahr steht ein Name in der Liste.');
}

// Reine Auskunft, kein Fehlschlag: Lücken sind zulässig und werden angezeigt.
process.exit(0);
