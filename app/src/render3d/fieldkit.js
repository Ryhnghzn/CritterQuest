// Low-poly shapes for the 2.5D regions (plan "Tampilan 2.5D" §4), all built from code:
// one merged, vertex-coloured geometry per prop kind (for InstancedMesh), and the few
// one-off pieces (dungeon gates, chests, hidden homes, bridges, river ribbons, signposts).
// Prop geometry is in "radius units" (a solid of r = 1, feet at y = 0); the instance
// matrix scales it by r·S. One-off pieces are built in metres.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { S, toon } from './stage.js';
import * as FLORA from './flora.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();

// a part: geometry placed, its vertices painted one colour
export function part(geo, color, { x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0 } = {}) {
  let g = geo.index ? geo.toNonIndexed() : geo;
  if (g !== geo) geo.dispose();
  g.deleteAttribute('uv');
  _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
  g.applyMatrix4(_m);
  const c = new THREE.Color(color), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}
export const merge = (parts) => { const g = mergeGeometries(parts); parts.forEach((p) => p.dispose()); g.computeBoundingSphere(); return g; };

// toon material that shows vertex colours (flat facets for the low-poly look), cached
const VTOON = new Map();
export function vtoon(rim = 0, flat = true, kind = null) {
  const key = `${rim}:${flat}:${kind}`;
  if (VTOON.has(key)) return VTOON.get(key);
  const base = toon(0xffffff, rim, kind), m = base.clone();
  m.vertexColors = true; m.flatShading = flat;
  m.onBeforeCompile = base.onBeforeCompile; m.customProgramCacheKey = base.customProgramCacheKey;
  m.userData.shared = true;
  VTOON.set(key, m);
  return m;
}

const Cyl = (rt, rb, h, n = 6) => new THREE.CylinderGeometry(rt, rb, h, n);
const Cone = (r, h, n = 7) => new THREE.ConeGeometry(r, h, n);
const Ico = (r) => new THREE.IcosahedronGeometry(r, 0);
const Dode = (r) => new THREE.DodecahedronGeometry(r, 0);
const Oct = (r) => new THREE.OctahedronGeometry(r, 0);
const Box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

// rock / stone colours per biome
const ROCK = { forest: ['#3e3d42', '#4a4540'], ice: ['#5b6878', '#66707e'], desert: ['#9a6a44', '#a87a4e'], volcano: ['#2a2422', '#24201f'], eclipse: ['#2a2236', '#30283e'] };
const STONE = { forest: '#4b4a5c', ice: '#566373', desert: '#8a6448', volcano: '#2e2a2c', eclipse: '#2a2236' };
const RUNE = { volcano: '#ff8a3c', eclipse: '#c79bff' };

// kinds drawn by flora.js (plan A5): three variants each, soft shading (smooth: true)
export const VARIED = new Set(['pine', 'oak', 'snowpine', 'rock', 'bush']);
const ROCK_TOP = { forest: '#3d5a33', ice: '#c4d2e4' };

