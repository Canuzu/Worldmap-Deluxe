#!/usr/bin/env node
/**
 * Misst, wie flüssig die Seite läuft.
 *
 * „Fühlt sich träge an“ ist keine Zahl, und ohne Zahl optimiert man ins Blaue.
 * Gemessen werden die vier Bewegungen, die der Benutzer tatsächlich sieht:
 *
 *   1. Zeitreise – die Karte zeichnet bei jedem Jahresschritt alle Gemeinwesen neu.
 *   2. Schwenken und Zoomen – Leaflet zeichnet die Vektorebenen bei jeder Bewegung.
 *   3. Schlachtverlauf – die Leinwand zeichnet jeden Einzelbild neu.
 *   4. Jahressprung – der teuerste Einzelvorgang: neuer Zeitschnitt, neue Geometrie.
 *
 * Für jede wird die Bildrate über `requestAnimationFrame` gezählt und die
 * längste Blockade des Hauptstrangs („langer Task“) festgehalten. Ein einzelner
 * Task über 50 ms ist das, was man als Ruckeln wahrnimmt.
 *
 * Aufruf: node scripts/check-leistung.mjs [http://127.0.0.1:4173]
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://127.0.0.1:4173';
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

/* Bildraten und lange Tasks aufzeichnen. Beides läuft in der Seite, weil nur
   dort die Zeitpunkte stimmen, die der Benutzer erlebt. */
await page.addInitScript(() => {
  window.__mess = { bilder: [], lang: [] };
  let vorher = 0;
  const tick = (t) => {
    if (vorher) window.__mess.bilder.push(t - vorher);
    vorher = t;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) window.__mess.lang.push(Math.round(e.duration));
    }).observe({ entryTypes: ['longtask'] });
  } catch { /* ohne Beobachter eben nur Bildraten */ }
  window.__messStart = () => { window.__mess.bilder = []; window.__mess.lang = []; };
});

const ernte = async () => page.evaluate(() => {
  const b = window.__mess.bilder.slice().sort((x, y) => x - y);
  const p = (q) => (b.length ? b[Math.min(b.length - 1, Math.floor(b.length * q))] : 0);
  return {
    bilder: b.length,
    mittel: b.length ? +(b.reduce((s, x) => s + x, 0) / b.length).toFixed(1) : 0,
    p95: +p(.95).toFixed(1),
    schlimmstes: +(b.at(-1) ?? 0).toFixed(1),
    langeTasks: window.__mess.lang.length,
    laengster: Math.max(0, ...window.__mess.lang),
  };
});

const ergebnisse = [];
const messe = async (name, fn, ziel) => {
  await page.evaluate(() => window.__messStart());
  await fn();
  const m = await ernte();
  m.fps = m.mittel ? +(1000 / m.mittel).toFixed(1) : 0;
  ergebnisse.push({ name, ziel, ...m });
};

await page.goto(`${BASE}/#position=4/48/12&year=1815`, { waitUntil: 'networkidle' });
await page.waitForSelector('#app:not([hidden])', { timeout: 20000 });
await page.waitForFunction(() => document.getElementById('boot').hidden, null, { timeout: 15000 });
await page.waitForTimeout(2000);

/* 1. Ruhe. Die Latte: Eine Seite, auf der nichts passiert, darf auch nichts tun. */
await messe('Ruhezustand', async () => { await page.waitForTimeout(2000); }, 55);

/* 2. Zeitreise über mehrere Jahresschnitte. */
await messe('Zeitreise', async () => {
  await page.click('#btnPlay');
  await page.waitForTimeout(6000);
  await page.click('#btnPlay');
}, 45);

/* 3. Schwenken. Gezogen wird mit der Maus, damit Leaflet dieselben
      Bewegungsereignisse bekommt wie bei einem Menschen. */
