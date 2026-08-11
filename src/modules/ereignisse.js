/**
 * Ereignisse als Marken auf der Karte.
 *
 * Der Atlas zeigt Zustände: So sah die Welt im Jahr X aus. Ein Vertrag, eine
 * Gründung, eine Seuche, eine Entdeckungsfahrt ist aber kein Zustand, sondern
 * ein Zeitpunkt – und Zeitpunkte fallen aus einer Karte heraus, die nur
 * Jahresschnitte kennt. Sie erschienen bisher nur als Textzeile im Steckbrief
 * des jeweiligen Gemeinwesens, also nur, wenn man es anklickte, und nur, wenn
 * es überhaupt eines gab. Die Seeschlacht von Lepanto gehört keinem Land.
 *
 * Diese Ebene trägt sie dort ein, wo sie geschehen sind.
 *
 * Bewusst zurückhaltend gezeichnet: eine Marke in der Akzentfarbe, kein
 * eigenes Farbschema. Die Karte verteilt ihre Farben schon an die
 * Gemeinwesen; eine zweite Farbordnung darüber wäre nicht mehr lesbar.
 * Unterschieden werden die Arten deshalb durch die Form des Zeichens, wie
 * es ein Kupferstecher gemacht hätte.
 */
import L from 'leaflet';
import { esc } from './format.js';
import { txt } from './sprache.js';

/*
 * Die Ereignisse selbst werden nicht mitgebündelt, sondern nachgeladen.
 * Eingebunden hätten sie das Programm um rund 20 kB gzip vergrößert – auf
 * dem Weg zum ersten Bild, obwohl man sie erst sieht, wenn die Karte steht.
 * scripts/build-knowledge.mjs fügt src/data/ereignisse/*.json zu
 * public/data/ereignisse.de.json zusammen.
 */

/**
 * Die sechs Arten.
 *
 * Weniger wären zu grob – ein Friedensschluss und eine Seuche haben nichts
 * gemeinsam –, mehr wären an einem 15 Bildpunkte großen Zeichen nicht mehr
 * auseinanderzuhalten.
 */
/* Kurzform und Beschriftung stehen als Schlüssel da, das Sinnbild daneben als
   Pfad. Aufgelöst wird erst beim Anzeigen – über artKurz() und artLabel(). */
export const ARTEN = {
  vertrag: {
    kurz: 'ev.umbruch.kurz',
    label: 'ev.umbruch',
    // Siegel an zwei Bändern: das Zeichen für eine besiegelte Abmachung.
    glyph: 'M12 2a5.5 5.5 0 100 11 5.5 5.5 0 000-11zm0 2.2a3.3 3.3 0 110 6.6 3.3 3.3 0 010-6.6zM8 13.6L6.2 22 12 19.1 17.8 22 16 13.6l-1.9 1.2.9 4.1-3-1.5-3 1.5.9-4.1z',
  },
  gruendung: {
    kurz: 'Gründung',
    label: 'Gründungen & Bauwerke',
    // Achtstrahliger Stern – auf alten Karten die Marke für einen Ort, der neu ist.
    glyph: 'M12 1.5l1.9 6.2 4.6-3.1-3.1 4.6 6.2 1.9-6.2 1.9 3.1 4.6-4.6-3.1-1.9 6.2-1.9-6.2-4.6 3.1 3.1-4.6L1.5 12l6.2-1.9L4.6 5.5l4.6 3.1z',
  },
  fahrt: {
    kurz: 'Fahrt',
    label: 'Fahrten & Entdeckungen',
    // Segel über einem Rumpf.
    glyph: 'M12.9 1.5v11.2h6.4L12.9 1.5zM11.3 4.9L6.6 12.7h4.7V4.9zM2.6 14.6h18.8l-2.6 5c-.4.8-1.2 1.3-2.1 1.3H7.3c-.9 0-1.7-.5-2.1-1.3l-2.6-5z',
  },
  seuche: {
    kurz: 'Katastrophe',
    label: 'Seuchen & Katastrophen',
    // Ein Herd und die Ringe, in denen sich etwas ausbreitet.
    glyph: 'M12 9.6a2.4 2.4 0 100 4.8 2.4 2.4 0 000-4.8zM7.5 7.5A6.4 6.4 0 006 12h1.9c0-1.1.4-2.2 1.1-3.1L7.5 7.5zm9 0l-1.4 1.4c.7.9 1.1 2 1.1 3.1H18a6.4 6.4 0 00-1.5-4.5zM4.4 4.4A10.7 10.7 0 001.5 12h2c0-2.2.8-4.3 2.3-6l-1.4-1.6zm15.2 0l-1.4 1.6c1.5 1.7 2.3 3.8 2.3 6h2a10.7 10.7 0 00-2.9-7.6z',
  },
  wissen: {
    kurz: 'Wissen',
    label: 'Wissen & Werke',
    // Aufgeschlagenes Buch.
    glyph: 'M11 4.9C8.6 3.5 5.9 3 3 3.2v15.3c2.9-.2 5.6.3 8 1.7V4.9zm2 0v15.3c2.4-1.4 5.1-1.9 8-1.7V3.2c-2.9-.2-5.6.3-8 1.7z',
  },
  umbruch: {
    kurz: 'Umbruch',
    label: 'Aufstände & Umbrüche',
    // Fahne am Mast.
    glyph: 'M4.6 1.8h1.8v20.4H4.6V1.8zm3.4 1.1c3.2-1.4 6.1.8 9 0 .9-.2 1.7-.6 2.4-1.1v9.9c-3.2 1.9-6.3-.5-9.4.3-.7.2-1.4.4-2 .7V2.9z',
  },
};

