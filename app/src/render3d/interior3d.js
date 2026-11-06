// Builds one building interior in 3D from its room data (data/town.js, data/towns.js),
// once per room (plan "Tampilan 2.5D" §3): a planked or flagstone floor, walls whose
// camera-side panels sink (a doll's house), furniture as simple shapes merged per
// material, and the warm glows of fireplaces, forges, cauldrons and candles.
import * as THREE from 'three';
import { S, toon, muted } from './stage.js';
import { GEO, glow, Batch, tileTexture, rnd, rgbCol } from './kit3d.js';
import { mountOf, roomPanels } from './townkit.js';

const TAU = Math.PI * 2;
export const ROOM_H = 96; // wall height, game units

const P = (B, geo, mat, cx, cy, y0, w, h, d, ry = 0, rx = 0, rz = 0) => B.add(geo, mat, cx * S, (y0 + h / 2) * S, cy * S, w * S, h * S, d * S, rx, ry, rz);
const light = (out, x, y, h, rgb, int, dist, kind = 'always') => out.lights.push({ x, y, h, color: rgbCol(rgb), int, dist, night: kind, ph: (x * 0.37 + y * 0.11) % 9 });

const FLOORS = {};
function floorTile(kind) {
  if (FLOORS[kind]) return FLOORS[kind];
  FLOORS[kind] = kind === 'wood'
    ? tileTexture(96, 256, (g, T) => {
      const r = rnd(5);
      for (let row = 0; row < 6; row++) {
        const y = row * 16, tone = 70 + Math.floor(r() * 18);
        g.fillStyle = `rgb(${tone + 34},${tone + 4},${tone - 26})`; g.fillRect(0, y, T, 16);
        g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(0, y + 1, T, 2);
        g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, y + 15, T, 1); g.fillRect(Math.floor(r() * T), y, 1, 16);
      }
    })
    : tileTexture(96, 256, (g, T) => {
      const r = rnd(9);
      g.fillStyle = '#1d1a26'; g.fillRect(0, 0, T, T);
      for (let row = 0; row < 4; row++) for (let c = 0; c < 4; c++) {
        const tone = 62 + Math.floor(r() * 16), off = row % 2 ? 12 : 0;
        for (const ox of [0, -T]) { g.beginPath(); g.roundRect(c * 24 + off + ox + 1, row * 24 + 1, 22, 22, 4); g.fillStyle = `rgb(${tone},${tone - 3},${tone + 12})`; g.fill(); }
      }
    });
  return FLOORS[kind];
}

