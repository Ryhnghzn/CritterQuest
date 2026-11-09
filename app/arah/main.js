// Facing prototype (app/arah.html): the same little scene drawn twice.
//  Lama — how the game does it now: facing from the WORLD x axis, an instant mirror flip.
//  Baru — A: facing from the direction ON SCREEN (follows the camera turn),
//         B: a paper turn (the sprite narrows to a sliver and widens mirrored, with a hop)
//            and a lean into the walk.
// Plain canvas 2D with a turnable ground plane, not the game's three.js stage.
import { drawDoll } from '../src/art/doll.js';
import { MAJESTIC_MOUNTS, drawMajesticRidden } from '../src/art/mounts.js';
import { MONSTER_ART } from '../src/art/monsters.js';
import { drawWarriorView, drawNpcView } from './pose.js';

const TURN = 0.16;   // s, one paper turn
const LEAN = 0.11;   // rad at full speed
const HOP = 4;       // units, the little hop while turning
const TILT = 0.55;   // ground squash (camera pitch)
const DOLL = 1.15, MOUNT = 0.95, WOLF = 1.3;

const $ = (id) => document.getElementById(id);
const panes = [{ mode: 'old', c: $('old') }, { mode: 'new', c: $('new') }];
const cam = { yaw: 0, goal: 0, spin: false };
let slow = false, useC = true, gallery = false;

const horse = MAJESTIC_MOUNTS.find((m) => m.id === 'horse') || MAJESTIC_MOUNTS[0];
const HERO_LOOK = { hair: 1, hairColor: 2, gear: { weapon: { tier: 4, rarity: 3 }, armor: { tier: 4, rarity: 3 } } };
const RIDER = { classId: 'archer', look: { hair: 3, hairColor: 4, gear: { armor: { tier: 3, rarity: 2 } } } };
const NPC_LOOK = { hair: 4, hairColor: 1, outfit: ['#5a7a3a', '#344a22'] };

const ent = (kind, x, z, speed) => ({ kind, x, z, vx: 0, vz: 0, speed, walk: 0, view: { old: newView(), new: newView() } });
function newView() { return { face: 1, cur: 1, hopT: -9, dir: 'side', prev: 'side', dirT: -9 }; }
const hero = ent('hero', 0, 0, 110);
const rider = ent('mount', 200, -120, 80);
const npc = ent('npc', -160, 90, 45);
const wolf = ent('wolf', 90, 40, 140);
const ACTORS = [hero, rider, npc, wolf];
const TREES = Array.from({ length: 40 }, (_, i) => ({ x: ((i * 397) % 1600) - 800, z: ((i * 733) % 1600) - 800, h: 50 + (i * 37) % 40 }))
  .filter((p) => Math.hypot(p.x, p.z) > 120);

// ─── input ────────────────────────────────────────────────────────────────
const keys = new Set();
addEventListener('keydown', (e) => {
  keys.add(e.key.toLowerCase());
  if (e.key === 'q' || e.key === 'Q') cam.goal -= Math.PI / 2;
  if (e.key === 'e' || e.key === 'E') cam.goal += Math.PI / 2;
});
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
$('left').onclick = () => { cam.goal -= Math.PI / 2; };
$('right').onclick = () => { cam.goal += Math.PI / 2; };
$('spin').onclick = (e) => { cam.spin = !cam.spin; e.target.classList.toggle('on', cam.spin); };
$('slow').onclick = (e) => { slow = !slow; e.target.classList.toggle('on', slow); };
const setC = () => {
  $('cbtn').classList.toggle('on', useC);
  $('newname').textContent = useC ? 'Baru (A + B + C)' : 'Baru (A + B)';
  $('newnote').textContent = useC ? 'arah ikut kamera + pose depan & belakang (Warrior & warga)' : 'arah ikut kamera, berbalik seperti kertas + condong';
};
$('cbtn').onclick = () => { useC = !useC; setC(); };
$('gal').onclick = (e) => { gallery = !gallery; e.target.classList.toggle('on', gallery); $('gallery').hidden = !gallery; };
setC();

