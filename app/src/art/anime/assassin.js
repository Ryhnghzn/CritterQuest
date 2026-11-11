// Anime Assassin (spec §39): a shadow blade in a fitted dark suit with a leather harness, a long
// crimson scarf streaming behind, a cloth mask over the lower face, a single spiked shoulder
// guard, wrapped legs, and two curved glowing daggers held reverse-grip. Side, front, back.
import { P, part, stroke, glow, pal, far, alongPsi, wave, trace, mix, dir } from './kit.js';
import { head } from './head.js';
import { trimmed } from './gearfx.js';
import { SKIN, DARKSTEEL, LEATHER, gem, ankle, legSide, legFront, arm, trail } from './common.js';
import { weaponFx } from './elemfx.js';
import { MYTHIC, LEGENDARY } from '../../data/items.js';
const GOLDP = pal('#e2a83a', { shade: '#86501a', hi: '#fff0a8' });

export const OUTFITS = {
  shadow: { name: 'Bayangan', suit: pal('#26222f', { shade: '#0a090f', hi: '#55506a' }), scarf: pal('#b0142a', { shade: '#4a0612', hi: '#ff5a6a' }), trim: '#9a6ae8' },
  jade: { name: 'Giok', suit: pal('#1c2a2a', { shade: '#070e0e', hi: '#46645e' }), scarf: pal('#2aa080', { shade: '#0a3a2c', hi: '#8af0c8' }), trim: '#e0c070' },
  bone: { name: 'Tulang', suit: pal('#d8d2c6', { shade: '#7a7060', hi: '#ffffff' }), scarf: pal('#2a2232', { shade: '#0a0810', hi: '#5a4a6a' }), trim: '#d04040' },
};
export const DAGGER_LEN = 40;

// By rarity: a straight plain knife; longer; curved; a serrated spine; a gold guard and a gem;
// Mitos a ghostly twin blade hovering beside it.
const DLEN_R = [30, 32, 35, 38, 40, 44];
export function dagger(g, h, psi, E, t, isFar = false, rar = 4) {
  g.save(); alongPsi(g, h, psi);
  const r = Math.max(0, Math.min(5, rar)), Ln = DLEN_R[r], p = 0.7 + 0.3 * Math.sin(t * 5), cv = r >= 2 ? 1 : 0;
  if (r >= 2) glow(g, Ln * 0.55, 0, 14, E.glow, (isFar ? 0.18 : 0.32) * p);
  part(g, [[-11, -2], [2, -2.2], [2, 2.2], [-11, 2]], isFar ? far(LEATHER) : LEATHER, { sd: 0.8, lw: 1.3 });
  part(g, [[-14, 0], [-11, -2.6, 1], [-9, 0, 1], [-11, 2.6, 1]], isFar ? far(DARKSTEEL) : DARKSTEEL, { sd: 0.8, lw: 1.2 });
  const guardP = r >= LEGENDARY ? GOLDP : DARKSTEEL;
  part(g, r >= LEGENDARY ? [[1.5, -7], [4.4, -5], [4.4, 5], [1.5, 7], [3, 0]] : [[1.5, -5.6], [4.4, -5.6], [4.4, 5.6], [1.5, 5.6]], isFar ? far(guardP) : guardP, { sd: 1, lw: 1.3 });
  const blade = [[4, -3.2], [16, -4.4 - cv], [30 * Ln / 40, -4.6 - cv * 1.2], [Ln, -2 * cv, 1], [32 * Ln / 40, 1.4], [18, 3.2], [4, 3.2]];
  if (r >= 3) blade.splice(2, 0, [20, -6.4, 1], [23, -4.8], [26, -7, 1], [29, -5]);
  const shape = (pts) => {
    g.save(); g.beginPath(); trace(g, pts); g.clip();
    const gr = g.createLinearGradient(0, -6, 0, 4);
    if (r >= 2) { gr.addColorStop(0, E.edge); gr.addColorStop(0.45, E.core); gr.addColorStop(1, mix(E.edge, '#000000', 0.4)); }
    else { gr.addColorStop(0, '#7a8294'); gr.addColorStop(0.5, '#e4e8f0'); gr.addColorStop(1, '#4a5062'); }
    g.fillStyle = isFar ? mix(r >= 2 ? E.edge : '#7a8294', '#000000', 0.5) : gr; g.fillRect(0, -10, Ln + 2, 18);
    g.restore();
    g.beginPath(); trace(g, pts); g.lineWidth = 1.7; g.strokeStyle = '#130b1a'; g.stroke();
  };
  if (r >= MYTHIC && !isFar) { // the ghost twin
    g.save(); g.globalAlpha = 0.45 + 0.2 * Math.sin(t * 3); g.translate(4, -9 + Math.sin(t * 2.6) * 1.6); shape(blade); g.restore();
    glow(g, Ln * 0.6, -9, 12, E.glow, 0.5);
  }
  shape(blade);
  if (r >= LEGENDARY) { part(g, [[3, -1.8], [4.8, 0, 1], [3, 1.8, 1], [1.2, 0, 1]], gem(E), { sd: 0.6, lw: 0.9 }); }
  if (!isFar) weaponFx(g, E, t, Ln, 5, 6);
  g.restore();
}
const legGear = (L) => ({ pants: L.suit, boot: pal(mix(L.suit.base, '#000000', 0.3)), wraps: mix(L.suit.hi, '#ffffff', 0.15), w: 0.9 });
function guard(g, S, L, turn = 0, side = 1) { // the spiked shoulder guard
  g.save(); g.translate(S[0], S[1] - 2); g.rotate(turn); g.scale(side, 1);
  part(g, [[-4, -7], [-12, -15, 1], [-6, -9], [-11, -5, 1]], DARKSTEEL, { sd: 1.2, lw: 1.5 });
  part(g, [[-10, 0], [-6, -8], [5, -9], [11, -2], [10, 4, 1], [0, 2], [-9, 4, 1]], DARKSTEEL, { sd: 2, lw: 1.8 });
  stroke(g, [[-8.6, 2.2], [0, 0.4], [9.6, 2.4]], L.trim, 1.2);
  g.restore();
}

