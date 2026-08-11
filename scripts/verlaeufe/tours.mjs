#!/usr/bin/env node
/*
 * ACHTUNG – Verhältnis zu src/data/battles/tours.json: Dieses Skript hat die
 * JSON-Datei einmal erzeugt; danach ist die JSON-Datei die gültige Fassung.
 */
/**
 * Tours und Poitiers, Oktober 732.
 *
 * Eine Schlacht, über deren Bedeutung mehr geschrieben wurde als über ihren
 * Verlauf – und deren Verlauf gerade deshalb interessant ist: Sieben Tage
 * lang steht nichts anderes auf dem Feld als zwei Heere, die einander
 * ansehen. Karl hat den Waldrand und die Höhe besetzt und rührt sich nicht.
 * Er weiß, dass seine Fußtruppe im offenen Feld gegen Reiterei nichts
 * ausrichtet – und dass die Reiterei gegen ein geschlossenes Karree im Wald
 * ebenso wenig kann.
 *
 * Der Ort steht nicht sicher fest; die Forschung setzt ihn meist bei
 * Moussais nördlich von Poitiers an, wo die Römerstraße von Poitiers nach
 * Tours zwischen Clain und Vienne verläuft.
 */
import { linie, klumpen, pfeil } from '../lib/stellung.mjs';

const FELD = [0.5150, 46.7550];
const parteien = [
  {
    id: 'fra', name: 'Franken und Burgunder', farbe: '#6f9fe0',
    fuehrung: 'Karl Martell, Eudo von Aquitanien',
    staerke: '15.000 bis 20.000, fast nur Fußvolk', zahl: 18000,
  },
  {
    id: 'umy', name: 'Umayyaden', farbe: '#7fbf7f',
    fuehrung: 'Abd ar-Rahman al-Ghafiqi',
    staerke: '20.000 bis 25.000, überwiegend Reiterei', zahl: 22000,
  },
];

const gelaende = [
  { art: 'wald', name: 'Wald', punkte: klumpen([0.5080, 46.7640], 3.4, 1.3, 60) },
  { art: 'hoehe', name: 'Höhenrücken', punkte: linie([0.5150, 46.7590], 3.6, 1.0, 100) },
  { art: 'fluss', name: 'Clain', punkte: pfeil([0.4600, 46.7100], [0.4750, 46.7500], [0.4900, 46.7950]) },
  { art: 'fluss', name: 'Vienne', punkte: pfeil([0.5900, 46.7000], [0.5700, 46.7500], [0.5500, 46.8100]) },
  { art: 'weg', name: 'Römerstraße nach Tours', punkte: pfeil([0.5250, 46.7100], [0.5180, 46.7550], [0.5100, 46.8100]) },
];

const s = (id, partei, form, gattung, punkte, mehr = {}) => ({ id, partei, form, gattung, punkte, ...mehr });

