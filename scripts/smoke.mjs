#!/usr/bin/env node
/**
 * Kurzer Funktionsdurchlauf gegen einen laufenden Server.
 * Aufruf: node scripts/smoke.mjs [http://127.0.0.1:5173]
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://127.0.0.1:5173';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
/* Die Sprache festnageln.
 *
 * Der Atlas richtet sich seit der englischen Fassung nach dem Browser, und ein
 * Prüfbrowser meldet standardmäßig en-US. Ohne diese Zeile lief die ganze
 * Reihe plötzlich auf Englisch und sieben Prüfungen fielen um, weil sie
 * deutsche Texte erwarten – ein Befund über die Prüfumgebung, nicht über den
 * Atlas. Geprüft wird deshalb ausdrücklich die deutsche Fassung; die
 * englische bekommt weiter unten ihre eigene Prüfung. */
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'de-DE' });

const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(`PAGEERROR ${e.message}`));

const checks = [];
const check = async (name, fn) => {
  try {
    await fn();
    checks.push(`  ✓ ${name}`);
  } catch (err) {
    checks.push(`  ✗ ${name} – ${err.message}`);
  }
};
/**
 * Auf das Ende des Anflugs warten.
 *
 * Nur auf `imAnflug === false` zu warten ist ein Wettlauf: Beim Klick ist der
 * Anflug noch gar nicht gestartet – `startBattle` holt vorher den Zeitschnitt –,
 * und die Bedingung trifft sofort zu. Deshalb erst auf den Beginn warten.
 */
const gelandet = async () => {
  await page.waitForFunction(() => window.__battles?.imAnflug === true, null, { timeout: 20000 });
  await page.waitForFunction(() => window.__battles?.imAnflug === false, null, { timeout: 20000 });
  await page.waitForTimeout(700);
};

const visible = async (sel) => {
  if (!(await page.locator(sel).isVisible())) throw new Error(`${sel} nicht sichtbar`);
};

await page.goto(`${BASE}/#position=3/40/20&year=1815`, { waitUntil: 'networkidle' });
await page.waitForSelector('#app:not([hidden])', { timeout: 20000 });
await page.waitForTimeout(1500);

await check('Ladeschirm verschwindet', async () => {
  await page.waitForFunction(() => document.getElementById('boot').hidden, null, { timeout: 8000 });
});

await check('Startjahr aus dem Hash übernommen', async () => {
  const year = await page.textContent('#yearBig');
  if (!year.includes('1815')) throw new Error(`gelesen: ${year}`);
});

await check('Karte zeichnet Gemeinwesen', async () => {
  const n = await page.evaluate(() => document.querySelectorAll('.leaflet-pane canvas').length);
  if (n < 3) throw new Error(`nur ${n} Zeichenflächen`);
});

await check('Suche klappt auf und findet ein Gemeinwesen', async () => {
  // Die Suche liegt zugeklappt als Knopf in der Leiste.
  if (await page.locator('#search').isVisible()) throw new Error('Suchfeld steht offen');
  await page.click('#btnSearch');
  await page.waitForSelector('#searchWrap.is-open', { timeout: 3000 });
  await page.fill('#search', 'Preuß');
  await page.waitForSelector('#suggest li[data-name]', { timeout: 4000 });
  await page.keyboard.press('Enter');
  await page.waitForSelector('#panel:not([hidden])', { timeout: 4000 });
  await visible('.pnl__title');
  // Nach dem Treffer klappt sie wieder zu und gibt die Karte frei.
  await page.waitForTimeout(500);
  if (await page.locator('#search').isVisible()) throw new Error('Suchfeld bleibt offen');
});

await check('Klick auf die Karte wählt ein Gemeinwesen', async () => {
  await page.keyboard.press('Escape');
  // Punkt aus Koordinaten rechnen statt aus Pixeln raten – der Ausschnitt
  // haengt an der Fenstergroesse. Warschau 1815: Kongresspolen.
  const pt = await page.evaluate(() => {
    const c = window.__atlasMap.latLngToContainerPoint([52.23, 21.01]);
    return { x: Math.round(c.x), y: Math.round(c.y) };
  });
  await page.mouse.click(pt.x, pt.y);
  await page.waitForSelector('#panel:not([hidden])', { timeout: 4000 });
  const title = await page.textContent('.pnl__title');
  if (!title.trim()) throw new Error('kein Titel');
});

await check('Detailtafel zeigt Steckbrief-Kacheln', async () => {
  const n = await page.locator('.fact').count();
  if (n < 2) throw new Error(`nur ${n} Kacheln`);
});

await check('Nachbar-Chips vorhanden und anklickbar', async () => {
  const chip = page.locator('[data-goto]').first();
  if (!(await chip.count())) throw new Error('keine Chips');
  const before = await page.textContent('.pnl__title');
  await chip.click();
  await page.waitForTimeout(700);
  const after = await page.textContent('.pnl__title');
  if (before === after) throw new Error('Auswahl hat sich nicht geändert');
});

await check('Zeitschnitt vor und zurück', async () => {
  await page.keyboard.press('Escape');
  await page.click('#btnNext');
  await page.waitForTimeout(900);
  const y1 = await page.textContent('#yearBig');
  await page.click('#btnPrev');
  await page.waitForTimeout(900);
  const y2 = await page.textContent('#yearBig');
  if (y1 === y2) throw new Error('Jahr unverändert');
  if (!y2.includes('1815')) throw new Error(`zurück bei ${y2}`);
});

await check('Zeitregler springt an eine andere Stelle', async () => {
  const box = await page.locator('#track').boundingBox();
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height / 2);
  await page.waitForTimeout(1200);
  const year = await page.textContent('#yearBig');
  if (year.includes('1815')) throw new Error('Jahr unverändert');
});

await check('Zeitreise startet und hält an', async () => {
  // Im Ruhezustand darf nur das Abspielsymbol stehen.
  if (await page.locator('#btnPlay .i-pause').isVisible()) throw new Error('Pausensymbol im Ruhezustand sichtbar');
  await page.click('#btnPlay');
  await page.waitForTimeout(300);
  if (!(await page.locator('#btnPlay .i-pause').isVisible())) throw new Error('Pausensymbol fehlt');
  if (await page.locator('#btnPlay .i-play').isVisible()) throw new Error('Abspielsymbol während der Fahrt sichtbar');
  await page.click('#btnPlay');
  await page.waitForTimeout(200);
  if (!(await page.locator('#btnPlay .i-play').isVisible())) throw new Error('Abspielsymbol kehrt nicht zurück');
});

await check('Farbwelt wechselt', async () => {
  await page.keyboard.press('t');
  await page.waitForTimeout(500);
  const theme = await page.getAttribute('html', 'data-theme');
  if (theme !== 'parchment') throw new Error(`Theme: ${theme}`);
  await page.keyboard.press('t');
});

await check('Ebenen-Menü öffnet', async () => {
  await page.click('#btnLayers');
  await visible('#layersMenu');
  await page.keyboard.press('Escape');
});

await check('Kartenmodus-Leiste schaltet die Sicht um', async () => {
  // Die Einfärbungen lagen früher im Ebenen-Menü. Jetzt stehen sie offen auf
  // der Karte – der Test klickt sie dort, ohne vorher etwas aufzuklappen.
  await visible('.mapmodes');
  await page.click('[data-mode="sovereign"]');
  await page.waitForTimeout(500);
  if (await page.getAttribute('[data-mode="sovereign"]', 'aria-checked') !== 'true') {
    throw new Error('Modus nicht aktiv');
  }
  await page.click('[data-mode="polity"]');
  await page.waitForTimeout(300);
});

await check('Jeder Moduswechsel lässt die Flächen stehen', async () => {
  /* Gemeldet war: „wenn man von Religion zu Politisch wechselt verschwindet
     auch alles". Ursache war eine Fassung des Religionsmodus, die die Füllung
     der Staatsflächen abschaltete und durch eine eigene Ebene ersetzte – beim
     Zurückschalten kam sie nicht wieder. Diese Prüfung geht alle fünf Modi
     durch und misst nach jedem, ob auf einem Landpunkt noch Farbe steht. */
  await page.evaluate(() => { location.hash = 'position=3/40/20&year=1600'; });
  await page.waitForTimeout(1600);
  const farbeAn = () => page.evaluate(() => {
    const pt = window.__atlasMap.latLngToContainerPoint([48.1, 11.6]); // München
    let deckung = 0;
    for (const el of document.querySelectorAll('.leaflet-pane canvas')) {
      const r = el.getBoundingClientRect();
      const ctx = el.getContext('2d');
      if (!ctx || !r.width) continue;
      const d = el.width / r.width;
      try {
        const px = ctx.getImageData(Math.round((pt.x - r.left) * d),
          Math.round((pt.y - r.top) * d), 1, 1).data;
        deckung = Math.max(deckung, px[3]);
      } catch { /* fremde Ebene, nicht auslesbar */ }
    }
    return deckung;
  });
  for (const modus of ['religion', 'polity', 'sovereign', 'religion', 'culture', 'polity']) {
    await page.click(`[data-mode="${modus}"]`);
    await page.waitForTimeout(1100);
    const gesetzt = await page.evaluate(() => window.__atlas.colorMode);
    if (gesetzt !== modus) throw new Error(`Modus ${modus} nicht gesetzt (${gesetzt})`);
    const deckung = await farbeAn();
    if (deckung < 40) throw new Error(`nach „${modus}" steht keine Fläche mehr (Deckung ${deckung})`);
  }
});

