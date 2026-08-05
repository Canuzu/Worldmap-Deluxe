/**
 * Worldmap Deluxe – Einstiegspunkt.
 * Verdrahtet Daten, Karte, Zeitleiste, Detailtafel und Bedienelemente.
 */
// Leaflets Grundstil zuerst – unsere Regeln sollen ihn überschreiben können.
import 'leaflet/dist/leaflet.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/timeline.css';
import './styles/panel.css';
import './styles/map.css';

import { atlasData } from './modules/data.js';
import { AtlasMap, BASEMAPS } from './modules/atlas.js';
import { Timeline } from './modules/timeline.js';
import { DetailPanel } from './modules/panel.js';
import { polityAt } from './modules/geo.js';
import { esc, fold, highlight, areaText, distanceText, num } from './modules/format.js';
import { ERA_COLORS } from './modules/palette.js';
import { BattlePlayer, BATTLES, ladeBattles } from './modules/battles.js';
import { EventLayer, ARTEN, zeitfenster } from './modules/ereignisse.js';
import {
  KonfliktLayer, KONFLIKT_ARTEN, SEITENFARBEN, spanneText, fortschritt,
} from './modules/konflikte.js';

const $ = (id) => document.getElementById(id);
const STORE_KEY = 'worldmap-deluxe:prefs';

/* ------------------------------------------------------------ Zustand */

const prefs = {
  theme: 'night',
  basemap: 'relief',
  colorMode: 'polity',
  labels: true,
  rivers: false,
  graticule: false,
  borders: true,
  occupation: true,
  places: true,
  physical: false,
  events: true,
  wiki: true,
  focus: false,
  compactTimeline: false,
  ...readPrefs(),
};

function readPrefs() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}'); } catch { return {}; }
}
function savePrefs() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(prefs)); } catch { /* egal */ }
}

