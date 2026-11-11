// Quest events in the world (spec §42): field forms of a quest step that happen out there
// instead of being counted — escort someone down a road, hold an altar against waves.
// Each event waits at its start; walking close starts it; it ends in success (the quest
// step is done: run.eventsDone gets its key, main.js saves) or failure (no penalty: it
// resets and can be started again). Its enemies carry e.ev = the event's key, and those
// sent at the walker / altar carry e.target. Pure logic on the run state (run/run.js).
import { t } from '../i18n.js';
import { rand, rrange, rint } from '../core/rng.js';
import { START_R, RETRY_AFTER, TOUCH, ESCORT, DEFEND, OUTLAW, NEST, RESCUE, RACE, HAPPEN } from '../data/questev.js';
import { sample } from './fieldmap.js';
import { inHub } from './worldmap.js';
import { addMats } from './dungeon.js';
import { QUEST_REWARD } from '../data/quests.js';
import { blocked, zoneAt } from './worldmap.js';
import { spawnGroup } from './field.js';

const hpAt = (h, level) => Math.round(h.base + h.perLevel * level);

// The events of the quests being worked on, kept across refreshes (same key = same event).
// list: [{ key, quest, kind: 'escort' | 'defend', name, start: { x, y }, route?, look?, outfit? }]
export function setEvents(run, list) {
  const old = new Map((run.events || []).map((e) => [e.key, e]));
  const happenings = (run.events || []).filter((e) => e.world && e.state !== 'done'); // they are not quests: kept
  run.events = [...list.map((d) => old.get(d.key) || freshEvent(d)), ...happenings];
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
  if (ev.kind === 'outlaw') { ev.foe = null; ev.fled = false; ev.fleeT = 0; ev.lurk = ev.start; }
  if (ev.kind === 'nest') ev.nests = [];
  if (ev.kind === 'rescue') { ev.unlocked = false; ev.guards = []; }
  if (ev.kind === 'race') { ev.ring = 1; ev.medal = null; }
}

function clearFoes(run, ev) {
  for (let i = run.enemies.length - 1; i >= 0; i--) if (run.enemies[i].ev === ev.key) run.enemies.splice(i, 1);
}

function begin(run, ev) {
  ev.state = 'run'; ev.t = 0; ev.next = 1.5;
  if (ev.kind === 'escort') { const hp = hpAt(ESCORT.hp, run.level); ev.npc.hp = ev.npc.maxHp = hp; run.showBanner(t('Kawal {name} sampai tujuan!', { name: ev.name })); }
  if (ev.kind === 'defend') { const hp = hpAt(DEFEND.hp, run.level) * (ev.hpMul || 1); ev.altar.hp = ev.altar.maxHp = hp; run.showBanner(t('Pertahankan {name}!', { name: ev.name })); }
  if (ev.kind === 'outlaw') { // it shows itself, with a few of its kind
    const zone = zoneAt(run.fmap, ev.lurk.x, ev.lurk.y), [o, ...escort] = spawnGroup(run, ev.lurk.x, ev.lurk.y, 1 + OUTLAW.escort, zone, ev.enemy || null);
    o.hp *= OUTLAW.hp; o.maxHp = o.hp; o.dmg *= OUTLAW.dmg; o.r *= OUTLAW.size; o.xp *= 6;
    o.elite = true; o.mini = true; o.name = ev.name; o.x = ev.lurk.x; o.y = ev.lurk.y;
    for (const e of [o, ...escort]) e.ev = ev.key;
    ev.foe = o;
    run.showBanner(t('{name} muncul!', { name: ev.name }));
  }
  if (ev.kind === 'nest') { // the nests stand where they were; each one an enemy that does not move
    const zone = zoneAt(run.fmap, ev.start.x, ev.start.y);
    ev.nests = ev.spots.map((p) => {
      const [e] = spawnGroup(run, p.x, p.y, 1, zone);
      e.hp *= NEST.hp; e.maxHp = e.hp; e.dmg = 0; e.speed = 0; e.r = NEST.size; e.elite = false;
      e.nest = ev.key; e.ev = ev.key; e.mini = true; e.x = p.x; e.y = p.y; e.home = p; e.sendT = rrange(1, NEST.every[0]);
      return e;
    });
    run.showBanner(t('Hancurkan {name}!', { name: ev.name }));
  }
  if (ev.kind === 'rescue') { // the guards rise round the cage
    const zone = zoneAt(run.fmap, ev.start.x, ev.start.y);
    for (let i = 0; i < RESCUE.guards; i++) {
      const a = (i / RESCUE.guards) * Math.PI * 2, p = { x: ev.start.x + Math.cos(a) * 170, y: ev.start.y + Math.sin(a) * 170 };
      const [e] = spawnGroup(run, p.x, p.y, 1, zone);
      e.hp *= RESCUE.guardHp; e.maxHp = e.hp; e.ev = ev.key; e.mini = true;
      if (i < RESCUE.eliteGuards) { e.elite = true; e.hp *= 3; e.maxHp = e.hp; e.r *= 1.3; }
      ev.guards.push(e);
    }
    run.showBanner(t('Kalahkan penjaga kamp, lalu bebaskan {name}!', { name: ev.name }));
  }
  if (ev.kind === 'race') run.showBanner(t('Balapan dimulai! Lewati semua cincin cahaya.'));
  if (ev.kind === 'meteor') { ev.falls = []; ev.crystals = []; ev.booms = []; ev.got = 0; run.showBanner(t('Hujan meteor! Hindari lingkaran merah, pungut kristalnya.')); }
}

