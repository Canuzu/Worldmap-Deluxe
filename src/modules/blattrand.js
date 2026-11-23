/**
 * Der Kartenrand: Rahmenlinie, Gradleiste, Gradzahlen – und die Lage.
 *
 * Jedes gedruckte Kartenblatt trägt einen Rand, an dem man die Lage abliest:
 * eine Leiste aus abwechselnd gefüllten und leeren Feldern, deren Grenzen auf
 * vollen Graden liegen, und daneben die Zahlen. Hier ist sie keine Zier, die
 * so aussieht, sondern gerechnet – jede Feldgrenze ist ein Längen- oder
 * Breitengrad, über Leaflets Projektion auf den Bildpunkt gebracht. Eine
 * Gradleiste, deren Striche irgendwo stehen, wäre auf einer Seite, die
 * vertrauenswürdig sein will, eine kleine Lüge in jeder Ecke.
 *
 * In Mercator liegen die Breitengrade nicht gleichmäßig: Zum Pol hin werden
 * die Felder länger. Das ist richtig so und genau das, was der Rand zeigen
 * soll – man sieht ihm die Projektion an.
 *
 * Gezeichnet als SVG über der Karte, ohne Zeigerereignisse – und zwar in
 * fünf Teilen: ein ruhender Rahmen aus Linien und Ecken, der sich nur bei
 * einer Größenänderung ändert, und vier schmale Leisten, eine je Kante. Beim
 * Schwenken wandern nur die Leisten mit; jede wird neu geschrieben, wenn sich
 * ihr Inhalt wirklich geändert hat. Vorher war der Rand eine einzige Fläche
 * über dem ganzen Fenster, die je Bild neu geschrieben, neu gesetzt und neu
 * gemalt wurde – samt zweier Lagemessungen, die den Browser zwangen, sein
 * Layout mitten in der Bewegung fertigzurechnen.
 *
 * Auf schmalen Schirmen blendet das Stilblatt den Rand aus; dann bleibt er
 * leer und kostet einen Vergleich je Bewegung.
 *
 * Unten links im Rand steht, wo der Zeiger gerade ist – in Grad und Minuten,
 * wie man es auf dem Blatt ablesen würde. Ein Instrument, das seine Lage
 * nicht nennt, ist ein Bild.
 */
import { txt } from './sprache.js';

const NS = 'http://www.w3.org/2000/svg';
/** Abstand der Leiste von der Rahmenlinie und ihre Breite (Bildpunkte). */
const LUFT = 3;
const LEISTE = 6;
/** Platz für die Zahlen außerhalb der Leiste. */
const ZAHLRAUM = 15;
const RAND = LUFT + LEISTE + ZAHLRAUM;

/** Ab dieser Breite trägt die Karte einen Rand – wörtlich wie in design.css. */
export const RAHMEN_AB = '(min-width: 1101px) and (min-height: 600px)';

/** Breite des Papierrands in Punkten – 0, wo es keinen Rand gibt. */
export function randBreite() {
  if (!matchMedia(RAHMEN_AB).matches) return 0;
  if (document.getElementById('app')?.classList.contains('is-battle')) return 0;
  const wert = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--rahmen'));
  return Number.isFinite(wert) ? wert : 0;
}

/** Teilungen, aus denen gewählt wird – in Grad. */
const TEILUNGEN = [90, 45, 30, 20, 15, 10, 5, 2, 1, .5, .25, 1 / 6, 1 / 12];

function teilungFuer(spanne) {
  // So fein, dass wenigstens vier Felder sichtbar sind, und so grob, dass es
  // nicht mehr als zwölf werden – sonst stehen die Zahlen aufeinander.
  return TEILUNGEN.find((t) => spanne / t >= 4 && spanne / t <= 12)
    ?? (spanne / TEILUNGEN[0] < 4 ? TEILUNGEN[0] : TEILUNGEN[TEILUNGEN.length - 1]);
}

