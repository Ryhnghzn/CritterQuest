// TileGenerator: surface textures sampled from pattern functions. A pattern gets (u, v) in
// screen pixels of style B (so a brick is N pixels tall on screen) and returns
// [ramp, level] or [ramp, level, emissive]. B samples once per pixel and quantises with a
// light ordered dither; A samples k times finer with smooth shading.
import { RAMP, rampAt } from './palette.js';

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);

function hash(x, y, s = 0) { let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
export const h2 = hash;
export function noise(x, y, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

// → { w, h, rgba, em } row 0 at the bottom (ready for a THREE.DataTexture)
export function sample(uMax, vMax, k, fn) {
  const w = Math.max(1, Math.round(uMax * k)), h = Math.max(1, Math.round(vMax * k)), smooth = k > 1;
  const rgba = new Uint8Array(w * h * 4), em = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = (x + 0.5) / k, v = (y + 0.5) / k, [ramp, l, e] = fn(u, v);
    let c;
    if (smooth) c = rampAt(ramp, l);
    else c = RAMP[ramp][Math.max(0, Math.min(4, Math.round(l + BAYER[(y & 3) * 4 + (x & 3)] * 0.38)))];
    const i = (y * w + x) * 4; // row 0 = v 0 = bottom (DataTexture, flipY false)
    rgba[i] = c >> 16; rgba[i + 1] = (c >> 8) & 255; rgba[i + 2] = c & 255; rgba[i + 3] = 255;
    if (e) { em[i] = rgba[i]; em[i + 1] = rgba[i + 1]; em[i + 2] = rgba[i + 2]; }
    em[i + 3] = 255;
  }
  return { w, h, rgba, em };
}

// ---- ground: grass, a dirt road with ruts and pebbles, a cobbled door step -----------------
const segDist = (px, pz, [ax, az], [bx, bz]) => {
  const vx = bx - ax, vz = bz - az, t = Math.max(0, Math.min(1, ((px - ax) * vx + (pz - az) * vz) / (vx * vx + vz * vz)));
  return [Math.hypot(px - ax - vx * t, pz - az - vz * t), t];
};
export function groundPattern(L, du, dv) {
  // L: { x0, z0, roads: [[pts], halfWidth], step: [x0, z0, x1, z1], shade: [[x, z, r]] }
  return (u, v) => {
    const x = L.x0 + u / du, z = L.z0 + v / dv;
    let d = 9, hw = 1;
    for (const [pts, w] of L.roads) for (let i = 0; i < pts.length - 1; i++) { const [dd] = segDist(x, z, pts[i], pts[i + 1]); if (dd - w < d - hw) { d = dd; hw = w; } }
    let ao = 0;
    for (const [sx, sz, r] of L.shade) {
      const dx = x - sx, dz = (z - sz) * 1.4;
      if (dx > r || dx < -r || dz > r || dz < -r) continue;
      const q = Math.sqrt(dx * dx + dz * dz) / r; if (q < 1) ao = Math.max(ao, 1 - q);
    }
    const [s0, sz0, s1, sz1] = L.step;
    if (x > s0 && x < s1 && z > sz0 && z < sz1) return cobble(u, v);
    const edge = hw + (noise(u * 0.25, v * 0.25, 3) - 0.5) * 0.5;
    if (d < edge) {
      // dirt: ruts along the road, pebbles, a darker rim
      let l = 2 + (noise(u * 0.08, v * 0.08, 5) - 0.5) * 1.1;
      if (Math.abs(Math.abs(d) - hw * 0.45) < 0.09) l -= 0.8;
      if (d > edge - 0.12) l -= 0.7;
      const cu = Math.floor(u / 6), cv = Math.floor(v / 5);
      if (hash(cu, cv, 9) < 0.28) {
        const px = cu * 6 + 1 + hash(cu, cv, 10) * 4, pv = cv * 5 + 1 + hash(cu, cv, 11) * 3, r = 0.9 + hash(cu, cv, 12) * 0.9;
        const dx = (u - px) / r, dy = (v - pv) / (r * 0.8);
        if (dx * dx + dy * dy < 1) return ['stone', dx + dy < -0.3 ? 3 : dx + dy > 0.6 ? 1 : 2];
        if (dx * dx + (dy - 0.9) * (dy - 0.9) < 0.7) l -= 1; // pebble shadow
      }
      return ['dirt', l - ao * 1.2];
    }
    // grass: broad patches, tufts of blades with a shadow under them
    let l = 1.7 + (noise(u * 0.035, v * 0.035, 1) - 0.5) * 1.3 + (noise(u * 0.11, v * 0.11, 2) - 0.5) * 0.6;
    const cu = Math.floor(u / 7), cv = Math.floor(v / 6);
    if (hash(cu, cv, 4) < 0.42) {
      const bu = u - (cu * 7 + 2 + hash(cu, cv, 6) * 3), bv = v - (cv * 6 + 4);
      if (bv > -3 && bv <= 0 && (Math.abs(bu - bv * 0.45) < 0.5 || Math.abs(bu + 0.2 + bv * 0.45) < 0.5 || Math.abs(bu - 0.1) < 0.5)) l = 3.2 - (bv + 3) * 0.25;
      else if (bv > 0 && bv < 1.2 && Math.abs(bu) < 1.6) l -= 0.9;
    }
    if (hash(cu, cv, 7) < 0.03 && Math.abs(u - cu * 7 - 3) < 0.9 && Math.abs(v - cv * 6 - 2) < 0.9) return [hash(cu, cv, 8) < 0.5 ? 'flowerV' : 'flowerY', 3];
    return ['grass', l - ao * 1.4];
  };
}

// cobbles: Voronoi stones with a bevel toward the light and dark mortar
export function cobble(u, v, cell = 6) {
  const cu = Math.floor(u / cell), cv = Math.floor(v / cell);
  let d1 = 1e9, d2 = 1e9, best = null;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const a = cu + i, b = cv + j, px = (a + 0.2 + hash(a, b, 21) * 0.6) * cell, pv = (b + 0.2 + hash(a, b, 22) * 0.6) * cell, d = Math.hypot(u - px, v - pv);
    if (d < d1) { d2 = d1; d1 = d; best = [px, pv, a, b]; } else if (d < d2) d2 = d;
  }
  if (d2 - d1 < 1.1) return ['dirt', 0.6];
  const [px, pv, a, b] = best, lit = -((u - px) * 0.6 + (v - pv) * 0.8) / cell;
  return ['stone', 2 + lit * 1.6 + (hash(a, b, 23) - 0.5) * 0.8];
}

