// Style test only (not used by the game): a tiny pixel-art engine plus a few
// sample sprites, to compare a "modern pixel" look against the vector art.
// Techniques: hue-shifted colour ramps, light from the top-left with ordered
// dithering, coloured (sel-out) outlines, frame-by-frame poses.

// ——— colour ———
function hsl2rgb(h, s, l) {
  h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}
const lerpHue = (a, b, t) => { let d = ((b - a + 540) % 360) - 180; return a + d * t; };

// Dark → light ramp; shadows drift towards violet, highlights towards warm yellow.
export function ramp(h, s, l, n = 5, spread = 52) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const hue = t < 0.5 ? lerpHue(h, 255, (0.5 - t) * 0.7) : lerpHue(h, 50, (t - 0.5) * 0.55);
    const sat = Math.min(100, s + (0.5 - t) * 18);
    out.push(hsl2rgb(hue, sat, Math.max(4, Math.min(96, l + (t - 0.55) * spread))));
  }
  return out;
}
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const INK = [20, 12, 28];
export const C = {
  white: [250, 246, 236], ink: INK, eye: [24, 16, 34],
  skin: ramp(26, 72, 70, 4, 40), hair: ramp(22, 55, 40, 4, 44), pants: ramp(250, 20, 28, 3, 22),
  leather: ramp(24, 45, 34, 4, 34), steel: ramp(215, 16, 60, 5, 58), gold: ramp(44, 90, 56, 4, 46),
  cloth: ramp(352, 66, 46, 4, 40), blush: [240, 128, 140],
  slime: ramp(272, 48, 46, 5, 50), slimeIn: ramp(285, 60, 64, 3, 26), eyeGlow: [214, 255, 90],
  boss: ramp(278, 44, 34, 5, 46), bone: ramp(40, 30, 78, 4, 40), maw: ramp(350, 60, 22, 3, 24),
  stone: ramp(250, 12, 32, 5, 26), moss: ramp(120, 35, 30, 3, 16), wall: ramp(245, 14, 36, 5, 30),
  flame: [[255, 248, 200], [255, 214, 92], [255, 146, 46], [214, 70, 40]],
  shroom: ramp(185, 70, 55, 4, 40),
};

// 2×2 ordered-dither offsets
const BAYER = [[0, 0.5], [0.75, 0.25]];
const LIGHT = (() => { const v = [-0.55, -0.62, 0.56]; const m = Math.hypot(...v); return v.map((x) => x / m); })();

// ——— pixel buffer ———
export class Px {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Array(w * h).fill(null); this.glow = []; }
  set(x, y, c) { x = Math.round(x); y = Math.round(y); if (c && x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c; }
  get(x, y) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? null : this.d[y * this.w + x]; }
  rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); }
  // lit ellipse: per-pixel normal of a dome, dithered into the ramp
  blob(cx, cy, rx, ry, rp, { clipBottom = Infinity, clipTop = -Infinity, bias = 0 } = {}) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      if (y > clipBottom || y < clipTop) continue;
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry, q = nx * nx + ny * ny;
        if (q > 1) continue;
        const nz = Math.sqrt(1 - q);
        const l = nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2];
        this.set(x, y, pick(rp, (l * 0.5 + 0.5) + bias, x, y));
      }
    }
  }
  // lit box: rounded "cylinder" shading across x, slight fall-off down y
  box(x, y, w, h, rp, bias = 0) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const nx = ((i + 0.5) / w) * 2 - 1;
      const l = 0.62 - nx * 0.42 - (j / h) * 0.22 + bias;
      this.set(x + i, y + j, pick(rp, l, x + i, y + j));
    }
  }
  line(x0, y0, x1, y1, c) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.set(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c);
  }
  // coloured outline: each empty pixel touching the sprite takes a very dark
  // version of its neighbour's colour (reads softer than flat black)
  outline() {
    const add = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.get(x, y)) continue;
      const n = this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1);
      if (n) add.push([x, y, mix(n, INK, 0.78)]);
    }
    for (const [x, y, c] of add) this.set(x, y, c);
    return this;
  }
  canvas() {
    const cv = document.createElement('canvas');
    cv.width = this.w; cv.height = this.h;
    const g = cv.getContext('2d');
    const img = g.createImageData(this.w, this.h);
    this.d.forEach((c, i) => {
      if (!c) return;
      img.data.set([c[0], c[1], c[2], c[3] ?? 255], i * 4);
    });
    g.putImageData(img, 0, 0);
    return cv;
  }
}
function pick(rp, v, x, y) {
  const t = Math.max(0, Math.min(0.999, v)) * rp.length + (BAYER[y & 1][x & 1] - 0.4) * 0.7;
  return rp[Math.max(0, Math.min(rp.length - 1, Math.floor(t)))];
}

