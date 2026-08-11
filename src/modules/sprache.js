/**
 * Sprachwahl.
 *
 * Der Atlas war von Anfang an deutsch: `lang="de"` fest im Dokument, jeder
 * Text im Code, die Wissensdateien mit `.de.` im Namen. Das Sprachkürzel im
 * Dateinamen war die einzige Vorbereitung – gegangen wurde der Weg nie.
 *
 * Hier steht jetzt der ganze Weg. Drei Dinge macht dieses Modul:
 *
 *   1. Es entscheidet, welche Sprache gilt. Reihenfolge: was in der Adresse
 *      steht, dann was zuletzt gewählt wurde, dann was der Browser meldet,
 *      sonst Deutsch. Die Adresse steht vorn, damit ein geteilter Verweis in
 *      der Sprache aufgeht, in der er geteilt wurde.
 *   2. Es liefert Texte über `txt(schlüssel)`. Fehlt eine englische Fassung,
 *      kommt die deutsche – sichtbar unvollständig ist besser als leer.
 *   3. Es merkt sich die Wahl und setzt `lang` am Dokument. Letzteres ist
 *      keine Kosmetik: Davon hängen Silbentrennung, Vorlesesoftware und die
 *      Anführungszeichen ab, die der Browser bei `q` setzt.
 *
 * Gewechselt wird mit einem Neuladen. Das klingt grob, ist hier aber das
 * Richtige: Der gesamte Zustand – Ausschnitt, Jahr, Kartenmodus, ausgewähltes
 * Gemeinwesen – steht in der Adresse. Ein Neuladen verliert also nichts, und
 * die Alternative hieße, jede Zeichenfläche, jede Tafel und jede Beschriftung
 * zur Laufzeit neu aufzubauen – viel Aufwand für einen Vorgang, den man
 * einmal pro Besuch auslöst.
 */
import { DE } from '../i18n/de.js';
import { EN } from '../i18n/en.js';

const WOERTER = { de: DE, en: EN };

/** Sprachen, die es gibt. Reihenfolge = Reihenfolge im Umschalter. */
export const SPRACHEN = [
  { code: 'de', name: 'Deutsch', kurz: 'DE' },
  { code: 'en', name: 'English', kurz: 'EN' },
];

const SPEICHER = 'wmd:lang';

function ausAdresse() {
  // Beides lesen: `?lang=en` ist die Form, die Suchmaschinen und geteilte
  // Verweise erwarten; `#…&lang=en` die, in der dieser Atlas seinen übrigen
  // Zustand hält. Wer einen Verweis aus der Adresszeile kopiert, soll die
  // Sprache mitnehmen, egal in welcher Form sie dort steht.
  const ausSuche = new URLSearchParams(location.search).get('lang');
  const ausHash = new URLSearchParams(location.hash.replace(/^#/, '')).get('lang');
  return [ausSuche, ausHash].find((s) => s && WOERTER[s]) ?? null;
}

function ausBrowser() {
  for (const eintrag of navigator.languages ?? [navigator.language ?? '']) {
    const code = String(eintrag).slice(0, 2).toLowerCase();
    if (WOERTER[code]) return code;
  }
  return null;
}

let aktuell = 'de';

/** Einmal beim Start. Legt die Sprache fest und schreibt sie ans Dokument. */
export function spracheEinrichten() {
  let gespeichert = null;
  try { gespeichert = localStorage.getItem(SPEICHER); } catch { /* ohne Speicher eben ohne */ }
  aktuell = ausAdresse() ?? (WOERTER[gespeichert] ? gespeichert : null) ?? ausBrowser() ?? 'de';
  document.documentElement.lang = aktuell;
  return aktuell;
}

export function sprache() { return aktuell; }

/**
 * Sprachausgabe der Wikipedia.
 *
 * Getrennt vom Sprachcode, obwohl es hier dasselbe ergibt: Die Wikipedia hat
 * eigene Sprachkürzel, und nicht zu jeder Oberflächensprache gibt es eine
 * brauchbare Ausgabe. Wer eine dritte Sprache ergänzt, entscheidet hier, ob
 * sie eine eigene Wikipedia bekommt oder auf die englische zeigt.
 */
export function wikiSprache() {
  return aktuell === 'de' ? 'de' : 'en';
}

/** Für Zahlen, Daten und Sortierung – nicht dasselbe wie der Sprachcode. */
export function gebietsschema() { return aktuell === 'en' ? 'en-GB' : 'de-DE'; }

/**
 * Ein Text. Platzhalter stehen als `{name}` im Wörterbuch.
 *
 * Heißt `txt` und nicht `t`: In diesem Programm ist `t` seit jeher die
 * Interpolationsvariable – die Stellung des Reglers, der Fortschritt einer
 * Schlacht, der Mischanteil einer Farbe. Ein importiertes `t` wird von jedem
 * dieser Locals verdeckt, und zwar lautlos, bis zur Laufzeit.
 *
 * Fehlt ein Schlüssel ganz, kommt er selbst zurück. Das ist Absicht: Ein
 * sichtbarer Schlüssel im Bild führt beim Prüfen sofort zur Fundstelle,
 * während ein leeres Feld unbemerkt bleibt. `npm run check:sprache` sucht
 * ohnehin nach beidem.
 */
export function txt(schluessel, werte) {
  const text = WOERTER[aktuell]?.[schluessel] ?? DE[schluessel] ?? schluessel;
  if (!werte) return text;
  return text.replace(/\{(\w+)\}/g, (ganz, name) => (name in werte ? String(werte[name]) : ganz));
}

/** Gibt es zu diesem Schlüssel überhaupt etwas in der laufenden Sprache? */
export function hatText(schluessel) {
  return Object.hasOwn(WOERTER[aktuell] ?? {}, schluessel);
}

/**
 * Sprache wechseln: merken, in die Adresse schreiben, neu laden.
 *
 * Die Adresse bekommt `?lang=` und nicht nur den Speicher, damit die Seite
 * unter einem teilbaren Verweis in dieser Sprache liegt.
 */
export function spracheWechseln(code) {
  if (!WOERTER[code] || code === aktuell) return;
  try { localStorage.setItem(SPEICHER, code); } catch { /* dann eben nur diesmal */ }
  const url = new URL(location.href);
  url.searchParams.set('lang', code);
  location.replace(url.toString());
}

/**
 * Beschriftet das feste Markup aus index.html.
 *
 * Statt jede Zeile im HTML durch einen Aufruf zu ersetzen, tragen die
 * Elemente Schlüssel: `data-i18n` für den Inhalt, `data-i18n-attr` für
 * Eigenschaften in der Form `aria-label:schlüssel; data-label:schlüssel`.
 * So bleibt das HTML lesbar und zeigt weiter, was dort steht.
 */
export function markupBeschriften(wurzel = document) {
  for (const el of wurzel.querySelectorAll('[data-i18n]')) {
    el.textContent = txt(el.dataset.i18n);
  }
  for (const el of wurzel.querySelectorAll('[data-i18n-attr]')) {
    for (const paar of el.dataset.i18nAttr.split(';')) {
      const [attr, schluessel] = paar.split(':').map((s) => s.trim());
      if (attr && schluessel) el.setAttribute(attr, txt(schluessel));
    }
  }
}
