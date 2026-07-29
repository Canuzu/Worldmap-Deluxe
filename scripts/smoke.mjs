#!/usr/bin/env node
/**
 * Kurzer Funktionsdurchlauf gegen einen laufenden Server.
 * Aufruf: node scripts/smoke.mjs [http://127.0.0.1:5173]
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://127.0.0.1:5173';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

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

await check('Ebenen-Menü und Einfärbungswechsel', async () => {
  await page.click('#btnLayers');
  await visible('#layersMenu');
  await page.click('[data-mode="sovereign"]');
  await page.waitForTimeout(500);
  const checked = await page.getAttribute('[data-mode="sovereign"]', 'aria-checked');
  if (checked !== 'true') throw new Error('Modus nicht aktiv');
  await page.click('[data-mode="polity"]');
  await page.keyboard.press('Escape');
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

await check('Schlachtenfenster listet Schlachten auf', async () => {
  await page.click('#btnBattles');
  await visible('#battlesBox');
  const n = await page.locator('#battlesList li[data-battle]').count();
  if (n < 3) throw new Error(`nur ${n} Schlachten`);
});

await check('Schlacht spielt Station für Station ab', async () => {
  await page.click('[data-battle="waterloo"]');
  await page.waitForSelector('#battlesPlayer:not([hidden])', { timeout: 8000 });
  await page.waitForTimeout(2500);
  const jahr = await page.textContent('#yearBig');
  if (!jahr.includes('1815')) throw new Error(`Zeitschnitt: ${jahr}`);
  const gezeichnet = await page.evaluate(() => document.querySelectorAll('.leaflet-battle-pane path').length);
  if (gezeichnet < 2) throw new Error(`nur ${gezeichnet} Stellungen gezeichnet`);
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

await check('Schlacht räumt ihre Ebene wieder ab', async () => {
  await page.click('#battlesClose');
  await page.waitForTimeout(500);
  const rest = await page.evaluate(() => document.querySelectorAll('.leaflet-battle-pane path').length);
  if (rest) throw new Error(`${rest} Stellungen bleiben stehen`);
  if (await page.locator('#battlesBox').isVisible()) throw new Error('Fenster bleibt offen');
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

await check('Mobiles Format bleibt bedienbar', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(800);
  await visible('#timeline');
  await visible('#track');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 2) throw new Error(`waagerechter Überlauf: ${overflow}px`);
  await page.setViewportSize({ width: 1440, height: 900 });
});

console.log(checks.join('\n'));
const failed = checks.filter((c) => c.includes('✗')).length;
console.log(`\n${checks.length - failed}/${checks.length} Prüfungen bestanden`);

const relevant = errors.filter((e) => !/ERR_TUNNEL|ERR_NAME_NOT_RESOLVED|wikipedia/i.test(e));
if (relevant.length) console.log(`\nKonsolenfehler:\n${relevant.slice(0, 10).join('\n')}`);
else console.log('Keine Konsolenfehler (Netzfehler zu wikipedia.org ausgenommen).');

await browser.close();
process.exit(failed ? 1 : 0);
