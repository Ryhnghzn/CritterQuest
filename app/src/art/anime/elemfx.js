// Element effects on a weapon (spec §39): each element has its own look, drawn in the weapon's
// frame (+x along the blade from 0 to len, half-width w). Flames, mist and drops follow the
// world's up/down, not the blade. Particles come from time and index only (no RNG).
// A sink can collect the effects instead of drawing them, so pixel-art figures can show their
// effects smooth on top (HD-2D look): setFxSink([]) → draw → setFxSink(null) → drawFx(...).
import { TAU } from './kit.js';

let sink = null, behind = false;
export const setFxSink = (arr) => { sink = arr; };
// while on, collected effects belong to a weapon behind the body (the back view): drawFx hides them
// where the figure already on the canvas covers them (spec §49)
export const fxBehind = (on) => { behind = on; };

// a world direction (screen down = +y) in the current local frame, unit length
function local(g, vx, vy) {
  const m = g.getTransform?.();
  if (!m) return [vx, vy];
  const det = m.a * m.d - m.b * m.c || 1;
  const x = (m.d * vx - m.c * vy) / det, y = (-m.b * vx + m.a * vy) / det, l = Math.hypot(x, y) || 1;
  return [x / l, y / l];
}
const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

export function weaponFx(g, E, t, len, w = 8, start = 8) {
  if (E.fx === 'none') return; // plain steel (common items)
  if (sink) { sink.push({ m: g.getTransform(), E, t, len, w, start, behind }); return; }
  (FX[E.fx] || FX.ice)(g, E, t, len, w, start);
}
// draw collected effects; base: a DOMMatrix from the collecting canvas to the screen
export function drawFx(g, list, base) {
  const one = (gg, f) => { gg.save(); gg.setTransform(base.multiply(f.m)); (FX[f.E.fx] || FX.ice)(gg, f.E, f.t, f.len, f.w, f.start); gg.restore(); };
  const back = list.filter((f) => f.behind), c = g.canvas;
  for (const f of list) if (!f.behind || !c?.width || typeof document === 'undefined') one(g, f);
  if (!back.length || !c?.width || typeof document === 'undefined') return;
  // behind the body: paint them apart, cut out the figure's shape, lay what is left on the canvas
  const tmp = (drawFx.tmp ||= document.createElement('canvas'));
  if (tmp.width !== c.width || tmp.height !== c.height) { tmp.width = c.width; tmp.height = c.height; }
  const tg = tmp.getContext('2d');
  tg.setTransform(1, 0, 0, 1, 0, 0); tg.globalCompositeOperation = 'source-over'; tg.globalAlpha = 1; tg.clearRect(0, 0, tmp.width, tmp.height);
  for (const f of back) one(tg, f);
  tg.setTransform(1, 0, 0, 1, 0, 0); tg.globalAlpha = 1; tg.globalCompositeOperation = 'destination-out';
  tg.drawImage(c, 0, 0);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'lighter';
  g.drawImage(tmp, 0, 0);
  g.restore();
}

function blob(g, x, y, r, inner, outer, a) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, inner); gr.addColorStop(1, outer);
  g.globalAlpha = a; g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
}
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

