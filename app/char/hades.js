// Style D — dark graphic-novel look (inspired by Hades' art direction, own designs):
// angular shapes, hard cel shadows in big dark masses, a warm highlight on the lit
// edge, a coloured rim light on the far edge, thin ink lines. Same skeleton (rig.js).
import { rig } from './rig.js';
import { glow } from './heroes.js';

const TAU = Math.PI * 2, INK = '#0b0710';
const LX = -0.74, LY = -0.67; // key light comes from the top-left

// a world direction expressed in the current local frame (unit length)
function ldir(g, vx, vy) {
  const m = g.getTransform(), det = m.a * m.d - m.b * m.c;
  const x = (m.d * vx - m.c * vy) / det, y = (-m.b * vx + m.a * vy) / det, l = Math.hypot(x, y) || 1;
  return [x / l, y / l];
}
// hard cel shading: highlight band (lit side), base, shadow mass (far side), rim light, ink line
function cel(g, build, P, sd = 3, hd = 0.9, lw = 1.2) {
  const [lx, ly] = ldir(g, LX, LY), [rx, ry] = ldir(g, 1, 0.2), BIG = 400;
  const at = (dx, dy) => { g.save(); g.translate(dx, dy); build(); g.restore(); };
  g.save();
  g.beginPath(); build(); g.clip();
  g.fillStyle = P.hi; g.fillRect(-BIG, -BIG, BIG * 2, BIG * 2);
  g.beginPath(); at(-lx * hd, -ly * hd); g.fillStyle = P.base; g.fill();
  g.beginPath(); g.rect(-BIG, -BIG, BIG * 2, BIG * 2); at(lx * sd, ly * sd); g.fillStyle = P.shade; g.fill('evenodd');
  if (P.rim) { g.beginPath(); g.rect(-BIG, -BIG, BIG * 2, BIG * 2); at(-rx * 1.1, -ry * 1.1); g.fillStyle = P.rim; g.fill('evenodd'); }
  if (P.hatch) { // comic hatching inside the shadow
    g.beginPath(); g.rect(-BIG, -BIG, BIG * 2, BIG * 2); at(lx * sd * 0.55, ly * sd * 0.55); g.clip('evenodd');
    g.beginPath();
    for (let i = -60; i < 60; i += 2.2) { g.moveTo(i - 40, -40); g.lineTo(i + 40, 40); }
    g.lineWidth = 0.35; g.strokeStyle = 'rgba(0,0,0,.45)'; g.stroke();
  }
  g.restore();
  g.beginPath(); build(); g.lineWidth = lw; g.strokeStyle = INK; g.lineJoin = 'miter'; g.miterLimit = 3; g.stroke();
}
const poly = (pts) => (g) => () => { g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); };
// angular limb: hexagon with a bulge (muscle) at `at` along the bone
function limbPts(a, b, w1, wm, w2, at = 0.4) {
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, nx = -uy, ny = ux;
  const A = { x: a.x - ux * w1 * 0.3, y: a.y - uy * w1 * 0.3 }, B = { x: b.x + ux * w2 * 0.3, y: b.y + uy * w2 * 0.3 };
  const M = { x: a.x + dx * at, y: a.y + dy * at };
  return [[A.x + nx * w1 / 2, A.y + ny * w1 / 2], [M.x + nx * wm / 2, M.y + ny * wm / 2], [B.x + nx * w2 / 2, B.y + ny * w2 / 2],
    [B.x - nx * w2 / 2, B.y - ny * w2 / 2], [M.x - nx * wm / 2, M.y - ny * wm / 2], [A.x - nx * w1 / 2, A.y - ny * w1 / 2]];
}

