// What stands up in a 2.5D region (plan "Tampilan 2.5D" §4), as plain data: every tree,
// rock and ruin stone of the map turned into a "prop" of a 3D kind for the biome, plus
// dressing that only the 3D view has (dark woods past the map edge, crystals round the
// frozen lakes, palms round an oasis). Props sit in a flat cell index so the renderer can
// gather the ones near the hero without allocating. Pure: no DOM, no Three.js.
import { FIELD } from '../data/world.js';

export const PROP_CELL = 400;   // index cell (world units)
export const EDGE_OUT = 700;    // the index reaches this far past the map edge

function seeded(seed) {
  let s = seed % 2147483647 || 1;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}
// a stable 0..1 from a position (stones have no `v` of their own)
export const hash01 = (x, y) => { const h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return h - Math.floor(h); };

// the 3D kind of a solid in a biome (null: not drawn standing — water and lakes lie in the ground)
export function propKind(biome, s) {
  const v = s.v || 0;
  if (s.kind === 'tree') {
    if (biome === 'ice') return 'snowpine';
    if (biome === 'desert') return v < 0.6 ? 'cactus' : 'palm';
    if (biome === 'volcano') return 'deadtree';
    if (biome === 'eclipse') return 'spire';
    return v < 0.5 ? 'pine' : 'oak';
  }
  if (s.kind === 'rock') {
    if (biome === 'eclipse') return 'floatrock';
    if (biome === 'ice' && v > 0.55) return 'icerock';
    return 'rock';
  }
  if (s.kind === 'stone') return hash01(s.x, s.y) < 0.35 ? 'column' : 'stone';
  return null;
}

// the kind used for the dark wood beyond the edge
const EDGE_KIND = { forest: 'pine', ice: 'snowpine', desert: 'rock', volcano: 'deadtree', eclipse: 'spire' };

// all props of a map: [{ x, y, r, v, kind, tint }] (tint: brightness, < 1 for the far edge)
// opts.tufts: standing grass tufts round the feet of forest trees (plan C4, illustrated props)
export function buildProps(map, opts = {}) {
  const biome = map.region.biome || 'forest', out = [];
  for (const s of map.solids) {
    const kind = propKind(biome, s);
    if (kind) out.push({ x: s.x, y: s.y, r: s.r, v: s.v ?? hash01(s.y, s.x), kind, tint: 0.85 + (s.v ?? 0.5) * 0.3 });
  }
  const r = seeded(map.region.seed * 104729 + 3);
  // undergrowth (3D only, no collision): a bush at the foot of some forest trees (plan A5)
  if (biome === 'forest') for (const p of out.slice()) {
    if ((p.kind !== 'oak' && p.kind !== 'pine') || p.v > 0.45) continue;
    const a = p.v * 40, d = p.r * 1.25;
    out.push({ x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d * 0.8, r: p.r * 0.42, v: (p.v * 13) % 1, kind: 'bush', tint: p.tint });
  }
  if (opts.tufts && biome === 'forest') for (const p of out.slice()) {
    if (p.kind !== 'oak' && p.kind !== 'pine') continue;
    for (let i = 0; i < 3; i++) {
      const a = p.v * 23 + i * 2.1, d = p.r * (1.05 + ((p.v * 7 + i * 0.37) % 1) * 0.9);
      out.push({ x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d * 0.8, r: 8 + ((p.v * 11 + i) % 1) * 4, v: (p.v * 17 + i * 0.31) % 1, kind: 'tuft', tint: p.tint });
    }
  }
  // the land goes on: a band of dark trees (dunes of rock in the desert) past every edge
  const n = Math.round((2 * (map.w + map.h)) / 75);
  for (let i = 0; i < n; i++) {
    const side = i % 4, along = r(), out2 = 40 + r() * (EDGE_OUT - 140);
    const x = side < 2 ? along * map.w : side === 2 ? -out2 : map.w + out2;
    const y = side === 0 ? -out2 : side === 1 ? map.h + out2 : along * map.h;
    out.push({ x, y, r: 34 + r() * 30, v: r(), kind: EDGE_KIND[biome] || 'pine', tint: 0.4 + r() * 0.15 });
  }
  // round the lakes: ice crystals, oasis palms, black spires by the void pools
  const ring = { ice: 'crystal', desert: 'palm', eclipse: 'spire' }[biome];
  if (ring) for (const l of map.lakes) {
    const k = biome === 'desert' ? 5 : 7;
    for (let i = 0; i < k; i++) {
      const a = r() * Math.PI * 2, d = l.r * (1.08 + r() * 0.12);
      out.push({ x: l.x + Math.cos(a) * d, y: l.y + Math.sin(a) * d, r: 16 + r() * 14, v: r(), kind: ring, tint: 0.9 + r() * 0.2 });
    }
  }
  return out;
}