// prop kind → { geo, rim, smooth? } for a biome (variant: 0..FLORA.VARIANTS-1 for VARIED kinds)
export function propGeometry(kind, biome, variant = 0) {
  const P = [];
  switch (kind) {
    case 'pine': return { geo: FLORA.pine(variant), rim: 0x2a4a3a, smooth: true };
    case 'oak': return { geo: FLORA.oak(variant), rim: 0x3a5a2a, smooth: true };
    case 'snowpine': return { geo: FLORA.pine(variant, true), rim: 0x8ab8e8, smooth: true };
    case 'bush': return { geo: FLORA.bush(variant), rim: 0x3a5a2a, smooth: true };
    case 'cactus': {
      const c = '#3f6b3a';
      P.push(part(Cyl(0.22, 0.25, 1.7, 8), c, { y: 0.85 }), part(new THREE.SphereGeometry(0.22, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), c, { y: 1.7 }));
      P.push(part(Cyl(0.12, 0.12, 0.5, 6), c, { x: 0.38, y: 0.75, rz: Math.PI / 2 }), part(Cyl(0.13, 0.13, 0.75, 6), c, { x: 0.6, y: 1.08 }));
      P.push(part(Cyl(0.11, 0.11, 0.4, 6), c, { x: -0.32, y: 0.55, rz: Math.PI / 2 }), part(Cyl(0.12, 0.12, 0.55, 6), c, { x: -0.5, y: 0.8 }));
      P.push(part(Oct(0.09), '#e0527a', { y: 1.95 }));
      return { geo: merge(P), rim: 0x9ad070 };
    }
    case 'palm': {
      for (let i = 0; i < 4; i++) P.push(part(Cyl(0.12 - i * 0.012, 0.15 - i * 0.012, 0.75, 6), i % 2 ? '#6a4a2c' : '#5a3e24', { x: i * i * 0.04, y: 0.36 + i * 0.7, rz: -0.08 - i * 0.05 }));
      const top = [0.55, 2.95];
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        P.push(part(Cone(0.22, 1.6, 4), i % 2 ? '#3d6a32' : '#2f5a2a', { x: top[0] + Math.cos(a) * 0.7, y: top[1] - 0.2, z: Math.sin(a) * 0.7, sz: 0.25, rz: -1.9, ry: -a }));
      }
      P.push(part(Ico(0.14), '#6a4020', { x: top[0] + 0.1, y: top[1] - 0.2 }), part(Ico(0.13), '#6a4020', { x: top[0] - 0.12, y: top[1] - 0.22, z: 0.1 }));
      return { geo: merge(P), rim: 0xc8a060 };
    }
    case 'deadtree': { // charred tree with glowing ember tips
      const c = biome === 'volcano' ? '#1c1513' : '#5a4632';
      P.push(part(Cyl(0.1, 0.2, 1.6, 5), c, { y: 0.8, rz: 0.05 }));
      for (const [a, len, y, tilt] of [[0, 0.9, 1.3, 0.8], [2.1, 0.8, 1.05, 0.9], [4.2, 0.7, 1.5, 0.7], [1, 0.6, 1.7, 0.4]]) {
        const tx = Math.cos(a) * Math.sin(tilt) * len * 0.5, tz = Math.sin(a) * Math.sin(tilt) * len * 0.5;
        P.push(part(Cyl(0.04, 0.08, len, 4), c, { x: tx, y: y + Math.cos(tilt) * len * 0.5, z: tz, rz: -Math.cos(a) * tilt, rx: Math.sin(a) * tilt }));
        if (biome === 'volcano') P.push(part(Oct(0.07), '#ff8a3c', { x: tx * 2, y: y + Math.cos(tilt) * len, z: tz * 2 }));
      }
      return { geo: merge(P), rim: biome === 'volcano' ? 0xff5a20 : 0x8a6a4a };
    }
    case 'spire': // eclipse: black crystal shards with a violet sheen
      for (const [x, z, h, lean] of [[-0.42, 0.1, 1.2, -0.25], [0.38, -0.1, 1.45, 0.2], [0, 0, 2.3, 0.03], [0.6, 0.35, 0.9, 0.4]]) {
        P.push(part(Cone(0.28 + h * 0.06, h, 4), '#1a1228', { x, y: h / 2, z, rz: -lean, ry: x * 3 }));
      }
      return { geo: merge(P), rim: 0xa070ff };
    case 'crystal':
      for (const [x, z, h, lean] of [[0, 0, 1.6, 0], [0.4, 0.15, 1.0, 0.35], [-0.35, -0.1, 1.15, -0.3]]) {
        P.push(part(Oct(0.3), '#6aa8d8', { x, y: h / 2, z, sy: h / 0.6, rz: -lean }));
      }
      return { geo: merge(P), rim: 0xe8f6ff };
    case 'rock':
    case 'floatrock': {
      P.push(FLORA.rock(kind === 'rock' ? variant : 0, ROCK[biome] || ROCK.forest, ROCK_TOP[biome] || null)); // moss / snow on top
      if (biome === 'volcano') P.push(part(Box(0.9, 0.06, 0.08), '#ff7a30', { y: 0.55, z: 0.72, ry: 0.3, rz: 0.25 }));
      if (kind === 'floatrock') P.push(part(Box(0.7, 0.05, 0.06), '#b98cff', { y: 0.45, z: 0.7, rz: -0.3 }));
      return { geo: merge(P), rim: biome === 'eclipse' ? 0x8a5ad8 : biome === 'volcano' ? 0x6a2a10 : 0x4a4a6a };
    }
    case 'icerock':
      P.push(part(Dode(0.95), ROCK.ice[0], { y: 0.32, sy: 0.68, sz: 0.85 }), part(Ico(0.62), '#c4d2e4', { x: -0.1, y: 0.82, sy: 0.22 }));
      P.push(part(Oct(0.28), '#7ab8e0', { x: 0.35, y: 1.1, sy: 3, rz: -0.25 }), part(Oct(0.2), '#8ac4e8', { x: 0.62, y: 0.85, sy: 2.4, rz: -0.6 }));
      return { geo: merge(P), rim: 0xd8f0ff };
    case 'stone': { // a ruin's standing stone (r = 22) with a rune
      const c = STONE[biome] || STONE.forest;
      P.push(part(Box(1.1, 2.3, 0.8), c, { y: 1.15 }), part(Box(1.24, 0.24, 0.94), c, { y: 2.36 }));
      if (biome === 'ice') P.push(part(Box(1.28, 0.16, 0.98), '#c4d2e4', { y: 2.52 }));
      P.push(part(Box(0.1, 0.9, 0.04), RUNE[biome] || '#9a8cff', { y: 1.3, z: 0.41 }), part(Box(0.5, 0.08, 0.04), RUNE[biome] || '#9a8cff', { y: 1.45, z: 0.41, rz: 0.5 }));
      return { geo: merge(P), rim: 0x6a5ab8 };
    }
    case 'column': { // a broken column: drum, shaft, jagged top
      const c = STONE[biome] || STONE.forest;
      P.push(part(Cyl(0.68, 0.72, 0.3, 8), c, { y: 0.15 }), part(Cyl(0.5, 0.55, 1.9, 8), c, { y: 1.25 }), part(Cone(0.5, 0.5, 8), c, { y: 2.45, rz: 0.4, sy: 0.6 }));
      return { geo: merge(P), rim: 0x6a5ab8 };
    }
  }
  return { geo: merge([part(Box(1, 1, 1), '#ff00ff', { y: 0.5 })]), rim: 0 };
}

