// Anime wings behind an anime hero (spec §39), replacing the thin style-D ones of art/aura.js.
// Nine kinds, each its own build (feathers, membrane, crystal, light, ribbons, blades, smoke):
//  light (Malaikat) · phoenix · ice (Kristal) · void (Iblis) · storm (Petir) · blood (Kelelawar)
//  wind (Angin) · blade (Bilah) · shadow (Bayangan)
// Drawn in the figure frame (anime units, origin between the feet), rooted between the shoulder
// blades. view 'side': both sweep back, the far one narrower and higher; front/back: spread.
import { TAU, part, stroke, glow, pal, mix, trace } from './kit.js';

const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
// a fan of spokes for one wing spreading to +x (angle from +x, negative = up)
function fan(n, open, from = -1.3, to = 0.35) {
  return Array.from({ length: n }, (_, i) => { const k = n === 1 ? 0 : i / (n - 1); return { k, a: from + (to - from) * k - (1 - open) * 0.3 * (1 - k) }; });
}
const at = (a, L) => [Math.cos(a) * L, Math.sin(a) * L];

// ─── feathers: layered rows (light, phoenix) ─────────────────────────────
function feathers(g, K, t, open, burn) {
  const span = 70 * K.len;
  const arm = (k) => [span * k, -span * (0.55 * Math.sin(k * Math.PI * 0.9) + 0.15 * k) * (0.7 + open * 0.3)];
  [K.rows[0], K.rows[1], K.rows[2]].forEach((n, row) => {
    const L = span * [0.62, 0.42, 0.26][row];
    for (let i = n - 1; i >= 0; i--) {
      const k = 0.25 + (i / (n - 1)) * 0.75, [ax, ay] = arm(k), a = 1.25 + k * 0.65 - open * 0.25 + Math.sin(t * 3 + i) * 0.03;
      const tx = ax + Math.cos(a) * L * (0.7 + k * 0.4), ty = ay + Math.sin(a) * L * (0.7 + k * 0.4);
      const nx = -Math.sin(a) * L * 0.13, ny = Math.cos(a) * L * 0.13;
      const col = row === 0 ? K.mid : row === 1 ? mix(K.base, K.mid, 0.45) : K.base;
      part(g, [[ax - nx * 0.4, ay - ny * 0.4], [ax + (tx - ax) * 0.5 - nx, ay + (ty - ay) * 0.5 - ny], [tx, ty, 1], [ax + (tx - ax) * 0.55 + nx, ay + (ty - ay) * 0.55 + ny], [ax + nx * 0.4, ay + ny * 0.4]],
        pal(col, { shade: mix(col, K.shade || '#5a1020', 0.45), hi: '#ffffff', rim: null }), { sd: 2, lw: 1.5 });
      if (row === 0) {
        stroke(g, [[ax + (tx - ax) * 0.82, ay + (ty - ay) * 0.82], [tx, ty]], K.tip, 2.4);
        if (burn) {
          g.save(); g.globalCompositeOperation = 'lighter';
          const ph = (t * 1.8 + hash(i)) % 1, h = 8 + hash(i + 3) * 6;
          const gr = g.createLinearGradient(tx, ty, tx, ty - h); gr.addColorStop(0, 'rgba(255,120,40,.9)'); gr.addColorStop(1, 'rgba(255,230,140,0)');
          g.globalAlpha = 1 - ph * 0.5; g.fillStyle = gr; g.beginPath(); g.moveTo(tx - 3, ty); g.quadraticCurveTo(tx + Math.sin(t * 8 + i) * 2, ty - h, tx + 3, ty); g.fill();
          g.restore();
        }
      }
    }
  });
  const bone = Array.from({ length: 8 }, (_, i) => arm(i / 7));
  stroke(g, bone, '#130b1a', 3.4); stroke(g, bone, K.base, 1.8);
}

