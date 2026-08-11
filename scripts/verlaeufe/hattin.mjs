#!/usr/bin/env node
/*
 * ACHTUNG – Verhältnis zu src/data/battles/hattin.json: Dieses Skript hat die
 * JSON-Datei einmal erzeugt; danach ist die JSON-Datei die gültige Fassung.
 */
/**
 * Hattin, 4. Juli 1187.
 *
 * Die Karte erklärt diese Schlacht vollständig, und zwar über eine einzige
 * Größe: Wasser. Das Kreuzfahrerheer steht bei den Quellen von Saffuriya,
 * Saladin belagert Tiberias am See – dazwischen liegen dreißig Kilometer
 * wasserlose Hochebene im Juli. Wer aufbricht, um Tiberias zu entsetzen, muss
 * einen Tag lang ohne Wasser marschieren, mit dem Feind auf den Flanken.
 *
 * Genau das ist der Streitpunkt im Kriegsrat, und genau das entscheidet den
 * nächsten Tag. Das Heer bricht auf, bleibt am Abend durstig auf halber
 * Strecke liegen und ist am Morgen nicht mehr kampffähig.
 */
import { linie, klumpen, pfeil } from '../lib/stellung.mjs';

const HOERNER = [35.4460, 32.8000];
const SAFFURIYA = [35.2760, 32.7530];
const TIBERIAS = [35.5300, 32.7900];
const LUBIYA = [35.4050, 32.7850];

const parteien = [
  {
    id: 'kreuz', name: 'Königreich Jerusalem', farbe: '#6f9fe0',
    fuehrung: 'Guido von Lusignan, Raimund III. von Tripolis',
    staerke: '1.200 Ritter, 15.000 Fußvolk', zahl: 16200,
  },
  {
    id: 'ayy', name: 'Ayyubiden', farbe: '#7fbf7f',
    fuehrung: 'Saladin',
    staerke: 'rund 12.000 berittene Bogenschützen, 18.000 gesamt', zahl: 30000,
  },
];

const gelaende = [
  { art: 'hoehe', name: 'Hörner von Hattin', punkte: klumpen(HOERNER, 1.3, 1.6, 80) },
  { art: 'hoehe', name: 'Hochebene', punkte: linie([35.3900, 32.7900], 14.0, 6.0, 100) },
  { art: 'see', name: 'See Genezareth', punkte: klumpen([35.5900, 32.8200], 12.0, 1.6, 15) },
  { art: 'stadt', name: 'Tiberias', punkte: klumpen(TIBERIAS, 1.2) },
  { art: 'stadt', name: 'Saffuriya', punkte: klumpen(SAFFURIYA, 1.1) },
  { art: 'stadt', name: 'Lubiya', punkte: klumpen(LUBIYA, 0.9) },
  { art: 'weg', name: 'Straße nach Tiberias', punkte: pfeil([35.2800, 32.7550], [35.3600, 32.7800], [35.4400, 32.7950], [35.5200, 32.7900]) },
];

const s = (id, partei, form, gattung, punkte, mehr = {}) => ({ id, partei, form, gattung, punkte, ...mehr });

