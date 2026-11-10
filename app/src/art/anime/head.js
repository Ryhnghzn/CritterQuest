// Anime heads (spec §39): faces from the front and 3/4, and hair made of locks rooted on a 3D
// head so every style is right from the side, the front and the back.
import { TAU, INK, trace, part, stroke, glow, mix, pal } from './kit.js';
import { headpiece, pendant } from './gearfx.js';

const SKIN = pal('#f1c4a4', { shade: '#c4826c', hi: '#ffe6d4' });
const GOLD = pal('#e2a83a', { shade: '#86501a', hi: '#fff0a8' });
export const HAIR_COLORS = {
  silver: { name: 'Perak', P: pal('#c6cde6', { shade: '#6c7398', hi: '#ffffff' }) },
  black: { name: 'Hitam', P: pal('#2e2a3e', { shade: '#0e0b16', hi: '#6e6c96' }) },
  crimson: { name: 'Merah', P: pal('#c42a36', { shade: '#5e0c1e', hi: '#ff8a7a' }) },
  gold: { name: 'Pirang', P: pal('#f0c24a', { shade: '#a0621c', hi: '#fff4c0' }) },
  azure: { name: 'Biru', P: pal('#3a7ae0', { shade: '#16285e', hi: '#a8d4ff' }) },
  brown: { name: 'Cokelat', P: pal('#7a4a2e', { shade: '#341a10', hi: '#c08a5a' }) },
};
// ─── hair: locks rooted on a 3D head ──────────────────────────────────────
// Character space: x = the character's left (screen right when it faces us), y down, z forward.
// A lock: root at yaw a (0 = face, π = back) and pitch e (0 = ear level, + = up), length,
// direction (char space), gravity (bends the tip down), root width.
const rad = (a, e) => [Math.sin(a) * Math.cos(e), -Math.sin(e), Math.cos(a) * Math.cos(e)];
const L = (a, e, len, dir, grav = 0, w = 8) => ({ a, e, len, dir: dir || rad(a, e), grav, w });
const PI = Math.PI;
const ring = (as, f) => as.map(f);
export const HAIR_STYLES = {
  spiky: { name: 'Jabrik', locks: [
    ...ring([PI, 2.55, -2.55, 1.95, -1.95, 1.4, -1.4], (a) => L(a, 0.5, 15, rad(a, 0.7), 0, 8)),
    ...ring([PI, 2.2, -2.2, 0.9, -0.9], (a) => L(a, 1.05, 12, rad(a, 1.35), 0, 7.5)),
    ...ring([-0.55, -0.2, 0.15, 0.5], (a) => L(a, 0.8, 13, [Math.sin(a) * 0.4, 1, 0.55], 0, 6.5)),
  ] },
  long: { name: 'Panjang', locks: [
    ...ring([PI, 2.6, -2.6, 2.05, -2.05, 1.55, -1.55], (a) => L(a, 0.45, 44, [Math.sin(a) * 0.35, 1, Math.cos(a) * 0.3], 0, 10)),
    ...ring([PI, 2.3, -2.3], (a) => L(a, 1, 14, rad(a, 0.2), 0.4, 9)),
    ...ring([-0.5, -0.15, 0.2, 0.55], (a) => L(a, 0.75, 14, [Math.sin(a) * 0.5, 1, 0.45], 0, 7)),
  ] },
  tail: { name: 'Kuncir', tie: [PI, 0.9], locks: [
    ...ring([PI, 2.4, -2.4, 1.7, -1.7], (a) => L(a, 0.6, 8, [Math.sin(a) * 0.3, 1, Math.cos(a) * 0.4], 0, 9)),
    L(PI, 0.9, 44, [0, -0.35, -1], 1.3, 11), L(PI + 0.2, 0.85, 36, [0.15, -0.3, -1], 1.25, 8),
    L(0.9, 0.35, 20, [0.3, 1, 0.3], 0, 6), L(-0.9, 0.35, 20, [-0.3, 1, 0.3], 0, 6),
    L(0, 0.85, 12, [0, 1, 0.6], 0, 6), L(0.35, 0.8, 12, [0.2, 1, 0.5], 0, 6),
  ] },
  part: { name: 'Belah Tengah', locks: [
    ...ring([PI, 2.5, -2.5, 1.9, -1.9, 1.35, -1.35], (a) => L(a, 0.4, 24, [Math.sin(a) * 0.4, 1, Math.cos(a) * 0.25], 0, 10)),
    L(0.22, 0.85, 18, [0.75, 1, 0.45], 0, 8), L(-0.22, 0.85, 18, [-0.75, 1, 0.45], 0, 8),
    L(0.62, 0.7, 17, [0.6, 1, 0.3], 0, 7), L(-0.62, 0.7, 17, [-0.6, 1, 0.3], 0, 7),
  ] },
  slick: { name: 'Klimis', locks: [
    ...ring([PI, 2.3, -2.3, 1.6, -1.6], (a) => L(a, 0.3, 7, [Math.sin(a) * 0.3, 1, Math.cos(a) * 0.3], 0, 8)),
    ...ring([1, -1, 0.5, -0.5, 0.1, -0.1], (a) => L(a, 0.95, 15, [Math.sin(a) * 0.2, -0.25, -1], 0.35, 8)),
    L(0.3, 0.9, 12, [0.2, 1, 0.7], 0, 3.5),
  ] },
  swept: { name: 'Poni Samping', locks: [
    ...ring([PI, 2.5, -2.5, 1.8, -1.8, 1.3, -1.3], (a) => L(a, 0.45, 20, [Math.sin(a) * 0.4, 1, Math.cos(a) * 0.2], 0, 10)),
    L(PI, 1, 12, rad(PI, 0.5), 0.3, 9),
    L(0.9, 0.6, 14, [-0.3, 1, 0.3], 0, 7), L(0.15, 0.8, 18, [-0.9, 1, 0.5], 0, 8), L(0.55, 0.85, 21, [-0.85, 1, 0.55], 0, 11),
  ] },
};
// the view: φ = the angle the character is turned (0 faces us, π/2 faces right, π shows its back)
export const VIEW_ANGLE = { front: 0.12, side: 1.15, back: PI };