/** #position=zoom/lat/lng&year=1815&ort=Name – bewusst am Vorbild orientiert. */
function readHash() {
  const hash = location.hash.replace(/^#/, '');
  const params = new URLSearchParams(hash);
  const out = {};
  const position = params.get('position');
  if (position) {
    const [z, lat, lng] = position.split('/').map(Number);
    if ([z, lat, lng].every(Number.isFinite)) out.view = { zoom: z, lat, lng };
  }
  const year = Number(params.get('year'));
  if (Number.isFinite(year) && params.get('year')) out.year = year;
  const sel = params.get('ort');
  if (sel) out.selected = decodeURIComponent(sel);
  return out;
}

let hashTimer = null;
function writeHash({ map, year, selected }) {
  clearTimeout(hashTimer);
  hashTimer = setTimeout(() => {
    const c = map.getCenter();
    const params = new URLSearchParams();
    params.set('position', `${map.getZoom().toFixed(2)}/${c.lat.toFixed(2)}/${c.lng.toFixed(2)}`);
    params.set('year', String(year));
    if (selected) params.set('ort', selected);
    history.replaceState(null, '', `#${params.toString().replace(/%2F/g, '/')}`);
  }, 250);
}

/* ---------------------------------------------------------------- Boot */

async function main() {
  const bootBar = $('bootBar');
  const bootStatus = $('bootStatus');
  const progress = (value, text) => {
    bootBar.style.width = `${Math.round(value * 100)}%`;
    if (text) bootStatus.textContent = text;
  };

  document.documentElement.dataset.theme = prefs.theme;

  try {
    await atlasData.boot(progress);
  } catch (err) {
    bootStatus.innerHTML = `Die Kartendaten konnten nicht geladen werden.<br><small>${esc(err.message)}</small>`;
    bootBar.style.background = 'var(--rose)';
    return;
  }

  const hash = readHash();
  const startIndex = hash.year != null
    ? atlasData.indexForYear(hash.year)
    : atlasData.indexForYear(1815);

  $('app').hidden = false;

  const atlas = new AtlasMap($('map'), { theme: prefs.theme });
  atlas.setBaseData(atlasData.base);
  // Messhilfen für scripts/smoke.mjs und scripts/perf
  window.__atlasMap = atlas.map;
  window.__atlas = atlas;
  atlas.setLabelNames((name) => atlasData.germanName(name));
  atlas.setColorMode(prefs.colorMode);
  atlas.setShowLabels(prefs.labels);
  atlas.setShowBorders(prefs.borders);
  atlas.setShowWater(prefs.rivers);
  atlas.setShowGraticule(prefs.graticule);

  if (hash.view) atlas.map.setView([hash.view.lat, hash.view.lng], hash.view.zoom, { animate: false });

  const state = {
    index: startIndex,
    year: hash.year ?? atlasData.epochAt(startIndex).year,
    epoch: null,
    selected: null,
    lastAnchor: null,
  };

  /* --------------------------------------------------------- Ereignisse */

  const epochJahre = atlasData.epochs.map((e) => e.year);
  const ereignisse = new EventLayer(atlas, {
    // Ein aufgeschlagenes Ereignis blendet die Detailtafel nicht weg – man
    // liest oft beides nebeneinander: das Land und was dort geschah.
    onOpen: () => { layersMenu.hidden = true; },
  });

  /**
   * Kriege und Schlachten.
   *
   * Eigene Ebene statt einer siebten Ereignisart: Wer die Ereignisse
   * abschaltet, weil ihm die Karte zu voll ist, will die Schlachten trotzdem
   * sehen können – und umgekehrt. Sie erscheint mit dem Register und
   * verschwindet mit ihm.
   */
  const konflikte = new KonfliktLayer(atlas, {
    onOpen: () => { layersMenu.hidden = true; },
  });

  // Für die Prüfwerkzeuge erreichbar, wie Karte und Atlas.
  window.__konflikte = konflikte;

  /** Die Sammlung erst holen, wenn die Ebene wirklich gebraucht wird. */
  async function enableEvents(on) {
    if (on && !ereignisse.hatDaten) ereignisse.setDaten(await atlasData.loadEreignisse());
    ereignisse.setSichtbar(on);
    renderLegend();
  }

  /* ------------------------------------------------------- Detailtafel */

  const panel = new DetailPanel(
    { root: $('panel'), body: $('panelBody'), close: $('panelClose') },
    {
      data: atlasData,
      atlas,
      isWikiEnabled: () => prefs.wiki,
      onSelect: (name) => selectPolity(name, { open: Boolean(name) }),
      onFocus: (name) => atlas.focus(name, { padding: [80, 80] }),
      // Ein Klick auf einen Herrscher in der Regierungsfolge setzt das Jahr.
      // Die Karte springt auf den passenden Zeitschnitt, die Auswahl bleibt.
      onYear: (jahr) => timeline.setYear(jahr),
    },
  );

  /* ---------------------------------------------------------- Zeitleiste */

  const timeline = new Timeline(
    {
      timeline: $('timeline'),
      track: $('track'),
      eras: $('trackEras'),
      ticks: $('trackTicks'),
      scale: $('trackScale'),
      fill: $('trackFill'),
      handle: $('trackHandle'),
      yearBig: $('yearBig'),
      yearEra: $('yearEra'),
      yearTitle: $('yearTitle'),
      stats: $('epochStats'),
      prev: $('btnPrev'),
      next: $('btnNext'),
      play: $('btnPlay'),
    },
    {
      epochs: atlasData.epochs,
      eras: atlasData.eras,
      onChange: (index, { year } = {}) => {
        if (year != null) state.year = year;
        // Ab jetzt wird gereist – der Vorgriff darf weiter greifen.
        reisebereit = true;
        goto(index);
      },
    },
  );

  /* -------------------------------------------------------- Kartenlogik */

  let loadToken = 0;

  /**
   * Die Nachbarschnitte erst in einer Ruhepause holen.
   *
   * Sie machen die Zeitreise flüssig und sind jeden Kilobyte wert – aber
   * nicht auf dem Weg zum ersten Bild. Über ein Megabyte lag dort für den
   * Fall bereit, dass jemand gleich den Regler bewegt; die meisten schauen
   * erst einmal auf die Karte. Nach einer Ruhepause sind sie da, lange bevor
   * der erste Schritt kommt.
   *
   * Ein neuer Sprung sagt den vorigen Vorgriff ab: Sonst lädt der Atlas die
   * Nachbarn eines Jahres nach, das niemand mehr ansieht.
   */
  let reisebereit = false;
  let prefetchHandle = null;
  // Beide Fassungen zusammen setzen, sonst könnte ein Handle der einen Art
  // an die Absage der anderen geraten.
  const hatLeerlauf = typeof window.requestIdleCallback === 'function';
  const imLeerlauf = hatLeerlauf
    ? (fn) => window.requestIdleCallback(fn, { timeout: 2500 })
    : (fn) => window.setTimeout(fn, 1200);
  const abbrechen = hatLeerlauf
    ? (h) => window.cancelIdleCallback(h)
    : (h) => window.clearTimeout(h);

  function planePrefetch(index) {
    if (prefetchHandle != null) abbrechen(prefetchHandle);
    prefetchHandle = imLeerlauf(() => {
      prefetchHandle = null;
      atlasData.prefetch(index, { weit: reisebereit });
    });
  }

  /**
   * Einen Zeitschnitt anzeigen.
   *
   * Der Regler ist jahresgenau, die Karte kennt aber nur 62 Stände. Wer mit
   * den Pfeiltasten von 1815 auf 1816 geht, bleibt beim selben Kartenstand –
   * und dennoch wurde hier bisher der ganze Zeitschnitt neu aufgebaut: 1.307
   * Gemeinwesen neu angelegt, neu projiziert, neu gezeichnet, dazu eine
   * Überblendung von 300 ms. Bei gedrückt gehaltener Pfeiltaste stand die
   * Karte damit dauerhaft im Neuaufbau.
   *
   * Ändert sich der Kartenstand nicht, bleibt die Karte deshalb unberührt.
   * Aktualisiert wird nur, was am Jahr hängt: Steckbrief, Adresszeile und die
   * Ansage für Vorlesesoftware.
   */
  async function goto(index, { animate = true } = {}) {
    if (state.epoch && index === state.index && state.epoch.meta === atlasData.epochAt(index)) {
      if (state.selected && panel.isOpen) panel.show(state.selected, state.epoch, state.year);
      updateHash();
      announce();
      return;
    }
    state.index = index;
    const token = ++loadToken;
    let epoch;
    try {
      epoch = await atlasData.load(index);
    } catch (err) {
      console.error(err);
      return;
    }
    if (token !== loadToken) return; // ein neuerer Sprung hat überholt

    state.epoch = epoch;
    // Vor rund 10.000 Jahren lag der Meeresspiegel etwa 120 m tiefer. Für die
    // Eiszeit-Zeitschnitte gilt deshalb eine eigene Küstenlinie – sonst fehlten
    // genau die Landbrücken, über die der Mensch die Erde besiedelt hat.
    const eiszeit = epoch.meta.year <= -10000;
    if (eiszeit && !atlas.coast.eis) {
      atlasData.loadIceAgeCoast().then((o) => atlas.setIceAgeCoastline(o));
    }
    atlas.setIceAge(eiszeit);
    atlas.setEpoch(epoch, { animate });
    planePrefetch(index);

    timeline.setStats({
      polities: epoch.polities.length,
      area: areaText(epoch.polities.reduce((sum, p) => sum + p.area, 0)).replace(' km²', ' km²'),
    });

    // Ereignisse gehören zur Zeitspanne, für die dieser Kartenstand gilt –
    // von der Mitte zum vorigen bis zur Mitte zum nächsten Zeitschnitt. So
    // wechseln sie genau dann, wenn auch die Karte wechselt, und jedes
    // Ereignis ist bei genau einem Zeitschnitt zu sehen.
    const fenster = zeitfenster(epochJahre, index);
    ereignisse.setFenster(fenster);
    konflikte.setFenster(fenster);
    if (!document.getElementById('battlesBox').hidden) renderRegister();

    renderLegend();
    reconcileSelection();
    updateHash();
    announce();
  }

  /** Auswahl über den Zeitsprung retten: gleicher Name, sonst gleicher Ort. */
  function reconcileSelection() {
    if (!state.selected) return;
    const epoch = state.epoch;
    if (epoch.byName.has(state.selected)) {
      atlas.select(state.selected);
      if (panel.isOpen) panel.show(state.selected, epoch, state.year);
      return;
    }
    const anchor = state.lastAnchor;
    const replacement = anchor ? polityAt(epoch, anchor[0], anchor[1]) : null;
    if (replacement) {
      state.selected = replacement;
      atlas.select(replacement);
      if (panel.isOpen) panel.show(replacement, epoch, state.year);
    } else {
      state.selected = null;
      atlas.select(null);
      const warOffen = panel.isOpen;
      panel.dom.root.hidden = true;
      if (warOffen) buehneGeaendert();
    }
  }

  /**
   * Die Karte sofort über die neue Bühnenbreite unterrichten.
   *
   * Der ResizeObserver in `watchStageSize()` tut das auch – aber erst im
   * nächsten Einzelbild. Bis dahin rechnet Leaflet mit der alten Breite: Wer
   * die Tafel schließt und ohne Pause auf die Karte klickt, trifft um die
   * halbe Tafelbreite daneben. An dieser Stelle ist die Größenänderung
   * bekannt, also wird sie gemeldet, statt auf die Beobachtung zu warten.
   * Die Beobachtung bleibt für alles andere zuständig.
   */
  function buehneGeaendert() {
    atlas.map.invalidateSize({ pan: false, animate: false });
  }

  function selectPolity(name, { open = true, zoom = false } = {}) {
    state.selected = name;
    if (name) {
      const entry = state.epoch?.byName.get(name);
      if (entry?.anchor) state.lastAnchor = entry.anchor;
    }
    atlas.select(name, { zoom });
    const warOffen = panel.isOpen;
    if (name && open) panel.show(name, state.epoch, state.year);
    if (!name) panel.dom.root.hidden = true;
    if (panel.isOpen !== warOffen) buehneGeaendert();
    updateHash();
    announce();
  }

  /**
   * Die Karte ist eine Zeichenfläche – für Vorlesesoftware existiert sie
   * nicht. Diese Meldung ersetzt sie: Sie nennt Jahr, Kartenstand, die Zahl
   * der Gemeinwesen und, falls eines gewählt ist, dessen Kernangaben.
   */
  function announce() {
    const el = $('mapState');
    if (!el || !state.epoch) return;
    const m = state.epoch.meta;
    const teile = [`Jahr ${state.year}`];
    if (m.year !== state.year) teile.push(`gezeigt wird der Kartenstand ${m.label}`);
    if (m.stand) teile.push(`Stand ${m.stand}`);
    if (m.title) teile.push(m.title);
    teile.push(`${state.epoch.polities.length} Gemeinwesen`);
    if (state.selected) {
      const e = state.epoch.byName.get(state.selected);
      const name = atlasData.germanName(state.selected);
      const zusatz = [];
      if (e?.occupiers?.length) {
        zusatz.push(`besetzt durch ${e.occupiers.map((b) => atlasData.germanName(b.name)).join(' und ')}`);
      }
      if (e?.area) zusatz.push(areaText(e.area));
      teile.push(`Gewählt: ${name}${zusatz.length ? `, ${zusatz.join(', ')}` : ''}`);
    }
    el.textContent = `${teile.join('. ')}.`;
  }

  function updateHash() {
    writeHash({
      map: atlas.map,
      // Das frei gewählte Jahr, nicht das Stichjahr des Kartenstands –
      // ein geteilter Link führt damit exakt dorthin zurück.
      year: state.year,
      selected: state.selected,
    });
  }

  /**
   * Auf Änderungen der Adresszeile reagieren – ausgelöst durch die
   * Zurück-Taste des Browsers oder einen von Hand eingefügten Link.
   * Eigene Schreibvorgänge laufen über replaceState und lösen kein
   * hashchange aus, deshalb ist keine Schleifensperre nötig.
   */
  window.addEventListener('hashchange', async () => {
    const next = readHash();
    if (next.view) {
      atlas.map.setView([next.view.lat, next.view.lng], next.view.zoom, { animate: true });
    }
    if (next.year != null && next.year !== state.year) {
      timeline.stop();
      state.year = next.year;
      const index = atlasData.indexForYear(next.year);
      timeline.setYear(next.year, { silent: true });
      if (index !== state.index) await goto(index);
    }
    if (next.selected && next.selected !== state.selected && state.epoch?.byName.has(next.selected)) {
      selectPolity(next.selected);
    } else if (!next.selected && state.selected) {
      selectPolity(null);
    }
  });

  atlas.on('select', (name) => selectPolity(name));
  atlas.on('view', () => { updateScale(); updateHash(); });

  /* ------------------------------------------------------ Hover-Hinweis */

  const hovertip = $('hovertip');
  const mapEl = $('map');
  let pointer = { x: 0, y: 0 };

  mapEl.addEventListener('pointermove', (event) => {
    const rect = mapEl.getBoundingClientRect();
    pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    if (!hovertip.hidden) {
      hovertip.style.left = `${pointer.x}px`;
      hovertip.style.top = `${pointer.y}px`;
    }
  });

  atlas.on('hover', (name) => {
    mapEl.classList.toggle('is-pointing', Boolean(name));
    if (!name) { hovertip.hidden = true; return; }
    const entry = state.epoch?.byName.get(name);
    const german = atlasData.germanName(name);
    hovertip.innerHTML = `${esc(german)}${entry ? `<small>${esc(areaText(entry.area))}</small>` : ''}`;
    hovertip.hidden = false;
    hovertip.style.left = `${pointer.x}px`;
    hovertip.style.top = `${pointer.y}px`;
  });

  /* ------------------------------------------------------------ Legende */

  function renderLegend() {
    const list = $('legendList');
    const epoch = state.epoch;
    if (!epoch) return;

    if (atlas.colorMode === 'precision') {
      $('legendTitle').textContent = 'Genauigkeit der Grenzen';
      const groups = new Map();
      for (const p of epoch.polities) {
        groups.set(p.precision, (groups.get(p.precision) ?? 0) + 1);
      }
      list.innerHTML = [...groups.entries()].sort((a, b) => b[0] - a[0]).map(([level, count]) => `
        <li>
          <span class="sw" style="background:${esc(atlas.colorOf(`p${level}`))}"></span>
          <span class="nm">${esc({ 3: 'völkerrechtlich fixiert', 2: 'mittlere Genauigkeit', 1: 'grobe Annäherung' }[level] ?? 'ohne Angabe')}</span>
          <span class="va">${num(count)}</span>
        </li>`).join('');
      return;
    }

    $('legendTitle').textContent = `Größte Gemeinwesen · ${epoch.meta.label}`;
    // Mit eingeschalteter Ereignisebene wird die Liste der Gemeinwesen kürzer:
    // Sonst stünde die Überschrift „Was in dieser Zeit geschah“ so weit unten,
    // dass sie niemand findet, der nicht ohnehin scrollt.
    const wieViele = prefs.events && ereignisse.aktuelle.length ? 11 : 16;
    list.innerHTML = epoch.polities.slice(0, wieViele).map((p) => `
      <li><button type="button" data-name="${esc(p.name)}">
        <span class="sw" style="background:${esc(atlas.colorOfPolity(p.name))}"></span>
        <span class="nm">${esc(atlasData.germanName(p.name))}${p.occupiers?.length
          ? ` <i class="occ" title="besetzt durch ${esc(p.occupiers.map((b) => atlasData.germanName(b.name)).join(', '))}">besetzt</i>`
          : ''}</span>
        <span class="va">${esc(areaText(p.area))}</span>
      </button></li>`).join('');

    // In den Kriegsjahren erklärt eine Zeile, was die Schraffur bedeutet –
    // sonst bliebe die zweite Farbe auf einer Fläche unerklärt.
    const besetzer = new Map();
    for (const p of epoch.polities) {
      for (const b of p.occupiers ?? []) besetzer.set(b.name, (besetzer.get(b.name) ?? 0) + 1);
    }
    if (besetzer.size) {
      list.insertAdjacentHTML('beforeend', `
        <li class="legend__note">Schraffiert = besetztes Gebiet, in der Farbe der Besatzungsmacht.</li>
        ${[...besetzer.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => `
          <li><button type="button" data-name="${esc(name)}">
            <span class="sw sw--hatch" style="--occ:${esc(atlas.colorOfPolity(name))}"></span>
            <span class="nm">${esc(atlasData.germanName(name))} als Besatzungsmacht</span>
            <span class="va">${num(count)} Gebiete</span>
          </button></li>`).join('')}`);
    }

    renderEventLegend(list);
  }

  /**
   * Die Ereignisse dieser Zeitspanne als Liste unter der Legende.
   *
   * Sie ist die zweite Hälfte der Ebene: Auf der Karte sieht man, *wo* etwas
   * geschah, hier *was* – und was gerade außerhalb des Ausschnitts liegt.
   * Ein Klick fliegt hin und schlägt es auf.
   */
  function renderEventLegend(list) {
    if (!prefs.events) return;
    const liste = ereignisse.aktuelle;
    if (!liste.length) return;

    const jahr = (e) => (e.jahr < 0 ? `${-e.jahr} v.` : String(e.jahr));
    list.insertAdjacentHTML('beforeend', `
      <li class="legend__head">Was in dieser Zeit geschah</li>
      ${liste.map((e) => {
        const art = ARTEN[e.art] ?? ARTEN.umbruch;
        return `<li><button type="button" data-ereignis="${esc(e.id)}" title="${esc(art.label)}">
          <span class="sw sw--ev"><svg viewBox="0 0 24 24" width="11" height="11" aria-hidden="true"><path d="${art.glyph}" fill="currentColor"/></svg></span>
          <span class="nm">${esc(e.name)}</span>
          <span class="va">${esc(jahr(e))}</span>
        </button></li>`;
      }).join('')}`);
  }

  $('legendList').addEventListener('click', (event) => {
    const ev = event.target.closest('[data-ereignis]');
    if (ev) { ereignisse.zeige(ev.dataset.ereignis); return; }
    const btn = event.target.closest('[data-name]');
    if (btn) selectPolity(btn.dataset.name, { zoom: true });
  });

  /* ----------------------------------------------------------- Maßstab */

  /** Orte erst holen, wenn die Ebene eingeschaltet wird. */
  async function enablePlaces(on) {
    if (on && !atlas.places?.length) atlas.setPlaces(await atlasData.loadPlaces());
    atlas.setShowPlaces(on);
  }

  /** Landschaftsnamen erst holen, wenn die Ebene eingeschaltet wird. */
  async function enablePhysical(on) {
    if (on && !atlas.physical?.length) atlas.setPhysical(await atlasData.loadPhysical());
    atlas.setShowPhysical(on);
  }

  /**
   * Die hochaufgelöste Küstenlinie erst holen, wenn sie in Reichweite kommt.
   *
   * `ocean-hd.json` ist mit 3,6 MB (1,2 MB gepackt) der mit Abstand größte
   * Brocken des Atlas – und war zugleich der einzige, der ohne Anlass geladen
   * wurde: 600 ms nach dem ersten Bild, obwohl die Karte ihn erst ab
   * Zoomstufe 4,2 überhaupt einsetzt. Wer die Weltkarte anschaut und den
   * Regler schiebt, bezahlte ihn für nichts.
   *
   * Angefordert wird er jetzt eine gute Stufe vor der Wirkschwelle. Der
   * Vorlauf ist der Punkt: Zwischen „ich zoome hinein“ und „die feine Küste
   * wird gebraucht“ liegen dann ein paar Sekunden, in denen die Datei
   * ankommen kann – sie ist da, bevor man sie sieht.
   *
   * Wer über einen geteilten Link direkt in einen nahen Ausschnitt einsteigt,
   * löst die Anforderung sofort aus; deshalb wird auch einmal gleich geprüft.
   */
  function watchCoastNeed() {
    const VORLAUF_AB_ZOOM = 3;
    let angefordert = false;
    const pruefen = () => {
      if (angefordert || atlas.map.getZoom() < VORLAUF_AB_ZOOM) return;
      angefordert = true;
      atlasData.loadDetailedCoastline().then((ocean) => atlas.setDetailedCoastline(ocean));
    };
    // `zoom` feuert schon während der Animation, `zoomend` fängt Sprünge ohne
    // Animation ab – beides zusammen gibt den frühestmöglichen Anlass.
    atlas.map.on('zoom zoomend', pruefen);
    pruefen();
  }

  /** Gewässer erst holen, wenn sie gebraucht werden. */
  async function enableWater(on) {
    if (on && !atlas.hasWaterData) {
      atlas.setWaterData(await atlasData.loadWater());
    }
    atlas.setShowWater(on);
  }

  function updateScale() {
    const info = atlas.scaleInfo();
    const bar = $('scaleBar');
    bar.querySelector('i').style.width = `${info.px}px`;
    bar.querySelector('b').textContent = distanceText(info.km);
  }

  /**
   * Höhe der schwebenden Konsole messen und als CSS-Größe hinterlegen.
   *
   * Maßstab und Windrose stehen über der Konsole. Deren Höhe hängt davon ab,
   * ob die Zeitleiste eingeklappt ist, wie breit das Fenster ist und wie viele
   * Zeilen die Jahresangabe braucht – ein fester Abstand wäre in der Hälfte
   * der Fälle falsch. Gemessen ist er immer richtig.
   */
  /**
   * Die Karte über jede Größenänderung ihrer Bühne unterrichten.
   *
   * Leaflet merkt nur Fenstergrößen. Öffnet oder schließt sich die
   * Detailtafel, wird die Bühne schmaler oder breiter, ohne dass ein
   * resize-Ereignis fällt – die Karte rechnet dann weiter mit der alten
   * Breite. Sichtbar wurde das beim Klicken: Nach dem Schließen der Tafel
   * landete ein Klick um die halbe Tafelbreite daneben, weil Bildpunkt und
   * Koordinate nicht mehr zusammenpassten.
   *
   * pan: false, damit der Ausschnitt beim Anpassen stehen bleibt statt
   * nachzurutschen.
   */
  function watchStageSize() {
    if (!('ResizeObserver' in window)) return;
    const buehne = document.querySelector('.stage');
    let angefordert = false;
    let zuletzt = '';
    new ResizeObserver((eintraege) => {
      // Nur bei echter Änderung: Ein ResizeObserver meldet auch, wenn sich nur
      // die Nachkommastelle bewegt, und invalidateSize zeichnet die ganze
      // Karte neu.
      const r = eintraege[0].contentRect;
      const jetzt = `${Math.round(r.width)}x${Math.round(r.height)}`;
      if (jetzt === zuletzt) return;
      zuletzt = jetzt;
      if (angefordert) return;
      angefordert = true;
      requestAnimationFrame(() => {
        angefordert = false;
        atlas.map.invalidateSize({ pan: false, animate: false });
      });
    }).observe(buehne);
  }

  function watchConsoleHeight() {
    const konsole = $('timeline');
    const setzen = () => {
      const hoehe = konsole.getBoundingClientRect().height;
      document.documentElement.style.setProperty('--console-h', `${Math.round(hoehe)}px`);
    };
    setzen();
    if ('ResizeObserver' in window) new ResizeObserver(setzen).observe(konsole);
    window.addEventListener('resize', setzen);
  }

  /**
   * Gradteilung der Windrose – 72 Striche, alle 5 Grad, jeder dritte länger.
   * Von Hand im Markup wären das 72 Zeilen Rauschen; erzeugt ist es eine.
   */
  function drawRoseTicks() {
    const g = document.getElementById('roseTicks');
    if (!g) return;
    const teile = [];
    for (let i = 0; i < 72; i++) {
      const lang = i % 3 === 0;
      const rad = (i * 5 * Math.PI) / 180;
      const r1 = 44;
      const r2 = lang ? 49.5 : 47;
      teile.push('<line'
        + ` x1="${(60 + Math.sin(rad) * r1).toFixed(2)}" y1="${(60 - Math.cos(rad) * r1).toFixed(2)}"`
        + ` x2="${(60 + Math.sin(rad) * r2).toFixed(2)}" y2="${(60 - Math.cos(rad) * r2).toFixed(2)}"`
        + ` opacity="${lang ? .9 : .45}" />`);
    }
    g.innerHTML = teile.join('');
  }

  /* -------------------------------------------------------------- Suche */

  const searchInput = $('search');
  const suggest = $('suggest');
  let matches = [];
  let cursor = -1;

  function runSearch(query) {
    const q = fold(query.trim());
    if (q.length < 1 || !state.epoch) {
      suggest.hidden = true;
      matches = [];
      return;
    }
    const seen = new Set();
    matches = [];
    for (const p of state.epoch.polities) {
      const german = atlasData.germanName(p.name);
      const hayGerman = fold(german);
      const hayOriginal = fold(p.name);
      const pos = hayGerman.indexOf(q);
      const posOriginal = hayOriginal.indexOf(q);
      if (pos < 0 && posOriginal < 0) continue;
      if (seen.has(p.name)) continue;
      seen.add(p.name);
      matches.push({ polity: p, german, score: (pos < 0 ? 50 : pos) + (pos === 0 ? -30 : 0) - Math.log10(p.area + 10) });
      if (matches.length > 80) break;
    }
    matches.sort((a, b) => a.score - b.score);
    matches = matches.slice(0, 8);

    if (!matches.length) {
      suggest.innerHTML = '<li class="is-empty" aria-disabled="true"><span class="nm">Nichts gefunden in diesem Zeitschnitt</span></li>';
      suggest.hidden = false;
      cursor = -1;
      return;
    }
    cursor = 0;
    suggest.innerHTML = matches.map((m, i) => `
      <li role="option" data-name="${esc(m.polity.name)}" aria-selected="${i === 0}">
        <span class="dot" style="background:${esc(atlas.colorOfPolity(m.polity.name))}"></span>
        <span class="nm">${highlight(m.german, query.trim())}</span>
        <span class="sub">${esc(areaText(m.polity.area))}</span>
      </li>`).join('');
    suggest.hidden = false;
  }

  function moveCursor(delta) {
    if (!matches.length) return;
    cursor = (cursor + delta + matches.length) % matches.length;
    [...suggest.children].forEach((li, i) => li.setAttribute('aria-selected', String(i === cursor)));
    suggest.children[cursor]?.scrollIntoView({ block: 'nearest' });
  }

  // Die Suche liegt zugeklappt als Knopf in der Leiste und faehrt erst auf
  // Wunsch aus - sie soll nicht dauerhaft ein Stueck Karte verdecken.
  const searchWrap = $('searchWrap');
  function openSearch() {
    searchWrap.classList.add('is-open');
    $('btnSearch').setAttribute('aria-expanded', 'true');
    searchInput.focus();
  }
  function closeSearch() {
    searchWrap.classList.remove('is-open');
    $('btnSearch').setAttribute('aria-expanded', 'false');
    suggest.hidden = true;
    searchInput.value = '';
    searchInput.blur();
  }
  $('btnSearch').addEventListener('click', () => {
    if (searchWrap.classList.contains('is-open')) closeSearch();
    else openSearch();
  });
  $('btnSearchClose').addEventListener('click', closeSearch);

  function commitSearch(name) {
    closeSearch();
    // Erst zeichnen lassen, dann rechnen.
    //
    // selectPolity fliegt die Karte an und baut die Detailtafel auf – das ist
    // ein Arbeitsblock von rund einer Viertelsekunde. Lief er direkt hinter
    // closeSearch, kam der Browser vorher nicht zum Zeichnen: Das Suchfeld
    // blieb sichtbar stehen und klappte erst nach dem Flug zu, so als hinge
    // die Bedienung.
    //
    // Zwei Bildschritte, nicht einer: Der erste läuft noch VOR dem Zeichnen
    // des nächsten Bildes. Erst der zweite liegt sicher dahinter – dann ist
    // das Zuklappen angelaufen und überdauert den Arbeitsblock.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => selectPolity(name, { zoom: true }));
    });
  }

  searchInput.addEventListener('input', () => runSearch(searchInput.value));
  searchInput.addEventListener('focus', () => { if (searchInput.value) runSearch(searchInput.value); });
  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') { moveCursor(1); event.preventDefault(); }
    else if (event.key === 'ArrowUp') { moveCursor(-1); event.preventDefault(); }
    else if (event.key === 'Enter' && matches[cursor]) { commitSearch(matches[cursor].polity.name); event.preventDefault(); }
    else if (event.key === 'Escape') { closeSearch(); }
  });
  suggest.addEventListener('mousedown', (event) => {
    const li = event.target.closest('li[data-name]');
    if (li) { event.preventDefault(); commitSearch(li.dataset.name); }
  });
  document.addEventListener('click', (event) => {
    if (!$('brand').contains(event.target)) suggest.hidden = true;
  });

  /* --------------------------------------------------------- Werkzeuge */

  const layersMenu = $('layersMenu');
  const legendBox = $('legendBox');

  function togglePopover(el, button) {
    const open = el.hidden;
    layersMenu.hidden = true;
    legendBox.hidden = true;
    $('btnLayers').setAttribute('aria-pressed', 'false');
    $('btnLegend').setAttribute('aria-pressed', 'false');
    if (open) {
      el.hidden = false;
      button.setAttribute('aria-pressed', 'true');
    }
  }

  $('btnLayers').addEventListener('click', () => togglePopover(layersMenu, $('btnLayers')));
  $('btnLegend').addEventListener('click', () => togglePopover(legendBox, $('btnLegend')));
  /* ---------------------------------------------- Kriege & Schlachten

     Ein Register statt zweier Listen: Kriege der eingestellten Zeit,
     darunter ihre Schlachten, darunter die besetzten Gebiete. Alles drei
     gehört zusammen – eine Besetzung ist das Ergebnis eines Krieges, eine
     Schlacht seine Entscheidung. Auf der Karte stehen nur die Schlachten;
     ein Krieg hat keinen Ort, eine Besetzung hat ihre Schraffur schon. */

  const battlesBox = $('battlesBox');
  const battles = new BattlePlayer(atlas, { onStation: renderBattleStation, onTick: tickBattle });
  // Für die Prüfskripte, wie __atlas und __konflikte auch.
  window.__battles = battles;

  /** Wieviele Zeilen offen stehen, bevor eingeklappt wird. */
  const REGISTER_KURZ = 6;
  let registerVoll = false;

  function jahrKurz(j) { return j < 0 ? `${-j} v.` : String(j); }

  /**
   * Ein Krieg als Zeile.
   *
   * Der Balken ist der Punkt der ganzen Übung: Er zeigt die Dauer und wo das
   * eingestellte Jahr darin liegt. Wer 1942 einstellt, sieht auf einen Blick,
   * dass der Zweite Weltkrieg über die Hälfte ist und der Pazifikkrieg gerade
   * erst begonnen hat.
   */
  function kriegZeile(k, jahr) {
    const anteil = fortschritt(k, jahr);
    const laeuft = jahr >= k.von && (k.bis == null || jahr <= k.bis);
    const seiten = k.seiten.map((s, i) => `
      <span class="kreg__seite"><i style="background:${esc(SEITENFARBEN[i % SEITENFARBEN.length])}"></i>${esc(s.name)}</span>`).join('');
    return `
      <li class="kreg__krieg${konflikte.gewaehlt === k.id ? ' is-on' : ''}" data-krieg="${esc(k.id)}">
        <div class="kreg__kopf">
          <b>${esc(k.name)}</b>
          <span class="kreg__jahre">${esc(spanneText(k.von, k.bis))}</span>
        </div>
        <div class="kreg__balken${laeuft ? ' is-laufend' : ''}" aria-hidden="true">
          <i${anteil == null ? '' : ` style="width:${(anteil * 100).toFixed(1)}%"`}></i>
        </div>
        <div class="kreg__seiten">${seiten}</div>
      </li>`;
  }

  /** Der Steckbrief eines ausgewählten Krieges samt seiner Schlachten. */
  function kriegTafel(k) {
    const eigene = konflikte.schlachtenZu(k.id);
    const art = KONFLIKT_ARTEN[k.art] ?? KONFLIKT_ARTEN.krieg;
    return `
      <div class="kreg__tafel">
        <p class="kreg__kicker">${esc(art.kurz)} · ${esc(spanneText(k.von, k.bis))}</p>
        <p class="kreg__wo">${esc(k.wo)}</p>
        <ul class="battles__sides">${k.seiten.map((s, i) => `
          <li><span class="sw" style="background:${esc(SEITENFARBEN[i % SEITENFARBEN.length])}"></span>
            <b>${esc(s.name)}</b></li>`).join('')}</ul>
        <p class="kreg__text">${esc(k.text)}</p>
        <p class="kreg__ausgang"><b>Ausgang:</b> ${esc(k.ausgang)}</p>
        ${k.wiki ? `<a class="kreg__wiki" href="https://de.wikipedia.org/wiki/${encodeURIComponent(k.wiki)}"
          target="_blank" rel="noopener noreferrer">Bei Wikipedia nachlesen</a>` : ''}
        <h5 class="kreg__abschnitt">${eigene.length} Schlacht${eigene.length === 1 ? '' : 'en'} auf der Karte</h5>
        <ol class="kreg__schlachten">${eigene.map((s) => `
          <li data-schlacht="${esc(s.id)}">
            <b>${esc(s.name)}</b>
            <span>${esc(s.datum ?? jahrKurz(s.jahr))}${s.sieger ? ` · Sieg: ${esc(s.sieger)}` : ''}</span>
            ${s.verlauf ? '<em class="kreg__verlauf" data-verlauf="' + esc(s.verlauf) + '">Verlauf abspielen</em>' : ''}
          </li>`).join('')}</ol>
      </div>`;
  }

  /** Besetzte Gebiete des laufenden Zeitschnitts, nach Besatzungsmacht gebündelt. */
  function besatzungsListe() {
    const nach = new Map();
    for (const p of state.epoch?.polities ?? []) {
      for (const b of p.occupiers ?? []) {
        if (!nach.has(b.name)) nach.set(b.name, []);
        nach.get(b.name).push(p.name);
      }
    }
    return [...nach.entries()].sort((a, b) => b[1].length - a[1].length);
  }

  function renderRegister() {
    $('battlesTitle').textContent = 'Kriege & Schlachten';
    $('battlesBack').hidden = true;
    $('battlesPlayer').hidden = true;
    const box = $('battlesList');
    box.hidden = false;

    if (!konflikte.hatDaten) {
      box.innerHTML = '<p class="kreg__leer">Register wird geladen …</p>';
      return;
    }

    const jahr = state.year;
    if (konflikte.gewaehlt) {
      const k = konflikte.krieg(konflikte.gewaehlt);
      $('battlesTitle').textContent = k.name;
      $('battlesBack').hidden = false;
      box.innerHTML = kriegTafel(k);
      return;
    }

    const kriege = konflikte.aktuelleKriege
      .slice()
      .sort((a, b) => (a.rang ?? 2) - (b.rang ?? 2) || a.von - b.von);
    const gezeigt = registerVoll ? kriege : kriege.slice(0, REGISTER_KURZ);
    const schlachten = konflikte.imFenster;
    const besetzt = besatzungsListe();

    const abschnitte = [];
    abschnitte.push(`
      <h4 class="kreg__abschnitt">${kriege.length
        ? `${kriege.length} Krieg${kriege.length === 1 ? '' : 'e'} um ${jahrKurz(jahr)}`
        : 'Kein Krieg verzeichnet'}</h4>
      <ul class="kreg__liste">${gezeigt.map((k) => kriegZeile(k, jahr)).join('')}</ul>
      ${kriege.length > REGISTER_KURZ
        ? `<button type="button" class="kreg__mehr" data-act="mehr">${registerVoll
          ? 'Weniger zeigen' : `Alle ${kriege.length} zeigen`}</button>`
        : ''}`);

    if (schlachten.length) {
      abschnitte.push(`
        <h4 class="kreg__abschnitt">${schlachten.length} Schlacht${schlachten.length === 1 ? '' : 'en'} in dieser Zeit</h4>
        <ul class="kreg__liste kreg__liste--schlacht">${schlachten.map((s) => `
          <li data-schlacht="${esc(s.id)}">
            <b>${esc(s.name)}</b>
            <span>${esc(s.datum ?? jahrKurz(s.jahr))}${s.wo ? ` · ${esc(s.wo)}` : ''}</span>
          </li>`).join('')}</ul>`);
    }

    if (besetzt.length) {
      abschnitte.push(`
        <h4 class="kreg__abschnitt">Besetzte Gebiete</h4>
        <ul class="kreg__liste kreg__liste--besatzung">${besetzt.map(([macht, gebiete]) => `
          <li>
            <b>${esc(atlasData.germanName(macht))}</b>
            <span>hält ${gebiete.length} Gebiet${gebiete.length === 1 ? '' : 'e'}: ${
  esc(gebiete.slice(0, 6).map((g) => atlasData.germanName(g)).join(', '))}${gebiete.length > 6 ? ' u. a.' : ''}</span>
          </li>`).join('')}</ul>
        <p class="kreg__fuss">Auf der Karte schraffiert, in der Farbe der Besatzungsmacht.</p>`);
    }

    abschnitte.push(`
      <h4 class="kreg__abschnitt">Verlauf abspielbar</h4>
      <ul class="kreg__liste kreg__liste--verlauf">${BATTLES.map((b) => `
        <li data-verlauf="${esc(b.id)}">
          <b>${esc(b.name)}</b>
          <span>${esc(b.datum)} · ${esc(b.ort)}</span>
        </li>`).join('')}</ul>`);

    box.innerHTML = abschnitte.join('');
  }

  async function openBattles() {
    legendBox.hidden = true;
    layersMenu.hidden = true;
    battlesBox.hidden = false;
    renderRegister();
    // Die Verläufe sind ein eigener Brocken und kommen erst hier nach.
    if (!BATTLES.length) { await ladeBattles(); renderRegister(); }
    if (!konflikte.hatDaten) {
      konflikte.setDaten(await atlasData.loadKonflikte());
      konflikte.setFenster(zeitfenster(epochJahre, state.index));
      konflikte.setSichtbar(true);
      renderRegister();
    } else {
      konflikte.setSichtbar(true);
    }
  }

  function closeBattles() {
    battles.close();
    renderBattleLegend(null);
    battlesBox.hidden = true;
    $('app').classList.remove('is-battle');
    atlas.setShowLabels(prefs.labels);
    konflikte.loese();
    konflikte.setSichtbar(false);
    ereignisse.setSichtbar(prefs.events);
    // Der Zeitschnitt bleibt, wo die Schlacht ihn hingestellt hat – wer den
    // Verlauf gesehen hat, will meist die Lage danach weiter betrachten.
  }

  function toggleBattles() {
    if (battlesBox.hidden) openBattles(); else closeBattles();
  }

  async function startBattle(id) {
    const meta = BATTLES.find((b) => b.id === id);
    if (!meta) return;
    // Erst den passenden Zeitschnitt holen, damit das Umland zur Schlacht passt.
    const index = atlasData.indexForYear(meta.jahr);
    timeline.stop();
    timeline.setYear(meta.jahr, { silent: true });
    state.year = meta.jahr;
    await goto(index);
    timeline.render();
    // Waehrend der Schlacht tritt die Staatenkarte zurueck: Bei diesem Massstab
    // ist sie ohnehin nur eine einzige Flaeche und wuerde die Stellungen
    // ueberstrahlen. Beschriftungen aus, damit keine Laendernamen dazwischenstehen.
    $('app').classList.add('is-battle');
    atlas.setShowLabels(false);
    // Auch Kriegsregister und Ereignisse treten zurueck: Deren Marken laegen
    // mitten in den Stellungen, und ihre Namen stuenden quer ueber dem Feld.
    konflikte.setSichtbar(false);
    ereignisse.setSichtbar(false);
    renderBattleLegend(BATTLES.find((x) => x.id === id));
    battles.start(id);
    battles.play();
  }

  /**
   * Zeichenerklärung der Schlacht, auf der Karte statt in der Tafel.
   *
   * Ohne sie muss man raten, was ein gestrichelter Umriss bedeutet, was eine
   * Schraffur unterscheidet und wofür die grünen Punktfelder stehen. Sie
   * nennt nur, was in **dieser** Schlacht wirklich vorkommt – eine Legende,
   * die Zeichen erklärt, die nicht im Bild sind, ist selbst Unordnung.
   */
  const GATTUNGSNAMEN = {
    fuss: 'Fußvolk', bogen: 'Bogen und Schützen', reiter: 'Reiterei',
    geschuetz: 'Geschütze', schiff: 'Schiffe', gemischt: 'gemischter Verband',
  };
  const GELAENDENAMEN = {
    fluss: 'Fluss', see: 'See', sumpf: 'Sumpf, nasser Grund', wald: 'Wald',
    hoehe: 'Höhenzug', stadt: 'Ortschaft', mauer: 'Mauer, Befestigung',
    weg: 'Straße', furt: 'Furt, Übergang',
  };

  function renderBattleLegend(b) {
    const box = $('battleLegend');
    if (!b) { box.hidden = true; box.innerHTML = ''; return; }
    const gattungen = [...new Set(b.stationen
      .flatMap((s) => s.stellungen)
      .filter((s) => s.form !== 'pfeil')
      .map((s) => s.gattung)
      .filter(Boolean))];
    const gelaende = [...new Set((b.gelaende ?? []).map((g) => g.art))];
    const hatGeschlagen = b.stationen.some((s) => s.stellungen.some((x) => x.geschlagen));
    const hatRueckzug = b.stationen.some((s) => s.stellungen.some((x) => x.rueckzug));
    const hatFinte = b.stationen.some((s) => s.stellungen.some((x) => x.finte));

    box.innerHTML = `
      <div class="blgd__t">Zeichenerklärung</div>
      <ul class="blgd__l">
        ${b.parteien.map((p) => `<li><i class="blgd__sw" style="--c:${esc(p.farbe)}"></i>${esc(p.name)}</li>`).join('')}
      </ul>
      ${gattungen.length > 1 ? `<ul class="blgd__l">
        ${gattungen.map((g) => `<li><i class="blgd__m blgd__m--${esc(g)}"></i>${esc(GATTUNGSNAMEN[g] ?? g)}</li>`).join('')}
      </ul>` : ''}
      <ul class="blgd__l">
        <li><i class="blgd__p"></i>Angriff, Vorstoß</li>
        ${hatRueckzug ? '<li><i class="blgd__p blgd__p--rueck"></i>Rückzug, Flucht</li>' : ''}
        ${hatFinte ? '<li><i class="blgd__p blgd__p--finte"></i>Scheinbewegung</li>' : ''}
        ${hatGeschlagen ? '<li><i class="blgd__sw blgd__sw--weich"></i>geschlagen, weichend</li>' : ''}
      </ul>
      ${gelaende.length ? `<ul class="blgd__l">
        ${gelaende.map((g) => `<li><i class="blgd__g blgd__g--${esc(g)}"></i>${esc(GELAENDENAMEN[g] ?? g)}</li>`).join('')}
      </ul>` : ''}`;
    box.hidden = false;
  }

  /**
   * Die Tafel neu schreiben – nur bei Stationswechsel, nicht in jedem Bild.
   *
   * Der Schieber wandert sechzig Mal in der Sekunde; würde die Tafel dabei
   * jedes Mal neu gesetzt, wäre der laufende Text bei jedem Bild neu im
   * Aufbau und der Griff des Schiebers unter der Maus weg.
   */
  function renderBattleStation(player) {
    const b = player.battle;
    if (!b) return;
    const st = player.station;
    $('battlesList').hidden = true;
    $('battlesTitle').textContent = b.name;
    const box = $('battlesPlayer');
    box.hidden = false;
    const [von, bis] = player.spanne;
    const lage = (t) => (bis > von ? ((t - von) / (bis - von)) * 100 : 0);

    // Kräfteverhältnis: Die Zahlen stehen als Text in den Parteien, für den
    // Balken braucht es sie als Zahl. Wo keine hinterlegt ist, entfällt er –
    // ein Balken aus geratenen Werten wäre schlimmer als keiner.
    const zahlen = b.parteien.map((p) => p.zahl ?? 0);
    const summe = zahlen.reduce((a, x) => a + x, 0);
    const balken = summe && zahlen.every((z) => z > 0) ? `
      <div class="battles__kraft" role="img" aria-label="Kräfteverhältnis">
        ${b.parteien.map((p, i) => `<span style="--c:${esc(p.farbe)};flex:${zahlen[i]}"
           title="${esc(p.name)}: ${zahlen[i].toLocaleString('de-DE')}"></span>`).join('')}
      </div>
      <p class="battles__kraftText">${b.parteien.map((p, i) =>
        `${esc(p.name)} ${zahlen[i].toLocaleString('de-DE')}`).join(' · ')}</p>` : '';

    box.innerHTML = `
      <p class="battles__meta">${esc(b.datum)} · ${esc(b.ort)}</p>
      <ul class="battles__sides">${b.parteien.map((p) => `
        <li><span class="sw" style="background:${esc(p.farbe)}"></span>
          <b>${esc(p.name)}</b><span>${esc(p.fuehrung)} · ${esc(p.staerke)}</span></li>`).join('')}</ul>
      ${balken}
      <div class="battles__stage">
        <div class="battles__zeit">${esc(st.zeit)}</div>
        <p class="battles__text">${esc(st.text)}</p>
      </div>
      <div class="battles__achse">
        <div class="battles__spur">
          <div class="battles__fuell" id="battlesFuell"></div>
          ${b.stationen.map((s, i) => `<i class="battles__marke${i === player.index ? ' is-on' : ''}"
             style="left:${lage(s.t).toFixed(2)}%" data-step="${i}" title="${esc(s.zeit)}"></i>`).join('')}
        </div>
        <input class="battles__schieber" id="battlesSchieber" type="range"
               min="0" max="1000" step="1" value="${Math.round(player.fortschritt * 1000)}"
               aria-label="Zeitpunkt der Schlacht" />
      </div>
      <div class="battles__controls">
        <button class="tbtn" data-act="prev" ${player.index === 0 && player.fortschritt <= 0 ? 'disabled' : ''} aria-label="Zurück">
          <svg viewBox="0 0 24 24" width="16" height="16"><path d="M15.4 5L8.4 12l7 7 1.4-1.4L11.2 12l5.6-5.6L15.4 5z" fill="currentColor"/></svg>
        </button>
        <button class="tbtn tbtn--play" data-act="play" aria-label="${player.playing ? 'Anhalten' : 'Abspielen'}">
          ${player.playing
            ? '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M7 5h3.5v14H7V5zm6.5 0H17v14h-3.5V5z" fill="currentColor"/></svg>'
            : '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M8 5l11 7-11 7V5z" fill="currentColor"/></svg>'}
        </button>
        <button class="tbtn" data-act="next" ${player.index >= player.count - 1 ? 'disabled' : ''} aria-label="Weiter">
          <svg viewBox="0 0 24 24" width="16" height="16"><path d="M8.6 5L7.2 6.4 12.8 12l-5.6 5.6L8.6 19l7-7-7-7z" fill="currentColor"/></svg>
        </button>
        <span class="battles__zaehler">${player.index + 1} / ${player.count}</span>
        <button class="chip chip--action" data-act="back">Andere Schlacht</button>
      </div>

      <ol class="battles__stationen">${b.stationen.map((s, i) => `
        <li class="${i === player.index ? 'is-on' : ''}${i < player.index ? ' is-vorbei' : ''}" data-step="${i}">
          <span class="battles__stZeit">${esc(s.zeit)}</span>
          <span class="battles__stKurz">${esc(s.kurz ?? s.text.split(/(?<=\.)\s/)[0])}</span>
        </li>`).join('')}</ol>

      ${b.ausgang ? `<div class="battles__ausgang">
        <h4>Ausgang</h4>
        <p>${esc(b.ausgang)}</p>
        ${b.verluste?.length ? `<table class="battles__verluste"><tbody>${b.verluste.map((v) => `
          <tr><th><i class="sw" style="background:${esc(b.parteien.find((p) => p.id === v.partei)?.farbe ?? '#888')}"></i>${esc(b.parteien.find((p) => p.id === v.partei)?.name ?? v.partei)}</th>
              <td>${esc(v.text)}</td></tr>`).join('')}</tbody></table>` : ''}
        ${b.folgen ? `<h4>Folgen</h4><p>${esc(b.folgen)}</p>` : ''}
        ${b.streit ? `<p class="battles__streit">${esc(b.streit)}</p>` : ''}
      </div>` : ''}`;
    tickBattle(player);
  }

  /** In jedem Bild: nur der Schieber und der gefüllte Teil der Spur. */
  function tickBattle(player) {
    const schieber = document.getElementById('battlesSchieber');
    if (!schieber) return;
    const f = player.fortschritt;
    if (document.activeElement !== schieber || !schieber.dataset.zieht) {
      schieber.value = String(Math.round(f * 1000));
    }
    const fuell = document.getElementById('battlesFuell');
    if (fuell) fuell.style.width = `${(f * 100).toFixed(2)}%`;
  }

  // Freies Ziehen: Der Schieber führt die Schlacht, nicht umgekehrt.
  battlesBox.addEventListener('input', (event) => {
    const schieber = event.target.closest('#battlesSchieber');
    if (!schieber) return;
    battles.stop();
    schieber.dataset.zieht = '1';
    battles.setFortschritt(Number(schieber.value) / 1000);
  });
  battlesBox.addEventListener('change', (event) => {
    const schieber = event.target.closest('#battlesSchieber');
    if (schieber) delete schieber.dataset.zieht;
  });

  battlesBox.addEventListener('click', (event) => {
    // Der Verlauf hat Vorrang vor der Schlachtzeile, in der er steht.
    const verlauf = event.target.closest('[data-verlauf]');
    if (verlauf) { startBattle(verlauf.dataset.verlauf); return; }
    const krieg = event.target.closest('[data-krieg]');
    if (krieg) { waehleKrieg(krieg.dataset.krieg); return; }
    const schlacht = event.target.closest('[data-schlacht]');
    if (schlacht) { konflikte.zeige(schlacht.dataset.schlacht); return; }
    const step = event.target.closest('[data-step]');
    if (step) { battles.stop(); battles.goTo(Number(step.dataset.step)); return; }
    const act = event.target.closest('[data-act]')?.dataset.act;
    if (act === 'mehr') { registerVoll = !registerVoll; renderRegister(); }
    else if (act === 'prev') { battles.stop(); battles.step(-1); }
    else if (act === 'next') { battles.stop(); battles.step(1); }
    else if (act === 'play') battles.toggle();
    else if (act === 'back') {
      battles.close();
      renderBattleLegend(null);
      $('app').classList.remove('is-battle');
      atlas.setShowLabels(prefs.labels);
      konflikte.setSichtbar(true);
      ereignisse.setSichtbar(prefs.events);
      renderRegister();
    }
  });

  /** Einen Krieg auswählen – oder die Auswahl aufheben, wenn er schon steht. */
  function waehleKrieg(id) {
    if (konflikte.gewaehlt === id) konflikte.loese();
    else konflikte.waehle(id);
    renderRegister();
  }

  $('battlesBack').addEventListener('click', () => { konflikte.loese(); renderRegister(); });
  $('battlesClose').addEventListener('click', closeBattles);
  $('btnBattles').addEventListener('click', toggleBattles);

  /* ---------------------------------------------------- Kartengrundlage */

  const basemapButtons = [...$('basemaps').querySelectorAll('[data-basemap]')];

  function setBasemap(id) {
    const gewaehlt = id in BASEMAPS ? id : '';
    prefs.basemap = gewaehlt;
    savePrefs();
    basemapButtons.forEach((b) => b.setAttribute('aria-checked', String(b.dataset.basemap === gewaehlt)));
    atlas.setBasemap(gewaehlt || null);
    beschreibeGrundlage();
  }

  /**
   * Der Hinweis unter der Auswahl sagt, was tatsächlich zu sehen ist – auch
   * dann, wenn der Dienst nicht antwortet. Eine Grundlage anzubieten und beim
   * Ausbleiben so zu tun, als wäre sie da, wäre das Schlechteste.
   */
  function beschreibeGrundlage() {
    const el = $('basemapNote');
    const spec = BASEMAPS[prefs.basemap];
    if (!spec) {
      el.textContent = 'Ohne Grundlage: Der Atlas zeichnet Küsten, Gewässer und Grenzen '
        + 'vollständig selbst und läuft damit auch offline.';
      return;
    }
    el.innerHTML = `${esc(spec.beschreibung)} – bewusst ohne heutige Straßen, Städte oder `
      + `Staatsgrenzen. Quelle: ${esc(spec.quelle)}.`
      + (atlas.hasBasemap ? '' : ' <b>Noch nicht geladen</b> – bis dahin zeichnet der Atlas wie bisher alles selbst.');
  }

  basemapButtons.forEach((b) => b.addEventListener('click', () => setBasemap(b.dataset.basemap)));
  atlas.on('basemap', beschreibeGrundlage);
  setBasemap(prefs.basemap);

  // Vollbild: Alles Bedienbare weicht, damit nur noch die Karte da ist.
  function setFocusMode(on) {
    const app = $('app');
    app.classList.toggle('is-focus', on);
    const btn = $('btnFocus');
    btn.setAttribute('aria-pressed', String(on));
    btn.dataset.label = on ? 'Bedienelemente zeigen (F)' : 'Nur die Karte (F)';
    if (on) { layersMenu.hidden = true; legendBox.hidden = true; closeSearch(); }
    prefs.focus = on;
    savePrefs();
    window.setTimeout(() => atlas.map.invalidateSize(), 320);
  }
  $('btnFocus').addEventListener('click', () => setFocusMode(!$('app').classList.contains('is-focus')));

  /**
   * Vollbild – das echte, nicht nur das Wegblenden der Bedienelemente.
   *
   * Beides ist gemeint, wenn jemand „Vollbild“ sagt, und beides ist einzeln
   * sinnvoll: F räumt die Bedienelemente weg und lässt das Fenster, wie es
   * ist; V nimmt den ganzen Bildschirm und lässt die Bedienelemente stehen.
   * Wer beides will, drückt beides.
   *
   * Die Anfrage kann abgelehnt werden – in einem eingebetteten Rahmen ohne
   * Erlaubnis, oder wenn sie nicht aus einer Benutzereingabe kommt. Dann
   * bleibt es bei der Karte im Fenster; eine Fehlermeldung wäre hier nur
   * Lärm.
   */
  function istVollbild() {
    return Boolean(document.fullscreenElement ?? document.webkitFullscreenElement);
  }

  async function setVollbild(on) {
    const el = document.documentElement;
    try {
      if (on) await (el.requestFullscreen?.({ navigationUI: 'hide' }) ?? el.webkitRequestFullscreen?.());
      else await (document.exitFullscreen?.() ?? document.webkitExitFullscreen?.());
    } catch { /* abgelehnt – die Karte bleibt im Fenster */ }
    zeigeVollbild();
  }

  function zeigeVollbild() {
    const on = istVollbild();
    const btn = $('btnFull');
    btn.setAttribute('aria-pressed', String(on));
    btn.dataset.label = on ? 'Vollbild verlassen (V)' : 'Vollbild (V)';
    $('app').classList.toggle('is-vollbild', on);
    // Die Fensterhöhe ändert sich beim Wechsel; Leaflet muss davon erfahren.
    window.setTimeout(() => atlas.map.invalidateSize(), 120);
  }

  $('btnFull').addEventListener('click', () => setVollbild(!istVollbild()));
  document.addEventListener('fullscreenchange', zeigeVollbild);
  document.addEventListener('webkitfullscreenchange', zeigeVollbild);
  // Ohne Unterstützung – ältere Browser, eingebettete Rahmen – hat der Knopf
  // nichts zu tun und steht nicht im Weg.
  if (!document.documentElement.requestFullscreen && !document.documentElement.webkitRequestFullscreen) {
    $('btnFull').hidden = true;
  }

  // Zeitleiste einklappen: Jahr und Regler bleiben, der Rest weicht.
  function setTimelineCompact(on) {
    $('timeline').classList.toggle('is-compact', on);
    const btn = $('btnFold');
    btn.setAttribute('aria-expanded', String(!on));
    btn.dataset.label = on ? 'Zeitleiste ausklappen' : 'Zeitleiste einklappen';
    prefs.compactTimeline = on;
    savePrefs();
    timeline.render();
  }
  $('btnFold').addEventListener('click', () => setTimelineCompact(!$('timeline').classList.contains('is-compact')));

  $('btnHome').addEventListener('click', () => atlas.home());
  $('btnZoomIn').addEventListener('click', () => atlas.zoomBy(.7));
  $('btnZoomOut').addEventListener('click', () => atlas.zoomBy(-.7));

  document.addEventListener('click', (event) => {
    if (layersMenu.hidden && legendBox.hidden) return;
    if (event.target.closest('.popover, .tools')) return;
    layersMenu.hidden = true;
    legendBox.hidden = true;
    $('btnLayers').setAttribute('aria-pressed', 'false');
    $('btnLegend').setAttribute('aria-pressed', 'false');
  });

  function setTheme(theme) {
    prefs.theme = theme;
    document.documentElement.dataset.theme = theme;
    // Ein Frame warten, damit die neuen CSS-Variablen ausgelesen werden können.
    requestAnimationFrame(() => atlas.applyTheme(theme));
    savePrefs();
  }
  $('btnTheme').addEventListener('click', () => {
    setTheme(prefs.theme === 'night' ? 'parchment' : 'night');
  });

  // Einfärbungs-Modus
  const modeButtons = [...$('colorModes').querySelectorAll('button')];
  function setColorMode(mode) {
    prefs.colorMode = mode;
    modeButtons.forEach((b) => b.setAttribute('aria-checked', String(b.dataset.mode === mode)));
    atlas.setColorMode(mode);
    renderLegend();
    savePrefs();
  }
  modeButtons.forEach((btn) => btn.addEventListener('click', () => setColorMode(btn.dataset.mode)));

  // Ebenen-Schalter
  const toggles = [
    ['optLabels', 'labels', (v) => atlas.setShowLabels(v)],
    ['optRivers', 'rivers', (v) => enableWater(v)],
    ['optGraticule', 'graticule', (v) => atlas.setShowGraticule(v)],
    ['optBorders', 'borders', (v) => atlas.setShowBorders(v)],
    ['optOccupation', 'occupation', (v) => atlas.setOccupationVisible(v)],
    ['optPlaces', 'places', (v) => enablePlaces(v)],
    ['optPhysical', 'physical', (v) => enablePhysical(v)],
    ['optEvents', 'events', (v) => enableEvents(v)],
    ['optWiki', 'wiki', () => {}],
  ];
  for (const [id, key, apply] of toggles) {
    const el = $(id);
    el.checked = Boolean(prefs[key]);
    el.addEventListener('change', () => {
      prefs[key] = el.checked;
      apply(el.checked);
      savePrefs();
    });
  }
  setColorMode(prefs.colorMode);

  /* ---------------------------------------------------------- Textfenster */

  const modal = $('modal');
  function openModal(title, html) {
    $('modalTitle').textContent = title;
    $('modalBody').innerHTML = html;
    modal.hidden = false;
  }
  modal.addEventListener('click', (event) => {
    if (event.target.closest('[data-close]')) modal.hidden = true;
  });

  $('btnAbout').addEventListener('click', () => openModal('Über diesen Atlas', aboutHtml()));

  // Herkunftszeichen in der Zeitleiste: erklärt, was an diesem Zeitschnitt
  // nicht aus dem Ursprungsdatensatz stammt.
  $('yearTitle').addEventListener('click', (event) => {
    const btn = event.target.closest('[data-herkunft]');
    if (!btn) return;
    const e = state.epoch?.meta;
    if (!e) return;
    const k = e.korrigiert;
    openModal(`Herkunft · ${e.label}`, `
      ${e.eiszeitKueste ? `<p><strong>Für diesen Zeitschnitt gilt eine eigene Küstenlinie.</strong>
        Beim letzten glazialen Maximum lag der Meeresspiegel rund 120 bis 130 m
        tiefer: Doggerland verband England mit dem Festland, Beringia Sibirien
        mit Alaska, Sundaland reichte von Hinterindien bis Borneo – genau die
        Landbrücken, über die der Mensch die Erde besiedelt hat.</p>
        <p class="note">Als Näherung dient die 200-m-Tiefenlinie aus Natural Earth:
        Alles, was flacher liegt, war trocken. Das greift etwas zu weit
        (200 statt 130 m) und mittelt über einen Zeitraum, in dem der
        Meeresspiegel erheblich schwankte – es ist die beste verfügbare
        Annäherung, keine Messung.</p>` : ''}
      ${e.ergaenzt ? `<p><strong>Dieser Zeitschnitt steht nicht im Ursprungsdatensatz.</strong>
        Er ist eigens angelegt, weil der Datensatz beide Weltkriege überspringt –
        von 1914 auf 1920 und von 1938 auf 1945. Grundlage ist der jeweils
        vorangehende Kartenstand; Stichtag ist <strong>${esc(e.stand ?? '–')}</strong>.</p>
        <p>Die Frontverläufe sind von Hand gezogen, auf kontinentalen Maßstab
        ausgelegt und in <code>src/data/wwi.json</code> bzw.
        <code>src/data/wwii.json</code> einzeln begründet. Einzelne Brückenköpfe
        und Kessel lösen sie nicht auf.</p>` : ''}
      ${k ? `<p><strong>An diesem Zeitschnitt wurde korrigiert:</strong>
        ${k.umbenannt ? `${num(k.umbenannt)} Gemeinwesen umbenannt` : ''}${k.umbenannt && k.ergaenzt ? ', ' : ''}${k.ergaenzt ? `${num(k.ergaenzt)} unbeanspruchtes Gebiet zugeschlagen` : ''}.</p>
        <p>${esc(k.begruendung)}</p>
        <p class="note">Ergänzt wird ausschließlich Land, das niemandem zugeordnet ist –
        kein bestehendes Gemeinwesen verliert dabei Fläche.</p>` : ''}
      <p style="margin-top:1rem">Der Ursprungsdatensatz bezeichnet sich selbst als
      „work in progress“. <code>npm run check:zeit</code> prüft alle Zeitschnitte
      gegen die Gründungs- und Auflösungsjahre der Wissensbasis; aufgenommen wird
      nur, was fachlich unstrittig ist.</p>`);
  });
  $('btnCredits').addEventListener('click', () => openModal('Datenquellen & Lizenzen', creditsHtml()));

  /* ------------------------------------------------------------ Tastatur */

  document.addEventListener('keydown', (event) => {
    const inField = /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName);
    // Der Zeitregler behandelt Pfeiltasten selbst; sonst zählte jeder
    // Tastendruck doppelt, sobald er den Fokus hat.
    const onTrack = event.target === $('track');
    if (event.key === 'Escape') {
      if (!modal.hidden) { modal.hidden = true; return; }
      if (searchWrap.classList.contains('is-open')) { closeSearch(); return; }
      if (document.getElementById('app').classList.contains('is-focus')) { setFocusMode(false); return; }
      if (!battlesBox.hidden) { closeBattles(); return; }
      if (!layersMenu.hidden || !legendBox.hidden) {
        layersMenu.hidden = legendBox.hidden = true;
        return;
      }
      if (panel.isOpen) panel.close();
      return;
    }
    if (inField || onTrack) return;

    switch (event.key) {
      case '/':
        openSearch();
        event.preventDefault();
        break;
      case 's': toggleBattles(); event.preventDefault(); break;
      case 'f': setFocusMode(!document.getElementById('app').classList.contains('is-focus')); break;
      case 'v': setVollbild(!istVollbild()); break;
      case 'k': toggleBattles(); break;
      case ' ':
        timeline.toggle();
        event.preventDefault();
        break;
      case 'ArrowLeft':
      case 'ArrowRight': {
        const dir = event.key === 'ArrowRight' ? 1 : -1;
        timeline.stop();
        if (event.shiftKey) timeline.step(dir);
        else timeline.setYear(timeline.year + dir);
        event.preventDefault();
        break;
      }
      case 't': setTheme(prefs.theme === 'night' ? 'parchment' : 'night'); break;
      case 'e': togglePopover(layersMenu, $('btnLayers')); break;
      case 'l': togglePopover(legendBox, $('btnLegend')); break;
      case '0': atlas.home(); break;
      case '?': openModal('Tastaturkürzel', shortcutsHtml()); break;
      default: break;
    }
  });

  /* --------------------------------------------------------------- Start */

  timeline.setYear(state.year, { silent: true });
  timeline.render();
  await goto(startIndex, { animate: false });
  updateScale();
  drawRoseTicks();
  watchConsoleHeight();
  watchStageSize();

  if (hash.selected && state.epoch?.byName.has(hash.selected)) {
    selectPolity(hash.selected);
  }

  progress(1, 'Fertig');
  window.setTimeout(() => {
    $('boot').hidden = true;
    // Der Auftritt: Karte und Bedienelemente kommen nicht gleichzeitig, sondern
    // in der Reihenfolge, in der man sie liest – erst die Karte, dann der
    // Titel, dann die Konsole. Ein einziges Aufblenden wirkt wie ein Sprung;
    // die Staffelung liest sich wie ein aufgeschlagenes Buch. Die Klasse fällt
    // nach dem Lauf wieder weg, damit sie nichts dauerhaft festhält.
    $('app').classList.add('is-entering');
    window.setTimeout(() => $('app').classList.remove('is-entering'), 2200);
  }, 320);

  // Erst nach dem ersten Bild die Ebenen nachziehen, die eingeschaltet sind.
  window.setTimeout(() => {
    if (prefs.places) enablePlaces(true);
    if (prefs.physical) enablePhysical(true);
    if (prefs.rivers) enableWater(true);
    if (prefs.events) enableEvents(true);
  }, 600);

  watchCoastNeed();
}

