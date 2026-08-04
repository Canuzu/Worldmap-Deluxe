#!/usr/bin/env node
/**
 * Bringt die Konfliktdateien in src/data/konflikte in ihre Form:
 * Kriege chronologisch, darunter die Schlachten chronologisch, Felder in
 * fester Reihenfolge, Koordinatenpaare in einer Zeile.
 *
 * Ohne diesen Schritt bläst `JSON.stringify` jedes Koordinatenpaar auf vier
 * Zeilen auf – bei 110 Kriegen und 200 Schlachten wird die Quelle unlesbar.
 *
 * Aufruf: npm run format:konflikte
 */
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.resolve(import.meta.dirname, '../src/data/konflikte');
const KRIEG = ['id', 'name', 'von', 'bis', 'art', 'rang', 'ort', 'wo', 'seiten', 'text', 'ausgang', 'wiki'];
const SCHLACHT = ['id', 'krieg', 'jahr', 'datum', 'name', 'ort', 'wo', 'rang', 'sieger', 'verlauf', 'text', 'wiki'];

const j = (v) => JSON.stringify(v);
const ort = (o) => `[${o[0]}, ${o[1]}]`;

function pruefeFelder(o, erlaubt, was) {
  for (const k of Object.keys(o)) {
    if (!erlaubt.includes(k)) throw new Error(`${was} ${o.id}: unbekanntes Feld "${k}"`);
  }
}

function krieg(k) {
  pruefeFelder(k, KRIEG, 'Krieg');
  const kopf = ['id', 'name', 'von', 'bis', 'art', 'rang']
    .filter((f) => k[f] !== undefined)
    .map((f) => `${j(f)}: ${j(k[f])}`);
  const seiten = k.seiten
    .map((s) => `        { "name": ${j(s.name)}, "staaten": [${(s.staaten ?? []).map(j).join(', ')}] }`)
    .join(',\n');
  return [
    '    {',
    `      ${kopf.join(', ')},`,
    `      "ort": ${ort(k.ort)}, "wo": ${j(k.wo)},`,
    '      "seiten": [',
    seiten,
    '      ],',
    `      "text": ${j(k.text)},`,
    `      "ausgang": ${j(k.ausgang)}${k.wiki ? ',' : ''}`,
    ...(k.wiki ? [`      "wiki": ${j(k.wiki)}`] : []),
    '    }',
  ].join('\n');
}

function schlacht(s) {
  pruefeFelder(s, SCHLACHT, 'Schlacht');
  const kopf = ['id', 'krieg', 'jahr', 'datum', 'name']
    .filter((f) => s[f] !== undefined)
    .map((f) => `${j(f)}: ${j(s[f])}`);
  const mitte = ['wo', 'rang', 'sieger', 'verlauf']
    .filter((f) => s[f] !== undefined)
    .map((f) => `${j(f)}: ${j(s[f])}`);
  return [
    `    { ${kopf.join(', ')},`,
    `      "ort": ${ort(s.ort)}, ${mitte.join(', ')},`,
    `      "text": ${j(s.text)}${s.wiki ? ',' : ' }'}`,
    ...(s.wiki ? [`      "wiki": ${j(s.wiki)} }`] : []),
  ].join('\n');
}

let dateien = 0;
let kriege = 0;
let schlachten = 0;
for (const datei of fs.readdirSync(DIR).filter((f) => f.endsWith('.json')).sort()) {
  const pfad = path.join(DIR, datei);
  const inhalt = JSON.parse(fs.readFileSync(pfad, 'utf8'));
  const ks = (inhalt.kriege ?? []).sort((a, b) => a.von - b.von || a.id.localeCompare(b.id));
  const ss = (inhalt.schlachten ?? []).sort((a, b) => a.jahr - b.jahr || a.id.localeCompare(b.id));

  const kopf = Array.isArray(inhalt._hinweis)
    ? `  "_hinweis": [\n${inhalt._hinweis.map((z) => `    ${j(z)}`).join(',\n')}\n  ],`
    : `  "_hinweis": ${j(inhalt._hinweis)},`;

  fs.writeFileSync(pfad,
    `{\n${kopf}\n\n  "kriege": [\n${ks.map(krieg).join(',\n')}\n  ],\n\n`
    + `  "schlachten": [\n${ss.map(schlacht).join(',\n\n')}\n  ]\n}\n`);
  dateien++;
  kriege += ks.length;
  schlachten += ss.length;
}

console.log(`${kriege} Kriege und ${schlachten} Schlachten in ${dateien} Dateien neu formatiert.`);
