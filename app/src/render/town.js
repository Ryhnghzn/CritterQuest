// Town rendering (spec §13.2): a night town of cobblestones and timber houses,
// lit by lamps, windows, torches and a bonfire. NPCs and the player are paper
// dolls drawn in y order; flames, portal and name tags glow over the darkness.
import { TOWN } from '../data/town.js';
import { drawIcon, OUT } from '../art/sprites.js';
import { npcAt } from '../town/town.js';
import { TAU, ink, lin, shadow, shade, actor, tag, plate } from './paint.js';
import { InteriorRenderer } from './interior.js';
import { skyAt } from '../meta/clock.js';
const WARM = '255,170,80';

const houses = TOWN.buildings.filter((b) => b.kind === 'house');
const gate = TOWN.buildings.find((b) => b.kind === 'gate');
const fire = TOWN.buildings.find((b) => b.kind === 'fire');
const fireX = fire.x + fire.w / 2, fireY = fire.y + fire.h / 2;
const windowsOf = (b) => {
  const wy = b.y + b.h * 0.62;
  return [{ x: b.x + 36, y: wy }, { x: b.x + b.w - 36, y: wy }];
};

// pines in the dark outside the walls (deterministic)
const PINES = [];
(function () {
  let s = 4242;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 90; i++) {
    const side = i % 4;
    const along = r(), out = 30 + r() * 160;
    const x = side === 0 ? along * TOWN.w : side === 1 ? along * TOWN.w : side === 2 ? -out : TOWN.w + out;
    const y = side === 0 ? -out : side === 1 ? TOWN.h + out : along * TOWN.h;
    PINES.push({ x, y, s: 0.8 + r() * 0.9 });
  }
  PINES.sort((a, b) => a.y - b.y);
})();

function stoneTile(scale) {
  const T = 96;
  const c = document.createElement('canvas');
  c.width = c.height = Math.ceil(T * scale);
  const g = c.getContext('2d');
  g.scale(c.width / T, c.height / T);
  g.fillStyle = '#1d1b2c'; g.fillRect(0, 0, T, T);
  let s = 77;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let row = 0; row < 8; row++) {
    const y = row * 12, shift = row % 2 ? 9 : 0;
    let x = 0;
    while (x < T) {
      const w = Math.min(T - x, 13 + Math.floor(r() * 9));
      const shade = 46 + Math.floor(r() * 14);
      for (const ox of [shift, shift - T]) {
        g.beginPath(); g.roundRect(x + ox + 0.8, y + 0.8, w - 1.6, 10.4, 3.5);
        g.fillStyle = `rgb(${shade - 4},${shade - 6},${shade + 16})`; g.fill();
        g.beginPath(); g.roundRect(x + ox + 2, y + 1.6, w - 5, 3, 1.5);
        g.fillStyle = 'rgba(255,255,255,.06)'; g.fill();
      }
      x += w;
    }
  }
  return { canvas: c, T };
}

export class TownRenderer {
  constructor(view, lighting) {
    this.view = view;
    this.lighting = lighting;
    this.camX = TOWN.spawn.x; this.camY = TOWN.spawn.y - 60;
    this.walk = 0;
    this.inside = new InteriorRenderer(view, lighting);
    view.onResize.push(() => this.rebake());
    this.rebake();
  }

  rebake() {
    const tile = stoneTile(this.view.S);
    this.ground = this.view.ctx.createPattern(tile.canvas, 'repeat');
    this.ground.setTransform(new DOMMatrix().scale(tile.T / tile.canvas.width));
  }

  screenToWorld(x, y) { return this.view.screenToWorld(x, y, this.camX, this.camY); }

