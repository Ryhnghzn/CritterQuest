// Skill points & the skill tree (spec §43.2–43.3): replaces the talents of §21. Every job has four
// tabs — Aktif (its 6+ skills, level 1–5), Ultimate (level 1–3), Pasif (3 job passives, level 1–3)
// and Umum (the 8 old talents, level 1–5). Opening needs only the character level (`unlock`).
export const SP_PER_LEVEL = 2;              // from level 2 on: level 50 = 98 SP
export const SKILL_COST = [1, 1, 2, 2, 2];  // SP to reach level 1, 2, 3, 4, 5 of an active skill
export const SKILL_MAX = 5;
export const ULT_COST = 3, ULT_MAX = 3;
export const PASSIVE_COST = 2, PASSIVE_MAX = 3;
export const UMUM_COST = 1;
export const LEVEL_DMG = 0.12;              // active skill damage per level above 1 (spec §43.2; used from part C)
export const ULT_LEVEL_DMG = 0.15;
export const SP_RESPEC = { base: 80, perLevel: 15 };
// A job's two starting skills (unlock 1) begin at level 1 for free, so a fresh job always has
// something to wear even with 0 SP (decided 2026-11-11; spec §43.2 note).
export const FREE_START_LEVEL = 1;

// Job passives (spec §43.3): `fx` per level; the run reads them from run.passive (meta/jobs.js passiveFx)
export const PASSIVES = {
  warrior: [
    { id: 'hotblood', name: 'Darah Panas', desc: 'Murka masuk +15% per level', max: 3, unlock: 3, fx: { rageGain: 0.15 } },
    { id: 'steelskin', name: 'Kulit Baja', desc: 'Damage diterima −4% per level saat Murka > 50', max: 3, unlock: 8, fx: { rageArmor: 0.04 } },
    { id: 'wideslash', name: 'Tebasan Lebar', desc: 'Lebar tebasan biasa +8% per level', max: 3, unlock: 12, fx: { arcWide: 0.08 } },
  ],
  archer: [
    { id: 'calmbreath', name: 'Napas Tenang', desc: 'Bidik terisi +15% per level', max: 3, unlock: 3, fx: { focusGain: 0.15 } },
    { id: 'lightfeet', name: 'Kaki Ringan', desc: 'Kecepatan gerak +4% per level', max: 3, unlock: 8, stat: { moveSpd: 0.04 } },
    { id: 'sharpeye', name: 'Mata Tajam', desc: 'Kritis +3% per level ke musuh berjarak > 250', max: 3, unlock: 12, fx: { farCrit: 3 } },
  ],
  mage: [
    { id: 'coolblood', name: 'Darah Dingin', desc: 'Panas turun +15% per level', max: 3, unlock: 3, fx: { heatDrop: 0.15 } },
    { id: 'manasaver', name: 'Hemat Mana', desc: 'Energi skill −5% per level', max: 3, unlock: 8, fx: { manaSave: 0.05 } },
    { id: 'bigblast', name: 'Ledakan Besar', desc: 'Area skill +6% per level', max: 3, unlock: 12, fx: { areaUp: 0.06 } },
  ],
  assassin: [
    { id: 'musclememory', name: 'Ingatan Otot', desc: 'Kombo bertahan +1 detik per level', max: 3, unlock: 3, fx: { comboHold: 1 } },
    { id: 'poisonblade', name: 'Bilah Racun', desc: '5% peluang per level serangan biasa meracuni (3 detik, 20% ATK tiap 0,5 detik)', max: 3, unlock: 8, fx: { poisonChance: 0.05 } },
    { id: 'closecall', name: 'Lolos Tipis', desc: 'Kritis +10% per level selama 2 detik setelah menghindar', max: 3, unlock: 12, fx: { dodgeCrit: 10 } },
  ],
};
// A Bilah Racun hit: poison for `time` seconds, `mult` × ATK every `every` seconds; Lolos Tipis lasts `time`
export const PASSIVE_RULES = { poison: { time: 3, every: 0.5, mult: 0.2 }, closeCall: { time: 2 }, farCrit: 250 };

// Umum: the old talents (spec §21), unchanged effects. stat: pct = fraction of the stat, add = flat;
// fx: added to the run's effect values (same keys as gear effects).
export const UMUM = [
  { id: 'might', name: 'Kekuatan', desc: 'ATK +3%', max: 5, pct: { atk: 0.03 } },
  { id: 'vigor', name: 'Ketahanan', desc: 'HP maks +4%', max: 5, pct: { maxHp: 0.04 } },
  { id: 'precision', name: 'Ketajaman', desc: 'Kritis +1,5%', max: 5, add: { crit: 1.5 } },
  { id: 'focus', name: 'Fokus Sihir', desc: 'Damage skill +8%', max: 5, fx: { skillDmg: 0.08 } },
  { id: 'flow', name: 'Aliran Energi', desc: 'Energi dari serangan +10%', max: 5, fx: { energy: 0.1 } },
  { id: 'evasion', name: 'Kegesitan', desc: 'Jeda dodge −6%', max: 5, fx: { dodgecd: 0.06 } },
  { id: 'vamp', name: 'Dahaga Darah', desc: 'Menghisap 0,6% damage jadi HP', max: 5, fx: { lifesteal: 0.006 } },
  { id: 'fortune', name: 'Keberuntungan', desc: 'Koin & EXP +5%', max: 5, fx: { goldfind: 0.05, expfind: 0.05 } },
];
export const UMUM_IDS = UMUM.map((u) => u.id);
