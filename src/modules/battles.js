/**
 * Berühmte Schlachten als abspielbarer Verlauf.
 *
 * Der Atlas zeigt sonst Zustände – so sah die Welt im Jahr X aus. Eine
 * Schlacht ist aber kein Zustand, sondern eine Abfolge, und die fällt aus
 * einer Karte heraus, die nur Jahresschnitte kennt. Dieses Modul legt über
 * die Karte eine eigene Ebene, auf der sich die Stellungen Station für
 * Station verschieben.
 *
 * Bewusst getrennt von den Zeitschnitten: Truppenstellungen sind keine
 * Staatsgrenzen. Sie liegen in einer eigenen Ebene, in eigenen Farben, und
 * sie verschwinden restlos, sobald man die Schlacht schließt.
 */
import L from 'leaflet';
import { esc } from './format.js';
import spec from '../data/battles.json';

export const BATTLES = spec.schlachten;

/**
 * Pfeilspitze am Ende eines Zuges, als eigenes Polygon – so zoomt sie mit.
 *
 * Die Größe haengt an der Laenge des Pfeils selbst, nicht an der Ausdehnung
 * der Schlacht: Ein kurzer Vorstoss bekommt eine kleine Spitze, ein weiter
 * Anmarsch eine grosse. Der Laengengrad wird dabei nach Breite gestaucht,
 * sonst wird die Spitze in hohen Breiten schief.
 */
function arrowHead(from, to, anteil = 0.3) {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const stauchung = Math.cos((y2 * Math.PI) / 180) || 1;
  const dx = (x2 - x1) * stauchung;
  const dy = y2 - y1;
  const laenge = Math.hypot(dx, dy) || 1e-6;
  const size = laenge * anteil;
  const winkel = Math.atan2(dy, dx);
  const spreiz = 0.4;
  const punkt = (a) => [
    x2 - (size * Math.cos(a)) / stauchung,
    y2 - size * Math.sin(a),
  ];
  return [[x2, y2], punkt(winkel - spreiz), punkt(winkel + spreiz)];
}

export class BattlePlayer {
  constructor(atlas, { onStation } = {}) {
    this.atlas = atlas;
    this.onStation = onStation ?? (() => {});
    this.battle = null;
    this.index = 0;
    this.playing = false;
    this._timer = null;
    /** Ein Halt je Station, damit man mitlesen kann. */
    this.interval = 4200;

    const pane = atlas.map.createPane('battle');
    pane.style.zIndex = '258';
    pane.style.pointerEvents = 'none';
    this.layer = L.geoJSON(null, {
      pane: 'battle',
      renderer: L.svg({ pane: 'battle', padding: .4 }),
      interactive: false,
    }).addTo(atlas.map);
    this.labels = L.layerGroup([], { pane: 'battle' }).addTo(atlas.map);
  }

  get station() { return this.battle?.stationen[this.index] ?? null; }
  get count() { return this.battle?.stationen.length ?? 0; }

  /** Schlacht öffnen: passender Zeitschnitt, passender Ausschnitt, Station 1. */
  start(id) {
    const battle = BATTLES.find((b) => b.id === id);
    if (!battle) return null;
    this.battle = battle;
    this.index = 0;
    this.farben = new Map(battle.parteien.map((p) => [p.id, p.farbe]));
    this.atlas.map.flyTo([battle.mitte[1], battle.mitte[0]], battle.zoom, { duration: 1.1 });
    this.render();
    return battle;
  }

  stop() {
    this.playing = false;
    window.clearInterval(this._timer);
    this._timer = null;
  }

  close() {
    this.stop();
    this.battle = null;
    this.layer.clearLayers();
    this.labels.clearLayers();
  }

  goTo(index) {
    if (!this.battle) return;
    this.index = Math.max(0, Math.min(this.count - 1, index));
    this.render();
  }

  step(dir) {
    if (!this.battle) return;
    const next = this.index + dir;
    // Am Ende halten statt umlaufen: Eine Schlacht endet, sie wiederholt sich nicht.
    if (next >= this.count) { this.stop(); this.goTo(this.count - 1); return; }
    this.goTo(next);
  }

  play() {
    if (!this.battle || this.playing) return;
    if (this.index >= this.count - 1) this.goTo(0);
    this.playing = true;
    this.onStation(this);
    this._timer = window.setInterval(() => {
      if (this.index >= this.count - 1) { this.stop(); this.onStation(this); return; }
      this.step(1);
    }, this.interval);
  }

  toggle() { this.playing ? (this.stop(), this.onStation(this)) : this.play(); }

  /**
   * Stellungen der aktuellen Station zeichnen.
   *
   * Flächen bekommen eine kräftige Kontur und eine zurückhaltende Füllung –
   * darunter soll die Karte lesbar bleiben, sonst verliert man die Orientierung
   * im Gelände, auf das es bei einer Schlacht gerade ankommt.
   */
  render() {
    this.layer.clearLayers();
    this.labels.clearLayers();
    const station = this.station;
    if (!station) return;

    for (const s of station.stellungen) {
      const farbe = this.farben.get(s.partei) ?? '#888';
      if (s.form === 'flaeche') {
        const ring = [...s.punkte, s.punkte[0]];
        this.layer.addData({
          type: 'Feature',
          properties: {},
          geometry: { type: 'Polygon', coordinates: [ring] },
        });
        const letzte = this.layer.getLayers().at(-1);
        letzte.setStyle({
          color: farbe,
          weight: 2.2,
          opacity: .95,
          fillColor: farbe,
          fillOpacity: .28,
          lineJoin: 'round',
          className: 'battle-shape',
        });
      } else if (s.form === 'pfeil') {
        const [von, nach] = s.punkte;
        // Der Schaft endet kurz vor der Spitze, sonst schaut er darueber hinaus.
        const spitze = arrowHead(von, nach);
        const schaftEnde = [
          (spitze[1][0] + spitze[2][0]) / 2,
          (spitze[1][1] + spitze[2][1]) / 2,
        ];
        this.layer.addData({
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: [von, schaftEnde] },
        });
        this.layer.getLayers().at(-1).setStyle({
          color: farbe, weight: 3.2, opacity: .95, lineCap: 'round', className: 'battle-arrow',
        });
        this.layer.addData({
          type: 'Feature',
          properties: {},
          geometry: { type: 'Polygon', coordinates: [[...spitze, spitze[0]]] },
        });
        this.layer.getLayers().at(-1).setStyle({
          color: farbe, weight: 1, opacity: 1, fillColor: farbe, fillOpacity: 1, className: 'battle-arrow',
        });
        if (s.text) {
          // Beschriftung auf die Mitte des Pfeils, nicht auf die Spitze: Zwei
          // Zangen treffen sich am selben Punkt, ihre Namen sollen es nicht.
          const mitte = [(von[0] + nach[0]) / 2, (von[1] + nach[1]) / 2];
          this.labels.addLayer(L.marker([mitte[1], mitte[0]], {
            pane: 'battle',
            interactive: false,
            icon: L.divIcon({
              className: 'battle-tag',
              html: `<span style="--c:${esc(farbe)}">${esc(s.text)}</span>`,
              iconSize: [0, 0],
            }),
          }));
        }
      }
    }
    this.onStation(this);
  }
}
