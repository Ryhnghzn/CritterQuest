// Example page (not in the build): A = arrange your own home (move, rotate, place furniture
// from a bag, comfort), B = home tiers (Pondok → Rumah → Rumah Besar: bigger rooms, new
// corners, the house in town changes). The rooms are built by the game's own interior builder
// (render3d/interior3d.js) and the house outside by its town builder (townbuild.js house()).
// All numbers and costs here are only an example.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { S, toon } from '../src/render3d/stage.js';
import { buildRoom, ROOM_H } from '../src/render3d/interior3d.js';
import { house } from '../src/render3d/townbuild.js';
import { NightMats, GEO, Batch, glow } from '../src/render3d/kit3d.js';
import { drawAnime, ANIME_H, CLASS_LOOK } from '../src/art/anime/index.js';
import { LOOK } from '../src/data/look.js';

const $ = (id) => document.getElementById(id);
const WALL = 24, BACK = 76, DOOR = 50, GRID = 10;
const SHARED_GEO = new Set(Object.values(GEO));

// ─── the furniture ─────────────────────────────────────────────────────────
// w × h: footprint (wall pieces: width along the wall × height on it, y = top on the wall).
// place: 'floor' | 'wall' | 'back' (stands against the back wall, slides along it only).
// comfort: counted once per kind. fn: what it does. own: how many the bag holds. tier: needs this home tier.
const KIND = {
  bed: { name: 'Tempat Tidur', w: 74, h: 110, place: 'floor', tall: 34, comfort: 2, fn: 'Tidur gratis, HP penuh', own: 1, fixed: true },
  fireplace: { name: 'Perapian', w: 80, h: 64, y: 14, place: 'back', tall: ROOM_H, comfort: 2, fn: 'Buff Segar +5 menit', own: 1, fixed: true },
  table: { name: 'Meja', w: 80, h: 46, place: 'floor', tall: 22, comfort: 1, own: 2 },
  stool: { name: 'Bangku Kecil', w: 16, h: 16, place: 'floor', tall: 13, comfort: 1, own: 4, center: true },
  chest: { name: 'Peti Simpan', w: 46, h: 30, place: 'floor', tall: 23, comfort: 0, fn: 'Gudang +10 slot (tiap peti)', own: 3 },
  rug: { name: 'Karpet', w: 140, h: 100, place: 'floor', tall: 2, comfort: 1, own: 2, rug: true, color: '#7a3a2a' },
  plant: { name: 'Tanaman', w: 22, h: 22, place: 'floor', tall: 36, comfort: 1, own: 3, center: true },
  barrel: { name: 'Tong', w: 22, h: 26, place: 'floor', tall: 24, comfort: 0, own: 3 },
  crate: { name: 'Peti Kayu', w: 26, h: 26, place: 'floor', tall: 18, comfort: 0, own: 3 },
  bench: { name: 'Bangku Panjang', w: 70, h: 14, place: 'floor', tall: 12, comfort: 1, own: 2 },
  desk: { name: 'Meja Tulis', w: 80, h: 30, place: 'floor', tall: 22, comfort: 1, fn: 'Baca Jurnal & Kenangan', own: 1 },
  dummy: { name: 'Patung Latihan', w: 30, h: 20, place: 'floor', tall: 42, comfort: 1, fn: 'XP +3% selama Segar', own: 1 },
  window: { name: 'Jendela', w: 46, h: 40, y: 22, place: 'wall', comfort: 1, own: 2 },
  shelf: { name: 'Rak Dinding', w: 110, h: 50, y: 18, place: 'wall', comfort: 1, own: 2, items: 'mugs' },
  cauldron: { name: 'Kuali Racik', w: 44, h: 44, place: 'floor', tall: 24, comfort: 1, fn: 'Racik ramuan di rumah', own: 1, tier: 1 },
  herbs: { name: 'Gantungan Herbal', w: 80, h: 40, y: 16, place: 'wall', comfort: 1, fn: '1 Ramuan Merah tumbuh tiap hari', own: 1, tier: 1 },
  sacks: { name: 'Karung', w: 52, h: 36, place: 'floor', tall: 20, comfort: 0, own: 2, tier: 1 },
  showcase: { name: 'Lemari Kaca', w: 90, h: 30, place: 'floor', tall: 30, comfort: 2, fn: 'Pajang 3 gear langka', own: 1, tier: 2, items: 'blades' },
  armorstand: { name: 'Sandaran Zirah', w: 26, h: 16, place: 'floor', tall: 46, comfort: 1, fn: 'Pajang zirah', own: 1, tier: 2 },
  mannequin: { name: 'Manekin', w: 28, h: 16, place: 'floor', tall: 50, comfort: 1, fn: 'Pajang set gear', own: 1, tier: 2 },
  trophy: { name: 'Piala Bos', w: 50, h: 46, y: 14, place: 'wall', comfort: 2, fn: 'Koin +2% selama Segar', own: 2, tier: 2 },
  banner: { name: 'Panji Cabang', w: 34, h: 56, y: 10, place: 'wall', comfort: 1, fn: 'Lambang cabang job-mu', own: 2, tier: 2, color: '#3a4ab3' },
  rack: { name: 'Rak Senjata', w: 90, h: 56, y: 12, place: 'wall', comfort: 1, fn: 'Pajang senjata', own: 1, tier: 2 },
};

