// Pixel art characters (spec §39): the figures are drawn as now, but small (LOOK.pixel.k pixels
// per game unit, the same for the hero, townsfolk and monsters so the pixels match), then turned
// into pixel art: hard edges (soft alpha dithered with a 4×4 Bayer pattern, so glows become
// dotted), colours rounded to fewer steps, a 1-pixel ink outline around the solid body. The
// texture is shown enlarged without smoothing. `?lama` = the smooth pictures.
import * as THREE from 'three';
import { LOOK } from '../data/look.js';
import { pixelData } from '../art/pixeldata.js';

export { pixelData };

export function pixelateCanvas(c, P = LOOK.pixel) {
  if (!P || !c.width || !c.height) return;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.setTransform(1, 0, 0, 1, 0, 0);
  const img = g.getImageData(0, 0, c.width, c.height);
  pixelData(img.data, c.width, c.height, P);
  g.putImageData(img, 0, 0);
}

// a pixel-art copy of a baked sprite covering 2·ext game units (monsters)
export function pixelCopy(src, ext, P = LOOK.pixel) {
  const c = document.createElement('canvas');
  c.width = c.height = Math.max(4, Math.round(ext * 2 * P.k));
  const g = c.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingQuality = 'high';
  g.drawImage(src, 0, 0, c.width, c.height);
  pixelateCanvas(c, P);
  return c;
}

// enlarged without smoothing; shrunk smoothly (no mipmaps: the pictures are tiny)
export function pixelTexture(tex) {
  if (!LOOK.pixel) return tex;
  tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  return tex;
}