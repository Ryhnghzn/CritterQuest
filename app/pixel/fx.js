// Skill effects as designed pixel frames (all emissive ramps glow on their own).
// Each generator returns an array of PixelSprite frames; k > 1 renders them smooth (style A).
import { PixelSprite, ellipse, capsule, poly, rect, rng } from './sprite.js';

const TAU = Math.PI * 2;

// fireball flying right: hot core, licking outer flames, a short tail
export function fireball(k = 1) {
  return [0, 1, 2, 3].map((f) => {
    const s = new PixelSprite(22, 14, k), r = rng(11 + f);
    for (let i = 0; i < 5; i++) s.paint(ellipse(4 + i * 2 + r() * 2, 7 + (r() - 0.5) * 4, 2.2 - i * 0.2 + r(), 1.4 + r()), 'ember', { level: 1 + (i > 2 ? 1 : 0), edge: false });
    s.paint(ellipse(15, 7, 5.5, 4.8), 'ember', { level: 2, edge: false });
    for (let i = 0; i < 4; i++) { const a = r() * TAU; s.paint(ellipse(15 + Math.cos(a) * 4, 7 + Math.sin(a) * 3.6, 1.6, 1.4), 'ember', { level: 3, edge: false }); }
    s.paint(ellipse(15.6, 6.8, 3.6, 3.2), 'torch', { level: 3, edge: false });
    s.paint(ellipse(16.2, 6.4, 1.8, 1.6), 'torch', { level: 4, edge: false });
    return s;
  });
}

// explosion on the ground: flash → fire ball → broken ring → smoke puffs
export function explosion(k = 1) {
  const N = 8;
  return Array.from({ length: N }, (_, f) => {
    const s = new PixelSprite(72, 64, k), r = rng(31 + f), cx = 36, cy = 40, t = f / (N - 1);
    if (f === 0) { s.paint(ellipse(cx, cy, 9, 8), 'torch', { level: 4, edge: false }); return s; }
    if (f <= 3) {
      const R = 10 + f * 5;
      s.paint(ellipse(cx, cy - f * 2, R, R * 0.85), 'ember', { level: 2, edge: false });
      for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU + r(); s.paint(ellipse(cx + Math.cos(a) * R * 0.8, cy - f * 2 + Math.sin(a) * R * 0.7, 4 + r() * 3, 3 + r() * 2), 'ember', { level: 3, edge: false }); }
      s.paint(ellipse(cx, cy - f * 2.5, R * 0.6, R * 0.5), 'torch', { level: 3, edge: false });
      s.paint(ellipse(cx - 1, cy - f * 3, R * 0.3, R * 0.25), 'torch', { level: 4, edge: false });
    }
    // smoke takes over (not emissive: lit by the scene)
    const puffs = f <= 3 ? 0 : 10 - f;
    for (let i = 0; i < (f <= 2 ? 0 : puffs + 3); i++) {
      const a = r() * TAU, d = (10 + f * 3) * Math.sqrt(r()), py = cy - 6 - f * 3.5 + Math.sin(a) * d * 0.5;
      s.paint(ellipse(cx + Math.cos(a) * d, py, 5 + r() * 4 - t * 2, 4 + r() * 3 - t), 'stone', { bias: -1 });
    }
    if (f >= 3 && f <= 5) for (let i = 0; i < 12; i++) { const a = r() * TAU, d = 16 + f * 4; s.dot(Math.round(cx + Math.cos(a) * d), Math.round(cy - 4 + Math.sin(a) * d * 0.6), 'ember', 3); }
    return f > 3 ? s.outline() : s;
  });
}

export function arcaneBolt(k = 1) {
  return [0, 1].map((f) => {
    const s = new PixelSprite(16, 9, k);
    s.paint(capsule(1 + f, 4.5, 10, 4.5, 0.6, 1.8), 'arcane', { level: 2, edge: false });
    s.paint(ellipse(11.5, 4.5, 3.3, 3), 'arcane', { level: 3, edge: false });
    s.paint(ellipse(12, 4.2, 1.5, 1.3), 'arcane', { level: 4, edge: false });
    s.dot(4 + f * 3, f ? 2 : 6, 'arcane', 4);
    return s;
  });
}
export function arcaneHit(k = 1) {
  return [0, 1, 2, 3].map((f) => {
    const s = new PixelSprite(28, 28, k), c = 14, R = 3 + f * 3.2;
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + f * 0.3, L = i % 2 ? R * 0.6 : R; s.paint(capsule(c, c, c + Math.cos(a) * L, c + Math.sin(a) * L, 1.2 - f * 0.2, 0.3), 'arcane', { level: f < 2 ? 3 : 2, edge: false }); }
    if (f < 3) s.paint(ellipse(c, c, 3.5 - f, 3.5 - f), 'arcane', { level: 4, edge: false });
    return s;
  });
}

