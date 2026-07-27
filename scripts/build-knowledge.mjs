#!/usr/bin/env node
/**
 * Führt die redaktionellen Bausteine aus src/data zu den beiden Dateien
 * zusammen, die der Atlas zur Laufzeit lädt:
 *
 *   public/data/knowledge/polities.de.json   Steckbriefe
 *   public/data/knowledge/names.de.json      Namen und Schreibvarianten
 *
 * Die Steckbriefe liegen thematisch getrennt in src/data/knowledge/*.json,
 * damit sie überschaubar bleiben und sich getrennt pflegen lassen.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'src/data');
const OUT = path.join(ROOT, 'public/data/knowledge');

const REQUIRED_PERIOD_FIELDS = ['from'];

function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    throw new Error(`${path.relative(ROOT, file)}: ${err.message}`);
  }
}

function main() {
  fs.mkdirSync(OUT, { recursive: true });

  /* ---------------------------------------------------------- Namen */
  const names = readJSON(path.join(SRC, 'names.de.json'));
  fs.writeFileSync(path.join(OUT, 'names.de.json'), JSON.stringify(names));
  console.log(
    `› names.de.json      ${Object.keys(names.names).length} Namen, ` +
    `${Object.keys(names.aliases).length} Schreibvarianten`,
  );

  /* ----------------------------------------------------- Steckbriefe */
  const dir = path.join(SRC, 'knowledge');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort() : [];

  const entries = {};
  const problems = [];
  let periods = 0;

  for (const file of files) {
    const chunk = readJSON(path.join(dir, file));
    for (const [key, entry] of Object.entries(chunk)) {
      if (key.startsWith('_')) continue;
      if (entries[key]) problems.push(`doppelter Eintrag "${key}" in ${file}`);
      for (const period of entry.periods ?? []) {
        periods++;
        for (const field of REQUIRED_PERIOD_FIELDS) {
          if (period[field] === undefined) problems.push(`${key}: Zeitabschnitt ohne "${field}"`);
        }
      }
      (entry.periods ?? []).sort((a, b) => (a.from ?? 0) - (b.from ?? 0));
      entries[key] = { ...entry, source: file.replace('.json', '') };
    }
    console.log(`  ${file.padEnd(24)} ${Object.keys(chunk).filter((k) => !k.startsWith('_')).length} Einträge`);
  }

  // Namen, für die es einen Steckbrief gibt, sollten auch übersetzt sein.
  for (const key of Object.keys(entries)) {
    if (!names.names[key]) problems.push(`"${key}" hat einen Steckbrief, aber keine deutsche Bezeichnung`);
  }
  // Aliase müssen auf existierende Schlüssel zeigen.
  for (const [from, to] of Object.entries(names.aliases)) {
    if (!names.names[to]) problems.push(`Schreibvariante "${from}" zeigt auf unbekanntes "${to}"`);
  }

  fs.writeFileSync(
    path.join(OUT, 'polities.de.json'),
    JSON.stringify({
      meta: {
        about: 'Redaktionelle Steckbriefe zu historischen Gemeinwesen, epochenbezogen gegliedert.',
        language: 'de',
        entries: Object.keys(entries).length,
        periods,
      },
      entries,
    }),
  );

  console.log(`\n› polities.de.json   ${Object.keys(entries).length} Steckbriefe, ${periods} Zeitabschnitte`);

  if (problems.length) {
    console.log(`\n${problems.length} Hinweis(e):`);
    for (const p of problems.slice(0, 40)) console.log(`  · ${p}`);
    if (problems.length > 40) console.log(`  … und ${problems.length - 40} weitere`);
  }
}

main();
