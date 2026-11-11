// Paper doll (spec §8, redesigned in langkah 8A): a dark-fantasy hero drawn as
// vector layers around anchor points that move with the pose. Origin = centre
// between the feet, facing right (callers flip for left), ~44 world units tall,
// head ≈ ⅓ of the body. Layer order: cape → back limbs → legs & boots → torso
// → armour → arms → head, hair (hidden under most helms) → helm → weapon.
// Gear shapes come from art/gear.js (one per look variant).
import { drawWeapon, drawHelm, drawArmor, drawBoot, helmHidesHair, INK, halo } from './gear.js';
import { RARITIES, MYTHIC } from '../data/items.js';
import { DOLL_FX } from '../data/itemfx.js';
import { drawHero } from './hero/index.js';
import { LOOK } from '../data/look.js';
import { pickWing } from './anime/wingpick.js';
import { pixelData } from './pixeldata.js';

const TAU = Math.PI * 2;
const SKIN = ['#e3bfa3', '#b98a6e'];
const PANTS = '#2c2733';
const BOOTS = '#4a3326';

// main / shade per class (muted); details are drawn in CLASS_BACK / CLASS_FRONT
export const OUTFIT = {
  warrior: ['#8b3a32', '#5a221d'],
  archer: ['#4c6e45', '#2e472b'],
  mage: ['#3d4c86', '#252f58'],
  assassin: ['#474a5e', '#2a2c39'],
};

export const HAIR_NAMES = ['Pendek', 'Jabrik', 'Panjang', 'Bob', 'Kuncir', 'Poni Samping'];
export const HAIR_COLOR_NAMES = ['Hitam', 'Cokelat', 'Pirang', 'Merah', 'Biru', 'Putih'];
export const HAIR_PALETTE = [
  ['#2e2a36', '#18151e'],
  ['#7a4e30', '#4a2e1b'],
  ['#d9b765', '#a07e38'],
  ['#a84432', '#6e2a1f'],
  ['#4f74a8', '#2f4a74'],
  ['#dcdbe6', '#9e9cb0'],
];

// Epik and up glow in their rarity colour behind the piece (pulsing glow sprite)
function pieceGlow(g, piece, x, y, r, t) {
  if (!piece || piece.rarity < 3) return;
  halo(g, x, y, r * (0.8 + piece.rarity * 0.12), RARITIES[piece.rarity].color, (0.3 + (piece.rarity - 3) * 0.12) * (0.75 + 0.25 * Math.sin(t * 3)));
}

// Legendaris+ weapon in the hand (plan "Efek Lebay" §E): glow along it and sparks
// rising off it; Mitos also leaves afterimages while swinging. Weapon frame: grip at origin, up = −y.
function weaponAura(g, w, t) {
  if (w.rarity < DOLL_FX.glowFrom) return;
  const c = RARITIES[w.rarity].color, mythic = w.rarity === MYTHIC;
  const p = 0.75 + 0.25 * Math.sin(t * 4);
  for (const y of [-6, -13, -20]) halo(g, 0, y, mythic ? 7 : 5.5, c, (mythic ? 0.55 : 0.4) * p);
  const n = DOLL_FX.embers[w.rarity];
  for (let i = 0; i < n; i++) {
    const ph = (t * 0.9 + i / n) % 1;
    const x = Math.sin(i * 7.3 + t * 3) * 3, y = -4 - ph * 24;
    halo(g, x, y, 2.2, mythic && i % 2 ? '#ffd166' : c, 1 - ph);
  }
}

function lin(g, y0, y1, c0, c1) {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, c0); gr.addColorStop(1, c1);
  return gr;
}
function ink(g, fill, lw = 0.9) { g.fillStyle = fill; g.fill(); g.lineWidth = lw; g.strokeStyle = INK; g.stroke(); }
// limb: dark outline stroke under a coloured stroke
function limb(g, x1, y1, x2, y2, w, color) {
  g.lineCap = 'round';
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2);
  g.lineWidth = w + 1.6; g.strokeStyle = INK; g.stroke();
  g.lineWidth = w; g.strokeStyle = color; g.stroke();
}

