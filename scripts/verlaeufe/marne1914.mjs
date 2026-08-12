#!/usr/bin/env node
/*
 * ACHTUNG – Verhältnis zu src/data/battles/marne1914.json: Dieses Skript hat
 * die JSON-Datei einmal erzeugt; danach ist die JSON-Datei die gültige Fassung.
 */
/**
 * An der Marne, 5. bis 12. September 1914.
 *
 * Die Schlacht besteht aus einer Lücke. Kluck dreht seine Armee nach Westen,
 * um den Angriff aus Paris abzuwehren – eine militärisch richtige
 * Entscheidung –, und dabei reißt zwischen seiner und Bülows Armee ein Raum
 * von fünfzig Kilometern auf, in dem nur Kavallerie steht. In diesen Raum
 * marschieren die Briten und die 5. französische Armee hinein, langsam, aber
 * ununterbrochen.
 *
 * Deshalb ist der Verlauf hier nicht als Feldschlacht gezeichnet, sondern
 * über zweihundert Kilometer Front: Die entscheidende Bewegung ist keine
 * Attacke, sondern eine Verschiebung, und man sieht sie nur, wenn man weit
 * genug weg steht.
 *
 * Der Schwerpunkt liegt bei 3.5 Ost, 48.88 Nord.
 */
import { linie, klumpen, pfeil } from '../lib/stellung.mjs';

const OURCQ = [2.9200, 49.0600];
const GOND = [3.8500, 48.8200];
const LUECKE = [3.4000, 48.9800];

const parteien = [
  {
    id: 'ent', name: 'Frankreich und Großbritannien', farbe: '#6f9fe0',
    fuehrung: 'Joseph Joffre, Joseph Gallieni, Michel-Joseph Maunoury, John French, Louis Franchet d’Espèrey, Ferdinand Foch',
    staerke: 'sechs französische Armeen und die britische Expeditionsstreitmacht – rund 1.070.000 Mann',
    zahl: 1070000,
  },
  {
    id: 'deu', name: 'Deutsches Reich', farbe: '#d4737c',
    fuehrung: 'Helmuth von Moltke, Alexander von Kluck, Karl von Bülow, Max von Hausen, Richard Hentsch',
    staerke: 'fünf Armeen des rechten und mittleren Flügels – rund 1.485.000 Mann',
    zahl: 1485000,
  },
];

const gelaende = [
  { art: 'stadt', name: 'Paris', punkte: klumpen([2.3500, 48.8600], 14.0, 1.1, 60) },
  { art: 'fluss', name: 'Die Marne', punkte: pfeil([2.4400, 48.8100], [2.8900, 48.9600], [3.4000, 49.0500], [3.9600, 49.0400], [4.5800, 48.7300], [4.9700, 48.6300]) },
  { art: 'fluss', name: 'Der Ourcq', punkte: pfeil([3.1200, 49.2600], [2.9500, 49.1400], [2.9000, 49.0000]) },
  { art: 'sumpf', name: 'Die Sümpfe von Saint-Gond', punkte: klumpen(GOND, 6.0, 3.2, 90) },
  { art: 'fluss', name: 'Die Aisne', punkte: pfeil([5.1500, 49.4200], [4.0300, 49.4200], [3.3000, 49.4200], [2.8000, 49.4700]) },
  { art: 'stadt', name: 'Verdun', punkte: klumpen([5.3800, 49.1600], 5.0) },
  { art: 'stadt', name: 'Reims', punkte: klumpen([4.0300, 49.2600], 6.0) },
];

const s = (id, partei, form, gattung, punkte, mehr = {}) => ({ id, partei, form, gattung, punkte, ...mehr });

