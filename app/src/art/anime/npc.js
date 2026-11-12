// Anime townsfolk (spec §39, sample — app/npc.html): the same 22 archetypes as the style-D
// townsfolk (art/hero/npc.js archParts: build, clothes, headwear, beard, prop, job idle), drawn in
// the anime style. Side view on the 'npc' skeleton (rig.js NPC_IDLE: hammering, guarding, a cane…),
// front and back with the common walk. Colours from the NPC's outfit [main, shade].
import { TAU, P, part, stroke, glow, pal, far, mix, alongPsi, wave, trace, lerp2 } from './kit.js';
import { head } from './head.js';
import { SKIN, STEEL, GOLD, LEATHER, ankle, legSide, legFront, arm, body } from './common.js';
import { pauldron } from './warrior.js';
import { bow } from './archer.js';
import { ELEMENTS } from './common.js';
import { rig } from '../hero/rig.js';
import { archParts } from '../hero/npc.js';

const SHIRT = pal('#c8b89c', { shade: '#5a4a38', hi: '#f2e8d4' });
const WOOD = pal('#7a5434', { shade: '#2e1a0e', hi: '#b48a5a' });
const PLAIN = { ...ELEMENTS.ice, edge: '#8a94a8', core: '#eef2f8', glow: '#1a1e26', fx: 'none' };
const BUILD = { normal: 1, stout: 1.18, thin: 0.88, old: 0.92 };
const STYLE_OF = ['slick', 'spiky', 'long', 'part', 'tail', 'swept'];
const COLOUR_OF = ['black', 'brown', 'gold', 'crimson', 'azure', 'silver'];

function colours(o, parts) {
  const [main, shade] = o.outfit || ['#5a7a3a', '#344a22'];
  const cloth = pal(main, { shade: mix(shade, '#140a24', 0.4) });
  return { cloth, dark: pal(shade, { shade: mix(shade, '#000000', 0.5) }), pants: pal(mix(shade, '#2a2430', 0.5), { shade: '#110d18' }), old: parts.build === 'old' };
}
function headLook(o, C) {
  const l = o.look || {};
  return { style: STYLE_OF[l.hair] || 'part', hair: C.old ? 'silver' : COLOUR_OF[l.hairColor] || 'brown', eye: '#7a5a3a', t: o.t, gear: {} };
}

