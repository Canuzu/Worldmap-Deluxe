#!/usr/bin/env node
/**
 * Erzeugt die fehlenden Kriegsjahre beider Weltkriege: 1916, 1918 und
 * 1940 bis 1944.
 *
 * Der Ursprungsdatensatz (Historical Basemaps) springt von 1914 auf 1920 und
 * von 1938 auf 1945 – beide Weltkriege fallen also heraus. Er
 * kennt außerdem keine Besatzung, sondern nur völkerrechtliche Zugehörigkeit –
 * der ganze Zweite Weltkrieg fällt damit aus der Karte heraus.
 *
 * Dieses Skript nimmt den Stand von 1938 und wendet die in
 * src/data/wwii.json beschriebenen Änderungen an:
 *
 *   umbenennen   NAME wird ersetzt (Staat ist untergegangen oder umbenannt)
 *   besetzt      NAME bleibt, OCCUPIER kommt hinzu (ganzes Land)
 *   teilungen    Das Land wird an einer Frontlinie zerschnitten; jede Hälfte
 *                bekommt eigenen Namen oder eigene Besatzungsmacht
 *
 * Beschrieben sind sie in src/data/wwi.json und src/data/wwii.json; jede Datei
 * nennt mit "basis" den Zeitschnitt, aus dem sie hervorgeht.
 *
 * Ergebnis: data-src/derived/world_<jahr>.geojson mit demselben Feldsatz wie
 * die Ursprungsdateien, ergänzt um OCCUPIER. Die Zeitschnitte gehen danach
 * durch dieselbe Aufbereitung wie alle anderen (build-data.mjs).
 *
 * Der Zuschnitt läuft über mapshaper, nicht über eigene Polygonarithmetik:
 * Die Frontlinien treffen auf Küsten mit Zehntausenden Stützpunkten, und
 * mapshaper macht das nachweislich richtig.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const HIST_DIR = path.join(ROOT, 'data-src/historical');
const OUT_DIR = path.join(ROOT, 'data-src/derived');
const MAPSHAPER = path.join(ROOT, 'node_modules/.bin/mapshaper');
const SPECS = ['src/data/wwi.json', 'src/data/wwii.json'];

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'wmd-krieg-'));
let counter = 0;
const tmpFile = (tag) => path.join(TMP, `${String(++counter).padStart(3, '0')}-${tag}.json`);

function mapshaper(args) {
  return execFileSync(MAPSHAPER, args, {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 28,
  });
}

/** Ein Gebiet aus wwii.json als GeoJSON-Datei ablegen, damit mapshaper es kennt. */
function writeRegion(id, ring) {
  const file = path.join(TMP, `gebiet-${id}.json`);
  fs.writeFileSync(file, JSON.stringify({
    type: 'FeatureCollection',
    features: [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } }],
  }));
  return file;
}

/** JS-Ausdruck für mapshaper, der einen Satz Umbenennungen anwendet. */
function renameExpression(map) {
  return Object.entries(map)
    .map(([from, to]) => `if (NAME === ${JSON.stringify(from)}) { NAME = ${JSON.stringify(to)}; SUBJECTO = ${JSON.stringify(to)}; PARTOF = ${JSON.stringify(to)}; }`)
    .join(' ');
}

/** Zuweisung von OCCUPIER für eine Liste ganz besetzter Länder. */
function occupyExpression(map) {
  return Object.entries(map)
    .map(([land, macht]) => `if (NAME === ${JSON.stringify(land)}) OCCUPIER = ${JSON.stringify(macht)};`)
    .join(' ');
}

/** Zuweisung aus einem innen/außen-Block einer Teilung. */
function sideExpression(side) {
  if (!side) return null;
  const parts = [];
  if (side.name) {
    parts.push(`NAME = ${JSON.stringify(side.name)};`);
    parts.push(`SUBJECTO = ${JSON.stringify(side.name)};`);
    parts.push(`PARTOF = ${JSON.stringify(side.name)};`);
  }
  if (side.besetzer) parts.push(`OCCUPIER = ${JSON.stringify(side.besetzer)};`);
  return parts.length ? parts.join(' ') : null;
}

/**
 * Eine Teilung anwenden.
 *
 * Der Zuschnitt trifft nur das benannte Land; alles andere geht unverändert
 * durch. Das ist der Grund für die drei getrennten Durchläufe: mapshapers
 * -clip wirkt auf die ganze Ebene, nicht auf ausgewählte Objekte.
 *
 * Wichtig ist außerdem, dass nur noch nicht besetzte Flächen zerschnitten
 * werden. Sonst überschriebe die deutsche Ostfront das kurz zuvor gesetzte
 * finnische Ostkarelien.
 */
function applySplit(input, rule, regionFile) {
  const { land } = rule;
  const frei = `NAME === ${JSON.stringify(land)} && !OCCUPIER`;
  const rest = `!(${frei})`;

  const innen = tmpFile(`${land}-innen`);
  const inExpr = sideExpression(rule.innen);
  mapshaper([
    input, '-filter', frei, '-clip', regionFile,
    ...(inExpr ? ['-each', inExpr] : []),
    '-o', 'format=geojson', innen,
  ]);

  const aussen = tmpFile(`${land}-aussen`);
  const outExpr = sideExpression(rule.aussen);
  mapshaper([
    input, '-filter', frei, '-erase', regionFile,
    ...(outExpr ? ['-each', outExpr] : []),
    '-o', 'format=geojson', aussen,
  ]);

  const unberuehrt = tmpFile(`${land}-uebrig`);
  mapshaper([input, '-filter', rest, '-o', 'format=geojson', unberuehrt]);

  const out = tmpFile(`${land}-vereint`);
  mapshaper([
    innen, aussen, unberuehrt, 'combine-files',
    '-merge-layers', 'force',
    '-o', 'format=geojson', out,
  ]);
  return out;
}

