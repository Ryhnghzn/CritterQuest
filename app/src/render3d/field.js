// 2.5D open-world regions (plan "Tampilan 2.5D" §4). Same interface as render/world.js
// Renderer (draw, screenToWorld, avatar). The ground is the 2D drawField (biome tiles,
// paths, rivers, lakes, ruin floors, small details) painted into a ring of cached tiles
// around the hero, one tile per frame at most; everything tall is low-poly 3D: trees,
// rocks and ruin stones stream into one InstancedMesh per kind (only those near the hero),
// bridges, glowing lava / void water, dungeon gates, treasure chests, hidden homes. The
// keepers of the homes and the quest places are the 2D art on upright cards. The hero,
// monsters, ground effects and numbers come from Actors (actors.js). Light follows the
// in-game clock; Tanah Gerhana is always dusk-violet.
import * as THREE from 'three';
import { S, sharp, SHARP, muted, detailed, setDetail, sunAt, dusk } from './stage.js';
import { groundCanvas, groundPattern, GROUND_P, BIOME_GROUND } from './paintground.js';
import { ILLUSTRATED, illustratedIn, illustrated } from './billprops.js';
import { Fireflies } from './fireflies.js';
import { drawFrame } from './frame.js';
import { LOOK } from '../data/look.js';
import { Actors, canvasTexture, billMat } from './actors.js';
import { pixelateCanvas } from './pixelate.js';
const GUARD_OUTFIT = ['#3a4a6a', '#141c2e']; // the anime gate guard's colours
import { dispose } from './dungeon.js';
import { buildProps, indexProps, gatherNear, inCutaway, bridgeSpots, tilesAround } from './fieldprops.js';
import { propGeometry, VARIED, vtoon, LIFT, gateMesh, chestMesh, homeMesh, bridgesMesh, riverRibbon, signMesh, additive, glowTex, townGateMesh, fogBank } from './fieldkit.js';
import { groundTile, drawField, fieldDecorLights, targetArrow, gateGlow, gateGuards, drawGuard } from '../render/field.js';
import { drawQuestSpot } from '../render/hideout.js';
import { actor, tag } from '../render/paint.js';
import { t as tf } from '../i18n.js';
import { FIELD, TOWNS, regionById } from '../data/world.js';
import { chunkProps } from './fieldprops.js';
import { START_R, DEFEND, RESCUE, HAPPEN } from '../data/questev.js';
import { WORLD, ECLIPSE, CROSS_BLEND } from '../data/worldmap.js';
import { MEDAL } from '../run/questev.js';
import { zoneAt, inHub, chunksNear } from '../run/worldmap.js';
import { dungeonById } from '../data/dungeons.js';
import { skyAt } from '../meta/clock.js';
import { SHAKE_PX } from '../data/fx.js';

const TAU = Math.PI * 2;
// a town's wall (spec §40 C3): a ring of stone with crenels and towers, open at its gates, and the
// roofs of the houses showing over it. gates: the angles of the openings (radians, world x/y)
const WALL_STYLE = {
  forest: { stone: 0x6a6458, roof: [0x8a3a2a, 0x6a2a20, 0x4a5a2a] }, ice: { stone: 0x8a96a8, roof: [0x2a4a6a, 0x3a3a5a, 0xa8b8c8] },
  desert: { stone: 0xb08a5a, roof: [0xc8a070, 0x8a5a3a, 0xd8c8a8] }, volcano: { stone: 0x4a3a34, roof: [0x5a2a1a, 0x2a2220, 0x7a3a1a] },
  eclipse: { stone: 0x3a2e4a, roof: [0x4a2a6a, 0x2a1a3a, 0x6a4a8a] },
};
function townWallMesh(r, gates, biome, houses, seed) {
  const G = new THREE.Group(), st = WALL_STYLE[biome] || WALL_STYLE.forest, stone = new THREE.MeshLambertMaterial({ color: st.stone });
  const gap = 150 / r, n = Math.max(12, Math.round((Math.PI * 2 * r) / 70));
  const near = (a) => gates.some((g) => Math.abs(Math.atan2(Math.sin(a - g), Math.cos(a - g))) < gap);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    if (near(a)) continue;
    const seg = new THREE.Mesh(new THREE.BoxGeometry(((Math.PI * 2 * r) / n + 4) * S, 64 * S, 22 * S), stone);
    seg.position.set(Math.cos(a) * r * S, 32 * S, Math.sin(a) * r * S); seg.rotation.y = -a + Math.PI / 2; G.add(seg);
    if (i % 2 === 0) { const cr = new THREE.Mesh(new THREE.BoxGeometry(14 * S, 12 * S, 24 * S), stone); cr.position.set(Math.cos(a) * r * S, 70 * S, Math.sin(a) * r * S); cr.rotation.y = -a + Math.PI / 2; G.add(cr); }
    if (i % Math.max(3, Math.round(n / 8)) === 0) {
      const tw = new THREE.Mesh(new THREE.CylinderGeometry(26 * S, 30 * S, 96 * S, 8), stone); tw.position.set(Math.cos(a) * r * S, 48 * S, Math.sin(a) * r * S); G.add(tw);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(32 * S, 40 * S, 8), new THREE.MeshLambertMaterial({ color: st.roof[0] })); cap.position.set(Math.cos(a) * r * S, 116 * S, Math.sin(a) * r * S); G.add(cap);
    }
  }
  for (let i = 0; i < houses; i++) { // roofs over the wall
    const h1 = Math.sin((seed + i) * 12.9898) * 43758.5453, u = h1 - Math.floor(h1), h2 = Math.sin((seed + i) * 78.233) * 12543.123, v = h2 - Math.floor(h2);
    const a = u * Math.PI * 2, d = (0.25 + v * 0.5) * r, w = 60 + v * 40;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w * S, 70 * S, w * 0.8 * S), new THREE.MeshLambertMaterial({ color: 0x5a4a3a }));
    body.position.set(Math.cos(a) * d * S, 35 * S, Math.sin(a) * d * S); body.rotation.y = u * 3; G.add(body);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.78 * S, 50 * S, 4), new THREE.MeshLambertMaterial({ color: st.roof[i % st.roof.length] }));
    roof.position.set(Math.cos(a) * d * S, 95 * S, Math.sin(a) * d * S); roof.rotation.y = u * 3 + Math.PI / 4; G.add(roof);
  }
  return G;
}
// a stone bridge over the great river (spec §40 C1): an arched deck along local x, low walls
function stoneBridgeMesh(len) {
  const G = new THREE.Group(), stone = new THREE.MeshLambertMaterial({ color: 0x8a8478 }), dark = new THREE.MeshLambertMaterial({ color: 0x5a5650 });
  const n = 9, w = 150;
  for (let i = 0; i < n; i++) {
    const k = (i + 0.5) / n, x = (k - 0.5) * len, y = Math.sin(k * Math.PI) * 26;
    const deck = new THREE.Mesh(new THREE.BoxGeometry((len / n + 2) * S, 14 * S, w * S), stone); deck.position.set(x * S, (y + 7) * S, 0); G.add(deck);
    for (const z of [-1, 1]) { const rail = new THREE.Mesh(new THREE.BoxGeometry((len / n + 2) * S, 22 * S, 12 * S), dark); rail.position.set(x * S, (y + 24) * S, z * (w / 2 - 6) * S); G.add(rail); }
  }
  for (const x of [-0.5, 0.5]) for (const z of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(22 * S, 50 * S, 22 * S), dark); p.position.set(x * len * S, 25 * S, z * (w / 2 - 6) * S); G.add(p); }
  return G;
}
// a rope bridge over the canyon: sagging planks, rope rails, posts at both ends
function ropeBridgeMesh(len) {
  const G = new THREE.Group(), wood = new THREE.MeshLambertMaterial({ color: 0x6a4a2a }), rope = new THREE.MeshLambertMaterial({ color: 0xc8a870 });
  const n = Math.round(len / 26), w = 110, sag = (k) => -Math.sin(k * Math.PI) * 24 + 10;
  for (let i = 0; i < n; i++) { const k = (i + 0.5) / n, p = new THREE.Mesh(new THREE.BoxGeometry(18 * S, 5 * S, w * S), wood); p.position.set((k - 0.5) * len * S, sag(k) * S, 0); p.rotation.z = (i % 3 - 1) * 0.04; G.add(p); }
  for (const z of [-1, 1]) {
    const pts = []; for (let i = 0; i <= 16; i++) { const k = i / 16; pts.push(new THREE.Vector3((k - 0.5) * len * S, (sag(k) + 34) * S, z * (w / 2) * S)); }
    G.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 1.6 * S, 4), rope));
    for (const x of [-0.5, 0.5]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(5 * S, 6 * S, 64 * S, 6), wood); post.position.set(x * len * S, 32 * S, z * (w / 2) * S); G.add(post); }
  }
  return G;
}
// a camp (spec §42): a ring of stakes round a wooden cage whose door lifts when the guards fall
function campMesh() {
  const G = new THREE.Group(), wood = new THREE.MeshLambertMaterial({ color: 0x5a3d25 }), dark = new THREE.MeshLambertMaterial({ color: 0x3a2616 });
  for (let i = 0; i < 18; i++) { // the fence (open toward the south)
    if (i === 4 || i === 5) continue;
    const a = (i / 18) * Math.PI * 2, st = new THREE.Mesh(new THREE.CylinderGeometry(4 * S, 5 * S, 60 * S, 5), dark);
    st.position.set(Math.cos(a) * RESCUE.fence * S, 30 * S, Math.sin(a) * RESCUE.fence * S); st.rotation.z = Math.cos(a) * 0.12; G.add(st);
  }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(90 * S, 8 * S, 70 * S), wood); roof.position.y = 96 * S; G.add(roof);
  for (const [x, z] of [[-42, -32], [42, -32], [-42, 32], [42, 32]]) { const p = new THREE.Mesh(new THREE.BoxGeometry(8 * S, 96 * S, 8 * S), wood); p.position.set(x * S, 48 * S, z * S); G.add(p); }
  for (let i = -3; i <= 3; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(2.4 * S, 2.4 * S, 92 * S, 5), dark); b.position.set(i * 12 * S, 46 * S, -32 * S); G.add(b); } // back bars
  const door = new THREE.Group(); // the front bars, raised when unlocked
  for (let i = -3; i <= 3; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(2.4 * S, 2.4 * S, 92 * S, 5), dark); b.position.set(i * 12 * S, 46 * S, 34 * S); door.add(b); }
  G.add(door); G.userData.door = door;
  const fire = new THREE.Mesh(new THREE.PlaneGeometry(160 * S, 160 * S), additive(new THREE.Color(0xff9a40), 0.35, glowTex()));
  fire.rotation.x = -Math.PI / 2; fire.position.set(150 * S, 0.06, 120 * S); G.add(fire);
  return G;
}
// a race ring (spec §42): an upright hoop of light facing the camera
function ringMesh() {
  const G = new THREE.Group();
  const band = new THREE.Mesh(new THREE.TorusGeometry(70 * S, 7 * S, 8, 32), additive(new THREE.Color(0xffd24a).multiplyScalar(1.4), 0.9));
  band.position.y = 80 * S; G.add(band);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(180 * S, 180 * S), additive(new THREE.Color(0xffd24a), 0.3, glowTex()));
  glow.rotation.x = -Math.PI / 2; glow.position.y = 0.06; G.add(glow);
  G.userData.band = band;
  return G;
}
// a quest nest (spec §42): a dark mound ringed with spines round a pulsing core
function nestMesh() {
  const G = new THREE.Group();
  const dark = new THREE.MeshLambertMaterial({ color: 0x2a1a30 });
  const mound = new THREE.Mesh(new THREE.SphereGeometry(34 * S, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), dark); mound.scale.y = 0.75; G.add(mound);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2, sp = new THREE.Mesh(new THREE.ConeGeometry(5 * S, 30 * S, 5), dark);
    sp.position.set(Math.cos(a) * 26 * S, 14 * S, Math.sin(a) * 26 * S); sp.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); G.add(sp);
  }
  const core = new THREE.Mesh(new THREE.SphereGeometry(11 * S, 10, 8), new THREE.MeshBasicMaterial({ color: 0xd840e0 }));
  core.position.y = 24 * S; G.add(core);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(200 * S, 200 * S), additive(new THREE.Color(0xc040ff), 0.45, glowTex()));
  glow.rotation.x = -Math.PI / 2; glow.position.y = 0.06; G.add(glow);
  G.userData.core = core; G.userData.glow = glow;
  return G;
}
// a defended altar (spec §42): a stone plinth and a floating crystal of light
function altarMesh() {
  const G = new THREE.Group();
  const stone = new THREE.MeshLambertMaterial({ color: 0x6a6878 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(34 * S, 42 * S, 26 * S, 8), stone); base.position.y = 13 * S; G.add(base);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(26 * S, 30 * S, 10 * S, 8), stone); top.position.y = 31 * S; G.add(top);
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(16 * S), new THREE.MeshLambertMaterial({ color: 0xbfe6ff, emissive: new THREE.Color(0.4, 0.7, 1) }));
  crystal.scale.set(1, 1.6, 1); G.add(crystal);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(240 * S, 240 * S), additive(new THREE.Color(0x9ad0ff), 0.4, glowTex()));
  glow.rotation.x = -Math.PI / 2; glow.position.y = 0.06; G.add(glow);
  G.userData.crystal = crystal; G.userData.glow = glow;
  return G;
}
const TS = 800;            // ground tile size (world units)
const TILE_R = 1150;       // tiles kept within this of the camera point
const PROP_R = 1350;       // props streamed within this of the hero…
const REFILL = 350;        // …refilled after moving this far
const CAP = 700;           // instances per kind at most
const BIOME_ZONE = { forest: 'forest', ice: 'ice', desert: 'desert', volcano: 'volcano', eclipse: 'eclipse' };
const BORDER_STEP_PAD = 1600; // a border's bends lie this far apart at most
const EDGE = { forest: '#070b08', ice: '#080c12', desert: '#120c08', volcano: '#0a0605', eclipse: '#06030c' };
const FOG_DAY = { forest: 0x24342c, ice: 0x4a5a72, desert: 0x5a3e2c, volcano: 0x34160e, eclipse: 0x1a0c2e };
const FOG_NIGHT = 0x06070f;
// the fog bank past the edges (by day; it sinks towards FOG_BANK_NIGHT at night)
const FOG_BANK = { forest: 0xa8b8ae, ice: 0xdde8f4, desert: 0xc8b090, volcano: 0x7a5a50, eclipse: 0x8a6ac0 };
const FOG_BANK_NIGHT = 0x1a1e2a;
// Tampilan Matang (§36): the surface under the painted ground, and on stone-like props
const GROUND_KIND = { desert: 'sand', ice: 'snow', volcano: 'ash', eclipse: 'ash' };
const PROP_KIND = { rock: 'rock', floatrock: 'rock', icerock: 'rock', stone: 'rock', column: 'rock' };
const LIGHT_K = { ice: 0.5, desert: 0.9 }; // pale snow would glare (and bloom) under the forest's light
// how far (radius units) a prop sinks when it stands between the hero and the camera
// trees and rocks come in variants (flora.js): one InstancedMesh per kind and variant
const propKey = (p) => (VARIED.has(p.kind) ? `${p.kind}~${Math.floor(p.v * 7) % 3}` : p.kind);
const SINK = { tuft: 1.2, bush: 0.9, rock: 0.6, icerock: 0.9, floatrock: 1.4, crystal: 1.3, cactus: 1.7 };

