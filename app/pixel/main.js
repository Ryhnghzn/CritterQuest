// Vertical slice prototype (no game code touched): one clearing with a house, a lantern
// keeper, a shadow wolf and the hero. Style B = pixel HD-2D (low-resolution render, integer
// upscale, orthographic tilted camera, texel-snapped sprites). Style A = the same world and
// lighting at full resolution with smooth shading and the game's current vector characters.
import * as THREE from 'three';
import { buildCharacter, FRAME } from './chars.js';
import * as P from './props.js';
import * as T from './tiles.js';
import * as FX from './fx.js';
import { PixelSprite, ellipse } from './sprite.js';
import { ALL, RAMPS } from './palette.js';
import { text, wrap, textWidth, LINE } from './font.js';
import { drawDoll } from '../src/art/doll.js';
import { MONSTER_ART } from '../src/art/monsters.js';

const PPM = 24, PITCH = (50 * Math.PI) / 180, SIN = Math.sin(PITCH), COS = Math.cos(PITCH);
const DV_G = PPM * SIN, DV_W = PPM * COS, LK = Math.PI; // Lambert divides by π
const KA = 3; // style A texture detail
const params = new URLSearchParams(location.search);
const S = { mode: params.get('mode') === 'a' ? 'A' : 'B', night: true, lock: false, zoom: 0 };

// ---- renderer, cameras, scene --------------------------------------------------------------
const gl = document.getElementById('gl'), ui = document.getElementById('ui'), g = ui.getContext('2d');
const renderer = new THREE.WebGLRenderer({ canvas: gl, antialias: false, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
const scene = new THREE.Scene();
const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 120), persp = new THREE.PerspectiveCamera(30, 1, 0.5, 120);
// camera turn (yaw 0 = looking north from the south). RX = screen right on the ground, FW = screen up on the ground
let YAW = 0, yawGoal = 0;
const RX = new THREE.Vector3(1, 0, 0), FW = new THREE.Vector3(0, 0, -1);
function axes() { RX.set(Math.cos(YAW), 0, -Math.sin(YAW)); FW.set(-Math.sin(YAW), 0, -Math.cos(YAW)); }
let cam = ortho, view = { lowW: 0, lowH: 0, s: 1, dist: 40 };

// ---- layout --------------------------------------------------------------------------------
const HOUSE = { x: 0, z: -7, W: 8, D: 5, H: 3, RH: 2.2, o: 0.45 };
const FRONT = HOUSE.z + HOUSE.D / 2;
const DOOR_X = -1.5, WIN = [[1.8, 1.1, 2.1], [-3.0, 1.1, 2.1]];
const ROADS = [[[[0, 15], [0.3, 3], [-1.5, FRONT + 0.2]], 1.15], [[[0.3, 3], [6, 4], [15, 5.2]], 0.9]];
const TREES = [
  ['oak', 'l', -8.2, -6.5, 11], ['oak', 'm', -10.5, 2.5, 7], ['pine', 'l', 8.6, -8.4, 4], ['pine', 'm', 10.6, -3.2, 2],
  ['oak', 's', -6.2, 7.2, 3], ['dead', '', 8.4, 10.5, 9], ['oak', 'm', 5.6, -10.8, 5], ['pine', 'm', -5.2, -11.6, 6],
];
for (let x = -14; x <= 14; x += 2.6) TREES.push([(Math.round(x) % 2 ? 'pine' : 'oak'), Math.round(x) % 3 ? 'l' : 'm', x + Math.sin(x) * 0.6, -13.6 + Math.cos(x * 2) * 0.6, 20 + Math.round(x)]);
for (let z = -11; z <= 13; z += 3.1) { TREES.push(['pine', 'l', -14 + Math.sin(z) * 0.5, z, 40 + Math.round(z)]); TREES.push([z > 2 ? 'oak' : 'pine', 'l', 14 + Math.cos(z) * 0.5, z, 60 + Math.round(z)]); }
const ROCKS = [['m', 5, -2.6, 2], ['s', -4, 4.6, 1], ['l', 7.6, 8.4, 3], ['m', -9, 8.4, 5], ['s', 2.4, 6.4, 4], ['s', -2.2, -1.2, 6]];
const BUSHES = [[2.9, FRONT + 0.35, 1, 'flowerV'], [-4.2, FRONT + 0.35, 2, null], [-6.4, -1.4, 3, null], [6.4, 1.2, 4, 'flowerY'], [-1.2, 10.5, 5, null]];
const TORCHES = [[DOOR_X - 1.0, FRONT + 0.06, 1.95, 'wall'], [DOOR_X + 1.0, FRONT + 0.06, 1.95, 'wall'], [1.7, 3.6, 0, 'post']];
const CRATES = [[3.7, FRONT + 0.6, 0.8], [4.5, FRONT + 0.45, 0.55]];
const SHADE = TREES.filter((t) => Math.abs(t[2]) < 13 && t[3] > -13).map(([, , x, z]) => [x, z, 1.8]);

// ---- textures --------------------------------------------------------------------------
function dataTex(rgba, w, h, nearest) {
  const t = new THREE.DataTexture(rgba, w, h); t.colorSpace = THREE.SRGBColorSpace;
  if (nearest) { t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; }
  else { t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = 4; }
  t.needsUpdate = true; return t;
}
// PixelSprite rows are top-first; DataTexture wants bottom-first
function flipRows(a, w, h) { const o = new Uint8Array(a.length); for (let y = 0; y < h; y++) o.set(a.subarray(y * w * 4, (y + 1) * w * 4), (h - 1 - y) * w * 4); return o; }
function spriteTex(spr, emissive = false) { return dataTex(flipRows(spr.rgba(emissive), spr.w, spr.h), spr.w, spr.h, spr.k === 1); }
function surface(uMax, vMax, fn, mode, emissive = false, ka = KA) {
  const t = T.sample(uMax, vMax, mode === 'B' ? 1 : ka, fn);
  return [dataTex(t.rgba, t.w, t.h, mode === 'B'), emissive ? dataTex(t.em, t.w, t.h, mode === 'B') : null];
}
function spriteCanvas(spr) { const c = document.createElement('canvas'); c.width = spr.w; c.height = spr.h; spr.draw(c.getContext('2d')); return c; }

// billboards: upright planes, stretched by 1/cos so one texel is one screen pixel in B
const BILL = new THREE.PlaneGeometry(1, 1); BILL.translate(0, 0.5, 0);
{ const n = BILL.attributes.normal; const v = new THREE.Vector3(0, 1, 0.65).normalize(); for (let i = 0; i < n.count; i++) n.setXYZ(i, v.x, v.y, v.z); }
function billboard(spr, o = {}) {
  const mat = new THREE.MeshLambertMaterial({ map: o.map || spriteTex(spr), alphaTest: 0.5, side: THREE.DoubleSide });
  if (o.emap) { mat.emissive = new THREE.Color(0xffffff); mat.emissiveMap = o.emap; }
  const m = new THREE.Mesh(BILL, mat), w = o.w ?? spr.w / spr.k, h = o.h ?? spr.h / spr.k;
  m.scale.set(w / PPM, h / PPM / COS, 1);
  m.userData.foot = (o.foot ?? 2) / PPM / COS; // empty rows under the feet
  m.castShadow = !!o.shadow;
  return m;
}
// B: round a ground point to the screen pixel grid (along the camera's own axes)
function snap(x, z) {
  const a = Math.round((x * RX.x + z * RX.z) * PPM) / PPM, b = Math.round((x * FW.x + z * FW.z) * DV_G) / DV_G;
  return [a * RX.x + b * FW.x, a * RX.z + b * FW.z];
}
// upright billboards always face the camera; y = height of the anchor (default: feet below ground)
function place(m, x, z, mode, y = null) {
  const [px, pz] = mode === 'B' ? snap(x, z) : [x, z];
  m.position.set(px, y ?? -m.userData.foot, pz); m.rotation.y = YAW;
}
const BILLS = { A: [], B: [] }; // static billboards to turn with the camera
function addBill(mode, m, x, z, y = null) { BILLS[mode].push([m, x, z, y]); place(m, x, z, mode, y); }

// a quad from four corners (bl, br, tr, tl seen from outside)
function quad(pts, mat) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([...pts[0], ...pts[1], ...pts[2], ...pts[0], ...pts[2], ...pts[3]], 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1], 2));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; return m;
}
function tri(pts, mat) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts.flat(), 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; return m;
}
const lambert = (map, emap) => new THREE.MeshLambertMaterial(emap ? { map, emissive: 0xffffff, emissiveMap: emap } : { map });

