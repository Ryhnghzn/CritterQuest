// Camera test page: one small dungeon fight seen through three cameras —
// top-down (like the game now), tilted from behind with north fixed (option 1),
// and a chase camera that turns with the hero (option 2). Everything is a 3D
// point projected onto the 2D canvas; characters and monsters are the game's
// own vector art drawn as upright billboards. Phone controls: floating joystick,
// drag to turn/aim, attack + 4 skills + ultimate, aim assist, lock-on, auto attack,
// camera that swings behind the hero, arrows for monsters out of view.
import { drawDoll } from '../src/art/doll.js';
import { ENEMY_ART } from '../src/art/sprites.js';

const TAU = Math.PI * 2, DEG = Math.PI / 180, NEAR = 6;
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

const params = new URLSearchParams(location.search);
const TOUCH = matchMedia('(pointer:coarse)').matches || params.has('touch');
if (TOUCH) $('stage').classList.add('touch');

const cv = $('view'), g = cv.getContext('2d');
let W = 0, H = 0, DPR = 1, RS = 1; // RS: render scale, lowered when the frame rate drops
function resize() {
  DPR = Math.min(devicePixelRatio || 1, 2) * RS;
  const r = cv.getBoundingClientRect();
  W = cv.width = Math.max(1, Math.round(r.width * DPR));
  H = cv.height = Math.max(1, Math.round(r.height * DPR));
}
new ResizeObserver(resize).observe(cv);
resize();

// ——— cameras ———
const KEYS_HELP = '<kbd>1</kbd>–<kbd>4</kbd> skill, <kbd>5</kbd> ultimate, <kbd>F</kbd> kunci target, <kbd>R</kbd> serang otomatis, <kbd>Tab</kbd> ganti kamera.';
const MODES = {
  top: {
    label: 'Atas (sekarang)', pitch: 89, dist: 2000, fov: 11, ahead: 0, lookZ: 0, follow: false,
    help: `<b>PC</b> — <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> gerak, mouse bidik, tahan klik kiri menembak, ${KEYS_HELP}<br><b>HP</b> — joystick kiri: jalan; joystick kanan: bidik & tembak ke arah dorongan (bidik otomatis membantu).`,
  },
  tilt: {
    label: 'Opsi 1 — miring dari belakang', pitch: 50, dist: 340, fov: 50, ahead: 40, lookZ: 0, follow: false,
    help: `<b>PC</b> — kontrol sama dengan sekarang: <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>, bidik mouse, tahan klik kiri, ${KEYS_HELP}<br><b>HP</b> — joystick kiri: jalan; joystick kanan: bidik & tembak ke arah dorongan (bidik otomatis membantu).`,
  },
  chase: {
    label: 'Opsi 2 — kamera ikut berputar', pitch: 18, dist: 150, fov: 68, ahead: 50, lookZ: 26, follow: true,
    help: `<b>PC</b> — klik kanvas untuk mengunci mouse (gerakkan mouse = berputar, <kbd>Esc</kbd> melepas). <kbd>W</kbd><kbd>S</kbd> maju/mundur, <kbd>A</kbd><kbd>D</kbd> geser, <kbd>Q</kbd><kbd>E</kbd> berputar, tahan klik kiri menembak, ${KEYS_HELP}<br><b>HP</b> — joystick kiri: <b>hanya jalan</b>; joystick kanan: dorong untuk menembak ke arah itu, dorong ke kiri/kanan untuk memutar kamera (makin jauh makin cepat); ketuk monster: kunci target; panah merah di tepi = musuh di luar layar.`,
  },
};
const ORDER = ['top', 'tilt', 'chase'];
let mode = 'chase';
const view = { pitch: 18, dist: 150, fov: 68 };
const cam = { yaw: -Math.PI / 2, goal: -Math.PI / 2 };
const feel = { sens: 1, follow: false }; // turn sensitivity, auto camera on/off
const TURN = 0.006; // radians per CSS px of drag at sensitivity 1

function setupCamera() {
  const m = MODES[mode];
  const pitch = view.pitch * DEG, yaw = m.follow ? cam.yaw : -Math.PI / 2;
  const cp = Math.cos(pitch), sp = Math.sin(pitch), cy = Math.cos(yaw), sy = Math.sin(yaw);
  Object.assign(cam, {
    fx: cy * cp, fy: sy * cp, fz: -sp,
    rx: -sy, ry: cy,
    ux: cy * sp, uy: sy * sp, uz: cp,
    F: H / 2 / Math.tan((view.fov * DEG) / 2),
  });
  const tx = player.x + cy * m.ahead, ty = player.y + sy * m.ahead;
  cam.x = tx - cam.fx * view.dist; cam.y = ty - cam.fy * view.dist; cam.z = m.lookZ - cam.fz * view.dist;
}

function toCam(x, y, z) {
  const vx = x - cam.x, vy = y - cam.y, vz = z - cam.z;
  return [vx * cam.rx + vy * cam.ry, vx * cam.ux + vy * cam.uy + vz * cam.uz, vx * cam.fx + vy * cam.fy + vz * cam.fz];
}
const shake = { x: 0, y: 0, amp: 0 };
const PX = (c) => W / 2 + (c[0] * cam.F) / c[2] + shake.x;
const PY = (c) => H / 2 - (c[1] * cam.F) / c[2] + shake.y;

// Screen pixel → point on the floor (z = 0).
function screenToGround(px, py) {
  const a = (px - W / 2) / cam.F, b = -(py - H / 2) / cam.F;
  const dx = cam.rx * a + cam.ux * b + cam.fx, dy = cam.ry * a + cam.uy * b + cam.fy, dz = cam.uz * b + cam.fz;
  const t = dz < -0.02 ? -cam.z / dz : 900 / Math.hypot(dx, dy);
  return { x: cam.x + dx * t, y: cam.y + dy * t };
}

function clipNear(ps) {
  const out = [];
  for (let i = 0; i < ps.length; i++) {
    const a = ps[i], b = ps[(i + 1) % ps.length], ain = a[2] > NEAR, bin = b[2] > NEAR;
    if (ain) out.push(a);
    if (ain !== bin) {
      const t = (NEAR - a[2]) / (b[2] - a[2]);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, NEAR]);
    }
  }
  return out;
}

function path3(pts) {
  const cs = clipNear(pts.map((p) => toCam(p[0], p[1], p[2])));
  if (cs.length < 3) return false;
  g.beginPath();
  cs.forEach((c, i) => (i ? g.lineTo(PX(c), PY(c)) : g.moveTo(PX(c), PY(c))));
  g.closePath();
  return true;
}
function poly(pts, fill, stroke, lw = 1) {
  if (!path3(pts)) return;
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.lineWidth = lw * DPR; g.strokeStyle = stroke; g.stroke(); }
}
function line3(a, b, color, w) {
  let ca = toCam(...a), cb = toCam(...b);
  if (ca[2] < NEAR && cb[2] < NEAR) return;
  if (ca[2] < NEAR || cb[2] < NEAR) {
    const t = (NEAR - ca[2]) / (cb[2] - ca[2]);
    const m = [ca[0] + (cb[0] - ca[0]) * t, ca[1] + (cb[1] - ca[1]) * t, NEAR];
    if (ca[2] < NEAR) ca = m; else cb = m;
  }
  g.beginPath(); g.moveTo(PX(ca), PY(ca)); g.lineTo(PX(cb), PY(cb));
  g.lineWidth = w; g.strokeStyle = color; g.stroke();
}
const circlePts = (x, y, r, z = 0.5, n = 40) => Array.from({ length: n }, (_, i) => [x + Math.cos((i / n) * TAU) * r, y + Math.sin((i / n) * TAU) * r, z]);

