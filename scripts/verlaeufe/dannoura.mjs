#!/usr/bin/env node
/*
 * ACHTUNG – Verhältnis zu src/data/battles/dannoura.json: Dieses Skript hat die
 * JSON-Datei einmal erzeugt; danach ist die JSON-Datei die gültige Fassung.
 */
/**
 * Dan-no-ura, 25. April 1185.
 *
 * Die einzige Schlacht dieser Sammlung, deren Wendepunkt eine Uhrzeit ist.
 * Durch die Meerenge von Shimonoseki läuft der Gezeitenstrom mit bis zu acht
 * Knoten – schneller, als ein Rudererboot des 12. Jahrhunderts gegen ihn
 * ankommt. Am Vormittag setzt er nach Osten und trägt die Taira gegen die
 * Minamoto; gegen Mittag kehrt er um und trägt die Minamoto gegen die Taira.
 *
 * Wer die Enge sieht und weiß, wohin das Wasser wann läuft, hat die Schlacht
 * verstanden: Es gibt keinen Weg quer heraus, und die Richtung, in der man
 * kämpfen kann, wechselt an einem einzigen Punkt des Tages.
 *
 * Die Enge liegt bei rund 130.96 Ost, 33.96 Nord.
 */
import { linie, klumpen, pfeil } from '../lib/stellung.mjs';

const ENGE = [130.9520, 33.9540];
const MITTE = [130.9800, 33.9610];

const parteien = [
  {
    id: 'tai', name: 'Taira', farbe: '#d4737c',
    fuehrung: 'Taira no Tomomori, Taira no Munemori, Taira no Tokiko',
    staerke: 'rund 500 Schiffe – mit dem siebenjährigen Kaiser Antoku und den Reichsinsignien an Bord',
    zahl: 500,
  },
  {
    id: 'min', name: 'Minamoto', farbe: '#6f9fe0',
    fuehrung: 'Minamoto no Yoshitsune, Minamoto no Noriyori, Kajiwara Kagetoki',
    staerke: 'rund 800 Schiffe, dazu die übergelaufenen Flotten von Kyushu und Shikoku',
    zahl: 800,
  },
];

const gelaende = [
  {
    art: 'stroemung', name: 'Die Meerenge von Shimonoseki',
    punkte: pfeil([130.9150, 33.9420], [130.9520, 33.9540], [130.9900, 33.9620], [131.0400, 33.9740]),
  },
  { art: 'stroemung', name: 'Hayatomo no Seto · die Enge, bis acht Knoten', punkte: klumpen(ENGE, 1.6, 2.2, 65) },
  { art: 'stadt', name: 'Dan-no-ura am Nordufer', punkte: klumpen([130.9660, 33.9660], 0.9) },
  { art: 'stadt', name: 'Moji am Südufer', punkte: klumpen([130.9640, 33.9420], 0.9) },
  { art: 'hoehe', name: 'Hikoshima · der Ankerplatz der Taira', punkte: klumpen([130.9150, 33.9400], 2.4, 1.3, 65) },
];

const s = (id, partei, form, gattung, punkte, mehr = {}) => ({ id, partei, form, gattung, punkte, ...mehr });

