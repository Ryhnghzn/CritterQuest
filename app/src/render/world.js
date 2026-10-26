// World rendering: full-resolution canvas, camera follows the player with an
// adaptive zoom (the short screen side shows ~VIEW world units), cartoon vector
// art baked per scale, soft shadows, fog beyond the arena edge and a vignette.
import { WORLD_R } from '../data/balance.js';
import { WEAPONS } from '../data/classes.js';
import { ENEMIES } from '../data/enemies.js';
import { SPRITES, bakeAll, drawBaked } from '../art/sprites.js';
import { drawDoll } from '../art/doll.js';

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

    // thorn fields (prototype weapon)
    for (const f of game.fields) {
      const k = f.life / f.maxLife;
      const rr = f.r * (1.15 - k * 0.15);
      g.beginPath(); g.arc(f.x, f.y, rr, 0, TAU);
      g.fillStyle = `rgba(140,240,120,${0.18 * k})`; g.fill();
      g.lineWidth = 3; g.strokeStyle = `rgba(200,255,150,${0.7 * k})`; g.stroke();
    }

    // enemies
    for (const e of game.enemies) {
      if (!visible(e.x, e.y, 40)) continue;
      shadow(g, e.x, e.y + e.r * 0.75, e.r * 0.85, e.r * 0.3);
      const squash = 1 + Math.sin(e.wob) * 0.06;
      const sprite = SPRITES[e.flash > 0 ? `${e.type}Flash` : e.type];
      drawBaked(g, sprite, e.x, e.y, 1 / squash, squash, game.px < e.x);
      if (e.type === 'boss' || e.hp < e.maxHp) hpPill(g, e.x, e.y - e.r * (e.type === 'boss' ? 1.6 : 1.25), e.r * 2, e.hp / e.maxHp);
    }

    // projectiles (prototype weapons)
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const p of game.projectiles) {
      if (p.kind === 'ember') glow(g, p.x, p.y, p.r * 2.6, '255,140,60');
      else glow(g, p.x, p.y, p.r * 1.8, '110,200,255');
    }
    g.restore();
    for (const p of game.projectiles) {
      g.beginPath(); g.arc(p.x, p.y, p.r, 0, TAU);
      if (p.kind === 'ember') { g.fillStyle = '#ffd36b'; g.fill(); }
      else {
        g.fillStyle = 'rgba(160,225,255,.45)'; g.fill();
        g.lineWidth = 1.5; g.strokeStyle = '#7fd4ff'; g.stroke();
        g.beginPath(); g.arc(p.x - p.r * 0.35, p.y - p.r * 0.35, p.r * 0.25, 0, TAU); g.fillStyle = '#fff'; g.fill();
      }
    }

    // gale blades (prototype weapon)
    for (const wp of game.weapons) {
      if (wp.id !== 'gale') continue;
      const L = WEAPONS.gale.levels[wp.level - 1];
      for (let b = 0; b < L.count; b++) {
        const a = wp.angle + (b / L.count) * TAU;
        g.save();
        g.translate(game.px + Math.cos(a) * L.radius, game.py + Math.sin(a) * L.radius);
        g.rotate(a + Math.PI / 2);
        g.beginPath(); g.moveTo(-8, 0); g.quadraticCurveTo(0, -7, 8, 0); g.quadraticCurveTo(0, 3, -8, 0);
        g.fillStyle = '#b8f06a'; g.fill(); g.lineWidth = 1.2; g.strokeStyle = '#2f7a3a'; g.stroke();
        g.restore();
      }
    }

    // player
    const blink = game.invuln > 0 && ((t * 18) | 0) % 2 === 0;
    const mv = game.moveVec || { x: 0, y: 0 };
    const moving = Math.min(1, Math.hypot(mv.x, mv.y));
    if (mv.x > 0.1) this.facing = 1; else if (mv.x < -0.1) this.facing = -1;
    this.walk += moving * 0.22;
    shadow(g, game.px, game.py + 10, 10, 3);
    if (this.avatar && !blink) {
      g.save();
      g.translate(game.px, game.py + 10);
      g.scale(DOLL_SCALE * this.facing, DOLL_SCALE);
      drawDoll(g, this.avatar.classId, this.avatar.look, { t, moving, walk: this.walk, hurt: game.flash > 0 });
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
    g.font = '600 9px Fredoka, system-ui, sans-serif';
    g.textAlign = 'center';
    g.lineJoin = 'round';
    for (const f of game.floaters) {
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
  g.lineWidth = 5; g.strokeStyle = 'rgba(255,230,90,.35)'; g.stroke();
  g.lineWidth = 2; g.strokeStyle = '#fff6b0'; g.stroke();
  g.globalAlpha = 1;
}