const GLOW = {};
function glowImg(color) {
  if (GLOW[color]) return GLOW[color];
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.25, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  return (GLOW[color] = c);
}
function glow(X, Y, r, color, a = 1) {
  g.globalAlpha = a; g.globalCompositeOperation = 'lighter';
  g.drawImage(glowImg(color), X - r, Y - r, r * 2, r * 2);
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
}

// Monsters are baked once per type (like the game's bakeAll) instead of being
// redrawn as vectors every frame — much cheaper on phones.
const BAKE = {}, BAKE_PX = 5; // pixels per world unit
function baked(type, r) {
  if (BAKE[type]) return BAKE[type];
  const ext = r * 1.9, c = document.createElement('canvas');
  c.width = c.height = Math.ceil(ext * 2 * BAKE_PX);
  const x = c.getContext('2d');
  x.translate(c.width / 2, c.height / 2); x.scale(BAKE_PX, BAKE_PX); x.lineJoin = 'round';
  ENEMY_ART[type](x, r);
  return (BAKE[type] = { img: c, ext });
}

// ——— room ———
const RW = 960, RH = 720, TILE = 48, WH = 72, WT = 22;
const PILLARS = [[300, 250], [660, 250], [300, 470], [660, 470]].map(([x, y]) => ({ x, y, s: 22, h: 100 }));
const TORCHES = [[240, 8], [480, 8], [720, 8], [8, 220], [8, 500], [RW - 8, 220], [RW - 8, 500], [240, RH - 8], [720, RH - 8]]
  .map(([x, y]) => ({ x, y, ph: Math.random() * 10 }));
const TILES = [];
for (let j = 0; j < RH / TILE; j++) for (let i = 0; i < RW / TILE; i++) {
  TILES.push({ x: i * TILE, y: j * TILE, v: 0.82 + Math.random() * 0.3, h: Math.random() < 0.12 ? 1 : 0 });
}
const WALLS = [];
for (let x = 0; x < RW; x += TILE) {
  WALLS.push({ a: [x, 0], b: [x + TILE, 0], n: [0, 1] });
  WALLS.push({ a: [x + TILE, RH], b: [x, RH], n: [0, -1] });
}
for (let y = 0; y < RH; y += TILE) {
  WALLS.push({ a: [0, y + TILE], b: [0, y], n: [1, 0] });
  WALLS.push({ a: [RW, y], b: [RW, y + TILE], n: [-1, 0] });
}

const lights = [];
function lightAt(x, y) {
  let b = 0.4, warm = 0, red = 0;
  for (const L of lights) {
    const d = Math.hypot(x - L.x, y - L.y);
    if (d >= L.r) continue;
    const k = (1 - d / L.r) ** 2 * L.k;
    b += k;
    if (L.warm) warm += k;
    if (L.red) red += k;
  }
  return [Math.min(b, 1.25), Math.min(warm, 1), Math.min(red, 1)];
}
const rgb = (r, gg, b) => `rgb(${r | 0},${gg | 0},${b | 0})`;
function lit(base, x, y, v = 1) {
  const [b, w, rd] = lightAt(x, y);
  return rgb(base[0] * b * v + w * 60 + rd * 90, base[1] * b * v + w * 30, base[2] * b * v + w * 6);
}

// ——— actors ———
const LOOK = { hair: 2, hairColor: 2, gear: { weapon: { tier: 5, rarity: 4 }, helm: { tier: 4, rarity: 4 }, armor: { tier: 5, rarity: 5 }, boots: { tier: 4, rarity: 3 } } };
const player = { x: RW / 2, y: RH - 150, aim: -Math.PI / 2, hp: 100, walk: 0, moving: 0, shot: 9, cd: 0, hurt: 0, side: 1, dash: null };
const TYPES = {
  slink: { r: 13, hp: 30, spd: 55 },
  wolf: { r: 14, hp: 40, spd: 92 },
  dart: { r: 11, hp: 20, spd: 105, fly: 24 },
  tank: { r: 20, hp: 110, spd: 34 },
  spitter: { r: 13, hp: 30, spd: 45, shoot: '#9dff6a' },
  imp: { r: 12, hp: 28, spd: 70, fly: 20, shoot: '#ff7a2a' },
  boss: { r: 34, hp: 900, spd: 24, boss: true },
};
const POOL = ['slink', 'slink', 'wolf', 'dart', 'tank', 'spitter', 'imp'];
let enemies = [], arrows = [], shots = [], parts = [], nums = [], skills = [], slams = [];
let kills = 0, bossTimer = 0, lock = null, auto = false, ultDark = 0;

// skill slots 1–5 (5 = ultimate): cooldown in seconds
const SKILLS = {
  1: { name: 'Hujan Panah', cd: 3 },
  2: { name: 'Tembakan Tembus', cd: 2.5 },
  3: { name: 'Lompatan Mundur', cd: 4 },
  4: { name: 'Panah Beruntun', cd: 2.5 },
  5: { name: 'Hujan Bintang', cd: 12 },
};
const cds = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

function spawn(type, x, y) {
  const T = TYPES[type];
  enemies.push({ type, x, y, r: T.r, hp: T.hp, max: T.hp, flash: 0, freeze: 0, side: 1, t: Math.random() * 5, fire: rand(1, 2.5), slam: 3 });
}
function spawnEdge() {
  for (let k = 0; k < 20; k++) {
    const x = rand(60, RW - 60), y = rand(60, RH - 60);
    if (Math.hypot(x - player.x, y - player.y) > 300 && !PILLARS.some((p) => Math.abs(x - p.x) < 60 && Math.abs(y - p.y) < 60)) return spawn(POOL[(Math.random() * POOL.length) | 0], x, y);
  }
}
spawn('boss', RW / 2, 130);
for (let i = 0; i < 7; i++) spawnEdge();

function collide(e, r) {
  e.x = clamp(e.x, r, RW - r); e.y = clamp(e.y, r, RH - r);
  for (const p of PILLARS) {
    const dx = e.x - p.x, dy = e.y - p.y, lim = p.s + r;
    if (Math.abs(dx) < lim && Math.abs(dy) < lim) {
      if (lim - Math.abs(dx) < lim - Math.abs(dy)) e.x = p.x + Math.sign(dx || 1) * lim;
      else e.y = p.y + Math.sign(dy || 1) * lim;
    }
  }
}
const solid = (x, y) => x < 0 || y < 0 || x > RW || y > RH || PILLARS.some((p) => Math.abs(x - p.x) < p.s && Math.abs(y - p.y) < p.s);

function burst(x, y, z, color, n, spd = 120) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, s = rand(0.3, 1) * spd;
    parts.push({ x, y, z, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: rand(40, 200), life: rand(0.35, 0.8), max: 0.8, color, size: rand(2, 4) });
  }
}
function hurtEnemy(e, dmg, crit = false) {
  if (e.dead) return;
  e.hp -= dmg; e.flash = 0.12;
  nums.push({ x: e.x, y: e.y, z: e.r * 2 + 18 + (TYPES[e.type].fly || 0), v: dmg, life: 0.8, crit });
  if (e.hp <= 0) {
    e.dead = true; kills++;
    if (lock === e) lock = null;
    const boss = TYPES[e.type].boss;
    burst(e.x, e.y, 12, boss ? '#ffd166' : '#c79bff', boss ? 60 : 18, boss ? 260 : 140);
    if (boss) { shake.amp = 14; bossTimer = 6; }
  }
}

