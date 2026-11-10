// PixelSprite — a grid of packed RGB colours (-1 = empty) plus an emissive mask.
// Shapes are continuous functions sampled at pixel centres, so one design can be
// rendered as hard pixel art (k = 1, quantised to the ramp) or finely (k > 1, smooth
// shading) for style A. Coordinates passed to shapes are always in design pixels.
import { RAMP, rampAt, INK_RGB, EMISSIVE_RAMPS } from './palette.js';

// key light from the top-left, a little in front
const L = (() => { const v = [-0.52, -0.62, 0.59], n = Math.hypot(...v); return v.map((c) => c / n); })();
export const LIGHT = L;
const T = [-0.2, 0.25, 0.66, 0.85];  // intensity → ramp level boundaries

export function level(I, smooth) {
  if (!smooth) { let l = 0; for (const t of T) if (I >= t) l++; return l; }
  // piecewise-linear through the boundary midpoints (0.5, 1.5, ...)
  if (I <= T[0]) return Math.max(0, 0.5 + (I - T[0]) / 0.45);
  for (let i = 0; i < 3; i++) if (I <= T[i + 1]) return i + 0.5 + (I - T[i]) / (T[i + 1] - T[i]);
  return Math.min(4, 3.5 + (I - T[3]) / 0.3);
}
const nI = (nx, ny) => { const d = nx * nx + ny * ny; return nx * L[0] + ny * L[1] + Math.sqrt(Math.max(0, 1 - d)) * L[2]; };

export class PixelSprite {
  constructor(w, h, k = 1) {
    this.k = k; this.w = Math.round(w * k); this.h = Math.round(h * k);
    this.px = new Int32Array(this.w * this.h).fill(-1);
    this.em = new Uint8Array(this.w * this.h);
  }
  get smooth() { return this.k > 1; }
  get(x, y) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? -1 : this.px[y * this.w + x]; }
  set(x, y, c, em = 0) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) { this.px[y * this.w + x] = c; this.em[y * this.w + x] = em; } }

  // shape: { x0, y0, x1, y1, f(x, y) → intensity | null }. o: { bias, edge, rim, level }
  paint(shape, ramp, o = {}) {
    const k = this.k, R = RAMP[ramp], em = EMISSIVE_RAMPS.has(ramp) ? 1 : 0;
    const x0 = Math.max(0, Math.floor(shape.x0 * k)), y0 = Math.max(0, Math.floor(shape.y0 * k));
    const x1 = Math.min(this.w - 1, Math.ceil(shape.x1 * k)), y1 = Math.min(this.h - 1, Math.ceil(shape.y1 * k));
    if (x1 < x0 || y1 < y0) return this;
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1, I = new Float32Array(bw * bh).fill(NaN);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const v = shape.f((x + 0.5) / k, (y + 0.5) / k);
      if (v != null) I[(y - y0) * bw + (x - x0)] = v;
    }
    const inside = (x, y) => x >= x0 && y >= y0 && x <= x1 && y <= y1 && !Number.isNaN(I[(y - y0) * bw + (x - x0)]);
    const e = Math.max(1, Math.round(k * 0.6)); // edge band width in pixels
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const v = I[(y - y0) * bw + (x - x0)];
      if (Number.isNaN(v)) continue;
      let l = o.level ?? level(v, this.smooth);
      l += o.bias || 0;
      if (o.edge !== false && (!inside(x + e, y) || !inside(x, y + e))) l -= this.smooth ? 0.7 : 1;
      else if (o.rim && (!inside(x - e, y) || !inside(x, y - e))) l += this.smooth ? 0.8 : 1;
      l = Math.max(0, Math.min(4, l));
      this.px[y * this.w + x] = this.smooth ? rampAt(ramp, l) : R[Math.round(l)];
      this.em[y * this.w + x] = em;
    }
    return this;
  }
  // flat single colour (eyes, buckles, outlines inside a shape)
  fill(shape, ramp, l) { return this.paint(shape, ramp, { level: l, edge: false }); }
  dot(x, y, ramp, l) { return this.fill(rect(x, y, 1, 1), ramp, l); }

  // outside outline; selective: a darker ramp step is not available here, so ink everywhere
  outline(c = INK_RGB) {
    const w = this.w, h = this.h, src = this.px.slice(), t = Math.max(1, Math.round(this.k * 0.55));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (src[y * w + x] !== -1) continue;
      let near = false;
      for (let d = 1; d <= t && !near; d++) {
        near = (x >= d && src[y * w + x - d] !== -1) || (x + d < w && src[y * w + x + d] !== -1)
          || (y >= d && src[(y - d) * w + x] !== -1) || (y + d < h && src[(y + d) * w + x] !== -1);
      }
      if (near) { this.px[y * w + x] = c; this.em[y * w + x] = 0; }
    }
    return this;
  }
  // every opaque pixel in one colour (hurt flash)
  flash(c) { const s = this.copy(); for (let i = 0; i < s.px.length; i++) if (s.px[i] !== -1 && s.px[i] !== INK_RGB) s.px[i] = c; return s; }
  copy() { const s = Object.create(PixelSprite.prototype); Object.assign(s, this, { px: this.px.slice(), em: this.em.slice() }); return s; }

  // RGBA bytes; emissiveOnly → glow mask (black elsewhere) for emissiveMap
  rgba(emissiveOnly = false) {
    const out = new Uint8ClampedArray(this.w * this.h * 4);
    for (let i = 0; i < this.px.length; i++) {
      const c = this.px[i];
      if (c === -1) continue;
      if (emissiveOnly && !this.em[i]) { out[i * 4 + 3] = 255; continue; }
      out[i * 4] = c >> 16; out[i * 4 + 1] = (c >> 8) & 255; out[i * 4 + 2] = c & 255; out[i * 4 + 3] = 255;
    }
    return out;
  }
  // paint into a 2D context at (dx, dy) (browser only)
  draw(g, dx = 0, dy = 0, emissiveOnly = false) {
    const id = new ImageData(this.rgba(emissiveOnly), this.w, this.h);
    g.putImageData(id, dx, dy);
  }
}

