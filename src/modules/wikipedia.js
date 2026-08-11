/**
 * Optionale Anreicherung aus der Wikipedia – in der Sprache der Oberfläche.
 *
 * Die kuratierte Wissensbasis deckt die großen Reiche ab; für die vielen
 * kleineren Gemeinwesen liefert die Wikipedia einen Kurzabriss und oft auch
 * ein Bild. Der Abruf ist abschaltbar und scheitert lautlos – der Atlas
 * bleibt ohne Netzverbindung voll benutzbar.
 *
 * Der Host stand fest auf de.wikipedia.org. Das ist die eine Stelle, an der
 * eine zweite Sprache ohne eigene Übersetzungsarbeit sofort gewinnt: Zu jedem
 * Gemeinwesen, für das es keinen redaktionellen Text gibt, liefert die
 * englische Wikipedia denselben Dienst wie die deutsche für deutsche Leser.
 */
import { wikiSprache } from './sprache.js';

const api = () => `https://${wikiSprache()}.wikipedia.org`;
const TIMEOUT_MS = 6000;
const cache = new Map();

/**
 * Ohne Netzverbindung bleibt ein fetch minutenlang hängen; die Tafel würde
 * dann dauerhaft ihren Ladeplatzhalter zeigen. Deshalb ein harter Zeitschnitt.
 */
async function fetchJSON(url, signal) {
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  const res = await fetch(url, { signal: combined, headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

/** Passenden Artikeltitel suchen, wenn die Wissensbasis keinen vorgibt. */
async function findTitle(query, signal) {
  const url = `${api()}/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}` +
    '&srlimit=1&srnamespace=0&format=json&origin=*';
  const data = await fetchJSON(url, signal);
  return data?.query?.search?.[0]?.title ?? null;
}

async function fetchSummary(title, signal) {
  const url = `${api()}/api/rest_v1/page/summary/${encodeURIComponent(title)}?redirect=true`;
  const data = await fetchJSON(url, signal);
  if (!data || data.type === 'https://mediawiki.org/wiki/HyperSwitch/errors/not_found') return null;
  return {
    title: data.titles?.normalized ?? data.title,
    extract: data.extract ?? '',
    thumbnail: data.thumbnail?.source ?? null,
    url: data.content_urls?.desktop?.page ?? `${api()}/wiki/${encodeURIComponent(title)}`,
  };
}

/**
 * @param {{title?: string|null, query: string}} spec
 * @param {AbortSignal} [signal]
 * @returns {Promise<{title:string, extract:string, thumbnail:string|null, url:string}|null>}
 */
export async function lookupArticle({ title, query }, signal) {
  const cacheKey = title ? `t:${title}` : `q:${query}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const task = (async () => {
    try {
      if (title) {
        const direct = await fetchSummary(title, signal);
        if (direct?.extract) return direct;
      }
      const found = await findTitle(query, signal);
      if (!found) return null;
      return await fetchSummary(found, signal);
    } catch {
      return null;
    }
  })();

  cache.set(cacheKey, task);
  const result = await task;
  // Nur Treffer dauerhaft merken – ein Netzaussetzer soll den Eintrag nicht
  // für die ganze Sitzung sperren.
  if (result) cache.set(cacheKey, result);
  else cache.delete(cacheKey);
  return result;
}