// ---- the world (built once per style) -------------------------------------------------------
const WORLDS = {};
function buildWorld(mode) {
  const grp = new THREE.Group(), k = mode === 'B' ? 1 : KA, flamesList = [];
  // ground
  const L = { x0: -15, z0: -15, roads: ROADS, step: [DOOR_X - 1.4, FRONT, DOOR_X + 1.4, FRONT + 1.1], shade: SHADE };
  const pat = T.groundPattern(L, PPM, DV_G), vMax = 30 * DV_G;
  const [gt] = surface(30 * PPM, vMax, (u, v) => pat(u, vMax - v), mode, false, 2); // A: 2× is enough for the big ground
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), lambert(gt));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; grp.add(ground);
  const rim = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshBasicMaterial({ color: RAMPS.leaf[0] }));
  rim.rotation.x = -Math.PI / 2; rim.position.y = -0.02; grp.add(rim);

  // house: walls as a box (front face carries door + windows), gable roof, chimney
  const { x: hx, z: hz, W, D, H, RH, o } = HOUSE, base = 0.5 * DV_W;
  const fw = W * PPM, fh = H * DV_W, U = (x) => (x + W / 2) * PPM, V = (y) => y * DV_W;
  const frontPat = T.timberWall({ w: fw, h: fh, base, door: [U(DOOR_X - 0.55), U(DOOR_X + 0.55), V(2.05)], windows: WIN.map(([x, y0, y1]) => [U(x - 0.5), U(x + 0.5), V(y0), V(y1)]), glow: true });
  const [ft, fe] = surface(fw, fh, frontPat, mode, true);
  const sidePat = T.timberWall({ w: D * PPM, h: fh, base, windows: [[D * PPM * 0.35, D * PPM * 0.65, V(1.2), V(2)]], glow: false });
  const [st] = surface(D * PPM, fh, sidePat, mode);
  const dark = new THREE.MeshLambertMaterial({ color: RAMPS.stone[0] });
  const box = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), [lambert(st), lambert(st), dark, dark, lambert(ft, fe), lambert(st)]);
  box.position.set(hx, H / 2, hz); box.castShadow = box.receiveShadow = true; grp.add(box);
  const slope = Math.atan2(RH + 0.15, D / 2 + o), Ls = Math.hypot(D / 2 + o, RH + 0.15);
  const [rt] = surface((W + 2 * o) * PPM, Ls * PPM * Math.sin(slope + PITCH), T.shingles(), mode);
  const [rb] = surface((W + 2 * o) * PPM, Math.max(8, Ls * PPM * Math.abs(Math.sin(slope - PITCH))), T.shingles(), mode);
  const x0 = hx - W / 2 - o, x1 = hx + W / 2 + o, yE = H - 0.15, yR = H + RH, zF = hz + D / 2 + o, zB = hz - D / 2 - o;
  grp.add(quad([[x0, yE, zF], [x1, yE, zF], [x1, yR, hz], [x0, yR, hz]], lambert(rt)));
  grp.add(quad([[x1, yE, zB], [x0, yE, zB], [x0, yR, hz], [x1, yR, hz]], lambert(rb)));
  const [gtx] = surface(D * PPM, RH * DV_W, (u, v) => ['plaster', 1.8 + (T.noise(u * 0.1, v * 0.1, 7) - 0.5)], mode);
  grp.add(tri([[hx + W / 2, H, hz + D / 2], [hx + W / 2, H, hz - D / 2], [hx + W / 2, yR - 0.1, hz]], lambert(gtx)));
  grp.add(tri([[hx - W / 2, H, hz - D / 2], [hx - W / 2, H, hz + D / 2], [hx - W / 2, yR - 0.1, hz]], lambert(gtx)));
  const [ct] = surface(0.7 * PPM, 1.6 * DV_W, (u, v) => T.blocks(u, v, 4, 6), mode);
  const chim = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.6, 0.7), lambert(ct));
  chim.position.set(hx + 2.4, yR - 0.2, hz - 0.9); chim.castShadow = true; grp.add(chim);

  // crates, fence
  for (const [x, z, s] of CRATES) {
    const [pt] = surface(s * PPM, s * DV_W, (u, v) => { const e = u < 1.5 || u > s * PPM - 1.5 || v < 1.5 || v > s * DV_W - 1.5; return e ? ['wood', 3] : T.planks(u, v); }, mode);
    const c = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), lambert(pt));
    c.position.set(x, s / 2, z); c.castShadow = c.receiveShadow = true; grp.add(c);
  }
  const [fpt] = surface(PPM * 0.2, 1 * DV_W, (u, v) => T.planks(u, v, 5), mode);
  const fmat = lambert(fpt);
  for (let i = 0; i < 6; i++) {
    const x = -8 + i * 1.1, post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.95, 0.16), fmat);
    post.position.set(x, 0.47, 1.4); post.castShadow = true; grp.add(post);
    if (i < 5) for (const y of [0.35, 0.72]) { const r = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.09, 0.07), fmat); r.position.set(x + 0.55, y, 1.4); r.castShadow = true; grp.add(r); }
  }

  // props
  const cache = new Map();
  const tex = (key, make) => { if (!cache.has(key)) { const s = make(); cache.set(key, [s, spriteTex(s)]); } return cache.get(key); };
  for (const [kind, size, x, z, seed] of TREES) {
    const sd = 1 + (seed % 5);
    const [spr, map] = tex(`${kind}${size}${sd}`, () => (kind === 'pine' ? P.pine(size, sd, k) : kind === 'dead' ? P.deadTree(sd, k) : P.oak(size, sd, k, sd === 4 ? 'leafOld' : 'leaf')));
    const m = billboard(spr, { map, shadow: true, foot: 2 }); addBill(mode, m, x, z); grp.add(m);
  }
  for (const [size, x, z, seed] of ROCKS) { const [spr, map] = tex(`r${size}${seed}`, () => P.rock(size, seed, k)); const m = billboard(spr, { map, shadow: true, foot: 1 }); addBill(mode, m, x, z); grp.add(m); }
  for (const [x, z, seed, fl] of BUSHES) { const [spr, map] = tex(`b${seed}`, () => P.bush(seed, k, 'leaf', fl)); const m = billboard(spr, { map, shadow: true, foot: 1 }); addBill(mode, m, x, z); grp.add(m); }
  for (let i = 0; i < 46; i++) {
    const h = (n) => T.h2(i, n, 99), x = -12 + h(1) * 24, z = -3 + h(2) * 15;
    if (Math.abs(x - 0.2) < 1.8 || (z > 2.8 && z < 5.4 && x > 0)) continue;
    const sd = 1 + (i % 6), fl = i % 4 === 0 ? (i % 8 ? 'flowerV' : 'flowerY') : null;
    const [spr, map] = tex(`g${sd}${fl}`, () => P.grassTuft(sd, k, fl)); const m = billboard(spr, { map, foot: 1 }); addBill(mode, m, x, z); grp.add(m);
  }

  // torches: a bracket or a post, an animated flame billboard
  const fl = P.flames(k), fmaps = fl.map((f) => spriteTex(f));
  const [wt] = surface(PPM * 0.3, DV_W * 2, (u, v) => T.planks(u, v, 3), mode);
  for (const [x, z, y, kind] of TORCHES) {
    const h = kind === 'post' ? 1.7 : y;
    if (kind === 'post') { const p = new THREE.Mesh(new THREE.BoxGeometry(0.14, h, 0.14), lambert(wt)); p.position.set(x, h / 2, z); p.castShadow = true; grp.add(p); }
    else { const b = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.42, 0.22), lambert(wt)); b.position.set(x, h - 0.15, z + 0.06); grp.add(b); }
    const m = new THREE.Mesh(BILL, new THREE.MeshBasicMaterial({ map: fmaps[0], alphaTest: 0.5, side: THREE.DoubleSide }));
    m.scale.set(10 / PPM, 16 / PPM / COS, 1);
    addBill(mode, m, x, z + 0.12, h - 0.05);
    grp.add(m); flamesList.push({ m, maps: fmaps, ph: x * 3.1 });
  }

  // foreground framing branch (drawn on the UI canvas)
  const branch = spriteCanvas(P.frameBranch(3, k));
  scene.add(grp);
  return { grp, flames: flamesList, branch };
}

// ---- lights ------------------------------------------------------------------------------
const hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 1); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 1); sun.castShadow = true; scene.add(sun, sun.target);
Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 60 });
sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.02;
const point = (c, i, d) => { const l = new THREE.PointLight(c, i, d, 1.6); scene.add(l); return l; };
const torchLights = TORCHES.map(([x, z, y, kind]) => { const l = point(0xff9440, 0, 7.5); l.position.set(x, (kind === 'post' ? 1.7 : y) + 0.2, z + 0.5); return l; });
const winLights = WIN.map(([x]) => { const l = point(0xffb060, 0, 4.5); l.position.set(x, 1.5, FRONT + 0.7); return l; });
const lanternLight = point(0xffc070, 0, 4.5), heroLight = point(0xc8d4ff, 0, 4);
const fog = new THREE.Fog(0, 30, 60); scene.fog = fog;
function applyLight() {
  const n = S.night;
  hemi.color.set(n ? 0x56679a : 0xb4927e); hemi.groundColor.set(n ? 0x1a1418 : 0x2c1f1a); hemi.intensity = (n ? 0.62 : 0.85) * LK;
  sun.color.set(n ? 0x9fb2e6 : 0xffb070); sun.intensity = (n ? 0.5 : 1.25) * LK;
  sun.userData.off = n ? [-6, 14, -8] : [-11, 6, 7];
  fog.color.set(n ? 0x0a0c12 : 0x2a1c1c); scene.background = new THREE.Color(n ? 0x07080c : 0x1d1416);
  S.lightK = n ? 1 : 0.45; // torches matter less at dusk
}

// ---- actors --------------------------------------------------------------------------------
function atlas(anims) {
  const frames = [], index = {};
  for (const [n, fr] of Object.entries(anims)) index[n] = fr.map((f) => { frames.push(f.sprite); return { i: frames.length - 1, dur: f.dur }; });
  const N = frames.length, W = FRAME * N, H = FRAME, rgba = new Uint8Array(W * H * 4), em = new Uint8Array(W * H * 4);
  frames.forEach((s, i) => {
    const a = s.rgba(), e = s.rgba(true);
    for (let y = 0; y < H; y++) { const dst = ((H - 1 - y) * W + i * FRAME) * 4; rgba.set(a.subarray(y * FRAME * 4, (y + 1) * FRAME * 4), dst); em.set(e.subarray(y * FRAME * 4, (y + 1) * FRAME * 4), dst); }
  });
  const map = dataTex(rgba, W, H, true), emap = dataTex(em, W, H, true);
  for (const t of [map, emap]) t.repeat.x = 1 / N;
  return { map, emap, N, index };
}
function pick(idx, name, t, loop = true) {
  const fr = idx[name], total = fr.reduce((a, f) => a + f.dur, 0);
  let tt = loop ? t % total : Math.min(t, total - 1e-4);
  for (const f of fr) { if (tt < f.dur) return f.i; tt -= f.dur; }
  return fr[fr.length - 1].i;
}
const animLen = (idx, name) => idx[name].reduce((a, f) => a + f.dur, 0);
const ATL = { mage: atlas(buildCharacter('mage')), hero: atlas(buildCharacter('hero')), keeper: atlas(buildCharacter('keeper')), wolf: atlas(buildCharacter('wolf')) };

// pixel blob shadow, flat on the ground (1:1 on screen in B)
const shadowSpr = new PixelSprite(22, 7).fill(ellipse(11, 3.5, 10.5, 3.2), 'ui', 0);
const shadowTex = spriteTex(shadowSpr);
function blob(w = 22) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.55, depthWrite: false }));
  m.rotation.order = 'YXZ'; m.rotation.x = -Math.PI / 2; m.scale.set(w / PPM, (w * 7 / 22) / DV_G, 1); scene.add(m); return m;
}

// style A: the game's current art painted each frame onto a canvas texture
const AK = 4;
function vectorBill(draw) {
  const c = document.createElement('canvas'); c.width = c.height = FRAME * AK;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = billboard({ w: FRAME, h: FRAME, k: 1 }, { map: t, w: FRAME, h: FRAME, foot: 3 });
  m.material.alphaTest = 0.3; m.visible = false; scene.add(m);
  return { m, c, g: c.getContext('2d'), t, draw };
}
const LOOK_HERO = { hair: 0, hairColor: 1, gear: {} }, LOOK_MAGE = { hair: 2, hairColor: 1, gear: {} };
const LOOK_NPC = { hair: 2, hairColor: 5, outfit: ['#3b4a6b', '#232c40'], npc: { role: 'talk', title: 'Tetua', name: 'Maren' } };

