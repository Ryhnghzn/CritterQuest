// Trainer & barber prices (spec §7, §17). Upgrades are permanent; price of the
// next tier = base × growth^tier.
export const UPGRADES = {
  hp: { name: 'Latihan Daya Tahan', desc: 'HP maks +6%', max: 10, base: 50, growth: 1.5, pct: { maxHp: 0.06 } },
  atk: { name: 'Latihan Tempur', desc: 'ATK +5%', max: 10, base: 60, growth: 1.5, pct: { atk: 0.05 } },
  magnet: { name: 'Latihan Kepekaan', desc: 'Magnet +20', max: 5, base: 40, growth: 1.6, flat: { magnet: 20 } },
};
export const UPGRADE_IDS = Object.keys(UPGRADES);
export const upgradePrice = (id, tier) => Math.round(UPGRADES[id].base * UPGRADES[id].growth ** tier);

export const RESPEC = { base: 100, perLevel: 20 };   // atur ulang poin: base + perLevel × level
export const BARBER_PRICE = 50;
