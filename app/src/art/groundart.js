// Painted ground in the look prototype's style (app/pixel tiles.js, plan C2): grass in broad
// patches with tufts of blades (each with a shadow under it) and a few flowers, dirt with
// pebbles, cobbles with a lit bevel. Every pattern wraps (period P design pixels, 1 design
// pixel = 1 game unit), so one texture tiles a whole region or town. Pure: no DOM.

export const GROUND_P = 320;
// five-step ramps: [shadow, dark, base, light, highlight] (the prototype's palette)
export const GROUND_RAMPS = {
  grass: ['#121a15', '#1c281d', '#2b3a27', '#415234', '#5e6c45'],
  dirt: ['#19130f', '#2a2019', '#413126', '#5b4633', '#786046'],
  stone: ['#141519', '#23252b', '#373941', '#52545b', '#76767a'],
  flowerV: ['#1a1520', '#2f2638', '#4c3d5a', '#6f5c80', '#9584a6'],
  flowerY: ['#221b0e', '#3e3217', '#655025', '#8d7437', '#b49a55'],
  // plan C5: the other biomes
  snow: ['#3a4658', '#6a7a90', '#a4b4c8', '#d4e0ee', '#f4f8ff'],
  mud: ['#1a1a20', '#2c2b32', '#45434a', '#625f66', '#86828a'],
  sand: ['#2a1d12', '#4e3722', '#7a5a38', '#a3804f', '#c9a66e'],
  sandPath: ['#24170e', '#3e2a1a', '#5e4228', '#7e5b38', '#9c774c'],
  ash: ['#100c0c', '#1e1716', '#2e2422', '#45352f', '#5e4a40'],
  ember: ['#3a0e08', '#7a1e0e', '#c0401a', '#e8742a', '#ffb060'],
  void: ['#0a0612', '#160d24', '#241638', '#38224f', '#553370'],
  amethyst: ['#1c1030', '#3a1d5e', '#6a37a0', '#a06ad8', '#e6d2ff'],
  scrub: ['#18130f', '#2a2016', '#43321f', '#61482a', '#806339'],
};

