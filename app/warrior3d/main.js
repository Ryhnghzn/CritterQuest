// Warrior in 3D built entirely from code (no model files): a jointed body of simple
// shapes (boxes, cylinders, lathes, extrusions, tubes), toon shading with a coloured
// rim and ink outlines, procedural animation, and the full Mitos set — horned crowned
// great helm with a burning visor, layered spiked pauldrons, a plate with a core gem
// and molten cracks, a waving cape, a rune sword and a spiked kite shield.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/OutputPass.js';

const $ = (id) => document.getElementById(id);
const V = (x, y) => new THREE.Vector2(x, y);
const smooth = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
const lerp = (a, b, k) => a + (b - a) * k;

// ——— renderer ———
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$('stage').append(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07050c);
scene.fog = new THREE.Fog(0x07050c, 7, 16);
const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 50);
camera.position.set(2.6, 1.9, 3.6);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.05, 0);
controls.enableDamping = true; controls.minDistance = 1.6; controls.maxDistance = 8; controls.maxPolarAngle = 1.5;
controls.autoRotate = true; controls.autoRotateSpeed = 0.8;
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.85, 0.5, 0.78);
composer.addPass(bloom);
composer.addPass(new OutputPass());
function resize() {
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
  composer.setPixelRatio(renderer.getPixelRatio());
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// ——— toon materials + outlines ———
const steps = new Uint8Array([60, 60, 60, 255, 145, 145, 145, 255, 255, 255, 255, 255]);
const gradientMap = new THREE.DataTexture(steps, 3, 1, THREE.RGBAFormat);
gradientMap.minFilter = gradientMap.magFilter = THREE.NearestFilter; gradientMap.needsUpdate = true;
const MATS = {};
function toon(name, color, { rim = 0xff6a3c, rimK = 0.9, emissive = 0x000000, ei = 1, side = THREE.FrontSide } = {}) {
  if (MATS[name]) return MATS[name];
  const m = new THREE.MeshToonMaterial({ color, gradientMap, emissive, emissiveIntensity: ei, side });
  m.flatShading = true;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.rimColor = { value: new THREE.Color(rim).multiplyScalar(rimK) };
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 rimColor;')
      .replace('#include <opaque_fragment>', 'float rimF = 1.0 - max(dot(normal, normalize(vViewPosition)), 0.0);\noutgoingLight += rimColor * smoothstep(0.55, 0.95, rimF);\n#include <opaque_fragment>');
  };
  return (MATS[name] = m);
}
const glowMat = (c, k = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k) });
const INK = new THREE.MeshBasicMaterial({ color: 0x0b0710, side: THREE.BackSide });
function mesh(geo, mat, { outline = 0.012, shadow = true } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = shadow;
  if (outline) { // inverted hull: a slightly bigger black back-face copy
    geo.computeBoundingSphere();
    const r = geo.boundingSphere.radius || 0.1;
    const o = new THREE.Mesh(geo, INK);
    o.scale.setScalar(1 + outline / r);
    m.add(o);
  }
  return m;
}
const at = (obj, x, y, z, rx = 0, ry = 0, rz = 0) => { obj.position.set(x, y, z); obj.rotation.set(rx, ry, rz); return obj; };
const group = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
function extrude(points, depth, bevel = 0.008) {
  const s = new THREE.Shape(points.map(([x, y]) => V(x, y)));
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1 });
  g.translate(0, 0, -depth / 2);
  return g;
}
function tube(points, r, seg = 12) {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z))), seg, r, 5);
}
function cone(r, h, seg = 5) { const g = new THREE.ConeGeometry(r, h, seg); g.translate(0, h / 2, 0); return g; }

// palette
const C = {
  skin: toon('skin', 0xb77656), hair: toon('hair', 0x2a1b1b), cloth: toon('cloth', 0x6a121c, { side: THREE.DoubleSide }),
  leather: toon('leather', 0x3a2820), pants: toon('pants', 0x2a2430),
  steel: toon('steel', 0x7c8090, { rim: 0xffb08a }), dark: toon('dark', 0x3a3446, { rim: 0xff6a6a }),
  gold: toon('gold', 0xc8902a, { rim: 0xfff0b0 }), wood: toon('wood', 0x6a4a30),
  ember: glowMat(0xff3a2a, 2.2), visor: glowMat(0xff4d6d, 3), gem: toon('gem', 0xff2a50, { emissive: 0xff1040, ei: 1.6, rim: 0xffffff }),
};

