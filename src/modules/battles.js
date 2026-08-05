/**
 * Berühmte Schlachten als abspielbarer Verlauf.
 *
 * Der Atlas zeigt sonst Zustände – so sah die Welt im Jahr X aus. Eine
 * Schlacht ist aber kein Zustand, sondern eine Bewegung, und die fällt aus
 * einer Karte heraus, die nur Jahresschnitte kennt.
 *
 * Dieses Modul legt über die Karte eine eigene Zeichenfläche, auf der die
 * Truppenkörper **gleiten** statt umzuspringen. Der Unterschied ist nicht
 * Zierrat: Wer zwei Standbilder nacheinander sieht, muss sich die Bewegung
 * dazudenken; wer die Bewegung sieht, versteht sie. Genau darum geht es bei
 * einer Umfassung, einem Durchbruch, einem Rückzug.
 *
 * Drei Bausteine:
 *
 *   `Zeitachse`    – die Schlacht als durchgehende Größe statt als Folge von
 *                    Standbildern. Abspielen, Springen und freies Ziehen sind
 *                    derselbe Vorgang mit verschiedenen Antrieben.
 *   `formeUm`      – zwei Umrisse mit verschiedener Punktzahl ineinander
 *                    überführen, ohne dass die Form dabei umstülpt.
 *   `SchlachtLeinwand` – eine Leinwand über der Karte, die nur läuft, solange
 *                    eine Schlacht offen ist, und danach restlos verschwindet.
 *
 * Bewusst getrennt von den Zeitschnitten: Truppenstellungen sind keine
 * Staatsgrenzen. Sie liegen in einer eigenen Ebene, in eigenen Farben, und
 * sie verschwinden restlos, sobald man die Schlacht schließt.
 */
import L from 'leaflet';
import spec from '../data/battles.json';

export const BATTLES = spec.schlachten;

/* ------------------------------------------------------------ Choreografie */

/**
 * Wie sich ein Stationsfenster aufteilt.
 *
 * Eine Station ist kein Augenblick, sondern ein Abschnitt: Man liest, was
 * geschieht, sieht die Absicht als Pfeil, und erst dann setzt sich das Heer
 * in Bewegung. In dieser Reihenfolge – nicht gleichzeitig, sonst ist die
 * Bewegung vorbei, bevor man den Satz gelesen hat.
 *
 *   0 %  –  45 %   Die Stellungen ruhen. Die Pfeile zeichnen sich von hinten
 *                  nach vorn, die Spitze kommt zuletzt an.
 *  45 % – 100 %    Die Stellungen gleiten in die Lage der nächsten Station.
 *                  Die Pfeile verblassen dabei: Sie haben ihre Aussage
 *                  gemacht, jetzt zeigt sie die Bewegung selbst.
 */
const PFEIL_BIS = .45;
const ZUG_AB = .45;

/** Weich anfahren, weich ankommen – kein Heer bewegt sich mit einem Ruck. */
const weich = (t) => (t < .5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2);
const klemm = (v, a, b) => (v < a ? a : v > b ? b : v);

/* -------------------------------------------------------------- Umformung */

/**
 * Einen Ring auf feste Punktzahl gleichmäßig nachabtasten.
 *
 * Zwei Stellungen derselben Truppe haben in zwei Stationen selten gleich
 * viele Stützpunkte – eine gedehnte Linie braucht mehr als ein geschlossenes
 * Karree. Ohne gemeinsames Raster gibt es nichts zu überblenden.
 */
function abtasten(ring, n) {
  const p = ring.length > 1 && ring[0][0] === ring.at(-1)[0] && ring[0][1] === ring.at(-1)[1]
    ? ring.slice(0, -1) : ring;
  const m = p.length;
  const laengen = [];
  let gesamt = 0;
  for (let i = 0; i < m; i++) {
    const a = p[i];
    const b = p[(i + 1) % m];
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    laengen.push(d);
    gesamt += d;
  }
  const out = [];
  if (gesamt < 1e-12) {
    for (let i = 0; i < n; i++) out.push([p[0][0], p[0][1]]);
    return out;
  }
  const schritt = gesamt / n;
  let kante = 0;
  let rest = 0;
  for (let i = 0; i < n; i++) {
    let weg = i * schritt - rest;
    while (kante < m && weg > laengen[kante]) {
      weg -= laengen[kante];
      rest += laengen[kante];
      kante++;
    }
    const k = Math.min(kante, m - 1);
    const a = p[k];
    const b = p[(k + 1) % m];
    const f = laengen[k] > 1e-12 ? weg / laengen[k] : 0;
    out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
  }
  return out;
}

