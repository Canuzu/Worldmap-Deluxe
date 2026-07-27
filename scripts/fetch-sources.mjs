#!/usr/bin/env node
/**
 * Lädt die Rohdaten (historische Grenzen + Natural-Earth-Basisgeometrien)
 * nach ./data-src herunter. Die Rohdaten sind bewusst nicht im Repository:
 * ~70 MB GeoJSON, aus denen `npm run build:data` die schlanken
 * Web-Datensätze in public/data erzeugt.
 *
 * Quellen:
 *   - github.com/aourednik/historical-basemaps  (GPL-3.0)
 *   - github.com/nvkelso/natural-earth-vector   (Public Domain)
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const HIST_DIR = path.join(ROOT, 'data-src/historical');
const NE_DIR = path.join(ROOT, 'data-src/naturalearth');

const HIST_BASE = 'https://raw.githubusercontent.com/aourednik/historical-basemaps/master';
const NE_BASE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson';

const NE_FILES = [
  'ne_50m_land',
  'ne_110m_land',
  'ne_50m_lakes',
  'ne_50m_rivers_lake_centerlines',
];

async function download(url, dest, { force = false } = {}) {
  if (!force && fs.existsSync(dest) && fs.statSync(dest).size > 0) {
    return 'cached';
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} – ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
  return `${(buf.length / 1024).toFixed(0)} kB`;
}

async function pool(items, limit, worker) {
  const queue = [...items];
  const runners = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) await worker(queue.shift());
  });
  await Promise.all(runners);
}

async function main() {
  fs.mkdirSync(HIST_DIR, { recursive: true });
  fs.mkdirSync(NE_DIR, { recursive: true });

  process.stdout.write('› index.json … ');
  console.log(await download(`${HIST_BASE}/index.json`, path.join(HIST_DIR, 'index.json'), { force: true }));

  const index = JSON.parse(fs.readFileSync(path.join(HIST_DIR, 'index.json'), 'utf8')).years;
  console.log(`› ${index.length} Epochen-Dateien`);

  await pool(index, 6, async (entry) => {
    const status = await download(`${HIST_BASE}/geojson/${entry.filename}`, path.join(HIST_DIR, entry.filename));
    console.log(`  ${entry.filename.padEnd(28)} ${status}`);
  });

  await pool(NE_FILES, 4, async (name) => {
    const status = await download(`${NE_BASE}/${name}.geojson`, path.join(NE_DIR, `${name}.geojson`));
    console.log(`  ${name.padEnd(38)} ${status}`);
  });

  console.log('\nFertig. Weiter mit: npm run build:data');
}

main().catch((err) => {
  console.error('\nFehler beim Download:', err.message);
  process.exit(1);
});