/**
 * Ab welcher Zoomstufe eine Marke welchen Ranges erscheint.
 *
 * Die Ausgangsansicht liegt auf Stufe 2,4 – Rang 1 und 2 sind dort also zu
 * sehen, Rang 3 erst, wenn man hineingeht. Weil das Zeitfenster ohnehin nur
 * eine Handvoll Ereignisse durchlässt, muss die Staffelung nicht streng sein;
 * sie hält nur das Kleinteilige aus der Weltansicht heraus.
 */
const RANG_AB_ZOOM = { 1: 0, 2: 2.2, 3: 3.6 };

/** Ab dieser Zoomstufe steht der Name neben der Marke; darunter nur bei Zeigerkontakt. */
const NAME_AB_ZOOM = 3.2;

/**
 * Eine Route über die Datumsgrenze führen, ohne dass sie rückwärts um die
 * Erde läuft.
 *
 * Magellan fährt von 140° West nach 145° Ost. In den projizierten Koordinaten
 * sind das 285 Grad in die falsche Richtung – Leaflet zeichnet die Linie quer
 * über Afrika. Deshalb wird jeder Punkt so um Vielfache von 360 verschoben,
 * dass er möglichst nah am vorigen liegt. Leaflet kommt mit Längengraden
 * außerhalb von ±180 zurecht und setzt die Linie dort fort, wo sie hingehört.
 */
function entwirre(weg) {
  const out = [weg[0]];
  for (let i = 1; i < weg.length; i++) {
    const [lon, lat] = weg[i];
    const vorher = out[i - 1][0];
    let l = lon;
    while (l - vorher > 180) l -= 360;
    while (vorher - l > 180) l += 360;
    out.push([l, lat]);
  }
  return out;
}

/** Zeitspanne, für die ein Zeitschnitt „die“ Karte ist – die Hälfte bis zum Nachbarn. */
export function zeitfenster(jahre, index) {
  const von = index <= 0 ? -Infinity : (jahre[index - 1] + jahre[index]) / 2;
  const bis = index >= jahre.length - 1 ? Infinity : (jahre[index] + jahre[index + 1]) / 2;
  return [von, bis];
}

/** Ereignisse, deren Jahr in ein Fenster fällt. */
export function ereignisseIm(alle, [von, bis]) {
  return alle.filter((e) => e.jahr >= von && e.jahr < bis);
}

function jahrText(e) {
  const s = (j) => (j < 0 ? `${-j} v. Chr.` : String(j));
  return e.bis && e.bis !== e.jahr ? `${s(e.jahr)} – ${s(e.bis)}` : s(e.jahr);
}

