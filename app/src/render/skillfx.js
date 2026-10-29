// Shapes of attacks and skills (plan "Efek Lebay" §B, §C), one per skill id
// (hit.sid, tagged by run/skillfx.js) — basic attacks go by hit.fx. Particles
// come from run/skillfx.js; this file draws the solid shapes over them.
//   drawHit        — one live attack instance
//   drawUltTint    — the screen colour while an ultimate rages
//   drawBuffAura   — the player's look while a buff skill runs
//   drawEnemyMarks — ice crystals / dizzy stars / vines on struck enemies
import { PALETTES } from '../data/fx.js';
import { ECHO_RARITY, ECHO_EVERY, RAINBOW_RARITY, RAINBOW, ULT_TINT } from '../data/skillfx.js';
import { RARITIES } from '../data/items.js';
import { CLASSES } from '../data/classes.js';
import { glow, star4 } from './fxkit.js';

const TAU = Math.PI * 2;
const OUT = '#1a1226';
const F = PALETTES.fire, I = PALETTES.ice, H = PALETTES.holy, S = PALETTES.shadow, L = PALETTES.lightning, PO = PALETTES.poison, B = PALETTES.blood;
const VOLLEY = ['#ff6b8b', '#ffd166', '#6ee7a0', '#6ec9ff', '#c26bd8'];
let basicCount = 0;

const weaponRarity = (avatar) => avatar?.look?.gear?.weapon?.rarity ?? 0;
// weapon colour; Mythic cycles through the rainbow
function weaponCol(wr, t, shift = 0) {
  if (wr >= RAINBOW_RARITY) return RAINBOW[Math.floor(t * 8 + shift) % RAINBOW.length];
  return wr >= 1 ? RARITIES[wr].color : '#ffffff';
}

export function drawHit(g, h, avatar, t) {
  if (h.delay > 0) { // not born yet (run/skillfx.js shows the build-up)
    if (h.hover) floatingBlade(g, h, t);
    return;
  }
  const k = h.kind === 'proj' ? 1 : Math.max(0, h.life / h.maxLife);
  const wr = weaponRarity(avatar);
  if (!h.sid && !h.seen && BASIC[h.fx]) { // Legendary+: every 3rd basic attack leaves an echo
    h.seen = true;
    if (wr >= ECHO_RARITY && ++basicCount % ECHO_EVERY === 0) h.echo = true;
  }
  const draw = (h.part && PART[h.sid]?.[h.part]) || (h.sid && SKILL[h.sid]) || BASIC[h.fx] || FALLBACK[h.fx];
  if (!draw) return;
  g.save();
  draw(g, h, k, 1 - k, t, wr);
  g.restore();
}

// basic attacks (§B)
const BASIC = {
  slash(g, h, k, p, t, wr) {
    if (h.echo) { g.save(); g.globalAlpha = 0.35; slashArc(g, h, Math.max(0, p - 0.12), t, wr, 1.18); g.restore(); }
    slashArc(g, h, p, t, wr, 1);
  },
  stab(g, h, k, p, t, wr) {
    g.translate(h.x, h.y); g.rotate(h.angle);
    const reach = h.r * (0.55 + 0.45 * Math.min(1, p * 3)) + 8, col = weaponCol(wr, t);
    g.globalAlpha = Math.min(1, k * 1.8);
    for (const tilt of [-0.16, 0.16]) { // twin crossed thrusts
      g.save(); g.rotate(tilt);
      g.beginPath(); g.moveTo(6, -6); g.quadraticCurveTo(reach * 0.6, -3.5, reach, 0); g.quadraticCurveTo(reach * 0.6, 3.5, 6, 6); g.closePath();
      const gr = g.createLinearGradient(6, 0, reach, 0);
      gr.addColorStop(0, 'rgba(106,47,184,0)'); gr.addColorStop(0.5, 'rgba(176,107,255,.65)'); gr.addColorStop(1, '#ffffff');
      g.fillStyle = gr; g.fill();
      g.globalCompositeOperation = 'lighter';
      g.beginPath(); g.moveTo(10, 0); g.lineTo(reach + 2, 0);
      g.lineWidth = 1.8; g.lineCap = 'round'; g.strokeStyle = col; g.stroke();
      g.restore();
    }
    if (p > 0.25) { // purple X flash at the tip
      g.globalCompositeOperation = 'lighter';
      const s = 7 * Math.min(1, (p - 0.25) * 4);
      g.lineWidth = 2.4; g.lineCap = 'round'; g.strokeStyle = S[1];
      g.beginPath(); g.moveTo(reach - s, -s); g.lineTo(reach + s, s); g.moveTo(reach - s, s); g.lineTo(reach + s, -s); g.stroke();
      glow(g, reach, 0, 10, S[2]);
    }
  },
  arrow(g, h, k, p, t, wr) {
    if (h.echo) { g.save(); g.globalAlpha = 0.35; arrowShape(g, h.x - Math.cos(h.angle) * 14, h.y - Math.sin(h.angle) * 14, h.angle, weaponCol(wr, t, 1), 1.1); g.restore(); }
    ribbon(g, h, 46, weaponCol(wr, t), 2.4, wr >= RAINBOW_RARITY);
    arrowShape(g, h.x, h.y, h.angle, weaponCol(wr, t), 1);
  },
  fireball(g, h, k, p, t) {
    fireOrb(g, h.x, h.y, h.r * 1.1, h.angle, t);
  },
  boom(g, h, k, p) { // the projectile's explosion: a white-hot flash shrinking into embers
    const big = h.sid === 'inferno', rr = h.r * (0.4 + 0.6 * Math.min(1, p * 3));
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = k;
    glow(g, h.x, h.y, rr * (big ? 1.6 : 1.3), F[2]);
    glow(g, h.x, h.y, rr * 0.7 * k, F[1]);
  },
};

