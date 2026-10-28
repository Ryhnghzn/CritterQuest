// Style-D Warrior: angular dark-comic hero with a cape and a sword. Gear changes the
// silhouette by tier (helm 0–6, armour 0–6, boots, weapon 0–6) and the glow by rarity
// (trims, runes and gems in the rarity colour; Mitos burns with molten cracks).
import { RARITIES, MYTHIC } from '../../data/items.js';
import { cel, fillPoly, limbPts, glow, pal, dim, mix, INK, TAU } from './cel.js';

const RIM = 'rgba(255,92,60,.9)';
const SKIN = pal('#b77656', { shade: '#3a1b1d', hi: '#f2b98e' });
const CLOTH = pal('#77161f', { shade: '#22060d', hi: '#c43c36', hatch: true });
const LEATHER = pal('#4a3428', { shade: '#170d0e', hi: '#7c5a40' });
const PANTS = pal('#2e2630', { shade: '#110c12', hi: '#55485a' });
const GOLD = pal('#b07a26', { shade: '#3a2008', hi: '#ffe08a' });
const METAL = [ // by tier: dull iron → bright steel → dark steel
  pal('#66656c'), pal('#6c6b73'), pal('#7b7e8a'), pal('#80848f'), pal('#8a90a0', { hi: '#f1e3c4' }), pal('#8d93a3', { hi: '#f1e3c4' }), pal('#5e5a6a', { hi: '#e8d7ff' }),
];
const BLADE = [pal('#77777c'), pal('#7d7f86'), pal('#868a94'), pal('#8a8f9c'), pal('#3a3442', { hi: '#e2d8e4' }), pal('#3a3442', { hi: '#e2d8e4' }), pal('#2e2836', { hi: '#f0e2f0' })];
const rimmed = (P) => ({ ...P, rim: RIM });
const rcol = (piece) => (piece && piece.rarity >= 1 ? RARITIES[piece.rarity].color : '#8a6a3a');

export function hairPalette([main, shade]) {
  return { base: main, shade: mix(shade, '#0b0710', 0.5), hi: mix(main, '#fff1d6', 0.35), rim: RIM };
}

// ——— legs ———
function leg(g, R, hip, knee, foot, back, boots) {
  const d = (P) => (back ? dim(P) : rimmed(P));
  fillPoly(g, limbPts(hip, knee, 12.4, 13, 9), back ? dim(PANTS) : PANTS, 3.4);
  if (boots) {
    const M = METAL[boots.tier];
    fillPoly(g, limbPts(knee, foot, 9.2, 10, 7.4, 0.3), d(M), 3);
    fillPoly(g, [[knee.x - 3.2, knee.y], [knee.x + 1.2, knee.y - 4.4], [knee.x + 5.4, knee.y], [knee.x + 1.2, knee.y + 4.2]], back ? dim(M) : M, 1.6);
    if (boots.tier >= 4) fillPoly(g, [[knee.x + 2.4, knee.y - 1.4], [knee.x + 7.4, knee.y - 3.2], [knee.x + 3.4, knee.y + 1]], back ? dim(M) : M, 1);
    if (boots.rarity >= 2 && !back) { g.beginPath(); g.moveTo(knee.x - 2.6, knee.y + 3); g.lineTo(foot.x + 2.6, foot.y - 4.6); g.lineWidth = 0.8; g.strokeStyle = rcol(boots); g.stroke(); }
  } else {
    fillPoly(g, limbPts(knee, foot, 8.6, 9.2, 7, 0.3), back ? dim(PANTS) : PANTS, 2.8);
  }
  const x = foot.x, y = foot.y, B = boots ? METAL[boots.tier] : LEATHER;
  fillPoly(g, [[x - 4.8, y - 5.2], [x + 3, y - 5.8], [x + 6.2, y - 2.2], [x + 10.6, y + 0.2], [x + 10.6, y + 2.6], [x - 5.2, y + 2.6]], back ? dim(B) : B, 2.2);
}

