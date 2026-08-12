#!/usr/bin/env node
/*
 * ACHTUNG – Verhältnis zu src/data/battles/ayacucho.json: Dieses Skript hat
 * die JSON-Datei einmal erzeugt; danach ist die JSON-Datei die gültige Fassung.
 */
/**
 * Ayacucho, 9. Dezember 1824.
 *
 * Ein kleines Schlachtfeld für ein großes Ergebnis: eine Hochebene von
 * anderthalb Kilometern Länge auf 3.300 Metern, darüber ein Bergrücken. Auf
 * dem Rücken steht das königliche Heer, auf der Ebene das der Unabhängigen,
 * und beide sind so nah beieinander, dass die Offiziere sich am Vorabend
 * zwischen den Linien treffen – viele von ihnen sind Nachbarn, manche
 * verwandt.
 *
 * Der Fehler, der alles entscheidet, ist auf der Karte zu sehen: Wer vom
 * Rücken herabsteigt, kommt unten in Kolonnen an, nacheinander, und muss
 * sich erst entfalten. Genau diesen Augenblick nutzt Córdova.
 *
 * Die Pampa de la Quinua liegt bei 74.14 West, 13.05 Süd.
 */
import { linie, klumpen, pfeil } from '../lib/stellung.mjs';

const PAMPA = [-74.1420, -13.0560];
const CONDORCUNCA = [-74.1310, -13.0430];

const parteien = [
  {
    id: 'pat', name: 'Das vereinigte Befreiungsheer', farbe: '#6f9fe0',
    fuehrung: 'Antonio José de Sucre, José María Córdova, José de La Mar, Jacinto Lara, Guillermo Miller',
    staerke: 'rund 5.800 aus Kolumbien, Peru, Argentinien, Chile und Irland – ein einziges Geschütz',
    zahl: 5800,
  },
  {
    id: 'rea', name: 'Königliches Heer Perus', farbe: '#d4737c',
    fuehrung: 'Vizekönig José de la Serna, José de Canterac, Jerónimo Valdés, Juan Antonio Monet',
    staerke: 'rund 6.900, überwiegend in Peru geworben – elf Geschütze',
    zahl: 6900,
  },
];

const gelaende = [
  { art: 'hoehe', name: 'Condorcunca · der Hals des Kondors', punkte: klumpen(CONDORCUNCA, 1.1, 3.2, 130) },
  { art: 'stadt', name: 'Quinua', punkte: klumpen([-74.1370, -13.0620], 0.5) },
  { art: 'fluss', name: 'Die Quebrada im Westen', punkte: pfeil([-74.1560, -13.0390], [-74.1530, -13.0530], [-74.1500, -13.0680]) },
  { art: 'weg', name: 'Der Weg nach Huamanga', punkte: pfeil([-74.1440, -13.0650], [-74.1600, -13.0780], [-74.1800, -13.0900]) },
];

const s = (id, partei, form, gattung, punkte, mehr = {}) => ({ id, partei, form, gattung, punkte, ...mehr });

