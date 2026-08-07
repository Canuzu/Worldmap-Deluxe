/**
 * Religionsraster: Glaube je Ort, nicht je Land.
 *
 * Unter der Karte liegt ein Gitter von einem Viertelgrad. Es weiß nichts von
 * Staatsgrenzen – der Glaube einer Landschaft hört nicht an einer Grenze auf –,
 * und genau deshalb wird im Zusammenspiel mit den Grenzlinien darüber sichtbar,
 * was die Ebene zeigen soll: dass eine Konfessionsgrenze quer durch ein Reich
 * läuft und nicht an seinem Rand.
 *
 * Zwei Kunstgriffe machen das Zeichnen billig:
 *
 * 1. Das Bild wird gleich in Mercator-Höhe gebaut, nicht in Breitengraden.
 *    Dann ist die Abbildung auf den Bildschirm eine reine Streckung, und ein
 *    einziger `drawImage` je Bild genügt. Zeilenweise zu zeichnen – 720
 *    Aufrufe je Bild – wäre der naheliegende, aber teure Weg.
 *
 * 2. Die Küsten bleiben scharf, ohne dass das Raster sie kennt: Die
 *    Meeresfläche liegt als deckende Ebene darüber und schneidet alles ab,
 *    was über die echte Uferlinie hinausragt. Die Treppenstufen des Gitters
 *    sieht man deshalb nur im Landesinneren, wo sie hingehören – dort ist die
 *    Grenze ohnehin ein Übergang und keine Linie.
 */
import L from 'leaflet';

/** Kantenlänge des gebauten Bildes. Web-Mercator ist quadratisch. */
const WELT = 1440;

/** Lauflängen wieder auseinanderziehen. */
function entpacken(laeufe, laenge) {
  const aus = new Uint8Array(laenge);
  let i = 0;
  for (let k = 0; k < laeufe.length; k += 2) {
    const zahl = laeufe[k];
    const wert = laeufe[k + 1];
    if (wert) aus.fill(wert, i, i + zahl);
    i += zahl;
  }
  return aus;
}

const zuRGB = (hex) => {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};

