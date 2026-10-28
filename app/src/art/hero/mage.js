// Style-D Mage: thin and tall, a triangular robe that sweeps the ground, a staff taller
// than the body. Gear: head by helm tier (bare → cowl → pointed hat → deep hood with
// glowing eyes → horned hood), robe layers and mantle by armour tier, staff head by weapon
// tier; the crystal, trims and runes take the rarity colour.
import { RARITIES, MYTHIC } from '../../data/items.js';
import { fillPoly, limbPts, glow, pal, dim, TAU } from './cel.js';
import { SKIN, LEATHER, GOLD, WOOD, rcol, withRim, face, hairBack, hairFront } from './common.js';

export const RIM = 'rgba(80,232,210,.9)';
const ROBE = pal('#2c2347', { shade: '#0c0918', hi: '#5c4a8c', hatch: true });
const MANTLE = pal('#4c1c3c', { shade: '#150612', hi: '#93406e' });
const DARKWOOD = pal('#3a2826', { shade: '#110a0b', hi: '#6c4a3a' });
const BOOT = pal('#33232a', { shade: '#100a0d', hi: '#5e4248' });
const rimmed = (P) => withRim(P, RIM);
const CRYSTAL = '#7fd8ff';

function feet(g, R) {
  for (const [f, back] of [[R.fB, true], [R.fF, false]]) {
    const x = f.x, y = f.y;
    fillPoly(g, [[x - 3.4, y - 3.6], [x + 2, y - 4], [x + 9.4, y + 1.4], [x + 9, y + 2.6], [x - 3.8, y + 2.6]], back ? dim(BOOT) : BOOT, 2);
  }
}

function robe(g, R, armor) {
  const W = R.W, t = R.t, mv = R.moving, tier = armor ? armor.tier : -1, tc = rcol(armor, '#b08a3a');
  const front = Math.max(R.fF.x, R.fB.x) + 7, back = Math.min(R.fF.x, R.fB.x) - 9 - mv * 4;
  const s0 = W(-7.4, -23), s1 = W(9, -22.6), w1 = W(7, -7), w0 = W(-7.2, -8);
  const pts = [[s0.x, s0.y], [s1.x, s1.y], [w1.x, w1.y], [front, 0.6]];
  for (let i = 1; i <= 8; i++) pts.push([front + (back - front) * (i / 8), (i % 2 ? 3.4 : 0) + Math.sin(t * 3 + i) * 0.7]);
  pts.push([back + 2, -10], [w0.x, w0.y]);
  fillPoly(g, pts, rimmed(ROBE), 5);
  const a = W(4, -22.8), b = W(6.2, -9);
  if (tier >= 0) { // trimmed opening
    g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(front - 2.6, 0.4); g.lineWidth = 1.5; g.strokeStyle = tc; g.stroke();
  }
  if (tier >= 2) for (let i = 0; i < 4; i++) {
    const p = { x: b.x + (front - 2.6 - b.x) * (i / 4 + 0.12), y: b.y + (0.4 - b.y) * (i / 4 + 0.12) };
    g.beginPath(); g.moveTo(p.x - 1.2, p.y); g.lineTo(p.x, p.y - 1.4); g.lineTo(p.x + 1.2, p.y); g.lineTo(p.x, p.y + 1.4); g.closePath(); g.fillStyle = tc; g.fill();
  }
  if (armor && armor.rarity === MYTHIC) { // runes glowing along the hem
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.6 + 0.4 * Math.sin(t * 3);
    g.beginPath();
    for (let i = 1; i < 8; i += 2) { const x = front + (back - front) * (i / 8), y = -2; g.moveTo(x - 1, y); g.lineTo(x, y - 2); g.lineTo(x + 1, y); }
    g.lineWidth = 0.8; g.strokeStyle = RARITIES[armor.rarity].color; g.stroke(); g.restore();
  }
  const q = [W(-7.6, -9.6), W(8.2, -10), W(7.8, -6.6), W(-7.4, -6.4)];
  fillPoly(g, q.map((p) => [p.x, p.y]), tier >= 0 ? LEATHER : pal('#3a2f50'), 1.4, 0.6, 0.9);
  const gp = W(4.6, -8.2);
  fillPoly(g, [[gp.x - 2, gp.y], [gp.x, gp.y - 2.2], [gp.x + 2, gp.y], [gp.x, gp.y + 2.2]], GOLD, 1, 0.5, 0.8);
}

