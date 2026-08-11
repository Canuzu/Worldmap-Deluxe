#!/usr/bin/env node
/*
 * ACHTUNG – Verhältnis zu src/data/battles/midway.json: Dieses Skript hat die
 * JSON-Datei einmal erzeugt; danach ist die JSON-Datei die gültige Fassung.
 */
/**
 * Midway, 4. bis 7. Juni 1942.
 *
 * Die erste Seeschlacht, in der die Flotten einander nie sehen. Zwischen den
 * Trägerverbänden liegen dreihundert Kilometer; was fliegt, sind Flugzeuge,
 * und wer zuerst weiß, wo der andere steht, gewinnt. Deshalb ist die
 * eigentliche Waffe hier keine Kanone, sondern die Funkaufklärung: Die
 * Amerikaner haben den japanischen Flottencode zu großen Teilen gebrochen und
 * lassen Midway per Klartext melden, die Süßwasseranlage sei defekt – als
 * kurz darauf „AF hat Wassermangel“ gefunkt wird, ist bewiesen, wofür AF
 * steht.
 *
 * Auf der Karte wird daraus eine einzige Aussage: Die amerikanischen Träger
 * stehen nordöstlich von Midway in einem Hinterhalt, von dem Nagumo nichts
 * weiß – bis fünf Minuten vor dem Ende.
 */
import { linie, klumpen, pfeil } from '../lib/stellung.mjs';

const MIDWAY = [-177.3800, 28.2100];
const NAGUMO = [-178.4000, 30.5000];
const US_TRAEGER = [-176.2000, 31.7000];

const parteien = [
  {
    id: 'usa', name: 'Vereinigte Staaten', farbe: '#6f9fe0',
    fuehrung: 'Chester W. Nimitz, Raymond Spruance, Frank Fletcher',
    staerke: '3 Träger, 233 Trägerflugzeuge, 127 auf Midway', zahl: 3,
  },
  {
    id: 'jap', name: 'Japan', farbe: '#d4737c',
    fuehrung: 'Yamamoto Isoroku, Nagumo Chūichi',
    staerke: '4 Träger, 248 Flugzeuge – dazu eine weit entfernte Hauptmacht', zahl: 4,
  },
];

const gelaende = [
  { art: 'stadt', name: 'Midway', punkte: klumpen(MIDWAY, 9.0) },
];

const s = (id, partei, form, gattung, punkte, mehr = {}) => ({ id, partei, form, gattung, punkte, ...mehr });

