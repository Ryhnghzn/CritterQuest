// Icons of the Job Lanjutan skills (spec §43.10, §48): one per skill id, so a branch never wears a
// base skill's icon. Every one sits on a round emblem rimmed in its branch colour; ultimates add a
// spiked gold crown on the rim. Drawn in the same 26-unit box as art/sprites.js ICONS.
const TAU = Math.PI * 2;
const OUT = '#16121c';

function grad(g, y0, y1, c0, c1) {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, c0); gr.addColorStop(1, c1);
  return gr;
}
function ink(g, fill, lw = 1.2) { g.fillStyle = fill; g.fill(); g.lineWidth = lw; g.strokeStyle = OUT; g.stroke(); }
function line(g, pts, w, col) {
  g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.lineWidth = w + 2.2; g.strokeStyle = OUT; g.stroke();
  g.lineWidth = w; g.strokeStyle = col; g.stroke();
}
function dot(g, x, y, r, col) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = col; g.fill(); }

// the round emblem: dark core glowing in the branch colour; ult: gold spikes round the rim
function emblem(g, rim, core, ult) {
  if (ult) {
    g.beginPath();
    for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU - Math.PI / 2, r = i % 2 ? 11.6 : 13.4; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    g.closePath(); ink(g, grad(g, -13, 13, '#fff1b0', '#c8902a'), 1);
  }
  const gr = g.createRadialGradient(0, -2, 1, 0, 0, 11.5);
  gr.addColorStop(0, core); gr.addColorStop(1, '#120c18');
  g.beginPath(); g.arc(0, 0, 11.2, 0, TAU); g.fillStyle = gr; g.fill();
  g.lineWidth = 1.8; g.strokeStyle = rim; g.stroke();
  g.lineWidth = 0.8; g.strokeStyle = OUT; g.beginPath(); g.arc(0, 0, 12.2, 0, TAU); g.stroke();
}
// a small four-point glint
function glint(g, x, y, r, col = '#ffffff') {
  g.beginPath(); g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r);
  g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r); g.fillStyle = col; g.fill();
}
function blade(g, len, w, col = '#eef3fb') { // pointing up from the origin
  g.beginPath(); g.moveTo(0, -len); g.lineTo(w, -len * 0.7); g.lineTo(w * 0.8, 0); g.lineTo(-w * 0.8, 0); g.lineTo(-w, -len * 0.7); g.closePath();
  ink(g, col, 1);
}

const RED = '#ff3b3b', GOLD = '#ffe27a', GREEN = '#9cf5a8', LIME = '#c7e86a', FIRE = '#ff6a2a', TIME = '#7fd8ff', SHADE = '#9a6bff', PINK = '#ff7ad9';