// frost nova ring flat on the ground. The texture is circle-in-ground-space: width w, height w·sin(pitch)
export function novaRing(sin, k = 1) {
  const w = 132, h = Math.round(w * sin), N = 7;
  return Array.from({ length: N }, (_, f) => {
    const s = new PixelSprite(w, h, k), R = 14 + f * 8.5, th = 6 - f * 0.6, cx = w / 2, cy = h / 2;
    s.paint({ x0: 0, y0: 0, x1: w, y1: h, f: (x, y) => {
      const dx = (x - cx) / R, dy = (y - cy) / (R * sin), d = Math.hypot(dx, dy) * R;
      if (d > R || d < R - th) return null;
      const a = Math.atan2(dy, dx), crack = Math.abs(Math.sin(a * 9 + f)) < 0.12;
      return crack ? -0.5 : 0.2 + ((d - (R - th)) / th) * 0.7;
    } }, 'frost', { edge: false });
    return s;
  });
}
// one ice shard: grows, holds, cracks, falls apart
export function iceShard(k = 1) {
  return [0.3, 0.65, 1, 1, 1, -1].map((g, f) => {
    const s = new PixelSprite(14, 22, k), r = rng(5 + f);
    if (g < 0) { for (let i = 0; i < 5; i++) s.paint(poly([[3 + i * 2, 21], [4 + i * 2 + r() * 2, 15 + r() * 3], [6 + i * 2, 21]]), 'frost', { level: 2 + (i % 2) }); return s.outline(); }
    const top = 21 - 19 * g;
    s.paint(poly([[3, 21], [5, top + 4], [7.5, top], [9.5, top + 6], [11, 21]], { cx: 5, cy: top + 6, rx: 5, ry: 10 }), 'frost', { rim: true });
    s.paint(poly([[7.5, top + 1], [9.2, top + 6.5], [10.5, 21], [8, 21]]), 'frost', { level: 1, edge: false });
    s.paint(capsule(6, top + 5, 5.5, 19, 0.5), 'frost', { level: 4, edge: false });
    if (f === 4) for (let i = 0; i < 3; i++) s.dot(6 + i, Math.round(top + 6 + i * 4), 'frost', 0);
    return s.outline();
  });
}

// lightning bolt from the top of the sprite to its bottom, with side forks. variants = different paths
export function lightning(variants = 3, k = 1) {
  const W = 40, H = 200;
  return Array.from({ length: variants }, (_, v) => {
    const s = new PixelSprite(W, H, k), r = rng(71 + v * 13);
    const path = [[W / 2 + (r() - 0.5) * 10, 0]];
    while (path[path.length - 1][1] < H - 2) { const [x, y] = path[path.length - 1]; path.push([Math.max(4, Math.min(W - 4, x + (r() - 0.5) * 12)), Math.min(H - 1, y + 8 + r() * 12)]); }
    path[path.length - 1][0] = W / 2;
    const seg = (a, b, w, l) => s.paint(capsule(...a, ...b, w), 'bolt', { level: l, edge: false });
    for (let i = 0; i < path.length - 1; i++) seg(path[i], path[i + 1], 2.4, 2);
    for (let i = 2; i < path.length - 2; i += 3) { // forks
      const [x, y] = path[i], d = r() < 0.5 ? -1 : 1, e = [x + d * (6 + r() * 8), y + 10 + r() * 10];
      seg([x, y], e, 1.2, 2); seg(e, [e[0] + d * 4, e[1] + 8], 0.8, 2);
    }
    for (let i = 0; i < path.length - 1; i++) seg(path[i], path[i + 1], 1, 4);
    return s;
  });
}
// scorch / frost mark flat on the ground
export function scorch(sin, ramp = 'stone', k = 1) {
  const w = 40, h = Math.round(w * sin), s = new PixelSprite(w, h, k), r = rng(3);
  s.paint({ x0: 0, y0: 0, x1: w, y1: h, f: (x, y) => {
    const dx = (x - w / 2) / (w / 2), dy = (y - h / 2) / (h / 2), a = Math.atan2(dy, dx), R = 0.75 + Math.sin(a * 5) * 0.12 + Math.sin(a * 13) * 0.06;
    const d = Math.hypot(dx, dy); return d > R ? null : d < R * 0.5 ? -0.6 : -0.1;
  } }, ramp, { edge: false });
  for (let i = 0; i < 6; i++) s.dot(Math.round(w / 2 + (r() - 0.5) * w * 0.7), Math.round(h / 2 + (r() - 0.5) * h * 0.6), 'ember', 2);
  return s;
}

