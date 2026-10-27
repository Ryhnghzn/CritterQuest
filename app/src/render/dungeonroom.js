// Dungeon room look (spec §18.3): any room shape from run/room.js drawn in the
// theme of its dungeon — floor slabs, walls along the outline, lane corridors,
// pillars, and decor per theme (torches & mushrooms, crystals, giant
// mushrooms, lava cracks & braziers). Decor is placed once per room.
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
  d = { lamps: [], glows: [], rubble: [], cracks: [] };
  const [g0, g1] = theme.glow;
  for (const p of wall) d.lamps.push({ x: p.x - p.nx * 4, y: p.y - p.ny * 4, kind: theme.decor === 'lava' ? 'brazier' : theme.decor === 'crystal' ? 'crystal' : 'torch' });
  const glowCount = theme.decor === 'shroom' ? 16 : theme.decor === 'crystal' ? 14 : 12;
  for (let i = 0; i < glowCount; i++) {
    const at = theme.decor === 'lava' ? onFloor() : nearWall();
    const cool = r() < 0.6;
    const caps = [];
    for (let k = 0, n = 2 + Math.floor(r() * 3); k < n; k++) caps.push({ dx: (r() - 0.5) * 22, dy: (r() - 0.5) * 12, s: 0.6 + r() * 0.7 });
    caps.sort((a, b) => a.dy - b.dy);
    d.glows.push({ ...at, rgb: cool ? g0 : g1, caps, big: theme.decor === 'shroom' && r() < 0.4 });
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
  // lava cracks glow from below
  for (const c of d.cracks) {
    g.beginPath(); c.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.lineWidth = 6; g.strokeStyle = '#2a120c'; g.stroke();
    g.lineWidth = 3; g.strokeStyle = `rgba(255,${110 + Math.sin(t * 2 + c[0][0]) * 30},40,.95)`; g.stroke();
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
  g.beginPath(); g.roundRect(q.x - q.r, q.y - q.r * 2.4, q.r * 2, q.r * 2.9, q.r * 0.4);
  const gr = g.createLinearGradient(q.x - q.r, 0, q.x + q.r, 0);
  gr.addColorStop(0, theme.wall); gr.addColorStop(0.5, '#8a86a0'); gr.addColorStop(1, theme.wall);
  g.fillStyle = gr; g.fill(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke();
  g.beginPath(); g.ellipse(q.x, q.y - q.r * 2.4, q.r, q.r * 0.4, 0, 0, TAU); g.fillStyle = '#9a96b0'; g.fill(); g.stroke();
}

function lampBase(g, l) {
  if (l.kind === 'brazier') {
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

// lights for the room decor
export function decorLights(room, theme, t, out) {
  const d = dress(room, theme);
  d.lamps.forEach((l, i) => {
    const f = 1 + Math.sin(t * 9 + i * 1.7) * 0.05 + Math.sin(t * 23 + i) * 0.03;
    out.push({ x: l.x, y: l.y - 12, r: (l.kind === 'crystal' ? 140 : 180) * f, rgb: l.kind === 'crystal' ? theme.glow[0] : theme.light, tint: 0.13 });
  });
  for (const s of d.glows) out.push({ x: s.x, y: s.y - 4, r: s.big ? 120 : 75, rgb: s.rgb, tint: 0.12 });
  for (const c of d.cracks) out.push({ x: c[2][0], y: c[2][1], r: 110, rgb: '255,100,30', tint: 0.12 });
}

// emissive decor: flames, sparkles, spores, embers
export function decorGlow(g, room, theme, t) {
  const d = dress(room, theme);
  const flame = (x, y, s, ph) => {
    const k = 1 + Math.sin(t * 11 + ph) * 0.12;
    g.beginPath(); g.moveTo(x, y - 14 * s * k);
    g.bezierCurveTo(x + 6.5 * s, y - 5 * s, x + 6 * s, y + 3 * s, x, y + 3.5 * s);
    g.bezierCurveTo(x - 6 * s, y + 3 * s, x - 6.5 * s, y - 5 * s, x, y - 14 * s * k);
    const gr = g.createLinearGradient(0, y - 14 * s, 0, y + 3 * s);
    gr.addColorStop(0, 'rgba(255,90,40,0)'); gr.addColorStop(0.4, 'rgba(255,140,50,.85)'); gr.addColorStop(1, 'rgba(255,230,140,.95)');
    g.fillStyle = gr; g.fill();
  };
  d.lamps.forEach((l, i) => {
    if (l.kind === 'torch') flame(l.x, l.y - 22, 1, i * 2);
    else if (l.kind === 'brazier') { flame(l.x - 4, l.y - 15, 0.9, i); flame(l.x + 4, l.y - 15, 0.8, i + 2); }
    else { // crystal sparkle
      const k = 0.5 + 0.5 * Math.sin(t * 3 + i);
      g.beginPath(); g.arc(l.x + 2, l.y - 20, 2 + k * 2, 0, TAU); g.fillStyle = `rgba(${theme.glow[0]},${0.4 + k * 0.5})`; g.fill();
    }
  });
  for (const s of d.glows) {
    for (let i = 0; i < 2; i++) {
      const ph = (t * (theme.decor === 'lava' ? 0.6 : 0.25) + i * 0.5 + s.x * 0.01) % 1;
      g.beginPath(); g.arc(s.x + Math.sin(t + i * 3 + s.y) * 8, s.y - 10 - ph * 26, 1.3 * (1 - ph) * (s.big ? 1.6 : 1), 0, TAU);
      g.fillStyle = `rgba(${s.rgb},${1 - ph})`; g.fill();
    }
  }
}
