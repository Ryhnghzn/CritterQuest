// Drawing a cutscene (spec §44) on the small pixel stage (CUTSCENE.w × h): a painted backdrop
// with parallax layers, the actors (the game's own anime heroes, townsfolk and bosses, run
// through the same pixel filter as in the game), effects, cinema bars and the fade. Text
// (lines, titles) is DOM in ui/cutscene.js so it stays sharp.
import { CUTSCENE } from '../data/scenes.js';
import { LOOK } from '../data/look.js';
import { drawDoll } from '../art/doll.js';
import { drawBoss } from '../art/bosses/index.js';
import { MONSTER_ART } from '../art/monsters.js';
import { ENEMIES } from '../data/enemies.js';
import { dungeonById } from '../data/dungeons.js';
import { pixelateCanvas } from '../render3d/pixelate.js';
import { shakeOf } from '../run/cutscene.js';

const TAU = Math.PI * 2;
const DOLL = 0.82;

// a stable 0..1 from a number (silhouettes that do not flicker)
const h01 = (n) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

// sky, far layer, near layer, ground; the light in the sky (moon / sun / eclipse)
const LOOKS = {
  forest: { sky: ['#07100f', '#1a2c26'], far: '#122019', near: '#0a140e', ground: ['#1d2a1c', '#121a12'], orb: 'moon', far2: 'hills', near2: 'pines' },
  ice: { sky: ['#0a1020', '#3a4a66'], far: '#2a3448', near: '#1a2232', ground: ['#8a9ab4', '#5a6a84'], orb: 'moon', far2: 'peaks', near2: 'snowpines' },
  desert: { sky: ['#1e0e0a', '#8a4a2a'], far: '#4a2a1a', near: '#2a160e', ground: ['#8a5a34', '#5a3a20'], orb: 'sun', far2: 'dunes', near2: 'cacti' },
  volcano: { sky: ['#140604', '#5a1a0c'], far: '#2a0e08', near: '#160806', ground: ['#2a1a18', '#1a100e'], orb: 'ember', far2: 'volcano', near2: 'deadtrees' },
  eclipse: { sky: ['#06030c', '#2a1440'], far: '#1a0e2a', near: '#0e0818', ground: ['#1c1426', '#120c1a'], orb: 'eclipse', far2: 'spires', near2: 'shards' },
  town: { sky: ['#080a18', '#2a2440'], far: '#14142a', near: '#0c0c1a', ground: ['#2a2620', '#1a1814'], orb: 'moon', far2: 'hills', near2: 'houses' },
  dawn: { sky: ['#2a3a6a', '#f0a868'], far: '#5a4a6a', near: '#2a2238', ground: ['#4a3a28', '#2a2018'], orb: 'dawn', far2: 'hills', near2: 'tower' },
  past: { sky: ['#1a1208', '#6a4a24'], far: '#2a1c0c', near: '#140e06', ground: ['#3a2a14', '#22180a'], orb: 'eclipse', far2: 'hills', near2: 'none' },
};
function lookOf(bg) {
  if (!bg.startsWith('dungeon:')) return LOOKS[bg] || LOOKS.town;
  const th = dungeonById(bg.slice(8))?.theme || {};
  return { sky: ['#050408', th.wall || '#2a2838'], far: th.wall || '#2a2838', near: '#0a0810', ground: th.floor || ['#2b2838', '#1d1a28'], orb: 'none', far2: 'wall', near2: 'pillars', light: th.light || '255,160,70' };
}

