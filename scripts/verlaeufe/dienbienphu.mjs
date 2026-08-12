#!/usr/bin/env node
/*
 * ACHTUNG – Verhältnis zu src/data/battles/dienbienphu.json: Dieses Skript hat
 * die JSON-Datei einmal erzeugt; danach ist die JSON-Datei die gültige Fassung.
 */
/**
 * Dien Bien Phu, 13. März bis 7. Mai 1954.
 *
 * Eine Schlacht, deren ganze Anlage aus einer einzigen Annahme folgt: dass
 * niemand schwere Artillerie auf die Berge ringsum bekommt. Deshalb wird ein
 * Lager in ein Talbecken gesetzt, dessen Rand überall höher liegt als es
 * selbst – und deshalb ist es verloren, sobald die Annahme fällt.
 *
 * Auf der Karte sieht man beides zugleich: unten der Kranz aus Stützpunkten
 * mit Frauennamen um eine Landebahn, oben ein geschlossener Höhenzug, von dem
 * aus jeder Punkt des Beckens eingesehen wird. Vierzigtausend Träger haben
 * die Geschütze in Einzelteilen dorthin gebracht, über sechshundert Kilometer
 * Dschungelpfad.
 *
 * Das Becken liegt bei 103.01 Ost, 21.38 Nord.
 */
import { linie, klumpen, pfeil } from '../lib/stellung.mjs';

const MITTE = [103.0080, 21.3850];
const BAHN = [103.0070, 21.3900];

const parteien = [
  {
    id: 'fra', name: 'Frankreich', farbe: '#6f9fe0',
    fuehrung: 'Henri Navarre, René Cogny, Christian de Castries, Pierre Langlais, Charles Piroth',
    staerke: 'rund 13.000 im Becken – Fallschirmjäger, Fremdenlegion, marokkanische und Thai-Verbände; 10 Panzer, 6 Jagdbomber',
    zahl: 13000,
  },
  {
    id: 'vm', name: 'Viet Minh', farbe: '#d4737c',
    fuehrung: 'Vo Nguyen Giap, Hoang Van Thai',
    staerke: 'vier Divisionen, rund 50.000 im Gefecht, dazu über 50.000 Träger; 200 Geschütze und Flakwaffen',
    zahl: 50000,
  },
];

const gelaende = [
  { art: 'weg', name: 'Die Landebahn', punkte: linie(BAHN, 1.8, 0.06, 90) },
  { art: 'fluss', name: 'Nam Yum', punkte: pfeil([103.0200, 21.4400], [103.0140, 21.4000], [103.0120, 21.3600], [103.0060, 21.3100]) },
  { art: 'hoehe', name: 'Der Höhenkranz im Osten', punkte: klumpen([103.0620, 21.3900], 3.0, 5.0, 10) },
  { art: 'hoehe', name: 'Der Höhenkranz im Westen', punkte: klumpen([102.9550, 21.3900], 3.0, 5.0, 10) },
  { art: 'hoehe', name: 'Der Höhenkranz im Norden', punkte: klumpen([103.0100, 21.4420], 3.0, 2.4, 90) },
  { art: 'stadt', name: 'Muong Thanh · das Dorf im Becken', punkte: klumpen([103.0130, 21.3830], 0.9) },
];

const s = (id, partei, form, gattung, punkte, mehr = {}) => ({ id, partei, form, gattung, punkte, ...mehr });

