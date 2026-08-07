#!/usr/bin/env node
/**
 * Baut die Religionsebene: je Zeitschnitt und Gemeinwesen zwei Angaben.
 *
 *   volk  – was die Bevölkerung in diesem Gebiet überwiegend glaubt
 *   staat – wozu sich die Herrschaft bekennt
 *
 * Beide getrennt zu führen ist der ganze Sinn der Ebene. Wo sie
 * auseinanderfallen, wird Geschichte erklärbar: das Mogulreich mit
 * muslimischem Hof über hinduistischer Mehrheit, der osmanische Balkan,
 * England unter Maria I., das normannische Sizilien. Fiele beides in eine
 * Farbe, wäre genau das unsichtbar – und mit ihm der Grund für einen
 * Gutteil der Aufstände, Sonderrechte und Vertreibungen der Weltgeschichte.
 *
 * Drei Quellen, in dieser Reihenfolge:
 *
 *   1. Handkorrekturen (korrekturen.json). Sie schlagen alles.
 *   2. Die Steckbriefe der Wissensbasis. Sie führen für alle 311
 *      Zeitabschnitte ein Feld `religion` als Fließtext; daraus wird die
 *      Klasse gelesen. Güte 3 – hier steht jemand mit Namen dahinter.
 *   3. Raum-Zeit-Regeln (regeln.json). Sie füllen, was die Steckbriefe nicht
 *      abdecken – nach Zahl der Flächen rund drei Viertel, nach Fläche ein
 *      Drittel. Güte 2 oder 1, je nach Quellenlage.
 *
 * Die Gütestufe wird mitgeführt und ist in der Karte sichtbar. Das ist
 * dasselbe Verfahren, das die Karte bei den Grenzen schon verwendet: Eine
 * Angabe, die aus einer groben Regel stammt, darf nicht aussehen wie eine,
 * die in einer Quelle steht.
 *
 * Aufruf: npm run build:religion
 */
import fs from 'node:fs';
import path from 'node:path';
import { feature as topoFeature } from 'topojson-client';

const ROOT = path.resolve(import.meta.dirname, '..');
const lies = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

const VOKABULAR = lies('src/data/religion/vokabular.json');
const REGELN = lies('src/data/religion/regeln.json');
const KORREKTUREN = lies('src/data/religion/korrekturen.json');
const WISSEN = lies('public/data/knowledge/polities.de.json').entries;
const SCHNITTE = lies('public/data/epochs.json').epochs;

const KLASSEN = new Set(Object.keys(VOKABULAR.klassen));

/* ------------------------------------------------- Aus dem Fließtext lesen */

/**
 * Wortmarken für den Steckbrieftext, von speziell nach allgemein.
 *
 * Die Reihenfolge ist die ganze Kunst: „Sunnitischer Islam" muss vor „Islam"
 * stehen, „russisch-orthodox" vor „orthodox", „Theravada" vor „Buddhismus".
 * Wer das umdreht, bekommt eine Karte, auf der die halbe Welt sunnitisch
 * aussieht, weil das Wort Islam überall vorkommt.
 */
const MARKEN = [
  [/zw(ö|oe)lferschia|schiit|schia\b|imamit|ismailit|safawid/i, 'schii'],
  [/ibadit/i, 'ibad'],
  [/sunnit/i, 'sunn'],
  [/theravada/i, 'buddTh'],
  [/vajrayana|tibetischer buddhismus|lamaismus|gelug/i, 'buddVa'],
  [/mahayana|chan-|zen-|reines land/i, 'buddMa'],
  [/jainis/i, 'jain'],
  [/sikh/i, 'sikh'],
  [/hinduis|shivait|vishnuit|brahman/i, 'hindu'],
  [/vedische/i, 'veda'],
  [/buddhis/i, 'buddMa'],
  [/anglikan|kirche von england/i, 'angl'],
  [/reformiert|calvinis|hugenott|presbyterian/i, 'ref'],
  [/luther|evangelisch|protestant/i, 'prot'],
  [/kopt|armenisch-apostolisch|äthiopisch-orthodox|miaphysit|monophysit|syrisch-orthodox/i, 'orient'],
  [/nestorian|kirche des ostens|assyrische kirche/i, 'nest'],
  [/arianis/i, 'arian'],
  [/orthodox|byzantinische kirche|ostkirche/i, 'orth'],
  [/katholi|r(ö|oe)misch-katholisch|papst|lateinische kirche/i, 'kath'],
  [/manich(ä|ae)is/i, 'manich'],
  [/zoroastr|mazdais|maz(d|dak)|parsen|feuertempel/i, 'zoro'],
  [/judentum|j(ü|ue)disch/i, 'jud'],
  [/shint(o|ou)/i, 'shinto'],
  [/konfuzian|daois|taois|neokonfuz/i, 'konf'],
  [/tengri|himmelsgott der steppe/i, 'tengri'],
  [/christentum|christlich|christen/i, 'kath'],
  [/islam|muslim/i, 'sunn'],
  [/staatsatheis|marxistisch-lenin|religionsfeindl|konfessionslos/i, 'athe'],
  [/(ä|ae)gyptisch|amun|osiris|isis|tierkulte|pharao/i, 'aegypt'],
  [/mesopotam|marduk|assur|babylonisch|sumerisch|ischtar/i, 'mesop'],
  [/olympisch|griechische g(ö|oe)tter|hellenistische kulte|r(ö|oe)mische staatskult|kaiserkult|serapis|pontifices|auguren/i, 'graeco'],
  [/schamanis/i, 'schaman'],
  [/ahnenverehrung|naturreligion|traditionelle religion|lokalkult|lokale kulte|vielg(ö|oe)tterei|animis/i, null],
];

