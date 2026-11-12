// What the Job Lanjutan skills paint (spec §48): one drawing per skill id, merged into the SKILL
// table of render/skillfx.js, and the hero's look under a branch buff. In 2.5D this is the ground
// layer (render3d/actors.js decal) — the upright part lives in render3d/branch3d.js.
// draw(g, h, k, p, t): k = life left 1 → 0, p = 1 − k, t = clock (s).
import { PALETTES } from '../data/fx.js';
import { BRANCH_FX as B } from '../data/branchfx.js';
import { glow, star4 } from './fxkit.js';

const TAU = Math.PI * 2;
const OUT = '#1a1226';
const BL = PALETTES.blood, H = PALETTES.holy;

// ---- shapes -------------------------------------------------------------------------------
function disc(g, x, y, r, inner, outer) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, inner); gr.addColorStop(1, outer);
  g.beginPath(); g.ellipse(x, y, r, r * 0.8, 0, 0, TAU); g.fillStyle = gr; g.fill();
}
function oval(g, x, y, r, w, col) { g.beginPath(); g.ellipse(x, y, r, r * 0.8, 0, 0, TAU); g.lineWidth = w; g.strokeStyle = col; g.stroke(); }
// a rim of jagged teeth (blood) or ticks (holy) turning with `rot`
function teeth(g, x, y, r, n, len, rot, col, w = 2) {
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * TAU, c = Math.cos(a), s = Math.sin(a) * 0.8;
    g.moveTo(x + c * r, y + s * r); g.lineTo(x + c * (r + len), y + s * (r + len));
  }
  g.lineWidth = w; g.lineCap = 'round'; g.strokeStyle = col; g.stroke();
}
// a cross of light lying on the ground
function cross(g, x, y, s, col) {
  g.beginPath(); g.moveTo(x, y - s); g.lineTo(x, y + s * 0.8); g.moveTo(x - s * 0.6, y - s * 0.25); g.lineTo(x + s * 0.6, y - s * 0.25);
  g.lineWidth = Math.max(1.5, s * 0.28); g.lineCap = 'round'; g.strokeStyle = col; g.stroke();
}
// spiral arms dragging into the centre (the pull)
function arms(g, x, y, r, rot, n, col, w) {
  g.lineCap = 'round'; g.lineWidth = w; g.strokeStyle = col;
  for (let i = 0; i < n; i++) {
    const a0 = rot + (i * TAU) / n;
    g.beginPath();
    for (let s = 0; s <= 14; s++) {
      const q = s / 14, a = a0 + q * 3, d = r * (1 - q * 0.9);
      if (s) g.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8); else g.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8);
    }
    g.stroke();
  }
}
// a big spectral axe lying flat, blade outward, at angle a around (x, y)
function ghostAxe(g, x, y, R, a, s) {
  g.save();
  g.translate(x + Math.cos(a) * R, y + Math.sin(a) * R * 0.8); g.rotate(a + Math.PI / 2); g.scale(s, s);
  g.globalCompositeOperation = 'lighter';
  glow(g, 0, -6, 26, BL[2]);
  g.globalCompositeOperation = 'source-over';
  g.beginPath(); g.moveTo(-1.6, 18); g.lineTo(-1.6, -20); g.lineTo(1.6, -20); g.lineTo(1.6, 18); g.closePath();
  g.fillStyle = '#4a1a1a'; g.fill();
  for (const sd of [-1, 1]) {
    g.beginPath(); g.moveTo(sd * 1.6, -18); g.quadraticCurveTo(sd * 16, -22, sd * 17, -6); g.quadraticCurveTo(sd * 10, -8, sd * 1.6, -4); g.closePath();
    g.fillStyle = 'rgba(255,214,214,.9)'; g.fill(); g.lineWidth = 1.2; g.strokeStyle = BL[2]; g.stroke();
  }
  g.restore();
}
// jagged crackle of light between two points, fixed per `seed` so it does not flicker every frame
function zig(g, x1, y1, x2, y2, seed, col, w) {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1, nx = -(y2 - y1) / len, ny = (x2 - x1) / len;
  g.beginPath(); g.moveTo(x1, y1);
  for (let i = 1; i < 6; i++) {
    const q = i / 6, j = Math.sin(seed * 12.9 + i * 78.2) * 9;
    g.lineTo(x1 + (x2 - x1) * q + nx * j, y1 + (y2 - y1) * q + ny * j);
  }
  g.lineTo(x2, y2); g.lineWidth = w; g.strokeStyle = col; g.stroke();
}

