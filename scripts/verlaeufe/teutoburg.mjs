#!/usr/bin/env node
/*
 * ACHTUNG – Verhältnis zu src/data/battles/teutoburg.json: Dieses Skript hat
 * die JSON-Datei einmal erzeugt; danach ist die JSON-Datei die gültige Fassung.
 */
/**
 * Die Varusschlacht, Herbst 9 n. Chr.
 *
 * Der Ort war zweitausend Jahre lang unbekannt und ist es streng genommen
 * immer noch: Was bei Kalkriese ausgegraben wurde – ein aufgeschütteter Wall
 * am Fuß des Berges, dahinter Schleuderblei, davor Knochengruben und
 * Münzen, die alle vor 9 enden –, ist ein Kampfplatz dieses Untergangs,
 * vermutlich der letzte. Die Tage davor liegen irgendwo östlich davon im
 * Wald.
 *
 * Deshalb ist der Verlauf hier zweigeteilt: Die ersten Stationen zeigen eine
 * Marschsäule, die sich über Kilometer streckt und an den Flanken zerfranst,
 * mit einer Genauigkeit, die die Quellen hergeben und die Archäologie nicht.
 * Erst am Engpass zwischen Kalkrieser Berg und Großem Moor wird die Karte
 * genau, weil dort im Boden liegt, was geschah.
 *
 * Kalkriese liegt bei 8.13 Ost, 52.41 Nord.
 */
import { linie, klumpen, pfeil } from '../lib/stellung.mjs';

const PASS = [8.1290, 52.4105];
const BERG = [8.1350, 52.4215];
const MOOR = [8.1500, 52.3870];

const parteien = [
  {
    id: 'rom', name: 'Rom', farbe: '#6f9fe0',
    fuehrung: 'Publius Quinctilius Varus, Numonius Vala, Ceionius, Eggius',
    staerke: 'Legionen XVII, XVIII und XIX, sechs Kohorten, drei Schwadronen – mit Tross gegen 20.000',
    zahl: 20000,
  },
  {
    id: 'ger', name: 'Germanische Stämme', farbe: '#c98a4b',
    fuehrung: 'Arminius, Segimer',
    staerke: 'Cherusker, Marser, Brukterer, Chatten, Angrivarier – Zahl unbekannt',
    zahl: 17000,
  },
];

const gelaende = [
  { art: 'hoehe', name: 'Kalkrieser Berg', punkte: klumpen(BERG, 2.0, 4.4, 100) },
  { art: 'sumpf', name: 'Großes Moor', punkte: klumpen(MOOR, 3.4, 3.2, 100) },
  { art: 'weg', name: 'Der Engpass · stellenweise 200 Meter', punkte: linie(PASS, 6.0, 0.5, 10) },
  { art: 'mauer', name: 'Der Wall aus Grassoden', punkte: linie([8.1330, 52.4150], 3.4, 0.16, 190) },
  { art: 'wald', name: 'Wiehengebirge', punkte: klumpen([8.1700, 52.4330], 2.6, 4.0, 100) },
];

const s = (id, partei, form, gattung, punkte, mehr = {}) => ({ id, partei, form, gattung, punkte, ...mehr });