  // town: state from town/town.js, or null behind the menus; avatar: { classId, look }
  // clock: in-game minutes (spec §18.4) — the town is lit by the hour
  draw(town, t, avatar, clock) {
    const sky = skyAt(clock);
    if (town && town.map !== 'town') { this.inside.draw(town, t, avatar, sky); return; }
    const v = this.view, g = v.ctx;
    let tx, ty;
    if (town) { tx = town.x; ty = town.y - 20; }
    else { tx = TOWN.spawn.x + Math.sin(t * 0.08) * 120; ty = 360 + Math.cos(t * 0.06) * 90; }
    // keep the camera over the town when the town is larger than the screen
    const clamp = (val, size, view) => (size <= view ? size / 2 : Math.max(view / 2 - 40, Math.min(size - view / 2 + 40, val)));
    tx = clamp(tx, TOWN.w, v.viewW); ty = clamp(ty, TOWN.h, v.viewH);
    const k = town ? 0.14 : 0.03;
    this.camX += (tx - this.camX) * k; this.camY += (ty - this.camY) * k;
    const cx = this.camX, cy = this.camY;

    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#0a0817'; g.fillRect(0, 0, v.c.width, v.c.height);
    v.begin(cx, cy);
    g.lineJoin = 'round';

    for (const p of PINES) if (p.y < 0) pine(g, p);
    g.fillStyle = this.ground; g.fillRect(0, 0, TOWN.w, TOWN.h);
    plaza(g);
    walls(g);
    for (const p of PINES) if (p.y >= 0 && (p.x < 0 || p.x > TOWN.w)) pine(g, p);
    for (const b of TOWN.buildings) {
      if (b.kind === 'house') house(g, b, t);
      else if (b.kind === 'fence') fence(g, b);
      else if (b.kind === 'gate') gateArch(g, b);
      else if (b.kind === 'stall') stall(g, b, t);
    }

    // y-sorted: decor, lamps, bonfire, NPCs, player
    const items = [];
    for (const d of TOWN.decor) items.push({ y: d.y, draw: () => decor(g, d) });
    for (const l of TOWN.lamps) items.push({ y: l.y, draw: () => lampPost(g, l) });
    items.push({ y: fireY + 8, draw: () => bonfireBase(g) });
    const nt = town ? town.t : t;
    const npcs = TOWN.npcs.map((n) => ({ n, ...npcAt(n, nt) }));
    for (const p of npcs) items.push({ y: p.y, draw: () => drawNpc(g, p, t, town) });
    if (town && avatar) {
      const moving = Math.min(1, Math.hypot(town.moveX, town.moveY));
      this.walk += moving * 0.22;
      items.push({ y: town.y, draw: () => actor(g, town.x, town.y, avatar.classId, avatar.look, { t, moving, walk: this.walk }, town.facing) });
    }
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.draw();
    for (const p of PINES) if (p.y > TOWN.h) pine(g, p);
    fog(g, t, sky.night);

    this.lighting.draw(cx, cy, lights(t, town, sky.night), `rgba(${sky.rgb.join(',')},${sky.dark.toFixed(3)})`);
    if (sky.night < 0.95) { // sunlight lifts the dark palette by day
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = 'screen';
      g.fillStyle = `rgba(255,236,200,${(0.22 * (1 - sky.night)).toFixed(3)})`; g.fillRect(0, 0, v.c.width, v.c.height);
      g.globalCompositeOperation = 'source-over';
    }
    if (sky.warm > 0.005) { // dawn / dusk glow
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = `rgba(255,130,60,${sky.warm.toFixed(3)})`; g.fillRect(0, 0, v.c.width, v.c.height);
      g.globalCompositeOperation = 'source-over';
    }

    // emissive layer
    v.begin(cx, cy);
    flames(g, t);
    portal(g, t);
    for (const p of npcs) tag(g, p.n, p.x, p.y, t, town?.near === p.n);
    v.vignetteOverlay();
    doorFade(v, town);
  }
}

