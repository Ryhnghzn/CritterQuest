// Paper doll (spec §8): a chibi character drawn as vector layers around anchor
// points that move with the pose. Origin = centre between the feet, facing
// right (callers flip for left), ~44 world units tall. Layer order:
// body → armor → hair (hidden under a helm) → helm → weapon; gear layers
// arrive in langkah 4 and attach to the anchors returned by drawDoll().
import { OUT } from './sprites.js';

const TAU = Math.PI * 2;
const SKIN = ['#ffd9b8', '#f2b08c'];
const PANTS = '#3d3560';
const BOOTS = '#6b4430';

// main / shade per class; details are drawn in CLASS_DETAIL
export const OUTFIT = {
  warrior: ['#ff6b5e', '#c9433b'],
  archer: ['#44c47a', '#2a9058'],
  mage: ['#6b8cff', '#4462d8'],
  assassin: ['#5c6184', '#3c405c'],
};

export const HAIR_NAMES = ['Pendek', 'Jabrik', 'Panjang', 'Bob', 'Kuncir'];
export const HAIR_COLOR_NAMES = ['Hitam', 'Cokelat', 'Pirang', 'Merah', 'Biru', 'Putih'];
export const HAIR_PALETTE = [
  ['#45395e', '#2a2140'],
  ['#a8673c', '#76431f'],
  ['#ffd36b', '#e0a43a'],
  ['#ff715e', '#cf4436'],
  ['#62b2ff', '#3577d6'],
  ['#f4f2ff', '#c4bfe6'],
];

function lin(g, y0, y1, c0, c1) {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, c0); gr.addColorStop(1, c1);
  return gr;
}
function ink(g, fill, lw = 1.6) { g.fillStyle = fill; g.fill(); g.lineWidth = lw; g.strokeStyle = OUT; g.stroke(); }
// rounded limb: dark outline stroke under a coloured stroke
function limb(g, x1, y1, x2, y2, w, color) {
  g.lineCap = 'round';
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2);
  g.lineWidth = w + 3; g.strokeStyle = OUT; g.stroke();
  g.lineWidth = w; g.strokeStyle = color; g.stroke();
}
function dot(g, x, y, r, fill) { g.beginPath(); g.arc(x, y, r, 0, TAU); ink(g, fill, 1.3); }

// ——— hair: back layers (behind the body) and front layers (over the head) ———
function capPath(g, hx, hy, r, spikes) {
  const a0 = Math.PI - 0.2, a1 = TAU - 0.32;
  g.beginPath();
  g.moveTo(hx - r * 1.02, hy + 3.5);
  if (spikes) {
    const n = 9;
    for (let i = 0; i <= n; i++) {
      const a = a0 + (a1 - a0) * (i / n);
      const rr = r * (i % 2 ? 1.5 : 1.06);
      g.lineTo(hx + Math.cos(a) * rr, hy + Math.sin(a) * rr);
    }
  } else {
    g.arc(hx, hy, r * 1.08, a0, a1);
  }
  // fringe back across the forehead, stopping above the eyes
  g.quadraticCurveTo(hx + 8, hy - 1, hx + 5.5, hy - 4.6);
  g.quadraticCurveTo(hx + 3.5, hy - 1.5, hx + 1.5, hy - 5);
  g.quadraticCurveTo(hx - 1, hy - 1.5, hx - 3.5, hy - 4.8);
  g.quadraticCurveTo(hx - 6, hy, hx - r * 1.02, hy + 3.5);
  g.closePath();
}

const HAIR_BACK = [
  null,
  null,
  (g, hx, hy, r, c) => { g.beginPath(); g.roundRect(hx - r - 2.5, hy - 6, r + 6, 24, [4, 4, 8, 8]); ink(g, c); },
  null,
  (g, hx, hy, r, c, t) => {
    const sway = Math.sin(t * 5) * 1.2;
    g.beginPath();
    g.moveTo(hx - r + 1, hy - 4);
    g.quadraticCurveTo(hx - r - 9, hy - 2 + sway, hx - r - 6 + sway, hy + 12);
    g.quadraticCurveTo(hx - r - 2, hy + 5, hx - r + 2, hy + 1);
    g.closePath(); ink(g, c);
  },
];
const HAIR_FRONT = [
  (g, hx, hy, r, c) => { capPath(g, hx, hy, r, false); ink(g, c); },
  (g, hx, hy, r, c) => { capPath(g, hx, hy, r, true); ink(g, c); },
  (g, hx, hy, r, c) => { capPath(g, hx, hy, r, false); ink(g, c); },
  (g, hx, hy, r, c) => {
    g.beginPath(); g.roundRect(hx - r - 2, hy - 5, 7, 15, [3, 3, 5, 5]); ink(g, c);
    g.beginPath(); g.roundRect(hx + r - 2.6, hy - 6, 4.2, 11, [2, 2, 4, 4]); ink(g, c);
    capPath(g, hx, hy, r, false); ink(g, c);
  },
  (g, hx, hy, r, c) => {
    capPath(g, hx, hy, r, false); ink(g, c);
    dot(g, hx - r + 0.5, hy - 2.5, 2, '#ff7ab8');
  },
];