function lockShape(lk, c, r, phi, t, sway) {
  const cs = Math.cos(phi), sn = Math.sin(phi);
  const [rx, ry, rz] = rad(lk.a, lk.e), n = Math.hypot(...lk.dir);
  const dx = lk.dir[0] / n, dy = lk.dir[1] / n, dz = lk.dir[2] / n;
  const wob = Math.sin(t * 2.2 + lk.a * 3) * 0.04 + sway;
  const at = (s) => {
    const x = rx * r * 0.82 + (dx + wob * 0.5) * lk.len * s, y = ry * r * 0.82 + dy * lk.len * s + lk.grav * lk.len * s * s, z = rz * r * 0.82 + (dz - wob) * lk.len * s;
    return [c[0] + x * cs + z * sn, c[1] + y, -x * sn + z * cs];
  };
  const S = [0, 0.3, 0.62, 1].map(at), left = [], right = [];
  for (let i = 0; i < 3; i++) {
    const p = S[i], q = S[i + 1], tx = q[0] - p[0], ty = q[1] - p[1], tl = Math.hypot(tx, ty) || 1;
    const w = lk.w * (1 - [0, 0.3, 0.62][i] * 0.9) / 2, nx = -ty / tl * w, ny = tx / tl * w;
    left.push([p[0] + nx, p[1] + ny]); right.unshift([p[0] - nx, p[1] - ny]);
  }
  return { pts: [...left, [S[3][0], S[3][1], 1], ...right], depth: S[1][2], root: S[0] };
}
// the head's hair: locks behind the head, the base, then (after the face) a cap and the front locks
function hairParts(style, c, r, phi, t, sway) {
  const all = HAIR_STYLES[style].locks.map((lk) => lockShape(lk, c, r, phi, t, sway)).sort((a, b) => a.depth - b.depth);
  return { back: all.filter((s) => s.depth < 0), front: all.filter((s) => s.depth >= 0) };
}

