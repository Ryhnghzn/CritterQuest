// Town rendering (spec §13.2): a night town of cobblestones and timber houses,
// lit by lamps, windows, torches and a bonfire. NPCs and the player are paper
// dolls drawn in y order; flames, portal and name tags glow over the darkness.
import { townDef } from '../data/towns.js';
import { drawIcon, OUT } from '../art/sprites.js';
import { npcAt } from '../town/town.js';
import { TAU, ink, lin, shadow, shade, actor, tag, plate } from './paint.js';
import { levelRing, auraBack, auraFront, bestRarity } from '../art/aura.js';
import { InteriorRenderer } from './interior.js';
import { skyAt } from '../meta/clock.js';
const WARM = '255,170,80';

const WALL_HOME = ['#4a4866', '#2c2a42'];
const windowsOf = (b) => {
  const wy = b.y + b.h * 0.62;
  return [{ x: b.x + 36, y: wy }, { x: b.x + b.w - 36, y: wy }];
};

// landmark features of the big towns (data/towns.js LAYOUTS); FLAT ones lie on the ground
const FEATURES = new Set(['bigtree', 'well', 'garden', 'pond', 'statue', 'tower', 'oasis', 'market', 'lava', 'bridge', 'monument']);
const FLAT = new Set(['lava', 'bridge', 'pond', 'oasis']);
const HEARTS = ['bigtree', 'pond', 'oasis', 'monument'];

// Everything derived from a town def, computed once per town.
const layouts = new Map();
function layoutOf(def) {
  let L = layouts.get(def.id);
  if (L) return L;
  const fire = def.buildings.find((b) => b.kind === 'fire') || null;
  const theme = def.theme || {};
  const feats = def.buildings.filter((b) => FEATURES.has(b.kind));
  // the heart of the plaza: the bonfire, or the town's landmark
  const heart = fire || feats.find((f) => HEARTS.includes(f.kind));
  const lava = feats.filter((f) => f.kind === 'lava');
  L = {
    def, theme,
    style: def.id === 'home' ? null : theme.biome,
    houses: def.buildings.filter((b) => b.kind === 'house'),
    gate: def.buildings.find((b) => b.kind === 'gate'),
    fire,
    fireX: heart ? heart.x + heart.w / 2 : def.spawn.x, fireY: heart ? heart.y + heart.h / 2 : def.spawn.y,
    flat: feats.filter((f) => FLAT.has(f.kind)),
    tall: feats.filter((f) => !FLAT.has(f.kind) || f.kind === 'oasis'),
    feats,
    // one continuous lava band under the bridges
    lavaBand: lava.length ? { x: Math.min(...lava.map((f) => f.x)), y: lava[0].y, w: Math.max(...lava.map((f) => f.x + f.w)) - Math.min(...lava.map((f) => f.x)), h: lava[0].h } : null,
    stones: def.npcs.filter((n) => n.object === 'stone'),
    trees: treesOf(def),
    wall: theme.wall || WALL_HOME,
    big: def.w > 1200,
  };
  layouts.set(def.id, L);
  return L;
}

// trees in the dark outside the walls (deterministic per town)
function treesOf(def) {
  const out = [];
  let s = def.id === 'home' ? 4242 : 4242 + def.id.length * 977 + def.id.charCodeAt(0) * 31;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const n = Math.round(90 * (def.w + def.h) / (960 + 780));
  for (let i = 0; i < n; i++) {
    const side = i % 4;
    const along = r(), out2 = 30 + r() * 160;
    const x = side === 0 ? along * def.w : side === 1 ? along * def.w : side === 2 ? -out2 : def.w + out2;
    const y = side === 0 ? -out2 : side === 1 ? def.h + out2 : along * def.h;
    out.push({ x, y, s: 0.8 + r() * 0.9, v: r() });
  }
  out.sort((a, b) => a.y - b.y);
  return out;
}

