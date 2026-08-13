#!/usr/bin/env node
/*
 * ACHTUNG – Verhältnis zu src/data/battles/isandlwana.json: Dieses Skript hat
 * die JSON-Datei einmal erzeugt; danach ist die JSON-Datei die gültige Fassung.
 */
/**
 * Isandlwana, 22. Januar 1879.
 *
 * Eine Schlachtordnung, die es sonst in dieser Sammlung nicht gibt: die
 * Hörner des Büffels. Die Brust bindet den Gegner von vorn, zwei Hörner
 * laufen außen an ihm vorbei und schließen sich hinter ihm, die Lenden
 * bleiben mit dem Rücken zum Feld sitzen, bis sie gebraucht werden. Auf einer
 * Karte ist das unmittelbar zu lesen.
 *
 * Dagegen steht eine Feuerlinie, die zu weit vorn liegt, um vom Lager aus
 * versorgt zu werden, und zu dünn ist, um eine Front von vier Kilometern zu
 * decken. Beides zusammen ergibt an diesem Tag die schwerste Niederlage, die
 * ein europäisches Heer im 19. Jahrhundert in Afrika erleidet.
 *
 * Isandlwana liegt bei 30.65 Ost, 28.36 Süd.
 */
import { linie, klumpen, pfeil } from '../lib/stellung.mjs';

const BERG = [30.6520, -28.3590];
const LAGER = [30.6580, -28.3565];
const SCHLUCHT = [30.7250, -28.3080];

const parteien = [
  {
    id: 'bri', name: 'Großbritannien', farbe: '#6f9fe0',
    fuehrung: 'Henry Pulleine, Anthony Durnford – Lord Chelmsford ist an diesem Tag nicht da',
    staerke: 'rund 1.800 im Lager – sechs Kompanien des 24. Regiments, zwei Geschütze, Natal Native Contingent, berittene Freiwillige',
    zahl: 1800,
  },
  {
    id: 'zul', name: 'Zulureich', farbe: '#c98a4b',
    fuehrung: 'Ntshingwayo kaMahole, Mavumengwana kaNdlela',
    staerke: 'rund 20.000 – die Regimenter uKhandempemvu, uMbonambi, iNgobamakhosi, uNokhenke, dazu die uNdi-Reserve',
    zahl: 20000,
  },
];

const gelaende = [
  { art: 'hoehe', name: 'Isandlwana · der Felsen', punkte: klumpen(BERG, 0.9, 1.8, 20) },
  { art: 'hoehe', name: 'Mahlabamkhosi · die kegelförmige Kuppe', punkte: klumpen([30.6690, -28.3670], 0.5) },
  { art: 'hoehe', name: 'Die Hochfläche von Nqutu', punkte: klumpen([30.6850, -28.3250], 5.0, 1.8, 90) },
  { art: 'sumpf', name: 'Das Ngwebeni-Tal · dort lag das Heer', punkte: klumpen(SCHLUCHT, 1.4, 2.6, 60) },
  { art: 'fluss', name: 'Die Nyogane-Donga', punkte: pfeil([30.6840, -28.3380], [30.6770, -28.3520], [30.6720, -28.3660]) },
  { art: 'fluss', name: 'Der Manzimnyama', punkte: pfeil([30.6300, -28.3280], [30.6350, -28.3600], [30.6400, -28.3880]) },
  { art: 'fluss', name: 'Der Buffalo · dahinter Natal', punkte: pfeil([30.5600, -28.3050], [30.5380, -28.3450], [30.5620, -28.3920]) },
  { art: 'furt', name: 'Rorke’s Drift', punkte: klumpen([30.5350, -28.3480], 0.5) },
];

const s = (id, partei, form, gattung, punkte, mehr = {}) => ({ id, partei, form, gattung, punkte, ...mehr });

