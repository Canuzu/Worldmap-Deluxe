/**
 * Detailtafel: alles, was über ein Gemeinwesen zum gewählten Zeitpunkt
 * bekannt ist – Herrscher, Steckbrief, Einordnung, Ereignisse, Nachbarn.
 *
 * Die Tafel arbeitet dreistufig:
 *   1. Fakten aus dem Kartendatensatz (immer vorhanden)
 *   2. kuratierte Wissensbasis (deutsch, epochenbezogen)
 *   3. Wikipedia-Auszug (optional, nachgeladen)
 */
import { esc, areaText, rangeText, yearShort, initials, num } from './format.js';
import { PRECISION_LABELS } from './palette.js';
import { lookupArticle } from './wikipedia.js';

const ICON_INFO = '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="currentColor"/></svg>';
const ICON_LINK = '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path d="M14 3h7v7h-2V6.4l-8.3 8.3-1.4-1.4L17.6 5H14V3zM5 5h5v2H7v10h10v-3h2v5H5V5z" fill="currentColor"/></svg>';

export class DetailPanel {
  constructor(dom, { data, atlas, onSelect, onFocus, isWikiEnabled }) {
    this.dom = dom;
    this.data = data;
    this.atlas = atlas;
    this.onSelect = onSelect;
    this.onFocus = onFocus;
    this.isWikiEnabled = isWikiEnabled;
    this.current = null;
    this._abort = null;

    this.dom.close.addEventListener('click', () => this.close());

    this.dom.body.addEventListener('click', (event) => {
      const chip = event.target.closest('[data-goto]');
      if (chip) {
        this.onSelect(chip.dataset.goto);
        return;
      }
      const focus = event.target.closest('[data-focus]');
      if (focus) this.onFocus(focus.dataset.focus);
    });
  }

  close() {
    this.current = null;
    this.dom.root.hidden = true;
    this._abort?.abort();
    this.onSelect(null, { fromPanel: true });
  }

  get isOpen() { return !this.dom.root.hidden; }

  /**
   * @param {string} name    Name aus dem Kartendatensatz
   * @param {object} epoch   vorbereiteter Zeitschnitt
   */
  show(name, epoch) {
    const entry = epoch.byName.get(name);
    if (!entry) return;

    this._abort?.abort();
    this._abort = new AbortController();
    this.current = name;

    const year = epoch.meta.year;
    const info = this.data.lookup(name, year);
    const german = this.data.germanName(name);
    const color = this.atlas.colorOfPolity(name);

    this.dom.root.hidden = false;
    this.dom.body.scrollTop = 0;
    this.dom.body.innerHTML = this._render({ name, german, entry, epoch, year, info, color });

    this._loadWikipedia({ name, german, info });
  }

  /* ------------------------------------------------------------ Aufbau */

  _render({ name, german, entry, epoch, year, info, color }) {
    const period = info?.period ?? null;
    const base = info?.entry ?? null;

    return `
      <article class="pnl" style="--accent:${esc(color)}">
        ${this._hero({ name, german, entry, epoch, year, base, period, color })}
        ${this._ruler(period, year)}
        ${this._facts({ entry, period, base, epoch })}
        ${this._prose(period, base)}
        ${this._events(period, base, year)}
        ${this._neighbours(entry, epoch)}
        <section class="sec wiki" id="wikiSlot" hidden></section>
        ${this._foot({ name, german, base, epoch })}
      </article>
    `;
  }