const stationen = [
  {
    zeit: '1180 bis 1185',
    t: 0,
    kurz: 'Fünf Jahre Bürgerkrieg treiben eine Sippe ans Meer.',
    text: 'Der Genpei-Krieg ist der Streit zweier Kriegersippen um die Herrschaft hinter dem Kaiserhaus. Nach 1183 verlieren die Taira die Hauptstadt und weichen mit dem Kindkaiser und den Reichsinsignien immer weiter nach Westen aus: Ichinotani, Yashima, zuletzt die Inseln vor der Meerenge von Shimonoseki. Weiter geht es nicht; hinter ihnen liegt offene See.',
    uebersicht: true,
    sicht: [[128.5, 30.5], [141.5, 38.5]],
    stellungen: [
      s('anm-tai', 'tai', 'pfeil', 'schiff', pfeil([135.77, 34.98], [135.18, 34.69], [134.05, 34.35], [132.46, 34.39], [130.96, 33.96]), { name: 'Die Taira weichen nach Westen aus' }),
      s('anm-min', 'min', 'pfeil', 'gemischt', pfeil([139.55, 35.32], [137.20, 35.10], [135.77, 34.98], [134.05, 34.20], [131.20, 33.99]), { name: 'Yoritomo und Yoshitsune folgen' }),
      s('anm-kyushu', 'min', 'pfeil', 'schiff', pfeil([130.40, 33.60], [130.70, 33.80], [131.05, 33.97]), { name: 'Kyushu läuft über' }),
    ],
  },
  {
    zeit: 'Morgen des 25. April',
    t: 60,
    kurz: 'Die Flotten treffen sich am Ostausgang der Enge.',
    text: 'Die Taira laufen von Hikoshima aus, die Minamoto kommen von Osten aus der Binnensee. Zwischen ihnen liegt eine Wasserstraße, die an der engsten Stelle keinen Kilometer breit ist. Auf der Taira-Seite stehen erfahrene Seeleute der Inlandsee; auf der Gegenseite Landkrieger, die erst seit Monaten zu Schiff kämpfen – dafür in der Überzahl.',
    stellungen: [
      s('t-flotte', 'tai', 'flaeche', 'schiff', linie([130.9560, 33.9550], 2.6, 1.0, 65), { name: 'Die Taira laufen aus', staerke: '500 Schiffe' }),
      s('m-flotte', 'min', 'flaeche', 'schiff', linie([131.0150, 33.9680], 3.2, 1.2, 245), { name: 'Die Minamoto aus der Binnensee', staerke: '800 Schiffe' }),
    ],
  },
  {
    zeit: 'Acht Uhr',
    t: 120,
    kurz: 'Der Strom setzt nach Osten – für die Taira.',
    text: 'Am Vormittag läuft die Tide nach Osten. Die Taira nutzen sie, teilen sich in drei Geschwader und greifen mit dem Strom an: Sie kommen schnell heran, die Gegenseite kommt langsam vom Fleck. Es beginnt mit Pfeilschüssen auf große Entfernung, dann werden die Schiffe längsseits gelegt und geentert.',
    stellungen: [
      s('t-flotte', 'tai', 'flaeche', 'schiff', linie([130.9800, 33.9600], 3.0, 1.0, 65), { name: 'Angriff mit dem Strom', staerke: '500 Schiffe' }),
      s('t-stoss', 'tai', 'pfeil', 'schiff', pfeil([130.9750, 33.9600], [131.0000, 33.9640], [131.0200, 33.9680]), { name: 'mit der Tide nach Osten' }),
      s('m-flotte', 'min', 'flaeche', 'schiff', linie([131.0300, 33.9710], 3.4, 1.2, 245), { name: 'kommt gegen den Strom nicht vor', staerke: '800 Schiffe', geschlagen: true }),
      s('t-strom', 'tai', 'pfeil', 'schiff', pfeil([130.9300, 33.9500], [130.9700, 33.9580], [131.0100, 33.9660]), { name: 'Der Gezeitenstrom, vormittags' }),
    ],
  },
  {
    zeit: 'Vormittag',
    t: 180,
    kurz: 'Ein Köderschiff und ein Verräter, der es verrät.',
    text: 'Die Taira haben die Vorsichtsmaßnahme getroffen, den Hof auf ein schlichtes Schiff zu setzen und die Krieger auf das prächtige – wer das Flaggschiff entert, findet dort Bewaffnete statt der Beute. Der List setzt Taira no Shigeyoshi ein Ende: Er läuft über und sagt Yoshitsune, auf welchem Schiff der Kaiser wirklich ist.',
    stellungen: [
      s('t-koeder', 'tai', 'flaeche', 'schiff', klumpen([131.0000, 33.9640], 0.7), { name: 'Das prächtige Köderschiff', finte: true }),
      s('t-kaiser', 'tai', 'flaeche', 'schiff', klumpen([130.9700, 33.9580], 0.7), { name: 'Das Schiff des Kaisers' }),
      s('t-flotte', 'tai', 'flaeche', 'schiff', linie([130.9850, 33.9610], 3.0, 1.0, 65), { name: 'Die Taira drücken weiter', staerke: '500 Schiffe' }),
      s('m-flotte', 'min', 'flaeche', 'schiff', linie([131.0300, 33.9710], 3.4, 1.2, 245), { name: 'hält sich', staerke: '800 Schiffe' }),
      s('m-verrat', 'min', 'pfeil', 'schiff', pfeil([130.9950, 33.9630], [131.0150, 33.9670], [131.0290, 33.9700]), { name: 'Shigeyoshi läuft über' }),
    ],
  },
  {
    zeit: 'Gegen elf',
    t: 240,
    kurz: 'Yoshitsune lässt auf Ruderer und Steuerleute schießen.',
    text: 'Yoshitsune gibt einen Befehl, der gegen die Übereinkunft seines Standes verstößt: nicht auf die Krieger zu schießen, sondern auf die Ruderer und Steuerleute, die als Nichtkämpfer gelten. Ein Schiff ohne Steuermann treibt in einer Strömung von mehreren Knoten dorthin, wohin das Wasser will. Die Taira-Formation beginnt sich aufzulösen, bevor sich die Tide überhaupt dreht.',
    stellungen: [
      s('m-bogen', 'min', 'flaeche', 'bogen', linie([131.0200, 33.9680], 3.0, 0.8, 245), { name: 'Bogenschützen auf die Ruderer' }),
      s('m-schuss', 'min', 'pfeil', 'bogen', pfeil([131.0150, 33.9670], [130.9980, 33.9640], [130.9850, 33.9615]), {}),
      s('t-flotte', 'tai', 'flaeche', 'schiff', linie([130.9850, 33.9610], 3.2, 1.2, 65), { name: 'Schiffe ohne Steuerleute', staerke: '500 Schiffe', geschlagen: true }),
      s('m-flotte', 'min', 'flaeche', 'schiff', linie([131.0280, 33.9705], 3.4, 1.2, 245), { name: 'schließt auf', staerke: '800 Schiffe' }),
    ],
  },
  {
    zeit: 'Mittag',
    t: 300,
    kurz: 'Der Strom kehrt um, und mit ihm die Schlacht.',
    text: 'Um die Mittagszeit läuft die Tide aus, kehrt um und setzt nach Westen. Damit haben die Minamoto den Strom im Rücken und die Taira ihn vor dem Bug. Dieselbe Enge, die am Vormittag den einen half, arbeitet jetzt für die anderen – und zwar mit einer Wucht, gegen die man nicht anrudern kann.',
    stellungen: [
      s('m-strom', 'min', 'pfeil', 'schiff', pfeil([131.0400, 33.9740], [131.0000, 33.9650], [130.9600, 33.9560]), { name: 'Der Gezeitenstrom, nachmittags' }),
      s('m-flotte', 'min', 'flaeche', 'schiff', linie([131.0000, 33.9650], 3.4, 1.2, 245), { name: 'Angriff mit dem Strom', staerke: '800 Schiffe' }),
      s('t-flotte', 'tai', 'flaeche', 'schiff', linie([130.9640, 33.9570], 3.0, 1.2, 65), { name: 'gegen den Strom gedrückt', staerke: '500 Schiffe', geschlagen: true }),
    ],
  },
  {
    zeit: 'Früher Nachmittag',
    t: 360,
    kurz: 'In die Enge geschoben, wo kein Ausweichen ist.',
    text: 'Die Taira werden nach Westen in die engste Stelle geschoben, wo Schiff an Schiff liegt und niemand mehr manövriert. Die Verbände aus Shikoku und Kyushu, die bis eben mitgefochten haben, drehen ab oder laufen über. Was bleibt, ist der Kern der Sippe auf wenigen hundert Metern Wasser.',
    stellungen: [
      s('t-flotte', 'tai', 'flaeche', 'schiff', klumpen([130.9540, 33.9545], 1.8, 1.4, 65), { name: 'in der Enge zusammengeschoben', staerke: 'was noch da ist', geschlagen: true }),
      s('m-flotte', 'min', 'flaeche', 'schiff', linie([130.9800, 33.9600], 3.2, 1.4, 245), { name: 'schiebt nach', staerke: '800 Schiffe' }),
      s('t-abfall', 'tai', 'pfeil', 'schiff', pfeil([130.9700, 33.9500], [130.9500, 33.9420], [130.9250, 33.9380]), { name: 'Verbündete drehen ab', rueckzug: true }),
      s('m-stoss', 'min', 'pfeil', 'schiff', pfeil([130.9750, 33.9590], [130.9650, 33.9570], [130.9580, 33.9555]), {}),
    ],
  },
  {
    zeit: 'Der Sprung',
    t: 420,
    kurz: 'Die Großmutter springt mit dem Kaiser ins Meer.',
    text: 'Als klar ist, dass es vorbei ist, nimmt Taira no Tokiko, die Großmutter des siebenjährigen Antoku, das Kind auf den Arm, steckt das Schwert in den Gürtel und den Jaspis in die Falten des Gewandes. Auf die Frage des Kindes, wohin sie gehe, antwortet sie nach dem Heike monogatari, auch auf dem Grund des Meeres gebe es eine Hauptstadt. Dann springt sie. Tomomori bindet sich einen Anker an die Füße; andere folgen. Munemori wird lebend herausgezogen und später hingerichtet.',
    stellungen: [
      s('t-kaiser', 'tai', 'flaeche', 'schiff', klumpen([130.9530, 33.9540], 0.5), { name: 'Das Schiff des Kaisers', geschlagen: true }),
      s('t-flotte', 'tai', 'flaeche', 'schiff', klumpen([130.9560, 33.9548], 1.4, 1.4, 65), { name: 'Die Sippe geht unter', staerke: 'Reste', geschlagen: true }),
      s('m-flotte', 'min', 'flaeche', 'schiff', linie([130.9740, 33.9585], 3.0, 1.4, 245), { name: 'Die Minamoto', staerke: '800 Schiffe' }),
    ],
  },
  {
    zeit: 'Danach',
    t: 480,
    kurz: 'Von drei Insignien wird eine nie wieder gefunden.',
    text: 'Der Spiegel und der Jaspis werden aus dem Wasser geborgen – der Jaspis soll in seinem Kästchen an die Oberfläche getrieben sein. Das Schwert Kusanagi bleibt verschwunden; was heute in Nagoya als Reichsschwert gilt, ist nach eigener Überlieferung ein Ersatz. Die Fischer der Meerenge fangen bis heute Krabben, deren Panzer wie ein zorniges Gesicht gezeichnet ist, und nennen sie Heike-Krabben.',
    stellungen: [
      s('m-flotte', 'min', 'flaeche', 'schiff', linie([130.9620, 33.9560], 3.0, 1.4, 245), { name: 'Die Meerenge nach der Schlacht', staerke: '800 Schiffe' }),
      s('m-bergung', 'min', 'pfeil', 'schiff', pfeil([130.9700, 33.9575], [130.9600, 33.9555], [130.9530, 33.9542]), { name: 'Spiegel und Jaspis geborgen' }),
      s('t-flotte', 'tai', 'flaeche', 'schiff', klumpen([130.9520, 33.9538], 0.9, 1.3, 65), { name: 'Was übrig ist', staerke: 'Gefangene', geschlagen: true }),
    ],
  },
  {
    zeit: 'Nach 1185',
    t: 560,
    kurz: 'Japan bekommt eine zweite Regierung neben dem Hof.',
    text: 'Yoritomo baut in Kamakura eine Militärregierung auf und lässt sich 1192 zum Shogun ernennen – der Kaiserhof bleibt in Kyoto und behält die Würde, die Macht liegt anderswo. Diese Doppelung hält, mit wechselnden Häusern, bis 1868. Yoshitsune, der die Schlacht gewonnen hat, überwirft sich mit seinem Bruder, wird gejagt und tötet sich 1189 im Norden; er wird dadurch zur beliebtesten tragischen Gestalt der japanischen Überlieferung.',
    uebersicht: true,
    sicht: [[127.5, 29.5], [143.5, 42.5]],
    stellungen: [
      s('m-kamakura', 'min', 'pfeil', 'gemischt', pfeil([130.96, 33.96], [133.50, 34.30], [135.77, 34.98], [139.55, 35.32]), { name: 'Die Macht wandert nach Kamakura' }),
      s('m-yoshitsune', 'min', 'pfeil', 'reiter', pfeil([135.77, 34.98], [137.20, 36.20], [140.10, 38.30], [141.10, 39.00]), { name: 'Yoshitsune auf der Flucht, bis 1189' }),
      s('t-ende', 'tai', 'pfeil', 'schiff', pfeil([130.96, 33.95], [131.80, 33.30], [130.40, 32.80]), { name: 'Versprengte Taira in den Bergdörfern' }),
    ],
  },
];

