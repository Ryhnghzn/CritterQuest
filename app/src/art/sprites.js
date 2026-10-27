// Vector cartoon art for everything except the player (see doll.js): enemies,
// pickups, ground decor and icons. Shapes are drawn in world units around the
// origin; bakeAll(scale) renders them to offscreen canvases at the current
// device scale and is re-run when the screen size changes.
import { POTIONS } from '../data/potions.js';

export const OUT = '#2a2140'; // shared outline colour

const TAU = Math.PI * 2;

function grad(g, y0, y1, c0, c1) {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, c0); gr.addColorStop(1, c1);
  return gr;
}
function ellipse(g, x, y, rx, ry, rot = 0) { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); }
function ink(g, fill, lw) { g.fillStyle = fill; g.fill(); g.lineWidth = lw; g.strokeStyle = OUT; g.stroke(); }
function shine(g, x, y, rx, ry, rot = -0.5, a = 0.5) {
  ellipse(g, x, y, rx, ry, rot);
  g.fillStyle = `rgba(255,255,255,${a})`; g.fill();
}
function eye(g, x, y, r, look = 0.25, iris = OUT) {
  ellipse(g, x, y, r * 0.8, r);
  g.fillStyle = '#fff'; g.fill(); g.lineWidth = r * 0.35; g.strokeStyle = OUT; g.stroke();
  g.beginPath(); g.arc(x + r * look, y + r * 0.1, r * 0.48, 0, TAU); g.fillStyle = iris; g.fill();
  g.beginPath(); g.arc(x + r * look - r * 0.15, y - r * 0.15, r * 0.16, 0, TAU); g.fillStyle = '#fff'; g.fill();
}
function brow(g, x0, y0, x1, y1, w) {
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1);
  g.lineCap = 'round'; g.lineWidth = w; g.strokeStyle = OUT; g.stroke();
}

// potion flask in the potion's colours; big = taller neck + star
function flask(g, p, big) {
  const k = big ? 1.12 : 1;
  g.save(); g.scale(k, k);
  g.beginPath(); g.roundRect(-3, -11, 6, 6, 1.5); ink(g, '#c8874e', 1.3);
  g.beginPath(); g.moveTo(-3, -5); g.lineTo(-3, -3); g.arc(0, 4, 8, -Math.PI / 2 - 0.38, Math.PI * 1.5 + 0.38); g.lineTo(3, -5); g.closePath();
  ink(g, grad(g, -4, 12, p.light, p.color), 1.5);
  shine(g, -3, 1, 2, 3.2, 0.3, 0.6);
  if (big) {
    g.beginPath();
    for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU - Math.PI / 2, r = i % 2 ? 1.6 : 3.6; g.lineTo(2.5 + Math.cos(a) * r, 5 + Math.sin(a) * r); }
    g.closePath(); g.fillStyle = '#fff6c2'; g.fill();
  }
  g.restore();
}