function slashArc(g, h, p, t, wr, scale) {
  const a0 = h.angle - h.arc / 2, sweep = h.arc * Math.min(1, p * 2.4), r = h.r * scale;
  const col = weaponCol(wr, t);
  g.globalAlpha *= Math.min(1, (1 - p) * 1.6);
  g.lineCap = 'round';
  // three layers: dark edge, weapon colour, white core
  g.beginPath(); g.arc(h.x, h.y, r, a0, a0 + sweep);
  g.lineWidth = 11; g.strokeStyle = 'rgba(20,12,30,.55)'; g.stroke();
  g.beginPath(); g.arc(h.x, h.y, r + 2, a0, a0 + sweep); g.arc(h.x, h.y, r * 0.35, a0 + sweep, a0, true); g.closePath();
  const gr = g.createRadialGradient(h.x, h.y, r * 0.35, h.x, h.y, r + 2);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, col);
  g.globalAlpha *= 0.8; g.fillStyle = gr; g.fill(); g.globalAlpha /= 0.8;
  g.globalCompositeOperation = 'lighter';
  if (wr >= RAINBOW_RARITY) { // flowing red-gold-purple
    const n = 6, seg = sweep / n;
    for (let i = 0; i < n; i++) {
      g.beginPath(); g.arc(h.x, h.y, r, a0 + seg * i, a0 + seg * (i + 1));
      g.lineWidth = 7; g.strokeStyle = RAINBOW[(i + Math.floor(t * 10)) % RAINBOW.length]; g.stroke();
    }
  } else {
    g.beginPath(); g.arc(h.x, h.y, r, a0, a0 + sweep);
    g.lineWidth = 7; g.strokeStyle = col; g.globalAlpha *= 0.6; g.stroke(); g.globalAlpha /= 0.6;
  }
  g.beginPath(); g.arc(h.x, h.y, r, a0, a0 + sweep);
  g.lineWidth = 3; g.strokeStyle = '#fff'; g.stroke();
  const tip = a0 + sweep; // glint at the leading edge
  glow(g, h.x + Math.cos(tip) * r, h.y + Math.sin(tip) * r, 9, col);
  g.globalCompositeOperation = 'source-over';
}

function arrowShape(g, x, y, a, glowCol, s) {
  g.save();
  g.translate(x, y); g.rotate(a); g.scale(s, s);
  g.globalCompositeOperation = 'lighter';
  glow(g, 4, 0, 9, glowCol);
  g.globalCompositeOperation = 'source-over';
  g.beginPath(); g.moveTo(-9, 0); g.lineTo(5, 0);
  g.lineWidth = 2.6; g.strokeStyle = OUT; g.stroke();
  g.lineWidth = 1.4; g.strokeStyle = '#c8874e'; g.stroke();
  g.beginPath(); g.moveTo(10, 0); g.lineTo(3, -3.4); g.lineTo(3, 3.4); g.closePath();
  g.fillStyle = '#f4f8ff'; g.fill(); g.lineWidth = 1; g.strokeStyle = OUT; g.stroke();
  g.fillStyle = glowCol;
  g.beginPath(); g.moveTo(-9, 0); g.lineTo(-13, -3.5); g.lineTo(-7, 0); g.lineTo(-13, 3.5); g.closePath(); g.fill();
  g.restore();
}

// tapered streak behind a projectile
function ribbon(g, h, len, col, w, rainbow) {
  g.save();
  g.translate(h.x, h.y); g.rotate(h.angle);
  g.globalCompositeOperation = 'lighter';
  const gr = g.createLinearGradient(-len, 0, 0, 0);
  if (rainbow) RAINBOW.forEach((c, i) => gr.addColorStop(i / (RAINBOW.length - 1), c));
  else { gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, col); }
  g.beginPath(); g.moveTo(-len, 0); g.quadraticCurveTo(-len / 2, -w * 1.2, 0, -w); g.lineTo(0, w); g.quadraticCurveTo(-len / 2, w * 1.2, -len, 0);
  g.globalAlpha = rainbow ? 0.75 : 0.9;
  g.fillStyle = gr; g.fill();
  g.restore();
}

// fireball: glow, licking flame tongues trailing behind, white core
function fireOrb(g, x, y, r, a, t, tongues = 3) {
  g.save();
  g.globalCompositeOperation = 'lighter';
  glow(g, x, y, r * 3.2, F[3]);
  glow(g, x, y, r * 2.2, F[2]);
  g.translate(x, y); g.rotate(a);
  for (let i = 0; i < tongues; i++) {
    const w = Math.sin(t * 22 + i * 2.1) * r * 0.35, len = r * (2.2 + 0.5 * Math.sin(t * 15 + i));
    g.beginPath(); g.moveTo(r * 0.3, -r * 0.8);
    g.quadraticCurveTo(-len * 0.5, -r * 0.6 + w, -len, w * 0.6);
    g.quadraticCurveTo(-len * 0.5, r * 0.6 + w, r * 0.3, r * 0.8);
    g.closePath();
    g.fillStyle = i % 2 ? F[2] : F[1]; g.globalAlpha = 0.55; g.fill();
  }
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  g.beginPath(); g.arc(0, 0, r * 0.95, 0, TAU); g.fillStyle = F[1]; g.fill();
  g.beginPath(); g.arc(r * 0.15, 0, r * 0.6, 0, TAU); g.fillStyle = '#ffffff'; g.fill();
  g.restore();
}

