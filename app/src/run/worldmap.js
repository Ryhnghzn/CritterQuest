// The connected world (spec §40). A small skeleton built once from WORLD.seed (roads,
// borders with their crossings, small rivers, lakes, towns, the Gerhana pocket) and
// content built per chunk when the player comes near (trees, rocks, ruins), always the
// same for the same chunk. Solids are circles kept in a per-chunk grid; the skeleton's
// solids are registered in every chunk they touch. Pure and deterministic (own RNG).
import { FIELD, REGIONS, regionById } from '../data/world.js';
import { WORLD, ARMS, ARM_IDS, BORDERS, BORDER_WIGGLE, BORDER_STEP, ECLIPSE, ROADS, WATERS, RUINS_PER_CHUNK, HUB_TREES } from '../data/worldmap.js';
import { mulberry, sample, distToLine } from './fieldmap.js';

const CELL = 200;
const PER = WORLD.chunk / CELL;          // cells per chunk side
const PAD = 24;                          // solids are registered this much wider
const S2 = Math.SQRT1_2;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, k) => a + (b - a) * k;

// ---- zones & arm coordinates ----

// half the usable width of an arm at `along` from the middle (kept clear of the borders)
export function armHalf(along) {
  const margin = (BORDER_WIGGLE + 420 + 200) * Math.SQRT2;
  return Math.max(300, Math.min(along * WORLD.armFill, along - margin));
}

const left = ([dx, dy]) => [dy, -dx]; // left of the way out (screen y points down)
const inPocket = (x, y) => x > ECLIPSE.x0 && x < ECLIPSE.x1 && y > ECLIPSE.y0;

// where an old region fraction lands: fx 0 → 1 from the meadow's edge to the town,
// fy 0 → 1 across the arm (0 = left of the way out, as the old maps' top edge)
export function zoneToWorld(zone, fx, fy) {
  if (zone === 'eclipse') {
    const m = ECLIPSE.half + 500, E = ECLIPSE;
    return { x: (E.x0 + E.x1) / 2 + (0.5 - fy) * (E.x1 - E.x0 - 2 * m), y: E.y0 + m + fx * (E.y1 - E.y0 - 2 * m) };
  }
  const arm = ARMS[zone], along = lerp(WORLD.hub, arm.dist, fx), hw = armHalf(along), l = left(arm.dir);
  const k = (0.5 - fy) * 2 * hw;
  return { x: WORLD.cx + arm.dir[0] * along + l[0] * k, y: WORLD.cy + arm.dir[1] * along + l[1] * k };
}

// the inverse: { fx, fy } of a point in a zone (fx may run past 0 / 1)
export function armFrac(zone, x, y) {
  if (zone === 'eclipse') {
    const m = ECLIPSE.half + 500, E = ECLIPSE;
    return { fx: (y - E.y0 - m) / (E.y1 - E.y0 - 2 * m), fy: 0.5 - (x - (E.x0 + E.x1) / 2) / (E.x1 - E.x0 - 2 * m) };
  }
  const arm = ARMS[zone], l = left(arm.dir), dx = x - WORLD.cx, dy = y - WORLD.cy;
  const along = dx * arm.dir[0] + dy * arm.dir[1], lat = dx * l[0] + dy * l[1];
  return { fx: (along - WORLD.hub) / (arm.dist - WORLD.hub), fy: 0.5 - lat / (2 * armHalf(Math.max(along, 1))) };
}

// ---- the skeleton ----

const worlds = new Map();

