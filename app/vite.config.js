import { defineConfig } from 'vite';

// base './' keeps dist/ portable (sub-path hosting and file:// inspection)
export default defineConfig({
  base: './',
  build: { target: 'es2022', outDir: 'dist' },
  // run/ and meta/ are pure logic, so tests run in plain Node (no DOM)
  test: { include: ['src/**/*.test.js'], environment: 'node' },
});
