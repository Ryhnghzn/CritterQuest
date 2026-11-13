// The 2.5D stage (plan "Tampilan 2.5D" §1): a WebGL canvas under the game's 2D canvas,
// a camera tilted from the south (north up, like the 2D view) with zoom and a turn,
// toon materials, optional bloom. World mapping: game (x, y) → 3D (x·S, 0, y·S).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { LOOK, CAMERA } from '../data/look.js';
import { PUNCH } from '../data/fx.js';
import { detailPixels, DETAIL_SCALE, DETAIL_SIZE } from './texkit.js';

export const S = 1 / 22;          // game units → metres (a hero ≈ 1.7 m)
export const ZOOM = { min: 0.85, max: 1.6, start: 1.35, step: 0.08 }; // starts far out; close-ups stop before textures go soft
// Sharpness, [Penuh, Ringan]: render pixel ratio cap, and texture pixels per game unit of the
// ground (region tiles, dungeon floor, decal layer) and of the upright pictures (hero, NPCs, cards).
export const SHARP = {
  ratio: [2, 1], ground: [1.0, 0.55], floor: [2, 1.2], floorMax: 3072, decal: [1, 0.55],
  hero: [3, 1.8], npc: [2.2, 1.3], card: [2.6, 1.5], aniso: 8,
};
// phones and tablets (a coarse pointer): a smaller memory budget so iPhone Safari does not kill the page
// (spec §50) — the render pixel ratio, the region ground tiles, the sun's shadow map
export const TOUCH = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
export const TOUCH_CAP = { ratio: 1.5, ground: 0.8, shadow: 1024, floorMax: 2048 };
let sharpScale = 1; // Settings → Ketajaman (data/settings.js SHARP_SCALE)
export const setSharpScale = (k) => { sharpScale = k; };
export const sharp = (key, lite) => { const v = SHARP[key][lite ? 1 : 0] * sharpScale; return TOUCH && TOUCH_CAP[key] ? Math.min(v, TOUCH_CAP[key]) : v; };
const CAM = { dist: 10.5, height: 11.5, fov: 40 }; // at zoom 1 the short screen side shows about the 2D view

// Tampilan Matang (§36): world materials lose some saturation (after map + vertex colours, and
// on their self light), so characters, effects and fire stand out. Chains any earlier hook.
const SAT = LOOK.saturation.toFixed(3), LUMA = 'vec3(0.299, 0.587, 0.114)';
export function muted(m) {
  if (LOOK.saturation === 1) return m; // ?lama
  const prev = m.onBeforeCompile, prevKey = m.customProgramCacheKey();
  m.onBeforeCompile = (sh, r) => {
    prev.call(m, sh, r);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>\ndiffuseColor.rgb = mix(vec3(dot(diffuseColor.rgb, ${LUMA})), diffuseColor.rgb, ${SAT});`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\ntotalEmissiveRadiance = mix(vec3(dot(totalEmissiveRadiance, ${LUMA})), totalEmissiveRadiance, ${SAT});`);
  };
  m.customProgramCacheKey = () => `muted|${prevKey}`;
  return m;
}