// ——— enemies: drawn facing right at radius r ———
export const ENEMY_ART = {
  slink(g, r) {
    g.beginPath();
    g.moveTo(-r, r * 0.55);
    g.bezierCurveTo(-r * 1.08, -r * 0.45, -r * 0.55, -r * 1.08, 0, -r * 1.02);
    g.bezierCurveTo(r * 0.55, -r * 1.08, r * 1.08, -r * 0.45, r, r * 0.55);
    g.quadraticCurveTo(r * 0.5, r * 0.85, 0, r * 0.62);
    g.quadraticCurveTo(-r * 0.5, r * 0.85, -r, r * 0.55);
    ink(g, grad(g, -r, r, '#b69cff', '#6a3fd6'), r * 0.14);
    shine(g, -r * 0.42, -r * 0.55, r * 0.26, r * 0.13);
    eye(g, r * 0.05, -r * 0.12, r * 0.24);
    eye(g, r * 0.55, -r * 0.12, r * 0.24);
    brow(g, -r * 0.18, -r * 0.5, r * 0.22, -r * 0.4, r * 0.12);
    brow(g, r * 0.4, -r * 0.4, r * 0.78, -r * 0.5, r * 0.12);
  },
  dart(g, r) {
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(s * r * 0.45, -r * 0.3);
      g.quadraticCurveTo(s * r * 1.5, -r * 1.05, s * r * 1.65, -r * 0.05);
      g.quadraticCurveTo(s * r * 1.3, -r * 0.1, s * r * 1.2, r * 0.3);
      g.quadraticCurveTo(s * r * 0.95, r * 0.05, s * r * 0.5, r * 0.3);
      ink(g, '#8a2f1c', r * 0.14);
    }
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(s * r * 0.25, -r * 0.6); g.lineTo(s * r * 0.5, -r * 1.15); g.lineTo(s * r * 0.65, -r * 0.45);
      ink(g, '#f0712f', r * 0.12);
    }
    ellipse(g, 0, 0, r * 0.78, r * 0.75);
    ink(g, grad(g, -r, r, '#ffb15c', '#e2541d'), r * 0.14);
    shine(g, -r * 0.3, -r * 0.4, r * 0.2, r * 0.11);
    eye(g, r * 0.0, -r * 0.08, r * 0.24, 0.3, '#3b1d0e');
    eye(g, r * 0.42, -r * 0.08, r * 0.24, 0.3, '#3b1d0e');
    g.beginPath(); g.moveTo(r * 0.1, r * 0.35); g.lineTo(r * 0.18, r * 0.52); g.lineTo(r * 0.26, r * 0.35);
    g.fillStyle = '#fff'; g.fill();
  },
  tank(g, r) {
    for (const x of [-0.55, 0.05, 0.6]) { ellipse(g, x * r, r * 0.78, r * 0.2, r * 0.14); ink(g, '#2b3245', r * 0.08); }
    g.beginPath();
    g.moveTo(-r, r * 0.6);
    g.bezierCurveTo(-r * 1.05, -r * 0.7, -r * 0.4, -r * 0.98, r * 0.15, -r * 0.95);
    g.bezierCurveTo(r * 0.85, -r * 0.9, r * 1.05, -r * 0.2, r, r * 0.6);
    g.quadraticCurveTo(0, r * 0.85, -r, r * 0.6);
    ink(g, grad(g, -r, r, '#8a98b4', '#3d4760'), r * 0.1);
    g.lineWidth = r * 0.07; g.strokeStyle = 'rgba(42,33,64,.55)';
    g.beginPath(); g.arc(-r * 0.15, r * 0.9, r * 1.15, -2.2, -1.05); g.stroke();
    g.beginPath(); g.arc(-r * 0.5, r * 0.4, r * 0.55, -2.4, -0.9); g.stroke();
    shine(g, -r * 0.45, -r * 0.55, r * 0.22, r * 0.1, -0.4, 0.35);
    g.beginPath(); g.moveTo(r * 0.15, -r * 0.88); g.quadraticCurveTo(r * 0.45, -r * 1.45, r * 0.75, -r * 1.25);
    g.quadraticCurveTo(r * 0.5, -r * 1.05, r * 0.55, -r * 0.8);
    ink(g, '#f1f5f9', r * 0.07);
    for (const x of [0.35, 0.7]) {
      ellipse(g, x * r, -r * 0.15, r * 0.11, r * 0.08);
      g.fillStyle = '#ff5f6d'; g.shadowColor = '#ff5f6d'; g.shadowBlur = r * 0.4; g.fill(); g.shadowBlur = 0;
    }
  },
  boss(g, r) {
    g.beginPath();
    g.moveTo(-r, r * 0.6);
    g.bezierCurveTo(-r * 1.1, -r * 0.55, -r * 0.55, -r * 1.0, 0, -r * 0.95);
    g.bezierCurveTo(r * 0.55, -r * 1.0, r * 1.1, -r * 0.55, r, r * 0.6);
    g.quadraticCurveTo(r * 0.5, r * 0.9, 0, r * 0.7);
    g.quadraticCurveTo(-r * 0.5, r * 0.9, -r, r * 0.6);
    ink(g, grad(g, -r, r, '#8f4dff', '#3a0d78'), r * 0.09);
    shine(g, -r * 0.45, -r * 0.55, r * 0.25, r * 0.11, -0.5, 0.35);
    // crown
    g.beginPath();
    g.moveTo(-r * 0.45, -r * 0.82);
    g.lineTo(-r * 0.55, -r * 1.35); g.lineTo(-r * 0.22, -r * 1.08); g.lineTo(0, -r * 1.45);
    g.lineTo(r * 0.22, -r * 1.08); g.lineTo(r * 0.55, -r * 1.35); g.lineTo(r * 0.45, -r * 0.82);
    g.closePath();
    ink(g, grad(g, -r * 1.45, -r * 0.8, '#ffe27a', '#f0a91a'), r * 0.06);
    for (const x of [-0.55, 0, 0.55]) {
      g.beginPath(); g.arc(x * r, -r * (x === 0 ? 1.45 : 1.35), r * 0.07, 0, TAU); g.fillStyle = '#ff5f9e'; g.fill();
    }
    // mouth with teeth
    ellipse(g, r * 0.12, r * 0.28, r * 0.5, r * 0.26);
    ink(g, '#5c0f2e', r * 0.06);
    g.fillStyle = '#fff';
    for (let i = 0; i < 5; i++) {
      const x = r * (-0.28 + i * 0.2);
      g.beginPath(); g.moveTo(x - r * 0.07, r * 0.07); g.lineTo(x, r * 0.22); g.lineTo(x + r * 0.07, r * 0.07); g.fill();
    }
    for (const x of [-0.18, 0.42]) {
      ellipse(g, x * r, -r * 0.3, r * 0.14, r * 0.17);
      g.fillStyle = '#ff4d6d'; g.shadowColor = '#ff4d6d'; g.shadowBlur = r * 0.35; g.fill(); g.shadowBlur = 0;
      g.beginPath(); g.arc(x * r - r * 0.04, -r * 0.35, r * 0.05, 0, TAU); g.fillStyle = '#fff'; g.fill();
    }
    brow(g, -r * 0.4, -r * 0.62, r * 0.0, -r * 0.45, r * 0.08);
    brow(g, r * 0.25, -r * 0.45, r * 0.65, -r * 0.62, r * 0.08);
  },
};

