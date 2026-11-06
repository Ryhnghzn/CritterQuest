// Trees, bushes and rocks for Tampilan Matang (spec §36, plan A5): layered silhouettes built
// from many jittered lumps instead of one ball or cone, coloured per vertex (dark below and
// inside, light on top), three variants per kind so a wood is not a row of twins. Geometry
// is in radius units (a solid of r = 1, feet at y = 0), merged into one vertex-coloured mesh
// per variant like the other props (fieldkit.js). Seeded: the same variant every time.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const VARIANTS = 3;

function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }
// a stable 0..1 for a vertex position (shared corners of a non-indexed mesh move together)
function h3(x, y, z, s) {
  let h = (Math.round(x * 1000) * 374761393 + Math.round(y * 1000) * 668265263 + Math.round(z * 1000) * 2147483647 + s * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const C = (hex) => new THREE.Color(hex);
const _c = new THREE.Color();

// paint a non-indexed geometry: colour from lo (bottom) to hi (top) over [y0, y1], times tint
function paintHeight(g, lo, hi, y0, y1, tint = 1, snow = null) {
  const p = g.attributes.position, n = g.attributes.normal, a = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const t = Math.max(0, Math.min(1, (p.getY(i) - y0) / (y1 - y0 || 1)));
    _c.copy(lo).lerp(hi, t ** 0.85).multiplyScalar(tint);
    if (snow) { // on faces turned to the sky, and on the upper part of each tier (the hanging rim stays green)
      const k = Math.max(0, Math.min(1, (n.getY(i) - snow.from) / 0.12)) * Math.max(0, Math.min(1, (t - (snow.above ?? 0)) / 0.3));
      _c.lerp(snow.color, Math.min(0.8, k));
    }
    a[i * 3] = _c.r; a[i * 3 + 1] = _c.g; a[i * 3 + 2] = _c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}
function plain(geo) { const g = geo.index ? geo.toNonIndexed() : geo; if (g !== geo) geo.dispose(); g.deleteAttribute('uv'); return g; }
const merge = (parts) => { const g = mergeGeometries(parts); parts.forEach((p) => p.dispose()); g.computeBoundingSphere(); return g; };

// a soft, uneven lump: an icosahedron pushed in and out per corner, smooth radial normals
function lump(x, y, z, sx, sy, sz, lo, hi, seed, jag = 0.22, tint = 1) {
  const g = plain(new THREE.IcosahedronGeometry(1, 0)), p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const ux = p.getX(i), uy = p.getY(i), uz = p.getZ(i), k = 1 + (h3(ux, uy, uz, seed) - 0.5) * 2 * jag;
    p.setXYZ(i, x + ux * sx * k, y + uy * sy * k, z + uz * sz * k);
    const nl = Math.hypot(ux / sx, uy / sy, uz / sz) || 1;
    n.setXYZ(i, ux / sx / nl, uy / sy / nl, uz / sz / nl);
  }
  return paintHeight(g, lo, hi, y - sy, y + sy, tint);
}
// a tapered limb from (x, y, z) along a direction, radii r0 → r1
function limb(x, y, z, dx, dy, dz, len, r0, r1, color) {
  const g = plain(new THREE.CylinderGeometry(r1, r0, len, 6, 1));
  const dir = new THREE.Vector3(dx, dy, dz).normalize(), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x + dir.x * len / 2, y + dir.y * len / 2, z + dir.z * len / 2), q, new THREE.Vector3(1, 1, 1)));
  return paintHeight(g, C(color).multiplyScalar(0.75), C(color), y, y + len * dir.y);
}

const BARK = 0x3a281c, LEAF_LO = C(0x14261a), LEAF_HI = C(0x46643a);

// a broad tree: leaning trunk, two or three limbs, a crown of 8–10 lumps and a few hanging tufts
export function oak(v = 0) {
  const r = rng(101 + v * 977), P = [], h = 1.05 + r() * 0.35, lean = (r() - 0.5) * 0.3;
  P.push(limb(0, 0, 0, lean, 1, 0, h + 0.2, 0.25, 0.13, BARK));
  P.push(limb(-0.12, 0, 0.05, -1, 0.35, 0.3, 0.35, 0.09, 0.04, BARK), limb(0.1, 0, -0.06, 1, 0.3, -0.4, 0.3, 0.08, 0.04, BARK)); // roots
  const cx = lean * h, cy = h + 0.85;
  for (let i = 0; i < 2 + (v % 2); i++) {
    const a = r() * Math.PI * 2;
    P.push(limb(lean * h * 0.7, h * 0.75, 0, Math.cos(a), 0.9, Math.sin(a), 0.6, 0.08, 0.04, BARK));
  }
  const n = 8 + v, tint = 0.92 + r() * 0.14;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r() * 0.7, d = 0.35 + r() * 0.5, up = (r() - 0.35) * 0.55;
    const s = 0.42 + r() * 0.24, x = cx + Math.cos(a) * d * 0.95, y = cy + up, z = Math.sin(a) * d * 0.8;
    P.push(lump(x, y, z, s * 1.1, s * 0.85, s, LEAF_LO, LEAF_HI, v * 31 + i, 0.24, tint * (0.9 + r() * 0.2)));
  }
  P.push(lump(cx, cy + 0.4, 0, 0.62, 0.5, 0.58, LEAF_LO, LEAF_HI, v * 31 + 99, 0.2, tint)); // the crown's top
  for (let i = 0; i < 3; i++) { const a = r() * Math.PI * 2; P.push(lump(cx + Math.cos(a) * 0.85, cy - 0.45, Math.sin(a) * 0.7, 0.22, 0.18, 0.2, LEAF_LO, LEAF_HI, v * 31 + 50 + i, 0.3)); }
  return merge(P);
}

