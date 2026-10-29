// Dungeon room look (spec §18.3): any room shape from run/room.js drawn in the
// theme of its dungeon — floor slabs, walls along the outline, lane corridors,
// pillars, and decor per theme (torches & mushrooms, crystals, giant
// mushrooms, lava cracks & braziers, the tomb's sand drifts, sarcophagi, urns
// and treasure; the spire's eclipse sigils, black crystals, floating stones and
// violet flames). Decor is placed once per room.
import { ROOM } from '../data/dungeon.js';
import { OUT } from '../art/sprites.js';
import { outline, inside } from '../run/room.js';

const TAU = Math.PI * 2;
const cache = new WeakMap(); // room → decor

// Floor slabs in the theme's two colours.
export function flagTile(scale, [c0, c1]) {
  const T = 128;
  const c = document.createElement('canvas');
  c.width = c.height = Math.ceil(T * scale);
  const g = c.getContext('2d');
  g.scale(c.width / T, c.height / T);
  g.fillStyle = c1; g.fillRect(0, 0, T, T);
  let s = 31;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let row = 0; row < 4; row++) {
    const y = row * 32, shift = row % 2 ? 20 : 0;
    let x = 0;
    while (x < T) {
      const w = Math.min(T - x, 26 + Math.floor(r() * 18));
      const k = 0.85 + r() * 0.3;
      for (const ox of [shift, shift - T]) {
        g.beginPath(); g.roundRect(x + ox + 1.2, y + 1.2, w - 2.4, 29.6, 5);
        g.fillStyle = c0; g.globalAlpha = k; g.fill(); g.globalAlpha = 1;
        g.beginPath(); g.roundRect(x + ox + 3, y + 2.5, w - 7, 4, 2);
        g.fillStyle = 'rgba(255,255,255,.05)'; g.fill();
      }
      if (r() < 0.3) {
        const cx = x + shift + 6 + r() * (w - 12), cy = y + 6 + r() * 20;
        g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + 5, cy + 4); g.lineTo(cx + 3, cy + 9);
        g.lineWidth = 0.8; g.strokeStyle = 'rgba(0,0,0,.45)'; g.stroke();
      }
      x += w;
    }
  }
  return { canvas: c, T };
}

// lanes cut a gap in the wall: keep wall decor away from them
const nearLane = (room, x, y) => room.lanes.some((l) => Math.hypot(l.x - x, l.y - y) < ROOM.laneWidth);