// ——— the body: a jointed rig (rigid parts on pivots) ———
const hero = new THREE.Group();
scene.add(hero);
const J = {};
function buildBody() {
  J.hips = group(hero, 0, 0.98, 0);
  J.spine = group(J.hips, 0, 0.05, 0);
  J.chest = group(J.spine, 0, 0.3, 0);
  J.neck = group(J.chest, 0, 0.36, 0.01);
  J.head = group(J.neck, 0, 0.1, 0);
  for (const s of [-1, 1]) {
    const side = s < 0 ? 'L' : 'R';
    J['sh' + side] = group(J.chest, s * 0.27, 0.28, 0);
    J['el' + side] = group(J['sh' + side], 0, -0.31, 0);
    J['hand' + side] = group(J['el' + side], 0, -0.28, 0);
    J['hip' + side] = group(J.hips, s * 0.12, -0.02, 0);
    J['knee' + side] = group(J['hip' + side], 0, -0.44, 0);
    J['foot' + side] = group(J['knee' + side], 0, -0.44, 0);
  }
}
buildBody();

const GEAR = { plain: new THREE.Group(), mythic: new THREE.Group() };
// every piece is attached to a joint and tagged with its set so the sets can be swapped
function put(set, joint, obj) { obj.userData.set = set; J[joint].add(obj); return obj; }

function buildBase() { // what is always there: body, pants, boots, hands, cape
  for (const s of [-1, 1]) {
    const side = s < 0 ? 'L' : 'R';
    put('base', 'hip' + side, at(mesh(new THREE.CylinderGeometry(0.085, 0.07, 0.44, 6), C.pants), 0, -0.22, 0));
    put('base', 'knee' + side, at(mesh(new THREE.CylinderGeometry(0.068, 0.052, 0.42, 6), C.pants), 0, -0.21, 0));
    put('base', 'foot' + side, at(mesh(new THREE.BoxGeometry(0.11, 0.07, 0.24), C.leather), 0, -0.01, 0.04));
    put('base', 'sh' + side, at(mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.3, 6), C.skin), 0, -0.15, 0));
    put('base', 'el' + side, at(mesh(new THREE.CylinderGeometry(0.058, 0.048, 0.27, 6), C.skin), 0, -0.13, 0));
    put('base', 'hand' + side, at(mesh(new THREE.BoxGeometry(0.08, 0.09, 0.08), C.skin), 0, -0.03, 0));
  }
  // torso: broad chest tapering to the waist
  put('base', 'spine', at(mesh(new THREE.CylinderGeometry(0.19, 0.15, 0.36, 6), C.cloth), 0, 0.15, 0));
  put('base', 'chest', at(mesh(new THREE.CylinderGeometry(0.26, 0.2, 0.36, 6), C.cloth), 0, 0.15, 0));
  put('base', 'neck', at(mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.1, 6), C.skin), 0, 0.02, 0));
  // belt + tabard
  put('base', 'hips', at(mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.07, 6), C.leather), 0, 0.03, 0));
  put('base', 'hips', at(mesh(new THREE.BoxGeometry(0.18, 0.42, 0.02), C.cloth), 0, -0.2, 0.17));
  // cape: a segmented plane waved every frame
  const capeGeo = new THREE.PlaneGeometry(0.62, 1.15, 6, 10);
  capeGeo.translate(0, -0.575, 0);
  J.cape = new THREE.Mesh(capeGeo, C.cloth); J.cape.castShadow = true;
  J.cape.userData.rest = capeGeo.attributes.position.array.slice();
  put('base', 'chest', at(J.cape, 0, 0.3, -0.2, 0.08, 0, 0));
  const trim = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.025, 0.012), C.gold);
  J.capeTrim = trim; J.cape.add(trim);
}

