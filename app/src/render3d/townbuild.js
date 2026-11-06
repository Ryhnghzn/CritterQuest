// Builds one outdoor town in 3D from its data (data/towns.js), once (plan "Tampilan 2.5D" §3).
// Each big town keeps its own look (theme.biome): Kota Awal timber & violet stone,
// Rimbawana log huts with thatched domes behind a palisade, Bekubara snowy stone halls,
// Pasirluas mud-brick houses with domes and awnings, Baraapi basalt with ember seams.
// Static parts are merged per material; walls and trees are instanced so they can sink
// for the cutaway; houses and tall landmarks are occluders that turn see-through.
import * as THREE from 'three';
import { S, toon, muted } from './stage.js';
import { GEO, glow, Batch, SinkSet, occluder, matrixOf, col, rgbCol, signTexture, tileTexture, rnd, wrapped } from './kit3d.js';
import { wallCells, treesOf } from './townkit.js';
import { drawIcon } from '../art/sprites.js';
import * as FLORA from './flora.js';
import { vtoon } from './fieldkit.js';
import { groundTexture, groundPattern, GROUND_P, BIOME_GROUND, TOWN_BIOME } from './paintground.js';
import { ILLUSTRATED, illustrated, flameSet } from './billprops.js';
import { LOOK } from '../data/look.js';

const TAU = Math.PI * 2;
const WARM = 0xffa050;

// per style
const STYLE = {
  home: { wallH: 70, wall: 0x4a4256, cap: 0x352e40, cell: 40, top: 'merlon', outside: 0x1a1620, tree: 'pine', sky: 0x0a0812, day: 0x56607a, mist: 0x0e0b18 },
  forest: { wallH: 58, wall: 0x6a4a2c, cap: 0x7a5a38, cell: 14, top: 'stake', outside: 0x121a10, tree: 'oak', sky: 0x08100c, day: 0x4e6a5a, mist: 0x0c1610 },
  ice: { wallH: 92, wall: 0x6a7890, cap: 0x7a88a0, cell: 40, top: 'snow', outside: 0x5a6478, tree: 'snowpine', sky: 0x0c1220, day: 0x7a8aa8, mist: 0x1a2232 },
  desert: { wallH: 52, wall: 0xa47c4c, cap: 0xb88c5c, cell: 34, top: 'crenel', outside: 0x3a2a1c, tree: 'palm', sky: 0x140c0a, day: 0x9a8268, mist: 0x2a1c14 },
  volcano: { wallH: 80, wall: 0x3e2c28, cap: 0x2e201e, cell: 40, top: 'spike', outside: 0x120b0a, tree: 'charred', sky: 0x140806, day: 0x5a3e36, mist: 0x1e0c08 },
};
export const styleOf = (def) => STYLE[def.id === 'home' ? 'home' : def.theme?.biome] || STYLE.home;
const keyOf = (def) => (def.id === 'home' ? 'home' : STYLE[def.theme?.biome] ? def.theme.biome : 'home');

// a unit shape centred at game (cx, cy), from height y0 up h (game units)
const P = (B, geo, mat, cx, cy, y0, w, h, d, ry = 0, rx = 0, rz = 0) => B.add(geo, mat, cx * S, (y0 + h / 2) * S, cy * S, w * S, h * S, d * S, rx, ry, rz);
// a shape whose base sits at y = 0 (gable, shed, dome)
const PB = (B, geo, mat, cx, cy, y0, w, h, d, ry = 0) => B.add(geo, mat, cx * S, y0 * S, cy * S, w * S, (geo === GEO.dome ? h * 2 : h) * S, d * S, 0, ry, 0);
const light = (out, x, y, h, color, int, dist, night = false) => out.push({ x, y, h, color: typeof color === 'string' ? rgbCol(color) : col(color), int, dist, night, ph: (x * 0.37 + y * 0.11) % 9 });

// ground tiles
const paintedTown = (key) => !!LOOK.paintGround?.towns.includes(key); // plan C2
function groundTile(key, def) {
  const theme = def.theme || {};
  if (paintedTown(key)) return groundTexture(BIOME_GROUND[TOWN_BIOME[key]].ground, 1.5);
  if (key === 'forest') return tileTexture(160, 256, (g, T) => {
    const r = rnd(311);
    g.fillStyle = '#2a2318'; g.fillRect(0, 0, T, T);
    for (let i = 0; i < 14; i++) { const x = r() * T, y = r() * T, rad = 14 + r() * 26; wrapped(T, x, y, rad, (px, py) => { g.beginPath(); g.ellipse(px, py, rad, rad * 0.6, 0, 0, TAU); g.fillStyle = i % 3 ? 'rgba(50,90,44,.6)' : 'rgba(70,54,32,.5)'; g.fill(); }); }
    g.strokeStyle = 'rgba(110,160,70,.6)'; g.lineWidth = 1.2; g.lineCap = 'round';
    for (let i = 0; i < 40; i++) { const x = r() * T, y = r() * T; wrapped(T, x, y, 6, (px, py) => { g.beginPath(); g.moveTo(px - 3, py); g.lineTo(px - 4, py - 5); g.moveTo(px, py); g.lineTo(px, py - 7); g.moveTo(px + 3, py); g.lineTo(px + 5, py - 5); g.stroke(); }); }
  });
  if (key === 'ice') return tileTexture(128, 256, (g, T) => {
    const r = rnd(523);
    g.fillStyle = '#8a98b0'; g.fillRect(0, 0, T, T);
    for (let i = 0; i < 9; i++) { const x = r() * T, y = r() * T, w = 12 + r() * 16, h = 8 + r() * 8; wrapped(T, x, y, w, (px, py) => { g.beginPath(); g.roundRect(px - w / 2, py - h / 2, w, h, 3); g.fillStyle = '#5f6b80'; g.fill(); }); }
    for (let i = 0; i < 12; i++) { const x = r() * T, y = r() * T, rad = 14 + r() * 22; wrapped(T, x, y, rad, (px, py) => { g.beginPath(); g.ellipse(px, py, rad, rad * 0.55, 0, 0, TAU); g.fillStyle = 'rgba(230,238,250,.4)'; g.fill(); }); }
  });
  if (key === 'desert') return tileTexture(160, 256, (g, T) => {
    const r = rnd(97);
    g.fillStyle = '#9a7650'; g.fillRect(0, 0, T, T);
    for (let i = 0; i < 10; i++) { const x = r() * T, y = r() * T, rad = 18 + r() * 30; wrapped(T, x, y, rad, (px, py) => { g.beginPath(); g.ellipse(px, py, rad, rad * 0.5, 0, 0, TAU); g.fillStyle = i % 2 ? 'rgba(190,150,100,.35)' : 'rgba(110,80,50,.3)'; g.fill(); }); }
    g.lineWidth = 1.4;
    for (let row = 0; row < 10; row++) {
      const y0 = row * 16 + 6; g.strokeStyle = row % 2 ? 'rgba(70,46,26,.3)' : 'rgba(220,180,130,.3)';
      g.beginPath(); for (let x = 0; x <= T; x += 8) { const y = y0 + Math.sin((x / T) * TAU * 2 + row) * 3; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    }
  });
  if (key === 'volcano') return tileTexture(200, 256, (g, T) => {
    const r = rnd(733);
    g.fillStyle = '#1a1110'; g.fillRect(0, 0, T, T);
    const n = 5, cell = T / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const cx = (i + 0.5) * cell + (r() - 0.5) * 14, cy = (j + 0.5) * cell + (r() - 0.5) * 10, rad = cell / 2 + 2, sides = 5 + Math.floor(r() * 3), rot = r() * TAU, d = Math.floor(r() * 14);
      const pts = []; for (let k = 0; k < sides; k++) { const a = rot + (k / sides) * TAU, rr = rad * (0.75 + r() * 0.3); pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
      wrapped(T, cx, cy, rad + 4, (px, py) => { g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(px + x, py + y) : g.moveTo(px + x, py + y))); g.closePath(); g.fillStyle = `rgb(${52 + d},${38 + d},${35 + d})`; g.fill(); });
    }
    g.strokeStyle = 'rgba(230,100,40,.45)'; g.lineWidth = 1.3;
    for (let i = 0; i < 2; i++) { const x = 20 + r() * (T - 60), y = 20 + r() * (T - 60); g.beginPath(); g.moveTo(x, y); g.lineTo(x + 9, y + 6); g.lineTo(x + 13, y + 16); g.lineTo(x + 22, y + 19); g.stroke(); }
  });
  // cobbles (Kota Awal: violet-grey)
  return tileTexture(96, 256, (g, T) => {
    const r = rnd(77);
    g.fillStyle = theme.ground || '#1d1b2c'; g.fillRect(0, 0, T, T);
    for (let row = 0; row < 8; row++) {
      const y = row * 12, shift = row % 2 ? 9 : 0;
      let x = 0;
      while (x < T) {
        const w = Math.min(T - x, 13 + Math.floor(r() * 9)), d = Math.floor(r() * 14);
        const c = theme.stone ? `rgb(${theme.stone[0] + d},${theme.stone[1] + d},${theme.stone[2] + d})` : `rgb(${58 + d},${56 + d},${74 + d})`;
        for (const ox of [shift, shift - T]) { g.beginPath(); g.roundRect(x + ox + 0.8, y + 0.8, w - 1.6, 10.4, 3.5); g.fillStyle = c; g.fill(); }
        x += w;
      }
    }
  });
}

