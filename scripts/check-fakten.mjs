#!/usr/bin/env node
/**
 * Sucht Widersprüche zwischen den Datensätzen.
 *
 * Jede Datei für sich kann in Ordnung sein und trotzdem einer anderen
 * widersprechen: Ein Herrscher, der ein Jahrhundert nach dem Untergang seines
 * Reiches regiert; eine Schlacht, die vor ihrem Krieg stattfindet; ein
 * Gemeinwesen, das laut Wissensbasis 1806 endet und auf der Karte von 1900
 * noch steht. Solche Fälle findet keine Rechtschreibprüfung und kein
 * Augenschein – wohl aber ein Abgleich.
 *
 * Geprüft wird:
 *   1. Herrscherzeiten gegen Bestehen des Gemeinwesens (founded/dissolved)
 *   2. Abschnittsgrenzen gegen Bestehen des Gemeinwesens
 *   3. Schlachtjahr gegen die Spanne ihres Krieges
 *   4. Jede Schlacht hat einen Krieg, den es gibt
 *   5. Sieger einer Schlacht ist eine Seite ihres Krieges
 *   6. Bestehen laut Wissensbasis gegen das, was die Karte zeigt
 *   7. Ereignisjahr gegen die Zeitschnitte, in denen es erscheinen kann
 *
 * Aufruf: npm run check:fakten
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const readJSON = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const lies = (rel) => readJSON(path.join(ROOT, rel));

const DATEIEN = ['10-antike', '20-mittelalter', '30-neuzeit', '40-moderne'];

/* ------------------------------------------------------------- Einlesen */

const wissen = {};
for (const f of fs.readdirSync(path.join(ROOT, 'src/data/knowledge')).filter((x) => x.endsWith('.json'))) {
  for (const [k, v] of Object.entries(lies(`src/data/knowledge/${f}`))) {
    if (!k.startsWith('_')) wissen[k] = { ...v, _datei: f };
  }
}
const herrscher = {};
for (const f of fs.readdirSync(path.join(ROOT, 'src/data/rulers')).filter((x) => x.endsWith('.json'))) {
  for (const [k, v] of Object.entries(lies(`src/data/rulers/${f}`))) {
    if (!k.startsWith('_') && Array.isArray(v)) herrscher[k] = { liste: v, _datei: f };
  }
}
const kriege = new Map();
const schlachten = [];
for (const f of DATEIEN) {
  const d = lies(`src/data/konflikte/${f}.json`);
  for (const k of d.kriege ?? []) kriege.set(k.id, { ...k, _datei: f });
  for (const s of d.schlachten ?? []) schlachten.push({ ...s, _datei: f });
}
const ereignisse = [];
for (const f of DATEIEN) {
  const d = lies(`src/data/ereignisse/${f}.json`);
  for (const e of d.ereignisse ?? []) ereignisse.push({ ...e, _datei: f });
}
const epochs = lies('public/data/epochs.json');
const jahre = epochs.epochs.map((e) => e.year).sort((a, b) => a - b);

/* Auf welchen Zeitschnitten ein Gemeinwesen tatsächlich vorkommt. */
const aufKarte = new Map();
for (const epoch of epochs.epochs) {
  const topo = readJSON(path.join(ROOT, 'public/data/epochs', path.basename(epoch.file)));
  const objKey = Object.keys(topo.objects)[0];
  for (const g of topo.objects[objKey].geometries) {
    const n = g.properties?.n;
    if (!n) continue;
    if (!aufKarte.has(n)) aufKarte.set(n, []);
    const l = aufKarte.get(n);
    if (l[l.length - 1] !== epoch.year) l.push(epoch.year);
  }
}
const namen = lies('public/data/knowledge/names.de.json').aliases ?? {};
const kanon = (n) => namen[n] ?? n;

/* ------------------------------------------------------------- Prüfung */

let fehler = 0;
const melde = (gruppe, was) => { fehler++; console.log(`  ✗ ${gruppe.padEnd(24)} ${was}`); };
const abschnitt = (t) => console.log(`\n${t}`);

/* 1 + 2 – Herrscher und Abschnitte gegen das Bestehen des Gemeinwesens.
   Grosszügig um LUFT Jahre: Gründungs- und Untergangsdaten sind selbst
   Setzungen, und ein Reich hört selten an einem Stichtag auf. */
