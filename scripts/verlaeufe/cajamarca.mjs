#!/usr/bin/env node
/*
 * ACHTUNG – Verhältnis zu src/data/battles/cajamarca.json: Dieses Skript hat die
 * JSON-Datei einmal erzeugt; danach ist die JSON-Datei die gültige Fassung.
 */
/**
 * Cajamarca, 16. November 1532.
 *
 * Das größte Zahlenverhältnis dieser Sammlung und zugleich die kleinste
 * Fläche: hundertachtundsechzig Männer gegen ein Reich von Millionen,
 * entschieden auf einem Platz von zweihundert Metern Kantenlänge.
 *
 * Auf der Karte ist deshalb zweierlei zu sehen, und beides gehört zusammen:
 * ein Lager, das den halben Talkessel füllt, und daneben eine leere Stadt mit
 * einem geschlossenen Platz, in den man nur durch schmale Gassen kommt und
 * aus dem man nur durch dieselben Gassen wieder heraus. Wer dort mit
 * sechstausend unbewaffneten Begleitern einzieht, kann nichts mehr tun.
 *
 * Cajamarca liegt bei 78.51 West, 7.16 Süd.
 */
import { linie, klumpen, pfeil } from '../lib/stellung.mjs';

const PLATZ = [-78.5120, -7.1625];
const BAEDER = [-78.4650, -7.1655];

const parteien = [
  {
    id: 'spa', name: 'Spanien', farbe: '#6f9fe0',
    fuehrung: 'Francisco Pizarro, Hernando Pizarro, Hernando de Soto, Vicente de Valverde',
    staerke: '168 Mann – 106 zu Fuß, 62 zu Pferd; vier Falkonette, zwölf Arkebusen',
    zahl: 168,
  },
  {
    id: 'ink', name: 'Inkareich', farbe: '#c98a4b',
    fuehrung: 'Atahualpa, Rumiñahui, Chalcuchimac',
    staerke: 'rund 80.000 im Lager; auf dem Platz 6.000 bis 7.000 unbewaffnete Begleiter',
    zahl: 80000,
  },
];

const gelaende = [
  { art: 'stadt', name: 'Cajamarca', punkte: klumpen([-78.5120, -7.1620], 1.2, 1.2, 20) },
  { art: 'mauer', name: 'Die langen Hallen um den Platz', punkte: klumpen(PLATZ, 0.26, 1.2, 20) },
  { art: 'sumpf', name: 'Die heißen Quellen von Konoj', punkte: klumpen(BAEDER, 0.7) },
  { art: 'hoehe', name: 'Der Talkessel von Cajamarca', punkte: klumpen([-78.4900, -7.1630], 11.0, 1.5, 90) },
  { art: 'weg', name: 'Der Inka-Weg von der Küste', punkte: pfeil([-78.6400, -7.0700], [-78.5800, -7.1250], [-78.5250, -7.1590]) },
  { art: 'weg', name: 'Der Weg zwischen Stadt und Lager', punkte: pfeil([-78.5080, -7.1630], [-78.4880, -7.1640], [-78.4700, -7.1650]) },
];

const s = (id, partei, form, gattung, punkte, mehr = {}) => ({ id, partei, form, gattung, punkte, ...mehr });

