// Style-D drawing kit: hard cel shading with the key light at the screen's top-left,
// a coloured rim light on the far edge, comic hatching in the shadow, thin ink lines.
// A palette P = { base, shade, hi, rim?, hatch? }.
export const TAU = Math.PI * 2;
export const INK = '#0b0710';
const LX = -0.74, LY = -0.67;

// a screen direction expressed in the current local frame (unit length); works mirrored too
function ldir(g, vx, vy) {
  const m = g.getTransform?.();
  if (!m) return [vx, vy];
  const det = m.a * m.d - m.b * m.c || 1;
  const x = (m.d * vx - m.c * vy) / det, y = (-m.b * vx + m.a * vy) / det, l = Math.hypot(x, y) || 1;
  return [x / l, y / l];
}

// build(): adds the outline to the current path (moveTo/lineTo only, no beginPath)
export function cel(g, build, P, sd = 3, hd = 0.9, lw = 1.2) {
  const [lx, ly] = ldir(g, LX, LY), [rx, ry] = ldir(g, 1, 0.2), BIG = 400;
  const at = (dx, dy) => { g.save(); g.translate(dx, dy); build(); g.restore(); };
  g.save();
  g.beginPath(); build(); g.clip();
  g.fillStyle = P.hi; g.fillRect(-BIG, -BIG, BIG * 2, BIG * 2);
  g.beginPath(); at(-lx * hd, -ly * hd); g.fillStyle = P.base; g.fill();
  g.beginPath(); g.rect(-BIG, -BIG, BIG * 2, BIG * 2); at(lx * sd, ly * sd); g.fillStyle = P.shade; g.fill('evenodd');
  if (P.rim) { g.beginPath(); g.rect(-BIG, -BIG, BIG * 2, BIG * 2); at(-rx * 1.1, -ry * 1.1); g.fillStyle = P.rim; g.fill('evenodd'); }
  if (P.hatch) {
    g.beginPath(); g.rect(-BIG, -BIG, BIG * 2, BIG * 2); at(lx * sd * 0.55, ly * sd * 0.55); g.clip('evenodd');
    g.beginPath();
    for (let i = -60; i < 60; i += 2.2) { g.moveTo(i - 40, -40); g.lineTo(i + 40, 40); }
    g.lineWidth = 0.35; g.strokeStyle = 'rgba(0,0,0,.45)'; g.stroke();
  }
  g.restore();
  g.beginPath(); build(); g.lineWidth = lw; g.strokeStyle = INK; g.lineJoin = 'miter'; g.miterLimit = 3; g.stroke();
}

export const poly = (g, pts) => () => {
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.closePath();
};
export const fillPoly = (g, pts, P, sd, hd, lw) => cel(g, poly(g, pts), P, sd, hd, lw);

// angular limb: a hexagon with a bulge (muscle) at `at` along the bone
export function limbPts(a, b, w1, wm, w2, at = 0.4) {
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, nx = -uy, ny = ux;
  const A = { x: a.x - ux * w1 * 0.3, y: a.y - uy * w1 * 0.3 }, B = { x: b.x + ux * w2 * 0.3, y: b.y + uy * w2 * 0.3 };
  const M = { x: a.x + dx * at, y: a.y + dy * at };
  return [[A.x + nx * w1 / 2, A.y + ny * w1 / 2], [M.x + nx * wm / 2, M.y + ny * wm / 2], [B.x + nx * w2 / 2, B.y + ny * w2 / 2],
    [B.x - nx * w2 / 2, B.y - ny * w2 / 2], [M.x - nx * wm / 2, M.y - ny * wm / 2], [A.x - nx * w1 / 2, A.y - ny * w1 / 2]];
}

export function glow(g, x, y, r, c, a = 1) {
  if (a <= 0 || r <= 0) return;
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.globalAlpha = Math.min(1, a);
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  g.restore();
}

// colour helpers
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export function mix(a, b, k) {
  const A = hex(a), B = hex(b);
  return `#${A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join('')}`;
}
// a cel palette from one base colour
export const pal = (base, extra = {}) => ({ base, shade: mix(base, '#120818', 0.72), hi: mix(base, '#fff1d6', 0.42), ...extra });
// limbs on the far side: darker, no rim light
const DIM = new WeakMap();
export function dim(P) {
  let d = DIM.get(P);
  if (!d) { d = { base: mix(P.base, '#0b0710', 0.38), shade: mix(P.shade, '#0b0710', 0.3), hi: mix(P.hi, '#0b0710', 0.45), hatch: P.hatch }; DIM.set(P, d); }
  return d;
}