// NPC paper doll at its current spot; standing ones face the player, strollers walk.
export function drawNpc(g, p, t, town) {
  const n = p.n;
  const facing = p.moving ? p.facing : town && town.x < p.x ? -1 : 1;
  actor(g, p.x, p.y, null, { ...n.look, outfit: n.outfit }, { t: t + n.x, moving: p.moving, walk: t * 5 * p.moving }, facing, n.scale || 1);
}

// brief black fade after walking through a door
export function doorFade(v, town) {
  if (!town || town.doorT <= 0) return;
  const g = v.ctx;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = `rgba(5,4,12,${Math.min(1, town.doorT / 0.35)})`;
  g.fillRect(0, 0, v.c.width, v.c.height);
}

// night: 0 (day) … 1 (night) — lamps and windows glow only after dark
function lights(t, town, night) {
  const f = 1 + Math.sin(t * 9) * 0.04 + Math.sin(t * 23) * 0.03;
  const out = lightList(t, town, f);
  for (const l of out) if (!l.always) l.tint *= night;
  return out;
}

function lightList(t, town, f) {
  const out = [{ x: fireX, y: fireY, r: 200 * f, rgb: WARM, tint: 0.16, always: true }];
  for (const l of TOWN.lamps) out.push({ x: l.x, y: l.y - 40, r: 130, rgb: WARM, tint: 0.1 });
  for (const b of houses) for (const w of windowsOf(b)) out.push({ x: w.x, y: w.y + 20, r: 70, rgb: WARM, tint: 0.08 });
  for (const b of houses) out.push({ x: b.x + b.w / 2, y: b.y + b.h + 10, r: 60, rgb: WARM, tint: 0.05 });
  for (const b of houses) {
    if (b.theme === 'potion') out.push({ x: b.x + b.w / 2 - 52, y: b.y + b.h, r: 70, rgb: '90,255,140', tint: 0.14 });
    if (b.theme === 'smith') out.push({ x: b.x + b.w - 45, y: b.y - 10, r: 70, rgb: '255,120,40', tint: 0.12 });
  }
  out.push({ x: gate.x + 18, y: gate.y + 4, r: 95 * f, rgb: WARM, tint: 0.12 });
  out.push({ x: gate.x + gate.w - 18, y: gate.y + 4, r: 95 * f, rgb: WARM, tint: 0.12 });
  out.push({ x: gate.x + gate.w / 2, y: gate.y + 55, r: 120, rgb: '150,100,255', tint: 0.16, always: true });
  if (town) out.push({ x: town.x, y: town.y - 10, r: 120, rgb: '255,220,180', tint: 0.04 });
  return out;
}


function plaza(g) {
  g.beginPath(); g.ellipse(fireX, fireY + 30, 190, 130, 0, 0, TAU);
  g.fillStyle = 'rgba(120,110,170,.10)'; g.fill();
  g.lineWidth = 3; g.strokeStyle = 'rgba(160,150,200,.12)'; g.stroke();
}

function walls(g) {
  const W = TOWN.w, H = TOWN.h, T = TOWN.wall;
  const block = (x, y, w, h) => {
    g.beginPath(); g.rect(x, y, w, h); ink(g, lin(g, y, y + h, '#4a4866', '#2c2a42'), 2);
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1;
    for (let yy = y + 10; yy < y + h; yy += 10) { g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke(); }
  };
  block(0, 0, W, T); block(0, H - T, W, T); block(0, 0, T, H); block(W - T, 0, T, H);
  for (let x = 0; x < W; x += 30) { g.beginPath(); g.rect(x + 4, -10, 18, 12); ink(g, '#4a4866', 1.5); }
}

function pine(g, p) {
  g.save(); g.translate(p.x, p.y); g.scale(p.s, p.s);
  g.beginPath(); g.moveTo(0, -70); g.lineTo(26, -10); g.lineTo(14, -10); g.lineTo(32, 20); g.lineTo(-32, 20); g.lineTo(-14, -10); g.lineTo(-26, -10); g.closePath();
  g.fillStyle = '#131126'; g.fill();
  g.restore();
}

