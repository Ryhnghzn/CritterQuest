// Anime style drawing kit (spec §39): smooth curved shapes, hard cel shadows with the key light
// at the top-left, a cool rim light on the right edge, a thick ink outline. Frame of every
// figure: ~165 units tall, origin between the feet, facing right; Z converts the style-D
// skeleton (art/hero/rig.js, ~80 units) into it.
export const TAU = Math.PI * 2;
export const INK = '#130b1a';
export const Z = 2.06;
export const P = (p) => [p.x * Z, p.y * Z];

// a smooth closed (or open) path through points; [x, y, 1] = a sharp corner
export function trace(g, pts, closed = true) {
  const n = pts.length, Q = (i) => pts[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
  g.moveTo(pts[0][0], pts[0][1]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = Q(i - 1), p1 = Q(i), p2 = Q(i + 1), p3 = Q(i + 2);
    const c1 = p1[2] ? p1 : [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = p2[2] ? p2 : [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    g.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], p2[0], p2[1]);
  }
  if (closed) g.closePath();
}
const shifted = (pts, dx, dy) => pts.map((p) => [p[0] + dx, p[1] + dy, p[2]]);

// a cel-shaded part: base, a hard shadow away from the light, a bright edge toward it,
// a rim light on the right edge (P.rim: colour, null = none), then the outline
export function part(g, pts, Pl, { sd = 3, lw = 2.2, rim = true } = {}) {
  g.save();
  g.beginPath(); trace(g, pts); g.clip();
  g.fillStyle = Pl.hi; g.fillRect(-500, -500, 1000, 1000);
  g.beginPath(); trace(g, shifted(pts, 0.9, 0.9)); g.fillStyle = Pl.base; g.fill();
  g.beginPath(); g.rect(-500, -500, 1000, 1000); trace(g, shifted(pts, -sd * 0.8, -sd)); g.fillStyle = Pl.shade; g.fill('evenodd');
  if (rim && Pl.rim !== null) { g.beginPath(); g.rect(-500, -500, 1000, 1000); trace(g, shifted(pts, 1.4, 0)); g.fillStyle = Pl.rim || 'rgba(120,220,255,.7)'; g.fill('evenodd'); }
  g.restore();
  g.beginPath(); trace(g, pts); g.lineWidth = lw; g.strokeStyle = INK; g.lineJoin = 'round'; g.stroke();
}
export function stroke(g, pts, color = INK, w = 0.9, closed = false) {
  g.beginPath(); trace(g, pts, closed); g.lineWidth = w; g.strokeStyle = color; g.lineCap = 'round'; g.stroke();
}
export function fill(g, pts, color) { g.beginPath(); trace(g, pts); g.fillStyle = color; g.fill(); }
export function glow(g, x, y, r, c, a = 1) {
  if (a <= 0 || r <= 0) return;
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(1, a);
  const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.restore();
}
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export function mix(a, b, k) { const A = hex(a), B = hex(b); return `#${A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join('')}`; }
export const pal = (base, o = {}) => ({ base, shade: o.shade || mix(base, '#140a24', 0.55), hi: o.hi || mix(base, '#fff6e8', 0.45), rim: o.rim });
// the far side of the body: darker, no rim light
const FAR = new WeakMap();
export function far(Pl) {
  let d = FAR.get(Pl);
  if (!d) { d = { base: mix(Pl.base, '#0a0612', 0.45), shade: mix(Pl.shade, '#0a0612', 0.4), hi: mix(Pl.hi, '#0a0612', 0.5), rim: null }; FAR.set(Pl, d); }
  return d;
}
// a tapered, slightly bulging limb outline a→b
export function limb(a, b, w1, w2, bulge = 1.1) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  const m = [a[0] + dx * 0.4, a[1] + dy * 0.4], wm = Math.max(w1, w2) * bulge;
  return [[a[0] + nx * w1 / 2, a[1] + ny * w1 / 2], [m[0] + nx * wm / 2, m[1] + ny * wm / 2], [b[0] + nx * w2 / 2, b[1] + ny * w2 / 2],
    [b[0] - nx * w2 / 2, b[1] - ny * w2 / 2], [m[0] - nx * wm / 2, m[1] - ny * wm / 2], [a[0] - nx * w1 / 2, a[1] - ny * w1 / 2]];
}
export const lerp2 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
export const dir = (a) => [Math.sin(a), Math.cos(a)];
// in a weapon frame: rotate so +x points along the angle ψ (from straight down, + = forward)
export const alongPsi = (g, at, psi) => { g.translate(at[0], at[1]); g.rotate(Math.atan2(Math.cos(psi), Math.sin(psi))); };
export const wave = (t, i, amp) => Math.sin(t * 2.2 + i * 0.9) * amp;
// a zigzag hem from x0 to x1 at y, its teeth flapping
export function hem(x0, x1, y, t, amp, n = 7, tooth = 5) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const k = i / n; pts.push([x0 + (x1 - x0) * k + wave(t, i, amp), y + (i % 2 ? -tooth : 0) + wave(t, i + 3, amp * 0.5), i % 2 ? 0 : 1]); }
  return pts;
}
