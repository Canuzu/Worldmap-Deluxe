#!/usr/bin/env node
/*
 * ACHTUNG – Verhältnis zu src/data/battles/<id>.json:
 *
 * Diese Datei hat die JSON-Datei einmal erzeugt. Danach ist die JSON-Datei die
 * gültige Fassung: Die zwölf älteren Verläufe sind von Hand geschrieben, und
 * zwei Quellen für dieselbe Sache wären eine Falle – wer die JSON-Datei
 * korrigiert und später dieses Skript laufen lässt, verliert die Korrektur.
 *
 * Das Skript bleibt trotzdem im Bestand, weil es zeigt, woher die Geometrie
 * kommt: Mittelpunkt, Ausdehnung in Kilometern, Blickrichtung in Grad. Aus
 * einer Liste von Koordinatenpaaren liest man das nicht mehr heraus.
 *
 * Neu erzeugen (überschreibt die JSON-Datei):
 *   node -e "import('./scripts/verlaeufe/NAME.mjs').then(async m => \
 *     (await import('node:fs')).writeFileSync('src/data/battles/NAME.json', \
 *      JSON.stringify(Object.values(m)[0], null, 1) + '\n'))"
 */
/**
 * Gettysburg, 1.–3. Juli 1863.
 *
 * Die Geografie ist hier die Aussage. Die Unionsstellung ist ein Angelhaken:
 * Culp's Hill als Widerhaken im Nordosten, der Cemetery Hill als Biegung, von
 * dort der Cemetery Ridge vier Kilometer nach Süden bis zu den beiden Round
 * Tops. Innen herum sind es zwei Kilometer, außen herum sechs – deshalb kann
 * Meade Reserven quer durchschieben, während Lee sie außen herum marschieren
 * lassen muss. Genau das entscheidet die Schlacht, und man sieht es nur auf
 * einer Karte.
 *
 * Koordinaten nach dem Gelände: Seminary Ridge 77.25 W, Cemetery Ridge
 * 77.235 W, Little Round Top 39.790 N, Culp's Hill 39.821 N.
 */
import { linie, klumpen, pfeil } from '../lib/stellung.mjs';

/* Die Geländemarken des Feldes. */
const SEMINARY = [-77.2515, 39.8320];
const CEMETERY_HILL = [-77.2325, 39.8215];
const CULPS = [-77.2225, 39.8195];
const LITTLE_ROUND_TOP = [-77.2365, 39.7905];
const WHEATFIELD = [-77.2455, 39.7965];
const PEACH_ORCHARD = [-77.2495, 39.7995];
const STADT = [-77.2311, 39.8309];
const RIDGE_MITTE = [-77.2355, 39.8065];

const parteien = [
  {
    id: 'union',
    name: 'Unionsarmee',
    farbe: '#6f9fe0',
    fuehrung: 'George G. Meade',
    staerke: '93.000 Mann, 372 Geschütze',
    zahl: 93000,
  },
  {
    id: 'csa',
    name: 'Nordvirginia-Armee',
    farbe: '#d4737c',
    fuehrung: 'Robert E. Lee',
    staerke: '71.000 Mann, 283 Geschütze',
    zahl: 71000,
  },
];

const gelaende = [
  { art: 'hoehe', name: 'Cemetery Ridge', punkte: linie([-77.2345, 39.8060], 5.6, 0.9, 98) },
  { art: 'hoehe', name: 'Seminary Ridge', punkte: linie([-77.2520, 39.8140], 6.4, 0.9, 98) },
  { art: 'hoehe', name: 'Culp’s Hill', punkte: klumpen(CULPS, 1.5, 1.3, 20) },
  { art: 'hoehe', name: 'Little Round Top', punkte: klumpen(LITTLE_ROUND_TOP, 1.1, 1.5, 5) },
  { art: 'hoehe', name: 'Big Round Top', punkte: klumpen([-77.2375, 39.7835], 1.5, 1.2, 5) },
  { art: 'stadt', name: 'Gettysburg', punkte: klumpen(STADT, 1.6) },
  { art: 'wald', name: 'Rose Woods', punkte: klumpen([-77.2470, 39.7930], 1.3, 1.2, 30) },
  { art: 'weg', name: 'Emmitsburg Road', punkte: pfeil([-77.2270, 39.8360], [-77.2420, 39.8090], [-77.2530, 39.7930]) },
  { art: 'weg', name: 'Chambersburg Pike', punkte: pfeil([-77.2860, 39.8420], [-77.2500, 39.8350], [-77.2320, 39.8320]) },
];