// Material detail (plan A2): a tileable grey map (texkit.js) multiplies the colour, sampled by
// world position along the face's main axis, so bricks keep their size on any building and
// merged / instanced parts need no UVs. One small texture per kind, made on first use.
const DETAIL_TEX = new Map();
function detailTex(kind) {
  let t = DETAIL_TEX.get(kind);
  if (!t) {
    t = new THREE.DataTexture(detailPixels(kind), DETAIL_SIZE, DETAIL_SIZE, THREE.RedFormat);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true; t.anisotropy = 4; t.needsUpdate = true;
    DETAIL_TEX.set(kind, t);
  }
  return t;
}
export function detailed(m, kind) {
  const prev = m.onBeforeCompile, prevKey = m.customProgramCacheKey();
  const u = m.userData.detail = { map: { value: detailTex(kind) }, scale: { value: DETAIL_SCALE[kind] } };
  m.onBeforeCompile = (sh, r) => {
    prev.call(m, sh, r);
    sh.uniforms.detailMap = u.map; sh.uniforms.detailScale = u.scale;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vDPos;\nvarying vec3 vDN;')
      .replace('#include <project_vertex>', `#include <project_vertex>
vec4 dWp = vec4(transformed, 1.0); vec3 dN = objectNormal;
#ifdef USE_INSTANCING
dWp = instanceMatrix * dWp; dN = mat3(instanceMatrix) * dN;
#endif
vDPos = (modelMatrix * dWp).xyz; vDN = mat3(modelMatrix) * dN;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D detailMap;\nuniform float detailScale;\nvarying vec3 vDPos;\nvarying vec3 vDN;')
      .replace('#include <color_fragment>', `#include <color_fragment>
{ vec3 an = abs(vDN); vec2 duv = an.y > max(an.x, an.z) ? vDPos.xz : (an.x > an.z ? vDPos.zy : vDPos.xy);
  diffuseColor.rgb *= max(vec3(0.0), vec3(mix(1.0, texture2D(detailMap, duv / detailScale).r * 2.0, ${LOOK.detail.toFixed(2)}))); }`);
  };
  m.customProgramCacheKey = () => `detail|${prevKey}`;
  return m;
}
// swap a detailed material's surface (the region ground changes with the biome)
export function setDetail(m, kind) { m.userData.detail.map.value = detailTex(kind); m.userData.detail.scale.value = DETAIL_SCALE[kind]; }

const steps = new Uint8Array([70, 70, 70, 255, 150, 150, 150, 255, 255, 255, 255, 255]);
let gradientMap = null;
const TOON = new Map();
// a 3-step toon material (cached per colour); rim adds a coloured edge light; kind (texkit.js:
// plaster, stone, wood, roof, log, thatch) adds a material surface
export function toon(color, rim = 0, kind = null) {
  const key = `${color}:${rim}:${kind}`;
  if (TOON.has(key)) return TOON.get(key);
  if (!gradientMap) {
    gradientMap = new THREE.DataTexture(steps, 3, 1, THREE.RGBAFormat);
    gradientMap.minFilter = gradientMap.magFilter = THREE.NearestFilter; gradientMap.needsUpdate = true;
  }
  const m = new THREE.MeshToonMaterial({ color, gradientMap });
  if (rim) m.onBeforeCompile = (sh) => {
    sh.uniforms.rimColor = { value: new THREE.Color(rim) };
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 rimColor;')
      .replace('#include <opaque_fragment>', 'float rimF = 1.0 - max(dot(normal, normalize(vViewPosition)), 0.0);\noutgoingLight += rimColor * smoothstep(0.6, 0.95, rimF) * 0.6;\n#include <opaque_fragment>');
  };
  m.customProgramCacheKey = () => `toon|${rim ? 1 : 0}`; // rim and plain toons compile apart
  if (kind && LOOK.detail > 0) detailed(m, kind);
  muted(m);
  TOON.set(key, m);
  return m;
}
// Sun shadows and dusk (plan C1). sunAt places a scene's sun (or moon) around the camera
// target (metres): LOOK.mood's low sun, else the scene's own offset; the target snaps to the
// shadow map's texel grid so shadows do not crawl while walking. dusk leans a day colour warm.
const _dusk = new THREE.Color();
export function sunAt(light, tx, tz, offset) {
  const M = LOOK.mood, SH = LOOK.shadows;
  let [ox, oy, oz] = offset;
  if (M) { const [a, b, c] = M.sunDir, l = Math.hypot(a, b, c); [ox, oy, oz] = [a / l * M.sunDist, b / l * M.sunDist, c / l * M.sunDist]; }
  // one shadow texel (a smaller map on phones)
  if (SH) { const tex = (SH.box * 2) / (TOUCH ? Math.min(SH.size, TOUCH_CAP.shadow) : SH.size); tx = Math.round(tx / tex) * tex; tz = Math.round(tz / tex) * tex; }
  light.position.set(tx + ox, oy, tz + oz); light.target.position.set(tx, 0, tz);
  light.target.updateMatrixWorld();
}
export function dusk(color, key, night = 0) {
  const M = LOOK.mood;
  if (M) color.lerp(_dusk.set(M[key]), M.warm * (1 - night));
  return color;
}
// what casts and catches shadows, decided once per object: opaque solids cast and catch,
// flat planes (ground, floors) only catch, cut-out billboards (hero, monsters, people) cast
// through their picture's alpha, glows / decals / effects (basic materials) stay out
function shadowRole(o) {
  const m = Array.isArray(o.material) ? o.material[0] : o.material;
  if (!m || m.isMeshBasicMaterial || m.isPointsMaterial || m.isSpriteMaterial) return 'none';
  if (m.map && m.alphaTest > 0 && (m.transparent || m.userData.card)) return 'card';
  if (m.transparent) return o.geometry?.type === 'PlaneGeometry' ? 'floor' : 'none'; // painted overlays (roads) still catch shadows
  return o.geometry?.type === 'PlaneGeometry' ? 'floor' : 'solid';
}
function shade(scene, on) {
  const SH = LOOK.shadows;
  scene.traverse((o) => {
    if (o.isDirectionalLight) {
      if (o.castShadow !== on) {
        o.castShadow = on;
        const sc = o.shadow.camera;
        const sz = TOUCH ? Math.min(SH.size, TOUCH_CAP.shadow) : SH.size; o.shadow.mapSize.set(sz, sz); sc.left = sc.bottom = -SH.box; sc.right = sc.top = SH.box; sc.near = 0.5; sc.far = 90; sc.updateProjectionMatrix();
        o.shadow.bias = SH.bias; o.shadow.normalBias = SH.normalBias; o.shadow.intensity = SH.intensity;
      }
      return;
    }
    if (!o.isMesh) return;
    let role = o.userData.shadow;
    if (!role) {
      role = o.userData.shadow = shadowRole(o);
      if (role === 'solid') o.castShadow = o.receiveShadow = true;
      else if (role === 'floor') o.receiveShadow = true;
      else if (role === 'card') { o.castShadow = true; o.customDepthMaterial ||= new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaTest: 0.5 }); }
    }
    if (role === 'card' && !o.material.userData.card && o.customDepthMaterial.map !== o.material.map) { o.customDepthMaterial.map = o.material.map; o.customDepthMaterial.needsUpdate = true; }
  });
}

// Illustrated props (plan C3) turn to face the camera in their vertex shader; their shadow
// copies turn to face the sun so a tree always throws its whole silhouette (billprops.js)
let rimSetting = true; // Settings → Grafis → Cahaya tepi karakter
export function setRimLight(on) { rimSetting = on; BILL_U.uRimOn.value = on && !liteNow ? 1 : 0; }
let liteNow = false;
export const BILL_U = { uYaw: { value: 0 }, uSunYaw: { value: 0 }, uTime: { value: 0 }, uRimOn: { value: 1 } }; // uRimOn: the figures' rim light (render3d/actors.js), off in Ringan
{ const d = LOOK.mood?.sunDir || [-8, 18, 10]; BILL_U.uSunYaw.value = Math.atan2(d[0], d[2]); }

export const glowMat = (c, k = 1.8) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k) });

export class Stage {
  // overlay: the game's 2D canvas (kept on top for numbers, bars, flashes)
  constructor(overlay) {
    this.overlay = overlay;
    this.zoom = ZOOM.start;
    this.yaw = 0; this.yawGoal = 0;   // camera turn around the hero (0 = from the south)
    this.turnSens = 1;                // Settings: camera turn speed (data/settings.js CAM_SENS)
    this.lite = false;
    this.shake = { x: 0, y: 0 };
    this.punch = 0; this.punchNow = 0; // camera punch (data/fx.js PUNCH): the wanted share closer, and the eased one
    this.target = new THREE.Vector3();
    this.ready = false;
    this.cap = null;                  // load guard (run/loadguard.js): a lower pixel ratio for a while, nothing rebuilt
  }

  init() { // lazy: only when the 2.5D view is first used
    if (this.ready) return;
    this.ready = true;
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: !this.lite, powerPreference: 'high-performance' });
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = LOOK.exposure;
    r.outputColorSpace = THREE.SRGBColorSpace;
    if (LOOK.shadows) { r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; }
    const c = r.domElement;
    c.id = 'game3d';
    c.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;display:block;z-index:0';
    this.overlay.parentNode.insertBefore(c, this.overlay);
    this.camera = new THREE.PerspectiveCamera(CAMERA.behind ? CAMERA.fov : CAM.fov, 1, 0.3, 200);
    this.composer = new EffectComposer(r);
    this.pass = new RenderPass(null, this.camera); // each scene (dungeon, town, region) hands its own THREE.Scene
    this.composer.addPass(this.pass);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), LOOK.bloom.strength, LOOK.bloom.radius, LOOK.bloom.threshold);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.raycaster = new THREE.Raycaster();
    this.ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    addEventListener('resize', () => this.resize());
    // only over the world itself: a scroll inside a panel (gear, shop, map) scrolls the panel
    addEventListener('wheel', (e) => { if (this.visible && e.target === this.overlay) this.setZoom(this.zoom + Math.sign(e.deltaY) * ZOOM.step); }, { passive: true });
    this.controls();
    this.resize();
  }

  setQuality(lite) {
    this.lite = lite;
    liteNow = lite; BILL_U.uRimOn.value = lite || !rimSetting ? 0 : 1; // Ringan or switched off: no rim light on the figures (hybrid prototype)
    if (!this.ready) return;
    this.resize();
  }
  // Settings → Kamera: 'top' (2.5D from above) | 'behind' | 'follow' — the URL `?kamera=belakang` wins
  setCamera(mode) {
    if (CAMERA.url) return;
    CAMERA.behind = mode !== 'top'; CAMERA.follow = mode === 'follow'; this.prev = null;
    if (this.ready) { this.camera.fov = CAMERA.behind ? CAMERA.fov : CAM.fov; this.camera.updateProjectionMatrix(); }
  }
  // a pixel-ratio ceiling (null: none) — cheaper on memory in a busy fight, without the rebuild a quality change costs
  setCap(c) { if (c === this.cap) return; this.cap = c; this.resize(); }
  setZoom(z) { this.zoom = Math.max(ZOOM.min, Math.min(ZOOM.max, z)); }

  // Compiles a scene's shaders ahead of its first frame (in parallel where the browser
  // allows), so the loading screen keeps moving instead of the first frame freezing.
  async compile(scene) {
    try { await this.renderer.compileAsync(scene, this.camera); } catch { /* older browsers: compiled on the first frame */ }
  }

  // PC: right-drag turns, [ ] turn 45°, middle click resets; phone: two fingers twist or slide
  // sideways to turn, pinch to zoom. Drags and twists go through turnSens.
  controls() {
    const turn = (d) => { this.yawGoal += d; };
    const drag = (d) => { turn(d * this.turnSens); this.yaw = this.yawGoal; };
    addEventListener('contextmenu', (e) => { if (this.visible && e.target === this.overlay) e.preventDefault(); });
    addEventListener('mousedown', (e) => { if (this.visible && e.button === 1 && e.target === this.overlay) { e.preventDefault(); this.yawGoal = Math.round(this.yaw / (Math.PI * 2)) * Math.PI * 2; } });
    let rightDrag = false; // a right-drag that started on the world, not in a panel
    addEventListener('mousedown', (e) => { if (e.button === 2) rightDrag = e.target === this.overlay; });
    addEventListener('mousemove', (e) => { if (this.visible && rightDrag && (e.buttons & 2)) drag(-e.movementX * 0.008); });
    addEventListener('keydown', (e) => {
      if (!this.visible || e.repeat) return;
      if (e.code === 'BracketLeft') turn(Math.PI / 4);
      if (e.code === 'BracketRight') turn(-Math.PI / 4);
    });
    let pinch = null;
    const pair = (t) => ({ d: Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY), a: Math.atan2(t[1].clientY - t[0].clientY, t[1].clientX - t[0].clientX), mx: (t[0].clientX + t[1].clientX) / 2 });
    addEventListener('touchstart', (e) => { if (this.visible && e.touches.length === 2 && ![...e.touches].some((t) => t.target.closest?.('.screen, .modal'))) pinch = pair(e.touches); }, { passive: true });
    addEventListener('touchmove', (e) => {
      if (!this.visible || !pinch || e.touches.length !== 2) return;
      const p = pair(e.touches), da = Math.atan2(Math.sin(p.a - pinch.a), Math.cos(p.a - pinch.a));
      if (Math.abs(da) < 0.5) drag(-da);                           // twist
      if (Math.abs(p.mx - pinch.mx) < 80) drag(-(p.mx - pinch.mx) * 0.008); // slide sideways
      if (pinch.d > 0) this.setZoom(this.zoom * (pinch.d / p.d));
      pinch = p;
    }, { passive: true });
    addEventListener('touchend', (e) => { if (e.touches.length < 2) pinch = null; }, { passive: true });
  }
  // a screen direction (x right, y down) → world direction, for movement with a turned camera
  toWorld(x, y) {
    const c = Math.cos(this.yaw), s = Math.sin(this.yaw);
    return { x: x * c + y * s, y: -x * s + y * c };
  }

  resize() {
    if (!this.ready) return;
    const dpr = devicePixelRatio || 1;
    // Ringan: one pixel per CSS pixel; Penuh up to 2× (crisp on phones and HiDPI screens)
    this.renderer.setPixelRatio(Math.min(dpr, sharp('ratio', this.lite), this.cap ?? Infinity));
    this.renderer.setSize(innerWidth, innerHeight, false);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(innerWidth, innerHeight);
    this.bloom.resolution.set(innerWidth / 2, innerHeight / 2);
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
  }

  show(on) {
    if (!this.ready) return;
    this.visible = on;
    this.renderer.domElement.style.display = on ? 'block' : 'none';
  }

  // camera looks at game point (x, y) from the south, tilted down
  look(x, y) {
    if (CAMERA.behind) { this.lookBehind(x, y); return; }
    this.yaw += (this.yawGoal - this.yaw) * 0.18;
    const k = this.zoom * this.leanIn(), tx = x * S, tz = y * S, sx = Math.sin(this.yaw), cz = Math.cos(this.yaw);
    this.camera.position.set(tx + sx * CAM.dist * k + this.shake.x, CAM.height * k, tz + cz * CAM.dist * k + this.shake.y);
    this.camera.lookAt(tx - sx * 0.8, 0.6, tz - cz * 0.8);
    this.target.set(tx, 0, tz);
  }

  // `?kamera=belakang` (example of Opsi 2): low behind the hero, looking ahead past it. With `&ikut` the
  // camera slowly swings round behind the way the hero walks (not when walking back toward it).
  lookBehind(x, y) {
    const tx = x * S, tz = y * S;
    if (CAMERA.follow && this.prev) {
      const dx = tx - this.prev.x, dz = tz - this.prev.z, d = Math.hypot(dx, dz);
      const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw); // where the camera looks
      if (d > 0.004 && d < 1 && (dx * fx + dz * fz) / d > -0.4) {
        const want = Math.atan2(-dx, -dz), diff = Math.atan2(Math.sin(want - this.yawGoal), Math.cos(want - this.yawGoal));
        this.yawGoal += diff * Math.min(1, CAMERA.followRate / 60);
      }
    }
    this.prev = { x: tx, z: tz };
    this.yaw += (this.yawGoal - this.yaw) * 0.18;
    const k = this.zoom * this.leanIn(), sx = Math.sin(this.yaw), cz = Math.cos(this.yaw);
    this.camera.position.set(tx + sx * CAMERA.dist * k + this.shake.x, CAMERA.height * k, tz + cz * CAMERA.dist * k + this.shake.y);
    this.camera.lookAt(tx - sx * CAMERA.ahead, CAMERA.lookH, tz - cz * CAMERA.ahead);
    this.target.set(tx, 0, tz);
  }

  // eases the camera punch and returns the distance factor (1 = none)
  leanIn() {
    this.punchNow += (this.punch - this.punchNow) * PUNCH.ease;
    if (this.punchNow < 1e-4) this.punchNow = 0;
    return 1 - this.punchNow;
  }

  render(scene) {
    BILL_U.uYaw.value = this.yaw; BILL_U.uTime.value = performance.now() / 1000;
    if (LOOK.shadows) shade(scene, !this.lite);
    if (this.lite) { this.renderer.render(scene, this.camera); return; }
    this.pass.scene = scene;
    this.composer.render();
  }

  // game point (+ height in game units above the floor) → CSS pixel, or null when behind
  project(x, y, h = 0) {
    const v = new THREE.Vector3(x * S, h * S, y * S).project(this.camera);
    if (v.z > 1) return null;
    return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight, k: this.pxPerUnit(x, y) };
  }
  // CSS pixels per game unit at a floor point (to size numbers and bars)
  pxPerUnit(x, y) {
    const a = new THREE.Vector3(x * S, 0, y * S).project(this.camera), b = new THREE.Vector3((x + 10) * S, 0, y * S).project(this.camera);
    return (Math.abs(b.x - a.x) * 0.5 * innerWidth) / 10;
  }
  // CSS pixel → game point on the floor (mouse aim)
  screenToWorld(px, py) {
    if (!this.ready) return { x: 0, y: 0 };
    const ndc = new THREE.Vector2((px / innerWidth) * 2 - 1, -(py / innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = new THREE.Vector3();
    const far = 26; // a low camera: a point above the horizon (or very far) aims that way, this far from the hero
    if (!this.raycaster.ray.intersectPlane(this.ground, hit) || hit.distanceTo(this.target) > far) {
      const d = this.raycaster.ray.direction, l = Math.hypot(d.x, d.z) || 1;
      return { x: (this.target.x + (d.x / l) * far) / S, y: (this.target.z + (d.z / l) * far) / S };
    }
    return { x: hit.x / S, y: hit.z / S };
  }
}
