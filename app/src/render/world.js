// Dungeon rendering (spec §13.3, §18.3): the floor's room in its dungeon's
// theme (render/dungeonroom.js), actors, portals once a floor is clear. Camera
// follows the player; darkness with light holes comes from render/light.js and
// emissive effects (attacks, flames, portals) are drawn over it.
import { PORTAL } from '../data/dungeon.js';
import { DUNGEONS } from '../data/dungeons.js';
import { flagTile, drawRoom, decorLights, decorGlow } from './dungeonroom.js';
import { ENEMIES } from '../data/enemies.js';
import { SPRITES, bakeAll, drawBaked, drawIcon, gearIcon, OUT } from '../art/sprites.js';
import { RARITIES } from '../data/items.js';
import { drawDoll } from '../art/doll.js';
import { ATTACK_POSE } from '../run/skills.js';

const DOLL_SCALE = 0.82;   // player doll size in world units
const TAU = Math.PI * 2;
const ENEMY_R = Object.fromEntries(Object.entries(ENEMIES).map(([k, e]) => [k, e.r]));
const PORTAL_RGB = { down: '90,170,255', home: '255,200,90' };
const PORTAL_LABEL = { down: 'Turun', home: 'Pulang' };
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',');
const RARITY_RGB = RARITIES.map((r) => hexRgb(r.color));

export class Renderer {
  constructor(view, lighting) {
    this.view = view;
    this.lighting = lighting;
    this.camX = 0; this.camY = 0;
    this.avatar = null;   // { classId, look } of the character being played
    this.facing = 1;
    this.walk = 0;
    this.trail = [];      // dodge afterimages: { x, y, life }
    view.onResize.push(() => this.rebake());
    this.rebake();
  }

  rebake() {
    const v = this.view;
    bakeAll(v.S, ENEMY_R);
    this.grounds = {}; // dungeon id → floor pattern
    for (const d of DUNGEONS) {
      const tile = flagTile(v.S, d.theme.floor);
      const pat = v.ctx.createPattern(tile.canvas, 'repeat');
      pat.setTransform(new DOMMatrix().scale(tile.T / tile.canvas.width));
      this.grounds[d.id] = pat;
    }
  }

  // CSS pixel → world point (for mouse aim); ignores screen shake on purpose.
  screenToWorld(x, y) { return this.view.screenToWorld(x, y, this.camX, this.camY); }

  draw(game, t) {
    const v = this.view, g = v.ctx;
    const playing = game.state !== 0;
    // camera: follow the player, or drift slowly behind the menus
    const tx = playing ? game.px : Math.sin(t * 0.07) * 160;
    const ty = playing ? game.py : Math.cos(t * 0.05) * 120;
    this.camX += (tx - this.camX) * (playing ? 0.12 : 0.02);
    this.camY += (ty - this.camY) * (playing ? 0.12 : 0.02);
    let shx = 0, shy = 0;
    if (playing && game.shake > 0) {
      // Math.random, not rng.js: render runs at display rate, so drawing from the
      // sim PRNG would make spawns depend on frame rate and break replay
      shx = (Math.random() - 0.5) * game.shake * 6;
      shy = (Math.random() - 0.5) * game.shake * 6;
    }
    const cx = this.camX + shx, cy = this.camY + shy;
    const hw = v.viewW / 2 + 30, hh = v.viewH / 2 + 30;
    const visible = (x, y, m = 0) => Math.abs(x - cx) < hw + m && Math.abs(y - cy) < hh + m;

    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#05040c'; g.fillRect(0, 0, v.c.width, v.c.height);
    v.begin(cx, cy);
    g.imageSmoothingEnabled = true;
    g.lineJoin = 'round';

    this.drawRoom(g, game, t, visible);
    if (playing) this.drawRun(g, game, t, visible);
    this.lighting.draw(cx, cy, roomLights(game, t, playing), game.dungeon.theme.ambient);
    v.begin(cx, cy);
    roomGlow(g, game, t);
    if (playing) this.drawFx(g, game, t);
    v.vignetteOverlay();
    // fade in at the start of each floor
    const fade = playing ? 1 - game.floorT * 2.5 : 0;
    if (fade > 0) { g.fillStyle = `rgba(5,4,12,${fade})`; g.fillRect(0, 0, v.c.width, v.c.height); }
  }

  drawRoom(g, game, t, visible) {
    drawRoom(g, game.room, game.dungeon.theme, this.grounds[game.dungeon.id], t, visible);
    runeCircle(g, t, game.floorClear);
    if (game.portals) for (const p of game.portals) portalBase(g, p, game.clearT, t);
  }