// ——— class flavour drawn over/behind the torso ———
const CLASS_BACK = {
  archer(g, bob) { // quiver
    g.save(); g.translate(-8, -22 + bob); g.rotate(-0.35);
    g.beginPath(); g.roundRect(-3, -4, 6, 15, 2); ink(g, '#a8673c', 1.4);
    for (const x of [-1.5, 1.5]) { g.beginPath(); g.moveTo(x, -4); g.lineTo(x - 1.6, -8); g.lineTo(x + 1.6, -8); g.closePath(); ink(g, '#fff', 1); }
    g.restore();
  },
  assassin(g, bob, t, moving) { // scarf tail
    const flap = Math.sin(t * 9) * (1 + moving * 2);
    g.beginPath(); g.moveTo(-4, -24 + bob);
    g.quadraticCurveTo(-11, -24 + bob + flap, -15 - moving * 3, -20 + bob + flap);
    g.lineTo(-13 - moving * 3, -18 + bob + flap); g.quadraticCurveTo(-9, -21 + bob, -4, -21 + bob);
    ink(g, '#ff4d5e', 1.4);
  },
};
const CLASS_FRONT = {
  warrior(g, bob) { // shoulder pad + belt buckle
    g.beginPath(); g.ellipse(5, -21 + bob, 4.6, 3.4, 0, 0, TAU); ink(g, '#c3cbe0', 1.4);
    g.beginPath(); g.roundRect(-2, -13.6 + bob, 4, 3.2, 1); ink(g, '#ffc94d', 1.1);
  },
  archer(g, bob) {
    g.beginPath(); g.moveTo(-7, -22 + bob); g.lineTo(5, -12 + bob); g.lineWidth = 2.2; g.strokeStyle = '#7a4a2a'; g.stroke();
  },
  mage(g, bob) { // collar + star
    g.beginPath(); g.ellipse(0, -22.5 + bob, 6.5, 2.2, 0, 0, TAU); ink(g, '#ffc94d', 1.2);
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i / 10) * TAU, rr = i % 2 ? 1.3 : 3;
      g.lineTo(3 + Math.cos(a) * rr, -15.5 + bob + Math.sin(a) * rr);
    }
    g.closePath(); ink(g, '#ffe27a', 0.9);
  },
  assassin(g, bob) {
    g.beginPath(); g.roundRect(-6.5, -25.5 + bob, 13, 4.2, 2); ink(g, '#ff4d5e', 1.3);
  },
};

