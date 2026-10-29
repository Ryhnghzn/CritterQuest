// 2.5D test ("HD-2D"): the real Kota Awal layout (data/town.js) built in 3D from code —
// cobbles, walls with merlons, timber houses with glowing windows and hanging signs, the
// gate towers, bonfire, lamps, barrels — lit by real lights with bloom, and the game's own
// 2D style-D characters (drawDoll) standing in it as upright billboards that catch the light.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/OutputPass.js';
import { drawDoll } from '../src/art/doll.js';
import { drawIcon } from '../src/art/sprites.js';
import { TOWN } from '../src/data/town.js';

const $ = (id) => document.getElementById(id);
const Q = new URLSearchParams(location.search);
const TOUCH = matchMedia('(pointer:coarse)').matches || Q.has('touch');
if (TOUCH) document.body.classList.add('touch');
const S = 1 / 22;                       // game units → metres
const W2 = (x, y) => [x * S - (TOWN.w * S) / 2, y * S - (TOWN.h * S) / 2]; // town (x, y) → 3D (x, z)
const rand = (a, b) => a + Math.random() * (b - a);
let seed = 7; const srand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// ——— renderer ———
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$('stage').append(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.8, 0.5, 0.8);
composer.addPass(bloom); composer.addPass(new OutputPass());
function resize() { renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight); composer.setPixelRatio(renderer.getPixelRatio()); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

// ——— toon materials ———
const steps = new Uint8Array([70, 70, 70, 255, 150, 150, 150, 255, 255, 255, 255, 255]);
const gradientMap = new THREE.DataTexture(steps, 3, 1, THREE.RGBAFormat);
gradientMap.minFilter = gradientMap.magFilter = THREE.NearestFilter; gradientMap.needsUpdate = true;
const MAT = {};
const toon = (c, rim = 0) => MAT[c + ':' + rim] || (MAT[c + ':' + rim] = (() => {
  const m = new THREE.MeshToonMaterial({ color: c, gradientMap });
  if (rim) m.onBeforeCompile = (sh) => {
    sh.uniforms.rimColor = { value: new THREE.Color(rim) };
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 rimColor;')
      .replace('#include <opaque_fragment>', 'float rimF = 1.0 - max(dot(normal, normalize(vViewPosition)), 0.0);\noutgoingLight += rimColor * smoothstep(0.6, 0.95, rimF) * 0.5;\n#include <opaque_fragment>');
  };
  return m;
})());
const glowM = (c, k = 1.6) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k) });
function box(w, h, d, mat, x, y, z, parent = scene, cast = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; parent.add(m); return m;
}
// walls and towers between the camera and the hero turn see-through (cutaway)
const fades = [];
function fadeable(m) {
  m.material = m.material.clone(); m.material.transparent = true;
  fades.push(m); return m;
}

// ——— lights (night by default) ———
const hemi = new THREE.HemisphereLight(0x4a3c78, 0x120a14, 0.8); scene.add(hemi);
const sun = new THREE.DirectionalLight(0x9a8cff, 0.8);
sun.position.set(-15, 30, -10); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 22, bottom: -22, near: 1, far: 80 }); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.06;
scene.add(sun);
const flickers = [];
function pointLight(x, y, z, color, intensity, dist) {
  const L = new THREE.PointLight(color, intensity, dist, 1.6); L.position.set(x, y, z); scene.add(L);
  flickers.push({ L, base: intensity, ph: rand(0, 9) }); return L;
}

