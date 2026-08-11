#!/usr/bin/env node
/*
 * ACHTUNG – Verhältnis zu src/data/battles/poltawa.json: Dieses Skript hat die
 * JSON-Datei einmal erzeugt; danach ist die JSON-Datei die gültige Fassung.
 */
/**
 * Poltawa, 8. Juli 1709.
 *
 * Der Tag, an dem Schweden aufhört, eine Großmacht zu sein. Die Karte zeigt
 * zwei Dinge, die man sonst nur liest: die Redoutenlinie – zehn Schanzen quer
 * durch die einzige Lücke zwischen zwei Wäldern, durch die das schwedische
 * Heer muss – und dass hinter dem schwedischen Heer der Dnjepr liegt, 130
 * Kilometer entfernt, ohne Brücke.
 *
 * Dazu kommt eine Kleinigkeit, die alles entscheidet: Karl XII. ist acht Tage
 * vorher am Fuß angeschossen worden und kann nicht reiten. Er lässt sich in
 * einer Sänfte tragen; der Oberbefehl liegt bei Rehnskiöld, und die Befehle
 * bleiben unterwegs stecken.
 *
 * Poltawa liegt bei 34.55 Ost, 49.59 Nord; das Feld nordwestlich davon.
 */
import { linie, klumpen, pfeil } from '../lib/stellung.mjs';

const STADT = [34.5500, 49.5900];
const FELD = [34.4900, 49.6300];
const LAGER_RUS = [34.5200, 49.6480];

const parteien = [
  {
    id: 'swe', name: 'Schweden', farbe: '#6f9fe0',
    fuehrung: 'Karl XII., Carl Gustav Rehnskiöld',
    staerke: '20.000 eingesetzt, 4 Geschütze', zahl: 20000,
  },
  {
    id: 'rus', name: 'Russland', farbe: '#d4737c',
    fuehrung: 'Peter I., Alexander Menschikow',
    staerke: '42.000, 102 Geschütze', zahl: 42000,
  },
];

const gelaende = [
  { art: 'stadt', name: 'Poltawa', punkte: klumpen(STADT, 1.6) },
  { art: 'fluss', name: 'Worskla', punkte: pfeil([34.5900, 49.5400], [34.5750, 49.6100], [34.5600, 49.6800], [34.5400, 49.7400]) },
  { art: 'wald', name: 'Budyschtschenski-Wald', punkte: klumpen([34.4550, 49.6620], 4.0, 1.3, 20) },
  { art: 'wald', name: 'Jakowetzki-Wald', punkte: klumpen([34.5150, 49.6020], 3.4, 1.3, 40) },
  { art: 'mauer', name: 'Russisches Lager', punkte: klumpen(LAGER_RUS, 2.4, 1.1, 30) },
];

const s = (id, partei, form, gattung, punkte, mehr = {}) => ({ id, partei, form, gattung, punkte, ...mehr });

/* Die zehn Redouten: sechs quer zur Lücke, vier als Sporn nach vorn. */
const redouten = [];
for (let i = 0; i < 6; i++) {
  redouten.push(s(`r-quer${i}`, 'rus', 'flaeche', 'geschuetz',
    klumpen([34.4620 + i * 0.0090, 49.6255 + i * 0.0022], 0.35), { name: i === 0 ? 'Querredouten' : '', staerke: '' }));
}
for (let i = 0; i < 4; i++) {
  redouten.push(s(`r-vor${i}`, 'rus', 'flaeche', 'geschuetz',
    klumpen([34.4880 - i * 0.0055, 49.6180 - i * 0.0060], 0.35), { name: i === 0 ? 'Vorgeschobene Redouten' : '', staerke: '' }));
}