function grad(wert, positiv, negativ) {
  const betrag = Math.abs(wert);
  let g = Math.floor(betrag + 1e-9);
  let m = Math.round((betrag - g) * 60);
  if (m === 60) { g += 1; m = 0; }
  const zahl = m ? `${g}° ${String(m).padStart(2, '0')}′` : `${g}°`;
  if (betrag < 1e-9 || Math.abs(betrag - 180) < 1e-9) return zahl;
  return `${zahl} ${wert > 0 ? positiv : negativ}`;
}

/** Zahl auf eine halbe Stelle runden – genauer zeichnet niemand, und gleiche
 *  Zeichenketten lassen sich dann vergleichen statt neu zu schreiben. */
const z = (v) => Math.round(v * 2) / 2;

export class Blattrand {
  /**
   * @param {L.Map} map
   * @param {HTMLElement} buehne das Element, in dem die Karte liegt
   */
  constructor(map, buehne) {
    this.map = map;
    this.buehne = buehne;
    /* Das Papier des Randes liegt ÜBER der Karte, nicht um sie herum. Die
       Karte behält ihre volle Größe: Leaflet, die Schlachtenkamera und jede
       Rechnung in Containerpunkten bleiben, wie sie waren. Vier Streifen,
       siehe design.css. */
    this.papier = document.createElement('div');
    this.papier.className = 'rahmen-papier';
    this.papier.setAttribute('aria-hidden', 'true');
    this.papier.innerHTML = '<i></i><i></i><i></i><i></i>';
    buehne.appendChild(this.papier);

    const svg = (klasse) => {
      const el = document.createElementNS(NS, 'svg');
      el.setAttribute('class', klasse);
      el.setAttribute('aria-hidden', 'true');
      buehne.appendChild(el);
      return el;
    };
    this.svg = svg('blattrand blattrand--rahmen');
    this.leisten = {
      o: svg('blattrand blattrand--leiste'),
      u: svg('blattrand blattrand--leiste'),
      l: svg('blattrand blattrand--leiste'),
      r: svg('blattrand blattrand--leiste'),
    };
    this._inhalt = { o: '', u: '', l: '', r: '' };

    // Dieselbe Grenze wie im Stilblatt (design.css, „Der Rand“). Gefragt
    // wird die Medienabfrage, nicht der berechnete Stil: Der zwänge den
    // Browser bei jedem Bild der Bewegung, seine Stile neu zu rechnen.
    this._breit = matchMedia(RAHMEN_AB);
    this._app = document.getElementById('app');
    this._rahmen = 0;
    this._mass = null;
    const planen = () => {
      if (this._rahmen) return;
      this._rahmen = requestAnimationFrame(() => { this._rahmen = 0; this.zeichnen(); });
    };
    const neuMessen = () => { this._mass = null; planen(); };
    map.on('move zoom viewreset', planen);
    // Ein Zug beginnt: Ab jetzt darf verschoben statt neu geschrieben werden.
    // Er endet: einmal sauber für den Stillstand setzen.
    map.on('movestart', () => { this._lauf = true; });
    map.on('moveend', () => { this._lauf = false; this._basis = null; planen(); });
    map.on('resize', neuMessen);
    window.addEventListener('resize', neuMessen);
    // Eine Schlacht nimmt den Rand weg und gibt ihn danach zurück.
    if (this._app) {
      let battle = this._app.classList.contains('is-battle');
      new MutationObserver(() => {
        const jetzt = this._app.classList.contains('is-battle');
        if (jetzt !== battle) { battle = jetzt; neuMessen(); }
      }).observe(this._app, { attributes: true, attributeFilter: ['class'] });
    }
    this.planen = planen;
    planen();

    this.lage = document.createElement('div');
    this.lage.className = 'rahmen-lage';
    this.lage.setAttribute('aria-hidden', 'true');
    buehne.appendChild(this.lage);
    let lageRahmen = 0;
    let letzte = null;
    map.on('mousemove', (e) => {
      // Während eines Zugs liest niemand die Lage ab – und jedes neue Wort im
      // Rand wäre eine Satzberechnung mitten in der Bewegung.
      if (!this._mass?.an || this._lauf) return;
      letzte = e.latlng;
      if (lageRahmen) return;
      lageRahmen = requestAnimationFrame(() => {
        lageRahmen = 0;
        const lng = ((((letzte.lng + 180) % 360) + 360) % 360) - 180;
        this.lage.textContent = `${grad(letzte.lat, txt('blatt.nord'), txt('blatt.sued'))}  ·  ${grad(lng, txt('blatt.ost'), txt('blatt.west'))}`;
        if (!this._lageSichtbar) { this._lageSichtbar = true; this.lage.classList.add('is-aktiv'); }
      });
    });
    map.on('mouseout', () => { this._lageSichtbar = false; this.lage.classList.remove('is-aktiv'); });
  }