// ——— ground: cobbles inside the walls, dirt outside ———
const TW = TOWN.w * S, TH = TOWN.h * S, WALL = TOWN.wall * S;
box(TW + 30, 0.2, TH + 30, toon(0x2e2626), 0, -0.2, 0, scene, false);
{
  const size = 1.1, nx = Math.ceil(TW / size), nz = Math.ceil(TH / size);
  const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(size * 0.94, 0.14, size * 0.94), toon(0xffffff), nx * nz);
  const d = new THREE.Object3D(), c = new THREE.Color();
  let n = 0;
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    d.position.set(-TW / 2 + size / 2 + i * size + (j % 2) * 0.3, -0.07 + srand() * 0.04, -TH / 2 + size / 2 + j * size);
    d.rotation.y = (srand() - 0.5) * 0.12; d.updateMatrix();
    inst.setMatrixAt(n, d.matrix);
    inst.setColorAt(n, c.setHSL(0.07 + (srand() - 0.5) * 0.08, 0.12, 0.3 + srand() * 0.08)); n++;
  }
  inst.receiveShadow = true; scene.add(inst);
}

// ——— town walls with merlons ———
const stone = toon(0x4a4256, 0x3a2a5a), stoneDark = toon(0x352e40);
for (const [x, z, w, d] of [[0, -TH / 2 + WALL / 2, TW, WALL], [-TW / 2 + WALL / 2, 0, WALL, TH], [TW / 2 - WALL / 2, 0, WALL, TH]]) {
  fadeable(box(w, 3.2, d, stone, x, 1.6, z));
  const along = w > d, len = along ? w : d;
  for (let k = 0; k < len / 1.4; k++) {
    const o = -len / 2 + 0.7 + k * 1.4;
    fadeable(box(along ? 0.7 : w, 0.6, along ? d : 0.7, stoneDark, along ? x + o : x, 3.5, along ? z : z + o));
  }
}

// ——— buildings from the town data ———
const ROOF = { inn: 0x7a2e55, potion: 0x3b3480, smith: 0x4a3a33, guild: 0x2f5a43 };
const PLASTER = { inn: 0xb89a7a, potion: 0x9a90b0, smith: 0x8a7a6a, guild: 0xa0a88a };
const SIGN = { inn: 'inn', potion: 'potion', smith: 'pow', guild: 'arm' };
function iconTexture(id) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#3a2618'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#c9a24a'; g.lineWidth = 8; g.strokeRect(4, 4, 120, 120);
  g.translate(64, 64); drawIcon(g, id, 92);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const smokes = [];
