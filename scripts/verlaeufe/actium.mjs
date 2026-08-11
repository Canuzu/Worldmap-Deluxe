#!/usr/bin/env node
/*
 * ACHTUNG – Verhältnis zu src/data/battles/actium.json: Dieses Skript hat die
 * JSON-Datei einmal erzeugt; danach ist die JSON-Datei die gültige Fassung.
 */
/**
 * Actium, 2. September 31 v. Chr.
 *
 * Eine Seeschlacht, die vorher an Land entschieden wurde. Antonius' Flotte
 * liegt im Ambrakischen Golf; die Ausfahrt ist eine Meerenge von 700 Metern,
 * und Agrippa hat sie von außen dicht. Über den Sommer verliert das Heer im
 * Lager mehr Männer an Malaria und Ruhr als je im Kampf; ganze Schiffe können
 * nicht mehr bemannt werden.
 *
 * Als die Flotte am 2. September ausläuft, ist das kein Angriff, sondern ein
 * Ausbruchsversuch: Die Schiffe haben ihre Segel an Bord – im Seegefecht der
 * Antike lässt man sie an Land, sie sind nur zur Fahrt gut. Wer Segel
 * mitnimmt, plant, wegzufahren.
 *
 * Die Meerenge liegt bei 20.76 Ost, 38.94 Nord; die Schlacht selbst
 * westlich davon im offenen Wasser.
 */
import { linie, klumpen, pfeil } from '../lib/stellung.mjs';

const ENGE = [20.7600, 38.9400];
const OFFEN = [20.6700, 38.9500];

const parteien = [
  {
    id: 'oct', name: 'Octavian', farbe: '#6f9fe0',
    fuehrung: 'Marcus Vipsanius Agrippa, Octavian',
    staerke: '400 Schiffe, meist leichte Liburnen', zahl: 400,
  },
  {
    id: 'ant', name: 'Antonius und Kleopatra', farbe: '#d4737c',
    fuehrung: 'Marcus Antonius, Kleopatra VII.',
    staerke: '230 schwere Schiffe, 60 ägyptische', zahl: 290,
  },
];

const gelaende = [
  { art: 'stadt', name: 'Aktion', punkte: klumpen([20.7650, 38.9340], 0.9) },
  { art: 'stadt', name: 'Lager Octavians', punkte: klumpen([20.7550, 38.9720], 1.4) },
  { art: 'hoehe', name: 'Halbinsel Preveza', punkte: klumpen([20.7480, 38.9560], 2.6, 1.5, 20) },
  { art: 'hoehe', name: 'Südufer der Enge', punkte: klumpen([20.7700, 38.9260], 2.4, 1.4, 90) },
];

const s = (id, partei, form, gattung, punkte, mehr = {}) => ({ id, partei, form, gattung, punkte, ...mehr });

