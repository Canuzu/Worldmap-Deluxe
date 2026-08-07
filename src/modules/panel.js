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
import RELIGION from '../data/religion/vokabular.json';
import { PRECISION_LABELS } from './palette.js';
import { lookupArticle } from './wikipedia.js';

/**
 * Kurzform eines Herrschernamens für die Regierungsfolge.
 *
 * „Friedrich Wilhelm III.“ passt nicht in eine Schaltfläche von vier Zeichen
 * Breite. Ordnungszahl und Rufname reichen zum Wiedererkennen; der volle Name
 * steht im Hinweistext.
 */
function kurzName(name) {
  const teile = name.split(' ');
  if (teile.length === 1) return name;
  // Die Ordnungszahl ist das Unterscheidende: „Ludwig XIV.“ und „Ludwig XVI.“
  // trennt sonst nichts mehr.
  const ordnung = teile.find((t) => /^[IVXLC]+\.?$/.test(t));
  if (ordnung) return `${teile[0]} ${ordnung}`;
  // Bindewörter am Ende abschneiden: „Philipp von“ liest sich wie ein Fehler,
  // „Philipp“ nicht.
  const zwei = teile.slice(0, 2);
  if (/^(von|van|de|del|der|und|of|the|ibn|bin)$/i.test(zwei[1])) return zwei[0];
  const kurz = zwei.join(' ');
  return kurz.length <= 16 ? kurz : zwei[0];
}

/** Jahreszahl ohne „n. Chr.“, mit „v.“ für die Zeit davor. */
function jahrKurz(jahr) {
  if (jahr == null) return '';
  return jahr < 0 ? `${-jahr} v.` : String(jahr);
}

const ICON_INFO = '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="currentColor"/></svg>';
const ICON_LINK = '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path d="M14 3h7v7h-2V6.4l-8.3 8.3-1.4-1.4L17.6 5H14V3zM5 5h5v2H7v10h10v-3h2v5H5V5z" fill="currentColor"/></svg>';