let fire = null;
for (const b of TOWN.buildings) {
  const [x0, z0] = W2(b.x, b.y), w = b.w * S, d = b.h * S, cx = x0 + w / 2, cz = z0 + d / 2;
  if (b.kind === 'house') {
    const H = 4.2, wall = toon(PLASTER[b.theme] || 0xa09080, 0x5a3a2a), beam = toon(0x3a2418);
    box(w, H, d, wall, cx, H / 2, cz);
    box(w + 0.1, 0.5, d + 0.1, toon(0x3e3640), cx, 0.25, cz); // stone footing
    const front = cz + d / 2 + 0.03;
    for (const fx of [-w / 2 + 0.15, -w / 6, w / 6, w / 2 - 0.15]) box(0.25, H, 0.12, beam, cx + fx, H / 2, front, scene, false);
    box(w, 0.25, 0.12, beam, cx, H * 0.55, front, scene, false);
    box(w, 0.25, 0.12, beam, cx, H - 0.12, front, scene, false);
    // roof: a gable prism along x, with an overhang
    const ov = 0.5, rh = 2.6, shape = new THREE.Shape([new THREE.Vector2(-d / 2 - ov, 0), new THREE.Vector2(d / 2 + ov, 0), new THREE.Vector2(0, rh)]);
    const roofGeo = new THREE.ExtrudeGeometry(shape, { depth: w + ov * 2, bevelEnabled: false });
    const roof = new THREE.Mesh(roofGeo, toon(ROOF[b.theme] || b.roof, 0x6a3a5a));
    roof.rotation.y = Math.PI / 2; roof.position.set(cx - w / 2 - ov, H, cz); roof.castShadow = true; scene.add(roof);
    // door, windows (glowing at night), sign, chimney with smoke
    box(1.3, 2.2, 0.15, toon(0x2a1a12), cx, 1.1, front + 0.05, scene, false);
    box(1.6, 0.2, 0.25, beam, cx, 2.3, front + 0.1, scene, false);
    for (const wx of [-w / 3.2, w / 3.2]) {
      box(1.1, 1.1, 0.12, beam, cx + wx, 2.4, front + 0.04, scene, false);
      const win = box(0.85, 0.85, 0.1, glowM(0xffb860, 1.5), cx + wx, 2.4, front + 0.08, scene, false);
      win.userData.window = true;
    }
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshLambertMaterial({ map: iconTexture(SIGN[b.theme] || 'talk'), side: THREE.DoubleSide }));
    sign.position.set(cx + w / 2 - 0.9, 3.2, front + 0.9); scene.add(sign);
    box(0.08, 0.08, 0.9, beam, cx + w / 2 - 0.9, 3.75, front + 0.45, scene, false);
    box(0.8, 1.6, 0.8, stoneDark, cx - w / 3, H + 1.8, cz - d / 6);
    smokes.push({ x: cx - w / 3, y: H + 2.7, z: cz - d / 6 });
    if (b.theme === 'smith') { // forge glow by the door
      box(0.9, 0.7, 0.6, toon(0x2a2a30), cx - w / 2 + 1.4, 0.35, front + 1.2);
      pointLight(cx - w / 2 + 1.4, 1.2, front + 1.3, 0xff6a2a, 6, 6);
      box(0.6, 0.2, 0.4, glowM(0xff5a1a, 2.4), cx - w / 2 + 1.4, 0.75, front + 1.2, scene, false);
    }
  } else if (b.kind === 'fence') {
    for (let k = 0; k < 4; k++) box(0.18, 1.1, 0.18, toon(0x5a3e28), cx, 0.55, z0 + (k / 3) * d);
    box(0.08, 0.15, d, toon(0x5a3e28), cx, 0.85, cz); box(0.08, 0.15, d, toon(0x5a3e28), cx, 0.45, cz);
  } else if (b.kind === 'fire') {
    for (let k = 0; k < 6; k++) { const l = box(1.4, 0.22, 0.22, toon(0x4a3020), cx, 0.15, cz); l.rotation.y = (k / 6) * Math.PI; }
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; box(0.45, 0.35, 0.45, stone, cx + Math.cos(a) * 1, 0.17, cz + Math.sin(a) * 1); }
    const flame = new THREE.Group(); flame.position.set(cx, 0.3, cz); scene.add(flame);
    for (const [r, h, c] of [[0.55, 1.6, 0xff6a2a], [0.35, 1.2, 0xffb347], [0.18, 0.8, 0xfff0b0]]) flame.add(new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), glowM(c, 2)));
    flame.children.forEach((m, i) => (m.position.y = [0.8, 0.6, 0.4][i]));
    fire = { flame, x: cx, z: cz, L: pointLight(cx, 1.6, cz, 0xff7a2a, 30, 16) };
  } else if (b.kind === 'gate') { // two towers and an arch with a dark portcullis
    for (const s of [-1, 1]) {
      fadeable(box(2.2, 6, 2.2, stone, cx + s * (w / 2 - 1.1), 3, cz - d / 4));
      for (let k = 0; k < 4; k++) fadeable(box(0.6, 0.6, 0.6, stoneDark, cx + s * (w / 2 - 1.1) + (k % 2 ? 0.7 : -0.7), 6.3, cz - d / 4 + (k < 2 ? 0.7 : -0.7)));
      box(0.15, 0.6, 0.15, toon(0x3a2a22), cx + s * (w / 2 - 2.6), 2.4, cz - d / 4 - 1.2);
      box(0.25, 0.35, 0.25, glowM(0xffb347, 2.2), cx + s * (w / 2 - 2.6), 2.85, cz - d / 4 - 1.2, scene, false);
      pointLight(cx + s * (w / 2 - 2.6), 3, cz - d / 4 - 1.5, 0xff8a3a, 8, 8);
    }
    fadeable(box(w - 4.4, 1.6, 2.2, stone, cx, 4.6, cz - d / 4));
    for (let k = 0; k < 7; k++) fadeable(box(0.12, 3.6, 0.12, toon(0x1a161e), cx - (w - 4.4) / 2 + 0.4 + k * ((w - 5.2) / 6), 1.9, cz - d / 4));
    const zS = TH / 2 - WALL / 2; // the south wall, left and right of the gate
    fadeable(box(x0 + TW / 2, 3.2, WALL, stone, (-TW / 2 + x0) / 2, 1.6, zS));
    fadeable(box(TW / 2 - (x0 + w), 3.2, WALL, stone, (x0 + w + TW / 2) / 2, 1.6, zS));
  } else if (b.kind === 'stall') { // striped awning
    box(w, 1, d * 0.4, toon(0x5a3e28), cx, 0.5, cz + d * 0.2);
    for (let k = 0; k < 6; k++) { const s = box(w / 6, 0.12, d * 0.9, toon(k % 2 ? 0xe0527a : 0xf0e0d0), x0 + w / 12 + (k * w) / 6, 2.3, cz); s.rotation.x = 0.25; }
    for (const s of [-1, 1]) box(0.12, 2.3, 0.12, toon(0x3a2a22), cx + s * (w / 2 - 0.1), 1.15, cz - d * 0.35);
  }
}
// lamps and decor
for (const l of TOWN.lamps) {
  const [x, z] = W2(l.x, l.y);
  box(0.16, 3, 0.16, toon(0x2a2228), x, 1.5, z);
  box(0.4, 0.5, 0.4, glowM(0xffd27a, 2), x, 3.1, z, scene, false);
  pointLight(x, 3, z, 0xffb060, 10, 10);
}
for (const dc of TOWN.decor) {
  const [x, z] = W2(dc.x, dc.y);
  if (dc.kind === 'barrel') { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.9, 8), toon(0x6a4a2c)); m.position.set(x, 0.45, z); m.castShadow = true; scene.add(m); box(0.84, 0.06, 0.84, toon(0x2a2228), x, 0.7, z, scene, false); }
  else if (dc.kind === 'crate') { const m = box(0.8, 0.8, 0.8, toon(0x7a5a34), x, 0.4, z); m.rotation.y = 0.3; }
  else { box(1.8, 0.12, 0.5, toon(0x6a4a2c), x, 0.55, z); for (const s of [-1, 1]) box(0.12, 0.5, 0.4, toon(0x4a3020), x + s * 0.7, 0.25, z); }
}