// a conifer of five drooping tiers with ragged edges; snow lies only on what faces the sky
export function pine(v = 0, snowy = false) {
  const r = rng(301 + v * 613), P = [], lo = C(snowy ? 0x112420 : 0x10221a), hi = C(snowy ? 0x2a4a42 : 0x2c5034);
  const snow = snowy ? { color: C(0xdfe8f4), from: 0.55, above: 0.58 } : null, tiers = 5, tall = 0.92 + r() * 0.22;
  P.push(limb(0, 0, 0, 0, 1, 0, 1.1, 0.17, 0.1, 0x2a1d16));
  for (let i = 0; i < tiers; i++) { // short, wide tiers stacked with a ledge between them
    const t = i / (tiers - 1), w = (1.1 - t * 0.74) * (0.95 + r() * 0.1), hh = (0.78 - t * 0.2) * tall, y = (0.95 + i * 0.44) * tall;
    const g = plain(new THREE.ConeGeometry(w, hh, 10, 1)), p = g.attributes.position;
    g.rotateY(r() * Math.PI);
    for (let k = 0; k < p.count; k++) { // the rim hangs in points: every other corner dips and reaches out
      if (p.getY(k) > -hh / 2 + 1e-4) continue;
      const ang = Math.atan2(p.getZ(k), p.getX(k)), tip = Math.round((ang / (Math.PI * 2)) * 10) % 2 === 0;
      const reach = tip ? 1.14 : 0.8;
      p.setXYZ(k, p.getX(k) * reach, p.getY(k) - (tip ? 0.22 : -0.05) * hh, p.getZ(k) * reach);
    }
    g.translate((r() - 0.5) * 0.05, y, (r() - 0.5) * 0.05);
    g.computeVertexNormals();
    P.push(paintHeight(g, lo.clone().lerp(hi, t * 0.5), hi.clone().lerp(C(0x3e6a44), t * 0.4), y - hh / 2, y + hh / 2, 1, snow));
  }
  return merge(P);
}

// a low undergrowth bush of 4–6 lumps
export function bush(v = 0) {
  const r = rng(501 + v * 389), P = [], n = 4 + v;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r(), d = r() * 0.45, s = 0.3 + r() * 0.18;
    P.push(lump(Math.cos(a) * d, s * 0.7, Math.sin(a) * d * 0.8, s * 1.2, s * 0.85, s, C(0x13241a), C(0x40603a), 700 + v * 13 + i, 0.25));
  }
  return merge(P);
}

// a heap of two or three uneven stones; moss (or snow) only on the faces turned to the sky
export function rock(v = 0, [a, b], top = null) {
  const r = rng(901 + v * 211), P = [];
  const stone = (x, y, z, sx, sy, sz, col, seed) => {
    const g = plain(new THREE.DodecahedronGeometry(1, 0)), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const ux = p.getX(i), uy = p.getY(i), uz = p.getZ(i), k = 1 + (h3(ux, uy, uz, seed) - 0.5) * 0.45;
      p.setXYZ(i, x + ux * sx * k, y + Math.max(uy * sy * k, -sy * 0.55), z + uz * sz * k); // flattened foot
    }
    g.computeVertexNormals();
    return paintHeight(g, C(col).multiplyScalar(0.62), C(col).multiplyScalar(1.12), y - sy, y + sy, 1, top ? { color: C(top), from: 0.62 } : null);
  };
  P.push(stone(0, 0.32, 0, 1, 0.6 + r() * 0.15, 0.82, a, 10 + v));
  P.push(stone(0.85 + r() * 0.15, 0.16, 0.2, 0.46, 0.36, 0.44, b, 20 + v));
  if (v !== 1) P.push(stone(-0.7, 0.12, -0.35, 0.36, 0.28, 0.34, b, 30 + v));
  return merge(P);
}
