// Visual effects state (plan "Efek Lebay" §A): pooled particles, shock rings,
// ground cracks and screen flashes. Pure logic — render/fxkit.js draws it.
// Uses its own PRNG so effects never consume the simulation's (core/rng.js):
// adding sparkle must not change what spawns or drops.
import { QUALITY, CAPS, BURST, AUTO_LITE, RECOIL } from '../data/fx.js';

const TAU = Math.PI * 2;
const VFX_SEED = 7151;

function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fixed-size pool: live items are items[0..n); removing swaps the last live one in,
// so nothing is allocated after the pool is full once.
class Pool {
  constructor(cap, make) {
    this.items = [];
    this.n = 0;
    this.cap = cap;
    this.make = make;
  }
  get size() { return this.n; }
  // next free item, or null when the pool is at its cap (the effect is skipped)
  take() {
    if (this.n >= this.cap) return null;
    if (this.n === this.items.length) this.items.push(this.make());
    return this.items[this.n++];
  }
  kill(i) {
    const last = --this.n;
    const dead = this.items[i];
    this.items[i] = this.items[last];
    this.items[last] = dead;
  }
  setCap(cap) { this.cap = cap; if (this.n > cap) this.n = cap; }
  clear() { this.n = 0; }
}

const particle = () => ({ kind: 'dot', x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 1, color: '#fff', drag: 1, grav: 0, rot: 0, spin: 0, x2: 0, y2: 0 });

export class Vfx {
  constructor(quality = QUALITY.full) {
    this.rand = makeRng(VFX_SEED);
    this.mul = quality.mul;
    this.particles = new Pool(quality.cap, particle);
    this.rings = new Pool(CAPS.rings, () => ({ x: 0, y: 0, r0: 0, r1: 0, life: 0, max: 1, delay: 0, color: '#fff', width: 2 }));
    this.cracks = new Pool(CAPS.cracks, () => ({ x: 0, y: 0, rays: [], life: 0, max: 1, color: '#fff' }));
    this.flashes = new Pool(CAPS.flashes, () => ({ color: '#fff', alpha: 1, life: 0, max: 1 }));
    this.grayT = 0; // seconds the screen stays black and white (Kombo execute, spec §31.8)
    this.calm = false; // reduced motion (run.js copies run.calm): no whole-screen flashes at all
  }

  // cap: particle cap for this device (QUALITY[..].cap or .touchCap)
  setQuality(quality, cap = quality.cap) {
    this.mul = quality.mul;
    this.particles.setCap(cap);
  }

  clear() {
    this.particles.clear(); this.rings.clear(); this.cracks.clear(); this.flashes.clear();
    this.grayT = 0;
  }

  range(a, b) { return a + this.rand() * (b - a); }

  // One particle; null when the pool is full. color: a CSS colour or a palette (array).
  spawn(kind, x, y, vx, vy, life, size, color, drag = 1, grav = 0) {
    const p = this.particles.take();
    if (!p) return null;
    p.kind = kind; p.x = x; p.y = y; p.vx = vx; p.vy = vy;
    p.life = p.max = life; p.size = size; p.drag = drag; p.grav = grav;
    p.color = Array.isArray(color) ? color[(this.rand() * color.length) | 0] : color;
    p.rot = this.rand() * TAU; p.spin = this.range(-8, 8);
    return p;
  }

  // A spray of particles from a BURST preset (data/fx.js).
  // opts: n (count before the quality multiplier), angle + spread (a cone, radians), speed (multiplier)
  burst(preset, x, y, color, opts = {}) {
    const b = BURST[preset];
    const n = Math.round((opts.n ?? b.count) * this.mul);
    const spread = opts.spread ?? TAU, base = (opts.angle ?? 0) - spread / 2, sp = opts.speed ?? 1;
    for (let i = 0; i < n; i++) {
      const a = base + this.rand() * spread, v = this.range(b.speed[0], b.speed[1]) * sp;
      if (!this.spawn(b.kind, x, y, Math.cos(a) * v, Math.sin(a) * v, this.range(b.life[0], b.life[1]),
        this.range(b.size[0], b.size[1]), color, b.drag, b.gravity || 0)) return;
    }
  }

  // jagged lightning line between two points
  bolt(x1, y1, x2, y2, color = '#fff6b0', life = 0.32) {
    const p = this.spawn('bolt', x1, y1, 0, 0, life, 2, color);
    if (p) { p.x2 = x2; p.y2 = y2; }
  }