function buildPlain() {
  // bare head: angular face, ears, spiky hair, a determined brow
  const face = extrude([[-0.09, -0.12], [0.09, -0.12], [0.11, 0.0], [0.1, 0.12], [-0.1, 0.12], [-0.11, 0.0]], 0.2, 0.01);
  put('plain', 'head', at(mesh(face, C.skin), 0, 0.12, 0));
  put('plain', 'head', at(mesh(new THREE.BoxGeometry(0.06, 0.05, 0.05), C.skin, { outline: 0.006 }), 0, 0.07, 0.11, 0.3)); // nose
  for (const s of [-1, 1]) put('plain', 'head', at(mesh(new THREE.BoxGeometry(0.05, 0.012, 0.01), toon('ink', 0x0b0710), { outline: 0 }), s * 0.045, 0.16, 0.112, 0, 0, s * 0.25));
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    put('plain', 'head', at(mesh(cone(0.05, 0.16, 4), C.hair, { outline: 0.006 }), Math.sin(a) * 0.07, 0.22, Math.cos(a) * 0.06 - 0.03, -0.9 + Math.cos(a) * 0.3, 0, Math.sin(a) * 0.6));
  }
  // short sword and round wooden shield
  const blade = extrude([[-0.025, 0], [0.025, 0], [0.02, 0.62], [0, 0.68], [-0.02, 0.62]], 0.008, 0.004);
  const sword = new THREE.Group();
  sword.add(mesh(blade, C.steel, { outline: 0.005 }));
  sword.add(at(mesh(new THREE.BoxGeometry(0.16, 0.025, 0.04), C.steel, { outline: 0.005 }), 0, 0, 0));
  sword.add(at(mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.13, 5), C.leather, { outline: 0.004 }), 0, -0.07, 0));
  J.swordPlain = put('plain', 'handR', at(sword, 0, -0.04, 0.02, Math.PI / 2, 0, 0));
  const shield = new THREE.Group();
  shield.add(mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.04, 12), C.wood));
  shield.add(at(mesh(new THREE.TorusGeometry(0.26, 0.018, 4, 12), C.steel, { outline: 0 }), 0, 0, 0, Math.PI / 2));
  shield.add(at(mesh(new THREE.SphereGeometry(0.06, 6, 4), C.steel, { outline: 0.004 }), 0, 0.03, 0));
  J.shieldPlain = put('plain', 'handL', at(shield, 0.02, -0.04, 0.1, Math.PI / 2, 0, 0));
}

