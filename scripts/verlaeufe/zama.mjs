#!/usr/bin/env node
/*
 * ACHTUNG – Verhältnis zu src/data/battles/zama.json: Dieses Skript hat die
 * JSON-Datei einmal erzeugt; danach ist die JSON-Datei die gültige Fassung.
 * Das Skript bleibt, weil es zeigt, woher die Geometrie kommt – Mittelpunkt,
 * Ausdehnung in Kilometern, Blickrichtung in Grad.
 */
/**
 * Zama, 19. Oktober 202 v. Chr.
 *
 * Die Umkehrung von Cannae, und zwar von demselben Mann angerichtet, der sie
 * dort erlitten hat. Bei Cannae umfasste Hannibals Reiterei die römische;
 * hier ist die Reiterei zum ersten Mal auf römischer Seite überlegen, weil
 * Masinissa mit seinen Numidern übergelaufen ist. Der Rest folgt daraus: Die
 * Reiterei fegt die gegnerische vom Feld, kommt zurück und fällt Hannibal in
 * den Rücken – genau die Bewegung, die Hannibal fünfzehn Jahre zuvor erfunden
 * hatte.
 *
 * Zwei Dinge sieht man nur auf der Karte: die Gassen zwischen den römischen
 * Manipeln, durch die die Elefanten hindurchlaufen sollen statt in die Linie
 * hinein, und dass Hannibals dritte Linie zweihundert Meter hinter den ersten
 * beiden steht – seine Veteranen aus Italien, die er nicht in den ersten Stoß
 * gibt.
 */
import { linie, klumpen, pfeil } from '../lib/stellung.mjs';

const FELD = [9.0500, 36.1550];
const parteien = [
  {
    id: 'rom', name: 'Rom und Numidien', farbe: '#6f9fe0',
    fuehrung: 'Publius Cornelius Scipio, Masinissa',
    staerke: '29.000 Fußvolk, 6.100 Reiter', zahl: 35100,
  },
  {
    id: 'kar', name: 'Karthago', farbe: '#d4737c',
    fuehrung: 'Hannibal Barkas',
    staerke: '36.000 Fußvolk, 4.000 Reiter, 80 Elefanten', zahl: 40000,
  },
];

const gelaende = [
  { art: 'hoehe', name: 'Hügelkette', punkte: linie([9.0300, 36.1800], 7.0, 1.2, 100) },
  { art: 'fluss', name: 'Wadi', punkte: pfeil([9.0000, 36.1300], [9.0450, 36.1380], [9.0900, 36.1420]) },
];

const s = (id, partei, form, gattung, punkte, mehr = {}) => ({ id, partei, form, gattung, punkte, ...mehr });

