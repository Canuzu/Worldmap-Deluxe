/**
 * Die Beiblatt-Karte: wo auf der Welt liegt das, was gerade zu sehen ist.
 *
 * Ein Schlachtfeld braucht Zoomstufe 13, die Orientierung bräuchte Stufe 8.
 * Beides gleichzeitig geht nicht – aber beides nebeneinander schon. Genau
 * dafür haben Atlanten seit dem 18. Jahrhundert das Nebenkärtchen: Die
 * Hauptkarte zeigt den Gegenstand, ein kleines Blatt in der Ecke zeigt, wo er
 * liegt, mit einem Rechteck um den dargestellten Ausschnitt.
 *
 * Gezeichnet wird aus der Küstenlinie, die der Atlas ohnehin im Speicher hat –
 * es kommt kein Byte dazu. Die Meeresebene ist ein Polygon mit einem Loch je
 * Landmasse; für das Beiblatt wird die Fläche mit Meerfarbe gefüllt und in
 * jedes Loch die Landfarbe gelegt.
 */

import { zeichendichte } from './dichte.js';

const BREITE = 168;
const HOEHE = 132;

/**
 * Nur die Landstücke, die überhaupt ins Blatt fallen – einmal je Schlacht.
 *
 * `ozean` ist die Sammlung, wie `data.js` sie im Speicher hält: eine
 * FeatureCollection, kein Feld. Beides wird angenommen, damit ein Umbau
 * dort hier nicht stillschweigend eine leere Karte ergibt.
 */
function landstuecke(ozean, [l, u, r, o]) {
  const raus = [];
  const merkmale = Array.isArray(ozean) ? ozean : ozean?.features ?? [];
  for (const f of merkmale) {
    const g = f.geometry;
    const teile = g?.type === 'Polygon' ? [g.coordinates]
      : g?.type === 'MultiPolygon' ? g.coordinates : [];
    for (const p of teile) {
      // Ring 0 ist das Meer, alles Weitere sind Landmassen.
      for (let i = 1; i < p.length; i++) {
        const ring = p[i];
        let x0 = Infinity;
        let y0 = Infinity;
        let x1 = -Infinity;
        let y1 = -Infinity;
        for (const [x, y] of ring) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
        if (x1 < l || x0 > r || y1 < u || y0 > o) continue;
        raus.push(ring);
      }
    }
  }
  return raus;
}

export class Beiblatt {
  /**
   * @param {HTMLElement} wurzel Behälter, in den die Leinwand kommt.
   */
  constructor(wurzel) {
    this.wurzel = wurzel;
    this.leinwand = document.createElement('canvas');
    this.leinwand.className = 'beiblatt__blatt';
    this.ctx = this.leinwand.getContext('2d');
    this.dichte = zeichendichte();
    this.leinwand.width = Math.round(BREITE * this.dichte);
    this.leinwand.height = Math.round(HOEHE * this.dichte);
    this.leinwand.style.width = `${BREITE}px`;
    this.leinwand.style.height = `${HOEHE}px`;
    wurzel.appendChild(this.leinwand);
    this.ringe = [];
    this.ausschnitt = null;
  }

  /**
   * Auf eine Schlacht einstellen.
   *
   * `spannKm` ist die Breite des Blattes in Kilometern. Sie folgt aus der
   * Ausdehnung der Schlacht: Ein Feldzug über 150 km braucht ein weiteres
   * Blatt als ein Schlachtfeld von zwei Kilometern, sonst ist der Punkt in
   * beiden Fällen gleich nichtssagend.
   */
  setLage(mitte, spannKm, ozean) {
    const [lon, lat] = mitte;
    this.mitte = mitte;
    this.kmProLon = 111.19 * Math.max(Math.cos((lat * Math.PI) / 180), .15);
    this.pxProKm = BREITE / spannKm;
    const halbLon = spannKm / 2 / this.kmProLon;
    const halbLat = (HOEHE / this.pxProKm) / 2 / 111.19;
    this.ringe = landstuecke(ozean, [
      lon - halbLon * 1.3, lat - halbLat * 1.3, lon + halbLon * 1.3, lat + halbLat * 1.3,
    ]);
    this.zeichne();
  }

