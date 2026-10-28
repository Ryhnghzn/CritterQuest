// Building interiors (spec §15.1): a room seen from above with a tall back wall,
// themed furniture, shopkeepers and townsfolk, lit warmly from fireplaces,
// forges and cauldrons.
import { tr } from '../i18n.js';
import { townDef } from '../data/towns.js';
import { OUT } from '../art/sprites.js';
import { npcAt } from '../town/town.js';
import { TAU, ink, lin, shadow, shade, actor, tag, plate } from './paint.js';
import { levelRing, auraBack, auraFront, bestRarity } from '../art/aura.js';
import { drawNpc, doorFade } from './town.js';

const AMBIENT = 'rgba(10,6,22,.5)';
let daylight = 0; // 0 night … 1 day, for windows

function planks(scale) {
  const T = 96;
  const c = document.createElement('canvas');
  c.width = c.height = Math.ceil(T * scale);
  const g = c.getContext('2d');
  g.scale(c.width / T, c.height / T);
  let s = 5;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let row = 0; row < 6; row++) {
    const y = row * 16, tone = 70 + Math.floor(r() * 18);
    g.fillStyle = `rgb(${tone + 30},${tone},${tone - 30})`; g.fillRect(0, y, T, 16);
    g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(0, y + 1, T, 2);
    g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, y + 15, T, 1);
    const joint = Math.floor(r() * T);
    g.fillRect(joint, y, 1, 16);
    g.fillStyle = 'rgba(40,20,10,.35)';
    for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(r() * T, y + 4 + r() * 8, 3 + r() * 6, 0.6, 0, 0, TAU); g.fill(); }
  }
  return { canvas: c, T };
}

function flags(scale) {
  const T = 96;
  const c = document.createElement('canvas');
  c.width = c.height = Math.ceil(T * scale);
  const g = c.getContext('2d');
  g.scale(c.width / T, c.height / T);
  g.fillStyle = '#17141f'; g.fillRect(0, 0, T, T);
  let s = 9;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const tone = 48 + Math.floor(r() * 14), off = row % 2 ? 12 : 0;
      for (const ox of [0, -T]) {
        g.beginPath(); g.roundRect(col * 24 + off + ox + 1, row * 24 + 1, 22, 22, 4);
        g.fillStyle = `rgb(${tone},${tone - 3},${tone + 12})`; g.fill();
      }
    }
  }
  return { canvas: c, T };
}

export class InteriorRenderer {
  constructor(view, lighting) {
    this.view = view;
    this.lighting = lighting;
    this.walk = 0;
    view.onResize.push(() => this.rebake());
    this.rebake();
  }

  rebake() {
    const v = this.view;
    this.floors = {};
    for (const [k, make] of [['wood', planks], ['stone', flags]]) {
      const tile = make(v.S);
      const p = v.ctx.createPattern(tile.canvas, 'repeat');
      p.setTransform(new DOMMatrix().scale(tile.T / tile.canvas.width));
      this.floors[k] = p;
    }
  }

