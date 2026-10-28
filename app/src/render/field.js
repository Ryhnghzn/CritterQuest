// Region ground layer (spec §25.1, §25.5): the biome's floor, winding paths,
// rivers with wooden bridges, lakes (frozen, oasis or lava), groves, rocks,
// ruin circles, dungeon gates and signposts at the exits. Regions are huge,
// so everything is culled through grids: solids via the map's own grid, the
// small floor details through a bucket grid built once per region.
import { t as tf } from '../i18n.js';
import { FIELD, TOWNS } from '../data/world.js';
import { dungeonById } from '../data/dungeons.js';
import { OUT } from '../art/sprites.js';
import { TAU, shadow, shade } from './paint.js';

const cache = new Map(); // region id → { decals, pines, lakeShapes }
const DCELL = 400;       // bucket size for floor decals & edge silhouettes
let stamp = null, frame = 0; // de-duplicates solids seen in several grid cells

function seeded(seed) {
  let s = seed % 2147483647 || 1;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

// ——— floor tile per biome ———
export function groundTile(scale, [c0, c1], biome = 'forest') {
  const T = 160;
  const c = document.createElement('canvas');
  c.width = c.height = Math.ceil(T * scale);
  const g = c.getContext('2d');
  g.scale(c.width / T, c.height / T);
  g.fillStyle = c1; g.fillRect(0, 0, T, T);
  const r = seeded(913);
  const wrap = (fn) => { for (const ox of [-T, 0, T]) for (const oy of [-T, 0, T]) { g.save(); g.translate(ox, oy); fn(); g.restore(); } };
  for (let i = 0; i < 14; i++) { // soft blotches of the lighter colour
    const x = r() * T, y = r() * T, rad = 10 + r() * 22, a = 0.35 + r() * 0.4, rot = r() * 3;
    wrap(() => { g.beginPath(); g.ellipse(x, y, rad, rad * 0.7, rot, 0, TAU); g.fillStyle = c0; g.globalAlpha = a; g.fill(); g.globalAlpha = 1; });
  }
  if (biome === 'ice') {
    for (let i = 0; i < 60; i++) { const x = r() * T, y = r() * T, s = 0.6 + r() * 1.4, a = 0.15 + r() * 0.35; wrap(() => { g.beginPath(); g.arc(x, y, s, 0, TAU); g.fillStyle = `rgba(230,240,255,${a.toFixed(2)})`; g.fill(); }); }
    g.strokeStyle = 'rgba(190,220,255,.18)'; g.lineWidth = 0.8;
    for (let i = 0; i < 6; i++) { const x = r() * T, y = r() * T, a = r() * TAU; wrap(() => { g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 10, y + Math.sin(a) * 10); g.lineTo(x + Math.cos(a + 0.8) * 16, y + Math.sin(a + 0.8) * 16); g.stroke(); }); }
  } else if (biome === 'desert') {
    for (let i = 0; i < 9; i++) { // dune ripples
      const x = r() * T, y = r() * T, w = 20 + r() * 30;
      wrap(() => {
        g.beginPath(); g.moveTo(x - w, y); g.quadraticCurveTo(x, y - 5, x + w, y);
        g.strokeStyle = 'rgba(255,210,150,.12)'; g.lineWidth = 2; g.stroke();
        g.beginPath(); g.moveTo(x - w, y + 3); g.quadraticCurveTo(x, y - 2, x + w, y + 3);
        g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 1.5; g.stroke();
      });
    }
    for (let i = 0; i < 20; i++) { const x = r() * T, y = r() * T, s = 0.8 + r(); wrap(() => { g.beginPath(); g.arc(x, y, s, 0, TAU); g.fillStyle = 'rgba(30,18,10,.35)'; g.fill(); }); }
  } else if (biome === 'volcano') {
    g.lineWidth = 1.2;
    for (let i = 0; i < 5; i++) { // faint glowing cracks
      const x = r() * T, y = r() * T, a = r() * TAU;
      const pts = [[x, y]];
      for (let k = 0; k < 4; k++) { const p = pts[k]; pts.push([p[0] + Math.cos(a + (r() - 0.5)) * 8, p[1] + Math.sin(a + (r() - 0.5)) * 8]); }
      wrap(() => { g.beginPath(); pts.forEach(([px, py], k) => (k ? g.lineTo(px, py) : g.moveTo(px, py))); g.strokeStyle = 'rgba(255,110,40,.22)'; g.stroke(); });
    }
    for (let i = 0; i < 26; i++) { const x = r() * T, y = r() * T, s = 0.6 + r(); wrap(() => { g.beginPath(); g.arc(x, y, s, 0, TAU); g.fillStyle = 'rgba(160,150,150,.18)'; g.fill(); }); }
  } else {
    for (let i = 0; i < 26; i++) { // fallen leaves
      const x = r() * T, y = r() * T, a = r() * TAU, k = r();
      const col = k < 0.5 ? 'rgba(120,90,50,.35)' : k < 0.8 ? 'rgba(90,110,60,.35)' : 'rgba(140,60,40,.3)';
      wrap(() => { g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.ellipse(0, 0, 3, 1.5, 0, 0, TAU); g.fillStyle = col; g.fill(); g.restore(); });
    }
    g.strokeStyle = 'rgba(150,190,110,.22)'; g.lineWidth = 1;
    for (let i = 0; i < 30; i++) {
      const x = r() * T, y = r() * T;
      wrap(() => { g.beginPath(); g.moveTo(x - 2, y); g.lineTo(x - 3, y - 4); g.moveTo(x, y); g.lineTo(x, y - 5); g.moveTo(x + 2, y); g.lineTo(x + 3, y - 4); g.stroke(); });
    }
  }
  return { canvas: c, T };
}

// ——— static dressing, built once per region ———
function bucketKey(x, y) { return `${Math.floor(x / DCELL)},${Math.floor(y / DCELL)}`; }