  /** Das Rechteck, das der Hauptkarte entspricht. */
  setAusschnitt(bounds) {
    this.ausschnitt = bounds;
    this.zeichne();
  }

  _punkt([lon, lat]) {
    return [
      (lon - this.mitte[0]) * this.kmProLon * this.pxProKm + BREITE / 2,
      -(lat - this.mitte[1]) * 111.19 * this.pxProKm + HOEHE / 2,
    ];
  }

  zeichne() {
    const ctx = this.ctx;
    if (!ctx || !this.mitte) return;
    ctx.setTransform(this.dichte, 0, 0, this.dichte, 0, 0);
    ctx.clearRect(0, 0, BREITE, HOEHE);

    ctx.fillStyle = 'rgba(14,26,44,.92)';
    ctx.fillRect(0, 0, BREITE, HOEHE);

    // Land. Punkte, die auf diesem Maßstab enger als ein Bildpunkt liegen,
    // werden übersprungen – das Blatt ist 168 Bildpunkte breit, die
    // Übersichtsküste hat 40.000 Stützpunkte.
    ctx.fillStyle = 'rgba(58,74,66,.95)';
    ctx.strokeStyle = 'rgba(122,158,178,.55)';
    ctx.lineWidth = .8;
    ctx.beginPath();
    for (const ring of this.ringe) {
      let lx = -1e9;
      let ly = -1e9;
      let erster = true;
      for (const q of ring) {
        const [x, y] = this._punkt(q);
        if (!erster && Math.abs(x - lx) < 1 && Math.abs(y - ly) < 1) continue;
        if (erster) { ctx.moveTo(x, y); erster = false; } else ctx.lineTo(x, y);
        lx = x;
        ly = y;
      }
      if (!erster) ctx.closePath();
    }
    ctx.fill();
    ctx.stroke();

    // Der dargestellte Ausschnitt. Wird er kleiner als ein paar Bildpunkte,
    // hilft ein Rechteck nicht mehr weiter – dann steht dort ein Fadenkreuz.
    if (this.ausschnitt) {
      const [a, b] = [this._punkt(this.ausschnitt[0]), this._punkt(this.ausschnitt[1])];
      const w = Math.abs(b[0] - a[0]);
      const h = Math.abs(b[1] - a[1]);
      const x = Math.min(a[0], b[0]);
      const y = Math.min(a[1], b[1]);
      ctx.strokeStyle = 'rgba(233,196,106,.95)';
      ctx.lineWidth = 1.4;
      if (w < 7 || h < 7) {
        const cx = x + w / 2;
        const cy = y + h / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
        ctx.moveTo(cx - 9, cy);
        ctx.lineTo(cx - 6, cy);
        ctx.moveTo(cx + 6, cy);
        ctx.lineTo(cx + 9, cy);
        ctx.moveTo(cx, cy - 9);
        ctx.lineTo(cx, cy - 6);
        ctx.moveTo(cx, cy + 6);
        ctx.lineTo(cx, cy + 9);
        ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(233,196,106,.12)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
      }
    }

    // Maßstabsleiste: ohne sie sagt das Blatt nicht, ob es zwanzig oder
    // zweitausend Kilometer zeigt.
    const zielKm = BREITE / this.pxProKm / 4;
    const stufe = [10, 20, 50, 100, 200, 500, 1000, 2000].find((k) => k >= zielKm) ?? 2000;
    const laenge = stufe * this.pxProKm;
    ctx.strokeStyle = 'rgba(226,232,240,.75)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(9, HOEHE - 9);
    ctx.lineTo(9 + laenge, HOEHE - 9);
    ctx.moveTo(9, HOEHE - 12);
    ctx.lineTo(9, HOEHE - 6);
    ctx.moveTo(9 + laenge, HOEHE - 12);
    ctx.lineTo(9 + laenge, HOEHE - 6);
    ctx.stroke();
    ctx.font = '500 9px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(226,232,240,.8)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`${stufe} km`, 11 + laenge, HOEHE - 6);
  }
}