const stationen = [
  {
    zeit: 'Dezember 1878',
    t: 0,
    kurz: 'Ein Ultimatum, das niemand annehmen kann.',
    text: 'Der britische Hochkommissar Bartle Frere will das südliche Afrika zu einer Föderation zusammenfassen und braucht dafür ein Ende des Zulureiches. Er stellt Cetshwayo ein Ultimatum, das unter anderem die Auflösung des Heeres verlangt, und lässt es ohne Rückfrage in London ablaufen. Am 11. Januar 1879 überschreiten drei Kolonnen die Grenze; die mittlere geht bei Rorke’s Drift über den Buffalo.',
    uebersicht: true,
    sicht: [[27.5, -32.5], [34.5, -24.5]],
    stellungen: [
      s('anm-bri', 'bri', 'pfeil', 'gemischt', pfeil([31.03, -29.86], [30.40, -29.20], [30.53, -28.35], [30.65, -28.36]), { name: 'Die mittlere Kolonne über Rorke’s Drift' }),
      s('anm-bri2', 'bri', 'pfeil', 'gemischt', pfeil([32.30, -28.80], [31.60, -28.50], [31.00, -28.30]), { name: 'Die Küstenkolonne' }),
      s('anm-zul', 'zul', 'pfeil', 'gemischt', pfeil([31.42, -28.31], [31.10, -28.32], [30.80, -28.33], [30.68, -28.32]), { name: 'Das Zulu-Heer aus Ulundi' }),
    ],
  },
  {
    zeit: '20. Januar',
    t: 60,
    kurz: 'Ein Lager ohne Wagenburg und ohne Graben.',
    text: 'Die Kolonne schlägt am Fuß des Isandlwana ein Lager auf – anderthalb Kilometer lang, mit dem Felsen im Rücken. Die eigenen Felddienstvorschriften verlangen, die Wagen zu einer Burg zusammenzufahren oder wenigstens einen Graben auszuheben. Beides unterbleibt: Der Boden ist steinig, das Lager soll nur zwei Nächte stehen, und niemand rechnet damit, dass ein Gegner ohne Gewehre eine britische Feuerlinie erreichen könnte.',
    stellungen: [
      s('b-lager', 'bri', 'flaeche', 'gemischt', linie(LAGER, 1.6, 0.35, 90), { name: 'Das Lager am Fuß des Felsens', staerke: 'rund 1.800' }),
      s('z-heer', 'zul', 'flaeche', 'fuss', klumpen(SCHLUCHT, 1.4, 2.4, 60), { name: 'Das Zulu-Heer im Ngwebeni-Tal', staerke: 'rund 20.000' }),
    ],
  },
  {
    zeit: '22. Januar, früh',
    t: 120,
    kurz: 'Chelmsford marschiert mit der Hälfte fort.',
    text: 'Meldungen sprechen von Zulu-Verbänden im Südosten. Chelmsford bricht vor Tagesanbruch mit gut der Hälfte der Truppe dorthin auf, um die Entscheidungsschlacht zu suchen, die er seit elf Tagen sucht. Zurück bleiben unter Oberstleutnant Pulleine rund 1.300 Mann, dazu später Durnford mit berittenen Verbänden. Was Chelmsford verfolgt, ist eine Vorhut; das Heer liegt in die andere Richtung.',
    stellungen: [
      s('b-chelmsford', 'bri', 'pfeil', 'gemischt', pfeil([30.6600, -28.3620], [30.7000, -28.3900], [30.7400, -28.4150]), { name: 'Chelmsford zieht nach Südosten ab' }),
      s('b-lager', 'bri', 'flaeche', 'gemischt', linie(LAGER, 1.5, 0.35, 90), { name: 'Pulleine bleibt zurück', staerke: 'rund 1.300' }),
      s('z-heer', 'zul', 'flaeche', 'fuss', klumpen(SCHLUCHT, 1.4, 2.4, 60), { name: 'liegt unentdeckt im Tal', staerke: 'rund 20.000' }),
    ],
  },
  {
    zeit: 'Gegen elf',
    t: 180,
    kurz: 'Ein Reiter sieht in eine Schlucht und findet alles.',
    text: 'Eine berittene Patrouille verfolgt auf der Hochfläche einige Rinder bis an den Rand einer Senke – und sieht darunter, dicht an dicht und schweigend sitzend, zwanzigtausend Männer. Die Zulu greifen sofort an, obwohl der Tag als unheilvoll gilt und der Angriff für den folgenden geplant war. Von diesem Augenblick an läuft alles ohne Plan und sehr schnell.',
    stellungen: [
      s('b-patrouille', 'bri', 'pfeil', 'reiter', pfeil([30.6800, -28.3350], [30.7000, -28.3220], [30.7180, -28.3120]), { name: 'Raws Patrouille auf der Hochfläche' }),
      s('z-heer', 'zul', 'flaeche', 'fuss', klumpen(SCHLUCHT, 1.4, 2.4, 60), { name: 'wird entdeckt und tritt sofort an', staerke: 'rund 20.000' }),
      s('b-lager', 'bri', 'flaeche', 'gemischt', linie(LAGER, 1.5, 0.35, 90), { name: 'Das Lager', staerke: 'rund 1.300' }),
    ],
  },
  {
    zeit: 'Kurz darauf',
    t: 240,
    kurz: 'Die Hörner des Büffels gehen nach beiden Seiten.',
    text: 'Das Heer entfaltet sich im Laufen in die Ordnung, für die es ausgebildet ist: Die Brust – drei Regimenter – geht frontal auf das Lager zu, die beiden Hörner laufen weit außen darum herum, das linke nördlich um den Felsen, das rechte südlich um die kegelförmige Kuppe. Die Lenden, die Reserve, setzen sich mit dem Rücken zum Feld, damit der Anblick sie nicht vorzeitig in Bewegung bringt.',
    stellungen: [
      s('z-brust', 'zul', 'flaeche', 'fuss', linie([30.6980, -28.3450], 3.4, 0.9, 250), { name: 'Die Brust', staerke: 'drei Regimenter' }),
      s('z-hornL', 'zul', 'pfeil', 'fuss', pfeil([30.7050, -28.3200], [30.6700, -28.3120], [30.6300, -28.3220]), { name: 'Das linke Horn, nördlich um den Felsen' }),
      s('z-hornR', 'zul', 'pfeil', 'fuss', pfeil([30.7150, -28.3660], [30.6900, -28.3780], [30.6600, -28.3830]), { name: 'Das rechte Horn, südlich herum' }),
      s('z-reserve', 'zul', 'flaeche', 'fuss', klumpen([30.7080, -28.3300], 1.4), { name: 'Die Lenden, mit dem Rücken zum Feld' }),
      s('b-lager', 'bri', 'flaeche', 'gemischt', linie(LAGER, 1.5, 0.35, 90), { name: 'Das Lager', staerke: 'rund 1.300' }),
    ],
  },
  {
    zeit: 'Mittag',
    t: 300,
    kurz: 'Eine Feuerlinie, einen Kilometer vor dem Lager.',
    text: 'Pulleine schickt seine Kompanien einzeln nach vorn, jede dorthin, wo gerade gemeldet wird. Daraus wird ein weiter Bogen von fast vier Kilometern, an manchen Stellen mit mehreren Metern Abstand zwischen den Männern. Solange geschossen wird, hält er: Das Martini-Henry-Gewehr trifft auf vierhundert Meter, und die Zulu haben fast nur Speere. Vorn stapeln sich die Toten, und es sieht eine Weile aus wie ein Sieg.',
    stellungen: [
      s('b-links', 'bri', 'flaeche', 'fuss', linie([30.6570, -28.3400], 1.2, 0.12, 0), { name: 'Cavaye und Mostyn im Norden', staerke: 'zwei Kompanien' }),
      s('b-mitte', 'bri', 'flaeche', 'fuss', linie([30.6740, -28.3520], 1.6, 0.12, 90), { name: 'Die Feuerlinie nach Osten', staerke: 'drei Kompanien' }),
      s('b-geschuetz', 'bri', 'flaeche', 'geschuetz', klumpen([30.6710, -28.3560], 0.18), { name: 'Zwei Sieben-Pfünder' }),
      s('b-durnford', 'bri', 'flaeche', 'reiter', linie([30.6820, -28.3620], 1.0, 0.15, 90), { name: 'Durnford in der Donga', staerke: 'berittene Basotho' }),
      s('z-brust', 'zul', 'flaeche', 'fuss', linie([30.6900, -28.3480], 3.6, 1.0, 250), { name: 'Die Brust liegt im Feuer', staerke: 'drei Regimenter', geschlagen: true }),
    ],
  },
  {
    zeit: 'Gegen ein Uhr',
    t: 360,
    kurz: 'Die Munition kommt nicht bis nach vorn.',
    text: 'Die Vorräte liegen im Lager, einen Kilometer hinter der Linie, in Kisten, die man aufschrauben muss; die Quartiermeister geben nur an die eigene Einheit aus. Ob das die Entscheidung brachte, wird bis heute bestritten – unbestritten ist, dass eine Linie, die so weit vorn liegt und nur durch Feuer wirkt, in dem Augenblick wertlos wird, in dem das Feuer nachlässt.',
    stellungen: [
      s('b-mitte', 'bri', 'flaeche', 'fuss', linie([30.6740, -28.3520], 1.6, 0.12, 90), { name: 'Das Feuer lässt nach', staerke: 'drei Kompanien', geschlagen: true }),
      s('b-nachschub', 'bri', 'pfeil', 'gemischt', pfeil([30.6600, -28.3560], [30.6660, -28.3540], [30.6700, -28.3525]), { name: 'Der Nachschub kommt zu langsam' }),
      s('b-durnford', 'bri', 'flaeche', 'reiter', linie([30.6820, -28.3620], 1.0, 0.15, 90), { name: 'Durnford geht die Munition aus', geschlagen: true }),
      s('z-brust', 'zul', 'flaeche', 'fuss', linie([30.6860, -28.3490], 3.6, 1.0, 250), { name: 'Die Brust kommt wieder hoch', staerke: 'drei Regimenter' }),
      s('b-links', 'bri', 'flaeche', 'fuss', linie([30.6570, -28.3400], 1.2, 0.12, 0), { name: 'im Norden', staerke: 'zwei Kompanien' }),
    ],
  },
  {
    zeit: 'Kurz danach',
    t: 410,
    kurz: 'Der rechte Flügel geht zurück, die Flanke liegt frei.',
    text: 'Durnfords Reiter räumen die Donga und reiten zum Lager zurück. Damit hat die Feuerlinie an ihrem rechten Ende nichts mehr, woran sie sich anlehnen könnte, und die Regimenter, die dort festgehalten wurden, sind frei. Sie gehen sofort vor. Pulleine lässt zurücknehmen – und ein Rückzug in offener Ordnung vor einem Gegner, der schneller läuft als man selbst, ist das Ende der Ordnung.',
    stellungen: [
      s('b-durnford', 'bri', 'pfeil', 'reiter', pfeil([30.6810, -28.3620], [30.6700, -28.3600], [30.6620, -28.3580]), { name: 'Durnford räumt die Donga', rueckzug: true }),
      s('z-brust', 'zul', 'pfeil', 'fuss', pfeil([30.6850, -28.3520], [30.6720, -28.3540], [30.6640, -28.3560]), { name: 'Die Brust geht vor' }),
      s('b-mitte', 'bri', 'flaeche', 'fuss', linie([30.6660, -28.3540], 1.4, 0.15, 90), { name: 'Rücknahme in offener Ordnung', geschlagen: true }),
      s('b-links', 'bri', 'flaeche', 'fuss', linie([30.6580, -28.3450], 1.0, 0.14, 0), { name: 'auch der Nordflügel zurück', geschlagen: true }),
      s('z-hornL', 'zul', 'pfeil', 'fuss', pfeil([30.6350, -28.3230], [30.6280, -28.3450], [30.6330, -28.3680]), { name: 'Das linke Horn läuft weiter' }),
    ],
  },
  {
    zeit: 'Gegen halb zwei',
    t: 460,
    kurz: 'Das linke Horn schließt hinter dem Lager.',
    text: 'Das linke Horn ist inzwischen westlich um den Felsen herum und steht hinter dem Lager, auf dem Weg nach Rorke’s Drift. Damit ist der Ring geschlossen, und niemand kommt mehr auf der Straße heraus. Was im Lager kämpft, kämpft in Gruppen zwischen Zelten und Wagen: kleine Karrees, dann Rücken an Rücken, dann einzeln.',
    stellungen: [
      s('z-hornL', 'zul', 'flaeche', 'fuss', linie([30.6360, -28.3620], 2.0, 0.9, 90), { name: 'Das linke Horn hinter dem Lager', staerke: 'geschlossen' }),
      s('z-hornR', 'zul', 'flaeche', 'fuss', linie([30.6620, -28.3800], 2.0, 0.9, 0), { name: 'Das rechte Horn von Süden' }),
      s('z-brust', 'zul', 'flaeche', 'fuss', linie([30.6680, -28.3560], 3.0, 1.0, 250), { name: 'Die Brust im Lager', staerke: 'drei Regimenter' }),
      s('b-lager', 'bri', 'flaeche', 'gemischt', klumpen(LAGER, 1.0, 1.4, 90), { name: 'Kämpfe zwischen den Zelten', staerke: 'was übrig ist', geschlagen: true }),
    ],
  },
  {
    zeit: '14.29 Uhr',
    t: 510,
    kurz: 'Der Tag, an dem die Sonne verdunkelt wird.',
    text: 'Mitten in den letzten Gefechten schiebt sich der Mond vor die Sonne – eine partielle Finsternis, die den Nachmittag verdüstert; die Zulu nennen den Tag danach den Tag des toten Mondes. Die letzten Gruppen des 24. Regiments fallen am Fuß des Felsens. Zwei Offiziere versuchen, die Fahne über den Buffalo zu retten, und ertrinken dabei; das Tuch wird zehn Tage später aus dem Fluss gezogen.',
    stellungen: [
      s('b-lager', 'bri', 'flaeche', 'gemischt', klumpen([30.6540, -28.3580], 0.5, 1.4, 20), { name: 'Die letzten Gruppen am Felsen', staerke: 'Reste', geschlagen: true }),
      s('b-flucht', 'bri', 'pfeil', 'gemischt', pfeil([30.6450, -28.3640], [30.6000, -28.3720], [30.5620, -28.3860]), { name: 'Flucht zur Furt der Flüchtigen', rueckzug: true }),
      s('z-verfolg', 'zul', 'pfeil', 'fuss', pfeil([30.6350, -28.3660], [30.5980, -28.3760], [30.5680, -28.3880]), { name: 'Verfolgung bis an den Fluss' }),
      s('z-brust', 'zul', 'flaeche', 'fuss', linie([30.6600, -28.3580], 2.6, 1.0, 250), { name: 'Das Feld', staerke: 'drei Regimenter' }),
    ],
  },
  {
    zeit: 'Am selben Abend',
    t: 570,
    kurz: 'Am selben Abend brennt Rorke’s Drift.',
    text: 'Die Reserve, die den ganzen Tag mit dem Rücken zum Feld gesessen hat und nichts abbekommen hat, geht ohne Befehl über den Buffalo und greift den Nachschubposten bei Rorke’s Drift an: viertausend gegen einhundertfünfzig. Die Station hält die Nacht durch. Für die britische Öffentlichkeit wird sie zur Hauptsache, und elf Victoria-Kreuze – die höchste Zahl für ein einziges Gefecht – helfen dabei, über den Vormittag hinwegzukommen.',
    stellungen: [
      s('z-reserve', 'zul', 'pfeil', 'fuss', pfeil([30.6300, -28.3450], [30.5800, -28.3480], [30.5420, -28.3480]), { name: 'Die Reserve geht über den Fluss' }),
      s('b-rorke', 'bri', 'flaeche', 'fuss', klumpen([30.5350, -28.3480], 0.35), { name: 'Rorke’s Drift · 150 Mann', staerke: '150' }),
      s('z-brust', 'zul', 'flaeche', 'fuss', linie([30.6600, -28.3580], 2.6, 1.0, 250), { name: 'Das Feld von Isandlwana', staerke: 'rund 20.000' }),
      s('b-chelmsford', 'bri', 'pfeil', 'gemischt', pfeil([30.7300, -28.4050], [30.6950, -28.3800], [30.6650, -28.3620]), { name: 'Chelmsford kehrt in der Nacht zurück' }),
    ],
  },
  {
    zeit: 'Nach dem 22. Januar',
    t: 650,
    kurz: 'Sechs Monate später ist das Zulureich zerlegt.',
    text: 'London schickt Verstärkungen, mit denen niemand gerechnet hätte, wenn die Kolonne nicht untergegangen wäre. Im Juli 1879 wird das Zulu-Heer bei Ulundi in offener Feldschlacht von einem Karree mit Gatling-Geschützen zerschossen; Cetshwayo wird gefangen und das Reich in dreizehn Häuptlingsgebiete zerlegt, die sich gegenseitig bekriegen. Isandlwana bleibt trotzdem der Bezugspunkt: der Beweis, dass eine europäische Armee zu schlagen ist.',
    uebersicht: true,
    sicht: [[24.8, -35.5], [36.5, -22.5]],
    stellungen: [
      s('bri-ulundi', 'bri', 'pfeil', 'gemischt', pfeil([30.53, -28.35], [30.90, -28.34], [31.42, -28.31]), { name: 'Juli 1879: Ulundi' }),
      s('bri-verstaerkung', 'bri', 'pfeil', 'schiff', pfeil([31.03, -29.86], [30.40, -30.60], [28.20, -31.50], [30.20, -29.30]), { name: 'Verstärkungen über Durban' }),
      s('zul-teilung', 'zul', 'pfeil', 'gemischt', pfeil([31.42, -28.31], [31.90, -28.00], [32.30, -27.60]), { name: 'Das Reich wird in dreizehn Gebiete zerlegt' }),
      s('zul-vorbild', 'zul', 'pfeil', 'gemischt', pfeil([30.65, -28.36], [30.00, -26.20], [28.05, -26.20], [26.20, -29.10]), { name: 'Der Bezugspunkt bleibt' }),
    ],
  },
];

