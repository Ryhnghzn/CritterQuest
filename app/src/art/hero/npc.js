// Style-D townsfolk (plan "Gaya D" §5), assembled from parts: build (normal / stout /
// thin / old), clothes (tunic, vest, apron, armour, robe, dress, cloak), headwear,
// a beard, a prop and a job idle (rig.js NPC_IDLE). The archetype comes from the NPC's
// role and title; colours from its outfit.
import { fillPoly, glow, pal, mix, INK, TAU } from './cel.js';
import { SKIN, LEATHER, GOLD, WOOD, METAL, withRim, face, hairBack, hairFront, leg, arm } from './common.js';

export const RIM = 'rgba(255,205,150,.75)';
const SHIRT = pal('#b8a890', { shade: '#3a3028', hi: '#efe4d0' });
const rimmed = (P) => withRim(P, RIM);

// [build, clothes, headwear, beard, prop, idle]
const ARCH = {
  smith: ['stout', 'apron', 'none', true, 'hammer', 'hammer'],
  miner: ['stout', 'apron', 'cap', false, 'hammer', 'wait'],
  innkeeper: ['stout', 'apron', 'scarf', false, 'none', 'wait'],
  herbalist: ['old', 'robe', 'hood', false, 'cane', 'old'],
  jeweler: ['thin', 'robe', 'cap', false, 'none', 'wait'],
  tailor: ['normal', 'vest', 'none', false, 'scissors', 'snip'],
  master: ['stout', 'vest', 'none', true, 'staff', 'stance'],
  captain: ['stout', 'armor', 'none', false, 'none', 'wait'],
  guard: ['stout', 'armor', 'helm', false, 'spear', 'guard'],
  clerk: ['thin', 'vest', 'cap', false, 'ledger', 'read'],
  merchant: ['normal', 'cloak', 'turban', false, 'pack', 'wait'],
  night: ['thin', 'cloak', 'hood', false, 'lantern', 'wait'],
  elder: ['old', 'robe', 'scarf', true, 'cane', 'old'],
  grandma: ['old', 'dress', 'scarf', false, 'cane', 'old'],
  child: ['normal', 'tunic', 'none', false, 'none', 'child'],
  mage: ['thin', 'robe', 'hat', false, 'staff', 'wait'],
  hunter: ['normal', 'cloak', 'hood', false, 'bow', 'gesture'],
  knight: ['stout', 'armor', 'none', false, 'none', 'wait'],
  dancer: ['thin', 'dress', 'scarf', false, 'none', 'sway'],
  florist: ['thin', 'dress', 'none', false, 'basket', 'wait'],
  traveler: ['normal', 'cloak', 'hat', false, 'pack', 'gesture'],
  villager: ['normal', 'tunic', 'none', false, 'none', 'gesture'],
};
const BUILD = { normal: { w: 0.95, torso: 1 }, stout: { w: 1.15, torso: 1.25 }, thin: { w: 0.85, torso: 0.9 }, old: { w: 0.88, torso: 0.95 } };
const ROLE = { gear: 'smith', weapons: 'smith', armor: 'tailor', inn: 'innkeeper', potion: 'herbalist', jeweler: 'jeweler', jewelry: 'jeweler', trainer: 'master', barber: 'tailor', board: 'captain', gate: 'guard', storage: 'clerk', mats: 'merchant', night: 'night' };
const TITLE = [
  [/anak/i, 'child'], [/prajurit|penjaga kota|penjaga gerbang/i, 'guard'], [/ksatria/i, 'knight'], [/nenek/i, 'grandma'],
  [/kakek|tetua|resi|pertapa|penjaga makam/i, 'elder'], [/penyihir|pendeta|pengamat|murid penyihir/i, 'mage'], [/pemburu|pemanah|nelayan/i, 'hunter'],
  [/penambang|pandai|pemahat/i, 'miner'], [/penari|penyanyi/i, 'dancer'], [/bunga|peramu/i, 'florist'], [/pedagang|kafilah/i, 'merchant'],
  [/pengelana|pengembara|kurir|tamu|petualang|penjaga oase|penjaga kawah/i, 'traveler'],
];
// npc: { role, title, name, scale } → archetype id
export function archetypeOf(npc) {
  if (!npc) return 'villager';
  if ((npc.scale || 1) < 0.8) return 'child';
  if (npc.role && npc.role !== 'talk' && ROLE[npc.role]) return ROLE[npc.role];
  const label = `${npc.title || ''} ${npc.name || ''}`;
  for (const [re, a] of TITLE) if (re.test(label)) return a;
  return 'villager';
}
export const ARCHETYPES = Object.keys(ARCH);
export const idleOf = (arch) => (ARCH[arch] || ARCH.villager)[5];

