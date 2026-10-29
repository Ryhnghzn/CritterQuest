// Loading screen (spec §29) shown while a 3D place is built: a painting of the place being
// entered (public/img/load_<place>.webp, dimmed; loading_bg.webp for anywhere else, with its
// painted eclipse set behind the progress ring; the dark night alone until it has loaded),
// an eclipse closing as the progress, the hero running on, what is being built and a rotating
// tip. The building itself happens in steps (render3d warm()); step() waits for frames between
// them so this screen keeps moving.
import { el } from './screens.js';
import { drawDoll } from '../art/doll.js';
import { tr } from '../i18n.js';

const TAU = Math.PI * 2;
const STEPS = {
  torch: 'Menyalakan obor…', town: 'Membangun kota…', land: 'Menanam pepohonan…',
  dungeon: 'Menyusun lorong dungeon…', shadow: 'Menyiapkan bayangan…', people: 'Membangunkan warga…', foes: 'Membangunkan monster…', ready: 'Siap!',
};
const TIPS = [
  'Ambil tugas di Papan Tugas dulu. Progres baru dihitung setelah diambil.',
  'Tekan Spasi untuk dodge: sesaat kebal terhadap serangan.',
  'Pedagang Malam hanya buka setelah matahari terbenam.',
  'Angka hijau di tombol Karakter berarti ada poin yang belum dibagi.',
  'Gerbang dungeon tersembunyi di wilayah. Jelajahi kabutnya.',
  'Tidur di Penginapan memulihkan HP penuh.',
  'Peti harta di wilayah dijaga. Kalahkan penjaganya dulu.',
  'Ramuan di sabuk dipakai dengan Z X C V.',
];
// painted backdrops, one per place (town, region biome or dungeon id): cached once asked for
const ART = new Map();
const PLACES = ['town', 'forest', 'ice', 'desert', 'volcano', 'eclipse', 'shadow', 'crystal', 'fungus', 'tomb', 'lava', 'spire'];
// the general backdrop's painted eclipse (fractions of the painting: centre, disc radius of its
// height) and the colour of its sky, which fills above it once it is moved down to the ring
const GENERAL = { file: 'loading_bg', eclipse: { x: 0.5, y: 0.259, r: 0.105 }, sky: '#0e0d0d' };
function art(place) {
  if (typeof Image !== 'function') return null;
  const key = PLACES.includes(place) ? place : 'general';
  if (!ART.has(key)) {
    const img = new Image(), a = key === 'general' ? { ...GENERAL, img, at: 0 } : { img, at: 0 };
    img.onload = () => { a.at = performance.now(); };
    img.src = `img/${a.file || `load_${key}`}.webp`;
    ART.set(key, a);
  }
  return ART.get(key);
}
// After the first load, fetch the rest while idle so later loading screens show theirs at once.
const prefetch = () => (window.requestIdleCallback || setTimeout)(() => [...PLACES, null].forEach(art));
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
const CALM = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

let box = null, raf = 0, target = 0, shown = 0, stepKey = 'torch', hero = null, bg = null, t0 = 0, tipAt = 0, fetched = false;

// avatar: { classId, look } of the hero who runs across (null: none); place: which painting
// (one of PLACES; anything else: the general one)
export function showLoading(avatar = null, place = null) {
  hero = avatar; bg = art(place);
  target = shown = 0; stepKey = 'torch';
  if (!box) build();
  box.classList.remove('out', 'hidden');
  t0 = performance.now(); tipAt = Math.floor(Math.random() * TIPS.length);
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(paint);
}

// Moves the bar and names the step, then lets two frames paint before the next heavy part.
export async function loadingStep(progress, key) {
  target = Math.max(target, progress);
  if (key) stepKey = key;
  await nextFrame(); await nextFrame();
}

// Fills the bar, then fades out (the world's first frame has been drawn under it by now).
export async function hideLoading() {
  if (!box) return;
  target = 1; stepKey = 'ready';
  const t = performance.now();
  while (shown < 0.995 && performance.now() - t < 450) await nextFrame();
  box.classList.add('out');
  await new Promise((r) => setTimeout(r, 320));
  box.classList.add('hidden');
  cancelAnimationFrame(raf);
  if (!fetched) { fetched = true; prefetch(); }
}

function build() {
  box = el('div', 'hidden');
  box.id = 'loading';
  const c = document.createElement('canvas');
  c.className = 'lbg';
  const bar = el('div', 'lbar'); bar.append(el('i'));
  const row = el('div', 'lrow'); row.append(el('span', 'lstep'), el('span', 'lpct'));
  const lbox = el('div', 'lbox'); lbox.append(row, bar);
  box.append(c, el('div', 'ltitle', 'Critter Quest'), lbox, el('div', 'ltip'));
  document.body.append(box);
}