// mats: shared materials from Town25 { roomWin, fireMat, glassMat }
export function buildRoom(r, mats) {
  const root = new THREE.Group(); root.name = `room:${r.id}`;
  const out = { r, root, panels: [], lights: [], flames: [], embers: [], doors: [] };
  // floor (under the walls too, so no gap shows at the edges)
  const tex = floorTile(r.floor).clone(); tex.repeat.set(r.w / 96, r.h / 96); tex.needsUpdate = true;
  const floor = new THREE.Mesh(GEO.plane, muted(new THREE.MeshLambertMaterial({ map: tex })));
  floor.rotation.x = -Math.PI / 2; floor.scale.set(r.w * S, (r.h - r.back + 20) * S, 1); floor.position.set(r.w / 2 * S, 0, (r.back - 20 + (r.h - r.back + 20) / 2) * S);
  root.add(floor);
  // the night outside the door
  const out2 = new THREE.Mesh(GEO.plane, new THREE.MeshBasicMaterial({ color: 0x07050f }));
  out2.rotation.x = -Math.PI / 2; out2.scale.set(r.w * 3 * S, 600 * S, 1); out2.position.set(r.w / 2 * S, -0.05, (r.h + 300) * S); root.add(out2);

  // walls: one group per panel (sinks as a whole); the back panel carries the wall furniture
  const wall = toon(r.wallColor, 0x2a1a3a, 'plaster'), trim = toon(new THREE.Color(r.wallColor).multiplyScalar(0.62).getHex(), 0, 'wood'), wains = toon(0x4a3426, 0, 'wood');
  const panels = roomPanels(r);
  panels.forEach((p, i) => {
    const grp = new THREE.Group(), B = new Batch();
    P(B, GEO.box, wall, (p.x0 + p.x1) / 2, (p.y0 + p.y1) / 2, 0, p.x1 - p.x0, ROOM_H, p.y1 - p.y0);
    P(B, GEO.box, trim, (p.x0 + p.x1) / 2, (p.y0 + p.y1) / 2, ROOM_H, p.x1 - p.x0 + 4, 6, p.y1 - p.y0 + 4);
    if (i === 0) { // back wall: wainscot and beams on its inner face
      P(B, GEO.box, wains, r.w / 2, r.back + 1, 0, r.w - 2 * r.wall, 26, 3);
      for (let x = r.wall + 60; x < r.w - r.wall; x += 120) P(B, GEO.box, trim, x, r.back + 1.5, 0, 9, ROOM_H, 4);
    }
    if (i === 3 || i === 4) { // door posts
      const dx = i === 3 ? p.x1 : p.x0;
      P(B, GEO.box, toon(0x3a2418), dx, (p.y0 + p.y1) / 2, 0, 6, ROOM_H, p.y1 - p.y0 + 4);
    }
    out.panels.push({ p, grp, B, k: 1 });
    root.add(grp);
  });
  // doormat
  const FB = new Batch();
  P(FB, GEO.box, toon(0x7a3b2e), r.w / 2, r.h - r.wall - 2, 0, r.doorW - 12, 1.5, 12);
  out.doors.push({ x: r.w / 2, y: r.h - r.wall + 4 });

  for (const f of r.furniture) furniture(f, r, mount(f, r), out, mats, FB, out.panels[0].B);
  for (const pn of out.panels) { pn.B.build(pn.grp); delete pn.B; }
  FB.build(root);
  for (const l of r.lights) light(out, l.x, Math.max(l.y, r.back + 24), 64, l.rgb, Math.min(9, 2 + l.r * 0.035), l.r * S * 1.6);
  for (const f of r.furniture) if (f.kind === 'window') light(out, f.x + f.w / 2, r.back + 30, 50, '200,230,255', 5, 7, 'day');
  root.traverse((o) => { if (o.isMesh && !o.userData.anim) { o.matrixAutoUpdate = false; o.updateMatrix(); } });
  return out;
}

const mount = (f, r) => mountOf(f, r);

function flame(out, parent, x, y, h, s, ph) {
  const g = new THREE.Group(); g.position.set(x * S, h * S, y * S); g.userData.flicker = ph; g.userData.anim = true;
  for (const [rr, hh, c, yy] of [[7, 22, 0xff6a2a, 11], [4.5, 15, 0xffb347, 8], [2.4, 9, 0xfff0b0, 5]]) {
    const m = new THREE.Mesh(GEO.cone, glow(c, 2)); m.scale.set(rr * 2 * s * S, hh * s * S, rr * 2 * s * S); m.position.y = yy * s * S; m.userData.anim = true; g.add(m);
  }
  parent.add(g); out.flames.push(g);
}