const stationen = [
  {
    zeit: '1524 bis 1532',
    t: 0,
    kurz: 'Ein Reich, das gerade seinen Bürgerkrieg beendet hat.',
    text: 'Noch bevor ein Spanier das Hochland betritt, sind die Pocken da: Sie kommen über Panama und Kolumbien voraus und töten um 1524 den Herrscher Huayna Capac und seinen Erben. Der Streit um die Nachfolge zwischen Atahualpa im Norden und Huáscar in Cuzco dauert fünf Jahre und endet wenige Monate vor Pizarros Ankunft – mit einem Sieger, dessen Reich in zwei Lager zerfallen ist.',
    uebersicht: true,
    sicht: [[-82.5, -20.5], [-66.5, 10.5]],
    stellungen: [
      s('anm-pocken', 'ink', 'pfeil', 'gemischt', pfeil([-79.53, 8.98], [-77.30, 4.00], [-78.50, -0.22], [-78.51, -7.16]), { name: 'Die Pocken kommen voraus' }),
      s('anm-buerger', 'ink', 'pfeil', 'gemischt', pfeil([-78.50, -0.22], [-78.60, -3.50], [-77.00, -9.50], [-71.97, -13.53]), { name: 'Der Bürgerkrieg, bis Frühjahr 1532' }),
      s('anm-spa', 'spa', 'pfeil', 'schiff', pfeil([-79.53, 8.98], [-79.90, 2.00], [-80.45, -3.57], [-80.63, -5.20], [-78.51, -7.16]), { name: 'Pizarros dritte Fahrt' }),
    ],
  },
  {
    zeit: 'Mai bis November 1532',
    t: 60,
    kurz: 'Hundertachtundsechzig Mann gehen ins Landesinnere.',
    text: 'Pizarro landet bei Tumbes, gründet an der Küste eine Stadt und marschiert dann mit allem, was er hat, ins Gebirge – hundertachtundsechzig Männer, zweiundsechzig davon beritten. Atahualpa weiß von ihnen und lässt sie kommen; er hat gerade ein Heer von Zehntausenden bei sich und sieht in einer Handvoll Fremder keine Gefahr, sondern eine Merkwürdigkeit.',
    stellungen: [
      s('s-zug', 'spa', 'flaeche', 'gemischt', klumpen([-78.5600, -7.1400], 0.9), { name: 'Pizarros Zug im Anmarsch', staerke: '168 Mann' }),
      s('i-lager', 'ink', 'flaeche', 'gemischt', klumpen(BAEDER, 4.5, 1.4, 90), { name: 'Das Lager an den heißen Quellen', staerke: 'rund 80.000' }),
    ],
  },
  {
    zeit: 'Der Aufstieg',
    t: 120,
    kurz: 'Zwölf Tage bergauf durch Pässe, die niemand sperrt.',
    text: 'Der Weg von der Küste auf dreitausend Meter führt über gepflasterte Inka-Straßen und durch Engstellen, an denen wenige hundert Verteidiger die ganze Truppe hätten aufhalten können. Es geschieht nichts. Die Spanier schreiben später selbst, sie hätten diese Tage in Angst verbracht und nicht verstanden, warum man sie durchließ.',
    stellungen: [
      s('s-zug', 'spa', 'flaeche', 'gemischt', klumpen([-78.5350, -7.1580], 0.8), { name: 'Zwölf Tage bergauf', staerke: '168 Mann' }),
      s('s-weg', 'spa', 'pfeil', 'gemischt', pfeil([-78.6100, -7.1000], [-78.5600, -7.1400], [-78.5250, -7.1600]), { name: 'Über die Pässe, ungehindert' }),
      s('i-lager', 'ink', 'flaeche', 'gemischt', klumpen(BAEDER, 4.5, 1.4, 90), { name: 'Das Lager lässt sie kommen', staerke: 'rund 80.000' }),
    ],
  },
  {
    zeit: '15. November',
    t: 180,
    kurz: 'Eine leere Stadt, daneben ein Lager ohne Ende.',
    text: 'Cajamarca ist geräumt, kein Mensch in den Gassen. Pizarro besetzt den großen Platz: ein Viereck von rund zweihundert Metern, an drei Seiten von langen Hallen mit vielen Türöffnungen umschlossen, in der Mitte ein steinerner Aufbau. Sechs Kilometer östlich, an den heißen Quellen, stehen Zelte, so weit man sehen kann. Ein Spanier schreibt, es habe ausgesehen wie eine sehr schöne Stadt.',
    stellungen: [
      s('s-platz', 'spa', 'flaeche', 'gemischt', klumpen(PLATZ, 0.22, 1.2, 20), { name: 'Die Spanier auf dem Platz', staerke: '168 Mann' }),
      s('i-lager', 'ink', 'flaeche', 'gemischt', klumpen(BAEDER, 4.5, 1.4, 90), { name: 'Das Lager an den Quellen', staerke: 'rund 80.000' }),
    ],
  },
  {
    zeit: 'Nachmittag des 15.',
    t: 240,
    kurz: 'Ein Pferd steigt vor dem Herrscher, keiner zuckt.',
    text: 'Hernando de Soto reitet mit einer kleinen Abteilung ins Lager, um Atahualpa für den nächsten Tag einzuladen. Um Eindruck zu machen, treibt er sein Pferd bis dicht vor den Herrscher und lässt es steigen, sodass ihm der Schaum ins Gesicht spritzt. Atahualpa rührt sich nicht. Einige seiner Leute weichen zurück – sie werden noch am selben Abend hingerichtet.',
    stellungen: [
      s('s-soto', 'spa', 'pfeil', 'reiter', pfeil([-78.5060, -7.1630], [-78.4850, -7.1645], [-78.4680, -7.1652]), { name: 'De Soto reitet ins Lager' }),
      s('i-lager', 'ink', 'flaeche', 'gemischt', klumpen(BAEDER, 4.5, 1.4, 90), { name: 'Atahualpa empfängt', staerke: 'rund 80.000' }),
      s('s-platz', 'spa', 'flaeche', 'gemischt', klumpen(PLATZ, 0.22, 1.2, 20), { name: 'Der Rest bleibt am Platz', staerke: '168 Mann' }),
    ],
  },
  {
    zeit: 'Die Nacht',
    t: 300,
    kurz: 'Eine Nacht, in der niemand schläft.',
    text: 'Die Spanier verteilen sich in den Hallen um den Platz: Reiterei in drei Gruppen hinter den Türöffnungen, das Fußvolk verteilt, die vier Falkonette auf dem steinernen Aufbau in der Mitte. Der Plan ist derselbe, mit dem Cortés Moctezuma genommen hat, und er wird ausdrücklich so besprochen. Ein Augenzeuge schreibt, viele hätten sich in dieser Nacht vor Angst nass gemacht.',
    stellungen: [
      s('s-reiterN', 'spa', 'flaeche', 'reiter', linie([-78.5128, -7.1608], 0.19, 0.05, 180), { name: 'Reiterei in der Nordhalle', staerke: '20 Pferde' }),
      s('s-reiterS', 'spa', 'flaeche', 'reiter', linie([-78.5128, -7.1642], 0.19, 0.05, 0), { name: 'Reiterei in der Südhalle', staerke: '20 Pferde' }),
      s('s-reiterW', 'spa', 'flaeche', 'reiter', linie([-78.5146, -7.1625], 0.17, 0.05, 90), { name: 'Reiterei in der Westhalle', staerke: '22 Pferde' }),
      s('s-geschuetz', 'spa', 'flaeche', 'geschuetz', klumpen(PLATZ, 0.09), { name: 'Vier Falkonette in der Mitte' }),
      s('i-lager', 'ink', 'flaeche', 'gemischt', klumpen(BAEDER, 4.5, 1.4, 90), { name: 'Das Lager schläft', staerke: 'rund 80.000' }),
    ],
  },
  {
    zeit: '16. November, später Nachmittag',
    t: 360,
    kurz: 'Sechstausend unbewaffnete Begleiter ziehen ein.',
    text: 'Atahualpa lässt sich Zeit und kommt erst, als es schon spät ist – auf einer Sänfte, die von achtzig Trägern in blauer Tracht geschultert wird, davor Kehrer, die den Weg fegen, dahinter der Hof. Es ist ein Aufzug und kein Anmarsch: Die Begleiter tragen kleine Zeremonialbeile und Schleudern, keine Waffen für ein Gefecht. Sechs- bis siebentausend von ihnen füllen den Platz.',
    stellungen: [
      s('i-zug', 'ink', 'pfeil', 'gemischt', pfeil([-78.4700, -7.1650], [-78.4900, -7.1640], [-78.5100, -7.1628]), { name: 'Der Einzug auf den Platz' }),
      s('i-platz', 'ink', 'flaeche', 'gemischt', klumpen(PLATZ, 0.17, 1.2, 20), { name: 'Der Hof auf dem Platz', staerke: '6.000 bis 7.000' }),
      s('s-reiterN', 'spa', 'flaeche', 'reiter', linie([-78.5128, -7.1608], 0.19, 0.05, 180), { name: 'wartet in der Halle', staerke: '20 Pferde' }),
      s('s-reiterS', 'spa', 'flaeche', 'reiter', linie([-78.5128, -7.1642], 0.19, 0.05, 0), { name: 'wartet in der Halle', staerke: '20 Pferde' }),
      s('i-lager', 'ink', 'flaeche', 'gemischt', klumpen(BAEDER, 4.5, 1.4, 90), { name: 'Der Rest bleibt im Lager', staerke: 'rund 80.000' }),
    ],
  },
  {
    zeit: 'Kurz darauf',
    t: 410,
    kurz: 'Ein Buch wird gereicht und weggeworfen.',
    text: 'Auf den leeren Platz tritt ein einziger Mann: der Dominikaner Vicente de Valverde mit einem Buch. Er verliest über einen Dolmetscher die Aufforderung, sich Kirche und Kaiser zu unterwerfen. Atahualpa nimmt das Buch, dreht es, hält es ans Ohr, hört nichts und wirft es zu Boden. Ob er damit eine Kriegserklärung abgab oder auf eine Formel reagierte, die niemand übersetzen konnte, ist bis heute die Streitfrage.',
    stellungen: [
      s('s-valverde', 'spa', 'pfeil', 'fuss', pfeil([-78.5138, -7.1625], [-78.5128, -7.1625], [-78.5122, -7.1625]), { name: 'Valverde tritt vor' }),
      s('i-platz', 'ink', 'flaeche', 'gemischt', klumpen(PLATZ, 0.17, 1.2, 20), { name: 'Atahualpa auf der Sänfte', staerke: '6.000 bis 7.000' }),
      s('s-reiterW', 'spa', 'flaeche', 'reiter', linie([-78.5146, -7.1625], 0.17, 0.05, 90), { name: 'in den Hallen', staerke: '22 Pferde' }),
      s('s-geschuetz', 'spa', 'flaeche', 'geschuetz', klumpen(PLATZ, 0.09), { name: 'Die Falkonette' }),
    ],
  },
  {
    zeit: 'Das Zeichen',
    t: 450,
    kurz: 'Das Zeichen, und die Geschütze feuern in die Menge.',
    text: 'Pizarro lässt ein weißes Tuch schwenken und ruft den Feldruf Santiago. Die Falkonette feuern in die dichteste Stelle, die Arkebusen dazu; dann brechen aus allen Türöffnungen zugleich die Reiter heraus, mit Schellen an den Zeugen, um den Lärm zu vergrößern. Auf einem geschlossenen Platz gibt es für sechstausend Menschen ohne Waffen keinen Ort, an den sie ausweichen könnten.',
    stellungen: [
      s('s-geschuetz', 'spa', 'flaeche', 'geschuetz', klumpen(PLATZ, 0.09), { name: 'Vier Falkonette feuern' }),
      s('s-reiterN', 'spa', 'flaeche', 'reiter', linie([-78.5128, -7.1608], 0.19, 0.05, 180), { name: 'aus der Nordhalle', staerke: '20 Pferde' }),
      s('s-reiterS', 'spa', 'flaeche', 'reiter', linie([-78.5128, -7.1642], 0.19, 0.05, 0), { name: 'aus der Südhalle', staerke: '20 Pferde' }),
      s('s-reiterW', 'spa', 'flaeche', 'reiter', linie([-78.5146, -7.1625], 0.17, 0.05, 90), { name: 'aus der Westhalle', staerke: '22 Pferde' }),
      s('s-ausfallN', 'spa', 'pfeil', 'reiter', pfeil([-78.5128, -7.1608], [-78.5124, -7.1624], [-78.5119, -7.1642]), {}),
      s('s-ausfallS', 'spa', 'pfeil', 'reiter', pfeil([-78.5128, -7.1642], [-78.5124, -7.1626], [-78.5119, -7.1608]), {}),
      s('s-ausfallW', 'spa', 'pfeil', 'reiter', pfeil([-78.5146, -7.1625], [-78.5126, -7.1624], [-78.5102, -7.1623]), {}),
      s('i-platz', 'ink', 'flaeche', 'gemischt', klumpen(PLATZ, 0.17, 1.2, 20), { name: 'ohne Waffen und ohne Ausweg', staerke: '6.000 bis 7.000', geschlagen: true }),
    ],
  },
  {
    zeit: 'Zwei Stunden',
    t: 500,
    kurz: 'Zwei Stunden, und eine Mauer fällt unter dem Druck.',
    text: 'Es dauert bis zur Dunkelheit. Die Träger der Sänfte werden erschlagen und sofort von anderen ersetzt, bis Pizarro selbst Atahualpa herunterzieht – dabei wird er von den eigenen Leuten an der Hand verletzt, weil er verbietet, auf den Herrscher zu schlagen. Wer zu fliehen versucht, drückt gegen die Mauer an der Rückseite, bis ein Stück davon einstürzt; draußen holt die Reiterei die Fliehenden ein. Auf spanischer Seite fällt niemand.',
    stellungen: [
      s('i-platz', 'ink', 'flaeche', 'gemischt', klumpen(PLATZ, 0.15, 1.2, 20), { name: 'zusammengedrängt', staerke: 'Tausende', geschlagen: true }),
      s('i-flucht', 'ink', 'pfeil', 'gemischt', pfeil([-78.5118, -7.1628], [-78.5090, -7.1640], [-78.5050, -7.1655]), { name: 'Die eingestürzte Mauer', rueckzug: true }),
      s('s-verfolg', 'spa', 'pfeil', 'reiter', pfeil([-78.5115, -7.1630], [-78.5070, -7.1648], [-78.5010, -7.1665]), { name: 'Verfolgung ins Freie' }),
      s('s-geschuetz', 'spa', 'flaeche', 'geschuetz', klumpen(PLATZ, 0.09), { name: 'Atahualpa gefangen' }),
    ],
  },
  {
    zeit: 'November 1532 bis Juli 1533',
    t: 560,
    kurz: 'Ein Raum voll Gold, zweimal voll Silber, und dann?',
    text: 'Atahualpa bietet als Lösegeld an, einen Raum von etwa sieben mal fünf Metern bis in Reichweite seines erhobenen Armes mit Gold zu füllen und zweimal mit Silber. Über acht Monate kommen Karawanen aus dem ganzen Reich; Kunstwerke werden eingeschmolzen. Das Lösegeld wird gezahlt und der Gefangene trotzdem am 26. Juli 1533 hingerichtet – erdrosselt statt verbrannt, weil er sich zuvor taufen lässt. Zwischendurch lässt er aus der Haft heraus seinen Bruder Huáscar töten.',
    stellungen: [
      s('s-platz', 'spa', 'flaeche', 'gemischt', klumpen(PLATZ, 0.20, 1.2, 20), { name: 'Die Spanier halten die Stadt', staerke: '168 Mann' }),
      s('i-loesegeld', 'ink', 'pfeil', 'gemischt', pfeil([-78.3800, -7.2400], [-78.4400, -7.2020], [-78.5060, -7.1640]), { name: 'Das Lösegeld kommt aus dem Reich' }),
      s('i-lager', 'ink', 'flaeche', 'gemischt', klumpen([-78.4700, -7.1660], 3.0, 1.4, 90), { name: 'Das Heer zieht ab, ohne Befehl', staerke: 'führerlos', geschlagen: true }),
    ],
  },
  {
    zeit: 'Nach Cajamarca',
    t: 640,
    kurz: 'Das Silber von Potosí trägt drei Jahrhunderte.',
    text: 'Cuzco fällt im November 1533; die Spanier setzen einen Inka nach dem anderen als Werkzeug ein, bis sich Manco Inca 1536 erhebt und Cuzco fast zurückerobert. Ein Restreich hält sich in Vilcabamba bis 1572. 1545 wird der Silberberg von Potosí entdeckt, und mit ihm beginnt der Strom, der drei Jahrhunderte lang die spanische Krone finanziert und über Manila bis nach China reicht – gefördert in einem Zwangsarbeitssystem, das die alte Inka-Abgabe unter neuem Vorzeichen fortsetzt.',
    uebersicht: true,
    sicht: [[-84.5, -26.5], [-60.5, 10.5]],
    stellungen: [
      s('s-cuzco', 'spa', 'pfeil', 'gemischt', pfeil([-78.51, -7.16], [-77.03, -12.05], [-74.20, -13.20], [-71.97, -13.53]), { name: 'Cuzco, November 1533' }),
      s('i-aufstand', 'ink', 'pfeil', 'gemischt', pfeil([-71.97, -13.53], [-73.00, -13.20], [-73.40, -12.90]), { name: '1536 Aufstand, dann Vilcabamba bis 1572' }),
      s('s-potosi', 'spa', 'pfeil', 'gemischt', pfeil([-71.97, -13.53], [-68.15, -16.50], [-65.75, -19.58]), { name: '1545: der Silberberg von Potosí' }),
      s('s-silber', 'spa', 'pfeil', 'schiff', pfeil([-65.75, -19.58], [-70.40, -18.50], [-77.15, -12.06], [-79.55, -8.10], [-79.53, 8.98]), { name: 'Der Silberweg nach Norden' }),
    ],
  },
];

