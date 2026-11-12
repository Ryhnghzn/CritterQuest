// The endless Rift in a run (spec §41.3): floors made from their number, blessings, checkpoints.
// Pure logic on the run state; rolls use the simulation RNG passed in (rand).
import { RIFT, RIFT_POOL, BLESSINGS } from '../data/rift.js';
import { t } from '../i18n.js';

const BUFFED = ['moveSpd', 'atk', 'atkSpd', 'crit', 'critDmg']; // as run/run.js: potions & buffs rebuild these from baseStats

export const isBossFloor = (floor) => floor % RIFT.bossEvery === 0;
// HP & damage factor of a floor (on top of the Rift's own step)
export const riftMul = (floor) => 1 + RIFT.step * Math.max(0, floor - 1);

// One floor: a boss alone every RIFT.bossEvery floors, else 3 waves of a few random kinds.
// more: extra enemies (fraction) from blessings.
export function makeRiftFloor(floor, rnd, more = 0) {
  if (isBossFloor(floor)) {
    const list = floor >= RIFT.eclipseFrom ? [...RIFT.bosses, 'eclipseboss'] : RIFT.bosses;
    return { waves: [{ mix: { [list[Math.floor(rnd() * list.length)]]: 1 }, every: 1 }] };
  }
  const k = (1 + RIFT.grow * (floor - 1)) * (1 + more);
  return {
    waves: RIFT.waves.map((w) => {
      const pool = RIFT_POOL.slice(), kinds = [];
      while (kinds.length < RIFT.kinds && pool.length) kinds.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
      const total = Math.round(w.n * k), mix = {};
      kinds.forEach((id, i) => { mix[id] = Math.max(1, Math.round(total / kinds.length) + (i === 0 ? total % kinds.length : 0)); });
      return { mix, every: w.every };
    }),
  };
}

// The start of a Rift trip at `floor` (1 or just past a checkpoint): what is safe so far is nothing yet.
export function riftBegin(run, floor) {
  run.rift = { start: floor, blessings: [], more: 0, dealt: 1, taken: 1, offer: null, checkpoint: floor - 1, safe: snapshot(run), best: floor - 1 };
}
// what a fall keeps: everything gathered up to the last checkpoint
function snapshot(run) {
  return { gold: run.gold, loot: run.loot.length, mats: { ...run.mats }, gems: run.gemsFound.length };
}

// A floor was cleared: the record moves on; a boss floor is a checkpoint, a normal floor offers blessings.
export function riftCleared(run, rnd) {
  const R = run.rift;
  R.best = Math.max(R.best, run.floor);
  if (isBossFloor(run.floor)) {
    R.checkpoint = run.floor; R.safe = snapshot(run);
    run.showBanner(t('Titik simpan — lantai {n}', { n: run.floor }));
    return;
  }
  const pool = BLESSINGS.filter((b) => !R.blessings.includes(b.id)), offer = [];
  while (offer.length < RIFT.offer && pool.length) offer.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0].id);
  R.offer = offer;
}

// Take one of the offered blessings (main.js shows the choice). false if it was not offered.
export function pickBlessing(run, id) {
  const R = run.rift;
  if (!R?.offer?.includes(id)) return false;
  const b = BLESSINGS.find((x) => x.id === id);
  R.offer = null; R.blessings.push(id);
  const s = run.stats, base = run.baseStats;
  // buffed stats live in baseStats (applyBuffs rebuilds them); the others change in place
  const set = (k, f) => { base[k] = f(base[k] || 0); if (!BUFFED.includes(k)) s[k] = f(s[k] || 0); };
  for (const [k, v] of Object.entries(b.stat || {})) set(k, (x) => x * (1 + v));
  for (const [k, v] of Object.entries(b.add || {})) set(k, (x) => x + v);
  s.hp = Math.min(s.hp, s.maxHp);
  for (const [k, v] of Object.entries(b.fx || {})) run.fx[k] = (run.fx[k] || 0) + v;
  if (b.diff) {
    run.diff = { ...run.diff };
    if (b.diff.reward) run.diff.reward *= b.diff.reward;
    if (b.diff.elite) run.diff.elite *= b.diff.elite;
    if (b.diff.rarityUp) run.diff.rarityUp += b.diff.rarityUp;
  }
  if (b.more) R.more += b.more;
  if (b.dealt) R.dealt *= b.dealt;
  if (b.taken) R.taken *= b.taken;
  if (b.heal) s.hp = s.maxHp;
  run.applyBuffs();
  run.addFloater?.(run.px, run.py - 50, b.name, b.color);
  return true;
}

// What the trip brings home. A fall keeps only what was gathered up to the last checkpoint (EXP stays).
// → { gold, loot, mats, gems, best, checkpoint }
export function riftHaul(run, died) {
  const R = run.rift, keep = died ? R.safe : snapshot(run);
  return {
    gold: keep.gold, loot: run.loot.slice(0, keep.loot), mats: { ...keep.mats }, gems: run.gemsFound.slice(0, keep.gems),
    best: R.best, checkpoint: R.checkpoint,
  };
}

