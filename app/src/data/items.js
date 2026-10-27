// Gear (spec §14.2): slots, rarities, look variants, random bonuses, unique
// Legendary / Mythic items and their special effects, drop chances.

// 0 Biasa … 5 Mitos. bonuses = number of random bonus stats; mul = base stat multiplier.
export const RARITIES = [
  { name: 'Biasa', color: '#e8e8e8', bonuses: 0, mul: 1.0 },
  { name: 'Bagus', color: '#6ee7a0', bonuses: 1, mul: 1.0 },
  { name: 'Langka', color: '#6ec9ff', bonuses: 2, mul: 1.08 },
  { name: 'Epik', color: '#c26bd8', bonuses: 3, mul: 1.18 },
  { name: 'Legendaris', color: '#ffb547', bonuses: 3, mul: 1.3 },
  { name: 'Mitos', color: '#ff4d6d', bonuses: 4, mul: 1.45 },
];
export const LEGENDARY = 4;
export const MYTHIC = 5;

// base: stat → value at item level 1; grows × (1 + LEVEL_GROWTH × (level − 1)) × rarity mul.
export const LEVEL_GROWTH = 0.12;
export const SLOTS = {
  weapon: { name: 'Senjata', base: { atk: 5 } },
  helm: { name: 'Helm', base: { maxHp: 14 } },
  armor: { name: 'Armor', base: { def: 1.2, maxHp: 10 } },
  boots: { name: 'Sepatu', base: { moveSpd: 4 } },
  amulet: { name: 'Kalung', base: { crit: 1.5 } },
  ring: { name: 'Cincin', base: {}, minRarity: 1 },
};
export const SLOT_IDS = Object.keys(SLOTS);

// Look variant = tier by item level: tier i from TIER_LEVELS[i] upwards.
export const TIER_LEVELS = [1, 5, 10, 16, 23, 31, 40];
export const VARIANTS = {
  weapon: {
    warrior: ['Pedang Kayu', 'Pedang Besi', 'Pedang Baja', 'Pedang Ksatria', 'Pedang Runa', 'Pedang Obsidian', 'Pedang Naga'],
    archer: ['Busur Ranting', 'Busur Pemburu', 'Busur Komposit', 'Busur Elang', 'Busur Runa', 'Busur Bayangan', 'Busur Phoenix'],
    mage: ['Tongkat Kayu', 'Tongkat Kristal', 'Tongkat Bulan', 'Tongkat Bintang', 'Tongkat Runa', 'Tongkat Kehampaan', 'Tongkat Matahari'],
    assassin: ['Belati Karat', 'Belati Besi', 'Belati Racun', 'Belati Senyap', 'Belati Runa', 'Belati Malam', 'Belati Taring Naga'],
  },
  helm: ['Topi Kulit', 'Helm Besi', 'Helm Bertanduk', 'Helm Ksatria', 'Mahkota Runa', 'Helm Obsidian', 'Helm Naga'],
  armor: ['Rompi Kain', 'Zirah Kulit', 'Zirah Rantai', 'Zirah Pelat', 'Zirah Runa', 'Zirah Obsidian', 'Zirah Sisik Naga'],
  boots: ['Sandal Jerami', 'Sepatu Kulit', 'Sepatu Besi', 'Sepatu Pengembara', 'Sepatu Runa', 'Sepatu Bayangan', 'Sepatu Angin'],
  amulet: ['Kalung Tulang', 'Kalung Perak', 'Kalung Taring', 'Kalung Mata Kucing', 'Kalung Runa', 'Kalung Bulan Darah', 'Kalung Bintang Jatuh'],
  ring: ['Cincin Tembaga', 'Cincin Perak', 'Cincin Emas', 'Cincin Safir', 'Cincin Runa', 'Cincin Kegelapan', 'Cincin Abadi'],
};

// Random bonuses: max value at item level 1, growth per level (flat stats grow
// faster than percentages), name suffix when it is the item's first bonus.
// A roll lands between ROLL_MIN and 1 × the max.
export const ROLL_MIN = 0.7;
export const BONUSES = {
  atk: { label: 'ATK', v: 2, growth: 0.1, suffix: 'Ganas' },
  maxHp: { label: 'HP maks', v: 10, growth: 0.1, suffix: 'Kokoh' },
  def: { label: 'DEF', v: 0.6, growth: 0.08, suffix: 'Baja' },
  atkSpd: { label: 'Kec. serang', v: 0.03, growth: 0.04, suffix: 'Kilat', pct: true },
  crit: { label: 'Kritis', v: 1.2, growth: 0.04, suffix: 'Tajam', unit: '%' },
  critDmg: { label: 'Dmg kritis', v: 0.06, growth: 0.04, suffix: 'Maut', pct: true },
  moveSpd: { label: 'Gerak', v: 3, growth: 0.05, suffix: 'Angin' },
  cdr: { label: 'CDR', v: 1.5, growth: 0.04, suffix: 'Bijak', unit: '%' },
  magnet: { label: 'Magnet', v: 8, growth: 0.05, suffix: 'Pemikat' },
};
export const BONUS_IDS = Object.keys(BONUSES);

// Special effects of unique items (applied in the dungeon, langkah 5C).
// {v} in desc is replaced by the item's value (× 100 for fractions).
export const EFFECTS = {
  lifesteal: { desc: 'Menghisap {v}% damage menjadi HP' },
  thorns: { desc: 'Penyerang terkena duri {v}% ATK' },
  chain: { desc: '{v}% serangan menyambar petir ke musuh terdekat' },
  execute: { desc: 'Damage +{v}% ke musuh di bawah 30% HP' },
  shield: { desc: 'Perisai {v}% HP maks tiap 10 detik' },
  regen: { desc: 'Pulih {v}% HP maks per detik' },
  goldfind: { desc: 'Koin +{v}%' },
  expfind: { desc: 'EXP +{v}%' },
  dodgecd: { desc: 'Jeda dodge −{v}%' },
  frenzy: { desc: 'Kec. serang +{v}% saat HP di bawah 50%' },
  bossdmg: { desc: 'Damage +{v}% ke bos & elite' },
  explode: { desc: 'Musuh yang tumbang meledak ({v}% ATK)' },
  phoenix: { desc: 'Sekali per perjalanan: bangkit dengan {v}% HP' },
};

