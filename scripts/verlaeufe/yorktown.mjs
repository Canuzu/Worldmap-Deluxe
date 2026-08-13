#!/usr/bin/env node
/*
 * ACHTUNG – Verhältnis zu src/data/battles/yorktown.json: Dieses Skript hat die
 * JSON-Datei einmal erzeugt; danach ist die JSON-Datei die gültige Fassung.
 */
/**
 * Yorktown, 28. September bis 19. Oktober 1781.
 *
 * Eine Belagerung, deren Entscheidung dreißig Seemeilen entfernt fällt und
 * drei Wochen vor dem ersten Schuss vor der Stadt. Cornwallis sitzt auf einer
 * Landzunge, die nur haltbar ist, solange die Marine kommen kann; am
 * 5. September kann sie es nicht mehr.
 *
 * Deshalb zeigt der Verlauf hier zwei Maßstäbe: das Fahrwasser der
 * Chesapeake-Bucht, das sich schließt, und danach die Gräben, die sich Nacht
 * für Nacht an die Stadt heranschieben. Das eine ohne das andere erklärt
 * nichts.
 *
 * Yorktown liegt bei 76.51 West, 37.24 Nord.
 */
import { linie, klumpen, pfeil } from '../lib/stellung.mjs';

const STADT = [-76.5080, 37.2380];
const GLOUCESTER = [-76.4950, 37.2530];

const parteien = [
  {
    id: 'all', name: 'Die Vereinigten Staaten und Frankreich', farbe: '#6f9fe0',
    fuehrung: 'George Washington, Jean-Baptiste de Rochambeau, La Fayette, François-Joseph Paul de Grasse, Henry Knox',
    staerke: 'rund 8.000 Kontinentale und Miliz, 8.000 Franzosen zu Lande; 29 französische Linienschiffe vor der Bucht',
    zahl: 16000,
  },
  {
    id: 'bri', name: 'Großbritannien', farbe: '#d4737c',
    fuehrung: 'Charles Cornwallis, Charles O’Hara, Banastre Tarleton',
    staerke: 'rund 9.000 – britische Regimenter, hessische Verbände und Loyalisten; dazu Kriegsschiffe im Fluss',
    zahl: 9000,
  },
];

const gelaende = [
  { art: 'stadt', name: 'Yorktown', punkte: klumpen(STADT, 0.9, 1.2, 60) },
  { art: 'stadt', name: 'Gloucester Point', punkte: klumpen(GLOUCESTER, 0.8) },
  { art: 'fluss', name: 'Der York River', punkte: pfeil([-76.6400, 37.3100], [-76.5400, 37.2600], [-76.4600, 37.2200], [-76.3600, 37.1800]) },
  { art: 'sumpf', name: 'Die Sümpfe von Wormley Creek', punkte: klumpen([-76.4900, 37.2180], 1.4, 1.6, 30) },
  { art: 'mauer', name: 'Die britische Innenlinie', punkte: klumpen(STADT, 1.6, 1.15, 60) },
  { art: 'weg', name: 'Die Straße nach Williamsburg', punkte: pfeil([-76.5300, 37.2450], [-76.6100, 37.2600], [-76.7100, 37.2700]) },
];

const s = (id, partei, form, gattung, punkte, mehr = {}) => ({ id, partei, form, gattung, punkte, ...mehr });