// ——— warrior (32 × 36 cell, feet at y = 34, facing right) ———
// pose: { bob, legF, legB, liftF, liftB, sword: angle (rad) | null, swoosh: [a0, a1] | null }
export function warrior(pose, theme) {
  const K = { ...C, ...(theme || {}) };
  const p = new Px(44, 40);
  const ox = 10; // sprite origin shift to leave room for the sword
  const b = pose.bob || 0;
  const X = (x) => x + ox;
  // back arm
  p.box(X(9), 20 + b, 3, 6, K.steel, -0.25);
  // legs + boots
  for (const [base, dx, lift, bias] of [[12, pose.legB || 0, pose.liftB || 0, -0.2], [17, pose.legF || 0, pose.liftF || 0, 0]]) {
    const lx = X(base + dx);
    p.box(lx, 27 - lift, 3, 6, K.pants, bias);
    p.box(lx - 1, 32 - lift, 5, 3, K.leather, bias);
  }
  // torso: steel plate, red tabard, belt
  p.box(X(10), 18 + b, 12, 10, K.steel);
  p.box(X(14), 20 + b, 4, 9, K.cloth, 0.1);
  for (let i = 0; i < 12; i++) p.set(X(10 + i), 26 + b, K.leather[i % 3 === 0 ? 1 : 2]);
  p.set(X(15), 26 + b, K.gold[3]); p.set(X(16), 26 + b, K.gold[2]);
  // head + helm
  p.blob(X(16), 11 + b, 7, 6.5, K.skin);
  p.blob(X(15.5), 8.5 + b, 8, 6, K.steel, { clipBottom: 9 + b });
  for (let i = 0; i < 14; i++) p.set(X(9 + i), 10 + b, K.steel[i < 4 ? 2 : 1]);
  for (const [hx0, dir] of [[10, -1], [21, 1]]) { // horns
    for (let i = 0; i < 6; i++) {
      const x = X(hx0 + dir * (i * 0.55)), y = 5 + b - i + (i > 3 ? (i - 3) * 0.6 : 0);
      p.set(x, y, K.bone[i < 3 ? 2 : 3]); p.set(x + dir * -1, y, K.bone[1]);
    }
  }
  p.rect(X(13), 7 + b, 6, 1, K.gold[2]); p.set(X(16), 6 + b, K.gold[3]);
  // face: eyes with a highlight, blush
  for (const ex of [17, 20]) { p.rect(X(ex), 12 + b, 1, 2, K.eye); }
  p.set(X(20), 12 + b, K.white);
  p.set(X(22), 14 + b, K.blush);
  // shoulder pad
  p.blob(X(20), 19 + b, 3.6, 2.6, K.steel, { bias: 0.08 });
  // front arm + sword
  const hand = { x: X(22), y: 23 + b };
  if (pose.sword !== null && pose.sword !== undefined) {
    const a = pose.sword;
    const hx = X(19) + Math.cos(a) * 4, hy = 21 + b + Math.sin(a) * 4;
    hand.x = hx; hand.y = hy;
    p.line(X(19), 21 + b, hx, hy, K.steel[2]);
    p.line(X(19), 22 + b, hx, hy + 1, K.steel[1]);
    sword(p, hx, hy, a, K);
  } else {
    p.box(X(20), 21 + b, 3, 5, K.steel, 0.1);
    sword(p, hand.x, hand.y + 1, -1.15, K);
  }
  p.rect(Math.round(hand.x) - 1, Math.round(hand.y) - 1, 2, 2, K.skin[2]);
  p.outline();
  if (pose.swoosh) swoosh(p, X(18), 21 + b, pose.swoosh);
  return p;
}
function sword(p, hx, hy, a, K = C) {
  const dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
  for (let i = 2; i <= 14; i++) {
    p.set(hx + dx * i, hy + dy * i, K.steel[4]);
    p.set(hx + dx * i + nx, hy + dy * i + ny, i > 12 ? K.steel[3] : K.steel[2]);
  }
  for (let i = -2; i <= 2; i++) p.set(hx + dx * 1.5 + nx * i, hy + dy * 1.5 + ny * i, K.gold[i === 0 ? 3 : 2]);
  p.set(hx - dx * 1.5, hy - dy * 1.5, K.gold[1]);
}
function swoosh(p, cx, cy, [a0, a1]) {
  const n = 18;
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    const k = i / n;
    for (const [r, c] of [[16, [255, 250, 220, 255]], [15, [255, 226, 140, Math.round(200 * k)]], [14, [255, 190, 90, Math.round(120 * k)]]]) {
      const x = Math.round(cx + Math.cos(a) * r), y = Math.round(cy + Math.sin(a) * r);
      if (!p.get(x, y) || r === 16) p.set(x, y, c);
    }
  }
}
// Mitos look: crimson plate with gold trim
export const MITOS_THEME = { steel: ramp(352, 62, 52, 5, 54), cloth: ramp(44, 92, 56, 4, 44), leather: ramp(270, 30, 30, 4, 30) };

