/**
 * Kriege und Schlachten.
 *
 * Die Karte kann Zustände zeigen und – seit den Ereignissen – auch Zeitpunkte.
 * Ein Krieg ist beides nicht: Er ist eine Spanne mit zwei Seiten. Auf eine
 * Karte lässt er sich nicht als Punkt setzen, ohne zu lügen; der Dreißigjährige
 * Krieg war kein Ort in Böhmen.
 *
 * Deshalb die Zweiteilung, und zwar bewusst:
 *
 *   **Kriege stehen im Register.** Eine Liste kann, was eine Karte nicht kann:
 *   Dauer zeigen. Jeder Krieg bekommt einen Balken, auf dem markiert ist, wo
 *   das eingestellte Jahr in ihm liegt – man sieht auf einen Blick, ob man am
 *   Anfang, mitten drin oder kurz vor dem Frieden steht.
 *
 *   **Schlachten stehen auf der Karte.** Sie haben einen Ort, ein Datum und
 *   einen Ausgang. Zwei gekreuzte Klingen, wie sie auf gestochenen Tafeln seit
 *   dem 17. Jahrhundert für ein Schlachtfeld stehen.
 *
 * Zusammengehalten werden beide durch die Auswahl: Wer im Register einen Krieg
 * anklickt, sieht auf der Karte seine Seiten farbig umrissen und seine
 * Schlachten durchnummeriert in der Reihenfolge, in der sie geschlagen wurden.
 * Erst dadurch wird aus einer Liste ein Feldzug.
 */
import L from 'leaflet';
import { esc } from './format.js';

/** Die fünf Arten. Mehr wären an einer Zeile im Register nicht zu unterscheiden. */
export const KONFLIKT_ARTEN = {
  krieg: { kurz: 'Krieg', label: 'Kriege zwischen Staaten' },
  eroberung: { kurz: 'Eroberung', label: 'Eroberungszüge' },
  buergerkrieg: { kurz: 'Bürgerkrieg', label: 'Bürgerkriege' },
  aufstand: { kurz: 'Aufstand', label: 'Aufstände & Erhebungen' },
  revolution: { kurz: 'Revolution', label: 'Revolutionen' },
};

/**
 * Zwei Farben für zwei Lager.
 *
 * Kalt gegen warm, nicht rot gegen blau: Der Atlas verteilt seine Farben schon
 * an die Gemeinwesen, ein zweites kräftiges Paar darüber wäre nicht mehr
 * lesbar. Dieselben Töne benutzt der Schlachtenverlauf, damit ein Lager in
 * beiden Ansichten dasselbe Lager bleibt.
 */
export const SEITENFARBEN = ['#6f9fe0', '#d4737c', '#8fbf7a', '#c9a24d'];

/** Zwei gekreuzte Klingen – das Zeichen für ein Schlachtfeld. */
const KLINGEN = 'M17.6 2.2h3.6l-7 8.4-1.9-2.2 5.3-6.2zM2.8 2.2h3.6l12.5 14.7.9-1 2 1.7-2.4 2.7-1.6-1.4-.6.7-2.5-2.1.7-.8L2.8 2.2zm18.4 15.5l-2.4 2.7-1.6-1.4 2.4-2.7 1.6 1.4zM8.9 13.3l1.9 2.2-4.4 5.2-.6-.7-2.5 2.1-2.4-2.7 2-1.7.9 1 5.1-5.4z';

/** Kriege, die eine Zeitspanne berühren. */
export function kriegeIm(alle, [von, bis]) {
  return alle.filter((k) => (k.von ?? -Infinity) < bis && von <= (k.bis ?? Infinity));
}

/** Schlachten, deren Jahr in die Spanne fällt. */
export function schlachtenIm(alle, [von, bis]) {
  return alle.filter((s) => s.jahr >= von && s.jahr < bis);
}

export function jahrText(j) {
  return j < 0 ? `${-j} v. Chr.` : String(j);
}

/** „−218 bis −201“ als „218–201 v. Chr.“, „1939–1945“, „seit 2022“. */
export function spanneText(von, bis) {
  if (bis == null) return `seit ${jahrText(von)}`;
  if (von === bis) return jahrText(von);
  if (von < 0 && bis < 0) return `${-von}–${-bis} v. Chr.`;
  if (von < 0) return `${jahrText(von)} – ${jahrText(bis)}`;
  return `${von}–${bis}`;
}

/**
 * Wie weit ein Krieg im gegebenen Jahr fortgeschritten ist – 0 bis 1.
 * Für den Balken im Register; ein noch andauernder Krieg bekommt keinen Stand.
 */
