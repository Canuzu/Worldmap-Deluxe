/**
 * Die Zeitlinse: ein Glas, durch das man in einen anderen Kartenstand sieht.
 *
 * Wer zwei Zeitschnitte vergleichen will, springt bisher hin und her und
 * versucht sich zu merken, wo die Grenze vorhin lag. Die Linse zeigt beides
 * zugleich: draußen die gewählte Zeit, im Kreis unter dem Zeiger eine andere –
 * standardmäßig den Stand davor. Man fährt über Europa und sieht im Glas, wie
 * es vor dem Wiener Kongress aussah, ohne die Karte zu verlassen.
 *
 * Technik:
 *  - Die Flächen des anderen Zeitschnitts liegen ganz in einer eigenen,
 *    verborgenen Ebene (atlas.linseSetzen). Je Bild kopiert die Linse nur den
 *    Kreis unter dem Zeiger heraus – aus dieser Ebene, dann aus Meer und
 *    Gewässern darüber – in eine kleine eigene Leinwand. Das sind drei
 *    Kopien von ein paar hundert Punkten im Quadrat. Die Karte darunter wird
 *    dabei nicht angefasst; ein clip-path auf ihren Ebenen hätte sie bei
 *    jeder Zeigerbewegung ganz neu malen lassen (gemessen: 100 ms je Bild).
 *  - Die Fassung liegt als SVG darüber: Messingring, oben das Jahr im Glas,
 *    unten das Gemeinwesen unter dem Zeiger – in der Zeit der Linse. Die
 *    Teilung ist eine eigene Ebene und dreht sich nur per transform.
 *
 * Mit dem Finger gibt es keinen Zeiger, der schwebt. Dort steht die Linse in
 * der Mitte, und man schiebt die Karte darunter durch.
 */
import { polityAt } from './geo.js';
import { yearText } from './format.js';
import { txt } from './sprache.js';

/** Innenradius der Fassung im SVG – das Glas. Alles Übrige skaliert mit. */
const GLAS = 128;
const AUSSEN = 152;
const SEITE = AUSSEN + 8;

export class Zeitlinse {
  /**
   * @param {object} atlas      AtlasMap
   * @param {object} wahl
   * @param {Function} wahl.laden     (index) => Promise<Epoche>
   * @param {Function} wahl.jahr      (index) => Stichjahr des Zeitschnitts
   * @param {number}   wahl.anzahl    Zahl der Zeitschnitte
   * @param {Function} wahl.index     () => aktueller Zeitschnitt draußen
   * @param {Function} wahl.name      (name) => Anzeigename
   * @param {Function} [wahl.onWechsel] (an: boolean) => void
   */
  constructor(atlas, wahl) {
    this.atlas = atlas;
    this.map = atlas.map;
    this.wahl = wahl;
    this.an = false;
    this.versatz = -1;
    this.punkt = null;
    this.daten = null;
    this.lensIndex = -1;
    this._rahmen = 0;
    this._ladeZaehler = 0;
    this._grob = matchMedia('(pointer: coarse)');
    this._bauen();
    this._binden();
  }

  /* -------------------------------------------------------------- Aufbau */

