#!/usr/bin/env node
/**
 * Misst, wie flüssig der Atlas läuft.
 *
 * `check-ladelast.mjs` misst, was geladen wird. Dieses Skript misst, was
 * danach passiert: Bildraten beim Schwenken und Zoomen, die Dauer eines
 * Epochenwechsels und den Speicherverbrauch. Gemessen wird mit gedrosselter
 * Rechenleistung, sonst sagt ein Ergebnis aus dieser Umgebung nichts über
 * ein gewöhnliches Notebook aus.
 *
 * Ausgegeben wird je Prüfung die schlechteste Bildzeit – nicht der
 * Durchschnitt. Ruckeln merkt man an den Ausreißern, nicht am Mittelwert.
 *
 * Aufruf: npm run check:fluss [-- http://127.0.0.1:4173] [--drossel 4]
 */
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const BASE = args.find((a) => a.startsWith('http')) ?? 'http://127.0.0.1:4173';
const DROSSEL = Number(args[args.indexOf('--drossel') + 1]) || 4;

/* Grenzwerte, gemessen im Testbrowser dieser Umgebung – der rendert in
   Software (SwiftShader) und ist zusätzlich gedrosselt. Die Zahlen sind also
   deutlich pessimistischer als auf einem Gerät mit Grafikbeschleunigung; sie
   taugen zum Vergleich zwischen zwei Fassungen, nicht als Versprechen. */
const GRENZE = { schwenken: 140, zoomen: 2600, epoche: 400, kueste: 5000 };

/* Die beiden großen Zahlen sind kein Freibrief, sondern der gemessene Stand:
   Ein Zoomsprung im schwersten Zeitschnitt (1492, 1.307 Gemeinwesen) und das
   Einsetzen der feinen Küste kosten hier gut zwei bzw. gut vier Sekunden –
   auf einem Gerät mit Grafikbeschleunigung entspricht das rund eine halbe
   bzw. eine Sekunde. Beides ist einmalig und nicht das, was man beim
   Bedienen als Ruckeln merkt; dafür stehen die 140 ms beim Schwenken.

   Die Schwellen liegen bewusst über dem gemessenen Stand (Zoomsprung 2,2 s,
   feine Küste 4,1 s): Diese Umgebung teilt sich die Rechenleistung mit
   anderen, einzelne Läufe streuen um mehr als die Hälfte. Eine Schwelle, die
   knapp über dem besten Lauf liegt, meldet Rauschen statt Rückschritten. */

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const cdp = await page.context().newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: DROSSEL });

/** Bildzeiten über eine Aktion hinweg aufzeichnen. */
async function messen(name, aktion, dauerMs = 2200) {
  await page.evaluate(() => {
    window.__frames = [];
    let letzte = performance.now();
    const tick = (t) => {
      window.__frames.push(t - letzte);
      letzte = t;
      window.__raf = requestAnimationFrame(tick);
    };
    window.__raf = requestAnimationFrame(tick);
  });
  await aktion();
  await page.waitForTimeout(dauerMs);
  const werte = await page.evaluate(() => {
    cancelAnimationFrame(window.__raf);
    return window.__frames.slice(2);
  });
  if (!werte.length) return { name, schlechteste: 0, ueber50: 0, bilder: 0 };
  const sortiert = [...werte].sort((a, b) => a - b);
  return {
    name,
    bilder: werte.length,
    median: sortiert[Math.floor(sortiert.length / 2)],
    p95: sortiert[Math.floor(sortiert.length * .95)],
    schlechteste: sortiert.at(-1),
    ueber50: werte.filter((v) => v > 50).length,
  };
}

const zeilen = [];
const zeige = (r, grenze) => {
  const schlecht = r.p95 > grenze;
  zeilen.push({ ...r, grenze, schlecht });
  console.log(
    `${schlecht ? '✗' : '✓'} ${r.name.padEnd(34)} ` +
    `Median ${String(Math.round(r.median)).padStart(3)} ms · ` +
    `95 % ${String(Math.round(r.p95)).padStart(4)} ms · ` +
    `schlechteste ${String(Math.round(r.schlechteste)).padStart(4)} ms · ` +
    `${r.ueber50} Bilder über 50 ms`,
  );
};