// skills (§C)
const SKILL = {
  // warrior
  spin(g, h, k, p, t) {
    g.globalAlpha = Math.min(1, k * 4);
    floorGlow(g, h.x, h.y + 4, h.r, 'rgba(255,154,60,.14)');
    vortex(g, h.x, h.y, h.r, t, 'rgba(160,130,100,.5)', 3);
    blades(g, h.x, h.y, h.r, t * 16, 3, 1.1, [F[0], F[1], F[2]]);
  },
  bladestorm(g, h, k, p, t) {
    g.globalAlpha = Math.min(1, k * 6);
    floorGlow(g, h.x, h.y + 4, h.r * 1.1, 'rgba(255,80,40,.16)');
    vortex(g, h.x, h.y, h.r * 1.1, t * 1.4, 'rgba(255,150,80,.45)', 5);
    blades(g, h.x, h.y, h.r, t * 11, 3, 0.9, [F[0], F[1], F[2]]);
    for (let i = 0; i < 6; i++) bigBlade(g, h.x, h.y, h.r * 0.95, -t * 7 + (i * TAU) / 6);
  },
  shout(g, h, k, p) {
    const rr = h.r * (0.2 + 0.8 * Math.min(1, p * 2));
    g.globalAlpha = k;
    g.beginPath(); g.arc(h.x, h.y, rr, 0, TAU);
    g.fillStyle = 'rgba(255,214,120,.18)'; g.fill();
    g.lineWidth = 6 * k + 1; g.strokeStyle = H[2]; g.stroke();
    g.lineWidth = 2; g.strokeStyle = '#fff'; g.stroke();
  },
  quake(g, h, k, p) { // one pillar of the Fissure: rock and fire punching out of the ground
    const age = h.fxAge || 0, up = 1 - (1 - Math.min(1, age * 10)) ** 3; // erupts fast, then settles
    const ht = h.r * 1.9 * up * (1 - p * 0.3), w = h.r * 0.62 * (0.8 + 0.2 * up);
    g.globalAlpha = Math.min(1, k * 3);
    floorGlow(g, h.x, h.y + 4, h.r * 1.1, 'rgba(255,154,60,.28)');
    g.beginPath(); g.ellipse(h.x, h.y + 4, h.r * (0.6 + 0.5 * up), h.r * 0.45, 0, 0, TAU);
    g.lineWidth = 6 * k + 1; g.strokeStyle = 'rgba(160,120,80,.75)'; g.stroke();
    g.beginPath(); g.moveTo(h.x - w, h.y + 4); // jagged rock column
    for (let i = 0; i <= 6; i++) {
      const f = i / 6, jag = (i % 2 ? 0.82 : 1) * (0.75 + 0.25 * Math.sin(h.x * 0.13 + i * 2.1));
      g.lineTo(h.x - w * (1 - f * 0.55) + (i % 2 ? w * 0.12 : 0), h.y + 4 - ht * f * jag);
    }
    for (let i = 6; i >= 0; i--) {
      const f = i / 6, jag = (i % 2 ? 1 : 0.84) * (0.75 + 0.25 * Math.sin(h.y * 0.11 + i * 1.7));
      g.lineTo(h.x + w * (1 - f * 0.55) - (i % 2 ? w * 0.12 : 0), h.y + 4 - ht * f * jag);
    }
    g.lineTo(h.x + w, h.y + 4); g.closePath();
    const gr = g.createLinearGradient(0, h.y + 4, 0, h.y + 4 - ht - 1);
    gr.addColorStop(0, '#4a3524'); gr.addColorStop(0.5, '#7a5a3a'); gr.addColorStop(1, '#a07850');
    g.fillStyle = gr; g.fill(); g.lineWidth = 1.6; g.strokeStyle = OUT; g.stroke();
    g.globalCompositeOperation = 'lighter'; // fire glowing through the seams, flaring at the top
    g.beginPath(); g.moveTo(h.x, h.y + 2); g.lineTo(h.x + Math.sin(age * 30) * 3, h.y - ht * 0.55); g.lineTo(h.x, h.y - ht * 0.95);
    g.lineWidth = 3; g.lineCap = 'round'; g.strokeStyle = F[2]; g.stroke();
    glow(g, h.x, h.y - ht * 0.95, h.r * 0.9 * k, F[2]);
    glow(g, h.x, h.y + 2, h.r * 0.8, F[3]);
    g.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 5; i++) { // chunks thrown up
      const d = (i - 2) * 0.45, tt = Math.min(1, age * 2.2), cx = h.x + d * h.r * 1.4 * tt, cy = h.y - (Math.sin(tt * Math.PI) * h.r * 1.6) + 4 * tt;
      g.beginPath(); g.moveTo(cx - 3, cy); g.lineTo(cx, cy - 4); g.lineTo(cx + 3.5, cy + 1); g.closePath();
      g.fillStyle = '#7a5a3a'; g.fill(); g.lineWidth = 1; g.strokeStyle = OUT; g.stroke();
    }
  },
  axe(g, h, k, p, t) {
    const spin = (h.fxAge || 0) * 24;
    g.translate(h.x, h.y);
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.5; glow(g, 0, 0, h.r * 2.2, PALETTES.steel[2]);
    g.globalAlpha = 0.6; // spiral streaks behind
    g.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      g.beginPath(); g.arc(0, 0, h.r * (1.1 + i * 0.25), spin + i * 2, spin + i * 2 + 1.6);
      g.lineWidth = 2.5 - i * 0.6; g.strokeStyle = i ? PALETTES.steel[1] : '#fff'; g.stroke();
    }
    if (h.returning) { // the pull: a ring tightening round the axe as it drags things home
      g.globalAlpha = 0.5; g.lineWidth = 2; g.strokeStyle = PALETTES.steel[1];
      g.beginPath(); g.arc(0, 0, h.r * (2.6 - ((h.fxAge || 0) * 4) % 1), 0, TAU); g.stroke();
    }
    g.globalCompositeOperation = 'source-over';
    for (let i = 3; i >= 0; i--) { // motion afterimages, then the solid axe
      g.save(); g.globalAlpha = i ? 0.16 : 1; g.rotate(spin - i * 0.5);
      g.beginPath(); g.moveTo(-h.r, 0); g.lineTo(h.r * 0.9, 0); g.lineWidth = 3.2; g.strokeStyle = OUT; g.stroke();
      g.lineWidth = 1.8; g.strokeStyle = '#8a5a34'; g.stroke();
      for (const sd of [-1, 1]) { // double blade
        g.beginPath(); g.moveTo(h.r * 0.45, 0); g.quadraticCurveTo(h.r * 0.6, sd * h.r * 0.95, h.r * 1.15, sd * h.r * 0.8);
        g.quadraticCurveTo(h.r * 0.95, sd * h.r * 0.3, h.r * 0.75, 0); g.closePath();
        g.fillStyle = '#e6eef8'; g.fill(); g.lineWidth = 1.2; g.strokeStyle = OUT; g.stroke();
      }
      g.restore();
    }
  },
  // archer
  rain(g, h, k, p, t) {
    const a = Math.min(1, k * 5);
    g.globalAlpha = a;
    runeCircle(g, h.x, h.y, h.r, t, H[2], 6);
    stuckArrows(g, h, 14);
    for (let i = 0; i < 16; i++) { // slanted glowing arrows dropping on a loop
      const fx = Math.sin(i * 12.99) * 0.8, fy = Math.cos(i * 78.23) * 0.8, ph = (t * 3.4 + i * 0.37) % 1;
      const x = h.x + fx * h.r - (1 - ph) * 22, y = h.y + fy * h.r - (1 - ph) * 50;
      g.globalAlpha = a * (1 - ph * 0.5);
      fallingArrow(g, x, y, 1.15, H[1]);
    }
  },
  pierce(g, h, k, p, t) { // Dragon Arrow: a serpent of light weaving behind the arrowhead
    const age = h.fxAge || 0, sc = h.r / 14;
    g.translate(h.x, h.y); g.rotate(h.angle);
    g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
    for (let s2 = 0; s2 < 2; s2++) { // two strands, half a wave apart, thinning to nothing
      for (let pass = 0; pass < 2; pass++) {
        g.beginPath();
        for (let i = 0; i <= 16; i++) {
          const f = i / 16, x = -4 - f * 120, y = Math.sin(age * 16 - f * 7 + s2 * Math.PI) * (4 + f * 14) * sc;
          if (i) g.lineTo(x, y); else g.moveTo(x, y);
        }
        g.globalAlpha = pass ? 0.9 : 0.35; g.lineWidth = (pass ? 2.4 : 7) * sc; g.strokeStyle = pass ? '#fff6d0' : H[2]; g.stroke();
      }
    }
    for (let i = 0; i < 2; i++) { // cone-shaped air waves peeling off behind
      const ph = (age * 5 + i * 0.5) % 1;
      g.globalAlpha = 0.5 * (1 - ph);
      g.beginPath(); g.arc(-10 - ph * 40, 0, (10 + ph * 22) * sc, -0.9, 0.9);
      g.lineWidth = 2; g.strokeStyle = H[1]; g.stroke();
    }
    g.globalAlpha = 1;
    glow(g, 10, 0, 26 * sc, H[2]);
    g.globalCompositeOperation = 'source-over';
    g.beginPath(); g.moveTo(-16 * sc, 0); g.lineTo(10 * sc, 0); // the shaft
    g.lineWidth = 5 * sc; g.strokeStyle = OUT; g.stroke();
    g.lineWidth = 3 * sc; g.strokeStyle = H[2]; g.stroke();
    g.beginPath(); g.moveTo(24 * sc, 0); g.lineTo(8 * sc, -8 * sc); g.lineTo(11 * sc, 0); g.lineTo(8 * sc, 8 * sc); g.closePath(); // dragon-head tip
    g.fillStyle = '#fff6d0'; g.fill(); g.lineWidth = 1.2; g.strokeStyle = OUT; g.stroke();
    g.beginPath(); g.arc(13 * sc, -2 * sc, 1.3 * sc, 0, TAU); g.fillStyle = '#c2321f'; g.fill(); // eye
  },
  volley(g, h, k, p, t) {
    const col = VOLLEY[Math.abs(Math.round(h.angle * 57)) % VOLLEY.length];
    ribbon(g, h, 52, col, 2.6, false);
    arrowShape(g, h.x, h.y, h.angle, col, 1.1);
  },
  leap(g, h, k, p) { // ice burst left behind
    novaShape(g, h, k, p, 0.8);
  },
  trap(g, h, k, p, t) {
    const age = h.fxAge || 0;
    g.globalAlpha = Math.min(1, k * 5, age * 6);
    g.beginPath(); g.arc(h.x, h.y, h.r, 0, TAU);
    g.fillStyle = 'rgba(60,90,40,.18)'; g.fill();
    g.setLineDash([4, 6]); g.lineDashOffset = -t * 10; g.lineWidth = 1.5; g.strokeStyle = 'rgba(159,179,200,.7)'; g.stroke(); g.setLineDash([]);
    for (let i = 0; i < 18; i++) { // spikes rising in waves
      const fx = Math.sin(i * 9.17) * 0.85, fy = Math.cos(i * 4.31) * 0.85;
      const x = h.x + fx * h.r, y = h.y + fy * h.r, up = Math.max(0, Math.sin(age * 5 + i * 0.9)) * 11 + 2;
      g.beginPath(); g.moveTo(x - 3, y); g.lineTo(x, y - up); g.lineTo(x + 3, y); g.closePath();
      g.fillStyle = '#c8d4e2'; g.fill(); g.lineWidth = 1; g.strokeStyle = OUT; g.stroke();
      if (up > 10) { g.globalCompositeOperation = 'lighter'; glow(g, x, y - up, 3, '#ffffff'); g.globalCompositeOperation = 'source-over'; }
    }
    g.lineCap = 'round'; // creeping vines
    for (let i = 0; i < 5; i++) {
      const a = i * 1.26 + age * 0.4;
      g.beginPath();
      for (let s = 0; s <= 10; s++) {
        const d = (s / 10) * h.r * 0.9, w = Math.sin(s * 1.3 + age * 3 + i) * 5;
        const px = h.x + Math.cos(a) * d - Math.sin(a) * w, py = h.y + Math.sin(a) * d + Math.cos(a) * w;
        if (s) g.lineTo(px, py); else g.moveTo(px, py);
      }
      g.lineWidth = 2; g.strokeStyle = 'rgba(111,209,58,.6)'; g.stroke();
    }
  },
  starfall(g, h, k, p, t) {
    const a = Math.min(1, k * 4, (h.fxAge || 0) * 4);
    g.globalAlpha = a;
    floorGlow(g, h.x, h.y, h.r, 'rgba(120,140,255,.12)');
    constellation(g, h.x, h.y - h.r * 0.2, h.r, t);
    drawFalls(g, h, (x, y, q, f) => {
      const sx = x + 90 * q, sy = y - 280 * q;
      g.globalCompositeOperation = 'lighter';
      g.lineCap = 'round';
      g.beginPath(); g.moveTo(sx + 50, sy - 150); g.lineTo(sx, sy);
      g.lineWidth = f.big ? 4 : 2.5; g.strokeStyle = 'rgba(255,243,196,.55)'; g.stroke();
      star4(g, sx, sy, f.big ? 8 : 5.5, t * 4, H[1]);
      g.globalCompositeOperation = 'source-over';
    });
  },
  // mage
  nova(g, h, k, p) { novaShape(g, h, k, p, 1); },
  meteor(g, h, k, p, t) {
    g.globalAlpha = k;
    crater(g, h.x, h.y, h.r * 0.45);
    g.globalCompositeOperation = 'lighter';
    const tail = Math.max(0, 1 - p * 3); // the meteor's tail still hangs in the air
    if (tail > 0) {
      const gr = g.createLinearGradient(h.x + 120, h.y - 300, h.x, h.y);
      gr.addColorStop(0, 'rgba(255,90,40,0)'); gr.addColorStop(1, `rgba(255,226,122,${tail})`);
      g.beginPath(); g.moveTo(h.x + 120 - 10, h.y - 300); g.lineTo(h.x - 14, h.y); g.lineTo(h.x + 14, h.y); g.lineTo(h.x + 120 + 10, h.y - 300); g.closePath();
      g.fillStyle = gr; g.fill();
    }
    glow(g, h.x, h.y, h.r * (0.8 + p), F[2]);
    glow(g, h.x, h.y, h.r * 0.5 * k, F[1]);
  },
  inferno(g, h, k, p, t) {
    fireOrb(g, h.x, h.y, h.r * 1.2, h.angle, t, 5);
    g.translate(h.x, h.y); g.rotate(t * 9); // swirling flame ring
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) {
      g.rotate(TAU / 6);
      g.beginPath(); g.arc(0, 0, h.r * 1.6, 0, 0.6);
      g.lineWidth = 3; g.lineCap = 'round'; g.strokeStyle = F[2]; g.globalAlpha = 0.7; g.stroke();
    }
  },
  meteorstorm(g, h, k, p, t) {
    const a = Math.min(1, k * 4, (h.fxAge || 0) * 3);
    g.globalAlpha = a;
    floorGlow(g, h.x, h.y, h.r, 'rgba(255,70,30,.16)');
    runeCircle(g, h.x, h.y, h.r, t * 0.6, F[2], 8, true);
    drawFalls(g, h, (x, y, q, f) => {
      const r = f.big ? 12 : 7;
      g.globalAlpha = a * (1 - q) * 0.6; // growing shadow where it will land
      g.beginPath(); g.ellipse(x, y, r * 2 * (1 - q * 0.6), r * (1 - q * 0.6), 0, 0, TAU); g.fillStyle = 'rgba(0,0,0,.5)'; g.fill();
      g.globalAlpha = a;
      const sx = x + 140 * q, sy = y - 320 * q;
      g.globalCompositeOperation = 'lighter';
      const gr = g.createLinearGradient(sx + 70, sy - 160, sx, sy);
      gr.addColorStop(0, 'rgba(194,50,31,0)'); gr.addColorStop(1, 'rgba(255,154,60,.9)');
      g.beginPath(); g.moveTo(sx + 70, sy - 160); g.lineTo(sx - r, sy); g.lineTo(sx + r, sy); g.closePath(); g.fillStyle = gr; g.fill();
      g.globalCompositeOperation = 'source-over';
      fireOrb(g, sx, sy, r, Math.atan2(160, -70), t);
    });
  },
  // assassin
  fan(g, h) {
    ribbon(g, h, 30, S[1], 1.8, false);
    dagger(g, h.x, h.y, h.angle);
  },
  shuriken(g, h, k, p, t) { // the giant blade circling the player, trailing afterimages along its orbit
    const spin = (h.fxAge || 0) * 26, a = Math.min(1, k * 6, (h.fxAge || 0) * 8);
    for (let i = 4; i >= 1; i--) { // ghosts a little way back on the circle
      const q = h.angle - i * 0.16;
      g.save(); g.globalAlpha = a * (0.28 - i * 0.05);
      shurikenShape(g, h.cx + Math.cos(q) * h.radius, h.cy + Math.sin(q) * h.radius, h.r, spin - i * 0.5);
      g.restore();
    }
    g.globalAlpha = a;
    shurikenShape(g, h.x, h.y, h.r, spin);
  },
  poison(g, h, k, p, t) {
    const age = h.fxAge || 0, a = Math.min(1, k * 4, age * 5);
    for (let i = 0; i < 7; i++) { // bubbling cloud blobs
      const q = i * 0.9 + age * 0.5, d = h.r * (0.25 + 0.4 * ((i * 0.37) % 1));
      const x = h.x + Math.cos(q) * d, y = h.y + Math.sin(q) * d * 0.7, r = h.r * (0.45 + 0.08 * Math.sin(age * 3 + i));
      g.globalAlpha = a * 0.28;
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = i % 2 ? '#4a8a2a' : '#6fd13a'; g.fill();
    }
    g.globalAlpha = a * (0.25 + 0.15 * Math.sin(age * 4)); // faint skull
    skull(g, h.x, h.y - 4, h.r * 0.28, PO[1]);
  },
  smoke(g, h, k, p) { // the smoke bomb's cloud
    const rr = h.r * (0.3 + 0.8 * Math.min(1, p * 2));
    g.globalAlpha = k * 0.55;
    for (let i = 0; i < 6; i++) {
      const q = (i / 6) * TAU;
      g.beginPath(); g.arc(h.x + Math.cos(q) * rr * 0.45, h.y + Math.sin(q) * rr * 0.35, rr * 0.6, 0, TAU);
      g.fillStyle = i % 2 ? '#6a6078' : '#4a4256'; g.fill();
    }
  },
  thousandshadows(g, h, k, p, t) {
    const age = h.fxAge || 0, a = Math.min(1, k * 5, age * 5);
    g.globalAlpha = a * 0.5;
    floorGlow(g, h.x, h.y, h.r, 'rgba(60,10,90,.5)');
    for (let i = 0; i < 6; i++) { // clones take turns lunging in
      const q = (i * TAU) / 6 + age * 1.5, ph = (age * 3 + i / 6) % 1, lunge = ph < 0.3 ? ph / 0.3 : 1 - (ph - 0.3) / 0.7;
      const d = h.r * (0.95 - 0.55 * lunge);
      g.globalAlpha = a * (0.45 + 0.4 * lunge);
      shadowClone(g, h.x + Math.cos(q) * d, h.y + Math.sin(q) * d * 0.8, q + Math.PI);
    }
  },
};

