// Material detail maps for Tampilan Matang (spec §36, plan A2): tileable grey patterns where
// 128 = "as painted", darker = joints, grain, shadow under a shingle row, lighter = a worn
// edge catching the light. They multiply a material's own colour (stage.js detailed()), so
// every building keeps its colours from the data and only gains a surface. Pure: no DOM.

export const DETAIL_SIZE = 128;
// metres per tile repeat (the shader samples by world position)
export const DETAIL_SCALE = { plaster: 3.2, stone: 2.4, wood: 1.6, roof: 1.8, log: 1.6, thatch: 1.4, rock: 2.2, soil: 5, sand: 6, snow: 5, ash: 4.5, slab: 4 };

function hash(x, y, s) { let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
// value noise that repeats every px cells across and py cells up (so the tile wraps)
function pnoise(x, y, px, s, py = px) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const wx = (a) => ((a % px) + px) % px, wy = (a) => ((a % py) + py) % py;
  const a = hash(wx(xi), wy(yi), s), b = hash(wx(xi + 1), wy(yi), s), c = hash(wx(xi), wy(yi + 1), s), d = hash(wx(xi + 1), wy(yi + 1), s);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
// fractal noise over the tile: u, v in 0..1
function fbm(u, v, s, base = 4) {
  let t = 0, amp = 0.5, norm = 0;
  for (let o = 0, p = base; o < 4; o++, p *= 2, amp *= 0.5) { t += amp * pnoise(u * p, v * p, p, s + o); norm += amp; }
  return t / norm;
}

// each pattern: (u, v) in 0..1 (v up the wall) → multiplier around 1
const PATTERNS = {
  plaster(u, v) {
    let k = 1 + (fbm(u, v, 11, 3) - 0.5) * 0.34 + (pnoise(u * 32, v * 32, 32, 12) - 0.5) * 0.08;
    const crack = Math.abs(fbm(u, v, 13, 2) - 0.5);
    if (crack < 0.006) k *= 0.8;
    return k;
  },
  stone(u, v) {
    const rows = 6, row = Math.floor(v * rows), lv = v * rows - row, off = (row % 2) * 0.5;
    const cols = 3 + (row % 3 === 1 ? 1 : 0), cu = ((u + off / cols) % 1) * cols, col = Math.floor(cu), lu = cu - col;
    if (lv < 0.07 || lu < 0.035) return 0.58; // mortar
    let k = 0.94 + hash(col, row, 21) * 0.14 + (fbm(u, v, 22, 4) - 0.5) * 0.18;
    if (lv > 0.86) k += 0.1; else if (lv < 0.2) k -= 0.08; // lit top edge, shaded foot
    if (lu > 0.95) k -= 0.08;
    return k;
  },
  wood(u, v) {
    const n = 6, p = Math.floor(u * n), lu = u * n - p;
    if (lu < 0.05) return 0.55; // gap between planks
    const grain = Math.sin((lu * 9 + fbm(u, v, 31 + p, 2) * 6) * Math.PI) * 0.06;
    let k = 0.92 + hash(p, 0, 32) * 0.14 + grain + (pnoise(u * 8, v * 64, 8, 33, 64) - 0.5) * 0.08;
    const knot = Math.hypot((lu - 0.5) * 2, ((v * 3 + hash(p, 1, 34)) % 1 - 0.5) * 6);
    if (hash(p, 2, 35) < 0.4 && knot < 0.22) k *= 0.75;
    return k;
  },
  roof(u, v) { // shingle rows run along u (v up the slope); each row's lower edge overhangs the next
    const rows = 6, row = Math.floor(v * rows), lv = v * rows - row, sw = 1 / 6, off = (row % 2) * sw * 0.5, lu = (((u + off) % 1) % sw) / sw, cell = Math.floor(((u + off) % 1) / sw);
    let k = 0.9 + hash(cell, row, 41) * 0.18 + (fbm(u, v, 42, 4) - 0.5) * 0.1 - lv * 0.12;
    if (lv < 0.1) k += 0.14;                  // the exposed lower edge catches the light
    if (lv > 0.7) k *= 1 - (lv - 0.7) * 1.4;  // shadow under the overhang of the row above
    if (lu < 0.05) k *= 0.7;
    return k;
  },
  log(u, v) { // horizontal logs: round shading per log, bark ripples
    const n = 5, row = Math.floor(v * n), lv = v * n - row;
    let k = 0.7 + Math.sin(lv * Math.PI) * 0.42 + (pnoise(u * 16, v * 48, 16, 51 + row, 48) - 0.5) * 0.14;
    if (lv < 0.05 || lv > 0.95) k = 0.5;
    return k;
  },
  thatch(u, v) { // straw strands hanging down in layers
    const layer = Math.floor(v * 4), lv = v * 4 - layer;
    let k = 0.86 + (pnoise(u * 64, v * 8, 64, 61 + layer, 8) - 0.5) * 0.5 + lv * 0.18;
    if (lv < 0.12) k *= 0.7;
    return k;
  },
  // natural rock: broad mottling, a few dark cracks, lichen-like speckles (no blocks)
  rock(u, v) {
    let k = 1 + (fbm(u, v, 71, 3) - 0.5) * 0.42 + (pnoise(u * 24, v * 24, 24, 72) - 0.5) * 0.12;
    if (Math.abs(fbm(u, v, 73, 2) - 0.5) < 0.012) k *= 0.62;
    if (pnoise(u * 40, v * 40, 40, 74) > 0.86) k *= 1.12;
    return k;
  },
  // ground (horizontal, under the painted tile): soil clods and pebbles that read on grass and road alike
  soil(u, v) {
    let k = 1 + (fbm(u, v, 81, 4) - 0.5) * 0.3;
    const c = pnoise(u * 48, v * 48, 48, 82);
    if (c > 0.82) k *= 1.14; else if (c < 0.14) k *= 0.8;          // pebbles catch light, dents hold shade
    if (Math.abs(fbm(u, v, 83, 3) - 0.5) < 0.008) k *= 0.85;        // hairline ruts
    return k;
  },
  sand(u, v) { // wind ripples along u with a soft drift
    const w = Math.sin((v * 22 + fbm(u, v, 91, 2) * 3) * Math.PI * 2);
    return 1 + w * 0.08 + (fbm(u, v, 92, 4) - 0.5) * 0.22 + (pnoise(u * 64, v * 64, 64, 93) - 0.5) * 0.06;
  },
  snow(u, v) { // soft drifts and a fine crust
    return 1 + (fbm(u, v, 101, 3) - 0.5) * 0.22 + (pnoise(u * 64, v * 64, 64, 102) - 0.5) * 0.1;
  },
  // big worn flagstones (Voronoi on a wrapping 4 × 4 grid): faint joints, each stone its own tone
  slab(u, v) {
    const n = 4, x = u * n, y = v * n, cx = Math.floor(x), cy = Math.floor(y);
    let d1 = 9, d2 = 9, id = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const gx = cx + i, gy = cy + j, wx = ((gx % n) + n) % n, wy = ((gy % n) + n) % n;
      const d = Math.hypot(x - (gx + 0.2 + hash(wx, wy, 121) * 0.6), y - (gy + 0.2 + hash(wx, wy, 122) * 0.6));
      if (d < d1) { d2 = d1; d1 = d; id = wy * n + wx; } else if (d < d2) d2 = d;
    }
    if (d2 - d1 < 0.05) return 0.68;
    return 0.93 + hash(id, 0, 123) * 0.14 + (fbm(u, v, 124, 4) - 0.5) * 0.16 + (d2 - d1 < 0.12 ? 0.06 : 0);
  },
  ash(u, v) { // cracked crust: dark seams between plates
    let k = 1 + (fbm(u, v, 111, 4) - 0.5) * 0.28;
    const seam = Math.min(Math.abs(fbm(u, v, 112, 3) - 0.5), Math.abs(fbm(u, v, 113, 4) - 0.5));
    if (seam < 0.01) k *= 0.6;
    return k;
  },
};
export const DETAIL_KINDS = Object.keys(PATTERNS);

// → Uint8Array (size × size, one byte per texel, 128 = ×1), row 0 at v = 0
export function detailPixels(kind, size = DETAIL_SIZE) {
  const f = PATTERNS[kind], out = new Uint8Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const k = f((x + 0.5) / size, (y + 0.5) / size);
    out[y * size + x] = Math.max(0, Math.min(255, Math.round(k * 128)));
  }
  return out;
}
