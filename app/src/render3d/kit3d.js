// Building blocks for the 2.5D towns and interiors (plan "Tampilan 2.5D" §3):
// a Batch that merges static parts into one mesh per material (few draw calls), a SinkSet of
// instanced pieces that sink / shrink for the cutaway, ghost materials for see-through
// houses, and a small cache of glow / window materials driven by the clock.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { S } from './stage.js';
import { inCutaway } from './townkit.js';

// unit shapes, scaled by the matrix when added
export const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 10),
  cyl6: new THREE.CylinderGeometry(0.5, 0.5, 1, 6),
  round: new THREE.CylinderGeometry(0.5, 0.5, 1, 32), // big discs: ponds, rugs, plazas
  cone: new THREE.ConeGeometry(0.5, 1, 8),
  cone4: new THREE.ConeGeometry(0.5, 1, 4),
  ball: new THREE.IcosahedronGeometry(0.5, 1),
  blob: new THREE.IcosahedronGeometry(0.5, 0), // low-poly leaves for the many trees
  dome: new THREE.SphereGeometry(0.5, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
  disc: new THREE.CircleGeometry(0.5, 24),
  plane: new THREE.PlaneGeometry(1, 1),
  // a gable roof prism: 1 wide (x), 1 deep (z), 1 high, ridge along x
  gable: (() => {
    const s = new THREE.Shape([new THREE.Vector2(-0.5, 0), new THREE.Vector2(0.5, 0), new THREE.Vector2(0, 1)]);
    const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false });
    g.translate(0, 0, -0.5); g.rotateY(Math.PI / 2);
    return g;
  })(),
  // a shed (mono-pitch) roof wedge: high at the back (−z), low at the front
  shed: (() => {
    const s = new THREE.Shape([new THREE.Vector2(-0.5, 0), new THREE.Vector2(0.5, 0), new THREE.Vector2(0.5, 1)]);
    const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false });
    g.translate(0, 0, -0.5); g.rotateY(Math.PI / 2);
    return g;
  })(),
};

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
export function matrixOf(x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0, out = _m) {
  _e.set(rx, ry, rz); _q.setFromEuler(_e);
  return out.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
}

// Static parts merged per material. Positions in metres (call with S-scaled values).
export class Batch {
  constructor() { this.parts = new Map(); }
  // a unit shape stretched to (sx, sy, sz), its centre at (x, y, z)
  add(geo, mat, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.applyMatrix4(matrixOf(x, y, z, sx, sy, sz, rx, ry, rz));
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
    let list = this.parts.get(mat);
    if (!list) this.parts.set(mat, (list = []));
    list.push(g);
    return this;
  }
  // box by its game-unit footprint: (x, y) top-left, w × d, from height y0 up h (game units)
  boxAt(mat, x, y, w, d, y0, h) { return this.add(GEO.box, mat, (x + w / 2) * S, (y0 + h / 2) * S, (y + d / 2) * S, w * S, h * S, d * S); }
  get empty() { return this.parts.size === 0; }
  build(parent) {
    const out = [];
    for (const [mat, list] of this.parts) {
      const geo = mergeGeometries(list, false);
      for (const g of list) g.dispose();
      const m = new THREE.Mesh(geo, mat);
      m.matrixAutoUpdate = false; m.updateMatrix();
      parent.add(m); out.push(m);
    }
    this.parts.clear();
    return out;
  }
}

