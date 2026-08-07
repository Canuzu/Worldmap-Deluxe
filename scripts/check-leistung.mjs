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
 * Mit HANDY=1 läuft dieselbe Messung als Telefon: 390×844 mit doppelter
 * Bildpunktdichte, Fingerbedienung statt Maus und ein viermal langsamer
 * gerechneter Hauptstrang. Der Faktor vier ist die übliche Annäherung an ein
 * Mittelklassetelefon gegenüber einem Schreibtischrechner. Die Latte liegt
 * entsprechend tiefer – 30 Bilder je Sekunde sind auf einem Telefon in
 * Bewegung ein guter Wert, keine Notlösung.
 *
 * Aufruf: node scripts/check-leistung.mjs [http://127.0.0.1:4173]
 *         HANDY=1 node scripts/check-leistung.mjs
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://127.0.0.1:4173';
const HANDY = Boolean(process.env.HANDY);
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage(HANDY
  ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
  : { viewport: { width: 1440, height: 900 } });

/* Der gedrosselte Hauptstrang ist der Kern der Telefonmessung: Ein Telefon hat
   nicht weniger Bildpunkte zu füllen, sondern weniger Rechenzeit dafür. */
if (HANDY) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
}

/* Auf dem Telefon zieht ein Finger, kein Mauszeiger – Leaflet nimmt dafür
   andere Ereignisse, und nur die gemessene Bahn sagt etwas über die
   tatsächliche Bedienung. */
const ziehen = async (bahn) => {
  if (HANDY) {
    const cdp = await page.context().newCDPSession(page);
    const senden = (type, x, y) => cdp.send('Input.dispatchTouchEvent', {
      type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }],
    });
    await senden('touchStart', bahn[0][0], bahn[0][1]);
    for (const [x, y] of bahn.slice(1)) { await senden('touchMove', x, y); await page.waitForTimeout(16); }
    await senden('touchEnd', 0, 0);
    return;
  }
  await page.mouse.move(bahn[0][0], bahn[0][1]);
  await page.mouse.down();
  for (const [x, y] of bahn.slice(1)) { await page.mouse.move(x, y); await page.waitForTimeout(16); }
  await page.mouse.up();
};

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

/* Die Latte. Auf dem Telefon liegt sie tiefer, weil dort viermal weniger
   Rechenzeit je Bild zur Verfügung steht; 30 Bilder je Sekunde in Bewegung
   sind dort ein guter Wert. Im Ruhezustand gilt dieselbe Forderung wie überall:
   Wo nichts passiert, darf auch nichts gerechnet werden. */
const LATTE = HANDY ? { ruhe: 50, bewegung: 30 } : { ruhe: 55, bewegung: 45 };
const mitte = { x: HANDY ? 195 : 720, y: HANDY ? 420 : 450 };

/* 1. Ruhe. */
await messe('Ruhezustand', async () => { await page.waitForTimeout(2000); }, LATTE.ruhe);

/* 2. Zeitreise über mehrere Jahresschnitte. */
await messe('Zeitreise', async () => {
  await page.click('#btnPlay');
  await page.waitForTimeout(6000);
  await page.click('#btnPlay');
}, LATTE.bewegung);

/* 3. Schwenken. Gezogen wird wie von Hand – mit der Maus am Schreibtisch, mit
      dem Finger am Telefon –, damit Leaflet dieselben Bewegungsereignisse
      bekommt wie bei einem Menschen. */
await messe('Schwenken', async () => {
  const bahn = [[mitte.x, mitte.y]];
  for (let i = 1; i < 40; i++) {
    bahn.push([mitte.x - i * (HANDY ? 3 : 8), mitte.y + Math.sin(i / 4) * (HANDY ? 20 : 40)]);
  }
  await ziehen(bahn);
  await page.waitForTimeout(600);
}, LATTE.bewegung);

/* 4. Zoomen. Am Telefon führt kein Mausrad, sondern die Kneifgeste mit zwei
      Fingern. Ein Doppeltipp täte es auch, wählt aber unterwegs das Land unter
      dem Finger aus – gemessen würde dann das Aufziehen der Tafel und nicht
      das Zoomen. */
await messe('Zoomen', async () => {
  if (HANDY) {
    const cdp = await page.context().newCDPSession(page);
    const punkte = (d) => [
      { x: mitte.x - d, y: mitte.y - d },
      { x: mitte.x + d, y: mitte.y + d },
    ];
    for (let runde = 0; runde < 3; runde++) {
      const weiten = runde % 2 ? [110, 30] : [30, 110];
      const [von, bis] = weiten;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: punkte(von) });
      for (let i = 1; i <= 14; i++) {
        await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchMove', touchPoints: punkte(von + ((bis - von) * i) / 14),
        });
        await page.waitForTimeout(16);
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.waitForTimeout(700);
    }
    return;
  }
  for (let i = 0; i < 4; i++) {
    await page.mouse.wheel(0, -240);
    await page.waitForTimeout(500);
  }
  for (let i = 0; i < 4; i++) {
    await page.mouse.wheel(0, 240);
    await page.waitForTimeout(500);
  }
}, LATTE.bewegung);

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
}, LATTE.bewegung);

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