// ---- shapes (design-pixel coordinates) -----------------------------------------------
export const rect = (x, y, w, h, I = 0.5) => ({ x0: x, y0: y, x1: x + w, y1: y + h, f: (px, py) => (px >= x && px < x + w && py >= y && py < y + h ? I : null) });

export function ellipse(cx, cy, rx, ry) {
  return { x0: cx - rx - 1, y0: cy - ry - 1, x1: cx + rx + 1, y1: cy + ry + 1,
    f: (x, y) => { const nx = (x - cx) / rx, ny = (y - cy) / ry; return nx * nx + ny * ny > 1 ? null : nI(nx, ny); } };
}
// a rounded limb from a to b, radius r (ra at a, rb at b when tapered)
export function capsule(ax, ay, bx, by, ra, rb = ra) {
  const vx = bx - ax, vy = by - ay, ll = vx * vx + vy * vy || 1e-6, rm = Math.max(ra, rb);
  return { x0: Math.min(ax, bx) - rm - 1, y0: Math.min(ay, by) - rm - 1, x1: Math.max(ax, bx) + rm + 1, y1: Math.max(ay, by) + rm + 1,
    f: (x, y) => {
      const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / ll));
      const dx = x - (ax + vx * t), dy = y - (ay + vy * t), r = ra + (rb - ra) * t, d = Math.hypot(dx, dy);
      return d > r ? null : nI(dx / r, dy / r);
    } };
}
// filled polygon; shading as a soft dome around (cx, cy) with radii (rx, ry)
export function poly(pts, dome) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const d = dome || { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, rx: (x1 - x0) / 2 + 1, ry: (y1 - y0) / 2 + 1 };
  return { x0, y0, x1, y1, f: (x, y) => {
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    if (!c) return null;
    const nx = Math.max(-0.95, Math.min(0.95, (x - d.cx) / d.rx)), ny = Math.max(-0.95, Math.min(0.95, (y - d.cy) / d.ry)) * (d.flatY ?? 0.6);
    return nI(nx * 0.85, ny);
  } };
}
// keep only the part of a shape where keep(x, y) holds
export const clip = (s, keep) => ({ ...s, f: (x, y) => (keep(x, y) ? s.f(x, y) : null) });
// a shape with a fixed intensity (flat face)
export const flat = (s, I) => ({ ...s, f: (x, y) => (s.f(x, y) == null ? null : I) });

// deterministic RNG for variants (never Math.random: designs must be stable)
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; };
}
