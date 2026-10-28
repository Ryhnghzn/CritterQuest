// Hidden homes and quest places in the regions (spec §26.5): a cabin / tent / stone hut
// in the biome's style with its keeper at the door, and the glowing places a quest sends
// you to (rune stones, fallen stars, tomb pillars, eternal flames). World units, (x, y) =
// the ground in front of the door.
import { TAU, ink, lin, shadow, actor, tag } from './paint.js';
import { OUT } from '../art/sprites.js';

const STYLE = {
  forest: { wall: '#6b4a2e', wall2: '#4a321e', roof: '#2f4a2a', roof2: '#1f321c', trim: '#8a6a3a' },
  ice: { wall: '#5a4a3e', wall2: '#3e322a', roof: '#e8f2ff', roof2: '#a8bcd6', trim: '#7a8aa0' },
  desert: { wall: '#d6b07a', wall2: '#a8824e', roof: '#b0442e', roof2: '#7a2c1e', trim: '#f0d8a0' },
  volcano: { wall: '#3a3030', wall2: '#221c1c', roof: '#2a2222', roof2: '#161212', trim: '#ff7a2a' },
};

function cabin(g, x, y, s, t, snow) {
  shadow(g, x, y + 2, 82, 18);
  // log walls
  g.beginPath(); g.rect(x - 60, y - 70, 120, 70); ink(g, lin(g, y - 70, y, s.wall, s.wall2), 2);
  g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1.2;
  for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(x - 60, y - 70 + i * 14); g.lineTo(x + 60, y - 70 + i * 14); g.stroke(); }
  // door & lit window
  g.beginPath(); g.roundRect(x - 13, y - 40, 26, 40, [10, 10, 0, 0]); ink(g, '#2a1a10', 1.6);
  g.beginPath(); g.arc(x + 7, y - 20, 1.8, 0, TAU); g.fillStyle = '#e6c27a'; g.fill();
  const flick = 0.85 + Math.sin(t * 7 + x) * 0.08;
  g.beginPath(); g.rect(x + 26, y - 52, 20, 16); ink(g, `rgba(255,${Math.round(190 * flick)},110,.95)`, 1.6);
  g.beginPath(); g.moveTo(x + 36, y - 52); g.lineTo(x + 36, y - 36); g.moveTo(x + 26, y - 44); g.lineTo(x + 46, y - 44); g.strokeStyle = OUT; g.lineWidth = 1.4; g.stroke();
  // chimney + smoke
  g.beginPath(); g.rect(x - 44, y - 118, 14, 30); ink(g, '#4a4040', 1.6);
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.4 + i / 3) % 1;
    g.beginPath(); g.arc(x - 37 + Math.sin(t + i) * 6 * k, y - 124 - k * 50, 5 + k * 9, 0, TAU);
    g.fillStyle = `rgba(200,200,210,${(0.28 * (1 - k)).toFixed(2)})`; g.fill();
  }
  // roof
  g.beginPath(); g.moveTo(x - 74, y - 64); g.lineTo(x, y - 116); g.lineTo(x + 74, y - 64); g.closePath();
  ink(g, lin(g, y - 116, y - 64, s.roof, s.roof2), 2);
  if (snow) {
    for (let i = -3; i <= 3; i++) {
      g.beginPath(); g.moveTo(x + i * 18 - 4, y - 64); g.lineTo(x + i * 18, y - 52 - (i % 2 ? 0 : 5)); g.lineTo(x + i * 18 + 4, y - 64); g.closePath();
      g.fillStyle = 'rgba(210,235,255,.85)'; g.fill();
    }
  } else {
    g.fillStyle = 'rgba(120,170,90,.35)'; // moss
    for (const [dx, dy, r] of [[-30, -76, 10], [18, -90, 8], [40, -72, 9]]) { g.beginPath(); g.arc(x + dx, y + dy, r, 0, TAU); g.fill(); }
  }
  // firewood
  for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(x - 46 + i * 9, y - 6 - (i === 1 ? 8 : 0), 6, 6, 0, 0, TAU); ink(g, '#8a6a3a', 1.2); }
}