function dressOf(map) {
  const id = map.region.id;
  if (cache.has(id)) return cache.get(id);
  const r = seeded(map.region.seed * 7919 + 17);
  const decals = new Map(); // bucket → [{ x, y, k, s }]
  const n = Math.round((map.w * map.h) / 11000);
  for (let i = 0; i < n; i++) {
    const d = { x: r() * map.w, y: r() * map.h, k: r(), s: 0.7 + r() * 0.7 };
    const key = bucketKey(d.x, d.y);
    if (!decals.has(key)) decals.set(key, []);
    decals.get(key).push(d);
  }
  // dark silhouettes beyond the map edge (the land goes on)
  const pines = new Map();
  const per = (2 * (map.w + map.h)) / 70;
  for (let i = 0; i < per; i++) {
    const side = i % 4, along = r(), out = 20 + r() * 260;
    const x = side < 2 ? along * map.w : side === 2 ? -out : map.w + out;
    const y = side === 0 ? -out : side === 1 ? map.h + out : along * map.h;
    const key = bucketKey(x, y);
    if (!pines.has(key)) pines.set(key, []);
    pines.get(key).push({ x, y, s: 0.9 + r() * 1.1 });
  }
  // a wobbly outline per lake
  const lakeShapes = map.lakes.map((l) => {
    const pts = [];
    const nn = 22;
    for (let k = 0; k < nn; k++) { const a = (k / nn) * TAU; const rr = l.r * (0.98 + r() * 0.12); pts.push([l.x + Math.cos(a) * rr, l.y + Math.sin(a) * rr]); }
    return { ...l, pts, seed: r() };
  });
  // bridges: a path running along a river leaves a bridge point every few units — keep one per spot
  const bridges = [];
  for (const b of map.bridges) if (bridges.every((k) => Math.hypot(k[0] - b[0], k[1] - b[1]) > 170)) bridges.push(b);
  const d = { decals, pines, lakeShapes, bridges };
  cache.set(id, d);
  return d;
}

// buckets overlapping the rect
function* buckets(m, rect, pad) {
  for (let by = Math.floor((rect.y0 - pad) / DCELL); by <= Math.floor((rect.y1 + pad) / DCELL); by++) {
    for (let bx = Math.floor((rect.x0 - pad) / DCELL); bx <= Math.floor((rect.x1 + pad) / DCELL); bx++) {
      const list = m.get(`${bx},${by}`);
      if (list) yield list;
    }
  }
}

// ——— lines (paths, rivers): only the visible stretch ———
function visibleRange(pts, rect, pad) {
  let i0 = -1, i1 = -1;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
    if (Math.max(ax, bx) < rect.x0 - pad || Math.min(ax, bx) > rect.x1 + pad || Math.max(ay, by) < rect.y0 - pad || Math.min(ay, by) > rect.y1 + pad) continue;
    if (i0 < 0) i0 = i - 1;
    i1 = i;
  }
  return i0 < 0 ? null : pts.slice(Math.max(0, i0 - 1), Math.min(pts.length, i1 + 2));
}

// smooth: curves through the midpoints, corners as control points (paths are not solid)
function strokeLine(g, pts, smooth = false) {
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  if (smooth && pts.length > 2) {
    for (let i = 1; i < pts.length - 1; i++) g.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
    g.lineTo(pts.at(-1)[0], pts.at(-1)[1]);
  } else for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); // rivers: match their solid circles
  g.stroke();
}

// river direction at a point (unit vector along the nearest segment of any river)
function riverDir(rivers, x, y) {
  let best = Infinity, dir = [0, 1];
  for (const river of rivers) {
    for (let i = 1; i < river.length; i++) {
      const [ax, ay] = river[i - 1], [bx, by] = river[i];
      const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
      const k = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (L * L)));
      const d = Math.hypot(ax + dx * k - x, ay + dy * k - y);
      if (d < best) { best = d; dir = [dx / L, dy / L]; }
    }
  }
  return dir;
}

function bridge(g, map, [x, y], lava) {
  const [dx, dy] = riverDir(map.rivers, x, y);
  const len = FIELD.riverWidth + 70, wid = FIELD.bridgeHalf * 1.3;
  g.save();
  g.translate(x, y);
  g.rotate(Math.atan2(dy, dx)); // local x along the river, y across it
  g.beginPath(); g.rect(-wid / 2 + 6, -len / 2 + 6, wid, len); g.fillStyle = 'rgba(0,0,0,.35)'; g.fill();
  g.beginPath(); g.rect(-wid / 2, -len / 2, wid, len); g.fillStyle = lava ? '#3d3836' : '#5a3d25'; g.fill(); // over lava: stone slabs
  g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 1.5;
  for (let yy = -len / 2 + 9; yy < len / 2; yy += lava ? 18 : 10) { g.beginPath(); g.moveTo(-wid / 2, yy); g.lineTo(wid / 2, yy); g.stroke(); }
  g.fillStyle = 'rgba(255,220,170,.07)';
  for (let yy = -len / 2 + 2; yy < len / 2; yy += 10) g.fillRect(-wid / 2, yy, wid, 3);
  for (const s of [-1, 1]) { // rails & posts
    g.beginPath(); g.rect(s * wid / 2 - 4, -len / 2, 8, len); g.fillStyle = lava ? '#2a2624' : '#3e2816'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = OUT; g.stroke();
    for (const py of [-len / 2, 0, len / 2]) { g.beginPath(); g.arc(s * wid / 2, py, 6, 0, TAU); g.fillStyle = lava ? '#35302d' : '#4a311c'; g.fill(); g.stroke(); }
  }
  g.restore();
}

function drawRivers(g, map, rect, theme, biome, t, bridges) {
  const W = FIELD.riverWidth;
  const lava = biome === 'volcano', ice = biome === 'ice';
  for (const river of map.rivers) {
    const pts = visibleRange(river, rect, W + 60);
    if (!pts) continue;
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.lineWidth = W + 26; g.strokeStyle = lava ? '#1a0e0b' : ice ? '#c9d6e6' : '#26241a'; strokeLine(g, pts);
    g.lineWidth = W + 8; g.strokeStyle = shade(theme.water, lava ? 0.55 : 0.7); strokeLine(g, pts);
    g.lineWidth = W - 6; g.strokeStyle = theme.water; strokeLine(g, pts);
    if (lava) {
      g.lineWidth = W * 0.5; g.strokeStyle = 'rgba(255,190,80,.55)'; strokeLine(g, pts);
      g.setLineDash([26, 40]); g.lineDashOffset = -t * 14; g.lineWidth = W * 0.2; g.strokeStyle = 'rgba(255,240,170,.5)'; strokeLine(g, pts);
      g.setLineDash([8, 60]); g.lineDashOffset = -t * 9 + 30; g.lineWidth = W * 0.7; g.strokeStyle = 'rgba(40,14,8,.45)'; strokeLine(g, pts); // drifting crust
    } else {
      g.lineWidth = W * 0.45; g.strokeStyle = ice ? 'rgba(220,240,255,.22)' : 'rgba(120,190,220,.12)'; strokeLine(g, pts);
      g.setLineDash([18, 46]); g.lineDashOffset = -t * 30; g.lineWidth = 2; g.strokeStyle = 'rgba(190,230,255,.28)'; strokeLine(g, pts);
    }
    g.setLineDash([]); g.lineDashOffset = 0; g.lineCap = 'butt';
  }
  for (const b of bridges) if (b[0] > rect.x0 - 150 && b[0] < rect.x1 + 150 && b[1] > rect.y0 - 150 && b[1] < rect.y1 + 150) bridge(g, map, b, lava);
}

