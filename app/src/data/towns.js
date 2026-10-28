// Every town (spec §25.2): the starting town (data/town.js) and the four big
// towns at the east end of the regions. Big towns share one layout — a north
// row of shops facing the plaza, a south row facing the street to the gate —
// and differ in look (theme), people and goods tier (data/world.js TOWNS).
// A town def: { id, w, h, wall, talkRadius, spawn, gateSpawn, buildings, npcs,
// lamps, decor, theme, interiors: { houseId: room } }.
import { TOWN, INTERIORS } from './town.js';

const npc = (id, role, name, x, y, look, outfit, extra) => ({ id, role, name, x, y, look, outfit, ...extra });
const HOUSE_W = 190, HOUSE_H = 190;
const house = (id, x, y, extra) => ({ id, kind: 'house', x, y, w: HOUSE_W, h: HOUSE_H, ...extra });
const room = (id, w, h, extra) => ({ id, w, h, wall: 24, back: 76, doorW: 50, talkRadius: 70, ...extra });

// rooms of the new shops (the inn, potion shop, smithy and hall reuse the starting town's)
const NEW_ROOMS = {
  weapons: room('weapons', 460, 320, {
    name: 'Pandai Senjata', floor: 'stone', wallColor: '#3d3533',
    furniture: [
      { kind: 'forge', x: 30, y: 30, w: 100, h: 80, solid: true },
      { kind: 'rack', x: 150, y: 18, w: 140, h: 56 },
      { kind: 'rack', x: 300, y: 18, w: 130, h: 56 },
      { kind: 'counter', x: 160, y: 132, w: 150, h: 26, solid: true, cloth: '#7a2e2e' },
      { kind: 'anvil', x: 60, y: 190, w: 40, h: 22, solid: true },
      { kind: 'showcase', x: 360, y: 190, w: 70, h: 34, solid: true, items: 'blades' },
      { kind: 'barrel', x: 30, y: 250, w: 22, h: 26, solid: true, water: true },
    ],
    lights: [{ x: 80, y: 80, r: 200, rgb: '255,120,40' }, { x: 235, y: 140, r: 110, rgb: '255,190,110' }],
  }),
  armor: room('armor', 460, 320, {
    name: 'Penjahit Zirah', floor: 'wood', wallColor: '#3f3248',
    furniture: [
      { kind: 'mannequin', x: 40, y: 92, w: 30, h: 26, solid: true },
      { kind: 'mannequin', x: 390, y: 92, w: 30, h: 26, solid: true },
      { kind: 'armorstand', x: 100, y: 200, w: 28, h: 24, solid: true },
      { kind: 'shelf', x: 150, y: 16, w: 160, h: 56, items: 'cloth' },
      { kind: 'counter', x: 160, y: 132, w: 150, h: 26, solid: true, cloth: '#3f6b8a' },
      { kind: 'loom', x: 330, y: 200, w: 70, h: 40, solid: true },
      { kind: 'rug', x: 180, y: 210, w: 100, h: 60, color: '#5a3a6a' },
    ],
    lights: [{ x: 235, y: 140, r: 140, rgb: '255,200,140' }, { x: 230, y: 40, r: 90, rgb: '255,190,110' }],
  }),
  jewelry: room('jewelry', 440, 320, {
    name: 'Toko Perhiasan', floor: 'stone', wallColor: '#2f2b4a',
    furniture: [
      { kind: 'showcase', x: 40, y: 100, w: 90, h: 34, solid: true, items: 'gems' },
      { kind: 'showcase', x: 310, y: 100, w: 90, h: 34, solid: true, items: 'rings' },
      { kind: 'counter', x: 150, y: 132, w: 140, h: 26, solid: true, cloth: '#6d3fd6' },
      { kind: 'shelf', x: 140, y: 16, w: 160, h: 56, items: 'bottles' },
      { kind: 'showcase', x: 175, y: 220, w: 90, h: 34, solid: true, items: 'gems' },
      { kind: 'plant', x: 40, y: 262 }, { kind: 'plant', x: 400, y: 262 },
    ],
    lights: [{ x: 85, y: 110, r: 90, rgb: '160,200,255' }, { x: 355, y: 110, r: 90, rgb: '255,160,220' }, { x: 220, y: 232, r: 100, rgb: '200,170,255' }],
  }),
  storage: room('storage', 480, 340, {
    name: 'Gudang', floor: 'wood', wallColor: '#4a3a2a',
    furniture: [
      { kind: 'chest', x: 40, y: 90, w: 44, h: 30, solid: true },
      { kind: 'chest', x: 96, y: 90, w: 44, h: 30, solid: true },
      { kind: 'chest', x: 340, y: 90, w: 44, h: 30, solid: true },
      { kind: 'chest', x: 396, y: 90, w: 44, h: 30, solid: true },
      { kind: 'desk', x: 190, y: 120, w: 100, h: 26, solid: true },
      { kind: 'crate', x: 40, y: 250, w: 30, h: 28, solid: true }, { kind: 'crate', x: 72, y: 262, w: 30, h: 28, solid: true },
      { kind: 'sacks', x: 390, y: 250, w: 50, h: 34, solid: true },
      { kind: 'shelf', x: 170, y: 16, w: 140, h: 56, items: 'boxes' },
    ],
    lights: [{ x: 240, y: 130, r: 160, rgb: '255,190,110' }],
  }),
  mats: room('mats', 440, 320, {
    name: 'Pedagang Bahan', floor: 'stone', wallColor: '#33403a',
    furniture: [
      { kind: 'sacks', x: 36, y: 90, w: 50, h: 34, solid: true },
      { kind: 'sacks', x: 360, y: 90, w: 50, h: 34, solid: true },
      { kind: 'counter', x: 150, y: 132, w: 140, h: 26, solid: true, cloth: '#2f6b4f' },
      { kind: 'shelf', x: 140, y: 16, w: 160, h: 56, items: 'crystals' },
      { kind: 'crate', x: 40, y: 250, w: 30, h: 28, solid: true },
      { kind: 'showcase', x: 300, y: 230, w: 90, h: 34, solid: true, items: 'gems' },
      { kind: 'cauldron', x: 60, y: 186, w: 48, h: 36, solid: true },
    ],
    lights: [{ x: 220, y: 40, r: 110, rgb: '120,220,255' }, { x: 220, y: 140, r: 120, rgb: '255,200,140' }, { x: 345, y: 240, r: 90, rgb: '200,170,255' }],
  }),
};

