// Anime item icons (spec §39): the same weapons the anime heroes hold, plus helm, armour, boots,
// amulet and ring drawn in the same style. The rarity sets the trims and gems (its colour) and
// the effects, building up to Mitos: a turning rune circle, red-and-gold rays, flames rising,
// orbiting shards, sparks, and the element's own effect on weapons.
// Box: −50..50 around the origin; drawAnimeItem scales it to size × size.
import { TAU, part, stroke, glow, pal, mix, trace } from './kit.js';
import { ELEMENTS, STEEL, GOLD, LEATHER, DARKSTEEL } from './common.js';
import { sword, pauldron } from './warrior.js';
import { bow } from './archer.js';
import { staff } from './mage.js';
import { dagger } from './assassin.js';
import { RARITIES, MYTHIC, LEGENDARY } from '../../data/items.js';

const UP_RIGHT = (3 * Math.PI) / 4; // ψ pointing to the top-right corner
const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
const PLAIN = { name: '', edge: '#8a94a8', core: '#eef2f8', glow: '#1a1e26', rune: '#c8d0dc', fx: 'none' };
// what a weapon of this rarity glows with: plain steel, the rarity's own element, Mitos = the chosen one
const RARITY_ELEMENT = [null, null, 'ice', 'void', 'holy'];
export function itemElement(r, element = 'fire') {
  if (r >= MYTHIC) return ELEMENTS[element] || ELEMENTS.fire;
  return RARITY_ELEMENT[r] ? ELEMENTS[RARITY_ELEMENT[r]] : PLAIN;
}
const gemOf = (r) => (r >= 1 ? pal(RARITIES[r].color, { hi: '#ffffff', rim: null }) : pal('#c8d4e4', { hi: '#ffffff', rim: null }));
const metal = (r) => (r >= LEGENDARY ? pal('#c8ccd8', { shade: '#5a5e74', hi: '#ffffff' }) : r >= 2 ? STEEL : pal('#8a8e98', { shade: '#3a3c46', hi: '#d0d4dc' }));
function gem(g, x, y, s, r, t) {
  const c = RARITIES[r].color;
  part(g, [[x, y - s * 1.2], [x + s, y - s * 0.2, 1], [x + s * 0.6, y + s, 1], [x - s * 0.6, y + s, 1], [x - s, y - s * 0.2, 1]], gemOf(r), { sd: s * 0.5, lw: 1.6 });
  stroke(g, [[x - s * 0.5, y - s * 0.3], [x, y - s * 0.9], [x + s * 0.5, y - s * 0.3]], 'rgba(255,255,255,.75)', 0.9);
  if (r >= 2) glow(g, x, y, s * 3.4, c, 0.45 + 0.2 * Math.sin(t * 3));
}