// roads, plaza and doorsteps painted once over the ground (low resolution, transparent)
function pathsTexture(key, def, heart, gate, houses) {
  const k = Math.min(0.7, 1600 / Math.max(def.w, def.h));
  const c = document.createElement('canvas'); c.width = Math.ceil(def.w * k); c.height = Math.ceil(def.h * k);
  const g = c.getContext('2d'); g.scale(k, k);
  const r = rnd(def.w + 17), gx = gate.x + gate.w / 2;
  const PAVE = { home: 'rgba(150,140,200,.16)', forest: '#5a5242', ice: 'rgba(80,92,112,.75)', desert: 'rgba(196,160,112,.75)', volcano: 'rgba(70,52,46,.85)' }[key];
  if (key === 'forest') { // stepping stones: a ring round the tree, a path to the gate, one before each door
    const stone = (x, y) => { g.beginPath(); g.ellipse(x, y, 13 + r() * 5, 8 + r() * 3, r(), 0, TAU); g.fillStyle = PAVE; g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(0,0,0,.4)'; g.stroke(); };
    for (let a = 0; a < TAU; a += 0.16) stone(heart.x + Math.cos(a) * 200, heart.y + 40 + Math.sin(a) * 140);
    for (let y = heart.y + 190; y < gate.y + 20; y += 30) stone(gx + Math.sin(y * 0.02) * 14, y);
    for (const b of houses) for (let i = 0; i < 2; i++) stone(b.x + b.w / 2 + (r() - 0.5) * 10, b.y + b.h + 14 + i * 22);
  } else {
    const plaza = () => { g.beginPath(); g.ellipse(heart.x, heart.y + 30, key === 'home' ? 200 : 260, key === 'home' ? 140 : 180, 0, 0, TAU); };
    const roads = [[gx - 60, heart.y, 120, gate.y + 30 - heart.y], ...houses.map((b) => [b.x + b.w / 2 - 34, b.y + b.h, 68, 40])];
    if (paintedTown(key)) { // cobbled plaza and roads laid into the grass, a dark worn verge round them
      g.fillStyle = 'rgba(12,10,8,.45)'; plaza(); g.lineWidth = 16; g.strokeStyle = 'rgba(12,10,8,.35)'; g.stroke();
      for (const [x, y, w, h] of roads) { g.strokeRect(x, y, w, h); }
      g.fillStyle = groundPattern(g, 'cobble', 1, { cell: 14 });
      plaza(); g.fill();
      for (const [x, y, w, h] of roads) g.fillRect(x, y, w, h);
    } else {
      g.fillStyle = PAVE;
      plaza(); g.fill();
      if (key === 'home') { g.lineWidth = 3; g.strokeStyle = 'rgba(170,160,210,.2)'; g.stroke(); }
      for (const [x, y, w, h] of roads) g.fillRect(x, y, w, h);
    }
    if (key !== 'home') { // joints between the slabs
      g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1.5;
      for (let y = heart.y + 20; y < gate.y + 30; y += 34) { g.beginPath(); g.moveTo(gx - 60, y); g.lineTo(gx + 60, y); g.stroke(); }
    }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// the town
// mats: shared materials driven per frame by Town25 { nightMats, emberMat, runeMat, lavaMat, lampMat }
export function buildTown(def, mats) {
  const key = keyOf(def), st = STYLE[key];
  const root = new THREE.Group(); root.name = `town:${def.id}`;
  const B = new Batch();
  const out = { def, key, style: key, st, root, occluders: [], sinks: [], lights: [], flames: [], embers: [], smokes: [], doors: [], carts: [], lamps: [], ...mats };
  const houses = def.buildings.filter((b) => b.kind === 'house');
  const gate = def.buildings.find((b) => b.kind === 'gate');
  const fire = def.buildings.find((b) => b.kind === 'fire');
  const heartB = fire || def.buildings.find((b) => ['bigtree', 'pond', 'oasis', 'monument'].includes(b.kind));
  const heart = heartB ? { x: heartB.x + heartB.w / 2, y: heartB.y + heartB.h / 2 } : { ...def.spawn };
  out.heart = heart;

  // ground: the town inside the walls, darker land outside
  const tile = groundTile(key, def), TS = paintedTown(key) ? GROUND_P : { home: 96, forest: 160, ice: 128, desert: 160, volcano: 200 }[key];
  const tIn = tile.clone(); tIn.repeat.set(def.w / TS, def.h / TS); tIn.needsUpdate = true;
  const floor = new THREE.Mesh(GEO.plane, muted(new THREE.MeshLambertMaterial({ map: tIn })));
  floor.rotation.x = -Math.PI / 2; floor.scale.set(def.w * S, def.h * S, 1); floor.position.set(def.w / 2 * S, 0, def.h / 2 * S);
  root.add(floor);
  const M = 1400, tOut = tile.clone(); tOut.repeat.set((def.w + M * 2) / TS, (def.h + M * 2) / TS); tOut.needsUpdate = true;
  const land = new THREE.Mesh(GEO.plane, muted(new THREE.MeshLambertMaterial({ map: tOut, color: col(0x8a8a8a).lerp(col(st.outside), 0.5) })));
  land.rotation.x = -Math.PI / 2; land.scale.set((def.w + M * 2) * S, (def.h + M * 2) * S, 1); land.position.set(def.w / 2 * S, -0.03, def.h / 2 * S);
  root.add(land);
  const paths = new THREE.Mesh(GEO.plane, muted(new THREE.MeshLambertMaterial({ map: pathsTexture(key, def, heart, gate, houses), transparent: true, depthWrite: false })));
  paths.rotation.x = -Math.PI / 2; paths.scale.copy(floor.scale); paths.position.set(def.w / 2 * S, 0.012, def.h / 2 * S); paths.renderOrder = 1;
  root.add(paths);
  if (key === 'home' && !paintedTown(key)) cobbles(root, def); // painted: grass with cobbled roads instead

  walls(root, def, st, out);
  trees(root, def, key, out);
  for (const b of houses) house(root, b, key, out);
  gateOf(root, gate, key, st, out);
  for (const b of def.buildings) {
    if (b.kind === 'fence') fenceOf(B, b);
    else if (b.kind === 'fire') bonfire(B, root, b, out);
    else if (b.kind === 'stall') stall(B, b);
    else if (b.kind !== 'house' && b.kind !== 'gate') feature(B, root, b, key, out);
  }
  const lava = def.buildings.filter((b) => b.kind === 'lava');
  if (lava.length) lavaBand(root, lava, out);
  for (const l of def.lamps) lamp(B, l, out);
  decor(root, def.decor);
  for (const n of def.npcs) {
    if (n.object === 'stone') runeStone(B, root, n, out);
    if (n.night) nightCart(root, n, out);
  }
  B.build(root);
  lampHeads(root, out);
  root.traverse((o) => { if (o.isMesh && !o.isInstancedMesh) { o.matrixAutoUpdate = o.matrixAutoUpdate && !!o.userData.anim; if (!o.matrixAutoUpdate) o.updateMatrix(); } });
  return out;
}

// 3D cobbles over Kota Awal's plaza (instanced, one draw call)
function cobbles(root, def) {
  const size = 25, T = def.wall, nx = Math.floor((def.w - T * 2) / size), nz = Math.floor((def.h - T * 2) / size);
  const im = new THREE.InstancedMesh(GEO.box, toon(0xffffff), nx * nz);
  const c = new THREE.Color(), r = rnd(7), m = new THREE.Matrix4();
  let n = 0;
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const x = T + size / 2 + i * size + (j % 2) * 7, y = T + size / 2 + j * size;
    if (x > def.w - T - 6) continue;
    im.setMatrixAt(n, matrixOf(x * S, -0.05 + r() * 0.03, y * S, size * 0.93 * S, 0.14, size * 0.93 * S, 0, (r() - 0.5) * 0.12, 0, m));
    im.setColorAt(n, c.setHSL(0.72 + (r() - 0.5) * 0.06, 0.1, 0.2 + r() * 0.07)); n++;
  }
  im.count = n; root.add(im);
}

function walls(root, def, st, out) {
  const cells = wallCells(def, st.cell), H = st.wallH, T = def.wall, C = st.cell;
  const items = cells.map((c) => ({ x: c.x, y: c.y, ry: c.alongX ? 0 : Math.PI / 2, sx: c.len / C }));
  const kind = WALL_KIND[st.top] || 'stone', body = toon(st.wall, 0x3a2a5a, kind), cap = toon(st.cap, 0, kind), snow = toon(0xeef3ff);
  const m = (x, y, z, sx, sy, sz) => matrixOf(x * S, y * S, z * S, sx * S, sy * S, sz * S, 0, 0, 0, new THREE.Matrix4());
  const parts = [];
  if (st.top === 'stake') { // palisade: sharpened logs
    parts.push({ geo: GEO.cyl6, mat: body, m: m(0, H / 2, 0, C * 0.95, H, C * 0.95) });
    parts.push({ geo: GEO.cone, mat: toon(0x8a6a44), m: m(0, H + 7, 0, C * 0.95, 14, C * 0.95) });
  } else {
    parts.push({ geo: GEO.box, mat: body, m: m(0, H / 2, 0, C * 1.01, H, T) });
    if (st.top === 'merlon' || st.top === 'snow') parts.push({ geo: GEO.box, mat: cap, m: m(0, H + 7, 0, C * 0.5, 14, T) });
    if (st.top === 'snow') {
      parts.push({ geo: GEO.box, mat: snow, m: m(0, H + 15, 0, C * 0.56, 4, T + 3) });
      parts.push({ geo: GEO.box, mat: snow, m: m(0, H + 1.5, 0, C * 1.01, 3, T + 2) });
    }
    if (st.top === 'crenel') parts.push({ geo: GEO.dome, mat: cap, m: m(0, H, 0, C * 0.62, 26, T * 0.9) });
    if (st.top === 'spike') {
      parts.push({ geo: GEO.cone4, mat: cap, m: m(0, H + 9, 0, C * 0.55, 18, T * 0.8) });
      parts.push({ geo: GEO.box, mat: glow(0xff5a1a, 1.4), m: m(0, H * 0.45, 0, C * 0.6, 2.2, T + 1.5) });
    }
  }
  out.sinks.push(new SinkSet(root, items, parts, 'y'));
}

// town trees drawn by flora.js: radius in game units (about the old trees' size), rim light
const FLORA_TREE = {
  pine: { r: 31, rim: 0x2a4a3a, geo: (v) => FLORA.pine(v) },
  oak: { r: 30, rim: 0x3a5a2a, geo: (v) => FLORA.oak(v) },
  snowpine: { r: 31, rim: 0x8ab8e8, geo: (v) => FLORA.pine(v, true) },
};
const TREE_PARTS = {
  pine: () => [[GEO.cyl6, 0x2a1e1a, 0, 10, 0, 8, 20, 8], [GEO.cone, 0x1c2832, 0, 42, 0, 64, 52, 64], [GEO.cone, 0x223040, 0, 74, 0, 46, 40, 46]],
  oak: () => [[GEO.cyl6, 0x2a1d12, 0, 20, 0, 12, 40, 12], [GEO.blob, 0x1e3a22, -16, 52, 0, 46, 40, 46], [GEO.blob, 0x1e3a22, 16, 50, 4, 46, 40, 46], [GEO.blob, 0x284a2a, 0, 70, -4, 54, 46, 54]],
  snowpine: () => [[GEO.cyl6, 0x2a1e1a, 0, 10, 0, 8, 20, 8], [GEO.cone, 0x1e2e3a, 0, 42, 0, 64, 52, 64], [GEO.cone, 0x24384a, 0, 72, 0, 46, 40, 46], [GEO.cone, 0xe8eef8, 0, 86, 0, 24, 16, 24]],
  palm: () => [[GEO.cyl6, 0x4a3420, 4, 30, 0, 7, 62, 7, 0, 0, -0.12], ...[0, 1, 2, 3, 4, 5].map((i) => [GEO.blob, 0x2a4a22, 4 + Math.cos(i * 1.05) * 18, 60, Math.sin(i * 1.05) * 18, 40, 6, 14, 0, -i * 1.05, -0.35])],
  cactus: () => [[GEO.cyl6, 0x2e4a28, 0, 30, 0, 12, 62, 12], [GEO.cyl6, 0x2e4a28, -14, 30, 0, 7, 22, 7], [GEO.cyl6, 0x2e4a28, 13, 38, 0, 7, 20, 7]],
  charred: () => [[GEO.cyl6, 0x1a1210, 0, 28, 0, 9, 56, 9], [GEO.cyl6, 0x1a1210, -9, 46, 0, 4, 28, 4, 0, 0, 0.8], [GEO.cyl6, 0x1a1210, 9, 54, 0, 4, 28, 4, 0, 0, -0.7], [GEO.cyl6, 0x1a1210, -4, 62, 0, 3, 22, 3, 0.3, 0, 0.3]],
  rock: () => [[GEO.blob, 0x261a16, 0, 10, 0, 44, 26, 36], [GEO.box, 'ember', 0, 14, 16, 20, 2, 3, 0, 0.3, 0]],
};
// town tree kinds drawn as illustrated props (plan C5) besides the flora.js ones
const ILL_TOWN = { palm: 'palm', cactus: 'cactus', charred: 'deadtree' };
function trees(root, def, key, out) {
  const kind = STYLE[key].tree, groups = new Map();
  for (const p of treesOf(def)) {
    let k = kind;
    if (kind === 'palm' && p.v < 0.35) k = 'cactus';
    if (kind === 'charred' && p.v < 0.3) { k = 'rock'; light(out.lights, p.x, p.y, 20, '255,110,40', 4, 3.5); }
    if (FLORA_TREE[k] || (LOOK.illustrated?.towns && ILL_TOWN[k])) k = `${k}~${Math.floor(p.v * 7) % FLORA.VARIANTS}`; // flora.js / illustrated variants
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push({ x: p.x, y: p.y, s: p.s, ry: p.v * TAU });
  }
  for (const [k, items] of groups) {
    const [base, variant] = k.split('~'), F = FLORA_TREE[base] || (ILL_TOWN[base] && LOOK.illustrated?.towns ? { r: 30 } : null);
    if (F) {
      const m = matrixOf(0, 0, 0, F.r * S, F.r * S, F.r * S, 0, 0, 0, new THREE.Matrix4());
      const ik = ILL_TOWN[base] || base;
      if (LOOK.illustrated?.towns && ILLUSTRATED.has(ik)) { // plan C3 / C5: the prototype's painted trees
        const ill = illustrated(ik, TOWN_BIOME[key] || 'forest', Number(variant));
        const set = new SinkSet(root, items, [{ geo: ill.geo, mat: ill.mat, m }], 'all', 520);
        set.parts[0].im.customDepthMaterial = ill.depth;
        out.sinks.push(set);
        continue;
      }
      out.sinks.push(new SinkSet(root, items, [{ geo: F.geo(Number(variant)), mat: vtoon(F.rim, false), m }], 'all', 520));
      continue;
    }
    const parts = TREE_PARTS[k]().map(([geo, c, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0]) => ({
      geo, mat: c === 'ember' ? glow(0xff6a20, 1.6) : toon(c), m: matrixOf(x * S, y * S, z * S, sx * S, sy * S, sz * S, rx, ry, rz, new THREE.Matrix4()),
    }));
    out.sinks.push(new SinkSet(root, items, parts, 'all', 520));
  }
}

// surface per style of wall top (texkit.js) — palisades are wood, mud walls plaster
const WALL_KIND = { stake: 'wood', crenel: 'plaster' };
const ROOF_KIND = { forest: 'thatch', desert: 'plaster' };

// houses
const PLASTER = { inn: 0xb89a7a, potion: 0x9a90b0, smith: 0x8a7a6a, guild: 0xa0a88a };
function house(root, b, key, out) {
  const B = new Batch(), grp = new THREE.Group(); root.add(grp);
  const { x, y, w, h: d } = b, cx = x + w / 2, cz = y + d / 2, front = y + d, roof = toon(b.roof || '#5a3a2a', 0x4a2a3a, ROOF_KIND[key] || 'roof');
  const dark = toon(0x1e140e, 0, 'wood'), beam = toon(0x3a2418, 0, 'wood');
  let H = 95, signY = 70, chimney = null;
  const windows = []; // [x, height, w, h]
  if (key === 'home') {
    P(B, GEO.box, toon(PLASTER[b.theme] || 0xa09080, 0x5a3a2a, 'plaster'), cx, cz, 0, w, H, d);
    P(B, GEO.box, toon(0x3e3640, 0, 'stone'), cx, cz, 0, w + 4, 11, d + 4);
    for (const fx of [-w / 2 + 4, -w / 6, w / 6, w / 2 - 4]) P(B, GEO.box, beam, cx + fx, front + 1.4, 0, 6, H, 3);
    P(B, GEO.box, beam, cx, front + 1.4, H * 0.55, w, 6, 3); P(B, GEO.box, beam, cx, front + 1.4, H - 6, w, 6, 3);
    PB(B, GEO.gable, roof, cx, cz, H, w + 24, 60, d + 24);
    windows.push([-w / 3.2, 55, 20, 20], [w / 3.2, 55, 20, 20]);
    chimney = [cx - w / 3, cz - d / 6, H + 20, 18, 60];
    if (b.theme === 'smith') {
      P(B, GEO.box, toon(0x2a2a30), x + 34, front + 26, 0, 22, 16, 14);
      const coal = new THREE.Mesh(GEO.box, glow(0xff5a1a, 2.4)); coal.scale.set(14 * S, 4 * S, 9 * S); coal.position.set((x + 34) * S, 17 * S, (front + 26) * S); grp.add(coal);
      light(out.lights, x + 34, front + 30, 26, 0xff6a2a, 7, 6);
      out.embers.push({ x: x + 34, y: front + 26, h: 18, kind: 'spark' });
    }
    if (b.theme === 'potion') light(out.lights, cx - 52, front + 24, 30, '90,255,140', 2.5, 4.5, true);
  } else if (key === 'forest') {
    H = 78;
    P(B, GEO.cyl, toon(0x6a4a2e, 0x3a2a1a, 'log'), cx, cz, 0, w - 16, H, d - 16);
    for (const hy of [16, 36, 56]) P(B, GEO.cyl, toon(0x4a3220), cx, cz, hy, w - 13, 4, d - 13);
    PB(B, GEO.dome, roof, cx, cz, H - 12, w + 26, 88, d + 26);
    P(B, GEO.cyl, toon(new THREE.Color(b.roof || '#2f5a3a').multiplyScalar(0.7).getHex()), cx, cz, H - 14, w + 28, 10, d + 28);
    for (let i = 0; i < 7; i++) { const a = Math.PI * (0.15 + i * 0.7 / 6); P(B, GEO.ball, toon(i % 2 ? 0x2f5a2a : 0x3e6b32), cx - Math.cos(a) * (w / 2 - 8), cz + Math.sin(a) * (d / 2 - 8), -6, 22, 16, 18); }
    windows.push([-w / 4, 48, 22, 22, 'round'], [w / 4, 48, 22, 22, 'round']);
    signY = 62;
    // lantern on a crook by the door (glows after dark)
    P(B, GEO.box, toon(0x2a1d19), cx - 34, front + 4, 40, 3, 30, 3);
    out.lamps.push({ x: cx - 34, y: front + 8, h: 66, s: 9 });
    light(out.lights, cx - 34, front + 14, 62, '255,210,130', 4, 5, true);
  } else if (key === 'ice') {
    H = 112;
    P(B, GEO.box, toon(0x66748c, 0x4a5a7a, 'stone'), cx, cz, 0, w - 10, H, d - 6);
    PB(B, GEO.gable, roof, cx, cz, H, w + 18, 92, d + 18);
    PB(B, GEO.gable, toon(0xeef3ff), cx, cz, H + 92 * 0.64, w + 22, 92 * 0.38, (d + 22) * 0.38);
    P(B, GEO.box, toon(0xeef3ff), cx, front + 9, H - 2, w + 22, 6, 10);
    for (let ix = x; ix < x + w; ix += 16) P(B, GEO.cone, toon(0xc8e2ff), ix + 4, front + 10, H - 6 - 10, 4, 14, 4, 0, Math.PI);
    windows.push([-w / 3.4, 60, 22, 30], [w / 3.4, 60, 22, 30]);
    chimney = [cx + w * 0.22, cz - d / 8, H + 30, 20, 80, true];
  } else if (key === 'desert') {
    H = 100;
    const mud = toon(0xb8905e, 0x6a4a2a, 'plaster');
    P(B, GEO.box, mud, cx, cz, 0, w - 8, H, d - 8);
    P(B, GEO.box, toon(0xa07a4e, 0, 'plaster'), cx, cz, H, w - 4, 5, d - 4);
    for (let px = x + 14; px < x + w - 8; px += 26) for (const pz of [y + 4, front - 4]) PB(B, GEO.dome, mud, px, pz, H + 4, 18, 12, 6);
    for (let px = x + 20; px < x + w - 14; px += 30) P(B, GEO.cyl6, toon(0x4a2e1a), px, front - 2, H - 22, 6, 6, 16, 0, Math.PI / 2);
    if (b.sign) {
      const r = Math.min(34, w * 0.18) * 2;
      P(B, GEO.cyl, toon(0xa07a4e), cx, cz, H + 4, r + 8, 10, r + 8);
      PB(B, GEO.dome, roof, cx, cz, H + 14, r, r / 2, r);
      P(B, GEO.cyl6, toon(0xe6c27a), cx, cz, H + 14 + r / 2, 2, 14, 2);
      P(B, GEO.ball, toon(0xe6c27a), cx, cz, H + 28 + r / 2, 6, 6, 6);
    } else {
      for (const px of [x + 22, x + w - 22]) for (const pz of [cz - 20, cz + 30]) P(B, GEO.cyl6, toon(0x4a2e1a), px, pz, H, 4, 34, 4);
      for (let i = 0; i < 6; i++) P(B, GEO.box, toon(i % 2 ? 0xf1e2c4 : (b.roof || '#a8502a')), x + 22 + (w - 44) * (i + 0.5) / 6, cz + 5, H + 34, (w - 44) / 6, 3, 56, 0.12);
    }
    windows.push([-w / 3.4, 52, 22, 30, 'arch'], [w / 3.4, 52, 22, 30, 'arch']);
    for (const [px, s2] of [[x + 16, 1], [x + w - 16, 0.8]]) P(B, GEO.ball, toon(0xa8502a), px, front + 10, 0, 16 * s2, 18 * s2, 16 * s2);
  } else { // volcano
    H = 96;
    P(B, GEO.box, toon(0x463432, 0x5a2a1a, 'stone'), cx, cz, 0, w - 6, H, d - 6);
    PB(B, GEO.shed, roof, cx, cz, H, w + 20, 52, d + 20);
    const ember = out.emberMat;
    for (const [sx, sy, len, rz] of [[x + 16, 30, 26, 0.3], [x + 22, 52, 20, -0.4], [x + w - 18, 24, 30, -0.25], [x + w - 24, 46, 18, 0.5]]) {
      const m = new THREE.Mesh(GEO.box, ember); m.scale.set(2.6 * S, len * S, 1.5 * S); m.position.set(sx * S, sy * S, (front - 2.4) * S); m.rotation.z = rz; grp.add(m);
    }
    windows.push([-w / 3.4, 54, 22, 26], [w / 3.4, 54, 22, 26]);
    P(B, GEO.box, toon(0x3a2a26, 0, 'stone'), x + 32, cz - d / 4, H - 10, 24, 80, 24);
    if (LOOK.illustrated) grp.add(flameSet([{ x: x + 32, y: cz - d / 4, h: H + 68, s: 1.3 }])); // plan C4: a drawn, moving flame
    else {
      const flame = new THREE.Mesh(GEO.cone, glow(0xff7a2a, 2.2)); flame.scale.set(14 * S, 26 * S, 14 * S); flame.position.set((x + 32) * S, (H + 83) * S, (cz - d / 4) * S);
      flame.userData.anim = true; flame.userData.flicker = x * 0.1; grp.add(flame); out.flames.push(flame);
    }
    out.embers.push({ x: x + 32, y: cz - d / 4, h: H + 76, kind: 'spark' });
    light(out.lights, x + 32, cz - d / 4, H + 90, 0xff6a2a, 5, 6);
  }
  // door with a lintel, windows with frames
  const dw = 32, dh = key === 'ice' ? 54 : 50, fz = key === 'forest' ? front - 8 : key === 'desert' ? front - 4 : key === 'ice' ? front - 3 : front;
  P(B, GEO.box, dark, cx, fz + 1.6, 0, dw, dh, 3);
  P(B, GEO.box, beam, cx, fz + 2.4, dh, dw + 8, 5, 5);
  for (const [wx, wy, ww, wh, shape] of windows) {
    let wz = fz;
    if (key === 'forest') wz = cz + (d - 16) / 2 * Math.sqrt(Math.max(0, 1 - (wx / ((w - 16) / 2)) ** 2)) - 1;
    P(B, GEO.box, beam, cx + wx, wz + 1.2, wy - wh / 2 - 3, ww + 6, wh + 6, 2.4);
    const glass = new THREE.Mesh(shape === 'round' ? GEO.disc : GEO.plane, out.nightMats.window);
    glass.scale.set(ww * S, (shape === 'round' ? ww : wh) * S, 1); glass.position.set((cx + wx) * S, wy * S, (wz + 2.6) * S);
    grp.add(glass);
  }
  if (chimney) {
    const [hx, hz, hy, s, hh, snow] = chimney;
    P(B, GEO.box, toon(snow ? 0x56637a : 0x352e40, 0, 'stone'), hx, hz, hy - 20, s, hh, s);
    if (snow) P(B, GEO.box, toon(0xeef3ff), hx, hz, hy - 20 + hh, s + 6, 5, s + 6);
    out.smokes.push({ x: hx, y: hz, h: hy - 20 + hh + 4 });
  }
  // hanging icon sign by the door
  if (b.sign) {
    const sx = cx + w / 2 - 34;
    P(B, GEO.box, beam, sx, fz + 14, signY + 30, 3, 3, 28);
    const sign = new THREE.Mesh(GEO.plane, signMat(b.sign));
    sign.scale.set(24 * S, 24 * S, 1); sign.position.set(sx * S, (signY + 16) * S, (fz + 24) * S); grp.add(sign);
  }
  const meshes = B.build(grp);
  grp.traverse((o) => { if (o.isMesh && !meshes.includes(o)) meshes.push(o); });
  out.occluders.push(occluder(grp, meshes, x - 12, y - 12, x + w + 12, front + 12, H + 70));
  out.doors.push({ b, x: cx, y: front, top: dh + 26 });
  light(out.lights, cx, front + 22, dh + 10, WARM, 3, 4.5, true);
}
const SIGN_MAT = new Map();
function signMat(id) {
  let m = SIGN_MAT.get(id);
  if (!m) { m = new THREE.MeshLambertMaterial({ map: signTexture(id, drawIcon), side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: signTexture(id, drawIcon), emissiveIntensity: 0.25 }); SIGN_MAT.set(id, m); }
  return m;
}

// the gate: two towers, an arch, a glowing way out
function gateOf(root, b, key, st, out) {
  const B = new Batch(), grp = new THREE.Group(); root.add(grp);
  const cx = b.x + b.w / 2, gz = b.y + b.h * 0.72, D = 56, TW = 50, H = st.wallH + 60;
  const gk = key === 'forest' ? 'wood' : key === 'desert' ? 'plaster' : 'stone';
  const stone = key === 'forest' ? toon(0x6a4a2c, 0x3a2a1a, gk) : toon(st.wall, 0x3a2a5a, gk), cap = toon(st.cap, 0, gk);
  for (const sgn of [-1, 1]) {
    const tx = cx + sgn * (b.w / 2 - TW / 2);
    if (key === 'forest') {
      for (const [ox, oz] of [[-12, -12], [12, -12], [-12, 12], [12, 12]]) P(B, GEO.cyl6, stone, tx + ox, gz + oz, 0, 24, H, 24);
      PB(B, GEO.dome, toon(0x3e6b32), tx, gz, H - 4, TW + 22, 26, D + 16);
    } else {
      P(B, GEO.box, stone, tx, gz, 0, TW, H, D);
      if (key === 'desert') PB(B, GEO.dome, toon(0xc2843a), tx, gz, H, TW, 26, D * 0.8);
      else for (const [ox, oz] of [[-15, -18], [15, -18], [-15, 18], [15, 18]]) P(B, GEO.box, cap, tx + ox, gz + oz, H, 16, 14, 16);
      if (key === 'ice') P(B, GEO.box, toon(0xeef3ff), tx, gz, H - 1, TW + 2, 4, D + 2);
    }
    // torches on the town side
    P(B, GEO.box, toon(0x3a2a22), tx - sgn * 4, gz - D / 2 - 6, 52, 4, 16, 4);
    out.lamps.push({ x: tx - sgn * 4, y: gz - D / 2 - 6, h: 72, s: 9, always: true });
    light(out.lights, tx - sgn * 4, gz - D / 2 - 18, 76, 0xff8a3a, 7, 7);
  }
  const span = b.w - TW * 2;
  if (key === 'forest') { // a bent-branch arch with leaves
    const arch = new THREE.Mesh(new THREE.TorusGeometry(span / 2 * S, 7 * S, 6, 16, Math.PI), toon(0x5a3e24));
    arch.position.set(cx * S, (H - 30) * S, gz * S); grp.add(arch);
    for (let i = 0; i < 7; i++) { const a = (i / 6) * Math.PI; P(B, GEO.ball, toon(i % 2 ? 0x2f5a2a : 0x3e6b32), cx + Math.cos(a) * span / 2, gz, H - 30 + Math.sin(a) * span / 2 - 6, 26, 18, 22); }
  } else {
    P(B, GEO.box, stone, cx, gz, H - 50, span, 50, D * 0.8);
    if (key === 'ice') P(B, GEO.box, toon(0xeef3ff), cx, gz, H - 1, span, 4, D * 0.8 + 2);
    for (let i = 0; i < 7; i++) P(B, GEO.box, toon(0x1a161e), cx - span / 2 + 8 + i * (span - 16) / 6, gz, 18, 3, H - 68, 3);
  }
  // the way out: a violet glow in the arch and on the ground
  const veil = new THREE.Mesh(GEO.plane, new THREE.MeshBasicMaterial({ color: col(0x8a5aff).multiplyScalar(1.3), transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  veil.scale.set(span * S, (H - 50) * S, 1); veil.position.set(cx * S, (H - 50) / 2 * S, (gz + 4) * S); grp.add(veil);
  const pool = new THREE.Mesh(GEO.disc, new THREE.MeshBasicMaterial({ color: 0x8a5aff, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending })); pool.rotation.x = -Math.PI / 2; pool.scale.set(span * 1.3 * S, 70 * S, 1); pool.position.set(cx * S, 0.03, (gz - D / 2 - 10) * S); grp.add(pool);
  out.veil = veil.material;
  light(out.lights, cx, gz - D / 2 - 30, 40, '150,100,255', 6, 6);
  const meshes = B.build(grp);
  grp.traverse((o) => { if (o.isMesh && !meshes.includes(o) && o !== veil && o !== pool) meshes.push(o); });
  out.occluders.push(occluder(grp, meshes, b.x, gz - D / 2, b.x + b.w, gz + D / 2, H + 60));
}

function fenceOf(B, b) {
  const wood = toon(0x5a3e28, 0, 'wood'), cx = b.x + b.w / 2;
  for (let k = 0; k < 4; k++) P(B, GEO.box, wood, cx, b.y + 4 + (k / 3) * (b.h - 8), 0, 7, 26, 7);
  for (const hy of [9, 19]) P(B, GEO.box, wood, cx, b.y + b.h / 2, hy, 3, 3.5, b.h);
}

function bonfire(B, root, b, out) {
  const cx = b.x + b.w / 2, cz = b.y + b.h / 2;
  for (let k = 0; k < 6; k++) P(B, GEO.box, toon(0x4a3020), cx, cz, 3, 32, 5, 5, (k / 6) * Math.PI);
  for (let k = 0; k < 9; k++) { const a = (k / 9) * TAU; P(B, GEO.box, toon(0x4a4256), cx + Math.cos(a) * 24, cz + Math.sin(a) * 18, 0, 11, 8, 11, a); }
  if (LOOK.illustrated) { // plan C4: three drawn flames licking out of the logs
    root.add(flameSet([{ x: cx, y: cz + 2, h: 2, s: 2.7 }, { x: cx - 11, y: cz + 4, h: 2, s: 1.8 }, { x: cx + 10, y: cz + 5, h: 2, s: 1.6 }]));
  } else {
    const flame = new THREE.Group(); flame.position.set(cx * S, 6 * S, cz * S); root.add(flame);
    for (const [r, h, c, y] of [[13, 38, 0xff6a2a, 19], [8, 28, 0xffb347, 14], [4, 18, 0xfff0b0, 9]]) {
      const m = new THREE.Mesh(GEO.cone, glow(c, 2)); m.scale.set(r * 2 * S, h * S, r * 2 * S); m.position.y = y * S; m.userData.anim = true; flame.add(m);
    }
    flame.userData.flicker = 0; out.flames.push(flame);
  }
  out.embers.push({ x: cx, y: cz, h: 20, kind: 'ember' });
  light(out.lights, cx, cz, 36, 0xff7a2a, 30, 16);
}

function stall(B, b) {
  const cx = b.x + b.w / 2, cz = b.y + b.h / 2;
  P(B, GEO.box, toon(0x5a3e28), cx, cz + b.h * 0.2, 0, b.w, 22, b.h * 0.4);
  for (let k = 0; k < 6; k++) P(B, GEO.box, toon(k % 2 ? 0xe0527a : 0xf0e0d0), b.x + b.w / 12 + (k * b.w) / 6, cz, 50, b.w / 6, 3, b.h * 0.95, 0, 0.25);
  for (const s of [-1, 1]) P(B, GEO.box, toon(0x3a2a22), cx + s * (b.w / 2 - 3), cz - b.h * 0.35, 0, 3, 52, 3);
  P(B, GEO.box, toon(0x9ab0d8), cx - b.w * 0.25, cz + b.h * 0.2, 22, 14, 18, 2); // the barber's mirror
}

function lamp(B, l, out) {
  P(B, GEO.cyl6, toon(0x2a2228), l.x, l.y, 0, 4, 66, 4);
  P(B, GEO.box, toon(0x2a2228), l.x, l.y, 76, 14, 3, 14);
  out.lamps.push({ x: l.x, y: l.y, h: 69, s: 10 });
  light(out.lights, l.x, l.y, 66, 0xffb060, 10, 10, true);
}

const DECOR = {
  barrel: [[GEO.cyl, 0x6a4a2c, 0, 10, 0, 18, 20, 18], [GEO.cyl, 0x2a2228, 0, 15, 0, 19, 2, 19], [GEO.cyl, 0x2a2228, 0, 5, 0, 19, 2, 19]],
  crate: [[GEO.box, 0x7a5a34, 0, 9, 0, 18, 18, 18, 0, 0.3, 0], [GEO.box, 0x4c3324, 0, 9, 0, 19, 3, 19, 0, 0.3, 0]],
  bench: [[GEO.box, 0x6a4a2c, 0, 12, 0, 40, 3, 11], [GEO.box, 0x4a3020, -15, 5, 0, 3, 11, 9], [GEO.box, 0x4a3020, 15, 5, 0, 3, 11, 9]],
};
function decor(root, list) {
  for (const [kind, parts] of Object.entries(DECOR)) {
    const items = list.filter((d) => d.kind === kind);
    if (!items.length) continue;
    const base = new THREE.Matrix4(), loc = new THREE.Matrix4(), m = new THREE.Matrix4();
    for (const [geo, c, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0] of parts) {
      const im = new THREE.InstancedMesh(geo, toon(c), items.length);
      matrixOf(x * S, y * S, z * S, sx * S, sy * S, sz * S, rx, ry, rz, loc);
      items.forEach((d, i) => { matrixOf(d.x * S, 0, d.y * S, 1, 1, 1, 0, 0, 0, base); im.setMatrixAt(i, m.multiplyMatrices(base, loc)); });
      root.add(im);
    }
  }
}

function runeStone(B, root, n, out) {
  const stone = toon(0x3e3a56, 0x5a4a9a);
  P(B, GEO.cyl, toon(0x2e2a40), n.x, n.y, 0, 50, 6, 20);
  P(B, GEO.box, stone, n.x, n.y - 2, 0, 28, 62, 16, 0.12);
  PB(B, GEO.gable, stone, n.x, n.y - 2, 62, 28, 12, 16, Math.PI / 2 + 0.12);
  const runes = new THREE.Mesh(GEO.plane, out.runeMat);
  runes.scale.set(10 * S, 40 * S, 1); runes.position.set(n.x * S, 34 * S, (n.y + 7) * S); runes.rotation.y = 0.12; root.add(runes);
  light(out.lights, n.x, n.y + 10, 40, '150,110,255', 6, 5);
}

function nightCart(root, n, out) {
  const B = new Batch(), grp = new THREE.Group(), x = n.x + 46, y = n.y - 4;
  P(B, GEO.box, toon(0x5a3e28), x, y - 10, 12, 50, 18, 26);
  for (const s of [-1, 1]) P(B, GEO.cyl, toon(0x3a2a1a), x + s * 16, y + 4, 0, 18, 18, 4, 0, Math.PI / 2);
  for (let k = 0; k < 4; k++) P(B, GEO.box, toon(k % 2 ? 0x3a2a5a : 0xe0c070), x - 18 + k * 12, y - 10, 44, 12, 3, 30, 0, 0.2);
  for (const s of [-1, 1]) P(B, GEO.box, toon(0x3a2a22), x + s * 23, y - 20, 12, 3, 34, 3);
  B.build(grp); root.add(grp);
  const lantern = new THREE.Mesh(GEO.box, glow(0xffc070, 2)); lantern.scale.set(7 * S, 9 * S, 7 * S); lantern.position.set((x + 26) * S, 40 * S, y * S); grp.add(lantern);
  out.carts.push(grp);
  light(out.lights, x, y - 40, 44, '255,190,110', 5, 5, 'cart');
}

// landmarks of the big towns
const TREE_LANTERNS = [[-120, -170], [-60, -150], [10, -140], [80, -150], [140, -175], [-170, -200], [170, -210]];
function feature(B, root, f, key, out) {
  const { x, y, w, h } = f, cx = x + w / 2, cz = y + h / 2, base = y + h;
  if (f.kind === 'bigtree') {
    const T = new Batch(), grp = new THREE.Group(); root.add(grp);
    const bark = toon(0x4a3220, 0x2a1a10), leaf = toon(0x1e3a24, 0x3a6a3a), leaf2 = toon(0x2a4e2c);
    P(T, GEO.cyl, bark, cx, cz, 0, 70, 240, 60);
    for (const [a, len] of [[0.3, 90], [2.6, 100], [4.1, 70], [5.4, 80]]) P(T, GEO.cyl6, bark, cx + Math.cos(a) * len * 0.45, cz + Math.sin(a) * len * 0.35, 2, 14, len, 14, -a, 0, Math.PI / 2 - 0.25);
    const blobs = [[0, 300, 120], [-110, 250, 90], [110, 255, 92], [-60, 330, 80], [70, 335, 80], [-150, 200, 64], [150, 205, 66], [0, 220, 96]];
    blobs.forEach(([ox, oy, r], i) => P(T, GEO.ball, i % 2 ? leaf : leaf2, cx + ox, cz + (i % 3 - 1) * 40, oy - r * 0.6, r * 2, r * 1.3, r * 1.7));
    for (const [lx, ly] of TREE_LANTERNS) {
      P(T, GEO.box, toon(0x1e140c), cx + lx, cz + 40, -ly + 10, 1.5, 34, 1.5);
      out.lamps.push({ x: cx + lx, y: cz + 40, h: -ly - 12, s: 10, always: true });
    }
    for (const [lx, ly] of [TREE_LANTERNS[1], TREE_LANTERNS[3], TREE_LANTERNS[5]]) light(out.lights, cx + lx, cz + 50, -ly - 20, '255,200,110', 9, 9);
    const meshes = T.build(grp);
    out.occluders.push(occluder(grp, meshes, cx - 200, cz - 150, cx + 200, base + 20, 520));
  } else if (f.kind === 'well') {
    P(B, GEO.cyl, toon(0x6a6660), cx, cz, 0, w, 24, w * 0.8);
    P(B, GEO.cyl, toon(0x0a1418), cx, cz, 24, w - 10, 1, w * 0.8 - 10);
    for (const s of [-1, 1]) P(B, GEO.box, toon(0x4a3220), cx + s * (w / 2 - 4), cz, 24, 5, 36, 5);
    PB(B, GEO.gable, toon(0x5a7a3a), cx, cz, 58, w + 16, 18, w * 0.8);
    P(B, GEO.box, toon(0x6a4a2c), cx, cz, 36, 10, 9, 10);
  } else if (f.kind === 'garden') {
    P(B, GEO.box, toon(0x3a2a18), cx, cz, 0, w, 8, h);
    const cols = [0xff6b8b, 0xffd36b, 0xc9b8ff, 0xff9ab0, 0x8fd0ff];
    for (let r2 = 0; r2 < 3; r2++) for (let i = 0; i < Math.floor(w / 18); i++) {
      const px = x + 10 + i * 18, pz = y + 14 + r2 * 16;
      P(B, GEO.cyl6, toon(0x3e6b32), px, pz, 8, 2, 10, 2);
      P(B, GEO.ball, toon(cols[(i + r2) % cols.length]), px, pz, 16, 9, 8, 9);
    }
  } else if (f.kind === 'pond') {
    P(B, GEO.round, toon(0xeef3ff), cx, cz, 0, w + 26, 4, h + 22);
    const ice = new THREE.Mesh(GEO.round, new THREE.MeshLambertMaterial({ color: 0x9ac8f0, emissive: 0x2a4a70 }));
    ice.scale.set(w * S, 3 * S, h * S); ice.position.set(cx * S, 4 * S, cz * S); root.add(ice);
    for (let i = 0; i < 5; i++) P(B, GEO.box, toon(0xd8ecff), cx - w / 3 + i * w / 6, cz + Math.sin(i * 2) * h / 5, 5.6, 26, 0.4, 2, i * 0.7);
    light(out.lights, cx, cz, 30, '170,210,255', 4, 9, true);
  } else if (f.kind === 'statue') {
    const sn = toon(0x8a98b0), ice = toon(0xbcd8f8, 0x8ab0ff);
    P(B, GEO.box, sn, cx, cz, 0, w + 20, 22, h + 16); P(B, GEO.box, toon(0x9aa8c0), cx, cz, 22, w + 8, 8, h + 6);
    P(B, GEO.box, ice, cx, cz, 30, 24, 44, 16); P(B, GEO.ball, ice, cx, cz, 76, 20, 20, 20); P(B, GEO.cone, ice, cx, cz, 88, 18, 14, 18);
    P(B, GEO.box, toon(0xe8f2ff), cx + 18, cz, 60, 5, 56, 3, 0, 0, -0.12);
    P(B, GEO.box, toon(0xeef3ff), cx, cz, 30, w + 10, 2, h + 8);
  } else if (f.kind === 'tower') {
    const T = new Batch(), grp = new THREE.Group(); root.add(grp);
    P(T, GEO.cyl, toon(0x7a88a0, 0x4a5a7a), cx, cz, 0, w + 12, 150, h + 12);
    P(T, GEO.cone, toon(0x2f4a6b), cx, cz, 150, w + 26, 80, h + 26);
    P(T, GEO.cone, toon(0xeef3ff), cx, cz, 196, (w + 26) * 0.44, 36, (h + 26) * 0.44);
    P(T, GEO.cyl6, toon(0x2a2a2a), cx, cz, 230, 2, 26, 2);
    P(T, GEO.box, toon(0x5a7ab0), cx + 8, cz, 246, 16, 8, 1.5);
    const meshes = T.build(grp);
    const glass = new THREE.Mesh(GEO.plane, out.nightMats.window); glass.scale.set(12 * S, 20 * S, 1); glass.position.set(cx * S, 80 * S, (cz + (h + 12) / 2 + 0.5) * S); grp.add(glass); meshes.push(glass);
    out.occluders.push(occluder(grp, meshes, x - 6, y - 6, x + w + 6, y + h + 6, 380));
  } else if (f.kind === 'oasis') {
    P(B, GEO.round, toon(0xc8a070), cx, cz, 0, w + 40, 3, h + 34);
    const water = new THREE.Mesh(GEO.round, new THREE.MeshLambertMaterial({ color: 0x2a8a90, emissive: 0x0a3038 }));
    water.scale.set(w * S, 3 * S, h * S); water.position.set(cx * S, 2 * S, cz * S); root.add(water);
    for (const [px, py, s2] of [[x - 10, y + 20, 1.1], [x + w + 6, y + 40, 0.95], [x + w * 0.3, base + 18, 0.85], [x + w * 0.8, base + 14, 1]]) {
      for (const [geo, c, ox, oy, oz, sx, sy, sz, rx = 0, ry = 0, rz = 0] of TREE_PARTS.palm()) P(B, geo, toon(c), px + ox * s2, py + oz * s2, oy * s2 - sy * s2 / 2, sx * s2, sy * s2, sz * s2, ry, rx, rz);
    }
    for (let i = 0; i < 9; i++) { const a = i * 0.7; P(B, GEO.cone, toon(0x3e6b32), cx + Math.cos(a) * w * 0.5, cz + Math.sin(a) * h * 0.5, 0, 6, 22, 6); }
    light(out.lights, cx, cz, 30, '90,220,220', 4, 10, true);
  } else if (f.kind === 'market') {
    const cloth = { cloth: 0x8a3a8a, fruit: 0xd6603a, pots: 0x2f6a8a, spice: 0xc2843a }[f.goods] || 0xa8502a;
    P(B, GEO.box, toon(0x7a5236), cx, cz, 0, w - 8, 28, h - 14);
    const goods = { cloth: [0x8a3a8a, 0x3f6b8a, 0xd4a017], fruit: [0xd6603a, 0xe0b040, 0x6aa84f], pots: [0xa8502a, 0x7a3a1e, 0x2f6a8a], spice: [0xc2843a, 0xa8302a, 0xe0c040] }[f.goods] || [0xc2843a];
    for (let i = 0; i < Math.floor((w - 20) / 18); i++) P(B, f.goods === 'cloth' ? GEO.cyl : GEO.ball, toon(goods[i % goods.length]), x + 16 + i * 18, cz - 4, 28, 13, 10, 13, 0, f.goods === 'cloth' ? Math.PI / 2 : 0);
    for (const s of [-1, 1]) for (const t of [-1, 1]) P(B, GEO.box, toon(0x3a2414), cx + s * (w / 2 - 4), cz + t * (h / 2 - 6), 0, 3, 64, 3);
    for (let i = 0; i < 5; i++) P(B, GEO.box, toon(i % 2 ? 0xf1e2c4 : cloth), x - 6 + (w + 12) * (i + 0.5) / 5, cz, 64, (w + 12) / 5, 3, h + 8, 0, 0.18);
    light(out.lights, cx, cz + 10, 50, WARM, 3, 4, true);
  } else if (f.kind === 'bridge') {
    const st = toon(0x5a4440, 0x5a2a1a);
    P(B, GEO.box, st, cx, cz, 0, w - 20, 10, h + 10);
    for (const s of [-1, 1]) { P(B, GEO.box, toon(0x4a3632), cx + s * (w / 2 - 12), cz, 10, 8, 14, h + 10); for (const t of [-1, 1]) P(B, GEO.box, toon(0x3a2a26), cx + s * (w / 2 - 12), cz + t * (h / 2 + 2), 0, 14, 30, 14); }
  } else if (f.kind === 'monument') {
    const iron = toon(0x5a5660, 0xff7a3a);
    P(B, GEO.box, toon(0x4a3632), cx, cz, 0, w + 20, 26, h + 10); P(B, GEO.box, toon(0x5a4440), cx, cz, 26, w, 10, h - 10);
    P(B, GEO.box, iron, cx, cz, 36, 60, 26, 40); P(B, GEO.box, iron, cx - 6, cz, 62, 140, 22, 44);
    P(B, GEO.cone, iron, cx - 90, cz, 62, 22, 36, 22, 0, 0, Math.PI / 2);
    P(B, GEO.cyl6, toon(0x5a3a22), cx + 30, cz, 110, 8, 70, 8, 0, 0, 0.5);
    P(B, GEO.box, toon(0x3e3a44), cx + 46, cz, 136, 22, 44, 24, 0, 0, 0.5);
    P(B, GEO.box, glow(0xff5a1a, 1.3), cx - 6, cz + 22.5, 66, 120, 2, 1);
    light(out.lights, cx, base + 10, 60, 0xff7a3a, 9, 9);
  }
}

function lavaBand(root, lava, out) {
  const x0 = Math.min(...lava.map((f) => f.x)), x1 = Math.max(...lava.map((f) => f.x + f.w)), y = lava[0].y, h = lava[0].h;
  const m = new THREE.Mesh(GEO.plane, out.lavaMat); m.rotation.x = -Math.PI / 2;
  m.scale.set((x1 - x0) * S, h * S, 1); m.position.set((x0 + x1) / 2 * S, 0.016, (y + h / 2) * S); root.add(m);
  const B = new Batch(), crust = toon(0x2e201e);
  const r = rnd(41);
  for (let px = x0; px < x1; px += 26) for (const py of [y, y + h]) P(B, GEO.ball, crust, px + r() * 10, py + (r() - 0.5) * 8, -4, 26 + r() * 10, 12, 16);
  B.build(root);
  for (let px = x0 + 60; px < x1; px += 140) { light(out.lights, px, y + h / 2, 20, '255,110,40', 9, 7); out.embers.push({ x: px, y: y + h / 2, h: 2, kind: 'ember', w: 60 }); }
}

// lamp heads: one instanced mesh for the ones lit after dark, one for those always burning
function lampHeads(root, out) {
  for (const always of [false, true]) {
    const list = out.lamps.filter((l) => !!l.always === always);
    if (!list.length) continue;
    const im = new THREE.InstancedMesh(GEO.box, always ? out.fireMat : out.nightMats.lamp, list.length), m = new THREE.Matrix4();
    list.forEach((l, i) => im.setMatrixAt(i, matrixOf(l.x * S, l.h * S, l.y * S, l.s * S, l.s * 1.2 * S, l.s * S, 0, 0, 0, m)));
    root.add(im);
  }
}
