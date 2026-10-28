// Vector cartoon art for everything except the player (see doll.js): enemies,
// pickups, ground decor and icons. Shapes are drawn in world units around the
// origin; bakeAll(scale) renders them to offscreen canvases at the current
// device scale and is re-run when the screen size changes.
import { POTIONS } from '../data/potions.js';
import { MONSTER_ART } from './monsters.js';
import { ECLIPSE_ART } from './eclipse.js';

export const OUT = '#16121c'; // shared outline colour (thin, dark — langkah 8)

const TAU = Math.PI * 2;

function grad(g, y0, y1, c0, c1) {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, c0); gr.addColorStop(1, c1);
  return gr;
}
function ellipse(g, x, y, rx, ry, rot = 0) { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); }
function ink(g, fill, lw) { g.fillStyle = fill; g.fill(); g.lineWidth = lw; g.strokeStyle = OUT; g.stroke(); }
function shine(g, x, y, rx, ry, rot = -0.5, a = 0.5) {
  ellipse(g, x, y, rx, ry, rot);
  g.fillStyle = `rgba(255,255,255,${a})`; g.fill();
}
function brow(g, x0, y0, x1, y1, w) {
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1);
  g.lineCap = 'round'; g.lineWidth = w; g.strokeStyle = OUT; g.stroke();
}

// potion flask in the potion's colours; big = taller neck + star
function flask(g, p, big) {
  const k = big ? 1.12 : 1;
  g.save(); g.scale(k, k);
  g.beginPath(); g.roundRect(-3, -11, 6, 6, 1.5); ink(g, '#c8874e', 1.3);
  g.beginPath(); g.moveTo(-3, -5); g.lineTo(-3, -3); g.arc(0, 4, 8, -Math.PI / 2 - 0.38, Math.PI * 1.5 + 0.38); g.lineTo(3, -5); g.closePath();
  ink(g, grad(g, -4, 12, p.light, p.color), 1.5);
  shine(g, -3, 1, 2, 3.2, 0.3, 0.6);
  if (big) {
    g.beginPath();
    for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU - Math.PI / 2, r = i % 2 ? 1.6 : 3.6; g.lineTo(2.5 + Math.cos(a) * r, 5 + Math.sin(a) * r); }
    g.closePath(); g.fillStyle = '#fff6c2'; g.fill();
  }
  g.restore();
}

// ——— enemies: drawn facing right at radius r (dark fantasy, langkah 8C) ———
// glowing slit eye
function glowEye(g, x, y, r, color, tilt = -0.25) {
  g.save();
  g.beginPath(); g.ellipse(x, y, r, r * 0.42, tilt, 0, TAU);
  g.fillStyle = color; g.shadowColor = color; g.shadowBlur = r * 2.2; g.fill();
  g.shadowBlur = 0;
  g.beginPath(); g.ellipse(x + r * 0.1, y, r * 0.18, r * 0.38, tilt, 0, TAU); g.fillStyle = '#1a0a0a'; g.fill();
  g.restore();
}
function fangs(g, x0, x1, y, n, h, down = true) {
  g.fillStyle = '#efe6d2';
  for (let i = 0; i < n; i++) {
    const x = x0 + ((x1 - x0) * (i + 0.5)) / n, w = (x1 - x0) / n / 2;
    g.beginPath(); g.moveTo(x - w, y); g.lineTo(x, y + (down ? h : -h)); g.lineTo(x + w, y); g.closePath(); g.fill();
  }
}

// biome variant (spec §25.4): an older enemy's art washed with a new colour
function tinted(g, r, kin, color) {
  ENEMY_ART[kin](g, r);
  g.save(); g.globalCompositeOperation = 'source-atop'; g.fillStyle = color; g.fillRect(-r * 2, -r * 2, r * 4, r * 4); g.restore();
}
// pale ice spikes: [x, y, height] in units of r
function iceSpikes(g, r, list) {
  for (const [x, y, h] of list) {
    g.beginPath(); g.moveTo(x * r - r * 0.11, y * r + r * 0.12); g.lineTo(x * r, (y - h) * r); g.lineTo(x * r + r * 0.11, y * r + r * 0.12); g.closePath();
    ink(g, grad(g, (y - h) * r, y * r, '#ffffff', '#8fcfff'), r * 0.04);
  }
}
// cold breath puffs in front of the mouth
function breath(g, x, y, r) {
  for (const [dx, dy, rr] of [[0, 0, 0.12], [0.18, -0.06, 0.09], [0.32, 0.02, 0.06]]) { g.beginPath(); g.arc(x + dx * r, y + dy * r, rr * r, 0, TAU); g.fillStyle = 'rgba(230,248,255,.7)'; g.fill(); }
}