const stationen = [
  {
    zeit: 'November 1953',
    t: 0,
    kurz: 'Ein Igel im Tal soll den Gegner anlocken.',
    text: 'Navarre lässt am 20. November Fallschirmjäger in ein Talbecken im äußersten Nordwesten springen, dreihundert Kilometer von Hanoi entfernt, ohne Straßenverbindung. Der Zweck ist ausdrücklich, den Gegner zu einer offenen Schlacht zu zwingen, in der französische Artillerie und Luftwaffe zählen – und nebenbei den Weg nach Laos zu sperren. Versorgt werden kann das Lager nur aus der Luft.',
    uebersicht: true,
    sicht: [[99.4, 15.4], [109.6, 24.6]],
    stellungen: [
      s('anm-fra', 'fra', 'pfeil', 'gemischt', pfeil([105.85, 21.03], [104.80, 21.30], [103.80, 21.40], [103.02, 21.39]), { name: 'Der Luftweg von Hanoi, 300 km' }),
      s('anm-laos', 'fra', 'pfeil', 'gemischt', pfeil([103.02, 21.39], [102.60, 20.80], [102.14, 19.89]), { name: 'Die Sperre vor Laos' }),
      s('anm-vm', 'vm', 'pfeil', 'gemischt', pfeil([105.60, 22.30], [104.90, 21.80], [104.00, 21.60], [103.10, 21.45]), { name: 'Vier Divisionen und 600 km Trägerpfad' }),
      s('anm-nach', 'vm', 'pfeil', 'gemischt', pfeil([106.70, 22.00], [105.50, 21.70], [104.20, 21.50], [103.15, 21.42]), { name: 'Nachschub aus China' }),
    ],
  },
  {
    zeit: 'Dezember bis Februar',
    t: 60,
    kurz: 'Ein Kranz von Stützpunkten mit Frauennamen.',
    text: 'Um die Landebahn entsteht ein Ring aus Widerstandsnestern, die die Namen von Frauen tragen – Beatrice, Gabrielle, Anne-Marie, Huguette, Dominique, Éliane, Claudine – und sieben Kilometer südlich, für sich allein, Isabelle. Sie sind mit dem Material gebaut, das eingeflogen werden konnte: wenig Beton, wenig Holz, zu wenig Stacheldraht. Artilleriechef Piroth erklärt, seine Geschütze würden jede feindliche Batterie innerhalb von Minuten zerschlagen.',
    stellungen: [
      s('f-mitte', 'fra', 'flaeche', 'gemischt', klumpen(MITTE, 2.2, 1.4, 0), { name: 'Gefechtsstand und Landebahn', staerke: 'de Castries' }),
      s('f-beatrice', 'fra', 'flaeche', 'fuss', klumpen([103.0340, 21.4030], 0.9), { name: 'Beatrice' }),
      s('f-gabrielle', 'fra', 'flaeche', 'fuss', klumpen([103.0080, 21.4300], 0.9), { name: 'Gabrielle' }),
      s('f-annemarie', 'fra', 'flaeche', 'fuss', klumpen([102.9900, 21.4030], 0.9), { name: 'Anne-Marie' }),
      s('f-dominique', 'fra', 'flaeche', 'fuss', klumpen([103.0250, 21.3860], 0.9), { name: 'Dominique' }),
      s('f-eliane', 'fra', 'flaeche', 'fuss', klumpen([103.0230, 21.3720], 0.9), { name: 'Éliane' }),
      s('f-huguette', 'fra', 'flaeche', 'fuss', klumpen([102.9950, 21.3900], 0.9), { name: 'Huguette' }),
      s('f-isabelle', 'fra', 'flaeche', 'gemischt', klumpen([103.0000, 21.3170], 1.1), { name: 'Isabelle · 7 km südlich' }),
    ],
  },
  {
    zeit: 'Januar bis März',
    t: 130,
    kurz: 'Die Geschütze werden in Teilen auf die Berge getragen.',
    text: 'Giap sagt einen für Ende Januar geplanten Sturmangriff ab und stellt auf Belagerung um. In den Wochen danach schleppen zehntausende Träger mit Fahrrädern und Tragestangen zweihundert Geschütze und Flakwaffen über sechshundert Kilometer Dschungelpfad heran – zerlegt, nachts, unter Tarnnetzen. Oben werden sie nicht hinter, sondern in den Hang gegraben, mit gedeckten Kammern und offenen Schießscharten, sodass sie direkt ins Becken schießen können.',
    stellungen: [
      s('v-nord', 'vm', 'flaeche', 'geschuetz', linie([103.0100, 21.4450], 4.0, 0.8, 180), { name: 'Batterien im Norden', staerke: 'in den Hang gegraben' }),
      s('v-ost', 'vm', 'flaeche', 'geschuetz', linie([103.0620, 21.3880], 5.0, 0.8, 270), { name: 'Batterien im Osten', staerke: 'in den Hang gegraben' }),
      s('v-west', 'vm', 'flaeche', 'geschuetz', linie([102.9520, 21.3880], 5.0, 0.8, 90), { name: 'Batterien im Westen', staerke: 'in den Hang gegraben' }),
      s('v-traeger', 'vm', 'pfeil', 'gemischt', pfeil([103.1100, 21.4500], [103.0700, 21.4300], [103.0450, 21.4100]), { name: 'Träger und Fahrräder' }),
      s('f-mitte', 'fra', 'flaeche', 'gemischt', klumpen(MITTE, 2.2, 1.4, 0), { name: 'Das Lager', staerke: '13.000' }),
    ],
  },
  {
    zeit: '13. März',
    t: 200,
    kurz: 'Beatrice fällt in einer einzigen Nacht.',
    text: 'Um 17 Uhr beginnt ein Artillerieschlag, wie ihn in Indochina niemand erwartet hat: mehrere tausend Granaten auf einen Stützpunkt von wenigen hundert Metern. Kurz darauf steht die Division 312 in den Gräben von Beatrice. Der Kommandeur und sein gesamter Stab fallen in den ersten Minuten durch einen Volltreffer. Bis Mitternacht ist der Stützpunkt weg.',
    stellungen: [
      s('v-stossB', 'vm', 'pfeil', 'fuss', pfeil([103.0520, 21.4120], [103.0430, 21.4070], [103.0360, 21.4040]), { name: 'Division 312 auf Beatrice' }),
      s('f-beatrice', 'fra', 'flaeche', 'fuss', klumpen([103.0340, 21.4030], 0.8), { name: 'Beatrice fällt', geschlagen: true }),
      s('v-ost', 'vm', 'flaeche', 'geschuetz', linie([103.0620, 21.3880], 5.0, 0.8, 270), { name: 'Trommelfeuer aus dem Osten' }),
      s('f-mitte', 'fra', 'flaeche', 'gemischt', klumpen(MITTE, 2.2, 1.4, 0), { name: 'Das Lager unter Feuer', staerke: '13.000' }),
      s('f-gabrielle', 'fra', 'flaeche', 'fuss', klumpen([103.0080, 21.4300], 0.9), { name: 'Gabrielle' }),
    ],
  },
  {
    zeit: '15. bis 17. März',
    t: 260,
    kurz: 'Der Artilleriechef erschießt sich in seinem Unterstand.',
    text: 'Gabrielle fällt in der nächsten Nacht, ein Gegenangriff bleibt stecken. Piroth, der versprochen hatte, jede gegnerische Batterie in Minuten zu vernichten, findet die eingegrabenen Geschütze nicht und kann sie nicht bekämpfen. Er entschuldigt sich bei seinen Offizieren, geht in seinen Unterstand und zieht den Ring einer Handgranate. Am 17. laufen die Thai-Verbände von Anne-Marie davon; der Stützpunkt wird aufgegeben.',
    stellungen: [
      s('f-gabrielle', 'fra', 'flaeche', 'fuss', klumpen([103.0080, 21.4300], 0.8), { name: 'Gabrielle fällt', geschlagen: true }),
      s('f-annemarie', 'fra', 'flaeche', 'fuss', klumpen([102.9900, 21.4030], 0.8), { name: 'Anne-Marie geräumt', geschlagen: true }),
      s('v-stossG', 'vm', 'pfeil', 'fuss', pfeil([103.0080, 21.4450], [103.0080, 21.4390], [103.0080, 21.4320]), { name: 'Division 308 auf Gabrielle' }),
      s('f-mitte', 'fra', 'flaeche', 'gemischt', klumpen(MITTE, 2.2, 1.4, 0), { name: 'Der Ring ist im Norden offen', staerke: '13.000', geschlagen: true }),
      s('v-nord', 'vm', 'flaeche', 'geschuetz', linie([103.0100, 21.4380], 4.0, 0.8, 180), { name: 'Batterien rücken nach' }),
    ],
  },
  {
    zeit: '27. März',
    t: 320,
    kurz: 'Die Landebahn ist tot, alles kommt am Fallschirm.',
    text: 'Die Flak steht auf den Höhen und schießt jedes Flugzeug an, das zur Landung ansetzt. Ab dem 27. März landet keine Maschine mehr; die Verwundeten bleiben liegen, wo sie sind. Nachschub kommt nur noch aus großer Höhe am Fallschirm, und je enger der Kessel wird, desto mehr davon geht daneben – am Ende erhält die Belagerungsarmee einen erheblichen Teil der amerikanischen Munition, die für die Belagerten bestimmt war.',
    stellungen: [
      s('f-mitte', 'fra', 'flaeche', 'gemischt', klumpen(MITTE, 2.0, 1.4, 0), { name: 'Nur noch Abwurf', staerke: '13.000' }),
      s('v-flak', 'vm', 'flaeche', 'geschuetz', klumpen([103.0500, 21.4150], 1.8), { name: 'Flak über dem Anflug' }),
      s('v-flak2', 'vm', 'flaeche', 'geschuetz', klumpen([102.9650, 21.4150], 1.8), { name: 'Flak über dem Anflug' }),
      s('f-abwurf', 'fra', 'pfeil', 'gemischt', pfeil([103.0800, 21.4400], [103.0300, 21.4050], [103.0080, 21.3900]), { name: 'Abwurf aus großer Höhe' }),
      s('v-ost', 'vm', 'flaeche', 'geschuetz', linie([103.0560, 21.3880], 5.0, 0.8, 270), { name: 'Batterien im Osten' }),
    ],
  },
  {
    zeit: '30. März bis 5. April',
    t: 380,
    kurz: 'Die Schlacht der fünf Hügel im Osten.',
    text: 'Giap greift die östlichen Höhenstützpunkte an – Dominique und Éliane –, weil von dort das ganze Becken eingesehen wird. Es sind sechs Tage Nahkampf um Kuppen von zweihundert Metern Durchmesser, die mehrfach die Seite wechseln. Éliane 2, im französischen Sprachgebrauch bloß eine Nummer, im vietnamesischen der Hügel A1, wird zum Stück Boden, um das am längsten gekämpft wird.',
    stellungen: [
      s('v-stossD', 'vm', 'pfeil', 'fuss', pfeil([103.0480, 21.3900], [103.0370, 21.3880], [103.0280, 21.3865]), { name: 'auf Dominique' }),
      s('v-stossE', 'vm', 'pfeil', 'fuss', pfeil([103.0450, 21.3660], [103.0340, 21.3690], [103.0260, 21.3715]), { name: 'auf Éliane' }),
      s('f-dominique', 'fra', 'flaeche', 'fuss', klumpen([103.0250, 21.3860], 0.8), { name: 'Dominique, teilweise verloren', geschlagen: true }),
      s('f-eliane', 'fra', 'flaeche', 'fuss', klumpen([103.0230, 21.3720], 0.8), { name: 'Éliane hält', staerke: 'Fallschirmjäger' }),
      s('f-gegen', 'fra', 'pfeil', 'gemischt', pfeil([103.0120, 21.3790], [103.0190, 21.3760], [103.0225, 21.3730]), { name: 'Gegenangriffe mit Panzern' }),
      s('f-mitte', 'fra', 'flaeche', 'gemischt', klumpen(MITTE, 2.0, 1.4, 0), { name: 'Das Lager', staerke: 'was noch kämpfen kann' }),
    ],
  },
  {
    zeit: 'April',
    t: 440,
    kurz: 'Graben um Graben, hundert Meter in der Nacht.',
    text: 'Statt weiter zu stürmen, gräbt Giap. Nachts werden Laufgräben vorgetrieben, die den Ring einschnüren und die Stützpunkte voneinander trennen; tagsüber liegt niemand im Freien. Das Becken schrumpft auf wenige Quadratkilometer. Im Lager sammeln sich in den Uferhöhlen des Nam Yum die Versprengten, die niemand mehr einteilt – die Belagerten nennen sie die Ratten von Nam Yum.',
    stellungen: [
      s('v-graeben', 'vm', 'flaeche', 'fuss', klumpen(MITTE, 5.0, 1.2, 0), { name: 'Der Grabenring zieht sich zu', staerke: 'nachts vorgetrieben' }),
      s('f-mitte', 'fra', 'flaeche', 'gemischt', klumpen(MITTE, 1.6, 1.3, 0), { name: 'Das Lager schrumpft', staerke: 'wenige Quadratkilometer', geschlagen: true }),
      s('f-huguette', 'fra', 'flaeche', 'fuss', klumpen([102.9990, 21.3910], 0.6), { name: 'Huguette, Stück für Stück verloren', geschlagen: true }),
      s('f-isabelle', 'fra', 'flaeche', 'gemischt', klumpen([103.0000, 21.3170], 1.0), { name: 'Isabelle, abgeschnitten', geschlagen: true }),
      s('f-eliane', 'fra', 'flaeche', 'fuss', klumpen([103.0230, 21.3720], 0.8), { name: 'Éliane hält noch' }),
    ],
  },
  {
    zeit: '6. Mai, 23 Uhr',
    t: 500,
    kurz: 'Eine Tonne Sprengstoff unter dem Hügel A1.',
    text: 'Wochenlang haben Pioniere einen Stollen unter Éliane 2 getrieben, von Hand, mit Körben. In der Nacht zum 7. Mai wird knapp eine Tonne Sprengstoff gezündet; der halbe Hügel geht hoch. Zugleich setzen erstmals Salvengeschütze aus sowjetischer Fertigung ein. Éliane 2 fällt in derselben Nacht, nach fünf Wochen Kampf um zweihundert Meter.',
    stellungen: [
      s('v-stollen', 'vm', 'pfeil', 'fuss', pfeil([103.0300, 21.3700], [103.0260, 21.3710], [103.0232, 21.3718]), { name: 'Der Stollen unter Éliane 2' }),
      s('f-eliane', 'fra', 'flaeche', 'fuss', klumpen([103.0230, 21.3720], 0.7), { name: 'Éliane 2 gesprengt', geschlagen: true }),
      s('v-graeben', 'vm', 'flaeche', 'fuss', klumpen(MITTE, 4.4, 1.2, 0), { name: 'Der Grabenring', staerke: 'unmittelbar davor' }),
      s('f-mitte', 'fra', 'flaeche', 'gemischt', klumpen(MITTE, 1.3, 1.3, 0), { name: 'Der Kessel', staerke: 'letzte Reste', geschlagen: true }),
    ],
  },
  {
    zeit: '7. Mai, 17.30 Uhr',
    t: 560,
    kurz: 'Über dem Gefechtsstand weht eine andere Fahne.',
    text: 'Am Nachmittag laufen die Angriffe von allen Seiten zusammen. De Castries meldet nach Hanoi, dass in einer Viertelstunde alles vorbei sei, und gibt Befehl, nicht die weiße Fahne zu zeigen, sondern das Feuer einzustellen. Um halb sechs stehen Soldaten der Division 312 auf seinem Unterstand. Isabelle im Süden versucht in der Nacht auszubrechen und ergibt sich am Morgen. Über elftausend Menschen gehen in Gefangenschaft; nach vier Monaten kehrt weniger als die Hälfte zurück.',
    stellungen: [
      s('v-schluss1', 'vm', 'pfeil', 'fuss', pfeil([103.0300, 21.3900], [103.0180, 21.3870], [103.0100, 21.3855]), { name: 'von Osten' }),
      s('v-schluss2', 'vm', 'pfeil', 'fuss', pfeil([102.9850, 21.3900], [102.9970, 21.3870], [103.0050, 21.3855]), { name: 'von Westen' }),
      s('v-schluss3', 'vm', 'pfeil', 'fuss', pfeil([103.0090, 21.4200], [103.0085, 21.4000], [103.0080, 21.3880]), { name: 'von Norden' }),
      s('f-mitte', 'fra', 'flaeche', 'gemischt', klumpen(MITTE, 1.0, 1.3, 0), { name: 'Der Gefechtsstand', staerke: 'Gefangenschaft', geschlagen: true }),
      s('f-isabelle', 'fra', 'flaeche', 'gemischt', klumpen([103.0000, 21.3170], 0.9), { name: 'Isabelle bricht aus', geschlagen: true }),
    ],
  },
  {
    zeit: 'Nach dem 7. Mai',
    t: 640,
    kurz: 'Ein Kolonialreich endet, ein zweiter Krieg beginnt.',
    text: 'Am Tag darauf beginnt in Genf die Indochina-Sitzung; im Juli wird das Land am 17. Breitengrad geteilt, mit Wahlen, die nie stattfinden. Frankreich zieht ab. Die Wirkung reicht weit über Vietnam hinaus: In Algerien beginnt im November 1954 der Aufstand, und in ganz Afrika und Asien liest man dieselbe Zeile – dass eine Kolonialmacht in einer regulären Schlacht geschlagen werden kann. In Vietnam übernehmen die Vereinigten Staaten die Rolle Frankreichs.',
    uebersicht: true,
    sicht: [[95.5, 4.5], [115.5, 27.5]],
    stellungen: [
      s('f-abzug', 'fra', 'pfeil', 'gemischt', pfeil([103.02, 21.39], [105.85, 21.03], [106.70, 20.86], [108.20, 16.05], [106.70, 10.78]), { name: '1954/55: Abzug nach Süden und heim' }),
      s('vm-nord', 'vm', 'pfeil', 'gemischt', pfeil([103.02, 21.39], [104.50, 21.20], [105.85, 21.03]), { name: 'Hanoi, Oktober 1954' }),
      s('vm-teilung', 'vm', 'pfeil', 'gemischt', pfeil([102.20, 17.00], [105.00, 17.00], [107.10, 17.00]), { name: 'Genf: die Linie am 17. Breitengrad' }),
      s('vm-danach', 'vm', 'pfeil', 'gemischt', pfeil([105.85, 21.03], [106.20, 17.50], [106.90, 14.00], [106.70, 10.78]), { name: 'Der zweite Krieg, bis 1975' }),
    ],
  },
];