export function dress(room, theme) {
  let d = cache.get(room);
  if (d) return d;
  // Lehmer PRNG needs a seed in 1 … 2^31 − 2
  let s = (Math.abs(7 + room.parts.length * 131 + Math.round(room.parts[0].x * 3 + room.parts[0].y)) % 2147483646) + 1;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const wall = outline(room, theme.decor === 'torch' ? 170 : 150).filter((p) => !nearLane(room, p.x, p.y));
  // a point on the floor a little inside the wall
  const nearWall = () => {
    const p = wall[Math.floor(r() * wall.length)], k = 24 + r() * 60;
    return { x: p.x - p.nx * k, y: p.y - p.ny * k };
  };
  const onFloor = () => {
    for (let i = 0; i < 40; i++) {
      const x = (r() * 2 - 1) * room.bound * 0.8, y = (r() * 2 - 1) * room.bound * 0.8;
      if (inside(room, x, y, 30) && Math.hypot(x, y) > 120) return { x, y };
    }
    return { x: 200, y: 0 };
  };
  d = { lamps: [], glows: [], rubble: [], cracks: [], sand: [], falls: [] };
  const [g0, g1] = theme.glow;
  const tomb = theme.decor === 'tomb', spire = theme.decor === 'spire';
  const lampKind = theme.decor === 'lava' ? 'brazier' : theme.decor === 'crystal' ? 'crystal' : tomb ? 'sconce' : spire ? 'violet' : 'torch';
  for (const p of wall) d.lamps.push({ x: p.x - p.nx * 4, y: p.y - p.ny * 4, kind: lampKind });
  const glowCount = theme.decor === 'shroom' ? 16 : theme.decor === 'crystal' ? 14 : 12;
  for (let i = 0; i < glowCount; i++) {
    const at = theme.decor === 'lava' ? onFloor() : nearWall();
    const cool = r() < 0.6;
    const caps = [];
    for (let k = 0, n = 2 + Math.floor(r() * 3); k < n; k++) caps.push({ dx: (r() - 0.5) * 22, dy: (r() - 0.5) * 12, s: 0.6 + r() * 0.7 });
    caps.sort((a, b) => a.dy - b.dy);
    d.glows.push({ ...at, rgb: cool ? g0 : g1, caps, big: theme.decor === 'shroom' && r() < 0.4 });
    if (tomb) { const k = r(); d.glows[d.glows.length - 1].item = k < 0.3 ? 'sarco' : k < 0.7 ? 'urn' : 'coins'; d.glows[d.glows.length - 1].rgb = k < 0.3 ? g1 : g0; }
    if (spire) { const k = r(); const gl = d.glows[d.glows.length - 1]; gl.item = k < 0.45 ? 'shards' : k < 0.75 ? 'stone' : 'rune'; gl.rgb = k < 0.75 ? g0 : g1; gl.ph = r() * TAU; }
  }
  if (tomb) { // sand piled against the walls, and a few spots where sand trickles from the ceiling
    for (let i = 0; i < 26; i++) { const p = wall[Math.floor(r() * wall.length)]; d.sand.push({ x: p.x - p.nx * 18, y: p.y - p.ny * 18, rx: 30 + r() * 40, ry: 12 + r() * 10, rot: Math.atan2(p.ny, p.nx) + Math.PI / 2 }); }
    for (let i = 0; i < 5; i++) d.falls.push({ ...onFloor(), ph: r() });
  }
  if (spire) { // a faint spiral stair climbing one wall
    const p = wall[Math.floor(r() * wall.length)];
    d.stair = { x: p.x - p.nx * 90, y: p.y - p.ny * 90 };
  }
  if (theme.decor === 'lava') {
    for (let i = 0; i < 9; i++) {
      const a = onFloor(), pts = [[a.x, a.y]];
      let ang = r() * TAU;
      for (let k = 0; k < 4; k++) { ang += (r() - 0.5) * 1.4; const [px, py] = pts[pts.length - 1]; pts.push([px + Math.cos(ang) * (20 + r() * 25), py + Math.sin(ang) * (20 + r() * 25)]); }
      d.cracks.push(pts);
    }
  }
  for (let i = 0; i < 60; i++) {
    const p = onFloor();
    d.rubble.push({ ...p, s: 1.5 + r() * 3.5, bone: r() < 0.18, rot: r() * TAU });
  }
  cache.set(room, d);
  return d;
}

function partPath(g, p, grow = 0) {
  if (p.kind === 'c') g.arc(p.x, p.y, p.r + grow, 0, TAU);
  else g.rect(p.x - grow, p.y - grow, p.w + grow * 2, p.h + grow * 2);
}

