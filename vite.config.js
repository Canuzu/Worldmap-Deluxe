import { defineConfig } from 'vite';

// Kennung des Datenstands. Die Dateien unter public/data/ behalten über alle
// Veröffentlichungen hinweg dieselben Namen; ohne diese Kennung liefern
// Browser und CDN nach einem Neubau weiterhin die alten Zeitschnitte aus.
const DATENSTAND = process.env.GITHUB_SHA?.slice(0, 8) ?? String(Date.now());

export default defineConfig({
  define: { __DATENSTAND__: JSON.stringify(DATENSTAND) },
  // Relativer Basispfad: der gebaute Atlas läuft damit auch in einem
  // Unterverzeichnis (z. B. GitHub Pages) ohne weitere Konfiguration.
  base: './',
  server: { host: '127.0.0.1', port: 5173 },
  preview: { host: '127.0.0.1', port: 4173 },
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsInlineLimit: 2048,
  },
});
