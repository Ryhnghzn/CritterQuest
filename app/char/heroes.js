// Three candidate hero styles drawn on the same skeleton (rig.js):
//  A — heroic, slim, face visible;  B — dark silhouette, glowing eyes & runes;
//  C — armoured knight / deep-hooded mage with Mythic gear.
// One drawing routine; the style config decides colours, head, cape and armour.
import { rig } from './rig.js';

const TAU = Math.PI * 2;
const MYTH = '#ff4d6d', GOLD = '#ffcf5a';

const STYLES = {
  A: {
    warrior: {
      out: '#120c16', skin: ['#e6b691', '#b27e5d'], hair: ['#3b2a22', '#1f1612'],
      cloth: ['#9a3030', '#5c1919'], pants: ['#3a2f3c', '#251d27'], leather: '#5a3a26',
      metal: ['#f0f3f8', '#a7afc0', '#5b6478'], trim: GOLD, accent: MYTH,
      head: 'face', torso: 'tunic', pauldron: 'round', cape: { c: ['#8e2228', '#4a0f14'], len: -8 }, legs: 'armor',
    },
    mage: {
      out: '#120c16', skin: ['#e6b691', '#b27e5d'], hair: ['#ecebf5', '#a9a6bf'],
      cloth: ['#4045a8', '#22256a'], pants: ['#2e2a3c', '#1d1a27'], leather: '#4a3326',
      metal: ['#f0f3f8', '#a7afc0', '#5b6478'], trim: GOLD, accent: MYTH, wood: ['#7a5236', '#3e2718'],
      head: 'faceLong', torso: 'robe', cape: null, legs: 'robe',
    },
  },
  B: {
    warrior: {
      out: '#07050a', rim: '#ff7a55', dark: true, eye: '#ff6a3d', skin: ['#1d1525', '#130d19'], hair: ['#1d1525', '#130d19'],
      cloth: ['#221a2d', '#140f1b'], pants: ['#1b1423', '#110c17'], leather: '#1a1320',
      metal: ['#2c2438', '#1e1828', '#120d18'], trim: '#3a2c3e', accent: MYTH,
      head: 'hornhelm', torso: 'tunic', pauldron: 'spike', cape: { c: ['#1e1628', '#0d0912'], len: -1, tatter: true }, legs: 'armor',
    },
    mage: {
      out: '#07050a', rim: '#a08cff', dark: true, eye: '#9f8bff', skin: ['#1d1525', '#130d19'], hair: ['#1d1525', '#130d19'],
      cloth: ['#211a30', '#130e1d'], pants: ['#1b1423', '#110c17'], leather: '#1a1320',
      metal: ['#2c2438', '#1e1828', '#120d18'], trim: '#352a48', accent: '#b06bff', wood: ['#241b2e', '#140f1b'],
      head: 'witchhat', torso: 'robe', tatter: true, cape: null, legs: 'robe',
    },
  },
  C: {
    warrior: {
      out: '#0e0a12', eye: '#ffb347', skin: ['#e6b691', '#b27e5d'], hair: ['#3b2a22', '#1f1612'],
      cloth: ['#7a1222', '#3e0812'], pants: ['#2a2430', '#17121b'], leather: '#3d2a20',
      metal: ['#dfe4ee', '#8a93a8', '#3a4154'], trim: '#f0b94a', accent: MYTH,
      head: 'greathelm', torso: 'plate', pauldron: 'big', cape: { c: ['#8a1426', '#3a0610'], len: -3, trimmed: true }, legs: 'armor',
    },
    mage: {
      out: '#0e0a12', eye: '#7fe6ff', skin: ['#e6b691', '#b27e5d'], hair: ['#3b2a22', '#1f1612'],
      cloth: ['#2b2456', '#151030'], pants: ['#221c33', '#140f1e'], leather: '#3d2a20', mantle: ['#5a2f72', '#2e1640'],
      metal: ['#dfe4ee', '#8a93a8', '#3a4154'], trim: '#f0b94a', accent: MYTH, wood: ['#3a2a3e', '#1c1220'],
      head: 'hood', torso: 'robe', mantleOn: true, cape: null, legs: 'robe', orbs: true,
    },
  },
};
export const STYLE_IDS = Object.keys(STYLES);
export const rimOf = (style, classId) => STYLES[style][classId].rim;

// ——— helpers ———
function fs(g, fill, out, lw = 1.2) {
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (out) { g.lineWidth = lw; g.strokeStyle = out; g.lineJoin = 'round'; g.stroke(); }
}
function lg(g, x0, y0, x1, y1, ...cs) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  cs.forEach((c, i) => gr.addColorStop(i / (cs.length - 1), c));
  return gr;
}
function seg(g, a, b, w1, w2) {
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  g.beginPath();
  g.arc(a.x, a.y, w1 / 2, ang + Math.PI / 2, ang + Math.PI * 1.5);
  g.arc(b.x, b.y, w2 / 2, ang - Math.PI / 2, ang + Math.PI / 2);
  g.closePath();
}
export function glow(g, x, y, r, c, a = 1) {
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.globalAlpha = a;
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  g.restore();
}
const mid = (a, b, k = 0.5) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });

// ——— parts ———
function leg(g, S, hip, knee, foot, back) {
  if (back) g.filter = 'brightness(0.68)';
  const [p0, p1] = S.pants;
  seg(g, hip, knee, 9.2, 7); fs(g, lg(g, hip.x, hip.y, knee.x, knee.y, p0, p1), S.out);
  seg(g, knee, foot, 7, 5.2); fs(g, p1, S.out);
  if (S.legs === 'armor') {
    seg(g, mid(knee, foot, 0.12), mid(knee, foot, 0.92), 7.8, 6.2);
    fs(g, lg(g, knee.x - 3, knee.y, knee.x + 3, knee.y, S.metal[0], S.metal[1], S.metal[2]), S.out);
    g.beginPath(); g.arc(knee.x + 0.8, knee.y, 3.7, 0, TAU); fs(g, S.metal[1], S.out);
  }
  // boot
  const x = foot.x, y = foot.y;
  g.save(); g.translate(x, y); g.scale(1.3, 1.25); g.translate(-x, -y);
  g.beginPath();
  g.moveTo(x - 2.8, y - 3.5); g.lineTo(x + 2.4, y - 3.8);
  g.quadraticCurveTo(x + 4.5, y - 1.8, x + 7, y + 0.6); g.lineTo(x + 7, y + 2.5); g.lineTo(x - 3.2, y + 2.5); g.closePath();
  fs(g, S.legs === 'armor' ? lg(g, x, y - 4, x, y + 2.5, S.metal[1], S.metal[2]) : S.leather, S.out);
  g.restore();
  g.filter = 'none';
}

function arm(g, S, sh, el, hand, back, armored) {
  if (back) g.filter = 'brightness(0.68)';
  const [c0, c1] = S.cloth;
  seg(g, sh, el, 7.2, 6); fs(g, lg(g, sh.x, sh.y, el.x, el.y, c0, c1), S.out);
  seg(g, el, hand, 6, 4.8); fs(g, c1, S.out);
  if (armored) { seg(g, mid(el, hand, 0.2), mid(el, hand, 0.95), 6.8, 5.8); fs(g, lg(g, el.x, el.y, hand.x, hand.y, S.metal[0], S.metal[2]), S.out); }
  g.beginPath(); g.arc(hand.x, hand.y, 3.2, 0, TAU);
  fs(g, armored ? S.metal[1] : S.skin[0], S.out);
  g.filter = 'none';
}

function cape(g, S, R) {
  const C = S.cape, t = R.t, mv = R.moving;
  const p1 = R.W(-5, -22.5), p2 = R.W(1, -23.5);
  const bottom = C.len + Math.sin(t * 2.4) * 0.8;
  const back = -10 - mv * 12 - Math.sin(t * 1.7) * 1.5;
  const w = (i) => Math.sin(t * 3.2 + i * 1.3) * (1.4 + mv * 1.6);
  g.beginPath();
  g.moveTo(p2.x, p2.y);
  g.quadraticCurveTo(p2.x - 1, -16, back + 7, bottom + w(0));
  if (C.tatter) {
    const n = 6;
    for (let i = 1; i <= n; i++) {
      const x = back + 7 - (i / n) * 15 - mv * 3 * (i / n), y = bottom + w(i) - (i % 2 ? -4.5 : 0) - (i / n) * 3;
      g.lineTo(x, y);
    }
  } else {
    g.quadraticCurveTo(back + 1, bottom + 2 + w(1), back - 7 - mv * 3, bottom - 2 + w(2));
  }
  g.quadraticCurveTo(back - 2, -20, p1.x, p1.y);
  g.closePath();
  fs(g, lg(g, 0, -24, 0, bottom, C.c[0], C.c[1]), S.out);
  if (C.trimmed) {
    g.beginPath(); g.moveTo(back + 7, bottom + w(0)); g.quadraticCurveTo(back + 1, bottom + 2 + w(1), back - 7 - mv * 3, bottom - 2 + w(2));
    g.lineWidth = 1.4; g.strokeStyle = S.trim; g.stroke();
  }
}