let target = null, idle = 0;
for (const p of panes) {
  let down = null;
  p.c.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, drag: false }; p.c.setPointerCapture(e.pointerId); });
  p.c.addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - down.x;
    if (!down.drag && Math.abs(dx) > 6) down.drag = true;
    if (down.drag) { cam.yaw += dx * 0.008; cam.goal = cam.yaw; down.x = e.clientX; }
  });
  p.c.addEventListener('pointerup', (e) => {
    if (down && !down.drag) { // a tap: walk there
      const r = p.c.getBoundingClientRect(), k = r.height / 320;
      const rx = (e.clientX - r.left - r.width / 2) / k, rz = (e.clientY - r.top - r.height * 0.58) / (k * TILT);
      const c = Math.cos(cam.yaw), s = Math.sin(cam.yaw);
      target = { x: hero.x + rx * c + rz * s, z: hero.z - rx * s + rz * c };
    }
    down = null;
  });
}

// ─── simulation ───────────────────────────────────────────────────────────
// world → view: rx right on screen, rz toward the camera (down on screen)
const toView = (x, z) => { const c = Math.cos(cam.yaw), s = Math.sin(cam.yaw); return [x * c - z * s, x * s + z * c]; };
let npcGoal = null, npcWait = 0, wolfDir = 1, wolfT = 0;

function moveTo(e, gx, gz, dt) {
  const dx = gx - e.x, dz = gz - e.z, d = Math.hypot(dx, dz);
  if (d < 4) return true;
  const step = Math.min(d, e.speed * dt);
  e.x += (dx / d) * step; e.z += (dz / d) * step;
  return false;
}
function step(t, dt) {
  if (cam.spin) cam.goal += dt * 0.6;
  cam.yaw += (cam.goal - cam.yaw) * Math.min(1, dt * 9);
  for (const a of ACTORS) { a.px = a.x; a.pz = a.z; }

  // hero: keys (screen directions) > tap target > wander when left alone
  let ix = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
  let iy = (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0);
  if (ix || iy) {
    target = null; idle = 0;
    const n = Math.hypot(ix, iy); ix /= n; iy /= n;
    const c = Math.cos(cam.yaw), s = Math.sin(cam.yaw);
    hero.x += (ix * c + iy * s) * hero.speed * dt; hero.z += (-ix * s + iy * c) * hero.speed * dt;
  } else if (target) {
    idle = 0;
    if (moveTo(hero, target.x, target.z, dt)) target = null;
  } else if ((idle += dt) > 2.5) {
    const a = Math.random() * Math.PI * 2;
    target = { x: Math.cos(a) * 160, z: Math.sin(a) * 160 }; idle = 0;
  }

  // the rider circles, the villager strolls and stops, the wolf circles the hero
  const ang = t * 0.5;
  rider.x = 200 + Math.cos(ang) * 150; rider.z = -120 + Math.sin(ang) * 150;
  if (npcWait > 0) npcWait -= dt;
  else {
    npcGoal ||= { x: -160 + (Math.random() - 0.5) * 220, z: 90 + (Math.random() - 0.5) * 160 };
    if (moveTo(npc, npcGoal.x, npcGoal.z, dt)) { npcGoal = null; npcWait = 1.2; }
  }
  if ((wolfT += dt) > 4) { wolfT = 0; wolfDir = -wolfDir; }
  const wa = Math.atan2(wolf.z - hero.z, wolf.x - hero.x) + wolfDir * dt * 1.1;
  moveTo(wolf, hero.x + Math.cos(wa) * 90, hero.z + Math.sin(wa) * 90, dt);

  for (const a of ACTORS) {
    a.vx = (a.x - a.px) / dt; a.vz = (a.z - a.pz) / dt;
    const sp = Math.hypot(a.vx, a.vz);
    a.moving = Math.min(1, sp / (a.speed * 0.5));
    a.walk += a.moving * dt * 13;
    updateFacing(a, t, dt);
  }
}

function updateFacing(a, t, dt) {
  // Lama: world x (the hero by its aim/move x, the wolf: hero.x < wolf.x)
  const o = a.view.old;
  const wx = a.kind === 'wolf' ? hero.x - a.x : a.vx;
  if (Math.abs(wx) > 6) o.face = Math.sign(wx);
  o.cur = o.face;
  // Baru: the same rule, measured on screen
  const n = a.view.new;
  const [sx] = a.kind === 'wolf' ? toView(hero.x - a.x, hero.z - a.z) : toView(a.vx, a.vz);
  const f = Math.abs(sx) > 6 ? Math.sign(sx) : n.face;
  if (f !== n.face) { n.face = f; n.hopT = t; }
  const rate = (2 / TURN) * dt;
  n.cur += Math.max(-rate, Math.min(rate, n.face - n.cur));
  // C: walking toward the camera → front, away → back, across → side (with a dead band)
  if (a.kind !== 'hero' && a.kind !== 'npc') return;
  const [vx, vz] = toView(a.vx, a.vz), sp = Math.hypot(vx, vz);
  let d = n.dir;
  if (sp > a.speed * 0.3) {
    if (Math.abs(vz) > Math.abs(vx) * 1.25) d = vz > 0 ? 'front' : 'back';
    else if (Math.abs(vx) > Math.abs(vz) * 0.95) d = 'side';
  } else if (a.kind === 'npc') d = 'front'; // standing townsfolk look at the camera
  if (d !== n.dir) { n.prev = n.dir; n.dir = d; n.dirT = t; }
}

