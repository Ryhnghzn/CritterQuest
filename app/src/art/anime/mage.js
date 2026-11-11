// Anime Mage (spec §39): a sorcerer in a long split robe with a tall pointed collar, a layered
// shoulder mantle, wide bell sleeves, and a tall staff crowned by a glowing crystal in golden
// prongs. Casting (R.cast) flares the crystal and the free hand. Side, front, back.
import { TAU, P, part, stroke, glow, pal, far, alongPsi, wave, hem, mix, lerp2 } from './kit.js';
import { head } from './head.js';
import { trimmed } from './gearfx.js';
import { SKIN, GOLD, LEATHER, gem, ankle, legSide, legFront, fist } from './common.js';
import { weaponFx } from './elemfx.js';
import { MYTHIC, LEGENDARY } from '../../data/items.js';

export const OUTFITS = {
  star: { name: 'Bintang', robe: pal('#2a2466', { shade: '#0c0a26', hi: '#5a54b0' }), mantle: pal('#16142e', { shade: '#060510', hi: '#3a3870' }), trim: '#e8c060', lining: pal('#5a1a6a') },
  ember: { name: 'Bara', robe: pal('#6a1a1a', { shade: '#260606', hi: '#b04a3a' }), mantle: pal('#241010', { shade: '#0c0404', hi: '#5a2a24' }), trim: '#ffb050', lining: pal('#2a0a0a') },
  frost: { name: 'Embun', robe: pal('#e4ecf6', { shade: '#7a8aaa', hi: '#ffffff' }), mantle: pal('#2a4a7a', { shade: '#0e1a32', hi: '#6a8ac0' }), trim: '#7ad0ff', lining: pal('#3a6aa8') },
};
const WOOD = pal('#3a2a34', { shade: '#140c12', hi: '#7a5a6a' });
const PANTS = pal('#24202e', { shade: '#0c0a12', hi: '#4a4458' });
export const STAFF_TOP = 60;