function hash(x, y, s) { let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
const wrap = (a, n) => ((a % n) + n) % n;
// value noise on a lattice of `cell` pixels that wraps every P pixels
function noise(u, v, cell, s, P = GROUND_P) {
  const n = Math.round(P / cell), x = u / cell, y = v / cell, xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash(wrap(xi, n), wrap(yi, n), s), b = hash(wrap(xi + 1, n), wrap(yi, n), s), c = hash(wrap(xi, n), wrap(yi + 1, n), s), d = hash(wrap(xi + 1, n), wrap(yi + 1, n), s);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
// cells that wrap: hash of a cell index along a period of n cells
const cellHash = (cu, cv, nu, nv, s) => hash(wrap(cu, nu), wrap(cv, nv), s);
// the nearest two jittered cell centres (wrapping): distances, the nearest centre and its cell
function voronoi(u, v, cell, s) {
  const n = Math.round(GROUND_P / cell), cu = Math.floor(u / cell), cv = Math.floor(v / cell);
  let d1 = 1e9, d2 = 1e9, px = 0, pv = 0, a = 0, b = 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const ca = cu + i, cb = cv + j, x = (ca + 0.2 + cellHash(ca, cb, n, n, s) * 0.6) * cell, y = (cb + 0.2 + cellHash(ca, cb, n, n, s + 1) * 0.6) * cell, d = Math.hypot(u - x, v - y);
    if (d < d1) { d2 = d1; d1 = d; px = x; pv = y; a = ca; b = cb; } else if (d < d2) d2 = d;
  }
  return { d1, d2, px, pv, a, b, n };
}

// each pattern: (u, v) design pixels → [ramp, level 0..4]
export const GROUND = {
  grass(u, v, o = {}) {
    let l = 1.7 + (noise(u, v, 32, 1) - 0.5) * 1.3 + (noise(u, v, 10, 2) - 0.5) * 0.6;
    const nu = GROUND_P / 8, nv = GROUND_P / 8, cu = Math.floor(u / 8), cv = Math.floor(v / 8);
    if (cellHash(cu, cv, nu, nv, 4) < 0.42) { // a tuft: three blades, a shadow at their foot
      const bu = u - (cu * 8 + 2 + cellHash(cu, cv, nu, nv, 6) * 4), bv = v - (cv * 8 + 4 + cellHash(cu, cv, nu, nv, 5) * 2.5);
      if (bv > -3.5 && bv <= 0 && (Math.abs(bu - bv * 0.45) < 0.55 || Math.abs(bu + 0.2 + bv * 0.45) < 0.55 || Math.abs(bu - 0.1) < 0.55)) l = 3.3 - (bv + 3.5) * 0.25;
      else if (bv > 0 && bv < 1.4 && Math.abs(bu) < 1.8) l -= 0.9;
    }
    const flowers = o.flowers ?? 0.03;
    if (cellHash(cu, cv, nu, nv, 7) < flowers && Math.abs(u - cu * 8 - 4) < 1 && Math.abs(v - cv * 8 - 2.5) < 1) return [cellHash(cu, cv, nu, nv, 8) < 0.5 ? 'flowerV' : 'flowerY', 3.2];
    return ['grass', l];
  },
  dirt(u, v, o = {}) {
    const ramp = o.ramp || 'dirt';
    let l = 2 + (noise(u, v, 16, 5) - 0.5) * 1.1 + (noise(u, v, 4, 15) - 0.5) * 0.3;
    const nu = GROUND_P / 8, nv = GROUND_P / 5, cu = Math.floor(u / 8), cv = Math.floor(v / 5);
    if (cellHash(cu, cv, nu, nv, 9) < 0.3) { // a pebble, lit from the top left, its shadow below
      const px = cu * 8 + 1.5 + cellHash(cu, cv, nu, nv, 10) * 5, pv = cv * 5 + 1.5 + cellHash(cu, cv, nu, nv, 11) * 2, r = 1 + cellHash(cu, cv, nu, nv, 12) * 1.1;
      const dx = (u - px) / r, dy = (v - pv) / (r * 0.8);
      if (dx * dx + dy * dy < 1) return ['stone', dx + dy < -0.3 ? 3 : dx + dy > 0.6 ? 1.2 : 2.1];
      if (dx * dx + (dy - 0.9) * (dy - 0.9) < 0.7) l -= 1;
    }
    return [ramp, l];
  },
  // plan C5 ------------------------------------------------------------------------------
  snow(u, v) { // soft drifts, a crust that glints, now and then a patch of blue ice with a crack
    let l = 2.7 + (noise(u, v, 40, 31) - 0.5) * 1.1 + (noise(u, v, 8, 32) - 0.5) * 0.3;
    l -= Math.max(0, Math.sin((v + noise(u, v, 32, 33) * 40) * ((Math.PI * 2 * 6) / GROUND_P))) * 0.35; // drift shadows (6 per tile)
    const ice = noise(u, v, 64, 34);
    if (ice > 0.68) { // wind-polished ice: a little bluer and smoother, a hairline crack
      const crack = Math.abs(noise(u, v, 20, 35) - 0.5) < 0.012;
      return ['snow', crack ? 1.3 : 2.2 + Math.min(1, (ice - 0.68) * 8) * 0.25 + (noise(u, v, 8, 37) - 0.5) * 0.15];
    }
    const nu = GROUND_P / 5, cu = Math.floor(u / 5), cv = Math.floor(v / 5);
    if (cellHash(cu, cv, nu, nu, 36) < 0.05 && Math.abs(u - cu * 5 - 2.5) < 0.6 && Math.abs(v - cv * 5 - 2.5) < 0.6) return ['snow', 4.4];
    return ['snow', l];
  },
  sand(u, v) { // wind ripples over slow dunes, a few pebbles, tufts of dry scrub
    const w = Math.sin((v + noise(u, v, 64, 41) * 60) * ((Math.PI * 2 * 21) / GROUND_P)); // 21 ripples per tile: it wraps
    let l = 2.2 + w * 0.32 + (noise(u, v, 40, 42) - 0.5) * 0.9 + (noise(u, v, 5, 43) - 0.5) * 0.2;
    if (w > 0.85) l += 0.35; // the lit crest of a ripple
    const nu = GROUND_P / 10, cu = Math.floor(u / 10), cv = Math.floor(v / 10);
    const h = cellHash(cu, cv, nu, nu, 44), bu = u - (cu * 10 + 3 + cellHash(cu, cv, nu, nu, 45) * 4), bv = v - (cv * 10 + 6);
    if (h < 0.06) { // dry scrub: a few thin stalks, a shadow at the foot
      if (bv > -3 && bv <= 0 && (Math.abs(bu - bv * 0.6) < 0.4 || Math.abs(bu + bv * 0.5) < 0.4)) return ['scrub', 3 - (bv + 3) * 0.3];
      if (bv > 0 && bv < 1.2 && Math.abs(bu) < 1.6) l -= 0.8;
    } else if (h < 0.14 && bu * bu + bv * bv < 1.1) return ['sandPath', bu + bv < -0.3 ? 3 : 1.6];
    return ['sand', l];
  },
  ash(u, v) { // a crust of plates; embers glow in some of the cracks
    const { d1, d2, a, b, n } = voronoi(u, v, 32, 51);
    if (d2 - d1 < 1.6) return cellHash(a, b, n, n, 52) < 0.18 ? ['ember', 2.4 + (1.6 - (d2 - d1)) * 0.8] : ['ash', 0.4];
    let l = 1.9 + (cellHash(a, b, n, n, 53) - 0.5) * 0.6 + (noise(u, v, 10, 54) - 0.5) * 0.5;
    if (d2 - d1 < 3.2) l += 0.35; // the plate's raised rim
    return ['ash', l];
  },
  void(u, v) { // dark violet ground, faint glowing veins, star dust
    let l = 1.6 + (noise(u, v, 40, 61) - 0.5) * 1 + (noise(u, v, 8, 62) - 0.5) * 0.3;
    if (Math.abs(noise(u, v, 32, 63) - 0.5) < 0.01) return ['amethyst', 2.8];
    const nu = GROUND_P / 6, cu = Math.floor(u / 6), cv = Math.floor(v / 6);
    if (cellHash(cu, cv, nu, nu, 64) < 0.04 && Math.abs(u - cu * 6 - 3) < 0.55 && Math.abs(v - cv * 6 - 3) < 0.55) return ['amethyst', 4];
    return ['void', l];
  },
  cobble(u, v, o = {}) { // Voronoi stones, bevel toward the light, dark joints of dirt
    const cell = o.cell ?? 10, { d1, d2, px, pv, a, b, n } = voronoi(u, v, cell, 21);
    if (d2 - d1 < cell * 0.12) return [o.joint || 'dirt', 0.6];
    const lit = -((u - px) * 0.6 + (v - pv) * 0.8) / cell;
    return [o.ramp || 'stone', 2 + lit * 1.6 + (cellHash(a, b, n, n, 23) - 0.5) * 0.8];
  },
};

const RGB = {};
function rgbOf(ramp) {
  return RGB[ramp] || (RGB[ramp] = GROUND_RAMPS[ramp].map((h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }));
}
// smooth colour between ramp steps, times `tint` (a world-tuning brightness); `unmute`: the
// saturation the world's shader will apply (stage.js muted), undone here so the palette shows
// as the prototype painted it
function colour(ramp, level, tint, unmute) {
  const r = rgbOf(ramp), l = Math.max(0, Math.min(4, level)), i = Math.min(3, Math.floor(l)), f = l - i, a = r[i], b = r[i + 1];
  const c = [(a[0] + (b[0] - a[0]) * f) * tint, (a[1] + (b[1] - a[1]) * f) * tint, (a[2] + (b[2] - a[2]) * f) * tint];
  if (unmute < 1) { const y = c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114; for (let j = 0; j < 3; j++) c[j] = y + (c[j] - y) / unmute; }
  return c;
}

// → RGBA bytes (k texels per design pixel, size = P × k square, row 0 at v = 0), opaque
export function groundPixels(kind, k = 2, o = {}) {
  const f = GROUND[kind], N = Math.round(GROUND_P * k), out = new Uint8ClampedArray(N * N * 4), tint = o.tint ?? 1, unmute = o.unmute ?? 1;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const [ramp, l] = f((x + 0.5) / k, (y + 0.5) / k, o), c = colour(ramp, l, tint, unmute), i = (y * N + x) * 4;
    out[i] = c[0]; out[i + 1] = c[1]; out[i + 2] = c[2]; out[i + 3] = 255;
  }
  return { rgba: out, size: N };
}
