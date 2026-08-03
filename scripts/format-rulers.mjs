#!/usr/bin/env node
/**
 * Bringt die Herrscherlisten in src/data/rulers wieder in ihre Form:
 * eine Regierungszeit je Zeile, Felder in fester Reihenfolge.
 *
 * Die Dateien werden von Hand gepflegt, aber gelegentlich auch von Skripten
 * angefasst. Ohne diesen Schritt hinterlässt jedes Skript die Datei in der
 * Voreinstellung von JSON.stringify – ein Feld je Zeile, tausende Zeilen lang.
 *
 * Aufruf: npm run format:rulers
 */
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.resolve(import.meta.dirname, '../src/data/rulers');
const FELDER = ['from', 'to', 'name', 'short', 'title', 'house', 'note'];

function zeile(eintrag) {
  const bekannt = FELDER.filter((k) => eintrag[k] !== undefined);
  const rest = Object.keys(eintrag).filter((k) => !FELDER.includes(k));
  const paare = [...bekannt, ...rest].map((k) => `${JSON.stringify(k)}: ${JSON.stringify(eintrag[k])}`);
  return `    { ${paare.join(', ')} }`;
}

let dateien = 0;
for (const datei of fs.readdirSync(DIR).filter((f) => f.endsWith('.json')).sort()) {
  const pfad = path.join(DIR, datei);
  const inhalt = JSON.parse(fs.readFileSync(pfad, 'utf8'));

  const bloecke = Object.entries(inhalt).map(([key, wert]) => {
    if (key.startsWith('_')) return `  ${JSON.stringify(key)}: ${JSON.stringify(wert)}`;
    return `  ${JSON.stringify(key)}: [\n${wert.map(zeile).join(',\n')}\n  ]`;
  });

  fs.writeFileSync(pfad, `{\n${bloecke.join(',\n\n')}\n}\n`);
  dateien++;
}

console.log(`${dateien} Herrscherlisten neu formatiert.`);