  /**
   * Lage und Größe des Blatts – nur nach einer Größenänderung gemessen. Beim
   * Schwenken und Zoomen bleibt die Karte, wo sie ist; nur ihr Inhalt wandert.
   */
  _messen() {
    const an = this._breit.matches && !this._app?.classList.contains('is-battle');
    if (!an) return { an };
    const karte = this.map.getContainer().getBoundingClientRect();
    const buehne = this.buehne.getBoundingClientRect();
    const innen = randBreite();
    const w = karte.width - innen * 2;
    const h = karte.height - innen * 2;
    const mass = {
      an: w >= 40 && h >= 40,
      innen, w, h,
      links: karte.left - buehne.left + innen - RAND,
      oben: karte.top - buehne.top + innen - RAND,
    };
    if (mass.an) this._rahmenZeichnen(mass);
    return mass;
  }

  /** Der ruhende Teil: Linien, Ecken, die Lage der vier Leisten. */
  _rahmenZeichnen({ w, h, links, oben }) {
    const r = RAND;
    const aussen = LUFT + LEISTE;
    const W = w + r * 2;
    const H = h + r * 2;
    const svg = this.svg;
    svg.style.left = `${links}px`;
    svg.style.top = `${oben}px`;
    svg.setAttribute('width', String(W));
    svg.setAttribute('height', String(H));
    const teile = [
      // Rahmenlinie direkt an der Karte, Leiste außen herum.
      `<rect class="blattrand__linie" x="${r - .5}" y="${r - .5}" width="${w + 1}" height="${h + 1}"/>`,
      `<rect class="blattrand__linie" x="${r - aussen - .5}" y="${r - aussen - .5}" width="${w + aussen * 2 + 1}" height="${h + aussen * 2 + 1}"/>`,
      `<rect class="blattrand__linie blattrand__linie--fein" x="${r - LUFT - .5}" y="${r - LUFT - .5}" width="${w + LUFT * 2 + 1}" height="${h + LUFT * 2 + 1}"/>`,
    ];
    // Die vier Ecken der Leiste gefüllt, wie auf jedem gestochenen Blatt.
    const lo = r - LUFT - LEISTE;
    const ru = r + h + LUFT;
    const rr = r + w + LUFT;
    for (const [x, y] of [[lo, lo], [rr, lo], [lo, ru], [rr, ru]]) {
      teile.push(`<rect class="blattrand__feld" x="${x}" y="${y}" width="${LEISTE}" height="${LEISTE}"/>`);
    }
    svg.innerHTML = teile.join('');

    // Jede Leiste schneidet sich ihren Streifen aus demselben Koordinatensystem.
    const lage = {
      o: [0, 0, W, r],
      u: [0, r + h, W, r],
      l: [0, r, r, h],
      r: [r + w, r, r, h],
    };
    for (const [k, [x, y, bw, bh]] of Object.entries(lage)) {
      const el = this.leisten[k];
      el.style.left = `${links + x}px`;
      el.style.top = `${oben + y}px`;
      el.setAttribute('width', String(bw));
      el.setAttribute('height', String(bh));
      el.setAttribute('viewBox', `${x} ${y} ${bw} ${bh}`);
    }
  }

  _leeren() {
    if (this.svg.firstChild) this.svg.replaceChildren();
    for (const k of Object.keys(this.leisten)) {
      if (this._inhalt[k]) { this.leisten[k].replaceChildren(); this._inhalt[k] = ''; }
    }
  }