  _bauen() {
    const el = document.createElement('div');
    el.className = 'linse';
    el.hidden = true;
    el.setAttribute('aria-hidden', 'true');
    const v = SEITE;
    el.innerHTML = `
      <canvas class="linse__bild"></canvas>
      <svg class="linse__fassung" viewBox="${-v} ${-v} ${v * 2} ${v * 2}">
        <defs>
          <path id="linseBogenO" d="M -135 0 A 135 135 0 0 1 135 0"/>
          <path id="linseBogenU" d="M -142 0 A 142 142 0 0 0 142 0"/>
          <radialGradient id="linseGlanz" cx="35%" cy="28%" r="80%">
            <stop offset="0" stop-color="#fff" stop-opacity=".1"/>
            <stop offset=".4" stop-color="#fff" stop-opacity="0"/>
            <stop offset=".88" stop-color="#000" stop-opacity="0"/>
            <stop offset="1" stop-color="#000" stop-opacity=".16"/>
          </radialGradient>
          <mask id="linseRing">
            <rect x="${-v}" y="${-v}" width="${v * 2}" height="${v * 2}" fill="#fff"/>
            <circle r="${GLAS}" fill="#000"/>
          </mask>
        </defs>
        <circle class="linse__glanz" r="${GLAS}" fill="url(#linseGlanz)"/>
        <circle class="linse__band" r="${AUSSEN}" mask="url(#linseRing)"/>
        <circle class="linse__kante" r="${GLAS}"/>
        <circle class="linse__kante" r="${AUSSEN}"/>
        <circle class="linse__kante linse__kante--fein" r="${AUSSEN + 4}"/>
        <text class="linse__jahr"><textPath href="#linseBogenO" startOffset="50%" text-anchor="middle"></textPath></text>
        <text class="linse__name"><textPath href="#linseBogenU" startOffset="50%" text-anchor="middle"></textPath></text>
        <path class="linse__kreuz" d="M -9 0 H -3 M 3 0 H 9 M 0 -9 V -3 M 0 3 V 9"/>
      </svg>
      <svg class="linse__skala" viewBox="${-v} ${-v} ${v * 2} ${v * 2}">
        <circle class="linse__teilung" r="${GLAS + 3.5}" pathLength="360"/>
        <circle class="linse__teilung linse__teilung--grob" r="${GLAS + 4.5}" pathLength="360"/>
      </svg>`;
    this.map.getContainer().appendChild(el);
    this.el = el;
    this.bild = el.querySelector('.linse__bild');
    this.skala = el.querySelector('.linse__skala');
    this.jahrText = el.querySelector('.linse__jahr textPath');
    this.nameText = el.querySelector('.linse__name textPath');
    this.nameEl = el.querySelector('.linse__name');

    // Die Wahl des Zeitschnitts: zwei Pfeile und das Jahr, oben über der Karte.
    const wahl = document.createElement('div');
    wahl.className = 'linsenwahl';
    wahl.hidden = true;
    wahl.innerHTML = `
      <span class="linsenwahl__t">${txt('linse.knopf').replace(/\s*\(.*\)/, '')}</span>
      <button type="button" data-schritt="-1" aria-label="${txt('linse.frueher')}">‹</button>
      <b class="linsenwahl__jahr"></b>
      <button type="button" data-schritt="1" aria-label="${txt('linse.spaeter')}">›</button>
      <button type="button" class="linsenwahl__zu" data-zu aria-label="×">×</button>`;
    document.querySelector('.stage').appendChild(wahl);
    this.wahlEl = wahl;
    this.wahlJahr = wahl.querySelector('.linsenwahl__jahr');
    wahl.addEventListener('click', (e) => {
      const schritt = e.target.closest('[data-schritt]');
      if (schritt) this.schritt(Number(schritt.dataset.schritt));
      else if (e.target.closest('[data-zu]')) this.umschalten(false);
    });
  }

  _binden() {
    const karte = this.map.getContainer();
    karte.addEventListener('pointermove', (e) => {
      if (!this.an || e.pointerType !== 'mouse') return;
      const r = karte.getBoundingClientRect();
      this.punkt = { x: e.clientX - r.left, y: e.clientY - r.top };
      this.el.classList.remove('is-weg');
      this._planen();
    });
    karte.addEventListener('pointerleave', (e) => {
      if (!this.an || e.pointerType !== 'mouse') return;
      this.el.classList.add('is-weg');
    });
    // Beim Schieben wandert die Karte unter dem Glas weiter.
    this.map.on('move', () => { if (this.an) this._planen(); });
    // Nach dem Zoomen erst malen, wenn die Ebenen neu gezeichnet sind.
    this.map.on('zoomend resize viewreset', () => { if (this.an) this._planen(); });
  }

  /** Jede Quelle meldet, wenn sie neu gezeichnet hat – dann kopiert die Linse nach. */
  _quellenBelauschen() {
    for (const { zeichner } of this.atlas.linsenQuellen()) {
      if (zeichner._linseLauscht) continue;
      zeichner._linseLauscht = true;
      const malen = zeichner._redraw;
      const linse = this;
      zeichner._redraw = function neuMalen(...args) {
        const raus = malen.apply(this, args);
        if (linse.an) linse._planen();
        return raus;
      };
    }
  }

  /* ------------------------------------------------------------ Bedienung */

  umschalten(an = !this.an) {
    if (an === this.an) return;
    this.an = an;
    this.el.hidden = !an;
    this.wahlEl.hidden = !an;
    document.getElementById('app')?.classList.toggle('is-linse', an);
    if (an) {
      if (!this.punkt || this._grob.matches) {
        const s = this.map.getSize();
        this.punkt = { x: s.x / 2, y: s.y / 2 };
      }
      this.el.classList.add('is-auf');
      requestAnimationFrame(() => requestAnimationFrame(() => this.el.classList.remove('is-auf')));
      this.zeitGeaendert();
    } else {
      this._ladeZaehler++;
      this.atlas.linseSetzen(null);
      this.lensIndex = -1;
      this.daten = null;
    }
    this.wahl.onWechsel?.(an);
  }

  /** Den Versatz zur Zeit draußen ändern: ‹ früher, › später. */
  schritt(richtung) {
    if (!this.an) return;
    const jetzt = this.wahl.index();
    const ziel = Math.max(0, Math.min(this.wahl.anzahl - 1, this.lensIndex + richtung));
    if (ziel === jetzt) {
      // Über die Zeit draußen hinwegspringen – die eigene Zeit im Glas zeigt nichts.
      const weiter = ziel + richtung;
      if (weiter < 0 || weiter >= this.wahl.anzahl) return;
      this.versatz = weiter - jetzt;
    } else {
      this.versatz = ziel - jetzt;
    }
    this.zeitGeaendert();
  }

