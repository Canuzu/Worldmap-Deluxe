#!/usr/bin/env node
/*
 * ACHTUNG – Verhältnis zu src/data/battles/mohi.json: Dieses Skript hat die
 * JSON-Datei einmal erzeugt; danach ist die JSON-Datei die gültige Fassung.
 */
/**
 * Muhi am Sajó, 11. April 1241.
 *
 * Die Mongolen in Mitteleuropa – und ein Lehrstück darüber, was eine
 * Wagenburg wert ist, wenn der Gegner sie nicht stürmen muss. Béla IV. stellt
 * sein Heer am Ostufer des Sajó in eine dichte Wagenburg. Sie ist gegen
 * Reiterei kaum zu nehmen; also nimmt Subutai sie nicht. Er beschießt sie mit
 * Steinschleudern und lässt an einer Stelle eine Lücke offen.
 *
 * Wer eingeschlossen ist und eine Lücke sieht, geht hindurch. Draußen steht
 * niemand, der ihn aufhält – erst nach dreißig Kilometern. Zwei Tage lang
 * werden die Auseinandergezogenen einzeln erschlagen.
 *
 * Der Sajó fließt bei 20.92 Ost, 47.98 Nord nach Süden; die Brücke lag
 * nördlich des Lagers.
 */
import { linie, klumpen, pfeil } from '../lib/stellung.mjs';

const LAGER = [20.9350, 47.9800];
const BRUECKE = [20.9180, 48.0060];
const FURT = [20.9080, 47.9450];

const parteien = [
  {
    id: 'ung', name: 'Ungarn und Verbündete', farbe: '#6f9fe0',
    fuehrung: 'Béla IV., Koloman von Slawonien',
    staerke: '25.000 bis 30.000', zahl: 27000,
  },
  {
    id: 'mon', name: 'Mongolen', farbe: '#d4737c',
    fuehrung: 'Batu Khan, Subutai',
    staerke: '20.000 bis 30.000, dazu Wurfmaschinen', zahl: 25000,
  },
];

const gelaende = [
  { art: 'fluss', name: 'Sajó', punkte: pfeil([20.9260, 48.0500], [20.9160, 48.0100], [20.9080, 47.9700], [20.9000, 47.9250]) },
  { art: 'sumpf', name: 'Sumpfige Niederung', punkte: linie([20.8900, 47.9750], 4.0, 2.4, 10) },
  { art: 'weg', name: 'Brücke über den Sajó', punkte: pfeil([20.9100, 48.0060], [20.9260, 48.0060]) },
  { art: 'stadt', name: 'Muhi', punkte: klumpen([20.9420, 47.9600], 0.9) },
];

const s = (id, partei, form, gattung, punkte, mehr = {}) => ({ id, partei, form, gattung, punkte, ...mehr });

