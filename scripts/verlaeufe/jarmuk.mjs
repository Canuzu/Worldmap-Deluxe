#!/usr/bin/env node
/*
 * ACHTUNG – Verhältnis zu src/data/battles/jarmuk.json: Dieses Skript hat die
 * JSON-Datei einmal erzeugt; danach ist die JSON-Datei die gültige Fassung.
 */
/**
 * Am Jarmuk, August 636.
 *
 * Sechs Tage Schlacht auf einer Hochfläche, die auf drei Seiten von
 * Schluchten begrenzt ist: im Süden die Jarmuk-Schlucht, im Westen der Wadi
 * ar-Ruqqad, im Norden der Wadi al-Harir. Wer dort mit dem Rücken zum Westen
 * steht, hat genau einen Weg zurück – den Übergang bei Ain Dhakar.
 *
 * Das ist die ganze Schlacht: Chalid nimmt am sechsten Tag alle Reiter aus
 * der Linie heraus, trennt damit die byzantinische Reiterei vom Fußvolk,
 * rollt die Linie von Norden auf und drückt sie nach Westen – auf einen
 * Übergang, den er in der Nacht davor hat besetzen lassen.
 *
 * Die Ebene liegt bei rund 35.95 Ost, 32.76 Nord.
 */
import { linie, klumpen, pfeil } from '../lib/stellung.mjs';

const EBENE = [35.9600, 32.7800];
const UEBERGANG = [35.8380, 32.7620];

const parteien = [
  {
    id: 'byz', name: 'Oströmisches Reich', farbe: '#6f9fe0',
    fuehrung: 'Vahan, Theodoros Trithyrios, Gregorios, Qanatir, Jabala ibn al-Aiham',
    staerke: 'Reichstruppen, Armenier und ghassanidische Verbündete – die Quellen nennen 100.000 und mehr, die Forschung eher 20.000 bis 40.000',
    zahl: 40000,
  },
  {
    id: 'kal', name: 'Kalifat', farbe: '#7fbf7f',
    fuehrung: 'Chalid ibn al-Walid, Abu Ubaida ibn al-Dscharrah, Amr ibn al-As, Schurahbil ibn Hasana',
    staerke: 'rund 25.000 bis 40.000, davon etwa 8.000 beritten',
    zahl: 30000,
  },
];

const gelaende = [
  {
    art: 'fluss', name: 'Die Jarmuk-Schlucht',
    punkte: pfeil([36.1600, 32.7050], [36.0200, 32.7180], [35.8800, 32.7220], [35.7200, 32.7150]),
  },
  {
    art: 'fluss', name: 'Wadi ar-Ruqqad · steilwandig, ein Übergang',
    punkte: pfeil([35.8180, 32.8800], [35.8280, 32.8100], [35.8380, 32.7400], [35.8500, 32.7220]),
  },
  {
    art: 'fluss', name: 'Wadi al-Allan',
    punkte: pfeil([36.1000, 32.8800], [36.0800, 32.8000], [36.0600, 32.7300]),
  },
  {
    art: 'fluss', name: 'Wadi al-Harir',
    punkte: pfeil([35.8600, 32.8700], [35.9500, 32.8800], [36.0500, 32.8700]),
  },
  { art: 'furt', name: 'Ain Dhakar · der einzige Übergang', punkte: klumpen(UEBERGANG, 1.2) },
  { art: 'stadt', name: 'Jabiya', punkte: klumpen([35.9400, 32.9350], 1.6) },
];

const s = (id, partei, form, gattung, punkte, mehr = {}) => ({ id, partei, form, gattung, punkte, ...mehr });

