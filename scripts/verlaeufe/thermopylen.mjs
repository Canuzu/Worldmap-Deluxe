#!/usr/bin/env node
/*
 * ACHTUNG – Verhältnis zu src/data/battles/thermopylen.json: Dieses Skript hat
 * die JSON-Datei einmal erzeugt; danach ist die JSON-Datei die gültige Fassung.
 */
/**
 * Thermopylen, August 480 v. Chr.
 *
 * Der Untergrund ist hier „blatt“ und nicht „relief“, und das ist bei dieser
 * Schlacht keine Kleinigkeit: Der Spercheios hat die Bucht in zweieinhalb
 * Jahrtausenden zugeschüttet. Wo 480 v. Chr. das Meer bis an den Berghang
 * reichte und den Weg auf wenige Meter verengte, liegt heute eine
 * Schwemmebene von fünf Kilometern Breite. Eine Höhenschummerung nach
 * heutigen Daten zeigte genau die Landschaft, in der die Schlacht keinen
 * Sinn ergibt.
 *
 * Deshalb ist die Küste von damals hier als Geländezug eingetragen und nicht
 * der Karte überlassen. Ohne sie ist nicht zu sehen, worum es geht: Eine
 * Frontbreite von hundert Metern nimmt der Überzahl ihren einzigen Vorteil.
 *
 * Das Mittlere Tor liegt bei 22.54 Ost, 38.80 Nord.
 */
import { linie, klumpen, pfeil } from '../lib/stellung.mjs';

const TOR = [22.5350, 38.7962];
const LAGER_PER = [22.4750, 38.8080];
const KOLONOS = [22.5390, 38.7955];

const parteien = [
  {
    id: 'gr', name: 'Griechischer Bund', farbe: '#6f9fe0',
    fuehrung: 'Leonidas I. von Sparta, Demophilos von Thespiai',
    staerke: 'rund 7.000 aus einem Dutzend Städten, darunter 300 Spartiaten mit ihrem Gefolge',
    zahl: 7000,
  },
  {
    id: 'per', name: 'Perserreich', farbe: '#d4737c',
    fuehrung: 'Xerxes I., Hydarnes, Mardonios',
    staerke: 'nach Herodot Millionen, nach heutiger Schätzung 70.000 bis 300.000 – dazu die Flotte',
    zahl: 150000,
  },
];

const gelaende = [
  { art: 'hoehe', name: 'Kallidromos', punkte: klumpen([22.5450, 38.7680], 5.0, 3.0, 90) },
  { art: 'see', name: 'Der Malische Golf · Küste von 480 v. Chr.', punkte: klumpen([22.5250, 38.8280], 5.0, 4.0, 90) },
  { art: 'weg', name: 'Der Engpass · an der engsten Stelle ein Wagen breit', punkte: linie(TOR, 7.0, 0.22, 0) },
  { art: 'mauer', name: 'Die phokische Mauer', punkte: linie([22.5335, 38.7962], 0.45, 0.05, 90) },
  { art: 'weg', name: 'Der Anopaia-Pfad über den Berg', punkte: pfeil([22.4720, 38.8120], [22.5000, 38.7800], [22.5400, 38.7640], [22.5760, 38.7820], [22.5870, 38.7960]) },
  { art: 'sumpf', name: 'Die heißen Quellen', punkte: klumpen([22.5305, 38.7978], 0.35) },
];

const s = (id, partei, form, gattung, punkte, mehr = {}) => ({ id, partei, form, gattung, punkte, ...mehr });