function pauldron(g, S, at, lean, back) {
  if (!S.pauldron) return;
  if (back) g.filter = 'brightness(0.68)';
  g.save(); g.translate(at.x + 0.4, at.y + 0.6); g.rotate(lean); g.scale(1.3, 1.3);
  const M = S.metal;
  if (S.pauldron === 'round') {
    g.beginPath(); g.ellipse(0, 0, 4.8, 3.9, -0.2, Math.PI, TAU * 1.02); g.lineTo(4.4, 2.6); g.quadraticCurveTo(0, 4.4, -4.6, 2.2); g.closePath();
    fs(g, lg(g, -4, -4, 4, 3, M[0], M[1], M[2]), S.out);
    g.beginPath(); g.ellipse(0, 0.6, 4.4, 3.2, -0.2, Math.PI * 1.05, TAU * 0.98); g.lineWidth = 0.9; g.strokeStyle = S.trim; g.stroke();
  } else if (S.pauldron === 'spike') {
    g.beginPath(); g.moveTo(-4.6, 2.6); g.quadraticCurveTo(-5, -3.6, 0, -4.2); g.lineTo(2, -10); g.lineTo(3.2, -3.6); g.quadraticCurveTo(5.4, -2, 4.8, 2.8); g.closePath();
    fs(g, lg(g, 0, -10, 0, 3, M[0], M[2]), S.out);
  } else { // big layered plates with spikes and a gem
    for (const [dy, sc] of [[3.8, 0.86], [1.6, 0.94], [-0.8, 1]]) {
      g.beginPath(); g.moveTo(-6.4 * sc, dy + 2); g.quadraticCurveTo(-6.6 * sc, dy - 5.6 * sc, 0, dy - 6 * sc); g.quadraticCurveTo(6.8 * sc, dy - 5.4 * sc, 6.4 * sc, dy + 2.4); g.quadraticCurveTo(0, dy + 0.6, -6.4 * sc, dy + 2); g.closePath();
      fs(g, lg(g, -6, dy - 6, 6, dy + 2, M[0], M[1], M[2]), S.out);
      g.beginPath(); g.moveTo(-6 * sc, dy + 1.4); g.quadraticCurveTo(0, dy, 6 * sc, dy + 1.8); g.lineWidth = 0.9; g.strokeStyle = S.trim; g.stroke();
    }
    for (const [x, h] of [[-2.8, 6], [1.4, 8]]) {
      g.beginPath(); g.moveTo(x - 1.6, -6); g.lineTo(x + 0.4, -6 - h); g.lineTo(x + 1.8, -6); g.closePath(); fs(g, lg(g, 0, -14, 0, -6, S.trim, M[2]), S.out, 0.9);
    }
    g.beginPath(); g.arc(0.4, -2.4, 1.5, 0, TAU); fs(g, S.accent, S.out, 0.6);
    glow(g, 0.4, -2.4, 5, S.accent, 0.7);
  }
  g.restore();
  g.filter = 'none';
}

// torso in the spine frame: origin = hip, up = −y, front = +x
function torso(g, S, R) {
  const [c0, c1] = S.cloth, M = S.metal, t = R.t;
  if (S.torso === 'robe') return robe(g, S, R);
  g.save(); g.translate(R.hip.x, R.hip.y); g.rotate(R.lean); g.scale(1.3, 1);
  // tunic
  g.beginPath(); g.moveTo(-6, -23); g.quadraticCurveTo(1, -25, 7.4, -22.5); g.quadraticCurveTo(8.4, -12, 5.8, -2); g.lineTo(-5.2, -2); g.quadraticCurveTo(-7.2, -12, -6, -23); g.closePath();
  fs(g, lg(g, 0, -24, 0, -2, c0, c1), S.out);
  if (S.torso === 'tunic') { // leather strap + small breastplate
    g.beginPath(); g.moveTo(-4.8, -22); g.lineTo(-2.2, -22.6); g.lineTo(6.6, -5.5); g.lineTo(4.2, -4.6); g.closePath(); fs(g, S.leather, S.out, 0.9);
    g.beginPath(); g.moveTo(0, -21.6); g.quadraticCurveTo(6.8, -22.4, 7.6, -15); g.quadraticCurveTo(7.2, -10, 3.2, -9.2); g.quadraticCurveTo(0, -13, 0, -21.6); g.closePath();
    fs(g, lg(g, 0, -22, 7, -9, M[0], M[1], M[2]), S.out);
  } else { // full plate
    g.beginPath(); g.moveTo(-5.6, -22.8); g.quadraticCurveTo(2, -25, 7.8, -22.2); g.quadraticCurveTo(9, -14, 6.4, -6.4); g.quadraticCurveTo(0, -5, -5.4, -6.4); g.quadraticCurveTo(-7, -14, -5.6, -22.8); g.closePath();
    fs(g, lg(g, -5, -24, 8, -6, M[0], M[1], M[2]), S.out);
    g.beginPath(); g.moveTo(1.4, -23.4); g.quadraticCurveTo(3.4, -15, 1.8, -6); g.lineWidth = 0.8; g.strokeStyle = 'rgba(255,255,255,.35)'; g.stroke();
    for (const y of [-17, -11]) { g.beginPath(); g.moveTo(-5.6, y); g.quadraticCurveTo(1.5, y + 1.6, 8, y - 0.8); g.lineWidth = 0.8; g.strokeStyle = S.trim; g.stroke(); }
    const p = 0.6 + 0.4 * Math.sin(t * 3);
    g.beginPath(); g.moveTo(4.6, -18.4); g.lineTo(6.6, -15.6); g.lineTo(4.6, -12.6); g.lineTo(2.6, -15.6); g.closePath(); fs(g, S.accent, S.out, 0.7);
    glow(g, 4.6, -15.6, 7, S.accent, 0.55 * p);
    // faulds
    for (const [y, w] of [[-4.6, 1], [-1.6, 0.94]]) {
      g.beginPath(); g.moveTo(-5.6 * w, y); g.lineTo(6.8 * w, y - 0.4); g.lineTo(7.2 * w, y + 3.4); g.lineTo(-6 * w, y + 3.6); g.closePath();
      fs(g, lg(g, 0, y, 0, y + 3.6, M[1], M[2]), S.out, 0.9);
    }
  }
  // belt + tabard
  g.beginPath(); g.rect(-5.6, -5.4, 12, 3); fs(g, S.leather, S.out, 0.9);
  g.beginPath(); g.rect(3, -5.8, 2.6, 3.8); fs(g, S.trim, S.out, 0.7);
  const sway = Math.sin(t * 3 + 1) * 0.8 - R.moving * 2;
  g.beginPath(); g.moveTo(0.4, -2.4); g.lineTo(6, -2.4); g.lineTo(5.6 + sway, 14); g.lineTo(3.2 + sway, 12.6); g.lineTo(0.8 + sway, 14); g.closePath();
  fs(g, lg(g, 0, -2, 0, 14, c0, c1), S.out, 0.9);
  if (S.dark) { g.beginPath(); g.moveTo(3.2, 0); g.lineTo(3.2 + sway, 10); g.lineWidth = 0.9; g.strokeStyle = S.accent; g.stroke(); glow(g, 3.2, 5, 5, S.accent, 0.4); }
  else { g.beginPath(); g.moveTo(1, 2); g.lineTo(5.6, 2); g.lineWidth = 0.8; g.strokeStyle = S.trim; g.stroke(); }
  g.restore();
}

