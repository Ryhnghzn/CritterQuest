// Anime Warrior (spec §39): a swordsman in a long coat over a steel breastplate, an oversized
// layered pauldron, a huge glowing greatsword. Side view on the skeleton (rig.js), front, back.
import { TAU, P, part, stroke, glow, pal, far, limb, mix, alongPsi, wave, hem, trace } from './kit.js';
import { head } from './head.js';
import { MYTHIC, LEGENDARY } from '../../data/items.js';
import { trimmed } from './gearfx.js';
import { SKIN, STEEL, GOLD, LEATHER, GLOVE, gem, ankle, legSide, legFront, arm, fist, body, trail, tipOf } from './common.js';
import { weaponFx } from './elemfx.js';

export const OUTFITS = {
  night: { name: 'Malam & Emas', coat: pal('#22203a', { shade: '#0c0a18', hi: '#4a4670' }), trim: '#e7b043', lining: pal('#8a1424') },
  crimson: { name: 'Merah & Perak', coat: pal('#7a1420', { shade: '#320610', hi: '#c43a40' }), trim: '#d8e2f0', lining: pal('#1a1a2a') },
  white: { name: 'Putih & Biru', coat: pal('#dfe4ee', { shade: '#7e88a8', hi: '#ffffff' }), trim: '#3a8ae8', lining: pal('#1e3c78') },
};
const SASH = pal('#b81c30', { shade: '#5a0818', hi: '#ff6a6a' });
export const BLADE_LEN = 104;

