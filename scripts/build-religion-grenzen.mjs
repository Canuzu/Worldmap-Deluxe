#!/usr/bin/env node
/**
 * Zieht die Religionsgrenzen aus dem Raster – als gestrichelte Linien.
 *
 * Die Karte färbt jedes Gemeinwesen in der Religion seiner Mehrheit. Das ist
 * für ein Reich von der Größe des osmanischen zu wenig: Serbien war christlich,
 * auch als es osmanisch war, und auf einer einfarbigen Fläche sieht man davon
 * nichts.
 *
 * Diese Linien tragen das nach. Sie laufen dort, wo im Raster zwei Zellen mit
 * verschiedenem Glauben aneinanderstoßen – quer durch Länder hindurch, wenn es
 * sein muss. Gestrichelt, weil es keine Grenzen im Rechtssinne sind, sondern
 * Übergänge: Wo eine Konfession aufhört und die nächste anfängt, ist eine
 * Landschaft, keine Linie.
 *
 * Dazu je Gebiet ein Ankerpunkt für die Beschriftung. Ohne ihn sagte die Linie
 * nur, DASS hier etwas anderes anfängt, nicht was – und genau das war die
 * Frage.
 *
 * Aufruf: npm run build:religion (läuft nach dem Raster)
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const lies = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

const SCHNITTE = lies('public/data/epochs.json').epochs;
const RASTER = path.join(ROOT, 'build/religion-raster');
const ZIEL = path.join(ROOT, 'public/data/religion/grenzen');
fs.mkdirSync(ZIEL, { recursive: true });

/** Ab dieser Zahl von Zellen bekommt ein Gebiet eine Beschriftung. */
const MINDESTGROESSE = 90;

function entpacken(laeufe, laenge) {
  const aus = new Uint8Array(laenge);
  let i = 0;
  for (let k = 0; k < laeufe.length; k += 2) {
    if (laeufe[k + 1]) aus.fill(laeufe[k + 1], i, i + laeufe[k]);
    i += laeufe[k];
  }
  return aus;
}

/**
 * Kanten zu Zügen verketten.
 *
 * Aus dem Raster fallen lauter kurze Strecken von einer Zellenbreite. Einzeln
 * gezeichnet ergäben sie kein Strichmuster – eine gestrichelte Linie braucht
 * einen durchgehenden Zug, sonst sitzt der Strich in jedem Stück neu an und
 * das Muster franst aus. Deshalb werden die Strecken an ihren Endpunkten
 * zusammengesucht und zu möglichst langen Zügen verkettet.
 */
function verketten(kanten) {
  const schluessel = (p) => `${p[0]}|${p[1]}`;
  const offen = new Map();
  for (const [a, b] of kanten) {
    for (const [p, q] of [[a, b], [b, a]]) {
      const s = schluessel(p);
      if (!offen.has(s)) offen.set(s, []);
      offen.get(s).push(q);
    }
  }
  const benutzt = new Set();
  const zuege = [];
  const kantenId = (a, b) => (schluessel(a) < schluessel(b)
    ? `${schluessel(a)}>${schluessel(b)}` : `${schluessel(b)}>${schluessel(a)}`);

  for (const [a, b] of kanten) {
    if (benutzt.has(kantenId(a, b))) continue;
    benutzt.add(kantenId(a, b));
    const zug = [a, b];

    // In beide Richtungen weiterlaufen, solange es eindeutig weitergeht.
    for (const richtung of [0, 1]) {
      let ende = richtung ? zug[0] : zug[zug.length - 1];
      for (;;) {
        const weiter = (offen.get(schluessel(ende)) ?? [])
          .find((n) => !benutzt.has(kantenId(ende, n)));
        if (!weiter) break;
        benutzt.add(kantenId(ende, weiter));
        if (richtung) zug.unshift(weiter); else zug.push(weiter);
        ende = weiter;
      }
    }
    if (zug.length > 2) zuege.push(zug);
  }
  return zuege;
}

