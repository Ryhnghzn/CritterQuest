// A big chest-up portrait of a townsperson for the talk panel (visual-novel style): the anime NPC
// from the front, aimed at the head the figure reports (hair top near the top, mid-chest at the
// bottom) — a fixed crop left the anime NPCs small and low (spec §45.2) — pixel art like the game
// when LOOK.pixel is on. cssH: height in CSS px (the width is 0.95 × that).
import { drawDoll } from './doll.js';
import { pixelData } from './pixeldata.js';
import { LOOK } from '../data/look.js';

const SPAN = 7.2;  // head radii from the hair top to mid-chest
const UP = 2;      // head radii from the head's centre up to the hair top (+ a little air)

export function npcBust(look, cssH) {
  const dpr = Math.min(globalThis.devicePixelRatio || 1, 2), cssW = Math.round(cssH * 0.95);
  const c = document.createElement('canvas');
  c.width = Math.round(cssW * dpr); c.height = Math.round(cssH * dpr);
  c.style.width = `${cssW}px`; c.style.height = `${cssH}px`;
  const P = LOOK.pixel, sm = document.createElement('canvas');
  sm.height = P ? Math.round(cssH / 2.2) : c.height; sm.width = Math.round(sm.height * 0.95);
  const pose = { t: 1, anime: LOOK.anime, view: 'front' };
  const probe = document.createElement('canvas').getContext('2d');
  const a = drawDoll(probe, null, look, pose);
  const head = a?.head || { x: 0, y: -53, r: 6.4 };
  const k = sm.height / (head.r * SPAN);
  const g = sm.getContext('2d', { willReadFrequently: true });
  g.translate(sm.width / 2 - head.x * k, sm.height * 0.06 + head.r * UP * k - head.y * k); g.scale(k, k);
  drawDoll(g, null, look, pose);
  if (P) { const img = g.getImageData(0, 0, sm.width, sm.height); pixelData(img.data, sm.width, sm.height, P); g.putImageData(img, 0, 0); }
  const out = c.getContext('2d'); out.imageSmoothingEnabled = !P;
  out.drawImage(sm, 0, 0, c.width, c.height);
  return c;
}
