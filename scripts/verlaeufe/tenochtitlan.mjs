#!/usr/bin/env node
/*
 * ACHTUNG – Verhältnis zu src/data/battles/tenochtitlan.json: Dieses Skript
 * hat die JSON-Datei einmal erzeugt; danach ist die JSON-Datei die gültige
 * Fassung.
 */
/**
 * Die Belagerung von Tenochtitlan, Mai bis 13. August 1521.
 *
 * Eine Stadt auf einer Insel, mit dem Festland durch drei Dämme verbunden,
 * versorgt durch eine Wasserleitung und tausende Kanus. Die Belagerung ist
 * die Geschichte davon, wie diese vier Verbindungen nacheinander gekappt
 * werden – und das ist ausnahmsweise buchstäblich eine Kartenfrage: Man kann
 * jede einzelne einzeichnen und dann durchstreichen.
 *
 * Der Untergrund ist hier „blatt“ und nicht „relief“. Der See ist im
 * 17. bis 20. Jahrhundert trockengelegt worden; wo hier Wasser liegt, steht
 * heute Mexiko-Stadt. Eine Geländeschummerung nach heutigen Daten zeigte
 * genau die Landschaft, um die es nicht geht.
 *
 * Tenochtitlan lag bei 99.13 West, 19.43 Nord.
 */
import { linie, klumpen, pfeil } from '../lib/stellung.mjs';

const STADT = [-99.1350, 19.4350];
const TLATELOLCO = [-99.1370, 19.4520];
const TACUBA = [-99.1900, 19.4460];
const COYOACAN = [-99.1620, 19.3520];
const IZTAPALAPA = [-99.0900, 19.3560];

const parteien = [
  {
    id: 'spa', name: 'Spanien und seine Verbündeten', farbe: '#6f9fe0',
    fuehrung: 'Hernán Cortés, Pedro de Alvarado, Gonzalo de Sandoval, Cristóbal de Olid',
    staerke: 'rund 900 Spanier und 13 Brigantinen – dazu Zehntausende aus Tlaxcala, Texcoco und Huexotzinco',
    zahl: 100000,
  },
  {
    id: 'mex', name: 'Aztekischer Dreibund', farbe: '#d4737c',
    fuehrung: 'Cuauhtémoc, zuvor Cuitláhuac',
    staerke: 'eine Stadt von rund 200.000 Menschen; das Heer nicht zu beziffern, durch die Pocken geschwächt',
    zahl: 80000,
  },
];

const gelaende = [
  { art: 'see', name: 'Texcoco-See', punkte: klumpen([-99.0600, 19.4400], 20.0, 1.3, 10) },
  { art: 'stadt', name: 'Tenochtitlan', punkte: klumpen(STADT, 4.4, 1.3, 0) },
  { art: 'stadt', name: 'Tlatelolco', punkte: klumpen(TLATELOLCO, 1.8) },
  { art: 'weg', name: 'Damm nach Tlacopan', punkte: pfeil([-99.1580, 19.4430], [-99.1740, 19.4450], [-99.1900, 19.4460]) },
  { art: 'weg', name: 'Damm nach Tepeyac', punkte: pfeil([-99.1300, 19.4600], [-99.1200, 19.4720], [-99.1100, 19.4850]) },
  { art: 'weg', name: 'Damm nach Iztapalapa', punkte: pfeil([-99.1260, 19.4160], [-99.1160, 19.3820], [-99.1060, 19.3540]) },
  { art: 'weg', name: 'Die Wasserleitung von Chapultepec', punkte: pfeil([-99.1820, 19.4210], [-99.1600, 19.4270], [-99.1450, 19.4310]) },
];

const s = (id, partei, form, gattung, punkte, mehr = {}) => ({ id, partei, form, gattung, punkte, ...mehr });

