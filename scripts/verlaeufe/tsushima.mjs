#!/usr/bin/env node
/*
 * ACHTUNG – Verhältnis zu src/data/battles/tsushima.json: Dieses Skript hat
 * die JSON-Datei einmal erzeugt; danach ist die JSON-Datei die gültige Fassung.
 */
/**
 * Tsushima, 27./28. Mai 1905.
 *
 * Die vollständigste Seeschlacht der Geschichte: Von 38 russischen Schiffen
 * erreichen drei ihr Ziel. Auf der Karte ist die Aussage eine einzige
 * Bewegung – Tōgōs Wende. Er lässt seine Linie vor den Augen des Gegners
 * nacheinander um 180 Grad drehen, sodass jedes Schiff denselben Punkt
 * durchfährt. Fünfzehn Minuten lang ist dieser Punkt ein Ziel, auf das die
 * ganze russische Flotte schießen kann.
 *
 * Er tut es trotzdem, weil die Wende ihm den „Balken über dem T“ verschafft:
 * Danach liegt seine Linie quer vor der russischen und kann mit allen
 * Breitseiten schießen, während der Gegner nur mit den Buggeschützen
 * antworten kann.
 *
 * Die Meerenge liegt bei 129.5 Ost, 34.6 Nord, zwischen Tsushima und Kyūshū.
 */
import { linie, klumpen, pfeil } from '../lib/stellung.mjs';

const ENGE = [129.5000, 34.6000];

const parteien = [
  {
    id: 'jap', name: 'Japan', farbe: '#6f9fe0',
    fuehrung: 'Tōgō Heihachirō',
    staerke: '4 Linienschiffe, 8 Panzerkreuzer, 21 Knoten', zahl: 89,
  },
  {
    id: 'rus', name: 'Russland', farbe: '#d4737c',
    fuehrung: 'Sinowi Roschestwenski',
    staerke: '11 Linienschiffe, 38 Schiffe gesamt, 9 Knoten', zahl: 38,
  },
];

const gelaende = [
  { art: 'hoehe', name: 'Tsushima', punkte: klumpen([129.3200, 34.4000], 22.0, 2.2, 20) },
  { art: 'hoehe', name: 'Okinoshima', punkte: klumpen([130.1000, 34.2400], 3.0) },
  { art: 'hoehe', name: 'Iki', punkte: klumpen([129.7200, 33.7800], 12.0, 1.3, 10) },
];

const s = (id, partei, form, gattung, punkte, mehr = {}) => ({ id, partei, form, gattung, punkte, ...mehr });

