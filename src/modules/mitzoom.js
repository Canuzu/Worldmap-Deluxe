/**
 * Bildschirmleinwände beim stufenlosen Zoomen mitnehmen.
 *
 * Namen und Orte liegen auf Leinwänden in Bildschirmkoordinaten. Bisher
 * verschwanden sie mit dem ersten Raddreh und kamen erst wieder, wenn das Rad
 * eine Weile stillstand und alles neu gezeichnet war – die Karte wurde bei
 * jedem Zoomen für einen Augenblick namenlos. Das ist das, was sich als
 * „träge“ anfühlt: Man dreht, und die Karte antwortet mit Leere.
 *
 * Jetzt skalieren sie mit, genau wie die Flächen darunter, und blenden erst
 * aus, wenn der Maßstab weit genug weg ist, dass die Schrift sichtbar
 * verzerrt wäre: bis knapp eine halbe Stufe voll, nach einer Raste (eine
 * Stufe) noch halb, ab anderthalb Stufen fort. Nach dem Neuzeichnen stehen
 * sie scharf wieder da.
 *
 * Das gilt für Zooms, die Leaflet Bild für Bild über `_move` führt – das Rad,
 * zwei Finger, ein Flug. Den animierten Zoom über die Knöpfe spielt Leaflet
 * als CSS-Übergang ab; dort treten die Leinwände weiter für die Dauer ab.
 */
import L from 'leaflet';

/** Den Stand festhalten, in dem eine Leinwand gerade gezeichnet wurde. */
export function standMerken(map) {
  return { mitte: map.getCenter(), zoom: map.getZoom(), groesse: map.getSize() };
}

/**
 * Die Leinwand so verschieben und skalieren, dass ihr Inhalt dort liegt, wo
 * er im jetzigen Maßstab hingehört.
 *
 * Gezeichnet wurde so, dass Leinwandpunkt p der Bildschirmpunkt p im alten
 * Stand ist, also der Weltpunkt `p + project(mitte) − groesse/2`. Im neuen
 * Maßstab liegt derselbe Ort beim `skala`-fachen; abzüglich des jetzigen
 * Pixelursprungs ist das die Ebenenkoordinate der linken oberen Ecke.
 *
 * @returns {number} Deckung 0…1, die der Schrift jetzt zusteht
 */
export function mitZoomen(map, leinwand, stand, deckung = 1) {
  if (!stand || !leinwand || map._animatingZoom) return deckung;
  const zoom = map.getZoom();
  const skala = map.getZoomScale(zoom, stand.zoom);
  const ecke = map.project(stand.mitte, zoom)
    .subtract(stand.groesse.multiplyBy(skala / 2))
    .subtract(map.getPixelOrigin());
  L.DomUtil.setTransform(leinwand, ecke, skala);
  const abstand = Math.abs(Math.log2(skala));
  const anteil = Math.max(0, Math.min(1, 1 - (abstand - 0.45) / 0.95));
  leinwand.style.opacity = String(deckung * anteil);
  return deckung * anteil;
}