function makeActor(kind, x, z, o = {}) {
  const A = ATL[kind], mB = billboard({ w: FRAME, h: FRAME, k: 1 }, { map: A.map, emap: A.emap, w: FRAME, h: FRAME, foot: 3 });
  scene.add(mB);
  return { kind, x, z, f: 1, dir: [1, 0], anim: 'idle', at: 0, mB, vA: null, shadow: blob(o.shadowW || 18), ...o };
}
const hero = makeActor('mage', 0.4, 7, { hp: 100, max: 100, en: 100, act: null, cds: {}, hurtT: 0, dead: false, deadT: 0, kills: 0 });
const keeper = makeActor('keeper', -3.6, FRONT + 1.6, { f: 1 });
const wolf = makeActor('wolf', 7.5, 6.6, { shadowW: 30, home: [7.5, 6.6], hp: 150, max: 150, slow: 0, state: 'idle', cd: 1, tx: 7.5, tz: 6.6, wt: 0, deadT: 0, hurtT: 0, showHp: 0 });
const ACTORS = [hero, keeper, wolf];

hero.vA = vectorBill((g2, a, t) => {
  const pose = { t, moving: a.anim === 'walk' ? 1 : 0, walk: t * 9, hurt: a.anim === 'hurt' };
  if (a.anim === 'attack' || a.anim === 'cast') pose.attackPhase = Math.min(1, a.at / animLen(ATL[a.kind].index, a.anim));
  const sc = (38 * AK) / 48;
  if (a.anim === 'death') { g2.translate(24 * AK, 45 * AK); g2.rotate(-Math.min(1, a.at / 0.5) * 1.5); g2.translate(-24 * AK, -45 * AK); }
  g2.setTransform(g2.getTransform().multiply(new DOMMatrix([sc, 0, 0, sc, 24 * AK, 45 * AK])));
  drawDoll(g2, a.kind === 'mage' ? 'mage' : 'warrior', a.kind === 'mage' ? LOOK_MAGE : LOOK_HERO, pose);
});
keeper.vA = vectorBill((g2, a, t) => { const sc = (36 * AK) / 48; g2.setTransform(sc, 0, 0, sc, 24 * AK, 45 * AK); drawDoll(g2, null, LOOK_NPC, { t, moving: 0, walk: 0 }); });
wolf.vA = vectorBill((g2, a, t) => {
  const r = 12, K = AK, at = a.at;
  let dx = 0, dy = Math.sin(t * 3) * 0.4, rot = 0, sy = 1;
  if (a.anim === 'walk') dy = -Math.abs(Math.sin(t * 12)) * 1.2;
  if (a.anim === 'attack') dx = at < 0.22 ? -at * 10 : Math.min(7, (at - 0.22) * 60);
  if (a.anim === 'hurt') dx = -2;
  if (a.anim === 'death') { rot = Math.min(1, at / 0.4) * 0.5; sy = 1 - Math.min(0.4, at); }
  g2.setTransform(K, 0, 0, K * sy, (22 + dx) * K, (45 - r * 0.95 + dy) * K + (1 - sy) * 20 * K); g2.rotate(rot);
  if (a.anim === 'hurt') g2.globalAlpha = 0.55;
  MONSTER_ART.wolf(g2, r);
});

// ---- particles: fireflies --------------------------------------------------------------
const FF = 22, ffPos = new Float32Array(FF * 3), ffSeed = Array.from({ length: FF }, (_, i) => [T.h2(i, 1, 5) * 24 - 12, T.h2(i, 2, 5) * 22 - 10, T.h2(i, 3, 5) * 6]);
const ffGeo = new THREE.BufferGeometry(); ffGeo.setAttribute('position', new THREE.BufferAttribute(ffPos, 3));
const ffMat = new THREE.PointsMaterial({ color: 0xe8d27a, size: 1, sizeAttenuation: false, transparent: true, opacity: 0.9, depthWrite: false });
scene.add(new THREE.Points(ffGeo, ffMat));