// ---- the skills ---------------------------------------------------------------------------
export const BRANCH_SKILL = {
  // Berserker
  rageleap(g, h, k, p, t) {
    if (h.fx === 'shout') return bloodWave(g, h, k, p);
    g.globalAlpha = Math.min(1, k * 3);
    disc(g, h.x, h.y + 4, h.r * 1.6, 'rgba(194,31,58,.35)', 'rgba(92,10,24,0)');
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) { // claw arcs whirling round the leaping warrior
      const a = -t * 22 + (i * TAU) / 3;
      g.beginPath(); g.arc(h.x, h.y, h.r * 1.4, a, a + 1.3);
      g.lineWidth = 5; g.lineCap = 'round'; g.strokeStyle = BL[2]; g.stroke();
      g.lineWidth = 2; g.strokeStyle = BL[0]; g.stroke();
    }
  },
  bloodrage(g, h, k, p) { if (h.fx === 'shout') bloodWave(g, h, k, p); },
  ragnarok(g, h, k, p, t) {
    const age = h.fxAge || 0, a = Math.min(1, k * 6, age * 5), r = h.r;
    g.globalAlpha = a;
    disc(g, h.x, h.y, r * 1.15, 'rgba(60,0,10,.75)', 'rgba(92,10,24,0)'); // a pool of dark blood
    g.globalCompositeOperation = 'lighter';
    arms(g, h.x, h.y, r * 1.1, -t * 7, 6, 'rgba(255,90,110,.55)', 4);
    arms(g, h.x, h.y, r * 0.9, -t * 9 + 0.5, 6, 'rgba(255,214,214,.35)', 1.6);
    oval(g, h.x, h.y, r, 3, BL[1]);
    teeth(g, h.x, h.y, r, 28, 9, t * 2, BL[2], 2.4);
    oval(g, h.x, h.y, r * 0.55, 2, 'rgba(255,90,110,.6)');
    for (let i = 0; i < B.ragnarok.bolts; i++) { // red lightning leaping across the storm
      const s = Math.floor(t * 12) + i * 7, q1 = s * 2.3, q2 = q1 + 2 + Math.sin(s) * 1.2;
      g.globalAlpha = a * (0.4 + 0.6 * ((s * 0.37) % 1));
      zig(g, h.x + Math.cos(q1) * r * 0.9, h.y + Math.sin(q1) * r * 0.72, h.x + Math.cos(q2) * r * 0.5, h.y + Math.sin(q2) * r * 0.4, s, '#ff8a9a', 2);
    }
    g.globalAlpha = a;
    const beat = 0.8 + 0.2 * Math.sin(t * 18);
    glow(g, h.x, h.y, r * 0.5 * beat, BL[1]);
    glow(g, h.x, h.y, r * 0.22 * beat, '#ffffff');
    g.globalCompositeOperation = 'source-over';
    for (let i = 0; i < B.ragnarok.axes; i++) ghostAxe(g, h.x, h.y, r * 0.78, t * 8 + (i * TAU) / B.ragnarok.axes, 1.15);
  },
  // Paladin
  holyguard(g, h, k, p) { if (h.fx === 'shout') holyWave(g, h, k, p); },
  judgment(g, h, k, p, t) {
    const age = h.fxAge || 0, slam = Math.min(1, age / 0.08), r = h.r;
    g.globalAlpha = Math.min(1, k * 2.5);
    disc(g, h.x, h.y, r * 1.3, 'rgba(255,243,196,.55)', 'rgba(255,209,102,0)');
    g.globalCompositeOperation = 'lighter';
    oval(g, h.x, h.y, r * (0.4 + 0.6 * slam), 4, H[2]);
    oval(g, h.x, h.y, r * 0.82, 1.5, H[1]);
    teeth(g, h.x, h.y, r * 0.86, 24, 6, t * 1.2, H[1], 1.6);
    for (let i = 0; i < 12; i++) { // rays of light thrown out across the ground
      const a = (i / 12) * TAU + 0.13, len = r * (1.1 + 0.5 * p) * (i % 2 ? 0.8 : 1.2);
      g.beginPath(); g.moveTo(h.x + Math.cos(a) * r * 0.3, h.y + Math.sin(a) * r * 0.24); g.lineTo(h.x + Math.cos(a) * len, h.y + Math.sin(a) * len * 0.8);
      g.lineWidth = 3 * k + 1; g.strokeStyle = 'rgba(255,243,196,.7)'; g.stroke();
    }
    glow(g, h.x, h.y, r * 0.8 * (1.2 - p * 0.6), H[2]);
    g.globalCompositeOperation = 'source-over';
    g.save(); g.translate(h.x, h.y); g.scale(1, 0.8); // the hammer's square print, burning gold
    g.beginPath(); g.rect(-r * 0.32, -r * 0.2, r * 0.64, r * 0.4); g.fillStyle = 'rgba(40,24,6,.55)'; g.fill();
    g.lineWidth = 3; g.strokeStyle = H[2]; g.stroke();
    g.restore();
    g.globalCompositeOperation = 'lighter';
    cross(g, h.x, h.y - 2, r * 0.22, '#fffbe8');
  },
  sanctuary(g, h, k, p, t) {
    const age = h.fxAge || 0, a = Math.min(1, k * 5, age * 4), r = h.r * Math.min(1, 0.4 + age * 3);
    g.globalAlpha = a;
    disc(g, h.x, h.y, r * 1.05, 'rgba(255,243,196,.35)', 'rgba(255,209,102,.04)');
    g.globalCompositeOperation = 'lighter';
    oval(g, h.x, h.y, r, 3.5, H[2]);
    oval(g, h.x, h.y, r * 0.9, 1.4, H[1]);
    teeth(g, h.x, h.y, r * 0.9, 36, r * 0.08, t * 0.6, 'rgba(255,209,102,.8)', 1.4);
    oval(g, h.x, h.y, r * 0.55, 2, H[1]);
    g.save(); g.translate(h.x, h.y); g.scale(1, 0.8); g.rotate(-t * 0.5); // a six-pointed star inside
    g.beginPath();
    for (const off of [0, Math.PI]) for (let i = 0; i <= 3; i++) { const q = off + (i / 3) * TAU - Math.PI / 2; if (i) g.lineTo(Math.cos(q) * r * 0.55, Math.sin(q) * r * 0.55); else g.moveTo(Math.cos(q) * r * 0.55, Math.sin(q) * r * 0.55); }
    g.lineWidth = 1.6; g.strokeStyle = 'rgba(255,243,196,.75)'; g.stroke();
    g.restore();
    const n = B.sanctuary.crosses;
    for (let i = 0; i < n; i++) { // crosses wheeling round the rim
      const q = t * 0.6 + (i / n) * TAU;
      cross(g, h.x + Math.cos(q) * r * 0.74, h.y + Math.sin(q) * r * 0.74 * 0.8, 7, '#fff6d0');
    }
    for (let i = 0; i < B.sanctuary.columns; i++) { // bright feet of the columns of light (3D)
      const q = (i / B.sanctuary.columns) * TAU + t * 0.4;
      glow(g, h.x + Math.cos(q) * r, h.y + Math.sin(q) * r * 0.8, 16 + 4 * Math.sin(t * 6 + i), H[2]);
    }
    const beat = 0.85 + 0.15 * Math.sin(t * 5);
    glow(g, h.x, h.y, r * 0.45 * beat, H[1]);
  },
};

