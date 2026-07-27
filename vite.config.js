import { defineConfig } from 'vite';

export default defineConfig({
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
