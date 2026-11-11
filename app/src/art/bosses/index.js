// The anime bosses (spec §41.2): monsters on the heroes' skeleton, one module per boss, each with
// a side view (facing right; left = mirrored) and a front view — no back view, a boss always faces
// the player. drawBoss draws one at boss size in doll units (origin between the feet), the same
// units as drawDoll, so the renderer scales it by DOLL_SCALE like the hero.
import { glow, BOSS_K } from './kit.js';
import { AURAS } from './aura.js';
import { pixelData } from '../pixeldata.js';
import * as lava from './lava.js';
import * as maw from './maw.js';
import * as spore from './spore.js';
import * as mummy from './mummy.js';
import * as crystal from './crystal.js';
import * as eclipse from './eclipse.js';

export const BOSS_ART = { boss: maw, crystalboss: crystal, sporeboss: spore, tombboss: mummy, lavaboss: lava, eclipseboss: eclipse };
export { AURAS as BOSS_AURAS, BOSS_K };
// the billboard box around the feet, game units (with DOLL_SCALE): x ∈ [−hx, hx], y ∈ [−ht, hb]
export const BOSS_BOX = { hx: 112, ht: 140, hb: 14 };

// view: 'right' | 'front' | 'left'; attack: 0..1 through a swing, or null; phase 2 = enraged
export function drawBoss(g, type, t, phase = 1, attack = null, view = 'right') {
  const A = BOSS_ART[type];
  if (!A) return false;
  glow(g, 0, -95 * BOSS_K, 95 * BOSS_K, A.GLOW, phase > 1 ? 0.55 : 0.38);
  g.save(); g.scale(view === 'left' ? -BOSS_K : BOSS_K, BOSS_K); g.lineJoin = 'round'; g.lineCap = 'round';
  if (view === 'front') A.front(g, t, phase); else A.side(g, t, phase, attack);
  g.restore();
  return true;
}

// A portrait for the DOM (bestiary): the front view, fitted to cssSize, pixelated like the game.
// P: the pixel settings (data/look.js LOOK.pixel) or null for the smooth picture.
export function bossPortrait(type, cssSize, P = null) {
  const dpr = Math.min(globalThis.devicePixelRatio || 1, 2), c = document.createElement('canvas');
  c.width = c.height = Math.round(cssSize * dpr); c.style.width = c.style.height = `${cssSize}px`;
  const small = document.createElement('canvas'), n = P ? Math.max(24, Math.round(cssSize * 0.8)) : c.width;
  small.width = small.height = n;
  const g = small.getContext('2d', { willReadFrequently: true }), fit = n / 190; // the front view (with horns, halo, wings) ≈ 180 doll units tall
  g.translate(n / 2, n * 0.96); g.scale(fit, fit);
  drawBoss(g, type, 1.2, 1, null, 'front');
  if (P) { const img = g.getImageData(0, 0, n, n); pixelData(img.data, n, n, P); g.putImageData(img, 0, 0); }
  const out = c.getContext('2d'); out.imageSmoothingEnabled = !P; out.drawImage(small, 0, 0, c.width, c.height);
  return c;
}
