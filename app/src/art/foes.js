// The spec §41.1 enemies drawn with the anime kit (art/anime/kit.js): cel shading, ink outline,
// rim light, every corner sharp ([x, y, 1]) — no round polygons, no human shapes. Drawn facing
// right around the origin in kit units (body ≈ ±60); art/monsters.js scales them to r.
import { part as softPart, limb, pal, glow, mix, TAU } from './anime/kit.js';

const sharp = (pts) => pts.map((p) => [p[0], p[1], 1]);
const part = (g, pts, Pl, o = {}) => softPart(g, sharp(pts), Pl, { lw: 1.8, sd: 4, ...o });
export const FOE_UNIT = 40; // kit units per r

// a glowing slit eye
function eye(g, x, y, s, color, tilt = -0.2) {
  glow(g, x, y, s * 3, color, 0.9);
  g.save(); g.translate(x, y); g.rotate(tilt);
  g.beginPath(); g.moveTo(-s, 0); g.lineTo(0, -s * 0.5); g.lineTo(s, 0); g.lineTo(0, s * 0.35); g.closePath();
  g.fillStyle = mix(color, '#ffffff', 0.55); g.fill();
  g.restore();
}
// a row of triangular fangs from x0 to x1 at y (down = pointing down)
function fangs(g, x0, x1, y, n, h, down = true) {
  g.fillStyle = '#efe6d2';
  for (let i = 0; i < n; i++) {
    const x = x0 + ((x1 - x0) * (i + 0.5)) / n, w = (x1 - x0) / n / 2;
    g.beginPath(); g.moveTo(x - w, y); g.lineTo(x, y + (down ? h : -h)); g.lineTo(x + w, y); g.closePath(); g.fill();
  }
}
// a pointed leaf / thorn from (x, y) along angle a
const blade = (x, y, len, a, w) => {
  const c = Math.cos(a), s = Math.sin(a);
  return [[x - s * w * 0.3, y + c * w * 0.3], [x + c * len * 0.45 - s * w, y + s * len * 0.45 + c * w], [x + c * len, y + s * len], [x + c * len * 0.5 + s * w * 0.8, y + s * len * 0.5 - c * w * 0.8], [x + s * w * 0.3, y - c * w * 0.3]];
};

const FROG = pal('#4a5e2a', { rim: 'rgba(190,255,120,.75)' }), BELLY = pal('#c9c27a', { rim: null });
// Katak Rawa: a squat bog toad, huge folded hind leg, bulging eyes, gold warts
export function marshfrog(g) {
  part(g, limb([-18, 12], [-50, -16], 26, 16), FROG);                       // thigh
  part(g, limb([-50, -16], [-30, 28], 16, 10), FROG, { sd: 3 });            // shin folded back
  part(g, [[-36, 26], [-62, 34], [-54, 40], [-40, 37], [-30, 42], [-22, 32]], FROG, { sd: 2 }); // webbed foot
  part(g, [[-46, 26], [-50, -2], [-32, -26], [-2, -36], [28, -32], [52, -12], [58, 12], [42, 30], [-8, 36]], FROG); // body
  part(g, [[-14, 30], [-8, 12], [18, 8], [40, 16], [34, 30], [6, 34]], BELLY, { sd: 2 });
  part(g, [[14, -30], [18, -50], [32, -54], [38, -36]], FROG, { sd: 2 });  // eye domes
  part(g, [[34, -26], [44, -46], [56, -40], [56, -20]], FROG, { sd: 2 });
  eye(g, 28, -44, 5, '#ffd25a'); eye(g, 50, -34, 4.5, '#ffd25a');
  part(g, [[22, 2], [58, 6], [54, 14], [26, 12]], pal('#170a0c', { rim: null }), { sd: 1, lw: 1.4 }); // mouth
  part(g, limb([30, 20], [38, 40], 11, 7), FROG, { sd: 2 });               // front leg
  part(g, [[30, 38], [48, 44], [40, 46], [28, 44]], FROG, { sd: 1 });
  for (const [x, y, s] of [[-24, -14, 4], [-6, -24, 3.5], [-34, 4, 3], [6, -12, 3]]) glow(g, x, y, s * 2.4, '#e8d85a', 0.8);
}

