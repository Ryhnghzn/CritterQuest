// Region map (spec §25.1): the whole region scaled into a rectangle — ground,
// path, river, bridges, groves, ruins and the towns at either end — under a
// fog of war that hides every cell not walked near yet. The static layer is
// cached per region and size; each call only paints the fog and the player.
import { tr } from '../i18n.js';
import { TOWNS, FIELD } from '../data/world.js';
import { fogSize, fogAt } from '../meta/world.js';

const TAU = Math.PI * 2;
const statics = new Map(); // `${region}:${w}x${h}` → canvas
let fogCanvas = null;

function fit(map, rect) {
  const k = Math.min(rect.w / map.w, rect.h / map.h);
  return { k, ox: rect.x + (rect.w - map.w * k) / 2, oy: rect.y + (rect.h - map.h * k) / 2 };
}

function line(g, pts, k) {
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x * k, y * k) : g.moveTo(x * k, y * k)));
  g.stroke();
}

function staticLayer(map, w, h) {
  const key = `${map.region.id}:${w}x${h}`;
  if (statics.has(key)) return statics.get(key);
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  const g = c.getContext('2d');
  const k = c.width / map.w, region = map.region, theme = region.theme;
  g.fillStyle = theme.ground[1]; g.fillRect(0, 0, c.width, c.height);
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = theme.water; g.lineWidth = Math.max(2, FIELD.riverWidth * k); line(g, region.river, k);
  g.strokeStyle = theme.path; g.lineWidth = Math.max(1.5, FIELD.pathWidth * k * 0.8); line(g, region.path, k);
  g.strokeStyle = 'rgba(255,230,180,.25)'; g.lineWidth = Math.max(1, FIELD.pathWidth * k * 0.25); line(g, region.path, k);
  for (let i = map.water; i < map.solids.length; i++) {
    const s = map.solids[i];
    g.fillStyle = s.kind === 'tree' ? '#0f2416' : s.kind === 'rock' ? '#3d3d46' : '#5a5878';
    g.beginPath(); g.arc(s.x * k, s.y * k, Math.max(0.8, s.r * k * (s.kind === 'tree' ? 1.4 : 1)), 0, TAU); g.fill();
  }
  for (const ru of region.ruins) {
    g.strokeStyle = 'rgba(170,160,255,.7)'; g.lineWidth = Math.max(1, 10 * k);
    g.beginPath(); g.arc(ru.x * k, ru.y * k, ru.r * k, 0, TAU); g.stroke();
  }
  for (const [x, y] of region.bridges) {
    g.fillStyle = '#8a6238';
    g.beginPath(); g.arc(x * k, y * k, Math.max(1.5, FIELD.bridgeHalf * k * 0.8), 0, TAU); g.fill();
  }
  statics.set(key, c);
  return c;
}

// one pixel per fog cell, dark where unexplored; scaled up smoothly for soft edges
function fogLayer(map, fog) {
  const { cols, rows } = fogSize(map.region);
  if (!fogCanvas || fogCanvas.width !== cols || fogCanvas.height !== rows) {
    fogCanvas = document.createElement('canvas');
    fogCanvas.width = cols; fogCanvas.height = rows;
  }
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

function marker(g, x, y, name, side, labels) {
  g.beginPath(); g.arc(x, y, labels ? 7 : 3.5, 0, TAU);
  g.fillStyle = '#e6c27a'; g.fill(); g.lineWidth = labels ? 2 : 1; g.strokeStyle = '#2a1606'; g.stroke();
  if (!labels) return;
  g.font = '600 13px Barlow, system-ui, sans-serif';
  g.textAlign = side < 0 ? 'left' : 'right'; g.textBaseline = 'middle';
  g.lineWidth = 4; g.strokeStyle = 'rgba(10,8,20,.9)';
  const tx = x + side * -12;
  g.strokeText(name, tx, y + 18); g.fillStyle = '#f3e2b8'; g.fillText(name, tx, y + 18); // below: the player's tag sits above
  g.textBaseline = 'alphabetic';
}

// g: 2D context in CSS/device px (whatever rect is in); map: run/fieldmap.js map;
// fog: Uint8Array or null (all revealed); rect: { x, y, w, h }; player: { x, y } or null;
// opts: { labels: bool (town names, region title), title: false hides the title, t: seconds for the pulse }
export function drawRegionMap(g, map, fog, rect, player, opts = {}) {
  const { k, ox, oy } = fit(map, rect);
  const w = map.w * k, h = map.h * k;
  g.save();
  g.drawImage(staticLayer(map, w, h), ox, oy, w, h);
  if (fog) {
    g.imageSmoothingEnabled = true;
    g.drawImage(fogLayer(map, fog), ox, oy, w, h);
  }
  g.strokeStyle = 'rgba(230,194,122,.5)'; g.lineWidth = 1; g.strokeRect(ox + 0.5, oy + 0.5, w - 1, h - 1);
  const region = map.region;
  marker(g, ox + 6, oy + map.start.y * k, TOWNS[region.from].name, -1, opts.labels);
  marker(g, ox + w - 6, oy + map.end.y * k, TOWNS[region.to].name, 1, opts.labels);
  if (opts.labels && opts.title !== false) {
    g.font = '700 16px Barlow, system-ui, sans-serif'; g.textAlign = 'center';
    g.lineWidth = 4; g.strokeStyle = 'rgba(10,8,20,.9)';
    const title = `${region.name} · LV ${region.levels[0]}–${region.levels[1]}`;
    g.strokeText(title, ox + w / 2, oy + 20); g.fillStyle = '#f3e2b8'; g.fillText(title, ox + w / 2, oy + 20);
  }
  if (player) {
    const px = ox + player.x * k, py = oy + player.y * k;
    const pulse = 0.5 + 0.5 * Math.sin((opts.t || 0) * 5);
    const r = opts.labels ? 6 : 3;
    g.beginPath(); g.arc(px, py, r + 3 + pulse * (opts.labels ? 6 : 3), 0, TAU); g.fillStyle = `rgba(143,255,192,${(0.35 - pulse * 0.25).toFixed(2)})`; g.fill();
    g.beginPath(); g.arc(px, py, r, 0, TAU); g.fillStyle = '#8fffc0'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = '#0a2014'; g.stroke();
    if (opts.labels) {
      g.font = '600 12px Barlow, system-ui, sans-serif'; g.textAlign = 'center';
      g.lineWidth = 3; g.strokeStyle = 'rgba(10,8,20,.9)';
      const you = tr('Kamu');
      g.strokeText(you, px, py - 12); g.fillStyle = '#8fffc0'; g.fillText(you, px, py - 12);
    }
  }
  g.restore();
}