// ─── the home tiers (B) ────────────────────────────────────────────────────
const P = (kind, x, y, extra) => ({ kind, x, y, w: KIND[kind].w, h: KIND[kind].h, ...extra });
const TIERS = [
  { name: 'Pondok', w: 400, h: 300, cap: 12, wallColor: '#5a4636', cost: 'Sudah punya',
    adds: ['Tempat tidur gratis', 'Perapian & meja makan'],
    outside: [{ style: 'cottage', x: 360, y: 260, w: 180, h: 160, roof: '#8a4a2a' }],
    layout: () => [P('bed', 30, 84), P('fireplace', 290, 14), P('table', 170, 150), P('stool', 142, 200), P('stool', 242, 200),
      P('shelf', 120, 18), P('chest', 320, 220), P('rug', 140, 130), P('plant', 28, 234), P('window', 50, 22)] },
  { name: 'Rumah', w: 520, h: 360, cap: 20, wallColor: '#5a4a3a', cost: '800 koin · 30 kayu · 20 batu',
    adds: ['Ruangan lebih luas (12 → 20 perabot)', 'Pojok dapur: Kuali Racik & Gantungan Herbal', 'Sayap rumah baru di kota, tumpukan kayu, kebun kecil'],
    outside: [{ style: 'wing', x: 320, y: 250, w: 260, h: 170, roof: '#6a3a3a' }],
    layout: () => [P('bed', 30, 90), P('window', 50, 22), P('shelf', 120, 18), P('fireplace', 250, 14), P('herbs', 390, 16),
      P('table', 170, 160), P('stool', 142, 210), P('stool', 262, 210), P('rug', 140, 140), P('cauldron', 420, 110), P('barrel', 470, 190),
      P('sacks', 430, 262), P('chest', 330, 282), P('plant', 30, 300), P('window', 330, 22)] },
  { name: 'Rumah Besar', w: 660, h: 420, cap: 32, wallColor: '#4a3a4a', cost: '2500 koin · 60 kayu · 50 batu · 10 bijih langka',
    adds: ['Ruang trofi: Lemari Kaca, Piala Bos, Panji, Rak Senjata', 'Muat 32 perabot', 'Rumah bertingkat + bangunan samping, halaman berpagar, lampu taman'],
    outside: [{ style: 'tall', x: 300, y: 220, w: 200, h: 180, roof: '#4a5a7a' }, { style: 'cottage', x: 510, y: 270, w: 140, h: 130, roof: '#4a5a7a' }],
    layout: () => [P('bed', 30, 90), P('window', 40, 22), P('shelf', 110, 18), P('herbs', 230, 16), P('fireplace', 300, 14), P('trophy', 410, 14),
      P('banner', 476, 10), P('banner', 520, 10, { color: '#b33a3a' }), P('rack', 562, 12), P('table', 180, 170), P('stool', 162, 226), P('stool', 262, 226),
      P('rug', 150, 150), P('cauldron', 112, 100), P('showcase', 430, 108), P('armorstand', 556, 110), P('mannequin', 600, 110),
      P('dummy', 540, 210), P('rug', 420, 170, { w: 170, h: 110, color: '#2a3a6a' }), P('bench', 440, 300), P('chest', 560, 340),
      P('barrel', 610, 250), P('plant', 30, 362), P('sacks', 90, 330)] },
];

// ─── state ─────────────────────────────────────────────────────────────────
const state = { tier: 0, view: 'in', edit: false, night: 0.15, sel: null, drag: null, placing: null };
let uid = 1;
const layouts = TIERS.map((T) => T.layout().map((p) => ({ ...p, id: uid++ })));
const pieces = () => layouts[state.tier];
const tierOf = () => TIERS[state.tier];

