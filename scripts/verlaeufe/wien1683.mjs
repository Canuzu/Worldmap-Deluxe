#!/usr/bin/env node
/*
 * ACHTUNG – Verhältnis zu src/data/battles/wien1683.json: Dieses Skript hat
 * die JSON-Datei einmal erzeugt; danach ist die JSON-Datei die gültige Fassung.
 */
/**
 * Der Entsatz von Wien, 12. September 1683.
 *
 * Zwei Monate Belagerung, ein Tag Schlacht – und die Karte zeigt, warum der
 * eine Tag genügte. Das osmanische Heer liegt im Halbkreis vor der Stadt, mit
 * dem Rücken zum Wienerwald, den niemand für gangbar hält. Genau von dort
 * kommt das Entsatzheer: 60.000 Mann über bewaldete Höhen von 400 Metern, mit
 * Geschützen, in zwei Tagen. Am Nachmittag steht die Front dort, wo das Lager
 * ist, und nicht dort, wo die Belagerungsgräben zeigen.
 *
 * Der Kahlenberg liegt bei 16.33 Ost, 48.28 Nord, die Stadtmauer bei 16.37
 * Ost, 48.21 Nord; dazwischen fällt der Wald zum Donaukanal ab.
 */
import { linie, klumpen, pfeil } from '../lib/stellung.mjs';

const KAHLENBERG = [16.3320, 48.2790];
const NUSSDORF = [16.3560, 48.2560];
const STADT = [16.3720, 48.2090];
const LAGER = [16.3480, 48.1950];
const HERNALS = [16.3230, 48.2200];

const parteien = [
  {
    id: 'ent', name: 'Kaiserliche, Polen und Reichstruppen', farbe: '#6f9fe0',
    fuehrung: 'Johann III. Sobieski, Karl V. von Lothringen',
    staerke: '65.000 – davon 27.000 Polen', zahl: 65000,
  },
  {
    id: 'osm', name: 'Osmanisches Reich', farbe: '#7fbf7f',
    fuehrung: 'Kara Mustafa Pascha',
    staerke: 'rund 90.000 vor der Stadt, davon 20.000 in den Gräben', zahl: 90000,
  },
];

const gelaende = [
  { art: 'hoehe', name: 'Kahlenberg', punkte: klumpen(KAHLENBERG, 2.2, 1.3, 120) },
  { art: 'hoehe', name: 'Leopoldsberg', punkte: klumpen([16.3450, 48.2860], 1.4, 1.2, 100) },
  { art: 'wald', name: 'Wienerwald', punkte: klumpen([16.2950, 48.2400], 7.0, 1.4, 30) },
  { art: 'fluss', name: 'Donau', punkte: pfeil([16.3300, 48.3100], [16.3800, 48.2600], [16.4200, 48.2200], [16.4600, 48.1700]) },
  { art: 'stadt', name: 'Wien', punkte: klumpen(STADT, 2.0) },
  { art: 'mauer', name: 'Stadtmauer', punkte: klumpen(STADT, 2.4, 1.05, 20) },
  { art: 'weg', name: 'Weg über die Höhen', punkte: pfeil([16.3200, 48.2850], [16.3150, 48.2500], [16.3200, 48.2250]) },
];

const s = (id, partei, form, gattung, punkte, mehr = {}) => ({ id, partei, form, gattung, punkte, ...mehr });

