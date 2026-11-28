import { defineConfig } from 'vite';

// Relative base so the built case study can be dropped into any sub-path
// of the main portfolio (e.g. /work/oman-vision-2040/).
export default defineConfig({
  base: './',
  build: { assetsInlineLimit: 0 },
});