  _hero({ name, german, entry, epoch, year, base, period, color }) {
    const kind = period?.kind ?? base?.kind ?? this._guessKind(entry);
    const showOriginal = german !== name;

    const chips = [];
    if (entry.sovereign && entry.sovereign !== name) {
      chips.push(`<button class="chip chip--action" data-goto="${esc(entry.sovereign)}">
        <span class="sw" style="background:${esc(this.atlas.colorOfPolity(entry.sovereign))}"></span>
        Oberhoheit: ${esc(this.data.germanName(entry.sovereign))}</button>`);
    }
    if (entry.partOf && entry.partOf !== name && entry.partOf !== entry.sovereign) {
      chips.push(`<span class="chip">Kulturraum: ${esc(this.data.germanName(entry.partOf))}</span>`);
    }
    chips.push(`<span class="chip" title="Wie genau ist der Grenzverlauf in den Quellen belegt?">
      Grenzen: ${esc(PRECISION_LABELS[entry.precision] ?? PRECISION_LABELS[0])}</span>`);
    chips.push(`<button class="chip chip--action" data-focus="${esc(name)}">Auf der Karte zeigen</button>`);

    return `
      <header class="pnl__hero">
        <div class="pnl__kicker">
          <span class="sw"></span>
          <b>${esc(kind)}</b> · ${esc(epoch.meta.label)}
        </div>
        <h2 class="pnl__title">${esc(german)}</h2>
        ${showOriginal ? `<p class="pnl__alt">im Datensatz: ${esc(name)}</p>` : ''}
        <div class="chips">${chips.join('')}</div>
      </header>
    `;
  }

  _guessKind(entry) {
    if (entry.sovereign && entry.sovereign !== entry.name) return 'Abhängiges Gebiet';
    if (entry.precision === 1) return 'Kultur- oder Siedlungsraum';
    return 'Gemeinwesen';
  }

  _ruler(period, year) {
    if (!period?.ruler) return '';
    const seal = period.rulerImage
      ? `<img src="${esc(period.rulerImage)}" alt="" loading="lazy">`
      : esc(initials(period.ruler));

    const bits = [];
    if (period.rulerTitle) bits.push(esc(period.rulerTitle));
    if (period.dynasty) bits.push(esc(period.dynasty));

    const reign = period.reign ?? rangeText(period.from, period.to);

    return `
      <section class="sec">
        <h3 class="sec__h">Herrschaft um ${esc(yearShort(year))}</h3>
        <div class="ruler">
          <div class="ruler__seal">${seal}</div>
          <div>
            <div class="ruler__name">${esc(period.ruler)}</div>
            ${bits.length ? `<div class="ruler__role">${bits.join(' · ')}</div>` : ''}
            ${reign ? `<div class="ruler__reign">Regierungszeit ${esc(reign)}</div>` : ''}
          </div>
        </div>
      </section>
    `;
  }

  _facts({ entry, period, base, epoch }) {
    const tiles = [];
    const add = (label, value, opts = {}) => {
      if (!value) return;
      tiles.push(`<div class="fact${opts.wide ? ' fact--wide' : ''}">
        <dt>${esc(label)}</dt><dd>${opts.raw ? value : esc(value)}</dd></div>`);
    };

    add('Hauptstadt', period?.capital);
    add('Regierungsform', period?.government);
    add('Herrschaftsform', period?.polity);
    add('Religion', period?.religion);
    add('Sprachen', period?.languages?.join(', '));
    add('Bevölkerung', period?.population);
    add('Wirtschaft', period?.economy, { wide: true });

    add('Fläche', `<span class="num">${esc(areaText(entry.area))}</span>`, { raw: true });
    add('Größenrang', `Nr. ${num(entry.rank + 1)} von ${num(epoch.polities.length)}`);
    if (base?.founded || base?.dissolved) {
      add('Bestand', rangeText(base.founded ?? null, base.dissolved ?? null));
    }

    if (!tiles.length) return '';
    return `<section class="sec"><h3 class="sec__h">Steckbrief</h3>
      <dl class="facts">${tiles.join('')}</dl></section>`;
  }

  _prose(period, base) {
    const text = period?.summary ?? base?.summary;
    if (!text) return '';
    const paragraphs = (Array.isArray(text) ? text : [text])
      .map((p) => `<p>${esc(p)}</p>`).join('');
    const quote = period?.quote
      ? `<blockquote class="pull">${esc(period.quote)}</blockquote>` : '';
    return `<section class="sec"><h3 class="sec__h">Überblick</h3>
      <div class="prose">${quote}${paragraphs}</div></section>`;
  }