function house(g, b, t) {
  const { x, y, w, h } = b;
  const roofBase = y + h * 0.46;
  // facade
  g.beginPath(); g.rect(x + 6, roofBase - 6, w - 12, y + h - roofBase + 6);
  ink(g, lin(g, roofBase, y + h, '#5a4438', '#3a2b25'), 2);
  g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1;
  for (let yy = roofBase + 8; yy < y + h; yy += 9) { g.beginPath(); g.moveTo(x + 7, yy); g.lineTo(x + w - 7, yy); g.stroke(); }
  g.fillStyle = '#2a1d19';
  for (const bx of [x + 6, x + w / 2 - 3, x + w - 12]) g.fillRect(bx, roofBase - 6, 6, y + h - roofBase + 6);
  // windows
  for (const wnd of windowsOf(b)) {
    g.beginPath(); g.roundRect(wnd.x - 16, wnd.y - 14, 32, 28, [10, 10, 3, 3]);
    ink(g, lin(g, wnd.y - 14, wnd.y + 14, '#ffe3a1', '#ff9d3c'), 2);
    g.strokeStyle = '#3a2620'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(wnd.x, wnd.y - 14); g.lineTo(wnd.x, wnd.y + 14); g.moveTo(wnd.x - 16, wnd.y + 1); g.lineTo(wnd.x + 16, wnd.y + 1); g.stroke();
    g.beginPath(); g.roundRect(wnd.x - 19, wnd.y + 13, 38, 5, 2); ink(g, '#4a3329', 1.2);
  }
  // door
  const dx = x + w / 2;
  g.beginPath(); g.roundRect(dx - 17, y + h - 50, 34, 50, [16, 16, 0, 0]); ink(g, lin(g, y + h - 50, y + h, '#7a4e30', '#4c2f1d'), 2);
  g.beginPath(); g.arc(dx + 9, y + h - 24, 2.2, 0, TAU); g.fillStyle = '#ffd36b'; g.fill();
  // roof with overhang and tiles
  g.beginPath();
  g.moveTo(x - 10, roofBase + 4); g.lineTo(x + w + 10, roofBase + 4);
  g.lineTo(x + w - 22, y + 6); g.lineTo(x + 22, y + 6); g.closePath();
  ink(g, lin(g, y, roofBase, shade(b.roof, 1.25), b.roof), 2.2);
  g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1.2;
  for (let yy = y + 18; yy < roofBase; yy += 12) {
    const k = (yy - y - 6) / (roofBase + 4 - y - 6);
    g.beginPath(); g.moveTo(x + 22 - 32 * k, yy); g.lineTo(x + w - 22 + 32 * k, yy); g.stroke();
  }
  // chimney + smoke
  g.beginPath(); g.rect(x + w - 54, y - 4, 18, 30); ink(g, '#4a4866', 1.8);
  for (let i = 0; i < 3; i++) {
    const ph = (t * 0.35 + i / 3) % 1;
    g.beginPath(); g.arc(x + w - 45 + Math.sin(ph * 6 + i) * 5, y - 10 - ph * 40, 5 + ph * 7, 0, TAU);
    g.fillStyle = `rgba(150,140,180,${0.22 * (1 - ph)})`; g.fill();
  }
  // hanging sign
  if (b.sign) {
    const sx = dx + 44, sy = y + h - 58;
    g.strokeStyle = '#2a1d19'; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(dx + 26, sy - 8); g.lineTo(sx + 14, sy - 8); g.stroke();
    g.beginPath(); g.moveTo(sx, sy - 8); g.lineTo(sx, sy - 2); g.stroke();
    g.beginPath(); g.roundRect(sx - 16, sy - 2, 32, 26, 6); ink(g, '#d9b98a', 1.8);
    g.save(); g.translate(sx, sy + 11); drawIcon(g, b.sign, 20); g.restore();
  }
  facade(g, b, t);
  plate(g, b.name, dx, y + h - 60);
}