// ——— arms ———
function arm(g, R, sh, el, hand, back, armor) {
  const t = armor ? armor.tier : -1, M = armor ? METAL[armor.tier] : null;
  const d = (P) => (back ? dim(P) : rimmed(P));
  fillPoly(g, limbPts(sh, el, 9.6, 10.8, 8), d(t >= 4 ? M : SKIN), 3.2);
  fillPoly(g, limbPts(el, hand, 8.6, 9.2, 7, 0.25), d(t >= 2 ? M : LEATHER), 2.8);
  const h = hand, G = t >= 4 ? M : SKIN;
  fillPoly(g, [[h.x - 3.8, h.y - 3], [h.x + 2.8, h.y - 4], [h.x + 4.4, h.y + 0.7], [h.x + 1.2, h.y + 4.2], [h.x - 3.6, h.y + 2.8]], back ? dim(G) : G, 2);
}

function pauldron(g, at, lean, back, armor) {
  if (!armor) return;
  const t = armor.tier, M = t >= 2 ? METAL[t] : LEATHER, P = back ? dim(M) : M;
  g.save(); g.translate(at.x - 0.4, at.y + 2.4); g.rotate(lean + 0.25);
  const sc = (back ? 0.8 : 1.12) * (t >= 4 ? 1 : t >= 2 ? 0.82 : 0.66);
  g.scale(sc, sc);
  if (t >= 6) { fillPoly(g, [[-1.8, -6.6], [-5, -16], [2.2, -7.4]], P, 1.6); fillPoly(g, [[3, -6.4], [5.4, -13], [6.6, -5.6]], P, 1.4); }
  else if (t >= 4) fillPoly(g, [[0, -6.8], [2.2, -11.6], [4.2, -6.4]], P, 1.2);
  fillPoly(g, [[-7.4, 2], [-6.4, -4], [0, -7.6], [8.4, -5], [9.4, 1.2], [3, -0.8]], back ? P : rimmed(M), 3.6);
  if (t >= 4) fillPoly(g, [[-5.4, 5.4], [-4.4, 1.2], [3, 0.4], [8.4, 3.6], [2, 5.8]], P, 2.4);
  if (!back) { g.beginPath(); g.moveTo(-7, 1.6); g.lineTo(3, -0.8); g.lineTo(9.2, 1); g.lineWidth = 1; g.strokeStyle = rcol(armor); g.stroke(); }
  g.restore();
}

