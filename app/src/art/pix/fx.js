// Spell frames from the look prototype (app/pixel, style A): each generator returns an array of
// PixelSprite frames drawn from continuous shapes; k > 1 samples them finely (smooth shading).
// render3d/spell3d.js turns them into textures on upright billboards or flat ground decals.
// Pure: no DOM, no Math.random (designs are seeded and the same every time).
import { PixelSprite, ellipse, capsule, poly, rect, rng, clip } from './sprite.js';

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
export function novaRing(sin, k = 1, ramp = 'frost') {
  const w = 132, h = Math.round(w * sin), N = 7;
  return Array.from({ length: N }, (_, f) => {
    const s = new PixelSprite(w, h, k), R = 14 + f * 8.5, th = 6 - f * 0.6, cx = w / 2, cy = h / 2;
    s.paint({ x0: 0, y0: 0, x1: w, y1: h, f: (x, y) => {
      const dx = (x - cx) / R, dy = (y - cy) / (R * sin), d = Math.hypot(dx, dy) * R;
      if (d > R || d < R - th) return null;
      const a = Math.atan2(dy, dx), crack = Math.abs(Math.sin(a * 9 + f)) < 0.12;
      return crack ? -0.5 : 0.2 + ((d - (R - th)) / th) * 0.7;
    } }, ramp, { edge: false });
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

// ---- plan B4: Warrior -----------------------------------------------------------------------
// a sword swoosh: a crescent that sweeps from the top to the right (pointing +x), then fades
export function slash(k = 1) {
  const W = 48, H = 50, cx = 14, cy = 25, R = 22, th = 9;
  return [0.45, 0.8, 1, 1, 0.7].map((reach, f) => {
    const s = new PixelSprite(W, H, k), fade = f >= 3 ? (f - 2) * 0.35 : 0;
    s.paint({ x0: 0, y0: 0, x1: W, y1: H, f: (x, y) => {
      const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx); // a: -π/2 (top) … π/2 (bottom)
      const t = (a + Math.PI / 2) / Math.PI; // 0 top … 1 bottom
      if (t < 0 || t > reach) return null;
      const w = th * Math.sin(Math.PI * Math.min(1, t / reach)) ** 0.7; // thick in the middle, thin at the ends
      if (d > R || d < R - w) return null;
      return 0.3 + ((d - (R - w)) / Math.max(0.5, w)) * 0.75 - fade; // bright outer edge
    } }, 'smear', { edge: false });
    return s;
  });
}
// a whirl of blades seen from above (laid flat at waist height): a ring of light, three bright streaks running round
export function whirl(k = 1) {
  const W = 92, H = 92, cx = W / 2, cy = H / 2, rx = 40, ry = 40;
  return [0, 1, 2, 3].map((f) => {
    const s = new PixelSprite(W, H, k);
    s.paint({ x0: 0, y0: 0, x1: W, y1: H, f: (x, y) => {
      const nx = (x - cx) / rx, ny = (y - cy) / ry, d = Math.hypot(nx, ny);
      if (d > 1 || d < 0.72) return null;
      const a = Math.atan2(ny, nx), streak = ((a / (Math.PI * 2) + f / 12) * 3 % 1 + 1) % 1;
      const back = 0;
      return streak < 0.35 ? 0.85 + back : 0.2 + back - streak * 0.2;
    } }, 'smear', { edge: false });
    return s;
  });
}
// a pillar of rock bursting out of a burning crack: grows, holds, crumbles
export function pillar(k = 1) {
  return [0.35, 0.75, 1, 1, 1, -1].map((g, f) => {
    const s = new PixelSprite(34, 58, k), r = rng(41 + f), by = 56;
    s.paint(ellipse(17, by - 1, 15, 3.2), 'ember', { level: f < 4 ? 3 : 2, edge: false }); // the glowing crack
    if (g < 0) { for (let i = 0; i < 6; i++) s.paint(poly([[5 + i * 4, by], [6 + i * 4 + r() * 3, by - 6 - r() * 5], [9 + i * 4, by]]), 'stone', { bias: -0.5 }); return s.outline(); }
    for (const [x, hw, tall, tilt] of [[17, 6, 50, 0], [9, 4, 30, -4], [26, 4.5, 34, 4]]) {
      const top = by - tall * g, body = poly([[x - hw, by], [x - hw * 0.6 + tilt * 0.3, top + 6], [x + tilt, top], [x + hw * 0.6 + tilt * 0.3, top + 5], [x + hw, by]], { cx: x - hw * 0.4, cy: top + tall * 0.3, rx: hw * 1.5, ry: tall * 0.6 });
      s.paint(body, 'stone', { rim: true });
      s.paint(clip(body, (px, py) => py > by - 4 - (3 + Math.sin(px * 1.4 + f) * 2.5) * g), 'ember', { level: 2.5, edge: false }); // flames licking at the foot
      s.paint(capsule(x + tilt * 0.4, top + 4, x, by - 4, 0.45), 'ember', { level: 3, edge: false }); // a burning seam
    }
    return s.outline();
  });
}
// a puff of dust kicked up by a dash: swells and thins away (unlit, lit by the scene)
export function dust(k = 1) {
  return [0, 1, 2, 3, 4].map((f) => {
    const s = new PixelSprite(30, 22, k), r = rng(61 + f), t = f / 4;
    for (let i = 0; i < 6 - f; i++) s.paint(ellipse(15 + (r() - 0.5) * 12 * (0.5 + t), 15 - t * 5 + (r() - 0.5) * 4, 4 + t * 4 + r() * 2, 3 + t * 3 + r()), 'smear', { bias: -1.2 - t * 0.8 });
    return s;
  });
}
// the boomerang axe, four turns of its spin
export function axe(k = 1) {
  return [0, 1, 2, 3].map((f) => {
    const s = new PixelSprite(30, 30, k), a = (f / 4) * Math.PI * 2, c = 15, ca = Math.cos(a), sa = Math.sin(a);
    const P = (x, y) => [c + x * ca - y * sa, c + x * sa + y * ca];
    s.paint(capsule(...P(-11, 0), ...P(6, 0), 1.3), 'wood');
    s.paint(poly([P(3, -1.5), P(9, -9), P(13, -3), P(13, 3), P(9, 9), P(3, 1.5)]), 'metal', { rim: true });
    s.paint(capsule(...P(12.2, -3), ...P(12.2, 3), 0.5), 'metal', { level: 4, edge: false });
    return s.outline();
  });
}