// the greatsword grows with its rarity (0 Biasa … 5 Mitos): a plain short blade and a bar guard;
// a fuller; a notch and runes; a serrated back and a gem; longer, a winged gold guard and gold
// inlay; Mitos the biggest, with crystal shards hovering beside the blade
const LEN_R = [0.72, 0.8, 0.88, 0.96, 1.04, 1.12], WID_R = [0.74, 0.82, 0.9, 1, 1.08, 1.18];
export function sword(g, h, psi, E, t, lenK = 1, rar = 4) {
  g.save(); alongPsi(g, h, psi);
  const r = Math.max(0, Math.min(5, rar)), Ln = BLADE_LEN * lenK * LEN_R[r], wk = WID_R[r], p = 0.7 + 0.3 * Math.sin(t * 4);
  if (r >= 2) for (let i = 0; i < 6; i++) glow(g, 14 + i * (Ln - 14) / 5, 0, (20 - i * 1.4) * wk, E.glow, (0.1 + r * 0.05) * p);
  part(g, r >= 2 ? [[-17, 0], [-13, -3.4, 1], [-9.6, 0, 1], [-13, 3.4, 1]] : [[-15, -3], [-10, -3], [-10, 3], [-15, 3]], r >= 2 ? GOLD : STEEL, { sd: 1.2, lw: 1.5 });
  part(g, [[-10, -2.4], [3, -2.6], [3, 2.6], [-10, 2.4]], LEATHER, { sd: 1, lw: 1.4 });
  const w = (y) => y * wk;
  const blade = r >= 2
    ? [[4, w(-6.4)], [13, w(-10)], [17, w(-7.4), 1], [30, w(-10.4)], [Ln - 30, w(-11.4)], [Ln - 12, w(-8.6)], [Ln, 0, 1], [Ln - 12, w(8.6)], [Ln - 30, w(11.4)], [30, w(10.4)], [17, w(7.4), 1], [13, w(10)], [4, w(6.4)]]
    : [[4, w(-6)], [Ln - 14, w(-7.4)], [Ln, 0, 1], [Ln - 14, w(7.4)], [4, w(6)]];
  if (r >= 3) { // a serrated back edge: teeth along the top
    const teeth = [];
    for (let x = 34, i = 0; x < Ln - 22; x += 9, i++) teeth.push([x, w(-11.6)], [x + 4.5, w(-15.4), 1]);
    blade.splice(4, 0, ...teeth);
  }
  if (r >= MYTHIC) for (let i = 0; i < 3; i++) { // crystal shards hovering beside the blade
    const x = 30 + i * (Ln - 50) / 2, y = (i % 2 ? 1 : -1) * w(22 + Math.sin(t * 2 + i) * 3), s = 5 - i * 0.6;
    part(g, [[x - s * 1.6, y], [x, y - s, 1], [x + s * 1.6, y], [x, y + s, 1]], pal(E.edge, { hi: E.core }), { sd: 1, lw: 1.3 });
    glow(g, x, y, 10, E.glow, 0.6 * p);
  }
  g.save(); g.beginPath(); trace(g, blade); g.clip();
  const gr = g.createLinearGradient(0, -12 * wk, 0, 12 * wk);
  if (r >= 2) { gr.addColorStop(0, E.edge); gr.addColorStop(0.32, mix(E.edge, E.core, 0.6)); gr.addColorStop(0.5, E.core); gr.addColorStop(0.68, mix(E.edge, E.core, 0.5)); gr.addColorStop(1, mix(E.edge, '#000000', 0.35)); }
  else { gr.addColorStop(0, '#7a8294'); gr.addColorStop(0.5, '#e4e8f0'); gr.addColorStop(1, '#4a5062'); }
  g.fillStyle = gr; g.fillRect(0, -18 * wk, Ln + 2, 36 * wk);
  g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); trace(g, [[18, w(-8.6)], [Ln - 20, w(-9.8)], [Ln - 6, w(-3), 1], [Ln - 22, w(-6.6)], [20, w(-5.6)]]); g.fill();
  g.restore();
  g.beginPath(); trace(g, blade); g.lineWidth = 2.2; g.strokeStyle = '#130b1a'; g.stroke();
  if (r >= 1) stroke(g, [[20, 0], [Ln - 20, 0]], r >= 2 ? mix(E.edge, '#000000', 0.4) : 'rgba(40,44,56,.7)', 2.2 * wk);
  if (r >= LEGENDARY) { stroke(g, [[16, w(-9)], [Ln - 14, w(-9.4)]], '#ffd776', 1); stroke(g, [[16, w(9)], [Ln - 14, w(9.4)]], '#ffd776', 1); }
  if (r >= 2) {
    g.save(); g.globalCompositeOperation = 'lighter';
    const n = r >= 3 ? 7 : 3;
    for (let i = 0; i < n; i++) {
      const x = 24 + i * ((Ln - 48) / Math.max(1, n - 1));
      g.globalAlpha = 0.55 + 0.45 * Math.sin(t * 5 - i * 0.9); g.fillStyle = E.rune;
      g.beginPath(); trace(g, [[x - 2.4, 0, 1], [x, -1.6, 1], [x + 2.4, 0, 1], [x, 1.6, 1]]); g.fill();
    }
    g.restore();
  }
  if (r >= LEGENDARY) part(g, [[2, -3], [-1, -9], [3, -17, 1], [8, -11], [9, -4], [9, 4], [8, 11], [3, 17, 1], [-1, 9], [2, 3]], GOLD, { sd: 2, lw: 1.9 });
  else part(g, [[2, -10 * wk], [7, -10 * wk], [7, 10 * wk], [2, 10 * wk]], r >= 2 ? GOLD : STEEL, { sd: 1.4, lw: 1.7 });
  if (r >= 3) { part(g, [[4.6, -3.4], [7.6, 0, 1], [4.6, 3.4, 1], [1.6, 0, 1]], gem(E), { sd: 1, lw: 1.2 }); glow(g, 4.6, 0, 9, E.glow, 0.7 * p); }
  weaponFx(g, E, t, Ln, 11 * wk, 14);
  g.restore();
}

// three layered curved plates and a swept horn, centred on the shoulder joint.
// side: +1 horn to the screen left, −1 mirrored; turn: follows the raised arm a little
export function pauldron(g, S, L, E, t, { side = 1, k = 1, turn = 0, isFar = false } = {}) {
  g.save(); g.translate(S[0], S[1] - 3); g.rotate(turn); g.scale(side * k, k);
  const Pl = isFar ? far(STEEL) : STEEL, G = isFar ? far(GOLD) : GOLD;
  part(g, [[-9, -7], [-17, -19, 1], [-4, -10]], G, { sd: 1.6, lw: 1.8 });
  for (let i = 2; i >= 0; i--) {
    const o = i * 5, s = 1 - i * 0.12;
    part(g, [[-12 * s, -2 + o], [-6 * s, -10 + o], [6 * s, -10.5 + o], [13 * s, -3 + o], [12.5 * s, 4 + o, 1], [0, 1.4 + o], [-11 * s, 4 + o, 1]], Pl, { sd: 2.4, lw: 2 });
    stroke(g, [[-10.6 * s, 2.4 + o], [0, -0.2 + o], [12 * s, 2.6 + o]], isFar ? 'rgba(0,0,0,.3)' : L.trim, 1.3);
  }
  if (!isFar) {
    part(g, [[0, -8.4], [2.4, -5.8, 1], [0, -3.2, 1], [-2.4, -5.8, 1]], gem(E), { sd: 1, lw: 1.1 });
    glow(g, 0, -5.8, 7, E.glow, 0.45 + 0.2 * Math.sin(t * 3 + 1));
  }
  g.restore();
}
const legGear = (L) => ({ greave: STEEL, knee: GOLD, cuff: L.trim });

