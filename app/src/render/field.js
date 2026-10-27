// Region ground layer (spec §25.1): a dark forest floor with a winding dirt
// path, a river with wooden bridges, groves of trees, rocks, ruin circles and
// signposts at the exits. Everything static is placed once per region (seeded);
// drawing is culled to the visible rect.
import { t as tf } from '../i18n.js';
import { FIELD, TOWNS } from '../data/world.js';
import { OUT } from '../art/sprites.js';
import { TAU, shadow, shade } from './paint.js';

const cache = new Map(); // region id → { grass, pines }

function seeded(seed) {
  let s = seed % 2147483647 || 1;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

// Forest floor: moss blotches, fallen leaves and tiny tufts on the darker colour.
export function groundTile(scale, [c0, c1]) {
  const T = 160;
  const c = document.createElement('canvas');
  c.width = c.height = Math.ceil(T * scale);
  const g = c.getContext('2d');
  g.scale(c.width / T, c.height / T);
  g.fillStyle = c1; g.fillRect(0, 0, T, T);
  const r = seeded(913);
  const wrap = (fn) => { for (const ox of [-T, 0, T]) for (const oy of [-T, 0, T]) { g.save(); g.translate(ox, oy); fn(); g.restore(); } };
  for (let i = 0; i < 14; i++) {
    const x = r() * T, y = r() * T, rad = 10 + r() * 22, a = 0.35 + r() * 0.4;
    wrap(() => { g.beginPath(); g.ellipse(x, y, rad, rad * 0.7, r() * 3, 0, TAU); g.fillStyle = c0; g.globalAlpha = a; g.fill(); g.globalAlpha = 1; });
  }
  for (let i = 0; i < 26; i++) {
    const x = r() * T, y = r() * T, a = r() * TAU, k = r();
    const col = k < 0.5 ? 'rgba(120,90,50,.35)' : k < 0.8 ? 'rgba(90,110,60,.35)' : 'rgba(140,60,40,.3)';
    wrap(() => { g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.ellipse(0, 0, 3, 1.5, 0, 0, TAU); g.fillStyle = col; g.fill(); g.restore(); });
  }
  g.strokeStyle = 'rgba(150,190,110,.22)'; g.lineWidth = 1;
  for (let i = 0; i < 30; i++) {
    const x = r() * T, y = r() * T;
    wrap(() => { g.beginPath(); g.moveTo(x - 2, y); g.lineTo(x - 3, y - 4); g.moveTo(x, y); g.lineTo(x, y - 5); g.moveTo(x + 2, y); g.lineTo(x + 3, y - 4); g.stroke(); });
  }
  return { canvas: c, T };
}

function dressOf(map) {
  const id = map.region.id;
  if (cache.has(id)) return cache.get(id);
  const r = seeded(map.region.seed * 7919 + 17);
  const grass = [];
  for (let i = 0; i < Math.round((map.w * map.h) / 9000); i++) {
    grass.push({ x: r() * map.w, y: r() * map.h, k: r(), s: 0.7 + r() * 0.7 });
  }
  // dark pines beyond the map edge (the forest goes on)
  const pines = [];
  const per = 2 * (map.w + map.h) / 70;
  for (let i = 0; i < per; i++) {
    const side = i % 4, along = r(), out = 20 + r() * 260;
    const x = side < 2 ? along * map.w : side === 2 ? -out : map.w + out;
    const y = side === 0 ? -out : side === 1 ? map.h + out : along * map.h;
    pines.push({ x, y, s: 0.9 + r() * 1.1 });
  }
  pines.sort((a, b) => a.y - b.y);
  const d = { grass, pines };
  cache.set(id, d);
  return d;
}

// smooth: curves through the midpoints, corners as control points (the path is not solid)
function strokeLine(g, pts, smooth = false) {
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  if (smooth) {
    for (let i = 1; i < pts.length - 1; i++) g.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
    g.lineTo(pts.at(-1)[0], pts.at(-1)[1]);
  } else for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); // the river: matches its solid circles
  g.stroke();
}

