// The app icon (spec §32), drawn by code like the rest of the art: a golden eclipse with a
// sword through it on the night sky. pwa/make-icons.mjs renders it to public/icons/*.png.
// pad: the share of the size kept clear around the art (maskable icons get cropped to a circle).
export function drawIcon(g, size, pad = 0.1) {
  const c = size / 2, R = size * (0.5 - pad) * 0.62;
  const bg = g.createRadialGradient(c, c * 0.9, 0, c, c, size * 0.75);
  bg.addColorStop(0, '#2a1a3e'); bg.addColorStop(0.6, '#140d1e'); bg.addColorStop(1, '#07050b');
  g.fillStyle = bg; g.fillRect(0, 0, size, size);
  // corona
  const co = g.createRadialGradient(c, c, R * 0.9, c, c, R * 1.9);
  co.addColorStop(0, 'rgba(255,214,130,.95)'); co.addColorStop(0.25, 'rgba(255,150,60,.45)'); co.addColorStop(1, 'rgba(255,120,40,0)');
  g.fillStyle = co; g.beginPath(); g.arc(c, c, R * 1.9, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ffe2a8'; g.beginPath(); g.arc(c, c, R * 1.04, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#0a0710'; g.beginPath(); g.arc(c - R * 0.06, c - R * 0.04, R, 0, Math.PI * 2); g.fill();
  // the sword, point down, through the eclipse
  const u = R / 100;
  g.save(); g.translate(c, c);
  g.lineJoin = 'round'; g.lineWidth = 5 * u; g.strokeStyle = '#07050b';
  const blade = new Path2D(); blade.moveTo(-9 * u, -70 * u); blade.lineTo(9 * u, -70 * u); blade.lineTo(9 * u, 95 * u); blade.lineTo(0, 120 * u); blade.lineTo(-9 * u, 95 * u); blade.closePath();
  const bl = g.createLinearGradient(-9 * u, 0, 9 * u, 0); bl.addColorStop(0, '#e8ecf4'); bl.addColorStop(0.5, '#ffffff'); bl.addColorStop(0.51, '#a8b0c4'); bl.addColorStop(1, '#8a92a8');
  g.fillStyle = bl; g.fill(blade); g.stroke(blade);
  g.fillStyle = '#c8962e'; g.beginPath(); g.roundRect(-44 * u, -82 * u, 88 * u, 14 * u, 5 * u); g.fill(); g.stroke();
  g.fillStyle = '#5a3418'; g.beginPath(); g.roundRect(-7 * u, -128 * u, 14 * u, 48 * u, 4 * u); g.fill(); g.stroke();
  g.fillStyle = '#e0b04a'; g.beginPath(); g.arc(0, -134 * u, 11 * u, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = '#ff5a3a'; g.beginPath(); g.arc(0, -75 * u, 5 * u, 0, Math.PI * 2); g.fill();
  g.restore();
}