await check('Religionsmodus färbt nach Glauben und streift die Herrschaft', async () => {
  await page.evaluate(() => { location.hash = 'position=3/30/40&year=1600'; });
  await page.waitForTimeout(1600);
  await page.click('[data-mode="religion"]');
  await page.waitForTimeout(1600);
  const stand = await page.evaluate(() => {
    const a = window.__atlas;
    const slot = a.slots[a.activeSlot];
    const merkmale = a.epoch.geojson.features.map((f) => f.properties);
    return {
      modus: a.colorMode,
      mitAngabe: merkmale.filter((p) => p.rv).length,
      gesamt: merkmale.length,
      geteilt: merkmale.filter((p) => p.rv && p.rs && p.rs !== 'lokal' && p.rv !== p.rs).length,
      schraffuren: slot.religion ? Object.keys(slot.religion._layers).length : 0,
      // Gleiche Religion, gleiche Farbe – anders als bei den Gemeinwesen, wo
      // Nachbarn sich absichtlich unterscheiden.
      farbeKath: a.colorOf('rkath'),
      farbeSunn: a.colorOf('rsunn'),
    };
  });
  if (stand.modus !== 'religion') throw new Error('Modus nicht gesetzt');
  if (stand.mitAngabe < stand.gesamt * .95) {
    throw new Error(`nur ${stand.mitAngabe} von ${stand.gesamt} Flächen mit Religionsangabe`);
  }
  if (!stand.geteilt) throw new Error('keine Fläche mit abweichender Herrschaft');
  if (stand.schraffuren !== stand.geteilt) {
    throw new Error(`${stand.schraffuren} Schraffuren für ${stand.geteilt} geteilte Flächen`);
  }
  if (!stand.farbeKath || stand.farbeKath === stand.farbeSunn) {
    throw new Error('Religionsfarben fehlen oder sind gleich');
  }

  // Die Legende zählt auf, was auf der Karte liegt.
  await page.click('#btnLegend');
  await page.waitForTimeout(500);
  const titel = await page.textContent('#legendTitle');
  if (!/Religionen/.test(titel)) throw new Error(`Legende zeigt „${titel}"`);
  await page.keyboard.press('Escape');

  // Und die Tafel wird nach Religion gefragt, nicht nach der Hauptstadt.
  // Über die Adresszeile, weil das der Weg ist, den die Seite selbst geht –
  // `atlas.select` färbt nur die Karte ein und öffnet keine Tafel.
  await page.evaluate(() => {
    location.hash = 'position=4/25/78&year=1600&ort=Mughal%20Empire';
  });
  await page.waitForSelector('#panel:not([hidden])', { timeout: 6000 });
  await page.waitForTimeout(900);
  const tafel = await page.textContent('#panel');
  // Je nachdem, ob Hof und Land dasselbe glauben, steht dort eine Kachel oder
  // drei – beides ist richtig, nur fehlen darf es nicht.
  if (!/Bevölkerung glaubt|Herrschaft bekennt|% der Fläche/.test(tafel)) {
    throw new Error('Tafel zeigt im Religionsmodus keine Religionsangaben');
  }
  await page.keyboard.press('Escape');
  await page.click('[data-mode="polity"]');
  await page.waitForTimeout(400);
});

await check('Legende zeigt Einträge', async () => {
  await page.click('#btnLegend');
  await visible('#legendBox');
  const n = await page.locator('#legendList li').count();
  if (n < 5) throw new Error(`nur ${n} Einträge`);
  await page.keyboard.press('Escape');
});

await check('Über-Fenster öffnet und schließt', async () => {
  await page.click('#btnAbout');
  await visible('#modal .modal__card');
  await page.keyboard.press('Escape');
  if (await page.locator('#modal').isVisible()) throw new Error('Fenster bleibt offen');
});

await check('Adresszeile spiegelt den Zustand', async () => {
  await page.waitForTimeout(600);
  const hash = page.url().split('#')[1] ?? '';
  if (!hash.includes('position=') || !hash.includes('year=')) throw new Error(hash || '(leer)');
});

await check('Gradnetz und Gewässer lassen sich zuschalten', async () => {
  await page.click('#btnLayers');
  // Die Kästchen selbst sind visuell ersetzt – geklickt wird das Label.
  await page.locator('label.switch', { has: page.locator('#optGraticule') }).click();
  await page.locator('label.switch', { has: page.locator('#optRivers') }).click();
  await page.waitForTimeout(600);
  if (!(await page.isChecked('#optGraticule'))) throw new Error('Gradnetz nicht aktiv');
  if (!(await page.isChecked('#optRivers'))) throw new Error('Gewässer nicht aktiv');
  await page.keyboard.press('Escape');
});

await check('Adresszeile steuert die Karte (hashchange)', async () => {
  await page.evaluate(() => { location.hash = 'position=2/20/20&year=-8000'; });
  await page.waitForTimeout(2500);
  const year = await page.textContent('#yearBig');
  if (!year.includes('8000')) throw new Error(`gelesen: ${year}`);
});

await check('Steinzeit-Zeitschnitt lädt vollständig', async () => {
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.getElementById('boot').hidden, null, { timeout: 15000 });
  await page.waitForTimeout(1200);
  const year = await page.textContent('#yearBig');
  if (!year.includes('8000')) throw new Error(`gelesen: ${year}`);
  const count = await page.textContent('#epochStats');
  if (!/\d/.test(count)) throw new Error('keine Kennzahlen');
});

await check('Zeitleiste lässt sich jahresgenau wählen', async () => {
  await page.evaluate(() => { location.hash = 'position=3/40/30&year=723'; });
  await page.waitForTimeout(2200);
  const year = await page.textContent('#yearBig');
  if (!year.includes('723')) throw new Error(`Jahr: ${year}`);
  const note = await page.textContent('#yearTitle');
  if (!note.includes('700')) throw new Error(`Kartenstand fehlt: ${note}`);
  // Pfeiltaste bewegt um genau ein Jahr
  await page.locator('#track').focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(400);
  const next = await page.textContent('#yearBig');
  if (!next.includes('724')) throw new Error(`nach Pfeiltaste: ${next}`);
});

await check('Umayyaden reichen 700 bis Persien', async () => {
  await page.evaluate(() => { location.hash = 'position=3/33/55&year=700'; });
  await page.waitForTimeout(2200);
  const found = await page.evaluate(() => {
    const map = window.__atlasMap;
    // Isfahan – 700 n. Chr. umayyadisch
    const pt = map.latLngToContainerPoint([32.65, 51.67]);
    return { x: Math.round(pt.x), y: Math.round(pt.y) };
  });
  await page.mouse.click(found.x, found.y);
  await page.waitForSelector('#panel:not([hidden])', { timeout: 4000 });
  const title = await page.textContent('.pnl__title');
  if (!/Umayyaden/.test(title)) throw new Error(`Isfahan gehört zu: ${title}`);
  await page.keyboard.press('Escape');
});

await check('Kriegsjahre sind vorhanden und nennen ihren Stichtag', async () => {
  await page.evaluate(() => { location.hash = 'position=3/50/20&year=1942'; });
  await page.waitForTimeout(2400);
  const year = await page.textContent('#yearBig');
  if (!year.includes('1942')) throw new Error(`Jahr: ${year}`);
  const note = await page.textContent('#yearTitle');
  if (!/November 1942/.test(note)) throw new Error(`Stichtag fehlt: ${note}`);
});

await check('Besetztes Gebiet wird als solches ausgewiesen', async () => {
  // Minsk – November 1942 deutsch besetzt, aber weiterhin sowjetisch.
  const pt = await page.evaluate(() => {
    const c = window.__atlasMap.latLngToContainerPoint([53.90, 27.57]);
    return { x: Math.round(c.x), y: Math.round(c.y) };
  });
  await page.mouse.click(pt.x, pt.y);
  await page.waitForSelector('#panel:not([hidden])', { timeout: 4000 });
  const title = await page.textContent('.pnl__title');
  if (!/Sowjetunion/.test(title)) throw new Error(`Minsk gehört zu: ${title}`);
  const chips = await page.$$eval('.chips .chip', (els) => els.map((e) => e.textContent.trim()));
  if (!chips.some((c) => /Besetzt durch Deutschland/.test(c))) {
    throw new Error(`keine Besatzung ausgewiesen: ${chips.join(' | ')}`);
  }
  await page.keyboard.press('Escape');
});

await check('Moskau und Leningrad bleiben unbesetzt', async () => {
  const frei = await page.evaluate(() => {
    const treffer = (lat, lng) => {
      const feats = window.__atlas.epoch.geojson.features;
      const drin = (pt, ring) => {
        let inside = false;
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
          const [xi, yi] = ring[i]; const [xj, yj] = ring[j];
          if ((yi > pt[1]) !== (yj > pt[1])
            && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) inside = !inside;
        }
        return inside;
      };
      for (const f of feats) {
        const polys = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
        for (const poly of polys) {
          if (drin([lng, lat], poly[0]) && !poly.slice(1).some((h) => drin([lng, lat], h))) {
            return f.properties.o ?? null;
          }
        }
      }
      return 'nicht gefunden';
    };
    return { moskau: treffer(55.75, 37.62), leningrad: treffer(59.93, 30.32), minsk: treffer(53.90, 27.57) };
  });
  if (frei.moskau) throw new Error(`Moskau: ${frei.moskau}`);
  if (frei.leningrad) throw new Error(`Leningrad: ${frei.leningrad}`);
  if (frei.minsk !== 'Germany') throw new Error(`Minsk: ${frei.minsk}`);
});