// a flat cell index over [−EDGE_OUT, w + EDGE_OUT]²: start offsets + prop indexes (CSR)
export function indexProps(props, w, h) {
  const x0 = -EDGE_OUT, y0 = -EDGE_OUT;
  const cols = Math.ceil((w + EDGE_OUT * 2) / PROP_CELL), rows = Math.ceil((h + EDGE_OUT * 2) / PROP_CELL);
  const cellOf = (p) => {
    const cx = Math.max(0, Math.min(cols - 1, Math.floor((p.x - x0) / PROP_CELL)));
    const cy = Math.max(0, Math.min(rows - 1, Math.floor((p.y - y0) / PROP_CELL)));
    return cy * cols + cx;
  };
  const start = new Int32Array(cols * rows + 1);
  for (const p of props) start[cellOf(p) + 1]++;
  for (let i = 0; i < cols * rows; i++) start[i + 1] += start[i];
  const fill = start.slice(0, cols * rows), items = new Int32Array(props.length);
  props.forEach((p, i) => { items[fill[cellOf(p)]++] = i; });
  return { x0, y0, cols, rows, start, items };
}

// prop indexes within R of (x, y) into `out` (cleared first); returns the count
export function gatherNear(index, props, x, y, R, out) {
  out.length = 0;
  const { x0, y0, cols, rows, start, items } = index, R2 = R * R;
  const cx0 = Math.max(0, Math.floor((x - R - x0) / PROP_CELL)), cx1 = Math.min(cols - 1, Math.floor((x + R - x0) / PROP_CELL));
  const cy0 = Math.max(0, Math.floor((y - R - y0) / PROP_CELL)), cy1 = Math.min(rows - 1, Math.floor((y + R - y0) / PROP_CELL));
  for (let cy = cy0; cy <= cy1; cy++) {
    for (let cx = cx0; cx <= cx1; cx++) {
      const c = cy * cols + cx;
      for (let k = start[c]; k < start[c + 1]; k++) {
        const i = items[k], p = props[i], dx = p.x - x, dy = p.y - y;
        if (dx * dx + dy * dy <= R2) out.push(i);
      }
    }
  }
  return out.length;
}

// true when a prop at (dx, dy) from the hero stands between the hero and the camera
// (camera turned by yaw: 0 = from the south) and should sink out of the way
export function inCutaway(dx, dy, yaw, h = 1) {
  const ys = Math.sin(yaw), yc = Math.cos(yaw);
  const along = dx * ys + dy * yc, side = Math.abs(dx * yc - dy * ys);
  return along > -40 && along < 300 * h && side < 80 + along * 0.35;
}

// one bridge per crossing (paths along a river leave many points): { x, y, a } with a = river direction
export function bridgeSpots(bridges, rivers) {
  const out = [];
  for (const b of bridges) {
    if (!out.every((k) => Math.hypot(k.x - b[0], k.y - b[1]) > 170)) continue;
    let best = Infinity, a = Math.PI / 2;
    for (const river of rivers) {
      for (let i = 1; i < river.length; i++) {
        const [ax, ay] = river[i - 1], [bx, by] = river[i];
        const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
        const k = Math.max(0, Math.min(1, ((b[0] - ax) * dx + (b[1] - ay) * dy) / (L * L)));
        const d = Math.hypot(ax + dx * k - b[0], ay + dy * k - b[1]);
        if (d < best) { best = d; a = Math.atan2(dy, dx); }
      }
    }
    out.push({ x: b[0], y: b[1], a });
  }
  return out;
}