function borderLine(b, rng) {
  const d = [b.to[0] * S2, b.to[1] * S2], n = [-d[1], d[0]];
  // how far along the diagonal until it leaves the world
  const tx = d[0] < 0 ? WORLD.cx / -d[0] : (WORLD.w - WORLD.cx) / d[0];
  const ty = d[1] < 0 ? WORLD.cy / -d[1] : (WORLD.h - WORLD.cy) / d[1];
  const end = Math.min(tx, ty) + 600;
  const knots = [];
  for (let a = WORLD.hub; a < end + BORDER_STEP; a += BORDER_STEP) {
    const taper = clamp01((a - WORLD.hub) / 3000);
    knots.push([Math.min(a, end), (rng() * 2 - 1) * BORDER_WIGGLE * taper]);
  }
  const at = (a) => {
    let i = 1;
    while (i < knots.length - 1 && knots[i][0] < a) i++;
    const [a0, o0] = knots[i - 1], [a1, o1] = knots[i];
    const off = lerp(o0, o1, clamp01((a - a0) / (a1 - a0 || 1)));
    return [WORLD.cx + d[0] * a + n[0] * off, WORLD.cy + d[1] * a + n[1] * off];
  };
  const pts = knots.map(([a]) => at(a));
  const crossings = b.cross.map((f) => { const p = at(lerp(WORLD.hub, end, f)); return { border: b.id, kind: b.crossing, x: p[0], y: p[1], f }; });
  return { ...b, d, n, knots, pts, end, crossings };
}

// side of a border: > 0 toward between[1]
function borderSide(bl, x, y) {
  const dx = x - WORLD.cx, dy = y - WORLD.cy;
  const a = dx * bl.d[0] + dy * bl.d[1], p = dx * bl.n[0] + dy * bl.n[1];
  const k = bl.knots;
  let i = 1;
  while (i < k.length - 1 && k[i][0] < a) i++;
  const off = lerp(k[i - 1][1], k[i][1], clamp01((a - k[i - 1][0]) / (k[i][0] - k[i - 1][0] || 1)));
  return { a, side: p - off };
}

// the zone at a point: the quadrant between the diagonals, corrected by the actual
// (wandering) border near it; the Gerhana pocket inside its cliffs
export function zoneAt(world, x, y) {
  if (inPocket(x, y)) return 'eclipse';
  const dx = x - WORLD.cx, dy = y - WORLD.cy;
  const q = Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 'forest' : 'desert') : (dy < 0 ? 'ice' : 'volcano');
  for (const bl of world.borders) {
    if (!bl.between.includes(q)) continue;
    const { a, side } = borderSide(bl, x, y);
    if (a <= 0) continue;
    const want = side > 0 ? bl.between[1] : bl.between[0];
    if (want !== q && Math.abs(side) < BORDER_WIGGLE + bl.half + 400) return want;
  }
  return q;
}

export const inHub = (x, y) => (x - WORLD.cx) ** 2 + (y - WORLD.cy) ** 2 < WORLD.hub * WORLD.hub;

// enemy level at a point: the zone's range from the meadow's edge to its town
export function levelAt(world, x, y) {
  const zone = zoneAt(world, x, y), [a, b] = regionById(zone).levels;
  return Math.round(lerp(a, b, clamp01(armFrac(zone, x, y).fx)));
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

function cross([x1, y1], [x2, y2], [x3, y3], [x4, y4]) {
  const d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (!d) return null;
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / d;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / d;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? [x1 + t * (x2 - x1), y1 + t * (y2 - y1)] : null;
}

// a road from a to b, bending every `step`, off the straight line by up to `w` (none at the ends)
function wander(a, b, w, rng, step = ROADS.bend) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(len / step));
  const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
  const pts = [a];
  let off = 0;
  for (let i = 1; i < n; i++) {
    const t = i / n, cap = w * Math.sin(Math.PI * t);
    off = Math.max(-cap, Math.min(cap, off + (rng() * 2 - 1) * w * 0.5));
    pts.push([a[0] + (b[0] - a[0]) * t - uy * off, a[1] + (b[1] - a[1]) * t + ux * off]);
  }
  pts.push(b);
  return pts;
}

export const townGate = (zone) => { const a = ARMS[zone]; return { x: WORLD.cx + a.dir[0] * a.dist, y: WORLD.cy + a.dir[1] * a.dist }; };

