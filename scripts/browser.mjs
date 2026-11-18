/**
 * Welcher Chromium die Prüfskripte fährt.
 *
 * Die Skripte hatten den Pfad zu einem bestimmten Chromium fest eingetragen.
 * In einer anderen Umgebung liegt dort eine andere Fassung, und jedes Skript
 * brach ab, bevor es etwas geprüft hatte. Gesucht wird jetzt in dieser
 * Reihenfolge: CHROME_PATH, dann der neueste Chromium unter
 * PLAYWRIGHT_BROWSERS_PATH (bzw. /opt/pw-browsers), sonst der, den Playwright
 * selbst mitbringt.
 */
import fs from 'node:fs';
import path from 'node:path';

function finde() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const wurzel = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  if (!fs.existsSync(wurzel)) return undefined;
  const ordner = fs.readdirSync(wurzel)
    .filter((n) => /^chromium-\d+$/.test(n))
    .sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]));
  for (const o of ordner) {
    for (const unter of ['chrome-linux64', 'chrome-linux']) {
      const kandidat = path.join(wurzel, o, unter, 'chrome');
      if (fs.existsSync(kandidat)) return kandidat;
    }
  }
  return undefined;
}

/** Startoptionen für chromium.launch(): der gefundene Browser plus eigene Angaben. */
export function startOptionen(weitere = {}) {
  const executablePath = finde();
  return executablePath ? { executablePath, ...weitere } : { ...weitere };
}