// what makes each shop look like what it sells
function facade(g, b, t) {
  const { x, y, w, h } = b;
  const dx = x + w / 2, base = y + h;
  if (b.theme === 'inn') {
    // flower boxes and a lantern by the door
    for (const wnd of windowsOf(b)) {
      for (let i = 0; i < 4; i++) {
        g.beginPath(); g.arc(wnd.x - 13 + i * 8.5, wnd.y + 12, 3.2, 0, TAU);
        ink(g, ['#ff6b8b', '#ffd36b', '#ff9ab0', '#c9b8ff'][i], 1);
      }
    }
    g.beginPath(); g.moveTo(dx - 26, base - 44); g.lineTo(dx - 22, base - 44); g.stroke();
    g.beginPath(); g.roundRect(dx - 31, base - 44, 10, 13, 3); ink(g, '#ffd98a', 1.4);
  } else if (b.theme === 'potion') {
    // bubbling cauldron left of the door + hanging herbs
    const cx = dx - 52, cy = base + 10;
    shadow(g, cx, cy + 4, 15, 4);
    g.beginPath(); g.ellipse(cx, cy - 6, 15, 12, 0, 0, Math.PI); g.lineTo(cx - 15, cy - 8); g.closePath(); ink(g, '#2a2638', 1.6);
    g.beginPath(); g.ellipse(cx, cy - 8, 13, 4, 0, 0, TAU); ink(g, '#5aff8c', 1.2);
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.8 + i / 3) % 1;
      g.beginPath(); g.arc(cx - 6 + i * 6, cy - 10 - ph * 16, 2.4 * (1 - ph) + 0.5, 0, TAU);
      g.fillStyle = `rgba(140,255,170,${1 - ph})`; g.fill();
    }
    for (let i = 0; i < 4; i++) {
      const hx = x + 30 + i * 12;
      g.beginPath(); g.moveTo(hx, base - 80); g.lineTo(hx, base - 70); g.lineWidth = 1; g.strokeStyle = '#2a1d19'; g.stroke();
      g.beginPath(); g.ellipse(hx, base - 64, 3.5, 7, 0, 0, TAU); ink(g, i % 2 ? '#6aa84f' : '#8fbf5a', 1);
    }
  } else if (b.theme === 'smith') {
    // stone front, anvil and a glowing forge window
    g.save();
    g.beginPath(); g.rect(x + 6, y + h * 0.46 - 6, w - 12, h * 0.54 + 6); g.clip();
    g.fillStyle = 'rgba(70,72,90,.55)'; g.fillRect(x, y, w, h);
    g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 1;
    for (let yy = y + h * 0.46; yy < base; yy += 12) for (let xx = x + ((yy / 12) % 2) * 10; xx < x + w; xx += 20) { g.strokeRect(xx, yy, 20, 12); }
    g.restore();
    const ax = dx + 52, ay = base + 12;
    shadow(g, ax, ay + 2, 15, 4);
    g.beginPath(); g.moveTo(ax - 14, ay - 14); g.lineTo(ax + 16, ay - 14); g.lineTo(ax + 10, ay - 8); g.lineTo(ax + 5, ay - 8);
    g.lineTo(ax + 5, ay); g.lineTo(ax - 6, ay); g.lineTo(ax - 6, ay - 8); g.lineTo(ax - 14, ay - 10); g.closePath(); ink(g, '#4a4866', 1.5);
    for (let i = 0; i < 4; i++) {
      const ph = (t * 1.3 + i / 4) % 1;
      g.beginPath(); g.arc(x + w - 45 + Math.sin(i * 5 + t * 3) * 6, y - 8 - ph * 34, 1.4 * (1 - ph) + 0.4, 0, TAU);
      g.fillStyle = `rgba(255,170,80,${1 - ph})`; g.fill();
    }
  } else if (b.theme === 'guild') {
    // two banners and a shield crest over the door
    for (const [bx, col] of [[x + 22, '#b33a3a'], [x + w - 34, '#d4a017']]) {
      const sway = Math.sin(t * 1.5 + bx) * 1.5;
      g.beginPath(); g.moveTo(bx, base - 92); g.lineTo(bx + 12, base - 92); g.lineTo(bx + 12 + sway, base - 50); g.lineTo(bx + 6 + sway, base - 56); g.lineTo(bx + sway, base - 50); g.closePath();
      ink(g, col, 1.4);
    }
    g.save(); g.translate(dx, base - 78); drawIcon(g, 'arm', 18); g.restore();
  }
}