const WAR = {
  rim: 'rgba(255,92,60,.95)', accent: '#ff3d5a', eye: '#ffcf8a',
  skin: { base: '#b77656', shade: '#3a1b1d', hi: '#f2b98e' },
  cloth: { base: '#77161f', shade: '#22060d', hi: '#c43c36', hatch: true },
  leather: { base: '#463126', shade: '#170d0e', hi: '#7c5a40' },
  metal: { base: '#77798a', shade: '#1b1824', hi: '#f1e3c4' },
  gold: { base: '#b07a26', shade: '#3a2008', hi: '#ffe08a' },
  hair: { base: '#2a1b1b', shade: '#0d0707', hi: '#6c3a2a' },
  blade: { base: '#3a3442', shade: '#120e16', hi: '#e2d8e4' },
};
const MAG = {
  rim: 'rgba(80,232,210,.95)', accent: '#ff3d8a', eye: '#7ff6e6',
  skin: { base: '#b77656', shade: '#3a1b1d', hi: '#f2b98e' },
  robe: { base: '#2c2347', shade: '#0c0918', hi: '#5c4a8c', hatch: true },
  mantle: { base: '#4c1c3c', shade: '#150612', hi: '#93406e' },
  leather: { base: '#33232a', shade: '#100a0d', hi: '#5e4248' },
  gold: { base: '#b07a26', shade: '#3a2008', hi: '#ffe08a' },
  wood: { base: '#3a2826', shade: '#110a0b', hi: '#6c4a3a' },
};
const withRim = (P, rim) => ({ ...P, rim });

function dim(g, on) { g.filter = on ? 'brightness(0.62) saturate(0.85)' : 'none'; }

