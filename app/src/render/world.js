// Dungeon rendering (spec §13.3, §18.3): the floor's room in its dungeon's
// theme (render/dungeonroom.js), actors, portals once a floor is clear. Camera
// follows the player; darkness with light holes comes from render/light.js and
// emissive effects (attacks, flames, portals) are drawn over it.
import { tr, t as tf } from '../i18n.js';
import { PORTAL } from '../data/dungeon.js';
import { DUNGEONS } from '../data/dungeons.js';
import { flagTile, drawRoom, decorLights, decorGlow } from './dungeonroom.js';
import { ENEMIES } from '../data/enemies.js';
import { SPRITES, bakeAll, drawBaked, OUT } from '../art/sprites.js';
import { drawGearIcon } from '../art/gear.js';
import { DROP_BEAM } from '../data/itemfx.js';
import { levelRing, auraBack, auraFront, bestRarity } from '../art/aura.js';
import { RARITIES, MYTHIC } from '../data/items.js';
import { drawDoll } from '../art/doll.js';
import { ATTACK_POSE } from '../run/skills.js';
import { DODGE } from '../data/balance.js';
import { moveDuration } from '../art/hero/rig.js';
import { groundTile, drawField, fieldDecorLights, targetArrow } from './field.js';
import { REGIONS } from '../data/world.js';
import { skyAt } from '../meta/clock.js';
import { drawVfx, drawFlashes, drawFloaters } from './fxkit.js';
import { drawHit, drawUltTint, drawBuffAura, drawEnemyMarks, heroScale, drawTraitHero, drawFocusAim, playerAlpha } from './skillfx.js';
import { SHAKE_PX } from '../data/fx.js';

