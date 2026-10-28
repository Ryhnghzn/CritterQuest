// Style-D monsters (plan "Gaya D" §4): the same creatures as before, redrawn in the dark
// comic look — angular shapes, hard cel shadows from the top-left, a rim light in the
// biome colour, glowing eyes. Drawn facing right around the origin in units of r and
// kept inside ±1.6 r (the baked sprite box). Baked once per size, so cost is per bake.
import { cel, poly, glow, pal, mix, INK, TAU } from './hero/cel.js';

const RIM = {
  toxic: 'rgba(150,255,110,.85)', shadow: 'rgba(190,120,255,.85)', fire: 'rgba(255,130,60,.9)',
  ice: 'rgba(150,225,255,.9)', sand: 'rgba(255,200,110,.85)', stone: 'rgba(255,160,90,.75)', royal: 'rgba(255,90,160,.9)',
};
const P = (base, rim, extra = {}) => pal(base, { rim: RIM[rim], ...extra });
const S = (r, pts) => pts.map(([x, y]) => [x * r, y * r]);
// one cel-shaded piece; pts in units of r
function part(g, r, pts, Pal, sd = 0.28, hd = 0.08) {
  cel(g, poly(g, S(r, pts)), Pal, sd * r, hd * r, Math.max(0.7, r * 0.07));
}
// a glowing slanted eye
function eye(g, r, x, y, s, color, tilt = -0.25) {
  glow(g, x * r, y * r, s * r * 2.6, color, 0.85);
  g.save(); g.translate(x * r, y * r); g.rotate(tilt);
  g.beginPath(); g.moveTo(-s * r, 0); g.lineTo(0, -s * r * 0.45); g.lineTo(s * r, 0); g.lineTo(0, s * r * 0.3); g.closePath();
  g.fillStyle = mix(color, '#ffffff', 0.55); g.fill();
  g.restore();
}
// a row of fangs along y from x0 to x1 (down = pointing down)
function fangs(g, r, x0, x1, y, n, h, down = true) {
  g.fillStyle = '#efe6d2';
  for (let i = 0; i < n; i++) {
    const x = x0 + ((x1 - x0) * (i + 0.5)) / n, w = (x1 - x0) / n / 2;
    g.beginPath(); g.moveTo((x - w) * r, y * r); g.lineTo(x * r, (y + (down ? h : -h)) * r); g.lineTo((x + w) * r, y * r); g.closePath(); g.fill();
  }
}
// glowing crack lines (cracks: list of polylines in r units)
function cracks(g, r, lines, color, w = 0.05) {
  g.save(); g.globalCompositeOperation = 'lighter';
  g.beginPath();
  for (const l of lines) l.forEach(([x, y], i) => (i ? g.lineTo(x * r, y * r) : g.moveTo(x * r, y * r)));
  g.lineWidth = w * r; g.strokeStyle = color; g.stroke();
  g.lineWidth = w * r * 3; g.globalAlpha = 0.3; g.stroke();
  g.restore();
}
function spikes(g, r, list, Pal) { // [x, y, height, lean] in r
  for (const [x, y, h, l = 0] of list) part(g, r, [[x - 0.11, y + 0.1], [x + l, y - h], [x + 0.11, y + 0.1]], Pal, 0.08, 0.03);
}

