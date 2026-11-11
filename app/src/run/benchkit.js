// Bench bot (spec §43.8): an average build per job and level, fighting level-matched enemies without
// dodging. Shared by run/bench.test.js. Not used by the game.
import { Game } from './run.js';
import { CLASSES } from '../data/classes.js';
import { POINTS_PER_LEVEL, HORDE } from '../data/balance.js';
import { createCharacter, finalStats } from '../meta/character.js';
import { raise, setUlt, equip, wornIds, equippedUlt, umumFx, passiveFx, mergeFx, jobOf, levelOf } from '../meta/jobs.js';
import { makeItem } from '../meta/itemgen.js';
import { gearEffects } from '../meta/gear.js';
import { fieldScale } from './field.js';
import { makeElite } from './dungeon.js';
import { leveled } from './skilllevel.js';
import { ULT } from '../data/balance.js';
import { resetRng } from '../core/rng.js';

const ok = (r, c) => (r.ok ? r.char : c);
let seed = 11; const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

// An average character of `job` at `level`: points spread evenly, SP into the first four skills round
// after round, then the job passives, the focused ultimate from 25; gear rarity grows with the level.
export function benchChar(job, level) {
  let c = createCharacter({ slot: 0, name: 'Bot', look: { hair: 0, hairColor: 0 }, classId: job }, 1);
  c = { ...c, level };
  const pts = POINTS_PER_LEVEL * (level - 1);
  ['str', 'vit', 'agi', 'dex', 'luk'].forEach((k, i) => { c.attrs[k] = Math.floor(pts / 5) + (i < pts % 5 ? 1 : 0); });
  const C = CLASSES[job], main = C.skills.filter((s) => s.unlock <= level).slice(0, 4).map((s) => s.id);
  if (level >= 25) { c = ok(raise(c, C.fokus.id, 1), c); c = ok(setUlt(c, C.fokus.id, 1), c); }
  for (let round = 0; round < 5; round++) for (const id of main) c = ok(raise(c, id, 1), c);
  main.forEach((id, i) => { c = ok(equip(c, 0, i, id, 1), c); });
  for (let k = 0; k < 9; k++) for (const p of ['hotblood', 'steelskin', 'wideslash', 'calmbreath', 'lightfeet', 'sharpeye', 'coolblood', 'manasaver', 'bigblast', 'musclememory', 'poisonblade', 'closecall']) c = ok(raise(c, p, 1), c);
  const rarity = Math.min(4, 1 + Math.floor(level / 12));
  for (const slot of ['weapon', 'helm', 'armor', 'boots', 'amulet', 'ring']) {
    const it = makeItem({ slot, classId: job, rarity, itemLevel: level }, rng);
    c.inventory.push(it); c.equipped[slot] = it.id;
  }
  return c;
}

export function benchGame(c, dungeon = 'shadow', floor = 1) {
  resetRng();
  const g = new Game();
  g.start({ classId: c.classId, stats: finalStats(c), level: c.level, dungeon, floor,
    effects: mergeFx(mergeFx(gearEffects(c), umumFx(c)), passiveFx(c)), skills: wornIds(c, 0), levels: jobOf(c).sp, branch: jobOf(c).branch,
    ult: leveled(equippedUlt(c), levelOf(c, equippedUlt(c)?.id), true) });
  g.spawnT = 1e9; g.queueI = g.queue.length; g.wave = 99; g.god = false;
  return g;
}

// level-matched field enemies around the hero (as run/field.js spawnPack), optionally one elite
export function benchPack(g, level, types, elite = false) {
  const sc = fieldScale(level), out = [];
  types.forEach((type, i) => {
    const e = g.spawnEnemy(type);
    e.hp *= sc.hp * HORDE.hp; e.maxHp *= sc.hp * HORDE.hp; e.dmg *= sc.dmg; e.level = level;
    const a = (i / types.length) * Math.PI * 2;
    e.x = g.px + Math.cos(a) * 170; e.y = g.py + Math.sin(a) * 170;
    if (elite && i === 0) makeElite(e, level >= 25 ? 2 : 1);
    out.push(e);
  });
  return out;
}

// Fight until the targets are dead (or `limit` s): the bot attacks automatically, casts every ready
// skill and the ultimate, never dodges. → { time, hpLost (fraction), died, left }
export function benchFight(g, targets, limit = 120) {
  const DT = 1 / 60, hp0 = g.stats.hp;
  let t = 0;
  while (t < limit && g.state === 1 && targets.some((e) => e.hp > 0)) {
    const ready = g.skillDefs.map((s, i) => !!s && g.skillCd[i] <= 0 && g.energy >= s.cost);
    let move = { x: 0, y: 0 }; // close in on the nearest target with a melee basic attack
    const near = targets.filter((e) => e.hp > 0).sort((a, b) => Math.hypot(a.x - g.px, a.y - g.py) - Math.hypot(b.x - g.px, b.y - g.py))[0];
    const reach = CLASSES[g.classId].attack.kind === 'arc' ? 45 : 300;
    if (near && Math.hypot(near.x - g.px, near.y - g.py) > reach) { const d = Math.hypot(near.x - g.px, near.y - g.py); move = { x: (near.x - g.px) / d, y: (near.y - g.py) / d }; }
    g.intent = { move, aimAt: null, dodge: false, attack: true, auto: true, potion: -1, held: [false, false, false, false],
      skill1: ready[0], skill2: ready[1], skill3: ready[2], skill4: ready[3], ult: g.ultCharge >= ULT.max };
    g.step(DT); t += DT;
  }
  return { time: t, hpLost: Math.max(0, (hp0 - Math.max(0, g.stats.hp)) / g.stats.maxHp), died: g.state !== 1, left: targets.filter((e) => e.hp > 0).length };
}