const stationen = [
  {
    zeit: 'Sommer 1520 bis Frühjahr 1521',
    t: 0,
    kurz: 'Cortés ist geschlagen und baut sich eine Flotte.',
    text: 'In der Nacht auf den 1. Juli 1520 fliehen die Spanier über den Damm nach Tlacopan aus der Stadt und verlieren dabei mehr als die Hälfte ihrer Leute. Was Cortés rettet, ist Tlaxcala: eine Stadt, die seit Jahrzehnten gegen die Azteken kämpft und ihn aufnimmt. Dort lässt er dreizehn Schiffe bauen, in Einzelteilen, und über die Berge nach Texcoco tragen. Gleichzeitig läuft eine Pockenwelle durch das Hochtal und tötet unter anderem den neuen Herrscher Cuitláhuac.',
    uebersicht: true,
    sicht: [[-100.7, 18.1], [-96.1, 20.7]],
    stellungen: [
      s('anm-flucht', 'spa', 'pfeil', 'gemischt', pfeil([-99.135, 19.435], [-99.190, 19.446], [-99.400, 19.520], [-98.700, 19.400], [-98.237, 19.318]), { name: 'Die Nacht des 1. Juli 1520 und der Weg nach Tlaxcala' }),
      s('anm-holz', 'spa', 'pfeil', 'gemischt', pfeil([-98.237, 19.318], [-98.600, 19.420], [-98.880, 19.508]), { name: 'Dreizehn Schiffe in Einzelteilen über die Berge' }),
      s('anm-kueste', 'spa', 'pfeil', 'gemischt', pfeil([-96.400, 19.180], [-97.400, 19.250], [-98.237, 19.318]), { name: 'Nachschub von der Küste' }),
      s('anm-pocken', 'mex', 'pfeil', 'gemischt', pfeil([-96.700, 19.150], [-97.800, 19.280], [-98.900, 19.420], [-99.135, 19.435]), { name: 'Die Pocken ziehen ins Hochtal' }),
    ],
  },
  {
    zeit: '28. April 1521',
    t: 60,
    kurz: 'Dreizehn Brigantinen laufen auf dem See vom Stapel.',
    text: 'In Texcoco am Ostufer ist ein Kanal ausgehoben worden, um die zusammengesetzten Schiffe ins Wasser zu lassen. Es sind flache Segler mit Rudern und je einem Geschütz – gebaut nicht für das Meer, sondern für einen Salzsee von wenigen Metern Tiefe. Damit ändert sich die Grundlage des Krieges: Bisher war der See das, was die Stadt schützte.',
    stellungen: [
      s('s-brig', 'spa', 'flaeche', 'schiff', klumpen([-98.9300, 19.5000], 3.0, 1.2, 90), { name: 'Dreizehn Brigantinen', staerke: 'je ein Geschütz' }),
      s('s-texcoco', 'spa', 'flaeche', 'gemischt', klumpen([-98.8900, 19.5150], 3.2, 1.2, 90), { name: 'Das Lager in Texcoco', staerke: 'Spanier und Verbündete' }),
      s('m-stadt', 'mex', 'flaeche', 'gemischt', klumpen(STADT, 4.4, 1.3, 0), { name: 'Tenochtitlan', staerke: '200.000 Menschen' }),
      s('m-kanus', 'mex', 'flaeche', 'schiff', klumpen([-99.0800, 19.4400], 4.0, 1.3, 90), { name: 'Die Kanuflotte', staerke: 'tausende' }),
    ],
  },
  {
    zeit: '22. Mai',
    t: 130,
    kurz: 'Drei Lager an den drei Dämmen der Stadt.',
    text: 'Cortés teilt sein Heer in drei Teile und setzt jeden an das Festlandende eines Dammes: Alvarado nach Tlacopan im Westen, Olid nach Coyoacán im Süden, Sandoval nach Iztapalapa und später nach Tepeyac im Norden. Damit ist die Stadt zu Lande abgeschnitten, ohne dass ein Ring um sie herum nötig wäre – die Dämme sind der Ring.',
    stellungen: [
      s('s-alvarado', 'spa', 'flaeche', 'gemischt', klumpen(TACUBA, 2.4, 1.2, 90), { name: 'Alvarado in Tlacopan', staerke: 'Westdamm' }),
      s('s-olid', 'spa', 'flaeche', 'gemischt', klumpen(COYOACAN, 2.4, 1.2, 90), { name: 'Olid in Coyoacán', staerke: 'Süddamm' }),
      s('s-sandoval', 'spa', 'flaeche', 'gemischt', klumpen(IZTAPALAPA, 2.4, 1.2, 90), { name: 'Sandoval bei Iztapalapa', staerke: 'Ostdamm' }),
      s('s-brig', 'spa', 'flaeche', 'schiff', klumpen([-99.0400, 19.4300], 3.0, 1.2, 90), { name: 'Die Brigantinen auf dem See' }),
      s('m-stadt', 'mex', 'flaeche', 'gemischt', klumpen(STADT, 4.4, 1.3, 0), { name: 'Tenochtitlan', staerke: '200.000 Menschen' }),
    ],
  },
  {
    zeit: 'Ende Mai',
    t: 200,
    kurz: 'Die Wasserleitung wird bei Chapultepec zerschlagen.',
    text: 'Der See ist salzig; das Trinkwasser kommt in tönernen Rohren auf einem gemauerten Damm von den Quellen bei Chapultepec in die Stadt. Cortés schickt eine Abteilung dorthin und lässt die Leitung zerbrechen. Von diesem Tag an trinken zweihunderttausend Menschen Brackwasser und gegrabenes Sickerwasser. Es ist die stillste Maßnahme der Belagerung und wahrscheinlich die wirksamste.',
    stellungen: [
      s('s-leitung', 'spa', 'pfeil', 'gemischt', pfeil([-99.1900, 19.4430], [-99.1860, 19.4300], [-99.1820, 19.4212]), { name: 'Zur Wasserleitung' }),
      s('s-alvarado', 'spa', 'flaeche', 'gemischt', klumpen(TACUBA, 2.4, 1.2, 90), { name: 'Alvarado', staerke: 'Westdamm' }),
      s('m-stadt', 'mex', 'flaeche', 'gemischt', klumpen(STADT, 4.4, 1.3, 0), { name: 'ohne Süßwasser', staerke: '200.000 Menschen', geschlagen: true }),
      s('m-kanus', 'mex', 'flaeche', 'schiff', klumpen([-99.0900, 19.4380], 4.0, 1.3, 90), { name: 'Die Kanuflotte', staerke: 'tausende' }),
    ],
  },
  {
    zeit: '1. Juni',
    t: 260,
    kurz: 'Der See gehört den Brigantinen, nicht den Kanus.',
    text: 'Die Kanuflotte stellt sich den Schiffen entgegen, und bei auffrischendem Wind fahren die Brigantinen unter vollen Segeln mitten hinein. Ein Einbaum kann einem Kielboot mit Rammbug nichts entgegensetzen. Danach beherrschen dreizehn Schiffe eine Wasserfläche, auf der bis dahin die gesamte Versorgung der Stadt schwamm – und sie können außerdem an jeder Stelle beider Dammseiten Feuer geben.',
    stellungen: [
      s('s-brig', 'spa', 'flaeche', 'schiff', klumpen([-99.0900, 19.4350], 4.0, 1.4, 90), { name: 'Die Brigantinen greifen an' }),
      s('s-ramm', 'spa', 'pfeil', 'schiff', pfeil([-99.0700, 19.4340], [-99.0950, 19.4350], [-99.1150, 19.4360]), {}),
      s('m-kanus', 'mex', 'flaeche', 'schiff', klumpen([-99.1100, 19.4360], 3.4, 1.3, 90), { name: 'Die Kanuflotte zerbricht', staerke: 'tausende', geschlagen: true }),
      s('m-stadt', 'mex', 'flaeche', 'gemischt', klumpen(STADT, 4.4, 1.3, 0), { name: 'Tenochtitlan', staerke: '200.000 Menschen' }),
    ],
  },
  {
    zeit: 'Juni',
    t: 330,
    kurz: 'Tags vorrücken, nachts wird der Damm aufgerissen.',
    text: 'Der Kampf auf den Dämmen hat jeden Tag denselben Ablauf: Die Spanier und ihre Verbündeten schieben sich ein Stück vor, füllen die durchbrochenen Stellen mit Steinen und Schutt, und in der Nacht kommen die Verteidiger in Kanus und graben sie wieder auf. Ein Damm ist nur so lang wie das Stück, das man auch halten kann. Wochenlang gewinnt niemand mehr als ein paar hundert Meter.',
    stellungen: [
      s('s-vorW', 'spa', 'pfeil', 'gemischt', pfeil([-99.1880, 19.4458], [-99.1700, 19.4444], [-99.1560, 19.4430]), { name: 'Alvarado auf dem Westdamm' }),
      s('s-vorS', 'spa', 'pfeil', 'gemischt', pfeil([-99.1080, 19.3600], [-99.1180, 19.3900], [-99.1260, 19.4140]), { name: 'Olid und Cortés auf dem Süddamm' }),
      s('s-vorN', 'spa', 'pfeil', 'gemischt', pfeil([-99.1090, 19.4840], [-99.1210, 19.4700], [-99.1300, 19.4590]), { name: 'Sandoval auf dem Norddamm' }),
      s('m-daemme', 'mex', 'flaeche', 'gemischt', klumpen([-99.1350, 19.4380], 4.0, 1.3, 0), { name: 'reißt die Dämme nachts wieder auf', staerke: 'jede Nacht' }),
      s('s-brig', 'spa', 'flaeche', 'schiff', klumpen([-99.1000, 19.4200], 3.6, 1.4, 60), { name: 'Die Brigantinen decken die Flanken' }),
    ],
  },
  {
    zeit: '30. Juni',
    t: 400,
    kurz: 'Ein Angriff über eine Lücke, die nicht gefüllt war.',
    text: 'Cortés drängt auf einen schnellen Vorstoß bis zum großen Markt und lässt eine Bresche im Damm nur notdürftig zuschütten. Die Verteidiger geben Boden preis, lassen die Kolonne über die Stelle hinweg und schlagen dann von beiden Seiten aus Kanus zu. Beim Rückzug bricht alles an derselben Lücke zusammen. Cortés wird am Bein verwundet und weggezogen; über fünfzig Spanier werden lebend gefangen.',
    stellungen: [
      s('s-stoss', 'spa', 'pfeil', 'gemischt', pfeil([-99.1260, 19.4160], [-99.1320, 19.4290], [-99.1350, 19.4380]), { name: 'Vorstoß zum Markt', geschlagen: true }),
      s('m-gegen1', 'mex', 'pfeil', 'schiff', pfeil([-99.1150, 19.4300], [-99.1250, 19.4270], [-99.1310, 19.4250]), { name: 'aus Kanus von Osten' }),
      s('m-gegen2', 'mex', 'pfeil', 'schiff', pfeil([-99.1480, 19.4300], [-99.1400, 19.4270], [-99.1340, 19.4250]), { name: 'aus Kanus von Westen' }),
      s('s-rueck', 'spa', 'pfeil', 'gemischt', pfeil([-99.1330, 19.4330], [-99.1290, 19.4230], [-99.1250, 19.4130]), { name: 'Rückzug über die Bresche', rueckzug: true }),
      s('m-stadt', 'mex', 'flaeche', 'gemischt', klumpen(STADT, 4.4, 1.3, 0), { name: 'Tenochtitlan', staerke: '200.000 Menschen' }),
    ],
  },
  {
    zeit: 'Die Nächte danach',
    t: 450,
    kurz: 'Auf dem Tempel, sichtbar aus allen drei Lagern.',
    text: 'Die Gefangenen werden auf der Plattform des Haupttempels geopfert, in Sichtweite der Lager, mit Trommeln, die nachts über den See zu hören sind. Die Wirkung ist genau berechnet: Ein großer Teil der indigenen Verbündeten zieht in den folgenden Tagen ab, weil Wahrsager der Stadt den Untergang der Fremden in acht Tagen angekündigt haben. Als die acht Tage vergehen, kommen sie zurück.',
    stellungen: [
      s('m-tempel', 'mex', 'flaeche', 'gemischt', klumpen([-99.1320, 19.4350], 0.8), { name: 'Der Haupttempel' }),
      s('m-stadt', 'mex', 'flaeche', 'gemischt', klumpen(STADT, 4.4, 1.3, 0), { name: 'Tenochtitlan', staerke: '200.000 Menschen' }),
      s('s-abzug', 'spa', 'pfeil', 'gemischt', pfeil([-99.1800, 19.4460], [-99.3000, 19.4200], [-99.4200, 19.3900]), { name: 'Verbündete ziehen ab', rueckzug: true }),
      s('s-alvarado', 'spa', 'flaeche', 'gemischt', klumpen(TACUBA, 2.0, 1.2, 90), { name: 'Alvarado hält das Lager', staerke: 'Westdamm' }),
      s('s-olid', 'spa', 'flaeche', 'gemischt', klumpen(COYOACAN, 2.0, 1.2, 90), { name: 'Olid hält das Lager', staerke: 'Süddamm' }),
    ],
  },
  {
    zeit: 'Juli',
    t: 520,
    kurz: 'Was genommen ist, wird niedergerissen und verfüllt.',
    text: 'Cortés ändert das Verfahren: Kein Haus, das genommen wird, bleibt stehen. Zehntausende Verbündete reißen Mauern und Dächer ab und werfen den Schutt in die Kanäle. Was entsteht, ist keine eroberte Stadt, sondern eine planierte Fläche, über die Reiterei und Geschütze gehen können. Der Vormarsch wird dadurch langsam, aber er lässt sich nachts nicht mehr rückgängig machen.',
    stellungen: [
      s('m-stadt', 'mex', 'flaeche', 'gemischt', klumpen([-99.1360, 19.4430], 3.0, 1.3, 0), { name: 'Was noch steht', staerke: 'zusammengedrängt', geschlagen: true }),
      s('s-abriss', 'spa', 'flaeche', 'gemischt', klumpen([-99.1330, 19.4270], 2.6, 1.3, 0), { name: 'Abgetragen und verfüllt', staerke: 'Zehntausende' }),
      s('s-vorS', 'spa', 'pfeil', 'gemischt', pfeil([-99.1300, 19.4230], [-99.1340, 19.4320], [-99.1360, 19.4390]), { name: 'von Süden' }),
      s('s-vorW', 'spa', 'pfeil', 'gemischt', pfeil([-99.1560, 19.4430], [-99.1470, 19.4440], [-99.1410, 19.4450]), { name: 'von Westen' }),
      s('s-brig', 'spa', 'flaeche', 'schiff', klumpen([-99.1050, 19.4450], 3.4, 1.4, 60), { name: 'Die Brigantinen' }),
    ],
  },
  {
    zeit: '13. August',
    t: 600,
    kurz: 'Cuauhtémoc wird auf dem Wasser aus dem Kanu geholt.',
    text: 'Der letzte Widerstand steht in Tlatelolco, dem Marktviertel im Norden, auf einer Fläche von wenigen hundert Metern, zwischen Toten und ohne Wasser. Cuauhtémoc versucht am Nachmittag, mit einigen Booten über den See zu entkommen; eine Brigantine holt ihn ein. Er bittet, ihn mit dem Dolch zu töten. Damit endet die Belagerung nach dreiundneunzig Tagen.',
    stellungen: [
      s('m-stadt', 'mex', 'flaeche', 'gemischt', klumpen(TLATELOLCO, 1.4), { name: 'Der letzte Rest in Tlatelolco', staerke: 'wenige hundert Meter', geschlagen: true }),
      s('m-flucht', 'mex', 'pfeil', 'schiff', pfeil([-99.1350, 19.4560], [-99.1200, 19.4620], [-99.1050, 19.4650]), { name: 'Cuauhtémoc im Kanu', rueckzug: true }),
      s('s-brig', 'spa', 'pfeil', 'schiff', pfeil([-99.0800, 19.4750], [-99.0950, 19.4690], [-99.1080, 19.4655]), { name: 'Eine Brigantine holt ihn ein' }),
      s('s-abriss', 'spa', 'flaeche', 'gemischt', klumpen([-99.1350, 19.4330], 4.0, 1.3, 0), { name: 'Die abgetragene Stadt', staerke: 'planiert' }),
    ],
  },
  {
    zeit: 'Nach dem 13. August',
    t: 700,
    kurz: 'Auf den Trümmern entsteht Mexiko-Stadt.',
    text: 'Cortés lässt an derselben Stelle bauen: Die Kathedrale steht neben dem Fundament des Haupttempels, der Regierungspalast auf dem des Herrscherhauses. Cuauhtémoc wird gefoltert, damit er sagt, wo das Gold sei, vier Jahre mitgeführt und 1525 auf einem Zug nach Honduras gehängt. Die Eroberung des restlichen Mesoamerika dauert Jahrzehnte; was sie möglich macht, sind zu großen Teilen die Seuchen, die vor den Heeren herlaufen.',
    uebersicht: true,
    sicht: [[-106.5, 12.5], [-86.5, 24.5]],
    stellungen: [
      s('s-neuspanien', 'spa', 'pfeil', 'gemischt', pfeil([-99.13, 19.43], [-101.20, 19.70], [-103.35, 20.67], [-104.30, 21.50]), { name: 'Nach Westen bis zur Pazifikküste' }),
      s('s-sueden', 'spa', 'pfeil', 'gemischt', pfeil([-99.13, 19.43], [-96.72, 17.07], [-92.90, 15.60], [-90.51, 14.64], [-87.20, 14.10]), { name: 'Nach Süden bis Guatemala und Honduras' }),
      s('s-silber', 'spa', 'pfeil', 'gemischt', pfeil([-99.13, 19.43], [-97.10, 19.20], [-96.13, 19.19]), { name: 'Das Silber geht über Veracruz nach Spanien' }),
      s('m-seuchen', 'mex', 'pfeil', 'gemischt', pfeil([-99.13, 19.43], [-97.50, 17.60], [-94.50, 16.40], [-91.50, 15.50]), { name: 'Die Seuchen laufen den Heeren voraus' }),
    ],
  },
];