function buildMythic() {
  // great helm with a burning T-visor, a crown of golden spikes and two black horns
  const prof = [V(0, 0.27), V(0.08, 0.26), V(0.13, 0.22), V(0.145, 0.12), V(0.15, 0.0), V(0.14, -0.04), V(0, -0.04)];
  const helm = new THREE.LatheGeometry(prof, 8);
  put('mythic', 'head', at(mesh(helm, C.dark, { outline: 0.012 }), 0, 0.02, 0));
  put('mythic', 'head', at(mesh(new THREE.BoxGeometry(0.2, 0.018, 0.02), C.visor, { outline: 0, shadow: false }), 0, 0.15, 0.142));
  put('mythic', 'head', at(mesh(new THREE.BoxGeometry(0.022, 0.09, 0.02), C.visor, { outline: 0, shadow: false }), 0, 0.105, 0.142));
  put('mythic', 'head', at(mesh(new THREE.TorusGeometry(0.15, 0.014, 4, 8), C.gold, { outline: 0 }), 0, 0.2, 0, Math.PI / 2));
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2, h = i % 2 ? 0.1 : 0.16;
    put('mythic', 'head', at(mesh(cone(0.026, h, 4), C.gold, { outline: 0.005 }), Math.sin(a) * 0.12, 0.21, Math.cos(a) * 0.12, Math.cos(a) * 0.2, 0, -Math.sin(a) * 0.2));
  }
  for (const s of [-1, 1]) {
    put('mythic', 'head', mesh(tube([[s * 0.13, 0.17, 0], [s * 0.25, 0.22, -0.03], [s * 0.3, 0.36, -0.06], [s * 0.24, 0.48, -0.02]], 0.026, 10), C.dark, { outline: 0.008 }));
    put('mythic', 'head', at(mesh(cone(0.026, 0.09, 4), C.gold, { outline: 0.004 }), s * 0.24, 0.47, -0.02, 0, 0, s * 0.5));
  }
  // chest plate (angular), molten cracks, core gem
  put('mythic', 'chest', at(mesh(new THREE.CylinderGeometry(0.29, 0.22, 0.4, 6), C.steel, { outline: 0.014 }), 0, 0.15, 0.01));
  put('mythic', 'chest', at(mesh(new THREE.OctahedronGeometry(0.055, 0), C.gem, { outline: 0.006 }), 0, 0.17, 0.27));
  for (const [x, y, r, l] of [[-0.12, 0.25, 0.5, 0.12], [-0.16, 0.1, -0.4, 0.1], [0.13, 0.22, -0.6, 0.11], [0.06, 0.05, 0.3, 0.09]]) {
    put('mythic', 'chest', at(mesh(new THREE.BoxGeometry(l, 0.008, 0.01), C.ember, { outline: 0, shadow: false }), x, y, 0.255, 0, 0, r));
  }
  put('mythic', 'chest', at(mesh(new THREE.TorusGeometry(0.25, 0.012, 4, 6), C.gold, { outline: 0 }), 0, 0.33, 0, Math.PI / 2, 0, 0));
  put('mythic', 'spine', at(mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.3, 6), C.dark, { outline: 0.01 }), 0, 0.15, 0));
  // faulds: three plates hanging from the belt
  for (let i = 0; i < 3; i++) put('mythic', 'hips', at(mesh(new THREE.CylinderGeometry(0.23 - i * 0.01, 0.25 - i * 0.01, 0.08, 6, 1, true), C.steel, { outline: 0.006 }), 0, -0.05 - i * 0.07, 0));
  // layered spiked pauldrons with a gem
  for (const s of [-1, 1]) {
    const side = s < 0 ? 'L' : 'R';
    for (let i = 0; i < 3; i++) {
      const p = mesh(new THREE.SphereGeometry(0.17 - i * 0.025, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), i === 0 ? C.dark : C.steel, { outline: 0.008 });
      put('mythic', 'sh' + side, at(p, s * 0.02, 0.03 - i * 0.06, 0, 0, 0, s * (0.35 + i * 0.12)));
    }
    for (const [dx, h] of [[-0.05, 0.2], [0.05, 0.15]]) put('mythic', 'sh' + side, at(mesh(cone(0.03, h, 4), C.gold, { outline: 0.005 }), s * 0.05 + dx, 0.12, 0, 0, 0, s * -0.4));
    put('mythic', 'sh' + side, at(mesh(new THREE.OctahedronGeometry(0.03, 0), C.gem, { outline: 0.004 }), s * 0.12, 0.04, 0.09));
    // gauntlets + greaves + knee spikes + sabatons
    put('mythic', 'el' + side, at(mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.24, 6), C.dark, { outline: 0.008 }), 0, -0.14, 0));
    put('mythic', 'el' + side, at(mesh(cone(0.022, 0.1, 4), C.gold, { outline: 0.004 }), 0, -0.05, -0.06, -2.2));
    put('mythic', 'hand' + side, at(mesh(new THREE.BoxGeometry(0.095, 0.1, 0.095), C.steel, { outline: 0.006 }), 0, -0.03, 0));
    put('mythic', 'knee' + side, at(mesh(new THREE.CylinderGeometry(0.075, 0.06, 0.4, 6), C.steel, { outline: 0.008 }), 0, -0.21, 0));
    put('mythic', 'knee' + side, at(mesh(new THREE.OctahedronGeometry(0.065, 0), C.dark, { outline: 0.006 }), 0, 0, 0.04));
    put('mythic', 'knee' + side, at(mesh(cone(0.025, 0.12, 4), C.gold, { outline: 0.004 }), 0, 0.02, 0.08, 1.2));
    put('mythic', 'foot' + side, at(mesh(new THREE.BoxGeometry(0.125, 0.08, 0.27), C.dark, { outline: 0.006 }), 0, -0.005, 0.045));
  }
  // rune greatsword: dark blade, glowing zig-zag rune, winged gold guard, gem pommel
  const sword = new THREE.Group();
  sword.add(mesh(extrude([[-0.04, 0], [0.04, 0], [0.034, 0.74], [0, 0.84], [-0.034, 0.74]], 0.012, 0.005), C.dark, { outline: 0.006 }));
  const rune = [];
  for (let i = 0; i <= 9; i++) rune.push([(i % 2 ? 0.012 : -0.012), 0.06 + i * 0.075, 0.012]);
  sword.add(mesh(tube(rune, 0.0045, 30), C.ember, { outline: 0, shadow: false }));
  const rune2 = rune.map(([x, y]) => [x, y, -0.012]);
  sword.add(mesh(tube(rune2, 0.0045, 30), C.ember, { outline: 0, shadow: false }));
  sword.add(mesh(extrude([[-0.03, -0.02], [-0.17, 0.05], [-0.15, -0.03], [-0.04, -0.05], [0.04, -0.05], [0.15, -0.03], [0.17, 0.05], [0.03, -0.02]], 0.03, 0.005), C.gold, { outline: 0.005 }));
  sword.add(at(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.15, 5), C.leather, { outline: 0.004 }), 0, -0.12, 0));
  sword.add(at(mesh(new THREE.OctahedronGeometry(0.03, 0), C.gem, { outline: 0.004 }), 0, -0.21, 0));
  J.swordMythic = put('mythic', 'handR', at(sword, 0, -0.04, 0.02, Math.PI / 2, 0, 0));
  // spiked kite shield: dark plate, gold cross, core gem, molten cracks
  const shield = new THREE.Group();
  const kite = [[-0.24, 0.3], [0.24, 0.3], [0.25, 0.04], [0.15, -0.22], [0, -0.42], [-0.15, -0.22], [-0.25, 0.04]];
  shield.add(mesh(extrude(kite, 0.035, 0.012), C.steel, { outline: 0.008 }));
  shield.add(at(mesh(extrude(kite.map(([x, y]) => [x * 0.8, y * 0.8 + 0.01]), 0.01, 0.004), toon('panel', 0x2a1f36, { rim: 0xff4d6d }), { outline: 0 }), 0, 0, 0.025));
  shield.add(at(mesh(new THREE.BoxGeometry(0.035, 0.55, 0.012), C.gold, { outline: 0 }), 0, -0.04, 0.034));
  shield.add(at(mesh(new THREE.BoxGeometry(0.34, 0.035, 0.012), C.gold, { outline: 0 }), 0, 0.12, 0.034));
  shield.add(at(mesh(new THREE.OctahedronGeometry(0.05, 0), C.gem, { outline: 0.005 }), 0, 0.12, 0.05));
  for (const s of [-1, 1]) shield.add(at(mesh(cone(0.035, 0.16, 4), C.gold, { outline: 0.005 }), s * 0.24, 0.3, 0, 0, 0, s * -0.6));
  for (const [x, y, r] of [[-0.12, 0.2, 0.8], [0.13, -0.08, -0.5], [-0.08, -0.15, 0.3]]) shield.add(at(mesh(new THREE.BoxGeometry(0.1, 0.008, 0.01), C.ember, { outline: 0, shadow: false }), x, y, 0.036, 0, 0, r));
  shield.scale.setScalar(0.78);
  J.shieldMythic = put('mythic', 'handL', at(shield, 0.03, -0.04, 0.12, 0, 0, 0));
}