const stationen = [
  {
    zeit: '628 bis 636',
    t: 0,
    kurz: 'Zwei erschöpfte Großmächte und ein dritter Bewerber.',
    text: 'Byzanz und Persien haben sich sechsundzwanzig Jahre lang bekriegt und beide fast ruiniert; Herakleios hat das Kreuz erst 630 nach Jerusalem zurückgebracht. In genau diesem Augenblick kommen aus dem Süden Heere, mit denen niemand gerechnet hat. 634 fällt Bosra, 635 Damaskus. Herakleios stellt in Nordsyrien eine Feldarmee auf, um die Provinz in einem Schlag zurückzugewinnen.',
    uebersicht: true,
    sicht: [[26.5, 19.5], [50.5, 42.5]],
    stellungen: [
      s('anm-byz', 'byz', 'pfeil', 'gemischt', pfeil([36.20, 36.20], [36.30, 35.20], [36.30, 34.20], [36.10, 33.30], [35.95, 32.85]), { name: 'Die Feldarmee aus Nordsyrien' }),
      s('anm-kal', 'kal', 'pfeil', 'gemischt', pfeil([39.83, 21.42], [39.60, 24.47], [37.30, 28.40], [36.30, 30.90], [35.98, 32.72]), { name: 'Von Medina nach Syrien' }),
      s('anm-raeumung', 'kal', 'pfeil', 'gemischt', pfeil([36.29, 33.51], [36.10, 33.10], [35.98, 32.80]), { name: 'Damaskus und Homs werden geräumt' }),
      s('anm-pers', 'byz', 'pfeil', 'gemischt', pfeil([44.42, 33.10], [42.00, 34.50], [38.30, 36.50], [36.20, 36.20]), { name: 'Der eben beendete Krieg gegen Persien' }),
    ],
  },
  {
    zeit: 'Juli 636',
    t: 60,
    kurz: 'Damaskus wird geräumt, um alles zu versammeln.',
    text: 'Abu Ubaida gibt Damaskus und Homs auf – und lässt sogar die eingezogene Steuer zurückerstatten, weil der Schutz nicht mehr geleistet werden kann. Alle Verbände ziehen sich auf die Ebene südlich des Golan zusammen. Der Rückzug ist kein Zeichen von Schwäche, sondern die Voraussetzung dafür, dem größeren Heer überhaupt geschlossen gegenüberzustehen.',
    stellungen: [
      s('k-heer', 'kal', 'flaeche', 'gemischt', linie([35.9950, 32.7850], 11.0, 1.8, 270), { name: 'Die Verbände sammeln sich', staerke: 'rund 30.000' }),
      s('b-heer', 'byz', 'flaeche', 'gemischt', klumpen([35.9200, 32.8900], 8.0, 1.4, 90), { name: 'Die Feldarmee rückt heran', staerke: 'weit überlegen' }),
    ],
  },
  {
    zeit: 'Die Aufstellung',
    t: 120,
    kurz: 'Eine Ebene, aus der es nach drei Seiten nicht geht.',
    text: 'Die Heere stellen sich auf einer Linie von etwa dreizehn Kilometern gegenüber, Nord–Süd, zwischen der Jarmuk-Schlucht im Süden und dem Wadi al-Harir im Norden. Die Muslime stehen östlich und haben die Wüste im Rücken, aus der ihr Nachschub kommt. Die Byzantiner stehen westlich – und hinter ihnen liegt der Wadi ar-Ruqqad, eine Schlucht mit einem einzigen brauchbaren Übergang.',
    stellungen: [
      s('k-heer', 'kal', 'flaeche', 'gemischt', linie([35.9950, 32.7850], 13.0, 1.6, 270), { name: 'Vier Verbände nebeneinander', staerke: 'rund 30.000' }),
      s('k-reiterei', 'kal', 'flaeche', 'reiter', linie([36.0180, 32.7850], 6.0, 1.0, 270), { name: 'Reiterei hinter jedem Flügel', staerke: '8.000' }),
      s('b-heer', 'byz', 'flaeche', 'gemischt', linie([35.9250, 32.7850], 14.0, 2.2, 90), { name: 'Die byzantinische Linie', staerke: 'weit überlegen' }),
      s('b-reiterei', 'byz', 'flaeche', 'reiter', linie([35.8950, 32.7850], 12.0, 1.2, 90), { name: 'Die Reiterei dahinter' }),
    ],
  },
  {
    zeit: 'Erster Tag',
    t: 180,
    kurz: 'Zweikämpfe vor der Front, sonst wenig.',
    text: 'Der erste Tag vergeht mit Zweikämpfen zwischen Einzelnen vor den Linien und mit vorsichtigen Vorstößen. Vahan hofft weiter auf eine Verhandlungslösung und will die Kräfte nicht verbrauchen; die arabischen Quellen füllen diesen Tag mit Namen und Heldentaten, die man nicht nachprüfen kann.',
    stellungen: [
      s('k-heer', 'kal', 'flaeche', 'gemischt', linie([35.9950, 32.7850], 13.0, 1.6, 270), { name: 'Die Linie steht', staerke: 'rund 30.000' }),
      s('b-heer', 'byz', 'flaeche', 'gemischt', linie([35.9280, 32.7850], 14.0, 2.2, 90), { name: 'Die Linie steht', staerke: 'weit überlegen' }),
      s('b-tast', 'byz', 'pfeil', 'gemischt', pfeil([35.9450, 32.7900], [35.9650, 32.7880], [35.9800, 32.7860]), { name: 'Vorstöße zum Abtasten' }),
    ],
  },
  {
    zeit: 'Zweiter und dritter Tag',
    t: 240,
    kurz: 'Die Flügel weichen bis in die eigenen Lager.',
    text: 'Vahan greift jetzt ernsthaft an, vor allem die Flügel. Zweimal wird der rechte muslimische Flügel bis an die Zeltlager zurückgedrängt; die arabische Überlieferung berichtet, die Frauen der Lager hätten die Fliehenden mit Zeltstangen und Spottversen zurückgetrieben. Chalid fängt beide Male mit der Reiterei ab und stellt die Linie wieder her.',
    stellungen: [
      s('b-stossN', 'byz', 'pfeil', 'gemischt', pfeil([35.9350, 32.8300], [35.9700, 32.8280], [35.9950, 32.8250]), { name: 'Angriff auf den linken Flügel' }),
      s('b-stossS', 'byz', 'pfeil', 'gemischt', pfeil([35.9350, 32.7400], [35.9700, 32.7420], [35.9950, 32.7440]), { name: 'Angriff auf den rechten Flügel' }),
      s('k-heer', 'kal', 'flaeche', 'gemischt', linie([36.0100, 32.7850], 13.0, 1.8, 270), { name: 'zurückgedrängt und wiederhergestellt', staerke: 'rund 30.000', geschlagen: true }),
      s('k-reiterei', 'kal', 'flaeche', 'reiter', linie([36.0250, 32.7850], 6.0, 1.0, 270), { name: 'Chalid fängt ab', staerke: '8.000' }),
      s('b-heer', 'byz', 'flaeche', 'gemischt', linie([35.9280, 32.7850], 14.0, 2.2, 90), { name: 'drückt', staerke: 'weit überlegen' }),
    ],
  },
  {
    zeit: 'Vierter Tag',
    t: 300,
    kurz: 'Der Tag der verlorenen Augen.',
    text: 'Der schwerste Tag. Armenische Bogenschützen schießen auf kurze Entfernung in die Gesichter der vorderen Reihen; die arabische Überlieferung nennt ihn den Tag der verlorenen Augen und zählt Hunderte Geblendete. Wieder weichen beide Flügel, wieder wird die Linie mit der Reiterei geflickt. Am Abend hat keine Seite etwas gewonnen, und beide sind erschöpft.',
    stellungen: [
      s('b-bogen', 'byz', 'flaeche', 'bogen', linie([35.9550, 32.7850], 12.0, 0.8, 90), { name: 'Armenische Bogenschützen', staerke: 'auf kurze Entfernung' }),
      s('k-heer', 'kal', 'flaeche', 'gemischt', linie([36.0100, 32.7850], 13.0, 1.8, 270), { name: 'hält mit Mühe', staerke: 'rund 30.000', geschlagen: true }),
      s('k-reiterei', 'kal', 'flaeche', 'reiter', linie([36.0300, 32.7850], 6.0, 1.0, 270), { name: 'flickt die Linie', staerke: '8.000' }),
      s('b-heer', 'byz', 'flaeche', 'gemischt', linie([35.9280, 32.7850], 14.0, 2.2, 90), { name: 'greift den ganzen Tag an', staerke: 'weit überlegen' }),
    ],
  },
  {
    zeit: 'Fünfter Tag',
    t: 360,
    kurz: 'Stillstand, Verhandlungen und eine Nacht Arbeit.',
    text: 'Der fünfte Tag vergeht fast ohne Kampf; Vahan bietet Verhandlungen an. In dieser Nacht schickt Chalid eine Abteilung nach Westen und lässt den Übergang bei Ain Dhakar besetzen – die einzige Stelle, an der der Wadi ar-Ruqqad mit einem Heer zu überschreiten ist. Von diesem Augenblick an hat die byzantinische Aufstellung keinen Rückweg mehr, und niemand dort weiß es.',
    stellungen: [
      s('k-abteilung', 'kal', 'pfeil', 'reiter', pfeil([36.0000, 32.7350], [35.9200, 32.7250], [35.8500, 32.7500], [35.8400, 32.7600]), { name: 'Nachts zum Übergang' }),
      s('k-heer', 'kal', 'flaeche', 'gemischt', linie([35.9980, 32.7850], 13.0, 1.7, 270), { name: 'Stillhalten', staerke: 'rund 30.000' }),
      s('b-heer', 'byz', 'flaeche', 'gemischt', linie([35.9280, 32.7850], 14.0, 2.2, 90), { name: 'Vahan verhandelt', staerke: 'weit überlegen' }),
    ],
  },
  {
    zeit: 'Sechster Tag, Morgen',
    t: 420,
    kurz: 'Chalid nimmt alle Reiter aus der Linie heraus.',
    text: 'Am sechsten Tag ändert Chalid die Ordnung: Er zieht die Reiterei aller vier Verbände heraus und stellt sie als einen einzigen Verband von rund achttausend Pferden zusammen, hinter dem rechten Flügel. Damit gibt er die Linie hinter sich auf, gewinnt aber das Einzige, was gegen ein größeres Heer hilft – eine Faust, die an einer Stelle stärker ist als alles, was dort steht.',
    stellungen: [
      s('k-reiterei', 'kal', 'flaeche', 'reiter', klumpen([36.0250, 32.7350], 4.0, 1.4, 340), { name: 'Die ganze Reiterei in einer Hand', staerke: '8.000' }),
      s('k-heer', 'kal', 'flaeche', 'gemischt', linie([35.9950, 32.7850], 13.0, 1.4, 270), { name: 'Das Fußvolk allein in der Linie', staerke: 'rund 22.000' }),
      s('b-heer', 'byz', 'flaeche', 'gemischt', linie([35.9280, 32.7850], 14.0, 2.2, 90), { name: 'Die byzantinische Linie', staerke: 'weit überlegen' }),
      s('b-reiterei', 'byz', 'flaeche', 'reiter', linie([35.8980, 32.7850], 12.0, 1.2, 90), { name: 'Die Reiterei hinter dem Fußvolk' }),
    ],
  },
  {
    zeit: 'Sechster Tag, Vormittag',
    t: 480,
    kurz: 'Erst wird die Reiterei vom Fußvolk getrennt.',
    text: 'Der erste Stoß gilt nicht der Front, sondern der byzantinischen Reiterei: Chalid wirft seine geschlossene Masse gegen sie und drängt sie nach Norden ab, weg von den Fußtruppen, die sie decken soll. Sie weicht aus und findet nicht mehr zurück. Was danach in der Linie steht, ist Infanterie ohne Schutz an den Flanken.',
    stellungen: [
      s('k-reiterei', 'kal', 'pfeil', 'reiter', pfeil([36.0200, 32.7500], [35.9600, 32.8100], [35.9100, 32.8500], [35.8900, 32.8750]), { name: 'gegen die byzantinische Reiterei' }),
      s('b-reiterei', 'byz', 'flaeche', 'reiter', linie([35.8800, 32.8700], 6.0, 1.2, 90), { name: 'nach Norden abgedrängt', geschlagen: true }),
      s('b-heer', 'byz', 'flaeche', 'gemischt', linie([35.9280, 32.7800], 13.0, 2.2, 90), { name: 'Fußvolk ohne Deckung', staerke: 'weit überlegen' }),
      s('k-heer', 'kal', 'flaeche', 'gemischt', linie([35.9950, 32.7800], 13.0, 1.4, 270), { name: 'bindet die Front', staerke: 'rund 22.000' }),
    ],
  },
  {
    zeit: 'Sechster Tag, Mittag',
    t: 540,
    kurz: 'Dann wird die Linie von Norden aufgerollt.',
    text: 'Die Reiterei dreht bei und fällt dem nördlichen Ende der byzantinischen Linie in Flanke und Rücken, während das Fußvolk von vorn drückt. Eine Linie, die man nur an einem Ende fasst, gibt in der ganzen Länge nach: Verband für Verband weicht nach Süden und Westen aus, weil dort noch Platz ist. Die Ghassaniden Jabalas lösen sich und ziehen ab.',
    stellungen: [
      s('k-reiterei', 'kal', 'pfeil', 'reiter', pfeil([35.8900, 32.8700], [35.9000, 32.8300], [35.9200, 32.7900]), { name: 'in Flanke und Rücken' }),
      s('b-heer', 'byz', 'flaeche', 'gemischt', linie([35.9150, 32.7700], 12.0, 2.6, 90), { name: 'wird von Norden aufgerollt', geschlagen: true }),
      s('k-heer', 'kal', 'pfeil', 'gemischt', pfeil([35.9900, 32.7800], [35.9600, 32.7800], [35.9350, 32.7800]), { name: 'Druck von vorn' }),
      s('b-ghassan', 'byz', 'pfeil', 'reiter', pfeil([35.9000, 32.8500], [35.9200, 32.9000], [35.9400, 32.9400]), { name: 'Die Ghassaniden ziehen ab', rueckzug: true }),
    ],
  },
  {
    zeit: 'Sechster Tag, Abend',
    t: 600,
    kurz: 'Der einzige Übergang über den Ruqqad ist besetzt.',
    text: 'Wer nach Westen ausweicht, läuft auf den Wadi ar-Ruqqad zu und findet den Übergang in fremder Hand. Die Schlucht ist zwanzig bis dreißig Meter tief mit senkrechten Wänden. Was sich dort staut, wird hineingedrängt; die Quellen beider Seiten stimmen darin überein, dass mehr Menschen in den Schluchten umkommen als im Gefecht. Theodoros fällt, Vahan verschwindet aus der Überlieferung.',
    stellungen: [
      s('b-heer', 'byz', 'flaeche', 'gemischt', klumpen([35.8700, 32.7700], 6.0, 1.6, 350), { name: 'gegen die Schlucht gedrückt', geschlagen: true }),
      s('k-reiterei', 'kal', 'pfeil', 'reiter', pfeil([35.9300, 32.8100], [35.9000, 32.7900], [35.8800, 32.7780]), { name: 'drückt nach Westen' }),
      s('k-abteilung', 'kal', 'pfeil', 'reiter', pfeil([35.8420, 32.7620], [35.8500, 32.7660], [35.8600, 32.7700]), { name: 'Der Übergang ist zu' }),
      s('k-heer', 'kal', 'flaeche', 'gemischt', linie([35.9300, 32.7800], 12.0, 1.4, 270), { name: 'rückt nach', staerke: 'rund 22.000' }),
    ],
  },
  {
    zeit: 'Nach dem Jarmuk',
    t: 680,
    kurz: 'Syrien ist verloren, und es bleibt verloren.',
    text: 'Herakleios erfährt die Nachricht in Antiochia und zieht nach Konstantinopel ab; überliefert ist sein Abschiedswort an die Provinz: „Leb wohl, Syrien – was für ein schönes Land für den Feind.“ Innerhalb von vier Jahren fallen Jerusalem, Ägypten und Mesopotamien; das Sassanidenreich verschwindet ganz. Die Grenze läuft danach am Taurus und bleibt dort dreihundert Jahre.',
    uebersicht: true,
    sicht: [[24.5, 22.5], [62.5, 44.5]],
    stellungen: [
      s('k-syrien', 'kal', 'pfeil', 'gemischt', pfeil([35.95, 32.78], [35.23, 31.78], [31.24, 30.05], [29.92, 31.20]), { name: 'Jerusalem 637, Ägypten bis 642' }),
      s('k-persien', 'kal', 'pfeil', 'gemischt', pfeil([35.95, 32.80], [40.00, 33.50], [44.36, 33.31], [51.40, 33.00], [59.60, 36.30]), { name: 'Das Sassanidenreich, bis 651' }),
      s('b-taurus', 'byz', 'pfeil', 'gemischt', pfeil([36.20, 36.20], [34.80, 37.60], [32.50, 38.20], [29.00, 39.50], [28.98, 41.01]), { name: 'Rückzug hinter den Taurus' }),
    ],
  },
];

