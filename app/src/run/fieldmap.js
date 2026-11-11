// The fixed layout of a region (spec §25.5), built once from its seed: paths
// (main + branches), rivers with bridges where paths cross, lakes, groves,
// rocks and ruins. Everything solid is a circle in a spatial grid for cheap
// collision. Pure and deterministic (own seeded RNG).
import { FIELD } from '../data/world.js';
import { MOUNT } from '../data/mounts.js';

const CELL = 200;
const cache = new Map();

export function mulberry(seed) {
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
    const k = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    best = Math.min(best, Math.hypot(ax + dx * k - x, ay + dy * k - y));
  }
  return best;
}

// points every `step` units along a polyline
export function sample(pts, step) {
  const out = [];
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / step));
    for (let k = 0; k < n; k++) out.push([ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n]);
  }
  out.push(pts[pts.length - 1]);
  return out;
}

// where segment p1-p2 crosses q1-q2, or null
function cross([x1, y1], [x2, y2], [x3, y3], [x4, y4]) {
  const d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (!d) return null;
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / d;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / d;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? [x1 + t * (x2 - x1), y1 + t * (y2 - y1)] : null;
}

// A grid of points (path / river samples) for nearest-distance queries.
function pointGrid(points, cell) {
  const g = new Map();
  for (const p of points) {
    const k = `${Math.floor(p[0] / cell)},${Math.floor(p[1] / cell)}`;
    if (!g.has(k)) g.set(k, []);
    g.get(k).push(p);
  }
  return (x, y) => {
    const cx = Math.floor(x / cell), cy = Math.floor(y / cell);
    let best = Infinity;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      for (const [px, py] of g.get(`${cx + i},${cy + j}`) || []) best = Math.min(best, Math.hypot(px - x, py - y));
    }
    return best; // Infinity: farther than one cell
  };
}

function layout(region, rng) {
  const { w, h } = region;
  const rr = (a, b) => a + rng() * (b - a);
  // main path: west → east, a random walk in y
  const main = [[0, h / 2]];
  let y = h / 2;
  for (let x = 1100; x < w - 600; x += 1100) {
    y = Math.max(1600, Math.min(h - 1600, y + rr(-900, 900)));
    main.push([x + rr(-200, 200), y]);
  }
  main.push([w, Math.max(1600, Math.min(h - 1600, y + rr(-400, 400)))]);
  // branches: off the main path toward the north or south
  const branches = [];
  for (let i = 0; i < region.branches; i++) {
    const at = main[1 + Math.floor(((i + 0.5) / region.branches) * (main.length - 2))];
    const dir = i % 2 ? 1 : -1;
    const b = [[at[0], at[1]]];
    let [bx, by] = at;
    for (let k = 0; k < 4; k++) {
      bx = Math.max(400, Math.min(w - 400, bx + rr(-900, 900)));
      by = Math.max(500, Math.min(h - 500, by + dir * rr(700, 1300)));
      b.push([bx, by]);
    }
    branches.push(b);
  }
  // rivers: north → south, wandering in x
  const rivers = [];
  for (let i = 0; i < region.rivers; i++) {
    let x = w * ((i + 1) / (region.rivers + 1)) + rr(-1200, 1200);
    const r = [[x, -60]];
    for (let yy = 1200; yy < h; yy += 1200) { x += rr(-600, 600); r.push([x, yy]); }
    r.push([x + rr(-300, 300), h + 60]);
    rivers.push(r);
  }
  return { main, branches, rivers };
}