/* ------------------------------------------------------------- Texte */

function aboutHtml() {
  const eras = atlasData.eras.map((e) => `
    <li><span style="color:${ERA_COLORS[e.id]}">■</span> ${esc(e.name)}</li>`).join('');
  return `
    <p>Ein interaktiver historischer Weltatlas: ${num(atlasData.epochs.length)} Zeitschnitte
    von 123.000 v. Chr. bis heute. Ziehen Sie den Regler unten, um die politische
    Landkarte durch die Jahrtausende wandern zu sehen. Ein Klick auf ein Gebiet
    öffnet den Steckbrief – mit Herrscher, Hauptstadt, Regierungsform und
    Einordnung für genau dieses Jahr.</p>

    <h3>So bedienen Sie den Atlas</h3>
    <ul>
      <li><strong>Zeitregler:</strong> ziehen, klicken oder mit ← → springen.</li>
      <li><strong>Zeitreise:</strong> die Wiedergabetaste läuft alle Epochen durch.</li>
      <li><strong>Gebiet anklicken:</strong> öffnet die Detailtafel.</li>
      <li><strong>Nachbarn:</strong> in der Tafel anklickbar – so lässt sich eine Region erwandern.</li>
      <li><strong>Einfärbung:</strong> nach Gemeinwesen, Oberhoheit, Kulturraum oder Grenzgüte.</li>
      <li><strong>Berühmte Schlachten:</strong> das Fahnensymbol oben links spielt
      den Verlauf Station für Station ab – die Stellungen verschieben sich mit.</li>
      <li><strong>Nur die Karte:</strong> <kbd>F</kbd> blendet alle Bedienelemente aus.</li>
      <li><strong>Adresszeile:</strong> Ausschnitt, Jahr und Auswahl stehen im Link – teilbar.</li>
    </ul>

    <h3>Epochen</h3>
    <ul style="columns:2">${eras}</ul>

    <h3>Wie belastbar sind die Grenzen?</h3>
    <p>Historische Grenzen sind Rekonstruktionen. Vor dem Westfälischen Frieden
    war die Vorstellung einer durchgezogenen Staatsgrenze in Europa unüblich;
    Herrschaft war abgestuft, überlappend und an Orte statt an Flächen gebunden.
    Der Datensatz verzeichnet deshalb eine Grenzgüte – in der Einfärbung
    „Grenzgüte“ sichtbar, gestrichelte Linien markieren grobe Annäherungen.</p>

    <h3>Was hier über den Ursprungsdatensatz hinausgeht</h3>
    <p>Der zugrunde liegende Datensatz springt von 1938 auf 1945 und kennt keine
    Besatzung, nur völkerrechtliche Zugehörigkeit. Die Kriegsjahre 1916/1918 und
    1940 bis 1944 sind deshalb eigens angelegt: Besetztes Land behält die Farbe
    des Landes und trägt darüber eine Schraffur in der Farbe der Besatzungsmacht.
    Ebenso ergänzt sind belegbare Lücken – etwa die Arabische Halbinsel, die im
    Jahr 700 vollständig umayyadisch war, im Datensatz aber offen blieb.</p>

    <p>Derselbe Datensatz endet 2010. Die Zeitschnitte <strong>2015</strong> und
    <strong>2026</strong> führen ihn bis heute fort: Südsudan, Kosovo, die Krim
    und der Krieg in der Ukraine. Besetztes Gebiet behält dabei den Namen des
    Landes, dem es völkerrechtlich zugerechnet wird – die von Russland
    gehaltenen Teile der Ukraine sind hier <em>Ukraine, besetzt durch
    Russland</em>. Frontverläufe sind Momentaufnahmen zum genannten Stichtag,
    keine Grenzen.</p>

    <p style="margin-top:1rem"><kbd>?</kbd> zeigt alle Tastaturkürzel.</p>`;
}