function fail(run, ev, why) {
  if (ev.world) { endHappening(run, ev, why); return; } // a happening does not wait to be tried again
  clearFoes(run, ev);
  resetEvent(ev);
  ev.cool = RETRY_AFTER;
  run.showBanner(why);
}

function succeed(run, ev) {
  clearFoes(run, ev);
  ev.state = 'done';
  if (ev.world) { payHappening(run, ev); return; }
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
  const W = ev.waves || DEFEND.waves;
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
  if (ev.t >= (ev.time || DEFEND.time) && ev.wave >= W.length && run.enemies.filter((e) => e.ev === ev.key).length <= DEFEND.mop) succeed(run, ev);
}

const alive = (run, e) => e && e.hp > 0 && run.enemies.includes(e);

function stepOutlaw(run, ev, dt) {
  const o = ev.foe;
  if (!alive(run, o)) { succeed(run, ev); return; }
  if ((run.px - o.x) ** 2 + (run.py - o.y) ** 2 > (FAR * FAR)) { const fled = ev.fled; clearFoes(run, ev); resetEvent(ev); if (fled) ev.lurk = ev.flee; return; } // lost: it hides again (where it fled to)
  if (!ev.fled && o.hp < o.maxHp * OUTLAW.flee) { // flees to its second hideout
    ev.fled = true; ev.fleeT = 0; ev.lurk = ev.flee;
    o.target = { x: ev.flee.x, y: ev.flee.y, hp: 1 }; o.speed *= OUTLAW.fleeSpeed;
    run.showBanner(t('{name} kabur! Ikuti jejaknya.', { name: ev.name }));
  }
  if (o.target) {
    ev.fleeT += dt;
    if ((o.x - ev.flee.x) ** 2 + (o.y - ev.flee.y) ** 2 < 90 * 90 || ev.fleeT > 14) { // there (or slipped through the woods)
      o.x = ev.flee.x; o.y = ev.flee.y; o.target = null; o.speed /= OUTLAW.fleeSpeed;
      o.hp = Math.min(o.maxHp, o.hp + o.maxHp * OUTLAW.heal);
    }
  }
}

