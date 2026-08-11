#!/usr/bin/env node
/*
 * ACHTUNG – Verhältnis zu src/data/battles/austerlitz.json: Dieses Skript hat
 * die JSON-Datei einmal erzeugt; danach ist die JSON-Datei die gültige Fassung.
 */
/**
 * Austerlitz, 2. Dezember 1805.
 *
 * Die einzige Schlacht dieses Atlas, in der die entscheidende Bewegung darin
 * besteht, dass jemand freiwillig eine Höhe räumt. Napoleon gibt den
 * Pratzener Höhen – die beherrschende Stellung des Feldes – vorher auf und
 * schwächt seinen rechten Flügel sichtbar. Die Verbündeten tun daraufhin
 * genau das, was er will: Sie schieben die Hälfte ihres Heeres von der Höhe
 * herunter nach Süden, um ihm den Rückweg nach Wien abzuschneiden.
 *
 * Damit steht die Mitte leer. Um neun Uhr geht Soult den Hang hinauf, und das
 * verbündete Heer ist in zwei Teile geschnitten, die nichts mehr voneinander
 * wissen.
 *
 * Die Pratzener Höhen liegen bei 16.77 Ost, 49.13 Nord, der Goldbach fließt
 * westlich davon nach Norden, die Teiche liegen im Süden bei 16.76/49.08.
 */
import { linie, klumpen, pfeil } from '../lib/stellung.mjs';

const PRATZEN = [16.7680, 49.1290];
const SANTON = [16.7350, 49.1650];
const TELNITZ = [16.7620, 49.0930];
const SOKOLNITZ = [16.7580, 49.1070];
const AUSTERLITZ = [16.8770, 49.1560];

const parteien = [
  {
    id: 'fra', name: 'Frankreich', farbe: '#6f9fe0',
    fuehrung: 'Napoleon I.',
    staerke: '66.000 Mann, 139 Geschütze', zahl: 66000,
  },
  {
    id: 'koa', name: 'Russland und Österreich', farbe: '#d4737c',
    fuehrung: 'Kutusow, Zar Alexander I., Kaiser Franz II.',
    staerke: '85.000 Mann, 278 Geschütze', zahl: 85000,
  },
];

const gelaende = [
  { art: 'hoehe', name: 'Pratzener Höhen', punkte: linie(PRATZEN, 6.0, 3.0, 100) },
  { art: 'hoehe', name: 'Santon', punkte: klumpen(SANTON, 1.0) },
  { art: 'fluss', name: 'Goldbach', punkte: pfeil([16.7500, 49.0850], [16.7480, 49.1150], [16.7420, 49.1500], [16.7380, 49.1800]) },
  { art: 'see', name: 'Satschaner Teiche', punkte: klumpen([16.7700, 49.0790], 3.0, 1.6, 100) },
  { art: 'sumpf', name: 'Niederungen am Goldbach', punkte: linie([16.7530, 49.1000], 3.0, 1.0, 10) },
  { art: 'stadt', name: 'Telnitz', punkte: klumpen(TELNITZ, 0.7) },
  { art: 'stadt', name: 'Sokolnitz', punkte: klumpen(SOKOLNITZ, 0.7) },
  { art: 'stadt', name: 'Austerlitz', punkte: klumpen(AUSTERLITZ, 1.1) },
  { art: 'weg', name: 'Straße nach Brünn', punkte: pfeil([16.6100, 49.1950], [16.7000, 49.1750], [16.8000, 49.1600], [16.8700, 49.1560]) },
];

const s = (id, partei, form, gattung, punkte, mehr = {}) => ({ id, partei, form, gattung, punkte, ...mehr });