// river direction at a point (unit vector along the nearest segment)
function riverDir(river, x, y) {
  let best = Infinity, dir = [0, 1];
  for (let i = 1; i < river.length; i++) {
    const [ax, ay] = river[i - 1], [bx, by] = river[i];
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
    const k = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (L * L)));
    const d = Math.hypot(ax + dx * k - x, ay + dy * k - y);
    if (d < best) { best = d; dir = [dx / L, dy / L]; }
  }
  return dir;
}

function bridge(g, region, [x, y]) {
  const [dx, dy] = riverDir(region.river, x, y);
  const len = FIELD.riverWidth + 70, wid = FIELD.bridgeHalf * 1.3;
  g.save();
  g.translate(x, y);
  g.rotate(Math.atan2(dy, dx)); // local x along the river, y across it
  g.beginPath(); g.rect(-wid / 2 + 6, -len / 2 + 6, wid, len); g.fillStyle = 'rgba(0,0,0,.35)'; g.fill();
  g.beginPath(); g.rect(-wid / 2, -len / 2, wid, len); g.fillStyle = '#5a3d25'; g.fill();
  g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 1.5;
  for (let yy = -len / 2 + 9; yy < len / 2; yy += 10) { g.beginPath(); g.moveTo(-wid / 2, yy); g.lineTo(wid / 2, yy); g.stroke(); }
  g.fillStyle = 'rgba(255,220,170,.07)';
  for (let yy = -len / 2 + 2; yy < len / 2; yy += 10) g.fillRect(-wid / 2, yy, wid, 3);
  for (const s of [-1, 1]) { // rails & posts
    g.beginPath(); g.rect(s * wid / 2 - 4, -len / 2, 8, len); g.fillStyle = '#3e2816'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = OUT; g.stroke();
    for (const py of [-len / 2, 0, len / 2]) { g.beginPath(); g.arc(s * wid / 2, py, 6, 0, TAU); g.fillStyle = '#4a311c'; g.fill(); g.stroke(); }
  }
  g.restore();
}

function tree(g, s, t) {
  const r = s.r, v = s.v || 0;
  shadow(g, s.x + 4, s.y + r * 0.35, r * 1.15, r * 0.45);
  // trunk
  g.beginPath(); g.roundRect(s.x - r * 0.18, s.y - r * 0.5, r * 0.36, r * 0.85, 3);
  g.fillStyle = '#2e1f17'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = OUT; g.stroke();
  // canopy: three overlapping blobs, hue varies per tree, a slow sway
  const sway = Math.sin(t * 0.8 + s.x * 0.01) * 1.2;
  const base = v < 0.33 ? '#1f3a26' : v < 0.66 ? '#243b22' : '#2b3420';
  const cy = s.y - r * 0.95;
  const blobs = [[-r * 0.45, r * 0.15, r * 0.7], [r * 0.45, r * 0.12, r * 0.68], [0, -r * 0.3, r * 0.82]];
  g.beginPath();
  for (const [ox, oy, br] of blobs) { g.moveTo(s.x + ox + sway + br, cy + oy); g.arc(s.x + ox + sway, cy + oy, br, 0, TAU); }
  g.lineWidth = 4; g.strokeStyle = OUT; g.stroke(); // outline first, the fill hides the inner arcs
  g.fillStyle = base; g.fill();
  g.beginPath();
  for (const [ox, oy, br] of blobs) { g.moveTo(s.x + ox + sway + br * 0.6, cy + oy - br * 0.2); g.arc(s.x + ox + sway - br * 0.1, cy + oy - br * 0.2, br * 0.6, 0, TAU); }
  g.fillStyle = shade(base === '#1f3a26' ? '#2f5a39' : base === '#243b22' ? '#365c31' : '#465430', 1); g.globalAlpha = 0.55; g.fill(); g.globalAlpha = 1;
  if (v > 0.85) { // a few trees carry pale glowing berries
    g.fillStyle = 'rgba(200,170,255,.8)';
    for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(s.x + Math.cos(i * 1.7 + v * 9) * r * 0.6 + sway, cy + Math.sin(i * 2.3) * r * 0.4, 1.8, 0, TAU); g.fill(); }
  }
}

