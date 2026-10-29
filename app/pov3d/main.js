// Three.js test: a small dungeon fight in real 3D with a third-person camera, toon
// shading (3-step light, coloured rim, ink outline by inverted hull), torch lights,
// bloom, particles. The hero is the CC0 "RobotExpressive" sample model from the
// three.js examples (only to test animation + speed — not the final art).
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/OutputPass.js';

const MODEL = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r170/examples/models/gltf/RobotExpressive/RobotExpressive.glb';
const $ = (id) => document.getElementById(id);
const TOUCH = matchMedia('(pointer:coarse)').matches || new URLSearchParams(location.search).has('touch');
if (TOUCH) $('stage').classList.add('touch');
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

// ——— renderer, scene, post ———
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.info.autoReset = false; // count every pass of the frame (bloom adds some)
$('stage').prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07050c);
scene.fog = new THREE.Fog(0x07050c, 16, 38);
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 80);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.75, 0.45, 0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());

const quality = { high: true };
function applyQuality() {
  const dpr = devicePixelRatio || 1;
  renderer.setPixelRatio(quality.high ? Math.min(dpr, 1.5) : Math.min(dpr, 1) * 0.75);
  renderer.shadowMap.enabled = quality.high;
  moon.castShadow = quality.high;
  torches.forEach((tc, i) => (tc.light.visible = quality.high || i % 2 === 0));
  scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
  resize();
  $('bQual').textContent = `KUALITAS: ${quality.high ? 'TINGGI' : 'RENDAH'}`;
  $('bQual').classList.toggle('on', quality.high);
}
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h); composer.setSize(w, h);
  composer.setPixelRatio(renderer.getPixelRatio());
  bloom.resolution.set(w / 2, h / 2);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize);

// ——— toon look: 3-step light + coloured rim + inverted-hull outline ———
const steps = new Uint8Array([70, 70, 70, 255, 150, 150, 150, 255, 255, 255, 255, 255]);
const gradientMap = new THREE.DataTexture(steps, 3, 1, THREE.RGBAFormat);
gradientMap.minFilter = gradientMap.magFilter = THREE.NearestFilter;
gradientMap.needsUpdate = true;
function toon(color, { rim = 0xff7a50, rimK = 0.8, emissive = 0x000000, map = null, flat = false } = {}) {
  const m = new THREE.MeshToonMaterial({ color, gradientMap, emissive, map });
  m.flatShading = flat;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.rimColor = { value: new THREE.Color(rim).multiplyScalar(rimK) };
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 rimColor;')
      .replace('#include <opaque_fragment>', 'float rimF = 1.0 - max(dot(normal, normalize(vViewPosition)), 0.0);\noutgoingLight += rimColor * smoothstep(0.55, 0.95, rimF);\n#include <opaque_fragment>');
  };
  return m;
}
function outlineMat(thickness) {
  const m = new THREE.MeshBasicMaterial({ color: 0x0b0710, side: THREE.BackSide });
  m.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `vec3 transformed = vec3(position) + normal * ${thickness.toFixed(4)};`); };
  return m;
}
function outline(mesh, thickness = 0.04) {
  const o = mesh.isSkinnedMesh ? new THREE.SkinnedMesh(mesh.geometry, outlineMat(thickness)) : new THREE.Mesh(mesh.geometry, outlineMat(thickness));
  if (mesh.isSkinnedMesh) { o.bind(mesh.skeleton, mesh.bindMatrix); o.position.copy(mesh.position); o.quaternion.copy(mesh.quaternion); o.scale.copy(mesh.scale); mesh.parent.add(o); }
  else mesh.add(o);
  o.castShadow = false;
  return o;
}

// ——— the room ———
const RW = 30, RD = 22;
const lights = new THREE.HemisphereLight(0x4a3a70, 0x120a10, 0.9);
scene.add(lights);
const moon = new THREE.DirectionalLight(0x9a8cff, 0.9);
moon.position.set(-8, 16, -6);
moon.shadow.mapSize.set(1024, 1024);
Object.assign(moon.shadow.camera, { left: -18, right: 18, top: 14, bottom: -14, near: 1, far: 40 });
moon.shadow.bias = -0.0015;
scene.add(moon);