const stationen = [
  {
    zeit: 'Juli 1683',
    t: 0,
    kurz: 'Ein Heer, wie es Mitteleuropa nicht gesehen hat.',
    text: 'Kara Mustafa führt das größte osmanische Heer seit Süleyman nach Norden. Der Kaiser verlässt Wien, die Stadt bleibt mit 15.000 Mann unter Ernst Rüdiger von Starhemberg zurück. Papst Innozenz XI. bringt eine Liga zustande; entscheidend ist der polnische König Johann III. Sobieski, der mit seiner Reiterei kommt.',
    uebersicht: true,
    sicht: [[13.5, 46.8], [21.5, 50.6]],
    stellungen: [
      s('anm-osm', 'osm', 'pfeil', 'gemischt', pfeil([19.05, 47.50], [17.60, 47.85], [16.60, 48.15]), { name: 'von Ofen die Donau aufwärts' }),
      s('anm-pol', 'ent', 'pfeil', 'reiter', pfeil([19.94, 50.06], [18.50, 49.60], [17.20, 48.80], [16.35, 48.32]), { name: 'Sobieski aus Krakau' }),
      s('anm-kai', 'ent', 'pfeil', 'gemischt', pfeil([15.20, 48.40], [15.90, 48.35], [16.30, 48.30]), { name: 'Lothringen von Westen' }),
    ],
  },
  {
    zeit: '14. Juli bis 6. September',
    t: 240,
    kurz: 'Acht Wochen Minen unter der Mauer.',
    text: 'Die Osmanen schießen nicht Bresche, sie graben. Woche für Woche schieben sich die Laufgräben an die Löwelbastei heran; unter der Mauer arbeiten die Minierer. Anfang September sind Ravelin und Bastei aufgesprengt, die Besatzung ist auf ein Drittel geschmolzen, in der Stadt herrscht die Ruhr. Starhemberg lässt Leuchtraketen steigen: das verabredete Zeichen, dass es dringend wird.',
    stellungen: [
      s('o-graeben', 'osm', 'flaeche', 'fuss', linie([16.3600, 48.2050], 2.0, 0.7, 70), { name: 'Laufgräben an der Löwelbastei', staerke: '20.000' }),
      s('o-lager', 'osm', 'flaeche', 'gemischt', klumpen(LAGER, 3.4), { name: 'Hauptlager', staerke: '60.000' }),
      s('o-nord', 'osm', 'flaeche', 'gemischt', linie([16.3600, 48.2350], 2.4, 0.8, 340), { name: 'Sicherung nach Norden', staerke: '10.000' }),
      s('w-stadt', 'ent', 'flaeche', 'fuss', klumpen(STADT, 2.0), { name: 'Starhemberg in der Stadt', staerke: '11.000', geschlagen: true }),
    ],
  },
  {
    zeit: '11. September',
    t: 420,
    kurz: 'Über den Wienerwald, den niemand für gangbar hält.',
    text: 'Das Entsatzheer kommt nicht durch die Ebene, sondern über die bewaldeten Höhen im Nordwesten – vierhundert Meter Anstieg, Geschütze an Seilen, zwei Tage. Kara Mustafa hat den Wienerwald für unpassierbar gehalten und seine Sicherung dorthin schwach gelassen; er lässt auch die Belagerung nicht abbrechen, um sich zu stellen. In der Nacht steht ein Heer von 65.000 Mann auf dem Kahlenberg.',
    stellungen: [
      s('e-kahlenberg', 'ent', 'flaeche', 'gemischt', klumpen(KAHLENBERG, 2.4), { name: 'Entsatzheer auf dem Kahlenberg', staerke: '65.000' }),
      s('e-marsch', 'ent', 'pfeil', 'gemischt', pfeil([16.2400, 48.3100], [16.2900, 48.2950], [16.3300, 48.2800]), { name: 'über die Höhen' }),
      s('o-lager', 'osm', 'flaeche', 'gemischt', klumpen(LAGER, 3.4), { name: 'Lager – die Belagerung läuft weiter', staerke: '60.000' }),
      s('o-graeben', 'osm', 'flaeche', 'fuss', linie([16.3600, 48.2050], 2.0, 0.7, 70), { name: 'in den Gräben', staerke: '20.000' }),
    ],
  },
  {
    zeit: '12. September, 4 Uhr',
    t: 480,
    kurz: 'Eine Messe auf dem Berg, dann geht es abwärts.',
    text: 'Vor Sonnenaufgang wird auf dem Kahlenberg die Messe gelesen; Sobieski dient dabei als Ministrant. Der linke Flügel unter Lothringen geht am Donauufer hinab, die Mitte durch die Weinberge, die Polen auf dem rechten Flügel haben den weitesten und schwersten Weg. Der Angriff beginnt nicht auf ein Kommando, sondern rollt von links nach rechts an.',
    stellungen: [
      s('e-links', 'ent', 'flaeche', 'gemischt', linie([16.3560, 48.2640], 2.2, 0.7, 170), { name: 'Lothringen am Donauufer', staerke: '20.000' }),
      s('e-mitte', 'ent', 'flaeche', 'fuss', linie([16.3320, 48.2660], 2.4, 0.7, 170), { name: 'Reichstruppen in der Mitte', staerke: '18.000' }),
      s('e-polen', 'ent', 'flaeche', 'reiter', linie([16.3010, 48.2640], 2.4, 0.8, 160), { name: 'Sobieski · rechter Flügel', staerke: '27.000' }),
      s('o-nord', 'osm', 'flaeche', 'gemischt', linie([16.3520, 48.2420], 3.6, 0.8, 340), { name: 'Sicherung nach Norden', staerke: '15.000' }),
      s('o-graeben', 'osm', 'flaeche', 'fuss', linie([16.3600, 48.2050], 2.0, 0.7, 70), { name: 'in den Gräben', staerke: '20.000' }),
    ],
  },
  {
    zeit: '9 Uhr',
    t: 540,
    kurz: 'Nussdorf fällt, der linke Flügel kommt in die Ebene.',
    text: 'Lothringen nimmt Nussdorf und Heiligenstadt und schiebt sich die Donau entlang auf die Stadt zu. Das ist der Flügel mit dem besten Boden, und er kommt am schnellsten voran. Kara Mustafa schickt Verstärkungen nach Norden – aber immer noch nicht so viele, dass die Belagerung aufhört.',
    stellungen: [
      s('e-links', 'ent', 'flaeche', 'gemischt', linie([16.3580, 48.2480], 2.2, 0.8, 170), { name: 'Lothringen nimmt Nussdorf', staerke: '20.000' }),
      s('e-mitte', 'ent', 'flaeche', 'fuss', linie([16.3300, 48.2540], 2.4, 0.8, 170), { name: 'Mitte in den Weinbergen', staerke: '18.000' }),
      s('e-polen', 'ent', 'flaeche', 'reiter', linie([16.2960, 48.2520], 2.4, 0.8, 160), { name: 'Polen im schweren Gelände', staerke: '27.000' }),
      s('o-nord', 'osm', 'flaeche', 'gemischt', linie([16.3480, 48.2330], 3.8, 0.9, 340), { name: 'Gegenwehr', staerke: '20.000' }),
      s('o-graeben', 'osm', 'flaeche', 'fuss', linie([16.3600, 48.2050], 2.0, 0.7, 70), { name: 'gräbt weiter', staerke: '20.000' }),
    ],
  },
  {
    zeit: '13 Uhr',
    t: 600,
    kurz: 'Der Fehler: Er lässt die Gräben nicht räumen.',
    text: 'Kara Mustafa steht vor der Wahl, die Belagerung abzubrechen und sein ganzes Heer nach Norden zu drehen – oder beides zu versuchen. Er versucht beides. Zwanzigtausend Mann bleiben in den Laufgräben und sprengen noch am Nachmittag eine Mine, während der Rest sich nach Norden wendet. Damit ist er an der entscheidenden Stelle schwächer, als er sein müsste.',
    stellungen: [
      s('o-nord', 'osm', 'flaeche', 'gemischt', linie([16.3420, 48.2260], 5.0, 1.0, 340), { name: 'Front nach Norden', staerke: '45.000' }),
      s('o-graeben', 'osm', 'flaeche', 'fuss', linie([16.3600, 48.2050], 2.0, 0.7, 70), { name: 'bleibt in den Gräben', staerke: '20.000', finte: true }),
      s('e-links', 'ent', 'flaeche', 'gemischt', linie([16.3560, 48.2380], 2.2, 0.8, 170), { name: 'Lothringen', staerke: '19.000' }),
      s('e-mitte', 'ent', 'flaeche', 'fuss', linie([16.3280, 48.2420], 2.6, 0.8, 170), { name: 'Mitte', staerke: '17.000' }),
      s('e-polen', 'ent', 'flaeche', 'reiter', linie([16.2940, 48.2380], 2.6, 0.9, 160), { name: 'Polen erreichen offenes Feld', staerke: '26.000' }),
    ],
  },
  {
    zeit: '16 Uhr',
    t: 660,
    kurz: 'Sobieski kommt aus dem Wald – und sieht das Lager offen.',
    text: 'Am späten Nachmittag hat der polnische Flügel den Wald hinter sich und steht auf den Hängen über Hernals. Vor ihm liegt nicht die Front, sondern das osmanische Hauptlager mit den Zelten, dem Tross und der Kasse. Sobieski lässt die Husaren aufsitzen: rund 3.000 schwere Reiter in der ersten Welle, die größte Reiterattacke, die bis dahin geritten wurde.',
    stellungen: [
      s('e-polen', 'ent', 'flaeche', 'reiter', linie([16.3080, 48.2260], 2.6, 0.9, 150), { name: 'Husaren sitzen auf', staerke: '20.000' }),
      s('e-husaren', 'ent', 'pfeil', 'reiter', pfeil([16.3120, 48.2230], [16.3300, 48.2080], [16.3450, 48.1980]), { name: 'auf das Lager' }),
      s('o-nord', 'osm', 'flaeche', 'gemischt', linie([16.3420, 48.2230], 5.0, 1.0, 340), { name: 'Front nach Norden', staerke: '40.000' }),
      s('o-lager', 'osm', 'flaeche', 'gemischt', klumpen(LAGER, 3.2), { name: 'Hauptlager – fast ungedeckt', staerke: 'Tross' }),
      s('e-links', 'ent', 'flaeche', 'gemischt', linie([16.3560, 48.2300], 2.2, 0.8, 170), { name: 'Lothringen', staerke: '19.000' }),
    ],
  },
  {
    zeit: '17:30 Uhr',
    t: 690,
    kurz: 'Die Attacke, nach der niemand mehr steht.',
    text: 'Die Husaren reiten den Hang hinunter in die Flanke und in das Lager. Die osmanische Front hat keine Zeit, sich zu drehen; wer im Lager steht, sieht Reiterei zwischen den Zelten. Binnen einer halben Stunde löst sich das Heer auf. Kara Mustafa lässt das Reichsbanner und den grünen Prophetenmantel retten und reitet nach Süden.',
    stellungen: [
      s('e-husaren', 'ent', 'pfeil', 'reiter', pfeil([16.3200, 48.2160], [16.3400, 48.2000], [16.3550, 48.1930]), { name: 'mitten ins Lager' }),
      s('o-lager', 'osm', 'flaeche', 'gemischt', klumpen(LAGER, 3.0), { name: 'Lager überrannt', staerke: 'Tross', geschlagen: true }),
      s('o-nord', 'osm', 'flaeche', 'gemischt', linie([16.3480, 48.2210], 4.2, 1.0, 340), { name: 'Front bricht', staerke: '35.000', geschlagen: true }),
      s('e-polen', 'ent', 'flaeche', 'reiter', linie([16.3180, 48.2200], 2.4, 0.9, 150), { name: 'Polen', staerke: '20.000' }),
      s('e-links', 'ent', 'flaeche', 'gemischt', linie([16.3560, 48.2240], 2.2, 0.8, 170), { name: 'Lothringen drückt nach', staerke: '19.000' }),
      s('w-stadt', 'ent', 'flaeche', 'fuss', klumpen(STADT, 1.9), { name: 'Besatzung fällt aus', staerke: '4.000' }),
    ],
  },
  {
    zeit: 'Abend',
    t: 750,
    kurz: '„Venimus, vidimus, Deus vicit.“',
    text: 'Am Abend schläft Sobieski im Zelt des Großwesirs. Nach Rom schreibt er den Satz, der von Caesar geborgt und umgedreht ist: Wir kamen, wir sahen, Gott hat gesiegt. Im Lager stehen die Kanonen, die Kasse, Tausende Zelte – und Säcke mit Bohnen, aus denen in Wien angeblich das Kaffeehaus entsteht. Das ist eine schöne Geschichte, für die es keinen Beleg gibt.',
    stellungen: [
      s('e-lager', 'ent', 'flaeche', 'gemischt', klumpen(LAGER, 3.0), { name: 'Das eroberte Lager', staerke: '65.000' }),
      s('o-flucht', 'osm', 'pfeil', 'gemischt', pfeil([16.3480, 48.1900], [16.3800, 48.1300], [16.4400, 48.0700]), { name: 'Abzug nach Südosten', rueckzug: true }),
      s('w-stadt', 'ent', 'flaeche', 'fuss', klumpen(STADT, 2.0), { name: 'Wien entsetzt', staerke: '11.000' }),
    ],
  },
  {
    zeit: 'Dezember 1683 bis 1699',
    t: 900,
    kurz: 'Aus einer Belagerung wird ein Rückzug über sechzehn Jahre.',
    text: 'Kara Mustafa wird am 25. Dezember in Belgrad auf Befehl des Sultans mit der Seidenschnur hingerichtet. Aus dem Entsatz wird ein Gegenangriff: Ofen fällt 1686, Belgrad 1688, bei Zenta vernichtet Prinz Eugen 1697 ein ganzes Heer. Im Frieden von Karlowitz 1699 gibt das Osmanische Reich Ungarn und Siebenbürgen ab – zum ersten Mal tritt es Gebiet an eine europäische Macht ab.',
    uebersicht: true,
    sicht: [[13.0, 42.5], [24.0, 50.5]],
    stellungen: [
      s('e-vorstoss', 'ent', 'pfeil', 'gemischt', pfeil([16.37, 48.21], [17.60, 47.70], [19.04, 47.50], [20.14, 44.82]), { name: 'Ofen 1686, Belgrad 1688' }),
      s('o-rueckzug', 'osm', 'pfeil', 'gemischt', pfeil([19.04, 47.50], [20.40, 45.60], [22.00, 44.20]), { name: 'Karlowitz 1699', rueckzug: true }),
    ],
  },
];