// ---- skills & effects ------------------------------------------------------------------------
const SKILLS = {
  mage: [
    { id: 'bolt', key: 'J', icon: 'bolt', cost: 0, cd: 0.3, anim: 'attack' },
    { id: 'fire', key: '1', icon: 'fire', cost: 18, cd: 1.1, anim: 'attack', aim: 'line', range: 8 },
    { id: 'frost', key: '2', icon: 'frost', cost: 26, cd: 3.2, anim: 'cast', aim: 'self', radius: 2.8 },
    { id: 'storm', key: '3', icon: 'storm', cost: 30, cd: 2.4, anim: 'cast', aim: 'point', range: 9, radius: 1.4 },
  ],
  hero: [{ id: 'slash', key: 'J', icon: 'sword', cost: 0, cd: 0, anim: 'attack' }],
};
const HIT_FRAME = { hero: { attack: 2 }, mage: { attack: 1, cast: 3 } };
const fireAt = (kind, anim) => ATL[kind].index[anim].slice(0, HIT_FRAME[kind][anim]).reduce((a, f) => a + f.dur, 0);
const FXA = {};
function fxAssets(mode) {
  if (FXA[mode]) return FXA[mode];
  const k = mode === 'B' ? 1 : KA, L = (arr) => arr.map((sp) => ({ map: spriteTex(sp), w: sp.w / sp.k, h: sp.h / sp.k }));
  return (FXA[mode] = {
    fire: L(FX.fireball(k)), boom: L(FX.explosion(k)), bolt: L(FX.arcaneBolt(k)), hit: L(FX.arcaneHit(k)), ring: L(FX.novaRing(SIN, k)),
    shard: L(FX.iceShard(k)), storm: L(FX.lightning(3, k)), scorch: L([FX.scorch(SIN, 'stone', k)]),
    aim: {
      line: spriteTex(FX.aimLine(8 * PPM, Math.round(0.8 * PPM), 'ember', k)),
      self: L([FX.aimCircle(2.8 * PPM, SIN, 'frost', k)])[0],
      area: L([FX.aimCircle(1.4 * PPM, SIN, 'bolt', k)])[0],
      range: L([FX.aimCircle(9 * PPM, SIN, 'smear', k, false)])[0],
    },
    icons: Object.fromEntries(['bolt', 'fire', 'frost', 'storm', 'sword'].map((i) => [i, spriteCanvas(FX.icon(i, k))])),
  });
}
const FXL = [];
const FLAT = new THREE.PlaneGeometry(1, 1);
// an animated effect: upright billboard (anchored at its bottom, height y) or flat on the ground
function fx(frames, x, z, o = {}) {
  const mat = new THREE.MeshBasicMaterial({ map: frames[0].map, transparent: true, alphaTest: o.flat ? 0 : 0.5, depthWrite: !o.flat, side: THREE.DoubleSide, opacity: o.opacity ?? 1 });
  if (o.flat) { mat.polygonOffset = true; mat.polygonOffsetFactor = -2; }
  const m = new THREE.Mesh(o.flat ? FLAT : BILL, mat);
  if (o.flat) { m.rotation.order = 'YXZ'; m.rotation.x = -Math.PI / 2; m.scale.set(frames[0].w / PPM, frames[0].h / DV_G, 1); }
  else m.scale.set(frames[0].w / PPM, frames[0].h / PPM / COS, 1);
  m.visible = false; scene.add(m);
  const fps = o.fps || 14, e = { m, frames, x, z, y: o.y ?? 0, t: 0, fps, loop: !!o.loop, sched: o.sched, delay: o.delay || 0, dir: o.dir || [1, 0], fade: o.fade, flat: !!o.flat, opacity: o.opacity ?? 1 };
  e.life = o.life ?? (o.sched ? o.sched.reduce((a, b) => a + b, 0) : frames.length / fps);
  FXL.push(e); return e;
}
function updateFx(dt) {
  for (let i = FXL.length - 1; i >= 0; i--) {
    const e = FXL[i];
    if (e.delay > 0) { e.delay -= dt; if (e.delay > 0) continue; }
    e.t += dt; e.m.visible = true;
    if (e.t >= e.life) { scene.remove(e.m); e.m.material.dispose(); FXL.splice(i, 1); continue; }
    let fi;
    if (e.sched) { let tt = e.t; fi = 0; while (fi < e.sched.length - 1 && tt >= e.sched[fi]) tt -= e.sched[fi++]; }
    else fi = Math.floor(e.t * e.fps);
    fi = e.loop ? fi % e.frames.length : Math.min(fi, e.frames.length - 1);
    e.m.material.map = e.frames[fi].map;
    if (e.fade) e.m.material.opacity = e.opacity * Math.min(1, (e.life - e.t) / e.fade);
    if (e.flat) { const [px, pz] = S.mode === 'B' ? snap(e.x, e.z) : [e.x, e.z]; e.m.position.set(px, 0.025, pz); e.m.rotation.y = YAW; }
    else {
      place(e.m, e.x, e.z, S.mode, e.y);
      const sf = e.dir[0] * RX.x + e.dir[1] * RX.z; e.m.scale.x = Math.abs(e.m.scale.x) * (sf < 0 ? -1 : 1);
    }
  }
}
// pooled lights for spells; peak fades out over life (stepped in B)
const FXLIGHT = Array.from({ length: 4 }, () => ({ l: point(0xffffff, 0, 6), busy: false, t: 0, life: 1, peak: 0 }));
function light(color, peak, life, dist, x, y, z) {
  const sl = FXLIGHT.find((o) => !o.busy) || FXLIGHT.reduce((a, b) => (a.t / a.life > b.t / b.life ? a : b));
  Object.assign(sl, { busy: true, t: 0, life, peak }); sl.l.color.set(color); sl.l.distance = dist; sl.l.position.set(x, y, z); return sl;
}
function updateLights(dt, B) {
  for (const sl of FXLIGHT) {
    if (!sl.busy) { sl.l.intensity = 0; continue; }
    sl.t += dt; const k = sl.life > 50 ? 1 : Math.max(0, 1 - sl.t / sl.life) ** 1.4;
    sl.l.intensity = (B ? Math.round(k * 6) / 6 : k) * sl.peak * LK;
    if (sl.t >= sl.life) sl.busy = false;
  }
}
// particle pool (sparks, embers, frost dust)
const PN = 260, pPos = new Float32Array(PN * 3).fill(-99), pCol = new Float32Array(PN * 3), pVel = new Float32Array(PN * 3), pLife = new Float32Array(PN), pGrav = new Float32Array(PN);
let pNext = 0;
const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
const pMat = new THREE.PointsMaterial({ size: 1, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false });
const pts = new THREE.Points(pGeo, pMat); pts.frustumCulled = false; scene.add(pts);
const TMPC = new THREE.Color();
function spark(x, y, z, vx, vy, vz, life, hex, grav = 0) {
  const i = pNext; pNext = (pNext + 1) % PN; TMPC.set(hex);
  pPos.set([x, y, z], i * 3); pVel.set([vx, vy, vz], i * 3); pCol.set([TMPC.r, TMPC.g, TMPC.b], i * 3); pLife[i] = life; pGrav[i] = grav;
}
function burst(x, y, z, n, speed, hexes, life, grav = 0, up = 0) {
  for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random() * 0.6); spark(x, y, z, Math.cos(a) * v, up + Math.random() * speed * 0.6, Math.sin(a) * v, life * (0.6 + Math.random() * 0.6), hexes[i % hexes.length], grav); }
}
function updateParticles(dt, B) {
  for (let i = 0; i < PN; i++) {
    if (pLife[i] <= 0) { pPos[i * 3 + 1] = -99; continue; }
    pLife[i] -= dt; pVel[i * 3 + 1] -= pGrav[i] * dt;
    for (let j = 0; j < 3; j++) pPos[i * 3 + j] += pVel[i * 3 + j] * dt;
    if (pPos[i * 3 + 1] < 0.02) { pPos[i * 3 + 1] = 0.02; pVel[i * 3 + 1] *= -0.3; pVel[i * 3] *= 0.6; pVel[i * 3 + 2] *= 0.6; }
  }
  pGeo.attributes.position.needsUpdate = true; pGeo.attributes.color.needsUpdate = true;
  pMat.size = B ? 1 : 3 * Math.min(2, view.dpr || 1);
}
let shakeT = 0, flashT = 0;
const PROJ = [];
const H_ = RAMPS; // palette shortcuts for sparks
function aimDir() { // auto-aim at the wolf when it is roughly in front
  if (wolf.state === 'dead') return hero.dir;
  const vx = wolf.x - hero.x, vz = wolf.z - hero.z, d = Math.hypot(vx, vz);
  return d < 9 && (vx * hero.dir[0] + vz * hero.dir[1]) / d > 0.35 ? [vx / d, vz / d] : hero.dir;
}
// aiming: a skill with sk.aim waits for a confirm (mouse click / touch release) showing a ground marker
const aim = { sk: null, touch: null };
const mouse = { cx: 0, cy: 0, on: false, x: 0, z: 0 };
const ready = (sk) => sk && !hero.dead && (hero.cds[sk.id] || 0) <= 0 && hero.en >= sk.cost;
function useSkill(i, tgt = null) {
  const sk = SKILLS[hero.kind][i];
  if (!ready(sk) || hero.act) return false;
  if (!tgt) tgt = mouse.on ? [mouse.x, mouse.z] : autoTarget(sk);
  tgt = clampTarget(sk, tgt);
  hero.en -= sk.cost; hero.cds[sk.id] = sk.cd; hero.act = { sk, t: 0, fired: false, tgt }; setAnim(hero, sk.anim); talk = -1;
  if (sk.aim !== 'self' && sk.id !== 'slash') { const vx = tgt[0] - hero.x, vz = tgt[1] - hero.z, d = Math.hypot(vx, vz); if (d > 0.05) hero.dir = [vx / d, vz / d]; }
  return true;
}
function autoTarget(sk) { // touch tap / keyboard without a mouse: the wolf if it is in front, else straight ahead
  const [dx, dz] = aimDir(), r = sk.range || 6;
  if (sk.aim === 'point' && wolf.state !== 'dead' && dist(hero, wolf) < r) return [wolf.x, wolf.z];
  return [hero.x + dx * Math.min(r, 4), hero.z + dz * Math.min(r, 4)];
}
function clampTarget(sk, [x, z]) {
  if (sk.aim !== 'point') return [x, z];
  const vx = x - hero.x, vz = z - hero.z, d = Math.hypot(vx, vz);
  return d <= sk.range ? [x, z] : [hero.x + (vx / d) * sk.range, hero.z + (vz / d) * sk.range];
}
function pressSkill(i) { // key 1-3 / touch: start aiming (same key again = cast at the cursor)
  const sk = SKILLS[hero.kind][i];
  if (!sk) return;
  if (!sk.aim) { useSkill(i); return; }
  if (aim.sk === sk) { confirmAim(); return; }
  if (!ready(sk)) return;
  aim.sk = sk; aim.i = i; ui.style.cursor = 'crosshair';
}
function aimPoint() {
  if (aim.touch) {
    const t = aim.touch, l = Math.hypot(t.dx, t.dy);
    if (l < 12) return autoTarget(aim.sk);
    const wx = (t.dx * RX.x - t.dy * FW.x) / l, wz = (t.dx * RX.z - t.dy * FW.z) / l, r = (aim.sk.range || 0) * Math.min(1, l / 70);
    return [hero.x + wx * Math.max(r, 0.5), hero.z + wz * Math.max(r, 0.5)];
  }
  return mouse.on ? [mouse.x, mouse.z] : autoTarget(aim.sk);
}
function confirmAim() { if (!aim.sk) return; if (useSkill(aim.i, aimPoint())) cancelAim(); }
function cancelAim() { aim.sk = null; aim.touch = null; ui.style.cursor = ''; }
const AIMM = {};
function aimMeshes(mode) {
  if (AIMM[mode]) return AIMM[mode];
  const A = fxAssets(mode).aim, mk = (map, geo) => {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map, transparent: true, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }));
    m.rotation.order = 'YXZ'; m.rotation.x = -Math.PI / 2; m.visible = false; m.renderOrder = 2; scene.add(m); return m;
  };
  const lineGeo = new THREE.PlaneGeometry(1, 1); lineGeo.translate(0.5, 0, 0);
  const o = { line: mk(A.line, lineGeo), self: mk(A.self.map, FLAT), area: mk(A.area.map, FLAT), range: mk(A.range.map, FLAT) };
  for (const k of ['self', 'area', 'range']) o[k].scale.set(A[k].w / PPM, A[k].h / DV_G, 1);
  o.line.scale.set(8, 0.8, 1);
  return (AIMM[mode] = o);
}
const groundRay = new THREE.Raycaster(), groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), TMPV = new THREE.Vector3(), NDC = new THREE.Vector2();
function updateAim(B) {
  if (mouse.on) {
    const r = gl.getBoundingClientRect();
    NDC.set(((mouse.cx - r.left) / r.width) * 2 - 1, -((mouse.cy - r.top) / r.height) * 2 + 1);
    groundRay.setFromCamera(NDC, cam);
    if (groundRay.ray.intersectPlane(groundPlane, TMPV)) { mouse.x = TMPV.x; mouse.z = TMPV.z; }
  }
  for (const [m, o] of Object.entries(AIMM)) for (const k in o) if (m !== S.mode || !aim.sk) o[k].visible = false;
  if (!aim.sk) return;
  if (!ready(aim.sk)) { cancelAim(); return; }
  const o = aimMeshes(S.mode), sk = aim.sk, [tx, tz] = clampTarget(sk, aimPoint());
  const at = (m, x, z) => { const [px, pz] = B ? snap(x, z) : [x, z]; m.position.set(px, 0.03, pz); m.rotation.y = YAW; m.visible = true; };
  for (const k in o) o[k].visible = false;
  if (sk.aim === 'self') at(o.self, hero.x, hero.z);
  if (sk.aim === 'point') { at(o.range, hero.x, hero.z); at(o.area, tx, tz); }
  if (sk.aim === 'line') {
    const vx = tx - hero.x, vz = tz - hero.z, d = Math.hypot(vx, vz) || 1;
    at(o.line, hero.x + (vx / d) * 0.4, hero.z + (vz / d) * 0.4); o.line.rotation.y = Math.atan2(-vz / d, vx / d);
    hero.dir = [vx / d, vz / d];
  }
}
function cast(sk, tgt) {
  const A = fxAssets(S.mode);
  let [dx, dz] = hero.dir;
  if (tgt && sk.aim !== 'self') { const vx = tgt[0] - hero.x, vz = tgt[1] - hero.z, d = Math.hypot(vx, vz); if (d > 0.05) [dx, dz] = [vx / d, vz / d]; }
  if (sk.id === 'slash') {
    const vx = wolf.x - hero.x, vz = wolf.z - hero.z, fwd = vx * dx + vz * dz, lat = Math.abs(vx * dz - vz * dx);
    if (wolf.state !== 'dead' && fwd > -0.3 && fwd < 1.9 && lat < 0.9) hitWolf(14 + Math.floor(Math.random() * 6), 0.5);
  } else if (sk.id === 'bolt' || sk.id === 'fire') {
    const fire = sk.id === 'fire', x = hero.x + dx * 0.6, z = hero.z + dz * 0.6;
    const e = fx(fire ? A.fire : A.bolt, x, z, { y: 0.78, loop: true, fps: 12, life: 99, dir: hero.dir });
    e.dir = [dx, dz];
    PROJ.push({ e, x, z, dx, dz, sp: fire ? 9 : 13, range: fire ? 8 : 9, fire, l: light(fire ? 0xff8030 : 0xa070ff, fire ? 2.4 : 1.2, 99, fire ? 5 : 3.5, x, 1.1, z) });
  } else if (sk.id === 'frost') {
    fx(A.ring, hero.x, hero.z, { flat: true, fps: 16 });
    for (const [r, n] of [[1.3, 7], [2.3, 11]]) for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r, x = hero.x + Math.cos(a) * r, z = hero.z + Math.sin(a) * r;
      fx(A.shard, x, z, { y: -1 / PPM / COS, sched: [0.04, 0.04, 0.55, 0.12, 0.12, 0.16], delay: r * 0.09, dir: [Math.cos(a), 0] });
    }
    light(0x86c8ff, 4.5, 0.6, 7, hero.x, 1, hero.z);
    burst(hero.x, 0.3, hero.z, 34, 3.2, [H_.frost[4], H_.frost[3], H_.frost[2]], 0.8, -0.4);
    if (wolf.state !== 'dead' && dist(hero, wolf) < 2.8) { hitWolf(20 + Math.floor(Math.random() * 5), 0.3); wolf.slow = 2.5; }
    shakeT = 0.12;
  } else if (sk.id === 'storm') {
    const [x, z] = tgt || [hero.x + dx * 4, hero.z + dz * 4], near = wolf.state !== 'dead' && Math.hypot(wolf.x - x, wolf.z - z) < sk.radius;
    fx(A.storm, x, z, { y: -0.05, fps: 22, loop: true, life: 0.3, dir: [Math.random() < 0.5 ? 1 : -1, 0] });
    fx(A.scorch, x, z, { flat: true, life: 4, fade: 1.5, opacity: 0.85 });
    light(0xc8e0ff, 14, 0.4, 12, x, 2.5, z);
    burst(x, 0.2, z, 36, 4.5, [H_.bolt[4], H_.bolt[3], H_.bolt[2]], 0.5, 9, 2);
    if (near) hitWolf(32 + Math.floor(Math.random() * 6), 0.2);
    shakeT = 0.2; flashT = 0.09;
  }
}
function updateProjectiles(dt) {
  const A = fxAssets(S.mode);
  for (let i = PROJ.length - 1; i >= 0; i--) {
    const p = PROJ[i], st = p.sp * dt;
    p.x += p.dx * st; p.z += p.dz * st; p.range -= st; p.e.x = p.x; p.e.z = p.z; p.l.l.position.set(p.x, 1.1, p.z);
    if (p.fire) spark(p.x - p.dx * 0.25, 1.05 + (Math.random() - 0.5) * 0.2, p.z - p.dz * 0.25, (Math.random() - 0.5) * 0.6, 0.6 + Math.random() * 0.8, (Math.random() - 0.5) * 0.6, 0.5, Math.random() < 0.5 ? H_.ember[3] : H_.torch[3]);
    const hitW = wolf.state !== 'dead' && Math.hypot(wolf.x - p.x, wolf.z - p.z) < 0.8;
    const wall = p.x > HB.x0 && p.x < HB.x1 && p.z > HB.z0 && p.z < HB.z1;
    if (!hitW && !wall && p.range > 0) continue;
    p.e.life = 0; p.l.busy = false; PROJ.splice(i, 1);
    if (p.fire) {
      fx(A.boom, p.x, p.z, { y: -18 / PPM / COS, fps: 15, dir: [p.dx, p.dz] });
      fx(A.scorch, p.x, p.z, { flat: true, life: 4, fade: 1.5, opacity: 0.85 });
      light(0xff7a30, 9, 0.7, 9, p.x, 1.2, p.z);
      burst(p.x, 0.9, p.z, 30, 4, [H_.ember[4], H_.ember[3], H_.torch[4]], 0.9, 7, 1.5);
      if (wolf.state !== 'dead' && Math.hypot(wolf.x - p.x, wolf.z - p.z) < 2.2) hitWolf(26 + Math.floor(Math.random() * 7), 0.9);
      shakeT = 0.22;
    } else {
      fx(A.hit, p.x, p.z, { y: 0.62, fps: 18, dir: [p.dx, p.dz] });
      light(0xa070ff, 2.5, 0.25, 4, p.x, 1, p.z);
      burst(p.x, 1, p.z, 10, 2.5, [H_.arcane[4], H_.arcane[3]], 0.35);
      if (hitW) hitWolf(9 + Math.floor(Math.random() * 4), 0.25);
    }
  }
}

