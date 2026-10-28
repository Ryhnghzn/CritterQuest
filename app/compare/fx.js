// Style test only: over-the-top pixel skill effects and a Mitos aura.
// Each effect adds "heat" into an intensity field; the field is painted through
// a colour palette with ordered dithering, which gives crisp pixel fire / ice.
import { floorTile, warrior, MITOS_THEME } from './pixel.js';

const TAU = Math.PI * 2;
const B4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]].map((r) => r.map((v) => v / 16 - 0.47));
export const PAL = {
  gold: [[60, 30, 12], [150, 76, 22], [230, 150, 40], [255, 212, 90], [255, 246, 200], [255, 255, 255]],
  ice: [[16, 26, 70], [34, 80, 170], [60, 156, 236], [140, 222, 255], [222, 250, 255], [255, 255, 255]],
  rose: [[60, 14, 40], [150, 40, 90], [235, 90, 135], [255, 168, 190], [255, 232, 236], [255, 255, 255]],
  fire: [[60, 8, 6], [150, 26, 12], [232, 82, 22], [255, 160, 40], [255, 230, 120], [255, 255, 240]],
  smoke: [[26, 22, 34], [44, 40, 56], [70, 64, 84]],
  mitos: [[70, 6, 24], [170, 20, 60], [255, 77, 109], [255, 160, 180], [255, 235, 240], [255, 255, 255]],
  violet: [[40, 20, 80], [110, 70, 220], [190, 160, 255], [240, 230, 255], [255, 255, 255]],
};
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const ease = (p) => 1 - (1 - p) ** 3;

class Field {
  constructor(w, h) { this.w = w; this.h = h; this.v = new Float32Array(w * h); }
  clear() { this.v.fill(0); }
  add(x, y, a) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.v[y * this.w + x] += a; }
  disc(cx, cy, r, a) { for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) { const d = Math.hypot(x - cx, y - cy); if (d <= r) this.add(x, y, a * (1 - d / (r + 1))); } }
  // per-pixel polar painter: fn(r, theta, x, y) → intensity
  polar(cx, cy, R, fn) {
    for (let y = Math.max(0, Math.floor(cy - R)); y < Math.min(this.h, cy + R); y++) for (let x = Math.max(0, Math.floor(cx - R)); x < Math.min(this.w, cx + R); x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, r = Math.hypot(dx, dy);
      if (r <= R) this.v[y * this.w + x] += fn(r, Math.atan2(dy, dx), x, y);
    }
  }
  paint(data, pal, minQ = 0.4) {
    const n = pal.length - 1;
    for (let i = 0; i < this.v.length; i++) {
      const v = this.v[i];
      if (v <= 0.02) continue;
      const x = i % this.w, y = (i / this.w) | 0;
      const q = v * n + B4[y & 3][x & 3] * 0.9;
      if (q < minQ) continue;
      const c = pal[Math.max(0, Math.min(n, Math.floor(q)))];
      data[i * 4] = c[0]; data[i * 4 + 1] = c[1]; data[i * 4 + 2] = c[2]; data[i * 4 + 3] = 255;
    }
  }
}

// dark dungeon floor behind an effect
function floorImage(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  for (let y = 0; y < h; y += 16) for (let x = 0; x < w; x += 16) g.drawImage(floorTile(x * 3 + y * 7 + 1).canvas(), x, y);
  g.fillStyle = 'rgba(8,6,20,.55)'; g.fillRect(0, 0, w, h);
  return c;
}

// effect: { w, h, period, draw(field, u, t, extra) } → { canvas (low-res), frame(t) }
function makeFx(w, h, layers, under) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  const bg = floorImage(w, h);
  const fields = layers.map(() => new Field(w, h));
  return {
    canvas: c,
    frame(t) {
      g.clearRect(0, 0, w, h);
      g.drawImage(bg, 0, 0);
      under?.(g, t);
      const img = g.getImageData(0, 0, w, h);
      layers.forEach((L, i) => { fields[i].clear(); L.fill(fields[i], t); fields[i].paint(img.data, L.pal, L.minQ); });
      g.putImageData(img, 0, 0);
    },
  };
}