/**
 * Ecken glätten.
 *
 * Ein Zug aus Rasterkanten ist eine Treppe aus rechten Winkeln. Zweimal
 * Chaikin schneidet die Ecken ab und macht daraus einen Linienzug, der wie
 * gezeichnet aussieht statt wie gerechnet – passend zu einer Angabe, die
 * ohnehin auf 28 Kilometer genau ist.
 */
function glaetten(zug, runden = 2) {
  let p = zug;
  for (let r = 0; r < runden; r++) {
    const neu = [p[0]];
    for (let i = 0; i < p.length - 1; i++) {
      const [x1, y1] = p[i];
      const [x2, y2] = p[i + 1];
      neu.push([x1 + (x2 - x1) * .25, y1 + (y2 - y1) * .25]);
      neu.push([x1 + (x2 - x1) * .75, y1 + (y2 - y1) * .75]);
    }
    neu.push(p[p.length - 1]);
    p = neu;
  }
  /* Auf zwei Nachkommastellen runden – das ist gut ein Kilometer und damit
     zwanzigmal feiner, als die Angabe dahinter überhaupt ist. Danach fallen
     die Punkte weg, die auf der Verbindung ihrer Nachbarn liegen: Nach dem
     Glätten sind das die meisten, und sie kosten nur Platz. */
    const grob = p.map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100]);
  const duenn = [grob[0]];
  for (let i = 1; i < grob.length - 1; i++) {
    const [ax, ay] = duenn[duenn.length - 1];
    const [bx, by] = grob[i];
    const [cx, cy] = grob[i + 1];
    // Abstand des Punktes von der Geraden zwischen Vorgänger und Nachfolger
    const laenge = Math.hypot(cx - ax, cy - ay);
    const abstand = laenge < 1e-9 ? 0
      : Math.abs((cx - ax) * (ay - by) - (ax - bx) * (cy - ay)) / laenge;
    if (abstand > .006) duenn.push(grob[i]);
  }
  duenn.push(grob[grob.length - 1]);
  return duenn;
}

/* --------------------------------------------------------------- Bauen */

let linien = 0;
let marken = 0;
let bytes = 0;
let dateien = 0;