export function fortschritt(k, jahr) {
  if (k.bis == null || k.bis <= k.von) return null;
  return Math.max(0, Math.min(1, (jahr - k.von) / (k.bis - k.von)));
}

export class KonfliktLayer {
  constructor(atlas, { onOpen } = {}) {
    this.atlas = atlas;
    this.onOpen = onOpen ?? (() => {});
    this.sichtbar = false;
    this.fenster = [-Infinity, Infinity];
    this.kriege = [];
    this.schlachten = [];
    this.imFenster = [];
    this.aktuelleKriege = [];
    this.gewaehlt = null;
    this.offen = null;

    const pane = atlas.map.createPane('konflikt');
    // Über den Ereignissen (266), unter den Namen der Gemeinwesen (270):
    // Eine Schlacht ist der stärkste Eingriff, den diese Karte kennt.
    pane.style.zIndex = '267';

    // Eigene Ebene für die Umrisse der Kriegsparteien. Sie liegt tiefer als
    // die Marken, damit die Klingen nicht unter einer Kontur verschwinden.
    const feld = atlas.map.createPane('kriegsfeld');
    feld.style.zIndex = '244';
    feld.style.pointerEvents = 'none';

    this.zeichner = L.svg({ pane: 'konflikt', padding: .3 });
    this.parteien = L.geoJSON(null, {
      pane: 'kriegsfeld',
      renderer: L.svg({ pane: 'kriegsfeld', padding: .3 }),
      interactive: false,
    });
    this.bahn = L.layerGroup([], { pane: 'konflikt' });
    this.marken = L.layerGroup([], { pane: 'konflikt' });

    atlas.map.on('zoomend moveend', () => this._zeichne());
  }

  setDaten({ kriege, schlachten }) {
    this.kriege = (kriege ?? []).slice().sort((a, b) => a.von - b.von);
    this.schlachten = (schlachten ?? []).slice().sort((a, b) => a.jahr - b.jahr);
    this._filter();
    this._zeichne();
  }

  get hatDaten() { return this.kriege.length > 0; }

  setSichtbar(on) {
    this.sichtbar = !!on;
    if (!on) { this.loese(); this.schliesse(); }
    this._zeichne();
  }

  setFenster(fenster) {
    const [a, b] = fenster;
    if (a === this.fenster[0] && b === this.fenster[1]) return;
    this.fenster = fenster;
    this._filter();
    // Ein Krieg, der im neuen Zeitschnitt nicht mehr läuft, bleibt nicht
    // ausgewählt – sonst stehen Umrisse auf der Karte, zu denen es keine
    // Zeile mehr im Register gibt.
    if (this.gewaehlt && !this.aktuelleKriege.some((k) => k.id === this.gewaehlt)) this.loese();
    this.schliesse();
    this._zeichne();
  }

  _filter() {
    this.aktuelleKriege = kriegeIm(this.kriege, this.fenster);
    this.imFenster = schlachtenIm(this.schlachten, this.fenster);
  }

  /** Schlachten des ausgewählten Krieges, sonst die des Zeitfensters. */
  get sichtbareSchlachten() {
    if (!this.gewaehlt) return this.imFenster;
    return this.schlachten.filter((s) => s.krieg === this.gewaehlt);
  }

  schlachtenZu(kriegId) {
    return this.schlachten.filter((s) => s.krieg === kriegId);
  }

  krieg(id) { return this.kriege.find((k) => k.id === id) ?? null; }

  schliesse() {
    if (this.offen) { this.atlas.map.closePopup(this.offen); this.offen = null; }
  }

  /**
   * Einen Krieg auf die Karte legen.
   *
   * Die Seiten werden in ihren Farben umrissen, seine Schlachten
   * durchnummeriert und in der Reihenfolge verbunden, in der sie geschlagen
   * wurden. Anschließend rückt der Ausschnitt so, dass alles davon zu sehen
   * ist – der Krieg bekommt seinen eigenen Maßstab.
   */
  waehle(id, { springen = true } = {}) {
    const k = this.krieg(id);
    if (!k) return null;
    this.gewaehlt = id;
    this.schliesse();
    this._zeichne();
    if (springen) this._rueckeAus(k);
    return k;
  }

  loese() {
    this.gewaehlt = null;
    this._zeichne();
  }