/* Wiederkehrende Stellungen. Die Kennung bleibt über die Stationen gleich –
   daran hängt das Gleiten von einer Aufstellung in die nächste. */
const s = (id, partei, form, gattung, punkte, mehr = {}) => ({
  id, partei, form, gattung, punkte, ...mehr,
});

const stationen = [
  {
    zeit: '1. Juli, 8 Uhr',
    t: 0,
    kurz: 'Eine Begegnung, die keiner geplant hat.',
    text: 'Lee steht mit drei Korps verstreut in Pennsylvania und weiß nicht, wo die Unionsarmee ist – seine Reiterei unter Stuart reitet seit Tagen einen weiten Bogen und meldet nichts. Westlich von Gettysburg stößt eine Division auf abgesessene Unionsreiter unter Buford, die den Höhenrücken am Chambersburg Pike halten. Buford weiß, was hinter ihm liegt: die Höhen südlich der Stadt. Er kämpft um Zeit, nicht um Boden.',
    uebersicht: true,
    sicht: [[-77.8, 39.5], [-76.9, 40.1]],
    stellungen: [
      s('anm-csa', 'csa', 'pfeil', 'gemischt',
        pfeil([-77.62, 39.94], [-77.44, 39.90], [-77.30, 39.85]), { name: 'Lee aus dem Cumberland Valley' }),
      s('anm-union', 'union', 'pfeil', 'gemischt',
        pfeil([-77.15, 39.62], [-77.20, 39.72], [-77.23, 39.80]), { name: 'Meade aus Maryland' }),
    ],
  },
  {
    zeit: '1. Juli, 10 Uhr',
    t: 120,
    kurz: 'Buford hält den Höhenrücken westlich der Stadt.',
    text: 'Zwei Brigaden Reiterei, abgesessen, mit Hinterladern gegen eine anrückende Division: Buford hält den McPherson Ridge zweieinhalb Stunden. Als das I. Korps eintrifft, fällt dessen Befehlshaber Reynolds binnen Minuten. Die Union hat den Kampf angenommen, wo sie ihn nicht gesucht hat – aber am richtigen Ort.',
    stellungen: [
      s('u-1korps', 'union', 'flaeche', 'fuss', linie([-77.2660, 39.8355], 1.8, 0.5, 275), { name: 'I. Korps · Reynolds', staerke: '9.000' }),
      s('u-buford', 'union', 'flaeche', 'reiter', linie([-77.2740, 39.8375], 1.4, 0.4, 275), { name: 'Buford', staerke: '2.700' }),
      s('c-heth', 'csa', 'flaeche', 'fuss', linie([-77.2900, 39.8385], 2.0, 0.6, 95), { name: 'Heth', staerke: '7.500' }),
      s('c-stoss1', 'csa', 'pfeil', 'fuss', pfeil([-77.2960, 39.8380], [-77.2760, 39.8370]), {}),
    ],
  },
  {
    zeit: '1. Juli, 14 Uhr',
    t: 360,
    kurz: 'Ewell trifft im Norden ein und rollt die Flanke auf.',
    text: 'Das XI. Korps stellt sich nördlich der Stadt in die offene Ebene – ohne Anlehnung an beiden Flügeln. Genau dort trifft Ewell aus Norden ein. Die Unionslinie wird von der Seite gefasst und bricht; was übrig bleibt, flutet durch die Straßen von Gettysburg nach Süden.',
    stellungen: [
      s('u-1korps', 'union', 'flaeche', 'fuss', linie([-77.2560, 39.8340], 1.8, 0.5, 275), { name: 'I. Korps', staerke: '8.000' }),
      s('u-11korps', 'union', 'flaeche', 'fuss', linie([-77.2330, 39.8420], 2.2, 0.5, 350), { name: 'XI. Korps · Howard', staerke: '9.000' }),
      s('c-heth', 'csa', 'flaeche', 'fuss', linie([-77.2720, 39.8360], 2.4, 0.7, 95), { name: 'Hill', staerke: '12.000' }),
      s('c-ewell', 'csa', 'flaeche', 'fuss', linie([-77.2300, 39.8570], 3.0, 0.7, 175), { name: 'Ewell', staerke: '14.000' }),
      s('c-stoss2', 'csa', 'pfeil', 'fuss', pfeil([-77.2310, 39.8540], [-77.2320, 39.8400], [-77.2330, 39.8330]), {}),
    ],
  },
  {
    zeit: '1. Juli, 17 Uhr',
    t: 540,
    kurz: 'Der Befehl, der die Schlacht offenlässt.',
    text: 'Die Union sammelt sich auf dem Cemetery Hill südlich der Stadt – erschöpft, aber auf einer Höhe. Lee lässt Ewell wissen, er solle den Hügel nehmen, „wenn es praktikabel erscheint“. Ewell hält es nicht für praktikabel. Über keinen anderen Satz dieses Krieges ist mehr geschrieben worden: Am Abend des 1. Juli ist der Hügel noch schwach besetzt, am Morgen des 2. Juli ist er eine Festung.',
    stellungen: [
      s('u-cemetery', 'union', 'flaeche', 'fuss', klumpen(CEMETERY_HILL, 1.4, 1.2, 10), { name: 'Reste des I. und XI. Korps', staerke: '12.000', geschlagen: true }),
      s('u-culps', 'union', 'flaeche', 'fuss', klumpen(CULPS, 1.0), { name: 'Culp’s Hill', staerke: '3.000' }),
      s('c-ewell', 'csa', 'flaeche', 'fuss', linie([-77.2290, 39.8340], 2.6, 0.8, 180), { name: 'Ewell vor der Stadt', staerke: '14.000' }),
      s('c-hill', 'csa', 'flaeche', 'fuss', linie([-77.2520, 39.8250], 2.6, 0.8, 100), { name: 'Hill auf dem Seminary Ridge', staerke: '15.000' }),
      s('c-nichtstoss', 'csa', 'pfeil', 'fuss', pfeil([-77.2295, 39.8300], [-77.2320, 39.8240]), { name: 'Der Stoß, der ausblieb', finte: true }),
    ],
  },
  {
    zeit: '2. Juli, 4 Uhr',
    t: 660,
    kurz: 'Der Angelhaken steht.',
    text: 'Über Nacht marschiert die ganze Unionsarmee heran und bezieht die Höhen: Culp’s Hill als Widerhaken, Cemetery Hill als Biegung, von dort der Rücken nach Süden. Die Linie ist gut fünf Kilometer lang, aber innen herum sind es zwei – Meade kann eine Division in einer Stunde von einem Ende zum anderen schieben. Lees Linie ist doppelt so lang und außen herum.',
    stellungen: [
      s('u-culps', 'union', 'flaeche', 'fuss', klumpen(CULPS, 1.3, 1.3, 20), { name: 'XII. Korps · Culp’s Hill', staerke: '9.000' }),
      s('u-cemetery', 'union', 'flaeche', 'fuss', klumpen(CEMETERY_HILL, 1.3, 1.2, 10), { name: 'XI. Korps', staerke: '9.000' }),
      s('u-ridge', 'union', 'flaeche', 'fuss', linie(RIDGE_MITTE, 3.4, 0.5, 278), { name: 'II. Korps · Hancock', staerke: '11.000' }),
      s('u-links', 'union', 'flaeche', 'fuss', linie([-77.2370, 39.7960], 1.6, 0.5, 278), { name: 'III. Korps · Sickles', staerke: '10.000' }),
      s('u-artillerie', 'union', 'flaeche', 'geschuetz', linie([-77.2335, 39.8145], 1.2, 0.4, 278), { name: 'Artilleriereserve', staerke: '372 Geschütze' }),
      s('c-hill', 'csa', 'flaeche', 'fuss', linie([-77.2520, 39.8180], 3.6, 0.8, 100), { name: 'Hill', staerke: '20.000' }),
      s('c-ewell', 'csa', 'flaeche', 'fuss', linie([-77.2250, 39.8360], 2.6, 0.8, 190), { name: 'Ewell', staerke: '20.000' }),
      s('c-longstreet', 'csa', 'flaeche', 'fuss', linie([-77.2600, 39.8010], 2.4, 0.8, 100), { name: 'Longstreet', staerke: '15.000' }),
    ],
  },
  {
    zeit: '2. Juli, 16 Uhr',
    t: 900,
    kurz: 'Sickles rückt eigenmächtig vor – und hängt in der Luft.',
    text: 'Sickles gefällt der niedrige Südteil des Rückens nicht. Ohne Befehl schiebt er sein Korps einen Kilometer nach vorn auf den Peach Orchard, weil dort der Boden höher liegt. Damit hat er eine Linie mit zwei Fronten und keiner Anlehnung – und Little Round Top, den Eckpfeiler der ganzen Stellung, hinter sich unbesetzt gelassen.',
    stellungen: [
      s('u-links', 'union', 'flaeche', 'fuss', linie(PEACH_ORCHARD, 2.4, 0.5, 55), { name: 'III. Korps · vorgeschoben', staerke: '10.000' }),
      s('u-ridge', 'union', 'flaeche', 'fuss', linie(RIDGE_MITTE, 3.4, 0.5, 278), { name: 'II. Korps', staerke: '11.000' }),
      s('u-culps', 'union', 'flaeche', 'fuss', klumpen(CULPS, 1.3, 1.3, 20), { name: 'XII. Korps', staerke: '9.000' }),
      s('u-cemetery', 'union', 'flaeche', 'fuss', klumpen(CEMETERY_HILL, 1.3, 1.2, 10), { name: 'XI. Korps', staerke: '9.000' }),
      s('c-longstreet', 'csa', 'flaeche', 'fuss', linie([-77.2620, 39.7960], 3.0, 0.9, 80), { name: 'Longstreet · zum Angriff', staerke: '15.000' }),
      s('c-stossl', 'csa', 'pfeil', 'fuss', pfeil([-77.2600, 39.7930], [-77.2480, 39.7950], [-77.2400, 39.7930]), { name: 'gegen die offene Flanke' }),
    ],
  },
  {
    zeit: '2. Juli, 17 Uhr',
    t: 960,
    kurz: 'Little Round Top – der Eckpfeiler, fast verloren.',
    text: 'Der Chefingenieur der Armee reitet zufällig auf Little Round Top und findet ihn leer. Von dort aus könnte Artillerie den ganzen Rücken der Länge nach bestreichen. In letzter Minute wirft er vier Regimenter hinauf; das äußerste, das 20. Maine unter Chamberlain, hält den Südhang, bis ihm die Munition ausgeht, und geht dann mit dem Bajonett vor.',
    stellungen: [
      s('u-lrt', 'union', 'flaeche', 'fuss', linie(LITTLE_ROUND_TOP, 0.9, 0.4, 100), { name: 'Vincents Brigade · 20. Maine', staerke: '1.300' }),
      s('u-links', 'union', 'flaeche', 'fuss', linie(WHEATFIELD, 1.8, 0.5, 55), { name: 'III. Korps · zerschlagen', staerke: '6.000', geschlagen: true }),
      s('u-ridge', 'union', 'flaeche', 'fuss', linie(RIDGE_MITTE, 3.4, 0.5, 278), { name: 'II. Korps', staerke: '11.000' }),
      s('c-hood', 'csa', 'flaeche', 'fuss', linie([-77.2450, 39.7885], 2.0, 0.7, 40), { name: 'Hood', staerke: '7.000' }),
      s('c-mclaws', 'csa', 'flaeche', 'fuss', linie([-77.2520, 39.7975], 1.8, 0.6, 70), { name: 'McLaws', staerke: '7.000' }),
      s('c-stossr', 'csa', 'pfeil', 'fuss', pfeil([-77.2440, 39.7860], [-77.2400, 39.7890], [-77.2375, 39.7900]), {}),
    ],
  },
  {
    zeit: '2. Juli, 20 Uhr',
    t: 1140,
    kurz: 'Culp’s Hill: der Widerhaken hält knapp.',
    text: 'Am anderen Ende greift Ewell endlich an – zu spät und nicht gleichzeitig mit Longstreet. Weil Meade fast das ganze XII. Korps nach Süden geschoben hat, steht auf Culp’s Hill nur eine Brigade. Sie hält, weil sie hinter Verhauen liegt und der Hang steil ist. Der Tag endet, wie er begann: Die Union hält die Höhen, an beiden Enden um Haaresbreite.',
    stellungen: [
      s('u-culps', 'union', 'flaeche', 'fuss', klumpen(CULPS, 0.9), { name: 'Greenes Brigade allein', staerke: '1.400' }),
      s('u-cemetery', 'union', 'flaeche', 'fuss', klumpen(CEMETERY_HILL, 1.3, 1.2, 10), { name: 'XI. Korps', staerke: '8.000' }),
      s('u-lrt', 'union', 'flaeche', 'fuss', linie(LITTLE_ROUND_TOP, 1.0, 0.4, 100), { name: 'Little Round Top gehalten', staerke: '1.100' }),
      s('u-ridge', 'union', 'flaeche', 'fuss', linie(RIDGE_MITTE, 3.4, 0.5, 278), { name: 'II. Korps', staerke: '11.000' }),
      s('c-ewell', 'csa', 'flaeche', 'fuss', linie([-77.2205, 39.8290], 1.8, 0.7, 200), { name: 'Johnson gegen Culp’s Hill', staerke: '6.000' }),
      s('c-stossc', 'csa', 'pfeil', 'fuss', pfeil([-77.2190, 39.8265], [-77.2215, 39.8190]), {}),
    ],
  },
  {
    zeit: '3. Juli, 11 Uhr',
    t: 1500,
    kurz: 'Lee entscheidet sich für die Mitte.',
    text: 'Beide Flügel sind gescheitert. Lee schließt daraus, Meade habe seine Mitte geschwächt, um die Flügel zu halten – und setzt alles auf einen Stoß gegen den Rücken bei einem Baumgruppenstück, das sie „the copse of trees“ nennen. Longstreet widerspricht offen: Der Weg dorthin ist anderthalb Kilometer offenes, ansteigendes Feld. Lee bleibt dabei.',
    stellungen: [
      s('u-ridge', 'union', 'flaeche', 'fuss', linie(RIDGE_MITTE, 3.4, 0.5, 278), { name: 'II. Korps · Hancock', staerke: '11.000' }),
      s('u-artillerie', 'union', 'flaeche', 'geschuetz', linie([-77.2340, 39.8110], 2.4, 0.4, 278), { name: 'Artillerie auf dem Rücken', staerke: '120 Geschütze' }),
      s('u-culps', 'union', 'flaeche', 'fuss', klumpen(CULPS, 1.2, 1.3, 20), { name: 'Culp’s Hill zurückgewonnen', staerke: '9.000' }),
      s('u-lrt', 'union', 'flaeche', 'fuss', linie(LITTLE_ROUND_TOP, 1.0, 0.4, 100), { name: 'V. Korps', staerke: '6.000' }),
      s('c-pickett', 'csa', 'flaeche', 'fuss', linie([-77.2530, 39.8085], 2.2, 0.7, 95), { name: 'Pickett, Pettigrew, Trimble', staerke: '12.500' }),
      s('c-artillerie', 'csa', 'flaeche', 'geschuetz', linie([-77.2500, 39.8120], 3.0, 0.4, 95), { name: 'Alexanders Batterien', staerke: '150 Geschütze' }),
    ],
  },
  {
    zeit: '3. Juli, 13 Uhr',
    t: 1620,
    kurz: 'Das größte Bombardement des Krieges – und es geht zu hoch.',
    text: 'Zwei Stunden lang feuern 150 Geschütze auf den Rücken. Der Rauch steht so dicht, dass die Richtkanoniere ihre Treffer nicht sehen; die meisten Granaten gehen über die Höhe hinweg und schlagen hinter der Front ein. Die Unionsartillerie stellt das Feuer nach und nach ein – teils aus Munitionsmangel, teils als Täuschung. Alexander meldet Pickett, jetzt oder nie.',
    stellungen: [
      s('c-artillerie', 'csa', 'flaeche', 'geschuetz', linie([-77.2500, 39.8120], 3.2, 0.4, 95), { name: 'Bombardement', staerke: '150 Geschütze' }),
      s('c-pickett', 'csa', 'flaeche', 'fuss', linie([-77.2530, 39.8085], 2.2, 0.7, 95), { name: 'wartet im Wald', staerke: '12.500' }),
      s('u-ridge', 'union', 'flaeche', 'fuss', linie(RIDGE_MITTE, 3.4, 0.5, 278), { name: 'II. Korps · liegt flach', staerke: '11.000' }),
      s('u-artillerie', 'union', 'flaeche', 'geschuetz', linie([-77.2340, 39.8110], 2.4, 0.4, 278), { name: 'schweigt absichtlich', staerke: '80 Geschütze', finte: true }),
    ],
  },
  {
    zeit: '3. Juli, 15 Uhr',
    t: 1740,
    kurz: 'Picketts Angriff: 1.300 Meter offenes Feld.',
    text: 'Dreizehntausend Mann treten aus dem Wald und gehen in geschlossener Linie über offenes Ackerland. Sie müssen zweimal einen Zaun an der Emmitsburg Road übersteigen – dort bricht die Ordnung, und dort setzt das Kartätschenfeuer ein. Von den Flanken schießen Batterien der Länge nach in die Linie hinein.',
    stellungen: [
      s('c-pickett', 'csa', 'flaeche', 'fuss', linie([-77.2440, 39.8080], 2.4, 0.6, 90), { name: 'im offenen Feld', staerke: '12.500' }),
      s('c-stossm', 'csa', 'pfeil', 'fuss', pfeil([-77.2510, 39.8080], [-77.2430, 39.8075], [-77.2370, 39.8070]), { name: 'auf die Baumgruppe' }),
      s('u-ridge', 'union', 'flaeche', 'fuss', linie(RIDGE_MITTE, 3.4, 0.5, 278), { name: 'II. Korps', staerke: '11.000' }),
      s('u-artillerie', 'union', 'flaeche', 'geschuetz', linie([-77.2340, 39.8110], 2.4, 0.4, 278), { name: 'Kartätschen', staerke: '80 Geschütze' }),
      s('u-flanke', 'union', 'flaeche', 'geschuetz', linie([-77.2385, 39.7970], 1.0, 0.4, 30), { name: 'Flankenfeuer von Süden', staerke: '30 Geschütze' }),
    ],
  },
  {
    zeit: '3. Juli, 15:30 Uhr',
    t: 1770,
    kurz: 'Der Hochwassermarke-Augenblick.',
    text: 'Ein paar hundert Mann unter Armistead kommen über die niedrige Steinmauer – die Stelle heißt seither „the Angle“. Sie stehen dort keine zehn Minuten. Von beiden Seiten schließen Unionsregimenter auf, Armistead fällt an einer Batterie. Was zurückgeht, ist weniger als die Hälfte.',
    stellungen: [
      s('c-pickett', 'csa', 'flaeche', 'fuss', linie([-77.2372, 39.8075], 0.9, 0.4, 90), { name: 'Armistead an der Mauer', staerke: '2.000', geschlagen: true }),
      s('u-ridge', 'union', 'flaeche', 'fuss', linie(RIDGE_MITTE, 3.4, 0.6, 278), { name: 'II. Korps schließt auf', staerke: '10.000' }),
      s('u-nord', 'union', 'flaeche', 'fuss', linie([-77.2345, 39.8150], 1.2, 0.4, 190), { name: 'von Norden', staerke: '2.500' }),
      s('u-sued', 'union', 'flaeche', 'fuss', linie([-77.2360, 39.8000], 1.2, 0.4, 10), { name: 'von Süden', staerke: '2.500' }),
      s('c-rueck', 'csa', 'pfeil', 'fuss', pfeil([-77.2375, 39.8072], [-77.2470, 39.8080], [-77.2530, 39.8090]), { name: 'zurück über das Feld', rueckzug: true }),
    ],
  },
  {
    zeit: '4.–14. Juli',
    t: 2400,
    kurz: 'Der Rückzug, den niemand aufhält.',
    text: 'Am 4. Juli, während Vicksburg am Mississippi kapituliert, steht Lee noch auf dem Seminary Ridge und wartet auf einen Gegenangriff, der nicht kommt. In der Nacht setzt er sich ab: ein Zug von 27 Kilometern Länge im Regen nach Süden. Am Potomac steht das Wasser zu hoch; zehn Tage lang liegt die geschlagene Armee mit dem Rücken zum Fluss, und Meade greift nicht an. Lincoln schreibt ihm einen Brief darüber, den er nie abschickt.',
    uebersicht: true,
    sicht: [[-78.2, 39.2], [-76.8, 40.1]],
    stellungen: [
      s('c-rueckzug', 'csa', 'pfeil', 'gemischt',
        pfeil([-77.25, 39.81], [-77.45, 39.73], [-77.72, 39.62], [-77.80, 39.55]), { name: 'nach Williamsport', rueckzug: true }),
      s('u-folgt', 'union', 'pfeil', 'gemischt',
        pfeil([-77.22, 39.80], [-77.40, 39.60], [-77.68, 39.52]), { name: 'Meade folgt zögernd' }),
    ],
  },
];