export const ReligionsRaster = L.Layer.extend({
  initialize(optionen) {
    L.setOptions(this, optionen);
    this._daten = null;
    this._bild = null;
  },

  onAdd(map) {
    const c = this._leinwand = L.DomUtil.create('canvas', 'religion-canvas');
    c.style.pointerEvents = 'none';
    this._ctx = c.getContext('2d');
    map.getPane(this.options.pane).appendChild(c);
    map.on('move zoom viewreset resize zoomanim', this._planen, this);
    this._planen();
  },

  onRemove(map) {
    map.off('move zoom viewreset resize zoomanim', this._planen, this);
    if (this._rahmen) cancelAnimationFrame(this._rahmen);
    this._rahmen = 0;
    this._leinwand.remove();
  },

  /**
   * Neue Daten: Bild einmal bauen, dann nur noch strecken.
   *
   * @param {object|null} daten Rasterdatei eines Zeitschnitts
   * @param {object} vokabular Klassen mit Farben
   * @param {boolean} hell Pergamentfassung
   */
  setDaten(daten, vokabular, hell) {
    this._daten = daten;
    const bilder = daten ? this._baueBild(daten, vokabular, hell) : null;
    this._bild = bilder?.volk ?? null;
    this._staatBild = bilder?.staat ?? null;
    this._planen();
  },

  setDeckung(wert) {
    this._deckung = wert;
    this._planen();
  },

  /**
   * Aus dem Gitter ein Bild in Mercator-Höhe bauen.
   *
   * Das Gitter steht in Breitengraden, gleichmäßig von Pol zu Pol. Mercator
   * dehnt die hohen Breiten – Grönland wird so groß wie Afrika. Wer das Bild
   * unverändert streckt, bekommt ein verschobenes Sibirien. Deshalb wird hier
   * für jede Zeile des Zielbildes zurückgerechnet, welche Gitterzeile an
   * dieser Stelle steht.
   */
  _baueBild(daten, vokabular, hell) {
    const { breite, hoehe, klassen } = daten;
    const volk = entpacken(daten.volk, breite * hoehe);
    const staat = entpacken(daten.staat, breite * hoehe);

    // Farbtafel, einmal je Zeitschnitt statt einmal je Bildpunkt.
    const tafel = new Uint8Array((klassen.length + 1) * 3);
    for (let i = 0; i < klassen.length; i++) {
      const m = vokabular.klassen[klassen[i]];
      if (!m) continue;
      const [r, g, b] = zuRGB(hell ? (m.hell ?? m.farbe) : m.farbe);
      tafel[(i + 1) * 3] = r;
      tafel[(i + 1) * 3 + 1] = g;
      tafel[(i + 1) * 3 + 2] = b;
    }

    const leinwand = document.createElement('canvas');
    leinwand.width = WELT;
    leinwand.height = WELT;
    const ctx = leinwand.getContext('2d');
    const bild = ctx.createImageData(WELT, WELT);
    const px = bild.data;

    const leinwandS = document.createElement('canvas');
    leinwandS.width = WELT;
    leinwandS.height = WELT;
    const ctxS = leinwandS.getContext('2d');
    const bildS = ctxS.createImageData(WELT, WELT);
    const pxS = bildS.data;

    for (let y = 0; y < WELT; y++) {
      // Rückrechnung Mercator → Breitengrad
      const n = Math.PI * (1 - 2 * (y + .5) / WELT);
      const lat = (180 / Math.PI) * Math.atan(Math.sinh(n));
      let zeile = Math.floor((90 - lat) / (180 / hoehe));
      if (zeile < 0) zeile = 0;
      if (zeile >= hoehe) zeile = hoehe - 1;
      const quelle = zeile * breite;

      for (let x = 0; x < WELT; x++) {
        const spalte = Math.floor(x * breite / WELT);
        const i = quelle + spalte;
        const v = volk[i];
        const ziel = (y * WELT + x) * 4;
        if (!v) { px[ziel + 3] = 0; continue; }
        px[ziel] = tafel[v * 3];
        px[ziel + 1] = tafel[v * 3 + 1];
        px[ziel + 2] = tafel[v * 3 + 2];
        px[ziel + 3] = 255;

        /* Die Farbe der Herrschaft kommt in ein zweites Bild – dort, wo sie
           von der des Volkes abweicht, und sonst durchsichtig.
           Zusammengelegt werden beide erst beim Zeichnen, mit einem
           Streifenmuster im Bildschirmmaß.

           Vorher stand die Schraffur in diesem Bild: jede vierte Diagonale
           der Zellen. Damit hatte sie die Auflösung der Daten und nicht die
           des Bildschirms – beim Hineinzoomen wurde aus feinen Streifen ein
           Schachbrett aus 30 Bildpunkten. Eine Schraffur ist ein Zeichen,
           kein Gelände: Sie darf nicht mitwachsen. */
        const s = staat[i];
        if (s && s !== v) {
          pxS[ziel] = tafel[s * 3];
          pxS[ziel + 1] = tafel[s * 3 + 1];
          pxS[ziel + 2] = tafel[s * 3 + 2];
          pxS[ziel + 3] = 255;
        }
      }
    }
    ctx.putImageData(bild, 0, 0);
    ctxS.putImageData(bildS, 0, 0);
    return { volk: leinwand, staat: leinwandS };
  },

  /**
   * Streifenmuster im Bildschirmmaß.
   *
   * Sechs Bildpunkte Abstand, unabhängig vom Zoom – dieselbe Feinheit wie bei
   * der Schraffur der besetzten Gebiete. Einmal gebaut und behalten: Ein
   * Muster je Bild neu anzulegen kostet mehr als alles andere am Zeichnen.
   */
  _streifen(ctx) {
    if (this._muster) return this._muster;
    const kachel = document.createElement('canvas');
    kachel.width = 6;
    kachel.height = 6;
    const k = kachel.getContext('2d');
    k.strokeStyle = '#000';
    k.lineWidth = 2;
    k.beginPath();
    k.moveTo(-1, 7);
    k.lineTo(7, -1);
    k.stroke();
    this._muster = ctx.createPattern(kachel, 'repeat');
    return this._muster;
  },

  _planen() {
    if (this._rahmen) return;
    this._rahmen = requestAnimationFrame(() => {
      this._rahmen = 0;
      this._zeichne();
    });
  },

  _zeichne() {
    const map = this._map;
    const ctx = this._ctx;
    if (!map || !ctx) return;
    const groesse = map.getSize();
    const c = this._leinwand;
    const dichte = Math.min(window.devicePixelRatio || 1, 2);
    if (c.width !== Math.round(groesse.x * dichte)) {
      c.width = Math.round(groesse.x * dichte);
      c.height = Math.round(groesse.y * dichte);
      c.style.width = `${groesse.x}px`;
      c.style.height = `${groesse.y}px`;
    }
    L.DomUtil.setPosition(c, map.containerPointToLayerPoint([0, 0]));

    /* Weiche Kanten, sobald eine Zelle größer als ein paar Bildpunkte wird.
     *
     * Auf Weltmaßstab ist eine Zelle kleiner als ein Bildpunkt – da ist
     * Glättung wirkungslos und harte Kanten sind richtig. Beim Hineinzoomen
     * wird aus derselben Zelle ein Quadrat von dreißig Bildpunkten, und eine
     * harte Kante behauptet dann eine Grenze, wo eine Schätzung von 28
     * Kilometern steht. Der Übergang ist die ehrlichere Darstellung: Er zeigt,
     * dass die Karte hier nicht mehr weiß, wo genau die Linie läuft. */
    const zellePx = (256 * 2 ** map.getZoom()) * (this._daten?.schritt ?? .25) / 360;
    this._weich = zellePx > 3;
    ctx.imageSmoothingEnabled = this._weich;
    ctx.imageSmoothingQuality = 'high';
    ctx.setTransform(dichte, 0, 0, dichte, 0, 0);
    ctx.clearRect(0, 0, groesse.x, groesse.y);
    if (!this._bild) return;

    /* Die Weltkarte ist bei Zoomstufe z genau 256·2^z Bildpunkte breit. Das
       gebaute Bild ist WELT Punkte breit – das Verhältnis der beiden ist der
       Streckungsfaktor, und mehr braucht es nicht. */
    const zoom = map.getZoom();
    const welt = 256 * 2 ** zoom;
    const massstab = WELT / welt;
    const linksOben = map.containerPointToLayerPoint([0, 0]);
    const ursprung = map.getPixelOrigin();
    const wx = (linksOben.x * -1 + ursprung.x) * massstab;
    const wy = (linksOben.y * -1 + ursprung.y) * massstab;
    const ww = groesse.x * massstab;
    const wh = groesse.y * massstab;

    ctx.globalAlpha = this._deckung ?? 1;
    /* Bei weit herausgezoomter Karte liegt die Welt mehrfach nebeneinander.
       Ohne die Nachbarkopien bliebe links und rechts eine leere Fläche, sobald
       man über den Datumswechsel hinausschiebt. */
    const kopien = [];
    for (const versatz of [-WELT, 0, WELT]) {
      const sx = wx + versatz;
      if (sx + ww < 0 || sx > WELT) continue;
      kopien.push(sx);
    }
    for (const sx of kopien) {
      ctx.drawImage(this._bild, sx, wy, ww, wh, 0, 0, groesse.x, groesse.y);
    }

    /* Die Herrschaft als Schraffur darüber – in zwei Schritten, weil das
       Streifenmuster im Bildschirmmaß liegen muss und nicht im Datenmaß.
       Erst wird die Farbe der Herrschaft auf eine Zwischenfläche gezeichnet,
       dann mit `destination-in` auf die Streifen beschnitten, dann als Ganzes
       aufgelegt. Anders herum – die Streifen ins Datenbild zu malen – wuchsen
       sie beim Zoomen mit und wurden zum Schachbrett. */
    if (this._staatBild) {
      const zwischen = this._zwischen ??= document.createElement('canvas');
      if (zwischen.width !== c.width || zwischen.height !== c.height) {
        zwischen.width = c.width;
        zwischen.height = c.height;
      }
      const z = zwischen.getContext('2d');
      z.setTransform(dichte, 0, 0, dichte, 0, 0);
      z.imageSmoothingEnabled = this._weich;
      z.clearRect(0, 0, groesse.x, groesse.y);
      for (const sx of kopien) {
        z.drawImage(this._staatBild, sx, wy, ww, wh, 0, 0, groesse.x, groesse.y);
      }
      z.globalCompositeOperation = 'destination-in';
      z.fillStyle = this._streifen(z);
      z.fillRect(0, 0, groesse.x, groesse.y);
      z.globalCompositeOperation = 'source-over';
      ctx.drawImage(zwischen, 0, 0, c.width, c.height, 0, 0, groesse.x, groesse.y);
    }
    ctx.globalAlpha = 1;
  },
});

export const religionsRaster = (optionen) => new ReligionsRaster(optionen);