// a silhouette row across the stage, `par` of the camera's movement
function row(g, kind, col, base, par, cs, W, t, seed) {
  const z = cs.cam.zoom, off = -cs.cam.x * z * par;
  g.fillStyle = col;
  const step = kind === 'houses' ? 70 : kind === 'pillars' ? 90 : kind === 'peaks' || kind === 'volcano' || kind === 'hills' || kind === 'dunes' ? 120 : 34;
  const k0 = Math.floor((-off - 80) / step), k1 = Math.ceil((W - off + 80) / step);
  for (let k = k0; k <= k1; k++) {
    const x = k * step + off, r = h01(k + seed), hh = 0.5 + r * 0.8;
    g.beginPath();
    switch (kind) {
      case 'hills': g.ellipse(x, base, step * 0.9, 40 * hh, 0, Math.PI, 0); break;
      case 'dunes': g.ellipse(x, base, step * 1.1, 26 * hh, 0, Math.PI, 0); break;
      case 'peaks': g.moveTo(x - step * 0.7, base); g.lineTo(x, base - 90 * hh); g.lineTo(x + step * 0.7, base); break;
      case 'volcano': if (r > 0.6) { g.moveTo(x - step, base); g.lineTo(x - 18, base - 100 * hh); g.lineTo(x + 18, base - 100 * hh); g.lineTo(x + step, base); } else g.ellipse(x, base, step * 0.8, 30 * hh, 0, Math.PI, 0); break;
      case 'pines': case 'snowpines': for (let i = 0; i < 3; i++) { const w = 12 - i * 3, y = base - 14 - i * 12 * hh; g.moveTo(x - w, y + 14); g.lineTo(x, y - 8 * hh); g.lineTo(x + w, y + 14); } g.rect(x - 2, base - 6, 4, 6); break;
      case 'cacti': if (r > 0.5) { g.rect(x - 3, base - 30 * hh, 6, 30 * hh); g.rect(x - 10, base - 20 * hh, 4, 10); g.rect(x + 6, base - 24 * hh, 4, 12); } break;
      case 'deadtrees': if (r > 0.45) { g.rect(x - 2, base - 36 * hh, 4, 36 * hh); g.rect(x - 10, base - 28 * hh, 10, 2); g.rect(x, base - 22 * hh, 9, 2); } break;
      case 'spires': g.moveTo(x - 10, base); g.lineTo(x, base - 120 * hh); g.lineTo(x + 10, base); break;
      case 'shards': if (r > 0.5) { g.moveTo(x - 5, base); g.lineTo(x, base - 26 * hh); g.lineTo(x + 5, base); } break;
      case 'houses': g.rect(x - 26, base - 30 * hh - 10, 52, 30 * hh + 10); g.moveTo(x - 32, base - 30 * hh - 10); g.lineTo(x, base - 30 * hh - 30); g.lineTo(x + 32, base - 30 * hh - 10); break;
      case 'tower': if (k % 5 === 0) { g.rect(x - 8, base - 140, 16, 140); g.moveTo(x - 14, base - 140); g.lineTo(x, base - 170); g.lineTo(x + 14, base - 140); } break;
      case 'wall': g.rect(x - step / 2, base - 200, step - 4, 200); break;
      case 'pillars': g.rect(x - 9, base - 150, 18, 150); break;
      default: break;
    }
    g.fill();
    if (kind === 'houses') { // lit windows
      g.fillStyle = `rgba(255,200,120,${(0.5 + 0.3 * Math.sin(t * 2 + k)).toFixed(2)})`;
      g.fillRect(x - 14, base - 22 * hh, 6, 6); g.fillRect(x + 6, base - 22 * hh, 6, 6);
      g.fillStyle = col;
    }
    if (kind === 'snowpines' || kind === 'peaks') { g.fillStyle = 'rgba(230,240,255,.55)'; g.beginPath(); g.moveTo(x - 6, base - (kind === 'peaks' ? 70 : 38) * hh); g.lineTo(x, base - (kind === 'peaks' ? 90 : 46) * hh); g.lineTo(x + 6, base - (kind === 'peaks' ? 70 : 38) * hh); g.fill(); g.fillStyle = col; }
  }
}

