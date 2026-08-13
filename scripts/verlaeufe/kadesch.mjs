#!/usr/bin/env node
/*
 * ACHTUNG – Verhältnis zu src/data/battles/kadesch.json: Dieses Skript hat die
 * JSON-Datei einmal erzeugt; danach ist die JSON-Datei die gültige Fassung.
 */
/**
 * Kadesch, um 1274 v. Chr.
 *
 * Die früheste Schlacht, deren Verlauf sich überhaupt nachzeichnen lässt –
 * dreitausend Jahre vor allem anderen in dieser Sammlung. Möglich ist das,
 * weil beide Seiten geschrieben haben: Ramses in Stein an fünf Tempelwänden,
 * die Hethiter in Ton im Archiv von Hattusa. Beide erklären sich zum Sieger.
 *
 * Was man daraus rekonstruieren kann, ist eine Falle, die aus einer
 * Ortsangabe besteht: Eine Stadt am Fluss, dahinter ein verstecktes Heer, und
 * ein ägyptischer König, der zwei Beduinen glaubt und mit einem Viertel seiner
 * Truppe vorausfährt, während die anderen drei Viertel über zwanzig Kilometer
 * hinter ihm die Straße heraufmarschieren.
 *
 * Kadesch – Tell Nebi Mend – liegt bei 36.52 Ost, 34.56 Nord.
 */
import { linie, klumpen, pfeil } from '../lib/stellung.mjs';

const STADT = [36.5210, 34.5570];
const LAGER = [36.4930, 34.5880];
const FURT = [36.5060, 34.4750];

const parteien = [
  {
    id: 'aeg', name: 'Ägypten', farbe: '#6f9fe0',
    fuehrung: 'Ramses II.',
    staerke: 'vier Divisionen – Amun, Re, Ptah und Seth –, zusammen rund 20.000 Mann und 2.000 Streitwagen',
    zahl: 20000,
  },
  {
    id: 'het', name: 'Hethiterreich', farbe: '#d4737c',
    fuehrung: 'Muwatalli II., Hattusili',
    staerke: 'rund 40.000 mit den Verbündeten aus Anatolien und Nordsyrien; 3.500 Streitwagen, zu dritt besetzt',
    zahl: 40000,
  },
];

const gelaende = [
  { art: 'stadt', name: 'Kadesch', punkte: klumpen(STADT, 1.4, 1.2, 20) },
  { art: 'fluss', name: 'Orontes', punkte: pfeil([36.4880, 34.4600], [36.4980, 34.5200], [36.5040, 34.5700], [36.5100, 34.6300]) },
  { art: 'fluss', name: 'Der östliche Arm', punkte: pfeil([36.5320, 34.5050], [36.5420, 34.5500], [36.5300, 34.5950]) },
  { art: 'furt', name: 'Die Furt bei Schabtuna', punkte: klumpen(FURT, 1.0) },
  { art: 'wald', name: 'Der Wald von Labwi', punkte: klumpen([36.4600, 34.4900], 3.0, 1.6, 20) },
  { art: 'weg', name: 'Die Straße von Süden', punkte: pfeil([36.5000, 34.4300], [36.5040, 34.4900], [36.4980, 34.5400], [36.4940, 34.5800]) },
];

const s = (id, partei, form, gattung, punkte, mehr = {}) => ({ id, partei, form, gattung, punkte, ...mehr });