await check('Schraffur lässt sich abschalten', async () => {
  await page.click('#btnLayers');
  await page.locator('label.switch', { has: page.locator('#optOccupation') }).click();
  await page.waitForTimeout(500);
  if (await page.isChecked('#optOccupation')) throw new Error('Schalter blieb aktiv');
  const aus = await page.evaluate(() => window.__atlas.showOccupation);
  if (aus) throw new Error('Karte zeigt die Schraffur weiterhin');
  await page.locator('label.switch', { has: page.locator('#optOccupation') }).click();
  await page.keyboard.press('Escape');
});

await check('Vollbild blendet die Bedienelemente aus', async () => {
  // Tastenkuerzel greifen nicht, solange der Fokus in einem Feld steht.
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press('f');
  await page.waitForTimeout(500);
  if (!(await page.locator('#app.is-focus').count())) throw new Error('Vollbild nicht aktiv');
  if (await page.locator('#timeline').isVisible()) throw new Error('Zeitleiste bleibt sichtbar');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  if (!(await page.locator('#timeline').isVisible())) throw new Error('Zeitleiste kehrt nicht zurück');
});

await check('Zeitleiste lässt sich einklappen', async () => {
  const hoch = (await page.locator('#timeline').boundingBox()).height;
  await page.click('#btnFold');
  await page.waitForTimeout(500);
  const flach = (await page.locator('#timeline').boundingBox()).height;
  if (flach >= hoch) throw new Error(`${hoch} → ${flach} px`);
  if (await page.locator('#trackScale i').first().isVisible()) throw new Error('Skala bleibt sichtbar');
  await page.click('#btnFold');
  await page.waitForTimeout(400);
});

await check('Kriegsregister listet Kriege, Schlachten und Besetzungen', async () => {
  await page.evaluate(() => { location.hash = 'year=1815'; });
  await page.waitForTimeout(1200);
  await page.click('#btnBattles');
  await visible('#battlesBox');
  // Das Register wird nachgeladen; bis dahin steht dort nur ein Hinweis.
  await page.waitForSelector('#battlesList li[data-krieg]', { timeout: 15000 });
  const kriege = await page.locator('#battlesList li[data-krieg]').count();
  if (kriege < 2) throw new Error(`nur ${kriege} Kriege`);
  const schlachten = await page.locator('#battlesList li[data-schlacht]').count();
  if (schlachten < 1) throw new Error('keine Schlacht im Zeitraum');
  const verlauf = await page.locator('#battlesList li[data-verlauf]').count();
  if (verlauf < 3) throw new Error(`nur ${verlauf} abspielbare Verläufe`);
});

await check('Alle zwölf Verläufe sind aus dem Register erreichbar', async () => {
  const n = await page.evaluate(() => document.querySelectorAll('[data-verlauf]').length);
  if (n < 12) throw new Error(`nur ${n} Verläufe angeboten`);
});

await check('Ein Krieg legt Parteien und Schlachten auf die Karte', async () => {
  await page.evaluate(() => document.querySelector('[data-krieg="napoleonisch"]').click());
  await page.waitForTimeout(2200);
  if (!(await page.locator('.kreg__tafel').isVisible())) throw new Error('keine Kriegstafel');
  const marken = await page.locator('.leaflet-konflikt-pane .kf').count();
  if (marken < 3) throw new Error(`nur ${marken} Schlachtmarken`);
  const parteien = await page.evaluate(() => document.querySelectorAll('.leaflet-kriegsfeld-pane path').length);
  if (parteien < 2) throw new Error(`nur ${parteien} umrissene Kriegsparteien`);
  // Zurück ins Register, sonst steht der nächste Test vor der Kriegstafel.
  await page.click('#battlesBack');
  await page.waitForTimeout(600);
  if (await page.locator('.kreg__tafel').count()) throw new Error('Kriegstafel bleibt stehen');
});

await check('Schlacht spielt Station für Station ab', async () => {
  await page.evaluate(() => document.querySelector('[data-verlauf="waterloo"]').click());
  await page.waitForSelector('#battlesPlayer:not([hidden])', { timeout: 8000 });
  // Die Karte fliegt erst die Region an und dann hinein; vorher steht auf der
  // Leinwand nur die Zielmarke.
  await gelandet();
  const jahr = await page.textContent('#yearBig');
  if (!jahr.includes('1815')) throw new Error(`Zeitschnitt: ${jahr}`);
  // Die Stellungen liegen auf einer Leinwand, nicht in Einzelelementen: Der
  // Nachweis ist deshalb nicht die Zahl der Knoten, sondern gesetzte Bildpunkte.
  const gemalt = await page.evaluate(() => {
    const c = document.querySelector('.leaflet-battle-pane canvas');
    if (!c) return -1;
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4 * 97) if (d[i] > 8) n++;
    return n;
  });
  if (gemalt < 20) throw new Error(`nur ${gemalt} gesetzte Bildpunkte auf der Schlachtleinwand`);
  const erste = await page.textContent('.battles__zeit');

  // Halten, damit die Prüfung nicht gegen den Automatiklauf arbeitet.
  await page.click('[data-act="play"]');
  await page.waitForTimeout(300);
  await page.click('[data-act="next"]');
  await page.waitForTimeout(600);
  const zweite = await page.textContent('.battles__zeit');
  if (erste === zweite) throw new Error(`Station unverändert: ${erste}`);
  const zaehler = await page.textContent('.battles__zaehler');
  if (!/\d+ \/ \d+/.test(zaehler)) throw new Error(`Zähler: ${zaehler}`);
});

await check('Anflug zeigt erst die Region, dann das Schlachtfeld', async () => {
  // Zurück ins Register und eine andere Schlacht öffnen, um den Anflug
  // vollständig zu sehen.
  await page.click('[data-act="back"]');
  await page.waitForTimeout(600);
  const spur = [];
  await page.evaluate(() => {
    window.__spur = [];
    const bis = performance.now() + 9000;
    const tick = () => {
      window.__spur.push(+window.__atlasMap.getZoom().toFixed(2));
      if (performance.now() < bis) setTimeout(tick, 120);
    };
    tick();
    document.querySelector('[data-verlauf="cannae"]')?.click();
  });
  await gelandet();
  spur.push(...await page.evaluate(() => window.__spur));
  const ziel = await page.evaluate(() => window.__battles.battle.zoom);
  const weiteste = Math.min(...spur);
  const engste = Math.max(...spur);
  if (engste < ziel - .2) throw new Error(`nie angekommen: höchstens ${engste}`);
  // Zwischen Weitwinkel und Schlachtfeld müssen mindestens drei Zoomstufen
  // liegen – sonst war es ein Sprung und kein Anflug.
  const halt = spur.filter((z) => z > 2.6 && z < ziel - 3);
  if (halt.length < 6) throw new Error(`kein Halt im Weitwinkel (${halt.length} Bilder)`);
  if (weiteste > ziel - 3) throw new Error(`nicht weit genug herausgezoomt: ${weiteste}`);
});

await check('Beiblatt-Karte zeigt den Ausschnitt', async () => {
  const inset = page.locator('#battleInset');
  if (!(await inset.isVisible())) throw new Error('kein Beiblatt');
  const gemalt = await page.evaluate(() => {
    const c = document.querySelector('.beiblatt__blatt');
    if (!c) return -1;
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4 * 53) if (d[i] > 8) n++;
    return n;
  });
  if (gemalt < 50) throw new Error(`Beiblatt fast leer (${gemalt} Bildpunkte)`);
  const titel = await page.textContent('#battleInsetTitle');
  if (!titel.trim()) throw new Error('Beiblatt ohne Ortsangabe');
});