// ---- palette lock (B): nearest palette colour per low-res pixel ---------------------------------
const rt = new THREE.WebGLRenderTarget(4, 4, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
const PAL = ALL.map(([r, g2, b]) => new THREE.Vector3(r / 255, g2 / 255, b / 255));
const lockMat = new THREE.ShaderMaterial({
  uniforms: { src: { value: rt.texture }, pal: { value: PAL } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
  fragmentShader: `uniform sampler2D src; uniform vec3 pal[${PAL.length}]; varying vec2 vUv;
    vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1. / 2.4)) - .055, step(.0031308, c)); }
    void main(){
      vec3 c = toSRGB(texture2D(src, vUv).rgb);
      vec2 p = mod(gl_FragCoord.xy, 2.); c += ((p.x + p.y * 2.) / 4. - .375) * .035;
      vec3 best = pal[0]; float bd = 9.;
      for (int i = 0; i < ${PAL.length}; i++) { vec3 d = (pal[i] - c) * vec3(.9, 1.2, .7); float q = dot(d, d); if (q < bd) { bd = q; best = pal[i]; } }
      gl_FragColor = vec4(best, 1.);
    }`,
  depthTest: false, depthWrite: false,
});
const postScene = new THREE.Scene(), postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), lockMat));

// ---- view / mode ---------------------------------------------------------------------------
function resize() {
  const dpr = window.devicePixelRatio || 1, dw = Math.round(innerWidth * dpr), dh = Math.round(innerHeight * dpr);
  const s = Math.max(1, Math.round(dh / 270) + S.zoom);
  const lowW = Math.ceil(dw / s / 2) * 2, lowH = Math.ceil(dh / s / 2) * 2;
  view = { lowW, lowH, s, dpr, dw, dh };
  const hw = lowW / 2 / PPM, hh = lowH / 2 / PPM;
  Object.assign(ortho, { left: -hw, right: hw, top: hh, bottom: -hh }); ortho.updateProjectionMatrix();
  view.dist = S.mode === 'B' ? 40 : hh / Math.tan((15 * Math.PI) / 180);
  persp.aspect = dw / dh; persp.updateProjectionMatrix();
  if (S.mode === 'B') {
    renderer.setPixelRatio(1); renderer.setSize(lowW, lowH, false);
    for (const c of [gl, ui]) Object.assign(c.style, { width: `${(lowW * s) / dpr}px`, height: `${(lowH * s) / dpr}px`, imageRendering: 'pixelated' });
    ui.width = lowW; ui.height = lowH; rt.setSize(lowW, lowH);
  } else {
    renderer.setPixelRatio(Math.min(dpr, 2)); renderer.setSize(innerWidth, innerHeight, false);
    for (const c of [gl, ui]) Object.assign(c.style, { width: `${innerWidth}px`, height: `${innerHeight}px`, imageRendering: 'auto' });
    ui.width = dw; ui.height = dh;
  }
  fog.near = view.dist + (S.mode === 'B' ? 4 : 2); fog.far = view.dist + 26;
}
function applyMode() {
  const B = S.mode === 'B';
  if (!WORLDS[S.mode]) WORLDS[S.mode] = buildWorld(S.mode);
  for (const [m, w] of Object.entries(WORLDS)) w.grp.visible = m === S.mode;
  cam = B ? ortho : persp;
  for (const a of ACTORS) { a.mB.visible = B; a.vA.m.visible = !B; }
  ffMat.size = B ? 1 : 2.5 * Math.min(2, view.dpr || 1); ffMat.needsUpdate = true;
  sun.shadow.mapSize.set(B ? 1024 : 2048, B ? 1024 : 2048); sun.shadow.map?.dispose(); sun.shadow.map = null;
  resize(); refreshBar();
}

// ---- game logic (tiny) -------------------------------------------------------------------------
const keys = new Set(), joy = { on: false, id: null, x0: 0, y0: 0, dx: 0, dy: 0 };
const pops = [];
let talk = -1, quest = 0;
const LINES = ['The wolves grow bold when the lanterns die.', 'Keep to the road, child. The dark out there has teeth.', 'Bring down the shadow wolf and I will light the way north.'];
const LINES_DONE = ['You did it. The lantern burns a little brighter tonight.'];

const HB = { x0: HOUSE.x - HOUSE.W / 2, x1: HOUSE.x + HOUSE.W / 2, z0: HOUSE.z - HOUSE.D / 2, z1: HOUSE.z + HOUSE.D / 2 };
const CIRCLES = [...TREES.map(([, , x, z]) => [x, z, 0.4]), ...ROCKS.map(([s, x, z]) => [x, z, { s: 0.25, m: 0.45, l: 0.7 }[s]]), ...CRATES.map(([x, z, s]) => [x, z, s * 0.6]), [keeper.x, keeper.z, 0.35]];
function collide(a, r) {
  if (a.x > HB.x0 - r && a.x < HB.x1 + r && a.z > HB.z0 - r && a.z < HB.z1 + r) {
    const d = [a.x - (HB.x0 - r), HB.x1 + r - a.x, a.z - (HB.z0 - r), HB.z1 + r - a.z], m = Math.min(...d);
    if (m === d[0]) a.x = HB.x0 - r; else if (m === d[1]) a.x = HB.x1 + r; else if (m === d[2]) a.z = HB.z0 - r; else a.z = HB.z1 + r;
  }
  for (const [cx, cz, cr] of CIRCLES) { const dx = a.x - cx, dz = a.z - cz, d = Math.hypot(dx, dz), m = cr + r; if (d < m && d > 1e-4) { a.x = cx + (dx / d) * m; a.z = cz + (dz / d) * m; } }
  a.x = Math.max(-12.5, Math.min(12.5, a.x)); a.z = Math.max(-12, Math.min(12.5, a.z));
}
function setAnim(a, n) { if (a.anim !== n) { a.anim = n; a.at = 0; } }
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