/**
 * Sätze, in denen eine Religion vorkommt, ohne die des Landes zu sein.
 *
 * „Verfolgung der jüdischen Bevölkerung" nennt eine Religion und meint ihr
 * Gegenteil. Ohne diese Sperre stand Deutschland 1933–1945 auf der Karte als
 * jüdisches Land – die Wortmarke hatte recht und die Aussage war falsch.
 */
const VERNEINT = /verfolg|vernicht|vertreib|verbot|verboten|unterdr(ü|ue)ck|zwangs|ausweis|pogrom/i;

/**
 * Makronen und andere Zeichen abtragen, bevor gesucht wird.
 *
 * Die Steckbriefe schreiben „Shintō" und „Śaiva" fachlich richtig mit
 * Sonderzeichen. Ein Muster, das „shinto" sucht, findet das nicht – Japan
 * fiel deshalb durch und bekam die Religion seines Nachbarn aus der
 * Raumregel.
 */
const flach = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Klasse aus einem Steckbrieftext lesen; `null`, wenn nichts greift. */
function ausText(text) {
  if (!text) return null;
  if (VERNEINT.test(text)) return null;
  const eben = flach(text);
  for (const [muster, klasse] of MARKEN) {
    if (muster.test(eben)) return klasse; // null heißt: Regel soll übernehmen
  }
  return null;
}

/**
 * Die Religion der Herrschaft steht im Steckbrief vorn.
 *
 * Diese Felder sind wie ein Lexikoneintrag gebaut: zuerst das Bekenntnis des
 * Hofes, dann Minderheiten, Duldungen und Konflikte. Für die Herrschaft zählt
 * deshalb nur der erste Satzteil – wer den ganzen Text durchsucht, findet in
 * „Sunnitischer Islam; koptisch-orthodoxe Minderheit" beides und muss raten.
 */
function herrschaftAusText(text) {
  if (!text) return null;
  const kopf = text.split(/;|\.|(?: – )|(?: - )/)[0];
  return ausText(kopf) ?? ausText(text);
}

/**
 * Zweite Klasse aus einem Text, hinter Wörtern wie „Minderheit" oder
 * „daneben". Damit wird aus einer Zeile Steckbrief das Paar aus Staat und
 * Volk – wo der Text es hergibt.
 */
function zweiteKlasse(text, erste) {
  if (!text) return null;
  const teil = text.split(/;|,| daneben | neben | sowie | Minderheit| Mehrheit/i);
  for (let i = 1; i < teil.length; i++) {
    const k = ausText(teil[i]);
    if (k && k !== erste) return k;
  }
  return null;
}

/* ------------------------------------------------------- Regeln anwenden */

/** Liegt der Punkt im Rechteck [west, süd, ost, nord]? */
const imFeld = ([lon, lat], [w, s, o, n]) => lon >= w && lon <= o && lat >= s && lat <= n;

/**
 * Erste passende Regel gewinnt. Die Datei ist von speziell nach allgemein
 * sortiert, damit „Iran ab 1501 schiitisch" vor „Vorderer Orient ab 640
 * sunnitisch" greift.
 */
function ausRegel(punkt, jahr) {
  for (const r of REGELN.regeln) {
    if (jahr < (r.von ?? -Infinity) || jahr > (r.bis ?? Infinity)) continue;
    if (!r.felder.some((f) => imFeld(punkt, f))) continue;
    /* Eine Regel darf keine Religion liefern, die es im fraglichen Jahr noch
       nicht gab. Viele Regeln haben absichtlich keine untere Zeitgrenze –
       „Balkan bis 399: griechisch-römisch" soll für die ganze Antike gelten.
       Aber die Antike endet nicht nur oben, sie fängt auch an: 1500 v. Chr.
       gab es die olympischen Götter noch nicht. Statt jede Regel einzeln zu
       begrenzen, wird sie hier übersprungen und die nächste befragt – am Ende
       steht immer eine Auffangregel mit einer zeitlosen Klasse. */
    if (!imFenster(r.volk, jahr)) continue;
    const staat = r.staat && imFenster(r.staat, jahr) ? r.staat : r.volk;
    return { volk: r.volk, staat, guete: r.guete ?? 2, regel: r.id };
  }
  return null;
}

