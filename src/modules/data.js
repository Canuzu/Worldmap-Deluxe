/**
 * Datenzugriff: Zeitschnitte, Basisgeometrien und Wissensbasis.
 *
 * Aus dem TopoJSON eines Zeitschnitts wird zusätzlich der
 * Nachbarschaftsgraph abgeleitet – TopoJSON speichert gemeinsame Grenzen
 * als geteilte Bögen, zwei Gemeinwesen mit gemeinsamem Bogen grenzen also
 * aneinander. Das kostet nichts extra und liefert sowohl die Kartenfärbung
 * als auch die Nachbarliste in der Detailtafel.
 */
import { feature as topoFeature } from 'topojson-client';

const BASE = import.meta.env.BASE_URL || '/';
// __DATENSTAND__ wird beim Bauen eingesetzt (siehe vite.config.js) und hängt
// an jeder Datenanfrage, damit nach einer Veröffentlichung nicht der alte
// Zwischenspeicher ausgeliefert wird.
const STAND = typeof __DATENSTAND__ === 'string' ? __DATENSTAND__ : 'dev';
const url = (p) => `${BASE}${p}`.replace(/([^:])\/{2,}/g, '$1/') + `?v=${STAND}`;

async function getJSON(path) {
  const res = await fetch(url(path));
  if (!res.ok) throw new Error(`${path}: ${res.status} ${res.statusText}`);
  return res.json();
}

function toFeatures(topo) {
  const key = Object.keys(topo.objects)[0];
  return topoFeature(topo, topo.objects[key]);
}

/** Alle Bogen-Indizes einer TopoJSON-Geometrie einsammeln. */
function collectArcs(arcs, out) {
  for (const item of arcs) {
    if (Array.isArray(item)) collectArcs(item, out);
    else out.push(item < 0 ? ~item : item);
  }
  return out;
}

/**
 * Nachbarschaft über geteilte Bögen. Ein Bogen, der zu mehreren
 * Gemeinwesen gehört, verbindet diese miteinander.
 */
function buildAdjacency(topo, keyOf) {
  const objKey = Object.keys(topo.objects)[0];
  const geometries = topo.objects[objKey].geometries;
  const arcOwners = new Map();

  geometries.forEach((geom) => {
    const key = keyOf(geom.properties ?? {});
    if (!key) return;
    for (const arc of collectArcs(geom.arcs ?? [], [])) {
      let owners = arcOwners.get(arc);
      if (!owners) arcOwners.set(arc, (owners = new Set()));
      owners.add(key);
    }
  });

  const adjacency = new Map();
  const link = (a, b) => {
    if (a === b) return;
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    adjacency.get(a).add(b);
  };
  for (const owners of arcOwners.values()) {
    if (owners.size < 2) continue;
    const list = [...owners];
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        link(list[i], list[j]);
        link(list[j], list[i]);
      }
    }
  }
  return adjacency;
}

/** Zeitschnitt in die Form bringen, mit der Karte und Tafel arbeiten. */
function prepareEpoch(meta, topo, religion) {
  const geojson = toFeatures(topo);

  const byName = new Map();
  for (const f of geojson.features) {
    const p = f.properties;
    const name = p.n;
    if (!name) continue;
    let entry = byName.get(name);
    if (!entry) {
      entry = {
        name,
        sovereign: p.s || null,
        partOf: p.p || null,
        precision: p.b ?? 0,
        area: p.a ?? 0,
        anchor: null,
        labelBox: null,
        labelArea: -1,
        rank: p.r ?? 999,
        features: [],
        // Besatzungsmächte über diesem Gemeinwesen. Mehrere sind möglich:
        // Polen war 1940 zugleich deutsch und sowjetisch besetzt.
        occupiers: [],
        _flaechen: new Set(),
      };
      byName.set(name, entry);
    }
    entry.features.push(f);

    // Die Flächenangabe gilt je Kombination aus Gemeinwesen und Besatzer; ein
    // Land aus mehreren Teilstücken darf sie nur einmal zählen.
    const teil = p.o ?? '';
    if (!entry._flaechen.has(teil)) {
      entry._flaechen.add(teil);
      if (entry._flaechen.size > 1) entry.area += p.a ?? 0;
      if (p.o) entry.occupiers.push({ name: p.o, area: p.a ?? 0 });
    }

    // Beschriftet wird immer das flächengrößte Teilstück: Dänemark gehört
    // nach Jütland, nicht nach Grönland.
    if (p.c && (p.pa ?? 0) > entry.labelArea) {
      entry.anchor = p.c;
      entry.labelBox = p.bb ?? null;
      entry.labelArea = p.pa ?? 0;
    }
    f.properties.key = name;

    /* Religion an die Fläche heften.
     *
     * Zwei Angaben je Gemeinwesen: `rv` was die Bevölkerung glaubt, `rs`
     * wozu sich die Herrschaft bekennt. Beide getrennt zu führen ist der
     * Sinn der Ebene – wo sie auseinanderfallen, wird Geschichte erklärbar.
     * `rg` ist die Güte der Angabe, damit eine grobe Schätzung nicht
     * aussieht wie ein Beleg.
     */
    const r = religion?.[name];
    if (r) {
      [p.rv, p.rs, p.rg] = r;
      entry.religion = { volk: r[0], staat: r[1], guete: r[2], anteil: r[3] ?? null };
    }
  }

  const adjacency = buildAdjacency(topo, (p) => p.n || null);
  // Wie in der Karte: Über einem besetzten Land steht die Besatzungsmacht.
  const sovereignAdjacency = buildAdjacency(topo, (p) => p.o || p.s || p.n || null);
  const cultureAdjacency = buildAdjacency(topo, (p) => p.p || p.n || null);

  for (const [name, entry] of byName) {
    entry.neighbors = [...(adjacency.get(name) ?? [])]
      .filter((n) => byName.has(n))
      .sort((a, b) => (byName.get(b)?.area ?? 0) - (byName.get(a)?.area ?? 0));
    entry.occupiers.sort((a, b) => b.area - a.area);
    delete entry._flaechen;
  }

  const polities = [...byName.values()].sort((a, b) => b.area - a.area);

  return {
    meta,
    geojson,
    byName,
    polities,
    adjacency,
    sovereignAdjacency,
    cultureAdjacency,
  };
}

