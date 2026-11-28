import { defineConfig } from 'vite';

/**
 * Build so that dist/index.html also works when opened straight from disk
 * (file://), where browsers refuse ES module scripts:
 *  - bundle as a single classic IIFE script, loaded with `defer`
 *  - relative base, so the folder can live at any path or sub-path
 */
const classicScript = () => ({
  name: 'classic-script',
  enforce: 'post',
  transformIndexHtml: {
    order: 'post',
    handler: (html) =>
      html
        .replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/g, '<script defer src="$1"></script>')
        .replace(/<link rel="modulepreload"[^>]*>\n?/g, '')
        .replace(/ crossorigin(?=[ >])/g, ''),
  },
});

export default defineConfig({
  base: './',
  plugins: [classicScript()],
  build: {
    assetsInlineLimit: 0,
    modulePreload: false,
    rollupOptions: { output: { format: 'iife' } },
  },
});