// By rarity: a wooden knob with a small crystal; a gold band; small prongs; big prongs and a rune
// ring; golden crescent wings and two orbs circling; Mitos a big crystal, three shards and a
// double halo.
export function staff(g, h, psi, E, t, cast = 0, lenK = 1, rar = 4) {
  g.save(); alongPsi(g, h, psi);
  const r = Math.max(0, Math.min(5, rar)), top = STAFF_TOP * lenK, k = 0.75 + 0.25 * Math.sin(t * 4) + cast * 0.9, cx = top + 12, cs = [3.4, 4, 4.6, 5.6, 6.4, 8.4][r];
  part(g, [[-58 * lenK, -1.6], [-20, -2.4], [20, -2], [top, -2.8], [top, 2.8], [20, 2], [-20, 2.4], [-58 * lenK, 1.6]], WOOD, { sd: 1.4, lw: 1.6 });
  for (const bx of r >= 1 ? [-24, 8, top - 6] : [top - 6]) part(g, [[bx, -3.4], [bx + 4, -3.6], [bx + 4, 3.6], [bx, 3.4]], r >= 1 ? GOLD : pal('#6a5040'), { sd: 1, lw: 1.2 });
  if (r === 0) part(g, [[top - 1, -4.6], [top + 6, -6], [top + 10, -1], [top + 7, 5], [top, 4.4]], WOOD, { sd: 1.6, lw: 1.6 });
  const prong = r >= 3 ? 1 : 0.6;
  if (r >= 2) for (const s of [-1, 1]) part(g, [[top - 2, s * 2], [top + 4, s * 10 * prong], [top + 14, s * 12.6 * prong], [top + 24 * prong + 4, s * 6 * prong, 1], [top + 13, s * 7.6 * prong], [top + 4, s * 3]], GOLD, { sd: 1.6, lw: 1.6 });
  if (r >= LEGENDARY) for (const s of [-1, 1]) part(g, [[top + 2, s * 4], [top - 8, s * 18], [top + 4, s * 26, 1], [top + 2, s * 16], [top + 10, s * 10]], GOLD, { sd: 1.4, lw: 1.5 }); // crescent wings
  glow(g, cx, 0, (12 + r * 2) * k + cast * 22, E.glow, r >= 1 ? 0.85 : 0.4);
  part(g, [[cx - cs * 0.8, 0], [cx, -cs, 1], [cx + cs * 0.8, 0], [cx, cs, 1]], gem(E), { sd: 1.6, lw: 1.6 });
  g.save(); g.globalCompositeOperation = 'lighter'; g.translate(cx, 0);
  if (r >= 3) { // the rune ring
    g.save(); g.rotate(t * 0.8);
    g.beginPath(); g.ellipse(0, 0, 14 + cast * 6, 4.4 + cast * 2, 0, 0, TAU); g.lineWidth = 1; g.strokeStyle = E.rune; g.globalAlpha = 0.55 + 0.3 * Math.sin(t * 3); g.stroke();
    g.restore();
  }
  const orbs = r >= MYTHIC ? 3 : r >= LEGENDARY ? 2 : 0;
  for (let i = 0; i < orbs; i++) { const a = t * 2 + i * (TAU / orbs), x = Math.cos(a) * 16, y = Math.sin(a) * 5; g.globalAlpha = 1; g.fillStyle = E.core; g.beginPath(); if (r >= MYTHIC) { g.moveTo(x, y - 3.4); g.lineTo(x + 1.6, y); g.lineTo(x, y + 3.4); g.lineTo(x - 1.6, y); } else g.arc(x, y, 1.6, 0, TAU); g.fill(); }
  if (r >= MYTHIC) for (const rr of [20, 26]) { g.beginPath(); g.ellipse(0, 0, rr, rr, 0, 0, TAU); g.lineWidth = 0.9; g.strokeStyle = rr === 20 ? E.glow : '#ffd166'; g.globalAlpha = 0.45 + 0.25 * Math.sin(t * 2 + rr); g.stroke(); }
  g.restore();
  if (cast > 0.05) { g.save(); g.globalCompositeOperation = 'lighter'; g.beginPath(); g.arc(cx, 0, 10 + (1 - cast) * 34, 0, TAU); g.lineWidth = 3 * cast; g.strokeStyle = E.glow; g.stroke(); g.restore(); }
  weaponFx(g, E, t, cx + 14, 9, top - 8); // round the crystal
  g.restore();
}
// an arm in a wide bell sleeve: narrow at the shoulder, flaring and hanging at the wrist
function sleeveArm(g, S, e, h, L, isFar = false) {
  const f = (Pl) => (isFar ? far(Pl) : Pl);
  const d = [h[0] - e[0], h[1] - e[1]], n = Math.hypot(d[0], d[1]) || 1, u = [d[0] / n, d[1] / n], v = [-u[1], u[0]];
  const ds = [e[0] - S[0], e[1] - S[1]], ns = Math.hypot(ds[0], ds[1]) || 1, vs = [-ds[1] / ns, ds[0] / ns];
  part(g, [[S[0] + vs[0] * 6.4, S[1] + vs[1] * 6.4], [e[0] + v[0] * 6, e[1] + v[1] * 6], [e[0] - v[0] * 6, e[1] - v[1] * 6], [S[0] - vs[0] * 6.4, S[1] - vs[1] * 6.4]], f(L.robe), { sd: 2.6, lw: 2 });
  fist(g, [h[0] + u[0] * 2, h[1] + u[1] * 2], f(SKIN));
  const w = (k) => [h[0] + v[0] * k, h[1] + v[1] * k];
  const sag = Math.max(4, 10 - Math.abs(u[0]) * 4); // the sleeve hangs below the wrist
  const pts = [[e[0] + v[0] * 5.6, e[1] + v[1] * 5.6], [...w(11)], [w(11)[0] + 2, w(11)[1] + sag, 1], [w(-11)[0], w(-11)[1] + sag * 0.4, 1], [...w(-10)], [e[0] - v[0] * 5.6, e[1] - v[1] * 5.6]];
  part(g, pts, f(L.robe), { sd: 2.6, lw: 2 });
  stroke(g, [pts[1], pts[2], pts[3]], isFar ? 'rgba(0,0,0,.3)' : L.trim, 1.4);
}
function mantle(g, L, E, t, sideView) { // two layered shoulder capes and the gem clasp
  const pts = sideView
    ? [[-14, -126], [-2, -132], [14, -127], [19.4, -113, 1], [8, -116], [-2, -112], [-15, -114, 1]]
    : [[-19, -122], [-8, -131], [8, -131], [19, -122], [21, -107, 1], [8, -112], [0, -108], [-8, -112], [-21, -107, 1]];
  part(g, pts.map((p) => [p[0], p[1] + 5, p[2]]), L.mantle, { sd: 2.6, lw: 2 });
  part(g, pts, L.mantle, { sd: 2.6, lw: 2 });
  stroke(g, pts.slice(sideView ? 3 : 4, sideView ? 7 : 9), L.trim, 1.3);
  const c = sideView ? [12, -126] : [0, -127];
  part(g, [[c[0], c[1] - 3.4], [c[0] + 3, c[1], 1], [c[0], c[1] + 3.4, 1], [c[0] - 3, c[1], 1]], gem(E), { sd: 1, lw: 1.2 });
  glow(g, c[0], c[1], 7, E.glow, 0.5 + 0.2 * Math.sin(t * 3));
}