// ——— particles: embers from the fire, smoke from chimneys ———
const PN = 160, ppos = new Float32Array(PN * 3), pcol = new Float32Array(PN * 3), parts = [];
const pgeo = new THREE.BufferGeometry();
pgeo.setAttribute('position', new THREE.BufferAttribute(ppos, 3)); pgeo.setAttribute('color', new THREE.BufferAttribute(pcol, 3));
const pts = new THREE.Points(pgeo, new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
pts.frustumCulled = false; scene.add(pts);
for (let i = 0; i < PN; i++) parts.push({ life: 0 });

// ——— 2D characters as billboards: the game's own drawDoll into a canvas texture ———
const CW = 256, CH = 256, PXU = 5; // canvas pixels per doll unit
const planeH = (CH / PXU) * 0.82 * S;
class Billboard {
  constructor(classId, look, scale = 1) {
    this.classId = classId; this.look = look; this.scale = scale;
    this.c = document.createElement('canvas'); this.c.width = CW; this.c.height = CH;
    this.g = this.c.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.c); this.tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshLambertMaterial({ map: this.tex, alphaTest: 0.5, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: this.tex, emissiveIntensity: 0.38 });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(planeH, planeH), mat);
    this.mesh.castShadow = true;
    this.mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: this.tex, alphaTest: 0.5 });
    this.obj = new THREE.Group(); this.obj.add(this.mesh); this.obj.scale.setScalar(scale);
    this.mesh.position.y = planeH / 2 - (6 / CH) * planeH;
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.02; this.obj.add(shadow);
    scene.add(this.obj);
    this.side = 1;
  }
  draw(pose) {
    const g = this.g;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, CW, CH);
    g.translate(CW / 2, CH - 6); g.scale(PXU * this.side, PXU);
    drawDoll(g, this.classId, this.look, pose);
    this.tex.needsUpdate = true;
  }
  face(yaw) { this.mesh.rotation.y = yaw; }
}