// look: { hair, hairColor, outfit? } — outfit [main, shade] overrides the class
// colours (NPCs pass classId null and an outfit).
// pose: { t: seconds, moving: 0..1, walk: phase (rad), attack: 0..1, hurt: bool }
// Returns anchor points (head, body, hand) for gear layers.
export function drawDoll(g, classId, look, pose = {}) {
  const { t = 0, moving = 0, walk = 0, attack = 0, hurt = false } = pose;
  const [cMain, cShade] = look.outfit || OUTFIT[classId];
  const [hMain, hShade] = HAIR_PALETTE[look.hairColor];
  const swing = Math.sin(walk) * 3.4 * moving;
  const bob = moving ? -Math.abs(Math.sin(walk)) * 1.6 * moving : Math.sin(t * 2.2) * 0.45;
  const hx = 1, hy = -33 + bob, hr = 11;
  const hairFill = lin(g, hy - hr, hy + hr, hMain, hShade);
  const robe = classId === 'mage';

  g.lineJoin = 'round';
  HAIR_BACK[look.hair]?.(g, hx, hy, hr, hairFill, t);
  CLASS_BACK[classId]?.(g, bob, t, moving);

  // legs (back leg darker), boots
  limb(g, -2.5, -10 + bob, -2.5 - swing, -2, 5, '#2f2850');
  g.beginPath(); g.ellipse(-1.8 - swing, -1.3, 3.8, 2.4, 0, 0, TAU); ink(g, BOOTS, 1.3);
  limb(g, 2.5, -10 + bob, 2.5 + swing, -2, 5, PANTS);
  g.beginPath(); g.ellipse(3.2 + swing, -1.3, 3.8, 2.4, 0, 0, TAU); ink(g, BOOTS, 1.3);

  // back arm
  limb(g, -5, -20 + bob, -6.5 + swing * 0.5, -12.5 + bob, 4, cShade);
  dot(g, -6.5 + swing * 0.5, -12 + bob, 2.3, SKIN[1]);

  // torso
  g.beginPath(); g.roundRect(-8.5, -24 + bob, 17, robe ? 19 : 15, [7, 7, 5, 5]);
  ink(g, lin(g, -24 + bob, -9 + bob, cMain, cShade));
  g.beginPath(); g.roundRect(-8.5, -13.5 + bob, 17, 2.6, 1); g.fillStyle = cShade; g.fill();
  g.beginPath(); g.ellipse(-3.5, -20 + bob, 2.6, 1.3, -0.4, 0, TAU); g.fillStyle = 'rgba(255,255,255,.28)'; g.fill();
  CLASS_FRONT[classId]?.(g, bob);

  // front arm: swings while walking, thrusts forward when attacking
  const handX = 6.5 - swing * 0.5 + attack * 7, handY = -12.5 + bob - attack * 6;
  limb(g, 4.5, -20 + bob, handX, handY, 4, cMain);
  dot(g, handX, handY + 0.5, 2.4, SKIN[0]);

  // head
  g.beginPath(); g.arc(hx, hy, hr, 0, TAU);
  const sk = g.createRadialGradient(hx + 3, hy - 4, 2, hx, hy, hr);
  sk.addColorStop(0, '#ffe8d4'); sk.addColorStop(1, SKIN[0]);
  ink(g, sk);
  // ear on the back side
  g.beginPath(); g.ellipse(hx - 6.5, hy + 1.5, 2.2, 2.8, 0, 0, TAU); ink(g, SKIN[1], 1.2);
  HAIR_FRONT[look.hair](g, hx, hy, hr, hairFill);

  // face
  const ey = hy + 0.5;
  if (hurt) {
    g.lineCap = 'round'; g.lineWidth = 1.4; g.strokeStyle = OUT;
    for (const ex of [hx + 4, hx + 8.5]) {
      g.beginPath(); g.moveTo(ex - 1.6, ey - 1.6); g.lineTo(ex + 1.2, ey); g.lineTo(ex - 1.6, ey + 1.6); g.stroke();
    }
    g.beginPath(); g.ellipse(hx + 6.5, hy + 6, 1.3, 1.6, 0, 0, TAU); g.fillStyle = OUT; g.fill();
  } else {
    const blink = (t % 3.7) < 0.12;
    for (const ex of [hx + 4, hx + 8.5]) {
      if (blink) {
        g.beginPath(); g.moveTo(ex - 1.5, ey); g.lineTo(ex + 1.5, ey);
        g.lineCap = 'round'; g.lineWidth = 1.3; g.strokeStyle = OUT; g.stroke();
        continue;
      }
      g.beginPath(); g.ellipse(ex, ey, 1.7, 2.4, 0, 0, TAU); g.fillStyle = OUT; g.fill();
      g.beginPath(); g.arc(ex + 0.5, ey - 0.9, 0.75, 0, TAU); g.fillStyle = '#fff'; g.fill();
    }
    g.beginPath(); g.arc(hx + 6.8, hy + 4.6, 1.5, 0.15 * Math.PI, 0.85 * Math.PI);
    g.lineCap = 'round'; g.lineWidth = 1.1; g.strokeStyle = OUT; g.stroke();
  }
  g.fillStyle = 'rgba(255,120,140,.35)';
  for (const bx of [hx + 2.2, hx + 10]) { g.beginPath(); g.ellipse(bx, hy + 3.6, 1.8, 1.1, 0, 0, TAU); g.fill(); }

  return { head: { x: hx, y: hy, r: hr }, body: { x: 0, y: -17 + bob }, hand: { x: handX, y: handY } };
}

// A crisp <canvas> portrait (idle pose) for menus; height in CSS px.
export function portrait(classId, look, height) {
  const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
  const width = Math.round(height * 0.8);
  const c = document.createElement('canvas');
  c.width = Math.round(width * dpr); c.height = Math.round(height * dpr);
  c.style.width = `${width}px`; c.style.height = `${height}px`;
  const g = c.getContext('2d');
  const s = (c.height / 50);
  g.translate(c.width / 2, c.height - 3 * s);
  g.scale(s, s);
  g.beginPath(); g.ellipse(0, 0, 11, 2.6, 0, 0, TAU); g.fillStyle = 'rgba(0,0,0,.22)'; g.fill();
  drawDoll(g, classId, look, { t: 1 });
  return c;
}