// Floor, walls, corridors, pillars and floor decor (below the actors).
export function drawRoom(g, room, theme, ground, t, visible) {
  const d = dress(room, theme);
  const W = ROOM.wall;
  // wall band: dark outline then the wall colour, both outside the floor
  for (const [lw, col] of [[W * 2 + 4, OUT], [W * 2, theme.wall]]) {
    g.lineWidth = lw; g.strokeStyle = col;
    for (const p of room.parts) { g.beginPath(); partPath(g, p); g.stroke(); }
  }
  // corridors cut through the wall, fading into the dark
  for (const l of room.lanes) {
    g.save();
    g.translate(l.x, l.y); g.rotate(l.a);
    const w = ROOM.laneWidth / 2, len = W + ROOM.laneLen;
    g.fillStyle = ground; g.fillRect(-24, -w, len + 24, w * 2);
    const gr = g.createLinearGradient(W * 0.5, 0, len, 0);
    gr.addColorStop(0, 'rgba(5,4,12,0)'); gr.addColorStop(1, 'rgba(5,4,12,1)');
    g.fillStyle = gr; g.fillRect(W * 0.5, -w - 1, len, w * 2 + 2);
    g.fillStyle = theme.wall;
    for (const sd of [-1, 1]) g.fillRect(0, sd > 0 ? w : -w - 12, len * 0.7, 12);
    g.restore();
  }
  // floor
  g.fillStyle = ground;
  for (const p of room.parts) { g.beginPath(); partPath(g, p, 1); g.fill(); }
  const worn = g.createRadialGradient(0, 0, 0, 0, 0, room.bound);
  worn.addColorStop(0, 'rgba(255,255,255,.05)'); worn.addColorStop(0.6, 'rgba(0,0,0,0)'); worn.addColorStop(1, 'rgba(0,0,0,.35)');
  g.fillStyle = worn;
  for (const p of room.parts) { g.beginPath(); partPath(g, p); g.fill(); }
  if (theme.decor === 'spire') spireFloor(g, room, d, t);
  // lava cracks glow from below
  for (const c of d.cracks) {
    g.beginPath(); c.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.lineWidth = 6; g.strokeStyle = '#2a120c'; g.stroke();
    g.lineWidth = 3; g.strokeStyle = `rgba(255,${110 + Math.sin(t * 2 + c[0][0]) * 30},40,.95)`; g.stroke();
  }
  for (const m of d.sand) {
    if (!visible(m.x, m.y, 70)) continue;
    g.beginPath(); g.ellipse(m.x, m.y, m.rx, m.ry, m.rot, 0, TAU); g.fillStyle = 'rgba(214,176,112,.55)'; g.fill();
    g.beginPath(); g.ellipse(m.x - 4, m.y - 3, m.rx * 0.6, m.ry * 0.5, m.rot, 0, TAU); g.fillStyle = 'rgba(240,210,150,.35)'; g.fill();
  }
  for (const f of d.falls) { // little sand cones under the trickles
    if (!visible(f.x, f.y, 30)) continue;
    g.beginPath(); g.ellipse(f.x, f.y, 14, 6, 0, 0, TAU); g.fillStyle = 'rgba(214,176,112,.6)'; g.fill();
  }
  for (const r of d.rubble) {
    if (!visible(r.x, r.y)) continue;
    if (r.bone) {
      g.save(); g.translate(r.x, r.y); g.rotate(r.rot);
      g.beginPath(); g.roundRect(-r.s * 1.6, -0.9, r.s * 3.2, 1.8, 0.9);
      g.arc(-r.s * 1.6, -1, 1.3, 0, TAU); g.arc(r.s * 1.6, 1, 1.3, 0, TAU);
      g.fillStyle = '#8f8aa3'; g.fill();
      g.restore();
    } else {
      g.beginPath(); g.ellipse(r.x, r.y, r.s, r.s * 0.7, r.rot, 0, TAU);
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fill();
    }
  }
  for (const q of room.pillars) pillar(g, q, theme);
  for (const gl of d.glows) if (visible(gl.x, gl.y, 40)) glowThing(g, gl, theme);
  for (const l of d.lamps) if (visible(l.x, l.y, 40)) lampBase(g, l);
}