// ─── rules (pure) ──────────────────────────────────────────────────────────
const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const wallish = (p) => KIND[p.kind].place !== 'floor'; // takes room on the back wall (wall pieces and the fireplace)
function floorRect(p) { // what a piece covers on the floor (a 'back' piece reaches the back wall band)
  if (KIND[p.kind].place === 'back') return { x: p.x, y: BACK - 22, w: p.w, h: 24 };
  return p;
}
// why piece p can't stand where it is (null = it can)
function blocked(p, list, T) {
  const k = KIND[p.kind];
  if (p.x < WALL + 2 || p.x + p.w > T.w - WALL - 2) return 'keluar ruangan';
  if (k.place !== 'floor') {
    for (const o of list) if (o !== p && wallish(o) && p.x < o.x + o.w + 4 && o.x < p.x + p.w + 4) return `menabrak ${KIND[o.kind].name}`;
    if (k.place === 'wall') return null;
  } else {
    if (p.y < BACK - 4 || p.y + p.h > T.h - WALL - 2) return 'keluar ruangan';
    const door = { x: T.w / 2 - DOOR / 2 - 8, y: T.h - WALL - 48, w: DOOR + 16, h: 48 };
    if (!k.rug && overlap(p, door)) return 'menutup pintu';
  }
  if (k.rug) { for (const o of list) if (o !== p && KIND[o.kind].rug && overlap(p, o)) return 'menumpuk karpet'; return null; }
  for (const o of list) if (o !== p && !KIND[o.kind].rug && KIND[o.kind].place !== 'wall' && overlap(floorRect(p), floorRect(o))) return `menabrak ${KIND[o.kind].name}`;
  return null;
}
function comfort(list) {
  const kinds = new Set(list.map((p) => p.kind));
  let c = 0; for (const k of kinds) c += KIND[k].comfort;
  return c;
}
const LEVELS = [[0, 'Sederhana'], [6, 'Nyaman'], [11, 'Hangat'], [16, 'Megah']];
const levelOf = (c) => LEVELS.filter(([n]) => c >= n).pop()[1];

// ─── 3D ────────────────────────────────────────────────────────────────────
const stageEl = $('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = LOOK.exposure;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stageEl.prepend(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.3, 200);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), LOOK.bloom.strength, LOOK.bloom.radius, LOOK.bloom.threshold);
composer.addPass(bloom); composer.addPass(new OutputPass());
function resize() {
  const w = stageEl.clientWidth, h = stageEl.clientHeight;
  renderer.setSize(w, h); composer.setSize(w, h); composer.setPixelRatio(renderer.getPixelRatio());
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stageEl);

const hemi = new THREE.HemisphereLight(0x8a7aa8, 0x1a1018, 1.1 * LOOK.ambient); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe0c0, 0.35); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 90 }); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.06;
scene.add(sun); scene.add(sun.target);
const pool = Array.from({ length: 7 }, () => { const L = new THREE.PointLight(0xffa050, 0, 10, 1.6); scene.add(L); return L; });
const mats = {
  nightMats: new NightMats(),
  emberMat: new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff6a20).multiplyScalar(1.6) }),
  fireMat: new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffb347).multiplyScalar(2.2) }),
  roomWin: new THREE.MeshBasicMaterial({ color: 0xbfe4ff }),
  glassMat: new THREE.MeshLambertMaterial({ color: 0xa8d0ff, transparent: true, opacity: 0.28, depthWrite: false }),
};

function dispose(root) {
  root.traverse((o) => { if (o.geometry && !SHARED_GEO.has(o.geometry)) o.geometry.dispose(); });
}

// the room as the game's room data, from the pieces (hidden: the one being dragged)
function roomData(hidden) {
  const T = tierOf(), list = pieces().filter((p) => p !== hidden);
  const furniture = list.map((p) => {
    const k = KIND[p.kind], f = { kind: p.kind, x: p.x, y: p.y, w: p.w, h: p.h, solid: !k.rug };
    if (k.center) { f.x = p.x + p.w / 2; f.y = p.y + p.h / 2; }
    if (k.items) f.items = k.items;
    if (p.color || k.color) f.color = p.color || k.color;
    return f;
  });
  const lights = [{ x: T.w / 2, y: (BACK + T.h) / 2, r: 150, rgb: '255,190,120' }];
  for (const p of list) {
    if (p.kind === 'fireplace') lights.push({ x: p.x + p.w / 2, y: BACK + 26, r: 200, rgb: '255,150,70' });
    if (p.kind === 'cauldron') lights.push({ x: p.x + p.w / 2, y: p.y + p.h / 2, r: 100, rgb: '90,255,140' });
    if (p.kind === 'table') lights.push({ x: p.x + p.w / 2, y: p.y + p.h / 2, r: 110, rgb: '255,200,130' });
    if (p.kind === 'showcase') lights.push({ x: p.x + p.w / 2, y: p.y + p.h, r: 100, rgb: '170,200,255' });
  }
  return { id: `rumah${state.tier}`, w: T.w, h: T.h, wall: WALL, back: BACK, doorW: DOOR, talkRadius: 70, name: 'Rumahmu', floor: 'wood', wallColor: T.wallColor, furniture, lights, npcs: [] };
}

let place = null; // what is in the scene: { root, lights, flames, panels? }
function show(p) {
  if (place) { scene.remove(place.root); dispose(place.root); }
  place = p; scene.add(p.root);
  if (p.panels) for (const pn of p.panels) if (pn.p.ny > 0.3) pn.grp.scale.y = 0.12; // the walls toward the camera sink (doll's house)
}
function rebuild(hidden = null) {
  if (state.view === 'in') show(buildRoom(roomData(hidden), mats));
  else show(buildOutside());
  overlayDirty = true;
}