const stationen = [
  {
    zeit: 'August bis November 1824',
    t: 0,
    kurz: 'Nach Junín bleibt noch ein Heer in den Anden.',
    text: 'Bolívar hat im August bei Junín gewonnen, einer Reiterschlacht ohne einen einzigen Schuss, und ist danach vom Kongress in Bogotá zurückgerufen worden. Das Kommando übernimmt Sucre, achtundzwanzig Jahre alt. Ihm gegenüber steht der Vizekönig selbst mit dem letzten geschlossenen Heer Spaniens auf dem Kontinent – zahlreicher, besser versorgt und im eigenen Land. In Oberperu hat sich General Olañeta gegen den Vizekönig erhoben und bindet weitere Truppen.',
    uebersicht: true,
    sicht: [[-81.5, -21.0], [-64.5, -4.0]],
    stellungen: [
      s('anm-pat', 'pat', 'pfeil', 'gemischt', pfeil([-79.03, -8.11], [-77.50, -9.90], [-76.10, -11.10], [-74.22, -12.70], [-74.14, -13.05]), { name: 'Sucre von Norden über Junín' }),
      s('anm-rea', 'rea', 'pfeil', 'gemischt', pfeil([-71.97, -13.53], [-73.20, -13.30], [-74.22, -13.20], [-74.14, -13.06]), { name: 'Der Vizekönig aus Cusco' }),
      s('anm-ola', 'rea', 'pfeil', 'gemischt', pfeil([-65.75, -19.58], [-67.20, -18.50], [-68.15, -16.50]), { name: 'Olañetas Aufstand in Oberperu' }),
    ],
  },
  {
    zeit: 'Die Wochen davor',
    t: 60,
    kurz: 'Sechs Wochen umkreisen sich zwei Heere im Gebirge.',
    text: 'Was dem 9. Dezember vorausgeht, ist ein Marsch ohne Schlacht: zwei Heere, die einander in den Andentälern nachlaufen, Flüsse überschreiten, Höhen tauschen und sich gegenseitig die Verpflegung wegnehmen. Sucre verliert dabei einen Viertel seiner Leute an Erschöpfung und Fahnenflucht. Am 8. Dezember gelingt es La Serna, ihm den Rückweg zu verlegen. Von da an muss gekämpft werden.',
    stellungen: [
      s('p-heer', 'pat', 'flaeche', 'gemischt', klumpen([-74.1450, -13.0600], 1.4, 1.3, 90), { name: 'Sucre auf der Pampa', staerke: '5.800' }),
      s('r-heer', 'rea', 'flaeche', 'gemischt', linie(CONDORCUNCA, 2.6, 0.7, 225), { name: 'Der Vizekönig auf dem Condorcunca', staerke: '6.900' }),
    ],
  },
  {
    zeit: 'Abend des 8. Dezember',
    t: 130,
    kurz: 'Offiziere beider Seiten reden zwischen den Linien.',
    text: 'Die Vorposten liegen so nah, dass man einander zurufen kann. Offiziere gehen zwischen die Linien und begrüßen sich; viele kennen sich, einige sind Brüder oder Vettern. Man spricht dieselbe Sprache, viele haben in derselben Armee angefangen. Dann geht jeder zurück, und am nächsten Morgen schießen sie aufeinander.',
    stellungen: [
      s('p-heer', 'pat', 'flaeche', 'gemischt', klumpen([-74.1450, -13.0590], 1.4, 1.3, 90), { name: 'Die Vorposten unten', staerke: '5.800' }),
      s('r-heer', 'rea', 'flaeche', 'gemischt', linie(CONDORCUNCA, 2.6, 0.7, 225), { name: 'Die Vorposten oben', staerke: '6.900' }),
    ],
  },
  {
    zeit: '9. Dezember, Morgen',
    t: 200,
    kurz: 'Unten die Ebene, oben der Bergrücken.',
    text: 'Sucre stellt auf der Ebene auf: rechts die kolumbianische Division Córdovas, links die peruanische La Mars, dahinter die Reserve unter Lara und die Reiterei Millers. Oben auf dem Condorcunca steht das königliche Heer in ganzer Breite mit elf Geschützen. Sucre reitet die Front ab und sagt den bekannten Satz: Von den Anstrengungen dieses Tages hänge das Schicksal Südamerikas ab.',
    stellungen: [
      s('p-cordova', 'pat', 'flaeche', 'fuss', linie([-74.1370, -13.0620], 1.0, 0.3, 45), { name: 'Córdova rechts', staerke: 'Kolumbianer' }),
      s('p-lamar', 'pat', 'flaeche', 'fuss', linie([-74.1500, -13.0510], 1.0, 0.3, 45), { name: 'La Mar links', staerke: 'Peruaner' }),
      s('p-lara', 'pat', 'flaeche', 'fuss', linie([-74.1450, -13.0600], 1.2, 0.3, 45), { name: 'Lara mit der Reserve' }),
      s('p-miller', 'pat', 'flaeche', 'reiter', klumpen([-74.1410, -13.0650], 0.7), { name: 'Miller mit der Reiterei', staerke: 'Grenadiere und Husaren' }),
      s('r-valdes', 'rea', 'flaeche', 'gemischt', linie([-74.1400, -13.0410], 1.1, 0.35, 225), { name: 'Valdés auf dem rechten Flügel', staerke: 'mit der Artillerie' }),
      s('r-monet', 'rea', 'flaeche', 'fuss', linie([-74.1320, -13.0450], 1.1, 0.35, 225), { name: 'Monet in der Mitte' }),
      s('r-villalobos', 'rea', 'flaeche', 'fuss', linie([-74.1250, -13.0500], 1.0, 0.35, 225), { name: 'Villalobos links' }),
      s('r-serna', 'rea', 'flaeche', 'gemischt', klumpen([-74.1290, -13.0390], 0.8), { name: 'Der Vizekönig mit der Reserve' }),
    ],
  },
  {
    zeit: 'Gegen 10 Uhr',
    t: 260,
    kurz: 'Die Königlichen steigen vom Berg herunter.',
    text: 'Statt oben zu bleiben und die Ebene unter Feuer zu halten, lässt La Serna angreifen. Der Hang ist steil; die Kolonnen kommen einzeln unten an und müssen sich erst entfalten, während die Nachfolgenden noch am Hang hängen. Für eine halbe Stunde ist das Heer auf dem Berg nicht ein Heer, sondern eine Reihe getrennter Verbände in ungünstiger Lage.',
    stellungen: [
      s('r-valdes', 'rea', 'flaeche', 'gemischt', linie([-74.1440, -13.0460], 1.1, 0.35, 225), { name: 'Valdés steigt zuerst ab', staerke: 'mit der Artillerie' }),
      s('r-monet', 'rea', 'pfeil', 'fuss', pfeil([-74.1320, -13.0450], [-74.1350, -13.0490], [-74.1370, -13.0530]), { name: 'Monet im Abstieg' }),
      s('r-villalobos', 'rea', 'pfeil', 'fuss', pfeil([-74.1250, -13.0500], [-74.1290, -13.0530], [-74.1320, -13.0560]), { name: 'Villalobos im Abstieg' }),
      s('p-cordova', 'pat', 'flaeche', 'fuss', linie([-74.1370, -13.0620], 1.0, 0.3, 45), { name: 'Córdova wartet ab', staerke: 'Kolumbianer' }),
      s('p-lamar', 'pat', 'flaeche', 'fuss', linie([-74.1500, -13.0510], 1.0, 0.3, 45), { name: 'La Mar unter Feuer', staerke: 'Peruaner' }),
      s('p-miller', 'pat', 'flaeche', 'reiter', klumpen([-74.1410, -13.0650], 0.7), { name: 'Miller in Bereitschaft' }),
    ],
  },
  {
    zeit: 'Kurz danach',
    t: 310,
    kurz: 'Valdés drückt den linken Flügel zurück.',
    text: 'Valdés hat als Einziger die Geschütze mit heruntergebracht und geht damit gegen die peruanische Division vor. La Mars Linie weicht, die Vorposten laufen zurück, und für einen Augenblick steht der linke Flügel offen. Sucre schickt Lara mit der Reserve hinüber und lässt Miller aufsitzen.',
    stellungen: [
      s('r-valdes', 'rea', 'flaeche', 'gemischt', linie([-74.1490, -13.0480], 1.2, 0.4, 200), { name: 'Valdés greift an', staerke: 'mit der Artillerie' }),
      s('r-stossV', 'rea', 'pfeil', 'gemischt', pfeil([-74.1490, -13.0490], [-74.1500, -13.0520], [-74.1505, -13.0545]), {}),
      s('p-lamar', 'pat', 'flaeche', 'fuss', linie([-74.1510, -13.0560], 1.0, 0.3, 20), { name: 'La Mar weicht', staerke: 'Peruaner', geschlagen: true }),
      s('p-lara', 'pat', 'pfeil', 'fuss', pfeil([-74.1450, -13.0600], [-74.1490, -13.0580], [-74.1510, -13.0555]), { name: 'Lara stützt die Linke' }),
      s('p-cordova', 'pat', 'flaeche', 'fuss', linie([-74.1370, -13.0620], 1.0, 0.3, 45), { name: 'Córdova rechts', staerke: 'Kolumbianer' }),
      s('r-monet', 'rea', 'flaeche', 'fuss', linie([-74.1360, -13.0520], 1.1, 0.35, 225), { name: 'Monet entfaltet sich noch' }),
    ],
  },
  {
    zeit: 'Der entscheidende Augenblick',
    t: 370,
    kurz: 'Córdova erschießt sein Pferd und geht vor.',
    text: 'Auf dem rechten Flügel steigt Córdova ab, erschießt sein Pferd vor der Front, damit niemand daran denkt, wie man wegkommt, und gibt den Befehl, der in Südamerika sprichwörtlich geworden ist: „Division, Vormarsch, im Schritt der Sieger.“ Vier Bataillone gehen ohne Halt gegen Monets Verbände, die noch dabei sind, sich zu ordnen. Die Mitte des königlichen Heeres bricht in wenigen Minuten.',
    stellungen: [
      s('p-cordova', 'pat', 'flaeche', 'fuss', linie([-74.1370, -13.0570], 1.1, 0.3, 20), { name: 'Córdova geht vor', staerke: 'vier Bataillone' }),
      s('p-stossC', 'pat', 'pfeil', 'fuss', pfeil([-74.1370, -13.0580], [-74.1350, -13.0540], [-74.1330, -13.0500]), { name: '„Paso de vencedores“' }),
      s('r-monet', 'rea', 'flaeche', 'fuss', linie([-74.1320, -13.0480], 1.1, 0.4, 225), { name: 'Monet bricht', geschlagen: true }),
      s('r-villalobos', 'rea', 'flaeche', 'fuss', linie([-74.1250, -13.0510], 1.0, 0.35, 225), { name: 'Villalobos wird mitgerissen', geschlagen: true }),
      s('p-miller', 'pat', 'pfeil', 'reiter', pfeil([-74.1410, -13.0640], [-74.1360, -13.0580], [-74.1320, -13.0520]), { name: 'Miller reitet mit' }),
    ],
  },
  {
    zeit: 'Kurz vor Mittag',
    t: 420,
    kurz: 'Millers Reiterei stellt den linken Flügel wieder her.',
    text: 'Während die Mitte zusammenbricht, wenden sich Reiterei und Reserve gegen Valdés, der jetzt allein steht und keine Unterstützung mehr vom Berg bekommt. Auch sein Flügel geht zurück. Nach etwa einer Stunde Gefecht ist das königliche Heer in drei Teile zerfallen, die nicht mehr zusammenfinden.',
    stellungen: [
      s('p-miller', 'pat', 'pfeil', 'reiter', pfeil([-74.1360, -13.0550], [-74.1440, -13.0520], [-74.1490, -13.0490]), { name: 'gegen Valdés' }),
      s('p-lara', 'pat', 'flaeche', 'fuss', linie([-74.1490, -13.0540], 1.1, 0.3, 20), { name: 'Lara drückt nach' }),
      s('r-valdes', 'rea', 'flaeche', 'gemischt', linie([-74.1470, -13.0450], 1.1, 0.4, 225), { name: 'Valdés steht allein', geschlagen: true }),
      s('p-cordova', 'pat', 'flaeche', 'fuss', linie([-74.1330, -13.0500], 1.1, 0.3, 20), { name: 'Córdova auf dem Hang', staerke: 'vier Bataillone' }),
      s('r-monet', 'rea', 'flaeche', 'fuss', klumpen([-74.1290, -13.0460], 0.9), { name: 'Reste der Mitte', geschlagen: true }),
    ],
  },
  {
    zeit: 'Mittag',
    t: 470,
    kurz: 'Der Vizekönig wird verwundet gefangen genommen.',
    text: 'José de la Serna, sechsundfünfzig Jahre alt und seit drei Jahren Vizekönig eines Reichs, das nur noch aus seinem Heer besteht, wird sechsfach verwundet und gefangen. Mit ihm geraten vier Feldmarschälle, zehn Generäle und über sechzig Obersten in Gefangenschaft. Am Nachmittag reitet Canterac herunter und unterschreibt die Kapitulation: freier Abzug, Übergabe aller Festungen, Anerkennung der Schulden.',
    stellungen: [
      s('r-serna', 'rea', 'flaeche', 'gemischt', klumpen([-74.1300, -13.0420], 0.7), { name: 'Der Vizekönig gefangen', geschlagen: true }),
      s('p-cordova', 'pat', 'flaeche', 'fuss', linie([-74.1310, -13.0470], 1.1, 0.3, 20), { name: 'Córdova auf dem Rücken', staerke: 'vier Bataillone' }),
      s('r-rueck', 'rea', 'pfeil', 'gemischt', pfeil([-74.1250, -13.0430], [-74.1150, -13.0370], [-74.1050, -13.0320]), { name: 'Was entkommt', rueckzug: true }),
      s('p-lara', 'pat', 'flaeche', 'fuss', linie([-74.1420, -13.0470], 1.2, 0.3, 20), { name: 'Die Ebene ist frei' }),
    ],
  },
  {
    zeit: 'Nach dem 9. Dezember',
    t: 550,
    kurz: 'Das spanische Festlandreich hört auf zu bestehen.',
    text: 'Mit der Kapitulation von Ayacucho endet die spanische Herrschaft über das südamerikanische Festland nach knapp dreihundert Jahren. Sucre marschiert nach Oberperu, das sich im August 1825 als Bolivien selbstständig macht und sich nach Bolívar benennt; Sucre wird sein erster gewählter Präsident und 1830 aus dem Hinterhalt erschossen. Die Festung Callao hält noch bis Januar 1826; Kuba und Puerto Rico bleiben spanisch bis 1898.',
    uebersicht: true,
    sicht: [[-83.0, -34.0], [-58.0, 2.0]],
    stellungen: [
      s('p-bolivien', 'pat', 'pfeil', 'gemischt', pfeil([-74.14, -13.06], [-71.97, -13.53], [-68.15, -16.50], [-65.26, -19.05]), { name: 'Sucre nach Oberperu – 1825 Bolivien' }),
      s('p-lima', 'pat', 'pfeil', 'gemischt', pfeil([-74.14, -13.06], [-75.70, -12.60], [-77.03, -12.05]), { name: 'Lima und Callao, bis Januar 1826' }),
      s('r-ende', 'rea', 'pfeil', 'schiff', pfeil([-77.15, -12.06], [-79.50, -8.50], [-80.50, -3.00], [-79.00, 1.00]), { name: 'Der Abzug der Königlichen' }),
    ],
  },
];