// ─── headwear & beard (c = skull centre; drawn over the hair) ────────────
const rel = (c, pts) => pts.map(([x, y, k]) => [c[0] + x, c[1] + y, k]);
function headwear(g, kind, view, c, C, t) {
  const side = view === 'side', back = view === 'back', cl = C.cloth, dk = C.dark;
  if (kind === 'cap') {
    part(g, rel(c, side ? [[-12, -3], [-11, -11], [0, -15], [10, -12], [13, -6], [20, -4, 1], [12, -2], [-12, 0]] : [[-13, -3], [-12, -11], [0, -15], [12, -11], [13, -3], [0, -1]]), cl, { sd: 2, lw: 1.8 });
    stroke(g, rel(c, side ? [[-12, -2], [12, -3]] : [[-13, -3], [0, -1], [13, -3]]), dk.base, 1.4);
  } else if (kind === 'scarf') { // a kerchief tied at the back
    part(g, rel(c, side ? [[-13, 0], [-11, -11], [0, -15], [11, -11], [13, -4], [4, -6], [-6, -4]] : [[-13, -2], [-12, -11], [0, -15], [12, -11], [13, -2], [0, -5]]), cl, { sd: 2, lw: 1.8 });
    if (!side || back) { /* knot only shows from the side or the back */ }
    if (side || back) part(g, rel(c, side ? [[-13, -2], [-20, 6, 1], [-16, 4], [-18, 12, 1], [-11, 2]] : [[-3, -2], [-6, 10, 1], [0, 6], [6, 10, 1], [3, -2]]), dk, { sd: 1.2, lw: 1.5 });
  } else if (kind === 'hood') {
    if (back) { part(g, rel(c, [[-16, 10], [-17, -6], [-10, -17], [0, -19], [10, -17], [17, -6], [16, 10], [0, 14]]), cl, { sd: 3, lw: 2 }); return; }
    const outer = side ? [[-17, 10], [-16, -8], [-6, -18], [8, -17], [16, -9], [13, -4], [6, -11], [-4, -9], [-7, 6]] : [[-16, 9], [-17, -6], [-10, -17], [0, -19], [10, -17], [17, -6], [16, 9], [11, 8], [11, -6], [0, -12], [-11, -6], [-11, 8]];
    part(g, rel(c, outer), cl, { sd: 3, lw: 2 });
    stroke(g, rel(c, side ? [[13, -4], [6, -11], [-4, -9]] : [[11, 8], [11, -6], [0, -12], [-11, -6], [-11, 8]]), dk.base, 1.2);
  } else if (kind === 'helm') { // open-faced steel helm with a crest
    part(g, rel(c, side ? [[-13, 2], [-12, -10], [0, -16], [11, -12], [14, -4], [8, -5], [-4, -4], [-6, 4]] : [[-14, 2], [-13, -10], [0, -16], [13, -10], [14, 2], [9, 0], [9, -6], [-9, -6], [-9, 0]]), STEEL, { sd: 2.4, lw: 2 });
    part(g, rel(c, [[-2, -16], [2, -16], [3, -22, 1], [-3, -22, 1]]), pal('#a01828'), { sd: 1, lw: 1.3 });
    stroke(g, rel(c, side ? [[-12, -7], [13, -7]] : [[-13, -7], [13, -7]]), GOLD.base, 1.3);
  } else if (kind === 'turban') {
    const dome = side ? [[-14, 0], [-14, -10], [-4, -19], [8, -18], [15, -9], [14, -2], [0, -4]] : [[-15, 0], [-15, -10], [-6, -19], [6, -19], [15, -10], [15, 0], [0, -3]];
    part(g, rel(c, dome), cl, { sd: 2.6, lw: 2 });
    for (const y of [-6, -11, -15]) stroke(g, rel(c, [[-13, y + 2], [0, y - 2], [13, y + 1]]), dk.base, 1);
    if (!back) { const gx = side ? 11 : 0; part(g, rel(c, [[gx, -12], [gx + 2.4, -9, 1], [gx, -6, 1], [gx - 2.4, -9, 1]]), pal('#3ad0a0', { hi: '#ffffff', rim: null }), { sd: 0.6, lw: 1 }); glow(g, c[0] + gx, c[1] - 9, 6, '#3ad0a0', 0.5); }
  } else if (kind === 'hat') { // a pointed wizard hat bending back
    part(g, rel(c, [[-20, -6], [20, -6], [16, -2, 1], [-16, -2, 1]]), dk, { sd: 1.4, lw: 1.8 });
    const tip = side ? [-22, -42] : [-6 + Math.sin(t * 1.4) * 2, -44];
    part(g, rel(c, [[-12, -6], [-6, -22], [tip[0], tip[1], 1], [4, -24], [12, -6]]), cl, { sd: 2.6, lw: 2 });
    stroke(g, rel(c, [[-12, -8], [12, -8]]), GOLD.base, 1.6);
    glow(g, c[0] + tip[0], c[1] + tip[1], 5, '#ffe9a0', 0.6);
  }
}
function beard(g, view, c, hairC) {
  if (view === 'back') return;
  const P1 = pal(hairC, { hi: '#ffffff' });
  part(g, rel(c, view === 'side' ? [[2, 12], [14, 10], [15, 16], [9, 25, 1], [3, 18]] : [[-8, 9], [8, 9], [7, 17], [0, 24, 1], [-7, 17]]), P1, { sd: 1.6, lw: 1.6 });
}