// the house in town (B)
function buildOutside() {
  const T = tierOf(), root = new THREE.Group();
  const out = { root, lights: [], embers: [], lamps: [], flames: [], smokes: [], occluders: [], doors: [], nightMats: mats.nightMats, emberMat: mats.emberMat };
  const grass = new THREE.Mesh(GEO.plane, toon(0x3c4a30)); grass.rotation.x = -Math.PI / 2; grass.scale.set(1600 * S, 1300 * S, 1); grass.position.set(450 * S, 0, 350 * S); grass.receiveShadow = true; root.add(grass);
  const B = new Batch(), box = (c, x, y, w, d, y0, h) => B.boxAt(toon(c), x, y, w, d, y0, h);
  const main = T.outside[0], door = main.x + main.w / 2;
  box(0x6a5a48, door - 22, main.y + main.h, 44, 300, 0, 1.2); // the path to the door
  for (const b of T.outside) house(root, { id: 'myhome', kind: 'house', ...b }, 'home', out);
  box(0x7a5236, main.x - 40, main.y + main.h - 30, 22, 22, 0, 16); // crates & a barrel by the door
  B.add(GEO.cyl, toon(0x8a5a36), (main.x - 24) * S, 12 * S, (main.y + main.h + 6) * S, 20 * S, 24 * S, 20 * S);
  if (state.tier >= 1) { // a woodpile and a small garden
    for (let i = 0; i < 9; i++) B.add(GEO.cyl6, toon(i % 2 ? 0x8a5a36 : 0x6a4228), (main.x + main.w + 30 + (i % 3) * 13) * S, (6 + Math.floor(i / 3) * 11) * S, (main.y + 40) * S, 12 * S, 40 * S, 12 * S, Math.PI / 2);
    garden(B, main.x - 150, main.y + 40, 100, 70);
  }
  if (state.tier >= 2) { // a fenced yard, more beds, a garden lamp and a banner pole
    fence(B, 230, 170, 470, 420, door);
    garden(B, main.x - 150, main.y + 140, 100, 70);
    box(0x2a2230, door + 70, main.y + main.h + 60, 6, 6, 0, 70);
    const lamp = new THREE.Mesh(GEO.ball, glow(0xffd27a, 2.2)); lamp.scale.setScalar(12 * S); lamp.position.set((door + 73) * S, 74 * S, (main.y + main.h + 63) * S); root.add(lamp);
    out.lights.push({ x: door + 73, y: main.y + main.h + 63, h: 74, color: new THREE.Color(0xffc070), int: 6, dist: 7, night: true, ph: 1 });
    box(0x4a2c1a, door - 90, main.y + main.h + 50, 5, 5, 0, 110);
    B.add(GEO.box, toon(0x3a4ab3, 0x1a1a5a), (door - 76) * S, 88 * S, (main.y + main.h + 52) * S, 26 * S, 40 * S, 1.5 * S);
  }
  B.build(root);
  root.traverse((o) => { if (o.isMesh && o !== grass) { o.castShadow = true; o.receiveShadow = true; } });
  return out;
}
function garden(B, x, y, w, h) {
  B.boxAt(toon(0x3a2a1c), x, y, w, h, 0, 5);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) B.add(GEO.ball, toon((i + j) % 3 ? 0x5a9a3e : 0xd0a040), (x + 14 + i * (w - 28) / 3) * S, 10 * S, (y + 14 + j * (h - 28) / 2) * S, 12 * S, 14 * S, 12 * S);
}
function fence(B, x0, y0, x1, y1, gapX) {
  const post = toon(0x6a4228), rail = toon(0x8a5a36);
  const run = (ax, ay, bx, by) => {
    const L = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.round(L / 30));
    for (let i = 0; i <= n; i++) { const x = ax + (bx - ax) * i / n, y = ay + (by - ay) * i / n; B.add(GEO.box, post, x * S, 14 * S, y * S, 5 * S, 28 * S, 5 * S); }
    const ang = Math.atan2(by - ay, bx - ax);
    for (const hy of [10, 22]) B.add(GEO.box, rail, (ax + bx) / 2 * S, hy * S, (ay + by) / 2 * S, L * S, 3 * S, 3 * S, 0, -ang);
  };
  run(x0, y0, x1, y0); run(x0, y0, x0, y1); run(x1, y0, x1, y1);
  run(x0, y1, gapX - 40, y1); run(gapX + 40, y1, x1, y1);
}