  zeichnen() {
    this._mass ??= this._messen();
    const mass = this._mass;
    if (!mass.an) { this._leeren(); return; }

    /* Beim Ziehen bleibt der Maßstab, und alles auf dem Rand wandert um
       genau die Strecke, um die die Karte wandert. Die Leisten werden dann
       nicht neu geschrieben, sondern nur verschoben – sie sind beim ersten
       Bild des Zugs für drei Fensterbreiten im Voraus gezeichnet worden. Neu
       gesetzt wird erst, wenn der Zug steht oder der Vorrat aufgebraucht ist. */
    const map = this.map;
    const zoom = map.getZoom();
    const ursprung = map.getPixelOrigin();
    const lage = map._getMapPanePos();
    const basis = this._basis;
    if (this._lauf && basis && basis.zoom === zoom && basis.ursprung.equals(ursprung)) {
      const dx = lage.x - basis.lage.x;
      const dy = lage.y - basis.lage.y;
      if (Math.abs(dx) < basis.vorratX && Math.abs(dy) < basis.vorratY) {
        this._schieben(dx, dy);
        return;
      }
    }
    // Vorrat nur, wenn der Maßstab seit dem letzten Bild steht – beim Zoomen
    // ändert sich ohnehin jedes Bild alles.
    const erweitert = this._lauf && this._letzterZoom === zoom;
    this._letzterZoom = zoom;
    this._bauen(mass, erweitert);
    this._basis = {
      zoom, ursprung, lage,
      vorratX: erweitert ? mass.w * .95 : 0,
      vorratY: erweitert ? mass.h * .95 : 0,
    };
  }

  _schieben(dx, dy) {
    const { o, u, l, r } = this._laeufer;
    const x = `translate(${dx.toFixed(1)} 0)`;
    const y = `translate(0 ${dy.toFixed(1)})`;
    o?.setAttribute('transform', x);
    u?.setAttribute('transform', x);
    l?.setAttribute('transform', y);
    r?.setAttribute('transform', y);
  }

