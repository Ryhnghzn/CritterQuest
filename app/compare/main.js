// Style comparison page: vector art from the game (left) vs pixel samples (right).
import { drawDoll } from '../src/art/doll.js';
import { ENEMY_ART, iconCanvas } from '../src/art/sprites.js';
import { gearCanvas } from '../src/art/gear.js';
import * as P from './pixel.js';
import { drawHit } from '../src/render/world.js';
import { levelRing, auraBack, auraFront } from '../src/art/aura.js';
import { drawGearIcon } from '../src/art/gear.js';
import { spinFx, novaFx, rainFx, fireFx, auraFx } from './fx.js';
import { ITEMS, ITEM_VECTOR } from './items.js';

const DPR = Math.min(devicePixelRatio || 1, 2);
const TAU = Math.PI * 2;
const $ = (id) => document.getElementById(id);
const draws = []; // (t) => void, called every animation frame

function fig(parent, w, h, caption, pixel = false) {
  const f = document.createElement('figure');
  const c = document.createElement('canvas');
  if (pixel) { c.width = w; c.height = h; c.className = 'pix'; }
  else { c.width = w * DPR; c.height = h * DPR; }
  c.style.width = `${w}px`; c.style.height = `${h}px`;
  const cap = document.createElement('figcaption');
  cap.textContent = caption;
  f.append(c, cap);
  parent.append(f);
  return c;
}

// ——— vector side: the game's own drawing functions ———
const GEAR = { weapon: { tier: 3, rarity: 3 }, helm: { tier: 2, rarity: 3 }, armor: { tier: 3, rarity: 3 }, boots: { tier: 2, rarity: 2 } };
const LOOK = { hair: 1, hairColor: 1, gear: GEAR };
for (const [label, pose] of [
  ['Diam', (t) => ({ t })],
  ['Jalan', (t) => ({ t, moving: 1, walk: t * 9 })],
  ['Serang', (t) => ({ t, attack: Math.max(0, Math.sin(t * 5)) })],
]) {
  const c = fig($('v-char'), 150, 180, label);
  const g = c.getContext('2d');
  draws.push((t) => {
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height);
    g.setTransform(DPR * 3, 0, 0, DPR * 3, (c.width / 2), c.height - 14 * DPR);
    g.beginPath(); g.ellipse(0, 0, 10, 2.4, 0, 0, TAU); g.fillStyle = 'rgba(0,0,0,.35)'; g.fill();
    drawDoll(g, 'warrior', LOOK, pose(t));
  });
}

for (const [label, type, r, size] of [['Lendir', 'slink', 11, 150], ['Raja Maw', 'boss', 30, 210]]) {
  const c = fig($('v-mon'), size, size, label);
  const g = c.getContext('2d');
  const k = (size * 0.32) / r;
  draws.push((t) => {
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height);
    const sq = 1 + Math.sin(t * 6) * 0.06;
    g.setTransform(DPR * k / sq, 0, 0, DPR * k * sq, c.width / 2, c.height / 2 + 6 * DPR);
    ENEMY_ART[type](g, r);
  });
}

for (const [label, make] of [
  ['Pedang Epik', () => gearCanvas({ slot: 'weapon', classId: 'warrior', variant: 3, rarity: 3 }, 96)],
  ['Ramuan Merah', () => iconCanvas('pot_red', 96)],
]) {
  const f = document.createElement('figure');
  const c = make();
  const cap = document.createElement('figcaption');
  cap.textContent = label;
  f.append(c, cap);
  $('v-icon').append(f);
}

// ——— pixel side ———
function pixelAnim(parent, frames, scale, fps, caption) {
  const w = frames[0].w * scale, h = frames[0].h * scale;
  const cvs = frames.map((p) => p.canvas());
  const c = fig(parent, w, h, caption);
  const g = c.getContext('2d');
  draws.push((t) => {
    const f = cvs[Math.floor(t * fps) % cvs.length];
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height);
    g.imageSmoothingEnabled = false;
    g.drawImage(f, 0, 0, c.width, c.height);
  });
}
for (const [label, key, fps] of [['Diam', 'idle', 3], ['Jalan', 'walk', 8], ['Serang', 'attack', 10]]) {
  pixelAnim($('p-char'), P.WARRIOR_ANIMS[key].map(P.warrior), 4, fps, label);
}
pixelAnim($('p-mon'), [0, 1, 2, 3].map(P.slime), 5, 6, 'Lendir');
pixelAnim($('p-mon'), [0, 1].map(P.boss), 3.4, 2, 'Raja Maw');
for (const [label, p] of [['Pedang', P.swordIcon()], ['Ramuan Merah', P.potionIcon()]]) {
  pixelAnim($('p-icon'), [p], 5.4, 1, label);
}