  drawRun(g, game, t, visible) {
    for (const h of game.hazards) hazard(g, h, t);
    // pickups
    for (const gm of game.gems) {
      if (!visible(gm.x, gm.y)) continue;
      if (gm.gear) { gearDrop(g, gm, t); continue; }
      const bob = Math.sin(gm.t) * 2;
      shadow(g, gm.x, gm.y + 6, 4, 1.4);
      const s = SPRITES[gm.heart ? 'heart' : gm.coin ? 'coin' : gm.big ? 'bigGem' : 'gem'];
      drawBaked(g, s, gm.x, gm.y + bob - 2, 1);
    }

    // enemies
    for (const e of game.enemies) {
      if (!visible(e.x, e.y, 40)) continue;
      shadow(g, e.x, e.y + e.r * 0.75, e.r * 0.85, e.r * 0.3);
      const squash = 1 + Math.sin(e.wob) * 0.06;
      const sprite = SPRITES[e.flash > 0 ? `${e.type}Flash` : e.frozen > 0 ? `${e.type}Frozen` : e.type];
      const k = e.r / ENEMY_R[e.type]; // elites are drawn bigger
      if (e.elite) eliteAura(g, e, t);
      // about to act: blink white
      const warn = (e.mode === 'wind' || e.mode === 'fuse') && ((t * 14) | 0) % 2 === 0;
      const look = warn ? SPRITES[`${e.type}Flash`] : sprite;
      const flip = e.mode === 'dash' ? e.dirX < 0 : game.px < e.x;
      drawBaked(g, look, e.x, e.y, k / squash, k * squash, flip);
      if (e.ai === 'shield') guard(g, e);
      if (e.boss || e.elite || e.hp < e.maxHp) hpPill(g, e.x, e.y - e.r * (e.boss ? 1.6 : 1.25), e.r * 2, e.hp / e.maxHp, e.elite);
    }

    // player
    const blink = game.invuln > 0 && ((t * 18) | 0) % 2 === 0;
    const moving = Math.min(1, Math.hypot(game.moveX, game.moveY));
    if (game.aimX > 0.05) this.facing = 1; else if (game.aimX < -0.05) this.facing = -1;
    this.walk += moving * 0.22;
    const dodging = game.dodgeT > 0;
    if (dodging) this.trail.push({ x: game.px, y: game.py, life: 0.22 });
    for (let i = this.trail.length - 1; i >= 0; i--) {
      const a = this.trail[i];
      a.life -= 1 / 60;
      if (a.life <= 0) { this.trail.splice(i, 1); continue; }
      if (!this.avatar) continue;
      g.save();
      g.globalAlpha = a.life * 1.6;
      g.translate(a.x, a.y + 10);
      g.scale(DOLL_SCALE * this.facing, DOLL_SCALE);
      g.filter = this.avatar.classId === 'assassin' ? 'brightness(.8) saturate(2) hue-rotate(200deg)' : 'brightness(1.6) saturate(.4)';
      drawDoll(g, this.avatar.classId, this.avatar.look, { t, moving: 1, walk: this.walk });
      g.restore();
    }
    shadow(g, game.px, game.py + 10, 10, 3);
    aimMarker(g, game.px, game.py, game.aimX, game.aimY);
    if (this.avatar && !blink) {
      g.save();
      g.translate(game.px, game.py + 10);
      if (dodging) g.rotate(game.dodgeX * 0.25);
      g.scale(DOLL_SCALE * this.facing, DOLL_SCALE);
      const attack = Math.max(0, game.attackT / ATTACK_POSE);
      drawDoll(g, this.avatar.classId, this.avatar.look, { t, moving, walk: this.walk, attack, hurt: game.flash > 0 });
      g.restore();
    }

  }

  // Emissive layer drawn over the darkness: attacks, sparks, numbers.
  drawFx(g, game, t) {
    enemyShots(g, game, t);
    // attack instances
    for (const h of game.hits) drawHit(g, h, this.avatar, t);
    if (game.buffT > 0) shoutAura(g, game.px, game.py, t, Math.min(1, game.buffT * 2));
    potionAuras(g, game, t);

    // particles (additive glow)
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const p of game.particles) {
      const k = p.life / p.maxLife;
      if (p.line) { bolt(g, p.x, p.y, p.x2, p.y2, k); continue; }
      g.globalAlpha = k;
      g.beginPath(); g.arc(p.x, p.y, p.size * 0.9, 0, TAU);
      g.fillStyle = p.color; g.fill();
    }
    g.restore();

