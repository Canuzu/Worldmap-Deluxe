/**
 * Zeitleiste.
 *
 * Die 53 Zeitschnitte liegen extrem ungleich verteilt (123.000 v. Chr. bis
 * 2010). Eine lineare Jahresachse wäre unbedienbar – 99 % des Reglers
 * entfielen auf die Steinzeit. Deshalb bekommt jeder Zeitschnitt dieselbe
 * Breite; das Epochenband darüber stellt den historischen Zusammenhang her,
 * die Jahreszahlen unter der Achse die tatsächliche Zeitspanne.
 */
import { ERA_COLORS } from './palette.js';
import { yearParts, yearShort, num } from './format.js';

export class Timeline {
  constructor(dom, { epochs, eras, onChange, onScrub }) {
    this.dom = dom;
    this.epochs = epochs;
    this.eras = eras;
    this.onChange = onChange;
    this.onScrub = onScrub ?? (() => {});
    this.index = 0;
    this.playing = false;
    this._timer = null;
    this.playInterval = 1500;

    this._buildEras();
    this._buildTicks();
    this._buildScale();
    this._bind();

    this._bubble = document.createElement('div');
    this._bubble.className = 'track__bubble';
    this.dom.track.appendChild(this._bubble);

    window.addEventListener('resize', () => { this._buildScale(); this._fitEraLabels(); this.render(); });
  }

  get count() { return this.epochs.length; }

  fraction(index) {
    return this.count < 2 ? 0 : index / (this.count - 1);
  }

  /* ------------------------------------------------------------- Aufbau */

  _buildEras() {
    const spans = [];
    this.epochs.forEach((epoch, i) => {
      const last = spans[spans.length - 1];
      if (last && last.era === epoch.era) last.end = i;
      else spans.push({ era: epoch.era, start: i, end: i });
    });

    this.dom.eras.innerHTML = '';
    const n = this.count - 1;
    for (const span of spans) {
      const from = Math.max(0, (span.start - .5) / n);
      const to = Math.min(1, (span.end + .5) / n);
      const era = this.eras.find((e) => e.id === span.era);
      const el = document.createElement('i');
      el.style.setProperty('--c', ERA_COLORS[span.era] ?? '#777');
      el.style.flex = `0 0 ${((to - from) * 100).toFixed(3)}%`;
      el.title = era?.name ?? '';
      el.dataset.era = span.era;
      const label = document.createElement('b');
      label.textContent = era?.short ?? '';
      label.dataset.full = era?.short ?? '';
      el.appendChild(label);
      this.dom.eras.appendChild(el);
    }
    this._fitEraLabels();
  }

  /**
   * Textbreite messen. Die Beschriftungen liegen absolut positioniert im
   * Band, ihre scrollWidth entspricht deshalb der Segmentbreite und nicht
   * der Textbreite – gemessen wird darum auf einem Canvas.
   */
  _measure(text, font) {
    if (!this._ctx) this._ctx = document.createElement('canvas').getContext('2d');
    this._ctx.font = font;
    return this._ctx.measureText(text).width;
  }

  _fontOf(el) {
    const cs = getComputedStyle(el);
    return `${cs.fontWeight} ${cs.fontSize}/${cs.lineHeight} ${cs.fontFamily}`;
  }

  /**
   * Epochennamen nur anzeigen, wenn das Band breit genug ist – abgeschnittene
   * Wortfragmente ("NEOLITHIKU") sehen nach einem Fehler aus.
   */
  _fitEraLabels() {
    requestAnimationFrame(() => {
      const first = this.dom.eras.firstElementChild?.firstElementChild;
      if (!first) return;
      const font = this._fontOf(first);
      const spacing = parseFloat(getComputedStyle(first).letterSpacing) || 0;

      for (const segment of this.dom.eras.children) {
        const label = segment.firstElementChild;
        if (!label) continue;
        const full = label.dataset.full ?? '';
        const width = this._measure(full, font) + spacing * full.length;
        label.textContent = width + 12 <= segment.clientWidth ? full : '';
      }
    });
  }

  _buildTicks() {
    this.dom.ticks.innerHTML = '';
    this._tickEls = this.epochs.map((epoch, i) => {
      const el = document.createElement('i');
      el.style.left = `${(this.fraction(i) * 100).toFixed(4)}%`;
      el.title = epoch.label;
      // „runde“ Jahre bekommen einen längeren Strich
      if (epoch.year % 500 === 0 || [1492, 1815, 1914, 1945].includes(epoch.year)) {
        el.classList.add('is-major');
      }
      this.dom.ticks.appendChild(el);
      return el;
    });
  }

  /**
   * Jahresachse. Statt eines festen Rasters werden die Beschriftungen von
   * links nach rechts gesetzt und nur übernommen, wenn sie neben die
   * vorherige passen – die Abstände zwischen den Zeitschnitten sind gleich,
   * die Textbreiten aber nicht ("123.000 v. Chr." gegen "1914").
   */
  _buildScale() {
    const width = this.dom.track.clientWidth || 800;
    this.dom.scale.innerHTML = '';
    if (!width) return;

    const probe = document.createElement('i');
    this.dom.scale.appendChild(probe);
    const font = this._fontOf(probe);
    probe.remove();

    const GAP = 14;
    const place = [];
    let lastRight = -Infinity;

    const consider = (i, force = false) => {
      const epoch = this.epochs[i];
      const text = yearShort(epoch.year);
      const w = this._measure(text, font);
      const center = this.fraction(i) * width;
      // Randbeschriftungen bleiben innerhalb der Achse.
      const left = Math.max(0, Math.min(width - w, center - w / 2));
      if (!force && left < lastRight + GAP) return false;
      if (force) {
        while (place.length && place[place.length - 1].right > left - GAP) place.pop();
      }
      place.push({ left, right: left + w, text });
      lastRight = left + w;
      return true;
    };

    for (let i = 0; i < this.count - 1; i++) consider(i);
    consider(this.count - 1, true);

    for (const item of place) {
      const el = document.createElement('i');
      el.style.left = `${item.left.toFixed(1)}px`;
      el.style.transform = 'none';
      el.textContent = item.text;
      this.dom.scale.appendChild(el);
    }
  }