export const ENEMY_ART = {
  slink(g, r) { // toxic ooze with a toothy grin
    g.beginPath();
    g.moveTo(-r, r * 0.6);
    g.bezierCurveTo(-r * 1.1, -r * 0.4, -r * 0.5, -r * 1.05, r * 0.05, -r);
    g.bezierCurveTo(r * 0.6, -r * 1.05, r * 1.1, -r * 0.4, r, r * 0.6);
    for (let i = 0; i < 4; i++) { const x = r - (i + 0.5) * r * 0.5; g.quadraticCurveTo(x + r * 0.12, r * (0.95 + (i % 2) * 0.2), x - r * 0.25, r * 0.6); }
    g.closePath();
    ink(g, grad(g, -r, r, '#6a3f8f', '#2a123f'), r * 0.09);
    for (const [x, y, rr] of [[-0.45, -0.3, 0.12], [-0.2, 0.25, 0.08], [0.55, -0.55, 0.07]]) { g.beginPath(); g.arc(x * r, y * r, rr * r, 0, TAU); g.fillStyle = 'rgba(190,140,255,.35)'; g.fill(); }
    glowEye(g, r * 0.2, -r * 0.25, r * 0.2, '#e8ff6a');
    glowEye(g, r * 0.62, -r * 0.22, r * 0.17, '#e8ff6a');
    g.beginPath(); g.moveTo(r * 0.05, r * 0.15); g.quadraticCurveTo(r * 0.45, r * 0.35, r * 0.85, r * 0.12); g.lineWidth = r * 0.07; g.strokeStyle = OUT; g.stroke();
    fangs(g, r * 0.15, r * 0.8, r * 0.17, 4, r * 0.12);
  },
  mini(g, r) { ENEMY_ART.slink(g, r); },
  dart(g, r) { // gaunt bat with bony wings
    for (const s of [-1, 1]) {
      g.beginPath(); g.moveTo(s * r * 0.4, -r * 0.2);
      g.lineTo(s * r * 1.7, -r * 0.9); g.lineTo(s * r * 1.45, -r * 0.1); g.lineTo(s * r * 1.75, r * 0.15); g.lineTo(s * r * 1.15, r * 0.25); g.lineTo(s * r * 1.2, r * 0.55); g.lineTo(s * r * 0.5, r * 0.3);
      g.closePath(); ink(g, grad(g, -r, r, '#4a2a34', '#1e1016'), r * 0.08);
      g.beginPath(); g.moveTo(s * r * 0.45, -r * 0.15); g.lineTo(s * r * 1.6, -r * 0.75); g.lineWidth = r * 0.06; g.strokeStyle = '#6e4a52'; g.stroke();
    }
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * r * 0.2, -r * 0.55); g.lineTo(s * r * 0.45, -r * 1.15); g.lineTo(s * r * 0.55, -r * 0.45); ink(g, '#3a1e26', r * 0.07); }
    ellipse(g, 0, 0, r * 0.62, r * 0.68);
    ink(g, grad(g, -r, r, '#5a3440', '#24121a'), r * 0.09);
    glowEye(g, -r * 0.05, -r * 0.12, r * 0.18, '#ff3a3a', 0.25);
    glowEye(g, r * 0.32, -r * 0.12, r * 0.18, '#ff3a3a', -0.25);
    fangs(g, -r * 0.05, r * 0.35, r * 0.25, 2, r * 0.22);
  },
  tank(g, r) { // stone golem with glowing rune cracks
    for (const x of [-0.55, 0.05, 0.6]) { ellipse(g, x * r, r * 0.78, r * 0.22, r * 0.14); ink(g, '#1e2230', r * 0.08); }
    g.beginPath();
    g.moveTo(-r, r * 0.6); g.lineTo(-r * 1.05, -r * 0.3); g.lineTo(-r * 0.6, -r * 0.95); g.lineTo(r * 0.2, -r * 1.0); g.lineTo(r * 0.9, -r * 0.6); g.lineTo(r, r * 0.6);
    g.quadraticCurveTo(0, r * 0.85, -r, r * 0.6);
    ink(g, grad(g, -r, r, '#5a6072', '#262a36'), r * 0.08);
    g.save(); g.shadowColor = '#ff7a2a'; g.shadowBlur = r * 0.5; g.lineWidth = r * 0.07; g.strokeStyle = '#ff9a4a'; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-r * 0.6, -r * 0.5); g.lineTo(-r * 0.3, -r * 0.1); g.lineTo(-r * 0.5, r * 0.3); g.moveTo(r * 0.2, r * 0.1); g.lineTo(r * 0.45, r * 0.45); g.stroke();
    g.restore();
    for (const [x, y] of [[-0.7, -0.75], [0.0, -0.95]]) { ellipse(g, x * r, y * r, r * 0.22, r * 0.09); g.fillStyle = '#3f5a3a'; g.fill(); } // moss
    glowEye(g, r * 0.35, -r * 0.35, r * 0.14, '#ff5a2a');
    glowEye(g, r * 0.7, -r * 0.3, r * 0.12, '#ff5a2a');
  },
  spitter(g, r) { // toxic toad, glowing warts, acid drool
    for (const x of [-0.6, 0.55]) { ellipse(g, x * r, r * 0.72, r * 0.32, r * 0.16); ink(g, '#1f3a24', r * 0.08); }
    ellipse(g, 0, r * 0.08, r * 1.02, r * 0.76);
    ink(g, grad(g, -r, r, '#4f7a3a', '#1c3220'), r * 0.1);
    for (const [x, y] of [[-0.55, -0.25], [-0.2, 0.3], [0.1, -0.45], [-0.75, 0.25]]) { g.beginPath(); g.arc(x * r, y * r, r * 0.09, 0, TAU); g.fillStyle = '#b8ff5a'; g.shadowColor = '#b8ff5a'; g.shadowBlur = r * 0.3; g.fill(); g.shadowBlur = 0; }
    for (const x of [0.2, 0.6]) { ellipse(g, x * r, -r * 0.55, r * 0.24, r * 0.2); ink(g, '#3d6230', r * 0.07); glowEye(g, x * r, -r * 0.57, r * 0.15, '#f0e04a', 0); }
    g.beginPath(); g.moveTo(r * 0.1, r * 0.05); g.quadraticCurveTo(r * 0.6, r * 0.25, r * 0.98, r * 0.0); g.lineWidth = r * 0.08; g.strokeStyle = OUT; g.stroke();
    g.beginPath(); g.moveTo(r * 0.8, r * 0.1); g.quadraticCurveTo(r * 0.85, r * 0.35, r * 0.78, r * 0.45); g.lineWidth = r * 0.08; g.strokeStyle = '#a8ff4a'; g.stroke();
  },
  charger(g, r) { // dark boar with a spiked mane
    for (const x of [-0.55, -0.1, 0.35, 0.7]) { g.beginPath(); g.roundRect(x * r - r * 0.12, r * 0.4, r * 0.24, r * 0.45, r * 0.08); ink(g, '#1e1a22', r * 0.08); }
    ellipse(g, -r * 0.1, 0, r * 1.0, r * 0.62);
    ink(g, grad(g, -r, r, '#6a4a3e', '#2a1a16'), r * 0.09);
    for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(-r * (0.85 - i * 0.28), -r * 0.5); g.lineTo(-r * (0.72 - i * 0.28), -r * 1.0); g.lineTo(-r * (0.6 - i * 0.28), -r * 0.5); ink(g, '#1e1414', r * 0.05); }
    ellipse(g, r * 0.72, r * 0.05, r * 0.42, r * 0.36); ink(g, '#5a3e34', r * 0.08);
    ellipse(g, r * 0.98, r * 0.08, r * 0.14, r * 0.16); ink(g, '#2a1a16', r * 0.06);
    g.beginPath(); g.moveTo(r * 0.68, r * 0.3); g.quadraticCurveTo(r * 1.05, r * 0.35, r * 1.12, r * -0.25); g.lineTo(r * 0.9, r * 0.18); g.closePath(); ink(g, '#efe6d2', r * 0.05);
    glowEye(g, r * 0.55, -r * 0.2, r * 0.15, '#ff3a2a');
  },
  summoner(g, r) { // hooded cultist with a skull face and a cursed staff
    g.beginPath(); g.moveTo(r * 0.85, -r * 1.25); g.lineTo(r * 0.85, r * 0.9); g.lineCap = 'round'; g.lineWidth = r * 0.12; g.strokeStyle = '#3a2a22'; g.stroke();
    g.beginPath(); g.arc(r * 0.85, -r * 1.32, r * 0.2, 0, TAU); g.fillStyle = '#b06bff'; g.shadowColor = '#b06bff'; g.shadowBlur = r * 0.8; g.fill(); g.shadowBlur = 0;
    g.beginPath(); g.moveTo(-r * 0.9, r * 0.9); g.quadraticCurveTo(-r * 0.95, -r * 0.6, 0, -r * 1.15); g.quadraticCurveTo(r * 0.95, -r * 0.6, r * 0.75, r * 0.9); g.closePath();
    ink(g, grad(g, -r, r, '#3a2a52', '#140c22'), r * 0.09);
    ellipse(g, r * 0.05, -r * 0.32, r * 0.42, r * 0.45); g.fillStyle = '#0c0812'; g.fill();
    ellipse(g, r * 0.08, -r * 0.3, r * 0.32, r * 0.36); ink(g, '#cfc8b8', r * 0.06);
    glowEye(g, -r * 0.05, -r * 0.35, r * 0.1, '#c26bff', 0); glowEye(g, r * 0.22, -r * 0.35, r * 0.1, '#c26bff', 0);
    fangs(g, -r * 0.08, r * 0.24, -r * 0.08, 3, r * 0.08);
  },
  healer(g, r) { // forest wisp: dark bark body, glowing leaves
    for (const s of [-1, 1]) {
      g.beginPath(); g.ellipse(s * r * 0.75, -r * 0.35, r * 0.62, r * 0.28, s * 0.6, 0, TAU);
      g.fillStyle = 'rgba(120,255,170,.28)'; g.fill(); g.lineWidth = r * 0.05; g.strokeStyle = '#4fd88a'; g.stroke();
    }
    ellipse(g, 0, 0, r * 0.62, r * 0.78); ink(g, grad(g, -r, r, '#3a5a3a', '#16261a'), r * 0.1);
    for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse((i - 1) * r * 0.3, -r * 0.78, r * 0.14, r * 0.3, (i - 1) * 0.5, 0, TAU); g.fillStyle = '#7dff9a'; g.shadowColor = '#7dff9a'; g.shadowBlur = r * 0.4; g.fill(); g.shadowBlur = 0; }
    glowEye(g, -r * 0.05, -r * 0.1, r * 0.13, '#d8ffe0', 0); glowEye(g, r * 0.3, -r * 0.1, r * 0.13, '#d8ffe0', 0);
  },
  bomber(g, r) { // blood-red toadstool with a burning fuse
    g.beginPath(); g.roundRect(-r * 0.42, -r * 0.1, r * 0.84, r * 0.95, r * 0.28); ink(g, grad(g, 0, r, '#cfc2a8', '#7a6a52'), r * 0.09);
    glowEye(g, -r * 0.1, r * 0.25, r * 0.13, '#ffb03a', 0.3); glowEye(g, r * 0.2, r * 0.25, r * 0.13, '#ffb03a', -0.3);
    g.beginPath(); g.moveTo(-r * 0.12, r * 0.55); g.lineTo(r * 0.24, r * 0.55); g.lineWidth = r * 0.06; g.strokeStyle = OUT; g.stroke();
    g.beginPath(); g.moveTo(-r * 1.0, -r * 0.05); g.quadraticCurveTo(-r * 0.95, -r * 1.05, 0, -r * 1.05); g.quadraticCurveTo(r * 0.95, -r * 1.05, r * 1.0, -r * 0.05); g.closePath();
    ink(g, grad(g, -r, 0, '#a82a2a', '#4a0e12'), r * 0.09);
    for (const [x, y, rr] of [[-0.5, -0.45, 0.15], [0.15, -0.75, 0.12], [0.55, -0.35, 0.13]]) { g.beginPath(); g.arc(x * r, y * r, rr * r, 0, TAU); g.fillStyle = '#1a0a0e'; g.fill(); }
    g.beginPath(); g.moveTo(0, -r * 1.05); g.quadraticCurveTo(r * 0.25, -r * 1.35, r * 0.1, -r * 1.55); g.lineWidth = r * 0.07; g.strokeStyle = '#2a1e1a'; g.stroke();
    g.beginPath(); g.arc(r * 0.1, -r * 1.6, r * 0.12, 0, TAU); g.fillStyle = '#ffd36b'; g.shadowColor = '#ff6a1a'; g.shadowBlur = r * 0.7; g.fill(); g.shadowBlur = 0;
  },
  shielder(g, r) { // armoured beetle-turtle (the shield is drawn by the renderer, facing the player)
    for (const x of [-0.6, 0.55]) { ellipse(g, x * r, r * 0.6, r * 0.22, r * 0.16); ink(g, '#2a3328', r * 0.08); }
    ellipse(g, r * 0.85, -r * 0.05, r * 0.32, r * 0.28); ink(g, '#3d4a36', r * 0.08);
    glowEye(g, r * 0.95, -r * 0.1, r * 0.1, '#ff4a3a');
    g.beginPath(); g.ellipse(-r * 0.05, -r * 0.05, r * 0.92, r * 0.75, 0, Math.PI, 0); g.lineTo(r * 0.87, r * 0.3); g.lineTo(-r * 0.97, r * 0.3); g.closePath();
    ink(g, grad(g, -r, r * 0.3, '#6e7686', '#262a34'), r * 0.09);
    for (const x of [-0.55, -0.05, 0.45]) { g.beginPath(); g.moveTo(x * r - r * 0.12, -r * 0.55); g.lineTo(x * r, -r * 0.95); g.lineTo(x * r + r * 0.12, -r * 0.55); ink(g, '#3a3f4a', r * 0.05); }
    g.beginPath(); g.moveTo(-r * 0.9, -r * 0.05); g.lineTo(r * 0.8, -r * 0.05); g.lineWidth = r * 0.05; g.strokeStyle = 'rgba(0,0,0,.4)'; g.stroke();
  },
  crystalboss(g, r) { // golem of blue crystal with glowing core
    for (const x of [-0.55, 0.5]) { g.beginPath(); g.roundRect(x * r - r * 0.18, r * 0.35, r * 0.36, r * 0.55, r * 0.1); ink(g, '#3a5a80', r * 0.06); }
    g.beginPath(); g.moveTo(-r * 0.95, r * 0.45); g.lineTo(-r * 0.8, -r * 0.55); g.lineTo(-r * 0.3, -r * 0.95); g.lineTo(r * 0.35, -r * 0.9);
    g.lineTo(r * 0.9, -r * 0.45); g.lineTo(r * 0.95, r * 0.45); g.closePath();
    ink(g, grad(g, -r, r, '#9fd0ff', '#2f5a9a'), r * 0.07);
    for (const [x, y, h] of [[-0.55, -0.9, 0.55], [-0.1, -1.05, 0.75], [0.45, -0.85, 0.5]]) { // crystal spikes
      g.beginPath(); g.moveTo(x * r - r * 0.13, y * r + r * 0.15); g.lineTo(x * r, (y - h) * r); g.lineTo(x * r + r * 0.13, y * r + r * 0.15); g.closePath();
      ink(g, grad(g, (y - h) * r, y * r, '#e8f7ff', '#62b2ff'), r * 0.05);
    }
    g.beginPath(); g.moveTo(-r * 0.15, -r * 0.05); g.lineTo(0, -r * 0.3); g.lineTo(r * 0.15, -r * 0.05); g.lineTo(0, r * 0.2); g.closePath();
    g.fillStyle = '#c9f0ff'; g.shadowColor = '#7fd8ff'; g.shadowBlur = r * 0.6; g.fill(); g.shadowBlur = 0;
    for (const x of [-0.35, 0.4]) { ellipse(g, x * r, -r * 0.45, r * 0.12, r * 0.08); g.fillStyle = '#e8f7ff'; g.shadowColor = '#7fd8ff'; g.shadowBlur = r * 0.4; g.fill(); g.shadowBlur = 0; }
  },
  sporeboss(g, r) { // rotting mushroom queen
    g.beginPath(); g.roundRect(-r * 0.5, -r * 0.1, r * 1.0, r * 0.95, r * 0.3); ink(g, grad(g, 0, r, '#b8a888', '#5a4a36'), r * 0.07);
    glowEye(g, -r * 0.15, r * 0.25, r * 0.13, '#b8ff4a', 0.3); glowEye(g, r * 0.25, r * 0.25, r * 0.13, '#b8ff4a', -0.3);
    g.beginPath(); g.moveTo(-r * 0.25, r * 0.55); g.quadraticCurveTo(r * 0.05, r * 0.45, r * 0.35, r * 0.55); g.lineWidth = r * 0.05; g.strokeStyle = OUT; g.stroke();
    fangs(g, -r * 0.2, r * 0.3, r * 0.52, 4, r * 0.1);
    g.beginPath(); g.moveTo(-r * 1.1, -r * 0.05); g.quadraticCurveTo(-r * 1.05, -r * 1.2, 0, -r * 1.2); g.quadraticCurveTo(r * 1.05, -r * 1.2, r * 1.1, -r * 0.05);
    for (let i = 0; i < 6; i++) { const x = r * 1.1 - (i + 0.5) * (r * 2.2 / 6); g.quadraticCurveTo(x + r * 0.1, r * 0.2, x - r * 0.18, -r * 0.02); }
    g.closePath(); ink(g, grad(g, -r * 1.2, 0, '#5a2a7a', '#200c30'), r * 0.07);
    for (const [x, y, rr] of [[-0.6, -0.55, 0.14], [-0.15, -0.85, 0.12], [0.35, -0.7, 0.15], [0.7, -0.35, 0.1]]) { g.beginPath(); g.arc(x * r, y * r, rr * r, 0, TAU); g.fillStyle = '#a8ff4a'; g.shadowColor = '#a8ff4a'; g.shadowBlur = r * 0.3; g.fill(); g.shadowBlur = 0; }
    g.beginPath(); g.moveTo(-r * 0.3, -r * 1.15); g.lineTo(-r * 0.4, -r * 1.45); g.lineTo(-r * 0.12, -r * 1.25); g.lineTo(0, -r * 1.5); g.lineTo(r * 0.12, -r * 1.25); g.lineTo(r * 0.4, -r * 1.45); g.lineTo(r * 0.3, -r * 1.15); g.closePath();
    ink(g, grad(g, -r * 1.5, -r * 1.1, '#c9a24a', '#6e5220'), r * 0.05);
  },

  lavaboss(g, r) { // molten rock king with cracks of fire
    g.beginPath(); g.moveTo(-r, r * 0.6); g.bezierCurveTo(-r * 1.1, -r * 0.6, -r * 0.5, -r * 1.05, 0, -r); g.bezierCurveTo(r * 0.5, -r * 1.05, r * 1.1, -r * 0.6, r, r * 0.6);
    g.quadraticCurveTo(0, r * 0.9, -r, r * 0.6); ink(g, grad(g, -r, r, '#5a3a33', '#2a1612'), r * 0.08);
    g.lineCap = 'round'; g.lineWidth = r * 0.07; g.strokeStyle = '#ff8a3c'; g.shadowColor = '#ff6a1a'; g.shadowBlur = r * 0.35;
    for (const pts of [[[-0.7, 0.2], [-0.4, -0.1], [-0.5, -0.5]], [[0.6, 0.3], [0.35, 0], [0.55, -0.45]], [[-0.1, 0.55], [0.1, 0.3]]]) {
      g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x * r, y * r) : g.moveTo(x * r, y * r))); g.stroke();
    }
    g.shadowBlur = 0;
    g.beginPath(); g.moveTo(-r * 0.5, -r * 0.85); g.lineTo(-r * 0.6, -r * 1.4); g.lineTo(-r * 0.25, -r * 1.05); g.lineTo(0, -r * 1.5); g.lineTo(r * 0.25, -r * 1.05); g.lineTo(r * 0.6, -r * 1.4); g.lineTo(r * 0.5, -r * 0.85); g.closePath();
    ink(g, grad(g, -r * 1.5, -r * 0.8, '#ffc04a', '#e0501a'), r * 0.05);
    for (const x of [-0.2, 0.35]) { ellipse(g, x * r, -r * 0.35, r * 0.14, r * 0.1); g.fillStyle = '#ffd36b'; g.shadowColor = '#ff8a3c'; g.shadowBlur = r * 0.5; g.fill(); g.shadowBlur = 0; }
    ellipse(g, r * 0.08, r * 0.15, r * 0.4, r * 0.16); g.fillStyle = '#ff6a1a'; g.shadowColor = '#ff6a1a'; g.shadowBlur = r * 0.4; g.fill(); g.shadowBlur = 0;
  },
  tombboss(g, r) { // Raja Mumi: towering mummy in dusty wraps, gold-and-blue headdress, glowing teal eyes
    // sand swirl at the feet
    g.save(); g.globalAlpha = 0.45;
    for (const [x, y, rr] of [[-0.9, 0.75, 0.22], [0.85, 0.7, 0.2], [-0.3, 0.95, 0.18], [0.35, 0.92, 0.16]]) { ellipse(g, x * r, y * r, rr * r, rr * r * 0.45); g.fillStyle = '#d8b27a'; g.fill(); }
    g.restore();
    // body: tall wrapped figure
    g.beginPath(); g.moveTo(-r * 0.85, r * 0.85); g.bezierCurveTo(-r * 1.0, -r * 0.1, -r * 0.7, -r * 0.75, 0, -r * 0.8);
    g.bezierCurveTo(r * 0.7, -r * 0.75, r * 1.0, -r * 0.1, r * 0.85, r * 0.85); g.quadraticCurveTo(0, r * 1.0, -r * 0.85, r * 0.85);
    ink(g, grad(g, -r * 0.8, r, '#d9caa4', '#7d6a4a'), r * 0.08);
    // wrap bands
    g.save(); g.clip();
    g.strokeStyle = 'rgba(70,52,30,.55)'; g.lineWidth = r * 0.045;
    for (let i = 0; i < 9; i++) { const y = -r * 0.6 + i * r * 0.19, tilt = (i % 2 ? 1 : -1) * r * 0.12; g.beginPath(); g.moveTo(-r * 1.1, y - tilt); g.lineTo(r * 1.1, y + tilt); g.stroke(); }
    g.restore();
    // loose trailing wraps
    g.lineCap = 'round'; g.lineWidth = r * 0.1; g.strokeStyle = '#b8a47c';
    g.beginPath(); g.moveTo(-r * 0.75, r * 0.2); g.quadraticCurveTo(-r * 1.25, r * 0.35, -r * 1.15, r * 0.85); g.stroke();
    g.beginPath(); g.moveTo(r * 0.7, -r * 0.1); g.quadraticCurveTo(r * 1.3, 0, r * 1.25, r * 0.5); g.stroke();
    g.lineWidth = r * 0.03; g.strokeStyle = OUT;
    g.beginPath(); g.moveTo(-r * 0.75, r * 0.2); g.quadraticCurveTo(-r * 1.25, r * 0.35, -r * 1.15, r * 0.85); g.stroke();
    // gold collar with teal inlay
    g.beginPath(); g.ellipse(0, -r * 0.05, r * 0.72, r * 0.32, 0, 0, Math.PI); g.closePath();
    ink(g, grad(g, -r * 0.05, r * 0.3, '#ffd36b', '#a8761e'), r * 0.05);
    g.strokeStyle = '#2fb8a8'; g.lineWidth = r * 0.06;
    g.beginPath(); g.ellipse(0, -r * 0.05, r * 0.55, r * 0.2, 0, 0.15, Math.PI - 0.15); g.stroke();
    // headdress: striped gold & deep-blue cloth falling to the shoulders
    g.beginPath(); g.moveTo(-r * 0.62, r * 0.05); g.lineTo(-r * 0.5, -r * 0.95); g.quadraticCurveTo(0, -r * 1.35, r * 0.5, -r * 0.95); g.lineTo(r * 0.62, r * 0.05);
    g.lineTo(r * 0.32, -r * 0.1); g.lineTo(r * 0.3, -r * 0.6); g.lineTo(-r * 0.3, -r * 0.6); g.lineTo(-r * 0.32, -r * 0.1); g.closePath();
    ink(g, grad(g, -r * 1.3, 0, '#ffd36b', '#b8862a'), r * 0.06);
    g.save(); g.clip();
    g.strokeStyle = '#24407a'; g.lineWidth = r * 0.08;
    for (let i = 0; i < 6; i++) { const y = -r * 1.05 + i * r * 0.2; g.beginPath(); g.moveTo(-r * 0.8, y); g.lineTo(r * 0.8, y); g.stroke(); }
    g.restore();
    // face: dark wrapped mask
    g.beginPath(); g.roundRect(-r * 0.3, -r * 0.82, r * 0.6, r * 0.62, r * 0.14); ink(g, grad(g, -r * 0.8, -r * 0.2, '#8a7656', '#4a3a26'), r * 0.05);
    g.strokeStyle = 'rgba(30,20,10,.5)'; g.lineWidth = r * 0.03;
    for (const y of [-0.66, -0.42, -0.28]) { g.beginPath(); g.moveTo(-r * 0.3, y * r); g.lineTo(r * 0.3, (y + 0.05) * r); g.stroke(); }
    glowEye(g, -r * 0.12, -r * 0.55, r * 0.09, '#5affd8', 0.2); glowEye(g, r * 0.12, -r * 0.55, r * 0.09, '#5affd8', -0.2);
    // cobra-like crest on the brow (gold with a teal jewel)
    g.beginPath(); g.moveTo(-r * 0.08, -r * 1.02); g.quadraticCurveTo(0, -r * 1.32, r * 0.08, -r * 1.02); g.closePath(); ink(g, '#ffc94d', r * 0.04);
    g.beginPath(); g.arc(0, -r * 1.12, r * 0.05, 0, TAU); g.fillStyle = '#5affd8'; g.shadowColor = '#5affd8'; g.shadowBlur = r * 0.4; g.fill(); g.shadowBlur = 0;
    // sceptre-like crook arm
    g.lineWidth = r * 0.09; g.strokeStyle = '#ffc94d';
    g.beginPath(); g.moveTo(r * 0.55, r * 0.6); g.lineTo(r * 0.75, -r * 0.55); g.quadraticCurveTo(r * 0.85, -r * 0.85, r * 1.05, -r * 0.7); g.stroke();
    g.lineWidth = r * 0.03; g.strokeStyle = OUT; g.stroke();
    g.lineCap = 'butt';
  },
  boss(g, r) { // Raja Maw: horned maw beast with a tarnished crown
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(sd * r * 0.55, -r * 0.7); g.quadraticCurveTo(sd * r * 1.25, -r * 1.0, sd * r * 1.05, -r * 1.55); g.quadraticCurveTo(sd * r * 0.9, -r * 1.05, sd * r * 0.3, -r * 0.85); g.closePath(); ink(g, '#cfc2a8', r * 0.05); }
    g.beginPath();
    g.moveTo(-r, r * 0.6);
    g.bezierCurveTo(-r * 1.1, -r * 0.55, -r * 0.55, -r * 1.0, 0, -r * 0.95);
    g.bezierCurveTo(r * 0.55, -r * 1.0, r * 1.1, -r * 0.55, r, r * 0.6);
    g.quadraticCurveTo(0, r * 0.95, -r, r * 0.6);
    ink(g, grad(g, -r, r, '#4a2466', '#14081f'), r * 0.07);
    g.beginPath();
    g.moveTo(-r * 0.4, -r * 0.85); g.lineTo(-r * 0.48, -r * 1.25); g.lineTo(-r * 0.2, -r * 1.02); g.lineTo(0, -r * 1.32);
    g.lineTo(r * 0.2, -r * 1.02); g.lineTo(r * 0.48, -r * 1.25); g.lineTo(r * 0.4, -r * 0.85); g.closePath();
    ink(g, grad(g, -r * 1.3, -r * 0.8, '#c9a24a', '#6e5220'), r * 0.05);
    g.beginPath(); g.moveTo(-r * 0.6, r * 0.05); g.quadraticCurveTo(r * 0.12, r * 0.75, r * 0.8, r * 0.05); g.quadraticCurveTo(r * 0.12, r * 0.3, -r * 0.6, r * 0.05);
    g.fillStyle = '#2a0610'; g.fill(); g.lineWidth = r * 0.05; g.strokeStyle = OUT; g.stroke();
    fangs(g, -r * 0.5, r * 0.7, r * 0.1, 7, r * 0.18);
    fangs(g, -r * 0.3, r * 0.5, r * 0.45, 5, r * 0.14, false);
    glowEye(g, -r * 0.25, -r * 0.35, r * 0.17, '#ff3a3a', 0.3);
    glowEye(g, r * 0.35, -r * 0.35, r * 0.17, '#ff3a3a', -0.3);
  },

  // ——— biome enemies (spec §25.4) ———
  wolf(g, r) { // shadow wolf: violet-black, spiky ruff, burning red eyes
    for (const x of [-0.6, -0.25, 0.3, 0.6]) { g.beginPath(); g.roundRect(x * r - r * 0.1, r * 0.3, r * 0.2, r * 0.55, r * 0.08); ink(g, '#1a1224', r * 0.07); }
    g.beginPath(); g.moveTo(-r * 0.9, r * 0.05); g.lineTo(-r * 1.45, -r * 0.45); g.lineTo(-r * 1.1, r * 0.25); g.closePath(); ink(g, '#2a1a3a', r * 0.07); // tail
    ellipse(g, -r * 0.1, r * 0.05, r * 0.9, r * 0.48); ink(g, grad(g, -r, r, '#4a3266', '#160c22'), r * 0.09);
    for (let i = 0; i < 6; i++) { // ruff spikes
      const x = -r * 0.7 + i * r * 0.26;
      g.beginPath(); g.moveTo(x - r * 0.1, -r * 0.3); g.lineTo(x + r * 0.02, -r * 0.78 - (i % 2) * r * 0.15); g.lineTo(x + r * 0.14, -r * 0.3); g.closePath(); ink(g, '#2a1a3a', r * 0.05);
    }
    // head + snout
    g.beginPath(); g.moveTo(r * 0.35, -r * 0.45); g.lineTo(r * 0.8, -r * 0.5); g.lineTo(r * 1.35, -r * 0.05); g.lineTo(r * 0.85, r * 0.25); g.lineTo(r * 0.35, r * 0.2); g.closePath();
    ink(g, grad(g, -r * 0.5, r * 0.3, '#5a3e7a', '#1e1230'), r * 0.08);
    for (const x of [0.5, 0.75]) { g.beginPath(); g.moveTo(x * r - r * 0.1, -r * 0.45); g.lineTo(x * r, -r * 0.85); g.lineTo(x * r + r * 0.1, -r * 0.45); g.closePath(); ink(g, '#2a1a3a', r * 0.05); }
    fangs(g, r * 0.85, r * 1.25, r * 0.05, 3, r * 0.12);
    glowEye(g, r * 0.78, -r * 0.22, r * 0.14, '#ff2a2a');
  },
  frostslink(g, r) { // ooze of slush: pale blue, ice crystals on top, frosty eyes
    tinted(g, r, 'slink', 'rgba(150,210,255,.6)');
    iceSpikes(g, r, [[-0.45, -0.85, 0.35], [0.05, -1.0, 0.45], [0.5, -0.88, 0.3]]);
    glowEye(g, r * 0.2, -r * 0.25, r * 0.2, '#e8fbff');
    glowEye(g, r * 0.62, -r * 0.22, r * 0.17, '#e8fbff');
    breath(g, r * 1.0, r * 0.15, r);
  },
  frostspitter(g, r) { // snow toad: frosted hide, snowcap, icy drool
    tinted(g, r, 'spitter', 'rgba(170,215,255,.6)');
    g.beginPath(); g.moveTo(-r * 0.85, -r * 0.35); g.quadraticCurveTo(-r * 0.3, -r * 0.95, r * 0.15, -r * 0.6); g.quadraticCurveTo(-r * 0.3, -r * 0.45, -r * 0.85, -r * 0.35); g.closePath();
    ink(g, '#f2f8ff', r * 0.05);
    for (const x of [0.2, 0.6]) glowEye(g, x * r, -r * 0.57, r * 0.15, '#9fe8ff', 0);
    breath(g, r * 1.0, r * 0.05, r);
  },
  frosttank(g, r) { // ice golem: frozen stone, ice spikes, blue rune cracks
    tinted(g, r, 'tank', 'rgba(150,200,255,.55)');
    iceSpikes(g, r, [[-0.75, -0.55, 0.4], [-0.25, -0.95, 0.55], [0.35, -0.95, 0.45], [0.8, -0.55, 0.3]]);
    g.save(); g.shadowColor = '#7fd8ff'; g.shadowBlur = r * 0.5; g.lineWidth = r * 0.07; g.strokeStyle = '#bff0ff'; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-r * 0.6, -r * 0.5); g.lineTo(-r * 0.3, -r * 0.1); g.lineTo(-r * 0.5, r * 0.3); g.moveTo(r * 0.2, r * 0.1); g.lineTo(r * 0.45, r * 0.45); g.stroke();
    g.restore();
    glowEye(g, r * 0.35, -r * 0.35, r * 0.14, '#7fe8ff');
    glowEye(g, r * 0.7, -r * 0.3, r * 0.12, '#7fe8ff');
  },
  yeti(g, r) { // big white shaggy beast, little horns, blue mouth
    for (const x of [-0.5, 0.45]) { ellipse(g, x * r, r * 0.82, r * 0.28, r * 0.16); ink(g, '#8a9ab0', r * 0.07); }
    for (const s of [-1, 1]) { ellipse(g, s * r * 0.95, r * 0.15, r * 0.28, r * 0.5, s * 0.3); ink(g, grad(g, -r * 0.3, r * 0.7, '#f4f8ff', '#a8b8d0'), r * 0.07); }
    g.beginPath(); g.moveTo(-r * 0.85, r * 0.75);
    for (let i = 0; i <= 10; i++) { const a = Math.PI + (i / 10) * Math.PI, rr = r * (0.95 + (i % 2) * 0.08); g.lineTo(Math.cos(a) * rr, -r * 0.05 + Math.sin(a) * rr); }
    g.lineTo(r * 0.85, r * 0.75); g.quadraticCurveTo(0, r * 0.95, -r * 0.85, r * 0.75); g.closePath();
    ink(g, grad(g, -r, r, '#ffffff', '#b8c6dc'), r * 0.08);
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * r * 0.3, -r * 0.85); g.quadraticCurveTo(s * r * 0.55, -r * 1.25, s * r * 0.35, -r * 1.35); g.lineTo(s * r * 0.18, -r * 0.92); g.closePath(); ink(g, '#cfc2a8', r * 0.05); }
    ellipse(g, r * 0.1, -r * 0.25, r * 0.5, r * 0.38); ink(g, '#7a8ca8', r * 0.06); // face
    glowEye(g, -r * 0.08, -r * 0.35, r * 0.12, '#6ad8ff', 0.2); glowEye(g, r * 0.3, -r * 0.35, r * 0.12, '#6ad8ff', -0.2);
    ellipse(g, r * 0.12, -r * 0.05, r * 0.24, r * 0.12); g.fillStyle = '#2a5a9a'; g.fill(); g.lineWidth = r * 0.04; g.strokeStyle = OUT; g.stroke();
    fangs(g, -r * 0.05, r * 0.3, -r * 0.12, 3, r * 0.1);
  },
  icewisp(g, r) { // floating frost spirit: glowing core, orbiting shards
    g.beginPath(); g.moveTo(-r * 0.55, -r * 0.1);
    g.quadraticCurveTo(-r * 0.6, -r * 1.0, 0, -r * 1.05); g.quadraticCurveTo(r * 0.6, -r * 1.0, r * 0.55, -r * 0.1);
    g.quadraticCurveTo(r * 0.4, r * 0.6, r * 0.1, r * 1.0); g.quadraticCurveTo(-r * 0.05, r * 0.5, -r * 0.25, r * 0.85); g.quadraticCurveTo(-r * 0.3, r * 0.3, -r * 0.55, -r * 0.1);
    g.closePath(); ink(g, grad(g, -r, r, 'rgba(200,240,255,.95)', 'rgba(60,120,200,.55)'), r * 0.07);
    g.save(); g.shadowColor = '#7fd8ff'; g.shadowBlur = r * 0.9;
    ellipse(g, 0, -r * 0.35, r * 0.28, r * 0.28); g.fillStyle = '#e8fbff'; g.fill(); g.restore();
    for (let i = 0; i < 5; i++) { // shards
      const a = (i / 5) * TAU + 0.4, x = Math.cos(a) * r * 1.05, y = -r * 0.35 + Math.sin(a) * r * 0.75;
      g.beginPath(); g.moveTo(x, y - r * 0.2); g.lineTo(x + r * 0.08, y); g.lineTo(x, y + r * 0.2); g.lineTo(x - r * 0.08, y); g.closePath(); ink(g, '#bff0ff', r * 0.03);
    }
    glowEye(g, -r * 0.12, -r * 0.4, r * 0.09, '#1a5aa8', 0); glowEye(g, r * 0.14, -r * 0.4, r * 0.09, '#1a5aa8', 0);
  },
  sandslink(g, r) { // grainy sand ooze
    tinted(g, r, 'slink', 'rgba(214,150,70,.65)');
    for (let i = 0; i < 14; i++) { const a = i * 2.4, d = (0.2 + (i % 5) * 0.14) * r; g.beginPath(); g.arc(Math.cos(a) * d - r * 0.1, Math.sin(a) * d * 0.6, r * 0.04, 0, TAU); g.fillStyle = 'rgba(90,50,20,.6)'; g.fill(); }
    glowEye(g, r * 0.2, -r * 0.25, r * 0.2, '#ffe08a');
    glowEye(g, r * 0.62, -r * 0.22, r * 0.17, '#ffe08a');
  },
  vulture(g, r) { // bald vulture: brown wings, pink head, hooked beak
    for (const s of [-1, 1]) {
      g.beginPath(); g.moveTo(s * r * 0.3, -r * 0.25);
      g.lineTo(s * r * 1.6, -r * 0.75); g.lineTo(s * r * 1.75, -r * 0.35); g.lineTo(s * r * 1.5, -r * 0.2); g.lineTo(s * r * 1.6, r * 0.05); g.lineTo(s * r * 1.3, r * 0.05); g.lineTo(s * r * 1.35, r * 0.3); g.lineTo(s * r * 0.4, r * 0.25);
      g.closePath(); ink(g, grad(g, -r, r * 0.3, '#7a5a3a', '#3a2614'), r * 0.07);
    }
    ellipse(g, 0, r * 0.1, r * 0.55, r * 0.62); ink(g, grad(g, -r, r, '#5a4028', '#2a1a0e'), r * 0.08);
    ellipse(g, 0, -r * 0.3, r * 0.42, r * 0.16); g.fillStyle = '#efe6d2'; g.fill(); // ruff
    ellipse(g, r * 0.12, -r * 0.62, r * 0.3, r * 0.27); ink(g, '#c87a7a', r * 0.07);
    g.beginPath(); g.moveTo(r * 0.35, -r * 0.7); g.quadraticCurveTo(r * 0.75, -r * 0.7, r * 0.62, -r * 0.42); g.lineTo(r * 0.38, -r * 0.55); g.closePath(); ink(g, '#d8c06a', r * 0.05);
    glowEye(g, r * 0.18, -r * 0.68, r * 0.09, '#ffb03a', 0);
  },
  scorpion(g, r) { // black-red scorpion, venom-green stinger
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-r * 0.3 + i * r * 0.3, s * r * 0.2); g.lineTo(-r * 0.5 + i * r * 0.3, s * r * 0.75); g.lineWidth = r * 0.09; g.strokeStyle = '#1a0a0a'; g.lineCap = 'round'; g.stroke(); }
    // tail arching over the back
    g.lineCap = 'round'; g.lineWidth = r * 0.26; g.strokeStyle = OUT;
    g.beginPath(); g.moveTo(-r * 0.6, 0); g.quadraticCurveTo(-r * 1.3, -r * 0.6, -r * 0.6, -r * 1.15); g.quadraticCurveTo(-r * 0.1, -r * 1.35, r * 0.15, -r * 1.0); g.stroke();
    g.lineWidth = r * 0.18; g.strokeStyle = '#7a1a1a';
    g.beginPath(); g.moveTo(-r * 0.6, 0); g.quadraticCurveTo(-r * 1.3, -r * 0.6, -r * 0.6, -r * 1.15); g.quadraticCurveTo(-r * 0.1, -r * 1.35, r * 0.15, -r * 1.0); g.stroke();
    g.beginPath(); g.moveTo(r * 0.1, -r * 1.1); g.lineTo(r * 0.45, -r * 0.85); g.lineTo(r * 0.12, -r * 0.82); g.closePath();
    g.fillStyle = '#7dff4a'; g.shadowColor = '#7dff4a'; g.shadowBlur = r * 0.5; g.fill(); g.shadowBlur = 0;
    // pincers
    for (const s of [-1, 1]) {
      g.beginPath(); g.moveTo(r * 0.5, s * r * 0.2); g.lineTo(r * 0.95, s * r * 0.45); g.lineWidth = r * 0.14; g.strokeStyle = '#3a0e0e'; g.stroke();
      g.beginPath(); g.ellipse(r * 1.1, s * r * 0.5, r * 0.25, r * 0.15, s * 0.4, 0, TAU); ink(g, '#8a1e1e', r * 0.06);
      g.beginPath(); g.moveTo(r * 1.2, s * r * 0.48); g.lineTo(r * 1.4, s * r * 0.36); g.lineWidth = r * 0.06; g.strokeStyle = OUT; g.stroke();
    }
    ellipse(g, 0, 0, r * 0.75, r * 0.45); ink(g, grad(g, -r * 0.5, r * 0.5, '#5a1414', '#1a0606'), r * 0.08);
    for (const x of [-0.35, 0, 0.35]) { g.beginPath(); g.moveTo(x * r, -r * 0.42); g.lineTo(x * r, r * 0.42); g.lineWidth = r * 0.04; g.strokeStyle = 'rgba(0,0,0,.5)'; g.stroke(); }
    glowEye(g, r * 0.5, -r * 0.12, r * 0.09, '#ff5a2a', 0); glowEye(g, r * 0.5, r * 0.1, r * 0.09, '#ff5a2a', 0);
  },
  sandworm(g, r) { // giant segmented worm rearing out of the sand, ring of teeth
    ellipse(g, 0, r * 0.75, r * 1.1, r * 0.3); ink(g, '#a8784a', r * 0.06); // sand around it
    for (let i = 3; i >= 0; i--) { ellipse(g, -r * 0.05 * i, r * 0.5 - i * r * 0.32, r * (0.62 + i * 0.03), r * 0.3); ink(g, grad(g, -r, r, '#c89a6a', '#6a4426'), r * 0.07); }
    ellipse(g, r * 0.1, -r * 0.75, r * 0.6, r * 0.42); ink(g, '#5a2a1a', r * 0.08);
    ellipse(g, r * 0.12, -r * 0.75, r * 0.44, r * 0.28); g.fillStyle = '#2a0a06'; g.fill();
    for (let i = 0; i < 10; i++) { // teeth ring
      const a = (i / 10) * TAU, x = r * 0.12 + Math.cos(a) * r * 0.4, y = -r * 0.75 + Math.sin(a) * r * 0.25;
      const ix = r * 0.12 + Math.cos(a) * r * 0.24, iy = -r * 0.75 + Math.sin(a) * r * 0.15;
      g.beginPath(); g.moveTo(x + Math.sin(a) * r * 0.06, y - Math.cos(a) * r * 0.04); g.lineTo(ix, iy); g.lineTo(x - Math.sin(a) * r * 0.06, y + Math.cos(a) * r * 0.04); g.closePath();
      g.fillStyle = '#efe6d2'; g.fill();
    }
    g.beginPath(); g.arc(r * 0.12, -r * 0.75, r * 0.1, 0, TAU); g.fillStyle = '#ff6a3a'; g.shadowColor = '#ff6a3a'; g.shadowBlur = r * 0.5; g.fill(); g.shadowBlur = 0;
  },
  magmaslink(g, r) { // lava ooze: black crust, glowing orange cracks
    tinted(g, r, 'slink', 'rgba(36,16,12,.78)');
    g.save(); g.lineCap = 'round'; g.lineWidth = r * 0.08; g.strokeStyle = '#ff8a3c'; g.shadowColor = '#ff6a1a'; g.shadowBlur = r * 0.5;
    for (const pts of [[[-0.75, 0.3], [-0.45, -0.1], [-0.55, -0.55]], [[-0.1, 0.5], [0.05, 0.3]], [[0.3, -0.7], [0.1, -0.45]]]) {
      g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x * r, y * r) : g.moveTo(x * r, y * r))); g.stroke();
    }
    g.restore();
    glowEye(g, r * 0.2, -r * 0.25, r * 0.2, '#ffb03a');
    glowEye(g, r * 0.62, -r * 0.22, r * 0.17, '#ffb03a');
  },
  emberbomber(g, r) { // charred toadstool with smouldering spots and smoke
    tinted(g, r, 'bomber', 'rgba(50,12,8,.5)');
    for (const [x, y, rr] of [[-0.5, -0.45, 0.13], [0.15, -0.75, 0.11], [0.55, -0.35, 0.12]]) { g.beginPath(); g.arc(x * r, y * r, rr * r, 0, TAU); g.fillStyle = '#ff7a2a'; g.shadowColor = '#ff6a1a'; g.shadowBlur = r * 0.4; g.fill(); g.shadowBlur = 0; }
    for (const [x, y, rr] of [[-0.3, -1.3, 0.2], [-0.5, -1.6, 0.16]]) { g.beginPath(); g.arc(x * r, y * r, rr * r, 0, TAU); g.fillStyle = 'rgba(80,70,70,.55)'; g.fill(); }
    glowEye(g, -r * 0.1, r * 0.25, r * 0.13, '#ff6a1a', 0.3); glowEye(g, r * 0.2, r * 0.25, r * 0.13, '#ff6a1a', -0.3);
  },
  imp(g, r) { // little red winged devil with horns and a forked tail
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * r * 0.3, -r * 0.2); g.lineTo(s * r * 1.25, -r * 0.85); g.lineTo(s * r * 1.05, -r * 0.3); g.lineTo(s * r * 1.3, -r * 0.05); g.lineTo(s * r * 0.45, r * 0.15); g.closePath(); ink(g, grad(g, -r, r * 0.2, '#6a1a1a', '#2a0808'), r * 0.07); }
    g.beginPath(); g.moveTo(-r * 0.3, r * 0.5); g.quadraticCurveTo(-r * 0.95, r * 0.75, -r * 1.05, r * 0.25); g.lineWidth = r * 0.08; g.strokeStyle = '#8a1a1a'; g.lineCap = 'round'; g.stroke();
    g.beginPath(); g.moveTo(-r * 1.05, r * 0.25); g.lineTo(-r * 1.2, r * 0.05); g.lineTo(-r * 0.92, r * 0.12); g.closePath(); ink(g, '#8a1a1a', r * 0.04);
    ellipse(g, 0, r * 0.05, r * 0.6, r * 0.7); ink(g, grad(g, -r, r, '#e0402a', '#7a1410'), r * 0.08);
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * r * 0.15, -r * 0.55); g.quadraticCurveTo(s * r * 0.5, -r * 0.85, s * r * 0.35, -r * 1.15); g.lineTo(s * r * 0.3, -r * 0.6); g.closePath(); ink(g, '#2a1a14', r * 0.04); }
    glowEye(g, -r * 0.1, -r * 0.15, r * 0.12, '#ffd36b', 0.3); glowEye(g, r * 0.25, -r * 0.15, r * 0.12, '#ffd36b', -0.3);
    g.beginPath(); g.moveTo(-r * 0.1, r * 0.25); g.quadraticCurveTo(r * 0.08, r * 0.4, r * 0.3, r * 0.22); g.lineWidth = r * 0.05; g.strokeStyle = OUT; g.stroke();
    fangs(g, -r * 0.02, r * 0.22, r * 0.28, 2, r * 0.08);
  },
  salamander(g, r) { // fire lizard: orange body, glowing ridged back
    for (const x of [-0.5, 0.45]) for (const s of [-1, 1]) { g.beginPath(); g.moveTo(x * r, s * r * 0.15); g.lineTo(x * r + r * 0.15, s * r * 0.6); g.lineWidth = r * 0.12; g.strokeStyle = '#6a2a10'; g.lineCap = 'round'; g.stroke(); }
    g.beginPath(); g.moveTo(-r * 0.7, 0); g.quadraticCurveTo(-r * 1.3, r * 0.1, -r * 1.55, -r * 0.3); g.quadraticCurveTo(-r * 1.2, -r * 0.05, -r * 0.7, -r * 0.2); g.closePath(); ink(g, '#c8501a', r * 0.06); // tail
    ellipse(g, 0, -r * 0.05, r * 0.85, r * 0.4); ink(g, grad(g, -r * 0.5, r * 0.4, '#ff8a3c', '#9a3410'), r * 0.08);
    g.save(); g.shadowColor = '#ffb03a'; g.shadowBlur = r * 0.6;
    for (let i = 0; i < 6; i++) { const x = -r * 0.75 + i * r * 0.28; g.beginPath(); g.moveTo(x - r * 0.08, -r * 0.35); g.lineTo(x + r * 0.03, -r * 0.62 - (i % 2) * r * 0.1); g.lineTo(x + r * 0.13, -r * 0.35); g.closePath(); g.fillStyle = '#ffd36b'; g.fill(); }
    g.restore();
    ellipse(g, r * 0.85, -r * 0.05, r * 0.38, r * 0.28); ink(g, '#e86a2a', r * 0.07);
    glowEye(g, r * 0.95, -r * 0.15, r * 0.11, '#fff06a');
    g.beginPath(); g.moveTo(r * 1.0, r * 0.08); g.lineTo(r * 1.2, r * 0.05); g.lineWidth = r * 0.04; g.strokeStyle = OUT; g.stroke();
  },

};