    // floating numbers
    g.textAlign = 'center';
    g.lineJoin = 'round';
    for (const f of game.floaters) {
      g.font = f.big ? '700 13px Fredoka, system-ui, sans-serif' : '600 9px Fredoka, system-ui, sans-serif';
      g.globalAlpha = Math.min(1, f.life * 2);
      g.lineWidth = 3; g.strokeStyle = 'rgba(30,20,60,.85)';
      g.strokeText(f.text, f.x, f.y);
      g.fillStyle = f.color; g.fillText(f.text, f.x, f.y);
    }
    g.globalAlpha = 1;
  }
}

function roomLights(game, t, playing) {
  const out = [];
  decorLights(game.room, game.dungeon.theme, t, out);
  const glow = 1 + Math.sin(t * 2) * 0.1;
  out.push({ x: 0, y: 0, r: (game.floorClear ? 200 : 90) * glow, rgb: '150,110,255', tint: game.floorClear ? 0.1 : 0.05 });
  if (playing) {
    for (const p of game.portals) out.push({ x: p.x, y: p.y - 10, r: 160, rgb: PORTAL_RGB[p.kind], tint: 0.22 });
    for (const gm of game.gems) if (gm.gear) out.push({ x: gm.x, y: gm.y - 6, r: 50 + gm.gear.rarity * 14, rgb: RARITY_RGB[gm.gear.rarity], tint: 0.06 + gm.gear.rarity * 0.03 });
    for (const e of game.enemies) if (e.elite) out.push({ x: e.x, y: e.y, r: e.r * 3, rgb: '255,200,80', tint: 0.08 });
    for (const s of game.shots) out.push({ x: s.x, y: s.y, r: 34, rgb: '255,140,200', tint: 0.05 });
    for (const h of game.hazards) if (h.kind === 'circle') out.push({ x: h.x, y: h.y, r: h.r * 1.3, rgb: '255,60,70', tint: 0.08 });
    out.push({ x: game.px, y: game.py, r: 200, rgb: '255,200,140', tint: 0.06 });
  }
  return out;
}

// faint engraved circle in the middle of the room; brightens when the floor is clear
function runeCircle(g, t, lit) {
  g.save();
  g.globalAlpha = lit ? 0.75 : 0.35;
  g.lineWidth = 2; g.strokeStyle = '#6b55b8';
  g.beginPath(); g.arc(0, 0, 130, 0, TAU); g.stroke();
  g.beginPath(); g.arc(0, 0, 112, 0, TAU); g.stroke();
  g.lineWidth = 1.4;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU + t * 0.05;
    g.save(); g.rotate(a); g.translate(121, 0);
    g.beginPath(); g.moveTo(-4, -3); g.lineTo(0, 3); g.lineTo(4, -3); g.stroke();
    g.restore();
  }
  g.beginPath(); g.arc(0, 0, 44, 0, TAU); g.stroke();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4;
    g.beginPath(); g.moveTo(Math.cos(a) * 48, Math.sin(a) * 48); g.lineTo(Math.cos(a) * 108, Math.sin(a) * 108); g.stroke();
  }
  g.restore();
}

function portalBase(g, p, clearT, t) {
  const k = Math.min(1, clearT * 2);
  g.beginPath(); g.ellipse(p.x, p.y + 6, (PORTAL.r + 8) * k, (PORTAL.r * 0.45 + 4) * k, 0, 0, TAU);
  g.fillStyle = '#2b2740'; g.fill(); g.lineWidth = 1.6; g.strokeStyle = OUT; g.stroke();
}

// Emissive room layer: torch flames, mushroom spores, portals and their labels.
function roomGlow(g, game, t) {
  g.save(); g.globalCompositeOperation = 'lighter';
  decorGlow(g, game.room, game.dungeon.theme, t);
  for (const p of game.portals || []) portalSwirl(g, p, game.clearT, t);
  g.restore();
  g.font = '600 9px Fredoka, system-ui, sans-serif';
  g.textAlign = 'center';
  for (const p of game.portals || []) {
    g.globalAlpha = p.armed ? 1 : 0.45;
    g.lineWidth = 3; g.strokeStyle = 'rgba(20,14,40,.9)';
    g.strokeText(PORTAL_LABEL[p.kind], p.x, p.y - 48);
    g.fillStyle = '#fff'; g.fillText(PORTAL_LABEL[p.kind], p.x, p.y - 48);
  }
  g.globalAlpha = 1;
}

