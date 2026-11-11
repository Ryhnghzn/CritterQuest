// Pixel auras of the anime bosses (spec §41.2): crisp squares drawn on the pixel canvas AFTER the
// pixel filter, behind (front = false) and in front (front = true) of the body. (x0, y0) = the feet
// on the canvas, s = canvas px per art unit, phase 2 = enraged (more, faster, brighter).
// Pure drawing, no Math.random: everything moves with t, so frames are stable.
const TAU = Math.PI * 2;
const px = (g, x, y, c, size = 1) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), size, size); };
const rise = (t, i, speed) => (t * speed + i * 0.137) % 1;
const LAVA = ['#fff2b0', '#ffc04a', '#ff7a2a', '#d0381a'];

function lava(g, x0, y0, s, t, ph, front) {
  if (!front) {
    for (let i = 0; i < 26; i++) { const a = (i / 26) * TAU, R = 120 * s * (0.8 + 0.2 * Math.sin(t * 2 + i)); px(g, x0 + Math.cos(a) * R, y0 + Math.sin(a) * R * 0.25, i % 3 ? LAVA[2] : LAVA[1], 2); }
    for (let i = 0; i < 6; i++) { const k = (t * 0.7 + i / 6) % 1; px(g, x0 + Math.sin(i * 5.3) * 90 * s, y0 - 2 - k * 6, k < 0.8 ? LAVA[1] : LAVA[0], 2); }
    for (let i = 0; i < 10; i++) { const k = (t * 0.12 + i * 0.1) % 1; px(g, x0 + Math.sin(i * 3.1) * 80 * s - k * 30 * s, y0 - (260 + k * 160) * s, `rgba(40,30,40,${0.5 * (1 - k)})`, 3); }
    return;
  }
  for (let i = 0; i < (ph > 1 ? 70 : 40); i++) {
    const k = rise(t, i, 0.18 + (i % 7) * 0.03), sx = Math.sin(i * 12.9) * 150 * s + Math.sin(t * 2 + i) * 8 * s;
    px(g, x0 + sx, y0 - k * 400 * s, k < 0.3 ? LAVA[0] : k < 0.6 ? LAVA[1] : k < 0.85 ? LAVA[2] : LAVA[3], k < 0.5 && i % 4 === 0 ? 2 : 1);
  }
}
function crystal(g, x0, y0, s, t, ph, front) {
  const diamond = (x, y, r, c, hi) => { x = Math.round(x); y = Math.round(y); for (let i = -r; i <= r; i++) { const w = r - Math.abs(i); g.fillStyle = c; g.fillRect(x - w, y + i, w * 2 + 1, 1); } px(g, x - 1, y - 1, hi); };
  const n = ph > 1 ? 9 : 6, sp = ph > 1 ? 1.1 : 0.7;
  for (let i = 0; i < n; i++) {
    const a = t * sp + (i / n) * TAU, z = Math.sin(a);
    if ((z > 0) !== front) continue;
    diamond(x0 + Math.cos(a) * (150 + (i % 3) * 25) * s, y0 + (-200 - (i % 2) * 60 + Math.sin(t * 2 + i) * 10) * s + z * 18 * s, Math.max(2, Math.round(3.4 * s * 2.2)), front ? '#7fd8ff' : '#3a8ae8', '#ffffff');
  }
  if (front) return;
  for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU + t * 0.2, R = (110 + Math.sin(t + i) * 10) * s; px(g, x0 + Math.cos(a) * R, y0 + Math.sin(a) * R * 0.22, i % 2 ? 'rgba(200,240,255,.7)' : 'rgba(120,200,255,.6)', 2); }
  for (let i = 0; i < (ph > 1 ? 40 : 24); i++) { const k = rise(t, i, 0.1 + (i % 5) * 0.02); px(g, x0 + Math.sin(i * 9.7) * 140 * s, y0 - k * 380 * s, k < 0.5 ? '#c8f0ff' : '#7fd8ff'); }
  for (let i = 0; i < 12; i++) if (Math.sin(t * 6 + i * 3.3) > 0.7) { const x = x0 + Math.sin(i * 4.1) * 130 * s, y = y0 + (-100 - (i * 37) % 240) * s; px(g, x, y, '#ffffff'); for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) px(g, x + dx, y + dy, '#c8f0ff'); }
}
function maw(g, x0, y0, s, t, ph, front) {
  if (!front) { // a creeping shadow mist at the feet, red eyes blinking inside it
    for (let i = 0; i < 40; i++) { const a = (i / 40) * TAU + t * 0.15, R = (100 + 30 * Math.sin(t * 1.5 + i * 2.3)) * s; px(g, x0 + Math.cos(a) * R, y0 + Math.sin(a) * R * 0.3 - 2, i % 3 ? 'rgba(40,16,60,.85)' : 'rgba(90,40,120,.7)', 3); }
    for (let i = 0; i < (ph > 1 ? 6 : 3); i++) if (Math.sin(t * 1.7 + i * 2.9) > 0.2) { const x = x0 + Math.sin(i * 7.7) * 110 * s, y = y0 - 4 + Math.cos(i * 3.1) * 8 * s; px(g, x, y, '#ff3a5a', 2); px(g, x + 4, y, '#ff3a5a', 2); }
    return;
  }
  for (let i = 0; i < (ph > 1 ? 30 : 18); i++) { const k = rise(t, i, 0.12 + (i % 4) * 0.03); px(g, x0 + Math.sin(i * 11.3) * 130 * s + Math.sin(t + i) * 6 * s, y0 - k * 320 * s, k < 0.5 ? '#c26bd8' : 'rgba(90,40,120,.8)', i % 5 ? 1 : 2); }
  for (let i = 0; i < 4; i++) { const k = (t * 0.9 + i * 0.25) % 1; px(g, x0 + (36 + i * 4) * s, y0 - (110 - k * 100) * s, '#ff7aa8', 2); } // drool
}
function spore(g, x0, y0, s, t, ph, front) {
  if (!front) {
    for (let i = 0; i < 30; i++) { const a = (i / 30) * TAU, R = (100 + 14 * Math.sin(t * 1.3 + i)) * s; px(g, x0 + Math.cos(a) * R, y0 + Math.sin(a) * R * 0.25, i % 2 ? '#6aa23a' : '#b7ff6a', 2); }
    return;
  }
  for (let i = 0; i < (ph > 1 ? 60 : 36); i++) {
    const k = rise(t, i, 0.07 + (i % 6) * 0.015), x = x0 + (Math.sin(i * 8.1) * 140 + Math.sin(t * 1.4 + i) * 14) * s, y = y0 - k * 400 * s;
    px(g, x, y, i % 3 === 0 ? '#d98aff' : k < 0.6 ? '#b7ff6a' : '#6aa23a', i % 6 === 0 ? 2 : 1);
  }
}
function mummy(g, x0, y0, s, t, ph, front) {
  if (!front) { // a sand swirl
    for (let i = 0; i < 46; i++) { const a = (i / 46) * TAU + t * (ph > 1 ? 1.6 : 1), R = (90 + (i % 5) * 12) * s, h = (i % 7) * 26 * s; px(g, x0 + Math.cos(a) * R, y0 - h + Math.sin(a) * R * 0.25, i % 3 ? '#d8b878' : '#f2d38a', i % 4 ? 1 : 2); }
    return;
  }
  for (let i = 0; i < 8; i++) { // golden glyphs floating up
    const k = rise(t, i, 0.08), x = Math.round(x0 + Math.sin(i * 5.7) * 120 * s), y = Math.round(y0 - (60 + k * 300) * s), c = `rgba(255,224,138,${1 - k})`;
    if (i % 3 === 0) { px(g, x, y, c); px(g, x, y + 1, c); px(g, x, y + 2, c); px(g, x - 1, y, c); px(g, x + 1, y, c); }
    else if (i % 3 === 1) { px(g, x, y, c); px(g, x + 1, y, c); px(g, x, y + 1, c); px(g, x + 1, y + 2, c); }
    else { px(g, x, y, c); px(g, x + 2, y, c); px(g, x + 1, y + 1, c); px(g, x + 1, y + 2, c); }
  }
  for (let i = 0; i < (ph > 1 ? 24 : 12); i++) { const k = rise(t, i, 0.3 + (i % 3) * 0.1); px(g, x0 + Math.sin(i * 9.1) * 60 * s, y0 - (40 + k * 140) * s, k < 0.5 ? '#c8fff6' : '#5affe0'); } // soul fire
}
function eclipse(g, x0, y0, s, t, ph, front) {
  const n = ph > 1 ? 50 : 30;
  for (let i = 0; i < n; i++) { // motes sucked in toward the body
    const k = 1 - ((t * 0.25 + i * 0.137) % 1), a = i * 2.39 + t * 0.4, R = (40 + k * 170) * s;
    const x = x0 + Math.cos(a) * R, y = y0 - 150 * s + Math.sin(a) * R * 0.7;
    if ((Math.sin(a) > 0) !== front) continue;
    px(g, x, y, k > 0.6 ? 'rgba(160,106,216,.6)' : k > 0.3 ? '#a06ad8' : '#e0c8ff', k < 0.3 ? 2 : 1);
  }
  if (!front) for (let i = 0; i < 32; i++) { const a = (i / 32) * TAU - t * 0.3, R = 110 * s; px(g, x0 + Math.cos(a) * R, y0 + Math.sin(a) * R * 0.22, i % 4 ? '#3a2458' : '#ffe08a', 2); }
}
export const AURAS = { lavaboss: lava, crystalboss: crystal, boss: maw, sporeboss: spore, tombboss: mummy, eclipseboss: eclipse };