const stationen = [
  {
    zeit: 'Frühjahr und Sommer 480',
    t: 0,
    kurz: 'Ein Heer, das Herodot nicht mehr zählen kann, kommt.',
    text: 'Zehn Jahre nach Marathon kommt Xerxes selbst. Über den Hellespont wird eine Schiffsbrücke gelegt, durch die Halbinsel des Athos ein Kanal gegraben, damit die Flotte nicht wieder am Kap zerschellt. Heer und Flotte ziehen gemeinsam an der Küste entlang nach Süden. Der griechische Bund entscheidet, das Heer im Engpass der Thermopylen und die Flotte gleichzeitig bei Artemision aufzuhalten – die beiden Stellungen hängen voneinander ab.',
    uebersicht: true,
    sicht: [[19.0, 34.0], [29.8, 42.5]],
    stellungen: [
      s('anm-per', 'per', 'pfeil', 'gemischt', pfeil([26.40, 40.20], [24.50, 40.90], [23.00, 40.50], [22.60, 39.60], [22.55, 38.85]), { name: 'Xerxes über den Hellespont' }),
      s('anm-flotte', 'per', 'pfeil', 'schiff', pfeil([26.20, 40.35], [24.30, 40.10], [23.60, 39.15], [23.22, 39.02]), { name: 'Die Flotte an der Küste entlang' }),
      s('anm-gr', 'gr', 'pfeil', 'gemischt', pfeil([22.43, 37.07], [23.05, 37.75], [23.73, 37.98], [22.90, 38.60], [22.55, 38.80]), { name: 'Der Bund stellt sich in den Pass' }),
      s('anm-grfl', 'gr', 'pfeil', 'schiff', pfeil([23.73, 37.94], [23.90, 38.40], [23.35, 38.95]), { name: 'Die Flotte nach Artemision' }),
    ],
  },
  {
    zeit: 'Anfang August',
    t: 60,
    kurz: 'Ein Weg zwischen Berg und Meer, ohne Frontbreite.',
    text: 'Der Pass hat drei Engstellen; die Griechen setzen sich an die mittlere, wo eine alte Mauer der Phoker steht, und bauen sie wieder auf. Rechts fällt der Kallidromos steil ab, links liegt das Wasser. Wer hier angreift, kann höchstens so viele Leute nebeneinander stellen, wie zwischen Fels und Ufer Platz haben – Zahlen nützen nichts. Genau deshalb ist der Ort gewählt.',
    stellungen: [
      s('g-mauer', 'gr', 'flaeche', 'fuss', linie([22.5330, 38.7962], 0.34, 0.14, 270), { name: 'Hinter der phokischen Mauer', staerke: 'rund 7.000' }),
      s('g-phoker', 'gr', 'flaeche', 'fuss', klumpen([22.5400, 38.7650], 0.8), { name: '1.000 Phoker auf dem Bergpfad' }),
      s('p-lager', 'per', 'flaeche', 'gemischt', klumpen(LAGER_PER, 4.0, 1.4, 90), { name: 'Das persische Lager in der Ebene', staerke: 'das ganze Heer' }),
    ],
  },
  {
    zeit: 'Vier Tage',
    t: 120,
    kurz: 'Xerxes wartet vier Tage, dass sie weglaufen.',
    text: 'Xerxes lässt vier Tage verstreichen, in der Annahme, ein so kleiner Haufen werde von selbst abziehen, sobald er die Größe des Heeres sieht. Ein Späher meldet, die Spartaner säßen vor der Mauer und kämmten sich das Haar. Der verbannte Spartanerkönig Demaratos erklärt dem Großkönig, das sei ihre Gewohnheit, wenn sie sich anschickten zu sterben.',
    stellungen: [
      s('g-mauer', 'gr', 'flaeche', 'fuss', linie([22.5330, 38.7962], 0.34, 0.14, 270), { name: 'Die Griechen warten', staerke: 'rund 7.000' }),
      s('p-lager', 'per', 'flaeche', 'gemischt', klumpen(LAGER_PER, 4.0, 1.4, 90), { name: 'Das Lager wartet ebenso', staerke: 'das ganze Heer' }),
      s('p-spaeher', 'per', 'pfeil', 'reiter', pfeil([22.4950, 38.8020], [22.5150, 38.7990], [22.5280, 38.7970]), { name: 'Ein Späher reitet vor' }),
    ],
  },
  {
    zeit: 'Erster Tag',
    t: 180,
    kurz: 'Die Meder kommen und kommen zurück.',
    text: 'Am fünften Tag schickt Xerxes die Meder und Kissier vor, mit dem Befehl, die Griechen lebend zu bringen. Sie laufen in eine Phalanx aus langen Stoßlanzen und großen Schilden, in einer Gasse, in der man nicht ausweichen kann. Die Spartaner täuschen mehrfach Flucht vor, kehren um und schlagen die Nachdrängenden zusammen. Xerxes soll dreimal vom Sitz aufgesprungen sein.',
    stellungen: [
      s('g-mauer', 'gr', 'flaeche', 'fuss', linie([22.5320, 38.7962], 0.34, 0.14, 270), { name: 'Die Phalanx im Engpass', staerke: 'abwechselnd je eine Stadt' }),
      s('p-meder', 'per', 'flaeche', 'gemischt', linie([22.5210, 38.7975], 0.30, 0.5, 90), { name: 'Meder und Kissier', staerke: 'in Wellen', geschlagen: true }),
      s('p-stoss', 'per', 'pfeil', 'fuss', pfeil([22.5230, 38.7972], [22.5290, 38.7965], [22.5315, 38.7962]), {}),
      s('g-finte', 'gr', 'pfeil', 'fuss', pfeil([22.5320, 38.7955], [22.5270, 38.7952], [22.5320, 38.7948]), { name: 'Scheinflucht und Umkehr', finte: true }),
      s('p-lager', 'per', 'flaeche', 'gemischt', klumpen(LAGER_PER, 4.0, 1.4, 90), { name: 'Das Lager', staerke: 'das ganze Heer' }),
    ],
  },
  {
    zeit: 'Später am ersten Tag',
    t: 240,
    kurz: 'Auch die Unsterblichen kommen nicht durch.',
    text: 'Danach schickt Xerxes die Zehntausend, die Leibgarde, die man die Unsterblichen nennt, weil jeder Gefallene sofort ersetzt wird. Sie kämpfen nicht besser als die Meder, weil das Problem nicht an ihnen liegt: Ihre kurzen Speere und Flechtschilde taugen nicht gegen eine geschlossene Reihe, und mehr als ein paar Dutzend passen ohnehin nicht nebeneinander.',
    stellungen: [
      s('p-unsterbl', 'per', 'flaeche', 'fuss', linie([22.5230, 38.7972], 0.30, 0.5, 90), { name: 'Die Unsterblichen', staerke: '10.000', geschlagen: true }),
      s('g-mauer', 'gr', 'flaeche', 'fuss', linie([22.5320, 38.7962], 0.34, 0.14, 270), { name: 'Die Phalanx hält', staerke: 'rund 7.000' }),
      s('p-stoss', 'per', 'pfeil', 'fuss', pfeil([22.5250, 38.7970], [22.5300, 38.7964], [22.5318, 38.7962]), {}),
      s('p-lager', 'per', 'flaeche', 'gemischt', klumpen(LAGER_PER, 4.0, 1.4, 90), { name: 'Das Lager', staerke: 'das ganze Heer' }),
    ],
  },
  {
    zeit: 'Zweiter Tag',
    t: 300,
    kurz: 'Dasselbe Bild, dieselbe Enge, dasselbe Ergebnis.',
    text: 'Der zweite Tag verläuft wie der erste. Die Griechen wechseln sich stadtweise ab, sodass immer ausgeruhte Reihen vorn stehen; die Perser laufen weiter in dieselbe Gasse. Am Abend weiß Xerxes, dass er den Pass frontal nicht nehmen kann, und hat keinen Plan – bis sich ein Einheimischer im Lager meldet.',
    stellungen: [
      s('g-mauer', 'gr', 'flaeche', 'fuss', linie([22.5320, 38.7962], 0.34, 0.14, 270), { name: 'Ablösung nach Städten', staerke: 'rund 7.000' }),
      s('p-unsterbl', 'per', 'flaeche', 'fuss', linie([22.5235, 38.7972], 0.30, 0.5, 90), { name: 'Zweiter Tag, dritter Versuch', geschlagen: true }),
      s('g-phoker', 'gr', 'flaeche', 'fuss', klumpen([22.5400, 38.7650], 0.8), { name: 'Die Phoker auf dem Berg' }),
      s('p-lager', 'per', 'flaeche', 'gemischt', klumpen(LAGER_PER, 4.0, 1.4, 90), { name: 'Das Lager', staerke: 'das ganze Heer' }),
    ],
  },
  {
    zeit: 'Zweiter Abend',
    t: 360,
    kurz: 'Ein Ortskundiger zeigt den Weg über den Berg.',
    text: 'Ephialtes aus Malis kommt ins persische Lager und bietet gegen Belohnung an, den Bergpfad zu zeigen, der oberhalb des Passes verläuft und hinter der griechischen Stellung wieder herunterkommt. Dass es diesen Pfad gibt, wissen die Griechen; deshalb steht dort ein Kontingent von tausend Phokern. Was sie nicht wissen, ist, dass er in dieser Nacht begangen wird.',
    stellungen: [
      s('p-hydarnes', 'per', 'pfeil', 'gemischt', pfeil([22.4720, 38.8120], [22.4980, 38.7800], [22.5390, 38.7645]), { name: 'Hydarnes bricht bei Dunkelheit auf' }),
      s('g-phoker', 'gr', 'flaeche', 'fuss', klumpen([22.5400, 38.7650], 0.8), { name: '1.000 Phoker, ahnungslos' }),
      s('g-mauer', 'gr', 'flaeche', 'fuss', linie([22.5320, 38.7962], 0.34, 0.14, 270), { name: 'Die Stellung im Pass', staerke: 'rund 7.000' }),
      s('p-lager', 'per', 'flaeche', 'gemischt', klumpen(LAGER_PER, 4.0, 1.4, 90), { name: 'Das Lager', staerke: 'das ganze Heer' }),
    ],
  },
  {
    zeit: 'Dritter Tag, Morgengrauen',
    t: 420,
    kurz: 'Nachts über den Anopaia, an den Phokern vorbei.',
    text: 'Die Phoker hören die Perser im Eichenlaub, bevor sie sie sehen, und stellen sich auf den Kamm. Hydarnes will keine Zeit verlieren, lässt eine Salve Pfeile schießen und marschiert vorbei – die Phoker weichen auf die Höhe aus und warten dort auf einen Angriff, der nicht kommt. Kurz darauf melden Läufer im Pass, dass der Feind im Rücken ist.',
    stellungen: [
      s('p-hydarnes', 'per', 'pfeil', 'gemischt', pfeil([22.5390, 38.7645], [22.5700, 38.7780], [22.5860, 38.7950]), { name: 'Vorbei und hinunter nach Alpenoi' }),
      s('g-phoker', 'gr', 'flaeche', 'fuss', klumpen([22.5430, 38.7590], 0.7), { name: 'Die Phoker weichen bergauf', geschlagen: true }),
      s('g-mauer', 'gr', 'flaeche', 'fuss', linie([22.5320, 38.7962], 0.34, 0.14, 270), { name: 'Die Nachricht kommt an', staerke: 'rund 7.000' }),
      s('g-abzug', 'gr', 'pfeil', 'gemischt', pfeil([22.5330, 38.7950], [22.5150, 38.7930], [22.4900, 38.7900]), { name: 'Die meisten Städte ziehen ab', rueckzug: true }),
    ],
  },
  {
    zeit: 'Dritter Tag, Vormittag',
    t: 480,
    kurz: 'Leonidas schickt die anderen weg und bleibt.',
    text: 'Leonidas entlässt den größten Teil des Heeres. Es bleiben die dreihundert Spartiaten, siebenhundert Thespier, die freiwillig bleiben, und vierhundert Thebaner. Sie gehen diesmal vor die Enge hinaus, ins breitere Stück, wo sie mehr treffen und mehr getroffen werden. Als die Speere brechen, kämpfen sie mit Schwertern, dann mit Händen und Zähnen, schreibt Herodot. Leonidas fällt; um seinen Leichnam wird viermal gerungen.',
    stellungen: [
      s('g-rest', 'gr', 'flaeche', 'fuss', linie([22.5270, 38.7960], 0.40, 0.18, 270), { name: 'Spartiaten, Thespier, Thebaner', staerke: '1.400', geschlagen: true }),
      s('p-front', 'per', 'flaeche', 'gemischt', linie([22.5120, 38.7975], 0.50, 0.8, 90), { name: 'Von vorn, mit Peitschen angetrieben', staerke: 'in Wellen' }),
      s('p-hydarnes', 'per', 'pfeil', 'gemischt', pfeil([22.5860, 38.7950], [22.5620, 38.7958], [22.5450, 38.7960]), { name: 'Hydarnes aus dem Rücken' }),
      s('g-mauer', 'gr', 'flaeche', 'fuss', linie([22.5335, 38.7962], 0.34, 0.10, 270), { name: 'Die Mauer, jetzt hinter ihnen' }),
    ],
  },
  {
    zeit: 'Mittag',
    t: 530,
    kurz: 'Zuletzt ein Hügel und ein Ring von Pfeilen.',
    text: 'Der Rest zieht sich hinter die Mauer auf einen kleinen Hügel zurück und stellt sich im Kreis auf. Xerxes lässt nicht mehr angreifen, sondern beschießen. Die Thebaner ergeben sich und werden gebrandmarkt. Auf dem Hügel finden Archäologen im 20. Jahrhundert Hunderte persischer Pfeilspitzen – der einzige Fund, der eine Herodot-Stelle unmittelbar bestätigt.',
    stellungen: [
      s('g-rest', 'gr', 'flaeche', 'fuss', klumpen(KOLONOS, 0.22), { name: 'Der Kolonos-Hügel', staerke: 'was übrig ist', geschlagen: true }),
      s('p-bogen', 'per', 'flaeche', 'bogen', klumpen([22.5390, 38.7955], 0.9, 1.2, 90), { name: 'Beschuss von allen Seiten', staerke: 'Bogenschützen' }),
      s('p-front', 'per', 'flaeche', 'gemischt', linie([22.5280, 38.7962], 0.5, 0.6, 90), { name: 'Der Pass ist offen' }),
    ],
  },
  {
    zeit: 'Nach den Thermopylen',
    t: 610,
    kurz: 'Die verlorene Schlacht wird berühmter als der Sieg.',
    text: 'Die griechische Flotte bricht Artemision ab, weil die Stellung ohne den Pass keinen Sinn mehr hat. Athen wird geräumt und niedergebrannt. Vier Wochen später wird bei Salamis in einer Meerenge entschieden, was hier in einer Landenge nicht zu entscheiden war, und ein Jahr darauf bei Plataiai endgültig. Auf dem Hügel steht bis heute die Inschrift des Simonides: Wanderer, kommst du nach Sparta.',
    uebersicht: true,
    sicht: [[19.5, 34.5], [27.5, 41.0]],
    stellungen: [
      s('p-athen', 'per', 'pfeil', 'gemischt', pfeil([22.55, 38.80], [23.05, 38.45], [23.60, 38.20], [23.73, 37.98]), { name: 'Der Weg nach Athen ist frei' }),
      s('g-flotte', 'gr', 'pfeil', 'schiff', pfeil([23.35, 38.95], [23.80, 38.40], [23.55, 37.95], [23.55, 37.94]), { name: 'Artemision wird abgebrochen' }),
      s('g-salamis', 'gr', 'pfeil', 'schiff', pfeil([23.60, 37.94], [23.53, 37.95], [23.50, 37.96]), { name: 'September 480: Salamis' }),
      s('g-plataeae', 'gr', 'pfeil', 'gemischt', pfeil([22.43, 37.07], [22.90, 37.60], [23.27, 38.22]), { name: '479: Plataiai' }),
    ],
  },
];