buildBase(); buildPlain(); buildMythic();
let gearSet = 'mythic';
function applyGear() {
  hero.traverse((o) => { if (o.userData.set === 'plain') o.visible = gearSet === 'plain'; if (o.userData.set === 'mythic') o.visible = gearSet === 'mythic'; });
  aura.visible = gearSet === 'mythic';
}

// ——— aura: rune circle on the floor, rising embers ———
const aura = new THREE.Group();
scene.add(aura);
const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc060).multiplyScalar(1.6), transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false });
aura.add(at(new THREE.Mesh(new THREE.RingGeometry(0.62, 0.66, 48), ringMat), 0, 0.012, 0, -Math.PI / 2));
aura.add(at(new THREE.Mesh(new THREE.RingGeometry(0.48, 0.5, 48), ringMat), 0, 0.012, 0, -Math.PI / 2));
const runes = new THREE.Group(); aura.add(runes);
for (let i = 0; i < 12; i++) {
  const a = (i / 12) * Math.PI * 2;
  runes.add(at(new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.1), ringMat), Math.cos(a) * 0.56, 0.013, Math.sin(a) * 0.56, -Math.PI / 2, 0, a));
}
const EN = 40, epos = new Float32Array(EN * 3), embers = [];
const egeo = new THREE.BufferGeometry(); egeo.setAttribute('position', new THREE.BufferAttribute(epos, 3));
const emberPts = new THREE.Points(egeo, new THREE.PointsMaterial({ color: new THREE.Color(0xff6a3a).multiplyScalar(2), size: 0.035, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
emberPts.frustumCulled = false; aura.add(emberPts);
for (let i = 0; i < EN; i++) embers.push({ a: Math.random() * 6.28, r: 0.2 + Math.random() * 0.45, ph: Math.random() });

// ——— the stage: floor, two torches, moonlight ———
const floor = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 0.2, 12), toon('floor', 0x241c2e, { rimK: 0 }));
floor.position.y = -0.1; floor.receiveShadow = true; scene.add(floor);
for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; const s = mesh(new THREE.BoxGeometry(0.7, 0.03, 0.7), toon('flag', 0x2e2638, { rimK: 0 }), { outline: 0 }); s.receiveShadow = true; scene.add(at(s, Math.cos(a) * 2.4, 0.005, Math.sin(a) * 2.4, 0, a)); }
scene.add(new THREE.HemisphereLight(0x5a4a80, 0x140c14, 0.9));
const moon = new THREE.DirectionalLight(0xa89cff, 1.4);
moon.position.set(-3, 6, -2); moon.castShadow = true; moon.shadow.mapSize.set(1024, 1024);
Object.assign(moon.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3 }); scene.add(moon);
const torches = [];
for (const [x, z] of [[-2.2, -1.6], [2.2, -1.2]]) {
  const post = mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.6, 5), C.wood); scene.add(at(post, x, 0.8, z));
  const fl = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 6), glowMat(0xffb347, 2)); scene.add(at(fl, x, 1.75, z));
  const L = new THREE.PointLight(0xff8a3a, 9, 6, 1.6); L.position.set(x, 1.8, z); L.castShadow = false; scene.add(L);
  torches.push({ fl, L, ph: Math.random() * 9 });
}

