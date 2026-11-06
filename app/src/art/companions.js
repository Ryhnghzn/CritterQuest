// Pets & mounts (concept, app/pet.html): drawn by code in the style-D cel look of the heroes
// and monsters. Every creature faces right with its feet on y = 0, in the same units as the
// hero doll before its 0.82 scale (a hero stands about 40 tall).
// pose: { t, m, w, skin, saddle } — seconds, how much it is moving (0..1), the walk phase (rad),
// the colour skin (index into skins) and, for mounts, the saddle style (SADDLES id).
// A mount is drawn in two layers around its rider: back(g, pose) under, front(g, pose) over;
// saddle: where the rider's hips sit. Flying ones (fly) hover with their legs tucked.
// A pet's draw() returns where its head is ({ x, y, s }) so a hat can sit on it.
// Cosmetics: skins (per creature), SADDLES, HATS, TRAILS, AURAS.
import { cel, poly, glow, pal, mix, dim, limbPts, TAU } from './hero/cel.js';

const RIM = {
  fire: 'rgba(255,130,60,.9)', ice: 'rgba(150,225,255,.9)', sand: 'rgba(255,200,110,.85)', gold: 'rgba(255,214,120,.9)',
  void: 'rgba(190,120,255,.9)', moss: 'rgba(160,255,120,.8)', sky: 'rgba(120,200,255,.9)', rose: 'rgba(255,150,200,.85)',
  ghost: 'rgba(140,255,200,.85)', none: undefined,
};
const P = (base, rim = 'none', extra = {}) => pal(base, { rim: RIM[rim], ...extra });
const H = (base, rim) => P(base, rim, { hatch: true });

// shapes
const E = (cx, cy, rx, ry, n = 16, rot = 0) => Array.from({ length: n }, (_, i) => {
  const a = (i / n) * TAU, c = Math.cos(rot), s = Math.sin(rot), x = Math.cos(a) * rx, y = Math.sin(a) * ry;
  return [cx + x * c - y * s, cy + x * s + y * c];
});
const piece = (g, pts, Pal, sd = 2.2) => cel(g, poly(g, pts), Pal, sd, 0.7, 0.9);
function bone(g, ax, ay, bx, by, w1, wm, w2, Pal) {
  piece(g, limbPts({ x: ax, y: ay }, { x: bx, y: by }, w1, wm, w2), Pal, 1.2);
}
// a two-part leg from the hip; a: swing angle; returns the foot
function leg(g, hx, hy, len, a, w, Pal, bend = 0.35) {
  const kx = hx + Math.sin(a) * len * 0.5, ky = hy + Math.cos(a) * len * 0.5;
  const fx = kx + Math.sin(a - bend) * len * 0.5, fy = Math.min(0, ky + Math.cos(a - bend) * len * 0.5);
  bone(g, hx, hy, kx, ky, w * 1.25, w * 1.3, w, Pal);
  bone(g, kx, ky, fx, fy, w, w * 0.9, w * 0.75, Pal);
  return { x: fx, y: fy };
}
const hoof = (g, f, c = '#1e1814') => piece(g, [[f.x - 2.4, f.y], [f.x - 2, f.y - 2.6], [f.x + 2.2, f.y - 2.6], [f.x + 2.8, f.y]], P(c), 0.6);
function claws(g, f, c = '#e8dcc0') {
  g.fillStyle = c;
  for (const dx of [0.5, 2.2, 3.8]) { g.beginPath(); g.moveTo(f.x + dx - 0.9, f.y - 0.8); g.lineTo(f.x + dx + 1.4, f.y + 0.2); g.lineTo(f.x + dx, f.y - 1.6); g.closePath(); g.fill(); }
}
// a glowing slanted eye (beasts) / a round cute eye (pets)
function eye(g, x, y, s, color) {
  glow(g, x, y, s * 3, color, 0.8);
  g.beginPath(); g.moveTo(x - s, y); g.lineTo(x, y - s * 0.5); g.lineTo(x + s, y); g.lineTo(x, y + s * 0.35); g.closePath();
  g.fillStyle = mix(color, '#ffffff', 0.55); g.fill();
}
function cuteEye(g, x, y, s, iris = '#2a1a3a', t = 0) {
  const blink = Math.sin(t * 0.9) > 0.985 ? 0.15 : 1;
  g.beginPath(); g.ellipse(x, y, s, s * 1.15 * blink, 0, 0, TAU); g.fillStyle = '#fffaf0'; g.fill();
  g.lineWidth = 0.6; g.strokeStyle = '#0b0710'; g.stroke();
  if (blink < 1) return;
  g.beginPath(); g.ellipse(x + s * 0.2, y + s * 0.1, s * 0.62, s * 0.75, 0, 0, TAU); g.fillStyle = iris; g.fill();
  g.beginPath(); g.arc(x + s * 0.4, y - s * 0.3, s * 0.28, 0, TAU); g.fillStyle = '#fff'; g.fill();
}
// a membrane wing from the shoulder; flap -1..1 (up..down)
function batWing(g, x, y, span, flap, Pal, back = false) {
  const a = -0.5 + flap * 0.9, k = back ? 0.82 : 1;
  const tip = [x - span * 0.55 * k, y - span * Math.cos(a) * 0.9 * k];
  const f1 = [x - span * 0.95 * k, y - span * Math.cos(a) * 0.45 * k], f2 = [x - span * 0.85 * k, y + span * 0.05];
  piece(g, [[x + 2, y], tip, [tip[0] - 2, tip[1] + 4], f1, [f1[0] + 3, f1[1] + 3], f2, [x - 4, y + 4]], Pal, 1.6);
  g.lineWidth = 1; g.strokeStyle = 'rgba(0,0,0,.35)';
  g.beginPath(); g.moveTo(x, y); g.lineTo(f1[0], f1[1]); g.moveTo(x, y); g.lineTo(f2[0], f2[1]); g.stroke();
}
// a feathered wing: a fan of feather blades
function featherWing(g, x, y, span, flap, Pal, tipPal, back = false) {
  const k = back ? 0.82 : 1, base = -2.2 + flap * 0.7;
  for (let i = 6; i >= 0; i--) {
    const a = base + i * 0.16, L = span * k * (0.55 + i * 0.07);
    const ex = x + Math.cos(a) * L, ey = y + Math.sin(a) * L, nx = -Math.sin(a) * 2.6, ny = Math.cos(a) * 2.6;
    piece(g, [[x + nx, y + ny], [ex + nx * 0.6, ey + ny * 0.6], [ex + Math.cos(a) * 3, ey + Math.sin(a) * 3], [ex - nx * 0.6, ey - ny * 0.6], [x - nx, y - ny]], i > 3 ? tipPal : Pal, 1);
  }
  piece(g, E(x - 2, y - 2, span * 0.22 * k, span * 0.14 * k, 10, base + 0.4), Pal, 1.4);
}
function flames(g, pts, t, core = '#ffe08a', outer = 'rgba(255,90,30,.85)', size = 4) {
  g.save(); g.globalCompositeOperation = 'lighter';
  pts.forEach(([x, y], i) => {
    const h = size * (1.6 + Math.sin(t * 9 + i * 1.7) * 0.5);
    g.beginPath(); g.moveTo(x - size * 0.55, y); g.quadraticCurveTo(x - size * 0.4, y - h * 0.6, x + Math.sin(t * 7 + i) * 1.4 - 1.5, y - h);
    g.quadraticCurveTo(x + size * 0.4, y - h * 0.5, x + size * 0.55, y); g.closePath();
    g.fillStyle = outer; g.fill();
    glow(g, x, y - h * 0.3, size * 1.6, core, 0.45);
  });
  g.restore();
}
const swing = (p, ph, amp = 0.5) => Math.sin(p.w + ph) * amp * p.m;
const hover = (p, amp = 3) => Math.sin(p.t * 2.2) * amp;
const flap = (p, speed = 6) => Math.sin(p.t * speed);
const star5 = (g, x, y, r, c) => {
  g.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  g.closePath(); g.fillStyle = c; g.fill();
};
// the colours of the chosen skin
export const skinOf = (def, p) => (def.skins[p.skin] || def.skins[0]).c;

