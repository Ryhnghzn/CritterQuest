// Region map (spec §25.1, §25.5): the region drawn into a rectangle — ground,
// paths, rivers, lakes, bridges, groves, ruins and the towns at either end —
// under a fog of war that hides every cell not walked near yet. The full map
// shows the whole region; the minimap a window around the player. The static
// layer is cached per region and scale; each call only paints fog & markers.
import { tr } from '../i18n.js';
import { TOWNS, FIELD } from '../data/world.js';
import { dungeonById } from '../data/dungeons.js';
import { fogSize, fogAt } from '../meta/world.js';

const TAU = Math.PI * 2;
const statics = new Map(); // `${region}:${width}` → canvas of the whole region
let fogCanvas = null, fogKey = '';
const MAX_STATIC = 2400;   // px; larger scales are drawn from this one, upscaled

const LAKE = { forest: '#1b3a4a', ice: '#9cc6e6', desert: '#2f8a86', volcano: '#f97316', eclipse: '#3a1f5c' };
const DOT = { forest: '#0f2416', ice: '#173027', desert: '#3f6b3a', volcano: '#1c1513', eclipse: '#120b1c' };
const ROCK = { forest: '#3d3d46', ice: '#5b6878', desert: '#9a6a44', volcano: '#24201f', eclipse: '#2a2238' };

function line(g, pts, k) {
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x * k, y * k) : g.moveTo(x * k, y * k)));
  g.stroke();
}

function staticLayer(map, width) {
  const w = Math.max(1, Math.min(MAX_STATIC, Math.round(width)));
  const key = `${map.region.id}:${w}`;
  if (statics.has(key)) return statics.get(key);
  const c = document.createElement('canvas');
  c.width = w; c.height = Math.max(1, Math.round((w * map.h) / map.w));
  const g = c.getContext('2d');
  const k = c.width / map.w, region = map.region, theme = region.theme, biome = region.biome || 'forest';
  g.fillStyle = theme.ground[1]; g.fillRect(0, 0, c.width, c.height);
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = theme.water; g.lineWidth = Math.max(2, FIELD.riverWidth * k);
  for (const r of map.rivers) line(g, r, k);
  g.fillStyle = LAKE[biome] || theme.water;
  for (const l of map.lakes) { g.beginPath(); g.arc(l.x * k, l.y * k, Math.max(2, l.r * k), 0, TAU); g.fill(); }
  for (let i = 0; i < map.solids.length; i++) {
    const s = map.solids[i];
    if (s.kind === 'water' || s.kind === 'lake') continue;
    g.fillStyle = s.kind === 'tree' ? DOT[biome] : s.kind === 'rock' ? ROCK[biome] : '#5a5878';
    g.beginPath(); g.arc(s.x * k, s.y * k, Math.max(0.8, s.r * k * (s.kind === 'tree' ? 1.4 : 1)), 0, TAU); g.fill();
  }
  for (const [i, p] of map.paths.entries()) {
    g.strokeStyle = theme.path; g.lineWidth = Math.max(i ? 1.2 : 1.6, FIELD.pathWidth * k * 0.8); line(g, p, k);
    g.strokeStyle = 'rgba(255,230,180,.25)'; g.lineWidth = Math.max(0.8, FIELD.pathWidth * k * 0.25); line(g, p, k);
  }
  for (const ru of map.ruins) {
    g.strokeStyle = 'rgba(170,160,255,.7)'; g.lineWidth = Math.max(1, 10 * k);
    g.beginPath(); g.arc(ru.x * k, ru.y * k, Math.max(1.5, ru.r * k), 0, TAU); g.stroke();
  }
  g.fillStyle = '#8a6238';
  for (const [x, y] of map.bridges) { g.beginPath(); g.arc(x * k, y * k, Math.max(1.5, FIELD.bridgeHalf * k * 0.8), 0, TAU); g.fill(); }
  statics.set(key, c);
  return c;
}

