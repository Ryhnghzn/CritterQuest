// Quests (spec §26). A quest is a list of steps done in order; the state of the
// active ones lives in char.quests. Step kinds:
//   talk  { town, npc, who, say }  — speak with someone (who: their name, say: what they tell you)
//   town  { town }                  — walk into a town
//   gate  { dungeon }               — find the dungeon's gate in its region
//   boss  { dungeon }               — beat the dungeon's boss (its floor 5)
//   kill  { enemy, n, region?, show? } — kills of a type (variants count to their kin; show: the
//         variant named in the text, e.g. the region's own kind of spitter)
//   elite { n, region?, enemy? }    — elite kills (of a type, when given)
//   reach { spots: [id], label }    — stand at fixed places (SPOTS); prog is a bit per spot
//   drop  { item, n, enemy, region, chance, night? } — quest items that only drop while this step is on
//         (enemy '*' = any; night: only after dark)
//   guard { region, n?, lord? }     — treasure guardians beaten (chests of the region opened)
//   give  { town, npc, who, say, mats?, gems?, potions?, gear? } — hand things over (ends a talk)
// A talk / give in the wild uses town 'wild' and the hidden person's id as npc.
// reward: { gold, exp } are multipliers of QUEST_REWARD at the player's level; shard: a Pecahan
// Segel; gear: { rarity } a piece at the player's level; gems: [{ gem?, tier }] (random gem when
// none); marks: Lencana; mats: { id: n }; potions: { id: n } (up to the carry limit);
// unique: a quest-only unique (UNIQUES with quest: true) at the player's level.

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

