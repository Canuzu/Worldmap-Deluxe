#!/usr/bin/env node
/*
 * ACHTUNG – Verhältnis zu src/data/battles/adua.json: Dieses Skript hat die
 * JSON-Datei einmal erzeugt; danach ist die JSON-Datei die gültige Fassung.
 */
/**
 * Adua, 1. März 1896.
 *
 * Die Schlacht ist der seltene Fall, in dem eine Karte selbst die Ursache
 * ist: Baratieri lässt drei Brigaden nachts über unbekanntes Bergland
 * marschieren, nach Karten, die eine Höhe an der falschen Stelle zeigen und
 * denselben Namen zweimal vergeben. Bei Sonnenaufgang stehen die drei
 * Kolonnen nicht nebeneinander, sondern über zehn Kilometer verteilt, mit
 * Schluchten dazwischen, und werden nacheinander erledigt.
 *
 * Der zweite Grund steht nicht auf der Karte: Menelik hat sich zehn Jahre
 * lang Gewehre gekauft, unter anderem in Italien, und stellt achtzigtausend
 * Bewaffnete auf, wo Rom mit einem Stammesaufgebot rechnet.
 *
 * Adua liegt bei 38.90 Ost, 14.17 Nord.
 */
import { linie, klumpen, pfeil } from '../lib/stellung.mjs';

const ADUA = [38.9000, 14.1700];
const RAIO = [38.8700, 14.1450];
const KIDANE = [38.8080, 14.1330];
const SHAVITU = [38.8600, 14.2100];

const parteien = [
  {
    id: 'ita', name: 'Italien', farbe: '#6f9fe0',
    fuehrung: 'Oreste Baratieri, Matteo Albertone, Vittorio Dabormida, Giuseppe Arimondi, Giuseppe Ellena',
    staerke: 'rund 17.700 in vier Brigaden, etwa die Hälfte davon eritreische Askari; 56 Geschütze',
    zahl: 17700,
  },
  {
    id: 'aet', name: 'Äthiopisches Kaiserreich', farbe: '#c98a4b',
    fuehrung: 'Menelik II., Kaiserin Taytu Betul, Ras Alula, Ras Mengesha, Ras Makonnen, Ras Mikael',
    staerke: 'rund 100.000, davon etwa 80.000 mit modernen Gewehren; um die 40 Geschütze',
    zahl: 100000,
  },
];

const gelaende = [
  { art: 'stadt', name: 'Adua', punkte: klumpen(ADUA, 1.8) },
  { art: 'hoehe', name: 'Berg Raio', punkte: klumpen(RAIO, 3.0, 1.3, 20) },
  { art: 'hoehe', name: 'Enda Kidane Meret', punkte: klumpen(KIDANE, 3.2, 1.3, 340) },
  { art: 'hoehe', name: 'Berg Belah', punkte: klumpen([38.8420, 14.1830], 2.6, 1.2, 60) },
  { art: 'hoehe', name: 'Semayata', punkte: klumpen([38.9300, 14.2050], 3.0, 1.3, 300) },
  { art: 'weg', name: 'Das Tal von Mariam Shavitu', punkte: pfeil([38.9200, 14.1830], [38.8900, 14.2000], [38.8450, 14.2150]) },
  { art: 'weg', name: 'Der Pass von Rebbi Arienni', punkte: klumpen([38.9520, 14.1520], 1.4) },
];

const s = (id, partei, form, gattung, punkte, mehr = {}) => ({ id, partei, form, gattung, punkte, ...mehr });