  _rueckeAus(k) {
    const punkte = this.schlachtenZu(k.id).map((s) => [s.ort[1], s.ort[0]]);
    punkte.push([k.ort[1], k.ort[0]]);
    const grenzen = L.latLngBounds(punkte);
    // Ein einzelner Punkt ergibt keine Ausdehnung; dann eine feste Weite.
    if (punkte.length < 2 || !grenzen.isValid() || grenzen.getNorth() - grenzen.getSouth() < .3) {
      this.atlas.map.flyTo([k.ort[1], k.ort[0]], 5.2, { duration: .9 });
      return;
    }
    // Links steht das Register, unten die Zeitleiste – der freie Teil des
    // Fensters ist nicht seine Mitte. Ohne diesen Ausgleich liegt die Hälfte
    // eines Feldzugs unter der Tafel.
    this.atlas.map.flyToBounds(grenzen, {
      duration: .9,
      maxZoom: 6.5,
      paddingTopLeft: [this.atlas.map.getSize().x > 720 ? 400 : 30, 70],
      paddingBottomRight: [90, 190],
    });
  }

  /** Eine Schlacht anspringen und aufschlagen. */
  zeige(id) {
    const s = this.schlachten.find((x) => x.id === id);
    if (!s) return;
    const ziel = [s.ort[1], s.ort[0]];
    this.atlas.map.flyTo(ziel, Math.max(this.atlas.map.getZoom(), 5.4), { duration: .8 });
    this.atlas.map.once('moveend', () => this._oeffne(s));
  }

  _oeffne(s) {
    this.offen = L.popup({
      className: 'evpop evpop--schlacht',
      maxWidth: 330,
      autoPanPadding: [30, 60],
      closeButton: true,
    })
      .setLatLng([s.ort[1], s.ort[0]])
      .setContent(this._inhalt(s))
      .openOn(this.atlas.map);
    this.onOpen(s);
  }

  _inhalt(s) {
    const k = this.krieg(s.krieg);
    const farbe = this._siegerfarbe(s);
    return `
      <div class="evpop__kicker">
        <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path d="${KLINGEN}" fill="currentColor"/></svg>
        Schlacht · ${esc(s.datum ?? jahrText(s.jahr))}
      </div>
      <h4 class="evpop__title">${esc(s.name)}</h4>
      ${s.wo ? `<p class="evpop__wo">${esc(s.wo)}</p>` : ''}
      <p class="evpop__text">${esc(s.text)}</p>
      ${s.sieger ? `<p class="evpop__sieg"><i style="--c:${esc(farbe)}"></i>Sieg: ${esc(s.sieger)}</p>` : ''}
      ${k ? `<p class="evpop__krieg">${esc(k.name)} · ${esc(spanneText(k.von, k.bis))}</p>` : ''}
      ${s.wiki ? `<a class="evpop__wiki" href="https://de.wikipedia.org/wiki/${encodeURIComponent(s.wiki)}"
        target="_blank" rel="noopener noreferrer">Bei Wikipedia nachlesen</a>` : ''}
    `;
  }

  /** Farbe der Seite, die diese Schlacht gewonnen hat. */
  _siegerfarbe(s) {
    const k = this.krieg(s.krieg);
    if (!k || !s.sieger) return 'var(--gold)';
    const i = k.seiten.findIndex((seite) => seite.name === s.sieger);
    return i < 0 ? 'var(--gold)' : SEITENFARBEN[i % SEITENFARBEN.length];
  }

