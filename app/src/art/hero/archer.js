// Style-D Archer: slim and tall, long hooded cloak, quiver on the back, a tall recurve
// bow. The string hand draws back along the arrow (rig: draw, nock). Gear: hood by helm
// tier, leather → studded → scale by armour tier, bow ornaments by weapon tier; rarity
// colours the trims, fletching and the bow string.
import { RARITIES, MYTHIC } from '../../data/items.js';
import { fillPoly, glow, pal, dim, INK } from './cel.js';
import { SKIN, LEATHER, GOLD, WOOD, METAL, rcol, withRim, face, hairBack, hairFront, leg, arm } from './common.js';

export const RIM = 'rgba(90,230,140,.9)';
const CLOAK = pal('#2c4a2e', { shade: '#0c1a10', hi: '#5f8a4c', hatch: true });
const TUNIC = pal('#3c5a32', { shade: '#122014', hi: '#7a9a5a' });
const JERKIN = pal('#5a3e2a', { shade: '#1a0f0c', hi: '#94704a' });
const PANTS = pal('#33302a', { shade: '#12100c', hi: '#5c584c' });
const rimmed = (P) => withRim(P, RIM);
const BOW_WOOD = pal('#9a7044', { shade: '#3a2414', hi: '#e0b880' });
const BOW_DARK = pal('#4a3a5a', { shade: '#1a1222', hi: '#cbb8d8' });