// skill hits that only use particles or the player's dash (no shape of their own)
for (const id of ['charge', 'shadow', 'blink', 'chain', 'warcry', 'hawk', 'manashield', 'assassinate']) SKILL[id] = () => {};

const FALLBACK = {
  nova(g, h, k, p) { novaShape(g, h, k, p, 1); },
  shout: SKILL.shout,
  dagger(g, h) { ribbon(g, h, 30, S[1], 1.8, false); dagger(g, h.x, h.y, h.angle); },
};

// parts of a skill that look different from the skill itself: hit.part → drawing
const PART = {
  inferno: {
    trail(g, h, k, p, t) { PART.pierce.trail(g, h, k, p, t); }, // the scorched path looks like the Dragon Arrow's
    shard(g, h, k, p, t) { fireOrb(g, h.x, h.y, h.r * 1.1, h.angle, t); },
  },
  shuriken: {
    throw(g, h) { // the hurled blade: big, spinning fast, with a streak behind
      ribbon(g, h, 60, PALETTES.steel[1], 3, false);
      shurikenShape(g, h.x, h.y, h.r, (h.fxAge || 0) * 34);
    },
  },
  pierce: {
    trail(g, h, k, p, t) { // the Dragon Arrow's burning patch
      const age = h.fxAge || 0, a = Math.min(1, k * 3, age * 8);
      g.globalAlpha = a;
      floorGlow(g, h.x, h.y + 3, h.r, 'rgba(255,110,40,.22)');
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 6; i++) { // flame tongues flickering over the patch
        const fx = Math.sin(i * 7.31 + h.x) * 0.7 * h.r, fy = Math.cos(i * 3.77 + h.y) * 0.45 * h.r;
        const ht = (8 + Math.sin(t * 13 + i * 2.3) * 5) * (0.5 + 0.5 * k), x = h.x + fx, y = h.y + fy + 4;
        g.beginPath(); g.moveTo(x - 4, y); g.quadraticCurveTo(x - 1, y - ht * 0.6, x + Math.sin(t * 9 + i) * 2, y - ht); g.quadraticCurveTo(x + 2, y - ht * 0.5, x + 4, y); g.closePath();
        g.fillStyle = i % 2 ? F[2] : F[1]; g.globalAlpha = a * 0.7; g.fill();
      }
      glow(g, h.x, h.y, h.r * 0.7, F[3]);
    },
  },
};