// ─── side (on the skeleton) ──────────────────────────────────────────────
export function side(g, R, o, pose, rigFn) {
  const t = R.t, E = o.element, L = trimmed(OUTFITS[o.outfit] || OUTFITS.night, o.gear), mv = Math.max(R.moving, R.swing);
  const hp = P(R.hip), wind = mv * 2.4 + Math.max(0, R.lean) * 3;
  const waist = (fn) => { g.save(); g.translate(hp[0], hp[1] + 80); fn(); g.restore(); };
  const chest = (fn) => { g.save(); g.translate(hp[0], hp[1]); g.rotate(R.lean); g.translate(0, 80); fn(); g.restore(); };
  // coat back panel and sash hang from the waist, behind everything
  waist(() => {
    const w = (i) => wave(t, i, 2 + wind * 0.6) - wind * 3;
    const hemB = [[2, -31], [-8 + w(0) * 0.4, -24, 1], [-14 + w(1) * 0.6, -30], [-24 + w(2), -20, 1], [-29 + w(3), -29], [-41 + w(4) * 1.3, -22, 1], [-40 + w(5) * 1.2, -38], [-50 + w(6) * 1.5, -40, 1]];
    part(g, [[-8, -88], [8, -86], ...hemB, [-34 + w(7), -58], [-20, -78]], L.coat, { sd: 4, lw: 2.4 });
    part(g, [[2, -31], [-8 + w(0) * 0.4, -24, 1], [-6, -40], [4, -60]], L.lining, { sd: 2, lw: 1.6, rim: false });
    stroke(g, hemB.map((q) => [q[0], q[1] - 2.2]), L.trim, 1.5);
    const sw = Math.sin(t * 3) * 2 - wind * 2;
    part(g, [[-8, -86], [-3, -84], [-14 + sw, -56], [-20 + sw * 1.4, -50, 1], [-19 + sw, -60]], SASH, { sd: 2, lw: 1.8 });
  });
  // far arm with a big vambrace (guards in front of the chest), far shoulder
  arm(g, P(R.sB), P(R.eB), P(R.hB), { isFar: true, upper: L.coat, fore: STEEL, cuff: GOLD, w: 1.05 });
  pauldron(g, P(R.sB), L, E, t, { k: 0.62, isFar: true, turn: R.lean });
  legSide(g, P(R.hipB), P(R.kB), ankle(R.fB), { isFar: true, ...legGear(L) });
  chest(() => {
    part(g, [[-1, -129], [-13, -123], [-12.5, -104], [-9.5, -86, 1], [13, -86, 1], [16.5, -97], [19.5, -110], [16.5, -124], [8, -129]], L.coat, { sd: 3.6, lw: 2.4 });
    part(g, [[1.5, -125], [10.5, -127.5], [17.5, -122], [19.6, -110], [16, -98.5], [9, -95.5], [3, -100], [0.6, -112]], STEEL, { sd: 3, lw: 2 });
    stroke(g, [[2.4, -118], [9, -114.4], [18.6, -116.4]], L.trim, 1.6);
    stroke(g, [[3.4, -104], [10, -101], [17, -103]], L.trim, 1.1);
    part(g, [[12, -114], [14.6, -110.6, 1], [12, -106.8, 1], [9.4, -110.6, 1]], gem(E), { sd: 1.2, lw: 1.4 });
    glow(g, 12, -110.6, 10, E.glow, 0.55 + 0.25 * Math.sin(t * 3));
    part(g, [[-10, -89], [14, -89], [14.6, -81.6], [-10, -80.6]], LEATHER, { sd: 1.6, lw: 1.8 });
    part(g, [[8.2, -90], [13, -90], [13, -80.4], [8.2, -80.4]], GOLD, { sd: 1.4, lw: 1.5 });
  });
  legSide(g, P(R.hipF), P(R.kF), ankle(R.fF), legGear(L));
  waist(() => { // the coat's front flap over the near thigh
    const wf = Math.sin(t * 2.2 + 2) * 1.2 - wind * 0.8;
    part(g, [[9, -84], [16.6, -86], [27 + wf, -50], [31 + wf, -38, 1], [24 + wf, -42], [20 + wf, -35, 1], [15, -48]], L.coat, { sd: 3, lw: 2.2 });
    stroke(g, [[17, -84], [28 + wf, -48], [30 + wf, -39.6]], L.trim, 1.4);
  });
  chest(() => {
    part(g, [[-11, -126], [-9, -142], [-2, -135], [5, -129], [10, -127, 1], [4, -124], [-6, -122]], L.coat, { sd: 2.6, lw: 2.2 });
    stroke(g, [[-9, -141], [-2.4, -134.6], [4.6, -129.4]], L.trim, 1.4);
    part(g, [[4, -134], [10, -133], [10.6, -126], [4.4, -126]], SKIN, { sd: 1.6, lw: 1.6, rim: false });
    head(g, 'side', o, [6.5, -144], 12.6, -wind * 0.04);
  });
  trail(g, R, pose, rigFn, 'warrior', tipOf(BLADE_LEN), E);
  const behind = R.psi > 2.2 && R.psi < 4.2; // raised over the head: the blade passes behind the arm
  const h = P(R.hF);
  const wr = o.gear?.weapon ?? 4;
  if (behind) sword(g, h, R.psi, E, t, 1, wr);
  arm(g, P(R.sF), P(R.eF), h, { upper: L.coat, fore: STEEL, cuff: GOLD, hand: false });
  if (!behind) sword(g, h, R.psi, E, t, 1, wr);
  fist(g, h);
  pauldron(g, P(R.sF), L, E, t, { turn: R.lean + (R.phi - 0.4) * 0.3 });
}

