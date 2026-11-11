// What the worn gear looks like on an anime hero (spec §39). gear: { helm, armor, boots, amulet,
// ring } = the rarity worn in each slot (0–5), or null for an empty slot.
//  helm   → a headpiece over the hair (the face stays visible): headband → circlet → finned
//           circlet → horned diadem → winged crown → Mitos: + a floating halo and flames
//  armor  → the outfit's trims in the rarity colour; Legendaris+ light motes round the body,
//           Mitos flames on the shoulders and embers
//  boots  → a glow at the ankles; Epik+ a sparkle trail when running; Legendaris+ little feather
//           wings; Mitos a burst of flame on every step
//  amulet → a pendant on the chest; ring → a glint on the weapon hand
import { TAU, part, stroke, glow, pal, mix } from './kit.js';
import { RARITIES, MYTHIC, LEGENDARY } from '../../data/items.js';

const GOLD = pal('#e2a83a', { shade: '#86501a', hi: '#fff0a8' });
const SILVER = pal('#c8ccd8', { shade: '#5a5e74', hi: '#ffffff' });
const STEEL = pal('#9aa4b8', { shade: '#454c62', hi: '#eef2f8' });
const LEATHER = pal('#6a4630', { shade: '#2a160c', hi: '#a87a54' });
const col = (r) => RARITIES[r].color;
const gemP = (r) => pal(col(r), { hi: '#ffffff', rim: null });
const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// the outfit with its trims in the armour's rarity colour (cached: no new object per frame)
const TRIMMED = new WeakMap();
export function trimmed(L, gear) {
  const r = gear?.armor;
  if (r == null || r < 1) return L;
  let m = TRIMMED.get(L);
  if (!m) { m = []; TRIMMED.set(L, m); }
  return (m[r] ||= { ...L, trim: col(r) });
}

