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

// Page loader with a real bar (spec §46): the built entry script is fetched first while its bytes
// are counted (window.__boot in index.html), then started as a module from the HTTP cache /
// service worker. Without fetch streams it simply starts the script.
function bootLoader() {
  return {
    name: 'cq-boot-loader',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const tag = html.match(/<script type="module" crossorigin src="([^"]+)"><\/script>/);
        if (!tag || !ctx.bundle) return html;
        const file = tag[1].replace(/^\.\//, '');
        const chunk = ctx.bundle[file];
        const size = chunk && chunk.type === 'chunk' ? Buffer.byteLength(chunk.code) : 0;
        if (!size) return html;
        const loader = `<script>(function(){var src=${JSON.stringify(tag[1])},size=${size},MB=1048576;
function go(){var s=document.createElement('script');s.type='module';s.crossOrigin='';s.src=src;document.head.appendChild(s);}
if(!window.fetch||!window.ReadableStream){go();return;}
fetch(src,{cache:'force-cache'}).then(function(r){if(!r.ok||!r.body)throw 0;var rd=r.body.getReader(),got=0;
function pump(){return rd.read().then(function(x){if(x.done)return;got+=x.value.length;var k=Math.min(1,got/size);
window.__boot&&window.__boot(0.03+0.68*k,'dl',(got/MB).toFixed(1)+' / '+(size/MB).toFixed(1)+' MB');return pump();});}
return pump();}).then(go,go);})();</script>`;
        return html.replace(tag[0], loader);
      },
    },
  };
}

// base './' keeps dist/ portable (sub-path hosting and file:// inspection)
export default defineConfig({
  base: './',
  build: { target: 'es2022', outDir: 'dist' },
  plugins: [serviceWorker(), bootLoader()],
  // run/ and meta/ are pure logic, so tests run in plain Node (no DOM)
  test: { include: ['src/**/*.test.js'], environment: 'node' },
});