// ——— procedural animation ———
const Q = new URLSearchParams(location.search);
let anim = Q.get('anim') || 'idle', animT = 0;
function pose(t) {
  const P = { hips: 0, lean: 0, twist: 0, shR: [0, 0], elR: 0, shL: [0, 0], elL: 0, legL: 0, legR: 0, kneeL: 0, kneeR: 0, head: 0, spin: 0, lift: 0 };
  // idle: breathing, shield up
  P.lean = Math.sin(t * 2) * 0.015; P.shR = [0.25, -0.1]; P.elR = -0.55; P.shL = [-0.55, 0.3]; P.elL = -0.9;
  if (anim === 'walk') {
    const w = t * 7, s = Math.sin(w);
    P.legL = s * 0.55; P.legR = -s * 0.55; P.kneeL = Math.max(0, -Math.cos(w)) * 0.9; P.kneeR = Math.max(0, Math.cos(w)) * 0.9;
    P.hips = -Math.abs(s) * 0.04; P.lean = 0.12; P.shR = [0.25 + s * 0.35, -0.1]; P.twist = s * 0.08;
  }
  if (anim === 'attack') { // keyframed slash: wind-up, beat, whip, overshoot, settle (loops)
    const a = (t % 1.3) / 1.3;
    // arm angle: 0 = hanging, −π/2 = forward, −π = up, below −π = up and back over the shoulder
    const K = [[0, 0.25, -0.55, 0, 0], [0.3, -3.55, -0.6, -0.18, -0.25], [0.38, -3.45, -0.5, -0.14, -0.3], [0.47, -0.7, -0.1, 0.3, 0.35], [0.55, -0.4, -0.15, 0.34, 0.4], [0.7, -0.2, -0.4, 0.28, 0.3], [1, 0.25, -0.55, 0, 0]];
    let i = 0; while (i < K.length - 2 && a > K[i + 1][0]) i++;
    const A = K[i], B = K[i + 1], u = smooth((a - A[0]) / (B[0] - A[0]));
    P.shR = [lerp(A[1], B[1], u), -0.15]; P.elR = lerp(A[2], B[2], u); P.lean = lerp(A[3], B[3], u); P.twist = lerp(A[4], B[4], u);
    P.legL = -P.lean * 1.4; P.legR = P.lean * 0.8; P.kneeL = Math.max(0, P.lean) * 0.9; P.hips = -Math.max(0, P.lean) * 0.12;
    P.shL = [-0.55 + P.lean, 0.3]; trailOn = a > 0.38 && a < 0.62;
  }
  if (anim === 'spin') { // whirlwind with the sword held out
    P.spin = t * 9; P.shR = [-1.45, -0.2]; P.elR = 0; P.shL = [-1.2, 0.5]; P.elL = -0.6; P.lean = 0.1; P.hips = -0.06; P.kneeL = P.kneeR = 0.3; P.legL = -0.15; P.legR = 0.15;
    trailOn = true;
  }
  if (anim === 'slam') { // jump and smash
    const a = (t % 1.6) / 1.6, up = a < 0.4 ? Math.sin((a / 0.4) * Math.PI) : 0;
    P.lift = up * 0.55; P.shR = [a < 0.4 ? -3.4 : a < 0.5 ? lerp(-3.4, -0.5, (a - 0.4) / 0.1) : -0.5, -0.1]; P.elR = -0.3;
    P.lean = a < 0.4 ? -0.15 : 0.45; P.hips = a < 0.4 ? 0 : -0.2; P.kneeL = P.kneeR = a < 0.4 ? 0.8 * up : 0.6; P.legL = P.legR = a < 0.4 ? -0.5 * up : -0.3;
    if (a > 0.45 && a < 0.5 && !slamFired) { slamFired = true; shockwave(); }
    if (a < 0.4) slamFired = false;
  }
  return P;
}
let trailOn = false, slamFired = false;
function applyPose(P, t) {
  J.hips.position.y = 0.98 + P.hips + P.lift;
  hero.rotation.y = P.spin;
  J.spine.rotation.set(P.lean, P.twist, 0);
  J.head.rotation.set(-P.lean * 0.5, 0, 0);
  J.shR.rotation.set(P.shR[0], 0, P.shR[1]); J.elR.rotation.set(P.elR, 0, 0);
  J.shL.rotation.set(P.shL[0], 0, P.shL[1]); J.elL.rotation.set(P.elL, 0, 0);
  // the shield stays upright, facing forward, whatever the arm does
  for (const sh of [J.shieldMythic, J.shieldPlain]) sh.rotation.set(-(P.shL[0] + P.elL) + (sh === J.shieldPlain ? Math.PI / 2 : 0), 0, -P.shL[1]);
  J.hipL.rotation.set(P.legL, 0, 0); J.hipR.rotation.set(P.legR, 0, 0);
  J.kneeL.rotation.set(P.kneeL, 0, 0); J.kneeR.rotation.set(P.kneeR, 0, 0);
  J.footL.rotation.set(-P.legL - P.kneeL * 0.5, 0, 0); J.footR.rotation.set(-P.legR - P.kneeR * 0.5, 0, 0);
  // cape waves, flung back while moving / swinging
  const pos = J.cape.geometry.attributes.position, rest = J.cape.userData.rest;
  const pull = anim === 'walk' ? 0.35 : anim === 'spin' ? 0.6 : anim === 'attack' ? 0.18 : 0.04;
  for (let i = 0; i < pos.count; i++) {
    const x = rest[i * 3], y = rest[i * 3 + 1], d = -y / 1.15;
    pos.setZ(i, -d * d * pull * 1.2 - Math.sin(t * 3 + x * 6 + d * 4) * 0.04 * (0.4 + d));
  }
  pos.needsUpdate = true; J.cape.geometry.computeVertexNormals();
  J.capeTrim.position.set(0, -1.15, -pull * 1.2 - Math.sin(t * 3 + 4) * 0.04);
}

