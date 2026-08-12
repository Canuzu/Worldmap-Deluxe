#!/usr/bin/env node
/*
 * ACHTUNG – Verhältnis zu src/data/battles/salamis.json: Dieses Skript hat die
 * JSON-Datei einmal erzeugt; danach ist die JSON-Datei die gültige Fassung.
 */
/**
 * Salamis, September 480 v. Chr.
 *
 * Die Karte ist hier das ganze Argument. Zwischen der Insel Salamis und der
 * attischen Küste liegt eine Enge von rund anderthalb Kilometern. Draußen im
 * Saronischen Golf hat die persische Flotte drei- bis viermal so viele
 * Schiffe; drinnen kann sie höchstens so viele nebeneinander bringen wie die
 * griechische. Themistokles' ganze Leistung besteht darin, den Gegner dazu zu
 * bringen, in diese Enge hineinzufahren.
 *
 * Er tut das mit einer Nachricht: Sein Sklave Sikinnos wird zu Xerxes
 * geschickt und meldet, die Griechen stritten und wollten in der Nacht
 * fliehen. Wer das glaubt, sperrt die Ausgänge – und liegt am Morgen mit einer
 * müde geruderten Flotte in einem Schlauch.
 *
 * Die Enge liegt bei 23.55 Ost, 37.95 Nord; Xerxes' Thron stand am
 * Aigaleos-Hang gegenüber.
 */
import { linie, klumpen, pfeil } from '../lib/stellung.mjs';

const ENGE = [23.5560, 37.9480];
const BUCHT = [23.5000, 37.9520];

const parteien = [
  {
    id: 'gr', name: 'Griechische Bündnisflotte', farbe: '#6f9fe0',
    fuehrung: 'Themistokles, Eurybiades',
    staerke: 'rund 370 Trieren', zahl: 370,
  },
  {
    id: 'per', name: 'Perserreich', farbe: '#d4737c',
    fuehrung: 'Xerxes I., Ariabignes',
    staerke: '600 bis 800 Schiffe, davon phönizische und ionische', zahl: 700,
  },
];

const gelaende = [
  { art: 'hoehe', name: 'Salamis', punkte: klumpen([23.4700, 37.9450], 14.0, 1.4, 70) },
  { art: 'hoehe', name: 'Psyttaleia', punkte: klumpen([23.5760, 37.9370], 1.1) },
  { art: 'hoehe', name: 'Aigaleos', punkte: klumpen([23.6050, 37.9700], 5.0, 1.4, 20) },
  { art: 'stadt', name: 'Piräus', punkte: klumpen([23.6420, 37.9430], 2.0) },
];

const s = (id, partei, form, gattung, punkte, mehr = {}) => ({ id, partei, form, gattung, punkte, ...mehr });