export class EventLayer {
  constructor(atlas, { onOpen } = {}) {
    this.atlas = atlas;
    this.onOpen = onOpen ?? (() => {});
    this.sichtbar = false;
    this.fenster = [-Infinity, Infinity];
    this.alle = [];
    this.liste = [];
    this.offen = null;

    const pane = atlas.map.createPane('events');
    // Über den Orten (262), unter den Namen der Gemeinwesen (270): Ein
    // Ereignis ist wichtiger als ein Ort zur Orientierung, aber die Karte
    // soll darunter lesbar bleiben.
    pane.style.zIndex = '266';

    // Eigener SVG-Zeichner: Die Karte zeichnet ihre Flächen auf Canvas, und
    // was dort landet, lässt sich nicht mit CSS einfärben – die Route bekäme
    // Leaflets Voreinstellungsblau und würde den Farbwelt-Wechsel nicht
    // mitmachen. Als SVG trägt sie ihre Klasse und damit die Akzentfarbe.
    this.zeichner = L.svg({ pane: 'events', padding: .35 });
    this.wege = L.layerGroup([], { pane: 'events' });
    this.marken = L.layerGroup([], { pane: 'events' });

    // Der Rang entscheidet erst ab einer Zoomstufe über die Sichtbarkeit –
    // in der Weltansicht stünden sonst Marken übereinander, die kilometerweit
    // auseinanderliegen.
    // Auch beim Schwenken neu setzen: Welcher Name Platz hat, hängt an den
    // Bildpunkten, und die verschieben sich mit dem Ausschnitt.
    atlas.map.on('zoomend moveend', () => this._zeichne());
  }

  /** Die nachgeladene Sammlung übernehmen. */
  setDaten(alle) {
    this.alle = (alle ?? []).slice().sort((a, b) => a.jahr - b.jahr);
    this.liste = ereignisseIm(this.alle, this.fenster);
    this._zeichne();
  }

  get hatDaten() { return this.alle.length > 0; }

  setSichtbar(on) {
    this.sichtbar = !!on;
    if (!on) this.schliesse();
    this._zeichne();
  }

  /** Zeitfenster setzen; die Karte zeigt dann die Ereignisse dieser Spanne. */
  setFenster(fenster) {
    const [a, b] = fenster;
    if (a === this.fenster[0] && b === this.fenster[1]) return;
    this.fenster = fenster;
    this.liste = ereignisseIm(this.alle, fenster);
    this.schliesse();
    this._zeichne();
  }

  /** Ereignisse im aktuellen Fenster – für Legende und Zählung. */
  get aktuelle() { return this.liste; }

  schliesse() {
    if (this.offen) { this.atlas.map.closePopup(this.offen); this.offen = null; }
  }

  /** Ein Ereignis anspringen und aufschlagen – aus der Legende heraus. */
  zeige(id) {
    const e = this.liste.find((x) => x.id === id);
    if (!e) return;
    const ziel = [e.ort[1], e.ort[0]];
    const zoom = Math.max(this.atlas.map.getZoom(), RANG_AB_ZOOM[e.rang ?? 2] + 1.4);
    this.atlas.map.flyTo(ziel, zoom, { duration: .8 });
    this.atlas.map.once('moveend', () => this._oeffne(e));
  }

  _oeffne(e) {
    // Kein eigenes Pane: Die Ereignisebene lässt Zeigerereignisse durch,
    // damit man durch sie hindurch Länder anklicken kann – im Popup müssen
    // Schließknopf und Verweis aber erreichbar bleiben.
    this.offen = L.popup({
      className: 'evpop',
      maxWidth: 320,
      autoPanPadding: [30, 60],
      closeButton: true,
    })
      .setLatLng([e.ort[1], e.ort[0]])
      .setContent(this._inhalt(e))
      .openOn(this.atlas.map);
    this.onOpen(e);
  }

  _inhalt(e) {
    const art = ARTEN[e.art] ?? ARTEN.umbruch;
    return `
      <div class="evpop__kicker">
        <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path d="${art.glyph}" fill="currentColor"/></svg>
        ${esc(txt(art.kurz))} · ${esc(jahrText(e))}
      </div>
      <h4 class="evpop__title">${esc(e.name)}</h4>
      ${e.wo ? `<p class="evpop__wo">${esc(e.wo)}</p>` : ''}
      <p class="evpop__text">${esc(e.text)}</p>
      ${e.wiki ? `<a class="evpop__wiki" href="https://de.wikipedia.org/wiki/${encodeURIComponent(e.wiki)}"
        target="_blank" rel="noopener noreferrer">Bei Wikipedia nachlesen</a>` : ''}
    `;
  }