// ——— Putaran Pedang: three blazing blades + flung sparks, warrior spinning in the middle ———
export function spinFx() {
  const W = 128, H = 96, cx = 64, cy = 52, P = 1.5;
  const act = (t) => (t % P) < 1.15;
  return makeFx(W, H, [
    { pal: PAL.gold, fill(f, t) {
      const u = t % P;
      if (u > 1.15) return;
      const fade = Math.min(1, u * 6) * Math.min(1, (1.15 - u) * 5);
      const a0 = u * 15;
      f.polar(cx, cy, 46, (r, th) => {
        let v = 0;
        for (let i = 0; i < 3; i++) {
          let d = (a0 + i * 2.094 - th) % TAU; if (d < 0) d += TAU;
          if (d > 1.7) continue;
          const tr = (1 - d / 1.7) ** 1.7;
          const prof = Math.max(0, 1 - Math.abs(r - 30) / 13);
          v += tr * prof * 1.9 + (d < 0.14 && r > 18 && r < 42 ? 1.3 : 0);
        }
        if (Math.abs(r - 44) < 1 && Math.floor((th + u * 3) * 6) % 2) v += 0.55;
        return v * fade;
      });
      for (let i = 0; i < 34; i++) {
        const age = u - (i / 34) * 1.05;
        if (age < 0 || age > 0.4) continue;
        const ang = a0 - age * 15 + i * 1.3 + 0.6, rad = 34 + age * 95;
        for (let k = 0; k < 3; k++) f.add(cx + Math.cos(ang) * (rad - k * 3), cy + Math.sin(ang) * (rad - k * 3) * 0.8 + age * age * 60, (1.8 - k * 0.5) * (1 - age / 0.4));
      }
    } },
  ], (g, t) => {
    const u = t % P;
    const spr = warrior(act(t) ? { bob: 0, sword: u * 15, legF: 1 } : { bob: Math.floor(t * 3) % 2 }).canvas();
    g.drawImage(spr, cx - 26, cy - 30);
  });
}

// ——— Nova Es: flash, crystal ring bursting outward, frost left on the floor ———
export function novaFx() {
  const W = 128, H = 96, cx = 64, cy = 50, P = 1.7;
  return makeFx(W, H, [
    { pal: PAL.ice, fill(f, t) {
      const u = t % P, p = Math.min(1, u / 0.6), R = 6 + 48 * ease(p), life = u < 1.3 ? 1 : Math.max(0, 1 - (u - 1.3) / 0.4);
      f.polar(cx, cy, 64, (r, th, x, y) => {
        let v = 0;
        if (u < 0.75) v += Math.max(0, 1 - Math.abs(r - R) / 3.2) * 2 * (1 - p * 0.35);
        const k = Math.round((th / TAU) * 16);
        const ka = (k / 16) * TAU + Math.sin(k * 7.1) * 0.08, dth = Math.abs(((th - ka + Math.PI * 3) % TAU) - Math.PI);
        const len = 13 * (1 - p * 0.6) + 3;
        if (u < 0.8 && r > R - 2 && r < R + len && dth * r < (1 - (r - R + 2) / (len + 2)) * 3.2) v += 1.6;
        if (r < R && u < 1.1 && hash(x, y) > 0.9) v += 0.75 * (1 - u / 1.1); // sparse frost glints
        return v;
      });
      if (u < 0.14) f.disc(cx, cy, 6 + u * 100, 2.4 * (1 - u / 0.14));
      for (let i = 0; i < 22; i++) {
        const a = i * 0.9 + Math.sin(i) * 0.3, d = R + 4 + (u * 70 * (0.6 + hash(i, 3) * 0.6));
        if (u < 0.9) f.add(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.85, 1.6 * (1 - u / 0.9));
      }
    } },
  ]);
}