// the hero standing in the room / the yard, for scale
const HERO_K = 2.4, HERO_H = 92;
const heroC = document.createElement('canvas'); heroC.width = Math.ceil(100 * HERO_K); heroC.height = Math.ceil((HERO_H + 14) * HERO_K);
const heroG = heroC.getContext('2d'), heroTex = new THREE.CanvasTexture(heroC); heroTex.colorSpace = THREE.SRGBColorSpace;
const heroGeo = new THREE.PlaneGeometry(100 * S, (HERO_H + 14) * S); heroGeo.translate(0, ((HERO_H + 14) / 2 - 8) * S, 0);
const hero = new THREE.Mesh(heroGeo, new THREE.MeshLambertMaterial({ map: heroTex, transparent: true, alphaTest: 0.05, side: THREE.DoubleSide }));
hero.renderOrder = 2; scene.add(hero);
const heroLook = { style: 'spiky', hair: 'black', eye: CLASS_LOOK.warrior.eye, element: CLASS_LOOK.warrior.mythic, gear: { weapon: 4, helm: 3, armor: 3, boots: 3, amulet: null, ring: null } };
function drawHero(t) {
  const s = (HERO_H * HERO_K) / ANIME_H;
  heroG.setTransform(1, 0, 0, 1, 0, 0); heroG.clearRect(0, 0, heroC.width, heroC.height);
  heroG.setTransform(s, 0, 0, s, heroC.width / 2, heroC.height - 8 * HERO_K);
  drawAnime(heroG, 'warrior', heroLook, { t, view: 'front' });
  heroTex.needsUpdate = true;
}

// edit marks: the floor grid & footprints (a canvas laid on the floor), a box on the selected / ghost piece
const OV_K = 2;
const ovC = document.createElement('canvas'), ovG = ovC.getContext('2d'), ovTex = new THREE.CanvasTexture(ovC);
const overlay = new THREE.Mesh(GEO.plane, new THREE.MeshBasicMaterial({ map: ovTex, transparent: true, depthWrite: false }));
overlay.rotation.x = -Math.PI / 2; overlay.renderOrder = 3; scene.add(overlay);
let overlayDirty = true;
const boxGeo = new THREE.BoxGeometry(1, 1, 1); boxGeo.translate(0, 0.5, 0);
const edgeGeo = new THREE.EdgesGeometry(boxGeo);
function marker(color, fill) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(boxGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: fill, depthWrite: false }));
  const e = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color, transparent: true, depthTest: false }));
  m.renderOrder = e.renderOrder = 4; g.add(m, e); g.visible = false; scene.add(g);
  return { g, m, e, set(c) { m.material.color.set(c); e.material.color.set(c); } };
}
const selMark = marker(0xe8cf8e, 0.08), ghost = marker(0x4ee1a0, 0.35);
function fitMarker(mk, p) {
  const k = KIND[p.kind];
  if (k.place === 'wall') {
    const top = BACK - p.y, bottom = Math.max(6, BACK - p.y - p.h + 6);
    mk.g.position.set((p.x + p.w / 2) * S, bottom * S, (BACK + 4) * S); mk.g.scale.set(p.w * S, (top - bottom) * S, 8 * S);
  } else {
    const r = floorRect(p);
    mk.g.position.set((r.x + r.w / 2) * S, 0, (r.y + r.h / 2) * S); mk.g.scale.set(r.w * S, Math.max(3, k.tall) * S, r.h * S);
  }
  mk.g.visible = true;
}
function drawOverlay() {
  const T = tierOf();
  overlay.visible = state.view === 'in' && state.edit;
  if (!overlay.visible) return;
  if (ovC.width !== T.w * OV_K || ovC.height !== T.h * OV_K) { ovC.width = T.w * OV_K; ovC.height = T.h * OV_K; ovTex.dispose(); }
  overlay.scale.set(T.w * S, T.h * S, 1); overlay.position.set(T.w / 2 * S, 0.075, T.h / 2 * S);
  const g = ovG; g.setTransform(OV_K, 0, 0, OV_K, 0, 0); g.clearRect(0, 0, T.w, T.h);
  g.strokeStyle = 'rgba(232,207,142,.18)'; g.lineWidth = 0.5;
  for (let x = WALL; x <= T.w - WALL; x += 20) { g.beginPath(); g.moveTo(x, BACK); g.lineTo(x, T.h - WALL); g.stroke(); }
  for (let y = BACK; y <= T.h - WALL; y += 20) { g.beginPath(); g.moveTo(WALL, y); g.lineTo(T.w - WALL, y); g.stroke(); }
  // the door lane stays free
  g.fillStyle = 'rgba(255,90,90,.16)'; g.fillRect(T.w / 2 - DOOR / 2 - 8, T.h - WALL - 48, DOOR + 16, 48);
  for (const p of pieces()) {
    if (KIND[p.kind].place === 'wall' || p === state.drag?.p) continue;
    const r = floorRect(p);
    g.strokeStyle = p === state.sel ? 'rgba(255,241,214,.95)' : 'rgba(201,162,74,.6)'; g.lineWidth = p === state.sel ? 2 : 1;
    g.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
  }
  ovTex.needsUpdate = true;
}