function fence(g, b) {
  g.fillStyle = '#4c3324';
  for (const yy of [b.y + 20, b.y + 45]) { g.beginPath(); g.rect(b.x - 2, yy, b.w + 4, 6); ink(g, '#6a4630', 1.2); }
  for (const xx of [b.x + 4, b.x + b.w - 10]) { g.beginPath(); g.roundRect(xx, b.y + 6, 6, b.h - 6, [3, 3, 0, 0]); ink(g, '#7a5236', 1.2); }
}

function gateArch(g, b) {
  const { x, y, w, h } = b;
  const cx = x + w / 2;
  // dark opening
  g.beginPath(); g.moveTo(x + 30, y + h); g.lineTo(x + 30, y + 50); g.arc(cx, y + 50, w / 2 - 30, Math.PI, 0); g.lineTo(x + w - 30, y + h); g.closePath();
  g.fillStyle = '#07051a'; g.fill();
  // arch stones
  g.beginPath(); g.arc(cx, y + 50, w / 2 - 10, Math.PI, 0); g.arc(cx, y + 50, w / 2 - 30, 0, Math.PI, true); g.closePath();
  ink(g, lin(g, y, y + 50, '#5d5a7a', '#3a3855'), 2);
  for (let i = 1; i < 8; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    g.beginPath(); g.moveTo(cx + Math.cos(a) * (w / 2 - 30), y + 50 + Math.sin(a) * (w / 2 - 30));
    g.lineTo(cx + Math.cos(a) * (w / 2 - 10), y + 50 + Math.sin(a) * (w / 2 - 10));
    g.lineWidth = 1.5; g.strokeStyle = 'rgba(0,0,0,.4)'; g.stroke();
  }
  // pillars
  for (const px of [x, x + w - 30]) {
    g.beginPath(); g.rect(px, y + 40, 30, h - 40); ink(g, lin(g, y + 40, y + h, '#56536f', '#34324b'), 2);
    g.beginPath(); g.rect(px - 4, y + 34, 38, 10); ink(g, '#625f80', 1.6);
    g.beginPath(); g.rect(px + 11, y + 14, 8, 22); ink(g, '#4c3324', 1.4); // torch handle
  }
}