// ——— pixel dungeon scene (320 × 176, lit per pixel in light bands) ———
const W = 320, H = 176, T = 16;
const base = document.createElement('canvas'); base.width = W; base.height = H;
{
  const g = base.getContext('2d');
  for (let ty = 0; ty < H / T; ty++) for (let tx = 0; tx < W / T; tx++) {
    const tile = ty < 2 ? P.wallTile(tx * 7 + ty, ty === 0) : P.floorTile(tx * 13 + ty * 29);
    g.drawImage(tile.canvas(), tx * T, ty * T);
  }
  g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, 2 * T, W, 3);
  for (const [x, y] of [[40, 70], [282, 150], [150, 160]]) g.drawImage(P.bones().canvas(), x, y);
}
const torches = [0, 1, 2, 3].map((f) => P.torch(f).canvas());
const TORCH_X = [56, 160, 264];
const shroomC = P.mushroom(1).canvas();
const SHROOMS = [[22, 120], [300, 96], [210, 166], [100, 158]];
const slimeF = [0, 1, 2, 3].map((f) => P.slime(f).canvas());
const warF = { walk: P.WARRIOR_ANIMS.walk.map((p) => P.warrior(p).canvas()), attack: P.WARRIOR_ANIMS.attack.map((p) => P.warrior(p).canvas()) };
const scene = document.createElement('canvas'); scene.width = W; scene.height = H;
const sg = scene.getContext('2d', { willReadFrequently: true });
const BAYER = [[0, 0.5], [0.75, 0.25]];
const pOut = $('p-scene'); pOut.width = W; pOut.height = H;
const po = pOut.getContext('2d');

function shadow(g, x, y, w) {
  g.fillStyle = 'rgba(0,0,0,.45)';
  for (let i = -w; i <= w; i++) g.fillRect(x + i, y, 1, Math.abs(i) < w - 1 ? 2 : 1);
}

draws.push((t) => {
  sg.drawImage(base, 0, 0);
  for (const [x, y] of SHROOMS) sg.drawImage(shroomC, x, y);
  for (const x of TORCH_X) sg.drawImage(torches[Math.floor(t * 8 + x) % 4], x - 5, 10);
  // hero walks in, then swings at the slimes
  const cyc = t % 6, walking = cyc < 2.4;
  const hx = walking ? 70 + cyc * 22 : 123, hy = 112;
  const fr = walking ? warF.walk[Math.floor(t * 8) % 4] : warF.attack[Math.floor(t * 10) % 5];
  for (const [sx, sy, ph] of [[176, 104, 0], [196, 126, 2]]) {
    shadow(sg, sx, sy + 20, 9);
    sg.drawImage(slimeF[Math.floor(t * 6 + ph) % 4], sx - 15, sy - 4);
  }
  shadow(sg, Math.round(hx + 6), hy + 33, 7);
  sg.drawImage(fr, Math.round(hx - 20), hy - 4);

  // lighting: ambient + torches, mushrooms, the hero; quantised into bands with dither
  const fl = (x) => 1 + Math.sin(t * 9 + x) * 0.05 + Math.sin(t * 23 + x * 2) * 0.03;
  const lights = [
    ...TORCH_X.map((x) => ({ x, y: 18, r: 118 * fl(x), i: 1.25, c: [1.0, 0.74, 0.46] })),
    ...SHROOMS.map(([x, y]) => ({ x: x + 4, y: y + 4, r: 32, i: 0.7, c: [0.45, 0.95, 1.0] })),
    ...[[176, 104], [196, 126]].map(([x, y]) => ({ x, y: y + 4, r: 16, i: 0.35, c: [0.8, 1.0, 0.45] })),
    { x: hx + 6, y: hy + 18, r: 84, i: 0.7, c: [1.0, 0.9, 0.78] },
  ];
  const img = sg.getImageData(0, 0, W, H), d = img.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let L = 0.3, cr = 0.3 * 0.6, cg = 0.3 * 0.62, cb = 0.3 * 1.0; // cool ambient
    for (const l of lights) {
      const dist = Math.hypot(x - l.x, (y - l.y) * 1.25);
      if (dist >= l.r) continue;
      const k = Math.pow(1 - dist / l.r, 1.6) * l.i;
      L += k; cr += k * l.c[0]; cg += k * l.c[1]; cb += k * l.c[2];
    }
    const band = Math.min(1.25, Math.floor((L + BAYER[y & 1][x & 1] * 0.14) * 5) / 5);
    const s = band / Math.max(L, 0.001);
    const i = (y * W + x) * 4;
    d[i] = Math.min(255, d[i] * cr * s * 1.25);
    d[i + 1] = Math.min(255, d[i + 1] * cg * s * 1.25);
    d[i + 2] = Math.min(255, d[i + 2] * cb * s * 1.25);
  }
  po.putImageData(img, 0, 0);
});