function robe(g, S, R) {
  const [c0, c1] = S.cloth, W = R.W, t = R.t, mv = R.moving;
  const front = Math.max(R.fF.x, R.fB.x) + 6, back = Math.min(R.fF.x, R.fB.x) - 8 - mv * 3;
  const sh0 = W(-7.8, -23), sh1 = W(9.4, -22.5), w1 = W(7.6, -6), w0 = W(-7.6, -6);
  g.beginPath();
  g.moveTo(sh0.x, sh0.y); g.quadraticCurveTo(W(1, -25).x, W(1, -25).y, sh1.x, sh1.y);
  g.lineTo(w1.x, w1.y);
  g.quadraticCurveTo(front - 1, -12, front, -1);
  if (S.tatter) {
    const n = 7;
    for (let i = 1; i <= n; i++) {
      const x = front + (back - front) * (i / n), y = (i % 2 ? 3 : -1) + Math.sin(t * 3 + i) * 0.8;
      g.lineTo(x, y);
    }
  } else {
    g.quadraticCurveTo((front + back) / 2, 2 + Math.sin(t * 3) * 0.6, back, -1.4);
  }
  g.quadraticCurveTo(back + 1, -12, w0.x, w0.y);
  g.closePath();
  fs(g, lg(g, 0, -60, 0, 0, c0, c1), S.out);
  // front opening trim + sash
  const top = W(3.4, -22.6);
  g.beginPath(); g.moveTo(top.x, top.y); g.quadraticCurveTo(W(5.4, -8).x, W(5.4, -8).y, front - 2.5, -0.5);
  g.lineWidth = S.dark ? 0.9 : 1.4; g.strokeStyle = S.dark ? S.accent : S.trim; g.stroke();
  if (S.dark) glow(g, W(5, -10).x, W(5, -10).y, 6, S.accent, 0.35);
  const s0 = W(-7.8, -8.5), s1 = W(8.2, -8.5), s2 = W(8, -5.6), s3 = W(-7.8, -5.6);
  g.beginPath(); g.moveTo(s0.x, s0.y); g.lineTo(s1.x, s1.y); g.lineTo(s2.x, s2.y); g.lineTo(s3.x, s3.y); g.closePath();
  fs(g, S.dark ? S.trim : S.accent, S.out, 0.8);
  if (!S.dark) {
    const tail = W(-5.5, -6);
    g.beginPath(); g.moveTo(tail.x, tail.y); g.quadraticCurveTo(tail.x - 3 - mv * 3, tail.y + 6, tail.x - 2 - mv * 5 + Math.sin(t * 3) * 1, tail.y + 13);
    g.lineWidth = 2; g.strokeStyle = S.accent; g.stroke();
  }
  if (S.mantleOn) { // shoulder mantle with a gem clasp
    const M = S.mantle;
    const a = W(-9.6, -24.6), b = W(10.8, -23.4), c = W(11.4, -15), d = W(-10.4, -14.6);
    g.beginPath(); g.moveTo(a.x, a.y); g.quadraticCurveTo(W(1, -27).x, W(1, -27).y, b.x, b.y);
    g.quadraticCurveTo(W(12.4, -19).x, W(12.4, -19).y, c.x, c.y);
    for (let i = 1; i <= 4; i++) { const p = W(11.4 - i * 5.4, -15 + (i % 2 ? 2.2 : 0)); g.lineTo(p.x, p.y); }
    g.lineTo(d.x, d.y); g.closePath();
    fs(g, lg(g, 0, -64, 0, -50, M[0], M[1]), S.out);
    g.beginPath(); g.moveTo(c.x, c.y); for (let i = 1; i <= 4; i++) { const p = W(11.4 - i * 5.4, -15 + (i % 2 ? 2.2 : 0)); g.lineTo(p.x, p.y); }
    g.lineWidth = 1; g.strokeStyle = S.trim; g.stroke();
    const gm = W(5.4, -21.4);
    g.beginPath(); g.arc(gm.x, gm.y, 1.7, 0, TAU); fs(g, S.accent, S.out, 0.7);
    glow(g, gm.x, gm.y, 6, S.accent, 0.6);
  }
}

