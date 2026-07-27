/**
 * Pol der Unzugänglichkeit ("pole of inaccessibility") eines Polygons:
 * der innere Punkt mit dem größten Abstand zum Rand. Deutlich besser als
 * der Schwerpunkt, weil er bei konkaven Formen (Norwegen, Chile, Indonesien)
 * garantiert innerhalb der Fläche liegt.
 *
 * Implementiert nach Vladimir Agafonkin, "polylabel" – Quadtree-Verfeinerung
 * mit Prioritätswarteschlange. Bewusst als eigenständige, abhängigkeitsfreie
 * Variante gehalten, damit das Build-Skript keine weitere Laufzeit-Abhängigkeit
 * braucht.
 */

class Cell {
  constructor(x, y, h, rings) {
    this.x = x;
    this.y = y;
    this.h = h;
    this.d = pointToPolygonDist(x, y, rings);
    // obere Schranke für den erreichbaren Abstand innerhalb dieser Zelle
    this.max = this.d + this.h * Math.SQRT2;
  }
}

/** Vorzeichenbehafteter Abstand: positiv innerhalb, negativ außerhalb. */
function pointToPolygonDist(x, y, rings) {
  let inside = false;
  let minDist = Infinity;

  for (const ring of rings) {
    for (let i = 0, len = ring.length, j = len - 1; i < len; j = i++) {
      const a = ring[i];
      const b = ring[j];
      if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) {
        inside = !inside;
      }
      minDist = Math.min(minDist, segmentDistSq(x, y, a, b));
    }
  }
  if (minDist === Infinity) return -Infinity;
  return (inside ? 1 : -1) * Math.sqrt(minDist);
}

function segmentDistSq(px, py, a, b) {
  let x = a[0];
  let y = a[1];
  let dx = b[0] - x;
  let dy = b[1] - y;

  if (dx !== 0 || dy !== 0) {
    const t = ((px - x) * dx + (py - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = b[0];
      y = b[1];
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }
  dx = px - x;
  dy = py - y;
  return dx * dx + dy * dy;
}

/** Kleiner Max-Heap – reicht für die paar tausend Zellen pro Polygon. */
class Queue {
  constructor() { this.items = []; }
  get length() { return this.items.length; }
  push(cell) {
    const a = this.items;
    a.push(cell);
    let i = a.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (a[parent].max >= a[i].max) break;
      [a[parent], a[i]] = [a[i], a[parent]];
      i = parent;
    }
  }
  pop() {
    const a = this.items;
    const top = a[0];
    const last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let best = i;
        if (l < a.length && a[l].max > a[best].max) best = l;
        if (r < a.length && a[r].max > a[best].max) best = r;
        if (best === i) break;
        [a[best], a[i]] = [a[i], a[best]];
        i = best;
      }
    }
    return top;
  }
}

/**
 * @param {number[][][]} rings  Polygon als [aussenring, loch, …] in [x, y]
 * @param {number} precision    Abbruchgenauigkeit in Grad
 * @returns {[number, number, number]|null} [x, y, abstandZumRand]
 */
export function polylabel(rings, precision = 0.1) {
  const outer = rings[0];
  if (!outer || outer.length < 4) return null;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of outer) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  const width = maxX - minX;
  const height = maxY - minY;
  const cellSize = Math.min(width, height);
  if (cellSize === 0) return [minX, minY, 0];

  let h = cellSize / 2;
  const queue = new Queue();
  for (let x = minX; x < maxX; x += cellSize) {
    for (let y = minY; y < maxY; y += cellSize) {
      queue.push(new Cell(x + h, y + h, h, rings));
    }
  }

  // Schwerpunkt der Bounding-Box als Startkandidat
  let best = new Cell(minX + width / 2, minY + height / 2, 0, rings);

  let guard = 0;
  while (queue.length && guard++ < 200_000) {
    const cell = queue.pop();
    if (cell.d > best.d) best = cell;
    // Zelle kann das Optimum nicht mehr schlagen
    if (cell.max - best.d <= precision) continue;

    h = cell.h / 2;
    queue.push(new Cell(cell.x - h, cell.y - h, h, rings));
    queue.push(new Cell(cell.x + h, cell.y - h, h, rings));
    queue.push(new Cell(cell.x - h, cell.y + h, h, rings));
    queue.push(new Cell(cell.x + h, cell.y + h, h, rings));
  }

  return [best.x, best.y, best.d];
}

/** Ringfläche in Quadratgrad (nur für Größenvergleiche innerhalb eines Features). */
export function planarRingArea(ring) {
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    sum += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
  }
  return Math.abs(sum / 2);
}

function ringBounds(ring) {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const [x, y] of ring) {
    if (x < w) w = x;
    if (y < s) s = y;
    if (x > e) e = x;
    if (y > n) n = y;
  }
  return [w, s, e, n];
}

/**
 * Beschriftungsanker einer (Multi-)Polygon-Geometrie.
 *
 * Maßgeblich ist immer das flächengrößte Einzelpolygon – sonst landet die
 * Beschriftung Dänemarks in Grönland und wird nach der Gesamtausdehnung
 * viel zu groß gesetzt. Zurück kommen deshalb auch Ausdehnung und Fläche
 * genau dieses Polygons.
 *
 * @returns {{point:[number,number], bbox:[number,number,number,number], area:number}|null}
 */
export function anchorPoint(geometry) {
  if (!geometry) return null;
  const polys = geometry.type === 'Polygon'
    ? [geometry.coordinates]
    : geometry.type === 'MultiPolygon'
      ? geometry.coordinates
      : [];
  if (!polys.length) return null;

  let bestPoly = null;
  let bestArea = -1;
  for (const poly of polys) {
    const area = planarRingArea(poly[0] ?? []);
    if (area > bestArea) {
      bestArea = area;
      bestPoly = poly;
    }
  }
  if (!bestPoly) return null;

  // Genauigkeit an die Größe des Polygons koppeln: große Reiche brauchen
  // keine Feinauflösung, kleine Fürstentümer schon.
  const precision = Math.max(0.02, Math.min(0.6, Math.sqrt(bestArea) / 40));
  const result = polylabel(bestPoly, precision);
  if (!result) return null;

  return {
    point: [result[0], result[1]],
    bbox: ringBounds(bestPoly[0]),
    area: bestArea,
  };
}