// ─── saddles (mount cosmetic) ──────────────────────────────────────────────
export const SADDLES = [
  { id: 'red', name: 'Kain Merah', cloth: '#7a1e1e', trim: '#d8a84a' },
  { id: 'royal', name: 'Kerajaan', cloth: '#3a1a5a', trim: '#ffd070', tassels: true, gem: '#ff4d6d' },
  { id: 'bone', name: 'Tulang', cloth: '#2a2420', trim: '#e8dcc0', skull: true },
  { id: 'flower', name: 'Taman Bunga', cloth: '#2f5a3a', trim: '#a8e08a', flowers: true },
  { id: 'star', name: 'Rasi Bintang', cloth: '#141c3a', trim: '#9ab8ff', stars: true },
];
function saddle(g, x, y, w, id = 'red', t = 0) {
  const s = SADDLES.find((q) => q.id === id) || SADDLES[0];
  const pts = [[x - w * 0.55, y - 1], [x + w * 0.5, y - 1], [x + w * 0.42, y + 9], [x + w * 0.1, y + 11], [x - w * 0.2, y + 11], [x - w * 0.5, y + 9]];
  piece(g, pts, P(s.cloth, s.stars ? 'sky' : 'none'), 1.2);
  if (s.stars) for (let i = 0; i < 6; i++) { const sx = x - w * 0.4 + (i * 0.17) * w, sy = y + 2 + ((i * 5) % 7); glow(g, sx, sy, 2.6, 'rgba(170,200,255,.9)', 0.5 + Math.sin(t * 3 + i) * 0.4); star5(g, sx, sy, 1, '#e8f0ff'); }
  g.lineWidth = 1.1; g.strokeStyle = s.trim;
  g.beginPath(); g.moveTo(x - w * 0.48, y + 8); g.lineTo(x - w * 0.2, y + 10); g.lineTo(x + w * 0.1, y + 10); g.lineTo(x + w * 0.4, y + 8); g.stroke();
  if (s.tassels) for (let i = 0; i < 4; i++) { const tx = x - w * 0.36 + i * w * 0.24, sw = Math.sin(t * 4 + i) * 0.8; g.beginPath(); g.moveTo(tx, y + 10); g.lineTo(tx + sw, y + 14); g.lineWidth = 1.4; g.strokeStyle = s.trim; g.stroke(); g.beginPath(); g.arc(tx + sw, y + 14.5, 1, 0, TAU); g.fillStyle = s.trim; g.fill(); }
  if (s.flowers) for (let i = 0; i < 4; i++) { const fx = x - w * 0.42 + i * w * 0.28, fy = y + 9 - (i % 2); for (let k = 0; k < 5; k++) { const a = k * TAU / 5; g.beginPath(); g.arc(fx + Math.cos(a) * 1.3, fy + Math.sin(a) * 1.3, 1, 0, TAU); g.fillStyle = ['#ff9ac8', '#ffe070', '#ffffff', '#b89aff'][i]; g.fill(); } g.beginPath(); g.arc(fx, fy, 0.7, 0, TAU); g.fillStyle = '#ffd24a'; g.fill(); }
  // the seat
  piece(g, [[x - w * 0.36, y - 3], [x - w * 0.42, y - 6], [x - w * 0.25, y - 2], [x + w * 0.25, y - 2], [x + w * 0.36, y - 6], [x + w * 0.32, y - 1]], P(s.skull ? '#d8ccb0' : '#4a2a16'), 0.8);
  if (s.skull) {
    const sx = x + w * 0.42, sy = y + 3;
    piece(g, [[sx - 3, sy - 3], [sx + 3, sy - 3], [sx + 3.4, sy + 1], [sx + 1.6, sy + 3.6], [sx - 1.6, sy + 3.6], [sx - 3.4, sy + 1]], P('#e8dcc0'), 0.6);
    g.fillStyle = '#0b0710'; g.beginPath(); g.arc(sx - 1.3, sy, 0.9, 0, TAU); g.arc(sx + 1.3, sy, 0.9, 0, TAU); g.fill();
    glow(g, sx, sy, 4, 'rgba(255,80,60,.8)', 0.3 + Math.sin(t * 3) * 0.2);
  }
  if (s.gem) { piece(g, [[x, y + 2.5], [x + 2, y + 4.5], [x, y + 6.5], [x - 2, y + 4.5]], P(s.gem, 'rose'), 0.4); glow(g, x, y + 4.5, 4, 'rgba(255,90,120,.9)', 0.5); }
}

// ─── mounts ────────────────────────────────────────────────────────────────
function horseBody(g, p, c, fx = {}) {
  const b = p.m ? -Math.abs(Math.sin(p.w)) * 1.2 * p.m : Math.sin(p.t * 2) * 0.3;
  const body = H(c.coat, c.rim), far = dim(body), mane = P(c.mane, c.rim);
  for (const [hx, ph] of [[-12, Math.PI], [12, 0]]) { const f = leg(g, hx, -19 + b, 19, swing(p, ph + 1.2), 3, far); fx.hoof ? fx.hoof(g, f) : hoof(g, f); }
  if (fx.tail) fx.tail(g, -20, -27 + b);
  else piece(g, [[-19, -29 + b], [-28, -24 + b + Math.sin(p.t * 3) * 1.5], [-31, -12 + b], [-27, -10 + b], [-22, -22 + b]], mane, 1.4);
  piece(g, E(0, -25 + b, 20, 8.5, 18), body, 3);
  if (c.ribs) { g.lineWidth = 1; g.strokeStyle = c.ribs; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(-6 + i * 3.2, -31 + b); g.quadraticCurveTo(-4 + i * 3.2, -24 + b, -7 + i * 3.2, -18 + b); g.stroke(); } }
  piece(g, [[10, -30 + b], [20, -46 + b], [27, -45 + b], [21, -27 + b], [16, -20 + b]], body, 2);
  piece(g, [[20, -49 + b], [26, -51 + b], [36, -42 + b], [37, -38 + b], [33, -36.5 + b], [24, -40 + b]], body, 1.4);
  piece(g, [[22, -50 + b], [23.5, -55 + b], [25.5, -50 + b]], body, 0.6);
  if (c.horn) { piece(g, [[27, -49 + b], [33, -62 + b], [29.5, -48 + b]], P(c.horn, 'gold'), 0.5); glow(g, 31, -56 + b, 6, 'rgba(255,240,200,.8)', 0.4); }
  if (fx.mane) fx.mane(g, b);
  else piece(g, [[11, -31 + b], [19, -49 + b], [23, -50 + b], [17, -36 + b], [14, -27 + b]], mane, 1.2);
  if (c.eye) eye(g, 28, -45 + b, 1.4, c.eye); else { g.beginPath(); g.arc(28, -45.5 + b, 1, 0, TAU); g.fillStyle = '#0b0710'; g.fill(); }
  if (c.barding) {
    piece(g, [[-14, -31 + b], [12, -31 + b], [16, -24 + b], [12, -17 + b], [-14, -17 + b], [-19, -24 + b]], P(c.barding, 'gold'), 1.4);
    g.lineWidth = 1.2; g.strokeStyle = '#d8a84a'; g.beginPath(); g.moveTo(-16, -18.5 + b); g.lineTo(13, -18.5 + b); g.stroke();
    piece(g, [[21, -50 + b], [27, -51 + b], [31, -46 + b], [25, -44 + b]], P('#a8aab8', 'gold'), 0.8);
  }
  for (const [hx, ph] of [[-11, 0], [13, Math.PI]]) { const f = leg(g, hx, -19 + b, 19, swing(p, ph), 3.2, body); fx.hoof ? fx.hoof(g, f) : hoof(g, f); }
  return b;
}