const stationen = [
  {
    zeit: 'Frühjahr 732',
    t: 0,
    kurz: 'Ein Zug, der bis an die Loire reicht.',
    text: 'Der Statthalter von al-Andalus führt einen großen Beutezug über die Pyrenäen. Bordeaux fällt, Eudo von Aquitanien wird an der Garonne geschlagen und flieht nach Norden zu Karl Martell – demselben Karl, gegen den er sich jahrelang gewehrt hat. Das Ziel des Zuges ist der Schatz von Saint-Martin in Tours, die reichste Kirche des Frankenreichs.',
    uebersicht: true,
    sicht: [[-2.4, 42.8], [3.4, 49.3]],
    stellungen: [
      s('anm-umy', 'umy', 'pfeil', 'reiter', pfeil([-1.55, 43.30], [-0.58, 44.84], [0.15, 45.65], [0.52, 46.58]), { name: 'von Pamplona über Bordeaux' }),
      s('anm-fra', 'fra', 'pfeil', 'gemischt', pfeil([2.35, 48.86], [1.40, 48.10], [0.68, 47.39], [0.52, 46.85]), { name: 'Karl von Norden' }),
    ],
  },
  {
    zeit: 'Oktober · Tag 1',
    t: 120,
    kurz: 'Karl stellt sich in den Weg – und wählt den Boden.',
    text: 'Karl ist in Eilmärschen gekommen und stellt sich zwischen die Reiterei und Tours, auf eine bewaldete Höhe. Der Boden ist der ganze Plan: Vor ihm steigt das Gelände an, seine Flanken lehnen an Wald, und die Bäume nehmen der Reiterei den Schwung. Abd ar-Rahman findet ein Heer vor, wo er keines erwartet hat.',
    stellungen: [
      s('f-karree', 'fra', 'flaeche', 'fuss', linie([0.5150, 46.7570], 2.6, 0.8, 190), { name: 'Fußvolk in geschlossener Front', staerke: '18.000' }),
      s('u-lager', 'umy', 'flaeche', 'reiter', klumpen([0.5200, 46.7280], 2.2), { name: 'Umayyadisches Lager', staerke: '22.000' }),
    ],
  },
  {
    zeit: 'Tage 2 bis 6',
    t: 300,
    kurz: 'Sechs Tage Stillstand – und beide haben Gründe dafür.',
    text: 'Sechs Tage lang geschieht nichts als Geplänkel. Karl wartet, weil die Zeit für ihn arbeitet: Es wird kälter, und ein Reiterheer im Feindesland muss sein Futter finden. Abd ar-Rahman wartet, weil seine Verbände noch verstreut plündern und weil er den Hang hinauf nicht angreifen will. Vor allem aber hängt ihm die Beute von Bordeaux nach – ein Tross, den er nicht im Stich lassen kann und der ihn unbeweglich macht.',
    stellungen: [
      s('f-karree', 'fra', 'flaeche', 'fuss', linie([0.5150, 46.7570], 2.6, 0.8, 190), { name: 'rührt sich nicht', staerke: '18.000' }),
      s('u-lager', 'umy', 'flaeche', 'reiter', klumpen([0.5200, 46.7280], 2.2), { name: 'sammelt seine Verbände', staerke: '22.000' }),
      s('u-tross', 'umy', 'flaeche', 'gemischt', klumpen([0.5320, 46.7150], 1.6), { name: 'Beutetross aus Bordeaux', staerke: 'Tross' }),
      s('u-spaeh', 'umy', 'pfeil', 'reiter', pfeil([0.5230, 46.7350], [0.5200, 46.7470]), { name: 'Geplänkel', finte: true }),
    ],
  },
  {
    zeit: 'Tag 7 · Morgen',
    t: 480,
    kurz: 'Die Reiterei greift an.',
    text: 'Am siebten Tag lässt Abd ar-Rahman angreifen – bergauf, gegen eine geschlossene Front. Die arabische Reiterei ist die beste der Zeit, und sie reitet immer wieder an. Aber ein Fußvolk, das nicht ausweicht, ist gegen Reiterei fast nicht zu brechen: Pferde laufen nicht in eine Mauer aus Menschen, sie weichen aus.',
    stellungen: [
      s('f-karree', 'fra', 'flaeche', 'fuss', linie([0.5150, 46.7570], 2.6, 0.8, 190), { name: 'Karree hält', staerke: '18.000' }),
      s('u-reiterM', 'umy', 'flaeche', 'reiter', linie([0.5150, 46.7440], 2.4, 0.6, 10), { name: 'Erster Anritt', staerke: '10.000' }),
      s('u-stoss1', 'umy', 'pfeil', 'reiter', pfeil([0.5150, 46.7420], [0.5150, 46.7530]), {}),
      s('u-reiterL', 'umy', 'flaeche', 'reiter', linie([0.4930, 46.7420], 1.2, 0.5, 20), { name: 'linker Flügel', staerke: '5.000' }),
      s('u-reiterR', 'umy', 'flaeche', 'reiter', linie([0.5380, 46.7420], 1.2, 0.5, 0), { name: 'rechter Flügel', staerke: '5.000' }),
    ],
  },
  {
    zeit: 'Tag 7 · Mittag',
    t: 540,
    kurz: '„Wie eine Mauer aus Eis.“',
    text: 'Die fränkischen Reihen halten Stunde um Stunde. Ein späterer Chronist schreibt, sie hätten dagestanden „wie eine Mauer, wie ein Wall aus Eis“ – ein Bild, das hängen geblieben ist, weil es genau das beschreibt, worauf Karl gesetzt hat. An einer Stelle brechen Reiter bis in die Mitte durch, werden aber eingeschlossen.',
    stellungen: [
      s('f-karree', 'fra', 'flaeche', 'fuss', linie([0.5150, 46.7570], 2.6, 0.9, 190), { name: 'hält', staerke: '17.000' }),
      s('u-reiterM', 'umy', 'flaeche', 'reiter', linie([0.5150, 46.7500], 2.2, 0.7, 10), { name: 'immer neue Anritte', staerke: '9.000' }),
      s('u-einbruch', 'umy', 'pfeil', 'reiter', pfeil([0.5150, 46.7490], [0.5150, 46.7560], [0.5140, 46.7590]), { name: 'Einbruch in die Mitte' }),
      s('u-reiterL', 'umy', 'flaeche', 'reiter', linie([0.4940, 46.7460], 1.2, 0.5, 20), { name: 'linker Flügel', staerke: '4.500' }),
      s('u-reiterR', 'umy', 'flaeche', 'reiter', linie([0.5370, 46.7460], 1.2, 0.5, 0), { name: 'rechter Flügel', staerke: '4.500' }),
    ],
  },
  {
    zeit: 'Tag 7 · Nachmittag',
    t: 600,
    kurz: 'Eudos Reiter gehen um den Wald herum – auf das Lager.',
    text: 'Eudo von Aquitanien führt seine Reiter außen um den Wald herum und fällt über das umayyadische Lager her, in dem die Beute liegt. Das Gerücht, der Tross werde geplündert, läuft durch die Reihen. Ganze Verbände brechen den Kampf ab und reiten zurück – nicht aus Furcht vor den Franken, sondern aus Sorge um das, wofür sie gekommen sind.',
    stellungen: [
      s('f-eudo', 'fra', 'pfeil', 'reiter', pfeil([0.4880, 46.7620], [0.4900, 46.7350], [0.5140, 46.7180], [0.5300, 46.7160]), { name: 'Eudo auf das Lager' }),
      s('u-tross', 'umy', 'flaeche', 'gemischt', klumpen([0.5320, 46.7150], 1.6), { name: 'Tross unter Angriff', staerke: 'Tross', geschlagen: true }),
      s('u-rueckstrom', 'umy', 'pfeil', 'reiter', pfeil([0.5150, 46.7500], [0.5200, 46.7300], [0.5290, 46.7180]), { name: 'zurück zum Lager', rueckzug: true }),
      s('f-karree', 'fra', 'flaeche', 'fuss', linie([0.5150, 46.7570], 2.6, 0.9, 190), { name: 'hält weiter', staerke: '17.000' }),
      s('u-reiterM', 'umy', 'flaeche', 'reiter', linie([0.5150, 46.7480], 1.6, 0.6, 10), { name: 'löst sich auf', staerke: '5.000', geschlagen: true }),
    ],
  },
  {
    zeit: 'Tag 7 · Abend',
    t: 660,
    kurz: 'Abd ar-Rahman fällt beim Versuch, die Ordnung zu halten.',
    text: 'Der Statthalter reitet in den Rückstrom hinein, um die Verbände zurückzuholen, und wird dabei umringt und getötet. Damit ist die Führung weg. Die Franken machen keine Verfolgung – Karl vermutet eine Falle und lässt seine Leute in Reih und Glied auf dem Feld stehen.',
    stellungen: [
      s('u-fuehrung', 'umy', 'flaeche', 'reiter', klumpen([0.5180, 46.7360], 0.8), { name: 'Abd ar-Rahman fällt', staerke: 'Gefolge', geschlagen: true }),
      s('f-karree', 'fra', 'flaeche', 'fuss', linie([0.5150, 46.7570], 2.6, 0.9, 190), { name: 'bleibt stehen', staerke: '17.000' }),
      s('u-rueckstrom', 'umy', 'pfeil', 'reiter', pfeil([0.5150, 46.7450], [0.5230, 46.7250], [0.5320, 46.7130]), { name: 'ins Lager zurück', rueckzug: true }),
    ],
  },
  {
    zeit: 'Am nächsten Morgen',
    t: 780,
    kurz: 'Die Zelte stehen noch – das Heer ist weg.',
    text: 'Am Morgen stellen sich die Franken erneut in Schlachtordnung auf und warten. Als nichts geschieht, schicken sie Späher vor: Das Lager steht voll mit Zelten und Beute, aber es ist leer. Die Umayyaden sind in der Nacht nach Süden abgezogen. Karl lässt sie ziehen und macht keinen Feldzug daraus.',
    stellungen: [
      s('f-karree', 'fra', 'flaeche', 'fuss', linie([0.5150, 46.7500], 2.6, 0.9, 190), { name: 'in Schlachtordnung', staerke: '17.000' }),
      s('u-abzug', 'umy', 'pfeil', 'reiter', pfeil([0.5300, 46.7150], [0.5200, 46.6700], [0.5000, 46.6000]), { name: 'nachts nach Süden abgezogen', rueckzug: true }),
      s('u-tross', 'umy', 'flaeche', 'gemischt', klumpen([0.5320, 46.7150], 1.4), { name: 'zurückgelassenes Lager', staerke: 'leer', geschlagen: true }),
    ],
  },
  {
    zeit: 'Bis 759',
    t: 960,
    kurz: 'Was die Schlacht war – und was nicht.',
    text: 'Der Zug nach Norden endet, und weitere in dieser Größe gibt es nicht mehr. Die umayyadische Herrschaft nördlich der Pyrenäen hält aber noch ein Vierteljahrhundert: Narbonne fällt erst 759. Das Bild vom „Kampf um Europa“ stammt aus dem 18. und 19. Jahrhundert; Zeitgenossen sahen einen abgewehrten Beutezug unter vielen. Für das Frankenreich zählte etwas anderes – Karl war jetzt der Mann, der die Reiterei geschlagen hatte, und begann, sich ein eigenes Reiterheer zu bauen. Sein Enkel heißt Karl der Große.',
    uebersicht: true,
    sicht: [[-4.0, 41.5], [5.5, 49.5]],
    stellungen: [
      s('u-rueck', 'umy', 'pfeil', 'reiter', pfeil([0.52, 46.70], [0.10, 45.20], [-0.30, 43.60], [-1.20, 42.60]), { name: 'zurück über die Pyrenäen', rueckzug: true }),
      s('u-narbonne', 'umy', 'pfeil', 'gemischt', pfeil([3.00, 43.18], [2.60, 43.10], [2.20, 42.90]), { name: 'Narbonne bleibt bis 759' }),
      s('f-reich', 'fra', 'pfeil', 'gemischt', pfeil([0.52, 46.80], [2.00, 48.20], [3.40, 49.10]), { name: 'Karls Macht im Norden' }),
    ],
  },
];

