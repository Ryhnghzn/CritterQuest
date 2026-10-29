// The town map (spec §30), top-down: the walls, houses with their shop icon, features, the people
// outdoors, quest marks and the player. Full map (labels: true) or the corner minimap.
import { drawIcon } from '../art/sprites.js';
import { questMark } from './paint.js';
import { SERVICES, FEATURE_COLOR } from '../data/townmap.js';
import { tr } from '../i18n.js';

const TAU = Math.PI * 2;

function label(g, text, x, y, color, size) {
  g.font = `600 ${size}px Barlow, system-ui, sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 4; g.strokeStyle = 'rgba(10,8,20,.9)';
  g.strokeText(text, x, y); g.fillStyle = color; g.fillText(text, x, y);
  g.textBaseline = 'alphabetic';
}

// a small mark on the minimap, where the full-size "!" would cover the house
function tinyMark(g, x, y, mark) {
  g.font = '900 11px Barlow, system-ui, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 3; g.strokeStyle = 'rgba(30,18,6,.95)'; g.strokeText(mark, x, y);
  g.fillStyle = mark === '!' ? '#ffd24a' : '#ffe9a8'; g.fillText(mark, x, y);
  g.textBaseline = 'alphabetic';
}

// info: town/townmap.js townMapInfo; rect: { x, y, w, h }; player: playerSpot() or null.
// opts: { labels, t (seconds, for the pulse), ground (colour), focus (place / person id to ring) }
export function drawTownMap(g, info, rect, player, opts = {}) {
  const { labels = false, t = 0, ground = '#2a2430', focus = null } = opts;
  const pad = labels ? 16 : 4;
  const k = Math.min((rect.w - pad * 2) / info.w, (rect.h - pad * 2) / info.h);
  const ox = rect.x + (rect.w - info.w * k) / 2, oy = rect.y + (rect.h - info.h * k) / 2;
  const sx = (x) => ox + x * k, sy = (y) => oy + y * k;
  const pulse = (Math.sin(t * 4) + 1) / 2;
  g.save();
  g.fillStyle = '#07060c'; g.fillRect(rect.x, rect.y, rect.w, rect.h);
  g.fillStyle = ground; g.fillRect(ox, oy, info.w * k, info.h * k);
  const wall = Math.max(2, info.wall * k);
  g.lineWidth = wall; g.strokeStyle = '#4a3e36';
  g.strokeRect(ox + wall / 2, oy + wall / 2, info.w * k - wall, info.h * k - wall);

  // features under the houses
  for (const p of info.places) {
    if (p.kind === 'house') continue;
    const x = sx(p.x), y = sy(p.y), w = p.w * k, h = p.h * k;
    if (p.kind === 'gate') {
      g.fillStyle = '#120e14'; g.fillRect(x, y, w, h);
      g.lineWidth = labels ? 2 : 1; g.strokeStyle = '#c9a24a'; g.strokeRect(x, y, w, h);
      if (labels) label(g, tr('Gerbang'), x + w / 2, y + h / 2, '#e8cf8e', 11);
      continue;
    }
    g.fillStyle = FEATURE_COLOR[p.kind] || '#3a3240';
    if (p.kind === 'pond' || p.kind === 'oasis' || p.kind === 'bigtree' || p.kind === 'fire' || p.kind === 'well') {
      g.beginPath(); g.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, TAU); g.fill();
    } else g.fillRect(x, y, w, h);
  }

  // houses: shops show their icon (and name on the full map); homes are plain
  for (const p of info.places) {
    if (p.kind !== 'house') continue;
    const x = sx(p.x), y = sy(p.y), w = p.w * k, h = p.h * k;
    const shop = p.people.find((q) => SERVICES[q.role]);
    g.fillStyle = shop ? p.roof || '#4a3a33' : '#2a2430';
    g.fillRect(x, y, w, h);
    g.lineWidth = labels ? 1.5 : 1; g.strokeStyle = shop ? 'rgba(232,207,142,.55)' : 'rgba(255,255,255,.12)'; g.strokeRect(x, y, w, h);
    if (p.door) { g.fillStyle = '#e8cf8e'; g.fillRect(sx(p.door.x) - Math.max(1.5, 10 * k), y + h - Math.max(1.5, 3 * k), Math.max(3, 20 * k), Math.max(1.5, 3 * k)); }
    if (shop) {
      const s = Math.max(8, Math.min(34, Math.min(w, h) * 0.55));
      g.save(); g.translate(x + w / 2, y + h / 2 - (labels ? 6 : 0)); drawIcon(g, SERVICES[shop.role].icon, s); g.restore();
      if (labels && p.name) label(g, tr(p.name), x + w / 2, y + h / 2 + s / 2 + 4, '#f3e2b8', 11);
    }
    if (focus === p.id) { g.lineWidth = 2.5; g.strokeStyle = `rgba(255,233,168,${(0.5 + pulse * 0.5).toFixed(2)})`; g.strokeRect(x - 3, y - 3, w + 6, h + 6); }
  }

  // people outdoors: services with their icon, townsfolk as dots
  for (const n of info.people) {
    const x = sx(n.x), y = sy(n.y), svc = SERVICES[n.role];
    if (labels) {
      g.beginPath(); g.arc(x, y, svc ? 9 : 5, 0, TAU);
      g.fillStyle = svc ? 'rgba(30,24,60,.9)' : 'rgba(200,190,170,.75)'; g.fill();
      g.lineWidth = 1.2; g.strokeStyle = 'rgba(255,255,255,.4)'; g.stroke();
      if (svc) { g.save(); g.translate(x, y); drawIcon(g, svc.icon, 13); g.restore(); }
      if (svc || n.mark) label(g, n.name, x, y + 16, '#f3e2b8', 10);
    } else {
      g.beginPath(); g.arc(x, y, svc ? 2.4 : 1.6, 0, TAU); g.fillStyle = svc ? '#e8cf8e' : 'rgba(200,190,170,.7)'; g.fill();
    }
    if (focus === n.id) { g.beginPath(); g.arc(x, y, 14 + pulse * 4, 0, TAU); g.lineWidth = 2; g.strokeStyle = '#ffe9a8'; g.stroke(); }
  }

  // quest marks over houses and people, on top of everything
  for (const p of info.places) {
    if (!p.mark) continue;
    const x = sx(p.x + p.w / 2), y = sy(p.y);
    if (labels) questMark(g, x, y - 4, p.mark, t); else tinyMark(g, x, y + 2, p.mark);
  }
  for (const n of info.people) {
    if (!n.mark) continue;
    if (labels) questMark(g, sx(n.x), sy(n.y) - 20, n.mark, t); else tinyMark(g, sx(n.x), sy(n.y) - 6, n.mark);
  }

  if (player) {
    const px = sx(player.x), py = sy(player.y), r = labels ? 6 : 3;
    g.beginPath(); g.arc(px, py, r + 3 + pulse * (labels ? 6 : 3), 0, TAU); g.fillStyle = `rgba(143,255,192,${(0.35 - pulse * 0.25).toFixed(2)})`; g.fill();
    g.beginPath(); g.arc(px, py, r, 0, TAU); g.fillStyle = '#8fffc0'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = '#0a2014'; g.stroke();
    if (labels) label(g, player.inside ? tr('Kamu (di dalam)') : tr('Kamu'), px, py + 16, '#8fffc0', 12);
  }
  g.restore();
}