function stepNest(run, ev, dt) {
  const live = ev.nests.filter((e) => alive(run, e));
  if (!live.length) { succeed(run, ev); return; }
  for (const e of live) { e.x = e.home.x; e.y = e.home.y; e.kx = e.ky = 0; } // rooted
  const foes = run.enemies.filter((e) => e.ev === ev.key && !e.nest).length;
  for (const e of live) {
    if ((e.sendT -= dt) > 0) continue;
    e.sendT = rrange(NEST.every[0], NEST.every[1]);
    if (foes < NEST.cap) { const p = ringSpot(run, e.x, e.y, [60, 140]); if (p) sendFoes(run, ev, p.x, p.y, NEST.send, null, 0); }
  }
  const far = (run.px - ev.start.x) ** 2 + (run.py - ev.start.y) ** 2 > NEST.leave * NEST.leave;
  ev.away = far ? ev.away + dt : 0;
  if (ev.away > NEST.leaveT) fail(run, ev, t('Kamu meninggalkan {name}.', { name: ev.name }));
}

function stepRescue(run, ev, dt) {
  if (!ev.unlocked && !ev.guards.some((e) => alive(run, e))) { ev.unlocked = true; run.showBanner(t('Penjaga tumbang! Buka kandangnya.')); }
  if (ev.unlocked && (run.px - ev.start.x) ** 2 + (run.py - ev.start.y) ** 2 < RESCUE.openR * RESCUE.openR) {
    ev.freedAt = { x: ev.start.x, y: ev.start.y }; // the captive runs off home (drawn by the field)
    succeed(run, ev);
    run.showBanner(t('{name} bebas! Ia berlari pulang.', { name: ev.name }));
    return;
  }
  const far = (run.px - ev.start.x) ** 2 + (run.py - ev.start.y) ** 2 > RESCUE.leave * RESCUE.leave;
  ev.away = far ? ev.away + dt : 0;
  if (ev.away > RESCUE.leaveT) fail(run, ev, t('Kamu meninggalkan {name}.', { name: ev.name }));
}

// the medal a time earns on this course (null: too slow)
export const raceMedal = (ev, sec) => (sec <= ev.times.gold ? 'gold' : sec <= ev.times.silver ? 'silver' : sec <= ev.times.bronze ? 'bronze' : null);

function stepRace(run, ev, dt) {
  ev.t += dt;
  const [x, y] = ev.rings[ev.ring];
  if ((run.px - x) ** 2 + (run.py - y) ** 2 < RACE.ringR * RACE.ringR) {
    ev.ring++;
    if (ev.ring >= ev.rings.length) { // the finish: a medal, a purse, the time kept
      ev.medal = raceMedal(ev, ev.t);
      const purse = Math.round((QUEST_REWARD.gold.base + QUEST_REWARD.gold.perLevel * run.level) * RACE.bonus[ev.medal]);
      run.addGold(purse);
      run.raceTimes.push({ quest: ev.quest, sec: Math.round(ev.t * 10) / 10 });
      succeed(run, ev);
      run.showBanner(t('Finis! {sec} detik · {medal}', { sec: ev.t.toFixed(1), medal: t(MEDAL[ev.medal]) }));
      return;
    }
  }
  if (ev.t > ev.times.bronze) fail(run, ev, t('Waktu habis! Kembali ke garis mulai untuk mencoba lagi.'));
}
export const MEDAL = { gold: 'Emas', silver: 'Perak', bronze: 'Perunggu' };

// ---- happenings (Peristiwa dunia) ----
const purseOf = (run, k) => Math.round((QUEST_REWARD.gold.base + QUEST_REWARD.gold.perLevel * run.level) * k);
function payHappening(run, ev) {
  const gold = purseOf(run, ev.purse);
  if (gold > 0) run.addGold(gold);
  run.eventsDone.push(ev.key); // saves the coins at once (main.js); no quest knows this key
  run.showBanner(t('{name} selesai! +{g} koin', { name: ev.name, g: gold }));
  run.events = run.events.filter((e) => e !== ev);
}
function endHappening(run, ev, why) {
  clearFoes(run, ev);
  run.events = run.events.filter((e) => e !== ev);
  if (why) run.showBanner(why);
}