const WOOD = 0x6a4228, WOOD_D = 0x4a2c1a, WOOD_L = 0x8a5a36, METAL = 0x8a8aa0;
function furniture(f, r, m, out, mats, B, WB) {
  const { x, w = 0, h = 0 } = f;
  const cx = x + w / 2;
  if (m.wall) { wallPiece(f, r, m, out, mats, WB); return; }
  const y0 = m.y0, y1 = m.y1, cz = (y0 + y1) / 2, d = y1 - y0;
  switch (f.kind) {
    case 'counter': { // only the front strip, low: the keeper behind it stays in sight
      const dd = Math.min(d, 16), cz2 = y1 - dd / 2;
      P(B, GEO.box, toon(WOOD), cx, cz2, 0, w, 19, dd);
      P(B, GEO.box, toon(WOOD_L), cx, cz2, 19, w + 6, 3, dd + 6);
      if (f.cloth) P(B, GEO.box, toon(f.cloth), cx, y1 + 0.6, 4, w * 0.4, 16, 1.5);
      [0xffd36b, 0xc8874e, 0xe6ecf5].forEach((c, i) => P(B, GEO.cyl, toon(c), x + 16 + i * 22, cz2, 22, 6, 8, 6));
      break;
    }
    case 'fireplace': {
      const st = toon(0x6a6680, 0x3a2a5a);
      P(B, GEO.box, st, cx, cz, 0, w, 48, d);
      P(B, GEO.box, toon(0x5a5670), cx, (y0 + r.back) / 2, 48, w * 0.62, ROOM_H - 48, Math.max(14, d * 0.6));
      P(B, GEO.box, toon(0x140c10), cx, y1 + 0.5, 3, w - 36, 30, 2);
      P(B, GEO.box, toon(0x5a4030), cx, cz + 3, 48, w + 12, 5, d + 8);
      P(B, GEO.box, toon(0x2a1a12), cx, y1 + 4, 0, w - 40, 3, 8);
      flame(out, out.root, cx - 10, y1 + 4, 3, 0.8, 0); flame(out, out.root, cx + 10, y1 + 4, 3, 0.7, 2); flame(out, out.root, cx, y1 + 5, 3, 1.0, 4);
      out.embers.push({ x: cx, y: y1 + 4, h: 14, kind: 'ember', w: 20 });
      break;
    }
    case 'forge': {
      const st = toon(0x5a5670, 0x3a2a5a);
      P(B, GEO.box, st, cx, cz, 0, w, 26, d);
      P(B, GEO.box, toon(0x1a0a06), cx, cz + 4, 26, w - 16, 1, d - 12);
      P(B, GEO.cone4, toon(0x4a4660), cx, cz - 4, 52, w * 1.2, 34, d * 1.05, Math.PI / 4);
      P(B, GEO.box, toon(0x4a4660), cx, cz - 4, 80, w * 0.32, ROOM_H - 80, d * 0.32);
      for (const s2 of [-1, 1]) P(B, GEO.box, toon(0x3a3650), cx + s2 * (w / 2 - 6), cz, 26, 8, 28, 8);
      const coal = new THREE.Mesh(GEO.box, glow(0xff5a1a, 2.4)); coal.scale.set((w - 24) * S, 3 * S, (d - 20) * S); coal.position.set(cx * S, 27.5 * S, (cz + 4) * S); out.root.add(coal);
      flame(out, out.root, cx - 14, cz + 6, 27, 0.7, 1); flame(out, out.root, cx + 14, cz + 6, 27, 0.7, 3); flame(out, out.root, cx, cz + 6, 27, 1.0, 5);
      out.embers.push({ x: cx, y: cz + 6, h: 34, kind: 'spark', w: 30 });
      break;
    }
    case 'stairs':
      for (let i = 0; i < 6; i++) P(B, GEO.box, toon(new THREE.Color(WOOD_L).multiplyScalar(1 - i * 0.06).getHex()), cx, f.y + f.h - (i + 0.5) * (f.h / 6), 0, w, (i + 1) * 9, f.h / 6);
      break;
    case 'table':
      for (const s of [-1, 1]) P(B, GEO.box, toon(WOOD_D), cx + s * (w / 2 - 8), cz, 0, 4, 16, 4);
      P(B, GEO.round, toon(0xa06a3e), cx, cz, 16, w, 3, d);
      P(B, GEO.cyl6, toon(0xfff3d0), cx, cz, 19, 3, 6, 3);
      P(B, GEO.cyl, toon(0xc8874e), x + 12, cz + 4, 19, 6, 6, 6);
      flame(out, out.root, cx, cz, 25, 0.22, x);
      break;
    case 'stool':
      P(B, GEO.cyl, toon(WOOD_L), f.x, f.y, 10, 14, 3, 14);
      P(B, GEO.cyl6, toon(WOOD_D), f.x, f.y, 0, 5, 10, 5);
      break;
    case 'barrel':
      P(B, GEO.cyl, toon(WOOD_L), cx, cz, 0, w, 24, d);
      for (const hy of [5, 18]) P(B, GEO.cyl, toon(0x2f2c40), cx, cz, hy, w + 1.5, 2.5, d + 1.5);
      if (f.water) P(B, GEO.cyl, toon(0x3f7ee0), cx, cz, 24, w - 5, 0.5, d - 5);
      break;
    case 'crate':
      P(B, GEO.box, toon(0x7a5236), cx, cz, 0, w, w * 0.7, d);
      P(B, GEO.box, toon(0x4c3324), cx, cz, w * 0.35 - 2, w + 1, 4, d + 1);
      break;
    case 'cauldron':
      P(B, GEO.ball, toon(0x2a2638, 0x46ff84), cx, cz, 2, w, 20, d);
      P(B, GEO.cyl, toon(0x2a2638, 0x46ff84), cx, cz, 12, w * 0.92, 10, d * 0.92);
      for (const s of [-1, 1]) P(B, GEO.box, toon(0x2a2638), cx + s * (w / 2 - 8), cz, 0, 4, 10, 4);
      { const brew = new THREE.Mesh(GEO.disc, glow(0x46ff84, 1.6)); brew.rotation.x = -Math.PI / 2; brew.scale.set((w - 6) * S, (d - 6) * S, 1); brew.position.set(cx * S, 22.4 * S, cz * S); out.root.add(brew); }
      out.embers.push({ x: cx, y: cz, h: 22, kind: 'bubble', w: w * 0.5 });
      break;
    case 'plant':
      P(B, GEO.cyl, toon(0xa0522d), f.x, f.y, 0, 15, 14, 15);
      for (const a of [0, 1.6, 3.2, 4.8]) P(B, GEO.ball, toon(0x4f9a4e), f.x + Math.cos(a) * 5, f.y + Math.sin(a) * 4, 14, 9, 22, 9, a, 0.35);
      break;
    case 'anvil':
      P(B, GEO.box, toon(0x6a4630), cx, cz, 0, 16, 12, 16);
      P(B, GEO.box, toon(METAL, 0x9a9ab0), cx, cz, 12, w + 6, 8, d * 0.8);
      P(B, GEO.cone, toon(METAL), cx - w / 2 - 6, cz, 12, 8, 12, 8, 0, 0, Math.PI / 2);
      break;
    case 'armorstand':
      P(B, GEO.box, toon(WOOD_D), cx, cz, 0, 4, 34, 4);
      P(B, GEO.box, toon(0xb0b8ca, 0xffffff), cx, cz, 18, w + 6, 20, 10);
      P(B, GEO.ball, toon(0xa8b0c2), cx, cz, 38, 13, 13, 13);
      break;
    case 'grind':
      P(B, GEO.box, toon(0x6a4630), cx, cz, 0, w, 12, d);
      P(B, GEO.cyl, toon(METAL), cx, cz, 8, 22, 6, 22, 0, 0, Math.PI / 2);
      break;
    case 'desk':
      { const dd = Math.min(d, 18), cz2 = y1 - dd / 2;
        P(B, GEO.box, toon(0x5a3820), cx, cz2, 0, w, 17, dd);
        P(B, GEO.box, toon(0x7a4e2c), cx, cz2, 17, w + 4, 3, dd + 4);
        P(B, GEO.box, toon(0xf1e9d8), x + 24, cz2, 20, 18, 0.6, 10, 0.2);
        P(B, GEO.cyl, toon(0x3f7ee0), x + w - 22, cz2, 20, 6, 7, 6); }
      break;
    case 'longtable':
      for (const s of [-1, 1]) P(B, GEO.box, toon(WOOD_D), cx + s * (w / 2 - 12), cz, 0, 8, 16, d - 6);
      P(B, GEO.box, toon(0xa06a3e), cx, cz, 16, w, 4, d);
      for (let i = 0; i < 5; i++) P(B, GEO.cyl, toon(i % 2 ? 0xc8874e : 0xffd36b), x + 24 + i * 44, cz, 20, 6, 7, 6);
      break;
    case 'dummy':
      P(B, GEO.box, toon(0x6a4630), cx, cz, 0, 4, 30, 4);
      P(B, GEO.ball, toon(0xd9b25e), cx, cz, 14, 18, 22, 14);
      P(B, GEO.ball, toon(0xd9b25e), cx, cz, 36, 12, 12, 12);
      P(B, GEO.box, toon(0x6a4630), cx, cz, 30, 28, 4, 4);
      P(B, GEO.cyl, toon(0xc2185b), cx, cz + 7, 24, 7, 7, 1, 0, Math.PI / 2);
      break;
    case 'bench':
      P(B, GEO.box, toon(WOOD), cx, cz, 9, w, 3, Math.max(8, d));
      for (const s of [-1, 1]) P(B, GEO.box, toon(WOOD_D), cx + s * (w / 2 - 8), cz, 0, 4, 9, 6);
      break;
    case 'showcase': {
      for (const s of [-1, 1]) P(B, GEO.box, toon(WOOD_D), cx + s * (w / 2 - 5), cz, 0, 4, 8, d - 6);
      P(B, GEO.box, toon(WOOD), cx, cz, 8, w, 12, d);
      P(B, GEO.box, mats.glassMat, cx, cz, 20, w - 6, 10, d - 6);
      const n = Math.max(2, Math.floor((w - 12) / 16)), cols = f.items === 'rings' ? [0xffd36b] : [0xff5a7a, 0x5ab0ff, 0x4ee1a0, 0xc9a0ff, 0xffd36b];
      for (let i = 0; i < n; i++) {
        const ix = x + 12 + i * ((w - 24) / Math.max(1, n - 1));
        if (f.items === 'blades') P(B, GEO.box, toon(0xd6dce8), ix, cz, 21, 3, 2, d - 14, 0.5);
        else P(B, f.items === 'rings' ? GEO.cyl : GEO.cone4, glow(cols[i % cols.length], 1.2), ix, cz, 21, 6, f.items === 'rings' ? 2 : 7, 6);
      }
      break;
    }
    case 'mannequin':
      P(B, GEO.cyl, toon(WOOD_D), cx, cz, 0, 20, 3, 10);
      P(B, GEO.box, toon(WOOD_D), cx, cz, 0, 3, 20, 3);
      P(B, GEO.box, toon(0xc8cfdc, 0xffffff), cx, cz, 18, 22, 24, 10);
      for (const s of [-1, 1]) P(B, GEO.ball, toon(0xa8b0c2), cx + s * 12, cz, 38, 12, 8, 10);
      P(B, GEO.ball, toon(0xd9c8a8), cx, cz, 44, 11, 11, 11);
      P(B, GEO.disc, glow(0x5ab0ff, 1.4), cx, cz + 5.2, 28, 5, 5, 1);
      break;
    case 'loom':
      for (const s of [-1, 1]) P(B, GEO.box, toon(WOOD), cx + s * (w / 2 - 3), cz, 0, 5, 44, 5);
      for (const hy of [8, 40]) P(B, GEO.box, toon(WOOD_L), cx, cz, hy, w + 6, 4, 6);
      P(B, GEO.box, toon(0x8a3a6a), cx, cz, 12, w - 16, 28, 1.5);
      break;
    case 'chest':
      P(B, GEO.box, toon(WOOD_L), cx, cz, 0, w, 16, d);
      P(B, GEO.cyl, toon(0xa06a3e), cx, cz, 10, d, w, 12, 0, 0, Math.PI / 2);
      for (const s of [-1, 1]) P(B, GEO.box, toon(0x5a5a6e), cx + s * (w / 2 - 7), cz, 0, 4, 23, d + 1);
      P(B, GEO.box, toon(0xffc94d), cx, y1 + 0.5, 8, 8, 8, 2);
      break;
    case 'sacks':
      for (const [ox, oz, c] of [[0.25, 0.65, 0xa8845a], [0.72, 0.68, 0x9a7a50], [0.5, 0.35, 0xb8946a]]) P(B, GEO.ball, toon(c), x + w * ox, y0 + d * oz, 0, w * 0.55, 20, d * 0.7);
      break;
    case 'rug':
      P(B, GEO.round, toon(f.color || 0x7a2e3a), cx, f.y + h / 2, 0, w, 0.6, h);
      P(B, GEO.round, toon(0xc8a060), cx, f.y + h / 2, 0.2, w - 10, 0.6, h - 10);
      P(B, GEO.round, toon(f.color || 0x7a2e3a), cx, f.y + h / 2, 0.4, w - 16, 0.6, h - 16);
      break;
    default:
  }
}