const LEAF = pal('#2e5222', { rim: 'rgba(170,255,110,.6)' }), LEAF_D = pal('#1f3818', { rim: null }), THORN = pal('#6a4024', { rim: 'rgba(255,170,90,.6)' });
// Semak Penyergap: a thorny bush splitting open into a fanged maw, red eyes in the leaves
export function bushling(g) {
  part(g, [[-56, 36], [-60, 2], [-42, -28], [-12, -46], [20, -46], [46, -28], [58, 4], [54, 36]], LEAF_D, { sd: 5 });
  for (const [x, y, len, a, w] of [[-40, 20, 34, -2.6, 12], [-30, -10, 36, -2.2, 12], [-6, -30, 34, -1.7, 11], [20, -32, 32, -1.2, 11], [40, -10, 32, -0.6, 11], [44, 20, 30, 0.1, 10], [-20, 30, 30, 2.6, 10]]) {
    part(g, blade(x, y, len, a, w), LEAF, { sd: 2, lw: 1.4 });
  }
  for (const [x, y, len, a] of [[-48, -6, 18, -2.6], [-20, -42, 16, -1.9], [14, -44, 16, -1.3], [50, -16, 16, -0.4]]) part(g, blade(x, y, len, a, 4), THORN, { sd: 1, lw: 1.2 });
  part(g, [[2, 2], [48, -2], [42, 18], [8, 16]], pal('#120806', { rim: null }), { sd: 1, lw: 1.4 }); // the maw
  fangs(g, 6, 44, 0, 6, 7); fangs(g, 10, 40, 16, 5, 6, false);
  eye(g, 10, -14, 5, '#ff3a3a'); eye(g, 32, -16, 4.5, '#ff3a3a');
}

const MIST = pal('#a9c8e8', { rim: 'rgba(210,245,255,.9)', hi: '#f4fbff' }), SHARD = pal('#dff2ff', { rim: 'rgba(255,255,255,.9)', hi: '#ffffff' });
// Roh Embun: a hooded wisp of frozen mist, torn hem, hollow glowing eyes, frost shards
export function mistwisp(g) {
  glow(g, 0, 4, 56, '#cfe8ff', 0.45);
  part(g, [[0, -46], [26, -34], [34, -6], [26, 22], [32, 46], [18, 32], [8, 52], [-2, 34], [-14, 50], [-20, 30], [-34, 42], [-28, 16], [-34, -8], [-24, -36]], MIST, { sd: 5 });
  part(g, [[-14, -26], [16, -30], [22, -10], [0, 2], [-18, -8]], pal('#16304a', { rim: null }), { sd: 1, lw: 1.2 }); // the hollow under the hood
  eye(g, -6, -14, 4.5, '#7ad8ff', 0); eye(g, 12, -16, 4.5, '#7ad8ff', 0);
  for (const [x, y, len, a] of [[-46, -20, 14, -2.4], [44, -24, 14, -0.7], [-44, 24, 12, 2.6], [46, 18, 12, 0.5]]) part(g, blade(x, y, len, a, 5), SHARD, { sd: 1, lw: 1.2 });
}

