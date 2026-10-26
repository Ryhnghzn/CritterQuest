// World rendering: full-resolution canvas, camera follows the player with an
// adaptive zoom (the short screen side shows ~VIEW world units), cartoon vector
// art baked per scale, soft shadows, fog beyond the arena edge and a vignette.
import { WORLD_R } from '../data/balance.js';
import { ENEMIES } from '../data/enemies.js';
import { SPRITES, bakeAll, drawBaked } from '../art/sprites.js';
import { drawDoll } from '../art/doll.js';
import { ATTACK_POSE } from '../run/skills.js';

const VIEW = 360;          // world units across the short side of the screen
const DOLL_SCALE = 0.82;   // player doll size in world units
const TAU = Math.PI * 2;
const ENEMY_R = Object.fromEntries(Object.entries(ENEMIES).map(([k, e]) => [k, e.r]));

// deterministic decor scatter (own PRNG so it never touches the sim's rng)
const DECOR = [];
(function makeDecor() {
  let s = 777;
  const r = () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  for (let i = 0; i < 900; i++) {
    const a = r() * TAU, d = Math.sqrt(r()) * (WORLD_R + 260);
    const k = r();
    const f = k < 0.5 ? 'tuft' : k < 0.62 ? 'flowerW' : k < 0.72 ? 'flowerP' : k < 0.8 ? 'flowerY' : k < 0.9 ? 'stone' : 'bush';
    DECOR.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, f, s: 0.8 + r() * 0.6, flip: r() < 0.5 });
  }
})();

// Soft, seamless meadow tile: base colour + blurred light/dark patches.
function makeGroundTile(scale) {
  const T = 256;
  const c = document.createElement('canvas');
  c.width = c.height = Math.ceil(T * scale);
  const g = c.getContext('2d');
  g.scale(c.width / T, c.height / T);
  g.fillStyle = '#4fae68'; g.fillRect(0, 0, T, T);
  let s = 99;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  // draw at the 9 wrapped offsets so anything crossing an edge tiles seamlessly
  const wrap = (fn) => { for (const ox of [-T, 0, T]) for (const oy of [-T, 0, T]) fn(ox, oy); };
  for (let i = 0; i < 34; i++) {
    const x = r() * T, y = r() * T, rad = 14 + r() * 26;
    const col = r() < 0.5 ? '140,220,140' : '40,120,70';
    wrap((ox, oy) => {
      const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad);
      gr.addColorStop(0, `rgba(${col},.16)`); gr.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = gr; g.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2);
    });
  }
  g.lineCap = 'round';
  for (let i = 0; i < 170; i++) {
    const x = r() * T, y = r() * T, h = 2.5 + r() * 3, lean = (r() - 0.5) * 2.5;
    g.strokeStyle = r() < 0.6 ? 'rgba(46,130,72,.55)' : 'rgba(130,215,130,.45)';
    g.lineWidth = 1;
    wrap((ox, oy) => { g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(x + ox + lean, y + oy - h); g.stroke(); });
  }
  for (let i = 0; i < 40; i++) {
    const x = r() * T, y = r() * T;
    g.fillStyle = 'rgba(255,255,255,.12)';
    wrap((ox, oy) => { g.beginPath(); g.arc(x + ox, y + oy, 0.8, 0, TAU); g.fill(); });
  }
  return { canvas: c, T };
}