// ─── membrane: bone fingers with skin stretched between (void demon, blood bat) ──
function membrane(g, K, t, open, kind) {
  const wrist = [26, -34 - open * 6], tips = fan(4, open, -1.05, 0.55).map(({ a }, i) => { const L = [52, 56, 50, 40][i]; return [wrist[0] + Math.cos(a) * L, wrist[1] + Math.sin(a) * L]; });
  const skin = [[0, 0], wrist, ...tips.flatMap((p, i) => {
    if (i === tips.length - 1) return [[p[0], p[1], 1]];
    const q = tips[i + 1], m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], c = [wrist[0], wrist[1]];
    return [[p[0], p[1], 1], [m[0] + (c[0] - m[0]) * 0.32, m[1] + (c[1] - m[1]) * 0.32]]; // scalloped edge
  }), [6, 14]];
  part(g, skin, pal(K.skin, { shade: K.skinShade, hi: K.skinHi, rim: null }), { sd: 3, lw: 1.8 });
  // veins / folds
  for (const p of tips) stroke(g, [wrist, [(wrist[0] + p[0]) / 2 + 2, (wrist[1] + p[1]) / 2], p], K.vein, kind === 'blood' ? 1.2 : 0.8);
  if (kind === 'blood') { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.4 + 0.4 * Math.sin(t * 4); for (const p of tips) stroke(g, [wrist, p], '#ff2a40', 0.8); g.restore(); }
  // the bones over the skin
  stroke(g, [[0, 0], wrist], '#130b1a', 4.4); stroke(g, [[0, 0], wrist], K.bone, 2.6);
  for (const p of tips) { stroke(g, [wrist, p], '#130b1a', 2.6); stroke(g, [wrist, p], K.bone, 1.3); }
  part(g, [[wrist[0] - 3, wrist[1]], [wrist[0] + 2, wrist[1] - 12, 1], [wrist[0] + 4, wrist[1] + 1]], pal(K.bone, { hi: '#ffffff', rim: null }), { sd: 1, lw: 1.3 }); // claw
  if (kind === 'void') { // smoke curling off the edge
    for (let i = 0; i < 5; i++) {
      const p = tips[i % tips.length], ph = (t * 0.5 + i * 0.2) % 1;
      const gr = g.createRadialGradient(p[0], p[1] - ph * 14, 0, p[0], p[1] - ph * 14, 9 + ph * 8); gr.addColorStop(0, 'rgba(60,20,90,.55)'); gr.addColorStop(1, 'rgba(20,0,40,0)');
      g.globalAlpha = 1 - ph; g.fillStyle = gr; g.beginPath(); g.arc(p[0], p[1] - ph * 14, 9 + ph * 8, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
  }
  if (kind === 'blood') for (let i = 0; i < 3; i++) { // drips from the scallops
    const p = tips[i], ph = (t * 0.6 + i * 0.33) % 1;
    g.globalAlpha = 1 - ph; g.fillStyle = '#b0102a'; g.beginPath(); g.arc(p[0] - 4, p[1] + 4 + ph * 18, 1.6, 0, TAU); g.fill();
  }
  g.globalAlpha = 1;
}

// ─── crystal: translucent shards (ice) ───────────────────────────────────
function crystal(g, K, t, open) {
  for (const { k, a } of fan(7, open, -1.35, 0.45).reverse()) {
    const L = 30 + (1 - Math.abs(k - 0.35)) * 40, w = 5 + (1 - k) * 3, d = at(a, L), n = [-Math.sin(a) * w, Math.cos(a) * w], m = at(a, L * 0.55);
    const pts = [[0, 0], [m[0] + n[0], m[1] + n[1]], [d[0], d[1], 1], [m[0] - n[0], m[1] - n[1]]];
    g.save(); g.beginPath(); trace(g, pts); g.clip();
    const gr = g.createLinearGradient(0, 0, d[0], d[1]); gr.addColorStop(0, 'rgba(120,200,255,.35)'); gr.addColorStop(0.7, 'rgba(200,240,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,.95)');
    g.fillStyle = gr; g.fillRect(-120, -120, 240, 240);
    g.restore();
    g.beginPath(); trace(g, pts); g.lineWidth = 1.4; g.strokeStyle = '#1a3a5e'; g.stroke();
    stroke(g, [[0, 0], d], 'rgba(255,255,255,.85)', 0.8); // the facet ridge
  }
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) { const tw = Math.max(0, Math.sin(t * 3 + i * 1.9)), x = 10 + hash(i) * 60, y = -50 + hash(i + 9) * 60; g.globalAlpha = tw; g.fillStyle = '#ffffff'; g.fillRect(x - 0.6, y - 2.4, 1.2, 4.8); g.fillRect(x - 2.4, y - 0.6, 4.8, 1.2); }
  g.restore();
}

