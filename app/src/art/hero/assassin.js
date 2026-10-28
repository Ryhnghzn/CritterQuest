// Style-D Assassin: the smallest hero, always crouched, a long scarf trailing behind, a
// cloth mask, two reverse-grip daggers. Gear: bandana → hood → hood with a full mask and
// glowing eyes → horned hood (helm tier); vest → guards → dark plates (armour tier);
// dagger length and curve (weapon tier); rarity colours edges, eyes and runes.
import { RARITIES, MYTHIC } from '../../data/items.js';
import { fillPoly, glow, pal, dim, TAU } from './cel.js';
import { SKIN, LEATHER, METAL, rcol, withRim, face, hairBack, hairFront, leg, arm, trail } from './common.js';

export const RIM = 'rgba(170,110,255,.9)';
const SUIT = pal('#2c2836', { shade: '#0c0a12', hi: '#5a5470' });
const WRAP = pal('#3e3546', { shade: '#120e16', hi: '#6e6078' });
const SCARF = pal('#8a1e3c', { shade: '#2e0816', hi: '#e05a74', hatch: true });
const DARK = pal('#3a3446', { shade: '#0e0c14', hi: '#9a90b8' });
const MASK = pal('#24202c', { shade: '#0a080e', hi: '#4c4658' });
const rimmed = (P) => withRim(P, RIM);
const STEEL = pal('#a8acba', { shade: '#3a3c48', hi: '#f4f0ff' });

function scarf(g, R) {
  const t = R.t, mv = Math.max(R.moving, R.swing), n = R.W(0.6, -24.6);
  for (const [len, ph, wid] of [[28, 0, 5], [21, 1.7, 4]]) {
    const pts = [];
    const seg = 7;
    for (let i = 0; i <= seg; i++) {
      const k = i / seg;
      pts.push([n.x - k * (len + mv * 12), n.y + k * (8 - mv * 4) + Math.sin(t * 6 + ph - k * 4) * (1.5 + mv * 2.5) * k]);
    }
    const up = pts.map(([x, y], i) => [x, y - wid * (1 - (i / seg) * 0.5)]);
    fillPoly(g, [...up, ...pts.slice().reverse()], SCARF, 2);
  }
}

function torso(g, R, armor) {
  const t = R.t, tier = armor ? armor.tier : -1;
  g.save(); g.translate(R.hip.x, R.hip.y); g.rotate(R.lean); g.scale(0.9, 0.96);
  fillPoly(g, [[-6.4, -23], [8, -23.2], [6.6, -12], [5.4, -2], [-5.4, -2], [-6.6, -12]], rimmed(SUIT), 3.4);
  // crossing straps with throwing knives
  fillPoly(g, [[-5.4, -22.6], [-2.8, -23], [7.2, -7], [4.8, -6.4]], LEATHER, 1.2, 0.5, 0.9);
  for (const k of [0.3, 0.5, 0.7]) {
    const x = -4 + 10.6 * k, y = -22.8 + 15.8 * k;
    fillPoly(g, [[x - 0.6, y - 2.6], [x + 0.6, y - 2.6], [x + 0.4, y + 1], [x - 0.4, y + 1]], METAL[3], 0.8, 0.4, 0.6);
  }
  if (tier >= 0) {
    const P = tier >= 4 ? DARK : WRAP, tc = rcol(armor, '#6a5a7a');
    fillPoly(g, [[-5.4, -22.8], [3, -24.2], [8.4, -21.6], [7.6, -15], [1, -14], [-5.6, -15.6]], rimmed(P), 3.2);
    g.beginPath(); g.moveTo(-5.4, -18.6); g.lineTo(2.4, -17.6); g.lineTo(8, -18.6); g.lineWidth = 0.9; g.strokeStyle = tc; g.stroke();
    if (armor.rarity >= 3) {
      const c = RARITIES[armor.rarity].color, p = 0.6 + 0.4 * Math.sin(t * 3);
      g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = p;
      g.beginPath(); g.moveTo(-3, -21); g.lineTo(-1, -19); g.lineTo(-2.4, -16.6); g.moveTo(5, -22); g.lineTo(6.4, -19.4);
      g.lineWidth = 0.8; g.strokeStyle = c; g.stroke(); g.restore();
      glow(g, 2, -19, 8, c, 0.35 * p);
    }
    if (armor.rarity === MYTHIC) glow(g, 2, -17, 12, RARITIES[MYTHIC].color, 0.25 + 0.15 * Math.sin(t * 4));
  }
  fillPoly(g, [[-5.8, -6.4], [6.6, -6.8], [6.4, -4.4], [-5.8, -4]], LEATHER, 1.2, 0.6, 0.9);
  fillPoly(g, [[3, -5.6], [5.6, -5.8], [5.4, -1.4], [3.2, -1.2]], LEATHER, 1, 0.4, 0.8);
  const sw = Math.sin(t * 3 + 1) * 0.6 - R.moving * 2.2;
  fillPoly(g, [[-5.4, -2.6], [1.4, -2.6], [0.4 + sw, 7.6], [-4.6 + sw, 6]], WRAP, 2.2);
  g.restore();
}

