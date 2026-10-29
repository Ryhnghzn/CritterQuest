// Tanah Gerhana enemies (spec §26.7) in the style-D look of art/monsters.js: the
// same families as their kin (ooze, bat, toad, golem) turned void-black with a
// lavender rim light, plus the Hantu Gerhana. Facing right around the origin in
// units of r, inside ±1.6 r.
import { cel, poly, glow, pal, mix, TAU } from './hero/cel.js';

const RIM = 'rgba(200,160,255,.9)';
const VOID = '#c79bff';   // eye & crack glow
const P = (base, extra = {}) => pal(base, { rim: RIM, ...extra });
const S = (r, pts) => pts.map(([x, y]) => [x * r, y * r]);
function part(g, r, pts, Pal, sd = 0.28, hd = 0.08) {
  cel(g, poly(g, S(r, pts)), Pal, sd * r, hd * r, Math.max(0.7, r * 0.07));
}
function eye(g, r, x, y, s, color = VOID, tilt = -0.25) {
  glow(g, x * r, y * r, s * r * 2.6, color, 0.9);
  g.save(); g.translate(x * r, y * r); g.rotate(tilt);
  g.beginPath(); g.moveTo(-s * r, 0); g.lineTo(0, -s * r * 0.45); g.lineTo(s * r, 0); g.lineTo(0, s * r * 0.3); g.closePath();
  g.fillStyle = mix(color, '#ffffff', 0.6); g.fill();
  g.restore();
}
function fangs(g, r, x0, x1, y, n, h, down = true) {
  g.fillStyle = '#e6dcf2';
  for (let i = 0; i < n; i++) {
    const x = x0 + ((x1 - x0) * (i + 0.5)) / n, w = (x1 - x0) / n / 2;
    g.beginPath(); g.moveTo((x - w) * r, y * r); g.lineTo(x * r, (y + (down ? h : -h)) * r); g.lineTo((x + w) * r, y * r); g.closePath(); g.fill();
  }
}
function cracks(g, r, lines, color = VOID, w = 0.05) {
  g.save(); g.globalCompositeOperation = 'lighter';
  g.beginPath();
  for (const l of lines) l.forEach(([x, y], i) => (i ? g.lineTo(x * r, y * r) : g.moveTo(x * r, y * r)));
  g.lineWidth = w * r; g.strokeStyle = color; g.stroke();
  g.lineWidth = w * r * 3; g.globalAlpha = 0.3; g.stroke();
  g.restore();
}
// tiny stars caught inside a void body
function stars(g, r, list) {
  g.save(); g.globalCompositeOperation = 'lighter';
  for (const [x, y, s] of list) { glow(g, x * r, y * r, s * r * 3, '#b48cff', 0.6); g.beginPath(); g.arc(x * r, y * r, s * r * 0.5, 0, TAU); g.fillStyle = '#f2e8ff'; g.fill(); }
  g.restore();
}

const OOZE = [[-1, 0.55], [-1.12, -0.15], [-0.78, -0.78], [-0.22, -1.04], [0.42, -0.96], [0.92, -0.55], [1.12, 0.08], [1.02, 0.56], [0.82, 0.92], [0.62, 0.6], [0.3, 0.74], [0.06, 1.02], [-0.18, 0.66], [-0.5, 0.8], [-0.72, 1.04], [-0.86, 0.62]];

