// Quest events in the world (spec §42): field forms of a quest step that happen out there
// instead of being counted — escort someone down a road, hold an altar against waves.
// Each event waits at its start; walking close starts it; it ends in success (the quest
// step is done: run.eventsDone gets its key, main.js saves) or failure (no penalty: it
// resets and can be started again). Its enemies carry e.ev = the event's key, and those
// sent at the walker / altar carry e.target. Pure logic on the run state (run/run.js).
import { t } from '../i18n.js';
import { rand, rrange, rint } from '../core/rng.js';
import { START_R, RETRY_AFTER, TOUCH, ESCORT, DEFEND } from '../data/questev.js';
import { blocked, zoneAt } from './worldmap.js';
import { spawnGroup } from './field.js';

const hpAt = (h, level) => Math.round(h.base + h.perLevel * level);

// The events of the quests being worked on, kept across refreshes (same key = same event).
// list: [{ key, quest, kind: 'escort' | 'defend', name, start: { x, y }, route?, look?, outfit? }]
export function setEvents(run, list) {
  const old = new Map((run.events || []).map((e) => [e.key, e]));
  run.events = list.map((d) => old.get(d.key) || freshEvent(d));
  for (const e of old.values()) if (!run.events.includes(e)) clearFoes(run, e);
}

function freshEvent(d) {
  const ev = { ...d, state: 'wait', t: 0, cool: 0 };
  resetEvent(ev);
  return ev;
}

// back to the start: the walker at the head of the route, the altar whole
function resetEvent(ev) {
  ev.state = 'wait'; ev.t = 0; ev.next = 0; ev.wave = 0; ev.away = 0;
  if (ev.kind === 'escort') { ev.npc = { x: ev.route[0][0], y: ev.route[0][1], hp: 1, maxHp: 1, i: 1, waiting: false, hurtT: 0 }; }
  if (ev.kind === 'defend') { ev.altar = { x: ev.start.x, y: ev.start.y, hp: 1, maxHp: 1, hurtT: 0 }; }
}

function clearFoes(run, ev) {
  for (let i = run.enemies.length - 1; i >= 0; i--) if (run.enemies[i].ev === ev.key) run.enemies.splice(i, 1);
}

function begin(run, ev) {
  ev.state = 'run'; ev.t = 0; ev.next = 1.5;
  if (ev.kind === 'escort') { const hp = hpAt(ESCORT.hp, run.level); ev.npc.hp = ev.npc.maxHp = hp; run.showBanner(t('Kawal {name} sampai tujuan!', { name: ev.name })); }
  if (ev.kind === 'defend') { const hp = hpAt(DEFEND.hp, run.level); ev.altar.hp = ev.altar.maxHp = hp; run.showBanner(t('Pertahankan {name}!', { name: ev.name })); }
}

function fail(run, ev, why) {
  clearFoes(run, ev);
  resetEvent(ev);
  ev.cool = RETRY_AFTER;
  run.showBanner(why);
}

function succeed(run, ev) {
  clearFoes(run, ev);
  ev.state = 'done';
  run.eventsDone.push(ev.key);
  run.showBanner(t('Berhasil! Quest maju.'));
  run.addShake?.('small');
}

// a group of the zone's enemies at (x, y); `chase` of them go for the target
function sendFoes(run, ev, x, y, n, target, chase, hpMul = 1) {
  const made = spawnGroup(run, x, y, n, zoneAt(run.fmap, x, y));
  for (const e of made) {
    e.ev = ev.key;
    e.hp *= hpMul; e.maxHp *= hpMul;
    if (target && rand() < chase) e.target = target;
  }
  return made.length;
}

// a free spot at distance [a, b] from (x, y), on the side away from the player when it can
function ringSpot(run, x, y, [a, b]) {
  for (let i = 0; i < 12; i++) {
    const ang = rand() * Math.PI * 2, d = rrange(a, b), px = x + Math.cos(ang) * d, py = y + Math.sin(ang) * d;
    if (!blocked(run.fmap, px, py, 40)) return { x: px, y: py };
  }
  return null;
}

// enemies touching the guarded one wear it down; returns true when it fell
function wearDown(run, ev, who, dt) {
  let near = false;
  for (const e of run.enemies) {
    if (e.target !== who || e.hp <= 0) continue;
    const r = e.r + 18;
    if ((e.x - who.x) ** 2 + (e.y - who.y) ** 2 < r * r) { who.hp -= e.dmg * TOUCH * dt; who.hurtT = 0.15; near = true; }
  }
  if (who.hurtT > 0) who.hurtT -= dt;
  return { fell: who.hp <= 0, near };
}