// ——— pickups (centered, world units) ———
export const PICKUP_ART = {
  gem(g) { diamond(g, 1, '#8ff3ff', '#10a5c9'); },
  bigGem(g) { diamond(g, 1.45, '#f6a8ff', '#b02fd6'); },
  heart(g) {
    g.beginPath();
    g.moveTo(0, 6);
    g.bezierCurveTo(-8, 0, -6.5, -7, 0, -3.2);
    g.bezierCurveTo(6.5, -7, 8, 0, 0, 6);
    ink(g, grad(g, -6, 6, '#ff8aa3', '#e8264f'), 1.3);
    shine(g, -2.8, -2.8, 1.6, 0.9, -0.6, 0.7);
  },
  coin(g) {
    ellipse(g, 0, 0, 5.2, 5.2);
    ink(g, grad(g, -5, 5, '#fff1b3', '#e09a10'), 1.3);
    ellipse(g, 0, 0, 3, 3);
    g.lineWidth = 1; g.strokeStyle = 'rgba(122,74,0,.7)'; g.stroke();
    shine(g, -1.8, -2, 1.4, 0.8, -0.6, 0.8);
  },
};
function diamond(g, k, c0, c1) {
  g.beginPath();
  g.moveTo(0, -6 * k); g.lineTo(4.6 * k, -1 * k); g.lineTo(0, 6 * k); g.lineTo(-4.6 * k, -1 * k); g.closePath();
  ink(g, grad(g, -6 * k, 6 * k, c0, c1), 1.2);
  g.beginPath(); g.moveTo(-4.6 * k, -1 * k); g.lineTo(4.6 * k, -1 * k);
  g.lineWidth = 0.6; g.strokeStyle = 'rgba(255,255,255,.55)'; g.stroke();
  shine(g, -1.6 * k, -2.6 * k, 1.1 * k, 0.6 * k, -0.8, 0.8);
}

// ——— ground decor ———
const FLOWER = { flowerW: '#ffffff', flowerP: '#ff9ccf', flowerY: '#ffe169' };
export const DECOR_ART = {
  tuft(g) {
    g.fillStyle = '#2f8a51';
    for (const [x, h, lean] of [[-3, 7, -2], [0, 9, 0.5], [3, 6, 2.5]]) {
      g.beginPath(); g.moveTo(x - 1.4, 0); g.quadraticCurveTo(x + lean * 0.3, -h * 0.6, x + lean, -h);
      g.quadraticCurveTo(x + lean * 0.2, -h * 0.4, x + 1.4, 0); g.fill();
    }
  },
  stone(g) {
    ellipse(g, 0, 0, 6, 4); ink(g, grad(g, -4, 4, '#c3c9d9', '#7f879e'), 1.1);
    shine(g, -2, -1.6, 2, 0.8, -0.2, 0.6);
  },
  bush(g) {
    g.beginPath();
    for (const [x, y, rr] of [[-5, 0, 5], [5, 0, 5], [0, -4, 6.5]]) { g.moveTo(x + rr, y); g.arc(x, y, rr, 0, TAU); }
    g.fillStyle = OUT; g.save(); g.lineWidth = 2.4; g.strokeStyle = OUT; g.stroke(); g.restore();
    g.fillStyle = grad(g, -10, 5, '#5fd07f', '#2f8a51'); g.fill();
    shine(g, -1.5, -7, 2.4, 1.1, -0.3, 0.45);
  },
};
for (const [id, col] of Object.entries(FLOWER)) {
  DECOR_ART[id] = (g) => {
    g.strokeStyle = '#2f8a51'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -4); g.stroke();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      g.beginPath(); g.arc(Math.cos(a) * 2.4, -6 + Math.sin(a) * 2.4, 1.9, 0, TAU);
      g.fillStyle = col; g.fill(); g.lineWidth = 0.6; g.strokeStyle = 'rgba(42,33,64,.45)'; g.stroke();
    }
    g.beginPath(); g.arc(0, -6, 1.4, 0, TAU); g.fillStyle = '#ffb627'; g.fill();
  };
}