export class AtlasData {
  constructor() {
    this.index = null;
    this.eras = [];
    this.epochs = [];
    this.knowledge = null;
    this.names = null;
    this.base = {};
    this._cache = new Map();
    this._inflight = new Map();
    // Zehn vorbereitete Zeitschnitte lagen bei 170 MB Arbeitsspeicher – genug,
    // dass die Speicherbereinigung beim Schwenken spürbar dazwischenfährt.
    // Sechs decken den Vorgriff (±2) mit Reserve ab und halbieren das.
    this._maxCache = 6;
  }

  async boot(onProgress = () => {}) {
    onProgress(.08, 'Zeitschnitte werden gelesen …');
    this.index = await getJSON('data/epochs.json');
    this.eras = this.index.eras;
    this.epochs = this.index.epochs;

    onProgress(.24, 'Wissensbasis wird geladen …');
    const [knowledge, names] = await Promise.all([
      getJSON('data/knowledge/polities.de.json').catch(() => ({ entries: {} })),
      getJSON('data/knowledge/names.de.json').catch(() => ({ names: {} })),
    ]);
    this.knowledge = knowledge.entries ?? {};
    this.knowledgeMeta = knowledge.meta ?? {};
    this.names = names.names ?? {};
    this.aliases = names.aliases ?? {};

    onProgress(.46, 'Küstenlinien werden gezeichnet …');
    // Nur die Übersichtsküste blockiert den Start; die hochaufgelöste Fassung
    // und die Gewässer kommen später bzw. erst auf Anforderung.
    this.base = { ocean: await getJSON('data/base/ocean.json').then(toFeatures) };

    onProgress(.72, 'Karte wird aufgebaut …');
    return this;
  }

  /** Hochaufgelöste Küstenlinie (Natural Earth 1:10 Mio.) nachladen. */
  loadDetailedCoastline() {
    this._oceanHd ??= getJSON('data/base/ocean-hd.json')
      .then(toFeatures)
      .catch(() => null);
    return this._oceanHd;
  }

  /**
   * Ereignisse – Verträge, Gründungen, Fahrten, Seuchen, Werke, Umbrüche.
   * Nicht ins Programm gebündelt, sondern nachgeladen: Sie werden erst
   * gebraucht, wenn die Karte schon steht.
   */
  loadEreignisse() {
    this._ereignisse ??= getJSON('data/knowledge/ereignisse.de.json')
      .then((d) => d.ereignisse ?? [])
      .catch(() => []);
    return this._ereignisse;
  }

  /** Kriege und Schlachten – geholt, wenn das Register zum ersten Mal aufgeht. */
  loadKonflikte() {
    this._konflikte ??= getJSON('data/knowledge/konflikte.de.json')
      .then((d) => ({ kriege: d.kriege ?? [], schlachten: d.schlachten ?? [] }))
      .catch(() => ({ kriege: [], schlachten: [] }));
    return this._konflikte;
  }

