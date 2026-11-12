// Elite traits (spec §41.1): rolled when an enemy becomes an elite, then run every step
// beside its behaviour. Pure logic on the run state; simulation RNG (core/rng.js).
import { rand, rrange } from '../core/rng.js';
import { ENEMIES, AFFIXES, AFFIX_COUNT } from '../data/enemies.js';
import { fire } from './enemies.js';
import { miniStep } from './minimove.js';
import { poisonStep } from './passives.js';

const TAU = Math.PI * 2;
const IDS = Object.keys(AFFIXES);

// 1 trait, or 2 deep in the world / a dungeon
export function affixCount({ level = 0, floor = 0 } = {}) {
  return level >= AFFIX_COUNT.level || floor >= AFFIX_COUNT.floor ? AFFIX_COUNT.more : AFFIX_COUNT.base;
}

// n random traits that fit the enemy's behaviour (forced: exactly these, for tests and the cheat panel)
export function rollAffixes(e, n, forced = null) {
  let ids = forced;
  if (!ids) {
    const pool = IDS.filter((id) => !AFFIXES[id].not?.includes(e.ai));
    ids = [];
    while (ids.length < n && pool.length) ids.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  }
  e.affixes = ids;
  for (const id of ids) {
    const a = AFFIXES[id];
    if (id === 'fast') { e.speed *= a.speed; e.tempo = (e.tempo || 1) * a.tempo; } // × Neraka's tempo
    if (id === 'armored') { e.armorMax = e.maxHp * a.shield; e.armor = e.armorMax; e.armorIdle = 0; }
    if (id === 'caller') e.callT = a.every;
    if (id === 'thorny') e.thornCd = 0;
    if (id === 'aura') e.auraT = a.every;
    if (id === 'blinker') { e.blinkT = a.every * rrange(0.5, 1); e.blinkTo = null; }
  }
  return e;
}

const has = (e, id) => !!e.affixes?.includes(id);

// Once per step for a living elite (before its behaviour moves it).
export function affixStep(run, e, dt) {
  if (e.sig) miniStep(run, e, dt); // a treasure guardian's borrowed boss move (run/minimove.js)
  if (e.psn) poisonStep(run, e, dt); // Bilah Racun (run/passives.js)
  if (e.vulnT > 0) e.vulnT -= dt;    // Kabut Racun L5 mark
  if (!e.affixes?.length) return;
  if (has(e, 'armored') && e.armor < e.armorMax) {
    e.armorIdle += dt;
    if (e.armorIdle >= AFFIXES.armored.idle) e.armor = Math.min(e.armorMax, e.armor + e.armorMax * AFFIXES.armored.regen * dt);
  }
  if (e.thornCd > 0) e.thornCd -= dt;
  if (has(e, 'caller') && (e.callT -= dt) <= 0) {
    const a = AFFIXES.caller;
    e.callT = a.every;
    let mine = 0;
    for (const o of run.enemies) if (o.owner === e && o.hp > 0) mine++;
    for (let i = 0; i < a.count && mine < a.max; i++, mine++) {
      const m = run.spawnEnemy(a.type), ang = rand() * TAU;
      m.x = e.x + Math.cos(ang) * (e.r + 14); m.y = e.y + Math.sin(ang) * (e.r + 14);
      m.owner = e; m.level = e.level; m.zone = e.zone;
    }
    run.pulses.push({ x: e.x, y: e.y, r: e.r * 2.5, t: 0.4, max: 0.4, color: '194,107,216' });
  }
  if (has(e, 'aura') && !e.hidden && (e.auraT -= dt) <= 0) {
    const a = AFFIXES.aura;
    e.auraT = a.every;
    run.hazards.push({ kind: 'circle', x: e.x, y: e.y, r: a.r, t: a.fuse, max: a.fuse, dmg: e.dmg * a.dmgMul, onHit: ENEMIES[e.type].onHit || null, small: true, by: e.type });
  }
  if (has(e, 'blinker')) {
    const a = AFFIXES.blinker;
    if (e.blinkTo) {
      if ((e.blinkW -= dt) <= 0) {
        e.x = e.blinkTo.x; e.y = e.blinkTo.y; e.blinkTo = null; e.hidden = false;
        e.blinkT = a.every;
        run.spawnBurst(e.x, e.y, '#ffd24a', 12);
      }
    } else if ((e.blinkT -= dt) <= 0) {
      const ang = rand() * TAU, d = rrange(a.near[0], a.near[1]);
      e.blinkTo = { x: run.px + Math.cos(ang) * d, y: run.py + Math.sin(ang) * d };
      e.blinkW = a.warn; e.hidden = true;
      run.hazards.push({ kind: 'circle', x: e.blinkTo.x, y: e.blinkTo.y, r: e.r * 1.6, t: a.warn, max: a.warn, dmg: 0 });
      run.spawnBurst(e.x, e.y, '#ffd24a', 10);
    }
  }
}

// A hit on an elite: the Berlapis shield soaks first, Berduri answers with thorns.
// Returns the damage left for its HP.
export function affixHit(run, e, dmg) {
  if (e.ward > 0) { const soak = Math.min(e.ward, dmg); e.ward -= soak; dmg -= soak; } // a totem's ward (run/foes.js)
  if (!e.affixes?.length) return dmg;
  if (has(e, 'armored')) {
    e.armorIdle = 0;
    const soak = Math.min(e.armor, dmg);
    e.armor -= soak; dmg -= soak;
  }
  if (has(e, 'thorny') && e.thornCd <= 0) {
    const a = AFFIXES.thorny, s = { ...a.shot, dmg: e.dmg * a.dmgMul }, a0 = rand() * TAU;
    e.thornCd = a.cd;
    for (let i = 0; i < a.shot.count; i++) fire(run, e.x, e.y, a0 + (i / a.shot.count) * TAU, s, e.type);
  }
  return dmg;
}

// An elite just died: Meledak leaves a big danger circle.
export function affixDeath(run, e) {
  if (!has(e, 'volatile')) return;
  const a = AFFIXES.volatile;
  run.hazards.push({ kind: 'circle', x: e.x, y: e.y, r: a.radius, t: a.fuse, max: a.fuse, dmg: e.dmg * a.dmgMul, by: e.type });
}
