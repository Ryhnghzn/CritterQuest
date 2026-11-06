// Spell effects that stand in the 2.5D world (spec §36, plan B: the look prototype's style A).
// The simulation stays as it is: this only watches game.hits and adds upright animated
// billboards (fireballs, explosions, falling meteors), flat burnt patches, a few pooled lights
// and 3D sparks with gravity. The flat ground layer (rings, cracks, glows) keeps drawing on the
// decal (actors.js). Sparks use Math.random: they are purely visual and never touch the sim.
import * as THREE from 'three';
import * as FX from '../art/spell/fx.js';
import { RAMPS } from '../art/spell/palette.js';
import { SPELL3D as C } from '../data/spell3d.js';
import { S } from './stage.js';

const MAX_FX = 72;

// ---- frames → textures (built once, on first use) -------------------------------------------
function flipRows(a, w, h) { const o = new Uint8Array(a.length); for (let y = 0; y < h; y++) o.set(a.subarray(y * w * 4, (y + 1) * w * 4), (h - 1 - y) * w * 4); return o; }
function tex(sp) {
  const t = new THREE.DataTexture(flipRows(sp.rgba(), sp.w, sp.h), sp.w, sp.h);
  t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true; t.needsUpdate = true;
  return { map: t, w: sp.w / sp.k, h: sp.h / sp.k };
}
const FRAMES = {};
const MAKE = {
  fire: () => FX.fireball(C.detail),
  boom: () => FX.explosion(C.detail),
  scorch: () => [FX.scorch(1, 'stone', C.detail)],
};
const frames = (id) => FRAMES[id] || (FRAMES[id] = MAKE[id]().map(tex));

// plane geometry with its anchor (fraction of width from the left, of height from the top) at 0
const GEO = new Map();
function anchored(ax, ay) {
  const key = `${ax}:${ay}`;
  let g = GEO.get(key);
  if (!g) { g = new THREE.PlaneGeometry(1, 1); g.translate(0.5 - ax, ay - 0.5, 0); GEO.set(key, g); }
  return g;
}
const FLAT = (() => { const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2); return g; })();

let glowTex = null;
function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  return (glowTex = new THREE.CanvasTexture(c));
}
const hexes = (ramp, steps) => steps.map((i) => new THREE.Color(RAMPS[ramp][i]));
const FIRE_SPARKS = [...hexes('ember', [3, 4]), ...hexes('torch', [3, 4])];