const PLATE = pal('#56789a', { rim: 'rgba(170,230,255,.85)' }), PLATE_D = pal('#3e5a78', { rim: null });
// Penjaga Cermin: a hunched ice crab in plated armour, a huge claw gripping a tall mirror
export function mirrorguard(g, mirror = 1) {
  for (const [x, k] of [[-40, -1], [-22, -1], [-4, 1], [12, 1]]) part(g, limb([x, 14], [x + k * 12, 44], 9, 5), PLATE_D, { sd: 2, lw: 1.4 }); // legs
  part(g, [[-56, 18], [-60, -8], [-40, -34], [-8, -44], [20, -36], [30, -10], [24, 20], [-20, 26]], PLATE);     // carapace
  part(g, [[-40, -30], [-30, -56], [-20, -32]], PLATE, { sd: 2 }); part(g, [[-14, -40], [-4, -62], [4, -38]], PLATE, { sd: 2 }); // ice spines
  part(g, [[-46, -6], [-10, -18], [16, -12]], pal('#2a4058', { rim: null }), { sd: 1, lw: 1.2 });               // plate seam
  eye(g, 14, -24, 3.5, '#9fe8ff', 0); eye(g, 22, -18, 3, '#9fe8ff', 0); eye(g, 8, -16, 3, '#9fe8ff', 0);
  part(g, limb([22, -4], [36, 2], 14, 12), PLATE);                                                                  // claw arm
  part(g, [[30, -54], [58, -46], [62, 0], [58, 46], [30, 54], [26, 0]], pal('#9ab4cc', { rim: 'rgba(255,255,255,.9)', hi: '#ffffff' }), { sd: 2 }); // mirror frame
  const gr = g.createLinearGradient(34, -46, 56, 46);
  gr.addColorStop(0, '#f4fbff'); gr.addColorStop(0.45, '#9ccfee'); gr.addColorStop(0.55, '#e8f6ff'); gr.addColorStop(1, '#5a8ab0');
  g.beginPath(); g.moveTo(34, -46); g.lineTo(54, -40); g.lineTo(57, 0); g.lineTo(54, 40); g.lineTo(34, 46); g.lineTo(31, 0); g.closePath();
  g.fillStyle = gr; g.fill();
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.6 + 0.4 * mirror; g.strokeStyle = '#ffffff'; g.lineWidth = 2.2;
  g.beginPath(); g.moveTo(38, -30); g.lineTo(50, -10); g.moveTo(38, 6); g.lineTo(48, 22); g.stroke(); g.restore();
  part(g, [[24, -12], [40, -20], [36, -6]], PLATE, { sd: 1, lw: 1.4 }); part(g, [[24, 8], [40, 16], [36, 2]], PLATE, { sd: 1, lw: 1.4 }); // pincers over the frame
}

const HIDE = pal('#9a7442', { rim: 'rgba(255,200,110,.75)' }), HIDE_D = pal('#6a4e2c', { rim: null }), MANE = pal('#3a2616', { rim: 'rgba(255,170,90,.5)' });
// Hyena Pasir: a lean, hunched sand hyena, spiked mane, long fanged jaw
export function hyena(g) {
  part(g, limb([-30, 8], [-40, 40], 10, 6), HIDE_D, { sd: 2 }); part(g, limb([20, 8], [16, 40], 10, 6), HIDE_D, { sd: 2 }); // far legs
  part(g, [[-58, -4], [-70, -22], [-60, -6]], MANE, { sd: 1 });                                                               // tail tuft
  part(g, [[-56, 4], [-50, -14], [-20, -26], [16, -34], [34, -22], [30, 10], [-10, 16], [-44, 16]], HIDE);                    // body, high shoulders
  for (const [x, y, len, a] of [[-14, -24, 16, -1.9], [-2, -28, 18, -1.7], [10, -32, 18, -1.5], [22, -32, 14, -1.3]]) part(g, blade(x, y, len, a, 4), MANE, { sd: 1, lw: 1.2 });
  for (const [x, y] of [[-34, -2], [-18, -10], [-4, 0], [-26, 8]]) { g.fillStyle = 'rgba(40,24,12,.55)'; g.beginPath(); g.moveTo(x - 3, y); g.lineTo(x, y - 3); g.lineTo(x + 3, y); g.lineTo(x, y + 3); g.closePath(); g.fill(); }
  part(g, [[24, -30], [46, -28], [66, -12], [64, -4], [40, -2], [26, -8]], HIDE);                                             // head & long snout
  part(g, [[36, -6], [64, -6], [58, 2], [38, 2]], pal('#1a0c08', { rim: null }), { sd: 1, lw: 1.2 });
  fangs(g, 40, 62, -6, 5, 4);
  part(g, [[28, -30], [32, -44], [38, -30]], HIDE_D, { sd: 1, lw: 1.2 });                                                     // ear
  eye(g, 44, -20, 3.5, '#ffcf5a');
  part(g, limb([-36, 10], [-46, 42], 11, 7), HIDE, { sd: 2 }); part(g, limb([24, 6], [30, 42], 11, 7), HIDE, { sd: 2 });       // near legs
}