function creditsHtml() {
  const src = atlasData.index?.source ?? {};
  const grundlagen = Object.values(BASEMAPS)
    .map((b) => `<li><strong>${esc(b.name)}</strong> – ${esc(b.beschreibung)}. ${esc(b.quelle)}</li>`)
    .join('');
  return `
    <h3>Historische Grenzen</h3>
    <p><strong>${esc(src.name ?? 'Historical Basemaps')}</strong> von ${esc(src.author ?? 'André Ourednik u. a.')} –
    ${num(atlasData.epochs.length)} Zeitschnitte, lizenziert unter ${esc(src.license ?? 'GPL-3.0')}.<br>
    <a href="${esc(src.url ?? '')}" target="_blank" rel="noopener">github.com/aourednik/historical-basemaps</a></p>

    <h3>Küstenlinien, Seen und Flüsse</h3>
    <p><strong>Natural Earth</strong> (1:50 Mio.) – gemeinfrei.<br>
    <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">naturalearthdata.com</a></p>

    <h3>Kurztexte und Bilder</h3>
    <p>Die redaktionellen Steckbriefe wurden für diesen Atlas verfasst.
    Ergänzende Auszüge und Bilder stammen aus der deutschsprachigen
    <strong>Wikipedia</strong> (CC BY-SA 4.0) und werden erst beim Öffnen einer
    Tafel geladen. Diese Anreicherung lässt sich unter „Ebenen“ abschalten.</p>

    <h3>Kartengrundlage</h3>
    <p>Unter den historischen Grenzen liegt wahlweise eine Geländekarte –
    bewusst nur Relief, ohne heutige Straßen, Städte oder Staatsgrenzen: Auf
    einer Karte des Jahres 700 wäre eine Autobahn ein Fehler, ein Gebirge
    nicht.</p>
    <ul>${grundlagen}</ul>
    <p>Über „Ebenen → Kartengrundlage → Ohne“ lässt sie sich abschalten. Dann
    zeichnet der Atlas Küsten, Gewässer und Grenzen wieder vollständig selbst
    und läuft auch ohne Netzverbindung.</p>

    <h3>Kartentechnik</h3>
    <p>Leaflet zur Navigation, TopoJSON für die Geometrien. Küstenlinien,
    Grenzen und Beschriftungen zeichnet der Atlas selbst als Vektoren; nur die
    Geländeschummerung kommt als Kacheln von außen.</p>

    <h3>Hinweis</h3>
    <p>Der Datensatz ist ausdrücklich als „work in progress“ gekennzeichnet.
    Für wissenschaftliche Arbeiten sollten die Grenzverläufe mit Fachliteratur
    abgeglichen werden.</p>`;
}

function shortcutsHtml() {
  const rows = [
    ['← →', 'ein Jahr zurück / vor'],
    ['⇧ + ← →', 'zum nächsten Kartenstand springen'],
    ['Bild ↑ ↓', 'zehn Jahre'],
    ['Leertaste', 'Zeitreise starten und anhalten'],
    ['/', 'Suche öffnen'],
    ['S', 'Kriege &amp; Schlachten'],
    ['F', 'Nur die Karte – alles andere ausblenden'],
    ['T', 'Nachtatlas ⇄ Pergament'],
    ['E', 'Ebenen und Einfärbung'],
    ['L', 'Legende'],
    ['0', 'Ansicht zurücksetzen'],
    ['V', 'Vollbild ein und aus'],
    ['K', 'Kriege &amp; Schlachten'],
    ['Esc', 'Tafel, Fenster oder Vollbild schließen'],
    ['?', 'diese Übersicht'],
  ];
  return `<div class="keys">${rows.map(([k, v]) => `<kbd>${esc(k)}</kbd><span>${esc(v)}</span>`).join('')}</div>`;
}

main();
