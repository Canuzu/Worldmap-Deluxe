#!/usr/bin/env node
/*
 * ACHTUNG – Verhältnis zu src/data/battles/alesia.json: Dieses Skript hat die
 * JSON-Datei einmal erzeugt; danach ist die JSON-Datei die gültige Fassung.
 */
/**
 * Alesia, September 52 v. Chr.
 *
 * Die Schlacht, die man nur als Karte verstehen kann, weil sie aus zwei
 * Kreisen besteht. Caesar schließt Vercingetorix auf dem Plateau ein und baut
 * dafür einen Wall von fünfzehn Kilometern – die Kontravallation, nach innen
 * gerichtet. Dann erfährt er, dass ganz Gallien ein Entsatzheer aufstellt, und
 * baut einen zweiten Wall von einundzwanzig Kilometern um den ersten herum,
 * nach außen gerichtet.
 *
 * Zwischen beiden liegt sein Heer, in einem Ring von wenigen hundert Metern
 * Breite. Er belagert und wird belagert, gleichzeitig, mit derselben Truppe.
 * Wer die beiden Kreise sieht, weiß, warum die Sache mehrfach hätte kippen
 * können – und warum die entscheidende Stelle die einzige ist, an der der Wall
 * nicht ganz geschlossen war.
 *
 * Alise-Sainte-Reine liegt bei 4.50 Ost, 47.54 Nord.
 */
import { linie, klumpen, pfeil } from '../lib/stellung.mjs';

const PLATEAU = [4.4980, 47.5370];
const LAGER_N = [4.4800, 47.5600];
const SCHWACHSTELLE = [4.4700, 47.5480];

const parteien = [
  {
    id: 'rom', name: 'Rom', farbe: '#6f9fe0',
    fuehrung: 'Gaius Iulius Caesar, Titus Labienus',
    staerke: '12 Legionen, rund 50.000, dazu germanische Reiterei', zahl: 50000,
  },
  {
    id: 'gal', name: 'Gallischer Bund', farbe: '#d4737c',
    fuehrung: 'Vercingetorix, Commius',
    staerke: '80.000 in der Stadt, Entsatzheer über 100.000', zahl: 180000,
  },
];

const gelaende = [
  { art: 'hoehe', name: 'Plateau von Alesia', punkte: klumpen(PLATEAU, 2.6, 1.5, 100) },
  { art: 'hoehe', name: 'Mont Réa', punkte: klumpen([4.4630, 47.5520], 1.6, 1.3, 60) },
  { art: 'fluss', name: 'Ose', punkte: pfeil([4.4550, 47.5560], [4.4900, 47.5540], [4.5300, 47.5480]) },
  { art: 'fluss', name: 'Oserain', punkte: pfeil([4.4600, 47.5230], [4.5000, 47.5250], [4.5400, 47.5300]) },
  { art: 'mauer', name: 'Kontravallation · 15 km', punkte: klumpen(PLATEAU, 5.2, 1.15, 100) },
  { art: 'mauer', name: 'Circumvallation · 21 km', punkte: klumpen(PLATEAU, 7.6, 1.15, 100) },
];

const s = (id, partei, form, gattung, punkte, mehr = {}) => ({ id, partei, form, gattung, punkte, ...mehr });