const stationen = [
  {
    zeit: 'Winter 1240/41',
    t: 0,
    kurz: 'Ein Angriff auf zwei Reiche zugleich.',
    text: 'Nach der Zerstörung der Rus rückt das mongolische Heer nach Westen – und teilt sich: Ein Flügel geht nach Polen und schlägt am 9. April bei Liegnitz ein schlesisch-deutsches Aufgebot, der Hauptteil geht über die Karpaten nach Ungarn. Zwei Schlachten in zwei Tagen, sechshundert Kilometer auseinander, beide gewonnen – das ist keine Ansammlung von Reitern, sondern ein geführter Feldzug.',
    uebersicht: true,
    sicht: [[14.0, 44.5], [28.0, 52.5]],
    stellungen: [
      s('anm-mon', 'mon', 'pfeil', 'reiter', pfeil([26.20, 50.60], [23.80, 49.20], [21.60, 48.60], [20.95, 48.00]), { name: 'Batu über die Karpaten' }),
      s('anm-liegnitz', 'mon', 'pfeil', 'reiter', pfeil([24.20, 50.90], [20.20, 51.20], [16.20, 51.20]), { name: 'Nebenflügel nach Liegnitz' }),
      s('anm-ung', 'ung', 'pfeil', 'gemischt', pfeil([19.04, 47.50], [20.10, 47.80], [20.90, 47.98]), { name: 'Béla von Pest' }),
    ],
  },
  {
    zeit: '10. April',
    t: 180,
    kurz: 'Die Wagenburg am Ostufer.',
    text: 'Béla folgt dem sich zurückziehenden Gegner bis an den Sajó und lässt am Ostufer lagern – die Wagen dicht an dicht zu einer Burg gekettet, das Heer darin. Gegen Reiterei ist das eine gute Stellung. Sie hat nur einen Fehler, den man auf der Karte sofort sieht: Sie ist eng. Fünfundzwanzigtausend Mann stehen dort, wo sie einander im Weg sind.',
    stellungen: [
      s('u-lager', 'ung', 'flaeche', 'gemischt', klumpen(LAGER, 1.6), { name: 'Wagenburg', staerke: '27.000' }),
      s('u-bruecke', 'ung', 'flaeche', 'fuss', linie(BRUECKE, 0.8, 0.4, 270), { name: 'Wache an der Brücke', staerke: '1.000' }),
      s('m-lager', 'mon', 'flaeche', 'reiter', klumpen([20.8700, 48.0200], 3.0), { name: 'Mongolen am Westufer', staerke: '25.000' }),
    ],
  },
  {
    zeit: '11. April, 4 Uhr',
    t: 240,
    kurz: 'Steinschleudern räumen die Brücke.',
    text: 'Vor Tagesanbruch beschießen die Mongolen die Brückenwache mit Wurfmaschinen und Brandsätzen – Belagerungsgerät, mitten in einer Feldschlacht, mitgeführt über zweitausend Kilometer und bedient von chinesischen Fachleuten. Die Wache weicht, die Brücke ist offen.',
    stellungen: [
      s('m-wurf', 'mon', 'flaeche', 'geschuetz', linie([20.9060, 48.0080], 0.9, 0.4, 90), { name: 'Wurfmaschinen', staerke: '7' }),
      s('u-bruecke', 'ung', 'flaeche', 'fuss', linie(BRUECKE, 0.7, 0.4, 270), { name: 'Brückenwache weicht', staerke: '800', geschlagen: true }),
      s('m-bruecke', 'mon', 'pfeil', 'reiter', pfeil([20.9020, 48.0060], [20.9240, 48.0060]), { name: 'über die Brücke' }),
      s('u-lager', 'ung', 'flaeche', 'gemischt', klumpen(LAGER, 1.6), { name: 'Wagenburg', staerke: '26.000' }),
    ],
  },
  {
    zeit: '11. April, 6 Uhr',
    t: 300,
    kurz: 'Koloman wirft sie zurück – und glaubt zu siegen.',
    text: 'Herzog Koloman und der Templermeister führen einen Gegenstoß, werfen die übergesetzten Mongolen zurück und kehren ins Lager zurück, überzeugt, den Angriff abgewehrt zu haben. Was sie nicht wissen: Der Stoß über die Brücke war nur die eine Hälfte.',
    stellungen: [
      s('u-koloman', 'ung', 'pfeil', 'reiter', pfeil([20.9330, 48.0000], [20.9260, 48.0050], [20.9180, 48.0060]), { name: 'Kolomans Gegenstoß' }),
      s('m-bruecke', 'mon', 'flaeche', 'reiter', linie([20.9150, 48.0060], 1.0, 0.5, 90), { name: 'zurückgeworfen', staerke: '3.000', geschlagen: true }),
      s('u-lager', 'ung', 'flaeche', 'gemischt', klumpen(LAGER, 1.6), { name: 'Wagenburg', staerke: '26.000' }),
      s('m-sued', 'mon', 'pfeil', 'reiter', pfeil([20.8800, 47.9300], [20.9050, 47.9420], [20.9350, 47.9500]), { name: 'Subutai durch die Furt im Süden', finte: true }),
    ],
  },
  {
    zeit: '11. April, 8 Uhr',
    t: 360,
    kurz: 'Die zweite Hälfte kommt aus dem Süden.',
    text: 'Während der Kampf an der Brücke lief, hat Subutai weiter südlich eine Furt gefunden und den Fluss überschritten. Jetzt steht er hinter dem Lager. Als die Ungarn ausrücken wollen, um den Brückenkopf endgültig zu räumen, haben sie Reiterei auf beiden Seiten und ziehen sich in die Wagenburg zurück.',
    stellungen: [
      s('m-sued', 'mon', 'flaeche', 'reiter', linie([20.9420, 47.9550], 2.4, 0.7, 350), { name: 'Subutai im Rücken', staerke: '10.000' }),
      s('m-nord', 'mon', 'flaeche', 'reiter', linie([20.9350, 48.0060], 2.4, 0.7, 170), { name: 'Batu von Norden', staerke: '12.000' }),
      s('u-lager', 'ung', 'flaeche', 'gemischt', klumpen(LAGER, 1.6), { name: 'zieht sich zurück', staerke: '26.000' }),
    ],
  },
  {
    zeit: '11. April, 10 Uhr',
    t: 420,
    kurz: 'Pfeile und Brandsätze in eine dichte Menge.',
    text: 'Der Ring schließt sich. Die Mongolen stürmen nicht – sie schießen. In eine Wagenburg, in der 26.000 Menschen und ihre Pferde auf engem Raum stehen, trifft jeder Pfeil etwas. Dazu Brandsätze aus den Wurfmaschinen. Nach zwei Stunden ist das Lager ein Chaos, in dem niemand mehr einen Befehl weitergibt.',
    stellungen: [
      s('m-ring', 'mon', 'flaeche', 'reiter', klumpen(LAGER, 4.0, 1.1, 20), { name: 'Ring um die Wagenburg', staerke: '22.000' }),
      s('m-beschuss', 'mon', 'pfeil', 'bogen', pfeil([20.9600, 47.9900], [20.9420, 47.9830]), { name: 'Pfeile und Brandsätze' }),
      s('u-lager', 'ung', 'flaeche', 'gemischt', klumpen(LAGER, 1.5), { name: 'unter Beschuss', staerke: '24.000', geschlagen: true }),
    ],
  },
  {
    zeit: '11. April, 12 Uhr',
    t: 480,
    kurz: 'Die Lücke, die offen bleibt.',
    text: 'Im Westen des Rings bleibt eine Stelle unbesetzt, in Richtung der sumpfigen Niederung. Die Quellen sind sich einig, dass das Absicht war: Ein eingeschlossener Gegner, der keinen Ausweg sieht, kämpft bis zuletzt; einer, der eine Lücke sieht, läuft. Und wer läuft, zieht sich auseinander und lässt seine Waffen fallen.',
    stellungen: [
      s('m-ring', 'mon', 'flaeche', 'reiter', klumpen([20.9450, 47.9820], 4.0, 1.1, 20), { name: 'Ring mit offener Westseite', staerke: '22.000' }),
      s('m-luecke', 'mon', 'pfeil', 'reiter', pfeil([20.9000, 47.9900], [20.8850, 47.9860]), { name: 'Die offene Stelle', finte: true }),
      s('u-lager', 'ung', 'flaeche', 'gemischt', klumpen(LAGER, 1.4), { name: 'löst sich auf', staerke: '20.000', geschlagen: true }),
      s('u-ausbruch', 'ung', 'pfeil', 'gemischt', pfeil([20.9280, 47.9820], [20.9020, 47.9860], [20.8700, 47.9880]), { name: 'durch die Lücke', rueckzug: true }),
    ],
  },
  {
    zeit: '11. und 12. April',
    t: 600,
    kurz: 'Dreißig Kilometer Verfolgung durch den Sumpf.',
    text: 'Was aus der Lücke kommt, läuft in die Niederung – schweres Gerät bleibt im Morast, die Ordnung ist weg. Die mongolische Reiterei folgt in aller Ruhe und tötet zwei Tage lang. Ein Augenzeuge schreibt, der Weg sei auf dreißig Kilometer mit Leichen bedeckt gewesen. Béla entkommt mit wenigen Begleitern, sein Bruder Koloman stirbt an seinen Wunden.',
    stellungen: [
      s('u-flucht', 'ung', 'pfeil', 'gemischt', pfeil([20.8800, 47.9880], [20.7400, 47.9600], [20.5600, 47.9200], [20.3200, 47.8800]), { name: 'Flucht nach Westen', rueckzug: true }),
      s('m-verfolgung', 'mon', 'pfeil', 'reiter', pfeil([20.9000, 47.9900], [20.7500, 47.9650], [20.5400, 47.9250]), { name: 'Verfolgung über zwei Tage' }),
      s('u-lager', 'ung', 'flaeche', 'gemischt', klumpen(LAGER, 1.2), { name: 'Lager genommen', staerke: 'Reste', geschlagen: true }),
    ],
  },
  {
    zeit: 'Sommer 1241 bis 1285',
    t: 780,
    kurz: 'Ein Jahr Besetzung, dann Burgen aus Stein.',
    text: 'Ungarn östlich der Donau wird verwüstet; Schätzungen reichen von einem Viertel bis zur Hälfte der Bevölkerung. Im Winter frieren die Flüsse zu, und die Mongolen gehen auch nach Westen über die Donau. Im März 1242 brechen sie ab – warum, ist bis heute umstritten: der Tod des Großkhans, die Nachfolgefrage, oder erschöpfte Weiden, die ein Heer aus mehreren Pferden je Reiter nicht mehr trugen. Béla IV. kehrt zurück und zieht die Lehre: steinerne Burgen statt Erdwällen, Mauern und Privilegien für die Städte, schwere Reiterei nach westlichem Muster. Als 1285 ein zweiter Zug kommt, scheitert er genau daran. Béla heißt seither „zweiter Staatsgründer“ – ein Titel, den man nur bekommt, wenn vorher alles zerstört war.',
    uebersicht: true,
    sicht: [[15.0, 43.0], [30.0, 51.5]],
    stellungen: [
      s('m-besetzung', 'mon', 'pfeil', 'reiter', pfeil([20.94, 47.98], [19.04, 47.50], [17.60, 47.20], [16.37, 48.21]), { name: 'bis vor Wien' }),
      s('m-abzug', 'mon', 'pfeil', 'reiter', pfeil([19.50, 47.60], [22.50, 47.20], [26.50, 47.60], [29.50, 47.00]), { name: 'März 1242: Abzug nach Osten', rueckzug: true }),
      s('u-koenig', 'ung', 'pfeil', 'gemischt', pfeil([20.30, 47.88], [17.60, 46.20], [16.30, 43.50]), { name: 'Béla flieht bis an die Adria', rueckzug: true }),
    ],
  },
];