const GEAR_MYTH = { weapon: { tier: 6, rarity: 5 }, helm: { tier: 6, rarity: 5 }, armor: { tier: 6, rarity: 5 }, boots: { tier: 6, rarity: 5 } };
const state = { classId: Q.get('class') || 'warrior', mythic: true, night: !Q.has('day'), camMode: 'tilt' };
const playerLook = () => ({ hair: 1, hairColor: 2, gear: state.mythic ? GEAR_MYTH : {} });
let player = new Billboard(state.classId, playerLook());
const [sx, sz] = W2(TOWN.spawn.x, TOWN.spawn.y);
const P = { x: sx, z: sz, walk: 0, moving: 0, dirX: 1, atkT: -9 };
const npcs = TOWN.npcs.filter((n) => n.outfit).map((n) => {
  const b = new Billboard(null, { ...n.look, outfit: n.outfit, npc: n }, n.scale || 1);
  const [x, z] = W2(n.x, n.y); b.obj.position.set(x, 0, z);
  return { b, n, t0: rand(0, 9) };
});

// ——— camera ———
const cam = { yaw: 0, goal: 0 };
function placeCamera() {
  const tilt = state.camMode === 'tilt';
  const far = Q.has('far') ? 2.4 : 1, dist = (tilt ? 13 : 6.5) * far, h = (tilt ? 11 : 3.4) * far;
  camera.position.set(P.x + Math.sin(cam.yaw) * dist, h, P.z + Math.cos(cam.yaw) * dist);
  camera.lookAt(P.x - Math.sin(cam.yaw) * (tilt ? 1 : 3), tilt ? 0.6 : 1.4, P.z - Math.cos(cam.yaw) * (tilt ? 1 : 3));
}

// ——— input ———
const keys = new Set(); let mouseDown = false;
addEventListener('keydown', (e) => keys.add(e.code)); addEventListener('keyup', (e) => keys.delete(e.code));
renderer.domElement.addEventListener('mousedown', () => (mouseDown = true)); addEventListener('mouseup', () => (mouseDown = false));
const joy = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
renderer.domElement.addEventListener('touchstart', (e) => { e.preventDefault(); for (const t of e.changedTouches) if (joy.id == null) Object.assign(joy, { id: t.identifier, ox: t.clientX, oy: t.clientY, x: t.clientX, y: t.clientY }); }, { passive: false });
renderer.domElement.addEventListener('touchmove', (e) => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === joy.id) { joy.x = t.clientX; joy.y = t.clientY; } }, { passive: false });
renderer.domElement.addEventListener('touchend', (e) => { for (const t of e.changedTouches) if (t.identifier === joy.id) joy.id = null; });
$('atk').addEventListener('touchstart', (e) => { e.preventDefault(); P.atkT = clock.elapsedTime; }, { passive: false });