// ─── the pieces ──────────────────────────────────────────────────────────
function helm(g, r, t) {
  const M = metal(r), c = RARITIES[r].color, trim = r >= 1 ? c : '#b08a3a';
  if (r >= 3) { // a flowing crest plume behind
    const w = Math.sin(t * 2) * 2;
    part(g, [[-2, -34], [-14 + w, -50], [-36 + w, -46, 1], [-24 + w, -40], [-38 + w, -32, 1], [-12, -26]], pal(c, { shade: mix(c, '#140a24', 0.6) }), { sd: 3, lw: 2 });
  }
  if (r >= 2) for (const s of [-1, 1]) { // swept wings
    const k = r >= LEGENDARY ? 1.25 : 1;
    part(g, [[s * 22, -14], [s * 36 * k, -34 * k], [s * 33 * k, -22], [s * 44 * k, -26 * k], [s * 34 * k, -8], [s * 42 * k, -8], [s * 26, 0]], r >= LEGENDARY ? GOLD : M, { sd: 2.4, lw: 2 });
    stroke(g, [[s * 24, -12], [s * 34 * k, -26 * k]], 'rgba(255,255,255,.4)', 0.9);
  }
  part(g, [[-26, 10], [-28, -12], [-18, -30], [0, -36], [18, -30], [28, -12], [26, 10], [14, 22], [0, 27, 1], [-14, 22]], M, { sd: 4, lw: 2.6 });
  part(g, [[-25, -6], [25, -6], [23, 5], [0, 10, 1], [-23, 5]], pal(mix(M.base, '#000000', 0.25)), { sd: 2, lw: 2 });
  fill(g, [[-18, -2], [18, -2], [16, 2.4], [-16, 2.4]], '#05030a');
  if (r >= 2) { glow(g, -8, 0, 8, c, 0.7); glow(g, 8, 0, 8, c, 0.7); g.fillStyle = c; g.fillRect(-14, -1, 9, 2); g.fillRect(5, -1, 9, 2); }
  part(g, [[-3.4, -36], [3.4, -36], [4.4, -8], [-4.4, -8]], GOLD, { sd: 1.6, lw: 1.6 });
  stroke(g, [[-25, -6], [0, -10], [25, -6]], trim, 1.6);
  if (r >= MYTHIC) for (const [x, h] of [[-12, 12], [0, 18], [12, 12]]) part(g, [[x - 3.6, -30], [x, -30 - h, 1], [x + 3.6, -30]], GOLD, { sd: 1.4, lw: 1.6 }); // crown spikes
  if (r >= 1) gem(g, 0, -20, 4.4, r, t);
}
function armour(g, r, t, E) {
  const M = metal(r), c = RARITIES[r].color, trim = r >= 1 ? c : '#b08a3a';
  if (r >= LEGENDARY) for (const s of [-1, 1]) { // cape tails behind
    const w = Math.sin(t * 2 + s) * 2;
    part(g, [[s * 16, -24], [s * (30 + w), 18], [s * (24 + w), 40, 1], [s * (14 + w), 30], [s * 6, 38, 1], [s * 4, -20]], pal(mix(c, '#140a24', 0.45)), { sd: 3, lw: 2 });
  }
  part(g, [[-22, -30], [22, -30], [27, -6], [19, 24], [0, 33, 1], [-19, 24], [-27, -6]], M, { sd: 4, lw: 2.6 });
  part(g, [[-12, -35], [12, -35], [8, -26], [-8, -26]], pal(mix(M.base, '#000000', 0.3)), { sd: 1.4, lw: 1.8 });
  stroke(g, [[0, -28], [0, 30]], 'rgba(19,11,26,.45)', 1);
  stroke(g, [[-25, -12], [0, -2], [25, -12]], trim, 1.8);
  stroke(g, [[-18, 10], [0, 18], [18, 10]], trim, 1.3);
  for (const y of [2, 10, 18]) stroke(g, [[-12, y + 4], [-4, y + 7]], 'rgba(19,11,26,.4)', 0.8);
  const L = { trim };
  pauldron(g, [-26, -24], L, E, t, { side: 1, k: r >= 2 ? 1.2 : 0.95 });
  pauldron(g, [26, -24], L, E, t, { side: -1, k: r >= 2 ? 1.2 : 0.95 });
  if (r >= 1) gem(g, 0, -10, 5.4, r, t);
}
function boots(g, r, t) {
  const M = metal(r), c = RARITIES[r].color, trim = r >= 1 ? c : '#b08a3a';
  if (r >= 3) { const w = Math.sin(t * 3) * 1.6; part(g, [[-12, 8], [-36, -6 + w], [-30, 2], [-42, 6 + w], [-30, 10], [-38, 18 + w], [-12, 18]], r >= LEGENDARY ? GOLD : pal(c), { sd: 2, lw: 1.8 }); } // ankle wing
  part(g, [[-14, -38], [8, -38], [10, 6], [28, 15], [36, 28, 1], [-16, 30, 1], [-18, 8]], M, { sd: 4, lw: 2.6 });
  part(g, [[-16, 22], [34, 22], [36, 30, 1], [-16, 30, 1]], pal(mix(M.base, '#000000', 0.35)), { sd: 1.4, lw: 1.8 });
  part(g, [[-16, -44], [10, -44], [10, -36], [-16, -36]], r >= 2 ? GOLD : LEATHER, { sd: 1.4, lw: 1.8 }); // cuff
  part(g, [[-4, -30], [4, -22, 1], [-4, -12, 1], [-12, -22, 1]], GOLD, { sd: 1.6, lw: 1.6 }); // knee guard
  stroke(g, [[-15, -4], [8, -4]], trim, 1.6);
  stroke(g, [[10, 8], [26, 16]], trim, 1.3);
  if (r >= 1) gem(g, -4, -22, 3.2, r, t);
}
function amulet(g, r, t) {
  const c = RARITIES[r].color;
  g.beginPath(); g.moveTo(-24, -44); g.bezierCurveTo(-30, -14, -12, -6, 0, -6); g.bezierCurveTo(12, -6, 30, -14, 24, -44);
  g.lineWidth = 3.4; g.strokeStyle = '#130b1a'; g.stroke(); g.lineWidth = 1.8; g.strokeStyle = '#e2a83a'; g.setLineDash([3, 2]); g.stroke(); g.setLineDash([]);
  const frame = Array.from({ length: 8 }, (_, i) => { const a = -Math.PI / 2 + (i / 8) * TAU, rr = i % 2 ? 15 : 22; return [Math.cos(a) * rr, 12 + Math.sin(a) * rr, 1]; });
  part(g, frame, GOLD, { sd: 3, lw: 2.2 });
  for (const s of [-1, 1]) stroke(g, [[s * 6, -2], [s * 13, 4], [s * 9, 12], [s * 14, 20]], '#fff0a8', 1);
  part(g, Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * TAU; return [Math.cos(a) * 11, 12 + Math.sin(a) * 11]; }), gemOf(r), { sd: 4, lw: 2 });
  stroke(g, [[-6, 6], [0, 2], [6, 6]], 'rgba(255,255,255,.8)', 1.2);
  if (r >= 2) glow(g, 0, 12, 22, c, 0.5 + 0.25 * Math.sin(t * 3));
  if (r >= 3) { stroke(g, [[0, 34], [0, 40]], '#e2a83a', 1.6); gem(g, 0, 44, 3.6, r, t); }
}
function ring(g, r, t) {
  g.save(); g.translate(0, 14);
  part(g, Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * TAU; return [Math.cos(a) * 28, Math.sin(a) * 14]; }), GOLD, { sd: 4, lw: 2.4 });
  fill(g, Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * TAU; return [Math.cos(a) * 19, 2 + Math.sin(a) * 8]; }), '#0b0810');
  stroke(g, [[-24, -2], [-10, -8], [10, -8], [24, -2]], '#fff0a8', 1.1);
  g.restore();
  for (const s of [-1, 1]) part(g, [[s * 4, 2], [s * 14, -6], [s * 10, -14], [s * 2, -6]], GOLD, { sd: 1.6, lw: 1.6 }); // prongs
  part(g, [[0, -34], [14, -18, 1], [8, -4, 1], [-8, -4, 1], [-14, -18, 1]], gemOf(r), { sd: 4, lw: 2.2 });
  stroke(g, [[-14, -18], [14, -18]], 'rgba(255,255,255,.55)', 1); stroke(g, [[-6, -26], [0, -32], [6, -26]], 'rgba(255,255,255,.85)', 1.2);
  if (r >= 2) glow(g, 0, -18, 24, RARITIES[r].color, 0.5 + 0.25 * Math.sin(t * 3));
  if (r >= 3) for (const s of [-1, 1]) gem(g, s * 20, 8, 3, r, t);
}
function fill(g, pts, color) { g.beginPath(); trace(g, pts); g.fillStyle = color; g.fill(); }

