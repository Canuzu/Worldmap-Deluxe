#!/usr/bin/env node
/*
 * ACHTUNG – Verhältnis zu src/data/battles/<id>.json:
 *
 * Diese Datei hat die JSON-Datei einmal erzeugt. Danach ist die JSON-Datei die
 * gültige Fassung: Die zwölf älteren Verläufe sind von Hand geschrieben, und
 * zwei Quellen für dieselbe Sache wären eine Falle – wer die JSON-Datei
 * korrigiert und später dieses Skript laufen lässt, verliert die Korrektur.
 *
 * Das Skript bleibt trotzdem im Bestand, weil es zeigt, woher die Geometrie
 * kommt: Mittelpunkt, Ausdehnung in Kilometern, Blickrichtung in Grad. Aus
 * einer Liste von Koordinatenpaaren liest man das nicht mehr heraus.
 *
 * Neu erzeugen (überschreibt die JSON-Datei):
 *   node -e "import('./scripts/verlaeufe/NAME.mjs').then(async m => \
 *     (await import('node:fs')).writeFileSync('src/data/battles/NAME.json', \
 *      JSON.stringify(Object.values(m)[0], null, 1) + '\n'))"
 */
/**
 * Sekigahara, 21. Oktober 1600.
 *
 * Eine Schlacht, die auf dem Papier verloren war und durch einen Seitenwechsel
 * gewonnen wurde. Der Kessel von Sekigahara ist keine drei Kilometer breit;
 * die Westarmee sitzt auf den Hängen ringsum, die Ostarmee steht unten im
 * Talgrund. Wer die Karte sieht, versteht sofort, warum Zeitgenossen sagten,
 * die Aufstellung der Westarmee sei die bessere gewesen – und warum das nichts
 * half: Ein Drittel ihrer Truppen auf dem Matsuoyama und dem Nangūsan greift
 * nie ein, und eines davon greift am Mittag die eigene Seite an.
 *
 * Der Talkessel liegt bei 136.46 Ost, 35.37 Nord; der Nakasendō läuft von Ost
 * nach West hindurch. Höhen nach dem Gelände: Sasaoyama im Nordwesten,
 * Matsuoyama im Süden, Nangūsan im Südosten.
 */
import { linie, klumpen, pfeil } from '../lib/stellung.mjs';

const SASAOYAMA = [136.4455, 35.3762];
const MATSUOYAMA = [136.4690, 35.3535];
const NANGUSAN = [136.4930, 35.3465];
const TALGRUND = [136.4660, 35.3680];
const MOMOKUBARI = [136.4735, 35.3715];

const parteien = [
  {
    id: 'west',
    name: 'Westarmee',
    farbe: '#d4737c',
    fuehrung: 'Ishida Mitsunari',
    staerke: '82.000 Mann, davon 25.000 untätig',
    zahl: 82000,
  },
  {
    id: 'ost',
    name: 'Ostarmee',
    farbe: '#6f9fe0',
    fuehrung: 'Tokugawa Ieyasu',
    staerke: '75.000 Mann',
    zahl: 75000,
  },
];

const gelaende = [
  { art: 'hoehe', name: 'Sasaoyama', punkte: klumpen(SASAOYAMA, 1.4, 1.2, 30) },
  { art: 'hoehe', name: 'Tenmanzan', punkte: klumpen([136.4520, 35.3705], 1.0, 1.2, 20) },
  { art: 'hoehe', name: 'Matsuoyama', punkte: klumpen(MATSUOYAMA, 1.8, 1.2, 70) },
  { art: 'hoehe', name: 'Nangūsan', punkte: klumpen(NANGUSAN, 2.2, 1.3, 60) },
  { art: 'stadt', name: 'Sekigahara', punkte: klumpen([136.4645, 35.3645], 0.9) },
  { art: 'weg', name: 'Nakasendō', punkte: pfeil([136.5000, 35.3705], [136.4760, 35.3690], [136.4520, 35.3660], [136.4330, 35.3640]) },
  { art: 'weg', name: 'Ise-Straße', punkte: pfeil([136.4700, 35.3620], [136.4790, 35.3520], [136.4900, 35.3420]) },
  { art: 'fluss', name: 'Fujikawa', punkte: pfeil([136.4600, 35.3600], [136.4640, 35.3520], [136.4700, 35.3440]) },
];

const s = (id, partei, form, gattung, punkte, mehr = {}) => ({ id, partei, form, gattung, punkte, ...mehr });