export const wien1683 = {
  id: 'wien1683',
  name: 'Der Entsatz von Wien',
  ort: 'Kahlenberg und Wienerwald',
  datum: '12. September 1683',
  jahr: 1715,
  mitte: [16.3400, 48.2350],
  zoom: 11.9,
  grund: 'relief',
  worum: 'Zwei Monate Belagerung, ein Tag Schlacht. Das Entsatzheer kommt über den Wienerwald, den der Großwesir für unpassierbar hielt – und trifft am Nachmittag nicht auf die Front, sondern auf das ungedeckte Lager.',
  parteien,
  gelaende,
  stationen,
  ausgang: 'Das osmanische Heer löst sich binnen einer Stunde auf und lässt das gesamte Lager mit Geschützen und Kasse zurück. Wien ist entsetzt.',
  verluste: [
    { partei: 'osm', text: '10.000 bis 15.000 Gefallene, die gesamte Belagerungsartillerie' },
    { partei: 'ent', text: 'rund 3.500 – dazu die Verluste der Belagerungszeit in der Stadt' },
  ],
  folgen: 'Kara Mustafa wird im Dezember hingerichtet. Aus dem Entsatz wird ein Gegenangriff, der sechzehn Jahre dauert: Ofen 1686, Belgrad 1688, Zenta 1697. Im Frieden von Karlowitz 1699 tritt das Osmanische Reich Ungarn und Siebenbürgen ab – die erste Gebietsabtretung an eine europäische Macht.',
  streit: 'Ob Sobieski oder Lothringen den Ausschlag gab, ist seit dreihundert Jahren ein nationaler Streit und hängt daran, wen man fragt. Die Erzählung, das Wiener Kaffeehaus stamme aus den erbeuteten Bohnensäcken, ist eine Legende des 18. Jahrhunderts; ebenso das Croissant als Nachbildung des Halbmonds.',
};