// stone: [r, g, b] base of the cobbles (themes); home keeps its violet-grey stones
function stoneTile(scale, theme) {
  const T = 96;
  const c = document.createElement('canvas');
  c.width = c.height = Math.ceil(T * scale);
  const g = c.getContext('2d');
  g.scale(c.width / T, c.height / T);
  g.fillStyle = theme.ground || '#1d1b2c'; g.fillRect(0, 0, T, T);
  let s = 77;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let row = 0; row < 8; row++) {
    const y = row * 12, shift = row % 2 ? 9 : 0;
    let x = 0;
    while (x < T) {
      const w = Math.min(T - x, 13 + Math.floor(r() * 9));
      const d = Math.floor(r() * 14);
      const col = theme.stone
        ? `rgb(${theme.stone[0] + d - 6},${theme.stone[1] + d - 6},${theme.stone[2] + d - 6})`
        : `rgb(${46 + d - 4},${46 + d - 6},${46 + d + 16})`;
      for (const ox of [shift, shift - T]) {
        g.beginPath(); g.roundRect(x + ox + 0.8, y + 0.8, w - 1.6, 10.4, 3.5);
        g.fillStyle = col; g.fill();
        g.beginPath(); g.roundRect(x + ox + 2, y + 1.6, w - 5, 3, 1.5);
        g.fillStyle = theme.snow ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.06)'; g.fill();
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
    const home = townDef('home');
    this.camX = home.spawn.x; this.camY = home.spawn.y - 60;
    this.walk = 0;
    this.lastId = null;
    this.inside = new InteriorRenderer(view, lighting);
    view.onResize.push(() => this.rebake());
    this.rebake();
  }

  rebake() { this.grounds = new Map(); }

  groundOf(def) {
    let p = this.grounds.get(def.id);
    if (!p) {
      const style = def.id === 'home' ? null : def.theme?.biome;
      const tile = GROUNDS[style] ? GROUNDS[style](this.view.S) : stoneTile(this.view.S, def.theme || {});
      p = this.view.ctx.createPattern(tile.canvas, 'repeat');
      p.setTransform(new DOMMatrix().scale(tile.T / tile.canvas.width));
      this.grounds.set(def.id, p);
    }
    return p;
  }

  screenToWorld(x, y) { return this.view.screenToWorld(x, y, this.camX, this.camY); }

  // town: state from town/town.js, or null behind the menus; avatar: { classId, look }
  // clock: in-game minutes (spec §18.4) — the town is lit by the hour
  // backdropId: which town shows behind the menus
  draw(town, t, avatar, clock, backdropId = 'home') {
    const sky = skyAt(clock);
    if (town && town.map !== 'town') { this.inside.draw(town, t, avatar, sky); return; }
    const def = townDef(town ? town.id : backdropId), L = layoutOf(def);
    const v = this.view, g = v.ctx;
    let tx, ty;
    if (town) { tx = town.x; ty = town.y - 20; }
    else { tx = def.spawn.x + Math.sin(t * 0.08) * 120; ty = def.spawn.y - 140 + Math.cos(t * 0.06) * 90; }
    // keep the camera over the town when the town is larger than the screen
    const clamp = (val, size, view) => (size <= view ? size / 2 : Math.max(view / 2 - 40, Math.min(size - view / 2 + 40, val)));
    tx = clamp(tx, def.w, v.viewW); ty = clamp(ty, def.h, v.viewH);
    const k = town ? 0.14 : 0.03;
    if (this.lastId !== def.id || Math.hypot(tx - this.camX, ty - this.camY) > 900) { this.camX = tx; this.camY = ty; }
    this.lastId = def.id;
    this.camX += (tx - this.camX) * k; this.camY += (ty - this.camY) * k;
    const cx = this.camX, cy = this.camY;
    // visible world rectangle (with a margin) for culling
    const vw = v.viewW / 2 + 120, vh = v.viewH / 2 + 160;
    const seen = (x, y, w = 0, h = 0) => x + w > cx - vw && x < cx + vw && y + h > cy - vh && y < cy + vh;

    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#0a0817'; g.fillRect(0, 0, v.c.width, v.c.height);
    v.begin(cx, cy);
    g.lineJoin = 'round';

    for (const p of L.trees) if (p.y < 0 && seen(p.x - 40, p.y - 80, 80, 110)) tree(g, p, L, t);
    g.fillStyle = this.groundOf(def); g.fillRect(0, 0, def.w, def.h);
    plaza(g, L);
    walls(g, L);
    for (const p of L.trees) if (p.y >= 0 && p.y <= def.h && (p.x < 0 || p.x > def.w) && seen(p.x - 40, p.y - 80, 80, 110)) tree(g, p, L, t);
    if (L.lavaBand && seen(L.lavaBand.x, L.lavaBand.y, L.lavaBand.w, L.lavaBand.h)) lavaBand(g, L.lavaBand, t);
    for (const f of L.flat) if (f.kind !== 'lava' && seen(f.x - 40, f.y - 40, f.w + 80, f.h + 80)) flatFeature(g, f, t);
    // y-sorted: decor, lamps, bonfire, NPCs, player — and in the big towns, where
    // people can walk behind them, the houses and stalls too
    const items = [];
    const sorted = def.id !== 'home';
    for (const b of def.buildings) {
      if (!seen(b.x - 20, b.y - 80, b.w + 40, b.h + 110)) continue;
      if (b.kind === 'house') {
        if (!sorted) { house(g, b, t, L); continue; }
        // see-through while the player stands behind it
        const behind = town && town.x > b.x - 10 && town.x < b.x + b.w + 10 && town.y < b.y + b.h - 10 && town.y > b.y - 60;
        items.push({ y: b.y + b.h, draw: () => { if (behind) g.globalAlpha = 0.45; house(g, b, t, L); g.globalAlpha = 1; } });
      }
      else if (b.kind === 'fence') fence(g, b);
      else if (b.kind === 'gate') gateArch(g, b, L);
      else if (b.kind === 'stall') { if (sorted) items.push({ y: b.y + b.h, draw: () => stall(g, b, t) }); else stall(g, b, t); }
    }
    for (const d of def.decor) if (seen(d.x - 30, d.y - 30, 60, 40)) items.push({ y: d.y, draw: () => decor(g, d) });
    for (const l of def.lamps) if (seen(l.x - 20, l.y - 70, 40, 80)) items.push({ y: l.y, draw: () => lampPost(g, l) });
    if (L.fire) items.push({ y: L.fireY + 8, draw: () => bonfireBase(g, L) });
    L.player = town && avatar ? { x: town.x, y: town.y } : null; // the canopy fades when the player walks under it
    for (const f of L.tall) if (seen(f.x - 200, f.y - 260, f.w + 400, f.h + 280)) items.push({ y: f.y + f.h, draw: () => tallFeature(g, f, t, L) });
    const nt = town ? town.t : t;
    const npcs = def.npcs.map((n) => ({ n, ...npcAt(n, nt) }));
    for (const p of npcs) if (seen(p.x - 40, p.y - 90, 80, 100)) items.push({ y: p.y, draw: () => drawNpc(g, p, t, town) });
    if (town && avatar) {
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
    for (const p of L.trees) if (p.y > def.h && seen(p.x - 40, p.y - 80, 80, 110)) tree(g, p, L, t);
    fog(g, t, sky.night, L);

    this.lighting.draw(cx, cy, lights(t, town, sky.night, L), `rgba(${sky.rgb.join(',')},${sky.dark.toFixed(3)})`);
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
    flames(g, t, L);
    portal(g, t, L);
    for (const f of L.feats) if (seen(f.x - 200, f.y - 260, f.w + 400, f.h + 280)) featureGlow(g, f, t, L);
    if (L.style) for (const b of L.houses) if (seen(b.x - 20, b.y - 80, b.w + 40, b.h + 110)) houseGlow(g, b, t, L);
    for (const p of npcs) if (p.n.object === 'stone') stoneGlow(g, p.x, p.y, t);
    for (const n of L.trees) if (L.theme.tree === 'charred' && n.v < 0.3 && seen(n.x - 40, n.y - 40, 80, 60)) emberRock(g, n, t);
    motes(g, t, L.theme.motes, cx, cy, v.viewW, v.viewH);
    for (const p of npcs) tag(g, p.n, p.x, p.y - (p.n.object === 'stone' ? 30 : 0), t, town?.near === p.n);
    if (town && avatar) auraFront(g, town.x, town.y + 10, avatar.fx, bestRarity(avatar.look.gear), t, { host: this, lite: avatar.lite, level: avatar.level, set: avatar.set, facing: town.facing, frenzyOn: false });
    v.vignetteOverlay();
    doorFade(v, town);
  }
}

// NPC paper doll at its current spot; standing ones face the player, strollers walk.
export function drawNpc(g, p, t, town) {
  const n = p.n;
  if (n.object === 'stone') { runeStone(g, p.x, p.y, t); return; }
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
function lights(t, town, night, L) {
  const f = 1 + Math.sin(t * 9) * 0.04 + Math.sin(t * 23) * 0.03;
  const out = lightList(t, town, f, L);
  for (const l of out) if (!l.always) l.tint *= night;
  return out;
}

function lightList(t, town, f, L) {
  const { houses, gate } = L;
  const out = L.fire ? [{ x: L.fireX, y: L.fireY, r: 200 * f, rgb: WARM, tint: 0.16, always: true }] : [];
  for (const ft of L.feats) featureLights(ft, f, out);
  for (const n of L.stones) out.push({ x: n.x, y: n.y - 30, r: 130 * f, rgb: '150,110,255', tint: 0.18, always: true });
  if (L.theme.tree === 'charred') for (const n of L.trees) if (n.v < 0.3) out.push({ x: n.x, y: n.y, r: 70, rgb: '255,110,40', tint: 0.1, always: true });
  for (const l of L.def.lamps) out.push({ x: l.x, y: l.y - 40, r: 130, rgb: WARM, tint: 0.1 });
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


function plaza(g, L) {
  if (L.style) { plazaStyled(g, L); return; }
  const k = L.big ? 1.6 : 1;
  g.beginPath(); g.ellipse(L.fireX, L.fireY + 30, 190 * k, 130 * k, 0, 0, TAU);
  g.fillStyle = 'rgba(120,110,170,.10)'; g.fill();
  g.lineWidth = 3; g.strokeStyle = 'rgba(160,150,200,.12)'; g.stroke();
}

function walls(g, L) {
  if (L.style) { wallsStyled(g, L); return; }
  const W = L.def.w, H = L.def.h, T = L.def.wall, [c0, c1] = L.wall;
  const block = (x, y, w, h) => {
    g.beginPath(); g.rect(x, y, w, h); ink(g, lin(g, y, y + h, c0, c1), 2);
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1;
    for (let yy = y + 10; yy < y + h; yy += 10) { g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke(); }
  };
  block(0, 0, W, T); block(0, H - T, W, T); block(0, 0, T, H); block(W - T, 0, T, H);
  for (let x = 0; x < W; x += 30) { g.beginPath(); g.rect(x + 4, -10, 18, 12); ink(g, c0, 1.5); }
  if (L.theme.snow) { // snow along the top of the north wall
    g.fillStyle = 'rgba(235,242,255,.85)';
    for (let x = 0; x < W; x += 30) { g.beginPath(); g.ellipse(x + 13, -10, 11, 3.5, 0, Math.PI, 0); g.fill(); }
  }
}

function pine(g, p) {
  g.save(); g.translate(p.x, p.y); g.scale(p.s, p.s);
  g.beginPath(); g.moveTo(0, -70); g.lineTo(26, -10); g.lineTo(14, -10); g.lineTo(32, 20); g.lineTo(-32, 20); g.lineTo(-14, -10); g.lineTo(-26, -10); g.closePath();
  g.fillStyle = '#131126'; g.fill();
  g.restore();
}

function tree(g, p, L, t) {
  const kind = L.theme.tree;
  if (!kind) { pine(g, p); return; }
  g.save(); g.translate(p.x, p.y); g.scale(p.s, p.s);
  if (kind === 'oak') {
    g.fillStyle = '#120f0c'; g.fillRect(-5, -10, 10, 30);
    for (const [ox, oy, r, c] of [[-16, -28, 22, '#0f1a12'], [16, -30, 22, '#0f1a12'], [0, -48, 26, '#132018'], [0, -26, 24, '#16241a']]) {
      g.beginPath(); g.arc(ox, oy, r, 0, TAU); g.fillStyle = c; g.fill();
    }
  } else if (kind === 'snowpine') {
    g.beginPath(); g.moveTo(0, -70); g.lineTo(26, -10); g.lineTo(14, -10); g.lineTo(32, 20); g.lineTo(-32, 20); g.lineTo(-14, -10); g.lineTo(-26, -10); g.closePath();
    g.fillStyle = '#16202e'; g.fill();
    g.fillStyle = 'rgba(220,232,250,.75)';
    g.beginPath(); g.moveTo(0, -70); g.lineTo(12, -44); g.quadraticCurveTo(0, -38, -12, -44); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(-26, -10); g.quadraticCurveTo(-18, -16, -10, -12); g.lineTo(-14, -10); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(26, -10); g.quadraticCurveTo(18, -16, 10, -12); g.lineTo(14, -10); g.closePath(); g.fill();
    g.beginPath(); g.ellipse(0, 20, 34, 5, 0, 0, TAU); g.fill();
  } else if (kind === 'palm') {
    if (p.v < 0.35) { // cactus
      g.fillStyle = '#1d2a1a';
      g.beginPath(); g.roundRect(-6, -46, 12, 66, 6); g.fill();
      g.beginPath(); g.roundRect(-20, -28, 8, 24, 4); g.roundRect(-20, -10, 16, 7, 3); g.fill();
      g.beginPath(); g.roundRect(12, -36, 8, 22, 4); g.roundRect(4, -20, 16, 7, 3); g.fill();
    } else {
      g.strokeStyle = '#1f150e'; g.lineWidth = 6; g.lineCap = 'round';
      g.beginPath(); g.moveTo(0, 20); g.quadraticCurveTo(8, -20, 4, -56); g.stroke();
      g.fillStyle = '#172414';
      const sway = Math.sin(t * 0.8 + p.x) * 0.06;
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i - 2.5) * 0.55 + sway;
        g.save(); g.translate(4, -56); g.rotate(a);
        g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(18, -8, 34, 6); g.quadraticCurveTo(18, 2, 0, 0); g.fill();
        g.restore();
      }
    }
  } else if (kind === 'charred') {
    if (p.v < 0.3) { // ember-cracked boulder (its glow is drawn in the emissive pass)
      g.beginPath(); g.moveTo(-22, 16); g.lineTo(-18, -8); g.lineTo(-4, -18); g.lineTo(14, -12); g.lineTo(22, 4); g.lineTo(16, 18); g.closePath();
      g.fillStyle = '#1a1210'; g.fill();
    } else {
      g.strokeStyle = '#0e0a09'; g.lineCap = 'round';
      g.lineWidth = 7; g.beginPath(); g.moveTo(0, 20); g.lineTo(-2, -40); g.stroke();
      g.lineWidth = 3.5;
      g.beginPath(); g.moveTo(-1, -10); g.lineTo(-20, -30); g.moveTo(-1, -24); g.lineTo(16, -46); g.moveTo(-2, -36); g.lineTo(-12, -60); g.moveTo(-14, -24); g.lineTo(-24, -26); g.stroke();
    }
  } else pine(g, p);
  g.restore();
}

// hot cracks in the charred boulders outside Baraapi
function emberRock(g, p, t) {
  g.save(); g.translate(p.x, p.y); g.scale(p.s, p.s);
  g.globalCompositeOperation = 'lighter';
  const a = 0.55 + 0.25 * Math.sin(t * 2 + p.x);
  g.strokeStyle = `rgba(255,120,40,${a.toFixed(2)})`; g.lineWidth = 1.8;
  g.beginPath(); g.moveTo(-14, 8); g.lineTo(-6, -2); g.lineTo(-8, -10); g.moveTo(-6, -2); g.lineTo(6, 2); g.lineTo(12, -6); g.stroke();
  g.restore();
}

// rune stone (teleport): a dark monolith with pulsing violet runes
function runeStone(g, x, y, t) {
  shadow(g, x, y + 2, 22, 6);
  g.beginPath(); g.ellipse(x, y, 26, 9, 0, 0, TAU); ink(g, '#3a3650', 1.6);
  g.beginPath(); g.moveTo(x - 15, y); g.lineTo(x - 18, y - 46); g.lineTo(x - 8, y - 66); g.lineTo(x + 9, y - 64); g.lineTo(x + 17, y - 44); g.lineTo(x + 14, y); g.closePath();
  ink(g, lin(g, y - 66, y, '#4a4666', '#24213a'), 2);
  g.beginPath(); g.moveTo(x - 8, y - 66); g.lineTo(x - 4, y - 40); g.lineTo(x - 15, y); g.lineWidth = 1; g.strokeStyle = 'rgba(255,255,255,.08)'; g.stroke();
}
function stoneGlow(g, x, y, t) {
  g.save(); g.globalCompositeOperation = 'lighter';
  const pulse = 0.55 + 0.45 * Math.sin(t * 2.4);
  const gr = g.createRadialGradient(x, y - 34, 0, x, y - 34, 46);
  gr.addColorStop(0, `rgba(170,130,255,${(0.35 * pulse).toFixed(3)})`); gr.addColorStop(1, 'rgba(120,80,255,0)');
  g.fillStyle = gr; g.fillRect(x - 46, y - 80, 92, 92);
  g.strokeStyle = `rgba(200,170,255,${(0.6 + 0.4 * pulse).toFixed(3)})`; g.lineWidth = 2; g.lineCap = 'round';
  g.beginPath(); // runes down the face
  g.moveTo(x - 4, y - 56); g.lineTo(x + 4, y - 50); g.lineTo(x - 4, y - 44);
  g.moveTo(x, y - 38); g.lineTo(x, y - 26); g.moveTo(x - 5, y - 32); g.lineTo(x + 5, y - 32);
  g.moveTo(x - 5, y - 18); g.lineTo(x, y - 12); g.lineTo(x + 5, y - 18);
  g.stroke();
  g.beginPath(); g.ellipse(x, y, 24 + pulse * 3, 8 + pulse, 0, 0, TAU); g.lineWidth = 1.5; g.strokeStyle = `rgba(160,120,255,${(0.5 * pulse).toFixed(3)})`; g.stroke();
  for (let i = 0; i < 6; i++) {
    const ph = (t * 0.5 + i / 6) % 1;
    g.beginPath(); g.arc(x + Math.sin(i * 5 + t) * 16, y - 4 - ph * 70, 1.8 * (1 - ph) + 0.4, 0, TAU);
    g.fillStyle = `rgba(190,160,255,${(1 - ph).toFixed(3)})`; g.fill();
  }
  g.restore();
}

function house(g, b, t, L) {
  if (L.style) { houseStyled(g, b, t, L); return; }
  const { x, y, w, h } = b;
  const roofBase = y + h * 0.46;
  // facade
  g.beginPath(); g.rect(x + 6, roofBase - 6, w - 12, y + h - roofBase + 6);
  ink(g, lin(g, roofBase, y + h, ...(L.theme.biome === 'desert' ? ['#9a7450', '#6a4c34'] : ['#5a4438', '#3a2b25'])), 2);
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
  if (L.theme.snow) { // a thin cap of snow on the ridge and the eaves
    g.beginPath(); g.moveTo(x + 18, y + 8); g.lineTo(x + w - 18, y + 8);
    g.quadraticCurveTo(x + w - 22, y + 20, x + w - 34, y + 16); g.quadraticCurveTo(x + w / 2, y + 22, x + 34, y + 16);
    g.quadraticCurveTo(x + 22, y + 20, x + 18, y + 8); g.closePath();
    g.fillStyle = 'rgba(232,240,255,.92)'; g.fill();
    g.beginPath(); g.roundRect(x - 10, roofBase + 1, w + 20, 5, 2.5); g.fillStyle = 'rgba(232,240,255,.8)'; g.fill();
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
  if (b.name) plate(g, b.name, dx, y + h - 60);
}

// what makes each shop look like what it sells
function facade(g, b, t, styled = false) {
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
    if (!styled) { // the big towns' houses have their own walls
      g.save();
      g.beginPath(); g.rect(x + 6, y + h * 0.46 - 6, w - 12, h * 0.54 + 6); g.clip();
      g.fillStyle = 'rgba(70,72,90,.55)'; g.fillRect(x, y, w, h);
      g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 1;
      for (let yy = y + h * 0.46; yy < base; yy += 12) for (let xx = x + ((yy / 12) % 2) * 10; xx < x + w; xx += 20) { g.strokeRect(xx, yy, 20, 12); }
      g.restore();
    }
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

function gateArch(g, b, L) {
  const { x, y, w, h } = b;
  const cx = x + w / 2;
  if (L.style) { gateStyled(g, b, L); return; }
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
    g.beginPath(); g.rect(px, y + 40, 30, h - 40); ink(g, L.theme.wall ? lin(g, y + 40, y + h, shade(L.wall[0], 1.15), shade(L.wall[1], 1.15)) : lin(g, y + 40, y + h, '#56536f', '#34324b'), 2);
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

function bonfireBase(g, L) {
  const { fireX, fireY } = L;
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

function flames(g, t, L) {
  const { fireX, fireY, gate } = L;
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
  if (L.fire) flame(fireX - 7, fireY, 1, 0), flame(fireX + 7, fireY + 1, 0.9, 2), flame(fireX, fireY - 2, 1.3, 4);
  for (let i = 0; i < (L.fire ? 6 : 0); i++) {
    const ph = (t * 0.7 + i / 6) % 1;
    g.beginPath(); g.arc(fireX + Math.sin(i * 7 + t * 2) * 10, fireY - 20 - ph * 50, 1.6 * (1 - ph), 0, TAU);
    g.fillStyle = `rgba(255,190,90,${1 - ph})`; g.fill();
  }
  for (const px of [gate.x + 15, gate.x + gate.w - 15]) flame(px, gate.y + 12, 0.55, px);
  for (const l of L.def.lamps) {
    const gr = g.createRadialGradient(l.x, l.y - 51, 0, l.x, l.y - 51, 14);
    gr.addColorStop(0, 'rgba(255,220,140,.9)'); gr.addColorStop(1, 'rgba(255,180,80,0)');
    g.fillStyle = gr; g.fillRect(l.x - 14, l.y - 65, 28, 28);
  }
  g.restore();
}

function portal(g, t, L) {
  const { gate } = L;
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



function fog(g, t, night, L) {
  if (night < 0.05) return; // mist only after dark
  const rgb = L.theme.mist || '140,130,190', n = Math.ceil((L.def.h - 140) / 160);
  for (let i = 0; i < n; i++) {
    const x = ((t * 8 + i * 300) % (L.def.w + 400)) - 200, y = 150 + i * 160;
    const gr = g.createRadialGradient(x, y, 0, x, y, 160);
    gr.addColorStop(0, `rgba(${rgb},${(0.07 * night).toFixed(3)})`); gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr; g.fillRect(x - 160, y - 160, 320, 320);
  }
}

// light drifting particles over the screen (themes): leaves & fireflies, snow, sand, embers.
// Deterministic in t; wrapped inside the visible world rectangle.
const MOTES = 36;
function motes(g, t, kind, cx, cy, vw, vh) {
  if (!kind) return;
  const x0 = cx - vw / 2, y0 = cy - vh / 2;
  const wrap = (v, size) => ((v % size) + size) % size;
  g.save();
  for (let i = 0; i < MOTES; i++) {
    const h = Math.sin(i * 12.9898 + 4.1) * 43758.5453, a = (i * 0.618034) % 1, b = h - Math.floor(h);
    let x, y;
    if (kind === 'snow') {
      x = x0 + wrap(a * vw + Math.sin(t * 0.7 + i) * 18 + t * 10, vw); y = y0 + wrap(b * vh + t * (22 + a * 18), vh);
      g.beginPath(); g.arc(x, y, 1.2 + a * 1.6, 0, TAU); g.fillStyle = 'rgba(240,246,255,.75)'; g.fill();
    } else if (kind === 'sand') {
      x = x0 + wrap(a * vw + t * (60 + b * 50), vw); y = y0 + wrap(b * vh + Math.sin(t * 1.3 + i) * 8, vh);
      g.beginPath(); g.ellipse(x, y, 2.6, 0.9, 0, 0, TAU); g.fillStyle = 'rgba(230,190,130,.45)'; g.fill();
    } else if (kind === 'ember') {
      g.globalCompositeOperation = 'lighter';
      x = x0 + wrap(a * vw + Math.sin(t * 0.9 + i * 2) * 14, vw); y = y0 + wrap(b * vh - t * (16 + a * 22), vh);
      const fl = 0.5 + 0.5 * Math.sin(t * 6 + i);
      g.beginPath(); g.arc(x, y, 1 + a * 1.4, 0, TAU); g.fillStyle = `rgba(255,${130 + Math.round(fl * 60)},60,${(0.45 + 0.4 * fl).toFixed(2)})`; g.fill();
    } else if (kind === 'leaf') {
      x = x0 + wrap(a * vw + t * 14 + Math.sin(t * 0.8 + i) * 22, vw); y = y0 + wrap(b * vh + t * (12 + a * 8), vh);
      if (i % 3 === 0) { // firefly
        g.globalCompositeOperation = 'lighter';
        const fl = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.7);
        g.beginPath(); g.arc(x, y, 1.6, 0, TAU); g.fillStyle = `rgba(200,255,140,${(0.25 + 0.6 * fl).toFixed(2)})`; g.fill();
        g.globalCompositeOperation = 'source-over';
      } else {
        g.save(); g.translate(x, y); g.rotate(t * 1.5 + i);
        g.beginPath(); g.ellipse(0, 0, 3.2, 1.6, 0, 0, TAU); g.fillStyle = i % 2 ? 'rgba(120,150,60,.6)' : 'rgba(170,120,50,.55)'; g.fill();
        g.restore();
      }
    }
  }
  g.restore();
}

// ——— the four big towns, each its own look (owner's request 2026-10-28) ———
// style = theme.biome: forest (Rimbawana), ice (Bekubara), desert (Pasirluas), volcano (Baraapi)

const rnd = (seed) => { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; };
function tileCanvas(scale, T, paint) {
  const c = document.createElement('canvas');
  c.width = c.height = Math.ceil(T * scale);
  const g = c.getContext('2d');
  g.scale(c.width / T, c.height / T);
  paint(g, T);
  return { canvas: c, T };
}
// draw a blob at (x, y) and its wrapped copies so the tile repeats seamlessly
function wrapped(g, T, x, y, r, draw) {
  for (const ox of [-T, 0, T]) for (const oy of [-T, 0, T]) {
    const px = x + ox, py = y + oy;
    if (px + r < 0 || px - r > T || py + r < 0 || py - r > T) continue;
    draw(px, py);
  }
}

const GROUNDS = {
  // forest floor: dark earth, moss patches, grass tufts, pebbles
  forest: (S) => tileCanvas(S, 160, (g, T) => {
    const r = rnd(311);
    g.fillStyle = '#211c14'; g.fillRect(0, 0, T, T);
    for (let i = 0; i < 14; i++) {
      const x = r() * T, y = r() * T, rad = 14 + r() * 26;
      wrapped(g, T, x, y, rad, (px, py) => { g.beginPath(); g.ellipse(px, py, rad, rad * 0.6, 0, 0, TAU); g.fillStyle = i % 3 ? 'rgba(40,70,36,.55)' : 'rgba(60,46,28,.5)'; g.fill(); });
    }
    g.strokeStyle = 'rgba(90,130,60,.55)'; g.lineWidth = 1.2; g.lineCap = 'round';
    for (let i = 0; i < 40; i++) {
      const x = r() * T, y = r() * T;
      wrapped(g, T, x, y, 6, (px, py) => { g.beginPath(); g.moveTo(px - 3, py); g.lineTo(px - 4, py - 5); g.moveTo(px, py); g.lineTo(px, py - 7); g.moveTo(px + 3, py); g.lineTo(px + 5, py - 5); g.stroke(); });
    }
    for (let i = 0; i < 10; i++) {
      const x = r() * T, y = r() * T, rad = 2 + r() * 3;
      wrapped(g, T, x, y, rad, (px, py) => { g.beginPath(); g.ellipse(px, py, rad * 1.3, rad, 0, 0, TAU); g.fillStyle = '#4a4438'; g.fill(); });
    }
  }),
  // snow over flagstones: pale drifts, stones peeking through
  ice: (S) => tileCanvas(S, 128, (g, T) => {
    const r = rnd(523);
    g.fillStyle = '#6f7d94'; g.fillRect(0, 0, T, T);
    for (let i = 0; i < 9; i++) {
      const x = r() * T, y = r() * T, w = 12 + r() * 16, h = 8 + r() * 8;
      wrapped(g, T, x, y, w, (px, py) => { g.beginPath(); g.roundRect(px - w / 2, py - h / 2, w, h, 3); g.fillStyle = '#4f5b70'; g.fill(); });
    }
    for (let i = 0; i < 12; i++) {
      const x = r() * T, y = r() * T, rad = 14 + r() * 22;
      wrapped(g, T, x, y, rad, (px, py) => { g.beginPath(); g.ellipse(px, py, rad, rad * 0.55, 0, 0, TAU); g.fillStyle = 'rgba(214,226,244,.3)'; g.fill(); });
    }
    g.fillStyle = 'rgba(255,255,255,.7)';
    for (let i = 0; i < 18; i++) { const x = r() * T, y = r() * T; g.fillRect(x, y, 1.4, 1.4); }
  }),
  // sand with wind ripples
  desert: (S) => tileCanvas(S, 160, (g, T) => {
    const r = rnd(97);
    g.fillStyle = '#8a6844'; g.fillRect(0, 0, T, T);
    for (let i = 0; i < 10; i++) {
      const x = r() * T, y = r() * T, rad = 18 + r() * 30;
      wrapped(g, T, x, y, rad, (px, py) => { g.beginPath(); g.ellipse(px, py, rad, rad * 0.5, 0, 0, TAU); g.fillStyle = i % 2 ? 'rgba(170,130,84,.35)' : 'rgba(100,72,44,.3)'; g.fill(); });
    }
    g.lineWidth = 1.4; g.lineCap = 'round';
    for (let row = 0; row < 10; row++) {
      const y0 = row * 16 + 6;
      g.strokeStyle = row % 2 ? 'rgba(60,40,24,.28)' : 'rgba(200,160,110,.3)';
      g.beginPath();
      for (let x = 0; x <= T; x += 8) { const y = y0 + Math.sin((x / T) * TAU * 2 + row) * 3; x ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
    }
  }),
  // cracked basalt slabs of uneven size with a few faint hot seams
  volcano: (S) => tileCanvas(S, 200, (g, T) => {
    const r = rnd(733);
    g.fillStyle = '#140e0d'; g.fillRect(0, 0, T, T);
    const n = 5, cell = T / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const cx = (i + 0.5) * cell + (r() - 0.5) * 14, cy = (j + 0.5) * cell + ((i % 2) - 0.5) * 10 + (r() - 0.5) * 10, rad = cell / 2 + 2;
      const sides = 5 + Math.floor(r() * 3), rot = r() * TAU;
      const pts = [];
      for (let k = 0; k < sides; k++) { const a = rot + (k / sides) * TAU; const rr = rad * (0.75 + r() * 0.3); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
      const d = Math.floor(r() * 12);
      wrapped(g, T, cx, cy, rad + 4, (px, py) => {
        g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(x - cx + px, y - cy + py) : g.moveTo(x - cx + px, y - cy + py))); g.closePath();
        g.fillStyle = `rgb(${42 + d},${31 + d},${29 + d})`; g.fill();
        g.strokeStyle = 'rgba(255,255,255,.04)'; g.lineWidth = 1; g.stroke();
      });
    }
    g.strokeStyle = 'rgba(220,90,30,.35)'; g.lineWidth = 1.2;
    for (let i = 0; i < 2; i++) { const x = 20 + r() * (T - 60), y = 20 + r() * (T - 60); g.beginPath(); g.moveTo(x, y); g.lineTo(x + 9, y + 6); g.lineTo(x + 13, y + 16); g.lineTo(x + 22, y + 19); g.stroke(); }
  }),
};

// plaza around the landmark + the main road to the gate, per style
const PAVE = { forest: '#4a4436', ice: '#5c687c', desert: '#a6825a', volcano: '#3a2c28' };
function plazaStyled(g, L) {
  const { def, gate, style } = L, cx = L.fireX, cy = L.fireY;
  const gx = gate.x + gate.w / 2, gy = gate.y + 10;
  const r = rnd(def.w + 17);
  g.save();
  if (style === 'forest') {
    // stepping-stone ring and path
    const stones = (x, y) => { g.beginPath(); g.ellipse(x, y, 13 + r() * 5, 8 + r() * 3, r(), 0, TAU); ink(g, PAVE.forest, 1); };
    for (let a = 0; a < TAU; a += 0.16) stones(cx + Math.cos(a) * 200, cy + 40 + Math.sin(a) * 140);
    for (let y = cy + 190; y < gy; y += 30) stones(gx + Math.sin(y * 0.02) * 14, y);
    for (const b of L.houses) stones(b.x + b.w / 2, b.y + b.h + 16);
  } else if (style === 'ice') {
    // a swept stone avenue down the middle, snow piled on its edges
    g.fillStyle = 'rgba(52,60,76,.85)'; g.fillRect(gx - 100, 40, 200, gy - 40);
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1;
    for (let y = 50; y < gy; y += 22) for (let x = gx - 100 + ((y / 22) % 2) * 20; x < gx + 100; x += 40) g.strokeRect(x, y, 40, 22);
    g.fillStyle = 'rgba(220,232,250,.55)';
    for (let y = 40; y < gy; y += 26) { g.beginPath(); g.ellipse(gx - 100, y, 10, 16, 0, 0, TAU); g.ellipse(gx + 100, y + 13, 10, 16, 0, 0, TAU); g.fill(); }
    g.beginPath(); g.ellipse(cx, cy, 230, 150, 0, 0, TAU); g.fillStyle = 'rgba(52,60,76,.85)'; g.fill();
  } else if (style === 'desert') {
    // tiled mosaic square around the oasis and a tiled road to the gate
    g.fillStyle = 'rgba(150,104,64,.9)'; g.fillRect(gx - 70, cy, 140, gy - cy);
    g.beginPath(); g.roundRect(cx - 330, cy - 200, 660, 420, 30); g.fillStyle = 'rgba(150,104,64,.9)'; g.fill();
    g.strokeStyle = 'rgba(60,36,20,.35)'; g.lineWidth = 1;
    for (let y = cy - 200; y < cy + 220; y += 20) { g.beginPath(); g.moveTo(cx - 330, y); g.lineTo(cx + 330, y); g.stroke(); }
    for (let x = cx - 330; x < cx + 330; x += 20) { g.beginPath(); g.moveTo(x, cy - 200); g.lineTo(x, cy + 220); g.stroke(); }
    for (let y = cy + 220; y < gy; y += 20) { g.beginPath(); g.moveTo(gx - 70, y); g.lineTo(gx + 70, y); g.stroke(); }
    for (let x = gx - 70; x <= gx + 70; x += 20) { g.beginPath(); g.moveTo(x, cy + 220); g.lineTo(x, gy); g.stroke(); }
    g.strokeStyle = 'rgba(40,110,120,.55)'; g.lineWidth = 6; g.beginPath(); g.roundRect(cx - 310, cy - 180, 620, 380, 24); g.stroke();
    g.strokeStyle = 'rgba(200,150,60,.5)'; g.lineWidth = 3; g.beginPath(); g.roundRect(cx - 296, cy - 166, 592, 352, 20); g.stroke();
  } else if (style === 'volcano') {
    // basalt slab circle round the bonfire, a slab road on each bank
    g.beginPath(); g.arc(cx, cy, 170, 0, TAU); g.fillStyle = 'rgba(60,44,40,.9)'; g.fill();
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * 170, cy + Math.sin(a) * 170); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.5; g.stroke(); }
    for (const rr of [60, 115, 170]) { g.beginPath(); g.arc(cx, cy, rr, 0, TAU); g.stroke(); }
    g.fillStyle = 'rgba(52,38,34,.9)';
    g.fillRect(gx - 60, cy + 120, 120, gy - cy - 120);
    g.fillRect(60, 300, def.w - 120, 90);
    g.strokeStyle = 'rgba(0,0,0,.3)';
    for (let x = 60; x < def.w - 60; x += 45) { g.beginPath(); g.moveTo(x, 300); g.lineTo(x, 390); g.stroke(); }
  }
  g.restore();
}

// outer walls per style; the gate is drawn over the south wall afterwards
function wallsStyled(g, L) {
  const W = L.def.w, H = L.def.h, T = L.def.wall, style = L.style;
  if (style === 'forest') {
    // palisade of sharpened logs
    const stake = (x, y, h) => {
      g.beginPath(); g.moveTo(x - 6, y); g.lineTo(x - 6, y - h + 8); g.lineTo(x, y - h); g.lineTo(x + 6, y - h + 8); g.lineTo(x + 6, y); g.closePath();
      ink(g, lin(g, y - h, y, '#7a5a38', '#3e2a1a'), 1.4);
    };
    g.fillStyle = '#2e2014'; g.fillRect(0, 0, T, H); g.fillRect(W - T, 0, T, H);
    for (let y = 0; y < H; y += 13) for (const x of [T / 2, W - T / 2]) { g.beginPath(); g.arc(x, y + 6, 6, 0, TAU); ink(g, '#6a4a2c', 1.2); g.beginPath(); g.arc(x, y + 6, 2.5, 0, TAU); g.fillStyle = '#4a3220'; g.fill(); }
    for (let x = 6; x < W; x += 13) stake(x, T, 52);
    for (let x = 6; x < W; x += 13) stake(x, H, 40);
    g.strokeStyle = '#2a1c10'; g.lineWidth = 3;
    for (const y of [T - 12, H - 14]) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  } else if (style === 'ice') {
    // thick fortress wall with merlons and snow on top
    const block = (x, y, w, h) => {
      g.beginPath(); g.rect(x, y, w, h); ink(g, lin(g, y, y + h, '#7a88a0', '#46536a'), 2);
      g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 1;
      for (let yy = y + 12; yy < y + h; yy += 12) { g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke(); }
    };
    block(0, -24, W, T + 24); block(0, H - T, W, T); block(0, 0, T, H); block(W - T, 0, T, H);
    for (let x = 0; x < W; x += 36) { g.beginPath(); g.rect(x + 6, -46, 22, 24); ink(g, '#7a88a0', 1.6); g.beginPath(); g.ellipse(x + 17, -46, 13, 4, 0, Math.PI, 0); g.fillStyle = 'rgba(238,244,255,.92)'; g.fill(); }
    g.fillStyle = 'rgba(238,244,255,.8)';
    g.fillRect(0, -26, W, 4); g.fillRect(0, H - T - 2, W, 4); g.fillRect(2, 0, 4, H); g.fillRect(W - 6, 0, 4, H);
  } else if (style === 'desert') {
    // low mud-brick wall with rounded crenels
    const mud = (x, y, w, h) => { g.beginPath(); g.roundRect(x, y, w, h, 6); ink(g, lin(g, y, y + h, '#b88c5c', '#7a5634'), 1.8); };
    mud(0, -8, W, T + 8); mud(0, H - T, W, T); mud(0, 0, T, H); mud(W - T, 0, T, H);
    for (let x = 4; x < W; x += 34) { g.beginPath(); g.moveTo(x, -6); g.lineTo(x, -16); g.arc(x + 12, -16, 12, Math.PI, 0); g.lineTo(x + 24, -6); g.closePath(); ink(g, '#b88c5c', 1.4); }
    g.strokeStyle = 'rgba(70,44,24,.35)'; g.lineWidth = 1;
    for (let x = 20; x < W; x += 60) { g.beginPath(); g.moveTo(x, 2); g.lineTo(x + 6, T - 4); g.stroke(); }
  } else if (style === 'volcano') {
    // dark basalt blocks with hot seams
    const block = (x, y, w, h) => {
      g.beginPath(); g.rect(x, y, w, h); ink(g, lin(g, y, y + h, '#4a3632', '#241816'), 2);
      g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 1;
      for (let yy = y + 14; yy < y + h; yy += 14) for (let xx = x + ((yy / 14) % 2) * 18; xx < x + w; xx += 36) g.strokeRect(xx, yy - 14, 36, 14);
    };
    block(0, -18, W, T + 18); block(0, H - T, W, T); block(0, 0, T, H); block(W - T, 0, T, H);
    for (let x = 0; x < W; x += 40) { g.beginPath(); g.moveTo(x + 4, -18); g.lineTo(x + 10, -34); g.lineTo(x + 30, -34); g.lineTo(x + 36, -18); g.closePath(); ink(g, '#3a2a26', 1.5); }
    g.strokeStyle = 'rgba(255,110,40,.7)'; g.lineWidth = 1.4;
    for (let x = 30; x < W; x += 110) { g.beginPath(); g.moveTo(x, -16); g.lineTo(x + 6, -4); g.lineTo(x + 2, 8); g.lineTo(x + 9, 20); g.stroke(); }
  }
}

// ——— houses ———
function houseStyled(g, b, t, L) {
  const { x, y, w, h } = b, dx = x + w / 2, base = y + h;
  shadow(g, dx, base + 2, w / 2 + 6, 8);
  if (L.style === 'forest') hut(g, b, t);
  else if (L.style === 'ice') stoneHall(g, b, t);
  else if (L.style === 'desert') adobe(g, b, t);
  else basalt(g, b, t);
  // hanging sign, shop front, name plate (same everywhere so shops stay recognisable)
  if (b.sign) {
    const sx = dx + 44, sy = base - 58;
    g.strokeStyle = '#2a1d19'; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(dx + 26, sy - 8); g.lineTo(sx + 14, sy - 8); g.stroke();
    g.beginPath(); g.moveTo(sx, sy - 8); g.lineTo(sx, sy - 2); g.stroke();
    g.beginPath(); g.roundRect(sx - 16, sy - 2, 32, 26, 6); ink(g, '#d9b98a', 1.8);
    g.save(); g.translate(sx, sy + 11); drawIcon(g, b.sign, 20); g.restore();
  }
  facade(g, b, t, true);
  if (b.name) plate(g, b.name, dx, base - 60);
}

function door(g, dx, base, arch, fill = ['#7a4e30', '#4c2f1d']) {
  g.beginPath();
  if (arch === 'horseshoe') { g.moveTo(dx - 17, base); g.lineTo(dx - 17, base - 30); g.arc(dx, base - 32, 19, Math.PI * 0.95, Math.PI * 0.05); g.lineTo(dx + 17, base); g.closePath(); }
  else g.roundRect(dx - 17, base - 50, 34, 50, arch === 'square' ? [3, 3, 0, 0] : [16, 16, 0, 0]);
  ink(g, lin(g, base - 50, base, fill[0], fill[1]), 2);
  g.beginPath(); g.arc(dx + 9, base - 24, 2.2, 0, TAU); g.fillStyle = '#ffd36b'; g.fill();
}
const glass = (g, y0, y1) => lin(g, y0, y1, '#ffe3a1', '#ff9d3c');

// Rimbawana: round log hut under a thick thatched dome, moss and roots
function hut(g, b, t) {
  const { x, y, w, h } = b, base = y + h, top = y + h * 0.5;
  g.beginPath(); g.roundRect(x + 8, top - 4, w - 16, base - top + 4, [6, 6, 2, 2]);
  ink(g, lin(g, top, base, '#6a4a2e', '#3a2818'), 2);
  g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 1.2;
  for (let yy = top + 8; yy < base; yy += 11) {
    g.beginPath(); g.moveTo(x + 9, yy); g.lineTo(x + w - 9, yy); g.stroke();
    for (const ex of [x + 10, x + w - 10]) { g.beginPath(); g.arc(ex, yy - 5, 4.5, 0, TAU); g.fillStyle = '#7a5836'; g.fill(); g.stroke(); }
  }
  for (const wnd of windowsOf(b)) { g.beginPath(); g.arc(wnd.x, wnd.y, 13, 0, TAU); ink(g, glass(g, wnd.y - 13, wnd.y + 13), 2); g.strokeStyle = '#3a2620'; g.lineWidth = 2; g.beginPath(); g.moveTo(wnd.x - 13, wnd.y); g.lineTo(wnd.x + 13, wnd.y); g.moveTo(wnd.x, wnd.y - 13); g.lineTo(wnd.x, wnd.y + 13); g.stroke(); }
  door(g, x + w / 2, base, 'round');
  // moss along the foot, roots at the corners
  for (let i = 0; i < 7; i++) { g.beginPath(); g.ellipse(x + 14 + (i * (w - 28)) / 6, base - 2, 10, 5, 0, Math.PI, 0); g.fillStyle = i % 2 ? '#2f5a2a' : '#3e6b32'; g.fill(); }
  g.strokeStyle = '#3a2818'; g.lineWidth = 4; g.lineCap = 'round';
  for (const [sx, d] of [[x + 10, -1], [x + w - 10, 1]]) { g.beginPath(); g.moveTo(sx, base - 14); g.quadraticCurveTo(sx + d * 10, base - 2, sx + d * 20, base + 4); g.stroke(); }
  // thatched dome with a ragged fringe
  const ry = top + 10;
  g.beginPath(); g.moveTo(x - 14, ry);
  g.bezierCurveTo(x - 10, y - 10, x + w + 10, y - 10, x + w + 14, ry);
  for (let i = 10; i >= 0; i--) { const fx = x - 14 + ((w + 28) * i) / 10; g.lineTo(fx, ry + (i % 2 ? 8 : 2)); }
  g.closePath();
  ink(g, lin(g, y - 10, ry, shade(b.roof, 1.3), shade(b.roof, 0.85)), 2.2);
  g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = 1.2;
  for (let i = 1; i < 12; i++) { const fx = x - 8 + ((w + 16) * i) / 12; g.beginPath(); g.moveTo(x + w / 2 + (fx - x - w / 2) * 0.25, y + 6); g.quadraticCurveTo(fx, y + 20, fx, ry); g.stroke(); }
  g.strokeStyle = 'rgba(255,240,180,.12)'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(x + 10, ry - 22); g.bezierCurveTo(x + 20, y + 4, x + w - 20, y + 4, x + w - 10, ry - 22); g.stroke();
  // little lantern on a crook by the door
  const lx = x + w / 2 - 34, ly = base - 60;
  g.strokeStyle = '#2a1d19'; g.lineWidth = 2; g.beginPath(); g.moveTo(lx + 10, ly - 10); g.lineTo(lx, ly - 10); g.lineTo(lx, ly - 4); g.stroke();
  g.beginPath(); g.roundRect(lx - 5, ly - 4, 10, 12, 3); ink(g, '#ffd98a', 1.2);
}

// Bekubara: tall stone hall, steep roof under heavy snow, icicles, smoking chimney
function stoneHall(g, b, t) {
  const { x, y, w, h } = b, base = y + h, top = y + h * 0.5;
  g.beginPath(); g.rect(x + 6, top - 4, w - 12, base - top + 4); ink(g, lin(g, top, base, '#66748c', '#3e4a5e'), 2);
  g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = 1;
  for (let yy = top + 10; yy < base; yy += 12) for (let xx = x + 6 + ((yy / 12) % 2) * 12; xx < x + w - 6; xx += 24) g.strokeRect(xx, yy - 12, Math.min(24, x + w - 6 - xx), 12);
  for (const wnd of windowsOf(b)) {
    g.beginPath(); g.roundRect(wnd.x - 14, wnd.y - 16, 28, 30, [14, 14, 2, 2]); ink(g, glass(g, wnd.y - 16, wnd.y + 14), 2);
    g.strokeStyle = '#cfe2ff'; g.lineWidth = 1.5; g.stroke();
    g.strokeStyle = '#3a3440'; g.lineWidth = 2; g.beginPath(); g.moveTo(wnd.x, wnd.y - 16); g.lineTo(wnd.x, wnd.y + 14); g.stroke();
  }
  door(g, x + w / 2, base, 'round', ['#5a4a3e', '#352a22']);
  // chimney (behind the roof) + smoke
  const chx = x + w * 0.72;
  g.beginPath(); g.rect(chx, y - 30, 20, 50); ink(g, '#56637a', 1.8);
  g.beginPath(); g.ellipse(chx + 10, y - 30, 13, 4, 0, 0, TAU); g.fillStyle = 'rgba(238,244,255,.92)'; g.fill();
  for (let i = 0; i < 3; i++) {
    const ph = (t * 0.3 + i / 3) % 1;
    g.beginPath(); g.arc(chx + 10 + Math.sin(ph * 6 + i) * 6, y - 38 - ph * 46, 5 + ph * 8, 0, TAU);
    g.fillStyle = `rgba(200,210,230,${0.25 * (1 - ph)})`; g.fill();
  }
  // steep roof
  const eave = top + 4;
  g.beginPath(); g.moveTo(x - 10, eave); g.lineTo(x + w / 2, y - 40); g.lineTo(x + w + 10, eave); g.closePath();
  ink(g, lin(g, y - 40, eave, shade(b.roof, 1.2), b.roof), 2.2);
  g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = 1.2;
  for (let k = 0.2; k < 1; k += 0.13) { const yy = y - 40 + (eave - y + 40) * k, hw = (w / 2 + 10) * k; g.beginPath(); g.moveTo(x + w / 2 - hw, yy); g.lineTo(x + w / 2 + hw, yy); g.stroke(); }
  // snow blanket on the upper roof and along the eave
  g.beginPath(); g.moveTo(x + w / 2, y - 44); g.lineTo(x + w / 2 + (w / 2 + 10) * 0.62, y - 40 + (eave - y + 40) * 0.62);
  for (let i = 6; i >= 0; i--) { const k = 0.62, hw = (w / 2 + 10) * k; const fx = x + w / 2 - hw + (2 * hw * i) / 6; g.quadraticCurveTo(fx + hw / 6, y - 40 + (eave - y + 40) * k + 12, fx, y - 40 + (eave - y + 40) * k + (i % 2 ? 4 : 9)); }
  g.closePath(); g.fillStyle = 'rgba(236,243,255,.95)'; g.fill();
  g.beginPath(); g.roundRect(x - 12, eave - 4, w + 24, 8, 4); g.fillStyle = 'rgba(236,243,255,.92)'; g.fill();
  g.fillStyle = 'rgba(200,226,255,.85)';
  for (let ix = x - 4; ix < x + w + 4; ix += 14) { const len = 6 + ((ix * 7) % 9); g.beginPath(); g.moveTo(ix, eave + 3); g.lineTo(ix + 3, eave + 3 + len); g.lineTo(ix + 6, eave + 3); g.closePath(); g.fill(); }
}

// Pasirluas: mud-brick house with a flat roof, parapet, beams, a dome or an awning
function adobe(g, b, t) {
  const { x, y, w, h } = b, base = y + h, top = y + h * 0.34;
  g.beginPath(); g.roundRect(x + 4, top, w - 8, base - top, [8, 8, 2, 2]); ink(g, lin(g, top, base, '#b8905e', '#7e5a38'), 2);
  // parapet with rounded crenels
  for (let px = x + 4; px < x + w - 10; px += 26) { g.beginPath(); g.roundRect(px + 3, top - 12, 18, 16, [8, 8, 0, 0]); ink(g, '#b8905e', 1.4); }
  g.fillStyle = 'rgba(60,36,20,.25)'; g.fillRect(x + 4, top + 2, w - 8, 6);
  // beams poking out under the roof line
  g.fillStyle = '#4a2e1a';
  for (let px = x + 18; px < x + w - 14; px += 30) { g.beginPath(); g.roundRect(px, top + 12, 9, 7, 2); g.fill(); }
  // cracks in the plaster
  g.strokeStyle = 'rgba(60,36,20,.35)'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(x + 14, top + 40); g.lineTo(x + 22, top + 52); g.lineTo(x + 18, top + 62); g.moveTo(x + w - 20, base - 30); g.lineTo(x + w - 28, base - 22); g.stroke();
  // dome (shops) or a striped cloth awning on poles (homes)
  if (b.sign) {
    const r = Math.min(34, w * 0.18);
    g.beginPath(); g.rect(x + w / 2 - r - 4, top - 18, 2 * r + 8, 10); ink(g, '#a07a4e', 1.4);
    g.beginPath(); g.arc(x + w / 2, top - 18, r, Math.PI, 0); g.closePath(); ink(g, lin(g, top - 18 - r, top - 18, shade(b.roof, 1.3), b.roof), 2);
    g.beginPath(); g.moveTo(x + w / 2, top - 18 - r); g.lineTo(x + w / 2, top - 30 - r); g.lineWidth = 2; g.strokeStyle = '#e6c27a'; g.stroke();
    g.beginPath(); g.arc(x + w / 2, top - 32 - r, 3, 0, TAU); g.fillStyle = '#e6c27a'; g.fill();
  } else {
    g.strokeStyle = '#4a2e1a'; g.lineWidth = 3;
    for (const px of [x + 20, x + w - 20]) { g.beginPath(); g.moveTo(px, top - 4); g.lineTo(px, top - 34); g.stroke(); }
    for (let i = 0; i < 6; i++) { const a = x + 20 + ((w - 40) * i) / 6, c = x + 20 + ((w - 40) * (i + 1)) / 6; g.beginPath(); g.moveTo(a, top - 34); g.lineTo(c, top - 34); g.lineTo(c, top - 24); g.quadraticCurveTo((a + c) / 2, top - 18, a, top - 24); g.closePath(); ink(g, i % 2 ? '#f1e2c4' : b.roof, 1.2); }
  }
  for (const wnd of windowsOf(b)) {
    g.beginPath(); g.moveTo(wnd.x - 12, wnd.y + 14); g.lineTo(wnd.x - 12, wnd.y - 4); g.arc(wnd.x, wnd.y - 4, 12, Math.PI, 0); g.lineTo(wnd.x + 12, wnd.y + 14); g.closePath();
    ink(g, glass(g, wnd.y - 16, wnd.y + 14), 2);
    g.strokeStyle = 'rgba(70,40,20,.8)'; g.lineWidth = 1.3;
    for (let k = -8; k <= 8; k += 8) { g.beginPath(); g.moveTo(wnd.x + k, wnd.y - 14); g.lineTo(wnd.x + k, wnd.y + 14); g.stroke(); }
    g.beginPath(); g.moveTo(wnd.x - 12, wnd.y + 2); g.lineTo(wnd.x + 12, wnd.y + 2); g.stroke();
  }
  door(g, x + w / 2, base, 'horseshoe', ['#6a3e22', '#3e2414']);
  // clay pots by the walls
  for (const [px, s2] of [[x + 16, 1], [x + w - 16, 0.8]]) {
    g.beginPath(); g.ellipse(px, base - 8 * s2, 8 * s2, 9 * s2, 0, 0, TAU); ink(g, '#a8502a', 1.3);
    g.beginPath(); g.ellipse(px, base - 17 * s2, 4.5 * s2, 2 * s2, 0, 0, TAU); ink(g, '#7a3a1e', 1);
  }
}

// Baraapi: angular basalt house, slanted slate roof, ember seams (glow in houseGlow)
function basalt(g, b, t) {
  const { x, y, w, h } = b, base = y + h, top = y + h * 0.46;
  g.beginPath(); g.moveTo(x + 4, base); g.lineTo(x + 8, top); g.lineTo(x + w - 6, top - 4); g.lineTo(x + w - 2, base); g.closePath();
  ink(g, lin(g, top, base, '#463432', '#221715'), 2);
  g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 1;
  const r = rnd(Math.round(x * 7 + y));
  for (let yy = top + 14; yy < base; yy += 16) { let xx = x + 8; while (xx < x + w - 8) { const ww = 22 + r() * 22; g.strokeRect(xx, yy - 16, Math.min(ww, x + w - 8 - xx), 16); xx += ww; } }
  for (const wnd of windowsOf(b)) {
    g.beginPath(); g.moveTo(wnd.x - 12, wnd.y + 12); g.lineTo(wnd.x - 8, wnd.y - 14); g.lineTo(wnd.x + 8, wnd.y - 14); g.lineTo(wnd.x + 12, wnd.y + 12); g.closePath();
    ink(g, lin(g, wnd.y - 14, wnd.y + 12, '#ffcf7a', '#ff6a2a'), 2);
    g.strokeStyle = '#1a1110'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(wnd.x, wnd.y - 14); g.lineTo(wnd.x, wnd.y + 12); g.stroke();
  }
  door(g, x + w / 2, base, 'square', ['#3a2a26', '#1e1412']);
  // chimney with a little fire (flame in houseGlow)
  const chx = x + 22;
  g.beginPath(); g.moveTo(chx, y + 30); g.lineTo(chx + 2, y - 18); g.lineTo(chx + 22, y - 18); g.lineTo(chx + 24, y + 30); g.closePath(); ink(g, '#3a2a26', 1.8);
  // slanted slate roof
  g.beginPath(); g.moveTo(x - 10, top + 6); g.lineTo(x + w * 0.35, y + 4); g.lineTo(x + w + 10, y + h * 0.3); g.lineTo(x + w + 6, top + 2); g.closePath();
  ink(g, lin(g, y, top, shade(b.roof, 1.25), shade(b.roof, 0.8)), 2.2);
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.2;
  for (let k = 0.2; k < 1; k += 0.2) { g.beginPath(); g.moveTo(x - 10 + (x + w * 0.35 - x + 10) * k, top + 6 - (top + 6 - y - 4) * k); g.lineTo(x + w + 6 + (x + w + 10 - x - w - 6) * k, top + 2 - (top + 2 - y - h * 0.3) * k); g.stroke(); }
}

// emissive bits of the styled houses
function houseGlow(g, b, t, L) {
  const { x, y, w, h } = b, base = y + h;
  g.save(); g.globalCompositeOperation = 'lighter';
  if (L.style === 'forest') {
    const lx = x + w / 2 - 34, ly = base - 58;
    const gr = g.createRadialGradient(lx, ly, 0, lx, ly, 16);
    gr.addColorStop(0, 'rgba(255,220,140,.85)'); gr.addColorStop(1, 'rgba(255,180,80,0)');
    g.fillStyle = gr; g.fillRect(lx - 16, ly - 16, 32, 32);
  } else if (L.style === 'volcano') {
    const a = 0.55 + 0.3 * Math.sin(t * 2 + x);
    g.strokeStyle = `rgba(255,120,40,${a.toFixed(2)})`; g.lineWidth = 1.6; g.lineCap = 'round';
    g.beginPath();
    g.moveTo(x + 14, base - 6); g.lineTo(x + 20, base - 26); g.lineTo(x + 16, base - 40);
    g.moveTo(x + w - 14, y + h * 0.6); g.lineTo(x + w - 22, y + h * 0.7); g.lineTo(x + w - 18, base - 8);
    g.stroke();
    const chx = x + 34, k = 1 + Math.sin(t * 10 + x) * 0.15;
    g.beginPath(); g.moveTo(chx, y - 34 * k); g.bezierCurveTo(chx + 9, y - 22, chx + 8, y - 16, chx, y - 16); g.bezierCurveTo(chx - 8, y - 16, chx - 9, y - 22, chx, y - 34 * k);
    const fg = g.createLinearGradient(0, y - 34, 0, y - 16); fg.addColorStop(0, 'rgba(255,90,40,0)'); fg.addColorStop(1, 'rgba(255,200,110,.9)');
    g.fillStyle = fg; g.fill();
  }
  g.restore();
}

// ——— gates ———
function gateStyled(g, b, L) {
  const { x, y, w, h } = b, cx = x + w / 2, style = L.style;
  g.beginPath(); g.moveTo(x + 30, y + h); g.lineTo(x + 30, y + 50); g.arc(cx, y + 50, w / 2 - 30, Math.PI, 0); g.lineTo(x + w - 30, y + h); g.closePath();
  g.fillStyle = '#07051a'; g.fill();
  if (style === 'forest') {
    // two log towers and a bent-branch arch with leaves
    for (const px of [x, x + w - 30]) {
      for (let yy = y + 30; yy < y + h; yy += 12) { g.beginPath(); g.roundRect(px, yy, 30, 12, 6); ink(g, '#6a4a2c', 1.2); }
      g.beginPath(); g.moveTo(px - 4, y + 32); g.lineTo(px + 15, y + 8); g.lineTo(px + 34, y + 32); g.closePath(); ink(g, '#3e6b32', 1.4);
      g.beginPath(); g.rect(px + 11, y + 14, 8, 18); ink(g, '#4c3324', 1.2);
    }
    g.lineCap = 'round'; g.strokeStyle = '#5a3e24'; g.lineWidth = 14;
    g.beginPath(); g.arc(cx, y + 54, w / 2 - 20, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
    g.strokeStyle = '#7a5a38'; g.lineWidth = 4; g.stroke();
    for (let i = 0; i < 9; i++) { const a = Math.PI * (1.08 + i * 0.105); g.beginPath(); g.ellipse(cx + Math.cos(a) * (w / 2 - 20), y + 54 + Math.sin(a) * (w / 2 - 20) - 6, 9, 5, a, 0, TAU); g.fillStyle = i % 2 ? '#2f5a2a' : '#3e6b32'; g.fill(); }
    return;
  }
  const C = {
    ice: ['#8a98b0', '#56637a', '#9aa8c0'], desert: ['#c8a070', '#8a6440', '#d0aa78'], volcano: ['#4e3a36', '#2a1c1a', '#5a4440'],
  }[style];
  g.beginPath(); g.arc(cx, y + 50, w / 2 - 6, Math.PI, 0); g.arc(cx, y + 50, w / 2 - 30, 0, Math.PI, true); g.closePath();
  ink(g, lin(g, y, y + 50, C[0], C[1]), 2);
  for (let i = 1; i < 8; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    g.beginPath(); g.moveTo(cx + Math.cos(a) * (w / 2 - 30), y + 50 + Math.sin(a) * (w / 2 - 30));
    g.lineTo(cx + Math.cos(a) * (w / 2 - 6), y + 50 + Math.sin(a) * (w / 2 - 6));
    g.lineWidth = 1.5; g.strokeStyle = 'rgba(0,0,0,.4)'; g.stroke();
  }
  for (const px of [x - 4, x + w - 34]) {
    g.beginPath(); g.rect(px, y + 30, 38, h - 30); ink(g, lin(g, y + 30, y + h, C[2], C[1]), 2);
    if (style === 'ice') { g.beginPath(); g.rect(px - 4, y + 22, 46, 12); ink(g, C[0], 1.6); g.beginPath(); g.ellipse(px + 19, y + 22, 24, 6, 0, Math.PI, 0); g.fillStyle = 'rgba(238,244,255,.95)'; g.fill(); }
    else if (style === 'desert') { g.beginPath(); g.arc(px + 19, y + 30, 19, Math.PI, 0); g.closePath(); ink(g, '#a8502a', 1.6); g.beginPath(); g.arc(px + 19, y + 8, 3, 0, TAU); g.fillStyle = '#e6c27a'; g.fill(); }
    else { g.beginPath(); g.moveTo(px - 4, y + 32); g.lineTo(px + 6, y + 14); g.lineTo(px + 32, y + 14); g.lineTo(px + 42, y + 32); g.closePath(); ink(g, C[0], 1.6); }
    g.beginPath(); g.rect(px + 15, y + 36, 8, 18); ink(g, '#4c3324', 1.2);
  }
  if (style === 'ice') { g.beginPath(); g.arc(cx, y + 48, w / 2 - 6, Math.PI * 1.1, Math.PI * 1.9); g.lineWidth = 6; g.strokeStyle = 'rgba(238,244,255,.9)'; g.stroke(); }
  if (style === 'volcano') { g.beginPath(); g.arc(cx, y + 50, w / 2 - 18, Math.PI * 1.05, Math.PI * 1.95); g.lineWidth = 2; g.strokeStyle = 'rgba(255,110,40,.7)'; g.stroke(); }
}

// ——— landmark features ———
function lavaBand(g, f, t) {
  const { x, y, w, h } = f;
  g.save();
  g.beginPath(); g.roundRect(x, y, w, h, 18); g.clip();
  g.fillStyle = lin(g, y, y + h, '#ff9a3c', '#c2410c'); g.fillRect(x, y, w, h);
  // slow crust plates drifting east, bright veins between them
  for (let i = 0; i < Math.ceil(w / 70) + 2; i++) {
    const px = x + ((i * 70 + t * 18) % (w + 140)) - 70, py = y + h / 2 + Math.sin(i * 2.3) * (h * 0.22);
    g.beginPath(); g.ellipse(px, py, 26 + (i % 3) * 6, 10 + (i % 2) * 4, Math.sin(i) * 0.4, 0, TAU);
    g.fillStyle = 'rgba(60,20,10,.55)'; g.fill();
  }
  g.restore();
  // dark banks
  g.strokeStyle = '#1a1110'; g.lineWidth = 8; g.beginPath(); g.roundRect(x, y, w, h, 18); g.stroke();
}

function flatFeature(g, f, t) {
  const { x, y, w, h } = f, cx = x + w / 2, cy = y + h / 2;
  if (f.kind === 'bridge') {
    shadow(g, cx, y + h - 6, w / 2 + 4, 8);
    g.beginPath(); g.roundRect(x + 4, y, w - 8, h, 6); ink(g, lin(g, y, y + h, '#5a4844', '#3a2c28'), 2);
    g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 1.2;
    for (let yy = y + 12; yy < y + h; yy += 14) { g.beginPath(); g.moveTo(x + 6, yy); g.lineTo(x + w - 6, yy); g.stroke(); }
    for (const px of [x, x + w - 12]) { g.beginPath(); g.roundRect(px, y - 6, 12, h + 8, 4); ink(g, '#4a3834', 1.6); for (const py of [y - 8, y + h - 6]) { g.beginPath(); g.rect(px - 2, py, 16, 12); ink(g, '#5a4844', 1.4); } }
  } else if (f.kind === 'pond') {
    g.beginPath(); g.ellipse(cx, cy, w / 2 + 12, h / 2 + 10, 0, 0, TAU); g.fillStyle = 'rgba(230,238,250,.85)'; g.fill();
    g.beginPath(); g.ellipse(cx, cy, w / 2, h / 2, 0, 0, TAU); ink(g, lin(g, y, y + h, '#b8d8f0', '#6a9ac8'), 2);
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.3;
    g.beginPath(); g.moveTo(cx - 80, cy - 20); g.lineTo(cx - 30, cy + 4); g.lineTo(cx + 10, cy - 10); g.lineTo(cx + 70, cy + 24); g.moveTo(cx - 30, cy + 4); g.lineTo(cx - 40, cy + 40); g.moveTo(cx + 10, cy - 10); g.lineTo(cx + 30, cy - 50); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 5; g.beginPath(); g.ellipse(cx - 30, cy - 30, 60, 20, -0.2, Math.PI * 1.1, Math.PI * 1.6); g.stroke();
  } else if (f.kind === 'oasis') {
    g.beginPath(); g.ellipse(cx, cy, w / 2 + 26, h / 2 + 22, 0, 0, TAU); g.fillStyle = '#3e5a2a'; g.fill();
    for (let i = 0; i < 26; i++) { const a = (i / 26) * TAU; g.beginPath(); g.ellipse(cx + Math.cos(a) * (w / 2 + 18), cy + Math.sin(a) * (h / 2 + 15), 8, 5, a, 0, TAU); g.fillStyle = i % 2 ? '#4f7a32' : '#5e8a3a'; g.fill(); }
    g.beginPath(); g.ellipse(cx, cy, w / 2, h / 2, 0, 0, TAU); ink(g, lin(g, y, y + h, '#3aa8a8', '#1f6a7a'), 2);
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2;
    for (let i = 0; i < 3; i++) { const ph = ((t * 0.3 + i / 3) % 1); g.beginPath(); g.ellipse(cx + 20, cy + 6, 20 + ph * 70, 8 + ph * 26, 0, 0, TAU); g.globalAlpha = 1 - ph; g.stroke(); g.globalAlpha = 1; }
  }
}

function palm(g, x, y, s, t) {
  g.save(); g.translate(x, y); g.scale(s, s);
  shadow(g, 18, 2, 24, 6);
  g.strokeStyle = '#6a4a2a'; g.lineWidth = 8; g.lineCap = 'round';
  g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(12, -40, 6, -90); g.stroke();
  g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 1.5;
  for (let k = 10; k < 88; k += 10) { g.beginPath(); g.moveTo(-3 + k * 0.08, -k); g.lineTo(5 + k * 0.08, -k - 2); g.stroke(); }
  const sway = Math.sin(t * 0.8 + x) * 0.06;
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.55 + sway;
    g.save(); g.translate(6, -90); g.rotate(a);
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(22, -12, 46, 8); g.quadraticCurveTo(22, 2, 0, 0); ink(g, i % 2 ? '#3e7a32' : '#4f8a3a', 1.3);
    g.restore();
  }
  g.beginPath(); g.arc(4, -88, 4, 0, TAU); g.arc(10, -86, 4, 0, TAU); g.fillStyle = '#6a3a1a'; g.fill();
  g.restore();
}

function tallFeature(g, f, t, L) {
  const { x, y, w, h } = f, cx = x + w / 2, base = y + h;
  if (f.kind === 'oasis') {
    for (const [px, py, s2] of [[x - 10, y + 20, 1.1], [x + w + 6, y + 40, 0.95], [x + w * 0.3, base + 18, 0.85], [x + w * 0.8, base + 14, 1]]) palm(g, px, py, s2, t);
  } else if (f.kind === 'bigtree') {
    shadow(g, cx, base, 120, 26);
    const p = L.player, under = p && Math.abs(p.x - cx) < 220 && p.y < base && p.y > base - 420;
    g.save(); if (under) g.globalAlpha = 0.45; // see the player behind the tree
    g.strokeStyle = '#2e1e12'; g.lineCap = 'round';
    for (const [d, len] of [[-1, 90], [1, 100], [-1, 50], [1, 60]]) { g.lineWidth = 12; g.beginPath(); g.moveTo(cx + d * 20, base - 10); g.quadraticCurveTo(cx + d * (len * 0.6), base - 4, cx + d * len, base + 10); g.stroke(); }
    g.beginPath(); g.moveTo(cx - 44, base); g.bezierCurveTo(cx - 30, base - 80, cx - 40, base - 150, cx - 26, base - 230); g.lineTo(cx + 26, base - 230); g.bezierCurveTo(cx + 40, base - 150, cx + 30, base - 80, cx + 44, base); g.closePath();
    ink(g, lin(g, base - 230, base, '#4a3220', '#2a1a10'), 2.4);
    g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 2;
    for (const k of [-16, 0, 16]) { g.beginPath(); g.moveTo(cx + k, base - 10); g.quadraticCurveTo(cx + k * 1.4, base - 120, cx + k * 0.6, base - 220); g.stroke(); }
    g.beginPath(); g.ellipse(cx + 2, base - 54, 13, 18, 0, 0, TAU); g.fillStyle = '#140c06'; g.fill(); // hollow
    const blobs = [[0, -300, 120], [-110, -250, 90], [110, -255, 92], [-60, -330, 80], [70, -335, 80], [-150, -200, 64], [150, -205, 66], [0, -220, 96]];
    for (const [ox, oy, r] of blobs) { g.beginPath(); g.arc(cx + ox, base + oy, r, 0, TAU); g.fillStyle = '#183020'; g.fill(); }
    for (const [ox, oy, r] of blobs) { g.beginPath(); g.arc(cx + ox - r * 0.2, base + oy - r * 0.25, r * 0.7, 0, TAU); g.fillStyle = 'rgba(70,120,60,.35)'; g.fill(); }
    // hanging lantern strings (lanterns glow in featureGlow)
    g.strokeStyle = 'rgba(30,20,12,.8)'; g.lineWidth = 1.2;
    for (const [lx, ly] of TREE_LANTERNS) { g.beginPath(); g.moveTo(cx + lx, base + ly - 30); g.lineTo(cx + lx, base + ly - 6); g.stroke(); g.beginPath(); g.roundRect(cx + lx - 5, base + ly - 6, 10, 12, 3); ink(g, '#ffd98a', 1); }
    g.restore();
  } else if (f.kind === 'well') {
    shadow(g, cx, base, w / 2 + 6, 6);
    g.beginPath(); g.ellipse(cx, base - 12, w / 2, 12, 0, 0, TAU); ink(g, '#5a5650', 1.6);
    g.beginPath(); g.rect(x, base - 12, w, 12); ink(g, lin(g, base - 12, base, '#6a6660', '#45423e'), 1.6);
    g.beginPath(); g.ellipse(cx, base - 12, w / 2 - 6, 8, 0, 0, TAU); g.fillStyle = '#0a1418'; g.fill();
    g.strokeStyle = '#4a3220'; g.lineWidth = 4;
    for (const px of [x + 4, x + w - 4]) { g.beginPath(); g.moveTo(px, base - 12); g.lineTo(px, base - 52); g.stroke(); }
    g.beginPath(); g.moveTo(x - 8, base - 50); g.lineTo(cx, base - 66); g.lineTo(x + w + 8, base - 50); g.closePath(); ink(g, '#5a7a3a', 1.4);
    g.lineWidth = 1.2; g.beginPath(); g.moveTo(cx, base - 50); g.lineTo(cx, base - 26); g.stroke();
    g.beginPath(); g.rect(cx - 5, base - 26, 10, 9); ink(g, '#6a4a2c', 1);
  } else if (f.kind === 'garden') {
    g.beginPath(); g.roundRect(x, y + 10, w, h - 10, 6); ink(g, '#3a2a18', 1.4);
    const cols = ['#ff6b8b', '#ffd36b', '#c9b8ff', '#ff9ab0', '#8fd0ff'];
    for (let r2 = 0; r2 < 3; r2++) for (let i = 0; i < Math.floor(w / 18); i++) {
      const px = x + 10 + i * 18, py = y + 22 + r2 * 14;
      g.strokeStyle = '#3e6b32'; g.lineWidth = 2; g.beginPath(); g.moveTo(px, py + 6); g.lineTo(px, py - 4); g.stroke();
      g.beginPath(); g.arc(px, py - 6, 4, 0, TAU); ink(g, cols[(i + r2) % cols.length], 1);
    }
  } else if (f.kind === 'statue') {
    shadow(g, cx, base, 34, 8);
    g.beginPath(); g.rect(x - 10, base - 22, w + 20, 22); ink(g, lin(g, base - 22, base, '#8a98b0', '#56637a'), 1.8);
    g.beginPath(); g.rect(x - 4, base - 30, w + 8, 8); ink(g, '#9aa8c0', 1.4);
    // ice knight with a raised sword
    g.beginPath(); g.roundRect(cx - 12, base - 74, 24, 44, 6); ink(g, lin(g, base - 74, base - 30, '#d6e8ff', '#8ab0d8'), 1.6);
    g.beginPath(); g.arc(cx, base - 84, 11, 0, TAU); ink(g, '#cfe2ff', 1.6);
    g.beginPath(); g.moveTo(cx - 9, base - 88); g.lineTo(cx, base - 100); g.lineTo(cx + 9, base - 88); ink(g, '#cfe2ff', 1.4);
    g.beginPath(); g.moveTo(cx + 12, base - 62); g.lineTo(cx + 22, base - 70); g.lineTo(cx + 20, base - 118); g.lineTo(cx + 26, base - 118); g.lineTo(cx + 28, base - 70); g.closePath(); ink(g, '#e8f2ff', 1.4);
    g.beginPath(); g.ellipse(cx, base - 30, w / 2 + 6, 4, 0, Math.PI, 0); g.fillStyle = 'rgba(238,244,255,.9)'; g.fill();
  } else if (f.kind === 'tower') {
    shadow(g, cx, base, w / 2 + 8, 8);
    g.beginPath(); g.rect(x - 6, base - 110, w + 12, 110); ink(g, lin(g, base - 110, base, '#8a98b0', '#4e5b72'), 2);
    g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = 1;
    for (let yy = base - 98; yy < base; yy += 12) { g.beginPath(); g.moveTo(x - 6, yy); g.lineTo(x + w + 6, yy); g.stroke(); }
    g.beginPath(); g.roundRect(cx - 6, base - 80, 12, 20, [6, 6, 0, 0]); ink(g, glass(g, base - 80, base - 60), 1.4);
    g.beginPath(); g.moveTo(x - 14, base - 108); g.lineTo(cx, base - 170); g.lineTo(x + w + 14, base - 108); g.closePath(); ink(g, lin(g, base - 170, base - 108, '#4a6a9a', '#2f4a6b'), 2);
    g.beginPath(); g.moveTo(cx, base - 172); g.lineTo(cx + 18, base - 140); g.quadraticCurveTo(cx, base - 132, cx - 18, base - 140); g.closePath(); g.fillStyle = 'rgba(238,244,255,.95)'; g.fill();
    g.beginPath(); g.moveTo(cx, base - 170); g.lineTo(cx, base - 192); g.lineWidth = 2; g.strokeStyle = '#2a2a2a'; g.stroke();
    g.beginPath(); g.moveTo(cx, base - 192); g.lineTo(cx + 16, base - 186 + Math.sin(t * 3) * 2); g.lineTo(cx, base - 180); g.closePath(); ink(g, '#5a7ab0', 1);
  } else if (f.kind === 'market') {
    shadow(g, cx, base + 2, w / 2 + 6, 7);
    g.beginPath(); g.rect(x + 4, base - 30, w - 8, 30); ink(g, lin(g, base - 30, base, '#7a5236', '#4a2c1a'), 1.8);
    goods(g, f, x, base - 30, w);
    g.strokeStyle = '#3a2414'; g.lineWidth = 3;
    for (const px of [x + 6, x + w - 6]) { g.beginPath(); g.moveTo(px, base); g.lineTo(px, base - 66); g.stroke(); }
    const cloth = { cloth: '#8a3a8a', fruit: '#d6603a', pots: '#2f6a8a', spice: '#c2843a' }[f.goods] || '#a8502a';
    for (let i = 0; i < 5; i++) {
      const a = x - 6 + ((w + 12) * i) / 5, c = x - 6 + ((w + 12) * (i + 1)) / 5;
      g.beginPath(); g.moveTo(a, base - 70); g.lineTo(c, base - 70); g.lineTo(c, base - 56); g.quadraticCurveTo((a + c) / 2, base - 48, a, base - 56); g.closePath();
      ink(g, i % 2 ? '#f1e2c4' : cloth, 1.2);
    }
  } else if (f.kind === 'monument') {
    shadow(g, cx, base, w / 2 + 14, 10);
    g.beginPath(); g.rect(x - 10, base - 26, w + 20, 26); ink(g, lin(g, base - 26, base, '#4a3632', '#241816'), 2);
    g.beginPath(); g.rect(x, base - 36, w, 10); ink(g, '#5a4440', 1.6);
    // a giant anvil
    g.beginPath();
    g.moveTo(cx - 34, base - 36); g.lineTo(cx - 24, base - 60); g.lineTo(cx - 60, base - 70); g.lineTo(cx - 80, base - 86);
    g.lineTo(cx + 64, base - 86); g.lineTo(cx + 60, base - 70); g.lineTo(cx + 24, base - 60); g.lineTo(cx + 34, base - 36); g.closePath();
    ink(g, lin(g, base - 86, base - 36, '#6a6670', '#2e2c34'), 2.4);
    g.beginPath(); g.moveTo(cx - 80, base - 86); g.lineTo(cx + 64, base - 86); g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,.18)'; g.stroke();
    // the hammer resting on it
    g.save(); g.translate(cx + 18, base - 90); g.rotate(-0.5);
    g.beginPath(); g.roundRect(-4, -70, 8, 70, 3); ink(g, '#5a3a22', 1.6);
    g.beginPath(); g.roundRect(-22, -86, 44, 22, 4); ink(g, lin(g, -86, -64, '#5a5660', '#2e2c34'), 2);
    g.restore();
  }
}
const TREE_LANTERNS = [[-120, -170], [-60, -150], [10, -140], [80, -150], [140, -175], [-170, -200], [170, -210]];

function goods(g, f, x, y, w) {
  const n = Math.floor((w - 20) / 18);
  for (let i = 0; i < n; i++) {
    const px = x + 16 + i * 18;
    if (f.goods === 'fruit') { g.beginPath(); g.arc(px, y - 5, 6, 0, TAU); ink(g, ['#d6603a', '#e0c03a', '#8ac23a'][i % 3], 1); }
    else if (f.goods === 'pots') { g.beginPath(); g.ellipse(px, y - 8, 7, 9, 0, 0, TAU); ink(g, ['#a8502a', '#2f6a8a', '#c2843a'][i % 3], 1.2); }
    else if (f.goods === 'spice') { g.beginPath(); g.moveTo(px - 8, y); g.quadraticCurveTo(px, y - 18, px + 8, y); g.closePath(); ink(g, ['#d6603a', '#e0c03a', '#a83a2a', '#6a8a3a'][i % 4], 1); }
    else { g.beginPath(); g.roundRect(px - 7, y - 12, 14, 12, 3); ink(g, ['#8a3a8a', '#3a6ad6', '#d6a03a', '#3a8a5a'][i % 4], 1); }
  }
}

function featureGlow(g, f, t, L) {
  const { x, y, w, h } = f, cx = x + w / 2, base = y + h;
  g.save(); g.globalCompositeOperation = 'lighter';
  if (f.kind === 'lava') {
    for (let i = 0; i < 4; i++) {
      const ph = (t * 0.6 + i / 4 + x * 0.001) % 1;
      const bx = x + 20 + ((i * 97 + x) % Math.max(1, w - 40)), by = y + h / 2;
      g.beginPath(); g.arc(bx, by - ph * 12, 3 * (1 - ph) + 1, 0, TAU); g.fillStyle = `rgba(255,200,90,${(1 - ph).toFixed(2)})`; g.fill();
    }
    const gr = g.createLinearGradient(0, y - 30, 0, y + h + 30);
    gr.addColorStop(0, 'rgba(255,120,40,0)'); gr.addColorStop(0.5, `rgba(255,140,50,${(0.18 + 0.05 * Math.sin(t * 2 + x)).toFixed(3)})`); gr.addColorStop(1, 'rgba(255,120,40,0)');
    g.fillStyle = gr; g.fillRect(x, y - 30, w, h + 60);
  } else if (f.kind === 'bigtree') {
    for (const [lx, ly] of TREE_LANTERNS) {
      const fl = 0.8 + 0.2 * Math.sin(t * 3 + lx);
      const gr = g.createRadialGradient(cx + lx, base + ly, 0, cx + lx, base + ly, 22);
      gr.addColorStop(0, `rgba(255,220,140,${(0.9 * fl).toFixed(2)})`); gr.addColorStop(1, 'rgba(255,180,80,0)');
      g.fillStyle = gr; g.fillRect(cx + lx - 22, base + ly - 22, 44, 44);
    }
    for (let i = 0; i < 10; i++) { // fireflies round the canopy
      const a = t * 0.3 + i * 0.63, rr = 150 + Math.sin(t * 0.7 + i) * 40;
      const px = cx + Math.cos(a) * rr, py = base - 230 + Math.sin(a * 1.3) * 90;
      const fl = 0.5 + 0.5 * Math.sin(t * 4 + i * 2);
      g.beginPath(); g.arc(px, py, 2, 0, TAU); g.fillStyle = `rgba(200,255,140,${(0.3 + 0.6 * fl).toFixed(2)})`; g.fill();
    }
  } else if (f.kind === 'monument') {
    const a = 0.5 + 0.3 * Math.sin(t * 2);
    g.strokeStyle = `rgba(255,120,40,${a.toFixed(2)})`; g.lineWidth = 2;
    g.beginPath(); g.moveTo(x - 6, base - 14); g.lineTo(x + 20, base - 10); g.lineTo(x + 40, base - 18); g.moveTo(x + w - 30, base - 8); g.lineTo(x + w + 6, base - 16); g.stroke();
    for (let i = 0; i < 6; i++) {
      const ph = (t * 0.8 + i / 6) % 1;
      g.beginPath(); g.arc(cx - 20 + Math.sin(i * 4 + t) * 40, base - 90 - ph * 70, 1.8 * (1 - ph) + 0.4, 0, TAU);
      g.fillStyle = `rgba(255,170,80,${(1 - ph).toFixed(2)})`; g.fill();
    }
  } else if (f.kind === 'pond') {
    for (let i = 0; i < 5; i++) {
      const tw = Math.max(0, Math.sin(t * 2 + i * 1.7));
      const px = cx + Math.cos(i * 2.1) * w * 0.32, py = y + h / 2 + Math.sin(i * 1.3) * h * 0.3;
      g.strokeStyle = `rgba(255,255,255,${(0.8 * tw).toFixed(2)})`; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(px - 5 * tw, py); g.lineTo(px + 5 * tw, py); g.moveTo(px, py - 5 * tw); g.lineTo(px, py + 5 * tw); g.stroke();
    }
  }
  g.restore();
}

// light sources of the landmarks (lighting.draw list)
function featureLights(f, flick, out) {
  const { x, y, w, h } = f, cx = x + w / 2, base = y + h;
  if (f.kind === 'lava') for (let px = x + 60; px < x + w; px += 140) out.push({ x: px, y: y + h / 2, r: 150 * flick, rgb: '255,110,40', tint: 0.16, always: true });
  else if (f.kind === 'bigtree') {
    out.push({ x: cx, y: base - 180, r: 300 * flick, rgb: '255,190,110', tint: 0.12, always: true });
    for (const [lx, ly] of TREE_LANTERNS) out.push({ x: cx + lx, y: base + ly, r: 80, rgb: WARM, tint: 0.1 });
  } else if (f.kind === 'monument') out.push({ x: cx, y: base - 40, r: 180 * flick, rgb: '255,120,40', tint: 0.12, always: true });
  else if (f.kind === 'oasis') out.push({ x: cx, y: y + h / 2, r: 200, rgb: '90,220,220', tint: 0.08 });
  else if (f.kind === 'pond') out.push({ x: cx, y: y + h / 2, r: 200, rgb: '170,210,255', tint: 0.08 });
  else if (f.kind === 'tower') out.push({ x: cx, y: base - 70, r: 70, rgb: WARM, tint: 0.08 });
  else if (f.kind === 'market') out.push({ x: cx, y: base - 30, r: 90, rgb: WARM, tint: 0.07 });
}
