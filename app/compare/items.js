// Style test only: over-the-top Mitos-rarity items in pixel art (40 × 40, 8 frames).
import { Px, ramp, C } from './pixel.js';

const TAU = Math.PI * 2;
const R = {
  gold: ramp(42, 92, 56, 5, 56), crimson: ramp(350, 78, 48, 5, 50), blade: ramp(215, 22, 72, 5, 50),
  dark: ramp(250, 22, 26, 4, 26), wood: ramp(22, 45, 30, 4, 30), violet: ramp(278, 62, 52, 5, 54),
  poison: ramp(110, 80, 50, 4, 44), ice: ramp(195, 80, 66, 4, 40), bone: ramp(40, 30, 80, 4, 36),
};
const MITOS = [255, 77, 109];
const FIRE = [[255, 250, 210], [255, 214, 92], [255, 146, 46], [214, 70, 40]];
const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

// gem that pulses between two ramps' brightness with the frame
function pulseGem(p, x, y, r, rp, f) { p.gem(x, y, r, rp.map((c) => c.map((v) => Math.min(255, v + Math.round(30 * Math.sin((f / 8) * TAU)))))); }

// shared finish: outline, Mitos halo (pulsing), sparkles, rising motes
function finish(p, f, sparks) {
  p.outline();
  p.halo(MITOS, 3, 0.75 + 0.35 * Math.sin((f / 8) * TAU));
  for (const [x, y, ph] of sparks) {
    const k = (f + ph) % 8;
    if (k < 3) p.star(x, y, k === 1 ? 2 : 1, [255, 214, 92]);
  }
  for (let i = 0; i < 4; i++) {
    const ph = ((f / 8) + i / 4) % 1;
    const x = Math.round(6 + hash(i, 3) * 28), y = Math.round(37 - ph * 30);
    if (!p.get(x, y)) p.set(x, y, [...MITOS, Math.round(255 * (1 - ph))]);
  }
  return p;
}

function flames(p, pts, f) {
  pts.forEach(([x, y, nx, ny], k) => {
    const h = 2 + Math.floor(hash(k, f) * 4);
    for (let j = 1; j <= h; j++) {
      const c = FIRE[Math.min(3, Math.floor((j / h) * 3.5))];
      const px = Math.round(x + nx * j + (hash(k, f + j) - 0.5)), py = Math.round(y + ny * j - j * 0.5);
      if (!p.get(px, py)) p.set(px, py, c);
    }
  });
}