const stationen = [
  {
    zeit: 'August 480',
    t: 0,
    kurz: 'Nach den Thermopylen steht Attika offen.',
    text: 'Der Engpass bei den Thermopylen ist gefallen, das Heer des Xerxes zieht nach Süden. Athen wird geräumt – die Bevölkerung geht auf Salamis, Aigina und in die Peloponnes. Die Akropolis brennt. Was den Griechen bleibt, ist die Flotte, und über die wird gestritten: Die Peloponnesier wollen sich an den Isthmos zurückziehen, Themistokles will bleiben.',
    uebersicht: true,
    sicht: [[22.4, 36.9], [24.6, 39.2]],
    stellungen: [
      s('anm-per', 'per', 'pfeil', 'schiff', pfeil([23.90, 39.00], [23.72, 38.40], [23.62, 37.98]), { name: 'Persische Flotte von Norden' }),
      s('anm-gr', 'gr', 'pfeil', 'schiff', pfeil([23.75, 38.35], [23.62, 38.05], [23.50, 37.95]), { name: 'Griechen nach Salamis' }),
    ],
  },
  {
    zeit: 'Der Kriegsrat',
    t: 90,
    kurz: 'Schlag, aber höre mich an.',
    text: 'Im Rat der Feldherren droht Eurybiades, Themistokles mit dem Stab zu schlagen, als der nicht aufhört zu reden. „Schlag zu, aber höre mich an“, soll dieser geantwortet haben. Sein Argument ist geografisch: In der Enge zählt Zahl nicht, im offenen Wasser vor dem Isthmos zählt sie sehr wohl. Er setzt sich nicht durch – die Peloponnesier wollen abfahren.',
    stellungen: [
      s('g-flotte', 'gr', 'flaeche', 'schiff', klumpen(BUCHT, 5.0, 1.4, 90), { name: 'Griechische Flotte in der Bucht', staerke: '370 Trieren' }),
      s('p-flotte', 'per', 'flaeche', 'schiff', klumpen([23.6600, 37.9200], 7.0, 1.5, 60), { name: 'Perser vor Phaleron', staerke: '700 Schiffe' }),
    ],
  },
  {
    zeit: 'Die Nacht davor',
    t: 150,
    kurz: 'Eine Nachricht, die eine Falle ist.',
    text: 'Themistokles schickt seinen Sklaven Sikinnos zu Xerxes: Die Griechen seien zerstritten und wollten in der Nacht davonfahren; wer jetzt die Ausgänge sperre, bekomme sie alle. Xerxes glaubt es. Er lässt die Flotte auslaufen und beide Enden der Enge besetzen – und damit ist die Entscheidung gefallen, bevor ein Schiff gerammt hat: Die Griechen können nicht mehr weg, und die Perser müssen hinein.',
    stellungen: [
      s('p-sperreO', 'per', 'flaeche', 'schiff', linie([23.6150, 37.9350], 4.0, 1.0, 250), { name: 'Sperrt die Ostausfahrt', staerke: '400 Schiffe' }),
      s('p-sperreW', 'per', 'flaeche', 'schiff', linie([23.4200, 37.9750], 3.0, 1.0, 110), { name: 'Sperrt den Westausgang', staerke: '150 Schiffe' }),
      s('p-psyttaleia', 'per', 'flaeche', 'fuss', klumpen([23.5760, 37.9370], 1.0), { name: 'Truppen auf Psyttaleia', staerke: '400 Mann' }),
      s('g-flotte', 'gr', 'flaeche', 'schiff', klumpen(BUCHT, 5.0, 1.4, 90), { name: 'eingeschlossen – und bereit', staerke: '370 Trieren' }),
    ],
  },
  {
    zeit: 'Morgengrauen',
    t: 210,
    kurz: 'Xerxes lässt sich einen Thron aufstellen.',
    text: 'Der Großkönig lässt am Hang des Aigaleos einen Thron aufbauen, mit Schreibern daneben, die notieren sollen, welcher Befehlshaber sich auszeichnet. Von dort sieht man die ganze Enge. Es ist der einzige Fall der Antike, in dem eine große Seeschlacht vollständig vom Land aus beobachtet wurde – und die Griechen wissen es.',
    stellungen: [
      s('p-thron', 'per', 'flaeche', 'fuss', klumpen([23.6020, 37.9640], 0.8), { name: 'Xerxes’ Thron am Aigaleos', staerke: 'Hofstaat' }),
      s('p-einfahrt', 'per', 'flaeche', 'schiff', linie([23.5900, 37.9420], 3.6, 1.4, 250), { name: 'fährt in die Enge ein', staerke: '400 Schiffe' }),
      s('g-flotte', 'gr', 'flaeche', 'schiff', linie([23.5150, 37.9530], 4.0, 1.0, 100), { name: 'wartet an der Küste', staerke: '370 Trieren' }),
    ],
  },
  {
    zeit: 'Erste Stunde',
    t: 260,
    kurz: 'Die Enge zwingt sie in drei Reihen hintereinander.',
    text: 'In der Enge ist Platz für vielleicht siebzig Schiffe nebeneinander. Die persische Flotte muss sich also hintereinander staffeln; die hinteren Reihen sehen nicht, was vorn geschieht, und drängen nach. Die Griechen fahren zunächst rückwärts und ziehen die Vorderreihe tiefer hinein, bis der Schlauch am engsten ist.',
    stellungen: [
      s('p-reihe1', 'per', 'flaeche', 'schiff', linie([23.5620, 37.9450], 3.0, 0.8, 260), { name: 'Erste Reihe', staerke: '150 Schiffe' }),
      s('p-reihe2', 'per', 'flaeche', 'schiff', linie([23.5900, 37.9400], 3.0, 0.8, 260), { name: 'Zweite Reihe drängt nach', staerke: '150 Schiffe' }),
      s('p-reihe3', 'per', 'flaeche', 'schiff', linie([23.6180, 37.9350], 3.0, 0.8, 260), { name: 'Dritte Reihe', staerke: '100 Schiffe' }),
      s('g-flotte', 'gr', 'flaeche', 'schiff', linie([23.5250, 37.9520], 3.6, 0.9, 100), { name: 'weicht zurück und lockt', staerke: '370 Trieren', finte: true }),
    ],
  },
  {
    zeit: 'Zweite Stunde',
    t: 320,
    kurz: 'Die Athener wenden und rammen.',
    text: 'Auf ein Signal fahren die griechischen Schiffe vor. Sie sind schwerer gebaut und schlechter zu manövrieren als die phönizischen – in der Enge ist beides ein Vorteil: Es gibt keinen Raum für die überlegene Rudertechnik des Gegners, nur für Rammstoß und Entern. Die persische Vorderreihe wird gegen die eigene zweite gedrückt.',
    stellungen: [
      s('g-flotte', 'gr', 'flaeche', 'schiff', linie([23.5420, 37.9500], 3.6, 0.9, 100), { name: 'greift an', staerke: '370 Trieren' }),
      s('g-stoss', 'gr', 'pfeil', 'schiff', pfeil([23.5350, 37.9500], [23.5560, 37.9470]), {}),
      s('p-reihe1', 'per', 'flaeche', 'schiff', linie([23.5680, 37.9440], 2.6, 0.9, 260), { name: 'gegen die eigene zweite gedrückt', staerke: '150 Schiffe', geschlagen: true }),
      s('p-reihe2', 'per', 'flaeche', 'schiff', linie([23.5900, 37.9400], 3.0, 0.8, 260), { name: 'drängt weiter nach', staerke: '150 Schiffe' }),
      s('p-reihe3', 'per', 'flaeche', 'schiff', linie([23.6180, 37.9350], 3.0, 0.8, 260), { name: 'ohne Sicht nach vorn', staerke: '100 Schiffe' }),
    ],
  },
  {
    zeit: 'Mittag',
    t: 400,
    kurz: 'Der Befehlshaber fällt, und die Ordnung mit ihm.',
    text: 'Ariabignes, ein Bruder des Königs und Befehlshaber des Flügels, fällt beim Entern. Danach gibt es keine gemeinsame Führung mehr. Wracks treiben quer in der Enge, die nachdrängenden Reihen können weder vor noch zurück. Was sich löst, wird an der Küste von Salamis von den dort wartenden Hopliten empfangen.',
    stellungen: [
      s('p-reihe1', 'per', 'flaeche', 'schiff', linie([23.5720, 37.9430], 2.2, 1.0, 260), { name: 'ohne Führung', staerke: 'Reste', geschlagen: true }),
      s('p-reihe2', 'per', 'flaeche', 'schiff', linie([23.5920, 37.9390], 2.6, 0.9, 260), { name: 'kann nicht zurück', staerke: '140 Schiffe', geschlagen: true }),
      s('g-flotte', 'gr', 'flaeche', 'schiff', linie([23.5480, 37.9490], 3.6, 1.0, 100), { name: 'Griechen', staerke: '350 Trieren' }),
      s('g-hopliten', 'gr', 'flaeche', 'fuss', linie([23.5000, 37.9420], 3.0, 0.4, 60), { name: 'Hopliten an der Küste', staerke: 'Aristeides' }),
    ],
  },
  {
    zeit: 'Nachmittag',
    t: 470,
    kurz: 'Psyttaleia, vor den Augen des Königs.',
    text: 'Aristeides setzt mit Hopliten auf die kleine Insel Psyttaleia über, auf der die Perser Truppen für den erwarteten Sieg abgestellt hatten. Die Besatzung wird niedergemacht – auf einer Insel, die von Xerxes’ Thron aus vollständig einzusehen ist. Aischylos, der als Soldat dabei war, macht daraus die Mitte seiner Tragödie.',
    stellungen: [
      s('g-hopliten', 'gr', 'pfeil', 'fuss', pfeil([23.5450, 37.9420], [23.5650, 37.9390], [23.5750, 37.9375]), { name: 'Aristeides auf Psyttaleia' }),
      s('p-psyttaleia', 'per', 'flaeche', 'fuss', klumpen([23.5760, 37.9370], 0.9), { name: 'niedergemacht', staerke: '400 Mann', geschlagen: true }),
      s('p-flucht', 'per', 'pfeil', 'schiff', pfeil([23.5900, 37.9400], [23.6300, 37.9300], [23.6600, 37.9200]), { name: 'was herauskommt, fährt nach Phaleron', rueckzug: true }),
      s('g-flotte', 'gr', 'flaeche', 'schiff', linie([23.5560, 37.9470], 3.4, 1.0, 100), { name: 'hält die Enge', staerke: '350 Trieren' }),
    ],
  },
  {
    zeit: 'Herbst 480 bis 479',
    t: 600,
    kurz: 'Der König geht, das Heer bleibt – ein Jahr.',
    text: 'Xerxes fürchtet, die Griechen könnten die Schiffbrücke über den Hellespont zerstören und ihn in Europa abschneiden, und geht mit einem Teil des Heeres zurück. Mardonios bleibt mit dem Rest in Griechenland. Ein Jahr später wird dieses Heer bei Plataiai geschlagen – zu Lande. Die Seeherrschaft im Ägäischen Meer wechselt endgültig zu Athen und wird die Grundlage seines Reiches.',
    uebersicht: true,
    sicht: [[21.8, 35.8], [27.2, 41.2]],
    stellungen: [
      s('p-rueck', 'per', 'pfeil', 'gemischt', pfeil([23.60, 37.95], [23.10, 39.60], [24.60, 40.60], [26.40, 40.25]), { name: 'Xerxes zum Hellespont', rueckzug: true }),
      s('p-mardonios', 'per', 'pfeil', 'gemischt', pfeil([23.60, 38.10], [23.30, 38.32], [23.28, 38.32]), { name: 'Mardonios bleibt – Plataiai 479' }),
      s('g-see', 'gr', 'pfeil', 'schiff', pfeil([23.55, 37.94], [24.90, 37.60], [26.30, 38.20], [27.10, 38.45]), { name: 'Athen wird Seemacht' }),
    ],
  },
];