export function buildWorld(seed = WORLD.seed) {
  if (worlds.has(seed)) return worlds.get(seed);
  const rng = mulberry(seed);
  const rr = (a, b) => a + rng() * (b - a);
  const borders = BORDERS.map((b) => borderLine(b, rng));
  const crossings = borders.flatMap((b) => b.crossings);
  // towns: the gate at the end of each arm (Kota Awal's in the middle), the wall behind it
  const towns = { home: { id: 'home', zone: null, x: WORLD.cx, y: WORLD.cy, out: [0, 1] } };
  for (const zone of ARM_IDS) {
    const g = townGate(zone), arm = ARMS[zone];
    towns[arm.town] = { id: arm.town, zone, x: g.x, y: g.y, out: [-arm.dir[0], -arm.dir[1]] };
  }
  // main roads: the middle → each town, wandering inside the arm
  const roads = [];
  const main = {};
  for (const zone of ARM_IDS) {
    const arm = ARMS[zone], g = townGate(zone), l = left(arm.dir);
    const n = Math.round((arm.dist - WORLD.hub * 0.4) / ROADS.bend);
    const pts = [[WORLD.cx, WORLD.cy]];
    let off = 0;
    for (let i = 1; i < n; i++) {
      const along = WORLD.hub * 0.4 + (arm.dist - WORLD.hub * 0.4) * (i / n);
      const cap = Math.min(ROADS.maxWiggle, ROADS.wiggle * armHalf(along)) * Math.sin(Math.PI * (i / n));
      off = Math.max(-cap, Math.min(cap, off + rr(-0.5, 0.5) * cap));
      pts.push([WORLD.cx + arm.dir[0] * along + l[0] * off, WORLD.cy + arm.dir[1] * along + l[1] * off]);
    }
    pts.push([g.x, g.y]);
    main[zone] = pts;
    roads.push({ kind: 'main', zone, pts });
  }
  // the road on from Baraapi round its wall to the Gerhana opening and into the pocket
  {
    const g = townGate('volcano'), E = ECLIPSE, mx = (E.x0 + E.x1) / 2;
    roads.push({ kind: 'eclipse', zone: 'eclipse', pts: [[g.x, g.y], [g.x - 1500, g.y + 300], [g.x - 1700, g.y + 2200], [mx, E.y0 - 900], [mx, E.y0], [mx, E.y0 + 2600]] });
  }
  // ring roads: town → the outer crossing → the neighbouring town; the inner crossing joins both main roads
  for (const bl of borders) {
    if (!bl.crossings.length) continue;
    const [za, zb] = bl.between, outer = bl.crossings[bl.crossings.length - 1], inner = bl.crossings[0];
    const ga = townGate(za), gb = townGate(zb), c = [outer.x, outer.y];
    roads.push({ kind: 'ring', zone: za, pts: wander([ga.x, ga.y], c, ROADS.ringWiggle, rng) });
    roads.push({ kind: 'ring', zone: zb, pts: wander(c, [gb.x, gb.y], ROADS.ringWiggle, rng) });
    for (const z of [za, zb]) {
      const near = main[z].reduce((best, p) => (Math.hypot(p[0] - inner.x, p[1] - inner.y) < Math.hypot(best[0] - inner.x, best[1] - inner.y) ? p : best));
      roads.push({ kind: 'link', zone: z, pts: wander([inner.x, inner.y], near, ROADS.ringWiggle * 0.6, rng) });
    }
  }
  // branches: off the main roads, sideways into the arm
  for (const zone of ARM_IDS) {
    const arm = ARMS[zone], l = left(arm.dir), m = main[zone], nb = ROADS.branches[zone];
    for (let i = 0; i < nb; i++) {
      const at = m[2 + Math.floor(((i + 0.5) / nb) * (m.length - 4))];
      const side = i % 2 ? 1 : -1;
      const pts = [[at[0], at[1]]];
      let [bx, by] = at;
      const len = ROADS.branchLen[0] + Math.floor(rng() * (ROADS.branchLen[1] - ROADS.branchLen[0] + 1));
      for (let k = 0; k < len; k++) {
        const out = rr(-700, 900), sideways = side * rr(800, 1400);
        const nx = bx + arm.dir[0] * out + l[0] * sideways, ny = by + arm.dir[1] * out + l[1] * sideways;
        const f = armFrac(zone, nx, ny);
        if (f.fx < 0.05 || f.fx > 0.95 || f.fy < 0.06 || f.fy > 0.94) break;
        bx = nx; by = ny; pts.push([bx, by]);
      }
      if (pts.length > 2) roads.push({ kind: 'branch', zone, pts });
    }
  }
  const paths = roads.map((r) => r.pts);
  const pathDist = pointGrid(paths.flatMap((p) => sample(p, 60)), 400);

  // the fixed solids: borders (open at their crossings), the pocket's cliffs, town walls, rivers, lakes
  const fixed = [];
  for (const bl of borders) {
    const skip = (x, y) => bl.crossings.some((c) => Math.hypot(c.x - x, c.y - y) < bl.gap + bl.half * 2);
    for (const [x, y] of sample(bl.pts, bl.half * 0.8)) if (!skip(x, y)) fixed.push({ x, y, r: bl.half, kind: bl.kind, border: bl.id });
  }
  const E = ECLIPSE, emx = (E.x0 + E.x1) / 2;
  const pocketGate = { x: emx, y: E.y0 };
  for (const line of [[[E.x0, WORLD.h + 400], [E.x0, E.y0]], [[E.x0, E.y0], [E.x1, E.y0]], [[E.x1, E.y0], [E.x1, WORLD.h + 400]]]) {
    for (const [x, y] of sample(line, E.half * 0.8)) if (Math.hypot(x - pocketGate.x, y - pocketGate.y) > E.gap + E.half) fixed.push({ x, y, r: E.half, kind: E.kind, border: 'eclipse' });
  }
  for (const t of Object.values(towns)) {
    if (t.id === 'home') continue;
    fixed.push({ x: t.x - t.out[0] * (WORLD.townSolid + 120), y: t.y - t.out[1] * (WORLD.townSolid + 120), r: WORLD.townSolid, kind: 'town', town: t.id });
  }
  // small rivers across each arm, bridged where a road crosses
  const rivers = [], bridges = [];
  for (const zone of [...ARM_IDS, 'eclipse']) {
    for (let i = 0; i < WATERS[zone].rivers; i++) {
      const fx = (i + 1) / (WATERS[zone].rivers + 1) + rr(-0.06, 0.06);
      const pts = [];
      for (let k = 0; k <= 8; k++) { const p = zoneToWorld(zone, fx + rr(-0.025, 0.025), 0.04 + 0.92 * (k / 8)); pts.push([p.x, p.y]); }
      rivers.push({ zone, pts });
    }
  }
  const half = FIELD.riverWidth / 2;
  for (const rv of rivers) {
    for (const p of paths) for (let i = 1; i < rv.pts.length; i++) for (let j = 1; j < p.length; j++) {
      const c = cross(rv.pts[i - 1], rv.pts[i], p[j - 1], p[j]);
      if (c) bridges.push(c);
    }
  }
  for (const rv of rivers) {
    for (const [x, y] of sample(rv.pts, half * 0.8)) {
      if (bridges.some(([bx, by]) => Math.hypot(bx - x, by - y) < FIELD.bridgeHalf)) continue;
      if (pathDist(x, y) < half + FIELD.pathWidth / 2 + 14) { bridges.push([x, y]); continue; }
      fixed.push({ x, y, r: half, kind: 'water' });
    }
  }
  const lakes = [];
  const nearTown = (x, y, pad) => Object.values(towns).some((t) => Math.hypot(t.x - x, t.y - y) < WORLD.townClear + pad);
  const clearOf = (x, y, r) => fixed.every((s) => Math.hypot(s.x - x, s.y - y) > s.r + r + 120);
  for (const zone of [...ARM_IDS, 'eclipse']) {
    for (let i = 0, tries = 0; i < WATERS[zone].lakes && tries < 600; tries++) {
      const r = rr(260, 620), p = zoneToWorld(zone, rr(0.05, 0.95), rr(0.08, 0.92));
      if (pathDist(p.x, p.y) < FIELD.pathWidth / 2 + r + 160 || nearTown(p.x, p.y, r) || inHub(p.x, p.y)) continue;
      if (rivers.some((rv) => distToLine(rv.pts, p.x, p.y) < r + half + 120) || !clearOf(p.x, p.y, r)) continue;
      fixed.push({ x: p.x, y: p.y, r, kind: 'lake' });
      lakes.push({ x: p.x, y: p.y, r, zone });
      i++;
    }
  }
  // bucket the fixed solids by the chunks their padded circle touches
  const cols = Math.ceil(WORLD.w / WORLD.chunk), rows = Math.ceil(WORLD.h / WORLD.chunk);
  const fixedIn = Array.from({ length: cols * rows }, () => []);
  for (const s of fixed) {
    const e = s.r + PAD;
    for (let cy = Math.max(0, Math.floor((s.y - e) / WORLD.chunk)); cy <= Math.min(rows - 1, Math.floor((s.y + e) / WORLD.chunk)); cy++) {
      for (let cx = Math.max(0, Math.floor((s.x - e) / WORLD.chunk)); cx <= Math.min(cols - 1, Math.floor((s.x + e) / WORLD.chunk)); cx++) fixedIn[cy * cols + cx].push(s);
    }
  }
  const world = {
    world: true, seed, w: WORLD.w, h: WORLD.h, cols, rows, borders, crossings, towns, roads, paths, rivers: rivers.map((r) => r.pts),
    riverZones: rivers.map((r) => r.zone), bridges, lakes, fixed, fixedIn, pathDist, pocketGate,
    chunks: new Map(), // key iy * cols + ix → chunk, in use order (oldest first)
  };
  worlds.set(seed, world);
  return world;
}

