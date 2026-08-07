#!/usr/bin/env node
/**
 * Prüft die Religionsebene.
 *
 * Eine Religionskarte ist heikler als eine Staatenkarte: Wo eine Grenze falsch
 * liegt, sieht man es; wo eine Religion falsch liegt, glaubt man es. Und die
 * Ebene entsteht zu neun Zehnteln aus Regeln, also aus Rechtecken auf der
 * Landkarte – die schweigen, wenn sie danebenliegen.
 *
 * Geprüft wird:
 *   1. Jede Fläche jedes Zeitschnitts hat eine Angabe. Eine Lücke wäre auf der
 *      Karte ein Loch.
 *   2. Alle Klassen stehen im Vokabular.
 *   3. Keine Anachronismen. Jede Klasse trägt ein Zeitfenster: Anglikanisch
 *      gibt es nicht vor 1534, Zoroastrismus nicht vor 1000 v. Chr. Das ist
 *      die schärfste Prüfung – sie hat beim ersten Lauf 137 Fälle gefunden,
 *      darunter ein lutherisches Dänemark 25 Jahre vor Luther.
 *   4. Die Gütestufe liegt zwischen 1 und 3.
 *   5. Kein Bekenntnis springt zwischen zwei Zeitschnitten hin und her. Ein
 *      Land, das katholisch, dann sunnitisch, dann wieder katholisch wird,
 *      kann stimmen – Spanien tut das. Meist ist es aber eine Regelgrenze,
 *      über die der Schwerpunkt einer Fläche zufällig gewandert ist.
 *
 * Aufruf: npm run check:religion
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const lies = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

const VOKABULAR = lies('src/data/religion/vokabular.json');
const KLASSEN = VOKABULAR.klassen;
const SCHNITTE = lies('public/data/epochs.json').epochs;

let fehler = 0;
const meldung = (was) => { fehler++; console.log(`  ✗ ${was}`); };

const moeglich = (k, jahr) => {
  const m = KLASSEN[k];
  if (!m) return false;
  return jahr >= (m.seit ?? -Infinity) && jahr <= (m.bis ?? Infinity);
};

let flaechen = 0;
let abweichend = 0;
const guete = { 1: 0, 2: 0, 3: 0 };
const verlauf = new Map();   // Gemeinwesen → [[jahr, volk], …]

for (const meta of SCHNITTE) {
  const pfad = path.join(ROOT, 'public/data/religion', `${meta.key}.json`);
  if (!fs.existsSync(pfad)) { meldung(`${meta.label}: keine Religionsdatei`); continue; }
  const daten = JSON.parse(fs.readFileSync(pfad, 'utf8'));
  const jahr = daten.jahr;

  // Gegenprobe gegen den Zeitschnitt selbst: Jede Fläche braucht eine Angabe.
  const topo = JSON.parse(fs.readFileSync(path.join(ROOT, 'public', meta.file), 'utf8'));
  const objKey = Object.keys(topo.objects)[0];
  const namen = new Set(topo.objects[objKey].geometries
    .map((g) => g.properties?.n).filter(Boolean));
  for (const n of namen) {
    if (!daten.klassen[n]) meldung(`${meta.label}: "${n}" ohne Religionsangabe`);
  }

  for (const [name, eintrag] of Object.entries(daten.klassen)) {
    flaechen++;
    // Drei Angaben – oder vier, wenn das Raster den Flächenanteil der
    // vorherrschenden Religion zurückgerechnet hat.
    if (!Array.isArray(eintrag) || eintrag.length < 3 || eintrag.length > 4) {
      meldung(`${meta.label}: "${name}" hat ${eintrag?.length} Angaben statt drei oder vier`);
      continue;
    }
    const [volk, staat, g] = eintrag;
    // „lokal" heißt: keine Staatsreligion – das ist keine Abweichung, sondern
    // ihr Gegenteil.
    if (staat !== volk && staat !== 'lokal') abweichend++;
    if (!(g >= 1 && g <= 3)) meldung(`${meta.label}: "${name}" mit Güte ${g}`);
    else guete[g]++;

    for (const [rolle, k] of [['Volk', volk], ['Herrschaft', staat]]) {
      // „lokal" ist keine Religion, sondern die Angabe, dass die Herrschaft
      // dem Ort folgt – das Reich nach 1555 hatte kein eigenes Bekenntnis.
      if (k === 'lokal') continue;
      if (!KLASSEN[k]) { meldung(`${meta.label}: "${name}" – unbekannte Klasse "${k}"`); continue; }
      if (!moeglich(k, jahr)) {
        const m = KLASSEN[k];
        const fenster = `${m.seit ?? 'immer'} bis ${m.bis ?? 'heute'}`;
        meldung(`${meta.label}: "${name}" ${rolle} = ${m.name}, gibt es nur ${fenster}`);
      }
    }
    if (!verlauf.has(name)) verlauf.set(name, []);
    verlauf.get(name).push([jahr, volk]);
  }
}

/* Hin- und Herspringen: dieselbe Religion, dann eine andere, dann wieder die
   erste. Das ist meist eine Regelgrenze, über die der Schwerpunkt gewandert
   ist – etwa, weil ein Reich ein Jahr lang eine Insel dazugewinnt. */