// ─── helm: a headpiece on the 3D head (c = skull centre, r = radius, phi = view angle) ──
function onHead(c, rr, phi, a, e, out = 1) { // a point on (or off) the head → [x, y, depth]
  const x = Math.sin(a) * Math.cos(e) * rr * out, y = -Math.sin(e) * rr * out, z = Math.cos(a) * Math.cos(e) * rr * out;
  return [c[0] + x * Math.cos(phi) + z * Math.sin(phi), c[1] + y, -x * Math.sin(phi) + z * Math.cos(phi)];
}
export function headpiece(g, rar, c, rr, phi, t) {
  if (rar == null) return;
  const E = 0.42, band = [];
  for (let i = 0; i <= 40; i++) band.push(onHead(c, rr, phi, (i / 40) * TAU, E, 1.06));
  const P = rar === 0 ? LEATHER : rar === 1 ? STEEL : rar === 2 ? SILVER : GOLD, w = rar === 0 ? 3 : 2.4 + Math.min(rar, 4) * 0.3;
  // the visible half of the band: runs of points facing us
  let run = [];
  const flush = () => {
    if (run.length > 1) {
      stroke(g, run, '#130b1a', w + 2.2); stroke(g, run, P.base, w); stroke(g, run.map((p) => [p[0], p[1] - w * 0.3]), P.hi, w * 0.35);
      if (rar >= 1) stroke(g, run.map((p) => [p[0], p[1] + w * 0.35]), col(rar), 0.8);
    }
    run = [];
  };
  for (const p of band) { if (p[2] >= -0.5) run.push([p[0], p[1]]); else flush(); }
  flush();
  const pieces = []; // [yaw, kind]; drawn only where they face us or stick out past the head
  if (rar >= 2) pieces.push([Math.PI / 2, 'fin'], [-Math.PI / 2, 'fin']);
  if (rar === 3) pieces.push([0.55, 'horn'], [-0.55, 'horn']);
  if (rar >= LEGENDARY) pieces.push([0, 'spike'], [0.45, 'spike'], [-0.45, 'spike'], [Math.PI / 2, 'wing'], [-Math.PI / 2, 'wing']);
  for (const [a, kind] of pieces) {
    const base = onHead(c, rr, phi, a, E, 1.06);
    if (base[2] < -0.65 * rr && kind !== 'wing') continue; // round the back of the head, hidden
    const side = Math.sign(base[0] - c[0]) || 1, s = rr / 12.6;
    if (kind === 'spike') part(g, [[base[0] - 2.2 * s, base[1]], [base[0], base[1] - (a === 0 ? 11 : 8) * s, 1], [base[0] + 2.2 * s, base[1]]], GOLD, { sd: 1, lw: 1.4 });
    if (kind === 'fin') part(g, [[base[0], base[1] - 1], [base[0] + side * 7 * s, base[1] - 7 * s, 1], [base[0] + side * 3 * s, base[1] + 2]], rar >= LEGENDARY ? GOLD : SILVER, { sd: 1, lw: 1.4 });
    if (kind === 'horn') part(g, [[base[0] - 2 * s, base[1]], [base[0] + side * 4 * s, base[1] - 9 * s], [base[0] + side * 10 * s, base[1] - 14 * s, 1], [base[0] + side * 6 * s, base[1] - 7 * s], [base[0] + 2.4 * s, base[1] + 1]], pal('#2a2232', { hi: '#7a6a8a' }), { sd: 1.4, lw: 1.5 });
    if (kind === 'wing') {
      const f = Math.sin(t * 3) * 1.2;
      for (let i = 0; i < 3; i++) part(g, [[base[0], base[1] - 1], [base[0] + side * (9 + i * 3) * s, base[1] - (9 + i * 2.6 + f) * s, 1], [base[0] + side * (5 + i * 2) * s, base[1] - (3 + i * 1.6) * s]], i === 0 ? GOLD : pal(mix('#e2a83a', '#ffffff', 0.3 + i * 0.2)), { sd: 0.8, lw: 1.2 });
    }
  }
  const gem = onHead(c, rr, phi, 0, E, 1.08); // the gem on the forehead
  if (rar >= 1 && gem[2] > 0) {
    const s = 1.6 + rar * 0.35;
    part(g, [[gem[0], gem[1] - s * 1.3], [gem[0] + s, gem[1], 1], [gem[0], gem[1] + s * 1.2, 1], [gem[0] - s, gem[1], 1]], gemP(rar), { sd: 0.8, lw: 1.2 });
    if (rar >= 2) glow(g, gem[0], gem[1], 6 + rar * 1.6, col(rar), 0.5 + 0.2 * Math.sin(t * 3));
  }
  if (rar >= MYTHIC) { // a halo floating above, turning, with flames licking off it
    const hy = c[1] - rr * 1.55 + Math.sin(t * 2) * 1.2, hr = rr * 0.95;
    g.save(); g.globalCompositeOperation = 'lighter';
    g.beginPath(); g.ellipse(c[0], hy, hr, hr * 0.32, 0, 0, TAU); g.lineWidth = 2.4; g.strokeStyle = '#ffd166'; g.globalAlpha = 0.9; g.stroke();
    g.lineWidth = 1; g.strokeStyle = '#ff4d6d'; g.beginPath(); g.ellipse(c[0], hy, hr * 1.12, hr * 0.38, 0, 0, TAU); g.stroke();
    for (let i = 0; i < 8; i++) { const a = t * 1.4 + (i / 8) * TAU; g.fillStyle = i % 2 ? '#ff4d6d' : '#fff0b0'; g.fillRect(c[0] + Math.cos(a) * hr - 0.8, hy + Math.sin(a) * hr * 0.32 - 0.8, 1.6, 1.6); }
    for (let i = 0; i < 5; i++) {
      const ph = (t * 1.3 + hash(i)) % 1, x = c[0] + (i - 2) * hr * 0.4, h = 6 + hash(i + 3) * 6;
      const gr = g.createLinearGradient(x, hy, x, hy - h); gr.addColorStop(0, 'rgba(255,90,60,.9)'); gr.addColorStop(1, 'rgba(255,220,120,0)');
      g.globalAlpha = 1 - ph * 0.6; g.fillStyle = gr; g.beginPath(); g.moveTo(x - 2, hy); g.quadraticCurveTo(x, hy - h * 0.6, x + Math.sin(t * 7 + i), hy - h * (1 - ph * 0.3)); g.quadraticCurveTo(x + 1, hy - h * 0.5, x + 2, hy); g.fill();
    }
    g.restore();
    glow(g, c[0], hy, hr * 1.4, '#ff6a50', 0.3);
  }
}