export const mohi = {
  id: 'mohi',
  name: 'Muhi',
  ort: 'Am Sajó bei Muhi',
  datum: '11. April 1241',
  jahr: 1279,
  mitte: [20.9250, 47.9800],
  zoom: 12.1,
  grund: 'relief',
  worum: 'Die Mongolen in Mitteleuropa – und ein Lehrstück darüber, was eine Wagenburg wert ist, wenn der Gegner sie nicht stürmen muss. Subutai beschießt sie und lässt eine Lücke offen: Wer eingeschlossen ist und einen Ausweg sieht, kämpft nicht weiter, sondern läuft.',
  parteien,
  gelaende,
  stationen,
  ausgang: 'Das ungarische Heer wird beim Ausbruch und auf der Flucht aufgerieben. König Béla IV. entkommt und flieht bis an die dalmatinische Küste.',
  verluste: [
    { partei: 'ung', text: 'schätzungsweise 10.000 bis 25.000 – ein großer Teil des Heeres und des Adels' },
    { partei: 'mon', text: 'nach den Quellen mäßig, genaue Zahlen fehlen' },
  ],
  folgen: 'Ungarn wird ein Jahr lang verwüstet; die Bevölkerungsverluste werden auf ein Viertel bis die Hälfte geschätzt. Im März 1242 ziehen die Mongolen ab. Béla IV. baut das Land mit steinernen Burgen und befestigten Städten wieder auf – 1285 scheitert daran ein zweiter Zug.',
  streit: 'Warum die Mongolen 1242 abzogen, ist die große offene Frage: der Tod des Großkhans Ögedei und die Nachfolgeregelung, oder – so eine neuere Deutung – ein nasser Winter und erschöpfte Weiden, die ein Heer aus mehreren Pferden je Reiter nicht mehr trugen. Auch ob die Lücke im Ring bewusst gelassen wurde, steht nur in einem Teil der Quellen.',
};
