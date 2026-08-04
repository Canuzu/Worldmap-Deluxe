#!/usr/bin/env node
/**
 * Misst, wie viel der Atlas beim ersten Aufruf wirklich lädt – und was
 * später auf Anforderung dazukommt.
 *
 * Für das Aussehen gibt es `npm run check:layout`, für die Daten drei
 * Prüfskripte. Für die Ladelast gab es nichts, und genau dort ist der größte
 * Brocken jahrelang unbemerkt mitgelaufen: `ocean-hd.json` wurde 600 ms nach
 * dem ersten Bild geholt, obwohl die Karte ihn erst ab Zoomstufe 4,2
 * einsetzt.
 *
 * Gemessen wird in drei Abschnitten:
 *   1. bis die Karte steht (Weltansicht)
 *   2. zehn Sekunden Ruhe danach – was ohne Zutun noch nachkommt
 *   3. nach dem Hineinzoomen auf Stufe 5
 *
 * **Gemessen wird der gebaute Stand**, nicht der Entwicklungsserver:
 *
 *     npm run build && npm run preview -- --port 4173
 *     npm run check:ladelast http://127.0.0.1:4173
 *
 * Der Entwicklungsserver liefert jedes Modul einzeln und unverkleinert aus –
 * allein Leaflet 1.100 kB statt 42 kB, dazu Vites eigene Werkzeuge. Wer
 * gegen ihn misst, sieht rund 2,4 MB, die kein Besucher je lädt, und hält
 * die Seite fälschlich für zu schwer. Die Vorgabe unten zeigt trotzdem auf
 * 5173, damit ein schneller Blick ohne Bauen möglich bleibt; überschritten
 * ist die Grenze aber erst, wenn der gebaute Stand sie überschreitet.
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://127.0.0.1:5173';
/* Obergrenze für Abschnitt 1 und 2 zusammen. Gemessen wurden zuletzt 2909 kB
   im gebauten Stand; die Grenze lässt etwas Luft für redaktionelle Zuwächse,
   aber nicht genug, um einen weiteren Megabyte-Brocken zu verstecken. Vor dem
   Umbau waren es 6877 kB – die hochaufgelöste Küste und der volle Vorgriff
   lagen darin. */
const GRENZE_KB = 3100;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

let abschnitt = 'start';
const treffer = [];
page.on('response', async (res) => {
  const url = new URL(res.url());
  if (url.origin !== new URL(BASE).origin) return;
  let groesse = 0;
  try {
    groesse = Number((await res.allHeaders())['content-length']) || (await res.body()).length;
  } catch { /* abgebrochen oder aus dem Zwischenspeicher */ }
  treffer.push({ abschnitt, pfad: url.pathname.replace(/^\/+/, ''), groesse });
});

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForFunction(() => document.getElementById('boot')?.hidden, null, { timeout: 20000 });

abschnitt = 'ruhe';
await page.waitForTimeout(10000);

abschnitt = 'zoom';
// setZoom liefert die Karte zurück; die lässt sich nicht serialisieren.
await page.evaluate(() => { window.__atlasMap.setZoom(5, { animate: false }); });
await page.waitForTimeout(6000);

await browser.close();

/* ------------------------------------------------------------- Ausgabe */

const kb = (b) => `${(b / 1024).toFixed(0)} kB`;
const summe = (a) => treffer.filter((t) => t.abschnitt === a).reduce((n, t) => n + t.groesse, 0);

const NAMEN = {
  start: 'bis die Karte steht',
  ruhe: 'zehn Sekunden Ruhe danach',
  zoom: 'nach dem Zoomen auf Stufe 5',
};

for (const a of ['start', 'ruhe', 'zoom']) {
  const teil = treffer.filter((t) => t.abschnitt === a).sort((x, y) => y.groesse - x.groesse);
  console.log(`\n${NAMEN[a]}  —  ${kb(summe(a))} in ${teil.length} Anfragen`);
  for (const t of teil.slice(0, 6)) {
    if (t.groesse < 4096) continue;
    console.log(`   ${kb(t.groesse).padStart(8)}  ${t.pfad}`);
  }
}

const erstaufruf = summe('start') + summe('ruhe');
console.log(`\n${'─'.repeat(56)}`);
console.log(`Erstaufruf ohne Zutun:  ${kb(erstaufruf)}   (Grenze ${GRENZE_KB} kB)`);
console.log(`Beim Hineinzoomen:     +${kb(summe('zoom'))}`);

/* Am Entwicklungsserver gemessen ist die Zahl nicht vergleichbar – siehe
   Kopf der Datei. Lieber sagen als stillschweigend Alarm schlagen. */
const imBau = treffer.some((t) => t.pfad.includes('@vite/client') || t.pfad.includes('node_modules/'));
if (imBau) {
  const werkzeug = treffer
    .filter((t) => t.pfad.includes('@vite/') || t.pfad.includes('node_modules/') || t.pfad.startsWith('src/'))
    .reduce((n, t) => n + t.groesse, 0);
  console.log(`\nGemessen am Entwicklungsserver: ${kb(werkzeug)} davon sind unverkleinerte`);
  console.log('Quelldateien und Vites Werkzeug, die kein Besucher lädt. Für ein gültiges');
  console.log('Ergebnis: npm run build && npm run preview -- --port 4173, dann dieses');
  console.log('Skript mit http://127.0.0.1:4173 aufrufen.');
}

const hdBeimStart = treffer.some((t) => t.abschnitt !== 'zoom' && t.pfad.includes('ocean-hd'));
if (hdBeimStart) {
  console.log('\nocean-hd.json wird ohne Anlass geladen – das ist der Fehler, den dieses Skript sucht.');
}

const zuViel = !imBau && erstaufruf / 1024 > GRENZE_KB;
if (zuViel) console.log(`\nDer Erstaufruf liegt über der Grenze.`);
else console.log('\nDer Erstaufruf bleibt im Rahmen.');

process.exit(hdBeimStart || zuViel ? 1 : 0);
