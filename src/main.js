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
import { BattlePlayer, BATTLES } from './modules/battles.js';

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
  occupation: true,
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
        <span class="nm">${esc(atlasData.germanName(p.name))}${p.occupiers?.length
          ? ` <i class="occ" title="besetzt durch ${esc(p.occupiers.map((b) => atlasData.germanName(b.name)).join(', '))}">besetzt</i>`
          : ''}</span>
        <span class="va">${esc(areaText(p.area))}</span>
      </li>`).join('');

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
          <li data-name="${esc(name)}">
            <span class="sw sw--hatch" style="--occ:${esc(atlas.colorOfPolity(name))}"></span>
            <span class="nm">${esc(atlasData.germanName(name))} als Besatzungsmacht</span>
            <span class="va">${num(count)} Gebiete</span>
          </li>`).join('')}`);
    }
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
    selectPolity(name, { zoom: true });
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
  /* ------------------------------------------------------- Schlachten */

  const battlesBox = $('battlesBox');
  const battles = new BattlePlayer(atlas, { onStation: renderBattleStation });

  function renderBattleList() {
    $('battlesTitle').textContent = 'Berühmte Schlachten';
    $('battlesPlayer').hidden = true;
    $('battlesList').hidden = false;
    $('battlesList').innerHTML = BATTLES.map((b) => `
      <li data-battle="${esc(b.id)}">
        <b>${esc(b.name)}</b>
        <span>${esc(b.datum)} · ${esc(b.ort)}</span>
        <i>${esc(b.worum)}</i>
      </li>`).join('');
  }

  function openBattles() {
    legendBox.hidden = true;
    layersMenu.hidden = true;
    battlesBox.hidden = false;
    renderBattleList();
  }

  function closeBattles() {
    battles.close();
    battlesBox.hidden = true;
    $('app').classList.remove('is-battle');
    atlas.setShowLabels(prefs.labels);
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
    battles.start(id);
    battles.play();
  }

  function renderBattleStation(player) {
    const b = player.battle;
    if (!b) return;
    const st = player.station;
    $('battlesList').hidden = true;
    $('battlesTitle').textContent = b.name;
    const box = $('battlesPlayer');
    box.hidden = false;
    box.innerHTML = `
      <p class="battles__meta">${esc(b.datum)} · ${esc(b.ort)}</p>
      <ul class="battles__sides">${b.parteien.map((p) => `
        <li><span class="sw" style="background:${esc(p.farbe)}"></span>
          <b>${esc(p.name)}</b><span>${esc(p.fuehrung)} · ${esc(p.staerke)}</span></li>`).join('')}</ul>
      <div class="battles__stage">
        <div class="battles__zeit">${esc(st.zeit)}</div>
        <p class="battles__text">${esc(st.text)}</p>
      </div>
      <div class="battles__steps">${b.stationen.map((_, i) => `
        <i class="${i === player.index ? 'is-on' : ''}" data-step="${i}"></i>`).join('')}</div>
      <div class="battles__controls">
        <button class="tbtn" data-act="prev" ${player.index === 0 ? 'disabled' : ''} aria-label="Zurück">
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
      </div>`;
  }

  battlesBox.addEventListener('click', (event) => {
    const li = event.target.closest('li[data-battle]');
    if (li) { startBattle(li.dataset.battle); return; }
    const step = event.target.closest('[data-step]');
    if (step) { battles.stop(); battles.goTo(Number(step.dataset.step)); return; }
    const act = event.target.closest('[data-act]')?.dataset.act;
    if (act === 'prev') { battles.stop(); battles.step(-1); }
    else if (act === 'next') { battles.stop(); battles.step(1); }
    else if (act === 'play') battles.toggle();
    else if (act === 'back') {
      battles.close();
      $('app').classList.remove('is-battle');
      atlas.setShowLabels(prefs.labels);
      renderBattleList();
    }
  });
  $('battlesClose').addEventListener('click', closeBattles);
  $('btnBattles').addEventListener('click', toggleBattles);

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
    Besatzung, nur völkerrechtliche Zugehörigkeit. Die Kriegsjahre 1940 bis 1944
    sind deshalb eigens angelegt: Besetztes Land behält die Farbe des Landes und
    trägt darüber eine Schraffur in der Farbe der Besatzungsmacht. Ebenso ergänzt
    sind belegbare Lücken – etwa die Arabische Halbinsel, die im Jahr 700
    vollständig umayyadisch war, im Datensatz aber offen blieb.</p>

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
    ['← →', 'ein Jahr zurück / vor'],
    ['⇧ + ← →', 'zum nächsten Kartenstand springen'],
    ['Bild ↑ ↓', 'zehn Jahre'],
    ['Leertaste', 'Zeitreise starten und anhalten'],
    ['/', 'Suche öffnen'],
    ['S', 'Berühmte Schlachten'],
    ['F', 'Nur die Karte – alles andere ausblenden'],
    ['T', 'Nachtatlas ⇄ Pergament'],
    ['E', 'Ebenen und Einfärbung'],
    ['L', 'Legende'],
    ['0', 'Ansicht zurücksetzen'],
    ['Esc', 'Tafel, Fenster oder Vollbild schließen'],
    ['?', 'diese Übersicht'],
  ];
  return `<div class="keys">${rows.map(([k, v]) => `<kbd>${esc(k)}</kbd><span>${esc(v)}</span>`).join('')}</div>`;
}

main();
