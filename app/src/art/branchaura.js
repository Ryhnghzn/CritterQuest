// Job Lanjutan aura (spec §43.10): sparks in the branch's colour rising round the hero's feet and a
// slow ring on the ground, so a branched hero is told apart at a glance. Squares only (they stay
// crisp through the pixel filter); everything moves with t, no Math.random. (x, y) = the feet.
const TAU = Math.PI * 2;
export function branchAura(g, x, y, color, t, lite = false) {
  g.save();
  g.fillStyle = color;
  const n = lite ? 8 : 16;
  for (let i = 0; i < n; i++) { // the ring: squares turning slowly on a flat ellipse
    const a = t * 0.8 + (i / n) * TAU;
    g.globalAlpha = 0.35 + 0.25 * Math.sin(t * 3 + i);
    g.fillRect(Math.round(x + Math.cos(a) * 22) - 1, Math.round(y + Math.sin(a) * 6) - 1, 2, 2);
  }
  const m = lite ? 6 : 12;
  for (let i = 0; i < m; i++) { // sparks rising and fading
    const k = (t * (0.35 + (i % 4) * 0.07) + i * 0.173) % 1;
    g.globalAlpha = 0.85 * (1 - k);
    const s = k < 0.3 ? 2 : 1;
    g.fillRect(Math.round(x + Math.sin(i * 7.3 + t * 0.6) * 16), Math.round(y - 4 - k * 64), s, s);
  }
  g.restore();
}