  _zeichne() {
    const map = this.atlas.map;
    this.marken.clearLayers();
    this.bahn.clearLayers();
    this.parteien.clearLayers();

    const liste = this.sichtbar ? this.sichtbareSchlachten : [];
    if (!liste.length && !this.gewaehlt) {
      this.marken.remove();
      this.bahn.remove();
      this.parteien.remove();
      return;
    }
    this.parteien.addTo(map);
    this.bahn.addTo(map);
    this.marken.addTo(map);

    if (this.gewaehlt) this._zeichneParteien();

    // Ohne ausgewählten Krieg treten die Schlachten mit der Zoomstufe
    // hervor, wie die Ereignisse. Mit ausgewähltem Krieg werden alle
    // gezeigt – dann geht es um genau diesen Feldzug.
    const zoom = map.getZoom();
    const RANG_AB = { 1: 0, 2: 2.6, 3: 4 };
    const gezeigt = this.gewaehlt
      ? liste
      : liste.filter((s) => zoom >= (RANG_AB[s.rang ?? 2] ?? 0));

    if (this.gewaehlt && gezeigt.length > 1) {
      // Der Zug des Krieges: die Schlachtfelder in ihrer Reihenfolge.
      this.bahn.addLayer(L.polyline(gezeigt.map((s) => [s.ort[1], s.ort[0]]), {
        pane: 'konflikt',
        renderer: this.zeichner,
        className: 'kf-zug',
        interactive: false,
        weight: 1.5,
        opacity: .65,
        dashArray: '2 6',
        lineCap: 'round',
      }));
    }

    /*
     * Namen nur, wo Platz ist.
     *
     * Bei einem ausgewählten Weltkrieg liegen neun Schlachtfelder auf der
     * Karte, sechs davon in Europa und in der Weltansicht wenige Bildpunkte
     * auseinander. Sechs Namen übereinander sind schlechter als keiner – die
     * Ziffer an der Marke und die nummerierte Liste im Register sagen ohnehin,
     * welche welche ist.
     */
    const belegt = [];
    const passtNoch = (pt, breite) => {
      const kasten = [pt.x + 15, pt.y - 8, pt.x + 15 + breite, pt.y + 8];
      for (const b of belegt) {
        if (kasten[0] < b[2] && kasten[2] > b[0] && kasten[1] < b[3] && kasten[3] > b[1]) return false;
      }
      belegt.push(kasten);
      return true;
    };

    gezeigt.forEach((s, i) => {
      const farbe = this._siegerfarbe(s);
      const nummer = this.gewaehlt ? `<u>${i + 1}</u>` : '';
      const pt = map.latLngToContainerPoint([s.ort[1], s.ort[0]]);
      const zeigeName = this.gewaehlt && passtNoch(pt, s.name.length * 6.4);
      const marke = L.marker([s.ort[1], s.ort[0]], {
        pane: 'konflikt',
        riseOnHover: true,
        keyboard: true,
        alt: `${s.name}, ${s.datum ?? jahrText(s.jahr)}`,
        title: `${s.name} · ${s.datum ?? jahrText(s.jahr)}`,
        icon: L.divIcon({
          className: `kf${this.gewaehlt ? ' kf--gewaehlt' : ''}${zeigeName ? ' kf--benannt' : ''}`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
          html: `<i class="kf__pin" style="--c:${esc(farbe)}">
              <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path d="${KLINGEN}" fill="currentColor"/></svg>
            </i>${nummer}<b class="kf__name">${esc(s.name)}</b>`,
        }),
      });
      marke.on('click', () => this._oeffne(s));
      this.marken.addLayer(marke);
    });
  }

  /**
   * Die Kriegsparteien umreißen.
   *
   * Gezeigt wird, was der eingestellte Zeitschnitt hergibt: Wer 1942 einstellt,
   * sieht die Grenzen von 1942. Ein Staat, den es in diesem Schnitt nicht gibt
   * – weil der Krieg über mehrere Zeitschnitte läuft oder der Datensatz ihn
   * anders benennt –, wird stillschweigend übergangen. Ein fehlender Umriss ist
   * besser als ein falscher.
   */
  _zeichneParteien() {
    const k = this.krieg(this.gewaehlt);
    const epoche = this.atlas.epoch;
    if (!k || !epoche) return;

    // Zwei Züge je Fläche: außen ein breiter, blasser Saum, innen die scharfe
    // Kante. Ein einzelner Strich von zwei Bildpunkten geht im Weltmaßstab
    // zwischen den Grenzlinien der Karte unter; der Saum hebt das ganze Land
    // heraus, ohne seine eigene Farbe zu übermalen.
    const zug = (features, stil) => {
      this.parteien.addData({ type: 'FeatureCollection', features });
      for (const ebene of this.parteien.getLayers().slice(-features.length)) {
        ebene.setStyle({ lineJoin: 'round', ...stil });
      }
    };

    for (const [i, seite] of k.seiten.entries()) {
      const farbe = SEITENFARBEN[i % SEITENFARBEN.length];
      for (const name of seite.staaten ?? []) {
        const eintrag = epoche.byName.get(name);
        if (!eintrag?.features?.length) continue;
        zug(eintrag.features, {
          color: farbe, weight: 8, opacity: .22, fill: false,
        });
      }
    }
    for (const [i, seite] of k.seiten.entries()) {
      const farbe = SEITENFARBEN[i % SEITENFARBEN.length];
      for (const name of seite.staaten ?? []) {
        const eintrag = epoche.byName.get(name);
        if (!eintrag?.features?.length) continue;
        zug(eintrag.features, {
          color: farbe, weight: 2.2, opacity: .95, fillColor: farbe, fillOpacity: .2,
        });
      }
    }
  }
}
