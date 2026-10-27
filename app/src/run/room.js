// Room shapes (spec §18.3): each floor picks one at random — round, pillared
// hall, cross, twin chambers, cave. A room is a union of circles and boxes
// (`parts`) plus solid round `pillars`; the 4 lanes open where a ray from the
// centre leaves the room. Pure geometry, used by the run and the renderer.
const TAU = Math.PI * 2;
export const SHAPES = ['round', 'hall', 'cross', 'twin', 'cave'];
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // N, E, S, W

const circle = (x, y, r) => ({ kind: 'c', x, y, r });
const box = (x, y, w, h) => ({ kind: 'r', x, y, w, h });

// rng: () => [0, 1). The centre (0, 0) is always open (spawn & portals).
export function makeRoom(shape, rng) {
  let parts, pillars = [];
  switch (shape) {
    case 'hall':
      parts = [box(-520, -400, 1040, 800)];
      for (const [x, y] of [[-260, -190], [260, -190], [-260, 190], [260, 190]]) pillars.push({ x, y, r: 30 });
      break;
    case 'cross':
      parts = [box(-600, -190, 1200, 380), box(-190, -600, 380, 1200), circle(0, 0, 300)];
      break;
    case 'twin':
      parts = [circle(-290, 0, 340), circle(290, 0, 340)];
      pillars.push({ x: -290, y: 0, r: 34 }, { x: 290, y: 0, r: 34 });
      break;
    case 'cave': {
      parts = [circle(0, 0, 300)];
      const n = 5, a0 = rng() * TAU;
      for (let i = 0; i < n; i++) {
        const a = a0 + (i / n) * TAU + (rng() - 0.5) * 0.6, d = 230 + rng() * 110;
        parts.push(circle(Math.cos(a) * d, Math.sin(a) * d, 170 + rng() * 80));
      }
      if (rng() < 0.6) pillars.push({ x: (rng() - 0.5) * 300, y: 170 + rng() * 60, r: 26 });
      break;
    }
    default:
      parts = [circle(0, 0, 560)];
  }
  const room = { shape, parts, pillars, lanes: [], bound: 0 };
  for (const p of parts) room.bound = Math.max(room.bound, p.kind === 'c' ? Math.hypot(p.x, p.y) + p.r : Math.max(Math.abs(p.x), Math.abs(p.x + p.w), Math.abs(p.y), Math.abs(p.y + p.h)) * Math.SQRT2);
  for (const [dx, dy] of DIRS) {
    let d = 0;
    while (inside(room, dx * (d + 4), dy * (d + 4), 0)) d += 4;
    room.lanes.push({ dx, dy, x: dx * d, y: dy * d, a: Math.atan2(dy, dx) });
  }
  return room;
}

function inPart(p, x, y, m) {
  if (p.kind === 'c') return (x - p.x) ** 2 + (y - p.y) ** 2 <= (p.r - m) ** 2;
  return x >= p.x + m && x <= p.x + p.w - m && y >= p.y + m && y <= p.y + p.h - m;
}

// Is (x, y) open floor at least m away from every outer wall? (pillars ignored)
export function inside(room, x, y, m = 0) {
  for (const p of room.parts) if (inPart(p, x, y, m)) return true;
  return false;
}

// Keeps a body of radius r in the room and out of the pillars (mutates o.x, o.y).
export function confine(room, o, r) {
  if (!inside(room, o.x, o.y, r)) {
    let bx = 0, by = 0, bd = Infinity;
    for (const p of room.parts) {
      let nx, ny;
      if (p.kind === 'c') {
        const dx = o.x - p.x, dy = o.y - p.y, d = Math.hypot(dx, dy) || 1, k = Math.max(0, p.r - r);
        nx = p.x + (dx / d) * k; ny = p.y + (dy / d) * k;
      } else {
        nx = Math.max(p.x + r, Math.min(p.x + p.w - r, o.x));
        ny = Math.max(p.y + r, Math.min(p.y + p.h - r, o.y));
      }
      const d = (nx - o.x) ** 2 + (ny - o.y) ** 2;
      if (d < bd) { bd = d; bx = nx; by = ny; }
    }
    o.x = bx; o.y = by;
  }
  for (const q of room.pillars) {
    const dx = o.x - q.x, dy = o.y - q.y, d = Math.hypot(dx, dy), min = q.r + r;
    if (d < min) { const k = d > 1e-6 ? min / d : 0; o.x = q.x + (d > 1e-6 ? dx * k : min); o.y = q.y + (d > 1e-6 ? dy * k : 0); }
  }
}

// Points along the outline of the room (spacing ≈ step), for torches and other wall decor.
export function outline(room, step) {
  const out = [];
  const keep = (x, y, nx, ny) => {
    // on the outline of the union: just outside every other part
    if (inside(room, x + nx * 6, y + ny * 6, 0)) return;
    out.push({ x, y, nx, ny });
  };
  for (const p of room.parts) {
    if (p.kind === 'c') {
      const n = Math.max(6, Math.round((TAU * p.r) / step));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU;
        keep(p.x + Math.cos(a) * p.r, p.y + Math.sin(a) * p.r, Math.cos(a), Math.sin(a));
      }
    } else {
      for (let x = p.x + step / 2; x < p.x + p.w; x += step) { keep(x, p.y, 0, -1); keep(x, p.y + p.h, 0, 1); }
      for (let y = p.y + step / 2; y < p.y + p.h; y += step) { keep(p.x, y, -1, 0); keep(p.x + p.w, y, 1, 0); }
    }
  }
  return out;
}