function lakePath(g, l) {
  const p = l.pts;
  g.beginPath();
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let m = mid(p[p.length - 1], p[0]);
  g.moveTo(m[0], m[1]);
  for (let i = 0; i < p.length; i++) { const n = mid(p[i], p[(i + 1) % p.length]); g.quadraticCurveTo(p[i][0], p[i][1], n[0], n[1]); }
  g.closePath();
}

function lake(g, l, theme, biome, t) {
  g.save();
  if (biome === 'desert') { // oasis: grass ring, teal water
    g.save(); g.translate(l.x, l.y); g.scale(1.14, 1.14); g.translate(-l.x, -l.y); lakePath(g, l); g.fillStyle = '#3d4a24'; g.fill(); g.restore();
  } else if (biome === 'ice') {
    g.save(); g.translate(l.x, l.y); g.scale(1.07, 1.07); g.translate(-l.x, -l.y); lakePath(g, l); g.fillStyle = '#d6e2f0'; g.fill(); g.restore();
  } else {
    g.save(); g.translate(l.x, l.y); g.scale(1.06, 1.06); g.translate(-l.x, -l.y); lakePath(g, l); g.fillStyle = biome === 'volcano' ? '#140a08' : '#26241a'; g.fill(); g.restore();
  }
  lakePath(g, l);
  if (biome === 'volcano') {
    const gr = g.createRadialGradient(l.x, l.y, l.r * 0.1, l.x, l.y, l.r);
    gr.addColorStop(0, '#ffd27a'); gr.addColorStop(0.45, '#f97316'); gr.addColorStop(1, '#7c1d0a');
    g.fillStyle = gr; g.fill();
    g.clip();
    // slow drifting crust plates and popping bubbles
    for (let i = 0; i < 7; i++) {
      const a = l.seed * 9 + i * 0.9 + t * 0.03, d = l.r * (0.25 + ((i * 37) % 60) / 100);
      g.beginPath(); g.ellipse(l.x + Math.cos(a) * d, l.y + Math.sin(a) * d, l.r * 0.16, l.r * 0.09, a, 0, TAU);
      g.fillStyle = 'rgba(40,14,8,.55)'; g.fill();
    }
    for (let i = 0; i < 5; i++) {
      const ph = (t * 0.6 + i * 0.37 + l.seed) % 1;
      const a = i * 2.3 + l.seed * 5, d = l.r * 0.6 * ((i * 53) % 100) / 100;
      g.beginPath(); g.arc(l.x + Math.cos(a) * d, l.y + Math.sin(a) * d, 4 + ph * 10, 0, TAU);
      g.strokeStyle = `rgba(255,240,180,${(0.6 * (1 - ph)).toFixed(2)})`; g.lineWidth = 2; g.stroke();
    }
  } else if (biome === 'ice') {
    const gr = g.createRadialGradient(l.x - l.r * 0.3, l.y - l.r * 0.3, 0, l.x, l.y, l.r);
    gr.addColorStop(0, '#d9efff'); gr.addColorStop(1, '#7fb2d8');
    g.fillStyle = gr; g.fill();
    g.clip();
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2;
    const r = seeded(Math.floor(l.seed * 1e6) + 3);
    for (let i = 0; i < 6; i++) { // cracks from a point
      let x = l.x + (r() - 0.5) * l.r, y = l.y + (r() - 0.5) * l.r;
      g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 5; k++) { x += (r() - 0.5) * l.r * 0.35; y += (r() - 0.5) * l.r * 0.35; g.lineTo(x, y); }
      g.stroke();
    }
    g.beginPath(); g.ellipse(l.x - l.r * 0.35, l.y - l.r * 0.4, l.r * 0.35, l.r * 0.08, -0.4, 0, TAU); g.fillStyle = 'rgba(255,255,255,.35)'; g.fill();
  } else {
    g.fillStyle = biome === 'desert' ? '#2f8a86' : theme.water; g.fill();
    g.clip();
    g.beginPath(); g.ellipse(l.x, l.y, l.r * 0.7, l.r * 0.6, 0, 0, TAU); g.fillStyle = 'rgba(0,0,0,.18)'; g.fill();
    g.strokeStyle = 'rgba(190,230,255,.22)'; g.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const y = l.y - l.r * 0.5 + i * l.r * 0.32, off = Math.sin(t * 0.8 + i) * 20;
      g.beginPath(); g.moveTo(l.x - l.r * 0.4 + off, y); g.lineTo(l.x - l.r * 0.1 + off, y); g.stroke();
    }
  }
  g.restore();
}

// ——— solids ———
function forestTree(g, s, t) {
  const r = s.r, v = s.v || 0;
  shadow(g, s.x + 4, s.y + r * 0.35, r * 1.15, r * 0.45);
  g.beginPath(); g.roundRect(s.x - r * 0.18, s.y - r * 0.5, r * 0.36, r * 0.85, 3);
  g.fillStyle = '#2e1f17'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = OUT; g.stroke();
  const sway = Math.sin(t * 0.8 + s.x * 0.01) * 1.2;
  const base = v < 0.33 ? '#1f3a26' : v < 0.66 ? '#243b22' : '#2b3420';
  const cy = s.y - r * 0.95;
  const blobs = [[-r * 0.45, r * 0.15, r * 0.7], [r * 0.45, r * 0.12, r * 0.68], [0, -r * 0.3, r * 0.82]];
  g.beginPath();
  for (const [ox, oy, br] of blobs) { g.moveTo(s.x + ox + sway + br, cy + oy); g.arc(s.x + ox + sway, cy + oy, br, 0, TAU); }
  g.lineWidth = 4; g.strokeStyle = OUT; g.stroke();
  g.fillStyle = base; g.fill();
  g.beginPath();
  for (const [ox, oy, br] of blobs) { g.moveTo(s.x + ox + sway + br * 0.6, cy + oy - br * 0.2); g.arc(s.x + ox + sway - br * 0.1, cy + oy - br * 0.2, br * 0.6, 0, TAU); }
  g.fillStyle = shade(base === '#1f3a26' ? '#2f5a39' : base === '#243b22' ? '#365c31' : '#465430', 1); g.globalAlpha = 0.55; g.fill(); g.globalAlpha = 1;
  if (v > 0.85) {
    g.fillStyle = 'rgba(200,170,255,.8)';
    for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(s.x + Math.cos(i * 1.7 + v * 9) * r * 0.6 + sway, cy + Math.sin(i * 2.3) * r * 0.4, 1.8, 0, TAU); g.fill(); }
  }
}