const stationen = [
  {
    zeit: 'Sommer 52',
    t: 0,
    kurz: 'Ein Aufstand, der fast ganz Gallien erfasst.',
    text: 'Vercingetorix hat die Stämme geeint und Caesar bei Gergovia zum ersten Mal geschlagen. Danach macht er den Fehler, mit seiner Reiterei eine römische Marschkolonne anzugreifen – die germanischen Reiter in römischem Sold werfen ihn. Er weicht in die Höhenfestung Alesia aus und hofft, dort das ganze Land zum Entsatz zu rufen.',
    uebersicht: true,
    sicht: [[-1.5, 43.2], [8.4, 50.4]],
    stellungen: [
      s('anm-gal', 'gal', 'pfeil', 'reiter', pfeil([3.09, 45.78], [3.80, 46.60], [4.50, 47.53]), { name: 'Vercingetorix nach Alesia' }),
      s('anm-rom', 'rom', 'pfeil', 'gemischt', pfeil([5.04, 47.32], [4.75, 47.45], [4.53, 47.54]), { name: 'Caesar folgt' }),
      s('anm-entsatz', 'gal', 'pfeil', 'gemischt', pfeil([1.90, 47.90], [3.20, 47.70], [4.35, 47.56]), { name: 'Aufgebot aus ganz Gallien' }),
    ],
  },
  {
    zeit: 'Ende Juli',
    t: 120,
    kurz: 'Fünfzehn Kilometer Wall nach innen.',
    text: 'Statt zu stürmen, gräbt Caesar. In wenigen Wochen entsteht ein geschlossener Ring um das Plateau: Doppelgraben, Wall, Palisade, dreiundzwanzig Kastelle, davor Fallgruben mit angespitzten Pfählen, die die Legionäre nach den Grabsteinen „Lilien“ nennen. Achtzigtausend Menschen auf dem Plateau sind damit eingeschlossen – samt der Bevölkerung der Stadt.',
    stellungen: [
      s('g-plateau', 'gal', 'flaeche', 'gemischt', klumpen(PLATEAU, 2.4, 1.4, 100), { name: 'Vercingetorix auf dem Plateau', staerke: '80.000' }),
      s('r-ring', 'rom', 'flaeche', 'fuss', klumpen(PLATEAU, 5.0, 1.15, 100), { name: 'Kontravallation · 15 km', staerke: '12 Legionen' }),
      s('r-lager', 'rom', 'flaeche', 'gemischt', klumpen(LAGER_N, 1.2), { name: 'Nordlager', staerke: '2 Legionen' }),
    ],
  },
  {
    zeit: 'August',
    t: 240,
    kurz: 'Und einundzwanzig Kilometer nach außen.',
    text: 'Vercingetorix’ Reiterei ist vor der Schließung des Rings ausgebrochen und hat die Stämme aufgerufen. Caesar erfährt davon von Überläufern – und baut daraufhin einen zweiten Wall, außen um den ersten. Sein Heer liegt danach in einem Streifen zwischen zwei Befestigungen. Nach innen fünfzehn, nach außen einundzwanzig Kilometer, dazwischen fünfzigtausend Mann.',
    stellungen: [
      s('r-ring', 'rom', 'flaeche', 'fuss', klumpen(PLATEAU, 5.0, 1.15, 100), { name: 'Kontravallation', staerke: 'nach innen' }),
      s('r-aussen', 'rom', 'flaeche', 'fuss', klumpen(PLATEAU, 7.4, 1.15, 100), { name: 'Circumvallation', staerke: 'nach außen' }),
      s('g-plateau', 'gal', 'flaeche', 'gemischt', klumpen(PLATEAU, 2.4, 1.4, 100), { name: 'auf dem Plateau', staerke: '80.000' }),
      s('r-lager', 'rom', 'flaeche', 'gemischt', klumpen(LAGER_N, 1.2), { name: 'Nordlager · Mont Réa', staerke: '2 Legionen' }),
    ],
  },
  {
    zeit: 'Anfang September',
    t: 360,
    kurz: 'In der Stadt wird der Hunger zur Entscheidung.',
    text: 'Das Getreide geht aus. Der Kriegsrat der Gallier beschließt, die Bevölkerung der Stadt hinauszuschicken – Frauen, Kinder, Alte –, um die Vorräte zu strecken. Caesar lässt sie nicht durch seine Linien. Sie bleiben zwischen Stadtmauer und römischem Wall liegen. Beide Seiten schreiben darüber, keine kommt gut dabei weg.',
    stellungen: [
      s('g-plateau', 'gal', 'flaeche', 'gemischt', klumpen(PLATEAU, 2.2, 1.4, 100), { name: 'Hunger auf dem Plateau', staerke: '80.000', geschlagen: true }),
      s('g-vertrieben', 'gal', 'flaeche', 'fuss', linie([4.5100, 47.5310], 1.2, 0.4, 180), { name: 'Die Hinausgeschickten', staerke: 'Stadtbevölkerung', geschlagen: true }),
      s('r-ring', 'rom', 'flaeche', 'fuss', klumpen(PLATEAU, 5.0, 1.15, 100), { name: 'lässt niemanden durch', staerke: '12 Legionen' }),
    ],
  },
  {
    zeit: 'Der Entsatz trifft ein',
    t: 420,
    kurz: 'Von außen ein Heer, das man nicht zählen kann.',
    text: 'Das gallische Aufgebot erreicht Alesia und lagert auf den Höhen im Westen. Caesar nennt eine Viertelmillion – eine Zahl, die niemand glaubt, die aber den Eindruck wiedergibt. Von diesem Augenblick an steht das römische Heer zwischen zwei Feinden, die nur noch zusammenwirken müssen.',
    stellungen: [
      s('g-entsatz', 'gal', 'flaeche', 'gemischt', klumpen([4.4350, 47.5450], 3.4, 1.3, 20), { name: 'Entsatzheer im Westen', staerke: 'über 100.000' }),
      s('r-aussen', 'rom', 'flaeche', 'fuss', klumpen(PLATEAU, 7.4, 1.15, 100), { name: 'Circumvallation', staerke: 'nach außen' }),
      s('r-ring', 'rom', 'flaeche', 'fuss', klumpen(PLATEAU, 5.0, 1.15, 100), { name: 'Kontravallation', staerke: 'nach innen' }),
      s('g-plateau', 'gal', 'flaeche', 'gemischt', klumpen(PLATEAU, 2.2, 1.4, 100), { name: 'auf dem Plateau', staerke: '80.000' }),
    ],
  },
  {
    zeit: 'Erster Tag',
    t: 480,
    kurz: 'Reitergefecht in der Ebene, von beiden Wällen aus zu sehen.',
    text: 'Der erste Versuch ist ein Reitergefecht in der Ebene südlich der Werke, mit Zuschauern auf beiden Wällen. Es dauert bis zum Abend und wird von den germanischen Reitern in römischem Sold entschieden – dieselben, die Vercingetorix vor Wochen nach Alesia getrieben hatten.',
    stellungen: [
      s('g-reiter', 'gal', 'flaeche', 'reiter', linie([4.4820, 47.5170], 2.6, 0.7, 20), { name: 'Gallische Reiterei', staerke: '15.000' }),
      s('r-germanen', 'rom', 'flaeche', 'reiter', linie([4.4920, 47.5120], 2.2, 0.7, 200), { name: 'Germanische Reiterei', staerke: '5.000' }),
      s('r-stossR', 'rom', 'pfeil', 'reiter', pfeil([4.4900, 47.5130], [4.4840, 47.5175]), {}),
      s('g-plateau', 'gal', 'flaeche', 'gemischt', klumpen(PLATEAU, 2.2, 1.4, 100), { name: 'sieht zu', staerke: '80.000' }),
      s('g-entsatz', 'gal', 'flaeche', 'gemischt', klumpen([4.4350, 47.5450], 3.4, 1.3, 20), { name: 'Entsatzheer', staerke: 'über 100.000' }),
    ],
  },
  {
    zeit: 'Zweite Nacht',
    t: 540,
    kurz: 'Ein Nachtangriff von beiden Seiten gleichzeitig.',
    text: 'Um Mitternacht greift das Entsatzheer den Außenwall an, und Vercingetorix stößt gleichzeitig von innen gegen den Innenwall. Genau das ist der Fall, für den zwei Wälle gebaut wurden – und genau der, den ein Heer im Streifen dazwischen am schwersten aushält. Die Legionen halten, aber es wird knapp.',
    stellungen: [
      s('g-entsatz', 'gal', 'pfeil', 'gemischt', pfeil([4.4400, 47.5420], [4.4620, 47.5400], [4.4760, 47.5390]), { name: 'Angriff von außen' }),
      s('g-plateau', 'gal', 'pfeil', 'gemischt', pfeil([4.5000, 47.5390], [4.5100, 47.5400], [4.5220, 47.5410]), { name: 'Ausfall von innen' }),
      s('r-aussen', 'rom', 'flaeche', 'fuss', klumpen(PLATEAU, 7.4, 1.15, 100), { name: 'Circumvallation hält', staerke: 'nach außen' }),
      s('r-ring', 'rom', 'flaeche', 'fuss', klumpen(PLATEAU, 5.0, 1.15, 100), { name: 'Kontravallation hält', staerke: 'nach innen' }),
    ],
  },
  {
    zeit: 'Dritter Tag, Mittag',
    t: 600,
    kurz: 'Die eine Stelle, an der der Wall nicht schließt.',
    text: 'Ein gallischer Verwandter des Vercingetorix hat die Werke ausgekundschaftet und die Schwachstelle gefunden: Am Nordhang des Mont Réa ließ sich der Wall wegen des Geländes nicht ganz durchziehen. Dorthin führt Vercassivellaunus sechzigtausend Mann, während der Rest überall sonst angreift, um Caesar zu binden. Das römische Nordlager gerät ins Wanken.',
    stellungen: [
      s('g-vercass', 'gal', 'flaeche', 'gemischt', linie([4.4640, 47.5560], 2.4, 0.9, 140), { name: 'Vercassivellaunus · 60.000', staerke: '60.000' }),
      s('g-stossN', 'gal', 'pfeil', 'gemischt', pfeil([4.4620, 47.5570], [4.4740, 47.5540], [4.4800, 47.5520]), { name: 'auf die Schwachstelle' }),
      s('r-lager', 'rom', 'flaeche', 'gemischt', klumpen(LAGER_N, 1.2), { name: 'Nordlager unter Druck', staerke: '2 Legionen', geschlagen: true }),
      s('g-plateau', 'gal', 'pfeil', 'gemischt', pfeil([4.5000, 47.5400], [4.5130, 47.5420]), { name: 'Ausfall von innen' }),
      s('g-entsatz', 'gal', 'flaeche', 'gemischt', klumpen([4.4400, 47.5300], 3.0, 1.3, 20), { name: 'bindet überall sonst', staerke: '50.000' }),
    ],
  },
  {
    zeit: 'Dritter Tag, Nachmittag',
    t: 660,
    kurz: 'Caesar reitet selbst hin – im roten Mantel.',
    text: 'Caesar schickt erst Labienus mit sechs Kohorten, dann weitere, und reitet schließlich selbst an die bedrohte Stelle. Sein roter Feldherrnmantel ist von beiden Seiten zu sehen; die Legionen wissen, dass er da ist. Gleichzeitig führt er die letzte Reiterei außen um die eigenen Werke herum und fällt Vercassivellaunus in den Rücken. Das entscheidet den Tag.',
    stellungen: [
      s('r-caesar', 'rom', 'pfeil', 'gemischt', pfeil([4.4900, 47.5480], [4.4820, 47.5520], [4.4760, 47.5540]), { name: 'Caesar zur Schwachstelle' }),
      s('r-reiterUm', 'rom', 'pfeil', 'reiter', pfeil([4.4980, 47.5680], [4.4780, 47.5700], [4.4620, 47.5620]), { name: 'Reiterei außen herum in den Rücken' }),
      s('g-vercass', 'gal', 'flaeche', 'gemischt', linie([4.4680, 47.5550], 2.2, 0.9, 140), { name: 'zwischen zwei Fronten', staerke: '60.000', geschlagen: true }),
      s('r-lager', 'rom', 'flaeche', 'gemischt', klumpen(LAGER_N, 1.2), { name: 'Nordlager hält', staerke: '2 Legionen' }),
      s('g-entsatz', 'gal', 'pfeil', 'gemischt', pfeil([4.4450, 47.5350], [4.4200, 47.5300], [4.3900, 47.5250]), { name: 'Entsatzheer löst sich', rueckzug: true }),
    ],
  },
  {
    zeit: 'Am nächsten Tag',
    t: 720,
    kurz: 'Vercingetorix legt die Waffen vor Caesars Sitz nieder.',
    text: 'Das Entsatzheer zerstreut sich in der Nacht. Am Morgen lässt Vercingetorix seine Führer zusammenrufen und stellt es ihnen frei, ihn zu töten oder auszuliefern. Er reitet dann in vollem Schmuck aus der Stadt, umrundet Caesars Sitz einmal und legt die Waffen nieder. Sechs Jahre später wird er in Rom im Triumphzug mitgeführt und danach erdrosselt.',
    stellungen: [
      s('g-plateau', 'gal', 'flaeche', 'gemischt', klumpen(PLATEAU, 2.0, 1.4, 100), { name: 'Übergabe', staerke: '80.000', geschlagen: true }),
      s('r-ring', 'rom', 'flaeche', 'fuss', klumpen(PLATEAU, 5.0, 1.15, 100), { name: 'Kontravallation', staerke: '12 Legionen' }),
      s('g-abzug', 'gal', 'pfeil', 'gemischt', pfeil([4.4400, 47.5400], [4.3800, 47.5300], [4.3000, 47.5200]), { name: 'Reste des Entsatzheers', rueckzug: true }),
    ],
  },
  {
    zeit: 'Nach 52 v. Chr.',
    t: 840,
    kurz: 'Gallien wird römisch, und Caesar wird zu mächtig.',
    text: 'Der Aufstand bricht zusammen; Gallien ist erobert und bleibt fünf Jahrhunderte römisch. Für Rom selbst hat der Sieg eine zweite Folge: Caesar hat jetzt ein erprobtes Heer, das ihm persönlich ergeben ist, und Ruhm, mit dem im Senat niemand mithalten kann. Drei Jahre später geht er über den Rubikon.',
    uebersicht: true,
    sicht: [[-5.5, 39.5], [15.5, 51.5]],
    stellungen: [
      s('r-gallien', 'rom', 'pfeil', 'gemischt', pfeil([4.50, 47.54], [2.35, 48.86], [-0.60, 44.84], [4.85, 45.75]), { name: 'Gallien wird Provinz' }),
      s('r-rubikon', 'rom', 'pfeil', 'gemischt', pfeil([4.50, 47.30], [7.70, 45.07], [12.25, 44.10], [12.48, 41.90]), { name: '49 v. Chr.: über den Rubikon nach Rom' }),
    ],
  },
];