export const BRANCH_ICONS = {
  // Berserker
  bloodrage(g) { // a blood drop with burning rage eyes
    emblem(g, RED, '#5c0a18');
    g.beginPath(); g.moveTo(0, -10); g.bezierCurveTo(7, -2, 8, 3, 0, 9); g.bezierCurveTo(-8, 3, -7, -2, 0, -10);
    ink(g, grad(g, -10, 9, '#ff7a86', '#a0101e'), 1.3);
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 1, 1.5); g.lineTo(s * 5, -0.8); g.lineTo(s * 4.4, 2.6); g.closePath(); g.fillStyle = '#ffe27a'; g.fill(); }
    g.beginPath(); g.moveTo(-3, 5.5); g.lineTo(-1.5, 4.3); g.lineTo(0, 5.5); g.lineTo(1.5, 4.3); g.lineTo(3, 5.5); g.lineWidth = 1; g.strokeStyle = '#fff'; g.stroke();
    dot(g, -3.2, -4.5, 1.2, 'rgba(255,255,255,.7)');
  },
  rageleap(g) { // three claw rakes and a leaping chevron
    emblem(g, RED, '#5c0a18');
    for (const o of [-4.5, 0, 4.5]) line(g, [[o - 4, -8], [o + 3, 8]], 2, '#ff5a6e');
    line(g, [[-8, 2], [0, -6], [8, 2]], 2.6, '#ffd6d6');
    glint(g, 6, -6, 2.6, '#ffe27a');
  },
  ragnarok(g) { // a twin-bladed axe in a storm of blood
    emblem(g, RED, '#7a0f22', true);
    g.lineCap = 'round';
    for (let i = 0; i < 3; i++) { const a = i * 2.1; g.beginPath(); g.arc(0, 0, 8.6, a, a + 1.4); g.lineWidth = 2; g.strokeStyle = '#ff5a6e'; g.stroke(); }
    g.save(); g.rotate(-0.5);
    g.beginPath(); g.roundRect(-1, -9, 2, 18, 1); ink(g, '#8a5a34', 0.9);
    for (const s of [-1, 1]) {
      g.beginPath(); g.moveTo(s * 1, -7); g.quadraticCurveTo(s * 8, -9, s * 8.5, -2); g.quadraticCurveTo(s * 5, -3, s * 1, -1); g.closePath();
      ink(g, grad(g, -9, -1, '#ffffff', '#c8d2e2'), 1);
    }
    g.restore();
    glint(g, -6, -7, 2.4);
  },
  // Paladin
  holyguard(g) { // a shield bearing a cross, haloed
    emblem(g, GOLD, '#5a4410');
    g.beginPath(); g.ellipse(0, -9, 6, 1.8, 0, 0, TAU); g.lineWidth = 1.4; g.strokeStyle = '#fff3c4'; g.stroke();
    g.beginPath(); g.moveTo(0, -7); g.quadraticCurveTo(6, -6, 7.5, -5); g.quadraticCurveTo(7.5, 4, 0, 9.5); g.quadraticCurveTo(-7.5, 4, -7.5, -5); g.quadraticCurveTo(-6, -6, 0, -7);
    ink(g, grad(g, -7, 9, '#fff6d0', '#d9a020'), 1.3);
    g.fillStyle = '#ffffff'; g.fillRect(-1.1, -4.5, 2.2, 10); g.fillRect(-4.2, -1.5, 8.4, 2.2);
  },
  judgment(g) { // a warhammer of light coming down, rays below
    emblem(g, GOLD, '#5a4410');
    g.lineCap = 'round';
    for (const x of [-6, 0, 6]) { g.beginPath(); g.moveTo(x, 4); g.lineTo(x * 1.3, 10); g.lineWidth = 1.4; g.strokeStyle = 'rgba(255,243,196,.85)'; g.stroke(); }
    g.save(); g.rotate(0.35);
    g.beginPath(); g.roundRect(-1.1, -4, 2.2, 13, 1); ink(g, '#8a5a34', 0.9);
    g.beginPath(); g.roundRect(-7, -9.5, 14, 6.5, 1.6); ink(g, grad(g, -9.5, -3, '#ffffff', '#ffd166'), 1.2);
    g.fillStyle = '#c28a1a'; g.fillRect(-1, -8.5, 2, 4.5);
    g.restore();
    glint(g, 7, -7, 2.4);
  },
  sanctuary(g) { // a winged halo over a glowing circle
    emblem(g, GOLD, '#6a5014', true);
    g.beginPath(); g.ellipse(0, 6, 8, 2.6, 0, 0, TAU); g.lineWidth = 1.6; g.strokeStyle = '#ffd166'; g.stroke();
    for (const s of [-1, 1]) {
      g.beginPath(); g.moveTo(s * 2, -2); g.quadraticCurveTo(s * 9, -9, s * 10, -2); g.quadraticCurveTo(s * 7, -3, s * 7.5, 1); g.quadraticCurveTo(s * 5, -1, s * 2, 1); g.closePath();
      ink(g, grad(g, -9, 1, '#ffffff', '#ffe9a8'), 1);
    }
    g.beginPath(); g.ellipse(0, -5, 4, 1.4, 0, 0, TAU); g.lineWidth = 1.6; g.strokeStyle = '#fff3c4'; g.stroke();
    g.beginPath(); g.moveTo(0, -1); g.lineTo(0, 6); g.lineWidth = 2; g.strokeStyle = '#fff'; g.stroke();
  },
  // Penembak Jitu
  headshot(g) { // a crosshair with an arrow through its heart
    emblem(g, GREEN, '#123a20');
    g.beginPath(); g.arc(0, 0, 7, 0, TAU); g.lineWidth = 1.4; g.strokeStyle = '#b8ffc8'; g.stroke();
    for (let i = 0; i < 4; i++) { const a = (i * TAU) / 4, c = Math.cos(a), s = Math.sin(a); line(g, [[c * 4.5, s * 4.5], [c * 10, s * 10]], 1.2, '#e8fff0'); }
    g.save(); g.rotate(-Math.PI / 4);
    line(g, [[-11, 0], [5, 0]], 1.6, '#ffe27a');
    g.beginPath(); g.moveTo(10, 0); g.lineTo(4, -3.4); g.lineTo(4, 3.4); g.closePath(); ink(g, '#fff4b8', 1);
    g.restore();
    dot(g, 0, 0, 1.6, '#ff3b3b');
  },
  steadyaim(g) { // an eye inside the scope
    emblem(g, GREEN, '#123a20');
    g.beginPath(); g.moveTo(-9, 0); g.quadraticCurveTo(0, -8, 9, 0); g.quadraticCurveTo(0, 8, -9, 0); g.closePath(); ink(g, '#e8fff0', 1.2);
    g.beginPath(); g.arc(0, 0, 3.8, 0, TAU); ink(g, grad(g, -4, 4, '#9cf5a8', '#1f8a4a'), 1);
    dot(g, 0, 0, 1.6, OUT); dot(g, -1.2, -1.2, 0.8, '#fff');
    for (const [x, y] of [[0, -10], [0, 10], [-10.5, 0], [10.5, 0]]) dot(g, x, y, 0.9, '#b8ffc8');
  },
  deatheye(g) { // a blazing eye firing a beam across
    emblem(g, GREEN, '#0e4a26', true);
    g.beginPath(); g.moveTo(-11, 3); g.lineTo(11, -3); g.lineWidth = 4.5; g.strokeStyle = 'rgba(156,245,168,.55)'; g.lineCap = 'round'; g.stroke();
    g.lineWidth = 1.6; g.strokeStyle = '#ffffff'; g.stroke();
    g.beginPath(); g.moveTo(-7.5, 0); g.quadraticCurveTo(0, -7, 7.5, 0); g.quadraticCurveTo(0, 7, -7.5, 0); g.closePath(); ink(g, '#14301c', 1.2);
    g.beginPath(); g.arc(0, 0, 3.2, 0, TAU); g.fillStyle = '#9cf5a8'; g.fill();
    g.beginPath(); g.ellipse(0, 0, 0.9, 2.6, 0, 0, TAU); g.fillStyle = OUT; g.fill();
  },
  // Pemburu
  wolf(g) { // a howling shadow wolf's head
    emblem(g, LIME, '#2a3410');
    g.beginPath();
    g.moveTo(-7, 8); g.lineTo(-6, -2); g.lineTo(-7.5, -9); g.lineTo(-3, -5); g.lineTo(1, -6); g.lineTo(4, -10); g.lineTo(5, -4);
    g.lineTo(10, -1); g.lineTo(9.5, 1.5); g.lineTo(4, 2); g.lineTo(2, 8); g.closePath();
    ink(g, grad(g, -10, 8, '#6a4a9a', '#241436'), 1.2);
    g.beginPath(); g.moveTo(1, -2.8); g.lineTo(4, -2.5); g.lineTo(2.2, -1.4); g.closePath(); g.fillStyle = '#ff4a3a'; g.fill();
    g.beginPath(); g.moveTo(5, 2); g.lineTo(6, 3.4); g.lineTo(7, 2); g.fillStyle = '#fff'; g.fill();
    glint(g, -8, 6, 2, LIME);
  },
  runvolley(g) { // a fan of arrows thrown on the run, speed lines behind
    emblem(g, LIME, '#2a3410');
    for (const a of [-0.45, -0.15, 0.15, 0.45]) {
      g.save(); g.rotate(a);
      line(g, [[-6, 0], [6, 0]], 1.2, '#e6eef8');
      g.beginPath(); g.moveTo(10, 0); g.lineTo(5.5, -2.4); g.lineTo(5.5, 2.4); g.closePath(); ink(g, '#d4ff8a', 0.8);
      g.restore();
    }
    for (const y of [-4, 0, 4]) { g.beginPath(); g.moveTo(-11, y); g.lineTo(-7.5, y); g.lineWidth = 1.2; g.strokeStyle = 'rgba(199,232,106,.8)'; g.stroke(); }
  },
  huntwave(g) { // a line of thorn pillars erupting toward the far rim
    emblem(g, LIME, '#2a3410');
    for (const [x, y, s] of [[-6, 6, 0.6], [-1.5, 1.5, 0.8], [3.5, -3.5, 1]]) {
      g.beginPath(); g.moveTo(x - 3.5 * s, y + 2); g.lineTo(x - 1 * s, y - 9 * s); g.lineTo(x + 0.6 * s, y - 4 * s); g.lineTo(x + 2 * s, y - 10 * s); g.lineTo(x + 3.5 * s, y + 2); g.closePath();
      ink(g, grad(g, y - 10, y + 2, '#e8ff9a', '#4a7a1a'), 1);
    }
    line(g, [[-9, 9], [9, -6]], 1, 'rgba(255,255,255,.5)');
  },
  // Penyihir Api
  firestorm(g) { // a spiralling column of fire
    emblem(g, FIRE, '#5a1608');
    for (let i = 0; i < 4; i++) {
      const y = 7 - i * 4.6, w = 3 + i * 1.6;
      g.beginPath(); g.ellipse(i % 2 ? 1 : -1, y, w, 1.8, 0, 0, TAU); g.lineWidth = 2.2; g.strokeStyle = i % 2 ? '#ffd36b' : '#ff7a2a'; g.stroke();
    }
    g.beginPath(); g.moveTo(0, -11); g.bezierCurveTo(4, -6, -3, -3, 1, 2); g.lineWidth = 1.4; g.strokeStyle = '#fff4b8'; g.stroke();
  },
  burnout(g) { // a burst of flame bursting from the core
    emblem(g, FIRE, '#5a1608');
    g.beginPath();
    for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU, r = i % 2 ? 4 : 10 - (i % 4 ? 0 : 1.5); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    g.closePath(); ink(g, grad(g, -10, 10, '#ffe27a', '#ff4a1a'), 1.2);
    dot(g, 0, 0, 3.2, '#fff4b8');
  },
  supernova(g) { // a white sun with a burning corona
    emblem(g, FIRE, '#7a2008', true);
    g.lineCap = 'round';
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU, r0 = 6, r1 = i % 2 ? 9 : 10.6; g.beginPath(); g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); g.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); g.lineWidth = 1.8; g.strokeStyle = i % 2 ? '#ff9a3c' : '#ffe27a'; g.stroke(); }
    const gr = g.createRadialGradient(-1, -1, 0, 0, 0, 6);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.5, '#fff1a0'); gr.addColorStop(1, '#ff7a2a');
    g.beginPath(); g.arc(0, 0, 5.6, 0, TAU); g.fillStyle = gr; g.fill(); g.lineWidth = 1; g.strokeStyle = OUT; g.stroke();
  },
  // Penyihir Waktu
  rewind(g) { // a clock with an arrow running backwards
    emblem(g, TIME, '#0e2a40');
    g.beginPath(); g.arc(0, 0, 6.5, 0, TAU); ink(g, grad(g, -6, 6, '#e8fbff', '#9fdcff'), 1.2);
    line(g, [[0, 0], [0, -4.5]], 1, OUT); line(g, [[0, 0], [-3, 1.5]], 1, OUT);
    g.beginPath(); g.arc(0, 0, 9.6, -0.4, -2.6, true); g.lineWidth = 1.8; g.strokeStyle = '#7fd8ff'; g.lineCap = 'round'; g.stroke();
    const a = -2.6, x = Math.cos(a) * 9.6, y = Math.sin(a) * 9.6;
    g.save(); g.translate(x, y); g.rotate(a - Math.PI / 2);
    g.beginPath(); g.moveTo(0, -3); g.lineTo(3, 1.5); g.lineTo(-3, 1.5); g.closePath(); ink(g, '#bff4ff', 0.8);
    g.restore();
  },
  timefield(g) { // an hourglass held in a bubble of slow time
    emblem(g, TIME, '#0e2a40');
    g.beginPath(); g.arc(0, 0, 9.5, 0, TAU); g.setLineDash([2, 2]); g.lineWidth = 1; g.strokeStyle = '#bff4ff'; g.stroke(); g.setLineDash([]);
    g.beginPath(); g.moveTo(-5, -7); g.lineTo(5, -7); g.lineTo(0.8, 0); g.lineTo(5, 7); g.lineTo(-5, 7); g.lineTo(-0.8, 0); g.closePath();
    ink(g, 'rgba(191,244,255,.4)', 1.2);
    g.beginPath(); g.moveTo(-3, -5); g.lineTo(3, -5); g.lineTo(0, -1); g.closePath(); g.fillStyle = '#ffe27a'; g.fill();
    g.beginPath(); g.moveTo(-3.6, 6); g.lineTo(3.6, 6); g.lineTo(0, 3); g.closePath(); g.fillStyle = '#ffe27a'; g.fill();
    g.fillStyle = '#8a5a34'; g.fillRect(-6, -8.6, 12, 1.8); g.fillRect(-6, 6.8, 12, 1.8);
  },
  timestop(g) { // a cracked clock face, its hands frozen, frost rays round it
    emblem(g, TIME, '#103a5a', true);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + 0.2; line(g, [[Math.cos(a) * 7, Math.sin(a) * 7], [Math.cos(a) * 10.2, Math.sin(a) * 10.2]], 1, '#e8fbff'); }
    g.beginPath(); g.arc(0, 0, 6.6, 0, TAU); ink(g, grad(g, -6, 6, '#ffffff', '#7fd8ff'), 1.2);
    g.beginPath(); g.moveTo(2, -6.4); g.lineTo(0.6, -2); g.lineTo(3, 0.5); g.lineTo(1.4, 6.4); g.lineWidth = 0.9; g.strokeStyle = OUT; g.stroke();
    line(g, [[0, 0], [-3.6, -3]], 0.9, '#2a6fd6'); line(g, [[0, 0], [0, 4]], 0.9, '#2a6fd6');
    dot(g, 0, 0, 1, OUT);
  },
  // Bayangan
  vanish(g) { // a hooded figure dissolving into smoke
    emblem(g, SHADE, '#1c0d2e');
    g.beginPath(); g.moveTo(-2, -9); g.quadraticCurveTo(6, -8, 6, 2); g.lineTo(6, 8); g.lineTo(-6, 8); g.lineTo(-6, 2); g.quadraticCurveTo(-7, -7, -2, -9); g.closePath();
    ink(g, grad(g, -9, 8, '#5a3a8a', '#1c0d2e'), 1.2);
    g.fillStyle = '#e9d8ff'; g.fillRect(-3, -3.5, 1.8, 1.2); g.fillRect(1, -3.5, 1.8, 1.2);
    for (const [x, y, r] of [[8, 6, 1.6], [9.5, 1.5, 1.2], [8.6, -3, 0.9], [-8.5, 5, 1.3]]) dot(g, x, y, r, 'rgba(176,107,255,.8)');
  },
  shadowstrike(g) { // a dagger lunging out of a violet streak
    emblem(g, SHADE, '#1c0d2e');
    for (const [y, l] of [[-3, 9], [1, 12], [5, 8]]) { g.beginPath(); g.moveTo(-11, y + 2); g.lineTo(-11 + l, y - 1); g.lineWidth = 1.6; g.strokeStyle = 'rgba(176,107,255,.8)'; g.lineCap = 'round'; g.stroke(); }
    g.save(); g.translate(1, 1); g.rotate(Math.PI / 4 + 0.3); blade(g, 12, 2.4); g.fillStyle = '#ff4d5e'; g.fillRect(-4, 0, 8, 2); g.fillStyle = '#3a2f4f'; g.fillRect(-1.2, 2, 2.4, 4); g.restore();
    glint(g, 7, -7, 2.6, '#e9d8ff');
  },
  shadoweclipse(g) { // a black sun with a violet corona, crossed blades over it
    emblem(g, SHADE, '#2a1048', true);
    const gr = g.createRadialGradient(0, 0, 4, 0, 0, 10);
    gr.addColorStop(0, 'rgba(233,216,255,1)'); gr.addColorStop(0.5, 'rgba(176,107,255,.7)'); gr.addColorStop(1, 'rgba(106,47,184,0)');
    g.beginPath(); g.arc(0, 0, 10, 0, TAU); g.fillStyle = gr; g.fill();
    g.beginPath(); g.arc(0, 0, 5.4, 0, TAU); g.fillStyle = '#05020a'; g.fill();
    for (const s of [-1, 1]) { g.save(); g.rotate(s * Math.PI / 4); g.translate(0, 7); blade(g, 14, 1.6, '#f4ecff'); g.restore(); }
  },
  // Penari Pedang
  bladevortex(g) { // four blades whirling round a pink core
    emblem(g, PINK, '#3a0a2e');
    g.beginPath(); g.arc(0, 0, 7.5, 0, TAU); g.lineWidth = 1; g.setLineDash([2.4, 2]); g.strokeStyle = '#ffb8ec'; g.stroke(); g.setLineDash([]);
    for (let i = 0; i < 4; i++) { g.save(); g.rotate((i * TAU) / 4 + 0.3); g.translate(7.5, 0); g.rotate(Math.PI); blade(g, 7, 1.5); g.restore(); }
    dot(g, 0, 0, 2.4, '#ff7ad9');
  },
  slashrain(g) { // slashes crossing like falling rain
    emblem(g, PINK, '#3a0a2e');
    for (const [x, y, l] of [[-5, -4, 9], [2, -6, 7], [5, 2, 9], [-3, 4, 7], [0, -1, 11]]) line(g, [[x - l / 2, y + l / 2], [x + l / 2, y - l / 2]], 1.4, x === 0 ? '#ffffff' : '#ffb8ec');
    glint(g, 6, -8, 2.2);
    glint(g, -8, 7, 1.8, '#ff7ad9');
  },
  thousandcuts(g) { // a rosette of six blades, the dance of cuts
    emblem(g, PINK, '#4a0e3a', true);
    for (let i = 0; i < 6; i++) { g.save(); g.rotate((i * TAU) / 6); blade(g, 10, 1.8, i % 2 ? '#ffe0f6' : '#ffffff'); g.restore(); }
    dot(g, 0, 0, 2.6, '#ff7ad9'); dot(g, 0, 0, 1.1, '#fff');
  },
};
