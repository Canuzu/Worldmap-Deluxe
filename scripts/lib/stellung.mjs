/**
 * Formen für Truppenstellungen.
 *
 * Eine Stellung ist ein Polygon in Längen- und Breitengrad. Von Hand getippt
 * sind das je Schlacht rund vierhundert Zahlenpaare, und ein Tippfehler in der
 * dritten Nachkommastelle schiebt ein Regiment einen Kilometer weit weg, ohne
 * dass es beim Lesen auffällt. Deshalb hier drei Formen, aus denen sich alles
 * bauen lässt, was auf einem Schlachtfeld vorkommt:
 *
 *   linie()   ein Verband in Aufstellung – längliches Rechteck mit
 *             abgerundeten Enden, gedreht in die Richtung, in der er steht
 *   klumpen() eine Ansammlung ohne Front – Lager, Tross, eine belagerte Stadt
 *   pfeil()   eine Bewegung: Stoßrichtung, Rückzug, Anmarsch
 *
 * Gerechnet wird in Kilometern und Grad, nicht in Rohkoordinaten: „zwei
 * Kilometer breit, nach Nordost ausgerichtet“ ist eine Angabe, die man gegen
 * eine Karte prüfen kann. Die Umrechnung berücksichtigt, dass ein Längengrad
 * mit dem Kosinus der Breite schrumpft – ohne das stünde eine Linie bei
 * 50 Grad Nord um ein Drittel zu breit da.
 */

const RAD = Math.PI / 180;
const KM_JE_GRAD = 111.32;

/** Kilometerversatz von einem Punkt aus, gedreht um `winkel` Grad (0 = Nord). */
function versetzt([lon, lat], vorwaerts, seitwaerts, winkel) {
  const w = winkel * RAD;
  // Vorwärts zeigt in Richtung `winkel`, seitwärts 90 Grad rechts davon.
  const nord = vorwaerts * Math.cos(w) - seitwaerts * Math.sin(w);
  const ost = vorwaerts * Math.sin(w) + seitwaerts * Math.cos(w);
  return [
    +(lon + ost / (KM_JE_GRAD * Math.cos(lat * RAD))).toFixed(5),
    +(lat + nord / KM_JE_GRAD).toFixed(5),
  ];
}

/**
 * Ein aufgestellter Verband.
 *
 * @param {[number,number]} mitte   Mittelpunkt
 * @param {number} breite           Ausdehnung quer zur Blickrichtung, km
 * @param {number} tiefe            Ausdehnung in Blickrichtung, km
 * @param {number} winkel           Blickrichtung in Grad, 0 = Nord
 */
export function linie(mitte, breite, tiefe, winkel = 90) {
  const b = breite / 2;
  const t = tiefe / 2;
  // Acht Punkte statt vier: Die abgeschrägten Ecken lassen einen Verband wie
  // eine Truppe aussehen und nicht wie ein Grundstück.
  const e = Math.min(b * .28, t * .8);
  return [
    versetzt(mitte, t, -b + e, winkel),
    versetzt(mitte, t - e * .6, -b, winkel),
    versetzt(mitte, -t + e * .6, -b, winkel),
    versetzt(mitte, -t, -b + e, winkel),
    versetzt(mitte, -t, b - e, winkel),
    versetzt(mitte, -t + e * .6, b, winkel),
    versetzt(mitte, t - e * .6, b, winkel),
    versetzt(mitte, t, b - e, winkel),
  ];
}

/** Eine Ansammlung ohne Front: Lager, Tross, belagerte Stadt, Flottenhaufen. */
export function klumpen(mitte, durchmesser, streckung = 1, winkel = 0) {
  const r = durchmesser / 2;
  const punkte = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * 2 * Math.PI;
    // Leicht unregelmäßig, sonst sieht es nach Zirkelschlag aus.
    const w = r * (0.86 + 0.14 * Math.cos(i * 2.3));
    punkte.push(versetzt(mitte, Math.cos(a) * w * streckung, Math.sin(a) * w, winkel));
  }
  return punkte;
}

/**
 * Eine Bewegung. Anders als die Flächen ist ein Pfeil eine Linie: Der
 * Zeichner setzt die Spitze selbst und braucht nur den Weg.
 *
 * @param {Array<[number,number]>} punkte  Stützpunkte des Wegs
 */
export function pfeil(...punkte) {
  return punkte.map(([lon, lat]) => [+lon.toFixed(5), +lat.toFixed(5)]);
}

/** Ein Punkt, der `km` Kilometer in Richtung `winkel` von `von` entfernt liegt. */
export function ab(von, km, winkel) {
  return versetzt(von, km * Math.cos(winkel * RAD), km * Math.sin(winkel * RAD), 0);
}