const tileGeo = new THREE.BoxGeometry(1.94, 0.25, 1.94);
const floor = new THREE.InstancedMesh(tileGeo, toon(0xffffff, { rimK: 0 }), (RW / 2) * (RD / 2));
const dummy = new THREE.Object3D(), col = new THREE.Color();
let n = 0;
for (let i = 0; i < RW / 2; i++) for (let j = 0; j < RD / 2; j++) {
  dummy.position.set(-RW / 2 + 1 + i * 2, -0.125 + rand(-0.03, 0.03), -RD / 2 + 1 + j * 2);
  dummy.rotation.y = rand(-0.02, 0.02); dummy.updateMatrix();
  floor.setMatrixAt(n, dummy.matrix);
  floor.setColorAt(n, col.setHSL(0.72 + rand(-0.04, 0.04), 0.12, 0.17 + rand(-0.03, 0.04)));
  n++;
}
floor.receiveShadow = true;
scene.add(floor);

const wallMat = toon(0x3a3046, { rim: 0xffa060, rimK: 0.25 });
for (const [x, z, w, d] of [[0, -RD / 2 - 0.5, RW + 2, 1], [0, RD / 2 + 0.5, RW + 2, 1], [-RW / 2 - 0.5, 0, 1, RD], [RW / 2 + 0.5, 0, 1, RD]]) {
  const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 3.2, d), wallMat);
  wall.position.set(x, 1.6, z); wall.receiveShadow = true;
  scene.add(wall);
}
const pillars = [];
for (const [x, z] of [[-8, -5], [8, -5], [-8, 5], [8, 5], [0, -7], [0, 7]]) {
  const p = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.85, 3.4, 7), toon(0x4a3e56, { rim: 0xffa060, rimK: 0.5, flat: true }));
  p.position.set(x, 1.7, z); p.castShadow = p.receiveShadow = true;
  outline(p, 0.05);
  scene.add(p); pillars.push(p);
}
const torches = [];
for (const [x, z, ry] of [[-10, -RD / 2, 0], [0, -RD / 2, 0], [10, -RD / 2, 0], [-RW / 2, 0, Math.PI / 2], [RW / 2, 0, -Math.PI / 2], [0, RD / 2, Math.PI]]) {
  const g = new THREE.Group();
  g.position.set(x, 2, z); g.rotation.y = ry;
  const stick = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.6, 0.15), toon(0x3a2a22));
  stick.position.set(0, 0, 0.3); stick.rotation.x = 0.4; g.add(stick);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.45, 6), new THREE.MeshBasicMaterial({ color: 0xffb347 }));
  flame.position.set(0, 0.42, 0.42); g.add(flame);
  const light = new THREE.PointLight(0xff8a3a, 22, 11, 1.7);
  light.position.set(0, 0.5, 0.9); g.add(light);
  scene.add(g);
  torches.push({ flame, light, ph: rand(0, 10) });
}

