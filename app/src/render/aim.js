// The aim marker on the floor (spec §37): run/aim.js gives the shape in world units, this
// draws it on the 2D canvas through toScreen (world → CSS px; the 2.5D camera or the flat
// view), so it lies flat in perspective in both views. Thin gold line, faint fill; the outer
// limit dashed.
const GOLD = 'rgba(230,201,122,.85)', FILL = 'rgba(230,201,122,.13)', LIMIT = 'rgba(235,228,210,.4)';

function outline(shape) {
  const pts = [];
  if (shape.type === 'circle') {
    for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2; pts.push([shape.x + Math.cos(a) * shape.r, shape.y + Math.sin(a) * shape.r]); }
  } else if (shape.type === 'strip') {
    const c = Math.cos(shape.angle), s = Math.sin(shape.angle), h = shape.w / 2, L = shape.len, tip = Math.min(L * 0.25, shape.w * 1.2);
    const at = (f, side) => [shape.x + c * f - s * side, shape.y + s * f + c * side];
    pts.push(at(0, -h), at(L - tip, -h), at(L - tip, -h * 1.7), at(L, 0), at(L - tip, h * 1.7), at(L - tip, h), at(0, h));
  } else if (shape.type === 'cone') {
    const half = (shape.spread * Math.PI) / 360;
    pts.push([shape.x, shape.y]);
    for (let i = 0; i <= 24; i++) { const a = shape.angle - half + (i / 24) * half * 2; pts.push([shape.x + Math.cos(a) * shape.r, shape.y + Math.sin(a) * shape.r]); }
  }
  return pts;
}

export function drawAim(g, shapes, toScreen, dpr, t) {
  g.save();
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.lineJoin = 'round';
  for (const sh of shapes) {
    const pts = outline(sh).map(([x, y]) => toScreen(x, y));
    if (pts.some((p) => !p)) continue;
    g.beginPath();
    pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
    g.closePath();
    if (sh.range) {
      g.setLineDash([6, 6]); g.lineDashOffset = -t * 20; g.lineWidth = 1.5; g.strokeStyle = LIMIT; g.stroke(); g.setLineDash([]);
    } else {
      g.fillStyle = FILL; g.fill();
      g.lineWidth = 2; g.strokeStyle = GOLD; g.stroke();
    }
  }
  g.restore();
}