// ─── front & back ────────────────────────────────────────────────────────
const SWORD_DOWN = Math.PI - Math.atan2(0.43, 0.9) - Math.PI; // pointing down and out (screen left)
export function front(g, B, o) {
  const t = B.t, E = o.element, L = trimmed(OUTFITS[o.outfit] || OUTFITS.night, o.gear);
  part(g, [[-11, -88], [11, -88], [17, -60], [25 + wave(t, 1, 1.5), -30], ...hem(22, -22, -26, t, 1.6 + B.moving), [-25 + wave(t, 2, 1.5), -30], [-17, -60]], far(L.coat), { sd: 3, lw: 2.2 });
  for (const leg of [B.L, B.R]) legFront(g, leg.hip, leg.knee, leg.ank, legGear(L));
  g.save(); g.translate(0, B.b);
  for (const s of [-1, 1]) {
    const wf = wave(t, s + 2, 1.2 + B.moving);
    part(g, [[s * 9, -100], [s * 15.4, -96], [s * (20 + wf), -40], [s * (24 + wf), -27, 1], [s * (17 + wf), -32], [s * (13 + wf), -25, 1], [s * 7.4, -62]], L.coat, { sd: 3, lw: 2.2 });
    stroke(g, [[s * 9, -98], [s * 7.6, -62], [s * (13 + wf), -26]], L.trim, 1.3);
  }
  part(g, [[-8, -129], [-18, -123], [-18.6, -112], [-14, -100], [-10.6, -86, 1], [10.6, -86, 1], [14, -100], [18.6, -112], [18, -123], [8, -129]], L.coat, { sd: 3.4, lw: 2.4 });
  part(g, [[-12, -125], [0, -128], [12, -125], [14, -111], [9.4, -99], [0, -95.6], [-9.4, -99], [-14, -111]], STEEL, { sd: 3, lw: 2 });
  stroke(g, [[-13, -117], [0, -112.6], [13, -117]], L.trim, 1.6);
  stroke(g, [[-10, -103], [0, -99.6], [10, -103]], L.trim, 1.1);
  part(g, [[0, -113.4], [2.6, -110, 1], [0, -106.2, 1], [-2.6, -110, 1]], gem(E), { sd: 1.2, lw: 1.4 });
  glow(g, 0, -110, 11, E.glow, 0.55 + 0.25 * Math.sin(t * 3));
  part(g, [[-11, -89.4], [11, -89.4], [11.4, -81.4], [-11.4, -81.4]], LEATHER, { sd: 1.6, lw: 1.8 });
  part(g, [[-2.8, -90.4], [2.8, -90.4], [2.8, -80.6], [-2.8, -80.6]], GOLD, { sd: 1.4, lw: 1.5 });
  part(g, [[-6, -82], [-2, -82], [-6 + wave(t, 4, 1.4), -58], [-9 + wave(t, 4, 1.6), -54, 1], [-10, -66]], SASH, { sd: 1.6, lw: 1.6 });
  part(g, [[-12, -124], [-12.6, -141], [-5, -133], [5, -133], [12.6, -141], [12, -124], [0, -127]], L.coat, { sd: 2.6, lw: 2.2 });
  stroke(g, [[-12, -140], [-5, -133], [5, -133], [12, -140]], L.trim, 1.4);
  part(g, [[-3.6, -134], [3.6, -134], [4, -126], [-4, -126]], SKIN, { sd: 1.4, lw: 1.5, rim: false });
  head(g, 'front', o, [0, -146]);
  g.restore();
  // off arm (screen right) and its small shoulder; sword arm (screen left), the blade resting down
  const aR = B.aR, aL = B.aL;
  arm(g, aR.S, aR.e, aR.h, { upper: L.coat, fore: STEEL, cuff: GOLD });
  pauldron(g, aR.S, L, E, t, { side: -1, k: 0.7 });
  sword(g, aL.h, SWORD_DOWN, E, t, 0.86, o.gear?.weapon ?? 4);
  arm(g, aL.S, aL.e, aL.h, { upper: L.coat, fore: STEEL, cuff: GOLD, hand: false });
  fist(g, aL.h);
  pauldron(g, aL.S, L, E, t, { side: 1 });
}
export function back(g, B, o) {
  const t = B.t, E = o.element, L = trimmed(OUTFITS[o.outfit] || OUTFITS.night, o.gear);
  sword(g, B.aR.h, -SWORD_DOWN, E, t, 0.86, o.gear?.weapon ?? 4);
  for (const leg of [B.L, B.R]) legFront(g, leg.hip, leg.knee, leg.ank, { back: true });
  arm(g, B.aL.S, B.aL.e, B.aL.h, { upper: L.coat, fore: STEEL, cuff: GOLD });
  arm(g, B.aR.S, B.aR.e, B.aR.h, { upper: L.coat, fore: STEEL, cuff: GOLD });
  g.save(); g.translate(0, B.b);
  const backPts = [[-12, -126], [12, -126], [16.6, -112], [15, -96], [13, -86], [19, -60], [25 + wave(t, 1, 1.5), -30], ...hem(22, -22, -26, t, 1.8 + B.moving), [-25 + wave(t, 2, 1.5), -30], [-19, -60], [-13, -86], [-15, -96], [-16.6, -112]];
  part(g, backPts, L.coat, { sd: 3.6, lw: 2.4 });
  stroke(g, [[0, -84], [wave(t, 5, 0.8), -30]], 'rgba(0,0,0,.55)', 1.1);
  stroke(g, hem(22, -22, -26, t, 1.8 + B.moving).map((q) => [q[0], q[1] - 2.2]), L.trim, 1.5);
  part(g, [[-11, -88.6], [11, -88.6], [11.4, -82.6], [-11.4, -82.6]], LEATHER, { sd: 1.4, lw: 1.6 });
  g.save(); g.translate(0, -108); // emblem: a sun ring with rays and two wings
  g.beginPath(); g.arc(0, 0, 4.6, 0, TAU); g.lineWidth = 1.5; g.strokeStyle = L.trim; g.stroke();
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; stroke(g, [[Math.cos(a) * 6, Math.sin(a) * 6], [Math.cos(a) * 8, Math.sin(a) * 8]], L.trim, 1.1); }
  for (const s of [-1, 1]) stroke(g, [[s * 9, -1], [s * 13, -5], [s * 15, -2], [s * 12, 2]], L.trim, 1.2);
  g.restore();
  part(g, [[-12, -124], [-12.6, -141], [0, -137], [12.6, -141], [12, -124], [0, -126]], L.coat, { sd: 2.6, lw: 2.2 });
  stroke(g, [[-12, -140], [0, -136.4], [12, -140]], L.trim, 1.4);
  head(g, 'back', o, [0, -146]);
  g.restore();
  pauldron(g, B.aL.S, L, E, t, { side: 1, k: 0.7 });
  pauldron(g, B.aR.S, L, E, t, { side: -1 });
}
export { body };