function pillar(g, q, theme) {
  g.beginPath(); g.ellipse(q.x, q.y + q.r * 0.5, q.r * 1.1, q.r * 0.45, 0, 0, TAU); g.fillStyle = 'rgba(0,0,0,.4)'; g.fill();
  if (theme.decor === 'tomb') { tombPillar(g, q); return; }
  if (theme.decor === 'spire') { spirePillar(g, q); return; }
  g.beginPath(); g.roundRect(q.x - q.r, q.y - q.r * 2.4, q.r * 2, q.r * 2.9, q.r * 0.4);
  const gr = g.createLinearGradient(q.x - q.r, 0, q.x + q.r, 0);
  gr.addColorStop(0, theme.wall); gr.addColorStop(0.5, '#8a86a0'); gr.addColorStop(1, theme.wall);
  g.fillStyle = gr; g.fill(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke();
  g.beginPath(); g.ellipse(q.x, q.y - q.r * 2.4, q.r, q.r * 0.4, 0, 0, TAU); g.fillStyle = '#9a96b0'; g.fill(); g.stroke();
}

// sandstone column with carved bands of made-up glyphs and a gold-painted capital
function tombPillar(g, q) {
  const x = q.x - q.r, y = q.y - q.r * 2.4, w = q.r * 2, h = q.r * 2.9;
  g.beginPath(); g.rect(x, y, w, h);
  const gr = g.createLinearGradient(x, 0, x + w, 0);
  gr.addColorStop(0, '#6a5236'); gr.addColorStop(0.5, '#c9a878'); gr.addColorStop(1, '#6a5236');
  g.fillStyle = gr; g.fill(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke();
  // glyph bands: simple shapes (eye, wave, sun, staff) that read as carving, not text
  g.strokeStyle = 'rgba(60,40,20,.75)'; g.lineWidth = 1.2;
  for (let row = 0; row < 3; row++) {
    const yy = y + h * (0.22 + row * 0.25), sx = q.r * 0.45;
    const kind = (row + Math.round(q.x)) % 4;
    g.beginPath();
    if (kind === 0) { g.ellipse(q.x, yy, sx, sx * 0.45, 0, 0, TAU); g.moveTo(q.x + 1.5, yy); g.arc(q.x, yy, 1.5, 0, TAU); }
    else if (kind === 1) { g.moveTo(q.x - sx, yy); for (let i = 1; i <= 4; i++) g.lineTo(q.x - sx + (i * sx) / 2, yy + (i % 2 ? -3 : 3)); }
    else if (kind === 2) { g.arc(q.x, yy, sx * 0.5, 0, TAU); for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; g.moveTo(q.x + Math.cos(a) * sx * 0.7, yy + Math.sin(a) * sx * 0.7); g.lineTo(q.x + Math.cos(a) * sx, yy + Math.sin(a) * sx); } }
    else { g.moveTo(q.x, yy - sx); g.lineTo(q.x, yy + sx); g.moveTo(q.x - sx * 0.5, yy - sx * 0.5); g.quadraticCurveTo(q.x, yy - sx * 1.1, q.x + sx * 0.5, yy - sx * 0.5); }
    g.stroke();
  }
  g.beginPath(); g.ellipse(q.x, y, q.r * 1.15, q.r * 0.45, 0, 0, TAU); g.fillStyle = '#d9b46a'; g.fill(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke();
  g.beginPath(); g.ellipse(q.x, y, q.r * 0.8, q.r * 0.28, 0, 0, TAU); g.fillStyle = '#2fa89a'; g.fill();
}

function lampBase(g, l) {
  if (l.kind === 'sconce') { // sandstone fire bowl with a gold rim
    g.beginPath(); g.rect(l.x - 3, l.y - 10, 6, 10); g.fillStyle = '#8a6a44'; g.fill(); g.lineWidth = 1.2; g.strokeStyle = OUT; g.stroke();
    g.beginPath(); g.moveTo(l.x - 10, l.y - 16); g.lineTo(l.x + 10, l.y - 16); g.quadraticCurveTo(l.x + 8, l.y - 9, l.x, l.y - 9); g.quadraticCurveTo(l.x - 8, l.y - 9, l.x - 10, l.y - 16); g.closePath();
    g.fillStyle = '#b8925c'; g.fill(); g.stroke();
    g.beginPath(); g.moveTo(l.x - 10, l.y - 16); g.lineTo(l.x + 10, l.y - 16); g.lineWidth = 2; g.strokeStyle = '#ffc94d'; g.stroke();
  } else if (l.kind === 'violet') { // black iron stand and bowl for a violet flame
    g.beginPath(); g.rect(l.x - 2, l.y - 14, 4, 14); g.fillStyle = '#1c1628'; g.fill(); g.lineWidth = 1.2; g.strokeStyle = OUT; g.stroke();
    g.beginPath(); g.moveTo(l.x - 9, l.y - 18); g.lineTo(l.x + 9, l.y - 18); g.lineTo(l.x + 5, l.y - 12); g.lineTo(l.x - 5, l.y - 12); g.closePath();
    g.fillStyle = '#2e2440'; g.fill(); g.stroke();
    g.beginPath(); g.moveTo(l.x - 9, l.y - 18); g.lineTo(l.x + 9, l.y - 18); g.lineWidth = 1.6; g.strokeStyle = '#e6c27a'; g.stroke();
  } else if (l.kind === 'brazier') {
    g.beginPath(); g.moveTo(l.x - 9, l.y - 14); g.lineTo(l.x + 9, l.y - 14); g.lineTo(l.x + 5, l.y - 4); g.lineTo(l.x - 5, l.y - 4); g.closePath();
    g.fillStyle = '#3a2a22'; g.fill(); g.lineWidth = 1.4; g.strokeStyle = OUT; g.stroke();
    g.beginPath(); g.rect(l.x - 1.5, l.y - 4, 3, 6); g.fillStyle = '#2a1d19'; g.fill();
  } else if (l.kind === 'crystal') {
    for (const [dx, h, w] of [[-5, 16, 4], [2, 24, 5], [8, 13, 3.5]]) {
      g.beginPath(); g.moveTo(l.x + dx - w, l.y); g.lineTo(l.x + dx, l.y - h); g.lineTo(l.x + dx + w, l.y); g.closePath();
      g.fillStyle = '#6ec9ff'; g.fill(); g.lineWidth = 1.2; g.strokeStyle = OUT; g.stroke();
      g.beginPath(); g.moveTo(l.x + dx - w * 0.3, l.y - 2); g.lineTo(l.x + dx, l.y - h + 3); g.lineWidth = 1; g.strokeStyle = 'rgba(255,255,255,.7)'; g.stroke();
    }
  } else {
    g.beginPath(); g.ellipse(l.x, l.y, 7, 5, 0, 0, TAU); g.fillStyle = '#3a3346'; g.fill(); g.lineWidth = 1.4; g.strokeStyle = OUT; g.stroke();
    g.beginPath(); g.roundRect(l.x - 2.5, l.y - 16, 5, 16, 2); g.fillStyle = '#6a4630'; g.fill(); g.stroke();
    g.beginPath(); g.moveTo(l.x - 6, l.y - 16); g.lineTo(l.x + 6, l.y - 16); g.lineTo(l.x + 4, l.y - 21); g.lineTo(l.x - 4, l.y - 21); g.closePath();
    g.fillStyle = '#2f2c40'; g.fill(); g.stroke();
  }
}

// mushrooms (shadow / fungus), crystal shards (crystal), embers (lava)
function glowThing(g, s, theme) {
  if (theme.decor === 'crystal') {
    for (const c of s.caps) {
      const x = s.x + c.dx, y = s.y + c.dy, h = 10 * c.s + 6;
      g.beginPath(); g.moveTo(x - 3 * c.s, y); g.lineTo(x, y - h); g.lineTo(x + 3 * c.s, y); g.closePath();
      g.fillStyle = `rgb(${s.rgb})`; g.fill(); g.lineWidth = 1; g.strokeStyle = OUT; g.stroke();
    }
    return;
  }
  if (theme.decor === 'tomb') { tombThing(g, s); return; }
  if (theme.decor === 'spire') { spireThing(g, s, theme); return; }
  if (theme.decor === 'lava') {
    g.beginPath(); g.ellipse(s.x, s.y, 16, 7, 0, 0, TAU); g.fillStyle = '#2a120c'; g.fill();
    g.beginPath(); g.ellipse(s.x, s.y, 12, 5, 0, 0, TAU); g.fillStyle = `rgb(${s.rgb})`; g.fill();
    return;
  }
  const k0 = s.big ? 2.2 : 1;
  for (const c of s.caps) {
    const x = s.x + c.dx * k0, y = s.y + c.dy * k0, k = c.s * k0;
    g.beginPath(); g.roundRect(x - 1.6 * k, y - 7 * k, 3.2 * k, 7 * k, 1.5 * k);
    g.fillStyle = '#d9d2ea'; g.fill(); g.lineWidth = 1; g.strokeStyle = OUT; g.stroke();
    g.beginPath(); g.ellipse(x, y - 7 * k, 6 * k, 4 * k, 0, Math.PI, 0); g.closePath();
    g.fillStyle = `rgb(${s.rgb})`; g.fill(); g.lineWidth = 1.2; g.stroke();
    g.beginPath(); g.arc(x - 2 * k, y - 8.5 * k, 1 * k, 0, TAU); g.arc(x + 2.2 * k, y - 9 * k, 0.8 * k, 0, TAU);
    g.fillStyle = 'rgba(255,255,255,.8)'; g.fill();
  }
}

// tomb furniture: a sarcophagus with a teal-gemmed lid, clay urns, heaps of coins
function tombThing(g, s) {
  const { x, y } = s;
  if (s.item === 'sarco') {
    g.beginPath(); g.ellipse(x, y + 4, 26, 8, 0, 0, TAU); g.fillStyle = 'rgba(0,0,0,.35)'; g.fill();
    g.beginPath(); g.roundRect(x - 24, y - 14, 48, 18, 7); g.fillStyle = '#8a6a44'; g.fill(); g.lineWidth = 1.4; g.strokeStyle = OUT; g.stroke();
    g.beginPath(); g.roundRect(x - 22, y - 20, 44, 12, 6); g.fillStyle = '#d9b46a'; g.fill(); g.stroke();
    g.strokeStyle = '#24407a'; g.lineWidth = 2;
    for (const dx of [-12, -4, 4, 12]) { g.beginPath(); g.moveTo(x + dx, y - 19); g.lineTo(x + dx, y - 9); g.stroke(); }
    g.beginPath(); g.arc(x - 16, y - 14, 3, 0, TAU); g.fillStyle = `rgb(${s.rgb})`; g.fill(); g.lineWidth = 1; g.strokeStyle = OUT; g.stroke();
    return;
  }
  if (s.item === 'urn') {
    for (const c of s.caps) {
      const ux = x + c.dx, uy = y + c.dy, k = 0.8 + c.s * 0.5;
      g.beginPath(); g.ellipse(ux, uy, 6 * k, 2.5 * k, 0, 0, TAU); g.fillStyle = 'rgba(0,0,0,.35)'; g.fill();
      g.beginPath(); g.moveTo(ux - 3 * k, uy - 15 * k); g.quadraticCurveTo(ux - 9 * k, uy - 9 * k, ux - 4 * k, uy); g.lineTo(ux + 4 * k, uy);
      g.quadraticCurveTo(ux + 9 * k, uy - 9 * k, ux + 3 * k, uy - 15 * k); g.closePath();
      g.fillStyle = '#a8603a'; g.fill(); g.lineWidth = 1; g.strokeStyle = OUT; g.stroke();
      g.beginPath(); g.moveTo(ux - 6 * k, uy - 8 * k); g.lineTo(ux + 6 * k, uy - 8 * k); g.strokeStyle = '#2fa89a'; g.lineWidth = 1.4; g.stroke();
    }
    return;
  }
  // coins: a low heap with a few gems
  g.beginPath(); g.ellipse(x, y, 16, 6, 0, 0, TAU); g.fillStyle = '#b8862a'; g.fill(); g.lineWidth = 1; g.strokeStyle = OUT; g.stroke();
  g.beginPath(); g.ellipse(x, y - 3, 11, 5, 0, 0, TAU); g.fillStyle = '#ffd36b'; g.fill();
  for (const c of s.caps) { g.beginPath(); g.arc(x + c.dx * 0.6, y + c.dy * 0.4 - 4, 1.6 * c.s, 0, TAU); g.fillStyle = '#fff2b0'; g.fill(); }
}

// Menara Gerhana (spec §26.7)
// a great eclipse sigil in the middle of the floor (rings, a dark disc, rays), a faint
// spiral stair, and small sigils under the rune stones
function sigil(g, x, y, R, t, a) {
  g.save(); g.translate(x, y); g.scale(1, 0.55);
  g.lineWidth = 2; g.strokeStyle = `rgba(199,155,255,${a})`;
  g.beginPath(); g.arc(0, 0, R, 0, TAU); g.stroke();
  g.setLineDash([10, 8]); g.lineDashOffset = -t * 8;
  g.beginPath(); g.arc(0, 0, R * 0.82, 0, TAU); g.stroke();
  g.setLineDash([]);
  g.strokeStyle = `rgba(255,220,140,${a * 0.9})`;
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * TAU + t * 0.05;
    g.beginPath(); g.moveTo(Math.cos(ang) * R * 0.42, Math.sin(ang) * R * 0.42); g.lineTo(Math.cos(ang) * R * (i % 2 ? 0.62 : 0.74), Math.sin(ang) * R * (i % 2 ? 0.62 : 0.74)); g.stroke();
  }
  g.beginPath(); g.arc(0, 0, R * 0.36, 0, TAU); g.fillStyle = `rgba(4,2,10,${a + 0.2})`; g.fill();
  g.lineWidth = 3; g.strokeStyle = `rgba(255,236,170,${a})`; g.stroke();
  g.restore();
}
function spireFloor(g, room, d, t) {
  sigil(g, 0, 0, Math.min(170, room.bound * 0.35), t, 0.2);
  if (d.stair) { // stair steps curling upward, fading
    const { x, y } = d.stair;
    for (let i = 0; i < 9; i++) {
      const a = i * 0.55, rr = 40 + i * 5;
      g.save(); g.translate(x + Math.cos(a) * rr * 0.6, y - i * 6 + Math.sin(a) * rr * 0.3); g.rotate(a);
      g.beginPath(); g.roundRect(-14, -5, 28, 10, 2);
      g.fillStyle = `rgba(42,30,66,${0.85 - i * 0.07})`; g.fill(); g.lineWidth = 1; g.strokeStyle = `rgba(160,120,230,${0.5 - i * 0.04})`; g.stroke();
      g.restore();
    }
  }
}
// black crystal column veined with violet light
function spirePillar(g, q) {
  const x = q.x, y = q.y, R = q.r;
  const pts = [[x - R, y + R * 0.4], [x - R * 1.05, y - R * 1.6], [x - R * 0.4, y - R * 2.9], [x + R * 0.5, y - R * 2.6], [x + R, y - R * 1.5], [x + R * 0.95, y + R * 0.4]];
  g.beginPath(); pts.forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b))); g.closePath();
  const gr = g.createLinearGradient(x - R, 0, x + R, 0);
  gr.addColorStop(0, '#120c1e'); gr.addColorStop(0.45, '#3a2a5a'); gr.addColorStop(1, '#0c0814');
  g.fillStyle = gr; g.fill(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke();
  g.beginPath(); g.moveTo(x - R * 0.2, y - R * 2.5); g.lineTo(x + R * 0.1, y - R * 1.5); g.lineTo(x - R * 0.25, y - R * 0.6); g.lineTo(x + R * 0.05, y + R * 0.2);
  g.lineWidth = 2; g.strokeStyle = 'rgba(199,155,255,.8)'; g.stroke();
  g.beginPath(); g.moveTo(x - R * 0.7, y - R * 1.6); g.lineTo(x - R * 0.35, y - R * 2.6); g.lineWidth = 1.2; g.strokeStyle = 'rgba(255,255,255,.25)'; g.stroke();
}
// black crystal clusters, stones floating over their shadows, rune stones on a sigil
function spireThing(g, s, theme) {
  const { x, y } = s, t = performance.now() / 1000;
  if (s.item === 'shards') {
    g.beginPath(); g.ellipse(x, y + 2, 16, 6, 0, 0, TAU); g.fillStyle = 'rgba(0,0,0,.4)'; g.fill();
    for (const c of s.caps) {
      const cx = x + c.dx, h = 14 * c.s + 10;
      g.beginPath(); g.moveTo(cx - 4 * c.s, y + c.dy); g.lineTo(cx - 1 * c.s, y + c.dy - h); g.lineTo(cx + 4 * c.s, y + c.dy); g.closePath();
      g.fillStyle = '#1e1530'; g.fill(); g.lineWidth = 1; g.strokeStyle = OUT; g.stroke();
      g.beginPath(); g.moveTo(cx, y + c.dy - 2); g.lineTo(cx - 0.5 * c.s, y + c.dy - h + 3); g.strokeStyle = `rgba(${s.rgb},.9)`; g.lineWidth = 1.2; g.stroke();
    }
    return;
  }
  if (s.item === 'stone') {
    const bob = Math.sin(t * 1.5 + s.ph) * 4;
    g.beginPath(); g.ellipse(x, y + 4, 14 - bob * 0.5, 5, 0, 0, TAU); g.fillStyle = 'rgba(0,0,0,.35)'; g.fill();
    const yy = y - 22 + bob;
    g.beginPath(); g.moveTo(x - 13, yy); g.lineTo(x - 6, yy - 10); g.lineTo(x + 10, yy - 8); g.lineTo(x + 14, yy + 2); g.lineTo(x + 2, yy + 10); g.lineTo(x - 9, yy + 7); g.closePath();
    g.fillStyle = '#2e2440'; g.fill(); g.lineWidth = 1.3; g.strokeStyle = OUT; g.stroke();
    g.beginPath(); g.moveTo(x - 6, yy - 10); g.lineTo(x + 10, yy - 8); g.lineTo(x + 2, yy - 2); g.closePath(); g.fillStyle = '#5a4880'; g.fill();
    g.beginPath(); g.moveTo(x - 5, yy + 2); g.lineTo(x + 4, yy + 4); g.strokeStyle = `rgba(${s.rgb},.85)`; g.lineWidth = 1.4; g.stroke();
    return;
  }
  sigil(g, x, y + 2, 22, t, 0.5); // a rune stone on its own small sigil
  g.beginPath(); g.roundRect(x - 6, y - 20, 12, 22, [5, 5, 1, 1]); g.fillStyle = '#2a2040'; g.fill(); g.lineWidth = 1.2; g.strokeStyle = OUT; g.stroke();
  g.beginPath(); g.arc(x, y - 11, 3, 0, TAU); g.strokeStyle = `rgba(${s.rgb},.95)`; g.lineWidth = 1.4; g.stroke();
}

