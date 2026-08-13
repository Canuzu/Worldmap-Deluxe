#!/usr/bin/env node
/*
 * ACHTUNG – Verhältnis zu src/data/battles/hydaspes.json: Dieses Skript hat die
 * JSON-Datei einmal erzeugt; danach ist die JSON-Datei die gültige Fassung.
 */
/**
 * Am Hydaspes, Mai 326 v. Chr.
 *
 * Die einzige Schlacht Alexanders, die zur Hälfte aus einem Flussübergang
 * besteht – und deshalb die einzige, bei der die Karte mehr zeigt als die
 * Aufstellung. Poros steht mit zweihundert Elefanten am anderen Ufer; Pferde
 * gehen nicht gegen Elefanten an Land, und schon gar nicht von einem Floß
 * herunter. Also wird wochenlang nachts Lärm gemacht, bis niemand mehr
 * hinsieht, und dann im Gewitter siebenundzwanzig Kilometer flussaufwärts
 * übergesetzt.
 *
 * Der Untergrund ist „blatt“: Der Jhelum hat sein Bett seither mehrfach
 * verlegt, und wo der Übergang war, ist bis heute offen. Eine Schummerung
 * nach heutigen Daten zeigte die falsche Uferlinie.
 *
 * Der Schauplatz liegt bei rund 73.7 Ost, 32.8 Nord.
 */
import { linie, klumpen, pfeil } from '../lib/stellung.mjs';

const LAGER_MAK = [73.6400, 32.7300];
const LAGER_POR = [73.6950, 32.7000];
const UEBERGANG = [73.8700, 32.9100];
const FELD = [73.7900, 32.8300];

const parteien = [
  {
    id: 'mak', name: 'Makedonien', farbe: '#6f9fe0',
    fuehrung: 'Alexander, Koinos, Krateros, Seleukos, Hephaistion',
    staerke: 'rund 40.000 im Lager, davon 11.000 beim nächtlichen Übergang – 5.000 Reiter, 6.000 zu Fuß',
    zahl: 40000,
  },
  {
    id: 'por', name: 'Das Reich des Poros', farbe: '#d4737c',
    fuehrung: 'Poros, sein ältester Sohn',
    staerke: 'rund 30.000 zu Fuß, 4.000 Reiter, 300 Kampfwagen und um die 200 Elefanten',
    zahl: 34000,
  },
];

const gelaende = [
  {
    art: 'fluss',
    name: 'Hydaspes · der Jhelum, vom Monsun angeschwollen',
    punkte: pfeil([73.9400, 32.9700], [73.8600, 32.9000], [73.7600, 32.8100],
      [73.6600, 32.7200], [73.5600, 32.6300], [73.4800, 32.5500]),
  },
  { art: 'furt', name: 'Die Stelle des nächtlichen Übergangs', punkte: klumpen(UEBERGANG, 2.0, 1.4, 40) },
  { art: 'wald', name: 'Das bewaldete Vorland am Knie', punkte: klumpen([73.8900, 32.9250], 3.0, 1.6, 40) },
  { art: 'stadt', name: 'Das makedonische Hauptlager', punkte: klumpen(LAGER_MAK, 2.0, 1.2, 40) },
  { art: 'sumpf', name: 'Der zweite Arm und der aufgeweichte Boden', punkte: klumpen([73.8400, 32.8800], 2.4, 2.0, 40) },
];

const s = (id, partei, form, gattung, punkte, mehr = {}) => ({ id, partei, form, gattung, punkte, ...mehr });

