#!/usr/bin/env node
/**
 * Prüft die selbst abgeleiteten Zeitschnitte gegen bekannte Daten.
 *
 * Die Frontverläufe in src/data/wwi.json, src/data/wwii.json und
 * src/data/gegenwart.json sind von Hand gezogen. Damit sie
 * nicht unbemerkt verrutschen, wird für eine Reihe von Orten festgehalten, wer
 * dort zum Stichtag des jeweiligen Zeitschnitts herrschte. Ausgewählt sind
 * Orte, an denen sich die Front entschieden hat – und solche, die trotz
 * Belagerung nie gefallen sind (Leningrad, Moskau, Murmansk).
 *
 * Für die Gegenwartsjahre wird zusätzlich der Name geprüft: Bei einer
 * Staatsgründung wie dem Südsudan reicht die Besatzungsspalte nicht, weil dort
 * gar keine Besatzung im Spiel ist, sondern eine neue Grenze.
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

const GEGENWART = [1994, 2010, 2015, 2026];

/**
 * [Ort, [Länge, Breite], je Jahr "Name" oder "Name<Besatzer>", Beleg]
 *
 * Der spitze Klammerausdruck liest sich wie die Karte ihn zeigt: Sewastopol ist
 * Ukraine<Russia> – ukrainisches Gebiet unter russischer Besatzung.
 */