const stationen = [
  {
    zeit: 'Mai 1942',
    t: 0,
    kurz: 'Ein Plan in fünf Teilen – und ein gebrochener Code.',
    text: 'Yamamoto will die amerikanischen Träger zur Entscheidungsschlacht zwingen und teilt seine Flotte in fünf weit auseinanderliegende Verbände, darunter eine Ablenkung gegen die Aleuten. Der Plan setzt darauf, dass der Gegner nichts weiß. Der Gegner weiß fast alles: Die Funkaufklärung in Pearl Harbor hat den Flottencode weitgehend gebrochen und Ort und Termin bestimmt.',
    uebersicht: true,
    sicht: [[-180.0, 15.0], [-150.0, 40.0]],
    stellungen: [
      s('anm-jap', 'jap', 'pfeil', 'schiff', pfeil([-172.00, 33.50], [-176.00, 32.00], [-178.40, 30.50]), { name: 'Nagumos Trägerverband' }),
      s('anm-usa', 'usa', 'pfeil', 'schiff', pfeil([-157.90, 21.30], [-165.00, 26.00], [-176.20, 31.70]), { name: 'aus Pearl Harbor in den Hinterhalt' }),
    ],
  },
  {
    zeit: '4. Juni, 4:30 Uhr',
    t: 240,
    kurz: 'Der erste Schlag gegen die Insel.',
    text: 'Nagumo lässt 108 Flugzeuge gegen Midway starten. Sie treffen die Anlagen, aber die Startbahn bleibt benutzbar – und die Flugzeuge der Insel sind längst in der Luft. Der Führer des Angriffs funkt zurück: Ein zweiter Schlag ist nötig. Dieser Satz setzt alles Weitere in Gang.',
    stellungen: [
      s('j-traeger', 'jap', 'flaeche', 'schiff', klumpen(NAGUMO, 40.0, 1.3, 40), { name: 'Akagi, Kaga, Sōryū, Hiryū', staerke: '4 Träger' }),
      s('j-angriff1', 'jap', 'pfeil', 'schiff', pfeil([-178.30, 30.30], [-177.90, 29.40], [-177.45, 28.35]), { name: '108 Flugzeuge gegen Midway' }),
      s('u-midway', 'usa', 'flaeche', 'fuss', klumpen(MIDWAY, 9.0), { name: 'Midway', staerke: '127 Flugzeuge' }),
      s('u-traeger', 'usa', 'flaeche', 'schiff', klumpen(US_TRAEGER, 40.0, 1.3, 60), { name: 'Enterprise, Hornet, Yorktown', staerke: '3 Träger' }),
    ],
  },
  {
    zeit: '7:00 Uhr',
    t: 300,
    kurz: 'Der Befehl zum Umrüsten.',
    text: 'Nagumo lässt die Reservestaffeln, die mit Torpedos gegen Schiffe bereitstehen, auf Bomben für einen zweiten Inselangriff umrüsten. In den Hangars liegen daraufhin Torpedos und Bomben nebeneinander auf dem Deck – der gefährlichste Zustand, in dem ein Träger sein kann.',
    stellungen: [
      s('j-traeger', 'jap', 'flaeche', 'schiff', klumpen([-178.3000, 30.4000], 40.0, 1.3, 40), { name: 'rüstet um', staerke: '4 Träger' }),
      s('u-midwayang', 'usa', 'pfeil', 'schiff', pfeil([-177.40, 28.30], [-177.90, 29.40], [-178.25, 30.30]), { name: 'Flugzeuge von Midway greifen an' }),
      s('u-traeger', 'usa', 'flaeche', 'schiff', klumpen([-176.4000, 31.5000], 40.0, 1.3, 60), { name: 'noch unentdeckt', staerke: '3 Träger' }),
    ],
  },
  {
    zeit: '7:40 Uhr',
    t: 340,
    kurz: 'Ein Aufklärer meldet – und ergänzt zu spät.',
    text: 'Ein japanischer Aufklärer, der wegen eines Katapultschadens verspätet gestartet ist, meldet zehn amerikanische Schiffe. Erst zwanzig Minuten später fügt er hinzu, dass ein Träger dabei ist. Nagumo lässt daraufhin ein zweites Mal umrüsten, jetzt wieder auf Torpedos. In den Hangars herrscht Chaos.',
    stellungen: [
      s('j-aufklaerer', 'jap', 'pfeil', 'schiff', pfeil([-178.10, 30.60], [-177.20, 31.20], [-176.50, 31.50]), { name: 'Aufklärer meldet verspätet' }),
      s('j-traeger', 'jap', 'flaeche', 'schiff', klumpen([-178.2000, 30.4000], 40.0, 1.3, 40), { name: 'rüstet ein zweites Mal um', staerke: '4 Träger' }),
      s('u-traeger', 'usa', 'flaeche', 'schiff', klumpen([-176.4000, 31.4000], 40.0, 1.3, 60), { name: 'entdeckt – aber ungenau', staerke: '3 Träger' }),
    ],
  },
  {
    zeit: '9:20 Uhr',
    t: 400,
    kurz: 'Die Torpedostaffeln – 35 von 41 kommen nicht zurück.',
    text: 'Die amerikanischen Torpedoflugzeuge sind langsam, fliegen tief und treffen ohne Jagdschutz ein. Sie erzielen keinen einzigen Treffer; von 41 Maschinen der drei Staffeln kehren sechs zurück, eine Staffel wird vollständig abgeschossen. Aber sie zwingen die japanische Jagdabwehr, in geringe Höhe hinunterzugehen – und dort bleibt sie.',
    stellungen: [
      s('u-torpedo', 'usa', 'pfeil', 'schiff', pfeil([-176.60, 31.30], [-177.40, 30.90], [-178.10, 30.50]), { name: 'Torpedostaffeln ohne Jagdschutz', geschlagen: true }),
      s('j-jaeger', 'jap', 'flaeche', 'schiff', klumpen([-178.1500, 30.3800], 26.0, 1.2, 40), { name: 'Jagdabwehr geht tief', staerke: 'Zeros' }),
      s('j-traeger', 'jap', 'flaeche', 'schiff', klumpen([-178.1000, 30.3500], 38.0, 1.3, 40), { name: '4 Träger', staerke: '4 Träger' }),
      s('u-traeger', 'usa', 'flaeche', 'schiff', klumpen([-176.5000, 31.3000], 40.0, 1.3, 60), { name: '3 Träger', staerke: '3 Träger' }),
    ],
  },
  {
    zeit: '10:22 Uhr',
    t: 430,
    kurz: 'Fünf Minuten, die den Pazifikkrieg drehen.',
    text: 'Zwei Verbände Sturzkampfbomber, die sich verflogen hatten und einem japanischen Zerstörer nachgeflogen sind, kommen gleichzeitig aus großer Höhe – dort, wo keine Jagdabwehr mehr steht, weil sie unten die Torpedostaffeln jagt. In fünf Minuten treffen sie Akagi, Kaga und Sōryū. Auf allen dreien liegen Munition und betankte Flugzeuge offen an Deck.',
    stellungen: [
      s('u-sturz', 'usa', 'pfeil', 'schiff', pfeil([-176.80, 31.60], [-177.60, 31.00], [-178.10, 30.45]), { name: 'Sturzkampfbomber aus großer Höhe' }),
      s('j-traeger', 'jap', 'flaeche', 'schiff', klumpen([-178.1000, 30.3500], 34.0, 1.3, 40), { name: 'Akagi, Kaga, Sōryū brennen', staerke: '3 Träger', geschlagen: true }),
      s('j-hiryu', 'jap', 'flaeche', 'schiff', klumpen([-178.4500, 30.6500], 14.0, 1.2, 40), { name: 'Hiryū · abgesetzt und unversehrt', staerke: '1 Träger' }),
      s('u-traeger', 'usa', 'flaeche', 'schiff', klumpen([-176.5000, 31.3000], 40.0, 1.3, 60), { name: '3 Träger', staerke: '3 Träger' }),
    ],
  },
  {
    zeit: '12 bis 14 Uhr',
    t: 480,
    kurz: 'Die Hiryū schlägt zurück und trifft die Yorktown.',
    text: 'Der vierte Träger stand weiter nördlich und ist unbeschädigt. Er schickt zwei Wellen und trifft die Yorktown zweimal – nach der ersten wird sie so schnell repariert, dass die zweite Welle sie für einen anderen, unbeschädigten Träger hält. Am Nachmittag liegt sie manövrierunfähig.',
    stellungen: [
      s('j-hiryu', 'jap', 'flaeche', 'schiff', klumpen([-178.3000, 30.7000], 14.0, 1.2, 40), { name: 'Hiryū greift an', staerke: '1 Träger' }),
      s('j-gegen', 'jap', 'pfeil', 'schiff', pfeil([-178.10, 30.75], [-177.30, 31.10], [-176.60, 31.35]), { name: 'zwei Wellen gegen die Yorktown' }),
      s('u-yorktown', 'usa', 'flaeche', 'schiff', klumpen([-176.5500, 31.3500], 12.0, 1.2, 60), { name: 'Yorktown getroffen', staerke: '1 Träger', geschlagen: true }),
      s('u-traeger', 'usa', 'flaeche', 'schiff', klumpen([-176.3000, 31.5500], 26.0, 1.3, 60), { name: 'Enterprise und Hornet', staerke: '2 Träger' }),
    ],
  },
  {
    zeit: '17 Uhr',
    t: 540,
    kurz: 'Und dann die Hiryū.',
    text: 'Am späten Nachmittag findet ein Aufklärer den vierten Träger. Vierundzwanzig Sturzkampfbomber von der Enterprise – darunter Maschinen der Yorktown, die dort gelandet waren – treffen ihn viermal. Damit sind alle vier Träger, die Pearl Harbor angegriffen hatten, an einem Tag verloren.',
    stellungen: [
      s('u-sturz2', 'usa', 'pfeil', 'schiff', pfeil([-176.40, 31.55], [-177.40, 31.10], [-178.20, 30.75]), { name: '24 Sturzkampfbomber' }),
      s('j-hiryu', 'jap', 'flaeche', 'schiff', klumpen([-178.3000, 30.7000], 12.0, 1.2, 40), { name: 'Hiryū brennt', staerke: '1 Träger', geschlagen: true }),
      s('j-traeger', 'jap', 'flaeche', 'schiff', klumpen([-178.1000, 30.3500], 30.0, 1.3, 40), { name: 'drei Wracks', staerke: 'versenkt', geschlagen: true }),
      s('u-traeger', 'usa', 'flaeche', 'schiff', klumpen([-176.3000, 31.5500], 26.0, 1.3, 60), { name: 'Enterprise und Hornet', staerke: '2 Träger' }),
    ],
  },
  {
    zeit: '5. bis 7. Juni',
    t: 660,
    kurz: 'Yamamoto bricht ab; ein U-Boot holt die Yorktown.',
    text: 'Yamamoto erwägt noch, mit seinen Schlachtschiffen ein Nachtgefecht zu erzwingen – seine Hauptmacht steht 500 Kilometer hinter Nagumo und hat den ganzen Tag über nichts tun können. Spruance weicht nach Osten aus, statt nachzusetzen: eine Vorsicht, die ihm später vorgeworfen und heute überwiegend gelobt wird. Am 7. Juni versenkt ein U-Boot die abgeschleppte Yorktown.',
    stellungen: [
      s('j-abbruch', 'jap', 'pfeil', 'schiff', pfeil([-178.20, 30.50], [-176.00, 32.60], [-172.00, 34.50]), { name: 'Abbruch nach Westen', rueckzug: true }),
      s('u-ausweichen', 'usa', 'pfeil', 'schiff', pfeil([-176.30, 31.55], [-174.50, 30.80], [-172.50, 30.20]), { name: 'Spruance weicht nach Osten aus' }),
      s('u-yorktown', 'usa', 'flaeche', 'schiff', klumpen([-176.6000, 31.2000], 10.0, 1.2, 60), { name: 'Yorktown geht am 7. Juni verloren', staerke: '1 Träger', geschlagen: true }),
    ],
  },
  {
    zeit: 'Nach Midway',
    t: 840,
    kurz: 'Vier Träger, und die Richtung des Krieges kehrt sich um.',
    text: 'Japan verliert vier Flottenträger und – schwerer wiegend – einen großen Teil seiner erfahrenen Flugzeugbesatzungen und Deckmechaniker, die nicht zu ersetzen sind. Die Vereinigten Staaten laufen im selben Zeitraum zwei Dutzend neue Träger vom Stapel. Zwei Monate später beginnt bei Guadalcanal die erste amerikanische Offensive; von da an läuft der Krieg in eine Richtung.',
    uebersicht: true,
    sicht: [[-180.0, -14.0], [-141.0, 42.0]],
    stellungen: [
      s('u-offensive', 'usa', 'pfeil', 'schiff', pfeil([-157.90, 21.30], [-168.00, 25.50], [-177.40, 28.20], [-179.60, 6.00], [-179.90, -10.00]), { name: 'ab August: Richtung Guadalcanal' }),
      s('j-rueck', 'jap', 'pfeil', 'schiff', pfeil([-178.20, 30.50], [-179.50, 29.00], [-179.95, 27.00]), { name: 'Rückzug der Trägerflotte nach Westen', rueckzug: true }),
    ],
  },
];