const stationen = [
  {
    zeit: 'November 1805',
    t: 0,
    kurz: 'Napoleon steht zu weit vorn – und weiß es.',
    text: 'Nach Ulm und der Einnahme Wiens ist die Grande Armée 1.000 Kilometer von Frankreich entfernt, ihre Verbindungen sind dünn, Preußen könnte jeden Tag in den Krieg eintreten. Napoleon braucht eine Entscheidung, und zwar bald. Also lädt er förmlich dazu ein: Er zieht sich zurück, bittet um Waffenstillstand und lässt seine Lage schlechter aussehen, als sie ist.',
    uebersicht: true,
    sicht: [[14.5, 47.6], [19.5, 50.4]],
    stellungen: [
      s('anm-fra', 'fra', 'pfeil', 'gemischt', pfeil([16.37, 48.21], [16.55, 48.75], [16.61, 49.19]), { name: 'von Wien nach Brünn' }),
      s('anm-koa', 'koa', 'pfeil', 'gemischt', pfeil([18.60, 49.85], [17.80, 49.60], [16.95, 49.20]), { name: 'Russen und Österreicher aus Olmütz' }),
    ],
  },
  {
    zeit: '1. Dezember',
    t: 180,
    kurz: 'Er räumt die Höhe, die alles beherrscht.',
    text: 'Napoleon besetzt die Pratzener Höhen und gibt sie wieder auf. Wer die Karte ansieht, versteht, was für ein Angebot das ist: Von dort überblickt man das ganze Feld. Gleichzeitig lässt er den rechten Flügel bei Telnitz auffällig dünn – dort, wo die Straße nach Wien läuft. Die Verbündeten sehen ein geschwächtes Heer, das den Rückweg schlecht deckt.',
    stellungen: [
      s('f-links', 'fra', 'flaeche', 'gemischt', linie([16.7350, 49.1600], 2.6, 0.9, 100), { name: 'Lannes am Santon', staerke: '17.000' }),
      s('f-mitte', 'fra', 'flaeche', 'fuss', linie([16.7330, 49.1330], 2.4, 0.9, 100), { name: 'Soult · hinter dem Goldbach', staerke: '24.000' }),
      s('f-rechts', 'fra', 'flaeche', 'fuss', linie([16.7450, 49.1000], 1.8, 0.6, 100), { name: 'Legrand · bewusst schwach', staerke: '10.000', finte: true }),
      s('k-hoehe', 'koa', 'flaeche', 'gemischt', linie(PRATZEN, 5.0, 1.6, 260), { name: 'Verbündete auf den Höhen', staerke: '85.000' }),
    ],
  },
  {
    zeit: '2. Dezember, 4 Uhr',
    t: 300,
    kurz: 'Die Verbündeten steigen vom Berg.',
    text: 'Der Plan der Verbündeten ist genau der, den Napoleon ihnen nahegelegt hat: mit drei Kolonnen über Telnitz und Sokolnitz nach Südwesten, dem Franzosen in den Rücken, ihm die Straße nach Wien nehmen. Dafür verlassen 40.000 Mann die Höhen. Kutusow ist dagegen und wird vom Zaren überstimmt.',
    stellungen: [
      s('k-kolonnen', 'koa', 'pfeil', 'gemischt', pfeil([16.7900, 49.1150], [16.7750, 49.1050], [16.7620, 49.0950]), { name: 'drei Kolonnen nach Südwesten' }),
      s('k-sued', 'koa', 'flaeche', 'gemischt', linie([16.7800, 49.1050], 3.0, 1.2, 240), { name: 'Buxhöwden · 40.000 vom Berg', staerke: '40.000' }),
      s('k-hoehe', 'koa', 'flaeche', 'gemischt', linie([16.7750, 49.1330], 3.4, 1.2, 260), { name: 'auf der Höhe verbleibend', staerke: '30.000' }),
      s('k-nord', 'koa', 'flaeche', 'reiter', linie([16.8000, 49.1600], 2.2, 0.8, 260), { name: 'Bagration im Norden', staerke: '15.000' }),
      s('f-rechts', 'fra', 'flaeche', 'fuss', linie([16.7450, 49.1000], 1.8, 0.6, 100), { name: 'Legrand', staerke: '10.000' }),
      s('f-mitte', 'fra', 'flaeche', 'fuss', linie([16.7330, 49.1330], 2.4, 0.9, 100), { name: 'Soult · wartet', staerke: '24.000' }),
      s('f-links', 'fra', 'flaeche', 'gemischt', linie([16.7350, 49.1600], 2.6, 0.9, 100), { name: 'Lannes', staerke: '17.000' }),
    ],
  },
  {
    zeit: '7 Uhr',
    t: 360,
    kurz: 'Telnitz und Sokolnitz – der Sog wirkt.',
    text: 'Im Süden beginnt der Kampf um die beiden Dörfer am Goldbach. Legrands schwache Truppe hält, weicht, hält wieder – lange genug, dass immer mehr verbündete Verbände nachgezogen werden. Genau das ist die Aufgabe dieses Flügels: nicht siegen, sondern binden. Davout trifft nach einem Nachtmarsch von 110 Kilometern ein und verstärkt ihn.',
    stellungen: [
      s('f-rechts', 'fra', 'flaeche', 'fuss', linie([16.7440, 49.0990], 2.0, 0.7, 100), { name: 'Legrand hält', staerke: '10.000' }),
      s('f-davout', 'fra', 'flaeche', 'fuss', linie([16.7320, 49.0960], 1.8, 0.6, 100), { name: 'Davout nach Nachtmarsch', staerke: '7.000' }),
      s('k-sued', 'koa', 'flaeche', 'gemischt', linie([16.7660, 49.1000], 3.2, 1.4, 250), { name: 'Buxhöwden bindet sich fest', staerke: '40.000' }),
      s('k-stoss', 'koa', 'pfeil', 'fuss', pfeil([16.7700, 49.0960], [16.7560, 49.0940], [16.7480, 49.0950]), {}),
      s('k-hoehe', 'koa', 'flaeche', 'gemischt', linie([16.7740, 49.1310], 3.0, 1.0, 260), { name: 'Höhe wird dünner', staerke: '22.000' }),
      s('f-mitte', 'fra', 'flaeche', 'fuss', linie([16.7330, 49.1330], 2.4, 0.9, 100), { name: 'Soult · wartet noch', staerke: '24.000' }),
    ],
  },
  {
    zeit: '9 Uhr',
    t: 420,
    kurz: '„Ein scharfer Schlag, und der Krieg ist zu Ende.“',
    text: 'Napoleon fragt Soult, wie lange er brauche, um auf die Höhen zu kommen. Zwanzig Minuten, sagt Soult. Dann warten wir noch eine Viertelstunde, sagt Napoleon. Als der Nebel im Tal reißt und die Sonne über den Höhen steht – die „Sonne von Austerlitz“ –, gehen zwei Divisionen den Hang hinauf, mitten in die Lücke, die die Verbündeten selbst gerissen haben.',
    stellungen: [
      s('f-mitte', 'fra', 'flaeche', 'fuss', linie([16.7480, 49.1330], 2.6, 0.9, 100), { name: 'Soult steigt auf', staerke: '24.000' }),
      s('f-stossM', 'fra', 'pfeil', 'fuss', pfeil([16.7420, 49.1320], [16.7600, 49.1300], [16.7720, 49.1290]), { name: 'in die Lücke' }),
      s('k-hoehe', 'koa', 'flaeche', 'gemischt', linie([16.7800, 49.1300], 2.6, 1.0, 260), { name: 'überrascht auf der Höhe', staerke: '20.000' }),
      s('k-sued', 'koa', 'flaeche', 'gemischt', linie([16.7660, 49.1000], 3.2, 1.4, 250), { name: 'im Süden gebunden', staerke: '40.000' }),
      s('f-rechts', 'fra', 'flaeche', 'fuss', linie([16.7420, 49.0990], 2.0, 0.7, 100), { name: 'Legrand und Davout', staerke: '16.000' }),
      s('f-links', 'fra', 'flaeche', 'gemischt', linie([16.7420, 49.1600], 2.6, 0.9, 100), { name: 'Lannes gegen Bagration', staerke: '17.000' }),
    ],
  },
  {
    zeit: '11 Uhr',
    t: 480,
    kurz: 'Die Höhe fällt – und mit ihr die Verbindung.',
    text: 'Kutusow wirft, was er hat, gegen den Hang und wird verwundet. Um elf Uhr steht Soult auf dem Pratzeberg. Damit ist das verbündete Heer in zwei Teile geschnitten: 40.000 Mann im Süden, 30.000 im Norden, und zwischen ihnen steht die französische Mitte auf der beherrschenden Höhe. Ab jetzt kämpfen zwei Armeen, die nichts voneinander wissen.',
    stellungen: [
      s('f-mitte', 'fra', 'flaeche', 'fuss', linie(PRATZEN, 3.4, 1.4, 180), { name: 'Soult auf dem Pratzeberg', staerke: '22.000' }),
      s('k-hoehe', 'koa', 'flaeche', 'gemischt', linie([16.8050, 49.1350], 2.0, 0.9, 260), { name: 'Kutusow verwundet, weicht', staerke: '14.000', geschlagen: true }),
      s('k-sued', 'koa', 'flaeche', 'gemischt', linie([16.7660, 49.1010], 3.2, 1.4, 250), { name: 'abgeschnitten', staerke: '38.000' }),
      s('k-nord', 'koa', 'flaeche', 'reiter', linie([16.8100, 49.1620], 2.2, 0.8, 260), { name: 'Bagration abgeschnitten', staerke: '14.000' }),
      s('f-links', 'fra', 'flaeche', 'gemischt', linie([16.7550, 49.1610], 2.6, 0.9, 100), { name: 'Lannes', staerke: '16.000' }),
    ],
  },
  {
    zeit: '13 Uhr',
    t: 540,
    kurz: 'Die Garde gegen die Garde.',
    text: 'Der Großfürst Konstantin führt die russische Garde gegen die Höhe und wirft ein französisches Bataillon; ein Adler geht verloren – einer der wenigen des ganzen Krieges. Napoleon schickt die Gardekavallerie. In einem kurzen, dichten Reitergefecht auf dem Kamm wird die russische Garde geworfen.',
    stellungen: [
      s('k-garde', 'koa', 'flaeche', 'reiter', linie([16.7950, 49.1330], 1.6, 0.7, 260), { name: 'Russische Garde · Konstantin', staerke: '8.500' }),
      s('f-garde', 'fra', 'flaeche', 'reiter', linie([16.7780, 49.1330], 1.6, 0.7, 100), { name: 'Gardekavallerie · Bessières', staerke: '5.500' }),
      s('f-gstoss', 'fra', 'pfeil', 'reiter', pfeil([16.7760, 49.1330], [16.7900, 49.1330]), {}),
      s('f-mitte', 'fra', 'flaeche', 'fuss', linie(PRATZEN, 3.4, 1.4, 180), { name: 'Soult hält die Höhe', staerke: '21.000' }),
      s('k-sued', 'koa', 'flaeche', 'gemischt', linie([16.7660, 49.1010], 3.2, 1.4, 250), { name: 'im Süden', staerke: '38.000' }),
    ],
  },
  {
    zeit: '14 Uhr',
    t: 600,
    kurz: 'Von der Höhe herunter, den Verbündeten in den Rücken.',
    text: 'Jetzt dreht Napoleon die Mitte nach Süden und lässt sie den Hang hinab. Die 38.000 Mann bei Telnitz und Sokolnitz haben immer noch Davout vor sich – und bekommen von hinten und von der Seite die französische Mitte. Sie versuchen, nach Osten auszuweichen, aber dort liegen die Teiche.',
    stellungen: [
      s('f-mitte', 'fra', 'pfeil', 'fuss', pfeil([16.7680, 49.1250], [16.7660, 49.1120], [16.7640, 49.1010]), { name: 'von der Höhe in den Rücken' }),
      s('f-abhang', 'fra', 'flaeche', 'fuss', linie([16.7700, 49.1150], 3.0, 1.0, 190), { name: 'Soult drückt nach Süden', staerke: '21.000' }),
      s('k-sued', 'koa', 'flaeche', 'gemischt', linie([16.7640, 49.1000], 3.0, 1.4, 250), { name: 'zwischen zwei Fronten', staerke: '36.000', geschlagen: true }),
      s('f-rechts', 'fra', 'flaeche', 'fuss', linie([16.7400, 49.0990], 2.0, 0.8, 100), { name: 'Davout hält den Riegel', staerke: '15.000' }),
    ],
  },
  {
    zeit: '16 Uhr',
    t: 660,
    kurz: 'Der Rückzug über die Teiche.',
    text: 'Wer nach Südosten ausweicht, kommt auf die zugefrorenen Satschaner Teiche. Französische Artillerie schießt auf das Eis. Die Bulletins machen daraus Tausende Ertrunkene; als die Teiche später abgelassen werden, findet man einige Dutzend Leichen und gut hundertfünfzig Pferde. Der Rückzug ist trotzdem eine Katastrophe – nur eine an Land.',
    stellungen: [
      s('k-flucht', 'koa', 'pfeil', 'gemischt', pfeil([16.7640, 49.0980], [16.7720, 49.0850], [16.7900, 49.0780]), { name: 'über die Teiche', rueckzug: true }),
      s('f-artillerie', 'fra', 'flaeche', 'geschuetz', linie([16.7550, 49.0900], 1.4, 0.5, 140), { name: 'Artillerie auf das Eis', staerke: 'Batterien' }),
      s('k-sued', 'koa', 'flaeche', 'gemischt', linie([16.7620, 49.0990], 2.4, 1.2, 250), { name: 'aufgerieben', staerke: '20.000', geschlagen: true }),
      s('f-abhang', 'fra', 'flaeche', 'fuss', linie([16.7700, 49.1080], 3.0, 1.0, 190), { name: 'Soult', staerke: '21.000' }),
    ],
  },
  {
    zeit: 'Nach der Schlacht',
    t: 780,
    kurz: 'Ein Reich hört auf zu bestehen.',
    text: 'Zwei Tage später bittet Kaiser Franz um Waffenstillstand; im Frieden von Pressburg verliert Österreich Venetien und Tirol. Der Rheinbund entsteht, und am 6. August 1806 legt Franz die römisch-deutsche Kaiserkrone nieder – das Heilige Römische Reich, 844 Jahre alt, hört auf zu bestehen. Für die Karte des Atlas ist Austerlitz damit eine der wenigen Schlachten, die eine ganze Fläche verschwinden lassen.',
    uebersicht: true,
    sicht: [[8.0, 44.5], [21.0, 51.5]],
    stellungen: [
      s('k-rueck', 'koa', 'pfeil', 'gemischt', pfeil([16.80, 49.13], [17.80, 49.50], [19.50, 50.00]), { name: 'Russen ziehen ab', rueckzug: true }),
      s('f-pressburg', 'fra', 'pfeil', 'gemischt', pfeil([16.77, 49.12], [16.50, 48.60], [17.11, 48.14]), { name: 'Friede von Pressburg' }),
      s('f-rheinbund', 'fra', 'pfeil', 'gemischt', pfeil([16.40, 48.60], [13.00, 48.60], [9.20, 48.80]), { name: 'Rheinbund 1806 – das Reich endet' }),
    ],
  },
];