// head in the spine frame; (x, y) = head centre
function head(g, S, R) {
  g.save(); g.translate(R.hip.x, R.hip.y); g.rotate(R.lean * 0.6);
  const x = 1.8, y = -31.6, t = R.t, [k0, k1] = S.skin, [h0, h1] = S.hair;
  const face = () => {
    g.beginPath(); g.moveTo(x - 4.8, y + 1);
    g.bezierCurveTo(x - 5.8, y - 7.6, x + 5.2, y - 8.4, x + 5.3, y - 1.2);
    g.lineTo(x + 6, y + 1.3); g.lineTo(x + 5, y + 2.3);
    g.quadraticCurveTo(x + 4.6, y + 5.6, x + 1.6, y + 6.4); g.quadraticCurveTo(x - 2.6, y + 6, x - 4.8, y + 1); g.closePath();
    fs(g, lg(g, x - 4, y - 6, x + 3, y + 6, k0, k1), S.out);
    g.beginPath(); g.ellipse(x - 1, y + 0.6, 1.3, 1.8, 0, 0, TAU); fs(g, k1, S.out, 0.7);
    g.lineCap = 'round';
    g.beginPath(); g.moveTo(x + 2.4, y - 0.7); g.lineTo(x + 4.3, y - 0.5); g.lineWidth = 1.1; g.strokeStyle = '#1a1018'; g.stroke();
    g.beginPath(); g.moveTo(x + 1.5, y - 2.8); g.lineTo(x + 4.8, y - 1.8); g.lineWidth = 1; g.stroke();
    g.beginPath(); g.moveTo(x + 3.2, y + 3.7); g.lineTo(x + 4.6, y + 3.5); g.lineWidth = 0.6; g.stroke();
  };
  const eyes = (ex, ey, c, gap = 0) => {
    g.beginPath(); g.moveTo(ex - 1.3, ey); g.lineTo(ex + 1.3, ey - 0.3); g.lineWidth = 1.2; g.strokeStyle = '#fff'; g.lineCap = 'round'; g.stroke();
    glow(g, ex, ey, 4.5, c, 0.9);
    if (gap) { g.beginPath(); g.moveTo(ex - 1.3 - gap, ey - 0.2); g.lineTo(ex + 0.6 - gap, ey - 0.4); g.stroke(); glow(g, ex - gap, ey, 3, c, 0.6); }
  };
  // neck
  if (S.head === 'face' || S.head === 'faceLong') {
    g.beginPath(); g.rect(x - 2.6, y + 4, 4.4, 5); fs(g, k1, S.out, 0.9);
  }
  switch (S.head) {
    case 'face':
      face();
      g.beginPath(); g.moveTo(x + 5.2, y - 3.2); g.quadraticCurveTo(x + 4, y - 8.8, x - 1, y - 8.4);
      g.lineTo(x - 4, y - 9.8); g.lineTo(x - 4.4, y - 7.6); g.lineTo(x - 8.4, y - 7.6); g.lineTo(x - 6.2, y - 5.2);
      g.lineTo(x - 8.6, y - 3); g.lineTo(x - 5.6, y - 1.8); g.quadraticCurveTo(x - 5.2, y + 2.4, x - 3.6, y + 3.4);
      g.lineTo(x - 3, y - 1.4); g.quadraticCurveTo(x + 1, y - 4.8, x + 5.2, y - 3.2); g.closePath();
      fs(g, lg(g, x, y - 10, x, y + 3, h0, h1), S.out);
      break;
    case 'faceLong': {
      const sw = Math.sin(t * 2) * 0.8 - R.moving * 2;
      g.beginPath(); g.moveTo(x + 3, y - 7); g.quadraticCurveTo(x - 7, y - 9, x - 6.6, y + 2);
      g.quadraticCurveTo(x - 7.6 + sw, y + 10, x - 6 + sw, y + 15); g.lineTo(x - 1.6 + sw * 0.5, y + 12); g.lineTo(x - 1, y + 3); g.closePath();
      fs(g, lg(g, x, y - 8, x, y + 15, h0, h1), S.out);
      face();
      g.beginPath(); g.moveTo(x + 5.4, y - 2.6); g.quadraticCurveTo(x + 3, y - 9.2, x - 3, y - 7.6); g.quadraticCurveTo(x - 5.6, y - 6, x - 5, y - 1.4);
      g.quadraticCurveTo(x - 1, y - 5.4, x + 2.4, y - 3.2); g.quadraticCurveTo(x + 4, y - 4, x + 5.4, y - 2.6); g.closePath();
      fs(g, h0, S.out);
      g.beginPath(); g.moveTo(x - 5.4, y - 4.4); g.quadraticCurveTo(x, y - 6.2, x + 5.4, y - 4.2); g.lineWidth = 1.3; g.strokeStyle = S.trim; g.stroke();
      g.beginPath(); g.arc(x + 4.6, y - 4.3, 1.2, 0, TAU); fs(g, S.accent, S.out, 0.6); glow(g, x + 4.6, y - 4.3, 4, S.accent, 0.7);
      break;
    }
    case 'hornhelm': {
      g.beginPath(); g.moveTo(x - 5.6, y + 5); g.lineTo(x - 6, y - 2); g.quadraticCurveTo(x - 5.6, y - 9, x, y - 9.2); g.quadraticCurveTo(x + 6, y - 9, x + 6.2, y - 2);
      g.lineTo(x + 6.6, y + 3); g.lineTo(x + 4, y + 6.4); g.quadraticCurveTo(x - 1, y + 7, x - 5.6, y + 5); g.closePath();
      fs(g, lg(g, x, y - 9, x, y + 7, S.metal[0], S.metal[2]), S.out);
      for (const s of [-1, 1]) {
        g.beginPath(); g.moveTo(x + s * 1.8 - 1, y - 7.6); g.quadraticCurveTo(x + s * 9 - 2, y - 9, x + s * 8 - 3, y - 18); g.quadraticCurveTo(x + s * 5.6 - 2, y - 11.6, x + s * 4.4 - 1, y - 6.2); g.closePath();
        fs(g, lg(g, x, y - 18, x, y - 6, '#3a2c40', '#140f1a'), S.out, 1);
      }
      g.beginPath(); g.rect(x + 1.6, y - 1.6, 5, 1.8); fs(g, '#05030a', null);
      eyes(x + 4.4, y - 0.8, S.eye, 2.6);
      break;
    }
    case 'witchhat': {
      g.beginPath(); g.ellipse(x, y, 5.2, 6.4, 0, 0, TAU); fs(g, S.skin[0], S.out);
      eyes(x + 3.4, y - 0.4, S.eye, 2.4);
      const sw = Math.sin(t * 2) * 1.5 - R.moving * 3;
      g.beginPath(); g.moveTo(x - 6, y - 5.4); g.quadraticCurveTo(x - 1, y - 14, x - 4 + sw, y - 21); g.lineTo(x - 11 + sw, y - 23 + Math.sin(t * 2.5)); g.quadraticCurveTo(x - 1 + sw, y - 18, x + 6, y - 5.6); g.closePath();
      fs(g, lg(g, x, y - 23, x, y - 5, S.cloth[0], S.cloth[1]), S.out);
      g.beginPath(); g.ellipse(x + 0.6, y - 5.4, 12.4, 2.6, -0.06, 0, TAU); fs(g, S.cloth[1], S.out);
      g.beginPath(); g.moveTo(x - 5.6, y - 7); g.quadraticCurveTo(x, y - 8.6, x + 5.8, y - 7.2); g.lineWidth = 1.1; g.strokeStyle = S.accent; g.stroke();
      glow(g, x, y - 7.6, 6, S.accent, 0.4);
      break;
    }
    case 'greathelm': {
      const M = S.metal;
      g.beginPath(); g.moveTo(x - 5.8, y + 6.4); g.lineTo(x - 6.4, y - 3); g.quadraticCurveTo(x - 6.2, y - 9.8, x, y - 9.9);
      g.quadraticCurveTo(x + 6.6, y - 9.6, x + 6.8, y - 2.5); g.lineTo(x + 6.8, y + 6.2); g.quadraticCurveTo(x + 1, y + 7.8, x - 5.8, y + 6.4); g.closePath();
      fs(g, lg(g, x - 6, y - 9, x + 7, y + 6, M[0], M[1], M[2]), S.out);
      g.beginPath(); g.moveTo(x + 2.6, y - 9.6); g.lineTo(x + 2.6, y + 7); g.lineWidth = 0.9; g.strokeStyle = 'rgba(255,255,255,.4)'; g.stroke();
      g.beginPath(); g.moveTo(x - 6.4, y - 3.4); g.quadraticCurveTo(x, y - 4.4, x + 6.8, y - 3.4); g.lineWidth = 1; g.strokeStyle = S.trim; g.stroke();
      g.beginPath(); g.rect(x + 1.6, y - 1.8, 5.2, 1.5); g.rect(x + 3.8, y - 1.8, 1.4, 5.6); fs(g, '#05030a', null);
      const p = 0.75 + 0.25 * Math.sin(t * 4);
      g.fillStyle = S.eye; g.globalAlpha = p; g.fillRect(x + 1.8, y - 1.5, 4.8, 0.9); g.globalAlpha = 1;
      glow(g, x + 4.4, y - 1, 6, S.eye, 0.8 * p);
      for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(x + 5.6, y + 2 + i * 1.4, 0.35, 0, TAU); g.fillStyle = '#05030a'; g.fill(); }
      // Mythic crown of horns
      for (const [bx, h, lean] of [[-4.2, 8, -0.5], [-0.6, 10, -0.15], [3, 8, 0.2]]) {
        g.save(); g.translate(x + bx, y - 8.6); g.rotate(lean);
        g.beginPath(); g.moveTo(-1.4, 0.6); g.quadraticCurveTo(-0.6, -h * 0.6, 0.6, -h); g.quadraticCurveTo(0.8, -h * 0.5, 1.6, 0.6); g.closePath();
        fs(g, lg(g, 0, -h, 0, 0, '#ffe6a0', S.trim, '#8a5a1a'), S.out, 0.9);
        g.restore();
      }
      glow(g, x - 0.6, y - 16, 7, S.accent, 0.35 + 0.15 * Math.sin(t * 3));
      break;
    }
    case 'hood': {
      const [m0, m1] = S.mantle, sw = Math.sin(t * 2) * 0.6 - R.moving * 1.5;
      g.beginPath(); g.moveTo(x + 6.8, y + 6.4); g.quadraticCurveTo(x + 8.4, y - 6, x + 2, y - 10.6);
      g.quadraticCurveTo(x - 4.6, y - 11.4, x - 9, y - 6); g.lineTo(x - 13 + sw, y - 1 + sw * 0.3);
      g.quadraticCurveTo(x - 8.6, y + 3, x - 7, y + 9); g.lineTo(x + 6.8, y + 6.4); g.closePath();
      fs(g, lg(g, x, y - 11, x, y + 9, m0, m1), S.out);
      g.beginPath(); g.ellipse(x + 3.6, y + 0.8, 3.7, 5.6, 0.08, 0, TAU); fs(g, '#05030a', null);
      g.beginPath(); g.ellipse(x + 3.6, y + 0.8, 3.7, 5.6, 0.08, -1.9, 1.9); g.lineWidth = 1.1; g.strokeStyle = S.trim; g.stroke();
      const p = 0.7 + 0.3 * Math.sin(t * 3.5);
      for (const ex of [x + 4.7, x + 2.6]) { g.beginPath(); g.arc(ex, y - 0.3, 0.75, 0, TAU); g.fillStyle = '#fff'; g.fill(); glow(g, ex, y - 0.3, 3.6, S.eye, p); }
      break;
    }
  }
  g.restore();
}

