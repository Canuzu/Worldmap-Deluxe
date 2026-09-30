/**
 * Der Kartenrand des Entwurfs „Blatt“: Rahmenlinie, Gradleiste, Gradzahlen.
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
 * Gezeichnet als SVG über der Karte, ohne Zeigerereignisse. Nur im Entwurf
 * „Blatt“ sichtbar; sonst bleibt die Ebene leer und kostet einen Vergleich
 * je Bewegung.
 */
import { txt } from './sprache.js';
import { entwurf } from './entwurf.js';

const NS = 'http://www.w3.org/2000/svg';
/** Abstand der Leiste von der Rahmenlinie und ihre Breite (Bildpunkte). */
const LUFT = 3;
const LEISTE = 6;
/** Platz für die Zahlen außerhalb der Leiste. */
const ZAHLRAUM = 15;
const RAND = LUFT + LEISTE + ZAHLRAUM;

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

export class Blattrand {
  /**
   * @param {L.Map} map
   * @param {HTMLElement} buehne das Element, in dem die Karte liegt
   */
  constructor(map, buehne) {
    this.map = map;
    this.buehne = buehne;
    this.svg = document.createElementNS(NS, 'svg');
    this.svg.classList.add('blattrand');
    this.svg.setAttribute('aria-hidden', 'true');
    buehne.appendChild(this.svg);
    this._rahmen = 0;
    const planen = () => {
      if (this._rahmen) return;
      this._rahmen = requestAnimationFrame(() => { this._rahmen = 0; this.zeichnen(); });
    };
    map.on('move zoom resize viewreset', planen);
    window.addEventListener('resize', planen);
    this.planen = planen;
    planen();
  }

  zeichnen() {
    const svg = this.svg;
    if (entwurf() !== 'blatt') {
      if (svg.firstChild) svg.replaceChildren();
      svg.style.display = 'none';
      return;
    }
    svg.style.display = '';
    const karte = this.map.getContainer().getBoundingClientRect();
    const buehne = this.buehne.getBoundingClientRect();
    const w = karte.width;
    const h = karte.height;
    if (w < 40 || h < 40) return;

    // Die Zeichenfläche reicht um den Rand über die Karte hinaus.
    svg.style.left = `${karte.left - buehne.left - RAND}px`;
    svg.style.top = `${karte.top - buehne.top - RAND}px`;
    svg.setAttribute('width', String(w + RAND * 2));
    svg.setAttribute('height', String(h + RAND * 2));

    const teile = [];
    const r = RAND;
    const aussen = LUFT + LEISTE;

    // Rahmenlinie direkt an der Karte, Leiste außen herum.
    teile.push(`<rect class="blattrand__linie" x="${r - .5}" y="${r - .5}" width="${w + 1}" height="${h + 1}"/>`);
    teile.push(`<rect class="blattrand__linie" x="${r - aussen - .5}" y="${r - aussen - .5}" width="${w + aussen * 2 + 1}" height="${h + aussen * 2 + 1}"/>`);
    teile.push(`<rect class="blattrand__linie blattrand__linie--fein" x="${r - LUFT - .5}" y="${r - LUFT - .5}" width="${w + LUFT * 2 + 1}" height="${h + LUFT * 2 + 1}"/>`);

    const b = this.map.getBounds();
    const west = b.getWest();
    const ost = b.getEast();
    const sued = Math.max(b.getSouth(), -85);
    const nord = Math.min(b.getNorth(), 85);
    const mitteLat = (sued + nord) / 2;
    const mitteLng = (west + ost) / 2;

    const oben = r - LUFT - LEISTE;
    const unten = r + h + LUFT;
    const links = r - LUFT - LEISTE;
    const rechts = r + w + LUFT;
    const O = txt('blatt.ost');
    const W = txt('blatt.west');
    const N = txt('blatt.nord');
    const S = txt('blatt.sued');

    /* Längengrade: oben und unten. Die Felder wechseln nach dem ganzen
       Vielfachen der Teilung, nicht nach der Reihenfolge im Bild – sonst
       sprängen sie beim Schwenken zwischen gefüllt und leer. */
    const tl = teilungFuer(ost - west);
    const xVon = (lng) => this.map.latLngToContainerPoint([mitteLat, lng]).x + r;
    for (let lng = Math.floor(west / tl) * tl; lng < ost + tl; lng += tl) {
      const x0 = Math.max(r, xVon(lng));
      const x1 = Math.min(r + w, xVon(lng + tl));
      if (x1 <= x0) continue;
      if (Math.round(lng / tl) % 2 === 0) {
        teile.push(`<rect class="blattrand__feld" x="${x0}" y="${oben}" width="${x1 - x0}" height="${LEISTE}"/>`);
        teile.push(`<rect class="blattrand__feld" x="${x0}" y="${unten}" width="${x1 - x0}" height="${LEISTE}"/>`);
      }
      const x = xVon(lng);
      if (x > r + 14 && x < r + w - 14) {
        const lngNorm = ((((lng + 180) % 360) + 360) % 360) - 180;
        const text = grad(lngNorm, O, W);
        teile.push(`<text class="blattrand__zahl" x="${x}" y="${oben - 4}" text-anchor="middle">${text}</text>`);
        teile.push(`<text class="blattrand__zahl" x="${x}" y="${unten + LEISTE + 11}" text-anchor="middle">${text}</text>`);
      }
    }

    // Breitengrade: links und rechts, Zahlen gedreht an der Kante entlang.
    const tb = teilungFuer(nord - sued);
    const yVon = (lat) => this.map.latLngToContainerPoint([lat, mitteLng]).y + r;
    for (let lat = Math.floor(sued / tb) * tb; lat < nord + tb; lat += tb) {
      const ya = Math.min(r + h, yVon(lat));
      const yb = Math.max(r, yVon(Math.min(lat + tb, 85)));
      if (ya <= yb) continue;
      if (Math.round(lat / tb) % 2 === 0) {
        teile.push(`<rect class="blattrand__feld" x="${links}" y="${yb}" width="${LEISTE}" height="${ya - yb}"/>`);
        teile.push(`<rect class="blattrand__feld" x="${rechts}" y="${yb}" width="${LEISTE}" height="${ya - yb}"/>`);
      }
      const y = yVon(lat);
      if (y > r + 18 && y < r + h - 18) {
        const text = grad(lat, N, S);
        const xl = links - 5;
        const xr = rechts + LEISTE + 5;
        teile.push(`<text class="blattrand__zahl" x="${xl}" y="${y}" text-anchor="middle" transform="rotate(-90 ${xl} ${y})">${text}</text>`);
        teile.push(`<text class="blattrand__zahl" x="${xr}" y="${y}" text-anchor="middle" transform="rotate(90 ${xr} ${y})">${text}</text>`);
      }
    }

    // Die vier Ecken der Leiste gefüllt, wie auf jedem gestochenen Blatt.
    for (const [x, y] of [[links, oben], [rechts, oben], [links, unten], [rechts, unten]]) {
      teile.push(`<rect class="blattrand__feld" x="${x}" y="${y}" width="${LEISTE}" height="${LEISTE}"/>`);
    }

    svg.innerHTML = teile.join('');
  }
}
