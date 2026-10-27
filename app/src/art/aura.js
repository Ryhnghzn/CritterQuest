// Auras (spec §19, langkah 8B): a rune circle under the feet that grows every
// 10 levels, body auras from the special effects of equipped unique gear, and
// motes in the colour of the best gear worn. Drawn around a character standing
// at (x, y) = feet, in world units; used in town and in the dungeon.
import { RARITIES } from '../data/items.js';

const TAU = Math.PI * 2;
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',');
const RRGB = RARITIES.map((r) => hexRgb(r.color));

// Level ring: none below 10; 10+ ring, 20+ runes, 30+ second ring, 40+ glow, 50 golden rays.
export function levelRing(g, x, y, level, t) {
  const tier = Math.min(5, Math.floor(level / 10));
  if (tier === 0) return;
  const gold = tier >= 5, rgb = gold ? '255,210,110' : tier >= 4 ? '190,150,255' : '150,170,255';
  g.save();
  g.translate(x, y);
  g.scale(1, 0.42);
  const r = 15 + tier * 1.6;
  if (tier >= 4) {
    const gr = g.createRadialGradient(0, 0, 2, 0, 0, r + 8);
    gr.addColorStop(0, `rgba(${rgb},.3)`); gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r + 8, 0, TAU); g.fill();
  }
  g.lineWidth = 1.2; g.strokeStyle = `rgba(${rgb},.75)`;
  g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();
  if (tier >= 2) { // rune ticks turning slowly
    g.save(); g.rotate(t * 0.4);
    for (let i = 0; i < 12; i++) {
      g.rotate(TAU / 12);
      g.beginPath(); g.moveTo(r - 2.5, 0); g.lineTo(r - 0.8, -1.2); g.lineTo(r - 2.5, -2.2); g.stroke();
    }
    g.restore();
  }
  if (tier >= 3) { g.save(); g.rotate(-t * 0.6); g.setLineDash([4, 3]); g.beginPath(); g.arc(0, 0, r + 4, 0, TAU); g.stroke(); g.restore(); }
  if (gold) {
    g.save(); g.rotate(t * 0.2);
    for (let i = 0; i < 8; i++) { g.rotate(TAU / 8); g.beginPath(); g.moveTo(r + 6, 0); g.lineTo(r + 12, 0); g.lineWidth = 1.6; g.stroke(); }
    g.restore();
  }
  g.restore();
}

// Behind the body: wings, mists, rings. fx = { effect: value } from meta/gear.js gearEffects.
export function auraBack(g, x, y, fx, t) {
  if (!fx) return;
  g.save();
  if (fx.phoenix) { // flame wings, folded a little while walking
    for (const s of [-1, 1]) {
      const flap = Math.sin(t * 3 + s) * 0.12;
      g.save(); g.translate(x, y - 24); g.scale(s, 1); g.rotate(-0.3 + flap);
      g.beginPath(); g.moveTo(0, 0);
      g.bezierCurveTo(10, -14, 24, -12, 26, -4); g.bezierCurveTo(20, -6, 18, 0, 22, 4); g.bezierCurveTo(14, 2, 10, 8, 2, 4); g.closePath();
      const gr = g.createLinearGradient(0, -12, 26, 4);
      gr.addColorStop(0, 'rgba(255,220,120,.85)'); gr.addColorStop(1, 'rgba(255,80,30,.25)');
      g.fillStyle = gr; g.fill();
      g.restore();
    }
  }
  if (fx.lifesteal) { // red mist swirling
    for (let i = 0; i < 3; i++) {
      const a = t * 1.6 + i * 2.1;
      g.beginPath(); g.ellipse(x + Math.cos(a) * 10, y - 18 + Math.sin(a) * 6, 7, 4, a, 0, TAU);
      g.fillStyle = 'rgba(170,20,40,.22)'; g.fill();
    }
  }
  if (fx.thorns) { // dark thorn ring at the feet
    g.translate(x, y); g.scale(1, 0.45);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU + t * 0.3;
      g.beginPath(); g.moveTo(Math.cos(a) * 12, Math.sin(a) * 12); g.lineTo(Math.cos(a + 0.12) * 20, Math.sin(a + 0.12) * 20); g.lineTo(Math.cos(a + 0.25) * 12, Math.sin(a + 0.25) * 12);
      g.fillStyle = '#2a1a2a'; g.fill();
    }
  }
  g.restore();
}