function portalSwirl(g, p, clearT, t) {
  const k = Math.min(1, clearT * 2), rgb = PORTAL_RGB[p.kind], a = p.armed ? 1 : 0.5;
  const R = PORTAL.r * k;
  const gr = g.createRadialGradient(p.x, p.y - 14, 2, p.x, p.y - 14, R * 1.9);
  gr.addColorStop(0, `rgba(${rgb},${0.55 * a})`); gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr; g.fillRect(p.x - R * 2, p.y - 14 - R * 2, R * 4, R * 4);
  for (let i = 0; i < 3; i++) {
    const s = t * (2 + i * 0.6) * (p.kind === 'down' ? -1 : 1) + i * 2;
    g.beginPath(); g.ellipse(p.x, p.y - 14, R * (0.45 + i * 0.25), R * (0.8 + i * 0.25), 0, s, s + 2.4);
    g.lineWidth = 2.4; g.strokeStyle = `rgba(${rgb},${0.6 * a})`; g.stroke();
  }
  g.beginPath(); g.ellipse(p.x, p.y + 6, R, R * 0.45, 0, 0, TAU);
  g.lineWidth = 2; g.strokeStyle = `rgba(${rgb},${0.8 * a})`; g.stroke();
  // rising motes
  for (let i = 0; i < 6; i++) {
    const ph = (t * 0.6 + i / 6) % 1;
    g.beginPath(); g.arc(p.x + Math.sin(i * 9 + t * 2) * R * 0.7, p.y + 4 - ph * 50, 1.5 * (1 - ph), 0, TAU);
    g.fillStyle = `rgba(${rgb},${(1 - ph) * a})`; g.fill();
  }
}

function shadow(g, x, y, rx, ry) {
  g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU);
  g.fillStyle = 'rgba(20,30,40,.22)'; g.fill();
}

const SLASH = { warrior: '255,214,120', default: '255,255,255' };

