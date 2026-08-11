/**
 * Formatierungshelfer.
 *
 * Sie waren fest deutsch: Punkt als Tausendertrennung, „v. Chr.“, „heute“,
 * „Mio. km²“. Jetzt richten sie sich nach der gewählten Sprache – und zwar an
 * zwei Stellen, die man leicht verwechselt. Das Gebietsschema entscheidet über
 * Trennzeichen (1.492 gegen 1,492), das Wörterbuch über die Wörter (v. Chr.
 * gegen BC). Beides zusammen ergibt erst eine Jahreszahl, die ein englischer
 * Leser ohne Stocken liest.
 */
import { txt, gebietsschema } from './sprache.js';

/* Die Zahlenformate hängen am Gebietsschema und werden deshalb erst beim
   ersten Gebrauch gebaut – zu dem Zeitpunkt steht die Sprache fest. */
let nf = null;
let nf1 = null;
let fuer = null;
function formate() {
  const schema = gebietsschema();
  if (fuer !== schema) {
    nf = new Intl.NumberFormat(schema);
    nf1 = new Intl.NumberFormat(schema, { maximumFractionDigits: 1 });
    fuer = schema;
  }
  return { nf, nf1 };
}

/**
 * Jahreszahlen werden ohne Tausendertrennung geschrieben (1492, nicht 1.492).
 * Erst bei fünfstelligen Angaben wird gegliedert, sonst werden
 * „123000 v. Chr.“ unlesbar.
 */
function yearDigits(year) {
  const abs = Math.abs(year);
  return abs >= 10000 ? formate().nf.format(abs) : String(abs);
}

/** 1815 → "1815 n. Chr." bzw. "1815 AD", -500 → "500 v. Chr." bzw. "500 BC" */
export function yearText(year) {
  return `${yearDigits(year)} ${txt(year < 0 ? 'format.vorchr' : 'format.nachchr')}`;
}

/** Kurzform ohne Zusatz bei Jahren nach Christus, für Fließtext und Chips. */
export function yearShort(year) {
  return year < 0 ? `${yearDigits(year)} ${txt('format.vorchr')}` : yearDigits(year);
}

/** Zahl + Ära getrennt, damit die Zeitleiste beides unterschiedlich setzen kann. */
export function yearParts(year) {
  return { value: yearDigits(year), era: txt(year < 0 ? 'format.vorchr' : 'format.nachchr') };
}

/** Zeitraum "962–1806", offene Enden werden ausgeschrieben. */
export function rangeText(from, to) {
  if (from == null && to == null) return '';
  const a = from == null ? '?' : yearShort(from);
  const b = to == null ? txt('format.heute') : yearShort(to);
  if (from != null && to != null && from === to) return a;
  return `${a}–${b}`;
}

/** Fläche in km², ab einer Million in Millionen. */
export function areaText(km2) {
  const { nf: n, nf1: n1 } = formate();
  if (!km2 || km2 < 1) return txt('format.ohne');
  if (km2 >= 1_000_000) return `${n1.format(km2 / 1_000_000)} ${txt('format.mio')}`;
  return `${n.format(Math.round(km2))} km²`;
}

/** Entfernungen für den Maßstabsbalken. */
export function distanceText(km) {
  const { nf: n } = formate();
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 1000) return `${n.format(Math.round(km))} km`;
  return `${n.format(Math.round(km / 100) * 100)} km`;
}

export function num(value) {
  return formate().nf.format(value);
}

/** Erste Buchstaben eines Namens für das Siegel-Monogramm. */
export function initials(name) {
  const words = String(name).replace(/[^\p{L}\p{N}\s.]/gu, ' ').trim().split(/\s+/);
  const letters = words
    .filter((w) => w.length > 1 || /^\p{Lu}/u.test(w))
    .slice(0, 2)
    .map((w) => w[0]);
  return (letters.join('') || String(name).slice(0, 1)).toUpperCase();
}

/** Minimaler HTML-Escape für alle Werte aus den Datensätzen. */
export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Hebt Treffer in Suchergebnissen hervor. Arbeitet auf dem bereits
 * escapten Text, damit keine Markup-Injektion möglich ist.
 */
export function highlight(text, query) {
  const safe = esc(text);
  if (!query) return safe;
  const schema = gebietsschema();
  const i = text.toLocaleLowerCase(schema).indexOf(query.toLocaleLowerCase(schema));
  if (i < 0) return safe;
  const a = esc(text.slice(0, i));
  const b = esc(text.slice(i, i + query.length));
  const c = esc(text.slice(i + query.length));
  return `${a}<mark>${b}</mark>${c}`;
}

/** Diakritika entfernen – "Đại Việt" soll auch als "dai viet" gefunden werden. */
export function fold(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[ßẞ]/g, 'ss')
    .toLowerCase();
}