// keeper spots in each room, by role
const KEEPER_AT = {
  inn: { inn: [124, 96] }, potion: { potion: [220, 96] },
  gear: { gear: [230, 148], jeweler: [360, 120] }, guild: { trainer: [100, 150], board: [260, 104] },
  weapons: { weapons: [235, 112] }, armor: { armor: [235, 112] }, jewelry: { jewelry: [220, 112] },
  storage: { storage: [240, 100] }, mats: { mats: [220, 112] },
};

// north row (doors face the plaza) and south row (doors face the street to the gate)
const W = 1800, H = 1300, WALL = 30, ROW_N = 30, ROW_S = 730;
const NORTH = [['inn', 70], ['potion', 330], ['gear', 590], ['guild', 1020], ['weapons', 1280], ['armor', 1540]];
const SOUTH = [['jewelry', 110], ['storage', 370], ['mats', 1240], [null, 1500]];
const GATE = { x: 810, y: H - WALL - 100, w: 180, h: 100 };
const SIGNS = {
  inn: ['inn', 'Penginapan'], potion: ['potion', 'Toko Ramuan'], gear: ['pow', 'Pandai Besi'], guild: ['arm', 'Balai Petualang'],
  weapons: ['gearSword', 'Pandai Senjata'], armor: ['gearArmor', 'Penjahit Zirah'], jewelry: ['gearRing', 'Toko Perhiasan'],
  storage: ['chest', 'Gudang'], mats: ['gem', 'Pedagang Bahan'],
};
const HOUSE_THEME = { inn: 'inn', potion: 'potion', gear: 'smith', weapons: 'smith', guild: 'guild' };

