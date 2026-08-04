#!/usr/bin/env node
/**
 * Bringt die Ereignisdateien in src/data/ereignisse in ihre Form:
 * je Ereignis ein Block, Felder in fester Reihenfolge, chronologisch sortiert.
 *
 * Die Dateien werden von Hand gepflegt, aber gelegentlich auch von Skripten
 * ergänzt. Ohne diesen Schritt steht ein nachgetragenes Ereignis am Ende
 * statt an seinem Platz in der Zeit.
 *
 * Aufruf: npm run format:ereignisse
 */
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.resolve(import.meta.dirname, '../src/data/ereignisse');
const KOPF = ['id', 'jahr', 'bis', 'art', 'rang', 'aufSee'];
const REST = ['name', 'ort', 'wo', 'weg', 'text', 'wiki'];

const j = (v) => JSON.stringify(v);
/** Koordinatenpaare bleiben in einer Zeile – sonst zerfällt jede Route in 20. */
const paare = (liste) => `[${liste.map(([a, b]) => `[${a}, ${b}]`).join(', ')}]`;

function block(e) {
  const kopf = KOPF.filter((k) => e[k] !== undefined).map((k) => `${j(k)}: ${j(e[k])}`);
  const zeilen = [`    { ${kopf.join(', ')},`];
  const mitte = ['name', 'ort', 'wo']
    .filter((k) => e[k] !== undefined)
    .map((k) => `${j(k)}: ${k === 'ort' ? `[${e.ort[0]}, ${e.ort[1]}]` : j(e[k])}`);
  zeilen.push(`      ${mitte.join(', ')},`);
  if (e.weg) zeilen.push(`      "weg": ${paare(e.weg)},`);
  zeilen.push(`      "text": ${j(e.text)}${e.wiki ? ',' : ' }'}`);
  if (e.wiki) zeilen.push(`      "wiki": ${j(e.wiki)} }`);
  // Unbekannte Felder gingen sonst still verloren.
  for (const k of Object.keys(e)) {
    if (![...KOPF, ...REST].includes(k)) throw new Error(`${e.id}: unbekanntes Feld "${k}"`);
  }
  return zeilen.join('\n');
}

let dateien = 0;
let anzahl = 0;
for (const datei of fs.readdirSync(DIR).filter((f) => f.endsWith('.json')).sort()) {
  const pfad = path.join(DIR, datei);
  const inhalt = JSON.parse(fs.readFileSync(pfad, 'utf8'));
  const liste = (inhalt.ereignisse ?? []).sort((a, b) => a.jahr - b.jahr || a.id.localeCompare(b.id));

  const kopf = Array.isArray(inhalt._hinweis)
    ? `  "_hinweis": [\n${inhalt._hinweis.map((z) => `    ${j(z)}`).join(',\n')}\n  ],`
    : `  "_hinweis": ${j(inhalt._hinweis)},`;

  fs.writeFileSync(pfad, `{\n${kopf}\n\n  "ereignisse": [\n${liste.map(block).join(',\n\n')}\n  ]\n}\n`);
  dateien++;
  anzahl += liste.length;
}

console.log(`${anzahl} Ereignisse in ${dateien} Dateien neu formatiert.`);