const stationen = [
  {
    zeit: 'Frühjahr 203',
    t: 0,
    kurz: 'Der Krieg kehrt nach Afrika zurück.',
    text: 'Scipio setzt nach Afrika über und schlägt zwei karthagische Heere. Karthago ruft daraufhin Hannibal aus Italien zurück, wo er sechzehn Jahre lang unbesiegt gestanden hat. Entscheidend ist aber etwas anderes: Masinissa, ein numidischer Fürst, wechselt mit seiner Reiterei die Seite. Damit hat Rom zum ersten Mal in diesem Krieg die bessere Reiterei.',
    uebersicht: true,
    sicht: [[7.5, 35.2], [11.5, 37.6]],
    stellungen: [
      s('anm-rom', 'rom', 'pfeil', 'gemischt', pfeil([10.32, 37.05], [9.80, 36.70], [9.20, 36.30]), { name: 'Scipio von Utica' }),
      s('anm-kar', 'kar', 'pfeil', 'gemischt', pfeil([10.32, 36.85], [9.70, 36.50], [9.15, 36.20]), { name: 'Hannibal aus Karthago' }),
      s('anm-num', 'rom', 'pfeil', 'reiter', pfeil([8.10, 36.20], [8.60, 36.20], [9.00, 36.18]), { name: 'Masinissas Numider' }),
    ],
  },
  {
    zeit: 'Am Vorabend',
    t: 60,
    kurz: 'Zwei Feldherren treffen sich zwischen den Heeren.',
    text: 'Hannibal bittet um eine Unterredung. Die beiden stehen sich zwischen den Lagern gegenüber, jeder mit einem Dolmetscher, und Hannibal bietet Frieden an: Karthago gibt Spanien, Sizilien und die Inseln auf. Scipio lehnt ab – dieselben Bedingungen habe Karthago schon einmal angenommen und dann gebrochen. Man geht auseinander und stellt sich auf.',
    stellungen: [
      s('r-lager', 'rom', 'flaeche', 'gemischt', klumpen([9.0700, 36.1450], 1.8), { name: 'Römisches Lager', staerke: '35.000' }),
      s('k-lager', 'kar', 'flaeche', 'gemischt', klumpen([9.0250, 36.1700], 2.0), { name: 'Karthagisches Lager', staerke: '40.000' }),
    ],
  },
  {
    zeit: 'Morgen · Aufstellung',
    t: 180,
    kurz: 'Hannibal in drei Linien, Scipio in Gassen.',
    text: 'Hannibal staffelt drei Treffen hintereinander: vorn Söldner aus Ligurien und Gallien, dahinter das karthagische Bürgeraufgebot, zweihundert Meter weiter zurück seine Veteranen aus Italien. Davor achtzig Elefanten. Scipio stellt seine Manipel nicht wie üblich versetzt auf, sondern **hintereinander** – so entstehen Gassen von vorn nach hinten. Wer die Aufstellung sieht, ahnt, wofür.',
    stellungen: [
      s('k-elefanten', 'kar', 'flaeche', 'gemischt', linie([9.0430, 36.1640], 2.6, 0.3, 160), { name: '80 Elefanten', staerke: '80' }),
      s('k-linie1', 'kar', 'flaeche', 'fuss', linie([9.0430, 36.1600], 2.4, 0.4, 160), { name: 'Söldner', staerke: '12.000' }),
      s('k-linie2', 'kar', 'flaeche', 'fuss', linie([9.0430, 36.1560], 2.4, 0.4, 160), { name: 'Bürgeraufgebot', staerke: '12.000' }),
      s('k-linie3', 'kar', 'flaeche', 'fuss', linie([9.0430, 36.1480], 2.6, 0.5, 160), { name: 'Veteranen aus Italien', staerke: '12.000' }),
      s('k-reiterL', 'kar', 'flaeche', 'reiter', linie([9.0180, 36.1620], 1.0, 0.4, 160), { name: 'Numidische Reiter', staerke: '2.000' }),
      s('k-reiterR', 'kar', 'flaeche', 'reiter', linie([9.0690, 36.1580], 1.0, 0.4, 160), { name: 'Karthagische Reiter', staerke: '2.000' }),
      s('r-manipel', 'rom', 'flaeche', 'fuss', linie([9.0450, 36.1380], 2.6, 0.8, 340), { name: 'Legionen in Gassen', staerke: '29.000' }),
      s('r-laelius', 'rom', 'flaeche', 'reiter', linie([9.0190, 36.1400], 1.0, 0.4, 340), { name: 'Laelius · italische Reiter', staerke: '2.700' }),
      s('r-masinissa', 'rom', 'flaeche', 'reiter', linie([9.0700, 36.1370], 1.2, 0.4, 340), { name: 'Masinissa · Numider', staerke: '3.400' }),
    ],
  },
  {
    zeit: 'Erste Stunde',
    t: 240,
    kurz: 'Die Elefanten laufen ins Leere.',
    text: 'Hannibal lässt die Elefanten anlaufen. Die Römer blasen mit allen Hörnern gleichzeitig; ein Teil der Tiere dreht ab und geht auf die eigene Reiterei los. Der Rest läuft in die Gassen, die für sie offen stehen, und wird von hinten mit Wurfspeeren erledigt. Die schlimmste Waffe des Feldes hat keine Lücke gerissen.',
    stellungen: [
      s('k-elefanten', 'kar', 'flaeche', 'gemischt', linie([9.0440, 36.1470], 2.2, 0.4, 160), { name: 'Elefanten in den Gassen', staerke: '80', geschlagen: true }),
      s('k-stoss1', 'kar', 'pfeil', 'gemischt', pfeil([9.0430, 36.1620], [9.0440, 36.1500], [9.0450, 36.1430]), {}),
      s('r-manipel', 'rom', 'flaeche', 'fuss', linie([9.0450, 36.1380], 2.6, 0.8, 340), { name: 'Legionen', staerke: '29.000' }),
      s('k-linie1', 'kar', 'flaeche', 'fuss', linie([9.0430, 36.1600], 2.4, 0.4, 160), { name: 'Söldner', staerke: '12.000' }),
      s('k-linie3', 'kar', 'flaeche', 'fuss', linie([9.0430, 36.1480], 2.6, 0.5, 160), { name: 'Veteranen', staerke: '12.000' }),
      s('r-laelius', 'rom', 'flaeche', 'reiter', linie([9.0190, 36.1400], 1.0, 0.4, 340), { name: 'Laelius', staerke: '2.700' }),
      s('r-masinissa', 'rom', 'flaeche', 'reiter', linie([9.0700, 36.1370], 1.2, 0.4, 340), { name: 'Masinissa', staerke: '3.400' }),
    ],
  },
  {
    zeit: 'Zweite Stunde',
    t: 300,
    kurz: 'Die Reiterei verlässt das Feld – auf beiden Seiten.',
    text: 'Laelius und Masinissa werfen die karthagische Reiterei und setzen ihr nach. Damit sind auf einen Schlag über zehntausend Reiter vom Feld verschwunden. Für Hannibal ist das der beste Augenblick des Tages: Sein Fußvolk steht jetzt ohne die überlegene feindliche Reiterei da – und er weiß, dass es nicht so bleiben wird.',
    stellungen: [
      s('r-laelius', 'rom', 'pfeil', 'reiter', pfeil([9.0190, 36.1400], [9.0100, 36.1600], [8.9950, 36.1850]), { name: 'verfolgt nach Nordwesten' }),
      s('r-masinissa', 'rom', 'pfeil', 'reiter', pfeil([9.0700, 36.1370], [9.0850, 36.1600], [9.1000, 36.1850]), { name: 'verfolgt nach Nordosten' }),
      s('k-reiterL', 'kar', 'pfeil', 'reiter', pfeil([9.0180, 36.1620], [9.0050, 36.1800]), { name: 'geworfen', rueckzug: true }),
      s('k-reiterR', 'kar', 'pfeil', 'reiter', pfeil([9.0690, 36.1580], [9.0880, 36.1780]), { name: 'geworfen', rueckzug: true }),
      s('r-manipel', 'rom', 'flaeche', 'fuss', linie([9.0450, 36.1420], 2.6, 0.8, 340), { name: 'Legionen rücken vor', staerke: '29.000' }),
      s('k-linie1', 'kar', 'flaeche', 'fuss', linie([9.0430, 36.1560], 2.4, 0.4, 160), { name: 'Söldner', staerke: '12.000' }),
      s('k-linie3', 'kar', 'flaeche', 'fuss', linie([9.0430, 36.1480], 2.6, 0.5, 160), { name: 'Veteranen · warten', staerke: '12.000' }),
    ],
  },
  {
    zeit: 'Dritte Stunde',
    t: 360,
    kurz: 'Die erste Linie bricht – und findet die zweite verschlossen.',
    text: 'Die Söldner werden nach hartem Kampf zurückgeworfen. Sie wollen sich durch die zweite Linie hindurch retten, aber das Bürgeraufgebot lässt sie nicht durch – Hannibals Anweisung, damit die Ordnung hält. Die Söldner fallen daraufhin über die eigene zweite Linie her. Beide Treffen weichen schließlich auf die Flügel aus.',
    stellungen: [
      s('k-linie1', 'kar', 'flaeche', 'fuss', linie([9.0430, 36.1520], 2.2, 0.4, 160), { name: 'Söldner · zurückgeworfen', staerke: '7.000', geschlagen: true }),
      s('k-linie2', 'kar', 'flaeche', 'fuss', linie([9.0430, 36.1500], 2.4, 0.4, 160), { name: 'Bürger · lassen nicht durch', staerke: '12.000' }),
      s('k-linie3', 'kar', 'flaeche', 'fuss', linie([9.0430, 36.1440], 2.6, 0.5, 160), { name: 'Veteranen · unberührt', staerke: '12.000' }),
      s('r-manipel', 'rom', 'flaeche', 'fuss', linie([9.0450, 36.1460], 2.6, 0.8, 340), { name: 'Legionen', staerke: '27.000' }),
    ],
  },
  {
    zeit: 'Vierte Stunde',
    t: 420,
    kurz: 'Scipio ordnet mitten in der Schlacht neu.',
    text: 'Vor Scipio liegt jetzt ein Feld voller Gefallener und Waffen, dahinter Hannibals unverbrauchte Veteranen. Er lässt zum Halten blasen, zieht die zweite und dritte Treffen aus der Mitte heraus und schiebt sie nach links und rechts neben die erste. Aus drei Linien hintereinander wird eine breite – so breit wie Hannibals. Das ist der schwierigste Augenblick des Tages, und er gelingt, weil die Reiterei fehlt, die ihn hätte stören können.',
    stellungen: [
      s('r-manipel', 'rom', 'flaeche', 'fuss', linie([9.0450, 36.1470], 3.2, 0.5, 340), { name: 'Eine Linie statt drei', staerke: '25.000' }),
      s('r-umbau', 'rom', 'pfeil', 'fuss', pfeil([9.0450, 36.1420], [9.0300, 36.1450], [9.0250, 36.1470]), { name: 'Umgruppierung', finte: true }),
      s('k-linie3', 'kar', 'flaeche', 'fuss', linie([9.0430, 36.1520], 3.0, 0.5, 160), { name: 'Veteranen · gleiche Breite', staerke: '12.000' }),
      s('k-reste', 'kar', 'flaeche', 'fuss', linie([9.0180, 36.1540], 1.0, 0.4, 160), { name: 'Reste der ersten Treffen', staerke: '8.000', geschlagen: true }),
    ],
  },
  {
    zeit: 'Fünfte Stunde',
    t: 480,
    kurz: 'Die Entscheidung steht auf der Kippe.',
    text: 'Jetzt stehen sich zwei gleich breite, gleich erfahrene Linien gegenüber, Mann gegen Mann, ohne Reiterei auf beiden Seiten. Nach Polybios ist der Kampf lange völlig unentschieden – die Veteranen aus Italien sind die besten Truppen, die Hannibal je geführt hat, und die Legionen sind die, die Scipio in Spanien ausgebildet hat.',
    stellungen: [
      s('r-manipel', 'rom', 'flaeche', 'fuss', linie([9.0450, 36.1495], 3.2, 0.5, 340), { name: 'Legionen', staerke: '24.000' }),
      s('k-linie3', 'kar', 'flaeche', 'fuss', linie([9.0432, 36.1512], 3.0, 0.5, 160), { name: 'Veteranen', staerke: '11.000' }),
    ],
  },
  {
    zeit: 'Sechste Stunde',
    t: 540,
    kurz: 'Die Reiterei kommt zurück – in Hannibals Rücken.',
    text: 'Und dann kehren Laelius und Masinissa von der Verfolgung zurück und fallen der karthagischen Linie in den Rücken. Es ist dieselbe Bewegung wie bei Cannae, nur mit vertauschten Rollen: Wer die Reiterei hat, entscheidet, wann die Schlacht zu Ende ist. Hannibals Linie wird eingeschlossen und aufgerieben.',
    stellungen: [
      s('r-laelius', 'rom', 'pfeil', 'reiter', pfeil([8.9950, 36.1850], [9.0180, 36.1650], [9.0350, 36.1560]), { name: 'Laelius im Rücken' }),
      s('r-masinissa', 'rom', 'pfeil', 'reiter', pfeil([9.1000, 36.1850], [9.0750, 36.1650], [9.0530, 36.1560]), { name: 'Masinissa im Rücken' }),
      s('k-linie3', 'kar', 'flaeche', 'fuss', linie([9.0432, 36.1520], 2.4, 0.6, 160), { name: 'eingeschlossen', staerke: '9.000', geschlagen: true }),
      s('r-manipel', 'rom', 'flaeche', 'fuss', linie([9.0450, 36.1480], 3.2, 0.5, 340), { name: 'Legionen', staerke: '23.000' }),
    ],
  },
  {
    zeit: 'Nach der Schlacht',
    t: 660,
    kurz: 'Hannibal reitet nach Karthago und rät zum Frieden.',
    text: 'Zwanzigtausend Karthager fallen, ebenso viele geraten in Gefangenschaft. Hannibal entkommt mit wenigen Reitern, reitet nach Karthago und sagt dort im Rat, was niemand hören will: Der Krieg ist verloren, man müsse annehmen, was Rom anbietet. Karthago verliert seine Flotte, alle Gebiete außerhalb Afrikas und das Recht, ohne römische Erlaubnis Krieg zu führen.',
    uebersicht: true,
    sicht: [[7.0, 34.8], [12.0, 37.8]],
    stellungen: [
      s('k-flucht', 'kar', 'pfeil', 'reiter', pfeil([9.05, 36.16], [9.60, 36.55], [10.20, 36.83]), { name: 'Hannibal nach Karthago', rueckzug: true }),
      s('r-sieg', 'rom', 'pfeil', 'gemischt', pfeil([9.05, 36.14], [9.70, 36.60], [10.28, 36.86]), { name: 'Scipio vor die Stadt' }),
    ],
  },
];

