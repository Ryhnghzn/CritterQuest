// Loading screen (spec §29) shown while a 3D place is built: an eclipse closing as the
// progress, the hero running on, what is being built and a rotating tip. The building
// itself happens in steps (render3d warm()); step() waits for frames between them so
// this screen keeps moving.
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
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
const CALM = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

let box = null, raf = 0, target = 0, shown = 0, stepKey = 'torch', hero = null, t0 = 0, tipAt = 0;

// avatar: { classId, look } of the hero who runs across (null: none)
export function showLoading(avatar = null) {
  hero = avatar;
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

function drawScene(g, w, h, t, p) {
  g.fillStyle = '#07050a'; g.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h * 0.4, R = Math.min(w, h) * 0.13;
  const halo = g.createRadialGradient(cx, cy, 0, cx, cy, R * 2.6);
  halo.addColorStop(0, 'rgba(201,162,74,.2)'); halo.addColorStop(1, 'rgba(201,162,74,0)');
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
