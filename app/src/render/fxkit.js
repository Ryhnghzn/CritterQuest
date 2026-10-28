// Draws run/vfx.js state (plan "Efek Lebay" §A): pooled particles (dot, spark,
// ember, smoke, shard, star, bolt), shock rings, ground cracks, screen flashes
// and the floating damage numbers. Glow comes from small radial-gradient
// sprites cached per colour, drawn with 'lighter' — no shadowBlur (slow on phones).
import { FLOATER } from '../data/fx.js';

const TAU = Math.PI * 2;
const GLOW_PX = 64;
const glowCache = new Map();
// '#rgb' / '#rrggbb' → 'r,g,b'
const hexRgb = (h) => {
  const x = h.length === 4 ? h.slice(1).split('').map((c) => c + c).join('') : h.slice(1, 7);
  return [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16)).join(',');
};

// White-hot centre fading through `color` to transparent; cached per colour.
export function glowSprite(color) {
  let c = glowCache.get(color);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = GLOW_PX;
  const g = c.getContext('2d'), h = GLOW_PX / 2;
  const gr = g.createRadialGradient(h, h, 0, h, h, h);
  const rgb = hexRgb(color);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.18, `rgba(${rgb},1)`);
  gr.addColorStop(0.5, `rgba(${rgb},.35)`);
  gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr; g.fillRect(0, 0, GLOW_PX, GLOW_PX);
  glowCache.set(color, c);
  return c;
}

// glow of radius r centred on (x, y), in the current composite mode
export function glow(g, x, y, r, color) {
  g.drawImage(glowSprite(color), x - r, y - r, r * 2, r * 2);
}

// rect: visible world area { x0, y0, x1, y1 }; anything outside is skipped
export function drawVfx(g, vfx, rect) {
  const P = vfx.particles, n = P.n, items = P.items;
  const inside = (x, y, m) => x > rect.x0 - m && x < rect.x1 + m && y > rect.y0 - m && y < rect.y1 + m;
  g.save();
  // cracks and smoke darken/tint, so they go first in normal blending
  for (let i = 0; i < vfx.cracks.n; i++) crack(g, vfx.cracks.items[i]);
  for (let i = 0; i < n; i++) {
    const p = items[i];
    if (p.kind !== 'smoke' || !inside(p.x, p.y, p.size * 3)) continue;
    const k = p.life / p.max;
    g.globalAlpha = 0.35 * k;
    g.beginPath(); g.arc(p.x, p.y, p.size * (1.6 - k * 0.6), 0, TAU);
    g.fillStyle = p.color; g.fill();
  }
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < vfx.rings.n; i++) ring(g, vfx.rings.items[i]);
  for (let i = 0; i < n; i++) {
    const p = items[i];
    if (p.kind === 'smoke') continue;
    if (p.kind === 'bolt') { bolt(g, p.x, p.y, p.x2, p.y2, p.life / p.max, p.color); continue; }
    if (p.kind === 'beam') { beam(g, p); continue; }
    if (!inside(p.x, p.y, p.size * 4)) continue;
    const k = p.life / p.max;
    g.globalAlpha = Math.min(1, k * 1.4);
    switch (p.kind) {
      case 'spark': { // streak along the velocity
        const sp = Math.hypot(p.vx, p.vy) || 1, len = Math.min(14, sp * 0.05) + p.size;
        g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - (p.vx / sp) * len, p.y - (p.vy / sp) * len);
        g.lineCap = 'round'; g.lineWidth = p.size; g.strokeStyle = p.color; g.stroke();
        glow(g, p.x, p.y, p.size * 2.5, p.color);
        break;
      }
      case 'ember': // flickering hot dot
        g.globalAlpha *= 0.7 + 0.3 * Math.sin(p.rot * 3);
        glow(g, p.x, p.y, p.size * 3, p.color);
        break;
      case 'shard': {
        const c = Math.cos(p.rot), s = Math.sin(p.rot), z = p.size;
        g.beginPath();
        g.moveTo(p.x + c * z * 1.4, p.y + s * z * 1.4);
        g.lineTo(p.x - s * z * 0.6, p.y + c * z * 0.6);
        g.lineTo(p.x - c * z, p.y - s * z);
        g.closePath(); g.fillStyle = p.color; g.fill();
        break;
      }
      case 'cut': { // tapered slash line, grows fast then fades
        const L = p.size * Math.min(1, (1 - k) * 6 + 0.3), c = Math.cos(p.rot), s = Math.sin(p.rot), w = 2.4 * k + 0.4;
        g.beginPath();
        g.moveTo(p.x - c * L, p.y - s * L);
        g.lineTo(p.x - s * w, p.y + c * w);
        g.lineTo(p.x + c * L, p.y + s * L);
        g.lineTo(p.x + s * w, p.y - c * w);
        g.closePath(); g.fillStyle = p.color; g.fill();
        g.lineWidth = 0.8; g.strokeStyle = '#fff'; g.beginPath(); g.moveTo(p.x - c * L * 0.8, p.y - s * L * 0.8); g.lineTo(p.x + c * L * 0.8, p.y + s * L * 0.8); g.stroke();
        break;
      }
      case 'star':
        star4(g, p.x, p.y, p.size * (0.6 + 0.4 * k), p.rot * 0.3, p.color);
        break;
      default: // dot
        glow(g, p.x, p.y, p.size * 2.2, p.color);
    }
  }
  g.restore();
}