// ——— UI ———
function buttons(list) {
  for (const [label, get, set] of list) {
    const b = document.createElement('button'); b.className = 'tb';
    const sync = () => { b.textContent = label(); b.classList.toggle('on', !!get()); };
    b.onclick = () => { set(); sync(); }; sync(); $('bar').append(b);
  }
}
const CLASSES = ['warrior', 'archer', 'mage', 'assassin'], CL_NAME = { warrior: 'WARRIOR', archer: 'ARCHER', mage: 'MAGE', assassin: 'ASSASSIN' };
buttons([
  [() => CL_NAME[state.classId], () => true, () => { state.classId = CLASSES[(CLASSES.indexOf(state.classId) + 1) % 4]; player.classId = state.classId; }],
  [() => (state.mythic ? 'GEAR MITOS' : 'TANPA GEAR'), () => state.mythic, () => { state.mythic = !state.mythic; player.look = playerLook(); }],
  [() => (state.night ? 'MALAM' : 'SIANG'), () => state.night, () => { state.night = !state.night; applyTime(); }],
  [() => (state.camMode === 'tilt' ? 'KAMERA: MIRING' : 'KAMERA: BELAKANG'), () => true, () => { state.camMode = state.camMode === 'tilt' ? 'behind' : 'tilt'; }],
]);
function applyTime() {
  const n = state.night;
  scene.background = new THREE.Color(n ? 0x0a0812 : 0x8ab0d8);
  scene.fog = new THREE.Fog(n ? 0x0a0812 : 0x9ab8d8, 30, 70);
  hemi.color.set(n ? 0x4a3c78 : 0xcfd8ff); hemi.groundColor.set(n ? 0x120a14 : 0x5a4a3a); hemi.intensity = n ? 1.7 : 1.6;
  sun.color.set(n ? 0x9a8cff : 0xfff0d8); sun.intensity = n ? 1.5 : 2.6;
  for (const f of flickers) f.L.visible = n || f.base > 20;
  scene.traverse((o) => { if (o.userData.window) o.material.color.set(n ? new THREE.Color(0xffb860).multiplyScalar(1.5) : new THREE.Color(0x3a4a5a)); });
  bloom.strength = n ? 0.8 : 0.25;
}
applyTime();
$('loading').remove();

