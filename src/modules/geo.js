/** Kleine Geometriehelfer, die ohne Kartenbibliothek auskommen. */

function pointInRing(lng, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function pointInPolygon(lng, lat, polygon) {
  if (!pointInRing(lng, lat, polygon[0] ?? [])) return false;
  for (let i = 1; i < polygon.length; i++) {
    if (pointInRing(lng, lat, polygon[i])) return false; // liegt in einem Loch
  }
  return true;
}

export function pointInFeature(lng, lat, feature) {
  const geom = feature.geometry;
  if (!geom) return false;
  if (geom.type === 'Polygon') return pointInPolygon(lng, lat, geom.coordinates);
  if (geom.type === 'MultiPolygon') {
    return geom.coordinates.some((poly) => pointInPolygon(lng, lat, poly));
  }
  return false;
}

/**
 * Welches Gemeinwesen liegt an dieser Stelle? Bei überlappenden Gebieten
 * (in der Vorgeschichte üblich) gewinnt das kleinere – es ist das
 * spezifischere.
 */
export function polityAt(epoch, lng, lat) {
  let best = null;
  let bestArea = Infinity;
  for (const f of epoch.geojson.features) {
    const name = f.properties.n;
    if (!name) continue;
    const area = f.properties.a ?? 0;
    if (area >= bestArea) continue;
    if (pointInFeature(lng, lat, f)) {
      best = name;
      bestArea = area;
    }
  }
  return best;
}