// ——— targeting ———
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angTo = (e) => Math.atan2(e.y - player.y, e.x - player.x);
// best monster in a cone around `dir` (closer and more centred wins); cone = Infinity → nearest anywhere
function pickTarget(dir, cone, range) {
  let best = null, score = Infinity;
  for (const e of enemies) {
    const d = dist(e, player);
    if (d > range) continue;
    const off = Math.abs(angDiff(angTo(e), dir));
    if (off > cone) continue;
    const s = d + (cone === Infinity ? 0 : off * 260) - (TYPES[e.type].boss ? 60 : 0);
    if (s < score) { score = s; best = e; }
  }
  return best;
}
// the monster attacks and skills go to: lock → aim assist → none
let assist = null;
// right stick: { id, x, y } in −1..1 while held; stickAim = world angle it points at (null when idle)
const rs = { id: null, x: 0, y: 0 };
let stickAim = null;
function sticky(dir, cone) {
  if (assist && !assist.dead && dist(assist, player) < 580 && Math.abs(angDiff(angTo(assist), dir)) < cone * 1.6) return assist;
  return (assist = pickTarget(dir, cone, 520));
}
function currentTarget() {
  if (lock) return lock;
  const m = MODES[mode];
  if (stickAim != null) return sticky(stickAim, 0.45);
  if (m.follow) return sticky(cam.yaw, TOUCH ? 0.6 : 0.35);
  if (mouse.seen && !TOUCH) return null;
  return pickTarget(player.aim, Infinity, 460);
}
function aimPoint() {
  const tg = currentTarget();
  if (tg) return { x: tg.x, y: tg.y };
  if (stickAim != null) return { x: player.x + Math.cos(stickAim) * 170, y: player.y + Math.sin(stickAim) * 170 };
  if (MODES[mode].follow) return { x: player.x + Math.cos(cam.yaw) * 170, y: player.y + Math.sin(cam.yaw) * 170 };
  if (touch.aim) return screenToGround(touch.aim.x, touch.aim.y);
  if (mouse.seen) return screenToGround(mouse.x, mouse.y);
  return { x: player.x + Math.cos(player.aim) * 120, y: player.y + Math.sin(player.aim) * 120 };
}
function toggleLock() {
  if (lock) { lock = null; return; }
  lock = pickTarget(MODES[mode].follow ? cam.yaw : player.aim, Math.PI * 0.6, 600) || pickTarget(0, Infinity, 600);
}

function fireArrow(a, o = {}) {
  const c = Math.cos(a), s = Math.sin(a), spd = o.speed || 560;
  arrows.push({ x: player.x + c * 12, y: player.y + s * 12, z: 22, vx: c * spd, vy: s * spd, life: o.life || 0.9, dmg: o.dmg || 12, pierce: !!o.pierce, big: !!o.big, hit: new Set() });
}

function cast(k) {
  if (cds[k] > 0) return;
  cds[k] = SKILLS[k].cd;
  const p = aimPoint(), dir = Math.atan2(p.y - player.y, p.x - player.x);
  player.aim = dir; player.shot = 0;
  if (k === 1 || k === 5) {
    const ult = k === 5, max = ult ? 360 : 320;
    const d = Math.hypot(p.x - player.x, p.y - player.y), f = d > max ? max / d : 1;
    skills.push({
      x: player.x + (p.x - player.x) * f, y: player.y + (p.y - player.y) * f, t: 0, next: 0,
      r: ult ? 190 : 95, dur: ult ? 3 : 1.6, rate: ult ? 0.025 : 0.07, dmg: ult ? 22 : 18,
      color: ult ? '#9fd8ff' : '#ffd166', ring: ult ? '159,216,255' : '255,214,110',
    });
    if (ult) { ultDark = 3; shake.amp = 6; }
  } else if (k === 2) {
    fireArrow(dir, { speed: 780, dmg: 40, pierce: true, big: true, life: 0.9 });
    shake.amp = Math.max(shake.amp, 4);
  } else if (k === 3) {
    burst(player.x, player.y, 6, '#9fe8ff', 26, 170);
    for (const e of enemies) if (dist(e, player) < 95) { e.freeze = 1.4; hurtEnemy(e, 15); }
    player.dash = { vx: -Math.cos(dir) * 900, vy: -Math.sin(dir) * 900, t: 0.17 };
  } else if (k === 4) {
    for (let i = -2; i <= 2; i++) fireArrow(dir + i * 0.13, { dmg: 16 });
  }
}

// ——— input ———
const keys = new Set();
addEventListener('keydown', (e) => {
  if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab'].includes(e.code)) e.preventDefault();
  keys.add(e.code);
  if (e.repeat) return;
  if (e.code === 'Space') cast(1);
  const n = /^Digit([1-5])$/.exec(e.code);
  if (n) cast(+n[1]);
  if (e.code === 'Tab') setMode(ORDER[(ORDER.indexOf(mode) + 1) % 3]);
  if (e.code === 'KeyF') toggleLock();
  if (e.code === 'KeyR') setAuto(!auto);
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
const mouse = { x: 0, y: 0, down: false, seen: false };
const locked = () => document.pointerLockElement === cv;
cv.addEventListener('mousemove', (e) => {
  const r = cv.getBoundingClientRect();
  mouse.x = (e.clientX - r.left) * DPR; mouse.y = (e.clientY - r.top) * DPR; mouse.seen = true;
  if (locked()) cam.goal += e.movementX * 0.0035 * feel.sens;
});
cv.addEventListener('mousedown', (e) => {
  if (e.button === 2) { cast(1); return; }
  mouse.down = true;
  if (MODES[mode].follow && !locked()) cv.requestPointerLock?.();
});
addEventListener('mouseup', () => (mouse.down = false));
cv.addEventListener('contextmenu', (e) => e.preventDefault());

// touch: left part = floating joystick, the rest = drag to turn (option 2) or aim (others); a short tap on a monster locks it
const touch = { move: null, aim: null, drag: 0 };
const tpos = (t) => { const r = cv.getBoundingClientRect(); return { x: (t.clientX - r.left) * DPR, y: (t.clientY - r.top) * DPR }; };
cv.addEventListener('touchstart', (e) => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    const p = tpos(t);
    if (p.x < W * 0.42 && !touch.move) touch.move = { id: t.identifier, ox: p.x, oy: p.y, x: p.x, y: p.y };
    else if (!touch.aim) touch.aim = { id: t.identifier, x: p.x, y: p.y, sx: p.x, sy: p.y, lx: p.x, at: performance.now(), moved: false };
  }
}, { passive: false });
cv.addEventListener('touchmove', (e) => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    const p = tpos(t);
    if (touch.move?.id === t.identifier) {
      const m = touch.move, dx = p.x - m.ox, dy = p.y - m.oy, d = Math.hypot(dx, dy), max = 60 * DPR;
      if (d > max) { m.ox = p.x - (dx / d) * max; m.oy = p.y - (dy / d) * max; } // the base follows the thumb
      m.x = p.x; m.y = p.y;
    }
    const a = touch.aim;
    if (a?.id === t.identifier) {
      if (Math.hypot(p.x - a.sx, p.y - a.sy) > 12 * DPR) a.moved = true;
      if (MODES[mode].follow) { cam.goal += ((p.x - a.lx) / DPR) * TURN * feel.sens; touch.drag = 1.5; }
      a.x = p.x; a.y = p.y; a.lx = p.x;
    }
  }
}, { passive: false });
const tend = (e) => {
  for (const t of e.changedTouches) {
    if (touch.move?.id === t.identifier) touch.move = null;
    const a = touch.aim;
    if (a?.id === t.identifier) {
      if (!a.moved && performance.now() - a.at < 300) tapAt(a.sx, a.sy);
      touch.aim = null;
    }
  }
};
cv.addEventListener('touchend', tend);
cv.addEventListener('touchcancel', tend);
function tapAt(x, y) {
  let best = null, bd = Infinity;
  for (const e of enemies) {
    if (e.sx == null) continue;
    const d = Math.hypot(x - e.sx, y - e.sy);
    if (d < Math.max(e.sr * 1.3, 26 * DPR) && d < bd) { bd = d; best = e; }
  }
  if (best) lock = lock === best ? null : best;
}