const stationen = [
  {
    zeit: 'Winter 1708/09',
    t: 0,
    kurz: 'Ein Heer, das der Winter halbiert.',
    text: 'Karl XII. steht seit 1700 unbesiegt. Statt auf Moskau zu marschieren, wendet er sich in die Ukraine – der Hetman Masepa hat ihm ein Bündnis angeboten. Der Winter 1708/09 ist der kälteste seit Menschengedenken; von 40.000 Mann bleiben im Frühjahr gut 20.000. Der Nachschubzug unter Löwenhaupt ist vorher bei Lesnaja vernichtet worden: Es gibt kaum noch Pulver.',
    uebersicht: true,
    sicht: [[22.0, 47.0], [40.0, 57.5]],
    stellungen: [
      s('anm-swe', 'swe', 'pfeil', 'gemischt', pfeil([23.30, 54.70], [27.60, 53.90], [31.30, 52.40], [34.50, 49.65]), { name: 'Karl XII. durch die Ukraine' }),
      s('anm-rus', 'rus', 'pfeil', 'gemischt', pfeil([37.62, 55.75], [36.20, 53.00], [34.80, 50.20]), { name: 'Peter I. folgt' }),
    ],
  },
  {
    zeit: 'Mai bis Juni 1709',
    t: 180,
    kurz: 'Belagerung ohne Pulver.',
    text: 'Karl belagert Poltawa, um Peter zu einer Schlacht zu zwingen. Die Belagerung ist eine Farce: Für die Geschütze fehlt das Pulver, die Sturmangriffe scheitern. Peter kommt mit 42.000 Mann heran, geht über die Worskla und baut nordwestlich der Stadt ein befestigtes Lager – und davor etwas, das es so noch nicht gegeben hat.',
    stellungen: [
      s('s-belagerung', 'swe', 'flaeche', 'fuss', klumpen([34.5350, 49.5960], 1.8), { name: 'Belagerung von Poltawa', staerke: '8.000' }),
      s('r-lager', 'rus', 'flaeche', 'gemischt', klumpen(LAGER_RUS, 2.2), { name: 'Befestigtes Lager', staerke: '42.000' }),
      s('s-lager', 'swe', 'flaeche', 'gemischt', klumpen([34.4600, 49.6100], 1.8), { name: 'Schwedisches Lager', staerke: '12.000' }),
    ],
  },
  {
    zeit: '7. Juli',
    t: 300,
    kurz: 'Zehn Schanzen quer durch die einzige Lücke.',
    text: 'Zwischen dem Budyschtschenski- und dem Jakowetzki-Wald liegt eine Lücke von anderthalb Kilometern – der einzige Weg zum russischen Lager. Peter lässt dort sechs Redouten quer hineinbauen und vier weitere als Sporn nach vorn, mitten in die Anmarschrichtung. Wer durchwill, muss entweder halten und stürmen oder unter Feuer hindurchlaufen.',
    stellungen: [
      ...redouten,
      s('r-lager', 'rus', 'flaeche', 'gemischt', klumpen(LAGER_RUS, 2.2), { name: 'Russisches Lager', staerke: '42.000' }),
      s('r-reiter', 'rus', 'flaeche', 'reiter', linie([34.4820, 49.6420], 2.0, 0.6, 200), { name: 'Menschikows Reiterei', staerke: '9.000' }),
      s('s-lager', 'swe', 'flaeche', 'gemischt', klumpen([34.4560, 49.6080], 1.8), { name: 'Schweden vor dem Anmarsch', staerke: '20.000' }),
    ],
  },
  {
    zeit: '8. Juli, 4 Uhr',
    t: 360,
    kurz: 'Der Nachtmarsch, der zu spät kommt.',
    text: 'Die Schweden sollen im Dunkeln an den Redouten vorbei sein, bevor der Tag anbricht. Der Aufmarsch verzögert sich um Stunden – teils, weil die Befehle über den verwundeten König laufen müssen, teils weil die Infanteriesäulen sich verlieren. Als sie loskommen, ist es hell.',
    stellungen: [
      ...redouten,
      s('s-anmarsch', 'swe', 'pfeil', 'fuss', pfeil([34.4560, 49.6120], [34.4700, 49.6220], [34.4850, 49.6300]), { name: 'Anmarsch in vier Säulen' }),
      s('s-fuss', 'swe', 'flaeche', 'fuss', linie([34.4640, 49.6180], 2.0, 0.8, 50), { name: 'Fußvolk · Lewenhaupt', staerke: '8.200' }),
      s('s-reiter', 'swe', 'flaeche', 'reiter', linie([34.4620, 49.6320], 1.8, 0.7, 50), { name: 'Reiterei · Creutz', staerke: '7.800' }),
      s('r-reiter', 'rus', 'flaeche', 'reiter', linie([34.4820, 49.6420], 2.0, 0.6, 200), { name: 'Menschikow', staerke: '9.000' }),
    ],
  },
  {
    zeit: '5 Uhr',
    t: 400,
    kurz: 'Vier Säulen laufen durch – zwei bleiben hängen.',
    text: 'Der Plan war, an den Redouten vorbeizulaufen und sie hinter sich zu lassen. Zwei der vier Säulen tun das. Die Kolonne unter Roos aber greift die vorgeschobenen Schanzen an, nimmt zwei und bleibt an der dritten hängen. Damit sind ein Drittel des schwedischen Fußvolks vom Rest getrennt – und niemand merkt es rechtzeitig.',
    stellungen: [
      ...redouten,
      s('s-durch', 'swe', 'pfeil', 'gemischt', pfeil([34.4700, 49.6250], [34.4880, 49.6360], [34.5000, 49.6430]), { name: 'zwei Säulen laufen durch' }),
      s('s-fuss', 'swe', 'flaeche', 'fuss', linie([34.4900, 49.6390], 1.8, 0.7, 50), { name: 'Hauptmacht durchgebrochen', staerke: '5.500' }),
      s('s-roos', 'swe', 'flaeche', 'fuss', linie([34.4790, 49.6120], 1.2, 0.6, 30), { name: 'Roos hängt an den Redouten', staerke: '2.600', geschlagen: true }),
      s('s-reiter', 'swe', 'flaeche', 'reiter', linie([34.4880, 49.6450], 1.8, 0.7, 50), { name: 'Reiterei', staerke: '7.800' }),
      s('r-reiter', 'rus', 'flaeche', 'reiter', linie([34.5000, 49.6480], 2.0, 0.6, 200), { name: 'Menschikow weicht planmäßig', staerke: '9.000' }),
    ],
  },
  {
    zeit: '6 Uhr',
    t: 440,
    kurz: 'Roos wird abgeschnitten und aufgerieben.',
    text: 'Peter schickt fünf Bataillone und Reiterei gegen die abgesprengte Kolonne. Roos zieht sich in den Wald zurück, dann an eine alte Schanze und ergibt sich am Vormittag. Zweitausendsechshundert Mann sind weg, bevor die Hauptschlacht überhaupt begonnen hat – ein Achtel des ganzen Heeres.',
    stellungen: [
      s('s-roos', 'swe', 'flaeche', 'fuss', klumpen([34.5000, 49.6000], 1.0), { name: 'Roos ergibt sich', staerke: '1.500', geschlagen: true }),
      s('r-gegen', 'rus', 'pfeil', 'gemischt', pfeil([34.5250, 49.6280], [34.5120, 49.6100], [34.5030, 49.6020]), { name: 'fünf Bataillone gegen Roos' }),
      s('s-fuss', 'swe', 'flaeche', 'fuss', linie([34.4880, 49.6420], 1.8, 0.7, 50), { name: 'Hauptmacht wartet', staerke: '5.500' }),
      s('s-reiter', 'swe', 'flaeche', 'reiter', linie([34.4820, 49.6480], 1.8, 0.7, 50), { name: 'Reiterei', staerke: '7.800' }),
      s('r-lager', 'rus', 'flaeche', 'gemischt', klumpen(LAGER_RUS, 2.2), { name: 'Russisches Lager', staerke: '40.000' }),
    ],
  },
  {
    zeit: '9 Uhr',
    t: 500,
    kurz: 'Peter führt sein Heer aus dem Lager.',
    text: 'Statt hinter den Wällen zu warten, lässt Peter aufmarschieren: zwei Treffen Fußvolk, 102 Geschütze davor, Reiterei auf beiden Flügeln. Die Front ist doppelt so breit wie die schwedische. Ihm gegenüber stehen 4.000 schwedische Fußsoldaten in einer Linie – der Rest ist bei Roos verloren, bewacht den Tross oder liegt vor Poltawa.',
    stellungen: [
      s('r-fuss1', 'rus', 'flaeche', 'fuss', linie([34.5060, 49.6420], 3.4, 0.7, 230), { name: 'Erstes Treffen', staerke: '16.000' }),
      s('r-fuss2', 'rus', 'flaeche', 'fuss', linie([34.5140, 49.6470], 3.4, 0.7, 230), { name: 'Zweites Treffen', staerke: '10.000' }),
      s('r-art', 'rus', 'flaeche', 'geschuetz', linie([34.5010, 49.6390], 3.0, 0.4, 230), { name: '102 Geschütze', staerke: '102' }),
      s('r-reiterL', 'rus', 'flaeche', 'reiter', linie([34.4880, 49.6560], 1.6, 0.6, 230), { name: 'Reiterei links', staerke: '5.000' }),
      s('r-reiterR', 'rus', 'flaeche', 'reiter', linie([34.5230, 49.6280], 1.6, 0.6, 230), { name: 'Reiterei rechts', staerke: '4.000' }),
      s('s-fuss', 'swe', 'flaeche', 'fuss', linie([34.4820, 49.6400], 2.0, 0.5, 50), { name: 'Schwedisches Fußvolk', staerke: '4.000' }),
      s('s-reiter', 'swe', 'flaeche', 'reiter', linie([34.4740, 49.6480], 1.8, 0.6, 50), { name: 'Reiterei', staerke: '7.800' }),
    ],
  },
  {
    zeit: '9:45 Uhr',
    t: 540,
    kurz: 'Der letzte Angriff der Karoliner.',
    text: 'Die schwedische Linie geht vor, wie sie es seit neun Jahren getan hat: schnell, ohne zu schießen, bis auf Bajonettweite. Der rechte Flügel wirft das erste russische Treffen tatsächlich zurück. Aber die Linie ist zu kurz, sie reißt in der Mitte, und die 102 Geschütze schießen in die Lücken. Nach einer halben Stunde ist das schwedische Fußvolk zerschlagen.',
    stellungen: [
      s('s-fuss', 'swe', 'flaeche', 'fuss', linie([34.4950, 49.6400], 2.2, 0.5, 50), { name: 'greift an', staerke: '4.000' }),
      s('s-stoss', 'swe', 'pfeil', 'fuss', pfeil([34.4880, 49.6400], [34.5020, 49.6410]), {}),
      s('r-fuss1', 'rus', 'flaeche', 'fuss', linie([34.5090, 49.6420], 3.4, 0.7, 230), { name: 'Erstes Treffen', staerke: '15.000' }),
      s('r-art', 'rus', 'flaeche', 'geschuetz', linie([34.5030, 49.6380], 3.0, 0.4, 230), { name: 'Kartätschen in die Lücken', staerke: '102' }),
      s('r-fuss2', 'rus', 'flaeche', 'fuss', linie([34.5140, 49.6470], 3.4, 0.7, 230), { name: 'Zweites Treffen', staerke: '10.000' }),
      s('r-reiterR', 'rus', 'flaeche', 'reiter', linie([34.5180, 49.6270], 1.6, 0.6, 230), { name: 'umfasst die Flanke', staerke: '4.000' }),
    ],
  },
  {
    zeit: '11 Uhr',
    t: 600,
    kurz: 'Die Sänfte des Königs wird zerschossen.',
    text: 'Die schwedische Linie löst sich auf. Karls Sänfte wird von einer Kugel zerschlagen; man setzt ihn auf ein Pferd, das ebenfalls fällt, dann auf ein zweites. Die Trabantengarde bringt ihn vom Feld. Von zwanzigtausend Mann sind am Mittag knapp zweitausend gefallen, ebenso viele gefangen – und der Rest läuft.',
    stellungen: [
      s('s-fuss', 'swe', 'flaeche', 'fuss', linie([34.4870, 49.6390], 1.6, 0.5, 50), { name: 'aufgelöst', staerke: '1.500', geschlagen: true }),
      s('s-koenig', 'swe', 'pfeil', 'reiter', pfeil([34.4900, 49.6380], [34.4700, 49.6250], [34.4550, 49.6100]), { name: 'Der König wird weggebracht', rueckzug: true }),
      s('r-fuss1', 'rus', 'flaeche', 'fuss', linie([34.5000, 49.6420], 3.6, 0.8, 230), { name: 'rückt nach', staerke: '15.000' }),
      s('r-reiterR', 'rus', 'flaeche', 'reiter', linie([34.5060, 49.6250], 1.8, 0.6, 230), { name: 'Verfolgung', staerke: '4.000' }),
    ],
  },
  {
    zeit: '11. Juli · Perewolotschna',
    t: 720,
    kurz: 'Der Fluss ohne Brücke.',
    text: 'Der Rest des Heeres läuft 130 Kilometer nach Süden bis zur Mündung der Worskla in den Dnjepr. Dort gibt es keine Brücke und fast keine Boote. Karl und Masepa setzen mit wenigen hundert Mann über und entkommen ins Osmanische Reich. Die übrigen 20.000 – mehr als auf dem Schlachtfeld gestanden hatten – ergeben sich am 11. Juli einer weit kleineren russischen Abteilung.',
    uebersicht: true,
    sicht: [[30.8, 45.9], [37.2, 51.0]],
    stellungen: [
      s('s-flucht', 'swe', 'pfeil', 'gemischt', pfeil([34.49, 49.62], [34.20, 49.20], [33.90, 48.85], [33.62, 48.98]), { name: 'nach Perewolotschna', rueckzug: true }),
      s('s-koenigflucht', 'swe', 'pfeil', 'reiter', pfeil([33.62, 48.98], [32.80, 47.60], [31.50, 46.60]), { name: 'Karl XII. ins Osmanische Reich', rueckzug: true }),
      s('r-verfolgt', 'rus', 'pfeil', 'reiter', pfeil([34.52, 49.64], [34.20, 49.15], [33.70, 48.95]), { name: 'Menschikow nimmt 20.000 gefangen' }),
    ],
  },
];