function bigTown(id, t) {
  const roofs = t.theme.roofs;
  const buildings = [];
  [...NORTH.map(([h, x]) => [h, x, ROW_N]), ...SOUTH.map(([h, x]) => [h, x, ROW_S])].forEach(([h, x, y], i) => {
    const [sign, name] = h ? SIGNS[h] : [null, null];
    buildings.push(house(h || `home${i}`, x, y, { theme: HOUSE_THEME[h] || null, sign, name, roof: roofs[i % roofs.length] }));
  });
  for (const [, x] of NORTH) buildings.push({ id: `fence${x}`, kind: 'fence', x: x - 40, y: 150, w: 28, h: 70 });
  buildings.push({ id: 'fenceE', kind: 'fence', x: 1742, y: 150, w: 28, h: 70 });
  buildings.push(
    { id: 'fire', kind: 'fire', x: 878, y: 455, w: 44, h: 30 },
    { id: 'gate', kind: 'gate', ...GATE },
    { id: 'barber', kind: 'stall', x: 170, y: 470, w: 116, h: 56, name: 'Tukang Cukur' },
  );
  const k = t.keepers;
  const npcs = [
    npc('gate', 'gate', k.gate[0], 900, GATE.y - 18, k.gate[1], k.gate[2]),
    npc('barber', 'barber', k.barber[0], 228, 550, k.barber[1], k.barber[2]),
    npc('stone', 'teleport', 'Batu Teleport', 1090, 470, null, ['#8f7bff', '#4b3aa8'], { object: 'stone' }),
    ...t.folk.map((f, i) => npc(`folk${i}`, 'talk', f.name, f.at[0], f.at[1], f.look, f.outfit, { title: f.title, lines: f.lines, wander: f.wander, scale: f.scale })),
  ];
  const interiors = {};
  for (const [h] of [...NORTH, ...SOUTH]) {
    if (!h) continue;
    const base = INTERIORS[h] || NEW_ROOMS[h];
    const r = { ...base, furniture: base.furniture, lights: base.lights, npcs: [] };
    for (const [role, [x, y]] of Object.entries(KEEPER_AT[h])) {
      const [name, look, outfit] = k[role];
      r.npcs.push(npc(role, role, name, x, y, look, outfit, role === 'board' ? { title: 'Ketua Balai' } : undefined));
    }
    interiors[h] = r;
  }
  return {
    id, w: W, h: H, wall: WALL, talkRadius: 48,
    spawn: { x: 900, y: 600 }, gateSpawn: { x: 900, y: GATE.y - 110 },
    buildings, npcs, interiors, theme: t.theme,
    lamps: [[300, 320], [1500, 320], [640, 650], [1160, 650], [300, 1060], [1500, 1060], [700, 1110], [1100, 1110], [900, 330]].map(([x, y]) => ({ x, y })),
    decor: [
      ['barrel', 50, 250], ['barrel', 66, 262], ['crate', 1752, 250], ['crate', 560, 250], ['barrel', 1000, 252],
      ['bench', 800, 560], ['bench', 1000, 560], ['bench', 760, 400], ['bench', 1040, 400],
      ['crate', 90, 1180], ['barrel', 1700, 1190], ['barrel', 1720, 1176], ['crate', 620, 1000], ['barrel', 1180, 990],
    ].map(([kind, x, y]) => ({ kind, x, y })),
  };
}

const L = (hair, hairColor) => ({ hair, hairColor });