// Visual for one attack instance (run/hits.js); k = remaining life 1 → 0.
function drawHit(g, h, avatar, t) {
  const k = Math.max(0, h.life / h.maxLife);
  const p = 1 - k;
  if (h.fx === 'slash') {
    const a0 = h.angle - h.arc / 2, sweep = h.arc * Math.min(1, p * 2.4);
    const col = SLASH[avatar?.classId] || SLASH.default;
    g.save();
    g.globalAlpha = Math.min(1, k * 1.5);
    g.beginPath();
    g.arc(h.x, h.y, h.r + 2, a0, a0 + sweep);
    g.arc(h.x, h.y, h.r * 0.35, a0 + sweep, a0, true);
    g.closePath();
    const gr = g.createRadialGradient(h.x, h.y, h.r * 0.35, h.x, h.y, h.r + 2);
    gr.addColorStop(0, `rgba(${col},0)`);
    gr.addColorStop(0.7, `rgba(${col},.55)`);
    gr.addColorStop(1, `rgba(${col},.95)`);
    g.fillStyle = gr; g.fill();
    g.globalCompositeOperation = 'lighter';
    g.beginPath(); g.arc(h.x, h.y, h.r, a0, a0 + sweep);
    g.lineCap = 'round';
    g.lineWidth = 7; g.strokeStyle = `rgba(${col},.35)`; g.stroke();
    g.lineWidth = 3; g.strokeStyle = '#fff'; g.stroke();
    g.restore();
  } else if (h.fx === 'stab') {
    g.save();
    g.translate(h.x, h.y); g.rotate(h.angle);
    g.globalAlpha = Math.min(1, k * 1.8);
    const reach = h.r * (0.55 + 0.45 * Math.min(1, p * 3)) + 8;
    g.beginPath(); g.moveTo(6, -7); g.quadraticCurveTo(reach * 0.6, -4, reach, 0); g.quadraticCurveTo(reach * 0.6, 4, 6, 7); g.closePath();
    const gr = g.createLinearGradient(6, 0, reach, 0);
    gr.addColorStop(0, 'rgba(255,77,94,0)'); gr.addColorStop(0.5, 'rgba(255,120,140,.6)'); gr.addColorStop(1, 'rgba(255,255,255,1)');
    g.fillStyle = gr; g.fill();
    g.globalCompositeOperation = 'lighter';
    g.beginPath(); g.moveTo(10, 0); g.lineTo(reach + 2, 0);
    g.lineWidth = 2; g.lineCap = 'round'; g.strokeStyle = 'rgba(255,255,255,.9)'; g.stroke();
    g.restore();
  } else if (h.fx === 'arrow') {
    g.save();
    g.translate(h.x, h.y); g.rotate(h.angle);
    g.beginPath(); g.moveTo(-26, 0); g.lineTo(-8, 0);
    g.lineWidth = 3; g.lineCap = 'round'; g.strokeStyle = 'rgba(255,255,255,.25)'; g.stroke();
    g.beginPath(); g.moveTo(-9, 0); g.lineTo(5, 0);
    g.lineWidth = 2.6; g.strokeStyle = '#2a2140'; g.stroke();
    g.lineWidth = 1.4; g.strokeStyle = '#c8874e'; g.stroke();
    g.beginPath(); g.moveTo(9, 0); g.lineTo(3, -3.2); g.lineTo(3, 3.2); g.closePath();
    g.fillStyle = '#e6ecf5'; g.fill(); g.lineWidth = 1; g.strokeStyle = '#2a2140'; g.stroke();
    g.fillStyle = '#ff6b8b';
    g.beginPath(); g.moveTo(-9, 0); g.lineTo(-12, -3); g.lineTo(-7, 0); g.lineTo(-12, 3); g.closePath(); g.fill();
    g.restore();
  } else if (h.fx === 'fireball') {
    g.save(); g.globalCompositeOperation = 'lighter';
    glow(g, h.x - h.vx * 0.04, h.y - h.vy * 0.04, h.r * 2.6, '255,110,40');
    glow(g, h.x, h.y, h.r * 3, '255,160,60');
    g.restore();
    g.beginPath(); g.arc(h.x, h.y, h.r * 0.9, 0, TAU); g.fillStyle = '#fff3b0'; g.fill();
  } else if (h.fx === 'boom') {
    const rr = h.r * (0.45 + 0.55 * Math.min(1, p * 2.5));
    g.save(); g.globalCompositeOperation = 'lighter';
    glow(g, h.x, h.y, rr * 1.3, `255,140,50`);
    g.restore();
    g.beginPath(); g.arc(h.x, h.y, rr, 0, TAU);
    g.lineWidth = 3 * k + 0.5; g.strokeStyle = `rgba(255,220,120,${k})`; g.stroke();
  } else if (h.fx === 'spin') {
    const a0 = t * 16;
    g.save();
    g.globalAlpha = Math.min(1, k * 4);
    g.beginPath(); g.arc(h.x, h.y, h.r, 0, TAU);
    g.fillStyle = 'rgba(255,214,120,.10)'; g.fill();
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const a = a0 + (i * TAU) / 3;
      g.beginPath(); g.arc(h.x, h.y, h.r * 0.92, a, a + 1.1);
      g.arc(h.x, h.y, h.r * 0.45, a + 1.1, a, true); g.closePath();
      const gr = g.createRadialGradient(h.x, h.y, h.r * 0.45, h.x, h.y, h.r);
      gr.addColorStop(0, 'rgba(255,214,120,0)'); gr.addColorStop(1, 'rgba(255,230,160,.8)');
      g.fillStyle = gr; g.fill();
    }
    g.restore();
  } else if (h.fx === 'rain') {
    g.save();
    g.globalAlpha = Math.min(1, k * 5);
    g.beginPath(); g.arc(h.x, h.y, h.r, 0, TAU);
    g.fillStyle = 'rgba(255,107,139,.12)'; g.fill();
    g.setLineDash([6, 5]); g.lineDashOffset = -t * 20;
    g.lineWidth = 2; g.strokeStyle = 'rgba(255,170,190,.85)'; g.stroke();
    g.setLineDash([]);
    // falling arrows: fixed pseudo-random spots, each dropping on a short loop
    for (let i = 0; i < 14; i++) {
      const fx = Math.sin(i * 12.99) * 0.8, fy = Math.cos(i * 78.23) * 0.8;
      const ph = (t * 3.2 + i * 0.37) % 1;
      const x = h.x + fx * h.r, y = h.y + fy * h.r - (1 - ph) * 40;
      g.globalAlpha = Math.min(1, k * 5) * (1 - ph * 0.6);
      g.beginPath(); g.moveTo(x, y - 12); g.lineTo(x, y);
      g.lineWidth = 1.6; g.strokeStyle = '#fff'; g.stroke();
      g.beginPath(); g.moveTo(x, y + 4); g.lineTo(x - 2.4, y - 1); g.lineTo(x + 2.4, y - 1); g.closePath();
      g.fillStyle = '#e6ecf5'; g.fill();
    }
    g.restore();
  } else if (h.fx === 'pierce') {
    g.save();
    g.translate(h.x, h.y); g.rotate(h.angle);
    g.globalCompositeOperation = 'lighter';
    const gr = g.createLinearGradient(-60, 0, 10, 0);
    gr.addColorStop(0, 'rgba(255,214,90,0)'); gr.addColorStop(1, 'rgba(255,214,90,.75)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(-60, -5); g.lineTo(10, -8); g.lineTo(10, 8); g.lineTo(-60, 5); g.fill();
    g.globalCompositeOperation = 'source-over';
    g.beginPath(); g.moveTo(-14, 0); g.lineTo(8, 0);
    g.lineWidth = 4.5; g.lineCap = 'round'; g.strokeStyle = '#2a2140'; g.stroke();
    g.lineWidth = 2.6; g.strokeStyle = '#ffd36b'; g.stroke();
    g.beginPath(); g.moveTo(16, 0); g.lineTo(6, -6); g.lineTo(6, 6); g.closePath();
    g.fillStyle = '#fff4b8'; g.fill(); g.lineWidth = 1.2; g.strokeStyle = '#2a2140'; g.stroke();
    g.restore();
  } else if (h.fx === 'nova') {
    const rr = h.r * (0.25 + 0.75 * Math.min(1, p * 2.2));
    g.save();
    g.globalAlpha = k;
    g.beginPath(); g.arc(h.x, h.y, rr, 0, TAU);
    g.fillStyle = 'rgba(150,215,255,.22)'; g.fill();
    g.lineWidth = 4; g.strokeStyle = 'rgba(210,240,255,.95)'; g.stroke();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      g.beginPath();
      g.moveTo(h.x + Math.cos(a) * rr, h.y + Math.sin(a) * rr);
      g.lineTo(h.x + Math.cos(a) * (rr + 9), h.y + Math.sin(a) * (rr + 9));
      g.lineWidth = 2.4; g.strokeStyle = '#e8f7ff'; g.stroke();
    }
    g.restore();
  } else if (h.fx === 'dagger') {
    g.save();
    g.translate(h.x, h.y); g.rotate(h.angle);
    g.beginPath(); g.moveTo(9, 0); g.lineTo(0, -2.4); g.lineTo(-3, 0); g.lineTo(0, 2.4); g.closePath();
    g.fillStyle = '#eef2fb'; g.fill(); g.lineWidth = 1; g.strokeStyle = '#2a2140'; g.stroke();
    g.beginPath(); g.moveTo(-3, 0); g.lineTo(-8, 0); g.lineWidth = 2.4; g.lineCap = 'round'; g.strokeStyle = '#ff4d5e'; g.stroke();
    g.restore();
  } else if (h.fx === 'shout') { // Teriakan Baja shockwave
    const rr = h.r * (0.2 + 0.8 * Math.min(1, p * 2));
    g.save();
    g.globalAlpha = k;
    g.beginPath(); g.arc(h.x, h.y, rr, 0, TAU);
    g.fillStyle = 'rgba(255,214,120,.18)'; g.fill();
    g.lineWidth = 5 * k + 1; g.strokeStyle = 'rgba(255,230,160,.95)'; g.stroke();
    g.restore();
  } else if (h.fx === 'shadow') {
    // the dash itself draws the afterimages
  } else {
    g.beginPath(); g.arc(h.x, h.y, h.r, 0, TAU);
    g.lineWidth = 2; g.strokeStyle = `rgba(255,255,255,${0.6 * k})`; g.stroke();
  }
}