function stepEscort(run, ev, dt) {
  const n = ev.npc, d2p = (run.px - n.x) ** 2 + (run.py - n.y) ** 2;
  n.waiting = d2p > ESCORT.wait * ESCORT.wait;
  if (!n.waiting && n.i < ev.route.length) { // walk on along the route
    let left = ESCORT.speed * dt;
    while (left > 0 && n.i < ev.route.length) {
      const [tx, ty] = ev.route[n.i], dx = tx - n.x, dy = ty - n.y, d = Math.hypot(dx, dy);
      if (d <= left) { n.x = tx; n.y = ty; n.i++; left -= d; } else { n.x += (dx / d) * left; n.y += (dy / d) * left; left = 0; }
    }
    n.dir = Math.sign((ev.route[Math.min(n.i, ev.route.length - 1)][0] - n.x) || n.dir || 1);
  }
  const end = ev.route[ev.route.length - 1];
  if ((n.x - end[0]) ** 2 + (n.y - end[1]) ** 2 < ESCORT.arrive * ESCORT.arrive) { succeed(run, ev); return; }
  // packs come for the walker, ahead of them
  if ((ev.next -= dt) <= 0) {
    ev.next = rrange(ESCORT.packEvery[0], ESCORT.packEvery[1]);
    const p = ringSpot(run, n.x, n.y, ESCORT.ahead);
    if (p) sendFoes(run, ev, p.x, p.y, rint(ESCORT.pack[0], ESCORT.pack[1]), n, ESCORT.chase);
  }
  const { fell, near } = wearDown(run, ev, n, dt);
  if (fell) { fail(run, ev, t('{name} tumbang. Kembali ke awal untuk mencoba lagi.', { name: ev.name })); return; }
  if (!near) n.hp = Math.min(n.maxHp, n.hp + n.maxHp * ESCORT.heal * dt);
}

function stepDefend(run, ev, dt) {
  const a = ev.altar;
  ev.t += dt;
  const W = DEFEND.waves;
  while (ev.wave < W.length && ev.t >= W[ev.wave][0]) {
    const size = W[ev.wave][1], k = 1 + DEFEND.waveMul * ev.wave;
    for (let left = size; left > 0;) {
      const p = ringSpot(run, a.x, a.y, DEFEND.ring);
      if (!p) break;
      const n = Math.min(left, 3);
      sendFoes(run, ev, p.x, p.y, n, a, DEFEND.chase, k);
      left -= n;
    }
    ev.wave++;
    run.showBanner(t('Gelombang {n}/{max}', { n: ev.wave, max: W.length }));
  }
  if (wearDown(run, ev, a, dt).fell) { fail(run, ev, t('{name} hancur. Kembali ke sana untuk mencoba lagi.', { name: ev.name })); return; }
  const far = (run.px - a.x) ** 2 + (run.py - a.y) ** 2 > DEFEND.leave * DEFEND.leave;
  ev.away = far ? ev.away + dt : 0;
  if (ev.away > DEFEND.leaveT) { fail(run, ev, t('Kamu meninggalkan {name}.', { name: ev.name })); return; }
  if (ev.t >= DEFEND.time && ev.wave >= W.length && run.enemies.filter((e) => e.ev === ev.key).length <= DEFEND.mop) succeed(run, ev);
}

export function stepEvents(run, dt) {
  for (const ev of run.events || []) {
    if (ev.state === 'done') continue;
    if (ev.cool > 0) { ev.cool -= dt; continue; }
    if (ev.state === 'wait') {
      if ((run.px - ev.start.x) ** 2 + (run.py - ev.start.y) ** 2 < START_R * START_R) begin(run, ev);
      continue;
    }
    if (ev.kind === 'escort') stepEscort(run, ev, dt);
    else if (ev.kind === 'defend') stepDefend(run, ev, dt);
  }
}

// the running event's guarded one (for the target arrow / map), else its start
export function eventPoint(ev) {
  if (ev.state === 'run' && ev.npc) return { x: ev.npc.x, y: ev.npc.y };
  if (ev.state === 'run' && ev.altar) return { x: ev.altar.x, y: ev.altar.y };
  return ev.start;
}