// ——— hidden places in the regions (spec §26.5): fixed for every character ———
export const HIDDEN_R = { talk: 90, solid: 58, calm: 400 }; // talk reach, hut collision radius, no packs within
export const REACH_R = 160;                                  // standing this close to a spot counts
export const DROP_ITEMS = {
  glowcap: { name: 'Jamur Bercahaya', color: '#9fffb0' },
  wormscale: { name: 'Sisik Cacing', color: '#e0b060' },
  goo: { name: 'Lendir Kental', color: '#8fe0a0' },
  firefly: { name: 'Bunga Kunang', color: '#ffe680' },
  ember: { name: 'Bara Abadi', color: '#ff8a3c' },
};
const L = (hair, hairColor) => ({ hair, hairColor });
// at: [fx, fy] of the region's size; hut: a cabin (false = a person alone); gone: hidden once
// that quest is taken (they walk off with you, or to town)
export const HIDDEN = [
  { id: 'gaharu', region: 'forest', at: [0.1325, 0.2347], hut: true, name: 'Pak Gaharu', title: 'Pemburu Tua', look: L(4, 2), outfit: ['#5a4a2a', '#3a301c'],
    lines: ['Hutan ini dulu sunyi. Sekarang serigala bayang berkeliaran sampai ke pintuku.', 'Duduklah sebentar. Teh akar ini menghangatkan tulang.'] },
  { id: 'kunyit', region: 'forest', at: [0.4182, 0.5554], hut: true, name: 'Nenek Kunyit', title: 'Peramu', look: L(4, 5), outfit: ['#8a7a2a', '#5e521c'],
    lines: ['Setiap akar punya khasiat, Nak. Asal tahu cara merebusnya.', 'Bu Marta di Kota Awal masih ingat aku? Sup buatannya juara.'] },
  { id: 'resi', region: 'forest', at: [0.6956, 0.1975], hut: true, name: 'Resi Sunyi', title: 'Pertapa', look: L(4, 3), outfit: ['#6a6a7a', '#44445a'],
    lines: ['Hening adalah guru yang paling sabar.', 'Batu-batu tua di hutan ini mengingat lebih banyak daripada manusia.'] },
  { id: 'lio', region: 'forest', at: [0.2938, 0.6912], hut: false, gone: 's_lio', name: 'Lio', title: 'Anak Tersesat', scale: 0.72, look: L(0, 2), outfit: ['#d6a03a', '#a87626'],
    lines: ['Hiks… aku cuma mau memetik bunga kunang-kunang…'] },
  { id: 'bjorn', region: 'ice', at: [0.1795, 0.318], hut: true, name: 'Bjorn', title: 'Pemburu Yeti', look: L(1, 1), outfit: ['#7a5a3a', '#54402a'],
    lines: ['Jejak yeti sebesar perahu. Kau sudah lihat?', 'Api unggunku tak pernah padam. Di sini, itu soal hidup.'] },
  { id: 'frida', region: 'ice', at: [0.4686, 0.3114], hut: true, name: 'Frida', title: 'Penyihir Es', look: L(2, 5), outfit: ['#6a8ad6', '#4a62a8'],
    lines: ['Es menyimpan sihir lebih lama daripada kertas.', 'Jangan sentuh rak itu. Isinya bisa membekukan jarimu.'] },
  { id: 'salju', region: 'ice', at: [0.6846, 0.7621], hut: true, name: 'Nenek Salju', title: 'Pengamat Bintang', look: L(4, 5), outfit: ['#4a4a8a', '#30305e'],
    lines: ['Langit Padang Es adalah yang paling jernih di negeri ini.', 'Bintang tidak jatuh sembarangan, Nak. Mereka memilih.'] },
  { id: 'gustav', region: 'ice', at: [0.8433, 0.4512], hut: false, gone: 's_gustav', name: 'Gustav', title: 'Kurir', look: L(1, 3), outfit: ['#8a3a2a', '#5e261c'],
    lines: ['Kakiku membeku… suratnya harus sampai…'] },
  { id: 'hasan', region: 'desert', at: [0.1411, 0.5629], hut: true, name: 'Hasan', title: 'Pengembara', look: L(1, 0), outfit: ['#c2843a', '#8a5a26'],
    lines: ['Pasir tidak pernah diam. Begitu juga aku.', 'Tendaku kecil, tapi tehnya manis.'] },
  { id: 'layla', region: 'desert', at: [0.3828, 0.7132], hut: true, name: 'Layla', title: 'Penjaga Oase', look: L(2, 0), outfit: ['#3aa89a', '#26766e'],
    lines: ['Oase ini rahasia. Jangan ceritakan pada kafilah.', 'Airnya dingin, bahkan di siang hari.'] },
  { id: 'amun', region: 'desert', at: [0.667, 0.5012], hut: true, name: 'Amun', title: 'Penjaga Makam Tua', look: L(4, 0), outfit: ['#d6c08a', '#a8925e'],
    lines: ['Keluargaku menjaga makam ini sejak sebelum ada kota.', 'Raja-raja tidur. Kami memastikan mereka tetap tidur.'] },
  { id: 'zaid', region: 'desert', at: [0.859, 0.2994], hut: false, name: 'Zaid', title: 'Kurir Kehausan', look: L(0, 1), outfit: ['#8a6a3a', '#644a26'],
    lines: ['Air… sedikit saja…'] },
  { id: 'grom', region: 'volcano', at: [0.1966, 0.4964], hut: true, name: 'Grom', title: 'Pandai Buangan', look: L(1, 3), outfit: ['#4a3a33', '#2e2420'],
    lines: ['Mereka mengusirku dari Baraapi karena tungkuku terlalu panas. Pengecut.', 'Logam terbaik lahir dari api yang marah.'] },
  { id: 'agni', region: 'volcano', at: [0.4199, 0.4612], hut: true, name: 'Agni', title: 'Pendeta Api', look: L(2, 3), outfit: ['#d6603a', '#a83e26'],
    lines: ['Api itu suci. Imp-imp itu menodainya.', 'Duduklah di dekat bara. Biarkan ia mendengarmu.'] },
  { id: 'kawah', region: 'volcano', at: [0.6578, 0.599], hut: true, name: 'Penjaga Kawah', title: 'Penjaga Kawah', look: L(1, 4), outfit: ['#8a2a1a', '#5e1c10'],
    lines: ['Tiga api abadi menjaga gunung ini tetap tidur.', 'Kalau kau dengar gunung mendengkur, larilah.'] },
  { id: 'bara', region: 'volcano', at: [0.8886, 0.0777], hut: false, gone: 's_bara', name: 'Bara', title: 'Penambang Terjebak', look: L(0, 3), outfit: ['#6a5a4a', '#4a3e32'],
    lines: ['Kakiku terjepit batu… tolong…'] },
];
export const hiddenById = (id) => HIDDEN.find((h) => h.id === id) || null;