function featureCount(file) {
  const g = JSON.parse(fs.readFileSync(file, 'utf8'));
  return g.features?.length ?? 0;
}

function buildYear(spec, gebiete, basisDatei) {
  const src = path.join(HIST_DIR, basisDatei);
  let current = tmpFile(`${spec.year}-start`);

  // OCCUPIER auf allen Flächen anlegen, damit das Feld in jeder Zwischenstufe
  // existiert – mapshaper würde es sonst je nach Teilmenge mal führen, mal
  // nicht, und die Ebenen ließen sich nicht mehr zusammenlegen.
  const steps = ['OCCUPIER = null;'];
  if (spec.umbenennen) steps.push(renameExpression(spec.umbenennen));
  if (spec.besetzt) steps.push(occupyExpression(spec.besetzt));

  mapshaper([
    src,
    '-filter', 'NAME != null && NAME !== ""',
    '-each', steps.join(' '),
    '-o', 'format=geojson', current,
  ]);

  for (const rule of spec.teilungen ?? []) {
    const gebiet = gebiete[rule.gebiet];
    if (!gebiet) throw new Error(`Gebiet "${rule.gebiet}" fehlt in wwii.json`);
    const regionFile = writeRegion(rule.gebiet, gebiet.ring);
    current = applySplit(current, rule, regionFile);
  }

  // Zerschnittene Länder wieder zusammenfassen: Ein Zuschnitt hinterlässt je
  // Land ein Bündel Einzelflächen, aus denen erst das Verschmelzen wieder ein
  // Gemeinwesen mit einer Beschriftung und einer Flächenangabe macht. NAME
  // allein reicht dabei nicht – besetztes und unbesetztes Gebiet desselben
  // Landes muss getrennt bleiben, sonst verschwindet die Frontlinie.
  //
  // Bewusst nur die zerschnittenen Länder: -dissolve2 verliert bei einigen
  // Kleinstflächen des Ursprungsdatensatzes (etwa Kuwait) die Geometrie. Was
  // der Krieg nicht angefasst hat, geht deshalb unverändert durch.
  const geteilt = [...new Set((spec.teilungen ?? []).flatMap((r) => [
    r.land, r.innen?.name, r.aussen?.name,
  ].filter(Boolean)))];

  const out = path.join(OUT_DIR, `world_${spec.year}.geojson`);
  if (!geteilt.length) {
    mapshaper([
      current,
      '-filter-fields', 'NAME,SUBJECTO,PARTOF,BORDERPRECISION,OCCUPIER',
      '-o', 'format=geojson', out,
    ]);
    return out;
  }

  const betroffen = `[${geteilt.map((n) => JSON.stringify(n)).join(',')}].indexOf(NAME) > -1`;

  const verschmolzen = tmpFile(`${spec.year}-verschmolzen`);
  mapshaper([
    current, '-filter', betroffen,
    '-dissolve2', 'NAME,OCCUPIER', 'copy-fields=SUBJECTO,PARTOF,BORDERPRECISION',
    '-o', 'format=geojson', verschmolzen,
  ]);

  const unberuehrt = tmpFile(`${spec.year}-unberuehrt`);
  mapshaper([current, '-filter', `!(${betroffen})`, '-o', 'format=geojson', unberuehrt]);

  mapshaper([
    verschmolzen, unberuehrt, 'combine-files',
    '-merge-layers', 'force',
    '-filter-fields', 'NAME,SUBJECTO,PARTOF,BORDERPRECISION,OCCUPIER',
    '-o', 'format=geojson', out,
  ]);
  return out;
}

function main() {
  if (!fs.existsSync(MAPSHAPER)) {
    console.error('mapshaper fehlt – bitte zuerst `npm install` ausführen.');
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const index = [];
  for (const specPath of SPECS) {
    const spec = JSON.parse(fs.readFileSync(path.join(ROOT, specPath), 'utf8'));
    const basisDatei = `world_${spec.basis}.geojson`;
    const basis = path.join(HIST_DIR, basisDatei);
    if (!fs.existsSync(basis)) {
      console.error(`Grundlage fehlt: ${basis} – bitte zuerst \`npm run fetch:data\` ausführen.`);
      process.exit(1);
    }

    console.log(`› ${path.basename(specPath)} – Kriegsjahre aus ${basisDatei}`);
    for (const jahr of spec.jahre) {
      const file = buildYear(jahr, spec.gebiete, basisDatei);
      const besetzt = new Set();
      for (const f of JSON.parse(fs.readFileSync(file, 'utf8')).features) {
        if (f.properties?.OCCUPIER) besetzt.add(f.properties.OCCUPIER);
      }
      console.log(
        `  ${String(jahr.year).padStart(6)}  ${String(featureCount(file)).padStart(4)} Flächen  ` +
        `Besatzungsmächte: ${[...besetzt].sort().join(', ') || '–'}`,
      );
      index.push({
        year: jahr.year,
        filename: `world_${jahr.year}.geojson`,
        stand: jahr.stand,
        titel: jahr.titel,
      });
    }
  }

  index.sort((a, b) => a.year - b.year);
  fs.writeFileSync(path.join(OUT_DIR, 'index.json'), JSON.stringify({ years: index }, null, 1));
  fs.rmSync(TMP, { recursive: true, force: true });
  console.log(`\nFertig: ${index.length} Kriegsjahre in data-src/derived.`);
}

main();