// ─── camera ────────────────────────────────────────────────────────────────
let zoom = 1, aim = { x: 0, y: 0 };
function frameCamera() {
  const T = tierOf();
  if (state.view === 'in') { aim = { x: T.w / 2, y: (BACK + T.h) / 2 + 10 }; zoom = Math.max(0.78, T.w / 470); }
  else { const m = T.outside[0]; aim = { x: m.x + m.w / 2 + (T.outside[1] ? 60 : 0), y: m.y + m.h / 2 + 40 }; zoom = 1.05 + state.tier * 0.12; }
  if (camera.aspect < 1) zoom *= 1.35;
}
function lookCamera() {
  const tx = aim.x * S, tz = aim.y * S;
  camera.position.set(tx, 11.5 * zoom, tz + 10.5 * zoom);
  camera.lookAt(tx, 0.6, tz - 0.8);
}
stageEl.addEventListener('wheel', (e) => { e.preventDefault(); zoom = Math.min(2.4, Math.max(0.6, zoom + Math.sign(e.deltaY) * 0.08)); }, { passive: false });

// ─── pointer: pick, drag, place ────────────────────────────────────────────
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitV = new THREE.Vector3();
// where the pointer is: on the floor { x, y } and/or on the back wall { x, up }
function pointAt(e) {
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const res = {};
  if (ray.ray.intersectPlane(groundPlane, hitV)) res.floor = { x: hitV.x / S, y: hitV.z / S };
  const wallPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -(BACK + 2) * S);
  if (ray.ray.intersectPlane(wallPlane, hitV)) res.wall = { x: hitV.x / S, up: hitV.y / S };
  res.onWall = !!res.wall && res.wall.up > 0 && res.wall.up < ROOM_H && (!res.floor || res.floor.y < BACK);
  return res;
}
function pick(pt) {
  const list = pieces();
  if (pt.onWall) {
    const hit = list.find((p) => KIND[p.kind].place === 'wall' && pt.wall.x >= p.x && pt.wall.x <= p.x + p.w && pt.wall.up <= BACK - p.y + 4 && pt.wall.up >= BACK - p.y - p.h - 4);
    if (hit) return hit;
    const fp = list.find((p) => KIND[p.kind].place === 'back' && pt.wall.x >= p.x && pt.wall.x <= p.x + p.w);
    if (fp) return fp;
  }
  if (!pt.floor) return null;
  const under = list.filter((p) => KIND[p.kind].place !== 'wall' && pt.floor.x >= floorRect(p).x - 4 && pt.floor.x <= floorRect(p).x + floorRect(p).w + 4 && pt.floor.y >= floorRect(p).y - 4 && pt.floor.y <= floorRect(p).y + floorRect(p).h + 4);
  under.sort((a, b) => (KIND[a.kind].rug - KIND[b.kind].rug) || a.w * a.h - b.w * b.h);
  return under[0] || null;
}
const snap = (v) => Math.round(v / GRID) * GRID;
// the spot a piece goes to for the pointer (dx, dy: where it was grabbed)
function spotFor(p, pt, dx = p.w / 2, dy = p.h / 2) {
  const k = KIND[p.kind];
  if (k.place === 'floor') return pt.floor ? { x: snap(pt.floor.x - dx), y: snap(pt.floor.y - dy) } : null;
  const x = pt.onWall ? pt.wall.x : pt.floor?.x;
  return x == null ? null : { x: snap(x - dx), y: p.y };
}
function showGhost(p) {
  const why = blocked(p, pieces(), tierOf());
  ghost.set(why ? 0xff6a6a : 0x4ee1a0); fitMarker(ghost, p);
  hint(why ? `Tidak bisa di sini: ${why}` : 'Lepas / ketuk untuk memasang');
  return !why;
}

const cv = renderer.domElement;
cv.addEventListener('pointerdown', (e) => {
  if (state.view !== 'in' || !state.edit) return;
  const pt = pointAt(e);
  if (state.placing) { placeAt(pt); return; }
  const p = pick(pt);
  state.sel = p; overlayDirty = true; panel();
  if (!p) { selMark.g.visible = false; hint('Ketuk perabot untuk memilih, seret untuk memindah'); return; }
  const k = KIND[p.kind], at = k.place === 'floor' ? pt.floor : { x: pt.onWall ? pt.wall.x : pt.floor?.x ?? p.x, y: p.y };
  state.drag = { p, dx: at.x - p.x, dy: k.place === 'floor' ? at.y - p.y : 0, from: { x: p.x, y: p.y }, moved: false };
  cv.setPointerCapture(e.pointerId);
});
cv.addEventListener('pointermove', (e) => {
  if (state.view !== 'in' || !state.edit) return;
  const pt = pointAt(e);
  if (state.placing) {
    const s = spotFor(state.placing, pt);
    if (s) { Object.assign(state.placing, s); showGhost(state.placing); }
    return;
  }
  const d = state.drag; if (!d) return;
  const s = spotFor(d.p, pt, d.dx, d.dy); if (!s) return;
  if (!d.moved && (s.x !== d.from.x || s.y !== d.from.y)) { d.moved = true; selMark.g.visible = false; rebuild(d.p); }
  if (d.moved) { Object.assign(d.p, s); showGhost(d.p); }
});
const endDrag = () => {
  const d = state.drag; if (!d) return;
  state.drag = null; ghost.g.visible = false;
  if (d.moved) {
    if (blocked(d.p, pieces(), tierOf())) { Object.assign(d.p, d.from); hint('Kembali ke tempat semula'); } else hint('');
    rebuild();
  }
  fitMarker(selMark, d.p); panel();
};
cv.addEventListener('pointerup', endDrag); cv.addEventListener('pointercancel', endDrag);