// In front of the body (emissive): sparks, leaves, embers, motes.
// best: highest rarity among the gear worn (Legendaris and up get motes).
export function auraFront(g, x, y, fx, best, t) {
  g.save();
  g.globalCompositeOperation = 'lighter';
  const mote = (i, n, rgb, speed = 0.5, spread = 12, size = 1.3) => {
    const ph = (t * speed + i / n) % 1;
    g.beginPath(); g.arc(x + Math.sin(i * 7.3 + t * 1.3) * spread, y - 4 - ph * 34, size * (1 - ph * 0.6), 0, TAU);
    g.fillStyle = `rgba(${rgb},${(1 - ph) * 0.9})`; g.fill();
  };
  if (best >= 4) for (let i = 0; i < (best >= 5 ? 9 : 6); i++) mote(i, 9, RRGB[best], 0.45);
  if (fx) {
    if (fx.explode) for (let i = 0; i < 6; i++) mote(i, 6, '255,130,50', 0.8, 9, 1.5);
    if (fx.regen) for (let i = 0; i < 5; i++) mote(i + 0.3, 5, '120,255,140', 0.35, 10, 1.6);
    if (fx.goldfind) for (let i = 0; i < 5; i++) mote(i + 0.5, 5, '255,214,110', 0.4, 11, 1.2);
    if (fx.expfind) for (let i = 0; i < 5; i++) mote(i + 0.7, 5, '120,230,255', 0.4, 11, 1.2);
    if (fx.chain && ((t * 6) | 0) % 3 === 0) { // crackling arc
      const a = t * 9;
      g.beginPath(); g.moveTo(x + Math.cos(a) * 9, y - 22 + Math.sin(a) * 9);
      for (let k = 1; k <= 4; k++) g.lineTo(x + Math.cos(a + k * 0.5) * (8 + (k % 2) * 4), y - 22 + Math.sin(a + k * 0.5) * (8 + (k % 2) * 4));
      g.lineWidth = 1.1; g.strokeStyle = 'rgba(200,190,255,.9)'; g.stroke();
    }
    if (fx.execute || fx.bossdmg) { // menacing red glint at the eye
      const k = 0.5 + 0.5 * Math.sin(t * 4);
      g.beginPath(); g.arc(x + 4, y - 35, 2 + k, 0, TAU); g.fillStyle = `rgba(255,40,60,${0.35 + k * 0.3})`; g.fill();
    }
    if (fx.dodgecd) for (let i = 0; i < 3; i++) { // wind streaks
      const a = t * 5 + i * 2.1;
      g.beginPath(); g.ellipse(x, y - 8, 14, 5, 0, a, a + 1); g.lineWidth = 1; g.strokeStyle = 'rgba(180,255,230,.6)'; g.stroke();
    }
    if (fx.shield) {
      g.beginPath(); g.arc(x, y - 18, 20, 0, TAU); g.lineWidth = 0.8; g.strokeStyle = `rgba(150,200,255,${0.25 + 0.15 * Math.sin(t * 2)})`; g.stroke();
    }
    if (fx.frenzy) {
      const k = 0.5 + 0.5 * Math.sin(t * 6);
      const gr = g.createRadialGradient(x, y - 18, 2, x, y - 18, 20);
      gr.addColorStop(0, `rgba(255,60,40,${0.12 * k})`); gr.addColorStop(1, 'rgba(255,60,40,0)');
      g.fillStyle = gr; g.fillRect(x - 20, y - 38, 40, 40);
    }
  }
  g.restore();
}

// Rarity colour of the weapon, for weapon trails; null when Biasa / none.
export const trailRgb = (gear) => (gear?.weapon && gear.weapon.rarity >= 1 ? RRGB[gear.weapon.rarity] : null);
export const bestRarity = (gear) => Math.max(-1, ...Object.values(gear || {}).map((x) => x.rarity ?? -1));