// ——— pickups (centered, world units) ———
// style D (plan "Gaya D" §4): every enemy is redrawn in art/monsters.js
Object.assign(ENEMY_ART, MONSTER_ART);
Object.assign(ENEMY_ART, ECLIPSE_ART);

export const PICKUP_ART = {
  gem(g) { diamond(g, 1, '#8ff3ff', '#10a5c9'); },
  bigGem(g) { diamond(g, 1.45, '#f6a8ff', '#b02fd6'); },
  heart(g) {
    g.beginPath();
    g.moveTo(0, 6);
    g.bezierCurveTo(-8, 0, -6.5, -7, 0, -3.2);
    g.bezierCurveTo(6.5, -7, 8, 0, 0, 6);
    ink(g, grad(g, -6, 6, '#ff8aa3', '#e8264f'), 1.3);
    shine(g, -2.8, -2.8, 1.6, 0.9, -0.6, 0.7);
  },
  coin(g) {
    ellipse(g, 0, 0, 5.2, 5.2);
    ink(g, grad(g, -5, 5, '#fff1b3', '#e09a10'), 1.3);
    ellipse(g, 0, 0, 3, 3);
    g.lineWidth = 1; g.strokeStyle = 'rgba(122,74,0,.7)'; g.stroke();
    shine(g, -1.8, -2, 1.4, 0.8, -0.6, 0.8);
  },
};
function diamond(g, k, c0, c1) {
  g.beginPath();
  g.moveTo(0, -6 * k); g.lineTo(4.6 * k, -1 * k); g.lineTo(0, 6 * k); g.lineTo(-4.6 * k, -1 * k); g.closePath();
  ink(g, grad(g, -6 * k, 6 * k, c0, c1), 1.2);
  g.beginPath(); g.moveTo(-4.6 * k, -1 * k); g.lineTo(4.6 * k, -1 * k);
  g.lineWidth = 0.6; g.strokeStyle = 'rgba(255,255,255,.55)'; g.stroke();
  shine(g, -1.6 * k, -2.6 * k, 1.1 * k, 0.6 * k, -0.8, 0.8);
}