const FX = {
  // tongues of flame licking up off the blade, embers rising and flickering out
  fire(g, E, t, len, w, s0) {
    const [ux, uy] = local(g, 0, -1);
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 9; i++) {
      const x = s0 + (len - s0) * ((i + 0.5) / 9), ph = (t * 2.6 + hash(i)) % 1, h = (8 + hash(i + 9) * 8) * (1 - ph * 0.4);
      const bx = x + ux * w * 0.5, by = uy * w * 0.5, tx = bx + ux * h + Math.sin(t * 9 + i) * 1.6, ty = by + uy * h;
      g.globalAlpha = 0.75 * (1 - ph * 0.5);
      const gr = g.createLinearGradient(bx, by, tx, ty); gr.addColorStop(0, '#fff2a0'); gr.addColorStop(0.4, E.glow); gr.addColorStop(1, 'rgba(255,40,0,0)');
      g.fillStyle = gr; g.beginPath();
      g.moveTo(bx - uy * 3.4, by + ux * 3.4); g.quadraticCurveTo(bx + ux * h * 0.5 - uy * 4, by + uy * h * 0.5 + ux * 4, tx, ty);
      g.quadraticCurveTo(bx + ux * h * 0.5 + uy * 4, by + uy * h * 0.5 - ux * 4, bx + uy * 3.4, by - ux * 3.4); g.fill();
    }
    for (let i = 0; i < 10; i++) {
      const u = (t * 0.7 + hash(i + 30)) % 1, x = s0 + (len - s0) * hash(i + 40), d = 6 + u * 26;
      const px = x + ux * d + Math.sin(t * 5 + i) * 3, py = uy * d;
      g.globalAlpha = (1 - u) * (0.6 + 0.4 * Math.sin(t * 20 + i));
      g.fillStyle = i % 3 ? '#ffb040' : '#fff4c0'; g.fillRect(px - 0.8, py - 0.8, 1.6, 1.6);
    }
    g.restore();
  },
  // frost crystals along the edges, cold mist sinking, twinkling snow
  ice(g, E, t, len, w, s0) {
    const [dx, dy] = local(g, 0, 1);
    g.save();
    for (let i = 0; i < 7; i++) { // crystals: small six-pointed stars on the edge
      const x = s0 + (len - s0) * ((i + 0.3) / 7), side = i % 2 ? 1 : -1, y = side * (w * 0.9), r = 2.4 + hash(i) * 2;
      g.strokeStyle = E.core; g.lineWidth = 0.8; g.globalAlpha = 0.85;
      g.beginPath();
      for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3 + t * 0.3; g.moveTo(x - Math.cos(a) * r, y - Math.sin(a) * r); g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
      g.stroke();
    }
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 7; i++) { // mist sinking off the blade
      const u = (t * 0.35 + hash(i + 7)) % 1, x = s0 + (len - s0) * hash(i + 17), d = u * 22;
      blob(g, x + dx * d, dy * d, 6 + u * 8, rgba(E.glow, 0.5), rgba(E.glow, 0), (1 - u) * 0.55);
    }
    for (let i = 0; i < 9; i++) { // snow sparkles
      const tw = Math.max(0, Math.sin(t * 4 + i * 2.1)), x = s0 + (len - s0) * hash(i + 50), y = (hash(i + 60) - 0.5) * w * 4;
      g.globalAlpha = tw; g.fillStyle = '#ffffff'; g.fillRect(x - 0.6, y - 2, 1.2, 4); g.fillRect(x - 2, y - 0.6, 4, 1.2);
    }
    g.restore();
  },
  // dark violet smoke curling round the blade, small black orbs orbiting, motes pulled inward
  void(g, E, t, len, w, s0) {
    const [ux, uy] = local(g, 0, -1);
    g.save();
    for (let i = 0; i < 8; i++) { // smoke (dark, not added light)
      const u = (t * 0.4 + hash(i)) % 1, x = s0 + (len - s0) * hash(i + 3), d = u * 18;
      blob(g, x + ux * d + Math.sin(t * 2 + i) * 4, uy * d, 7 + u * 9, 'rgba(40,10,70,.7)', 'rgba(20,0,40,0)', (1 - u) * 0.7);
    }
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) { // orbiting orbs
      const a = t * 2.4 + i * (TAU / 4), x = s0 + (len - s0) * (0.25 + 0.5 * ((Math.sin(t * 0.8 + i) + 1) / 2)), y = Math.sin(a) * (w + 5);
      const front = Math.cos(a) > 0;
      g.globalAlpha = front ? 0.95 : 0.4; g.fillStyle = '#12061e'; g.beginPath(); g.arc(x, y, 2.4, 0, TAU); g.fill();
      blob(g, x, y, 5, rgba(E.glow, 0.8), rgba(E.glow, 0), front ? 0.8 : 0.3);
    }
    for (let i = 0; i < 10; i++) { // motes pulled in toward the blade
      const u = (t * 0.9 + hash(i + 20)) % 1, x = s0 + (len - s0) * hash(i + 25), r = (1 - u) * 22, a = hash(i + 33) * TAU;
      g.globalAlpha = u * 0.9; g.fillStyle = E.rune; g.fillRect(x + Math.cos(a) * r - 0.7, Math.sin(a) * r - 0.7, 1.4, 1.4);
    }
    g.restore();
  },
  // thin rays of light, cross-shaped glints, a pulsing halo
  holy(g, E, t, len, w, s0) {
    g.save(); g.globalCompositeOperation = 'lighter';
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.4);
    for (let i = 0; i < 6; i++) { // rays fanning out from the blade
      const x = s0 + (len - s0) * ((i + 0.5) / 6), side = i % 2 ? 1 : -1, L = 12 + 8 * Math.max(0, Math.sin(t * 3 + i * 1.7));
      const gr = g.createLinearGradient(x, 0, x + 3, side * (w + L)); gr.addColorStop(0, rgba(E.core, 0.8)); gr.addColorStop(1, rgba(E.glow, 0));
      g.globalAlpha = 0.8; g.fillStyle = gr; g.beginPath(); g.moveTo(x - 1.4, side * w * 0.6); g.lineTo(x + 3, side * (w + L)); g.lineTo(x + 1.4, side * w * 0.6); g.fill();
    }
    for (let i = 0; i < 5; i++) { // cross glints
      const tw = Math.max(0, Math.sin(t * 3.4 + i * 2.6)), x = s0 + (len - s0) * hash(i + 70), y = (hash(i + 80) - 0.5) * w * 3.4, r = 2 + tw * 4;
      g.globalAlpha = tw; g.fillStyle = '#ffffff'; g.fillRect(x - 0.6, y - r, 1.2, r * 2); g.fillRect(x - r, y - 0.6, r * 2, 1.2);
    }
    blob(g, (s0 + len) / 2, 0, (len - s0) * 0.55, rgba(E.glow, 0.35), rgba(E.glow, 0), 0.4 + pulse * 0.4);
    g.restore();
  },
  // red mist, drops gathering on the blade and falling, pulsing veins
  blood(g, E, t, len, w, s0) {
    const [dx, dy] = local(g, 0, 1);
    g.save();
    for (let i = 0; i < 6; i++) { const u = (t * 0.3 + hash(i)) % 1, x = s0 + (len - s0) * hash(i + 4); blob(g, x, (hash(i + 8) - 0.5) * w * 2, 8 + u * 8, 'rgba(160,0,30,.45)', 'rgba(90,0,20,0)', (1 - u) * 0.6); }
    for (let i = 0; i < 6; i++) { // drops: swell on the edge, then fall
      const u = (t * 0.55 + hash(i + 12)) % 1, x = s0 + (len - s0) * ((i + 0.5) / 6), fall = u < 0.4 ? 0 : (u - 0.4) * (u - 0.4) * 120;
      const px = x + dx * (w * 0.8 + fall), py = dy * (w * 0.8 + fall), r = u < 0.4 ? 0.8 + u * 3 : 2;
      g.globalAlpha = u < 0.9 ? 0.95 : (1 - u) * 9; g.fillStyle = '#c00a2a';
      g.beginPath(); g.arc(px, py, r, 0, TAU); g.fill();
      g.fillStyle = '#ff8090'; g.globalAlpha *= 0.8; g.fillRect(px - r * 0.5, py - r * 0.6, r * 0.5, r * 0.5);
    }
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 6); g.strokeStyle = E.glow; g.lineWidth = 0.9;
    g.beginPath(); g.moveTo(s0, 0);
    for (let x = s0; x < len - 4; x += 5) g.lineTo(x + 5, Math.sin(x * 0.5 + t * 3) * w * 0.35);
    g.stroke();
    g.restore();
  },
  // jagged arcs jumping along the blade and off it, quick flashes
  storm(g, E, t, len, w, s0) {
    g.save(); g.globalCompositeOperation = 'lighter';
    const frame = Math.floor(t * 14); // the arcs change 14 times a second
    for (let k = 0; k < 3; k++) {
      const seed = frame * 7 + k * 31, a = s0 + (len - s0) * hash(seed), b = Math.min(len, a + 14 + hash(seed + 1) * 30), off = (hash(seed + 2) - 0.5) * w * 3;
      g.beginPath(); g.moveTo(a, (hash(seed + 3) - 0.5) * w);
      const n = 6;
      for (let i = 1; i <= n; i++) g.lineTo(a + (b - a) * (i / n), off * Math.sin((i / n) * Math.PI) + (hash(seed + 10 + i) - 0.5) * 7);
      g.strokeStyle = E.glow; g.lineWidth = 2.6; g.globalAlpha = 0.45; g.stroke();
      g.strokeStyle = '#ffffff'; g.lineWidth = 0.9; g.globalAlpha = 0.95; g.stroke();
    }
    if (hash(frame) > 0.7) blob(g, s0 + (len - s0) * hash(frame + 5), 0, w * 3, rgba(E.core, 0.7), rgba(E.glow, 0), 0.7);
    for (let i = 0; i < 6; i++) { const x = s0 + (len - s0) * hash(frame + i * 3), y = (hash(frame + i * 5) - 0.5) * w * 4; g.globalAlpha = 0.9; g.fillStyle = E.core; g.fillRect(x - 0.7, y - 0.7, 1.4, 1.4); }
    g.restore();
  },
};
export const FX_KINDS = Object.keys(FX);