export const zama = {
  id: 'zama',
  name: 'Zama',
  ort: 'Ebene südwestlich von Karthago',
  datum: '19. Oktober 202 v. Chr.',
  jahr: -200,
  mitte: FELD,
  zoom: 12.4,
  grund: 'relief',
  worum: 'Das Ende des Zweiten Punischen Krieges – und die Umkehrung von Cannae, angerichtet an dem Mann, der Cannae erfunden hat. Zum ersten Mal in diesem Krieg hat Rom die bessere Reiterei, weil Masinissa übergelaufen ist. Alles Weitere folgt daraus.',
  parteien,
  gelaende,
  stationen,
  ausgang: 'Hannibals Heer wird vernichtet. Karthago nimmt den Frieden an: Verlust aller Gebiete außerhalb Afrikas, Auslieferung der Flotte, kein Krieg mehr ohne römische Erlaubnis.',
  verluste: [
    { partei: 'kar', text: 'rund 20.000 Gefallene, ebenso viele gefangen' },
    { partei: 'rom', text: 'rund 1.500 bis 2.500 Gefallene' },
  ],
  folgen: 'Rom ist ohne Gegengewicht im westlichen Mittelmeer. Scipio erhält den Beinamen Africanus. Hannibal reformiert als Beamter noch einmal die Verfassung Karthagos, geht dann ins Exil und nimmt sich Jahre später in Bithynien das Leben, um der Auslieferung zu entgehen. Karthago wird 146 v. Chr. zerstört.',
  streit: 'Wo Zama lag, ist bis heute offen – die Quellen nennen einen Ort fünf Tagesmärsche südwestlich von Karthago, und die Forschung hat dafür mindestens drei Stellen vorgeschlagen. Die hier gezeigte Ebene ist eine davon. Umstritten ist auch, ob Hannibals Elefanten schlecht ausgebildet waren oder ob Scipios Gassen die Wirkung jeder Elefantenlinie ausgehebelt hätten.',
};