// ─── props (hand frame: +x along ψ) ──────────────────────────────────────
function prop(g, kind, h, psi, t) {
  if (kind === 'lantern') { // hangs straight down from the hand
    const [x, y] = h;
    stroke(g, [[x, y], [x, y + 10]], '#3a3040', 1.2);
    part(g, [[x - 5, y + 10], [x + 5, y + 10], [x + 6, y + 22], [x - 6, y + 22]], pal('#3a3040', { hi: '#8a7a9a' }), { sd: 1, lw: 1.5 });
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = '#ffd27a'; g.fillRect(x - 3.4, y + 12, 6.8, 8); g.restore();
    glow(g, x, y + 16, 26, '#ffb040', 0.55 + 0.15 * Math.sin(t * 7));
    return;
  }
  if (kind === 'basket') {
    const [x, y] = h;
    part(g, [[x - 10, y + 2], [x + 10, y + 2], [x + 8, y + 14], [x - 8, y + 14]], WOOD, { sd: 1.4, lw: 1.6 });
    for (let i = 0; i < 5; i++) { const fx = x - 8 + i * 4, fy = y - 1 - (i % 2) * 3; g.fillStyle = ['#ff6a8a', '#ffd23a', '#c86aff', '#ff8a3a', '#6ad0ff'][i]; g.beginPath(); g.arc(fx, fy, 2.4, 0, TAU); g.fill(); }
    stroke(g, [[x - 10, y + 2], [x, y - 10], [x + 10, y + 2]], WOOD.shade, 1.4);
    return;
  }
  if (kind === 'bow') { bow(g, h, psi, PLAIN, t, 0, 0, 1); return; }
  g.save(); alongPsi(g, h, psi);
  if (kind === 'hammer') {
    part(g, [[-8, -1.6], [34, -1.8], [34, 1.8], [-8, 1.6]], WOOD, { sd: 1, lw: 1.4 });
    part(g, [[28, -9], [40, -9], [40, 9], [28, 9]], STEEL, { sd: 2, lw: 1.8 });
  } else if (kind === 'cane') {
    part(g, [[-2, -1.4], [60, -1.2], [60, 1.2], [-2, 1.4]], WOOD, { sd: 0.8, lw: 1.3 });
    stroke(g, [[-2, 0], [-7, -3], [-8, -9], [-4, -11]], '#130b1a', 4); stroke(g, [[-2, 0], [-7, -3], [-8, -9], [-4, -11]], WOOD.base, 2.4);
  } else if (kind === 'scissors') {
    for (const s of [-1, 1]) part(g, [[2, s * 1], [22, s * -2.4], [24, s * -1, 1], [4, s * 2.4]], STEEL, { sd: 0.8, lw: 1.2 });
    for (const s of [-1, 1]) { g.beginPath(); g.arc(-3, s * 3, 3, 0, TAU); g.lineWidth = 1.8; g.strokeStyle = '#130b1a'; g.stroke(); }
  } else if (kind === 'staff') {
    part(g, [[-40, -1.6], [52, -1.8], [52, 1.8], [-40, 1.6]], WOOD, { sd: 1, lw: 1.4 });
    part(g, [[52, -4], [60, 0, 1], [52, 4, 1], [48, 0, 1]], pal('#7ad0ff', { hi: '#ffffff', rim: null }), { sd: 0.8, lw: 1.2 });
    glow(g, 54, 0, 12, '#7ad0ff', 0.6 + 0.2 * Math.sin(t * 3));
  } else if (kind === 'spear') {
    part(g, [[-50, -1.5], [72, -1.5], [72, 1.5], [-50, 1.5]], WOOD, { sd: 1, lw: 1.4 });
    part(g, [[70, -4.4], [88, 0, 1], [70, 4.4, 1], [72, 0]], STEEL, { sd: 1.2, lw: 1.5 });
    part(g, [[66, -2.4], [71, -2.4], [71, 2.4], [66, 2.4]], pal('#a01828'), { sd: 0.6, lw: 1 });
  } else if (kind === 'ledger') {
    part(g, [[-4, -12], [16, -12], [16, 12], [-4, 12]], pal('#6a2a2a', { hi: '#a85a4a' }), { sd: 1.6, lw: 1.6 });
    stroke(g, [[14, -10], [14, 10]], '#f2e8d4', 1.6);
    stroke(g, [[2, -6], [10, -6]], GOLD.base, 1);
  }
  g.restore();
}
function pack(g, x, y, C) { // a travelling pack on the back
  part(g, [[x - 9, y - 14], [x + 4, y - 15], [x + 6, y + 14], [x - 10, y + 14]], LEATHER, { sd: 2, lw: 1.8 });
  part(g, [[x - 11, y - 20], [x + 6, y - 20], [x + 6, y - 14], [x - 11, y - 14]], C.cloth, { sd: 1.2, lw: 1.6 }); // bedroll
  stroke(g, [[x - 9, y], [x + 5, y]], LEATHER.shade, 1.2);
}