// Places a quest sends you to: [fx, fy] in their region (spec §26.5–26.6)
export const SPOTS = {
  stone1: { region: 'forest', at: [0.2116, 0.4691] }, stone2: { region: 'forest', at: [0.5398, 0.3913] }, stone3: { region: 'forest', at: [0.8029, 0.4497] },
  shell: { region: 'forest', at: [0.6417, 0.875] },
  star1: { region: 'ice', at: [0.2926, 0.5359] }, star2: { region: 'ice', at: [0.5557, 0.1631] }, star3: { region: 'ice', at: [0.8094, 0.1359] },
  pillar1: { region: 'desert', at: [0.2628, 0.4387] }, pillar2: { region: 'desert', at: [0.5294, 0.4306] }, pillar3: { region: 'desert', at: [0.7329, 0.6671] },
  camel: { region: 'desert', at: [0.5145, 0.1751] },
  flame1: { region: 'volcano', at: [0.312, 0.594] }, flame2: { region: 'volcano', at: [0.5758, 0.4208] }, flame3: { region: 'volcano', at: [0.7822, 0.4061] },
};

const wild = (npc) => ({ kind: 'talk', town: 'wild', npc, who: hiddenById(npc).name });
const give = (npc, what) => ({ kind: 'give', town: 'wild', npc, who: hiddenById(npc).name, ...what });