const stationen = [
  {
    zeit: '1889 bis 1895',
    t: 0,
    kurz: 'Ein Vertrag, der in zwei Sprachen zwei Dinge sagt.',
    text: 'Der Vertrag von Wutschale von 1889 hat zwei Fassungen. In der amharischen darf Menelik seine auswärtigen Geschäfte über Italien führen; in der italienischen muss er es. Aus dem Muss macht Rom ein Protektorat und meldet es den europäischen Mächten. Menelik kündigt den Vertrag 1893 und kauft weiter Gewehre – in Frankreich, in Russland und, solange es geht, in Italien selbst.',
    uebersicht: true,
    sicht: [[35.5, 7.0], [45.5, 18.0]],
    stellungen: [
      s('anm-ita', 'ita', 'pfeil', 'gemischt', pfeil([39.47, 15.61], [39.05, 15.10], [39.47, 14.28], [39.10, 14.20], [38.95, 14.16]), { name: 'Von Massaua ins Hochland' }),
      s('anm-aet', 'aet', 'pfeil', 'gemischt', pfeil([38.75, 9.02], [39.27, 11.60], [39.53, 13.50], [38.95, 14.14]), { name: 'Menelik ruft das Reichsaufgebot' }),
      s('anm-waffen', 'aet', 'pfeil', 'gemischt', pfeil([43.15, 11.59], [41.80, 11.10], [40.00, 9.60], [38.75, 9.02]), { name: 'Gewehre über Dschibuti' }),
    ],
  },
  {
    zeit: 'Februar 1896',
    t: 60,
    kurz: 'Vier Monate Stillstand, dann ein Telegramm aus Rom.',
    text: 'Beide Heere stehen sich seit Wochen gegenüber, ohne anzugreifen; beiden geht das Essen aus. Baratieri will sich zurückziehen und weiß, dass er der Schwächere ist. Da trifft ein Telegramm des Ministerpräsidenten Crispi ein: Dies sei eine militärische Schwindsucht, kein Krieg, und er, Crispi, sei bereit, jedes Opfer zu bringen, um die Ehre des Heeres zu retten. Baratieri beruft einen Kriegsrat ein und beschließt anzugreifen.',
    stellungen: [
      s('i-lager', 'ita', 'flaeche', 'gemischt', klumpen([38.9800, 14.1450], 4.0, 1.3, 90), { name: 'Das italienische Lager bei Sauria', staerke: '17.700' }),
      s('a-lager', 'aet', 'flaeche', 'gemischt', klumpen([38.8800, 14.1900], 7.0, 1.3, 60), { name: 'Das Lager Meneliks bei Adua', staerke: 'rund 100.000' }),
      s('a-alula', 'aet', 'flaeche', 'gemischt', klumpen([38.8500, 14.1500], 3.0, 1.2, 30), { name: 'Ras Alula deckt nach Osten' }),
    ],
  },
  {
    zeit: '29. Februar, 21 Uhr',
    t: 130,
    kurz: 'Nachtmarsch in drei Kolonnen, nach falschen Karten.',
    text: 'Drei Brigaden brechen bei Mondschein auf, um bis zum Morgen die Höhen vor Adua zu besetzen und den Gegner dort zu erwarten. Albertone links, Arimondi in der Mitte, Dabormida rechts, Ellena mit der Reserve dahinter. Der Weg führt durch Schluchten, in denen sich die Kolonnen nicht sehen und nicht hören. Die Karten, nach denen marschiert wird, sind Skizzen; zwei verschiedene Höhen tragen darauf denselben Namen.',
    stellungen: [
      s('i-alb', 'ita', 'pfeil', 'gemischt', pfeil([38.9700, 14.1350], [38.9100, 14.1350], [38.8500, 14.1340]), { name: 'Albertone links' }),
      s('i-ari', 'ita', 'pfeil', 'gemischt', pfeil([38.9800, 14.1500], [38.9300, 14.1470], [38.8850, 14.1450]), { name: 'Arimondi in der Mitte' }),
      s('i-dab', 'ita', 'pfeil', 'gemischt', pfeil([38.9850, 14.1650], [38.9400, 14.1750], [38.9000, 14.1850]), { name: 'Dabormida rechts' }),
      s('a-lager', 'aet', 'flaeche', 'gemischt', klumpen([38.8800, 14.1900], 7.0, 1.3, 60), { name: 'Das äthiopische Lager', staerke: 'rund 100.000' }),
    ],
  },
  {
    zeit: 'Vor Sonnenaufgang',
    t: 190,
    kurz: 'Eine Brigade steht sechs Kilometer zu weit vorn.',
    text: 'Albertone erreicht die Höhe, die auf seiner Karte das Ziel ist, und hört von seinen Führern, die eigentliche Enda Kidane Meret liege noch weiter westlich. Er marschiert weiter. Damit steht seine Brigade bei Tagesanbruch nicht auf einer Linie mit den anderen, sondern mehrere Kilometer davor – allein, mit einer Schlucht zwischen sich und Arimondi, unmittelbar vor dem äthiopischen Lager.',
    stellungen: [
      s('i-albB', 'ita', 'flaeche', 'gemischt', linie(KIDANE, 2.4, 0.7, 90), { name: 'Albertone, zu weit westlich', staerke: '4.000 Askari' }),
      s('i-ariB', 'ita', 'flaeche', 'gemischt', linie(RAIO, 2.4, 0.7, 270), { name: 'Arimondi auf dem Raio', staerke: '2.500' }),
      s('i-dabB', 'ita', 'flaeche', 'gemischt', linie([38.9000, 14.1900], 2.4, 0.7, 300), { name: 'Dabormida rechts oben', staerke: '3.800' }),
      s('i-ell', 'ita', 'flaeche', 'gemischt', klumpen([38.9350, 14.1520], 2.2, 1.2, 90), { name: 'Ellena mit der Reserve', staerke: '4.600' }),
      s('a-lager', 'aet', 'flaeche', 'gemischt', klumpen([38.8600, 14.1750], 6.0, 1.3, 60), { name: 'Das Lager wacht auf', staerke: 'rund 100.000' }),
    ],
  },
  {
    zeit: '1. März, 6 Uhr',
    t: 250,
    kurz: 'Bei Sonnenaufgang steht das ganze Heer schon da.',
    text: 'Es ist der Tag des Heiligen Georg; die Truppen sind seit dem Morgengrauen zur Messe versammelt und damit in Waffen und beieinander. Innerhalb einer Stunde stehen Zehntausende gegen Albertones viertausend. Menelik zögert kurz, ob er das Lager räumen soll; Kaiserin Taytu und Ras Mengesha drängen zum Angriff, und er gibt die Reserve frei.',
    stellungen: [
      s('i-albB', 'ita', 'flaeche', 'gemischt', linie(KIDANE, 2.4, 0.7, 90), { name: 'Albertone allein', staerke: '4.000', geschlagen: true }),
      s('a-front', 'aet', 'flaeche', 'gemischt', linie([38.8380, 14.1400], 7.0, 1.6, 270), { name: 'Das Aufgebot tritt an', staerke: 'Zehntausende' }),
      s('a-stoss', 'aet', 'pfeil', 'gemischt', pfeil([38.8350, 14.1370], [38.8220, 14.1350], [38.8140, 14.1340]), { name: 'auf Albertone' }),
      s('i-ariB', 'ita', 'flaeche', 'gemischt', linie(RAIO, 2.4, 0.7, 270), { name: 'Arimondi, zu weit zurück', staerke: '2.500' }),
      s('i-dabB', 'ita', 'flaeche', 'gemischt', linie([38.9000, 14.1900], 2.4, 0.7, 300), { name: 'Dabormida, ohne Sicht', staerke: '3.800' }),
    ],
  },
  {
    zeit: 'Gegen 8 Uhr',
    t: 310,
    kurz: 'Albertones Brigade wird zuerst aufgerieben.',
    text: 'Die Askari-Brigade hält zwei Stunden und schießt ihre Munition leer. Dann geht sie in Stücken zurück, verfolgt bis in die Schlucht, die sie von der Mitte trennt. Albertone wird gefangen genommen, seine Geschütze bleiben stehen. Der linke Flügel des italienischen Heeres existiert um neun Uhr nicht mehr.',
    stellungen: [
      s('i-albB', 'ita', 'flaeche', 'gemischt', linie([38.8250, 14.1360], 1.6, 0.6, 90), { name: 'aufgerieben', staerke: 'Reste', geschlagen: true }),
      s('a-front', 'aet', 'flaeche', 'gemischt', linie([38.8180, 14.1390], 7.0, 1.6, 270), { name: 'drückt nach Osten', staerke: 'Zehntausende' }),
      s('a-verf', 'aet', 'pfeil', 'gemischt', pfeil([38.8200, 14.1370], [38.8450, 14.1400], [38.8620, 14.1430]), { name: 'Verfolgung' }),
      s('i-ariB', 'ita', 'flaeche', 'gemischt', linie(RAIO, 2.4, 0.7, 270), { name: 'Arimondi geht in Stellung', staerke: '2.500' }),
      s('i-ell', 'ita', 'flaeche', 'gemischt', klumpen([38.9000, 14.1520], 2.2, 1.2, 90), { name: 'Ellena rückt heran', staerke: '4.600' }),
    ],
  },
  {
    zeit: 'Vormittag',
    t: 380,
    kurz: 'Dabormida biegt nach rechts ab und ist weg.',
    text: 'Dabormida soll die Mitte stützen und zieht stattdessen nach Norden ab, in das Tal von Mariam Shavitu – aus welchem Grund, ist nie geklärt worden. Seine Brigade verschwindet damit aus der Schlacht, die anderswo geschlagen wird. Im Tal wird sie von der Reiterei Ras Mikaels von beiden Seiten eingeschlossen. Dabormida fällt; die Bauern erzählen später von einem Offizier, der um Wasser bat.',
    stellungen: [
      s('i-dabB', 'ita', 'flaeche', 'gemischt', linie(SHAVITU, 2.2, 0.7, 300), { name: 'Dabormida im Tal', staerke: '3.800', geschlagen: true }),
      s('a-mikael1', 'aet', 'pfeil', 'reiter', pfeil([38.8900, 14.2280], [38.8720, 14.2200], [38.8640, 14.2140]), { name: 'Ras Mikael von Norden' }),
      s('a-mikael2', 'aet', 'pfeil', 'reiter', pfeil([38.8850, 14.1930], [38.8700, 14.2000], [38.8620, 14.2060]), { name: 'und von Süden' }),
      s('i-ariB', 'ita', 'flaeche', 'gemischt', linie(RAIO, 2.4, 0.8, 270), { name: 'Arimondi hält den Raio', staerke: '2.500' }),
      s('a-front', 'aet', 'flaeche', 'gemischt', linie([38.8420, 14.1440], 7.0, 1.6, 270), { name: 'gegen den Raio', staerke: 'Zehntausende' }),
    ],
  },
  {
    zeit: 'Gegen Mittag',
    t: 440,
    kurz: 'Auf dem Raio bricht die letzte geschlossene Linie.',
    text: 'Arimondi und Ellena stehen auf dem Berg Raio mit dem, was von zwei Brigaden übrig ist, und werden von vorn und über beide Hänge angegriffen. Die Munition geht aus, die Träger sind fort. Arimondi fällt beim Versuch, die Linie noch einmal zu ordnen. Gegen halb eins gibt Baratieri den Rückzug.',
    stellungen: [
      s('i-ariB', 'ita', 'flaeche', 'gemischt', linie(RAIO, 2.2, 0.8, 270), { name: 'Arimondi fällt', staerke: 'Reste', geschlagen: true }),
      s('i-ell', 'ita', 'flaeche', 'gemischt', klumpen([38.8850, 14.1470], 2.0, 1.2, 90), { name: 'Ellena deckt', staerke: '4.600', geschlagen: true }),
      s('a-front', 'aet', 'flaeche', 'gemischt', linie([38.8520, 14.1450], 7.0, 1.8, 270), { name: 'greift von vorn an', staerke: 'Zehntausende' }),
      s('a-flanke1', 'aet', 'pfeil', 'gemischt', pfeil([38.8600, 14.1650], [38.8680, 14.1550], [38.8700, 14.1480]), { name: 'über den Nordhang' }),
      s('a-flanke2', 'aet', 'pfeil', 'gemischt', pfeil([38.8600, 14.1250], [38.8680, 14.1350], [38.8700, 14.1420]), { name: 'über den Südhang' }),
    ],
  },
  {
    zeit: 'Nachmittag',
    t: 500,
    kurz: 'Ein Rückzug, der über dreißig Kilometer geht.',
    text: 'Was noch geht, geht zurück nach Osten, durch dieselben Schluchten, in denen die Kolonnen nachts auseinandergelaufen sind, verfolgt von der Reiterei. Von 17.700 Mann kehren rund 10.000 zurück. Etwa 3.000 gehen in Gefangenschaft; die eritreischen Askari darunter werden als Verräter behandelt und verstümmelt – rechte Hand, linker Fuß. Menelik lässt die Verfolgung nach zwei Tagen abbrechen.',
    stellungen: [
      s('i-rueck', 'ita', 'pfeil', 'gemischt', pfeil([38.8800, 14.1480], [38.9400, 14.1500], [39.0100, 14.1450], [39.0800, 14.1400]), { name: 'Rückzug nach Osten', rueckzug: true }),
      s('a-verf', 'aet', 'pfeil', 'reiter', pfeil([38.8600, 14.1550], [38.9300, 14.1580], [39.0000, 14.1520]), { name: 'Verfolgung' }),
      s('i-ell', 'ita', 'flaeche', 'gemischt', klumpen([38.9500, 14.1470], 1.8, 1.2, 90), { name: 'Nachhut', staerke: 'was noch steht', geschlagen: true }),
      s('a-front', 'aet', 'flaeche', 'gemischt', linie([38.8900, 14.1500], 6.0, 1.6, 270), { name: 'Das Feld', staerke: 'Zehntausende' }),
    ],
  },
  {
    zeit: 'Nach dem 1. März',
    t: 580,
    kurz: 'Ein afrikanischer Staat, den niemand kolonisiert.',
    text: 'Crispi tritt zurück; im Oktober 1896 erkennt Italien im Vertrag von Addis Abeba die Unabhängigkeit Äthiopiens an und behält Eritrea. Menelik verzichtet darauf, weiter nach Norden zu marschieren – eine Entscheidung, über die bis heute gestritten wird. Adua wird für vier Jahrzehnte der Bezugspunkt jeder antikolonialen Bewegung von Kapstadt bis Harlem. 1935 kommt Italien mit Flugzeugen und Giftgas wieder.',
    uebersicht: true,
    sicht: [[30.2, 1.0], [50.5, 32.0]],
    stellungen: [
      s('i-erit', 'ita', 'pfeil', 'gemischt', pfeil([38.95, 14.16], [39.30, 14.80], [39.47, 15.61]), { name: 'Italien bleibt auf Eritrea beschränkt' }),
      s('a-vertrag', 'aet', 'pfeil', 'gemischt', pfeil([38.95, 14.16], [39.20, 12.00], [38.75, 9.02]), { name: 'Oktober 1896: Vertrag von Addis Abeba' }),
      s('i-1935', 'ita', 'pfeil', 'gemischt', pfeil([39.47, 15.61], [38.95, 14.16], [39.53, 11.60], [38.75, 9.02]), { name: '1935/36: der zweite Anlauf, mit Giftgas' }),
      s('a-vorbild', 'aet', 'pfeil', 'gemischt', pfeil([38.95, 14.16], [34.00, 11.00], [32.53, 15.59], [31.24, 30.05]), { name: 'Das Vorbild wandert über den Kontinent' }),
    ],
  },
];