// lift of a kind above the ground (radius units): floating eclipse rocks
export const LIFT = { floatrock: 0.7 };

// canvas textures
function canvasTex(w, h, paint) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
let GLOW = null; // white radial falloff, tinted by the material colour
export const glowTex = () => GLOW || (GLOW = canvasTex(128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
}));
let SWIRL = null; // portal swirl arms
const swirlTex = () => SWIRL || (SWIRL = canvasTex(128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 2, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,.12)');
  g.fillStyle = gr; g.beginPath(); g.arc(64, 64, 64, 0, Math.PI * 2); g.fill();
  g.lineWidth = 6; g.strokeStyle = 'rgba(255,255,255,.8)';
  for (let i = 0; i < 3; i++) {
    g.beginPath();
    for (let k = 0; k <= 30; k++) { const a = i * (Math.PI * 2 / 3) + k * 0.22, r = 3 + k * 2; g.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); }
    g.stroke();
  }
}));
export const additive = (color, opacity, map = null) => new THREE.MeshBasicMaterial({ color, map, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });

// a flat glow on the ground (radius in game units)
export function groundGlow(x, y, r, color, opacity) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2 * S, r * 2 * S), additive(color, opacity, glowTex()));
  m.rotation.x = -Math.PI / 2; m.position.set(x * S, 0.06, y * S);
  return m;
}