export class Renderer {
  constructor(canvas) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.camX = 0; this.camY = 0;
    this.avatar = null;   // { classId, look } of the character being played
    this.facing = 1;
    this.walk = 0;
    this.trail = [];      // dodge afterimages: { x, y, life }
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const cssW = innerWidth, cssH = innerHeight;
    this.c.width = Math.round(cssW * dpr);
    this.c.height = Math.round(cssH * dpr);
    this.zoom = Math.max(1, Math.min(cssW, cssH) / VIEW); // CSS px per world unit
    this.S = this.zoom * dpr;                              // device px per world unit
    this.viewW = cssW / this.zoom; this.viewH = cssH / this.zoom;
    bakeAll(this.S, ENEMY_R);
    const tile = makeGroundTile(this.S);
    this.ground = this.ctx.createPattern(tile.canvas, 'repeat');
    this.ground.setTransform(new DOMMatrix().scale(tile.T / tile.canvas.width));
    const W = this.c.width, H = this.c.height;
    this.vignette = this.ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.62);
    this.vignette.addColorStop(0, 'rgba(14,10,36,0)');
    this.vignette.addColorStop(1, 'rgba(14,10,36,.55)');
  }

  // CSS pixel → world point (for mouse aim); ignores screen shake on purpose.
  screenToWorld(x, y) {
    return { x: this.camX + (x - innerWidth / 2) / this.zoom, y: this.camY + (y - innerHeight / 2) / this.zoom };
  }

  draw(game, t) {
    const g = this.ctx, S = this.S, W = this.c.width, H = this.c.height;
    const playing = game.state !== 0;
    // camera: follow the player, or drift slowly behind the menus
    const tx = playing ? game.px : Math.sin(t * 0.07) * 260;
    const ty = playing ? game.py : Math.cos(t * 0.05) * 180;
    this.camX += (tx - this.camX) * (playing ? 0.12 : 0.02);
    this.camY += (ty - this.camY) * (playing ? 0.12 : 0.02);
    game.viewR = Math.hypot(this.viewW, this.viewH) / 2;
    let shx = 0, shy = 0;
    if (playing && game.shake > 0) {
      // Math.random, not rng.js: render runs at display rate, so drawing from the
      // sim PRNG would make spawns depend on frame rate and break replay
      shx = (Math.random() - 0.5) * game.shake * 6;
      shy = (Math.random() - 0.5) * game.shake * 6;
    }
    const cx = this.camX + shx, cy = this.camY + shy;
    const hw = this.viewW / 2 + 30, hh = this.viewH / 2 + 30;
    const visible = (x, y, m = 0) => Math.abs(x - cx) < hw + m && Math.abs(y - cy) < hh + m;

    g.setTransform(S, 0, 0, S, W / 2 - cx * S, H / 2 - cy * S);
    g.imageSmoothingEnabled = true;

    // ground + decor
    g.fillStyle = this.ground;
    g.fillRect(cx - hw, cy - hh, hw * 2, hh * 2);
    for (const d of DECOR) {
      if (!visible(d.x, d.y)) continue;
      drawBaked(g, SPRITES[d.f], d.x, d.y, d.s, d.s, d.flip);
    }

    // fog beyond the arena edge
    g.beginPath();
    g.rect(cx - hw, cy - hh, hw * 2, hh * 2);
    g.arc(0, 0, WORLD_R, 0, TAU, true);
    g.fillStyle = 'rgba(28,20,60,.55)'; g.fill('evenodd');
    g.beginPath(); g.arc(0, 0, WORLD_R, 0, TAU);
    g.lineWidth = 6; g.strokeStyle = 'rgba(155,123,255,.35)'; g.stroke();

    if (playing) this.drawRun(g, game, t, visible);

    // screen-space vignette
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = this.vignette;
    g.fillRect(0, 0, W, H);
  }

  drawRun(g, game, t, visible) {
    // pickups
    for (const gm of game.gems) {
      if (!visible(gm.x, gm.y)) continue;
      const bob = Math.sin(gm.t) * 2;
      shadow(g, gm.x, gm.y + 6, 4, 1.4);
      const s = SPRITES[gm.heart ? 'heart' : gm.big ? 'bigGem' : 'gem'];
      drawBaked(g, s, gm.x, gm.y + bob - 2, 1);
    }

    // enemies
    for (const e of game.enemies) {
      if (!visible(e.x, e.y, 40)) continue;
      shadow(g, e.x, e.y + e.r * 0.75, e.r * 0.85, e.r * 0.3);
      const squash = 1 + Math.sin(e.wob) * 0.06;
      const sprite = SPRITES[e.flash > 0 ? `${e.type}Flash` : e.frozen > 0 ? `${e.type}Frozen` : e.type];
      drawBaked(g, sprite, e.x, e.y, 1 / squash, squash, game.px < e.x);
      if (e.type === 'boss' || e.hp < e.maxHp) hpPill(g, e.x, e.y - e.r * (e.type === 'boss' ? 1.6 : 1.25), e.r * 2, e.hp / e.maxHp);
    }

    // attack instances
    for (const h of game.hits) drawHit(g, h, this.avatar, t);
    if (game.buffT > 0) shoutAura(g, game.px, game.py, t, Math.min(1, game.buffT * 2));

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

function hpPill(g, x, y, w, k) {
  const h = 3.2;
  g.beginPath(); g.roundRect(x - w / 2, y, w, h, h / 2);
  g.fillStyle = 'rgba(20,14,44,.75)'; g.fill();
  if (k > 0) {
    g.beginPath(); g.roundRect(x - w / 2 + 0.6, y + 0.6, Math.max(h - 1.2, (w - 1.2) * k), h - 1.2, (h - 1.2) / 2);
    g.fillStyle = '#ff5f7e'; g.fill();
  }
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