export function buildFieldMap(region) {
  if (cache.has(region.id)) return cache.get(region.id);
  const rng = mulberry(region.seed);
  const rr = (a, b) => a + rng() * (b - a);
  const { main, branches, rivers } = layout(region, rng);
  const paths = [main, ...branches];
  // bridges wherever a path crosses a river
  const bridges = [];
  for (const river of rivers) for (const p of paths) {
    for (let i = 1; i < river.length; i++) for (let j = 1; j < p.length; j++) {
      const c = cross(river[i - 1], river[i], p[j - 1], p[j]);
      if (c) bridges.push(c);
    }
  }
  const cols = Math.ceil(region.w / CELL), rows = Math.ceil(region.h / CELL);
  const grid = Array.from({ length: cols * rows }, () => []);
  const solids = []; // { x, y, r, kind, v }
  const add = (s) => {
    const i = solids.length;
    solids.push(s);
    const e = s.r + 24; // padded so a walker overlapping it from a neighbouring cell still finds it
    for (let cy = Math.max(0, Math.floor((s.y - e) / CELL)); cy <= Math.min(rows - 1, Math.floor((s.y + e) / CELL)); cy++) {
      for (let cx = Math.max(0, Math.floor((s.x - e) / CELL)); cx <= Math.min(cols - 1, Math.floor((s.x + e) / CELL)); cx++) grid[cy * cols + cx].push(i);
    }
  };
  const map = { region, w: region.w, h: region.h, solids, cols, rows, grid, paths, rivers, bridges, lakes: [], ruins: [] };
  const free = (x, y, r, gap = 10) => !blocked(map, x, y, r + gap);
  const pathDist = pointGrid(paths.flatMap((p) => sample(p, 60)), 400);
  const nearBridge = (x, y) => bridges.some(([bx, by]) => Math.hypot(bx - x, by - y) < FIELD.bridgeHalf);
  // rivers: chains of solid circles, open at the bridges
  const half = FIELD.riverWidth / 2;
  for (const river of rivers) {
    for (const [x, y] of sample(river, half * 0.8)) {
      if (nearBridge(x, y)) continue;
      // a path running along the river: open it there too, with a bridge to draw
      if (pathDist(x, y) < half + FIELD.pathWidth / 2 + 14) { bridges.push([x, y]); continue; }
      add({ x, y, r: half, kind: 'water' });
    }
  }
  const roomy = (x, y, r, margin) => x - r > FIELD.exitZone + 300 && x + r < region.w - FIELD.exitZone - 300 && y > r + 40 && y < region.h - r - 40
    && pathDist(x, y) > FIELD.pathWidth / 2 + r + margin;
  // lakes (lava pools on the volcano)
  for (let i = 0, tries = 0; i < region.lakes && tries < 400; tries++) {
    const r = rr(260, 620), x = rr(0, region.w), y = rr(0, region.h);
    if (!roomy(x, y, r, 160) || !free(x, y, r, 120)) continue;
    add({ x, y, r, kind: 'lake' });
    map.lakes.push({ x, y, r });
    i++;
  }
  // ruins: a ring of standing stones with two gaps
  for (let i = 0, tries = 0; i < region.ruins && tries < 600; tries++) {
    const r = rr(110, 170), x = rr(0, region.w), y = rr(0, region.h);
    if (!roomy(x, y, r, 120) || !free(x, y, r + 40, 40)) continue;
    map.ruins.push({ x, y, r });
    for (let k = 0; k < 9; k++) {
      if (k === 2 || k === 6) continue;
      const a = (k / 9) * Math.PI * 2;
      add({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, r: 22, kind: 'stone' });
    }
    i++;
  }
  const inRuin = (x, y, pad) => map.ruins.some((ru) => (ru.x - x) ** 2 + (ru.y - y) ** 2 < (ru.r + pad) ** 2);
  // groves (75 %) and loose trees, then rocks
  const area = (region.w * region.h) / 1e6;
  const nTrees = Math.round(region.density.tree * area), nRocks = Math.round(region.density.rock * area);
  const centres = Array.from({ length: Math.max(1, Math.round(nTrees / 14)) }, () => [rr(0, region.w), rr(0, region.h), rr(140, 380)]);
  for (let placed = 0, tries = 0; placed < nTrees && tries < nTrees * 12; tries++) {
    let x, y;
    if (rng() < 0.75) { const [cx, cy, cr] = centres[Math.floor(rng() * centres.length)]; const a = rng() * 6.283, d = Math.sqrt(rng()) * cr; x = cx + Math.cos(a) * d; y = cy + Math.sin(a) * d; } else { x = rr(0, region.w); y = rr(0, region.h); }
    const r = rr(20, 34);
    if (!roomy(x, y, r, 30) || inRuin(x, y, 50) || !free(x, y, r)) continue;
    add({ x, y, r, kind: 'tree', v: rng() });
    placed++;
  }
  for (let placed = 0, tries = 0; placed < nRocks && tries < nRocks * 12; tries++) {
    const x = rr(0, region.w), y = rr(0, region.h), r = rr(12, 30);
    if (!roomy(x, y, r, 30) || inRuin(x, y, 40) || !free(x, y, r)) continue;
    add({ x, y, r, kind: 'rock', v: rng() });
    placed++;
  }
  const startY = main[0][1], endY = main[main.length - 1][1];
  map.start = { x: FIELD.exitZone + 90, y: startY };
  map.end = { x: region.w - FIELD.exitZone - 90, y: endY };
  map.pathDist = pathDist;
  map.water = solids.filter((s) => s.kind === 'water').length;
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
const WET = new Set(['water', 'lake']);
export function pushOut(map, o, r, fly = false) {
  for (const i of solidsNear(map, o.x, o.y)) {
    const s = map.solids[i];
    if (fly && WET.has(s.kind)) continue; // flying mounts pass over rivers & lakes (spec §35.1)
    const dx = o.x - s.x, dy = o.y - s.y, min = s.r + r, d2 = dx * dx + dy * dy;
    if (d2 >= min * min) continue;
    const d = Math.sqrt(d2);
    if (d < 0.01) { o.x = s.x + min; o.y = s.y; continue; } // dead centre: any direction will do
    o.x = s.x + (dx / d) * min; o.y = s.y + (dy / d) * min;
  }
  const e = FIELD.edge;
  o.x = Math.max(e, Math.min(map.w - e, o.x));
  o.y = Math.max(e, Math.min(map.h - e, o.y));
}

// Landing (knocked off a flying mount over water): push out until standing on dry land.
export function landAt(map, o, r) {
  for (let i = 0; i < MOUNT.landTries && blocked(map, o.x, o.y, r); i++) pushOut(map, o, r);
}

// true when a circle at (x, y) overlaps something solid (checks the 3×3 cells around it)
export function blocked(map, x, y, r) {
  const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const gx = cx + i, gy = cy + j;
    if (gx < 0 || gy < 0 || gx >= map.cols || gy >= map.rows) continue;
    for (const k of map.grid[gy * map.cols + gx]) {
      const s = map.solids[k];
      if ((s.x - x) ** 2 + (s.y - y) ** 2 < (s.r + r) ** 2) return true;
    }
  }
  return false;
}