// on-screen buttons
function hold(el, on, off) {
  el.addEventListener('touchstart', (e) => { e.preventDefault(); el.classList.add('down'); on(); }, { passive: false });
  const up = (e) => { e.preventDefault(); el.classList.remove('down'); off?.(); };
  el.addEventListener('touchend', up); el.addEventListener('touchcancel', up);
  el.addEventListener('mousedown', (e) => { e.preventDefault(); on(); });
  el.addEventListener('mouseup', () => off?.());
  el.addEventListener('mouseleave', () => off?.());
}
// right stick: push to aim & shoot; pushing sideways also turns the chase camera
const stickEl = $('rstick'), knob = $('knob');
function stickMove(t) {
  const r = stickEl.getBoundingClientRect(), R = r.width / 2;
  let x = (t.clientX - r.left - R) / (R * 0.8), y = (t.clientY - r.top - R) / (R * 0.8);
  const m = Math.hypot(x, y);
  if (m > 1) { x /= m; y /= m; }
  rs.x = x; rs.y = y;
  knob.style.transform = `translate(${x * R * 0.8}px, ${y * R * 0.8}px)`;
}
stickEl.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (rs.id != null) return;
  const t = e.changedTouches[0];
  rs.id = t.identifier; stickEl.classList.add('down'); stickMove(t);
}, { passive: false });
stickEl.addEventListener('touchmove', (e) => {
  e.preventDefault();
  for (const t of e.changedTouches) if (t.identifier === rs.id) stickMove(t);
}, { passive: false });
const stickEnd = (e) => {
  for (const t of e.changedTouches) if (t.identifier === rs.id) {
    rs.id = null; rs.x = rs.y = 0; stickEl.classList.remove('down'); knob.style.transform = '';
  }
};
stickEl.addEventListener('touchend', stickEnd);
stickEl.addEventListener('touchcancel', stickEnd);
for (const k of [1, 2, 3, 4, 5]) hold($(`s${k}`), () => cast(k));
hold($('bLock'), toggleLock);
hold($('bAuto'), () => setAuto(!auto));
hold($('bCam'), () => setMode(ORDER[(ORDER.indexOf(mode) + 1) % 3]));
hold($('bFull'), () => {
  const st = $('stage');
  if (document.fullscreenElement) document.exitFullscreen();
  else st.requestFullscreen?.().then(() => screen.orientation?.lock?.('landscape').catch(() => {})).catch(() => {});
});
function setAuto(v) { auto = v; $('bAuto').classList.toggle('on', v); }