const stationen = [
  {
    zeit: 'Spätsommer 9',
    t: 0,
    kurz: 'Ein Aufstand, der nur ein Vorwand ist.',
    text: 'Varus verwaltet seit zwei Jahren das Land zwischen Rhein und Elbe wie eine Provinz: Steuern, Gerichtstage, römisches Recht. Sein bester Mann dabei ist Arminius, Cheruskerfürst, römischer Ritter, Führer der germanischen Hilfsreiterei. Als die Legionen vom Sommerlager an der Weser zu den Winterquartieren am Rhein aufbrechen, meldet Arminius einen Aufstand weiter nördlich. Varus biegt vom Weg ab, um ihn nebenbei zu erledigen.',
    uebersicht: true,
    sicht: [[5.6, 50.6], [10.8, 53.6]],
    stellungen: [
      s('anm-rom', 'rom', 'pfeil', 'gemischt', pfeil([9.30, 52.10], [8.80, 52.28], [8.40, 52.38], [8.20, 52.41]), { name: 'Varus biegt nach Norden ab' }),
      s('anm-soll', 'rom', 'pfeil', 'gemischt', pfeil([9.30, 52.10], [8.20, 51.92], [6.95, 51.72], [6.45, 51.66]), { name: 'Der Weg ins Winterlager, den er nicht nimmt' }),
      s('anm-ger', 'ger', 'pfeil', 'gemischt', pfeil([9.10, 52.70], [8.60, 52.55], [8.25, 52.44]), { name: 'Arminius’ Aufgebot sammelt sich' }),
    ],
  },
  {
    zeit: 'Erster Tag',
    t: 60,
    kurz: 'Drei Legionen im Regen, über Kilometer gestreckt.',
    text: 'Die Säule marschiert nicht als Heer, sondern als Zug: Legionen, dazwischen Wagen, Maultiere, Familien, Händler. Im nassen Wald wird daraus eine Reihe von zehn, vielleicht fünfzehn Kilometern Länge. Arminius hat sich mit der Reiterei verabschiedet, angeblich um Verstärkung zu holen. Dann kommen die ersten Speere von den Hängen, und die Säule kann nirgends antreten, weil sie nirgends Platz hat.',
    stellungen: [
      s('r-saeule', 'rom', 'flaeche', 'gemischt', linie([8.2600, 52.3760], 7.0, 0.35, 195), { name: 'Marschsäule · drei Legionen', staerke: 'über Kilometer gestreckt' }),
      s('r-tross', 'rom', 'flaeche', 'gemischt', klumpen([8.3120, 52.3660], 1.3), { name: 'Tross, Wagen, Familien' }),
      s('g-hang1', 'ger', 'flaeche', 'fuss', klumpen([8.2850, 52.3900], 1.1), { name: 'auf den Hängen' }),
      s('g-hang2', 'ger', 'flaeche', 'fuss', klumpen([8.2260, 52.3960], 1.1), { name: 'auf den Hängen' }),
      s('g-wurf', 'ger', 'pfeil', 'fuss', pfeil([8.2830, 52.3880], [8.2760, 52.3800], [8.2700, 52.3770]), { name: 'Speere von oben' }),
    ],
  },
  {
    zeit: 'Zweiter Tag',
    t: 150,
    kurz: 'Der Tross brennt, damit die Säule schneller wird.',
    text: 'Varus lässt in der Nacht ein Marschlager anlegen und am Morgen verbrennen, was die Säule aufhält: Wagen, Gepäck, alles Überflüssige. Es ist die richtige Entscheidung und kommt zwei Tage zu spät. Das Heer schlägt sich nach Nordwesten durch, in offeneres Land – auf den einzigen Weg, der von hier aus zum Rhein führt und den Arminius so gut kennt wie er.',
    stellungen: [
      s('r-lager', 'rom', 'flaeche', 'gemischt', klumpen([8.2280, 52.3930], 1.1), { name: 'Marschlager, in Brand gesteckt' }),
      s('r-saeule', 'rom', 'flaeche', 'gemischt', linie([8.1980, 52.4010], 5.4, 0.32, 195), { name: 'Marschsäule, ohne Tross', staerke: 'was noch marschieren kann' }),
      s('g-hang2', 'ger', 'flaeche', 'fuss', klumpen([8.2160, 52.4130], 1.2), { name: 'folgt an der Flanke' }),
      s('g-vor', 'ger', 'pfeil', 'fuss', pfeil([8.2100, 52.4180], [8.1700, 52.4230], [8.1400, 52.4200]), { name: 'setzt sich vor die Säule' }),
    ],
  },
  {
    zeit: 'Dritter Tag, Vormittag',
    t: 240,
    kurz: 'Zwischen Berg und Moor wird der Weg zum Schlauch.',
    text: 'Bei Kalkriese schiebt sich der Kalkrieser Berg von Norden an das Große Moor heran. Was bleibt, ist ein Streifen sandigen Bodens, an der engsten Stelle keine zweihundert Meter breit. Ein Heer, das hier hineingeht, kann sich weder entfalten noch ausweichen; wer den Streifen sperrt, hat es. Genau dort haben die Germanen in den Tagen zuvor einen Wall aus Grassoden aufgeschüttet, hüfthoch, mit Durchlässen.',
    stellungen: [
      s('r-saeule', 'rom', 'flaeche', 'gemischt', linie([8.1880, 52.4070], 5.0, 0.30, 190), { name: 'in den Engpass hinein', staerke: 'drei Legionen' }),
      s('g-wall', 'ger', 'flaeche', 'fuss', linie([8.1330, 52.4148], 3.2, 0.20, 190), { name: 'Hinter dem Wall', staerke: 'Cherusker' }),
      s('g-sperre', 'ger', 'flaeche', 'fuss', linie([8.0860, 52.4120], 1.6, 0.45, 100), { name: 'Sperre am Westausgang' }),
      s('g-hang2', 'ger', 'flaeche', 'fuss', klumpen([8.1750, 52.4270], 1.2), { name: 'am Berghang' }),
    ],
  },
  {
    zeit: 'Am Wall',
    t: 330,
    kurz: 'Hinter dem Wall wartet, wer den Weg gebaut hat.',
    text: 'Als die Säule den Wall entlangzieht, kommt der Angriff von der Seite, aus den Durchlässen heraus, in eine Flanke, die keine Front bilden kann. Wer nach links ausweicht, steht im Moor. Die Legionäre kämpfen nicht als Legion, sondern als das, was gerade beieinandersteht. Im Boden liegen später Schleuderblei und Speerspitzen dicht am Wall und Knochen dahinter – die Reihenfolge des Kampfes ist ausgrabbar.',
    stellungen: [
      s('g-wall', 'ger', 'flaeche', 'fuss', linie([8.1330, 52.4148], 3.2, 0.20, 190), { name: 'aus den Durchlässen', staerke: 'Cherusker' }),
      s('g-stoss', 'ger', 'pfeil', 'fuss', pfeil([8.1360, 52.4142], [8.1330, 52.4120], [8.1300, 52.4098]), { name: 'in die Flanke' }),
      s('g-stoss2', 'ger', 'pfeil', 'fuss', pfeil([8.1600, 52.4160], [8.1560, 52.4130], [8.1520, 52.4105]), { name: 'in die Flanke' }),
      s('r-saeule', 'rom', 'flaeche', 'gemischt', linie([8.1420, 52.4075], 4.2, 0.28, 190), { name: 'ohne Front', staerke: 'drei Legionen', geschlagen: true }),
      s('g-sperre', 'ger', 'flaeche', 'fuss', linie([8.0880, 52.4118], 1.6, 0.45, 100), { name: 'Der Ausgang ist zu' }),
    ],
  },
  {
    zeit: 'Nachmittag',
    t: 400,
    kurz: 'Die Reiterei reitet davon und lässt das Fußvolk.',
    text: 'Numonius Vala, Varus’ Legat, sammelt die drei Reiterschwadronen und versucht, sich zum Rhein durchzuschlagen. Ob als Feigheit oder als Versuch, Hilfe zu holen, entscheiden schon die römischen Autoren verschieden – die Wirkung ist dieselbe: Das Fußvolk sieht die Reiter verschwinden. Weit kommen sie nicht. Nördlich des Berges werden sie eingeholt und niedergemacht.',
    stellungen: [
      s('r-reiter', 'rom', 'pfeil', 'reiter', pfeil([8.1200, 52.4085], [8.0950, 52.4210], [8.0500, 52.4350], [8.0100, 52.4430]), { name: 'Numonius Vala bricht aus', rueckzug: true }),
      s('g-nach', 'ger', 'pfeil', 'reiter', pfeil([8.1100, 52.4260], [8.0700, 52.4380], [8.0250, 52.4430]), { name: 'holt sie ein' }),
      s('r-saeule', 'rom', 'flaeche', 'gemischt', linie([8.1300, 52.4070], 3.2, 0.30, 190), { name: 'sieht die Reiter gehen', staerke: 'was übrig ist', geschlagen: true }),
      s('g-wall', 'ger', 'flaeche', 'fuss', linie([8.1330, 52.4148], 3.2, 0.20, 190), { name: 'drückt nach', staerke: 'Cherusker' }),
    ],
  },
  {
    zeit: 'Gegen Abend',
    t: 460,
    kurz: 'Varus stürzt sich in sein Schwert.',
    text: 'Varus ist verwundet und tut, was ein römischer Statthalter in dieser Lage tut: Er tötet sich, damit er nicht lebend in die Hände der Germanen fällt. Ein Teil der Offiziere folgt ihm. Der Präfekt Ceionius ergibt sich und wird dafür in den römischen Berichten schlechter behandelt als die Toten. Der Rest schließt sich zu einem Haufen zusammen, der noch eine Weile hält.',
    stellungen: [
      s('r-rest', 'rom', 'flaeche', 'gemischt', klumpen([8.1180, 52.4075], 1.0), { name: 'Der letzte Haufen', staerke: 'Reste dreier Legionen', geschlagen: true }),
      s('g-ring', 'ger', 'flaeche', 'fuss', klumpen([8.1180, 52.4080], 2.6, 1.4, 100), { name: 'schließt den Ring' }),
      s('g-sperre', 'ger', 'flaeche', 'fuss', linie([8.0880, 52.4118], 1.6, 0.45, 100), { name: 'Westausgang' }),
    ],
  },
  {
    zeit: 'Danach',
    t: 520,
    kurz: 'Gefangene werden geopfert, Köpfe an Bäume genagelt.',
    text: 'Was übrig bleibt, wird erschlagen oder gefangen. Höhere Offiziere werden in Gruben getötet, andere in Kesseln geopfert, Schädel an Baumstämme genagelt; sechs Jahre später findet Germanicus die Stelle so vor und lässt die Knochen begraben. Varus’ Leichnam war vorher notdürftig verbrannt worden; Arminius schickt den Kopf an Marbod, den König der Markomannen, der ihn nach Rom weiterreicht.',
    stellungen: [
      s('g-ring', 'ger', 'flaeche', 'fuss', klumpen([8.1220, 52.4090], 3.0, 1.4, 100), { name: 'Das Feld' }),
      s('r-rest', 'rom', 'flaeche', 'gemischt', klumpen([8.1160, 52.4082], 0.5), { name: 'Gefangene', staerke: 'wenige', geschlagen: true }),
      s('g-wall', 'ger', 'flaeche', 'fuss', linie([8.1330, 52.4148], 3.2, 0.20, 190), { name: 'Der Wall bleibt stehen' }),
    ],
  },
  {
    zeit: 'Nach 9 n. Chr.',
    t: 620,
    kurz: 'Die Grenze bleibt am Rhein – und bleibt es.',
    text: 'Augustus soll sich monatelang den Kopf gegen die Tür geschlagen und nach seinen Legionen gerufen haben. Germanicus führt 14 bis 16 n. Chr. große Feldzüge über den Rhein, gewinnt Schlachten, findet das Schlachtfeld, holt zwei der drei Adler zurück – und wird dann von Tiberius abberufen. Die Grenze bleibt am Rhein. Sie bleibt es, bis das Reich im Westen endet, und trennt bis heute romanisches und germanisches Sprachgebiet.',
    uebersicht: true,
    sicht: [[4.6, 49.4], [12.8, 54.6]],
    stellungen: [
      s('r-rhein', 'rom', 'pfeil', 'gemischt', pfeil([8.13, 52.41], [7.30, 52.00], [6.45, 51.66], [6.95, 50.94], [8.27, 50.00]), { name: 'Rückzug auf die Rheinlinie' }),
      s('r-germanicus', 'rom', 'pfeil', 'gemischt', pfeil([6.45, 51.66], [7.60, 52.10], [8.13, 52.41], [9.40, 52.35]), { name: '15/16 n. Chr.: Germanicus, dann Abbruch' }),
      s('g-frei', 'ger', 'pfeil', 'gemischt', pfeil([8.60, 52.60], [10.20, 52.20], [11.60, 51.20], [12.30, 50.30]), { name: 'Germanien bleibt außerhalb' }),
    ],
  },
];