// ——— icons: drawn inside a box of `size` centred on the origin ———
const ICONS = {
  ember(g) {
    g.beginPath(); g.moveTo(0, -10);
    g.bezierCurveTo(7, -3, 8, 3, 0, 9); g.bezierCurveTo(-8, 3, -7, -3, 0, -10);
    ink(g, grad(g, -10, 9, '#ffd36b', '#ff5a2a'), 1.6);
    g.beginPath(); g.moveTo(0, -2); g.bezierCurveTo(3.5, 1, 3.5, 4, 0, 7); g.bezierCurveTo(-3.5, 4, -3.5, 1, 0, -2);
    g.fillStyle = '#fff4b8'; g.fill();
  },
  bubble(g) {
    for (const [x, y, r] of [[-3, 2, 6], [5, -4, 4], [5, 6, 2.6]]) {
      g.beginPath(); g.arc(x, y, r, 0, TAU);
      g.fillStyle = 'rgba(128,220,255,.45)'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = '#4cc3ff'; g.stroke();
      shine(g, x - r * 0.35, y - r * 0.35, r * 0.3, r * 0.18, -0.6, 0.9);
    }
  },
  gale(g) {
    for (const s of [0, Math.PI]) {
      g.save(); g.rotate(s);
      g.beginPath(); g.moveTo(-1, -1); g.quadraticCurveTo(4, -11, 10, -6); g.quadraticCurveTo(5, -3, -1, -1);
      ink(g, grad(g, -10, 0, '#d4ff8a', '#4cbf55'), 1.4);
      g.restore();
    }
    g.beginPath(); g.arc(0, 0, 2.4, 0, TAU); ink(g, '#eaffc4', 1.2);
  },
  zap(g) {
    g.beginPath();
    g.moveTo(2, -11); g.lineTo(-6, 1); g.lineTo(-0.5, 1); g.lineTo(-3, 11); g.lineTo(6, -2); g.lineTo(0.5, -2); g.closePath();
    ink(g, grad(g, -11, 11, '#fff59a', '#ffbf1f'), 1.5);
  },
  thorn(g) {
    g.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU, r = i % 2 ? 6 : 10.5;
      g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath(); ink(g, grad(g, -10, 10, '#a8f07a', '#2f9a4e'), 1.4);
    g.beginPath(); g.arc(0, 0, 3.4, 0, TAU); ink(g, '#ffe169', 1.2);
  },
  heart(g) { g.save(); g.scale(1.45, 1.45); g.translate(0, 0.6); PICKUP_ART.heart(g); g.restore(); },
  spd(g) {
    for (const x of [-4, 3]) {
      g.beginPath(); g.moveTo(x - 3, -8); g.lineTo(x + 4, 0); g.lineTo(x - 3, 8);
      g.lineCap = 'round'; g.lineJoin = 'round';
      g.lineWidth = 5.5; g.strokeStyle = OUT; g.stroke();
      g.lineWidth = 3; g.strokeStyle = '#5ef0c8'; g.stroke();
    }
  },
  vit(g) {
    ICONS.heart(g);
    g.lineCap = 'round';
    for (const [w, c] of [[5, OUT], [2.6, '#fff']]) {
      g.beginPath(); g.moveTo(5, -9); g.lineTo(5, -1); g.moveTo(1, -5); g.lineTo(9, -5);
      g.lineWidth = w; g.strokeStyle = c; g.stroke();
    }
  },
  pow(g) {
    g.save(); g.rotate(Math.PI / 4);
    g.beginPath(); g.moveTo(0, -12); g.lineTo(2.6, -9); g.lineTo(2.6, 3); g.lineTo(-2.6, 3); g.lineTo(-2.6, -9); g.closePath();
    ink(g, grad(g, -12, 3, '#ffffff', '#b8c4dc'), 1.3);
    g.beginPath(); g.roundRect(-6, 3, 12, 2.8, 1.4); ink(g, '#ffc94d', 1.2);
    g.beginPath(); g.roundRect(-1.6, 5.8, 3.2, 5, 1.2); ink(g, '#8a5a3a', 1.2);
    g.restore();
  },
  hst(g) {
    g.beginPath(); g.arc(0, 1.5, 9, 0, TAU); ink(g, grad(g, -8, 10, '#bfe3ff', '#5ab0ff'), 1.6);
    g.beginPath(); g.roundRect(-2.5, -11, 5, 3.5, 1); ink(g, '#ffc94d', 1.2);
    g.lineCap = 'round'; g.lineWidth = 2; g.strokeStyle = OUT;
    g.beginPath(); g.moveTo(0, 1.5); g.lineTo(0, -4.5); g.moveTo(0, 1.5); g.lineTo(4.5, 3.5); g.stroke();
  },
  mag(g) {
    g.beginPath(); g.arc(0, 0, 7.5, Math.PI, 0); g.lineTo(7.5, 8); g.lineTo(3, 8); g.lineTo(3, 0);
    g.arc(0, 0, 3, 0, Math.PI, true); g.lineTo(-3, 8); g.lineTo(-7.5, 8); g.closePath();
    ink(g, grad(g, -8, 8, '#ff8a8a', '#e23a4a'), 1.5);
    g.fillStyle = '#e2e8f0';
    g.fillRect(-7, 4.5, 3.5, 3); g.fillRect(3.5, 4.5, 3.5, 3);
  },
  arm(g) {
    g.beginPath(); g.moveTo(0, -10); g.quadraticCurveTo(7, -8, 9, -7); g.quadraticCurveTo(9, 5, 0, 11);
    g.quadraticCurveTo(-9, 5, -9, -7); g.quadraticCurveTo(-7, -8, 0, -10);
    ink(g, grad(g, -10, 11, '#9fd0ff', '#3f7ee0'), 1.6);
    g.beginPath(); g.moveTo(0, -6); g.lineTo(0, 7); g.moveTo(-5.5, -2); g.lineTo(5.5, -2);
    g.lineWidth = 1.6; g.strokeStyle = 'rgba(255,255,255,.75)'; g.stroke();
  },
  // ——— gear (inventory, ground drops) ———
  gearSword(g) { ICONS.pow(g); },
  gearBow(g) {
    g.save(); g.rotate(Math.PI / 4);
    g.beginPath(); g.moveTo(-2, -11); g.quadraticCurveTo(9, 0, -2, 11);
    g.lineCap = 'round'; g.lineWidth = 5; g.strokeStyle = OUT; g.stroke();
    g.lineWidth = 3; g.strokeStyle = '#c8874e'; g.stroke();
    g.beginPath(); g.moveTo(-2, -11); g.lineTo(-2, 11); g.lineWidth = 1; g.strokeStyle = '#f1e9d8'; g.stroke();
    g.beginPath(); g.moveTo(-10, 0); g.lineTo(7, 0); g.lineWidth = 1.6; g.strokeStyle = OUT; g.stroke();
    g.beginPath(); g.moveTo(10, 0); g.lineTo(6, -2.6); g.lineTo(6, 2.6); g.closePath(); ink(g, '#e6ecf5', 1);
    g.restore();
  },
  gearStaff(g) {
    g.save(); g.rotate(Math.PI / 5);
    g.beginPath(); g.roundRect(-1.6, -6, 3.2, 18, 1.5); ink(g, '#8a5a3a', 1.2);
    g.beginPath(); g.arc(0, -8, 5, 0, TAU); ink(g, grad(g, -13, -3, '#c9b8ff', '#7b5cff'), 1.4);
    shine(g, -1.6, -9.6, 1.6, 1, -0.5, 0.8);
    g.restore();
  },
  gearDagger(g) {
    g.save(); g.rotate(Math.PI / 4);
    g.beginPath(); g.moveTo(0, -11); g.lineTo(3, -3); g.lineTo(-3, -3); g.closePath(); ink(g, grad(g, -11, -3, '#ffffff', '#b8c4dc'), 1.2);
    g.beginPath(); g.roundRect(-5, -3, 10, 2.4, 1.2); ink(g, '#ff4d5e', 1.1);
    g.beginPath(); g.roundRect(-1.5, -0.6, 3, 6, 1); ink(g, '#3a2f4f', 1.1);
    g.restore();
  },
  gearHelm(g) {
    g.beginPath(); g.moveTo(-9, 4); g.quadraticCurveTo(-9, -9, 0, -9); g.quadraticCurveTo(9, -9, 9, 4); g.lineTo(9, 7); g.lineTo(-9, 7); g.closePath();
    ink(g, grad(g, -9, 7, '#e2e8f0', '#8a94a8'), 1.5);
    g.beginPath(); g.roundRect(-6, 0, 12, 3, 1.5); g.fillStyle = OUT; g.fill();
    g.beginPath(); g.roundRect(-1.2, -9, 2.4, 9, 1); ink(g, '#ffc94d', 1);
  },
  gearArmor(g) {
    g.beginPath(); g.moveTo(-5, -9); g.lineTo(-10, -6); g.lineTo(-8, 1); g.lineTo(-6, 0); g.lineTo(-6, 10); g.lineTo(6, 10); g.lineTo(6, 0);
    g.lineTo(8, 1); g.lineTo(10, -6); g.lineTo(5, -9); g.quadraticCurveTo(0, -5, -5, -9);
    ink(g, grad(g, -9, 10, '#cfd6e4', '#7d879c'), 1.5);
    g.beginPath(); g.moveTo(0, -5); g.lineTo(0, 9); g.lineWidth = 1.2; g.strokeStyle = 'rgba(42,33,64,.6)'; g.stroke();
  },
  gearBoots(g) {
    g.beginPath(); g.moveTo(-6, -10); g.lineTo(2, -10); g.lineTo(2, 2); g.quadraticCurveTo(10, 2, 10, 7); g.lineTo(10, 9); g.lineTo(-6, 9); g.closePath();
    ink(g, grad(g, -10, 9, '#b07a50', '#6a4630'), 1.5);
    g.beginPath(); g.roundRect(-7, -11, 10, 3.5, 1.5); ink(g, '#8a5a3a', 1.1);
    g.beginPath(); g.rect(-6, 6.5, 16, 2.5); g.fillStyle = OUT; g.fill();
  },
  gearAmulet(g) {
    g.beginPath(); g.arc(0, -4, 8, Math.PI * 0.15, Math.PI * 0.85, true); g.lineWidth = 1.6; g.strokeStyle = '#d6b25e'; g.stroke();
    g.beginPath(); g.moveTo(0, 0); g.lineTo(5, 5); g.lineTo(0, 11); g.lineTo(-5, 5); g.closePath();
    ink(g, grad(g, 0, 11, '#ff9ab0', '#d0234f'), 1.4);
    shine(g, -1.2, 4, 1.2, 0.8, -0.5, 0.8);
  },
  gearRing(g) {
    g.beginPath(); g.arc(0, 3, 7, 0, TAU); g.arc(0, 3, 4.4, 0, TAU, true);
    ink(g, grad(g, -4, 10, '#ffe7a0', '#d9a020'), 1.4);
    g.beginPath(); g.moveTo(0, -10); g.lineTo(4, -5); g.lineTo(0, -2); g.lineTo(-4, -5); g.closePath();
    ink(g, grad(g, -10, -2, '#c9f0ff', '#4fa8e8'), 1.2);
  },
  // ——— town ———
  trainer(g) { // dumbbell
    g.beginPath(); g.roundRect(-7, -1.6, 14, 3.2, 1.5); ink(g, '#b9c1d0', 1.2);
    for (const x of [-10, 7]) { g.beginPath(); g.roundRect(x, -6, 3.4, 12, 1.5); ink(g, '#4a4866', 1.3); }
    for (const x of [-12.5, 10.4]) { g.beginPath(); g.roundRect(x, -4, 2.2, 8, 1); ink(g, '#4a4866', 1.1); }
  },
  barber(g) { // scissors
    for (const s of [-1, 1]) {
      g.beginPath(); g.moveTo(0, 0); g.lineTo(s * 3, -11); g.lineTo(s * 0.6, -1); g.closePath(); ink(g, '#e6ecf5', 1.1);
      g.beginPath(); g.arc(s * 4, 5.5, 3.6, 0, TAU); g.lineWidth = 3.4; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 2; g.strokeStyle = '#e0527a'; g.stroke();
    }
  },
  talk(g) { // speech bubble
    g.beginPath(); g.roundRect(-10, -9, 20, 14, 6); g.moveTo(-3, 5); g.lineTo(-6, 10); g.lineTo(2, 5);
    ink(g, '#fffaf0', 1.5);
    g.fillStyle = OUT;
    for (const x of [-5, 0, 5]) { g.beginPath(); g.arc(x, -2, 1.5, 0, TAU); g.fill(); }
  },
  ...Object.fromEntries(Object.entries(POTIONS).map(([id, p]) => [`pot_${id}`, (g) => flask(g, p, id === 'big')])),
  inn(g) { // frothy mug
    g.beginPath(); g.roundRect(-8, -5, 13, 15, 3); ink(g, grad(g, -5, 10, '#ffd36b', '#e09a2a'), 1.5);
    g.beginPath(); g.arc(5, 2, 4.5, -Math.PI / 2, Math.PI / 2); g.lineWidth = 4.4; g.strokeStyle = OUT; g.stroke();
    g.lineWidth = 2; g.strokeStyle = '#ffd36b'; g.stroke();
    g.beginPath();
    for (const [x, r] of [[-6, 3.6], [-1.5, 4.4], [3, 3.6]]) { g.moveTo(x + r, -6); g.arc(x, -6, r, 0, TAU); }
    ink(g, '#fffaf0', 1.2);
  },
  potion(g) { // round flask
    g.beginPath(); g.roundRect(-3, -11, 6, 6, 1.5); ink(g, '#c8874e', 1.3);
    g.beginPath(); g.moveTo(-3, -5); g.lineTo(-3, -3); g.arc(0, 4, 8, -Math.PI / 2 - 0.38, Math.PI * 1.5 + 0.38); g.lineTo(3, -5); g.closePath();
    ink(g, grad(g, -4, 12, '#ff8aa3', '#d0234f'), 1.5);
    shine(g, -3, 1, 2, 3.2, 0.3, 0.6);
  },
  // ——— class skills ———
  spin(g) {
    g.lineCap = 'round';
    for (const s of [0, Math.PI]) {
      g.beginPath(); g.arc(0, 0, 9.5, s + 0.35, s + 2.6);
      g.lineWidth = 5; g.strokeStyle = OUT; g.stroke();
      g.lineWidth = 2.6; g.strokeStyle = '#ffd36b'; g.stroke();
      const a = s + 2.6, x = Math.cos(a) * 9.5, y = Math.sin(a) * 9.5;
      g.save(); g.translate(x, y); g.rotate(a + Math.PI / 2);
      g.beginPath(); g.moveTo(-3.5, -2); g.lineTo(3.5, 0); g.lineTo(-3.5, 2.6); g.closePath(); ink(g, '#ffd36b', 1.1);
      g.restore();
    }
    g.save(); g.rotate(-Math.PI / 4); g.scale(0.55, 0.55); ICONS.pow(g); g.restore();
  },
  shout(g) {
    g.save(); g.translate(-3, 0); g.scale(0.75, 0.75); ICONS.arm(g); g.restore();
    g.lineCap = 'round';
    for (const r of [7, 11]) {
      g.beginPath(); g.arc(1, 0, r, -0.7, 0.7);
      g.lineWidth = 3.6; g.strokeStyle = OUT; g.stroke();
      g.lineWidth = 1.8; g.strokeStyle = '#ffe27a'; g.stroke();
    }
  },
  rain(g) {
    for (const [x, y] of [[-6, -6], [1, -1], [7, -7]]) {
      g.save(); g.translate(x, y); g.rotate(Math.PI / 2);
      g.beginPath(); g.moveTo(-5, 0); g.lineTo(7, 0); g.lineWidth = 3.6; g.strokeStyle = OUT; g.lineCap = 'round'; g.stroke();
      g.lineWidth = 1.8; g.strokeStyle = '#c8874e'; g.stroke();
      g.beginPath(); g.moveTo(11, 0); g.lineTo(6, -3); g.lineTo(6, 3); g.closePath(); ink(g, '#e6ecf5', 1);
      g.restore();
    }
    g.beginPath(); g.ellipse(0, 10, 10, 2.6, 0, 0, TAU); g.fillStyle = 'rgba(255,107,139,.6)'; g.fill();
  },
  pierce(g) {
    g.beginPath(); g.arc(0, 0, 6, 0, TAU); ink(g, 'rgba(155,123,255,.5)', 1.2);
    g.save(); g.rotate(-Math.PI / 4);
    g.beginPath(); g.moveTo(-12, 0); g.lineTo(6, 0); g.lineCap = 'round';
    g.lineWidth = 5; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 2.8; g.strokeStyle = '#ffe27a'; g.stroke();
    g.beginPath(); g.moveTo(13, 0); g.lineTo(5, -5); g.lineTo(5, 5); g.closePath(); ink(g, '#fff4b8', 1.3);
    g.restore();
  },
  nova(g) {
    g.lineCap = 'round';
    for (const [w, c] of [[4.4, OUT], [2.2, '#bfe9ff']]) {
      g.lineWidth = w; g.strokeStyle = c;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU, cx = Math.cos(a), cy = Math.sin(a);
        g.beginPath(); g.moveTo(0, 0); g.lineTo(cx * 11, cy * 11);
        const bx = cx * 7, by = cy * 7;
        g.moveTo(bx, by); g.lineTo(bx + Math.cos(a + 0.8) * 3.5, by + Math.sin(a + 0.8) * 3.5);
        g.moveTo(bx, by); g.lineTo(bx + Math.cos(a - 0.8) * 3.5, by + Math.sin(a - 0.8) * 3.5);
        g.stroke();
      }
    }
    g.beginPath(); g.arc(0, 0, 2.6, 0, TAU); ink(g, '#ffffff', 1);
  },
  chain(g) {
    const pts = [[-9, 6], [-2, -6], [4, 4], [10, -7]];
    g.lineJoin = 'round';
    for (const [w, c] of [[5, OUT], [2.6, '#c9b6ff']]) {
      g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.lineWidth = w; g.strokeStyle = c; g.stroke();
    }
    for (const [x, y] of pts) { g.beginPath(); g.arc(x, y, 2.6, 0, TAU); ink(g, '#fff59a', 1.1); }
  },
  shadow(g) {
    g.beginPath(); g.arc(3, 0, 8, -Math.PI / 2, Math.PI / 2); g.quadraticCurveTo(-1, 0, 3, -8);
    ink(g, grad(g, -8, 8, '#a78bfa', '#4c1d95'), 1.5);
    g.lineCap = 'round';
    for (const [y, l] of [[-5, 8], [0, 11], [5, 8]]) {
      g.beginPath(); g.moveTo(-12, y); g.lineTo(-12 + l, y);
      g.lineWidth = 2; g.strokeStyle = 'rgba(167,139,250,.9)'; g.stroke();
    }
  },
  fan(g) {
    for (const a of [-0.5, 0, 0.5]) {
      g.save(); g.rotate(a - Math.PI / 2); g.translate(0, -2);
      g.beginPath(); g.moveTo(0, -12); g.lineTo(2.2, -3); g.lineTo(-2.2, -3); g.closePath(); ink(g, '#e6ecf5', 1.1);
      g.beginPath(); g.roundRect(-1.4, -3, 2.8, 5, 1); ink(g, '#ff4d5e', 1);
      g.restore();
    }
  },
};
export const ICON_IDS = Object.keys(ICONS);