// snow-laden pine: three dark tiers with white caps
function snowPine(g, s) {
  const r = s.r, x = s.x, y = s.y;
  shadow(g, x + 3, y + r * 0.3, r * 0.95, r * 0.36);
  g.beginPath(); g.rect(x - r * 0.12, y - r * 0.4, r * 0.24, r * 0.6); g.fillStyle = '#2a1d16'; g.fill(); g.lineWidth = 1.2; g.strokeStyle = OUT; g.stroke();
  const tiers = [[y - r * 0.2, r * 1.05], [y - r * 0.85, r * 0.85], [y - r * 1.45, r * 0.62]];
  for (const [ty, w] of tiers) {
    g.beginPath(); g.moveTo(x, ty - w * 1.05); g.lineTo(x + w, ty); g.lineTo(x - w, ty); g.closePath();
    g.fillStyle = (s.v || 0) < 0.5 ? '#173027' : '#1b2f30'; g.fill(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke();
    g.beginPath(); g.moveTo(x, ty - w * 1.05); g.lineTo(x + w * 0.62, ty - w * 0.42); g.quadraticCurveTo(x + w * 0.3, ty - w * 0.3, x, ty - w * 0.45); g.quadraticCurveTo(x - w * 0.3, ty - w * 0.3, x - w * 0.62, ty - w * 0.42); g.closePath();
    g.fillStyle = '#e8f1fb'; g.fill();
  }
}

function cactus(g, s) {
  const r = s.r, x = s.x, y = s.y;
  shadow(g, x + 2, y + 4, r * 0.6, r * 0.22);
  const col = '#3f6b3a';
  const limb = (x0, y0, w, h) => { g.beginPath(); g.roundRect(x0 - w / 2, y0 - h, w, h, w / 2); g.fillStyle = col; g.fill(); g.lineWidth = 1.8; g.strokeStyle = OUT; g.stroke(); };
  const v = s.v || 0;
  limb(x, y, r * 0.42, r * 1.7);
  if (v < 0.4) { limb(x - r * 0.42, y - r * 0.5, r * 0.28, r * 0.7); g.beginPath(); g.rect(x - r * 0.42, y - r * 0.62, r * 0.25, r * 0.2); g.fillStyle = col; g.fill(); }
  limb(x + r * 0.42, y - r * 0.7, r * 0.28, r * 0.75); g.beginPath(); g.rect(x + r * 0.15, y - r * 0.82, r * 0.25, r * 0.2); g.fillStyle = col; g.fill();
  g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(x - r * 0.06, y - r * 1.55); g.lineTo(x - r * 0.06, y - r * 0.1); g.stroke();
  if (v > 0.8) { g.beginPath(); g.arc(x, y - r * 1.72, 3, 0, TAU); g.fillStyle = '#e0527a'; g.fill(); }
}

function deadShrub(g, s, color = '#5a4632', ember = false) {
  const r = s.r, x = s.x, y = s.y;
  shadow(g, x + 2, y + 3, r * 0.7, r * 0.25);
  g.strokeStyle = OUT; g.lineCap = 'round';
  const branch = (x0, y0, a, len, w, depth) => {
    const x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len;
    g.lineWidth = w + 2; g.strokeStyle = OUT; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    g.lineWidth = w; g.strokeStyle = color; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    if (depth > 0) { branch(x1, y1, a - 0.55, len * 0.62, w * 0.65, depth - 1); branch(x1, y1, a + 0.5, len * 0.6, w * 0.65, depth - 1); } else if (ember && ((x1 * 7 + y1) | 0) % 3 === 0) {
      g.beginPath(); g.arc(x1, y1, 1.8, 0, TAU); g.fillStyle = '#ff9a3c'; g.fill();
    }
  };
  branch(x, y, -Math.PI / 2 + ((s.v || 0) - 0.5) * 0.3, r * 1.1, r * 0.22, 2);
  g.lineCap = 'butt';
}

function rock(g, s, biome, t) {
  const r = s.r, v = s.v || 0;
  shadow(g, s.x + 2, s.y + r * 0.45, r * 1.05, r * 0.4);
  g.beginPath();
  g.moveTo(s.x - r, s.y + r * 0.3);
  g.quadraticCurveTo(s.x - r * 0.9, s.y - r * 0.7, s.x - r * 0.1, s.y - r * 0.8);
  g.quadraticCurveTo(s.x + r * 0.9, s.y - r * 0.8, s.x + r, s.y + r * 0.2);
  g.quadraticCurveTo(s.x, s.y + r * 0.7, s.x - r, s.y + r * 0.3);
  const fill = biome === 'ice' ? (v < 0.5 ? '#5b6878' : '#66707e') : biome === 'desert' ? (v < 0.5 ? '#9a6a44' : '#a87a4e') : biome === 'volcano' ? '#24201f' : v < 0.5 ? '#4a4a55' : '#55504a';
  g.fillStyle = fill; g.fill(); g.lineWidth = 1.8; g.strokeStyle = OUT; g.stroke();
  if (biome === 'desert') { // sandstone layers
    g.save(); g.clip(); g.strokeStyle = 'rgba(60,30,15,.35)'; g.lineWidth = 1.5;
    for (const k of [-0.35, 0.05]) { g.beginPath(); g.moveTo(s.x - r, s.y + r * k); g.lineTo(s.x + r, s.y + r * (k - 0.1)); g.stroke(); }
    g.restore();
  }
  g.beginPath(); g.ellipse(s.x - r * 0.25, s.y - r * 0.4, r * 0.4, r * 0.15, -0.3, 0, TAU);
  g.fillStyle = biome === 'ice' ? 'rgba(240,248,255,.75)' : 'rgba(255,255,255,.1)'; g.fill(); // ice: a snow cap
  if (biome === 'ice' && v > 0.55) { // an ice crystal growing from it
    g.beginPath(); g.moveTo(s.x + r * 0.3, s.y - r * 0.5); g.lineTo(s.x + r * 0.45, s.y - r * 1.5); g.lineTo(s.x + r * 0.7, s.y - r * 0.45); g.closePath();
    g.fillStyle = 'rgba(160,220,255,.85)'; g.fill(); g.lineWidth = 1.4; g.strokeStyle = OUT; g.stroke();
    g.beginPath(); g.moveTo(s.x + r * 0.42, s.y - r * 0.6); g.lineTo(s.x + r * 0.46, s.y - r * 1.3); g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1; g.stroke();
  } else if (biome === 'volcano') { // ember cracks
    const a = 0.55 + Math.sin(t * 2 + s.x) * 0.25;
    g.strokeStyle = `rgba(255,120,40,${a.toFixed(2)})`; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(s.x - r * 0.5, s.y + r * 0.1); g.lineTo(s.x - r * 0.1, s.y - r * 0.25); g.lineTo(s.x + r * 0.3, s.y - r * 0.05); g.lineTo(s.x + r * 0.55, s.y - r * 0.4); g.stroke();
  } else if (biome === 'forest' && v > 0.6) {
    g.beginPath(); g.ellipse(s.x + r * 0.2, s.y - r * 0.55, r * 0.45, r * 0.18, 0.2, 0, TAU); g.fillStyle = 'rgba(80,130,70,.55)'; g.fill();
  }
}

function stone(g, s, t, biome) {
  shadow(g, s.x + 3, s.y + 10, 16, 6);
  g.beginPath(); g.roundRect(s.x - 12, s.y - 34, 24, 44, [10, 10, 3, 3]);
  g.fillStyle = biome === 'desert' ? '#8a6448' : biome === 'volcano' ? '#2e2a2c' : biome === 'ice' ? '#566373' : '#4b4a5c';
  g.fill(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke();
  g.beginPath(); g.roundRect(s.x - 8, s.y - 30, 6, 34, 3); g.fillStyle = 'rgba(255,255,255,.08)'; g.fill();
  if (biome === 'ice') { g.beginPath(); g.roundRect(s.x - 12, s.y - 36, 24, 8, 4); g.fillStyle = '#e8f1fb'; g.fill(); }
  const a = 0.35 + Math.sin(t * 1.5 + s.x) * 0.15;
  g.strokeStyle = biome === 'volcano' ? `rgba(255,140,60,${a.toFixed(2)})` : `rgba(150,140,255,${a.toFixed(2)})`; g.lineWidth = 1.6;
  g.beginPath(); g.moveTo(s.x, s.y - 24); g.lineTo(s.x, s.y - 8); g.moveTo(s.x - 5, s.y - 20); g.lineTo(s.x + 5, s.y - 12); g.stroke();
}

function ruinFloor(g, ru, biome) {
  g.beginPath(); g.arc(ru.x, ru.y, ru.r + 14, 0, TAU);
  g.fillStyle = biome === 'desert' ? 'rgba(120,90,60,.45)' : biome === 'ice' ? 'rgba(120,135,160,.4)' : 'rgba(60,62,76,.42)'; g.fill();
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.2;
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; g.beginPath(); g.moveTo(ru.x + Math.cos(a) * 30, ru.y + Math.sin(a) * 30); g.lineTo(ru.x + Math.cos(a) * (ru.r + 12), ru.y + Math.sin(a) * (ru.r + 12)); g.stroke(); }
  for (const k of [0.3, 0.65]) { g.beginPath(); g.arc(ru.x, ru.y, ru.r * k + 14, 0, TAU); g.stroke(); }
  if (biome === 'forest') { g.beginPath(); g.arc(ru.x, ru.y, ru.r + 14, 0, TAU); g.fillStyle = 'rgba(70,120,60,.18)'; g.fill(); }
}

function edgeShape(g, p, biome) {
  g.save(); g.translate(p.x, p.y); g.scale(p.s, p.s);
  if (biome === 'desert') { // dune silhouettes
    g.beginPath(); g.moveTo(-70, 22); g.quadraticCurveTo(-10, -40, 70, 22); g.closePath(); g.fillStyle = '#1c120b'; g.fill();
  } else if (biome === 'volcano') { // jagged basalt
    g.beginPath(); g.moveTo(-30, 22); g.lineTo(-18, -50); g.lineTo(-4, -20); g.lineTo(8, -70); g.lineTo(30, 22); g.closePath(); g.fillStyle = '#0d0706'; g.fill();
  } else {
    g.beginPath(); g.moveTo(0, -80); g.lineTo(28, -14); g.lineTo(15, -14); g.lineTo(36, 22); g.lineTo(-36, 22); g.lineTo(-15, -14); g.lineTo(-28, -14); g.closePath();
    g.fillStyle = biome === 'ice' ? '#0e1820' : '#0c140f'; g.fill();
    if (biome === 'ice') { g.beginPath(); g.moveTo(0, -80); g.lineTo(14, -48); g.lineTo(-14, -48); g.closePath(); g.fillStyle = 'rgba(220,235,250,.5)'; g.fill(); }
  }
  g.restore();
}

function decal(g, d, biome, t) {
  const { x, y, s, k } = d;
  if (biome === 'ice') {
    if (k < 0.7) { g.beginPath(); g.ellipse(x, y, 6 * s, 2.5 * s, 0, 0, TAU); g.fillStyle = 'rgba(235,244,255,.35)'; g.fill(); } else { // glint
      const a = 0.3 + 0.3 * Math.sin(t * 2 + x);
      g.strokeStyle = `rgba(220,240,255,${a.toFixed(2)})`; g.lineWidth = 1;
      g.beginPath(); g.moveTo(x - 3 * s, y); g.lineTo(x + 3 * s, y); g.moveTo(x, y - 3 * s); g.lineTo(x, y + 3 * s); g.stroke();
    }
  } else if (biome === 'desert') {
    if (k < 0.75) {
      g.strokeStyle = 'rgba(170,140,70,.55)'; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(x - 3 * s, y); g.lineTo(x - 6 * s, y - 5 * s); g.moveTo(x, y); g.lineTo(x + 1 * s, y - 7 * s); g.moveTo(x + 3 * s, y); g.lineTo(x + 6 * s, y - 4 * s); g.stroke();
    } else { g.beginPath(); g.ellipse(x, y, 4 * s, 1.6 * s, 0.3, 0, TAU); g.fillStyle = 'rgba(235,225,200,.55)'; g.fill(); } // bleached bone
  } else if (biome === 'volcano') {
    if (k < 0.6) { g.beginPath(); g.arc(x, y, 2 * s, 0, TAU); g.fillStyle = 'rgba(120,110,110,.35)'; g.fill(); } else {
      const a = 0.4 + 0.4 * Math.sin(t * 3 + x * 0.3);
      g.beginPath(); g.arc(x, y, 1.6 * s, 0, TAU); g.fillStyle = `rgba(255,140,50,${a.toFixed(2)})`; g.fill();
    }
  } else if (k < 0.8) {
    g.strokeStyle = 'rgba(110,150,80,.5)'; g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(x - 3 * s, y); g.lineTo(x - 5 * s, y - 6 * s); g.moveTo(x, y); g.lineTo(x, y - 8 * s); g.moveTo(x + 3 * s, y); g.lineTo(x + 5 * s, y - 6 * s); g.stroke();
  } else {
    g.fillStyle = k < 0.9 ? 'rgba(220,200,255,.7)' : 'rgba(255,190,120,.7)';
    g.beginPath(); g.arc(x, y, 1.8 * s, 0, TAU); g.fill();
  }
}

function signpost(g, x, y, text, dir) {
  shadow(g, x, y + 4, 10, 3);
  g.beginPath(); g.rect(x - 3, y - 46, 6, 50); g.fillStyle = '#4a311c'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = OUT; g.stroke();
  g.font = '600 11px Barlow, system-ui, sans-serif';
  const w = g.measureText(text).width + 24;
  const bx = dir < 0 ? x - w + 14 : x - 14, by = y - 54;
  g.beginPath();
  if (dir < 0) { g.moveTo(bx, by + 9); g.lineTo(bx + 10, by); g.lineTo(bx + w, by); g.lineTo(bx + w, by + 18); g.lineTo(bx + 10, by + 18); } else { g.moveTo(bx, by); g.lineTo(bx + w - 10, by); g.lineTo(bx + w, by + 9); g.lineTo(bx + w - 10, by + 18); g.lineTo(bx, by + 18); }
  g.closePath(); g.fillStyle = '#6b4a2b'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = OUT; g.stroke();
  g.fillStyle = '#f3e2b8'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, bx + w / 2 + (dir < 0 ? 4 : -4), by + 9.5);
  g.textBaseline = 'alphabetic';
}