// lights for the room decor
export function decorLights(room, theme, t, out) {
  const d = dress(room, theme);
  d.lamps.forEach((l, i) => {
    const f = 1 + Math.sin(t * 9 + i * 1.7) * 0.05 + Math.sin(t * 23 + i) * 0.03;
    out.push({ x: l.x, y: l.y - 12, r: (l.kind === 'crystal' ? 140 : 180) * f, rgb: l.kind === 'crystal' ? theme.glow[0] : theme.light, tint: l.kind === 'violet' ? 0.16 : 0.13 });
  });
  for (const s of d.glows) out.push({ x: s.x, y: s.y - 4, r: s.big ? 120 : s.item === 'sarco' ? 60 : 75, rgb: s.rgb, tint: s.item ? 0.08 : 0.12 });
  for (const c of d.cracks) out.push({ x: c[2][0], y: c[2][1], r: 110, rgb: '255,100,30', tint: 0.12 });
  if (theme.decor === 'spire') out.push({ x: 0, y: 0, r: 260 + Math.sin(t * 1.3) * 20, rgb: theme.glow[1], tint: 0.06 }); // the sigil
}

// emissive decor: flames, sparkles, spores, embers
export function decorGlow(g, room, theme, t) {
  const d = dress(room, theme);
  const flame = (x, y, s, ph, violet = false) => {
    const k = 1 + Math.sin(t * 11 + ph) * 0.12;
    g.beginPath(); g.moveTo(x, y - 14 * s * k);
    g.bezierCurveTo(x + 6.5 * s, y - 5 * s, x + 6 * s, y + 3 * s, x, y + 3.5 * s);
    g.bezierCurveTo(x - 6 * s, y + 3 * s, x - 6.5 * s, y - 5 * s, x, y - 14 * s * k);
    const gr = g.createLinearGradient(0, y - 14 * s, 0, y + 3 * s);
    if (violet) { gr.addColorStop(0, 'rgba(150,80,255,0)'); gr.addColorStop(0.4, 'rgba(180,120,255,.85)'); gr.addColorStop(1, 'rgba(255,236,200,.95)'); }
    else { gr.addColorStop(0, 'rgba(255,90,40,0)'); gr.addColorStop(0.4, 'rgba(255,140,50,.85)'); gr.addColorStop(1, 'rgba(255,230,140,.95)'); }
    g.fillStyle = gr; g.fill();
  };
  d.lamps.forEach((l, i) => {
    if (l.kind === 'torch') flame(l.x, l.y - 22, 1, i * 2);
    else if (l.kind === 'sconce') { flame(l.x - 3, l.y - 17, 0.8, i); flame(l.x + 3, l.y - 17, 0.7, i + 3); }
    else if (l.kind === 'brazier') { flame(l.x - 4, l.y - 15, 0.9, i); flame(l.x + 4, l.y - 15, 0.8, i + 2); }
    else if (l.kind === 'violet') { flame(l.x - 3, l.y - 19, 0.85, i, true); flame(l.x + 3, l.y - 19, 0.7, i + 2, true); }
    else { // crystal sparkle
      const k = 0.5 + 0.5 * Math.sin(t * 3 + i);
      g.beginPath(); g.arc(l.x + 2, l.y - 20, 2 + k * 2, 0, TAU); g.fillStyle = `rgba(${theme.glow[0]},${0.4 + k * 0.5})`; g.fill();
    }
  });
  for (const f of d.falls) { // sand trickling from cracks in the ceiling, on and off
    const on = (t * 0.15 + f.ph) % 1;
    if (on > 0.55) continue;
    const a = Math.min(1, on * 8, (0.55 - on) * 8) * 0.8;
    for (let i = 0; i < 8; i++) {
      const ph = (t * 1.6 + i / 8) % 1;
      g.beginPath(); g.arc(f.x + Math.sin(i * 5) * 2, f.y - 120 + ph * 120, 1.3, 0, TAU);
      g.fillStyle = `rgba(232,200,140,${(a * (0.4 + ph * 0.6)).toFixed(2)})`; g.fill();
    }
  }
  for (const s of d.glows) {
    if (s.item === 'sarco' || s.item === 'urn' || s.item === 'stone') continue; // no sparks from furniture / floating stones
    for (let i = 0; i < 2; i++) {
      const ph = (t * (theme.decor === 'lava' ? 0.6 : 0.25) + i * 0.5 + s.x * 0.01) % 1;
      g.beginPath(); g.arc(s.x + Math.sin(t + i * 3 + s.y) * 8, s.y - 10 - ph * 26, 1.3 * (1 - ph) * (s.big ? 1.6 : 1), 0, TAU);
      g.fillStyle = `rgba(${s.rgb},${1 - ph})`; g.fill();
    }
  }
}