// dungeon gate (spec §25.5): weathered arch round a swirling portal, facing the camera
export function gateMesh(c0, c1) {
  const G = new THREE.Group(), u = S; // game units → metres
  const stone = [];
  for (const s of [-1, 1]) {
    stone.push(part(Box(22 * u, 104 * u, 22 * u), '#3b3846', { x: s * 46 * u, y: 52 * u }));
    stone.push(part(Box(30 * u, 10 * u, 30 * u), '#2c2a35', { x: s * 46 * u, y: 5 * u }));
  }
  // the lintel: a half ring of blocks
  for (let i = 0; i <= 6; i++) {
    const a = Math.PI * (i / 6), r = 50 * u;
    stone.push(part(Box(20 * u, 14 * u, 24 * u), i === 3 ? '#2c2a35' : '#433f50', { x: Math.cos(a) * r, y: 100 * u + Math.sin(a) * r * 0.75, rz: a - Math.PI / 2 }));
  }
  stone.push(part(Box(54 * u, 6 * u, 4 * u), '#2c2a35', { y: 2 * u, z: 6 * u }));
  const arch = new THREE.Mesh(merge(stone), vtoon(0x6a5ab8, true, 'stone'));
  G.add(arch);
  const col0 = new THREE.Color(`rgb(${c0})`), col1 = new THREE.Color(`rgb(${c1})`);
  const portal = new THREE.Mesh(new THREE.CircleGeometry(1, 32), additive(col0.clone().multiplyScalar(1.4), 0.9, swirlTex()));
  portal.scale.set(36 * u, 54 * u, 1); portal.position.set(0, 54 * u, 0); G.add(portal);
  const core = new THREE.Mesh(new THREE.CircleGeometry(1, 24), additive(col1.clone().multiplyScalar(1.6), 0.7, glowTex()));
  core.scale.set(30 * u, 44 * u, 1); core.position.set(0, 54 * u, 0.02); G.add(core);
  const rune = new THREE.Mesh(Box(6 * u, 14 * u, 2 * u), new THREE.MeshBasicMaterial({ color: col1.clone().multiplyScalar(2) }));
  rune.position.set(0, 100 * u + 50 * u * 0.75, 13 * u); G.add(rune);
  const glow = groundGlow(0, 10, 110, col1, 0.5); G.add(glow);
  G.userData = { portal, core, rune, glow };
  return G;
}