  /** Seen und Flüsse – werden erst geholt, wenn die Ebene eingeschaltet wird. */
  loadWater() {
    this._water ??= Promise.all([
      getJSON('data/base/lakes.json').then(toFeatures).catch(() => null),
      getJSON('data/base/rivers.json').then(toFeatures).catch(() => null),
    ]).then(([lakes, rivers]) => ({ lakes, rivers }));
    return this._water;
  }

  /**
   * Orte zur Orientierung – heutige Städte als Bezugspunkte im Gelände.
   * Wird erst geholt, wenn die Ebene zugeschaltet oder weit genug
   * hineingezoomt wird.
   */
  loadPlaces() {
    this._places ??= getJSON('data/base/places.json')
      .then((d) => d.orte.map(([name, lon, lat, rang]) => ({ name, lon, lat, rang })))
      .catch(() => []);
    return this._places;
  }

  /**
   * Küstenlinie der letzten Eiszeit (Näherung über die 200-m-Tiefenlinie).
   * Wird nur für die Eiszeit-Zeitschnitte gebraucht und erst dann geholt.
   */
  loadIceAgeCoast() {
    this._iceAge ??= getJSON('data/base/ocean-eiszeit.json')
      .then(toFeatures)
      .catch(() => null);
    return this._iceAge;
  }

  /** Landschaftsnamen: Gebirge, Wüsten, Hochebenen, Tiefländer. */
  loadPhysical() {
    this._physical ??= getJSON('data/base/physical.json')
      .then((d) => d.stellen.map(([name, lon, lat, rang, art]) => ({ name, lon, lat, rang, art })))
      .catch(() => []);
    return this._physical;
  }

  epochAt(index) {
    return this.epochs[Math.max(0, Math.min(this.epochs.length - 1, index))];
  }

  /** Index des Zeitschnitts, der einem Jahr am nächsten liegt. */
  indexForYear(year) {
    let best = 0;
    let bestDelta = Infinity;
    this.epochs.forEach((e, i) => {
      const d = Math.abs(e.year - year);
      if (d < bestDelta) { bestDelta = d; best = i; }
    });
    return best;
  }

  eraById(id) {
    return this.eras.find((e) => e.id === id) ?? null;
  }

  /** Zeitschnitt laden (mit Cache und Mehrfachanfragen-Schutz). */
  /**
   * Religionsgrenzen eines Zeitschnitts – gestrichelte Linien und die Marken
   * für ihre Beschriftung. Rund 2 kB gepackt, geholt nur im Religionsmodus.
   */
  async religionsGrenzen(key) {
    this._relGrenzen ??= new Map();
    if (this._relGrenzen.has(key)) return this._relGrenzen.get(key);
    const task = getJSON(`data/religion/grenzen/${key}.json`).catch(() => null);
    this._relGrenzen.set(key, task);
    if (this._relGrenzen.size > 4) {
      this._relGrenzen.delete(this._relGrenzen.keys().next().value);
    }
    return task;
  }

  async load(index) {
    const meta = this.epochAt(index);
    if (this._cache.has(meta.key)) {
      const hit = this._cache.get(meta.key);
      this._cache.delete(meta.key);
      this._cache.set(meta.key, hit); // als zuletzt benutzt markieren
      return hit;
    }
    if (this._inflight.has(meta.key)) return this._inflight.get(meta.key);

    /* Die Religionsangaben liegen in einer eigenen Datei je Zeitschnitt –
       rund 9 kB gegen 300 kB Geometrie. Sie getrennt zu halten heißt: Wer die
       Ebene nie einschaltet, lädt sie trotzdem mit, aber sie fällt nicht ins
       Gewicht; und wer die Religionsdaten ändert, muss nicht die Geometrie
       aller 62 Zeitschnitte neu bauen. Fehlt die Datei, bleibt die Karte
       ohne Religionsangaben – die Ebene ist dann leer, aber nichts bricht. */
    const task = Promise.all([
      getJSON(meta.file),
      getJSON(`data/religion/${meta.key}.json`).then((d) => d.klassen).catch(() => null),
    ])
      .then(([topo, religion]) => {
        const prepared = prepareEpoch(meta, topo, religion);
        this._cache.set(meta.key, prepared);
        while (this._cache.size > this._maxCache) {
          this._cache.delete(this._cache.keys().next().value);
        }
        this._inflight.delete(meta.key);
        return prepared;
      })
      .catch((err) => {
        this._inflight.delete(meta.key);
        throw err;
      });

    this._inflight.set(meta.key, task);
    return task;
  }