const stationen = [
  {
    zeit: 'Frühjahr 1274 v. Chr.',
    t: 0,
    kurz: 'Zwei Reiche streiten um dieselbe Straße.',
    text: 'Zwischen dem ägyptischen und dem hethitischen Machtbereich liegt Syrien, und in Syrien liegt die Straße, über die aller Handel zwischen Ägypten, Mesopotamien und Anatolien läuft. Kadesch ist der Riegel darauf. Ramses zieht im vierten Jahr seiner Regierung mit vier Divisionen von Piramesse nordwärts; Muwatalli bringt das größte Heer zusammen, das ein hethitischer König je geführt hat.',
    uebersicht: true,
    sicht: [[28.0, 28.0], [43.5, 41.8]],
    stellungen: [
      s('anm-aeg', 'aeg', 'pfeil', 'gemischt', pfeil([31.83, 30.80], [34.47, 31.50], [35.30, 32.80], [35.85, 33.90], [36.50, 34.52]), { name: 'Ramses von Piramesse nach Norden' }),
      s('anm-het', 'het', 'pfeil', 'gemischt', pfeil([34.62, 40.02], [36.20, 38.40], [37.16, 36.20], [36.70, 35.10], [36.55, 34.60]), { name: 'Muwatalli von Hattusa über Aleppo' }),
      s('anm-nearin', 'aeg', 'pfeil', 'gemischt', pfeil([35.51, 33.90], [35.85, 34.35], [36.35, 34.62]), { name: 'Die Ne’arin von der Küste' }),
    ],
  },
  {
    zeit: 'Ein Tagesmarsch vor der Stadt',
    t: 60,
    kurz: 'Zwei Beduinen sagen, der Feind sei weit im Norden.',
    text: 'Am Wald von Labwi greifen ägyptische Späher zwei Männer vom Stamm der Schasu auf. Sie erzählen, ihre Sippen wollten zu Ramses überlaufen, und nebenbei, das hethitische Heer stehe weit im Norden bei Aleppo, aus Angst vor dem Pharao. Es ist eine gestellte Aussage, und sie wirkt: Ramses beschließt, mit der Vorhut vorauszufahren und die Stadt zu nehmen, bevor der Gegner überhaupt da ist.',
    stellungen: [
      s('a-amun', 'aeg', 'flaeche', 'gemischt', linie([36.4980, 34.5000], 2.2, 1.0, 0), { name: 'Division Amun mit dem König', staerke: 'rund 5.000' }),
      s('a-re', 'aeg', 'flaeche', 'gemischt', linie([36.5020, 34.4500], 2.2, 1.0, 0), { name: 'Division Re, ein Stück dahinter', staerke: 'rund 5.000' }),
      s('h-versteck', 'het', 'flaeche', 'gemischt', klumpen([36.5700, 34.5450], 3.4, 1.3, 20), { name: 'Muwatalli hinter der Stadt', staerke: 'rund 40.000' }),
      s('h-schasu', 'het', 'pfeil', 'fuss', pfeil([36.5300, 34.5300], [36.5100, 34.5050], [36.4990, 34.4980]), { name: 'Die beiden Schasu' }),
    ],
  },
  {
    zeit: 'Mittag',
    t: 130,
    kurz: 'Ramses lagert, drei Divisionen sind noch unterwegs.',
    text: 'Ramses überschreitet die Furt und schlägt nordwestlich der Stadt ein Lager auf, umstellt mit Schilden. Bei ihm ist nur die Division Amun. Re marschiert noch heran, Ptah steht am Fluss weiter südlich, Seth ist einen ganzen Tagesmarsch entfernt. Das Heer ist damit über zwanzig Kilometer verteilt, und die einzige Truppe, die kämpfen könnte, ist die kleinste.',
    stellungen: [
      s('a-lager', 'aeg', 'flaeche', 'gemischt', klumpen(LAGER, 1.8, 1.2, 20), { name: 'Das Lager des Königs', staerke: 'Division Amun' }),
      s('a-re', 'aeg', 'flaeche', 'gemischt', linie([36.5040, 34.4980], 2.4, 0.9, 0), { name: 'Division Re auf dem Marsch', staerke: 'rund 5.000' }),
      s('a-ptah', 'aeg', 'flaeche', 'gemischt', linie([36.5020, 34.4350], 2.4, 0.9, 0), { name: 'Division Ptah, weit zurück', staerke: 'rund 5.000' }),
      s('h-versteck', 'het', 'flaeche', 'gemischt', klumpen([36.5700, 34.5450], 3.4, 1.3, 20), { name: 'unsichtbar hinter der Stadt', staerke: 'rund 40.000' }),
    ],
  },
  {
    zeit: 'Kurz darauf',
    t: 190,
    kurz: 'Zwei gefangene Späher sagen die Wahrheit.',
    text: 'Ägyptische Posten greifen zwei hethitische Kundschafter auf. Unter Schlägen sagen sie, was die Schasu verschwiegen hatten: Das ganze hethitische Heer steht keine drei Kilometer entfernt, unmittelbar hinter Kadesch. Ramses lässt sofort Boten zu den nachrückenden Divisionen jagen. Für Re kommt der Bote zu spät.',
    stellungen: [
      s('a-lager', 'aeg', 'flaeche', 'gemischt', klumpen(LAGER, 1.8, 1.2, 20), { name: 'Das Lager erfährt es', staerke: 'Division Amun' }),
      s('a-bote', 'aeg', 'pfeil', 'reiter', pfeil([36.4930, 34.5750], [36.4990, 34.5300], [36.5040, 34.5000]), { name: 'Boten nach Süden' }),
      s('h-versteck', 'het', 'flaeche', 'gemischt', klumpen([36.5680, 34.5420], 3.4, 1.3, 20), { name: 'Das hethitische Heer', staerke: 'rund 40.000' }),
      s('a-re', 'aeg', 'flaeche', 'gemischt', linie([36.5040, 34.5120], 2.4, 0.9, 0), { name: 'Division Re, noch ahnungslos', staerke: 'rund 5.000' }),
    ],
  },
  {
    zeit: 'Der Stoß',
    t: 250,
    kurz: 'Die Wagen kommen von Süden in eine Marschsäule.',
    text: 'Zweitausendfünfhundert hethitische Streitwagen gehen südlich der Stadt über den Fluss und fallen der Division Re quer in die Flanke – nicht in eine Schlachtordnung, sondern in eine Kolonne im Marsch, ohne Front und ohne Bogenschützen in Stellung. Re zerfällt in wenigen Minuten. Was davon wegkommt, läuft nach Norden, geradewegs auf das Lager des Königs zu, und nimmt die Verfolger mit.',
    stellungen: [
      s('h-wagen', 'het', 'pfeil', 'reiter', pfeil([36.5450, 34.5150], [36.5250, 34.5100], [36.5080, 34.5100]), { name: '2.500 Streitwagen in die Flanke' }),
      s('a-re', 'aeg', 'flaeche', 'gemischt', linie([36.5020, 34.5120], 2.2, 0.9, 0), { name: 'Division Re zerfällt', staerke: 'rund 5.000', geschlagen: true }),
      s('a-flucht', 'aeg', 'pfeil', 'gemischt', pfeil([36.5000, 34.5220], [36.4960, 34.5550], [36.4930, 34.5790]), { name: 'Flucht ins Lager', rueckzug: true }),
      s('a-lager', 'aeg', 'flaeche', 'gemischt', klumpen(LAGER, 1.8, 1.2, 20), { name: 'Das Lager', staerke: 'Division Amun' }),
    ],
  },
  {
    zeit: 'Im Lager',
    t: 310,
    kurz: 'Das Lager wird überrannt, bevor jemand steht.',
    text: 'Die Fliehenden reißen die Schildwand ein, die Wagen sind hinter ihnen. Ein großer Teil der Division Amun läuft davon, ohne die Waffen anzulegen. Die Inschrift sagt: „Da war kein Offizier bei mir, kein Wagenlenker, kein Soldat.“ Was den Ägyptern in diesem Augenblick hilft, ist nichts Militärisches: Die hethitischen Wagenkämpfer halten an und beginnen zu plündern.',
    stellungen: [
      s('h-wagen', 'het', 'flaeche', 'reiter', klumpen([36.4960, 34.5820], 2.4, 1.2, 20), { name: 'Streitwagen im Lager', staerke: '2.500', finte: true }),
      s('a-lager', 'aeg', 'flaeche', 'gemischt', klumpen([36.4900, 34.5950], 1.4, 1.2, 20), { name: 'Was vom Lager übrig ist', staerke: 'Reste', geschlagen: true }),
      s('a-flucht', 'aeg', 'pfeil', 'gemischt', pfeil([36.4930, 34.5900], [36.4780, 34.6100], [36.4600, 34.6300]), { name: 'Auseinanderlaufen nach Norden', rueckzug: true }),
      s('h-versteck', 'het', 'flaeche', 'gemischt', klumpen([36.5620, 34.5420], 3.2, 1.3, 20), { name: 'Das Fußvolk bleibt stehen', staerke: 'rund 37.000' }),
    ],
  },
  {
    zeit: 'Der König selbst',
    t: 370,
    kurz: 'Ramses fährt selbst, sagt die Inschrift, ganz allein.',
    text: 'Nach eigener Darstellung besteigt Ramses seinen Wagen, ruft Amun an und fährt sechsmal in die Feinde hinein, ohne Begleitung außer seinem Wagenlenker Menna und zwei Pferden mit Namen. Das ist Königsdichtung. Der militärisch nachvollziehbare Kern ist trotzdem da: Ein Gegenstoß aus dem Lager nach Osten drückt die plündernden Wagen zum Fluss hin, weil sie in Unordnung und abgesessen sind.',
    stellungen: [
      s('a-ramses', 'aeg', 'pfeil', 'reiter', pfeil([36.4900, 34.5900], [36.5050, 34.5820], [36.5180, 34.5760]), { name: 'Der Gegenstoß des Königs' }),
      s('a-lager', 'aeg', 'flaeche', 'gemischt', klumpen([36.4890, 34.5940], 1.4, 1.2, 20), { name: 'Was noch steht', staerke: 'Leibwache', geschlagen: true }),
      s('h-wagen', 'het', 'flaeche', 'reiter', klumpen([36.5080, 34.5800], 2.4, 1.2, 20), { name: 'beim Plündern überrascht', staerke: '2.500', geschlagen: true }),
      s('h-versteck', 'het', 'flaeche', 'gemischt', klumpen([36.5620, 34.5420], 3.2, 1.3, 20), { name: 'Muwatalli hält das Fußvolk zurück', staerke: 'rund 37.000' }),
    ],
  },
  {
    zeit: 'Aus dem Nordwesten',
    t: 430,
    kurz: 'Es kommt, wer an diesem Tag nicht erwartet wurde.',
    text: 'In diesem Augenblick trifft eine ägyptische Abteilung ein, die nicht auf der Straße marschiert war, sondern von der Küste her über Amurru: die Ne’arin, junge Elitetruppen. Sie erscheinen nordwestlich des Lagers, also genau im Rücken der Wagen, die dort plündern. Warum sie ausgerechnet jetzt kommen, sagt keine Quelle; die Inschrift lässt es aussehen wie eine Fügung.',
    stellungen: [
      s('a-nearin', 'aeg', 'pfeil', 'gemischt', pfeil([36.4400, 34.6300], [36.4650, 34.6050], [36.4880, 34.5900]), { name: 'Die Ne’arin treffen ein' }),
      s('a-ramses', 'aeg', 'pfeil', 'reiter', pfeil([36.4950, 34.5860], [36.5100, 34.5800], [36.5220, 34.5740]), { name: 'Gegenstoß des Königs' }),
      s('h-wagen', 'het', 'flaeche', 'reiter', klumpen([36.5150, 34.5760], 2.2, 1.2, 20), { name: 'zwischen zwei Seiten', staerke: '2.500', geschlagen: true }),
      s('a-lager', 'aeg', 'flaeche', 'gemischt', klumpen([36.4900, 34.5940], 1.4, 1.2, 20), { name: 'Das Lager hält', staerke: 'Leibwache' }),
    ],
  },
  {
    zeit: 'Gegen Abend',
    t: 490,
    kurz: 'Wer nicht wegkommt, wird in den Orontes gedrückt.',
    text: 'Die hethitischen Wagen werden gegen den Fluss geschoben. Muwatalli schickt tausend weitere hinterher, hält aber sein Fußvolk am Ostufer zurück – warum, ist der große offene Punkt der Schlacht. Die Inschrift schildert genüsslich, wie hohe Herren aus dem Wasser gezogen werden, den Fürsten von Aleppo kopfüber, damit ihm das Wasser aus dem Leib läuft. Am Abend trifft die Division Ptah ein.',
    stellungen: [
      s('h-wagen', 'het', 'flaeche', 'reiter', klumpen([36.5260, 34.5720], 2.0, 1.2, 20), { name: 'gegen den Fluss gedrückt', staerke: 'Reste', geschlagen: true }),
      s('a-druck', 'aeg', 'pfeil', 'gemischt', pfeil([36.4980, 34.5820], [36.5150, 34.5760], [36.5300, 34.5700]), { name: 'Von Westen nachgedrückt' }),
      s('a-ptah', 'aeg', 'flaeche', 'gemischt', linie([36.5000, 34.5350], 2.4, 1.0, 0), { name: 'Division Ptah trifft ein', staerke: 'rund 5.000' }),
      s('h-versteck', 'het', 'flaeche', 'gemischt', klumpen([36.5640, 34.5400], 3.2, 1.3, 20), { name: 'Das Fußvolk greift nicht ein', staerke: 'rund 37.000' }),
    ],
  },
  {
    zeit: 'Am nächsten Tag',
    t: 560,
    kurz: 'Zweiter Tag, dann bietet Muwatalli Waffenstillstand.',
    text: 'Am folgenden Tag wird noch einmal gekämpft, ohne Entscheidung. Dann schlägt Muwatalli einen Waffenstillstand vor, und Ramses nimmt an – was er in seiner eigenen Inschrift als Großmut darstellt. Beide Heere ziehen ab. Kadesch bleibt hethitisch, und die Grenze verschiebt sich sogar nach Süden: Ägypten verliert danach das Fürstentum Amurru.',
    stellungen: [
      s('a-heer', 'aeg', 'flaeche', 'gemischt', linie([36.4950, 34.5650], 3.0, 1.4, 90), { name: 'Ägypten zieht ab', staerke: 'was übrig ist' }),
      s('h-versteck', 'het', 'flaeche', 'gemischt', klumpen([36.5600, 34.5450], 3.2, 1.3, 20), { name: 'Das hethitische Heer bleibt', staerke: 'rund 37.000' }),
      s('a-abzug', 'aeg', 'pfeil', 'gemischt', pfeil([36.4950, 34.5500], [36.5000, 34.4900], [36.5000, 34.4300]), { name: 'Rückmarsch nach Süden', rueckzug: true }),
    ],
  },
  {
    zeit: 'Nach 1274 v. Chr.',
    t: 640,
    kurz: 'Der älteste Friedensvertrag, den wir im Wortlaut haben.',
    text: 'Ramses lässt die Schlacht an fünf Tempeln in Bild und Text als vollständigen Sieg anbringen, in einer Ausführlichkeit, die ohne Beispiel ist – und dadurch überhaupt erst rekonstruierbar macht, wie knapp es war. Sechzehn Jahre später schließen beide Reiche einen Vertrag über Frieden, Bündnis und Auslieferung von Flüchtlingen: in Hieroglyphen in Karnak, in Keilschrift in Hattusa. Eine Kopie hängt heute im Sitzungsgebäude der Vereinten Nationen.',
    uebersicht: true,
    sicht: [[26.5, 25.5], [45.5, 42.5]],
    stellungen: [
      s('h-grenze', 'het', 'pfeil', 'gemischt', pfeil([36.52, 34.56], [36.10, 34.20], [35.85, 33.90]), { name: 'Die Grenze bleibt südlich von Kadesch' }),
      s('a-tempel', 'aeg', 'pfeil', 'gemischt', pfeil([36.52, 34.56], [34.20, 31.50], [32.60, 29.00], [32.66, 25.72]), { name: 'Die Fassung in Stein, von Karnak bis Abu Simbel' }),
      s('h-vertrag', 'het', 'pfeil', 'gemischt', pfeil([34.62, 40.02], [35.50, 37.00], [35.30, 33.00], [32.66, 25.72]), { name: '1259 v. Chr.: der Vertrag, in zwei Sprachen' }),
    ],
  },
];