const SHELL = pal('#5a2a22', { rim: 'rgba(255,190,110,.7)' }), LEG = pal('#2e1812', { rim: null });
// Kumbang Pembelah (and its young: size): a domed beetle whose shell is cracked down the middle, glowing
export function splitbeetle(g, size = 1) {
  g.save(); g.scale(size, size);
  for (const [x, k] of [[-26, -1], [-6, 0], [14, 1]]) { part(g, limb([x, 8], [x + k * 14 - 8, 36], 6, 4), LEG, { sd: 1, lw: 1.3 }); }
  part(g, [[34, -4], [54, -14], [62, -4], [50, 8], [34, 10]], pal('#3a1a14', { rim: 'rgba(255,190,110,.6)' }), { sd: 2 });        // head
  part(g, [[56, -12], [70, -30], [62, -8]], pal('#d8b070', { rim: null }), { sd: 1, lw: 1.2 });                                   // horn
  eye(g, 52, -2, 3, '#ffb347');
  part(g, [[-52, 14], [-56, -8], [-40, -34], [-8, -46], [22, -38], [40, -14], [36, 14], [-8, 22]], SHELL);                       // dome
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-50, 4); g.lineTo(-30, -10); g.lineTo(-14, -6); g.lineTo(4, -22); g.lineTo(20, -18); g.lineTo(36, -2);
  g.lineWidth = 6; g.strokeStyle = 'rgba(255,140,50,.35)'; g.stroke(); g.lineWidth = 2; g.strokeStyle = '#ffd27a'; g.stroke(); g.restore();
  for (const [x, k] of [[-34, -1], [-14, 0], [6, 1]]) part(g, limb([x, 12], [x + k * 14 - 4, 40], 7, 4), LEG, { sd: 1, lw: 1.3 });
  g.restore();
}
export const beetlet = (g) => splitbeetle(g, 0.95);
// Tungau: a tiny spiked tick
export function mite(g) {
  for (let i = 0; i < 3; i++) part(g, limb([-14 + i * 14, 6], [-24 + i * 20, 30], 5, 3), LEG, { sd: 1, lw: 1.2 });
  part(g, [[-34, 10], [-30, -16], [-6, -34], [22, -26], [36, -4], [26, 16], [-10, 22]], SHELL);
  for (const [x, y, len, a] of [[-20, -22, 14, -2.1], [0, -32, 14, -1.6], [20, -24, 12, -1.1]]) part(g, blade(x, y, len, a, 4), pal('#d8b070', { rim: null }), { sd: 1, lw: 1.1 });
  eye(g, 24, -6, 4, '#ffb347');
}

const ROCK = pal('#3e2a26', { rim: 'rgba(255,140,60,.85)' }), ROCK_D = pal('#2a1c1a', { rim: null });
function lavaLines(g, lines, w = 2) {
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
  for (const l of lines) { g.beginPath(); l.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.lineWidth = w * 3; g.strokeStyle = 'rgba(255,110,40,.35)'; g.stroke(); g.lineWidth = w; g.strokeStyle = '#ffc04a'; g.stroke(); }
  g.restore();
}
// Meriam Magma: a squat rock beast with a great barrel growing from its back, lava in the cracks
export function mortar(g) {
  part(g, limb([-30, 16], [-40, 40], 14, 10), ROCK_D, { sd: 2 }); part(g, limb([20, 16], [26, 40], 14, 10), ROCK_D, { sd: 2 });
  part(g, limb([-10, -14], [30, -54], 30, 26, 1.05), ROCK);                                                                     // barrel
  part(g, [[22, -64], [44, -48], [36, -40], [16, -56]], ROCK_D, { sd: 1 });                                                    // muzzle rim
  glow(g, 30, -54, 16, '#ff7a2a', 0.9); glow(g, 30, -54, 6, '#fff2b0', 1);
  part(g, [[-50, 20], [-54, -6], [-32, -30], [0, -34], [30, -20], [40, 4], [30, 24], [-16, 28]], ROCK);                        // body
  lavaLines(g, [[[-40, 0], [-26, -12], [-14, -4], [2, -16]], [[-24, 16], [-8, 8], [10, 14]], [[4, -40], [12, -30], [8, -22]]]);
  part(g, [[26, -10], [46, -6], [50, 8], [34, 12]], ROCK, { sd: 2 });                                                          // brow
  eye(g, 40, 0, 3.5, '#ffb347'); eye(g, 30, 2, 3, '#ffb347');
}