// ─── clothes ─────────────────────────────────────────────────────────────
const TORSO_SIDE = [[-1, -128], [-11, -123], [-10.5, -104], [-8.5, -86, 1], [12, -86, 1], [15, -97], [17, -110], [14.5, -123], [7, -128]];
const TORSO_FRONT = [[-8, -128], [-16, -123], [-16.6, -112], [-12.6, -100], [-10, -86, 1], [10, -86, 1], [12.6, -100], [16.6, -112], [16, -123], [8, -128]];
const sx = (pts, k) => pts.map(([x, y, s]) => [x * k, y, s]);
function belt(g, view, W) {
  const w = view === 'side' ? [[-9.4 * W, -89], [13 * W, -89], [13.4 * W, -82], [-9.4 * W, -81.4]] : [[-10.6 * W, -89.4], [10.6 * W, -89.4], [11 * W, -81.6], [-11 * W, -81.6]];
  part(g, w, LEATHER, { sd: 1.4, lw: 1.6 });
}

// ─── the three views ─────────────────────────────────────────────────────
function side(g, R, o, parts, C, W) {
  const t = R.t, hp = P(R.hip), clothes = parts.clothes;
  const sleeve = clothes === 'vest' || clothes === 'apron' ? SHIRT : clothes === 'armor' ? C.dark : C.cloth;
  const long = clothes === 'robe' || clothes === 'dress';
  const waist = (fn) => { g.save(); g.translate(hp[0], hp[1] + 80); fn(); g.restore(); };
  const chest = (fn) => { g.save(); g.translate(hp[0], hp[1]); g.rotate(R.lean); g.translate(0, 80); g.scale(W, 1); fn(); g.restore(); };
  const sway = wave(t, 2, 1 + R.moving * 1.4) - R.moving * 2;
  if (clothes === 'cloak') chest(() => part(g, [[-4, -128], [-14, -122], [-22 + sway, -70], [-24 + sway, -50, 1], [-6 + sway, -54], [2, -100]], C.cloth, { sd: 3, lw: 2.2 }));
  if (parts.prop === 'pack') chest(() => pack(g, -14, -108, C));
  arm(g, P(R.sB), P(R.eB), P(R.hB), { isFar: true, upper: sleeve, handP: SKIN, w: 0.86 * W });
  if (long) waist(() => part(g, [[-9, -88], [8, -86], [10 + sway * 0.3, -40], [12 + sway, -8, 1], [-4 + sway, -10], [-20 + sway, -6, 1], [-16, -50]], clothes === 'robe' ? C.cloth : C.cloth, { sd: 3.4, lw: 2.2 }));
  legSide(g, P(R.hipB), P(R.kB), ankle(R.fB), { isFar: true, pants: C.pants, w: 0.9 * W });
  chest(() => {
    part(g, TORSO_SIDE, clothes === 'vest' || clothes === 'apron' ? SHIRT : C.cloth, { sd: 3.2, lw: 2.2 });
    if (clothes === 'vest') { part(g, [[0, -122], [9, -124], [13, -110], [12, -90], [4, -88], [1, -104]], C.cloth, { sd: 2.4, lw: 1.8 }); stroke(g, [[9, -123], [12, -90]], C.dark.base, 1.2); }
    if (clothes === 'armor') {
      part(g, [[1.5, -125], [10.5, -127.5], [17.5, -122], [19, -110], [15, -98.5], [9, -95.5], [3, -100], [0.6, -112]], STEEL, { sd: 3, lw: 2 });
      stroke(g, [[2.4, -116], [9, -112.4], [18, -114.4]], GOLD.base, 1.3);
    }
    if (clothes === 'robe') stroke(g, [[8, -128], [6, -110], [12, -88]], GOLD.base, 1.3);
    if (clothes === 'dress') stroke(g, [[2, -118], [9, -114], [15, -116]], C.dark.base, 1.2);
    belt(g, 'side', 1);
  });
  legSide(g, P(R.hipF), P(R.kF), ankle(R.fF), { pants: C.pants, w: 0.9 * W });
  waist(() => {
    const w2 = wave(t, 3, 0.9) - R.moving * 1.4;
    if (clothes === 'tunic' || clothes === 'vest' || clothes === 'armor') part(g, [[6, -84], [15, -84], [19 + w2, -62], [10 + w2, -58, 1], [6, -66]], clothes === 'armor' ? STEEL : C.cloth, { sd: 2.2, lw: 1.8 });
    if (clothes === 'apron') { part(g, [[6, -118], [14, -118], [16, -90], [21 + w2, -46], [12 + w2, -44, 1], [8, -88]], C.cloth, { sd: 2.6, lw: 1.9 }); stroke(g, [[7, -118], [2, -128]], LEATHER.base, 1.2); }
    if (long) { part(g, [[8, -86], [15, -86], [22 + w2, -34], [24 + w2, -6, 1], [14 + w2, -10], [8, -40]], C.cloth, { sd: 3, lw: 2.2 }); stroke(g, [[15, -85], [23.6 + w2, -8]], C.dark.base, 1.2); }
  });
  chest(() => {
    part(g, [[4, -134], [10, -133], [10.6, -126], [4.4, -126]], SKIN, { sd: 1.6, lw: 1.6, rim: false });
    if (clothes === 'cloak') part(g, [[-12, -126], [-14, -136], [-4, -134], [6, -129], [9, -126, 1], [-2, -123]], C.cloth, { sd: 2.4, lw: 2 });
  });
  chest(() => {
    g.scale(1 / W, 1); // the head keeps its size whatever the build
    const hl = headLook(o, C);
    head(g, 'side', hl, [6.5 * W, -144], 12.6);
    if (parts.beard) beard(g, 'side', [6.5 * W, -144], C.old ? '#e8e8f0' : '#3a2a1e');
    if (parts.headwear !== 'none') headwear(g, parts.headwear, 'side', [6.5 * W, -144], C, t);
  });
  const h = P(R.hF);
  prop(g, parts.prop, h, R.psi, t);
  arm(g, P(R.sF), P(R.eF), h, { upper: sleeve, handP: SKIN, w: 0.9 * W });
  if (clothes === 'armor') pauldron(g, P(R.sF), { trim: GOLD.base }, ELEMENTS.ice, t, { k: 0.55, turn: R.lean });
}