// ---- building faces ---------------------------------------------------------------------
// stone blocks in staggered rows
export function blocks(u, v, bh = 5, bw = 9) {
  const row = Math.floor(v / bh), off = (row % 2) * (bw / 2), col = Math.floor((u + off) / bw);
  const lu = u + off - col * bw, lv = v - row * bh;
  if (lv < 1 || lu < 1) return ['stone', 0.4];
  let l = 2 + (hash(col, row, 31) - 0.5) * 0.9;
  if (lv > bh - 1.5) l += 0.9; else if (lv < 2) l -= 0.6; // top lit (rows go bottom-up)
  if (lu > bw - 1.5) l -= 0.6;
  if (hash(col, row, 32) < 0.15 && Math.abs(lu - bw * 0.5 - (lv - bh / 2) * 0.6) < 0.5) l = 0.6; // crack
  return ['stone', l];
}

// half-timbered wall with a door and windows. o: { w, h (pixels), door: [u0, u1, v1], windows: [[u0, u1, v0, v1]], glow }
export function timberWall(o) {
  const posts = [];
  for (let u = 0; u <= o.w; u += o.w / Math.max(2, Math.round(o.w / 34))) posts.push(u);
  return (u, v) => {
    if (v < o.base) return blocks(u, v);
    // door: planks with iron straps and a ring
    const [d0, d1, dv] = o.door || [-9, -9, 0];
    if (u > d0 - 2 && u < d1 + 2 && v < dv + 2) {
      if (u < d0 || u > d1 || v > dv) return ['wood', 3.2 - (u > d1 ? 1.2 : 0)];
      const pl = Math.floor((u - d0) / 4);
      let l = 1.8 + (hash(pl, 0, 41) - 0.5) * 0.6 - ((u - d0) % 4 < 1 ? 1 : 0);
      if (Math.abs(v - o.base - (dv - o.base) * 0.25) < 1 || Math.abs(v - o.base - (dv - o.base) * 0.75) < 1) return ['metal', 1.6];
      if (Math.hypot(u - d1 + 3, v - o.base - (dv - o.base) * 0.5) < 1.2) return ['gold', 2.5];
      return ['wood', l];
    }
    for (const [w0, w1, v0, v1] of o.windows || []) {
      if (u > w0 - 2 && u < w1 + 2 && v > v0 - 2 && v < v1 + 2) {
        if (v < v0) return ['wood', 3.3]; // sill
        if (u < w0 || u > w1 || v > v1) return ['wood', 1.4];
        if (Math.abs(u - (w0 + w1) / 2) < 0.6 || Math.abs(v - (v0 + v1) / 2) < 0.6) return ['wood', 1];
        const lit = o.glow ? 2.6 + (v < (v0 + v1) / 2 ? 0.8 : 0) : 0.6;
        return o.glow ? ['torch', lit, 1] : ['blue', lit];
      }
    }
    // beams: top, bottom, posts, braces
    const beam = (v > o.h - 3) || (v < o.base + 2.5) || posts.some((p) => Math.abs(u - p) < 1.6);
    let brace = false;
    for (let i = 0; i < posts.length - 1; i++) {
      if (i % 2 || u < posts[i] || u > posts[i + 1]) continue;
      const t = (u - posts[i]) / (posts[i + 1] - posts[i]);
      if (Math.abs((v - o.base - 2.5) / (o.h - 5.5 - o.base) - t) < 1.6 / (o.h - o.base)) brace = true;
    }
    if (beam || brace) return ['wood', 1.7 + (hash(Math.floor(u / 3), Math.floor(v / 3), 42) - 0.5) * 0.6];
    let l = 2.1 + (noise(u * 0.07, v * 0.07, 43) - 0.5) * 1.0;
    if (v < o.base + 8) l -= (o.base + 8 - v) * 0.12; // splash dirt
    if (v > o.h - 6) l -= 0.6; // eave shadow
    return ['plaster', l];
  };
}

// roof shingles, rows going up the slope; moss in patches
export function shingles(rowH = 4, sw = 5) {
  return (u, v) => {
    const row = Math.floor(v / rowH), lu = u + (row % 2) * sw * 0.5, col = Math.floor(lu / sw), lv = v - row * rowH;
    let l = 2.1 + (hash(col, row, 51) - 0.5) * 0.8;
    if (lv < 1) l = 0.5;           // shadow under the row above (rows bottom-up)
    else if (lv > rowH - 1.2) l += 0.9;
    if (lu - col * sw < 0.8) l -= 0.8;
    if (noise(u * 0.06, v * 0.09, 52) > 0.66) return ['leaf', l - 0.2];
    return ['roof', l];
  };
}

export function planks(u, v, pw = 4) {
  const p = Math.floor(u / pw), lu = u - p * pw;
  let l = 2 + (hash(p, 0, 61) - 0.5) * 0.7 + (noise(u * 0.5, v * 0.06, 62) - 0.5) * 0.6;
  if (lu < 0.8) l = 0.7;
  return ['wood', l];
}