const attack = () => useSkill(0);
function interact() {
  if (dist(hero, keeper) > 2) return;
  const lines = quest === 2 ? LINES_DONE : LINES;
  talk = talk + 1 >= lines.length ? -1 : talk + 1;
  if (quest === 2 && talk === -1) quest = 3;
}
function update(dt, t) {
  // hero
  hero.at += dt;
  if (hero.dead) {
    setAnim(hero, 'death'); hero.deadT += dt;
    if (hero.deadT > 3) Object.assign(hero, { dead: false, deadT: 0, hp: hero.max, x: 0.4, z: 7 }), setAnim(hero, 'idle');
  } else {
    let mx = 0, mz = 0;
    if (keys.has('a') || keys.has('arrowleft')) mx--; if (keys.has('d') || keys.has('arrowright')) mx++;
    if (keys.has('w') || keys.has('arrowup')) mz--; if (keys.has('s') || keys.has('arrowdown')) mz++;
    if (joy.on) { mx = joy.dx; mz = joy.dy; }
    const ml = Math.hypot(mx, mz);
    for (const k in hero.cds) hero.cds[k] -= dt;
    if (hero.act) {
      const a = hero.act; a.t += dt;
      if (!a.fired && a.t >= fireAt(hero.kind, a.sk.anim)) { a.fired = true; cast(a.sk, a.tgt); }
      if (a.t >= animLen(ATL[hero.kind].index, a.sk.anim)) { hero.act = null; setAnim(hero, 'idle'); }
    } else if (hero.hurtT > 0) { hero.hurtT -= dt; setAnim(hero, 'hurt'); }
    else if (ml > 0.1) {
      const sp = 4.2 * Math.min(1, ml) / Math.max(1, ml);
      const wx = mx * RX.x - mz * FW.x, wz = mx * RX.z - mz * FW.z, wl = Math.hypot(wx, wz) || 1; // screen → world
      hero.x += wx * sp * dt; hero.z += wz * sp * dt; hero.dir = [wx / wl, wz / wl];
      setAnim(hero, 'walk'); if (talk >= 0 && dist(hero, keeper) > 2.4) talk = -1;
    } else setAnim(hero, 'idle');
    collide(hero, 0.3);
    hero.en = Math.min(100, hero.en + dt * 12); hero.hp = Math.min(hero.max, hero.hp + dt * 1.5);
  }
  // wolf
  wolf.at += dt; wolf.cd -= dt; wolf.showHp -= dt; wolf.slow -= dt; const ws = wolf.slow > 0 ? 0.35 : 1;
  const d = dist(hero, wolf);
  if (wolf.state === 'dead') {
    setAnim(wolf, 'death'); wolf.deadT += dt;
    if (wolf.deadT > 5) Object.assign(wolf, { state: 'idle', hp: wolf.max, x: wolf.home[0], z: wolf.home[1], deadT: 0 }), setAnim(wolf, 'idle');
  } else if (wolf.hurtT > 0) { wolf.hurtT -= dt; setAnim(wolf, 'hurt'); }
  else if (wolf.state === 'attack') {
    if (!wolf.hit && wolf.at >= 0.22) { wolf.hit = true; if (!hero.dead && d < 1.8) hurtHero(9); }
    const lv = wolf.at > 0.22 && wolf.at < 0.3 ? 4.5 * dt : 0; wolf.x += wolf.dir[0] * lv; wolf.z += wolf.dir[1] * lv;
    if (wolf.at >= animLen(ATL.wolf.index, 'attack')) { wolf.state = 'idle'; wolf.cd = 1.3; setAnim(wolf, 'idle'); }
  } else if (!hero.dead && d < 7) {
    if (d > 0.2) wolf.dir = [(hero.x - wolf.x) / d, (hero.z - wolf.z) / d];
    if (d < 1.45 && wolf.cd <= 0) { wolf.state = 'attack'; wolf.hit = false; setAnim(wolf, 'attack'); }
    else if (d > 1.2) { wolf.x += ((hero.x - wolf.x) / d) * 3.1 * ws * dt; wolf.z += ((hero.z - wolf.z) / d) * 3.1 * ws * dt; setAnim(wolf, 'walk'); }
    else setAnim(wolf, 'idle');
  } else {
    wolf.wt -= dt;
    if (wolf.wt <= 0) { wolf.wt = 2.5 + Math.random() * 2; wolf.tx = wolf.home[0] + (Math.random() - 0.5) * 5; wolf.tz = wolf.home[1] + (Math.random() - 0.5) * 3; }
    const wd = Math.hypot(wolf.tx - wolf.x, wolf.tz - wolf.z);
    if (wd > 0.2) { wolf.x += ((wolf.tx - wolf.x) / wd) * 1.3 * dt; wolf.z += ((wolf.tz - wolf.z) / wd) * 1.3 * dt; wolf.dir = [(wolf.tx - wolf.x) / wd, (wolf.tz - wolf.z) / wd]; setAnim(wolf, 'walk'); }
    else setAnim(wolf, 'idle');
  }
  collide(wolf, 0.5);
  keeper.at += dt; { const kd = dist(hero, keeper) || 1; keeper.dir = [(hero.x - keeper.x) / kd, (hero.z - keeper.z) / kd]; }
  for (const p of pops) p.t += dt;
  while (pops.length && pops[0].t > 0.9) pops.shift();
}
function hitWolf(n, push = 0.5) {
  if (wolf.state === 'dead') return;
  wolf.hp -= n; wolf.hurtT = 0.22; wolf.showHp = 3; wolf.state = 'idle';
  const vx = wolf.x - hero.x, vz = wolf.z - hero.z, vd = Math.hypot(vx, vz) || 1;
  wolf.x += (vx / vd) * push; wolf.z += (vz / vd) * push; pops.push({ x: wolf.x, z: wolf.z, v: `${n}`, t: 0, c: RAMPS.gold[4] });
  if (wolf.hp <= 0) { wolf.state = 'dead'; wolf.at = 0; hero.kills++; if (quest === 0) quest = 1; if (quest === 1) quest = 2; }
}
function hurtHero(n) {
  hero.hp -= n; hero.hurtT = 0.22; hero.act = null; hero.x += wolf.dir[0] * 0.4; hero.z += wolf.dir[1] * 0.4;
  pops.push({ x: hero.x, z: hero.z, v: `${n}`, t: 0, c: RAMPS.red[4] });
  if (hero.hp <= 0) { hero.hp = 0; hero.dead = true; hero.at = 0; }
}

// ---- drawing actors -----------------------------------------------------------------------
function drawActors(t) {
  const B = S.mode === 'B';
  for (const a of ACTORS) {
    const A = ATL[a.kind], sf = a.dir[0] * RX.x + a.dir[1] * RX.z;
    if (Math.abs(sf) > 0.12) a.f = Math.sign(sf);
    if (B) {
      const i = pick(A.index, a.anim, a.at, a.anim !== 'death');
      A.map.offset.x = A.emap.offset.x = i / A.N;
      a.mB.scale.x = Math.abs(a.mB.scale.x) * a.f; place(a.mB, a.x, a.z, 'B');
    } else {
      const v = a.vA; v.g.setTransform(1, 0, 0, 1, 0, 0); v.g.clearRect(0, 0, v.c.width, v.c.height); v.g.globalAlpha = 1;
      v.draw(v.g, a, t); v.t.needsUpdate = true;
      v.m.scale.x = Math.abs(v.m.scale.x) * a.f; place(v.m, a.x, a.z, 'A');
    }
    const [sx, sz] = B ? snap(a.x, a.z) : [a.x, a.z];
    a.shadow.position.set(sx, 0.02, sz); a.shadow.rotation.y = YAW;
  }
}

// ---- UI ----------------------------------------------------------------------------------------
const C = { ink: '#050407', panel: RAMPS.ui[1], panel2: RAMPS.ui[2], line: RAMPS.ui[3], gold: RAMPS.gold[3], goldD: RAMPS.gold[1], text: '#d9d0c0', dim: '#8d8578', red: RAMPS.red[3], redD: RAMPS.red[1], blue: RAMPS.blue[3], blueD: RAMPS.blue[1] };
function project(x, y, z) {
  const v = new THREE.Vector3(x, y, z).project(cam);
  return [Math.round(((v.x + 1) / 2) * ui.width), Math.round(((1 - v.y) / 2) * ui.height)];
}
// B: pixel panel — ink edge, inner bevel line, notched corners, gold corner studs
function pxPanel(x, y, w, h) {
  g.fillStyle = C.ink; g.fillRect(x + 1, y, w - 2, h); g.fillRect(x, y + 1, w, h - 2);
  g.fillStyle = C.panel; g.fillRect(x + 1, y + 1, w - 2, h - 2);
  g.fillStyle = C.line; g.fillRect(x + 2, y + 2, w - 4, 1); g.fillRect(x + 2, y + 2, 1, h - 4);
  g.fillStyle = C.ink; g.fillRect(x + 2, y + h - 3, w - 4, 1); g.fillRect(x + w - 3, y + 2, 1, h - 4);
  g.fillStyle = C.panel2; for (let yy = y + 5; yy < y + h - 4; yy += 4) for (let xx = x + 5 + ((yy >> 2) & 1) * 2; xx < x + w - 4; xx += 4) g.fillRect(xx, yy, 1, 1);
  g.fillStyle = C.gold; for (const [cx, cy] of [[x + 1, y + 1], [x + w - 2, y + 1], [x + 1, y + h - 2], [x + w - 2, y + h - 2]]) g.fillRect(cx, cy, 1, 1);
}
function pxBar(x, y, w, h, k, c, cd) {
  g.fillStyle = C.ink; g.fillRect(x - 1, y - 1, w + 2, h + 2);
  g.fillStyle = cd; g.fillRect(x, y, w, h);
  g.fillStyle = c; g.fillRect(x, y, Math.round(w * k), h);
  g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x, y, Math.round(w * k), 1);
  g.fillStyle = C.ink; for (let i = 8; i < w; i += 8) g.fillRect(x + i, y, 1, h);
}
function pxCircle(cx, cy, r, c) { g.fillStyle = c; for (let a = 0; a < 64; a++) { const t = (a / 64) * Math.PI * 2; g.fillRect(Math.round(cx + Math.cos(t) * r), Math.round(cy + Math.sin(t) * r), 1, 1); } }

// A: flat dark panels with a thin gold line (the approved game UI)
function aPanel(x, y, w, h) {
  const q = view.dpr; g.fillStyle = 'rgba(14,11,16,.9)'; g.fillRect(x, y, w, h);
  g.strokeStyle = 'rgba(201,162,74,.55)'; g.lineWidth = q; g.strokeRect(x + q / 2, y + q / 2, w - q, h - q);
}
function aText(t, x, y, size, color, font = 'Cinzel') { g.font = `600 ${size * view.dpr}px ${font}, serif`; g.fillStyle = color; g.textBaseline = 'top'; g.fillText(t, x, y); }