const stationen = [
  {
    zeit: '1. Juli 1187',
    t: 0,
    kurz: 'Saladin geht über den Jordan.',
    text: 'Saladin hat zum ersten Mal Ägypten, Syrien und die Jazira unter einer Hand und führt ein Heer zusammen, wie es das Königreich Jerusalem noch nicht gesehen hat. Er überschreitet den Jordan südlich des Sees und belagert Tiberias. Das Kreuzfahrerheer sammelt sich bei den Quellen von Saffuriya – der besten Wasserstelle Galiläas.',
    uebersicht: true,
    sicht: [[34.6, 32.2], [36.4, 33.4]],
    stellungen: [
      s('anm-ayy', 'ayy', 'pfeil', 'reiter', pfeil([35.90, 32.55], [35.70, 32.70], [35.56, 32.79]), { name: 'Saladin über den Jordan' }),
      s('anm-kreuz', 'kreuz', 'pfeil', 'gemischt', pfeil([34.99, 32.50], [35.15, 32.65], [35.28, 32.75]), { name: 'Aufgebot nach Saffuriya' }),
    ],
  },
  {
    zeit: '2. Juli · Kriegsrat',
    t: 120,
    kurz: 'Der Rat, den man nicht befolgt.',
    text: 'In Tiberias sitzt die Frau Raimunds von Tripolis in der Zitadelle fest. Ausgerechnet Raimund rät, nicht zu marschieren: Man solle bei den Quellen stehen bleiben, Saladin könne ein Heer dieser Größe nicht lange versorgen. Er sei bereit, seine Burg und seine Frau zu verlieren. In der Nacht überzeugen Gerard von Ridefort und Rainald von Châtillon den König vom Gegenteil.',
    stellungen: [
      s('k-lager', 'kreuz', 'flaeche', 'gemischt', klumpen(SAFFURIYA, 2.2), { name: 'Heerlager an den Quellen', staerke: '16.200' }),
      s('a-tiberias', 'ayy', 'flaeche', 'gemischt', klumpen([35.5150, 32.7920], 2.0), { name: 'Belagerung von Tiberias', staerke: '30.000' }),
    ],
  },
  {
    zeit: '3. Juli · Morgen',
    t: 240,
    kurz: 'Der Aufbruch in die wasserlose Ebene.',
    text: 'Am Morgen bricht das Heer auf: dreißig Kilometer Hochebene, Anfang Juli, ohne Quelle unterwegs. Die Marschordnung ist die übliche – Vorhut Raimund, Mitte der König mit dem Kreuzreliquiar, Nachhut die Templer. Was fehlt, ist Wasser für einen zweiten Tag.',
    stellungen: [
      s('k-vorhut', 'kreuz', 'flaeche', 'gemischt', linie([35.3300, 32.7700], 1.2, 0.6, 80), { name: 'Vorhut · Raimund', staerke: '4.000' }),
      s('k-mitte', 'kreuz', 'flaeche', 'gemischt', linie([35.3120, 32.7640], 1.4, 0.7, 80), { name: 'Mitte · König und Kreuzreliquiar', staerke: '8.000' }),
      s('k-nachhut', 'kreuz', 'flaeche', 'gemischt', linie([35.2940, 32.7580], 1.2, 0.6, 80), { name: 'Nachhut · Templer', staerke: '4.200' }),
      s('a-tiberias', 'ayy', 'flaeche', 'gemischt', klumpen([35.5150, 32.7920], 2.0), { name: 'vor Tiberias', staerke: '30.000' }),
    ],
  },
  {
    zeit: '3. Juli · Mittag',
    t: 330,
    kurz: 'Die Bogenreiter kommen von den Flanken.',
    text: 'Saladin lässt die Belagerung liegen und schickt seine berittenen Bogenschützen an die Flanken der Marschsäule. Sie greifen nicht an, sie schießen und weichen aus – Stunde um Stunde. Die Kolonne wird langsamer, weil sie sich immer wieder gegen die Nadelstiche wenden muss, und jede Stunde in der Sonne kostet mehr als jeder Pfeil.',
    stellungen: [
      s('k-vorhut', 'kreuz', 'flaeche', 'gemischt', linie([35.3800, 32.7830], 1.2, 0.6, 80), { name: 'Vorhut', staerke: '4.000' }),
      s('k-mitte', 'kreuz', 'flaeche', 'gemischt', linie([35.3600, 32.7790], 1.4, 0.7, 80), { name: 'Mitte', staerke: '8.000' }),
      s('k-nachhut', 'kreuz', 'flaeche', 'gemischt', linie([35.3400, 32.7740], 1.2, 0.6, 80), { name: 'Nachhut · unter Beschuss', staerke: '4.200' }),
      s('a-nord', 'ayy', 'flaeche', 'reiter', linie([35.3650, 32.8150], 3.4, 0.6, 180), { name: 'Bogenreiter im Norden', staerke: '6.000' }),
      s('a-sued', 'ayy', 'flaeche', 'reiter', linie([35.3650, 32.7450], 3.4, 0.6, 0), { name: 'Bogenreiter im Süden', staerke: '6.000' }),
      s('a-beschuss', 'ayy', 'pfeil', 'bogen', pfeil([35.3660, 32.8080], [35.3620, 32.7850]), { name: 'schießen und weichen aus', finte: true }),
    ],
  },
  {
    zeit: '3. Juli · Nachmittag',
    t: 400,
    kurz: 'Der Entschluss, der alles verliert.',
    text: 'Bei Lubiya steht das Heer noch acht Kilometer vom See entfernt. Die Nachhut ist so bedrängt, dass sie meldet, sie könne nicht weiter. Der König lässt daraufhin lagern – auf der wasserlosen Hochebene, in Sichtweite des Sees, den niemand mehr erreicht. Raimund soll gerufen haben: „Herr Gott, der Krieg ist zu Ende, wir sind tote Männer, das Königreich ist verloren.“',
    stellungen: [
      s('k-lager2', 'kreuz', 'flaeche', 'gemischt', klumpen([35.4150, 32.7900], 2.0), { name: 'Nachtlager ohne Wasser', staerke: '16.000' }),
      s('a-nord', 'ayy', 'flaeche', 'reiter', linie([35.4150, 32.8180], 4.0, 0.7, 180), { name: 'Saladin schließt den Ring', staerke: '9.000' }),
      s('a-sued', 'ayy', 'flaeche', 'reiter', linie([35.4150, 32.7620], 4.0, 0.7, 0), { name: 'im Süden', staerke: '9.000' }),
      s('a-ost', 'ayy', 'flaeche', 'reiter', linie([35.4750, 32.7900], 2.6, 0.7, 270), { name: 'zwischen Heer und See', staerke: '8.000' }),
    ],
  },
  {
    zeit: '3. Juli · Nacht',
    t: 460,
    kurz: 'Feuer, Trommeln – und Wasser, vor ihren Augen vergossen.',
    text: 'Saladins Leute zünden das trockene Gras windaufwärts an; der Rauch zieht ins Lager. Die ganze Nacht schlagen Trommeln und rufen die Stimmen. Und sie tragen Wasserkrüge vom See heran und gießen sie vor den Augen der Durstigen in den Sand. Am Morgen ist das Heer nicht besiegt, aber es ist erledigt.',
    stellungen: [
      s('k-lager2', 'kreuz', 'flaeche', 'gemischt', klumpen([35.4150, 32.7900], 1.9), { name: 'ohne Wasser, im Rauch', staerke: '16.000', geschlagen: true }),
      s('a-feuer', 'ayy', 'pfeil', 'fuss', pfeil([35.4400, 32.8050], [35.4250, 32.7950], [35.4100, 32.7900]), { name: 'Grasfeuer windaufwärts' }),
      s('a-nord', 'ayy', 'flaeche', 'reiter', linie([35.4150, 32.8160], 4.0, 0.7, 180), { name: 'Ring', staerke: '9.000' }),
      s('a-sued', 'ayy', 'flaeche', 'reiter', linie([35.4150, 32.7640], 4.0, 0.7, 0), { name: 'Ring', staerke: '9.000' }),
    ],
  },
  {
    zeit: '4. Juli · Morgen',
    t: 540,
    kurz: 'Raimunds Ausbruch – und was er bedeutet.',
    text: 'Das Heer versucht, sich zu den Hörnern von Hattin durchzuschlagen, wo es Zisternen gibt. Raimund führt die Vorhut zum Angriff; die ayyubidische Linie vor ihm öffnet sich, lässt ihn durch und schließt sich hinter ihm. Er reitet mit seinen Rittern ins Freie und kann nicht zurück. Ob das Flucht oder Durchbruch war, streiten die Quellen bis heute – für den Ausgang ist es dasselbe.',
    stellungen: [
      s('k-raimund', 'kreuz', 'pfeil', 'reiter', pfeil([35.4180, 32.7940], [35.4380, 32.8100], [35.4700, 32.8300]), { name: 'Raimund reitet hindurch' }),
      s('a-luecke', 'ayy', 'pfeil', 'reiter', pfeil([35.4420, 32.8180], [35.4380, 32.8060]), { name: 'öffnet und schließt sich', finte: true }),
      s('k-mitte2', 'kreuz', 'flaeche', 'gemischt', klumpen([35.4230, 32.7930], 1.6), { name: 'Der Rest bleibt eingeschlossen', staerke: '13.000', geschlagen: true }),
      s('a-ring', 'ayy', 'flaeche', 'reiter', linie([35.4300, 32.7900], 5.0, 1.6, 270), { name: 'Ring um das Heer', staerke: '20.000' }),
    ],
  },
  {
    zeit: '4. Juli · Mittag',
    t: 600,
    kurz: 'Das Fußvolk gibt auf, die Ritter sammeln sich auf dem Berg.',
    text: 'Das Fußvolk, seit anderthalb Tagen ohne Wasser, zieht sich auf den nördlichen der beiden Hörner zurück und weigert sich weiterzukämpfen. Damit sind die Ritter ohne Deckung: Ohne Fußvolk hat berittene Panzerreiterei gegen Bogenschützen keinen Schutz für die Pferde. Sie reiten trotzdem noch zweimal an und kommen bis nahe an Saladins Zelt.',
    stellungen: [
      s('k-fussvolk', 'kreuz', 'flaeche', 'fuss', klumpen([35.4440, 32.8055], 1.0), { name: 'Fußvolk auf dem Nordhorn', staerke: '9.000', geschlagen: true }),
      s('k-ritter', 'kreuz', 'flaeche', 'reiter', linie([35.4400, 32.7970], 1.0, 0.5, 200), { name: 'Ritter um das Königszelt', staerke: '1.000' }),
      s('k-anritt', 'kreuz', 'pfeil', 'reiter', pfeil([35.4390, 32.7950], [35.4300, 32.7860], [35.4230, 32.7810]), { name: 'zwei Anritte auf Saladin' }),
      s('a-ring', 'ayy', 'flaeche', 'reiter', linie([35.4300, 32.7880], 5.0, 1.8, 270), { name: 'Ring', staerke: '20.000' }),
      s('a-zelt', 'ayy', 'flaeche', 'gemischt', klumpen([35.4180, 32.7790], 0.8), { name: 'Saladins Zelt', staerke: 'Stab' }),
    ],
  },
  {
    zeit: '4. Juli · Nachmittag',
    t: 660,
    kurz: 'Das rote Zelt fällt.',
    text: 'Beim zweiten Anritt fällt das rote Zelt des Königs. Saladins Sohn ruft, sie hätten gesiegt; sein Vater sagt: „Schweig, wir haben sie nicht besiegt, solange das Zelt steht.“ Als es fällt, steigt er vom Pferd und wirft sich zu Boden. Der König, die Großmeister beider Orden und das Kreuzreliquiar sind in seiner Hand.',
    stellungen: [
      s('k-ritter', 'kreuz', 'flaeche', 'reiter', klumpen([35.4415, 32.7990], 0.7), { name: 'Königszelt gefallen', staerke: '200', geschlagen: true }),
      s('k-fussvolk', 'kreuz', 'flaeche', 'fuss', klumpen([35.4440, 32.8055], 0.9), { name: 'gefangen', staerke: '9.000', geschlagen: true }),
      s('a-ring', 'ayy', 'flaeche', 'reiter', linie([35.4380, 32.7960], 3.6, 1.4, 270), { name: 'Ayyubiden auf dem Berg', staerke: '20.000' }),
    ],
  },
  {
    zeit: 'Juli bis Oktober',
    t: 900,
    kurz: 'Ein Königreich ohne Heer.',
    text: 'Rainald von Châtillon, der Karawanen im Waffenstillstand überfallen hatte, wird von Saladin eigenhändig getötet; der König bleibt am Leben. Weil das ganze Feldheer an einem Tag verloren ging, stehen die Städte danach fast ohne Besatzung da: Akkon fällt nach vier Tagen, Sidon, Beirut und Askalon folgen. Am 2. Oktober übergibt Jerusalem – nach 88 Jahren, diesmal ohne Blutbad. In Europa löst die Nachricht den Dritten Kreuzzug aus.',
    uebersicht: true,
    sicht: [[34.2, 31.2], [36.6, 33.8]],
    stellungen: [
      s('a-eroberung', 'ayy', 'pfeil', 'gemischt', pfeil([35.45, 32.80], [35.07, 32.92], [34.79, 32.07], [35.23, 31.78]), { name: 'Akkon, Askalon, Jerusalem' }),
      s('k-reste', 'kreuz', 'pfeil', 'gemischt', pfeil([35.45, 32.80], [35.20, 32.90], [35.20, 33.27]), { name: 'nur Tyros hält', rueckzug: true }),
    ],
  },
];