// ——— ground decor ———
const FLOWER = { flowerW: '#ffffff', flowerP: '#ff9ccf', flowerY: '#ffe169' };
export const DECOR_ART = {
  tuft(g) {
    g.fillStyle = '#2f8a51';
    for (const [x, h, lean] of [[-3, 7, -2], [0, 9, 0.5], [3, 6, 2.5]]) {
      g.beginPath(); g.moveTo(x - 1.4, 0); g.quadraticCurveTo(x + lean * 0.3, -h * 0.6, x + lean, -h);
      g.quadraticCurveTo(x + lean * 0.2, -h * 0.4, x + 1.4, 0); g.fill();
    }
  },
  stone(g) {
    ellipse(g, 0, 0, 6, 4); ink(g, grad(g, -4, 4, '#c3c9d9', '#7f879e'), 1.1);
    shine(g, -2, -1.6, 2, 0.8, -0.2, 0.6);
  },
  bush(g) {
    g.beginPath();
    for (const [x, y, rr] of [[-5, 0, 5], [5, 0, 5], [0, -4, 6.5]]) { g.moveTo(x + rr, y); g.arc(x, y, rr, 0, TAU); }
    g.fillStyle = OUT; g.save(); g.lineWidth = 2.4; g.strokeStyle = OUT; g.stroke(); g.restore();
    g.fillStyle = grad(g, -10, 5, '#5fd07f', '#2f8a51'); g.fill();
    shine(g, -1.5, -7, 2.4, 1.1, -0.3, 0.45);
  },
};
for (const [id, col] of Object.entries(FLOWER)) {
  DECOR_ART[id] = (g) => {
    g.strokeStyle = '#2f8a51'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -4); g.stroke();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      g.beginPath(); g.arc(Math.cos(a) * 2.4, -6 + Math.sin(a) * 2.4, 1.9, 0, TAU);
      g.fillStyle = col; g.fill(); g.lineWidth = 0.6; g.strokeStyle = 'rgba(42,33,64,.45)'; g.stroke();
    }
    g.beginPath(); g.arc(0, -6, 1.4, 0, TAU); g.fillStyle = '#ffb627'; g.fill();
  };
}