// sword trail: last positions of the blade tip as a glowing ribbon
const TRAIL = 14, tpos = new Float32Array(TRAIL * 2 * 3), tipHist = [];
const tgeo = new THREE.BufferGeometry(); tgeo.setAttribute('position', new THREE.BufferAttribute(tpos, 3));
const tidx = []; for (let i = 0; i < TRAIL - 1; i++) { const a = i * 2; tidx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
tgeo.setIndex(tidx);
const trailMesh = new THREE.Mesh(tgeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff6a5a).multiplyScalar(1.8), transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
trailMesh.frustumCulled = false; scene.add(trailMesh);
const tipV = new THREE.Vector3(), midV = new THREE.Vector3();
function updateTrail() {
  const sw = gearSet === 'mythic' ? J.swordMythic : J.swordPlain;
  sw.localToWorld(tipV.set(0, gearSet === 'mythic' ? 0.84 : 0.68, 0)); sw.localToWorld(midV.set(0, 0.25, 0));
  tipHist.unshift([tipV.clone(), midV.clone()]);
  const keep = anim === 'spin' ? 5 : TRAIL; // a fast whirl only keeps a short tail
  while (tipHist.length > keep) tipHist.pop();
  trailMesh.visible = trailOn && tipHist.length > 2;
  for (let i = 0; i < TRAIL; i++) { const [a, b] = tipHist[Math.min(i, tipHist.length - 1)]; tpos.set([a.x, a.y, a.z, b.x, b.y, b.z], i * 6); }
  tgeo.attributes.position.needsUpdate = true;
}

// shockwave for the slam
const waves = [];
function shockwave() {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.45, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffa060).multiplyScalar(2), transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  m.rotation.x = -Math.PI / 2; m.position.set(0, 0.02, 0.5); scene.add(m); waves.push({ m, life: 0.6 });
}