// ——— families ———
const OOZE_BODY = [[-1, 0.55], [-1.12, -0.15], [-0.78, -0.78], [-0.22, -1.04], [0.42, -0.96], [0.92, -0.55], [1.12, 0.08], [1.02, 0.56], [0.82, 0.92], [0.62, 0.6], [0.3, 0.74], [0.06, 1.02], [-0.18, 0.66], [-0.5, 0.8], [-0.72, 1.04], [-0.86, 0.62]];
function ooze(g, r, body, eyeC, mouth = '#1a0610') {
  part(g, r, OOZE_BODY, body, 0.42);
  part(g, r, [[0.12, 0.04], [0.9, -0.06], [0.82, 0.34], [0.5, 0.44], [0.18, 0.32]], pal(mouth), 0.05, 0.02);
  fangs(g, r, 0.16, 0.86, 0.02, 5, 0.16); fangs(g, r, 0.22, 0.8, 0.4, 4, 0.12, false);
  eye(g, r, 0.32, -0.42, 0.16, eyeC); eye(g, r, 0.74, -0.36, 0.13, eyeC);
}
function toad(g, r, body, wart, mouthC) {
  part(g, r, [[-1.05, 0.7], [-1.12, 0.05], [-0.7, -0.6], [0.05, -0.82], [0.7, -0.6], [1.1, -0.05], [1.12, 0.45], [0.8, 0.78], [-0.6, 0.86]], body, 0.4);
  part(g, r, [[-0.9, 0.78], [-1.3, 0.92], [-0.6, 0.98]], body, 0.08); part(g, r, [[0.7, 0.8], [1.2, 0.98], [0.4, 0.98]], body, 0.08);
  part(g, r, [[0.2, 0.1], [1.12, 0.06], [1.04, 0.3], [0.3, 0.32]], pal('#140a0c'), 0.04, 0.02);
  for (const [x, y, s] of [[-0.6, -0.2, 0.12], [-0.25, -0.5, 0.1], [-0.75, 0.25, 0.09], [0.1, -0.35, 0.08]]) { glow(g, x * r, y * r, s * r * 2.2, wart, 0.8); g.beginPath(); g.arc(x * r, y * r, s * r * 0.6, 0, TAU); g.fillStyle = mix(wart, '#ffffff', 0.4); g.fill(); }
  part(g, r, [[0.3, -0.78], [0.62, -1.02], [0.86, -0.7]], body, 0.08); part(g, r, [[0.66, -0.66], [0.98, -0.86], [1.12, -0.5]], body, 0.08);
  eye(g, r, 0.58, -0.8, 0.12, mouthC); eye(g, r, 0.92, -0.62, 0.1, mouthC);
  g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = mouthC; g.globalAlpha = 0.8;
  g.beginPath(); g.moveTo(0.95 * r, 0.3 * r); g.lineTo(1.0 * r, 0.62 * r); g.lineTo(0.9 * r, 0.32 * r); g.fill(); g.restore();
}
function golem(g, r, stone, crackC, ice = false) {
  part(g, r, [[-1.32, 0.05], [-1.42, 0.62], [-1.0, 0.82], [-0.86, 0.2]], stone, 0.2);
  part(g, r, [[-0.92, 1.0], [-1.0, -0.38], [-0.62, -0.92], [0.36, -1.02], [0.92, -0.62], [1.02, 0.12], [0.86, 1.02]], stone, 0.5);
  part(g, r, [[-0.28, -0.86], [-0.18, -1.32], [0.38, -1.42], [0.62, -1.02], [0.36, -0.78]], stone, 0.18);
  part(g, r, [[0.8, -0.1], [1.42, 0.1], [1.48, 0.72], [1.0, 0.86], [0.78, 0.42]], stone, 0.22);
  cracks(g, r, [[[-0.5, -0.5], [-0.2, -0.1], [-0.4, 0.3], [-0.1, 0.7]], [[0.4, -0.6], [0.2, -0.2], [0.5, 0.2]], [[1.0, 0.3], [1.2, 0.5]]], crackC);
  glow(g, 0.1 * r, 0.05 * r, 0.5 * r, crackC, 0.45);
  eye(g, r, 0.44, -1.14, 0.1, crackC, 0);
  if (ice) spikes(g, r, [[-0.6, -0.86, 0.5, -0.1], [-0.2, -0.98, 0.42], [0.66, -0.7, 0.36, 0.1], [-1.2, 0.08, 0.3, -0.1]], P('#e8f6ff', 'ice', { hi: '#ffffff' }));
}
function shroom(g, r, cap, spots, stem, fuseC) {
  part(g, r, [[-0.42, 1.02], [-0.5, 0.1], [0.5, 0.1], [0.44, 1.02]], stem, 0.25);
  eye(g, r, -0.12, 0.42, 0.11, fuseC, 0); eye(g, r, 0.26, 0.42, 0.11, fuseC, 0);
  part(g, r, [[-1.12, 0.3], [-1.02, -0.32], [-0.6, -0.86], [0.02, -1.06], [0.62, -0.86], [1.04, -0.34], [1.14, 0.3], [0.6, 0.18], [0, 0.26], [-0.6, 0.18]], cap, 0.4);
  for (const [x, y, s] of [[-0.55, -0.35, 0.16], [0.1, -0.68, 0.14], [0.6, -0.3, 0.17], [-0.1, -0.12, 0.1]]) part(g, r, [[x - s, y], [x, y - s * 0.8], [x + s, y], [x, y + s * 0.8]], spots, 0.04, 0.02);
  g.beginPath(); g.moveTo(0.02 * r, -1.04 * r); g.quadraticCurveTo(0.3 * r, -1.4 * r, 0.12 * r, -1.5 * r); g.lineWidth = r * 0.07; g.strokeStyle = '#3a2a22'; g.stroke();
  glow(g, 0.12 * r, -1.5 * r, 0.32 * r, fuseC, 1);
}