const ECLIPSE = {
  voidslink(g, r) { // Lendir Hampa: a slime of night sky with stars drifting inside
    part(g, r, OOZE, P('#3a2a5c', { hatch: true }), 0.42);
    stars(g, r, [[-0.6, -0.2, 0.06], [-0.25, -0.7, 0.05], [-0.7, 0.35, 0.04], [0.1, 0.62, 0.05], [-0.4, 0.2, 0.035]]);
    part(g, r, [[0.12, 0.04], [0.9, -0.06], [0.82, 0.34], [0.5, 0.44], [0.18, 0.32]], pal('#0a0614'), 0.05, 0.02);
    fangs(g, r, 0.16, 0.86, 0.02, 5, 0.16); fangs(g, r, 0.22, 0.8, 0.4, 4, 0.12, false);
    eye(g, r, 0.32, -0.42, 0.16); eye(g, r, 0.74, -0.36, 0.13);
  },
  voiddart(g, r) { // Kelelawar Gerhana: torn wings with a pale eclipse ring behind the head
    const wing = P('#3c2a58', { hatch: true });
    part(g, r, [[-0.2, -0.1], [-1.1, -1.05], [-0.95, -0.55], [-1.5, -0.4], [-1.0, -0.1], [-1.3, 0.25], [-0.5, 0.1]], wing, 0.2);
    part(g, r, [[0.2, -0.1], [1.1, -1.05], [0.95, -0.55], [1.5, -0.4], [1.0, -0.1], [1.3, 0.25], [0.5, 0.1]], wing, 0.2);
    g.beginPath(); g.arc(0, -0.25 * r, 0.62 * r, 0, TAU); g.lineWidth = r * 0.07; g.strokeStyle = 'rgba(214,180,255,.55)'; g.stroke();
    part(g, r, [[-0.42, 0.5], [-0.5, -0.2], [-0.3, -0.62], [-0.38, -1.0], [-0.08, -0.7], [0.08, -0.7], [0.38, -1.0], [0.3, -0.62], [0.5, -0.2], [0.42, 0.5], [0, 0.72]], P('#261a36'), 0.3);
    eye(g, r, -0.16, -0.3, 0.12, VOID, 0.3); eye(g, r, 0.18, -0.3, 0.12, VOID, -0.3);
    fangs(g, r, -0.12, 0.12, 0.1, 2, 0.16);
  },
  voidspitter(g, r) { // Katak Hampa: a toad with glowing violet warts and a three-way spit
    const body = P('#44306a', { hatch: true });
    part(g, r, [[-1.05, 0.7], [-1.12, 0.05], [-0.7, -0.6], [0.05, -0.82], [0.7, -0.6], [1.1, -0.05], [1.12, 0.45], [0.8, 0.78], [-0.6, 0.86]], body, 0.4);
    part(g, r, [[-0.9, 0.78], [-1.3, 0.92], [-0.6, 0.98]], body, 0.08); part(g, r, [[0.7, 0.8], [1.2, 0.98], [0.4, 0.98]], body, 0.08);
    part(g, r, [[0.2, 0.1], [1.12, 0.06], [1.04, 0.3], [0.3, 0.32]], pal('#0a0614'), 0.04, 0.02);
    for (const [x, y, s] of [[-0.6, -0.2, 0.12], [-0.25, -0.5, 0.1], [-0.75, 0.25, 0.09], [0.1, -0.35, 0.08]]) {
      glow(g, x * r, y * r, s * r * 2.2, VOID, 0.8); g.beginPath(); g.arc(x * r, y * r, s * r * 0.6, 0, TAU); g.fillStyle = '#ead8ff'; g.fill();
    }
    part(g, r, [[0.3, -0.78], [0.62, -1.02], [0.86, -0.7]], body, 0.08); part(g, r, [[0.66, -0.66], [0.98, -0.86], [1.12, -0.5]], body, 0.08);
    eye(g, r, 0.58, -0.8, 0.12); eye(g, r, 0.92, -0.62, 0.1);
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = VOID; g.globalAlpha = 0.85;
    for (const dy of [-0.12, 0, 0.12]) { g.beginPath(); g.moveTo(1.08 * r, 0.18 * r); g.lineTo(1.4 * r, (0.18 + dy * 2) * r); g.lineTo(1.08 * r, 0.26 * r); g.fill(); }
    g.restore();
  },
  voidtank(g, r) { // Golem Gerhana: obsidian slabs held together by violet light
    const stone = P('#2c2440', { hatch: true });
    part(g, r, [[-1.32, 0.05], [-1.42, 0.62], [-1.0, 0.82], [-0.86, 0.2]], stone, 0.2);
    part(g, r, [[-0.92, 1.0], [-1.0, -0.38], [-0.62, -0.92], [0.36, -1.02], [0.92, -0.62], [1.02, 0.12], [0.86, 1.02]], stone, 0.5);
    part(g, r, [[-0.28, -0.86], [-0.18, -1.32], [0.38, -1.42], [0.62, -1.02], [0.36, -0.78]], stone, 0.18);
    part(g, r, [[0.8, -0.1], [1.42, 0.1], [1.48, 0.72], [1.0, 0.86], [0.78, 0.42]], stone, 0.22);
    part(g, r, [[-0.62, -0.94], [-0.5, -1.4], [-0.32, -0.92]], P('#3a2a5a', { hi: '#cdb2ff' }), 0.06, 0.03); // crystal shards on the back
    part(g, r, [[-0.92, -0.4], [-1.2, -0.86], [-0.84, -0.6]], P('#3a2a5a', { hi: '#cdb2ff' }), 0.06, 0.03);
    cracks(g, r, [[[-0.5, -0.5], [-0.2, -0.1], [-0.4, 0.3], [-0.1, 0.7]], [[0.4, -0.6], [0.2, -0.2], [0.5, 0.2]], [[1.0, 0.3], [1.2, 0.5]], [[-1.2, 0.3], [-1.1, 0.55]]]);
    glow(g, 0.1 * r, 0.05 * r, 0.55 * r, VOID, 0.5);
    eye(g, r, 0.44, -1.14, 0.1, VOID, 0);
  },
  wraith(g, r) { // Hantu Gerhana: a hooded shade with a cracked mask, claws and a misty tail
    const robe = P('#2e2246', { hatch: true });
    g.save(); g.globalAlpha = 0.55; // misty tail, fading downward
    part(g, r, [[-0.55, 0.3], [-0.9, 0.9], [-0.6, 1.4], [-0.2, 1.0], [0.0, 1.5], [0.2, 0.95], [0.5, 1.3], [0.6, 0.4]], P('#2a1e40'), 0.2);
    g.restore();
    part(g, r, [[-0.75, 0.75], [-0.85, -0.2], [-0.55, -0.95], [0.0, -1.3], [0.55, -1.0], [0.82, -0.25], [0.72, 0.75], [0.3, 0.55], [0.0, 0.85], [-0.35, 0.55]], robe, 0.45);
    // arms with long claws reaching forward
    part(g, r, [[0.4, -0.2], [1.05, 0.05], [1.12, 0.3], [0.5, 0.25]], robe, 0.12);
    g.strokeStyle = '#e8dcff'; g.lineWidth = r * 0.06; g.lineCap = 'round';
    for (const [dy, len] of [[0.0, 0.42], [0.14, 0.48], [0.28, 0.4]]) { g.beginPath(); g.moveTo(1.08 * r, (0.08 + dy) * r); g.lineTo((1.08 + len) * r, (0.02 + dy * 1.3) * r); g.stroke(); }
    g.lineCap = 'butt';
    // hood opening and the cracked mask
    part(g, r, [[-0.25, -0.92], [0.35, -1.05], [0.62, -0.55], [0.4, -0.1], [-0.15, -0.2]], pal('#05030a'), 0.05, 0.02);
    part(g, r, [[-0.05, -0.85], [0.38, -0.92], [0.52, -0.55], [0.36, -0.2], [0.02, -0.3]], pal('#d9d0e6', { hi: '#ffffff', rim: RIM }), 0.08, 0.03);
    g.beginPath(); g.moveTo(0.2 * r, -0.9 * r); g.lineTo(0.14 * r, -0.62 * r); g.lineTo(0.24 * r, -0.48 * r); g.lineTo(0.16 * r, -0.28 * r);
    g.lineWidth = r * 0.035; g.strokeStyle = '#2a1a3a'; g.stroke();
    eye(g, r, 0.12, -0.64, 0.09, VOID, 0); eye(g, r, 0.38, -0.66, 0.08, VOID, 0);
    glow(g, 0.0, 0.0, 0.9 * r, '#7a4acc', 0.35);
  },
  eclipseboss(g, r) { // Sang Gerhana: a floating giant in pitch-black robes, an eclipsed sun behind the head
    // corona: a black disc ringed by gold-white fire, rays fanning out
    const cy = -0.72;
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU, l = i % 2 ? 1.38 : 1.55;
      g.beginPath(); g.moveTo(Math.cos(a - 0.08) * 0.62 * r, (cy + Math.sin(a - 0.08) * 0.62) * r);
      g.lineTo(Math.cos(a) * l * r * 0.95, (cy + Math.sin(a) * l * 0.62) * r);
      g.lineTo(Math.cos(a + 0.08) * 0.62 * r, (cy + Math.sin(a + 0.08) * 0.62) * r); g.closePath();
      g.fillStyle = i % 2 ? 'rgba(255,200,110,.45)' : 'rgba(255,236,170,.6)'; g.fill();
    }
    glow(g, 0, cy * r, 1.0 * r, '#ffd27a', 0.55);
    g.restore();
    g.beginPath(); g.arc(0, cy * r, 0.66 * r, 0, TAU); g.fillStyle = '#fff2c8'; g.fill();
    g.beginPath(); g.arc(0.04 * r, cy * r, 0.6 * r, 0, TAU); g.fillStyle = '#05030a'; g.fill();
    // shadow arms behind the body (two each side), clawed hands
    const shade = P('#1c1430', { hatch: true });
    for (const [sx, sy, ex, ey] of [[-0.55, -0.1, -1.45, -0.55], [-0.6, 0.25, -1.5, 0.45], [0.55, -0.1, 1.45, -0.6], [0.6, 0.25, 1.5, 0.4]]) {
      const len = Math.hypot(ex - sx, ey - sy), nx = ((ey - sy) / len) * 0.13, ny = ((sx - ex) / len) * 0.13;
      part(g, r, [[sx - nx, sy - ny], [(sx + ex) / 2 - nx * 0.9, (sy + ey) / 2 - ny * 0.9 - 0.08], [ex - nx * 0.6, ey - ny * 0.6], [ex + nx * 0.6, ey + ny * 0.6], [(sx + ex) / 2 + nx * 0.9, (sy + ey) / 2 + ny * 0.9 - 0.08], [sx + nx, sy + ny]], shade, 0.1, 0.03);
      g.strokeStyle = '#d8c4ff'; g.lineWidth = r * 0.045; g.lineCap = 'round';
      for (const k of [-1, 0, 1]) { g.beginPath(); g.moveTo(ex * r, ey * r); g.lineTo((ex + Math.sign(ex) * 0.14) * r, (ey + k * 0.1 - 0.04) * r); g.stroke(); }
      g.lineCap = 'butt';
    }
    // robe: wide shoulders tapering to a ragged hem (it floats, no feet)
    const robe = P('#120c1e', { hatch: true });
    g.save(); g.globalAlpha = 0.6;
    part(g, r, [[-0.62, 0.9], [-0.42, 1.5], [-0.15, 1.15], [0.05, 1.55], [0.22, 1.12], [0.48, 1.45], [0.62, 0.9]], P('#1a1028'), 0.15);
    g.restore();
    part(g, r, [[-0.82, -0.25], [-0.6, -0.55], [0.6, -0.55], [0.82, -0.25], [0.7, 0.55], [0.5, 1.05], [0.2, 0.92], [0.0, 1.12], [-0.22, 0.92], [-0.52, 1.05], [-0.7, 0.55]], robe, 0.5);
    cracks(g, r, [[[-0.35, -0.4], [-0.2, 0.0], [-0.35, 0.45]], [[0.3, -0.35], [0.2, 0.1], [0.36, 0.6]], [[0.0, 0.2], [0.05, 0.75]]], VOID, 0.04);
    // hood & the cracked golden mask
    part(g, r, [[-0.42, -0.5], [-0.46, -0.95], [-0.2, -1.22], [0.2, -1.22], [0.46, -0.95], [0.42, -0.5]], P('#1a1228'), 0.18);
    part(g, r, [[-0.3, -0.58], [-0.32, -0.92], [0.0, -1.1], [0.32, -0.92], [0.3, -0.58], [0.0, -0.45]], pal('#d0a23a', { hi: '#ffe8a0', rim: 'rgba(255,230,160,.9)' }), 0.1, 0.04);
    g.beginPath(); g.moveTo(0.06 * r, -1.08 * r); g.lineTo(0.0, -0.86 * r); g.lineTo(0.1 * r, -0.72 * r); g.lineTo(0.02 * r, -0.5 * r);
    g.lineWidth = r * 0.03; g.strokeStyle = '#3a2410'; g.stroke();
    eye(g, r, -0.14, -0.8, 0.08, VOID, 0.15); eye(g, r, 0.14, -0.8, 0.08, VOID, -0.15);
    // floating violet crystal shards
    const shard = P('#3a2a5a', { hi: '#e2d0ff' });
    for (const [x, y, s2] of [[-1.15, 0.95, 0.16], [1.2, 0.9, 0.14], [-1.3, -1.15, 0.12], [1.25, -1.2, 0.13], [0.95, 1.35, 0.1]]) {
      part(g, r, [[x, y - s2 * 1.6], [x + s2 * 0.6, y], [x, y + s2 * 1.2], [x - s2 * 0.6, y]], shard, 0.05, 0.02);
      glow(g, x * r, y * r, s2 * 2.2 * r, VOID, 0.45);
    }
    stars(g, r, [[-0.3, 0.3, 0.05], [0.25, 0.55, 0.04], [0.05, -0.15, 0.04]]);
  },
};

export const ECLIPSE_ART = ECLIPSE;