/**
 * Den Anfangspunkt des zweiten Ringes so drehen, dass er zum ersten passt.
 *
 * Ohne diesen Schritt läuft der Umriss beim Überblenden in sich zusammen und
 * stülpt sich um – die Truppe würde sich beim Vorrücken einmal umkrempeln.
 * Gesucht ist die Drehung mit dem kleinsten Abstand über alle Punktpaare.
 */
function dreheZu(a, b) {
  const n = a.length;
  let bestes = 0;
  let bester = Infinity;
  for (let d = 0; d < n; d++) {
    let s = 0;
    for (let i = 0; i < n; i++) {
      const q = b[(i + d) % n];
      const dx = a[i][0] - q[0];
      const dy = a[i][1] - q[1];
      s += dx * dx + dy * dy;
      if (s > bester) break;
    }
    if (s < bester) { bester = s; bestes = d; }
  }
  return bestes ? [...b.slice(bestes), ...b.slice(0, bestes)] : b;
}

/** Punktzahl des gemeinsamen Rasters. Fein genug für jede Form hier. */
const RASTER = 48;

/** Zwei Umrisse ineinander überführen. `f` von 0 (a) bis 1 (b). */
function formeUm(a, b, f) {
  const n = a.length;
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = [a[i][0] + (b[i][0] - a[i][0]) * f, a[i][1] + (b[i][1] - a[i][1]) * f];
  }
  return out;
}

/* ---------------------------------------------------------------- Zeichnen */

/**
 * Einen geschlossenen Zug weich in den Zeichenweg legen.
 *
 * Ein Truppenkörper ist kein Kristall. Über die Stützpunkte läuft deshalb
 * eine Catmull-Rom-Kurve, in Bézier-Stücke umgerechnet – dadurch wird aus
 * acht Ecken eine Form, die aussieht wie mit dem Stift auf eine Stabskarte
 * gelegt, und nicht wie ein Polygonzug.
 */
function weicherWeg(ctx, p, spannung = .5) {
  const n = p.length;
  if (n < 3) {
    ctx.moveTo(p[0][0], p[0][1]);
    for (let i = 1; i < n; i++) ctx.lineTo(p[i][0], p[i][1]);
    return;
  }
  ctx.moveTo(p[0][0], p[0][1]);
  for (let i = 0; i < n; i++) {
    const p0 = p[(i - 1 + n) % n];
    const p1 = p[i];
    const p2 = p[(i + 1) % n];
    const p3 = p[(i + 2) % n];
    ctx.bezierCurveTo(
      p1[0] + ((p2[0] - p0[0]) * spannung) / 6, p1[1] + ((p2[1] - p0[1]) * spannung) / 6,
      p2[0] - ((p3[0] - p1[0]) * spannung) / 6, p2[1] - ((p3[1] - p1[1]) * spannung) / 6,
      p2[0], p2[1],
    );
  }
  ctx.closePath();
}

/** Offener Zug, ebenfalls weich – für Flüsse und Höhenzüge. */
function weicheLinie(ctx, p) {
  const n = p.length;
  ctx.moveTo(p[0][0], p[0][1]);
  if (n < 3) { for (let i = 1; i < n; i++) ctx.lineTo(p[i][0], p[i][1]); return; }
  for (let i = 0; i < n - 1; i++) {
    const p0 = p[Math.max(0, i - 1)];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[Math.min(n - 1, i + 2)];
    ctx.bezierCurveTo(
      p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
      p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6,
      p2[0], p2[1],
    );
  }
}