export const jarmuk = {
  id: 'jarmuk',
  name: 'Am Jarmuk',
  ort: 'Die Hochfläche südlich des Golan',
  datum: '15. bis 20. August 636',
  jahr: 636,
  mitte: [35.9600, 32.7800],
  zoom: 11.2,
  grund: 'relief',
  worum: 'Eine Hochfläche, auf drei Seiten von Schluchten begrenzt – und die byzantinische Aufstellung hat den Wadi ar-Ruqqad im Rücken, mit einem einzigen brauchbaren Übergang. Fünf Tage lang entscheidet das nichts. Am sechsten nimmt Chalid alle Reiter aus der Linie, trennt damit die gegnerische Reiterei vom Fußvolk und drückt die Linie genau dorthin, wo sie nicht mehr weiterkann.',
  parteien,
  gelaende,
  stationen,
  ausgang: 'Die byzantinische Feldarmee wird nach sechs Tagen aufgerollt und gegen die Schluchten gedrängt; sie hört als Verband auf zu bestehen.',
  verluste: [
    { partei: 'byz', text: 'die Feldarmee vernichtet; die Quellen nennen Zehntausende, viele davon in den Schluchten' },
    { partei: 'kal', text: 'nach arabischer Überlieferung rund 4.000' },
  ],
  folgen: 'Syrien geht Byzanz endgültig verloren; Jerusalem fällt 637, Ägypten bis 642, das Sassanidenreich verschwindet bis 651 vollständig. Die byzantinische Grenze läuft danach am Taurus und liegt dort, mit Schwankungen, dreihundert Jahre. Die reichste Provinz des Reiches, mit Antiochia und Damaskus, wird zum Kernland eines neuen Staates: 661 macht Muawiya Damaskus zur Hauptstadt des Kalifats.',
  streit: 'Die Zahlen sind der größte Vorbehalt: Die arabischen Quellen, alle mindestens ein Jahrhundert jünger, nennen für Byzanz 100.000 bis 400.000; die heutige Forschung hält 20.000 bis 40.000 für wahrscheinlich, manche noch weniger. Auch die Sechstagegliederung stammt aus dieser späten Überlieferung und ist womöglich eine erzählerische Ordnung. Gesichert sind der Ort, das Ergebnis und die Landschaft – und die erklärt am meisten.',
};