const stationen = [
  {
    zeit: 'Sommer 1600',
    t: 0,
    kurz: 'Zwei Bündnisse um die Nachfolge Hideyoshis.',
    text: 'Nach dem Tod Toyotomi Hideyoshis regiert ein Rat von fünf Ältesten für dessen fünfjährigen Sohn. Tokugawa Ieyasu, der mächtigste unter ihnen, greift nach der Führung; Ishida Mitsunari sammelt gegen ihn die Häuser des Westens. Ieyasu zieht von Edo den Nakasendō entlang nach Westen, Mitsunari besetzt die Enge von Sekigahara – dort, wo die Straße zwischen den Bergen hindurchmuss.',
    uebersicht: true,
    sicht: [[135.4, 34.7], [140.0, 36.4]],
    stellungen: [
      s('anm-ost', 'ost', 'pfeil', 'gemischt',
        pfeil([139.75, 35.68], [138.60, 35.60], [137.40, 35.42], [136.60, 35.37]), { name: 'Ieyasu von Edo' }),
      s('anm-west', 'west', 'pfeil', 'gemischt',
        pfeil([135.75, 35.02], [136.10, 35.20], [136.42, 35.36]), { name: 'Mitsunari aus Ōsaka' }),
    ],
  },
  {
    zeit: '21. Oktober, 3 Uhr',
    t: 120,
    kurz: 'Im Nebel bezieht die Westarmee die Hänge.',
    text: 'In der Nacht regnet es; am Morgen steht der Nebel so dicht im Kessel, dass keine Seite die andere sieht. Die Westarmee nimmt die Höhen: Mitsunari auf dem Sasaoyama im Nordwesten, Ukita und Konishi in der Mitte, Ōtani im Süden am Fujikawa. Auf dem Papier ist es eine Umfassung – die Ostarmee marschiert in einen Sack.',
    stellungen: [
      s('w-ishida', 'west', 'flaeche', 'fuss', linie([136.4480, 35.3740], 1.2, 0.5, 110), { name: 'Ishida Mitsunari', staerke: '6.000' }),
      s('w-shimazu', 'west', 'flaeche', 'fuss', linie([136.4560, 35.3705], 0.9, 0.4, 110), { name: 'Shimazu', staerke: '1.500' }),
      s('w-konishi', 'west', 'flaeche', 'fuss', linie([136.4580, 35.3670], 1.0, 0.4, 110), { name: 'Konishi Yukinaga', staerke: '4.000' }),
      s('w-ukita', 'west', 'flaeche', 'fuss', linie([136.4600, 35.3630], 1.4, 0.6, 110), { name: 'Ukita Hideie', staerke: '17.000' }),
      s('w-otani', 'west', 'flaeche', 'fuss', linie([136.4635, 35.3575], 1.0, 0.5, 120), { name: 'Ōtani Yoshitsugu', staerke: '5.000' }),
      s('w-kobayakawa', 'west', 'flaeche', 'fuss', klumpen(MATSUOYAMA, 1.2), { name: 'Kobayakawa Hideaki · Matsuoyama', staerke: '15.600' }),
      s('w-mori', 'west', 'flaeche', 'fuss', klumpen(NANGUSAN, 1.4), { name: 'Mōri und Kikkawa · Nangūsan', staerke: '15.000' }),
    ],
  },
  {
    zeit: '6 Uhr',
    t: 300,
    kurz: 'Die Ostarmee schiebt sich in den Talgrund.',
    text: 'Ieyasu lässt seine Vasallen den Kessel betreten und stellt sich selbst weit hinten bei Momokubari auf – außerhalb der Reichweite, aber in Sichtweite des Matsuoyama. Das ist kein Zufall: Auf diesem Berg sitzt der Mann, dem sein ganzer Plan gilt.',
    stellungen: [
      s('w-ishida', 'west', 'flaeche', 'fuss', linie([136.4480, 35.3740], 1.2, 0.5, 110), { name: 'Ishida', staerke: '6.000' }),
      s('w-ukita', 'west', 'flaeche', 'fuss', linie([136.4600, 35.3630], 1.4, 0.6, 110), { name: 'Ukita', staerke: '17.000' }),
      s('w-otani', 'west', 'flaeche', 'fuss', linie([136.4635, 35.3575], 1.0, 0.5, 120), { name: 'Ōtani', staerke: '5.000' }),
      s('w-kobayakawa', 'west', 'flaeche', 'fuss', klumpen(MATSUOYAMA, 1.2), { name: 'Kobayakawa · wartet', staerke: '15.600' }),
      s('w-mori', 'west', 'flaeche', 'fuss', klumpen(NANGUSAN, 1.4), { name: 'Mōri · wartet', staerke: '15.000' }),
      s('o-fukushima', 'ost', 'flaeche', 'fuss', linie([136.4700, 35.3640], 1.2, 0.5, 290), { name: 'Fukushima Masanori', staerke: '6.000' }),
      s('o-kuroda', 'ost', 'flaeche', 'fuss', linie([136.4720, 35.3705], 1.2, 0.5, 290), { name: 'Kuroda und Hosokawa', staerke: '9.000' }),
      s('o-ieyasu', 'ost', 'flaeche', 'fuss', klumpen(MOMOKUBARI, 1.1), { name: 'Tokugawa Ieyasu', staerke: '30.000' }),
    ],
  },
  {
    zeit: '8 Uhr',
    t: 420,
    kurz: 'Der Nebel hebt sich, und beide Seiten erschrecken.',
    text: 'Als der Nebel reißt, stehen die Linien keine vierhundert Meter auseinander. Fukushima greift Ukita an, Kuroda und Hosokawa gehen gegen Ishida vor. Die Westarmee hält, und sie hält gut: Ishidas Stellung auf dem Hang ist verschanzt und hat Feuerwaffen.',
    stellungen: [
      s('w-ishida', 'west', 'flaeche', 'fuss', linie([136.4485, 35.3735], 1.2, 0.5, 110), { name: 'Ishida hält', staerke: '6.000' }),
      s('w-ukita', 'west', 'flaeche', 'fuss', linie([136.4610, 35.3628], 1.4, 0.6, 110), { name: 'Ukita', staerke: '17.000' }),
      s('w-otani', 'west', 'flaeche', 'fuss', linie([136.4635, 35.3575], 1.0, 0.5, 120), { name: 'Ōtani', staerke: '5.000' }),
      s('w-kobayakawa', 'west', 'flaeche', 'fuss', klumpen(MATSUOYAMA, 1.2), { name: 'Kobayakawa · rührt sich nicht', staerke: '15.600' }),
      s('w-mori', 'west', 'flaeche', 'fuss', klumpen(NANGUSAN, 1.4), { name: 'Mōri · rührt sich nicht', staerke: '15.000' }),
      s('o-fukushima', 'ost', 'flaeche', 'fuss', linie([136.4665, 35.3638], 1.2, 0.5, 290), { name: 'Fukushima', staerke: '6.000' }),
      s('o-kuroda', 'ost', 'flaeche', 'fuss', linie([136.4600, 35.3720], 1.4, 0.5, 290), { name: 'Kuroda, Hosokawa, Katō', staerke: '12.000' }),
      s('o-stoss1', 'ost', 'pfeil', 'fuss', pfeil([136.4640, 35.3722], [136.4530, 35.3735]), {}),
      s('o-ieyasu', 'ost', 'flaeche', 'fuss', klumpen(MOMOKUBARI, 1.1), { name: 'Ieyasu', staerke: '30.000' }),
    ],
  },
  {
    zeit: '10 Uhr',
    t: 540,
    kurz: 'Ishida gibt das Feuersignal – niemand antwortet.',
    text: 'Ishida lässt auf dem Sasaoyama ein Rauchfeuer entzünden: das verabredete Zeichen für den allgemeinen Angriff. Auf dem Matsuoyama rührt sich nichts. Auf dem Nangūsan rührt sich nichts. Fünfzehntausend Mann Mōri stehen dort und beginnen zu essen – ihr Vorderster, Kikkawa Hiroie, hat sich längst heimlich mit Ieyasu verständigt und sperrt den Weg für die eigenen Verbündeten dahinter.',
    stellungen: [
      s('w-ishida', 'west', 'flaeche', 'fuss', linie([136.4485, 35.3735], 1.2, 0.5, 110), { name: 'Ishida · Signal', staerke: '5.000' }),
      s('w-ukita', 'west', 'flaeche', 'fuss', linie([136.4615, 35.3625], 1.4, 0.6, 110), { name: 'Ukita', staerke: '16.000' }),
      s('w-otani', 'west', 'flaeche', 'fuss', linie([136.4635, 35.3575], 1.0, 0.5, 120), { name: 'Ōtani', staerke: '5.000' }),
      s('w-kobayakawa', 'west', 'flaeche', 'fuss', klumpen(MATSUOYAMA, 1.2), { name: 'Kobayakawa · schweigt', staerke: '15.600', finte: true }),
      s('w-mori', 'west', 'flaeche', 'fuss', klumpen(NANGUSAN, 1.4), { name: 'Mōri · gesperrt von den eigenen', staerke: '15.000', finte: true }),
      s('o-fukushima', 'ost', 'flaeche', 'fuss', linie([136.4665, 35.3638], 1.2, 0.5, 290), { name: 'Fukushima', staerke: '5.500' }),
      s('o-kuroda', 'ost', 'flaeche', 'fuss', linie([136.4585, 35.3722], 1.4, 0.5, 290), { name: 'Kuroda und Hosokawa', staerke: '11.000' }),
      s('o-ieyasu', 'ost', 'flaeche', 'fuss', klumpen(MOMOKUBARI, 1.1), { name: 'Ieyasu', staerke: '30.000' }),
    ],
  },
  {
    zeit: '11:30 Uhr',
    t: 630,
    kurz: 'Ieyasu lässt auf den eigenen Verbündeten schießen.',
    text: 'Es steht unentschieden, und Ieyasu verliert die Geduld mit dem Mann auf dem Berg. Er lässt seine Arkebusiere auf Kobayakawas Stellung feuern – auf einen Verbündeten, der noch nicht Verbündeter ist. Der Schuss ist eine Frage: Auf welcher Seite stehst du? Kobayakawa hat eine Viertelstunde, sie zu beantworten.',
    stellungen: [
      s('w-kobayakawa', 'west', 'flaeche', 'fuss', klumpen(MATSUOYAMA, 1.2), { name: 'Kobayakawa · unter Beschuss', staerke: '15.600' }),
      s('o-schuss', 'ost', 'pfeil', 'fuss', pfeil([136.4738, 35.3690], [136.4715, 35.3600], [136.4700, 35.3560]), { name: 'Ieyasus Arkebusiere' }),
      s('w-ishida', 'west', 'flaeche', 'fuss', linie([136.4485, 35.3735], 1.2, 0.5, 110), { name: 'Ishida', staerke: '5.000' }),
      s('w-ukita', 'west', 'flaeche', 'fuss', linie([136.4615, 35.3625], 1.4, 0.6, 110), { name: 'Ukita', staerke: '16.000' }),
      s('w-otani', 'west', 'flaeche', 'fuss', linie([136.4635, 35.3575], 1.0, 0.5, 120), { name: 'Ōtani', staerke: '5.000' }),
      s('o-fukushima', 'ost', 'flaeche', 'fuss', linie([136.4665, 35.3638], 1.2, 0.5, 290), { name: 'Fukushima', staerke: '5.500' }),
      s('o-ieyasu', 'ost', 'flaeche', 'fuss', klumpen(MOMOKUBARI, 1.1), { name: 'Ieyasu', staerke: '30.000' }),
    ],
  },
  {
    zeit: '12 Uhr',
    t: 660,
    kurz: 'Der Berg kommt herunter – auf die eigene Flanke.',
    text: 'Kobayakawa lässt seine 15.600 Mann den Westhang hinabgehen, auf Ōtani Yoshitsugu. Ōtani hat mit dem Verrat gerechnet und seine Front nach Süden gedreht; er hält den ersten Stoß. Dann wechseln vier weitere Herren der Westarmee, die neben ihm stehen, ebenfalls die Seite. Gegen fünf Gegner auf einmal hilft keine Vorsicht.',
    stellungen: [
      s('o-kobayakawa', 'ost', 'flaeche', 'fuss', linie([136.4670, 35.3585], 1.6, 0.7, 340), { name: 'Kobayakawa · übergelaufen', staerke: '15.600' }),
      s('o-verrat', 'ost', 'pfeil', 'fuss', pfeil([136.4685, 35.3545], [136.4660, 35.3570], [136.4640, 35.3585]), {}),
      s('w-otani', 'west', 'flaeche', 'fuss', linie([136.4630, 35.3580], 1.0, 0.5, 170), { name: 'Ōtani · Front nach Süden', staerke: '4.500' }),
      s('w-ukita', 'west', 'flaeche', 'fuss', linie([136.4615, 35.3625], 1.4, 0.6, 110), { name: 'Ukita', staerke: '15.000' }),
      s('w-ishida', 'west', 'flaeche', 'fuss', linie([136.4485, 35.3735], 1.2, 0.5, 110), { name: 'Ishida', staerke: '5.000' }),
      s('o-fukushima', 'ost', 'flaeche', 'fuss', linie([136.4655, 35.3638], 1.2, 0.5, 290), { name: 'Fukushima', staerke: '5.500' }),
      s('o-ieyasu', 'ost', 'flaeche', 'fuss', klumpen(MOMOKUBARI, 1.1), { name: 'Ieyasu', staerke: '30.000' }),
    ],
  },
  {
    zeit: '13 Uhr',
    t: 720,
    kurz: 'Ōtani fällt, und die Linie rollt sich auf.',
    text: 'Ōtani Yoshitsugu, seit Jahren von einer Krankheit erblindet und in einer Sänfte geführt, lässt sich das Ende melden und nimmt sich das Leben. Mit seinem Flügel gibt es keine Südflanke mehr. Der Rest der Westarmee wird von der Seite aufgerollt – erst Ukita, dann Konishi, dann Ishida.',
    stellungen: [
      s('w-otani', 'west', 'flaeche', 'fuss', linie([136.4630, 35.3585], 0.7, 0.4, 170), { name: 'Ōtani · vernichtet', staerke: '1.000', geschlagen: true }),
      s('o-kobayakawa', 'ost', 'flaeche', 'fuss', linie([136.4645, 35.3610], 1.6, 0.7, 340), { name: 'Kobayakawa', staerke: '15.000' }),
      s('w-ukita', 'west', 'flaeche', 'fuss', linie([136.4595, 35.3640], 1.3, 0.6, 140), { name: 'Ukita · in der Zange', staerke: '10.000', geschlagen: true }),
      s('w-ishida', 'west', 'flaeche', 'fuss', linie([136.4485, 35.3735], 1.1, 0.5, 110), { name: 'Ishida', staerke: '4.000' }),
      s('o-fukushima', 'ost', 'flaeche', 'fuss', linie([136.4630, 35.3648], 1.2, 0.5, 290), { name: 'Fukushima', staerke: '5.000' }),
      s('o-kuroda', 'ost', 'flaeche', 'fuss', linie([136.4560, 35.3728], 1.4, 0.5, 290), { name: 'Kuroda und Hosokawa', staerke: '10.000' }),
      s('o-stoss2', 'ost', 'pfeil', 'fuss', pfeil([136.4610, 35.3660], [136.4540, 35.3700], [136.4500, 35.3730]), {}),
      s('o-ieyasu', 'ost', 'flaeche', 'fuss', klumpen(MOMOKUBARI, 1.1), { name: 'Ieyasu', staerke: '30.000' }),
    ],
  },
  {
    zeit: '14 Uhr',
    t: 780,
    kurz: 'Shimazus Rückzug nach vorn.',
    text: 'Achtzig Reiter der Shimazu sind eingeschlossen. Statt sich zu ergeben oder zurückzuweichen, reiten sie mitten durch die feindliche Linie hindurch und nach Süden davon – der berühmteste Durchbruch der japanischen Geschichte. Ihr Anführer entkommt; von den achtzig kommen wenige an.',
    stellungen: [
      s('w-shimazu', 'west', 'pfeil', 'reiter', pfeil([136.4560, 35.3705], [136.4640, 35.3650], [136.4720, 35.3540], [136.4820, 35.3420]), { name: 'Shimazu · Durchbruch nach Süden', rueckzug: true }),
      s('w-ishida', 'west', 'flaeche', 'fuss', linie([136.4470, 35.3745], 0.9, 0.4, 110), { name: 'Ishida · weicht', staerke: '2.000', geschlagen: true }),
      s('o-kobayakawa', 'ost', 'flaeche', 'fuss', linie([136.4620, 35.3625], 1.6, 0.7, 340), { name: 'Kobayakawa', staerke: '15.000' }),
      s('o-fukushima', 'ost', 'flaeche', 'fuss', linie([136.4590, 35.3660], 1.2, 0.5, 290), { name: 'Fukushima', staerke: '5.000' }),
      s('o-kuroda', 'ost', 'flaeche', 'fuss', linie([136.4520, 35.3735], 1.4, 0.5, 290), { name: 'Kuroda', staerke: '10.000' }),
      s('w-mori', 'west', 'flaeche', 'fuss', klumpen(NANGUSAN, 1.4), { name: 'Mōri · immer noch untätig', staerke: '15.000', finte: true }),
    ],
  },
  {
    zeit: '16 Uhr',
    t: 900,
    kurz: 'Sechs Stunden, und Japan hat einen Herrn.',
    text: 'Am Nachmittag ist der Kessel leer. Die Mōri auf dem Nangūsan ziehen ab, ohne einen Schuss abgegeben zu haben. Ishida wird drei Tage später in den Bergen aufgegriffen und in Kyōto hingerichtet, Konishi ebenso. Ieyasu verteilt die Lehen der Verlierer neu – und die der Überläufer nicht viel großzügiger.',
    stellungen: [
      s('o-ieyasu', 'ost', 'flaeche', 'fuss', klumpen(TALGRUND, 2.0, 1.4, 100), { name: 'Ostarmee hält das Feld', staerke: '70.000' }),
      s('w-flucht', 'west', 'pfeil', 'gemischt', pfeil([136.4520, 35.3720], [136.4380, 35.3680], [136.4260, 35.3640]), { name: 'nach Westen', rueckzug: true }),
      s('w-mori', 'west', 'pfeil', 'fuss', pfeil([136.4930, 35.3465], [136.5060, 35.3520], [136.5200, 35.3560]), { name: 'Mōri zieht unversehrt ab', rueckzug: true }),
    ],
  },
  {
    zeit: '1603',
    t: 1200,
    kurz: 'Vom Sieg zum Shōgunat – und zu 250 Jahren Ruhe.',
    text: 'Drei Jahre später lässt sich Ieyasu zum Shōgun ernennen. Das Haus Tokugawa regiert bis 1868. Die Herren, die bei Sekigahara auf der falschen Seite standen, heißen fortan tozama – „Außenstehende“ – und werden an die Ränder des Landes gesetzt, weit weg von Edo. Zweieinhalb Jahrhunderte später sind es genau diese Häuser, Satsuma und Chōshū, die das Shōgunat stürzen.',
    uebersicht: true,
    sicht: [[129.5, 31.0], [141.5, 38.0]],
    stellungen: [
      s('o-edo', 'ost', 'pfeil', 'gemischt', pfeil([136.47, 35.37], [137.80, 35.45], [139.75, 35.68]), { name: 'Die Macht wandert nach Edo' }),
      s('w-satsuma', 'west', 'pfeil', 'gemischt',
        pfeil([130.55, 31.60], [132.60, 33.20], [134.60, 34.60], [135.77, 35.02]), { name: 'Satsuma und Chōshū – 1868 kommt die Rechnung' }),
    ],
  },
];

