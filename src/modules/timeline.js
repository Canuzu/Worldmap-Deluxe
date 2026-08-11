/**
 * Zeitleiste.
 *
 * Die Zeitschnitte liegen extrem ungleich verteilt (123.000 v. Chr. bis
 * heute). Eine lineare Jahresachse wäre unbedienbar – 99 % des Reglers
 * entfielen auf die Steinzeit. Deshalb bekommt jeder Zeitschnitt dieselbe
 * Breite; das Epochenband darüber stellt den historischen Zusammenhang her,
 * die Jahreszahlen unter der Achse die tatsächliche Zeitspanne.
 */
import { ERA_COLORS } from './palette.js';
import { yearParts, yearShort, yearText, num, esc } from './format.js';
import { txt } from './sprache.js';

export class Timeline {
  constructor(dom, { epochs, eras, onChange, onScrub }) {
    this.dom = dom;
    this.epochs = epochs;
    this.eras = eras;
    this.onChange = onChange;
    this.onScrub = onScrub ?? (() => {});
    this.index = 0;
    // Das frei gewählte Jahr. Es ist unabhängig vom Zeitschnitt: Der Regler
    // läuft jahresgenau, die Karte zeigt den nächstgelegenen Kartenstand.
    this.year = epochs[0].year;
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

    const neuVermessen = () => { this._buildScale(); this._fitEraLabels(); this.render(); };
    window.addEventListener('resize', neuVermessen);
    // Nicht nur das Fenster ändert die Breite der Leiste: Beim Öffnen der
    // Detailtafel wird die Bühne schmaler, ohne dass ein resize-Ereignis
    // fällt. Ohne das hier blieben abgeschnittene Epochennamen stehen
    // („GEGENWA“) und die Jahreszahlen der Skala liefen über den Rand.
    if ('ResizeObserver' in window) new ResizeObserver(neuVermessen).observe(this.dom.track);
  }

  get count() { return this.epochs.length; }

  fraction(index) {
    return this.count < 2 ? 0 : index / (this.count - 1);
  }

  /**
   * Reglerposition (0…1) → Jahr.
   *
   * Jeder Zeitschnitt belegt denselben Abschnitt der Achse – sonst entfiele
   * fast der gesamte Regler auf die Steinzeit. Innerhalb eines Abschnitts
   * wird linear zwischen den beiden benachbarten Zeitschnitten interpoliert,
   * sodass sich jedes Jahr dazwischen anwählen lässt.
   */
  yearAt(t) {
    const n = this.count - 1;
    const pos = Math.max(0, Math.min(n, t * n));
    const i = Math.min(n - 1, Math.floor(pos));
    const frac = pos - i;
    const a = this.epochs[i].year;
    const b = this.epochs[i + 1].year;
    return Math.round(a + (b - a) * frac);
  }

  /** Jahr → Reglerposition (0…1); Umkehrung von yearAt. */
  fractionForYear(year) {
    const n = this.count - 1;
    const first = this.epochs[0].year;
    const last = this.epochs[n].year;
    if (year <= first) return 0;
    if (year >= last) return 1;
    for (let i = 0; i < n; i++) {
      const a = this.epochs[i].year;
      const b = this.epochs[i + 1].year;
      if (year >= a && year <= b) {
        const frac = b === a ? 0 : (year - a) / (b - a);
        return (i + frac) / n;
      }
    }
    return 1;
  }

