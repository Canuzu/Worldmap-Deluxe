#!/usr/bin/env node
/**
 * Prüft die abspielbaren Schlachtverläufe.
 *
 * Truppenstellungen sind von Hand gesetzte Geometrie, und Geometrie von Hand
 * geht schief, ohne dass es beim Lesen auffällt: eine Stellung, die zwanzig
 * Kilometer neben dem Schlachtfeld liegt; eine Zeitmarke, die rückwärts
 * läuft; ein Landheer im Meer. Auf der Karte sieht man davon nur, dass
 * irgendwo nichts steht – und sucht dann an der falschen Stelle.
 *
 * Geprüft wird:
 *   1. Jede Stellung liegt im Umkreis des Schlachtfelds. Der zulässige Radius
 *      hängt an der Zoomstufe: Was bei einer Feldschlacht bei Zoom 13 gilt,
 *      wäre bei einem Feldzug über 200 km falsch.
 *   2. Die Zeitmarken steigen. Ohne das läuft die Zeitachse rückwärts.
 *   3. Jede Kennung, die über zwei Stationen hinweg gleich bleibt, hat auch
 *      dieselbe Partei – sonst blendet beim Gleiten eine Truppe die Farbe.
 *   4. Landschlachten liegen an Land, Seeschlachten auf dem Wasser. Geprüft
 *      wird gegen dieselbe Küstenlinie, die die Karte zeichnet.
 *   5. Jeder Verlauf ist aus dem Kriegsregister erreichbar.
 *   6. Die Angaben, die die Tafel braucht, sind vollständig: Kurzfassung je
 *      Station, Waffengattung je Stellung, Zahl je Partei für den
 *      Kräftebalken, Ausgang, Verluste und Folgen je Schlacht. Fehlt eine
 *      davon, bleibt in der Tafel stillschweigend ein Feld leer.
 *   7. Geländezüge tragen Namen und eine bekannte Art.
 *
 * Aufruf: npm run check:schlachten
 */
import fs from 'node:fs';
import path from 'node:path';
import { feature as topoFeature } from 'topojson-client';

const ROOT = path.resolve(import.meta.dirname, '..');
const spec = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/battles.json'), 'utf8'));
const SCHLACHTEN = spec.schlachten;

const register = ['10-antike', '20-mittelalter', '30-neuzeit', '40-moderne']
  .flatMap((f) => JSON.parse(
    fs.readFileSync(path.join(ROOT, `src/data/konflikte/${f}.json`), 'utf8'),
  ).schlachten ?? []);

/* ------------------------------------------------------------- Landmaske */

/* Bewusst die hochaufgelöste Küste: Die Übersichtslinie legt eine vier
   Kilometer breite Küstenebene wie die von Marathon glatt ins Meer. Für eine
   Weltkarte ist das richtig, für ein Schlachtfeld nicht. */
const küste = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/base/ocean-hd.json'), 'utf8'));
const objKey = Object.keys(küste.objects)[0];
const meer = topoFeature(küste, küste.objects[objKey]).features;

function imRing([x, y], ring) {
  let drin = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) drin = !drin;
  }
  return drin;
}

/**
 * Die Meeresebene ist ein Polygon mit einem Loch je Landmasse. Ein Punkt
 * liegt also genau dann an Land, wenn er in einem der Löcher liegt.
 */
function anLand(punkt) {
  for (const f of meer) {
    const teile = f.geometry.type === 'Polygon' ? [f.geometry.coordinates]
      : f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [];
    for (const p of teile) {
      if (!imRing(punkt, p[0])) continue;
      for (let i = 1; i < p.length; i++) if (imRing(punkt, p[i])) return true;
      return false;
    }
  }
  // Außerhalb jeder Meeresfläche: Das ist Land jenseits des Kartenrandes.
  return true;
}

const km = ([x1, y1], [x2, y2]) => {
  const s = Math.cos((((y1 + y2) / 2) * Math.PI) / 180);
  return Math.hypot((x2 - x1) * s, y2 - y1) * 111.19;
};

/**
 * Zulässiger Abstand vom Mittelpunkt, abgeleitet aus der Zoomstufe.
 *
 * Bei Zoom z ist ein Fenster von 1440 Bildpunkten rund 40.000/2^z * 1440/256
 * Kilometer breit. Der doppelte Wert davon lässt Raum für Anmarschpfeile, die
 * bewusst über den Rand hinausweisen, und schlägt trotzdem an, wenn eine
 * Stellung im falschen Land steht.
 */
const erlaubt = (zoom) => (40075 / 2 ** zoom) * (1440 / 256);

/* ------------------------------------------------------------------ Prüfung */