// shapes
function floorGlow(g, x, y, r, color) {
  g.save();
  g.beginPath(); g.ellipse(x, y, r, r * 0.8, 0, 0, TAU);
  g.fillStyle = color; g.fill();
  g.restore();
}

// dust spiralling into the centre
function vortex(g, x, y, r, t, color, n) {
  g.save(); g.lineCap = 'round'; g.lineWidth = 2; g.strokeStyle = color;
  for (let i = 0; i < n; i++) {
    const a0 = -t * 9 + (i * TAU) / n;
    g.beginPath();
    for (let s = 0; s <= 12; s++) {
      const q = s / 12, a = a0 + q * 2.6, d = r * (1 - q * 0.8);
      if (s) g.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.85); else g.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.85);
    }
    g.stroke();
  }
  g.restore();
}

// crescent blades sweeping round (white core → colours)
function blades(g, x, y, r, a0, n, len, cols) {
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const a = a0 + (i * TAU) / n;
    g.beginPath(); g.arc(x, y, r * 0.95, a, a + len); g.arc(x, y, r * 0.45, a + len, a, true); g.closePath();
    const gr = g.createRadialGradient(x, y, r * 0.45, x, y, r);
    gr.addColorStop(0, 'rgba(255,154,60,0)'); gr.addColorStop(0.7, cols[2]); gr.addColorStop(0.9, cols[1]); gr.addColorStop(1, cols[0]);
    g.globalAlpha = 0.75; g.fillStyle = gr; g.fill();
    g.beginPath(); g.arc(x, y, r * 0.95, a + len * 0.6, a + len);
    g.globalAlpha = 1; g.lineWidth = 2.5; g.lineCap = 'round'; g.strokeStyle = '#fff'; g.stroke();
  }
  g.restore();
}