// ——— particles (one pool, additive points) ———
const PN = 400, ppos = new Float32Array(PN * 3), pcol = new Float32Array(PN * 3), parts = [];
const pgeo = new THREE.BufferGeometry();
pgeo.setAttribute('position', new THREE.BufferAttribute(ppos, 3));
pgeo.setAttribute('color', new THREE.BufferAttribute(pcol, 3));
const points = new THREE.Points(pgeo, new THREE.PointsMaterial({ size: 0.18, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
points.frustumCulled = false;
scene.add(points);
for (let i = 0; i < PN; i++) parts.push({ life: 0 });
function burst(p, color, count = 20, speed = 5) {
  const c = new THREE.Color(color);
  for (let k = 0; k < count; k++) {
    const q = parts.find((x) => x.life <= 0);
    if (!q) return;
    const a = Math.random() * Math.PI * 2, s = rand(0.3, 1) * speed;
    Object.assign(q, { x: p.x, y: p.y + 0.5, z: p.z, vx: Math.cos(a) * s, vy: rand(1, 5), vz: Math.sin(a) * s, life: rand(0.4, 0.9), c });
  }
}

// ——— effects: slash arc, shockwave ring ———
const fx = [];
function slash(pos, yaw) {
  const m = new THREE.Mesh(new THREE.RingGeometry(1.1, 2.3, 24, 1, -0.9, 1.8), new THREE.MeshBasicMaterial({ color: 0xffd6a0, transparent: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.rotation.set(-Math.PI / 2, 0, -yaw + Math.PI / 2);
  m.position.set(pos.x, 1.0, pos.z);
  scene.add(m); fx.push({ m, life: 0.18, max: 0.18, grow: 0.3 });
}
function shockwave(pos) {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.2, 40), new THREE.MeshBasicMaterial({ color: 0x7fe8ff, transparent: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(pos.x, 0.08, pos.z);
  scene.add(m); fx.push({ m, life: 0.5, max: 0.5, grow: 5 });
}

// ——— hero ———
const hero = { obj: new THREE.Group(), yaw: 0, hp: 100, hurt: 0, cd: 0, skillCd: 0, atkT: 0, mixer: null, acts: {}, cur: null };
scene.add(hero.obj);
function play(name, fade = 0.15) {
  const a = hero.acts[name];
  if (!a || hero.cur === a) return;
  a.reset().fadeIn(fade).play();
  if (hero.cur) hero.cur.fadeOut(fade);
  hero.cur = a;
}
function fallbackHero() {
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.8, 4, 8), toon(0x8a2a2a, { flat: true }));
  body.position.y = 0.9; body.castShadow = true; outline(body, 0.04);
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 1), toon(0xd8a080, { flat: true }));
  head.position.y = 1.65; head.castShadow = true; outline(head, 0.03);
  hero.obj.add(body, head);
}
const loader = new GLTFLoader();
loader.load(MODEL, (gltf) => {
  const m = gltf.scene;
  const box = new THREE.Box3().setFromObject(m), h = box.max.y - box.min.y, k = 1.8 / h;
  m.scale.setScalar(k);
  m.traverse((o) => {
    if (!o.isMesh) return;
    const src = o.material;
    o.material = toon(src.color ? src.color.getHex() : 0xaaaaaa, { map: src.map || null, rim: 0xff8a50 });
    o.castShadow = true;
  });
  // (no inverted-hull outline on the skinned robot: its bones are scaled, the hull tears apart)
  hero.obj.add(m);
  hero.mixer = new THREE.AnimationMixer(m);
  for (const clip of gltf.animations) hero.acts[clip.name] = hero.mixer.clipAction(clip);
  for (const n of ['Punch', 'Jump']) { const a = hero.acts[n]; if (a) { a.setLoop(THREE.LoopOnce); a.clampWhenFinished = false; } }
  play('Idle', 0);
  $('loading').remove();
}, undefined, () => { fallbackHero(); $('loading').remove(); });

// ——— monsters ———
const enemies = [];
const slimeGeo = new THREE.IcosahedronGeometry(0.6, 1), eyeGeo = new THREE.SphereGeometry(0.08, 6, 4);
const eyeMat = new THREE.MeshBasicMaterial({ color: 0xc8ff6a });
function spawn(kind) {
  let x, z;
  do { x = rand(-RW / 2 + 2, RW / 2 - 2); z = rand(-RD / 2 + 2, RD / 2 - 2); } while (Math.hypot(x - hero.obj.position.x, z - hero.obj.position.z) < 8);
  const g = new THREE.Group();
  const mat = toon(kind === 'bat' ? 0x3a2440 : 0x6a2c88, { rim: kind === 'bat' ? 0xc080ff : 0x9dff6a, flat: true });
  const body = new THREE.Mesh(kind === 'bat' ? new THREE.OctahedronGeometry(0.42, 0) : slimeGeo, mat);
  body.castShadow = true; outline(body, 0.05);
  if (kind === 'slime') body.scale.set(1, 0.72, 1);
  g.add(body);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(eyeGeo, eyeMat); e.position.set(s * 0.2, kind === 'bat' ? 0.1 : 0.15, 0.5); body.add(e); }
  if (kind === 'bat') for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 3), toon(0x4a1e2e, { rim: 0xc080ff, flat: true }));
    w.rotation.z = s * Math.PI / 2; w.position.set(s * 0.8, 0, 0); outline(w, 0.04); body.add(w);
  }
  g.position.set(x, kind === 'bat' ? 1.6 : 0.45, z);
  scene.add(g);
  enemies.push({ g, body, mat, kind, hp: kind === 'bat' ? 20 : 35, flash: 0, t: rand(0, 5), speed: kind === 'bat' ? 3.4 : 2 });
}
for (let i = 0; i < 12; i++) spawn(i % 3 ? 'slime' : 'bat');