  // straight glowing line between two points (rune links, beam afterglow)
  beam(x1, y1, x2, y2, color = '#fff', life = 0.3, width = 3) {
    const p = this.spawn('beam', x1, y1, 0, 0, life, width, color);
    if (p) { p.x2 = x2; p.y2 = y2; p.spin = 0; }
  }

  // tapered cut mark of length `len` at angle `a` (slash lines, X cuts)
  cut(x, y, a, len, color = '#fff', life = 0.22) {
    const p = this.spawn('cut', x, y, 0, 0, life, len, color);
    if (p) { p.rot = a; p.spin = 0; }
  }

  // expanding shock ring; delay: seconds before it appears (stacked rings)
  ring(x, y, { r0 = 4, r1 = 60, life = 0.4, color = '#fff', width = 3, delay = 0 } = {}) {
    const r = this.rings.take();
    if (!r) return;
    r.x = x; r.y = y; r.r0 = r0; r.r1 = r1; r.life = r.max = life + delay; r.delay = delay; r.color = color; r.width = width;
  }

  // star of cracks in the ground; rays: [angle, length] pairs
  crack(x, y, { rays = 7, len = 50, life = 1.2, color = '#ffb04a' } = {}) {
    const c = this.cracks.take();
    if (!c) return;
    c.x = x; c.y = y; c.life = c.max = life; c.color = color;
    c.rays.length = 0;
    for (let i = 0; i < rays; i++) c.rays.push([(i / rays) * TAU + this.range(-0.3, 0.3), len * this.range(0.55, 1)]);
  }

  // whole-screen flash
  flash(color = '#fff', alpha = 0.5, life = 0.15) {
    if (this.calm) return;
    const f = this.flashes.take();
    if (!f) return;
    f.color = color; f.alpha = alpha; f.life = f.max = life;
  }

  // the whole screen in black and white for `life` seconds
  gray(life) { this.grayT = Math.max(this.grayT, life); }

  step(dt) {
    const k = dt * 60; // drag is given per 1/60 s
    if (this.grayT > 0) this.grayT = Math.max(0, this.grayT - dt);
    const P = this.particles;
    for (let i = P.n - 1; i >= 0; i--) {
      const p = P.items[i];
      if ((p.life -= dt) <= 0) { P.kill(i); continue; }
      p.vy += p.grav * dt;
      if (p.drag !== 1) { const d = p.drag ** k; p.vx *= d; p.vy *= d; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += p.spin * dt;
    }
    for (const pool of [this.rings, this.cracks, this.flashes]) {
      for (let i = pool.n - 1; i >= 0; i--) if ((pool.items[i].life -= dt) <= 0) pool.kill(i);
    }
  }
}

// Watches frame times; trips once when the average FPS stays below AUTO_LITE.fps
// for AUTO_LITE.seconds (averaged over half-second windows, so one hitch doesn't count).
export class FpsWatch {
  constructor({ fps, seconds } = AUTO_LITE) {
    this.fps = fps; this.seconds = seconds;
    this.reset();
  }
  reset() { this.frames = 0; this.t = 0; this.low = 0; this.tripped = false; this.last = 0; }
  // dt: seconds since the last frame. Returns true on the frame it trips.
  push(dt) {
    this.frames++; this.t += dt;
    if (this.t < 0.5) return false;
    this.last = this.frames / this.t;
    this.low = this.last < this.fps ? this.low + this.t : 0;
    this.frames = 0; this.t = 0;
    if (this.tripped || this.low < this.seconds) return false;
    this.tripped = true;
    return true;
  }
}

// Quality level in use: the setting, unless the FPS watch forced lite this session.
export function activeQuality(setting, forcedLite) {
  return forcedLite || setting === 'lite' ? 'lite' : 'full';
}

// An enemy jerked by a blow (plan "Rasa Pukulan" A): run.js sets e.recoilX/Y (direction),
// e.recoil (px) and e.recoilT (seconds left); this is where its picture is drawn instead.
// Snaps out at once, settles back. Returns one shared object (no garbage per enemy per frame).
const REC = { x: 0, y: 0, k: 0 };
export function recoilOf(e) {
  const k = e.recoilT > 0 ? Math.min(1, e.recoilT / RECOIL.time) : 0;
  const d = (e.recoil || 0) * k * k;
  REC.x = (e.recoilX || 0) * d; REC.y = (e.recoilY || 0) * d; REC.k = k;
  return REC;
}