const GEGENWARTSPROBEN = [
  ['Juba', [31.58, 4.85], ['Sudan', 'Sudan', 'South Sudan', 'South Sudan'], 'Hauptstadt des 2011 unabhängig gewordenen Südsudan'],
  ['Khartum', [32.53, 15.55], ['Sudan', 'Sudan', 'Sudan', 'Sudan'], 'blieb beim Nordsudan'],
  ['Abyei', [28.44, 9.59], ['Sudan', 'Sudan', 'South Sudan', 'South Sudan'], 'umstritten – in dieser Karte dem Süden zugeschlagen'],
  ['Priština', [21.16, 42.66], ['Serbia', 'Serbia', 'Kosovo', 'Kosovo'], '2008 für unabhängig erklärt'],
  ['Belgrad', [20.46, 44.79], ['Serbia', 'Serbia', 'Serbia', 'Serbia'], 'blieb serbisch'],
  ['Niš', [21.90, 43.32], ['Serbia', 'Serbia', 'Serbia', 'Serbia'], 'südserbisch, aber östlich des Kosovo'],
  ['Sewastopol', [33.53, 44.62], ['Ukraine', 'Ukraine', 'Ukraine<Russia>', 'Ukraine<Russia>'], 'Krim, seit März 2014 von Russland gehalten'],
  ['Simferopol', [34.10, 44.95], ['Ukraine', 'Ukraine', 'Ukraine<Russia>', 'Ukraine<Russia>'], 'Krim'],
  ['Donezk', [37.80, 48.00], ['Ukraine', 'Ukraine', 'Ukraine<Russia>', 'Ukraine<Russia>'], 'seit 2014 nicht unter Kiewer Kontrolle'],
  ['Luhansk', [39.31, 48.57], ['Ukraine', 'Ukraine', 'Ukraine<Russia>', 'Ukraine<Russia>'], 'seit 2014 nicht unter Kiewer Kontrolle'],
  ['Mariupol', [37.55, 47.10], ['Ukraine', 'Ukraine', 'Ukraine', 'Ukraine<Russia>'], '2015 ukrainisch gehalten, im Mai 2022 gefallen'],
  ['Melitopol', [35.37, 46.84], ['Ukraine', 'Ukraine', 'Ukraine', 'Ukraine<Russia>'], 'seit Februar 2022 besetzt'],
  ['Cherson', [32.62, 46.64], ['Ukraine', 'Ukraine', 'Ukraine', 'Ukraine'], 'im November 2022 befreit – westlich des Dnipro'],
  ['Saporischschja', [35.14, 47.84], ['Ukraine', 'Ukraine', 'Ukraine', 'Ukraine'], 'Stadt blieb ukrainisch, das Umland nicht'],
  ['Charkiw', [36.23, 49.99], ['Ukraine', 'Ukraine', 'Ukraine', 'Ukraine'], 'nie eingenommen'],
  ['Kiew', [30.52, 50.45], ['Ukraine', 'Ukraine', 'Ukraine', 'Ukraine'], 'nie eingenommen'],
  ['Odessa', [30.73, 46.48], ['Ukraine', 'Ukraine', 'Ukraine', 'Ukraine'], 'nie eingenommen'],
  ['Rostow am Don', [39.72, 47.24], ['Russia', 'Russia', 'Russia', 'Russia'], 'russisches Kernland östlich der Front'],
  ['Stepanakert', [46.75, 39.82], ['Azerbaijan<Armenia>', 'Azerbaijan<Armenia>', 'Azerbaijan<Armenia>', 'Azerbaijan'], 'armenisch gehalten bis 2020; 2023 aserbaidschanisch'],
  ['Baku', [49.87, 40.41], ['Azerbaijan', 'Azerbaijan', 'Azerbaijan', 'Azerbaijan'], 'nie umstritten'],
  ['Eriwan', [44.51, 40.18], ['Armenia', 'Armenia', 'Armenia', 'Armenia'], 'Armenien selbst'],
  ['Naypyidaw', [96.13, 19.75], ['Burma', 'Burma', 'Myanmar', 'Myanmar'], 'Birma heißt seit 1989 Myanmar'],
  ['Skopje', [21.43, 41.99], ['Macedonia', 'Macedonia', 'Macedonia', 'North Macedonia'], 'seit dem Prespa-Abkommen 2019 Nordmazedonien'],
  ['Mbabane', [31.13, -26.32], ['Swaziland', 'Swaziland', 'Swaziland', 'Eswatini'], '2018 in Eswatini umbenannt'],
  ['Ankara', [32.85, 39.93], ['Turkey', 'Turkey', 'Turkey', 'Türkiye'], 'seit 2022 international Türkiye'],
  ['Prag', [14.42, 50.09], ['Czech Republic', 'Czech Republic', 'Czech Republic', 'Czechia'], 'Kurzname Czechia seit 2016'],
  ['Curaçao', [-68.93, 12.17], ['Netherlands Antilles', 'Netherlands Antilles', 'Dutch Caribbean', 'Dutch Caribbean'], 'Niederländische Antillen 2010 aufgelöst'],

  // Der Ursprungsdatensatz kennt kein Palästina: Dieselbe Israel-Fläche steht
  // dort von 1938 bis 2010 unverändert und schließt Westjordanland,
  // Ost-Jerusalem und den Gazastreifen ein. Diese Proben halten die
  // Richtigstellung fest.
  ['Ramallah', [35.21, 31.90], ['Palestine<Israel>', 'Palestine<Israel>', 'Palestine<Israel>', 'Palestine<Israel>'], 'Westjordanland, seit 1967 besetzt'],
  ['Nablus', [35.26, 32.22], ['Palestine<Israel>', 'Palestine<Israel>', 'Palestine<Israel>', 'Palestine<Israel>'], 'Westjordanland'],
  ['Hebron', [35.10, 31.53], ['Palestine<Israel>', 'Palestine<Israel>', 'Palestine<Israel>', 'Palestine<Israel>'], 'Westjordanland'],
  ['Jericho', [35.46, 31.86], ['Palestine<Israel>', 'Palestine<Israel>', 'Palestine<Israel>', 'Palestine<Israel>'], 'Westjordanland, am Jordan'],
  ['Dschenin', [35.30, 32.46], ['Palestine<Israel>', 'Palestine<Israel>', 'Palestine<Israel>', 'Palestine<Israel>'], 'Nordrand des Westjordanlands'],
  ['Ost-Jerusalem', [35.24, 31.78], ['Palestine<Israel>', 'Palestine<Israel>', 'Palestine<Israel>', 'Palestine<Israel>'], '1967 besetzt und 1980 annektiert – nicht anerkannt'],
  ['Gaza-Stadt', [34.47, 31.50], ['Palestine<Israel>', 'Palestine<Israel>', 'Palestine<Israel>', 'Palestine<Israel>'], 'Gazastreifen'],
  ['Rafah', [34.25, 31.29], ['Palestine<Israel>', 'Palestine<Israel>', 'Palestine<Israel>', 'Palestine<Israel>'], 'Südende des Gazastreifens'],
  ['Tel Aviv', [34.78, 32.08], ['Israel', 'Israel', 'Israel', 'Israel'], 'Israel westlich der Grünen Linie'],
  ['Haifa', [34.99, 32.82], ['Israel', 'Israel', 'Israel', 'Israel'], 'Israel'],
  ['Beerscheba', [34.79, 31.25], ['Israel', 'Israel', 'Israel', 'Israel'], 'Israel, Negev'],
  ['Sderot', [34.60, 31.52], ['Israel', 'Israel', 'Israel', 'Israel'], 'israelische Stadt östlich des Gazastreifens'],
  ['Netanja', [34.86, 32.33], ['Israel', 'Israel', 'Israel', 'Israel'], 'Küstenebene, westlich der Grünen Linie'],
  ['Amman', [35.93, 31.95], ['Jordan', 'Jordan', 'Jordan', 'Jordan'], 'Jordanien östlich des Jordan'],
  ['Majdal Schams', [35.77, 33.27], ['Syria<Israel>', 'Syria<Israel>', 'Syria<Israel>', 'Syria<Israel>'], 'Golan – syrisches Gebiet, seit 1967 besetzt'],
  ['Katzrin', [35.69, 32.99], ['Syria<Israel>', 'Syria<Israel>', 'Syria<Israel>', 'Syria<Israel>'], 'israelische Siedlung im besetzten Golan'],
  ['Quneitra', [35.82, 33.13], ['Syria', 'Syria', 'Syria', 'Syria'], '1974 an Syrien zurückgegeben'],
  ['Damaskus', [36.29, 33.51], ['Syria', 'Syria', 'Syria', 'Syria'], 'Syrien östlich der Waffenstillstandslinie'],
  ['Tiberias', [35.53, 32.79], ['Israel', 'Israel', 'Israel', 'Israel'], 'israelisch, westlich des Golan'],
];