// HUD icons (16×16) for the skill slots
export function icon(id, k = 1) {
  const s = new PixelSprite(16, 16, k);
  if (id === 'bolt') { s.paint(capsule(3, 12, 10, 5, 0.8, 1.6), 'arcane', { level: 2, edge: false }); s.paint(ellipse(11, 5, 3, 3), 'arcane', { level: 3, edge: false }); s.dot(11, 4, 'arcane', 4); }
  if (id === 'fire') { s.paint(poly([[8, 1], [13, 9], [12, 13], [8, 15], [4, 13], [3, 9]]), 'ember', { level: 2, edge: false }); s.paint(poly([[8, 5], [11, 10], [10, 13], [6, 13], [5, 10]]), 'torch', { level: 3, edge: false }); s.paint(ellipse(8, 11.5, 1.6, 1.8), 'torch', { level: 4, edge: false }); }
  if (id === 'frost') { for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; s.paint(capsule(8, 8, 8 + Math.cos(a) * 6.5, 8 + Math.sin(a) * 6.5, 0.9, 0.5), 'frost', { level: i % 2 ? 3 : 4, edge: false }); } s.paint(ellipse(8, 8, 2, 2), 'frost', { level: 4, edge: false }); }
  if (id === 'storm') { s.paint(poly([[10, 0], [4, 9], [8, 9], [5, 16], [12, 6], [8, 6]]), 'bolt', { level: 3, edge: false }); s.paint(poly([[9, 2], [6, 8], [8, 8]]), 'bolt', { level: 4, edge: false }); }
  if (id === 'sword') { s.paint(capsule(3, 13, 12, 4, 1, 0.5), 'metal', { rim: true }); s.paint(capsule(2, 10, 6, 14, 0.8), 'gold'); }
  return s.outline();
}

// ---- aim indicators (flat on the ground) -------------------------------------------------
// circle of radius r screen pixels; ring edge plus a checkered (pixel "glass") inner band
export function aimCircle(r, sin, ramp, k = 1, fill = true) {
  const w = Math.ceil(r * 2) + 2, h = Math.ceil(w * sin) + 2, s = new PixelSprite(w, h, k), cx = w / 2, cy = h / 2;
  s.paint({ x0: 0, y0: 0, x1: w, y1: h, f: (x, y) => {
    const d = Math.hypot((x - cx) / r, (y - cy) / (r * sin)) * r;
    if (d > r) return null;
    if (d > r - 1.6) return 0.95;
    if (!fill || d < r * 0.6) return null;
    return (Math.floor(x) + Math.floor(y)) % 2 === 0 ? 0.35 : null;
  } }, ramp, { edge: false });
  return s;
}
// arrow strip len × wid pixels pointing to +x: border, chevrons, checkered fill
export function aimLine(len, wid, ramp, k = 1) {
  const s = new PixelSprite(len, wid, k), cy = wid / 2;
  s.paint({ x0: 0, y0: 0, x1: len, y1: wid, f: (x, y) => {
    if (y < 1.2 || y > wid - 1.2) return 0.95;
    const head = len - x < wid * 0.9;
    if (head) return Math.abs(y - cy) < (len - x) * 0.6 ? 0.95 : null;
    if (Math.abs(((x % 12) - 6) + Math.abs(y - cy) * 0.9) < 1) return 0.8;
    return (Math.floor(x) + Math.floor(y)) % 2 === 0 ? 0.3 : null;
  } }, ramp, { edge: false });
  return s;
}