// the town gate where a region's road leaves it (spec §25.1): two towers, a beam with a
// banner, lanterns on the inner side and a palisade along the edge. Built with the wall along z
// and the inside of the region towards +x; half: half the opening, wall: how far the palisade reaches.
const TOWN_GATE = {
  forest: { wood: '#5a3e24', stone: '#4a4038', cap: '#2f4a2a' },
  ice: { wood: '#5a4a3e', stone: '#6a7686', cap: '#e8f2ff' },
  desert: { wood: '#7a5634', stone: '#a8824e', cap: '#c2843a' },
  volcano: { wood: '#2a2020', stone: '#3a3030', cap: '#5a2a1a' },
  eclipse: { wood: '#2a2236', stone: '#3a3048', cap: '#6a4a9a' },
};
export function townGateMesh(biome, half, wall) {
  const G = new THREE.Group(), u = S, st = TOWN_GATE[biome] || TOWN_GATE.forest, P = [];
  const tz = half + 22;
  for (const s of [-1, 1]) {
    P.push(part(Box(40 * u, 104 * u, 40 * u), st.stone, { y: 52 * u, z: s * tz * u }));
    P.push(part(Box(48 * u, 7 * u, 48 * u), st.cap, { y: 106 * u, z: s * tz * u }));
    for (const [ox, oz] of [[-15, -15], [15, -15], [-15, 15], [15, 15]]) P.push(part(Box(10 * u, 12 * u, 10 * u), st.stone, { x: ox * u, y: 115 * u, z: (s * tz + oz) * u }));
    // palisade: sharpened posts and two rails
    for (let z = half + 54; z <= wall; z += 20) {
      P.push(part(Cyl(7 * u, 8 * u, 62 * u), st.wood, { y: 31 * u, z: s * z * u }));
      P.push(part(Cone(8 * u, 16 * u, 6), st.wood, { y: 70 * u, z: s * z * u }));
    }
    const len = wall - half - 44;
    for (const y of [18, 44]) P.push(part(Box(6 * u, 6 * u, len * u), '#2a1c10', { x: 9 * u, y: y * u, z: s * (half + 44 + len / 2) * u }));
    P.push(part(Box(6 * u, 14 * u, 4 * u), '#2a1c10', { x: 23 * u, y: 74 * u, z: s * (half + 4) * u })); // lantern bracket
  }
  P.push(part(Box(12 * u, 10 * u, (half + 22) * 2 * u), st.wood, { y: 96 * u })); // the beam over the road
  P.push(part(Box(2 * u, 36 * u, 40 * u), '#7a1e1e', { x: 7 * u, y: 74 * u }));
  P.push(part(Box(2.5 * u, 8 * u, 14 * u), '#d8a84a', { x: 7 * u, y: 80 * u }));
  G.add(new THREE.Mesh(merge(P), vtoon(0, true, 'stone')));
  const lamps = [];
  for (const s of [-1, 1]) {
    const lamp = new THREE.Mesh(Box(10 * u, 12 * u, 10 * u), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc070).multiplyScalar(2) }));
    lamp.position.set(23 * u, 64 * u, s * (half + 4) * u); G.add(lamp);
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(60 * u, 60 * u), additive(new THREE.Color(0xffa040).multiplyScalar(1.4), 0.6, glowTex()));
    halo.position.copy(lamp.position); halo.position.x += 2 * u; halo.rotation.y = Math.PI / 2; G.add(halo);
    lamps.push(halo);
  }
  G.userData = { lamps };
  return G;
}