// hair: back layers (behind the head) and front caps
function cap(g, hx, hy, r, spikes) {
  g.beginPath();
  g.moveTo(hx - r * 1.02, hy + r * 0.35);
  if (spikes) {
    const a0 = Math.PI - 0.1, a1 = TAU - 0.25, n = 9;
    for (let i = 0; i <= n; i++) {
      const a = a0 + (a1 - a0) * (i / n), rr = r * (i % 2 ? 1.45 : 1.05);
      g.lineTo(hx + Math.cos(a) * rr, hy + Math.sin(a) * rr);
    }
  } else g.arc(hx, hy - r * 0.05, r * 1.08, Math.PI - 0.1, TAU - 0.25);
  // fringe swept across the brow, above the eyes
  g.quadraticCurveTo(hx + r * 1.1, hy - r * 0.15, hx + r * 0.75, hy - r * 0.35);
  g.quadraticCurveTo(hx + r * 0.3, hy - r * 0.25, hx - r * 0.1, hy - r * 0.55);
  g.quadraticCurveTo(hx - r * 0.5, hy - r * 0.1, hx - r * 1.02, hy + r * 0.35);
  g.closePath();
}
const HAIR_BACK = [
  null,
  null,
  (g, hx, hy, r, c) => { g.beginPath(); g.roundRect(hx - r * 1.15, hy - r * 0.6, r * 1.2, r * 2.4, [r * 0.5, r * 0.3, r * 0.6, r * 0.6]); ink(g, c); },
  null,
  (g, hx, hy, r, c, t) => {
    const sway = Math.sin(t * 4) * 0.8;
    g.beginPath(); g.moveTo(hx - r * 0.9, hy - r * 0.5);
    g.quadraticCurveTo(hx - r * 2.1, hy + sway, hx - r * 1.6 + sway, hy + r * 1.8);
    g.quadraticCurveTo(hx - r * 1.2, hy + r * 0.6, hx - r * 0.7, hy + r * 0.1);
    g.closePath(); ink(g, c);
  },
];
const HAIR_FRONT = [
  (g, hx, hy, r, c) => { cap(g, hx, hy, r, false); ink(g, c); },
  (g, hx, hy, r, c) => { cap(g, hx, hy, r, true); ink(g, c); },
  (g, hx, hy, r, c) => { cap(g, hx, hy, r, false); ink(g, c); },
  (g, hx, hy, r, c) => {
    g.beginPath(); g.roundRect(hx - r * 1.12, hy - r * 0.4, r * 0.8, r * 1.55, [r * 0.3, r * 0.3, r * 0.5, r * 0.5]); ink(g, c);
    cap(g, hx, hy, r, false); ink(g, c);
  },
  (g, hx, hy, r, c) => { cap(g, hx, hy, r, false); ink(g, c); g.beginPath(); g.arc(hx - r * 0.95, hy - r * 0.35, r * 0.22, 0, TAU); ink(g, '#6e2a3a', 0.6); },
];

// class flavour
const CLASS_BACK = {
  warrior(g, bob, t, moving, c) { // long cape
    const flap = Math.sin(t * 3) * 0.8 + moving * 2.2;
    g.beginPath(); g.moveTo(-5.5, -27 + bob); g.lineTo(3, -27.5 + bob);
    g.quadraticCurveTo(-3, -14, -6 - flap, -4 + bob * 0.3); g.lineTo(-11 - flap * 1.5, -6); g.quadraticCurveTo(-9, -17, -5.5, -27 + bob);
    ink(g, lin(g, -28, -4, c[1], '#2a1110'));
  },
  archer(g, bob) { // lowered hood + quiver
    g.save(); g.translate(-5, -24 + bob); g.rotate(-0.3);
    g.beginPath(); g.roundRect(-1.8, -6, 3.6, 12, 1.2); ink(g, '#5e3f27');
    for (const x of [-0.8, 0.8]) { g.beginPath(); g.moveTo(x, -6); g.lineTo(x - 1.2, -9.5); g.lineTo(x + 1.2, -9.5); g.closePath(); ink(g, '#d8d0bc', 0.6); }
    g.restore();
  },
  assassin(g, bob, t, moving) { // scarf tail
    const flap = Math.sin(t * 9) * (0.8 + moving * 1.6);
    g.beginPath(); g.moveTo(-3, -29 + bob);
    g.quadraticCurveTo(-9, -29 + bob + flap, -13 - moving * 3, -25 + bob + flap);
    g.lineTo(-12 - moving * 3, -23.5 + bob + flap); g.quadraticCurveTo(-8, -26.5 + bob, -3, -27 + bob);
    ink(g, '#7a1e2a');
  },
};
const CLASS_FRONT = {
  warrior(g, bob) { // chest strap + buckle
    g.beginPath(); g.moveTo(-5.5, -26.5 + bob); g.lineTo(5, -17 + bob); g.lineWidth = 1.5; g.strokeStyle = '#3a2a22'; g.stroke();
    g.beginPath(); g.roundRect(-1.4, -17 + bob, 2.8, 2, 0.4); ink(g, '#b0954a', 0.6);
  },
  archer(g, bob) { // laced jerkin + hood folds at the neck
    g.beginPath(); for (let y = -25; y < -17; y += 2) { g.moveTo(1.5, y + bob); g.lineTo(2.8, y + 1 + bob); } g.lineWidth = 0.5; g.strokeStyle = '#d8c8a0'; g.stroke();
    g.beginPath(); g.ellipse(-1.5, -27.5 + bob, 5.5, 2, 0, 0, TAU); ink(g, '#3d5a37');
  },
  mage(g, bob) { // high collar + trim down the robe
    g.beginPath(); g.moveTo(-4.5, -27.5 + bob); g.quadraticCurveTo(-5.5, -31.5 + bob, -2, -31 + bob); g.lineTo(-1, -27 + bob); g.closePath(); ink(g, '#252f58');
    g.beginPath(); g.moveTo(2.2, -27 + bob); g.lineTo(2.6, -4); g.lineWidth = 1; g.strokeStyle = '#b0954a'; g.stroke();
  },
  assassin(g, bob) { // crossed belts
    g.lineWidth = 1; g.strokeStyle = '#1e1a22';
    g.beginPath(); g.moveTo(-5, -26 + bob); g.lineTo(4.5, -18 + bob); g.moveTo(5, -26 + bob); g.lineTo(-4.5, -18 + bob); g.stroke();
  },
};