// one pixel per fog cell, dark where unexplored; scaled up smoothly for soft edges
function fogLayer(map, fog) {
  const { cols, rows } = fogSize(map.region);
  if (!fogCanvas || fogCanvas.width !== cols || fogCanvas.height !== rows) {
    fogCanvas = document.createElement('canvas');
    fogCanvas.width = cols; fogCanvas.height = rows;
    fogKey = '';
  }
  // only repaint when the fog changed (cheap hash over the bytes)
  let h = 0;
  for (let i = 0; i < fog.length; i++) h = (Math.imul(h, 31) + fog[i]) | 0;
  const key = `${map.region.id}:${h}`;
  if (key === fogKey) return fogCanvas;
  fogKey = key;
  const fg = fogCanvas.getContext('2d');
  const img = fg.createImageData(cols, rows);
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const o = (cy * cols + cx) * 4;
      img.data[o] = 6; img.data[o + 1] = 6; img.data[o + 2] = 12;
      img.data[o + 3] = fogAt(fog, cols, cx, cy) ? 0 : 245;
    }
  }
  fg.putImageData(img, 0, 0);
  return fogCanvas;
}

function label(g, text, x, y, color, align = 'center', size = 13) {
  g.font = `600 ${size}px Barlow, system-ui, sans-serif`;
  g.textAlign = align; g.textBaseline = 'middle';
  g.lineWidth = 4; g.strokeStyle = 'rgba(10,8,20,.9)';
  g.strokeText(text, x, y); g.fillStyle = color; g.fillText(text, x, y);
  g.textBaseline = 'alphabetic';
}

function townMarker(g, x, y, name, side, labels) {
  g.beginPath(); g.arc(x, y, labels ? 7 : 3.5, 0, TAU);
  g.fillStyle = '#e6c27a'; g.fill(); g.lineWidth = labels ? 2 : 1; g.strokeStyle = '#2a1606'; g.stroke();
  if (labels) label(g, name, x + side * -12, y + 18, '#f3e2b8', side < 0 ? 'left' : 'right');
}

function gateIcon(g, x, y, gt, size) {
  const glow = dungeonById(gt.dungeon).theme.glow || ['200,130,255', '120,200,255'];
  g.beginPath(); g.ellipse(x, y, size * 0.7, size, 0, 0, TAU);
  g.fillStyle = `rgb(${glow[1]})`; g.fill();
  g.lineWidth = Math.max(1, size * 0.35); g.strokeStyle = '#2c2a35'; g.stroke();
  g.beginPath(); g.ellipse(x, y, size * 0.32, size * 0.5, 0, 0, TAU); g.fillStyle = `rgba(${glow[0]},.9)`; g.fill();
}

// g: 2D context in CSS/device px (whatever rect is in); map: run/fieldmap.js map;
// fog: Uint8Array or null (all revealed); rect: { x, y, w, h }; player: { x, y } or null.
// opts: labels (town & gate names, title), title: false hides the title, t: seconds (pulses),
//   window: world width of a window centred on the player (minimap), gates: [{ dungeon, x, y, found }],
//   treasures: [{ x, y, state, lord }] — shown where the fog is gone;
//   target: { x, y } | null — shown even under the fog; at the window edge as an arrow when outside.
//   quest: { kind: 'hint' | 'gate' | 'town' | 'spot' | 'hidden', x, y, r? } | null — the tracked quest's goal (spec §26.3);
//   hidden: [{ x, y, hut, mark, name }] — homes in the wild, shown where the fog is gone.
// a small arrow on the rect's edge pointing at (x, y) outside it
function edgeArrow(g, ox, oy, w, h, x, y, color) {
  const cx = ox + w / 2, cy = oy + h / 2, a = Math.atan2(y - cy, x - cx);
  const s = Math.min((w / 2 - 8) / Math.abs(Math.cos(a) || 1e-6), (h / 2 - 8) / Math.abs(Math.sin(a) || 1e-6));
  g.save(); g.translate(cx + Math.cos(a) * s, cy + Math.sin(a) * s); g.rotate(a);
  g.beginPath(); g.moveTo(6, 0); g.lineTo(-5, -5); g.lineTo(-5, 5); g.closePath();
  g.fillStyle = color; g.fill(); g.lineWidth = 1; g.strokeStyle = '#2a1606'; g.stroke();
  g.restore();
}