const stationen = [
  {
    zeit: 'Frühjahr 326 v. Chr.',
    t: 0,
    kurz: 'Nach Persien noch ein Reich, das nicht aufgibt.',
    text: 'Fünf Jahre nach Gaugamela ist das Perserreich erobert, und Alexander zieht weiter, weil er nicht weiß, wo es aufhört – nach der Vorstellung seiner Zeit liegt hinter Indien der Weltozean. Über den Hindukusch geht es in den Pandschab. Taxila unterwirft sich freiwillig und liefert Truppen. Der nächste Herrscher, Poros, lässt ausrichten, er werde an der Grenze warten – in Waffen.',
    uebersicht: true,
    sicht: [[49.5, 21.5], [82.5, 42.5]],
    stellungen: [
      s('anm-mak', 'mak', 'pfeil', 'gemischt', pfeil([52.89, 29.94], [58.40, 33.00], [66.90, 36.76], [69.18, 34.53], [72.83, 33.74], [73.64, 32.73]), { name: 'Von Persepolis über Baktrien und Taxila' }),
      s('anm-por', 'por', 'pfeil', 'gemischt', pfeil([74.90, 31.60], [74.20, 32.10], [73.70, 32.68]), { name: 'Poros stellt sich an den Fluss' }),
      s('anm-ende', 'mak', 'pfeil', 'gemischt', pfeil([73.70, 32.80], [74.80, 31.80], [75.60, 31.30]), { name: 'Weiter nach Osten – bis zum Hyphasis' }),
    ],
  },
  {
    zeit: 'Am Fluss',
    t: 60,
    kurz: 'Ein Fluss im Monsun und zweihundert Elefanten.',
    text: 'Der Hydaspes führt Schmelzwasser und die ersten Monsunregen und ist mehrere hundert Meter breit. Poros steht am anderen Ufer und hat seine Elefanten so verteilt, dass sie jede Landestelle abdecken. Damit ist der gerade Weg verbaut: Pferde gehen nicht gegen Elefanten an, und ein Floß, dessen Pferde scheuen, kippt. Ein Übergang gegen diese Aufstellung ist nicht zu machen.',
    stellungen: [
      s('m-lager', 'mak', 'flaeche', 'gemischt', klumpen(LAGER_MAK, 2.6, 1.2, 40), { name: 'Das Hauptlager am Westufer', staerke: 'rund 40.000' }),
      s('p-ufer', 'por', 'flaeche', 'gemischt', linie([73.7000, 32.7100], 8.0, 1.4, 315), { name: 'Poros am Ostufer', staerke: '34.000' }),
      s('p-elefanten', 'por', 'flaeche', 'gemischt', linie([73.6900, 32.7220], 8.0, 0.5, 315), { name: 'Elefanten entlang der Landestellen', staerke: 'rund 200' }),
    ],
  },
  {
    zeit: 'Wochen',
    t: 130,
    kurz: 'Wochenlang Lärm bei Nacht, bis keiner mehr hinsieht.',
    text: 'Alexander lässt Getreide heranfahren, als wolle er bis nach dem Monsun warten, und schickt jede Nacht Reiterei am Ufer auf und ab, mit Rufen und Trompeten, mal hier, mal dort. Poros lässt anfangs jedes Mal parallel marschieren. Nach einigen Wochen hört er damit auf, weil nie etwas passiert. Genau das ist der Zweck der Übung.',
    stellungen: [
      s('m-laerm1', 'mak', 'pfeil', 'reiter', pfeil([73.6400, 32.7400], [73.7300, 32.8000], [73.8000, 32.8600]), { name: 'Nächtliche Scheinbewegung', finte: true }),
      s('m-laerm2', 'mak', 'pfeil', 'reiter', pfeil([73.6400, 32.7200], [73.5800, 32.6600], [73.5300, 32.6100]), { name: 'und in die andere Richtung', finte: true }),
      s('m-lager', 'mak', 'flaeche', 'gemischt', klumpen(LAGER_MAK, 2.6, 1.2, 40), { name: 'Das Lager bleibt liegen', staerke: 'rund 40.000' }),
      s('p-ufer', 'por', 'flaeche', 'gemischt', linie([73.7000, 32.7100], 8.0, 1.4, 315), { name: 'Poros reagiert immer seltener', staerke: '34.000' }),
    ],
  },
  {
    zeit: 'Die Nacht',
    t: 200,
    kurz: 'Im Gewitter siebenundzwanzig Kilometer flussaufwärts.',
    text: 'In einer Nacht mit schwerem Gewitter – der Donner schluckt jedes Geräusch – führt Alexander 5.000 Reiter und 6.000 Mann zu Fuß landeinwärts nach Norden, zu einem bewaldeten Knie des Flusses. Dort liegen Boote, die in Teilen vom Indus herangeschafft und wieder zusammengesetzt wurden, dazu mit Stroh gestopfte Zelthäute. Krateros bleibt im Hauptlager, mit dem Befehl, erst überzusetzen, wenn Poros abzieht.',
    stellungen: [
      s('m-marsch', 'mak', 'pfeil', 'gemischt', pfeil([73.6450, 32.7450], [73.7100, 32.8100], [73.7900, 32.8700], [73.8600, 32.9050]), { name: 'Nachtmarsch nach Norden' }),
      s('m-krateros', 'mak', 'flaeche', 'gemischt', klumpen(LAGER_MAK, 2.4, 1.2, 40), { name: 'Krateros bleibt im Lager', staerke: 'der größere Teil' }),
      s('p-ufer', 'por', 'flaeche', 'gemischt', linie([73.7000, 32.7100], 8.0, 1.4, 315), { name: 'Poros merkt nichts', staerke: '34.000' }),
      s('m-boote', 'mak', 'flaeche', 'schiff', klumpen([73.8750, 32.9130], 1.4), { name: 'Boote und gestopfte Häute' }),
    ],
  },
  {
    zeit: 'Morgengrauen',
    t: 260,
    kurz: 'Was wie das andere Ufer aussah, war eine Insel.',
    text: 'Am anderen Ufer angekommen, stellt sich heraus, dass es kein Ufer ist, sondern eine Sandbank: Dahinter liegt ein zweiter Arm. Nach dem Regen der Nacht ist er tief; die Fußtruppen waten bis zur Brust, die Reiter bis zum Hals der Pferde. Es kostet Stunden, und es ist der Augenblick, in dem die ganze Unternehmung hätte auffliegen können.',
    stellungen: [
      s('m-uebersetzt', 'mak', 'flaeche', 'gemischt', klumpen([73.8600, 32.9020], 2.2, 1.3, 40), { name: 'Auf der Sandbank', staerke: '11.000' }),
      s('m-waten', 'mak', 'pfeil', 'gemischt', pfeil([73.8600, 32.9000], [73.8450, 32.8850], [73.8300, 32.8700]), { name: 'Durch den zweiten Arm' }),
      s('p-ufer', 'por', 'flaeche', 'gemischt', linie([73.7000, 32.7100], 8.0, 1.4, 315), { name: 'Poros erhält die erste Meldung', staerke: '34.000' }),
      s('m-krateros', 'mak', 'flaeche', 'gemischt', klumpen(LAGER_MAK, 2.4, 1.2, 40), { name: 'Krateros wartet', staerke: 'der größere Teil' }),
    ],
  },
  {
    zeit: 'Vormittag',
    t: 320,
    kurz: 'Der Sohn des Poros kommt mit Wagen in den Schlamm.',
    text: 'Poros glaubt zunächst an eine weitere Scheinbewegung und schickt seinen ältesten Sohn mit 2.000 Reitern und 120 Kampfwagen nach Norden, um nachzusehen. Die Wagen bleiben im aufgeweichten Boden stecken und sind wertlos; die Reiterei wird von der makedonischen überrannt. Der Sohn fällt. Erst jetzt weiß Poros, dass Alexander mit dem Heer drüben ist.',
    stellungen: [
      s('p-sohn', 'por', 'flaeche', 'reiter', linie([73.8000, 32.8500], 3.0, 1.0, 20), { name: 'Der Sohn des Poros', staerke: '2.000 Reiter, 120 Wagen', geschlagen: true }),
      s('m-reiter', 'mak', 'pfeil', 'reiter', pfeil([73.8350, 32.8720], [73.8150, 32.8600], [73.8020, 32.8520]), { name: 'Die Gefährtenreiterei' }),
      s('m-uebersetzt', 'mak', 'flaeche', 'gemischt', klumpen([73.8350, 32.8720], 2.4, 1.3, 40), { name: 'Alexander mit 11.000', staerke: '11.000' }),
      s('p-ufer', 'por', 'flaeche', 'gemischt', linie([73.7000, 32.7100], 8.0, 1.4, 315), { name: 'Poros bricht auf', staerke: '34.000' }),
    ],
  },
  {
    zeit: 'Mittag',
    t: 380,
    kurz: 'Poros dreht die Front, Elefanten in einer Reihe.',
    text: 'Poros lässt einen Teil gegen Krateros stehen und führt den Rest nach Norden auf festen, sandigen Boden. Er stellt die Elefanten in eine Reihe mit etwa dreißig Metern Abstand, das Fußvolk in die Lücken dahinter, die Reiterei auf beide Flügel, davor die Wagen. Arrian vergleicht die Aufstellung mit einer Stadtmauer: die Elefanten die Türme, das Fußvolk die Kurtinen.',
    stellungen: [
      s('p-elefanten', 'por', 'flaeche', 'gemischt', linie([73.7850, 32.8180], 6.0, 0.5, 20), { name: 'Elefanten in einer Reihe', staerke: 'rund 200' }),
      s('p-fuss', 'por', 'flaeche', 'fuss', linie([73.7800, 32.8100], 6.0, 1.2, 20), { name: 'Fußvolk in den Lücken', staerke: '30.000' }),
      s('p-reiterL', 'por', 'flaeche', 'reiter', linie([73.7450, 32.8000], 2.0, 0.8, 20), { name: 'Reiterei links', staerke: '2.000' }),
      s('p-reiterR', 'por', 'flaeche', 'reiter', linie([73.8250, 32.8330], 2.0, 0.8, 20), { name: 'Reiterei rechts', staerke: '2.000' }),
      s('m-front', 'mak', 'flaeche', 'gemischt', linie([73.7900, 32.8480], 5.0, 1.2, 200), { name: 'Alexander tritt an', staerke: '11.000' }),
    ],
  },
  {
    zeit: 'Der Griff',
    t: 440,
    kurz: 'Koinos reitet hinten herum, um die ganze Reiterei.',
    text: 'Alexander greift die Mitte nicht an – gegen eine Elefantenreihe ist das sinnlos. Stattdessen führt er selbst die Reiterei gegen den linken indischen Flügel und schickt Koinos mit zwei Regimentern weit außen um den anderen herum. Poros zieht daraufhin auch seine rechte Reiterei nach links, um dort zu verstärken. In diesem Augenblick kommt Koinos in ihrem Rücken heraus. Die gesamte indische Reiterei steht zwischen zwei Angriffen.',
    stellungen: [
      s('m-alexander', 'mak', 'pfeil', 'reiter', pfeil([73.7700, 32.8420], [73.7550, 32.8180], [73.7480, 32.8050]), { name: 'Alexander gegen den linken Flügel' }),
      s('m-koinos', 'mak', 'pfeil', 'reiter', pfeil([73.8300, 32.8560], [73.8500, 32.8300], [73.8100, 32.8080], [73.7700, 32.7990]), { name: 'Koinos außen herum' }),
      s('p-reiterL', 'por', 'flaeche', 'reiter', linie([73.7500, 32.8020], 2.6, 1.0, 20), { name: 'Die ganze Reiterei sammelt sich links', staerke: '4.000', geschlagen: true }),
      s('p-elefanten', 'por', 'flaeche', 'gemischt', linie([73.7850, 32.8180], 6.0, 0.5, 20), { name: 'Die Elefantenreihe', staerke: 'rund 200' }),
      s('m-phalanx', 'mak', 'flaeche', 'fuss', linie([73.7880, 32.8400], 4.4, 1.0, 200), { name: 'Die Phalanx wartet ab', staerke: '6.000' }),
    ],
  },
  {
    zeit: 'Die Elefanten',
    t: 500,
    kurz: 'Sarissen gegen die Rüssel, und dann die Panik.',
    text: 'Die geworfene Reiterei flieht zwischen die eigenen Elefanten. Deren Führer treiben sie gegen die Phalanx – und dagegen hat Alexander eine Antwort geübt: Die Reihen öffnen sich, lassen die Tiere durch und stechen mit den langen Lanzen von den Seiten; Leichtbewaffnete schlagen mit Äxten auf Rüssel und Fußsehnen und schießen die Treiber herunter. Führerlose Elefanten drehen um und gehen durch die eigene Linie, „wie Schiffe, die rückwärts treiben“.',
    stellungen: [
      s('p-elefanten', 'por', 'flaeche', 'gemischt', linie([73.7880, 32.8290], 5.4, 0.6, 20), { name: 'Ohne Treiber, nach hinten durch', staerke: 'rund 200', geschlagen: true }),
      s('m-phalanx', 'mak', 'flaeche', 'fuss', linie([73.7930, 32.8390], 4.6, 1.0, 200), { name: 'Die Phalanx öffnet die Reihen', staerke: '6.000' }),
      s('p-fuss', 'por', 'flaeche', 'fuss', linie([73.7800, 32.8080], 5.6, 1.4, 20), { name: 'zusammengedrückt', staerke: '30.000', geschlagen: true }),
      s('m-koinos', 'mak', 'pfeil', 'reiter', pfeil([73.7700, 32.7980], [73.7800, 32.8060], [73.7860, 32.8120]), { name: 'Koinos von hinten' }),
      s('m-alexander', 'mak', 'pfeil', 'reiter', pfeil([73.7500, 32.8100], [73.7650, 32.8160], [73.7780, 32.8180]), { name: 'Alexander von der Seite' }),
    ],
  },
  {
    zeit: 'Nachmittag',
    t: 560,
    kurz: 'Gefragt, wie man ihn behandeln solle: wie einen König.',
    text: 'Krateros setzt jetzt mit dem Rest des Heeres über und übernimmt die Verfolgung mit frischen Truppen. Poros, nach den Quellen über zwei Meter groß, kämpft weiter, bis er an der Schulter verwundet ist, und ergibt sich als Letzter. Auf die Frage, wie er behandelt werden wolle, antwortet er: wie ein König. Alexander setzt ihn als Satrapen wieder ein und vergrößert sein Gebiet.',
    stellungen: [
      s('m-krateros', 'mak', 'pfeil', 'gemischt', pfeil([73.6500, 32.7350], [73.7000, 32.7600], [73.7600, 32.7950]), { name: 'Krateros setzt über und verfolgt' }),
      s('p-fuss', 'por', 'flaeche', 'fuss', klumpen([73.7750, 32.8060], 3.4, 1.3, 20), { name: 'Poros ergibt sich als Letzter', staerke: 'Reste', geschlagen: true }),
      s('m-front', 'mak', 'flaeche', 'gemischt', linie([73.7900, 32.8330], 5.0, 1.2, 200), { name: 'Das Feld', staerke: '11.000' }),
      s('p-flucht', 'por', 'pfeil', 'gemischt', pfeil([73.7700, 32.7900], [73.8200, 32.7500], [73.8800, 32.7100]), { name: 'Was entkommt', rueckzug: true }),
    ],
  },
  {
    zeit: 'Nach dem Hydaspes',
    t: 640,
    kurz: 'Zwei Monate später weigert sich das Heer.',
    text: 'Alexander gründet zwei Städte an der Furt: Nikaia für den Sieg und Bukephala für sein Pferd, das hier stirbt. Dann zieht er weiter nach Osten. Am Hyphasis, dem vierten der fünf Ströme, weigern sich die Truppen, noch einen Fluss zu überschreiten – nach acht Jahren und über fünfzehntausend Kilometern. Er lässt drei Tage lang niemanden vor sein Zelt und gibt dann nach. Der Rückweg durch die gedrosische Wüste kostet mehr Menschen als jede Schlacht.',
    uebersicht: true,
    sicht: [[48.5, 20.5], [80.5, 41.5]],
    stellungen: [
      s('m-hyphasis', 'mak', 'pfeil', 'gemischt', pfeil([73.70, 32.80], [74.60, 31.90], [75.55, 31.35]), { name: 'Bis zum Hyphasis – dort ist Schluss' }),
      s('m-indus', 'mak', 'pfeil', 'schiff', pfeil([73.70, 32.70], [71.50, 30.20], [68.90, 27.50], [67.30, 24.90]), { name: 'Den Indus hinunter zum Meer' }),
      s('m-gedrosien', 'mak', 'pfeil', 'gemischt', pfeil([67.30, 24.90], [63.00, 26.20], [57.70, 27.20], [52.89, 29.94]), { name: 'Der Rückweg durch die gedrosische Wüste' }),
      s('m-babylon', 'mak', 'pfeil', 'gemischt', pfeil([52.89, 29.94], [48.50, 31.30], [50.20, 33.60]), { name: '323 v. Chr.: Alexander stirbt in Babylon' }),
    ],
  },
];