await check('Zeitachse lässt sich frei ziehen', async () => {
  const schieber = page.locator('#battlesSchieber');
  if (!(await schieber.count())) throw new Error('kein Schieber');
  const vorher = await page.textContent('.battles__zeit');
  // Ans Ende ziehen: Dort steht immer eine andere Station als am Anfang.
  await page.evaluate(() => {
    const s = document.getElementById('battlesSchieber');
    s.value = '1000';
    s.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(500);
  const nachher = await page.textContent('.battles__zeit');
  if (vorher === nachher) throw new Error(`Station unverändert: ${vorher}`);
  const f = await page.evaluate(() => window.__battles.fortschritt);
  if (f < .99) throw new Error(`Fortschritt nur ${f.toFixed(2)}`);
  // Und wieder zurück – der Verlauf muss in beide Richtungen laufen.
  await page.evaluate(() => {
    const s = document.getElementById('battlesSchieber');
    s.value = '0';
    s.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(500);
  if (await page.evaluate(() => window.__battles.index) !== 0) throw new Error('nicht zurück an den Anfang');
});

await check('Stellungen gleiten zwischen zwei Stationen', async () => {
  // Innerhalb eines Stationsfensters ruhen die Körper zuerst, während sich die
  // Pfeile zeichnen; erst danach setzen sie sich in Bewegung. Gemessen wird
  // deshalb im Bewegungsabschnitt, nicht am Anfang des Fensters.
  const umriss = (teil) => page.evaluate((x) => {
    const p = window.__battles;
    // Ab Station 1: Station 0 ist das Übersichtsblatt und trägt keine
    // Stellungen, sondern Anmarschwege.
    const st = p.battle.stationen;
    const a = st.findIndex((s) => !s.uebersicht);
    const fenster = st[a + 1].t - st[a].t;
    p.setZeit(st[a].t + fenster * x);
    const k = p.leinwand._inhalt.koerper.filter((q) => q.deckung > .5);
    return k.map((q) => q.punkte[0].map((v) => v.toFixed(4)).join(',')).join('|');
  }, teil);
  const ruht = await umriss(0.10);
  const haelt = await umriss(0.40);
  const zieht = await umriss(0.95);
  if (!ruht) throw new Error('keine Stellungen im Bild');
  if (ruht !== haelt) throw new Error('Stellungen ruhen nicht, solange die Pfeile laufen');
  if (haelt === zieht) throw new Error('Umrisse unverändert – es wird nicht gegliten');
});

await check('Übersichtsblatt zeigt den Anmarsch, bevor das Feld kommt', async () => {
  await page.click('[data-act="back"]');
  await page.waitForTimeout(500);
  await page.evaluate(() => document.querySelector('[data-verlauf="waterloo"]')?.click());
  await gelandet();
  const w = await page.evaluate(async () => {
    const p = window.__battles;
    p.stop();
    p.goTo(0);
    await new Promise((r) => setTimeout(r, 1800));
    const i = p.leinwand._inhalt;
    return {
      station: p.index,
      uebersicht: !!p.station?.uebersicht,
      wege: i.pfeile.length,
      gezeichnet: i.pfeile.every((x) => x.fortschritt > .99),
      koerper: i.koerper.filter((x) => x.deckung > .05).length,
      gelaende: i.gelaende.length,
      feldRahmen: i.feldRahmen,
      zoom: +window.__atlasMap.getZoom().toFixed(2),
      feldZoom: p.battle.zoom,
      orte: window.__atlas.showLabels ?? null,
    };
  });
  if (!w.uebersicht) throw new Error('keine Übersichtsstation');
  if (w.wege < 3) throw new Error(`nur ${w.wege} Anmarschwege`);
  // Angehalten steht der Weg ganz da – sonst wäre das Blatt leer.
  if (!w.gezeichnet) throw new Error('Anmarschwege bleiben ungezeichnet');
  if (w.koerper) throw new Error(`${w.koerper} Stellungen auf dem Übersichtsblatt`);
  if (w.gelaende) throw new Error('Gelände des Schlachtfelds auf dem Übersichtsblatt');
  if (!w.feldRahmen) throw new Error('kein Rechteck um das Schlachtfeld');
  // Das Blatt steht mehrere Stufen weiter als das Feld.
  if (w.zoom > w.feldZoom - 2.5) throw new Error(`Blatt nicht weit genug: ${w.zoom} zu ${w.feldZoom}`);

  // Und danach geht es hinein – die Ortsnamen weichen wieder.
  const feld = await page.evaluate(async () => {
    const p = window.__battles;
    p.goTo(1);
    await new Promise((r) => setTimeout(r, 2200));
    return {
      zoom: +window.__atlasMap.getZoom().toFixed(2),
      koerper: p.leinwand._inhalt.koerper.length,
      gelaende: p.leinwand._inhalt.gelaende.length,
    };
  });
  if (feld.zoom < w.zoom + 2) throw new Error(`Karte fährt nicht ins Feld: ${feld.zoom}`);
  if (!feld.koerper) throw new Error('keine Stellungen nach dem Übersichtsblatt');
  if (!feld.gelaende) throw new Error('kein Gelände nach dem Übersichtsblatt');
});

await check('Der Ausschnitt folgt der Schlacht, aber nur wo er muss', async () => {
  /* Zwei Gegenproben in einem Zug: Ein Feldzug über zweihundert Kilometer
     muss den Maßstab wechseln, sonst sind die Heere Flecken; eine Feldschlacht
     auf zwei Kilometern darf es nicht, sonst zappelt die Karte. Gemessen wird
     an den gerechneten Lagen, nicht an einem laufenden Flug – der wäre je nach
     Rechenlast des Prüfrechners mal angekommen und mal nicht. */
  const stufen = (id) => page.evaluate((v) => {
    const p = window.__battles;
    const b = p.battle;
    if (!b || b.id !== v) return null;
    const raus = [];
    for (let i = 0; i < b.stationen.length; i++) {
      // Das Übersichtsblatt steht bewusst mehrere Stufen weiter – es gehört
      // nicht zu der Frage, ob der Verlauf selbst den Maßstab wechselt.
      if (b.stationen[i].uebersicht) continue;
      const r = p._rahmenFuer(i);
      raus.push(r ? +p._lageFuer(r).zoom.toFixed(2) : null);
    }
    return raus;
  }, id);

  const oeffne = async (id) => {
    await page.click('[data-act="back"]');
    await page.waitForTimeout(500);
    await page.evaluate((v) => document.querySelector(`[data-verlauf="${v}"]`)?.click(), id);
    await gelandet();
  };

  await oeffne('tannenberg');
  const weit = await stufen('tannenberg');
  if (!weit) throw new Error('Tannenberg nicht offen');
  if (Math.max(...weit) - Math.min(...weit) < .8) {
    throw new Error(`Feldzug ohne Maßstabswechsel: ${Math.min(...weit)} bis ${Math.max(...weit)}`);
  }

  await oeffne('azincourt');
  const eng = await stufen('azincourt');
  if (!eng) throw new Error('Azincourt nicht offen');
  if (Math.max(...eng) - Math.min(...eng) > .2) {
    throw new Error(`Feldschlacht wechselt den Maßstab: ${Math.min(...eng)} bis ${Math.max(...eng)}`);
  }
});

await check('Kleine Verbände wachsen auf Mindestgröße und werden zum Zeichen', async () => {
  await page.click('[data-act="back"]');
  await page.waitForTimeout(500);
  await page.evaluate(() => document.querySelector('[data-verlauf="waterloo"]')?.click());
  await gelandet();

  const lage = (i) => page.evaluate(async (k) => {
    window.__battles.stop();
    window.__battles.goTo(k);
    await new Promise((r) => setTimeout(r, 1600));
    const koerper = window.__battles.leinwand._inhalt.koerper.filter((q) => q.deckung > .6);
    return koerper.map((q) => ({
      quer: q._lage?.quer ?? 0,
      mindest: q.mindest ?? 0,
      zeichen: q._lage?.zeichen ?? 0,
      breit: Math.max(...q._lage.p.map((p) => p[0])) - Math.min(...q._lage.p.map((p) => p[0])),
      hoch: Math.max(...q._lage.p.map((p) => p[1])) - Math.min(...q._lage.p.map((p) => p[1])),
    }));
  }, i);

  // Die Aufmarschstellung: alles groß genug, kein Zeichen im Bild.
  const anfang = await lage(1);
  if (!anfang.length) throw new Error('keine Stellungen');
  if (anfang.some((q) => q.zeichen > .5)) throw new Error('Zeichen schon in der Aufmarschstellung');

  // Der Höhepunkt: Hougoumont und Papelotte sind Gehöfte von wenigen hundert
  // Mann und auf diesem Maßstab ein Strich.
  const eng = await lage(6);
  if (!eng.some((q) => q.zeichen > .5)) throw new Error('kein Verband wird zum Zeichen');
  for (const q of eng) {
    if (Math.max(q.breit, q.hoch) < Math.min(q.mindest, q.quer) - .5) {
      throw new Error(`Verband bleibt unter der Mindestgröße: ${q.breit.toFixed(0)}×${q.hoch.toFixed(0)}`);
    }
  }
  // Die Mindestgröße folgt der Zahl: nicht alle Verbände gleich groß.
  const mindeste = new Set(eng.map((q) => Math.round(q.mindest)));
  if (mindeste.size < 2) throw new Error('Mindestgröße hängt nicht an der Stärke');
});

await check('Blattrand fasst das freie Feld ein und nennt die Schlacht', async () => {
  const w = await page.evaluate(() => {
    const l = window.__battles.leinwand;
    const m = l._blattMasse(l._map.getSize(), l._inhalt);
    if (!m) return null;
    const d = l._dichte;
    const ctx = l._leinwand.getContext('2d');
    const deckung = (x, y) => ctx.getImageData(Math.round(x * d), Math.round(y * d), 1, 1).data[3];
    const g = l._map.getSize();
    return {
      x0: Math.round(m.x0),
      y0: Math.round(m.y0),
      breit: Math.round(m.x1 - m.x0),
      hoch: Math.round(m.y1 - m.y0),
      fenster: { x: g.x, y: g.y },
      titel: m.titel,
      datum: m.datum,
      band: deckung(m.x0 + 6, (m.y0 + m.y1) / 2),
      kartusche: deckung(m.x0 + 30, m.y0 + 30),
    };
  });
  if (!w) throw new Error('kein Blattrand');
  // Das Blatt liegt im freien Feld, nicht am Fenster: Links steht die Tafel.
  if (w.x0 < 120) throw new Error(`Blatt beginnt bei ${w.x0} – die Tafel liegt darauf`);
  if (w.y0 < 30) throw new Error(`Blatt beginnt bei y=${w.y0} – unter der Kopfleiste`);
  if (w.breit > w.fenster.x - 200) throw new Error('Blatt so breit wie das Fenster');
  if (w.band < 150) throw new Error(`Randband kaum gezeichnet (Deckung ${w.band})`);
  if (w.kartusche < 150) throw new Error('keine Kartusche');
  if (!/Waterloo/.test(w.titel)) throw new Error(`Kartusche nennt: ${w.titel}`);
  if (!/1815/.test(w.datum)) throw new Error(`Kartusche ohne Datum: ${w.datum}`);
});

await check('Eigenes Zoomen übernimmt die Führung, der Hinweis gibt sie zurück', async () => {
  if (await page.evaluate(() => window.__battles.kameraFrei)) {
    throw new Error('Karte gibt die Führung schon vor dem ersten Eingriff ab');
  }
  if (await page.locator('#battleKamera').isVisible()) throw new Error('Hinweis steht ohne Anlass');
  // Ein eigener Zoomschritt – wie ihn ein Mausrad auslöst.
  await page.evaluate(() => { window.__atlasMap.setZoom(window.__atlasMap.getZoom() - .6); });
  await page.waitForTimeout(900);
  if (!(await page.evaluate(() => window.__battles.kameraFrei))) {
    throw new Error('Eingriff wird nicht bemerkt');
  }
  if (!(await page.locator('#battleKamera').isVisible())) throw new Error('kein Hinweis');
  await page.click('#battleKamera');
  await page.waitForTimeout(600);
  if (await page.evaluate(() => window.__battles.kameraFrei)) throw new Error('Führung nicht zurückgegeben');
  if (await page.locator('#battleKamera').isVisible()) throw new Error('Hinweis bleibt stehen');
});

await check('Untergrund kommt nur, wo er nichts verfälscht', async () => {
  const stand = () => page.evaluate(() => ({
    grund: window.__atlas.basemapId,
    schlacht: !!window.__atlas._schlacht,
    gezeichnet: window.__battles.leinwand?._inhalt?.grund ?? 0,
    see: !!window.__battles.leinwand?._inhalt?.see,
  }));
  const oeffne = async (id) => {
    await page.click('[data-act="back"]');
    await page.waitForTimeout(500);
    await page.evaluate((v) => document.querySelector(`[data-verlauf="${v}"]`)?.click(), id);
    await gelandet();
    return stand();
  };

  // Landschlacht auf unverändertem Gelände: Schummerung darunter.
  const land = await oeffne('waterloo');
  if (land.grund !== 'relief') throw new Error(`Waterloo ohne Schummerung: ${land.grund}`);
  if (!land.schlacht) throw new Error('Staatenfläche tritt nicht zurück');
  if (!(land.gezeichnet > 0)) throw new Error('keine gezeichnete Struktur');

  // Seeschlacht: Eine Geländeschummerung hätte auf dem Wasser nichts zu zeigen.
  const see = await oeffne('trafalgar');
  if (see.grund) throw new Error(`Seeschlacht mit Schummerung: ${see.grund}`);
  if (!see.see) throw new Error('Seeschlacht nicht als solche gezeichnet');

  // Und die Wahl des Betrachters kommt zurück.
  await page.click('[data-act="back"]');
  await page.waitForTimeout(700);
  const danach = await stand();
  if (danach.schlacht) throw new Error('Staatenfläche bleibt zurückgenommen');
  if (danach.grund !== 'relief') throw new Error(`Grundlage nicht zurückgegeben: ${danach.grund}`);
});

await check('Schlacht räumt ihre Ebene wieder ab', async () => {
  await page.click('#battlesClose');
  await page.waitForTimeout(500);
  const rest = await page.evaluate(() => document.querySelectorAll('.leaflet-battle-pane canvas').length);
  if (rest) throw new Error(`${rest} Schlachtleinwände bleiben stehen`);
  const marken = await page.locator('.leaflet-konflikt-pane .kf').count();
  if (marken) throw new Error(`${marken} Schlachtmarken bleiben stehen`);
  if (await page.locator('#battlesBox').isVisible()) throw new Error('Fenster bleibt offen');
});

await check('Vollbild lässt sich ein- und ausschalten', async () => {
  // Der Testbrowser gewährt Vollbild nicht immer; geprüft wird deshalb, dass
  // der Knopf da ist, seinen Zustand meldet und nichts kaputt macht.
  const btn = page.locator('#btnFull');
  if (!(await btn.isVisible())) throw new Error('Vollbildknopf fehlt');
  await btn.click();
  await page.waitForTimeout(700);
  const zustand = await btn.getAttribute('aria-pressed');
  if (zustand !== 'true' && zustand !== 'false') throw new Error(`aria-pressed: ${zustand}`);
  if (await page.evaluate(() => Boolean(document.fullscreenElement))) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(700);
  }
  // Die Karte muss danach weiter bedienbar sein.
  await page.waitForTimeout(300);
  if (!(await page.locator('#map').isVisible())) throw new Error('Karte weg');
});

await check('Orte erscheinen gestaffelt und auf Deutsch', async () => {
  await page.evaluate(() => { location.hash = 'position=6/48.8/9.5&year=1815'; });
  await page.waitForTimeout(2600);
  const nah = await page.evaluate(() => window.__atlas.places.length);
  if (nah < 1000) throw new Error(`nur ${nah} Orte geladen`);
  const deutsch = await page.evaluate(() => {
    const n = window.__atlas.places.map((o) => o.name);
    return { wien: n.includes('Wien'), muenchen: n.includes('München'), warschau: n.includes('Warschau') };
  });
  if (!deutsch.wien || !deutsch.muenchen || !deutsch.warschau) {
    throw new Error(`deutsche Namen fehlen: ${JSON.stringify(deutsch)}`);
  }
  // In der Weltansicht darf die Karte nicht zugetextet werden.
  await page.evaluate(() => { location.hash = 'position=2/20/10&year=1815'; });
  await page.waitForTimeout(1800);
  const weit = await page.evaluate(() => {
    const c = document.querySelector('.place-canvas');
    const ctx = c.getContext('2d');
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 40) n++;
    return n;
  });
  if (weit > 0) throw new Error('Orte werden im Weltmaßstab gezeichnet');
});

await check('Erster Weltkrieg ist abgebildet', async () => {
  await page.evaluate(() => { location.hash = 'position=5/49.5/6&year=1916'; });
  await page.waitForTimeout(2600);
  const note = await page.textContent('#yearTitle');
  if (!/Dezember 1916/.test(note)) throw new Error(`Stichtag fehlt: ${note}`);
  const besetzt = await page.evaluate(() => {
    const f = window.__atlas.epoch.geojson.features.filter((x) => x.properties.o);
    return [...new Set(f.map((x) => x.properties.o))];
  });
  if (!besetzt.includes('German Empire')) throw new Error(`Besatzer: ${besetzt.join(', ')}`);
});

await check('Herkunft der Zeitschnitte ist offengelegt', async () => {
  const marke = page.locator('#yearTitle [data-herkunft]');
  if (!(await marke.count())) throw new Error('kein Herkunftszeichen bei 1916');
  await marke.click();
  await page.waitForSelector('#modal .modal__card', { timeout: 4000 });
  const text = await page.textContent('#modalBody');
  if (!/Ursprungsdatensatz/.test(text)) throw new Error('keine Erklärung');
  await page.keyboard.press('Escape');

  // Ein korrigierter, aber nicht ergänzter Zeitschnitt trägt ein eigenes Zeichen.
  await page.evaluate(() => { location.hash = 'position=3/30/25&year=700'; });
  await page.waitForTimeout(2400);
  const art = await page.getAttribute('#yearTitle [data-herkunft]', 'data-herkunft');
  if (art !== 'korrigiert') throw new Error(`Zeichen bei 700: ${art}`);
});

await check('Keine Anachronismen mehr im Datensatz', async () => {
  const jahre = await page.evaluate(() => window.__atlas ? true : false);
  if (!jahre) throw new Error('Karte nicht bereit');
  const anzahl = await page.evaluate(async () => {
    const r = await fetch('data/epochs.json');
    return (await r.json()).epochs.length;
  });
  if (anzahl !== 62) throw new Error(`${anzahl} Zeitschnitte statt 62`);
});

await check('Der Atlas reicht bis in die Gegenwart', async () => {
  const schnitte = await page.evaluate(async () => {
    const r = await fetch('data/epochs.json');
    return (await r.json()).epochs.map((e) => e.year);
  });
  const letztes = schnitte[schnitte.length - 1];
  if (letztes !== 2026) throw new Error(`letzter Zeitschnitt ${letztes} statt 2026`);
  if (!schnitte.includes(2015)) throw new Error('Zeitschnitt 2015 fehlt');
});

await check('Südsudan und Kosovo erscheinen erst nach ihrer Gründung', async () => {
  const neu = async (jahr) => page.evaluate(async (j) => {
    const r = await fetch(`data/epochs/ad${j}.json`);
    const topo = await r.json();
    const namen = topo.objects[Object.keys(topo.objects)[0]].geometries
      .map((g) => g.properties?.n);
    return ['South Sudan', 'Kosovo'].filter((n) => namen.includes(n));
  }, jahr);

  if ((await neu(2010)).length) throw new Error('2010 kennt Südsudan oder Kosovo bereits');
  const spaet = await neu(2026);
  if (spaet.length !== 2) throw new Error(`2026 fehlt: ${spaet.join(', ') || 'beide'}`);
});

await check('Alle Staaten der Welt sind in den Gegenwartsjahren vorhanden', async () => {
  // Der Ursprungsdatensatz führt nur 193 Namen und lässt 20 UN-Mitglieder
  // aus; die Schweiz stand dort nur noch als Fläche von 0 km². Diese Prüfung
  // hält stellvertretend die Fälle fest, die aufgefallen sind – die
  // vollständige Liste prüft `npm run check:staaten`.
  const pflicht = ['Switzerland', 'San Marino', 'Vatican City', 'Monaco',
    'Singapore', 'Maldives', 'Nauru', 'Tuvalu', 'Palau', 'Timor-Leste'];
  const lage = await page.evaluate(async () => {
    const r = await fetch('data/epochs/ad2026.json');
    const topo = await r.json();
    return topo.objects[Object.keys(topo.objects)[0]].geometries
      .map((g) => g.properties)
      .filter((p) => p?.n)
      .map((p) => [p.n, p.a ?? 0]);
  });
  const flaeche = new Map(lage);
  for (const n of pflicht) {
    if (!flaeche.has(n)) throw new Error(`${n} fehlt`);
  }
  // Eine Fläche von 0 km² ist keine Kleinstaatlichkeit, sondern eine
  // entartete Geometrie – so stand die Schweiz im Ursprungsdatensatz.
  const entartet = [...flaeche].filter(([, a]) => a < 0.4).map(([n]) => n);
  if (entartet.length) throw new Error(`entartete Flächen: ${entartet.join(', ')}`);
  if (flaeche.get('Switzerland') < 35000) {
    throw new Error(`Schweiz nur ${flaeche.get('Switzerland')} km²`);
  }
});

await check('Palästina steht auf der Karte, nicht nur Israel', async () => {
  // Der Ursprungsdatensatz kennt kein Palästina: Dieselbe Israel-Fläche steht
  // dort von 1938 bis 2010 unverändert und schließt Westjordanland,
  // Ost-Jerusalem und Gazastreifen ein. Diese Prüfung hält die
  // Richtigstellung fest – in jedem Jahr, in dem sie gilt.
  const lage = async (jahr) => page.evaluate(async (j) => {
    const r = await fetch(`data/epochs/ad${j}.json`);
    const topo = await r.json();
    return topo.objects[Object.keys(topo.objects)[0]].geometries
      .map((g) => g.properties)
      .filter((p) => p?.n === 'Palestine' || p?.n === 'Israel')
      .map((p) => (p.o ? `${p.n}<${p.o}>` : p.n))
      .sort();
  }, jahr);

  for (const jahr of [1994, 2000, 2010, 2015, 2026]) {
    const ist = await lage(jahr);
    if (!ist.includes('Palestine<Israel>')) {
      throw new Error(`${jahr}: kein besetztes Palästina, sondern ${ist.join(', ') || '–'}`);
    }
    if (!ist.includes('Israel')) throw new Error(`${jahr}: Israel fehlt`);
  }

  // Und vor 1948 darf Israel nirgends stehen.
  const vorher = await lage(1938);
  if (vorher.includes('Israel')) throw new Error('1938 steht Israel auf der Karte');
});

await check('Der Golan bleibt syrisch, mit Israel als Besatzungsmacht', async () => {
  const golan = await page.evaluate(async () => {
    const r = await fetch('data/epochs/ad2026.json');
    const topo = await r.json();
    return topo.objects[Object.keys(topo.objects)[0]].geometries
      .map((g) => g.properties)
      .filter((p) => p?.n === 'Syria')
      .map((p) => (p.o ? `${p.n}<${p.o}>` : p.n));
  });
  if (!golan.includes('Syria<Israel>')) throw new Error(`Golan fehlt: ${golan.join(', ')}`);
  if (!golan.includes('Syria')) throw new Error('unbesetztes Syrien fehlt');
});

await check('Von Russland gehaltenes Gebiet bleibt ukrainisch benannt', async () => {
  const flaechen = await page.evaluate(async () => {
    const r = await fetch('data/epochs/ad2026.json');
    const topo = await r.json();
    return topo.objects[Object.keys(topo.objects)[0]].geometries
      .map((g) => g.properties)
      .filter((p) => p?.o)
      .map((p) => `${p.n}<${p.o}>`);
  });
  if (!flaechen.includes('Ukraine<Russia>')) {
    throw new Error(`keine besetzte Ukraine, sondern: ${flaechen.join(', ') || '–'}`);
  }
  // Kein Anspruch der Besatzungsmacht auf den Namen: Es darf 2026 keine Fläche
  // geben, die russisches Staatsgebiet auf ukrainischem Boden behauptet.
  if (flaechen.some((f) => f.startsWith('Russia<'))) throw new Error('Russland selbst als besetzt geführt');
});

await check('Eiszeitliche Küstenlinie greift bei den frühen Zeitschnitten', async () => {
  await page.evaluate(() => { location.hash = 'position=4.6/55/2&year=-10000'; });
  await page.waitForTimeout(3200);
  if (!(await page.evaluate(() => window.__atlas.iceAge))) throw new Error('Eiszeitküste nicht aktiv');
  // Doggerland: die Nordsee zwischen England und Jütland lag trocken.
  // Gemessen wird über das Rechteck der Zeichenfläche – sie ist gegen den
  // Kartencontainer verschoben, Containerkoordinaten passen nicht.
  const deckung = async (lat, lng) => page.evaluate(([la, ln]) => {
    const c = document.querySelector('.leaflet-ocean-pane canvas');
    const r = c.getBoundingClientRect();
    const p = window.__atlasMap.latLngToContainerPoint([la, ln]);
    const m = document.getElementById('map').getBoundingClientRect();
    const x = Math.round((m.left + p.x - r.left) * (c.width / r.width));
    const y = Math.round((m.top + p.y - r.top) * (c.height / r.height));
    if (x < 0 || y < 0 || x >= c.width || y >= c.height) return -1;
    return c.getContext('2d').getImageData(x, y, 1, 1).data[3];
  }, [lat, lng]);

  const nordsee = await deckung(54.5, 3.0);
  if (nordsee < 0) throw new Error('Messpunkt liegt außerhalb der Zeichenfläche');
  if (nordsee > 40) throw new Error(`Nordsee in der Eiszeit als Meer gezeichnet (Deckung ${nordsee})`);

  // Zurück in die Neuzeit: dort muss dieselbe Stelle Meer sein.
  await page.evaluate(() => { location.hash = 'position=4.6/55/2&year=1815'; });
  await page.waitForTimeout(3000);
  if (await page.evaluate(() => window.__atlas.iceAge)) throw new Error('Eiszeitküste bleibt aktiv');
  const heute = await deckung(54.5, 3.0);
  if (heute < 40) throw new Error(`Nordsee heute nicht als Meer gezeichnet (Deckung ${heute})`);
});

await check('Landschaftsnamen lassen sich zuschalten', async () => {
  await page.evaluate(() => { location.hash = 'position=4/44/12&year=1815'; });
  await page.waitForTimeout(2400);
  await page.click('#btnLayers');
  await page.locator('label.switch', { has: page.locator('#optPhysical') }).click();
  await page.waitForTimeout(1600);
  const n = await page.evaluate(() => window.__atlas.physical.length);
  if (n < 200) throw new Error(`nur ${n} Landschaften`);
  const namen = await page.evaluate(() => window.__atlas.physical.map((s) => s.name));
  if (!namen.includes('Alpen')) throw new Error('Alpen fehlen – deutsche Namen nicht übernommen');
  await page.locator('label.switch', { has: page.locator('#optPhysical') }).click();
  await page.keyboard.press('Escape');
});

await check('Karte meldet ihren Zustand an Vorlesesoftware', async () => {
  await page.evaluate(() => { location.hash = 'position=3/50/20&year=1942'; });
  await page.waitForTimeout(2600);
  const text = await page.textContent('#mapState');
  if (!/1942/.test(text)) throw new Error(`Jahr fehlt: ${text}`);
  if (!/Gemeinwesen/.test(text)) throw new Error(`Kennzahl fehlt: ${text}`);

  const pt = await page.evaluate(() => {
    const c = window.__atlasMap.latLngToContainerPoint([53.90, 27.57]);
    return { x: Math.round(c.x), y: Math.round(c.y) };
  });
  await page.mouse.click(pt.x, pt.y);
  await page.waitForTimeout(900);
  const nach = await page.textContent('#mapState');
  if (!/Gewählt:/.test(nach)) throw new Error(`Auswahl nicht gemeldet: ${nach}`);
  if (!/besetzt durch/.test(nach)) throw new Error(`Besatzung nicht gemeldet: ${nach}`);
  await page.keyboard.press('Escape');
});

await check('Legende ist mit der Tastatur bedienbar', async () => {
  await page.click('#btnLegend');
  await visible('#legendBox');
  const knopf = page.locator('#legendList button[data-name]').first();
  if (!(await knopf.count())) throw new Error('Legendeneinträge sind keine Schaltflächen');
  await knopf.focus();
  const fokussiert = await page.evaluate(() => document.activeElement?.dataset?.name ?? null);
  if (!fokussiert) throw new Error('Eintrag nimmt keinen Fokus');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(900);
  const gewaehlt = await page.textContent('#mapState');
  if (!/Gewählt:/.test(gewaehlt)) throw new Error('Tastaturauswahl wirkt nicht');
  await page.keyboard.press('Escape');
});

await check('Kartengrundlage wird angefordert und lässt sich wechseln', async () => {
  await page.evaluate(() => { location.hash = 'position=4/48/12&year=1815'; });
  await page.waitForTimeout(2200);
  const url = await page.evaluate(() => window.__atlas.basemapLayer?._url ?? '');
  if (!/World_Shaded_Relief/.test(url)) throw new Error(`Adresse: ${url || '(keine Ebene)'}`);
  // Esri erwartet z/y/x, nicht z/x/y – eine vertauschte Reihenfolge liefert
  // stillschweigend die falsche Kachel.
  if (!/\{z\}\/\{y\}\/\{x\}$/.test(url)) throw new Error(`Kachelreihenfolge: ${url}`);

  await page.click('#btnLayers');
  await page.click('[data-basemap="physisch"]');
  await page.waitForTimeout(600);
  const zwei = await page.evaluate(() => window.__atlas.basemapLayer?._url ?? '');
  if (!/World_Physical_Map/.test(zwei)) throw new Error(`nach Wechsel: ${zwei}`);

  await page.click('[data-basemap=""]');
  await page.waitForTimeout(600);
  if (await page.evaluate(() => Boolean(window.__atlas.basemapLayer))) {
    throw new Error('Ebene bleibt nach „Ohne“ bestehen');
  }
  await page.keyboard.press('Escape');
});

await check('Ohne erreichbare Kacheln bleibt die Karte vollständig', async () => {
  // Der entscheidende Rückfall: Ist der Dienst stumm, darf die Karte nicht
  // halb leer werden. Die Klasse is-basemap wird erst nach der ersten
  // angekommenen Kachel gesetzt – in dieser Umgebung also nie.
  await page.click('#btnLayers');
  await page.click('[data-basemap="relief"]');
  await page.waitForTimeout(1500);
  await page.keyboard.press('Escape');

  const gemeldet = await page.evaluate(() => window.__atlas.hasBasemap);
  const klasse = await page.evaluate(() => document.getElementById('map').classList.contains('is-basemap'));
  if (gemeldet !== klasse) throw new Error('Meldung und Klasse laufen auseinander');

  // Ohne angekommene Kachel muss die eigene Landfarbe stehen bleiben.
  if (!gemeldet) {
    const hg = await page.evaluate(() => getComputedStyle(document.getElementById('map')).backgroundColor);
    if (/rgba\(0, 0, 0, 0\)|transparent/.test(hg)) throw new Error('Landfarbe fehlt trotz stummem Dienst');
    const hinweis = await page.textContent('#basemapNote');
    if (!/Noch nicht geladen/.test(hinweis)) throw new Error('Ausbleiben wird nicht benannt');
  }
  const flaechen = await page.evaluate(() => document.querySelectorAll('.leaflet-pane canvas').length);
  if (flaechen < 3) throw new Error(`nur ${flaechen} Zeichenflächen`);
});

await check('Ereignisse erscheinen zur passenden Zeit und lassen sich öffnen', async () => {
  await page.goto(`${BASE}/#position=4.6/48/12&year=1530`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.ev', { timeout: 8000 });
  const marken = await page.locator('.ev').count();
  if (marken < 3) throw new Error(`nur ${marken} Marken`);
  await page.locator('.ev').first().click();
  await page.waitForSelector('.evpop__title', { timeout: 3000 });
  const titel = await page.textContent('.evpop__title');
  if (!titel.trim()) throw new Error('Kartusche ohne Titel');
});

await check('Ereignisse wechseln mit dem Zeitschnitt', async () => {
  // 1530 zeigt die Reformation, 1943 den Zweiten Weltkrieg – dieselbe Ebene,
  // anderer Inhalt. Prüft, dass das Zeitfenster wirklich greift.
  const namen = async () => page.locator('.ev__name').allTextContents();
  const damals = await namen();
  await page.goto(`${BASE}/#position=4.6/48/12&year=1943`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const jetzt = await namen();
  if (!jetzt.length) throw new Error('keine Ereignisse im zweiten Zeitschnitt');
  if (jetzt.some((n) => damals.includes(n))) throw new Error('Ereignisse haben nicht gewechselt');
});

await check('Ereignisebene lässt sich abschalten', async () => {
  await page.click('#btnLayers');
  await page.waitForSelector('#optEvents', { timeout: 2000 });
  // Das Kästchen selbst ist optisch ersetzt; bedient wird der Schalter, so
  // wie es auch ein Mensch tut.
  const schalter = page.locator('.switch:has(#optEvents)');
  await schalter.click();
  await page.waitForTimeout(600);
  if (await page.locator('.ev').count()) throw new Error('Marken bleiben stehen');
  await schalter.click();
  await page.waitForTimeout(600);
  if (!(await page.locator('.ev').count())) throw new Error('Marken kommen nicht zurück');
  await page.keyboard.press('Escape');
});

await check('Mobiles Format bleibt bedienbar', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  // Frisch laden: Die Prüfung davor lässt womöglich eine Tafel offen, und im
  // Hochformat tritt die Zeitleiste dann bewusst ab. Geprüft werden soll der
  // Ruhezustand.
  await page.goto(`${BASE}/#position=3.2/40/16&year=1815`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  if (!(await page.locator('#timeline').isVisible())) {
    const wo = await page.evaluate(() => {
      const t = document.getElementById('timeline'); const cs = getComputedStyle(t);
      const r = t.getBoundingClientRect();
      return `app="${document.getElementById('app').className}" body="${document.body.className}" `
        + `${cs.display}/${cs.visibility}/${cs.opacity} ${Math.round(r.width)}×${Math.round(r.height)}`;
    });
    throw new Error(`Zeitleiste nicht sichtbar: ${wo}`);
  }
  await visible('#track');
  await visible('#colorModes');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 2) throw new Error(`waagerechter Überlauf: ${overflow}px`);
  await page.setViewportSize({ width: 1440, height: 900 });
});

/* Das Bodenblatt ist die Bedienung am Telefon: antippen, auf halber Höhe
   lesen, hochziehen, wegwischen. Geht eine dieser vier Stufen verloren,
   bleibt die Karte zwar sichtbar, aber der Weg durch sie ist zu. */
await check('Bodenblatt am Telefon: halbe Höhe, hochziehen, wegwischen', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/#position=3.2/40/16&year=1815&ort=Austrian%20Empire`,
    { waitUntil: 'networkidle' });
  await page.waitForSelector('#panel:not([hidden])', { timeout: 8000 });
  await page.waitForTimeout(900);

  const anteil = async () => page.evaluate(() =>
    document.getElementById('panel').getBoundingClientRect().height / window.innerHeight);

  const halb = await anteil();
  if (halb < .42 || halb > .62) throw new Error(`Blatt steht auf ${Math.round(halb * 100)} % statt rund 52 %`);
  // Die Karte muss darüber sichtbar bleiben – das ist der ganze Grund für das
  // Blatt statt einer Vollbildtafel.
  const kartenrand = await page.evaluate(() =>
    document.getElementById('panel').getBoundingClientRect().top);
  if (kartenrand < 120) throw new Error(`über dem Blatt bleiben nur ${Math.round(kartenrand)}px Karte`);

  // Am Griff hochziehen.
  const griff = await page.evaluate(() => {
    const r = document.getElementById('panel').getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + 20 };
  });
  await page.mouse.move(griff.x, griff.y);
  await page.mouse.down();
  await page.mouse.move(griff.x, 80, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  const hoch = await anteil();
  if (hoch < .8) throw new Error(`Hochziehen bleibt bei ${Math.round(hoch * 100)} %`);

  // Und wieder herunterwischen schließt.
  const griff2 = await page.evaluate(() => {
    const r = document.getElementById('panel').getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + 20 };
  });
  await page.mouse.move(griff2.x, griff2.y);
  await page.mouse.down();
  await page.mouse.move(griff2.x, 830, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(600);
  if (!(await page.locator('#panel').isHidden())) throw new Error('Runterwischen schließt nicht');
  await page.setViewportSize({ width: 1440, height: 900 });
});

/* Quer gedreht ist die Anordnung eine andere: Die Tafel steht als Spalte
   rechts, damit die Karte daneben sichtbar bleibt, und die Modusleiste muss
   erreichbar bleiben – sie ist der zweite Hauptweg am Telefon. */
await check('Querformat am Telefon: Tafel als Spalte, Modi bleiben erreichbar', async () => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto(`${BASE}/#position=3.2/40/16&year=1815&ort=Austrian%20Empire`,
    { waitUntil: 'networkidle' });
  await page.waitForSelector('#panel:not([hidden])', { timeout: 8000 });
  await page.waitForTimeout(900);

  const masse = await page.evaluate(() => {
    const p = document.getElementById('panel').getBoundingClientRect();
    const m = document.getElementById('colorModes');
    const mr = m.getBoundingClientRect();
    const cs = getComputedStyle(m);
    return {
      panel: { l: p.left, r: p.right, h: p.height },
      modi: { l: mr.left, r: mr.right, w: mr.width, sicht: cs.visibility, deck: Number(cs.opacity) },
      vh: window.innerHeight, vw: window.innerWidth,
    };
  });
  if (masse.panel.h < masse.vh - 2) throw new Error('Tafel steht nicht über die volle Höhe');
  if (masse.panel.l < masse.vw * .35) throw new Error('Tafel nimmt mehr als zwei Drittel der Breite');
  if (masse.modi.sicht === 'hidden' || masse.modi.deck < .5) throw new Error('Modusleiste verschwindet');
  if (masse.modi.r > masse.panel.l + 1) throw new Error('Modusleiste liegt unter der Tafel');
  if (masse.modi.w < 150) throw new Error(`Modusleiste auf ${Math.round(masse.modi.w)}px zusammengedrückt`);

  // Und ein Modus lässt sich in dieser Lage auch wirklich wechseln.
  await page.click('#colorModes button[data-mode="culture"]');
  await page.waitForTimeout(700);
  const gewaehlt = await page.getAttribute('#colorModes button[data-mode="culture"]', 'aria-checked');
  if (gewaehlt !== 'true') throw new Error('Moduswechsel im Querformat greift nicht');
  await page.setViewportSize({ width: 1440, height: 900 });
});