// ---- chunks ----

const chunkSeed = (seed, ix, iy) => (Math.imul(seed, 73856093) ^ Math.imul(ix + 1, 19349663) ^ Math.imul(iy + 1, 83492791)) >>> 0;
const densityOf = (zone) => regionById(zone).density;
const MAX_TREE = Math.max(...REGIONS.map((r) => r.density.tree));
const MAX_ROCK = Math.max(...REGIONS.map((r) => r.density.rock));

// Builds one chunk: the fixed solids touching it, then ruins, trees and rocks of the zone
// at each spot. Nothing of its own reaches past its edges, so chunks never depend on each other.
export function buildChunk(world, ix, iy) {
  const C = WORLD.chunk, x0 = ix * C, y0 = iy * C;
  const rng = mulberry(chunkSeed(world.seed, ix, iy));
  const rr = (a, b) => a + rng() * (b - a);
  const cells = Array.from({ length: PER * PER }, () => []);
  const own = [];   // this chunk's own solids (trees, rocks, ruin stones)
  const ruins = [];
  const put = (s) => {
    const e = s.r + PAD;
    for (let cy = Math.max(0, Math.floor((s.y - e - y0) / CELL)); cy <= Math.min(PER - 1, Math.floor((s.y + e - y0) / CELL)); cy++) {
      for (let cx = Math.max(0, Math.floor((s.x - e - x0) / CELL)); cx <= Math.min(PER - 1, Math.floor((s.x + e - x0) / CELL)); cx++) cells[cy * PER + cx].push(s);
    }
  };
  for (const s of world.fixedIn[iy * world.cols + ix] || []) put(s);
  const add = (s) => { own.push(s); put(s); };
  const hits = (x, y, r) => {
    const cx = Math.floor((x - x0) / CELL), cy = Math.floor((y - y0) / CELL);
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const gx = cx + i, gy = cy + j;
      if (gx < 0 || gy < 0 || gx >= PER || gy >= PER) continue;
      for (const s of cells[gy * PER + gx]) if ((s.x - x) ** 2 + (s.y - y) ** 2 < (s.r + r) ** 2) return true;
    }
    return false;
  };
  const nearTown = (x, y) => Object.values(world.towns).some((t) => Math.hypot(t.x - x, t.y - y) < WORLD.townClear);
  const roomy = (x, y, r, margin) => {
    const e = r + PAD + 40;
    if (x - e < x0 || y - e < y0 || x + e > x0 + C || y + e > y0 + C) return false; // stays inside the chunk
    if (x < WORLD.edge || y < WORLD.edge || x > WORLD.w - WORLD.edge || y > WORLD.h - WORLD.edge) return false;
    return world.pathDist(x, y) > FIELD.pathWidth / 2 + r + margin && !nearTown(x, y);
  };
  // ruins: a ring of standing stones with two gaps
  const nRuins = (rng() < RUINS_PER_CHUNK ? 1 : 0) + (rng() < RUINS_PER_CHUNK * 0.25 ? 1 : 0);
  for (let i = 0, tries = 0; i < nRuins && tries < 40; tries++) {
    const r = rr(110, 170), x = rr(x0, x0 + C), y = rr(y0, y0 + C);
    if (!roomy(x, y, r + 40, 120) || hits(x, y, r + 80)) continue;
    const zone = zoneAt(world, x, y);
    ruins.push({ x, y, r, zone });
    for (let k = 0; k < 9; k++) {
      if (k === 2 || k === 6) continue;
      const a = (k / 9) * Math.PI * 2;
      add({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, r: 22, kind: 'stone', zone });
    }
    i++;
  }
  const inRuin = (x, y, pad) => ruins.some((ru) => (ru.x - x) ** 2 + (ru.y - y) ** 2 < (ru.r + pad) ** 2);
  const area = (C * C) / 1e6;
  // trees: 75 % in groves; each spot kept with the chance its zone's density allows
  const tries = Math.round(MAX_TREE * area);
  const centres = Array.from({ length: Math.max(1, Math.round(tries / 14)) }, () => [rr(x0, x0 + C), rr(y0, y0 + C), rr(140, 380)]);
  for (let i = 0; i < tries * 1.6; i++) {
    let x, y;
    if (rng() < 0.75) { const [cx, cy, cr] = centres[Math.floor(rng() * centres.length)]; const a = rng() * 6.283, d = Math.sqrt(rng()) * cr; x = cx + Math.cos(a) * d; y = cy + Math.sin(a) * d; } else { x = rr(x0, x0 + C); y = rr(y0, y0 + C); }
    const r = rr(20, 34), keep = rng(), v = rng();
    const zone = zoneAt(world, x, y);
    const dens = densityOf(zone).tree * (inHub(x, y) ? HUB_TREES : 1);
    if (keep * MAX_TREE * 1.6 > dens) continue;
    if (!roomy(x, y, r, 30) || inRuin(x, y, 50) || hits(x, y, r)) continue;
    add({ x, y, r, kind: 'tree', v, zone });
  }
  for (let i = 0; i < Math.round(MAX_ROCK * area * 1.6); i++) {
    const x = rr(x0, x0 + C), y = rr(y0, y0 + C), r = rr(12, 30), keep = rng(), v = rng();
    const zone = zoneAt(world, x, y);
    if (keep * MAX_ROCK * 1.6 > densityOf(zone).rock * (inHub(x, y) ? HUB_TREES : 1)) continue;
    if (!roomy(x, y, r, 30) || inRuin(x, y, 40) || hits(x, y, r)) continue;
    add({ x, y, r, kind: 'rock', v, zone });
  }
  return { ix, iy, x0, y0, cells, solids: own, ruins };
}