export const teutoburg = {
  id: 'teutoburg',
  name: 'Die Varusschlacht',
  ort: 'Kalkriese am Wiehengebirge',
  datum: 'Herbst 9 n. Chr.',
  jahr: 9,
  mitte: [8.1300, 52.4100],
  zoom: 12.1,
  grund: 'relief',
  worum: 'Ein Heer, das nirgends antreten kann: drei Legionen als Marschsäule über Kilometer im nassen Wald, angegriffen von einem Mann, der als römischer Offizier gelernt hat, wie eine Marschsäule aussieht. Am Ende drückt der Kalkrieser Berg sie gegen das Große Moor, und der Weg ist zweihundert Meter breit.',
  parteien,
  gelaende,
  stationen,
  ausgang: 'Drei Legionen werden aufgerieben. Varus tötet sich; die Nummern XVII, XVIII und XIX werden nie wieder vergeben.',
  verluste: [
    { partei: 'rom', text: 'drei Legionen, sechs Kohorten, drei Reiterschwadronen – 15.000 bis 20.000 Menschen, samt Tross und Angehörigen' },
    { partei: 'ger', text: 'unbekannt; alle Quellen sind römisch und schweigen darüber' },
  ],
  folgen: 'Rom gibt das Land zwischen Rhein und Elbe auf. Die Grenze bleibt für vier Jahrhunderte am Rhein und an der Donau – und mit ihr die Trennlinie, an der später romanisches und germanisches Sprachgebiet auseinandergehen. Arminius wird 21 n. Chr. von den eigenen Verwandten erschlagen. Ab dem 16. Jahrhundert wird er als „Hermann“ zur Nationalfigur umgebaut, was mit der Schlacht nichts mehr zu tun hat.',
  streit: 'Der Ort ist der Streitfall schlechthin: Über siebenhundert Vorschläge wurden gemacht, bevor 1987 bei Kalkriese römische Münzen und Schleuderblei auftauchten. Gesichert ist dort ein Kampfplatz aus der richtigen Zeit, nicht die ganze Schlacht – die Tage davor sind ungeortet und hier nach den Schriftquellen gezeichnet. Das Große Moor ist heute entwässert; die Höhenschummerung zeigt die Landform, nicht den Untergrund von damals.',
};