// ─── side (on the skeleton) ──────────────────────────────────────────────
export function side(g, R, o) {
  const t = R.t, E = o.element, L = trimmed(OUTFITS[o.outfit] || OUTFITS.star, o.gear), mv = Math.max(R.moving, R.swing);
  const hp = P(R.hip), wind = mv * 2.4 + Math.max(0, R.lean) * 3;
  const waist = (fn) => { g.save(); g.translate(hp[0], hp[1] + 80); fn(); g.restore(); };
  const chest = (fn) => { g.save(); g.translate(hp[0], hp[1]); g.rotate(R.lean); g.translate(0, 80); fn(); g.restore(); };
  waist(() => { // the robe's long back panel
    const w = (i) => wave(t, i, 1.4 + wind * 0.5) - wind * 2.4;
    const hb = [[10, -46], [9 + w(0), -4, 1], [-1 + w(1), -9], [-11 + w(2), -2, 1], [-21 + w(3), -9], [-30 + w(4), -3, 1], [-25 + w(5) * 0.6, -40]];
    part(g, [[-9, -90], [7, -88], ...hb, [-17, -70]], L.robe, { sd: 3.6, lw: 2.4 });
    stroke(g, hb.slice(1, 6).map((q) => [q[0], q[1] - 2.4]), L.trim, 1.4);
  });
  sleeveArm(g, P(R.sB), P(R.eB), P(R.hB), L, true);
  if (R.cast > 0) glow(g, P(R.hB)[0], P(R.hB)[1], 22 * R.cast, E.glow, 0.9);
  legSide(g, P(R.hipB), P(R.kB), ankle(R.fB), { isFar: true, pants: PANTS, boot: LEATHER, w: 0.9 });
  chest(() => {
    part(g, [[-1, -129], [-12, -123], [-11.5, -104], [-9.5, -86, 1], [12, -86, 1], [15, -97], [17, -110], [14.5, -124], [7, -129]], L.robe, { sd: 3.4, lw: 2.2 });
    stroke(g, [[8, -128], [6, -110], [12, -88]], L.trim, 1.4);
    part(g, [[-10.4, -92], [13.6, -92], [14.4, -82], [-10, -81]], L.lining, { sd: 1.6, lw: 1.8 }); // sash
    part(g, [[10, -84], [14, -84], [16 + wave(t, 6, 1) - wind, -60, 1], [11 + wave(t, 6, 1) - wind, -62]], L.lining, { sd: 1.4, lw: 1.5 });
  });
  legSide(g, P(R.hipF), P(R.kF), ankle(R.fF), { pants: PANTS, boot: LEATHER, w: 0.9 });
  waist(() => { // the robe's front panel over the near leg
    const w = wave(t, 2, 1.2) - wind * 1.2;
    part(g, [[8, -86], [15, -86], [22 + w, -34], [24 + w, -6, 1], [15 + w, -10], [10 + w, -4, 1], [6, -40]], L.robe, { sd: 3, lw: 2.2 });
    stroke(g, [[15, -85], [22.6 + w, -32], [23.6 + w, -8]], L.trim, 1.3);
  });
  chest(() => {
    part(g, [[-13, -124], [-12, -156], [-6, -142], [1, -133], [4, -128, 1]], L.mantle, { sd: 2.4, lw: 2 }); // tall pointed collar
    stroke(g, [[-12.4, -153], [-6.4, -141.6], [0.6, -133]], L.trim, 1.2);
    part(g, [[4, -134], [10, -133], [10.6, -126], [4.4, -126]], SKIN, { sd: 1.6, lw: 1.6, rim: false });
    head(g, 'side', o, [6.5, -144], 12.6, -wind * 0.04);
    mantle(g, L, E, t, true);
  });
  const h = P(R.hF);
  staff(g, h, R.psi, E, t, R.cast, 1, o.gear?.weapon ?? 4);
  sleeveArm(g, P(R.sF), P(R.eF), h, L);
}