// clouds that tile, for the fog past a region's edge
let CLOUD = null;
const cloudTex = () => CLOUD || (CLOUD = (() => {
  const t = canvasTex(256, 256, (g) => {
    const r = rndTex(11);
    for (let i = 0; i < 90; i++) {
      const x = r() * 256, y = r() * 256, rad = 24 + r() * 56, a = 0.16 + r() * 0.2;
      for (const [dx, dy] of [[0, 0], [256, 0], [-256, 0], [0, 256], [0, -256]]) { // drawn wrapped, so it tiles
        const gr = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, rad);
        gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(x + dx - rad, y + dy - rad, rad * 2, rad * 2);
      }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
})());
const rndTex = (seed) => { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; };
// fades from thick (u = 0, outside) to nothing (u = 1, at the edge)
let FADE = null;
const fadeTex = () => FADE || (FADE = canvasTex(64, 4, (g) => {
  const gr = g.createLinearGradient(0, 0, 64, 0);
  gr.addColorStop(0, '#fff'); gr.addColorStop(0.7, '#ddd'); gr.addColorStop(1, '#000');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 4);
}));

// fog past a region's west (dir -1) or east (dir 1) edge: stacked layers of drifting cloud,
// thick outside and thinning to nothing just inside the edge (edgeX), the whole height h
export function fogBank(edgeX, h, dir, color) {
  const G = new THREE.Group(), depth = 700, inside = 110;
  const layers = [];
  [[4, 1], [26, 0.9], [56, 0.75], [92, 0.6], [130, 0.45]].forEach(([y, op], i) => {
    const map = cloudTex().clone(); map.needsUpdate = true;
    map.repeat.set(depth / 240, h / 240);
    const alpha = fadeTex();
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color, map, alphaMap: alpha, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2;
    if (dir > 0) m.rotation.z = Math.PI; // the fade runs from outside to the edge
    m.scale.set((depth + inside) * S, h * S, 1);
    m.position.set((edgeX + dir * (depth - inside) / 2) * S, y * S, h / 2 * S);
    m.userData = { map, speed: (i % 2 ? -1 : 1) * (0.006 + i * 0.003) };
    G.add(m); layers.push(m);
  });
  G.userData = { layers };
  return G;
}

// treasure chest on its dais (spec §25.3): chained while guarded, lid thrown back once open
export function chestMesh(lord) {
  const G = new THREE.Group(), u = S * (lord ? 1.35 : 1);
  const body = [part(Box(60 * u, 34 * u, 38 * u), '#6b3f1f', { y: 17 * u })];
  for (const bx of [-26, 0, 26]) body.push(part(Box(8 * u, 35 * u, 39 * u), '#c9a24a', { x: bx * u, y: 17 * u }));
  G.add(new THREE.Mesh(merge(body), vtoon(0xffc060, true, 'wood')));
  const lidC = new THREE.Mesh(merge([part(new THREE.CylinderGeometry(19 * u, 19 * u, 60 * u, 10, 1, false, 0, Math.PI), '#7a4a24', { rz: Math.PI / 2 })]), vtoon(0xffc060, true, 'wood'));
  lidC.position.y = 34 * u; G.add(lidC);
  const lidO = new THREE.Mesh(merge([part(Box(60 * u, 6 * u, 26 * u), '#5a3418', {})]), vtoon(0xffc060, true, 'wood'));
  lidO.position.set(0, 46 * u, -22 * u); lidO.rotation.x = -1.2; G.add(lidO);
  const chains = new THREE.Mesh(merge([
    part(Box(76 * u, 3 * u, 3 * u), '#9a9aaa', { y: 26 * u, z: 20 * u, rz: 0.45 }), part(Box(76 * u, 3 * u, 3 * u), '#9a9aaa', { y: 26 * u, z: 20 * u, rz: -0.45 }),
    part(Box(14 * u, 14 * u, 4 * u), '#8a8a9a', { y: 22 * u, z: 20 * u }),
  ]), vtoon(0)); G.add(chains);
  const lock = new THREE.Mesh(Box(14 * u, 14 * u, 4 * u), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd166).multiplyScalar(1.6) }));
  lock.position.set(0, 22 * u, 20 * u); G.add(lock);
  const shine = new THREE.Mesh(new THREE.PlaneGeometry(50 * u, 26 * u), additive(new THREE.Color(0xffd890).multiplyScalar(1.5), 0.8, glowTex()));
  shine.rotation.x = -Math.PI / 2; shine.position.y = 35 * u; G.add(shine);
  const glow = groundGlow(0, 0, 90 * (lord ? 1.35 : 1), new THREE.Color(0xffb050), 0.35); G.add(glow);
  G.userData = { lidC, lidO, chains, lock, shine, glow };
  return G;
}