/* Das Schlachtenblatt nahm am Telefon 490 von 844 Punkten und ließ darunter
   noch die Zeitleiste stehen – vom Schlachtfeld blieb nichts. Bei einer
   Schlacht ist aber gerade die Karte das, worauf sich etwas bewegt. Geprüft
   wird deshalb, was frei bleibt, nicht nur, dass sich etwas öffnet. */
await check('Schlachtenblatt am Telefon liegt unten und lässt die Karte frei', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/#position=4/48/12&year=1815`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.click('#btnBattles');
  await page.waitForSelector('#battlesBox:not([hidden])', { timeout: 8000 });
  await page.waitForTimeout(900);

  const masse = await page.evaluate(() => {
    const r = document.getElementById('battlesBox').getBoundingClientRect();
    return { oben: r.top, unten: r.bottom, breite: r.width, vh: window.innerHeight, vw: window.innerWidth };
  });
  if (masse.oben < masse.vh * .33) {
    throw new Error(`nur ${Math.round((masse.oben / masse.vh) * 100)} % Karte über dem Blatt`);
  }
  if (masse.unten < masse.vh - 2) throw new Error('Blatt liegt nicht am unteren Rand auf');
  if (masse.breite < masse.vw - 2) throw new Error('Blatt geht nicht über die volle Breite');

  // Herunterwischen schließt – dieselbe Geste wie beim Steckbrief.
  const griff = await page.evaluate(() => {
    const r = document.getElementById('battlesBox').getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + 18 };
  });
  await page.mouse.move(griff.x, griff.y);
  await page.mouse.down();
  await page.mouse.move(griff.x, 830, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(600);
  if (!(await page.locator('#battlesBox').isHidden())) throw new Error('Runterwischen schließt nicht');
  await page.setViewportSize({ width: 1440, height: 900 });
});