const stationen = [
  {
    zeit: 'Winter 32/31',
    t: 0,
    kurz: 'Zwei Machtblöcke, ein Reich.',
    text: 'Nach dem Zerfall des Triumvirats steht Antonius mit den östlichen Provinzen und Ägypten gegen Octavian mit Italien und dem Westen. Rom erklärt förmlich Kleopatra den Krieg, nicht Antonius – so ist es kein Bürgerkrieg. Antonius sammelt Heer und Flotte an der Westküste Griechenlands, um Italien zu bedrohen.',
    uebersicht: true,
    sicht: [[13.5, 29.5], [33.0, 43.0]],
    stellungen: [
      s('anm-ant', 'ant', 'pfeil', 'schiff', pfeil([29.92, 31.20], [26.50, 34.80], [23.20, 37.50], [20.80, 38.90]), { name: 'Antonius und Kleopatra aus Ägypten' }),
      s('anm-oct', 'oct', 'pfeil', 'schiff', pfeil([18.50, 40.15], [19.60, 39.80], [20.70, 39.10]), { name: 'Agrippa von Brundisium' }),
    ],
  },
  {
    zeit: 'Frühjahr 31',
    t: 120,
    kurz: 'Agrippa schneidet den Nachschub ab.',
    text: 'Statt frontal anzugreifen, nimmt Agrippa die Stützpunkte: Methone im Süden, dann Korkyra im Norden. Damit ist der Seeweg nach Ägypten unterbrochen, über den Antonius sein Getreide bekommt. Octavian landet mit dem Heer nördlich der Meerenge und schlägt ein Lager auf. Die Falle ist zu, ohne dass ein Schiff gekämpft hat.',
    stellungen: [
      s('o-flotte', 'oct', 'flaeche', 'schiff', linie([20.6600, 38.9600], 6.0, 1.4, 100), { name: 'Agrippas Flotte sperrt die Ausfahrt', staerke: '400 Schiffe' }),
      s('o-lager', 'oct', 'flaeche', 'fuss', klumpen([20.7550, 38.9720], 1.4), { name: 'Octavians Landlager', staerke: '19 Legionen' }),
      s('a-flotte', 'ant', 'flaeche', 'schiff', klumpen([20.8200, 38.9350], 3.0, 1.4, 90), { name: 'Antonius im Golf', staerke: '290 Schiffe' }),
      s('a-lager', 'ant', 'flaeche', 'fuss', klumpen([20.7700, 38.9200], 1.6), { name: 'Antonius’ Lager', staerke: '19 Legionen' }),
    ],
  },
  {
    zeit: 'Juli und August',
    t: 240,
    kurz: 'Die Schlacht, die der Sommer schlägt.',
    text: 'Vier Monate liegt das Heer im sumpfigen Uferland. Malaria und Ruhr fressen die Ruderer; ein Drittel der Schiffe kann nicht mehr besetzt werden, und Antonius lässt sie verbrennen, damit sie nicht in die Hände des Gegners fallen. Verbündete Könige laufen über. Am Ende steht die Frage nicht mehr, ob man siegt, sondern ob man wegkommt.',
    stellungen: [
      s('a-flotte', 'ant', 'flaeche', 'schiff', klumpen([20.8200, 38.9350], 2.6, 1.4, 90), { name: 'ausgezehrt', staerke: '230 Schiffe', geschlagen: true }),
      s('a-lager', 'ant', 'flaeche', 'fuss', klumpen([20.7700, 38.9200], 1.5), { name: 'Fieber im Lager', staerke: 'schwindend', geschlagen: true }),
      s('o-flotte', 'oct', 'flaeche', 'schiff', linie([20.6600, 38.9600], 6.0, 1.4, 100), { name: 'wartet draußen', staerke: '400 Schiffe' }),
      s('o-lager', 'oct', 'flaeche', 'fuss', klumpen([20.7550, 38.9720], 1.4), { name: 'Octavian', staerke: '19 Legionen' }),
    ],
  },
  {
    zeit: '2. September, Morgen',
    t: 360,
    kurz: 'Die Segel an Bord – das verrät den Plan.',
    text: 'Antonius lässt ausfahren und befiehlt, die Segel mitzunehmen. Im antiken Seegefecht bleiben die Segel an Land: Gerudert wird gekämpft, Segel sind Ballast und im Weg. Wer sie an Bord nimmt, rechnet damit, wegzufahren. Antonius’ Offiziere verstehen das, und mancher läuft noch in der Nacht über.',
    stellungen: [
      s('a-links', 'ant', 'flaeche', 'schiff', linie([20.7480, 38.9560], 2.4, 0.8, 280), { name: 'Linker Flügel', staerke: '80 Schiffe' }),
      s('a-mitte', 'ant', 'flaeche', 'schiff', linie([20.7520, 38.9380], 2.4, 0.8, 280), { name: 'Mitte', staerke: '80 Schiffe' }),
      s('a-rechts', 'ant', 'flaeche', 'schiff', linie([20.7560, 38.9200], 2.4, 0.8, 280), { name: 'Rechter Flügel · Antonius', staerke: '70 Schiffe' }),
      s('a-kleo', 'ant', 'flaeche', 'schiff', klumpen([20.7920, 38.9370], 2.0, 1.2, 90), { name: 'Kleopatras Geschwader mit der Kasse', staerke: '60 Schiffe' }),
      s('o-links', 'oct', 'flaeche', 'schiff', linie([20.6750, 38.9640], 2.6, 0.8, 100), { name: 'Agrippa · linker Flügel', staerke: '150 Schiffe' }),
      s('o-mitte', 'oct', 'flaeche', 'schiff', linie([20.6700, 38.9420], 2.6, 0.8, 100), { name: 'Mitte', staerke: '130 Schiffe' }),
      s('o-rechts', 'oct', 'flaeche', 'schiff', linie([20.6650, 38.9200], 2.6, 0.8, 100), { name: 'Rechter Flügel', staerke: '120 Schiffe' }),
    ],
  },
  {
    zeit: 'Mittag',
    t: 420,
    kurz: 'Vier Stunden Stillstand auf dem Wasser.',
    text: 'Beide Linien stehen sich gegenüber und rühren sich nicht. Antonius wartet auf den Nordwestwind, der am Nachmittag regelmäßig auffrischt und ihn nach Süden tragen kann. Agrippa wartet, weil er nichts erzwingen muss – die Zeit steht auf seiner Seite, solange der Gegner im Golf bleibt.',
    stellungen: [
      s('a-links', 'ant', 'flaeche', 'schiff', linie([20.7380, 38.9560], 2.4, 0.8, 280), { name: 'wartet', staerke: '80 Schiffe' }),
      s('a-mitte', 'ant', 'flaeche', 'schiff', linie([20.7420, 38.9380], 2.4, 0.8, 280), { name: 'wartet', staerke: '80 Schiffe' }),
      s('a-rechts', 'ant', 'flaeche', 'schiff', linie([20.7460, 38.9200], 2.4, 0.8, 280), { name: 'Antonius', staerke: '70 Schiffe' }),
      s('a-kleo', 'ant', 'flaeche', 'schiff', klumpen([20.7800, 38.9370], 2.0, 1.2, 90), { name: 'Kleopatra dahinter', staerke: '60 Schiffe' }),
      s('o-links', 'oct', 'flaeche', 'schiff', linie([20.6800, 38.9640], 2.6, 0.8, 100), { name: 'Agrippa', staerke: '150 Schiffe' }),
      s('o-mitte', 'oct', 'flaeche', 'schiff', linie([20.6750, 38.9420], 2.6, 0.8, 100), { name: 'Mitte', staerke: '130 Schiffe' }),
      s('o-rechts', 'oct', 'flaeche', 'schiff', linie([20.6700, 38.9200], 2.6, 0.8, 100), { name: 'Rechter Flügel', staerke: '120 Schiffe' }),
    ],
  },
  {
    zeit: 'Früher Nachmittag',
    t: 480,
    kurz: 'Agrippa zieht den Nordflügel nach außen.',
    text: 'Agrippa lässt seinen linken Flügel nach Norden ausschwenken, um zu umfassen. Antonius muss folgen, sonst wird er von der Seite gefasst. Damit dehnt sich seine Linie – und in der Mitte entsteht eine Lücke. Genau darauf hat jemand gewartet.',
    stellungen: [
      s('o-links', 'oct', 'flaeche', 'schiff', linie([20.6900, 38.9760], 2.8, 0.8, 130), { name: 'Agrippa schwenkt aus', staerke: '150 Schiffe' }),
      s('o-schwenk', 'oct', 'pfeil', 'schiff', pfeil([20.6820, 38.9640], [20.7000, 38.9760], [20.7250, 38.9800]), {}),
      s('a-links', 'ant', 'flaeche', 'schiff', linie([20.7250, 38.9680], 2.4, 0.8, 300), { name: 'muss folgen', staerke: '80 Schiffe' }),
      s('a-mitte', 'ant', 'flaeche', 'schiff', linie([20.7300, 38.9420], 2.2, 0.7, 280), { name: 'Mitte dünnt aus', staerke: '80 Schiffe' }),
      s('a-rechts', 'ant', 'flaeche', 'schiff', linie([20.7380, 38.9180], 2.4, 0.8, 280), { name: 'Antonius', staerke: '70 Schiffe' }),
      s('a-kleo', 'ant', 'flaeche', 'schiff', klumpen([20.7700, 38.9360], 2.0, 1.2, 90), { name: 'Kleopatra', staerke: '60 Schiffe' }),
      s('o-mitte', 'oct', 'flaeche', 'schiff', linie([20.6850, 38.9420], 2.6, 0.8, 100), { name: 'Mitte', staerke: '130 Schiffe' }),
      s('o-rechts', 'oct', 'flaeche', 'schiff', linie([20.6800, 38.9180], 2.6, 0.8, 100), { name: 'Rechter Flügel', staerke: '120 Schiffe' }),
    ],
  },
  {
    zeit: 'Nachmittag',
    t: 540,
    kurz: 'Kleopatra setzt die Segel und fährt hindurch.',
    text: 'Als der Wind auffrischt, setzt das ägyptische Geschwader die Segel, fährt durch die Lücke in der eigenen Mitte und nach Süden davon. Sechzig Schiffe mit der Kriegskasse. Ob das der abgesprochene Plan war oder eine Flucht, streiten die Quellen seit zweitausend Jahren – die römische Überlieferung, die Octavian schreiben ließ, hatte gute Gründe für die zweite Lesart.',
    stellungen: [
      s('a-kleo', 'ant', 'pfeil', 'schiff', pfeil([20.7700, 38.9360], [20.7300, 38.9200], [20.6900, 38.8700], [20.6500, 38.8000]), { name: 'Kleopatra durch die Lücke nach Süden' }),
      s('a-mitte', 'ant', 'flaeche', 'schiff', linie([20.7300, 38.9440], 2.0, 0.7, 280), { name: 'Lücke in der Mitte', staerke: '70 Schiffe' }),
      s('a-links', 'ant', 'flaeche', 'schiff', linie([20.7250, 38.9700], 2.4, 0.8, 300), { name: 'im Kampf gebunden', staerke: '80 Schiffe' }),
      s('a-rechts', 'ant', 'flaeche', 'schiff', linie([20.7350, 38.9160], 2.4, 0.8, 280), { name: 'Antonius', staerke: '70 Schiffe' }),
      s('o-links', 'oct', 'flaeche', 'schiff', linie([20.6950, 38.9760], 2.8, 0.8, 130), { name: 'Agrippa', staerke: '150 Schiffe' }),
      s('o-mitte', 'oct', 'flaeche', 'schiff', linie([20.6950, 38.9420], 2.6, 0.8, 100), { name: 'Mitte', staerke: '130 Schiffe' }),
    ],
  },
  {
    zeit: 'Später Nachmittag',
    t: 600,
    kurz: 'Antonius verlässt sein Flaggschiff und fährt hinterher.',
    text: 'Antonius steigt auf ein leichteres Schiff um und folgt dem ägyptischen Geschwader. Er lässt damit seine Flotte und sein Heer zurück, mitten im Gefecht. Plutarch nennt das den Augenblick, in dem er aufhörte, ein Feldherr zu sein. Rund vierzig Schiffe kommen mit ihm durch.',
    stellungen: [
      s('a-antonius', 'ant', 'pfeil', 'schiff', pfeil([20.7350, 38.9160], [20.7000, 38.8800], [20.6600, 38.8100]), { name: 'Antonius folgt', rueckzug: true }),
      s('a-links', 'ant', 'flaeche', 'schiff', linie([20.7280, 38.9700], 2.2, 0.8, 300), { name: 'zurückgelassen', staerke: '80 Schiffe', geschlagen: true }),
      s('a-mitte', 'ant', 'flaeche', 'schiff', linie([20.7320, 38.9440], 2.0, 0.7, 280), { name: 'zurückgelassen', staerke: '70 Schiffe', geschlagen: true }),
      s('o-links', 'oct', 'flaeche', 'schiff', linie([20.7050, 38.9720], 2.8, 0.9, 130), { name: 'Agrippa schließt auf', staerke: '150 Schiffe' }),
      s('o-mitte', 'oct', 'flaeche', 'schiff', linie([20.7050, 38.9420], 2.8, 0.9, 100), { name: 'Mitte', staerke: '130 Schiffe' }),
      s('o-rechts', 'oct', 'flaeche', 'schiff', linie([20.7000, 38.9180], 2.6, 0.8, 100), { name: 'Rechter Flügel', staerke: '120 Schiffe' }),
    ],
  },
  {
    zeit: 'Abend',
    t: 660,
    kurz: 'Brandpfeile auf die schweren Schiffe.',
    text: 'Die zurückgelassenen Schiffe sind zu schwer, um zu entkommen, und zu wenige, um die Linie zu halten. Agrippas leichte Liburnen umfahren sie und schießen Brandpfeile. Was nicht brennt, ergibt sich. Das Landheer wartet noch eine Woche auf Antonius, dann geht es geschlossen zu Octavian über.',
    stellungen: [
      s('a-links', 'ant', 'flaeche', 'schiff', linie([20.7300, 38.9660], 1.8, 0.8, 300), { name: 'brennt oder ergibt sich', staerke: 'Rest', geschlagen: true }),
      s('a-mitte', 'ant', 'flaeche', 'schiff', linie([20.7340, 38.9420], 1.6, 0.7, 280), { name: 'ergibt sich', staerke: 'Rest', geschlagen: true }),
      s('o-links', 'oct', 'flaeche', 'schiff', linie([20.7150, 38.9700], 3.0, 1.0, 130), { name: 'Agrippa umfährt', staerke: '400 Schiffe' }),
      s('a-lager', 'ant', 'flaeche', 'fuss', klumpen([20.7700, 38.9200], 1.5), { name: 'Landheer läuft über', staerke: '19 Legionen', geschlagen: true }),
    ],
  },
  {
    zeit: 'August 30 v. Chr.',
    t: 840,
    kurz: 'Alexandria, und danach hat Rom einen Herrn.',
    text: 'Antonius und Kleopatra erreichen Alexandria und halten sich noch ein Jahr. Als Octavian im Sommer 30 vor der Stadt steht, laufen die letzten Truppen über; beide nehmen sich das Leben. Ägypten wird römisch – und zwar nicht Provinz des Senats, sondern persönlicher Besitz Octavians. Vier Jahre später heißt er Augustus. Die Republik ist zu Ende, ohne dass jemand sie abgeschafft hätte.',
    uebersicht: true,
    sicht: [[18.0, 29.5], [34.0, 41.0]],
    stellungen: [
      s('a-flucht', 'ant', 'pfeil', 'schiff', pfeil([20.70, 38.85], [23.50, 35.60], [27.20, 32.60], [29.92, 31.20]), { name: 'nach Alexandria', rueckzug: true }),
      s('o-nach', 'oct', 'pfeil', 'gemischt', pfeil([20.75, 38.95], [24.50, 36.20], [28.00, 32.20], [29.92, 31.20]), { name: 'Octavian folgt 30 v. Chr.' }),
    ],
  },
];