// ─── drawing ──────────────────────────────────────────────────────────────
const dpr = () => Math.min(devicePixelRatio || 1, 2);
function fit(c) {
  const w = Math.round(c.clientWidth * dpr()), h = Math.round(c.clientHeight * dpr());
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  return c.getContext('2d');
}
const smooth = (x) => x * x * (3 - 2 * x);

function drawPane(p, t) {
  const g = fit(p.c), W = p.c.width, H = p.c.height, k = H / 320, cx = W / 2, cy = H * 0.58;
  const scr = (x, z) => { const [rx, rz] = toView(x - hero.x, z - hero.z); return [cx + rx * k, cy + rz * k * TILT, rz]; };
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#141a12'; g.fillRect(0, 0, W, H);
  // ground grid (world-aligned, so the camera turn is visible)
  g.strokeStyle = 'rgba(200,190,150,.10)'; g.lineWidth = 1 * dpr();
  const G = 80, R = 900, ox = Math.round(hero.x / G) * G, oz = Math.round(hero.z / G) * G;
  for (let i = -R; i <= R; i += G) {
    let [a, b] = [scr(ox + i, oz - R), scr(ox + i, oz + R)];
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    [a, b] = [scr(ox - R, oz + i), scr(ox + R, oz + i)];
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
  }
  if (target) { const [tx, ty] = scr(target.x, target.z); g.strokeStyle = 'rgba(232,207,142,.6)'; g.beginPath(); g.ellipse(tx, ty, 8 * k, 8 * k * TILT, 0, 0, 7); g.stroke(); }

  // everything upright, back to front
  const list = [
    ...TREES.map((tr) => ({ tr, at: scr(tr.x, tr.z) })),
    ...ACTORS.map((a) => ({ a, at: scr(a.x, a.z) })),
  ].filter((d) => d.at[0] > -150 * k && d.at[0] < W + 150 * k && d.at[1] > -60 * k && d.at[1] < H + 150 * k)
    .sort((u, v) => u.at[2] - v.at[2]);
  for (const d of list) {
    g.setTransform(k, 0, 0, k, d.at[0], d.at[1]);
    if (d.tr) drawTree(g, d.tr.h);
    else drawActor(g, d.a, p.mode, t);
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  drawCompass(g, W - 46 * dpr(), H - 46 * dpr(), dpr());
}

function drawTree(g, h) {
  g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(0, 0, 16, 5, 0, 0, 7); g.fill();
  g.fillStyle = '#2a1c14'; g.fillRect(-3, -h * 0.45, 6, h * 0.45);
  g.fillStyle = '#1f3020'; g.beginPath(); g.moveTo(-18, -h * 0.35); g.lineTo(0, -h); g.lineTo(18, -h * 0.35); g.closePath(); g.fill();
}

function drawActor(g, a, mode, t) {
  const v = a.view[mode], neu = mode === 'new';
  const big = a.kind === 'mount';
  g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.ellipse(0, 0, big ? 26 : 11, big ? 6 : 3.5, 0, 0, 7); g.fill();
  let sx = v.cur;
  if (neu) {
    sx = Math.sign(v.cur || v.face) * Math.max(0.06, smooth(Math.min(1, Math.abs(v.cur))));
    const hp = (t - v.hopT) / TURN;
    if (hp >= 0 && hp < 1) g.translate(0, -Math.sin(hp * Math.PI) * HOP);
    const [vx] = toView(a.vx, a.vz);
    g.rotate(Math.max(-1, Math.min(1, vx / a.speed)) * LEAN * (big ? 0.45 : 1));
  }
  const dp = (t - v.dirT) / TURN, dir = neu && useC ? (dp < 0.5 ? v.prev : v.dir) : 'side';
  if (neu && useC && dp >= 0 && dp < 1) g.scale(1 - 0.7 * Math.sin(dp * Math.PI), 1); // a quick paper turn between views
  if (dir !== 'side' && (a.kind === 'hero' || a.kind === 'npc')) {
    g.scale(DOLL, DOLL);
    const pose = { t, moving: a.moving, walk: a.walk };
    if (a.kind === 'hero') drawWarriorView(g, dir, HERO_LOOK, pose, v.cur);
    else drawNpcView(g, dir, NPC_LOOK, pose, v.cur);
    return;
  }
  if (a.kind === 'hero') { g.scale(DOLL * sx, DOLL); drawDoll(g, 'warrior', HERO_LOOK, { t, moving: a.moving, walk: a.walk }); }
  else if (a.kind === 'npc') { g.scale(DOLL * sx, DOLL); drawDoll(g, null, NPC_LOOK, { t, moving: a.moving, walk: a.walk }); }
  else if (a.kind === 'mount') { g.scale(MOUNT * sx, MOUNT); drawMajesticRidden(g, horse, { t, m: 1, w: t * 11, skin: 0 }, RIDER, drawDoll); }
  else { g.translate(0, -12 * WOLF * 0.55); g.scale(WOLF * sx, WOLF); MONSTER_ART.wolf(g, 12); }
}

// where world +x points on screen: the "Lama" rule faces by this arrow, not by the screen
function drawCompass(g, x, y, d) {
  const [rx, rz] = toView(1, 0), L = 26 * d;
  g.strokeStyle = 'rgba(232,207,142,.25)'; g.lineWidth = d; g.beginPath(); g.arc(x, y, 32 * d, 0, 7); g.stroke();
  const ex = x + rx * L, ey = y + rz * L * TILT * 1.6;
  g.strokeStyle = '#e06a4a'; g.lineWidth = 2.5 * d; g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.stroke();
  g.fillStyle = '#e06a4a'; g.font = `700 ${11 * d}px Barlow, sans-serif`; g.textAlign = 'center';
  g.fillText('x+ dunia', x, y + 46 * d);
}

// the gallery: the three views side by side, big, walking in place
function drawGallery(t) {
  const c = $('gallery'), g = fit(c), W = c.width, H = c.height;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = 'rgba(8,6,10,.94)'; g.fillRect(0, 0, W, H);
  const walking = Math.floor(t / 4) % 2 === 0, pose = { t, moving: walking ? 1 : 0, walk: t * 9 };
  const cols = [['front', 'Depan (baru)'], ['side', 'Samping (sudah ada)'], ['back', 'Belakang (baru)']];
  const rows = [['hero', 'Warrior'], ['npc', 'Warga']];
  const cw = W / 3, rh = H / 2, k = Math.min(cw / 70, rh / 70);
  g.textAlign = 'center';
  rows.forEach(([kind, rn], ri) => cols.forEach(([dir, cn], ci) => {
    const x = cw * (ci + 0.5), y = rh * (ri + 0.86);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.ellipse(x, y, 13 * k, 3.6 * k, 0, 0, 7); g.fill();
    g.fillStyle = '#9a8f80'; g.font = `600 ${Math.max(11, 4.2 * k)}px Barlow, sans-serif`;
    g.fillText(`${rn} · ${cn}`, x, y + 9 * k);
    g.setTransform(k, 0, 0, k, x, y);
    if (dir === 'side') { g.scale(DOLL, DOLL); drawDoll(g, kind === 'hero' ? 'warrior' : null, kind === 'hero' ? HERO_LOOK : NPC_LOOK, pose); }
    else { g.scale(DOLL, DOLL); (kind === 'hero' ? drawWarriorView : drawNpcView)(g, dir, kind === 'hero' ? HERO_LOOK : NPC_LOOK, pose, 0); }
  }));
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#e8cf8e'; g.font = `700 ${Math.max(12, 4.6 * k)}px Cinzel, serif`;
  g.fillText(walking ? 'berjalan' : 'diam', W / 2, 22 * dpr());
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000) * (slow ? 0.3 : 1);
  last = now;
  const t = (frame.t = (frame.t || 0) + dt);
  if (dt > 0) step(t, dt);
  if (gallery) drawGallery(t);
  else for (const p of panes) drawPane(p, t);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