/* Der Maßstab stand als gepolsterte Kapsel oben links mitten im Bild. Er
   gehört in die Ecke und muss klein sein – aber die Quellenzeile darin bleibt
   ein Rechtsnachweis und muss mit dem Finger zu treffen sein. */
await check('Maßstab am Telefon: klein, in der Ecke, Quellen trotzdem greifbar', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/#position=4/48/12&year=1815`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);
  const m = await page.evaluate(() => {
    const c = document.querySelector('.credits').getBoundingClientRect();
    const l = document.getElementById('btnCredits').getBoundingClientRect();
    const cs = getComputedStyle(document.querySelector('.credits'));
    return {
      oben: c.top, links: c.left, breite: c.width, schrift: parseFloat(cs.fontSize),
      link: { w: l.width, h: l.height }, vh: window.innerHeight, vw: window.innerWidth,
    };
  });
  if (m.oben < m.vh * .5) throw new Error(`Maßstab steht bei ${Math.round((m.oben / m.vh) * 100)} % der Bildhöhe – zu weit oben`);
  if (m.links > m.vw * .1) throw new Error('Maßstab klebt nicht am linken Rand');
  if (m.breite > m.vw * .6) throw new Error(`Maßstab ${Math.round(m.breite)}px breit – zu groß`);
  if (m.schrift > 10) throw new Error(`Schrift ${m.schrift}px – zu groß`);
  if (m.link.h < 44) throw new Error(`Quellenzeile nur ${Math.round(m.link.h)}px hoch`);
  await page.setViewportSize({ width: 1440, height: 900 });
});