function cloak(g, R, armor) {
  const t = R.t, mv = Math.max(R.moving, R.swing), W = R.W, tier = armor ? armor.tier : -1;
  const a = W(-4.8, -23), b = W(2, -24), back = -9 - mv * 12 - Math.sin(t * 1.5) * 1.4;
  const bottom = -7 + Math.min(tier, 4) * 0.8;
  const w = (i) => Math.sin(t * 2.6 + i * 1.3) * (1 + mv * 1.6);
  const pts = [[b.x, b.y], [back + 7, bottom + w(0)]];
  for (let i = 1; i <= 5; i++) pts.push([back + 7 - (i / 5) * 13 - mv * 3 * (i / 5), bottom + w(i) + (i % 2 ? -2.6 : 0) - (i / 5) * 3]);
  pts.push([back - 2, -22], [a.x, a.y]);
  fillPoly(g, pts, CLOAK, 4);
  if (armor && armor.rarity >= 2) {
    g.beginPath(); g.moveTo(pts[1][0], pts[1][1]); for (let i = 2; i < pts.length - 2; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.lineWidth = 0.9; g.strokeStyle = rcol(armor); g.stroke();
  }
}

function quiver(g, R, weapon) {
  const p = R.W(-5.5, -17), c = rcol(weapon, '#d8d0b8');
  g.save(); g.translate(p.x, p.y); g.rotate(R.lean - 0.45);
  for (const [x, l] of [[-1.6, 15], [0.4, 16.5], [2.2, 15.5]]) {
    g.beginPath(); g.moveTo(x, -6); g.lineTo(x, -l); g.lineWidth = 0.7; g.strokeStyle = '#6a5a44'; g.stroke();
    fillPoly(g, [[x - 1.2, -l + 3], [x, -l - 1.4], [x + 1.2, -l + 3], [x, -l + 1.6]], pal(c), 0.6, 0.3, 0.6);
  }
  fillPoly(g, [[-3.4, -7], [3.8, -7.4], [3.2, 11], [-2.8, 11.4]], rimmed(LEATHER), 2);
  g.beginPath(); g.moveTo(-3.2, -4.6); g.lineTo(3.6, -5); g.lineWidth = 0.9; g.strokeStyle = rcol(weapon); g.stroke();
  g.restore();
}

function torso(g, R, armor) {
  const t = R.t, tier = armor ? armor.tier : -1;
  g.save(); g.translate(R.hip.x, R.hip.y); g.rotate(R.lean); g.scale(0.94, 1.04);
  const body = [[-6.6, -23], [8.4, -23.2], [7, -12], [5.8, -2], [-5.8, -2], [-7, -12]];
  fillPoly(g, body, rimmed(tier < 0 ? TUNIC : JERKIN), 3.4);
  if (tier >= 0) {
    const tc = rcol(armor);
    if (tier >= 4) { // scale mail over the chest
      const M = METAL[tier];
      fillPoly(g, [[-5.6, -22.4], [7.6, -22.6], [7, -13], [-5.8, -13.4]], rimmed(M), 3);
      for (let y = -21; y < -13; y += 2.4) for (let x = -5; x < 7; x += 2.6) {
        g.beginPath(); g.arc(x + ((y / 2.4) % 2 ? 1.3 : 0), y, 1.3, 0, Math.PI); g.lineWidth = 0.5; g.strokeStyle = INK; g.stroke();
      }
    } else if (tier >= 2) { // studs
      for (const [x, y] of [[-3, -19], [0, -19.4], [3, -19.6], [6, -19.2], [-2, -15], [1.4, -15.2], [4.8, -15]]) {
        g.beginPath(); g.arc(x, y, 0.7, 0, Math.PI * 2); g.fillStyle = '#c8c0b0'; g.fill();
      }
    }
    fillPoly(g, [[-5.6, -22.8], [-3, -23.2], [7.6, -7.2], [5, -6.6]], LEATHER, 1.2, 0.5, 0.9); // baldric
    g.beginPath(); g.moveTo(-5.8, -12.4); g.lineTo(7, -12); g.lineWidth = 0.9; g.strokeStyle = tc; g.stroke();
    if (armor.rarity >= 3) {
      const c = RARITIES[armor.rarity].color, p = 0.6 + 0.4 * Math.sin(t * 3);
      fillPoly(g, [[1.6, -9.4], [3.2, -7.6], [1.6, -5.8], [0, -7.6]], pal(c, { hi: '#fff4f6' }), 1, 0.5, 0.8);
      glow(g, 1.6, -7.6, 7, c, 0.5 * p);
    }
  }
  fillPoly(g, [[-6, -6.6], [6.8, -7], [6.6, -4.6], [-6, -4.2]], LEATHER, 1.2, 0.6, 0.9);
  fillPoly(g, [[-5.2, -5], [-1.6, -5], [-1.8, 0], [-5, 0.4]], JERKIN, 1.2, 0.5, 0.8); // pouch
  const sw = Math.sin(t * 3 + 1) * 0.8 - R.moving * 2;
  fillPoly(g, [[-5.6, -2.6], [6, -2.6], [5.4 + sw, 7], [2 + sw, 9.4], [-1 + sw, 7.4], [-5.2 + sw * 0.6, 8]], tier < 0 ? TUNIC : CLOAK, 2.6);
  g.restore();
}

function hood(g, R, look, helm, hairP) {
  const tier = helm ? helm.tier : -1, t = R.t, tc = rcol(helm);
  g.save(); g.translate(R.hip.x, R.hip.y); g.rotate(R.lean * 0.45); g.translate(2.4, -31.8);
  fillPoly(g, [[-1, 4.6], [3.6, 4.4], [4.4, 9.4], [-1.6, 9.6]], SKIN, 2);
  if (tier < 2) { // bare head (tier 0–1: the hood lies on the shoulders)
    hairBack(g, R, look, hairP);
    face(g, R, RIM);
    hairFront(g, look, hairP);
    if (tier >= 0) fillPoly(g, [[-8, 4], [-4, 1.6], [4, 4.4], [6.6, 7.4], [1, 10.2], [-8.4, 9.4]], rimmed(CLOAK), 2.6);
  } else {
    const sw = Math.sin(t * 2) * 0.6 - R.moving * 1.6;
    fillPoly(g, [[7, 6.4], [8.2, -2.6], [4.4, -10], [-1.4, -12.4], [-7, -9], [-12.6 + sw, -2.6], [-9, 2], [-7, 9.4]], rimmed(CLOAK), 4);
    g.beginPath(); g.moveTo(6.6, 5.8); g.lineTo(7.4, -2.4); g.lineTo(4.4, -7); g.lineTo(0.6, -5.4); g.lineTo(0.2, 5); g.closePath(); g.fillStyle = '#060509'; g.fill();
    g.save(); g.beginPath(); g.moveTo(6.6, 5.8); g.lineTo(7.4, -2.4); g.lineTo(4.4, -7); g.lineTo(0.6, -5.4); g.lineTo(0.2, 5); g.closePath(); g.clip();
    if (tier <= 3) face(g, R, RIM);
    else { // shadowed face, two glowing eyes, a cloth mask
      const eye = helm.rarity >= 2 ? RARITIES[helm.rarity].color : '#9dffb0', p = 0.75 + 0.25 * Math.sin(t * 3.5);
      for (const ex of [5.4, 3]) { g.beginPath(); g.moveTo(ex - 1, -1.6); g.lineTo(ex + 1, -2); g.lineWidth = 0.9; g.strokeStyle = '#eafff0'; g.stroke(); glow(g, ex, -1.8, 3.6, eye, p); }
      fillPoly(g, [[0, 1], [7.4, 0.6], [7, 6], [0, 6]], pal('#2a3a2a'), 1.6, 0.5, 0.8);
    }
    g.restore();
    g.beginPath(); g.moveTo(7.4, -2.4); g.lineTo(4.4, -7); g.lineTo(0.6, -5.4); g.lineWidth = 1; g.strokeStyle = tc; g.stroke();
    if (tier >= 4) { g.beginPath(); g.moveTo(-6.6, -7.4); g.lineTo(5, -7.6); g.lineWidth = 1.2; g.strokeStyle = '#c9a24a'; g.stroke(); }
    if (tier >= 6) for (const [x, h, r] of [[-5, 9, -0.6], [-2, 11, -0.3], [1.4, 8, 0]]) { // feather / antler crown
      g.save(); g.translate(x, -10.4); g.rotate(r);
      fillPoly(g, [[-1, 0.6], [0, -h], [1.2, 0.6]], pal(helm.rarity >= 1 ? RARITIES[helm.rarity].color : '#c9a24a'), 0.8, 0.4, 0.8);
      g.restore();
    }
  }
  g.restore();
}

// bow frame: grip at the origin, +x = where the arrow flies, limbs along ±y
function bow(g, R, weapon) {
  const tier = weapon ? weapon.tier : 0, rar = weapon ? weapon.rarity : 0, t = R.t;
  const H = 21 + tier * 1.3, c = RARITIES[rar].color, sx = -3 - R.draw * 17 * R.nock;
  g.save(); g.translate(R.hF.x, R.hF.y); g.rotate(Math.atan2(Math.cos(R.psi), Math.sin(R.psi)));
  const limb = (s) => [[2.2, 0], [1.2, s * H * 0.35], [-2.2, s * H * 0.8], [-0.8, s * H], [0.8, s * (H + 2.2)], [-4.4, s * H * 0.84], [-1.8, s * H * 0.38], [-1.8, 0]];
  const P = tier >= 4 ? BOW_DARK : BOW_WOOD;
  for (const s of [-1, 1]) fillPoly(g, limb(s), rimmed(P), 0.9, 0.7, 1.1);
  if (tier >= 4) for (const s of [-1, 1]) fillPoly(g, [[-1.6, s * H * 0.8], [0.6, s * (H + 3.6)], [-0.6, s * H * 0.9]], GOLD, 1, 0.5, 0.8);
  fillPoly(g, [[-2, -3], [2, -3], [2, 3], [-2, 3]], LEATHER, 1, 0.4, 0.8);
  // string (pulled back while nocked)
  g.beginPath(); g.moveTo(-1.2, -H - 0.6); g.lineTo(sx, 0); g.lineTo(-1.2, H + 0.6);
  g.lineWidth = 0.6; g.strokeStyle = rar >= 2 ? c : '#e8e2d0'; g.stroke();
  if (rar >= 2) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.5 + 0.3 * Math.sin(t * 5); g.lineWidth = 1.4; g.stroke(); g.restore(); }
  if (rar >= 3) for (const s of [-1, 1]) glow(g, -2.2, s * H * 0.6, 6, c, (rar - 2) * 0.15);
  if (R.nock > 0.05) { // arrow on the string
    const tip = sx + 26;
    g.beginPath(); g.moveTo(sx, 0); g.lineTo(tip - 2, 0); g.lineWidth = 0.9; g.strokeStyle = '#8a6a44'; g.stroke();
    fillPoly(g, [[tip - 3, -1.4], [tip + 1, 0], [tip - 3, 1.4]], METAL[3], 0.6, 0.3, 0.6);
    fillPoly(g, [[sx + 0.4, 0], [sx + 4, -1.8], [sx + 5, 0], [sx + 4, 1.8]], pal(rar >= 1 ? c : '#d8d0b8'), 0.6, 0.3, 0.6);
    if (rar >= 3) glow(g, tip, 0, 5, c, 0.6 * R.draw);
  }
  if (rar === MYTHIC) glow(g, 0, 0, 10, c, 0.25 + 0.15 * Math.sin(t * 3));
  g.restore();
}

export function drawArcher(g, R, look, gear, pose, rig, hairP) {
  const { helm, armor, boots, weapon } = gear, tier = armor ? armor.tier : -1;
  const sleeve = tier >= 0 ? JERKIN : TUNIC, bracer = tier >= 4 ? METAL[tier] : LEATHER;
  const drawing = R.nock > 0.3;
  cloak(g, R, armor);
  quiver(g, R, weapon);
  if (!drawing) arm(g, R.sB, R.eB, R.hB, true, { w: 0.92, upper: sleeve, fore: bracer, rim: RIM });
  leg(g, R.hipB, R.kB, R.fB, true, { w: 0.92, pants: PANTS, boots, rim: RIM });
  leg(g, R.hipF, R.kF, R.fF, false, { w: 0.92, pants: PANTS, boots, rim: RIM });
  torso(g, R, armor);
  hood(g, R, look, helm, hairP);
  bow(g, R, weapon);
  arm(g, R.sF, R.eF, R.hF, false, { w: 0.92, upper: sleeve, fore: bracer, rim: RIM });
  if (drawing) arm(g, R.sB, R.eB, R.hB, false, { w: 0.92, upper: dim(sleeve), fore: bracer, rim: RIM });
}