const BIG = {
  rimba: bigTown('rimba', {
    theme: { biome: 'forest', ground: '#1c2a20', stone: [44, 58, 46], wall: ['#3f5442', '#26362a'], roofs: ['#2f5a3a', '#6b4a2a', '#3e6b4a', '#5a3a2a'], tree: 'oak', mist: '120,190,140', motes: 'leaf' },
    keepers: {
      gate: ['Penjaga Dirga', L(1, 2), ['#4a6b3a', '#2f4a26']], barber: ['Mak Sumi', L(3, 4), ['#c26a3a', '#8a4a26']],
      inn: ['Pak Rimbun', L(0, 2), ['#7a4a2a', '#5a3420']], potion: ['Nenek Akar', L(4, 5), ['#5a8a3a', '#3a6a26']],
      gear: ['Pandai Toro', L(0, 3), ['#6a6058', '#4a4440']], jeweler: ['Wulan', L(2, 1), ['#3a7a6a', '#26584a']],
      trainer: ['Guru Banyan', L(4, 2), ['#3a4a2a', '#26301c']], board: ['Kapten Selasih', L(1, 0), ['#2f6b4f', '#1f4a36']],
      weapons: ['Pandai Kayan', L(0, 1), ['#7a3a2a', '#5a261c']], armor: ['Ibu Lumut', L(3, 3), ['#4a6a5a', '#30483c']],
      jewelry: ['Nona Embun', L(2, 4), ['#6a8ad6', '#4a62a8']], storage: ['Pak Lumbung', L(1, 3), ['#8a6a3a', '#644a26']],
      mats: ['Saga', L(0, 4), ['#3a6a4a', '#264a34']],
    },
    folk: [
      { name: 'Raka', title: 'Pemburu', at: [700, 420], look: L(0, 2), outfit: ['#4a6b2a', '#30481c'], lines: ['Di Hutan Kelam bagian timur, musuhnya jauh lebih galak. Hati-hati.', 'Rimbawana dibangun di atas akar pohon tertua di hutan ini.'] },
      { name: 'Melati', title: 'Penjual Bunga', at: [1150, 580], look: L(2, 4), outfit: ['#d6608a', '#a83a64'], lines: ['Bunga kunang-kunang hanya mekar di malam hari. Cantik, kan?', 'Pedagang di sini menjual barang lebih bagus dari Kota Awal — tapi lebih mahal juga.'] },
      { name: 'Tole', title: 'Anak Kota', at: [880, 640], look: L(0, 5), outfit: ['#3fa7d6', '#2a7aa3'], scale: 0.72, wander: { rx: 120, ry: 40, speed: 0.5 }, lines: ['Batu teleport itu bisa membawamu ke kota mana pun yang pernah kau datangi!', 'Aku pernah lihat jamur raksasa di ujung timur hutan. Sumpah!'] },
      { name: 'Prajurit Bayu', title: 'Penjaga Kota', at: [900, 300], look: L(1, 3), outfit: ['#4b5563', '#374151'], wander: { rx: 560, ry: 6, speed: 0.1 }, lines: ['Gerbang selatan menuju Hutan Kelam. Jalan ke Kota Awal ada di ujung baratnya.', 'Malam hari kawanan musuh di hutan bertambah banyak.'] },
      { name: 'Dewi', title: 'Pengelana', at: [1400, 1050], look: L(3, 1), outfit: ['#8a5a9a', '#5e3a6e'], wander: { rx: 200, ry: 20, speed: 0.15 }, lines: ['Kudengar ada dungeon tersembunyi di Hutan Kelam. Gerbangnya berbeda bagi tiap orang.', 'Gudang di sini menyimpan barangmu, dan bisa kau ambil di kota besar mana pun.'] },
    ],
  }),
  beku: bigTown('beku', {
    theme: { biome: 'ice', ground: '#2a3442', stone: [70, 84, 104], wall: ['#5a6a82', '#38465a'], roofs: ['#3a5a8a', '#5a6a8a', '#2f4a6b', '#6a7a9a'], tree: 'snowpine', mist: '200,220,255', motes: 'snow', snow: true },
    keepers: {
      gate: ['Penjaga Haldor', L(1, 1), ['#5a6a82', '#38465a']], barber: ['Bu Salju', L(3, 5), ['#7aa0d6', '#4a6aa8']],
      inn: ['Bu Hangat', L(3, 2), ['#c2662d', '#8f4519']], potion: ['Tabib Kristal', L(4, 5), ['#6ab0d6', '#3a7aa8']],
      gear: ['Pandai Bjorn', L(0, 0), ['#6a7080', '#4a5060']], jeweler: ['Freya', L(2, 5), ['#5a6ad6', '#3a4aa8']],
      trainer: ['Guru Ulfa', L(1, 4), ['#4a5a6a', '#30404c']], board: ['Kapten Ingrid', L(2, 0), ['#2f5a6b', '#1f3e4a']],
      weapons: ['Pandai Gunnar', L(0, 3), ['#6a4a3a', '#4a3226']], armor: ['Ibu Bulu', L(3, 1), ['#8a8a9a', '#5a5a6a']],
      jewelry: ['Nona Aurora', L(2, 4), ['#9a7ad6', '#6a4aa8']], storage: ['Pak Beku', L(4, 1), ['#6a5a4a', '#4a3e32']],
      mats: ['Sigrun', L(1, 5), ['#4a7a9a', '#30566e']],
    },
    folk: [
      { name: 'Arne', title: 'Nelayan Es', at: [700, 420], look: L(0, 1), outfit: ['#3a5a7a', '#26405a'], lines: ['Danau di Padang Es membeku keras. Tapi jangan berdiri terlalu lama di atasnya.', 'Sup ikan Bu Hangat adalah alasan aku masih hidup.'] },
      { name: 'Liv', title: 'Pemahat Es', at: [1150, 580], look: L(2, 5), outfit: ['#9ab0d6', '#6a80a8'], lines: ['Patung esku meleleh tiap siang. Jadi aku memahat lagi tiap pagi.', 'Gua Kristal ada di sisi barat Padang Es. Kristalnya berkilau seperti bintang.'] },
      { name: 'Kai', title: 'Anak Kota', at: [880, 640], look: L(0, 2), outfit: ['#d64a4a', '#a83030'], scale: 0.72, wander: { rx: 120, ry: 40, speed: 0.5 }, lines: ['Mau perang bola salju? Ah, kau sibuk ya…', 'Ayahku bilang golem kristal itu dulunya manusia. Seram!'] },
      { name: 'Prajurit Eskil', title: 'Penjaga Kota', at: [900, 300], look: L(1, 0), outfit: ['#4b5563', '#374151'], wander: { rx: 560, ry: 6, speed: 0.1 }, lines: ['Bekubara tidak pernah jatuh. Dinginnya saja sudah mengusir musuh.', 'Gerbang selatan menuju Padang Es.'] },
      { name: 'Astrid', title: 'Pengelana', at: [1400, 1050], look: L(3, 4), outfit: ['#6a4a8a', '#4a3060'], wander: { rx: 200, ry: 20, speed: 0.15 }, lines: ['Etalase di sini lebih banyak barang Langka. Lihat-lihat dulu sebelum pergi.', 'Kalau tumbang di Padang Es, kau bangun di kota terakhir yang kau datangi.'] },
    ],
  }),
  pasir: bigTown('pasir', {
    theme: { biome: 'desert', ground: '#4a3626', stone: [120, 92, 64], wall: ['#9a7448', '#6a4e30'], roofs: ['#a8502a', '#c2843a', '#8a3a2a', '#b06a3a'], tree: 'palm', mist: '255,210,150', motes: 'sand' },
    keepers: {
      gate: ['Penjaga Farid', L(1, 0), ['#a8843a', '#7a5e26']], barber: ['Bang Zaki', L(0, 0), ['#d6a03a', '#a87626']],
      inn: ['Bu Kurma', L(3, 0), ['#c2662d', '#8f4519']], potion: ['Tabib Gurun', L(4, 2), ['#3aa89a', '#26766e']],
      gear: ['Pandai Hamid', L(0, 2), ['#7a6a58', '#5a4c40']], jeweler: ['Laila', L(2, 0), ['#a83a8a', '#7a2664']],
      trainer: ['Guru Sahar', L(1, 2), ['#6a4a2a', '#4a321c']], board: ['Kapten Nadira', L(2, 2), ['#8a5a2a', '#5e3c1b']],
      weapons: ['Pandai Rasyid', L(0, 0), ['#8a2a2a', '#5e1c1c']], armor: ['Ibu Sutra', L(3, 0), ['#d6a03a', '#a87626']],
      jewelry: ['Nona Mirage', L(2, 3), ['#3a8ad6', '#2662a8']], storage: ['Pak Unta', L(4, 0), ['#8a6a3a', '#644a26']],
      mats: ['Yusuf', L(1, 1), ['#6a8a3a', '#4a6226']],
    },
    folk: [
      { name: 'Omar', title: 'Kafilah', at: [700, 420], look: L(0, 0), outfit: ['#c2843a', '#8a5a26'], lines: ['Untaku hilang di Gurun Merah. Kalau kau melihatnya, jangan dimakan.', 'Oase di gurun itu nyata. Fatamorgana juga nyata. Bedanya, yang satu bisa diminum.'] },
      { name: 'Zahra', title: 'Penari', at: [1150, 580], look: L(2, 0), outfit: ['#d6508a', '#a83064'], lines: ['Pasirluas tidak pernah tidur. Pasar malamnya paling ramai di negeri ini.', 'Konon ada makam kuno di bawah pasir, penuh harta dan kutukan.'] },
      { name: 'Ali', title: 'Anak Kota', at: [880, 640], look: L(0, 0), outfit: ['#3fa7d6', '#2a7aa3'], scale: 0.72, wander: { rx: 120, ry: 40, speed: 0.5 }, lines: ['Aku bisa berjalan di pasir panas tanpa sandal! Aw, aw, aw.', 'Kak, kakak pernah melihat kalajengking raksasa?'] },
      { name: 'Prajurit Tariq', title: 'Penjaga Kota', at: [900, 300], look: L(1, 0), outfit: ['#4b5563', '#374151'], wander: { rx: 560, ry: 6, speed: 0.1 }, lines: ['Gerbang selatan menuju Gurun Merah. Bawa ramuan yang cukup.', 'Siang di gurun panas, malamnya lebih berbahaya.'] },
      { name: 'Samira', title: 'Pengelana', at: [1400, 1050], look: L(3, 2), outfit: ['#6a8a5a', '#4a6a3a'], wander: { rx: 200, ry: 20, speed: 0.15 }, lines: ['Pedagang di sini menjual barang Epik. Mahal, tapi pantas.', 'Teleport ke Kota Awal murah. Ke sini dari sana yang mahal.'] },
    ],
  }),
  bara: bigTown('bara', {
    theme: { biome: 'volcano', ground: '#221614', stone: [62, 46, 44], wall: ['#4a3430', '#2c1e1c'], roofs: ['#7a2a1a', '#4a2a2a', '#8a3a1a', '#3a2a2a'], tree: 'charred', mist: '255,120,60', motes: 'ember' },
    keepers: {
      gate: ['Penjaga Vulkan', L(1, 3), ['#6a3a2a', '#4a261c']], barber: ['Bang Arang', L(0, 2), ['#d6603a', '#a83e26']],
      inn: ['Bu Bara', L(3, 3), ['#c2662d', '#8f4519']], potion: ['Tabib Abu', L(4, 5), ['#8a5cf6', '#6d3fd6']],
      gear: ['Pandai Magma', L(0, 3), ['#5a4a48', '#3e3230']], jeweler: ['Rubi', L(2, 3), ['#d63a4a', '#a8263a']],
      trainer: ['Guru Obsidian', L(1, 0), ['#2a2a2a', '#1a1a1a']], board: ['Kapten Pijar', L(2, 3), ['#8a3a2a', '#5e261c']],
      weapons: ['Pandai Gora', L(0, 0), ['#6a2a1a', '#4a1c10']], armor: ['Ibu Sisik', L(3, 2), ['#5a3a3a', '#3e2626']],
      jewelry: ['Nona Lahar', L(2, 2), ['#e0702a', '#b04e1c']], storage: ['Pak Tungku', L(4, 3), ['#6a4a3a', '#4a3226']],
      mats: ['Sela Api', L(1, 3), ['#a84a2a', '#7a321c']],
    },
    folk: [
      { name: 'Ignis', title: 'Penambang', at: [700, 420], look: L(0, 3), outfit: ['#6a5a4a', '#4a3e32'], lines: ['Batu di Gunung Api masih hangat. Sebagian masih bergerak.', 'Benteng Lava ada di sisi barat gunung. Rajanya tidur di kolam api.'] },
      { name: 'Seruni', title: 'Pandai Kaca', at: [1150, 580], look: L(2, 3), outfit: ['#d6603a', '#a83e26'], lines: ['Kaca terbaik dibuat dari pasir gurun dan api gunung ini.', 'Baraapi adalah kota terakhir. Di sini, barang Legendaris dijual di etalase.'] },
      { name: 'Puntung', title: 'Anak Kota', at: [880, 640], look: L(0, 1), outfit: ['#3a3a3a', '#222'], scale: 0.72, wander: { rx: 120, ry: 40, speed: 0.5 }, lines: ['Aku tidak takut api! …Tapi aku takut gelap.', 'Kalau sudah besar aku mau jadi pandai besi seperti Pandai Magma!'] },
      { name: 'Prajurit Karang', title: 'Penjaga Kota', at: [900, 300], look: L(1, 3), outfit: ['#4b5563', '#374151'], wander: { rx: 560, ry: 6, speed: 0.1 }, lines: ['Gerbang selatan menuju Gunung Api. Hanya yang terkuat yang kembali.', 'Hujan abu lagi. Tutup mulutmu kalau berjalan.'] },
      { name: 'Vesta', title: 'Pengelana', at: [1400, 1050], look: L(3, 1), outfit: ['#8a2a4a', '#5e1c32'], wander: { rx: 200, ry: 20, speed: 0.15 }, lines: ['Aku datang ke sini lewat batu teleport. Berjalan kaki? Tidak, terima kasih.', 'Gunung Api: level 30 sampai 50. Jangan sok berani.'] },
    ],
  }),
};