function bloodWave(g, h, k, p) {
  const rr = h.r * (0.25 + 0.85 * Math.min(1, p * 2.2));
  g.globalAlpha = k;
  disc(g, h.x, h.y, rr, 'rgba(92,10,24,.1)', 'rgba(194,31,58,.4)');
  g.globalCompositeOperation = 'lighter';
  oval(g, h.x, h.y, rr, 6 * k + 1, BL[1]);
  teeth(g, h.x, h.y, rr, 20, 10 * k, 0.3, BL[2], 2.5);
}
function holyWave(g, h, k, p) {
  const rr = h.r * (0.25 + 0.85 * Math.min(1, p * 2.2));
  g.globalAlpha = k;
  disc(g, h.x, h.y, rr, 'rgba(255,243,196,.05)', 'rgba(255,209,102,.35)');
  g.globalCompositeOperation = 'lighter';
  oval(g, h.x, h.y, rr, 6 * k + 1, H[2]);
  oval(g, h.x, h.y, rr * 0.8, 2, '#ffffff');
}

// ---- the hero under a branch buff ------------------------------------------------------------
// (g, x, y, t, age, fade, game): x, y the hero (a little above the feet), age since the cast
export const BRANCH_AURA = {
  bloodrage(g, x, y, t, age) {
    const beat = 0.5 + 0.5 * Math.sin(t * 9), fy = y + 14;
    disc(g, x, fy, 44 + beat * 6, 'rgba(194,31,58,.55)', 'rgba(92,10,24,0)'); // blood boiling under the feet
    g.globalCompositeOperation = 'lighter';
    teeth(g, x, fy, 26 + beat * 3, 14, 10 + beat * 6, -t * 3, BL[2], 2.6);
    oval(g, x, fy, 24, 2, BL[1]);
    for (let i = 0; i < 5; i++) { // veins pulsing outward
      const a = i * 1.257 + 0.4, len = 30 + 16 * ((t * 1.6 + i * 0.3) % 1);
      g.beginPath(); g.moveTo(x + Math.cos(a) * 20, fy + Math.sin(a) * 16);
      g.quadraticCurveTo(x + Math.cos(a + 0.3) * len * 0.7, fy + Math.sin(a + 0.3) * len * 0.55, x + Math.cos(a) * len, fy + Math.sin(a) * len * 0.8);
      g.lineWidth = 2; g.strokeStyle = 'rgba(255,90,110,.6)'; g.stroke();
    }
    glow(g, x, y, 34 + beat * 6, BL[2]);
    if (age < 0.6) { g.globalAlpha *= 1 - age / 0.6; glow(g, x, y, 90 * (0.4 + age), BL[1]); }
  },
  holyguard(g, x, y, t, age, fade, game) {
    const hurt = game.flash > 0, fy = y + 12;
    disc(g, x, fy, 40, 'rgba(255,243,196,.4)', 'rgba(255,209,102,0)');
    g.globalCompositeOperation = 'lighter';
    oval(g, x, fy, 32, 2.4, hurt ? '#ffffff' : H[2]);
    teeth(g, x, fy, 32, 24, 5, t * 1.5, 'rgba(255,243,196,.8)', 1.4);
    for (let i = 0; i < 4; i++) { const q = t * 1.8 + (i * TAU) / 4; cross(g, x + Math.cos(q) * 40, fy + Math.sin(q) * 32, 6, '#fff6d0'); }
    g.globalAlpha *= 0.55 + (hurt ? 0.45 : 0.1 * Math.sin(t * 4)); // the dome of light round the body
    g.beginPath(); g.ellipse(x, y - 6, 26, 32, 0, 0, TAU); g.lineWidth = hurt ? 3 : 1.6; g.strokeStyle = hurt ? '#ffffff' : H[1]; g.stroke();
    glow(g, x, y - 6, 34, H[2]);
    if (age < 0.5) star4(g, x, y - 34, 10 * (1 - age * 2) + 4, t * 3, '#fff6d0');
  },
};