// ——— input ———
const keys = new Set(), mouse = { down: false };
const cam = { yaw: Math.PI, goal: Math.PI, mode: 'behind' };
addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (e.code === 'Space') { e.preventDefault(); skill(); }
  if (e.code === 'KeyC') toggleCam();
  if (e.code === 'KeyQ') { quality.high = !quality.high; applyQuality(); }
});
addEventListener('keyup', (e) => keys.delete(e.code));
const locked = () => document.pointerLockElement === renderer.domElement;
renderer.domElement.addEventListener('mousedown', (e) => { if (e.button === 0) mouse.down = true; if (!locked() && !TOUCH) renderer.domElement.requestPointerLock?.(); });
addEventListener('mouseup', () => (mouse.down = false));
addEventListener('mousemove', (e) => { if (locked() && cam.mode === 'behind') cam.goal -= e.movementX * 0.004; });
function toggleCam() { cam.mode = cam.mode === 'behind' ? 'tilt' : 'behind'; $('bCam').textContent = `KAMERA: ${cam.mode === 'behind' ? 'BELAKANG' : 'MIRING'}`; }
$('bCam').onclick = toggleCam;
$('bQual').onclick = () => { quality.high = !quality.high; applyQuality(); };
$('bFull').onclick = () => (document.fullscreenElement ? document.exitFullscreen() : $('stage').requestFullscreen?.().then(() => screen.orientation?.lock?.('landscape').catch(() => {})).catch(() => {}));
$('skill').addEventListener('touchstart', (e) => { e.preventDefault(); skill(); }, { passive: false });

// touch: left = floating joystick, right stick = attack + turn
const joy = { id: null, ox: 0, oy: 0, x: 0, y: 0 }, rs = { id: null, x: 0, y: 0 };
const joyEl = document.createElement('div');
joyEl.style.cssText = 'position:fixed;width:110px;height:110px;margin:-55px 0 0 -55px;border-radius:50%;border:2px solid rgba(255,255,255,.25);background:rgba(255,255,255,.06);display:none;pointer-events:none';
$('stage').append(joyEl);
renderer.domElement.addEventListener('touchstart', (e) => {
  e.preventDefault();
  for (const t of e.changedTouches) if (t.clientX < innerWidth * 0.45 && joy.id == null) Object.assign(joy, { id: t.identifier, ox: t.clientX, oy: t.clientY, x: t.clientX, y: t.clientY });
  joyEl.style.display = joy.id != null ? 'block' : 'none'; joyEl.style.left = `${joy.ox}px`; joyEl.style.top = `${joy.oy}px`;
}, { passive: false });
renderer.domElement.addEventListener('touchmove', (e) => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === joy.id) { joy.x = t.clientX; joy.y = t.clientY; } }, { passive: false });
const jend = (e) => { for (const t of e.changedTouches) if (t.identifier === joy.id) { joy.id = null; joyEl.style.display = 'none'; } };
renderer.domElement.addEventListener('touchend', jend); renderer.domElement.addEventListener('touchcancel', jend);
const stickEl = $('rstick'), knob = $('knob');
function stickMove(t) {
  const r = stickEl.getBoundingClientRect(), R = r.width / 2;
  let x = (t.clientX - r.left - R) / (R * 0.8), y = (t.clientY - r.top - R) / (R * 0.8), m = Math.hypot(x, y);
  if (m > 1) { x /= m; y /= m; }
  rs.x = x; rs.y = y; knob.style.transform = `translate(${x * R * 0.8}px,${y * R * 0.8}px)`;
}
stickEl.addEventListener('touchstart', (e) => { e.preventDefault(); const t = e.changedTouches[0]; rs.id = t.identifier; stickMove(t); }, { passive: false });
stickEl.addEventListener('touchmove', (e) => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === rs.id) stickMove(t); }, { passive: false });
const send = (e) => { for (const t of e.changedTouches) if (t.identifier === rs.id) { rs.id = null; rs.x = rs.y = 0; knob.style.transform = ''; } };
stickEl.addEventListener('touchend', send); stickEl.addEventListener('touchcancel', send);