  _zeichne() {
    const map = this.atlas.map;
    this.wege.clearLayers();
    this.marken.clearLayers();

    if (!this.sichtbar || !this.liste.length) {
      this.wege.remove();
      this.marken.remove();
      return;
    }
    this.wege.addTo(map);
    this.marken.addTo(map);

    const zoom = map.getZoom();

    // Namen nur, wo Platz ist. Zwei Marken, die auf der Weltkarte fünf
    // Bildpunkte auseinanderliegen, tragen sonst zwei Beschriftungen
    // übereinander – und über den Namen der Länder darunter. Geprüft wird
    // gegen die schon gesetzten Namen, größere Ränge zuerst.
    const belegt = [];
    const passtNoch = (pt, breite) => {
      const kasten = [pt.x + 14, pt.y - 8, pt.x + 14 + breite, pt.y + 8];
      for (const b of belegt) {
        if (kasten[0] < b[2] && kasten[2] > b[0] && kasten[1] < b[3] && kasten[3] > b[1]) return false;
      }
      belegt.push(kasten);
      return true;
    };

    const sichtbar = this.liste
      .filter((e) => zoom >= (RANG_AB_ZOOM[e.rang ?? 2] ?? 0))
      .sort((a, b) => (a.rang ?? 2) - (b.rang ?? 2));

    for (const e of sichtbar) {
      // Routen zuerst, damit die Marke am Ziel darüber liegt.
      if (e.weg?.length > 1) {
        const bahn = entwirre(e.weg);
        // Eine Weltumseglung reicht über mehr als 360 Grad und liegt damit
        // zum Teil außerhalb des sichtbaren Bereichs. Deshalb wird sie
        // zusätzlich um eine Erdumdrehung nach links und rechts versetzt
        // gezeichnet – man sieht dann von jedem Ausschnitt aus ein Stück.
        const spanne = Math.max(...bahn.map((p) => p[0])) - Math.min(...bahn.map((p) => p[0]));
        const versaetze = spanne > 180 ? [-360, 0, 360] : [0];
        for (const v of versaetze) {
          this.wege.addLayer(L.polyline(bahn.map(([lon, lat]) => [lat, lon + v]), {
            pane: 'events',
            renderer: this.zeichner,
            className: 'ev-weg',
            interactive: false,
            weight: 1.6,
            opacity: .75,
            dashArray: '1 5',
            lineCap: 'round',
          }));
        }
      }

      const art = ARTEN[e.art] ?? ARTEN.umbruch;
      const pt = map.latLngToContainerPoint([e.ort[1], e.ort[0]]);
      // 6,2 Bildpunkte je Zeichen ist für diese Schrift und Größe nah genug;
      // eine echte Messung kostete ein Canvas nur für die Breitenberechnung.
      const zeigeName = zoom >= NAME_AB_ZOOM && passtNoch(pt, e.name.length * 6.2);

      const marke = L.marker([e.ort[1], e.ort[0]], {
        pane: 'events',
        riseOnHover: true,
        keyboard: true,
        alt: `${e.name}, ${jahrText(e)}`,
        title: `${e.name} · ${jahrText(e)}`,
        icon: L.divIcon({
          className: `ev ev--${esc(e.art)}${zeigeName ? ' ev--benannt' : ''}`,
          // Echte Größe statt eines Punktes: Sonst ist die Marke selbst nur
          // ein 0×0-Kasten, an dem das Zeichen hängt – anklickbar mit der
          // Maus, aber ohne Trefferfläche für Finger und Prüfwerkzeuge.
          iconSize: [22, 22],
          iconAnchor: [11, 11],
          html: `<i class="ev__pin">
              <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path d="${art.glyph}" fill="currentColor"/></svg>
            </i><b class="ev__name">${esc(e.name)}</b>`,
        }),
      });
      marke.on('click', () => this._oeffne(e));
      this.marken.addLayer(marke);
    }
  }
}

/** Kurzform einer Ereignisart in der laufenden Sprache. */
export const artKurz = (id) => txt(ARTEN[id]?.kurz ?? id);
/** Ihre ausgeschriebene Beschriftung, wie sie in der Legende steht. */
export const artLabel = (id) => txt(ARTEN[id]?.label ?? id);
