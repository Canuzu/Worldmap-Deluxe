#!/usr/bin/env node
/*
 * ACHTUNG – Verhältnis zu src/data/battles/ainjalut.json: Dieses Skript hat die
 * JSON-Datei einmal erzeugt; danach ist die JSON-Datei die gültige Fassung.
 */
/**
 * Ain Djalut, 3. September 1260.
 *
 * Zwanzig Jahre nach Muhi kommt das Gegenstück: dieselbe Reiterei, dasselbe
 * Verfahren – und diesmal steht ihr ein Gegner gegenüber, der genauso kämpft.
 * Die Mamluken sind selbst Steppenreiter, als Kinder verkauft und in Ägypten
 * ausgebildet; sie kennen die Scheinflucht, weil sie sie können.
 *
 * Deshalb ist die Karte hier die Karte einer Umkehrung: Baibars führt mit
 * einem kleinen Vortrupp vor, weicht aus und zieht die Mongolen in eine Ebene
 * hinein, an deren Hängen das eigentliche Heer wartet. Die Falle, in die
 * Kitbuqa läuft, ist die, die seine eigene Seite erfunden hat.
 *
 * Die Quelle Ain Djalut liegt bei 35.36 Ost, 32.55 Nord.
 */
import { linie, klumpen, pfeil } from '../lib/stellung.mjs';

const QUELLE = [35.3560, 32.5500];
const EBENE = [35.3700, 32.5560];
const GILBOA = [35.3900, 32.5150];

const parteien = [
  {
    id: 'mam', name: 'Mamlukensultanat', farbe: '#7fbf7f',
    fuehrung: 'Saif ad-Din Qutuz, Baibars al-Bunduqdari',
    staerke: 'rund 15.000 bis 20.000 – ägyptische Mamluken, syrische Flüchtlingstruppen, beduinische Verbände',
    zahl: 18000,
  },
  {
    id: 'mon', name: 'Mongolen', farbe: '#d4737c',
    fuehrung: 'Kitbuqa Noyan',
    staerke: 'ein Tumen mit georgischen, armenischen und ayyubidischen Hilfstruppen – rund 10.000 bis 20.000',
    zahl: 15000,
  },
];

const gelaende = [
  { art: 'hoehe', name: 'Berg Gilboa', punkte: klumpen(GILBOA, 4.0, 2.2, 120) },
  { art: 'hoehe', name: 'Givat ha-More', punkte: klumpen([35.3350, 32.6150], 3.4, 1.4, 90) },
  { art: 'fluss', name: 'Der Bach vom Harod nach Osten', punkte: pfeil([35.3560, 32.5510], [35.4200, 32.5420], [35.4900, 32.5150]) },
  { art: 'furt', name: 'Die Quelle Ain Djalut', punkte: klumpen(QUELLE, 0.8) },
  { art: 'stadt', name: 'Baisan', punkte: klumpen([35.4980, 32.4970], 1.6) },
  { art: 'weg', name: 'Die Ebene von Jesreel · der Weg nach Norden', punkte: pfeil([35.4600, 32.5300], [35.3700, 32.5700], [35.2700, 32.6200], [35.1800, 32.6800]) },
];

const s = (id, partei, form, gattung, punkte, mehr = {}) => ({ id, partei, form, gattung, punkte, ...mehr });

