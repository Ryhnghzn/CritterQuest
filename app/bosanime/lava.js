// Raja Lava, anime style (prototype for spec §41.2 arah C): a horned demon king in cracked
// obsidian armour full of lava, a tattered burning cape, ash-white hair, a flaming greatsword.
// Art units like the anime heroes (hero ≈ 175 tall); this one ≈ 410. Origin between the feet,
// facing right. phase 2 = enraged (brighter cracks, bigger flames).
import { part as softPart, stroke, glow, pal, far, limb, mix, hem, trace, INK } from '../src/art/anime/kit.js';

// every corner sharp (anime bosses are angular: plates, blades, spikes — not the heroes' soft curves)
const sharpPts = (pts) => pts.map((p) => [p[0], p[1], 1]);
const part = (g, pts, Pl, o = {}) => softPart(g, sharpPts(pts), Pl, { lw: 1.8, ...o });

const OBS = pal('#2c2230', { shade: '#120c18', hi: '#56485e', rim: 'rgba(255,120,60,.75)' });
const OBS2 = pal('#3a2c3a', { shade: '#170f1c', hi: '#6a5870', rim: 'rgba(255,140,70,.7)' });
const SKIN = pal('#6e4a52', { shade: '#341e2a', hi: '#a07882', rim: 'rgba(255,140,80,.8)' });
const HORN = pal('#d8ccb8', { shade: '#7a6a5a', hi: '#fff8e8', rim: 'rgba(255,150,80,.6)' });
const HAIR = pal('#e2dcd6', { shade: '#8a8090', hi: '#ffffff', rim: 'rgba(255,160,90,.7)' });
const CAPE = pal('#5a1418', { shade: '#260608', hi: '#8e2a26', rim: null });
const GOLD = pal('#c8902a', { shade: '#6a4210', hi: '#ffe08a', rim: 'rgba(255,170,90,.7)' });
const LAVA = ['#fff2b0', '#ffc04a', '#ff7a2a', '#d0381a'];

function cracks(g, lines, t, phase, w = 2) {
  const p = (phase > 1 ? 1 : 0.7) + 0.3 * Math.sin(t * 5);
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
  for (const l of lines) {
    g.beginPath(); l.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.globalAlpha = 0.35 * p; g.lineWidth = w * 3.2; g.strokeStyle = LAVA[2]; g.stroke();
    g.globalAlpha = p; g.lineWidth = w; g.strokeStyle = LAVA[1]; g.stroke();
  }
  g.restore();
}