export const isandlwana = {
  id: 'isandlwana',
  name: 'Isandlwana',
  ort: 'Zululand, am Fuß des Felsens',
  datum: '22. Januar 1879',
  jahr: 1879,
  mitte: [30.6600, -28.3500],
  zoom: 11.6,
  grund: 'relief',
  worum: 'Eine Schlachtordnung, die man auf einer Karte unmittelbar lesen kann: die Brust bindet von vorn, zwei Hörner laufen außen herum und schließen sich hinter dem Gegner, die Lenden sitzen als Reserve mit dem Rücken zum Feld. Dagegen steht eine Feuerlinie von vier Kilometern, die zu weit vor dem Lager liegt, um versorgt zu werden – und die in dem Augenblick wertlos wird, in dem das Feuer nachlässt.',
  parteien,
  gelaende,
  stationen,
  ausgang: 'Das Lager wird überrannt; von den rund 1.800 Zurückgebliebenen überleben etwa 350, fast nur Berittene und Angehörige des Natal Native Contingent.',
  verluste: [
    { partei: 'bri', text: 'rund 1.300 Tote, darunter 52 Offiziere und fünf Kompanien des 24. Regiments vollständig; beide Geschütze' },
    { partei: 'zul', text: 'rund 1.000 bis 2.000 Tote und eine weit größere Zahl Verwundeter, die meisten davon in den folgenden Wochen gestorben' },
  ],
  folgen: 'Die Niederlage bewirkt das Gegenteil dessen, was sie hätte bewirken können: London schickt Verstärkungen in einer Größenordnung, die vorher nicht durchsetzbar gewesen wäre. Im Juli 1879 wird das Zulu-Heer bei Ulundi im offenen Feld zusammengeschossen, Cetshwayo gefangen und das Reich in dreizehn gegeneinander gestellte Häuptlingsgebiete zerlegt; 1887 wird es britische Kolonie. Bartle Frere, der den Krieg ohne Rückendeckung Londons begonnen hatte, wird gerügt und bleibt im Amt.',
  streit: 'Die Munitionsfrage ist der Dauerstreit: Ob die schwer zu öffnenden Kisten und die Zuteilung nach Einheiten den Zusammenbruch verursachten oder ob die zu weit ausgedehnte Linie ohnehin nicht zu halten war, wird seit hundert Jahren verhandelt; die Ausgrabungen der letzten Jahrzehnte sprechen eher für Letzteres. Auch der Anteil Durnfords und Pulleines an der Verantwortung wurde nie geklärt – beide fielen, und Chelmsford, der überlebte, hatte ein Interesse daran, dass es so blieb. Die Zulu-Verluste sind Schätzungen.',
};
