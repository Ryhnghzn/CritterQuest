// Illustrated props standing in the 2.5D world (plan C3): the look prototype's painted trees,
// rocks and bushes (art/pix/props.js) on upright planes. One plane per kind + variant, drawn
// instanced; the vertex shader keeps only each instance's position and scale and turns the
// plane to the camera (BILL_U.uYaw), its shadow copy to the sun (uSunYaw). Geometry is in
// radius units like flora.js: feet at y = 0, scaled by the prop's r.
import * as THREE from 'three';
import * as P from '../art/pix/props.js';
import { BILL_U, S } from './stage.js';
import { LOOK } from '../data/look.js';

const K = 3; // texels per design pixel
// per kind: the three variants (design, ground rows under the feet) and the height in radius units
const BIOME_ROCK_CAP = { forest: 'leaf', ice: 'snow' };
const DESIGNS = {
  oak: { h: 3.4, foot: 3, v: [() => P.oak('m', 1, K), () => P.oak('l', 2, K), () => P.oak('m', 4, K, 'leafOld')] },
  pine: { h: 3.6, foot: 3, v: [() => P.pine('m', 1, K), () => P.pine('l', 2, K), () => P.pine('m', 5, K)] },
  snowpine: { h: 3.6, foot: 3, v: [() => P.pine('m', 1, K, true), () => P.pine('l', 2, K, true), () => P.pine('m', 5, K, true)] },
  bush: { h: 1.25, foot: 1, v: [() => P.bush(1, K), () => P.bush(2, K, 'leaf', 'flowerV'), () => P.bush(3, K, 'leaf', 'flowerY')] },
  tuft: { h: 1.1, foot: 1, v: [() => P.grassTuft(1, K), () => P.grassTuft(2, K, 'flowerV'), () => P.grassTuft(3, K, 'flowerY')] },
  rock: { h: 1.5, foot: 1, v: [(cap) => P.rock('l', 1, K, cap), (cap) => P.rock('m', 2, K, cap), (cap) => P.rock('l', 3, K, cap)] },
};
export const ILLUSTRATED = new Set(Object.keys(DESIGNS));
export const illustratedIn = (biome) => !!LOOK.illustrated?.biomes.includes(biome);

function flipRows(a, w, h) { const o = new Uint8Array(a.length); for (let y = 0; y < h; y++) o.set(a.subarray(y * w * 4, (y + 1) * w * 4), (h - 1 - y) * w * 4); return o; }
const BUILT = new Map();
function build(kind, v, biome) {
  const D = DESIGNS[kind], cap = kind === 'rock' ? BIOME_ROCK_CAP[biome] ?? null : undefined, key = `${kind}:${v}:${cap}`;
  let b = BUILT.get(key);
  if (b) return b;
  const sp = D.v[v % D.v.length](cap), w = sp.w / sp.k, h = sp.h / sp.k;
  const map = new THREE.DataTexture(flipRows(sp.rgba(), sp.w, sp.h), sp.w, sp.h);
  map.colorSpace = THREE.SRGBColorSpace; map.magFilter = THREE.LinearFilter; map.minFilter = THREE.LinearMipmapLinearFilter;
  map.generateMipmaps = true; map.anisotropy = 4; map.needsUpdate = true;
  // plane in radius units: height D.h, the feet (D.foot empty rows) at y = 0
  const H = D.h, W = H * (w / h), geo = new THREE.PlaneGeometry(W, H);
  geo.translate(0, H / 2 - (D.foot / h) * H, 0);
  b = { geo, map };
  BUILT.set(key, b);
  return b;
}

// the turn: keep the instance's translation and scale, face uniform `yaw`
const TURN = (yaw) => `
#ifdef USE_INSTANCING
  vec3 bOrigin = instanceMatrix[3].xyz; float bsx = length(instanceMatrix[0].xyz), bsy = length(instanceMatrix[1].xyz);
#else
  vec3 bOrigin = vec3(0.0); float bsx = 1.0, bsy = 1.0;
#endif
  vec3 bw = bOrigin + vec3(transformed.x * bsx * cos(${yaw}), transformed.y * bsy, -transformed.x * bsx * sin(${yaw}));
  vec4 mvPosition = viewMatrix * modelMatrix * vec4(bw, 1.0);
  gl_Position = projectionMatrix * mvPosition;`;
