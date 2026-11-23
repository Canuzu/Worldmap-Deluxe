/**
 * Stufenloses Zoomen mit dem Mausrad.
 *
 * Leaflets eigenes Radzoomen arbeitet in Sprüngen: Es sammelt die Rasten
 * einer Radbewegung, wartet, bis keine mehr kommt, spielt dann eine kurze
 * Animation ab und baut am Ende die ganze Karte neu auf – Projektion aller
 * Stützpunkte, Zuschnitt, Zeichnen von Flächen, Meer, Küste und Namen. Dreht
 * man weiter, beginnt das Ganze von vorn; Rasten, die während einer laufenden
 * Animation kommen, verwirft Leaflet sogar. Das Ergebnis fühlt sich an wie
 * eine Treppe: warten, springen, stocken, warten.
 *
 * Hier folgt die Karte dem Rad Bild für Bild. Während der Bewegung wird
 * nichts neu gerechnet – die fertigen Zeichenflächen werden nur per CSS
 * skaliert und verschoben, wie Leaflet es während seiner Animation auch tut,
 * und das kostet die Grafikkarte nichts. Neu aufgebaut wird ein einziges Mal,
 * wenn das Rad zur Ruhe gekommen ist.
 *
 * Technisch ist das derselbe Weg, den Leaflet beim Zwei-Finger-Zoomen auf
 * dem Telefon geht (`_move` je Bild, `_moveEnd` am Schluss) – nur vom Rad
 * statt von den Fingern gesteuert.
 */
import L from 'leaflet';

/** So lange darf das Rad stillstehen, bevor die Karte neu aufgebaut wird. */
const RUHE_MS = 140;
/**
 * Halbwertszeit des Nachziehens: Nach so vielen Millisekunden ist die Hälfte
 * des Restwegs zum Ziel zurückgelegt. Gerechnet in Zeit, nicht in Bildern –
 * vorher waren es 30 % je Bild, und auf einem Rechner, der nur 25 Bilder je
 * Sekunde schafft, kroch der Zoom dann zweieinhalb Mal so lange hinterher.
 * Gerade dort, wo es ohnehin zäh ist, fühlte er sich doppelt zäh an.
 */
const HALBWERT_MS = 38;
/** Zoomstufen je Raste eines Mausrads. Wie bei den bekannten Kartendiensten:
 *  eine Raste, eine Stufe. */
const STUFEN_JE_RASTE = 1;
/** Bildpunkte Raddrehung, die einer Raste entsprechen (Chrome, Edge, Safari). */
const PX_JE_RASTE = 100;

/**
 * Raddrehung in Zoomstufen.
 *
 * Leaflet rechnet mit `getWheelDelta`, und das teilt unter Windows durch die
 * doppelte Bildschirmskalierung: Bei 125 % Skalierung wurde aus einer Raste
 * ein Viertel einer Zoomstufe. Wer vom Weltblick nach Mitteleuropa wollte,
 * drehte zwanzig Rasten. Hier zählt die Drehung selbst, gleich auf welchem
 * System: Zeilen und Seiten (Firefox) werden in Bildpunkte umgerechnet, eine
 * Raste ist eine Stufe. Ein Tastfeld liefert viele kleine Werte und zoomt
 * damit stufenlos; die Zwei-Finger-Geste (Strg + Rad) zieht stärker, weil
 * ihre Werte kleiner sind.
 */
function stufenAus(e) {
  const px = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 800 : 1);
  const stufen = (-px / PX_JE_RASTE) * STUFEN_JE_RASTE * (e.ctrlKey ? 2.2 : 1);
  // Eine einzelne Meldung bewegt höchstens eine Stufe – manche Mäuse melden
  // schnelle Drehungen als einen einzigen großen Wert.
  return Math.max(-1, Math.min(1, stufen));
}

export const SanfterRadzoom = L.Handler.extend({
  addHooks() {
    L.DomEvent.on(this._map.getContainer(), 'wheel', this._rad, this);
    // Beginnt etwas anderes, endet die Radbewegung: ein Zug mit der Maus
    // oder ein Zoom über Tasten und Knöpfe, den Leaflet selbst animiert.
    this._map.on('dragstart zoomanim', this._abschliessen, this);
  },

  removeHooks() {
    L.DomEvent.off(this._map.getContainer(), 'wheel', this._rad, this);
    this._map.off('dragstart zoomanim', this._abschliessen, this);
    this._abschliessen();
  },

  /** Läuft gerade eine Radbewegung? */
  aktiv() {
    return !!this._aktiv;
  },

  _rad(e) {
    L.DomEvent.stop(e);
    const map = this._map;
    const delta = stufenAus(e);
    if (!delta) return;

    if (!this._aktiv) {
      map._stop();
      if (map._panAnim) map._panAnim.stop();
      this._aktiv = true;
      this._ziel = map.getZoom();
      this._zuletzt = performance.now();
      map._moveStart(true, false);
    }

    this._ziel = Math.max(map.getMinZoom(), Math.min(map.getMaxZoom(), this._ziel + delta));
    // Der Ort unter dem Mauszeiger bleibt unter dem Mauszeiger – gerechnet
    // im laufenden Zwischenstand, nicht im Stand vor der Bewegung.
    this._ankerPunkt = map.mouseEventToContainerPoint(e);
    this._ankerOrt = map.containerPointToLatLng(this._ankerPunkt);

    this._still = false;
    clearTimeout(this._ruhe);
    this._ruhe = setTimeout(() => { this._still = true; }, RUHE_MS);
    if (!this._rahmen) this._rahmen = requestAnimationFrame(() => this._schritt());
  },

  _schritt() {
    this._rahmen = 0;
    const map = this._map;
    if (!this._aktiv || !map) return;

    const jetzt = performance.now();
    // Höchstens ein Zehntel Sekunde auf einmal: Nach einem Hänger soll die
    // Karte nicht in einem Satz ans Ziel springen.
    const dt = Math.min(100, Math.max(1, jetzt - (this._zuletzt ?? jetzt - 16)));
    this._zuletzt = jetzt;
    const anteil = 1 - 0.5 ** (dt / HALBWERT_MS);
    const z = map.getZoom();
    let neu = z + (this._ziel - z) * anteil;
    if (Math.abs(this._ziel - neu) < 0.004) neu = this._ziel;
    if (neu !== z) {
      const mitte = map.getSize()._divideBy(2);
      const versatz = this._ankerPunkt.subtract(mitte);
      const center = map.unproject(map.project(this._ankerOrt, neu).subtract(versatz), neu);
      // `pinch` sagt den Kachelebenen, dass sie bis zum Ende nur skalieren
      // und noch keine Kacheln nachladen sollen – genau wie beim Fingerzoom.
      map._move(center, neu, { pinch: true, round: false });
    }

    if (neu === this._ziel && this._still) {
      this._abschliessen();
      return;
    }
    this._rahmen = requestAnimationFrame(() => this._schritt());
  },

  /** Die Bewegung beenden und die Karte einmal neu aufbauen lassen. */
  _abschliessen() {
    if (!this._aktiv) return;
    this._aktiv = false;
    cancelAnimationFrame(this._rahmen);
    this._rahmen = 0;
    clearTimeout(this._ruhe);
    this._map._moveEnd(true);
  },
});