// ─── front & back ────────────────────────────────────────────────────────
const robeFront = (t, m) => [[-16, -124], [16, -124], [19, -100], [13.4, -86], [17, -50], [22 + wave(t, 1, 1.2 + m), -6], ...hem(20, -20, -3, t, 1.2 + m, 8, 4), [-22 + wave(t, 2, 1.2 + m), -6], [-17, -50], [-13.4, -86], [-19, -100]];
export function front(g, B, o) {
  const t = B.t, E = o.element, L = trimmed(OUTFITS[o.outfit] || OUTFITS.star, o.gear);
  for (const leg of [B.L, B.R]) legFront(g, leg.hip, [leg.knee[0] * 0.8, leg.knee[1]], [leg.ank[0] * 0.8, leg.ank[1]], { pants: PANTS, boot: LEATHER, w: 0.9 });
  g.save(); g.translate(0, B.b);
  part(g, [[-12, -124], [-14, -158], [-6, -142], [6, -142], [14, -158], [12, -124]], L.mantle, { sd: 2.4, lw: 2 }); // collar behind the head
  const robe = robeFront(t, B.moving);
  part(g, robe, L.robe, { sd: 3.4, lw: 2.4 });
  part(g, [[0, -88], [8, -84], [12 + wave(t, 3, 1), -6], [0, -10, 1], [-12 + wave(t, 4, 1), -6], [-8, -84]], L.lining, { sd: 2, lw: 1.8 }); // the split
  stroke(g, [[0, -88], [-12 + wave(t, 4, 1), -6]], L.trim, 1.3); stroke(g, [[0, -88], [12 + wave(t, 3, 1), -6]], L.trim, 1.3);
  stroke(g, [[-7, -124], [0, -104], [7, -124]], L.trim, 1.4);
  for (let i = 0; i < 5; i++) { const x = -16 + i * 8, y = -10 + (i % 2) * 2; glow(g, x, y, 3, E.rune, 0.5); }
  part(g, [[-14.4, -92], [14.4, -92], [14.6, -82], [-14.6, -82]], L.lining, { sd: 1.6, lw: 1.8 });
  part(g, [[-3, -93], [3, -93], [3, -81], [-3, -81]], GOLD, { sd: 1.2, lw: 1.4 });
  part(g, [[-3.6, -134], [3.6, -134], [4, -126], [-4, -126]], SKIN, { sd: 1.4, lw: 1.5, rim: false });
  head(g, 'front', o, [0, -146]);
  mantle(g, L, E, t, false);
  g.restore();
  sleeveArm(g, B.aR.S, B.aR.e, B.aR.h, L);
  staff(g, B.aL.h, Math.PI, E, t, 0, 1.15, o.gear?.weapon ?? 4);
  sleeveArm(g, B.aL.S, B.aL.e, B.aL.h, L);
}
export function back(g, B, o) {
  const t = B.t, E = o.element, L = trimmed(OUTFITS[o.outfit] || OUTFITS.star, o.gear);
  staff(g, B.aR.h, Math.PI, E, t, 0, 1.15, o.gear?.weapon ?? 4);
  for (const leg of [B.L, B.R]) legFront(g, leg.hip, [leg.knee[0] * 0.8, leg.knee[1]], [leg.ank[0] * 0.8, leg.ank[1]], { pants: PANTS, boot: LEATHER, back: true, w: 0.9 });
  sleeveArm(g, B.aL.S, B.aL.e, B.aL.h, L);
  sleeveArm(g, B.aR.S, B.aR.e, B.aR.h, L);
  g.save(); g.translate(0, B.b);
  part(g, robeFront(t, B.moving), L.robe, { sd: 3.4, lw: 2.4 });
  stroke(g, hem(20, -20, -3, t, 1.2 + B.moving, 8, 4).map((q) => [q[0], q[1] - 2.6]), L.trim, 1.4);
  g.save(); g.translate(0, -66); // a big star sewn on the back
  const star = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i / 10) * TAU, r = i % 2 ? 4 : 10; return [Math.cos(a) * r, Math.sin(a) * r, 1]; });
  stroke(g, star, L.trim, 1.4, true);
  glow(g, 0, 0, 12, E.glow, 0.25 + 0.1 * Math.sin(t * 2));
  g.restore();
  part(g, [[-14.4, -92], [14.4, -92], [14.6, -82], [-14.6, -82]], L.lining, { sd: 1.6, lw: 1.8 });
  mantle(g, L, E, t, false);
  part(g, [[-12, -124], [-14, -158], [0, -150], [14, -158], [12, -124], [0, -128]], L.mantle, { sd: 2.4, lw: 2 });
  stroke(g, [[-13.4, -155], [0, -148], [13.4, -155]], L.trim, 1.2);
  head(g, 'back', o, [0, -146]);
  g.restore();
}
export { mix, lerp2 };