// whole-screen flashes, drawn in device pixels over everything
export function drawFlashes(g, vfx, w, h) {
  if (!vfx.flashes.n) return;
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < vfx.flashes.n; i++) {
    const f = vfx.flashes.items[i];
    g.globalAlpha = f.alpha * (f.life / f.max);
    g.fillStyle = f.color; g.fillRect(0, 0, w, h);
  }
  g.restore();
}

// Floating numbers: crits big, slanted and shaking; ultimate hits edged in gold.
export function drawFloaters(g, floaters) {
  g.save();
  g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.lineJoin = 'round';
  for (const f of floaters) {
    const st = FLOATER[f.kind], age = f.max - f.life;
    const pop = st.pop ? 1 + Math.max(0, 1 - age / st.pop) * 0.6 : 1; // starts big, settles
    const shake = st.wobble ? Math.sin(age * 70) * st.wobble * Math.max(0, 1 - age * 2.5) : 0;
    g.save();
    g.translate(f.x + shake, f.y);
    if (st.skew) g.transform(1, 0, st.skew, 1, 0, 0);
    g.scale(pop, pop);
    g.globalAlpha = Math.min(1, f.life * 2.5);
    g.font = `${f.kind === 'normal' ? 600 : 800} ${st.size}px Barlow, system-ui, sans-serif`;
    if (st.outline) { g.lineWidth = 5; g.strokeStyle = st.outline; g.strokeText(f.text, 0, 0); }
    g.lineWidth = f.kind === 'normal' ? 3 : 3.5; g.strokeStyle = 'rgba(30,20,60,.9)';
    g.strokeText(f.text, 0, 0);
    g.fillStyle = f.color; g.fillText(f.text, 0, 0);
    g.restore();
  }
  g.restore();
}

function ring(g, r) {
  const span = r.max - r.delay;
  if (r.life > span) return; // still waiting
  const k = 1 - r.life / span, e = 1 - (1 - k) ** 3; // ease out
  g.globalAlpha = 1 - k;
  g.beginPath(); g.arc(r.x, r.y, r.r0 + (r.r1 - r.r0) * e, 0, TAU);
  g.lineWidth = r.width * (1 - k) + 0.6; g.strokeStyle = r.color; g.stroke();
  g.lineWidth = Math.max(0.6, r.width * 0.35 * (1 - k)); g.strokeStyle = '#fff'; g.stroke();
}

function crack(g, c) {
  const k = c.life / c.max, grow = Math.min(1, (1 - k) * 8);
  g.globalAlpha = Math.min(1, k * 2);
  g.lineCap = 'round';
  for (const [a, len] of c.rays) {
    const ex = c.x + Math.cos(a) * len * grow, ey = c.y + Math.sin(a) * len * grow * 0.6; // flattened: it's the floor
    const mx = (c.x + ex) / 2 + Math.sin(a * 7) * 4, my = (c.y + ey) / 2 + Math.cos(a * 5) * 3;
    g.beginPath(); g.moveTo(c.x, c.y); g.lineTo(mx, my); g.lineTo(ex, ey);
    g.lineWidth = 3; g.strokeStyle = 'rgba(10,6,14,.85)'; g.stroke();
    g.lineWidth = 1.2; g.strokeStyle = c.color; g.stroke();
  }
}

function beam(g, p) {
  const k = p.life / p.max;
  g.globalAlpha = k;
  g.lineCap = 'round';
  g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x2, p.y2);
  g.lineWidth = p.size * 2.5; g.strokeStyle = p.color; g.globalAlpha = k * 0.35; g.stroke();
  g.lineWidth = p.size * 0.6; g.strokeStyle = '#fff'; g.globalAlpha = k; g.stroke();
}

// four-pointed sparkle
export function star4(g, x, y, r, rot, color) {
  g.save();
  g.translate(x, y); g.rotate(rot);
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU, d = i % 2 ? r * 0.28 : r;
    g.lineTo(Math.cos(a) * d, Math.sin(a) * d);
  }
  g.closePath(); g.fillStyle = color; g.fill();
  g.restore();
  glow(g, x, y, r * 1.2, color);
}

// jagged lightning between two points; deterministic per segment so it doesn't flicker
export function bolt(g, x1, y1, x2, y2, k, color = '#fff6b0') {
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
  g.lineWidth = 3; g.strokeStyle = color; g.stroke();
  g.globalAlpha = 1;
}