export const salamis = {
  id: 'salamis',
  name: 'Salamis',
  ort: 'Meerenge zwischen Salamis und Attika',
  datum: 'September 480 v. Chr.',
  jahr: -500,
  mitte: [23.5450, 37.9450],
  zoom: 12.2,
  grund: 'blatt',
  see: true,
  worum: 'Eine Seeschlacht, in der die Geografie das Argument ist: In einer Enge von anderthalb Kilometern nützt die dreifache Zahl nichts. Themistokles’ Leistung besteht darin, den Gegner mit einer falschen Nachricht dazu zu bringen, hineinzufahren.',
  parteien,
  gelaende,
  stationen,
  ausgang: 'Die persische Flotte verliert in der Enge einen großen Teil ihrer Schiffe und zieht sich nach Phaleron zurück. Xerxes kehrt mit einem Teil des Heeres nach Asien zurück.',
  verluste: [
    { partei: 'per', text: 'nach Herodot rund 200 Schiffe, dazu die Besatzungen – viele Perser konnten nicht schwimmen' },
    { partei: 'gr', text: '40 Schiffe' },
  ],
  folgen: 'Der Seeweg nach Asien bleibt für die Perser unsicher; Xerxes geht zurück. Das in Griechenland verbliebene Heer wird 479 bei Plataiai geschlagen. Athen wird zur Seemacht – und aus dem Bündnis gegen Persien wird binnen einer Generation das attische Reich.',
  streit: 'Die Zahlen sind wie bei allen Perserkriegsberichten unbrauchbar; Herodots 1.207 persische Schiffe gelten als weit überhöht, 600 bis 800 als plausibel. Auch die genaue Lage der Aufstellungen in der Enge wird verschieden rekonstruiert – Herodot, Aischylos und die spätere Überlieferung widersprechen einander in der Richtung, aus der die Perser einfuhren.',
};
