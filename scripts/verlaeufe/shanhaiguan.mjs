#!/usr/bin/env node
/*
 * ACHTUNG – Verhältnis zu src/data/battles/shanhaiguan.json: Dieses Skript hat
 * die JSON-Datei einmal erzeugt; danach ist die JSON-Datei die gültige Fassung.
 */
/**
 * Shanhaiguan, 27. Mai 1644.
 *
 * Eine Schlacht mit drei Parteien, von denen zwei am Morgen kämpfen und die
 * dritte den ganzen Vormittag zusieht. Das ist der eigentliche Vorgang: Wu
 * Sangui hält mit dem letzten Feldheer der Ming den Pass, in dem die Große
 * Mauer ans Meer stößt. Westlich davon steht das Bauernheer, das gerade
 * Peking genommen hat; nordöstlich stehen die Mandschu, gegen die diese
 * Mauer gebaut wurde. Wu kann sich nur einem von beiden ergeben.
 *
 * Er wählt die Mandschu, weil sie ihm die Rache versprechen. Dorgon lässt
 * ihn erst kämpfen, bis das Bauernheer müde ist, und schickt seine Reiterei
 * dann in eine Flanke, die sich nicht mehr drehen kann. Danach ist der Pass
 * offen, und er bleibt es 268 Jahre.
 *
 * Der Shanhai-Pass liegt bei 119.75 Ost, 40.01 Nord.
 */
import { linie, klumpen, pfeil } from '../lib/stellung.mjs';

const PASS = [119.7530, 40.0100];
const EBENE = [119.7000, 40.0250];
const YIPIANSHI = [119.7050, 40.1350];

const parteien = [
  {
    id: 'wu', name: 'Wu Sanguis Grenzheer', farbe: '#6f9fe0',
    fuehrung: 'Wu Sangui',
    staerke: 'die Ningyuan-Armee, rund 40.000 Grenztruppen und Milizen', zahl: 45000,
  },
  {
    id: 'shun', name: 'Shun-Dynastie', farbe: '#d4737c',
    fuehrung: 'Li Zicheng, Liu Zongmin',
    staerke: 'rund 60.000 – das Feldheer der Aufständischen', zahl: 60000,
  },
  {
    id: 'qing', name: 'Qing-Dynastie', farbe: '#7fbf7f',
    fuehrung: 'Dorgon, Ajige, Dodo',
    staerke: 'die acht Banner, rund 80.000, davon die Reiterei entscheidend', zahl: 80000,
  },
];

const gelaende = [
  {
    art: 'mauer',
    name: 'Die Große Mauer · vom Meer nach Norden',
    punkte: pfeil([119.7980, 39.9650], [119.7700, 40.0090], [119.7440, 40.0620],
      [119.7160, 40.1260], [119.6800, 40.1920]),
  },
  { art: 'stadt', name: 'Shanhaiguan · das Tor', punkte: klumpen(PASS, 1.8, 1.1, 20) },
  { art: 'weg', name: 'Yipianshi · Durchlass nach Norden', punkte: klumpen(YIPIANSHI, 1.4) },
  { art: 'fluss', name: 'Shihe', punkte: pfeil([119.6820, 40.1300], [119.6900, 40.0600], [119.7000, 39.9930]) },
  { art: 'hoehe', name: 'Yanshan · die Berge im Norden', punkte: klumpen([119.6300, 40.1500], 6.0, 1.8, 300) },
];

const s = (id, partei, form, gattung, punkte, mehr = {}) => ({ id, partei, form, gattung, punkte, ...mehr });