  /** Nach jedem Zeitsprung draußen: Die Linse hält ihren Abstand. */
  async zeitGeaendert() {
    if (!this.an) return;
    const jetzt = this.wahl.index();
    let i = Math.max(0, Math.min(this.wahl.anzahl - 1, jetzt + this.versatz));
    if (i === jetzt) i = jetzt + (jetzt === 0 ? 1 : -1);
    this._jahrZeigen(i);
    if (i === this.lensIndex) return;
    const zaehler = ++this._ladeZaehler;
    const daten = await this.wahl.laden(i);
    if (zaehler !== this._ladeZaehler || !this.an) return;
    this.lensIndex = i;
    this.daten = daten;
    this.atlas.linseSetzen(daten);
    this._quellenBelauschen();
    this._nameVon = undefined;
    this._planen();
  }

  _jahrZeigen(i) {
    const text = yearText(this.wahl.jahr(i));
    this.jahrText.textContent = text;
    this.wahlJahr.textContent = text;
  }

  /* ------------------------------------------------------------- Zeichnen */

  _planen() {
    if (this._rahmen) return;
    this._rahmen = requestAnimationFrame(() => {
      this._rahmen = 0;
      this._zeichnen();
    });
  }

  _radius() {
    const s = this.map.getSize();
    return Math.round(Math.max(84, Math.min(158, Math.min(s.x, s.y) * .2)));
  }

  _zeichnen() {
    if (!this.an || !this.punkt) return;
    const r = this._radius();
    const { x, y } = this.punkt;

    // Die Fassung: ein Element, dessen Glas genau den Bildradius trifft.
    const seite = SEITE * 2 * (r / GLAS);
    if (this._seite !== seite) {
      this._seite = seite;
      this.el.style.width = this.el.style.height = `${seite.toFixed(1)}px`;
      this.bild.style.width = this.bild.style.height = `${r * 2}px`;
      this.bild.style.left = this.bild.style.top = `${(seite / 2 - r).toFixed(1)}px`;
    }
    this.el.style.transform = `translate(${(x - seite / 2).toFixed(1)}px, ${(y - seite / 2).toFixed(1)}px)`;
    // Die Teilung dreht sich mit dem Weg über die Karte – wie ein Ring, der
    // auf dem Papier abrollt.
    this.skala.style.transform = `rotate(${((x + y) * .35).toFixed(1)}deg)`;

    // Während Leaflet einen Zoom animiert, liegen die Ebenen skaliert und
    // ihre Pixel passen nicht zu den Koordinaten – dann das letzte Bild halten.
    if (!this.map._animatingZoom) this._bildMalen(this.map.containerPointToLayerPoint([x, y]), r);
    this._nameSetzen(x, y);
  }

  _bildMalen(mitte, r) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const n = Math.round(r * 2 * dpr);
    const c = this.bild;
    if (c.width !== n) c.width = c.height = n;
    const ctx = c.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, n, n);
    if (!this.daten) return;
    ctx.save();
    ctx.beginPath();
    ctx.arc(n / 2, n / 2, n / 2, 0, Math.PI * 2);
    ctx.clip();
    // Land unter allem: Wo der andere Zeitschnitt herrenloses Land hat, soll
    // nicht die Zeit von draußen durchscheinen.
    ctx.fillStyle = this.atlas._cssVar('--land', '#efe5cc');
    ctx.fillRect(0, 0, n, n);
    for (const { leinwand, lage } of this.atlas.linsenQuellen()) {
      const breite = lage.max.x - lage.min.x;
      if (!breite || !leinwand.width) continue;
      const m = leinwand.width / breite;
      try {
        ctx.drawImage(leinwand,
          (mitte.x - r - lage.min.x) * m, (mitte.y - r - lage.min.y) * m, r * 2 * m, r * 2 * m,
          0, 0, n, n);
      } catch { /* leere Leinwand */ }
    }
    ctx.restore();
  }

  _nameSetzen(x, y) {
    if (!this.daten) return;
    const ll = this.map.containerPointToLatLng([x, y]);
    const lng = ((((ll.lng + 180) % 360) + 360) % 360) - 180;
    const name = polityAt(this.daten, lng, ll.lat);
    if (name === this._nameVon) return;
    this._nameVon = name;
    this.nameText.textContent = name ? this.wahl.name(name) : txt('linse.niemand');
    this.el.classList.toggle('is-leer', !name);
    // Lange Namen laufen sonst über den Bogen hinaus.
    this.nameEl.removeAttribute('textLength');
    const lang = this.nameEl.getComputedTextLength?.() ?? 0;
    if (lang > 300) {
      this.nameEl.setAttribute('textLength', '300');
      this.nameEl.setAttribute('lengthAdjust', 'spacingAndGlyphs');
    }
  }
}
