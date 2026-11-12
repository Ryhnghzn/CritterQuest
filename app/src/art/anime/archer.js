// Anime Archer (spec §39): a ranger in a fitted tunic and laced leather vest, the hood down, a
// short cape off one shoulder, a quiver on the back, tall boots, and a big recurve bow whose
// string and arrows glow with the element. Side view on the skeleton, front, back.
import { TAU, P, part, stroke, glow, pal, far, alongPsi, wave, mix } from './kit.js';
import { head } from './head.js';
import { trimmed } from './gearfx.js';
import { SKIN, GOLD, LEATHER, gem, ankle, legSide, legFront, arm, fist, motes } from './common.js';
import { weaponFx } from './elemfx.js';
import { MYTHIC, LEGENDARY } from '../../data/items.js';

export const OUTFITS = {
  forest: { name: 'Hutan', cloth: pal('#2e6a4e', { shade: '#0e2a20', hi: '#6aae86' }), cape: pal('#1e3e34', { shade: '#08160f', hi: '#4a7a62' }), trim: '#d9b25a' },
  dusk: { name: 'Senja', cloth: pal('#7a2a3a', { shade: '#2e0a14', hi: '#c86070' }), cape: pal('#3a1a26', { shade: '#14060c', hi: '#7a4458' }), trim: '#e8c070' },
  snow: { name: 'Salju', cloth: pal('#dfe6ee', { shade: '#7a88a6', hi: '#ffffff' }), cape: pal('#3a5a8a', { shade: '#12203e', hi: '#7a9ad0' }), trim: '#7ac8ff' },
};
const VEST = pal('#6a4630', { shade: '#2a160c', hi: '#a87a54' });
const BOWWOOD = pal('#3a2430', { shade: '#120a10', hi: '#7a5468' });
const PANTS = pal('#3a3230', { shade: '#151010', hi: '#665a54' });
export const BOW_H = 48;