export class Spell3D {
  constructor(scene) {
    this.scene = scene; this.list = []; this.proj = new Map(); this.falls = new Map(); this.seen = new WeakSet(); this.lastT = null;
    // sparks: position, velocity, life, colour
    const N = C.maxSparks;
    this.pPos = new Float32Array(N * 3).fill(-99); this.pVel = new Float32Array(N * 3); this.pLife = new Float32Array(N); this.pMax = new Float32Array(N);
    this.pBase = new Float32Array(N * 3); this.pCol = new Float32Array(N * 3); this.pGrav = new Float32Array(N); this.pNext = 0;
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(this.pPos, 3)); pg.setAttribute('color', new THREE.BufferAttribute(this.pCol, 3));
    this.points = new THREE.Points(pg, new THREE.PointsMaterial({ size: C.sparkSize, map: glowTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.points.frustumCulled = false; this.points.renderOrder = 4; scene.add(this.points);
    this.lights = Array.from({ length: C.lights }, () => {
      const l = new THREE.PointLight(0xffffff, 0, 6, 1.6); scene.add(l);
      return { l, t: 0, life: 0, peak: 0, follow: null };
    });
    for (const id in MAKE) frames(id); // ~60 ms once, while the scene loads, not at the first cast
  }

  // ---- building blocks -----------------------------------------------------------------
  // o: { flat, ax, ay, m (metres per design px), fps, loop, life, delay, glow, opacity, fade, roll, h }
  add(id, x, y, o = {}) {
    if (this.list.length >= MAX_FX) return null;
    const fr = frames(id);
    const mat = new THREE.MeshBasicMaterial({ map: fr[0].map, transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: o.opacity ?? 1, alphaTest: o.flat ? 0 : 0.4 });
    if (o.glow) mat.color.setScalar(o.glow);
    if (o.flat) { mat.polygonOffset = true; mat.polygonOffsetFactor = -2; }
    const mesh = new THREE.Mesh(o.flat ? FLAT : anchored(o.ax ?? 0.5, o.ay ?? 0.5), mat);
    mesh.renderOrder = o.flat ? 1 : 3; mesh.visible = false;
    const m = o.m ?? 1 / C.ppm;
    if (o.flat) mesh.scale.set(fr[0].w * m, 1, fr[0].h * m); else mesh.scale.set(fr[0].w * m, fr[0].h * m, 1);
    this.scene.add(mesh);
    const e = { mesh, fr, x, y, h: o.h ?? 0, t: 0, fps: o.fps || 14, loop: !!o.loop, delay: o.delay || 0, fade: o.fade, opacity: o.opacity ?? 1, flat: !!o.flat, roll: o.roll || 0 };
    e.life = o.life ?? fr.length / e.fps;
    this.list.push(e);
    return e;
  }
  light(color, peak, life, dist, x, h, y, follow = null) {
    const L = this.lights.find((o) => o.t >= o.life && !o.follow) || this.lights.reduce((a, b) => (a.t / (a.life || 1) > b.t / (b.life || 1) ? a : b));
    Object.assign(L, { t: 0, life, peak, follow });
    L.l.color.set(color); L.l.distance = dist; L.l.position.set(x * S, h * S, y * S);
    return L;
  }
  spark(x, h, y, vx, vy, vz, life, col, grav = 0) {
    const i = this.pNext; this.pNext = (i + 1) % C.maxSparks;
    this.pPos[i * 3] = x; this.pPos[i * 3 + 1] = h; this.pPos[i * 3 + 2] = y;
    this.pVel[i * 3] = vx; this.pVel[i * 3 + 1] = vy; this.pVel[i * 3 + 2] = vz;
    this.pBase[i * 3] = col.r; this.pBase[i * 3 + 1] = col.g; this.pBase[i * 3 + 2] = col.b;
    this.pLife[i] = this.pMax[i] = life; this.pGrav[i] = grav;
  }
  // n sparks thrown out from a point (metres), a little upward
  burst(x, h, y, n, speed, cols, life, grav = 0, up = 0) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random() * 0.6);
      this.spark(x, h, y, Math.cos(a) * v, up + Math.random() * speed * 0.6, Math.sin(a) * v, life * (0.6 + Math.random() * 0.6), cols[i % cols.length], grav);
    }
  }

  // ---- the spells ------------------------------------------------------------------------
  boom(x, y, r, mul) {
    const B = C.boom, m = (r * B.fill * S) / 25; // the widest fire frame has a radius of 25 design px
    this.add('boom', x, y, { ax: 0.5, ay: 52 / 64, m, fps: B.fps, glow: B.glow });
    const sc = frames('scorch')[0];
    this.add('scorch', x, y, { flat: true, m: (r * C.scorch.fill * S) / sc.w, life: C.scorch.life, fade: C.scorch.fade, opacity: C.scorch.opacity });
    this.light(B.light.color, B.light.peak * Math.min(2, r / 40), B.light.life, Math.max(5, r * S * B.light.dist), x, 30, y);
    this.burst(x * S, 0.5, y * S, Math.round(B.sparks * mul * Math.min(2.5, r / 36)), B.sparkSpeed * Math.min(2, Math.sqrt(r / 36)), FIRE_SPARKS, 0.9, 7, 1.5);
  }
  // a falling meteor `size` metres long; o.life (fixed fall) or o.fall (Hujan Meteor's own clock)
  meteor(x, y, size, o) {
    const e = this.add('fire', x, y, { ax: 0.75, ay: 0.5, m: size / frames('fire')[0].w, fps: 16, loop: true, life: o.life ?? 1e9, glow: C.fireball.glow });
    if (e) { if (o.fall) e.fall = o.fall; else e.meteor = true; }
    return e;
  }
  // a fireball dropping out of the sky toward (x, y): q = 1 just started … 0 landed
  placeMeteor(e, x, y, q, yaw) {
    const M = C.meteor, back = M.drift * q, h = M.height * q;
    // it comes from the far left, high: drift goes against the camera's right vector
    const rx = Math.cos(yaw), rz = -Math.sin(yaw);
    e.mesh.position.set(x * S - rx * back, h + 0.3, y * S - rz * back);
    e.roll = -Math.atan2(M.height, M.drift); // pointing down along the fall
  }

  // ---- per frame -------------------------------------------------------------------------
  update(game, t, playing, yaw, mul = 1) {
    const dt = this.lastT == null ? 0 : Math.max(0, Math.min(0.1, t - this.lastT));
    this.lastT = t;
    if (!playing) { this.clear(); return; }
    const live = new Set();
    for (const h of game.hits) {
      if (h.kind === 'proj') {
        if (h.fx !== 'fireball' || h.dead || h.delay > 0) continue;
        live.add(h);
        let e = this.proj.get(h);
        if (!e) {
          const F = C.fireball, fr = frames('fire'), m = (Math.max(F.minR, h.r) * F.len * S) / fr[0].w;
          e = this.add('fire', h.x, h.y, { ax: 0.7, ay: 0.5, m, fps: F.fps, loop: true, life: 1e9, glow: F.glow, h: C.flyH });
          if (!e) continue;
          e.light = this.light(F.light.color, F.light.peak * Math.min(2, h.r / 6), 1e9, F.light.dist * Math.min(2, h.r / 6), h.x, C.flyH, h.y, h);
          this.proj.set(h, e);
        }
        e.x = h.x; e.y = h.y;
        // turn the flame along its flight as seen on screen (far = up, foreshortened)
        const vx = h.vx || Math.cos(h.angle), vy = h.vy || Math.sin(h.angle);
        const sx = vx * Math.cos(yaw) - vy * Math.sin(yaw), sz = -(vx * Math.sin(yaw) + vy * Math.cos(yaw));
        e.roll = Math.atan2(sz * 0.6, sx);
        const n = Math.floor(C.fireball.trail * mul * Math.max(1, h.r / 10) * dt + Math.random());
        const bx = -vx / (Math.hypot(vx, vy) || 1), by = -vy / (Math.hypot(vx, vy) || 1);
        for (let i = 0; i < n; i++) this.spark(h.x * S + bx * 0.25, C.flyH * S + (Math.random() - 0.5) * 0.2, h.y * S + by * 0.25, (Math.random() - 0.5) * 0.6, 0.6 + Math.random() * 0.8, (Math.random() - 0.5) * 0.6, 0.5, FIRE_SPARKS[i % 4]);
        continue;
      }
      if (h.delay > 0) continue;
      // a new explosion (Hujan Meteor's own area is not one: its meteors fall one by one, below)
      if (h.fx === 'boom' && !this.seen.has(h) && h.sid !== 'meteorstorm') {
        this.seen.add(h);
        const e = h.sid === 'meteor' && this.meteor(h.x, h.y, C.meteor.size, { life: C.meteor.fall });
        if (e) e.then = () => this.boom(h.x, h.y, h.r, mul);
        else this.boom(h.x, h.y, h.r, mul);
      }
      if (h.falls) for (const f of h.falls) {
        live.add(f);
        if (this.falls.has(f)) continue;
        const e = this.meteor(f.x, f.y, C.storm.size[f.big ? 0 : 1], { fall: f });
        if (e) this.falls.set(f, e);
      }
    }
    // projectiles and meteors that are gone
    for (const [h, e] of this.proj) {
      if (live.has(h)) continue;
      e.life = 0; this.proj.delete(h);
      if (e.light?.follow === h) { e.light.follow = null; e.light.life = 0; }
    }
    for (const [f, e] of this.falls) if (!live.has(f)) { e.life = 0; this.falls.delete(f); this.boom(f.x, f.y, f.big ? C.storm.big : C.storm.small, mul * 0.5); }

    // animate
    for (let i = this.list.length - 1; i >= 0; i--) {
      const e = this.list[i];
      if (e.delay > 0) { e.delay -= dt; continue; }
      e.t += dt;
      if (e.t >= e.life) {
        if (e.then) e.then();
        this.scene.remove(e.mesh); e.mesh.material.dispose(); this.list.splice(i, 1); continue;
      }
      const fi = Math.floor(e.t * e.fps), fr = e.fr[e.loop ? fi % e.fr.length : Math.min(fi, e.fr.length - 1)];
      if (e.mesh.material.map !== fr.map) e.mesh.material.map = fr.map;
      if (e.fade) e.mesh.material.opacity = e.opacity * Math.min(1, (e.life - e.t) / e.fade);
      e.mesh.visible = true;
      if (e.flat) { e.mesh.position.set(e.x * S, 0.05, e.y * S); e.mesh.rotation.y = yaw; continue; }
      if (e.meteor) this.placeMeteor(e, e.x, e.y, Math.max(0, 1 - e.t / e.life), yaw);
      else if (e.fall) this.placeMeteor(e, e.x, e.y, Math.max(0, e.fall.t / e.fall.max), yaw);
      else e.mesh.position.set(e.x * S, e.h * S, e.y * S);
      e.mesh.rotation.set(0, yaw, e.roll, 'YXZ');
    }
    // lights
    for (const L of this.lights) {
      if (L.follow) { L.l.position.set(L.follow.x * S, C.flyH * S, L.follow.y * S); L.l.intensity = L.peak; continue; }
      L.t += dt;
      L.l.intensity = L.t >= L.life ? 0 : L.peak * Math.max(0, 1 - L.t / L.life) ** 1.4;
    }
    // sparks
    const P = this.pPos, V = this.pVel;
    for (let i = 0; i < C.maxSparks; i++) {
      if (this.pLife[i] <= 0) { P[i * 3 + 1] = -99; continue; }
      this.pLife[i] -= dt; V[i * 3 + 1] -= this.pGrav[i] * dt;
      P[i * 3] += V[i * 3] * dt; P[i * 3 + 1] += V[i * 3 + 1] * dt; P[i * 3 + 2] += V[i * 3 + 2] * dt;
      if (P[i * 3 + 1] < 0.03) { P[i * 3 + 1] = 0.03; V[i * 3 + 1] *= -0.3; V[i * 3] *= 0.6; V[i * 3 + 2] *= 0.6; }
      const k = Math.min(1, (this.pLife[i] / this.pMax[i]) * 1.6);
      this.pCol[i * 3] = this.pBase[i * 3] * k; this.pCol[i * 3 + 1] = this.pBase[i * 3 + 1] * k; this.pCol[i * 3 + 2] = this.pBase[i * 3 + 2] * k;
    }
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true;
  }

  clear() {
    for (const e of this.list) { this.scene.remove(e.mesh); e.mesh.material.dispose(); }
    this.list.length = 0; this.proj.clear(); this.falls.clear();
    for (const L of this.lights) { L.follow = null; L.t = L.life = 0; L.l.intensity = 0; }
    this.pLife.fill(0); this.pPos.fill(-99);
    this.points.geometry.attributes.position.needsUpdate = true;
  }
}