// pieces hung on the back wall, between heights m.bottom and m.top
function wallPiece(f, r, m, out, mats, B) {
  const { x, w = 0 } = f, cx = x + w / 2, z = r.back, hh = m.top - m.bottom, mid = (m.top + m.bottom) / 2;
  switch (f.kind) {
    case 'shelf': {
      P(B, GEO.box, toon(WOOD_D), cx, z + 2, m.bottom, w, hh, 4);
      for (const sy of [m.bottom + 4, m.bottom + hh * 0.52]) {
        P(B, GEO.box, toon(WOOD_L), cx, z + 7, sy - 3, w + 4, 3, 12);
        for (let i = 0; i < Math.floor(w / 14); i++) {
          const bx = x + 7 + i * 14;
          if (f.items === 'bottles') P(B, GEO.ball, glow([0xff6b8b, 0x5ab0ff, 0x4ee1a0, 0xffc27a, 0xc9b8ff][(i + Math.round(sy)) % 5], 1.05), bx, z + 8, sy, 9, 11, 9);
          else if (f.items === 'cloth') P(B, GEO.cyl, toon([0xb33a3a, 0x3f6b8a, 0xd4a017, 0x5a3a7a, 0x2f6b4f][(i + Math.round(sy)) % 5]), bx, z + 8, sy, 10, 10, 10, 0, Math.PI / 2);
          else if (f.items === 'boxes') P(B, GEO.box, toon(i % 3 ? 0x8a6a44 : 0xa8845a), bx, z + 8, sy, 12, i % 2 ? 9 : 12, 10);
          else if (f.items === 'crystals') P(B, GEO.cone4, glow([0x7ad6ff, 0xc9a0ff, 0x7affc2][i % 3], 1.5), bx, z + 8, sy, 7, 13, 7);
          else P(B, GEO.cyl, toon(i % 2 ? 0xc8874e : 0xe6ecf5), bx, z + 8, sy, 6, 8, 6);
        }
      }
      if (f.items === 'crystals') light(out, cx, z + 20, mid, '120,200,255', 3, 4);
      break;
    }
    case 'window': {
      P(B, GEO.box, toon(0x3a2620), cx, z + 1.5, m.bottom - 3, w + 6, hh + 6, 3);
      const glass = new THREE.Mesh(GEO.plane, mats.roomWin); glass.scale.set(w * S, hh * S, 1); glass.position.set(cx * S, mid * S, (z + 3.2) * S); out.root.add(glass);
      P(B, GEO.box, toon(0x3a2620), cx, z + 3.6, m.bottom, 2.5, hh, 1.5);
      P(B, GEO.box, toon(0x3a2620), cx, z + 3.6, mid - 1.2, w, 2.5, 1.5);
      break;
    }
    case 'herbs':
      P(B, GEO.cyl6, toon(WOOD_D), cx, z + 6, m.top - 2, 3, w, 3, 0, 0, Math.PI / 2);
      for (let i = 0; i < 7; i++) P(B, GEO.ball, toon([0x6aa84f, 0x8fbf5a, 0xb07ad6][i % 3]), x + 8 + i * (w - 16) / 6, z + 6, m.top - 22, 8, 16, 8);
      break;
    case 'rack':
      P(B, GEO.box, toon(0x6a4630), cx, z + 3, m.top - 14, w, 6, 6);
      for (let i = 0; i < 6; i++) {
        const sx = x + 14 + i * (w - 28) / 5;
        if (i % 3 === 2) P(B, GEO.cyl6, toon(0xc8874e), sx, z + 5, m.bottom + 6, 3, hh - 14, 3, 0, 0, 0.18);
        else { P(B, GEO.box, toon(0xd6dce8, 0xffffff), sx, z + 5, m.bottom + 14, 5, hh - 22, 2); P(B, GEO.box, toon(0xffc94d), sx, z + 5, m.bottom + 8, 12, 3, 3); }
      }
      break;
    case 'board':
      P(B, GEO.box, toon(WOOD_L), cx, z + 2, m.bottom, w, hh, 4);
      for (let i = 0; i < 5; i++) {
        const px = x + 21 + (i % 3) * 34, py = m.top - 14 - Math.floor(i / 3) * 24;
        P(B, GEO.box, toon(0xf1e9d8), px, z + 4.4, py - 9, 26, 18, 0.6);
        P(B, GEO.ball, toon(0xff6b8b), px, z + 5, py + 6, 3, 3, 3);
      }
      break;
    case 'trophy':
      P(B, GEO.cyl, toon(0x6a4630), cx, z + 2, m.bottom, w - 4, hh, 3, 0, Math.PI / 2);
      P(B, GEO.ball, toon(0x8b4fc0), cx, z + 10, mid - 12, 32, 26, 16);
      for (const ex of [-6, 6]) P(B, GEO.ball, glow(0xffd36b, 1.4), cx + ex, z + 17, mid + 2, 5, 5, 3);
      break;
    case 'banner':
      P(B, GEO.box, toon(f.color || 0xb33a3a), cx, z + 2, m.bottom, w, hh, 1.5);
      P(B, GEO.box, toon(WOOD_D), cx, z + 3, m.top - 2, w + 6, 3, 3);
      P(B, GEO.disc, toon(0xffe3a1), cx, z + 3.2, mid + 4, 10, 10, 1);
      break;
    default:
  }
}