export function drawLavaKing(g, t, phase = 1) {
  const br = Math.sin(t * 1.6) * 2.2, sway = Math.sin(t * 0.9);
  const hot = phase > 1 ? 1.4 : 1;
  // heat glow behind
  glow(g, 0, -230, 210, 'rgba(255,90,30,.5)', 0.45 * hot);
  // cape, tattered and burning at the hem
  const capeHem = hem(-170, 40, 4, t, 7, 11, 40);
  part(g, [[-40, -300 + br], [-95, -240], [-150, -120], [-165, -20], ...capeHem.map(([x, y, s]) => [x - 8 + sway * 6, y, s]), [30, -40], [10, -260 + br]], CAPE, { sd: 6 });
  for (const [x] of capeHem.filter((_, i) => i % 2)) glow(g, x - 8, -14, 16, '#ff7a2a', 0.7 * hot);
  // far leg and far arm
  part(g, limb([-28, -168], [-40, -92], 46, 38), far(OBS), { sd: 4 });
  part(g, limb([-40, -92], [-46, -12], 38, 30), far(OBS), { sd: 4 });
  part(g, [[-70, -14], [-62, -32], [-30, -34], [-14, -10], [-20, 0], [-72, 0]], far(OBS2), { sd: 3 });
  part(g, limb([-58, -282 + br], [-96, -200], 40, 34), far(OBS), { sd: 4 });
  part(g, limb([-96, -200], [-98, -132], 34, 30), far(OBS), { sd: 4 });
  part(g, [[-112, -140], [-84, -144], [-80, -112], [-110, -106]], far(OBS2), { sd: 3 });
  // near leg: armoured greave and clawed sabaton
  part(g, limb([22, -170], [34, -94], 50, 40), OBS, { sd: 5 });
  part(g, [[10, -110], [36, -122], [60, -100], [40, -78], [14, -84]], OBS2, { sd: 4 });
  part(g, limb([34, -94], [42, -14], 40, 32), OBS, { sd: 5 });
  part(g, [[16, -16], [26, -36], [62, -36], [92, -12], [96, 0, 1], [84, -2], [78, 0, 1], [66, -2], [60, 0, 1], [16, 0]], OBS2, { sd: 4 });
  cracks(g, [[[30, -150], [38, -120], [32, -100]], [[38, -70], [44, -40], [40, -20]], [[-36, -140], [-40, -110]]], t, phase);
  // hips & faulds
  for (const [x, w, h] of [[-50, 22, 64], [-24, 22, 76], [4, 22, 82], [32, 22, 72], [56, 18, 56]]) part(g, [[x - w / 2, -186], [x + w / 2, -186], [x + w / 2 - 2, -186 + h - 12], [x, -186 + h], [x - w / 2 + 2, -186 + h - 12]], x < 0 ? far(OBS2) : OBS2, { sd: 3 });
  for (const x of [-24, 4, 32]) cracks(g, [[[x, -176], [x, -130]]], t, phase, 1.6);
  // torso: obsidian cuirass with a molten core
  part(g, [[-74, -298 + br], [-34, -318 + br], [40, -318 + br], [84, -294 + br], [64, -238], [40, -190], [-42, -190], [-60, -240]], OBS, { sd: 7 });
  part(g, [[-52, -240], [52, -240], [36, -214], [0, -206], [-36, -214]], OBS2, { sd: 3 });
  part(g, [[-46, -214], [44, -214], [30, -194], [-30, -194]], OBS2, { sd: 3 });
  part(g, [[-14, -270 + br], [16, -270 + br], [24, -244], [0, -226], [-22, -244]], GOLD, { sd: 3 });
  glow(g, 2, -250 + br, 40, '#ff7a2a', 0.85 * hot); glow(g, 2, -250 + br, 16, '#fff2b0', 0.9);
  cracks(g, [[[-50, -290], [-30, -262], [-44, -232], [-26, -200]], [[54, -286], [34, -256], [46, -222], [30, -196]], [[2, -226], [6, -196]]], t, phase, 2.4);
  // belt with a skull buckle
  part(g, [[-44, -194], [42, -194], [46, -180], [-46, -180]], pal('#2a1a14', { rim: null }), { sd: 2 });
  part(g, [[-8, -196], [10, -196], [12, -180], [2, -174], [-10, -180]], HORN, { sd: 2 });
  // near arm holding the greatsword planted forward
  part(g, limb([46, -284 + br], [80, -206], 44, 36), OBS, { sd: 5 });
  part(g, limb([80, -206], [118, -150], 36, 30), OBS, { sd: 5 });
  // greatsword: obsidian blade, lava running down its fuller, flames along the edge
  g.save(); g.translate(124, -146); g.rotate(0.32 + sway * 0.03);
  const L = 230;
  part(g, [[-6, -26], [6, -26], [6, 26], [-6, 26]], GOLD, { sd: 2 });
  part(g, [[-5, -40], [5, -40], [5, -24], [-5, -24]], pal('#2a1a14', { rim: null }), { sd: 1 });
  part(g, [[-12, -48, 1], [0, -56], [12, -48, 1], [0, -40]], GOLD, { sd: 2 });
  part(g, [[-16, 24], [16, 24], [18, L - 50], [0, L, 1], [-18, L - 50]], OBS, { sd: 4 });
  cracks(g, [[[0, 34], [0, L - 40]]], t, phase, 3);
  for (let i = 0; i < 7; i++) { const y = 40 + i * 26, f = 0.6 + 0.4 * Math.sin(t * 9 + i * 1.7); glow(g, 18, y, 14 * f * hot, '#ff8a2a', 0.8); glow(g, -18, y + 12, 12 * f * hot, '#ffb347', 0.6); }
  g.restore();
  part(g, [[104, -164], [132, -170], [138, -140], [112, -130]], OBS2, { sd: 3 }); // gauntlet
  // spiked pauldrons
  for (const [x, s, P] of [[-58, -1, far(OBS2)], [52, 1, OBS2]]) {
    part(g, [[x - 34 * s, -278 + br], [x - 20 * s, -318 + br], [x + 8 * s, -330 + br], [x + 38 * s, -306 + br], [x + 34 * s, -276 + br], [x, -262 + br]], P, { sd: 5 });
    part(g, [[x - 6 * s, -322 + br], [x + 4 * s, -372 + br, 1], [x + 16 * s, -318 + br]], HORN, { sd: 2 });
  }
  // neck, head: a demon's face, slanted burning eyes, ash-white hair, curled horns
  part(g, [[-14, -318 + br], [16, -318 + br], [14, -300 + br], [-12, -300 + br]], SKIN, { sd: 2 });
  const hy = -346 + br;
  for (const [y0, len, dy, w] of [[-24, 120, 70, 16], [-10, 104, 96, 14], [6, 84, 118, 12], [-30, 90, 30, 12]]) { // long hair streaming behind
    const wv = Math.sin(t * 2 + y0) * 6;
    part(g, [[-10, hy + y0 - w], [-10 - len * 0.5, hy + y0 + dy * 0.4 + wv], [-10 - len, hy + y0 + dy + wv * 1.6], [-10 - len * 0.45, hy + y0 + dy * 0.45 + w * 0.6 + wv], [-6, hy + y0 + w]], HAIR, { sd: 3 });
  }
  part(g, [[-24, hy - 26], [12, hy - 34], [30, hy - 18], [34, hy + 2], [26, hy + 16], [10, hy + 36], [-6, hy + 26], [-20, hy + 6]], SKIN, { sd: 4 });
  stroke(g, [[30, hy - 2], [36, hy + 8], [30, hy + 10]], 'rgba(30,10,20,.7)', 1);
  g.save(); g.translate(14, hy - 2);
  g.beginPath(); trace(g, [[-6, 0, 1], [6, -4], [12, 0, 1], [4, 2]]); g.fillStyle = phase > 1 ? '#fff6b0' : '#ffd060'; g.fill();
  g.restore();
  glow(g, 22, hy - 3, 16, '#ff9a3a', 0.9 * hot);
  stroke(g, [[6, hy - 10], [24, hy - 8]], INK, 2.4);
  stroke(g, [[12, hy + 20], [24, hy + 18]], INK, 1.4);
  part(g, [[-32, hy - 24], [-6, hy - 46], [24, hy - 40], [40, hy - 22], [26, hy - 22], [30, hy + 4], [16, hy - 16], [12, hy + 10], [2, hy - 18], [-8, hy + 2], [-14, hy - 16], [-28, hy - 4]], HAIR, { sd: 3 }); // sharp bangs
  for (const [ox, s, P] of [[-14, -1, far(HORN)], [12, 1, HORN]]) part(g, [[ox - 6, hy - 30], [ox + 18 * s, hy - 56], [ox + 50 * s, hy - 62], [ox + 74 * s, hy - 88, 1], [ox + 46 * s, hy - 74], [ox + 20 * s, hy - 66], [ox + 6, hy - 34]], P, { sd: 3 });
  // a crown of flame between the horns
  for (let i = 0; i < 5; i++) { const x = -18 + i * 10, f = 0.7 + 0.3 * Math.sin(t * 8 + i * 2); glow(g, x, hy - 46 - f * 10, 12 * f * hot, '#ff8a2a', 0.85); glow(g, x, hy - 44 - f * 6, 6 * f, '#fff2b0', 0.9); }
}