  /* ------------------------------------------------------------ Bedienung */

  _indexFromEvent(event) {
    const rect = this.dom.track.getBoundingClientRect();
    const x = (event.clientX ?? 0) - rect.left;
    const t = Math.max(0, Math.min(1, x / rect.width));
    return Math.round(t * (this.count - 1));
  }

  _bind() {
    const track = this.dom.track;
    let dragging = false;

    const move = (event) => {
      const index = this._indexFromEvent(event);
      if (index !== this.index) this.set(index, { commit: false });
      this._updateBubble(index);
    };

    track.addEventListener('pointerdown', (event) => {
      dragging = true;
      track.setPointerCapture(event.pointerId);
      track.classList.add('is-dragging');
      this.stop();
      move(event);
    });
    track.addEventListener('pointermove', (event) => {
      if (dragging) move(event);
    });
    const end = (event) => {
      if (!dragging) return;
      dragging = false;
      track.classList.remove('is-dragging');
      try { track.releasePointerCapture(event.pointerId); } catch { /* egal */ }
      this.set(this.index, { commit: true });
    };
    track.addEventListener('pointerup', end);
    track.addEventListener('pointercancel', end);

    track.addEventListener('keydown', (event) => {
      const jump = event.shiftKey ? 5 : 1;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') this.step(-jump);
      else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') this.step(jump);
      else if (event.key === 'Home') this.set(0);
      else if (event.key === 'End') this.set(this.count - 1);
      else return;
      event.preventDefault();
    });

    this.dom.prev.addEventListener('click', () => { this.stop(); this.step(-1); });
    this.dom.next.addEventListener('click', () => { this.stop(); this.step(1); });
    this.dom.play.addEventListener('click', () => this.toggle());

    this.dom.eras.addEventListener('click', (event) => {
      const el = event.target.closest('i[data-era]');
      if (!el) return;
      const first = this.epochs.findIndex((e) => e.era === el.dataset.era);
      if (first >= 0) { this.stop(); this.set(first); }
    });
  }

  _updateBubble(index) {
    const epoch = this.epochs[index];
    this._bubble.textContent = epoch.label;
    this._bubble.style.left = `${(this.fraction(index) * 100).toFixed(3)}%`;
  }

  /* ---------------------------------------------------------- Zustand */

  set(index, { commit = true, silent = false } = {}) {
    const next = Math.max(0, Math.min(this.count - 1, index));
    const changed = next !== this.index;
    this.index = next;
    this.render();
    if (!silent && (changed || commit)) this.onChange(next, { commit });
    if (changed) this.onScrub(next);
  }

  step(delta) {
    this.set(this.index + delta);
  }

  render() {
    const epoch = this.epochs[this.index];
    const t = this.fraction(this.index);

    this.dom.handle.style.transform = `translateX(${(t * this.dom.track.clientWidth).toFixed(1)}px)`;
    this.dom.fill.style.width = `${(t * 100).toFixed(3)}%`;
    this._tickEls.forEach((el, i) => el.classList.toggle('is-active', i === this.index));

    const { value, era } = yearParts(epoch.year);
    this.dom.yearBig.innerHTML = `${value}<sub>${era}</sub>`;

    const eraDef = this.eras.find((e) => e.id === epoch.era);
    this.dom.yearEra.textContent = eraDef?.name ?? '';
    this.dom.yearTitle.textContent = epoch.title ? `· ${epoch.title}` : '';
    this.dom.timeline.style.setProperty('--era-color', ERA_COLORS[epoch.era] ?? 'var(--gold)');

    this.dom.track.setAttribute('aria-valuenow', String(this.index));
    this.dom.track.setAttribute('aria-valuetext', `${epoch.label}${epoch.title ? `, ${epoch.title}` : ''}`);
    this.dom.prev.disabled = this.index === 0;
    this.dom.next.disabled = this.index === this.count - 1;
  }

  setStats({ polities, area }) {
    this.dom.stats.innerHTML = `
      <div><b>${num(polities)}</b>Gemeinwesen</div>
      ${area ? `<div><b>${area}</b>kartiert</div>` : ''}
    `;
  }

  /* ------------------------------------------------------------ Abspielen */

  toggle() { this.playing ? this.stop() : this.play(); }

  play() {
    if (this.playing) return;
    if (this.index >= this.count - 1) this.set(0);
    this.playing = true;
    this._syncPlayButton();
    this._timer = window.setInterval(() => {
      if (this.index >= this.count - 1) { this.stop(); return; }
      this.step(1);
    }, this.playInterval);
  }

  stop() {
    if (!this.playing) return;
    this.playing = false;
    window.clearInterval(this._timer);
    this._timer = null;
    this._syncPlayButton();
  }

  _syncPlayButton() {
    const btn = this.dom.play;
    btn.querySelector('.i-play').hidden = this.playing;
    btn.querySelector('.i-pause').hidden = !this.playing;
    btn.title = this.playing ? 'Zeitreise anhalten (Leertaste)' : 'Zeitreise starten (Leertaste)';
    btn.setAttribute('aria-label', btn.title);
  }
}