const home = { id: 'home', ...TOWN, interiors: INTERIORS, theme: { biome: 'home' } };
// home gets a teleport stone on the plaza's east side
home.npcs = [...TOWN.npcs, npc('stone', 'teleport', 'Batu Teleport', 690, 455, null, ['#8f7bff', '#4b3aa8'], { object: 'stone' })];

export const TOWN_DEFS = { home, ...BIG };
export const townDef = (id) => TOWN_DEFS[id] || TOWN_DEFS.home;
export { NEW_ROOMS };

// Doors: outdoors in front of each house that has an interior; indoors in the gap of the bottom wall.
const doorCache = new Map();
export function doorsOf(def) {
  if (doorCache.has(def.id)) return doorCache.get(def.id);
  const doors = def.buildings.filter((b) => def.interiors[b.id]).map((b) => {
    const r = def.interiors[b.id];
    return {
      house: b.id,
      out: { x: b.x + b.w / 2 - 20, y: b.y + b.h - 2, w: 40, h: 16 },
      in: { x: r.w / 2 - r.doorW / 2, y: r.h - r.wall + 4, w: r.doorW, h: 30 },
      inside: { x: r.w / 2, y: r.h - r.wall - 22 },
      outside: { x: b.x + b.w / 2, y: b.y + b.h + 26 },
    };
  });
  doorCache.set(def.id, doors);
  return doors;
}