// ——— warrior ———
function warLeg(g, R, hip, knee, foot, back) {
  dim(g, back);
  const C = WAR;
  cel(g, poly(limbPts(hip, knee, 10, 10.6, 7.4))(g), C.leather, 3);
  cel(g, poly(limbPts(knee, foot, 7.6, 8.2, 6, 0.3))(g), withRim(C.metal, back ? null : C.rim), 2.6);
  cel(g, poly([[knee.x - 2.6, knee.y], [knee.x + 1, knee.y - 3.6], [knee.x + 4.4, knee.y], [knee.x + 1, knee.y + 3.4]])(g), C.metal, 1.4);
  const x = foot.x, y = foot.y;
  cel(g, poly([[x - 4, y - 4.4], [x + 2.6, y - 5], [x + 5.4, y - 1.8], [x + 9.4, y + 0.2], [x + 9.4, y + 2.6], [x - 4.4, y + 2.6]])(g), C.metal, 2);
  dim(g, false);
}
function warArm(g, R, sh, el, hand, back) {
  dim(g, back);
  const C = WAR;
  cel(g, poly(limbPts(sh, el, 7.6, 8.4, 6.4))(g), withRim(C.skin, back ? null : C.rim), 2.8);
  cel(g, poly(limbPts(el, hand, 6.8, 7.2, 5.6, 0.25))(g), withRim(C.metal, back ? null : C.rim), 2.4);
  const h = hand;
  cel(g, poly([[h.x - 3.2, h.y - 2.6], [h.x + 2.4, h.y - 3.4], [h.x + 3.8, h.y + 0.6], [h.x + 1, h.y + 3.6], [h.x - 3, h.y + 2.4]])(g), C.metal, 1.8);
  dim(g, false);
}
function warCape(g, R) {
  const t = R.t, mv = Math.max(R.moving, R.swing || 0), W = R.W;
  const a = W(-6, -23), b = W(2.4, -24.2), back = -12 - mv * 13 - Math.sin(t * 1.6) * 1.6;
  const w = (i) => Math.sin(t * 3 + i * 1.4) * (1.2 + mv * 1.8);
  const pts = [[b.x, b.y], [back + 9, -2 + w(0)]];
  const n = 7;
  for (let i = 1; i <= n; i++) pts.push([back + 9 - (i / n) * 19 - mv * 4 * (i / n), -2 + w(i) + (i % 2 ? -5 : 0) - (i / n) * 4]);
  pts.push([back - 4, -20], [a.x, a.y]);
  cel(g, poly(pts)(g), WAR.cloth, 4.5);
  g.beginPath(); g.moveTo(pts[1][0], pts[1][1]); for (let i = 2; i < pts.length - 2; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.lineWidth = 1.1; g.strokeStyle = '#d19a3a'; g.stroke();
}
function warTorso(g, R) {
  const C = WAR, t = R.t;
  g.save(); g.translate(R.hip.x, R.hip.y); g.rotate(R.lean);
  cel(g, poly([[-8.4, -23], [10.6, -23.4], [8.6, -12], [6.4, -2], [-6.4, -2], [-8.6, -12]])(g), C.leather, 3.5);
  cel(g, poly([[-6.4, -23.6], [3.6, -25.4], [11.4, -22.4], [11, -15], [6.8, -9], [0, -8], [-6.6, -11.4]])(g), withRim(C.metal, C.rim), 4);
  g.beginPath(); g.moveTo(3.6, -25.4); g.lineTo(4.2, -16); g.lineTo(0, -8); g.lineWidth = 0.8; g.strokeStyle = INK; g.stroke();
  g.beginPath(); g.moveTo(-6.4, -19); g.lineTo(4.2, -16.4); g.lineTo(11.2, -18.4); g.lineWidth = 1; g.strokeStyle = '#d19a3a'; g.stroke();
  const p = 0.6 + 0.4 * Math.sin(t * 3);
  cel(g, poly([[6.6, -15.4], [8.6, -12.8], [6.6, -10.2], [4.6, -12.8]])(g), { base: C.accent, shade: '#7a0a22', hi: '#ffd0d8' }, 1, 0.6, 0.8);
  glow(g, 6.6, -12.8, 9, C.accent, 0.6 * p);
  for (const y of [-7.6, -4.8]) cel(g, poly([[-6.4, y], [7.2, y - 0.6], [7, y + 2], [-6.4, y + 2.4]])(g), C.leather, 1.2, 0.6, 0.9);
  cel(g, poly([[2.6, -6.8], [4.6, -7.6], [6, -5.6], [4, -4.6]])(g), C.gold, 1, 0.5, 0.8);
  const sw = Math.sin(t * 3 + 1) * 0.8 - R.moving * 2.2;
  cel(g, poly([[0.4, -2.6], [7.4, -2.8], [6.6 + sw, 9.6], [4.2 + sw, 15.6], [1.6 + sw, 9.4]])(g), C.cloth, 2.6);
  cel(g, poly([[-7.4, -2.8], [-1.4, -2.8], [-2.6, 5.4], [-8.6, 3]])(g), C.metal, 2);
  g.restore();
}
function warHead(g, R) {
  const C = WAR;
  g.save(); g.translate(R.hip.x, R.hip.y); g.rotate(R.lean * 0.45); g.translate(2.6, -31.6);
  cel(g, poly([[-1, 5], [3.6, 4.6], [4.4, 9.4], [-1.6, 9.6]])(g), C.skin, 2);
  cel(g, poly([[-4.6, -3], [-3, -7.4], [2, -8.2], [5.2, -5], [5.6, -2.6], [5, -1.8], [6.8, 1.2], [5.4, 1.8], [5.7, 3.2], [4.7, 5.6], [2.2, 6.6], [-1.2, 4.8], [-3.6, 2.4], [-4.8, 0]])(g), withRim(C.skin, C.rim), 3.8);
  cel(g, poly([[-1.8, -0.6], [0, -1.2], [0.4, 1.8], [-1.4, 2.4]])(g), C.skin, 1, 0.5, 0.8);
  g.beginPath(); g.moveTo(3.4, -1.7); g.lineTo(5.1, -1.9); g.lineTo(4.5, -0.8); g.closePath(); g.fillStyle = INK; g.fill();
  g.beginPath(); g.arc(4.5, -1.4, 0.45, 0, TAU); g.fillStyle = C.eye; g.fill(); glow(g, 4.5, -1.4, 2.4, C.eye, 0.8);
  g.beginPath(); g.moveTo(1.8, -3.4); g.lineTo(5.8, -2.6); g.lineWidth = 1.3; g.strokeStyle = INK; g.stroke();
  g.beginPath(); g.moveTo(4.2, 3.6); g.lineTo(5.6, 3.3); g.lineWidth = 0.6; g.stroke();
  g.beginPath(); g.moveTo(1.2, 2); g.lineTo(2.6, 4.6); g.lineWidth = 0.5; g.strokeStyle = 'rgba(0,0,0,.6)'; g.stroke();
  cel(g, poly([[5.6, -5.2], [4.4, -9], [1, -9.8], [-0.8, -12.4], [-2.4, -9.8], [-6.4, -11.6], [-5.6, -8.4], [-9.6, -8.4], [-6.6, -5.8], [-10, -3.4], [-5.8, -2.6], [-5.2, 1.8], [-3.6, -2], [0, -5.6], [3, -5.4]])(g), withRim(C.hair, C.rim), 2.4);
  for (const [x, h] of [[-3.4, 4], [-0.2, 5], [3, 4]]) cel(g, poly([[x - 1.2, -8.4], [x, -8.4 - h], [x + 1.2, -8.4]])(g), C.metal, 0.8, 0.4, 0.8);
  g.restore();
}
function warPauldron(g, at, lean, back) {
  dim(g, back);
  const C = WAR;
  g.save(); g.translate(at.x - 0.4, at.y + 2.4); g.rotate(lean + 0.25); g.scale(back ? 0.7 : 0.9, back ? 0.7 : 0.9);
  cel(g, poly([[-1.8, -6.6], [-5, -16], [2.2, -7.4]])(g), C.metal, 1.6);
  cel(g, poly([[3, -6.4], [5.4, -13], [6.6, -5.6]])(g), C.metal, 1.4);
  cel(g, poly([[-7.4, 2], [-6.4, -4], [0, -7.6], [8.4, -5], [9.4, 1.2], [3, -0.8]])(g), withRim(C.metal, back ? null : C.rim), 3.6);
  cel(g, poly([[-5.4, 5.4], [-4.4, 1.2], [3, 0.4], [8.4, 3.6], [2, 5.8]])(g), C.metal, 2.4);
  g.beginPath(); g.moveTo(-7, 1.6); g.lineTo(3, -0.8); g.lineTo(9.2, 1); g.lineWidth = 1; g.strokeStyle = '#d19a3a'; g.stroke();
  g.restore(); dim(g, false);
}
function warSword(g, R) {
  const C = WAR, h = R.hF, t = R.t;
  g.save(); g.translate(h.x, h.y); g.rotate(Math.atan2(Math.cos(R.psi), Math.sin(R.psi))); g.scale(1.1, 1.1);
  cel(g, poly([[-6.6, 0], [-5.2, -1.6], [-3.8, 0], [-5.2, 1.6]])(g), C.gold, 1, 0.5, 0.8);
  cel(g, poly([[-4, -1.3], [3, -1.4], [3, 1.4], [-4, 1.3]])(g), C.leather, 1, 0.4, 0.8);
  cel(g, poly([[5.6, -3], [30, -3.6], [41.5, 0], [30, 3.6], [5.6, 3]])(g), C.blade, 2.2, 0.9, 1.1);
  const p = 0.65 + 0.35 * Math.sin(t * 5);
  g.save(); g.globalCompositeOperation = 'lighter';
  g.beginPath(); g.moveTo(7, 0.2);
  for (let i = 1; i <= 8; i++) g.lineTo(7 + i * 3.6, (i % 2 ? -1.1 : 1.1) * (1 - i / 10));
  g.lineWidth = 0.9; g.strokeStyle = `rgba(255,90,70,${p})`; g.stroke();
  g.beginPath(); g.moveTo(30, -3.6); g.lineTo(41.5, 0); g.lineTo(30, 3.6); g.lineWidth = 0.7; g.strokeStyle = `rgba(255,120,90,${0.6 * p})`; g.stroke();
  g.restore();
  for (let i = 0; i < 4; i++) glow(g, 11 + i * 8, 0, 7, C.accent, 0.3 * p);
  cel(g, poly([[3, -1.6], [3.6, -8.6], [7.2, -6.4], [5.8, -1.6], [5.8, 1.6], [7.2, 6.4], [3.6, 8.6], [3, 1.6]])(g), C.gold, 1.4, 0.6, 0.9);
  g.restore();
}

// ——— mage ———
function mageRobe(g, R) {
  const C = MAG, W = R.W, t = R.t, mv = R.moving;
  const front = Math.max(R.fF.x, R.fB.x) + 7, back = Math.min(R.fF.x, R.fB.x) - 9 - mv * 4;
  const s0 = W(-8.4, -23), s1 = W(10, -22.6), w1 = W(7.8, -7), w0 = W(-8, -8);
  const pts = [[s0.x, s0.y], [s1.x, s1.y], [w1.x, w1.y], [front, 0.6]];
  const n = 8;
  for (let i = 1; i <= n; i++) pts.push([front + (back - front) * (i / n), (i % 2 ? 3.4 : 0) + Math.sin(t * 3 + i) * 0.7]);
  pts.push([back + 2, -10], [w0.x, w0.y]);
  cel(g, poly(pts)(g), withRim(C.robe, C.rim), 5);
  const a = W(4, -22.8), b = W(6.2, -9);
  g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(front - 2.6, 0.4); g.lineWidth = 1.5; g.strokeStyle = '#d19a3a'; g.stroke();
  for (let i = 0; i < 4; i++) { const p = { x: b.x + (front - 2.6 - b.x) * (i / 4 + 0.12), y: b.y + (0.4 - b.y) * (i / 4 + 0.12) }; g.beginPath(); g.moveTo(p.x - 1.2, p.y); g.lineTo(p.x, p.y - 1.4); g.lineTo(p.x + 1.2, p.y); g.lineTo(p.x, p.y + 1.4); g.closePath(); g.fillStyle = '#d19a3a'; g.fill(); }
  const q = [W(-8.2, -9.6), W(8.6, -10), W(8.2, -6.6), W(-8, -6.4)];
  cel(g, poly(q.map((p) => [p.x, p.y]))(g), C.leather, 1.4, 0.6, 0.9);
  const gp = W(4.8, -8.2);
  cel(g, poly([[gp.x - 2, gp.y], [gp.x, gp.y - 2.2], [gp.x + 2, gp.y], [gp.x, gp.y + 2.2]])(g), C.gold, 1, 0.5, 0.8);
}
function mageMantle(g, R) {
  const C = MAG, W = R.W;
  const pts = [W(-10, -24), W(-7.4, -33), W(-3.6, -26), W(3, -25.4), W(11.6, -23.4), W(12.6, -16), W(7.6, -13.2), W(3, -15.6), W(-2.6, -13), W(-10.6, -15.4)].map((p) => [p.x, p.y]);
  cel(g, poly(pts)(g), withRim(C.mantle, C.rim), 3.4);
  g.beginPath(); g.moveTo(pts[5][0], pts[5][1]); for (const i of [6, 7, 8, 9]) g.lineTo(pts[i][0], pts[i][1]);
  g.lineWidth = 1.1; g.strokeStyle = '#d19a3a'; g.stroke();
  const c = W(6, -21.4);
  cel(g, poly([[c.x - 2, c.y], [c.x, c.y - 2.6], [c.x + 2, c.y], [c.x, c.y + 2.6]])(g), { base: C.accent, shade: '#6a0a3a', hi: '#ffd0e4' }, 1, 0.5, 0.8);
  glow(g, c.x, c.y, 7, C.accent, 0.6);
}
function mageHead(g, R) {
  const C = MAG, t = R.t;
  g.save(); g.translate(R.hip.x, R.hip.y); g.rotate(R.lean * 0.6); g.translate(2.6, -31.8);
  const sw = Math.sin(t * 2) * 0.6 - R.moving * 1.6;
  cel(g, poly([[7.2, 6.4], [8.6, -3], [4.4, -10.4], [-1.6, -13.6], [-7, -9.6], [-14 + sw, -3], [-9.4, 1.6], [-7.4, 9.4]])(g), withRim(C.mantle, C.rim), 4);
  g.beginPath(); g.moveTo(6.8, 5.8); g.lineTo(7.6, -2.6); g.lineTo(4.4, -7.2); g.lineTo(0.8, -5.4); g.lineTo(0.4, 5); g.closePath(); g.fillStyle = '#050309'; g.fill();
  cel(g, poly([[0.8, 1.2], [5.2, 0.8], [6.8, 2.2], [6.2, 4.8], [3.6, 6.2], [1, 4.8]])(g), C.skin, 2.6, 0.6, 0.9);
  g.beginPath(); g.moveTo(4.4, 3.8); g.lineTo(5.8, 3.6); g.lineWidth = 0.6; g.strokeStyle = INK; g.stroke();
  const p = 0.75 + 0.25 * Math.sin(t * 3.5);
  for (const ex of [5.6, 3]) {
    g.beginPath(); g.moveTo(ex - 1.1, -1.6); g.lineTo(ex + 1.1, -2); g.lineWidth = 0.9; g.strokeStyle = '#eafffb'; g.stroke();
    glow(g, ex, -1.8, 4, C.eye, p);
  }
  g.beginPath(); g.moveTo(7.6, -2.6); g.lineTo(4.4, -7.2); g.lineTo(0.8, -5.4); g.lineWidth = 1.1; g.strokeStyle = '#d19a3a'; g.stroke();
  g.restore();
}
function mageArm(g, R, sh, el, hand, back) {
  dim(g, back);
  const C = MAG;
  cel(g, poly(limbPts(sh, el, 8, 8.6, 7.6))(g), withRim(C.robe, back ? null : C.rim), 3);
  cel(g, poly(limbPts(el, { x: hand.x + (hand.x - el.x) * 0.05, y: hand.y + (hand.y - el.y) * 0.05 }, 7.2, 8, 10.6, 0.6))(g), withRim(C.robe, back ? null : C.rim), 3);
  const h = hand;
  cel(g, poly([[h.x - 2.4, h.y - 2.2], [h.x + 2, h.y - 2.6], [h.x + 3, h.y + 0.8], [h.x, h.y + 2.8], [h.x - 2.4, h.y + 1.6]])(g), C.skin, 1.6, 0.5, 0.9);
  dim(g, false);
}
function mageStaff(g, R) {
  const C = MAG, h = R.hF, t = R.t;
  g.save(); g.translate(h.x, h.y); g.rotate(Math.atan2(Math.cos(R.psi), Math.sin(R.psi)));
  cel(g, poly([[-28, -1.1], [-12, -1.6], [10, -1.3], [27, -1.8], [27, 1.8], [10, 1.3], [-12, 1.6], [-28, 1.1]])(g), C.wood, 1.2, 0.5, 0.9);
  for (const bx of [-12, 6]) cel(g, poly([[bx, -2.2], [bx + 2.4, -2.4], [bx + 2.4, 2.4], [bx, 2.2]])(g), C.gold, 1, 0.5, 0.8);
  for (const s of [-1, 1]) cel(g, poly([[26, s * 1.4], [30, s * 7.6], [39.5, s * 4.6], [33, s * 4], [28.6, s * 0.6]])(g), C.gold, 1.6, 0.6, 0.9);
  const k = 0.75 + 0.25 * Math.sin(t * 4) + R.cast * 0.8;
  glow(g, 34, 0, 12 * k + R.cast * 12, C.accent, 0.8);
  cel(g, poly([[30, 0], [33.6, -4.2], [37.4, 0], [33.6, 4.2]])(g), { base: C.accent, shade: '#6a0a3a', hi: '#ffe0ee' }, 1.4, 0.7, 0.9);
  for (let i = 0; i < 3; i++) {
    const a = t * 2 + (i / 3) * TAU, x = 34 + Math.cos(a) * 8, y = Math.sin(a) * 4;
    g.beginPath(); g.moveTo(x, y - 1.8); g.lineTo(x + 1, y); g.lineTo(x, y + 1.8); g.lineTo(x - 1, y); g.closePath(); g.fillStyle = '#ffd0e4'; g.fill();
    glow(g, x, y, 3.4, C.accent, 0.8);
  }
  if (R.cast > 0.05) {
    g.save(); g.globalCompositeOperation = 'lighter';
    g.beginPath(); g.arc(34, 0, 6 + (1 - R.cast) * 20, 0, TAU); g.lineWidth = 2 * R.cast; g.strokeStyle = C.accent; g.stroke();
    g.restore();
  }
  g.restore();
}
function mageFeet(g, R) {
  for (const [f, back] of [[R.fB, true], [R.fF, false]]) {
    dim(g, back);
    const x = f.x, y = f.y;
    cel(g, poly([[x - 3.4, y - 3.6], [x + 2, y - 4], [x + 9.4, y + 1.4], [x + 9, y + 2.6], [x - 3.8, y + 2.6]])(g), MAG.leather, 2);
    dim(g, false);
  }
}

// sword trail that follows the real tip path: re-pose the rig a few moments back
function trail(g, R, pose, color) {
  const a = R.attack;
  if (!(a > 0.38 && a < 0.64)) return;
  const fade = a < 0.52 ? 1 : 1 - (a - 0.52) / 0.12, sc = 1.1, tips = [], mids = [];
  for (let j = 0; j < 14; j++) {
    const b = a - j * 0.011;
    if (b < 0.36) break;
    const Q = j ? rig('warrior', { ...pose, attack: b }) : R, dx = Math.sin(Q.psi), dy = Math.cos(Q.psi);
    tips.push([Q.hF.x + dx * 41 * sc, Q.hF.y + dy * 41 * sc]);
    mids.push([Q.hF.x + dx * 20 * sc, Q.hF.y + dy * 20 * sc]);
  }
  if (tips.length < 2) return;
  g.save(); g.globalCompositeOperation = 'lighter';
  const ribbon = (inner, col, al) => {
    g.beginPath();
    tips.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    for (let i = tips.length - 1; i >= 0; i--) {
      const k = inner * (1 - i / tips.length) + (i / tips.length);
      g.lineTo(tips[i][0] + (mids[i][0] - tips[i][0]) * k, tips[i][1] + (mids[i][1] - tips[i][1]) * k);
    }
    g.closePath(); g.globalAlpha = al * fade; g.fillStyle = col; g.fill();
  };
  ribbon(1, color, 0.45);
  ribbon(0.35, '#fff0d8', 0.8);
  g.restore();
}

function embers(g, R, c) {
  for (let i = 0; i < 6; i++) {
    const ph = (R.t * 0.45 + i / 6) % 1;
    const x = Math.sin(i * 7.3 + R.t * 1.2) * 14, y = -4 - ph * 70;
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = (1 - ph) * 0.9;
    g.beginPath(); g.moveTo(x, y - 1.6); g.lineTo(x + 0.6, y); g.lineTo(x, y + 1.6); g.lineTo(x - 0.6, y); g.closePath(); g.fillStyle = c; g.fill();
    g.restore();
  }
}

export function drawHades(g, classId, pose) {
  const R = rig(classId, pose);
  g.lineJoin = 'miter'; g.lineCap = 'round';
  if (classId === 'warrior') {
    warCape(g, R);
    warArm(g, R, R.sB, R.eB, R.hB, true);
    warPauldron(g, R.sB, R.lean, true);
    warLeg(g, R, R.hipB, R.kB, R.fB, true);
    warLeg(g, R, R.hipF, R.kF, R.fF, false);
    warTorso(g, R);
    warHead(g, R);
    warSword(g, R);
    warArm(g, R, R.sF, R.eF, R.hF, false);
    warPauldron(g, R.sF, R.lean, false);
    trail(g, R, pose, WAR.accent);
    embers(g, R, '#ffb36b');
  } else {
    mageArm(g, R, R.sB, R.eB, R.hB, true);
    if (R.cast > 0) glow(g, R.hB.x, R.hB.y, 10 * R.cast, MAG.accent, 0.8);
    mageFeet(g, R);
    mageRobe(g, R);
    mageMantle(g, R);
    mageHead(g, R);
    mageStaff(g, R);
    mageArm(g, R, R.sF, R.eF, R.hF, false);
    embers(g, R, MAG.eye);
  }
}