// ——— update ———
function update(dt) {
  const m = MODES[mode];
  let mx = 0, my = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) my -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) my += 1;
  if (keys.has('KeyA') || (!m.follow && keys.has('ArrowLeft'))) mx -= 1;
  if (keys.has('KeyD') || (!m.follow && keys.has('ArrowRight'))) mx += 1;
  if (m.follow) {
    if (keys.has('KeyQ') || keys.has('ArrowLeft')) cam.goal -= 2.4 * dt;
    if (keys.has('KeyE') || keys.has('ArrowRight')) cam.goal += 2.4 * dt;
  }
  if (touch.move) {
    const jx = (touch.move.x - touch.move.ox) / (60 * DPR), jy = (touch.move.y - touch.move.oy) / (60 * DPR), jm = Math.hypot(jx, jy);
    if (jm > 0.18) { const k = Math.min(1, (jm - 0.18) / 0.72) / jm; mx += jx * k; my += jy * k; } // dead zone
  }
  const len = Math.hypot(mx, my);
  if (len > 1) { mx /= len; my /= len; }
  let vx = mx, vy = my;
  if (m.follow) {
    const c = Math.cos(cam.yaw), s = Math.sin(cam.yaw);
    vx = -s * mx + c * -my; vy = c * mx + s * -my;
  }
  if (player.dash) {
    player.x += player.dash.vx * dt; player.y += player.dash.vy * dt;
    if ((player.dash.t -= dt) <= 0) player.dash = null;
  } else { player.x += vx * 150 * dt; player.y += vy * 150 * dt; }
  collide(player, 12);
  player.moving = Math.min(1, Math.hypot(vx, vy));
  player.walk += dt * 10 * player.moving;

  // right stick → aim angle; in chase mode its sideways push also turns the camera
  const sm = Math.hypot(rs.x, rs.y);
  stickAim = null;
  if (rs.id != null && sm > 0.25) {
    stickAim = m.follow ? cam.yaw + Math.atan2(rs.x, -rs.y) : Math.atan2(rs.y, rs.x);
    if (m.follow && !lock) {
      const side = Math.abs(rs.x) > 0.2 ? Math.sign(rs.x) * (Math.abs(rs.x) - 0.2) / 0.8 : 0;
      cam.goal += side * 2.4 * feel.sens * dt;
    }
  }

  // chase camera: turn towards the locked monster, otherwise (optional) swing slowly behind the hero while walking
  touch.drag -= dt;
  if (m.follow) {
    if (lock) {
      const off = angDiff(angTo(lock), cam.goal);
      if (Math.abs(off) > 0.08) cam.goal += off * Math.min(1, dt * 2.5);
    } else if (feel.follow && player.moving > 0.3 && -my > -0.1 && Math.abs(mx) > 0.35 && touch.drag <= 0 && stickAim == null && !locked()) {
      cam.goal += angDiff(Math.atan2(vy, vx), cam.goal) * Math.min(1, dt * 0.9) * Math.abs(mx);
    }
    cam.yaw += angDiff(cam.goal, cam.yaw) * Math.min(1, dt * 14);
  }
  if (lock && (lock.dead || dist(lock, player) > 700)) lock = null;

  // attacking: mouse / right drag (non-chase) / SERANG button / auto
  const tg = currentTarget();
  const aimTouch = !m.follow && touch.aim;
  const firing = mouse.down || stickAim != null || aimTouch || (auto && !!(tg || pickTarget(0, Infinity, 420)));
  let fireDir = player.aim;
  if (stickAim != null) fireDir = tg ? angTo(tg) : stickAim;
  else if (aimTouch) { const p = screenToGround(touch.aim.x, touch.aim.y); fireDir = Math.atan2(p.y - player.y, p.x - player.x); }
  else if (tg) fireDir = angTo(tg);
  else if (!m.follow && mouse.seen && !TOUCH) { const p = screenToGround(mouse.x, mouse.y); fireDir = Math.atan2(p.y - player.y, p.x - player.x); }
  else if (auto) { const n = pickTarget(0, Infinity, 420); if (n) fireDir = angTo(n); else if (m.follow) fireDir = cam.yaw; }
  else if (m.follow) fireDir = cam.yaw;
  player.cd -= dt; player.shot += dt; player.hurt -= dt;
  for (const k in cds) cds[k] = Math.max(0, cds[k] - dt);
  if (firing) { player.aim = fireDir; if (player.cd <= 0) { player.cd = 0.2; player.shot = 0; fireArrow(fireDir); } }
  else if (player.shot > 0.5) {
    if (!m.follow && mouse.seen && !TOUCH) player.aim = fireDir;
    else if (player.moving > 0.1) player.aim = Math.atan2(vy, vx);
  }
  player.hp = Math.min(100, player.hp + dt * 4);

  for (const a of arrows) {
    a.x += a.vx * dt; a.y += a.vy * dt; a.life -= dt;
    if (solid(a.x, a.y)) { a.life = 0; burst(a.x, a.y, a.z, '#ffe6a0', 5, 80); continue; }
    for (const e of enemies) {
      if (e.dead || a.hit.has(e) || dist(e, a) > e.r + (a.big ? 12 : 5)) continue;
      const crit = Math.random() < 0.2;
      hurtEnemy(e, crit ? a.dmg * 2 : a.dmg, crit);
      burst(a.x, a.y, a.z, crit ? '#ffd166' : '#ffb36b', crit ? 10 : 5, 110);
      a.hit.add(e);
      if (!a.pierce) { a.life = 0; break; }
    }
  }
  arrows = arrows.filter((a) => a.life > 0);

  for (const s of skills) {
    s.t += dt; s.next -= dt;
    while (s.next <= 0 && s.t < s.dur - 0.3) {
      s.next += s.rate;
      const a = Math.random() * TAU, d = Math.sqrt(Math.random()) * s.r;
      parts.push({ fall: true, x: s.x + Math.cos(a) * d, y: s.y + Math.sin(a) * d, z: 260, vz: -620, life: 1, max: 1, color: s.color, size: 3, dmg: s.dmg });
    }
  }
  skills = skills.filter((s) => s.t < s.dur);
  ultDark = Math.max(0, ultDark - dt);

  for (const p of parts) {
    p.x += (p.vx || 0) * dt; p.y += (p.vy || 0) * dt; p.z += p.vz * dt; p.life -= dt;
    if (p.fall) {
      if (p.z <= 0) {
        p.life = 0; shake.amp = Math.max(shake.amp, 2.5);
        burst(p.x, p.y, 2, p.color, 6, 130);
        for (const e of enemies) if (dist(e, p) < e.r + 26) hurtEnemy(e, p.dmg);
      }
    } else {
      p.vz -= 520 * dt;
      if (p.z < 0) { p.z = 0; p.vz *= -0.35; p.vx *= 0.6; p.vy *= 0.6; }
    }
  }
  parts = parts.filter((p) => p.life > 0);

  for (const e of enemies) {
    const T = TYPES[e.type];
    e.t += dt; e.flash -= dt; e.freeze -= dt;
    const dx = player.x - e.x, dy = player.y - e.y, d = Math.hypot(dx, dy) || 1;
    if (e.freeze <= 0) {
      let sp = T.spd;
      if (T.shoot && d < 190) sp = -T.spd * 0.6;
      if (T.shoot && d < 260 && d > 150) sp = 0;
      e.x += (dx / d) * sp * dt; e.y += (dy / d) * sp * dt;
    }
    for (const o of enemies) {
      if (o === e) continue;
      const ox = e.x - o.x, oy = e.y - o.y, od = Math.hypot(ox, oy), lim = e.r + o.r;
      if (od > 0 && od < lim) { e.x += (ox / od) * (lim - od) * 0.5; e.y += (oy / od) * (lim - od) * 0.5; }
    }
    collide(e, e.r);
    if (e.freeze > 0) continue;
    if (T.shoot) {
      e.fire -= dt;
      if (e.fire <= 0 && d < 400) {
        e.fire = rand(1.8, 2.8);
        shots.push({ x: e.x, y: e.y, z: 14 + (T.fly || 0) * 0.5, vx: (dx / d) * 190, vy: (dy / d) * 190, life: 2.5, color: T.shoot });
      }
    }
    if (T.boss) {
      e.slam -= dt;
      if (e.slam <= 0 && d < 520) { e.slam = 3.2; slams.push({ x: player.x, y: player.y, r: 78, t: 0, dur: 1.2 }); }
    }
    if (d < e.r + 12 && player.hurt <= 0 && !player.dash) { player.hp -= 6; player.hurt = 0.5; }
  }
  enemies = enemies.filter((e) => !e.dead);
  const normal = enemies.filter((e) => !TYPES[e.type].boss).length;
  if (normal < 8 && Math.random() < dt * 1.2) spawnEdge();
  if (!enemies.some((e) => TYPES[e.type].boss)) { bossTimer -= dt; if (bossTimer <= 0) spawn('boss', RW / 2, 130); }

  for (const s of shots) {
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
    if (solid(s.x, s.y)) s.life = 0;
    else if (dist(s, player) < 14 && !player.dash) { s.life = 0; player.hp -= 8; player.hurt = 0.4; burst(s.x, s.y, s.z, s.color, 8, 90); }
  }
  shots = shots.filter((s) => s.life > 0);

  for (const s of slams) {
    s.t += dt;
    if (s.t >= s.dur && !s.done) {
      s.done = true; shake.amp = 9;
      burst(s.x, s.y, 2, '#ff5a4a', 26, 220);
      if (dist(player, s) < s.r && !player.dash) { player.hp -= 25; player.hurt = 0.6; }
    }
  }
  slams = slams.filter((s) => s.t < s.dur + 0.35);

  for (const n of nums) { n.life -= dt; n.z += dt * 40; }
  nums = nums.filter((n) => n.life > 0);
  if (player.hp <= 0) player.hp = 100;

  shake.amp *= Math.exp(-dt * 9);
  shake.x = (Math.random() - 0.5) * shake.amp * DPR; shake.y = (Math.random() - 0.5) * shake.amp * DPR;
}

// ——— draw ———
const FLOOR = [66, 57, 80], FLOOR2 = [54, 64, 56], WALL = [104, 86, 116], CAP = [78, 66, 88], PILL = [112, 98, 124];