// frames: the map is a strip of n animation frames; each instance plays it from its own phase
const FRAMES = (n, fps) => `#include <uv_vertex>
#if defined( USE_MAP ) && defined( USE_INSTANCING )
  { float ph = fract(sin(dot(instanceMatrix[3].xz, vec2(12.9898, 78.233))) * 43758.5453);
    vMapUv.x = (vMapUv.x + floor(mod(uTime * ${fps.toFixed(1)} + ph * ${n.toFixed(1)}, ${n.toFixed(1)}))) / ${n.toFixed(1)}; }
#endif`;
function turned(m, yaw, frames = null) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uYaw = BILL_U.uYaw; sh.uniforms.uSunYaw = BILL_U.uSunYaw; sh.uniforms.uTime = BILL_U.uTime;
    if (frames) sh.vertexShader = sh.vertexShader.replace('#include <uv_vertex>', FRAMES(frames.n, frames.fps));
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uYaw;\nuniform float uSunYaw;\nuniform float uTime;')
      .replace('#include <project_vertex>', TURN(yaw))
      .replace('#include <worldpos_vertex>', '#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0\n  vec4 worldPosition = modelMatrix * vec4(bw, 1.0);\n#endif')
      // lit like a soft upright card: its normal leans toward the camera and the sky
      .replace('#include <defaultnormal_vertex>', 'vec3 transformedNormal = normalMatrix * normalize(vec3(sin(uYaw) * 0.84, 0.55, cos(uYaw) * 0.84));');
  };
  m.customProgramCacheKey = () => `billprop|${yaw}|${frames ? frames.n : 0}`;
  return m;
}

// → { geo, mat, depth } for an InstancedMesh (depth: its customDepthMaterial)
export function illustrated(kind, biome, v) {
  const { geo, map } = build(kind, v, biome);
  const mat = turned(new THREE.MeshLambertMaterial({ map, alphaTest: 0.5, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: LOOK.bill }), 'uYaw');
  mat.userData.card = true; // stage.js: casts through its alpha, its own depth copy
  const depth = turned(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest: 0.5, side: THREE.DoubleSide }), 'uSunYaw');
  return { geo, mat, depth };
}

// Animated flames (plan C4): the prototype's four torch frames on camera-facing planes, one
// InstancedMesh for a list of { x, y (game), h (game units above the ground), s (scale) }.
// A flame of scale 1 is 0.67 m tall; it glows (basic material, bright for the bloom).
let flameMap = null;
function flameStrip() {
  if (flameMap) return flameMap;
  const fr = P.flames(K), w = fr[0].w, h = fr[0].h, W = w * fr.length, a = new Uint8Array(W * h * 4);
  fr.forEach((sp, i) => { const px = sp.rgba(); for (let y = 0; y < h; y++) a.set(px.subarray(y * w * 4, (y + 1) * w * 4), ((h - 1 - y) * W + i * w) * 4); });
  const t = new THREE.DataTexture(a, W, h);
  t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter; t.needsUpdate = true;
  return (flameMap = { map: t, w: w / K, h: h / K });
}
export function flameSet(points, glow = 1.8) {
  const F = flameStrip(), H = F.h / 24, geo = new THREE.PlaneGeometry(H * (F.w / F.h), H);
  geo.translate(0, H / 2, 0);
  const mat = turned(new THREE.MeshBasicMaterial({ map: F.map, alphaTest: 0.4, side: THREE.DoubleSide }), 'uYaw', { n: 4, fps: 9 });
  mat.color.setScalar(glow);
  const im = new THREE.InstancedMesh(geo, mat, points.length), m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  points.forEach((p, i) => im.setMatrixAt(i, m.compose(v.set(p.x * S, (p.h || 0) * S, p.y * S), q, sc.setScalar(p.s || 1))));
  im.frustumCulled = false; im.renderOrder = 3;
  return im;
}