export const chunkIndex = (world, x, y) => {
  const ix = Math.floor(x / WORLD.chunk), iy = Math.floor(y / WORLD.chunk);
  return ix < 0 || iy < 0 || ix >= world.cols || iy >= world.rows ? -1 : iy * world.cols + ix;
};

// the chunk with this index, built now if it is missing (and marked as just used)
export function chunk(world, key) {
  let c = world.chunks.get(key);
  if (c) { world.chunks.delete(key); world.chunks.set(key, c); return c; }
  c = buildChunk(world, key % world.cols, Math.floor(key / world.cols));
  world.chunks.set(key, c);
  if (world.chunks.size > WORLD.cache) world.chunks.delete(world.chunks.keys().next().value);
  return c;
}

// Builds up to `budget` missing chunks around (x, y), nearest first (one ring past the kept
// ones, so they are ready before they show). Returns how many were built.
export function ensureChunks(world, x, y, budget = 1) {
  const ix = Math.floor(x / WORLD.chunk), iy = Math.floor(y / WORLD.chunk), R = WORLD.keep + 1;
  const want = [];
  for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) {
    const gx = ix + i, gy = iy + j;
    if (gx < 0 || gy < 0 || gx >= world.cols || gy >= world.rows) continue;
    const cxm = (gx + 0.5) * WORLD.chunk, cym = (gy + 0.5) * WORLD.chunk;
    want.push([(cxm - x) ** 2 + (cym - y) ** 2, gy * world.cols + gx]);
  }
  want.sort((a, b) => a[0] - b[0]);
  let built = 0;
  for (const [, key] of want) {
    if (world.chunks.has(key)) { chunk(world, key); continue; } // keep it fresh
    if (built >= budget) continue;
    chunk(world, key); built++;
  }
  return built;
}