// giant sword orbiting, blade along the orbit
function bigBlade(g, x, y, r, a) {
  g.save();
  g.translate(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.85);
  g.rotate(a + Math.PI / 2);
  g.globalCompositeOperation = 'lighter';
  glow(g, 0, 0, 22, F[2]);
  g.globalCompositeOperation = 'source-over';
  g.beginPath(); g.moveTo(0, -26); g.lineTo(5, -6); g.lineTo(4, 14); g.lineTo(-4, 14); g.lineTo(-5, -6); g.closePath();
  g.fillStyle = '#eef3fb'; g.fill(); g.lineWidth = 1.4; g.strokeStyle = OUT; g.stroke();
  g.beginPath(); g.moveTo(0, -22); g.lineTo(0, 12); g.lineWidth = 1; g.strokeStyle = F[2]; g.stroke();
  g.fillStyle = '#c8874e'; g.fillRect(-8, 14, 16, 3.5); g.strokeRect(-8, 14, 16, 3.5);
  g.fillStyle = '#5a3a2a'; g.fillRect(-2, 17.5, 4, 7);
  g.restore();
}

// rotating rune circle on the ground; star: a pentagram inside
function runeCircle(g, x, y, r, t, color, marks, star = false) {
  g.save();
  g.translate(x, y); g.scale(1, 0.8);
  g.globalCompositeOperation = 'lighter';
  g.strokeStyle = color; g.lineWidth = 2;
  g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();
  g.lineWidth = 1.2; g.beginPath(); g.arc(0, 0, r * 0.86, 0, TAU); g.stroke();
  g.rotate(t * 0.8);
  for (let i = 0; i < marks * 2; i++) { // rune ticks between the rings
    const a = (i / (marks * 2)) * TAU, c = Math.cos(a), s = Math.sin(a);
    g.beginPath(); g.moveTo(c * r * 0.88, s * r * 0.88); g.lineTo(c * r * 0.98, s * r * 0.98);
    if (i % 2) { g.moveTo(c * r * 0.93 - s * 4, s * r * 0.93 + c * 4); g.lineTo(c * r * 0.93 + s * 4, s * r * 0.93 - c * 4); }
    g.stroke();
  }
  g.rotate(-t * 1.6);
  g.beginPath();
  const pts = star ? 5 : 3, step = star ? 2 : 1;
  for (let i = 0; i <= pts; i++) {
    const a = ((i * step) / pts) * TAU - Math.PI / 2;
    if (i) g.lineTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8); else g.moveTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8);
  }
  g.globalAlpha *= 0.7; g.stroke();
  g.restore();
}

function fallingArrow(g, x, y, s, col) {
  g.save();
  g.translate(x, y); g.rotate(Math.PI / 2 - 0.42); g.scale(s, s);
  g.globalCompositeOperation = 'lighter';
  g.beginPath(); g.moveTo(-18, 0); g.lineTo(0, 0); g.lineWidth = 2.4; g.lineCap = 'round'; g.strokeStyle = col; g.globalAlpha *= 0.6; g.stroke();
  glow(g, 3, 0, 6, col);
  g.restore();
  arrowShape(g, x, y, Math.PI / 2 - 0.42, col, s * 0.8);
}

// arrows left sticking in the ground, one more per tick that has passed
function stuckArrows(g, h, n) {
  const shown = Math.min(n, Math.floor((h.fxAge || 0) * 8));
  for (let i = 0; i < shown; i++) {
    const x = h.x + Math.sin(i * 3.7 + 1) * h.r * 0.8, y = h.y + Math.cos(i * 5.3 + 2) * h.r * 0.65;
    g.save(); g.translate(x, y); g.rotate(-0.42 - Math.PI / 2 + Math.PI);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -10); g.lineWidth = 1.6; g.strokeStyle = '#c8874e'; g.stroke();
    g.fillStyle = '#e8e0d0'; g.beginPath(); g.moveTo(0, -10); g.lineTo(-2.5, -13); g.lineTo(2.5, -13); g.closePath(); g.fill();
    g.restore();
  }
}

function novaShape(g, h, k, p, scale) {
  const rr = h.r * (0.25 + 0.75 * Math.min(1, p * 2.2));
  g.globalAlpha = k;
  const gr = g.createRadialGradient(h.x, h.y, 0, h.x, h.y, rr); // frost on the floor
  gr.addColorStop(0, 'rgba(230,250,255,.35)'); gr.addColorStop(0.8, 'rgba(95,211,255,.18)'); gr.addColorStop(1, 'rgba(95,211,255,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(h.x, h.y, rr, 0, TAU); g.fill();
  g.lineWidth = 4 * scale; g.strokeStyle = I[1]; g.stroke();
  const n = Math.round(14 * scale);
  for (let i = 0; i < n; i++) { // crystals jutting out of the ring
    const a = (i / n) * TAU + i * 0.13, len = (10 + (i % 3) * 6) * scale, c = Math.cos(a), s = Math.sin(a);
    const bx = h.x + c * rr, by = h.y + s * rr;
    g.beginPath(); g.moveTo(bx - s * 3.5, by + c * 3.5); g.lineTo(bx + c * len, by + s * len); g.lineTo(bx + s * 3.5, by - c * 3.5); g.closePath();
    g.fillStyle = i % 2 ? I[1] : '#ffffff'; g.fill(); g.lineWidth = 1; g.strokeStyle = I[3]; g.stroke();
  }
}

function crater(g, x, y, r) {
  g.beginPath(); g.ellipse(x, y, r, r * 0.6, 0, 0, TAU);
  g.fillStyle = 'rgba(20,10,8,.6)'; g.fill();
  g.lineWidth = 3; g.strokeStyle = 'rgba(255,120,40,.8)'; g.stroke();
}

// lines between fixed stars around the area, slowly turning
function constellation(g, x, y, r, t) {
  const pts = [];
  for (let i = 0; i < 7; i++) {
    const a = i * 0.9 + t * 0.15, d = r * (0.45 + 0.4 * ((i * 0.618) % 1));
    pts.push([x + Math.cos(a) * d, y + Math.sin(a) * d * 0.6 - r * 0.25]);
  }
  g.save(); g.globalCompositeOperation = 'lighter';
  g.lineWidth = 1; g.strokeStyle = 'rgba(200,210,255,.45)';
  g.beginPath(); pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); g.stroke();
  for (const [px, py] of pts) star4(g, px, py, 4 + Math.sin(t * 5 + px) * 1.2, 0, '#e8ecff');
  g.restore();
}