export const adua = {
  id: 'adua',
  name: 'Adua',
  ort: 'Tigray, Nordäthiopien',
  datum: '1. März 1896',
  jahr: 1896,
  mitte: [38.8800, 14.1600],
  zoom: 11.0,
  grund: 'relief',
  worum: 'Drei Brigaden marschieren nachts durch unbekanntes Bergland, nach Karten, auf denen zwei verschiedene Höhen denselben Namen tragen. Bei Sonnenaufgang stehen sie nicht nebeneinander, sondern über zehn Kilometer verteilt, mit Schluchten dazwischen – und werden nacheinander erledigt, von einem Heer, das man in Rom für ein Stammesaufgebot gehalten hatte.',
  parteien,
  gelaende,
  stationen,
  ausgang: 'Drei von vier Brigaden werden vernichtet, zwei Brigadegeneräle fallen, einer gerät in Gefangenschaft. Das italienische Heer in Afrika hört als Verband auf zu bestehen.',
  verluste: [
    { partei: 'ita', text: 'rund 7.000 Tote, 1.500 Verwundete, etwa 3.000 Gefangene – über die Hälfte des Heeres; alle 56 Geschütze' },
    { partei: 'aet', text: 'rund 4.000 bis 5.000 Tote und 8.000 Verwundete' },
  ],
  folgen: 'Crispi stürzt; Italien erkennt im Oktober 1896 die Unabhängigkeit Äthiopiens an und behält Eritrea. Äthiopien bleibt als einziger großer afrikanischer Staat unkolonisiert und wird für Jahrzehnte der Bezugspunkt antikolonialer Bewegungen weit über Afrika hinaus. 1935 greift Italien erneut an, diesmal mit Bombern und Giftgas, und hält das Land fünf Jahre; 1941 kehrt Haile Selassie zurück.',
  streit: 'Warum Dabormida nach Norden abbog, ist nie geklärt worden – er fiel, und sein Stab mit ihm. Ob Baratieri den Angriff wirklich gegen seine Überzeugung befahl oder ob der Kriegsrat ihn drängte, hängt an Aussagen, die im anschließenden Kriegsgerichtsverfahren gemacht wurden; er wurde freigesprochen und trotzdem entlassen. Die italienischen Verlustzahlen gelten als verlässlich, die äthiopischen als Schätzung.',
};
