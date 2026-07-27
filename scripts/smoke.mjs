#!/usr/bin/env node
/**
 * Kurzer Funktionsdurchlauf gegen einen laufenden Server.
 * Aufruf: node scripts/smoke.mjs [http://127.0.0.1:5173]
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://127.0.0.1:5173';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(`PAGEERROR ${e.message}`));

const checks = [];
const check = async (name, fn) => {
  try {
    await fn();
    checks.push(`  ✓ ${name}`);
  } catch (err) {
    checks.push(`  ✗ ${name} – ${err.message}`);
  }
};
const visible = async (sel) => {
  if (!(await page.locator(sel).isVisible())) throw new Error(`${sel} nicht sichtbar`);
};

await page.goto(`${BASE}/#position=3/40/20&year=1815`, { waitUntil: 'networkidle' });
await page.waitForSelector('#app:not([hidden])', { timeout: 20000 });
await page.waitForTimeout(1500);

await check('Ladeschirm verschwindet', async () => {
  await page.waitForFunction(() => document.getElementById('boot').hidden, null, { timeout: 8000 });
});

await check('Startjahr aus dem Hash übernommen', async () => {
  const year = await page.textContent('#yearBig');
  if (!year.includes('1815')) throw new Error(`gelesen: ${year}`);
});

await check('Karte zeichnet Gemeinwesen', async () => {
  const n = await page.evaluate(() => document.querySelectorAll('.leaflet-pane canvas').length);
  if (n < 3) throw new Error(`nur ${n} Zeichenflächen`);
});

await check('Suche findet und öffnet ein Gemeinwesen', async () => {
  await page.fill('#search', 'Preuß');
  await page.waitForSelector('#suggest li[data-name]', { timeout: 4000 });
  await page.keyboard.press('Enter');
  await page.waitForSelector('#panel:not([hidden])', { timeout: 4000 });
  await visible('.pnl__title');
});

await check('Klick auf die Karte wählt ein Gemeinwesen', async () => {
  await page.keyboard.press('Escape');
  // Mitteleuropa im Ausschnitt #position=3/40/20 – die Meeresebene darf den
  // Klick nicht abfangen.
  await page.mouse.click(720, 300);
  await page.waitForSelector('#panel:not([hidden])', { timeout: 4000 });
  const title = await page.textContent('.pnl__title');
  if (!title.trim()) throw new Error('kein Titel');
});

await check('Detailtafel zeigt Steckbrief-Kacheln', async () => {
  const n = await page.locator('.fact').count();
  if (n < 2) throw new Error(`nur ${n} Kacheln`);
});

await check('Nachbar-Chips vorhanden und anklickbar', async () => {
  const chip = page.locator('[data-goto]').first();
  if (!(await chip.count())) throw new Error('keine Chips');
  const before = await page.textContent('.pnl__title');
  await chip.click();
  await page.waitForTimeout(700);
  const after = await page.textContent('.pnl__title');
  if (before === after) throw new Error('Auswahl hat sich nicht geändert');
});

await check('Zeitschnitt vor und zurück', async () => {
  await page.keyboard.press('Escape');
  await page.click('#btnNext');
  await page.waitForTimeout(900);
  const y1 = await page.textContent('#yearBig');
  await page.click('#btnPrev');
  await page.waitForTimeout(900);
  const y2 = await page.textContent('#yearBig');
  if (y1 === y2) throw new Error('Jahr unverändert');
  if (!y2.includes('1815')) throw new Error(`zurück bei ${y2}`);
});

await check('Zeitregler springt an eine andere Stelle', async () => {
  const box = await page.locator('#track').boundingBox();
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height / 2);
  await page.waitForTimeout(1200);
  const year = await page.textContent('#yearBig');
  if (year.includes('1815')) throw new Error('Jahr unverändert');
});

await check('Zeitreise startet und hält an', async () => {
  // Im Ruhezustand darf nur das Abspielsymbol stehen.
  if (await page.locator('#btnPlay .i-pause').isVisible()) throw new Error('Pausensymbol im Ruhezustand sichtbar');
  await page.click('#btnPlay');
  await page.waitForTimeout(300);
  if (!(await page.locator('#btnPlay .i-pause').isVisible())) throw new Error('Pausensymbol fehlt');
  if (await page.locator('#btnPlay .i-play').isVisible()) throw new Error('Abspielsymbol während der Fahrt sichtbar');
  await page.click('#btnPlay');
  await page.waitForTimeout(200);
  if (!(await page.locator('#btnPlay .i-play').isVisible())) throw new Error('Abspielsymbol kehrt nicht zurück');
});

await check('Farbwelt wechselt', async () => {
  await page.keyboard.press('t');
  await page.waitForTimeout(500);
  const theme = await page.getAttribute('html', 'data-theme');
  if (theme !== 'parchment') throw new Error(`Theme: ${theme}`);
  await page.keyboard.press('t');
});

await check('Ebenen-Menü und Einfärbungswechsel', async () => {
  await page.click('#btnLayers');
  await visible('#layersMenu');
  await page.click('[data-mode="sovereign"]');
  await page.waitForTimeout(500);
  const checked = await page.getAttribute('[data-mode="sovereign"]', 'aria-checked');
  if (checked !== 'true') throw new Error('Modus nicht aktiv');
  await page.click('[data-mode="polity"]');
  await page.keyboard.press('Escape');
});

await check('Legende zeigt Einträge', async () => {
  await page.click('#btnLegend');
  await visible('#legendBox');
  const n = await page.locator('#legendList li').count();
  if (n < 5) throw new Error(`nur ${n} Einträge`);
  await page.keyboard.press('Escape');
});

await check('Über-Fenster öffnet und schließt', async () => {
  await page.click('#btnAbout');
  await visible('#modal .modal__card');
  await page.keyboard.press('Escape');
  if (await page.locator('#modal').isVisible()) throw new Error('Fenster bleibt offen');
});

await check('Adresszeile spiegelt den Zustand', async () => {
  await page.waitForTimeout(600);
  const hash = page.url().split('#')[1] ?? '';
  if (!hash.includes('position=') || !hash.includes('year=')) throw new Error(hash || '(leer)');
});

await check('Gradnetz und Gewässer lassen sich zuschalten', async () => {
  await page.click('#btnLayers');
  // Die Kästchen selbst sind visuell ersetzt – geklickt wird das Label.
  await page.locator('label.switch', { has: page.locator('#optGraticule') }).click();
  await page.locator('label.switch', { has: page.locator('#optRivers') }).click();
  await page.waitForTimeout(600);
  if (!(await page.isChecked('#optGraticule'))) throw new Error('Gradnetz nicht aktiv');
  if (!(await page.isChecked('#optRivers'))) throw new Error('Gewässer nicht aktiv');
  await page.keyboard.press('Escape');
});

await check('Adresszeile steuert die Karte (hashchange)', async () => {
  await page.evaluate(() => { location.hash = 'position=2/20/20&year=-8000'; });
  await page.waitForTimeout(2500);
  const year = await page.textContent('#yearBig');
  if (!year.includes('8000')) throw new Error(`gelesen: ${year}`);
});

await check('Steinzeit-Zeitschnitt lädt vollständig', async () => {
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.getElementById('boot').hidden, null, { timeout: 15000 });
  await page.waitForTimeout(1200);
  const year = await page.textContent('#yearBig');
  if (!year.includes('8000')) throw new Error(`gelesen: ${year}`);
  const count = await page.textContent('#epochStats');
  if (!/\d/.test(count)) throw new Error('keine Kennzahlen');
});

await check('Zeitleiste lässt sich jahresgenau wählen', async () => {
  await page.evaluate(() => { location.hash = 'position=3/40/30&year=723'; });
  await page.waitForTimeout(2200);
  const year = await page.textContent('#yearBig');
  if (!year.includes('723')) throw new Error(`Jahr: ${year}`);
  const note = await page.textContent('#yearTitle');
  if (!note.includes('700')) throw new Error(`Kartenstand fehlt: ${note}`);
  // Pfeiltaste bewegt um genau ein Jahr
  await page.locator('#track').focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(400);
  const next = await page.textContent('#yearBig');
  if (!next.includes('724')) throw new Error(`nach Pfeiltaste: ${next}`);
});

await check('Umayyaden reichen 700 bis Persien', async () => {
  await page.evaluate(() => { location.hash = 'position=3/33/55&year=700'; });
  await page.waitForTimeout(2200);
  const found = await page.evaluate(() => {
    const map = window.__atlasMap;
    // Isfahan – 700 n. Chr. umayyadisch
    const pt = map.latLngToContainerPoint([32.65, 51.67]);
    return { x: Math.round(pt.x), y: Math.round(pt.y) };
  });
  await page.mouse.click(found.x, found.y);
  await page.waitForSelector('#panel:not([hidden])', { timeout: 4000 });
  const title = await page.textContent('.pnl__title');
  if (!/Umayyaden/.test(title)) throw new Error(`Isfahan gehört zu: ${title}`);
  await page.keyboard.press('Escape');
});

await check('Mobiles Format bleibt bedienbar', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(800);
  await visible('#timeline');
  await visible('#track');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 2) throw new Error(`waagerechter Überlauf: ${overflow}px`);
  await page.setViewportSize({ width: 1440, height: 900 });
});

console.log(checks.join('\n'));
const failed = checks.filter((c) => c.includes('✗')).length;
console.log(`\n${checks.length - failed}/${checks.length} Prüfungen bestanden`);

const relevant = errors.filter((e) => !/ERR_TUNNEL|ERR_NAME_NOT_RESOLVED|wikipedia/i.test(e));
if (relevant.length) console.log(`\nKonsolenfehler:\n${relevant.slice(0, 10).join('\n')}`);
else console.log('Keine Konsolenfehler (Netzfehler zu wikipedia.org ausgenommen).');

await browser.close();
process.exit(failed ? 1 : 0);
