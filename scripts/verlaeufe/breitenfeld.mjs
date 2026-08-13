#!/usr/bin/env node
/*
 * ACHTUNG – Verhältnis zu src/data/battles/breitenfeld.json: Dieses Skript hat
 * die JSON-Datei einmal erzeugt; danach ist die JSON-Datei die gültige Fassung.
 */
/**
 * Breitenfeld, 17. September 1631.
 *
 * Die Schlacht, in der man den Unterschied zwischen zwei Ordnungen auf der
 * Karte sehen kann: auf der einen Seite siebzehn Gevierthaufen von je
 * anderthalbtausend Mann, in einer Linie, unbeweglich wie Bausteine; auf der
 * anderen zwei Linien aus kleinen Verbänden von fünfhundert, mit Musketieren
 * zwischen der Reiterei und leichten Geschützen bei jedem Regiment.
 *
 * Der Beweis kommt am Nachmittag: Als die Sachsen davonlaufen und die linke
 * Flanke offen liegt, dreht Horn die zweite Linie im rechten Winkel und baut
 * mitten in der Schlacht eine neue Front. Mit Gevierthaufen wäre das nicht
 * möglich – und genau deshalb wird die schwedische Ordnung danach überall
 * nachgebaut.
 *
 * Breitenfeld liegt bei 12.39 Ost, 51.42 Nord.
 */
import { linie, klumpen, pfeil } from '../lib/stellung.mjs';

const RUECKEN = [12.3950, 51.4230];
const SCHWEDEN = [12.3800, 51.4430];

const parteien = [
  {
    id: 'swe', name: 'Schweden und Sachsen', farbe: '#6f9fe0',
    fuehrung: 'Gustav II. Adolf, Gustav Horn, Johann Banér; Kurfürst Johann Georg I., Hans Georg von Arnim',
    staerke: 'rund 23.000 Schweden und Finnen, 18.000 Sachsen; über 100 Geschütze, viele davon leichte Regimentsstücke',
    zahl: 41000,
  },
  {
    id: 'kai', name: 'Kaiserliche und Liga', farbe: '#d4737c',
    fuehrung: 'Johann t’Serclaes von Tilly, Gottfried Heinrich zu Pappenheim, Egon von Fürstenberg',
    staerke: 'rund 35.000 in siebzehn großen Gevierthaufen; 27 schwere Geschütze',
    zahl: 35000,
  },
];

const gelaende = [
  { art: 'hoehe', name: 'Der flache Rücken, auf dem Tilly steht', punkte: klumpen(RUECKEN, 1.6, 4.0, 90) },
  { art: 'stadt', name: 'Breitenfeld', punkte: klumpen([12.3880, 51.4180], 0.7) },
  { art: 'stadt', name: 'Podelwitz', punkte: klumpen([12.3900, 51.4520], 0.7) },
  { art: 'stadt', name: 'Seehausen', punkte: klumpen([12.4200, 51.4380], 0.7) },
  { art: 'fluss', name: 'Die Lober', punkte: pfeil([12.3100, 51.4700], [12.3800, 51.4620], [12.4600, 51.4560]) },
  { art: 'weg', name: 'Die Straße nach Leipzig', punkte: pfeil([12.3900, 51.4100], [12.3800, 51.3800], [12.3730, 51.3450]) },
];

const s = (id, partei, form, gattung, punkte, mehr = {}) => ({ id, partei, form, gattung, punkte, ...mehr });