// how each class holds its weapon
const HOLD = {
  warrior: (attack) => 0.55 + attack * 1.1,
  archer: () => 0.08,
  mage: (attack) => 0.3 + attack * 0.35,
  assassin: (attack) => 1.45 + attack * 0.4,
};

// look: { hair, hairColor, outfit?, gear? } — outfit [main, shade] overrides the
// class colours (NPCs pass classId null and an outfit); gear: { weapon|helm|armor|boots: { tier, rarity } }.
// pose: { t: seconds, moving: 0..1, walk: phase (rad), attack: 0..1, hurt: bool, attackPhase?: 0..1 }
// Returns anchor points (head, body, hand). Classes already in style D (art/hero) are drawn there.
export function drawDoll(g, classId, look, pose = {}) {
  const hero = drawHero(g, classId, look, pose);
  if (hero) return hero;
  const { t = 0, moving = 0, walk = 0, attack = 0, hurt = false } = pose;
  const outfit = look.outfit || OUTFIT[classId] || OUTFIT.warrior;
  const [cMain, cShade] = outfit;
  const [hMain, hShade] = HAIR_PALETTE[look.hairColor];
  const gear = look.gear || {};
  const swing = Math.sin(walk) * 3 * moving;
  const bob = moving ? -Math.abs(Math.sin(walk)) * 1.2 * moving : Math.sin(t * 2.2) * 0.35;
  const hx = 1.2, hy = -35 + bob, hr = 6.4;
  const hairFill = lin(g, hy - hr, hy + hr, hMain, hShade);
  const robe = classId === 'mage';
  const hideHair = gear.helm && helmHidesHair(gear.helm.tier, gear.helm.rarity);

  g.lineJoin = 'round';
  CLASS_BACK[classId]?.(g, bob, t, moving, outfit);
  if (!hideHair) HAIR_BACK[look.hair]?.(g, hx, hy, hr, hairFill, t);

  // legs and boots (back leg darker)
  limb(g, -2, -15 + bob, -2 - swing, -2.5, 3.4, '#211d27');
  if (gear.boots) drawBoot(g, gear.boots.tier, -2 - swing, 0, t, gear.boots.rarity);
  else { g.beginPath(); g.ellipse(-1 - swing, -1.1, 3, 1.8, 0, 0, TAU); ink(g, BOOTS); }
  limb(g, 2, -15 + bob, 2 + swing, -2.5, 3.4, PANTS);
  if (gear.boots) drawBoot(g, gear.boots.tier, 2 + swing, 0, t, gear.boots.rarity);
  else { g.beginPath(); g.ellipse(3 + swing, -1.1, 3, 1.8, 0, 0, TAU); ink(g, BOOTS); }

  // back arm
  limb(g, -4.5, -26 + bob, -5.5 + swing * 0.5, -17 + bob, 2.8, cShade);
  g.beginPath(); g.arc(-5.5 + swing * 0.5, -16.5 + bob, 1.5, 0, TAU); ink(g, SKIN[1], 0.7);

  // torso (robe reaches the knees for the mage)
  const bot = robe ? -4 : -14.5;
  g.beginPath();
  g.moveTo(-6.2, -27.5 + bob); g.quadraticCurveTo(0, -29 + bob, 6.2, -27.5 + bob);
  g.lineTo(robe ? 6.5 : 4.8, bot + (robe ? 0 : bob)); g.lineTo(robe ? -6.8 : -4.8, bot + (robe ? 0 : bob)); g.closePath();
  ink(g, lin(g, -28 + bob, bot, cMain, cShade));
  g.beginPath(); g.moveTo(-4, -25 + bob); g.quadraticCurveTo(-4.8, -21 + bob, -4, -18 + bob); g.lineWidth = 0.6; g.strokeStyle = 'rgba(255,255,255,.12)'; g.stroke();
  CLASS_FRONT[classId]?.(g, bob);
  if (gear.armor) { pieceGlow(g, gear.armor, 0, -22 + bob, 9, t); drawArmor(g, gear.armor.tier, -27.8 + bob, -15.5 + bob, 6.3, t, gear.armor.rarity); }
  // belt
  g.beginPath(); g.rect(-5, -16.4 + bob, 10, 1.6); ink(g, '#2a1e1a', 0.6);

  // neck + head
  g.beginPath(); g.rect(hx - 1.8, hy + hr * 0.6, 3.4, 3.2); ink(g, SKIN[1], 0.6);
  g.beginPath();
  g.ellipse(hx, hy, hr * 0.92, hr, 0, Math.PI * 0.9, Math.PI * 0.35);
  g.quadraticCurveTo(hx + hr * 0.7, hy + hr * 1.12, hx + hr * 0.05, hy + hr * 1.02); // chin
  g.closePath();
  const sk = g.createRadialGradient(hx + 2, hy - 2, 1, hx, hy, hr * 1.1);
  sk.addColorStop(0, '#f0d2bb'); sk.addColorStop(1, SKIN[0]);
  ink(g, sk);
  g.beginPath(); g.ellipse(hx - hr * 0.42, hy + 0.6, 1.2, 1.6, 0, 0, TAU); ink(g, SKIN[1], 0.6); // ear
  if (!hideHair) (HAIR_FRONT[look.hair] || HAIR_FRONT[0])(g, hx, hy, hr, hairFill);

  // face: almond eyes, brows, nose, mouth — no blush
  const ey = hy + 0.6;
  const eyes = [[hx + hr * 0.5, 1], [hx + hr * 0.02, 0.75]]; // near eye, far eye (¾ view)
  g.lineCap = 'round';
  for (const [ex, k] of eyes) {
    if (hurt || (t % 3.9) < 0.1) {
      g.beginPath(); g.moveTo(ex - 1 * k, ey); g.lineTo(ex + 1 * k, ey + (hurt ? 0.4 : 0));
      g.lineWidth = 0.6; g.strokeStyle = INK; g.stroke();
    } else {
      g.beginPath(); g.ellipse(ex, ey, 0.95 * k, 0.65, -0.1, 0, TAU); g.fillStyle = '#16121c'; g.fill();
      g.beginPath(); g.arc(ex + 0.3 * k, ey - 0.2, 0.25, 0, TAU); g.fillStyle = 'rgba(255,255,255,.8)'; g.fill();
    }
    g.beginPath(); g.moveTo(ex - 1.3 * k, ey - 1.5); g.lineTo(ex + 1.1 * k, ey - (hurt ? 1.3 : 1.9));
    g.lineWidth = 0.65; g.strokeStyle = hShade; g.stroke();
  }
  g.beginPath(); g.moveTo(hx + hr * 0.92, hy + 0.9); g.lineTo(hx + hr * 0.82, hy + 2.2); g.lineWidth = 0.5; g.strokeStyle = SKIN[1]; g.stroke();
  if (classId === 'assassin') { // cloth mask over nose and mouth
    g.beginPath(); g.moveTo(hx - hr * 0.35, hy + 1.6); g.quadraticCurveTo(hx + hr * 0.6, hy + 1.2, hx + hr * 1.02, hy + 1.7);
    g.lineTo(hx + hr * 0.7, hy + hr * 1.05); g.quadraticCurveTo(hx, hy + hr * 1.1, hx - hr * 0.4, hy + hr * 0.7); g.closePath(); ink(g, '#2a2c39', 0.6);
  } else {
    g.beginPath(); g.moveTo(hx + hr * 0.38, hy + 3.5); g.lineTo(hx + hr * 0.7, hy + (hurt ? 3.9 : 3.3)); g.lineWidth = 0.55; g.strokeStyle = '#6e4a40'; g.stroke();
  }
  if (gear.helm) { pieceGlow(g, gear.helm, hx, hy - 2, 8, t); drawHelm(g, gear.helm.tier, hx, hy, hr, t, gear.helm.rarity); }

  // front arm, weapon, hand on the grip
  const handX = 5.5 - swing * 0.5 + attack * 5, handY = -17 + bob - attack * 4;
  limb(g, 4.5, -26 + bob, handX, handY, 2.8, cMain);
  if (gear.weapon && classId) {
    const w = gear.weapon, rot = HOLD[classId](attack);
    g.save(); g.translate(handX, handY);
    if (w.rarity === MYTHIC && attack > 0) { // afterimages trailing the swing
      DOLL_FX.trail.forEach((a, i) => {
        g.save(); g.globalAlpha *= a * attack; g.rotate(rot - DOLL_FX.trailStep * (i + 1));
        drawWeapon(g, classId, w.tier, t, w.rarity); g.restore();
      });
    }
    g.rotate(rot);
    if (w.rarity >= 3 && w.rarity < DOLL_FX.glowFrom) pieceGlow(g, w, 0, -10, 7, t);
    weaponAura(g, w, t);
    drawWeapon(g, classId, w.tier, t, w.rarity);
    g.restore();
  }
  g.beginPath(); g.arc(handX, handY, 1.6, 0, TAU); ink(g, SKIN[0], 0.7);

  return { head: { x: hx, y: hy, r: hr }, body: { x: 0, y: -21 + bob }, hand: { x: handX, y: handY } };
}

