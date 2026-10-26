// World rendering: low-res pixel canvas scaled up, camera follows the player,
// plus a deterministic ring of grass tufts/flowers for the ground.
import { WORLD_R } from '../data/balance.js';
import { WEAPONS } from '../data/classes.js';
import { SPRITES, drawSprite } from '../art/sprites.js';

const DECOR = [];
(function makeDecor() {
  let s = 777;
  const r = () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  for (let i = 0; i < 700; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * (WORLD_R + 200);
    DECOR.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, f: r() < 0.25 ? 'flower' : 'tuft', s: 1.5 + r() * 2 });
  }
})();

export class Renderer {
  constructor(canvas) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.PIX = 3; // world pixels per screen pixel (chunky pixels)
    this.camX = 0; this.camY = 0;
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  resize() {
    this.c.width = Math.ceil(innerWidth / this.PIX);
    this.c.height = Math.ceil(innerHeight / this.PIX);
    this.w = this.c.width; this.h = this.c.height;
  }

  draw(game, t) {
    const g = this.ctx, w = this.w, h = this.h;
    const playing = game.state !== 0;
    // smooth camera follow + screen shake
    const tx = playing ? game.px : 0, ty = playing ? game.py : 0;
    this.camX += (tx - this.camX) * 0.12;
    this.camY += (ty - this.camY) * 0.12;
    game.viewR = Math.hypot(w, h) / 2;
    let shx = 0, shy = 0;
    if (game.shake > 0) {
      // Math.random, not rng.js: render runs at display rate, so drawing from the
      // sim PRNG would make spawns depend on frame rate and break replay
      shx = (Math.random() - 0.5) * game.shake * 8;
      shy = (Math.random() - 0.5) * game.shake * 8;
    }
    const cx = this.camX + shx, cy = this.camY + shy;

    g.fillStyle = '#131c16';
    g.fillRect(0, 0, w, h);

    const toX = (x) => x - cx + w / 2;
    const toY = (y) => y - cy + h / 2;

    // subtle checker for motion perception
    g.fillStyle = '#16211a';
    const cs = 40, ox = ((-cx % cs) + cs) % cs, oy = ((-cy % cs) + cs) % cs;
    for (let y = oy - cs; y < h; y += cs) for (let x = ox - cs; x < w; x += cs) {
      if ((((x + cx) / cs) | 0) % 2 === (((y + cy) / cs) | 0) % 2) g.fillRect(x, y, cs, cs);
    }

    // world edge
    g.strokeStyle = '#3b5443';
    g.lineWidth = 3;
    g.beginPath();
    g.arc(toX(0), toY(0), WORLD_R, 0, Math.PI * 2);
    g.stroke();

    // decor
    for (const d of DECOR) {
      const x = toX(d.x), y = toY(d.y);
      if (x < -10 || y < -10 || x > w + 10 || y > h + 10) continue;
      drawSprite(g, SPRITES[d.f], x, y, d.s);
    }

    // gems
    for (const gm of game.gems) {
      const gx = toX(gm.x), gy = toY(gm.y);
      if (gx < -10 || gy < -10 || gx > w + 10 || gy > h + 10) continue;
      const bob = Math.sin(gm.t) * 2;
      drawSprite(g, gm.heart ? SPRITES.heart : (gm.big ? SPRITES.bigGem : SPRITES.gem), toX(gm.x), toY(gm.y + bob), gm.big ? 1.4 : 1);
    }

    // thorn fields
    for (const f of game.fields) {
      const k = f.life / f.maxLife;
      g.strokeStyle = `rgba(140,255,176,${0.5 * k})`;
      g.lineWidth = 2;
      g.beginPath(); g.arc(toX(f.x), toY(f.y), f.r * (1.2 - k * 0.2), 0, Math.PI * 2); g.stroke();
    }

    // enemies
    for (const e of game.enemies) {
      const x = toX(e.x), y = toY(e.y);
      if (x < -40 || y < -40 || x > w + 40 || y > h + 40) continue;
      const img = SPRITES[e.sprite];
      const squash = 1 + Math.sin(e.wob) * 0.06;
      if (e.flash > 0) {
        g.save(); g.filter = 'brightness(2.2) saturate(0.5)';
        drawSprite(g, img, x, y, (e.r / 7) * squash);
        g.restore();
      } else {
        drawSprite(g, img, x, y, (e.r / 7) * squash);
      }
      if (e.type === 'boss' || e.hp < e.maxHp) {
        const bw = e.r * 2.4;
        g.fillStyle = '#000a'; g.fillRect(x - bw / 2, y - e.r - 10, bw, 3);
        g.fillStyle = '#ff5a6e'; g.fillRect(x - bw / 2, y - e.r - 10, bw * Math.max(0, e.hp / e.maxHp), 3);
      }
    }

    // projectiles
    for (const p of game.projectiles) {
      const x = toX(p.x), y = toY(p.y);
      if (p.kind === 'ember') {
        g.fillStyle = '#ff7847'; g.beginPath(); g.arc(x, y, p.r, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#ffd54a'; g.beginPath(); g.arc(x, y, p.r * 0.5, 0, Math.PI * 2); g.fill();
      } else {
        g.strokeStyle = '#6ec9ff'; g.lineWidth = 2;
        g.beginPath(); g.arc(x, y, p.r + Math.sin(t * 8 + p.x) * 1.5, 0, Math.PI * 2); g.stroke();
        g.fillStyle = '#bfe9ff88'; g.beginPath(); g.arc(x, y, p.r * 0.7, 0, Math.PI * 2); g.fill();
      }
    }

    // gale blades
    for (const wp of game.weapons) {
      if (wp.id !== 'gale') continue;
      const lvl = wp.level;
      const { radius } = galeLevel(lvl);
      for (let b = 0; b < galeCount(lvl); b++) {
        const a = wp.angle + (b / galeCount(lvl)) * Math.PI * 2;
        const x = toX(game.px + Math.cos(a) * radius);
        const y = toY(game.py + Math.sin(a) * radius);
        g.save(); g.translate(x, y); g.rotate(a + t * 8);
        g.fillStyle = '#a8e063';
        g.fillRect(-7, -2, 14, 4);
        g.fillStyle = '#e4ffb0';
        g.fillRect(2, -1, 5, 2);
        g.restore();
      }
    }

    // particles
    for (const p of game.particles) {
      const k = p.life / p.maxLife;
      if (p.line) {
        g.strokeStyle = p.color; g.globalAlpha = k; g.lineWidth = p.size;
        g.beginPath(); g.moveTo(toX(p.x), toY(p.y)); g.lineTo(toX(p.x2), toY(p.y2)); g.stroke();
        g.globalAlpha = 1;
      } else {
        g.globalAlpha = k;
        g.fillStyle = p.color;
        g.fillRect(toX(p.x) - p.size / 2, toY(p.y) - p.size / 2, p.size, p.size);
        g.globalAlpha = 1;
      }
    }

    // player
    if (game.state !== 0) {
      const x = toX(game.px), y = toY(game.py);
      const blink = game.invuln > 0 && ((t * 20) | 0) % 2 === 0;
      if (!blink) {
        const bob = Math.sin(t * 6) * 1.5;
        drawSprite(g, SPRITES[game.critter.sprite], x, y + bob, 1.6, (game.moveVec && game.moveVec.x < -0.1) || false);
        // magnet ring hint
        g.strokeStyle = '#8fffc012'; g.lineWidth = 1;
        g.beginPath(); g.arc(x, y, game.stats.magnet, 0, Math.PI * 2); g.stroke();
      }
    }

    // floaters
    g.font = '7px "Press Start 2P", monospace';
    g.textAlign = 'center';
    for (const f of game.floaters) {
      g.globalAlpha = Math.min(1, f.life * 2);
      g.fillStyle = f.color;
      g.fillText(f.text, toX(f.x), toY(f.y));
      g.globalAlpha = 1;
    }
  }
}

// local helpers to read the gale level table
function galeLevel(l) { return WEAPONS.gale.levels[l - 1]; }
function galeCount(l) { return WEAPONS.gale.levels[l - 1].count; }