const stationen = [
  {
    zeit: 'August 1914',
    t: 0,
    kurz: 'Ein Plan, der in sechs Wochen fertig sein soll.',
    text: 'Der deutsche Aufmarsch schwenkt durch Belgien und Nordfrankreich, um die französische Armee von Westen her einzuschließen, bevor Russland aufmarschiert ist. Nach den Grenzschlachten geht das französische Heer zwei Wochen lang zurück, dreihundert Kilometer weit, ohne zu zerbrechen – Joffre setzt unterwegs zwei Armeeführer und Dutzende Generäle ab. Anfang September steht der rechte deutsche Flügel südlich der Marne, fünfzig Kilometer vor Paris, und marschiert seit einem Monat.',
    uebersicht: true,
    sicht: [[-1.4, 46.2], [9.6, 51.6]],
    stellungen: [
      s('anm-deu', 'deu', 'pfeil', 'gemischt', pfeil([6.13, 50.78], [4.35, 50.85], [3.06, 50.63], [2.30, 49.90], [2.90, 48.95], [3.60, 48.80]), { name: 'Der rechte Flügel durch Belgien' }),
      s('anm-deu2', 'deu', 'pfeil', 'gemischt', pfeil([6.63, 49.75], [5.30, 49.60], [4.90, 49.10], [4.70, 48.75]), { name: 'Der mittlere Flügel durch die Ardennen' }),
      s('anm-ent', 'ent', 'pfeil', 'gemischt', pfeil([4.35, 50.85], [3.50, 50.20], [2.90, 49.50], [3.20, 48.85]), { name: 'Der große Rückzug, zwei Wochen lang' }),
      s('anm-bahn', 'ent', 'pfeil', 'gemischt', pfeil([6.18, 48.69], [5.00, 48.60], [3.70, 48.60], [2.35, 48.86]), { name: 'Joffre verschiebt Truppen mit der Bahn nach Westen' }),
    ],
  },
  {
    zeit: '3. September',
    t: 60,
    kurz: 'Die deutsche Rechte biegt vor Paris nach Osten ab.',
    text: 'Der Plan sah vor, Paris westlich zu umgehen. Kluck hat dafür nicht genug Leute – zwei Korps sind nach Ostpreußen abgefahren – und schwenkt stattdessen südöstlich an der Stadt vorbei, um die zurückgehende französische 5. Armee zu fassen. Damit zieht seine Marschkolonne quer vor der Festung Paris entlang und bietet ihr die eigene rechte Flanke an.',
    stellungen: [
      s('d-1', 'deu', 'flaeche', 'gemischt', linie([3.0000, 48.8500], 60, 18, 135), { name: '1. Armee · Kluck', staerke: 'schwenkt nach Südosten' }),
      s('d-2', 'deu', 'flaeche', 'gemischt', linie([3.8000, 48.8500], 55, 18, 180), { name: '2. Armee · Bülow' }),
      s('d-3', 'deu', 'flaeche', 'gemischt', linie([4.5000, 48.8000], 45, 16, 180), { name: '3. Armee · Hausen' }),
      s('e-paris', 'ent', 'flaeche', 'gemischt', klumpen([2.4000, 48.9200], 26, 1.1, 60), { name: 'Paris · Gallieni', staerke: 'Festungsbesatzung und 6. Armee' }),
      s('e-5', 'ent', 'flaeche', 'gemischt', linie([3.5000, 48.5500], 55, 16, 0), { name: '5. Armee · Franchet d’Espèrey' }),
      s('e-bef', 'ent', 'flaeche', 'gemischt', linie([2.9500, 48.5800], 30, 14, 0), { name: 'Britische Expeditionsstreitmacht' }),
    ],
  },
  {
    zeit: '4. September',
    t: 120,
    kurz: 'Aus der Luft gesehen: die Flanke liegt offen.',
    text: 'Französische Flieger und Kavalleriepatrouillen melden, dass die deutschen Kolonnen nach Südosten ziehen und Paris rechts liegen lassen. Gallieni erkennt sofort, was das heißt, und ruft Joffre an, der zunächst zögert. Am Abend geht der Befehl heraus: Der Rückzug endet, am 6. September wird angegriffen, und der Stoß kommt aus Paris heraus in die deutsche Flanke.',
    stellungen: [
      s('d-1', 'deu', 'flaeche', 'gemischt', linie([3.1500, 48.8200], 60, 18, 135), { name: '1. Armee zieht nach Südosten', staerke: 'die Flanke offen' }),
      s('e-6', 'ent', 'flaeche', 'gemischt', klumpen([2.6500, 49.0200], 22, 1.3, 20), { name: '6. Armee · Maunoury sammelt sich', staerke: 'östlich von Paris' }),
      s('e-flieger', 'ent', 'pfeil', 'gemischt', pfeil([2.4500, 48.9500], [2.9000, 49.0500], [3.3000, 48.9500]), { name: 'Luftaufklärung' }),
      s('d-2', 'deu', 'flaeche', 'gemischt', linie([3.9000, 48.8200], 55, 18, 180), { name: '2. Armee · Bülow' }),
      s('e-5', 'ent', 'flaeche', 'gemischt', linie([3.5000, 48.5500], 55, 16, 0), { name: '5. Armee' }),
    ],
  },
  {
    zeit: '5. September',
    t: 180,
    kurz: 'Maunoury greift über den Ourcq in die Flanke.',
    text: 'Einen Tag früher als geplant stößt die 6. Armee ostwärts über den Ourcq und trifft auf das deutsche Flankenkorps. Es wird ein zäher Kampf um Dörfer und Höhen, den keine Seite schnell gewinnt. Militärisch ist er unentschieden; seine Wirkung liegt woanders – Kluck kann ihn nicht ignorieren.',
    stellungen: [
      s('e-6', 'ent', 'flaeche', 'gemischt', linie([2.8200, 49.0500], 30, 10, 90), { name: '6. Armee greift an', staerke: 'Maunoury' }),
      s('e-stossO', 'ent', 'pfeil', 'gemischt', pfeil([2.7500, 49.0600], [2.8800, 49.0600], [2.9600, 49.0500]), {}),
      s('d-flanke', 'deu', 'flaeche', 'gemischt', linie([3.0400, 49.0400], 26, 10, 270), { name: 'IV. Reservekorps · Gronau' }),
      s('d-1', 'deu', 'flaeche', 'gemischt', linie([3.3000, 48.8000], 55, 16, 135), { name: '1. Armee südlich der Marne' }),
      s('e-bef', 'ent', 'flaeche', 'gemischt', linie([3.0000, 48.6000], 30, 14, 0), { name: 'Die Briten' }),
      s('e-5', 'ent', 'flaeche', 'gemischt', linie([3.5500, 48.5800], 55, 16, 0), { name: '5. Armee' }),
    ],
  },
  {
    zeit: '6. bis 7. September',
    t: 250,
    kurz: 'Kluck dreht sich um – und reißt eine Lücke auf.',
    text: 'Kluck zieht seine Armee Korps für Korps von Süden nach Norden zurück und dreht sie um neunzig Grad nach Westen, gegen Maunoury. Das ist die Entscheidung der Schlacht, und sie ist für sich genommen richtig. Nur entsteht dabei zwischen seinem linken Flügel und Bülows rechtem ein Raum von fünfzig Kilometern, in dem nichts steht als zwei Kavalleriekorps.',
    stellungen: [
      s('d-1', 'deu', 'flaeche', 'gemischt', linie([2.9800, 49.0800], 40, 14, 270), { name: '1. Armee dreht nach Westen', staerke: 'gegen Maunoury' }),
      s('d-dreh', 'deu', 'pfeil', 'gemischt', pfeil([3.3500, 48.8200], [3.2000, 48.9600], [3.0500, 49.0600]), { name: 'Der Schwenk nach Norden und Westen' }),
      s('d-luecke', 'deu', 'flaeche', 'reiter', klumpen(LUECKE, 46, 1.6, 150), { name: 'Die Lücke · nur Kavallerie', staerke: '50 Kilometer' }),
      s('d-2', 'deu', 'flaeche', 'gemischt', linie([3.9500, 48.8000], 55, 18, 180), { name: '2. Armee · Bülow' }),
      s('e-6', 'ent', 'flaeche', 'gemischt', linie([2.8000, 49.0500], 30, 10, 90), { name: '6. Armee hält den Ourcq' }),
      s('e-bef', 'ent', 'flaeche', 'gemischt', linie([3.1500, 48.7000], 30, 12, 0), { name: 'Die Briten marschieren nach Norden' }),
    ],
  },
  {
    zeit: '6. bis 9. September',
    t: 320,
    kurz: 'Foch hält die Sümpfe von Saint-Gond.',
    text: 'Weiter östlich steht Fochs neu gebildete 9. Armee an den Sümpfen von Saint-Gond gegen Bülow und Hausen, wird auseinandergedrückt und hält trotzdem. Der Satz, den man ihm zuschreibt – Zentrum eingedrückt, rechter Flügel weicht, Lage ausgezeichnet, ich greife an – steht in keiner Meldung, aber er trifft, was dort passiert. Solange Foch hält, kann Bülow die Lücke nach Westen nicht schließen.',
    stellungen: [
      s('e-9', 'ent', 'flaeche', 'gemischt', linie([3.8500, 48.7300], 45, 12, 0), { name: '9. Armee · Foch', staerke: 'an den Sümpfen' }),
      s('d-2', 'deu', 'flaeche', 'gemischt', linie([3.9000, 48.9000], 45, 14, 180), { name: '2. Armee drückt' }),
      s('d-3', 'deu', 'flaeche', 'gemischt', linie([4.5500, 48.8500], 40, 14, 180), { name: '3. Armee · Hausen' }),
      s('d-stossG', 'deu', 'pfeil', 'gemischt', pfeil([4.0500, 48.8800], [3.9500, 48.8000], [3.9000, 48.7400]), { name: 'Nachtangriff ohne Schuss' }),
      s('e-4', 'ent', 'flaeche', 'gemischt', linie([4.7000, 48.6500], 45, 12, 0), { name: '4. Armee · de Langle de Cary' }),
      s('d-luecke', 'deu', 'flaeche', 'reiter', klumpen(LUECKE, 44, 1.6, 150), { name: 'Die Lücke bleibt offen', staerke: '50 Kilometer' }),
    ],
  },
  {
    zeit: '7. September, abends',
    t: 380,
    kurz: 'Sechshundert Pariser Taxis fahren an die Front.',
    text: 'Gallieni lässt in Paris die Droschken beschlagnahmen: rund sechshundert Wagen, meist Renault AG, jeder mit fünf Mann, zwei Fahrten über sechzig Kilometer. Sie bringen etwa viertausend Soldaten der 7. Division nach Nanteuil. Militärisch ist das eine Kleinigkeit – die Division wäre auch marschiert –, für die Wirkung nach innen ist es alles: eine Hauptstadt, die ihr eigenes Heer an die Front fährt.',
    stellungen: [
      s('e-taxi', 'ent', 'pfeil', 'gemischt', pfeil([2.3500, 48.8700], [2.5500, 48.9500], [2.7000, 49.0800], [2.8000, 49.1400]), { name: 'Die Taxis nach Nanteuil' }),
      s('e-6', 'ent', 'flaeche', 'gemischt', linie([2.8000, 49.0800], 34, 10, 90), { name: '6. Armee hält', staerke: 'Maunoury' }),
      s('d-1', 'deu', 'flaeche', 'gemischt', linie([2.9800, 49.0800], 40, 14, 270), { name: '1. Armee am Ourcq' }),
      s('e-bef', 'ent', 'flaeche', 'gemischt', linie([3.2500, 48.8200], 30, 12, 0), { name: 'Die Briten in der Lücke' }),
      s('e-5', 'ent', 'flaeche', 'gemischt', linie([3.6000, 48.7500], 50, 14, 0), { name: '5. Armee rückt nach' }),
    ],
  },
  {
    zeit: '8. bis 9. September',
    t: 440,
    kurz: 'Nachts über die Marne, in den leeren Raum hinein.',
    text: 'Die Briten und der linke Flügel der 5. Armee gehen über die Marne, gegen schwache Kavallerie, ohne große Kämpfe – nur langsam, weil niemand weiß, was vorn steht. Genau das genügt: Zwei deutsche Armeen sehen einen Feind zwischen sich einsickern und haben nichts, womit sie ihn hinausdrängen könnten, weil beide gebunden sind.',
    stellungen: [
      s('e-bef', 'ent', 'pfeil', 'gemischt', pfeil([3.2000, 48.8500], [3.3500, 48.9600], [3.4500, 49.0500]), { name: 'Die Briten über die Marne' }),
      s('e-5', 'ent', 'pfeil', 'gemischt', pfeil([3.7000, 48.8000], [3.7500, 48.9200], [3.8000, 49.0200]), { name: '5. Armee gegen Bülows Flanke' }),
      s('d-luecke', 'deu', 'flaeche', 'reiter', klumpen([3.4500, 49.0200], 40, 1.6, 150), { name: 'Nur Kavallerie', staerke: 'weicht aus', geschlagen: true }),
      s('d-1', 'deu', 'flaeche', 'gemischt', linie([2.9500, 49.1000], 40, 14, 270), { name: '1. Armee, nach Westen gebunden' }),
      s('d-2', 'deu', 'flaeche', 'gemischt', linie([3.9500, 48.8800], 45, 14, 180), { name: '2. Armee, nach Süden gebunden' }),
    ],
  },
  {
    zeit: '9. September',
    t: 500,
    kurz: 'Ein Oberstleutnant fährt die Front ab und ordnet an.',
    text: 'Moltke sitzt mit dem Hauptquartier in Luxemburg, zweihundertfünfzig Kilometer entfernt, und hat kaum verlässliche Nachrichten. Er schickt seinen Nachrichtenchef, Oberstleutnant Hentsch, mit weitreichender Vollmacht im Auto zu den Armeen. Hentsch findet Bülow bereits im Zurückgehen, fährt zu Kluck und ordnet auch dort den Rückzug an. Über den Umfang seiner Vollmacht wird noch zwanzig Jahre später gestritten.',
    stellungen: [
      s('d-hentsch', 'deu', 'pfeil', 'gemischt', pfeil([4.5000, 49.4000], [4.0000, 49.2000], [3.5000, 49.0500], [2.9500, 49.1000]), { name: 'Hentsch fährt von Armee zu Armee' }),
      s('d-2', 'deu', 'flaeche', 'gemischt', linie([3.9500, 48.9500], 45, 14, 180), { name: '2. Armee geht zurück', geschlagen: true }),
      s('d-1', 'deu', 'flaeche', 'gemischt', linie([2.9500, 49.1200], 40, 14, 270), { name: '1. Armee bricht ab' }),
      s('e-bef', 'ent', 'flaeche', 'gemischt', linie([3.4000, 49.0000], 30, 12, 0), { name: 'Die Briten in der Lücke' }),
      s('e-5', 'ent', 'flaeche', 'gemischt', linie([3.8000, 48.9500], 50, 14, 0), { name: '5. Armee' }),
    ],
  },
  {
    zeit: '10. bis 12. September',
    t: 560,
    kurz: 'Sechzig Kilometer zurück, bis hinter die Aisne.',
    text: 'Der ganze rechte Flügel geht in geordneten Märschen bis hinter die Aisne zurück – rund sechzig Kilometer, ohne dass die Verfolger nahe genug herankommen, um daraus eine Niederlage zu machen. Dort graben sich die Deutschen auf den Höhen nördlich des Flusses ein. Die alliierten Angriffe vom 13. bis 28. September bleiben stecken. Moltke wird abgelöst; sein Nachfolger heißt Falkenhayn.',
    stellungen: [
      s('d-rueck', 'deu', 'pfeil', 'gemischt', pfeil([3.1000, 49.0500], [3.3000, 49.2500], [3.5000, 49.4200]), { name: 'Rückzug an die Aisne', rueckzug: true }),
      s('d-rueck2', 'deu', 'pfeil', 'gemischt', pfeil([4.0000, 48.9000], [4.0500, 49.2000], [4.1000, 49.4000]), { name: 'Rückzug an die Aisne', rueckzug: true }),
      s('d-aisne', 'deu', 'flaeche', 'gemischt', linie([3.8000, 49.4500], 90, 12, 180), { name: 'Eingegraben nördlich der Aisne', staerke: 'auf den Höhen' }),
      s('e-verfolg', 'ent', 'flaeche', 'gemischt', linie([3.8000, 49.2500], 95, 14, 0), { name: 'Die Verfolgung bleibt stecken', staerke: 'ab 13. September' }),
    ],
  },
  {
    zeit: 'Nach dem 12. September',
    t: 640,
    kurz: 'Vier Jahre Graben statt sechs Wochen Feldzug.',
    text: 'Beide Seiten versuchen danach, den jeweils anderen Flügel zu umgehen, und schieben die Front dabei in zwei Monaten bis an die Nordsee – der „Wettlauf zum Meer“, der nichts als eine durchgehende Linie erzeugt. Von November 1914 an läuft ein Graben von der Schweizer Grenze bis Nieuwpoort. Er wird sich vier Jahre lang nirgends um mehr als ein paar Dutzend Kilometer verschieben. Die Marne hat den Krieg nicht gewonnen, sondern ihn lang gemacht.',
    uebersicht: true,
    sicht: [[0.4, 45.6], [9.4, 52.4]],
    stellungen: [
      s('e-wettlauf', 'ent', 'pfeil', 'gemischt', pfeil([3.50, 49.45], [3.00, 49.90], [2.70, 50.30], [2.75, 50.90], [2.75, 51.13]), { name: 'Der Wettlauf zum Meer, September bis November' }),
      s('d-wettlauf', 'deu', 'pfeil', 'gemischt', pfeil([3.90, 49.45], [3.30, 50.10], [3.00, 50.60], [2.90, 51.05]), { name: 'und die Antwort darauf' }),
      s('d-front', 'deu', 'pfeil', 'gemischt', pfeil([2.75, 51.05], [2.80, 50.20], [3.10, 49.60], [5.00, 49.30], [5.90, 48.60], [7.30, 47.90], [7.60, 47.55]), { name: 'Die Front, wie sie vier Jahre bleibt' }),
    ],
  },
];