  /** Index des Zeitschnitts, dessen Jahr dem gewählten am nächsten liegt. */
  indexForYear(year) {
    let best = 0;
    let bestDelta = Infinity;
    this.epochs.forEach((e, i) => {
      const d = Math.abs(e.year - year);
      if (d < bestDelta) { bestDelta = d; best = i; }
    });
    return best;
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

  _yearFromEvent(event) {
    const rect = this.dom.track.getBoundingClientRect();
    const x = (event.clientX ?? 0) - rect.left;
    const t = Math.max(0, Math.min(1, x / rect.width));
    return this.yearAt(t);
  }

  _bind() {
    const track = this.dom.track;
    let dragging = false;

    const move = (event) => {
      const year = this._yearFromEvent(event);
      if (year !== this.year) this.setYear(year, { commit: false });
      this._updateBubble();
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
      this.setYear(this.year, { commit: true });
    };
    track.addEventListener('pointerup', end);
    track.addEventListener('pointercancel', end);

    track.addEventListener('keydown', (event) => {
      const back = event.key === 'ArrowLeft' || event.key === 'ArrowDown';
      const fwd = event.key === 'ArrowRight' || event.key === 'ArrowUp';
      if (back || fwd) {
        const dir = fwd ? 1 : -1;
        // Umschalt springt zum nächsten Kartenstand, sonst ein Jahr weiter.
        if (event.shiftKey) this.step(dir);
        else this.setYear(this.year + dir);
      } else if (event.key === 'PageUp') this.setYear(this.year + 10);
      else if (event.key === 'PageDown') this.setYear(this.year - 10);
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

  _updateBubble() {
    this._bubble.textContent = yearText(this.year);
    this._bubble.style.left = `${(this.fractionForYear(this.year) * 100).toFixed(3)}%`;
  }

  /* ---------------------------------------------------------- Zustand */

  /** Zeitschnitt anspringen – setzt das Jahr auf dessen Stichjahr. */
  set(index, options = {}) {
    const next = Math.max(0, Math.min(this.count - 1, index));
    this.setYear(this.epochs[next].year, options);
  }

  /**
   * Freies Jahr wählen. Die Karte wechselt nur, wenn dadurch ein anderer
   * Kartenstand der nächstgelegene wird.
   */
  setYear(year, { commit = true, silent = false } = {}) {
    const first = this.epochs[0].year;
    const last = this.epochs[this.count - 1].year;
    this.year = Math.max(first, Math.min(last, Math.round(year)));

    const next = this.indexForYear(this.year);
    const changed = next !== this.index;
    this.index = next;
    this.render();

    if (!silent && (changed || commit)) this.onChange(next, { commit, year: this.year });
    if (changed) this.onScrub(next);
  }

  /** Einen ganzen Zeitschnitt weiter. */
  step(delta) {
    this.set(this.index + delta);
  }

  render() {
    const epoch = this.epochs[this.index];
    const t = this.fractionForYear(this.year);

    this.dom.handle.style.transform = `translateX(${(t * this.dom.track.clientWidth).toFixed(1)}px)`;
    this.dom.fill.style.width = `${(t * 100).toFixed(3)}%`;
    this._tickEls.forEach((el, i) => el.classList.toggle('is-active', i === this.index));

    const { value, era } = yearParts(this.year);
    this.dom.yearBig.innerHTML = `${value}<sub>${era}</sub>`;

    const eraDef = this.eras.find((e) => e.id === epoch.era);
    this.dom.yearEra.textContent = eraDef?.name ?? '';

    // Nur die Epoche, in der man gerade steht, wird voll gesättigt gezeigt.
    // Fünfzehn gleich laute Farbblöcke haben vorher mit der Karte um
    // Aufmerksamkeit gestritten.
    for (const segment of this.dom.eras.children) {
      segment.classList.toggle('is-now', segment.dataset.era === epoch.era);
    }

    // Ehrlich bleiben: Der Datensatz kennt nur eine begrenzte Zahl von
    // Kartenständen. Wird ein Jahr dazwischen gewählt, muss sichtbar sein,
    // welcher Stand gezeigt wird. In den Kriegsjahren zählt zusätzlich der
    // Monat – zwischen Juli und Dezember 1942 lag die Wende von Stalingrad.
    const exact = this.year === epoch.year;
    const teile = [];
    if (!exact) teile.push(txt('zeit.kartenstand', { stand: esc(yearText(epoch.year)) }));
    if (epoch.stand) teile.push(txt('zeit.standb', { stand: esc(epoch.stand) }));
    if (epoch.title) teile.push(esc(epoch.title));
    // Herkunft offenlegen: Zeitschnitte, die es im Ursprungsdatensatz nicht
    // gibt, und solche mit Korrekturen tragen ein anklickbares Zeichen.
    if (epoch.eiszeitKueste) {
      teile.push(`<button class="herkunft" data-herkunft="eiszeit" `
        + `title="${esc(txt('zeit.eiszeitkueste.hilfe'))}">${esc(txt('zeit.eiszeitkueste'))}</button>`);
    }
    if (epoch.ergaenzt) {
      teile.push(`<button class="herkunft" data-herkunft="ergaenzt" `
        + `title="${esc(txt('zeit.ergaenzt.hilfe'))}">${esc(txt('zeit.ergaenzt'))}</button>`);
    } else if (epoch.korrigiert) {
      const k = epoch.korrigiert;
      const was = [
        k.umbenannt ? txt('zeit.korr.umbenannt', { zahl: k.umbenannt }) : null,
        k.ergaenzt ? txt('zeit.korr.ergaenzt', { zahl: k.ergaenzt }) : null,
      ].filter(Boolean).join(', ');
      teile.push(`<button class="herkunft" data-herkunft="korrigiert" `
        + `title="${esc(txt('zeit.korrigiert.hilfe', { was }))}">${esc(txt('zeit.korrigiert'))}</button>`);
    }
    this.dom.yearTitle.innerHTML = teile.length ? `· ${teile.join(' · ')}` : '';
    this.dom.yearTitle.classList.toggle('is-approx', !exact);
    this.dom.timeline.style.setProperty('--era-color', ERA_COLORS[epoch.era] ?? 'var(--gold)');

    this.dom.track.setAttribute('aria-valuenow', String(this.year));
    this.dom.track.setAttribute('aria-valuetext',
      exact
        ? txt('zeit.regler.wert', {
          stand: yearText(epoch.year), titel: epoch.title ? `, ${epoch.title}` : '',
        })
        : txt('zeit.regler.naeherung', {
          jahr: yearText(this.year), stand: yearText(epoch.year),
        }));
    this.dom.prev.disabled = this.index === 0;
    this.dom.next.disabled = this.index === this.count - 1;
  }

  setStats({ polities, area }) {
    this.dom.stats.innerHTML = `
      <div><b>${num(polities)}</b>${esc(txt('zeit.gemeinwesen'))}</div>
      ${area ? `<div><b>${area}</b>${esc(txt('zeit.kartiert'))}</div>` : ''}
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
    // SVGElement spiegelt das hidden-Attribut nicht als Eigenschaft – eine
    // Zuweisung an .hidden legte nur ein totes Feld an, die Schaltfläche
    // blieb stehen. Deshalb das Attribut selbst schalten.
    btn.querySelector('.i-play').toggleAttribute('hidden', this.playing);
    btn.querySelector('.i-pause').toggleAttribute('hidden', !this.playing);
    btn.title = this.playing ? 'Zeitreise anhalten (Leertaste)' : 'Zeitreise starten (Leertaste)';
    btn.setAttribute('aria-label', btn.title);
  }
}
