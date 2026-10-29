// Title backdrop "Api Unggun" (spec §29): night at the forest edge — stars, the moon, two
// tree lines, and a campfire with flickering flames and rising embers. Drawn in CSS pixels
// (the caller sets the device-pixel transform); the four classes sit around it as DOM
// portraits (ui/title.js), placed against FIRE.
const TAU = Math.PI * 2;
export const FIRE = { x: 0.6, y: 0.86 }; // the fire, as a fraction of the screen

// a fixed scatter of points (stars, embers) — the same every frame
const scatter = (n, seed) => Array.from({ length: n }, (_, i) => {
  const r = (k) => { const x = Math.sin((i + 1) * 12.9898 * k + seed * 78.233) * 43758.5453; return x - Math.floor(x); };
  return { x: r(1), y: r(2), s: r(3), p: r(4) };
});
const STARS = scatter(140, 1), EMBERS = scatter(60, 2);

function glow(g, x, y, r, rgb, a) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
}

function treeline(g, w, h, y, color, seed, tall) {
  g.fillStyle = color;
  g.beginPath(); g.moveTo(0, h);
  for (let x = 0; x <= w + 20; x += 18) {
    const k = Math.sin(x * 0.013 + seed) * 0.5 + Math.sin(x * 0.051 + seed * 3) * 0.5;
    g.lineTo(x, y - tall * (0.55 + 0.45 * k)); g.lineTo(x + 9, y - tall * (0.2 + 0.3 * Math.abs(k)));
  }
  g.lineTo(w, h); g.closePath(); g.fill();
}

function flame(g, x, y, s, t) {
  for (let i = 0; i < 3; i++) {
    const k = 1 - i * 0.28, wob = Math.sin(t * 9 + i * 2) * 4 * s;
    const gr = g.createLinearGradient(0, y - 90 * s * k, 0, y);
    gr.addColorStop(0, 'rgba(255,240,180,0)'); gr.addColorStop(0.4, ['#ff7a2a', '#ffb03a', '#fff1b3'][i]); gr.addColorStop(1, ['#c8321e', '#ff6a1a', '#ffd166'][i]);
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(x - 28 * s * k, y);
    g.quadraticCurveTo(x - 30 * s * k, y - 40 * s * k, x + wob, y - (80 + Math.sin(t * 7 + i) * 10) * s * k);
    g.quadraticCurveTo(x + 30 * s * k, y - 40 * s * k, x + 28 * s * k, y); g.closePath(); g.fill();
  }
}

export function drawCampfire(g, w, h, t) {
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#07060f'); sky.addColorStop(0.55, '#1a1026'); sky.addColorStop(1, '#0b0709');
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  for (const s of STARS) {
    const a = 0.35 + 0.65 * Math.abs(Math.sin(t * (0.5 + s.s) + s.p * 9));
    g.fillStyle = `rgba(235,225,255,${a * (0.3 + s.s * 0.7)})`;
    g.fillRect(s.x * w, s.y * h * 0.5, 1 + s.s * 1.2, 1 + s.s * 1.2);
  }
  const mx = w * 0.8, my = h * 0.15, mr = Math.max(10, h * 0.03);
  glow(g, mx, my, mr * 4.5, '255,236,200', 0.25);
  g.fillStyle = '#efe4c8'; g.beginPath(); g.arc(mx, my, mr, 0, TAU); g.fill();
  treeline(g, w, h, h * 0.62, '#120b16', 1, h * 0.22);
  treeline(g, w, h, h * 0.7, '#0c0810', 4, h * 0.16);
  g.fillStyle = '#0a0709'; g.fillRect(0, h * 0.7, w, h);
  const fx = w * FIRE.x, fy = h * FIRE.y, s = h / 540;
  const pulse = 1 + Math.sin(t * 5) * 0.04 + Math.sin(t * 13) * 0.02;
  glow(g, fx, fy - 20 * s, h * 0.55 * pulse, '255,140,60', 0.42);
  g.fillStyle = '#3a2216';
  for (const a of [-0.5, 0.5]) { g.save(); g.translate(fx, fy); g.rotate(a); g.fillRect(-34 * s, -5 * s, 68 * s, 10 * s); g.restore(); }
  flame(g, fx, fy, s, t);
  for (const e of EMBERS) {
    const life = (t * (0.25 + e.s * 0.3) + e.p) % 1;
    const x = fx + (e.x - 0.5) * 60 * s + Math.sin(t * 2 + e.p * 9) * 20 * s * life, y = fy - 30 * s - life * h * 0.55;
    g.fillStyle = `rgba(255,${Math.round(150 + e.s * 90)},80,${(1 - life) * 0.9})`;
    g.fillRect(x, y, 2, 2);
  }
}