// hidden homes (spec §26.5): cabin / tent / stone hut, or a camp with a small fire
const HOME = {
  forest: { wall: '#6b4a2e', roof: '#2f4a2a', trim: '#8a6a3a' },
  ice: { wall: '#5a4a3e', roof: '#e8f2ff', trim: '#7a8aa0' },
  desert: { wall: '#a8824e', roof: '#b0442e', trim: '#f0d8a0' },
  volcano: { wall: '#3a3030', roof: '#2a2222', trim: '#ff7a2a' },
  eclipse: { wall: '#3a3048', roof: '#241c34', trim: '#b98cff' },
};
export function homeMesh(h, biome) {
  const G = new THREE.Group(), u = S, st = HOME[biome] || HOME.forest, P = [], lit = [];
  if (h.hut && biome === 'desert') { // tent
    P.push(part(Cone(80 * u, 104 * u, 6), st.wall, { y: 52 * u, ry: Math.PI / 6 }));
    P.push(part(Cyl(1.5 * u, 1.5 * u, 30 * u, 4), '#3a2a20', { y: 116 * u }), part(Box(18 * u, 10 * u, 1 * u), st.roof, { x: 9 * u, y: 124 * u }));
    P.push(part(Box(36 * u, 50 * u, 2 * u), '#2a1a10', { y: 25 * u, z: 58 * u, rx: -0.5 }));
    P.push(part(Cyl(7 * u, 6 * u, 20 * u, 6), '#b06a3a', { x: -54 * u, y: 10 * u, z: 40 * u }), part(Cyl(7 * u, 6 * u, 18 * u, 6), '#b06a3a', { x: -40 * u, y: 9 * u, z: 52 * u }));
  } else if (h.hut && biome === 'volcano') { // stone hut with a glowing door
    P.push(part(new THREE.SphereGeometry(64 * u, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), st.wall, { sy: 1.4 }));
    P.push(part(Box(70 * u, 4 * u, 4 * u), '#4a4a52', { x: 55 * u, y: 10 * u, z: 50 * u }), part(Box(30 * u, 10 * u, 16 * u), '#4a4a52', { x: 55 * u, y: 5 * u, z: 50 * u }));
    lit.push([0, 22, 62, 28, 44, '#ff9a40']);
  } else if (h.hut) { // log cabin (snowy roof on the ice)
    P.push(part(Box(120 * u, 70 * u, 90 * u), st.wall, { y: 35 * u }));
    for (let i = 1; i < 5; i++) P.push(part(Box(122 * u, 2 * u, 92 * u), '#3a2616', { y: i * 14 * u }));
    const roof = new THREE.CylinderGeometry(1, 1, 1, 3, 1, false, Math.PI / 2); // a triangular prism, apex up
    P.push(part(roof, st.roof, { y: 92 * u, sx: 50 * u, sy: 136 * u, sz: 58 * u, rz: Math.PI / 2 }));
    P.push(part(Box(14 * u, 34 * u, 14 * u), '#4a4040', { x: -40 * u, y: 112 * u, z: -10 * u }));
    P.push(part(Box(26 * u, 40 * u, 2 * u), '#2a1a10', { y: 20 * u, z: 46 * u }));
    for (let i = 0; i < 3; i++) P.push(part(Cyl(6 * u, 6 * u, 30 * u, 6), '#8a6a3a', { x: (-50 + i * 12) * u, y: (6 + (i === 1 ? 8 : 0)) * u, z: 52 * u, rx: Math.PI / 2 }));
    lit.push([36, 44, 46, 20, 16, '#ffbe6e']);
  } else { // a camp: bundle, stones, logs
    P.push(part(Ico(14 * u), '#6a5040', { x: -30 * u, y: 8 * u, sy: 0.7 }));
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; P.push(part(Dode(5 * u), '#4a4a55', { x: 20 * u + Math.cos(a) * 16 * u, y: 3 * u, z: Math.sin(a) * 16 * u })); }
    P.push(part(Cyl(3 * u, 3 * u, 26 * u, 5), '#5a3e24', { x: 20 * u, y: 4 * u, rz: Math.PI / 2, ry: 0.5 }), part(Cyl(3 * u, 3 * u, 26 * u, 5), '#5a3e24', { x: 20 * u, y: 4 * u, rz: Math.PI / 2, ry: -0.6 }));
    const fire = new THREE.Mesh(Cone(8 * u, 22 * u, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff8a30).multiplyScalar(2) }));
    fire.position.set(20 * u, 12 * u, 0); fire.userData.flicker = h.x % 9; G.add(fire);
    G.add(groundGlow(20, 0, 70, new THREE.Color(0xff8a40), 0.45));
  }
  if (P.length) G.add(new THREE.Mesh(merge(P), vtoon(0x6a4a3a, true, 'wood')));
  for (const [x, y, z, w, hh, c] of lit) { // a lit window / door: unlit bright face
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w * u, hh * u), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.6) }));
    m.position.set(x * u, y * u, (z + 0.6) * u); m.userData.flicker = (h.x + x) % 7; G.add(m);
  }
  G.position.set(h.x * S, 0, (h.y - 50) * S); // the door faces the camera; the keeper stands in front
  return G;
}