export const sekigahara = {
  id: 'sekigahara',
  name: 'Sekigahara',
  ort: 'Sekigahara, Provinz Mino',
  datum: '21. Oktober 1600',
  jahr: 1600,
  mitte: [136.4680, 35.3640],
  zoom: 12.9,
  grund: 'relief',
  worum: 'Die Entscheidung über die Nachfolge Hideyoshis. Achtzigtausend gegen fünfundsiebzigtausend in einem Talkessel von drei Kilometern – und ein Drittel der Westarmee sitzt auf den Bergen und greift nie ein. Am Mittag wechselt einer dieser Berge die Seite.',
  parteien,
  gelaende,
  stationen,
  ausgang: 'Die Westarmee wird in sechs Stunden vernichtet. Ishida Mitsunari und Konishi Yukinaga werden hingerichtet, Ōtani Yoshitsugu nimmt sich auf dem Feld das Leben.',
  verluste: [
    { partei: 'west', text: 'etwa 8.000 Gefallene; die Häuser verlieren zusammen rund 4 Millionen Koku Landertrag' },
    { partei: 'ost', text: 'etwa 4.000 Gefallene' },
  ],
  folgen: 'Ieyasu wird 1603 Shōgun; das Haus Tokugawa regiert Japan bis 1868. Die Verlierer werden als tozama an die Ränder des Reiches versetzt – und stürzen von dort aus zweieinhalb Jahrhunderte später das Shōgunat.',
  streit: 'Wann genau Kobayakawa überlief, ist umstritten: Die ältere Überlieferung lässt Ieyasu erst auf ihn schießen, neuere japanische Forschung hält den Seitenwechsel für früher und ohne diesen Schuss verabredet. Auch die Truppenzahlen schwanken je nach Quelle um bis zu einem Viertel.',
};