const stationen = [
  {
    zeit: '1258 bis 1260',
    t: 0,
    kurz: 'Bagdad ist gefallen, Damaskus auch, Kairo ist dran.',
    text: 'Hülegü hat 1256 die Assassinenburgen genommen, 1258 Bagdad und das Kalifat vernichtet, 1260 Aleppo und Damaskus. Dann stirbt in der Mongolei der Großkhan Möngke, und Hülegü zieht mit dem größten Teil des Heeres nach Osten ab, um bei der Nachfolge dabei zu sein. Zurück bleibt Kitbuqa mit einem Tumen – und ein Ultimatum an Kairo, dessen Überbringer der Sultan in zwei Teile schneiden und die Köpfe an das Stadttor nageln lässt.',
    uebersicht: true,
    sicht: [[24.5, 21.5], [62.5, 46.5]],
    stellungen: [
      s('anm-mon', 'mon', 'pfeil', 'reiter', pfeil([54.30, 36.30], [50.00, 36.40], [44.36, 33.31], [37.16, 36.20], [36.29, 33.51], [35.40, 32.60]), { name: 'Hülegü: Alamut, Bagdad, Aleppo, Damaskus' }),
      s('anm-ab', 'mon', 'pfeil', 'reiter', pfeil([36.29, 33.51], [44.36, 33.31], [51.40, 35.70], [58.00, 37.60]), { name: 'Hülegü zieht nach Osten ab', rueckzug: true }),
      s('anm-mam', 'mam', 'pfeil', 'reiter', pfeil([31.24, 30.05], [33.80, 31.20], [34.75, 32.07], [35.30, 32.55]), { name: 'Qutuz marschiert aus Kairo' }),
    ],
  },
  {
    zeit: 'August 1260',
    t: 60,
    kurz: 'Der Zug nach Norden führt durch Frankenland.',
    text: 'Der kürzeste Weg von Ägypten nach Galiläa läuft an der Küste entlang, durch das Gebiet der Kreuzfahrer. Die Barone von Akkon lassen die Mamluken ziehen und verkaufen ihnen sogar Vorräte – nicht aus Sympathie, sondern weil Kitbuqas Leute kurz zuvor Sidon geplündert haben. Es ist die einzige Gelegenheit der Kreuzfahrerstaaten, den Ausgang mitzubestimmen, und sie entscheiden sich fürs Zusehen.',
    stellungen: [
      s('m-marsch', 'mam', 'pfeil', 'reiter', pfeil([35.2000, 32.7000], [35.2800, 32.6300], [35.3300, 32.5700]), { name: 'Die Mamluken kommen von Nordwesten' }),
      s('k-heer', 'mon', 'flaeche', 'reiter', klumpen([35.4700, 32.5300], 4.0, 1.3, 100), { name: 'Kitbuqa in der Ebene', staerke: 'ein Tumen' }),
      s('m-heer', 'mam', 'flaeche', 'reiter', klumpen([35.2900, 32.6100], 4.0, 1.3, 120), { name: 'Qutuz mit dem Hauptheer', staerke: 'rund 18.000' }),
    ],
  },
  {
    zeit: 'Die Ebene',
    t: 120,
    kurz: 'Eine Ebene mit Hängen an zwei Seiten.',
    text: 'Zwischen dem Berg Gilboa im Süden und dem Givat ha-More im Norden liegt eine Ebene von wenigen Kilometern Breite, in der Mitte die Quelle Ain Djalut. Wer von Osten her hineinreitet, sieht die Hänge, aber nicht, was in ihren Falten steht. Qutuz stellt den größten Teil seines Heeres genau dorthin und schickt nur Baibars mit einem Vortrupp nach vorn.',
    stellungen: [
      s('m-baibars', 'mam', 'flaeche', 'reiter', linie([35.3600, 32.5540], 2.2, 0.8, 90), { name: 'Baibars mit dem Vortrupp', staerke: 'ein kleiner Teil' }),
      s('m-heer', 'mam', 'flaeche', 'reiter', klumpen([35.3450, 32.5300], 3.2, 1.3, 120), { name: 'Qutuz an den Hängen versteckt', staerke: 'der größte Teil' }),
      s('k-heer', 'mon', 'flaeche', 'reiter', klumpen([35.4600, 32.5340], 4.0, 1.3, 100), { name: 'Kitbuqa im Osten', staerke: 'ein Tumen' }),
    ],
  },
  {
    zeit: 'Morgen des 3. September',
    t: 180,
    kurz: 'Baibars zeigt sich und weicht wieder zurück.',
    text: 'Baibars reitet an, wirft ein paar Pfeile und wendet, sobald die Mongolen antreten. Das Verfahren ist genau das, mit dem die Mongolen seit vierzig Jahren jeden Gegner in die Auflösung gelockt haben; die Mamluken beherrschen es, weil sie aus derselben Steppe stammen und als Kinder darauf gedrillt wurden. Kitbuqa nimmt es für eine echte Flucht.',
    stellungen: [
      s('m-baibars', 'mam', 'pfeil', 'reiter', pfeil([35.3900, 32.5500], [35.3650, 32.5540], [35.3400, 32.5580]), { name: 'Scheinflucht nach Westen', finte: true }),
      s('k-heer', 'mon', 'pfeil', 'reiter', pfeil([35.4500, 32.5400], [35.4150, 32.5460], [35.3850, 32.5510]), { name: 'Kitbuqa setzt nach' }),
      s('m-heer', 'mam', 'flaeche', 'reiter', klumpen([35.3450, 32.5280], 3.2, 1.3, 120), { name: 'Der Hinterhalt wartet', staerke: 'der größte Teil' }),
    ],
  },
  {
    zeit: 'Vormittag',
    t: 240,
    kurz: 'Kitbuqa reitet in die Ebene hinein.',
    text: 'Der ganze Tumen folgt in die Ebene, an der Quelle vorbei, mit den Hängen zu beiden Seiten. Kitbuqa greift dabei so an, wie es seine Truppe kann: schnell, breit, mit Bogenschützen im Anritt. Er hat nur nicht die Zahlen, die dieses Verfahren normalerweise begleiten – der größere Teil des mongolischen Heeres reitet gerade durch Persien nach Osten.',
    stellungen: [
      s('k-heer', 'mon', 'flaeche', 'reiter', linie([35.3800, 32.5540], 4.0, 1.4, 270), { name: 'Der Tumen in der Ebene', staerke: '10.000 bis 20.000' }),
      s('m-baibars', 'mam', 'flaeche', 'reiter', linie([35.3300, 32.5600], 2.4, 0.9, 90), { name: 'Baibars steht wieder', staerke: 'Vortrupp' }),
      s('m-heer', 'mam', 'flaeche', 'reiter', klumpen([35.3480, 32.5270], 3.2, 1.3, 120), { name: 'noch verdeckt', staerke: 'der größte Teil' }),
    ],
  },
  {
    zeit: 'Der Hinterhalt',
    t: 300,
    kurz: 'Aus den Hängen kommt der Rest des Heeres.',
    text: 'Als der Tumen weit genug drin ist, kommt das Hauptheer aus den Falten des Geländes und schließt von Süden und Norden auf. Für einen Augenblick ist die Übermacht auf der anderen Seite – und die Mongolen kämpfen zum ersten Mal seit Jahrzehnten gegen Reiter, die dieselben Bögen führen und dieselben Kunststücke können.',
    stellungen: [
      s('m-heer', 'mam', 'pfeil', 'reiter', pfeil([35.3550, 32.5300], [35.3700, 32.5420], [35.3800, 32.5500]), { name: 'Aus dem Gilboa-Hang' }),
      s('m-nord', 'mam', 'pfeil', 'reiter', pfeil([35.3450, 32.5960], [35.3650, 32.5760], [35.3800, 32.5620]), { name: 'und vom Givat ha-More' }),
      s('k-heer', 'mon', 'flaeche', 'reiter', linie([35.3830, 32.5540], 4.0, 1.6, 270), { name: 'zwischen zwei Hängen', staerke: '10.000 bis 20.000' }),
      s('m-baibars', 'mam', 'flaeche', 'reiter', linie([35.3380, 32.5580], 2.4, 0.9, 90), { name: 'Baibars hält von vorn', staerke: 'Vortrupp' }),
    ],
  },
  {
    zeit: 'Mittag',
    t: 360,
    kurz: 'Der linke mamlukische Flügel bricht trotzdem.',
    text: 'Kitbuqa greift nicht an, wo man ihn erwartet, sondern wirft alles gegen den linken mamlukischen Flügel – und der geht zurück. Für eine Weile sieht es so aus, als schlage sich der eingeschlossene Tumen aus der Falle heraus. Das ist der Punkt, an dem die Schlacht hätte kippen können, und er ist auch in den mongolisch geneigten Quellen so überliefert.',
    stellungen: [
      s('k-stoss', 'mon', 'pfeil', 'reiter', pfeil([35.3800, 32.5560], [35.3650, 32.5720], [35.3500, 32.5850]), { name: 'Alles gegen den linken Flügel' }),
      s('m-nord', 'mam', 'flaeche', 'reiter', linie([35.3480, 32.5880], 2.6, 1.0, 120), { name: 'Der linke Flügel weicht', geschlagen: true }),
      s('k-heer', 'mon', 'flaeche', 'reiter', linie([35.3760, 32.5620], 3.8, 1.6, 300), { name: 'sucht den Ausbruch', staerke: '10.000 bis 20.000' }),
      s('m-heer', 'mam', 'flaeche', 'reiter', klumpen([35.3700, 32.5400], 3.0, 1.3, 120), { name: 'Qutuz mit der Mitte', staerke: 'der größte Teil' }),
    ],
  },
  {
    zeit: 'Kurz danach',
    t: 420,
    kurz: 'Qutuz wirft den Helm weg und ruft die Seinen zurück.',
    text: 'Qutuz reißt sich nach der Überlieferung den Helm herunter, damit man ihn sieht, ruft dreimal „O mein Islam!“ und reitet in die weichende Linie hinein. Die Fliehenden kehren um; ob es an diesem Auftritt lag oder daran, dass die mongolischen Pferde nach Stunden am Ende waren, sagt keine Quelle. Der Flügel steht wieder, und der Ring schließt sich erneut.',
    stellungen: [
      s('m-qutuz', 'mam', 'pfeil', 'reiter', pfeil([35.3700, 32.5450], [35.3600, 32.5680], [35.3520, 32.5830]), { name: 'Qutuz reitet in die Lücke' }),
      s('m-nord', 'mam', 'flaeche', 'reiter', linie([35.3520, 32.5820], 2.8, 1.0, 120), { name: 'Der Flügel kehrt um' }),
      s('k-heer', 'mon', 'flaeche', 'reiter', linie([35.3800, 32.5600], 3.6, 1.6, 300), { name: 'wieder eingeschlossen', staerke: 'ermattet', geschlagen: true }),
      s('m-heer', 'mam', 'flaeche', 'reiter', klumpen([35.3760, 32.5400], 3.0, 1.3, 120), { name: 'Die Mitte drückt', staerke: 'der größte Teil' }),
    ],
  },
  {
    zeit: 'Nachmittag',
    t: 480,
    kurz: 'Die syrischen Hilfstruppen laufen davon.',
    text: 'Die ayyubidischen Verbände, die Kitbuqa aus dem eroberten Syrien mitgenommen hat, lösen sich und reiten davon – ihr Fürst al-Aschraf Musa hat sich den Mongolen erst unterworfen, als sie schon vor Damaskus standen. Damit ist die Zahl endgültig gegen den Tumen. Was noch steht, wird nach Süden gegen den Gilboa gedrängt.',
    stellungen: [
      s('k-ayyub', 'mon', 'pfeil', 'reiter', pfeil([35.4000, 32.5700], [35.4400, 32.5900], [35.4900, 32.6100]), { name: 'Die Syrer laufen davon', rueckzug: true }),
      s('k-heer', 'mon', 'flaeche', 'reiter', klumpen([35.3850, 32.5450], 3.0, 1.4, 300), { name: 'gegen den Gilboa gedrückt', staerke: 'Reste', geschlagen: true }),
      s('m-heer', 'mam', 'pfeil', 'reiter', pfeil([35.3600, 32.5550], [35.3750, 32.5500], [35.3860, 32.5470]), { name: 'Druck von Westen' }),
      s('m-nord', 'mam', 'flaeche', 'reiter', linie([35.3800, 32.5720], 2.8, 1.0, 180), { name: 'schließt von Norden' }),
    ],
  },
  {
    zeit: 'Das Ende',
    t: 540,
    kurz: 'Kitbuqa wird gefangen und bleibt beim Wort.',
    text: 'Kitbuqas Pferd stürzt, er wird gefangen und vor Qutuz gebracht. Nach der Überlieferung sagt er ihm ins Gesicht, er sei zeitlebens ein Sklave seines Herrn gewesen und kein Verräter wie andere hier, und der Khan werde kommen und die Pferde bis Ägypten tränken. Dann wird er hingerichtet. Reste des Tumens werden bis Baisan verfolgt.',
    stellungen: [
      s('k-heer', 'mon', 'flaeche', 'reiter', klumpen([35.4050, 32.5380], 2.2, 1.3, 300), { name: 'Kitbuqa gefangen', staerke: 'Reste', geschlagen: true }),
      s('k-flucht', 'mon', 'pfeil', 'reiter', pfeil([35.4200, 32.5350], [35.4600, 32.5200], [35.4950, 32.5000]), { name: 'Verfolgung bis Baisan', rueckzug: true }),
      s('m-heer', 'mam', 'flaeche', 'reiter', linie([35.3800, 32.5450], 3.4, 1.2, 90), { name: 'Das Feld', staerke: 'rund 18.000' }),
      s('m-verfolg', 'mam', 'pfeil', 'reiter', pfeil([35.4000, 32.5400], [35.4400, 32.5250], [35.4800, 32.5080]), { name: 'nach Osten nach' }),
    ],
  },
  {
    zeit: 'Nach dem 3. September',
    t: 620,
    kurz: 'Die Westgrenze der Mongolen bleibt am Euphrat.',
    text: 'Damaskus und Aleppo fallen binnen Wochen an die Mamluken zurück. Die Mongolen kommen noch mehrfach wieder, kommen aber nie über die Linie hinaus, die hier gezogen wird – die Ilchane werden hundert Jahre lang mit den Mamluken kämpfen, sich zum Islam bekehren und schließlich zerfallen. Qutuz erlebt seinen Sieg nicht lange: Auf dem Rückweg nach Kairo wird er von Baibars und dessen Leuten erschlagen, und Baibars wird Sultan.',
    uebersicht: true,
    sicht: [[27.5, 22.5], [58.5, 43.5]],
    stellungen: [
      s('m-syrien', 'mam', 'pfeil', 'reiter', pfeil([35.36, 32.55], [36.29, 33.51], [37.16, 36.20]), { name: 'Damaskus und Aleppo zurück' }),
      s('mon-grenze', 'mon', 'pfeil', 'reiter', pfeil([38.30, 37.20], [39.80, 35.00], [41.30, 33.40], [44.36, 33.31]), { name: 'Die Grenze bleibt am Euphrat' }),
      s('m-kreuz', 'mam', 'pfeil', 'gemischt', pfeil([35.36, 32.55], [34.99, 32.83], [35.10, 33.27], [35.52, 33.90]), { name: 'Bis 1291: die Kreuzfahrerstaaten' }),
      s('m-mord', 'mam', 'pfeil', 'reiter', pfeil([35.20, 32.30], [34.30, 31.40], [31.24, 30.05]), { name: 'Auf dem Rückweg wird Qutuz erschlagen' }),
    ],
  },
];