// ——— icons: drawn inside a box of `size` centred on the origin ———
const ICONS = {
  ember(g) {
    g.beginPath(); g.moveTo(0, -10);
    g.bezierCurveTo(7, -3, 8, 3, 0, 9); g.bezierCurveTo(-8, 3, -7, -3, 0, -10);
    ink(g, grad(g, -10, 9, '#ffd36b', '#ff5a2a'), 1.6);
    g.beginPath(); g.moveTo(0, -2); g.bezierCurveTo(3.5, 1, 3.5, 4, 0, 7); g.bezierCurveTo(-3.5, 4, -3.5, 1, 0, -2);
    g.fillStyle = '#fff4b8'; g.fill();
  },
  bubble(g) {
    for (const [x, y, r] of [[-3, 2, 6], [5, -4, 4], [5, 6, 2.6]]) {
      g.beginPath(); g.arc(x, y, r, 0, TAU);
      g.fillStyle = 'rgba(128,220,255,.45)'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = '#4cc3ff'; g.stroke();
      shine(g, x - r * 0.35, y - r * 0.35, r * 0.3, r * 0.18, -0.6, 0.9);
    }
  },
  gale(g) {
    for (const s of [0, Math.PI]) {
      g.save(); g.rotate(s);
      g.beginPath(); g.moveTo(-1, -1); g.quadraticCurveTo(4, -11, 10, -6); g.quadraticCurveTo(5, -3, -1, -1);
      ink(g, grad(g, -10, 0, '#d4ff8a', '#4cbf55'), 1.4);
      g.restore();
    }
    g.beginPath(); g.arc(0, 0, 2.4, 0, TAU); ink(g, '#eaffc4', 1.2);
  },
  zap(g) {
    g.beginPath();
    g.moveTo(2, -11); g.lineTo(-6, 1); g.lineTo(-0.5, 1); g.lineTo(-3, 11); g.lineTo(6, -2); g.lineTo(0.5, -2); g.closePath();
    ink(g, grad(g, -11, 11, '#fff59a', '#ffbf1f'), 1.5);
  },
  thorn(g) {
    g.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU, r = i % 2 ? 6 : 10.5;
      g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath(); ink(g, grad(g, -10, 10, '#a8f07a', '#2f9a4e'), 1.4);
    g.beginPath(); g.arc(0, 0, 3.4, 0, TAU); ink(g, '#ffe169', 1.2);
  },
  heart(g) { g.save(); g.scale(1.45, 1.45); g.translate(0, 0.6); PICKUP_ART.heart(g); g.restore(); },
  spd(g) {
    for (const x of [-4, 3]) {
      g.beginPath(); g.moveTo(x - 3, -8); g.lineTo(x + 4, 0); g.lineTo(x - 3, 8);
      g.lineCap = 'round'; g.lineJoin = 'round';
      g.lineWidth = 5.5; g.strokeStyle = OUT; g.stroke();
      g.lineWidth = 3; g.strokeStyle = '#5ef0c8'; g.stroke();
    }
  },
  vit(g) {
    ICONS.heart(g);
    g.lineCap = 'round';
    for (const [w, c] of [[5, OUT], [2.6, '#fff']]) {
      g.beginPath(); g.moveTo(5, -9); g.lineTo(5, -1); g.moveTo(1, -5); g.lineTo(9, -5);
      g.lineWidth = w; g.strokeStyle = c; g.stroke();
    }
  },
  pow(g) {
    g.save(); g.rotate(Math.PI / 4);
    g.beginPath(); g.moveTo(0, -12); g.lineTo(2.6, -9); g.lineTo(2.6, 3); g.lineTo(-2.6, 3); g.lineTo(-2.6, -9); g.closePath();
    ink(g, grad(g, -12, 3, '#ffffff', '#b8c4dc'), 1.3);
    g.beginPath(); g.roundRect(-6, 3, 12, 2.8, 1.4); ink(g, '#ffc94d', 1.2);
    g.beginPath(); g.roundRect(-1.6, 5.8, 3.2, 5, 1.2); ink(g, '#8a5a3a', 1.2);
    g.restore();
  },
  hst(g) {
    g.beginPath(); g.arc(0, 1.5, 9, 0, TAU); ink(g, grad(g, -8, 10, '#bfe3ff', '#5ab0ff'), 1.6);
    g.beginPath(); g.roundRect(-2.5, -11, 5, 3.5, 1); ink(g, '#ffc94d', 1.2);
    g.lineCap = 'round'; g.lineWidth = 2; g.strokeStyle = OUT;
    g.beginPath(); g.moveTo(0, 1.5); g.lineTo(0, -4.5); g.moveTo(0, 1.5); g.lineTo(4.5, 3.5); g.stroke();
  },
  mag(g) {
    g.beginPath(); g.arc(0, 0, 7.5, Math.PI, 0); g.lineTo(7.5, 8); g.lineTo(3, 8); g.lineTo(3, 0);
    g.arc(0, 0, 3, 0, Math.PI, true); g.lineTo(-3, 8); g.lineTo(-7.5, 8); g.closePath();
    ink(g, grad(g, -8, 8, '#ff8a8a', '#e23a4a'), 1.5);
    g.fillStyle = '#e2e8f0';
    g.fillRect(-7, 4.5, 3.5, 3); g.fillRect(3.5, 4.5, 3.5, 3);
  },
  arm(g) {
    g.beginPath(); g.moveTo(0, -10); g.quadraticCurveTo(7, -8, 9, -7); g.quadraticCurveTo(9, 5, 0, 11);
    g.quadraticCurveTo(-9, 5, -9, -7); g.quadraticCurveTo(-7, -8, 0, -10);
    ink(g, grad(g, -10, 11, '#9fd0ff', '#3f7ee0'), 1.6);
    g.beginPath(); g.moveTo(0, -6); g.lineTo(0, 7); g.moveTo(-5.5, -2); g.lineTo(5.5, -2);
    g.lineWidth = 1.6; g.strokeStyle = 'rgba(255,255,255,.75)'; g.stroke();
  },
  // ——— gear (inventory, ground drops) ———
  gearSword(g) { ICONS.pow(g); },
  gearBow(g) {
    g.save(); g.rotate(Math.PI / 4);
    g.beginPath(); g.moveTo(-2, -11); g.quadraticCurveTo(9, 0, -2, 11);
    g.lineCap = 'round'; g.lineWidth = 5; g.strokeStyle = OUT; g.stroke();
    g.lineWidth = 3; g.strokeStyle = '#c8874e'; g.stroke();
    g.beginPath(); g.moveTo(-2, -11); g.lineTo(-2, 11); g.lineWidth = 1; g.strokeStyle = '#f1e9d8'; g.stroke();
    g.beginPath(); g.moveTo(-10, 0); g.lineTo(7, 0); g.lineWidth = 1.6; g.strokeStyle = OUT; g.stroke();
    g.beginPath(); g.moveTo(10, 0); g.lineTo(6, -2.6); g.lineTo(6, 2.6); g.closePath(); ink(g, '#e6ecf5', 1);
    g.restore();
  },
  gearStaff(g) {
    g.save(); g.rotate(Math.PI / 5);
    g.beginPath(); g.roundRect(-1.6, -6, 3.2, 18, 1.5); ink(g, '#8a5a3a', 1.2);
    g.beginPath(); g.arc(0, -8, 5, 0, TAU); ink(g, grad(g, -13, -3, '#c9b8ff', '#7b5cff'), 1.4);
    shine(g, -1.6, -9.6, 1.6, 1, -0.5, 0.8);
    g.restore();
  },
  gearDagger(g) {
    g.save(); g.rotate(Math.PI / 4);
    g.beginPath(); g.moveTo(0, -11); g.lineTo(3, -3); g.lineTo(-3, -3); g.closePath(); ink(g, grad(g, -11, -3, '#ffffff', '#b8c4dc'), 1.2);
    g.beginPath(); g.roundRect(-5, -3, 10, 2.4, 1.2); ink(g, '#ff4d5e', 1.1);
    g.beginPath(); g.roundRect(-1.5, -0.6, 3, 6, 1); ink(g, '#3a2f4f', 1.1);
    g.restore();
  },
  gearHelm(g) {
    g.beginPath(); g.moveTo(-9, 4); g.quadraticCurveTo(-9, -9, 0, -9); g.quadraticCurveTo(9, -9, 9, 4); g.lineTo(9, 7); g.lineTo(-9, 7); g.closePath();
    ink(g, grad(g, -9, 7, '#e2e8f0', '#8a94a8'), 1.5);
    g.beginPath(); g.roundRect(-6, 0, 12, 3, 1.5); g.fillStyle = OUT; g.fill();
    g.beginPath(); g.roundRect(-1.2, -9, 2.4, 9, 1); ink(g, '#ffc94d', 1);
  },
  gearArmor(g) {
    g.beginPath(); g.moveTo(-5, -9); g.lineTo(-10, -6); g.lineTo(-8, 1); g.lineTo(-6, 0); g.lineTo(-6, 10); g.lineTo(6, 10); g.lineTo(6, 0);
    g.lineTo(8, 1); g.lineTo(10, -6); g.lineTo(5, -9); g.quadraticCurveTo(0, -5, -5, -9);
    ink(g, grad(g, -9, 10, '#cfd6e4', '#7d879c'), 1.5);
    g.beginPath(); g.moveTo(0, -5); g.lineTo(0, 9); g.lineWidth = 1.2; g.strokeStyle = 'rgba(42,33,64,.6)'; g.stroke();
  },
  gearBoots(g) {
    g.beginPath(); g.moveTo(-6, -10); g.lineTo(2, -10); g.lineTo(2, 2); g.quadraticCurveTo(10, 2, 10, 7); g.lineTo(10, 9); g.lineTo(-6, 9); g.closePath();
    ink(g, grad(g, -10, 9, '#b07a50', '#6a4630'), 1.5);
    g.beginPath(); g.roundRect(-7, -11, 10, 3.5, 1.5); ink(g, '#8a5a3a', 1.1);
    g.beginPath(); g.rect(-6, 6.5, 16, 2.5); g.fillStyle = OUT; g.fill();
  },
  gearAmulet(g) {
    g.beginPath(); g.arc(0, -4, 8, Math.PI * 0.15, Math.PI * 0.85, true); g.lineWidth = 1.6; g.strokeStyle = '#d6b25e'; g.stroke();
    g.beginPath(); g.moveTo(0, 0); g.lineTo(5, 5); g.lineTo(0, 11); g.lineTo(-5, 5); g.closePath();
    ink(g, grad(g, 0, 11, '#ff9ab0', '#d0234f'), 1.4);
    shine(g, -1.2, 4, 1.2, 0.8, -0.5, 0.8);
  },
  gearRing(g) {
    g.beginPath(); g.arc(0, 3, 7, 0, TAU); g.arc(0, 3, 4.4, 0, TAU, true);
    ink(g, grad(g, -4, 10, '#ffe7a0', '#d9a020'), 1.4);
    g.beginPath(); g.moveTo(0, -10); g.lineTo(4, -5); g.lineTo(0, -2); g.lineTo(-4, -5); g.closePath();
    ink(g, grad(g, -10, -2, '#c9f0ff', '#4fa8e8'), 1.2);
  },
  // ——— town ———
  trainer(g) { // dumbbell
    g.beginPath(); g.roundRect(-7, -1.6, 14, 3.2, 1.5); ink(g, '#b9c1d0', 1.2);
    for (const x of [-10, 7]) { g.beginPath(); g.roundRect(x, -6, 3.4, 12, 1.5); ink(g, '#4a4866', 1.3); }
    for (const x of [-12.5, 10.4]) { g.beginPath(); g.roundRect(x, -4, 2.2, 8, 1); ink(g, '#4a4866', 1.1); }
  },
  barber(g) { // scissors
    for (const s of [-1, 1]) {
      g.beginPath(); g.moveTo(0, 0); g.lineTo(s * 3, -11); g.lineTo(s * 0.6, -1); g.closePath(); ink(g, '#e6ecf5', 1.1);
      g.beginPath(); g.arc(s * 4, 5.5, 3.6, 0, TAU); g.lineWidth = 3.4; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 2; g.strokeStyle = '#e0527a'; g.stroke();
    }
  },
  board(g) { // pinned bounty notice
    g.beginPath(); g.roundRect(-9, -10, 18, 20, 2); ink(g, grad(g, -10, 10, '#f3e2b8', '#c9a46a'), 1.5);
    g.strokeStyle = '#6b4a2a'; g.lineWidth = 1.4;
    for (const y of [-3, 1, 5]) { g.beginPath(); g.moveTo(-5, y); g.lineTo(5, y); g.stroke(); }
    g.beginPath(); g.arc(0, -8, 2.4, 0, TAU); ink(g, '#c0392b', 1);
  },
  talk(g) { // speech bubble
    g.beginPath(); g.roundRect(-10, -9, 20, 14, 6); g.moveTo(-3, 5); g.lineTo(-6, 10); g.lineTo(2, 5);
    ink(g, '#fffaf0', 1.5);
    g.fillStyle = OUT;
    for (const x of [-5, 0, 5]) { g.beginPath(); g.arc(x, -2, 1.5, 0, TAU); g.fill(); }
  },
  ...Object.fromEntries(Object.entries(POTIONS).map(([id, p]) => [`pot_${id}`, (g) => flask(g, p, id === 'big')])),
  inn(g) { // frothy mug
    g.beginPath(); g.roundRect(-8, -5, 13, 15, 3); ink(g, grad(g, -5, 10, '#ffd36b', '#e09a2a'), 1.5);
    g.beginPath(); g.arc(5, 2, 4.5, -Math.PI / 2, Math.PI / 2); g.lineWidth = 4.4; g.strokeStyle = OUT; g.stroke();
    g.lineWidth = 2; g.strokeStyle = '#ffd36b'; g.stroke();
    g.beginPath();
    for (const [x, r] of [[-6, 3.6], [-1.5, 4.4], [3, 3.6]]) { g.moveTo(x + r, -6); g.arc(x, -6, r, 0, TAU); }
    ink(g, '#fffaf0', 1.2);
  },
  potion(g) { // round flask
    g.beginPath(); g.roundRect(-3, -11, 6, 6, 1.5); ink(g, '#c8874e', 1.3);
    g.beginPath(); g.moveTo(-3, -5); g.lineTo(-3, -3); g.arc(0, 4, 8, -Math.PI / 2 - 0.38, Math.PI * 1.5 + 0.38); g.lineTo(3, -5); g.closePath();
    ink(g, grad(g, -4, 12, '#ff8aa3', '#d0234f'), 1.5);
    shine(g, -3, 1, 2, 3.2, 0.3, 0.6);
  },
  // ——— class skills ———
  spin(g) {
    g.lineCap = 'round';
    for (const s of [0, Math.PI]) {
      g.beginPath(); g.arc(0, 0, 9.5, s + 0.35, s + 2.6);
      g.lineWidth = 5; g.strokeStyle = OUT; g.stroke();
      g.lineWidth = 2.6; g.strokeStyle = '#ffd36b'; g.stroke();
      const a = s + 2.6, x = Math.cos(a) * 9.5, y = Math.sin(a) * 9.5;
      g.save(); g.translate(x, y); g.rotate(a + Math.PI / 2);
      g.beginPath(); g.moveTo(-3.5, -2); g.lineTo(3.5, 0); g.lineTo(-3.5, 2.6); g.closePath(); ink(g, '#ffd36b', 1.1);
      g.restore();
    }
    g.save(); g.rotate(-Math.PI / 4); g.scale(0.55, 0.55); ICONS.pow(g); g.restore();
  },
  shout(g) {
    g.save(); g.translate(-3, 0); g.scale(0.75, 0.75); ICONS.arm(g); g.restore();
    g.lineCap = 'round';
    for (const r of [7, 11]) {
      g.beginPath(); g.arc(1, 0, r, -0.7, 0.7);
      g.lineWidth = 3.6; g.strokeStyle = OUT; g.stroke();
      g.lineWidth = 1.8; g.strokeStyle = '#ffe27a'; g.stroke();
    }
  },
  rain(g) {
    for (const [x, y] of [[-6, -6], [1, -1], [7, -7]]) {
      g.save(); g.translate(x, y); g.rotate(Math.PI / 2);
      g.beginPath(); g.moveTo(-5, 0); g.lineTo(7, 0); g.lineWidth = 3.6; g.strokeStyle = OUT; g.lineCap = 'round'; g.stroke();
      g.lineWidth = 1.8; g.strokeStyle = '#c8874e'; g.stroke();
      g.beginPath(); g.moveTo(11, 0); g.lineTo(6, -3); g.lineTo(6, 3); g.closePath(); ink(g, '#e6ecf5', 1);
      g.restore();
    }
    g.beginPath(); g.ellipse(0, 10, 10, 2.6, 0, 0, TAU); g.fillStyle = 'rgba(255,107,139,.6)'; g.fill();
  },
  pierce(g) {
    g.beginPath(); g.arc(0, 0, 6, 0, TAU); ink(g, 'rgba(155,123,255,.5)', 1.2);
    g.save(); g.rotate(-Math.PI / 4);
    g.beginPath(); g.moveTo(-12, 0); g.lineTo(6, 0); g.lineCap = 'round';
    g.lineWidth = 5; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 2.8; g.strokeStyle = '#ffe27a'; g.stroke();
    g.beginPath(); g.moveTo(13, 0); g.lineTo(5, -5); g.lineTo(5, 5); g.closePath(); ink(g, '#fff4b8', 1.3);
    g.restore();
  },
  nova(g) {
    g.lineCap = 'round';
    for (const [w, c] of [[4.4, OUT], [2.2, '#bfe9ff']]) {
      g.lineWidth = w; g.strokeStyle = c;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU, cx = Math.cos(a), cy = Math.sin(a);
        g.beginPath(); g.moveTo(0, 0); g.lineTo(cx * 11, cy * 11);
        const bx = cx * 7, by = cy * 7;
        g.moveTo(bx, by); g.lineTo(bx + Math.cos(a + 0.8) * 3.5, by + Math.sin(a + 0.8) * 3.5);
        g.moveTo(bx, by); g.lineTo(bx + Math.cos(a - 0.8) * 3.5, by + Math.sin(a - 0.8) * 3.5);
        g.stroke();
      }
    }
    g.beginPath(); g.arc(0, 0, 2.6, 0, TAU); ink(g, '#ffffff', 1);
  },
  chain(g) {
    const pts = [[-9, 6], [-2, -6], [4, 4], [10, -7]];
    g.lineJoin = 'round';
    for (const [w, c] of [[5, OUT], [2.6, '#c9b6ff']]) {
      g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.lineWidth = w; g.strokeStyle = c; g.stroke();
    }
    for (const [x, y] of pts) { g.beginPath(); g.arc(x, y, 2.6, 0, TAU); ink(g, '#fff59a', 1.1); }
  },
  shadow(g) {
    g.beginPath(); g.arc(3, 0, 8, -Math.PI / 2, Math.PI / 2); g.quadraticCurveTo(-1, 0, 3, -8);
    ink(g, grad(g, -8, 8, '#a78bfa', '#4c1d95'), 1.5);
    g.lineCap = 'round';
    for (const [y, l] of [[-5, 8], [0, 11], [5, 8]]) {
      g.beginPath(); g.moveTo(-12, y); g.lineTo(-12 + l, y);
      g.lineWidth = 2; g.strokeStyle = 'rgba(167,139,250,.9)'; g.stroke();
    }
  },
  chest(g) { // treasure chest (Gudang sign)
    g.beginPath(); g.roundRect(-11, -2, 22, 12, 2); ink(g, grad(g, -2, 10, '#a0683a', '#5e3a1e'), 1.6);
    g.beginPath(); g.moveTo(-11, -2); g.lineTo(-11, -5); g.quadraticCurveTo(0, -13, 11, -5); g.lineTo(11, -2); g.closePath();
    ink(g, grad(g, -12, -2, '#c08048', '#7a4a26'), 1.6);
    g.fillStyle = '#d8b25a';
    for (const x of [-8, 6]) { g.fillRect(x, -9, 2.4, 19); }
    g.beginPath(); g.roundRect(-3, -4, 6, 7, 1.5); ink(g, '#ffd36b', 1.2);
    g.beginPath(); g.arc(0, -0.5, 1, 0, TAU); g.fillStyle = OUT; g.fill();
  },
  gem(g) { // faceted gem (Pedagang Bahan sign)
    g.beginPath(); g.moveTo(-10, -3); g.lineTo(-5, -9); g.lineTo(5, -9); g.lineTo(10, -3); g.lineTo(0, 10); g.closePath();
    ink(g, grad(g, -9, 10, '#9ff3ff', '#2f6fd6'), 1.6);
    g.beginPath(); g.moveTo(-10, -3); g.lineTo(10, -3); g.moveTo(-5, -9); g.lineTo(-3, -3); g.lineTo(0, 10); g.lineTo(3, -3); g.lineTo(5, -9);
    g.lineWidth = 1; g.strokeStyle = 'rgba(20,40,90,.55)'; g.stroke();
    shine(g, -4, -6, 2.4, 1.2, -0.5, 0.9);
  },
  fan(g) {
    for (const a of [-0.5, 0, 0.5]) {
      g.save(); g.rotate(a - Math.PI / 2); g.translate(0, -2);
      g.beginPath(); g.moveTo(0, -12); g.lineTo(2.2, -3); g.lineTo(-2.2, -3); g.closePath(); ink(g, '#e6ecf5', 1.1);
      g.beginPath(); g.roundRect(-1.4, -3, 2.8, 5, 1); ink(g, '#ff4d5e', 1);
      g.restore();
    }
  },
};
export const ICON_IDS = Object.keys(ICONS);

