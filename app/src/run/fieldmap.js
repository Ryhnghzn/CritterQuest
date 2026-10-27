// The fixed layout of a region (spec §25.1), built once from its data: solid
// circles (trees, rocks, ruin stones, the river outside its bridges) in a
// spatial grid for cheap collision. Pure and deterministic (own seeded RNG).
import { FIELD } from '../data/world.js';

const CELL = 200;
const cache = new Map();

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// distance from (x, y) to a polyline
export function distToLine(pts, x, y) {
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
    const dx = bx - ax, dy = by - ay;
    const k = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
    best = Math.min(best, Math.hypot(ax + dx * k - x, ay + dy * k - y));
  }
  return best;
}

// points every `step` units along a polyline
function sample(pts, step) {
  const out = [];
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / step));
    for (let k = 0; k < n; k++) out.push([ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n]);
  }
  out.push(pts[pts.length - 1]);
  return out;
}

export function buildFieldMap(region) {
  if (cache.has(region.id)) return cache.get(region.id);
  const rng = mulberry(region.seed);
  const solids = []; // { x, y, r, kind }
  const free = (x, y, r, gap = 10) => solids.every((s) => (s.x - x) ** 2 + (s.y - y) ** 2 > (s.r + r + gap) ** 2);
  const nearBridge = (x, y) => region.bridges.some(([bx, by]) => Math.hypot(bx - x, by - y) < FIELD.bridgeHalf);
  // the river: a chain of solid circles, open at the bridges
  const rr = FIELD.riverWidth / 2;
  for (const [x, y] of sample(region.river, rr * 0.8)) if (!nearBridge(x, y)) solids.push({ x, y, r: rr, kind: 'water' });
  const water = solids.length;
  const clear = (x, y, r) => x > r + 20 && y > r + 20 && x < region.w - r - 20 && y < region.h - r - 20
    && distToLine(region.path, x, y) > FIELD.pathWidth / 2 + r + 30
    && distToLine(region.river, x, y) > rr + r + 20
    && x > FIELD.exitZone + 220 && x < region.w - FIELD.exitZone - 220;
  // ruins: a ring of standing stones
  for (const ru of region.ruins) {
    const n = 9;
    for (let i = 0; i < n; i++) {
      if (i === 2 || i === 6) continue; // two gaps to walk in
      const a = (i / n) * Math.PI * 2;
      solids.push({ x: ru.x + Math.cos(a) * ru.r, y: ru.y + Math.sin(a) * ru.r, r: 22, kind: 'stone' });
    }
  }
  // tree clusters (dense groves) plus loose trees
  const centres = [];
  for (let i = 0; i < region.clusters; i++) centres.push([rng() * region.w, rng() * region.h, 140 + rng() * 220]);
  let tries = 0;
  for (let placed = 0; placed < region.trees && tries < region.trees * 30; tries++) {
    let x, y;
    if (rng() < 0.75) { const [cx, cy, cr] = centres[Math.floor(rng() * centres.length)]; const a = rng() * 6.283, d = Math.sqrt(rng()) * cr; x = cx + Math.cos(a) * d; y = cy + Math.sin(a) * d; } else { x = rng() * region.w; y = rng() * region.h; }
    const r = 20 + rng() * 14;
    if (!clear(x, y, r) || !free(x, y, r) || region.ruins.some((ru) => Math.hypot(ru.x - x, ru.y - y) < ru.r + 50)) continue;
    solids.push({ x, y, r, kind: 'tree', v: rng() });
    placed++;
  }
  tries = 0;
  for (let placed = 0; placed < region.rocks && tries < region.rocks * 30; tries++) {
    const x = rng() * region.w, y = rng() * region.h, r = 12 + rng() * 16;
    if (!clear(x, y, r) || !free(x, y, r)) continue;
    solids.push({ x, y, r, kind: 'rock', v: rng() });
    placed++;
  }
  // spatial grid: cell → solid indices overlapping it
  const cols = Math.ceil(region.w / CELL), rows = Math.ceil(region.h / CELL);
  const grid = Array.from({ length: cols * rows }, () => []);
  solids.forEach((s, i) => {
    for (let cy = Math.max(0, Math.floor((s.y - s.r) / CELL)); cy <= Math.min(rows - 1, Math.floor((s.y + s.r) / CELL)); cy++) {
      for (let cx = Math.max(0, Math.floor((s.x - s.r) / CELL)); cx <= Math.min(cols - 1, Math.floor((s.x + s.r) / CELL)); cx++) grid[cy * cols + cx].push(i);
    }
  });
  const map = { region, w: region.w, h: region.h, solids, water, cols, rows, grid, start: { x: FIELD.exitZone + 90, y: region.path[0][1] }, end: { x: region.w - FIELD.exitZone - 90, y: region.path.at(-1)[1] } };
  cache.set(region.id, map);
  return map;
}

// solids near (x, y)
export function solidsNear(map, x, y) {
  const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
  if (cx < 0 || cy < 0 || cx >= map.cols || cy >= map.rows) return [];
  return map.grid[cy * map.cols + cx];
}

// Pushes a circle (o.x, o.y, radius r) out of solids and inside the map edge.
export function pushOut(map, o, r) {
  for (const i of solidsNear(map, o.x, o.y)) {
    const s = map.solids[i];
    const dx = o.x - s.x, dy = o.y - s.y, min = s.r + r, d2 = dx * dx + dy * dy;
    if (d2 >= min * min) continue;
    const d = Math.sqrt(d2) || 0.01;
    o.x = s.x + (dx / d) * min; o.y = s.y + (dy / d) * min;
  }
  const e = FIELD.edge;
  o.x = Math.max(e, Math.min(map.w - e, o.x));
  o.y = Math.max(e, Math.min(map.h - e, o.y));
}

export function blocked(map, x, y, r) {
  return solidsNear(map, x, y).some((i) => { const s = map.solids[i]; return (s.x - x) ** 2 + (s.y - y) ** 2 < (s.r + r) ** 2; });
}