/* ------------------------------------------------------------- Englisch

   Die englische Fassung braucht eigene Prüfungen, und zwar strengere als ein
   Blick auf die Überschrift. Was leise kaputtgeht, ist nicht der Titel – das
   sieht man –, sondern ein Schlüssel, der als Schlüssel im Bild steht, weil
   der Text fehlt, oder eine Jahreszahl, die weiter „v. Chr.“ sagt, weil sie
   aus einer Datei kommt statt aus dem Wörterbuch. */
await check('Englische Fassung kommt auf Englisch hoch', async () => {
  const en = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'en-GB' });
  try {
    await en.goto(`${BASE}/?lang=en#position=3.2/40/16&year=1815`, { waitUntil: 'networkidle' });
    await en.waitForFunction(() => document.getElementById('boot').hidden, null, { timeout: 20000 });
    await en.waitForTimeout(1800);

    if (await en.getAttribute('html', 'lang') !== 'en') throw new Error('lang steht nicht auf en');
    if (!/Historical World Atlas/.test(await en.title())) throw new Error(`Titel: ${await en.title()}`);

    const modi = await en.$$eval('#colorModes button span', (e) => e.map((x) => x.textContent));
    if (!modi.includes('Political')) throw new Error(`Kartenmodi: ${modi.join(', ')}`);

    // Die Jahreszahl kommt aus dem Wörterbuch, nicht aus epochs.json.
    const jahr = await en.textContent('#yearBig');
    if (!/AD/.test(jahr) || /Chr/.test(jahr)) throw new Error(`Jahresangabe: ${jahr}`);

    // Die Epochennamen ebenso – sie stehen in epochs.json auf Deutsch.
    const epoche = await en.textContent('#yearEra');
    if (/Nationalstaaten|Mittelalter|Neuzeit/.test(epoche)) throw new Error(`Epoche deutsch: ${epoche}`);

    // Kein Schlüssel im Bild: Ein fehlender Text reicht seinen Schlüssel durch,
    // und der sieht wie „tafel.steckbrief“ aus – auffällig, aber nur, wenn
    // jemand hinsieht.
    await en.evaluate(() => { location.hash = 'position=3.2/40/16&year=1815&ort=Austrian%20Empire'; });
    await en.waitForTimeout(1600);
    const tafel = await en.textContent('#panelBody');
    const schluessel = tafel.match(/\b(tafel|zeit|modus|ebenen|legende|guete|epoche|grund)\.[a-z.]+/g);
    if (schluessel) throw new Error(`unübersetzte Schlüssel im Bild: ${[...new Set(schluessel)].join(', ')}`);
    if (!/Profile|Rule in|Borders:/.test(tafel)) throw new Error('Tafel zeigt keine englischen Überschriften');

    // Und der Hinweis, dass der redaktionelle Text deutsch ist, muss stehen –
    // sonst wundert sich der Leser über den Sprachwechsel mitten in der Tafel.
    if (!/German only/.test(tafel)) throw new Error('Hinweis auf die deutsche Wissensbasis fehlt');
  } finally {
    await en.close();
  }
});