function tent(g, x, y, s, t) {
  shadow(g, x, y + 2, 84, 18);
  g.beginPath(); g.moveTo(x - 76, y); g.quadraticCurveTo(x - 40, y - 60, x, y - 104); g.quadraticCurveTo(x + 40, y - 60, x + 76, y); g.closePath();
  ink(g, lin(g, y - 104, y, s.wall, s.wall2), 2);
  g.save(); g.clip();
  g.fillStyle = s.roof;
  for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(x + i * 26, y); g.lineTo(x + i * 6, y - 104); g.lineTo(x + i * 6 + 6, y - 104); g.lineTo(x + i * 26 + 12, y); g.fill(); }
  g.restore();
  // open flap
  g.beginPath(); g.moveTo(x - 20, y); g.lineTo(x, y - 54); g.lineTo(x + 20, y); g.closePath(); ink(g, '#2a1a10', 1.6);
  g.beginPath(); g.moveTo(x, y - 54); g.lineTo(x + 30, y); g.lineTo(x + 20, y); g.closePath(); ink(g, s.trim, 1.4);
  // pole & pennant
  g.beginPath(); g.moveTo(x, y - 104); g.lineTo(x, y - 128); g.strokeStyle = OUT; g.lineWidth = 2.4; g.stroke();
  g.beginPath(); g.moveTo(x, y - 128); g.lineTo(x + 18 + Math.sin(t * 4) * 3, y - 122); g.lineTo(x, y - 116); g.closePath(); ink(g, s.roof, 1.2);
  // water jars
  for (const dx of [-54, -42]) { g.beginPath(); g.ellipse(x + dx, y - 9, 7, 10, 0, 0, TAU); ink(g, '#b06a3a', 1.4); }
}

function stoneHut(g, x, y, s, t) {
  shadow(g, x, y + 2, 80, 18);
  g.beginPath(); g.moveTo(x - 64, y); g.lineTo(x - 64, y - 54); g.quadraticCurveTo(x, y - 120, x + 64, y - 54); g.lineTo(x + 64, y); g.closePath();
  ink(g, lin(g, y - 110, y, s.wall, s.wall2), 2);
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.2;
  for (const [dx, dy, w] of [[-50, -30, 26], [-10, -50, 30], [24, -24, 28], [-36, -70, 22], [14, -84, 20]]) { g.beginPath(); g.roundRect(x + dx, y + dy, w, 14, 4); g.stroke(); }
  const glow = 0.7 + Math.sin(t * 5 + x) * 0.2;
  g.beginPath(); g.roundRect(x - 14, y - 44, 28, 44, [12, 12, 0, 0]); ink(g, `rgba(255,${Math.round(110 + 60 * glow)},40,.95)`, 1.8);
  // lava cracks
  g.strokeStyle = `rgba(255,120,40,${(0.5 * glow).toFixed(2)})`; g.lineWidth = 2;
  g.beginPath(); g.moveTo(x - 60, y - 10); g.lineTo(x - 44, y - 22); g.lineTo(x - 36, y - 14); g.moveTo(x + 40, y - 60); g.lineTo(x + 52, y - 44); g.stroke();
  // anvil
  g.beginPath(); g.moveTo(x + 40, y - 4); g.lineTo(x + 70, y - 4); g.lineTo(x + 66, y - 14); g.lineTo(x + 44, y - 14); g.closePath(); ink(g, '#4a4a52', 1.4);
}

// a person with no home: a bundle and a small fire (or nothing for a child)
function camp(g, h, x, y, t) {
  if (h.scale && h.scale < 1) return;
  g.beginPath(); g.ellipse(x - 30, y - 8, 14, 10, 0, 0, TAU); ink(g, '#6a5040', 1.4);
  g.beginPath(); g.moveTo(x - 38, y - 14); g.lineTo(x - 22, y - 2); g.strokeStyle = '#3a2a20'; g.lineWidth = 2; g.stroke();
}

// keeper standing at the door; mark: '!' / '?' over the badge
export function drawHideout(g, h, t, biome, near) {
  const s = STYLE[biome] || STYLE.forest, { x, y } = h;
  if (h.hut) {
    if (biome === 'desert') tent(g, x, y, s, t);
    else if (biome === 'volcano') stoneHut(g, x, y, s, t);
    else cabin(g, x, y, s, t, biome === 'ice');
  } else camp(g, h, x, y, t);
  const px = h.hut ? x + 40 : x, py = y + 16;
  shadow(g, px, py + 2, 12, 4);
  actor(g, px, py, null, { ...h.look, outfit: h.outfit }, { t: t + x, moving: 0, walk: 0 }, -1, h.scale || 1);
  tag(g, { ...h, role: 'talk' }, px, py, t, near, h.mark);
}

const SPOT_LOOK = { stone: 'rune', star: 'star', pillar: 'pillar', flame: 'flame', shell: 'shell', camel: 'camel' };