export const alesia = {
  id: 'alesia',
  name: 'Alesia',
  ort: 'Alise-Sainte-Reine, Burgund',
  datum: 'September 52 v. Chr.',
  jahr: -1,
  mitte: [4.4930, 47.5420],
  zoom: 12.3,
  grund: 'relief',
  worum: 'Zwei Kreise: fünfzehn Kilometer Wall nach innen gegen die Eingeschlossenen, einundzwanzig nach außen gegen das Entsatzheer – und dazwischen, in einem Streifen von wenigen hundert Metern, das römische Heer. Caesar belagert und wird belagert, gleichzeitig, mit derselben Truppe.',
  parteien,
  gelaende,
  stationen,
  ausgang: 'Das Entsatzheer wird geworfen und zerstreut sich; Vercingetorix ergibt sich am folgenden Tag. Der gallische Aufstand bricht zusammen.',
  verluste: [
    { partei: 'gal', text: 'das Heer auf dem Plateau gefangen, das Entsatzheer zerstreut – Zahlen nur bei Caesar selbst' },
    { partei: 'rom', text: 'nicht überliefert; Caesar nennt keine' },
  ],
  folgen: 'Gallien wird römische Provinz und bleibt es fünf Jahrhunderte. Caesar hat danach ein ihm persönlich ergebenes Heer und einen Ruhm, gegen den im Senat niemand ankommt – 49 v. Chr. überschreitet er den Rubikon. Vercingetorix wird 46 v. Chr. im Triumphzug mitgeführt und hingerichtet.',
  streit: 'Der Ort war bis ins 20. Jahrhundert umstritten; die Ausgrabungen bei Alise-Sainte-Reine gelten heute als gesichert. Die Zahlen stammen sämtlich aus Caesars eigenem Bericht und sind Kriegspropaganda: Ein Entsatzheer von einer Viertelmillion Mann hätte sich in dieser Landschaft nicht ernähren können.',
};
