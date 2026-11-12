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

const SIGNS = {
  inn: ['inn', 'Penginapan'], potion: ['potion', 'Toko Ramuan'], gear: ['pow', 'Pandai Besi'], guild: ['arm', 'Balai Petualang'],
  weapons: ['gearSword', 'Pandai Senjata'], armor: ['gearArmor', 'Penjahit Zirah'], jewelry: ['gearRing', 'Toko Perhiasan'],
  storage: ['chest', 'Gudang'], mats: ['gem', 'Pedagang Bahan'],
};
const HOUSE_THEME = { inn: 'inn', potion: 'potion', gear: 'smith', weapons: 'smith', guild: 'guild' };
const WALL = 30;
const lampsOf = (pts) => pts.map(([x, y]) => ({ x, y }));
const decorOf = (list) => list.map(([kind, x, y]) => ({ kind, x, y }));

// Each big town has its own plan (owner's request 2026-10-28: no two alike).
// houses: [id | null (townsfolk home), x, y, w?, h?] — doors face south;
// features: extra boxes (solid unless solid: false); gateX: gate in the south wall;
// stone / barber / folk: where the teleport stone, the barber's stall and the townsfolk stand.
const LAYOUTS = {
  // Rimbawana: a ring village of timber huts around a giant lantern tree, behind a palisade
  rimba: {
    w: 1900, h: 1500, gateX: 860, spawn: [950, 780], stone: [1130, 820], barber: [640, 830],
    night: [1350, 880], // the travelling merchant, 18:00–05:00
    houses: [['inn', 300, 120], ['potion', 560, 40], ['gear', 1150, 40], ['guild', 1410, 120], ['weapons', 130, 500], ['armor', 1580, 500],
      ['jewelry', 300, 960], ['storage', 560, 1060], ['mats', 1150, 1060], [null, 1410, 960, 160, 160], [null, 1660, 1180, 150, 150], [null, 80, 1180, 150, 150]],
    features: [
      { id: 'bigtree', kind: 'bigtree', x: 880, y: 560, w: 140, h: 110 },
      { id: 'well', kind: 'well', x: 420, y: 700, w: 50, h: 40 },
      { id: 'garden1', kind: 'garden', x: 1330, y: 720, w: 140, h: 60 },
    ],
    lamps: [[760, 470], [1140, 470], [760, 760], [1140, 760], [400, 450], [1500, 450], [860, 1300], [1040, 1300]],
    decor: [['barrel', 520, 330], ['crate', 1380, 330], ['bench', 820, 880], ['bench', 1080, 880], ['crate', 260, 760], ['barrel', 1640, 760], ['barrel', 1656, 772]],
    folk: [[620, 420], [1300, 640], [950, 960], [950, 420, { rx: 300, ry: 6, speed: 0.12 }], [1300, 1320]],
  },
  // Bekubara: a tall fortress — two columns of stone halls along a central avenue,
  // the frozen pond in the middle and the citadel (materials hall) at the top
  beku: {
    w: 1400, h: 1700, gateX: 610, spawn: [700, 820], stone: [880, 900], barber: [450, 1060],
    night: [450, 900], // the travelling merchant, 18:00–05:00
    houses: [['inn', 120, 60], ['potion', 120, 430], ['weapons', 120, 800], ['jewelry', 120, 1170],
      ['gear', 1090, 60], ['guild', 1090, 430], ['armor', 1090, 800], ['storage', 1090, 1170], ['mats', 595, 50, 210, 210]],
    features: [
      { id: 'pond', kind: 'pond', x: 560, y: 520, w: 280, h: 170 },
      { id: 'statue', kind: 'statue', x: 680, y: 1180, w: 40, h: 30 },
      { id: 'tower1', kind: 'tower', x: WALL, y: WALL, w: 60, h: 60 }, { id: 'tower2', kind: 'tower', x: 1310, y: WALL, w: 60, h: 60 },
      { id: 'tower3', kind: 'tower', x: WALL, y: 1610, w: 60, h: 60 }, { id: 'tower4', kind: 'tower', x: 1310, y: 1610, w: 60, h: 60 },
    ],
    lamps: [[520, 330], [880, 330], [520, 760], [880, 760], [520, 1120], [880, 1120], [520, 1500], [880, 1500]],
    decor: [['barrel', 380, 300], ['crate', 1020, 300], ['bench', 620, 780], ['bench', 780, 780], ['crate', 380, 1400], ['barrel', 1020, 1410]],
    folk: [[450, 700], [950, 700], [700, 1320], [700, 330, { rx: 150, ry: 6, speed: 0.15 }], [700, 1480]],
  },
  // Pasirluas: a wide bazaar town — flat-roofed houses on two rows, an oasis in the
  // middle and rows of market stalls on the way to the gate
  pasir: {
    w: 2400, h: 1150, gateX: 1110, spawn: [1200, 640], stone: [1450, 470], barber: [560, 470],
    night: [1750, 450], // the travelling merchant, 18:00–05:00
    houses: [['inn', 100, 40], ['potion', 360, 40], ['gear', 620, 40], ['guild', 1590, 40], ['weapons', 1850, 40], ['armor', 2110, 40],
      ['jewelry', 100, 660], ['storage', 360, 660], ['mats', 1850, 660], [null, 2110, 680, 170, 170], [null, 880, 40, 160, 160], [null, 1380, 40, 160, 160]],
    features: [
      { id: 'oasis', kind: 'oasis', x: 1080, y: 300, w: 240, h: 150 },
      { id: 'market1', kind: 'market', x: 680, y: 720, w: 130, h: 60, goods: 'cloth' },
      { id: 'market2', kind: 'market', x: 860, y: 800, w: 130, h: 60, goods: 'fruit' },
      { id: 'market3', kind: 'market', x: 1400, y: 720, w: 130, h: 60, goods: 'pots' },
      { id: 'market4', kind: 'market', x: 1580, y: 800, w: 130, h: 60, goods: 'spice' },
    ],
    lamps: [[1000, 560], [1400, 560], [700, 300], [1700, 300], [1050, 940], [1350, 940], [250, 560], [2150, 560]],
    decor: [['barrel', 600, 600], ['crate', 1780, 600], ['crate', 1796, 612], ['bench', 1120, 560], ['bench', 1280, 560], ['barrel', 330, 960], ['crate', 2000, 960]],
    folk: [[900, 500], [1600, 520], [760, 920], [1200, 560, { rx: 500, ry: 6, speed: 0.1 }], [1700, 960]],
  },
  // Baraapi: a forge city split by a lava channel with three stone bridges — halls on
  // the north bank, the great anvil between them, the plaza and gate on the south bank
  bara: {
    w: 1900, h: 1500, gateX: 860, spawn: [950, 470], stone: [1130, 1020], barber: [560, 1000],
    night: [1450, 450], // the travelling merchant, 18:00–05:00
    houses: [['inn', 100, 60], ['potion', 360, 60], ['gear', 620, 60], ['guild', 1090, 60], ['weapons', 1350, 60], ['armor', 1610, 60],
      ['jewelry', 100, 880], ['storage', 360, 880], ['mats', 1350, 880], [null, 1610, 880, 170, 170]],
    features: [
      { id: 'anvil', kind: 'monument', x: 880, y: 130, w: 140, h: 90 },
      { id: 'fire', kind: 'fire', x: 928, y: 980, w: 44, h: 30 },
      { id: 'lava1', kind: 'lava', x: WALL, y: 690, w: 470, h: 80 },
      { id: 'lava2', kind: 'lava', x: 620, y: 690, w: 270, h: 80 },
      { id: 'lava3', kind: 'lava', x: 1010, y: 690, w: 270, h: 80 },
      { id: 'lava4', kind: 'lava', x: 1400, y: 690, w: 470, h: 80 },
      { id: 'bridge1', kind: 'bridge', x: 500, y: 680, w: 120, h: 100, solid: false },
      { id: 'bridge2', kind: 'bridge', x: 890, y: 680, w: 120, h: 100, solid: false },
      { id: 'bridge3', kind: 'bridge', x: 1280, y: 680, w: 120, h: 100, solid: false },
    ],
    lamps: [[480, 640], [640, 640], [870, 640], [1030, 640], [1260, 640], [1420, 640], [760, 1200], [1140, 1200]],
    decor: [['barrel', 840, 300], ['crate', 1040, 300], ['bench', 820, 1100], ['bench', 1080, 1100], ['crate', 620, 1250], ['barrel', 1300, 1250]],
    folk: [[700, 450], [1250, 450], [950, 1180], [950, 360], [1450, 1200]],
  },
};