export const MOUNTS = [
  {
    id: 'horse', name: 'Kuda Perang', rarity: 0, tag: 'Normal', saddle: { x: 0, y: -33 }, saddleW: 15,
    desc: 'Kuda setia berzirah. Lari +40% di wilayah.',
    skins: [
      { name: 'Cokelat', c: { coat: '#7a4a2a', mane: '#2a1810', barding: '#7a1e1e' } },
      { name: 'Salju', c: { coat: '#e4e0d8', mane: '#a8a098', barding: '#1e3a6a', rim: 'ice' } },
      { name: 'Malam', c: { coat: '#24202a', mane: '#0e0c12', barding: '#4a1a5a', rim: 'void' } },
      { name: 'Unicorn', c: { coat: '#f4eefc', mane: '#c89aff', horn: '#ffe8a8', rim: 'rose' } },
    ],
    back(g, p) { this.b = horseBody(g, p, skinOf(this, p)); },
  },
  {
    id: 'snowwolf', name: 'Serigala Raksasa', rarity: 2, tag: 'Normal', saddle: { x: -2, y: -30 }, saddleW: 14,
    desc: 'Serigala sebesar kuda. Lari +50%, tidak licin di es.',
    skins: [
      { name: 'Salju', c: { fur: '#d8e2ec', eye: '#7fd8ff', rim: 'ice' } },
      { name: 'Bayang', c: { fur: '#2e2640', eye: '#c08aff', rim: 'void' } },
      { name: 'Bara', c: { fur: '#a83a1c', eye: '#ffd24a', rim: 'fire', flame: true } },
    ],
    back(g, p) {
      const c = skinOf(this, p), b = this.b = p.m ? -Math.abs(Math.sin(p.w * 1.2)) * 1.6 * p.m : Math.sin(p.t * 2) * 0.4;
      const fur = H(c.fur, c.rim), far = dim(fur);
      for (const [hx, ph] of [[-12, Math.PI], [11, 0]]) claws(g, leg(g, hx, -17 + b, 17, swing(p, ph + 1, 0.65), 3.4, far));
      piece(g, [[-17, -25 + b], [-30, -30 + b + Math.sin(p.t * 4) * 2], [-36, -26 + b], [-30, -20 + b], [-19, -18 + b]], fur, 1.6);
      if (c.flame) flames(g, [[-30, -29 + b], [-35, -26 + b]], p.t, '#ffe08a', 'rgba(255,100,30,.8)', 3);
      piece(g, E(-1, -23 + b, 18, 8, 18), fur, 3);
      piece(g, [[6, -31 + b], [10, -36 + b], [14, -33 + b], [18, -38 + b], [20, -30 + b], [16, -18 + b], [8, -16 + b]], fur, 2);
      if (c.flame) flames(g, [[9, -35 + b], [14, -36 + b], [18, -37 + b]], p.t + 1, '#ffe08a', 'rgba(255,100,30,.8)', 2.6);
      piece(g, [[14, -36 + b], [20, -40 + b], [30, -34 + b], [33, -30 + b], [30, -28 + b], [20, -26 + b]], fur, 1.4);
      piece(g, [[16, -38 + b], [17, -45 + b], [21, -39 + b]], fur, 0.6);
      piece(g, [[29, -30 + b], [33, -30 + b], [31, -27.5 + b]], P('#1a2030'), 0.3);
      eye(g, 23, -34 + b, 1.4, c.eye);
      for (const [hx, ph] of [[-11, 0], [12, Math.PI]]) claws(g, leg(g, hx, -17 + b, 17, swing(p, ph, 0.65), 3.6, fur));
    },
  },
  {
    id: 'basilisk', name: 'Basilisk', rarity: 3, tag: 'Aneh', saddle: { x: -2, y: -24 }, saddleW: 14,
    desc: 'Kadal berkaki enam. Kebal racun kalajengking.',
    skins: [
      { name: 'Pasir', c: { skin: '#c08a4a', stripe: '#5a3418', frill: '#b0402a', eye: '#ffd24a', rim: 'sand' } },
      { name: 'Racun', c: { skin: '#4a8a3a', stripe: '#2a1a3a', frill: '#9a3ad8', eye: '#c8ff6a', rim: 'moss' } },
      { name: 'Obsidian', c: { skin: '#2a2224', stripe: '#ff6a2a', frill: '#ff3a1a', eye: '#ffb040', rim: 'fire', glowStripe: true } },
    ],
    back(g, p) {
      const c = skinOf(this, p), b = this.b = Math.sin(p.w * 2) * 0.6 * p.m;
      const sk = H(c.skin, c.rim), far = dim(sk);
      for (const [hx, ph] of [[-14, 0.6], [0, Math.PI + 0.6], [14, 0.6]]) claws(g, leg(g, hx, -12 + b, 12, swing(p, ph, 0.7), 2.6, far, 0.8));
      const sw = Math.sin(p.t * 2 + p.w) * 3;
      piece(g, [[-18, -18 + b], [-34, -14 + b + sw * 0.5], [-48, -8 + sw], [-46, -6 + sw], [-32, -10 + b], [-18, -11 + b]], sk, 1.4);
      piece(g, E(0, -17 + b, 20, 7, 18), sk, 2.6);
      for (let i = 0; i < 4; i++) { if (c.glowStripe) glow(g, -12 + i * 7, -21 + b, 4, 'rgba(255,120,40,.9)', 0.5); g.fillStyle = c.stripe; g.beginPath(); g.ellipse(-12 + i * 7, -21 + b, 2.4, 1.4, 0, 0, TAU); g.fill(); }
      piece(g, [[16, -22 + b], [22, -30 + b], [26, -28 + b], [30, -32 + b], [31, -22 + b], [24, -15 + b]], P(c.frill, c.rim), 1.2);
      piece(g, [[18, -22 + b], [28, -24 + b], [37, -20 + b], [36, -16 + b], [26, -14 + b]], sk, 1.2);
      if (Math.sin(p.t * 1.7) > 0.6) { g.lineWidth = 1; g.strokeStyle = '#d8304a'; g.beginPath(); g.moveTo(36, -17 + b); g.lineTo(41, -17 + b); g.lineTo(43, -19 + b); g.moveTo(41, -17 + b); g.lineTo(43, -15.5 + b); g.stroke(); }
      eye(g, 29, -21 + b, 1.4, c.eye);
      for (const [hx, ph] of [[-13, Math.PI + 0.6], [1, 0.6], [15, Math.PI + 0.6]]) claws(g, leg(g, hx, -12 + b, 12, swing(p, ph, 0.7), 2.8, sk, 0.8));
    },
  },
  {
    id: 'turtle', name: 'Kura Raksasa', rarity: 3, tag: 'Aneh', saddle: { x: -2, y: -44 }, saddleW: 13,
    desc: 'Pelan tapi punya taman di punggung. Pulih HP saat menunggang.',
    skins: [
      { name: 'Lumut', c: { skin: '#5a7a4a', shell: '#3a5a2a', tuft: '#4a8a3a', shroom: '#7ae0ff', glow: 'rgba(120,230,255,.8)', rim: 'moss' } },
      { name: 'Karang', c: { skin: '#5a8a8a', shell: '#b04a5a', tuft: '#ff8a9a', shroom: '#ffe070', glow: 'rgba(255,220,120,.8)', rim: 'rose' } },
      { name: 'Gletser', c: { skin: '#7a8aa0', shell: '#bcd4ec', tuft: '#ffffff', shroom: '#9ad8ff', glow: 'rgba(150,220,255,.8)', rim: 'ice' } },
    ],
    back(g, p) {
      const c = skinOf(this, p), b = this.b = Math.sin(p.w) * 0.8 * p.m;
      const skin = P(c.skin, c.rim), shell = H(c.shell, c.rim), far = dim(skin);
      for (const hx of [-15, 10]) hoof(g, leg(g, hx, -10 + b, 10, swing(p, hx > 0 ? 0 : Math.PI, 0.3), 5, far, 0.1), '#2a3a20');
      piece(g, [[-24, -10 + b], [-30, -8 + b], [-24, -6 + b]], skin, 0.8);
      piece(g, [[18, -14 + b], [28, -18 + b + Math.sin(p.t * 1.2) * 1.2], [36, -20 + b], [40, -16 + b], [36, -11 + b], [22, -8 + b]], skin, 1.6);
      eye(g, 35, -17.5 + b, 1.2, '#c8ff8a');
      piece(g, [[-28, -10 + b], [-24, -28 + b], [-12, -40 + b], [6, -42 + b], [20, -32 + b], [26, -12 + b]], shell, 3.5);
      g.lineWidth = 1; g.strokeStyle = 'rgba(0,0,0,.4)';
      for (const [x, y] of [[-14, -30], [0, -34], [12, -26], [-6, -20], [8, -16]]) { g.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6; g[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * 5, y + b + Math.sin(a) * 4); } g.closePath(); g.stroke(); }
      for (const [x, y, s] of [[-20, -26, 1], [16, -30, 0.8], [-8, -40, 0.7]]) {
        piece(g, E(x, y + b, 5 * s, 2.4 * s, 10), P(c.tuft, c.rim), 0.8);
        piece(g, E(x + 2, y - 3 * s + b, 2 * s, 1.4 * s, 8), P(c.shroom, 'sky'), 0.4); glow(g, x + 2, y - 3 * s + b, 5 * s, c.glow, 0.6 + Math.sin(p.t * 2 + x) * 0.2);
      }
      bone(g, 14, -38 + b, 15, -52 + b, 1.4, 1.4, 1.2, P('#4a3a2a'));
      piece(g, E(17, -51 + b, 2.2, 2.8, 8), P('#ffd070', 'gold'), 0.4); glow(g, 17, -51 + b, 9, 'rgba(255,200,100,.9)', 0.7);
      for (const hx of [-13, 12]) hoof(g, leg(g, hx, -10 + b, 10, swing(p, hx > 0 ? Math.PI : 0, 0.3), 5.4, skin, 0.1), '#2a3a20');
    },
  },
  {
    id: 'shroom', name: 'Jamur Berjalan', rarity: 2, tag: 'Aneh', saddle: { x: 0, y: -57 }, saddleW: 13,
    desc: 'Jamur raksasa berkaki laba-laba. Jejak sporanya menyembuhkan.',
    skins: [
      { name: 'Merah', c: { cap: '#b8262a', spot: '#fff2e0', legs: '#8a6a5a', spore: 'rgba(160,255,140,.9)', rim: 'fire' } },
      { name: 'Biru Pendar', c: { cap: '#1a4a8a', spot: '#9af0ff', legs: '#3a3a5a', spore: 'rgba(120,220,255,.9)', rim: 'sky', glowSpot: true } },
      { name: 'Gerhana', c: { cap: '#3a1a5a', spot: '#ffb0f0', legs: '#2a2030', spore: 'rgba(220,150,255,.9)', rim: 'void', glowSpot: true } },
    ],
    back(g, p) {
      const c = skinOf(this, p), b = this.b = Math.sin(p.w * 2) * 1 * p.m + Math.sin(p.t * 1.6) * 0.6;
      const stem = H('#e8d8c0', 'none'), legs = P(c.legs), far = dim(legs);
      for (let i = 0; i < 3; i++) leg(g, -6 + i * 6, -22 + b, 24, -0.9 + i * 0.9 + swing(p, i * 2.1, 0.4), 1.8, far, -1.1);
      piece(g, [[-9, -18 + b], [-10, -40 + b], [10, -40 + b], [9, -18 + b], [4, -14 + b], [-4, -14 + b]], stem, 2.2);
      cuteEye(g, -2, -28 + b, 2.2, '#3a1a2a', p.t); cuteEye(g, 4, -28 + b, 2.2, '#3a1a2a', p.t);
      g.lineWidth = 0.8; g.strokeStyle = '#0b0710'; g.beginPath(); g.arc(1, -23 + b, 2, 0.2, Math.PI - 0.2); g.stroke();
      piece(g, [[-26, -40 + b], [-20, -52 + b], [-8, -58 + b], [8, -58 + b], [20, -52 + b], [26, -40 + b], [14, -37 + b], [-14, -37 + b]], H(c.cap, c.rim), 3);
      for (const [x, y, r] of [[-16, -46, 2.6], [-4, -53, 2.2], [12, -50, 3], [20, -43, 1.8], [-22, -41, 1.6]]) {
        if (c.glowSpot) glow(g, x, y + b, r * 3, c.spore, 0.5 + Math.sin(p.t * 2 + x) * 0.2);
        g.fillStyle = c.spot; g.beginPath(); g.arc(x, y + b, r, 0, TAU); g.fill();
      }
      for (let i = 0; i < 3; i++) leg(g, -5 + i * 6, -22 + b, 24, -1 + i * 0.9 + swing(p, i * 2.1 + Math.PI, 0.4), 2, legs, -1.1);
      if (p.m) for (let i = 0; i < 6; i++) { const k = (p.t * 0.7 + i / 6) % 1; glow(g, -14 - k * 30, -4 - k * 14, 3, c.spore, (1 - k) * 0.7); }
    },
  },
  {
    id: 'griffin', name: 'Griffin', rarity: 4, tag: 'Mitos', fly: true, saddle: { x: -3, y: -38 }, saddleW: 14,
    desc: 'Setengah elang, setengah singa. Terbang melintasi sungai & tebing.',
    skins: [
      { name: 'Emas', c: { fur: '#c8984a', head: '#f0ece0', wing: '#8a5a2a', tip: '#f0d8a0', beak: '#f0b020', eye: '#ffb020', rim: 'gold' } },
      { name: 'Badai', c: { fur: '#7a8494', head: '#e8eef8', wing: '#3a4a6a', tip: '#bcd4ff', beak: '#d8d8e8', eye: '#7fd8ff', rim: 'sky' } },
      { name: 'Gagak', c: { fur: '#2a2430', head: '#1a1620', wing: '#14101a', tip: '#5a3a8a', beak: '#c8a040', eye: '#ff4d6d', rim: 'void' } },
    ],
    back(g, p) {
      const c = skinOf(this, p), b = this.b = hover(p) - 6, fl = flap(p, 5);
      const fur = H(c.fur, c.rim), feather = P(c.head, c.rim), wingP = P(c.wing, c.rim), tip = P(c.tip, c.rim);
      featherWing(g, 2, -36 + b, 34, fl, dim(wingP), dim(tip), true);
      piece(g, [[-20, -30 + b], [-32, -34 + b + Math.sin(p.t * 3) * 2], [-36, -30 + b], [-26, -26 + b]], fur, 1);
      piece(g, E(-36, -31 + b, 3, 3.6, 8), P(mix(c.fur, '#000000', 0.5)), 0.8);
      for (const hx of [-12, 8]) bone(g, hx, -24 + b, hx - 6, -14 + b, 3.4, 3.4, 2.6, dim(fur));
      piece(g, E(-2, -29 + b, 20, 9, 18), fur, 3);
      piece(g, [[8, -36 + b], [14, -44 + b], [22, -46 + b], [26, -40 + b], [22, -28 + b], [12, -22 + b]], feather, 2);
      piece(g, [[22, -46 + b], [30, -44 + b], [33, -40 + b], [29, -38 + b], [25, -39 + b]], feather, 1);
      piece(g, [[29, -44 + b], [36, -42 + b], [37, -38 + b], [33, -38 + b], [30, -40 + b]], P(c.beak, 'gold'), 0.8);
      piece(g, [[16, -46 + b], [14, -52 + b], [19, -47 + b]], feather, 0.5);
      eye(g, 26, -43 + b, 1.4, c.eye);
      for (const hx of [-14, 10]) { bone(g, hx, -24 + b, hx - 8, -16 + b, 3.6, 3.6, 2.8, fur); claws(g, { x: hx - 10, y: -15 + b }, '#3a2a1a'); }
      featherWing(g, -1, -37 + b, 38, fl, wingP, tip);
    },
  },
  {
    id: 'nightmare', name: 'Kuda Mimpi Buruk', rarity: 4, tag: 'Aneh', saddle: { x: 0, y: -33 }, saddleW: 15,
    desc: 'Kerangka kuda bersurai api. Musuh lemah lari ketakutan.',
    skins: [
      { name: 'Api Ungu', c: { coat: '#2a2236', mane: '#000000', rim: 'void', eye: '#c08aff', ribs: 'rgba(200,170,255,.55)', core: '#e0c0ff', fire: 'rgba(150,80,255,.8)', hoofGlow: 'rgba(170,110,255,.9)' } },
      { name: 'Api Hantu', c: { coat: '#1e2a26', mane: '#000000', rim: 'ghost', eye: '#8affc8', ribs: 'rgba(160,255,210,.5)', core: '#d0ffe8', fire: 'rgba(60,220,150,.8)', hoofGlow: 'rgba(80,255,170,.9)' } },
      { name: 'Api Neraka', c: { coat: '#2a1414', mane: '#000000', rim: 'fire', eye: '#ffd24a', ribs: 'rgba(255,170,120,.5)', core: '#fff0a0', fire: 'rgba(255,90,30,.85)', hoofGlow: 'rgba(255,120,40,.9)' } },
    ],
    back(g, p) {
      const c = skinOf(this, p);
      this.b = horseBody(g, p, c, {
        mane: (gg, b) => flames(gg, [[12, -30 + b], [15, -36 + b], [18, -42 + b], [21, -48 + b]], p.t, c.core, c.fire, 3.4),
        tail: (gg, x, y) => flames(gg, [[x - 2, y + 2], [x - 6, y + 6], [x - 9, y + 11]], p.t + 1, c.core, c.fire, 3.6),
        hoof: (gg, f) => { hoof(gg, f, '#1a1424'); glow(gg, f.x, f.y - 1, 6, c.hoofGlow, 0.7); },
      });
    },
  },
  {
    id: 'dragon', name: 'Naga', rarity: 5, tag: 'Mitos', fly: true, saddle: { x: -4, y: -40 }, saddleW: 15,
    desc: 'Naga purba. Terbang; sesekali menyemburkan napasnya.',
    skins: [
      { name: 'Bara', c: { scale: '#a8261c', belly: '#e8a050', wing: '#6a1414', spine: '#3a1410', horn: '#2a1a14', eye: '#ffd24a', core: '#fff0a0', breath: 'rgba(255,110,30,.85)', rim: 'fire' } },
      { name: 'Es', c: { scale: '#4a86c8', belly: '#dceaf8', wing: '#2a4a8a', spine: '#e8f4ff', horn: '#e8f0ff', eye: '#bff0ff', core: '#ffffff', breath: 'rgba(120,210,255,.85)', rim: 'ice' } },
      { name: 'Gerhana', c: { scale: '#2a1a3e', belly: '#8a5ac8', wing: '#140c22', spine: '#c08aff', horn: '#0b0710', eye: '#ff4dd2', core: '#ffd0ff', breath: 'rgba(170,80,255,.85)', rim: 'void' } },
      { name: 'Emas', c: { scale: '#c8962e', belly: '#fff0c0', wing: '#8a5a14', spine: '#fff0a0', horn: '#fff8e0', eye: '#ff4d6d', core: '#ffffff', breath: 'rgba(255,220,120,.85)', rim: 'gold' } },
    ],
    back(g, p) {
      const c = skinOf(this, p), b = this.b = hover(p, 4) - 8, fl = flap(p, 3.4);
      const sc = H(c.scale, c.rim), belly = P(c.belly, c.rim), wingP = P(c.wing, c.rim), horn = P(c.horn);
      batWing(g, 2, -40 + b, 44, fl, dim(wingP), true);
      const tw = Math.sin(p.t * 1.8) * 4;
      piece(g, [[-20, -30 + b], [-36, -28 + b + tw * 0.4], [-52, -20 + b + tw], [-60, -22 + b + tw], [-54, -15 + b + tw], [-36, -22 + b], [-20, -22 + b]], sc, 1.6);
      piece(g, [[-58, -22 + b + tw], [-66, -28 + b + tw], [-64, -18 + b + tw]], sc, 0.8);
      for (const hx of [-14, 10]) bone(g, hx, -26 + b, hx - 7, -16 + b, 4, 4, 3, dim(sc));
      piece(g, E(-2, -31 + b, 23, 10, 18), sc, 3.4);
      piece(g, [[-16, -26 + b], [12, -26 + b], [16, -22 + b], [-12, -21 + b]], belly, 1);
      for (let i = 0; i < 6; i++) piece(g, [[-18 + i * 6, -40 + b], [-15 + i * 6, -46 + b], [-12 + i * 6, -40 + b]], P(c.spine, c.rim), 0.5);
      piece(g, [[12, -36 + b], [20, -48 + b], [28, -56 + b], [34, -56 + b], [30, -46 + b], [22, -30 + b], [16, -24 + b]], sc, 2);
      piece(g, [[26, -58 + b], [34, -62 + b], [44, -56 + b], [46, -51 + b], [40, -49 + b], [30, -50 + b]], sc, 1.4);
      piece(g, [[32, -51 + b], [45, -50 + b], [42, -47 + b + Math.max(0, Math.sin(p.t * 0.8)) * 2], [33, -48 + b]], P(mix(c.scale, '#000000', 0.35), c.rim), 0.8);
      piece(g, [[28, -60 + b], [22, -68 + b], [31, -61 + b]], horn, 0.6); piece(g, [[32, -61 + b], [30, -70 + b], [35, -62 + b]], horn, 0.6);
      eye(g, 37, -56 + b, 1.6, c.eye);
      const breath = Math.max(0, Math.sin(p.t * 0.8) - 0.6) * 2.5;
      if (breath > 0) { flames(g, [[48, -50 + b], [53, -51 + b], [58, -52 + b]], p.t * 1.5, c.core, c.breath, 3 + breath * 2); glow(g, 54, -52 + b, 16, c.breath, breath * 0.6); }
      else glow(g, 45, -51 + b, 4, c.breath, 0.5 + Math.sin(p.t * 5) * 0.2);
      for (const hx of [-16, 12]) { bone(g, hx, -26 + b, hx - 8, -17 + b, 4.4, 4.4, 3.2, sc); claws(g, { x: hx - 10, y: -16 + b }); }
      batWing(g, 0, -41 + b, 50, fl, wingP);
    },
  },
  {
    id: 'skywhale', name: 'Paus Langit', rarity: 5, tag: 'Aneh', fly: true, saddle: { x: -4, y: -46 }, saddleW: 14,
    desc: 'Paus yang berenang di udara, tubuhnya penuh bintang.',
    skins: [
      { name: 'Malam', c: { skin: '#2a3a7a', belly: '#9ab8e8', fin: '#5a6ad8', star: 'rgba(220,235,255,.9)', rim: 'sky' } },
      { name: 'Fajar', c: { skin: '#c8506a', belly: '#ffd8b0', fin: '#ff9a5a', star: 'rgba(255,240,200,.9)', rim: 'gold' } },
      { name: 'Aurora', c: { skin: '#1a5a5a', belly: '#a8f0d8', fin: '#4ad8a8', star: 'rgba(170,255,220,.9)', rim: 'ghost' } },
    ],
    back(g, p) {
      const c = skinOf(this, p), b = this.b = hover(p, 5) - 12, sw = Math.sin(p.t * 1.6);
      const skin = H(c.skin, c.rim), belly = P(c.belly, c.rim), fin = P(c.fin, c.rim);
      piece(g, [[-30, -32 + b], [-44, -30 + b + sw * 3], [-54, -40 + b + sw * 5], [-50, -30 + b + sw * 4], [-56, -22 + b + sw * 5], [-44, -26 + b + sw * 3]], fin, 1.4);
      piece(g, [[-34, -30 + b], [-20, -44 + b], [4, -50 + b], [26, -46 + b], [38, -34 + b], [36, -24 + b], [20, -16 + b], [-10, -16 + b], [-28, -22 + b]], skin, 3.6);
      piece(g, [[-20, -22 + b], [0, -17 + b], [24, -18 + b], [34, -26 + b], [20, -22 + b], [-4, -21 + b]], belly, 1);
      g.lineWidth = 0.8; g.strokeStyle = 'rgba(0,0,0,.35)'; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(2 + i * 6, -20 + b); g.lineTo(6 + i * 6, -17 + b); g.stroke(); }
      for (let i = 0; i < 14; i++) {
        const x = -26 + ((i * 37) % 58), y = -42 + ((i * 23) % 20), a = 0.5 + Math.sin(p.t * 3 + i) * 0.5;
        glow(g, x, y + b, 3, c.star, a * 0.8); g.fillStyle = `rgba(255,255,255,${a})`; g.fillRect(x - 0.5, y + b - 0.5, 1.1, 1.1);
      }
      piece(g, [[4, -22 + b], [12, -12 + b + sw * 2], [18, -10 + b + sw * 2], [14, -20 + b]], fin, 1);
      cuteEye(g, 28, -31 + b, 2, mix(c.skin, '#000000', 0.4), p.t);
      g.lineWidth = 1; g.strokeStyle = '#0b0710'; g.beginPath(); g.moveTo(30, -25 + b); g.quadraticCurveTo(34, -24 + b, 37, -27 + b); g.stroke();
      for (let i = 0; i < 3; i++) { const k = (p.t * 0.5 + i / 3) % 1; glow(g, -10 + i * 3, -50 + b - k * 16, 3 + k * 3, c.star, (1 - k) * 0.6); }
    },
  },
];
for (const m of MOUNTS) m.front ??= function front(g, p) { saddle(g, this.saddle.x, this.saddle.y - 1 + (this.b || 0), this.saddleW, p.saddle, p.t); };

