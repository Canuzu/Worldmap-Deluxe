/**
 * Das Bodenblatt: eine Tafel, die am Telefon von unten einfährt.
 *
 * Warum überhaupt eine eigene Form? Weil eine Tafel, die den ganzen Bildschirm
 * nimmt, den Bezug zerstört. Wer einen Steckbrief liest und dabei nicht mehr
 * sieht, wo das Land liegt, liest über eine Karte hinweg statt in ihr. Das
 * Bodenblatt steht deshalb auf halber Höhe: Der Inhalt ist da, die Karte
 * darüber bleibt sichtbar und antippbar.
 *
 * Gezogen wird am oberen Rand. Zwei Stellungen, dazwischen folgt das Blatt dem
 * Finger und rastet beim Loslassen in die nähere ein; wer unter die kleinste
 * zieht, schließt es. Die Höhe steht in `--blatt-h` am Element selbst – ohne
 * Javascript bleibt der Ausgangswert des Stilbogens stehen und das Blatt ist
 * trotzdem benutzbar.
 *
 * Zwei Tafeln nutzen das: der Steckbrief eines Landes und das Schlachtenblatt.
 * Beide hatten dasselbe Problem und hätten sonst zwei Fassungen derselben
 * dreißig Zeilen bekommen.
 */

/** Nur hochkant am Telefon. Quer steht die Tafel als Spalte rechts – dort gibt
 *  es nichts zu ziehen, und ein Griff, der nichts tut, ist schlimmer als
 *  keiner. Die Bedingung ist wörtlich dieselbe wie im Stilbogen. */
const HOCHKANT = '(max-width: 560px) and (orientation: portrait)';

export function istBodenblatt() {
  return matchMedia(HOCHKANT).matches;
}

/**
 * @param {HTMLElement} wurzel   die Tafel
 * @param {object}      wahl
 * @param {number[]}    wahl.stellungen  Höhen als Anteil der Bildhöhe, aufsteigend
 * @param {number}      wahl.griff       Höhe der Grifffläche am oberen Rand in Punkten
 * @param {Function}    wahl.schliessen  wird gerufen, wer unter die kleinste zieht
 * @returns {{zuruecksetzen: Function}}  setzt das Blatt auf die kleinste Stellung
 */
export function bodenblatt(wurzel, { stellungen = [.52, .92], griff = 74, schliessen }) {
  let start = null;
  let anteil = stellungen[0];

  const hoeheSetzen = (a) => {
    anteil = a;
    wurzel.style.setProperty('--blatt-h', `${Math.round(a * 100)}vh`);
  };

  const amGriff = (e) => {
    // Der obere Rand samt Kopfzeile ist der Griff. Weiter unten soll der
    // Finger den Text rollen und nicht das Blatt verschieben.
    const r = wurzel.getBoundingClientRect();
    return e.clientY - r.top < griff;
  };

  wurzel.addEventListener('pointerdown', (e) => {
    if (!istBodenblatt()) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (!amGriff(e)) return;
    // Knöpfe im Kopf – Schließen, Zurück – bleiben Knöpfe. Ohne das fing der
    // Griff den Tipp ab, und das Blatt ließ sich nicht mehr schließen.
    if (e.target.closest('button, a, input, [role="button"]')) return;
    start = { y: e.clientY, anteil };
    wurzel.classList.add('is-ziehend');
    wurzel.setPointerCapture(e.pointerId);
  });

  wurzel.addEventListener('pointermove', (e) => {
    if (!start) return;
    hoeheSetzen(Math.max(.12, Math.min(
      stellungen.at(-1), start.anteil + (start.y - e.clientY) / window.innerHeight,
    )));
  });

  const loslassen = () => {
    if (!start) return;
    start = null;
    wurzel.classList.remove('is-ziehend');
    // Unter der Hälfte der kleinsten Stellung: weg damit.
    if (anteil < stellungen[0] * .62) { schliessen?.(); return; }
    hoeheSetzen(stellungen.reduce((a, b) => (Math.abs(b - anteil) < Math.abs(a - anteil) ? b : a)));
  };
  wurzel.addEventListener('pointerup', loslassen);
  wurzel.addEventListener('pointercancel', loslassen);

  return { zuruecksetzen: () => hoeheSetzen(stellungen[0]) };
}