// ——— the bestiary ———
const MONSTERS = {
  slink(g, r) { ooze(g, r, P('#6a2c88', 'toxic', { hatch: true }), '#b8ff6a'); },
  mini(g, r) { ooze(g, r, P('#7a3a98', 'toxic'), '#b8ff6a'); },
  frostslink(g, r) {
    ooze(g, r, P('#4a7aa8', 'ice', { hatch: true }), '#d8f4ff', '#0a1424');
    spikes(g, r, [[-0.5, -0.86, 0.42, -0.08], [-0.05, -1.0, 0.5], [0.42, -0.92, 0.36, 0.08]], P('#e8f6ff', 'ice', { hi: '#ffffff' }));
  },
  sandslink(g, r) {
    ooze(g, r, P('#9a6a34', 'sand', { hatch: true }), '#ffd27a', '#20120a');
    g.fillStyle = 'rgba(255,230,170,.35)'; for (const [x, y] of [[-0.6, -0.3], [-0.2, -0.7], [0.2, -0.5], [-0.5, 0.2], [0.6, -0.7]]) { g.beginPath(); g.arc(x * r, y * r, r * 0.05, 0, TAU); g.fill(); }
  },
  magmaslink(g, r) {
    ooze(g, r, P('#2a1a1e', 'fire'), '#ffb347', '#3a0a04');
    cracks(g, r, [[[-0.8, -0.2], [-0.4, -0.5], [-0.1, -0.2]], [[-0.6, 0.4], [-0.3, 0.1]], [[0.5, -0.8], [0.3, -0.5]]], '#ff7a2a');
  },
  dart(g, r) { // gaunt bat, bony wings spread
    const wing = P('#4a1e2e', 'shadow', { hatch: true });
    part(g, r, [[-0.2, -0.1], [-1.1, -1.0], [-1.0, -0.5], [-1.5, -0.3], [-1.0, -0.05], [-1.2, 0.3], [-0.5, 0.1]], wing, 0.2);
    part(g, r, [[0.2, -0.1], [1.1, -1.0], [1.0, -0.5], [1.5, -0.3], [1.0, -0.05], [1.2, 0.3], [0.5, 0.1]], wing, 0.2);
    part(g, r, [[-0.42, 0.5], [-0.5, -0.2], [-0.3, -0.62], [-0.38, -1.0], [-0.08, -0.7], [0.08, -0.7], [0.38, -1.0], [0.3, -0.62], [0.5, -0.2], [0.42, 0.5], [0, 0.72]], P('#2e2232', 'shadow'), 0.3);
    eye(g, r, -0.16, -0.3, 0.12, '#ff4a5a', 0.3); eye(g, r, 0.18, -0.3, 0.12, '#ff4a5a', -0.3);
    fangs(g, r, -0.12, 0.12, 0.1, 2, 0.16);
  },
  vulture(g, r) { // bald vulture with hooked beak
    part(g, r, [[-0.3, 0.1], [-1.4, -0.5], [-1.2, 0.0], [-1.5, 0.3], [-0.9, 0.35], [-0.6, 0.6]], P('#4a3220', 'sand', { hatch: true }), 0.2);
    part(g, r, [[-0.7, 0.6], [-0.6, -0.4], [0.3, -0.5], [0.7, 0.0], [0.5, 0.6], [-0.2, 0.8]], P('#3a2818', 'sand'), 0.35);
    part(g, r, [[0.2, -0.4], [0.4, -0.95], [0.85, -1.0], [0.95, -0.7], [0.6, -0.35]], P('#c07a7a', 'sand'), 0.2);
    part(g, r, [[0.88, -0.86], [1.32, -0.7], [1.1, -0.48], [0.9, -0.62]], P('#d8b060', 'sand'), 0.08);
    part(g, r, [[0.1, -0.45], [0.7, -0.4], [0.5, -0.25], [0.2, -0.28]], pal('#e8dcc8'), 0.06);
    eye(g, r, 0.68, -0.8, 0.08, '#ffcf5a', 0);
  },
  tank(g, r) { golem(g, r, P('#57525e', 'stone', { hatch: true }), '#ff9a3a'); },
  frosttank(g, r) { golem(g, r, P('#6a8aa8', 'ice', { hatch: true }), '#7fd8ff', true); },
  spitter(g, r) { toad(g, r, P('#3d6428', 'toxic', { hatch: true }), '#a8ff5a', '#c8ff6a'); },
  frostspitter(g, r) {
    toad(g, r, P('#7aa0c0', 'ice', { hatch: true }), '#d8f4ff', '#bfe8ff');
    part(g, r, [[-0.9, -0.3], [-0.5, -0.78], [0.1, -0.88], [0.5, -0.7], [0.2, -0.55], [-0.3, -0.5]], pal('#f4fbff'), 0.1, 0.04);
  },
  charger(g, r) { // dark boar with a spiked mane and tusks
    part(g, r, [[-1.2, 0.6], [-1.3, -0.1], [-0.7, -0.62], [0.3, -0.7], [0.9, -0.4], [1.3, 0.1], [1.2, 0.5], [0.6, 0.62]], P('#4a3630', 'stone', { hatch: true }), 0.45);
    spikes(g, r, [[-0.9, -0.5, 0.45, -0.2], [-0.5, -0.66, 0.55, -0.15], [-0.1, -0.72, 0.5, -0.1], [0.3, -0.7, 0.4, -0.05]], P('#2a1e1c', 'stone'));
    part(g, r, [[-1.0, 0.55], [-0.9, 1.0], [-0.7, 1.0], [-0.65, 0.6]], P('#3a2a26', 'stone'), 0.08); part(g, r, [[0.6, 0.55], [0.7, 1.0], [0.9, 1.0], [0.92, 0.5]], P('#3a2a26', 'stone'), 0.08);
    part(g, r, [[1.0, 0.2], [1.45, -0.25], [1.3, 0.25]], pal('#efe6d2'), 0.05, 0.02);
    eye(g, r, 0.82, -0.18, 0.1, '#ff5a3a');
  },
  wolf(g, r) { // shadow wolf, spiky ruff
    part(g, r, [[-1.3, 0.2], [-1.5, -0.4], [-1.0, -0.1]], P('#2a2034', 'shadow'), 0.1);
    part(g, r, [[-1.1, 0.5], [-1.0, -0.2], [-0.3, -0.5], [0.5, -0.45], [0.9, -0.2], [0.8, 0.4], [-0.2, 0.55]], P('#2e2440', 'shadow', { hatch: true }), 0.4);
    spikes(g, r, [[-0.2, -0.45, 0.45, -0.25], [0.15, -0.5, 0.5, -0.2], [0.45, -0.45, 0.4, -0.15]], P('#1e1828', 'shadow'));
    part(g, r, [[0.5, -0.5], [0.8, -0.9], [0.95, -0.6], [1.45, -0.3], [1.35, 0.0], [0.9, 0.15], [0.55, 0.0]], P('#2e2440', 'shadow'), 0.25);
    part(g, r, [[0.7, -0.75], [0.75, -1.15], [0.95, -0.8]], P('#2a2034', 'shadow'), 0.05);
    fangs(g, r, 1.0, 1.35, -0.06, 3, 0.14);
    for (const x of [-0.85, -0.5, 0.3, 0.65]) part(g, r, [[x - 0.1, 0.4], [x - 0.08, 1.0], [x + 0.1, 1.0], [x + 0.1, 0.4]], P('#241c30', 'shadow'), 0.06);
    eye(g, r, 1.02, -0.35, 0.1, '#ff3a4a');
  },
  summoner(g, r) { // hooded cultist, skull face, cursed staff
    part(g, r, [[-0.8, 1.05], [-0.6, -0.2], [-0.5, -0.8], [0.0, -1.2], [0.5, -0.9], [0.62, -0.2], [0.85, 1.05]], P('#3a2242', 'shadow', { hatch: true }), 0.5);
    part(g, r, [[-0.1, -0.85], [0.42, -0.82], [0.48, -0.42], [0.2, -0.2], [-0.05, -0.4]], pal('#0a060c'), 0.04);
    part(g, r, [[0.0, -0.78], [0.38, -0.76], [0.4, -0.45], [0.2, -0.3], [0.04, -0.45]], pal('#d8d0c0'), 0.12, 0.03);
    eye(g, r, 0.12, -0.6, 0.08, '#7aff9a', 0); eye(g, r, 0.3, -0.6, 0.08, '#7aff9a', 0);
    part(g, r, [[0.9, 1.05], [0.98, -1.1], [1.06, -1.1], [1.0, 1.05]], P('#3a2a22', 'shadow'), 0.04);
    part(g, r, [[0.82, -1.1], [1.02, -1.42], [1.24, -1.1], [1.02, -0.96]], pal('#d8d0c0'), 0.06);
    glow(g, 1.02 * r, -1.22 * r, 0.42 * r, '#7aff9a', 0.9);
  },
  healer(g, r) { // forest wisp: bark body, glowing leaves
    part(g, r, [[-0.5, 0.9], [-0.7, 0.0], [-0.4, -0.7], [0.1, -0.95], [0.6, -0.6], [0.7, 0.1], [0.45, 0.9]], P('#3a2c20', 'toxic', { hatch: true }), 0.4);
    glow(g, 0, -0.1 * r, 0.6 * r, '#9dff8a', 0.55);
    for (const [x, y, a] of [[-0.8, -0.6, -0.6], [0.8, -0.7, 0.6], [-0.9, 0.2, -1], [0.9, 0.1, 1], [0, -1.2, 0]]) {
      g.save(); g.translate(x * r, y * r); g.rotate(a);
      part(g, r, [[0, 0.25], [-0.2, 0], [0, -0.32], [0.2, 0]], P('#4aa04a', 'toxic', { hi: '#c8ffb0' }), 0.06, 0.03);
      g.restore();
      glow(g, x * r, y * r, 0.3 * r, '#9dff8a', 0.6);
    }
    eye(g, r, -0.12, -0.3, 0.1, '#d8ffb0', 0); eye(g, r, 0.22, -0.3, 0.1, '#d8ffb0', 0);
  },
  bomber(g, r) { shroom(g, r, P('#8a1a26', 'fire', { hatch: true }), pal('#f0d8c8'), P('#d8c8a8', 'fire'), '#ffb347'); },
  emberbomber(g, r) {
    shroom(g, r, P('#3a2220', 'fire', { hatch: true }), pal('#ff7a2a', { hi: '#ffe0a0' }), P('#5a4038', 'fire'), '#ff7a2a');
    cracks(g, r, [[[-0.7, -0.2], [-0.4, -0.5]], [[0.4, -0.6], [0.7, -0.2]]], '#ff7a2a');
  },
  shielder(g, r) { // armoured beetle-turtle
    for (const x of [-0.7, -0.2, 0.3, 0.7]) part(g, r, [[x - 0.1, 0.5], [x - 0.15, 1.0], [x + 0.12, 1.0], [x + 0.1, 0.5]], P('#2a2830', 'stone'), 0.06);
    part(g, r, [[-1.2, 0.6], [-1.1, -0.3], [-0.6, -0.92], [0.2, -1.05], [0.9, -0.7], [1.1, 0.0], [1.0, 0.6]], P('#4e5866', 'stone', { hi: '#e8e0d0', hatch: true }), 0.5);
    g.beginPath(); g.moveTo(-0.1 * r, -1.0 * r); g.lineTo(0.0, 0.55 * r); g.moveTo(-1.0 * r, -0.1 * r); g.lineTo(1.05 * r, -0.05 * r);
    g.lineWidth = r * 0.05; g.strokeStyle = INK; g.stroke();
    part(g, r, [[0.9, 0.0], [1.42, -0.1], [1.5, 0.3], [1.0, 0.45]], P('#3a3a44', 'stone'), 0.15);
    eye(g, r, 1.25, 0.08, 0.08, '#ffb347');
  },
  yeti(g, r) { // shaggy white beast, small horns, blue mouth
    part(g, r, [[-1.0, 1.0], [-1.25, 0.4], [-1.1, -0.2], [-1.25, -0.4], [-0.9, -0.85], [-0.5, -0.95], [-0.3, -1.25], [0.1, -1.0], [0.5, -1.15], [0.8, -0.8], [1.15, -0.5], [1.05, 0.0], [1.25, 0.4], [0.95, 1.0], [0.4, 0.85], [0.0, 1.05], [-0.4, 0.85]], P('#d2dbe6', 'ice', { hi: '#ffffff', hatch: true }), 0.5);
    part(g, r, [[-0.3, -1.0], [-0.42, -1.45], [-0.1, -1.1]], pal('#5a5050'), 0.06); part(g, r, [[0.4, -1.0], [0.55, -1.45], [0.62, -1.0]], pal('#5a5050'), 0.06);
    part(g, r, [[0.2, -0.75], [0.95, -0.7], [1.0, -0.2], [0.6, 0.0], [0.15, -0.25]], P('#7a8a9e', 'ice'), 0.2);
    part(g, r, [[0.4, -0.25], [0.95, -0.28], [0.85, -0.05], [0.45, -0.05]], pal('#1a3a6a'), 0.04);
    fangs(g, r, 0.42, 0.92, -0.26, 4, 0.12);
    eye(g, r, 0.42, -0.52, 0.09, '#9fe8ff'); eye(g, r, 0.78, -0.5, 0.08, '#9fe8ff');
  },
  icewisp(g, r) { // floating frost spirit with orbiting shards
    glow(g, 0, 0, 1.3 * r, '#7fd8ff', 0.5);
    part(g, r, [[0, -1.0], [0.55, -0.1], [0.3, 0.7], [0, 1.0], [-0.3, 0.7], [-0.55, -0.1]], P('#6ab8e8', 'ice', { hi: '#ffffff' }), 0.3);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU, x = Math.cos(a) * 1.15, y = Math.sin(a) * 0.6;
      part(g, r, [[x, y - 0.25], [x + 0.12, y], [x, y + 0.25], [x - 0.12, y]], P('#bfe8ff', 'ice', { hi: '#ffffff' }), 0.05, 0.03);
    }
    eye(g, r, -0.14, -0.2, 0.09, '#ffffff', 0); eye(g, r, 0.16, -0.2, 0.09, '#ffffff', 0);
  },
  scorpion(g, r) { // black-red scorpion, venom-green stinger
    const shell = P('#3a1a1e', 'fire', { hatch: true });
    for (const x of [-0.7, -0.35, 0.0, 0.35]) part(g, r, [[x, 0.3], [x - 0.25, 0.85], [x - 0.12, 0.88], [x + 0.08, 0.35]], P('#2a1416', 'fire'), 0.05);
    part(g, r, [[-0.9, 0.4], [-0.9, -0.15], [-0.4, -0.38], [0.5, -0.36], [0.85, -0.05], [0.7, 0.4]], shell, 0.4);
    part(g, r, [[-0.8, -0.1], [-1.25, -0.5], [-1.25, -1.0], [-0.9, -1.4], [-0.4, -1.45], [-0.55, -1.2], [-0.95, -1.05], [-1.0, -0.6], [-0.6, -0.25]], shell, 0.2);
    part(g, r, [[-0.4, -1.45], [-0.05, -1.3], [-0.3, -1.1], [-0.55, -1.2]], P('#7aff5a', 'toxic', { hi: '#e0ffc8' }), 0.06);
    glow(g, -0.25 * r, -1.3 * r, 0.3 * r, '#9dff6a', 0.9);
    part(g, r, [[0.7, -0.1], [1.25, -0.4], [1.5, -0.15], [1.2, 0.0], [1.5, 0.15], [1.2, 0.3], [0.75, 0.2]], shell, 0.15);
    eye(g, r, 0.62, -0.2, 0.07, '#ff5a3a'); eye(g, r, 0.42, -0.24, 0.06, '#ff5a3a');
  },
  sandworm(g, r) { // segmented worm rearing out of the sand, ring of teeth
    part(g, r, [[-1.4, 1.1], [-1.0, 0.7], [1.0, 0.7], [1.4, 1.1]], P('#a07a44', 'sand'), 0.1);
    const seg = P('#8a5a3a', 'sand', { hatch: true });
    for (const [x, y, w] of [[-0.5, 0.6, 0.62], [-0.3, 0.15, 0.58], [-0.05, -0.3, 0.54], [0.25, -0.7, 0.5]]) part(g, r, [[x - w, y + 0.24], [x - w * 0.9, y - 0.22], [x + w * 0.9, y - 0.28], [x + w, y + 0.2]], seg, 0.2);
    part(g, r, [[0.0, -0.95], [0.4, -1.4], [0.95, -1.3], [1.1, -0.85], [0.7, -0.62]], P('#9a6a44', 'sand'), 0.2);
    part(g, r, [[0.35, -1.12], [0.85, -1.18], [0.9, -0.9], [0.5, -0.84]], pal('#2a0a0a'), 0.04);
    fangs(g, r, 0.4, 0.86, -1.14, 4, 0.12); fangs(g, r, 0.46, 0.84, -0.88, 3, 0.1, false);
  },
  imp(g, r) { // little red devil: wings, horns, forked tail
    part(g, r, [[-0.2, -0.3], [-1.3, -1.0], [-1.0, -0.4], [-1.35, -0.2], [-0.5, 0.1]], P('#5a1a1a', 'fire', { hatch: true }), 0.15);
    g.beginPath(); g.moveTo(-0.4 * r, 0.6 * r); g.quadraticCurveTo(-1.2 * r, 0.9 * r, -1.2 * r, 0.3 * r); g.lineWidth = r * 0.1; g.strokeStyle = '#7a1a14'; g.stroke();
    part(g, r, [[-1.3, 0.3], [-1.15, 0.05], [-1.05, 0.32]], P('#7a1a14', 'fire'), 0.04);
    part(g, r, [[-0.5, 0.95], [-0.6, 0.0], [-0.3, -0.55], [0.4, -0.6], [0.65, -0.1], [0.55, 0.95]], P('#b02a1e', 'fire', { hatch: true }), 0.4);
    part(g, r, [[-0.2, -0.5], [-0.4, -1.1], [0.0, -0.62]], pal('#2a1a1a'), 0.06); part(g, r, [[0.3, -0.55], [0.45, -1.15], [0.55, -0.55]], pal('#2a1a1a'), 0.06);
    eye(g, r, 0.18, -0.25, 0.1, '#ffd26a'); eye(g, r, 0.46, -0.24, 0.09, '#ffd26a');
    fangs(g, r, 0.18, 0.5, 0.05, 3, 0.12);
    glow(g, 0.9 * r, 0.1 * r, 0.35 * r, '#ff7a2a', 0.8);
  },
  salamander(g, r) { // fire lizard, glowing ridged back
    g.beginPath(); g.moveTo(-0.8 * r, 0.3 * r); g.quadraticCurveTo(-1.5 * r, 0.4 * r, -1.45 * r, -0.2 * r); g.lineWidth = r * 0.2; g.strokeStyle = '#8a3a14'; g.stroke();
    part(g, r, [[-1.0, 0.45], [-0.9, -0.2], [-0.2, -0.45], [0.6, -0.4], [1.0, -0.15], [1.45, 0.0], [1.4, 0.25], [0.6, 0.45]], P('#c0501a', 'fire', { hatch: true }), 0.35);
    spikes(g, r, [[-0.6, -0.32, 0.3, -0.1], [-0.3, -0.42, 0.36, -0.08], [0.0, -0.46, 0.4], [0.3, -0.44, 0.34, 0.05]], P('#ffb347', 'fire', { hi: '#fff0c0' }));
    cracks(g, r, [[[-0.7, -0.2], [0.4, -0.3]]], '#ffd27a', 0.04);
    for (const x of [-0.6, 0.6]) part(g, r, [[x - 0.12, 0.35], [x - 0.2, 0.8], [x + 0.12, 0.8], [x + 0.1, 0.35]], P('#8a3a14', 'fire'), 0.06);
    eye(g, r, 1.05, -0.12, 0.08, '#ffe08a');
  },

  // ——— bosses ———
  boss(g, r) { // Raja Maw: horned maw beast with a tarnished crown
    const hide = P('#4a2858', 'royal', { hatch: true });
    part(g, r, [[-0.6, -0.7], [-1.35, -1.3], [-1.0, -0.62]], pal('#e8dcc8', { rim: RIM.royal }), 0.1); part(g, r, [[0.6, -0.7], [1.35, -1.3], [1.0, -0.62]], pal('#e8dcc8', { rim: RIM.royal }), 0.1);
    part(g, r, [[-1.15, 0.9], [-1.25, 0.0], [-0.9, -0.7], [0.0, -0.95], [0.9, -0.7], [1.25, 0.0], [1.15, 0.9], [0.6, 1.05], [-0.6, 1.05]], hide, 0.5);
    part(g, r, [[-0.85, -0.05], [0.85, -0.05], [0.7, 0.62], [0.0, 0.8], [-0.7, 0.62]], pal('#1a0610'), 0.06, 0.02);
    fangs(g, r, -0.8, 0.8, -0.03, 8, 0.22); fangs(g, r, -0.66, 0.66, 0.72, 6, 0.18, false);
    glow(g, 0, 0.35 * r, 0.5 * r, '#ff4a8a', 0.35);
    eye(g, r, -0.42, -0.42, 0.14, '#ff3a5a', 0.3); eye(g, r, 0.42, -0.42, 0.14, '#ff3a5a', -0.3);
    part(g, r, [[-0.5, -0.85], [-0.55, -1.25], [-0.3, -1.05], [0.0, -1.35], [0.3, -1.05], [0.55, -1.25], [0.5, -0.85]], pal('#a8862a', { hi: '#ffe08a', rim: RIM.royal }), 0.1);
    glow(g, 0, -1.1 * r, 0.12 * r * 3, '#ff4a8a', 0.6);
  },
  crystalboss(g, r) { // golem of blue crystal, glowing core
    const C = P('#3a6a9a', 'ice', { hi: '#e0f6ff', hatch: true });
    for (const [x, y, h, l] of [[-0.8, -0.6, 0.8, -0.3], [-0.3, -0.85, 0.65, -0.1], [0.3, -0.85, 0.7, 0.1], [0.8, -0.55, 0.6, 0.3]]) part(g, r, [[x - 0.2, y + 0.2], [x + l, y - h], [x + 0.2, y + 0.2]], P('#6ac0f0', 'ice', { hi: '#ffffff' }), 0.12);
    part(g, r, [[-1.4, 0.1], [-1.5, 0.8], [-1.0, 0.95], [-0.9, 0.3]], C, 0.2); part(g, r, [[1.4, 0.1], [1.5, 0.8], [1.0, 0.95], [0.9, 0.3]], C, 0.2);
    part(g, r, [[-1.0, 1.05], [-1.1, -0.3], [-0.5, -0.85], [0.5, -0.85], [1.1, -0.3], [1.0, 1.05]], C, 0.5);
    glow(g, 0, 0.1 * r, 0.7 * r, '#7fd8ff', 0.8);
    part(g, r, [[0, -0.2], [0.25, 0.1], [0, 0.42], [-0.25, 0.1]], pal('#e8fbff', { hi: '#ffffff' }), 0.05);
    eye(g, r, -0.3, -0.5, 0.11, '#bff4ff', 0); eye(g, r, 0.3, -0.5, 0.11, '#bff4ff', 0);
  },
  sporeboss(g, r) { // rotting mushroom queen
    part(g, r, [[-0.55, 1.05], [-0.65, 0.0], [0.65, 0.0], [0.55, 1.05]], P('#c8b8a0', 'toxic', { hatch: true }), 0.35);
    eye(g, r, -0.22, 0.4, 0.13, '#d98aff', 0); eye(g, r, 0.22, 0.4, 0.13, '#d98aff', 0);
    part(g, r, [[-0.3, 0.7], [0.3, 0.7], [0.2, 0.85], [-0.2, 0.85]], pal('#1a0a14'), 0.04);
    part(g, r, [[-1.5, 0.2], [-1.35, -0.45], [-0.8, -1.05], [0.0, -1.3], [0.8, -1.05], [1.35, -0.45], [1.5, 0.2], [0.9, 0.05], [0.0, 0.15], [-0.9, 0.05]], P('#6a2a6a', 'toxic', { hatch: true }), 0.5);
    for (let i = -4; i <= 4; i++) { g.beginPath(); g.moveTo(i * 0.32 * r, 0.12 * r); g.lineTo(i * 0.22 * r, 0.02 * r); g.lineWidth = r * 0.03; g.strokeStyle = 'rgba(0,0,0,.5)'; g.stroke(); }
    for (const [x, y, s] of [[-0.8, -0.5, 0.18], [-0.2, -0.85, 0.15], [0.45, -0.7, 0.2], [0.95, -0.35, 0.14], [0.0, -0.35, 0.12]]) { glow(g, x * r, y * r, s * r * 2, '#b7ff6a', 0.7); part(g, r, [[x - s, y], [x, y - s * 0.7], [x + s, y], [x, y + s * 0.7]], P('#b7ff6a', 'toxic', { hi: '#f0ffd0' }), 0.03, 0.02); }
    part(g, r, [[-0.5, -1.2], [-0.4, -1.55], [-0.15, -1.3], [0.0, -1.58], [0.15, -1.3], [0.4, -1.55], [0.5, -1.2]], pal('#7a6a4a', { hi: '#d8c8a0' }), 0.1);
  },
  lavaboss(g, r) { // molten rock king with cracks of fire and a crown of flame
    const rock = P('#2e2224', 'fire', { hatch: true });
    part(g, r, [[-1.45, 0.0], [-1.5, 0.75], [-1.0, 0.95], [-0.9, 0.2]], rock, 0.2); part(g, r, [[1.45, 0.0], [1.5, 0.75], [1.0, 0.95], [0.9, 0.2]], rock, 0.2);
    part(g, r, [[-1.05, 1.05], [-1.15, -0.4], [-0.6, -0.95], [0.6, -0.95], [1.15, -0.4], [1.05, 1.05]], rock, 0.5);
    cracks(g, r, [[[-0.8, -0.6], [-0.4, -0.2], [-0.7, 0.3], [-0.3, 0.8]], [[0.7, -0.5], [0.3, 0.0], [0.6, 0.5]], [[-0.1, 0.2], [0.2, 0.6]], [[-1.3, 0.3], [-1.1, 0.6]], [[1.3, 0.3], [1.15, 0.65]]], '#ff7a2a', 0.06);
    glow(g, 0, 0.1 * r, 0.8 * r, '#ff5a1a', 0.45);
    eye(g, r, -0.32, -0.55, 0.13, '#ffd27a', 0.2); eye(g, r, 0.32, -0.55, 0.13, '#ffd27a', -0.2);
    for (const [x, h] of [[-0.55, 0.45], [-0.2, 0.6], [0.2, 0.6], [0.55, 0.45]]) {
      glow(g, x * r, (-0.95 - h * 0.5) * r, 0.3 * r, '#ff9a3a', 0.8);
      part(g, r, [[x - 0.14, -0.9], [x, -0.95 - h], [x + 0.14, -0.9]], P('#ffb347', 'fire', { hi: '#fff0c0' }), 0.04, 0.03);
    }
  },
  tombboss(g, r) { // Raja Mumi: towering mummy in dusty wraps, gold-and-blue headdress, teal eyes
    const wrap = P('#b8a880', 'sand', { hatch: true });
    part(g, r, [[-1.25, -0.2], [-1.45, 0.6], [-1.05, 0.7], [-0.85, 0.0]], wrap, 0.2); part(g, r, [[1.1, -0.3], [1.5, 0.3], [1.2, 0.55], [0.85, 0.0]], wrap, 0.2);
    part(g, r, [[-0.9, 1.1], [-1.0, -0.2], [-0.6, -0.65], [0.6, -0.65], [1.0, -0.2], [0.9, 1.1]], wrap, 0.5);
    g.beginPath();
    for (const y of [-0.3, 0.05, 0.4, 0.75]) { g.moveTo(-0.95 * r, y * r); g.lineTo(0.95 * r, (y - 0.12) * r); }
    g.lineWidth = r * 0.03; g.strokeStyle = 'rgba(60,40,20,.55)'; g.stroke();
    part(g, r, [[-0.75, -0.55], [-0.95, 0.35], [-0.5, 0.1], [-0.45, -0.6]], pal('#2a5a9a', { rim: RIM.sand }), 0.1);
    part(g, r, [[0.75, -0.55], [0.95, 0.35], [0.5, 0.1], [0.45, -0.6]], pal('#2a5a9a', { rim: RIM.sand }), 0.1);
    part(g, r, [[-0.5, -0.6], [-0.45, -1.2], [0.0, -1.5], [0.45, -1.2], [0.5, -0.6]], pal('#c89a2a', { hi: '#ffe08a', rim: RIM.sand }), 0.2);
    for (const y of [-1.25, -1.0, -0.75]) { g.beginPath(); g.moveTo(-0.48 * r, y * r); g.lineTo(0.48 * r, y * r); g.lineWidth = r * 0.06; g.strokeStyle = '#2a5a9a'; g.stroke(); }
    part(g, r, [[-0.3, -0.62], [0.3, -0.62], [0.25, -0.15], [-0.25, -0.15]], pal('#1a140c'), 0.04);
    eye(g, r, -0.14, -0.42, 0.09, '#5affe0', 0); eye(g, r, 0.14, -0.42, 0.09, '#5affe0', 0);
    glow(g, 0, -1.48 * r, 0.25 * r, '#5affe0', 0.8);
  },
};

export const MONSTER_ART = MONSTERS;