// ——— vector dungeon scene (same layout, the game's vector pieces + soft light) ———
const vOut = $('v-scene');
const VS = 2; // world → css px
vOut.width = W * VS * DPR; vOut.height = H * VS * DPR;
const vg = vOut.getContext('2d');
const dark = document.createElement('canvas'); dark.width = vOut.width; dark.height = vOut.height;
const dg = dark.getContext('2d');
const stones = [];
{ let s = 5; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 70; i++) stones.push({ x: r() * W, y: 34 + r() * (H - 34), w: 14 + r() * 18, h: 9 + r() * 9 }); }

draws.push((t) => {
  const k = VS * DPR;
  vg.setTransform(k, 0, 0, k, 0, 0);
  vg.fillStyle = '#23202f'; vg.fillRect(0, 0, W, H);
  for (const st of stones) { vg.beginPath(); vg.roundRect(st.x, st.y, st.w, st.h, 4); vg.fillStyle = 'rgba(255,255,255,.04)'; vg.fill(); vg.strokeStyle = 'rgba(0,0,0,.35)'; vg.lineWidth = 1; vg.stroke(); }
  const gr = vg.createLinearGradient(0, 0, 0, 34); gr.addColorStop(0, '#2b2738'); gr.addColorStop(1, '#3a3550');
  vg.fillStyle = gr; vg.fillRect(0, 0, W, 34);
  vg.fillStyle = 'rgba(0,0,0,.4)'; vg.fillRect(0, 32, W, 3);
  for (const x of TORCH_X) {
    vg.fillStyle = '#5a3b26'; vg.fillRect(x - 1.5, 16, 3, 12);
    const f = 1 + Math.sin(t * 11 + x) * 0.15;
    vg.beginPath(); vg.moveTo(x, 4 - f * 3); vg.quadraticCurveTo(x + 5, 12, x, 17); vg.quadraticCurveTo(x - 5, 12, x, 4 - f * 3);
    vg.fillStyle = '#ffb347'; vg.fill();
  }
  for (const [x, y] of SHROOMS) { vg.beginPath(); vg.ellipse(x + 4, y + 4, 4, 2.6, 0, Math.PI, 0); vg.fillStyle = '#5fe0e8'; vg.fill(); }
  const cyc = t % 6, walking = cyc < 2.4;
  const hx = walking ? 70 + cyc * 22 : 123, hy = 112;
  for (const [sx, sy] of [[176, 104], [196, 126]]) {
    vg.save(); vg.translate(sx, sy + 9); const sq = 1 + Math.sin(t * 6 + sx) * 0.06; vg.scale(1 / sq, sq);
    ENEMY_ART.slink(vg, 11); vg.restore();
  }
  vg.save(); vg.translate(hx + 6, hy + 34); vg.scale(0.85, 0.85);
  drawDoll(vg, 'warrior', LOOK, walking ? { t, moving: 1, walk: t * 9 } : { t, attack: Math.max(0, Math.sin(t * 5)) });
  vg.restore();
  // darkness with soft holes + warm tint (same idea as render/light.js)
  dg.setTransform(1, 0, 0, 1, 0, 0); dg.globalCompositeOperation = 'source-over';
  dg.clearRect(0, 0, dark.width, dark.height); dg.fillStyle = 'rgba(8,6,22,.78)'; dg.fillRect(0, 0, dark.width, dark.height);
  dg.globalCompositeOperation = 'destination-out'; dg.setTransform(k, 0, 0, k, 0, 0);
  const holes = [...TORCH_X.map((x) => [x, 16, 92]), ...SHROOMS.map(([x, y]) => [x + 4, y + 4, 26]), [hx + 6, hy + 18, 70]];
  for (const [x, y, r] of holes) { const h = dg.createRadialGradient(x, y, 0, x, y, r); h.addColorStop(0, 'rgba(0,0,0,1)'); h.addColorStop(1, 'rgba(0,0,0,0)'); dg.fillStyle = h; dg.fillRect(x - r, y - r, r * 2, r * 2); }
  vg.setTransform(1, 0, 0, 1, 0, 0); vg.drawImage(dark, 0, 0);
  vg.setTransform(k, 0, 0, k, 0, 0); vg.globalCompositeOperation = 'lighter';
  for (const x of TORCH_X) { const h = vg.createRadialGradient(x, 16, 0, x, 16, 80); h.addColorStop(0, 'rgba(255,160,70,.22)'); h.addColorStop(1, 'rgba(255,160,70,0)'); vg.fillStyle = h; vg.fillRect(x - 80, -64, 160, 160); }
  vg.globalCompositeOperation = 'source-over';
});