// the chunks within `keep` of (x, y) (built if missing)
export function chunksNear(world, x, y, keep = WORLD.keep) {
  const ix = Math.floor(x / WORLD.chunk), iy = Math.floor(y / WORLD.chunk), out = [];
  for (let j = -keep; j <= keep; j++) for (let i = -keep; i <= keep; i++) {
    const gx = ix + i, gy = iy + j;
    if (gx >= 0 && gy >= 0 && gx < world.cols && gy < world.rows) out.push(chunk(world, gy * world.cols + gx));
  }
  return out;
}

// ---- the map interface (as run/fieldmap.js) ----

const EMPTY = [];
function cellAt(world, gx, gy) {
  if (gx < 0 || gy < 0) return EMPTY;
  const ix = Math.floor(gx / PER), iy = Math.floor(gy / PER);
  if (ix >= world.cols || iy >= world.rows) return EMPTY;
  return chunk(world, iy * world.cols + ix).cells[(gy - iy * PER) * PER + (gx - ix * PER)];
}

// solids registered at (x, y) (objects, not indexes)
export const solidsNear = (world, x, y) => cellAt(world, Math.floor(x / CELL), Math.floor(y / CELL));

export function blocked(world, x, y, r) {
  const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    for (const s of cellAt(world, cx + i, cy + j)) if ((s.x - x) ** 2 + (s.y - y) ** 2 < (s.r + r) ** 2) return true;
  }
  return false;
}

export function pushOut(world, o, r) {
  for (const s of solidsNear(world, o.x, o.y)) {
    const dx = o.x - s.x, dy = o.y - s.y, min = s.r + r, d2 = dx * dx + dy * dy;
    if (d2 >= min * min) continue;
    const d = Math.sqrt(d2) || 0.01;
    o.x = s.x + (dx / d) * min; o.y = s.y + (dy / d) * min;
  }
  const e = FIELD.edge;
  o.x = Math.max(e, Math.min(world.w - e, o.x));
  o.y = Math.max(e, Math.min(world.h - e, o.y));
}

// the nearest free spot to (x, y) for something of radius r (deterministic spiral)
export function freeSpot(world, x, y, r = 90) {
  if (!blocked(world, x, y, r)) return { x: Math.round(x), y: Math.round(y) };
  for (let k = 1; k < 400; k++) {
    const a = k * 2.399963, d = 40 * Math.sqrt(k) * 3;
    const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
    if (!blocked(world, px, py, r)) return { x: Math.round(px), y: Math.round(py) };
  }
  return { x: Math.round(x), y: Math.round(y) };
}