// bow in the hand: +x along the arrow, limbs along ±y; draw/nock: from the skeleton.
// By rarity: plain wood; curled tips; gold tips; blade spurs on the limbs; gold wings at the grip;
// Mitos the longest, with a rune ring turning round the grip and feathers of light hovering.
const H_R = [40, 42, 44, 47, 50, 54];
export function bow(g, h, psi, E, t, draw = 0, nock = 0, rar = 4) {
  g.save(); alongPsi(g, h, psi);
  const r = Math.max(0, Math.min(5, rar)), H = H_R[r], sx = -6 - draw * 36 * nock, lit = r >= 2;
  if (r >= MYTHIC) { // the rune ring round the grip, seen edge-on, and hovering light feathers
    g.save(); g.globalCompositeOperation = 'lighter'; g.rotate(Math.PI / 2);
    g.beginPath(); g.ellipse(0, 0, 18, 6, 0, 0, TAU); g.lineWidth = 1.4; g.strokeStyle = E.rune; g.globalAlpha = 0.8; g.stroke();
    for (let i = 0; i < 6; i++) { const a = t * 2 + (i / 6) * TAU; g.fillStyle = E.core; g.fillRect(Math.cos(a) * 18 - 1, Math.sin(a) * 6 - 1, 2, 2); }
    g.restore();
    for (const s of [-1, 1]) for (let i = 0; i < 2; i++) {
      const y = s * (H * 0.55 + i * 10), x = -16 - i * 6 + Math.sin(t * 2 + i + s) * 2;
      part(g, [[x + 6, y], [x - 6, y - s * 3, 1], [x - 9, y + s * 2, 1]], pal(E.edge, { hi: E.core }), { sd: 0.6, lw: 1 });
      glow(g, x, y, 6, E.glow, 0.5);
    }
  }
  for (const s of [-1, 1]) {
    const tip = r >= 1 ? [[-7, s * H * 0.94], [-3, s * (H + 5), 1], [-10, s * H * 0.93]] : [[-5, s * H, 1], [-8, s * H * 0.95]];
    part(g, [[3, 0], [3.6, s * H * 0.3], [-2, s * H * 0.72], ...tip, [-5.4, s * H * 0.7], [-1.6, s * H * 0.3], [-1.6, 0]], r >= LEGENDARY ? pal('#2a1e2e', { hi: '#8a6a8a' }) : BOWWOOD, { sd: 1.6, lw: 1.8 });
    if (r >= 2) part(g, [[-6.4, s * H * 0.9], [-2.6, s * (H + 5.4), 1], [-8.6, s * H * 0.96]], GOLD, { sd: 1, lw: 1.2 });
    if (r >= 3) part(g, [[1.6, s * H * 0.42], [9, s * H * 0.5, 1], [0.6, s * H * 0.58]], pal('#c8ccd8', { hi: '#ffffff' }), { sd: 0.8, lw: 1.2 }); // blade spur
    if (lit) stroke(g, [[2, s * 4], [1.4, s * H * 0.32], [-3.4, s * H * 0.7]], mix(E.edge, '#ffffff', 0.2), 0.9);
  }
  if (r >= LEGENDARY) for (const s of [-1, 1]) part(g, [[1, s * 5], [10, s * 13, 1], [6, s * 7], [12, s * 7, 1], [3, s * 3]], GOLD, { sd: 1, lw: 1.2 }); // grip wings
  part(g, [[-2.6, -6], [3.4, -6], [3.4, 6], [-2.6, 6]], LEATHER, { sd: 1, lw: 1.4 });
  if (r >= 3) { part(g, [[3, -3], [6, 0, 1], [3, 3, 1], [0.4, 0, 1]], gem(E), { sd: 1, lw: 1.1 }); glow(g, 3, 0, 8, E.glow, 0.6 + 0.2 * Math.sin(t * 4)); }
  g.beginPath(); g.moveTo(-3.4, -H - 3); g.lineTo(sx, 0); g.lineTo(-3.4, H + 3);
  g.lineWidth = 1; g.strokeStyle = lit ? E.core : '#e8e2d0'; g.stroke();
  if (lit) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.5 + 0.3 * Math.sin(t * 5); g.lineWidth = 2.6; g.strokeStyle = E.glow; g.stroke(); g.restore(); }
  if (nock > 0.05) { // an arrow on the string
    const tip = sx + 62;
    part(g, [[sx, -0.9], [tip - 8, -0.9], [tip - 8, 0.9], [sx, 0.9]], BOWWOOD, { sd: 0.6, lw: 1 });
    part(g, [[tip - 9, -3.4], [tip + 2, 0, 1], [tip - 9, 3.4, 1], [tip - 7, 0]], lit ? gem(E) : pal('#9aa4b8'), { sd: 1, lw: 1.2 });
    part(g, [[sx + 1, 0], [sx + 9, -3.6, 1], [sx + 11, 0, 1], [sx + 9, 3.6, 1]], lit ? pal(E.edge, { hi: E.core }) : pal('#d8d0b8'), { sd: 0.8, lw: 1 });
    if (lit) glow(g, tip - 3, 0, 10 + draw * 8, E.glow, 0.5 + 0.5 * draw);
    weaponFx(g, E, t, tip, 3.4, sx + 12);
  }
  g.save(); g.rotate(Math.PI / 2); weaponFx(g, E, t, H, 4.4, -H); g.restore();
  g.restore();
}
function quiver(g, x0, y0, x1, y1, E, L, isFar = false) { // from the bottom (x0,y0) to the mouth (x1,y1)
  const dx = x1 - x0, dy = y1 - y0, n = Math.hypot(dx, dy), nx = -dy / n * 5, ny = dx / n * 5;
  for (let i = 0; i < 3; i++) { // fletchings sticking out
    const ox = (i - 1) * 3.4, fx = x1 + dx / n * 9 + ox * nx / 5, fy = y1 + dy / n * 9 + ox * ny / 5;
    part(g, [[x1 + ox * nx / 5, y1 + ox * ny / 5], [fx - 2.4, fy], [fx + dx / n * 3, fy + dy / n * 3, 1], [fx + 2.4, fy]], isFar ? far(pal(E.edge)) : pal(E.edge, { hi: E.core }), { sd: 0.8, lw: 1.2 });
  }
  const pts = [[x0 + nx * 0.8, y0 + ny * 0.8], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx * 0.8, y0 - ny * 0.8]];
  part(g, pts, isFar ? far(LEATHER) : LEATHER, { sd: 2, lw: 1.8 });
  for (const k of [0.2, 0.85]) { const x = x0 + dx * k, y = y0 + dy * k; stroke(g, [[x + nx, y + ny], [x - nx, y - ny]], L.trim, 1.4); }
}
const legGear = (L) => ({ pants: PANTS, tall: true, boot: LEATHER, cuff: L.trim, w: 0.94 });