const _o = new THREE.Object3D(), _c = new THREE.Color(), _c2 = new THREE.Color();
const RGB = new Map(); // "r,g,b" → THREE.Color
const rgbOf = (s) => { let c = RGB.get(s); if (!c) { const [r, g, b] = s.split(',').map(Number); c = new THREE.Color(r / 255, g / 255, b / 255); RGB.set(s, c); } return c; };

export class Field25 {
  constructor(view, flat, stage) {
    this.view = view;
    this.flat = flat;
    this.stage = stage;
    this.camX = 0; this.camY = 0;
    this.mapRef = null; this.frame = 0;
    this.near = []; this.lightList = []; this.tileNeed = [];
    this.rect = { x0: 0, y0: 0, x1: 0, y1: 0 };
    this.byDist = (a, b) => ((a.x - this.camX) ** 2 + (a.y - this.camY) ** 2) - ((b.x - this.camX) ** 2 + (b.y - this.camY) ** 2);
    this.extra = (g, visible) => this.groundExtra(g, visible);
  }
  get avatar() { return this.flat.avatar; }
  set avatar(a) { this.flat.avatar = a; }
  screenToWorld(x, y) { return this.stage.screenToWorld(x, y); }
  hide() { this.stage.show(false); this.view.c.style.background = ''; }