const DOLL_SCALE = 0.82;   // player doll size in world units
const ATTACK_ANIM = 0.45;  // seconds of the keyframed swing (style-D heroes)
const TAU = Math.PI * 2;
const ENEMY_R = Object.fromEntries(Object.entries(ENEMIES).map(([k, e]) => [k, e.r]));
const PORTAL_RGB = { down: '90,170,255', home: '255,200,90' };
export const portalLabel = (kind, floor) => (kind === 'down' ? tf('Turun ke Lantai {n}', { n: floor + 1 }) : tr('Pulang'));
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
    this.atkStart = -9; this.lastAttackT = 0; // keyframed swing: starts when a new attack fires
    this.lastCast = null; this.move = null;  // skill move being played: { id, t0, dur }
    this.trail = [];      // dodge afterimages: { x, y, life }
    this.shakeOn = true;  // off in the 'lite' effects setting and with Settings → screen shake off (main.js)
    this.numbersOn = true; // Settings → damage numbers (main.js)
    this.rect = { x0: 0, y0: 0, x1: 0, y1: 0 }; // visible world area, for culling effects
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
    for (const r of REGIONS) { // open-world regions (spec §25.1)
      if (!r.theme) continue;
      const tile = groundTile(v.S, r.theme.ground, r.biome);
      const pat = v.ctx.createPattern(tile.canvas, 'repeat');
      pat.setTransform(new DOMMatrix().scale(tile.T / tile.canvas.width));
      this.grounds[`field:${r.id}`] = pat;
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
    // a jump (new floor, entering a region, warping): snap instead of gliding across the map
    if (playing && Math.hypot(tx - this.camX, ty - this.camY) > 1200) { this.camX = tx; this.camY = ty; }
    this.camX += (tx - this.camX) * (playing ? 0.12 : 0.02);
    this.camY += (ty - this.camY) * (playing ? 0.12 : 0.02);
    let shx = 0, shy = 0;
    if (playing && game.shake > 0 && this.shakeOn) {
      // Math.random, not rng.js: render runs at display rate, so drawing from the
      // sim PRNG would make spawns depend on frame rate and break replay
      shx = (Math.random() - 0.5) * game.shake * SHAKE_PX;
      shy = (Math.random() - 0.5) * game.shake * SHAKE_PX;
    }
    const cx = this.camX + shx, cy = this.camY + shy;
    const hw = v.viewW / 2 + 30, hh = v.viewH / 2 + 30;
    const visible = (x, y, m = 0) => Math.abs(x - cx) < hw + m && Math.abs(y - cy) < hh + m;
    const rect = this.rect;
    rect.x0 = cx - hw; rect.y0 = cy - hh; rect.x1 = cx + hw; rect.y1 = cy + hh;

    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#05040c'; g.fillRect(0, 0, v.c.width, v.c.height);
    v.begin(cx, cy);
    g.imageSmoothingEnabled = true;
    g.lineJoin = 'round';

    if (game.field) {
      drawField(g, game, this.grounds[`field:${game.region.id}`], t, rect);
      if (playing) this.drawRun(g, game, t, visible);
      // regions follow the clock (spec §18.4): never fully bright under the canopy
      const sky = skyAt(game.clock ?? 12 * 60);
      const out = [];
      fieldDecorLights(game, t, out, rect);
      actorLights(game, out, playing, 260 + sky.night * 60);
      // Tanah Gerhana (spec §26.7) lies under the eclipse: always dusk-dark and violet, no sunlight
      const eclipse = game.region.biome === 'eclipse';
      this.lighting.draw(cx, cy, out, eclipse ? `rgba(16,6,34,${Math.max(0.62, sky.dark).toFixed(3)})` : `rgba(${sky.rgb.join(',')},${Math.max(0.16, sky.dark).toFixed(3)})`);
      if (!eclipse) daylight(v, g, sky);
      v.begin(cx, cy);
      if (playing) this.drawFx(g, game, t);
      if (playing) targetArrow(g, game, t); // expedition (spec §25.5)
    } else {
      this.drawRoom(g, game, t, visible);
      if (playing) this.drawRun(g, game, t, visible);
      this.lighting.draw(cx, cy, roomLights(game, t, playing), game.dark ? 'rgba(3,0,10,.94)' : game.dungeon.theme.ambient);
      v.begin(cx, cy);
      roomGlow(g, game, t);
      if (playing) this.drawFx(g, game, t);
    }
    v.vignetteOverlay();
    if (playing) drawFlashes(g, game.vfx, v.c.width, v.c.height);
    // fade in at the start of each floor (regions: when arriving)
    const fade = playing ? 1 - (game.field ? game.time : game.floorT) * 2.5 : 0;
    if (fade > 0) { g.fillStyle = `rgba(5,4,12,${fade})`; g.fillRect(0, 0, v.c.width, v.c.height); }
  }

  // the skill move to play: starts when the run reports a new cast (a new game.castPose object)
  skillMove(game, t) {
    const c = game.castPose;
    if (c && c !== this.lastCast && this.avatar) {
      this.lastCast = c;
      this.move = { id: c.id, t0: t, dur: moveDuration(this.avatar.classId, c.id, c.dur) };
    }
    if (!this.move) return undefined;
    const ph = (t - this.move.t0) / this.move.dur;
    if (ph >= 1 || ph < 0) { this.move = null; return undefined; }
    return { id: this.move.id, ph, dur: this.move.dur };
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
      if (e.hidden && e.ai === 'blink') continue; // a wraith between places (spec §26.7)
      if (e.hidden) { sandMound(g, e, t); continue; } // a burrowed sandworm (spec §25.4)
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
      if (e.mini) crown(g, e.x, e.y - e.r * 1.25 - 14, e.r * 0.5, e.lord);
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
    levelRing(g, game.px, game.py + 10, game.level, t, { lite: game.vfx.mul < 1 });
    auraBack(g, game.px, game.py + 10, game.fx, t, { host: this, lite: game.vfx.mul < 1, best: bestRarity(this.avatar?.look.gear), set: this.avatar?.set, hurt: game.flash > 0, frenzyOn: game.frenzyOn });
    aimMarker(g, game.px, game.py, game.aimX, game.aimY);
    if (this.avatar && !blink) {
      g.save();
      g.globalAlpha = playerAlpha(game); // Bom Asap: a faint silhouette
      g.translate(game.px, game.py + 10);
      if (dodging) g.rotate(game.dodgeX * 0.25);
      const hs = heroScale(game, game.vfx.mul < 1); // Mengamuk (spec §31.8)
      g.scale(DOLL_SCALE * this.facing * hs, DOLL_SCALE * hs);
      const attack = Math.max(0, game.attackT / ATTACK_POSE);
      if (game.attackT > this.lastAttackT + 1e-6) this.atkStart = t;
      this.lastAttackT = game.attackT;
      const ph = (t - this.atkStart) / ATTACK_ANIM;
      const move = this.skillMove(game, t);
      const dodge = dodging ? 1 - game.dodgeT / DODGE.duration : undefined;
      const hero = drawDoll(g, this.avatar.classId, this.avatar.look, { t, moving, walk: this.walk, attack, attackPhase: ph >= 0 && ph < 1 ? ph : undefined, move, dodge, hurt: game.flash > 0 });
      drawTraitHero(g, game, t, hero);
      g.restore();
    }
    playerStatus(g, game, t);

  }

  // Emissive layer drawn over the darkness: attacks, sparks, numbers.
  drawFx(g, game, t) {
    enemyShots(g, game, t);
    // attack instances
    drawUltTint(g, game, this.rect);
    for (const h of game.hits) drawHit(g, h, this.avatar, t);
    drawEnemyMarks(g, game, t);
    drawBuffAura(g, game, t);
    drawFocusAim(g, game, t);
    potionAuras(g, game, t);
    if (this.avatar) auraFront(g, game.px, game.py + 10, game.fx, bestRarity(this.avatar.look.gear), t, { host: this, lite: game.vfx.mul < 1, level: game.level, set: this.avatar.set, facing: this.facing, enemies: game.enemies, frenzyOn: game.frenzyOn, shield: game.shieldMax > 0 ? game.shield / game.shieldMax : 0 });

    drawVfx(g, game.vfx, this.rect);
    // enemy telegraphs stay readable over the player's effects
    for (const h of game.hazards) hazardEdge(g, h, t);
    drawFloaters(g, this.numbersOn ? game.floaters : game.floaters.filter((f) => !f.dmg));
  }
}