const WEAPON_ICON = { warrior: 'gearSword', archer: 'gearBow', mage: 'gearStaff', assassin: 'gearDagger' };
const SLOT_ICON = { helm: 'gearHelm', armor: 'gearArmor', boots: 'gearBoots', amulet: 'gearAmulet', ring: 'gearRing' };
export const gearIcon = (item) => (item.slot === 'weapon' ? WEAPON_ICON[item.classId] : SLOT_ICON[item.slot]);

// Accepts icon ids with or without the prototype "icon" prefix (iconEmber → ember).
export function drawIcon(g, id, size) {
  if (!id) return;
  const key = id.replace(/^icon/, '');
  const fn = ICONS[key] || ICONS[key.charAt(0).toLowerCase() + key.slice(1)];
  if (!fn) return;
  g.save();
  g.scale(size / 26, size / 26);
  g.lineJoin = 'round';
  fn(g);
  g.restore();
}

// A crisp <canvas> icon for the DOM (cssSize × cssSize).
export function iconCanvas(id, cssSize) {
  const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
  const c = document.createElement('canvas');
  c.width = c.height = Math.round(cssSize * dpr);
  c.style.width = c.style.height = `${cssSize}px`;
  const g = c.getContext('2d');
  g.translate(c.width / 2, c.height / 2);
  drawIcon(g, id, cssSize * dpr);
  return c;
}

