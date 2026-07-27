/** Formatierungshelfer – durchgängig deutsche Konventionen. */

const nf = new Intl.NumberFormat('de-DE');
const nf1 = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });

/**
 * Jahreszahlen werden im Deutschen ohne Tausenderpunkt geschrieben (1492,
 * nicht 1.492). Erst bei fünfstelligen Angaben wird gegliedert, sonst
 * werden „123000 v. Chr.“ unlesbar.
 */
function yearDigits(year) {
  const abs = Math.abs(year);
  return abs >= 10000 ? nf.format(abs) : String(abs);
}

/** 1815 → "1815 n. Chr.", -500 → "500 v. Chr." */
export function yearText(year) {
  return `${yearDigits(year)} ${year < 0 ? 'v. Chr.' : 'n. Chr.'}`;
}

/** Kurzform ohne Zusatz bei Jahren nach Christus, für Fließtext und Chips. */
export function yearShort(year) {
  return year < 0 ? `${yearDigits(year)} v. Chr.` : yearDigits(year);
}

/** Zahl + Ära getrennt, damit die Zeitleiste beides unterschiedlich setzen kann. */
export function yearParts(year) {
  return { value: yearDigits(year), era: year < 0 ? 'v. Chr.' : 'n. Chr.' };
}

/** Zeitraum "962–1806", offene Enden werden ausgeschrieben. */
export function rangeText(from, to) {
  if (from == null && to == null) return '';
  const a = from == null ? '?' : yearShort(from);
  const b = to == null ? 'heute' : yearShort(to);
  if (from != null && to != null && from === to) return a;
  return `${a}–${b}`;
}

/** Fläche in km², ab einer Million in Millionen. */
export function areaText(km2) {
  if (!km2 || km2 < 1) return '–';
  if (km2 >= 1_000_000) return `${nf1.format(km2 / 1_000_000)} Mio. km²`;
  return `${nf.format(Math.round(km2))} km²`;
}

/** Entfernungen für den Maßstabsbalken. */
export function distanceText(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 1000) return `${nf.format(Math.round(km))} km`;
  return `${nf.format(Math.round(km / 100) * 100)} km`;
}

export function num(value) {
  return nf.format(value);
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
  const i = text.toLocaleLowerCase('de').indexOf(query.toLocaleLowerCase('de'));
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