// barber's stall: striped awning, mirror, chair, pole
function stall(g, b, t) {
  const { x, y, w, h } = b;
  shadow(g, x + w / 2, y + h + 4, w / 2 + 6, 6);
  g.beginPath(); g.rect(x + 4, y + 16, w - 8, h - 16); ink(g, lin(g, y + 16, y + h, '#6a4630', '#4a2c1a'), 1.8);
  g.beginPath(); g.roundRect(x + 14, y + 22, 26, 22, 4); ink(g, lin(g, y + 22, y + 44, '#d6ecff', '#8fb8e0'), 1.4); // mirror
  g.beginPath(); g.roundRect(x + w - 44, y + 30, 26, 18, 4); ink(g, '#c2185b', 1.4); // chair
  g.beginPath(); g.rect(x + w - 40, y + 22, 18, 10); ink(g, '#a8104a', 1.2);
  for (let i = 0; i < 6; i++) {  // awning
    g.beginPath(); g.moveTo(x + (i * w) / 6, y); g.lineTo(x + ((i + 1) * w) / 6, y); g.lineTo(x + ((i + 1) * w) / 6, y + 16);
    g.quadraticCurveTo(x + ((i + 0.5) * w) / 6, y + 22, x + (i * w) / 6, y + 16); g.closePath();
    ink(g, i % 2 ? '#f1e9d8' : '#e0527a', 1.3);
  }
  // spinning barber pole
  const px = x - 6;
  g.beginPath(); g.roundRect(px - 4, y + 2, 8, 34, 4); ink(g, '#f1e9d8', 1.4);
  g.save(); g.beginPath(); g.roundRect(px - 4, y + 2, 8, 34, 4); g.clip();
  for (let i = -2; i < 6; i++) {
    const yy = y + 2 + i * 9 + ((t * 12) % 9);
    g.beginPath(); g.moveTo(px - 5, yy); g.lineTo(px + 5, yy - 5); g.lineTo(px + 5, yy - 1); g.lineTo(px - 5, yy + 4); g.closePath();
    g.fillStyle = i % 2 ? '#e0527a' : '#3f7ee0'; g.fill();
  }
  g.restore();
  plate(g, b.name, x + w / 2, y - 10);
}

function lampPost(g, l) {
  shadow(g, l.x, l.y, 9, 3);
  g.beginPath(); g.roundRect(l.x - 2.5, l.y - 46, 5, 46, 2); ink(g, '#2f2c40', 1.4);
  g.beginPath(); g.roundRect(l.x - 8, l.y - 58, 16, 14, 3); ink(g, '#ffd98a', 1.6);
  g.beginPath(); g.moveTo(l.x - 10, l.y - 58); g.lineTo(l.x, l.y - 66); g.lineTo(l.x + 10, l.y - 58); g.closePath(); ink(g, '#2f2c40', 1.4);
}

function bonfireBase(g) {
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU;
    g.beginPath(); g.ellipse(fireX + Math.cos(a) * 22, fireY + 6 + Math.sin(a) * 12, 6, 4.5, 0, 0, TAU); ink(g, '#5a5872', 1.2);
  }
  for (const r of [-0.5, 0.5]) {
    g.save(); g.translate(fireX, fireY + 4); g.rotate(r);
    g.beginPath(); g.roundRect(-16, -3.5, 32, 7, 3.5); ink(g, '#6a4630', 1.3);
    g.restore();
  }
}

function flames(g, t) {
  g.save(); g.globalCompositeOperation = 'lighter';
  const flame = (x, y, s, ph) => {
    const k = 1 + Math.sin(t * 11 + ph) * 0.12;
    g.beginPath(); g.moveTo(x, y - 22 * s * k);
    g.bezierCurveTo(x + 10 * s, y - 8 * s, x + 9 * s, y + 4 * s, x, y + 5 * s);
    g.bezierCurveTo(x - 9 * s, y + 4 * s, x - 10 * s, y - 8 * s, x, y - 22 * s * k);
    const gr = g.createLinearGradient(0, y - 22 * s, 0, y + 5 * s);
    gr.addColorStop(0, 'rgba(255,90,40,0)'); gr.addColorStop(0.4, 'rgba(255,140,50,.85)'); gr.addColorStop(1, 'rgba(255,230,140,.95)');
    g.fillStyle = gr; g.fill();
  };
  flame(fireX - 7, fireY, 1, 0); flame(fireX + 7, fireY + 1, 0.9, 2); flame(fireX, fireY - 2, 1.3, 4);
  for (let i = 0; i < 6; i++) {
    const ph = (t * 0.7 + i / 6) % 1;
    g.beginPath(); g.arc(fireX + Math.sin(i * 7 + t * 2) * 10, fireY - 20 - ph * 50, 1.6 * (1 - ph), 0, TAU);
    g.fillStyle = `rgba(255,190,90,${1 - ph})`; g.fill();
  }
  for (const px of [gate.x + 15, gate.x + gate.w - 15]) flame(px, gate.y + 12, 0.55, px);
  for (const l of TOWN.lamps) {
    const gr = g.createRadialGradient(l.x, l.y - 51, 0, l.x, l.y - 51, 14);
    gr.addColorStop(0, 'rgba(255,220,140,.9)'); gr.addColorStop(1, 'rgba(255,180,80,0)');
    g.fillStyle = gr; g.fillRect(l.x - 14, l.y - 65, 28, 28);
  }
  g.restore();
}