let fehler = 0;
const meldung = (id, was) => { fehler++; console.log(`  ✗ ${id.padEnd(16)} ${was}`); };

const GATTUNGEN = new Set(['fuss', 'bogen', 'reiter', 'geschuetz', 'schiff', 'gemischt']);
const ARTEN = new Set(['fluss', 'see', 'sumpf', 'wald', 'hoehe', 'stadt', 'mauer', 'weg',
  'furt', 'wind', 'stroemung']);

console.log('Schlacht          Stationen  Stellungen  Weiteste  Grenze   Gelände  Tafel');
console.log('─'.repeat(80));

for (const b of SCHLACHTEN) {
  const grenze = erlaubt(b.zoom);
  let weiteste = 0;
  let stellungen = 0;
  const parteiVon = new Map();

  if (!b.stationen?.length) { meldung(b.id, 'ohne Stationen'); continue; }

  let vorher = -Infinity;
  for (const [i, s] of b.stationen.entries()) {
    if (!(typeof s.t === 'number') || !Number.isFinite(s.t)) meldung(b.id, `Station ${i} ohne Zeitmarke`);
    else if (s.t <= vorher) meldung(b.id, `Zeitmarke läuft rückwärts: Station ${i} (${s.t} nach ${vorher})`);
    vorher = s.t;
    if (!s.zeit || !s.text) meldung(b.id, `Station ${i} ohne Beschriftung oder Text`);
    if (!s.kurz) meldung(b.id, `Station ${i} ohne Kurzfassung für die Stationsliste`);
    else if (s.kurz.length > 60) meldung(b.id, `Station ${i}: Kurzfassung zu lang (${s.kurz.length} Zeichen)`);

    /* Handkorrektur des Ausschnitts. Sie darf alles – deshalb muss sie
       geprüft werden: Ein vertauschtes Zahlenpaar ergäbe einen Rahmen ohne
       Ausdehnung, und die Karte flöge auf die Zoomgrenze irgendwohin. */
    if (s.sicht) {
      const gut = Array.isArray(s.sicht) && s.sicht.length === 2
        && s.sicht.every((q) => Array.isArray(q) && q.length === 2 && q.every(Number.isFinite));
      if (!gut) meldung(b.id, `Station ${i}: "sicht" ist kein Paar aus zwei Punkten`);
      else {
        const [[a, c], [d, e]] = s.sicht;
        if (Math.abs(d - a) < 1e-4 || Math.abs(e - c) < 1e-4) {
          meldung(b.id, `Station ${i}: "sicht" hat keine Ausdehnung`);
        }
        const weg = km(b.mitte, [(a + d) / 2, (c + e) / 2]);
        if (weg > grenze) {
          meldung(b.id, `Station ${i}: "sicht" liegt ${weg.toFixed(0)} km vom Schlachtfeld`);
        }
      }
    }

    for (const st of s.stellungen) {
      stellungen++;
      if (!st.id) meldung(b.id, `Station ${i}: Stellung ohne Kennung`);
      if (!b.parteien.some((p) => p.id === st.partei)) {
        meldung(b.id, `Station ${i}: unbekannte Partei "${st.partei}"`);
      }
      const alt = parteiVon.get(st.id);
      if (alt && alt !== st.partei) {
        meldung(b.id, `Kennung "${st.id}" gehört mal zu ${alt}, mal zu ${st.partei}`);
      }
      parteiVon.set(st.id, st.partei);
      if (st.form === 'flaeche' && st.punkte.length < 3) {
        meldung(b.id, `Station ${i}: Fläche "${st.id}" hat weniger als drei Punkte`);
      }
      if (st.form === 'flaeche' && !GATTUNGEN.has(st.gattung)) {
        meldung(b.id, `Station ${i}: "${st.id}" hat die unbekannte Gattung "${st.gattung}"`);
      }
      for (const p of st.punkte) {
        const d = km(b.mitte, p);
        if (d > weiteste) weiteste = d;
        if (d > grenze) meldung(b.id, `"${st.id}" liegt ${d.toFixed(0)} km vom Schlachtfeld (Grenze ${grenze.toFixed(0)} km)`);
      }
    }
  }

  // Land oder Wasser: geprüft am Schwerpunkt jeder Fläche, nicht an jedem
  // Punkt – eine Landung greift naturgemäß über die Küstenlinie.
  const mitte = b.stationen[0].stellungen.filter((s) => s.form === 'flaeche');
  let daneben = 0;
  for (const st of mitte) {
    const sx = st.punkte.reduce((a, p) => a + p[0], 0) / st.punkte.length;
    const sy = st.punkte.reduce((a, p) => a + p[1], 0) / st.punkte.length;
    const land = anLand([sx, sy]);
    if (b.see ? land : !land) daneben++;
  }
  // Bei Landungen und Belagerungen am Wasser liegt immer etwas auf der
  // anderen Seite der Küstenlinie; erst die Mehrheit ist ein Befund.
  if (daneben > mitte.length / 2) {
    meldung(b.id, `${daneben} von ${mitte.length} Anfangsstellungen liegen ${b.see ? 'an Land' : 'im Wasser'}`);
  }

  const eintrag = register.find((s) => s.verlauf === b.id);
  if (!eintrag) meldung(b.id, 'aus dem Kriegsregister nicht erreichbar');

  /* Was die Tafel zeigt, muss auch dastehen. Ein leerer Block sieht nicht
     nach fehlender Angabe aus, sondern nach vergessenem Abschnitt. */
  for (const feld of ['ausgang', 'folgen', 'worum']) {
    if (!b[feld]) meldung(b.id, `ohne "${feld}"`);
  }
  if (!b.verluste?.length) meldung(b.id, 'ohne Verlustangaben');
  else {
    for (const v of b.verluste) {
      if (!b.parteien.some((p) => p.id === v.partei)) {
        meldung(b.id, `Verlustangabe für die unbekannte Partei "${v.partei}"`);
      }
    }
  }
  for (const p of b.parteien) {
    if (!(p.zahl > 0)) meldung(b.id, `Partei "${p.id}" ohne Zahl für den Kräftebalken`);
    if (!p.fuehrung || !p.staerke) meldung(b.id, `Partei "${p.id}" ohne Führung oder Stärke`);
  }
  /* Der Untergrund. „relief“ heißt: Unter die Schlacht darf eine
     Geländeschummerung nach heutigen Daten. Das ist nur dort ehrlich, wo die
     Landform dieselbe geblieben ist – bei einer Seeschlacht gäbe es nichts zu
     schummern, und wo der Mensch die Landschaft umgebaut hat, zeigte sie die
     falsche. Deshalb geprüft und nicht stillschweigend vorausgesetzt. */
  if (!['relief', 'blatt'].includes(b.grund)) {
    meldung(b.id, `unbekannter Untergrund "${b.grund}"`);
  } else if (b.see && b.grund === 'relief') {
    meldung(b.id, 'Seeschlacht mit Geländeschummerung');
  }

  for (const g of b.gelaende ?? []) {
    if (!ARTEN.has(g.art)) meldung(b.id, `Gelände mit unbekannter Art "${g.art}"`);
    if (!g.name) meldung(b.id, `Gelände (${g.art}) ohne Namen`);
  }

  const tafel = [b.ausgang && 'A', b.verluste?.length && 'V', b.folgen && 'F', b.streit && 'S']
    .filter(Boolean).join('');
  const g = (b.gelaende ?? []).length;
  console.log(
    `${b.id.padEnd(17)} ${String(b.stationen.length).padStart(6)} ${String(stellungen).padStart(11)}`
    + `${`${weiteste.toFixed(0)} km`.padStart(10)} ${`${grenze.toFixed(0)} km`.padStart(8)}`
    + `${String(g).padStart(9)}${tafel.padStart(7)}`,
  );
}

