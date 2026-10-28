// Quests (spec §26). A quest is a list of steps done in order; the state of the
// active ones lives in char.quests. Step kinds:
//   talk  { town, npc, who, say }  — speak with someone (who: their name, say: what they tell you)
//   town  { town }                  — walk into a town
//   gate  { dungeon }               — find the dungeon's gate in its region
//   boss  { dungeon }               — beat the dungeon's boss (its floor 5)
//   kill  { enemy, n, region? }     — kills of a type (variants count to their kin)
//   elite { n, region? }            — elite kills
// (reach / give / drop / guard arrive with the side quests, 9F-2.)
// reward: { gold, exp } are multipliers of QUEST_REWARD at the player's level; shard: a Pecahan
// Segel; gear: { rarity } a piece at the player's level; gems: [{ tier }] (random gem).

export const QUEST_REWARD = {
  gold: { base: 40, perLevel: 12 },  // × reward.gold
  exp: { base: 30, perLevel: 10 },   // × reward.exp
};
export const SHARDS = 5;              // Pecahan Segel: one from each dungeon boss
export const SIDE_MAX = 6;            // side quests active at once (the main quest does not count)
export const GATE_HINT = { r: 1500, jitter: 900 }; // map circle around a gate not yet found

const odo = { town: 'home', npc: 'odo', who: 'Kakek Odo' };

// The main quest, chapter by chapter (spec §26.4). Chapter 6 comes with 9F-4.
export const MAIN = [
  {
    id: 'ch1', title: 'Bayangan di Bawah Tanah',
    steps: [
      { kind: 'talk', ...odo, say: 'Nak, dengarkan orang tua ini. Dahulu sebuah gerhana hendak menelan dunia. Para tetua menyegelnya, lalu memecah segelnya menjadi lima dan menyembunyikannya di tempat-tempat yang dalam. Kini makhluk-makhluk di sana terbangun dan memakan kekuatannya. Yang pertama ada di Ruang Bawah Tanah Bayangan, di Hutan Kelam. Temukan gerbangnya, kalahkan Raja Maw, dan bawa pulang pecahannya.' },
      { kind: 'gate', dungeon: 'shadow' },
      { kind: 'boss', dungeon: 'shadow' },
      { kind: 'talk', ...odo, say: 'Pecahan Segel! Rasakan dinginnya… Masih ada empat lagi. Pergilah ke timur, ke Rimbawana, kota di akar pohon tertua. Kapten Selasih di Balai Petualang tahu jalan selanjutnya.' },
    ],
    reward: { shard: true, gold: 6, exp: 6, gear: { rarity: 2 } },
  },
  {
    id: 'ch2', title: 'Kota di Akar Tua',
    steps: [
      { kind: 'town', town: 'rimba' },
      { kind: 'talk', town: 'rimba', npc: 'board', who: 'Kapten Selasih', say: 'Kakek Odo mengirimmu? Kabar pecahan segel sampai juga ke sini. Pecahan kedua ada di Gua Kristal, di sisi barat Padang Es. Kalahkan penjaganya, lalu beri tahu Kapten Ingrid di Bekubara, kota benteng di ujung timur Padang Es.' },
      { kind: 'gate', dungeon: 'crystal' },
      { kind: 'boss', dungeon: 'crystal' },
      { kind: 'town', town: 'beku' },
      { kind: 'talk', town: 'beku', npc: 'board', who: 'Kapten Ingrid', say: 'Pecahan kedua… berkilau seperti es yang tak mau mencair. Selasih menitip pesan: Nenek Akar di Rimbawana mencium bau busuk dari timur hutan. Kembalilah ke sana.' },
    ],
    reward: { shard: true, gold: 6, exp: 6, gear: { rarity: 3 } },
  },
  {
    id: 'ch3', title: 'Busuk di Timur Hutan',
    steps: [
      { kind: 'talk', town: 'rimba', npc: 'potion', who: 'Nenek Akar', say: 'Hidungku tak pernah salah, Nak. Busuk ini datang dari Hutan Jamur Busuk di ujung timur Hutan Kelam. Pecahan ketiga membuat jamur di sana tumbuh liar. Hentikan sebelum seluruh hutan membusuk.' },
      { kind: 'gate', dungeon: 'fungus' },
      { kind: 'boss', dungeon: 'fungus' },
      { kind: 'talk', town: 'rimba', npc: 'potion', who: 'Nenek Akar', say: 'Udara sudah bersih lagi. Terima kasih, Nak. Pecahan keempat? Konon tersimpan di makam kuno di bawah Gurun Merah. Penari Zahra di Pasirluas tahu banyak dongeng tentangnya.' },
    ],
    reward: { shard: true, gold: 7, exp: 7, gear: { rarity: 3 }, gems: [{ tier: 2 }] },
  },
  {
    id: 'ch4', title: 'Makam di Bawah Pasir',
    steps: [
      { kind: 'town', town: 'pasir' },
      { kind: 'talk', town: 'pasir', npc: 'folk1', who: 'Zahra', say: 'Dongeng tentang Makam Pasir? Itu bukan dongeng. Raja Mumi tidur di sana bersama hartanya — dan sebuah pecahan yang membuat pasir bergerak sendiri. Gerbangnya tersembunyi di tengah Gurun Merah.' },
      { kind: 'gate', dungeon: 'tomb' },
      { kind: 'boss', dungeon: 'tomb' },
      { kind: 'talk', town: 'pasir', npc: 'folk1', who: 'Zahra', say: 'Kau kembali hidup-hidup! Akan kutarikan kisahmu malam ini. Pecahan terakhir ada di Gunung Api. Carilah Ignis si penambang di Baraapi.' },
    ],
    reward: { shard: true, gold: 8, exp: 8, gear: { rarity: 3 }, gems: [{ tier: 3 }] },
  },
  {
    id: 'ch5', title: 'Api yang Tak Padam',
    steps: [
      { kind: 'town', town: 'bara' },
      { kind: 'talk', town: 'bara', npc: 'folk0', who: 'Ignis', say: 'Batu di gunung ini bergerak sejak pecahan itu terbangun. Benteng Lava, di sisi barat Gunung Api. Rajanya tidur di kolam api — dan dia tidak suka dibangunkan.' },
      { kind: 'gate', dungeon: 'lava' },
      { kind: 'boss', dungeon: 'lava' },
      { kind: 'talk', town: 'bara', npc: 'folk0', who: 'Ignis', say: 'Lima pecahan… Gunung ini berhenti bergetar. Bawa semuanya ke Kakek Odo di Kota Awal. Tapi hati-hati: langit di timur Baraapi mulai menggelap.' },
    ],
    reward: { shard: true, gold: 10, exp: 10, gear: { rarity: 4 } },
  },
];

export const MAIN_IDS = MAIN.map((q) => q.id);
export const SIDE = []; // side quests (9F-2, 9F-3)
export const QUEST_IDS = [...MAIN_IDS, ...SIDE.map((q) => q.id)];
