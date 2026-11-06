// What every 2.5D scene with a fight shares (plan "Tampilan 2.5D"): the hero billboard
// (drawDoll + gear glow + body auras), monster billboards (baked sprites), the ground
// "decal" layer painted by the 2D renderer (hazards, pickups, attacks, telegraphs, ground
// auras), and the 2D overlay on top (HP bars, damage numbers, flashes, fades).
import * as THREE from 'three';
import { LOOK } from '../data/look.js';
import { S, sharp } from './stage.js';
import { Renderer } from '../render/world.js';
import { drawFlashes, drawFloaters } from '../render/fxkit.js';
import { playerAlpha, heroScale, drawTraitHero } from '../render/skillfx.js';
import { SPRITES } from '../art/sprites.js';
import { drawDoll } from '../art/doll.js';
import { auraBack, auraFront, bestRarity } from '../art/aura.js';
import { moveDuration } from '../art/hero/rig.js';
import { ENEMIES } from '../data/enemies.js';
import { DODGE } from '../data/balance.js';
import { ATTACK_POSE } from '../run/skills.js';
import { Spell3D } from './spell3d.js';

const DOLL_SCALE = 0.82, ATTACK_ANIM = 0.45;
// lifted into 3D (the rest of the effects stay on the ground decal)
const AIR_KINDS = new Set(['dot', 'ember', 'spark', 'star']);
const PROJ_COLOR = { arrow: '#ffe6a0', fireball: '#ff7a2a', pierce: '#7fd8ff', dagger: '#c9a0ff', axe: '#eef0ff' };
const BLAST_COLOR = { chain: '#bfe0ff', quake: '#ff9a3c', boom: '#ff8a3a', nova: '#9fe8ff', shout: '#ffd27a', rain: '#ffe6a0', spin: '#ff9a5a', shadow: '#b48aff' };
const PROJ_H = 26, MAX_POINTS = 700, MAX_SPRITES = 180;
let glowTex = null;
function glowTexture() { // soft round glow, shared by projectile sprites and particles
  if (glowTex) return glowTex;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return (glowTex = new THREE.CanvasTexture(c));
}
const COLORS = new Map();
function colorOf(css) { // parsed once per colour string (rgba alpha is ignored)
  let c = COLORS.get(css);
  if (!c) {
    const m = /rgba?\(([^)]+)\)/.exec(css);
    c = m ? new THREE.Color(...m[1].split(',').slice(0, 3).map((v) => Number(v) / 255)) : new THREE.Color(css);
    COLORS.set(css, c);
  }
  return c;
}
// hero billboard box around the feet, game units: x ∈ [−HX, HX], y ∈ [−HT, HB]
const HX = 58, HT = 100, HB = 14;

// lit, cut-out billboard material; a little self light keeps it readable in the dark (LOOK.bill)
export function billMat(map, self = LOOK.bill) {
  return new THREE.MeshLambertMaterial({ map, transparent: true, alphaTest: 0.04, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: self, side: THREE.DoubleSide });
}
export function canvasTexture(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }

export class Actors {
  constructor(view, flat, stage, scene) {
    this.view = view; this.flat = flat; this.stage = stage; this.scene = scene;
    this.facing = 1; this.walk = 0; this.atkStart = -9; this.lastAttackT = 0; this.lastCast = null; this.move = null;
    // a second 2D renderer, never constructed (no re-baking), that paints the ground decals
    this.decalR = Object.assign(Object.create(Renderer.prototype), {
      view, lighting: null, rect: { x0: 0, y0: 0, x1: 0, y1: 0 }, avatar: null, trail: [], facing: 1, walk: 0,
      atkStart: -9, lastAttackT: 0, lastCast: null, move: null, shakeOn: false,
    });
    this.texOf = new WeakMap();
    this.enemyMesh = new Map();
    this.decal = document.createElement('canvas');
    this.decalTex = canvasTexture(this.decal);
    this.decalMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.decalTex, transparent: true, depthWrite: false }));
    this.decalMesh.rotation.x = -Math.PI / 2; this.decalMesh.renderOrder = 1; scene.add(this.decalMesh);
    this.heroCanvas = document.createElement('canvas');
    this.heroTex = canvasTexture(this.heroCanvas);
    this.hero = new THREE.Mesh(new THREE.PlaneGeometry((HX * 2) * S, (HT + HB) * S), billMat(this.heroTex, LOOK.heroBill));
    this.hero.renderOrder = 2; scene.add(this.hero);
    this.enemies = new THREE.Group(); scene.add(this.enemies);
    // 3D effects: glowing points for sparks/embers, sprites for projectiles, one light for blasts
    this.pPos = new Float32Array(MAX_POINTS * 3); this.pCol = new Float32Array(MAX_POINTS * 3);
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(this.pPos, 3)); pg.setAttribute('color', new THREE.BufferAttribute(this.pCol, 3));
    this.points = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.32, map: glowTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.points.frustumCulled = false; this.points.renderOrder = 3; scene.add(this.points);
    this.sprites = [];
    this.fxLight = new THREE.PointLight(0xffa050, 0, 12, 1.6); scene.add(this.fxLight);
    this.groundVfx = { particles: { n: 0, items: [] } };
    this.spells = LOOK.spells ? new Spell3D(scene) : null; // upright spell effects (spec §36, plan B)
  }

  sprite(i) { // pooled additive glow sprite
    let sp = this.sprites[i];
    if (!sp) {
      sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      sp.renderOrder = 3; this.scene.add(sp); this.sprites[i] = sp;
    }
    sp.visible = true;
    return sp;
  }

  // projectiles fly at chest height with a short glowing tail; sparks rise; blasts light the room
  fx3d(game, t, playing) {
    let ns = 0;
    const put = (x, y, h, size, css, alpha) => {
      if (ns >= MAX_SPRITES) return;
      const sp = this.sprite(ns++);
      sp.position.set(x * S, h * S, y * S); sp.scale.setScalar(size * S);
      sp.material.color.copy(colorOf(css)); sp.material.opacity = alpha;
    };
    if (playing) {
      for (const h of game.hits) {
        if (h.kind === 'orbit') { // the giant shuriken circling the hero (the flat shape is on the ground decal)
          put(h.x, h.y, PROJ_H, h.r * 1.8 + 10, '#dfe6f2', 0.9);
          put(h.x, h.y, PROJ_H, h.r * 0.8 + 4, '#ffffff', 1);
          continue;
        }
        if (h.kind !== 'proj' || h.dead || (h.delay > 0 && !h.hover)) continue; // a delayed arrow is still being drawn back
        if (this.spells && (h.fx === 'fireball' || h.fx === 'axe')) continue; // drawn billboards instead (spell3d.js)
        if (h.delay > 0) { // a dagger floating in the Dagger Circle: it pulses
          const pu = 0.5 + 0.5 * Math.sin(game.time * 14 + h.angle * 3);
          put(h.x, h.y, PROJ_H, 12 + pu * 8, PROJ_COLOR.dagger, 0.6 + 0.4 * pu);
          put(h.x, h.y, PROJ_H, 6, '#ffffff', 1);
          continue;
        }
        const col = PROJ_COLOR[h.fx] || '#fff1c0', sp = Math.hypot(h.vx, h.vy) || 1, dx = h.vx / sp, dy = h.vy / sp;
        const size = (h.fx === 'fireball' ? 7 : h.fx === 'pierce' || h.fx === 'axe' ? 6 : 3.4) * Math.max(1, h.r / 4) + 10;
        put(h.x, h.y, PROJ_H, size, col, 1);
        put(h.x, h.y, PROJ_H, size * 0.45, '#ffffff', 1);
        for (let k = 1; k <= 4; k++) put(h.x - dx * k * 9, h.y - dy * k * 9, PROJ_H, size * (1 - k * 0.18), col, 0.6 - k * 0.12);
      }
      for (const s of game.shots) {
        put(s.x, s.y, PROJ_H * 0.8, s.r * 3.4 + 8, s.color || '#ff6b8b', 1);
        put(s.x, s.y, PROJ_H * 0.8, s.r * 1.4 + 3, '#ffffff', 1);
      }
    }
    for (let i = ns; i < this.sprites.length; i++) this.sprites[i].visible = false;
    this.spells?.update(game, t, playing, this.stage.yaw, game.vfx?.mul ?? 1);
    // particles: lift the glowing kinds; their height rises a little over their life
    const P = game.vfx?.particles, ground = this.groundVfx.particles;
    let np = 0, ng = 0;
    if (playing && P) for (let i = 0; i < P.n; i++) {
      const q = P.items[i];
      if (!AIR_KINDS.has(q.kind)) { ground.items[ng++] = q; continue; }
      if (np >= MAX_POINTS) continue;
      const k = q.life / q.max, h = 10 + (1 - k) * 34 + ((i * 7) % 11);
      this.pPos[np * 3] = q.x * S; this.pPos[np * 3 + 1] = h * S; this.pPos[np * 3 + 2] = q.y * S;
      const c = colorOf(q.color), a = Math.min(1, k * 1.5);
      this.pCol[np * 3] = c.r * a; this.pCol[np * 3 + 1] = c.g * a; this.pCol[np * 3 + 2] = c.b * a;
      np++;
    }
    ground.n = ng;
    const geo = this.points.geometry;
    geo.setDrawRange(0, np);
    geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
    // the biggest blast on screen lights its surroundings for a moment
    let best = null;
    if (playing) for (const h of game.hits) if (h.kind !== 'proj' && BLAST_COLOR[h.fx] && h.life > 0 && !(h.delay > 0) && (!best || (h.r || 0) > (best.r || 0))) best = h;
    const L = this.fxLight;
    if (best) {
      const k = Math.min(1, best.life / (best.maxLife || 1));
      L.position.set(best.x * S, 2.2, best.y * S); L.color.copy(colorOf(BLAST_COLOR[best.fx])); L.distance = Math.max(6, (best.r || 60) * S * 2.4); L.intensity = 30 * k;
    } else L.intensity = 0;
  }
  get avatar() { return this.flat.avatar; }

  // ground layer: a square around (cx, cy) pushed away from the camera (the far side shows more floor)
  paintDecal(game, t, lite, cx, cy, extra) {
    const k = sharp('decal', lite), W = 1300, H = 1300, yaw = this.stage.yaw;
    const x0 = cx - W / 2 - Math.sin(yaw) * 160, y0 = cy - H / 2 - Math.cos(yaw) * 160;
    const c = this.decal, cw = Math.ceil(W * k), chh = Math.ceil(H * k);
    if (c.width !== cw || c.height !== chh) { c.width = cw; c.height = chh; this.decalTex.dispose(); }
    const g = c.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cw, chh);
    g.setTransform(k, 0, 0, k, -x0 * k, -y0 * k);
    g.lineJoin = 'round';
    const D = this.decalR;
    D.rect.x0 = x0; D.rect.y0 = y0; D.rect.x1 = x0 + W; D.rect.y1 = y0 + H;
    const visible = (x, y, m = 0) => x > x0 - m && x < x0 + W + m && y > y0 - m && y < y0 + H + m;
    if (extra) extra(g, visible); // scene ground art under the actors (e.g. field paths)
    if (game.state !== 0) {
      // the 2D renderer paints the ground layer; monsters, hero and numbers stand up instead
      const ghost = Object.create(game);
      ghost.enemies = []; ghost.floaters = []; ghost.fx = {}; ghost.shots = [];
      ghost.hits = game.hits.filter((h) => h.kind !== 'proj'); // projectiles fly in 3D (fx3d)
      // only the ground effects stay here: the glowing particles rise in 3D (fx3d fills groundVfx first)
      const gv = this.groundVfx;
      gv.cracks = game.vfx.cracks; gv.rings = game.vfx.rings; gv.flashes = game.vfx.flashes;
      ghost.vfx = Object.assign(Object.create(game.vfx), gv);
      D.drawRun(g, ghost, t, visible);
      for (const e of game.enemies) { // soft shadows under the standing monsters
        if (e.hidden || !visible(e.x, e.y, 40)) continue;
        g.beginPath(); g.ellipse(e.x, e.y + e.r * 0.75, e.r * 0.9, e.r * 0.34, 0, 0, Math.PI * 2); g.fillStyle = 'rgba(0,0,0,.45)'; g.fill();
        if (e.elite) { g.beginPath(); g.ellipse(e.x, e.y + e.r * 0.75, e.r * 1.2, e.r * 0.45, 0, 0, Math.PI * 2); g.lineWidth = 2; g.strokeStyle = 'rgba(255,190,80,.8)'; g.stroke(); }
      }
      D.drawFx(g, ghost, t);
    }
    this.decalTex.needsUpdate = true;
    this.decalMesh.scale.set(W * S, H * S, 1);
    this.decalMesh.position.set((x0 + W / 2) * S, 0.04, (y0 + H / 2) * S);
  }

  drawHero(game, t, playing, lite) {
    const a = this.avatar, mesh = this.hero;
    mesh.visible = playing && !!a;
    if (!mesh.visible) return;
    const k = sharp('hero', lite), c = this.heroCanvas, w = Math.ceil(HX * 2 * k), h = Math.ceil((HT + HB) * k);
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; this.heroTex.dispose(); }
    const g = c.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h);
    g.setTransform(k, 0, 0, k, HX * k, HT * k);
    g.lineJoin = 'round';
    // pose: the same rules as the 2D renderer
    const moving = Math.min(1, Math.hypot(game.moveX, game.moveY));
    if (game.aimX > 0.05) this.facing = 1; else if (game.aimX < -0.05) this.facing = -1;
    this.walk += moving * 0.22;
    if (game.attackT > this.lastAttackT + 1e-6) this.atkStart = t;
    this.lastAttackT = game.attackT;
    const ph = (t - this.atkStart) / ATTACK_ANIM;
    const cp = game.castPose;
    if (cp && cp !== this.lastCast) { this.lastCast = cp; this.move = { id: cp.id, t0: t, dur: moveDuration(a.classId, cp.id, cp.dur) }; }
    let move;
    if (this.move) { const mp = (t - this.move.t0) / this.move.dur; if (mp >= 0 && mp < 1) move = { id: this.move.id, ph: mp, dur: this.move.dur }; else this.move = null; }
    const dodge = game.dodgeT > 0 ? 1 - game.dodgeT / DODGE.duration : undefined;
    // the gear's own effects (glow, wings, mists, sparks) are painted on the billboard, around the body
    const opt = { host: this, lite, best: bestRarity(a.look.gear), set: a.set, hurt: game.flash > 0, frenzyOn: game.frenzyOn };
    auraBack(g, 0, 0, game.fx, t, opt);
    const blink = game.invuln > 0 && ((t * 18) | 0) % 2 === 0;
    if (!blink) {
      g.save();
      g.globalAlpha = playerAlpha(game);
      if (game.dodgeT > 0) g.rotate(game.dodgeX * 0.25);
      const hs = heroScale(game, game.vfx.mul < 1); // Mengamuk (spec §31.8), not with lite effects
      g.scale(DOLL_SCALE * this.facing * hs, DOLL_SCALE * hs);
      const hero = drawDoll(g, a.classId, a.look, { t, moving, walk: this.walk, attack: Math.max(0, game.attackT / ATTACK_POSE), attackPhase: ph >= 0 && ph < 1 ? ph : undefined, move, dodge, hurt: game.flash > 0 });
      drawTraitHero(g, game, t, hero);
      g.restore();
    }
    auraFront(g, 0, 0, game.fx, bestRarity(a.look.gear), t, { ...opt, level: game.level, facing: this.facing, enemies: game.enemies, shield: game.shieldMax > 0 ? game.shield / game.shieldMax : 0 });
    this.heroTex.needsUpdate = true;
    mesh.position.set(game.px * S, (HT - (HT + HB) / 2) * S, (game.py + 10) * S);
    mesh.rotation.y = this.stage.yaw; // face the camera
  }

  spriteTex(s) {
    let tex = this.texOf.get(s.img);
    if (!tex) { tex = canvasTexture(s.img); this.texOf.set(s.img, tex); }
    return tex;
  }
  drawEnemies(game, t, playing) {
    const seen = new Set();
    if (playing) for (const e of game.enemies) {
      if (e.hidden) continue;
      seen.add(e);
      let m = this.enemyMesh.get(e);
      if (!m) { m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), billMat(null)); m.renderOrder = 2; this.enemies.add(m); this.enemyMesh.set(e, m); }
      const warn = (e.mode === 'wind' || e.mode === 'fuse') && ((t * 14) | 0) % 2 === 0;
      const key = warn || e.flash > 0 ? `${e.type}Flash` : e.frozen > 0 ? `${e.type}Frozen` : e.type;
      const s = SPRITES[key] || SPRITES[e.type];
      if (!s) { m.visible = false; continue; }
      const tex = this.spriteTex(s);
      if (m.material.map !== tex) { m.material.map = tex; m.material.emissiveMap = tex; m.material.needsUpdate = true; }
      const k = e.r / (ENEMIES[e.type]?.r || e.r), squash = 1 + Math.sin(e.wob || 0) * 0.06;
      const size = s.ext * 2 * k * S, flip = e.mode === 'dash' ? e.dirX < 0 : game.px < e.x;
      m.scale.set(size / squash * (flip ? -1 : 1), size * squash, 1);
      m.position.set(e.x * S, e.r * 0.9 * k * S, (e.y + e.r * 0.75) * S);
      m.rotation.y = this.stage.yaw;
      m.visible = true;
    }
    for (const [e, m] of this.enemyMesh) if (!seen.has(e)) { this.enemies.remove(m); m.geometry.dispose(); m.material.dispose(); this.enemyMesh.delete(e); }
  }

  // the 2D canvas on top: HP pills, damage numbers, screen flashes, vignette, fade (0..1)
  overlay(game, playing, fade, frame = null) {
    const v = this.view, g = v.ctx, dpr = v.c.width / innerWidth;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, v.c.width, v.c.height);
    if (frame) frame(g, v.c.width, v.c.height, game.time ?? 0); // branches at the corners (plan C4)
    if (playing) {
      for (const e of game.enemies) {
        if (e.hidden || !(e.boss || e.elite || e.hp < e.maxHp)) continue;
        const k = e.r / (ENEMIES[e.type]?.r || e.r), p = this.stage.project(e.x, e.y + e.r * 0.75, e.r * 2.4 * k);
        if (!p) continue;
        const w = Math.max(26, e.r * 2 * p.k) * dpr, h = (e.boss ? 6 : 4) * dpr, x = p.x * dpr - w / 2, y = p.y * dpr;
        g.fillStyle = 'rgba(8,5,12,.85)'; g.fillRect(x - dpr, y - dpr, w + 2 * dpr, h + 2 * dpr);
        g.fillStyle = e.boss ? '#e0303e' : e.elite ? '#ffb347' : '#e05a4a'; g.fillRect(x, y, w * Math.max(0, e.hp / e.maxHp), h);
      }
      for (const f of game.floaters) {
        if (f.dmg && !this.flat.numbersOn) continue;
        const p = this.stage.project(f.x, f.y + 40, 46);
        if (!p) continue;
        const s = Math.max(0.6, Math.min(1.6, p.k)) * dpr;
        g.setTransform(s, 0, 0, s, p.x * dpr, p.y * dpr);
        drawFloaters(g, [{ ...f, x: 0, y: 0 }]);
      }
      g.setTransform(1, 0, 0, 1, 0, 0);
      drawFlashes(g, game.vfx, v.c.width, v.c.height);
    }
    v.vignetteOverlay();
    if (fade > 0) { g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = `rgba(5,4,12,${fade})`; g.fillRect(0, 0, v.c.width, v.c.height); }
  }
}