function draw(t) {
  setupCamera();
  lights.length = 0;
  for (const L of TORCHES) lights.push({ x: L.x, y: L.y, r: 280, k: 0.7 + 0.08 * Math.sin(t * 9 + L.ph), warm: true });
  lights.push({ x: player.x, y: player.y, r: 190, k: 0.55 });
  for (const s of skills) lights.push({ x: s.x, y: s.y, r: s.r * 1.6, k: 0.6, warm: true });
  for (const s of slams) lights.push({ x: s.x, y: s.y, r: s.r * 1.4, k: 0.5 * Math.min(1, s.t / s.dur), red: true });

  g.setTransform(1, 0, 0, 1, 0, 0);
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#05030a'); sky.addColorStop(1, '#120c1c');
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  g.lineJoin = 'round';

  // floor
  for (const T of TILES) {
    const cx = T.x + TILE / 2, cy = T.y + TILE / 2;
    poly([[T.x, T.y, 0], [T.x + TILE, T.y, 0], [T.x + TILE, T.y + TILE, 0], [T.x, T.y + TILE, 0]], lit(T.h ? FLOOR2 : FLOOR, cx, cy, T.v), 'rgba(6,4,10,.6)', 1.2);
  }

  // floor decals: shadows, level ring, lock ring, telegraphs, skill circles, reticle
  for (const e of enemies) poly(circlePts(e.x, e.y, e.r * 0.95, 0.3, 18), 'rgba(0,0,0,.4)');
  poly(circlePts(player.x, player.y, 11, 0.3, 18), 'rgba(0,0,0,.45)');
  g.globalCompositeOperation = 'lighter';
  poly(circlePts(player.x, player.y, 22, 0.6), null, 'rgba(255,200,90,.55)', 1.4);
  for (let i = 0; i < 8; i++) {
    const a = t * 0.6 + (i / 8) * TAU;
    line3([player.x + Math.cos(a) * 18, player.y + Math.sin(a) * 18, 0.6], [player.x + Math.cos(a + 0.2) * 26, player.y + Math.sin(a + 0.2) * 26, 0.6], 'rgba(255,200,90,.6)', 1.4 * DPR);
  }
  if (lock) {
    const r = lock.r + 8 + Math.sin(t * 6) * 2;
    poly(circlePts(lock.x, lock.y, r, 0.6, 32), null, 'rgba(255,70,90,.95)', 2.2);
    for (let i = 0; i < 4; i++) {
      const a = t * 2 + (i / 4) * TAU;
      line3([lock.x + Math.cos(a) * (r + 2), lock.y + Math.sin(a) * (r + 2), 0.6], [lock.x + Math.cos(a) * (r + 10), lock.y + Math.sin(a) * (r + 10), 0.6], 'rgba(255,70,90,.95)', 2.2 * DPR);
    }
  }
  for (const s of slams) {
    const k = Math.min(1, s.t / s.dur);
    poly(circlePts(s.x, s.y, s.r), `rgba(255,40,40,${0.12 + 0.12 * k})`, 'rgba(255,80,70,.9)', 2);
    poly(circlePts(s.x, s.y, s.r * k), 'rgba(255,60,50,.35)');
    if (s.done) poly(circlePts(s.x, s.y, s.r * (1 + (s.t - s.dur) * 3)), null, `rgba(255,160,120,${1 - (s.t - s.dur) / 0.35})`, 3);
  }
  for (const s of skills) {
    const k = Math.min(1, s.t / 0.2), fade = Math.min(1, (s.dur - s.t) / 0.3), c = s.ring;
    poly(circlePts(s.x, s.y, s.r * k, 0.6, 48), `rgba(${c},${0.12 * fade})`, `rgba(${c},${0.9 * fade})`, 2.2);
    poly(circlePts(s.x, s.y, s.r * 0.72 * k, 0.6, 48), null, `rgba(${c},${0.6 * fade})`, 1.4);
    for (let i = 0; i < 12; i++) {
      const a = s.t * 1.4 + (i / 12) * TAU, r0 = s.r * 0.76 * k, r1 = s.r * 0.95 * k;
      line3([s.x + Math.cos(a) * r0, s.y + Math.sin(a) * r0, 0.6], [s.x + Math.cos(a + 0.12) * r1, s.y + Math.sin(a + 0.12) * r1, 0.6], `rgba(${c},${fade})`, 1.6 * DPR);
    }
    for (let i = 0; i < 3; i++) {
      const a = -s.t * 0.9 + (i / 3) * TAU, b = a + TAU / 3, r = s.r * 0.72 * k;
      line3([s.x + Math.cos(a) * r, s.y + Math.sin(a) * r, 0.6], [s.x + Math.cos(b) * r, s.y + Math.sin(b) * r, 0.6], `rgba(${c},${0.7 * fade})`, 1.2 * DPR);
    }
  }
  const ap = aimPoint();
  if (!lock) poly(circlePts(ap.x, ap.y, 10, 0.6, 24), null, 'rgba(255,255,255,.5)', 1.2);
  g.globalCompositeOperation = 'source-over';

  // everything standing: sorted far → near
  const items = [];
  const push = (d, fn) => items.push({ d, fn });
  for (const w of WALLS) {
    const [ax, ay] = w.a, [bx, by] = w.b, [nx, ny] = w.n;
    const cx = (ax + bx) / 2, cy = (ay + by) / 2;
    const ox = -nx * WT, oy = -ny * WT;
    const cap = [[ax, ay, WH], [bx, by, WH], [bx + ox, by + oy, WH], [ax + ox, ay + oy, WH]];
    const dc = toCam(cx + ox / 2, cy + oy / 2, WH)[2];
    push(dc, () => poly(cap, lit(CAP, cx, cy, 0.9), 'rgba(6,4,10,.6)', 1));
    if ((cam.x - cx) * nx + (cam.y - cy) * ny <= 0) continue;
    const d = toCam(cx, cy, WH / 2)[2];
    push(d, () => {
      const lx = cx + nx * 20, ly = cy + ny * 20;
      poly([[ax, ay, 0], [bx, by, 0], [bx, by, WH], [ax, ay, WH]], lit(WALL, lx, ly, 0.95), 'rgba(6,4,10,.7)', 1.2);
      const mortar = 'rgba(10,6,16,.55)';
      for (const z of [WH / 3, (WH * 2) / 3]) line3([ax, ay, z], [bx, by, z], mortar, DPR);
      const mx = (ax + bx) / 2, my = (ay + by) / 2;
      line3([mx, my, 0], [mx, my, WH / 3], mortar, DPR);
      line3([(ax + mx) / 2, (ay + my) / 2, WH / 3], [(ax + mx) / 2, (ay + my) / 2, (WH * 2) / 3], mortar, DPR);
      line3([mx, my, (WH * 2) / 3], [mx, my, WH], mortar, DPR);
    });
  }
  const pc = toCam(player.x, player.y, 0);
  for (const p of PILLARS) {
    const faces = [
      [[p.x - p.s, p.y - p.s], [p.x + p.s, p.y - p.s], [0, -1]],
      [[p.x + p.s, p.y - p.s], [p.x + p.s, p.y + p.s], [1, 0]],
      [[p.x + p.s, p.y + p.s], [p.x - p.s, p.y + p.s], [0, 1]],
      [[p.x - p.s, p.y + p.s], [p.x - p.s, p.y - p.s], [-1, 0]],
    ];
    const dp = toCam(p.x, p.y, p.h / 2)[2];
    const fade = mode !== 'top' && dp < pc[2] && Math.hypot(p.x - player.x, p.y - player.y) < 150 ? 0.35 : 1;
    for (const [[ax, ay], [bx, by], [nx, ny]] of faces) {
      const cx = (ax + bx) / 2, cy = (ay + by) / 2;
      if ((cam.x - cx) * nx + (cam.y - cy) * ny <= 0) continue;
      push(toCam(cx, cy, p.h / 2)[2], () => {
        g.globalAlpha = fade;
        poly([[ax, ay, 0], [bx, by, 0], [bx, by, p.h], [ax, ay, p.h]], lit(PILL, cx + nx * 30, cy + ny * 30, nx < 0 || ny < 0 ? 1 : 0.8), 'rgba(6,4,10,.7)', 1.2);
        line3([ax, ay, p.h * 0.15], [bx, by, p.h * 0.15], 'rgba(10,6,16,.5)', DPR);
        line3([ax, ay, p.h * 0.85], [bx, by, p.h * 0.85], 'rgba(10,6,16,.5)', DPR);
        g.globalAlpha = 1;
      });
    }
    push(toCam(p.x, p.y, p.h)[2] - 1, () => {
      g.globalAlpha = fade;
      poly([[p.x - p.s - 3, p.y - p.s - 3, p.h], [p.x + p.s + 3, p.y - p.s - 3, p.h], [p.x + p.s + 3, p.y + p.s + 3, p.h], [p.x - p.s - 3, p.y + p.s + 3, p.h]], lit(CAP, p.x, p.y, 1.1), 'rgba(6,4,10,.7)', 1.2);
      g.globalAlpha = 1;
    });
  }

  const billboard = (x, y, z, fn) => {
    const c = toCam(x, y, z);
    if (c[2] < NEAR * 3) return false;
    push(c[2], () => fn(PX(c), PY(c), cam.F / c[2]));
    return true;
  };
  // which way "right" is on screen for something at (x, y) looking along angle a
  const screenSide = (x, y, a, prev) => {
    const c0 = toCam(x, y, 0), c1 = toCam(x + Math.cos(a) * 20, y + Math.sin(a) * 20, 0);
    if (c0[2] < NEAR || c1[2] < NEAR) return prev;
    const dx = PX(c1) - PX(c0);
    return Math.abs(dx) < 7 * DPR ? prev : Math.sign(dx);
  };

  for (const L of TORCHES) {
    billboard(L.x, L.y, 46, (X, Y, k) => {
      const f = 1 + 0.12 * Math.sin(t * 13 + L.ph);
      glow(X, Y, 34 * k * f, '#ff9a3a', 0.8);
      g.save(); g.translate(X, Y); g.scale(k, k);
      g.fillStyle = '#3a2a22'; g.fillRect(-1.5, 2, 3, 9);
      g.beginPath(); g.moveTo(0, -9 * f); g.quadraticCurveTo(5, -2, 0, 3); g.quadraticCurveTo(-5, -2, 0, -9 * f);
      g.fillStyle = '#ffb347'; g.fill();
      g.beginPath(); g.moveTo(0, -5 * f); g.quadraticCurveTo(2.5, -1, 0, 2); g.quadraticCurveTo(-2.5, -1, 0, -5 * f);
      g.fillStyle = '#fff1b0'; g.fill();
      g.restore();
    });
  }

  player.side = screenSide(player.x, player.y, player.aim, player.side);
  billboard(player.x, player.y, 0, (X, Y, k) => {
    g.save(); g.translate(X, Y); g.scale(k * player.side, k);
    if (player.hurt > 0 && ((t * 20) | 0) % 2) g.globalAlpha = 0.5;
    if (player.dash) g.globalAlpha = 0.6;
    drawDoll(g, 'archer', LOOK, { t, moving: player.moving, walk: player.walk, attack: Math.max(0, 1 - player.shot / 0.18), hurt: player.hurt > 0 });
    g.restore();
  });

  for (const e of enemies) {
    const T = TYPES[e.type], fly = T.fly && e.freeze <= 0 ? T.fly + Math.sin(e.t * 4) * 4 : T.fly || 0;
    e.side = screenSide(e.x, e.y, angTo(e) + Math.PI, e.side || 1);
    e.sx = null;
    billboard(e.x, e.y, fly, (X, Y, k) => {
      const b = baked(e.type, e.r), s = b.ext * k, cy = Y - e.r * k;
      e.sx = X; e.sy = cy; e.sr = e.r * k;
      g.save(); g.translate(X, cy); g.scale(e.side, 1);
      g.drawImage(b.img, -s, -s, s * 2, s * 2);
      if (e.flash > 0) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.6; g.drawImage(b.img, -s, -s, s * 2, s * 2); }
      g.restore();
      if (e.freeze > 0) glow(X, cy, e.r * 1.6 * k, '#7fd8ff', 0.55);
      if (T.boss || e.hp < e.max || e === lock) {
        const w = (T.boss ? 70 : 26) * k, y = Y - (e.r * 2 + 8 + (T.boss ? 6 : 0)) * k;
        g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(X - w / 2, y, w, 3 * k);
        g.fillStyle = T.boss ? '#ff4d6d' : '#ff8a5c'; g.fillRect(X - w / 2, y, (w * Math.max(0, e.hp)) / e.max, 3 * k);
      }
    });
  }

  for (const a of arrows) {
    billboard(a.x, a.y, a.z, (X, Y, k) => {
      const tail = toCam(a.x - a.vx * (a.big ? 0.06 : 0.035), a.y - a.vy * (a.big ? 0.06 : 0.035), a.z);
      if (tail[2] > NEAR) {
        g.beginPath(); g.moveTo(PX(tail), PY(tail)); g.lineTo(X, Y);
        g.lineWidth = Math.max(1, (a.big ? 5 : 2.2) * k); g.strokeStyle = a.big ? '#bfeaff' : '#ffe6a0'; g.lineCap = 'round'; g.stroke();
      }
      glow(X, Y, (a.big ? 20 : 9) * k, a.big ? '#6fc8ff' : '#ffb347', 0.9);
    });
  }
  for (const s of shots) billboard(s.x, s.y, s.z, (X, Y, k) => { glow(X, Y, 14 * k, s.color, 1); g.beginPath(); g.arc(X, Y, 4 * k, 0, TAU); g.fillStyle = s.color; g.fill(); });
  for (const p of parts) {
    billboard(p.x, p.y, p.z, (X, Y, k) => {
      if (p.fall) {
        const top = toCam(p.x, p.y, p.z + 40);
        if (top[2] > NEAR) { g.beginPath(); g.moveTo(PX(top), PY(top)); g.lineTo(X, Y); g.lineWidth = Math.max(1, 2.4 * k); g.strokeStyle = 'rgba(255,240,200,.9)'; g.lineCap = 'round'; g.stroke(); }
        glow(X, Y, 8 * k, p.color, 1);
      } else glow(X, Y, p.size * 2.4 * k, p.color, Math.min(1, (p.life / p.max) * 1.6));
    });
  }

  items.sort((a, b) => b.d - a.d);
  for (const it of items) it.fn();

  // damage numbers
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const n of nums) {
    const c = toCam(n.x, n.y, n.z);
    if (c[2] < NEAR) continue;
    const k = clamp((cam.F / c[2]) / (cam.F / pc[2] || 1), 0.55, 1.6);
    g.font = `700 ${(n.crit ? 22 : 15) * DPR * k}px Fredoka, sans-serif`;
    g.globalAlpha = Math.min(1, n.life * 2.5);
    g.lineWidth = 3 * DPR; g.strokeStyle = '#1a0e14'; g.strokeText(n.v, PX(c), PY(c));
    g.fillStyle = n.crit ? '#ffd166' : '#fff'; g.fillText(n.v, PX(c), PY(c));
    g.globalAlpha = 1;
  }

  // vignette, ultimate darkening, hurt flash
  const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.6);
  vg.addColorStop(0, 'rgba(5,3,10,0)'); vg.addColorStop(1, 'rgba(5,3,10,.7)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
  if (ultDark > 0) { g.fillStyle = `rgba(10,20,60,${0.25 * Math.min(1, ultDark)})`; g.fillRect(0, 0, W, H); }
  if (player.hurt > 0) { g.fillStyle = `rgba(255,30,40,${player.hurt * 0.35})`; g.fillRect(0, 0, W, H); }

  drawOffscreen();
  drawHud(ap);
}