function bigTown(id, t) {
  const lay = LAYOUTS[id], roofs = t.theme.roofs;
  const gate = { x: lay.gateX, y: lay.h - WALL - 100, w: 180, h: 100 };
  const buildings = lay.houses.map(([h, x, y, w = HOUSE_W, hh = HOUSE_H], i) => {
    const [sign, name] = h ? SIGNS[h] : [null, null];
    return { ...house(h || `home${i}`, x, y, { theme: HOUSE_THEME[h] || null, sign, name, roof: roofs[i % roofs.length] }), w, h: hh };
  });
  buildings.push(...lay.features.map((f) => ({ ...f })),
    { id: 'gate', kind: 'gate', ...gate },
    { id: 'barber', kind: 'stall', x: lay.barber[0], y: lay.barber[1], w: 116, h: 56, name: 'Tukang Cukur' });
  const k = t.keepers;
  const npcs = [
    npc('gate', 'gate', k.gate[0], gate.x + gate.w / 2, gate.y - 18, k.gate[1], k.gate[2]),
    npc('barber', 'barber', k.barber[0], lay.barber[0] + 58, lay.barber[1] + 80, k.barber[1], k.barber[2]),
    npc('stone', 'teleport', 'Batu Teleport', lay.stone[0], lay.stone[1], null, ['#8f7bff', '#4b3aa8'], { object: 'stone' }),
    npc('night', 'night', 'Garo', lay.night[0], lay.night[1], { hair: 4, hairColor: 3 }, ['#3a2a5a', '#241a3a'], { night: true }),
    ...t.folk.map((f, i) => npc(`folk${i}`, 'talk', f.name, lay.folk[i][0], lay.folk[i][1], f.look, f.outfit, { title: f.title, lines: f.lines, wander: lay.folk[i][2] || f.wander, scale: f.scale })),
  ];
  const interiors = {};
  for (const [h] of lay.houses) {
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
    id, w: lay.w, h: lay.h, wall: WALL, talkRadius: 48,
    spawn: { x: lay.spawn[0], y: lay.spawn[1] }, gateSpawn: { x: gate.x + gate.w / 2, y: gate.y - 110 },
    buildings, npcs, interiors, theme: t.theme,
    lamps: lampsOf(lay.lamps), decor: decorOf(lay.decor),
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
      { name: 'Raka', title: 'Pemburu', look: L(0, 2), outfit: ['#4a6b2a', '#30481c'], lines: ['Di Hutan Kelam bagian timur, musuhnya jauh lebih galak. Hati-hati.', 'Rimbawana dibangun di atas akar pohon tertua di hutan ini.'] },
      { name: 'Melati', title: 'Penjual Bunga', look: L(2, 4), outfit: ['#d6608a', '#a83a64'], lines: ['Bunga kunang-kunang hanya mekar di malam hari. Cantik, kan?', 'Pedagang di sini menjual barang lebih bagus dari Kota Awal, tapi lebih mahal juga.'] },
      { name: 'Tole', title: 'Anak Kota', look: L(0, 5), outfit: ['#3fa7d6', '#2a7aa3'], scale: 0.72, wander: { rx: 120, ry: 40, speed: 0.5 }, lines: ['Batu teleport itu bisa membawamu ke kota mana pun yang pernah kau datangi!', 'Aku pernah lihat jamur raksasa di ujung timur hutan. Sumpah!'] },
      { name: 'Prajurit Bayu', title: 'Penjaga Kota', look: L(1, 3), outfit: ['#4b5563', '#374151'], wander: { rx: 560, ry: 6, speed: 0.1 }, lines: ['Gerbang selatan menuju Hutan Kelam. Jalan ke Kota Awal ada di ujung baratnya.', 'Malam hari kawanan musuh di hutan bertambah banyak.'] },
      { name: 'Dewi', title: 'Pengelana', look: L(3, 1), outfit: ['#8a5a9a', '#5e3a6e'], wander: { rx: 200, ry: 20, speed: 0.15 }, lines: ['Kudengar ada dungeon tersembunyi di Hutan Kelam. Gerbangnya berbeda bagi tiap orang.', 'Gudang di sini menyimpan barangmu, dan bisa kau ambil di kota besar mana pun.'] },
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
      { name: 'Arne', title: 'Nelayan Es', look: L(0, 1), outfit: ['#3a5a7a', '#26405a'], lines: ['Danau di Padang Es membeku keras. Tapi jangan berdiri terlalu lama di atasnya.', 'Sup ikan Bu Hangat adalah alasan aku masih hidup.'] },
      { name: 'Liv', title: 'Pemahat Es', look: L(2, 5), outfit: ['#9ab0d6', '#6a80a8'], lines: ['Patung esku meleleh tiap siang. Jadi aku memahat lagi tiap pagi.', 'Gua Kristal ada di sisi barat Padang Es. Kristalnya berkilau seperti bintang.'] },
      { name: 'Kai', title: 'Anak Kota', look: L(0, 2), outfit: ['#d64a4a', '#a83030'], scale: 0.72, wander: { rx: 120, ry: 40, speed: 0.5 }, lines: ['Mau perang bola salju? Ah, kau sibuk ya…', 'Ayahku bilang golem kristal itu dulunya manusia. Seram!'] },
      { name: 'Prajurit Eskil', title: 'Penjaga Kota', look: L(1, 0), outfit: ['#4b5563', '#374151'], wander: { rx: 560, ry: 6, speed: 0.1 }, lines: ['Bekubara tidak pernah jatuh. Dinginnya saja sudah mengusir musuh.', 'Gerbang selatan menuju Padang Es.'] },
      { name: 'Astrid', title: 'Pengelana', look: L(3, 4), outfit: ['#6a4a8a', '#4a3060'], wander: { rx: 200, ry: 20, speed: 0.15 }, lines: ['Etalase di sini lebih banyak barang Langka. Lihat-lihat dulu sebelum pergi.', 'Kalau tumbang di Padang Es, kau bangun di kota terakhir yang kau datangi.'] },
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
      { name: 'Omar', title: 'Kafilah', look: L(0, 0), outfit: ['#c2843a', '#8a5a26'], lines: ['Untaku hilang di Gurun Merah. Kalau kau melihatnya, jangan dimakan.', 'Oase di gurun itu nyata. Fatamorgana juga nyata. Bedanya, yang satu bisa diminum.'] },
      { name: 'Zahra', title: 'Penari', look: L(2, 0), outfit: ['#d6508a', '#a83064'], lines: ['Pasirluas tidak pernah tidur. Pasar malamnya paling ramai di negeri ini.', 'Konon ada makam kuno di bawah pasir, penuh harta dan kutukan.'] },
      { name: 'Ali', title: 'Anak Kota', look: L(0, 0), outfit: ['#3fa7d6', '#2a7aa3'], scale: 0.72, wander: { rx: 120, ry: 40, speed: 0.5 }, lines: ['Aku bisa berjalan di pasir panas tanpa sandal! Aw, aw, aw.', 'Kak, kakak pernah melihat kalajengking raksasa?'] },
      { name: 'Prajurit Tariq', title: 'Penjaga Kota', look: L(1, 0), outfit: ['#4b5563', '#374151'], wander: { rx: 560, ry: 6, speed: 0.1 }, lines: ['Gerbang selatan menuju Gurun Merah. Bawa ramuan yang cukup.', 'Siang di gurun panas, malamnya lebih berbahaya.'] },
      { name: 'Samira', title: 'Pengelana', look: L(3, 2), outfit: ['#6a8a5a', '#4a6a3a'], wander: { rx: 200, ry: 20, speed: 0.15 }, lines: ['Pedagang di sini menjual barang Epik. Mahal, tapi pantas.', 'Teleport ke Kota Awal murah. Ke sini dari sana yang mahal.'] },
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
      { name: 'Ignis', title: 'Penambang', look: L(0, 3), outfit: ['#6a5a4a', '#4a3e32'], lines: ['Batu di Gunung Api masih hangat. Sebagian masih bergerak.', 'Benteng Lava ada di sisi barat gunung. Rajanya tidur di kolam api.'] },
      { name: 'Seruni', title: 'Pandai Kaca', look: L(2, 3), outfit: ['#d6603a', '#a83e26'], lines: ['Kaca terbaik dibuat dari pasir gurun dan api gunung ini.', 'Baraapi adalah kota terakhir. Di sini, barang Legendaris dijual di etalase.'] },
      { name: 'Puntung', title: 'Anak Kota', look: L(0, 1), outfit: ['#3a3a3a', '#222'], scale: 0.72, wander: { rx: 120, ry: 40, speed: 0.5 }, lines: ['Aku tidak takut api! …Tapi aku takut gelap.', 'Kalau sudah besar aku mau jadi pandai besi seperti Pandai Magma!'] },
      { name: 'Prajurit Karang', title: 'Penjaga Kota', look: L(1, 3), outfit: ['#4b5563', '#374151'], wander: { rx: 560, ry: 6, speed: 0.1 }, lines: ['Gerbang selatan menuju Gunung Api. Hanya yang terkuat yang kembali.', 'Hujan abu lagi. Tutup mulutmu kalau berjalan.'] },
      { name: 'Vesta', title: 'Pengelana', look: L(3, 1), outfit: ['#8a2a4a', '#5e1c32'], wander: { rx: 200, ry: 20, speed: 0.15 }, lines: ['Aku datang ke sini lewat batu teleport. Berjalan kaki? Tidak, terima kasih.', 'Gunung Api: level 30 sampai 50. Jangan sok berani.'] },
    ],
  }),
};

const home = { id: 'home', ...TOWN, interiors: INTERIORS, theme: { biome: 'home' } };
// home gets a teleport stone on the plaza's east side
home.npcs = [...TOWN.npcs, npc('stone', 'teleport', 'Batu Teleport', 1220, 760, null, ['#8f7bff', '#4b3aa8'], { object: 'stone' }),
  // and the Rift's gate on its west side (spec §41.3): a torn arch, open once the story is over
  npc('rift', 'rift', 'Gerbang Celah', 780, 760, null, ['#d0306a', '#5a1440'], { object: 'rift' })];

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