for (const meta of SCHNITTE) {
  const pfad = path.join(RASTER, `${meta.key}.json`);
  if (!fs.existsSync(pfad)) continue;
  const d = JSON.parse(fs.readFileSync(pfad, 'utf8'));
  const { breite, hoehe, schritt, klassen } = d;
  const volk = entpacken(d.volk, breite * hoehe);

  const lon = (x) => -180 + x * schritt;
  const lat = (y) => 90 - y * schritt;

  /* Kanten zwischen ungleichen Nachbarn. Nur zwischen zwei Landzellen: Die
     Küste ist schon gezeichnet und wäre hier eine Verdoppelung. */
  const kanten = [];
  for (let y = 0; y < hoehe; y++) {
    for (let x = 0; x < breite; x++) {
      const i = y * breite + x;
      const a = volk[i];
      if (!a) continue;
      if (x + 1 < breite) {
        const b = volk[i + 1];
        if (b && b !== a) kanten.push([[lon(x + 1), lat(y)], [lon(x + 1), lat(y + 1)]]);
      }
      if (y + 1 < hoehe) {
        const b = volk[i + breite];
        if (b && b !== a) kanten.push([[lon(x), lat(y + 1)], [lon(x + 1), lat(y + 1)]]);
      }
    }
  }

  /* Erst aussortieren, dann glätten: Ein Zug aus vier Rasterkanten ist ein
     Fleck und keine Grenze. Nach dem Glätten und Ausdünnen zu filtern hätte
     dagegen die langen Züge mitgenommen, weil das Ausdünnen ihnen die meisten
     Punkte nimmt – genau die, die es nehmen soll. */
  const zuege = verketten(kanten)
    .filter((z) => z.length > 5)
    .map((z) => glaetten(z));

  /* Zusammenhängende Gebiete finden – für die Beschriftung. Ein Gebiet ist
     eine Insel gleichen Glaubens; das größte waagerechte Stück darin trägt
     die Schrift, weil dort am ehesten Platz ist. */
  const besucht = new Uint8Array(breite * hoehe);
  const gebiete = [];
  const stapel = new Int32Array(breite * hoehe);
  for (let start = 0; start < volk.length; start++) {
    if (besucht[start] || !volk[start]) continue;
    const klasse = volk[start];
    let oben = 0;
    stapel[oben++] = start;
    besucht[start] = 1;
    const zellen = [];
    while (oben) {
      const i = stapel[--oben];
      zellen.push(i);
      const x = i % breite;
      const y = (i - x) / breite;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= breite || ny >= hoehe) continue;
        const j = ny * breite + nx;
        if (besucht[j] || volk[j] !== klasse) continue;
        besucht[j] = 1;
        stapel[oben++] = j;
      }
    }
    if (zellen.length < MINDESTGROESSE) continue;

    // Längster waagerechter Lauf im Gebiet – dort sitzt die Beschriftung.
    const reihen = new Map();
    for (const i of zellen) {
      const x = i % breite;
      const y = (i - x) / breite;
      if (!reihen.has(y)) reihen.set(y, []);
      reihen.get(y).push(x);
    }
    const laeufe = [];
    for (const [y, xs] of reihen) {
      xs.sort((a, b) => a - b);
      let von = xs[0]; let vor = xs[0];
      for (let k = 1; k <= xs.length; k++) {
        if (k < xs.length && xs[k] === vor + 1) { vor = xs[k]; continue; }
        laeufe.push({ y, von, bis: vor, laenge: vor - von + 1 });
        if (k < xs.length) { von = xs[k]; vor = xs[k]; }
      }
    }
    laeufe.sort((a, b) => b.laenge - a.laenge);

    /* Mehrere Marken für große Gebiete.
     *
     * Das orthodoxe Gebiet reicht 1600 von Serbien bis zum Ural – ein
     * zusammenhängender Fleck. Mit einer einzigen Beschriftung stünde sie
     * irgendwo in Russland, und der Balkan bliebe stumm. Genau dort aber ist
     * die Aussage: Serbien war christlich, obwohl es osmanisch war.
     *
     * Deshalb bekommt ein Gebiet bis zu vier Marken, verteilt über seine
     * breitesten Stellen und mit Mindestabstand zueinander. Was davon
     * tatsächlich geschrieben wird, entscheidet beim Zeichnen die Zoomstufe.
     */
    const marken = [];
    const abstand = Math.max(8, Math.sqrt(zellen.length) * .5);
    for (const l of laeufe) {
      if (marken.length >= 4) break;
      const mx = (l.von + l.bis + 1) / 2;
      if (marken.some((m) => Math.hypot(m.x - mx, m.y - l.y) < abstand)) continue;
      marken.push({ x: mx, y: l.y, laenge: l.laenge });
    }
    for (const m of marken) {
      gebiete.push({
        k: klassen[klasse - 1],
        p: [Math.round(lon(m.x) * 100) / 100, Math.round(lat(m.y + .5) * 100) / 100],
        // Für die Größe zählt die Breite an dieser Stelle, nicht die des
        // ganzen Gebiets: Eine Marke im schmalen Zipfel soll früher weichen
        // als eine mitten in der Fläche.
        n: Math.round(m.laenge ** 2),
      });
    }
  }

  const inhalt = `${JSON.stringify({ jahr: meta.year, zuege, gebiete })}\n`;
  fs.writeFileSync(path.join(ZIEL, `${meta.key}.json`), inhalt);
  linien += zuege.length;
  marken += gebiete.length;
  bytes += Buffer.byteLength(inhalt);
  dateien++;
}

console.log(`Religionsgrenzen gebaut: ${dateien} Zeitschnitte.`);
console.log(`  Linienzüge  ${String(Math.round(linien / dateien)).padStart(5)} je Zeitschnitt`);
console.log(`  Gebietsmarken ${String(Math.round(marken / dateien)).padStart(3)} je Zeitschnitt`);
console.log(`  Umfang      ${String(Math.round(bytes / dateien / 1024)).padStart(5)} kB je Zeitschnitt`);