export const actium = {
  id: 'actium',
  name: 'Actium',
  ort: 'Vor der Mündung des Ambrakischen Golfs',
  datum: '2. September 31 v. Chr.',
  jahr: -1,
  mitte: [20.7200, 38.9420],
  zoom: 11.6,
  grund: 'blatt',
  see: true,
  worum: 'Eine Seeschlacht, die der Sommer vorher entschieden hat. Antonius’ Flotte liegt im Golf, die Ausfahrt ist 700 Meter breit und von außen gesperrt; Malaria und Hunger fressen die Ruderer. Als er ausläuft, hat er die Segel an Bord – und das verrät, dass er nicht siegen, sondern wegkommen will.',
  parteien,
  gelaende,
  stationen,
  ausgang: 'Kleopatras Geschwader und rund vierzig Schiffe des Antonius brechen nach Süden durch; der Rest der Flotte wird verbrannt oder ergibt sich. Das Landheer läuft eine Woche später über.',
  verluste: [
    { partei: 'ant', text: 'rund 200 Schiffe, 5.000 Gefallene, 19 Legionen übergelaufen' },
    { partei: 'oct', text: 'nach Plutarch rund 2.500 Gefallene' },
  ],
  folgen: 'Octavian nimmt 30 v. Chr. Alexandria; Antonius und Kleopatra nehmen sich das Leben. Ägypten wird nicht Senatsprovinz, sondern persönlicher Besitz des Siegers. 27 v. Chr. erhält Octavian den Ehrennamen Augustus – die römische Republik endet ohne förmliche Abschaffung.',
  streit: 'Ob Kleopatras Abfahrt der abgesprochene Durchbruchsplan war oder eine Flucht, ist die älteste offene Frage dieser Schlacht. Die erhaltene Überlieferung stammt aus dem Umfeld des Siegers und hatte Grund, sie als Flucht darzustellen; die Segel an Bord sprechen für einen von vornherein geplanten Ausbruch. Auch die Schiffszahlen schwanken erheblich.',
};