function rock(g, s) {
  const r = s.r;
  shadow(g, s.x + 2, s.y + r * 0.45, r * 1.05, r * 0.4);
  g.beginPath();
  g.moveTo(s.x - r, s.y + r * 0.3);
  g.quadraticCurveTo(s.x - r * 0.9, s.y - r * 0.7, s.x - r * 0.1, s.y - r * 0.8);
  g.quadraticCurveTo(s.x + r * 0.9, s.y - r * 0.8, s.x + r, s.y + r * 0.2);
  g.quadraticCurveTo(s.x, s.y + r * 0.7, s.x - r, s.y + r * 0.3);
  g.fillStyle = (s.v || 0) < 0.5 ? '#4a4a55' : '#55504a'; g.fill(); g.lineWidth = 1.8; g.strokeStyle = OUT; g.stroke();
  g.beginPath(); g.ellipse(s.x - r * 0.25, s.y - r * 0.4, r * 0.4, r * 0.15, -0.3, 0, TAU); g.fillStyle = 'rgba(255,255,255,.1)'; g.fill();
  if ((s.v || 0) > 0.6) { g.beginPath(); g.ellipse(s.x + r * 0.2, s.y - r * 0.55, r * 0.45, r * 0.18, 0.2, 0, TAU); g.fillStyle = 'rgba(80,130,70,.55)'; g.fill(); }
}

function stone(g, s, t) {
  shadow(g, s.x + 3, s.y + 10, 16, 6);
  g.beginPath(); g.roundRect(s.x - 12, s.y - 34, 24, 44, [10, 10, 3, 3]);
  g.fillStyle = '#4b4a5c'; g.fill(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke();
  g.beginPath(); g.roundRect(s.x - 8, s.y - 30, 6, 34, 3); g.fillStyle = 'rgba(255,255,255,.08)'; g.fill();
  // carved rune that glows faintly
  const a = 0.35 + Math.sin(t * 1.5 + s.x) * 0.15;
  g.strokeStyle = `rgba(150,140,255,${a.toFixed(2)})`; g.lineWidth = 1.6;
  g.beginPath(); g.moveTo(s.x, s.y - 24); g.lineTo(s.x, s.y - 8); g.moveTo(s.x - 5, s.y - 20); g.lineTo(s.x + 5, s.y - 12); g.stroke();
}

function ruinFloor(g, ru) {
  g.beginPath(); g.arc(ru.x, ru.y, ru.r + 14, 0, TAU);
  g.fillStyle = 'rgba(60,62,76,.42)'; g.fill();
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.2;
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; g.beginPath(); g.moveTo(ru.x + Math.cos(a) * 30, ru.y + Math.sin(a) * 30); g.lineTo(ru.x + Math.cos(a) * (ru.r + 12), ru.y + Math.sin(a) * (ru.r + 12)); g.stroke(); }
  for (const k of [0.3, 0.65]) { g.beginPath(); g.arc(ru.x, ru.y, ru.r * k + 14, 0, TAU); g.stroke(); }
  g.beginPath(); g.arc(ru.x, ru.y, ru.r + 14, 0, TAU); g.fillStyle = 'rgba(70,120,60,.18)'; g.fill();
}

function pine(g, p) {
  g.save(); g.translate(p.x, p.y); g.scale(p.s, p.s);
  g.beginPath(); g.moveTo(0, -80); g.lineTo(28, -14); g.lineTo(15, -14); g.lineTo(36, 22); g.lineTo(-36, 22); g.lineTo(-15, -14); g.lineTo(-28, -14); g.closePath();
  g.fillStyle = '#0c140f'; g.fill();
  g.restore();
}