function portal(g, t) {
  const cx = gate.x + gate.w / 2, cy = gate.y + 70, r = gate.w / 2 - 34;
  g.save();
  g.beginPath(); g.moveTo(gate.x + 34, gate.y + gate.h); g.lineTo(gate.x + 34, gate.y + 50); g.arc(cx, gate.y + 50, r, Math.PI, 0); g.lineTo(gate.x + gate.w - 34, gate.y + gate.h); g.closePath();
  g.clip();
  g.globalCompositeOperation = 'lighter';
  const gr = g.createRadialGradient(cx, cy, 4, cx, cy, 70);
  gr.addColorStop(0, 'rgba(200,160,255,.55)'); gr.addColorStop(1, 'rgba(90,40,200,.05)');
  g.fillStyle = gr; g.fillRect(gate.x, gate.y, gate.w, gate.h);
  for (let i = 0; i < 3; i++) {
    g.beginPath(); g.arc(cx, cy, 14 + i * 14, t * (1.5 + i * 0.4) + i, t * (1.5 + i * 0.4) + i + 2.2);
    g.lineWidth = 3; g.strokeStyle = 'rgba(190,150,255,.45)'; g.stroke();
  }
  g.restore();
}

function decor(g, d) {
  if (d.kind === 'barrel') {
    shadow(g, d.x, d.y + 2, 9, 3);
    g.beginPath(); g.roundRect(d.x - 9, d.y - 22, 18, 24, 6); ink(g, lin(g, d.y - 22, d.y, '#8a5a36', '#5a3820'), 1.5);
    g.strokeStyle = '#2f2c40'; g.lineWidth = 2;
    for (const yy of [d.y - 16, d.y - 5]) { g.beginPath(); g.moveTo(d.x - 9, yy); g.lineTo(d.x + 9, yy); g.stroke(); }
  } else if (d.kind === 'crate') {
    shadow(g, d.x, d.y + 2, 11, 3);
    g.beginPath(); g.rect(d.x - 11, d.y - 20, 22, 21); ink(g, '#7a5236', 1.5);
    g.beginPath(); g.moveTo(d.x - 11, d.y - 20); g.lineTo(d.x + 11, d.y + 1); g.moveTo(d.x + 11, d.y - 20); g.lineTo(d.x - 11, d.y + 1);
    g.lineWidth = 2; g.strokeStyle = '#4c3324'; g.stroke();
  } else if (d.kind === 'bench') {
    shadow(g, d.x, d.y + 2, 22, 3);
    g.beginPath(); g.roundRect(d.x - 22, d.y - 12, 44, 7, 3); ink(g, '#7a5236', 1.4);
    for (const xx of [d.x - 18, d.x + 14]) { g.beginPath(); g.rect(xx, d.y - 6, 4, 7); ink(g, '#4c3324', 1); }
  }
}



function fog(g, t, night = 1) {
  if (night < 0.05) return; // mist only after dark
  for (let i = 0; i < 4; i++) {
    const x = ((t * 8 + i * 300) % (TOWN.w + 400)) - 200, y = 150 + i * 160;
    const gr = g.createRadialGradient(x, y, 0, x, y, 160);
    gr.addColorStop(0, `rgba(140,130,190,${(0.07 * night).toFixed(3)})`); gr.addColorStop(1, 'rgba(140,130,190,0)');
    g.fillStyle = gr; g.fillRect(x - 160, y - 160, 320, 320);
  }
}