const hex6 = (h) => (h && h.length === 4 ? `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}` : h || '#6a6a6a');
const PALS = new Map();
function outfitPal(outfit) {
  const key = (outfit || []).join();
  let p = PALS.get(key);
  if (!p) {
    const a = hex6(outfit?.[0]), b = hex6(outfit?.[1] || outfit?.[0]);
    p = { main: { base: a, shade: mix(b, '#0b0710', 0.55), hi: mix(a, '#fff1d6', 0.4), rim: RIM }, dark: pal(b, { rim: RIM }) };
    PALS.set(key, p);
  }
  return p;
}

// pieces
function body(g, R, B, clothes, O) {
  const t = R.t;
  g.save(); g.translate(R.hip.x, R.hip.y); g.rotate(R.lean); g.scale(B.torso, 1);
  const shape = [[-6.6, -23], [8.4, -23.2], [7, -12], [5.8, -2], [-5.8, -2], [-7, -12]];
  if (clothes === 'vest') {
    fillPoly(g, shape, rimmed(SHIRT), 3.2);
    fillPoly(g, [[-6.6, -23], [1.4, -23.2], [3, -4], [-5.8, -2], [-7, -12]], O.main, 3);
    fillPoly(g, [[5.4, -23.2], [8.4, -23.2], [7, -12], [5.8, -4], [4.6, -12]], O.main, 1.2);
  } else if (clothes === 'armor') {
    fillPoly(g, shape, rimmed(METAL[3]), 3.6);
    g.beginPath(); g.moveTo(-6, -17); g.lineTo(8, -17.6); g.lineWidth = 0.9; g.strokeStyle = INK; g.stroke();
    fillPoly(g, [[0, -14], [6.4, -14], [6, 12], [3.2, 14], [0.4, 12]], O.main, 2.4);
  } else {
    fillPoly(g, shape, O.main, 3.4);
    if (clothes === 'apron') fillPoly(g, [[0.4, -21], [7.8, -21.4], [8.6, 7], [5, 8.4], [1, 7]], rimmed(LEATHER), 2.4);
  }
  fillPoly(g, [[-6, -6.6], [6.8, -7], [6.6, -4.6], [-6, -4.2]], LEATHER, 1.2, 0.6, 0.9);
  if (clothes === 'tunic' || clothes === 'vest') {
    const sw = Math.sin(t * 3 + 1) * 0.8 - R.moving * 2;
    fillPoly(g, [[-5.8, -2.6], [6, -2.6], [5.6 + sw, 6], [-5.4 + sw * 0.6, 6.4]], clothes === 'vest' ? pal('#3a3040') : O.dark, 2.2);
  }
  g.restore();
}

