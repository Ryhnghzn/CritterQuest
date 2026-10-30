// The 2.5D stage (plan "Tampilan 2.5D" §1): a WebGL canvas under the game's 2D canvas,
// a camera tilted from the south (north up, like the 2D view) with zoom and a turn,
// toon materials, optional bloom. World mapping: game (x, y) → 3D (x·S, 0, y·S).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export const S = 1 / 22;          // game units → metres (a hero ≈ 1.7 m)
export const ZOOM = { min: 0.85, max: 1.6, start: 1.35, step: 0.08 }; // starts far out; close-ups stop before textures go soft
// Sharpness, [Penuh, Ringan]: render pixel ratio cap, and texture pixels per game unit of the
// ground (region tiles, dungeon floor, decal layer) and of the upright pictures (hero, NPCs, cards).
export const SHARP = {
  ratio: [2, 1], ground: [1.0, 0.55], floor: [2, 1.2], floorMax: 3072, decal: [1, 0.55],
  hero: [3, 1.8], npc: [2.2, 1.3], card: [2.6, 1.5], aniso: 8,
};
let sharpScale = 1; // Settings → Ketajaman (data/settings.js SHARP_SCALE)
export const setSharpScale = (k) => { sharpScale = k; };
export const sharp = (key, lite) => SHARP[key][lite ? 1 : 0] * sharpScale;
const CAM = { dist: 10.5, height: 11.5, fov: 40 }; // at zoom 1 the short screen side shows about the 2D view

const steps = new Uint8Array([70, 70, 70, 255, 150, 150, 150, 255, 255, 255, 255, 255]);
let gradientMap = null;
const TOON = new Map();
// a 3-step toon material (cached per colour); rim adds a coloured edge light
export function toon(color, rim = 0) {
  const key = `${color}:${rim}`;
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
  TOON.set(key, m);
  return m;
}
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
    this.target = new THREE.Vector3();
    this.ready = false;
  }

  init() { // lazy: only when the 2.5D view is first used
    if (this.ready) return;
    this.ready = true;
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: !this.lite, powerPreference: 'high-performance' });
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.outputColorSpace = THREE.SRGBColorSpace;
    const c = r.domElement;
    c.id = 'game3d';
    c.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;display:block;z-index:0';
    this.overlay.parentNode.insertBefore(c, this.overlay);
    this.camera = new THREE.PerspectiveCamera(CAM.fov, 1, 0.5, 200);
    this.composer = new EffectComposer(r);
    this.pass = new RenderPass(null, this.camera); // each scene (dungeon, town, region) hands its own THREE.Scene
    this.composer.addPass(this.pass);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.7, 0.45, 0.82);
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
    if (!this.ready) return;
    this.resize();
  }
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
    this.renderer.setPixelRatio(Math.min(dpr, sharp('ratio', this.lite)));
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
    this.yaw += (this.yawGoal - this.yaw) * 0.18;
    const k = this.zoom, tx = x * S, tz = y * S, sx = Math.sin(this.yaw), cz = Math.cos(this.yaw);
    this.camera.position.set(tx + sx * CAM.dist * k + this.shake.x, CAM.height * k, tz + cz * CAM.dist * k + this.shake.y);
    this.camera.lookAt(tx - sx * 0.8, 0.6, tz - cz * 0.8);
    this.target.set(tx, 0, tz);
  }

  render(scene) {
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
    if (!this.raycaster.ray.intersectPlane(this.ground, hit)) return { x: this.target.x / S, y: this.target.z / S };
    return { x: hit.x / S, y: hit.z / S };
  }
}