export const gettysburg = {
  id: 'gettysburg',
  name: 'Gettysburg',
  ort: 'Gettysburg, Pennsylvania',
  datum: '1.–3. Juli 1863',
  jahr: 1860,
  mitte: [-77.2360, 39.8090],
  zoom: 12.6,
  grund: 'relief',
  worum: 'Lees zweiter Vorstoß in den Norden. Drei Tage um einen Höhenrücken, der die Form eines Angelhakens hat – und weil die Union innen steht, kann sie Reserven schneller verschieben, als der Angreifer außen herum marschieren kann. Am dritten Tag setzt Lee alles auf einen Stoß über anderthalb Kilometer offenes Feld.',
  parteien,
  gelaende,
  stationen,
  ausgang: 'Lee bricht die Schlacht ab und geht nach Virginia zurück. Die Nordvirginia-Armee unternimmt danach keinen Angriffsfeldzug mehr.',
  verluste: [
    { partei: 'union', text: 'rund 23.000 Tote, Verwundete und Vermisste' },
    { partei: 'csa', text: 'rund 23.000 – bei einer um ein Drittel kleineren Armee' },
  ],
  folgen: 'Zusammen mit dem Fall von Vicksburg am selben Tag gilt Gettysburg als Wendepunkt des Krieges: Der Süden verliert die Fähigkeit zur Offensive und die Aussicht auf europäische Anerkennung. Im November weiht Lincoln auf dem Feld einen Soldatenfriedhof ein und hält dabei eine Rede von zwei Minuten.',
  streit: 'Ob Ewell am Abend des 1. Juli den Cemetery Hill hätte nehmen können, ist die meistdiskutierte Frage des Krieges – Lees Befehl „wenn es praktikabel erscheint“ ließ ihm die Wahl. Umstritten bleibt auch, ob Sickles’ eigenmächtiger Vorstoß die Schlacht beinahe verlor oder Longstreets Angriff so lange aufhielt, dass Little Round Top noch besetzt werden konnte.',
};
