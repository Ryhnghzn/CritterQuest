// Pixel-art filter (spec §39): hard edges (soft alpha dithered with a 4×4 Bayer pattern),
// colours rounded to fewer steps, a 1-pixel ink outline around the solid body. Shared by the
// 3D pixel layer (render3d/pixelate.js) and the item icons (art/gear.js drawItemIcon). Pure:
// no three.js, no DOM, no data/look import — the settings P must be passed in.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
let solidBuf = new Uint8Array(0);

// turns RGBA pixels (as getImageData gives them) into pixel art, in place
export function pixelData(d, w, h, P) {
  if (solidBuf.length < w * h) solidBuf = new Uint8Array(w * h);
  const solid = solidBuf, step = 255 / P.levels, [ir, ig, ib] = P.ink;
  for (let j = 0, n = w * h; j < n; j++) {
    const i = j * 4, a = d[i + 3] / 255;
    solid[j] = a > P.solid ? 1 : 0;
    const x = j % w, y = (j / w) | 0;
    if (a <= BAYER[(y & 3) * 4 + (x & 3)] * 0.9 + 0.05) { d[i + 3] = 0; continue; }
    for (let k = 0; k < 3; k++) d[i + k] = Math.round(d[i + k] / step) * step; // canvas data is not premultiplied
    d[i + 3] = 255;
  }
  for (let j = 0, n = w * h; j < n; j++) { // the outline: empty pixels touching the solid body
    const i = j * 4;
    if (d[i + 3] || solid[j]) continue;
    const x = j % w;
    if ((x > 0 && solid[j - 1]) || (x < w - 1 && solid[j + 1]) || (j >= w && solid[j - w]) || (j < n - w && solid[j + w])) {
      d[i] = ir; d[i + 1] = ig; d[i + 2] = ib; d[i + 3] = 255;
    }
  }
  return d;
}