// ─── side (on the skeleton) ──────────────────────────────────────────────
// The skeleton holds the daggers reverse-grip (blade back along the forearm). That reads as a
// punch when the blade is big, so through the strike (R.swing) the blade swings round to lead
// the blow, along the arm, and back to the reverse grip after it.
const LEAD = 0.3; // radians past the arm's line at the hit
const ang = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const toward = (from, to, k) => from + ang(to - from) * k;
const psiF = (Q) => toward(Q.psi, Q.phi + LEAD, Q.swing);
const psiB = (Q) => toward(Q.psiB, Q.phiB + LEAD, Q.swing);
const tipAt = (hand, psiOf) => (Q) => { const h = P(Q[hand]), d = dir(psiOf(Q)); return [[h[0] + d[0] * DAGGER_LEN, h[1] + d[1] * DAGGER_LEN], [h[0] + d[0] * DAGGER_LEN * 0.3, h[1] + d[1] * DAGGER_LEN * 0.3]]; };

export function side(g, R, o, pose, rigFn) {
  const t = R.t, E = o.element, L = trimmed(OUTFITS[o.outfit] || OUTFITS.shadow, o.gear), mv = Math.max(R.moving, R.swing);
  const hp = P(R.hip), wind = mv * 3 + Math.max(0, R.lean) * 4;
  const ob = { ...o, mask: L.suit };
  const chest = (fn) => { g.save(); g.translate(hp[0], hp[1]); g.rotate(R.lean); g.translate(0, 80); fn(); g.restore(); };
  chest(() => { // the scarf's two long tails stream back from the neck
    const w = (i) => wave(t * 1.4, i, 2 + wind * 0.8) - wind * 4;
    part(g, [[-2, -132], [-8, -127], [-28 + w(0), -122], [-50 + w(1) * 1.4, -118, 1], [-34 + w(2), -114], [-48 + w(3) * 1.4, -104, 1], [-28 + w(4), -108], [-6, -121]], L.scarf, { sd: 2.6, lw: 2 });
    part(g, [[-4, -130], [-24 + w(5), -128], [-40 + w(6) * 1.3, -130, 1], [-26 + w(7), -124], [-6, -125]], L.scarf, { sd: 2, lw: 1.8 });
  });
  if (pose && rigFn) trail(g, R, pose, rigFn, 'assassin', tipAt('hB', psiB), E);
  dagger(g, P(R.hB), psiB(R), E, t, true, o.gear?.weapon ?? 4);
  arm(g, P(R.sB), P(R.eB), P(R.hB), { isFar: true, upper: L.suit, fore: LEATHER, w: 0.86 });
  legSide(g, P(R.hipB), P(R.kB), ankle(R.fB), { isFar: true, ...legGear(L) });
  chest(() => {
    part(g, [[-1, -128], [-11, -122], [-10, -104], [-8, -86, 1], [11, -86, 1], [14, -97], [16, -110], [13.5, -123], [7, -128]], L.suit, { sd: 3.2, lw: 2.2 });
    part(g, [[2, -122], [11, -124], [15.4, -114], [13, -104], [5, -106]], DARKSTEEL, { sd: 2, lw: 1.7 }); // chest plate
    stroke(g, [[3, -112], [8, -110], [14, -112]], L.trim, 1.1);
    part(g, [[10, -126], [13, -124], [0, -88], [-3, -90]], LEATHER, { sd: 1, lw: 1.3 }); // harness
    part(g, [[-9, -89], [12.6, -89], [13, -82], [-9, -81.4]], LEATHER, { sd: 1.4, lw: 1.6 });
    for (const x of [-6, 4]) part(g, [[x, -83], [x + 5, -83], [x + 5, -76], [x, -76]], LEATHER, { sd: 1, lw: 1.3 }); // pouches
    const w = wind * 2 + wave(t, 2, 1.2);
    part(g, [[-8, -86], [2, -86], [-6 - w, -56, 1], [-16 - w, -62]], L.suit, { sd: 2.2, lw: 1.8 }); // waist flap
    stroke(g, [[1.6, -85], [-5.6 - w, -57]], L.trim, 1);
  });
  legSide(g, P(R.hipF), P(R.kF), ankle(R.fF), legGear(L));
  chest(() => {
    part(g, [[-10, -124], [-11, -136], [-2, -135], [8, -131], [12, -126, 1], [2, -122]], L.scarf, { sd: 2.2, lw: 2 }); // scarf round the neck
    part(g, [[4, -134], [10, -133], [10.6, -126], [4.4, -126]], SKIN, { sd: 1.6, lw: 1.6, rim: false });
    head(g, 'side', ob, [6.5, -144], 12.6, -wind * 0.05);
  });
  const h = P(R.hF);
  arm(g, P(R.sF), P(R.eF), h, { upper: L.suit, fore: LEATHER, w: 0.88 });
  if (pose && rigFn) trail(g, R, pose, rigFn, 'assassin', tipAt('hF', psiF), E);
  dagger(g, h, psiF(R), E, t, false, o.gear?.weapon ?? 4);
  guard(g, P(R.sF), L, R.lean + (R.phi - 0.9) * 0.25);
}