// Unique items. A Legendary / Mythic drop picks one that fits the slot (and the
// class, for weapons); class: null fits everyone.
export const UNIQUES = [
  // Legendaris
  { id: 'fajar', rarity: 4, slot: 'weapon', classId: 'warrior', name: 'Pedang Fajar', effect: 'execute', v: 0.5 },
  { id: 'anginutara', rarity: 4, slot: 'weapon', classId: 'archer', name: 'Busur Angin Utara', effect: 'chain', v: 0.12 },
  { id: 'baraabadi', rarity: 4, slot: 'weapon', classId: 'mage', name: 'Tongkat Bara Abadi', effect: 'explode', v: 0.6 },
  { id: 'bulansabit', rarity: 4, slot: 'weapon', classId: 'assassin', name: 'Belati Bulan Sabit', effect: 'lifesteal', v: 0.03 },
  { id: 'rajalendir', rarity: 4, slot: 'helm', classId: null, name: 'Mahkota Raja Lendir', effect: 'regen', v: 0.008 },
  { id: 'tanduksetan', rarity: 4, slot: 'helm', classId: null, name: 'Helm Tanduk Gelap', effect: 'frenzy', v: 0.3 },
  { id: 'durihitam', rarity: 4, slot: 'armor', classId: null, name: 'Zirah Duri Hitam', effect: 'thorns', v: 0.5 },
  { id: 'jubahpenjaga', rarity: 4, slot: 'armor', classId: null, name: 'Jubah Penjaga', effect: 'shield', v: 0.15 },
  { id: 'kabut', rarity: 4, slot: 'boots', classId: null, name: 'Sepatu Kabut', effect: 'dodgecd', v: 0.4 },
  { id: 'matanaga', rarity: 4, slot: 'amulet', classId: null, name: 'Kalung Mata Naga', effect: 'bossdmg', v: 0.4 },
  { id: 'keserakahan', rarity: 4, slot: 'amulet', classId: null, name: 'Liontin Keserakahan', effect: 'goldfind', v: 0.4 },
  { id: 'sangbijak', rarity: 4, slot: 'ring', classId: null, name: 'Cincin Sang Bijak', effect: 'expfind', v: 0.25 },
  { id: 'amarah', rarity: 4, slot: 'ring', classId: null, name: 'Cincin Amarah', effect: 'frenzy', v: 0.3 },
  // Mitos
  { id: 'taringmaw', rarity: 5, slot: 'weapon', classId: 'warrior', name: 'Taring Raja Maw', effect: 'lifesteal', v: 0.05 },
  { id: 'bintangjatuh', rarity: 5, slot: 'weapon', classId: 'archer', name: 'Busur Bintang Jatuh', effect: 'chain', v: 0.25 },
  { id: 'kiamat', rarity: 5, slot: 'weapon', classId: 'mage', name: 'Tongkat Kiamat', effect: 'explode', v: 1 },
  { id: 'ketiadaan', rarity: 5, slot: 'weapon', classId: 'assassin', name: 'Belati Ketiadaan', effect: 'execute', v: 0.8 },
  { id: 'phoenix', rarity: 5, slot: 'ring', classId: null, name: 'Cincin Phoenix', effect: 'phoenix', v: 0.3 },
  { id: 'zirahmaw', rarity: 5, slot: 'armor', classId: null, name: 'Zirah Raja Maw', effect: 'thorns', v: 1 },
  { id: 'mahkotabayang', rarity: 5, slot: 'helm', classId: null, name: 'Mahkota Bayangan', effect: 'bossdmg', v: 0.6 },
];

// Rarity weights per drop source (Biasa … Mitos). LUK multiplies the weights of
// Langka and up by (1 + LUK_RARITY × luk).
export const DROP_WEIGHTS = {
  enemy: [60, 27, 10, 2.4, 0.6, 0],
  elite: [36, 34, 20, 7.5, 2.5, 0],
  chest: [44, 32, 16, 6, 2, 0],
  boss: [0, 0, 55, 32, 11, 2],
  grand: [0, 0, 50, 35, 12, 3],
};
export const LUK_RARITY = 0.01;
export const DROP = {
  enemyChance: 0.015,   // normal enemy drops a piece of gear
  bossItems: 2,
  chestItems: 1,        // chest at the centre when a floor is clear
  levelSpread: 1,       // item level = char level − 1 + floor ± spread, max char level + 4
  levelAhead: 4,
};

// Elites (spec §5.4): a tougher, bigger version of a normal enemy with a golden glow.
export const ELITE = { chance: [0.03, 0.04, 0.05, 0.06, 0.07], hpMul: 4, dmgMul: 1.4, size: 1.35, xpMul: 5, gold: 10 };

export const SELL_PRICE = (item) => 5 * item.itemLevel * (1 + item.rarity);

// Pandai Besi chests (spec §6.4, §14.2): price = base + perLevel × character level;
// one item at the character's level with the source's rarity weights.
export const CHESTS = {
  chest: { name: 'Peti Gear', base: 30, perLevel: 10, source: 'chest' },
  grand: { name: 'Peti Agung', base: 150, perLevel: 40, source: 'grand' },
};