// robe / dress / cloak over the legs (drawn after them)
function skirt(g, R, B, clothes, O) {
  const W = R.W, t = R.t, mv = R.moving;
  const dress = clothes === 'dress';
  const front = Math.max(R.fF.x, R.fB.x) + (dress ? 7 : 6), back = Math.min(R.fF.x, R.fB.x) - (dress ? 9 : 7) - mv * 3;
  const hemY = dress ? -4 : -1;
  const s0 = W(-6.6 * B.torso, -23), s1 = W(8.2 * B.torso, -22.6), w1 = W(6.4 * B.torso, -7), w0 = W(-6.4 * B.torso, -8);
  const pts = [[s0.x, s0.y], [s1.x, s1.y], [w1.x, w1.y], [front, hemY]];
  for (let i = 1; i <= 6; i++) pts.push([front + (back - front) * (i / 6), hemY + (i % 2 ? 2.4 : 0) + Math.sin(t * 3 + i) * 0.6]);
  pts.push([w0.x, w0.y]);
  fillPoly(g, pts, O.main, 4.6);
  const a = W(-6.6 * B.torso, -9.4), b = W(7.6 * B.torso, -9.8), c = W(7.4 * B.torso, -6.8), d = W(-6.4 * B.torso, -6.4);
  fillPoly(g, [[a.x, a.y], [b.x, b.y], [c.x, c.y], [d.x, d.y]], dress ? O.dark : LEATHER, 1.2, 0.6, 0.9);
}

function cloakBack(g, R) {
  const t = R.t, mv = R.moving, W = R.W;
  const a = W(-4.8, -23), b = W(2, -24), back = -9 - mv * 11 - Math.sin(t * 1.5) * 1.2;
  const pts = [[b.x, b.y], [back + 7, -8 + Math.sin(t * 2.6) * 1]];
  for (let i = 1; i <= 4; i++) pts.push([back + 7 - (i / 4) * 12 - mv * 3 * (i / 4), -8 + (i % 2 ? -2 : 0) + Math.sin(t * 2.6 + i) * 1]);
  pts.push([back - 2, -22], [a.x, a.y]);
  fillPoly(g, pts, pal('#3a3436', { rim: RIM, hatch: true }), 4);
}

function backItem(g, R, prop, O) {
  if (prop === 'pack') {
    const p = R.W(-7, -15);
    g.save(); g.translate(p.x, p.y); g.rotate(R.lean);
    fillPoly(g, [[-4.6, -6.4], [3.4, -7], [3.8, 6], [-4.4, 6.6]], rimmed(LEATHER), 2.4);
    fillPoly(g, [[-5, -7.2], [3.8, -7.8], [3.4, -4.4], [-4.6, -3.8]], O.dark, 1.2, 0.5, 0.8);
    g.restore();
  } else if (prop === 'bow') {
    const p = R.W(-4, -14);
    g.save(); g.translate(p.x, p.y); g.rotate(R.lean + 0.5);
    fillPoly(g, [[0.8, -16], [-1.6, -6], [-1.8, 6], [0.8, 16], [-0.6, 6], [-0.4, -6]], WOOD, 0.8, 0.5, 0.9);
    g.beginPath(); g.moveTo(0.8, -16); g.lineTo(0.8, 16); g.lineWidth = 0.5; g.strokeStyle = '#e8e2d0'; g.stroke();
    g.restore();
  }
}