export const hattin = {
  id: 'hattin',
  name: 'Hattin',
  ort: 'Hörner von Hattin, Galiläa',
  datum: '4. Juli 1187',
  jahr: 1200,
  mitte: [35.4300, 32.7920],
  zoom: 12.0,
  grund: 'relief',
  worum: 'Eine Schlacht, die das Wasser entscheidet. Zwischen dem Lager der Kreuzfahrer und dem belagerten Tiberias liegen dreißig Kilometer wasserlose Hochebene im Juli. Wer aufbricht, marschiert einen Tag ohne Quelle, mit berittenen Bogenschützen an beiden Flanken.',
  parteien,
  gelaende,
  stationen,
  ausgang: 'Das Feldheer des Königreichs Jerusalem wird an einem Tag vernichtet oder gefangen. König Guido, beide Großmeister und das Kreuzreliquiar fallen in Saladins Hand.',
  verluste: [
    { partei: 'kreuz', text: 'das gesamte Heer – gefallen oder gefangen; nur wenige hundert entkommen' },
    { partei: 'ayy', text: 'nach den Quellen gering' },
  ],
  folgen: 'Weil das ganze Feldheer auf einmal verloren ging, waren die Städte ohne Besatzung: Akkon, Sidon, Beirut und Askalon fallen binnen Wochen, Jerusalem am 2. Oktober 1187 nach 88 Jahren christlicher Herrschaft. Die Nachricht löst in Europa den Dritten Kreuzzug aus.',
  streit: 'Ob Raimunds Vorstoß ein befohlener Durchbruchsversuch oder eine Flucht war, beurteilen die Quellen entgegengesetzt – lateinische Chronisten, die ihn verteidigen, und solche, die ihn des Verrats bezichtigen, stehen nebeneinander. Auch die Heeresstärken sind unsicher; die Zahl von 1.200 Rittern gilt als gut belegt, die des Fußvolks nicht.',
};