// stars / meteors still in the air: draw(x, y, q = 1 → just started … 0 = landing, fall)
function drawFalls(g, h, draw) {
  if (!h.falls) return;
  for (const f of h.falls) { g.save(); draw(f.x, f.y, Math.max(0, f.t / f.max), f); g.restore(); }
}

// A star-shaped throwing blade of radius r, spun by `spin`, with a soft glow.
function shurikenShape(g, x, y, r, spin) {
  g.save();
  g.translate(x, y);
  g.globalCompositeOperation = 'lighter';
  g.globalAlpha *= 0.55; glow(g, 0, 0, r * 1.7, PALETTES.steel[1]);
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = Math.min(1, g.globalAlpha / 0.55);
  g.rotate(spin);
  g.beginPath();
  for (let i = 0; i < 8; i++) { const d = i % 2 ? r * 0.3 : r; g.lineTo(Math.cos((i / 8) * TAU) * d, Math.sin((i / 8) * TAU) * d); }
  g.closePath(); g.fillStyle = '#dfe6f2'; g.fill(); g.lineWidth = Math.max(1, r * 0.12); g.strokeStyle = OUT; g.stroke();
  g.beginPath(); g.arc(0, 0, r * 0.2, 0, TAU); g.fillStyle = OUT; g.fill();
  g.restore();
}

// A dagger waiting in the Dagger Circle: it pulses, faster the closer it is to launching.
function floatingBlade(g, h, t) {
  g.save();
  const pulse = 0.5 + 0.5 * Math.sin(t * 14 + h.angle * 3);
  g.globalCompositeOperation = 'lighter';
  g.globalAlpha = 0.25 + 0.35 * pulse; glow(g, h.x, h.y, 12 + pulse * 6, S[2]);
  g.restore();
  g.save();
  g.translate(h.x, h.y); g.scale(1 + pulse * 0.25, 1 + pulse * 0.25); g.translate(-h.x, -h.y);
  dagger(g, h.x, h.y, h.angle);
  g.restore();
}

function dagger(g, x, y, a) {
  g.save();
  g.translate(x, y); g.rotate(a);
  g.beginPath(); g.moveTo(10, 0); g.lineTo(0, -2.6); g.lineTo(-3, 0); g.lineTo(0, 2.6); g.closePath();
  g.fillStyle = '#eef2fb'; g.fill(); g.lineWidth = 1; g.strokeStyle = OUT; g.stroke();
  g.beginPath(); g.moveTo(-3, 0); g.lineTo(-8, 0); g.lineWidth = 2.4; g.lineCap = 'round'; g.strokeStyle = S[2]; g.stroke();
  g.restore();
}

function skull(g, x, y, r, col) {
  g.save();
  g.fillStyle = col;
  g.beginPath(); g.arc(x, y, r, Math.PI * 0.85, Math.PI * 0.15); g.lineTo(x + r * 0.6, y + r * 0.9); g.lineTo(x - r * 0.6, y + r * 0.9); g.closePath(); g.fill();
  g.fillStyle = '#10180a';
  g.beginPath(); g.arc(x - r * 0.38, y + r * 0.05, r * 0.24, 0, TAU); g.arc(x + r * 0.38, y + r * 0.05, r * 0.24, 0, TAU); g.fill();
  g.restore();
}

// hooded shadow figure facing angle a
function shadowClone(g, x, y, a) {
  g.save();
  g.translate(x, y);
  g.globalCompositeOperation = 'lighter';
  glow(g, 0, 0, 16, S[2]);
  g.globalCompositeOperation = 'source-over';
  g.beginPath(); g.moveTo(0, -16); g.quadraticCurveTo(9, -12, 9, 10); g.lineTo(-9, 10); g.quadraticCurveTo(-9, -12, 0, -16); g.closePath();
  g.fillStyle = '#1c0d2e'; g.fill(); g.lineWidth = 1.2; g.strokeStyle = S[2]; g.stroke();
  g.fillStyle = S[1]; // eyes
  g.fillRect(-3.5 + Math.cos(a) * 2, -9, 2, 1.6); g.fillRect(1.5 + Math.cos(a) * 2, -9, 2, 1.6);
  g.rotate(a); // blade held toward the centre
  g.beginPath(); g.moveTo(6, 0); g.lineTo(20, -1.5); g.lineTo(6, 2); g.closePath(); g.fillStyle = '#e9d8ff'; g.fill();
  g.restore();
}

// ultimate tint, buff auras, enemy marks
// rect: visible world area (render/world.js)
export function drawUltTint(g, game, rect) {
  for (const h of game.hits) {
    const tint = h.ult && ULT_TINT[h.sid];
    if (!tint) continue;
    const a = tint[1] * Math.min(1, (h.fxAge || 0) * 4, (h.life / h.maxLife) * 4);
    g.save();
    g.fillStyle = `rgba(${tint[0]},${a})`;
    g.fillRect(rect.x0, rect.y0, rect.x1 - rect.x0, rect.y1 - rect.y0);
    g.restore();
    return; // one at a time
  }
}

const buffDuration = (game) => CLASSES[game.classId]?.skills.find((s) => s.id === game.buffSid)?.duration ?? 1;

// Opacity for the player doll (Bom Asap fades it to a silhouette).
export function playerAlpha(game) {
  return game.buffT > 0 && game.buffSid === 'smoke' ? 0.45 : 1;
}