const FRONT_PSI = { hammer: 0.15, cane: 0.05, scissors: 0.6, staff: Math.PI, spear: Math.PI, ledger: 1.6, bow: Math.PI / 2 };
function frontBack(g, B, o, parts, C, W, view) {
  const t = B.t, clothes = parts.clothes, back = view === 'back', long = clothes === 'robe' || clothes === 'dress';
  const sleeve = clothes === 'vest' || clothes === 'apron' ? SHIRT : clothes === 'armor' ? C.dark : C.cloth;
  const hand = back ? B.aR : B.aL, other = back ? B.aL : B.aR, psi = (FRONT_PSI[parts.prop] ?? 0.3) * (back ? -1 : 1);
  const m = B.moving;
  if (clothes === 'cloak' && !back) part(g, [[-14, -126], [14, -126], [22 + wave(t, 1, 1.2 + m), -52], [-22 + wave(t, 2, 1.2 + m), -52]], far(C.cloth), { sd: 3, lw: 2.2 });
  if (back && parts.prop !== 'none' && parts.prop !== 'pack') prop(g, parts.prop, hand.h, psi, t);
  for (const leg of [B.L, B.R]) legFront(g, [leg.hip[0] * W, leg.hip[1]], [leg.knee[0] * W, leg.knee[1]], [leg.ank[0] * W, leg.ank[1]], { pants: C.pants, back, w: 0.9 * W });
  for (const a of back ? [hand, other] : [other]) arm(g, [a.S[0] * W, a.S[1]], [a.e[0] * W, a.e[1]], [a.h[0] * W, a.h[1]], { upper: sleeve, handP: SKIN, w: 0.86 * W });
  g.save(); g.translate(0, B.b); g.scale(W, 1);
  if (long) part(g, [[-14, -100], [14, -100], [18, -50], [22 + wave(t, 1, 1 + m), -6], [0, -2, 1], [-22 + wave(t, 2, 1 + m), -6], [-18, -50]], C.cloth, { sd: 3.4, lw: 2.2 });
  part(g, TORSO_FRONT, (clothes === 'vest' || clothes === 'apron') && !back ? SHIRT : C.cloth, { sd: 3.2, lw: 2.2 });
  if (!back) {
    if (clothes === 'vest') for (const s of [-1, 1]) part(g, [[s * 3, -124], [s * 15, -122], [s * 13, -90], [s * 4, -88]], C.cloth, { sd: 2.2, lw: 1.8 });
    if (clothes === 'armor') { part(g, [[-12, -125], [0, -128], [12, -125], [13, -110], [8, -99], [0, -96], [-8, -99], [-13, -110]], STEEL, { sd: 3, lw: 2 }); stroke(g, [[-12, -116], [0, -112], [12, -116]], GOLD.base, 1.3); }
    if (clothes === 'robe') stroke(g, [[-7, -126], [0, -104], [7, -126]], GOLD.base, 1.3);
  }
  belt(g, view, 1);
  if (clothes === 'apron' && !back) part(g, [[-9, -118], [9, -118], [11, -90], [13 + wave(t, 3, 0.8), -46], [-13 + wave(t, 4, 0.8), -46], [-11, -90]], C.cloth, { sd: 2.6, lw: 1.9 });
  if (clothes === 'apron' && back) { stroke(g, [[-10, -86], [0, -92], [10, -86]], LEATHER.base, 1.4); }
  if (clothes === 'tunic' || clothes === 'vest' || clothes === 'armor') for (const s of [-1, 1]) part(g, [[s * 2, -82], [s * 10, -82], [s * (12 + wave(t, s + 3, 0.8)), -60, 1], [s * 3, -64, 1]], clothes === 'armor' ? STEEL : C.cloth, { sd: 2, lw: 1.7 });
  if (clothes === 'cloak' && back) part(g, [[-14, -126], [14, -126], [20 + wave(t, 1, 1.2 + m), -52], [0, -48, 1], [-20 + wave(t, 2, 1.2 + m), -52]], C.cloth, { sd: 3, lw: 2.2 });
  if (parts.prop === 'pack' && back) pack(g, 0, -106, C);
  part(g, [[-3.6, -134], [3.6, -134], [4, -126], [-4, -126]], SKIN, { sd: 1.4, lw: 1.5, rim: false });
  g.scale(1 / W, 1);
  const hl = headLook(o, C), c = [0, -146];
  head(g, view, hl, c, 12.6);
  if (parts.beard) beard(g, view, c, C.old ? '#e8e8f0' : '#3a2a1e');
  if (parts.headwear !== 'none') headwear(g, parts.headwear, view, c, C, t);
  g.restore();
  if (!back) {
    if (parts.prop !== 'none' && parts.prop !== 'pack') prop(g, parts.prop, [hand.h[0] * W, hand.h[1]], psi, t);
    arm(g, [hand.S[0] * W, hand.S[1]], [hand.e[0] * W, hand.e[1]], [hand.h[0] * W, hand.h[1]], { upper: sleeve, handP: SKIN, w: 0.86 * W });
    if (clothes === 'armor') for (const [a, s] of [[B.aL, 1], [B.aR, -1]]) pauldron(g, [a.S[0] * W, a.S[1]], { trim: GOLD.base }, ELEMENTS.ice, t, { side: s, k: 0.55 });
  }
}