const stationen = [
  {
    zeit: 'April 1644',
    t: 0,
    kurz: 'Peking ist gefallen, der Kaiser hat sich erhängt.',
    text: 'Li Zicheng, ein ehemaliger Postreiter, hat sich aus einer Hungerrevolte an die Spitze eines Heeres gearbeitet und nimmt am 25. April Peking. Der letzte Ming-Kaiser erhängt sich an einem Baum im Palastgarten. Das einzige intakte Feldheer der Dynastie steht in diesem Augenblick vierhundert Kilometer nordöstlich am Shanhai-Pass und schaut auf zwei Seiten: nach Westen auf den Sieger, nach Nordosten auf die Mandschu.',
    uebersicht: true,
    sicht: [[105.5, 31.8], [126.8, 43.6]],
    stellungen: [
      s('anm-shun', 'shun', 'pfeil', 'gemischt', pfeil([108.94, 34.27], [111.60, 36.10], [114.50, 38.05], [116.40, 39.90]), { name: 'Li Zicheng nimmt Peking' }),
      s('anm-wu', 'wu', 'pfeil', 'gemischt', pfeil([120.73, 40.71], [120.20, 40.35], [119.75, 40.02]), { name: 'Wu Sangui zieht sich auf den Pass zurück' }),
      s('anm-qing', 'qing', 'pfeil', 'reiter', pfeil([123.43, 41.80], [122.10, 41.20], [120.60, 40.60], [119.90, 40.20]), { name: 'Dorgon marschiert an die Mauer' }),
    ],
  },
  {
    zeit: 'Anfang Mai',
    t: 60,
    kurz: 'Wu Sangui steht zwischen zwei Feinden und schreibt.',
    text: 'Li fordert Wus Übertritt und hat dafür Wus Vater in der Hand. Wu ist zunächst bereit – bis ihn unterwegs die Nachricht erreicht, dass Liu Zongmin sein Haus geplündert und seine Nebenfrau genommen hat. Er kehrt um, nimmt den Pass wieder ein und schreibt an Dorgon: Hilfe gegen die „Banditen“, gegen Land und Geld. Dorgon antwortet, er komme – aber nicht als Söldner.',
    stellungen: [
      s('w-pass', 'wu', 'flaeche', 'gemischt', klumpen(PASS, 3.0, 1.3, 20), { name: 'Wu Sangui im Pass', staerke: '40.000' }),
      s('w-linie', 'wu', 'flaeche', 'fuss', linie([119.7250, 40.0300], 5.0, 0.8, 270), { name: 'Vorstellung westlich der Mauer' }),
      s('q-heer', 'qing', 'flaeche', 'reiter', klumpen([119.8200, 40.1900], 5.0, 1.4, 250), { name: 'Dorgon jenseits der Mauer', staerke: 'acht Banner' }),
      s('sh-anmarsch', 'shun', 'pfeil', 'gemischt', pfeil([119.4500, 40.0700], [119.5600, 40.0450], [119.6400, 40.0300]), { name: 'Li Zicheng rückt heran' }),
    ],
  },
  {
    zeit: '26. Mai',
    t: 150,
    kurz: 'Das Bauernheer rückt vor die Mauer.',
    text: 'Li Zicheng führt sein Heer selbst heran, mit Wus Vater als Geisel im Gepäck. Er stellt es westlich des Shihe auf, in einer Linie quer vor den Pass, und schiebt einen Teil nach Norden, um die Mauer auf der Landseite zu umgehen. Der Pass ist damit eingeschlossen – von der einen Seite. Auf der anderen liegt die Armee, die Wu gerufen hat und die noch nichts tut.',
    stellungen: [
      s('sh-linie', 'shun', 'flaeche', 'gemischt', linie([119.6600, 40.0300], 8.0, 1.2, 90), { name: 'Das Shun-Heer westlich des Shihe', staerke: '60.000' }),
      s('sh-nord', 'shun', 'flaeche', 'fuss', klumpen([119.6750, 40.0950], 2.4, 1.2, 350), { name: 'Umgehung nach Norden' }),
      s('w-linie', 'wu', 'flaeche', 'fuss', linie([119.7180, 40.0300], 5.6, 1.0, 270), { name: 'Wu vor dem Tor', staerke: '40.000' }),
      s('w-pass', 'wu', 'flaeche', 'gemischt', klumpen(PASS, 2.6, 1.3, 20), { name: 'Besatzung im Pass' }),
      s('q-heer', 'qing', 'flaeche', 'reiter', klumpen([119.7600, 40.1700], 5.0, 1.4, 250), { name: 'Dorgon wartet ab', staerke: 'acht Banner' }),
    ],
  },
  {
    zeit: '27. Mai, Vormittag',
    t: 240,
    kurz: 'Ein Vormittag Gefecht am Shihe, ohne Entscheidung.',
    text: 'Wu geht aus dem Pass heraus und stellt sich zum Kampf, weil er im Pass nur verhungern könnte. Es wird ein langes, zähes Gefecht in der Ebene zwischen Fluss und Mauer, das keine Seite gewinnt und beide erschöpft. Genau darauf hat Dorgon gewartet: Zwei Heere, die einander stumpf schlagen, kosten ihn nichts.',
    stellungen: [
      s('w-linie', 'wu', 'flaeche', 'fuss', linie([119.7050, 40.0300], 6.0, 1.0, 270), { name: 'Wu greift an', staerke: '40.000' }),
      s('sh-linie', 'shun', 'flaeche', 'gemischt', linie([119.6700, 40.0300], 8.0, 1.4, 90), { name: 'hält stand', staerke: '60.000' }),
      s('w-stoss', 'wu', 'pfeil', 'fuss', pfeil([119.7100, 40.0300], [119.6950, 40.0300], [119.6820, 40.0300]), {}),
      s('sh-nord', 'shun', 'flaeche', 'fuss', klumpen([119.6900, 40.0800], 2.6, 1.2, 350), { name: 'drückt von Norden' }),
      s('q-heer', 'qing', 'flaeche', 'reiter', klumpen([119.7300, 40.1350], 4.6, 1.4, 250), { name: 'sieht zu', staerke: 'acht Banner' }),
    ],
  },
  {
    zeit: 'Mittag',
    t: 320,
    kurz: 'Dorgon sieht zu und wartet auf den Preis.',
    text: 'Wu reitet selbst durch die Linien zu Dorgon und bekommt seine Bedingung genannt: nicht Bündnis, sondern Unterwerfung. Wu kniet, lässt sich die Stirn scheren und den Zopf flechten – die Tracht der Mandschu – und schwört Treue. Erst danach setzt sich die Reiterei der Banner in Bewegung. Der Preis für die Rache an Li Zicheng ist die Dynastie.',
    stellungen: [
      s('w-linie', 'wu', 'flaeche', 'fuss', linie([119.7100, 40.0300], 6.0, 1.0, 270), { name: 'hält, erschöpft', staerke: 'was noch steht' }),
      s('sh-linie', 'shun', 'flaeche', 'gemischt', linie([119.6650, 40.0300], 8.0, 1.4, 90), { name: 'ebenso erschöpft', staerke: '60.000' }),
      s('q-heer', 'qing', 'flaeche', 'reiter', klumpen([119.7250, 40.1000], 4.4, 1.4, 250), { name: 'setzt sich in Bewegung', staerke: 'acht Banner' }),
      s('q-durch', 'qing', 'pfeil', 'reiter', pfeil([119.7150, 40.1300], [119.7100, 40.1050], [119.7050, 40.0850]), { name: 'durch Yipianshi' }),
    ],
  },
  {
    zeit: 'Früher Nachmittag',
    t: 380,
    kurz: 'Weißes Tuch auf der Schulter, damit man sie kennt.',
    text: 'Wus Soldaten binden sich weiße Tücher um die Schultern. Sie sehen aus wie die Männer gegenüber, sprechen dieselbe Sprache und tragen dieselben Waffen; ohne Zeichen würde die Reiterei der Banner nicht unterscheiden, in wen sie hineinreitet. Es ist der Augenblick, in dem aus einem Bürgerkrieg eine Eroberung wird, und man kann ihn an einem Stück Stoff festmachen.',
    stellungen: [
      s('w-linie', 'wu', 'flaeche', 'fuss', linie([119.7150, 40.0300], 5.6, 1.0, 270), { name: 'mit weißem Tuch', staerke: '40.000' }),
      s('q-reiter', 'qing', 'flaeche', 'reiter', klumpen([119.7000, 40.0750], 4.0, 1.6, 200), { name: 'Die Banner treten an', staerke: 'Reiterei' }),
      s('sh-linie', 'shun', 'flaeche', 'gemischt', linie([119.6650, 40.0280], 8.0, 1.4, 90), { name: 'weiß noch nichts', staerke: '60.000' }),
      s('sh-nord', 'shun', 'flaeche', 'fuss', klumpen([119.6800, 40.0800], 2.4, 1.2, 350), { name: 'offene Flanke' }),
    ],
  },
  {
    zeit: 'Nachmittag',
    t: 440,
    kurz: 'Ein Sandsturm, und danach steht die Reiterei drin.',
    text: 'Über die Ebene zieht ein Staubsturm, wie er im Frühjahr aus der Steppe kommt, und nimmt beiden Seiten für eine Weile die Sicht. Als er sich legt, ist die Reiterei der acht Banner in der Nordflanke des Shun-Heeres. Li Zicheng erkennt an den Zöpfen, wer da reitet, und begreift in derselben Sekunde, dass er nicht mehr gegen Wu Sangui kämpft.',
    stellungen: [
      s('q-stoss', 'qing', 'pfeil', 'reiter', pfeil([119.7000, 40.0800], [119.6850, 40.0560], [119.6700, 40.0380]), { name: 'in die Nordflanke' }),
      s('q-reiter', 'qing', 'flaeche', 'reiter', klumpen([119.6850, 40.0620], 4.0, 1.6, 200), { name: 'Die Banner', staerke: 'Reiterei' }),
      s('sh-nord', 'shun', 'flaeche', 'fuss', klumpen([119.6750, 40.0700], 2.2, 1.2, 350), { name: 'wird eingerollt', geschlagen: true }),
      s('sh-linie', 'shun', 'flaeche', 'gemischt', linie([119.6620, 40.0250], 7.4, 1.4, 90), { name: 'kann sich nicht drehen', staerke: '60.000', geschlagen: true }),
      s('w-linie', 'wu', 'flaeche', 'fuss', linie([119.7050, 40.0280], 5.6, 1.0, 270), { name: 'drückt von vorn', staerke: '40.000' }),
    ],
  },
  {
    zeit: 'Abend',
    t: 500,
    kurz: 'Das Heer der Aufständischen löst sich nach Westen.',
    text: 'Das Shun-Heer bricht auseinander und läuft die Straße nach Westen zurück, verfolgt bis in die Nacht. Li lässt unterwegs Wus Vater hinrichten, in Peking dann die ganze Familie. Er selbst erreicht die Hauptstadt, die er vor vier Wochen genommen hat, mit einem Bruchteil dessen, womit er ausgezogen ist.',
    stellungen: [
      s('sh-flucht', 'shun', 'pfeil', 'gemischt', pfeil([119.6400, 40.0300], [119.5200, 40.0100], [119.3800, 39.9800]), { name: 'Rückzug nach Westen', rueckzug: true }),
      s('sh-linie', 'shun', 'flaeche', 'gemischt', linie([119.6100, 40.0200], 5.0, 1.2, 90), { name: 'was noch zusammenhält', staerke: 'Reste', geschlagen: true }),
      s('q-reiter', 'qing', 'flaeche', 'reiter', klumpen([119.6600, 40.0450], 4.0, 1.6, 200), { name: 'verfolgt', staerke: 'Reiterei' }),
      s('w-linie', 'wu', 'flaeche', 'fuss', linie([119.6900, 40.0280], 5.0, 1.0, 270), { name: 'zieht nach', staerke: '40.000' }),
    ],
  },
  {
    zeit: 'Nach dem 27. Mai',
    t: 600,
    kurz: 'Zwei Jahrhunderte Qing – der Preis für eine Rache.',
    text: 'Li Zicheng krönt sich am 3. Juni in Peking zum Kaiser, brennt Teile des Palastes nieder und zieht am nächsten Tag ab; ein Jahr später wird er auf der Flucht erschlagen. Am 6. Juni reitet Dorgon in Peking ein und setzt den sechsjährigen Shunzhi auf den Thron. Wu Sangui erobert für die Qing den Süden, bekommt Yunnan als Lehen und erhebt sich 1673 gegen sie – vergeblich. Das Reich, das er in den Pass gelassen hat, hält bis 1912.',
    uebersicht: true,
    sicht: [[100.5, 20.5], [128.5, 44.5]],
    stellungen: [
      s('q-peking', 'qing', 'pfeil', 'reiter', pfeil([119.75, 40.02], [118.20, 40.00], [116.40, 39.90]), { name: '6. Juni: Dorgon in Peking' }),
      s('sh-ende', 'shun', 'pfeil', 'gemischt', pfeil([116.40, 39.90], [112.50, 38.20], [108.94, 34.27], [113.60, 29.80]), { name: 'Li Zicheng auf der Flucht bis 1645' }),
      s('q-sueden', 'qing', 'pfeil', 'gemischt', pfeil([116.40, 39.90], [118.80, 32.06], [113.26, 23.13], [102.70, 25.04]), { name: 'Die Eroberung des Südens, bis 1662' }),
      s('w-yunnan', 'wu', 'pfeil', 'gemischt', pfeil([102.70, 25.04], [108.30, 27.50], [112.90, 28.20]), { name: '1673: Wu Sanguis eigener Aufstand' }),
    ],
  },
];