export const austerlitz = {
  id: 'austerlitz',
  name: 'Austerlitz',
  ort: 'Pratzener Höhen bei Brünn',
  datum: '2. Dezember 1805',
  jahr: 1815,
  mitte: [16.7650, 49.1250],
  zoom: 12.0,
  grund: 'relief',
  worum: 'Die Schlacht, in der die entscheidende Bewegung darin besteht, eine Höhe freiwillig zu räumen. Napoleon gibt die beherrschende Stellung auf und lässt seinen rechten Flügel schwach aussehen – die Verbündeten schieben daraufhin die Hälfte ihres Heeres von der Höhe herunter, und die Mitte steht leer.',
  parteien,
  gelaende,
  stationen,
  ausgang: 'Das verbündete Heer wird in zwei Teile geschnitten und einzeln geschlagen. Österreich schließt zwei Tage später Waffenstillstand, die russische Armee zieht ab.',
  verluste: [
    { partei: 'koa', text: 'rund 16.000 Gefallene und Verwundete, 12.000 Gefangene, 180 Geschütze' },
    { partei: 'fra', text: 'rund 1.300 Gefallene, 7.000 Verwundete' },
  ],
  folgen: 'Im Frieden von Pressburg verliert Österreich Venetien und Tirol. 1806 entsteht der Rheinbund, und Franz II. legt die römisch-deutsche Kaiserkrone nieder: Das Heilige Römische Reich endet nach 844 Jahren.',
  streit: 'Die Zahl der auf dem Eis der Satschaner Teiche Ertrunkenen ist die bekannteste Übertreibung der napoleonischen Bulletins – von „20.000“ ist dort die Rede; bei der späteren Ablassung der Teiche fand man einige Dutzend Leichen. Umstritten ist auch, wie weit der Plan von Anfang an so angelegt war und wie viel davon Napoleon im Nachhinein zugeschrieben hat.',
};