  _events(period, base, year) {
    const events = [...(base?.events ?? []), ...(period?.events ?? [])]
      .filter((e) => e && e.text)
      .sort((a, b) => (a.year ?? 0) - (b.year ?? 0));
    if (!events.length) return '';

    // Nächstliegendes Ereignis zum aktuellen Zeitschnitt markieren
    let nearest = -1;
    let bestDelta = Infinity;
    events.forEach((e, i) => {
      const d = Math.abs((e.year ?? 0) - year);
      if (d < bestDelta) { bestDelta = d; nearest = i; }
    });

    const items = events.map((e, i) => `
      <li class="${i === nearest ? 'is-now' : ''}">
        <time>${esc(e.year != null ? yearShort(e.year) : '')}</time>
        <span>${esc(e.text)}</span>
      </li>`).join('');

    return `<section class="sec"><h3 class="sec__h">Wendepunkte</h3>
      <ul class="events">${items}</ul></section>`;
  }

  _neighbours(entry, epoch) {
    const list = (entry.neighbors ?? []).slice(0, 14);
    if (!list.length) return '';
    const chips = list.map((n) => `
      <button class="chip chip--action" data-goto="${esc(n)}">
        <span class="sw" style="background:${esc(this.atlas.colorOfPolity(n))}"></span>
        ${esc(this.data.germanName(n))}
      </button>`).join('');
    return `<section class="sec"><h3 class="sec__h">Angrenzend ${esc(epoch.meta.label)}</h3>
      <div class="chips">${chips}</div></section>`;
  }

  _foot({ name, german, base, epoch }) {
    const links = [];
    if (base?.wiki) {
      links.push(`<a href="https://de.wikipedia.org/wiki/${encodeURIComponent(base.wiki)}"
        target="_blank" rel="noopener">Wikipedia ${ICON_LINK}</a>`);
    }
    const curated = Boolean(base);
    return `
      <footer class="pnl__foot">
        ${curated ? '' : `<div class="note">${ICON_INFO}
          <span>Für <strong>${esc(german)}</strong> liegt noch kein redaktioneller Text vor.
          Angezeigt werden die Angaben des Kartendatensatzes${this.isWikiEnabled() ? ' und – sofern vorhanden – ein Wikipedia-Auszug' : ''}.</span>
        </div>`}
        <p style="margin:.8rem 0 0">
          Grenzverlauf ${esc(epoch.meta.label)} nach <em>Historical Basemaps</em>.
          Historische Karten sind Rekonstruktionen: Grenzen waren oft unscharf,
          umstritten oder gar nicht als Linie gedacht.
        </p>
        ${links.length ? `<p style="margin:.5rem 0 0">${links.join(' · ')}</p>` : ''}
      </footer>
    `;
  }

  /* --------------------------------------------------------- Wikipedia */

  async _loadWikipedia({ name, german, info }) {
    const slot = this.dom.body.querySelector('#wikiSlot');
    if (!slot || !this.isWikiEnabled()) return;

    const title = info?.entry?.wiki ?? null;
    const query = german || name;
    if (!title && !query) return;

    slot.hidden = false;
    slot.innerHTML = `<h3 class="sec__h">Aus der Wikipedia</h3>
      <div class="wiki__skeleton"><i></i><i></i><i></i></div>`;

    const signal = this._abort.signal;
    const article = await lookupArticle({ title, query }, signal);
    if (signal.aborted || this.current !== name) return;

    if (!article?.extract) {
      slot.hidden = true;
      return;
    }
    slot.innerHTML = `
      <h3 class="sec__h">Aus der Wikipedia</h3>
      <div class="wiki__body">
        ${article.thumbnail
          ? `<div class="wiki__thumb"><img src="${esc(article.thumbnail)}" alt="" loading="lazy"></div>`
          : ''}
        <div>
          <div class="wiki__text">${esc(article.extract)}</div>
          <a class="wiki__more" href="${esc(article.url)}" target="_blank" rel="noopener">
            ${esc(article.title)} lesen ${ICON_LINK}
          </a>
        </div>
      </div>`;
  }
}