// bridges: planks over water, stone slabs over lava (one merged mesh per region)
export function bridgesMesh(spots, lava) {
  if (!spots.length) return null;
  const P = [], len = 200, wid = 117, deck = lava ? '#3d3836' : '#5a3d25', rail = lava ? '#2a2624' : '#3e2816', post = lava ? '#35302d' : '#4a311c';
  for (const b of spots) {
    const ry = -b.a; // 2D rotation by a in (x, y) = rotation by −a about Y in (x, z)
    const at = (lx, lz) => [b.x + lx * Math.cos(b.a) - lz * Math.sin(b.a), b.y + lx * Math.sin(b.a) + lz * Math.cos(b.a)];
    P.push(part(Box(wid * S, 0.22, len * S), deck, { x: b.x * S, y: 0.12, z: b.y * S, ry }));
    for (let k = -len / 2 + 12; k < len / 2; k += lava ? 24 : 14) { const [x, z] = at(0, k); P.push(part(Box(wid * S * 1.02, 0.04, 0.08), '#2a1a10', { x: x * S, y: 0.24, z: z * S, ry })); }
    for (const s of [-1, 1]) {
      const [rx, rz] = at(s * wid / 2, 0);
      P.push(part(Box(0.28, 0.14, len * S), rail, { x: rx * S, y: 0.62, z: rz * S, ry }));
      for (const pz of [-len / 2, 0, len / 2]) { const [x, z] = at(s * wid / 2, pz); P.push(part(Cyl(0.16, 0.2, 0.75, 6), post, { x: x * S, y: 0.38, z: z * S })); }
    }
  }
  return new THREE.Mesh(merge(P), vtoon(0x6a4a2a, true, 'wood'));
}

// a flat ribbon along each river (water sheen / glowing lava), game units → metres
export function riverRibbon(rivers, width, y = 0.03) {
  const pos = [], idx = [];
  for (const river of rivers) {
    const base = pos.length / 3;
    for (let i = 0; i < river.length; i++) {
      const a = river[Math.max(0, i - 1)], b = river[Math.min(river.length - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1]; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
      const [x, z] = river[i];
      pos.push((x - dy * width / 2) * S, y, (z + dx * width / 2) * S, (x + dy * width / 2) * S, y, (z - dx * width / 2) * S);
      if (i) { const k = base + (i - 1) * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

// signpost at an exit: a post and a board with the town's name
export function signMesh(text, dir) {
  const G = new THREE.Group();
  const post = new THREE.Mesh(merge([part(Cyl(3 * S, 3.5 * S, 56 * S, 5), '#4a311c', { y: 28 * S })]), vtoon(0, true, 'wood'));
  G.add(post);
  const c = document.createElement('canvas'); c.width = 256; c.height = 48;
  const g = c.getContext('2d');
  g.font = '600 26px Barlow, system-ui, sans-serif';
  const w = Math.min(250, g.measureText(text).width + 50);
  g.beginPath();
  const x0 = dir < 0 ? 256 - w : 2;
  if (dir < 0) { g.moveTo(x0, 24); g.lineTo(x0 + 20, 3); g.lineTo(x0 + w - 2, 3); g.lineTo(x0 + w - 2, 45); g.lineTo(x0 + 20, 45); } else { g.moveTo(x0, 3); g.lineTo(x0 + w - 22, 3); g.lineTo(x0 + w - 2, 24); g.lineTo(x0 + w - 22, 45); g.lineTo(x0, 45); }
  g.closePath(); g.fillStyle = '#6b4a2b'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#1a1010'; g.stroke();
  g.fillStyle = '#f3e2b8'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, x0 + w / 2 + (dir < 0 ? 8 : -8), 25);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const board = new THREE.Mesh(new THREE.PlaneGeometry(128 * S, 24 * S), new THREE.MeshLambertMaterial({ map: tex, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.25 }));
  board.position.set((dir < 0 ? -50 : 50) * S, 58 * S, 2 * S); G.add(board);
  return G;
}
