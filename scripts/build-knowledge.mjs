#!/usr/bin/env node
/**
 * Führt die redaktionellen Bausteine aus src/data zu den Dateien zusammen,
 * die der Atlas zur Laufzeit lädt:
 *
 *   public/data/knowledge/polities.de.json    Steckbriefe samt Herrscherlisten
 *   public/data/knowledge/names.de.json       Namen und Schreibvarianten
 *   public/data/knowledge/ereignisse.de.json  Ereignisse als Marken auf der Karte
 *
 * Die Quelldateien liegen thematisch getrennt in src/data/knowledge/*.json,
 * src/data/rulers/*.json und src/data/ereignisse/*.json, damit sie
 * überschaubar bleiben und sich getrennt pflegen lassen.
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

  // Alles, was auffällt, wird gesammelt und am Ende in einem Block ausgegeben –
  // sonst geht ein Hinweis zwischen den Fortschrittszeilen unter.
  const problems = [];

  /* ---------------------------------------------------------- Namen */
  const names = readJSON(path.join(SRC, 'names.de.json'));
  fs.writeFileSync(path.join(OUT, 'names.de.json'), JSON.stringify(names));
  console.log(
    `› names.de.json      ${Object.keys(names.names).length} Namen, ` +
    `${Object.keys(names.aliases).length} Schreibvarianten`,
  );

  /* ------------------------------------------------------- Ereignisse */
  // Getrennt ausgeliefert statt ins Programm gebündelt: Sie werden erst
  // gebraucht, wenn die Karte schon steht.
  const evDir = path.join(SRC, 'ereignisse');
  const ARTEN = ['vertrag', 'gruendung', 'fahrt', 'seuche', 'wissen', 'umbruch'];
  const ereignisse = [];
  const gesehen = new Set();

  for (const file of fs.existsSync(evDir)
    ? fs.readdirSync(evDir).filter((f) => f.endsWith('.json')).sort()
    : []) {
    const chunk = readJSON(path.join(evDir, file));
    for (const e of chunk.ereignisse ?? []) {
      if (gesehen.has(e.id)) problems.push(`doppelte Kennung "${e.id}" in ${file}`);
      gesehen.add(e.id);
      if (!ARTEN.includes(e.art)) problems.push(`${e.id}: unbekannte Art "${e.art}"`);
      if (!Array.isArray(e.ort) || e.ort.length !== 2) problems.push(`${e.id}: kein Ort`);
      else if (Math.abs(e.ort[0]) > 180 || Math.abs(e.ort[1]) > 90) {
        problems.push(`${e.id}: Ort außerhalb der Erde (${e.ort.join(', ')}) – Länge und Breite vertauscht?`);
      }
      if (!Number.isFinite(e.jahr)) problems.push(`${e.id}: kein Jahr`);
      if (e.bis != null && e.bis < e.jahr) problems.push(`${e.id}: endet vor dem Anfang`);
      ereignisse.push(e);
    }
  }
  ereignisse.sort((a, b) => a.jahr - b.jahr);
  fs.writeFileSync(
    path.join(OUT, 'ereignisse.de.json'),
    JSON.stringify({
      meta: { about: 'Ereignisse als Marken auf der Karte.', language: 'de', count: ereignisse.length },
      ereignisse,
    }),
  );
  console.log(`› ereignisse.de.json ${ereignisse.length} Ereignisse`);

  /* --------------------------------------------------------- Konflikte */
  // Kriege und Schlachten liegen in denselben Quelldateien, weil sie
  // zusammengehören: Eine Schlacht ohne ihren Krieg ist eine Anekdote.
  // Ausgeliefert werden sie getrennt vom Programm, wie die Ereignisse.
  const kDir = path.join(SRC, 'konflikte');
  const K_ARTEN = ['krieg', 'eroberung', 'buergerkrieg', 'aufstand', 'revolution'];
  const kriege = [];
  const schlachten = [];
  const kIds = new Set();
  const sIds = new Set();

  for (const file of fs.existsSync(kDir)
    ? fs.readdirSync(kDir).filter((f) => f.endsWith('.json')).sort()
    : []) {
    const chunk = readJSON(path.join(kDir, file));
    for (const k of chunk.kriege ?? []) {
      if (kIds.has(k.id)) problems.push(`doppelte Kriegskennung "${k.id}" in ${file}`);
      kIds.add(k.id);
      if (!K_ARTEN.includes(k.art)) problems.push(`${k.id}: unbekannte Art "${k.art}"`);
      if (!Number.isFinite(k.von)) problems.push(`${k.id}: kein Anfangsjahr`);
      if (k.bis != null && k.bis < k.von) problems.push(`${k.id}: endet vor dem Anfang`);
      if (!Array.isArray(k.ort) || Math.abs(k.ort[0]) > 180 || Math.abs(k.ort[1]) > 90) {
        problems.push(`${k.id}: Schwerpunkt fehlt oder liegt außerhalb der Erde`);
      }
      if ((k.seiten ?? []).length < 2) problems.push(`${k.id}: weniger als zwei Seiten`);
      kriege.push(k);
    }
    for (const s of chunk.schlachten ?? []) {
      if (sIds.has(s.id)) problems.push(`doppelte Schlachtkennung "${s.id}" in ${file}`);
      sIds.add(s.id);
      if (!Number.isFinite(s.jahr)) problems.push(`${s.id}: kein Jahr`);
      if (!Array.isArray(s.ort) || Math.abs(s.ort[0]) > 180 || Math.abs(s.ort[1]) > 90) {
        problems.push(`${s.id}: Ort fehlt oder liegt außerhalb der Erde – Länge und Breite vertauscht?`);
      }
      schlachten.push(s);
    }
  }

  // Erst nach dem Einlesen aller Dateien prüfen: Eine Schlacht darf in einer
  // anderen Datei stehen als ihr Krieg.
  for (const s of schlachten) {
    if (!s.krieg) { problems.push(`${s.id}: kein Krieg zugeordnet`); continue; }
    if (!kIds.has(s.krieg)) problems.push(`${s.id}: unbekannter Krieg "${s.krieg}"`);
  }
  const jeKrieg = new Map();
  for (const s of schlachten) jeKrieg.set(s.krieg, (jeKrieg.get(s.krieg) ?? 0) + 1);
  for (const k of kriege) {
    if (!jeKrieg.has(k.id)) problems.push(`Krieg "${k.id}" hat keine einzige Schlacht`);
    // Die Seiten einer Schlacht müssen zu denen ihres Krieges passen, sonst
    // steht im Register ein Sieger, den es in diesem Krieg nicht gibt.
    const namen = new Set((k.seiten ?? []).map((s) => s.name));
    for (const s of schlachten.filter((x) => x.krieg === k.id)) {
      if (s.sieger && !namen.has(s.sieger)) {
        problems.push(`${s.id}: Sieger "${s.sieger}" ist keine Seite von "${k.id}"`);
      }
    }
  }

  kriege.sort((a, b) => a.von - b.von);
  schlachten.sort((a, b) => a.jahr - b.jahr);
  fs.writeFileSync(
    path.join(OUT, 'konflikte.de.json'),
    JSON.stringify({
      meta: {
        about: 'Kriege als Register, Schlachten als Marken auf der Karte.',
        language: 'de',
        kriege: kriege.length,
        schlachten: schlachten.length,
      },
      kriege,
      schlachten,
    }),
  );
  console.log(`› konflikte.de.json  ${kriege.length} Kriege, ${schlachten.length} Schlachten`);

  /* --------------------------------------------------- Herrscherlisten */
  // Die Listen liegen getrennt von den Steckbriefen: Sie sind lang, sie ändern
  // sich anders (eine Liste wächst am Ende, ein Steckbrief wird umgeschrieben),
  // und sie gehören zum Gemeinwesen als ganzem, nicht zu einem Zeitabschnitt.
  // Der Build schneidet sie hier auf die Abschnitte zu.
  const rulerDir = path.join(SRC, 'rulers');
  const rulerLists = {};
  const rulerFiles = fs.existsSync(rulerDir)
    ? fs.readdirSync(rulerDir).filter((f) => f.endsWith('.json')).sort()
    : [];
  for (const file of rulerFiles) {
    const chunk = readJSON(path.join(rulerDir, file));
    for (const [key, liste] of Object.entries(chunk)) {
      if (key.startsWith('_')) continue;
      rulerLists[key] = (rulerLists[key] ?? []).concat(liste);
    }
  }
  for (const liste of Object.values(rulerLists)) {
    liste.sort((a, b) => (a.from ?? 0) - (b.from ?? 0) || (a.to ?? 0) - (b.to ?? 0));
  }

  /* ----------------------------------------------------- Steckbriefe */
  const dir = path.join(SRC, 'knowledge');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort() : [];

  const entries = {};
  const benutzteListen = new Set();
  let periods = 0;
  let rulers = 0;

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

      // Jeder Zeitabschnitt bekommt die Herrschenden, deren Regierungszeit ihn
      // berührt. Wer über eine Abschnittsgrenze hinweg regiert – Karl V. sitzt
      // 1518 wie 1550 auf dem Thron –, steht in beiden Listen.
      const liste = rulerLists[key];
      if (liste) {
        benutzteListen.add(key);
        for (const period of entry.periods ?? []) {
          const von = period.from ?? -Infinity;
          const bis = period.to ?? Infinity;
          const treffer = liste.filter((r) => (r.from ?? -Infinity) <= bis && von <= (r.to ?? Infinity));
          if (treffer.length) {
            period.rulers = treffer;
            rulers += treffer.length;
          }
        }
        if (!(entry.periods ?? []).some((p) => p.rulers)) {
          problems.push(`Herrscherliste "${key}" passt in keinen Zeitabschnitt`);
        }
      }

      entries[key] = { ...entry, source: file.replace('.json', '') };
    }
    console.log(`  ${file.padEnd(24)} ${Object.keys(chunk).filter((k) => !k.startsWith('_')).length} Einträge`);
  }

  // Eine Liste ohne Steckbrief läuft ins Leere und fällt sonst nicht auf.
  for (const key of Object.keys(rulerLists)) {
    if (!benutzteListen.has(key)) problems.push(`Herrscherliste "${key}" hat keinen Steckbrief`);
  }
  // Eine Regierungszeit, die vor der vorigen beginnt und endet, deutet auf
  // vertauschte Jahreszahlen hin.
  for (const [key, liste] of Object.entries(rulerLists)) {
    for (const r of liste) {
      if (!r.name) problems.push(`${key}: Regierungszeit ohne Namen`);
      if (r.from == null) problems.push(`${key}: "${r.name}" ohne Anfangsjahr`);
      if (r.to != null && r.from != null && r.to < r.from) {
        problems.push(`${key}: "${r.name}" endet (${r.to}) vor dem Anfang (${r.from})`);
      }
    }
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
        rulerLists: benutzteListen.size,
      },
      entries,
    }),
  );

  console.log(`\n› polities.de.json   ${Object.keys(entries).length} Steckbriefe, ${periods} Zeitabschnitte`);
  console.log(
    `› Herrscherlisten    ${benutzteListen.size} Gemeinwesen, ` +
    `${Object.values(rulerLists).reduce((n, l) => n + l.length, 0)} Regierungszeiten ` +
    `(${rulers} Zuordnungen zu Zeitabschnitten)`,
  );

  if (problems.length) {
    console.log(`\n${problems.length} Hinweis(e):`);
    for (const p of problems.slice(0, 40)) console.log(`  · ${p}`);
    if (problems.length > 40) console.log(`  … und ${problems.length - 40} weitere`);
  }
}

main();