  /**
   * Nachbarschnitte im Hintergrund holen, damit die Zeitreise flüssig läuft.
   *
   * `weit` entscheidet, wie weit vorausgeschaut wird. Beim ersten Bild reicht
   * je ein Nachbar: Mehr kostet ein halbes Megabyte für den Fall, dass jemand
   * gleich zwei Schritte macht. Sobald der Regler das erste Mal bewegt wurde,
   * ist klar, dass gereist wird – dann lohnt der weitere Vorgriff.
   */
  prefetch(index, { weit = false } = {}) {
    const ziele = weit
      ? [index + 1, index - 1, index + 2, index - 2]
      : [index + 1, index - 1];
    for (const i of ziele) {
      if (i < 0 || i >= this.epochs.length) continue;
      const key = this.epochAt(i).key;
      if (this._cache.has(key) || this._inflight.has(key)) continue;
      this.load(i).catch(() => {});
    }
  }

  /* ------------------------------------------------------ Wissensbasis */

  /** Kanonischer Schlüssel: Schreibvarianten und Tippfehler zusammenführen. */
  canonical(name) {
    if (!name) return null;
    return this.aliases[name] ?? name;
  }

  /** Deutsche Bezeichnung eines Namens aus dem Datensatz. */
  germanName(name) {
    if (!name) return '';
    const canon = this.canonical(name);
    return this.names[canon] ?? this.names[name] ?? name;
  }

  /**
   * Wissenseintrag zu einem Gemeinwesen im gegebenen Jahr.
   * Liefert den Stammeintrag und den passenden Zeitabschnitt.
   */
  lookup(name, year) {
    const canon = this.canonical(name);
    const entry = this.knowledge[canon] ?? this.knowledge[name] ?? null;
    if (!entry) return null;
    const periods = entry.periods ?? [];
    const period =
      periods.find((p) => (p.from ?? -Infinity) <= year && year <= (p.to ?? Infinity)) ??
      periods.find((p) => (p.from ?? -Infinity) <= year) ??
      periods[0] ?? null;
    return { key: canon, entry, period, ruler: herrscherZu(period, year) };
  }
}

/**
 * Den Herrscher eines Zeitabschnitts zum gewählten Jahr bestimmen.
 *
 * Ein Zeitabschnitt kann Jahrhunderte umfassen – das Osmanische Reich steht
 * von 1299 bis 1922 in einem Block. Ein einzelner Name dazu wäre eine
 * Momentaufnahme, die für die meisten Jahre falsch ist. Führt der Abschnitt
 * eine Herrscherliste, wird daraus der zum Jahr passende Eintrag gewählt.
 *
 * Ohne Liste bleibt es beim einzelnen Namen des Abschnitts; die Wissensbasis
 * lässt sich damit Stück für Stück nachrüsten, ohne dass etwas ausfällt.
 */
export function herrscherZu(period, year) {
  if (!period) return null;
  const liste = period.rulers;
  if (!liste?.length) {
    return period.ruler
      ? { name: period.ruler, title: period.rulerTitle, house: period.dynasty,
          from: period.from, to: period.to, reign: period.reign, image: period.rulerImage,
          ausListe: false }
      : null;
  }
  /*
   * Im Jahr eines Thronwechsels passen zwei Namen.
   *
   * Ludwig XIV. regiert bis 1715, Ludwig XV. ab 1715; beide Zeilen enthalten
   * das Jahr. Gezeigt wird der spätere, denn jeder Zeitschnitt beschreibt den
   * Stand am Ende des Jahres – die Karte von 1715 ist die nach Ludwigs Tod im
   * September. Über alle 62 Zeitschnitte trifft das 49 Mal zu, und in jedem
   * einzelnen Fall ist der spätere der richtige: 1900 Viktor Emanuel III.
   * statt des im Juli erschossenen Umberto, 1916 Karl I. statt des im
   * November gestorbenen Franz Joseph, 1945 der Alliierte Kontrollrat statt
   * Hitler.
   */
  const genau = liste.findLast((r) => (r.from ?? -Infinity) <= year && year <= (r.to ?? Infinity));
  // Liegt das Jahr in einer Lücke – Thronvakanz, Bürgerkrieg, oder schlicht ein
  // Abschnitt, für den die Liste nur eine Auswahl führt –, wird der zuletzt
  // Regierende gezeigt und als solcher gekennzeichnet. Lieber „zuletzt regierte“
  // als ein Name, der für das Jahr falsch wäre.
  const davor = genau ?? [...liste].reverse().find((r) => (r.from ?? -Infinity) <= year);
  const treffer = davor ?? liste[0];
  return {
    ...treffer,
    title: treffer.title ?? period.rulerTitle,
    ausListe: true,
    // Zwei verschiedene Lücken: hinter dem letzten Eintrag – oder vor dem ersten,
    // wenn die Karte ein Gemeinwesen früher zeigt, als die Liste reicht.
    nachwirkend: !genau && Boolean(davor),
    vorzeitig: !davor,
  };
}

export const atlasData = new AtlasData();