function roomLights(game, t, playing) {
  const out = [];
  decorLights(game.room, game.dungeon.theme, t, out);
  const glow = 1 + Math.sin(t * 2) * 0.1;
  out.push({ x: 0, y: 0, r: (game.floorClear ? 200 : 90) * glow, rgb: '150,110,255', tint: game.floorClear ? 0.1 : 0.05 });
  if (playing) for (const p of game.portals) out.push({ x: p.x, y: p.y - 10, r: 160, rgb: PORTAL_RGB[p.kind], tint: 0.22 });
  actorLights(game, out, playing, 200);
  return out;
}

// lights carried by what moves: gear drops, elites, shots, hazards and the player
function actorLights(game, out, playing, playerR) {
  if (playing) {
    for (const gm of game.gems) if (gm.gear) out.push({ x: gm.x, y: gm.y - 6, r: DROP_BEAM.light[gm.gear.rarity], rgb: RARITY_RGB[gm.gear.rarity], tint: 0.06 + gm.gear.rarity * 0.03 });
    for (const e of game.enemies) if (e.elite) out.push({ x: e.x, y: e.y, r: e.r * 3, rgb: '255,200,80', tint: 0.08 });
    for (const s of game.shots) out.push({ x: s.x, y: s.y, r: 34, rgb: '255,140,200', tint: 0.05 });
    for (const h of game.hazards) if (h.kind === 'circle') out.push({ x: h.x, y: h.y, r: h.r * 1.3, rgb: '255,60,70', tint: 0.08 });
    out.push({ x: game.px, y: game.py, r: playerR, rgb: '255,200,140', tint: 0.06 });
  }
}

// sunlight lifts the dark palette by day; dawn / dusk add a warm glow (as in town)
function daylight(v, g, sky) {
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (sky.night < 0.95) {
    g.globalCompositeOperation = 'screen';
    g.fillStyle = `rgba(230,240,200,${(0.16 * (1 - sky.night)).toFixed(3)})`; g.fillRect(0, 0, v.c.width, v.c.height);
  }
  if (sky.warm > 0.005) {
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = `rgba(255,130,60,${sky.warm.toFixed(3)})`; g.fillRect(0, 0, v.c.width, v.c.height);
  }
  g.globalCompositeOperation = 'source-over';
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
  g.font = '600 9px Barlow, system-ui, sans-serif';
  g.textAlign = 'center';
  for (const p of game.portals || []) {
    g.globalAlpha = p.armed ? 1 : 0.45;
    g.lineWidth = 3; g.strokeStyle = 'rgba(20,14,40,.9)';
    const label = portalLabel(p.kind, game.floor);
    g.strokeText(label, p.x, p.y - 48);
    g.fillStyle = '#fff'; g.fillText(label, p.x, p.y - 48);
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
  } else if (h.kind === 'hole') { // a black hole: dark core, purple swirl closing in
    const grd = g.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.r);
    grd.addColorStop(0, 'rgba(0,0,0,.95)'); grd.addColorStop(0.45, `rgba(40,10,70,${0.6 + 0.3 * k})`); grd.addColorStop(1, 'rgba(120,60,220,0)');
    g.beginPath(); g.arc(h.x, h.y, h.r, 0, TAU); g.fillStyle = grd; g.fill();
    g.translate(h.x, h.y); g.rotate(t * 3);
    g.strokeStyle = 'rgba(199,155,255,.7)'; g.lineWidth = 2;
    for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(0, 0, h.r * (0.9 - k * 0.5), (i / 4) * TAU, (i / 4) * TAU + 1); g.stroke(); }
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