function pauldron(g, R, armor) {
  if (!armor || armor.tier < 2) return;
  const t = armor.tier, P = t >= 4 ? DARK : WRAP;
  g.save(); g.translate(R.sF.x, R.sF.y + 1.4); g.rotate(R.lean + 0.3);
  fillPoly(g, [[-5, 1.6], [-4, -3.4], [1.4, -5.2], [6.4, -2.4], [5.4, 2.4], [0.4, 0.6]], rimmed(P), 2.6);
  if (t >= 6) for (const x of [-1.6, 2.2]) fillPoly(g, [[x - 1.2, -4.4], [x + 0.4, -10], [x + 1.6, -4.6]], METAL[6], 1, 0.5, 0.8);
  g.restore();
}

function head(g, R, look, helm, hairP) {
  const tier = helm ? helm.tier : -1, t = R.t, tc = rcol(helm, '#6a5a7a');
  const sw = Math.sin(t * 2.4) * 0.8 - R.moving * 2;
  g.save(); g.translate(R.hip.x, R.hip.y); g.rotate(R.lean * 0.3); g.translate(2.2, -31.6);
  fillPoly(g, [[-1, 4.6], [3.4, 4.4], [4.2, 9.4], [-1.6, 9.6]], SKIN, 2);
  if (tier < 4) {
    if (tier < 2) hairBack(g, R, look, hairP);
    face(g, R, RIM, { mask: rimmed(MASK), eye: '#d0b0ff' });
    if (tier < 0) hairFront(g, look, hairP);
    else if (tier <= 1) { // bandana with trailing ends
      hairFront(g, look, hairP);
      fillPoly(g, [[5.8, -4.6], [4.4, -8.6], [-1, -9.8], [-6.2, -7], [-6.4, -4], [5.8, -4.6]], rimmed(SCARF), 2);
      fillPoly(g, [[-6, -6], [-12 + sw, -6 + sw * 0.4], [-11 + sw, -3], [-5.6, -4]], SCARF, 1.4, 0.5, 0.8);
    } else { // hood
      fillPoly(g, [[6.6, -3.2], [5.4, -9.6], [-0.6, -12], [-6.8, -9], [-11 + sw, -2], [-7.4, 4], [-5, 8], [-3.6, -2.4], [0.6, -5.8], [4.2, -5.4]], rimmed(WRAP), 3.4);
      g.beginPath(); g.moveTo(6.6, -3.4); g.lineTo(5.4, -9.4); g.lineWidth = 0.9; g.strokeStyle = tc; g.stroke();
    }
  } else { // hood with a full mask, glowing eyes
    fillPoly(g, [[7, 6], [8, -3], [4.4, -10.4], [-1.4, -12.8], [-7, -9.4], [-12.6 + sw, -2.4], [-8.6, 2], [-6.6, 9]], rimmed(WRAP), 3.8);
    fillPoly(g, [[0.6, -5.4], [4.4, -6.8], [7.2, -2.4], [7, 5.4], [3, 7], [0.4, 5]], rimmed(MASK), 2.4);
    const eye = helm.rarity >= 2 ? RARITIES[helm.rarity].color : '#c9a0ff', p = 0.75 + 0.25 * Math.sin(t * 4);
    for (const ex of [5.4, 3]) { g.beginPath(); g.moveTo(ex - 1, -1.4); g.lineTo(ex + 1, -1.9); g.lineWidth = 0.9; g.strokeStyle = '#f4eaff'; g.stroke(); glow(g, ex, -1.7, 3.8, eye, p); }
    g.beginPath(); g.moveTo(7.2, -2.4); g.lineTo(4.4, -6.8); g.lineTo(0.6, -5.4); g.lineWidth = 1; g.strokeStyle = tc; g.stroke();
    if (tier >= 6) for (const s of [-1, 1]) fillPoly(g, [[-1 + s * 2, -11.4], [-4 + s * 4, -18.6], [-1 + s * 5, -19], [0 + s * 2.6, -11.8]], METAL[6], 1.2, 0.5, 0.9);
  }
  g.restore();
}