// the ground tiles (size TS) needed around (x, y) within R, as [ix, iy] pairs into `out`
export function tilesAround(x, y, R, TS, out) {
  out.length = 0;
  for (let iy = Math.floor((y - R) / TS); iy <= Math.floor((y + R) / TS); iy++) {
    for (let ix = Math.floor((x - R) / TS); ix <= Math.floor((x + R) / TS); ix++) out.push(ix, iy);
  }
  return out.length / 2;
}

export const RIVER_W = FIELD.riverWidth;

// ---- the one world (spec §40) ----
const ZONE_BIOME = { forest: 'forest', ice: 'ice', desert: 'desert', volcano: 'volcano', eclipse: 'eclipse' };
// borders that stand up: snowy mountain rocks, the black cliffs round Tanah Gerhana
const BORDER_PROP = { mountain: { biome: 'ice', kind: 'rock', k: 0.55 }, cliff: { biome: 'eclipse', kind: 'floatrock', k: 0.5 } };

// The props of one chunk of the world: [{ x, y, r, v, kind, biome, tint }], each in the biome of
// its own zone (a crossing shows both sides' trees). Fixed solids (borders) are taken by the
// chunk holding their centre, so none is drawn twice. Cached on the chunk.
export function chunkProps(world, chunk, opts = {}) {
  if (chunk.props) return chunk.props;
  const out = [];
  for (const s of chunk.solids) {
    const biome = ZONE_BIOME[s.zone] || 'forest', kind = propKind(biome, s);
    if (kind) out.push({ x: s.x, y: s.y, r: s.r, v: s.v ?? hash01(s.y, s.x), kind, biome, tint: 0.85 + (s.v ?? 0.5) * 0.3 });
  }
  for (const p of out.slice()) { // undergrowth & standing tufts at the feet of forest trees (plan A5, C4)
    if (p.biome !== 'forest' || (p.kind !== 'oak' && p.kind !== 'pine')) continue;
    if (p.v <= 0.45) { const a = p.v * 40, d = p.r * 1.25; out.push({ x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d * 0.8, r: p.r * 0.42, v: (p.v * 13) % 1, kind: 'bush', biome: 'forest', tint: p.tint }); }
    if (opts.tufts) for (let i = 0; i < 3; i++) {
      const a = p.v * 23 + i * 2.1, d = p.r * (1.05 + ((p.v * 7 + i * 0.37) % 1) * 0.9);
      out.push({ x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d * 0.8, r: 8 + ((p.v * 11 + i) % 1) * 4, v: (p.v * 17 + i * 0.31) % 1, kind: 'tuft', biome: 'forest', tint: p.tint });
    }
  }
  const C = world.chunkSize;
  for (const s of world.fixedIn[chunk.iy * world.cols + chunk.ix] || []) {
    const bp = BORDER_PROP[s.kind];
    if (!bp || Math.floor(s.x / C) !== chunk.ix || Math.floor(s.y / C) !== chunk.iy) continue;
    // a ridge: one big rock on the line and two smaller ones beside it
    const v = hash01(s.x, s.y);
    out.push({ x: s.x, y: s.y, r: s.r * bp.k, v, kind: bp.kind, biome: bp.biome, tint: 0.8 + v * 0.3 });
    for (const k of [-1, 1]) {
      const a = v * 9 + k * 1.9, d = s.r * 0.55;
      out.push({ x: s.x + Math.cos(a) * d, y: s.y + Math.sin(a) * d, r: s.r * bp.k * 0.6, v: (v * 7 + k) % 1 || 0.3, kind: bp.kind, biome: bp.biome, tint: 0.75 + v * 0.3 });
    }
  }
  chunk.props = out;
  return out;
}