function sword(g, S, R) {
  const h = R.hF, dir = Math.atan2(Math.cos(R.psi), Math.sin(R.psi)), t = R.t, big = S.head === 'greathelm' ? 1.12 : 1;
  g.save(); g.translate(h.x, h.y); g.rotate(dir); g.scale(big, big);
  const M = S.metal, p = 0.7 + 0.3 * Math.sin(t * 5);
  for (let i = 0; i < 4; i++) glow(g, 10 + i * 8, 0, 8, S.accent, 0.28 * p);
  g.beginPath(); g.arc(-5.2, 0, 1.8, 0, TAU); fs(g, S.trim, S.out, 0.8);
  seg(g, { x: -4.2, y: 0 }, { x: 3, y: 0 }, 2.6, 2.6); fs(g, S.leather, S.out, 0.8);
  g.beginPath(); g.moveTo(5.2, -2.3); g.lineTo(33, -2.5); g.lineTo(39.5, 0); g.lineTo(33, 2.5); g.lineTo(5.2, 2.3); g.closePath();
  fs(g, lg(g, 0, -2.5, 0, 2.5, M[0], M[1], M[2]), S.out, 1);
  g.save(); g.globalCompositeOperation = 'lighter';
  g.beginPath(); g.moveTo(7, 0); g.lineTo(32, 0); g.lineWidth = 0.9; g.strokeStyle = S.accent; g.stroke();
  for (let i = 0; i < 5; i++) {
    const rx = 10 + i * 4.6;
    g.beginPath(); g.moveTo(rx - 1, -1); g.lineTo(rx, 0.9); g.lineTo(rx + 1, -1); g.lineWidth = 0.6; g.strokeStyle = `rgba(255,220,160,${0.5 + 0.5 * Math.sin(t * 4 - i)})`; g.stroke();
  }
  if (S.dark) { g.beginPath(); g.moveTo(5.2, -2.3); g.lineTo(33, -2.5); g.lineTo(39.5, 0); g.lineWidth = 0.9; g.strokeStyle = S.accent; g.stroke(); }
  g.restore();
  g.beginPath(); g.moveTo(3, -1.3); g.lineTo(4.6, -7); g.lineTo(6.4, -5.8); g.lineTo(5.4, -1.3); g.lineTo(5.4, 1.3); g.lineTo(6.4, 5.8); g.lineTo(4.6, 7); g.lineTo(3, 1.3); g.closePath();
  fs(g, lg(g, 0, -7, 0, 7, '#ffe6a0', S.trim, '#7a4c14'), S.out, 0.9);
  g.beginPath(); g.arc(4.2, 0, 1.3, 0, TAU); fs(g, S.accent, null); glow(g, 4.2, 0, 4, S.accent, 0.8);
  g.restore();
}