// ——— dungeon gates (spec §25.5): a ruined stone arch around a swirling portal ———
export const gateGlow = (g) => dungeonById(g.dungeon).theme.glow || ['200,130,255', '120,200,255'];

function gate(g, gt, t, near) {
  const { x, y } = gt;
  const [c0, c1] = gateGlow(gt);
  shadow(g, x, y + 8, 62, 16);
  // portal (behind the arch)
  g.save();
  g.beginPath(); g.ellipse(x, y - 46, 34, 50, 0, 0, TAU); g.clip();
  const gr = g.createRadialGradient(x, y - 46, 4, x, y - 46, 56);
  gr.addColorStop(0, `rgba(${c1},.95)`); gr.addColorStop(0.5, `rgba(${c0},.75)`); gr.addColorStop(1, 'rgba(10,6,24,.95)');
  g.fillStyle = gr; g.fillRect(x - 40, y - 100, 80, 110);
  g.lineWidth = 3;
  for (let i = 0; i < 3; i++) { // swirl arms
    g.beginPath();
    for (let k = 0; k <= 24; k++) {
      const a = t * 1.6 + i * (TAU / 3) + k * 0.26, rr = 4 + k * 1.7;
      const px = x + Math.cos(a) * rr * 0.75, py = y - 46 + Math.sin(a) * rr;
      if (k) g.lineTo(px, py); else g.moveTo(px, py);
    }
    g.strokeStyle = `rgba(${i % 2 ? c0 : c1},.55)`; g.stroke();
  }
  g.restore();
  // the arch: two weathered pillars and a broken lintel
  g.lineWidth = 2.5; g.strokeStyle = OUT;
  for (const s of [-1, 1]) {
    g.beginPath(); g.roundRect(x + s * 46 - 11, y - 98, 22, 104, [6, 6, 2, 2]); g.fillStyle = '#3b3846'; g.fill(); g.stroke();
    g.beginPath(); g.roundRect(x + s * 46 - 7, y - 92, 5, 92, 2); g.fillStyle = 'rgba(255,255,255,.07)'; g.fill();
    g.beginPath(); g.roundRect(x + s * 46 - 15, y - 2, 30, 10, 2); g.fillStyle = '#2c2a35'; g.fill(); g.stroke();
  }
  g.beginPath();
  g.moveTo(x - 60, y - 96); g.quadraticCurveTo(x, y - 140, x + 60, y - 96); g.lineTo(x + 54, y - 84); g.quadraticCurveTo(x, y - 122, x - 54, y - 84); g.closePath();
  g.fillStyle = '#433f50'; g.fill(); g.stroke();
  // keystone rune
  const a = 0.55 + Math.sin(t * 2) * 0.3;
  g.beginPath(); g.moveTo(x - 9, y - 124); g.lineTo(x + 9, y - 124); g.lineTo(x + 6, y - 108); g.lineTo(x - 6, y - 108); g.closePath(); g.fillStyle = '#2c2a35'; g.fill(); g.stroke();
  g.strokeStyle = `rgba(${c1},${a.toFixed(2)})`; g.lineWidth = 2;
  g.beginPath(); g.moveTo(x, y - 121); g.lineTo(x, y - 111); g.moveTo(x - 4, y - 118); g.lineTo(x + 4, y - 114); g.stroke();
  if (near) {
    const name = dungeonById(gt.dungeon).name;
    g.font = '700 14px Barlow, system-ui, sans-serif'; g.textAlign = 'center';
    g.lineWidth = 4; g.strokeStyle = 'rgba(10,8,20,.9)'; g.strokeText(name, x, y - 150);
    g.fillStyle = '#f3e2b8'; g.fillText(name, x, y - 150);
  }
}