export const marne1914 = {
  id: 'marne1914',
  name: 'An der Marne',
  ort: 'Östlich von Paris',
  datum: '5. bis 12. September 1914',
  jahr: 1914,
  mitte: [3.5000, 48.8800],
  zoom: 7.9,
  grund: 'blatt',
  worum: 'Die Schlacht besteht aus einer Lücke. Kluck dreht seine Armee nach Westen, um den Angriff aus Paris abzuwehren, und reißt dabei zwischen sich und Bülow einen Raum von fünfzig Kilometern auf, in dem nur Kavallerie steht. Da hinein marschieren die Briten und die 5. französische Armee – langsam, aber ununterbrochen. Die entscheidende Bewegung ist kein Angriff, sondern eine Verschiebung.',
  parteien,
  gelaende,
  stationen,
  ausgang: 'Der deutsche rechte Flügel geht auf Befehl bis hinter die Aisne zurück. Der Bewegungskrieg im Westen ist damit beendet.',
  verluste: [
    { partei: 'ent', text: 'rund 263.000, davon etwa 81.000 Tote – Frankreich rund 250.000, die Briten 13.000' },
    { partei: 'deu', text: 'rund 250.000, davon etwa 67.000 Tote' },
  ],
  folgen: 'Der Plan eines kurzen Feldzugs im Westen ist gescheitert; Deutschland führt von nun an einen Zweifrontenkrieg über Jahre. Moltke wird abgelöst. Nach dem „Wettlauf zum Meer“ steht ab November 1914 eine durchgehende Grabenlinie von der Schweiz bis zur Nordsee, die sich vier Jahre lang kaum verschiebt. Verdun, die Somme und Passchendaele sind die Versuche, sie aufzubrechen.',
  streit: 'Die Rolle Hentschs ist der Dauerstreit: ob ein Oberstleutnant den Rückzug des rechten Flügels befohlen hat oder nur eine bereits laufende Bewegung bestätigte, wurde 1917 in einem Untersuchungsverfahren und danach jahrzehntelang verhandelt. Auch die Wirkung der Pariser Taxis ist eher Symbol als Militärgeschichte – sie brachten rund 4.000 Mann, die Front hielt eine halbe Million. Ob Kluck durch das Schwenken einen Fehler beging oder ob der Plan von Anfang an mehr Truppen gebraucht hätte, als vorhanden waren, ist bis heute offen.',
};