function cape(g, R, armor) {
  const t = R.t, mv = Math.max(R.moving, R.swing), W = R.W, tier = armor ? armor.tier : -1;
  const a = W(-6, -23), b = W(2.4, -24.2), back = -12 - mv * 13 - Math.sin(t * 1.6) * 1.6;
  const bottom = -14 + (tier + 1) * 1.5;
  const w = (i) => Math.sin(t * 3 + i * 1.4) * (1.2 + mv * 1.8);
  const pts = [[b.x, b.y], [back + 9, bottom + w(0)]];
  const n = 7;
  for (let i = 1; i <= n; i++) pts.push([back + 9 - (i / n) * 19 - mv * 4 * (i / n), bottom + w(i) + (i % 2 ? -5 : 0) - (i / n) * 4]);
  pts.push([back - 4, -24 + (bottom + 14) * 0.3], [a.x, a.y]);
  fillPoly(g, pts, CLOTH, 4.5);
  if (tier >= 2) {
    g.beginPath(); g.moveTo(pts[1][0], pts[1][1]); for (let i = 2; i < pts.length - 2; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.lineWidth = 1.1; g.strokeStyle = armor.rarity >= 2 ? rcol(armor) : '#b08a3a'; g.stroke();
  }
}

// ——— torso (spine frame: origin = hip, up = −y, front = +x) ———
function torso(g, R, armor) {
  const t = R.t, tier = armor ? armor.tier : -1;
  g.save(); g.translate(R.hip.x, R.hip.y); g.rotate(R.lean); g.scale(1.22, 1);
  fillPoly(g, [[-8.4, -23], [10.6, -23.4], [8.6, -12], [6.4, -2], [-6.4, -2], [-8.6, -12]], tier < 0 ? CLOTH : LEATHER, 3.5);
  if (tier < 0) { // bare: a leather strap across the tunic
    fillPoly(g, [[-6.4, -22.6], [-3.4, -23.2], [8.6, -6], [5.6, -5.2]], LEATHER, 1.2, 0.5, 0.9);
  } else {
    const M = tier >= 2 ? METAL[tier] : pal('#6a4a34'), tc = rcol(armor);
    fillPoly(g, [[-6.4, -23.6], [3.6, -25.4], [11.4, -22.4], [11, -15], [6.8, -9], [0, -8], [-6.6, -11.4]], rimmed(M), 4);
    g.beginPath(); g.moveTo(3.6, -25.4); g.lineTo(4.2, -16); g.lineTo(0, -8); g.lineWidth = 0.8; g.strokeStyle = INK; g.stroke();
    g.beginPath(); g.moveTo(-6.4, -19); g.lineTo(4.2, -16.4); g.lineTo(11.2, -18.4); g.lineWidth = 1; g.strokeStyle = tc; g.stroke();
    if (tier >= 4) { g.beginPath(); g.moveTo(-6.4, -13.6); g.lineTo(4.2, -11.6); g.lineTo(9.6, -13); g.lineWidth = 0.9; g.strokeStyle = tc; g.stroke(); }
    if (armor.rarity >= 3) {
      const c = RARITIES[armor.rarity].color, p = 0.6 + 0.4 * Math.sin(t * 3);
      fillPoly(g, [[6.6, -15.4], [8.6, -12.8], [6.6, -10.2], [4.6, -12.8]], pal(c, { hi: '#fff4f6' }), 1, 0.6, 0.8);
      glow(g, 6.6, -12.8, 9, c, 0.6 * p);
    }
    if (armor.rarity === MYTHIC) { // molten cracks across the plate
      g.save(); g.globalCompositeOperation = 'lighter';
      g.beginPath(); g.moveTo(-4, -21); g.lineTo(-1, -18); g.lineTo(-3, -15); g.lineTo(0, -12); g.moveTo(9, -21); g.lineTo(7.4, -18.4);
      g.lineWidth = 0.7; g.strokeStyle = `rgba(255,90,70,${0.6 + 0.4 * Math.sin(t * 4)})`; g.stroke();
      g.restore();
    }
    if (tier >= 2) fillPoly(g, [[-7.4, -2.8], [-1.4, -2.8], [-2.6, 5.4], [-8.6, 3]], M, 2);
  }
  for (const y of [-7.6, -4.8]) fillPoly(g, [[-6.4, y], [7.2, y - 0.6], [7, y + 2], [-6.4, y + 2.4]], LEATHER, 1.2, 0.6, 0.9);
  fillPoly(g, [[2.6, -6.8], [4.6, -7.6], [6, -5.6], [4, -4.6]], GOLD, 1, 0.5, 0.8);
  const sw = Math.sin(t * 3 + 1) * 0.8 - R.moving * 2.2;
  fillPoly(g, [[0.4, -2.6], [7.4, -2.8], [6.6 + sw, 9.6], [4.2 + sw, 15.6], [1.6 + sw, 9.4]], CLOTH, 2.6);
  g.restore();
}

// ——— head (local: centre of the head) ———
const HAIR = [
  { front: [[5.4, -4.6], [4.6, -8.2], [0, -9.2], [-4.6, -7.8], [-6, -4], [-5.6, -0.4], [-4, 1.2], [-3.4, -2.6], [0.6, -5.4], [3.6, -5]] },
  { front: [[5.6, -5.2], [4.4, -9], [1, -9.8], [-0.8, -12.4], [-2.4, -9.8], [-6.4, -11.6], [-5.6, -8.4], [-9.6, -8.4], [-6.6, -5.8], [-10, -3.4], [-5.8, -2.6], [-5.2, 1.8], [-3.6, -2], [0, -5.6], [3, -5.4]] },
  { back: (sw) => [[3, -7], [-6.6, -7.6], [-7.4, 2], [-6.8 + sw, 13], [-2 + sw * 0.5, 11], [-1.6, 2]], front: [[5.6, -4.6], [3.6, -9], [-2, -9.4], [-6, -6.6], [-5.4, -2], [-3.2, -4], [1, -6], [3.6, -5.2]] },
  { front: [[5.4, -4.6], [3.8, -9], [-1.6, -9.6], [-6.4, -6.4], [-7, 1], [-5.6, 5.6], [-2.6, 5.2], [-2.8, 0], [-1.6, -3], [2.4, -5], [4.2, -4]] },
  { back: (sw) => [[-5, -7], [-9 + sw, -5], [-12 + sw, 2], [-10.4 + sw, 8], [-8.6 + sw, 3], [-6.4, -3.6]], front: [[5.4, -4.6], [4.4, -8.6], [-0.6, -9.6], [-5.4, -7], [-5.8, -2.6], [-4, -0.6], [-3.2, -3.4], [0.6, -5.6], [3.8, -5]], tie: [-6, -5.2] },
];

function helmKind(helm) {
  if (!helm) return null;
  return helm.tier <= 1 ? 'cap' : helm.tier <= 3 ? 'nasal' : helm.tier <= 5 ? 'great' : 'crown';
}

function head(g, R, look, helm, hairP) {
  const t = R.t, kind = helmKind(helm), closed = kind === 'great' || kind === 'crown';
  const hs = HAIR[look.hair] || HAIR[0], sw = Math.sin(t * 2) * 0.8 - R.moving * 2;
  g.save(); g.translate(R.hip.x, R.hip.y); g.rotate(R.lean * 0.45); g.translate(3.4, -30.2);
  fillPoly(g, [[-2.4, 4.6], [4.4, 4.2], [5.4, 8.4], [-3, 8.6]], SKIN, 2);
  if (hs.back && !closed) fillPoly(g, hs.back(sw), hairP, 2.4);
  if (!closed) {
    fillPoly(g, [[-4.6, -3], [-3, -7.4], [2, -8.2], [5.2, -5], [5.6, -2.6], [5, -1.8], [6.8, 1.2], [5.4, 1.8], [5.7, 3.2], [4.7, 5.6], [2.2, 6.6], [-1.2, 4.8], [-3.6, 2.4], [-4.8, 0]], rimmed(SKIN), 3.8);
    fillPoly(g, [[-1.8, -0.6], [0, -1.2], [0.4, 1.8], [-1.4, 2.4]], SKIN, 1, 0.5, 0.8);
    const blink = R.hurt || t % 3.9 < 0.12;
    if (blink) { g.beginPath(); g.moveTo(3.4, -1.3); g.lineTo(5.1, -1.2); g.lineWidth = 0.8; g.strokeStyle = INK; g.stroke(); }
    else {
      g.beginPath(); g.moveTo(3.4, -1.7); g.lineTo(5.1, -1.9); g.lineTo(4.5, -0.8); g.closePath(); g.fillStyle = INK; g.fill();
      g.beginPath(); g.arc(4.5, -1.4, 0.45, 0, TAU); g.fillStyle = '#ffcf8a'; g.fill();
    }
    g.beginPath(); g.moveTo(1.8, R.hurt ? -3.8 : -3.4); g.lineTo(5.8, -2.6); g.lineWidth = 1.3; g.strokeStyle = INK; g.stroke();
    g.beginPath(); g.moveTo(4.2, 3.6); g.lineTo(5.6, R.hurt ? 3.9 : 3.3); g.lineWidth = 0.6; g.stroke();
    fillPoly(g, hs.front, hairP, 2.4); // a cap / nasal helm is drawn over it
    if (hs.tie) fillPoly(g, [[hs.tie[0] - 1, hs.tie[1] - 1.4], [hs.tie[0] + 1.2, hs.tie[1] - 1], [hs.tie[0] + 0.6, hs.tie[1] + 1.4], [hs.tie[0] - 1.4, hs.tie[1] + 1]], GOLD, 0.8, 0.4, 0.8);
  }
  if (kind) helmet(g, kind, helm, t);
  g.restore();
}

function helmet(g, kind, helm, t) {
  const M = METAL[helm.tier], tc = rcol(helm);
  if (kind === 'cap') {
    fillPoly(g, [[5.8, -4.2], [4.8, -8.8], [0, -10.2], [-5.4, -8.6], [-6.6, -3.2], [-5.8, -2.4], [5.8, -4.2]], rimmed(LEATHER), 2.6);
    g.beginPath(); g.moveTo(-6.4, -3.4); g.lineTo(5.8, -4.6); g.lineWidth = 1; g.strokeStyle = tc; g.stroke();
    return;
  }
  if (kind === 'nasal') {
    fillPoly(g, [[5.8, -3.4], [5.2, -8.6], [0, -10.6], [-5.6, -8.6], [-6.4, -2], [-5.6, 1.6], [-3.8, 1.4], [-3.6, -2.6], [5.8, -3.4]], rimmed(M), 3);
    fillPoly(g, [[4.6, -3.6], [6.2, -3.6], [6, 1], [5, 1.2]], M, 1, 0.5, 0.9);
    g.beginPath(); g.moveTo(-6.2, -3.4); g.lineTo(5.8, -4.2); g.lineWidth = 1.1; g.strokeStyle = tc; g.stroke();
    return;
  }
  fillPoly(g, [[-5.8, 6.4], [-6.4, -3], [-6, -9], [0, -10.4], [6.4, -9.4], [7, -2.5], [7, 6.2], [1, 7.8]], rimmed(M), 3.6);
  g.beginPath(); g.moveTo(2.6, -10); g.lineTo(2.6, 7.4); g.lineWidth = 0.8; g.strokeStyle = INK; g.stroke();
  g.beginPath(); g.moveTo(-6.3, -3.6); g.lineTo(7, -3.4); g.lineWidth = 1; g.strokeStyle = tc; g.stroke();
  g.beginPath(); g.rect(1.6, -1.8, 5.4, 1.5); g.rect(3.8, -1.8, 1.4, 5.6); g.fillStyle = '#05030a'; g.fill();
  const eye = helm.rarity >= 2 ? RARITIES[helm.rarity].color : '#ffcf8a', p = 0.75 + 0.25 * Math.sin(t * 4);
  g.save(); g.globalAlpha = p; g.fillStyle = eye; g.fillRect(1.8, -1.5, 5, 0.9); g.restore();
  glow(g, 4.4, -1, 6, eye, 0.8 * p);
  if (kind === 'crown') {
    for (const [bx, h, lean] of [[-4.2, 8, -0.5], [-0.6, 10, -0.15], [3, 8, 0.2]]) {
      g.save(); g.translate(bx, -8.6); g.rotate(lean);
      fillPoly(g, [[-1.4, 0.6], [0.6, -h], [1.6, 0.6]], GOLD, 1, 0.5, 0.9);
      g.restore();
    }
    if (helm.rarity >= 3) glow(g, -0.6, -16, 7, RARITIES[helm.rarity].color, 0.35 + 0.15 * Math.sin(t * 3));
  }
}

const bladeLen = (tier) => 25 + tier * 1.6;

// ——— shield on the off hand, turned towards the viewer; shape by weapon tier ———
const WOOD = pal('#6a4a30', { hatch: true });
function shield(g, R, weapon) {
  const tier = weapon ? weapon.tier : 0, rar = weapon ? weapon.rarity : 0, t = R.t;
  const c = RARITIES[rar].color, M = METAL[tier], tc = rar >= 1 ? c : '#8a6a3a';
  g.save(); g.translate(R.hB.x + 3.4, R.hB.y - 0.6); g.rotate(-0.06 + (R.phiB - 1.2) * 0.3); g.scale(0.74, 1);
  if (tier <= 1) { // round wooden shield with an iron rim and boss
    const ring = (r, n = 14) => Array.from({ length: n }, (_, i) => [Math.cos((i / n) * TAU) * r, Math.sin((i / n) * TAU) * r]);
    fillPoly(g, ring(11.5), rimmed(M), 3);
    fillPoly(g, ring(9.6), WOOD, 3.4);
    for (const x of [-4.6, 0, 4.6]) { g.beginPath(); g.moveTo(x, -9.2); g.lineTo(x, 9.2); g.lineWidth = 0.6; g.strokeStyle = 'rgba(0,0,0,.5)'; g.stroke(); }
    fillPoly(g, ring(3.2, 8), M, 1.2, 0.6, 0.9);
  } else {
    const kite = tier >= 4;
    const outer = kite ? [[-11, -14], [11, -14], [11.4, -3], [7, 8.6], [0, 17], [-7, 8.6], [-11.4, -3]] : [[-10, -12], [10, -12], [10, -2], [6, 7.4], [0, 12.6], [-6, 7.4], [-10, -2]];
    fillPoly(g, outer, rimmed(M), 4);
    const inner = outer.map(([x, y]) => [x * 0.78, y * 0.8 - 0.6]);
    fillPoly(g, inner, kite ? pal('#3a2a44') : pal('#6a1a22'), 3);
    g.beginPath(); g.moveTo(0, inner[0][1]); g.lineTo(0, inner[4][1]); g.moveTo(inner[6][0], -3.4); g.lineTo(inner[2][0], -3.4);
    g.lineWidth = 1.4; g.strokeStyle = tc; g.stroke();
    if (rar >= 3) { // glowing gem at the crossing
      const p = 0.6 + 0.4 * Math.sin(t * 3);
      fillPoly(g, [[0, -6.4], [2.4, -3.4], [0, -0.4], [-2.4, -3.4]], pal(c, { hi: '#fff4f6' }), 1, 0.6, 0.8);
      glow(g, 0, -3.4, 10, c, 0.55 * p);
    }
    if (tier >= 6) for (const sx of [-1, 1]) fillPoly(g, [[sx * 9, -14], [sx * 14, -20], [sx * 11.4, -11]], GOLD, 1, 0.5, 0.9);
    if (rar === MYTHIC) {
      g.save(); g.globalCompositeOperation = 'lighter';
      g.beginPath(); g.moveTo(-7, -10); g.lineTo(-4, -6); g.lineTo(-6, -1); g.moveTo(6, 4); g.lineTo(3, 7); g.lineTo(4, 11);
      g.lineWidth = 0.8; g.strokeStyle = `rgba(255,90,70,${0.6 + 0.4 * Math.sin(t * 4)})`; g.stroke();
      g.restore();
    }
  }
  g.restore();
}

// ——— sword (weapon frame: grip at origin, blade along +x) ———
function sword(g, R, weapon) {
  const tier = weapon ? weapon.tier : 0, rar = weapon ? weapon.rarity : 0, t = R.t;
  const L = bladeLen(tier), w = 2.5 + tier * 0.22, c = RARITIES[rar].color;
  g.save(); g.translate(R.hF.x, R.hF.y); g.rotate(Math.atan2(Math.cos(R.psi), Math.sin(R.psi)));
  fillPoly(g, [[-6.6, 0], [-5.2, -1.6], [-3.8, 0], [-5.2, 1.6]], GOLD, 1, 0.5, 0.8);
  fillPoly(g, [[-4, -1.3], [3, -1.4], [3, 1.4], [-4, 1.3]], LEATHER, 1, 0.4, 0.8);
  fillPoly(g, [[5.6, -w], [L - 9, -w - 0.4], [L, 0], [L - 9, w + 0.4], [5.6, w]], BLADE[tier], 2.2, 0.9, 1.1);
  const p = 0.65 + 0.35 * Math.sin(t * 5);
  if (rar >= 2) {
    g.save(); g.globalCompositeOperation = 'lighter';
    g.beginPath(); g.moveTo(7, 0.2);
    const n = Math.round((L - 12) / 3.6);
    for (let i = 1; i <= n; i++) g.lineTo(7 + i * 3.6, (rar === MYTHIC ? (i % 2 ? -1.1 : 1.1) : 0) * (1 - i / (n + 2)));
    g.lineWidth = rar === MYTHIC ? 0.9 : 0.6; g.strokeStyle = c; g.globalAlpha = p; g.stroke();
    if (rar >= 4) { g.beginPath(); g.moveTo(L - 9, -w - 0.4); g.lineTo(L, 0); g.lineTo(L - 9, w + 0.4); g.lineWidth = 0.7; g.stroke(); }
    g.restore();
  }
  if (rar >= 3) for (let i = 0; i < 4; i++) glow(g, 11 + i * (L - 14) / 4, 0, 7, c, (rar - 2) * 0.12 * p);
  if (tier >= 4) fillPoly(g, [[3, -1.6], [3.6, -8.6], [7.2, -6.4], [5.8, -1.6], [5.8, 1.6], [7.2, 6.4], [3.6, 8.6], [3, 1.6]], GOLD, 1.4, 0.6, 0.9);
  else if (tier >= 2) fillPoly(g, [[3, -1.6], [4.4, -6.2], [6, -5.6], [5.6, -1.6], [5.6, 1.6], [6, 5.6], [4.4, 6.2], [3, 1.6]], GOLD, 1.2, 0.6, 0.9);
  else fillPoly(g, [[3.2, -4.6], [5.4, -4.6], [5.4, 4.6], [3.2, 4.6]], tier ? METAL[tier] : LEATHER, 1, 0.5, 0.9);
  if (rar >= 3) { g.beginPath(); g.arc(4.4, 0, 1.2, 0, TAU); g.fillStyle = c; g.fill(); glow(g, 4.4, 0, 4, c, 0.8); }
  g.restore();
}

// sword trail that follows the real tip path: re-pose the rig a few moments back
function trail(g, R, pose, rig, weapon) {
  if (R.trail <= 0) return;
  const tier = weapon ? weapon.tier : 0, L = bladeLen(tier), c = weapon && weapon.rarity >= 1 ? RARITIES[weapon.rarity].color : '#ffd9a8';
  const tips = [], mids = [], step = R.prof === 'snappy' ? 0.016 : 0.011;
  for (let j = 0; j < 12; j++) {
    const b = R.attack - j * step;
    if (b < 0) break;
    const Q = j ? rig('warrior', { ...pose, attack: b }) : R, dx = Math.sin(Q.psi), dy = Math.cos(Q.psi);
    tips.push([Q.hF.x + dx * L, Q.hF.y + dy * L]);
    mids.push([Q.hF.x + dx * L * 0.5, Q.hF.y + dy * L * 0.5]);
  }
  if (tips.length < 2) return;
  g.save(); g.globalCompositeOperation = 'lighter';
  const ribbon = (inner, col, al) => {
    g.beginPath();
    tips.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    for (let i = tips.length - 1; i >= 0; i--) {
      const k = inner * (1 - i / tips.length) + i / tips.length;
      g.lineTo(tips[i][0] + (mids[i][0] - tips[i][0]) * k, tips[i][1] + (mids[i][1] - tips[i][1]) * k);
    }
    g.closePath(); g.globalAlpha = al * R.trail; g.fillStyle = col; g.fill();
  };
  ribbon(1, c, 0.45);
  ribbon(0.35, '#fff0d8', 0.8);
  g.restore();
}

export function drawWarrior(g, R, look, gear, pose, rig, hairP) {
  const { helm, armor, boots, weapon } = gear;
  cape(g, R, armor);
  arm(g, R, R.sB, R.eB, R.hB, true, armor);
  pauldron(g, R.sB, R.lean, true, armor);
  leg(g, R, R.hipB, R.kB, R.fB, true, boots);
  leg(g, R, R.hipF, R.kF, R.fF, false, boots);
  torso(g, R, armor);
  head(g, R, look, helm, hairP);
  shield(g, R, weapon);
  sword(g, R, weapon);
  arm(g, R, R.sF, R.eF, R.hF, false, armor);
  pauldron(g, R.sF, R.lean, false, armor);
  trail(g, R, pose, rig, weapon);
}