// pixel aura on the small pixel canvas: embers rising, flame licks on the shoulders, a lava pool
// at the feet, dark smoke. (x0, y0) = the feet on the canvas, s = canvas px per art unit.
export function lavaAura(g, x0, y0, s, t, phase) {
  const n = phase > 1 ? 70 : 40, px = (x, y, c, size = 1) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), size, size); };
  // lava pool
  for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2, R = 120 * s * (0.8 + 0.2 * Math.sin(t * 2 + i)); px(x0 + Math.cos(a) * R, y0 + Math.sin(a) * R * 0.25, i % 3 ? LAVA[2] : LAVA[1], 2); }
  for (let i = 0; i < 6; i++) { const k = (t * 0.7 + i / 6) % 1; px(x0 + Math.sin(i * 5.3) * 90 * s, y0 - 2 - k * 6, k < 0.8 ? LAVA[1] : LAVA[0], 2); }
  // embers rising
  for (let i = 0; i < n; i++) {
    const k = (t * (0.18 + (i % 7) * 0.03) + i * 0.137) % 1, sx = Math.sin(i * 12.9) * 150 * s + Math.sin(t * 2 + i) * 8 * s;
    const c = k < 0.3 ? LAVA[0] : k < 0.6 ? LAVA[1] : k < 0.85 ? LAVA[2] : LAVA[3];
    px(x0 + sx, y0 - k * 430 * s, c, k < 0.5 && i % 4 === 0 ? 2 : 1);
  }
  // smoke
  for (let i = 0; i < 10; i++) { const k = (t * 0.12 + i * 0.1) % 1; px(x0 + Math.sin(i * 3.1) * 80 * s - k * 30 * s, y0 - (300 + k * 200) * s, `rgba(40,30,40,${0.5 * (1 - k)})`, 3); }
  // flame licks on the shoulders
  for (const sx of [-58, 52]) for (let i = 0; i < (phase > 1 ? 10 : 6); i++) {
    const k = (t * 1.6 + i * 0.29) % 1;
    px(x0 + (sx + Math.sin(i * 7 + t * 9) * 12) * s, y0 + (-330 - k * 60) * s, k < 0.4 ? LAVA[0] : k < 0.7 ? LAVA[1] : LAVA[2], 2);
  }
}