let happenN = 0;
const roadPts = new Map(); // world → sampled roads
function nearRoad(run, a, b) { // a stretch of road starting a..b away from the player
  let all = roadPts.get(run.fmap);
  if (!all) { all = run.fmap.paths.map((p) => sample(p, 90)); roadPts.set(run.fmap, all); }
  const found = [];
  for (const pts of all) pts.forEach(([x, y], i) => { const d2 = (x - run.px) ** 2 + (y - run.py) ** 2; if (d2 > a * a && d2 < b * b && i + 22 < pts.length) found.push([pts, i]); });
  if (!found.length) return null;
  const [pts, i] = found[Math.floor(rand() * found.length)];
  return pts.slice(i, i + Math.round(HAPPEN.caravan.len / 90) + 1);
}
function pickKind() {
  const list = Object.entries(HAPPEN.kinds);
  let roll = rand() * list.reduce((n, [, w]) => n + w, 0);
  for (const [k, w] of list) if ((roll -= w) < 0) return k;
  return list[0][0];
}

// A happening near the player, now and then (spec §42): a caravan attacked (a short escort),
// a raid on a crossing (a short defence), a meteor shower (dodge, pick up crystals).
export function stepHappenings(run, dt) {
  for (const ev of (run.events || []).filter((e) => e.world)) {
    const far = (run.px - ev.start.x) ** 2 + (run.py - ev.start.y) ** 2 > HAPPEN.far * HAPPEN.far;
    if (ev.state === 'wait' && ((ev.age += dt) > HAPPEN.expire || far)) endHappening(run, ev, null);
  }
  if (run.events?.some((e) => e.world)) return;
  if (run.happenT == null) run.happenT = HAPPEN.first;
  if ((run.happenT -= dt) > 0) return;
  run.happenT = rrange(HAPPEN.every[0], HAPPEN.every[1]);
  if (inHub(run.px, run.py) || run.region.id === 'eclipse') return;
  const kind = pickKind(), key = `world:${++happenN}`;
  let ev = null;
  if (kind === 'caravan') {
    const route = nearRoad(run, HAPPEN.dist[0], HAPPEN.dist[1]);
    if (route) ev = { key, kind: 'escort', world: true, name: t('Karavan Pedagang'), title: t('Pedagang'), look: { hair: 1, hairColor: 3 }, outfit: ['#a8763a', '#7a5226'], route, start: { x: route[0][0], y: route[0][1] }, purse: HAPPEN.caravan.gold };
  } else {
    const cross = kind === 'raid' && run.fmap.crossings.find((c) => { const d2 = (c.x - run.px) ** 2 + (c.y - run.py) ** 2; return d2 < 3000 * 3000 && d2 > 400 * 400; });
    const p = cross ? { x: cross.x, y: cross.y + 140 } : ringSpot(run, run.px, run.py, HAPPEN.dist);
    if (p && kind === 'raid') ev = { key, kind: 'defend', world: true, name: t('Barikade'), start: p, time: HAPPEN.raid.time, waves: HAPPEN.raid.waves, hpMul: HAPPEN.raid.hp, purse: HAPPEN.raid.gold };
    if (p && kind === 'meteor') ev = { key, kind: 'meteor', world: true, name: t('Hujan Meteor'), start: p, purse: 0 };
  }
  if (!ev) return;
  const made = freshEvent(ev);
  made.age = 0;
  run.events = [...run.events, made];
  run.showBanner(t('Peristiwa: {name}! Lihat tanda di peta.', { name: ev.name }));
}