function paint(now) {
  const t = (now - t0) / 1000;
  shown += (target - shown) * (target >= 1 ? 0.3 : 0.12) + 0.0008; // eases on, and creeps while a step works
  shown = Math.min(shown, Math.max(target, 0.02) + 0.04, 1);
  box.querySelector('.lbar i').style.width = `${shown * 100}%`;
  box.querySelector('.lpct').textContent = `${Math.round(shown * 100)}%`;
  box.querySelector('.lstep').textContent = tr(STEPS[stepKey]);
  box.querySelector('.ltip').textContent = `${tr('Tips')}: ${tr(TIPS[(tipAt + Math.floor(t / 5)) % TIPS.length])}`;
  const c = box.querySelector('.lbg'), dpr = Math.min(devicePixelRatio || 1, 2), w = innerWidth, h = innerHeight;
  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
  const g = c.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawScene(g, w, h, CALM.matches ? 0 : t, shown); // reduced motion: a still scene, the bar still fills
  raf = requestAnimationFrame(paint);
}

// the painting, covering the screen and dimmed so the eclipse, bar and tip stay readable
function drawArt(g, w, h, cx, cy, R) {
  const fade = bg?.at ? Math.min(1, (performance.now() - bg.at) / 300) : 0;
  if (!fade) return;
  const { img, eclipse: e } = bg;
  if (e) { // the painted eclipse sits just inside the ring; the sky colour fills above the painting
    const H = Math.max((R * 0.95) / e.r, w / (img.width / img.height)), W = H * img.width / img.height;
    const x = cx - e.x * W, y = cy - e.y * H;
    g.globalAlpha = fade;
    if (y > 0) { g.fillStyle = bg.sky; g.fillRect(0, 0, w, y + 2); }
    g.drawImage(img, x, y, W, H);
    const seam = g.createLinearGradient(0, y, 0, y + 40);
    seam.addColorStop(0, bg.sky); seam.addColorStop(1, 'rgba(14,13,13,0)');
    g.fillStyle = seam; g.fillRect(0, y, w, 40);
  } else {
    const k = Math.max(w / img.width, h / img.height), W = img.width * k, H = img.height * k;
    g.globalAlpha = fade * 0.75;
    g.drawImage(img, (w - W) / 2, (h - H) / 2, W, H);
  }
  g.globalAlpha = 1;
  if (e) return lowShade(g, w, h); // already dark: only the bottom, under the bar and tip
  const v = g.createRadialGradient(w / 2, h * 0.4, Math.min(w, h) * 0.15, w / 2, h * 0.45, Math.max(w, h) * 0.75);
  v.addColorStop(0, 'rgba(7,5,10,.55)'); v.addColorStop(0.5, 'rgba(7,5,10,.25)'); v.addColorStop(1, 'rgba(7,5,10,.8)');
  g.fillStyle = v; g.fillRect(0, 0, w, h);
  lowShade(g, w, h);
}

function lowShade(g, w, h) {
  const low = g.createLinearGradient(0, h * 0.6, 0, h);
  low.addColorStop(0, 'rgba(7,5,10,0)'); low.addColorStop(1, 'rgba(7,5,10,.9)');
  g.fillStyle = low; g.fillRect(0, h * 0.6, w, h * 0.4);
}

function drawScene(g, w, h, t, p) {
  g.fillStyle = '#07050a'; g.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h * 0.4, R = Math.min(w, h) * 0.13;
  drawArt(g, w, h, cx, cy, R);
  const halo = g.createRadialGradient(cx, cy, 0, cx, cy, R * 2.6);
  halo.addColorStop(0, `rgba(201,162,74,${bg?.at ? 0.45 : 0.2})`); halo.addColorStop(1, 'rgba(201,162,74,0)'); // brighter over a painting
  g.fillStyle = halo; g.fillRect(cx - R * 3, cy - R * 3, R * 6, R * 6);
  g.lineCap = 'round';
  g.strokeStyle = 'rgba(201,162,74,.25)'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke();
  g.strokeStyle = '#e8cf8e'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + TAU * p); g.stroke();
  // the moon slides over the sun as the world gets ready
  g.fillStyle = '#07050a'; g.beginPath(); g.arc(cx + R * (0.9 - p * 0.9), cy, R * 0.86, 0, TAU); g.fill();
  for (let i = 0; i < 6; i++) { // runes orbiting
    const a = t * 0.8 + (i / 6) * TAU;
    g.save(); g.translate(cx + Math.cos(a) * R * 1.45, cy + Math.sin(a) * R * 1.45); g.rotate(a);
    g.fillStyle = `rgba(232,207,142,${0.4 + 0.4 * Math.sin(t * 3 + i)})`; g.fillRect(-2, -5, 4, 10);
    g.restore();
  }
  const gy = h * 0.68, x0 = w * 0.2, span = w * 0.6; // the ground line sits above the progress box
  g.strokeStyle = 'rgba(201,162,74,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, gy); g.lineTo(x0 + span, gy); g.stroke();
  g.fillStyle = 'rgba(201,162,74,.3)';
  for (let i = 0; i < 12; i++) g.fillRect(x0 + (((i * 50 - t * 140) % span) + span) % span, gy + 4, 14, 2);
  if (hero) {
    const k = Math.min(2, h / 260);
    g.save(); g.translate(cx, gy); g.scale(k, k);
    try { drawDoll(g, hero.classId, hero.look, { t, moving: 1, walk: t * 9 }); } catch { /* a look the doll can't draw: just the bar */ }
    g.restore();
  }
}