// touch buttons, in UI canvas pixels: attack, the three spells, talk
function touchLayout(W, H) {
  const u = S.mode === 'B' ? 1 : view.dpr * 1.7, L = [{ id: 0, x: W - 40 * u, y: H - 40 * u, r: 21 * u }];
  if (SKILLS[hero.kind].length > 1) L.push({ id: 1, x: W - 92 * u, y: H - 26 * u, r: 14 * u }, { id: 2, x: W - 84 * u, y: H - 74 * u, r: 14 * u }, { id: 3, x: W - 42 * u, y: H - 94 * u, r: 14 * u });
  if (!hero.dead && dist(hero, keeper) < 2) L.push({ id: 'talk', x: W - (SKILLS[hero.kind].length > 1 ? 136 : 84) * u, y: H - 28 * u, r: 14 * u });
  return L;
}
function drawSkills(B, W, H) {
  const list = SKILLS[hero.kind], icons = fxAssets(S.mode).icons, u = B ? 1 : view.dpr;
  const slot = (sk, x, y, sz) => {
    const left = Math.max(0, hero.cds[sk.id] || 0) / sk.cd, poor = hero.en < sk.cost, ic = icons[sk.icon];
    g.drawImage(ic, x + (sz - (B ? 16 : 16 * u * 1.6)) / 2, y + (sz - (B ? 16 : 16 * u * 1.6)) / 2, B ? 16 : 16 * u * 1.6, B ? 16 : 16 * u * 1.6);
    if (left > 0) { g.fillStyle = 'rgba(5,4,7,.72)'; g.fillRect(x + 2 * u, y + 2 * u, sz - 4 * u, Math.round((sz - 4 * u) * left)); }
    if (poor) { g.fillStyle = 'rgba(40,8,10,.55)'; g.fillRect(x + 2 * u, y + 2 * u, sz - 4 * u, sz - 4 * u); }
  };
  if (touchUI) {
    if (aim.touch) { const r = ui.getBoundingClientRect(), k = ui.width / r.width; g.fillStyle = 'rgba(224,194,122,.8)'; for (let i = 0; i <= 10; i++) g.fillRect(Math.round((aim.touch.x0 - r.left + aim.touch.dx * i / 10) * k) - 1, Math.round((aim.touch.y0 - r.top + aim.touch.dy * i / 10) * k) - 1, 2, 2); }
    for (const b of touchLayout(W, H)) {
      if (b.id === 'talk') { if (B) { pxCircle(b.x, b.y, b.r, C.gold); text(g, 'E', b.x - 2, b.y - 3, C.gold); } else { g.strokeStyle = 'rgba(201,162,74,.7)'; g.lineWidth = 2 * u; g.beginPath(); g.arc(b.x, b.y, b.r, 0, 7); g.stroke(); aText('E', b.x - 5 * u, b.y - 9 * u, 15, '#e6c97a'); } continue; }
      const sk = list[b.id]; if (!sk) continue;
      if (B) { g.fillStyle = 'rgba(12,10,15,.7)'; g.fillRect(b.x - b.r * 0.7, b.y - b.r * 0.7, b.r * 1.4, b.r * 1.4); pxCircle(b.x, b.y, b.r, C.gold); }
      else { g.fillStyle = 'rgba(14,11,16,.6)'; g.beginPath(); g.arc(b.x, b.y, b.r, 0, 7); g.fill(); g.strokeStyle = 'rgba(201,162,74,.7)'; g.lineWidth = 2 * u; g.stroke(); }
      const sz = Math.round(b.r * 1.3); slot(sk, Math.round(b.x - sz / 2), Math.round(b.y - sz / 2), sz);
    }
    return;
  }
  const sz = B ? 22 : 52 * u, gap = B ? 4 : 8 * u, x0 = Math.round((W - list.length * (sz + gap) + gap) / 2), y = H - sz - (B ? 12 : 26 * u);
  list.forEach((sk, i) => {
    const x = x0 + i * (sz + gap);
    if (B) { pxPanel(x, y, sz, sz); slot(sk, x, y, sz); text(g, sk.key, x + sz / 2 - 2, y + sz + 2, C.dim); }
    else { aPanel(x, y, sz, sz); slot(sk, x, y, sz); aText(sk.key, x + sz / 2 - 4 * u, y + sz + 4 * u, 11, '#9a917f', 'system-ui'); }
  });
}
function questLine() {
  return quest === 0 ? ['Talk to Elder Maren', ''] : quest === 1 ? ['Slay the shadow wolf', `${Math.min(hero.kills, 1)}/1`] : quest === 2 ? ['Return to Elder Maren', ''] : ['The road north is open', ''];
}
function drawUI(t) {
  const W = ui.width, H = ui.height, B = S.mode === 'B';
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); g.imageSmoothingEnabled = !B;
  // foreground branches (parallax: they move faster than the world)
  const br = WORLDS[S.mode].branch, q = B ? 1 : (W / view.lowW);
  const px = (-hero.x * PPM * 0.35) % 40, sway = Math.round(Math.sin(t * 0.8) * 2);
  g.globalAlpha = 0.96;
  g.drawImage(br, Math.round(-30 + px) * q, (H / q - 58 + sway) * q, br.width * (B ? 1 : q / KA), br.height * (B ? 1 : q / KA));
  g.save(); g.translate(W, 0); g.scale(-1, -1);
  g.drawImage(br, Math.round(-40 - px) * q, (-12 + sway) * q - br.height * (B ? 1 : q / KA), br.width * (B ? 1 : q / KA), br.height * (B ? 1 : q / KA));
  g.restore(); g.globalAlpha = 1;

  const [qt, qn] = questLine(), near = !hero.dead && dist(hero, keeper) < 2;
  if (flashT > 0) { g.fillStyle = `rgba(210,225,255,${(flashT / 0.09) * 0.22})`; g.fillRect(0, 0, W, H); }
  drawSkills(B, W, H);
  if (B) {
    pxPanel(6, 6, 116, 36);
    text(g, 'ARDEN', 12, 11, C.gold); text(g, 'LV 12', 86, 11, C.dim);
    pxBar(12, 22, 100, 5, hero.hp / hero.max, C.red, C.redD);
    pxBar(12, 31, 100, 3, hero.en / 100, C.blue, C.blueD);
    pxPanel(6, 45, 116, 26); text(g, 'QUEST', 12, 50, C.gold); text(g, qt, 12, 60, C.text); if (qn) text(g, qn, 116 - textWidth(qn), 50, C.dim);
    // markers over the keeper, wolf health
    const [kx, ky] = project(keeper.x, 2.2, keeper.z);
    if (quest === 0 || quest === 2) { const b = Math.round(Math.sin(t * 4)); text(g, '!', kx - 2, ky - 6 + b, C.gold); }
    if (near && talk < 0) { const s = 'E · TALK', w = textWidth(s) + 10; pxPanel(kx - w / 2, ky - 22, w, 15); text(g, s, kx - w / 2 + 5, ky - 18, C.text); }
    if (wolf.showHp > 0 && wolf.state !== 'dead') { const [wx, wy] = project(wolf.x, 1.6, wolf.z); pxBar(wx - 12, wy - 4, 24, 2, wolf.hp / wolf.max, C.red, C.redD); }
    for (const p of pops) { const [x, y] = project(p.x, 1.6, p.z); text(g, p.v, x - textWidth(p.v) / 2, y - Math.round(p.t * 18), p.c); }
    if (talk >= 0) {
      const lines = quest >= 2 ? LINES_DONE : LINES, w = Math.min(W - 16, 300), ls = wrap(lines[talk], w - 16), h = 22 + ls.length * LINE;
      const x = Math.round((W - w) / 2), y = H - h - 10;
      pxPanel(x, y, w, h); text(g, 'ELDER MAREN', x + 8, y + 6, C.gold);
      ls.forEach((l, i) => text(g, l, x + 8, y + 17 + i * LINE, C.text));
      if (Math.sin(t * 6) > 0) text(g, '+', x + w - 12, y + h - 11, C.dim);
    }
    if (hero.dead) { const s = 'YOU HAVE FALLEN'; text(g, s, Math.round((W - textWidth(s)) / 2), Math.round(H * 0.3), C.red); }
    if (touchUI) {
      pxCircle(joy.on ? joy.x0 / view.s * view.dpr : 46, joy.on ? joy.y0 / view.s * view.dpr : H - 46, 26, 'rgba(201,162,74,.5)');
      if (joy.on) { g.fillStyle = 'rgba(217,208,192,.6)'; g.fillRect(Math.round(joy.x0 / view.s * view.dpr + joy.dx * 18) - 4, Math.round(joy.y0 / view.s * view.dpr + joy.dy * 18) - 4, 8, 8); }
    }
  } else {
    const u = view.dpr, s = (v) => v * u;
    aPanel(s(12), s(12), s(220), s(64)); aText('Arden', s(24), s(20), 15, '#e6c97a'); aText('Lv 12', s(176), s(22), 12, '#9a917f');
    const bar = (y, h, k, c, cd) => { g.fillStyle = cd; g.fillRect(s(24), s(y), s(196), s(h)); g.fillStyle = c; g.fillRect(s(24), s(y), s(196 * k), s(h)); };
    bar(44, 8, hero.hp / hero.max, '#9a3b2e', '#2a1214'); bar(58, 5, hero.en / 100, '#4a6496', '#141a2a');
    aPanel(s(12), s(84), s(220), s(48)); aText('QUEST', s(24), s(92), 11, '#e6c97a'); aText(qt + (qn ? `  ${qn}` : ''), s(24), s(110), 13, '#d9d0c0', 'Georgia');
    const [kx, ky] = project(keeper.x, 2.2, keeper.z);
    if (quest === 0 || quest === 2) aText('!', kx - s(4), ky - s(14) + Math.sin(t * 4) * s(2), 20, '#e6c97a');
    if (near && talk < 0) { aPanel(kx - s(46), ky - s(44), s(92), s(24)); aText('E · Talk', kx - s(32), ky - s(39), 12, '#d9d0c0'); }
    if (wolf.showHp > 0 && wolf.state !== 'dead') { const [wx, wy] = project(wolf.x, 1.6, wolf.z); g.fillStyle = '#2a1214'; g.fillRect(wx - s(24), wy, s(48), s(4)); g.fillStyle = '#9a3b2e'; g.fillRect(wx - s(24), wy, s(48 * wolf.hp / wolf.max), s(4)); }
    for (const p of pops) { const [x, y] = project(p.x, 1.6, p.z); aText(p.v, x - s(8), y - p.t * s(40), 18, p.c); }
    if (talk >= 0) {
      const lines = quest >= 2 ? LINES_DONE : LINES, w = Math.min(W - s(32), s(560)), x = (W - w) / 2, y = H - s(110);
      aPanel(x, y, w, s(90)); aText('Elder Maren', x + s(18), y + s(14), 14, '#e6c97a'); aText(lines[talk], x + s(18), y + s(42), 15, '#d9d0c0', 'Georgia');
    }
    if (hero.dead) aText('You have fallen', W / 2 - s(90), H * 0.3, 24, '#c2503c');
    if (touchUI) {
      g.strokeStyle = 'rgba(201,162,74,.6)'; g.lineWidth = s(2);
      g.beginPath(); g.arc(joy.on ? joy.x0 * u : s(80), joy.on ? joy.y0 * u : H - s(80), s(44), 0, Math.PI * 2); g.stroke();
    }
  }
}