/** Farbe mit anderer Deckkraft – die Daten führen nur Hexwerte. */
function mitAlpha(farbe, a) {
  const h = farbe.replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(v, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/**
 * Geländesignaturen.
 *
 * Bei fast jeder dieser Schlachten hat das Gelände mitentschieden: der
 * Hohlweg von Waterloo, der Schlamm von Azincourt, die Meerenge von Lepanto.
 * Ohne Andeutung sieht man auf der Karte nur farbige Flecken in einer Ebene.
 * Die Signaturen sind bewusst blass – sie sollen die Karte darunter nicht
 * ersetzen, sondern das eine Merkmal hervorheben, auf das es ankam.
 */
const GELAENDE = {
  fluss: { farbe: '#5c9ad6', breite: 3.4, linie: true },
  see: { farbe: '#5c9ad6', breite: 1.2 },
  sumpf: { farbe: '#6e8f86', breite: 0, muster: 'strich' },
  wald: { farbe: '#5f8a5a', breite: 0, muster: 'punkt' },
  hoehe: { farbe: '#a58b5f', breite: 1.4, muster: 'hoehe' },
  stadt: { farbe: '#9a9186', breite: 1.2, muster: 'raster' },
  mauer: { farbe: '#d8c9ae', breite: 3, linie: true },
  weg: { farbe: '#c4b28a', breite: 2.2, linie: true, gestrichelt: true },
};

/* ------------------------------------------------------------- Zeichenwerk */

/**
 * Eine Leinwand über der Karte, die es nur gibt, solange eine Schlacht läuft.
 *
 * Bewusst eine eigene Leinwand und keine Leaflet-Ebene aus Einzelformen: Die
 * Stellungen ändern sich bei laufender Schlacht in **jedem** Bild. Über
 * Leaflet-Ebenen hieße das, sechzig Mal in der Sekunde Objekte anzulegen,
 * zu projizieren und wieder wegzuwerfen. Hier wird stattdessen einmal je Bild
 * in Bildschirmkoordinaten gezeichnet – die Zahl der Formen liegt bei zwanzig,
 * das kostet nichts.
 */
const SchlachtLeinwand = L.Layer.extend({
  initialize(optionen) { L.setOptions(this, optionen); this._inhalt = null; },

  onAdd(map) {
    const c = this._leinwand = L.DomUtil.create('canvas', 'battle-canvas');
    c.style.pointerEvents = 'none';
    this._ctx = c.getContext('2d');
    map.getPane(this.options.pane).appendChild(c);
    map.on('move zoom viewreset resize zoomanim', this._stelleEin, this);
    this._stelleEin();
  },

  onRemove(map) {
    map.off('move zoom viewreset resize zoomanim', this._stelleEin, this);
    this._leinwand.remove();
  },

  /** Was gezeichnet werden soll – wird je Bild neu gesetzt. */
  setInhalt(inhalt) { this._inhalt = inhalt; this._zeichne(); },

  /**
   * Die Leinwand deckt genau das Fenster ab und wird bei jeder Bewegung
   * zurückgeschoben: Leaflet verschiebt die Ebene, wir zeichnen aber in
   * Bildschirmkoordinaten. Ohne das Zurückschieben wanderte sie mit.
   */
  _stelleEin() {
    const map = this._map;
    if (!map) return;
    const groesse = map.getSize();
    const c = this._leinwand;
    const dichte = Math.min(window.devicePixelRatio || 1, 2);
    if (c.width !== Math.round(groesse.x * dichte) || c.height !== Math.round(groesse.y * dichte)) {
      c.width = Math.round(groesse.x * dichte);
      c.height = Math.round(groesse.y * dichte);
      c.style.width = `${groesse.x}px`;
      c.style.height = `${groesse.y}px`;
    }
    this._dichte = dichte;
    L.DomUtil.setPosition(c, map.containerPointToLayerPoint([0, 0]));
    this._zeichne();
  },

  /** Von Längen-/Breitengrad auf Bildschirmpunkt. */
  _punkt(lonlat) {
    const p = this._map.latLngToContainerPoint([lonlat[1], lonlat[0]]);
    return [p.x, p.y];
  },

  _zeichne() {
    const ctx = this._ctx;
    if (!ctx || !this._map) return;
    const c = this._leinwand;
    ctx.setTransform(this._dichte, 0, 0, this._dichte, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    const inhalt = this._inhalt;
    if (!inhalt) return;

    for (const g of inhalt.gelaende ?? []) this._gelaende(ctx, g);
    for (const k of inhalt.koerper ?? []) this._koerper(ctx, k);
    for (const p of inhalt.pfeile ?? []) this._pfeil(ctx, p);
    this._beschriftungen(ctx, inhalt.koerper ?? []);
  },

  _gelaende(ctx, g) {
    const art = GELAENDE[g.art] ?? GELAENDE.hoehe;
    const p = g.punkte.map((q) => this._punkt(q));
    if (p.length < 2) return;
    ctx.save();
    ctx.globalAlpha = (g.deckung ?? .5) * (this._inhalt.gelaendeDeckung ?? 1);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (art.linie) {
      // Ein Fluss bekommt ein breites, blasses Bett und eine schmale Ader –
      // dieselbe Staffelung wie der Küstensaum der Karte.
      ctx.beginPath();
      weicheLinie(ctx, p);
      if (art.gestrichelt) ctx.setLineDash([7, 6]);
      ctx.strokeStyle = mitAlpha(art.farbe, .28);
      ctx.lineWidth = art.breite * 2.4;
      ctx.stroke();
      ctx.strokeStyle = mitAlpha(art.farbe, .85);
      ctx.lineWidth = art.breite;
      ctx.stroke();
      ctx.restore();
      return;
    }
    ctx.beginPath();
    weicherWeg(ctx, p);
    ctx.fillStyle = mitAlpha(art.farbe, art.muster === 'punkt' ? .3 : .22);
    ctx.fill();
    if (art.breite) {
      ctx.strokeStyle = mitAlpha(art.farbe, .7);
      ctx.lineWidth = art.breite;
      if (art.muster === 'hoehe') ctx.setLineDash([5, 4]);
      ctx.stroke();
    }
    ctx.restore();
  },

  /** Ein Truppenkörper: weiche Form, weicher Schein, klare Kante. */
  _koerper(ctx, k) {
    const p = k.punkte.map((q) => this._punkt(q));
    if (p.length < 3) return;
    ctx.save();
    ctx.globalAlpha = k.deckung;
    ctx.beginPath();
    weicherWeg(ctx, p);

    // Der Schein hebt den Körper von der Karte ab, ohne sie zuzudecken.
    // Gemessen kostet er nichts: Mit und ohne liegt die Bildrate gleich.
    ctx.shadowColor = mitAlpha(k.farbe, .55);
    ctx.shadowBlur = 16;
    ctx.fillStyle = mitAlpha(k.farbe, .3);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = mitAlpha(k.farbe, .16);
    ctx.fill();

    ctx.strokeStyle = mitAlpha(k.farbe, .95);
    ctx.lineWidth = k.geschlagen ? 1.4 : 2.4;
    ctx.lineJoin = 'round';
    if (k.geschlagen) ctx.setLineDash([6, 5]);
    ctx.stroke();
    ctx.restore();
  },

  /**
   * Ein Pfeil, der sich zeichnet.
   *
   * `k.fortschritt` läuft von 0 bis 1: Der Schaft wächst von hinten nach
   * vorn, die Spitze setzt erst im letzten Viertel auf und wächst dabei in
   * ihre Größe hinein. Ein Pfeil, der als Ganzes erscheint, zeigt eine
   * Richtung; ein Pfeil, der sich zeichnet, zeigt eine Bewegung.
   */
  _pfeil(ctx, a) {
    const p = a.punkte.map((q) => this._punkt(q));
    if (p.length < 2) return;
    const f = klemm(a.fortschritt, 0, 1);
    if (f <= 0) return;

    // Gesamtlänge, damit der Schaft in echten Bildpunkten wächst.
    const stuecke = [];
    let laenge = 0;
    for (let i = 1; i < p.length; i++) {
      const d = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
      stuecke.push(d);
      laenge += d;
    }
    if (laenge < 1) return;

    const spitzeGross = klemm(laenge * .22, 9, 34);
    const schaftZiel = laenge - spitzeGross * .8;
    const bis = klemm(f / .78, 0, 1) * schaftZiel;

    const weg = [p[0]];
    let gelaufen = 0;
    let richtung = [1, 0];
    for (let i = 0; i < stuecke.length; i++) {
      const d = stuecke[i];
      if (gelaufen + d < bis) {
        weg.push(p[i + 1]);
        gelaufen += d;
        continue;
      }
      const rest = (bis - gelaufen) / d;
      const x = p[i][0] + (p[i + 1][0] - p[i][0]) * rest;
      const y = p[i][1] + (p[i + 1][1] - p[i][1]) * rest;
      weg.push([x, y]);
      richtung = [(p[i + 1][0] - p[i][0]) / d, (p[i + 1][1] - p[i][1]) / d];
      break;
    }

    ctx.save();
    ctx.globalAlpha = a.deckung;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    weicheLinie(ctx, weg);
    ctx.shadowColor = mitAlpha(a.farbe, .5);
    ctx.shadowBlur = 10;
    ctx.strokeStyle = mitAlpha(a.farbe, .95);
    ctx.lineWidth = a.rueckzug ? 2.4 : 3.6;
    if (a.rueckzug) ctx.setLineDash([8, 6]);
    ctx.stroke();
    ctx.shadowBlur = 0;

    const spitzeF = klemm((f - .72) / .28, 0, 1);
    if (spitzeF > 0) {
      const [ux, uy] = richtung;
      const s = spitzeGross * (.4 + .6 * spitzeF);
      const ende = weg.at(-1);
      const seite = [-uy, ux];
      ctx.beginPath();
      ctx.moveTo(ende[0] + ux * s * .55, ende[1] + uy * s * .55);
      ctx.lineTo(ende[0] - ux * s * .45 + seite[0] * s * .42, ende[1] - uy * s * .45 + seite[1] * s * .42);
      ctx.lineTo(ende[0] - ux * s * .45 - seite[0] * s * .42, ende[1] - uy * s * .45 - seite[1] * s * .42);
      ctx.closePath();
      ctx.fillStyle = mitAlpha(a.farbe, .95);
      ctx.fill();
    }
    ctx.restore();
  },

  /**
   * Verband und Stärke, direkt auf die Leinwand – so laufen sie mit.
   *
   * Bei fünf Landungsabschnitten auf achtzig Kilometern liegen die
   * Schwerpunkte so dicht, dass sich die Namen überlagern. Sie weichen
   * deshalb aus: Jede Beschriftung sucht sich unter fünf Plätzen den ersten
   * freien; findet sie keinen, entfällt sie. Lieber ein Name weniger als zwei
   * übereinander, die beide unlesbar sind.
   *
   * Die größte Fläche schreibt zuerst – sie ist die, auf die es ankommt.
   */
  _beschriftungen(ctx, koerper) {
    const belegt = [];
    const frei = (x, y, w) => !belegt.some(
      (b) => Math.abs(b.x - x) < (b.w + w) / 2 + 6 && Math.abs(b.y - y) < 26,
    );

    const mit = koerper
      .filter((k) => k.name && k.deckung >= .35)
      .map((k) => {
        const p = k.punkte.map((q) => this._punkt(q));
        let x = 0;
        let y = 0;
        let x0 = Infinity;
        let x1 = -Infinity;
        for (const q of p) {
          x += q[0];
          y += q[1];
          if (q[0] < x0) x0 = q[0];
          if (q[0] > x1) x1 = q[0];
        }
        return { k, x: x / p.length, y: y / p.length, gross: x1 - x0 };
      })
      .sort((a, b) => b.gross - a.gross);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    for (const { k, x, y } of mit) {
      ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
      const w = ctx.measureText(k.name).width;
      // Mitte zuerst, dann darüber und darunter, zuletzt seitlich.
      const plaetze = [[x, y], [x, y - 26], [x, y + 26], [x, y - 46], [x, y + 46]];
      const platz = plaetze.find(([px, py]) => frei(px, py, w));
      if (!platz) continue;
      const [px, py] = platz;
      belegt.push({ x: px, y: py, w });

      ctx.globalAlpha = klemm((k.deckung - .3) / .5, 0, 1);
      ctx.strokeStyle = 'rgba(8,12,20,.85)';
      ctx.lineWidth = 3.5;
      ctx.strokeText(k.name, px, py);
      ctx.fillStyle = '#f2f5fa';
      ctx.fillText(k.name, px, py);
      if (k.staerke) {
        ctx.font = '500 10.5px ui-sans-serif, system-ui, sans-serif';
        ctx.lineWidth = 3;
        ctx.strokeText(k.staerke, px, py + 14);
        ctx.fillStyle = mitAlpha(k.farbe, .95);
        ctx.fillText(k.staerke, px, py + 14);
      }
    }
    ctx.restore();
  },
});

/* ---------------------------------------------------------------- Abspieler */

export class BattlePlayer {
  /**
   * @param {object} atlas
   * @param {{onStation?: Function, onTick?: Function}} rueckruf
   *   `onStation` bei Stationswechsel und beim Anhalten – die Tafel wird neu
   *   geschrieben. `onTick` in jedem Bild – nur der Schieber wandert.
   */
  constructor(atlas, { onStation, onTick } = {}) {
    this.atlas = atlas;
    this.onStation = onStation ?? (() => {});
    this.onTick = onTick ?? (() => {});
    this.battle = null;
    this.zeit = 0;
    this.playing = false;
    this._rahmen = null;
    this._zuletzt = 0;
    this._station = 0;
    /** Wie lange ein Stationsfenster beim Abspielen dauert. */
    this.dauer = 6200;

    const pane = atlas.map.createPane('battle');
    pane.style.zIndex = '258';
    pane.style.pointerEvents = 'none';
    this.leinwand = new SchlachtLeinwand({ pane: 'battle' });
  }

  get count() { return this.battle?.stationen.length ?? 0; }
  get index() { return this._station; }
  get station() { return this.battle?.stationen[this._station] ?? null; }

  /** Zeitspanne der ganzen Schlacht in den Einheiten der Daten. */
  get spanne() {
    const st = this.battle?.stationen;
    if (!st?.length) return [0, 1];
    return [st[0].t, st.at(-1).t];
  }

  /** Fortschritt von 0 bis 1 über die ganze Schlacht – für den Schieber. */
  get fortschritt() {
    const [a, b] = this.spanne;
    return b > a ? klemm((this.zeit - a) / (b - a), 0, 1) : 0;
  }

  /** Schlacht öffnen: passender Ausschnitt, Station 1, Gelände blendet ein. */
  start(id) {
    const battle = BATTLES.find((b) => b.id === id);
    if (!battle) return null;
    this.battle = battle;
    this.farben = new Map(battle.parteien.map((p) => [p.id, p.farbe]));
    this._vorrat = new Map();
    this.zeit = battle.stationen[0].t;
    this._station = 0;
    this._auf = performance.now();
    if (!this.leinwand._map) this.leinwand.addTo(this.atlas.map);
    this.atlas.map.flyTo([battle.mitte[1], battle.mitte[0]], battle.zoom, { duration: 1.2 });
    this._bild();
    this.onStation(this);
    return battle;
  }

  close() {
    this.stop();
    this.battle = null;
    if (this.leinwand._map) this.atlas.map.removeLayer(this.leinwand);
  }

  stop() {
    this.playing = false;
    if (this._rahmen) cancelAnimationFrame(this._rahmen);
    this._rahmen = null;
  }

  play() {
    if (!this.battle || this.playing) return;
    const [a, b] = this.spanne;
    if (this.zeit >= b - 1e-9) this.zeit = a;
    this.playing = true;
    this._zuletzt = performance.now();
    this.onStation(this);
    this._laufe();
  }

  toggle() { this.playing ? (this.stop(), this.onStation(this)) : this.play(); }

  /** Auf eine Station springen – der Verlauf setzt dort neu an. */
  goTo(index) {
    if (!this.battle) return;
    const i = klemm(Math.round(index), 0, this.count - 1);
    this.setZeit(this.battle.stationen[i].t);
  }

  step(dir) {
    if (!this.battle) return;
    // Beim Zurückgehen zählt die Station, in der man *steht*, nicht die davor:
    // Wer mitten in Station 3 zurückspringt, will an deren Anfang.
    const teil = this._teil();
    const ziel = dir < 0 && teil > .02 ? this._station : this._station + dir;
    if (ziel >= this.count) { this.stop(); this.goTo(this.count - 1); return; }
    this.goTo(ziel);
  }

  /** Freies Ziehen: Fortschritt von 0 bis 1 über die ganze Schlacht. */
  setFortschritt(f) {
    const [a, b] = this.spanne;
    this.setZeit(a + (b - a) * klemm(f, 0, 1));
  }

  setZeit(t) {
    if (!this.battle) return;
    const [a, b] = this.spanne;
    this.zeit = klemm(t, a, b);
    const vorher = this._station;
    this._bild();
    if (this._station !== vorher) this.onStation(this);
    else this.onTick(this);
  }

  /* ------------------------------------------------------------- Ablauf */

  _laufe() {
    this._rahmen = requestAnimationFrame((jetzt) => {
      const dt = Math.min(jetzt - this._zuletzt, 120);
      this._zuletzt = jetzt;
      const st = this.battle?.stationen;
      if (!st) return;
      // Jedes Stationsfenster dauert gleich lang, unabhängig davon, wie viele
      // Stunden es in der Schlacht umfasst: Sonst rauschte der eine Abschnitt
      // vorbei, während man beim anderen wartet.
      const i = Math.min(this._station, this.count - 2);
      const fenster = i >= 0 && st[i + 1] ? st[i + 1].t - st[i].t : 1;
      const vorher = this._station;
      this.zeit += (dt / this.dauer) * fenster;
      const ende = this.spanne[1];
      if (this.zeit >= ende) {
        this.zeit = ende;
        this._bild();
        this.stop();
        this.onStation(this);
        return;
      }
      this._bild();
      if (this._station !== vorher) this.onStation(this); else this.onTick(this);
      this._laufe();
    });
  }

  /** Anteil innerhalb des laufenden Stationsfensters, 0 bis 1. */
  _teil() {
    const st = this.battle?.stationen;
    if (!st) return 0;
    const i = this._station;
    if (i >= this.count - 1) return 1;
    const w = st[i + 1].t - st[i].t;
    return w > 1e-12 ? klemm((this.zeit - st[i].t) / w, 0, 1) : 0;
  }

  /* ------------------------------------------------------------ Zeichnen */

  /** Umrisse einer Stellung auf dem gemeinsamen Raster, gepuffert. */
  _ring(i, id) {
    const schluessel = `${i}\u0000${id}`;
    if (this._vorrat.has(schluessel)) return this._vorrat.get(schluessel);
    const s = this.battle.stationen[i]?.stellungen.find((x) => x.id === id && x.form !== 'pfeil');
    const r = s ? abtasten(s.punkte, RASTER) : null;
    this._vorrat.set(schluessel, r);
    return r;
  }

  /**
   * Ein Bild aufbauen: Welcher Körper steht wo, welcher Pfeil ist wie weit.
   *
   * Hier liegt die eigentliche Choreografie. Innerhalb eines Stationsfensters
   * ruhen die Körper zuerst, während sich die Pfeile zeichnen; danach gleiten
   * sie in die Lage der nächsten Station, und die Pfeile verblassen.
   */
  _bild() {
    const b = this.battle;
    if (!b) return;
    const st = b.stationen;

    let i = 0;
    while (i < st.length - 1 && st[i + 1].t <= this.zeit + 1e-9) i++;
    this._station = i;

    const teil = this._teil();
    const naechste = st[i + 1] ?? null;
    const zug = naechste ? weich(klemm((teil - ZUG_AB) / (1 - ZUG_AB), 0, 1)) : 0;

    const koerper = [];
    const pfeile = [];
    const gesehen = new Set();

    for (const s of st[i].stellungen) {
      if (s.form === 'pfeil') {
        pfeile.push({
          punkte: s.punkte,
          farbe: this.farben.get(s.partei) ?? '#8a94a6',
          rueckzug: !!s.rueckzug,
          fortschritt: klemm(teil / PFEIL_BIS, 0, 1),
          // Der Pfeil hat seine Aussage gemacht, sobald die Bewegung läuft.
          deckung: 1 - weich(klemm((teil - .72) / .28, 0, 1)) * .85,
        });
        continue;
      }
      gesehen.add(s.id);
      const a = this._ring(i, s.id);
      if (!a) continue;
      const zielRoh = naechste ? this._ring(i + 1, s.id) : null;
      const ziel = zielRoh ? dreheZu(a, zielRoh) : null;
      koerper.push({
        punkte: ziel && zug > 0 ? formeUm(a, ziel, zug) : a,
        farbe: this.farben.get(s.partei) ?? '#8a94a6',
        name: s.name ?? '',
        staerke: s.staerke ?? '',
        geschlagen: !!s.geschlagen,
        // Wer in der nächsten Station fehlt, ist geschlagen oder abgezogen –
        // er verblasst, statt zu verschwinden.
        deckung: ziel || !naechste ? 1 : 1 - zug * .9,
      });
    }

    // Wer neu hinzukommt, blendet ein, statt aus dem Nichts dazustehen.
    if (naechste) {
      for (const s of naechste.stellungen) {
        if (s.form === 'pfeil' || gesehen.has(s.id)) continue;
        const r = this._ring(i + 1, s.id);
        if (!r) continue;
        koerper.push({
          punkte: r,
          farbe: this.farben.get(s.partei) ?? '#8a94a6',
          name: s.name ?? '',
          staerke: s.staerke ?? '',
          geschlagen: !!s.geschlagen,
          deckung: zug,
        });
      }
    }

    this.leinwand.setInhalt({
      gelaende: b.gelaende ?? [],
      gelaendeDeckung: klemm((performance.now() - this._auf) / 900, 0, 1),
      koerper,
      pfeile,
    });
  }
}
