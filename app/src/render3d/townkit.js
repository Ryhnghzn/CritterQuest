// Pure helpers for the 2.5D towns and interiors (plan "Tampilan 2.5D" §3): no THREE, no DOM.
// Game coordinates throughout (x right, y down / south); the camera looks from the
// direction (sin yaw, cos yaw) — yaw 0 = from the south.

// Wall cells along a town's outer wall (thickness def.wall), `cell` units long each.
// The south wall leaves a gap where the gate stands. side: 'n' | 's' | 'w' | 'e'.
export function wallCells(def, cell) {
  const out = [], T = def.wall, W = def.w, H = def.h;
  const gate = def.buildings.find((b) => b.kind === 'gate');
  const run = (x0, x1, y, side) => {
    const n = Math.max(1, Math.round((x1 - x0) / cell)), step = (x1 - x0) / n;
    for (let i = 0; i < n; i++) out.push({ x: x0 + step * (i + 0.5), y, len: step, side, alongX: true });
  };
  const col = (y0, y1, x, side) => {
    const n = Math.max(1, Math.round((y1 - y0) / cell)), step = (y1 - y0) / n;
    for (let i = 0; i < n; i++) out.push({ x, y: y0 + step * (i + 0.5), len: step, side, alongX: false });
  };
  run(0, W, T / 2, 'n');
  if (gate) { run(0, gate.x, H - T / 2, 's'); run(gate.x + gate.w, W, H - T / 2, 's'); }
  else run(0, W, H - T / 2, 's');
  col(T, H - T, T / 2, 'w');
  col(T, H - T, W - T / 2, 'e');
  return out;
}

// Trees in the dark outside the walls — the same deterministic spots as the 2D town.
export function treesOf(def) {
  const out = [];
  let s = def.id === 'home' ? 4242 : 4242 + def.id.length * 977 + def.id.charCodeAt(0) * 31;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const n = Math.round(90 * (def.w + def.h) / (960 + 780));
  for (let i = 0; i < n; i++) {
    const side = i % 4;
    const along = r(), out2 = 30 + r() * 160;
    const x = side === 0 ? along * def.w : side === 1 ? along * def.w : side === 2 ? -out2 : def.w + out2;
    const y = side === 0 ? -out2 : side === 1 ? def.h + out2 : along * def.h;
    out.push({ x, y, s: 0.8 + r() * 0.9, v: r() });
  }
  return out;
}

// Does a footprint (x0, y0)–(x1, y1) stand between the camera and the hero at (hx, hy)?
// reach: how far behind it (away from the camera) it can hide the hero (≈ its height).
export function occludes(x0, y0, x1, y1, hx, hy, yaw, reach, margin = 36) {
  const ys = Math.sin(yaw), yc = Math.cos(yaw);
  let aMin = Infinity, aMax = -Infinity, sMin = Infinity, sMax = -Infinity;
  for (let i = 0; i < 4; i++) {
    const dx = (i & 1 ? x1 : x0) - hx, dy = (i & 2 ? y1 : y0) - hy;
    const a = dx * ys + dy * yc, s = dx * yc - dy * ys; // towards the camera / across the screen
    if (a < aMin) aMin = a; if (a > aMax) aMax = a;
    if (s < sMin) sMin = s; if (s > sMax) sMax = s;
  }
  return aMax > 6 && aMin < reach && sMin < margin && sMax > -margin;
}

// A wall cell / tree on the camera side of the hero, close enough to hide them → sinks.
export function inCutaway(x, y, hx, hy, yaw, depth = 440) {
  const dx = x - hx, dy = y - hy, ys = Math.sin(yaw), yc = Math.cos(yaw);
  const along = dx * ys + dy * yc, side = Math.abs(dx * yc - dy * ys);
  return along > -30 && along < depth && side < 260 + along * 0.4;
}

// The n entries of list nearest to (x, y), written into out (indices); returns the count.
// No allocation: out is reused by the caller, d is scratch of the same length.
export function nearest(list, x, y, n, out, d) {
  let k = 0;
  for (let i = 0; i < list.length; i++) {
    const l = list[i], dist = (l.x - x) ** 2 + (l.y - y) ** 2;
    if (k < n) { out[k] = i; d[k] = dist; k++; }
    else {
      let w = 0;
      for (let j = 1; j < k; j++) if (d[j] > d[w]) w = j;
      if (dist < d[w]) { out[w] = i; d[w] = dist; }
    }
  }
  return k;
}

// Interior furniture: hung on the back wall, or standing on the floor.
// Wall pieces get a height band (bottom, top) in game units above the floor, from where
// the 2D view drew them on the wall band (0 … room.back).
const WALL_KINDS = new Set(['shelf', 'window', 'herbs', 'rack', 'board', 'trophy', 'banner']);
export const WALL_SCALE = 1.0;
export function mountOf(f, room) {
  if (WALL_KINDS.has(f.kind) && f.y < room.back) {
    const top = (room.back - f.y) * WALL_SCALE, bottom = Math.max(6, (room.back - f.y - (f.h || 0)) * WALL_SCALE + 6);
    return { wall: true, bottom, top };
  }
  // floor pieces that reach into the back wall band are pushed out to its face
  const y0 = Math.max(f.y, room.back - 22), y1 = Math.max(y0 + 16, f.y + (f.h || 0));
  return { wall: false, y0, y1 };
}

// Room walls as panels with an outward normal (game x, y); the panels whose normal faces
// the camera sink so the room reads like a doll's house.
export function roomPanels(r) {
  const gap = r.doorW / 2, T = 18;
  return [
    { x0: 0, y0: r.back - T, x1: r.w, y1: r.back, nx: 0, ny: -1 },                 // back
    { x0: 0, y0: r.back - T, x1: r.wall, y1: r.h, nx: -1, ny: 0 },                 // west
    { x0: r.w - r.wall, y0: r.back - T, x1: r.w, y1: r.h, nx: 1, ny: 0 },          // east
    { x0: 0, y0: r.h - r.wall, x1: r.w / 2 - gap, y1: r.h, nx: 0, ny: 1 },          // front, left of the door
    { x0: r.w / 2 + gap, y0: r.h - r.wall, x1: r.w, y1: r.h, nx: 0, ny: 1 },        // front, right of the door
  ];
}
export const facesCamera = (p, yaw) => p.nx * Math.sin(yaw) + p.ny * Math.cos(yaw) > 0.3;