// ─── front & back ────────────────────────────────────────────────────────
const UP = Math.PI - 0.4; // reverse grip: the blade runs up along the forearm
function torsoFront(g, L, t) {
  part(g, [[-8, -128], [-16, -123], [-16, -110], [-12, -98], [-9.6, -86, 1], [9.6, -86, 1], [12, -98], [16, -110], [16, -123], [8, -128]], L.suit, { sd: 3.2, lw: 2.2 });
  part(g, [[-11, -121], [0, -124], [11, -121], [12, -108], [0, -104], [-12, -108]], DARKSTEEL, { sd: 2, lw: 1.8 });
  stroke(g, [[-10, -114], [0, -110], [10, -114]], L.trim, 1.1);
  for (const s of [-1, 1]) part(g, [[s * 12, -122], [s * 14, -120], [-s * 8, -88], [-s * 10, -89]], LEATHER, { sd: 1, lw: 1.3 }); // crossed harness
  part(g, [[-10.4, -89.4], [10.4, -89.4], [10.8, -81.6], [-10.8, -81.6]], LEATHER, { sd: 1.4, lw: 1.6 });
  for (const x of [-9, 4]) part(g, [[x, -83], [x + 5, -83], [x + 5, -76], [x, -76]], LEATHER, { sd: 1, lw: 1.3 });
  for (const s of [-1, 1]) part(g, [[s * 4, -82], [s * 10, -82], [s * (11 + wave(t, s + 4, 0.8)), -62, 1], [s * 5, -66, 1]], L.suit, { sd: 2, lw: 1.6 });
}
export function front(g, B, o) {
  const t = B.t, E = o.element, L = trimmed(OUTFITS[o.outfit] || OUTFITS.shadow, o.gear), ob = { ...o, mask: L.suit };
  const w = wave(t * 1.4, 1, 2 + B.moving * 2);
  part(g, [[6, -130], [16, -124], [26 + w, -104], [30 + w * 1.4, -86, 1], [20 + w, -96], [10, -118]], L.scarf, { sd: 2.4, lw: 2 }); // a tail behind
  for (const leg of [B.L, B.R]) legFront(g, leg.hip, leg.knee, leg.ank, legGear(L));
  g.save(); g.translate(0, B.b);
  torsoFront(g, L, t);
  part(g, [[-3.6, -134], [3.6, -134], [4, -126], [-4, -126]], SKIN, { sd: 1.4, lw: 1.5, rim: false });
  head(g, 'front', ob, [0, -146]);
  part(g, [[-12, -122], [-13, -134], [0, -131], [13, -134], [12, -122], [0, -125]], L.scarf, { sd: 2.2, lw: 2 }); // scarf round the neck
  part(g, [[-6, -126], [-2, -124], [-5 + wave(t, 3, 1), -98], [-9 + wave(t, 3, 1.2), -94, 1], [-10, -110]], L.scarf, { sd: 2, lw: 1.8 }); // a tail in front
  g.restore();
  for (const [a, s] of [[B.aL, -1], [B.aR, 1]]) {
    arm(g, a.S, a.e, a.h, { upper: L.suit, fore: LEATHER, w: 0.88 });
    dagger(g, a.h, s * UP, E, t, false, o.gear?.weapon ?? 4);
  }
  guard(g, B.aL.S, L, 0, 1);
}
export function back(g, B, o) {
  const t = B.t, E = o.element, L = trimmed(OUTFITS[o.outfit] || OUTFITS.shadow, o.gear);
  for (const [a, s] of [[B.aL, -1], [B.aR, 1]]) dagger(g, a.h, s * UP, E, t, true, o.gear?.weapon ?? 4);
  for (const leg of [B.L, B.R]) legFront(g, leg.hip, leg.knee, leg.ank, { ...legGear(L), back: true });
  for (const a of [B.aL, B.aR]) arm(g, a.S, a.e, a.h, { upper: L.suit, fore: LEATHER, w: 0.88 });
  g.save(); g.translate(0, B.b);
  part(g, [[-8, -128], [-16, -123], [-16, -110], [-12, -98], [-9.6, -86, 1], [9.6, -86, 1], [12, -98], [16, -110], [16, -123], [8, -128]], L.suit, { sd: 3.2, lw: 2.2 });
  for (const s of [-1, 1]) part(g, [[s * 12, -122], [s * 14, -120], [-s * 8, -88], [-s * 10, -89]], LEATHER, { sd: 1, lw: 1.3 });
  part(g, [[-10.4, -89.4], [10.4, -89.4], [10.8, -81.6], [-10.8, -81.6]], LEATHER, { sd: 1.4, lw: 1.6 });
  for (const s of [-1, 1]) part(g, [[s * 1, -82], [s * 10, -82], [s * (11 + wave(t, s + 4, 0.8)), -58, 1], [s * 2, -62, 1]], L.suit, { sd: 2, lw: 1.6 });
  head(g, 'back', o, [0, -146]);
  part(g, [[-12, -122], [-13, -136], [0, -133], [13, -136], [12, -122], [0, -125]], L.scarf, { sd: 2.2, lw: 2 });
  const w = (i) => wave(t * 1.4, i, 1.6 + B.moving * 2); // the two tails down the back
  part(g, [[-3, -128], [3, -128], [5 + w(1), -96], [9 + w(2) * 1.4, -64, 1], [1 + w(3), -78], [-2 + w(4), -100]], L.scarf, { sd: 2.2, lw: 1.9 });
  part(g, [[-5, -127], [0, -126], [-4 + w(5), -100], [-10 + w(6) * 1.4, -72, 1], [-11 + w(7), -96]], L.scarf, { sd: 2.2, lw: 1.9 });
  g.restore();
  guard(g, B.aR.S, L, 0, -1);
}
export { glow, gem };
