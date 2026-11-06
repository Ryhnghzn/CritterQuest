// Illustrated props from the look prototype (app/pixel props.js, plan C3): trees, bushes,
// rocks, grass. Every prop is built from shaded lumps / limbs with a seeded RNG, so a seed
// gives a stable variant; k > 1 renders the same design finely (style A). render3d/billprops.js
// stands them up in the world. Pure: no DOM.
import { PixelSprite, ellipse, capsule, poly, clip, rect, rng } from './sprite.js';

// a broadleaf tree. size: 's' | 'm' | 'l'
export function oak(size, seed, k = 1, leaf = 'leaf') {
  const [w, h, R, lumps] = { s: [36, 46, 11, 7], m: [52, 66, 16, 11], l: [72, 92, 23, 16] }[size];
  const r = rng(seed), s = new PixelSprite(w, h, k), bx = w / 2, by = h - 3, cx = bx + (r() - 0.5) * 3, cy = R + 3;
  const tw = R * 0.16 + 1.2;
  // roots and trunk with two forks into the crown
  s.paint(capsule(bx - tw - 1.5, by + 0.5, bx - 0.5, by - 4, 1.2, 1.6), 'wood', { bias: -1 });
  s.paint(capsule(bx + tw + 1.8, by + 0.5, bx + 0.5, by - 4, 1.2, 1.6), 'wood');
  s.paint(capsule(bx, by, cx, cy + R * 0.4, tw + 0.8, tw - 0.3), 'wood');
  for (let i = 0; i < 2; i++) {
    const d = i ? 1 : -1;
    s.paint(capsule(cx, cy + R * 0.55, cx + d * R * 0.55, cy - R * 0.05, tw * 0.6, tw * 0.35), 'wood', { bias: -1 });
  }
  // bark lines
  for (let y = Math.round(cy + R * 0.7); y < by - 2; y += 3) s.dot(Math.round(bx - tw * 0.3 + ((y * 7) % 3) - 1), y, 'wood', 1);
  // crown: back lumps darker, front lumps lit; larger lumps first
  const L = [];
  for (let i = 0; i < lumps; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * R * 0.62;
    L.push([cx + Math.cos(a) * d * 1.15, cy + Math.sin(a) * d * 0.8, R * (0.34 + r() * 0.2)]);
  }
  L.sort((a, b) => a[1] - b[1]);
  for (const [x, y, rr] of L) s.paint(ellipse(x, y - 1, rr * 1.12, rr * 0.92), leaf, { bias: -1 });
  for (const [x, y, rr] of L) if (y > cy - R * 0.2) s.paint(ellipse(x + 0.6, y + 0.6, rr * 0.9, rr * 0.75), leaf);
  // a few leaf clusters breaking the silhouette
  for (let i = 0; i < lumps; i++) {
    const a = r() * Math.PI * 2;
    s.paint(ellipse(cx + Math.cos(a) * R * 0.98, cy + Math.sin(a) * R * 0.72, 2.2 + r() * 1.2, 1.8 + r()), leaf, { bias: a > Math.PI ? 0 : -1 });
  }
  return s.outline();
}

// a dark conifer with jagged tiers
export function pine(size, seed, k = 1, snowy = false) {
  const [w, h, tiers] = { m: [36, 70, 5], l: [48, 96, 6] }[size];
  const r = rng(seed), s = new PixelSprite(w, h, k), bx = w / 2, by = h - 3, top = 4, bot = by - 8;
  s.paint(capsule(bx, by, bx, bot - 6, 2.3, 1.6), 'wood');
  for (let i = 0; i < tiers; i++) {
    const t = (i + 1) / tiers, yTop = top + (bot - top) * (i / tiers) * 0.85, yBot = top + (bot - top) * t, hw = 3 + (w / 2 - 3) * t;
    const pts = [[bx, yTop]], n = 5 + i;
    for (let j = 0; j <= n; j++) { // drooping, jagged lower edge
      const u = j / n, x = bx + hw * (u * 2 - 1), dip = (j % 2 ? 2.2 : 0) + Math.sin(u * Math.PI) * 1.2 + r();
      pts.push([x, yBot - dip]);
    }
    s.paint(poly(pts.reverse(), { cx: bx - hw * 0.25, cy: (yTop + yBot) / 2, rx: hw * 1.1, ry: (yBot - yTop) * 0.8 }), 'leaf', { bias: i < 2 ? 0 : -0.0 });
    // highlight needles on the lit side; snowy: a crust along the top of the tier instead
    if (snowy) s.paint(clip(poly(pts, { cx: bx - hw * 0.25, cy: yTop, rx: hw, ry: (yBot - yTop) * 0.6 }), (x, y) => y < yTop + (yBot - yTop) * 0.42 + Math.abs(x - bx) * 0.35), 'snow', { edge: false, bias: 0.4 });
    else for (let j = 0; j < 2 + i; j++) s.dot(Math.round(bx - hw * (0.2 + r() * 0.5)), Math.round(yTop + (yBot - yTop) * (0.4 + r() * 0.4)), 'leaf', 3);
  }
  return s.outline();
}