export const shanhaiguan = {
  id: 'shanhaiguan',
  name: 'Shanhaiguan',
  ort: 'Wo die Große Mauer ans Meer stößt',
  datum: '27. Mai 1644',
  jahr: 1644,
  mitte: [119.7300, 40.0300],
  zoom: 11.0,
  grund: 'relief',
  worum: 'Drei Heere an einem Pass, von denen zwei den ganzen Vormittag kämpfen und das dritte zusieht. Wu Sangui kann sich nur einer Seite ergeben – dem Bauernheer, das Peking genommen hat, oder den Mandschu, gegen die diese Mauer gebaut wurde. Er wählt die Mandschu, weil sie ihm die Rache versprechen, und öffnet damit das Tor.',
  parteien,
  gelaende,
  stationen,
  ausgang: 'Das Shun-Heer wird geschlagen und löst sich nach Westen auf. Wu Sangui unterwirft sich den Qing; der Pass ist offen.',
  verluste: [
    { partei: 'shun', text: 'Zehntausende; das Feldheer als Verband vernichtet' },
    { partei: 'wu', text: 'schwer – ein Vormittag Nahkampf ohne Entscheidung' },
    { partei: 'qing', text: 'gering; die Banner greifen erst am Nachmittag ein' },
  ],
  folgen: 'Dorgon zieht am 6. Juni 1644 in Peking ein und setzt den sechsjährigen Shunzhi auf den Thron. Die Eroberung des Südens dauert noch achtzehn Jahre; die Qing regieren dann bis 1912. Der Zwang zum Zopf – Stirn geschoren, Haar geflochten – wird zum Prüfstein der Unterwerfung und kostet in Städten wie Jiading Zehntausende das Leben. Wu Sangui erhält Yunnan, erhebt sich 1673 gegen die Dynastie, die er hereingelassen hat, und stirbt 1678 im Aufstand.',
  streit: 'Die Zahlen schwanken stark: Für Li Zicheng werden 60.000 bis 200.000 genannt, für die Banner 60.000 bis 140.000. Die Geschichte mit der Nebenfrau Chen Yuanyuan – „Wu Sangui hat China für ein Lächeln verloren“ – stammt aus späteren Gedichten und Romanen; dass Wus Familie in Pekinger Haft war und misshandelt wurde, ist dagegen gut bezeugt. Der Sandsturm steht in mehreren Quellen und wird von manchen Historikern für literarische Ausschmückung gehalten.',
};