// A crisp <canvas> portrait (idle pose) for menus; height in CSS px. Anime heroes (spec §39) get
// a square, front-facing, pixel-art portrait, and so do anime townsfolk; ?lama keeps the style-D 0.8-wide frame.
export function portrait(classId, look, height) {
  const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
  const anime = LOOK.anime && (classId || look.outfit); // anime heroes and townsfolk (spec §39)
  const width = Math.round(height * (anime ? 1 : 0.8));
  const c = document.createElement('canvas');
  c.width = Math.round(width * dpr); c.height = Math.round(height * dpr);
  c.style.width = `${width}px`; c.style.height = `${height}px`;
  const g = c.getContext('2d');
  const s = (c.height / (anime ? 70 : 52));
  g.translate(c.width / 2, c.height - (anime ? 4 : 3) * s);
  g.scale(s, s);
  g.beginPath(); g.ellipse(0, 0, 10, 2.4, 0, 0, TAU); g.fillStyle = 'rgba(0,0,0,.25)'; g.fill();
  if (anime) {
    const wings = classId ? pickWing({ classId, look, fx: {}, set: -1 }) : null;
    if (LOOK.pixel) { // pixel art (spec §39): draw half-size, pixelate, blit without smoothing
      const sm = document.createElement('canvas');
      sm.width = sm.height = Math.round(height / 2);
      const sg = sm.getContext('2d', { willReadFrequently: true });
      const ss = (sm.height / 70);
      sg.translate(sm.width / 2, sm.height - 4 * ss);
      sg.scale(ss, ss);
      sg.beginPath(); sg.ellipse(0, 0, 10, 2.4, 0, 0, TAU); sg.fillStyle = 'rgba(0,0,0,.25)'; sg.fill();
      drawDoll(sg, classId, look, { t: 1, anime: true, view: 'front', wings });
      const img = sg.getImageData(0, 0, sm.width, sm.height);
      pixelData(img.data, sm.width, sm.height, LOOK.pixel);
      sg.putImageData(img, 0, 0);
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, c.width, c.height);
      const smooth = g.imageSmoothingEnabled;
      g.imageSmoothingEnabled = false;
      g.drawImage(sm, 0, 0, c.width, c.height);
      g.imageSmoothingEnabled = smooth;
    } else {
      drawDoll(g, classId, look, { t: 1, anime: true, view: 'front', wings });
    }
  } else {
    drawDoll(g, classId, look, { t: 1 });
  }
  return c;
}