const stationen = [
  {
    zeit: 'Frühjahr und Sommer 1781',
    t: 0,
    kurz: 'Der Krieg wandert nach Süden und in eine Falle.',
    text: 'Nach fünf Jahren ohne Entscheidung im Norden verlegen die Briten den Schwerpunkt in die Südstaaten. Cornwallis marschiert durch die Carolinas nach Virginia, gewinnt Gefechte und verliert dabei Leute, die er nicht ersetzen kann. Im Sommer befiehlt ihm Clinton, einen Hafen zu befestigen, aus dem die Marine ihn versorgen und notfalls abholen kann. Er wählt Yorktown, am schmalsten Punkt des York River.',
    uebersicht: true,
    sicht: [[-82.5, 17.0], [-62.5, 45.5]],
    stellungen: [
      s('anm-bri', 'bri', 'pfeil', 'gemischt', pfeil([-79.94, 32.78], [-80.84, 35.23], [-78.90, 36.10], [-77.44, 37.54], [-76.51, 37.24]), { name: 'Cornwallis von Charleston nach Virginia' }),
      s('anm-fr', 'all', 'pfeil', 'schiff', pfeil([-71.40, 41.49], [-72.50, 40.50], [-75.20, 38.20], [-76.00, 37.00], [-76.40, 37.20]), { name: 'Rochambeau und die Flotte von Newport' }),
      s('anm-grasse', 'all', 'pfeil', 'schiff', pfeil([-72.30, 19.00], [-75.50, 25.50], [-77.00, 32.00], [-76.00, 36.93]), { name: 'De Grasse aus der Karibik, 29 Linienschiffe' }),
      s('anm-wash', 'all', 'pfeil', 'gemischt', pfeil([-73.92, 41.05], [-75.16, 39.95], [-76.61, 39.29], [-77.44, 37.54], [-76.60, 37.27]), { name: 'Washington marschiert 700 km nach Süden' }),
      s('anm-graves', 'bri', 'pfeil', 'schiff', pfeil([-73.92, 40.70], [-74.90, 38.60], [-75.40, 37.10], [-75.90, 36.90]), { name: '5. September: Graves läuft aus New York' }),
      s('anm-kaps', 'bri', 'pfeil', 'schiff', pfeil([-75.60, 36.85], [-74.90, 37.60], [-73.92, 40.70]), { name: 'und segelt danach zurück – die Bucht bleibt zu', rueckzug: true }),
    ],
  },
  {
    zeit: 'August 1781',
    t: 60,
    kurz: 'Ein Stützpunkt am Wasser, versorgt nur von See.',
    text: 'Cornwallis lässt Yorktown und das gegenüberliegende Gloucester Point befestigen: eine Innenlinie um die Stadt, davor einige vorgeschobene Werke. Neuntausend Mann auf einer Landzunge sind so lange sicher, wie die Royal Navy den Fluss offen hält – und niemand auf britischer Seite zweifelt daran, dass sie das kann. Diese eine Annahme trägt die ganze Anlage.',
    stellungen: [
      s('b-stadt', 'bri', 'flaeche', 'gemischt', klumpen(STADT, 1.6, 1.15, 60), { name: 'Die Innenlinie um Yorktown', staerke: 'rund 8.000' }),
      s('b-gloucester', 'bri', 'flaeche', 'gemischt', klumpen(GLOUCESTER, 1.0), { name: 'Gloucester Point', staerke: 'rund 1.000' }),
      s('b-schiffe', 'bri', 'flaeche', 'schiff', klumpen([-76.4900, 37.2480], 1.2, 1.4, 60), { name: 'Kriegsschiffe im Fluss' }),
      s('a-lafayette', 'all', 'flaeche', 'gemischt', klumpen([-76.6600, 37.2750], 2.0, 1.2, 90), { name: 'La Fayette beobachtet', staerke: 'rund 4.000' }),
    ],
  },
  {
    zeit: '5. September',
    t: 130,
    kurz: 'Vor der Bucht wird das Fahrwasser zugemacht.',
    text: 'De Grasse ist mit neunundzwanzig Linienschiffen aus der Karibik gekommen – mehr, als London für möglich gehalten hat, weil spanische Kredite in Havanna die Fahrt finanzierten. Vor den Kaps trifft er auf Graves. Die Seeschlacht selbst bleibt unentschieden, aber die britische Flotte segelt danach nach New York zurück, um Schäden auszubessern. Damit ist die Bucht geschlossen, und die Annahme, auf der Yorktown ruht, ist hinfällig.',
    sicht: [[-76.72, 37.12], [-76.30, 37.34]],
    stellungen: [
      s('a-sperre', 'all', 'flaeche', 'schiff', linie([-76.3900, 37.2120], 4.0, 1.0, 300), { name: 'Franzosen vor der Flussmündung', staerke: 'ein Geschwader' }),
      s('a-riegel', 'all', 'pfeil', 'schiff', pfeil([-76.3500, 37.1900], [-76.3900, 37.2100], [-76.4300, 37.2280]), { name: 'Der Fluss wird von unten verschlossen' }),
      s('b-schiffe', 'bri', 'flaeche', 'schiff', klumpen([-76.4900, 37.2480], 1.2, 1.4, 60), { name: 'Die Schiffe sitzen im Fluss fest', geschlagen: true }),
      s('b-stadt', 'bri', 'flaeche', 'gemischt', klumpen(STADT, 1.6, 1.15, 60), { name: 'Cornwallis wartet auf Entsatz', staerke: 'rund 8.000' }),
    ],
  },
  {
    zeit: '28. September',
    t: 200,
    kurz: 'Die Halbinsel wird auf der Landseite geschlossen.',
    text: 'Washington und Rochambeau sind aus New York herangekommen – mit einer Täuschung, die Clinton wochenlang glauben ließ, das Ziel sei Staten Island. Sechzehntausend Mann schließen einen Halbkreis um Yorktown, das Wasser übernimmt den Rest. Cornwallis räumt in der Nacht darauf die vorgeschobenen Werke, weil er eine Nachricht Clintons hat, Entsatz sei unterwegs. Er gibt damit den Boden auf, auf dem später die Batterien stehen werden.',
    stellungen: [
      s('a-linie', 'all', 'flaeche', 'gemischt', klumpen(STADT, 5.0, 1.15, 60), { name: 'Der Belagerungsring', staerke: '16.000' }),
      s('b-stadt', 'bri', 'flaeche', 'gemischt', klumpen(STADT, 1.6, 1.15, 60), { name: 'Cornwallis in der Innenlinie', staerke: 'rund 8.000' }),
      s('b-raeumung', 'bri', 'pfeil', 'gemischt', pfeil([-76.5300, 37.2300], [-76.5180, 37.2340], [-76.5100, 37.2370]), { name: 'Die Außenwerke werden geräumt', rueckzug: true }),
      s('b-gloucester', 'bri', 'flaeche', 'gemischt', klumpen(GLOUCESTER, 1.0), { name: 'Gloucester Point', staerke: 'rund 1.000' }),
    ],
  },
  {
    zeit: '6. Oktober, nachts',
    t: 260,
    kurz: 'Die erste Parallele, sechshundert Meter vor der Stadt.',
    text: 'In der Nacht heben viertausend Mann bei Regen und ohne Licht einen Graben von zwei Kilometern Länge aus, parallel zur britischen Linie – nach dem Verfahren, das Vauban hundert Jahre zuvor beschrieben hat und das die französischen Ingenieure mitgebracht haben. Am Morgen steht er. Washington tut den ersten Spatenstich selbst, damit man später sagen kann, er habe ihn getan.',
    stellungen: [
      s('a-parallele1', 'all', 'flaeche', 'gemischt', klumpen(STADT, 3.4, 1.15, 60), { name: 'Die erste Parallele', staerke: '2 km Graben' }),
      s('a-linie', 'all', 'flaeche', 'gemischt', klumpen(STADT, 5.0, 1.15, 60), { name: 'Die Lager dahinter', staerke: '16.000' }),
      s('b-stadt', 'bri', 'flaeche', 'gemischt', klumpen(STADT, 1.6, 1.15, 60), { name: 'Die Innenlinie', staerke: 'rund 8.000' }),
      s('b-redouten', 'bri', 'flaeche', 'gemischt', linie([-76.4990, 37.2330], 0.5, 0.12, 120), { name: 'Redoute 9 und 10 am linken Flügel' }),
    ],
  },
  {
    zeit: '9. Oktober',
    t: 320,
    kurz: 'Am Nachmittag fangen die Batterien an.',
    text: 'Um drei Uhr feuert die erste französische Batterie, um fünf die amerikanische; Washington zündet die erste Lunte. Von da an wird Tag und Nacht geschossen, mit über hundert Rohren, darunter schweren Schiffsgeschützen. Die Fregatte Charon brennt im Fluss aus. In der Stadt gibt es keinen Ort mehr, an dem man außer Reichweite wäre; Cornwallis verlegt sein Quartier in eine Höhle am Ufer.',
    stellungen: [
      s('a-batterien', 'all', 'flaeche', 'geschuetz', klumpen(STADT, 3.2, 1.15, 60), { name: 'Über hundert Rohre' }),
      s('a-feuer', 'all', 'pfeil', 'geschuetz', pfeil([-76.5250, 37.2300], [-76.5160, 37.2340], [-76.5100, 37.2370]), { name: 'Tag und Nacht' }),
      s('b-stadt', 'bri', 'flaeche', 'gemischt', klumpen(STADT, 1.5, 1.15, 60), { name: 'unter Beschuss', staerke: 'rund 8.000', geschlagen: true }),
      s('b-schiffe', 'bri', 'flaeche', 'schiff', klumpen([-76.4920, 37.2470], 1.0, 1.4, 60), { name: 'Die Charon brennt aus', geschlagen: true }),
    ],
  },
  {
    zeit: '11. bis 13. Oktober',
    t: 380,
    kurz: 'Die zweite Parallele hängt an zwei Redouten.',
    text: 'Der zweite Graben wird dreihundert Meter vor der britischen Linie ausgehoben – nahe genug, dass Musketen hinüberreichen. Er lässt sich aber nicht bis zum Fluss durchziehen, weil zwei vorgeschobene Werke am britischen linken Flügel im Weg stehen. Solange Redoute 9 und 10 halten, hängt die ganze Arbeit in der Luft.',
    stellungen: [
      s('a-parallele2', 'all', 'flaeche', 'gemischt', klumpen(STADT, 2.4, 1.15, 60), { name: 'Die zweite Parallele', staerke: '300 m vor der Linie' }),
      s('b-redouten', 'bri', 'flaeche', 'gemischt', linie([-76.4990, 37.2330], 0.5, 0.12, 120), { name: 'Redoute 9 und 10 stehen im Weg' }),
      s('b-stadt', 'bri', 'flaeche', 'gemischt', klumpen(STADT, 1.5, 1.15, 60), { name: 'Die Innenlinie', staerke: 'rund 8.000' }),
      s('a-batterien', 'all', 'flaeche', 'geschuetz', klumpen(STADT, 3.2, 1.15, 60), { name: 'Die Batterien' }),
    ],
  },
  {
    zeit: '14. Oktober, nachts',
    t: 440,
    kurz: 'Beide Redouten fallen in derselben Nacht.',
    text: 'Zwei Sturmtrupps gehen gleichzeitig vor, mit ungeladenen Gewehren, damit niemand durch einen Schuss die Sache verrät. Vierhundert Franzosen unter Guillaume de Deux-Ponts nehmen Redoute 9, vierhundert Amerikaner unter Alexander Hamilton Redoute 10 – Hamilton hat sich das Kommando bei Washington erbeten. Beide Werke fallen in weniger als einer halben Stunde. Danach lässt sich die zweite Parallele bis ans Wasser ziehen.',
    stellungen: [
      s('a-sturm9', 'all', 'pfeil', 'fuss', pfeil([-76.5060, 37.2290], [-76.5010, 37.2315], [-76.4985, 37.2328]), { name: 'Die Franzosen auf Redoute 9' }),
      s('a-sturm10', 'all', 'pfeil', 'fuss', pfeil([-76.5010, 37.2270], [-76.4980, 37.2300], [-76.4962, 37.2320]), { name: 'Hamilton auf Redoute 10' }),
      s('b-redouten', 'bri', 'flaeche', 'gemischt', linie([-76.4990, 37.2330], 0.5, 0.12, 120), { name: 'Beide Werke fallen', geschlagen: true }),
      s('a-parallele2', 'all', 'flaeche', 'gemischt', klumpen(STADT, 2.2, 1.15, 60), { name: 'Die zweite Parallele reicht ans Wasser' }),
      s('b-stadt', 'bri', 'flaeche', 'gemischt', klumpen(STADT, 1.4, 1.15, 60), { name: 'Die Innenlinie', staerke: 'rund 8.000', geschlagen: true }),
    ],
  },
  {
    zeit: '16. Oktober',
    t: 500,
    kurz: 'Ein Ausbruch bei Nacht, den ein Sturm beendet.',
    text: 'Cornwallis versucht zweierlei. Am Morgen ein Ausfall gegen zwei Batterien: Er gelingt, die vernagelten Rohre sind aber nach Stunden wieder in Betrieb. In der Nacht dann der Versuch, das Heer in Booten über den Fluss nach Gloucester zu bringen und sich nach Norden durchzuschlagen. Die erste Welle setzt über, dann kommt ein Gewittersturm und treibt die Boote flussab. Am Morgen ist die Truppe auf beide Ufer verteilt.',
    stellungen: [
      s('b-ausfall', 'bri', 'pfeil', 'gemischt', pfeil([-76.5100, 37.2350], [-76.5180, 37.2320], [-76.5240, 37.2300]), { name: 'Ausfall gegen die Batterien', geschlagen: true }),
      s('b-boote', 'bri', 'pfeil', 'schiff', pfeil([-76.5060, 37.2420], [-76.5010, 37.2470], [-76.4960, 37.2510]), { name: 'Der Übersetzversuch bei Nacht', geschlagen: true }),
      s('b-stadt', 'bri', 'flaeche', 'gemischt', klumpen(STADT, 1.3, 1.15, 60), { name: 'Der Rest bleibt in der Stadt', staerke: 'rund 7.000', geschlagen: true }),
      s('a-parallele2', 'all', 'flaeche', 'gemischt', klumpen(STADT, 2.2, 1.15, 60), { name: 'Die zweite Parallele', staerke: '16.000' }),
    ],
  },
  {
    zeit: '17. bis 19. Oktober',
    t: 560,
    kurz: 'Am 19. marschieren sie zwischen zwei Reihen hindurch.',
    text: 'Am Morgen des 17. – auf den Tag vier Jahre nach Saratoga – erscheint ein Trommler auf der Brustwehr, den niemand hört, und daneben ein Offizier mit einem weißen Tuch. Zwei Tage wird über die Bedingungen verhandelt; die Ehrenbezeigungen, die man den Amerikanern bei Charleston verweigert hatte, werden nun ihrerseits verweigert. Am 19. marschieren die Briten zwischen den aufgestellten Reihen der Sieger hindurch und legen die Waffen nieder. Cornwallis meldet sich krank; O’Hara übergibt an seiner Stelle.',
    stellungen: [
      s('b-stadt', 'bri', 'flaeche', 'gemischt', klumpen(STADT, 1.3, 1.15, 60), { name: 'Die Übergabe', staerke: 'rund 7.000', geschlagen: true }),
      s('a-gasse', 'all', 'flaeche', 'gemischt', linie([-76.5220, 37.2420], 2.0, 0.5, 150), { name: 'Die Reihen der Sieger', staerke: '16.000' }),
      s('b-abmarsch', 'bri', 'pfeil', 'gemischt', pfeil([-76.5100, 37.2380], [-76.5200, 37.2420], [-76.5320, 37.2470]), { name: 'Abmarsch ins Gefangenenlager', rueckzug: true }),
      s('b-gloucester', 'bri', 'flaeche', 'gemischt', klumpen(GLOUCESTER, 0.9), { name: 'Gloucester ergibt sich mit', staerke: 'rund 1.000', geschlagen: true }),
    ],
  },
  {
    zeit: 'Nach dem 19. Oktober',
    t: 640,
    kurz: 'Frankreich gewinnt den Krieg und ruiniert sich dabei.',
    text: 'Der Krieg ist militärisch nicht zu Ende – die Briten halten New York, Charleston und Savannah noch zwei Jahre –, aber politisch. Als die Nachricht London erreicht, soll Lord North gesagt haben: „O Gott, es ist alles vorbei.“ Im März 1782 stürzt seine Regierung, 1783 erkennt der Friede von Paris die Unabhängigkeit an. Frankreich hat gewonnen und dabei einen Schuldenberg aufgehäuft, der sechs Jahre später die Einberufung der Generalstände erzwingt.',
    uebersicht: true,
    sicht: [[-82.5, 28.5], [8.5, 56.5]],
    stellungen: [
      s('a-nachricht', 'all', 'pfeil', 'schiff', pfeil([-76.51, 37.24], [-70.00, 40.00], [-40.00, 46.00], [-10.00, 50.00], [-0.13, 51.51]), { name: 'Die Nachricht nach London, 25. November' }),
      s('bri-rest', 'bri', 'pfeil', 'schiff', pfeil([-73.92, 40.70], [-76.00, 34.00], [-79.94, 32.78], [-81.10, 32.08]), { name: 'New York, Charleston und Savannah, bis 1783' }),
      s('a-paris', 'all', 'pfeil', 'gemischt', pfeil([-76.51, 37.24], [-60.00, 42.00], [-20.00, 48.00], [2.35, 48.86]), { name: '1783: der Friede von Paris' }),
      s('a-schulden', 'all', 'pfeil', 'gemischt', pfeil([2.12, 48.80], [2.24, 48.83], [2.35, 48.86]), { name: '1789: die Rechnung dafür' }),
    ],
  },
];