await messe('Schwenken', async () => {
  await page.mouse.move(720, 450);
  await page.mouse.down();
  for (let i = 0; i < 40; i++) {
    await page.mouse.move(720 - i * 8, 450 + Math.sin(i / 4) * 40);
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
  await page.waitForTimeout(600);
}, 45);

/* 4. Zoomen. */
await messe('Zoomen', async () => {
  for (let i = 0; i < 4; i++) {
    await page.mouse.wheel(0, -240);
    await page.waitForTimeout(500);
  }
  for (let i = 0; i < 4; i++) {
    await page.mouse.wheel(0, 240);
    await page.waitForTimeout(500);
  }
}, 45);

/* 5. Jahressprünge – gemessen als Blockadezeit, nicht als Bildrate.
 *
 * Ein Jahressprung ist kein Dauerzustand, sondern ein Ereignis: Die Frage ist
 * nicht „wie viele Bilder je Sekunde“, sondern „wie lange steht die Seite
 * still“. Gezählt wird deshalb, was der Browser als langen Task meldet –
 * jede Blockade des Hauptstrangs über 50 ms – und zwar die Summe über zwanzig
 * Sprünge. Von drei Durchgängen zählt der mittlere: Diese Maschine hat
 * Nachbarn, und ein einzelner Ausreißer sagt nichts über den Code.
 */
const laeufe = [];
for (let n = 0; n < 3; n++) {
  laeufe.push(await page.evaluate(async () => {
    // Der Beobachter aus dem Anfangsskript sammelt schon – hier wird nur sein
    // Stand genullt. Ein zweiter, hier angelegter Beobachter bekam nichts:
    // Seine Rückrufe stehen hinter der laufenden Auswertung in der Schlange.
    // Erst ganz nach hinten zurück: Von 1815 aus sind nach sechs Sprüngen
    // alle Zeitschnitte durch, und weitere Klicks tun nichts. Ohne das
    // Zurücksetzen maß der zweite Durchgang die Stille.
    for (let i = 0; i < 22; i++) {
      document.getElementById('btnPrev').click();
      await new Promise((r) => setTimeout(r, 120));
    }
    await new Promise((r) => setTimeout(r, 600));
    window.__mess.lang = [];
    for (let i = 0; i < 20; i++) {
      document.getElementById('btnNext').click();
      await new Promise((r) => setTimeout(r, 420));
    }
    await new Promise((r) => setTimeout(r, 500));
    /* Gewertet wird die Blockadezeit über der Wahrnehmungsschwelle: Von einem
       Task zählt nur, was er länger als 50 ms dauert. Das ist das übliche
       Maß, und es bewertet richtig, was hier geändert wurde – eine Blockade
       von 90 ms in zwei von 45 zu zerlegen ist ein Gewinn, obwohl es die
       Zahl der Blockaden erhöht und ihre Summe kaum senkt. */
    const lang = window.__mess.lang;
    return {
      blockade: lang.reduce((s, x) => s + Math.max(0, x - 50), 0),
      anzahl: lang.length,
      laengster: Math.max(0, ...lang),
    };
  }));
}
laeufe.sort((a, b) => a.blockade - b.blockade);
const sprung = laeufe[1];

/* 6. Schlachtverlauf. */
await page.click('#btnBattles');
await page.waitForTimeout(1200);
await page.evaluate(() => document.querySelector('[data-verlauf="waterloo"]')?.click());
await page.waitForFunction(() => window.__battles?.imAnflug === true, null, { timeout: 20000 });
await page.waitForFunction(() => window.__battles?.imAnflug === false, null, { timeout: 25000 });
await page.waitForTimeout(800);
await messe('Schlachtverlauf', async () => {
  await page.evaluate(() => window.__battles.play());
  await page.waitForTimeout(6000);
  await page.evaluate(() => window.__battles.stop());
}, 45);

await browser.close();

/* ------------------------------------------------------------------ Ausgabe */

console.log('Bewegung            Bilder/s   Mittel   95 %   Schlimmstes   Lange Tasks');
console.log('─'.repeat(76));
let mangel = 0;
for (const r of ergebnisse) {
  const schlecht = r.fps < r.ziel;
  if (schlecht) mangel++;
  console.log(
    `${r.name.padEnd(20)}${String(r.fps).padStart(7)}${(`${r.mittel} ms`).padStart(9)}`
    + `${(`${r.p95} ms`).padStart(8)}${(`${r.schlimmstes} ms`).padStart(13)}`
    + `${String(r.langeTasks).padStart(11)}${r.laengster ? ` (max ${r.laengster} ms)` : ''}`
    + `${schlecht ? `   ✗ unter ${r.ziel}` : ''}`,
  );
}
console.log('─'.repeat(76));
console.log(`Zwanzig Jahressprünge: ${sprung.blockade} ms Blockadezeit über 50 ms `
  + `(${sprung.anzahl} lange Tasks, längster ${sprung.laengster} ms).`);
console.log(mangel
  ? `\n${mangel} Bewegung(en) unter der Latte.`
  : '\nAlle Bewegungen über der Latte.');
process.exit(mangel ? 1 : 0);