// red arrows at the screen edge for monsters out of view (behind the camera or off the sides)
function drawOffscreen() {
  const mx = 34 * DPR, my = 34 * DPR;
  for (const e of enemies) {
    const d = dist(e, player);
    if (d > 520) continue;
    const c = toCam(e.x, e.y, 10);
    if (c[2] > NEAR) {
      const X = PX(c), Y = PY(c);
      if (X > 0 && X < W && Y > 0 && Y < H) continue;
    }
    const a = Math.atan2(c[0], c[2]); // 0 = straight ahead
    const X = clamp(W / 2 + Math.sin(a) * W, mx, W - mx), Y = clamp(H / 2 - Math.cos(a) * H, my + 40 * DPR, H - my);
    const boss = TYPES[e.type].boss, s = (boss ? 15 : 10) * DPR, al = 0.45 + 0.55 * (1 - d / 520);
    g.save(); g.translate(X, Y); g.rotate(a);
    g.globalAlpha = al;
    g.beginPath(); g.moveTo(0, -s); g.lineTo(s * 0.8, s * 0.6); g.lineTo(-s * 0.8, s * 0.6); g.closePath();
    g.fillStyle = boss ? '#ff4d6d' : '#ff6a5a'; g.fill();
    g.lineWidth = 2 * DPR; g.strokeStyle = boss ? '#ffd166' : 'rgba(0,0,0,.6)'; g.stroke();
    g.restore();
  }
}

