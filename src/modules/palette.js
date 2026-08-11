import { txt } from './sprache.js';

/**
 * Farbvergabe für die Karte.
 *
 * Zwei Anforderungen stehen sich gegenüber:
 *  1. Benachbarte Gemeinwesen dürfen nicht dieselbe Farbe tragen
 *     (klassisches Landkartenproblem).
 *  2. Ein Reich soll über die Zeitschnitte hinweg möglichst seine Farbe
 *     behalten, damit die Zeitreise ruhig wirkt.
 *
 * Lösung: Die Wunschfarbe ergibt sich deterministisch aus dem Namen; die
 * Nachbarschaftsprüfung weicht nur dann davon ab, wenn es sein muss.
 */

/* Handverlesene Atlas-Paletten – gedeckte Erd-, Stein- und Pflanzentöne,
   je Variante auf gleiche wahrgenommene Helligkeit abgestimmt. */
const PALETTES = {
  night: [
    '#d98a6b', '#dcb166', '#bcc06a', '#8cc088', '#66c1ac', '#63b3d8',
    '#7f9fda', '#9d92dd', '#c088cf', '#dc7ba0', '#d4737c', '#c9a06e',
    '#95ba79', '#5fc08d', '#5cbfca', '#8aa8bb', '#b08fc4', '#c67d8b',
    '#cb9464', '#b6b878', '#78c4b0', '#a8b0e0', '#d3a3c6', '#c4b085',
  ],
  parchment: [
    '#b4644a', '#b08b3c', '#8d9440', '#5f9060', '#3f9186', '#3d80ab',
    '#5a72ac', '#7367b4', '#96569f', '#b1517a', '#ab4f57', '#a07945',
    '#6b8c4c', '#3e9260', '#3a919c', '#5c7a90', '#8763a0', '#a05461',
    '#a06c3f', '#8b8d4c', '#4a9a8a', '#7a83bb', '#a878a0', '#95834f',
  ],
};

/** Grenzgüte-Modus: von „grobe Schätzung“ bis „völkerrechtlich fixiert“. */
export const PRECISION_COLORS = {
  night: { 1: '#c07f6a', 2: '#c3ac6a', 3: '#6faf8c', 0: '#7b8b9a' },
  parchment: { 1: '#a5573f', 2: '#9a7f34', 3: '#3f8560', 0: '#6c7a86' },
};

/**
 * Beschriftung einer Grenzgüte.
 *
 * Stand als festes Wörterbuch hier – vier deutsche Zeichenketten mitten in
 * einer Datei, die sonst nur Farben rechnet. Jetzt eine Funktion, weil die
 * Antwort von der Sprache abhängt und erst zur Aufrufzeit feststeht.
 */
export function precisionLabel(stufe) {
  return txt(`guete.${stufe === 1 || stufe === 2 || stufe === 3 ? stufe : 0}`);
}

/** Epochenfarben der Zeitleiste. */
export const ERA_COLORS = {
  iceage: '#6f8ba6',
  neolithic: '#7f9a6d',
  bronze: '#a98449',
  iron: '#8a7f70',
  antiquity: '#b4693f',
  earlymiddle: '#7c6ba3',
  highmiddle: '#8f5f86',
  latemiddle: '#a05a63',
  earlymodern: '#4f8c86',
  absolutism: '#3f7ba0',
  revolution: '#c0803a',
  imperialism: '#96703c',
  worldwars: '#8c4a48',
  coldwar: '#5a6f96',
  present: '#4f8f6b',
};

/** FNV-1a – klein, schnell, gut gestreut. */
function hash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function paletteFor(theme) {
  return PALETTES[theme] ?? PALETTES.night;
}

/**
 * Weist jedem Schlüssel (Gemeinwesen bzw. Oberhoheit) einen Palettenindex zu.
 *
 * @param {string[]} keys              alle vorkommenden Schlüssel
 * @param {Map<string, Set<string>>} adjacency  Nachbarschaftsgraph
 * @param {number} size                Palettengröße
 * @returns {Map<string, number>}
 */
export function assignColorIndices(keys, adjacency, size) {
  // Knoten mit vielen Nachbarn zuerst: klassische Welsh-Powell-Heuristik.
  const order = [...keys].sort((a, b) => {
    const da = adjacency.get(a)?.size ?? 0;
    const db = adjacency.get(b)?.size ?? 0;
    if (db !== da) return db - da;
    return a < b ? -1 : 1;
  });

  const result = new Map();
  for (const key of order) {
    const taken = new Set();
    for (const nb of adjacency.get(key) ?? []) {
      const c = result.get(nb);
      if (c !== undefined) taken.add(c);
    }

    const preferred = hash(key) % size;
    let chosen = -1;
    // Wunschfarbe zuerst, danach in großen Schritten durch die Palette,
    // damit Ausweichfarben deutlich unterscheidbar bleiben.
    for (let step = 0; step < size; step++) {
      const candidate = (preferred + step * 7) % size;
      if (!taken.has(candidate)) { chosen = candidate; break; }
    }
    result.set(key, chosen === -1 ? preferred : chosen);
  }
  return result;
}

/** Direkte, nachbarschaftsfreie Farbe – für Listen, Chips und Legenden. */
export function stableIndex(key, size) {
  return hash(String(key)) % size;
}

/** rgba()-Zeichenkette aus Hex + Deckkraft. */
export function withAlpha(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Aufhellen/Abdunkeln für Randlinien und Hover-Zustände. */
export function shade(hex, amount) {
  const h = hex.replace('#', '');
  const mix = (c) => {
    const v = parseInt(c, 16);
    const t = amount > 0 ? 255 : 0;
    return Math.round(v + (t - v) * Math.abs(amount)).toString(16).padStart(2, '0');
  };
  return `#${mix(h.slice(0, 2))}${mix(h.slice(2, 4))}${mix(h.slice(4, 6))}`;
}