// ─── energy: feathers drawn in light, lightning between the tips (storm) ──
function energy(g, K, t, open) {
  g.save(); g.globalCompositeOperation = 'lighter';
  const tips = [];
  for (const { k, a } of fan(6, open, -1.3, 0.45)) {
    const L = 34 + (1 - Math.abs(k - 0.3)) * 36, d = at(a, L), n = [-Math.sin(a) * 5, Math.cos(a) * 5], m = at(a, L * 0.5);
    const pts = [[0, 0], [m[0] + n[0], m[1] + n[1]], [d[0], d[1]], [m[0] - n[0], m[1] - n[1]]];
    g.beginPath(); trace(g, pts); g.fillStyle = 'rgba(60,200,230,.16)'; g.fill();
    g.lineWidth = 2.6; g.strokeStyle = 'rgba(90,240,224,.45)'; g.stroke();
    g.lineWidth = 0.9; g.strokeStyle = '#eafffb'; g.stroke();
    tips.push(d);
  }
  const f = Math.floor(t * 12);
  for (let i = 0; i < tips.length - 1; i++) if (hash(f + i * 7) > 0.45) { // arcs jumping between tips
    const p = tips[i], q = tips[i + 1];
    g.beginPath(); g.moveTo(p[0], p[1]);
    for (let j = 1; j < 5; j++) g.lineTo(p[0] + (q[0] - p[0]) * j / 5 + (hash(f + i + j * 3) - 0.5) * 8, p[1] + (q[1] - p[1]) * j / 5 + (hash(f + i * 2 + j) - 0.5) * 8);
    g.lineTo(q[0], q[1]); g.lineWidth = 1.1; g.strokeStyle = '#ffffff'; g.globalAlpha = 0.9; g.stroke();
  }
  g.restore();
}

// ─── ribbons: long translucent bands waving (wind) ───────────────────────
function ribbons(g, K, t, open) {
  for (let r = 0; r < 4; r++) {
    const a0 = -0.9 + r * 0.42 - (1 - open) * 0.2, L = 80 - r * 10, n = 12, top = [], bot = [];
    for (let i = 0; i <= n; i++) {
      const k = i / n, a = a0 + Math.sin(t * 2.4 - k * 4 + r) * 0.18 * k, x = Math.cos(a) * L * k, y = Math.sin(a) * L * k + Math.sin(t * 3 - k * 5 + r) * 6 * k;
      const w = (1 - k * 0.7) * 3.2; top.push([x, y - w]); bot.unshift([x, y + w]);
    }
    const pts = [...top, ...bot];
    g.beginPath(); trace(g, pts); g.fillStyle = r % 2 ? 'rgba(170,255,230,.45)' : 'rgba(220,255,245,.55)'; g.fill();
    g.lineWidth = 1; g.strokeStyle = 'rgba(40,120,110,.7)'; g.stroke();
  }
}

// ─── blades: small swords hovering in a fan (blade) ──────────────────────
function blades(g, K, t, open) {
  for (const { k, a } of fan(6, open, -1.25, 0.45)) {
    const L = 30 + (1 - Math.abs(k - 0.3)) * 28, bob = Math.sin(t * 2 + k * 6) * 2.4, base = at(a, 14 + bob), tip = at(a, 14 + L + bob);
    const n = [-Math.sin(a) * 3.4, Math.cos(a) * 3.4], g1 = [base[0] + Math.cos(a) * 6, base[1] + Math.sin(a) * 6];
    glow(g, (base[0] + tip[0]) / 2, (base[1] + tip[1]) / 2, 14, '#7ac8ff', 0.3);
    part(g, [[g1[0] + n[0], g1[1] + n[1]], [tip[0], tip[1], 1], [g1[0] - n[0], g1[1] - n[1]]], pal('#c8d4e8', { shade: '#4a5670', hi: '#ffffff', rim: null }), { sd: 1.4, lw: 1.4 });
    part(g, [[g1[0] + n[0] * 2.2, g1[1] + n[1] * 2.2], [g1[0] - n[0] * 2.2, g1[1] - n[1] * 2.2], [g1[0] - n[0] * 2.2 - Math.cos(a) * 2, g1[1] - n[1] * 2.2 - Math.sin(a) * 2], [g1[0] + n[0] * 2.2 - Math.cos(a) * 2, g1[1] + n[1] * 2.2 - Math.sin(a) * 2]], pal('#e2a83a', { hi: '#fff0a8', rim: null }), { sd: 0.8, lw: 1.2 });
    stroke(g, [base, g1], '#5a3a2a', 2.6);
  }
}