const bladeLen = (tier) => 14 + tier;
// dagger frame: fist at the origin, +x along the blade (reverse grip: the blade runs back)
function dagger(g, R, hand, psi, weapon, back) {
  const tier = weapon ? weapon.tier : 0, rar = weapon ? weapon.rarity : 0, L = bladeLen(tier), c = RARITIES[rar].color, t = R.t;
  g.save(); g.translate(hand.x, hand.y); g.rotate(Math.atan2(Math.cos(psi), Math.sin(psi)));
  fillPoly(g, [[-4.6, -1.1], [1.6, -1.2], [1.6, 1.2], [-4.6, 1.1]], LEATHER, 0.8, 0.4, 0.7);
  fillPoly(g, [[1.4, -3], [3, -3], [3, 3], [1.4, 3]], tier >= 4 ? pal('#b07a26') : METAL[tier], 0.8, 0.4, 0.7);
  const curve = tier >= 4 ? 1.8 : 0;
  const blade = [[3, -2.2], [L * 0.6, -2.4 - curve * 0.4], [L, -curve], [L * 0.62, 2 - curve * 0.2], [3, 2]];
  fillPoly(g, blade, back ? dim(STEEL) : rimmed(STEEL), 0.8, 0.8, 0.9);
  if (rar >= 2) {
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.55 + 0.35 * Math.sin(t * 6);
    g.beginPath(); g.moveTo(3.4, -1.7); g.lineTo(L * 0.6, -1.8 - curve * 0.4); g.lineTo(L, -curve); g.lineWidth = 0.7; g.strokeStyle = c; g.stroke(); g.restore();
  }
  if (rar >= 3) glow(g, L * 0.6, 0, 5, c, (rar - 2) * 0.18);
  g.restore();
}

export function drawAssassin(g, R, look, gear, pose, rig, hairP) {
  const { helm, armor, boots, weapon } = gear, tier = armor ? armor.tier : -1;
  const fore = tier >= 4 ? DARK : WRAP;
  scarf(g, R);
  dagger(g, R, R.hB, R.psiB, weapon, true);
  arm(g, R.sB, R.eB, R.hB, true, { w: 0.86, upper: SUIT, fore, rim: RIM });
  leg(g, R.hipB, R.kB, R.fB, true, { w: 0.86, pants: SUIT, boots, rim: RIM, pointed: true });
  leg(g, R.hipF, R.kF, R.fF, false, { w: 0.86, pants: SUIT, boots, rim: RIM, pointed: true });
  torso(g, R, armor);
  head(g, R, look, helm, hairP);
  dagger(g, R, R.hF, R.psi, weapon, false);
  arm(g, R.sF, R.eF, R.hF, false, { w: 0.86, upper: SUIT, fore, rim: RIM });
  pauldron(g, R, armor);
  const L = bladeLen(weapon ? weapon.tier : 0);
  trail(g, R, pose, rig, 'assassin', (Q) => {
    const dx = Math.sin(Q.psi), dy = Math.cos(Q.psi);
    return [[Q.hF.x + dx * L, Q.hF.y + dy * L], [Q.hF.x + dx * 3, Q.hF.y + dy * 3]];
  }, rcol(weapon, '#c9a0ff'));
}