export const WARRIOR_ANIMS = {
  idle: [{ bob: 0 }, { bob: 0 }, { bob: 1 }, { bob: 1 }],
  walk: [
    { bob: 0, legF: 2, legB: -2, liftF: 1 }, { bob: 1, legF: 0, legB: 0 },
    { bob: 0, legF: -2, legB: 2, liftB: 1 }, { bob: 1, legF: 0, legB: 0 },
  ],
  attack: [
    { bob: 0, sword: -2.4 }, { bob: 0, sword: -2.4 }, { bob: 1, sword: -0.5, swoosh: [-2.3, -0.5], legF: 2 },
    { bob: 1, sword: 0.9, swoosh: [-1.6, 0.9], legF: 2 }, { bob: 0, sword: 0.9, legF: 1 },
  ],
};

// ——— toxic ooze (30 × 26), the game's purple slime ———
export function slime(f) {
  const sq = [0, 1, 2, 1][f % 4];
  const p = new Px(30, 26);
  const base = 22, ry = 9.5 - sq, rx = 11 + sq * 0.8, cy = base - ry + 1;
  p.blob(15, cy, rx, ry + 1, C.slime, { clipBottom: base });
  // wavy dripping hem
  for (let i = -Math.round(rx) + 1; i <= Math.round(rx) - 1; i++) {
    const drip = (i + 20 + f) % 5 === 0 ? 2 : (i + 20 + f) % 5 === 1 ? 1 : 0;
    for (let k = 0; k <= drip; k++) p.set(15 + i, base + k, C.slime[k ? 0 : 1]);
  }
  p.blob(9, cy + 3, 1.6, 1.6, C.slimeIn); p.blob(21, cy + 5, 1.1, 1.1, C.slimeIn); p.set(12, cy - 5, C.slimeIn[2]);
  p.set(8, cy - ry + 3, C.white); p.set(9, cy - ry + 2, C.white); p.set(10, cy - ry + 2, C.slime[4]);
  // glowing slit eyes with angry brows, toothy grin
  const ey = Math.round(cy - 1);
  for (const ex of [13, 19]) {
    p.rect(ex, ey, 3, 2, C.eyeGlow);
    p.set(ex + 1, ey, C.eye); p.set(ex + 1, ey + 1, C.eye);
    p.line(ex - (ex < 15 ? 0 : -2), ey - 2, ex + (ex < 15 ? 3 : 0), ey - 1, C.eye);
  }
  for (let i = 0; i < 9; i++) p.set(12 + i, ey + 4, C.maw[0]);
  for (const tx of [13, 15, 17, 19]) p.set(tx, ey + 4, C.white);
  for (const tx of [14, 18]) p.set(tx, ey + 5, C.white);
  p.glow.push({ x: 15, y: ey, r: 8, c: [200, 255, 90] });
  return p.outline();
}