function signpost(g, x, y, text, dir) {
  shadow(g, x, y + 4, 10, 3);
  g.beginPath(); g.rect(x - 3, y - 46, 6, 50); g.fillStyle = '#4a311c'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = OUT; g.stroke();
  g.font = '600 11px Barlow, system-ui, sans-serif';
  const w = g.measureText(text).width + 24;
  const bx = dir < 0 ? x - w + 14 : x - 14, by = y - 54;
  g.beginPath();
  if (dir < 0) { g.moveTo(bx, by + 9); g.lineTo(bx + 10, by); g.lineTo(bx + w, by); g.lineTo(bx + w, by + 18); g.lineTo(bx + 10, by + 18); }
  else { g.moveTo(bx, by); g.lineTo(bx + w - 10, by); g.lineTo(bx + w, by + 9); g.lineTo(bx + w - 10, by + 18); g.lineTo(bx, by + 18); }
  g.closePath(); g.fillStyle = '#6b4a2b'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = OUT; g.stroke();
  g.fillStyle = '#f3e2b8'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, bx + w / 2 + (dir < 0 ? 4 : -4), by + 9.5);
  g.textBaseline = 'alphabetic';
}

// Draws the region below the actors. rect: visible world rect { x0, y0, x1, y1 }.
export function drawField(g, game, ground, t, rect) {
  const map = game.fmap, region = map.region, theme = region.theme;
  const d = dressOf(map);
  const vis = (x, y, m) => x > rect.x0 - m && x < rect.x1 + m && y > rect.y0 - m && y < rect.y1 + m;
  // the world past the edge
  g.fillStyle = '#070b08';
  g.fillRect(rect.x0 - 10, rect.y0 - 10, rect.x1 - rect.x0 + 20, rect.y1 - rect.y0 + 20);
  for (const p of d.pines) if (p.y < 0 && vis(p.x, p.y, 120)) pine(g, p);
  // floor (only the visible part)
  const fx0 = Math.max(0, rect.x0), fy0 = Math.max(0, rect.y0), fx1 = Math.min(map.w, rect.x1), fy1 = Math.min(map.h, rect.y1);
  if (fx1 > fx0 && fy1 > fy0) { g.fillStyle = ground; g.fillRect(fx0, fy0, fx1 - fx0, fy1 - fy0); }
  for (const ru of region.ruins) if (vis(ru.x, ru.y, ru.r + 40)) ruinFloor(g, ru);
  // path: dark verge, dirt, worn ruts
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.lineWidth = FIELD.pathWidth + 16; g.strokeStyle = 'rgba(0,0,0,.25)'; strokeLine(g, region.path, true);
  g.lineWidth = FIELD.pathWidth; g.strokeStyle = theme.path; strokeLine(g, region.path, true);
  g.lineWidth = FIELD.pathWidth * 0.55; g.strokeStyle = 'rgba(255,220,170,.05)'; strokeLine(g, region.path, true);
  g.setLineDash([14, 22]); g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.18)'; strokeLine(g, region.path, true); g.setLineDash([]);
  // river: muddy banks, deep water, lighter middle, drifting glints
  g.lineWidth = FIELD.riverWidth + 26; g.strokeStyle = '#26241a'; strokeLine(g, region.river);
  g.lineWidth = FIELD.riverWidth + 8; g.strokeStyle = shade(theme.water, 0.7); strokeLine(g, region.river);
  g.lineWidth = FIELD.riverWidth - 6; g.strokeStyle = theme.water; strokeLine(g, region.river);
  g.lineWidth = FIELD.riverWidth * 0.45; g.strokeStyle = 'rgba(120,190,220,.12)'; strokeLine(g, region.river);
  g.setLineDash([18, 46]); g.lineDashOffset = -t * 30; g.lineWidth = 2; g.strokeStyle = 'rgba(190,230,255,.28)'; strokeLine(g, region.river);
  g.lineDashOffset = -t * 22 + 20; g.lineWidth = 1.5; g.strokeStyle = 'rgba(190,230,255,.16)';
  g.save(); g.translate(18, 0); strokeLine(g, region.river); g.restore();
  g.setLineDash([]); g.lineDashOffset = 0; g.lineCap = 'butt';
  for (const b of region.bridges) if (vis(b[0], b[1], 120)) bridge(g, region, b);
  // tufts & flowers
  for (const gr of d.grass) {
    if (!vis(gr.x, gr.y, 10)) continue;
    if (gr.k < 0.8) {
      g.strokeStyle = 'rgba(110,150,80,.5)'; g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(gr.x - 3 * gr.s, gr.y); g.lineTo(gr.x - 5 * gr.s, gr.y - 6 * gr.s); g.moveTo(gr.x, gr.y); g.lineTo(gr.x, gr.y - 8 * gr.s); g.moveTo(gr.x + 3 * gr.s, gr.y); g.lineTo(gr.x + 5 * gr.s, gr.y - 6 * gr.s); g.stroke();
    } else {
      g.fillStyle = gr.k < 0.9 ? 'rgba(220,200,255,.7)' : 'rgba(255,190,120,.7)';
      g.beginPath(); g.arc(gr.x, gr.y, 1.8 * gr.s, 0, TAU); g.fill();
    }
  }
  // signposts at the exits
  const from = TOWNS[region.from], to = TOWNS[region.to];
  if (vis(map.start.x, map.start.y, 200)) signpost(g, FIELD.exitZone + 40, map.start.y - 70, tf('Ke {name}', { name: from.name }), -1);
  if (vis(map.end.x, map.end.y, 200)) signpost(g, map.w - FIELD.exitZone - 40, map.end.y - 70, tf('Ke {name}', { name: to.name }), 1);
  // solids in y order (trees overlap what stands behind them)
  const list = [];
  for (let i = map.water; i < map.solids.length; i++) {
    const s = map.solids[i];
    if (vis(s.x, s.y, s.r * 2 + 30)) list.push(s);
  }
  list.sort((a, b) => a.y - b.y);
  for (const s of list) {
    if (s.kind === 'tree') tree(g, s, t);
    else if (s.kind === 'rock') rock(g, s);
    else if (s.kind === 'stone') stone(g, s, t);
  }
  for (const p of d.pines) if (p.y >= 0 && vis(p.x, p.y, 120)) pine(g, p);
  // soft darkening along the map edge
  for (const [x, y, w, h, gx0, gy0, gx1, gy1] of [
    [0, 0, map.w, 60, 0, 0, 0, 60], [0, map.h - 60, map.w, 60, 0, map.h, 0, map.h - 60],
    [0, 0, 60, map.h, 0, 0, 60, 0], [map.w - 60, 0, 60, map.h, map.w, 0, map.w - 60, 0],
  ]) {
    if (!vis(x + w / 2, y + h / 2, Math.max(w, h))) continue;
    const gr = g.createLinearGradient(gx0, gy0, gx1, gy1);
    gr.addColorStop(0, 'rgba(7,11,8,.85)'); gr.addColorStop(1, 'rgba(7,11,8,0)');
    g.fillStyle = gr; g.fillRect(x, y, w, h);
  }
}

// lights of the region itself: glowing ruin runes and exit lanterns
export function fieldDecorLights(game, t, out) {
  const map = game.fmap;
  for (const ru of map.region.ruins) out.push({ x: ru.x, y: ru.y, r: ru.r + 80, rgb: '150,140,255', tint: 0.035 + Math.sin(t * 1.3 + ru.x) * 0.01 });
  out.push({ x: FIELD.exitZone + 40, y: map.start.y - 90, r: 120, rgb: '255,190,110', tint: 0.08 });
  out.push({ x: map.w - FIELD.exitZone - 40, y: map.end.y - 90, r: 120, rgb: '255,190,110', tint: 0.08 });
}