export const cajamarca = {
  id: 'cajamarca',
  name: 'Cajamarca',
  ort: 'Nordperu, im Hochtal',
  datum: '16. November 1532',
  jahr: 1532,
  mitte: [-78.4900, -7.1630],
  zoom: 13.4,
  grund: 'relief',
  worum: 'Das größte Zahlenverhältnis dieser Sammlung auf der kleinsten Fläche: hundertachtundsechzig Männer gegen ein Reich von Millionen, entschieden auf einem Platz von zweihundert Metern Kantenlänge. Auf der Karte gehört beides zusammen – ein Lager, das den halben Talkessel füllt, und daneben ein geschlossener Platz, in den man nur durch schmale Gassen kommt und aus dem man nur durch dieselben wieder heraus.',
  parteien,
  gelaende,
  stationen,
  ausgang: 'Der Hofstaat wird auf dem Platz niedergemacht, Atahualpa gefangen genommen. Auf spanischer Seite fällt niemand.',
  verluste: [
    { partei: 'ink', text: 'nach den spanischen Berichten zwischen 2.000 und 7.000 Tote in zwei Stunden – fast alle unbewaffnet' },
    { partei: 'spa', text: 'kein Toter; Pizarro selbst an der Hand verletzt, von den eigenen Leuten' },
  ],
  folgen: 'Das Lösegeld – ein Raum voll Gold und zweimal voll Silber – wird gezahlt, Atahualpa im Juli 1533 trotzdem hingerichtet. Cuzco fällt im November 1533. Ein Restreich in Vilcabamba hält sich bis 1572. Ab 1545 finanziert das Silber von Potosí drei Jahrhunderte lang die spanische Krone und reicht über Manila bis nach China; gefördert wird es in einem Zwangsarbeitssystem, das die alte Inka-Abgabe unter neuem Vorzeichen fortführt. Die indigene Bevölkerung der Anden geht innerhalb eines Jahrhunderts drastisch zurück.',
  streit: 'Alle Augenzeugenberichte stammen von Teilnehmern der spanischen Seite, die ein Interesse daran hatten, den Überfall als Notwehr darzustellen; die indigene Überlieferung ist erst Jahrzehnte später und über spanische Vermittler aufgezeichnet. Die Zahl der Toten auf dem Platz schwankt zwischen 2.000 und 7.000, die der Begleiter zwischen 3.000 und 8.000. Warum Atahualpa unbewaffnet und mit Hofstaat statt mit Truppen einzog, wird unterschiedlich erklärt – als Zeremonie, als Falle, die schiefging, oder als schlichte Fehleinschätzung.',
};
