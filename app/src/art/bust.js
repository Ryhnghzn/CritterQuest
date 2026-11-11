// A big chest-up portrait of a townsperson for the talk panel (visual-novel style): the anime NPC
// from the front, cropped from the top of the hair to mid-chest, pixel art like the game when
// LOOK.pixel is on. cssH: height in CSS px (the width is 0.95 × that).
import { drawDoll } from './doll.js';
import { pixelData } from './pixeldata.js';
import { LOOK } from '../data/look.js';

const TOP = -76, BOTTOM = -30; // the doll's own units (anime figure ≈ 70 tall, origin between the feet)

export function npcBust(look, cssH) {
  const dpr = Math.min(globalThis.devicePixelRatio || 1, 2), cssW = Math.round(cssH * 0.95);
  const c = document.createElement('canvas');
  c.width = Math.round(cssW * dpr); c.height = Math.round(cssH * dpr);
  c.style.width = `${cssW}px`; c.style.height = `${cssH}px`;
  const P = LOOK.pixel, sm = document.createElement('canvas');
  sm.height = P ? Math.round(cssH / 2.2) : c.height; sm.width = Math.round(sm.height * 0.95);
  const g = sm.getContext('2d', { willReadFrequently: true }), s = sm.height / (BOTTOM - TOP);
  g.translate(sm.width / 2, -TOP * s); g.scale(s, s);
  drawDoll(g, null, look, { t: 1, anime: LOOK.anime, view: 'front' });
  if (P) { const img = g.getImageData(0, 0, sm.width, sm.height); pixelData(img.data, sm.width, sm.height, P); g.putImageData(img, 0, 0); }
  const out = c.getContext('2d'); out.imageSmoothingEnabled = !P;
  out.drawImage(sm, 0, 0, c.width, c.height);
  return c;
}