export function drawBuffAura(g, game, t) {
  if (!(game.buffT > 0) || !game.buffSid) return;
  const x = game.px, y = game.py - 6, id = game.buffSid;
  const age = buffDuration(game) - game.buffT, fade = Math.min(1, game.buffT * 2, age * 6);
  g.save();
  g.globalAlpha = fade;
  switch (id) {
    case 'shout': {
      const pulse = 1 + Math.sin(t * 8) * 0.06;
      g.globalCompositeOperation = 'lighter';
      glow(g, x, y, 34 * pulse, H[2]);
      g.globalCompositeOperation = 'source-over';
      g.beginPath(); g.arc(x, y, 26 * pulse, 0, TAU); g.lineWidth = 2.5; g.strokeStyle = 'rgba(255,214,120,.8)'; g.stroke();
      if (age < 0.7) { // the rune flashes over the head
        g.globalAlpha = fade * (1 - age / 0.7);
        g.font = '700 22px serif'; g.textAlign = 'center';
        g.globalCompositeOperation = 'lighter';
        glow(g, x, y - 38, 18, H[2]);
        g.fillStyle = '#fff3c4'; g.fillText('ᛉ', x, y - 30);
      }
      break;
    }
    case 'warcry':
      g.globalCompositeOperation = 'lighter';
      glow(g, x, y + 14, 30 + Math.sin(t * 12) * 3, B[2]);
      flames(g, x, y + 16, 16, t, B[1]);
      eyes(g, x, y - 12, '#ffd6d6', t);
      break;
    case 'hawk': {
      const ax = game.aimX, ay = game.aimY;
      g.setLineDash([3, 6]); g.lineWidth = 1; g.strokeStyle = 'rgba(255,209,102,.6)';
      g.beginPath(); g.moveTo(x + ax * 20, y + ay * 20); g.lineTo(x + ax * 200, y + ay * 200); g.stroke(); g.setLineDash([]);
      g.globalAlpha = fade * (0.55 + 0.15 * Math.sin(t * 4)); // eagle eye over the head
      g.translate(x, y - 40);
      g.beginPath(); g.moveTo(-14, 0); g.quadraticCurveTo(0, -11, 14, 0); g.quadraticCurveTo(0, 11, -14, 0); g.closePath();
      g.fillStyle = 'rgba(255,243,196,.35)'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = H[2]; g.stroke();
      g.beginPath(); g.arc(0, 0, 5, 0, TAU); g.fillStyle = H[2]; g.fill();
      g.beginPath(); g.ellipse(0, 0, 1.5, 4, 0, 0, TAU); g.fillStyle = OUT; g.fill();
      break;
    }
    case 'manashield': {
      const hurt = game.flash > 0;
      g.translate(x, y);
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = fade * 0.35; glow(g, 0, 0, 34, I[2]);
      g.globalAlpha = fade * (hurt ? 1 : 0.6);
      g.lineWidth = 1.1; g.strokeStyle = hurt ? '#ffffff' : I[1];
      for (let i = 0; i < 10; i++) { // hexagons drifting round the dome
        const a = t * 0.8 + (i / 10) * TAU, c = Math.cos(a);
        if (c < -0.2) continue; // back of the dome
        const hx = Math.sin(a) * 24, hy = ((i % 3) - 1) * 12, s = 5.5 * (0.6 + 0.4 * c);
        g.beginPath();
        for (let v = 0; v <= 6; v++) { const q = (v / 6) * TAU; g.lineTo(hx + Math.cos(q) * s, hy + Math.sin(q) * s); }
        g.stroke();
      }
      g.beginPath(); g.arc(0, 0, 28, 0, TAU); g.lineWidth = 1.6; g.stroke();
      if (hurt) { // cracks flash where it held
        g.lineWidth = 1.4;
        for (let i = 0; i < 5; i++) { const a = i * 1.3 + 0.4; g.beginPath(); g.moveTo(Math.cos(a) * 28, Math.sin(a) * 28); g.lineTo(Math.cos(a + 0.2) * 18, Math.sin(a + 0.2) * 18); g.lineTo(Math.cos(a - 0.1) * 10, Math.sin(a - 0.1) * 10); g.stroke(); }
      }
      break;
    }
    case 'smoke':
      g.globalAlpha = fade * 0.35;
      for (let i = 0; i < 5; i++) {
        const a = t * 1.5 + i * 1.25;
        g.beginPath(); g.arc(x + Math.cos(a) * 16, y + 8 + Math.sin(a) * 6, 9, 0, TAU); g.fillStyle = '#6a6078'; g.fill();
      }
      break;
    case 'assassinate': {
      g.globalCompositeOperation = 'lighter';
      glow(g, x, y + 10, 30, S[2]);
      flames(g, x, y + 16, 14, t, '#c21f3a');
      eyes(g, x, y - 12, '#ff2a3a', t);
      g.globalCompositeOperation = 'source-over';
      const e = game.nearestEnemy?.(320);
      if (e) { // red target mark
        g.globalAlpha = fade * 0.9;
        g.translate(e.x, e.y); g.rotate(t * 2);
        g.lineWidth = 1.8; g.strokeStyle = '#ff3a4a';
        const r = e.r + 7;
        g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();
        for (let i = 0; i < 4; i++) { g.rotate(TAU / 4); g.beginPath(); g.moveTo(r - 4, 0); g.lineTo(r + 5, 0); g.stroke(); }
      }
      break;
    }
  }
  g.restore();
}

function flames(g, x, y, r, t, col) {
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI + Math.PI * 0.0, fx = x + Math.cos(a * 2) * r, h = 10 + Math.sin(t * 14 + i * 2) * 5;
    g.beginPath(); g.moveTo(fx - 4, y); g.quadraticCurveTo(fx - 2, y - h * 0.6, fx, y - h); g.quadraticCurveTo(fx + 2, y - h * 0.6, fx + 4, y); g.closePath();
    g.globalAlpha *= 0.8; g.fillStyle = col; g.fill(); g.globalAlpha /= 0.8;
  }
}

function eyes(g, x, y, col, t) {
  const glint = 0.7 + 0.3 * Math.sin(t * 10);
  for (const dx of [-3.5, 3.5]) glow(g, x + dx, y, 4 * glint, col);
}

// ice crystals / dizzy stars / vines on enemies a skill froze (flags set in run/skillfx.js impactFx)
export function drawEnemyMarks(g, game, t) {
  for (const e of game.enemies) {
    if (!(e.frozen > 0)) { e.iceFx = 0; e.dizzyFx = 0; e.vineFx = 0; continue; }
    if (e.iceFx) {
      g.save();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + 0.3, d = e.r * 0.85, x = e.x + Math.cos(a) * d, y = e.y + Math.sin(a) * d * 0.8, s = e.r * (0.35 + 0.1 * (i % 2));
        g.beginPath(); g.moveTo(x, y - s); g.lineTo(x + s * 0.4, y); g.lineTo(x, y + s * 0.5); g.lineTo(x - s * 0.4, y); g.closePath();
        g.globalAlpha = 0.85; g.fillStyle = i % 2 ? I[1] : '#eafcff'; g.fill(); g.lineWidth = 1; g.strokeStyle = I[3]; g.stroke();
      }
      g.restore();
    }
    if (e.dizzyFx) {
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        const a = t * 5 + (i * TAU) / 3;
        star4(g, e.x + Math.cos(a) * e.r * 0.8, e.y - e.r * 1.1 + Math.sin(a) * e.r * 0.25, 3.5, t * 3, '#ffe27a');
      }
      g.restore();
    }
    if (e.vineFx) {
      g.save(); g.lineWidth = 2; g.lineCap = 'round'; g.strokeStyle = 'rgba(111,209,58,.85)';
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.ellipse(e.x, e.y + e.r * (0.1 + i * 0.25), e.r * (1 - i * 0.12), e.r * 0.3, Math.sin(t + i) * 0.2, 0, TAU);
        g.stroke();
      }
      g.restore();
    }
  }
}