export const dannoura = {
  id: 'dannoura',
  name: 'Dan-no-ura',
  ort: 'Die Meerenge von Shimonoseki',
  datum: '25. April 1185',
  jahr: 1185,
  mitte: [130.9800, 33.9610],
  zoom: 12.2,
  see: true,
  grund: 'blatt',
  worum: 'Der Wendepunkt ist eine Uhrzeit. Durch die Enge von Shimonoseki läuft der Gezeitenstrom mit bis zu acht Knoten – schneller, als ein Ruderschiff dagegen ankommt. Am Vormittag setzt er nach Osten und trägt die Taira gegen die Minamoto; gegen Mittag kehrt er um. Quer heraus führt kein Weg, und die Richtung, in der man kämpfen kann, wechselt an einem einzigen Punkt des Tages.',
  parteien,
  gelaende,
  stationen,
  ausgang: 'Die Taira-Flotte wird in die Enge geschoben und vernichtet. Der Kindkaiser Antoku ertrinkt; das Reichsschwert bleibt verschwunden.',
  verluste: [
    { partei: 'tai', text: 'die Flotte und die Sippe – der Kaiser, Tokiko, Tomomori und der größte Teil des Hauses tot oder gefangen' },
    { partei: 'min', text: 'nicht überliefert; nach allen Berichten gering' },
  ],
  folgen: 'Der Genpei-Krieg ist entschieden. Yoritomo errichtet in Kamakura eine Militärregierung und lässt sich 1192 zum Shogun ernennen; der Kaiserhof behält die Würde, die Macht liegt fortan bei den Kriegerhäusern – eine Doppelung, die bis 1868 hält. Yoshitsune wird von seinem eigenen Bruder gejagt und tötet sich 1189. Das Heike monogatari, aus dem fast alles über diesen Tag stammt, wird über Jahrhunderte von blinden Sängern vorgetragen und ist bis heute Schulstoff.',
  streit: 'Fast der ganze Ablauf steht nur im Heike monogatari, einer Dichtung, die rund ein Jahrhundert später aufgeschrieben wurde und offen erbauliche Zwecke verfolgt. Ob der Gezeitenwechsel die Schlacht wirklich entschied, ist umstritten: Die Rekonstruktion der Strömungsverhältnisse vom 25. April 1185 wurde in den 1970er Jahren berechnet und wird seither auch bezweifelt. Die Zahl der Schiffe schwankt je nach Handschrift.',
};