export const ITEMS = {
  'Pedang Mitos'(f) {
    const p = new Px(40, 40);
    p.thick(12, 28, 33, 7, 6.5, R.blade, 0.1);
    for (let i = 0; i < 9; i++) { // glowing runes in the fuller
      const x = Math.round(14 + i * 2.1), y = Math.round(26 - i * 2.1);
      p.set(x, y, (i + f) % 3 === 0 ? [255, 235, 240] : R.crimson[3]);
    }
    p.thick(6, 23, 17, 34, 4, R.gold, 0.05);                  // crossguard
    p.blob(5, 22, 2.6, 2.6, R.gold); p.blob(18, 35, 2.6, 2.6, R.gold);
    p.thick(11, 29, 6, 34, 3.2, R.wood);                       // grip
    pulseGem(p, 11, 29, 2, R.crimson, f);
    pulseGem(p, 4, 36, 2, R.crimson, f + 4);
    finish(p, f, [[33, 6, 0], [24, 13, 4]]);
    const edge = [];
    for (let i = 0; i < 9; i++) edge.push([15 + i * 2.2, 22 - i * 2.2, -0.7, -0.7]);
    flames(p, edge, f);
    return p;
  },
  'Busur Mitos'(f) {
    const p = new Px(40, 40);
    let prev = null;
    for (let i = 0; i <= 20; i++) { // bow limb along a curve
      const t = i / 20, x = 10 + Math.sin(t * Math.PI) * 17, y = 4 + t * 32;
      if (prev) p.thick(prev[0], prev[1], x, y, 4 - Math.sin(t * Math.PI) * 0.5, R.gold);
      prev = [x, y];
    }
    for (const [y, s] of [[4, -1], [36, 1]]) p.poly([[10, y], [3, y + s * 2], [6, y - s * 3], [12, y - s * 5]], R.crimson);
    p.box(25, 17, 3, 7, R.wood);
    pulseGem(p, 26, 20, 2, R.ice, f);
    const glow = [200 + Math.round(40 * Math.sin((f / 8) * TAU)), 240, 255];
    p.line(10, 5, 10, 35, glow);
    p.thick(6, 20, 32, 20, 1.8, R.ice, 0.2);                   // nocked spirit arrow
    p.poly([[36, 20], [31, 17], [31, 23]], R.ice);
    finish(p, f, [[36, 20, 0], [10, 4, 3], [10, 36, 6]]);
    return p;
  },
  'Tongkat Mitos'(f) {
    const p = new Px(40, 40);
    p.thick(9, 38, 23, 14, 3.4, R.violet, -0.15);
    for (const k of [0.3, 0.6]) p.thick(9 + 14 * k - 1.5, 38 - 24 * k + 1, 9 + 14 * k + 1.5, 38 - 24 * k - 1, 3, R.gold);
    for (let a = 0.7; a < 5.4; a += 0.08) {                     // crescent cradle
      const x = 26 + Math.cos(a) * 8, y = 10 + Math.sin(a) * 8;
      p.set(x, y, R.gold[2]); p.set(x + Math.cos(a) * -1, y + Math.sin(a) * -1, R.gold[3]);
    }
    p.blob(26, 10, 4.8, 4.8, R.violet.map((c) => c.map((v) => Math.min(255, v + 40 + Math.round(25 * Math.sin((f / 8) * TAU))))));
    p.set(24, 8, C.white); p.set(25, 7, C.white);
    finish(p, f, [[26, 10, 0]]);
    for (let i = 0; i < 3; i++) { // orbiting sparks
      const a = (f / 8) * TAU + (i * TAU) / 3;
      p.set(Math.round(26 + Math.cos(a) * 10), Math.round(10 + Math.sin(a) * 6), [255, 214, 92]);
    }
    return p;
  },
  'Belati Kembar'(f) {
    const p = new Px(40, 40);
    for (const s of [1, -1]) {
      const bx = s > 0 ? 7 : 33, ex = s > 0 ? 31 : 9;
      let prev = [bx, 33];
      for (let i = 1; i <= 10; i++) {
        const t = i / 10, x = bx + (ex - bx) * t + Math.sin(t * Math.PI) * 3 * s, y = 33 - 25 * t;
        p.thick(prev[0], prev[1], x, y, 3.6 - t * 2.2, R.violet, 0.15);
        prev = [x, y];
      }
      p.thick(bx + s * 2 - 3, 30, bx + s * 2 + 3, 36, 2.5, R.gold);
      p.thick(bx, 33, bx - s * 3, 37, 2.5, R.crimson);
    }
    pulseGem(p, 20, 21, 2, R.poison, f);
    finish(p, f, [[31, 7, 0], [9, 7, 4]]);
    for (const [x, y] of [[31, 9], [9, 9]]) { // poison drips
      const d = (f * 2) % 14;
      p.set(x, y + d, R.poison[3]); if (d > 1) p.set(x, y + d - 1, R.poison[2]);
    }
    return p;
  },
  'Helm Mitos'(f) {
    const p = new Px(40, 40);
    for (const s of [-1, 1]) {
      let prev = [20 + s * 9, 18];
      for (let i = 1; i <= 8; i++) {
        const t = i / 8, x = 20 + s * (9 + t * 9), y = 18 - t * 15 + t * t * 4;
        p.thick(prev[0], prev[1], x, y, 4.5 - t * 3, R.bone, s > 0 ? -0.1 : 0.1);
        prev = [x, y];
      }
    }
    p.blob(20, 23, 11.5, 11, R.blade, { clipBottom: 25 });
    p.box(9, 19, 23, 3, R.gold);
    for (const x of [13, 20, 27]) p.poly([[x - 2.5, 19], [x, 12 - (x === 20 ? 3 : 0)], [x + 2.5, 19]], R.gold);
    pulseGem(p, 20, 20, 2, R.crimson, f);
    p.box(12, 25, 17, 8, R.dark);
    const eye = [255, 60 + Math.round(60 * Math.sin((f / 8) * TAU)), 70];
    p.rect(15, 28, 3, 2, eye); p.rect(23, 28, 3, 2, eye);
    finish(p, f, [[20, 9, 0], [3, 5, 5]]);
    return p;
  },
  'Zirah Mitos'(f) {
    const p = new Px(40, 40);
    p.poly([[9, 12], [31, 12], [35, 38], [5, 38]], R.crimson, -0.2);            // cape
    p.poly([[10, 11], [30, 11], [33, 19], [29, 34], [11, 34], [7, 19]], R.blade);
    p.line(20, 13, 20, 33, R.gold[2]);
    p.line(11, 22, 29, 22, R.gold[1]);
    for (const s of [-1, 1]) {
      p.blob(20 + s * 12, 13, 5, 4, R.gold);
      for (let k = 0; k < 3; k++) p.line(20 + s * (11 + k * 2), 9, 20 + s * (12 + k * 2), 5 - (k === 1 ? 1 : 0), R.gold[3]);
    }
    pulseGem(p, 20, 20, 3, R.crimson, f);
    finish(p, f, [[20, 20, 0], [8, 9, 4]]);
    return p;
  },
  'Sepatu Mitos'(f) {
    const p = new Px(40, 40);
    p.poly([[14, 6], [25, 6], [25, 25], [33, 28], [35, 34], [13, 34]], R.dark);
    p.blob(31, 31, 4.5, 3.4, R.gold);
    p.box(13, 6, 13, 3, R.gold);
    const flap = f % 4 < 2 ? 0 : 1;
    p.poly([[14, 11], [3, 6 - flap], [7, 12], [2, 15 + flap], [8, 17], [14, 18]], R.bone, 0.1);
    pulseGem(p, 19, 15, 2, R.crimson, f);
    finish(p, f, [[3, 6, 0], [34, 33, 4]]);
    return p;
  },
  'Kalung Mitos'(f) {
    const p = new Px(40, 40);
    for (let i = 0; i <= 18; i++) {
      const t = i / 18;
      for (const s of [-1, 1]) p.set(20 + s * (14 - t * 12), 3 + t * 15 + Math.sin(t * Math.PI) * 2, i % 2 ? R.gold[3] : R.gold[1]);
    }
    p.blob(20, 26, 8, 9, R.gold);
    p.poly([[20, 17], [26, 26], [20, 34], [14, 26]], R.crimson.map((c) => c.map((v) => Math.min(255, v + Math.round(30 * Math.sin((f / 8) * TAU))))));
    p.set(17, 23, C.white); p.set(18, 22, C.white);
    for (const s of [-1, 0, 1]) pulseGem(p, 20 + s * 5, 37 - Math.abs(s), 1, R.ice, f + s);
    finish(p, f, [[20, 26, 0], [6, 4, 5]]);
    return p;
  },
  'Cincin Mitos'(f) {
    const p = new Px(40, 40);
    for (let a = 0; a < TAU; a += 0.04) {
      for (let k = 0; k < 3; k++) {
        const rr = 11 - k, xx = 20 + Math.cos(a) * rr, yy = 28 + Math.sin(a) * (6.5 - k * 0.6);
        p.set(xx, yy, R.gold[Math.sin(a) < 0 ? 3 - k : 1 + (k === 0 ? 1 : 0)]);
      }
    }
    p.poly([[14, 22], [26, 22], [23, 18], [17, 18]], R.gold);
    p.gem(20, 13, 6, R.crimson.map((c) => c.map((v) => Math.min(255, v + Math.round(30 * Math.sin((f / 8) * TAU))))));
    finish(p, f, [[20, 6, 0], [31, 13, 3], [9, 13, 6]]);
    return p;
  },
};

export const ITEM_VECTOR = {
  'Pedang Mitos': { slot: 'weapon', classId: 'warrior' },
  'Busur Mitos': { slot: 'weapon', classId: 'archer' },
  'Tongkat Mitos': { slot: 'weapon', classId: 'mage' },
  'Belati Kembar': { slot: 'weapon', classId: 'assassin' },
  'Helm Mitos': { slot: 'helm', classId: null },
  'Zirah Mitos': { slot: 'armor', classId: null },
  'Sepatu Mitos': { slot: 'boots', classId: null },
  'Kalung Mitos': { slot: 'amulet', classId: null },
  'Cincin Mitos': { slot: 'ring', classId: null },
};