// ─── pets ──────────────────────────────────────────────────────────────────
export const PETS = [
  {
    id: 'slime', name: 'Lendir Jinak', rarity: 0, tag: 'Normal',
    desc: 'Memungut koin di dekatmu.',
    skins: [
      { name: 'Daun', c: { body: '#5ad08a', leaf: '#3a9a4a', iris: '#1a3a2a', rim: 'moss' } },
      { name: 'Langit', c: { body: '#6ab8ff', leaf: '#ffffff', iris: '#1a2a5a', rim: 'sky' } },
      { name: 'Permen', c: { body: '#ff8ac8', leaf: '#ffe070', iris: '#5a1a3a', rim: 'rose' } },
      { name: 'Emas Cair', c: { body: '#ffc63a', leaf: '#fff2b0', iris: '#5a3a0a', rim: 'gold', shine: true } },
    ],
    draw(g, p) {
      const c = skinOf(this, p), sq = Math.abs(Math.sin(p.w * 1.4)) * p.m, h = 12 - sq * 3 + Math.sin(p.t * 3) * 0.5, w = 9 + sq * 2, y = -sq * 4;
      if (c.shine) glow(g, 0, y - h / 2, 16, 'rgba(255,210,90,.8)', 0.4);
      piece(g, [[-w, y], [-w * 0.9, y - h * 0.6], [-w * 0.4, y - h], [w * 0.4, y - h], [w * 0.9, y - h * 0.6], [w, y]], P(c.body, c.rim), 2);
      glow(g, -3, y - h * 0.7, 3, 'rgba(255,255,255,.9)', 0.5);
      cuteEye(g, 1, y - h * 0.5, 1.8, c.iris, p.t); cuteEye(g, 6, y - h * 0.5, 1.8, c.iris, p.t);
      piece(g, [[0, y - h], [-4, y - h - 4], [1, y - h - 2]], P(c.leaf), 0.5); piece(g, [[0, y - h], [5, y - h - 4], [2, y - h - 1]], P(c.leaf), 0.5);
      return { x: 1, y: y - h, s: 1 };
    },
  },
  {
    id: 'jackalope', name: 'Kelinci Bertanduk', rarity: 1, tag: 'Aneh',
    desc: 'Menemukan bahan tersembunyi di semak.',
    skins: [
      { name: 'Cokelat', c: { fur: '#b8906a', antler: '#e8dcc0', tail: '#f0e8e0' } },
      { name: 'Salju', c: { fur: '#eef2f8', antler: '#9ad8ff', tail: '#ffffff', rim: 'ice' } },
      { name: 'Hutan Roh', c: { fur: '#3a5a4a', antler: '#8affc8', tail: '#c8ffe8', rim: 'ghost', glowAntler: true } },
    ],
    draw(g, p) {
      const c = skinOf(this, p), hop = Math.max(0, Math.sin(p.w * 1.6)) * 5 * p.m, y = -hop, fur = H(c.fur, c.rim);
      piece(g, E(-1, y - 6, 7, 5.5, 14), fur, 1.6);
      piece(g, E(-7, y - 7, 2.4, 2.4, 8), P(c.tail), 0.4);
      piece(g, E(5, y - 11, 4.4, 4, 12), fur, 1.2);
      piece(g, [[3, y - 14], [1, y - 22], [4, y - 15]], fur, 0.6); piece(g, [[6, y - 14], [7, y - 22], [8, y - 14]], fur, 0.6);
      if (c.glowAntler) glow(g, 5, y - 19, 8, 'rgba(140,255,200,.8)', 0.5);
      g.lineWidth = 1.1; g.strokeStyle = c.antler;
      g.beginPath(); g.moveTo(4, y - 14); g.lineTo(2, y - 19); g.lineTo(-1, y - 21); g.moveTo(2, y - 19); g.lineTo(2, y - 23); g.moveTo(6, y - 14); g.lineTo(9, y - 19); g.lineTo(12, y - 20); g.moveTo(9, y - 19); g.lineTo(9, y - 23); g.stroke();
      cuteEye(g, 6.5, y - 11.5, 1.4, '#2a1a10', p.t);
      piece(g, E(2, y - 1, 3.6, 1.6, 8), fur, 0.5);
      return { x: 5, y: y - 15, s: 0.8 };
    },
  },
  {
    id: 'golem', name: 'Golem Mini', rarity: 2, tag: 'Normal',
    desc: 'Menahan satu serangan untukmu tiap 30 detik.',
    skins: [
      { name: 'Batu', c: { stone: '#6a6470', core: 'rgba(255,150,60,.9)', eye: '#ffb040', rim: 'fire' } },
      { name: 'Kristal', c: { stone: '#4a7ab8', core: 'rgba(140,230,255,.9)', eye: '#bff0ff', rim: 'ice' } },
      { name: 'Giok', c: { stone: '#3a8a6a', core: 'rgba(170,255,140,.9)', eye: '#d8ff8a', rim: 'moss' } },
    ],
    draw(g, p) {
      const c = skinOf(this, p), wd = Math.sin(p.w) * p.m, y = -Math.abs(wd) * 1.2, st = H(c.stone, c.rim);
      bone(g, -3, y - 5, -3 - wd * 2, 0, 3, 3, 2.6, dim(st)); bone(g, 3, y - 5, 3 + wd * 2, 0, 3, 3, 2.6, st);
      piece(g, [[-8, y - 5], [-9, y - 14], [-4, y - 19], [5, y - 19], [9, y - 13], [8, y - 5]], st, 2.4);
      g.save(); g.globalCompositeOperation = 'lighter'; g.lineWidth = 1; g.strokeStyle = c.core;
      g.beginPath(); g.moveTo(-5, y - 15); g.lineTo(-2, y - 11); g.lineTo(-4, y - 7); g.moveTo(4, y - 16); g.lineTo(2, y - 12); g.stroke(); g.restore();
      glow(g, 0, y - 11, 5, c.core, 0.6 + Math.sin(p.t * 3) * 0.2);
      eye(g, 2, y - 15, 1.2, c.eye); eye(g, 6, y - 15, 1.1, c.eye);
      bone(g, -7, y - 15, -10, y - 8 + wd, 2.6, 2.8, 2.4, dim(st)); bone(g, 8, y - 15, 11, y - 8 - wd, 2.6, 2.8, 2.4, st);
      return { x: 0, y: y - 19, s: 1 };
    },
  },
  {
    id: 'eyebat', name: 'Mata Bersayap', rarity: 2, tag: 'Aneh', fly: true,
    desc: 'Melihat menembus kabut: peta terbuka lebih luas.',
    skins: [
      { name: 'Merah Muda', c: { wing: '#5a2a6a', iris: '#b02a8a', glow: 'rgba(255,90,200,.8)', rim: 'void' } },
      { name: 'Emas', c: { wing: '#6a4a14', iris: '#e0a020', glow: 'rgba(255,200,80,.8)', rim: 'gold' } },
      { name: 'Hijau Racun', c: { wing: '#2a4a2a', iris: '#4ad84a', glow: 'rgba(120,255,100,.8)', rim: 'moss' } },
    ],
    draw(g, p) {
      const c = skinOf(this, p), y = -16 + hover(p, 2.4), fl = flap(p, 10);
      batWing(g, -1, y - 1, 11, fl, dim(P(c.wing, c.rim)), true);
      piece(g, E(0, y, 6.4, 6.4, 16), P('#f0e4e0', c.rim), 1.4);
      g.strokeStyle = 'rgba(200,40,60,.55)'; g.lineWidth = 0.5; for (const a of [2.4, 2.9, 3.6, 4]) { g.beginPath(); g.moveTo(Math.cos(a) * 6, y + Math.sin(a) * 6); g.lineTo(Math.cos(a) * 3, y + Math.sin(a) * 3.4); g.stroke(); }
      const lx = Math.sin(p.t * 0.7) * 1.2 + 1;
      g.beginPath(); g.arc(lx, y, 3.2, 0, TAU); g.fillStyle = c.iris; g.fill();
      g.beginPath(); g.ellipse(lx + 0.3, y, 0.9, 2.4, 0, 0, TAU); g.fillStyle = '#0b0710'; g.fill();
      glow(g, lx, y, 6, c.glow, 0.4);
      batWing(g, 1, y - 2, 13, fl, P(c.wing, c.rim));
      return { x: 0, y: y - 6.4, s: 0.9 };
    },
  },
  {
    id: 'icewisp', name: 'Roh Kecil', rarity: 3, tag: 'Normal', fly: true,
    desc: 'Roh pengikut: yang es membekukan, yang api membakar musuh yang menyentuhmu.',
    skins: [
      { name: 'Es', c: { body: '#bfe8ff', glow: 'rgba(140,220,255,.8)', iris: '#2a6aa8', shard: '#e0f6ff', rim: 'ice' } },
      { name: 'Api', c: { body: '#ffb060', glow: 'rgba(255,150,60,.8)', iris: '#8a2a0a', shard: '#fff0a0', rim: 'fire' } },
      { name: 'Hantu', c: { body: '#b8ffd8', glow: 'rgba(120,255,190,.8)', iris: '#1a6a4a', shard: '#e8fff4', rim: 'ghost' } },
    ],
    draw(g, p) {
      const c = skinOf(this, p), y = -15 + hover(p, 2);
      glow(g, 0, y, 14, c.glow, 0.5);
      piece(g, [[-6, y + 2], [-5, y - 6], [0, y - 10], [5, y - 6], [6, y + 2], [3, y + 7 + Math.sin(p.t * 5) * 1.5], [0, y + 4], [-3, y + 8 + Math.sin(p.t * 5 + 1) * 1.5]], P(c.body, c.rim), 1.6);
      cuteEye(g, -1, y - 3, 1.5, c.iris, p.t); cuteEye(g, 3, y - 3, 1.5, c.iris, p.t);
      for (let i = 0; i < 3; i++) { const a = p.t * 2 + i * TAU / 3, x = Math.cos(a) * 11, yy = y + Math.sin(a) * 4; piece(g, [[x, yy - 3], [x + 1.4, yy], [x, yy + 3], [x - 1.4, yy]], P(c.shard, c.rim), 0.4); }
      return { x: 0, y: y - 10, s: 0.9 };
    },
  },
  {
    id: 'mimic', name: 'Mimic', rarity: 3, tag: 'Aneh',
    desc: 'Peti harta hidup. Kadang memuntahkan permata.',
    skins: [
      { name: 'Kayu', c: { wood: '#7a4a24', lid: '#8a5a2c', trim: '#c9a24a', tongue: '#d8405a', eye: '#ffd24a', rim: 'gold' } },
      { name: 'Emas Raja', c: { wood: '#c8962e', lid: '#e0b040', trim: '#fff0b0', tongue: '#d8405a', eye: '#ff4d6d', rim: 'gold', sparkle: true } },
      { name: 'Hampa', c: { wood: '#2a1a3e', lid: '#3a2452', trim: '#b98cff', tongue: '#ff4dd2', eye: '#c08aff', rim: 'void' } },
    ],
    draw(g, p) {
      const c = skinOf(this, p), hop = Math.max(0, Math.sin(p.w * 1.8)) * 4 * p.m, y = -hop - 2, open = 0.25 + Math.max(0, Math.sin(p.t * 1.3)) * 0.5;
      for (const dx of [-6, -2, 3, 7]) bone(g, dx, y, dx + Math.sin(p.w + dx) * p.m * 2, 0, 1.4, 1.2, 1, P('#5a2a1a'));
      piece(g, [[-10, y], [-10, y - 8], [10, y - 8], [10, y]], H(c.wood, c.rim), 1.6);
      g.save(); g.translate(-10, y - 8); g.rotate(-open);
      piece(g, [[0, 0], [0, -4], [4, -7], [16, -7], [20, -4], [20, 0]], P(c.lid, c.rim), 1.4);
      g.fillStyle = '#efe6d2'; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(2 + i * 3, 0); g.lineTo(3.5 + i * 3, 2.4); g.lineTo(5 + i * 3, 0); g.fill(); }
      g.restore();
      piece(g, [[-9, y - 8], [9, y - 8], [9, y - 7], [-9, y - 7]], P('#1a0610'), 0.2);
      g.fillStyle = '#efe6d2'; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(-8 + i * 3, y - 8); g.lineTo(-6.5 + i * 3, y - 10.4); g.lineTo(-5 + i * 3, y - 8); g.fill(); }
      piece(g, [[5, y - 9], [12, y - 12 + Math.sin(p.t * 6) * 2], [15, y - 9], [9, y - 8]], P(c.tongue), 0.5);
      for (const x of [-10, 0, 10]) piece(g, [[x - 1, y], [x - 1, y - 8], [x + 1, y - 8], [x + 1, y]], P(c.trim, 'gold'), 0.3);
      eye(g, -3, y - 11, 1.2, c.eye); eye(g, 2, y - 11.5, 1.1, c.eye);
      if (c.sparkle) for (let i = 0; i < 4; i++) { const a = p.t * 1.5 + i * 1.6; star5(g, Math.cos(a) * 13, y - 6 + Math.sin(a * 1.3) * 7, 1.4, `rgba(255,240,180,${0.5 + Math.sin(p.t * 4 + i) * 0.5})`); }
      return { x: 0, y: y - 15, s: 1.1 };
    },
  },
  {
    id: 'mooncat', name: 'Kucing Bulan', rarity: 4, tag: 'Aneh', fly: true,
    desc: 'Melayang dengan lingkar gerhana. Malam hari: +10% kecepatan serang.',
    skins: [
      { name: 'Gerhana', c: { fur: '#2a2240', ring: '255,210,130', eye: '#ffd070', mote: 'rgba(200,180,255,.9)', rim: 'void' } },
      { name: 'Matahari', c: { fur: '#f0c070', ring: '255,140,60', eye: '#5a2a0a', mote: 'rgba(255,200,120,.9)', rim: 'gold' } },
      { name: 'Bulan Perak', c: { fur: '#d8dcec', ring: '170,210,255', eye: '#3a6ab8', mote: 'rgba(200,225,255,.9)', rim: 'sky' } },
    ],
    draw(g, p) {
      const c = skinOf(this, p), y = -12 + hover(p, 2);
      g.save(); g.globalCompositeOperation = 'lighter';
      g.lineWidth = 1.6; g.strokeStyle = `rgba(${c.ring},${0.6 + Math.sin(p.t * 2) * 0.2})`; g.beginPath(); g.arc(-1, y - 12, 7, 0, TAU); g.stroke();
      g.restore(); g.beginPath(); g.arc(-1.6, y - 12.4, 6.2, 0, TAU); g.fillStyle = 'rgba(8,6,16,.9)'; g.fill();
      for (let i = 0; i < 5; i++) { const k = (p.t * 0.4 + i / 5) % 1; glow(g, -9 - k * 10, y + 1 - Math.sin(k * 4) * 3, 2.4, c.mote, (1 - k) * 0.8); }
      const fur = H(c.fur, c.rim);
      piece(g, [[-8, y + 1], [-14, y - 3 + Math.sin(p.t * 2) * 2], [-16, y - 8], [-13, y - 7], [-10, y - 2]], fur, 0.8);
      piece(g, E(-1, y - 1, 8, 4.4, 14), fur, 1.6);
      for (const dx of [-5, 3]) piece(g, [[dx - 1.4, y + 2], [dx - 1, y + 5], [dx + 1.4, y + 5], [dx + 1.4, y + 2]], fur, 0.4);
      piece(g, E(6, y - 5, 4.6, 4, 12), fur, 1.2);
      piece(g, [[3, y - 8], [3.6, y - 12], [5.6, y - 8.6]], fur, 0.4); piece(g, [[7, y - 8.6], [9, y - 12], [9.4, y - 7.6]], fur, 0.4);
      eye(g, 6, y - 5, 1.1, c.eye); eye(g, 9, y - 5.2, 1, c.eye);
      return { x: 6, y: y - 9, s: 0.8 };
    },
  },
  {
    id: 'phoenix', name: 'Phoenix Kecil', rarity: 4, tag: 'Mitos', fly: true,
    desc: 'Sekali per perjalanan, menghidupkanmu kembali saat tumbang.',
    skins: [
      { name: 'Api', c: { body: '#ff7a2a', head: '#ff9a3a', wing: '#e85a1a', tip: '#ffd060', tail: '#ffb030', core: '#fff0a0', fire: 'rgba(255,120,30,.85)', trail: 'rgba(255,150,50,.95)', rim: 'fire' } },
      { name: 'Api Biru', c: { body: '#3a8aff', head: '#6ab0ff', wing: '#1a5ad8', tip: '#bff0ff', tail: '#8ad8ff', core: '#ffffff', fire: 'rgba(80,170,255,.85)', trail: 'rgba(120,200,255,.95)', rim: 'sky' } },
      { name: 'Api Gerhana', c: { body: '#6a2ab8', head: '#8a4ad8', wing: '#3a1a6a', tip: '#ff8ad8', tail: '#d070ff', core: '#ffd0ff', fire: 'rgba(200,90,255,.85)', trail: 'rgba(220,130,255,.95)', rim: 'void' } },
    ],
    draw(g, p) {
      const c = skinOf(this, p), y = -18 + hover(p, 2.4), fl = flap(p, 8);
      for (let i = 0; i < 7; i++) { const k = (p.t * 0.9 + i / 7) % 1; glow(g, -6 - k * 16, y + 2 + k * 4 + Math.sin(k * 9 + p.t) * 2, 3.4 * (1 - k) + 1, c.trail, (1 - k) * 0.8); }
      featherWing(g, 0, y - 1, 13, fl, dim(P(c.wing, c.rim)), dim(P(c.tip, c.rim)), true);
      piece(g, [[-5, y + 1], [-14, y + 4], [-16, y + 9], [-11, y + 6], [-12, y + 11], [-6, y + 4]], P(c.tail, c.rim), 0.8);
      piece(g, E(0, y, 6, 4.4, 14), H(c.body, c.rim), 1.4);
      piece(g, E(6, y - 5, 3.6, 3.4, 12), P(c.head, c.rim), 1);
      piece(g, [[8.6, y - 6], [12.6, y - 4.6], [8.6, y - 3.6]], P('#ffd24a'), 0.4);
      flames(g, [[4, y - 8], [6, y - 9], [8, y - 8]], p.t, c.core, c.fire, 1.8);
      eye(g, 6.8, y - 5.6, 1, c.core);
      featherWing(g, 1, y - 2, 15, fl, P(c.wing, c.rim), P(c.tip, c.rim));
      glow(g, 0, y, 16, c.trail, 0.35);
      return { x: 6, y: y - 9, s: 0.7 };
    },
  },
  {
    id: 'babydragon', name: 'Anak Naga', rarity: 5, tag: 'Mitos', fly: true,
    desc: 'Menyemburkan napas kecil ke musuh terdekat.',
    skins: [
      { name: 'Hijau', c: { scale: '#3a8a5a', belly: '#d8e0a0', wing: '#2f6a44', iris: '#c8a020', core: '#fff0a0', breath: 'rgba(255,120,30,.85)', rim: 'moss' } },
      { name: 'Merah', c: { scale: '#b8302a', belly: '#ffd090', wing: '#7a1a14', iris: '#ffd24a', core: '#fff0a0', breath: 'rgba(255,120,30,.85)', rim: 'fire' } },
      { name: 'Es', c: { scale: '#5a9ad8', belly: '#e8f4ff', wing: '#2a5a9a', iris: '#1a3a6a', core: '#ffffff', breath: 'rgba(130,210,255,.85)', rim: 'ice' } },
      { name: 'Emas', c: { scale: '#d8a030', belly: '#fff4c8', wing: '#9a6a14', iris: '#c8302a', core: '#ffffff', breath: 'rgba(255,220,120,.85)', rim: 'gold' } },
    ],
    draw(g, p) {
      const c = skinOf(this, p), y = -16 + hover(p, 2.4), fl = flap(p, 7), sc = H(c.scale, c.rim);
      batWing(g, -1, y - 3, 12, fl, dim(P(c.wing, c.rim)), true);
      piece(g, [[-6, y], [-13, y - 1 + Math.sin(p.t * 3) * 2], [-17, y - 4], [-14, y + 1], [-7, y + 3]], sc, 0.8);
      piece(g, [[-16, y - 4], [-19, y - 7], [-18, y - 2]], sc, 0.3);
      piece(g, E(-1, y, 7, 5, 14), sc, 1.6);
      piece(g, E(-1, y + 2, 4.4, 2.4, 10), P(c.belly), 0.5);
      for (const dx of [-4, 2]) { bone(g, dx, y + 3, dx - 1, y + 7, 1.8, 1.8, 1.4, sc); claws(g, { x: dx - 2, y: y + 7.4 }); }
      piece(g, E(7, y - 6, 5.4, 4.6, 14), sc, 1.4);
      piece(g, [[4, y - 10], [2, y - 15], [6, y - 10.6]], P('#e8dcc0'), 0.3); piece(g, [[8, y - 10.4], [9, y - 15], [10, y - 10]], P('#e8dcc0'), 0.3);
      cuteEye(g, 8.4, y - 7, 1.9, c.iris, p.t);
      if (Math.sin(p.t * 1.4) > 0.7) flames(g, [[13, y - 4], [16, y - 4.4]], p.t * 2, c.core, c.breath, 1.8);
      batWing(g, 0, y - 4, 14, fl, P(c.wing, c.rim));
      return { x: 7, y: y - 10.6, s: 0.9 };
    },
  },
];