export const ayacucho = {
  id: 'ayacucho',
  name: 'Ayacucho',
  ort: 'Pampa de la Quinua, peruanische Anden',
  datum: '9. Dezember 1824',
  jahr: 1824,
  mitte: [-74.1420, -13.0530],
  zoom: 13.0,
  grund: 'relief',
  worum: 'Eine Hochebene von anderthalb Kilometern auf 3.300 Metern, darüber ein Bergrücken. Wer vom Rücken herabsteigt, kommt in Kolonnen unten an und muss sich erst entfalten – und genau in diesem Augenblick geht Córdova vor. Was danach unterschrieben wird, beendet dreihundert Jahre spanische Herrschaft auf dem südamerikanischen Festland.',
  parteien,
  gelaende,
  stationen,
  ausgang: 'Das königliche Heer zerfällt in einer knappen Stunde; der Vizekönig wird verwundet gefangen. Am Nachmittag unterschreibt Canterac die Kapitulation.',
  verluste: [
    { partei: 'rea', text: 'rund 1.800 Tote, 700 Verwundete, etwa 2.000 Gefangene – darunter der Vizekönig, vier Feldmarschälle und zehn Generäle' },
    { partei: 'pat', text: 'rund 310 Tote und 600 Verwundete' },
  ],
  folgen: 'Die Kapitulation von Ayacucho beendet die spanische Herrschaft über das südamerikanische Festland. Oberperu erklärt sich im August 1825 als Bolivien selbstständig; Sucre wird dessen erster gewählter Präsident und 1830 aus dem Hinterhalt erschossen. Callao hält bis Januar 1826, Kuba und Puerto Rico bleiben spanisch bis 1898. Der Ort gibt der Provinz und der Stadt Huamanga ihren neuen Namen: Ayacucho.',
  streit: 'Beide Heere bestanden überwiegend aus Südamerikanern – auf königlicher Seite waren nur wenige hundert in Spanien geborene Soldaten. Ob die Schlacht deshalb Befreiungskrieg oder Bürgerkrieg zu nennen ist, wird bis heute unterschiedlich beantwortet. Umstritten ist auch die Kapitulationsurkunde: Peru hat die darin anerkannten Schulden später nur teilweise bedient, und ob Canterac überhaupt befugt war, für alle Festungen zu unterschreiben, wurde in Madrid bestritten.',
};