export const tours = {
  id: 'tours',
  name: 'Tours und Poitiers',
  ort: 'Zwischen Poitiers und Tours',
  datum: 'Oktober 732',
  jahr: 700,
  mitte: FELD,
  zoom: 12.2,
  grund: 'relief',
  worum: 'Fußvolk gegen Reiterei – und die Frage, ob eine geschlossene Front auf einer bewaldeten Höhe hält. Sieben Tage lang geschieht nichts, weil beide Seiten gute Gründe zu warten haben. Entschieden wird die Schlacht nicht an der Front, sondern am Beutetross.',
  parteien,
  gelaende,
  stationen,
  ausgang: 'Abd ar-Rahman fällt, das umayyadische Heer zieht nachts ab und lässt sein Lager stehen. Der Vorstoß bis an die Loire wird nicht wiederholt.',
  verluste: [
    { partei: 'umy', text: 'nach fränkischen Quellen sehr hoch, nach arabischen mäßig – belastbare Zahlen fehlen' },
    { partei: 'fra', text: 'gering; die Quellen nennen keine Zahl' },
  ],
  folgen: 'Karl Martell gilt fortan als der Mann, der die Reiterei geschlagen hat, und baut das fränkische Reiterheer auf, das seine Nachfolger tragen wird. Sein Sohn setzt die Merowinger ab, sein Enkel ist Karl der Große. Die umayyadische Herrschaft nördlich der Pyrenäen endet erst 759 mit dem Fall von Narbonne.',
  streit: 'Der Ort steht nicht fest; Moussais nördlich von Poitiers ist die verbreitetste Annahme. Die Zahlen sind in allen Quellen unbrauchbar. Vor allem aber ist die Bedeutung umstritten: Die Vorstellung vom „Kampf um das christliche Europa“ ist eine Zuschreibung des 18. und 19. Jahrhunderts – arabische Chroniken behandeln das Ereignis als eine gescheiterte Unternehmung unter vielen und nennen es „die Straße der Märtyrer“.',
};