/* Der Umschalter muss auch wirklich schalten – und die Wahl überdauern. */
await check('Sprachumschalter wechselt und merkt sich die Wahl', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'de-DE' });
  const sp = await ctx.newPage();
  try {
    await sp.goto(`${BASE}/#position=3.2/40/16&year=1815`, { waitUntil: 'networkidle' });
    await sp.waitForFunction(() => document.getElementById('boot').hidden, null, { timeout: 20000 });
    await sp.waitForTimeout(1200);
    if (await sp.textContent('#langKurz') !== 'DE') throw new Error('startet nicht auf Deutsch');

    await sp.click('#btnLang');
    await sp.waitForTimeout(300);
    await sp.click('#langList button[data-lang="en"]');
    await sp.waitForFunction(() => document.documentElement.lang === 'en', null, { timeout: 15000 });
    await sp.waitForTimeout(1500);
    if (!/lang=en/.test(sp.url())) throw new Error(`Sprache steht nicht in der Adresse: ${sp.url()}`);

    // Ohne ?lang= in der Adresse muss die gemerkte Wahl greifen.
    await sp.goto(`${BASE}/#position=3.2/40/16&year=1815`, { waitUntil: 'networkidle' });
    await sp.waitForTimeout(1500);
    if (await sp.getAttribute('html', 'lang') !== 'en')
      throw new Error('die gewählte Sprache überdauert das Neuladen nicht');
  } finally {
    await ctx.close();
  }
});

console.log(checks.join('\n'));
const failed = checks.filter((c) => c.includes('✗')).length;
console.log(`\n${checks.length - failed}/${checks.length} Prüfungen bestanden`);

/* Netzfehler des Wikipedia-Abrufs sind kein Befund: Der Atlas holt von genau
   einem fremden Rechner, und ob der erreichbar ist, sagt nichts über den Code.
   ERR_CERT_AUTHORITY_INVALID steht mit dabei, weil die Meldung des Browsers
   die Adresse nicht mitführt - hinter einem abfangenden Netzzugang ist sie
   dieselbe Ursache wie ERR_TUNNEL. */
const relevant = errors.filter(
  (e) => !/ERR_TUNNEL|ERR_NAME_NOT_RESOLVED|ERR_CERT_AUTHORITY_INVALID|wikipedia/i.test(e),
);
if (relevant.length) console.log(`\nKonsolenfehler:\n${relevant.slice(0, 10).join('\n')}`);
else console.log('Keine Konsolenfehler (Netzfehler zu wikipedia.org ausgenommen).');

await browser.close();
process.exit(failed ? 1 : 0);