// Teriakan Baja: golden pulse around the player while damage taken is halved.
function shoutAura(g, x, y, t, a) {
  const pulse = 1 + Math.sin(t * 8) * 0.06;
  g.save();
  g.globalAlpha = a;
  g.beginPath(); g.arc(x, y - 6, 26 * pulse, 0, TAU);
  g.fillStyle = 'rgba(255,214,120,.12)'; g.fill();
  g.lineWidth = 2.5; g.strokeStyle = 'rgba(255,214,120,.8)'; g.stroke();
  g.restore();
}

// potion effects on the player: shield bubble, wind streaks, rage glow
function potionAuras(g, game, t) {
  const x = game.px, y = game.py - 6;
  if (game.shield > 0) {
    const k = Math.min(1, game.shield / (game.shieldMax || 1));
    g.save();
    g.globalAlpha = 0.35 + 0.5 * k;
    const gr = g.createRadialGradient(x - 6, y - 8, 4, x, y, 24);
    gr.addColorStop(0, 'rgba(200,230,255,.05)'); gr.addColorStop(0.8, 'rgba(120,190,255,.25)'); gr.addColorStop(1, 'rgba(160,210,255,.7)');
    g.beginPath(); g.arc(x, y, 24 + Math.sin(t * 5) * 0.8, 0, TAU);
    g.fillStyle = gr; g.fill();
    g.lineWidth = 1.6; g.strokeStyle = 'rgba(190,225,255,.9)'; g.stroke();
    g.restore();
  }
  if (game.buffs.rage > 0) {
    g.save(); g.globalCompositeOperation = 'lighter';
    const gr = g.createRadialGradient(x, y + 6, 4, x, y + 6, 30);
    gr.addColorStop(0, 'rgba(255,120,40,.35)'); gr.addColorStop(1, 'rgba(255,80,20,0)');
    g.fillStyle = gr; g.fillRect(x - 30, y - 24, 60, 60);
    g.restore();
  }
  if (game.buffs.wind > 0) {
    g.save(); g.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const a = t * 6 + i * 2.1;
      g.beginPath(); g.arc(x, y + 8, 18 + i * 3, a, a + 1.2);
      g.lineWidth = 1.6; g.strokeStyle = 'rgba(143,245,200,.7)'; g.stroke();
    }
    g.restore();
  }
}

