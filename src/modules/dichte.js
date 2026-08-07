/**
 * Wie fein die Zeichenflächen gerastert werden.
 *
 * Fünf Leinwände zeichnen den Atlas: die Karte selbst, die Beschriftung, die
 * Religionsgrenzen, das Übersichtsblatt und der Schlachtverlauf. Jede legte
 * bisher `min(devicePixelRatio, 2)` Bildpunkte je Punkt an – auf einem
 * Schreibtischschirm ist das richtig.
 *
 * Auf einem Telefon ist es das nicht. Dort ist die Dichte fast immer 2 oder 3,
 * die Fläche 390×844 Punkte – bei Dichte 2 sind das 1,32 Millionen Bildpunkte,
 * so viel wie ein 1440×900-Schirm, gerechnet aber auf einem Prozessor, der ein
 * Vielfaches langsamer ist. Gemessen auf einem viermal gedrosselten Strang lief
 * der Schlachtverlauf mit 3,1 Bildern je Sekunde, während derselbe Verlauf am
 * Schreibtisch 10,1 schaffte.
 *
 * Deshalb 1,5 statt 2 auf schmalen Geräten: Das sind 44 Prozent weniger
 * Bildpunkte je Bild. Sichtbar ist der Unterschied bei Flächen und Linien
 * praktisch nicht – 1,5 liegt immer noch deutlich über der Rasterung, ab der
 * Kanten stufig wirken. Schrift bekommt weiterhin ganze 2, weil man dort
 * jede Stufe liest; das regelt die Beschriftung selbst.
 *
 * Die Grenze bei 560 Punkten ist dieselbe wie im Stilbogen, damit Aussehen und
 * Rechenaufwand nicht an verschiedenen Stellen umschlagen.
 */

/** Obergrenze für Flächen und Linien. */
export function zeichendichte() {
  const roh = window.devicePixelRatio || 1;
  const eng = Math.min(window.innerWidth, window.innerHeight) < 560;
  return Math.min(roh, eng ? 1.5 : 2);
}

/**
 * Obergrenze für Schrift. Beschriftung wird gelesen, nicht überflogen – dort
 * bleibt es bei 2, auch am Telefon. Die Menge der Beschriftungen ist auf
 * schmalen Geräten ohnehin schon begrenzt.
 */
export function schriftdichte() {
  return Math.min(window.devicePixelRatio || 1, 2);
}