  // sky: town light from meta/clock.js skyAt — windows show day or night
  draw(town, t, avatar, sky) {
    daylight = sky ? 1 - sky.night : 0;
    const v = this.view, g = v.ctx, r = townDef(town.id).interiors[town.map];
    const clamp = (val, size, view) => (size <= view ? size / 2 : Math.max(view / 2 - 30, Math.min(size - view / 2 + 30, val)));
    const cx = clamp(town.x, r.w, v.viewW), cy = clamp(town.y - 20, r.h, v.viewH);

    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#07050f'; g.fillRect(0, 0, v.c.width, v.c.height);
    v.begin(cx, cy);
    g.lineJoin = 'round'; g.lineCap = 'butt';

    // floor, back wall, side walls
    g.fillStyle = this.floors[r.floor];
    g.fillRect(r.wall, r.back - 4, r.w - 2 * r.wall, r.h - r.back);
    const sh = g.createLinearGradient(0, r.back, 0, r.back + 30);
    sh.addColorStop(0, 'rgba(0,0,0,.45)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = sh; g.fillRect(r.wall, r.back - 4, r.w - 2 * r.wall, 34);
    backWall(g, r);
    for (const f of r.furniture) if (f.kind === 'rug') rug(g, f);

    // y-sorted: furniture, NPCs, player
    const items = [];
    for (const f of r.furniture) if (f.kind !== 'rug') items.push({ y: f.y + (f.h || 0), draw: () => furniture(g, f, t) });
    const npcs = r.npcs.map((n) => ({ n, ...npcAt(n, town.t) }));
    for (const p of npcs) items.push({ y: p.y, draw: () => drawNpc(g, p, t, town) });
    if (avatar) {
      const moving = Math.min(1, Math.hypot(town.moveX, town.moveY));
      this.walk += moving * 0.22;
      items.push({ y: town.y, draw: () => {
        levelRing(g, town.x, town.y + 10, avatar.level || 1, t, { lite: avatar.lite });
        auraBack(g, town.x, town.y + 10, avatar.fx, t, { host: this, lite: avatar.lite, best: bestRarity(avatar.look.gear), set: avatar.set, frenzyOn: false });
        actor(g, town.x, town.y, avatar.classId, avatar.look, { t, moving, walk: this.walk }, town.facing);
      } });
    }
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.draw();
    sideWalls(g, r);

    const lights = r.lights.map((l, i) => ({ ...l, r: l.r * (1 + Math.sin(t * 7 + i * 2) * 0.03), tint: 0.12 }));
    lights.push({ x: town.x, y: town.y - 10, r: 110, rgb: '255,220,180', tint: 0.03 });
    lights.push({ x: r.w / 2, y: r.h, r: 60, rgb: '120,130,220', tint: 0.05 });
    for (const f of r.furniture) if (f.kind === 'window' && daylight > 0.3) lights.push({ x: f.x + f.w / 2, y: f.y + f.h + 40, r: 150, rgb: '200,230,255', tint: 0.1 * daylight });
    this.lighting.draw(cx, cy, lights, AMBIENT);

    v.begin(cx, cy);
    glow(g, r, t);
    for (const p of npcs) tag(g, p.n, p.x, p.y, t, town.near === p.n);
    if (town && avatar) auraFront(g, town.x, town.y + 10, avatar.fx, bestRarity(avatar.look.gear), t, { host: this, lite: avatar.lite, level: avatar.level, set: avatar.set, facing: town.facing, frenzyOn: false });
    plate(g, tr('Keluar'), r.w / 2, r.h - 6, '#2a2440');
    v.vignetteOverlay();
    doorFade(v, town);
  }
}

function backWall(g, r) {
  g.beginPath(); g.rect(0, 0, r.w, r.back);
  ink(g, lin(g, 0, r.back, shade(r.wallColor, 1.15), shade(r.wallColor, 0.8)), 2);
  // beams and a wainscot
  g.fillStyle = 'rgba(0,0,0,.28)';
  for (let x = r.wall + 60; x < r.w - r.wall; x += 120) g.fillRect(x, 0, 8, r.back);
  g.beginPath(); g.rect(0, r.back - 18, r.w, 18); ink(g, lin(g, r.back - 18, r.back, '#5a4030', '#3a2a20'), 1.6);
  g.beginPath(); g.rect(0, 0, r.w, 6); g.fillStyle = OUT; g.fill();
}

function sideWalls(g, r) {
  const col = lin(g, 0, r.h, shade(r.wallColor, 0.7), shade(r.wallColor, 0.5));
  for (const x of [0, r.w - r.wall]) { g.beginPath(); g.rect(x, 0, r.wall, r.h); ink(g, col, 2); }
  const gap = r.doorW / 2;
  for (const [x, w] of [[0, r.w / 2 - gap], [r.w / 2 + gap, r.w / 2 - gap]]) {
    g.beginPath(); g.rect(x, r.h - r.wall, w, r.wall); ink(g, col, 2);
  }
  // doormat in the gap
  g.beginPath(); g.roundRect(r.w / 2 - gap + 6, r.h - r.wall - 4, r.doorW - 12, 10, 3); ink(g, '#7a3b2e', 1.2);
}

function rug(g, f) {
  g.beginPath(); g.ellipse(f.x + f.w / 2, f.y + f.h / 2, f.w / 2, f.h / 2, 0, 0, TAU);
  ink(g, f.color || '#7a2e3a', 1.4);
  g.beginPath(); g.ellipse(f.x + f.w / 2, f.y + f.h / 2, f.w / 2 - 7, f.h / 2 - 6, 0, 0, TAU);
  g.lineWidth = 2; g.strokeStyle = 'rgba(255,214,120,.45)'; g.stroke();
}

function box(g, x, y, w, h, top, front, depth = 10) {
  g.beginPath(); g.rect(x, y + depth, w, h - depth); ink(g, front, 1.5);
  g.beginPath(); g.rect(x, y, w, depth); ink(g, top, 1.5);
}

function furniture(g, f, t) {
  const { x, y, w = 0, h = 0 } = f;
  switch (f.kind) {
    case 'counter':
      shadow(g, x + w / 2, y + h + 2, w / 2, 4);
      box(g, x, y, w, h, '#8a5a36', lin(g, y, y + h, '#6a4228', '#4a2c1a'), 12);
      if (f.cloth) { g.beginPath(); g.rect(x + w * 0.3, y + 12, w * 0.4, h - 12); ink(g, f.cloth, 1.2); }
      for (let i = 0; i < 3; i++) { // little things on top
        g.beginPath(); g.roundRect(x + 14 + i * 22, y - 4, 8, 10, 2); ink(g, ['#ffd36b', '#c8874e', '#e6ecf5'][i], 1.1);
      }
      break;
    case 'fireplace':
      g.beginPath(); g.rect(x, y, w, h); ink(g, lin(g, y, y + h, '#6a6680', '#4a4660'), 2);
      g.beginPath(); g.moveTo(x + 18, y + h); g.lineTo(x + 18, y + 26); g.arc(x + w / 2, y + 26, w / 2 - 18, Math.PI, 0); g.lineTo(x + w - 18, y + h); g.closePath();
      g.fillStyle = '#140c10'; g.fill();
      g.beginPath(); g.rect(x - 6, y - 2, w + 12, 8); ink(g, '#5a4030', 1.4);
      break;
    case 'stairs':
      for (let i = 0; i < 6; i++) { g.beginPath(); g.rect(x, y + i * (h / 6), w, h / 6); ink(g, shade('#8a5a36', 1 - i * 0.07), 1.2); }
      break;
    case 'table':
      shadow(g, x + w / 2, y + h + 2, w / 2, 4);
      g.beginPath(); g.rect(x + 6, y + 14, 5, h - 14); g.rect(x + w - 11, y + 14, 5, h - 14); ink(g, '#4a2c1a', 1.2);
      g.beginPath(); g.ellipse(x + w / 2, y + 12, w / 2, 12, 0, 0, TAU); ink(g, lin(g, y, y + 24, '#a06a3e', '#7a4e2c'), 1.5);
      g.beginPath(); g.roundRect(x + w / 2 - 3, y + 2, 6, 9, 2); ink(g, '#fff3d0', 1); // candle
      g.beginPath(); g.roundRect(x + 8, y + 7, 8, 7, 2); ink(g, '#c8874e', 1);
      break;
    case 'stool':
      shadow(g, x, y + 4, 8, 2.5);
      g.beginPath(); g.ellipse(x, y - 4, 8, 4, 0, 0, TAU); ink(g, '#8a5a36', 1.2);
      g.beginPath(); g.rect(x - 5, y - 2, 3, 6); g.rect(x + 2, y - 2, 3, 6); ink(g, '#4a2c1a', 1);
      break;
    case 'barrel':
      shadow(g, x + w / 2, y + h, w / 2, 3);
      g.beginPath(); g.roundRect(x, y, w, h, 6); ink(g, lin(g, y, y + h, '#8a5a36', '#5a3820'), 1.5);
      g.strokeStyle = '#2f2c40'; g.lineWidth = 2;
      for (const yy of [y + 6, y + h - 7]) { g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke(); }
      if (f.water) { g.beginPath(); g.ellipse(x + w / 2, y + 3, w / 2 - 3, 3, 0, 0, TAU); ink(g, '#3f7ee0', 1); }
      break;
    case 'crate':
      shadow(g, x + w / 2, y + h, w / 2, 3);
      g.beginPath(); g.rect(x, y, w, h); ink(g, '#7a5236', 1.5);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y + h); g.moveTo(x + w, y); g.lineTo(x, y + h);
      g.lineWidth = 2; g.strokeStyle = '#4c3324'; g.stroke();
      break;
    case 'shelf':
      g.beginPath(); g.rect(x, y, w, h); ink(g, '#4a2c1a', 1.5);
      for (const sy of [y + h * 0.45, y + h - 4]) {
        g.beginPath(); g.rect(x - 2, sy, w + 4, 4); ink(g, '#8a5a36', 1.1);
        for (let i = 0; i < Math.floor(w / 14); i++) {
          const bx = x + 7 + i * 14;
          if (f.items === 'bottles') {
            const col = ['#ff6b8b', '#5ab0ff', '#4ee1a0', '#ffc27a', '#c9b8ff'][(i + Math.round(sy)) % 5];
            g.beginPath(); g.roundRect(bx - 1.5, sy - 16, 3, 4, 1); g.arc(bx, sy - 6, 5, 0, TAU); ink(g, col, 1);
          } else if (f.items === 'cloth') { // rolled bolts of cloth
            const col = ['#b33a3a', '#3f6b8a', '#d4a017', '#5a3a7a', '#2f6b4f'][(i + Math.round(sy)) % 5];
            g.beginPath(); g.roundRect(bx - 5, sy - 10, 10, 10, 4); ink(g, col, 1);
            g.beginPath(); g.arc(bx, sy - 5, 1.6, 0, TAU); g.fillStyle = 'rgba(0,0,0,.35)'; g.fill();
          } else if (f.items === 'boxes') {
            g.beginPath(); g.rect(bx - 6, sy - (i % 2 ? 9 : 12), 12, i % 2 ? 9 : 12); ink(g, i % 3 ? '#8a6a44' : '#a8845a', 1);
          } else if (f.items === 'crystals') { // glowing crystal clusters (glow drawn in the emissive pass)
            const col = ['#7ad6ff', '#c9a0ff', '#7affc2'][i % 3];
            g.beginPath(); g.moveTo(bx - 4, sy); g.lineTo(bx - 2, sy - 12); g.lineTo(bx + 1, sy - 3); g.lineTo(bx + 3, sy - 9); g.lineTo(bx + 5, sy); g.closePath(); ink(g, col, 1);
          } else {
            g.beginPath(); g.roundRect(bx - 4, sy - 11, 8, 11, 2); ink(g, i % 2 ? '#c8874e' : '#e6ecf5', 1);
          }
        }
      }
      break;
    case 'window':
      g.beginPath(); g.roundRect(x, y, w, h, [16, 16, 3, 3]);
      ink(g, daylight > 0.5 ? lin(g, y, y + h, '#9fd8ff', '#e8f4ff') : lin(g, y, y + h, '#2b3a78', '#141c40'), 2);
      g.fillStyle = daylight > 0.5 ? '#fff3b0' : '#e8ecff';
      g.beginPath(); g.arc(x + w * 0.7, y + h * 0.3, daylight > 0.5 ? 5 : 4, 0, TAU); g.fill(); // sun / moon
      g.strokeStyle = '#3a2620'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h); g.moveTo(x, y + h / 2); g.lineTo(x + w, y + h / 2); g.stroke();
      break;
    case 'herbs':
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y); g.lineWidth = 2; g.strokeStyle = '#4a2c1a'; g.stroke();
      for (let i = 0; i < 7; i++) {
        const hx = x + 8 + i * (w - 16) / 6;
        g.beginPath(); g.moveTo(hx, y); g.lineTo(hx, y + 8); g.lineWidth = 1; g.stroke();
        g.beginPath(); g.ellipse(hx, y + 15, 4, 8, Math.sin(t + i) * 0.1, 0, TAU); ink(g, ['#6aa84f', '#8fbf5a', '#b07ad6'][i % 3], 1);
      }
      break;
    case 'cauldron':
      shadow(g, x + w / 2, y + h, w / 2 + 4, 5);
      g.beginPath(); g.ellipse(x + w / 2, y + h * 0.45, w / 2, h * 0.55, 0, 0, Math.PI); g.lineTo(x, y + h * 0.4); g.closePath(); ink(g, '#2a2638', 1.8);
      g.beginPath(); g.ellipse(x + w / 2, y + h * 0.4, w / 2 - 2, 7, 0, 0, TAU); ink(g, '#46ff84', 1.4);
      for (const lx of [x + 8, x + w - 12]) { g.beginPath(); g.rect(lx, y + h - 4, 4, 6); ink(g, '#2a2638', 1); }
      break;
    case 'plant':
      shadow(g, x, y + 2, 10, 3);
      g.beginPath(); g.moveTo(x - 8, y - 12); g.lineTo(x + 8, y - 12); g.lineTo(x + 6, y + 2); g.lineTo(x - 6, y + 2); g.closePath(); ink(g, '#a0522d', 1.3);
      for (const a of [-0.8, -0.3, 0.2, 0.7]) { g.beginPath(); g.ellipse(x + Math.sin(a) * 9, y - 20, 4, 10, a, 0, TAU); ink(g, '#4f9a4e', 1.1); }
      break;
    case 'forge':
      g.beginPath(); g.rect(x, y, w, h); ink(g, lin(g, y, y + h, '#5a5670', '#3a3650'), 2);
      g.beginPath(); g.roundRect(x + 16, y + 30, w - 32, h - 38, [16, 16, 0, 0]); g.fillStyle = '#1a0a06'; g.fill();
      g.beginPath(); g.moveTo(x + 22, y); g.lineTo(x + w - 22, y); g.lineTo(x + w - 34, y - 20); g.lineTo(x + 34, y - 20); g.closePath(); ink(g, '#4a4660', 1.6);
      break;
    case 'anvil':
      shadow(g, x + w / 2, y + h + 2, w / 2 + 2, 4);
      g.beginPath(); g.rect(x + w / 2 - 8, y + 8, 16, h - 8); ink(g, '#6a4630', 1.3);
      g.beginPath(); g.moveTo(x - 4, y); g.lineTo(x + w + 6, y); g.lineTo(x + w - 2, y + 9); g.lineTo(x + 4, y + 9); g.closePath(); ink(g, lin(g, y, y + 9, '#8a8aa0', '#4a4866'), 1.5);
      break;
    case 'rack':
      g.beginPath(); g.rect(x, y + 10, w, 6); ink(g, '#6a4630', 1.3);
      for (let i = 0; i < 6; i++) {
        const sx = x + 14 + i * (w - 28) / 5;
        g.save(); g.translate(sx, y + 34);
        if (i % 3 === 2) { g.beginPath(); g.moveTo(0, -24); g.quadraticCurveTo(10, -6, 0, 12); g.lineWidth = 3; g.strokeStyle = '#c8874e'; g.stroke(); }
        else {
          g.beginPath(); g.moveTo(0, -26); g.lineTo(3, -20); g.lineTo(3, 6); g.lineTo(-3, 6); g.lineTo(-3, -20); g.closePath(); ink(g, '#d6dce8', 1.1);
          g.beginPath(); g.rect(-6, 6, 12, 3); ink(g, '#ffc94d', 1);
        }
        g.restore();
      }
      break;
    case 'armorstand':
      shadow(g, x + w / 2, y + h, w / 2 + 4, 4);
      g.beginPath(); g.rect(x + w / 2 - 2, y - 10, 4, h + 10); ink(g, '#4a2c1a', 1.1);
      g.beginPath(); g.moveTo(x - 4, y - 34); g.lineTo(x + w + 4, y - 34); g.lineTo(x + w, y - 6); g.lineTo(x, y - 6); g.closePath(); ink(g, lin(g, y - 34, y - 6, '#cfd6e4', '#7d879c'), 1.4);
      g.beginPath(); g.arc(x + w / 2, y - 42, 8, Math.PI, 0); g.lineTo(x + w / 2 + 8, y - 36); g.lineTo(x + w / 2 - 8, y - 36); g.closePath(); ink(g, '#a8b0c2', 1.3);
      break;
    case 'grind':
      shadow(g, x + w / 2, y + h, w / 2, 4);
      g.beginPath(); g.rect(x, y + 10, w, h - 10); ink(g, '#6a4630', 1.3);
      g.beginPath(); g.arc(x + w / 2, y + 6, 12, 0, TAU); ink(g, '#8a8aa0', 1.4);
      break;
    case 'board':
      g.beginPath(); g.rect(x, y, w, h); ink(g, '#8a5a36', 1.8);
      for (let i = 0; i < 5; i++) {
        const px = x + 8 + (i % 3) * 34, py = y + 6 + Math.floor(i / 3) * 24;
        g.beginPath(); g.rect(px, py, 26, 18); ink(g, '#f1e9d8', 1);
        g.beginPath(); g.arc(px + 13, py + 2, 1.8, 0, TAU); g.fillStyle = '#ff6b8b'; g.fill();
      }
      break;
    case 'trophy':
      g.beginPath(); g.ellipse(x + w / 2, y + h / 2 + 4, w / 2 - 2, h / 2 - 4, 0, 0, TAU); ink(g, '#6a4630', 1.6);
      g.beginPath(); g.ellipse(x + w / 2, y + h / 2 + 2, 16, 14, 0, 0, TAU); ink(g, '#8b4fc0', 1.5); // Raja Maw
      g.fillStyle = '#ffd36b';
      for (const ex of [-6, 6]) { g.beginPath(); g.arc(x + w / 2 + ex, y + h / 2, 2.6, 0, TAU); g.fill(); }
      g.beginPath(); g.moveTo(x + w / 2 - 8, y + h / 2 + 8); g.lineTo(x + w / 2 + 8, y + h / 2 + 8); g.lineWidth = 1.5; g.strokeStyle = OUT; g.stroke();
      break;
    case 'banner':
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y); g.lineTo(x + w, y + h); g.lineTo(x + w / 2, y + h - 10); g.lineTo(x, y + h); g.closePath();
      ink(g, f.color, 1.4);
      g.beginPath(); g.arc(x + w / 2, y + h * 0.4, 5, 0, TAU); ink(g, '#ffe3a1', 1);
      break;
    case 'desk':
      shadow(g, x + w / 2, y + h + 2, w / 2, 4);
      box(g, x, y, w, h, '#7a4e2c', '#5a3820', 10);
      g.beginPath(); g.rect(x + 16, y - 2, 18, 12); ink(g, '#f1e9d8', 1); // papers
      g.beginPath(); g.roundRect(x + w - 26, y - 6, 8, 12, 2); ink(g, '#3f7ee0', 1); // ink pot
      break;
    case 'longtable':
      shadow(g, x + w / 2, y + h + 2, w / 2, 5);
      box(g, x, y, w, h, lin(g, y, y + 14, '#a06a3e', '#8a5a36'), '#5a3820', 14);
      for (let i = 0; i < 5; i++) { g.beginPath(); g.roundRect(x + 20 + i * 44, y + 1, 8, 10, 2); ink(g, i % 2 ? '#c8874e' : '#ffd36b', 1); }
      break;
    case 'dummy': // straw training dummy
      shadow(g, x + w / 2, y + h, w / 2 + 2, 4);
      g.beginPath(); g.rect(x + w / 2 - 2, y - 6, 4, h + 6); ink(g, '#6a4630', 1.1);
      g.beginPath(); g.ellipse(x + w / 2, y - 14, 10, 13, 0, 0, TAU); ink(g, '#d9b25e', 1.4);
      g.beginPath(); g.arc(x + w / 2, y - 32, 7, 0, TAU); ink(g, '#d9b25e', 1.3);
      g.beginPath(); g.moveTo(x + w / 2 - 12, y - 18); g.lineTo(x + w / 2 + 12, y - 18); g.lineWidth = 3; g.strokeStyle = '#6a4630'; g.stroke();
      g.beginPath(); g.arc(x + w / 2, y - 14, 4, 0, TAU); g.lineWidth = 1.5; g.strokeStyle = '#c2185b'; g.stroke();
      break;
    case 'bench':
      g.beginPath(); g.rect(x, y, w, h); ink(g, '#6a4228', 1.2);
      break;
    case 'showcase': { // glass display case on legs, goods inside
      shadow(g, x + w / 2, y + h + 2, w / 2 + 2, 4);
      g.beginPath(); g.rect(x + 3, y + h - 12, 4, 12); g.rect(x + w - 7, y + h - 12, 4, 12); ink(g, '#4a2c1a', 1);
      box(g, x, y + 4, w, h - 14, '#8a5a36', lin(g, y, y + h, '#6a4228', '#4a2c1a'), 6);
      g.beginPath(); g.rect(x + 4, y - 10, w - 8, 18); g.fillStyle = 'rgba(150,200,255,.18)'; g.fill();
      g.lineWidth = 1.4; g.strokeStyle = 'rgba(200,230,255,.55)'; g.stroke();
      const n = Math.max(2, Math.floor((w - 12) / 16));
      for (let i = 0; i < n; i++) {
        const ix = x + 12 + i * ((w - 24) / Math.max(1, n - 1)), iy = y + 2;
        if (f.items === 'blades') {
          g.save(); g.translate(ix, iy); g.rotate(-0.5);
          g.beginPath(); g.moveTo(0, -9); g.lineTo(2, -6); g.lineTo(2, 4); g.lineTo(-2, 4); g.lineTo(-2, -6); g.closePath(); ink(g, '#d6dce8', 0.9);
          g.beginPath(); g.rect(-4, 4, 8, 2); ink(g, '#ffc94d', 0.8);
          g.restore();
        } else if (f.items === 'rings') {
          g.beginPath(); g.arc(ix, iy, 4, 0, TAU); g.lineWidth = 2; g.strokeStyle = '#ffd36b'; g.stroke();
          g.beginPath(); g.arc(ix, iy - 4, 2, 0, TAU); ink(g, ['#ff5a7a', '#5ab0ff', '#4ee1a0'][i % 3], 0.8);
        } else {
          g.beginPath(); g.moveTo(ix - 4, iy); g.lineTo(ix, iy - 5); g.lineTo(ix + 4, iy); g.lineTo(ix, iy + 5); g.closePath();
          ink(g, ['#ff5a7a', '#5ab0ff', '#4ee1a0', '#c9a0ff', '#ffd36b'][i % 5], 0.8);
        }
      }
      // glints sweeping across the glass
      const ph = (t * 0.4 + x * 0.01) % 1;
      g.beginPath(); g.moveTo(x + 4 + ph * (w - 16), y - 10); g.lineTo(x + 12 + ph * (w - 16), y - 10); g.lineTo(x + 4 + ph * (w - 16), y + 8); g.closePath();
      g.fillStyle = 'rgba(255,255,255,.25)'; g.fill();
      break;
    }
    case 'mannequin': { // a dummy wearing a breastplate and pauldrons
      const mx = x + w / 2;
      shadow(g, mx, y + h, w / 2 + 2, 4);
      g.beginPath(); g.ellipse(mx, y + h - 2, 10, 4, 0, 0, TAU); ink(g, '#4a2c1a', 1.1);
      g.beginPath(); g.rect(mx - 1.5, y - 6, 3, h); ink(g, '#4a2c1a', 1);
      g.beginPath(); g.moveTo(mx - 13, y - 40); g.lineTo(mx + 13, y - 40); g.lineTo(mx + 10, y - 8); g.lineTo(mx - 10, y - 8); g.closePath();
      ink(g, lin(g, y - 40, y - 8, '#c8cfdc', '#6d7790'), 1.4);
      g.beginPath(); g.moveTo(mx, y - 38); g.lineTo(mx, y - 10); g.lineWidth = 1; g.strokeStyle = 'rgba(0,0,0,.3)'; g.stroke();
      for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(mx + sx * 14, y - 38, 7, 5, sx * 0.3, 0, TAU); ink(g, '#a8b0c2', 1.2); }
      g.beginPath(); g.arc(mx, y - 48, 7, 0, TAU); ink(g, '#d9c8a8', 1.2);
      g.beginPath(); g.arc(mx, y - 24, 3, 0, TAU); g.fillStyle = '#5ab0ff'; g.fill();
      break;
    }
    case 'loom': // weaving loom with a half-finished cloth
      shadow(g, x + w / 2, y + h, w / 2, 4);
      g.beginPath(); g.rect(x, y - 20, 5, h + 20); g.rect(x + w - 5, y - 20, 5, h + 20); ink(g, '#6a4228', 1.2);
      g.beginPath(); g.rect(x - 3, y - 24, w + 6, 6); g.rect(x - 3, y + h - 12, w + 6, 6); ink(g, '#8a5a36', 1.2);
      g.beginPath(); g.rect(x + 8, y - 18, w - 16, h - 2); ink(g, lin(g, y - 18, y + h, '#8a3a6a', '#5a2a4a'), 1);
      g.strokeStyle = 'rgba(255,214,120,.45)'; g.lineWidth = 1;
      for (let yy = y - 12; yy < y + h - 14; yy += 6) { g.beginPath(); g.moveTo(x + 9, yy); g.lineTo(x + w - 9, yy); g.stroke(); }
      break;
    case 'chest': // big wooden chest with iron bands
      shadow(g, x + w / 2, y + h + 1, w / 2 + 2, 4);
      g.beginPath(); g.roundRect(x, y + 8, w, h - 8, 3); ink(g, lin(g, y + 8, y + h, '#8a5a36', '#5a3820'), 1.5);
      g.beginPath(); g.moveTo(x, y + 9); g.lineTo(x, y + 4); g.quadraticCurveTo(x + w / 2, y - 8, x + w, y + 4); g.lineTo(x + w, y + 9); g.closePath();
      ink(g, lin(g, y - 6, y + 9, '#a06a3e', '#7a4e2c'), 1.5);
      g.fillStyle = '#5a5a6e';
      for (const bx of [x + 6, x + w - 10]) g.fillRect(bx, y - 2, 4, h + 2);
      g.beginPath(); g.roundRect(x + w / 2 - 4, y + 6, 8, 9, 2); ink(g, '#ffc94d', 1);
      break;
    case 'sacks': // pile of grain / ore sacks
      for (const [ox, oy, rw, rh, c] of [[0.25, 0.65, 0.3, 0.4, '#a8845a'], [0.72, 0.68, 0.3, 0.38, '#9a7a50'], [0.5, 0.35, 0.3, 0.4, '#b8946a']]) {
        const sx = x + w * ox, sy = y + h * oy;
        shadow(g, sx, sy + h * rh * 0.8, w * rw, 3);
        g.beginPath(); g.ellipse(sx, sy, w * rw, h * rh, 0, 0, TAU); ink(g, c, 1.3);
        g.beginPath(); g.moveTo(sx - 4, sy - h * rh + 2); g.lineTo(sx + 4, sy - h * rh + 2); g.lineWidth = 2; g.strokeStyle = '#5a3820'; g.stroke();
      }
      break;
    default:
  }
}