const CARVED = pal('#4a3428', { rim: 'rgba(255,150,70,.8)' }), BONE = pal('#d8c8a8', { rim: 'rgba(255,170,90,.6)' });
// Totem Bara: a carved pillar crowned by a horned beast skull, embers burning on top, glowing runes
export function embertotem(g) {
  part(g, [[-30, 44], [-34, 30], [34, 30], [30, 44]], ROCK_D, { sd: 2 });                                                      // base stone
  part(g, [[-22, 32], [-26, -20], [-16, -34], [16, -34], [26, -20], [22, 32]], CARVED);                                          // pillar
  lavaLines(g, [[[-12, 20], [-4, 10], [-12, 0], [-4, -10]], [[10, 22], [4, 12], [12, 2]]], 1.6);
  part(g, [[-40, -40], [-22, -34], [-26, -26]], BONE, { sd: 1, lw: 1.3 }); part(g, [[40, -40], [22, -34], [26, -26]], BONE, { sd: 1, lw: 1.3 }); // horns
  part(g, [[-20, -30], [-18, -50], [0, -58], [18, -50], [20, -30], [8, -22], [-8, -22]], BONE, { sd: 2 });                    // skull
  part(g, [[-12, -42], [-4, -42], [-6, -34]], pal('#1a0c08', { rim: null }), { sd: 0.5, lw: 1 }); part(g, [[4, -42], [12, -42], [6, -34]], pal('#1a0c08', { rim: null }), { sd: 0.5, lw: 1 });
  glow(g, -8, -39, 5, '#ff7a2a', 1); glow(g, 8, -39, 5, '#ff7a2a', 1);
  for (const [x, h] of [[-8, 18], [4, 24], [12, 14]]) { glow(g, x, -58 - h * 0.5, h * 0.6, '#ff7a2a', 0.85); glow(g, x, -58 - h * 0.35, h * 0.25, '#fff2b0', 0.9); }
}

const VOID = pal('#2a1e3e', { rim: 'rgba(190,130,255,.9)' }), VOID_D = pal('#160f24', { rim: null });
// Obelisk Hampa: a black crystal spire on a cracked plinth, a single eye near its tip, shards drifting
export function voidobelisk(g) {
  part(g, [[-32, 44], [-36, 30], [36, 30], [32, 44]], VOID_D, { sd: 2 });
  part(g, [[-20, 32], [-14, -40], [0, -62], [14, -40], [20, 32]], VOID);
  part(g, [[0, -62], [14, -40], [6, 30], [20, 32]], pal('#3c2c58', { rim: null }), { sd: 1, lw: 1.2 });
  g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = '#c79bff'; g.lineWidth = 1.6;
  g.beginPath(); g.moveTo(-8, 18); g.lineTo(-4, 8); g.lineTo(-10, -2); g.moveTo(6, 10); g.lineTo(2, -6); g.lineTo(8, -14); g.stroke(); g.restore();
  eye(g, 0, -36, 5, '#d8b8ff', 0);
  for (const [x, y, a] of [[-38, -20, -2.4], [38, -30, -0.8], [-34, 10, 2.8], [36, 4, 0.4]]) part(g, blade(x, y, 14, a, 5), VOID, { sd: 1, lw: 1.2 });
}
// Kembar Hampa: a hunched crescent of void with one eye and trailing tendrils
export function voidtwin(g) {
  for (const [x, len] of [[-16, 30], [0, 36], [14, 28]]) part(g, [[x - 5, 18], [x + 5, 18], [x + 2, 18 + len], [x - 6, 18 + len * 0.6]], VOID_D, { sd: 1, lw: 1.2 });
  part(g, [[-40, -40], [-22, -50], [10, -46], [36, -26], [44, 4], [30, 24], [0, 26], [-20, 14], [-6, 2], [-10, -20], [-28, -26]], VOID);
  part(g, [[-40, -40], [-52, -56], [-30, -46]], VOID, { sd: 1, lw: 1.3 });                                                      // horn tip
  part(g, [[10, -14], [34, -12], [32, 4], [12, 6]], pal('#0c0814', { rim: null }), { sd: 1, lw: 1.2 });
  eye(g, 22, -4, 6, '#c79bff', 0);
  g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(199,155,255,.8)'; g.lineWidth = 1.4;
  g.beginPath(); g.moveTo(-20, -32); g.lineTo(-6, -38); g.lineTo(10, -34); g.stroke(); g.restore();
}

export const FOE_ART = { marshfrog, bushling, mistwisp, mirrorguard, hyena, splitbeetle, beetlet, mite, mortar, embertotem, voidobelisk, voidtwin };
export { TAU };