function placeAt(pt) {
  const p = state.placing, s = spotFor(p, pt);
  if (!s) return;
  Object.assign(p, s);
  if (!showGhost(p)) return; // red: stays in hand, try another spot
  pieces().push(p); state.placing = null; ghost.g.visible = false; state.sel = p;
  rebuild(); fitMarker(selMark, p); hint(''); panel();
}

// ─── panels ────────────────────────────────────────────────────────────────
const hintEl = $('hint');
const hint = (s) => { hintEl.textContent = s; };
function buttons(id, list, get, set) {
  const box = $(id); box.innerHTML = '';
  for (const [v, label] of list) {
    const b = document.createElement('button'); b.className = 'btn' + (get() === v ? ' on' : ''); b.textContent = label;
    b.onclick = () => set(v); box.append(b);
  }
}
function controls() {
  buttons('tier', TIERS.map((T, i) => [i, `${i + 1} · ${T.name}`]), () => state.tier, setTier);
  buttons('view', [['in', 'Dalam'], ['out', 'Luar (di kota)']], () => state.view, (v) => { state.view = v; if (v === 'out') setEdit(false); refresh(); });
  buttons('time', [[0.15, 'Siang'], [1, 'Malam']], () => state.night, (v) => { state.night = v; controls(); });
  $('edit').classList.toggle('on', state.edit); $('edit').disabled = state.view !== 'in';
}
function setEdit(on) {
  state.edit = on; state.sel = null; state.placing = null; selMark.g.visible = ghost.g.visible = false;
  hint(on ? 'Ketuk perabot untuk memilih, seret untuk memindah' : '');
  overlayDirty = true; controls(); panel();
}
$('edit').onclick = () => setEdit(!state.edit);
function setTier(i, pop = false) {
  state.tier = i; state.sel = null; state.placing = null; selMark.g.visible = ghost.g.visible = false;
  refresh();
  if (pop) { popT = 0; const f = $('flash'); f.classList.add('go'); requestAnimationFrame(() => requestAnimationFrame(() => f.classList.remove('go'))); }
}
function refresh() { frameCamera(); rebuild(); controls(); panel(); }

function panel() {
  const T = tierOf(), list = pieces(), next = TIERS[state.tier + 1];
  $('tierCard').innerHTML = `<h2>Tingkat ${state.tier + 1} · ${T.name}</h2>
    <p>Perabot terpasang: <b class="cost">${list.length}/${T.cap}</b></p>
    <ul>${T.adds.map((a) => `<li>${a}</li>`).join('')}</ul>
    ${next ? `<p style="margin-top:10px">Naik ke <b>${next.name}</b>: <span class="cost">${next.cost}</span></p><button class="btn big" id="up">Naikkan Tingkat ▲</button>` : '<p style="margin-top:10px">Tingkat tertinggi.</p>'}`;
  if (next) $('up').onclick = () => { state.view = 'out'; setEdit(false); setTier(state.tier + 1, true); };

  const c = comfort(list), lv = levelOf(c), max = 20;
  const fns = [...new Set(list.map((p) => p.kind))].filter((k) => KIND[k].fn).map((k) => {
    const n = list.filter((p) => p.kind === k).length;
    return `<li>${KIND[k].name}${n > 1 ? ` ×${n}` : ''}: ${KIND[k].fn}</li>`;
  });
  $('comfort').innerHTML = `<h2>Kenyamanan</h2>
    <div class="lvl">${lv} · ${c}</div><div class="meter"><i style="width:${Math.min(100, (c / max) * 100)}%"></i></div>
    <p>Tidur di rumah memberi buff <b>Segar</b> selama <b class="cost">${10 + c * 2} menit</b> (HP pulih pelan di luar pertempuran${c >= 11 ? ', Energi +10%' : ''}${c >= 16 ? ', Gerak +5%' : ''}).</p>
    <ul>${fns.join('')}</ul>`;

  const sel = state.sel, sc = $('selCard');
  sc.hidden = !sel || !state.edit;
  if (sel && state.edit) {
    const k = KIND[sel.kind], canTurn = k.place === 'floor' && sel.w !== sel.h && !k.center;
    sc.innerHTML = `<div class="sel"><span class="name">${k.name}</span>
      <button class="btn" id="turn" ${canTurn ? '' : 'disabled'}>Putar ⟳</button>
      <button class="btn" id="stow" ${k.fixed ? 'disabled' : ''}>Simpan ke Tas</button></div>
      <p>${k.fn || 'Hiasan'} · Kenyamanan +${k.comfort}${k.fixed ? ' · bawaan rumah, bisa dipindah' : ''}</p>`;
    $('turn').onclick = () => {
      const old = { w: sel.w, h: sel.h }; [sel.w, sel.h] = [sel.h, sel.w];
      if (blocked(sel, list, T)) { Object.assign(sel, old); hint('Tidak cukup tempat untuk memutar'); return; }
      rebuild(); fitMarker(selMark, sel); panel();
    };
    $('stow').onclick = () => { list.splice(list.indexOf(sel), 1); state.sel = null; selMark.g.visible = false; rebuild(); panel(); };
  }

  const bag = $('bag'); bag.innerHTML = '';
  for (const [kind, k] of Object.entries(KIND)) {
    if (k.fixed) continue;
    const left = k.own - list.filter((p) => p.kind === kind).length, locked = (k.tier || 0) > state.tier;
    const b = document.createElement('button');
    b.className = 'item' + (state.placing?.kind === kind ? ' on' : '');
    b.disabled = locked || left <= 0 || list.length >= T.cap || state.view !== 'in';
    b.innerHTML = `${k.name} <span class="cost">×${Math.max(0, left)}</span><small>${locked ? `Butuh tingkat ${k.tier + 1}` : k.fn || `Kenyamanan +${k.comfort}`}</small>`;
    b.onclick = () => {
      if (!state.edit) setEdit(true);
      state.sel = null; selMark.g.visible = false;
      state.placing = state.placing?.kind === kind ? null : { ...P(kind, T.w / 2 - k.w / 2, k.place === 'floor' ? (BACK + T.h) / 2 : k.y), id: uid++ };
      if (state.placing) showGhost(state.placing); else { ghost.g.visible = false; hint(''); }
      if (state.placing) hint(`Pasang ${k.name}: ketuk ${k.place === 'wall' ? 'dinding belakang' : 'lantai'}`);
      panel();
    };
    bag.append(b);
  }
}