// emissive: fire, forge, cauldron, candles
function glow(g, r, t) {
  g.save(); g.globalCompositeOperation = 'lighter';
  const flame = (x, y, s, ph, c0 = 'rgba(255,90,40,0)', c1 = 'rgba(255,140,50,.85)', c2 = 'rgba(255,230,140,.95)') => {
    const k = 1 + Math.sin(t * 11 + ph) * 0.12;
    g.beginPath(); g.moveTo(x, y - 22 * s * k);
    g.bezierCurveTo(x + 10 * s, y - 8 * s, x + 9 * s, y + 4 * s, x, y + 5 * s);
    g.bezierCurveTo(x - 9 * s, y + 4 * s, x - 10 * s, y - 8 * s, x, y - 22 * s * k);
    const gr = g.createLinearGradient(0, y - 22 * s, 0, y + 5 * s);
    gr.addColorStop(0, c0); gr.addColorStop(0.4, c1); gr.addColorStop(1, c2);
    g.fillStyle = gr; g.fill();
  };
  for (const f of r.furniture) {
    if (f.kind === 'fireplace') {
      const fx = f.x + f.w / 2, fy = f.y + f.h - 4;
      flame(fx - 9, fy, 0.9, 0); flame(fx + 9, fy, 0.8, 2); flame(fx, fy - 2, 1.15, 4);
    } else if (f.kind === 'forge') {
      const fx = f.x + f.w / 2, fy = f.y + f.h - 8;
      flame(fx - 14, fy, 0.8, 1); flame(fx + 14, fy, 0.8, 3); flame(fx, fy, 1.1, 5);
      for (let i = 0; i < 5; i++) {
        const ph = (t * 1.2 + i / 5) % 1;
        g.beginPath(); g.arc(fx + Math.sin(i * 7 + t * 3) * 18, fy - 10 - ph * 50, 1.5 * (1 - ph) + 0.3, 0, TAU);
        g.fillStyle = `rgba(255,170,80,${1 - ph})`; g.fill();
      }
    } else if (f.kind === 'cauldron') {
      const fx = f.x + f.w / 2, fy = f.y + f.h * 0.4;
      for (let i = 0; i < 5; i++) {
        const ph = (t * 0.7 + i / 5) % 1;
        g.beginPath(); g.arc(fx - 12 + i * 6, fy - ph * 26, 3 * (1 - ph) + 0.6, 0, TAU);
        g.fillStyle = `rgba(120,255,160,${(1 - ph) * 0.9})`; g.fill();
      }
    } else if (f.kind === 'table') {
      flame(f.x + f.w / 2, f.y + 1, 0.22, f.x);
    } else if (f.kind === 'showcase' || (f.kind === 'shelf' && f.items === 'crystals')) {
      for (let i = 0; i < 4; i++) { // twinkling star glints
        const ph = (t * 0.9 + i * 0.37 + f.x * 0.013) % 1, a = Math.sin(ph * Math.PI);
        const sx = f.x + 8 + ((i * 0.618 + f.y * 0.01) % 1) * (f.w - 16), sy = f.kind === 'shelf' ? f.y + f.h * (i % 2 ? 0.4 : 0.9) - 8 : f.y;
        g.fillStyle = `rgba(255,255,255,${(0.8 * a).toFixed(3)})`;
        g.beginPath(); g.moveTo(sx, sy - 4 * a); g.lineTo(sx + 1, sy - 1); g.lineTo(sx + 4 * a, sy); g.lineTo(sx + 1, sy + 1);
        g.lineTo(sx, sy + 4 * a); g.lineTo(sx - 1, sy + 1); g.lineTo(sx - 4 * a, sy); g.lineTo(sx - 1, sy - 1); g.closePath(); g.fill();
      }
      if (f.items === 'crystals') {
        const gr = g.createRadialGradient(f.x + f.w / 2, f.y + f.h / 2, 0, f.x + f.w / 2, f.y + f.h / 2, f.w / 2);
        gr.addColorStop(0, `rgba(120,200,255,${(0.12 + 0.05 * Math.sin(t * 2)).toFixed(3)})`); gr.addColorStop(1, 'rgba(120,200,255,0)');
        g.fillStyle = gr; g.fillRect(f.x, f.y - f.w / 2 + f.h / 2, f.w, f.w);
      }
    }
  }
  g.restore();
}