// ——— Raja Maw boss (60 × 56) ———
export function boss(f) {
  const br = f % 2;
  const p = new Px(64, 58);
  const cx = 32, cy = 34;
  // horns (behind)
  for (const s of [-1, 1]) {
    for (let i = 0; i < 16; i++) {
      const t = i / 15;
      const x = cx + s * (13 + t * 15 - t * t * 2), y = cy - 10 - t * 26 + t * t * 4;
      const w = 4.2 - t * 3.4;
      for (let k = -w; k <= w; k++) p.set(x + k * 0.6, y + k * 0.3, C.bone[t < 0.5 ? 1 : 2 + (k < 0 ? 1 : 0)]);
    }
  }
  // claws
  for (const s of [-1, 1]) p.blob(cx + s * 21, cy + 15, 5, 4, C.boss, { bias: -0.05 });
  // body
  p.blob(cx, cy - br, 22, 18 + br, C.boss);
  // belly
  p.blob(cx + 2, cy + 6 - br, 13, 9, ramp(290, 30, 46, 4, 30), { bias: 0.1 });
  // crown
  for (let i = -9; i <= 9; i++) for (let j = 0; j < 4; j++) p.set(cx + i, cy - 19 - j - br, C.gold[j === 3 ? 3 : 2 - (i > 4 ? 1 : 0)]);
  for (const s of [-8, 0, 8]) {
    for (let j = 0; j < 5 - (s === 0 ? -1 : 0); j++) for (let k = -1; k <= 1; k++) if (Math.abs(k) <= (4 - j) / 2) p.set(cx + s + k, cy - 23 - j - br, C.gold[k < 0 ? 3 : 2]);
    p.set(cx + s, cy - 21 - br, [230, 60, 90]);
  }
  // eyes (glowing) and brows
  for (const s of [-1, 1]) {
    p.rect(cx + s * 8 - 2, cy - 10 - br, 5, 3, [255, 70, 70]);
    p.rect(cx + s * 8, cy - 10 - br, 1, 3, C.eye);
    p.set(cx + s * 8 - 1, cy - 10 - br, [255, 200, 190]);
    p.line(cx + s * 4, cy - 12 - br, cx + s * 12, cy - 15 - br, C.boss[0]);
    p.glow.push({ x: cx + s * 8, y: cy - 9 - br, r: 9, c: [255, 120, 60] });
  }
  // maw with teeth
  const my = cy + 2 - br;
  for (let y = 0; y < 8 + br; y++) for (let x = -11 + y * 0.4; x <= 11 - y * 0.4; x++) p.set(cx + x, my + y, C.maw[y < 2 ? 0 : 1]);
  for (let i = -10; i <= 10; i += 3) { p.set(cx + i, my, C.white); p.set(cx + i, my + 1, C.bone[3]); p.set(cx + i + 1, my, C.white); }
  for (let i = -8; i <= 8; i += 4) { p.set(cx + i, my + 7 + br, C.white); p.set(cx + i, my + 6 + br, C.bone[3]); }
  p.set(cx + 6, my + 9 + br, [180, 240, 120]); p.set(cx + 6, my + 10 + br, [150, 220, 100]);
  return p.outline();
}