// ─── amulet: a pendant on the chest, below the head (not seen from behind) ──
export function pendant(g, rar, c, view, t) {
  if (rar == null || view === 'back') return;
  const at = view === 'front' ? [c[0], c[1] + 27] : [c[0] + 4.5, c[1] + 25], top = view === 'front' ? [[c[0] - 6.5, c[1] + 15], [c[0] + 6.5, c[1] + 15]] : [[c[0] + 1, c[1] + 15], [c[0] + 8, c[1] + 15]];
  for (const p of top) stroke(g, [p, [at[0], at[1] - 3]], '#e2a83a', 0.9);
  const s = 2.6 + rar * 0.3;
  part(g, [[at[0], at[1] - s * 1.5], [at[0] + s * 1.2, at[1], 1], [at[0], at[1] + s * 1.6, 1], [at[0] - s * 1.2, at[1], 1]], GOLD, { sd: 0.8, lw: 1.3 });
  part(g, [[at[0], at[1] - s * 0.8], [at[0] + s * 0.6, at[1], 1], [at[0], at[1] + s * 0.9, 1], [at[0] - s * 0.6, at[1], 1]], gemP(rar), { sd: 0.5, lw: 0.9 });
  if (rar >= 2) glow(g, at[0], at[1], 6 + rar * 2, col(rar), 0.45 + 0.25 * Math.sin(t * 3));
  if (rar >= MYTHIC) glow(g, at[0], at[1], 16, '#ffd166', 0.25 + 0.15 * Math.sin(t * 5));
}

// ─── ring: a glint on the weapon hand ──
export function ringGlint(g, rar, h, t) {
  if (rar == null || rar < 1) return;
  const c = col(rar), tw = 0.5 + 0.5 * Math.sin(t * 4), s = 2 + rar * 0.8 + tw * 2;
  glow(g, h[0], h[1], 5 + rar * 1.6, c, 0.5 + tw * 0.3);
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.6 + tw * 0.4; g.fillStyle = '#ffffff';
  g.fillRect(h[0] - 0.6, h[1] - s, 1.2, s * 2); g.fillRect(h[0] - s, h[1] - 0.6, s * 2, 1.2);
  if (rar >= 3) for (let i = 0; i < (rar >= MYTHIC ? 3 : 2); i++) { const a = t * 4 + (i / 3) * TAU; g.fillStyle = c; g.fillRect(h[0] + Math.cos(a) * 7 - 0.8, h[1] + Math.sin(a) * 4 - 0.8, 1.6, 1.6); }
  g.restore();
}

// ─── armour: behind the body (motes, Mitos shoulder flames) ──
export function armourBack(g, rar, chest, shoulders, t, moving = 0) {
  if (rar == null || rar < 2) return;
  const c = col(rar);
  glow(g, chest[0], chest[1], 34, c, rar >= LEGENDARY ? 0.22 : 0.12);
  if (rar < LEGENDARY) return;
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 10; i++) { // motes rising round the body
    const ph = (t * 0.45 + i / 10) % 1, a = i * 2.4 + t * 0.7, x = chest[0] + Math.cos(a) * (18 + (i % 3) * 4), y = chest[1] + 40 - ph * 90;
    g.globalAlpha = Math.sin(ph * Math.PI) * 0.9; g.fillStyle = rar >= MYTHIC && i % 2 ? '#ff6a50' : mix(c, '#ffffff', 0.4);
    g.beginPath(); g.arc(x, y, 1.3 + (i % 2) * 0.6, 0, TAU); g.fill();
  }
  if (rar >= MYTHIC) for (const s of shoulders) for (let i = 0; i < 4; i++) { // flames off the shoulders, leaning back when running
    const ph = (t * 1.6 + hash(i + s[0])) % 1, x = s[0] + (i - 1.5) * 3.4, h = 10 + hash(i + 7) * 9, lean = -moving * 6;
    const gr = g.createLinearGradient(x, s[1], x + lean, s[1] - h); gr.addColorStop(0, 'rgba(255,80,60,.85)'); gr.addColorStop(0.5, 'rgba(255,170,60,.55)'); gr.addColorStop(1, 'rgba(255,230,140,0)');
    g.globalAlpha = 0.9 * (1 - ph * 0.5); g.fillStyle = gr;
    g.beginPath(); g.moveTo(x - 2.6, s[1]); g.quadraticCurveTo(x + lean * 0.4, s[1] - h * 0.6, x + lean + Math.sin(t * 8 + i) * 1.4, s[1] - h * (1 - ph * 0.35)); g.quadraticCurveTo(x + lean * 0.4 + 2, s[1] - h * 0.5, x + 2.6, s[1]); g.fill();
  }
  g.restore();
}