export const tenochtitlan = {
  id: 'tenochtitlan',
  name: 'Die Belagerung von Tenochtitlan',
  ort: 'Hochtal von Mexiko',
  datum: '22. Mai bis 13. August 1521',
  jahr: 1521,
  mitte: [-99.1350, 19.4350],
  zoom: 10.6,
  grund: 'blatt',
  worum: 'Eine Stadt auf einer Insel, verbunden mit dem Festland durch drei Dämme, versorgt durch eine Wasserleitung und tausende Kanus. Die Belagerung besteht darin, diese vier Verbindungen nacheinander zu kappen – und jede davon lässt sich einzeichnen und dann durchstreichen. Dreiundneunzig Tage später ist eine der größten Städte der Welt eine planierte Fläche.',
  parteien,
  gelaende,
  stationen,
  ausgang: 'Tlatelolco fällt am 13. August 1521; Cuauhtémoc wird auf dem See gefangen. Die Stadt ist zu großen Teilen abgetragen.',
  verluste: [
    { partei: 'mex', text: 'Schätzungen zwischen 100.000 und 240.000 Toten, die meisten durch Hunger, Durst und Seuchen' },
    { partei: 'spa', text: 'einige hundert Spanier, darunter über fünfzig gefangen und geopfert; unter den Verbündeten Zehntausende' },
  ],
  folgen: 'Auf den Trümmern wird Mexiko-Stadt gebaut, die Hauptstadt Neuspaniens: Kathedrale neben dem Fundament des Haupttempels, Palast auf dem Herrscherhaus. Cuauhtémoc wird gefoltert und 1525 gehängt. Tlaxcala, ohne dessen Zehntausende die Belagerung nicht möglich gewesen wäre, erhält Sonderrechte und verliert sie im Lauf der Kolonialzeit wieder. Der eigentliche Vorgang der nächsten hundert Jahre sind die Seuchen: Die indigene Bevölkerung Mesoamerikas geht auf ein Zehntel zurück.',
  streit: 'Die Zahl der Verbündeten schwankt zwischen 80.000 und 200.000 – die Kolonialberichte hatten Gründe, sie klein zu halten, und Tlaxcala Gründe, sie groß zu machen. Die spanische Überlieferung stammt von Cortés selbst und von Bernal Díaz, die indigene aus den nach 1550 aufgezeichneten Berichten des Codex Florentinus; sie widersprechen einander an vielen Stellen. Der genaue Verlauf der Dämme und der Uferlinie ist rekonstruiert – der See ist längst trockengelegt, und die Stadt darüber sinkt bis heute in den alten Seegrund ein.',
};
