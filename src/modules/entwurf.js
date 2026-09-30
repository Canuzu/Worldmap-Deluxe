/**
 * Gestaltungsentwürfe zum Vergleichen.
 *
 * Vier Richtungen für die Oberfläche stehen nebeneinander, damit man sie am
 * laufenden Atlas vergleichen kann statt an Beschreibungen. Der heutige Stand
 * bleibt die Voreinstellung und ist ohne Zutun das Einzige, was ein Besucher
 * sieht: Der Umschalter erscheint nur, wenn die Adresse `?entwurf=` trägt.
 *
 * Technisch ist ein Entwurf ein Merkmal an der Wurzel – `data-entwurf` –, an
 * dem je Entwurf ein eigenes Stilblatt hängt. Farbwelt (Nacht, Pergament) und
 * Entwurf sind zwei Achsen: Jeder Entwurf muss in beiden bestehen.
 *
 * Wird einer übernommen, wandert sein Stilblatt in die Grundlage und dieses
 * Modul fällt weg. Deshalb hängt nichts Wesentliches davon ab.
 */
import { txt } from './sprache.js';

export const ENTWUERFE = [
  { id: 'heute', buchstabe: '', kurz: 'Heute', satz: 'Der aktuelle Stand, zum Vergleich.' },
  { id: 'klar', buchstabe: 'D', kurz: 'Klar', satz: 'Die Glasoberfläche, aber vereinheitlicht; Pergament, das seinen Namen verdient.' },
  { id: 'instrument', buchstabe: 'B', kurz: 'Instrument', satz: 'Flach, deckend, dicht. Die Karte behält den Stich, die Bedienung wird Werkzeug.' },
  { id: 'stich', buchstabe: 'A', kurz: 'Stich', satz: 'Die Bedienung spricht die Sprache der Karte: Platte, Doppelrahmen, Antiqua.' },
  { id: 'blatt', buchstabe: 'C', kurz: 'Blatt', satz: 'Die Karte als Blatt mit Rand. Bedienung liegt im Rand, nie auf der Karte.' },
];

const GUELTIG = new Set(ENTWUERFE.map((e) => e.id));

/** Der gerade gesetzte Entwurf; `heute`, wenn keiner gesetzt ist. */
export function entwurf() {
  return document.documentElement.dataset.entwurf || 'heute';
}

function setze(id) {
  if (id === 'heute') delete document.documentElement.dataset.entwurf;
  else document.documentElement.dataset.entwurf = id;
}

/**
 * Aus der Adresse lesen und setzen – vor allem anderen.
 *
 * Gelesen wird die Abfrage, nicht der Hash: Der Hash gehört dem Atlas – Lage,
 * Jahr, gewähltes Land – und wird laufend neu geschrieben. Die Abfrage bleibt
 * dabei stehen, weil `history.replaceState` mit bloßem `#…` Pfad und Abfrage
 * unverändert lässt.
 *
 * Früh, weil die Karte beim Anlegen Farben und Schriften aus dem Stilblatt
 * liest. Stünde der Entwurf erst danach fest, begänne sie im falschen.
 *
 * @returns {boolean} ob überhaupt ein Entwurf verlangt wurde
 */
export function entwurfEinrichten() {
  const abfrage = new URLSearchParams(location.search);
  if (!abfrage.has('entwurf')) return false;
  const gewuenscht = abfrage.get('entwurf');
  setze(GUELTIG.has(gewuenscht) ? gewuenscht : 'heute');
  return true;
}

/**
 * Den Umschalter bauen – erst, wenn die Karte steht.
 *
 * @param {(id: string) => void} onWechsel nach jedem Umschalten: Die Karte
 *   muss ihre Farben neu lesen und – für das Blatt – ihre Größe neu messen.
 */
export function entwurfUmschalter(onWechsel) {
  if (!new URLSearchParams(location.search).has('entwurf')) return;
  baueUmschalter(onWechsel);
}

function baueUmschalter(onWechsel) {
  const leiste = document.createElement('div');
  leiste.className = 'entwurfwahl';
  leiste.id = 'entwurfWahl';
  leiste.setAttribute('role', 'radiogroup');
  leiste.setAttribute('aria-label', txt('entwurf.aria'));
  /* Zwei Formen in einem: breit eine Leiste mit allen fünf, schmal ein
     Blätterknopf – ‹ aktueller Entwurf ›. Beides steht im DOM, das Stilblatt
     entscheidet. Zwischen Kopf und Werkzeugsäule ist auf einem Telefon Platz
     für einen Knopf, nicht für fünf. */
  leiste.innerHTML = `<span class="entwurfwahl__t">${txt('entwurf.titel')}</span>
    <button type="button" class="entwurfwahl__schritt" data-schritt="-1" aria-label="‹">‹</button>
    ${ENTWUERFE.map((e) => `
    <button type="button" role="radio" data-entwurf-wahl="${e.id}" title="${e.satz}"
            aria-checked="${e.id === entwurf()}">${e.buchstabe
              ? `<span class="entwurfwahl__b">${e.buchstabe} · </span>` : ''}${e.kurz}</button>`).join('')}
    <button type="button" class="entwurfwahl__schritt" data-schritt="1" aria-label="›">›</button>`;
  document.body.appendChild(leiste);

  const waehle = (id) => {
    setze(id);
    for (const k of leiste.querySelectorAll('[data-entwurf-wahl]')) {
      k.setAttribute('aria-checked', String(k.dataset.entwurfWahl === id));
    }
    // Die Adresse mitführen, damit ein Neuladen oder ein geteilter Link beim
    // selben Entwurf landet.
    const url = new URL(location.href);
    url.searchParams.set('entwurf', id);
    history.replaceState(null, '', url);
    onWechsel(id);
  };

  leiste.addEventListener('click', (ev) => {
    const schritt = ev.target.closest('[data-schritt]');
    if (schritt) {
      const i = ENTWUERFE.findIndex((e) => e.id === entwurf());
      const n = ENTWUERFE.length;
      waehle(ENTWUERFE[(i + Number(schritt.dataset.schritt) + n) % n].id);
      return;
    }
    const knopf = ev.target.closest('[data-entwurf-wahl]');
    if (knopf) waehle(knopf.dataset.entwurfWahl);
  });
}