// a bare, twisted tree (dark fantasy accent)
export function deadTree(seed, k = 1) {
  const r = rng(seed), s = new PixelSprite(48, 64, k);
  const branch = (x, y, a, len, rad, depth) => {
    const x2 = x + Math.sin(a) * len, y2 = y - Math.cos(a) * len;
    s.paint(capsule(x, y, x2, y2, rad, rad * 0.65), 'wood', { bias: depth > 1 ? -1 : 0 });
    if (depth < 3) for (const d of [-1, 1]) if (r() < 0.85) branch(x2, y2, a + d * (0.35 + r() * 0.45), len * (0.6 + r() * 0.15), rad * 0.62, depth + 1);
  };
  s.paint(capsule(17, 62, 24, 57, 1.2, 1.8), 'wood', { bias: -1 });
  s.paint(capsule(31, 62, 24, 57, 1.2, 1.8), 'wood');
  branch(24, 62, -0.08, 22, 3.2, 0);
  return s.outline();
}

export function bush(seed, k = 1, leaf = 'leaf', flowers = null) {
  const r = rng(seed), s = new PixelSprite(26, 16, k);
  const L = Array.from({ length: 5 }, (_, i) => [5 + i * 4 + r() * 2, 9 - Math.sin((i / 4) * Math.PI) * 3 + r(), 3.6 + r() * 1.6]);
  for (const [x, y, rr] of L) s.paint(ellipse(x, y, rr * 1.1, rr * 0.9), leaf, { bias: -1 });
  for (const [x, y, rr] of L) s.paint(ellipse(x + 0.5, y + 1, rr * 0.85, rr * 0.7), leaf);
  if (flowers) for (let i = 0; i < 4; i++) s.dot(Math.round(4 + r() * 18), Math.round(5 + r() * 6), flowers, 3 + (i % 2));
  return s.outline();
}

// faceted rock with a crack and a cap of moss
export function rock(size, seed, k = 1, cap = 'leaf') {
  const [w, h] = { s: [14, 10], m: [22, 15], l: [32, 22] }[size];
  const r = rng(seed), s = new PixelSprite(w, h, k), cx = w / 2, cy = h * 0.6, n = 7;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + r() * 0.4, rr = 0.82 + r() * 0.18;
    return [cx + Math.cos(a) * (w / 2 - 1.2) * rr, Math.min(h - 1.5, cy + Math.sin(a) * (h * 0.52) * rr)];
  });
  const body = poly(pts, { cx: cx - w * 0.12, cy: cy - h * 0.2, rx: w * 0.55, ry: h * 0.6, flatY: 1 });
  s.paint(body, 'stone');
  // flat top facet catches the moonlight
  s.paint(clip(body, (x, y) => y < cy - h * 0.18 + (x - cx) * 0.18), 'stone', { level: 3, edge: false });
  if (cap) s.paint(clip(body, (x, y) => y < cy - h * 0.3 + Math.sin(x * 1.3) * 0.8), cap, { level: cap === 'snow' ? 3 : 2, edge: false });
  let x = cx + w * 0.1, y = cy - h * 0.15;
  for (let i = 0; i < h * 0.4; i++) { s.dot(Math.round(x), Math.round(y), 'stone', 0); x += r() < 0.5 ? 1 : 0; y += 1; }
  return s.outline();
}

export function grassTuft(seed, k = 1, flower = null) {
  const r = rng(seed), s = new PixelSprite(11, 9, k);
  for (let i = 0; i < 5; i++) {
    const bx = 2 + i * 1.7 + r(), tilt = (r() - 0.5) * 3, hgt = 4 + r() * 3.5;
    s.paint(capsule(bx, 8, bx + tilt, 8 - hgt, 0.6, 0.35), 'grass', { level: i % 2 ? 3 : 2, edge: false });
  }
  if (flower) { s.fill(rect(3 + Math.round(r() * 4), 1 + Math.round(r() * 2), 2, 2), flower, 3); s.dot(8, 3, flower, 4); }
  return s.outline();
}

// 4 frames of a torch flame (emissive ramp)
export function flames(k = 1) {
  return [0, 1, 2, 3].map((f) => {
    const s = new PixelSprite(10, 16, k), sway = [0, 1, 0, -1][f], tall = [0, 1, 2, 1][f];
    const tip = [5 + sway * 1.2, 1.5 - tall * 0.3];
    s.paint(poly([tip, [8.5, 9], [8, 13], [5, 15], [2, 13], [1.5, 9]]), 'ember', { level: 2, edge: false });
    s.paint(poly([[5 + sway, 4 + (2 - tall) * 0.5], [7.2, 10], [6.5, 13.5], [3.5, 13.5], [2.8, 10]]), 'torch', { level: 3, edge: false });
    s.paint(ellipse(5, 11.5, 1.6, 2.2), 'torch', { level: 4, edge: false });
    return s;
  });
}

// a dark foreground branch with leaves for framing the screen corners
export function frameBranch(seed, k = 1) {
  const r = rng(seed), s = new PixelSprite(120, 70, k);
  s.paint(capsule(0, 6, 118, 22, 4.5, 1.2), 'wood', { level: 0, edge: false });
  for (let i = 0; i < 26; i++) {
    const t = r(), x = t * 112, y = 6 + t * 16 + (r() - 0.3) * 18;
    s.paint(ellipse(x, y, 4 + r() * 4, 2.5 + r() * 2.5), 'leaf', { level: r() < 0.25 ? 1 : 0, edge: false });
  }
  return s;
}