const stationen = [
  {
    zeit: 'Oktober 1904 bis Mai 1905',
    t: 0,
    kurz: 'Achtzehntausend Seemeilen um die halbe Welt.',
    text: 'Nach dem Verlust der Pazifikflotte schickt der Zar die Ostseeflotte nach Ostasien: sieben Monate, 18.000 Seemeilen, um Afrika herum, weil Großbritannien als japanischer Bündnispartner den Suezkanal und jeden Kohlehafen verschließt. Die Kessel sind verschlissen, die Rümpfe bewachsen, die Besatzungen erschöpft. Und Port Arthur, das Ziel, ist längst gefallen.',
    uebersicht: true,
    sicht: [[-25.0, -40.0], [145.0, 62.0]],
    stellungen: [
      s('anm-rus', 'rus', 'pfeil', 'schiff',
        pfeil([20.50, 55.20], [-9.50, 38.00], [-17.40, 14.70], [11.80, -29.00], [55.50, -20.00], [105.00, 8.00], [126.00, 30.00], [129.30, 33.80]), { name: 'Die Ostseeflotte um Afrika' }),
      s('anm-jap', 'jap', 'pfeil', 'schiff', pfeil([129.30, 35.10], [129.45, 34.80], [129.50, 34.60]), { name: 'Tōgō wartet in Masampo' }),
    ],
  },
  {
    zeit: '26. Mai',
    t: 240,
    kurz: 'Welche Straße nimmt er?',
    text: 'Roschestwenski hat drei Wege nach Wladiwostok: die Straße von Tsushima, die von Tsugaru oder die von La Pérouse. Tōgō muss raten – wählt er falsch, ist die Flotte durch. Er rechnet damit, dass die Kohle nur für den kürzesten Weg reicht, und legt sich vor Tsushima. Fünfzig Hilfskreuzer stehen als Kette im Wasser.',
    stellungen: [
      s('j-kette', 'jap', 'flaeche', 'schiff', linie([129.4000, 34.1000], 60.0, 8.0, 90), { name: 'Vorpostenkette', staerke: 'Hilfskreuzer' }),
      s('j-flotte', 'jap', 'flaeche', 'schiff', klumpen([129.4500, 34.9500], 14.0, 1.3, 60), { name: 'Tōgōs Hauptmacht', staerke: '12 Panzerschiffe' }),
      s('r-flotte', 'rus', 'flaeche', 'schiff', klumpen([129.2000, 33.4000], 16.0, 1.5, 20), { name: 'Zweites Pazifikgeschwader', staerke: '38 Schiffe' }),
    ],
  },
  {
    zeit: '27. Mai, 4:45 Uhr',
    t: 300,
    kurz: '„Feind in Sicht, Quadrat 203.“',
    text: 'Im Morgennebel sichtet der Hilfskreuzer Shinano Maru ein Lazarettschiff, das seine Lichter brennen lässt – und dahinter die ganze Flotte. Die Funkmeldung geht sofort an Tōgō. Die Russen hören den Funkverkehr mit, wissen also, dass sie entdeckt sind, und ändern trotzdem nichts.',
    stellungen: [
      s('j-spaeher', 'jap', 'pfeil', 'schiff', pfeil([129.1500, 33.5000], [129.3000, 34.2000], [129.4200, 34.8000]), { name: 'Shinano Maru meldet' }),
      s('r-flotte', 'rus', 'flaeche', 'schiff', linie([129.2500, 33.7000], 8.0, 3.0, 40), { name: 'in zwei Kolonnen nach Nordost', staerke: '38 Schiffe' }),
      s('j-flotte', 'jap', 'flaeche', 'schiff', klumpen([129.4500, 34.9500], 12.0, 1.3, 60), { name: 'läuft aus', staerke: '12 Panzerschiffe' }),
    ],
  },
  {
    zeit: '13:40 Uhr',
    t: 420,
    kurz: 'Zwei Flotten sehen einander.',
    text: 'Am frühen Nachmittag kommen die Linien in Sicht. Tōgō lässt das Z-Signal setzen: „Das Schicksal des Reiches hängt von dieser Schlacht ab; jeder tue seine äußerste Pflicht.“ Die Russen fahren mit neun Knoten, die Japaner mit fünfzehn – dieser Unterschied ist die zweite Hälfte der Schlacht.',
    stellungen: [
      s('r-linie', 'rus', 'flaeche', 'schiff', linie([129.4200, 34.3500], 9.0, 1.2, 40), { name: 'Russische Linie · 9 Knoten', staerke: '11 Linienschiffe' }),
      s('r-tross', 'rus', 'flaeche', 'schiff', klumpen([129.3400, 34.2300], 6.0, 1.4, 40), { name: 'Transporter und Kreuzer', staerke: '27 Schiffe' }),
      s('j-linie', 'jap', 'flaeche', 'schiff', linie([129.5600, 34.6400], 9.0, 1.2, 230), { name: 'Japanische Linie · 15 Knoten', staerke: '12 Panzerschiffe' }),
    ],
  },
  {
    zeit: '14:05 Uhr',
    t: 450,
    kurz: 'Die Wende, die alle für einen Fehler halten.',
    text: 'Tōgō lässt seine Linie um 180 Grad drehen – aber nicht alle Schiffe gleichzeitig, sondern nacheinander an derselben Stelle. Fünfzehn Minuten lang fährt jedes Schiff durch denselben Punkt, langsam, in einer Kurve, mit dem Bug zum Gegner. Die russischen Geschütze haben ein festes Ziel. Es ist der riskanteste Augenblick der Schlacht, und er ist gewollt.',
    stellungen: [
      s('j-wende', 'jap', 'pfeil', 'schiff', pfeil([129.5400, 34.6200], [129.5150, 34.6050], [129.5050, 34.5850], [129.5250, 34.5700], [129.5600, 34.5650]), { name: 'Die Wende in Kiellinie' }),
      s('j-linie', 'jap', 'flaeche', 'schiff', linie([129.5450, 34.6000], 7.0, 1.2, 250), { name: 'dreht nacheinander', staerke: '12 Panzerschiffe' }),
      s('r-linie', 'rus', 'flaeche', 'schiff', linie([129.4600, 34.4400], 9.0, 1.2, 40), { name: 'schießt auf den Wendepunkt', staerke: '11 Linienschiffe' }),
      s('r-feuer', 'rus', 'pfeil', 'schiff', pfeil([129.4800, 34.4700], [129.5000, 34.5700]), { name: 'Feuer auf einen Punkt' }),
    ],
  },
  {
    zeit: '14:20 Uhr',
    t: 480,
    kurz: 'Der Balken über dem T.',
    text: 'Die Wende gelingt. Danach liegt die japanische Linie quer vor der russischen: Tōgō kann mit allen Breitseiten schießen, die Russen nur mit den vordersten Türmen. Dazu kommt die Munition – japanische Granaten mit Shimose-Sprengstoff, die nicht durchschlagen, sondern auf dem Panzer detonieren und alles Ungepanzerte in Brand setzen. Nach einer halben Stunde brennen die beiden russischen Flaggschiffe.',
    stellungen: [
      s('j-linie', 'jap', 'flaeche', 'schiff', linie([129.5200, 34.5300], 9.0, 1.2, 130), { name: 'quer vor der russischen Linie', staerke: '12 Panzerschiffe' }),
      s('r-linie', 'rus', 'flaeche', 'schiff', linie([129.4700, 34.4600], 9.0, 1.2, 40), { name: 'kann nur nach vorn schießen', staerke: '11 Linienschiffe', geschlagen: true }),
      s('j-feuer', 'jap', 'pfeil', 'schiff', pfeil([129.5100, 34.5100], [129.4850, 34.4750]), { name: 'alle Breitseiten' }),
      s('r-tross', 'rus', 'flaeche', 'schiff', klumpen([129.3800, 34.3200], 6.0, 1.4, 40), { name: 'Tross bleibt zurück', staerke: '27 Schiffe' }),
    ],
  },
  {
    zeit: '15 bis 19 Uhr',
    t: 600,
    kurz: 'Die schnellere Flotte bestimmt den Abstand.',
    text: 'Der Rest des Nachmittags ist eine Verfolgung. Tōgō hält sich mit sechs Knoten Überschuss immer dort, wo er schießen kann und der Gegner schlecht antwortet; jeder russische Versuch, nach Norden auszubrechen, wird abgeschnitten. Roschestwenski wird schwer verwundet. Bis zum Abend sinken vier Linienschiffe.',
    stellungen: [
      s('j-linie', 'jap', 'flaeche', 'schiff', linie([129.5500, 34.7500], 9.0, 1.2, 160), { name: 'schneidet den Weg ab', staerke: '12 Panzerschiffe' }),
      s('r-linie', 'rus', 'flaeche', 'schiff', linie([129.4700, 34.6800], 7.0, 1.4, 20), { name: 'versucht nach Norden', staerke: '7 Linienschiffe', geschlagen: true }),
      s('r-ausbruch', 'rus', 'pfeil', 'schiff', pfeil([129.4700, 34.7000], [129.4900, 34.8200], [129.5200, 34.9000]), { name: 'nach Wladiwostok', rueckzug: true }),
      s('j-abschnitt', 'jap', 'pfeil', 'schiff', pfeil([129.5800, 34.7800], [129.5300, 34.8800], [129.4900, 34.9400]), {}),
    ],
  },
  {
    zeit: 'Nacht auf den 28. Mai',
    t: 720,
    kurz: 'Einundsechzig Torpedoboote in der Dunkelheit.',
    text: 'Bei Einbruch der Nacht zieht Tōgō seine schweren Schiffe zurück und schickt einundsechzig Zerstörer und Torpedoboote los. In der Dunkelheit gibt es keine Formation mehr, nur noch einzelne Schiffe, die von Scheinwerfern gefunden werden. Zwei weitere Linienschiffe und mehrere Kreuzer sinken.',
    stellungen: [
      s('j-torpedo', 'jap', 'flaeche', 'schiff', klumpen([129.5200, 34.9000], 16.0, 1.3, 40), { name: '61 Torpedoboote', staerke: '61' }),
      s('j-nacht', 'jap', 'pfeil', 'schiff', pfeil([129.5600, 34.9600], [129.5200, 34.9000], [129.4800, 34.8400]), { name: 'Nachtangriffe' }),
      s('r-reste', 'rus', 'flaeche', 'schiff', klumpen([129.4800, 34.8600], 10.0, 1.4, 20), { name: 'aufgelöst', staerke: 'Reste', geschlagen: true }),
    ],
  },
  {
    zeit: '28. Mai, 10 Uhr',
    t: 840,
    kurz: 'Der Rest ergibt sich auf offener See.',
    text: 'Am Morgen ist der Rest des Geschwaders umstellt. Konteradmiral Nebogatow ergibt sich mit vier Schiffen – ein Vorgang, für den es in der russischen Marine keinen Präzedenzfall gibt und für den er später vor Gericht steht. Von 38 Schiffen erreichen drei Wladiwostok.',
    stellungen: [
      s('r-reste', 'rus', 'flaeche', 'schiff', klumpen([129.6000, 34.9500], 6.0, 1.3, 20), { name: 'Nebogatow ergibt sich', staerke: '4 Schiffe', geschlagen: true }),
      s('j-umstellt', 'jap', 'flaeche', 'schiff', klumpen([129.6200, 34.9600], 14.0, 1.3, 60), { name: 'umstellt', staerke: '12 Panzerschiffe' }),
    ],
  },
  {
    zeit: 'September 1905',
    t: 1020,
    kurz: 'Eine asiatische Macht schlägt eine europäische.',
    text: 'Im Frieden von Portsmouth verzichtet Russland auf Korea und tritt Südsachalin ab. Zum ersten Mal in der Neuzeit unterliegt eine europäische Großmacht einer asiatischen – die Wirkung reicht von Kalkutta bis Kairo. In Russland löst die Niederlage die Revolution von 1905 aus; die Ostseeflotte gibt es nicht mehr, und im Herbst meutert die Schwarzmeerflotte.',
    uebersicht: true,
    sicht: [[120.0, 30.0], [146.0, 47.0]],
    stellungen: [
      s('r-durch', 'rus', 'pfeil', 'schiff', pfeil([129.65, 35.10], [130.60, 36.60], [131.90, 43.10]), { name: 'drei Schiffe erreichen Wladiwostok', rueckzug: true }),
      s('j-sieg', 'jap', 'pfeil', 'schiff', pfeil([129.50, 34.60], [131.00, 34.90], [135.20, 34.70], [139.80, 35.45]), { name: 'Japan als Seemacht' }),
      s('r-verlust', 'rus', 'pfeil', 'gemischt', pfeil([131.90, 43.10], [137.00, 45.50], [142.80, 46.60]), { name: 'Südsachalin abgetreten', rueckzug: true }),
    ],
  },
];