// ——— the frame ———
// Draws the region below the actors. rect: visible world rect { x0, y0, x1, y1 }.
export function drawField(g, game, ground, t, rect) {
  const map = game.fmap, region = map.region, theme = region.theme, biome = region.biome || 'forest';
  const d = dressOf(map);
  const vis = (x, y, m) => x > rect.x0 - m && x < rect.x1 + m && y > rect.y0 - m && y < rect.y1 + m;
  // the land past the edge
  g.fillStyle = biome === 'desert' ? '#120c08' : biome === 'volcano' ? '#0a0605' : biome === 'ice' ? '#080c12' : '#070b08';
  g.fillRect(rect.x0 - 10, rect.y0 - 10, rect.x1 - rect.x0 + 20, rect.y1 - rect.y0 + 20);
  const edges = [];
  for (const list of buckets(d.pines, rect, 160)) for (const p of list) if (vis(p.x, p.y, 120)) edges.push(p);
  edges.sort((a, b) => a.y - b.y);
  for (const p of edges) if (p.y < 0) edgeShape(g, p, biome);
  // floor (only the visible part)
  const fx0 = Math.max(0, rect.x0), fy0 = Math.max(0, rect.y0), fx1 = Math.min(map.w, rect.x1), fy1 = Math.min(map.h, rect.y1);
  if (fx1 > fx0 && fy1 > fy0) { g.fillStyle = ground; g.fillRect(fx0, fy0, fx1 - fx0, fy1 - fy0); }
  for (const ru of map.ruins) if (vis(ru.x, ru.y, ru.r + 40)) ruinFloor(g, ru, biome);
  // paths: dark verge, dirt, worn ruts
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (const p of map.paths) {
    const pts = visibleRange(p, rect, FIELD.pathWidth + 40);
    if (!pts) continue;
    g.lineWidth = FIELD.pathWidth + 16; g.strokeStyle = 'rgba(0,0,0,.25)'; strokeLine(g, pts, true);
    g.lineWidth = FIELD.pathWidth; g.strokeStyle = theme.path; strokeLine(g, pts, true);
    g.lineWidth = FIELD.pathWidth * 0.55; g.strokeStyle = biome === 'ice' ? 'rgba(230,240,255,.08)' : 'rgba(255,220,170,.05)'; strokeLine(g, pts, true);
    g.setLineDash([14, 22]); g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.18)'; strokeLine(g, pts, true); g.setLineDash([]);
  }
  g.lineCap = 'butt';
  drawRivers(g, map, rect, theme, biome, t, d.bridges);
  for (const l of d.lakeShapes) if (vis(l.x, l.y, l.r + 40)) lake(g, l, theme, biome, t);
  for (const list of buckets(d.decals, rect, 10)) for (const dc of list) if (vis(dc.x, dc.y, 10)) decal(g, dc, biome, t);
  // signposts at the exits
  const from = TOWNS[region.from], to = TOWNS[region.to];
  if (vis(map.start.x, map.start.y, 200)) signpost(g, FIELD.exitZone + 40, map.start.y - 70, tf('Ke {name}', { name: from.name }), -1);
  if (vis(map.end.x, map.end.y, 200)) signpost(g, map.w - FIELD.exitZone - 40, map.end.y - 70, tf('Ke {name}', { name: to.name }), 1);
  // solids & gates in y order (trees overlap what stands behind them)
  if (!stamp || stamp.length < map.solids.length) stamp = new Uint32Array(Math.max(map.solids.length, 1024));
  frame = (frame + 1) >>> 0 || 1;
  const list = [];
  const CELL = map.w / map.cols;
  const cx0 = Math.max(0, Math.floor((rect.x0 - 120) / CELL)), cx1 = Math.min(map.cols - 1, Math.floor((rect.x1 + 120) / CELL));
  const cy0 = Math.max(0, Math.floor((rect.y0 - 60) / CELL)), cy1 = Math.min(map.rows - 1, Math.floor((rect.y1 + 160) / CELL));
  for (let cy = cy0; cy <= cy1; cy++) {
    for (let cx = cx0; cx <= cx1; cx++) {
      for (const i of map.grid[cy * map.cols + cx]) {
        if (stamp[i] === frame) continue;
        stamp[i] = frame;
        const s = map.solids[i];
        if (s.kind === 'water' || s.kind === 'lake') continue;
        if (vis(s.x, s.y, s.r * 2 + 30)) list.push(s);
      }
    }
  }
  for (const gt of game.gates || []) if (vis(gt.x, gt.y, 160)) list.push({ gate: gt, y: gt.y });
  for (const tr of game.treasures || []) if (vis(tr.x, tr.y, 140)) list.push({ chest: tr, y: tr.y });
  list.sort((a, b) => a.y - b.y);
  for (const s of list) {
    if (s.gate) gate(g, s.gate, t, game.nearGate === s.gate);
    else if (s.chest) treasureChest(g, s.chest, t);
    else if (s.kind === 'tree') {
      if (biome === 'ice') snowPine(g, s);
      else if (biome === 'desert') { if ((s.v || 0) < 0.6) cactus(g, s); else deadShrub(g, s); } else if (biome === 'volcano') deadShrub(g, s, '#1c1513', true);
      else forestTree(g, s, t);
    } else if (s.kind === 'rock') rock(g, s, biome, t);
    else if (s.kind === 'stone') stone(g, s, t, biome);
  }
  for (const p of edges) if (p.y >= 0) edgeShape(g, p, biome);
  // soft darkening along the map edge
  const edgeRgb = biome === 'desert' ? '18,12,8' : biome === 'volcano' ? '10,6,5' : biome === 'ice' ? '8,12,18' : '7,11,8';
  for (const [x, y, w, h, gx0, gy0, gx1, gy1] of [
    [0, 0, map.w, 60, 0, 0, 0, 60], [0, map.h - 60, map.w, 60, 0, map.h, 0, map.h - 60],
    [0, 0, 60, map.h, 0, 0, 60, 0], [map.w - 60, 0, 60, map.h, map.w, 0, map.w - 60, 0],
  ]) {
    const ix0 = Math.max(x, rect.x0), iy0 = Math.max(y, rect.y0), ix1 = Math.min(x + w, rect.x1), iy1 = Math.min(y + h, rect.y1);
    if (ix1 <= ix0 || iy1 <= iy0) continue;
    const gr = g.createLinearGradient(gx0, gy0, gx1, gy1);
    gr.addColorStop(0, `rgba(${edgeRgb},.85)`); gr.addColorStop(1, `rgba(${edgeRgb},0)`);
    g.fillStyle = gr; g.fillRect(ix0, iy0, ix1 - ix0, iy1 - iy0);
  }
}