let springer = 0;
for (const [name, punkte] of verlauf) {
  if (punkte.length < 3) continue;
  for (let i = 1; i < punkte.length - 1; i++) {
    if (punkte[i - 1][1] === punkte[i + 1][1] && punkte[i][1] !== punkte[i - 1][1]) {
      springer++;
      if (springer <= 12) {
        console.log(`  ! ${name}: ${KLASSEN[punkte[i - 1][1]].name} → `
          + `${KLASSEN[punkte[i][1]].name} → zurück, um ${punkte[i][0]}`);
      }
      break;
    }
  }
}

/* --------------------------------------------------- Feste Bezugspunkte

   Ein Raster deckt auf, was eine Karte je Gemeinwesen verbirgt – auch die
   Fehler der eigenen Regeln. Solange nur Schwerpunkte eingefärbt wurden, fiel
   ein Tibet-Rechteck, das bis nach Delhi reichte, nicht auf: Indiens
   Schwerpunkt lag weiter südlich. Im Raster ist Delhi buddhistisch, und man
   sieht es sofort.

   Diese Prüfung macht daraus eine Zahl. Achtzig Orte mit Jahr und erwarteter
   Religion, von Persepolis 500 v. Chr. bis Kinshasa heute. */
const STICHPROBEN = lies('src/data/religion/stichproben.json').punkte;
const RASTER = path.join(ROOT, 'build/religion-raster');

function entpacken(laeufe, laenge) {
  const aus = new Uint8Array(laenge);
  let i = 0;
  for (let k = 0; k < laeufe.length; k += 2) {
    if (laeufe[k + 1]) aus.fill(laeufe[k + 1], i, i + laeufe[k]);
    i += laeufe[k];
  }
  return aus;
}

let treffer = 0;
let daneben = 0;
if (fs.existsSync(RASTER)) {
  const nachJahr = new Map();
  for (const s of STICHPROBEN) {
    if (!nachJahr.has(s.jahr)) nachJahr.set(s.jahr, []);
    nachJahr.get(s.jahr).push(s);
  }
  console.log('');
  for (const [jahr, punkte] of [...nachJahr].sort((a, b) => a[0] - b[0])) {
    const meta = SCHNITTE.find((m) => m.year === jahr);
    const pfad = meta && path.join(RASTER, `${meta.key}.json`);
    if (!pfad || !fs.existsSync(pfad)) {
      meldung(`Jahr ${jahr}: kein Raster für die Stichproben`);
      continue;
    }
    const d = JSON.parse(fs.readFileSync(pfad, 'utf8'));
    const volk = entpacken(d.volk, d.breite * d.hoehe);
    const staat = entpacken(d.staat, d.breite * d.hoehe);
    for (const s of punkte) {
      /* Küstenstädte liegen auf der Uferlinie, und eine Zelle von einem
         Viertelgrad ist 28 km breit: Stockholm, Istanbul und Alexandria fallen
         je nach Rundung ins Wasser. Deshalb gilt auch die nächste Landzelle in
         der Nachbarschaft – ein Fehler der Stichprobe, nicht der Karte. */
      const x0 = Math.floor((s.lon + 180) / d.schritt);
      const y0 = Math.floor((90 - s.lat) / d.schritt);
      let i = y0 * d.breite + x0;
      if (!volk[i]) {
        suche:
        for (let r = 1; r <= 2; r++) {
          for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
              const j = (y0 + dy) * d.breite + (x0 + dx);
              if (volk[j]) { i = j; break suche; }
            }
          }
        }
      }
      const istVolk = d.klassen[volk[i] - 1] ?? null;
      const istStaat = d.klassen[staat[i] - 1] ?? null;
      const sollStaat = s.staat ?? s.volk;
      const gutVolk = istVolk === s.volk;
      const gutStaat = s.staatEgal ? true : istStaat === sollStaat;
      if (gutVolk && gutStaat) { treffer++; continue; }
      daneben++;
      const zeig = (k) => (k ? (KLASSEN[k]?.name ?? k) : 'kein Land');
      const teile = [];
      if (!gutVolk) teile.push(`Volk ${zeig(istVolk)} statt ${zeig(s.volk)}`);
      if (!gutStaat) teile.push(`Herrschaft ${zeig(istStaat)} statt ${zeig(sollStaat)}`);
      console.log(`  ✗ ${String(jahr).padStart(6)}  ${s.ort.padEnd(16)} ${teile.join(', ')}`);
    }
  }
}

console.log('─'.repeat(72));
if (treffer + daneben) {
  const quote = Math.round(100 * treffer / (treffer + daneben));
  console.log(`Stichproben: ${treffer} von ${treffer + daneben} richtig (${quote} %).`);
  if (daneben) fehler += daneben;
}
console.log(`${SCHNITTE.length} Zeitschnitte, ${flaechen} Angaben, `
  + `${Object.keys(KLASSEN).length} Klassen.`);
console.log(`Herrschaft weicht vom Volk ab: ${abweichend} (${Math.round(100 * abweichend / flaechen)} %) `
  + '– das sind die Fälle, für die es die Ebene gibt.');
console.log(`Güte: ${guete[3]} belegt, ${guete[2]} aus solider Regel, ${guete[1]} grob geschätzt.`);
if (springer) console.log(`${springer} Gemeinwesen wechseln hin und zurück – bitte ansehen.`);

if (fehler) {
  console.log(`\n${fehler} Beanstandungen.`);
  process.exit(1);
}
console.log('\nKeine Lücken, keine unbekannten Klassen, keine Anachronismen.');
