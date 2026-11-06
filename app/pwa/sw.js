// Service worker (offline play): every file of the build is stored on the device at install,
// and the game is served from there, so after one visit it opens without a network. The fonts
// from Google are stored too. The build fills in VERSION and FILES (vite.config.js).
const VERSION = '__VERSION__';
const FILES = __FILES__;
const FONT_CSS = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Barlow:wght@400;500;600;700&display=swap';
const CACHE = `cq-${VERSION}`, FONTS = 'cq-fonts';

async function storeFonts() {
  const cache = await caches.open(FONTS);
  if (await cache.match(FONT_CSS)) return;
  const css = await fetch(FONT_CSS);
  if (!css.ok) return;
  const text = await css.clone().text();
  await cache.put(FONT_CSS, css);
  const urls = [...text.matchAll(/url\((https:[^)]+)\)/g)].map((m) => m[1]);
  await Promise.all(urls.map((u) => fetch(u).then((r) => r.ok && cache.put(u, r))));
}

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    await (await caches.open(CACHE)).addAll(FILES);
    try { await storeFonts(); } catch { /* offline right now: the fonts are stored on a later visit */ }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE && k !== FONTS) await caches.delete(k);
    await self.clients.claim();
  })());
});

// the piece of a stored file an <audio> element asks for
async function partial(req) {
  const stored = await caches.match(req, { ignoreSearch: true });
  if (!stored) return fetch(req);
  const data = await stored.arrayBuffer(), [, from, to] = /bytes=(\d+)-(\d*)/.exec(req.headers.get('range'));
  const a = Number(from), b = to ? Number(to) : data.byteLength - 1;
  return new Response(data.slice(a, b + 1), { status: 206, headers: {
    'Content-Type': stored.headers.get('Content-Type') || 'audio/mpeg', 'Accept-Ranges': 'bytes',
    'Content-Range': `bytes ${a}-${b}/${data.byteLength}`, 'Content-Length': String(b - a + 1),
  } });
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then(async (c) => (await c.match(req)) || fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; })));
    return;
  }
  if (url.origin !== self.location.origin) return;
  // a page (the game, with or without ?cheat / ?2d) → the stored index.html
  if (req.mode === 'navigate') {
    e.respondWith(caches.match('./index.html', { cacheName: CACHE }).then((r) => r || fetch(req)));
    return;
  }
  if (req.headers.has('range')) { e.respondWith(partial(req)); return; } // music streams in pieces
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((r) => r || fetch(req)));
});