function mantle(g, R, armor) {
  if (!armor || armor.tier < 2) return;
  const W = R.W, tier = armor.tier, tc = rcol(armor);
  const collar = tier >= 4 ? [W(-9.4, -24), W(-7.2, -33), W(-3.6, -26)] : [W(-9, -24)];
  const pts = [...collar, W(3, -25.4), W(11, -23.4), W(12, -16), W(7.4, -13.2), W(3, -15.6), W(-2.6, -13), W(-10, -15.4)].map((p) => [p.x, p.y]);
  fillPoly(g, pts, rimmed(MANTLE), 3.4);
  const n = pts.length;
  g.beginPath(); g.moveTo(pts[n - 5][0], pts[n - 5][1]); for (let i = n - 4; i < n; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.lineWidth = 1.1; g.strokeStyle = tc; g.stroke();
  if (armor.rarity >= 3) {
    const c = W(6, -21.4), col = RARITIES[armor.rarity].color;
    fillPoly(g, [[c.x - 2, c.y], [c.x, c.y - 2.6], [c.x + 2, c.y], [c.x, c.y + 2.6]], pal(col, { hi: '#fff4f6' }), 1, 0.5, 0.8);
    glow(g, c.x, c.y, 7, col, 0.6);
  }
}

function head(g, R, look, helm, hairP) {
  const tier = helm ? helm.tier : -1, t = R.t, tc = rcol(helm, '#b08a3a');
  const sw = Math.sin(t * 2) * 0.6 - R.moving * 1.6;
  g.save(); g.translate(R.hip.x, R.hip.y); g.rotate(R.lean * 0.5); g.translate(2.4, -32);
  fillPoly(g, [[-1, 4.6], [3.4, 4.4], [4.2, 9.4], [-1.6, 9.6]], SKIN, 2);
  if (tier < 4) { // face visible
    hairBack(g, R, look, hairP);
    face(g, R, RIM, { eye: '#9ff6ff' });
    if (tier < 0) hairFront(g, look, hairP);
    else if (tier <= 1) { // cowl: a soft hood over the hair
      fillPoly(g, [[6.2, -3.6], [4.6, -9.6], [-1.6, -11.4], [-7, -8], [-10 + sw, -1], [-7, 4], [-4.4, 6.6], [-3.6, -2.6], [1, -5.6]], rimmed(ROBE), 3);
    } else { // pointed hat with a brim
      hairFront(g, look, hairP);
      fillPoly(g, [[-6.2, -6.2], [-5.6, -11], [-6.4 + sw, -17], [-9.4 + sw * 1.2, -21.6], [-14 + sw * 1.5, -23], [-5.4 + sw, -20], [-1.4 + sw * 0.5, -14], [2.4, -9.4], [5.6, -6.6]], rimmed(ROBE), 3.4);
      fillPoly(g, [[-11.6, -5.2], [12, -6.8], [13, -5.2], [-11, -3.6]], ROBE, 1.6, 0.6, 1);
      g.beginPath(); g.moveTo(-5.4, -7.6); g.lineTo(4.6, -8.2); g.lineWidth = 1.2; g.strokeStyle = tc; g.stroke();
    }
  } else { // deep hood, shadowed face, glowing eyes
    fillPoly(g, [[7.2, 6.4], [8.6, -3], [4.4, -10.4], [-1.6, -13.6], [-7, -9.6], [-14 + sw, -3], [-9.4, 1.6], [-7.4, 9.4]], rimmed(MANTLE), 4);
    g.beginPath(); g.moveTo(6.8, 5.8); g.lineTo(7.6, -2.6); g.lineTo(4.4, -7.2); g.lineTo(0.8, -5.4); g.lineTo(0.4, 5); g.closePath(); g.fillStyle = '#050309'; g.fill();
    fillPoly(g, [[0.8, 1.2], [5.2, 0.8], [6.8, 2.2], [6.2, 4.8], [3.6, 6.2], [1, 4.8]], SKIN, 2.6, 0.6, 0.9);
    const eye = helm.rarity >= 2 ? RARITIES[helm.rarity].color : '#7ff6e6', p = 0.75 + 0.25 * Math.sin(t * 3.5);
    for (const ex of [5.6, 3]) { g.beginPath(); g.moveTo(ex - 1.1, -1.6); g.lineTo(ex + 1.1, -2); g.lineWidth = 0.9; g.strokeStyle = '#eafffb'; g.stroke(); glow(g, ex, -1.8, 4, eye, p); }
    g.beginPath(); g.moveTo(7.6, -2.6); g.lineTo(4.4, -7.2); g.lineTo(0.8, -5.4); g.lineWidth = 1.1; g.strokeStyle = tc; g.stroke();
    if (tier >= 6) for (const s of [-1, 1]) { // horns curling from the hood
      fillPoly(g, [[-2 + s * 1.5, -11.6], [-6 + s * 5, -19], [-3 + s * 7, -21], [-1 + s * 3.4, -12.4]], pal('#3a2a2a', { hi: '#a08a7a' }), 1.4, 0.6, 0.9);
    }
  }
  g.restore();
}

function sleeve(g, R, back) {
  const d = (P) => (back ? dim(P) : rimmed(P)), h = R[back ? 'hB' : 'hF'], e = R[back ? 'eB' : 'eF'], s = R[back ? 'sB' : 'sF'];
  fillPoly(g, limbPts(s, e, 7.2, 7.8, 7), d(ROBE), 3);
  fillPoly(g, limbPts(e, { x: h.x + (h.x - e.x) * 0.05, y: h.y + (h.y - e.y) * 0.05 }, 6.6, 7.4, 9.8, 0.6), d(ROBE), 3);
  fillPoly(g, [[h.x - 2.2, h.y - 2], [h.x + 1.8, h.y - 2.4], [h.x + 2.8, h.y + 0.8], [h.x, h.y + 2.6], [h.x - 2.2, h.y + 1.4]], back ? dim(SKIN) : SKIN, 1.6, 0.5, 0.9);
}

// staff frame: hand at the origin, +x = up the staff
function staff(g, R, weapon) {
  const tier = weapon ? weapon.tier : 0, rar = weapon ? weapon.rarity : 0, t = R.t;
  const c = rar >= 1 ? RARITIES[rar].color : CRYSTAL, top = 27 + tier * 1.2;
  g.save(); g.translate(R.hF.x, R.hF.y); g.rotate(Math.atan2(Math.cos(R.psi), Math.sin(R.psi)));
  fillPoly(g, [[-28, -1.1], [-12, -1.6], [10, -1.3], [top, -1.8], [top, 1.8], [10, 1.3], [-12, 1.6], [-28, 1.1]], tier >= 2 ? DARKWOOD : WOOD, 1.2, 0.5, 0.9);
  for (const bx of tier >= 2 ? [-12, 6] : [6]) fillPoly(g, [[bx, -2.2], [bx + 2.4, -2.4], [bx + 2.4, 2.4], [bx, 2.2]], GOLD, 1, 0.5, 0.8);
  const k = 0.75 + 0.25 * Math.sin(t * 4) + R.cast * 0.8, cx = top + 7;
  if (tier <= 1) { // gnarled knob holding a small crystal
    fillPoly(g, [[top - 1, -3.4], [top + 4, -4.4], [top + 6.4, -1], [top + 5, 3.6], [top, 3.4]], rimmed(WOOD), 1.6, 0.6, 0.9);
  } else {
    for (const s of [-1, 1]) fillPoly(g, [[top - 1, s * 1.4], [top + 3, s * (tier >= 4 ? 8.4 : 6.4)], [top + 12.5, s * 4.6], [top + 6, s * 4], [top + 1.6, s * 0.6]], GOLD, 1.6, 0.6, 0.9);
  }
  const size = tier <= 1 ? 2.6 : tier >= 4 ? 4.6 : 3.6;
  glow(g, cx, 0, (10 + tier) * k + R.cast * 12, c, 0.8);
  fillPoly(g, [[cx - size, 0], [cx, -size * 1.15], [cx + size, 0], [cx, size * 1.15]], pal(c, { hi: '#ffffff' }), 1.4, 0.7, 0.9);
  if (tier >= 4) for (let i = 0; i < 3; i++) { // orbiting shards
    const a = t * 2 + (i / 3) * TAU, x = cx + Math.cos(a) * 8.4, y = Math.sin(a) * 4;
    g.beginPath(); g.moveTo(x, y - 1.8); g.lineTo(x + 1, y); g.lineTo(x, y + 1.8); g.lineTo(x - 1, y); g.closePath(); g.fillStyle = '#ffffff'; g.fill();
    glow(g, x, y, 3.4, c, 0.8);
  }
  if (tier >= 6) { g.save(); g.globalCompositeOperation = 'lighter'; g.beginPath(); g.ellipse(cx, 0, 11, 11, 0, 0, TAU); g.lineWidth = 0.8; g.strokeStyle = c; g.globalAlpha = 0.5 + 0.3 * Math.sin(t * 2); g.stroke(); g.restore(); }
  if (R.cast > 0.05) {
    g.save(); g.globalCompositeOperation = 'lighter';
    g.beginPath(); g.arc(cx, 0, 6 + (1 - R.cast) * 20, 0, TAU); g.lineWidth = 2 * R.cast; g.strokeStyle = c; g.stroke();
    g.restore();
  }
  g.restore();
}

export function drawMage(g, R, look, gear, pose, rig, hairP) {
  const { helm, armor, weapon } = gear;
  const c = weapon && weapon.rarity >= 1 ? RARITIES[weapon.rarity].color : CRYSTAL;
  sleeve(g, R, true);
  if (R.cast > 0) glow(g, R.hB.x, R.hB.y, 10 * R.cast, c, 0.8);
  feet(g, R);
  robe(g, R, armor);
  mantle(g, R, armor);
  head(g, R, look, helm, hairP);
  staff(g, R, weapon);
  sleeve(g, R, false);
}