function staff(g, S, R) {
  const h = R.hF, dir = Math.atan2(Math.cos(R.psi), Math.sin(R.psi)), t = R.t;
  g.save(); g.translate(h.x, h.y); g.rotate(dir);
  const [w0, w1] = S.wood;
  seg(g, { x: -27, y: 0 }, { x: 28, y: 0 }, 2.2, 2.6); fs(g, lg(g, 0, -1.3, 0, 1.3, w0, w1), S.out, 0.9);
  for (const bx of [-14, 2, 16]) { g.beginPath(); g.rect(bx, -1.7, 2, 3.4); fs(g, S.trim, S.out, 0.6); }
  for (const s of [-1, 1]) {
    g.beginPath(); g.moveTo(27, s * 1.2); g.quadraticCurveTo(31, s * 7, 38.5, s * 3.2); g.quadraticCurveTo(32.5, s * 4.2, 28.6, s * 0.4); g.closePath();
    fs(g, lg(g, 27, 0, 38, 0, S.trim, '#7a4c14'), S.out, 0.8);
  }
  const p = 0.75 + 0.25 * Math.sin(t * 4) + R.cast * 0.8;
  glow(g, 33, 0, 11 * p + R.cast * 10, S.accent, 0.8);
  g.beginPath(); g.arc(33, 0, 3.8, 0, TAU); fs(g, lg(g, 31, -3, 35, 3, '#ffffff', S.accent), S.out, 0.8);
  g.save(); g.globalCompositeOperation = 'lighter';
  g.beginPath(); g.ellipse(33, 0, 7.4, 2.2, t * 2, 0, TAU); g.lineWidth = 0.8; g.strokeStyle = S.dark ? S.accent : GOLD; g.stroke();
  g.restore();
  if (R.cast > 0.05) {
    g.save(); g.globalCompositeOperation = 'lighter';
    g.beginPath(); g.arc(33, 0, 6 + (1 - R.cast) * 18, 0, TAU); g.lineWidth = 2 * R.cast; g.strokeStyle = S.accent; g.stroke();
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + t * 3; glow(g, 33 + Math.cos(a) * 9 * R.cast, Math.sin(a) * 9 * R.cast, 3, '#fff1c0', R.cast); }
    g.restore();
  }
  g.restore();
}