export class DetailPanel {
  constructor(dom, { data, atlas, onSelect, onFocus, onYear, isWikiEnabled }) {
    this.dom = dom;
    this.data = data;
    this.atlas = atlas;
    this.onSelect = onSelect;
    this.onFocus = onFocus;
    this.onYear = onYear ?? (() => {});
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
      if (focus) { this.onFocus(focus.dataset.focus); return; }
      // Ein Klick auf einen Herrscher springt in seine Regierungszeit. Die
      // Karte wandert mit – so lässt sich eine Dynastie durchblättern und
      // zusehen, wie sich die Grenzen unter ihr verschieben.
      const jahr = event.target.closest('[data-jahr]');
      if (jahr) this.onYear(Number(jahr.dataset.jahr));
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
  /**
   * @param {string} name    Gemeinwesen
   * @param {object} epoch   geladener Zeitschnitt
   * @param {number} [jahr]  am Regler gewähltes Jahr
   *
   * Das gewählte Jahr ist nicht dasselbe wie das des Kartenstands: Der Regler
   * läuft jahresgenau, die Karte kennt nur 62 Stände. Für die Grenzen zählt
   * der Kartenstand, für den Herrscher das gewählte Jahr – sonst bliebe
   * zwischen 1815 und 1913 derselbe Name stehen, obwohl der Regler ein
   * Jahrhundert weitergelaufen ist. Wo beides auseinanderfällt, sagt die
   * Kopfzeile es bereits.
   */
  show(name, epoch, jahr) {
    const entry = epoch.byName.get(name);
    if (!entry) return;

    this._abort?.abort();
    this._abort = new AbortController();
    this.current = name;
    this.currentYear = jahr ?? epoch.meta.year;

    const year = this.currentYear;
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
        ${this._ruler(period, year, info?.ruler)}
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
    // Besatzung zuerst: Sie ist die für den Zeitschnitt wichtigste Aussage und
    // widerspricht dem, was die Fläche allein nahelegt.
    for (const b of entry.occupiers ?? []) {
      if (b.name === name) continue;
      chips.push(`<button class="chip chip--occupied chip--action" data-goto="${esc(b.name)}"
        title="Das Gebiet blieb ${esc(german)}, stand aber unter fremder Herrschaft.">
        <span class="sw" style="background:${esc(this.atlas.colorOfPolity(b.name))}"></span>
        Besetzt durch ${esc(this.data.germanName(b.name))}</button>`);
    }
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
    if (entry.occupiers?.length) return 'Besetztes Gebiet';
    if (entry.sovereign && entry.sovereign !== entry.name) return 'Abhängiges Gebiet';
    if (entry.precision === 1) return 'Kultur- oder Siedlungsraum';
    return 'Gemeinwesen';
  }

  /**
   * Herrschaft zum gewählten Jahr.
   *
   * Führt der Zeitabschnitt eine Herrscherliste, steht hier der zum Jahr
   * passende Name – und darunter die Regierungsfolge zum Durchblättern. Ohne
   * Liste bleibt es beim einzelnen Namen des Abschnitts.
   */
  _ruler(period, year, ruler) {
    if (!ruler?.name) return '';

    const seal = ruler.image
      ? `<img src="${esc(ruler.image)}" alt="" loading="lazy">`
      : esc(initials(ruler.name));

    const bits = [];
    if (ruler.title) bits.push(esc(ruler.title));
    if (ruler.house ?? period?.dynastie ?? period?.dynasty) {
      bits.push(esc(ruler.house ?? period.dynastie ?? period.dynasty));
    }

    const reign = ruler.reign ?? rangeText(ruler.from, ruler.to);
    const liste = period?.rulers ?? [];

    return `
      <section class="sec">
        <h3 class="sec__h">Herrschaft ${esc(yearShort(year))}</h3>
        <div class="ruler${ruler.nachwirkend || ruler.vorzeitig ? ' ruler--luecke' : ''}">
          <div class="ruler__seal">${seal}</div>
          <div>
            ${ruler.nachwirkend ? '<div class="ruler__gap">Für dieses Jahr ist niemand verzeichnet – zuletzt regierte</div>' : ''}
            ${ruler.vorzeitig ? '<div class="ruler__gap">Die Liste beginnt später – der erste verzeichnete Name lautet</div>' : ''}
            <div class="ruler__name">${esc(ruler.name)}</div>
            ${bits.length ? `<div class="ruler__role">${bits.join(' · ')}</div>` : ''}
            ${reign ? `<div class="ruler__reign">Regierungszeit ${esc(reign)}</div>` : ''}
            ${ruler.note ? `<div class="ruler__note">${esc(ruler.note)}</div>` : ''}
          </div>
        </div>
        ${this._rulerLine(liste, ruler, year)}
      </section>
    `;
  }

  /**
   * Die Regierungsfolge als anklickbare Reihe.
   *
   * Bewusst nicht die ganze Liste: Bei den Osmanen wären das 36 Namen. Gezeigt
   * werden der aktuelle und je zwei davor und danach – wer weiter will, klickt
   * sich Schritt für Schritt durch, und die Karte geht jedes Mal mit.
   */
  _rulerLine(liste, aktuell, year) {
    if (liste.length < 2) return '';
    const i = liste.findIndex((r) => r === aktuell || (r.name === aktuell.name && r.from === aktuell.from));
    const von = Math.max(0, Math.min(i - 2, liste.length - 5));
    const bis = Math.min(liste.length, von + 5);
    const teil = liste.slice(von, bis);

    const knoepfe = teil.map((r) => {
      const ist = r.name === aktuell.name && r.from === aktuell.from;
      // In die Mitte der Regierungszeit springen, nicht auf das erste Jahr:
      // Ein Herrschaftsantritt fällt oft mit einem Krieg zusammen, und die
      // Karte des Antrittsjahres zeigt dann den Zustand davor.
      const ziel = r.to != null && r.from != null
        ? Math.round((r.from + r.to) / 2)
        : (r.from ?? year);
      return `<button class="reign${ist ? ' is-now' : ''}" type="button" data-jahr="${ziel}"
        title="${esc(r.name)} · ${esc(rangeText(r.from, r.to))}">
        <b>${esc(r.short ?? kurzName(r.name))}</b>
        <i>${esc(jahrKurz(r.from))}</i>
      </button>`;
    }).join('');

    const mehrDavor = von > 0;
    const mehrDanach = bis < liste.length;
    return `
      <div class="reigns" role="group" aria-label="Regierungsfolge">
        ${mehrDavor ? '<span class="reigns__more" aria-hidden="true">…</span>' : ''}
        ${knoepfe}
        ${mehrDanach ? '<span class="reigns__more" aria-hidden="true">…</span>' : ''}
      </div>
      <p class="reigns__hint">${liste.length} Herrschende hinterlegt – ein Klick springt in ihre Zeit.</p>
    `;
  }

  _facts({ entry, period, base, epoch }) {
    const tiles = [];
    const add = (label, value, opts = {}) => {
      if (!value) return;
      tiles.push(`<div class="fact${opts.wide ? ' fact--wide' : ''}">
        <dt>${esc(label)}</dt><dd>${opts.raw ? value : esc(value)}</dd></div>`);
    };

    /* Im Religionsmodus wird zuerst gefragt, was die Karte gerade zeigt.
     *
     * Das ist der eigentliche Sinn eines Kartenmodus: Er bestimmt nicht nur
     * die Farbe der Flächen, sondern die Frage, die man an ein Land stellt.
     * Wer die Religionskarte offen hat und auf das Mogulreich klickt, will
     * nicht zuerst die Hauptstadt lesen. */
    if (this.atlas?.colorMode === 'religion' && entry.religion) {
      const r = entry.religion;
      const nameVon = (k) => RELIGION.klassen[k]?.name ?? k;
      const guete = { 3: 'in Quellen belegt', 2: 'aus regionaler Regel', 1: 'grobe Schätzung' }[r.guete];
      if (r.staat === r.volk) {
        add('Religion', `${nameVon(r.volk)} <i class="fact__guete">${esc(guete)}</i>`,
          { raw: true, wide: true });
      } else {
        // Der Fall, für den es die Ebene gibt – deshalb steht er auch als
        // eigene Kachel da und nicht als Nebensatz.
        add('Bevölkerung glaubt', `${nameVon(r.volk)}`, { raw: false });
        add('Herrschaft bekennt sich zu', `${nameVon(r.staat)}`, { raw: false });
        add('Verhältnis', `Hof und Land gehören verschiedenen Religionen an. `
          + `<i class="fact__guete">${esc(guete)}</i>`, { raw: true, wide: true });
      }
    }

    add('Hauptstadt', period?.capital);
    add('Regierungsform', period?.government);
    add('Herrschaftsform', period?.polity);
    add('Religion', period?.religion);
    add('Sprachen', period?.languages?.join(', '));
    add('Bevölkerung', period?.population);
    add('Wirtschaft', period?.economy, { wide: true });

    add('Fläche', `<span class="num">${esc(areaText(entry.area))}</span>`, { raw: true });
    // Wie viel des Landes fremd besetzt war – die Zahl macht den Unterschied
    // zwischen Randbesetzung und fast vollständiger Fremdherrschaft sichtbar.
    // Bei genau einer Macht, die das ganze Gebiet hält, sagt die Kachel nichts,
    // was nicht schon im Kopf der Tafel steht.
    const besetzer = entry.occupiers ?? [];
    for (const b of besetzer) {
      const anteil = entry.area > 0 ? Math.round((b.area / entry.area) * 100) : 0;
      if (besetzer.length === 1 && anteil >= 100) continue;
      add(`Besetzt durch ${this.data.germanName(b.name)}`,
        `<span class="num">${esc(areaText(b.area))}</span>${anteil ? ` · ${anteil} %` : ''}`,
        { raw: true });
    }
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