// ─── side (on the skeleton) ──────────────────────────────────────────────
export function side(g, R, o) {
  const t = R.t, E = o.element, L = trimmed(OUTFITS[o.outfit] || OUTFITS.forest, o.gear), mv = Math.max(R.moving, R.swing);
  const hp = P(R.hip), wind = mv * 2.4 + Math.max(0, R.lean) * 3, drawing = R.nock > 0.3;
  const waist = (fn) => { g.save(); g.translate(hp[0], hp[1] + 80); fn(); g.restore(); };
  const chest = (fn) => { g.save(); g.translate(hp[0], hp[1]); g.rotate(R.lean); g.translate(0, 80); fn(); g.restore(); };
  chest(() => { // short cape off the far shoulder, the quiver on the back
    const w = wind * 3 + wave(t, 1, 1.4);
    part(g, [[-4, -128], [-14, -122], [-22 - w, -94], [-31 - w, -66, 1], [-21 - w, -72], [-17 - w, -60, 1], [-8, -86], [2, -120]], L.cape, { sd: 3, lw: 2.2 });
    stroke(g, [[-22 - w, -93], [-30 - w, -67]], L.trim, 1.2);
    quiver(g, -6, -94, -15, -131, E, L);
  });
  if (!drawing) arm(g, P(R.sB), P(R.eB), P(R.hB), { isFar: true, upper: L.cloth, fore: VEST, cuff: GOLD, w: 0.92 });
  waist(() => { // the tunic's back flap
    const w = wind * 2 + wave(t, 2, 1);
    part(g, [[-9, -86], [1, -86], [-5 - w, -60, 1], [-15 - w, -64]], L.cloth, { sd: 2.2, lw: 1.8 });
  });
  legSide(g, P(R.hipB), P(R.kB), ankle(R.fB), { isFar: true, ...legGear(L) });
  chest(() => {
    part(g, [[-1, -128], [-11, -123], [-10.5, -104], [-8.5, -86, 1], [12, -86, 1], [15, -97], [17, -110], [14.5, -123], [7, -128]], L.cloth, { sd: 3.4, lw: 2.2 });
    part(g, [[0, -120], [10, -123], [16, -112], [15, -98], [9, -92], [1, -96], [-2, -108]], VEST, { sd: 2.6, lw: 1.9 });
    stroke(g, [[8, -118], [11, -114], [8, -110], [11, -106], [8, -102], [11, -98]], L.trim, 0.9);
    part(g, [[11, -126], [14, -124], [-2, -91], [-5, -93]], LEATHER, { sd: 1, lw: 1.4 }); // quiver strap
    part(g, [[-9.4, -89], [13, -89], [13.4, -82], [-9.4, -81.4]], LEATHER, { sd: 1.6, lw: 1.7 });
    part(g, [[7, -90], [11.4, -90], [11.4, -81], [7, -81]], GOLD, { sd: 1.2, lw: 1.4 });
    part(g, [[-6, -84], [0, -84], [0, -76], [-6, -76]], VEST, { sd: 1.2, lw: 1.4 }); // pouch
  });
  legSide(g, P(R.hipF), P(R.kF), ankle(R.fF), legGear(L));
  waist(() => {
    const w = wind * 1.4 + wave(t, 3, 0.9);
    part(g, [[6, -84], [15, -84], [19 - w, -62], [12 - w, -58, 1], [8, -66]], L.cloth, { sd: 2.2, lw: 1.8 });
    stroke(g, [[15, -83], [18.4 - w, -62.6]], L.trim, 1.1);
  });
  chest(() => { // the hood down round the neck, neck, head
    part(g, [[-13, -126], [-15, -141], [-6, -139], [3, -131], [8, -127, 1], [-2, -123]], L.cape, { sd: 2.6, lw: 2.2 });
    stroke(g, [[-14, -139], [-6, -137], [2.4, -131]], L.trim, 1.1);
    part(g, [[4, -134], [10, -133], [10.6, -126], [4.4, -126]], SKIN, { sd: 1.6, lw: 1.6, rim: false });
    head(g, 'side', o, [6.5, -144], 12.6, -wind * 0.04);
  });
  const h = P(R.hF);
  bow(g, h, R.psi, E, t, R.draw, R.nock, o.gear?.weapon ?? 4);
  arm(g, P(R.sF), P(R.eF), h, { upper: L.cloth, fore: VEST, cuff: GOLD, w: 0.94 });
  if (drawing) arm(g, P(R.sB), P(R.eB), P(R.hB), { upper: L.cloth, fore: VEST, cuff: GOLD, w: 0.92 });
  part(g, [[P(R.sF)[0] - 8, P(R.sF)[1] - 4], [P(R.sF)[0] + 2, P(R.sF)[1] - 9], [P(R.sF)[0] + 10, P(R.sF)[1] - 3], [P(R.sF)[0] + 8, P(R.sF)[1] + 4, 1], [P(R.sF)[0] - 6, P(R.sF)[1] + 3, 1]], VEST, { sd: 1.8, lw: 1.7 }); // shoulder guard
}

