#!/usr/bin/env node
/*
 * ACHTUNG – Verhältnis zu src/data/battles/panipat1526.json: Dieses Skript hat
 * die JSON-Datei einmal erzeugt; danach ist die JSON-Datei die gültige Fassung.
 */
/**
 * Panipat, 21. April 1526.
 *
 * Der Größenunterschied ist so groß, dass er auf der Karte falsch aussieht,
 * und er stimmt trotzdem ungefähr: ein Heer von zwölftausend gegen ein
 * Vielfaches davon. Babur gleicht ihn mit zwei Dingen aus, die beide auf
 * einer Karte sichtbar sind – einer Wagenburg, die seine Front unangreifbar
 * macht und ihre Breite festlegt, und einer Reiterei, die außen um beide
 * Flügel herumgeht und von hinten schießt.
 *
 * Was dazwischen passiert, ist kein Kampf zweier Linien, sondern ein Stau:
 * Ein Heer, das viel zu breit angetreten ist, läuft in einen Raum hinein,
 * der zu eng ist, um sich darin zu entfalten, und steht sich selbst im Weg.
 *
 * Panipat liegt bei 76.97 Ost, 29.39 Nord.
 */
import { linie, klumpen, pfeil } from '../lib/stellung.mjs';

const STADT = [76.9700, 29.3900];
const FRONT = [77.0100, 29.4030];
const LAGER_LODI = [77.0100, 29.3620];

const parteien = [
  {
    id: 'mog', name: 'Baburs Heer', farbe: '#6f9fe0',
    fuehrung: 'Zahir ud-Din Muhammad Babur, Humayun, Ustad Ali Quli, Mustafa Rumi',
    staerke: 'rund 12.000 mit Tross, davon vielleicht 8.000 im Gefecht; Feldgeschütze und Luntenschlossschützen',
    zahl: 12000,
  },
  {
    id: 'lodi', name: 'Sultanat von Delhi', farbe: '#d4737c',
    fuehrung: 'Ibrahim Lodi',
    staerke: 'nach Baburs eigener Angabe 100.000 und 1.000 Elefanten; die Schätzungen reichen bis herab auf 40.000',
    zahl: 50000,
  },
];

const gelaende = [
  { art: 'stadt', name: 'Panipat', punkte: klumpen(STADT, 2.4, 1.1, 20) },
  { art: 'mauer', name: 'Die Wagenburg · 700 Karren', punkte: linie(FRONT, 8.0, 0.12, 180) },
  { art: 'wald', name: 'Verhau aus gefällten Bäumen', punkte: klumpen([77.0570, 29.4030], 0.9, 2.2, 0) },
  { art: 'weg', name: 'Die Straße nach Delhi', punkte: pfeil([77.0150, 29.3450], [77.0350, 29.2600], [77.0700, 29.1500]) },
  { art: 'fluss', name: 'Yamuna', punkte: pfeil([77.2100, 29.5600], [77.2450, 29.4300], [77.2800, 29.2900]) },
];

const s = (id, partei, form, gattung, punkte, mehr = {}) => ({ id, partei, form, gattung, punkte, ...mehr });

