#!/usr/bin/env node
/**
 * Baut die Schlachtverläufe für die Auslieferung.
 *
 * Vorher lagen alle Verläufe in einer einzigen Datei `src/data/battles.json`,
 * 852 kB für zwölf Schlachten. Das hatte zwei Folgen, die beide erst beim
 * dreizehnten Verlauf richtig weh tun:
 *
 *   · Wer das Kriegsregister öffnet, lud alle zwölf vollständig – auch wenn er
 *     nur nachsehen wollte, welche Kriege es 1815 gab. Bei dreißig Verläufen
 *     wären das zwei Megabyte für einen Blick in eine Liste.
 *   · Eine Datei von 852 kB lässt sich nicht mehr sinnvoll bearbeiten. Ein
 *     neuer Verlauf heißt: 25.000 Zeilen scrollen und hoffen, dass das Komma
 *     an der richtigen Stelle sitzt.
 *
 * Jetzt liegt jede Schlacht als eigene Datei in `src/data/battles/`. Dieses
 * Skript schreibt daraus:
 *
 *   public/data/battles/<id>.json   der vollständige Verlauf, einzeln geholt
 *   src/data/battles-index.json     nur die Kopfdaten, ins Programm gebündelt
 *
 * Der Index trägt, was das Register und der Anflug brauchen – Name, Ort,
 * Datum, Jahr, Ausschnitt, Untergrund. Er ist rund ein halbes Kilobyte je
 * Schlacht; die Stationen mit ihren Stellungspolygonen machen den Rest aus und
 * kommen erst, wenn jemand wirklich abspielt.
 *
 * Aufruf: npm run build:battles
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'src/data/battles');
const OUT = path.join(ROOT, 'public/data/battles');

/* Was in den Index gehört. Bewusst eine feste Liste und kein „alles außer
   stationen“: So wächst der Index nicht stillschweigend mit, wenn ein Verlauf
   ein neues Feld bekommt. */
const INDEX_FELDER = ['id', 'name', 'ort', 'datum', 'jahr', 'mitte', 'zoom', 'grund', 'see', 'worum'];

fs.mkdirSync(OUT, { recursive: true });

const dateien = fs.readdirSync(SRC)
  .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
  .sort();

const index = [];
let gesamt = 0;

for (const datei of dateien) {
  const roh = fs.readFileSync(path.join(SRC, datei), 'utf8');
  let s;
  try {
    s = JSON.parse(roh);
  } catch (err) {
    console.error(`✗ ${datei}: ${err.message}`);
    process.exit(1);
  }
  if (s.id !== path.basename(datei, '.json')) {
    console.error(`✗ ${datei}: id „${s.id}“ passt nicht zum Dateinamen`);
    process.exit(1);
  }

  // Ausgeliefert wird ohne Einrückung – die Datei wird gelesen, nicht gelesen.
  const ausgabe = JSON.stringify(s);
  fs.writeFileSync(path.join(OUT, `${s.id}.json`), ausgabe);
  gesamt += ausgabe.length;

  const kopf = {};
  for (const f of INDEX_FELDER) if (s[f] !== undefined) kopf[f] = s[f];
  kopf.stationen = s.stationen?.length ?? 0;
  index.push(kopf);
}

// Nach Jahr sortiert: So steht das Register in der Reihenfolge, in der die
// Schlachten geschlagen wurden, und nicht in der ihrer Dateinamen.
index.sort((a, b) => (a.jahr ?? 0) - (b.jahr ?? 0));

const indexDatei = path.join(ROOT, 'src/data/battles-index.json');
fs.writeFileSync(indexDatei, `${JSON.stringify(index, null, 1)}\n`);

const kb = (n) => `${Math.round(n / 1024)} kB`;
console.log(`› ${index.length} Verläufe, ${kb(gesamt)} einzeln ausgeliefert`);
console.log(`› Index ${kb(fs.statSync(indexDatei).size)} – wird ins Programm gebündelt`);
console.log(`› Stationen gesamt: ${index.reduce((n, b) => n + b.stationen, 0)}`);
