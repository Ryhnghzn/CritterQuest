// Monsters that move (plan docs/superpowers/plans/2026-11-13-hybrid-visual.md bagian 6): each kind listed in
// LOOK.foeFrames is painted ONCE into a sheet of frames (art/foeanim.js FRAME_PLAN) the first time one is seen,
// with the same size and pixel filter as its old single picture. Every monster on screen then only moves the
// window of its own texture copy (which shares the sheet's image on the GPU) to the frame it is in: no drawing
// while playing.
import * as THREE from 'three';
import { LOOK } from '../data/look.js';
import { FOE_ANIM, FOE_ANIM_COLORS, FRAME_PLAN, framePose } from '../art/foeanim.js';
import { ENEMIES } from '../data/enemies.js';
import { artExt } from '../art/monsters.js';
import { FOE_UNIT } from '../art/foes.js';
import { pixelateCanvas, pixelTexture } from './pixelate.js';

const SHEETS = new Map();
const SUPER = 2; // painted this many times larger, then shrunk smoothly (like render3d/pixelate.js pixelCopy)

// the sheet of a kind, painted on first use; null when the kind has none (or the feature is off)
export function foeSheet(type) {
  const F = LOOK.foeFrames;
  if (!F || !FOE_ANIM[type] || !F.types.includes(type)) return null;
  let s = SHEETS.get(type);
  if (s) return s;
  const t0 = performance.now();
  const r = ENEMIES[type].r, ext = r * artExt(type), k = LOOK.pixel ? LOOK.pixel.k : 3;
  const size = Math.max(4, Math.round(ext * 2 * k)), pad = 2, cell = size + pad * 2;
  const frames = FRAME_PLAN.flatMap(([state, n]) => Array.from({ length: n }, (_, i) => [state, i, n]));
  const cols = Math.ceil(Math.sqrt(frames.length)), rows = Math.ceil(frames.length / cols);
  const c = document.createElement('canvas'); c.width = cols * cell; c.height = rows * cell;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingQuality = 'high';
  const tmp = document.createElement('canvas'); tmp.width = tmp.height = size * SUPER;
  const tg = tmp.getContext('2d');
  const index = {};
  frames.forEach(([state, i, n], j) => {
    (index[state] ||= []).push(j);
    tg.setTransform(1, 0, 0, 1, 0, 0); tg.clearRect(0, 0, tmp.width, tmp.height);
    const sc = tmp.width / (ext * 2);
    tg.setTransform(sc, 0, 0, sc, tmp.width / 2, tmp.height / 2); tg.lineJoin = 'round';
    tg.scale(r / FOE_UNIT, r / FOE_UNIT); // the anime kit's frame, as art/monsters.js BEAST_OVERRIDES
    FOE_ANIM[type](tg, FOE_ANIM_COLORS[type], framePose(state, i, n));
    g.drawImage(tmp, (j % cols) * cell + pad, Math.floor(j / cols) * cell + pad, size, size);
  });
  tmp.width = tmp.height = 0; // free the scratch pixels now (iPhone)
  if (LOOK.pixel) pixelateCanvas(c, LOOK.pixel);
  const tex = pixelTexture(new THREE.CanvasTexture(c));
  tex.colorSpace = THREE.SRGBColorSpace;
  s = { tex, cols, rows, cell, pad, size, W: c.width, H: c.height, index, ext, ms: performance.now() - t0 };
  console.info(`[cq] foe frames ${type}: ${frames.length} frames, ${c.width}×${c.height} px (${((c.width * c.height * 4) / 1048576).toFixed(2)} MB), ${s.ms.toFixed(1)} ms`);
  SHEETS.set(type, s);
  return s;
}

// a monster's own window on the sheet (a texture copy: the GPU keeps one image for all of them)
export function frameTex(sheet) {
  const t = sheet.tex.clone();
  t.repeat.set(sheet.size / sheet.W, sheet.size / sheet.H);
  return t;
}
// move that window to frame j (rows counted from the top of the picture)
export function showFrame(tex, sheet, j) {
  const col = j % sheet.cols, row = Math.floor(j / sheet.cols);
  tex.offset.set((col * sheet.cell + sheet.pad) / sheet.W, 1 - (row * sheet.cell + sheet.pad + sheet.size) / sheet.H);
}