const stationen = [
  {
    zeit: 'Winter 1525/26',
    t: 0,
    kurz: 'Baburs fünfter Versuch, nach Indien zu kommen.',
    text: 'Babur ist ein Fürst ohne Land: Aus Ferghana vertrieben, hat er Samarkand dreimal genommen und dreimal verloren und sitzt seit zwanzig Jahren in Kabul. Indien ist der letzte Ausweg, und es ist der vierte oder fünfte Anlauf. Diesmal ruft ihn ein Statthalter des Sultans selbst zu Hilfe. Er zieht über den Chaiber, nimmt Lahore und geht die Straße nach Delhi hinunter.',
    uebersicht: true,
    sicht: [[64.5, 25.5], [81.5, 41.5]],
    stellungen: [
      s('anm-verlust', 'mog', 'pfeil', 'reiter', pfeil([66.97, 39.65], [67.80, 37.60], [69.18, 34.53]), { name: 'Samarkand verloren, Kabul bleibt' }),
      s('anm-mog', 'mog', 'pfeil', 'gemischt', pfeil([69.18, 34.53], [71.58, 34.01], [74.34, 31.55], [76.20, 30.20], [77.01, 29.40]), { name: 'Über den Chaiber nach Panipat' }),
      s('anm-lodi', 'lodi', 'pfeil', 'gemischt', pfeil([77.21, 28.61], [77.10, 28.95], [77.02, 29.32]), { name: 'Ibrahim Lodi zieht ihm entgegen' }),
    ],
  },
  {
    zeit: '12. April',
    t: 60,
    kurz: 'Zwei Heere in Sichtweite, und keines greift an.',
    text: 'Babur erreicht Panipat und stellt sich nördlich der Stadt auf. Das Sultanatsheer lagert wenige Kilometer südlich, und dann geschieht acht Tage lang nichts. Babur schreibt in seinem Tagebuch, Ibrahim sei ein unerfahrener Feldherr, der weder angreife noch abziehe – ein Urteil, das er sich leisten kann, weil er die Zeit zum Graben braucht.',
    stellungen: [
      s('m-front', 'mog', 'flaeche', 'gemischt', linie(FRONT, 7.6, 0.9, 180), { name: 'Babur nördlich der Stadt', staerke: '12.000' }),
      s('m-rechts', 'mog', 'flaeche', 'reiter', klumpen([76.9760, 29.4030], 1.6), { name: 'Rechter Flügel an der Stadt' }),
      s('l-lager', 'lodi', 'flaeche', 'gemischt', klumpen(LAGER_LODI, 5.0, 1.2, 90), { name: 'Das Sultanatsheer im Lager', staerke: 'ein Vielfaches' }),
    ],
  },
  {
    zeit: 'Die acht Tage',
    t: 130,
    kurz: 'Siebenhundert Karren, mit Riemen aneinandergebunden.',
    text: 'Babur lässt aus den Dörfern der Umgebung siebenhundert Ochsenkarren holen und in einer Reihe quer über das Feld aufstellen, mit rohen Lederriemen verbunden. Zwischen je sechs oder sieben Karren bleibt eine Lücke, breit genug für hundert Reiter im Ausfall. Hinter den Karren stehen die Geschütze und die Schützen mit den Luntenschlossgewehren. Rechts deckt die Stadt, links werden ein Graben und ein Verhau aus gefällten Bäumen angelegt.',
    stellungen: [
      s('m-wagen', 'mog', 'flaeche', 'geschuetz', linie(FRONT, 8.0, 0.35, 180), { name: 'Die Wagenburg', staerke: '700 Karren' }),
      s('m-front', 'mog', 'flaeche', 'gemischt', linie([77.0100, 29.4110], 7.2, 0.9, 180), { name: 'Dahinter das Heer', staerke: '12.000' }),
      s('m-rechts', 'mog', 'flaeche', 'reiter', klumpen([76.9760, 29.4090], 1.6), { name: 'Rechts die Stadt' }),
      s('m-links', 'mog', 'flaeche', 'reiter', klumpen([77.0540, 29.4090], 1.6), { name: 'Links Graben und Verhau' }),
      s('l-lager', 'lodi', 'flaeche', 'gemischt', klumpen(LAGER_LODI, 5.0, 1.2, 90), { name: 'wartet ab', staerke: 'ein Vielfaches' }),
    ],
  },
  {
    zeit: '19. April, nachts',
    t: 200,
    kurz: 'Ein Nachtangriff, der misslingt und trotzdem wirkt.',
    text: 'Weil sein Gegner nicht kommt, schickt Babur viertausend Mann zu einem Überfall auf das Lager. Der Angriff gerät in Unordnung, die Truppe verliert im Dunkeln den Zusammenhalt und muss zurück; Babur nennt es in seinen Aufzeichnungen einen Fehlschlag. Er hat aber das erreicht, was er wollte: Ibrahim glaubt jetzt, der Gegner sei zum Angriff zu schwach, und beschließt anzugreifen.',
    stellungen: [
      s('m-nacht', 'mog', 'pfeil', 'reiter', pfeil([77.0200, 29.4000], [77.0180, 29.3800], [77.0140, 29.3680]), { name: 'Überfall bei Nacht', geschlagen: true }),
      s('m-wagen', 'mog', 'flaeche', 'geschuetz', linie(FRONT, 8.0, 0.35, 180), { name: 'Die Wagenburg', staerke: '700 Karren' }),
      s('l-lager', 'lodi', 'flaeche', 'gemischt', klumpen(LAGER_LODI, 5.0, 1.2, 90), { name: 'Der Überfall verläuft im Sand', staerke: 'ein Vielfaches' }),
    ],
  },
  {
    zeit: '21. April, Morgengrauen',
    t: 260,
    kurz: 'Ein Heer läuft an, das sich selbst im Weg steht.',
    text: 'Das Sultanatsheer rückt in dichter Masse vor, die Elefanten voran. Es ist auf ein Gefecht in offener Ebene eingerichtet, in dem die Überzahl zählt. Vor der Wagenburg findet es aber keine Front zum Umfassen, sondern eine Wand, und die Reihen hinter der Spitze laufen auf die Reihen davor auf. Nach wenigen hundert Metern steht das Heer und kann sich weder ausbreiten noch zurück.',
    stellungen: [
      s('l-vor', 'lodi', 'flaeche', 'gemischt', linie([77.0100, 29.3860], 9.0, 1.6, 0), { name: 'Angriff in dichter Masse', staerke: 'die ganze Front' }),
      s('l-elefanten', 'lodi', 'flaeche', 'gemischt', linie([77.0100, 29.3940], 5.0, 0.5, 0), { name: 'Die Elefanten voran', staerke: 'bis zu 1.000' }),
      s('l-stoss', 'lodi', 'pfeil', 'gemischt', pfeil([77.0100, 29.3900], [77.0100, 29.3970], [77.0100, 29.4010]), {}),
      s('m-wagen', 'mog', 'flaeche', 'geschuetz', linie(FRONT, 8.0, 0.35, 180), { name: 'Die Wagenburg hält', staerke: '700 Karren' }),
      s('m-front', 'mog', 'flaeche', 'gemischt', linie([77.0100, 29.4110], 7.2, 0.9, 180), { name: 'dahinter', staerke: '12.000' }),
    ],
  },
  {
    zeit: 'Erste Stunde',
    t: 320,
    kurz: 'Die Reiterei geht außen um beide Flügel herum.',
    text: 'Babur schickt von beiden Enden der Wagenburg Reiterei hinaus, die weit ausholt und dem stehenden Heer in den Rücken kommt – das Verfahren, das seine Vorfahren aus der Steppe mitgebracht haben. Von vorn steht eine Wand, von hinten und von den Seiten kommen berittene Bogenschützen, die schießen und ausweichen. Das Sultanatsheer wird von außen nach innen zusammengedrückt.',
    stellungen: [
      s('m-umR', 'mog', 'pfeil', 'reiter', pfeil([76.9700, 29.4030], [76.9540, 29.3820], [76.9760, 29.3620], [77.0000, 29.3560]), { name: 'Umfassung rechts' }),
      s('m-umL', 'mog', 'pfeil', 'reiter', pfeil([77.0560, 29.4030], [77.0740, 29.3820], [77.0500, 29.3600], [77.0250, 29.3550]), { name: 'Umfassung links' }),
      s('l-vor', 'lodi', 'flaeche', 'gemischt', linie([77.0100, 29.3870], 7.6, 1.6, 0), { name: 'steht fest', staerke: 'die ganze Front', geschlagen: true }),
      s('m-wagen', 'mog', 'flaeche', 'geschuetz', linie(FRONT, 8.0, 0.35, 180), { name: 'Die Wagenburg', staerke: '700 Karren' }),
      s('m-front', 'mog', 'flaeche', 'gemischt', linie([77.0100, 29.4110], 7.2, 0.9, 180), { name: 'Babur dahinter', staerke: '12.000' }),
    ],
  },
  {
    zeit: 'Vormittag',
    t: 400,
    kurz: 'Feldgeschütze, wie sie hier keiner gesehen hat.',
    text: 'Aus den Lücken der Wagenburg feuern die Geschütze Ustad Ali Qulis und die Luntenschlossschützen in die dichteste Stelle. Der militärische Schaden ist begrenzt – nachgeladen wird langsam –, die Wirkung auf die Elefanten nicht: Sie drehen um und gehen durch die eigenen Reihen zurück. Zugleich reiten aus denselben Lücken Trupps heraus und stoßen in die Front.',
    stellungen: [
      s('m-wagen', 'mog', 'flaeche', 'geschuetz', linie(FRONT, 8.0, 0.35, 180), { name: 'Geschütze und Schützen', staerke: 'aus den Lücken' }),
      s('m-ausfall1', 'mog', 'pfeil', 'reiter', pfeil([76.9900, 29.4020], [76.9880, 29.3940], [76.9860, 29.3890]), {}),
      s('m-ausfall2', 'mog', 'pfeil', 'reiter', pfeil([77.0320, 29.4020], [77.0330, 29.3940], [77.0340, 29.3890]), {}),
      s('l-elefanten', 'lodi', 'flaeche', 'gemischt', linie([77.0100, 29.3830], 4.4, 0.6, 0), { name: 'Die Elefanten drehen um', geschlagen: true }),
      s('l-vor', 'lodi', 'flaeche', 'gemischt', linie([77.0100, 29.3770], 6.8, 1.8, 0), { name: 'zusammengedrückt', staerke: 'ineinandergeschoben', geschlagen: true }),
      s('m-umR', 'mog', 'pfeil', 'reiter', pfeil([76.9600, 29.3760], [76.9800, 29.3600], [77.0020, 29.3560]), { name: 'von hinten' }),
      s('m-umL', 'mog', 'pfeil', 'reiter', pfeil([77.0620, 29.3760], [77.0420, 29.3590], [77.0200, 29.3550]), { name: 'von hinten' }),
    ],
  },
  {
    zeit: 'Gegen Mittag',
    t: 470,
    kurz: 'Nach einem Vormittag liegt der Sultan im Feld.',
    text: 'Kurz nach Mittag ist es vorbei. Ibrahim Lodi fällt mitten in seinem Heer; Babur schreibt, man habe fünfzehn- oder sechzehntausend Tote um ihn herum gezählt und den Kopf des Sultans zu ihm gebracht. Es ist der einzige Sultan von Delhi, der je auf dem Schlachtfeld gestorben ist. Der Rest löst sich nach Süden und Osten auf.',
    stellungen: [
      s('l-vor', 'lodi', 'flaeche', 'gemischt', klumpen([77.0100, 29.3800], 3.6, 1.6, 90), { name: 'Ibrahim Lodi fällt', staerke: 'aufgerieben', geschlagen: true }),
      s('l-flucht', 'lodi', 'pfeil', 'gemischt', pfeil([77.0200, 29.3600], [77.0500, 29.3200], [77.0900, 29.2600]), { name: 'Auflösung nach Süden', rueckzug: true }),
      s('m-wagen', 'mog', 'flaeche', 'geschuetz', linie(FRONT, 8.0, 0.35, 180), { name: 'Die Wagenburg', staerke: '700 Karren' }),
      s('m-front', 'mog', 'flaeche', 'gemischt', linie([77.0100, 29.3980], 7.2, 0.9, 180), { name: 'rückt nach', staerke: '12.000' }),
    ],
  },
  {
    zeit: 'Nach dem 21. April',
    t: 560,
    kurz: 'Ein Reich, das bis 1857 hält.',
    text: 'Humayun reitet noch am selben Tag nach Agra voraus und sichert die Schatzkammer; die Familie des besiegten Fürsten von Gwalior schenkt ihm dafür einen Diamanten, der später Koh-i-Noor heißt. Babur nimmt Delhi und Agra und bleibt – was seine Truppen, die zurück nach Kabul wollen, nicht begeistert. Er hat noch vier Jahre. Das Reich, das er begründet, regiert Nordindien bis zur britischen Absetzung des letzten Großmoguls 1858.',
    uebersicht: true,
    sicht: [[66.5, 20.0], [92.5, 37.5]],
    stellungen: [
      s('m-delhi', 'mog', 'pfeil', 'gemischt', pfeil([77.01, 29.40], [77.21, 28.61], [78.01, 27.18]), { name: 'Delhi und Agra' }),
      s('m-reich', 'mog', 'pfeil', 'gemischt', pfeil([78.01, 27.18], [82.90, 25.32], [87.50, 24.60], [88.36, 22.57]), { name: 'Bis 1530 nach Osten bis Bengalen' }),
      s('m-heimat', 'mog', 'pfeil', 'reiter', pfeil([77.01, 29.40], [74.34, 31.55], [71.58, 34.01], [69.18, 34.53]), { name: 'Die Truppe will zurück nach Kabul' }),
    ],
  },
];