/** Gab es diese Klasse in diesem Jahr? */
function imFenster(klasse, jahr) {
  const m = VOKABULAR.klassen[klasse];
  if (!m) return false;
  return jahr >= (m.seit ?? -Infinity) && jahr <= (m.bis ?? Infinity);
}

/* ------------------------------------------------ Steckbrief zum Jahr finden */

function abschnittFuer(name, jahr) {
  const eintrag = WISSEN[name];
  if (!eintrag?.periods?.length) return null;
  for (const p of eintrag.periods) {
    const von = p.from ?? -Infinity;
    const bis = p.to ?? Infinity;
    if (jahr >= von && jahr <= bis) return p;
  }
  return null;
}

/* --------------------------------------------------------------- Ausgabe */

const ZIEL = path.join(ROOT, 'public/data/religion');
fs.mkdirSync(ZIEL, { recursive: true });

const zaehler = { steckbrief: 0, regel: 0, korrektur: 0, oberhoheit: 0, leer: 0, gesamt: 0 };
const ohneRegel = new Map();

for (const meta of SCHNITTE) {
  const topoPfad = path.join(ROOT, 'public', meta.file.replace(/^\//, ''));
  if (!fs.existsSync(topoPfad)) continue;
  const topo = JSON.parse(fs.readFileSync(topoPfad, 'utf8'));
  const objKey = Object.keys(topo.objects)[0];
  const flaechen = topoFeature(topo, topo.objects[objKey]).features;

  const jahr = meta.year;
  const tabelle = {};

  /* Der Schwerpunkt des größten Teilstücks, nicht des ersten.
   *
   * Ein Gemeinwesen besteht oft aus vielen Flächen, und in welcher
   * Reihenfolge sie in der Datei stehen, ist Zufall. Britisch-Indien fing sich
   * so den Schwerpunkt einer Insel im Persischen Golf ein – und mit ihm die
   * Religionsregel für den Iran. Auf der Karte war Indien 1940 schiitisch.
   *
   * `pa` ist die Fläche des Teilstücks; dieselbe Angabe entscheidet schon
   * darüber, wo die Beschriftung sitzt. Dänemark gehört nach Jütland, nicht
   * nach Grönland – und Indien nach Indien. */
  const groesstes = new Map();
  for (const f of flaechen) {
    const p = f.properties ?? {};
    if (!p.n || !p.c) continue;
    const bisher = groesstes.get(p.n);
    if (!bisher || (p.pa ?? 0) > bisher.pa) groesstes.set(p.n, { punkt: p.c, pa: p.pa ?? 0 });
  }

  for (const f of flaechen) {
    const p = f.properties ?? {};
    const name = p.n;
    if (!name || tabelle[name]) continue;
    const punkt = groesstes.get(name)?.punkt ?? p.c ?? [0, 0];
    zaehler.gesamt++;

    // 1. Handkorrektur
    const hand = KORREKTUREN.korrekturen
      .find((k) => k.name === name && jahr >= (k.von ?? -Infinity) && jahr <= (k.bis ?? Infinity));
    if (hand) {
      tabelle[name] = [hand.volk, hand.staat ?? hand.volk, 3];
      zaehler.korrektur++;
      continue;
    }

    /* 2. und 3.: Steckbrief und Regel – jeder für das, was er weiß.
     *
     * Ein Steckbrief beschreibt ein Gemeinwesen, also seine Herrschaft: Er
     * sagt, wozu sich der Hof bekennt. Was die Leute auf dem Land glauben,
     * ist dagegen eine Frage des Raums, und dafür ist die Regel zuständig.
     *
     * Diese Trennung ist nicht Feinheit, sondern der Kern der Ebene. Ließe
     * man den Steckbrief beides bestimmen, wäre das Mogulreich 1600 auf der
     * Karte sunnitisch – ein Reich, dessen Bevölkerung zu drei Vierteln
     * hinduistisch war. Genau der Unterschied ist das, was die Ebene zeigen
     * soll.
     *
     * Nur wenn der Steckbrief ausdrücklich von einer Mehrheit spricht,
     * schlägt er die Regel auch beim Volk – dann steht dort mehr über die
     * Bevölkerung als in jedem Rechteck auf der Landkarte.
     */
    const ab = abschnittFuer(name, jahr);
    const ausSteckbrief = ab ? herrschaftAusText(ab.religion) : null;
    const regel = ausRegel(punkt, jahr);

    if (!ausSteckbrief && !regel) {
      zaehler.leer++;
      const schluessel = `${name} @ ${jahr}`;
      if (!ohneRegel.has(schluessel)) ohneRegel.set(schluessel, punkt);
      continue;
    }

    /* Was es im fraglichen Jahr noch nicht gab, kann auch nicht dagestanden
       haben. Ein Steckbrief spannt oft Jahrhunderte – „Dänemark-Norwegen
       1400–1800: Lutherisch" ist für 1700 richtig und für 1492 falsch, weil
       Luther erst 1517 anschlägt. In solchen Fällen tritt die Raumregel ein,
       die das Jahr kennt. */
    const steckbrief = ausSteckbrief && imFenster(ausSteckbrief, jahr) ? ausSteckbrief : null;

    const staat = steckbrief ?? regel?.staat ?? null;
    let volk = regel?.volk ?? steckbrief;
    let guete = steckbrief ? 3 : (regel?.guete ?? 1);
    if (!staat || !volk) {
      zaehler.leer++;
      const schluessel = `${name} @ ${jahr}`;
      if (!ohneRegel.has(schluessel)) ohneRegel.set(schluessel, punkt);
      continue;
    }

    if (steckbrief && /mehrheit|überwiegend|gr(ö|oe)ßtenteils|bev(ö|oe)lkerung/i.test(ab.religion)) {
      volk = zweiteKlasse(ab.religion, steckbrief) ?? steckbrief;
      guete = 3;
    } else if (regel) {
      // Die Volksangabe kommt aus der Regel, die Herrschaftsangabe womöglich
      // aus dem Steckbrief. Die Güte richtet sich nach der schwächeren.
      guete = Math.min(guete, regel.guete);
    }

    tabelle[name] = [volk, staat, guete];
    if (steckbrief) zaehler.steckbrief++; else zaehler.regel++;
  }

  /* Zweiter Durchgang: Wer unter fremder Oberhoheit steht, bekennt sich zur
   * Religion des Oberherrn.
   *
   * Das ist der Fall, den kein Rechteck auf der Landkarte kennt. Eine
   * spanische Kolonie in den Anden hat eine katholische Herrschaft über einer
   * indigenen Bevölkerung; ein unabhängiges Volk in derselben Gegend hat das
   * nicht. Der Unterschied steht in den Daten – im Feld für die Oberhoheit –
   * und nirgends sonst.
   *
   * Vorher hatte ich das über Regionsregeln versucht. Auf der Karte war dann
   * ganz Nordamerika 1600 gestreift, weil ein Rechteck behauptete, über den
   * Naskapi-Innu herrsche eine protestantische Krone. */
  const oberhoheit = new Map();
  for (const f of flaechen) {
    const p = f.properties ?? {};
    if (p.n && (p.o || p.s)) oberhoheit.set(p.n, p.o || p.s);
  }
  let uebertragen = 0;
  for (const [name, herr] of oberhoheit) {
    const eigen = tabelle[name];
    const oben = tabelle[herr];
    if (!eigen || !oben || herr === name) continue;
    // Die Herrschaft bekennt sich zu dem, wozu sich der Oberherr bekennt.
    if (oben[1] !== eigen[1]) { eigen[1] = oben[1]; uebertragen++; }
  }
  zaehler.oberhoheit += uebertragen;

  fs.writeFileSync(
    path.join(ZIEL, `${meta.key}.json`),
    `${JSON.stringify({ jahr, klassen: tabelle })}\n`,
  );
}

/* --------------------------------------------------------------- Bericht */

console.log('Religionsebene gebaut.');
console.log(`  aus Steckbriefen  ${String(zaehler.steckbrief).padStart(6)}`);
console.log(`  aus Regeln        ${String(zaehler.regel).padStart(6)}`);
console.log(`  von Hand          ${String(zaehler.korrektur).padStart(6)}`);
console.log(`  Herrschaft vom Oberherrn übernommen ${String(zaehler.oberhoheit).padStart(6)}`);
console.log(`  ohne Angabe       ${String(zaehler.leer).padStart(6)}`);
console.log(`  ────────────────────────`);
console.log(`  Flächen gesamt    ${String(zaehler.gesamt).padStart(6)}`);

if (ohneRegel.size) {
  console.log(`\n${ohneRegel.size} Fälle ohne Regel – die größten Lücken:`);
  for (const [k, punkt] of [...ohneRegel].slice(0, 25)) {
    console.log(`  ${k}  bei ${punkt[0].toFixed(1)}, ${punkt[1].toFixed(1)}`);
  }
}