const LUFT = 25;
abschnitt('Herrscher und Abschnitte gegen das Bestehen des Gemeinwesens');
for (const [name, eintrag] of Object.entries(wissen)) {
  const { founded: von, dissolved: bis } = eintrag;
  if (von == null && bis == null) continue;
  for (const p of eintrag.periods ?? []) {
    if (von != null && p.to != null && p.to < von - LUFT) {
      melde(name, `Abschnitt ${p.from}–${p.to} endet vor der Gründung ${von}`);
    }
    if (bis != null && p.from != null && p.from > bis + LUFT) {
      melde(name, `Abschnitt ${p.from}–${p.to} beginnt nach dem Ende ${bis}`);
    }
  }
  for (const r of herrscher[name]?.liste ?? []) {
    if (von != null && r.to != null && r.to < von - LUFT) {
      melde(name, `„${r.name}“ (${r.from}–${r.to}) endet vor der Gründung ${von}`);
    }
    if (bis != null && r.from != null && r.from > bis + LUFT) {
      melde(name, `„${r.name}“ (${r.from}–${r.to}) beginnt nach dem Ende ${bis}`);
    }
  }
}

/* 3 + 4 + 5 – Schlachten gegen ihren Krieg. */
abschnitt('Schlachten gegen ihren Krieg');
for (const s of schlachten) {
  const k = kriege.get(s.krieg);
  if (!k) { melde(s.id, `verweist auf den Krieg „${s.krieg}“, den es nicht gibt`); continue; }
  if (s.jahr != null) {
    if (k.von != null && s.jahr < k.von) melde(s.id, `Jahr ${s.jahr} liegt vor dem Krieg (${k.von}–${k.bis ?? '…'})`);
    if (k.bis != null && s.jahr > k.bis) melde(s.id, `Jahr ${s.jahr} liegt nach dem Krieg (${k.von}–${k.bis})`);
  }
  if (s.sieger && !(k.seiten ?? []).some((p) => p.name === s.sieger)) {
    melde(s.id, `Sieger „${s.sieger}“ ist keine Seite von „${k.id}“`);
  }
}

/* 6 – Bestehen laut Wissensbasis gegen das, was die Karte zeigt.
   Die Karte ist hier die härtere Quelle: Sie zeigt es, also stand es da. */
abschnitt('Bestehen laut Wissensbasis gegen die Karte');
const KARTENLUFT = 60;
for (const [name, eintrag] of Object.entries(wissen)) {
  const treffer = [...aufKarte.entries()]
    .filter(([n]) => kanon(n) === name || n === name)
    .flatMap(([, l]) => l)
    .sort((a, b) => a - b);
  if (!treffer.length) continue;
  const [erst, letzt] = [treffer[0], treffer[treffer.length - 1]];
  if (eintrag.founded != null && erst < eintrag.founded - KARTENLUFT) {
    melde(name, `Karte zeigt es ab ${erst}, gegründet laut Wissensbasis ${eintrag.founded}`);
  }
  if (eintrag.dissolved != null && letzt > eintrag.dissolved + KARTENLUFT) {
    melde(name, `Karte zeigt es bis ${letzt}, aufgelöst laut Wissensbasis ${eintrag.dissolved}`);
  }
}

/* 7 – Ereignisse, die auf keinem Zeitschnitt erscheinen können. */
abschnitt('Ereignisse gegen die Zeitschnitte');
for (const e of ereignisse) {
  if (e.jahr == null) { melde(e.id, 'ohne Jahr'); continue; }
  if (e.jahr < jahre[0] || e.jahr > jahre[jahre.length - 1] + 5) {
    melde(e.id, `Jahr ${e.jahr} liegt außerhalb aller Zeitschnitte`);
  }
}

console.log(`\n${Object.keys(wissen).length} Wissenseinträge, ${Object.keys(herrscher).length} Herrscherlisten, `
  + `${kriege.size} Kriege, ${schlachten.length} Schlachten, ${ereignisse.length} Ereignisse geprüft.`);
console.log(fehler ? `\n${fehler} Widerspruch/Widersprüche gefunden.` : '\nKeine Widersprüche zwischen den Datensätzen.');
process.exit(fehler ? 1 : 0);
