// The painted ground of plan C2 as canvases and textures (art/groundart.js does the pixels).
// Built once per session per kind and detail, while a scene loads.
import * as THREE from 'three';
import { groundPixels, GROUND_P } from '../art/groundart.js';
import { LOOK } from '../data/look.js';

export { GROUND_P };
const CANVAS = new Map();
// kind: grass | dirt | cobble; k texels per game unit; o: groundPixels options (cell, flowers, tint)
export function groundCanvas(kind, k = 1, o = {}) {
  const key = `${kind}:${k}:${JSON.stringify(o)}`;
  let c = CANVAS.get(key);
  if (!c) {
    const { rgba, size } = groundPixels(kind, k, { unmute: LOOK.saturation, ...o });
    c = document.createElement('canvas'); c.width = c.height = size;
    c.getContext('2d').putImageData(new ImageData(rgba, size, size), 0, 0);
    CANVAS.set(key, c);
  }
  return c;
}
// a repeating texture of one pattern (period GROUND_P game units)
export function groundTexture(kind, k, o) {
  const t = new THREE.CanvasTexture(groundCanvas(kind, k, o));
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}
// a canvas pattern of it in game units (for a context already scaled to game units)
export function groundPattern(g, kind, k, o) {
  const c = groundCanvas(kind, k, o), p = g.createPattern(c, 'repeat');
  p.setTransform(new DOMMatrix().scale(GROUND_P / c.width));
  return p;
}