// ─── smoke: dark feathers dissolving into motes, two red eyes (shadow) ────
function smoke(g, K, t, open) {
  for (const { k, a } of fan(7, open, -1.3, 0.5).reverse()) {
    const L = 30 + (1 - Math.abs(k - 0.3)) * 38, d = at(a + Math.sin(t * 1.6 + k * 5) * 0.05, L), n = [-Math.sin(a) * 6, Math.cos(a) * 6], m = at(a, L * 0.5);
    const gr = g.createLinearGradient(0, 0, d[0], d[1]); gr.addColorStop(0, 'rgba(14,8,22,.95)'); gr.addColorStop(0.7, 'rgba(40,20,60,.7)'); gr.addColorStop(1, 'rgba(60,30,90,0)');
    g.beginPath(); trace(g, [[0, 0], [m[0] + n[0], m[1] + n[1]], [d[0], d[1]], [m[0] - n[0], m[1] - n[1]]]); g.fillStyle = gr; g.fill();
    for (let j = 0; j < 3; j++) { // motes breaking off the tip
      const ph = (t * 0.6 + hash(j + k * 10)) % 1;
      g.globalAlpha = (1 - ph) * 0.8; g.fillStyle = '#2a1640'; g.beginPath(); g.arc(d[0] + ph * 10 + j * 2, d[1] - ph * 14, 1.8 - ph, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
  }
  const blink = (t % 5) < 0.12 ? 0 : 1; // two red eyes in the smoke near the root
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.85 * blink;
  for (const [x, y] of [[16, -22], [22, -20]]) { glow(g, x, y, 5, '#ff2040', 0.9); g.fillStyle = '#ff6a7a'; g.fillRect(x - 1.4, y - 0.5, 2.8, 1); }
  g.restore();
}

export const WINGS = {
  light: { name: 'Malaikat', glowC: '#ffcf70', flap: 1.6, draw: (g, t, o) => feathers(g, { base: '#fff4dc', mid: '#ffd27a', tip: '#ff5a70', rows: [7, 5, 4], len: 1 }, t, o) },
  phoenix: { name: 'Phoenix', glowC: '#ff7a2a', flap: 3, draw: (g, t, o) => feathers(g, { base: '#ffe7a0', mid: '#ff8a2a', tip: '#d01e10', rows: [8, 6, 4], len: 1.08 }, t, o, true) },
  ice: { name: 'Kristal', glowC: '#7ad0ff', flap: 1.2, draw: (g, t, o) => crystal(g, null, t, o) },
  void: { name: 'Iblis', glowC: '#8a3cff', flap: 2, draw: (g, t, o) => membrane(g, { skin: '#2e1840', skinShade: '#0e0618', skinHi: '#6a4a8a', vein: 'rgba(170,90,255,.55)', bone: '#3a3040' }, t, o, 'void') },
  storm: { name: 'Petir', glowC: '#5af0e0', flap: 2.4, draw: (g, t, o) => energy(g, null, t, o) },
  blood: { name: 'Kelelawar', glowC: '#ff2a55', flap: 2.8, draw: (g, t, o) => membrane(g, { skin: '#5a0a1a', skinShade: '#1e0208', skinHi: '#a03040', vein: 'rgba(255,60,80,.6)', bone: '#2a1418' }, t, o, 'blood') },
  wind: { name: 'Angin', glowC: '#a0ffe0', flap: 1.4, draw: (g, t, o) => ribbons(g, null, t, o) },
  blade: { name: 'Bilah', glowC: '#7ac8ff', flap: 1, draw: (g, t, o) => blades(g, null, t, o) },
  shadow: { name: 'Bayangan', glowC: '#5a2a8a', flap: 1.8, draw: (g, t, o) => smoke(g, null, t, o) },
};

// SIZE: all wings drawn this much bigger; TILT: turned down from the shoulder (radians), so they
// spread out sideways and a little down rather than pointing up
export const WING_SIZE = 1.4, WING_TILT = 0.42;
export function drawWings(g, kind, view, top, t, moving = 0) {
  const W = WINGS[kind];
  if (!W) return;
  const flap = Math.sin(t * W.flap) * 0.5 + 0.5, open = Math.max(0.2, 0.55 + flap * 0.45 - moving * 0.2);
  g.save(); g.translate(top[0], top[1]);
  glow(g, 0, -6, 80 * WING_SIZE, W.glowC, 0.2 + flap * 0.1);
  // [direction, width, lift]: from the side both sweep back, the far one narrower and higher
  const sides = view === 'side' ? [[-1, 0.5, -7], [-1, 0.78, 0]] : [[-1, 1, 0], [1, 1, 0]];
  for (const [s, w, dy] of sides) {
    g.save(); g.translate(0, dy); g.scale(s * w * WING_SIZE, WING_SIZE); g.rotate(WING_TILT);
    W.draw(g, t, open);
    g.restore();
  }
  if (kind === 'light' || kind === 'phoenix') { // sparkles / embers drifting off
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 10; i++) {
      const ph = (t * 0.5 + i / 10) % 1, x = (hash(i) - 0.5) * 220, y = 10 - ph * 70;
      g.globalAlpha = Math.sin(ph * Math.PI); g.fillStyle = kind === 'phoenix' ? (i % 2 ? '#ffb040' : '#ff5020') : (i % 2 ? '#fff4c0' : '#ff5a70');
      g.beginPath(); g.arc(x, y, 1.4, 0, TAU); g.fill();
    }
    g.restore();
  }
  g.restore();
}
export { rgba };