// Pieces (wall cells, trees) drawn as instances, one InstancedMesh per part; the ones on
// the camera side of the hero sink (mode 'y': squash down; 'all': shrink away).
export class SinkSet {
  // items: [{ x, y (game), ry, s, sx (stretch along local x) }]; parts: [{ geo, mat, m: Matrix4 local to the item, metres }]
  constructor(parent, items, parts, mode = 'y', depth = 440) {
    this.items = items; this.mode = mode; this.depth = depth;
    this.k = new Float32Array(items.length).fill(1);
    this.parts = parts.map((p) => {
      const im = new THREE.InstancedMesh(p.geo, p.mat, items.length);
      im.frustumCulled = false; // spread over the whole town; one draw call either way
      parent.add(im);
      return { im, local: p.m };
    });
    this.base = items.map((it) => matrixOf(it.x * S, 0, it.y * S, (it.s ?? 1) * (it.sx ?? 1), it.s ?? 1, it.s ?? 1, 0, it.ry || 0, 0, new THREE.Matrix4()));
    this.tmp = new THREE.Matrix4(); this.sq = new THREE.Matrix4();
    for (let i = 0; i < items.length; i++) this.write(i, 1);
    for (const p of this.parts) p.im.instanceMatrix.needsUpdate = true;
  }
  write(i, k) {
    const sq = this.sq;
    if (this.mode === 'y') sq.makeScale(1, Math.max(0.001, k), 1);
    else sq.makeScale(Math.max(0.001, k), Math.max(0.001, k), Math.max(0.001, k));
    for (const p of this.parts) {
      this.tmp.multiplyMatrices(this.base[i], sq).multiply(p.local);
      p.im.setMatrixAt(i, this.tmp);
    }
  }
  // hx, hy: the hero (or camera target); dt in seconds; all: reset to full height
  update(hx, hy, yaw, dt, all = false) {
    const low = this.mode === 'y' ? 0.14 : 0;
    let changed = false;
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];
      const goal = !all && inCutaway(it.x, it.y, hx, hy, yaw, this.depth) ? low : 1;
      const k0 = this.k[i], k = all ? goal : k0 + (goal - k0) * Math.min(1, dt * 9);
      if (Math.abs(k - k0) < 0.003 && !all) continue;
      this.k[i] = k; this.write(i, k); changed = true;
    }
    if (changed) for (const p of this.parts) p.im.instanceMatrix.needsUpdate = true;
  }
}

// see-through copies of materials (shared by every house that fades)
const GHOST = new Map();
export function ghostOf(mat) {
  let g = GHOST.get(mat);
  if (!g) {
    g = mat.clone(); g.transparent = true; g.opacity = 0.26; g.depthWrite = false;
    GHOST.set(mat, g);
  }
  return g;
}
// an occluder: a group whose meshes swap to ghosts while it hides the hero
export function setGhost(obj, on) {
  if (obj.ghost === on) return;
  obj.ghost = on;
  for (const m of obj.meshes) m.material = on ? ghostOf(m.userData.mat) : m.userData.mat;
}
export function occluder(group, meshes, x0, y0, x1, y1, reach) {
  for (const m of meshes) m.userData.mat = m.material;
  return { group, meshes, x0, y0, x1, y1, reach, ghost: false };
}

// cached unlit glow material per colour (glowMat makes a new one each call)
const GLOW = new Map();
export function glow(c, k = 1.8) {
  const key = `${c}:${k}`;
  let m = GLOW.get(key);
  if (!m) { m = new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k) }); GLOW.set(key, m); }
  return m;
}

// colour helpers
export const col = (c) => new THREE.Color(c);
export const rgbCol = (s) => { const [r, g, b] = s.split(',').map(Number); return new THREE.Color(r / 255, g / 255, b / 255); };

// materials whose colour follows the clock: windows / lamps glow only after dark
export class NightMats {
  constructor() {
    this.window = new THREE.MeshBasicMaterial({ color: 0xffb860 });
    this.lamp = new THREE.MeshBasicMaterial({ color: 0xffd27a });
    this.dayWin = col(0x2e3a4a); this.nightWin = col(0xffb860).multiplyScalar(1.7);
    this.dayLamp = col(0x8a7a5a); this.nightLamp = col(0xffd27a).multiplyScalar(2.1);
  }
  set(night) {
    this.window.color.copy(this.dayWin).lerp(this.nightWin, night);
    this.lamp.color.copy(this.dayLamp).lerp(this.nightLamp, night);
  }
}

// icon sign textures (cached per icon)
const SIGNS = new Map();
export function signTexture(id, drawIcon) {
  let t = SIGNS.get(id);
  if (t) return t;
  const c = document.createElement('canvas'); c.width = c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = '#3a2618'; g.beginPath(); g.roundRect(3, 3, 90, 90, 14); g.fill();
  g.strokeStyle = '#c9a24a'; g.lineWidth = 6; g.stroke();
  g.translate(48, 48); drawIcon(g, id, 64);
  t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  SIGNS.set(id, t);
  return t;
}

// a repeating ground tile painted once: paint(g, T) in tile units, T units square
export function tileTexture(T, px, paint) {
  const c = document.createElement('canvas'); c.width = c.height = px;
  const g = c.getContext('2d');
  g.scale(px / T, px / T);
  paint(g, T);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}
export const rnd = (seed) => { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; };
// draw(px, py) once, and again across the tile edges so the pattern wraps
export function wrapped(T, x, y, r, draw) {
  for (const ox of [0, -T, T]) for (const oy of [0, -T, T]) {
    const px = x + ox, py = y + oy;
    if (px + r < 0 || px - r > T || py + r < 0 || py - r > T) continue;
    draw(px, py);
  }
}