function slashFx(g, S, R) {
  const sl = R.slash;
  if (!sl) return;
  const s = R.sF, n = 18;
  const a0 = sl.to, a1 = Math.min(sl.from, sl.to + 1.7);
  const pt = (phi, r) => [s.x + Math.sin(phi) * r, s.y + Math.cos(phi) * r];
  g.save(); g.globalCompositeOperation = 'lighter';
  for (const [rIn, rOut, col, al] of [[36, 60, S.accent, 0.3], [49, 58, '#ffe6c0', 0.6]]) {
    g.beginPath();
    for (let i = 0; i <= n; i++) { const [x, y] = pt(a0 + (a1 - a0) * (i / n), rOut - (i / n) * 6); i ? g.lineTo(x, y) : g.moveTo(x, y); }
    for (let i = n; i >= 0; i--) { const k = i / n; const [x, y] = pt(a0 + (a1 - a0) * k, rOut - (rOut - rIn) * (0.25 + 0.75 * k) - (i / n) * 6); g.lineTo(x, y); }
    g.closePath(); g.globalAlpha = al * sl.fade; g.fillStyle = col; g.fill();
  }
  g.restore();
}

function motes(g, S, R, n = 7) {
  for (let i = 0; i < n; i++) {
    const ph = (R.t * 0.4 + i / n) % 1;
    glow(g, Math.sin(i * 7.3 + R.t * 1.2) * 13, -4 - ph * 72, 2.6 * (1 - ph * 0.5), i % 2 ? GOLD : S.accent, (1 - ph) * 0.85);
  }
}

export function drawHero(g, style, classId, pose) {
  const S = STYLES[style][classId], R = rig(classId, pose);
  g.lineJoin = 'round'; g.lineCap = 'round';
  if (S.cape) cape(g, S, R);
  arm(g, S, R.sB, R.eB, R.hB, true, S.legs === 'armor' && style !== 'A');
  if (classId === 'mage' && R.cast > 0) glow(g, R.hB.x, R.hB.y, 9 * R.cast, S.accent, 0.8);
  pauldron(g, S, R.sB, R.lean, true);
  leg(g, S, R.hipB, R.kB, R.fB, true);
  leg(g, S, R.hipF, R.kF, R.fF, false);
  torso(g, S, R);
  head(g, S, R);
  if (classId === 'warrior') sword(g, S, R); else staff(g, S, R);
  arm(g, S, R.sF, R.eF, R.hF, false, S.legs === 'armor' && style !== 'A');
  pauldron(g, S, R.sF, R.lean, false);
  if (S.orbs) for (let i = 0; i < 3; i++) {
    const a = R.t * 1.4 + (i / 3) * TAU, x = Math.cos(a) * 14, y = -44 + Math.sin(a) * 4;
    if (Math.sin(a) > 0) { glow(g, x, y, 6, S.accent, 0.8); g.beginPath(); g.arc(x, y, 1.4, 0, TAU); g.fillStyle = '#fff'; g.fill(); }
  }
  slashFx(g, S, R);
  motes(g, S, R);
}