function head(g, R, look, hairP, arch, O) {
  const [, , wear, beard] = ARCH[arch], t = R.t, sw = Math.sin(t * 2) * 0.6 - R.moving * 1.6;
  g.save(); g.translate(R.hip.x, R.hip.y); g.rotate(R.lean * 0.5); g.translate(2.4, -31.8);
  fillPoly(g, [[-1, 4.6], [3.6, 4.4], [4.4, 9.4], [-1.6, 9.6]], SKIN, 2);
  if (wear !== 'hood' && wear !== 'scarf') hairBack(g, R, look, hairP);
  face(g, R, RIM);
  if (beard) fillPoly(g, [[-1.8, 2.4], [5.8, 2.6], [5.6, 6.2], [2.8, 9.6], [0.4, 8], [-2, 5]], hairP, 2);
  if (wear !== 'helm' && wear !== 'hood' && wear !== 'scarf' && wear !== 'turban') hairFront(g, look, hairP);
  switch (wear) {
    case 'hood':
      fillPoly(g, [[6.6, -3], [5.6, -9.4], [-0.6, -12], [-6.8, -9], [-11 + sw, -2], [-7.4, 4], [-5, 8], [-3.6, -2.4], [0.6, -5.8], [4.2, -5.4]], O.main, 3.4);
      break;
    case 'scarf':
      fillPoly(g, [[5.8, -4.2], [3.2, -9.6], [-3, -10.2], [-7.2, -6.2], [-7.8, 2], [-5.2, 6.4], [-3.6, -1], [1, -5.6]], O.dark, 3);
      break;
    case 'cap':
      fillPoly(g, [[5.8, -4.2], [4.8, -8.8], [0, -10.2], [-5.4, -8.6], [-6.6, -3.2], [-5.8, -2.4]], O.dark, 2.6);
      fillPoly(g, [[3.6, -4.6], [9, -4.4], [8.6, -3.2], [3.4, -3.4]], O.dark, 0.6, 0.3, 0.8);
      break;
    case 'helm':
      fillPoly(g, [[5.8, -3.4], [5.2, -8.6], [0, -10.6], [-5.6, -8.6], [-6.4, -2], [-5.6, 1.6], [-3.8, 1.4], [-3.6, -2.6]], rimmed(METAL[2]), 3);
      fillPoly(g, [[4.6, -3.6], [6.2, -3.6], [6, 1], [5, 1.2]], METAL[2], 1, 0.5, 0.9);
      fillPoly(g, [[-1.2, -10.4], [0.6, -14], [1.6, -10.2]], O.main, 0.8, 0.4, 0.8);
      break;
    case 'turban':
      fillPoly(g, [[6, -3.6], [5.6, -9], [0.4, -11.6], [-6, -9.6], [-6.8, -3.6], [-1, -5.6]], O.main, 3);
      g.beginPath(); g.moveTo(-6, -7); g.lineTo(5.4, -8.6); g.moveTo(-6.4, -5); g.lineTo(5.8, -6.2); g.lineWidth = 0.6; g.strokeStyle = 'rgba(0,0,0,.4)'; g.stroke();
      fillPoly(g, [[1.6, -10.6], [3, -12.4], [4.2, -10.4], [3, -9]], GOLD, 0.8, 0.4, 0.8);
      break;
    case 'hat':
      fillPoly(g, [[-4.8, -6.6], [-4, -12.4], [3.8, -12.8], [4.6, -6.8]], O.dark, 2.4);
      fillPoly(g, [[-10.6, -5.6], [10.6, -6.6], [10.8, -4.8], [-10.4, -4]], O.dark, 1.4, 0.6, 1);
      g.beginPath(); g.moveTo(-4.6, -7.8); g.lineTo(4.6, -8.2); g.lineWidth = 1.1; g.strokeStyle = O.main.base; g.stroke();
      break;
  }
  g.restore();
}