function stepMeteor(run, ev, dt) {
  const M = HAPPEN.meteor;
  ev.t += dt;
  if ((ev.next -= dt) <= 0 && ev.t < M.time) { // the next stone: near the player half the time
    ev.next = M.every;
    const aim = rand() < 0.5 ? { x: run.px, y: run.py } : ev.start, a = rand() * Math.PI * 2, d = rand() * (aim === ev.start ? M.r : 160);
    ev.falls.push({ x: aim.x + Math.cos(a) * d, y: aim.y + Math.sin(a) * d, t: M.warn });
  }
  for (let i = ev.falls.length - 1; i >= 0; i--) {
    const f = ev.falls[i];
    if ((f.t -= dt) > 0) continue;
    ev.falls.splice(i, 1);
    ev.booms.push({ x: f.x, y: f.y, t: 0.35 });
    if ((run.px - f.x) ** 2 + (run.py - f.y) ** 2 < M.blast * M.blast) run.hurtPlayer(run.stats.maxHp * M.dmg, null, null);
    ev.crystals.push({ x: f.x, y: f.y, life: M.life });
    run.addShake?.('small');
  }
  for (let i = ev.booms.length - 1; i >= 0; i--) if ((ev.booms[i].t -= dt) <= 0) ev.booms.splice(i, 1);
  for (let i = ev.crystals.length - 1; i >= 0; i--) {
    const c = ev.crystals[i];
    if ((c.life -= dt) <= 0) { ev.crystals.splice(i, 1); continue; }
    if ((run.px - c.x) ** 2 + (run.py - c.y) ** 2 < M.pick * M.pick) {
      ev.crystals.splice(i, 1); ev.got++;
      addMats(run, { crystal: 1 });
      run.addGold(purseOf(run, M.gold));
    }
  }
  if ((run.px - ev.start.x) ** 2 + (run.py - ev.start.y) ** 2 > M.leave * M.leave) { endHappening(run, ev, null); return; }
  if (ev.t >= M.time && !ev.falls.length && !ev.crystals.length) succeed(run, ev);
}

const FAR = 2600; // an outlaw left this far behind slips away (and lurks again)
// how close the player must come for an event to begin
const reach = (ev) => (ev.kind === 'outlaw' ? OUTLAW.seen : ev.kind === 'nest' ? NEST.near : ev.kind === 'rescue' ? RESCUE.near : ev.kind === 'meteor' ? HAPPEN.meteor.near : START_R);

export function stepEvents(run, dt) {
  for (const ev of run.events || []) {
    if (ev.state === 'done') continue;
    if (ev.cool > 0) { ev.cool -= dt; continue; }
    if (ev.state === 'wait') {
      const at = ev.kind === 'outlaw' ? ev.lurk : ev.start, r = reach(ev);
      if ((run.px - at.x) ** 2 + (run.py - at.y) ** 2 < r * r) begin(run, ev);
      continue;
    }
    if (ev.kind === 'escort') stepEscort(run, ev, dt);
    else if (ev.kind === 'defend') stepDefend(run, ev, dt);
    else if (ev.kind === 'outlaw') stepOutlaw(run, ev, dt);
    else if (ev.kind === 'nest') stepNest(run, ev, dt);
    else if (ev.kind === 'rescue') stepRescue(run, ev, dt);
    else if (ev.kind === 'race') stepRace(run, ev, dt);
    else if (ev.kind === 'meteor') stepMeteor(run, ev, dt);
  }
  stepHappenings(run, dt);
}

// the running event's guarded one (for the target arrow / map), else its start
// an outlaw not yet found: only a circle round where it lurks ({ hint: r })
export function eventPoint(ev) {
  if (ev.state === 'run' && ev.npc) return { x: ev.npc.x, y: ev.npc.y };
  if (ev.state === 'run' && ev.altar) return { x: ev.altar.x, y: ev.altar.y };
  if (ev.kind === 'outlaw') {
    if (ev.state === 'run' && ev.foe && !ev.foe.target) return { x: ev.foe.x, y: ev.foe.y };
    const h = ev.lurk === ev.flee ? ev.fleeHint : ev.hint;
    return { x: h.x, y: h.y, hint: OUTLAW.hint };
  }
  if (ev.kind === 'race' && ev.state === 'run') { const [x, y] = ev.rings[ev.ring]; return { x, y }; }
  return ev.start;
}