  /**
   * Die vier Leisten schreiben.
   *
   * @param {boolean} erweitert Für einen laufenden Zug: drei Fensterbreiten
   *   und -höhen statt einer, und Zahlen bis an den Rand. Der Rand selbst
   *   schneidet ab, was über die Ecken hinausragt.
   */
  _bauen(mass, erweitert) {
    const { innen, w, h } = mass;
    const r = RAND;
    const map = this.map;

    const groesse = map.getSize();
    const vx = erweitert ? w : 0;
    const vy = erweitert ? h : 0;
    const nw = map.containerPointToLatLng([innen - vx, innen - vy]);
    const so = map.containerPointToLatLng([groesse.x - innen + vx, groesse.y - innen + vy]);
    const sichtNw = map.containerPointToLatLng([innen, innen]);
    const sichtSo = map.containerPointToLatLng([groesse.x - innen, groesse.y - innen]);
    const west = nw.lng;
    const ost = so.lng;
    const sued = Math.max(so.lat, -85);
    const nord = Math.min(nw.lat, 85);
    const mitteLat = (Math.max(sichtSo.lat, -85) + Math.min(sichtNw.lat, 85)) / 2;
    const mitteLng = (sichtNw.lng + sichtSo.lng) / 2;

    const oben = r - LUFT - LEISTE;
    const unten = r + h + LUFT;
    const links = r - LUFT - LEISTE;
    const rechts = r + w + LUFT;
    const O = txt('blatt.ost');
    const W = txt('blatt.west');
    const N = txt('blatt.nord');
    const S = txt('blatt.sued');
    const teile = { o: [], u: [], l: [], r: [] };

    /* Längengrade: oben und unten. Die Felder wechseln nach dem ganzen
       Vielfachen der Teilung, nicht nach der Reihenfolge im Bild – sonst
       sprängen sie beim Schwenken zwischen gefüllt und leer. Die Teilung
       richtet sich nach dem sichtbaren Ausschnitt, nicht nach dem Vorrat. */
    const tl = teilungFuer(sichtSo.lng - sichtNw.lng);
    const xVon = (lng) => map.latLngToContainerPoint([mitteLat, lng]).x - innen + r;
    const xMin = r - vx;
    const xMax = r + w + vx;
    for (let lng = Math.floor(west / tl) * tl; lng < ost + tl; lng += tl) {
      const x0 = z(Math.max(xMin, xVon(lng)));
      const x1 = z(Math.min(xMax, xVon(lng + tl)));
      if (x1 <= x0) continue;
      if (Math.round(lng / tl) % 2 === 0) {
        teile.o.push(`<rect class="blattrand__feld" x="${x0}" y="${oben}" width="${x1 - x0}" height="${LEISTE}"/>`);
        teile.u.push(`<rect class="blattrand__feld" x="${x0}" y="${unten}" width="${x1 - x0}" height="${LEISTE}"/>`);
      }
      const x = z(xVon(lng));
      if (erweitert || (x > r + 14 && x < r + w - 14)) {
        const lngNorm = ((((lng + 180) % 360) + 360) % 360) - 180;
        const text = grad(lngNorm, O, W);
        teile.o.push(`<text class="blattrand__zahl" x="${x}" y="${oben - 4}" text-anchor="middle">${text}</text>`);
        teile.u.push(`<text class="blattrand__zahl" x="${x}" y="${unten + LEISTE + 11}" text-anchor="middle">${text}</text>`);
      }
    }

    // Breitengrade: links und rechts, Zahlen gedreht an der Kante entlang.
    const tb = teilungFuer(Math.min(sichtNw.lat, 85) - Math.max(sichtSo.lat, -85));
    const yVon = (lat) => map.latLngToContainerPoint([lat, mitteLng]).y - innen + r;
    const yMin = r - vy;
    const yMax = r + h + vy;
    for (let lat = Math.floor(sued / tb) * tb; lat < nord + tb; lat += tb) {
      const ya = z(Math.min(yMax, yVon(lat)));
      const yb = z(Math.max(yMin, yVon(Math.min(lat + tb, 85))));
      if (ya <= yb) continue;
      if (Math.round(lat / tb) % 2 === 0) {
        teile.l.push(`<rect class="blattrand__feld" x="${links}" y="${yb}" width="${LEISTE}" height="${ya - yb}"/>`);
        teile.r.push(`<rect class="blattrand__feld" x="${rechts}" y="${yb}" width="${LEISTE}" height="${ya - yb}"/>`);
      }
      const y = z(yVon(lat));
      if (erweitert || (y > r + 18 && y < r + h - 18)) {
        const text = grad(lat, N, S);
        const xl = links - 5;
        const xr = rechts + LEISTE + 5;
        teile.l.push(`<text class="blattrand__zahl" x="${xl}" y="${y}" text-anchor="middle" transform="rotate(-90 ${xl} ${y})">${text}</text>`);
        teile.r.push(`<text class="blattrand__zahl" x="${xr}" y="${y}" text-anchor="middle" transform="rotate(90 ${xr} ${y})">${text}</text>`);
      }
    }

    /* Jede Leiste trägt ihren Inhalt in einer Gruppe, die verschoben werden
       kann, und schneidet ihn an den Ecken ab – im Vorrat liegt Leiste über
       die Ecken hinaus. Nur Leisten, deren Inhalt sich geändert hat, werden
       neu geschrieben: Wer waagerecht zieht, lässt links und rechts unberührt. */
    const schnitt = {
      o: [r, 0, w, r], u: [r, r + h, w, r], l: [0, r, r, h], r: [r + w, r, r, h],
    };
    this._laeufer ??= {};
    for (const k of ['o', 'u', 'l', 'r']) {
      const [cx, cy, cw, ch] = schnitt[k];
      const html = `<clipPath id="blattrand-${k}"><rect x="${cx}" y="${cy}" width="${cw}" height="${ch}"/></clipPath>`
        + `<g clip-path="url(#blattrand-${k})"><g>${teile[k].join('')}</g></g>`;
      if (html !== this._inhalt[k]) {
        this._inhalt[k] = html;
        this.leisten[k].innerHTML = html;
        this._laeufer[k] = this.leisten[k].lastChild.firstChild;
      } else {
        this._laeufer[k]?.removeAttribute('transform');
      }
    }
  }
}