const stationen = [
  {
    zeit: '1630 bis September 1631',
    t: 0,
    kurz: 'Ein König landet mit 13.000 Mann in Pommern.',
    text: 'Nach zwölf Jahren Krieg steht der Kaiser so gut da wie nie: Das Restitutionsedikt von 1629 nimmt den Protestanten die Kirchengüter zurück. Im Juli 1630 landet Gustav Adolf bei Peenemünde – zunächst mit dreizehntausend Mann und ohne einen einzigen deutschen Verbündeten. Im Mai 1631 wird Magdeburg erstürmt und brennt ab; die Nachricht treibt Kursachsen ins schwedische Lager. Tilly zieht daraufhin in Sachsen ein und nimmt Leipzig.',
    uebersicht: true,
    sicht: [[3.5, 44.5], [27.5, 60.5]],
    stellungen: [
      s('anm-swe', 'swe', 'pfeil', 'gemischt', pfeil([18.07, 59.33], [16.00, 56.50], [13.77, 54.14], [12.10, 53.10], [12.39, 51.44]), { name: 'Gustav Adolf von Stockholm nach Sachsen' }),
      s('anm-kai', 'kai', 'pfeil', 'gemischt', pfeil([11.62, 52.13], [11.90, 51.80], [12.30, 51.55], [12.37, 51.34]), { name: 'Tilly von Magdeburg nach Leipzig' }),
      s('anm-sax', 'swe', 'pfeil', 'gemischt', pfeil([13.74, 51.05], [13.10, 51.25], [12.50, 51.45]), { name: 'Kursachsen tritt bei' }),
      s('anm-wien', 'kai', 'pfeil', 'gemischt', pfeil([16.37, 48.21], [14.30, 49.60], [12.90, 50.60], [12.40, 51.30]), { name: 'Der Nachschub des Kaisers' }),
    ],
  },
  {
    zeit: 'Zwei Ordnungen',
    t: 60,
    kurz: 'Siebzehn Gevierthaufen gegen viele kleine Verbände.',
    text: 'Tilly stellt auf, wie man seit hundert Jahren aufstellt: siebzehn Gevierthaufen zu je anderthalbtausend Mann, Pikeniere im Kern, Musketiere an den Ecken, alles in einer Linie auf einem flachen Rücken. So ein Block ist im Nahkampf fast unzerbrechlich – und er kann sich nicht drehen. Gustav Adolf stellt in zwei Linien aus Verbänden von fünfhundert Mann auf, mit Musketierabteilungen zwischen den Reiterschwadronen und leichten Geschützen bei jedem Regiment.',
    stellungen: [
      s('k-linie', 'kai', 'flaeche', 'fuss', linie([12.3950, 51.4240], 5.4, 1.0, 0), { name: 'Siebzehn Gevierthaufen', staerke: 'je rund 1.500' }),
      s('k-pappenheim', 'kai', 'flaeche', 'reiter', linie([12.3400, 51.4270], 1.6, 0.8, 0), { name: 'Pappenheim auf dem linken Flügel', staerke: '5.000 Kürassiere' }),
      s('k-fuerstenberg', 'kai', 'flaeche', 'reiter', linie([12.4500, 51.4260], 1.6, 0.8, 0), { name: 'Fürstenberg auf dem rechten Flügel' }),
      s('s-linie1', 'swe', 'flaeche', 'gemischt', linie([12.3800, 51.4420], 4.0, 0.5, 180), { name: 'Erste schwedische Linie', staerke: 'Brigaden zu 500' }),
      s('s-linie2', 'swe', 'flaeche', 'gemischt', linie([12.3800, 51.4480], 3.6, 0.5, 180), { name: 'Zweite Linie als Reserve' }),
      s('s-sachsen', 'swe', 'flaeche', 'gemischt', linie([12.4400, 51.4440], 2.8, 0.9, 180), { name: 'Die Sachsen links, für sich', staerke: '18.000' }),
    ],
  },
  {
    zeit: 'Mittag',
    t: 120,
    kurz: 'Zwei Stunden Geschützfeuer, drei Schuss gegen einen.',
    text: 'Die Schlacht beginnt mit einem Artilleriewechsel, der zwei Stunden dauert. Die schwedischen Rohre sind leichter, näher an der Truppe und mit fertigen Kartuschen geladen; sie schießen drei- bis fünfmal so oft wie die kaiserlichen. Für die dichtgedrängten Gevierthaufen ist jeder Treffer teuer, weil er in die Tiefe geht. Tilly beschließt, den Beschuss nicht länger auszuhalten.',
    stellungen: [
      s('s-geschuetz', 'swe', 'flaeche', 'geschuetz', linie([12.3800, 51.4390], 4.4, 0.3, 180), { name: 'Über 100 Rohre, dreifache Folge' }),
      s('k-geschuetz', 'kai', 'flaeche', 'geschuetz', linie([12.3950, 51.4285], 4.0, 0.3, 0), { name: '27 schwere Rohre auf dem Rücken' }),
      s('k-linie', 'kai', 'flaeche', 'fuss', linie([12.3950, 51.4240], 5.4, 1.0, 0), { name: 'steht im Feuer', staerke: 'siebzehn Haufen' }),
      s('s-linie1', 'swe', 'flaeche', 'gemischt', linie([12.3800, 51.4420], 4.0, 0.5, 180), { name: 'Erste Linie', staerke: 'Brigaden zu 500' }),
      s('s-sachsen', 'swe', 'flaeche', 'gemischt', linie([12.4400, 51.4440], 2.8, 0.9, 180), { name: 'Die Sachsen', staerke: '18.000' }),
    ],
  },
  {
    zeit: 'Gegen zwei',
    t: 180,
    kurz: 'Pappenheim reitet siebenmal an und kommt nicht durch.',
    text: 'Pappenheim greift den schwedischen rechten Flügel an, ohne Befehl abzuwarten, und wiederholt es sieben Mal. Jedes Mal empfangen ihn die Musketierabteilungen, die zwischen den Schwadronen stehen, mit Salven auf kurze Entfernung; dann geht die schwedische Reiterei zum Gegenstoß über, während die Musketiere nachladen. Es ist genau das Zusammenspiel, für das die Aufstellung gemacht ist.',
    stellungen: [
      s('k-pappenheim', 'kai', 'pfeil', 'reiter', pfeil([12.3400, 51.4290], [12.3480, 51.4360], [12.3560, 51.4400]), { name: 'Siebenmal gegen den rechten Flügel', geschlagen: true }),
      s('s-rechts', 'swe', 'flaeche', 'gemischt', linie([12.3560, 51.4420], 1.8, 0.7, 180), { name: 'Reiterei und Musketiere gemischt', staerke: 'Banér' }),
      s('s-gegen', 'swe', 'pfeil', 'reiter', pfeil([12.3560, 51.4400], [12.3480, 51.4350], [12.3420, 51.4310]), { name: 'Gegenstoß nach jeder Salve' }),
      s('k-linie', 'kai', 'flaeche', 'fuss', linie([12.3950, 51.4240], 5.4, 1.0, 0), { name: 'Die Mitte steht', staerke: 'siebzehn Haufen' }),
      s('s-sachsen', 'swe', 'flaeche', 'gemischt', linie([12.4400, 51.4440], 2.8, 0.9, 180), { name: 'Die Sachsen', staerke: '18.000' }),
    ],
  },
  {
    zeit: 'Kurz darauf',
    t: 240,
    kurz: 'Die Sachsen laufen weg, und links steht nichts mehr.',
    text: 'Auf dem anderen Flügel wirft Fürstenberg seine Reiterei gegen die Sachsen – Truppen, die im Sommer erst aufgestellt worden sind und noch nie gefochten haben. Sie halten nicht einmal einen Anlauf aus. Achtzehntausend Mann laufen davon, der Kurfürst mit ihnen bis Eilenburg; unterwegs plündern sie den schwedischen Tross. Die linke Flanke des schwedischen Heeres ist damit offen, und ein Drittel der Streitmacht ist weg.',
    stellungen: [
      s('k-fuerstenberg', 'kai', 'pfeil', 'reiter', pfeil([12.4500, 51.4300], [12.4450, 51.4380], [12.4400, 51.4430]), { name: 'Angriff auf die Sachsen' }),
      s('s-sachsen', 'swe', 'pfeil', 'gemischt', pfeil([12.4400, 51.4460], [12.4700, 51.4620], [12.5200, 51.4800]), { name: 'Die Sachsen laufen davon', rueckzug: true }),
      s('s-linie1', 'swe', 'flaeche', 'gemischt', linie([12.3800, 51.4420], 4.0, 0.5, 180), { name: 'Die linke Flanke liegt offen', staerke: 'Brigaden zu 500', geschlagen: true }),
      s('k-linie', 'kai', 'flaeche', 'fuss', linie([12.3950, 51.4240], 5.4, 1.0, 0), { name: 'Tilly sieht die Lücke', staerke: 'siebzehn Haufen' }),
    ],
  },
  {
    zeit: 'Gegen drei',
    t: 300,
    kurz: 'Tilly schwenkt in die Flanke, die eben frei wurde.',
    text: 'Tilly setzt seine Gevierthaufen schräg in Bewegung, nach Nordosten, um die schwedische Linie von der offenen Seite her aufzurollen. Es ist die richtige Entscheidung, und sie ist die einzige, die diese Aufstellung überhaupt zulässt: Ein Haufen kann marschieren und er kann kämpfen, aber er kann nicht die Richtung wechseln, wenn er einmal in Bewegung ist.',
    stellungen: [
      s('k-schwenk', 'kai', 'pfeil', 'fuss', pfeil([12.4100, 51.4260], [12.4300, 51.4340], [12.4400, 51.4400]), { name: 'Schräg gegen die offene Flanke' }),
      s('k-linie', 'kai', 'flaeche', 'fuss', linie([12.4150, 51.4290], 5.0, 1.2, 45), { name: 'Die Haufen schwenken', staerke: 'siebzehn Haufen' }),
      s('s-linie1', 'swe', 'flaeche', 'gemischt', linie([12.3800, 51.4420], 4.0, 0.5, 180), { name: 'Erste Linie, Flanke offen', staerke: 'Brigaden zu 500', geschlagen: true }),
      s('s-linie2', 'swe', 'flaeche', 'gemischt', linie([12.3800, 51.4480], 3.6, 0.5, 180), { name: 'Die zweite Linie steht noch' }),
    ],
  },
  {
    zeit: 'Der Beweis',
    t: 360,
    kurz: 'Horn dreht die zweite Linie im rechten Winkel.',
    text: 'Gustav Horn zieht die Reserve der zweiten Linie heraus und stellt sie quer zur bisherigen Front – innerhalb weniger Minuten steht dort, wo eben eine Lücke war, eine neue Front nach Osten. Genau dafür sind die kleinen Verbände da. Als Tillys Haufen ankommen, treffen sie nicht auf eine Flanke, sondern auf Musketen und Regimentsgeschütze, und ihr Schwung ist verbraucht.',
    stellungen: [
      s('s-linie2', 'swe', 'flaeche', 'gemischt', linie([12.4250, 51.4470], 3.0, 0.6, 90), { name: 'Die neue Front nach Osten', staerke: 'zweite Linie' }),
      s('s-horn', 'swe', 'pfeil', 'gemischt', pfeil([12.3900, 51.4490], [12.4100, 51.4480], [12.4250, 51.4475]), { name: 'Horn schwenkt die Reserve' }),
      s('k-linie', 'kai', 'flaeche', 'fuss', linie([12.4380, 51.4380], 4.6, 1.4, 45), { name: 'läuft in eine Front statt in eine Lücke', staerke: 'siebzehn Haufen', geschlagen: true }),
      s('s-linie1', 'swe', 'flaeche', 'gemischt', linie([12.3800, 51.4420], 4.0, 0.5, 180), { name: 'Erste Linie hält', staerke: 'Brigaden zu 500' }),
    ],
  },
  {
    zeit: 'Gegen fünf',
    t: 420,
    kurz: 'Der König nimmt die Geschütze auf dem Hügel.',
    text: 'Während links gehalten wird, führt Gustav Adolf den rechten Flügel nach vorn – gegen einen Rücken, den Tilly beim Schwenken entblößt hat. Die schwedische Reiterei nimmt die kaiserliche Artilleriestellung. Damit hat der Kaiser seine schweren Rohre verloren, und die Schweden haben sie.',
    stellungen: [
      s('s-koenig', 'swe', 'pfeil', 'reiter', pfeil([12.3620, 51.4400], [12.3750, 51.4330], [12.3900, 51.4285]), { name: 'Der König gegen den Rücken' }),
      s('k-geschuetz', 'kai', 'flaeche', 'geschuetz', linie([12.3950, 51.4285], 4.0, 0.3, 0), { name: 'Die Batterie wird genommen', geschlagen: true }),
      s('s-rechts', 'swe', 'flaeche', 'gemischt', linie([12.3700, 51.4360], 2.0, 0.7, 180), { name: 'Der rechte Flügel folgt', staerke: 'Banér' }),
      s('k-linie', 'kai', 'flaeche', 'fuss', linie([12.4380, 51.4380], 4.6, 1.4, 45), { name: 'gebunden im Osten', staerke: 'siebzehn Haufen', geschlagen: true }),
      s('s-linie2', 'swe', 'flaeche', 'gemischt', linie([12.4250, 51.4470], 3.0, 0.6, 90), { name: 'Horns neue Front hält' }),
    ],
  },
  {
    zeit: 'Danach',
    t: 480,
    kurz: 'Und richtet sie auf die, denen sie gehören.',
    text: 'Die eroberten Rohre werden umgedreht und zusammen mit der eigenen Artillerie in die Flanke der Gevierthaufen gefeuert. Ein Block von anderthalbtausend Mann in dreißig Reihen Tiefe ist für Längsfeuer das dankbarste Ziel, das es gibt. Von diesem Augenblick an ist die Schlacht kein Ringen mehr, sondern eine Rechenaufgabe.',
    stellungen: [
      s('s-erbeutet', 'swe', 'flaeche', 'geschuetz', linie([12.3980, 51.4290], 4.0, 0.3, 45), { name: 'Die erbeuteten Rohre, umgedreht' }),
      s('s-feuer', 'swe', 'pfeil', 'geschuetz', pfeil([12.4050, 51.4300], [12.4220, 51.4340], [12.4350, 51.4370]), { name: 'Längsfeuer in die Haufen' }),
      s('k-linie', 'kai', 'flaeche', 'fuss', linie([12.4380, 51.4390], 4.4, 1.4, 45), { name: 'im Längsfeuer', staerke: 'siebzehn Haufen', geschlagen: true }),
      s('s-linie2', 'swe', 'flaeche', 'gemischt', linie([12.4250, 51.4470], 3.0, 0.6, 90), { name: 'von Norden' }),
      s('s-linie1', 'swe', 'flaeche', 'gemischt', linie([12.3950, 51.4400], 3.6, 0.5, 90), { name: 'von Westen' }),
    ],
  },
  {
    zeit: 'Bei Einbruch der Dunkelheit',
    t: 540,
    kurz: 'Bei Dunkelheit steht von siebzehn Haufen keiner.',
    text: 'Die Blöcke zerfallen einer nach dem anderen; vier Regimenter halten am längsten und werden bis auf den letzten Rest zusammengeschossen. Tilly, zweiundsiebzig Jahre alt, wird dreimal verwundet und entkommt knapp; Pappenheim deckt mit dem Rest der Reiterei den Abzug. Von den Gefangenen treten Tausende noch auf dem Feld in schwedische Dienste – für einen Söldner ist der Sieger der bessere Arbeitgeber.',
    stellungen: [
      s('k-linie', 'kai', 'flaeche', 'fuss', klumpen([12.4300, 51.4340], 2.4, 1.3, 45), { name: 'Was noch steht', staerke: 'Reste', geschlagen: true }),
      s('k-rueckzug', 'kai', 'pfeil', 'gemischt', pfeil([12.4200, 51.4260], [12.3800, 51.4000], [12.3300, 51.3700]), { name: 'Tilly entkommt nach Westen', rueckzug: true }),
      s('k-pappenheim', 'kai', 'flaeche', 'reiter', linie([12.3900, 51.4150], 1.8, 0.8, 0), { name: 'Pappenheim deckt den Abzug' }),
      s('s-linie1', 'swe', 'flaeche', 'gemischt', linie([12.4000, 51.4340], 4.0, 0.6, 90), { name: 'Das Feld', staerke: 'Brigaden zu 500' }),
    ],
  },
  {
    zeit: 'Nach dem 17. September',
    t: 620,
    kurz: 'Die schwedische Ordnung wird das Vorbild Europas.',
    text: 'Der Krieg, der entschieden schien, geht weitere siebzehn Jahre. Gustav Adolf zieht durch Franken bis München, fällt aber schon im November 1632 bei Lützen; Schweden bleibt trotzdem bis zum Westfälischen Frieden im Spiel und behält Vorpommern. Die Aufstellung in kleinen Verbänden mit beweglicher Artillerie wird in ganz Europa nachgebaut – der Gevierthaufen verschwindet innerhalb einer Generation.',
    uebersicht: true,
    sicht: [[2.5, 43.5], [24.5, 60.5]],
    stellungen: [
      s('s-sued', 'swe', 'pfeil', 'gemischt', pfeil([12.39, 51.44], [11.08, 49.45], [10.90, 48.37], [11.58, 48.14]), { name: 'Bis München, Frühjahr 1632' }),
      s('k-wallenstein', 'kai', 'pfeil', 'gemischt', pfeil([14.42, 50.09], [13.00, 50.60], [12.14, 51.25]), { name: 'Wallenstein wird zurückgeholt' }),
      s('s-luetzen', 'swe', 'pfeil', 'gemischt', pfeil([11.58, 48.14], [11.90, 49.60], [12.14, 51.25]), { name: 'November 1632: Lützen' }),
      s('s-frieden', 'swe', 'pfeil', 'gemischt', pfeil([12.14, 51.25], [11.00, 52.60], [13.40, 54.10], [18.07, 59.33]), { name: '1648: Vorpommern bleibt schwedisch' }),
    ],
  },
];