// ——— skill effects ———
const FX = [
  ['Putaran Pedang', spinFx(), 1.45, 1.5, (u) => (u < 1 ? [{ fx: 'spin', x: 0, y: 0, r: 70, life: 1 - u, maxLife: 1 }] : []), true],
  ['Nova Es', novaFx(), 1.3, 1.7, (u) => (u < 0.4 ? [{ fx: 'nova', x: 0, y: 0, r: 90, life: 0.4 - u, maxLife: 0.4 }] : []), false],
  ['Hujan Panah', rainFx(), 1.6, 1.8, (u) => (u < 1.5 ? [{ fx: 'rain', x: 0, y: 20, r: 60, life: 1.5 - u, maxLife: 1.5 }] : []), false],
  ['Bola Api', fireFx(), 1.5, 2, (u) => (u < 0.75
    ? [{ fx: 'fireball', x: -100 + (u / 0.75) * 135, y: 0, r: 6, vx: 180, vy: 0, life: 1, maxLife: 1 }]
    : [{ fx: 'boom', x: 35, y: 0, r: 36, life: Math.max(0, 0.18 - (u - 0.75)), maxLife: 0.18 }]), false],
];
for (const [label, pfx, k, period, hits, hero] of FX) {
  const c = fig($('v-fx'), 256, 192, label);
  const g = c.getContext('2d');
  draws.push((t) => {
    const u = t % period, s = DPR * k * (256 / 384);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#17141f'; g.fillRect(0, 0, c.width, c.height);
    g.setTransform(s, 0, 0, s, c.width / 2, c.height / 2);
    if (hero) {
      g.save(); g.translate(0, 18); g.scale(0.9, 0.9);
      drawDoll(g, 'warrior', LOOK, { t, attack: u < 1 ? 1 : 0 }); g.restore();
    }
    for (const h of hits(u)) drawHit(g, h, { classId: 'warrior', look: LOOK }, t);
  });
  const pc = fig($('p-fx'), 256, 192, label);
  const pg = pc.getContext('2d');
  draws.push((t) => { pfx.frame(t); pg.imageSmoothingEnabled = false; pg.drawImage(pfx.canvas, 0, 0, pc.width, pc.height); });
}

// ——— Mitos aura ———
{
  const MITOS = { weapon: { tier: 6, rarity: 5 }, helm: { tier: 6, rarity: 5 }, armor: { tier: 6, rarity: 5 }, boots: { tier: 6, rarity: 5 } };
  const look = { hair: 1, hairColor: 1, gear: MITOS };
  const fxs = { phoenix: 1, chain: 1, frenzy: 1, explode: 1 };
  const c = fig($('v-aura'), 288, 288, 'LV 50 · Mitos');
  const g = c.getContext('2d');
  draws.push((t) => {
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#0b0912'; g.fillRect(0, 0, c.width, c.height);
    const s = DPR * 4;
    g.setTransform(s, 0, 0, s, c.width / 2, c.height - 30 * DPR);
    levelRing(g, 0, 0, 50, t);
    auraBack(g, 0, 0, fxs, t);
    drawDoll(g, 'warrior', look, { t });
    auraFront(g, 0, 0, fxs, 5, t);
  });
  const pa = auraFx();
  const pc = fig($('p-aura'), 288, 288, 'LV 50 · Mitos');
  const pg = pc.getContext('2d');
  draws.push((t) => { pa.frame(t); pg.imageSmoothingEnabled = false; pg.drawImage(pa.canvas, 0, 0, pc.width, pc.height); });
}

// ——— best items ———
for (const [name, base] of Object.entries(ITEM_VECTOR)) {
  const c = fig($('v-items'), 96, 96, name);
  const g = c.getContext('2d');
  const item = { ...base, variant: 6, rarity: 5 };
  draws.push((t) => {
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height);
    g.translate(c.width / 2, c.height / 2);
    drawGearIcon(g, item, c.width * 0.9, t);
  });
  pixelAnim($('p-items'), [0, 1, 2, 3, 4, 5, 6, 7].map((f) => ITEMS[name](f)), 2.4, 8, name);
}

const t0 = performance.now();
(function loop(now) {
  const t = Math.max(0, (now - t0) / 1000); // rAF timestamps can precede t0
  draws.forEach((d, i) => { try { d(t); } catch (e) { if (!d.failed) { d.failed = true; console.error(`draw ${i}: ${e.message}`); } } });
  requestAnimationFrame(loop);
})(t0);