export const tsushima = {
  id: 'tsushima',
  name: 'Tsushima',
  ort: 'Straße von Tsushima',
  datum: '27./28. Mai 1905',
  jahr: 1900,
  mitte: [129.5000, 34.6200],
  zoom: 9.6,
  grund: 'blatt',
  see: true,
  worum: 'Die vollständigste Seeschlacht der Geschichte: Von 38 russischen Schiffen erreichen drei ihr Ziel. Entschieden wird sie durch eine Wende, die alle für einen Fehler halten – fünfzehn Minuten lang fährt jedes japanische Schiff durch denselben Punkt, auf den die ganze gegnerische Flotte schießen kann.',
  parteien,
  gelaende,
  stationen,
  ausgang: 'Das russische Geschwader wird vernichtet: 21 Schiffe versenkt, sieben gekapert, sechs interniert. Drei erreichen Wladiwostok.',
  verluste: [
    { partei: 'rus', text: '4.380 Gefallene, 5.917 Gefangene – darunter der verwundete Oberbefehlshaber' },
    { partei: 'jap', text: '117 Gefallene, drei Torpedoboote' },
  ],
  folgen: 'Im Frieden von Portsmouth verzichtet Russland auf Korea und tritt Südsachalin ab. Zum ersten Mal unterliegt eine europäische Großmacht in der Neuzeit einer asiatischen – ein Signal für antikoloniale Bewegungen von Indien bis Ägypten. In Russland trägt die Niederlage die Revolution von 1905.',
  streit: 'Über den Anteil der Ursachen wird bis heute gestritten: Wendemanöver und Geschwindigkeit auf der einen Seite, auf der anderen der Zustand der russischen Schiffe nach sieben Monaten Fahrt, die schlechte Kohle und die Zünder der russischen Granaten, von denen viele nicht detonierten. Auch die Frage, ob Roschestwenski überhaupt eine Wahl hatte, wird verschieden beantwortet.',
};