export const ainjalut = {
  id: 'ainjalut',
  name: 'Ain Djalut',
  ort: 'Die Ebene von Jesreel',
  datum: '3. September 1260',
  jahr: 1260,
  mitte: [35.3700, 32.5560],
  zoom: 11.6,
  grund: 'relief',
  worum: 'Zwanzig Jahre nach Muhi steht der mongolischen Reiterei zum ersten Mal ein Gegner gegenüber, der genauso kämpft: Die Mamluken sind selbst Steppenreiter, als Kinder verkauft und in Ägypten ausgebildet. Deshalb ist dies die Karte einer Umkehrung – ein Vortrupp weicht scheinbar, zieht die Mongolen in eine Ebene, und an deren Hängen wartet das Heer. Die Falle ist die, die ihre eigene Seite erfunden hat.',
  parteien,
  gelaende,
  stationen,
  ausgang: 'Der Tumen wird in der Ebene eingeschlossen und aufgerieben; Kitbuqa wird gefangen und hingerichtet.',
  verluste: [
    { partei: 'mon', text: 'der Tumen als Verband vernichtet, der Befehlshaber hingerichtet' },
    { partei: 'mam', text: 'nicht überliefert; der linke Flügel zeitweise geworfen' },
  ],
  folgen: 'Syrien fällt binnen Wochen an die Mamluken zurück; die mongolische Westgrenze bleibt am Euphrat und wird es bleiben. Die Ilchane führen noch ein Jahrhundert Krieg gegen Kairo, ohne diese Linie zu überschreiten, treten zum Islam über und zerfallen. Baibars erschlägt Qutuz auf dem Rückweg, wird Sultan und beginnt die Eroberung der Kreuzfahrerstaaten, die 1291 mit Akkon endet.',
  streit: 'Ob die Schlacht wirklich ein Wendepunkt war oder ob Kitbuqa nur mit einer Nachhut geschlagen wurde, während das eigentliche Heer längst in Persien stand, wird bis heute unterschiedlich beurteilt – die Zahlen sprechen eher für Letzteres, die Wirkung für Ersteres. Die Truppenstärken sind Schätzungen; die Reden von Qutuz und Kitbuqa stammen aus späteren arabischen Chroniken und sind literarisch. Der genaue Ort im Umkreis der Quelle ist nicht gesichert.',
};
