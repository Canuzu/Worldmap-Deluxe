/**
 * Fehler des Ursprungsdatensatzes, die *vor* jeder anderen Aufbereitung
 * geradegezogen werden müssen – und zwar in beiden Aufbereitungswegen
 * gleich, sonst zeigen `data-src/derived` und `public/data/epochs` für
 * dasselbe Jahr Verschiedenes.
 *
 * Abgegrenzt gegen `src/data/corrections.json`: Dort stehen *historische*
 * Richtigstellungen – ein Reich, das der Datensatz zu früh oder zu spät
 * enden lässt. Hier stehen *handwerkliche* Fehler: eine Fläche ohne Namen,
 * ein Name auf der falschen Fläche. Beides wäre in einer Datei nicht mehr
 * auseinanderzuhalten.
 */

/* ------------------------------------------------------------ Namenslücken */

/**
 * Namenlose Flächen retten, die einen Oberherrn haben.
 *
 * Der Datensatz führt drei Felder: NAME, SUBJECTO ("untersteht") und PARTOF.
 * Bei einem Teil der Flächen ist NAME leer – meist zu Recht, denn das ist der
 * unbeanspruchte Rest der Landmasse, der auf keiner historischen Karte einem
 * Reich zufällt. Beide Aufbereitungswege werfen solche Flächen deshalb weg.
 *
 * In einigen Fällen ist NAME aber leer, **obwohl SUBJECTO gesetzt ist** – die
 * Fläche gehört einem Reich, nur die Beschriftung fehlt. Diese Stücke fielen
 * bisher mit heraus, und zwar lautlos. Zwei davon sind keine Kleinigkeit:
 *
 *   1815  Der ganze indonesische Archipel – Sumatra, Java, Borneo, Sulawesi,
 *         Bali, Lombok, Sumbawa, Halmahera – trägt `NAME: null` bei
 *         `SUBJECTO: "Dutch East Indies"`. Übrig blieb allein die Insel
 *         Bangka. Von 1808 bis 1879 fehlte Indonesien auf der Karte.
 *   1815  Das Vereinigte Königreich der Niederlande trägt als NAME sieben
 *         Leerzeichen bei `SUBJECTO: "United Kingdom of Netherlands"`. Die
 *         Niederlande fehlten im selben Zeitraum ebenso.
 *
 * Die Regel dagegen ist so einfach wie belastbar: Fehlt der Name, steht aber
 * ein Oberherr da, dann ist der Oberherr der Name. Genau das bedeutet das
 * Feld. Ausgenommen sind Werte, die offensichtlich keine Namen sind – der
 * Datensatz trägt an ein paar Stellen "1" oder "3" in SUBJECTO ein.
 *
 * Betroffen sind über alle 62 Zeitschnitte hinweg fünf Werte:
 * "Dutch East Indies", "United Kingdom of Netherlands", "Bega",
 * "Arctic marine mammal hunters", "Cardial Ware culture" – und nichts sonst.
 * Alle anderen namenlosen Flächen haben auch keinen Oberherrn und fallen
 * weiterhin heraus.
 *
 * mapshaper-Ausdruck für `-each`. Muss **vor** dem Wegfiltern namenloser
 * Flächen laufen, sonst ist nichts mehr da, das zu retten wäre.
 */
export const NAMEN_AUS_OBERHERR =
  'if ((NAME == null || String(NAME).trim() === "") '
  + '&& SUBJECTO != null && String(SUBJECTO).trim().length > 2 '
  + '&& isNaN(Number(SUBJECTO))) { '
  + 'NAME = String(SUBJECTO).trim(); '
  + 'if (PARTOF == null || String(PARTOF).trim() === "") PARTOF = NAME; }';

/* ------------------------------------------------------ Namen am falschen Ort */

/**
 * Flächen, die im Ursprungsdatensatz den Namen einer ganz anderen Gegend
 * tragen. Ein bloßes Umbenennen über NAME träfe hier auch die richtige
 * Fläche desselben Namens – deshalb die zusätzliche Bedingung.
 *
 * [Jahr]: [{ wenn: {Feld: Wert, …}, setzen: {Feld: Wert, …}, _was }]
 */
const VERTAUSCHT = {
  1815: [{
    _was: 'Die Fläche der niederländischen Kapsiedlungen (17,4°–25,6° Ost, '
      + '34°–30° Süd – das südafrikanische Kapland) heißt im Ursprungsdatensatz '
      + '"Dutch East Indies". Der Name gehört an den indonesischen Archipel, '
      + 'nicht ans Kap. Die Fläche selbst war 1815 britisch: Großbritannien '
      + 'hatte das Kap 1806 besetzt und 1814 vertraglich erhalten. Sie fällt '
      + 'damit an die unmittelbar angrenzende Kapkolonie.',
    wenn: { NAME: 'Dutch East Indies', SUBJECTO: 'Netherlands' },
    setzen: { NAME: 'Cape Colony', SUBJECTO: 'Cape Colony', PARTOF: 'Cape Colony' },
  }],
};

/** mapshaper-Ausdruck für `-each`, oder null. */
export function vertauschtExpression(jahr) {
  const regeln = VERTAUSCHT[jahr];
  if (!regeln?.length) return null;
  return regeln.map((r) => {
    const wenn = Object.entries(r.wenn)
      .map(([f, w]) => `${f} === ${JSON.stringify(w)}`).join(' && ');
    const setzen = Object.entries(r.setzen)
      .map(([f, w]) => `${f} = ${JSON.stringify(w)};`).join(' ');
    return `if (${wenn}) { ${setzen} }`;
  }).join(' ');
}

/** Namen, die durch `vertauschtExpression` neu entstehen – zum Verschmelzen. */
export function vertauschtNamen(jahr) {
  return (VERTAUSCHT[jahr] ?? []).map((r) => r.setzen.NAME).filter(Boolean);
}

/* ------------------------------------------------- Gebiet am falschen Reich */

/**
 * Gebiete, die der Ursprungsdatensatz dem falschen Reich zuschlägt – als
 * Teil einer Mehrfachfläche, die sonst richtig liegt. Ein Umbenennen hilft
 * nicht, denn es träfe das ganze Reich; das Stück muss herausgeschnitten
 * und dem richtigen Nachbarn zugeschlagen werden.
 *
 * `ring` ist ein Rechteck in Längen- und Breitengraden, das das Stück
 * einschließt und sonst nichts von `von` berührt.
 */
export const ZUWEISUNGEN = {
  1815: [{
    _was: 'Belgien hängt im Ursprungsdatensatz noch am Österreichischen '
      + 'Kaiserreich. Die Österreichischen Niederlande waren aber 1795 von '
      + 'Frankreich annektiert worden; der Wiener Kongress schlug das Gebiet '
      + '1815 dem neu geschaffenen Vereinigten Königreich der Niederlande zu. '
      + 'Österreich wurde stattdessen in Oberitalien entschädigt.',
    von: 'Austrian Empire',
    an: 'United Kingdom of Netherlands',
    ring: [[2.2, 49.3], [6.6, 49.3], [6.6, 51.7], [2.2, 51.7]],
  }],
};