// ─── boots: at the ankles (feet: [[x, y], …], moving 0..1, back = the run's direction on screen) ──
export function bootsFx(g, rar, feet, t, moving = 0, back = -1) {
  if (rar == null || rar < 1) return;
  const c = col(rar);
  for (const [x, y] of feet) {
    glow(g, x, y + 2, 7 + rar * 1.4, c, 0.3 + rar * 0.06);
    if (rar >= LEGENDARY) { // little feather wings at the ankle, swept back
      const f = Math.sin(t * 6 + x) * 1;
      for (let i = 0; i < 3; i++) part(g, [[x, y - 2], [x + back * (7 + i * 2.6), y - (6 + i * 2.2 + f), 1], [x + back * (4 + i * 1.6), y - (1 + i)]], i === 0 ? GOLD : pal(mix('#e2a83a', '#ffffff', 0.35 + i * 0.2)), { sd: 0.6, lw: 1 });
    }
  }
  if (moving > 0.1 && rar >= 3) { // a sparkle trail when running
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 8; i++) {
      const ph = (t * 1.4 + i / 8) % 1, [fx, fy] = feet[i % feet.length];
      g.globalAlpha = (1 - ph) * moving; g.fillStyle = i % 2 ? c : '#ffffff';
      g.fillRect(fx + back * ph * 26 + Math.sin(i * 3) * 2, fy + 3 - ph * 6, 1.6, 1.6);
    }
    g.restore();
  }
  if (rar >= MYTHIC) for (const [x, y] of feet) { // a burst of flame at each step
    g.save(); g.globalCompositeOperation = 'lighter';
    const ph = (t * 2.2 + x * 0.05) % 1;
    for (let i = 0; i < 3; i++) {
      const fx = x + (i - 1) * 3, h = (5 + i % 2 * 3) * (1 - ph * 0.5);
      const gr = g.createLinearGradient(fx, y + 6, fx, y + 6 - h); gr.addColorStop(0, 'rgba(255,80,50,.85)'); gr.addColorStop(1, 'rgba(255,220,120,0)');
      g.globalAlpha = 0.85; g.fillStyle = gr; g.beginPath(); g.moveTo(fx - 2, y + 6); g.quadraticCurveTo(fx, y + 6 - h, fx + 2, y + 6); g.fill();
    }
    g.restore();
  }
}

