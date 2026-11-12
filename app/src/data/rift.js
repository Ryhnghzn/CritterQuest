// The endless Rift (spec §41.3): opens after the story's end, entered from the Adventurers' Hall in
// Kota Awal. Floors without end; enemies of every dungeon mixed; every floor `step` stronger (HP &
// damage, linear); every `bossEvery` floors one random boss alone, then a checkpoint. Between normal
// floors the player picks one of `offer` blessings, kept until the trip ends. Logic in run/rift.js.
import { DUNGEONS } from './dungeons.js';
import { ENEMIES } from './enemies.js';

const LAST = DUNGEONS[DUNGEONS.length - 1]; // the Rift starts as hard as Menara Gerhana
export const RIFT = {
  step: 0.08,          // +8% HP & damage per floor above the first
  bossEvery: 5,
  offer: 3,            // blessings shown after a normal floor
  hpMul: LAST.hpMul, dmgMul: LAST.dmgMul, rewardMul: LAST.rewardMul, itemLevel: LAST.itemLevel,
  itemPerFloor: 0.5,   // + item level per floor
  // the waves of a normal floor: `n` enemies (+ `grow` per floor), `kinds` different types each
  waves: [{ n: 14, every: 0.5 }, { n: 18, every: 0.45 }, { n: 22, every: 0.4 }],
  grow: 0.06, kinds: 4,
  // bosses that may guard a checkpoint floor; Sang Gerhana joins from `eclipseFrom`
  bosses: ['boss', 'crystalboss', 'sporeboss', 'tombboss', 'lavaboss'], eclipseFrom: 20,
  theme: LAST.theme,
};
// every non-boss enemy that fights in a dungeon room
export const RIFT_POOL = [...new Set(DUNGEONS.flatMap((d) => d.floors.flatMap((f) => f.waves.flatMap((w) => Object.keys(w.mix)))))]
  .filter((id) => !ENEMIES[id].boss);

// Blessings. stat: fraction of a stat; add: flat stat; fx: run effects (same keys as gear); diff: changes to the
// run's difficulty numbers (reward / elite multiply, rarityUp adds); more: extra enemies per floor (fraction);
// dealt / taken: damage dealt / taken ×; heal: full HP when picked.
export const BLESSINGS = [
  { id: 'fury', name: 'Amarah', desc: 'ATK +30%, HP maks −20%', color: '#ff5a4a', stat: { atk: 0.3, maxHp: -0.2 } },
  { id: 'greed', name: 'Keserakahan', desc: 'Koin & EXP ×2, musuh +40%', color: '#ffd24a', diff: { reward: 2 }, more: 0.4 },
  { id: 'gale', name: 'Angin', desc: 'Gerak +20%, jeda menghindar −30%', color: '#9ce8ff', stat: { moveSpd: 0.2 }, fx: { dodgecd: 0.3 } },
  { id: 'blood', name: 'Darah', desc: 'Menghisap 3% damage jadi HP', color: '#e0304a', fx: { lifesteal: 0.03 } },
  { id: 'edge', name: 'Ketajaman', desc: 'Kritis +15, damage kritis +30%', color: '#ffe08a', add: { crit: 15, critDmg: 0.3 } },
  { id: 'flow', name: 'Arus', desc: 'Jeda skill −20%, energi dari serangan +50%', color: '#7fd8ff', add: { cdr: 0.2 }, fx: { energy: 0.5 } },
  { id: 'iron', name: 'Besi', desc: 'Damage diterima −25%, gerak −10%', color: '#b8c4d0', taken: 0.75, stat: { moveSpd: -0.1 } },
  { id: 'glass', name: 'Kaca', desc: 'Damage +50%, damage diterima +40%', color: '#d9f3ff', dealt: 1.5, taken: 1.4 },
  { id: 'mend', name: 'Pemulihan', desc: 'HP penuh sekarang, pulih 0,5% HP per detik', color: '#8ff5c8', heal: true, fx: { regen: 0.005 } },
  { id: 'luck', name: 'Untung', desc: 'Gear 20% lebih sering naik satu rarity', color: '#c79bff', diff: { rarityUp: 0.2 } },
  { id: 'hunt', name: 'Perburuan', desc: 'Elite ×2, koin & EXP ×1,5', color: '#ffb347', diff: { elite: 2, reward: 1.5 } },
  { id: 'rush', name: 'Terburu', desc: 'Kecepatan serang +25%, HP maks −10%', color: '#ff9ad5', stat: { atkSpd: 0.25, maxHp: -0.1 } },
];
export const BLESSING_IDS = BLESSINGS.map((b) => b.id);

// the Rift as a dungeon for the run (run/run.js reset): Menara Gerhana's look and step, floors made by run/rift.js
export const RIFT_DUNGEON = {
  ...LAST, id: 'rift', name: 'Celah', short: 'Celah', rift: true,
  hpMul: RIFT.hpMul, dmgMul: RIFT.dmgMul, rewardMul: RIFT.rewardMul, itemLevel: RIFT.itemLevel, floors: [],
};