export function drawRegionMap(g, map, fog, rect, player, opts = {}) {
  const region = map.region;
  // world → rect transform: the whole region fitted, or a window around the player
  let k, wx0, wy0, ox, oy, w, h;
  if (opts.window) {
    k = rect.w / Math.min(opts.window, map.w);
    const ww = rect.w / k, wh = rect.h / k;
    const px = player ? player.x : map.w / 2, py = player ? player.y : map.h / 2;
    wx0 = Math.max(0, Math.min(map.w - ww, px - ww / 2));
    wy0 = wh >= map.h ? (map.h - wh) / 2 : Math.max(0, Math.min(map.h - wh, py - wh / 2));
    ox = rect.x; oy = rect.y; w = rect.w; h = rect.h;
  } else {
    k = Math.min(rect.w / map.w, rect.h / map.h);
    wx0 = 0; wy0 = 0;
    w = map.w * k; h = map.h * k;
    ox = rect.x + (rect.w - w) / 2; oy = rect.y + (rect.h - h) / 2;
  }
  const sx = (x) => ox + (x - wx0) * k, sy = (y) => oy + (y - wy0) * k;
  const full = map.w * k, fullH = map.h * k;
  g.save();
  g.beginPath(); g.rect(ox, oy, w, h); g.clip();
  g.fillStyle = '#07060c'; g.fillRect(ox, oy, w, h);
  g.imageSmoothingEnabled = true;
  g.drawImage(staticLayer(map, full), sx(0), sy(0), full, fullH);
  if (fog) g.drawImage(fogLayer(map, fog), sx(0), sy(0), full, fullH);
  const pulse = 0.5 + 0.5 * Math.sin((opts.t ?? performance.now() / 1000) * 5);
  townMarker(g, sx(0) + 6, sy(map.start.y), TOWNS[region.from].name, -1, opts.labels);
  if (region.to) townMarker(g, sx(map.w) - 6, sy(map.end.y), TOWNS[region.to].name, 1, opts.labels);
  // dungeon gates already found
  for (const gt of opts.gates || []) {
    if (!gt.found) continue;
    const x = sx(gt.x), y = sy(gt.y);
    if (x < ox - 10 || x > ox + w + 10 || y < oy - 10 || y > oy + h + 10) continue;
    gateIcon(g, x, y, gt, opts.labels ? 7 : 4);
    if (opts.labels) { const d = dungeonById(gt.dungeon); label(g, d.short || d.name, x, y - 16, '#e9d8ff', 'center', 12); }
  }
  // treasure chests (spec §25.3): once their spot is uncovered; opened ones dimmed
  const { cols } = fogSize(region);
  for (const tr of opts.treasures || []) {
    if (fog && !fogAt(fog, cols, Math.floor(tr.x / FIELD.fogCell), Math.floor(tr.y / FIELD.fogCell))) continue;
    const x = sx(tr.x), y = sy(tr.y);
    if (x < ox - 10 || x > ox + w + 10 || y < oy - 10 || y > oy + h + 10) continue;
    const k = opts.labels ? 1 : 0.6, open = tr.state === 'open';
    g.globalAlpha = open ? 0.45 : 1;
    g.beginPath(); g.roundRect(x - 6 * k, y - 4 * k, 12 * k, 9 * k, 2); g.fillStyle = open ? '#6b5a48' : tr.lord ? '#ff8a3c' : '#e6c27a'; g.fill();
    g.lineWidth = 1.2; g.strokeStyle = '#2a1606'; g.stroke();
    g.beginPath(); g.moveTo(x - 6 * k, y); g.lineTo(x + 6 * k, y); g.stroke();
    g.globalAlpha = 1;
  }
  // hidden homes (spec §26.5): once their spot is uncovered, with their quest mark
  for (const hd of opts.hidden || []) {
    if (fog && !fogAt(fog, cols, Math.floor(hd.x / FIELD.fogCell), Math.floor(hd.y / FIELD.fogCell))) continue;
    const x = sx(hd.x), y = sy(hd.y);
    if (x < ox - 10 || x > ox + w + 10 || y < oy - 10 || y > oy + h + 10) continue;
    const k = opts.labels ? 1 : 0.65;
    g.beginPath(); g.moveTo(x - 7 * k, y); g.lineTo(x - 7 * k, y - 7 * k); g.lineTo(x, y - 13 * k); g.lineTo(x + 7 * k, y - 7 * k); g.lineTo(x + 7 * k, y); g.closePath();
    g.fillStyle = hd.hut ? '#c89a6a' : '#9ab0c8'; g.fill(); g.lineWidth = 1.2; g.strokeStyle = '#2a1606'; g.stroke();
    if (hd.mark) { g.font = `900 ${opts.labels ? 13 : 9}px Barlow, system-ui, sans-serif`; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = '#2a1606'; g.strokeText(hd.mark, x, y - 15 * k); g.fillStyle = '#ffd24a'; g.fillText(hd.mark, x, y - 15 * k); }
    if (opts.labels) label(g, hd.name, x, y + 13, '#f3e2b8', 'center', 11);
  }
  // quest target (spec §26.3): a hint circle around a gate not found yet, else a "!" pin
  const q = opts.quest;
  if (q) {
    const x = sx(q.x), y = sy(q.y);
    if (q.kind === 'hint') {
      g.save();
      g.beginPath(); g.arc(x, y, q.r * k, 0, TAU);
      g.fillStyle = 'rgba(255,210,74,.08)'; g.fill();
      g.setLineDash([5, 4]); g.lineWidth = 1.5; g.strokeStyle = `rgba(255,210,74,${(0.55 + pulse * 0.3).toFixed(2)})`; g.stroke();
      g.restore();
    }
    const inside = x >= ox + 8 && x <= ox + w - 8 && y >= oy + 8 && y <= oy + h - 8;
    if (q.kind !== 'hint' && inside) {
      const r = opts.labels ? 9 : 6;
      g.beginPath(); g.arc(x, y, r + pulse * 4, 0, TAU); g.fillStyle = 'rgba(255,210,74,.25)'; g.fill();
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = '#ffd24a'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = '#2a1606'; g.stroke();
      g.font = `900 ${opts.labels ? 12 : 9}px Barlow, system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#2a1606'; g.fillText('!', x, y + 0.5); g.textBaseline = 'alphabetic';
    } else if (!inside && !(q.kind === 'hint' && Math.hypot(x - (ox + w / 2), y - (oy + h / 2)) < q.r * k)) edgeArrow(g, ox, oy, w, h, x, y, '#ffd24a');
  }
  // expedition target: always shown, even under the fog
  if (opts.target) {
    let x = sx(opts.target.x), y = sy(opts.target.y);
    if (x >= ox + 6 && x <= ox + w - 6 && y >= oy + 6 && y <= oy + h - 6) {
      g.beginPath(); g.arc(x, y, (opts.labels ? 9 : 5) + pulse * (opts.labels ? 7 : 4), 0, TAU);
      g.strokeStyle = `rgba(230,194,122,${(0.8 - pulse * 0.6).toFixed(2)})`; g.lineWidth = 2; g.stroke();
      g.beginPath(); g.arc(x, y, opts.labels ? 5 : 3, 0, TAU); g.fillStyle = '#e6c27a'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = '#2a1606'; g.stroke();
    } else { // outside the window: an arrow on the edge pointing at it
      const cx = ox + w / 2, cy = oy + h / 2, a = Math.atan2(y - cy, x - cx);
      const s = Math.min((w / 2 - 8) / Math.abs(Math.cos(a) || 1e-6), (h / 2 - 8) / Math.abs(Math.sin(a) || 1e-6));
      x = cx + Math.cos(a) * s; y = cy + Math.sin(a) * s;
      g.save(); g.translate(x, y); g.rotate(a);
      g.beginPath(); g.moveTo(6, 0); g.lineTo(-5, -5); g.lineTo(-5, 5); g.closePath();
      g.fillStyle = '#e6c27a'; g.fill(); g.lineWidth = 1; g.strokeStyle = '#2a1606'; g.stroke();
      g.restore();
    }
  }
  if (opts.labels && opts.title !== false) label(g, `${region.name} · LV ${region.levels[0]}–${region.levels[1]}`, ox + w / 2, oy + 18, '#f3e2b8', 'center', 16);
  if (player) {
    const px = sx(player.x), py = sy(player.y), r = opts.labels ? 6 : 3;
    g.beginPath(); g.arc(px, py, r + 3 + pulse * (opts.labels ? 6 : 3), 0, TAU); g.fillStyle = `rgba(143,255,192,${(0.35 - pulse * 0.25).toFixed(2)})`; g.fill();
    g.beginPath(); g.arc(px, py, r, 0, TAU); g.fillStyle = '#8fffc0'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = '#0a2014'; g.stroke();
    if (opts.labels) label(g, tr('Kamu'), px, py - 14, '#8fffc0', 'center', 12);
  }
  g.restore();
  g.strokeStyle = 'rgba(230,194,122,.5)'; g.lineWidth = 1; g.strokeRect(ox + 0.5, oy + 0.5, w - 1, h - 1);
}