// prop in the front hand (frame: hand at the origin, +x along R.psi)
const UPRIGHT = { staff: Math.PI - 0.12, spear: Math.PI - 0.05, cane: 0.15 };
function prop(g, R, kind) {
  if (kind === 'none' || kind === 'pack' || kind === 'bow') return;
  const t = R.t;
  const psi = UPRIGHT[kind] ?? R.psi; // staves, spears and canes stand upright whatever the arm does
  g.save(); g.translate(R.hF.x, R.hF.y); g.rotate(Math.atan2(Math.cos(psi), Math.sin(psi)));
  switch (kind) {
    case 'hammer':
      fillPoly(g, [[-2, -1], [13, -1.2], [13, 1.2], [-2, 1]], WOOD, 0.8, 0.4, 0.8);
      fillPoly(g, [[11, -4.6], [16, -4.6], [16, 4.6], [11, 4.6]], rimmed(METAL[2]), 1.6);
      if (Math.sin(t * 6.9) > 0.97) glow(g, 16, 0, 6, '#ffb347', 1);
      break;
    case 'spear':
      fillPoly(g, [[-22, -0.9], [32, -0.9], [32, 0.9], [-22, 0.9]], WOOD, 0.6, 0.3, 0.8);
      fillPoly(g, [[31, -2.2], [39, 0], [31, 2.2], [30, 0]], rimmed(METAL[3]), 1, 0.5, 0.8);
      break;
    case 'cane':
      fillPoly(g, [[-3, -0.9], [21, -0.8], [21, 0.8], [-3, 0.9]], WOOD, 0.6, 0.3, 0.8);
      fillPoly(g, [[-3, -0.9], [-5.6, -3], [-4.4, -4.2], [-1.6, -2]], WOOD, 0.5, 0.3, 0.8);
      break;
    case 'staff':
      fillPoly(g, [[-24, -1], [26, -1.2], [26, 1.2], [-24, 1]], WOOD, 0.6, 0.3, 0.8);
      glow(g, 28, 0, 6, '#9fe8ff', 0.6 + 0.2 * Math.sin(t * 3));
      break;
    case 'ledger':
      g.rotate(-Math.atan2(Math.cos(psi), Math.sin(psi)));
      fillPoly(g, [[-1, -6], [9, -6.6], [9.4, 1.4], [-0.6, 2]], pal('#5a2a2a', { rim: RIM }), 1.6, 0.6, 0.9);
      fillPoly(g, [[0, -5.2], [8.2, -5.8], [8.4, -4.2], [0.2, -3.8]], pal('#e8dcc0'), 0.6, 0.3, 0.6);
      break;
    case 'lantern':
      g.rotate(-Math.atan2(Math.cos(psi), Math.sin(psi)));
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 3); g.lineWidth = 0.6; g.strokeStyle = INK; g.stroke();
      glow(g, 0, 7, 14, '#ffb347', 0.7 + 0.1 * Math.sin(t * 7));
      fillPoly(g, [[-2.6, 3], [2.6, 3], [3, 10], [-3, 10]], pal('#ffd27a', { hi: '#fff6d0' }), 0.6, 0.3, 0.9);
      break;
    case 'scissors':
      for (const s of [-1, 1]) fillPoly(g, [[0, s * 0.4], [8, s * (1.6 + Math.sin(t * 9) * 0.8)], [8.4, s * (0.6 + Math.sin(t * 9) * 0.8)], [0, 0]], METAL[4], 0.4, 0.3, 0.6);
      break;
    case 'basket':
      g.rotate(-Math.atan2(Math.cos(psi), Math.sin(psi)));
      fillPoly(g, [[-4, 1], [5, 1], [4, 7], [-3, 7]], WOOD, 1, 0.4, 0.8);
      for (const [x, c] of [[-2, '#ff7aa8'], [0.6, '#ffd166'], [3, '#c08aff']]) { g.beginPath(); g.arc(x, 0, 1.5, 0, TAU); g.fillStyle = c; g.fill(); }
      break;
  }
  g.restore();
}

export function drawNpc(g, R, look, arch, hairP) {
  const [build, clothes, , , item] = ARCH[arch] || ARCH.villager, B = BUILD[build], O = outfitPal(look.outfit);
  const longCover = clothes === 'robe' || clothes === 'dress';
  const sleeve = clothes === 'armor' ? METAL[3] : clothes === 'vest' || clothes === 'apron' ? SHIRT : O.main;
  if (clothes === 'cloak') cloakBack(g, R);
  backItem(g, R, item, O);
  arm(g, R.sB, R.eB, R.hB, true, { w: B.w, upper: sleeve, fore: sleeve, rim: RIM });
  const pants = clothes === 'armor' ? pal('#3a3640') : pal('#3a3230');
  leg(g, R.hipB, R.kB, R.fB, true, { w: B.w, pants, rim: RIM });
  leg(g, R.hipF, R.kF, R.fF, false, { w: B.w, pants, rim: RIM });
  if (longCover) skirt(g, R, B, clothes, O);
  else body(g, R, B, clothes, O);
  head(g, R, look, hairP, arch, O);
  prop(g, R, item);
  arm(g, R.sF, R.eF, R.hF, false, { w: B.w, upper: sleeve, fore: clothes === 'armor' ? METAL[3] : sleeve, rim: RIM });
}