// ——— loop ———
const clock = new THREE.Clock();
let fps = 60, acc = 0, frames = 0, frameN = 0;
function frame() {
  const dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime;
  frameN++;
  if (keys.has('KeyQ')) cam.goal += 1.6 * dt; if (keys.has('KeyE')) cam.goal -= 1.6 * dt;
  cam.yaw += (cam.goal - cam.yaw) * Math.min(1, dt * 8);
  let mx = 0, mz = 0;
  if (keys.has('KeyW')) mz -= 1; if (keys.has('KeyS')) mz += 1; if (keys.has('KeyA')) mx -= 1; if (keys.has('KeyD')) mx += 1;
  if (joy.id != null) { const jx = (joy.x - joy.ox) / 55, jy = (joy.y - joy.oy) / 55, m = Math.hypot(jx, jy); if (m > 0.18) { const k = Math.min(1, (m - 0.18) / 0.7) / m; mx += jx * k; mz += jy * k; } }
  const len = Math.hypot(mx, mz); if (len > 1) { mx /= len; mz /= len; }
  // screen-relative: right = (cos yaw, −sin yaw), down-screen = (sin yaw, cos yaw)
  const vx = Math.cos(cam.yaw) * mx + Math.sin(cam.yaw) * mz, vz = -Math.sin(cam.yaw) * mx + Math.cos(cam.yaw) * mz;
  P.moving = Math.min(1, Math.hypot(vx, vz));
  P.x = Math.max(-TW / 2 + WALL + 0.4, Math.min(TW / 2 - WALL - 0.4, P.x + vx * 5 * dt));
  P.z = Math.max(-TH / 2 + WALL + 0.4, Math.min(TH / 2 - 1.5, P.z + vz * 5 * dt));
  for (const b of TOWN.buildings) { // stay out of the houses and props
    if (b.kind === 'gate') continue;
    const [x0, z0] = W2(b.x, b.y), x1 = x0 + b.w * S, z1 = z0 + b.h * S;
    if (P.x > x0 - 0.3 && P.x < x1 + 0.3 && P.z > z0 - 0.3 && P.z < z1 + 0.3) {
      const dl = P.x - (x0 - 0.3), dr = x1 + 0.3 - P.x, du = P.z - (z0 - 0.3), dd = z1 + 0.3 - P.z, m = Math.min(dl, dr, du, dd);
      if (m === dl) P.x = x0 - 0.3; else if (m === dr) P.x = x1 + 0.3; else if (m === du) P.z = z0 - 0.3; else P.z = z1 + 0.3;
    }
  }
  P.walk += P.moving * dt * 13;
  if (Math.abs(mx) > 0.1) player.side = mx > 0 ? 1 : -1;
  if (mouseDown && t - P.atkT > 0.5) P.atkT = t;
  const ph = (t - P.atkT) / 0.45;
  player.obj.position.set(P.x, 0, P.z);
  player.draw({ t, moving: P.moving, walk: P.walk, attackPhase: ph >= 0 && ph < 1 ? ph : undefined });
  player.face(cam.yaw);
  for (const n of npcs) { // townsfolk look towards the player; redrawn every other frame
    n.b.side = P.x > n.b.obj.position.x ? 1 : -1;
    if (frameN % 2 === 0) n.b.draw({ t: t + n.t0 });
    n.b.face(cam.yaw);
  }
  placeCamera();
  { // cutaway: fade what stands between the camera and the hero
    const cx = camera.position.x, cz = camera.position.z, dx = P.x - cx, dz = P.z - cz, L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L;
    for (const m of fades) {
      const ox = m.position.x - cx, oz = m.position.z - cz, along = ox * ux + oz * uz, side = Math.abs(ox * uz - oz * ux);
      const hide = along > 0 && along < L - 1 && side < 5;
      m.material.opacity += ((hide ? 0.18 : 1) - m.material.opacity) * Math.min(1, dt * 8);
      m.material.depthWrite = m.material.opacity > 0.9;
    }
  }
  sun.target.position.set(P.x, 0, P.z); sun.position.set(P.x - 15, 30, P.z - 10); sun.target.updateMatrixWorld();
  for (const f of flickers) f.L.intensity = f.base * (1 + Math.sin(t * 11 + f.ph) * 0.08 + Math.sin(t * 23 + f.ph) * 0.05);
  if (fire) fire.flame.children.forEach((m, i) => m.scale.set(1, 1 + Math.sin(t * (9 + i * 3) + i) * 0.12, 1));
  // particles
  for (let i = 0; i < PN; i++) {
    const q = parts[i];
    if (q.life <= 0) {
      if (fire && Math.random() < 0.4) Object.assign(q, { x: fire.x + rand(-0.4, 0.4), y: 0.8, z: fire.z + rand(-0.4, 0.4), vx: rand(-0.3, 0.3), vy: rand(1.5, 3), vz: rand(-0.3, 0.3), life: rand(0.8, 1.8), c: [1.6, 0.6, 0.2] });
      else if (Math.random() < 0.3) { const s = smokes[(Math.random() * smokes.length) | 0]; Object.assign(q, { x: s.x, y: s.y, z: s.z, vx: rand(0.1, 0.4), vy: rand(0.5, 0.9), vz: rand(-0.1, 0.1), life: rand(2, 3.5), c: [0.25, 0.22, 0.3] }); }
      else { ppos.set([0, -50, 0], i * 3); continue; }
    }
    q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
    const k = Math.min(1, q.life);
    ppos.set([q.x, q.y, q.z], i * 3); pcol.set([q.c[0] * k, q.c[1] * k, q.c[2] * k], i * 3);
  }
  pgeo.attributes.position.needsUpdate = true; pgeo.attributes.color.needsUpdate = true;
  composer.render();
  acc += dt; frames++;
  if (acc > 0.5) { fps = Math.round(frames / acc); acc = 0; frames = 0; }
  $('info').innerHTML = `${fps} FPS · Kota Awal dari data asli · karakter 2D gaya D (drawDoll) di dunia 3D`;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
