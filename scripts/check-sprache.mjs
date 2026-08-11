#!/usr/bin/env node
/**
 * Prüft die Sprachfassungen.
 *
 * Eine zweite Sprache verfällt leise. Man fügt einen Text hinzu, trägt ihn in
 * de.js ein, sieht auf der deutschen Seite alles richtig – und die englische
 * zeigt seit drei Wochen einen Schlüssel statt eines Satzes, weil `t()` beim
 * Fehlen absichtlich den Schlüssel durchreicht. Genau das findet man nur, wenn
 * eine Maschine hinsieht.
 *
 * Geprüft wird viererlei:
 *
 *   1. Fehlt ein Schlüssel in einer Sprache?
 *   2. Steht dort ein Schlüssel zu viel, den es in de.js nicht mehr gibt?
 *   3. Stimmen die Platzhalter überein? `{jahr}` im Deutschen und `{year}` im
 *      Englischen ergibt zur Laufzeit ein sichtbares `{year}` mitten im Satz.
 *   4. Sind Texte unübersetzt geblieben – also Wort für Wort gleich, obwohl
 *      sie es nicht sein müssten? Gemeldet wird nur, was verdächtig ist:
 *      Eigennamen und Zahlen sind zu Recht gleich.
 *
 * Dazu die Namensdatei: Jeder englische Eintrag muss ein Schlüssel des
 * Datensatzes sein, sonst wirkt er nie.
 *
 * Aufruf: npm run check:sprache
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const { DE } = await import(path.join(ROOT, 'src/i18n/de.js'));
const { EN } = await import(path.join(ROOT, 'src/i18n/en.js'));

const SPRACHEN = { en: EN };

/* Gleiche Schreibung ist bei diesen Texten kein Befund: Eigennamen, Zahlen,
   Zeichen. Sie stehen hier namentlich, damit die Liste nicht stillschweigend
   wächst. */
const DARF_GLEICH_SEIN = new Set([
  'marke.name',
  'format.ohne',
  'modus.religion',
  'ebenen.grundlage.relief',
  'epoche.antiquity', 'epoche.antiquity.kurz',
  'epoche.iceage', 'epoche.iceage.kurz',
  'epoche.bronze.kurz',
  'grund.relief.name',
  'tafel.fach.religion',
  'zeit.regler.wert',
  // Diese Namen sind im Englischen identisch – Fachbegriffe, keine Übersetzungslücke.
  'rel.orth', 'rel.shinto', 'relfam.islamisch',
  'kf.revolution.kurz',
]);

const platzhalter = (text) => [...String(text).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

let fehler = 0;
const melde = (zeile) => { console.log(`      ${zeile}`); fehler++; };

console.log(`Grundsprache de: ${Object.keys(DE).length} Texte\n`);

for (const [code, woerter] of Object.entries(SPRACHEN)) {
  const fehlend = [];
  const ueberzaehlig = [];
  const platzfehler = [];
  const unuebersetzt = [];

  for (const [schluessel, deutsch] of Object.entries(DE)) {
    if (!Object.hasOwn(woerter, schluessel)) { fehlend.push(schluessel); continue; }
    const fremd = woerter[schluessel];
    const a = platzhalter(deutsch);
    const b = platzhalter(fremd);
    if (a.join(',') !== b.join(',')) {
      platzfehler.push(`${schluessel}: {${a.join('} {')}} gegen {${b.join('} {')}}`);
    }
    if (fremd === deutsch && !DARF_GLEICH_SEIN.has(schluessel) && /\p{L}{4}/u.test(deutsch)) {
      unuebersetzt.push(`${schluessel}: „${deutsch.slice(0, 48)}“`);
    }
  }
  for (const schluessel of Object.keys(woerter)) {
    if (!Object.hasOwn(DE, schluessel)) ueberzaehlig.push(schluessel);
  }

  const abgedeckt = Object.keys(DE).length - fehlend.length;
  const anteil = Math.round((abgedeckt / Object.keys(DE).length) * 100);
  const marke = fehlend.length || ueberzaehlig.length || platzfehler.length || unuebersetzt.length ? '✗' : '✓';
  console.log(`${marke} ${code}: ${abgedeckt}/${Object.keys(DE).length} Texte (${anteil} %)`);

  for (const s of fehlend.slice(0, 12)) melde(`fehlt: ${s}`);
  if (fehlend.length > 12) melde(`… und ${fehlend.length - 12} weitere fehlende`);
  for (const s of ueberzaehlig.slice(0, 8)) melde(`überzählig (nicht in de.js): ${s}`);
  for (const s of platzfehler) melde(`Platzhalter weichen ab – ${s}`);
  for (const s of unuebersetzt.slice(0, 8)) melde(`unübersetzt – ${s}`);
  if (unuebersetzt.length > 8) melde(`… und ${unuebersetzt.length - 8} weitere unübersetzte`);
}

/* ------------------------------------------------------------- Namen */

const namenDe = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/names.de.json'), 'utf8'));
const namenEnDatei = path.join(ROOT, 'src/data/names.en.json');
if (fs.existsSync(namenEnDatei)) {
  const namenEn = JSON.parse(fs.readFileSync(namenEnDatei, 'utf8'));
  const unbekannt = Object.keys(namenEn.names ?? {})
    .filter((k) => !Object.hasOwn(namenDe.names, k));
  const marke = unbekannt.length ? '✗' : '✓';
  console.log(`\n${marke} names.en.json: ${Object.keys(namenEn.names ?? {}).length} Abweichungen `
    + `vom Datensatz (${Object.keys(namenDe.names).length} Namen insgesamt)`);
  for (const k of unbekannt) melde(`kein Datensatzname – wirkt nie: „${k}“`);
}

/* -------------------------------------------- Redaktionelle Wissensbasis */

const WISSEN = ['polities', 'ereignisse', 'konflikte'];
console.log('\nRedaktionelle Wissensbasis:');
for (const name of WISSEN) {
  const vorhanden = [];
  for (const code of ['de', ...Object.keys(SPRACHEN)]) {
    if (fs.existsSync(path.join(ROOT, `public/data/knowledge/${name}.${code}.json`))) vorhanden.push(code);
  }
  const fehlt = ['de', ...Object.keys(SPRACHEN)].filter((c) => !vorhanden.includes(c));
  console.log(`  ${name.padEnd(12)} ${vorhanden.join(', ')}`
    + (fehlt.length ? `   – ohne eigene Fassung: ${fehlt.join(', ')} (fällt auf Deutsch zurück)` : ''));
}

console.log(fehler ? `\n${fehler} Befund(e).` : '\nAlle Sprachfassungen vollständig.');
process.exit(fehler ? 1 : 0);