export const midway = {
  id: 'midway',
  name: 'Midway',
  ort: 'Nordwestlich von Midway',
  datum: '4.–7. Juni 1942',
  jahr: 1942,
  mitte: [-177.4000, 30.2000],
  zoom: 7.4,
  grund: 'blatt',
  see: true,
  worum: 'Die erste Seeschlacht, in der die Flotten einander nie sehen: dreihundert Kilometer zwischen den Trägern, und wer zuerst weiß, wo der andere steht, gewinnt. Die eigentliche Waffe ist die gebrochene Funkverschlüsselung – und dann fünf Minuten, in denen drei Träger brennen.',
  parteien,
  gelaende,
  stationen,
  ausgang: 'Japan verliert alle vier eingesetzten Flottenträger und rund 250 Flugzeuge. Die Vereinigten Staaten verlieren die Yorktown und einen Zerstörer.',
  verluste: [
    { partei: 'jap', text: '4 Träger, 1 Schwerer Kreuzer, rund 3.000 Gefallene – darunter viele erfahrene Mechaniker' },
    { partei: 'usa', text: '1 Träger, 1 Zerstörer, 145 Flugzeuge, 307 Gefallene' },
  ],
  folgen: 'Die japanische Trägerflotte verliert ihren Kern und den nicht ersetzbaren Stamm erfahrener Besatzungen. Zwei Monate später beginnt mit Guadalcanal die erste amerikanische Offensive; die Initiative im Pazifik wechselt endgültig.',
  streit: 'Die Erzählung von den „fünf schicksalhaften Minuten“, in denen die japanischen Decks angeblich voll startbereiter Flugzeuge standen, gilt seit den Arbeiten von Parshall und Tully als überholt – die Maschinen befanden sich noch in den Hangars. Auch ob Spruances Ausweichen nach Osten die richtige Entscheidung war, wurde jahrzehntelang diskutiert.',
};