// ─── heads ────────────────────────────────────────────────────────────────
function eyeFront(g, cx, cy, sx, eyeC, t) {
  // one anime eye; sx = +1 for the eye on the screen right, −1 mirrors it
  g.save(); g.translate(cx, cy); g.scale(sx, 1);
  g.beginPath(); trace(g, [[-2.6, 0.2], [0, 1.6], [2.8, -0.4], [0.2, -1.9]]); g.fillStyle = '#fbf6f2'; g.fill();
  g.restore();
  const ig = g.createLinearGradient(0, cy - 2.4, 0, cy + 2); ig.addColorStop(0, mix(eyeC, '#000000', 0.45)); ig.addColorStop(1, mix(eyeC, '#ffffff', 0.35));
  g.beginPath(); g.ellipse(cx + sx * 0.2, cy - 0.1, 1.55, 2.1, 0, 0, TAU); g.fillStyle = ig; g.fill();
  g.beginPath(); g.ellipse(cx + sx * 0.2, cy - 0.2, 0.7, 1.2, 0, 0, TAU); g.fillStyle = '#0c0814'; g.fill();
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(cx - 0.4, cy - 1.1, 0.5, 0, TAU); g.fill(); g.beginPath(); g.arc(cx + 0.6, cy + 0.8, 0.28, 0, TAU); g.fill();
  g.save(); g.translate(cx, cy); g.scale(sx, 1);
  g.beginPath(); trace(g, [[-3, -0.6], [-0.6, -2.7], [2.2, -2.5], [3.6, -1.2, 1], [4.7, -2.3, 1], [3.5, -0.2, 1], [2.2, -1.5], [-0.4, -1.7], [-2.7, 0.3, 1]]); g.fillStyle = INK; g.fill();
  stroke(g, [[-1.6, 1.4], [1.6, 1.2]], 'rgba(19,11,26,.6)', 0.55);
  g.beginPath(); trace(g, [[-2.8, -3.6, 1], [0.4, -5.6], [3.8, -5, 1], [0.6, -4.6], [-2.6, -3, 1]]); g.fillStyle = INK; g.fill(); // brow, low at the nose
  g.restore();
  glow(g, cx, cy, 3.4, eyeC, 0.22 + 0.08 * Math.sin(t * 3));
}
function faceFront(g, c, eyeC, t, turn, mask) {
  const fx = turn * 1.2, [x, y] = c;
  for (const s of [-1, 1]) part(g, [[x + s * 9.4, y + 1], [x + s * 12, y - 0.4], [x + s * 12, y + 5], [x + s * 9.4, y + 6.6]], SKIN, { sd: 1, lw: 1.2, rim: false });
  part(g, [[x - 9.8, y - 2], [x - 9, y - 8], [x, y - 11], [x + 9, y - 8], [x + 9.8, y - 2], [x + 9.4, y + 4.6], [x + 7.6 + fx * 0.3, y + 9], [x + 4 + fx * 0.4, y + 12.6], [x + fx * 0.5, y + 14.2, 1], [x - 4 + fx * 0.4, y + 12.6], [x - 7.6 + fx * 0.3, y + 9], [x - 9.4, y + 4.6]], SKIN, { sd: 2.4, lw: 2 });
  const blink = t % 4.2 < 0.11;
  for (const s of [-1, 1]) {
    if (blink) stroke(g, [[x + fx + s * 1.8, y + 3.4], [x + fx + s * 4.4, y + 3.8], [x + fx + s * 7, y + 3.2]], INK, 1.2);
    else eyeFront(g, x + fx + s * 4.4, y + 3.6, s, eyeC, t);
  }
  if (mask) { // cloth over nose and mouth
    part(g, [[x - 10, y + 5.4], [x + 10, y + 5.4], [x + 9.6, y + 9], [x + 4.4 + fx * 0.4, y + 13.4], [x + fx * 0.5, y + 15, 1], [x - 4.4 + fx * 0.4, y + 13.4], [x - 9.6, y + 9]], mask, { sd: 1.6, lw: 1.8 });
    return;
  }
  stroke(g, [[x + fx + 0.4, y + 7], [x + fx + 1, y + 8.8], [x + fx, y + 9.1]], 'rgba(120,60,50,.8)', 0.7);
  stroke(g, [[x + fx - 1.6, y + 11.2], [x + fx, y + 11.5], [x + fx + 1.6, y + 11.1]], '#6a2a2a', 0.8);
}
function faceSide(g, c, eyeC, t, mask) { // 3/4 to the right; drawn around a head centre at (6.5, −144), moved to c
  g.save(); g.translate(c[0] - 6.5, c[1] + 144);
  part(g, [[-2, -149], [3, -156], [11, -157], [17, -153], [19.6, -146.5], [19.2, -141], [20.6, -137.8, 1], [18.6, -134], [15.4, -130.6], [12.4, -129, 1], [7.6, -131], [4.4, -134.6], [5.6, -140], [2.6, -146]], SKIN, { sd: 2.6, lw: 2 });
  part(g, [[1.6, -143.4], [5, -144.8], [5.6, -139], [2.8, -136.8]], SKIN, { sd: 1.2, lw: 1.2, rim: false }); // ear
  const blink = t % 4.2 < 0.11;
  if (blink) stroke(g, [[7.6, -141.4], [10.6, -140.8], [13.6, -141.6]], INK, 1.3);
  else {
    g.beginPath(); trace(g, [[7.8, -142.2], [10.6, -140.2], [13.4, -142.6], [10.8, -144.2]]); g.fillStyle = '#fbf6f2'; g.fill();
    const ig = g.createLinearGradient(0, -144, 0, -139.4); ig.addColorStop(0, mix(eyeC, '#000000', 0.45)); ig.addColorStop(1, mix(eyeC, '#ffffff', 0.35));
    g.beginPath(); g.ellipse(11, -141.7, 1.75, 2.35, 0, 0, TAU); g.fillStyle = ig; g.fill();
    g.beginPath(); g.ellipse(11.1, -141.9, 0.75, 1.3, 0, 0, TAU); g.fillStyle = '#0c0814'; g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(10.5, -142.9, 0.55, 0, TAU); g.fill(); g.beginPath(); g.arc(11.7, -140.6, 0.3, 0, TAU); g.fill();
    g.beginPath(); trace(g, [[7.2, -142.4], [9.4, -144.4], [12.6, -144.6], [14.4, -143.2, 1], [15.4, -144.6, 1], [13.8, -142.6, 1], [12.4, -143.4], [9.6, -143.2], [7.6, -141.6, 1]]); g.fillStyle = INK; g.fill();
    g.beginPath(); g.ellipse(17.6, -141.6, 0.9, 1.9, 0, 0, TAU); g.fillStyle = mix(eyeC, '#000000', 0.2); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(17.4, -142.5, 0.35, 0, TAU); g.fill();
    g.beginPath(); trace(g, [[16.2, -143.4], [18.2, -144], [19.4, -143, 1], [18.6, -142.8], [16.6, -142.6, 1]]); g.fillStyle = INK; g.fill();
  }
  g.beginPath(); trace(g, [[6.6, -146.2], [10.4, -147.4], [14.6, -146.4, 1], [10.6, -146.2], [6.8, -145.4, 1]]); g.fillStyle = INK; g.fill();
  g.beginPath(); trace(g, [[16.4, -146.4, 1], [19.2, -146.6], [19.6, -145.8, 1], [16.8, -145.6, 1]]); g.fillStyle = INK; g.fill();
  stroke(g, [[19.2, -139.8], [20.4, -137.6], [19.2, -137.2]], 'rgba(120,60,50,.8)', 0.7);
  stroke(g, [[14.6, -133.8], [16.4, -133.4], [17.4, -133.9]], '#6a2a2a', 0.8);
  if (mask) { // cloth over nose and mouth
    part(g, [[4.6, -137.6], [13, -139.4], [21.4, -139], [21, -134.4], [16, -130.2], [12.4, -128.4, 1], [7.4, -130.4], [4.4, -134]], mask, { sd: 1.6, lw: 1.8 });
    stroke(g, [[8, -134], [14, -136], [19, -135.4]], 'rgba(0,0,0,.4)', 0.6);
  } else glow(g, 11, -141.7, 4, eyeC, 0.25 + 0.1 * Math.sin(t * 3));
  g.restore();
}
// the whole head: c = skull centre, r = skull radius
// o: { style, hair (colour id), eye, t, mask?: palette, turn?: −1..1 }
export function head(g, view, o, c, r = 12.6, sway = 0) {
  const H = (HAIR_COLORS[o.hair] || HAIR_COLORS.silver).P, phi = VIEW_ANGLE[view], t = o.t;
  const hp = hairParts(HAIR_STYLES[o.style] ? o.style : 'spiky', c, r, phi, t, sway);
  const capPts = (k = 1.04) => Array.from({ length: 16 }, (_, i) => [c[0] + Math.cos((i / 16) * TAU) * r * k, c[1] + Math.sin((i / 16) * TAU) * r * k]);
  for (const s of hp.back) part(g, s.pts, H, { sd: 2.4, lw: 1.8 });
  part(g, capPts(), H, { sd: 3, lw: 2 });
  if (view === 'back') {
    for (const s of [-1, 1]) part(g, [[c[0] + s * r * 0.86, c[1] + 2], [c[0] + s * r * 1.08, c[1] + 1], [c[0] + s * r * 1.06, c[1] + 6], [c[0] + s * r * 0.84, c[1] + 7.4]], SKIN, { sd: 1, lw: 1.2, rim: false });
  } else {
    if (view === 'front') faceFront(g, [c[0], c[1] + 2], o.eye, t, o.turn || 0, o.mask); else faceSide(g, c, o.eye, t, o.mask);
    // the hair cap over the forehead (the face is drawn up to the crown)
    g.save(); g.beginPath(); g.rect(c[0] - 40, c[1] - 40, 80, 40 - r * (view === 'front' ? 0.42 : 0.24)); g.clip();
    part(g, capPts(), H, { sd: 3, lw: 2 });
    g.restore();
  }
  for (const s of hp.front) part(g, s.pts, H, { sd: 2.2, lw: 1.8 });
  if (HAIR_STYLES[o.style]?.tie) { // the ponytail's gold ring
    const [a, e] = HAIR_STYLES[o.style].tie, [rx, ry, rz] = rad(a, e), cs = Math.cos(phi), sn = Math.sin(phi);
    const x = c[0] + (rx * cs + rz * sn) * r * 0.95, y = c[1] + ry * r * 0.95;
    if (-rx * sn + rz * cs < 0.3) part(g, [[x - 2.4, y - 1.6], [x + 2.4, y - 1.6], [x + 2.4, y + 1.6], [x - 2.4, y + 1.6]], GOLD, { sd: 1, lw: 1.2 });
  }
  g.save(); g.globalAlpha = 0.8; // anime shine band across the crown
  const sh = view === 'side' ? [[c[0] - 6, c[1] - r * 0.78], [c[0] + 1, c[1] - r * 0.96], [c[0] + 7, c[1] - r * 0.86]] : [[c[0] - 6, c[1] - r * 0.8], [c[0], c[1] - r * 0.95], [c[0] + 6, c[1] - r * 0.8]];
  stroke(g, sh, H.hi === '#ffffff' ? '#ffffff' : mix(H.hi, '#ffffff', 0.5), 1.4);
  g.restore();
  headpiece(g, o.gear?.helm, c, r, phi, t); // the worn helm (gearfx.js)
  pendant(g, o.gear?.amulet, c, view, t);
}