// An enemy portrait for the DOM (bestiary), scaled to fit cssSize.
export function enemyCanvas(type, r, cssSize) {
  const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
  const c = document.createElement('canvas');
  c.width = c.height = Math.round(cssSize * dpr);
  c.style.width = c.style.height = `${cssSize}px`;
  const g = c.getContext('2d');
  g.translate(c.width / 2, c.height / 2);
  g.scale(c.width / (r * 3.4), c.width / (r * 3.4));
  g.lineJoin = 'round';
  ENEMY_ART[type](g, r);
  return c;
}

// ——— baking ———
// Each baked sprite: { img, ext } — img covers [-ext, ext] world units around the origin.
export const SPRITES = {};

function bake(draw, ext, scale, tint = null) {
  const c = document.createElement('canvas');
  c.width = c.height = Math.max(2, Math.ceil(ext * 2 * scale));
  const g = c.getContext('2d');
  g.translate(c.width / 2, c.height / 2);
  g.scale(scale, scale);
  g.lineJoin = 'round';
  draw(g);
  if (tint) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = tint; g.fillRect(0, 0, c.width, c.height);
  }
  return { img: c, ext };
}

// enemyRadius: { type: r } from data/enemies.js
export function bakeAll(scale, enemyRadius) {
  for (const [type, r] of Object.entries(enemyRadius)) {
    const draw = (g) => ENEMY_ART[type](g, r);
    const ext = r * 1.6;
    SPRITES[type] = bake(draw, ext, scale);
    SPRITES[`${type}Flash`] = bake(draw, ext, scale, 'rgba(255,255,255,.75)');
    SPRITES[`${type}Frozen`] = bake(draw, ext, scale, 'rgba(120,205,255,.55)');
  }
  for (const [id, draw] of Object.entries(PICKUP_ART)) SPRITES[id] = bake(draw, 11, scale);
  for (const [id, draw] of Object.entries(DECOR_ART)) SPRITES[id] = bake(draw, 13, scale);
}

// Draws a baked sprite centred at (x, y) in the current (world) transform.
export function drawBaked(g, s, x, y, sx = 1, sy = sx, flip = false) {
  const w = s.ext * 2;
  g.save();
  g.translate(x, y);
  g.scale(flip ? -sx : sx, sy);
  g.drawImage(s.img, -s.ext, -s.ext, w, w);
  g.restore();
}
