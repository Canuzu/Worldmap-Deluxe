#!/usr/bin/env node
/**
 * Prüft die selbst angelegten Kriegsjahre gegen bekannte Daten.
 *
 * Die Frontverläufe in src/data/wwii.json sind von Hand gezogen. Damit sie
 * nicht unbemerkt verrutschen, wird für eine Reihe von Orten festgehalten, wer
 * dort zum Stichtag des jeweiligen Zeitschnitts herrschte. Ausgewählt sind
 * Orte, an denen sich die Front entschieden hat – und solche, die trotz
 * Belagerung nie gefallen sind (Leningrad, Moskau, Murmansk).
 *
 * Aufruf: node scripts/check-besatzung.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIR = path.join(ROOT, 'data-src/derived');
const JAHRE = [1940, 1941, 1942, 1943, 1944];

/** [Ort, [Länge, Breite], Besatzer je Jahr (null = unbesetzt), Beleg] */
const PROBEN = [
  ['Leningrad', [30.32, 59.93], [null, null, null, null, null], 'eingeschlossen, aber nie genommen'],
  ['Nowgorod', [31.27, 58.52], [null, 'Germany', 'Germany', 'Germany', null], 'befreit Januar 1944'],
  ['Moskau', [37.62, 55.75], [null, null, null, null, null], 'Dezember 1941 nicht erreicht'],
  ['Smolensk', [32.05, 54.78], [null, 'Germany', 'Germany', null, null], 'befreit September 1943'],
  ['Stalingrad', [44.42, 48.72], [null, null, 'Germany', null, null], 'nur im Herbst 1942'],
  ['Sewastopol', [33.53, 44.62], [null, null, 'Germany', 'Germany', null], 'hielt bis Juli 1942'],
  ['Simferopol', [34.10, 44.95], [null, 'Germany', 'Germany', 'Germany', null], 'Krim ab November 1941'],
  ['Murmansk', [33.08, 68.97], [null, null, null, null, null], 'Nachschubhafen, nie genommen'],
  ['Petrosawodsk', [34.35, 61.79], [null, 'Finland', 'Finland', 'Finland', null], 'finnisch besetztes Ostkarelien'],
  ['Kiew', [30.52, 50.45], [null, 'Germany', 'Germany', null, null], 'befreit 6. November 1943'],
  ['Minsk', [27.57, 53.90], [null, 'Germany', 'Germany', 'Germany', null], 'befreit Juli 1944'],
  ['Lemberg', [24.03, 49.84], ['USSR', 'Germany', 'Germany', 'Germany', 'USSR'], 'zweimal Besatzungswechsel'],
  ['Riga', [24.11, 56.95], ['USSR', 'Germany', 'Germany', 'Germany', 'USSR'], 'zweimal Besatzungswechsel'],
  ['Liepāja', [21.01, 56.51], ['USSR', 'Germany', 'Germany', 'Germany', 'Germany'], 'Kurland-Kessel'],
  ['Westägypten', [25.52, 29.20], [null, null, 'Germany', null, null], 'Vorstoß bis El Alamein'],
  ['Kairo', [31.24, 30.04], [null, null, null, null, null], 'nie erreicht'],
  ['Rangun', [96.16, 16.80], [null, null, 'Empire of Japan', 'Empire of Japan', 'Empire of Japan'], 'Birma ab 1942'],
  ['Imphal', [93.94, 24.82], [null, null, null, null, null], '1944 gehalten'],
  ['Chittagong', [91.83, 22.33], [null, null, null, null, null], 'Bengalen blieb britisch'],
  ['Schanghai', [121.47, 31.23], [null, 'Empire of Japan', 'Empire of Japan', 'Empire of Japan', 'Empire of Japan'], 'japanisch besetztes Ostchina'],
  ['Chongqing', [106.55, 29.56], [null, null, null, null, null], 'Sitz der Nationalregierung'],
  ['Rom', [12.50, 41.90], [null, null, null, 'Germany', null], 'befreit Juni 1944'],
  ['Mailand', [9.19, 45.46], [null, null, null, 'Germany', 'Germany'], 'bis Kriegsende besetzt'],
  ['Paris', [2.35, 48.86], ['Germany', 'Germany', 'Germany', 'Germany', null], 'befreit August 1944'],
  ['Marseille', [5.37, 43.30], [null, null, 'Germany', 'Germany', null], 'Vichy bis November 1942'],
  ['Amsterdam', [4.90, 52.37], ['Germany', 'Germany', 'Germany', 'Germany', 'Germany'], 'Hungerwinter 1944/45'],
  ['Athen', [23.73, 37.98], [null, 'Germany', 'Germany', 'Germany', null], 'befreit Oktober 1944'],
  ['Belgrad', [20.46, 44.79], [null, 'Germany', 'Germany', 'Germany', null], 'befreit Oktober 1944'],
];

function pointInRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function contains(point, geometry) {
  if (!geometry) return false;
  const polys = geometry.type === 'MultiPolygon' ? geometry.coordinates
    : geometry.type === 'Polygon' ? [geometry.coordinates] : [];
  return polys.some((poly) => pointInRing(point, poly[0])
    && !poly.slice(1).some((hole) => pointInRing(point, hole)));
}

function occupierAt(collection, point) {
  for (const f of collection.features) {
    if (f.properties?.NAME && contains(point, f.geometry)) return f.properties.OCCUPIER ?? null;
  }
  return null;
}

const daten = new Map();
for (const jahr of JAHRE) {
  const file = path.join(DIR, `world_${jahr}.geojson`);
  if (!fs.existsSync(file)) {
    console.error(`Kriegsjahre fehlen – bitte zuerst \`npm run build:krieg\` ausführen.`);
    process.exit(1);
  }
  daten.set(jahr, JSON.parse(fs.readFileSync(file, 'utf8')));
}

let fehler = 0;
console.log('Ort'.padEnd(14) + JAHRE.map((j) => String(j).padStart(11)).join('') + '   Beleg');
for (const [ort, punkt, erwartet, beleg] of PROBEN) {
  const zellen = JAHRE.map((jahr, i) => {
    const ist = occupierAt(daten.get(jahr), punkt);
    const soll = erwartet[i];
    const gut = soll ? ist === soll : !ist;
    if (!gut) fehler++;
    const kurz = ist ? ist.replace('Empire of Japan', 'Japan').slice(0, 7) : 'frei';
    return `${gut ? '✓' : '✗'} ${kurz}`.padStart(11);
  });
  console.log(ort.padEnd(14) + zellen.join('') + '   ' + beleg);
}

const gesamt = PROBEN.length * JAHRE.length;
console.log(`\n${gesamt - fehler}/${gesamt} Stichproben stimmen.`);
process.exit(fehler ? 1 : 0);