// A place a quest sends you to, until it is found.
export function drawQuestSpot(g, sp, t) {
  const { x, y } = sp, kind = SPOT_LOOK[sp.spot.replace(/\d+$/, '')] || 'rune';
  const pulse = 0.5 + 0.5 * Math.sin(t * 3 + x);
  g.save(); g.translate(x, y + 6); g.scale(1, 0.4);
  g.beginPath(); g.arc(0, 0, 60 + pulse * 10, 0, TAU); g.strokeStyle = `rgba(255,210,74,${(0.35 + pulse * 0.3).toFixed(2)})`; g.lineWidth = 4; g.stroke();
  g.restore();
  shadow(g, x, y + 4, 26, 8);
  if (kind === 'rune') {
    g.beginPath(); g.moveTo(x - 20, y); g.lineTo(x - 16, y - 58); g.quadraticCurveTo(x, y - 70, x + 16, y - 58); g.lineTo(x + 20, y); g.closePath(); ink(g, lin(g, y - 70, y, '#6a7a6a', '#3a463a'), 2);
    g.strokeStyle = `rgba(150,255,190,${(0.5 + pulse * 0.4).toFixed(2)})`; g.lineWidth = 2;
    g.beginPath(); g.moveTo(x - 6, y - 48); g.lineTo(x + 6, y - 38); g.lineTo(x - 6, y - 28); g.moveTo(x, y - 52); g.lineTo(x, y - 18); g.stroke();
  } else if (kind === 'star') {
    g.beginPath(); g.ellipse(x, y - 4, 26, 9, 0, 0, TAU); ink(g, 'rgba(120,140,170,.8)', 1.4);
    g.save(); g.translate(x, y - 22 - pulse * 4); g.rotate(t * 0.6);
    g.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 7 : 17, a = (i / 10) * TAU; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath();
    ink(g, '#fff2b0', 1.6); g.restore();
  } else if (kind === 'pillar') {
    g.beginPath(); g.moveTo(x - 14, y); g.lineTo(x - 10, y - 74); g.lineTo(x, y - 86); g.lineTo(x + 10, y - 74); g.lineTo(x + 14, y); g.closePath(); ink(g, lin(g, y - 86, y, '#e0c088', '#9a7a48'), 2);
    g.strokeStyle = `rgba(80,220,210,${(0.5 + pulse * 0.4).toFixed(2)})`; g.lineWidth = 2;
    for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(x, y - 60 + i * 18, 4, 0, TAU); g.stroke(); }
    g.beginPath(); g.ellipse(x, y, 30, 8, 0, 0, TAU); g.fillStyle = 'rgba(214,176,122,.8)'; g.fill();
  } else if (kind === 'flame') {
    g.beginPath(); g.moveTo(x - 22, y - 20); g.lineTo(x + 22, y - 20); g.lineTo(x + 14, y); g.lineTo(x - 14, y); g.closePath(); ink(g, '#3a3434', 1.8);
    const f = 0.5 + 0.3 * pulse;
    g.beginPath(); g.moveTo(x - 12, y - 20); g.quadraticCurveTo(x - 10, y - 44 * f - 10, x, y - 60 * f - 6); g.quadraticCurveTo(x + 10, y - 44 * f - 10, x + 12, y - 20); g.closePath();
    g.fillStyle = 'rgba(255,140,50,.75)'; g.fill();
  } else if (kind === 'shell') {
    g.beginPath(); g.moveTo(x - 16, y); g.quadraticCurveTo(x, y - 34, x + 16, y); g.closePath(); ink(g, '#ffd6e8', 1.6);
    g.strokeStyle = 'rgba(200,120,160,.7)'; g.lineWidth = 1.2;
    for (const dx of [-8, 0, 8]) { g.beginPath(); g.moveTo(x, y - 22); g.lineTo(x + dx, y); g.stroke(); }
  } else { // camel, resting
    g.beginPath(); g.ellipse(x, y - 16, 30, 16, 0, 0, TAU); ink(g, '#c8925a', 1.8);
    g.beginPath(); g.arc(x - 4, y - 32, 10, 0, TAU); ink(g, '#c8925a', 1.6);
    g.beginPath(); g.moveTo(x + 24, y - 22); g.quadraticCurveTo(x + 40, y - 40, x + 44, y - 50); g.lineWidth = 7; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 5; g.strokeStyle = '#c8925a'; g.stroke();
    g.beginPath(); g.ellipse(x + 48, y - 52, 9, 6, -0.3, 0, TAU); ink(g, '#c8925a', 1.4);
  }
}

// warm light from windows and a gold glow on quest places
export function hideoutLights(game, t, out, vis) {
  for (const h of game.hidden || []) if (h.hut && vis(h.x, h.y, 260)) out.push({ x: h.x + 20, y: h.y - 40, r: 150 + Math.sin(t * 6 + h.x) * 6, rgb: '255,190,110', tint: 0.12 });
  for (const s of game.questSpots || []) if (vis(s.x, s.y, 200)) out.push({ x: s.x, y: s.y - 30, r: 130 + Math.sin(t * 3 + s.x) * 12, rgb: '255,210,74', tint: 0.16 });
}