export const dienbienphu = {
  id: 'dienbienphu',
  name: 'Dien Bien Phu',
  ort: 'Talbecken im Nordwesten Vietnams',
  datum: '13. März bis 7. Mai 1954',
  jahr: 1954,
  mitte: [103.0100, 21.3850],
  zoom: 11.6,
  grund: 'relief',
  worum: 'Die ganze Anlage folgt aus einer Annahme: dass niemand schwere Artillerie auf die Berge ringsum bekommt. Deshalb steht ein Lager mit 13.000 Mann in einem Becken, dessen Rand überall höher liegt als es selbst – und deshalb ist es verloren, sobald fünfzigtausend Träger die Geschütze in Einzelteilen über sechshundert Kilometer Dschungelpfad hinaufgeschafft haben.',
  parteien,
  gelaende,
  stationen,
  ausgang: 'Der Gefechtsstand wird am 7. Mai 1954 überrannt, Isabelle fällt in der Nacht darauf. Über 11.000 Menschen gehen in Gefangenschaft.',
  verluste: [
    { partei: 'fra', text: 'rund 2.300 Tote, 5.200 Verwundete, über 11.000 Gefangene – von denen nach vier Monaten Marsch und Lager weniger als die Hälfte zurückkehrt' },
    { partei: 'vm', text: 'nach französischer Schätzung 8.000 bis 23.000 Tote und Verwundete; offizielle vietnamesische Zahlen liegen deutlich darunter' },
  ],
  folgen: 'Am Tag nach dem Fall beginnt in Genf die Indochina-Sitzung; im Juli wird Vietnam am 17. Breitengrad geteilt und Frankreich zieht ab. Die vorgesehenen gesamtvietnamesischen Wahlen finden nie statt; die Vereinigten Staaten treten an die Stelle Frankreichs, und der zweite Krieg dauert bis 1975. Über Indochina hinaus wirkt die Schlacht als Beweis, dass eine europäische Kolonialmacht in einer regulären Feldschlacht zu schlagen ist – in Algerien beginnt der Aufstand ein halbes Jahr später.',
  streit: 'Die Verlustzahlen der Viet Minh sind bis heute strittig und schwanken um mehr als das Doppelte. Umstritten ist auch, ob eine amerikanische Luftunterstützung – die Operation Vulture, samt der erwogenen Kernwaffen – die Schlacht hätte drehen können; Eisenhower lehnte sie ohne britische Beteiligung ab. Über die Frage, wie viel des abgeworfenen Nachschubs auf der falschen Seite landete, gibt es nur Schätzungen der Beteiligten.',
};