// soft chevron on a ring around the player pointing where attacks will go
function aimMarker(g, x, y, ax, ay) {
  const a = Math.atan2(ay, ax), R = 24;
  g.save();
  g.translate(x, y + 2); g.rotate(a);
  g.beginPath(); g.arc(0, 0, R, -0.45, 0.45);
  g.lineWidth = 2; g.lineCap = 'round'; g.strokeStyle = 'rgba(255,255,255,.35)'; g.stroke();
  g.beginPath(); g.moveTo(R + 2, -4); g.lineTo(R + 8, 0); g.lineTo(R + 2, 4);
  g.lineJoin = 'round'; g.lineWidth = 2.4; g.strokeStyle = 'rgba(255,255,255,.85)'; g.stroke();
  g.restore();
}

function glow(g, x, y, r, rgb) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, `rgba(${rgb},.9)`); gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
}

function hpPill(g, x, y, w, k, elite = false) {
  const h = 3.2;
  g.beginPath(); g.roundRect(x - w / 2, y, w, h, h / 2);
  g.fillStyle = 'rgba(20,14,44,.75)'; g.fill();
  if (k > 0) {
    g.beginPath(); g.roundRect(x - w / 2 + 0.6, y + 0.6, Math.max(h - 1.2, (w - 1.2) * k), h - 1.2, (h - 1.2) / 2);
    g.fillStyle = elite ? '#ffc94d' : '#ff5f7e'; g.fill();
  }
}

// telegraphed danger: red zone filling up until it goes off
function hazard(g, h, t) {
  const k = 1 - Math.max(0, h.t) / h.max;
  g.save();
  if (h.kind === 'line') {
    const a = Math.atan2(h.y2 - h.y, h.x2 - h.x), len = Math.hypot(h.x2 - h.x, h.y2 - h.y);
    g.translate(h.x, h.y); g.rotate(a);
    g.fillStyle = `rgba(255,60,80,${0.12 + 0.18 * k})`;
    g.fillRect(0, -h.w / 2, len, h.w);
    g.fillStyle = 'rgba(255,90,110,.55)';
    g.fillRect(0, -h.w / 2, len * k, h.w);
    g.strokeStyle = 'rgba(255,120,130,.8)'; g.lineWidth = 1.5; g.setLineDash([6, 5]);
    g.strokeRect(0, -h.w / 2, len, h.w);
  } else {
    g.beginPath(); g.arc(h.x, h.y, h.r, 0, TAU);
    g.fillStyle = `rgba(255,50,70,${0.1 + 0.15 * k})`; g.fill();
    g.lineWidth = 2; g.strokeStyle = `rgba(255,110,120,${0.6 + 0.4 * Math.sin(t * 20) ** 2})`; g.setLineDash([7, 5]); g.lineDashOffset = -t * 30; g.stroke();
    g.setLineDash([]);
    g.beginPath(); g.arc(h.x, h.y, h.r * k, 0, TAU);
    g.fillStyle = 'rgba(255,80,90,.35)'; g.fill();
  }
  g.restore();
}