// ─── front & back ────────────────────────────────────────────────────────
function torsoFront(g, B, L, E) {
  part(g, [[-8, -128], [-16, -123], [-16.6, -112], [-12.6, -100], [-10, -86, 1], [10, -86, 1], [12.6, -100], [16.6, -112], [16, -123], [8, -128]], L.cloth, { sd: 3.2, lw: 2.2 });
  part(g, [[-11, -118], [0, -121], [11, -118], [12, -102], [7, -92], [-7, -92], [-12, -102]], VEST, { sd: 2.6, lw: 1.9 });
  for (let y = -116; y < -94; y += 4) stroke(g, [[-2.2, y], [2.2, y + 2]], L.trim, 0.9);
  part(g, [[-14, -124], [-11, -126], [12, -90], [9, -88]], LEATHER, { sd: 1, lw: 1.4 }); // quiver strap
  part(g, [[-10.4, -89.4], [10.4, -89.4], [10.8, -81.6], [-10.8, -81.6]], LEATHER, { sd: 1.6, lw: 1.7 });
  part(g, [[-2.4, -90], [2.4, -90], [2.4, -81], [-2.4, -81]], GOLD, { sd: 1.2, lw: 1.4 });
  for (const s of [-1, 1]) part(g, [[s * 2, -82], [s * 10, -82], [s * (12 + wave(B.t, s + 3, 0.8)), -60, 1], [s * 3, -64, 1]], L.cloth, { sd: 2, lw: 1.7 });
  part(g, [[-12, -124], [-14, -136], [-5, -132], [5, -132], [14, -136], [12, -124], [0, -126]], L.cape, { sd: 2.4, lw: 2 }); // hood down
}
export function front(g, B, o) {
  const t = B.t, E = o.element, L = trimmed(OUTFITS[o.outfit] || OUTFITS.forest, o.gear);
  quiver(g, -10, -96, -15, -134, E, L, true); // only its mouth shows over the right shoulder
  for (const leg of [B.L, B.R]) legFront(g, leg.hip, leg.knee, leg.ank, legGear(L));
  g.save(); g.translate(0, B.b);
  torsoFront(g, B, L, E);
  part(g, [[-3.6, -134], [3.6, -134], [4, -126], [-4, -126]], SKIN, { sd: 1.4, lw: 1.5, rim: false });
  head(g, 'front', o, [0, -146]);
  const w = wave(t, 1, 1.2 + B.moving); // the short cape over the left shoulder (screen right)
  part(g, [[8, -128], [19, -124], [22 + w, -100], [24 + w, -84, 1], [16 + w, -90], [12, -112]], L.cape, { sd: 2.6, lw: 2 });
  stroke(g, [[19, -123], [23 + w, -86]], L.trim, 1.1);
  g.restore();
  arm(g, B.aL.S, B.aL.e, B.aL.h, { upper: L.cloth, fore: VEST, cuff: GOLD, w: 0.94 });
  bow(g, B.aR.h, B.wpsi ?? Math.PI / 2, E, t, B.draw ?? 0, B.draw ? 1 : 0, o.gear?.weapon ?? 4);
  arm(g, B.aR.S, B.aR.e, B.aR.h, { upper: L.cloth, fore: VEST, cuff: GOLD, w: 0.94 });
}
export function back(g, B, o) {
  const t = B.t, E = o.element, L = trimmed(OUTFITS[o.outfit] || OUTFITS.forest, o.gear);
  bow(g, B.aL.h, B.wpsi ?? -Math.PI / 2, E, t, B.draw ?? 0, B.draw ? 1 : 0, o.gear?.weapon ?? 4);
  for (const leg of [B.L, B.R]) legFront(g, leg.hip, leg.knee, leg.ank, { ...legGear(L), back: true });
  arm(g, B.aL.S, B.aL.e, B.aL.h, { upper: L.cloth, fore: VEST, cuff: GOLD, w: 0.94 });
  arm(g, B.aR.S, B.aR.e, B.aR.h, { upper: L.cloth, fore: VEST, cuff: GOLD, w: 0.94 });
  g.save(); g.translate(0, B.b);
  part(g, [[-8, -128], [-16, -123], [-16.6, -112], [-12.6, -100], [-10, -86, 1], [10, -86, 1], [12.6, -100], [16.6, -112], [16, -123], [8, -128]], L.cloth, { sd: 3.2, lw: 2.2 });
  part(g, [[-10.4, -89.4], [10.4, -89.4], [10.8, -81.6], [-10.8, -81.6]], LEATHER, { sd: 1.6, lw: 1.7 });
  for (const s of [-1, 1]) part(g, [[s * 1, -82], [s * 10, -82], [s * (12 + wave(t, s + 3, 0.8)), -58, 1], [s * 2, -62, 1]], L.cloth, { sd: 2, lw: 1.7 });
  const w = wave(t, 1, 1.2 + B.moving); // the cape over the left shoulder (screen left from behind)
  part(g, [[-8, -128], [-19, -124], [-23 - w, -98], [-25 - w, -78, 1], [-15 - w, -86], [-4, -110]], L.cape, { sd: 2.6, lw: 2 });
  quiver(g, 6, -92, -9, -133, E, L);
  part(g, [[-12, -124], [-15, -142], [0, -146], [15, -142], [12, -124], [0, -128]], L.cape, { sd: 2.6, lw: 2 }); // hood down
  stroke(g, [[-14, -140], [0, -144], [14, -140]], L.trim, 1.1);
  head(g, 'back', o, [0, -146]);
  g.restore();
}
export { motes };