export const thermopylen = {
  id: 'thermopylen',
  name: 'Thermopylen',
  ort: 'Der Engpass am Malischen Golf',
  datum: 'August 480 v. Chr.',
  jahr: -480,
  mitte: [22.5350, 38.7960],
  zoom: 12.2,
  grund: 'blatt',
  worum: 'Eine Frontbreite von hundert Metern nimmt der Überzahl ihren einzigen Vorteil: Zwischen dem Steilhang des Kallidromos und dem Wasser des Malischen Golfs passen nur wenige Dutzend Mann nebeneinander. Zwei Tage lang hält das. Dann zeigt ein Ortskundiger einen Pfad über den Berg – und die Rechnung, auf der die ganze Stellung beruht, ist hinfällig.',
  parteien,
  gelaende,
  stationen,
  ausgang: 'Der Pass wird nach zwei Tagen über den Anopaia-Pfad umgangen. Die Nachhut fällt vollständig; Leonidas fällt mit ihr.',
  verluste: [
    { partei: 'gr', text: 'die 300 Spartiaten, 700 Thespier und die spartanischen Heloten vollständig; insgesamt rund 2.000' },
    { partei: 'per', text: 'nach Herodot 20.000 – die Zahl ist wie alle seine persischen Angaben unbrauchbar; sicher ist nur, dass die Verluste hoch waren' },
  ],
  folgen: 'Die griechische Flotte gibt Artemision auf, weil die Seestellung ohne den Landpass wertlos ist. Attika wird geräumt, Athen niedergebrannt. Vier Wochen später entscheidet Salamis den Feldzug zur See, ein Jahr darauf Plataiai zu Lande. Die Schlacht selbst wird zum meistzitierten Verlust der Weltgeschichte – von Simonides’ Grabspruch über die römische Rhetorenschule bis in die Bildsprache des 20. Jahrhunderts, in der sie regelmäßig für Zwecke gebraucht wird, die mit 480 v. Chr. nichts zu tun haben.',
  streit: 'Die Küste ist der wichtigste Vorbehalt: Der Spercheios hat den Golf zugeschüttet, der Pass liegt heute fünf Kilometer landeinwärts, und die Enge ist nur rekonstruierbar. Herodots Zahlen für das persische Heer – über fünf Millionen mit Tross – sind unbrauchbar; die Schätzungen der Forschung reichen von 70.000 bis 300.000. Ob Leonidas die Verbündeten entließ oder ob sie davonliefen, sagt schon Herodot nicht sicher, und die Rolle der Thebaner ist eine spätere athenische Zuspitzung.',
};