async function ladeJahr(jahr) {
  await page.goto(`${BASE}/#year=${jahr}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.getElementById('boot')?.hidden, null, { timeout: 40000 });
  await page.waitForTimeout(2500);
}

console.log(`Rechenleistung auf ein ${DROSSEL}tel gedrosselt.\n`);

/* -------------------------------------------------------- Schwenken */

for (const jahr of [1815, 1492]) {
  await ladeJahr(jahr);
  zeige(await messen(`Schwenken ${jahr}`, async () => {
    await page.mouse.move(700, 450);
    await page.mouse.down();
    for (let i = 0; i < 24; i++) {
      await page.mouse.move(700 - i * 12, 450 + i * 4);
      await page.waitForTimeout(16);
    }
    await page.mouse.up();
  }), GRENZE.schwenken);
}

/* ----------------------------------------------------------- Zoomen */

await ladeJahr(1492);

// Erst die feine Küstenlinie holen und einsetzen lassen – das ist ein
// einmaliger Vorgang und wird getrennt gemessen. Danach misst der Zoomtest
// den Dauerzustand, nicht das Umschalten.
const kuesteMs = await page.evaluate(async () => {
  window.__atlasMap.setZoom(3.4);
  await new Promise((r) => setTimeout(r, 7000));
  const t0 = performance.now();
  window.__atlasMap.setZoom(4.6);
  await new Promise((r) => {
    const start = performance.now();
    const pruef = () => {
      if (window.__atlas.coast.level === 'hi' || performance.now() - start > 25000) r();
      else setTimeout(pruef, 50);
    };
    pruef();
  });
  return performance.now() - t0;
});
const kSchlecht = kuesteMs > GRENZE.kueste;
zeilen.push({ name: 'Feine Küste einsetzen', p95: kuesteMs, grenze: GRENZE.kueste, schlecht: kSchlecht });
console.log(`${kSchlecht ? '✗' : '✓'} ${'Feine Küste einsetzen'.padEnd(34)} ${Math.round(kuesteMs)} ms (einmalig)`);

zeige(await messen('Zoomen 1492 (feine Küste)', async () => {
  for (const z of [4.8, 5.4, 4.8, 4.4]) {
    await page.evaluate((zz) => { window.__atlasMap.setZoom(zz); }, z);
    await page.waitForTimeout(500);
  }
}, 1400), GRENZE.zoomen);

/* -------------------------------------------------- Epochenwechsel */

await ladeJahr(1815);
const wechsel = await page.evaluate(async () => {
  const zeiten = [];
  for (const jahr of [1880, 1900, 1914, 1920, 1930]) {
    const t = performance.now();
    location.hash = `#year=${jahr}`;
    await new Promise((r) => {
      const start = performance.now();
      const pruef = () => {
        if (document.getElementById('yearBig').textContent.includes(String(jahr))
            || performance.now() - start > 6000) r();
        else requestAnimationFrame(pruef);
      };
      requestAnimationFrame(pruef);
    });
    zeiten.push(performance.now() - t);
    // Erst nach dem Messen zur Ruhe kommen lassen, sonst steckt die Pause
    // in der Zahl.
    await new Promise((r) => setTimeout(r, 900));
  }
  return zeiten;
});
const schnitt = wechsel.reduce((a, b) => a + b, 0) / wechsel.length;
const wSchlecht = Math.max(...wechsel) > GRENZE.epoche;
zeilen.push({ name: 'Epochenwechsel', p95: Math.max(...wechsel), grenze: GRENZE.epoche, schlecht: wSchlecht });
console.log(
  `${wSchlecht ? '✗' : '✓'} ${'Epochenwechsel'.padEnd(34)} ` +
  `Schnitt ${Math.round(schnitt)} ms · schlechtester ${Math.round(Math.max(...wechsel))} ms ` +
  `(${wechsel.map((z) => Math.round(z)).join(', ')})`,
);

/* ---------------------------------------------------------- Speicher */

const heap = await page.evaluate(() => performance.memory?.usedJSHeapSize ?? 0);
console.log(`\nJS-Speicher nach zehn Zeitschnitten: ${(heap / 1024 / 1024).toFixed(0)} MB`);

await browser.close();

const durchgefallen = zeilen.filter((z) => z.schlecht);
console.log(`\n${zeilen.length - durchgefallen.length}/${zeilen.length} Prüfungen im Rahmen.`);
if (durchgefallen.length) {
  for (const z of durchgefallen) {
    console.log(`  · ${z.name}: ${Math.round(z.p95)} ms (Grenze ${z.grenze} ms)`);
  }
}
process.exit(durchgefallen.length ? 1 : 0);