function drawHud(ap) {
  g.textAlign = 'left'; g.textBaseline = 'top';
  g.font = `600 ${14 * DPR}px Fredoka, sans-serif`;
  g.fillStyle = '#f4f0ff'; g.fillText(MODES[mode].label, 14 * DPR, 12 * DPR);
  const bw = 160 * DPR;
  g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(14 * DPR, 34 * DPR, bw, 8 * DPR);
  g.fillStyle = '#ff5a6a'; g.fillRect(14 * DPR, 34 * DPR, (bw * Math.max(0, player.hp)) / 100, 8 * DPR);
  g.fillStyle = '#a9a2c4';
  const info = [`Kill ${kills}`, `${fps} FPS`, RS < 1 ? `resolusi ${Math.round(RS * 100)}%` : ''].filter(Boolean).join(' · ');
  g.fillText(info, 14 * DPR, 48 * DPR);
  if (!TOUCH) {
    const line = Object.entries(SKILLS).map(([k, s]) => (cds[k] > 0 ? `${k}:${cds[k].toFixed(1)}` : `${k}:siap`)).join('  ');
    g.fillText(line, 14 * DPR, 66 * DPR);
    g.fillStyle = auto ? '#ffc94d' : '#a9a2c4';
    g.fillText(`Auto ${auto ? 'NYALA' : 'mati'} (R) · Kunci ${lock ? 'NYALA' : 'mati'} (F)`, 14 * DPR, 84 * DPR);
  }
  if (MODES[mode].follow && !locked() && !TOUCH) {
    g.textAlign = 'center'; g.fillStyle = '#ffc94d';
    g.fillText('Klik kanvas untuk mengunci mouse & berputar', W / 2, H - 30 * DPR);
  }
  if (MODES[mode].follow && !lock) { // crosshair
    const c = toCam(ap.x, ap.y, 22);
    if (c[2] > NEAR) {
      const X = PX(c), Y = PY(c), s = 7 * DPR;
      g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1.5 * DPR;
      g.beginPath(); g.moveTo(X - s, Y); g.lineTo(X - s / 3, Y); g.moveTo(X + s / 3, Y); g.lineTo(X + s, Y);
      g.moveTo(X, Y - s); g.lineTo(X, Y - s / 3); g.moveTo(X, Y + s / 3); g.lineTo(X, Y + s); g.stroke();
    }
  }
  if (touch.move) { // joystick
    const m = touch.move, R = 60 * DPR;
    g.beginPath(); g.arc(m.ox, m.oy, R, 0, TAU); g.fillStyle = 'rgba(255,255,255,.08)'; g.fill();
    g.lineWidth = 2 * DPR; g.strokeStyle = 'rgba(255,255,255,.25)'; g.stroke();
    g.beginPath(); g.arc(m.x, m.y, 26 * DPR, 0, TAU); g.fillStyle = 'rgba(255,255,255,.35)'; g.fill();
  } else if (TOUCH) {
    g.textAlign = 'left'; g.fillStyle = 'rgba(255,255,255,.35)';
    g.fillText('geser di sini untuk jalan', 24 * DPR, H - 30 * DPR);
  }
}

// ——— UI ———
const tabs = $('tabs');
for (const [id, m] of Object.entries(MODES)) {
  const b = document.createElement('button');
  b.textContent = m.label; b.dataset.id = id;
  b.onclick = () => setMode(id);
  tabs.append(b);
}
function syncSliders() {
  $('pitch').value = view.pitch; $('pitchV').textContent = `${view.pitch}°`;
  $('dist').value = view.dist; $('distV').textContent = view.dist;
}
function setMode(id) {
  const was = MODES[mode];
  mode = id;
  const m = MODES[id];
  Object.assign(view, { pitch: m.pitch, dist: m.dist, fov: m.fov });
  if (!m.follow && locked()) document.exitPointerLock();
  if (m.follow && !was.follow) cam.yaw = cam.goal = player.aim;
  for (const b of tabs.children) b.classList.toggle('on', b.dataset.id === id);
  $('help').innerHTML = m.help;
  syncSliders();
}
$('pitch').oninput = (e) => { view.pitch = +e.target.value; syncSliders(); };
$('dist').oninput = (e) => { view.dist = +e.target.value; syncSliders(); };
$('sens').oninput = (e) => { feel.sens = +e.target.value; $('sensV').textContent = `${feel.sens.toFixed(1)}×`; };
$('follow').onchange = (e) => { feel.follow = e.target.checked; };
const q = params.get('mode');
setMode(MODES[q] ? q : 'chase');

// frame loop; lowers the render scale when the frame rate stays low
let last = performance.now(), fps = 60, fpsAcc = 0, fpsN = 0, slow = 0;
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  fpsAcc += dt; fpsN++;
  if (fpsAcc > 0.5) {
    fps = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0;
    slow = fps < 45 ? slow + 1 : 0;
    if (slow >= 4 && RS > 0.55) { RS = Math.round((RS - 0.15) * 100) / 100; slow = 0; resize(); }
  }
  update(dt);
  for (const k in cds) $(`s${k}`).style.setProperty('--p', cds[k] / SKILLS[k].cd);
  try { draw(now / 1000); } catch (err) { console.error(err); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