  setup() {
    this.stage.init();
    const sc = this.scene = new THREE.Scene();
    sc.fog = new THREE.Fog(0x000000, 20, 55);
    sc.background = new THREE.Color();
    this.hemi = new THREE.HemisphereLight(0x8a96b0, 0x2a2018, 1.6); sc.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff0d0, 1.4); sc.add(this.sun, this.sun.target);
    this.pool = []; // point lights handed to the nearest region lights each frame (≤ 6 lights in all)
    for (let i = 0; i < 4; i++) { const L = new THREE.PointLight(0xffa050, 0, 10, 1.6); sc.add(L); this.pool.push(L); }
    this.heroLight = new THREE.PointLight(0xffd8a0, 4, 9, 1.6); sc.add(this.heroLight);
    this.fireflies = new Fireflies(sc); // plan C4
    // the land below everything (past the tiles, past the map)
    this.base = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshBasicMaterial({ color: 0x080808 }));
    this.base.rotation.x = -Math.PI / 2; this.base.position.y = -0.03; sc.add(this.base);
    // ground tiles: a pool of 16 meshes, each with its own canvas
    this.tiles = [];
    for (let i = 0; i < 16; i++) {
      const c = document.createElement('canvas'), tex = canvasTexture(c);
      tex.anisotropy = SHARP.aniso;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(TS * S, TS * S), muted(LOOK.detail > 0 ? detailed(new THREE.MeshLambertMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.4 }), 'soil') : new THREE.MeshLambertMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.4 })));
      m.rotation.x = -Math.PI / 2; m.visible = false; sc.add(m);
      this.tiles.push({ ix: 0, iy: 0, used: false, ready: false, c, tex, mesh: m, pat: null });
    }
    this.actors = new Actors(this.view, this.flat, this.stage, sc);
  }

  // a region: built once
  buildRegion(game) {
    if (game.fmap.world) { this.buildWorld(game); return; }
    this.world = null;
    const sc = this.scene, map = game.fmap, region = map.region, biome = region.biome || 'forest';
    if (this.regionGroup) { sc.remove(this.regionGroup); dispose(this.regionGroup); for (const k of this.kinds.values()) k.mesh.geometry.dispose(); }
    const G = this.regionGroup = new THREE.Group(); sc.add(G);
    this.mapRef = map; this.biome = biome;
    const painted = !!LOOK.paintGround?.biomes.includes(biome); // plan C2: the prototype's grass and dirt
    this.painted = painted;
    if (LOOK.detail > 0) for (const tl of this.tiles) setDetail(tl.mesh.material, painted ? 'none' : GROUND_KIND[biome] || 'soil');
    this.base.material.color.set(EDGE[biome] || EDGE.forest);
    // the 2D ground painter sees a map with no solids, gates, homes or signposts: those stand up in 3D
    this.ghost = {
      fmap: Object.assign(Object.create(map), { cols: 1, rows: 1, grid: [[]], start: { x: -1e6, y: -1e6 }, end: { x: -1e6, y: -1e6 } }),
      gates: [], treasures: [], hidden: [], questSpots: [],
    };
    if (painted) { // the paths are dug in dirt with pebbles
      const theme = Object.assign(Object.create(region.theme), { path: groundPattern(this.tiles[0].c.getContext('2d'), BIOME_GROUND[biome].path[0], 1, BIOME_GROUND[biome].path[1]) });
      this.ghost.fmap.region = Object.assign(Object.create(region), { theme });
    }
    const lite = this.stage.lite;
    this.tileK = sharp('ground', lite);
    const tile = painted ? { canvas: groundCanvas(BIOME_GROUND[biome].ground, 1), T: GROUND_P } : groundTile(this.tileK, region.theme.ground, biome);
    for (const tl of this.tiles) {
      tl.used = tl.ready = false; tl.mesh.visible = false;
      const side = Math.ceil(TS * this.tileK);
      if (tl.c.width !== side) { tl.c.width = tl.c.height = side; tl.tex.dispose(); }
      tl.pat = tl.c.getContext('2d').createPattern(tile.canvas, 'repeat');
      tl.pat.setTransform(new DOMMatrix().scale(tile.T / tile.canvas.width));
    }
    // props: one InstancedMesh per kind, filled with the ones near the hero
    this.props = buildProps(map, { tufts: illustratedIn(biome) });
    this.index = indexProps(this.props, map.w, map.h);
    const count = new Map();
    for (const p of this.props) { p.key = propKey(p); count.set(p.key, (count.get(p.key) || 0) + 1); }
    this.kinds = new Map();
    for (const [key, n] of count) {
      const [kind, variant] = key.split('~'), cap = Math.min(n, CAP);
      let mesh;
      if (ILLUSTRATED.has(kind) && illustratedIn(biome)) { // plan C3: a painted picture standing up
        const ill = illustrated(kind, biome, Number(variant) || 0);
        mesh = new THREE.InstancedMesh(ill.geo, ill.mat, cap); mesh.customDepthMaterial = ill.depth;
      } else {
        const { geo, rim, smooth } = propGeometry(kind, biome, Number(variant) || 0);
        mesh = new THREE.InstancedMesh(geo, vtoon(rim, !smooth, PROP_KIND[kind] || null), cap);
      }
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.setColorAt(0, _c.setScalar(1));
      mesh.count = 0; mesh.frustumCulled = false; // bounds change as instances stream in
      G.add(mesh);
      this.kinds.set(key, { mesh, cap, ids: new Int32Array(cap), k: new Float32Array(cap), n: 0, lift: LIFT[kind] || 0, sink: SINK[kind] ?? 2.4 });
    }
    const sh = new THREE.CircleGeometry(1, 14); sh.rotateX(-Math.PI / 2);
    this.shadows = new THREE.InstancedMesh(sh, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.38, depthWrite: false }), CAP * 3);
    this.shadows.count = 0; this.shadows.frustumCulled = false; G.add(this.shadows);
    this.fillAt = null;
    // bridges, water / lava ribbons, lake glows, signposts
    const lava = biome === 'volcano', ecl = biome === 'eclipse';
    const br = bridgesMesh(bridgeSpots(map.bridges, map.rivers), lava);
    if (br) G.add(br);
    this.river = null;
    if (map.rivers.length) {
      const col = lava ? new THREE.Color(0xff6a20).multiplyScalar(1.3) : ecl ? new THREE.Color(0x8a50ff) : biome === 'ice' ? new THREE.Color(0x9ad0ff) : new THREE.Color(0x4a90b0);
      this.river = new THREE.Mesh(riverRibbon(map.rivers, lava ? FIELD.riverWidth * 0.62 : FIELD.riverWidth - 14), additive(col, lava ? 0.45 : ecl ? 0.18 : 0.1));
      G.add(this.river);
    }
    this.lakeGlows = [];
    for (const l of map.lakes) {
      if (biome === 'ice') continue; // frozen: no sheen
      const col = lava ? 0xff7a2a : ecl ? 0x8a50ff : 0x5ab0d0;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(l.r * 2.3 * S, l.r * 2.3 * S), additive(new THREE.Color(col).multiplyScalar(lava ? 1.5 : 1), lava ? 0.7 : ecl ? 0.4 : 0.14, glowTex()));
      m.rotation.x = -Math.PI / 2; m.position.set(l.x * S, 0.05, l.y * S); m.userData.ph = l.x * 0.01;
      G.add(m); this.lakeGlows.push(m);
      if (ecl) { // the rim of a void pool
        const ring = new THREE.Mesh(new THREE.RingGeometry(l.r * 0.9 * S, l.r * 0.96 * S, 40), additive(new THREE.Color(0xb48cff).multiplyScalar(1.4), 0.5));
        ring.rotation.x = -Math.PI / 2; ring.position.set(l.x * S, 0.07, l.y * S); G.add(ring);
      }
    }
    const from = TOWNS[region.from], to = region.to && TOWNS[region.to];
    const s1 = signMesh(tf('Ke {name}', { name: from.name }), -1); s1.position.set((FIELD.exitZone + 110) * S, 0, (map.start.y - FIELD.exitHalf - 40) * S); G.add(s1);
    if (to) { const s2 = signMesh(tf('Ke {name}', { name: to.name }), 1); s2.position.set((map.w - FIELD.exitZone - 110) * S, 0, (map.end.y - FIELD.exitHalf - 40) * S); G.add(s2); }
    // the way out: a town gate where the road meets the edge, a warm light in it, fog past the edge
    this.exitGlows = []; this.gateLamps = []; this.fogLayers = [];
    for (const [x, y, dir, gate] of [[FIELD.exitZone, map.start.y, -1, true], [map.w - FIELD.exitZone, map.end.y, 1, !!to]]) {
      const fog = fogBank(dir < 0 ? 0 : map.w, map.h, dir, new THREE.Color(FOG_BANK[biome] || FOG_BANK.forest));
      G.add(fog); this.fogLayers.push(...fog.userData.layers);
      if (!gate) continue;
      const gm = townGateMesh(biome, FIELD.exitHalf, FIELD.gateWall);
      gm.position.set((dir < 0 ? FIELD.exitZone - 30 : map.w - FIELD.exitZone + 30) * S, 0, y * S);
      if (dir > 0) gm.rotation.y = Math.PI;
      G.add(gm); this.gateLamps.push(...gm.userData.lamps);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(140 * S, FIELD.exitHalf * 2 * S), additive(new THREE.Color(0xffb860).multiplyScalar(1.4), 0.5, glowTex()));
      m.rotation.x = -Math.PI / 2; m.position.set(x * S, 0.06, y * S); G.add(m); this.exitGlows.push(m);
    }
    // things that belong to this character / visit: rebuilt when their lists change
    this.gateGroup = new THREE.Group(); G.add(this.gateGroup); this.gatesRef = null;
    this.chestGroup = new THREE.Group(); G.add(this.chestGroup); this.chestRef = null;
    this.homeGroup = new THREE.Group(); G.add(this.homeGroup); this.homeRef = null; this.spotRef = null;
    this.cards = [];
    this.tint();
  }

  // ---- the one world (spec §40) ----
  // the biome a point shows (the meadow round Kota Awal is forest green)
  biomeAt(x, y) { return inHub(x, y) ? 'forest' : regionById(zoneAt(this.world, x, y)).biome; }

  // the ground painter's view of the world in one biome: no solids (they stand in 3D), its theme
  ghostOf(biome) {
    let gh = this.ghosts.get(biome);
    if (gh) return gh;
    const zone = Object.keys(BIOME_ZONE).find((z) => BIOME_ZONE[z] === biome) || 'forest', region = regionById(zone);
    const painted = !!LOOK.paintGround?.biomes.includes(biome);
    const theme = painted ? Object.assign(Object.create(region.theme), { path: groundPattern(this.tiles[0].c.getContext('2d'), BIOME_GROUND[biome].path[0], 1, BIOME_GROUND[biome].path[1]) }) : region.theme;
    const fmap = Object.assign(Object.create(this.world), { region: Object.assign(Object.create(region), { theme }), cols: 1, rows: 1, grid: [[]], solids: [], start: null, end: null });
    const tile = painted ? { canvas: groundCanvas(BIOME_GROUND[biome].ground, 1), T: GROUND_P } : groundTile(this.tileK, region.theme.ground, biome);
    gh = { fmap, gates: [], treasures: [], hidden: [], questSpots: [], painted, tile, biome };
    this.ghosts.set(biome, gh);
    return gh;
  }

  buildWorld(game) {
    const sc = this.scene, map = game.fmap;
    if (this.regionGroup) { sc.remove(this.regionGroup); dispose(this.regionGroup); for (const k of this.kinds.values()) k.mesh.geometry.dispose(); }
    const G = this.regionGroup = new THREE.Group(); sc.add(G);
    this.mapRef = map; this.world = map;
    this.ghosts = new Map();
    this.tileK = sharp('ground', this.stage.lite);
    this.biome = this.biomeAt(game.px, game.py);
    this.painted = !!LOOK.paintGround?.biomes.includes(this.biome);
    this.base.material.color.set(EDGE[this.biome] || EDGE.forest);
    for (const tl of this.tiles) {
      tl.used = tl.ready = false; tl.mesh.visible = false; tl.pats = {};
      const side = Math.ceil(TS * this.tileK);
      if (tl.c.width !== side) { tl.c.width = tl.c.height = side; tl.tex.dispose(); }
    }
    this.props = []; this.kinds = new Map(); this.index = null;
    const sh = new THREE.CircleGeometry(1, 14); sh.rotateX(-Math.PI / 2);
    this.shadows = new THREE.InstancedMesh(sh, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.38, depthWrite: false }), CAP * 3);
    this.shadows.count = 0; this.shadows.frustumCulled = false; G.add(this.shadows);
    this.fillAt = null;
    // small rivers (lava on the volcano), bridges, lake glows: per zone
    const lavaZ = (z) => z === 'volcano';
    const byLava = [[], []];
    map.rivers.forEach((r, i) => byLava[lavaZ(map.riverZones[i]) ? 1 : 0].push(r));
    this.river = null;
    for (const lava of [0, 1]) {
      if (!byLava[lava].length) continue;
      const col = lava ? new THREE.Color(0xff6a20).multiplyScalar(1.3) : new THREE.Color(0x4a90b0);
      const m = new THREE.Mesh(riverRibbon(byLava[lava], lava ? FIELD.riverWidth * 0.62 : FIELD.riverWidth - 14), additive(col, lava ? 0.45 : 0.1));
      G.add(m);
      if (lava) this.river = m;
      const spots = bridgeSpots(map.bridges.filter(([x, y]) => lavaZ(zoneAt(map, x, y)) === !!lava), byLava[lava]);
      const br = bridgesMesh(spots, !!lava);
      if (br) G.add(br);
    }
    // the great river border and the lava border glow like the rivers; bridges at the river's crossings
    for (const bl of map.borders) {
      if (bl.kind !== 'river' && bl.kind !== 'lava') continue;
      const lava = bl.kind === 'lava';
      G.add(new THREE.Mesh(riverRibbon([bl.pts], bl.half * 2 - 20), additive(lava ? new THREE.Color(0xff6a20).multiplyScalar(1.4) : new THREE.Color(0x5aa0c0), lava ? 0.5 : 0.14)));
    }
    // the crossings (spec §40 C1): a stone bridge over the great river, a rope bridge over the canyon,
    // each spanning the whole band along its normal; a signpost on each side naming the land ahead
    for (const c of map.crossings) {
      const bl = map.borders.find((b) => b.id === c.border);
      if (c.kind === 'bridge' || c.kind === 'rope') {
        const m = c.kind === 'rope' ? ropeBridgeMesh(bl.half * 2 + 160) : stoneBridgeMesh(bl.half * 2 + 140);
        m.position.set(c.x * S, 0, c.y * S); m.rotation.y = -Math.atan2(bl.n[1], bl.n[0]); G.add(m);
      }
      for (const side of [-1, 1]) {
        const ahead = bl.between[side > 0 ? 0 : 1], d = bl.half + (c.kind === 'pass' ? 260 : 200);
        const sx = c.x + bl.n[0] * d * side + bl.d[0] * 120, sy = c.y + bl.n[1] * d * side + bl.d[1] * 120;
        const sg = signMesh(tf('Ke {name}', { name: regionById(ahead).name }), 1); sg.position.set(sx * S, 0, sy * S); G.add(sg);
      }
    }
    this.lakeGlows = [];
    for (const l of map.lakes) {
      if (l.zone === 'ice') continue; // frozen: no sheen
      const lava = l.zone === 'volcano', ecl = l.zone === 'eclipse', col = lava ? 0xff7a2a : ecl ? 0x8a50ff : 0x5ab0d0;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(l.r * 2.3 * S, l.r * 2.3 * S), additive(new THREE.Color(col).multiplyScalar(lava ? 1.5 : 1), lava ? 0.7 : ecl ? 0.4 : 0.14, glowTex()));
      m.rotation.x = -Math.PI / 2; m.position.set(l.x * S, 0.05, l.y * S); m.userData.ph = l.x * 0.01; m.userData.pulse = lava || ecl;
      G.add(m); this.lakeGlows.push(m);
    }
    // town gates standing in the world (the town lies behind each), a warm light in them
    this.exitGlows = []; this.gateLamps = []; this.fogLayers = [];
    for (const road of map.roads) { // where each main road leaves the meadow: which town lies ahead
      if (road.kind !== 'main') continue;
      const p = road.pts.find(([x, y]) => Math.hypot(x - WORLD.cx, y - WORLD.cy) > WORLD.hub + 150);
      if (!p) continue;
      const town = Object.values(map.towns).find((tw) => tw.zone === road.zone), sg = signMesh(tf('Ke {name}', { name: TOWNS[town.id].name }), 1);
      sg.position.set((p[0] + 110) * S, 0, (p[1] - 110) * S); G.add(sg);
    }
    for (const tw of Object.values(map.towns)) { // each town walled round, a gate (Kota Awal: four) in its wall
      const biome = tw.zone ? regionById(tw.zone).biome : 'forest';
      const home = tw.id === 'home', g0 = tw.gates[0];
      const cx = home ? tw.x : g0.x - g0.out[0] * (WORLD.townSolid + 120), cy = home ? tw.y : g0.y - g0.out[1] * (WORLD.townSolid + 120);
      const r = home ? WORLD.homeR - 18 : Math.hypot(g0.x - cx, g0.y - cy) - 18;
      const wall = townWallMesh(r, tw.gates.map((g) => Math.atan2(g.y - cy, g.x - cx)), biome, home ? 9 : 7, tw.id.length * 7);
      wall.position.set(cx * S, 0, cy * S); G.add(wall);
      for (const g of tw.gates) {
        const gm = townGateMesh(biome, 110, 50);
        gm.position.set(g.x * S, 0, g.y * S);
        gm.rotation.y = Math.atan2(-g.out[1], g.out[0]); // the town side (−x of the mesh) away from the world
        G.add(gm); this.gateLamps.push(...gm.userData.lamps);
        const m = new THREE.Mesh(new THREE.PlaneGeometry(220 * S, 220 * S), additive(new THREE.Color(0xffb860).multiplyScalar(1.4), 0.5, glowTex()));
        m.rotation.x = -Math.PI / 2; m.position.set(g.x * S, 0.06, g.y * S); G.add(m); this.exitGlows.push(m);
        const s1 = signMesh(TOWNS[tw.id].name, 1);
        s1.position.set((g.x + g.out[0] * 170 + g.out[1] * 150) * S, 0, (g.y + g.out[1] * 170 - g.out[0] * 150) * S); G.add(s1);
      }
    }
    this.gateGroup = new THREE.Group(); G.add(this.gateGroup); this.gatesRef = null;
    this.chestGroup = new THREE.Group(); G.add(this.chestGroup); this.chestRef = null;
    this.homeGroup = new THREE.Group(); G.add(this.homeGroup); this.homeRef = null; this.spotRef = null;
    this.cards = [];
    this.tint();
  }

  // a prop kind in a biome: one InstancedMesh, made the first time it is needed
  kindOf(p) {
    const key = p.key ||= `${p.biome}|${propKey(p)}`;
    let K = this.kinds.get(key);
    if (K) return K;
    const kind = p.kind, variant = VARIED.has(kind) ? Math.floor(p.v * 7) % 3 : 0, biome = p.biome;
    let mesh;
    if (ILLUSTRATED.has(kind) && illustratedIn(biome)) {
      const ill = illustrated(kind, biome, variant);
      mesh = new THREE.InstancedMesh(ill.geo, ill.mat, CAP); mesh.customDepthMaterial = ill.depth;
    } else {
      const { geo, rim, smooth } = propGeometry(kind, biome, variant);
      mesh = new THREE.InstancedMesh(geo, vtoon(rim, !smooth, PROP_KIND[kind] || null), CAP);
    }
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.setColorAt(0, _c.setScalar(1));
    mesh.count = 0; mesh.frustumCulled = false;
    this.regionGroup.add(mesh);
    K = { mesh, cap: CAP, ids: new Int32Array(CAP), k: new Float32Array(CAP), n: 0, lift: LIFT[kind] || 0, sink: SINK[kind] ?? 2.4, list: null };
    this.kinds.set(key, K);
    return K;
  }

  // the props of the chunks round (x, y), those within reach placed into their meshes
  refillWorld(x, y) {
    this.fillAt = this.fillAt || { x: 0, y: 0 };
    this.fillAt.x = x; this.fillAt.y = y;
    const props = this.props; props.length = 0;
    for (const c of chunksNear(this.world, x, y)) for (const p of chunkProps(this.world, c, { tufts: !!LOOK.illustrated })) props.push(p);
    for (const K of this.kinds.values()) { K.n = 0; K.list = props; }
    let ns = 0;
    for (let i = 0; i < props.length; i++) {
      const p = props[i], R = PROP_R + p.r;
      if ((p.x - x) ** 2 + (p.y - y) ** 2 > R * R) continue;
      const K = this.kindOf(p);
      K.list = props;
      if (K.n >= K.cap) continue;
      const j = K.n++;
      K.ids[j] = i; K.k[j] = -1;
      K.mesh.setColorAt(j, _c.setScalar(p.tint));
      if (ns < this.shadows.instanceMatrix.count) {
        const r = p.r * (p.kind === 'floatrock' ? 0.8 : p.kind === 'stone' || p.kind === 'column' ? 0.9 : 1.15) * S;
        _o.position.set((p.x + p.r * 0.15) * S, 0.02, (p.y + p.r * 0.2) * S); _o.rotation.set(0, 0, 0); _o.scale.set(r, 1, r * 0.75); _o.updateMatrix();
        this.shadows.setMatrixAt(ns++, _o.matrix);
      }
    }
    this.shadows.count = ns; this.shadows.instanceMatrix.needsUpdate = true;
    this.shadows.visible = !(LOOK.shadows && !this.stage.lite);
    for (const K of this.kinds.values()) { K.mesh.count = K.n; if (K.mesh.instanceColor) K.mesh.instanceColor.needsUpdate = true; }
  }

  // The parts of a tile that lie in another biome than its middle (spec §40 C2): across each border
  // that passes through it (a polygon from the border's line out to its far side), inside / outside
  // the Gerhana pocket, inside the meadow round Kota Awal. → [{ biome, clip(g), rule? }]
  otherSides(r, biome) {
    const W = this.world, out = [], pad = 400, mid = { x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2 };
    const midZone = zoneAt(W, mid.x, mid.y), midHub = inHub(mid.x, mid.y);
    for (const bl of W.borders) {
      const pts = bl.pts;
      let i0 = -1, i1 = -1;
      for (let i = 1; i < pts.length; i++) {
        const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
        if (Math.max(ax, bx) < r.x0 - pad || Math.min(ax, bx) > r.x1 + pad || Math.max(ay, by) < r.y0 - pad || Math.min(ay, by) > r.y1 + pad) continue;
        if (i0 < 0) i0 = i - 1;
        i1 = i;
      }
      if (i0 < 0 || midHub) continue;
      const [b0, b1] = bl.between;
      if (midZone !== b0 && midZone !== b1) continue;
      const side = midZone === b0 ? 1 : -1, other = midZone === b0 ? b1 : b0, far = 4000;
      const run = pts.slice(Math.max(0, i0 - 1), Math.min(pts.length, i1 + 2));
      out.push({ biome: regionById(other).biome, clip: (g) => {
        run.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
        for (let i = run.length - 1; i >= 0; i--) g.lineTo(run[i][0] + bl.n[0] * far * side, run[i][1] + bl.n[1] * far * side);
        g.closePath();
      } });
    }
    const E = ECLIPSE; // the pocket
    if (r.x1 > E.x0 && r.x0 < E.x1 && r.y1 > E.y0) {
      const inside = midZone === 'eclipse';
      out.push({ biome: inside ? 'volcano' : 'eclipse', rule: inside ? 'evenodd' : 'nonzero', clip: (g) => {
        if (inside) g.rect(r.x0 - 10, r.y0 - 10, r.x1 - r.x0 + 20, r.y1 - r.y0 + 20);
        g.rect(E.x0, E.y0, E.x1 - E.x0, WORLD.h - E.y0 + 100);
      } });
    }
    const hx = WORLD.cx, hy = WORLD.cy, R = WORLD.hub; // the meadow (forest green) and the arms round it
    if (Math.hypot(Math.max(r.x0 - hx, 0, hx - r.x1), Math.max(r.y0 - hy, 0, hy - r.y1)) < R && !(midHub && Math.hypot(r.x0 - hx, r.y0 - hy) < R && Math.hypot(r.x1 - hx, r.y1 - hy) < R && Math.hypot(r.x0 - hx, r.y1 - hy) < R && Math.hypot(r.x1 - hx, r.y0 - hy) < R)) {
      if (!midHub) out.push({ biome: 'forest', clip: (g) => g.arc(hx, hy, R, 0, Math.PI * 2) });
      else for (const z of ['ice', 'desert', 'volcano']) out.push({ biome: regionById(z).biome, rule: 'evenodd', clip: (g) => { // outside the meadow, in that quadrant
        const d = { ice: [0, -1], desert: [1, 0], volcano: [0, 1] }[z], far = R * 3;
        g.moveTo(hx, hy); g.lineTo(hx + (d[0] - d[1]) * far, hy + (d[1] + d[0]) * far); g.lineTo(hx + (d[0] + d[1]) * far, hy + (d[1] - d[0]) * far); g.closePath();
        g.moveTo(hx + R, hy); g.arc(hx, hy, R, 0, Math.PI * 2);
      } });
    }
    return out;
  }
  // round a crossing the two grounds run into each other in patches (snow creeping into the grass…)
  crossBlend(g, r, patOf) {
    const W = this.world;
    for (const c of W.crossings) {
      if (c.x < r.x0 - CROSS_BLEND || c.x > r.x1 + CROSS_BLEND || c.y < r.y0 - CROSS_BLEND || c.y > r.y1 + CROSS_BLEND) continue;
      const bl = W.borders.find((b) => b.id === c.border);
      for (let i = 0; i < 26; i++) {
        const u = Math.sin((c.x + i * 37.1) * 12.9898) * 43758.5453, v = Math.sin((c.y + i * 91.7) * 78.233) * 12543.123;
        const a = u - Math.floor(u), b = v - Math.floor(v), side = i % 2 ? 1 : -1; // a patch of this side's ground on the other side
        const d = 40 + a * CROSS_BLEND, along = (b - 0.5) * CROSS_BLEND * 1.6;
        const x = c.x - bl.n[0] * d * side + bl.d[0] * along, y = c.y - bl.n[1] * d * side + bl.d[1] * along;
        const zone = bl.between[side > 0 ? 1 : 0];
        g.globalAlpha = 0.55 * (1 - d / (CROSS_BLEND + 40));
        g.fillStyle = patOf(regionById(zone).biome);
        g.beginPath(); g.ellipse(x, y, 30 + a * 50, 20 + b * 34, a * 3, 0, Math.PI * 2); g.fill();
      }
      g.globalAlpha = 1;
    }
  }

  // borders painted into the ground: the great river, the canyon, the lava flow, the rock under the ridges
  paintBorders(g, r, t) {
    const pad = 900;
    for (const bl of this.world.borders) {
      const pts = bl.pts;
      let near = false;
      for (const [x, y] of pts) if (x > r.x0 - pad - BORDER_STEP_PAD && x < r.x1 + pad + BORDER_STEP_PAD && y > r.y0 - pad - BORDER_STEP_PAD && y < r.y1 + pad + BORDER_STEP_PAD) { near = true; break; }
      if (!near) continue;
      const w = bl.half * 2;
      g.lineCap = 'round'; g.lineJoin = 'round';
      const stroke = (width, style) => { g.lineWidth = width; g.strokeStyle = style; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
      if (bl.kind === 'river') { stroke(w + 50, '#3a3a30'); stroke(w, '#1c4a66'); stroke(w * 0.55, '#24607e'); stroke(w * 0.12, 'rgba(200,235,255,.18)'); }
      else if (bl.kind === 'canyon') { stroke(w + 60, '#5a3a22'); stroke(w, '#120a06'); stroke(w * 0.5, '#030201'); }
      else if (bl.kind === 'lava') { stroke(w + 70, '#1a1210'); stroke(w, '#7a1e08'); stroke(w * 0.6, '#e2561a'); stroke(w * 0.2, `rgba(255,${200 + Math.round(Math.sin(t) * 20)},120,.7)`); }
      else if (bl.kind === 'mountain') { // rocky ground under the ridge, open at its passes
        for (const s of this.world.fixed) if (s.border === bl.id && s.x > r.x0 - s.r * 2 && s.x < r.x1 + s.r * 2 && s.y > r.y0 - s.r * 2 && s.y < r.y1 + s.r * 2) {
          g.beginPath(); g.arc(s.x, s.y, s.r * 1.25, 0, TAU); g.fillStyle = 'rgba(70,74,86,.55)'; g.fill();
          g.beginPath(); g.arc(s.x, s.y, s.r * 0.9, 0, TAU); g.fillStyle = 'rgba(220,230,240,.35)'; g.fill();
        }
      }
    }
    for (const s of this.world.fixed) { // the pocket's black cliffs
      if (s.kind !== 'cliff' || s.x < r.x0 - s.r * 2 || s.x > r.x1 + s.r * 2 || s.y < r.y0 - s.r * 2 || s.y > r.y1 + s.r * 2) continue;
      g.beginPath(); g.arc(s.x, s.y, s.r * 1.2, 0, TAU); g.fillStyle = 'rgba(12,6,20,.8)'; g.fill();
    }
  }

  buildGates(game) {
    const P = this.gateGroup;
    while (P.children.length) { const o = P.children.pop(); dispose(o); }
    this.gatesRef = game.gates;
    for (const gt of game.gates || []) {
      const [c0, c1] = gateGlow(gt), m = gateMesh(c0, c1);
      m.position.set(gt.x * S, 0, gt.y * S); m.userData.gate = gt; P.add(m);
    }
  }
  buildChests(game) {
    const P = this.chestGroup;
    while (P.children.length) { const o = P.children.pop(); dispose(o); }
    this.chestRef = game.treasures;
    for (const tr of game.treasures || []) { const m = chestMesh(tr.lord); m.position.set(tr.x * S, 0, tr.y * S); m.userData.tr = tr; P.add(m); }
  }
  // hidden homes (3D) with their keepers, and quest places, on upright cards painted by the 2D art
  buildHomes(game) {
    const P = this.homeGroup;
    while (P.children.length) { const o = P.children.pop(); dispose(o); }
    for (const c of this.cards) c.tex.dispose();
    this.cards.length = 0;
    this.homeRef = game.hidden; this.spotRef = game.questSpots;
    for (const h of game.hidden || []) {
      P.add(homeMesh(h, this.biome));
      const px = h.hut ? h.x + 40 : h.x, py = h.y + 16;
      this.cards.push(this.card({ home: h, x: px, y: py, look: { ...h.look, outfit: h.outfit }, who: { ...h, role: 'talk' }, pose: { t: 0, moving: 0, walk: 0 }, w: 130, top: 130, bottom: 20 }));
    }
    for (const sp of game.questSpots || []) this.cards.push(this.card({ spot: sp, x: sp.x, y: sp.y, w: 150, top: 100, bottom: 40 }));
    for (const gd of gateGuards(game.fmap)) this.cards.push(this.card({ guard: gd, x: gd.x, y: gd.y, w: 110, top: 110, bottom: 20 }));
    // quest events (spec §42): the escorted walker on a card, the defended altar in 3D
    this.eventRef = game.events;
    for (const ev of game.events || []) {
      if (ev.kind === 'escort') this.cards.push(this.card({ walker: ev, x: ev.npc.x, y: ev.npc.y, look: { ...ev.look, outfit: ev.outfit }, who: { name: ev.name, title: ev.title, role: 'talk' }, pose: { t: 0, moving: 0, walk: 0 }, w: 130, top: 130, bottom: 20 }));
      if (ev.kind === 'defend') { const m = altarMesh(); m.position.set(ev.altar.x * S, 0, ev.altar.y * S); m.userData.ev = ev; P.add(m); }
      if (ev.kind === 'nest') ev.spots.forEach((p, i) => { const m = nestMesh(); m.position.set(p.x * S, 0, p.y * S); m.userData.nest = { ev, i }; P.add(m); });
      if (ev.kind === 'rescue') {
        const m = campMesh(); m.position.set(ev.start.x * S, 0, ev.start.y * S); m.userData.camp = ev; P.add(m);
        this.cards.push(this.card({ captive: ev, x: ev.start.x, y: ev.start.y + 6, look: { ...ev.look, outfit: ev.outfit }, who: { name: ev.name, title: ev.title, role: 'talk' }, pose: { t: 0, moving: 0, walk: 0 }, w: 130, top: 130, bottom: 20 }));
      }
      if (ev.kind === 'peddler') this.cards.push(this.card({ peddler: ev, x: ev.start.x, y: ev.start.y, look: { ...ev.look, outfit: ev.outfit }, who: { name: ev.name, title: ev.title, role: 'talk' }, pose: { t: 0, moving: 0, walk: 0 }, w: 130, top: 130, bottom: 20 })); // Pedagang Kelana (plan "Momen Acak")
      if (ev.kind === 'race') ev.rings.forEach(([x, y], i) => { const m = ringMesh(); m.position.set(x * S, 0, y * S); m.userData.ring = { ev, i }; P.add(m); });
    }
  }
  card(o) {
    const c = document.createElement('canvas'), tex = canvasTexture(c);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(o.w * S, (o.top + o.bottom) * S), billMat(tex));
    mesh.renderOrder = 2; mesh.visible = false; this.homeGroup.add(mesh);
    return { ...o, c, tex, mesh };
  }
  paintCard(cd, game, t, lite) {
    if (cd.walker) { // the escorted walker follows the road (spec §42)
      const n = cd.walker.npc, going = cd.walker.state === 'run' && !n.waiting;
      cd.x = n.x; cd.y = n.y; cd.pose.moving = going ? 1 : 0; cd.pose.walk = (cd.pose.walk || 0) + (going ? 0.22 : 0);
      cd.face = n.dir || cd.face || 1;
    }
    const k = sharp('card', lite), c = cd.c, w = Math.ceil(cd.w * k), h = Math.ceil((cd.top + cd.bottom) * k);
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; cd.tex.dispose(); }
    const g = c.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h);
    g.setTransform(k, 0, 0, k, (cd.w / 2 - cd.x) * k, (cd.top - cd.y) * k);
    g.lineJoin = 'round';
    const figure = (fg) => { // the person on the card (guard / hidden NPC / escorted walker)
      if (cd.walker || cd.captive || cd.peddler) { cd.pose.t = t; actor(fg, cd.x, cd.y, null, cd.look, cd.pose, cd.face || 1); return; }
      if (cd.guard) {
        if (!LOOK.anime) { drawGuard(fg, cd.guard, t); return; }
        const gd = cd.guard; // anime: the gate guard is the townsfolk 'guard' (helm, spear), not a warrior hero
        gd.pose.t = t + gd.y * 0.01; gd.pose.anime = true;
        gd.animeLook ||= { ...gd.look, outfit: GUARD_OUTFIT, npc: { role: 'gate' } };
        actor(fg, gd.x, gd.y, null, gd.animeLook, gd.pose, gd.facing);
        return;
      }
      cd.pose.t = t + cd.home.x; cd.pose.anime = LOOK.anime;
      actor(fg, cd.x, cd.y, null, cd.look, cd.pose, -1, cd.home.scale || 1);
    };
    if (cd.spot) drawQuestSpot(g, cd.spot, t);
    else if (LOOK.pixel) { // pixel art like the hero and townsfolk (spec §39); the tag stays sharp
      const kp = LOOK.pixel.k, f = (cd.fig ||= document.createElement('canvas'));
      const fw = Math.ceil(cd.w * kp), fh = Math.ceil((cd.top + cd.bottom) * kp);
      if (f.width !== fw || f.height !== fh) { f.width = fw; f.height = fh; }
      const fg = f.getContext('2d');
      fg.setTransform(1, 0, 0, 1, 0, 0); fg.clearRect(0, 0, fw, fh);
      fg.setTransform(kp, 0, 0, kp, (cd.w / 2 - cd.x) * kp, (cd.top - cd.y) * kp); fg.lineJoin = 'round';
      figure(fg);
      pixelateCanvas(f, LOOK.pixel);
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false;
      g.drawImage(f, 0, 0, w, h);
      g.restore();
    } else figure(g);
    if (cd.home) tag(g, cd.who, cd.x, cd.y, t, game.nearHidden === cd.home, cd.home.mark);
    if (cd.walker || cd.captive || cd.peddler) tag(g, cd.who, cd.x, cd.y, t, false, null);
    cd.tex.needsUpdate = true;
    const feet = cd.spot ? cd.y : cd.y + 10 * (cd.home?.scale || 1);
    cd.mesh.position.set(cd.x * S, (feet - (cd.y - cd.top + (cd.top + cd.bottom) / 2)) * S, (feet + 2) * S);
    cd.mesh.rotation.y = this.stage.yaw;
  }

  // ground tiles
  paintTile(tl, game, t) {
    const k = tl.c.width / TS, x0 = tl.ix * TS, y0 = tl.iy * TS, g = tl.c.getContext('2d'); // the side is rounded up: k from it, or the last row stays dark
    g.setTransform(k, 0, 0, k, -x0 * k, -y0 * k);
    g.lineJoin = 'round';
    const r = this.rect; r.x0 = x0; r.y0 = y0; r.x1 = x0 + TS; r.y1 = y0 + TS;
    if (this.world) { // the biome under the tile's middle, then the other side of any border through it (plan §40 C2)
      const biome = this.biomeAt(x0 + TS / 2, y0 + TS / 2), gh = this.ghostOf(biome);
      const patOf = (b) => { let p = tl.pats[b]; if (!p) { const q = this.ghostOf(b); p = tl.pats[b] = g.createPattern(q.tile.canvas, 'repeat'); p.setTransform(new DOMMatrix().scale(q.tile.T / q.tile.canvas.width)); } return p; };
      if (LOOK.detail > 0) setDetail(tl.mesh.material, gh.painted ? 'none' : GROUND_KIND[biome] || 'soil');
      drawField(g, gh, patOf(biome), t, r);
      for (const part of this.otherSides(r, biome)) { // the far side of a border, the Gerhana pocket, the meadow's edge
        g.save(); g.beginPath(); part.clip(g); g.clip(part.rule || 'nonzero');
        drawField(g, this.ghostOf(part.biome), patOf(part.biome), t, r);
        g.restore();
      }
      this.crossBlend(g, r, patOf);
      this.paintBorders(g, r, t);
      if (gh.painted) this.groundShade(g, r);
    } else {
      drawField(g, this.ghost, tl.pat, t, r);
      if (this.painted) this.groundShade(g, r);
    }
    tl.tex.needsUpdate = true; tl.ready = true;
    tl.mesh.position.set((x0 + TS / 2) * S, 0, (y0 + TS / 2) * S);
    tl.mesh.visible = true;
  }
  // soft dark under every tree, rock and bush, a little toward the front (the prototype's ground AO)
  groundShade(g, r) {
    const k = LOOK.paintGround.ao;
    for (const p of this.props) {
      if (p.kind === 'tuft') continue;
      const R = p.r * (p.kind === 'bush' ? 1.5 : 1.9);
      if (p.x < r.x0 - R || p.x > r.x1 + R || p.y < r.y0 - R || p.y > r.y1 + R) continue;
      const cy = p.y + p.r * 0.25, gr = g.createRadialGradient(p.x, cy, 0, p.x, cy, R);
      gr.addColorStop(0, `rgba(6,8,6,${(k * (p.kind === 'bush' ? 0.6 : 1)).toFixed(2)})`); gr.addColorStop(0.55, `rgba(6,8,6,${(k * 0.45).toFixed(2)})`); gr.addColorStop(1, 'rgba(6,8,6,0)');
      g.save(); g.translate(p.x, cy); g.scale(1, 0.72); g.translate(-p.x, -cy);
      g.fillStyle = gr; g.beginPath(); g.arc(p.x, cy, R, 0, Math.PI * 2); g.fill();
      g.restore();
    }
  }
  tilesFor(game, t, all) {
    const need = this.tileNeed, n = tilesAround(this.camX, this.camY, TILE_R, TS, need);
    for (const tl of this.tiles) { // let go of tiles no longer near
      if (!tl.used) continue;
      let keep = false;
      for (let i = 0; i < n && !keep; i++) keep = need[i * 2] === tl.ix && need[i * 2 + 1] === tl.iy;
      if (!keep) { tl.used = tl.ready = false; tl.mesh.visible = false; }
    }
    let painted = 0;
    for (let i = 0; i < n; i++) { // nearest first would be nicer; the ring is small and fills in a few frames
      const ix = need[i * 2], iy = need[i * 2 + 1];
      let tl = null;
      for (const q of this.tiles) if (q.used && q.ix === ix && q.iy === iy) { tl = q; break; }
      if (!tl) { for (const q of this.tiles) if (!q.used) { tl = q; break; } if (!tl) continue; tl.used = true; tl.ready = false; tl.ix = ix; tl.iy = iy; }
      if (!tl.ready && (all || painted < 1)) { this.paintTile(tl, game, t); painted++; }
    }
  }

  // props near the hero
  refill(x, y) {
    if (this.world) { this.refillWorld(x, y); return; }
    this.fillAt = this.fillAt || { x: 0, y: 0 };
    this.fillAt.x = x; this.fillAt.y = y;
    for (const K of this.kinds.values()) K.n = 0;
    gatherNear(this.index, this.props, x, y, PROP_R, this.near);
    let ns = 0;
    for (const i of this.near) {
      const p = this.props[i], K = this.kinds.get(p.key);
      if (K.n >= K.cap) continue;
      const j = K.n++;
      K.ids[j] = i; K.k[j] = -1; // −1: place on the next cutaway pass
      K.mesh.setColorAt(j, _c.setScalar(p.tint));
      if (ns < this.shadows.instanceMatrix.count) {
        const r = p.r * (p.kind === 'floatrock' ? 0.8 : p.kind === 'stone' || p.kind === 'column' ? 0.9 : 1.15) * S;
        _o.position.set((p.x + p.r * 0.15) * S, 0.02, (p.y + p.r * 0.2) * S); _o.rotation.set(0, 0, 0); _o.scale.set(r, 1, r * 0.75); _o.updateMatrix();
        this.shadows.setMatrixAt(ns++, _o.matrix);
      }
    }
    this.shadows.count = ns; this.shadows.instanceMatrix.needsUpdate = true;
    this.shadows.visible = !this.painted && !(LOOK.shadows && !this.stage.lite); // real shadows / painted shade replace the round blobs
    for (const K of this.kinds.values()) { K.mesh.count = K.n; if (K.mesh.instanceColor) K.mesh.instanceColor.needsUpdate = true; }
  }
  // props between the hero and the camera sink to stumps (and grow back), so nothing hides the fight
  cutaway(px, py, dt, playing) {
    const yaw = this.stage.yaw, zk = this.stage.zoom;
    for (const K of this.kinds.values()) {
      let changed = false;
      for (let j = 0; j < K.n; j++) {
        const p = (K.list || this.props)[K.ids[j]], goal = playing && inCutaway(p.x - px, p.y - py, yaw, zk) ? 0 : 1;
        const old = K.k[j], nk = old < 0 ? goal : old + (goal - old) * Math.min(1, dt * 9);
        if (old >= 0 && Math.abs(nk - old) < 0.002) continue;
        K.k[j] = nk; changed = true;
        const r = p.r * S;
        _o.position.set(p.x * S, (K.lift - (1 - nk) * K.sink) * r, p.y * S); // sinks into the ground
        _o.rotation.set(0, p.v * TAU, 0);
        _o.scale.set(r, r, r);
        _o.updateMatrix();
        K.mesh.setMatrixAt(j, _o.matrix);
      }
      if (changed) K.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  // per frame
  // building ahead (the loading screen, ui/loading.js)
  needsWarm(game) { return !!game.field && !!game.fmap && (!this.hemi || game.fmap !== this.mapRef); }
  async warm(game, step) {
    await step(0.1, 'torch');
    if (!this.hemi) this.setup();
    const lite = game.vfx?.mul < 1 && !game.vfx?.tempLite; // the load guard's lite: effects only, no region rebuild
    if (lite !== this.stage.lite) this.stage.setQuality(lite);
    await step(0.25, 'land');
    this.camX = game.px; this.camY = game.py;
    this.buildRegion(game);
    if (game.gates !== this.gatesRef) this.buildGates(game);
    if (game.treasures !== this.chestRef) this.buildChests(game);
    // the ground around the hero, one tile per frame
    for (let i = 0; i < 24; i++) {
      this.tilesFor(game, 0, false);
      const all = this.tiles.filter((x) => x.used), done = all.filter((x) => x.ready).length;
      if (done === all.length) break;
      await step(0.3 + 0.4 * (done / all.length), 'land');
    }
    await step(0.8, 'shadow');
    await this.stage.compile(this.scene);
  }

  draw(game, t) {
    if (!game.field || !game.fmap) { this.hide(); this.flat.draw(game, t); return; }
    if (!this.hemi) this.setup();
    const st = this.stage, v = this.view;
    st.show(true);
    v.c.style.background = 'transparent';
    const lite = game.vfx?.mul < 1 && !game.vfx?.tempLite; // the load guard's lite: effects only, no region rebuild
    if (lite !== st.lite) { st.setQuality(lite); this.mapRef = null; }
    const playing = game.state !== 0;
    const home = game.fmap.start || { x: game.px, y: game.py };
    const tx = playing ? game.px : home.x + Math.sin(t * 0.07) * 160, ty = playing ? game.py : home.y + Math.cos(t * 0.05) * 120;
    let snap = false;
    if (Math.hypot(tx - this.camX, ty - this.camY) > 600) { this.camX = tx; this.camY = ty; snap = true; } // entering, warping: jump
    if (game.fmap !== this.mapRef) { this.camX = tx; this.camY = ty; this.buildRegion(game); snap = true; }
    if (game.gates !== this.gatesRef) this.buildGates(game);
    if (game.treasures !== this.chestRef) this.buildChests(game);
    if (game.hidden !== this.homeRef || game.questSpots !== this.spotRef || game.events !== this.eventRef) this.buildHomes(game);
    this.frame++;
    this.camX += (tx - this.camX) * (playing ? 0.12 : 0.02);
    this.camY += (ty - this.camY) * (playing ? 0.12 : 0.02);
    const sh = playing && game.shake > 0 && this.flat.shakeOn ? game.shake * SHAKE_PX * S : 0;
    st.shake.x = (Math.random() - 0.5) * sh; st.shake.y = (Math.random() - 0.5) * sh;
    st.punch = playing && this.flat.punchOn ? game.punch || 0 : 0; // camera punch (plan "Rasa Pukulan" B)
    st.look(this.camX, this.camY);
    this.base.position.x = this.camX * S; this.base.position.z = this.camY * S;

    if (this.world && this.frame % 20 === 0) { // the light, fog and sky follow the biome round the hero
      const b = this.biomeAt(this.camX, this.camY);
      if (b !== this.biome) { this.biome = b; this.painted = !!LOOK.paintGround?.biomes.includes(b); this.base.material.color.set(EDGE[b] || EDGE.forest); }
    }
    this.tilesFor(game, t, snap);
    const hx = playing ? game.px : this.camX, hy = playing ? game.py : this.camY;
    if (!this.fillAt || (hx - this.fillAt.x) ** 2 + (hy - this.fillAt.y) ** 2 > REFILL * REFILL) this.refill(hx, hy);
    this.cutaway(hx, hy, 1 / 60, playing);
    this.tint(game);
    const green = this.biome === 'forest' && !!LOOK.illustrated;
    this.fireflies.update(t, this.camX, this.camY, green ? this.night || 0 : 0);
    this.lights(game, t, playing);
    this.game = game; this.t = t;
    this.actors.fx3d(game, t, playing); // before the decal: it sorts the particles into air / ground
    if (!lite || this.frame % 2 === 0) this.actors.paintDecal(game, t, lite, this.camX, this.camY, this.extra);
    this.actors.drawHero(game, t, playing, lite);
    this.actors.drawEnemies(game, t, playing);
    this.animate(game, t, lite);
    st.render(this.scene);
    this.actors.overlay(game, playing, playing ? 1 - game.time * 2.5 : 0, green ? drawFrame : null);
    this.labels(game);
  }

  // sky, sun / moon and fog from the clock (spec §18.4); Tanah Gerhana: always dusk-violet
  tint(game) {
    const sc = this.scene, fog = sc.fog;
    if (this.biome === 'eclipse') {
      this.hemi.color.set(0x8a6ac8); this.hemi.groundColor.set(0x1a0c24); this.hemi.intensity = 2.6 * LOOK.ambient;
      this.sun.color.set(0xb88cff); this.sun.intensity = 1.1 * LOOK.key;
      fog.color.set(FOG_DAY.eclipse);
      this.groundGlow(0.36);
    } else {
      const sky = skyAt(game?.clock ?? 12 * 60), n = sky.night, w = sky.warm;
      this.night = n;
      dusk(this.hemi.color.set(0xb8c4d8), 'hemi', n).lerp(_c.set(0x3a3e80), n);
      dusk(this.hemi.groundColor.set(0x4a3a2a), 'ground', n).lerp(_c.set(0x100c1c), n);
      const lk = LIGHT_K[this.biome] || 1;
      this.hemi.intensity = (3.2 - 1.8 * n) * lk * LOOK.ambient;
      dusk(this.sun.color.set(0xfff0d0), 'sun', n).lerp(_c.set(0x8a9aff), n).lerp(_c.set(0xff8040), Math.min(1, w * 4));
      this.sun.intensity = (2.4 - 1.9 * n) * lk * LOOK.key;
      this.groundGlow((0.55 - 0.35 * n) * lk);
      dusk(fog.color.set(FOG_DAY[this.biome] || FOG_DAY.forest), 'fog', n).lerp(_c2.set(FOG_NIGHT), n);
      for (const m of this.fogLayers || []) m.material.color.set(FOG_BANK[this.biome] || FOG_BANK.forest).lerp(_c2.set(FOG_BANK_NIGHT), n * 0.8);
    }
    const mist = this.biome === 'eclipse' ? 0 : game?.mist || 0; // Kabut Sunyi (plan "Momen Acak"): pale and close
    if (mist) fog.color.lerp(_c2.set(this.night > 0.5 ? 0x4a5060 : 0xb4bcc8), 0.6 * mist);
    sc.background.copy(fog.color);
    const z = this.stage.zoom;
    fog.near = 22 * z * (1 - 0.65 * mist); fog.far = (this.biome === 'eclipse' ? 48 : 58) * z * (1 - 0.45 * mist);
    const tx = this.camX * S, tz = this.camY * S;
    sunAt(this.sun, tx, tz, [-8, 18, 10]);
  }

  // the ground keeps its painted colours (as in 2D) by day, sinks into the dark by night
  groundGlow(k) {
    for (const tl of this.tiles) tl.mesh.material.emissiveIntensity = k * LOOK.groundGlow;
  }

  lights(game, t, playing) {
    const list = this.lightList, R = 900, r = this.rect;
    list.length = 0;
    r.x0 = this.camX - R; r.y0 = this.camY - R; r.x1 = this.camX + R; r.y1 = this.camY + R;
    fieldDecorLights(game, t, list, r);
    list.sort(this.byDist);
    const n = this.stage.lite ? 2 : 4;
    for (let i = 0; i < this.pool.length; i++) {
      const L = this.pool[i], l = i < n ? list[i] : null;
      if (!l) { L.intensity = 0; continue; }
      L.position.set(l.x * S, 2, l.y * S); L.color.copy(rgbOf(l.rgb)); L.distance = l.r * S * 2; L.intensity = 110 * l.tint * LOOK.points;
    }
    const night = this.biome === 'eclipse' ? 0.7 : skyAt(game.clock ?? 12 * 60).night;
    this.heroLight.position.set(game.px * S, 2.4, game.py * S);
    this.heroLight.intensity = playing ? 3 + 9 * night : 0;
  }

  animate(game, t, lite) {
    if (this.river) this.river.material.opacity = this.world || this.biome === 'volcano' ? 0.42 + Math.sin(t * 1.3) * 0.08 : this.river.material.opacity;
    for (const m of this.lakeGlows) if (m.userData.pulse || (!this.world && (this.biome === 'volcano' || this.biome === 'eclipse'))) m.scale.setScalar(1 + Math.sin(t * 1.1 + m.userData.ph) * 0.04);
    for (const m of this.fogLayers) m.userData.map.offset.y = t * m.userData.speed;
    for (const m of this.gateLamps) m.material.opacity = 0.5 + Math.sin(t * 9 + m.id) * 0.06 + Math.sin(t * 23) * 0.04;
    for (const m of this.exitGlows) { const k = 1 + Math.sin(t * 2.2) * 0.06; m.scale.set(k, k, 1); m.material.opacity = 0.42 + Math.sin(t * 2.2) * 0.1; }
    for (const grp of this.gateGroup.children) {
      const { portal, core } = grp.userData;
      portal.rotation.z = -t * 1.6;
      core.material.opacity = 0.55 + Math.sin(t * 2) * 0.15;
    }
    for (const grp of this.chestGroup.children) {
      const { tr } = grp.userData, u = grp.userData, open = tr.state === 'open', locked = tr.state === 'idle' || tr.state === 'guarded';
      u.lidC.visible = !open; u.lidO.visible = open; u.chains.visible = locked; u.lock.visible = !open;
      u.lock.material.color.set(locked ? 0x8a8a9a : 0xffd166);
      u.shine.visible = !locked; u.shine.material.opacity = open ? 0.35 : 0.7 + Math.sin(t * 3) * 0.2;
      u.glow.material.opacity = open ? 0.08 : locked ? 0.25 : 0.45;
    }
    this.homeGroup.traverse((o) => { if (o.userData.flicker != null) o.scale.setScalar(1 + Math.sin(t * 9 + o.userData.flicker) * 0.1); });
    for (const m of this.homeGroup.children) { // a defended altar: the crystal turns, dims with its HP, flashes when struck
      const ev = m.userData.ev;
      if (!ev) continue;
      const a = ev.altar, k = ev.state === 'run' ? Math.max(0, a.hp / a.maxHp) : 1, u = m.userData;
      u.crystal.rotation.y = t * 0.8; u.crystal.position.y = (64 + Math.sin(t * 2) * 4) * S;
      u.crystal.material.emissive.setRGB(a.hurtT > 0 ? 1 : 0.3 + 0.5 * k, a.hurtT > 0 ? 0.2 : 0.6 * k + 0.2, a.hurtT > 0 ? 0.2 : 1 * k + 0.2);
      u.glow.material.opacity = (ev.state === 'run' ? 0.25 + 0.35 * k : 0.3) + Math.sin(t * 3) * 0.05;
    }
    for (const m of this.homeGroup.children) { // quest nests: dormant, alive (pulsing, flashing when struck) or gone
      const nn = m.userData.nest;
      if (!nn) continue;
      const { ev, i } = nn, e = ev.nests?.[i], live = ev.state === 'run' ? !!e && e.hp > 0 : ev.state !== 'done';
      m.visible = live;
      if (!live) continue;
      const u = m.userData, hit = e?.flash > 0;
      u.core.scale.setScalar(1 + Math.sin(t * 4 + i) * 0.12);
      u.core.material.color.setRGB(hit ? 1 : 0.85, hit ? 1 : 0.25, hit ? 1 : 0.9);
      u.glow.material.opacity = (ev.state === 'run' ? 0.5 : 0.25) + Math.sin(t * 3 + i) * 0.1;
    }
    for (const m of this.homeGroup.children) { // a camp's cage door; race rings: only those ahead, the next one bright
      if (m.userData.camp) { const ev = m.userData.camp, open = ev.unlocked || ev.state === 'done'; m.userData.door.position.y = (open ? 70 : 0) * S; m.userData.door.visible = ev.state !== 'done'; }
      const rr = m.userData.ring;
      if (!rr) continue;
      const { ev, i } = rr, next = ev.state === 'run' ? ev.ring : 0;
      m.visible = ev.state !== 'done' && (ev.state === 'run' ? i >= next : i === 0);
      if (!m.visible) continue;
      const on = i === next, k = on ? 1 + Math.sin(t * 5) * 0.08 : 0.8;
      m.scale.setScalar(k); m.rotation.y = this.stage.yaw;
      m.userData.band.material.opacity = on ? 0.95 : 0.35;
    }
    for (const cd of this.cards) { // walkers move every frame, not only when repainted
      if (!cd.walker) continue;
      const n = cd.walker.npc, feet = n.y + 10;
      cd.mesh.position.set(n.x * S, (feet - (n.y - cd.top + (cd.top + cd.bottom) / 2)) * S, (feet + 2) * S);
    }
    // cards near the hero are repainted (every other frame; every 4th in Ringan)
    const every = lite ? 4 : 2;
    for (let i = 0; i < this.cards.length; i++) {
      const cd = this.cards[i], d2 = (cd.x - this.camX) ** 2 + (cd.y - this.camY) ** 2;
      cd.mesh.visible = d2 < 1100 * 1100 && !(cd.walker && cd.walker.state === 'done') && !(cd.captive && cd.captive.state === 'done');
      if (cd.mesh.visible && ((this.frame + i) % every === 0 || !cd.c.width)) this.paintCard(cd, game, t, lite);
    }
  }

  // ground art drawn into the actors' decal layer: chest daises, sand humps, the expedition arrows
  groundExtra(g, visible) {
    const game = this.game, t = this.t;
    for (const tr of game.treasures || []) {
      if (!visible(tr.x, tr.y, 100)) continue;
      const s = tr.lord ? 1.35 : 1, open = tr.state === 'open', locked = tr.state === 'idle' || tr.state === 'guarded';
      g.beginPath(); g.ellipse(tr.x, tr.y + 8, 62 * s, 40 * s, 0, 0, TAU);
      g.fillStyle = 'rgba(30,26,40,.6)'; g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(230,194,122,.4)'; g.stroke();
      if (!open) for (let i = 0; i < 8; i++) {
        const a = t * 0.6 + (i / 8) * TAU;
        g.beginPath(); g.arc(tr.x + Math.cos(a) * 52 * s, tr.y + 8 + Math.sin(a) * 34 * s, 4, 0, TAU);
        g.fillStyle = `rgba(255,${locked ? 150 : 210},80,${(0.5 + 0.4 * Math.sin(t * 3 + i)).toFixed(2)})`; g.fill();
      }
    }
    for (const e of game.enemies) { // a burrowed sandworm: a moving hump of sand (spec §25.4)
      if (!e.hidden || e.ai !== 'burrow' || !visible(e.x, e.y, 40)) continue; // only a sandworm digs (bushes, blinking elites, fallen twins are drawn elsewhere)
      const x = e.x + (e.mode === 'rise' ? Math.sin(t * 60) * 3 : 0), y = e.y + e.r * 0.4;
      g.beginPath(); g.ellipse(x, y, e.r * 1.1, e.r * 0.6, 0, 0, TAU); g.fillStyle = '#8a6440'; g.fill();
      g.lineWidth = 1.5; g.strokeStyle = 'rgba(30,18,10,.7)'; g.stroke();
      g.beginPath(); g.ellipse(x - e.r * 0.2, y - e.r * 0.15, e.r * 0.6, e.r * 0.25, 0, 0, TAU); g.fillStyle = 'rgba(220,180,120,.45)'; g.fill();
    }
    for (const ev of game.events || []) { // where a quest event starts (spec §42): a turning ring of gold
      if (ev.kind === 'outlaw' || ev.kind === 'race' || ev.kind === 'rescue' || ev.quiet || ev.state !== 'wait' || ev.cool > 0 || !visible(ev.start.x, ev.start.y, START_R + 20)) continue; // quiet ones (plan "Momen Acak") are found by their own signs
      const pulse = 0.5 + 0.5 * Math.sin(t * 3);
      g.save(); g.translate(ev.start.x, ev.start.y); g.scale(1, 0.7);
      g.setLineDash([18, 12]); g.lineDashOffset = -t * 30; g.lineWidth = 4; g.strokeStyle = `rgba(255,210,74,${(0.55 + pulse * 0.35).toFixed(2)})`;
      g.beginPath(); g.arc(0, 0, START_R, 0, TAU); g.stroke(); g.setLineDash([]);
      g.fillStyle = `rgba(255,210,74,${(0.08 + pulse * 0.06).toFixed(2)})`; g.fill();
      g.restore();
    }
    for (const ev of game.events || []) { // Cahaya Aneh (plan "Momen Acak"): a pale pool of light on the ground under it
      if (ev.kind !== 'wisp' || !ev.orb || !visible(ev.orb.x, ev.orb.y, 120)) continue;
      const o = ev.orb, k = 0.75 + 0.25 * Math.sin(t * 3), r = 70 + 10 * k;
      const gr = g.createRadialGradient(o.x, o.y, 0, o.x, o.y, r);
      gr.addColorStop(0, `rgba(190,232,255,${(0.32 * k).toFixed(3)})`); gr.addColorStop(1, 'rgba(140,180,255,0)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(o.x, o.y, r, r * 0.55, 0, 0, TAU); g.fill();
    }
    for (const ev of game.events || []) { // Pedagang Kelana (plan "Momen Acak"): his lantern's warm pool, and a ring filling while you stand to buy
      if (ev.kind !== 'peddler' || !visible(ev.start.x, ev.start.y, 200)) continue;
      const x = ev.start.x, y = ev.start.y + 6, k = 0.85 + 0.15 * Math.sin(t * 7) * Math.sin(t * 3.1), r = 120 * k;
      const gr = g.createRadialGradient(x + 20, y, 0, x + 20, y, r);
      gr.addColorStop(0, `rgba(255,200,110,${(0.34 * k).toFixed(3)})`); gr.addColorStop(1, 'rgba(255,150,60,0)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(x + 20, y, r, r * 0.55, 0, 0, TAU); g.fill();
      if (ev.hold > 0 && !ev.sold) {
        const P = HAPPEN.peddler;
        g.save(); g.translate(x, y); g.scale(1, 0.6); g.lineWidth = 5; g.strokeStyle = 'rgba(255,207,122,.85)';
        g.beginPath(); g.arc(0, 0, 70, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, ev.hold / P.hold)); g.stroke();
        g.restore();
      }
    }
    for (const ev of game.events || []) { // a meteor shower (spec §42): warnings, impacts, crystals to pick up
      if (ev.kind !== 'meteor' || ev.state !== 'run') continue;
      const M = HAPPEN.meteor;
      for (const f of ev.falls) {
        if (!visible(f.x, f.y, M.blast)) continue;
        const k = 1 - f.t / M.warn;
        g.save(); g.translate(f.x, f.y); g.scale(1, 0.7);
        g.beginPath(); g.arc(0, 0, M.blast, 0, TAU); g.lineWidth = 3; g.strokeStyle = `rgba(255,70,50,${(0.5 + 0.4 * Math.sin(t * 20)).toFixed(2)})`; g.stroke();
        g.beginPath(); g.arc(0, 0, M.blast * k, 0, TAU); g.fillStyle = `rgba(255,90,40,${(0.18 + 0.3 * k).toFixed(2)})`; g.fill();
        g.restore();
      }
      for (const b of ev.booms) {
        const k = 1 - b.t / 0.35, gr = g.createRadialGradient(b.x, b.y, 0, b.x, b.y, M.blast * (0.6 + k));
        gr.addColorStop(0, `rgba(255,230,160,${(0.9 * (1 - k)).toFixed(2)})`); gr.addColorStop(1, 'rgba(255,90,30,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(b.x, b.y, M.blast * (0.6 + k), 0, TAU); g.fill();
      }
      for (const c of ev.crystals) {
        if (!visible(c.x, c.y, 30)) continue;
        const bob = Math.sin(t * 4 + c.x) * 3, a = c.life < 3 ? (Math.sin(t * 16) > 0 ? 0.4 : 1) : 1;
        g.save(); g.globalAlpha = a;
        const gr = g.createRadialGradient(c.x, c.y, 0, c.x, c.y, 36); gr.addColorStop(0, 'rgba(120,220,255,.6)'); gr.addColorStop(1, 'rgba(120,220,255,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(c.x, c.y, 36, 0, TAU); g.fill();
        g.beginPath(); g.moveTo(c.x, c.y - 16 + bob); g.lineTo(c.x + 8, c.y - 4 + bob); g.lineTo(c.x, c.y + 6 + bob); g.lineTo(c.x - 8, c.y - 4 + bob); g.closePath();
        g.fillStyle = '#9ae8ff'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = '#1a3a5a'; g.stroke();
        g.restore();
      }
    }
    if (game.state !== 0) targetArrow(g, game, t);
  }

  // an outlaw's name and HP, each nest's HP (spec §42)
  foeBars(game, ev) {
    const g = this.view.ctx, dpr = this.view.c.width / innerWidth;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const one = ev.kind === 'outlaw' || ev.kind === 'giant', list = one ? [ev.foe] : ev.nests; // giant: Raksasa Pengembara (plan "Momen Acak")
    for (const e of list) {
      if (!e || e.hp <= 0) continue;
      const p = this.stage.project(e.x, e.y, e.r * 2.6 + 40);
      if (!p) continue;
      const w = one ? 80 : 48, k = Math.max(0, e.hp / e.maxHp);
      g.fillStyle = 'rgba(10,8,20,.85)'; g.fillRect(p.x - w / 2 - 2, p.y - 2, w + 4, 8);
      g.fillStyle = one ? '#ff8a3c' : '#c86aff'; g.fillRect(p.x - w / 2, p.y, w * k, 4);
      if (one) {
        g.font = '700 13px Barlow, system-ui, sans-serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(10,8,20,.9)';
        g.strokeText(ev.name, p.x, p.y - 6); g.fillStyle = '#ffb36a'; g.fillText(ev.name, p.x, p.y - 6);
      }
    }
  }

  // the dungeon's name over a gate the hero stands at; HP bars over a quest event's walker / altar
  labels(game) {
    if (game.state !== 0) for (const ev of game.events || []) {
      if (ev.state !== 'run') continue;
      if (ev.kind === 'outlaw' || ev.kind === 'nest' || ev.kind === 'giant') { this.foeBars(game, ev); continue; }
      const who = ev.npc || ev.altar; // a meteor shower or a wisp has no one to guard
      if (!who) continue;
      const p = this.stage.project(who.x, who.y, ev.npc ? 150 : 130);
      if (!p) continue;
      const g = this.view.ctx, dpr = this.view.c.width / innerWidth, w = 64, k = Math.max(0, who.hp / who.maxHp);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.fillStyle = 'rgba(10,8,20,.85)'; g.fillRect(p.x - w / 2 - 2, p.y - 2, w + 4, 9);
      g.fillStyle = k > 0.5 ? '#6ee07a' : k > 0.25 ? '#ffd166' : '#ff5d5d'; g.fillRect(p.x - w / 2, p.y, w * k, 5);
      if (ev.kind === 'defend') { // time left
        g.fillStyle = 'rgba(255,210,74,.9)'; g.fillRect(p.x - w / 2, p.y + 6, w * Math.min(1, ev.t / DEFEND.time), 1.5);
      }
      if (ev.npc?.waiting) { g.font = '600 12px Barlow, system-ui, sans-serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(10,8,20,.9)'; g.strokeText(tf('menunggumu…'), p.x, p.y - 6); g.fillStyle = '#f3e2b8'; g.fillText(tf('menunggumu…'), p.x, p.y - 6); }
    }
    const race = game.state !== 0 && (game.events || []).find((e) => e.kind === 'race' && e.state === 'run');
    if (race) { // the race clock, top centre
      const g = this.view.ctx, dpr = this.view.c.width / innerWidth, x = innerWidth / 2, y = 64;
      const goal = race.t <= race.times.gold ? ['gold', '#ffd24a'] : race.t <= race.times.silver ? ['silver', '#d8dce8'] : ['bronze', '#d08a4a'];
      const text = `${race.t.toFixed(1)} s  ·  ${tf(MEDAL[goal[0]])} ≤ ${race.times[goal[0]].toFixed(0)} s  ·  ${race.ring}/${race.rings.length - 1}`;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.font = '700 18px Barlow, system-ui, sans-serif'; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = 'rgba(10,8,20,.9)';
      g.strokeText(text, x, y); g.fillStyle = goal[1]; g.fillText(text, x, y);
    }
    const gt = game.nearGate;
    if (!gt || game.state === 0) return;
    const p = this.stage.project(gt.x, gt.y, 160);
    if (!p) return;
    const g = this.view.ctx, dpr = this.view.c.width / innerWidth, name = dungeonById(gt.dungeon).name;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.font = '700 15px Barlow, system-ui, sans-serif'; g.textAlign = 'center';
    g.lineWidth = 4; g.strokeStyle = 'rgba(10,8,20,.9)'; g.strokeText(name, p.x, p.y);
    g.fillStyle = '#f3e2b8'; g.fillText(name, p.x, p.y);
    g.setTransform(1, 0, 0, 1, 0, 0);
  }
}