// lights of the region itself (visible ones only): ruin runes, exit lanterns,
// dungeon gates, and the glow of lava lakes & rivers on the volcano.
export function fieldDecorLights(game, t, out, rect) {
  const map = game.fmap, biome = map.region.biome;
  const vis = (x, y, m) => !rect || (x > rect.x0 - m && x < rect.x1 + m && y > rect.y0 - m && y < rect.y1 + m);
  for (const ru of map.ruins) if (vis(ru.x, ru.y, ru.r + 120)) out.push({ x: ru.x, y: ru.y, r: ru.r + 80, rgb: biome === 'volcano' ? '255,140,60' : '150,140,255', tint: 0.035 + Math.sin(t * 1.3 + ru.x) * 0.01 });
  if (vis(map.start.x, map.start.y, 200)) out.push({ x: FIELD.exitZone + 40, y: map.start.y - 90, r: 120, rgb: '255,190,110', tint: 0.08 });
  if (vis(map.end.x, map.end.y, 200)) out.push({ x: map.w - FIELD.exitZone - 40, y: map.end.y - 90, r: 120, rgb: '255,190,110', tint: 0.08 });
  for (const gt of game.gates || []) {
    if (!vis(gt.x, gt.y, 260)) continue;
    const [, c1] = gateGlow(gt);
    out.push({ x: gt.x, y: gt.y - 46, r: 220 + Math.sin(t * 2) * 15, rgb: c1, tint: 0.14 });
  }
  for (const tr of game.treasures || []) {
    if (tr.state === 'open' || !vis(tr.x, tr.y, 200)) continue;
    out.push({ x: tr.x, y: tr.y - 20, r: (tr.lord ? 200 : 150) + Math.sin(t * 3) * 10, rgb: tr.state === 'unlocked' ? '255,210,110' : '255,170,60', tint: tr.state === 'unlocked' ? 0.2 : 0.1 });
  }
  if (biome !== 'volcano') return;
  for (const l of map.lakes) if (vis(l.x, l.y, l.r + 200)) out.push({ x: l.x, y: l.y, r: l.r * 1.7, rgb: '255,120,40', tint: 0.16 + Math.sin(t * 1.1 + l.x) * 0.02 });
  for (const river of map.rivers) {
    const pts = visibleRange(river, rect || { x0: -1e9, y0: -1e9, x1: 1e9, y1: 1e9 }, 300);
    if (!pts) continue;
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 260));
      for (let k = 0; k < n; k++) {
        const x = ax + ((bx - ax) * k) / n, y = ay + ((by - ay) * k) / n;
        if (vis(x, y, 260)) out.push({ x, y, r: 240, rgb: '255,120,40', tint: 0.12 });
      }
    }
  }
}

