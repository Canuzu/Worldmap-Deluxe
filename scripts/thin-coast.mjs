#!/usr/bin/env node
/**
 * Dünnt die hochaufgelöste Küstenlinie auf das aus, was man sehen kann.
 *
 * `ocean-hd.json` kam mit 402.705 Stützpunkten – rund 300 m Auflösung für die
 * ganze Erde. Das klingt nach Sorgfalt, ist aber Verschwendung: Der Atlas
 * setzt diese Linie ab Zoomstufe 4,2 ein, und dort ist ein Bildpunkt gut
 * 5 km breit. Selbst bei Stufe 8 sind es noch 600 m.
 *
 * Teuer war das nicht beim Laden, sondern bei jeder Bewegung: Leaflet führt
 * die Linie als **eine** Ebene und rechnet sie bei jedem Verschieben und
 * jedem Zoomen komplett durch – dreimal, denn Meer, Saum und Kante teilen
 * sich die Geometrie. Gemessen: rund anderthalb Sekunden je Schwenk, sobald
 * die feine Küste eingesetzt war. Genau das machte die Nahsicht unbedienbar.
 *
 * Auf 35 % ausgedünnt bleiben 142.510 Punkte. Im Sichtvergleich bei Stufe 6
 * ist kein Unterschied zu erkennen – die dänischen Inseln, die Fjorde und das
 * Wattenmeer stehen unverändert. `keep-shapes` sorgt dafür, dass dabei keine
 * Insel verschwindet, auch keine kleine.
 *
 * Läuft am Ende von `npm run build:data` automatisch mit: build-data.mjs
 * erzeugt die Küstenlinie jedes Mal neu aus Natural Earth und macht die
 * Ausdünnung damit rückgängig. Das ist einmal passiert und hat die feine
 * Küste unbemerkt wieder auf 3,7 MB gebracht.
 *
 * Aufruf: npm run build:kueste (oder als Teil von npm run build:data)
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const DATEI = path.join(ROOT, 'public/data/base/ocean-hd.json');
const MAPSHAPER = path.join(ROOT, 'node_modules/.bin/mapshaper');

/* Anteil der beibehaltenen Stützpunkte. Bei 22 % werden Buchten sichtbar
   eckig, bei 55 % ist nichts gewonnen; 35 % ist der Punkt, an dem die
   Vereinfachung im Kartenbild verschwindet. */
const ANTEIL = 35;
/* Ab wie vielen Punkten die Datei als „noch nicht ausgedünnt“ gilt. */
const SCHWELLE = 250000;

const punkte = (p) => JSON.parse(fs.readFileSync(p, 'utf8')).arcs.reduce((n, a) => n + a.length, 0);
const kb = (p) => `${(fs.statSync(p).size / 1024).toFixed(0)} kB`;

const vorher = punkte(DATEI);
if (vorher < SCHWELLE) {
  console.log(`${path.basename(DATEI)} ist bereits ausgedünnt (${vorher.toLocaleString('de')} Punkte) – nichts zu tun.`);
  process.exit(0);
}

console.log(`Ausgangslage: ${vorher.toLocaleString('de')} Punkte, ${kb(DATEI)}.`);

const tmp = `${DATEI}.tmp`;
execFileSync(MAPSHAPER, [
  DATEI,
  '-simplify', `${ANTEIL}%`, 'keep-shapes',
  // Dieselbe Quantisierung wie im übrigen Datenbau: 1e6 Schritte über die
  // ganze Erde, also rund 0,4 m – weit unter jeder sichtbaren Auflösung.
  '-o', tmp, 'format=topojson', 'quantization=1000000',
], { stdio: ['ignore', 'ignore', 'pipe'] });

fs.renameSync(tmp, DATEI);
console.log(`→ ${path.basename(DATEI)}: ${punkte(DATEI).toLocaleString('de')} Punkte, ${kb(DATEI)}`);