const WEAPON_ICON = { warrior: 'gearSword', archer: 'gearBow', mage: 'gearStaff', assassin: 'gearDagger' };
const SLOT_ICON = { helm: 'gearHelm', armor: 'gearArmor', boots: 'gearBoots', amulet: 'gearAmulet', ring: 'gearRing' };
export const gearIcon = (item) => (item.slot === 'weapon' ? WEAPON_ICON[item.classId] : SLOT_ICON[item.slot]);

// Accepts icon ids with or without the prototype "icon" prefix (iconEmber → ember).
export function drawIcon(g, id, size) {
  const key = id.replace(/^icon/, '');
  const fn = ICONS[key] || ICONS[key.charAt(0).toLowerCase() + key.slice(1)];
  if (!fn) return;
  g.save();
  g.scale(size / 26, size / 26);
  g.lineJoin = 'round';
  fn(g);
  g.restore();
}

// A crisp <canvas> icon for the DOM (cssSize × cssSize).
export function iconCanvas(id, cssSize) {
  const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
  const c = document.createElement('canvas');
  c.width = c.height = Math.round(cssSize * dpr);
  c.style.width = c.style.height = `${cssSize}px`;
  const g = c.getContext('2d');
  g.translate(c.width / 2, c.height / 2);
  drawIcon(g, id, cssSize * dpr);
  return c;
}