// ——— UI ———
function buttons(bar, list, get, set) {
  for (const [id, label] of list) {
    const b = document.createElement('button'); b.className = 'tb'; b.textContent = label; b.dataset.id = id;
    b.onclick = () => { set(id); for (const x of bar.children) x.classList.toggle('on', x.dataset.id === get()); };
    bar.append(b);
  }
  for (const x of bar.children) x.classList.toggle('on', x.dataset.id === get());
}
buttons($('gearBar'), [['plain', 'TANPA GEAR'], ['mythic', 'GEAR MITOS']], () => gearSet, (v) => { gearSet = v; applyGear(); });
buttons($('animBar'), [['idle', 'DIAM'], ['walk', 'JALAN'], ['attack', 'TEBAS'], ['spin', 'PUTARAN'], ['slam', 'HANTAMAN'], ['rotate', 'PUTAR KAMERA']], () => (anim), (v) => {
  if (v === 'rotate') { controls.autoRotate = !controls.autoRotate; return; }
  anim = v; animT = 0; controls.autoRotate = false;
});
applyGear();
$('loading').remove();

// ——— loop ———
const clock = new THREE.Clock();
let fps = 60, acc = 0, frames = 0, tris = 0;
renderer.info.autoReset = false;
function frame() {
  const dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime;
  animT += dt; trailOn = false;
  applyPose(pose(animT), t);
  updateTrail();
  runes.rotation.y = t * 0.4;
  for (let i = 0; i < EN; i++) {
    const e = embers[i], ph = (e.ph + t * 0.35) % 1;
    epos.set([Math.cos(e.a + t * 0.6) * e.r, ph * 2.2, Math.sin(e.a + t * 0.6) * e.r], i * 3);
  }
  egeo.attributes.position.needsUpdate = true;
  for (const tc of torches) { const f = 1 + Math.sin(t * 11 + tc.ph) * 0.08 + Math.sin(t * 23 + tc.ph) * 0.05; tc.L.intensity = 9 * f; tc.fl.scale.setScalar(f); }
  for (let i = waves.length - 1; i >= 0; i--) { const w = waves[i]; w.life -= dt; w.m.scale.setScalar(1 + (0.6 - w.life) * 9); w.m.material.opacity = Math.max(0, w.life / 0.6); if (w.life <= 0) { scene.remove(w.m); waves.splice(i, 1); } }
  C.ember.color.setRGB(2.2 * (0.8 + 0.2 * Math.sin(t * 5)), 0.23 * 2.2, 0.16 * 2.2);
  controls.update();
  renderer.info.reset();
  composer.render();
  acc += dt; frames++;
  if (acc > 0.5) { fps = Math.round(frames / acc); acc = 0; frames = 0; tris = renderer.info.render.triangles; }
  $('info').innerHTML = `${fps} FPS · ${Math.round(tris / 1000)}k segitiga · semua bentuk dibuat lewat kode (tanpa file model)<br>seret untuk memutar, cubit / gulir untuk zoom`;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
