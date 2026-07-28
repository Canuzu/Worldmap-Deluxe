#!/usr/bin/env node
/**
 * Prüft die selbst angelegten Kriegsjahre gegen bekannte Daten.
 *
 * Die Frontverläufe in src/data/wwi.json und src/data/wwii.json sind von Hand
 * gezogen. Damit sie
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
const JAHRE = [1916, 1918, 1940, 1941, 1942, 1943, 1944];

/** [Ort, [Länge, Breite], Besatzer je Jahr (null = unbesetzt), Beleg] */
const PROBEN = [
  ['Brüssel', [4.35, 50.85], ['German Empire', 'German Empire', 'Germany', 'Germany', 'Germany', 'Germany', null], 'in beiden Kriegen besetzt, befreit September 1944'],
  ['Ypern', [2.88, 50.85], [null, null, 'Germany', 'Germany', 'Germany', 'Germany', null], 'im Ersten Krieg alliiert gehalten, im Zweiten besetzt'],
  ['Paris', [2.35, 48.86], [null, null, 'Germany', 'Germany', 'Germany', 'Germany', null], '1918 nur 90 km vor der Front'],
  ['Lille', [3.06, 50.63], ['German Empire', 'German Empire', 'Germany', 'Germany', 'Germany', 'Germany', null], 'im Ersten wie im Zweiten Krieg besetzt'],
  ['Warschau', [21.01, 52.23], ['German Empire', 'German Empire', 'Germany', 'Germany', 'Germany', 'Germany', 'Germany'], 'ab August 1915 besetzt'],
  ['Petrograd', [30.32, 59.93], [null, null, null, null, null, null, null], 'in beiden Kriegen nie genommen'],
  ['Kiew', [30.52, 50.45], [null, 'German Empire', null, 'Germany', 'Germany', null, null], 'nach Brest-Litowsk besetzt'],
  ['Odessa', [30.73, 46.48], [null, 'German Empire', null, 'Germany', 'Germany', 'Germany', null], 'befreit April 1944'],
  ['Bukarest', [26.10, 44.43], ['German Empire', 'German Empire', null, null, null, null, 'USSR'], 'fiel 1916 an die Mittelmächte, 1944 an die Rote Armee'],
  ['Iaşi', [27.60, 47.16], [null, null, null, null, null, null, 'USSR'], '1916 Regierungssitz in der freien Moldau, westlich des Pruth'],
  ['Belgrad', [20.46, 44.79], ['Austro-Hungarian Empire', 'Austro-Hungarian Empire', null, 'Germany', 'Germany', 'Germany', null], 'ab Oktober 1915 besetzt'],
  ['Bagdad', [44.36, 33.31], [null, 'United Kingdom of Great Britain and Ireland', null, null, null, null, null], 'fiel im März 1917'],
  ['Leningrad', [30.32, 59.93], [null, null, null, null, null, null, null], 'eingeschlossen, aber nie genommen'],
  ['Nowgorod', [31.27, 58.52], [null, null, null, 'Germany', 'Germany', 'Germany', null], 'befreit Januar 1944'],
  ['Moskau', [37.62, 55.75], [null, null, null, null, null, null, null], 'Dezember 1941 nicht erreicht'],
  ['Smolensk', [32.05, 54.78], [null, null, null, 'Germany', 'Germany', null, null], 'befreit September 1943'],
  ['Stalingrad', [44.42, 48.72], [null, null, null, null, 'Germany', null, null], 'nur im Herbst 1942'],
  ['Sewastopol', [33.53, 44.62], [null, 'German Empire', null, null, 'Germany', 'Germany', null], '1918 besetzt, 1942 erst nach Belagerung gefallen'],
  ['Simferopol', [34.10, 44.95], [null, 'German Empire', null, 'Germany', 'Germany', 'Germany', null], 'Krim 1918 und ab November 1941'],
  ['Murmansk', [33.08, 68.97], [null, null, null, null, null, null, null], 'Nachschubhafen, nie genommen'],
  ['Petrosawodsk', [34.35, 61.79], [null, null, null, 'Finland', 'Finland', 'Finland', null], 'finnisch besetztes Ostkarelien'],
  ['Minsk', [27.57, 53.90], [null, 'German Empire', null, 'Germany', 'Germany', 'Germany', null], 'nach Brest-Litowsk und erneut 1941'],
  ['Lemberg', [24.03, 49.84], [null, null, 'USSR', 'Germany', 'Germany', 'Germany', 'USSR'], 'zweimal Besatzungswechsel'],
  ['Riga', [24.11, 56.95], [null, 'German Empire', 'USSR', 'Germany', 'Germany', 'Germany', 'USSR'], 'dreimal Besatzungswechsel'],
  ['Liepāja', [21.01, 56.51], [null, 'German Empire', 'USSR', 'Germany', 'Germany', 'Germany', 'Germany'], 'Kurland-Kessel bis Kriegsende'],
  ['Westägypten', [25.52, 29.20], [null, null, null, null, 'Germany', null, null], 'Vorstoß bis El Alamein'],
  ['Kairo', [31.24, 30.04], [null, null, null, null, null, null, null], 'nie erreicht'],
  ['Rangun', [96.16, 16.80], [null, null, null, null, 'Empire of Japan', 'Empire of Japan', 'Empire of Japan'], 'Birma ab 1942'],
  ['Imphal', [93.94, 24.82], [null, null, null, null, null, null, null], '1944 gehalten'],
  ['Chittagong', [91.83, 22.33], [null, null, null, null, null, null, null], 'Bengalen blieb britisch'],
  ['Schanghai', [121.47, 31.23], [null, null, null, 'Empire of Japan', 'Empire of Japan', 'Empire of Japan', 'Empire of Japan'], 'japanisch besetztes Ostchina'],
  ['Chongqing', [106.55, 29.56], [null, null, null, null, null, null, null], 'Sitz der Nationalregierung'],
  ['Rom', [12.50, 41.90], [null, null, null, null, null, 'Germany', null], 'befreit Juni 1944'],
  ['Mailand', [9.19, 45.46], [null, null, null, null, null, 'Germany', 'Germany'], 'bis Kriegsende besetzt'],
  ['Marseille', [5.37, 43.30], [null, null, null, null, 'Germany', 'Germany', null], 'Vichy bis November 1942'],
  ['Amsterdam', [4.90, 52.37], [null, null, 'Germany', 'Germany', 'Germany', 'Germany', 'Germany'], 'Hungerwinter 1944/45'],
  ['Athen', [23.73, 37.98], [null, null, null, 'Germany', 'Germany', 'Germany', null], 'befreit Oktober 1944'],
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
