#!/usr/bin/env node
/**
 * Prüft die Oberfläche auf Überschneidungen und Überläufe.
 *
 * Anlass: Gemeldet wurde „das Design ist teils verschoben“. Von Hand ist das
 * kaum zu finden – es sind fünf Fenstergrößen mal sechs Zustände, und die
 * Fehler zeigen sich nur in bestimmten Kombinationen. Gefunden wurden so:
 *
 *   · Das Ebenenmenü war rund 890 px hoch und lief bei JEDER üblichen
 *     Fenstergröße unten aus dem Bild.
 *   · Das Schlachtenfenster lag auf Maßstab und Quellenzeile.
 *   · Auf dem Telefon deckte die Detailtafel die Werkzeugsäule halb ab.
 *
 * Gemeldet wird nur, was wirklich stört: Eine höher liegende, deckende Fläche
 * darf verdecken – das ist ihr Zweck. Unsichtbare Elemente zählen nicht mit.
 *
 * Voraussetzung: ein laufender Entwicklungsserver (npm run dev).
 * Aufruf: npm run check:layout
 */
import { chromium } from 'playwright';
import fs from 'node:fs';

const OUT = process.env.LAYOUT_SHOTS ?? '/tmp/layout-shots';
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

const GROESSEN = [
  ['gross', 1920, 1080],
  ['normal', 1440, 900],
  ['klein', 1280, 720],
  ['schmal', 1024, 700],
  ['handy', 390, 844],
];

/** Überlappungen zwischen Bedienelementen finden – das Auge übersieht sie. */
const RECHTECKE = `(() => {
  const namen = ['.dock', '.tools', '.timeline', '.credits', '.rose', '.panel',
                 '#layersMenu', '#legendBox', '#battlesBox'];
  const out = {};
  for (const s of namen) {
    const el = document.querySelector(s);
    if (!el || el.hidden || el.offsetParent === null) continue;
    const cs = getComputedStyle(el);
    if (Number(cs.opacity) < 0.05 || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0) continue;
    out[s] = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
               r: Math.round(r.right), b: Math.round(r.bottom), z: Number(cs.zIndex) || 0,
               deckend: Number(cs.opacity) > .9 };
  }
  return { boxes: out, vw: innerWidth, vh: innerHeight,
           ueberlauf: document.documentElement.scrollWidth > innerWidth };
})()`;

function kollisionen(boxes, vw, vh) {
  const keys = Object.keys(boxes);
  const treffer = [];
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const a = boxes[keys[i]]; const b = boxes[keys[j]];
      const ux = Math.min(a.r, b.r) - Math.max(a.x, b.x);
      const uy = Math.min(a.b, b.b) - Math.max(a.y, b.y);
      if (ux <= 2 || uy <= 2) continue;
      // Eine höhere, deckende Ebene verdeckt bewusst – das ist kein Fehler.
      const oben = a.z === b.z ? null : (a.z > b.z ? a : b);
      if (oben && oben.deckend) continue;
      treffer.push(`${keys[i]} × ${keys[j]} (${ux}×${uy}px)`);
    }
  }
  for (const k of keys) {
    const r = boxes[k];
    if (r.x < -1 || r.y < -1 || r.r > vw + 1 || r.b > vh + 1) {
      treffer.push(`${k} ragt aus dem Fenster (${r.x},${r.y} bis ${r.r},${r.b} bei ${vw}×${vh})`);
    }
  }
  return treffer;
}

let fehlerGesamt = 0;

for (const [name, w, h] of GROESSEN) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.log(`  ! PAGEERROR ${e.message}`));
  await page.goto('http://127.0.0.1:5173/#position=3.2/40/16&year=1815', { waitUntil: 'networkidle' });
  await page.waitForSelector('#app:not([hidden])', { timeout: 20000 });
  await page.waitForTimeout(2800);

  const zustaende = [
    ['ruhe', async () => {}],
    ['tafel', async () => {
      await page.evaluate(() => { location.hash = 'position=3.2/40/16&year=1815&ort=Austrian%20Empire'; });
      await page.waitForTimeout(1400);
    }],
    ['ebenen', async () => {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      await page.click('#btnLayers');
      await page.waitForTimeout(500);
    }],
    ['legende', async () => {
      await page.keyboard.press('Escape');
      await page.click('#btnLegend');
      await page.waitForTimeout(500);
    }],
    ['schlachten', async () => {
      await page.keyboard.press('Escape');
      await page.click('#btnBattles');
      await page.waitForTimeout(600);
    }],
    ['kompakt', async () => {
      await page.keyboard.press('Escape');
      await page.click('#btnFold');
      await page.waitForTimeout(600);
    }],
  ];

  for (const [zname, tun] of zustaende) {
    await tun();
    const info = await page.evaluate(RECHTECKE);
    const probleme = kollisionen(info.boxes, info.vw, info.vh);
    if (info.ueberlauf) probleme.push('waagerechter Überlauf der Seite');
    fehlerGesamt += probleme.length;
    const marke = probleme.length ? '✗' : '✓';
    console.log(`${marke} ${name.padEnd(7)} ${zname.padEnd(11)} ${w}×${h}`);
    for (const p of probleme) console.log(`      ${p}`);
    await page.screenshot({ path: `${OUT}/${name}-${zname}.png` });
  }
  await page.close();
}

await browser.close();
process.exit(fehlerGesamt ? 1 : 0);