export const yorktown = {
  id: 'yorktown',
  name: 'Yorktown',
  ort: 'Virginia, am York River',
  datum: '28. September bis 19. Oktober 1781',
  jahr: 1781,
  mitte: [-76.5080, 37.2350],
  zoom: 13.0,
  grund: 'relief',
  worum: 'Die Entscheidung fällt dreißig Seemeilen entfernt und drei Wochen vor dem ersten Schuss: Neuntausend Mann auf einer Landzunge sind so lange sicher, wie die Marine kommen kann – und am 5. September kann sie es nicht mehr. Danach ist die Belagerung nur noch die Ausführung, Nacht für Nacht einen Graben näher.',
  parteien,
  gelaende,
  stationen,
  ausgang: 'Cornwallis kapituliert am 19. Oktober 1781 mit rund 8.000 Mann. Es ist die zweite britische Armee, die in diesem Krieg als Ganzes verlorengeht.',
  verluste: [
    { partei: 'bri', text: 'rund 150 Tote, 320 Verwundete – und über 7.000 Gefangene, das ganze Heer' },
    { partei: 'all', text: 'rund 80 Tote und 190 Verwundete auf beiden Seiten des Bündnisses zusammen' },
  ],
  folgen: 'Der Krieg dauert militärisch noch zwei Jahre, politisch ist er entschieden: Im März 1782 stürzt die Regierung North, 1783 erkennt der Friede von Paris die Unabhängigkeit der Vereinigten Staaten an. Frankreich hat den Krieg gewonnen und sich dabei so verschuldet, dass 1789 die Generalstände einberufen werden müssen. Für Großbritannien verschiebt sich der Schwerpunkt des Empires nach Indien und in den Pazifik.',
  streit: 'Wie entscheidend die Seeschlacht vor den Kaps war, ist nicht strittig – strittig ist, warum Graves danach nach New York zurücksegelte statt zu bleiben, und wie viel Schuld Clinton daran trägt, dass der Entsatz erst am 24. Oktober ausläuft. Zwischen Clinton und Cornwallis begann noch während der Belagerung ein Schriftwechsel, der später öffentlich ausgetragen wurde und in dem jeder dem anderen die Verantwortung zuschob.',
};