// ——— Hujan Panah: rotating target rune, arrows streaking down, impact sparks ———
export function rainFx() {
  const W = 128, H = 96, cx = 64, cy = 60, R = 34;
  return makeFx(W, H, [
    { pal: PAL.rose, fill(f, t) {
      f.polar(cx, cy, R + 3, (r, th, x, y) => {
        let v = 0;
        if (Math.abs(r - R) < 1.2 && Math.floor((th - t * 1.4) * 8) % 3 !== 0) v += 0.75;
        if (Math.abs(r - R * 0.62) < 0.9 && Math.floor((th + t * 2) * 5) % 2) v += 0.55;
        if (r < R && hash(x, y) > 0.86) v += 0.25;
        return v;
      });
      for (let i = 0; i < 18; i++) {
        const ph = (t * 1.7 + i * 0.137) % 1;
        const tx = cx + Math.sin(i * 12.99) * R * 0.8, ty = cy + Math.cos(i * 78.23) * R * 0.55;
        if (ph < 0.9) {
          const y = ty - (1 - ph / 0.9) * 72;
          for (let k = 0; k < 14; k++) f.add(tx, y - k, (1 - k / 14) * 1.25);
          f.add(tx, y + 1, 2); f.add(tx - 1, y, 1.6); f.add(tx + 1, y, 1.6);
        } else {
          const e = (ph - 0.9) / 0.1;
          for (let s = 0; s < 6; s++) { const a = s * 1.05 + i; f.add(tx + Math.cos(a) * e * 7, ty + Math.sin(a) * e * 4, 1.8 * (1 - e)); }
          f.add(tx, ty, 2.2 * (1 - e));
        }
      }
    } },
  ]);
}

// ——— Bola Api: flaming comet, then a big boom with debris and smoke ———
export function fireFx() {
  const W = 128, H = 96, P = 2, ex = 86, ey = 52;
  return makeFx(W, H, [
    { pal: PAL.smoke, minQ: 0.6, fill(f, t) {
      const u = t % P;
      if (u < 0.75) return;
      const e = (u - 0.75) / 1.25;
      for (let i = 0; i < 9; i++) { const a = i * 0.7; f.disc(ex + Math.cos(a) * (8 + e * 18), ey - 4 - e * 22 + Math.sin(a) * 6, 5 + e * 7, 1.5 * (1 - e)); }
    } },
    { pal: PAL.fire, fill(f, t) {
      const u = t % P;
      if (u < 0.75) {
        const x = 10 + (u / 0.75) * (ex - 10), y = ey;
        f.disc(x, y, 9, 1.0); f.disc(x, y, 5, 2.3);
        for (let k = 1; k < 30; k++) {
          const back = k * 2.2, jx = (hash(k, Math.floor(t * 20)) - 0.5) * k * 0.35;
          const yy = y + Math.sin(k * 1.7 + t * 30) * k * 0.18 + jx;
          f.disc(x - back, yy, 3.2 * (1 - k / 30) + 0.6, (1 - k / 30) * 1.5);
        }
        return;
      }
      const e = (u - 0.75) / 1.25;
      f.polar(ex, ey, 60, (r, th, x, y) => {
        const core = (4 + 22 * ease(Math.min(1, e * 4))) * (1 - e * 0.45);
        let v = r < core ? 2.5 * (1 - e) ** 2.4 * (1 - (r / core) * 0.6) : 0;
        const ring = 6 + 54 * ease(e);
        v += Math.max(0, 1 - Math.abs(r - ring) / 1.6) * 1.4 * (1 - e);
        return v * (0.6 + 0.8 * hash(Math.floor(x / 2) + Math.floor(t * 18), Math.floor(y / 2)));
      });
      for (let i = 0; i < 28; i++) {
        const a = i * 2.39996, s = 40 + hash(i, 9) * 50;
        f.add(ex + Math.cos(a) * s * e, ey + Math.sin(a) * s * e * 0.8 + e * e * 40, 1.9 * (1 - e));
      }
    } },
  ]);
}