// ——— expedition arrow (spec §25.5): a gold chevron around the player toward the target ———
export function targetArrow(g, game, t) {
  const tg = game.target;
  if (!tg) return;
  const dx = tg.x - game.px, dy = tg.y - game.py, dist = Math.hypot(dx, dy);
  if (dist < 300) return;
  const a = Math.atan2(dy, dx), R = 70 + Math.sin(t * 4) * 4;
  const x = game.px + Math.cos(a) * R, y = game.py - 10 + Math.sin(a) * R;
  g.save();
  g.translate(x, y); g.rotate(a);
  g.beginPath(); g.moveTo(14, 0); g.lineTo(-8, -11); g.lineTo(-3, 0); g.lineTo(-8, 11); g.closePath();
  g.fillStyle = '#e6c27a'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#2a1606'; g.stroke();
  g.restore();
  const label = dist >= 1000 ? `${(dist / 1000).toFixed(1)}k` : String(Math.round(dist));
  g.font = '700 11px Barlow, system-ui, sans-serif'; g.textAlign = 'center';
  const lx = game.px + Math.cos(a) * (R + 22), ly = game.py - 10 + Math.sin(a) * (R + 22) + 4;
  g.lineWidth = 3; g.strokeStyle = 'rgba(10,8,20,.9)'; g.strokeText(label, lx, ly);
  g.fillStyle = '#f3e2b8'; g.fillText(label, lx, ly);
}

// ——— hidden treasure (spec §25.3): a chest on a rune-ring dais; chained and
// locked while its guardian lives, glowing once free, lid thrown back when opened ———
function treasureChest(g, tr, t) {
  const { x, y } = tr, open = tr.state === 'open', locked = tr.state === 'idle' || tr.state === 'guarded';
  const s = tr.lord ? 1.35 : 1;
  // dais
  g.beginPath(); g.ellipse(x, y + 8, 62 * s, 22 * s, 0, 0, Math.PI * 2);
  g.fillStyle = 'rgba(30,26,40,.75)'; g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(230,194,122,.35)'; g.stroke();
  if (!open) {
    g.save(); g.translate(x, y + 8); g.scale(1, 0.35);
    for (let i = 0; i < 8; i++) {
      const a = t * 0.6 + (i / 8) * Math.PI * 2;
      g.beginPath(); g.arc(Math.cos(a) * 52 * s, Math.sin(a) * 52 * s, 4, 0, Math.PI * 2);
      g.fillStyle = `rgba(255,${locked ? 150 : 210},80,${0.5 + 0.4 * Math.sin(t * 3 + i)})`; g.fill();
    }
    g.restore();
  }
  g.save(); g.translate(x, y); g.scale(s, s);
  // body
  g.beginPath(); g.roundRect(-30, -28, 60, 34, 4); g.fillStyle = '#6b3f1f'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = '#1a1010'; g.stroke();
  g.fillStyle = '#c9a24a';
  for (const bx of [-30, -4, 22]) g.fillRect(bx, -28, 8, 34);
  g.strokeStyle = '#1a1010'; g.lineWidth = 1.5; for (const bx of [-30, -4, 22]) g.strokeRect(bx, -28, 8, 34);
  if (open) {
    // lid thrown back, light pouring out
    g.beginPath(); g.moveTo(-32, -28); g.lineTo(-28, -52); g.lineTo(28, -52); g.lineTo(32, -28); g.closePath();
    g.fillStyle = '#5a3418'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = '#1a1010'; g.stroke();
    g.fillStyle = 'rgba(20,12,8,.9)'; g.fillRect(-26, -30, 52, 6);
  } else {
    g.beginPath(); g.moveTo(-32, -28); g.quadraticCurveTo(0, -50, 32, -28); g.closePath();
    g.fillStyle = '#7a4a24'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = '#1a1010'; g.stroke();
    // lock
    g.beginPath(); g.roundRect(-7, -22, 14, 14, 3); g.fillStyle = locked ? '#8a8a9a' : '#ffd166'; g.fill(); g.lineWidth = 1.5; g.stroke();
    if (locked) { // chains across the lid
      g.strokeStyle = '#9a9aaa'; g.lineWidth = 3; g.setLineDash([6, 4]);
      g.beginPath(); g.moveTo(-34, -40); g.lineTo(34, -6); g.moveTo(34, -40); g.lineTo(-34, -6); g.stroke(); g.setLineDash([]);
    }
  }
  g.restore();
  if (!locked) { // sparkles / rays
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < (open ? 4 : 7); i++) {
      const ph = (t * 0.8 + i / 7) % 1;
      g.beginPath(); g.arc(x + Math.sin(i * 9 + t) * 24 * s, y - 34 * s - ph * 50, 2.4 * (1 - ph) + 0.6, 0, Math.PI * 2);
      g.fillStyle = `rgba(255,220,130,${(open ? 0.5 : 1) * (1 - ph)})`; g.fill();
    }
    g.restore();
  }
}