// o: { outfit: [main, shade], look: { hair, hairColor } }, pose: { t, moving, walk, view }
export function drawAnimeNpc(g, arch, o, pose = {}) {
  const parts = archParts(arch), C = colours(o, parts), W = BUILD[parts.build] || 1;
  const ob = { ...o, t: pose.t || 0 };
  g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
  if (pose.view === 'front' || pose.view === 'back') frontBack(g, body({ ...pose, attackPhase: undefined }, 'mage'), ob, parts, C, W, pose.view);
  else {
    const R = rig('npc', { t: pose.t || 0, moving: pose.moving || 0, walk: pose.walk || 0, kind: parts.idle });
    g.scale(R.flip, 1);
    side(g, R, ob, parts, C, W);
  }
  g.restore();
}
// The Pengembara (spec §43.1): a village lad or lass before any job — plain tunic and trousers, no armour,
// empty hands — drawn like the townsfolk but on the hero's skeleton, so attacks, skills, dodges and the
// run still animate. o: { look: { hair, hairColor } }. Returns anchors like drawAnime.
const WANDERER = { build: 'normal', clothes: 'tunic', headwear: 'none', beard: false, prop: 'none', idle: 'gesture' };
const WANDERER_OUTFIT = ['#7a6446', '#4a3a26'];
export function drawAnimeWanderer(g, o, pose = {}) {
  const C = colours({ outfit: WANDERER_OUTFIT }, WANDERER), ob = { look: o.look || o, t: pose.t || 0 };
  g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
  let at;
  if (pose.view === 'front' || pose.view === 'back') {
    const B = body({ ...pose, attackPhase: undefined }, 'warrior');
    frontBack(g, B, ob, WANDERER, C, 1, pose.view);
    at = { head: [0, -146 + B.b], body: [0, -100 + B.b], hand: pose.view === 'front' ? B.aL.h : B.aR.h };
  } else {
    const R = rig('warrior', { gait: true, t: pose.t || 0, moving: pose.moving || 0, walk: pose.walk || 0, hurt: !!pose.hurt, attack: pose.attackPhase ?? -1, snappy: pose.attackPhase != null && !pose.slow, move: pose.move, dodge: pose.dodge, sit: pose.sit });
    g.scale(R.flip, 1);
    side(g, R, ob, WANDERER, C, 1);
    const h = P(R.hF), hp = P(R.hip); // the chest is drawn at hip + 80 up (side()), the skull 144 above that origin
    at = { head: [(hp[0] + 6.5) * R.flip, hp[1] - 64], body: [hp[0] * R.flip, hp[1] - 20], hand: [h[0] * R.flip, h[1]] };
  }
  g.restore();
  return at;
}
export { lerp2, trace };