// ——— Mitos aura: rune circle, flame wings, rising crimson motes, sparks, crackling arcs ———
export function auraFx() {
  const W = 72, H = 72, fx = 36, fy = 62;
  const sprite = [0, 1].map((b) => warrior({ bob: b }, MITOS_THEME).canvas());
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });
  const back = new Field(W, H), front = new Field(W, H), runes = new Field(W, H), arcs = new Field(W, H);
  return {
    canvas: c,
    frame(t) {
      g.clearRect(0, 0, W, H);
      g.fillStyle = '#0b0912'; g.fillRect(0, 0, W, H);
      // flame wings behind the body: seven feathers per side, licking at the tips
      back.clear();
      for (const side of [-1, 1]) {
        const flap = Math.sin(t * 3) * 0.1;
        for (let k = 0; k < 7; k++) {
          const ang = -0.15 - k * 0.2 + flap, len = 30 - Math.abs(k - 2) * 3;
          const ox = fx + side * 3, oy = fy - 30;
          for (let d = 0; d < len; d++) {
            const lick = d > len - 7 ? Math.sin(t * 16 + k * 2 + d) * 1.2 : 0;
            const x = ox + side * Math.cos(ang) * d, y = oy + Math.sin(ang) * d * 0.95 + lick;
            const heat = 1.5 * (1 - d / len) + 0.35;
            back.add(x, y, heat); back.add(x, y + 1, heat * 0.75); back.add(x - side, y, heat * 0.5);
          }
        }
      }
      // rune circle on the ground
      runes.clear();
      for (let a = 0; a < TAU; a += 0.03) {
        const r1 = 24, k = Math.floor((a + t * 0.6) * 5) % 4;
        runes.add(fx + Math.cos(a) * r1, fy + Math.sin(a) * r1 * 0.38, 0.9);
        if (k === 0) runes.add(fx + Math.cos(a) * (r1 - 3), fy + Math.sin(a) * (r1 - 3) * 0.38, 1.3);
        if (Math.floor((a - t * 0.9) * 7) % 2) runes.add(fx + Math.cos(a) * 29, fy + Math.sin(a) * 29 * 0.38, 0.6);
      }
      for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + t * 0.4; for (let k = 0; k < 5; k++) runes.add(fx + Math.cos(a) * (31 + k), fy + Math.sin(a) * (31 + k) * 0.38, 1.0 - k * 0.15); }
      const img = g.getImageData(0, 0, W, H);
      back.paint(img.data, PAL.fire, 0.55);
      runes.paint(img.data, PAL.gold);
      g.putImageData(img, 0, 0);
      g.drawImage(sprite[Math.floor(t * 3) % 2], fx - 26, fy - 38);
      // motes, sparks and arcs in front
      front.clear(); arcs.clear();
      for (let i = 0; i < 16; i++) {
        const ph = (t * 0.55 + i / 16) % 1;
        const x = fx + Math.sin(i * 7.3 + t * 1.3) * 16, y = fy - 4 - ph * 52;
        front.add(x, y, 1.9 * (1 - ph)); front.add(x, y + 1, 1.0 * (1 - ph));
      }
      if (Math.floor(t * 7) % 3 === 0) {
        let x = fx - 14, y = fy - 40;
        for (let k = 0; k < 14; k++) { x += 2; y += (hash(k, Math.floor(t * 7)) - 0.5) * 6; arcs.add(x, y, 1.6); arcs.add(x, y + 1, 0.8); }
      }
      const img2 = g.getImageData(0, 0, W, H);
      front.paint(img2.data, PAL.mitos, 0.5);
      arcs.paint(img2.data, PAL.violet, 0.5);
      g.putImageData(img2, 0, 0);
      // twinkles
      for (let i = 0; i < 5; i++) {
        const ph = (t * 0.9 + i * 0.37) % 1;
        if (ph > 0.5) continue;
        const sx = Math.round(fx + Math.sin(i * 5.1) * 26), sy = Math.round(fy - 20 - Math.cos(i * 3.7) * 22), s = ph < 0.25 ? 2 : 1;
        g.fillStyle = '#fff';
        g.fillRect(sx - s, sy, s * 2 + 1, 1); g.fillRect(sx, sy - s, 1, s * 2 + 1);
      }
    },
  };
}