// ——— items (16 × 16) ———
export function swordIcon() {
  const p = new Px(18, 18);
  sword(p, 4, 14, -Math.PI / 4);
  p.rect(2, 15, 2, 2, C.leather[2]);
  return p.outline();
}
export function potionIcon() {
  const p = new Px(18, 18);
  p.blob(9, 11, 5.5, 5, ramp(350, 75, 50, 5, 50));
  p.box(7, 3, 4, 4, ramp(200, 25, 75, 3, 20));
  p.rect(7, 2, 4, 1, C.leather[2]);
  p.set(6, 9, C.white); p.set(7, 8, C.white);
  for (let i = 5; i <= 13; i++) if (p.get(i, 9)) p.set(i, 9, mix(p.get(i, 9), [255, 255, 255], 0.15));
  return p.outline();
}

// ——— dungeon tiles & props ———
function rng(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
export function floorTile(seed) {
  const r = rng(seed * 97 + 13);
  const p = new Px(16, 16);
  p.rect(0, 0, 16, 16, C.stone[0]);
  // 4 irregular flagstones
  // irregular split per tile so the floor doesn't read as a grid
  const vx = 5 + Math.floor(r() * 7), hl = 4 + Math.floor(r() * 8), hr = 4 + Math.floor(r() * 8);
  for (const [x, y, w, h] of [[0, 0, vx, hl], [vx, 0, 16 - vx, hr], [0, hl, vx, 16 - hl], [vx, hr, 16 - vx, 16 - hr]]) {
    if (w > 2 && h > 2) p.box(x + 1, y + 1, w - 1, h - 1, C.stone, (r() - 0.5) * 0.35);
  }
  if (r() < 0.45) { const x = 2 + Math.floor(r() * 10), y = 2 + Math.floor(r() * 10); p.line(x, y, x + 3, y + 2, C.stone[0]); }
  if (r() < 0.35) for (let i = 0; i < 4; i++) p.set(Math.floor(r() * 16), 15 - Math.floor(r() * 3), C.moss[1 + Math.floor(r() * 2)]);
  return p;
}
export function wallTile(seed, top) {
  const r = rng(seed * 31 + 7);
  const p = new Px(16, 16);
  p.rect(0, 0, 16, 16, C.wall[0]);
  let y = 0;
  [5, 5, 6].forEach((h, row) => {
    const off = (row + (seed & 1)) % 2 ? 5 : 0;
    for (let bx = -off; bx < 16; bx += 10) p.box(bx + 1, y + 1, 9, h - 1, C.wall, (top ? 0.15 : -0.05) + (r() - 0.5) * 0.2);
    y += h;
  });
  return p;
}
export function torch(f) {
  const p = new Px(10, 20);
  p.box(4, 11, 2, 7, C.leather);
  p.rect(3, 10, 4, 2, C.steel[1]);
  const fl = [[0, 0, 1], [1, -1, 0], [0, 1, -1], [-1, 0, 1]][f % 4];
  const shape = [[5, 3], [4, 4], [6, 4], [4, 5], [5, 5], [6, 5], [3, 6], [4, 6], [5, 6], [6, 6], [7, 6], [4, 7], [5, 7], [6, 7], [4, 8], [5, 8], [6, 8], [5, 9]];
  for (const [x, y] of shape) {
    const d = Math.hypot(x - 5, y - 7.5);
    const c = C.flame[Math.min(3, Math.floor(d / 1.4 + (y < 5 ? 1 : 0)))];
    p.set(x + (y < 6 ? fl[0] : 0), y + (y < 5 ? fl[1] : 0), c);
  }
  p.set(5 + fl[2], 2, C.flame[3]);
  return p;
}
export function mushroom(seed) {
  const p = new Px(9, 9);
  p.box(3, 5, 2, 3, C.bone, 0.1);
  p.blob(4, 4.5, 4, 2.6, C.shroom, { clipBottom: 5 });
  p.set(3, 3, C.white);
  return p.outline();
}
export function bones() {
  const p = new Px(12, 7);
  p.blob(3, 3, 2.4, 2.2, C.bone);
  p.set(2, 3, C.eye); p.set(4, 3, C.eye);
  p.line(6, 4, 11, 2, C.bone[2]); p.line(6, 5, 10, 6, C.bone[1]);
  return p.outline();
}

// ——— extra primitives for the showcase items ———
// filled polygon, lit from the top-left across its bounding box
Px.prototype.poly = function (pts, rp, bias = 0) {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.floor(Math.min(...xs)), x1 = Math.ceil(Math.max(...xs));
  const y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > y + 0.5) !== (yj > y + 0.5) && x + 0.5 < ((xj - xi) * (y + 0.5 - yi)) / (yj - yi) + xi) inside = !inside;
    }
    if (!inside) continue;
    const nx = ((x - x0) / Math.max(1, x1 - x0)) * 2 - 1, ny = ((y - y0) / Math.max(1, y1 - y0)) * 2 - 1;
    this.set(x, y, pick(rp, 0.62 - nx * 0.3 - ny * 0.28 + bias, x, y));
  }
};
// thick segment, lit on one side
Px.prototype.thick = function (x0, y0, x1, y1, w, rp, bias = 0) {
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  for (let y = Math.floor(Math.min(y0, y1) - w); y <= Math.ceil(Math.max(y0, y1) + w); y++) {
    for (let x = Math.floor(Math.min(x0, x1) - w); x <= Math.ceil(Math.max(x0, x1) + w); x++) {
      const t = Math.max(0, Math.min(1, ((x + 0.5 - x0) * dx + (y + 0.5 - y0) * dy) / (len * len)));
      const px = x0 + dx * t, py = y0 + dy * t;
      const d = Math.hypot(x + 0.5 - px, y + 0.5 - py);
      if (d > w / 2) continue;
      const side = ((x + 0.5 - px) * nx + (y + 0.5 - py) * ny) / (w / 2);
      this.set(x, y, pick(rp, 0.55 - side * 0.38 + bias, x, y));
    }
  }
};
// faceted gem (diamond), bright facet top-left, white glint
Px.prototype.gem = function (cx, cy, r, rp) {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    if (Math.abs(x) + Math.abs(y) > r) continue;
    const l = x < 0 && y < 0 ? 0.92 : x >= 0 && y >= 0 ? 0.18 : 0.55;
    this.set(cx + x, cy + y, pick(rp, l, cx + x, cy + y));
  }
  this.set(cx - Math.floor(r / 2), cy - Math.floor(r / 2), C.white);
};
// soft dithered glow around the silhouette (alpha), for rarity halos
Px.prototype.halo = function (rgb, reach = 3, strength = 1) {
  const solid = this.d.map((c) => !!c && (c[3] ?? 255) === 255);
  const add = [];
  for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
    if (solid[y * this.w + x]) continue;
    let best = 99;
    for (let j = -reach; j <= reach; j++) for (let i = -reach; i <= reach; i++) {
      const xx = x + i, yy = y + j;
      if (xx < 0 || yy < 0 || xx >= this.w || yy >= this.h || !solid[yy * this.w + xx]) continue;
      best = Math.min(best, Math.hypot(i, j));
    }
    if (best > reach) continue;
    const a = (1 - (best - 1) / reach) * strength;
    if (a - BAYER[y & 1][x & 1] * 0.35 > 0.2) add.push([x, y, [...rgb, Math.round(Math.min(1, a) * 200)]]);
  }
  for (const [x, y, c] of add) if (!this.get(x, y)) this.set(x, y, c);
};
// 4-point twinkle
Px.prototype.star = function (x, y, s, c) {
  this.set(x, y, C.white);
  for (let k = 1; k <= s; k++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) this.set(x + dx * k, y + dy * k, k === s ? c : C.white);
};