// ——— combat ———
let kills = 0, shake = 0;
function hurtEnemy(e, dmg, from) {
  e.hp -= dmg; e.flash = 0.12;
  const d = e.g.position.clone().sub(from).setY(0).normalize().multiplyScalar(0.8);
  e.g.position.add(d);
  burst(e.g.position, e.kind === 'bat' ? 0xc080ff : 0xb8ff6a, 8, 3);
  if (e.hp <= 0) {
    burst(e.g.position, 0xffd27a, 26, 6);
    scene.remove(e.g); enemies.splice(enemies.indexOf(e), 1); kills++;
    setTimeout(() => spawn(Math.random() < 0.35 ? 'bat' : 'slime'), 1500);
  }
}
function attack(dir) {
  if (hero.cd > 0) return;
  hero.cd = 0.45; hero.atkT = 0.35; hero.yaw = dir;
  if (hero.acts.Punch) { hero.acts.Punch.reset().play(); hero.acts.Punch.setEffectiveWeight(1); }
  setTimeout(() => {
    const p = hero.obj.position;
    slash(p, dir);
    for (const e of [...enemies]) {
      const dx = e.g.position.x - p.x, dz = e.g.position.z - p.z, dist = Math.hypot(dx, dz);
      if (dist < 2.6 && Math.abs(angDiff(Math.atan2(dx, dz), dir)) < 1.1) hurtEnemy(e, 14, p);
    }
  }, 110);
}
function skill() {
  if (hero.skillCd > 0) return;
  hero.skillCd = 2.5;
  if (hero.acts.Jump) hero.acts.Jump.reset().play();
  setTimeout(() => {
    const p = hero.obj.position;
    shockwave(p); burst(p, 0x7fe8ff, 60, 9); shake = 0.35;
    for (const e of [...enemies]) if (e.g.position.distanceTo(p) < 5.5) hurtEnemy(e, 22, p);
  }, 380);
}
function nearestIn(dir, cone, range) {
  let best = null, bd = Infinity;
  const p = hero.obj.position;
  for (const e of enemies) {
    const dx = e.g.position.x - p.x, dz = e.g.position.z - p.z, d = Math.hypot(dx, dz);
    if (d > range || Math.abs(angDiff(Math.atan2(dx, dz), dir)) > cone) continue;
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

// ——— loop ———
const clock = new THREE.Clock();
let fps = 60, acc = 0, frames = 0, slow = 0;
const tmp = new THREE.Vector3();
function frame() {
  const dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime;
  acc += dt; frames++;
  if (acc > 0.5) {
    fps = Math.round(frames / acc); acc = 0; frames = 0;
    slow = fps < 40 ? slow + 1 : 0;
    if (slow >= 6 && quality.high) { quality.high = false; applyQuality(); slow = 0; }
  }

  // movement relative to the camera
  let mx = 0, mz = 0;
  if (keys.has('KeyW')) mz += 1; if (keys.has('KeyS')) mz -= 1;
  if (keys.has('KeyA')) mx -= 1; if (keys.has('KeyD')) mx += 1;
  if (joy.id != null) { const jx = (joy.x - joy.ox) / 55, jy = (joy.y - joy.oy) / 55, m = Math.hypot(jx, jy); if (m > 0.18) { const k = Math.min(1, (m - 0.18) / 0.7) / m; mx += jx * k; mz -= jy * k; } }
  const len = Math.hypot(mx, mz); if (len > 1) { mx /= len; mz /= len; }
  if (cam.mode === 'tilt') cam.goal = Math.PI;
  if (rs.id != null && cam.mode === 'behind' && Math.abs(rs.x) > 0.2) cam.goal -= Math.sign(rs.x) * (Math.abs(rs.x) - 0.2) * 2.6 * dt;
  cam.yaw += angDiff(cam.goal, cam.yaw) * Math.min(1, dt * 12);
  const fwd = cam.yaw + Math.PI; // the direction the camera looks
  // camera forward = (−sin yaw, −cos yaw), screen right = (cos yaw, −sin yaw)
  const vx = -Math.sin(cam.yaw) * mz + Math.cos(cam.yaw) * mx, vz = -Math.cos(cam.yaw) * mz - Math.sin(cam.yaw) * mx;
  const p = hero.obj.position, moving = Math.hypot(vx, vz) > 0.1;
  p.x = clamp(p.x + vx * 6 * dt, -RW / 2 + 0.6, RW / 2 - 0.6); p.z = clamp(p.z + vz * 6 * dt, -RD / 2 + 0.6, RD / 2 - 0.6);
  for (const pl of pillars) { const dx = p.x - pl.position.x, dz = p.z - pl.position.z, d = Math.hypot(dx, dz); if (d < 1.3) { p.x = pl.position.x + dx / d * 1.3; p.z = pl.position.z + dz / d * 1.3; } }

  // attack: mouse / right stick, aim assist towards the camera's forward
  hero.cd -= dt; hero.skillCd -= dt; hero.atkT -= dt; hero.hurt -= dt;
  const wantAtk = mouse.down || (rs.id != null && Math.hypot(rs.x, rs.y) > 0.25);
  let aim = fwd;
  if (rs.id != null && Math.hypot(rs.x, rs.y) > 0.25) aim = fwd - Math.atan2(rs.x, -rs.y);
  const tg = nearestIn(aim, 0.7, 7);
  if (tg) aim = Math.atan2(tg.g.position.x - p.x, tg.g.position.z - p.z);
  if (wantAtk) attack(aim);
  if (hero.atkT <= 0 && moving) hero.yaw = Math.atan2(vx, vz);
  hero.obj.rotation.y += angDiff(hero.yaw, hero.obj.rotation.y) * Math.min(1, dt * 14);
  if (hero.mixer) { play(moving ? 'Running' : 'Idle'); hero.mixer.update(dt); }

  // enemies chase, bob, flash
  for (const e of enemies) {
    e.t += dt; e.flash -= dt;
    tmp.copy(p).sub(e.g.position).setY(0);
    const d = tmp.length();
    if (d > 1.1) e.g.position.addScaledVector(tmp.normalize(), e.speed * dt);
    else if (hero.hurt <= 0) { hero.hp -= 6; hero.hurt = 0.6; burst(p, 0xff4a5a, 10, 3); }
    e.g.rotation.y = Math.atan2(p.x - e.g.position.x, p.z - e.g.position.z);
    if (e.kind === 'slime') { const s = 1 + Math.sin(e.t * 6) * 0.08; e.body.scale.set(s, 0.72 / s, s); }
    else e.g.position.y = 1.6 + Math.sin(e.t * 5) * 0.2;
    e.mat.emissive.setScalar(e.flash > 0 ? 0.8 : 0);
  }
  if (hero.hp <= 0) hero.hp = 100;
  hero.hp = Math.min(100, hero.hp + dt * 3);

  // torches flicker
  for (const tc of torches) { const f = 1 + Math.sin(t * 11 + tc.ph) * 0.08 + Math.sin(t * 23 + tc.ph) * 0.05; tc.light.intensity = 22 * f; tc.flame.scale.setScalar(f); }
  // particles
  for (let i = 0; i < PN; i++) {
    const q = parts[i];
    if (q.life > 0) {
      q.life -= dt; q.vy -= 9 * dt; q.x += q.vx * dt; q.y = Math.max(0.05, q.y + q.vy * dt); q.z += q.vz * dt;
      ppos.set([q.x, q.y, q.z], i * 3); const k = Math.max(0, q.life) * 1.6; pcol.set([q.c.r * k, q.c.g * k, q.c.b * k], i * 3);
    } else { ppos.set([0, -50, 0], i * 3); }
  }
  pgeo.attributes.position.needsUpdate = true; pgeo.attributes.color.needsUpdate = true;
  for (let i = fx.length - 1; i >= 0; i--) {
    const f = fx[i]; f.life -= dt;
    const k = 1 - f.life / f.max;
    f.m.material.opacity = Math.max(0, f.life / f.max);
    f.m.scale.setScalar(1 + k * f.grow);
    if (f.life <= 0) { scene.remove(f.m); f.m.geometry.dispose(); f.m.material.dispose(); fx.splice(i, 1); }
  }

  // camera: behind & above the hero (or high and tilted, north fixed)
  const behind = cam.mode === 'behind';
  const dist = behind ? 5.2 : 11, height = behind ? 2.6 : 10;
  shake = Math.max(0, shake - dt);
  camera.position.set(p.x + Math.sin(cam.yaw) * dist + rand(-1, 1) * shake * 0.4, height + rand(-1, 1) * shake * 0.4, p.z + Math.cos(cam.yaw) * dist);
  camera.lookAt(p.x - Math.sin(cam.yaw) * (behind ? 2 : 0.5), behind ? 1.4 : 0.5, p.z - Math.cos(cam.yaw) * (behind ? 2 : 0.5));
  moon.target.position.copy(p); moon.position.set(p.x - 8, 16, p.z - 6); moon.target.updateMatrixWorld();

  renderer.info.reset();
  if (quality.high) composer.render(); else renderer.render(scene, camera);
  const info = renderer.info.render;
  $('hud').innerHTML = `<b>${fps} FPS</b> · ${quality.high ? 'tinggi' : 'rendah'} · resolusi ${renderer.getPixelRatio().toFixed(2)}×<br>draw call ${info.calls} · ${Math.round(info.triangles / 1000)}k segitiga · kill ${kills}<div id="hp"><i style="width:${hero.hp}%"></i></div>`;
  requestAnimationFrame(frame);
}
applyQuality();
requestAnimationFrame(frame);