const WEAPON = {
  warrior: (g, r, t, E) => sword(g, [-20, 20], UP_RIGHT, E, t, 0.6, r),
  archer: (g, r, t, E) => { g.save(); g.scale(0.8, 0.8); bow(g, [0, 0], UP_RIGHT, E, t, 0, 0, r); g.restore(); },
  mage: (g, r, t, E) => staff(g, [-9, 9], UP_RIGHT, E, t, r >= LEGENDARY ? 0.3 + 0.3 * Math.sin(t * 2) : 0, 0.6, r),
  assassin: (g, r, t, E) => { g.save(); g.scale(1.45, 1.45); dagger(g, [-12, 12], UP_RIGHT, E, t, false, r); g.restore(); },
};

// ─── rarity effects ──────────────────────────────────────────────────────
function behind(g, r, t) {
  const c = RARITIES[r].color;
  if (r >= 2) glow(g, 0, 0, 52, c, r >= LEGENDARY ? 0.45 : 0.3);
  if (r >= 3) { // slow light rays
    g.save(); g.globalCompositeOperation = 'lighter'; g.rotate(t * 0.25);
    const n = r >= MYTHIC ? 12 : 8;
    for (let i = 0; i < n; i++) {
      g.rotate(TAU / n);
      g.beginPath(); g.moveTo(-3, 0); g.lineTo(0, -50); g.lineTo(3, 0); g.closePath();
      g.fillStyle = r >= MYTHIC ? (i % 2 ? 'rgba(255,209,102,.3)' : 'rgba(255,77,109,.3)') : rgba(c, 0.22); g.fill();
    }
    g.restore();
  }
  if (r < MYTHIC) return;
  // Mitos: a double rune circle turning both ways, flames rising from below
  g.save(); g.globalCompositeOperation = 'lighter';
  for (const [rr, dirn, col] of [[44, 1, '#ffd166'], [36, -1, '#ff4d6d']]) {
    g.save(); g.rotate(t * 0.5 * dirn);
    g.beginPath(); g.arc(0, 0, rr, 0, TAU); g.lineWidth = 1.4; g.strokeStyle = col; g.globalAlpha = 0.7; g.stroke();
    for (let i = 0; i < 12; i++) { g.rotate(TAU / 12); g.fillStyle = col; g.fillRect(-1, -rr - 3, 2, 6); if (i % 3 === 0) { g.beginPath(); g.moveTo(0, -rr - 6); g.lineTo(3, -rr); g.lineTo(-3, -rr); g.fill(); } }
    g.restore();
  }
  for (let i = 0; i < 9; i++) {
    const ph = (t * 1.1 + hash(i)) % 1, x = -36 + i * 9 + Math.sin(t * 3 + i) * 2, h = 20 + hash(i + 4) * 26;
    const gr = g.createLinearGradient(x, 50, x, 50 - h); gr.addColorStop(0, 'rgba(255,60,60,.8)'); gr.addColorStop(0.5, 'rgba(255,170,60,.6)'); gr.addColorStop(1, 'rgba(255,230,120,0)');
    g.globalAlpha = 0.8 * (1 - ph * 0.5); g.fillStyle = gr;
    g.beginPath(); g.moveTo(x - 5, 50); g.quadraticCurveTo(x - 4, 50 - h * 0.6, x + Math.sin(t * 6 + i) * 3, 50 - h * (1 - ph * 0.3)); g.quadraticCurveTo(x + 4, 50 - h * 0.6, x + 5, 50); g.fill();
  }
  g.restore();
}
function front(g, r, t) {
  if (r < 3) return;
  g.save(); g.globalCompositeOperation = 'lighter';
  const c = RARITIES[r].color;
  for (let i = 0; i < (r >= MYTHIC ? 7 : 4); i++) { // cross glints
    const tw = Math.max(0, Math.sin(t * 3 + i * 2.3)), x = (hash(i + 10) - 0.5) * 80, y = (hash(i + 20) - 0.5) * 80, s = 2 + tw * 5;
    g.globalAlpha = tw; g.fillStyle = '#ffffff'; g.fillRect(x - 0.7, y - s, 1.4, s * 2); g.fillRect(x - s, y - 0.7, s * 2, 1.4);
  }
  if (r >= LEGENDARY) for (let i = 0; i < 8; i++) { // motes rising
    const ph = (t * 0.4 + i / 8) % 1, x = Math.cos(i * 2.4 + t * 0.6) * 34, y = 40 - ph * 84;
    g.globalAlpha = Math.sin(ph * Math.PI); g.fillStyle = r >= MYTHIC && i % 2 ? '#ff4d6d' : '#ffd166';
    g.beginPath(); g.arc(x, y, 1.6, 0, TAU); g.fill();
  }
  if (r >= MYTHIC) for (let i = 0; i < 3; i++) { // golden shards orbiting
    const a = t * 1.6 + (i / 3) * TAU, x = Math.cos(a) * 40, y = Math.sin(a) * 14 - 4;
    g.globalAlpha = Math.sin(a) > 0 ? 1 : 0.5; g.fillStyle = '#ffe9a0';
    g.beginPath(); g.moveTo(x, y - 5); g.lineTo(x + 2.4, y); g.lineTo(x, y + 5); g.lineTo(x - 2.4, y); g.fill();
    glow(g, x, y, 7, '#ffd166', 0.6);
  }
  g.restore();
  if (r >= 2) glow(g, 0, 0, 30, c, 0.08);
}

// item: { slot, classId?, rarity }; element: for a Mitos weapon (ELEMENTS id)
export function drawAnimeItem(g, item, size, t = 0, element = 'fire') {
  const r = Math.max(0, Math.min(MYTHIC, item.rarity || 0)), E = itemElement(r, element);
  g.save(); g.scale(size / 100, size / 100); g.lineJoin = 'round'; g.lineCap = 'round';
  behind(g, r, t);
  if (item.slot === 'weapon') (WEAPON[item.classId] || WEAPON.warrior)(g, r, t, E);
  else if (item.slot === 'helm') helm(g, r, t);
  else if (item.slot === 'armor') armour(g, r, t, E);
  else if (item.slot === 'boots') boots(g, r, t);
  else if (item.slot === 'amulet') amulet(g, r, t);
  else ring(g, r, t);
  front(g, r, t);
  g.restore();
}
export { DARKSTEEL };