/** Zusätzlich für 1960, als das Westjordanland jordanisch und Gaza ägyptisch war. */
const JAHR1960 = [
  ['Ramallah', [35.21, 31.90], 'Jordan', 'Westjordanland – 1950 von Jordanien annektiert'],
  ['Ost-Jerusalem', [35.24, 31.78], 'Jordan', 'bis 1967 jordanisch verwaltet'],
  ['Gaza-Stadt', [34.47, 31.50], 'Palestine<Egypt>', 'Gazastreifen unter ägyptischer Verwaltung'],
  ['Tel Aviv', [34.78, 32.08], 'Israel', 'Israel in den Grenzen von 1949'],
  ['Majdal Schams', [35.77, 33.27], 'Syria', 'Golan – erst 1967 besetzt'],
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

function featureAt(collection, point) {
  for (const f of collection.features) {
    if (f.properties?.NAME && contains(point, f.geometry)) return f.properties;
  }
  return null;
}

function occupierAt(collection, point) {
  return featureAt(collection, point)?.OCCUPIER ?? null;
}

/** "Ukraine<Russia>" für besetztes, "Ukraine" für unbesetztes Gebiet. */
function lageAt(collection, point) {
  const p = featureAt(collection, point);
  if (!p) return '–';
  return p.OCCUPIER ? `${p.NAME}<${p.OCCUPIER}>` : p.NAME;
}

const daten = new Map();
for (const jahr of [...JAHRE, ...GEGENWART, 1960]) {
  const file = path.join(DIR, `world_${jahr}.geojson`);
  if (!fs.existsSync(file)) {
    console.error(`Abgeleitete Jahre fehlen – bitte zuerst \`npm run build:krieg\` ausführen.`);
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

console.log('\nGegenwart – geprüft wird Name und Besatzung:');
console.log('Ort'.padEnd(16) + GEGENWART.map((j) => String(j).padStart(26)).join('') + '   Beleg');
for (const [ort, punkt, erwartet, beleg] of GEGENWARTSPROBEN) {
  const zellen = GEGENWART.map((jahr, i) => {
    const ist = lageAt(daten.get(jahr), punkt);
    const gut = ist === erwartet[i];
    if (!gut) fehler++;
    return `${gut ? '✓' : '✗'} ${ist}`.padStart(26);
  });
  console.log(ort.padEnd(16) + zellen.join('') + '   ' + beleg);
}

console.log('\n1960 – Westjordanland jordanisch, Gaza ägyptisch, Golan noch syrisch:');
for (const [ort, punkt, erwartet, beleg] of JAHR1960) {
  const ist = lageAt(daten.get(1960), punkt);
  const gut = ist === erwartet;
  if (!gut) fehler++;
  console.log(`${ort.padEnd(16)}${`${gut ? '✓' : '✗'} ${ist}`.padStart(26)}   ${beleg}`);
}

const gesamt = PROBEN.length * JAHRE.length
  + GEGENWARTSPROBEN.length * GEGENWART.length
  + JAHR1960.length;
console.log(`\n${gesamt - fehler}/${gesamt} Stichproben stimmen.`);
process.exit(fehler ? 1 : 0);