// ─── armour pieces by rarity, on every class (all in the figure frame) ──
// Bagus: an emblem on the chest; Langka: gems on both shoulders; Epik: hip plates and a short cape;
// Legendaris: gold spikes on the shoulders and a long cape; Mitos: a cape with a burning hem and
// runes circling the body. The cape hangs behind (side, front), or over the back (back view).
const capeP = (r) => (r >= MYTHIC ? pal('#8a1424', { shade: '#3a0610', hi: '#e04a4a' }) : r >= LEGENDARY ? pal('#a0661a', { shade: '#4a2808', hi: '#f0b850' }) : pal(mix(col(r), '#140a24', 0.4)));
export function cape(g, rar, view, top, t, moving = 0) { // top: [x, y] between the shoulders
  if (rar == null || rar < 3) return;
  const long = rar >= LEGENDARY, len = long ? 96 : 58, [x0, y0] = top, w = (i) => Math.sin(t * 2.4 + i * 1.1) * (1.6 + moving * 2.4);
  let pts;
  if (view === 'side') { // streams back from the shoulders
    const back = -10 - moving * 18;
    pts = [[x0 + 6, y0 - 2], [x0 - 10, y0], [x0 - 18 + back * 0.5 + w(1), y0 + len * 0.5], [x0 - 14 + back + w(2), y0 + len, 1], [x0 - 2 + back * 0.8 + w(3), y0 + len - 7], [x0 + 8 + back * 0.6 + w(4), y0 + len - 2, 1], [x0 + 6, y0 + len * 0.45]];
  } else { // a wide cape: behind the body from the front, over the back from behind
    const hw = view === 'back' ? 19 : 22;
    pts = [[x0 - 13, y0], [x0 + 13, y0], [x0 + hw + w(0), y0 + len * 0.6], [x0 + hw + 3 + w(1), y0 + len, 1]];
    for (let i = 1; i < 6; i++) pts.push([x0 + hw + 3 - (i / 6) * (hw + 3) * 2 + w(i + 1), y0 + len - (i % 2 ? 7 : 0), i % 2 ? 0 : 1]);
    pts.push([x0 - hw - 3 + w(8), y0 + len, 1], [x0 - hw + w(9), y0 + len * 0.6]);
  }
  part(g, pts, capeP(rar), { sd: 3.4, lw: 2.2 });
  const hemPts = pts.slice(view === 'side' ? 3 : 3, view === 'side' ? 6 : pts.length - 1);
  stroke(g, hemPts.map((p) => [p[0], p[1] - 2]), rar >= LEGENDARY ? '#ffd776' : col(rar), 1.5);
  if (view === 'back' && rar >= LEGENDARY) { // a crest on the cape
    g.save(); g.translate(x0, y0 + 30);
    stroke(g, [[0, -9], [7, 0], [0, 9], [-7, 0]], '#ffd776', 1.6, true);
    glow(g, 0, 0, 10, col(rar), 0.4);
    g.restore();
  }
  if (rar >= MYTHIC) { // the hem burns
    g.save(); g.globalCompositeOperation = 'lighter';
    hemPts.forEach(([x, y], i) => {
      const ph = (t * 1.5 + i * 0.37) % 1, h = 8 + (i % 3) * 3;
      const gr = g.createLinearGradient(x, y, x, y - h); gr.addColorStop(0, 'rgba(255,90,50,.9)'); gr.addColorStop(1, 'rgba(255,220,120,0)');
      g.globalAlpha = 0.9 - ph * 0.4; g.fillStyle = gr; g.beginPath(); g.moveTo(x - 3, y); g.quadraticCurveTo(x + Math.sin(t * 7 + i) * 2, y - h, x + 3, y); g.fill();
    });
    g.restore();
  }
}
// the small pieces over the outfit: chest emblem, shoulder gems / gold spikes, hip plates
export function armourPieces(g, rar, view, { chest, shoulders = [], hips = [] }, t) {
  if (rar == null || rar < 1) return;
  const c = col(rar);
  if (rar >= 3) for (const [x, y] of hips) { // hip plates
    part(g, [[x - 6, y - 2], [x + 6, y - 2], [x + 7, y + 12, 1], [x, y + 15, 1], [x - 7, y + 12, 1]], rar >= LEGENDARY ? SILVER : STEEL, { sd: 1.6, lw: 1.6 });
    stroke(g, [[x - 6, y + 1], [x + 6, y + 1]], c, 1.2);
  }
  if (chest && view !== 'back') { // emblem
    const [x, y] = chest, s = 2 + rar * 0.6;
    part(g, [[x, y - s * 1.6], [x + s * 1.3, y, 1], [x, y + s * 1.6, 1], [x - s * 1.3, y, 1]], rar >= LEGENDARY ? GOLD : SILVER, { sd: 0.8, lw: 1.2 });
    part(g, [[x, y - s * 0.8], [x + s * 0.6, y, 1], [x, y + s * 0.8, 1], [x - s * 0.6, y, 1]], gemP(rar), { sd: 0.4, lw: 0.8 });
    if (rar >= 2) glow(g, x, y, 6 + rar * 2, c, 0.35 + 0.2 * Math.sin(t * 3));
  }
  for (const [x, y] of shoulders) {
    if (rar >= LEGENDARY) for (const [dx, h] of [[-4, 9], [1, 13], [6, 9]]) part(g, [[x + dx - 2, y - 6], [x + dx + 1, y - 6 - h, 1], [x + dx + 2.6, y - 6]], GOLD, { sd: 0.8, lw: 1.2 });
    if (rar >= 2) {
      part(g, [[x, y - 9], [x + 2.6, y - 6, 1], [x, y - 3, 1], [x - 2.6, y - 6, 1]], gemP(rar), { sd: 0.6, lw: 1 });
      glow(g, x, y - 6, 7, c, 0.45);
    }
  }
  if (rar >= MYTHIC && chest) { // runes circling the body
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) {
      const a = t * 1.2 + (i / 6) * TAU, x = chest[0] + Math.cos(a) * 26, y = chest[1] + 10 + Math.sin(a) * 8, front = Math.sin(a) > 0;
      g.globalAlpha = front ? 0.95 : 0.35; g.strokeStyle = i % 2 ? '#ffd166' : '#ff4d6d'; g.lineWidth = 1.1;
      g.beginPath(); g.moveTo(x - 2, y - 3); g.lineTo(x + 2, y - 3); g.lineTo(x - 2, y + 3); g.lineTo(x + 2, y + 3); g.stroke();
    }
    g.restore();
  }
}