// ─── loop ──────────────────────────────────────────────────────────────────
let popT = 9, last = performance.now(), clock = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; clock += dt;
  const T = tierOf(), inside = state.view === 'in', n = inside ? 0 : state.night;
  // light & sky
  if (inside) {
    hemi.color.set(0x8a7aa8); hemi.groundColor.set(0x1a1018); hemi.intensity = 1.1 * LOOK.ambient;
    sun.color.set(0xffe0c0); sun.intensity = 0.35 * LOOK.key; sun.castShadow = false;
    scene.background = new THREE.Color(0x07050f); scene.fog = null;
    mats.roomWin.color.set(state.night > 0.5 ? 0x1c2a5a : 0xbfe4ff);
  } else {
    hemi.color.set(0xcfd8ff).lerp(new THREE.Color(0x4a3c78), n); hemi.groundColor.set(0x5a4a3a).lerp(new THREE.Color(0x120a14), n);
    hemi.intensity = (1.5 + 0.2 * n) * LOOK.ambient;
    sun.color.set(0xfff0d8).lerp(new THREE.Color(0x9a8cff), n); sun.intensity = (2.4 - 1.3 * n) * LOOK.key; sun.castShadow = true;
    scene.background = new THREE.Color(0x56607a).lerp(new THREE.Color(0x0a0812), n);
  }
  sun.position.set(aim.x * S - 15, 30, aim.y * S - 10); sun.target.position.set(aim.x * S, 0, aim.y * S); sun.target.updateMatrixWorld();
  mats.nightMats.set(n);
  // the point lights of the place
  const ls = place ? place.lights.filter((l) => l.night === true ? n > 0.5 : l.night === 'day' ? state.night < 0.5 : true) : [];
  pool.forEach((L, i) => {
    const l = ls[i]; L.visible = !!l; if (!l) return;
    L.color.copy(l.color); L.distance = l.dist; L.position.set(l.x * S, l.h * S, l.y * S);
    L.intensity = l.int * (0.9 + 0.1 * Math.sin(clock * 7 + l.ph * 3));
  });
  for (const f of place?.flames || []) f.scale.y = 1 + 0.12 * Math.sin(clock * 11 + (f.userData.flicker || 0));
  // B: the house rises when the tier goes up
  popT += dt;
  if (place && !inside) { const k = Math.min(1, popT / 0.7), e = 1 - Math.pow(1 - k, 3); place.root.scale.y = 0.55 + 0.45 * e + Math.sin(k * Math.PI) * 0.06; }
  else if (place) place.root.scale.y = 1;
  // the hero
  const hx = inside ? T.w / 2 : T.outside[0].x + T.outside[0].w / 2 + 40, hy = inside ? T.h - WALL - 40 : T.outside[0].y + T.outside[0].h + 60;
  hero.position.set(hx * S, 0, hy * S); hero.visible = !(inside && state.edit);
  drawHero(clock);
  if (overlayDirty) { drawOverlay(); overlayDirty = false; }
  lookCamera();
  composer.render();
  requestAnimationFrame(frame);
}

resize(); refresh(); requestAnimationFrame(frame);