// ─── hats (pet cosmetic) ───────────────────────────────────────────────────
export const HATS = [
  { id: 'none', name: 'Tanpa' },
  { id: 'crown', name: 'Mahkota' },
  { id: 'wizard', name: 'Topi Penyihir' },
  { id: 'horns', name: 'Tanduk Iblis' },
  { id: 'bow', name: 'Pita' },
  { id: 'halo', name: 'Lingkaran Malaikat' },
  { id: 'flowers', name: 'Mahkota Bunga' },
];
// head: what a pet's draw() returned
export function drawHat(g, id, head, t) {
  if (!head || id === 'none') return;
  const { x, y } = head, s = head.s || 1;
  g.save(); g.translate(x, y); g.scale(s, s);
  if (id === 'crown') {
    piece(g, [[-4.5, 0], [-5, -5], [-2.5, -2.6], [0, -6.4], [2.5, -2.6], [5, -5], [4.5, 0]], P('#e0b040', 'gold'), 0.6);
    for (const [gx, gy, c] of [[0, -1.6, '#ff4d6d'], [-3, -1.4, '#4ab0ff'], [3, -1.4, '#4ae08a']]) { g.beginPath(); g.arc(gx, gy, 0.8, 0, TAU); g.fillStyle = c; g.fill(); }
    glow(g, 0, -3, 6, 'rgba(255,220,120,.8)', 0.3 + Math.sin(t * 3) * 0.15);
  } else if (id === 'wizard') {
    piece(g, [[-6, 0], [6, 0], [4, -1.6], [1.6, -10], [-1, -12 + Math.sin(t * 2) * 0.6], [-2, -9], [-4, -1.6]], P('#3a2a8a', 'void'), 0.8);
    piece(g, [[-6.4, 0.6], [6.4, 0.6], [6, -1], [-6, -1]], P('#2a1a6a'), 0.3);
    star5(g, 0.6, -5, 1.4, '#ffe070'); star5(g, -2, -2.6, 0.8, '#ffe070');
  } else if (id === 'horns') {
    piece(g, [[-3.5, 0], [-6, -3], [-5.4, -7], [-4, -4], [-1.6, -1]], P('#a8201a', 'fire'), 0.5);
    piece(g, [[3.5, 0], [6, -3], [5.4, -7], [4, -4], [1.6, -1]], P('#a8201a', 'fire'), 0.5);
  } else if (id === 'bow') {
    piece(g, [[0, -1], [-5, -4], [-5.4, 1.4], [0, -0.4]], P('#ff6aa8', 'rose'), 0.5);
    piece(g, [[0, -1], [5, -4], [5.4, 1.4], [0, -0.4]], P('#ff6aa8', 'rose'), 0.5);
    g.beginPath(); g.arc(0, -0.8, 1.3, 0, TAU); g.fillStyle = '#ffb0d0'; g.fill();
  } else if (id === 'halo') {
    const hy = -5 + Math.sin(t * 2) * 0.8;
    glow(g, 0, hy, 9, 'rgba(255,240,170,.9)', 0.5);
    g.beginPath(); g.ellipse(0, hy, 5.4, 1.6, 0, 0, TAU); g.lineWidth = 1.4; g.strokeStyle = '#fff2b0'; g.stroke();
  } else if (id === 'flowers') {
    const cols = ['#ff9ac8', '#ffe070', '#ffffff', '#b89aff', '#ff8a6a'];
    for (let i = 0; i < 5; i++) {
      const fx = -5 + i * 2.5, fy = -1 - Math.sin((i / 4) * Math.PI) * 1.4;
      for (let k = 0; k < 5; k++) { const a = k * TAU / 5 + t * 0.4; g.beginPath(); g.arc(fx + Math.cos(a) * 1, fy + Math.sin(a) * 1, 0.8, 0, TAU); g.fillStyle = cols[i]; g.fill(); }
      g.beginPath(); g.arc(fx, fy, 0.5, 0, TAU); g.fillStyle = '#ffd24a'; g.fill();
    }
  }
  g.restore();
}

