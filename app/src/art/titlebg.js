// Title backdrop "Api Unggun" (spec §29): night at the forest edge under the eclipse, a campfire
// with flickering light and rising embers. The painted backdrop (public/img/title_bg.webp) is
// drawn to cover the screen; the light and embers are drawn on top of it. Until it has loaded
// (or if it fails) the same night is drawn by code, with the fire in the same spot. Drawn in
// CSS pixels (the caller sets the device-pixel transform); the four classes sit around it as
// DOM portraits (ui/title.js), placed with artPoint().
const TAU = Math.PI * 2;
const AR = 2752 / 1536;                 // the painting's aspect
const FOCUS = { x: 0.66, y: 0.4 };      // where the fire lands across the screen; how much of the vertical crop comes off the top
// spots in the painting, as fractions of its size
export const ART = {
  fire: { x: 0.695, y: 0.8 },
  moon: { x: 0.74, y: 0.16, r: 0.075 },
  torches: [{ x: 0.898, y: 0.52 }, { x: 0.955, y: 0.47 }],
};

const art = typeof Image === 'function' ? new Image() : null;
let artAt = 0; // when the painting finished loading (0: not yet / failed)
if (art) {
  art.onload = () => { artAt = performance.now(); };
  art.src = 'img/title_bg.webp';
}

// The painting covers a w × h screen: its size and offset in CSS pixels. Wide screens crop
// top and bottom; narrow ones crop the sides, keeping the fire near FOCUS.x.
function cover(w, h) {
  const W = Math.max(w, h * AR), H = W / AR;
  const x = Math.min(0, Math.max(w - W, w * FOCUS.x - ART.fire.x * W));
  return { x, y: (h - H) * FOCUS.y, W, H };
}

// A spot in the painting (fractions) on the screen: { x, y } in px, and k = the painting's height in px.
export function artPoint(w, h, fx, fy) {
  const c = cover(w, h);
  return { x: c.x + fx * c.W, y: c.y + fy * c.H, k: c.H };
}

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

// the night drawn by code: shown while the painting loads, or if it can't
function drawNight(g, w, h, t) {
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#07060f'); sky.addColorStop(0.55, '#1a1026'); sky.addColorStop(1, '#0b0709');
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  for (const s of STARS) {
    const a = 0.35 + 0.65 * Math.abs(Math.sin(t * (0.5 + s.s) + s.p * 9));
    g.fillStyle = `rgba(235,225,255,${a * (0.3 + s.s * 0.7)})`;
    g.fillRect(s.x * w, s.y * h * 0.5, 1 + s.s * 1.2, 1 + s.s * 1.2);
  }
  const m = artPoint(w, h, ART.moon.x, ART.moon.y), mr = m.k * ART.moon.r;
  glow(g, m.x, m.y, mr * 3, '255,190,120', 0.3);
  g.fillStyle = '#ffd9a0'; g.beginPath(); g.arc(m.x, m.y, mr * 1.08, 0, TAU); g.fill();
  g.fillStyle = '#07060f'; g.beginPath(); g.arc(m.x, m.y, mr, 0, TAU); g.fill();
  treeline(g, w, h, h * 0.62, '#120b16', 1, h * 0.22);
  treeline(g, w, h, h * 0.7, '#0c0810', 4, h * 0.16);
  g.fillStyle = '#0a0709'; g.fillRect(0, h * 0.7, w, h);
  const f = artPoint(w, h, ART.fire.x, ART.fire.y), s = f.k / 540;
  g.fillStyle = '#3a2216';
  for (const a of [-0.5, 0.5]) { g.save(); g.translate(f.x, f.y); g.rotate(a); g.fillRect(-34 * s, -5 * s, 68 * s, 10 * s); g.restore(); }
  flame(g, f.x, f.y, s, t);
}

export function drawCampfire(g, w, h, t) {
  const fade = artAt ? Math.min(1, (performance.now() - artAt) / 400) : 0;
  if (fade < 1) drawNight(g, w, h, t);
  if (fade > 0) {
    const c = cover(w, h);
    g.globalAlpha = fade; g.drawImage(art, c.x, c.y, c.W, c.H); g.globalAlpha = 1;
  }
  const f = artPoint(w, h, ART.fire.x, ART.fire.y), s = f.k / 540;
  const pulse = 1 + Math.sin(t * 5) * 0.04 + Math.sin(t * 13) * 0.02;
  g.globalCompositeOperation = 'lighter'; // the light flickers over the painted fire
  glow(g, f.x, f.y - 30 * s, f.k * 0.45 * pulse, '255,120,40', 0.16 + Math.sin(t * 7) * 0.03);
  ART.torches.forEach((p, i) => {
    const q = artPoint(w, h, p.x, p.y);
    glow(g, q.x, q.y, f.k * (0.07 + Math.sin(t * 8 + i * 2) * 0.008), '255,150,60', 0.22);
  });
  g.globalCompositeOperation = 'source-over';
  for (const e of EMBERS) {
    const life = (t * (0.25 + e.s * 0.3) + e.p) % 1;
    const x = f.x + (e.x - 0.5) * 60 * s + Math.sin(t * 2 + e.p * 9) * 20 * s * life, y = f.y - 30 * s - life * f.k * 0.5;
    g.fillStyle = `rgba(255,${Math.round(150 + e.s * 90)},80,${(1 - life) * 0.9})`;
    g.fillRect(x, y, 2, 2);
  }
}