export const breitenfeld = {
  id: 'breitenfeld',
  name: 'Breitenfeld',
  ort: 'Nördlich von Leipzig',
  datum: '17. September 1631',
  jahr: 1631,
  mitte: [12.3950, 51.4320],
  zoom: 12.4,
  grund: 'relief',
  worum: 'Zwei Ordnungen nebeneinander auf einem Feld: siebzehn Gevierthaufen von je anderthalbtausend Mann, die im Nahkampf fast unzerbrechlich sind und sich nicht drehen können – und zwei Linien aus Verbänden zu fünfhundert, mit Musketieren zwischen der Reiterei. Der Beweis kommt, als die Sachsen davonlaufen: Die schwedische Reserve baut mitten in der Schlacht eine neue Front im rechten Winkel. Mit Gevierthaufen ginge das nicht.',
  parteien,
  gelaende,
  stationen,
  ausgang: 'Die kaiserliche Linie wird von der Flanke her mit den eigenen erbeuteten Geschützen zerschossen und zerfällt bei Einbruch der Dunkelheit.',
  verluste: [
    { partei: 'kai', text: 'rund 7.600 Tote und Verwundete, gegen 6.000 Gefangene – von denen viele sofort in schwedische Dienste treten; alle schweren Geschütze' },
    { partei: 'swe', text: 'rund 2.100 Schweden, dazu etwa 3.000 Sachsen, die meisten davon auf der Flucht' },
  ],
  folgen: 'Der Krieg, der 1631 entschieden schien, dauert noch siebzehn Jahre. Gustav Adolf zieht bis München, fällt aber im November 1632 bei Lützen; Schweden bleibt trotzdem bis zum Westfälischen Frieden im Spiel und behält Vorpommern. Militärisch ist die Wirkung dauerhafter als politisch: Die Aufstellung in kleinen Verbänden mit beweglicher Regimentsartillerie wird überall nachgebaut, und der Gevierthaufen verschwindet innerhalb einer Generation aus Europa.',
  streit: 'Wie groß der Anteil der neuen Ordnung am Sieg war, wird bis heute unterschiedlich gewichtet – manche sehen den entscheidenden Punkt eher in Pappenheims eigenmächtigen Angriffen und in Tillys Entschluss, den Beschuss nicht länger auszuhalten. Auch die Zahl der Geschütze schwankt; die oft genannte dreifache Feuergeschwindigkeit ist eine Schätzung aus späteren Versuchen. Das Feld selbst ist heute überbaut und in der Nachbarschaft durch Braunkohleabbau verändert.',
};