// ─── trails & auras (both) ─────────────────────────────────────────────────
export const TRAILS = [
  { id: 'none', name: 'Tanpa' },
  { id: 'fire', name: 'Jejak Api' },
  { id: 'frost', name: 'Jejak Es' },
  { id: 'petals', name: 'Kelopak Bunga' },
  { id: 'stars', name: 'Debu Bintang' },
  { id: 'shadow', name: 'Bayangan' },
];
// behind a creature of length len, at height y0 (0 on the ground; flyers trail from the body)
export function drawTrail(g, id, t, moving, len, y0 = 0) {
  if (id === 'none') return;
  const n = 12, speed = moving ? 1.1 : 0.35;
  for (let i = 0; i < n; i++) {
    const k = (t * speed + i / n) % 1, x = -len * 0.4 - k * len * (moving ? 1.6 : 0.5), a = 1 - k;
    const y = y0 - (id === 'fire' ? k * 10 : id === 'petals' ? Math.sin(k * 6 + i) * 3 + k * 4 : id === 'stars' ? Math.sin(i * 2.3) * 5 : 0);
    if (id === 'fire') { glow(g, x, y - 2, 6 * a + 2, 'rgba(255,120,30,.95)', a * 0.8); glow(g, x, y - 2, 2.4, 'rgba(255,240,160,.9)', a); }
    else if (id === 'frost') {
      if (!y0) { g.beginPath(); g.ellipse(x, y, 4 * a + 1, 1.2, 0, 0, TAU); g.fillStyle = `rgba(200,235,255,${a * 0.5})`; g.fill(); }
      const sx = x + Math.sin(i * 3) * 3, sy = y - 4 - k * 8;
      g.save(); g.translate(sx, sy); g.rotate(t + i); g.strokeStyle = `rgba(220,245,255,${a})`; g.lineWidth = 0.7;
      g.beginPath(); for (let r = 0; r < 3; r++) { const q = r * Math.PI / 3; g.moveTo(-Math.cos(q) * 2, -Math.sin(q) * 2); g.lineTo(Math.cos(q) * 2, Math.sin(q) * 2); } g.stroke(); g.restore();
    } else if (id === 'petals') {
      g.save(); g.translate(x, y - 3); g.rotate(t * 2 + i); g.beginPath(); g.ellipse(0, 0, 2, 1, 0, 0, TAU);
      g.fillStyle = ['rgba(255,150,200,', 'rgba(255,220,120,', 'rgba(255,255,255,'][i % 3] + a + ')'; g.fill(); g.restore();
    } else if (id === 'stars') { glow(g, x, y - 4, 4, 'rgba(170,200,255,.9)', a * 0.7); star5(g, x, y - 4, 1.4 * a + 0.4, `rgba(255,255,255,${a})`); }
    else if (id === 'shadow') { g.beginPath(); g.ellipse(x, y - 6, 6 * a + 2, 7 * a + 2, 0, 0, TAU); g.fillStyle = `rgba(30,10,50,${a * 0.45})`; g.fill(); glow(g, x, y - 6, 4, 'rgba(150,80,255,.8)', a * 0.25); }
  }
}
export const AURAS = [
  { id: 'none', name: 'Tanpa' },
  { id: 'gold', name: 'Cahaya Emas', rgb: '255,200,90' },
  { id: 'void', name: 'Pusaran Hampa', rgb: '170,90,255' },
  { id: 'holy', name: 'Cahaya Suci', rgb: '255,250,210' },
  { id: 'blood', name: 'Darah Bulan', rgb: '255,60,80' },
];
// a glow under the feet with sparks rising; r: about half the creature's length
export function drawAura(g, id, t, r) {
  const a = AURAS.find((q) => q.id === id);
  if (!a?.rgb) return;
  g.save(); g.globalCompositeOperation = 'lighter';
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, r * 1.2);
  gr.addColorStop(0, `rgba(${a.rgb},.45)`); gr.addColorStop(1, `rgba(${a.rgb},0)`);
  g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, r * 1.2, r * 0.32, 0, 0, TAU); g.fill();
  g.lineWidth = 1; g.strokeStyle = `rgba(${a.rgb},${0.5 + Math.sin(t * 3) * 0.2})`;
  g.beginPath(); g.ellipse(0, 0, r * (0.9 + Math.sin(t * 2) * 0.05), r * 0.24, 0, 0, TAU); g.stroke();
  for (let i = 0; i < 8; i++) { const k = (t * 0.6 + i / 8) % 1; glow(g, Math.cos(i * 2.4) * r * 0.8, -k * r * 1.1, 2.4, `rgba(${a.rgb},.95)`, (1 - k) * 0.8); }
  g.restore();
}

// A mount with its rider: drawDoll (art/doll.js) is passed in so this file stays art-only.
export function drawRidden(g, mount, pose, rider, drawDoll) {
  g.save();
  mount.back(g, pose);
  if (rider) {
    const s = mount.saddle, b = mount.b || 0;
    g.save(); g.translate(s.x, s.y + b + 12.5); g.scale(0.82, 0.82);
    drawDoll(g, rider.classId, rider.look, { t: pose.t });
    g.restore();
  }
  mount.front(g, pose);
  g.restore();
}

// drawing helpers shared with the majestic mounts (art/mounts.js)
export const kit = { RIM, P, H, E, piece, bone, leg, hoof, claws, eye, cuteEye, batWing, featherWing, flames, swing, hover, flap, star5, saddle };