export const kadesch = {
  id: 'kadesch',
  name: 'Kadesch',
  ort: 'Tell Nebi Mend am Orontes',
  datum: 'um 1274 v. Chr.',
  jahr: -1274,
  mitte: [36.5150, 34.5500],
  zoom: 11.4,
  grund: 'relief',
  worum: 'Eine Falle, die aus einer Ortsangabe besteht: Zwei bestellte Überläufer sagen, der Feind stehe zweihundert Kilometer weiter nördlich. Ramses fährt daraufhin mit einem Viertel seines Heeres voraus und lagert vor einer Stadt, hinter der vierzigtausend Mann warten – während die anderen drei Viertel über zwanzig Kilometer verteilt die Straße heraufmarschieren.',
  parteien,
  gelaende,
  stationen,
  ausgang: 'Der ägyptische Gegenstoß rettet das Lager; nach einem zweiten Tag ohne Entscheidung wird ein Waffenstillstand geschlossen. Kadesch bleibt hethitisch.',
  verluste: [
    { partei: 'aeg', text: 'die Division Re als Verband zerschlagen; Zahlen nennt keine Quelle' },
    { partei: 'het', text: 'schwere Verluste unter den Streitwagen und im Gefolge Muwatallis, darunter sein Bruder' },
  ],
  folgen: 'Ägypten kann Kadesch nicht halten; die Grenze bleibt südlich davon, und das Fürstentum Amurru geht verloren. Beide Reiche kämpfen noch anderthalb Jahrzehnte weiter und schließen 1259 v. Chr. einen Vertrag über Frieden und Bündnis, der in ägyptischer und in hethitischer Fassung erhalten ist – der älteste Staatsvertrag, dessen Wortlaut vorliegt. Achtzig Jahre später gibt es das Hethiterreich nicht mehr.',
  streit: 'Alles hängt an zwei Parteien, die beide gesiegt haben wollen: Ramses’ Tempelinschriften und der hethitische Schriftverkehr. Warum Muwatalli sein Fußvolk am Ostufer zurückhielt, ist unerklärt und die entscheidende Lücke. Die Truppenzahlen sind Schätzungen aus der Zahl der Streitwagen; das Jahr schwankt je nach Chronologie zwischen 1274 und 1285 v. Chr. Selbst der Verlauf der Flussarme um die Stadt ist rekonstruiert.',
};