export const panipat1526 = {
  id: 'panipat1526',
  name: 'Panipat',
  ort: 'Panipat, Nordindien',
  datum: '21. April 1526',
  jahr: 1526,
  mitte: [77.0100, 29.3930],
  zoom: 12.0,
  grund: 'relief',
  worum: 'Zwölftausend gegen ein Vielfaches – ausgeglichen durch zwei Dinge, die man auf der Karte sehen kann: eine Reihe von siebenhundert aneinandergebundenen Ochsenkarren, die die Front unangreifbar macht und ihre Breite festlegt, und eine Reiterei, die außen um beide Flügel herum in den Rücken geht. Dazwischen steht ein Heer, das zu breit angetreten ist und sich selbst im Weg steht.',
  parteien,
  gelaende,
  stationen,
  ausgang: 'Das Sultanatsheer wird an einem Vormittag zerschlagen; Ibrahim Lodi fällt. Delhi und Agra ergeben sich binnen Tagen.',
  verluste: [
    { partei: 'lodi', text: 'nach Baburs Zählung 15.000 bis 16.000 allein um den Sultan; der Sultan selbst gefallen' },
    { partei: 'mog', text: 'nicht überliefert; nach Baburs Darstellung gering' },
  ],
  folgen: 'Babur nimmt Delhi und Agra und bleibt in Indien, obwohl seine Truppen zurück nach Kabul wollen. Er stirbt 1530; sein Sohn Humayun verliert das Reich noch einmal an Sher Shah Suri und gewinnt es zurück. Unter Akbar wird daraus der Staat, der Nordindien bis ins 18. Jahrhundert beherrscht – die Mogulherrschaft endet formell erst 1858 mit der britischen Absetzung Bahadur Shahs II. Auf demselben Feld bei Panipat wird 1556 und 1761 noch zweimal über Indien entschieden.',
  streit: 'Fast alles, was über die Schlacht bekannt ist, steht im Baburnama – der Bericht des Siegers und zugleich eine der offensten Selbstdarstellungen der Weltliteratur. Baburs Zahlen für die Gegenseite (100.000 Mann, 1.000 Elefanten) gelten als stark überhöht; wie groß die Wirkung der Feldgeschütze wirklich war, ist umstritten, weil die Feuergeschwindigkeit gering war. Unstrittig ist die Wagenburg – ein Verfahren, das Babur ausdrücklich als „osmanische Art“ bezeichnet und über zwei angeworbene Fachleute erhalten hat.',
};