// outline of a telegraph, redrawn over the effects layer
function hazardEdge(g, h, t) {
  g.save();
  g.lineWidth = 1.5; g.strokeStyle = `rgba(255,120,130,${0.55 + 0.35 * Math.sin(t * 20) ** 2})`;
  g.setLineDash([7, 5]); g.lineDashOffset = -t * 30;
  if (h.kind === 'line') {
    const a = Math.atan2(h.y2 - h.y, h.x2 - h.x), len = Math.hypot(h.x2 - h.x, h.y2 - h.y);
    g.translate(h.x, h.y); g.rotate(a);
    g.strokeRect(0, -h.w / 2, len, h.w);
  } else {
    g.beginPath(); g.arc(h.x, h.y, h.r, 0, TAU); g.stroke();
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

// gear lying on the floor: a pillar of light in the rarity colour (data/itemfx.js
// DROP_BEAM; Legendaris tall, Mitos towering, pulsing and ringing out "ding"s) and the icon
function gearDrop(g, gm, t) {
  const item = gm.gear, r = item.rarity, rgb = RARITY_RGB[r];
  const bob = Math.sin(gm.t) * 2;
  const tall = DROP_BEAM.height[r];
  const w = DROP_BEAM.width[r] * (r === MYTHIC ? 1 + DROP_BEAM.pulse * Math.sin(t * 5) : 1);
  g.save();
  g.globalCompositeOperation = 'lighter';
  const beam = g.createLinearGradient(0, gm.y - tall, 0, gm.y + 4);
  beam.addColorStop(0, `rgba(${rgb},0)`); beam.addColorStop(1, `rgba(${rgb},${0.3 + r * 0.07})`);
  g.fillStyle = beam; g.fillRect(gm.x - w / 2, gm.y - tall, w, tall + 4);
  if (r >= 3) { // bright core
    const core = g.createLinearGradient(0, gm.y - tall * 0.8, 0, gm.y + 2);
    core.addColorStop(0, 'rgba(255,255,255,0)'); core.addColorStop(1, `rgba(255,255,255,${0.15 + (r - 3) * 0.12})`);
    g.fillStyle = core; g.fillRect(gm.x - w * 0.15, gm.y - tall * 0.8, w * 0.3, tall * 0.8 + 2);
  }
  g.beginPath(); g.ellipse(gm.x, gm.y + 5, 11 + r, 4 + r * 0.3, 0, 0, TAU);
  g.fillStyle = `rgba(${rgb},.45)`; g.fill();
  const n = DROP_BEAM.motes[r];
  for (let i = 0; i < n; i++) { // sparks drifting up the beam
    const ph = (t * 0.5 + i / n + gm.x * 0.013) % 1;
    const x = gm.x + Math.sin(i * 5.1 + t * 2) * w * 0.4, y = gm.y - ph * tall;
    g.globalAlpha = Math.sin(ph * Math.PI);
    g.fillStyle = i % 3 ? `rgb(${rgb})` : '#fff';
    g.beginPath(); g.arc(x, y, 1 + (r >= MYTHIC ? 0.4 : 0), 0, TAU); g.fill();
  }
  g.globalAlpha = 1;
  if (r === MYTHIC) for (const off of [0, 0.5]) { // "ding": rings spreading over the floor
    const ph = ((t + gm.x * 0.01) / DROP_BEAM.dingEvery + off) % 1, rr = 8 + ph * DROP_BEAM.dingR;
    g.beginPath(); g.ellipse(gm.x, gm.y + 5, rr, rr * 0.36, 0, 0, TAU);
    g.lineWidth = 2.5 * (1 - ph) + 0.4; g.strokeStyle = `rgba(${off ? '255,209,102' : rgb},${1 - ph})`; g.stroke();
  }
  g.restore();
  g.beginPath(); g.arc(gm.x, gm.y - 4 + bob, 8.5, 0, TAU);
  g.fillStyle = 'rgba(20,14,40,.85)'; g.fill();
  g.lineWidth = 1.8; g.strokeStyle = RARITIES[item.rarity].color; g.stroke();
  g.save(); g.translate(gm.x, gm.y - 4 + bob); drawGearIcon(g, item, 15, t); g.restore();
}

// treasure guardian (spec §25.3): a golden crown over the head; the overlord's is red-jewelled
function crown(g, x, y, w, lord) {
  g.beginPath();
  g.moveTo(x - w, y + 8); g.lineTo(x - w, y - 4); g.lineTo(x - w * 0.5, y + 2); g.lineTo(x, y - 10);
  g.lineTo(x + w * 0.5, y + 2); g.lineTo(x + w, y - 4); g.lineTo(x + w, y + 8); g.closePath();
  g.fillStyle = '#ffc94d'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#3a2408'; g.stroke();
  g.beginPath(); g.arc(x, y + 2, 3, 0, Math.PI * 2); g.fillStyle = lord ? '#ff4d6d' : '#6ec9ff'; g.fill();
}

// a burrowed sandworm: a moving hump of sand with dust; it shakes just before it bursts out
function sandMound(g, e, t) {
  const shake = e.mode === 'rise' ? Math.sin(t * 60) * 3 : 0;
  const x = e.x + shake, y = e.y + e.r * 0.4;
  g.beginPath(); g.ellipse(x, y, e.r * 1.1, e.r * 0.45, 0, 0, Math.PI * 2);
  g.fillStyle = '#8a6440'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = 'rgba(30,18,10,.7)'; g.stroke();
  g.beginPath(); g.ellipse(x - e.r * 0.2, y - e.r * 0.15, e.r * 0.6, e.r * 0.2, 0, 0, Math.PI * 2);
  g.fillStyle = 'rgba(220,180,120,.45)'; g.fill();
  for (let i = 0; i < 5; i++) {
    const ph = (t * 1.6 + i / 5) % 1, a = i * 2.3 + e.x * 0.01;
    g.beginPath(); g.arc(x + Math.cos(a) * e.r * (0.6 + ph), y - ph * e.r * 0.8, e.r * 0.12 * (1 - ph) + 0.6, 0, Math.PI * 2);
    g.fillStyle = `rgba(200,160,100,${(0.6 * (1 - ph)).toFixed(2)})`; g.fill();
  }
}

// what clings to the player: frost (slowed), poison bubbles, flames (spec §25.4)
function playerStatus(g, game, t) {
  const x = game.px, y = game.py;
  if (game.slowT > 0) {
    g.save();
    g.beginPath(); g.ellipse(x, y + 10, 14, 4.5, 0, 0, Math.PI * 2); g.fillStyle = 'rgba(170,225,255,.45)'; g.fill();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.3, cx = x + Math.cos(a) * 11, cy = y + 9 + Math.sin(a) * 3.5, h = 5 + (i % 2) * 3;
      g.beginPath(); g.moveTo(cx - 2, cy); g.lineTo(cx, cy - h); g.lineTo(cx + 2, cy); g.closePath();
      g.fillStyle = '#e8f8ff'; g.fill(); g.lineWidth = 0.8; g.strokeStyle = '#6ab8ff'; g.stroke();
    }
    g.restore();
    g.save(); g.globalAlpha = 0.18; g.beginPath(); g.ellipse(x, y - 8, 11, 18, 0, 0, Math.PI * 2); g.fillStyle = '#8fd0ff'; g.fill(); g.restore();
  }
  if (game.dotT > 0) {
    const burn = game.dotKind === 'burn';
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) {
      const ph = (t * (burn ? 1.8 : 1.1) + i / 6) % 1, ox = Math.sin(i * 4.1 + t * 2) * 8;
      if (burn) {
        const fx = x + ox, fy = y - 2 - ph * 26, s = 4 * (1 - ph) + 1;
        g.beginPath(); g.moveTo(fx, fy - s * 2.2); g.quadraticCurveTo(fx + s, fy, fx, fy + s); g.quadraticCurveTo(fx - s, fy, fx, fy - s * 2.2);
        g.fillStyle = `rgba(255,${120 + (i % 3) * 40},40,${(0.9 * (1 - ph)).toFixed(2)})`; g.fill();
      } else {
        g.beginPath(); g.arc(x + ox, y - 4 - ph * 28, 2.6 * (1 - ph) + 0.8, 0, Math.PI * 2);
        g.fillStyle = `rgba(140,255,90,${(0.85 * (1 - ph)).toFixed(2)})`; g.fill();
      }
    }
    g.restore();
  }
}
