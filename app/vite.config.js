import { defineConfig } from 'vite';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';

// Offline play (spec §32): the build writes sw.js from pwa/sw.js, listing every file of
// dist/ (the bundle and public/) so the service worker can store them all on the device.
function serviceWorker() {
  let pub = 'public';
  const walk = (dir) => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
  return {
    name: 'cq-service-worker',
    apply: 'build',
    configResolved(c) { pub = c.publicDir; },
    generateBundle(_, bundle) {
      const files = ['index.html', ...Object.keys(bundle).filter((f) => f !== 'index.html'), ...walk(pub).map((p) => relative(pub, p).split('\\').join('/'))];
      const list = [...new Set(files)].sort().map((f) => `./${f}`);
      const version = createHash('sha1').update(list.join('\n')).digest('hex').slice(0, 10);
      const source = readFileSync('pwa/sw.js', 'utf8').replace('__VERSION__', version).replace('__FILES__', JSON.stringify(list, null, 1));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

// base './' keeps dist/ portable (sub-path hosting and file:// inspection)
export default defineConfig({
  base: './',
  build: { target: 'es2022', outDir: 'dist' },
  plugins: [serviceWorker()],
  // run/ and meta/ are pure logic, so tests run in plain Node (no DOM)
  test: { include: ['src/**/*.test.js'], environment: 'node' },
});
