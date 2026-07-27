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
import { AtlasMap } from './modules/atlas.js';
import { Timeline } from './modules/timeline.js';
import { DetailPanel } from './modules/panel.js';
import { polityAt } from './modules/geo.js';
import { esc, fold, highlight, areaText, distanceText, num } from './modules/format.js';
import { ERA_COLORS } from './modules/palette.js';

const $ = (id) => document.getElementById(id);
const STORE_KEY = 'worldmap-deluxe:prefs';

/* ------------------------------------------------------------ Zustand */

const prefs = {
  theme: 'night',
  colorMode: 'polity',
  labels: true,
  rivers: false,
  graticule: false,
  borders: true,
  wiki: true,
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
  window.__atlasMap = atlas.map; // Messhilfe für scripts/perf
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

  /* ------------------------------------------------------- Detailtafel */

  const panel = new DetailPanel(
    { root: $('panel'), body: $('panelBody'), close: $('panelClose') },
    {
      data: atlasData,
      atlas,
      isWikiEnabled: () => prefs.wiki,
      onSelect: (name) => selectPolity(name, { open: Boolean(name) }),
      onFocus: (name) => atlas.focus(name, { padding: [80, 80] }),
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
        goto(index);
      },
    },
  );

  /* -------------------------------------------------------- Kartenlogik */

  let loadToken = 0;

  async function goto(index, { animate = true } = {}) {
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
    atlas.setEpoch(epoch, { animate });
    atlasData.prefetch(index);

    timeline.setStats({
      polities: epoch.polities.length,
      area: areaText(epoch.polities.reduce((sum, p) => sum + p.area, 0)).replace(' km²', ' km²'),
    });

    renderLegend();
    reconcileSelection();
    updateHash();
  }

  /** Auswahl über den Zeitsprung retten: gleicher Name, sonst gleicher Ort. */
  function reconcileSelection() {
    if (!state.selected) return;
    const epoch = state.epoch;
    if (epoch.byName.has(state.selected)) {
      atlas.select(state.selected);
      if (panel.isOpen) panel.show(state.selected, epoch);
      return;
    }
    const anchor = state.lastAnchor;
    const replacement = anchor ? polityAt(epoch, anchor[0], anchor[1]) : null;
    if (replacement) {
      state.selected = replacement;
      atlas.select(replacement);
      if (panel.isOpen) panel.show(replacement, epoch);
    } else {
      state.selected = null;
      atlas.select(null);
      panel.dom.root.hidden = true;
    }
  }

  function selectPolity(name, { open = true, zoom = false } = {}) {
    state.selected = name;
    if (name) {
      const entry = state.epoch?.byName.get(name);
      if (entry?.anchor) state.lastAnchor = entry.anchor;
    }
    atlas.select(name, { zoom });
    if (name && open) panel.show(name, state.epoch);
    if (!name) panel.dom.root.hidden = true;
    updateHash();
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
    list.innerHTML = epoch.polities.slice(0, 16).map((p) => `
      <li data-name="${esc(p.name)}">
        <span class="sw" style="background:${esc(atlas.colorOfPolity(p.name))}"></span>
        <span class="nm">${esc(atlasData.germanName(p.name))}</span>
        <span class="va">${esc(areaText(p.area))}</span>
      </li>`).join('');
  }

  $('legendList').addEventListener('click', (event) => {
    const li = event.target.closest('li[data-name]');
    if (li) selectPolity(li.dataset.name, { zoom: true });
  });

  /* ----------------------------------------------------------- Maßstab */

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

  function commitSearch(name) {
    suggest.hidden = true;
    searchInput.value = '';
    searchInput.blur();
    selectPolity(name, { zoom: true });
  }

  searchInput.addEventListener('input', () => runSearch(searchInput.value));
  searchInput.addEventListener('focus', () => { if (searchInput.value) runSearch(searchInput.value); });
  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') { moveCursor(1); event.preventDefault(); }
    else if (event.key === 'ArrowUp') { moveCursor(-1); event.preventDefault(); }
    else if (event.key === 'Enter' && matches[cursor]) { commitSearch(matches[cursor].polity.name); event.preventDefault(); }
    else if (event.key === 'Escape') { suggest.hidden = true; searchInput.blur(); }
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
  $('btnCredits').addEventListener('click', () => openModal('Datenquellen & Lizenzen', creditsHtml()));

  /* ------------------------------------------------------------ Tastatur */

  document.addEventListener('keydown', (event) => {
    const inField = /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName);
    // Der Zeitregler behandelt Pfeiltasten selbst; sonst zählte jeder
    // Tastendruck doppelt, sobald er den Fokus hat.
    const onTrack = event.target === $('track');
    if (event.key === 'Escape') {
      if (!modal.hidden) { modal.hidden = true; return; }
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
      case 's':
        searchInput.focus();
        event.preventDefault();
        break;
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

  if (hash.selected && state.epoch?.byName.has(hash.selected)) {
    selectPolity(hash.selected);
  }

  progress(1, 'Fertig');
  window.setTimeout(() => { $('boot').hidden = true; }, 320);

  // Erst nach dem ersten Bild: die hochaufgelöste Küstenlinie nachziehen und,
  // falls voreingestellt, die Gewässer.
  window.setTimeout(() => {
    atlasData.loadDetailedCoastline().then((ocean) => atlas.setDetailedCoastline(ocean));
    if (prefs.rivers) enableWater(true);
  }, 600);
}

/* ------------------------------------------------------------- Texte */

function aboutHtml() {
  const eras = atlasData.eras.map((e) => `
    <li><span style="color:${ERA_COLORS[e.id]}">■</span> ${esc(e.name)}</li>`).join('');
  return `
    <p>Ein interaktiver historischer Weltatlas: ${num(atlasData.epochs.length)} Zeitschnitte
    von 123.000 v. Chr. bis 2010. Ziehen Sie den Regler unten, um die politische
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

    <p style="margin-top:1rem"><kbd>?</kbd> zeigt alle Tastaturkürzel.</p>`;
}

function creditsHtml() {
  const src = atlasData.index?.source ?? {};
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

    <h3>Kartentechnik</h3>
    <p>Leaflet zur Navigation, TopoJSON für die Geometrien, alles ohne
    Kachel-Dienst: Küstenlinien und Grenzen werden direkt als Vektoren
    gezeichnet.</p>

    <h3>Hinweis</h3>
    <p>Der Datensatz ist ausdrücklich als „work in progress“ gekennzeichnet.
    Für wissenschaftliche Arbeiten sollten die Grenzverläufe mit Fachliteratur
    abgeglichen werden.</p>`;
}

function shortcutsHtml() {
  const rows = [
    ['← →', 'Zeitschnitt zurück / vor'],
    ['⇧ + ← →', 'fünf Zeitschnitte springen'],
    ['Leertaste', 'Zeitreise starten und anhalten'],
    ['/', 'Suche öffnen'],
    ['T', 'Nachtatlas ⇄ Pergament'],
    ['E', 'Ebenen und Einfärbung'],
    ['L', 'Legende'],
    ['0', 'Ansicht zurücksetzen'],
    ['Esc', 'Tafel oder Fenster schließen'],
    ['?', 'diese Übersicht'],
  ];
  return `<div class="keys">${rows.map(([k, v]) => `<kbd>${esc(k)}</kbd><span>${esc(v)}</span>`).join('')}</div>`;
}

main();