// ——— baking ———
// Each baked sprite: { img, ext } — img covers [-ext, ext] world units around the origin.
export const SPRITES = {};

function bake(draw, ext, scale, tint = null) {
  const c = document.createElement('canvas');
  c.width = c.height = Math.max(2, Math.ceil(ext * 2 * scale));
  const g = c.getContext('2d');
  g.translate(c.width / 2, c.height / 2);
  g.scale(scale, scale);
  g.lineJoin = 'round';
  draw(g);
  if (tint) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = tint; g.fillRect(0, 0, c.width, c.height);
  }
  return { img: c, ext };
}

// enemyRadius: { type: r } from data/enemies.js
export function bakeAll(scale, enemyRadius) {
  for (const [type, r] of Object.entries(enemyRadius)) {
    const draw = (g) => ENEMY_ART[type](g, r);
    const ext = r * 1.6;
    SPRITES[type] = bake(draw, ext, scale);
    SPRITES[`${type}Flash`] = bake(draw, ext, scale, 'rgba(255,255,255,.75)');
    SPRITES[`${type}Frozen`] = bake(draw, ext, scale, 'rgba(120,205,255,.55)');
  }
  for (const [id, draw] of Object.entries(PICKUP_ART)) SPRITES[id] = bake(draw, 11, scale);
  for (const [id, draw] of Object.entries(DECOR_ART)) SPRITES[id] = bake(draw, 13, scale);
}

// Draws a baked sprite centred at (x, y) in the current (world) transform.
export function drawBaked(g, s, x, y, sx = 1, sy = sx, flip = false) {
  const w = s.ext * 2;
  g.save();
  g.translate(x, y);
  g.scale(flip ? -sx : sx, sy);
  g.drawImage(s.img, -s.ext, -s.ext, w, w);
  g.restore();
}
