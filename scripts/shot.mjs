#!/usr/bin/env node
/**
 * Entwicklungswerkzeug: Screenshots der laufenden Anwendung.
 * Aufruf: node scripts/shot.mjs <name> [hash] [aktion]
 */
import { chromium } from 'playwright';
import fs from 'node:fs';

const [name = 'shot', hash = '', action = ''] = process.argv.slice(2);
const OUT = '/tmp/shots';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(`PAGEERROR ${e.message}`));

await page.goto(`http://127.0.0.1:5173/${hash ? `#${hash}` : ''}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2600);

if (action) {
  // eslint-disable-next-line no-eval
  await eval(`(async (page) => { ${action} })`)(page);
  await page.waitForTimeout(1600);
}

await page.screenshot({ path: `${OUT}/${name}.png` });
console.log(`→ ${OUT}/${name}.png`);
if (errors.length) console.log('Konsolenfehler:\n' + errors.slice(0, 15).join('\n'));
else console.log('keine Konsolenfehler');

await browser.close();