export const poltawa = {
  id: 'poltawa',
  name: 'Poltawa',
  ort: 'Nordwestlich von Poltawa',
  datum: '8. Juli 1709',
  jahr: 1715,
  mitte: FELD,
  zoom: 12.1,
  grund: 'relief',
  worum: 'Das Ende Schwedens als Großmacht. Zwischen zwei Wäldern liegt eine Lücke von anderthalb Kilometern – der einzige Weg zum russischen Lager –, und Peter baut zehn Schanzen hinein. Hinter dem schwedischen Heer liegt der Dnjepr, 130 Kilometer entfernt und ohne Brücke.',
  parteien,
  gelaende,
  stationen,
  ausgang: 'Das schwedische Feldheer wird zerschlagen; drei Tage später ergeben sich die Reste am Dnjepr. Karl XII. entkommt ins Osmanische Reich und kehrt erst 1714 zurück.',
  verluste: [
    { partei: 'swe', text: '6.900 Gefallene und Verwundete, 2.800 auf dem Feld gefangen, weitere rund 20.000 bei Perewolotschna' },
    { partei: 'rus', text: '1.345 Gefallene, 3.290 Verwundete' },
  ],
  folgen: 'Die schwedische Großmachtstellung endet; Dänemark und Sachsen treten wieder in den Krieg ein. Russland wird zur Ostseemacht – Peter gründet St. Petersburg aus und lässt sich 1721 zum Imperator ausrufen. Die Ukraine bleibt unter russischer Kontrolle.',
  streit: 'Wie sehr die Verwundung Karls XII. den Ausgang bestimmte, ist eine alte Frage: Die schwedische Überlieferung betont sie, weil sie den unbesiegten König entlastet; nüchternere Darstellungen verweisen auf das Zahlenverhältnis von eins zu zwei, vier Geschütze gegen 102 und den fehlenden Pulvervorrat.',
};