export const hydaspes = {
  id: 'hydaspes',
  name: 'Am Hydaspes',
  ort: 'Am Jhelum im Pandschab',
  datum: 'Mai 326 v. Chr.',
  jahr: -326,
  mitte: [73.7400, 32.8100],
  zoom: 11.0,
  grund: 'blatt',
  worum: 'Zweihundert Elefanten am anderen Ufer machen den geraden Weg unmöglich: Pferde gehen nicht gegen sie an, und schon gar nicht von einem Floß herunter. Also wird wochenlang nachts Lärm gemacht, bis der Gegner aufhört hinzusehen – und dann im Gewitter siebenundzwanzig Kilometer flussaufwärts übergesetzt. Die halbe Schlacht ist ein Flussübergang.',
  parteien,
  gelaende,
  stationen,
  ausgang: 'Die indische Reiterei wird zwischen zwei Angriffen zerrieben, die Elefanten gehen durch die eigene Linie. Poros ergibt sich verwundet und wird als Satrap wieder eingesetzt.',
  verluste: [
    { partei: 'por', text: 'nach Arrian rund 20.000 zu Fuß und 3.000 Reiter; alle Kampfwagen, die Elefanten getötet oder erbeutet' },
    { partei: 'mak', text: 'nach Arrian 310, nach Diodor rund 1.000 – beide Zahlen gelten als zu niedrig' },
  ],
  folgen: 'Alexander gründet an der Furt Nikaia und Bukephala, letzteres nach seinem hier gestorbenen Pferd. Zwei Monate später weigert sich das Heer am Hyphasis weiterzuziehen; der Feldzug endet nicht an einem Gegner, sondern an der Erschöpfung der eigenen Leute. Der Rückweg durch die gedrosische Wüste kostet mehr Menschen als alle Schlachten zusammen. Poros bleibt Satrap, bis er um 317 v. Chr. ermordet wird; wenige Jahre später tauscht Seleukos das ganze Indusgebiet gegen 500 Kriegselefanten an Chandragupta Maurya.',
  streit: 'Der Ort ist unbekannt. Der Jhelum hat sein Bett mehrfach verlegt, keine der vorgeschlagenen Furten ist gesichert, und auch die Lage von Nikaia und Bukephala ist offen. Die Verlustzahlen Arrians sind, wie bei allen Alexanderschlachten, Siegerarithmetik. Was dagegen mehrfach und übereinstimmend überliefert ist, ist der Ablauf des Übergangs – die nächtlichen Scheinbewegungen, das Gewitter und die Insel, die keine war.',
};