// Side quests (spec §26.5): the first step is the talk that starts them.
export const SIDE = [
  { id: 's_gaharu', title: 'Taring Serigala', steps: [
    { ...wild('gaharu'), say: 'Serigala bayang makin berani. Semalam mereka mencakar pintuku. Kalahkan tiga puluh ekor, biar mereka belajar takut lagi.' },
    { kind: 'kill', enemy: 'wolf', n: 30, region: 'forest' },
    { ...wild('gaharu'), say: 'Sunyi lagi. Terima kasih. Ambil busur… eh, ambil ini. Aku sudah terlalu tua untuk memakainya.' },
  ], reward: { gold: 3, exp: 3, marks: 2, gear: { rarity: 2 } } },
  { id: 's_kunyit', title: 'Jamur Bercahaya', steps: [
    { ...wild('kunyit'), say: 'Ramuanku butuh Jamur Bercahaya. Jamur Bom di hutan ini menyimpannya di kepalanya. Bawakan lima, ya?' },
    { kind: 'drop', item: 'glowcap', n: 5, enemy: 'bomber', region: 'forest', chance: 0.4 },
    { ...wild('kunyit'), say: 'Lihat cahayanya! Ini, ramuan hangat untukmu. Jangan diminum sekaligus.' },
  ], reward: { gold: 3, exp: 3, marks: 2, potions: { big: 2, shield: 2 } } },
  { id: 's_resi', title: 'Bisikan Batu Tulis', chain: true, steps: [
    { ...wild('resi'), say: 'Tiga batu tulis di hutan ini menyimpan doa para tetua. Bacalah semuanya, lalu kembali padaku.' },
    { kind: 'reach', spots: ['stone1', 'stone2', 'stone3'], label: 'batu tulis' },
    { kind: 'guard', region: 'forest', lord: true },
    give('resi', { say: 'Doanya meminta kekuatan sang Penguasa dan sepotong kegelapan. Bawakan satu Inti Kegelapan dan satu gear Epik, akan kutenun menjadi pelindung.', mats: { core: 1 }, gear: { rarity: 3, n: 1 } }),
  ], reward: { gold: 5, exp: 5, marks: 4, unique: 'akartua' } },
  { id: 's_lio', title: 'Anak Tersesat', steps: [
    { ...wild('lio'), say: 'Kakak… aku tersesat. Rumahku di Rimbawana. Ibu pasti cemas… Antar aku pulang, ya?' },
    { kind: 'talk', town: 'rimba', npc: 'folk1', who: 'Melati', say: 'Lio! Ya ampun, Nak! Terima kasih, petualang. Ambillah ini, hanya ini yang kupunya.' },
  ], reward: { gold: 3, exp: 3, marks: 2, gems: [{ tier: 1 }, { tier: 1 }] } },
  { id: 's_bjorn', title: 'Pemburu Yeti', steps: [
    { ...wild('bjorn'), say: 'Enam yeti merusak perangkapku. Aku sudah tua untuk berburu sendirian. Kau mau?' },
    { kind: 'kill', enemy: 'yeti', n: 6, region: 'ice' },
    { ...wild('bjorn'), say: 'Enam! Ha! Kau pemburu sejati. Ambil ini, hasil tempaanku sendiri.' },
  ], reward: { gold: 4, exp: 4, marks: 3, gear: { rarity: 3 } } },
  { id: 's_frida', title: 'Tinta Es', steps: [
    { ...wild('frida'), say: 'Mantraku butuh tinta dari kristal dan safir. Sepuluh Kristal Arkana dan dua Safir Retak, kalau kau punya.' },
    give('frida', { say: 'Sempurna. Ini permata yang kuperkuat dengan es abadi.', mats: { crystal: 10 }, gems: [{ gem: 'sapphire', tier: 1, n: 2 }] }),
  ], reward: { gold: 3, exp: 4, marks: 2, gems: [{ gem: 'sapphire', tier: 2 }], gear: { rarity: 2 } } },
  { id: 's_salju', title: 'Bintang Jatuh', chain: true, steps: [
    { ...wild('salju'), say: 'Tiga bintang jatuh di Padang Es minggu ini. Pergilah ke tempat mereka mendarat, sebelum roh es menghisap cahayanya.' },
    { kind: 'reach', spots: ['star1', 'star2', 'star3'], label: 'bintang jatuh' },
    { kind: 'elite', enemy: 'icewisp', n: 4, region: 'ice' },
    { kind: 'guard', region: 'ice', lord: true },
    { ...wild('salju'), say: 'Cahayanya kembali ke langit. Dan yang ini… sisa cahaya terakhir. Kubuat menjadi cincin untukmu.' },
  ], reward: { gold: 6, exp: 6, marks: 4, unique: 'bintangbeku' } },
  { id: 's_gustav', title: 'Surat Beku', steps: [
    { ...wild('gustav'), say: 'Surat ini untuk Astrid di Bekubara… aku tak sanggup berjalan lagi. Tolong antarkan.' },
    { kind: 'talk', town: 'beku', npc: 'folk4', who: 'Astrid', say: 'Surat dari Gustav? Dia selamat? Syukurlah… Terima kasih. Ambil ini untuk perjalananmu.' },
  ], reward: { gold: 4, exp: 4, marks: 2, mats: { crystal: 6 } } },
  { id: 's_hasan', title: 'Sengat', steps: [
    { ...wild('hasan'), say: 'Kalajengking menyerbu jalur kafilahku. Empat puluh ekor, kurang lebih. Bersihkan, dan kau kubayar.' },
    { kind: 'kill', enemy: 'scorpion', n: 40, region: 'desert' },
    { ...wild('hasan'), say: 'Jalurnya aman lagi! Seperti janjiku.' },
  ], reward: { gold: 5, exp: 5, marks: 3, gear: { rarity: 3 } } },
  { id: 's_layla', title: 'Sisik Cacing', steps: [
    { ...wild('layla'), say: 'Sisik Cacing Pasir menyaring air dengan sempurna. Delapan saja cukup untuk sumur oase ini.' },
    { kind: 'drop', item: 'wormscale', n: 8, enemy: 'sandworm', region: 'desert', chance: 0.5 },
    { ...wild('layla'), say: 'Airnya jernih lagi! Ambil ini, dan kembalilah kapan saja kau haus.' },
  ], reward: { gold: 5, exp: 5, marks: 3, gems: [{ tier: 2 }], potions: { big: 3 } } },
  { id: 's_amun', title: 'Makam yang Terlupa', chain: true, steps: [
    { ...wild('amun'), say: 'Tiga tugu makam tua tertimbun pasir. Temukan semuanya, agar arwah raja tahu kita masih menjaga.' },
    { kind: 'reach', spots: ['pillar1', 'pillar2', 'pillar3'], label: 'tugu makam' },
    { kind: 'guard', region: 'desert', n: 2 },
    give('amun', { say: 'Para penjaga sudah tumbang. Persembahkan tiga permata Biasa, dan topeng ini milikmu.', gems: [{ tier: 2, n: 3 }] }),
  ], reward: { gold: 7, exp: 7, marks: 4, unique: 'topengpasir' } },
  { id: 's_zaid', title: 'Kurir Kehausan', steps: [
    { ...wild('zaid'), say: 'Airku habis sejak kemarin… Tiga Ramuan Merah saja, akan kubayar di kota.' },
    give('zaid', { say: 'Ahh… hidup lagi! Ini, upahku untuk tiga hari. Pantas untukmu.', potions: { red: 3 } }),
  ], reward: { gold: 6, exp: 4, marks: 2 } },
  { id: 's_grom', title: 'Pandai Buangan', steps: [
    { ...wild('grom'), say: 'Bawakan dua gear Epik. Akan kulebur di tungkuku dan kutempa jadi sesuatu yang lebih baik.' },
    give('grom', { say: 'Lihat ini! Mereka bilang tungkuku terlalu panas. Hah!', gear: { rarity: 3, n: 2 } }),
  ], reward: { gold: 5, exp: 5, marks: 3, mats: { core: 2 }, gear: { rarity: 4 } } },
  { id: 's_agni', title: 'Api Suci', steps: [
    { ...wild('agni'), say: 'Imp Api menodai api suci gunung ini. Lima puluh, kira-kira. Bersihkanlah.' },
    { kind: 'kill', enemy: 'imp', n: 50, region: 'volcano' },
    { ...wild('agni'), say: 'Bara di altar menyala jernih lagi. Terimalah berkat ini.' },
  ], reward: { gold: 6, exp: 6, marks: 3, gems: [{ tier: 3 }] } },
  { id: 's_kawah', title: 'Api Abadi', chain: true, steps: [
    { ...wild('kawah'), say: 'Tiga api abadi meredup. Kunjungi semuanya dan nyalakan kembali dengan tanganmu.' },
    { kind: 'reach', spots: ['flame1', 'flame2', 'flame3'], label: 'api abadi' },
    { kind: 'elite', enemy: 'salamander', n: 4, region: 'volcano' },
    { kind: 'guard', region: 'volcano', lord: true },
    { ...wild('kawah'), say: 'Gunung kembali tidur. Sisik ini dari naga api terakhir. Pakailah, ia akan melindungimu.' },
  ], reward: { gold: 8, exp: 8, marks: 5, unique: 'sisikkawah' } },
  { id: 's_bara', title: 'Penambang Terjebak', steps: [
    { ...wild('bara'), say: 'Kakiku terjepit… aku bisa merangkak pulang, tapi tolong kabari Ignis di Baraapi. Dia pasti mencariku.' },
    { kind: 'talk', town: 'bara', npc: 'folk0', who: 'Ignis', say: 'Bara masih hidup? Aku segera menjemputnya! Ini, dari tabungan kami para penambang.' },
  ], reward: { gold: 6, exp: 5, marks: 2, mats: { core: 1, crystal: 5 } } },

  // ——— towns: townsfolk and shopkeepers (spec §26.6) ———
  { id: 't_marta', title: 'Sup untuk Nenek Kunyit', steps: [
    { kind: 'talk', town: 'home', npc: 'inn', who: 'Bu Marta', say: 'Nenek Kunyit, sahabat lamaku, tinggal di pondok tengah Hutan Kelam. Sudah lama ia tak turun gunung. Tolong antarkan sup hangat ini, ya?' },
    { ...wild('kunyit'), say: 'Sup Marta! Masih hangat pula. Bilang padanya aku sehat. Dan ini, untuk kakimu yang lelah.' },
  ], reward: { gold: 2, exp: 3, marks: 2, potions: { red: 3 } } },
  { id: 't_mira', title: 'Lendir Kental', steps: [
    { kind: 'talk', town: 'home', npc: 'potion', who: 'Nenek Mira', say: 'Hehehe… ramuan baruku butuh Lendir Kental. Lendir di Hutan Kelam kadang meninggalkannya. Enam saja, Sayang.' },
    { kind: 'drop', item: 'goo', n: 6, enemy: 'slink', region: 'forest', chance: 0.3 },
    { kind: 'talk', town: 'home', npc: 'potion', who: 'Nenek Mira', say: 'Kental dan lengket, sempurna! Ini, cicipi hasil kualiku.' },
  ], reward: { gold: 2, exp: 3, marks: 2, potions: { shield: 2, rage: 2 } } },
  { id: 't_brom', title: 'Bahan Tungku', steps: [
    { kind: 'talk', town: 'home', npc: 'gear', who: 'Pandai Brom', say: 'Tungkuku lapar! Bawakan satu gear Langka dan empat puluh Debu Rune. Akan kuajari kau rahasia kecil.' },
    { kind: 'give', town: 'home', npc: 'gear', who: 'Pandai Brom', say: 'Bagus, bagus! Rahasianya? Pukul lebih keras. Hahaha! Ini bayaranmu.', gear: { rarity: 2, n: 1 }, mats: { dust: 40 } },
  ], reward: { gold: 3, exp: 3, marks: 2, mats: { crystal: 4 } } },
  { id: 't_pip', title: 'Kerang Bercahaya', steps: [
    { kind: 'talk', town: 'home', npc: 'pip', who: 'Pip', say: 'Kak! Katanya di tepi danau Hutan Kelam ada kerang yang bisa bercahaya! Carikan, dong! Aku mau lihat!' },
    { kind: 'reach', spots: ['shell'], label: 'kerang bercahaya' },
    { kind: 'talk', town: 'home', npc: 'pip', who: 'Pip', say: 'Wuaaah, beneran ada?! Kakak keren! Ini, harta karunku. Jangan bilang Ibu ya.' },
  ], reward: { gold: 2, exp: 3, marks: 2, gems: [{ tier: 1 }] } },
  { id: 't_tole', title: 'Jamur Raksasa', steps: [
    { kind: 'talk', town: 'rimba', npc: 'folk2', who: 'Tole', say: 'Tidak ada yang percaya aku lihat jamur yang meledak! Kalahkan lima belas, biar mereka percaya!' },
    { kind: 'kill', enemy: 'bomber', n: 15, region: 'forest' },
    { kind: 'talk', town: 'rimba', npc: 'folk2', who: 'Tole', say: 'Tuh kan! Aku tidak bohong! Kakak pahlawanku!' },
  ], reward: { gold: 3, exp: 3, marks: 2, potions: { wind: 2 } } },
  { id: 't_akar', title: 'Bunga Kunang', steps: [
    { kind: 'talk', town: 'rimba', npc: 'potion', who: 'Nenek Akar', say: 'Bunga Kunang hanya mekar di malam hari, dan makhluk hutan suka membawanya. Lima tangkai, Nak, dari Hutan Kelam setelah gelap.' },
    { kind: 'drop', item: 'firefly', n: 5, enemy: '*', region: 'forest', chance: 0.12, night: true },
    { kind: 'talk', town: 'rimba', npc: 'potion', who: 'Nenek Akar', say: 'Cahayanya masih menyala. Akan kujadikan ramuan paling terang. Ini untukmu.' },
  ], reward: { gold: 3, exp: 4, marks: 3, potions: { big: 3 } } },
  { id: 't_kayan', title: 'Ujian Bilah', steps: [
    { kind: 'talk', town: 'rimba', npc: 'weapons', who: 'Pandai Kayan', say: 'Bilah terbaikku hanya untuk yang pantas. Kalahkan sepuluh elite di Hutan Kelam, lalu kembali.' },
    { kind: 'elite', n: 10, region: 'forest' },
    { kind: 'talk', town: 'rimba', npc: 'weapons', who: 'Pandai Kayan', say: 'Kau pantas. Pegang ini, rasakan beratnya.' },
  ], reward: { gold: 4, exp: 4, marks: 3, gear: { rarity: 3 } } },
  { id: 't_arne', title: 'Katak di Danau', steps: [
    { kind: 'talk', town: 'beku', npc: 'folk0', who: 'Arne', say: 'Katak Salju menghabiskan ikan di danau. Dua puluh lima ekor, dan aku bisa memancing lagi.' },
    { kind: 'kill', enemy: 'spitter', show: 'frostspitter', n: 25, region: 'ice' },
    { kind: 'talk', town: 'beku', npc: 'folk0', who: 'Arne', say: 'Ikannya kembali! Makan malam gratis di Bu Hangat untukmu. Dan ini.' },
  ], reward: { gold: 4, exp: 4, marks: 3, mats: { crystal: 5 } } },
  { id: 't_hangat', title: 'Sup untuk Bjorn', steps: [
    { kind: 'talk', town: 'beku', npc: 'inn', who: 'Bu Hangat', say: 'Bjorn si pemburu yeti tak pernah mampir lagi. Antarkan sup ikan ini ke pondoknya di barat Padang Es, ya.' },
    { ...wild('bjorn'), say: 'Sup Bu Hangat! Ha! Hangat sampai ke tulang. Ini, untuk jasamu.' },
  ], reward: { gold: 3, exp: 4, marks: 2, potions: { big: 2 } } },
  { id: 't_bulu', title: 'Bulu untuk Musim Dingin', steps: [
    { kind: 'talk', town: 'beku', npc: 'armor', who: 'Ibu Bulu', say: 'Aku membuat zirah musim dingin dari zirah lama. Bawakan dua helm, armor, atau sepatu Langka.' },
    { kind: 'give', town: 'beku', npc: 'armor', who: 'Ibu Bulu', say: 'Bagus sekali. Lihat, jadi lebih hangat dan lebih kuat.', gear: { rarity: 2, n: 2, slots: ['helm', 'armor', 'boots'] } },
  ], reward: { gold: 4, exp: 4, marks: 3, gear: { rarity: 3 } } },
  { id: 't_omar', title: 'Unta yang Hilang', steps: [
    { kind: 'talk', town: 'pasir', npc: 'folk0', who: 'Omar', say: 'Untaku kabur saat badai pasir. Namanya Kurma. Kalau kau temukan dia di Gurun Merah, beri tahu aku!' },
    { kind: 'reach', spots: ['camel'], label: 'unta Omar' },
    { kind: 'talk', town: 'pasir', npc: 'folk0', who: 'Omar', say: 'Kurma selamat?! Aku segera menjemputnya. Terima kasih, sahabat!' },
  ], reward: { gold: 5, exp: 5, marks: 3, gems: [{ tier: 2 }] } },
  { id: 't_mirage', title: 'Permata untuk Kalung', steps: [
    { kind: 'talk', town: 'pasir', npc: 'jewelry', who: 'Nona Mirage', say: 'Pesanan istimewa dari sang sultan… aku butuh tiga permata Biasa. Kau punya?' },
    { kind: 'give', town: 'pasir', npc: 'jewelry', who: 'Nona Mirage', say: 'Indah! Sang sultan akan puas. Ini bagianmu.', gems: [{ tier: 2, n: 3 }] },
  ], reward: { gold: 6, exp: 4, marks: 3, gems: [{ tier: 3 }] } },
  { id: 't_yusuf', title: 'Cacing di Jalur Dagang', steps: [
    { kind: 'talk', town: 'pasir', npc: 'mats', who: 'Yusuf', say: 'Cacing pasir menelan dua gerobak bahanku! Kalahkan tiga puluh, dan stokku aman lagi.' },
    { kind: 'kill', enemy: 'sandworm', n: 30, region: 'desert' },
    { kind: 'talk', town: 'pasir', npc: 'mats', who: 'Yusuf', say: 'Gerobakku lewat dengan selamat! Ambil ini, langsung dari gudang.' },
  ], reward: { gold: 5, exp: 5, marks: 3, mats: { crystal: 8, core: 1 } } },
  { id: 't_puntung', title: 'Bara Abadi', steps: [
    { kind: 'talk', town: 'bara', npc: 'folk2', who: 'Puntung', say: 'Aku mau bikin lentera yang tak pernah padam! Lendir Magma kadang menjatuhkan Bara Abadi. Bawakan sepuluh!' },
    { kind: 'drop', item: 'ember', n: 10, enemy: 'magmaslink', region: 'volcano', chance: 0.35 },
    { kind: 'talk', town: 'bara', npc: 'folk2', who: 'Puntung', say: 'Terang sekali! Sekarang aku tidak takut gelap lagi. Ini, hadiah dariku!' },
  ], reward: { gold: 5, exp: 6, marks: 3, gems: [{ tier: 3 }] } },
  { id: 't_gora', title: 'Penguasa Gunung', steps: [
    { kind: 'talk', town: 'bara', npc: 'weapons', who: 'Pandai Gora', say: 'Penguasa Gunung Api menjaga harta di ujung timur. Kalahkan dia, dan aku akan menempa senjata dari kemenanganmu.' },
    { kind: 'guard', region: 'volcano', lord: true },
    { kind: 'talk', town: 'bara', npc: 'weapons', who: 'Pandai Gora', say: 'Kau mengalahkannya?! Ini tempaan terbaikku. Pantas untuk sang penakluk.' },
  ], reward: { gold: 8, exp: 8, marks: 6, gear: { rarity: 4 } } },
  { id: 't_selaapi', title: 'Inti untuk Tungku', steps: [
    { kind: 'talk', town: 'bara', npc: 'mats', who: 'Sela Api', say: 'Tungku kota butuh Inti Kegelapan. Lima buah, dan kau dapat harga khusus dariku.' },
    { kind: 'give', town: 'bara', npc: 'mats', who: 'Sela Api', say: 'Tungku menyala lagi! Ini permata terbaik di lapakku, untukmu.', mats: { core: 5 } },
  ], reward: { gold: 6, exp: 6, marks: 4, gems: [{ tier: 3 }, { tier: 3 }] } },
];
export const QUEST_IDS = [...MAIN_IDS, ...SIDE.map((q) => q.id)];
