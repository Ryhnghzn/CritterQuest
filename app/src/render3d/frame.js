// Dark leafy branches peeking in at the top corners of the screen (plan C4, the look
// prototype's framing branch): a hint of standing inside the wood, in green places only.
// Drawn on the 2D overlay under the labels; they sway a little.
import { frameBranch } from '../art/pix/props.js';

const K = 4;
let pic = null;
function branch() {
  if (pic) return pic;
  const sp = frameBranch(3, K), c = document.createElement('canvas');
  c.width = sp.w; c.height = sp.h;
  c.getContext('2d').putImageData(new ImageData(sp.rgba(), sp.w, sp.h), 0, 0);
  return (pic = c);
}
// g: the overlay context (device pixels), W × H device pixels, t seconds
export function drawFrame(g, W, H, t) {
  const c = branch(), w = Math.min(W * 0.3, H * 0.5), h = (w * c.height) / c.width;
  g.save();
  g.globalAlpha = 0.92;
  for (const side of [-1, 1]) {
    g.setTransform(side, 0, 0, 1, side < 0 ? W : 0, 0);
    g.translate(-w * 0.12, -h * 0.18);
    g.rotate(Math.sin(t * 0.7 + side) * 0.015);
    g.drawImage(c, 0, 0, w, h);
  }
  g.restore();
}