function orb(g, kind, W, H, t) {
  const x = W * 0.78, y = H * 0.2;
  if (kind === 'moon') { g.fillStyle = '#e8e0c8'; g.beginPath(); g.arc(x, y, 14, 0, TAU); g.fill(); g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(x + 4, y - 2, 12, 0, TAU); g.fill(); }
  if (kind === 'sun' || kind === 'dawn') { const gr = g.createRadialGradient(x, y + (kind === 'dawn' ? 40 : 0), 0, x, y, 60); gr.addColorStop(0, 'rgba(255,230,170,1)'); gr.addColorStop(0.25, 'rgba(255,200,120,.8)'); gr.addColorStop(1, 'rgba(255,160,80,0)'); g.fillStyle = gr; g.fillRect(x - 60, y - 60, 120, 120); }
  if (kind === 'ember') { const gr = g.createRadialGradient(W * 0.3, H * 0.62, 0, W * 0.3, H * 0.62, 140); gr.addColorStop(0, 'rgba(255,110,40,.45)'); gr.addColorStop(1, 'rgba(255,80,20,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
  if (kind === 'eclipse') blackSun(g, x, y, 18, t, 1);
}
function blackSun(g, x, y, r, t, a) {
  g.save(); g.globalAlpha = a;
  const gr = g.createRadialGradient(x, y, r * 0.8, x, y, r * 3);
  gr.addColorStop(0, 'rgba(200,140,255,.9)'); gr.addColorStop(0.4, 'rgba(140,60,220,.35)'); gr.addColorStop(1, 'rgba(60,20,120,0)');
  g.fillStyle = gr; g.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
  for (let i = 0; i < 12; i++) { const an = i / 12 * TAU + t * 0.2; g.strokeStyle = 'rgba(220,180,255,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + Math.cos(an) * r * 1.1, y + Math.sin(an) * r * 1.1); g.lineTo(x + Math.cos(an) * r * (1.6 + 0.3 * Math.sin(t * 2 + i)), y + Math.sin(an) * r * (1.6 + 0.3 * Math.sin(t * 2 + i))); g.stroke(); }
  g.fillStyle = '#05020a'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  g.restore();
}

// the backdrop for a scene (bg id), with the camera's parallax
export function drawBackdrop(g, bg, cs, W, H, t) {
  const L = lookOf(bg), z = cs.cam.zoom, gy = H / 2 + (0 - cs.cam.y) * z;
  const sky = g.createLinearGradient(0, 0, 0, gy); sky.addColorStop(0, L.sky[0]); sky.addColorStop(1, L.sky[1]);
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  if (!bg.startsWith('dungeon:')) for (let i = 0; i < 40; i++) { const x = h01(i) * W, y = h01(i + 50) * gy * 0.7, a = 0.3 + 0.4 * Math.sin(t * 2 + i); g.fillStyle = `rgba(255,255,240,${(a * (L.orb === 'sun' || L.orb === 'dawn' ? 0.2 : 1)).toFixed(2)})`; g.fillRect(x, y, 1, 1); }
  orb(g, L.orb, W, H, t);
  row(g, L.far2, L.far, gy - 10, 0.25, cs, W, t, 3);
  row(g, L.near2, L.near, gy, 0.6, cs, W, t, 9);
  const gr = g.createLinearGradient(0, gy, 0, H); gr.addColorStop(0, L.ground[0]); gr.addColorStop(1, L.ground[1]);
  g.fillStyle = gr; g.fillRect(0, gy, W, H - gy);
  g.fillStyle = 'rgba(0,0,0,.25)'; // ground texture moving with the camera
  const off = -cs.cam.x * z;
  for (let k = Math.floor(-off / 40) - 1; k < (W - off) / 40 + 1; k++) for (let j = 0; j < 4; j++) { const x = k * 40 + off + h01(k * 7 + j) * 30, y = gy + 6 + j * ((H - gy) / 4); g.fillRect(x, y, 6 + j * 3, 1); }
  if (bg.startsWith('dungeon:')) { // torches on the far wall
    for (let k = -3; k <= 3; k++) {
      const x = W / 2 + k * 110 - cs.cam.x * z * 0.25, y = gy - 70, fl = 0.7 + 0.3 * Math.sin(t * 9 + k * 3);
      const tg = g.createRadialGradient(x, y, 0, x, y, 40); tg.addColorStop(0, `rgba(${L.light},${(0.55 * fl).toFixed(2)})`); tg.addColorStop(1, `rgba(${L.light},0)`);
      g.fillStyle = tg; g.fillRect(x - 40, y - 40, 80, 80); g.fillStyle = `rgb(${L.light})`; g.fillRect(x - 1, y - 3, 3, 4);
    }
  }
  return gy;
}

// the actors, into their own canvas so the pixel filter only touches them (as in the game)
export function drawActors(g, cs, W, H, t, hero) {
  const z = cs.cam.zoom, sh = shakeOf(cs), sx = (Math.random() - 0.5) * sh * 6, sy = (Math.random() - 0.5) * sh * 4;
  const list = Object.values(cs.actors).filter((a) => a.visible).sort((a, b) => a.y - b.y);
  for (const a of list) {
    const x = W / 2 + (a.x - cs.cam.x) * z + sx, y = H / 2 + (a.y - cs.cam.y) * z + sy, k = z * (a.scale || 1);
    g.save(); g.translate(x, y);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(0, 2, 14 * k, 3.5 * k, 0, 0, TAU); g.fill(); // shadow
    if (a.kind === 'shard') { shardGem(g, k, t); g.restore(); continue; }
    if (a.kind === 'boss') {
      g.scale(DOLL * k, DOLL * k);
      if (!drawBoss(g, a.type, t, 1, null, a.view === 'front' ? 'front' : a.face < 0 ? 'left' : 'right')) {
        const r = ENEMIES[a.type]?.r || 30; g.translate(0, -r); (MONSTER_ART[a.type] || MONSTER_ART.boss)?.(g, r);
      }
      g.restore(); continue;
    }
    const side = !a.view || a.view === 'side';
    g.scale(DOLL * k * (side ? a.face : 1), DOLL * k);
    const pose = { t, moving: a.moving, walk: a.walk, view: a.view || 'side', anime: !!LOOK.anime };
    if (a.kind === 'hero') drawDoll(g, hero.classId, hero.look, pose);
    else drawDoll(g, null, { ...a.look, outfit: a.outfit, npc: { role: a.role || 'talk' } }, pose);
    g.restore();
  }
}
function shardGem(g, k, t) {
  const y = -14 * k + Math.sin(t * 3) * 2 * k;
  const gr = g.createRadialGradient(0, y, 0, 0, y, 22 * k); gr.addColorStop(0, 'rgba(255,240,190,.95)'); gr.addColorStop(1, 'rgba(255,200,90,0)');
  g.fillStyle = gr; g.fillRect(-22 * k, y - 22 * k, 44 * k, 44 * k);
  g.save(); g.translate(0, y); g.rotate(t * 1.4);
  g.fillStyle = '#ffe6a0'; g.strokeStyle = '#6a4a10'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(0, -8 * k); g.lineTo(5 * k, 0); g.lineTo(0, 8 * k); g.lineTo(-5 * k, 0); g.closePath(); g.fill(); g.stroke();
  g.restore();
}

// effects over the stage
export function drawFx(g, cs, W, H, t, gy) {
  const z = cs.cam.zoom;
  for (const f of cs.fx) {
    const life = Math.min(1, f.t / Math.max(0.2, f.dur)), fadeOut = f.t > f.dur ? 1 - (f.t - f.dur) / 0.6 : 1, a = Math.max(0, Math.min(1, fadeOut));
    const x = W / 2 + (f.at[0] - cs.cam.x) * z, y = H / 2 + (f.at[1] - cs.cam.y) * z;
    if (f.kind === 'light') { const w = 26 + 10 * Math.sin(t * 6), gr = g.createLinearGradient(x - w, 0, x + w, 0); gr.addColorStop(0, 'rgba(255,240,200,0)'); gr.addColorStop(0.5, `rgba(255,240,200,${(0.7 * a).toFixed(2)})`); gr.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = gr; g.fillRect(x - w, 0, w * 2, y); }
    if (f.kind === 'crack') { g.strokeStyle = `rgba(200,120,255,${(0.9 * a).toFixed(2)})`; g.lineWidth = 2; g.beginPath(); let px = x - 90 * life, py = gy + 4; g.moveTo(px, py); for (let i = 0; i < 12; i++) { px += 15 * life; py = gy + 4 + (h01(i) - 0.5) * 10; g.lineTo(px, py); } g.stroke(); const gr = g.createRadialGradient(x, gy, 0, x, gy, 120 * life); gr.addColorStop(0, `rgba(170,90,255,${(0.5 * a).toFixed(2)})`); gr.addColorStop(1, 'rgba(170,90,255,0)'); g.fillStyle = gr; g.fillRect(x - 120, gy - 120, 240, 240); }
    if (f.kind === 'eclipse') { g.fillStyle = `rgba(20,0,40,${(0.45 * a * life).toFixed(2)})`; g.fillRect(0, 0, W, H); blackSun(g, W * 0.5, H * 0.18, 20, t, a * life); }
    if (f.kind === 'flash') { g.fillStyle = `rgba(255,255,255,${(0.9 * (1 - life) * a).toFixed(2)})`; g.fillRect(0, 0, W, H); }
    if (f.kind === 'motes') for (let i = 0; i < 14; i++) { const k = (t * 0.5 + i / 14) % 1, mx = x + Math.sin(i * 2.3 + t) * 30, my = y - k * 60; g.fillStyle = `rgba(255,230,160,${((1 - k) * a).toFixed(2)})`; g.fillRect(mx, my, 2, 2); }
    if (f.kind === 'dawn') { g.fillStyle = `rgba(255,190,120,${(0.25 * life * a).toFixed(2)})`; g.fillRect(0, 0, W, H); }
  }
}

// an illustration (spec §44): public/img/story_<id>.webp when it is there, else drawn here
const PICS = new Map();
function picture(id) {
  if (typeof Image === 'undefined') return null; // tests in Node: drawn instead
  if (!PICS.has(id)) { const im = new Image(); im.src = `img/story_${id}.webp`; PICS.set(id, im); }
  const im = PICS.get(id);
  return im.complete && im.naturalWidth ? im : null;
}
export function drawPanel(g, id, W, H, t) {
  const im = picture(id);
  if (im) { const k = Math.max(W / im.naturalWidth, H / im.naturalHeight); g.drawImage(im, (W - im.naturalWidth * k) / 2, (H - im.naturalHeight * k) / 2, im.naturalWidth * k, im.naturalHeight * k); return; }
  // drawn: an old picture in sepia — the black sun over the world, then the elders sealing it
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#1a1208'); gr.addColorStop(1, '#5a3e1c');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const cs = { cam: { x: t * 4, y: -40, zoom: 1.4 } }, gy = H * 0.72;
  row(g, 'hills', '#2a1c0c', gy, 0.25, cs, W, t, 5);
  g.fillStyle = '#140e06'; g.fillRect(0, gy, W, H - gy);
  if (id === 'past_eclipse') {
    blackSun(g, W / 2, H * 0.3, 34, t, 1);
    for (let i = 0; i < 9; i++) { const x = W * 0.1 + i * W * 0.1, s = 0.7 + h01(i) * 0.6; g.fillStyle = '#0a0604'; g.beginPath(); g.ellipse(x, gy - 8 * s, 10 * s, 12 * s, 0, 0, TAU); g.fill(); g.fillStyle = `rgba(255,${120 + i * 8},60,.8)`; g.fillRect(x - 4 * s, gy - 12 * s, 2, 2); g.fillRect(x + 2 * s, gy - 12 * s, 2, 2); }
  } else { // past_seal: five elders round the black sun, five lights flying apart
    const cx = W / 2, cy = H * 0.34;
    blackSun(g, cx, cy, 24, t, 0.8);
    g.strokeStyle = 'rgba(255,214,120,.8)'; g.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) { const an = -Math.PI / 2 + i * TAU / 5, ex = cx + Math.cos(an) * 90, ey = cy + Math.sin(an) * 50 + 40; g.beginPath(); g.moveTo(cx, cy); g.lineTo(ex, ey - 30); g.stroke(); g.fillStyle = '#0a0604'; g.fillRect(ex - 5, ey - 30, 10, 26); g.beginPath(); g.arc(ex, ey - 34, 5, 0, TAU); g.fill(); const k = (t * 0.4 + i / 5) % 1, lx = cx + Math.cos(an) * k * 200, ly = cy + Math.sin(an) * k * 120; const lg = g.createRadialGradient(lx, ly, 0, lx, ly, 10); lg.addColorStop(0, 'rgba(255,240,190,.95)'); lg.addColorStop(1, 'rgba(255,200,90,0)'); g.fillStyle = lg; g.fillRect(lx - 10, ly - 10, 20, 20); }
  }
  g.fillStyle = 'rgba(40,24,8,.25)'; for (let i = 0; i < 60; i++) g.fillRect(h01(i + Math.floor(t * 8)) * W, h01(i * 3 + Math.floor(t * 8)) * H, 1, 1); // the grain of an old picture
}

// One frame of the stage (the actors' layer is a second canvas of the same size).
export function drawCutscene(g, layer, cs, t, hero) {
  const W = g.canvas.width, H = g.canvas.height;
  g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = true;
  if (cs.panel) drawPanel(g, cs.panel.id, W, H, t);
  else {
    const gy = drawBackdrop(g, cs.bg, cs, W, H, t);
    const lg = layer.getContext('2d', { willReadFrequently: true });
    lg.setTransform(1, 0, 0, 1, 0, 0); lg.clearRect(0, 0, W, H); lg.lineJoin = 'round';
    drawActors(lg, cs, W, H, t, hero);
    if (LOOK.pixel) pixelateCanvas(layer, LOOK.pixel);
    g.drawImage(layer, 0, 0);
    drawFx(g, cs, W, H, t, gy);
  }
  const bar = Math.round(H * CUTSCENE.bar); // the cinema bars
  g.fillStyle = '#000'; g.fillRect(0, 0, W, bar); g.fillRect(0, H - bar, W, bar);
  if (cs.fade > 0) { g.fillStyle = `rgba(0,0,0,${cs.fade.toFixed(3)})`; g.fillRect(0, 0, W, H); }
}

// a speaker's face for the line box (drawn small, pixel filter, enlarged by CSS)
export function drawPortrait(c, a, t, hero) {
  const g = c.getContext('2d', { willReadFrequently: true }), W = c.width, H = c.height;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
  if (!a) return;
  g.save(); g.translate(W / 2, H * 1.55);
  const k = W / 26;
  if (a.kind === 'boss') { g.translate(0, H * 0.15); g.scale(k * 0.45, k * 0.45); drawBoss(g, a.type, t, 1, null, 'front'); }
  else {
    g.scale(k, k);
    const pose = { t, moving: 0, walk: 0, view: 'front', anime: !!LOOK.anime };
    if (a.kind === 'hero') drawDoll(g, hero.classId, hero.look, pose);
    else drawDoll(g, null, { ...a.look, outfit: a.outfit, npc: { role: a.role || 'talk' } }, pose);
  }
  g.restore();
  if (LOOK.pixel) pixelateCanvas(c, LOOK.pixel);
}