/* Umgekehrt: Jeder Verweis im Register muss auch einen Verlauf finden. */
for (const s of register) {
  if (s.verlauf && !SCHLACHTEN.some((b) => b.id === s.verlauf)) {
    meldung(s.id, `verweist auf den Verlauf "${s.verlauf}", den es nicht gibt`);
  }
}

const gesamt = SCHLACHTEN.length;
console.log();
if (fehler) {
  console.log(`${fehler} Beanstandung${fehler === 1 ? '' : 'en'} in ${gesamt} Verläufen.`);
  process.exit(1);
}
const stationen = SCHLACHTEN.reduce((n, b) => n + b.stationen.length, 0);
const stellungen = SCHLACHTEN.reduce(
  (n, b) => n + b.stationen.reduce((m, s) => m + s.stellungen.length, 0), 0,
);
const gelaende = SCHLACHTEN.reduce((n, b) => n + (b.gelaende?.length ?? 0), 0);
console.log(`${gesamt} Verläufe geprüft: ${stationen} Stationen, ${stellungen} Stellungen, `
  + `${gelaende} Geländezüge.`);
console.log('Stellungen im Umkreis, Zeitmarken steigend, Kennungen eindeutig, Gattungen bekannt,');
console.log('Tafelangaben vollständig, Gelände benannt, alle aus dem Register erreichbar.');