// steel shield arc in front of a Kura Baja, turned toward where it faces
function guard(g, e) {
  g.save();
  g.translate(e.x, e.y);
  g.rotate(e.face);
  g.beginPath(); g.arc(0, 0, e.r + 7, -1.15, 1.15); g.arc(0, 0, e.r + 2, 1.15, -1.15, true); g.closePath();
  g.fillStyle = 'rgba(180,200,230,.9)'; g.fill();
  g.lineWidth = 1.5; g.strokeStyle = OUT; g.stroke();
  g.beginPath(); g.arc(0, 0, e.r + 5, -0.9, 0.9); g.lineWidth = 1.2; g.strokeStyle = 'rgba(255,255,255,.7)'; g.stroke();
  g.restore();
}

// enemy projectiles + expanding rings (heals, blasts), glowing over the darkness
function enemyShots(g, game, t) {
  g.save(); g.globalCompositeOperation = 'lighter';
  for (const s of game.shots) {
    const gr = g.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 2.6);
    gr.addColorStop(0, s.color || '#ff6b8b'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(s.x - s.r * 3, s.y - s.r * 3, s.r * 6, s.r * 6);
  }
  for (const p of game.pulses) {
    const k = 1 - p.t / p.max;
    g.beginPath(); g.arc(p.x, p.y, p.r * (0.3 + 0.7 * k), 0, TAU);
    g.lineWidth = 3 * (1 - k) + 0.5; g.strokeStyle = `rgba(${p.color},${1 - k})`; g.stroke();
  }
  g.restore();
  for (const s of game.shots) {
    g.beginPath(); g.arc(s.x, s.y, s.r * 0.75, 0, TAU);
    g.fillStyle = '#fff'; g.fill();
    g.lineWidth = 1.2; g.strokeStyle = s.color || '#ff6b8b'; g.stroke();
  }
}

// golden ring and glow under an elite
function eliteAura(g, e, t) {
  const p = 1 + Math.sin(t * 4 + e.wob) * 0.08;
  g.save();
  const gr = g.createRadialGradient(e.x, e.y, e.r * 0.4, e.x, e.y, e.r * 1.7 * p);
  gr.addColorStop(0, 'rgba(255,200,80,.35)'); gr.addColorStop(1, 'rgba(255,200,80,0)');
  g.fillStyle = gr; g.fillRect(e.x - e.r * 2, e.y - e.r * 2, e.r * 4, e.r * 4);
  g.beginPath(); g.ellipse(e.x, e.y + e.r * 0.75, e.r * 1.05 * p, e.r * 0.36 * p, 0, 0, TAU);
  g.lineWidth = 2; g.strokeStyle = 'rgba(255,214,110,.85)'; g.stroke();
  g.restore();
}

// gear lying on the floor: a beam in the rarity colour and the slot icon
function gearDrop(g, gm, t) {
  const item = gm.gear, rgb = RARITY_RGB[item.rarity];
  const bob = Math.sin(gm.t) * 2;
  const tall = 26 + item.rarity * 9;
  g.save();
  g.globalCompositeOperation = 'lighter';
  const beam = g.createLinearGradient(0, gm.y - tall, 0, gm.y + 4);
  beam.addColorStop(0, `rgba(${rgb},0)`); beam.addColorStop(1, `rgba(${rgb},${0.35 + item.rarity * 0.08})`);
  g.fillStyle = beam; g.fillRect(gm.x - 5, gm.y - tall, 10, tall + 4);
  g.beginPath(); g.ellipse(gm.x, gm.y + 5, 11, 4, 0, 0, TAU);
  g.fillStyle = `rgba(${rgb},.45)`; g.fill();
  g.restore();
  g.beginPath(); g.arc(gm.x, gm.y - 4 + bob, 8.5, 0, TAU);
  g.fillStyle = 'rgba(20,14,40,.85)'; g.fill();
  g.lineWidth = 1.8; g.strokeStyle = RARITIES[item.rarity].color; g.stroke();
  g.save(); g.translate(gm.x, gm.y - 4 + bob); drawIcon(g, gearIcon(item), 13); g.restore();
}

// jagged lightning between two points; deterministic per segment so it doesn't flicker
function bolt(g, x1, y1, x2, y2, k) {
  const n = 6, dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  g.beginPath(); g.moveTo(x1, y1);
  for (let i = 1; i < n; i++) {
    const off = Math.sin(i * 12.9898 + x1 * 0.1) * 5;
    g.lineTo(x1 + (dx * i) / n + nx * off, y1 + (dy * i) / n + ny * off);
  }
  g.lineTo(x2, y2);
  g.globalAlpha = k;
  g.lineWidth = 8; g.strokeStyle = 'rgba(190,160,255,.35)'; g.stroke();
  g.lineWidth = 3; g.strokeStyle = '#fff6b0'; g.stroke();
  g.globalAlpha = 1;
}