// ---- input ---------------------------------------------------------------------------------
let touchUI = matchMedia('(pointer: coarse)').matches;
addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase(); keys.add(k);
  if (k === 'j' || k === ' ' || k === 'k') attack();
  if (k === '1' || k === '2' || k === '3') pressSkill(Number(k));
  if (k === 'escape') cancelAim();
  if (k === 'e' || k === 'enter') interact();
  if (k === 'm') setMode(S.mode === 'A' ? 'B' : 'A');
  if (k === 'c') setClass(hero.kind === 'mage' ? 'hero' : 'mage');
  if (k === 'n') { S.night = !S.night; applyLight(); refreshBar(); }
  if (k === 'p') { S.lock = !S.lock; refreshBar(); }
  if (k === '=' || k === '+') zoom(1); if (k === '-') zoom(-1);
});
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());
ui.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') mouse.on = false; });
// touch: left half = joystick, right = attack (or talk near the keeper); mouse click = attack
function uiPos(e) { const r = ui.getBoundingClientRect(); return [(e.clientX - r.left) * (ui.width / r.width), (e.clientY - r.top) * (ui.height / r.height)]; }
const turn = { id: null, x: 0, moved: false, tap: false };
ui.addEventListener('contextmenu', (e) => e.preventDefault());
ui.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse') {
    Object.assign(mouse, { cx: e.clientX, cy: e.clientY, on: true });
    if (e.button === 2) { if (aim.sk) cancelAim(); else Object.assign(turn, { id: e.pointerId, x: e.clientX, moved: false, tap: false }); }
    else if (e.button === 0) { if (aim.sk) confirmAim(); else attack(); }
    return;
  }
  touchUI = true; mouse.on = false;
  if (e.clientX < innerWidth * 0.45) { Object.assign(joy, { on: true, id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0 }); return; }
  const [x, y] = uiPos(e), b = touchLayout(ui.width, ui.height).find((o) => Math.hypot(x - o.x, y - o.y) < o.r * 1.25);
  if (b) {
    if (b.id === 'talk') interact();
    else if (SKILLS[hero.kind][b.id]?.aim && ready(SKILLS[hero.kind][b.id])) { aim.sk = SKILLS[hero.kind][b.id]; aim.i = b.id; aim.touch = { id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0 }; }
    else useSkill(b.id);
    return;
  }
  Object.assign(turn, { id: e.pointerId, x: e.clientX, moved: false, tap: true }); // tap = attack on release, drag = turn
});
ui.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'mouse') Object.assign(mouse, { cx: e.clientX, cy: e.clientY, on: true });
  if (aim.touch && e.pointerId === aim.touch.id) { aim.touch.dx = e.clientX - aim.touch.x0; aim.touch.dy = e.clientY - aim.touch.y0; return; }
  if (e.pointerId === turn.id) {
    const dx = e.clientX - turn.x;
    if (Math.abs(dx) > 10) turn.moved = true;
    if (turn.moved) { yawGoal -= dx * 0.008; turn.x = e.clientX; }
    return;
  }
  if (!joy.on || e.pointerId !== joy.id) return;
  const dx = e.clientX - joy.x0, dy = e.clientY - joy.y0, l = Math.hypot(dx, dy), m = 44;
  joy.dx = (dx / Math.max(l, 1)) * Math.min(1, l / m); joy.dy = (dy / Math.max(l, 1)) * Math.min(1, l / m);
});
for (const ev of ['pointerup', 'pointercancel']) ui.addEventListener(ev, (e) => {
  if (e.pointerId === joy.id) Object.assign(joy, { on: false, id: null, dx: 0, dy: 0 });
  if (e.pointerId === turn.id) { if (turn.tap && !turn.moved && ev === 'pointerup') attack(); turn.id = null; }
  if (aim.touch && e.pointerId === aim.touch.id) { if (ev === 'pointerup') confirmAim(); else cancelAim(); }
});

// ---- control bar (prototype only, not part of the look) -------------------------------------------
const bar = document.getElementById('bar');
function btn(id, label, fn) { const b = document.createElement('button'); b.id = id; b.textContent = label; b.onclick = (e) => { e.stopPropagation(); fn(); b.blur(); }; bar.append(b); return b; }
btn('mA', 'A · Matang', () => setMode('A'));
btn('mB', 'B · Pixel', () => setMode('B'));
btn('cls', '', () => setClass(hero.kind === 'mage' ? 'hero' : 'mage'));
btn('night', '', () => { S.night = !S.night; applyLight(); refreshBar(); });
btn('lock', '', () => { S.lock = !S.lock; refreshBar(); });
btn('zo', '−', () => zoom(-1)); btn('zi', '+', () => zoom(1));
const Q45 = Math.PI / 4, turn45 = (d) => { yawGoal = (Math.round(yawGoal / Q45) + d) * Q45; };
btn('tl', '⟲', () => turn45(1)); btn('tr', '⟳', () => turn45(-1));
function refreshBar() {
  document.getElementById('mA').classList.toggle('on', S.mode === 'A'); document.getElementById('mB').classList.toggle('on', S.mode === 'B');
  document.getElementById('night').textContent = S.night ? 'Malam' : 'Senja';
  document.getElementById('cls').textContent = hero.kind === 'mage' ? 'Kelas: Penyihir' : 'Kelas: Ksatria';
  const l = document.getElementById('lock'); l.textContent = `Kunci palet: ${S.lock ? 'on' : 'off'}`; l.style.display = S.mode === 'B' ? '' : 'none'; l.classList.toggle('on', S.lock);
}
function setMode(m) {
  if (S.mode === m) return;
  const ld = document.getElementById('loading'); ld.textContent = WORLDS[m] ? '' : 'Menyiapkan dunia gaya ' + m + '… (beberapa detik)'; ld.style.display = 'grid';
  requestAnimationFrame(() => setTimeout(() => {
    try { if (!WORLDS[m]) WORLDS[m] = buildWorld(m); S.mode = m; applyMode(); } catch (e) { showError(e.message); }
    ld.style.display = 'none';
  }, 20));
}
function setClass(k) {
  hero.kind = k; const m = hero.mB.material; m.map = ATL[k].map; m.emissiveMap = ATL[k].emap; m.needsUpdate = true;
  hero.act = null; setAnim(hero, 'idle'); refreshBar();
}
function zoom(d) { S.zoom = Math.max(-2, Math.min(3, S.zoom + d)); resize(); }
addEventListener('resize', resize);

// ---- loop ----------------------------------------------------------------------------------
const clock = new THREE.Clock(); let fpsT = 0, fpsN = 0;
function frame() {
  try { step(); } catch (e) { showError(e.message); }
  requestAnimationFrame(frame);
}
function step() {
  const dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime, B = S.mode === 'B';
  update(dt, t); updateAim(B); updateProjectiles(dt); updateFx(dt); updateParticles(dt, B); updateLights(dt, B);
  shakeT -= dt; flashT -= dt;
  // camera follows the hero (texel-snapped in B so the world never shimmers)
  if (keys.has('q')) yawGoal += dt * 1.8; if (keys.has('r')) yawGoal -= dt * 1.8;
  YAW += (yawGoal - YAW) * Math.min(1, dt * 10); axes();
  for (const [m, x, z, y] of BILLS[S.mode]) place(m, x, z, S.mode, y);
  const tx = Math.max(-6, Math.min(6, hero.x)), tz = Math.max(-6, Math.min(7, hero.z));
  const sk = shakeT > 0 ? (B ? (Math.random() < 0.5 ? -2 : 2) / PPM : (Math.random() - 0.5) * 0.12) : 0;
  const [cx0, cz0] = B ? snap(tx, tz) : [tx, tz], cx = cx0 + RX.x * sk, cz = cz0 + RX.z * sk, target = new THREE.Vector3(cx, 0, cz);
  cam.position.set(cx + Math.sin(YAW) * COS * view.dist, SIN * view.dist, cz + Math.cos(YAW) * COS * view.dist); cam.up.set(0, 1, 0); cam.lookAt(target);
  const off = sun.userData.off; sun.position.set(target.x + off[0], off[1], target.z + off[2]); sun.target.position.copy(target);
  // lights: torches flicker in steps (B) or smoothly (A)
  const step = (v) => (B ? Math.round(v * 8) / 8 : v);
  torchLights.forEach((l, i) => { l.intensity = step(1 + Math.sin(t * 9 + i * 2) * 0.08 + Math.sin(t * 23 + i) * 0.05) * 3.4 * LK * S.lightK; });
  winLights.forEach((l) => { l.intensity = 1.7 * LK * S.lightK; });
  lanternLight.intensity = 1.4 * LK * S.lightK; lanternLight.position.set(keeper.x + RX.x * keeper.f * 0.45, 0.9, keeper.z + RX.z * keeper.f * 0.45);
  heroLight.intensity = (S.night ? 0.55 : 0.2) * LK; heroLight.position.set(hero.x, 1.4, hero.z + 0.8);
  drawActors(t);
  for (const f of WORLDS[S.mode].flames) f.m.material.map = f.maps[Math.floor(t * 10 + f.ph) % 4];
  for (let i = 0; i < FF; i++) {
    const [x, z, p] = ffSeed[i];
    ffPos[i * 3] = x + Math.sin(t * 0.4 + p) * 1.2; ffPos[i * 3 + 1] = 0.6 + Math.sin(t * 0.7 + p * 2) * 0.4 + 0.4; ffPos[i * 3 + 2] = z + Math.cos(t * 0.3 + p) * 1.0;
  }
  ffGeo.attributes.position.needsUpdate = true; ffMat.opacity = S.night ? (0.6 + Math.sin(t * 3) * 0.3) : 0;
  if (B && S.lock) { renderer.setRenderTarget(rt); renderer.render(scene, cam); renderer.setRenderTarget(null); renderer.render(postScene, postCam); }
  else renderer.render(scene, cam);
  drawUI(t);
  fpsN++; fpsT += dt; if (fpsT > 1) { document.getElementById('fps').textContent = `${fpsN} fps · ${B ? `${view.lowW}×${view.lowH} ×${view.s}` : 'penuh'}`; fpsN = 0; fpsT = 0; }
}

addEventListener('error', (e) => showError(e.message));
addEventListener('unhandledrejection', (e) => showError(String(e.reason?.message || e.reason)));
function showError(m) { const d = document.getElementById('err'); d.style.display = 'block'; d.textContent += `Error: ${m}\n`; }

applyLight();
document.fonts?.load('600 16px Cinzel').catch(() => {});
setTimeout(() => { applyMode(); document.getElementById('loading').style.display = 'none'; frame(); }, 30);
