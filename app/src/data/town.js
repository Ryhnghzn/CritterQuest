// Town map and building interiors (spec §13.2, §15.1), in world units.
// Outdoors: outer walls `wall` thick, houses along the north wall facing the
// plaza, the dungeon gate in the south wall; buildings and fences are solid
// boxes. Each house has a door; walking into it enters its interior, where the
// shopkeepers live. Townsfolk (role 'talk') stand or stroll around and chat.
const HOUSE_Y = 40, HOUSE_W = 190, HOUSE_H = 190;
const house = (id, x, extra) => ({ id, kind: 'house', x, y: HOUSE_Y, w: HOUSE_W, h: HOUSE_H, ...extra });

// look/outfit follow art/doll.js. wander: { rx, ry, speed } strolls around (x, y).
const npc = (id, role, name, x, y, look, outfit, extra) => ({ id, role, name, x, y, look, outfit, ...extra });

// Kota Awal (2026-11-12, owner: "the village you were born in — busy, varied houses, a stable"): a big
// walled village. North: the shops (inn, potion shop, smithy, the Adventurers' Hall) either side of the
// great tree; the plaza with the bonfire in the middle, the rune stone east and the Rift's gate west;
// west: your own home and the neighbours' houses, the well, the fields and the barn; east: the stable
// with its paddock, more houses and the pond; south: the market on the road to the gate.
// style (houses): cottage | tall | thatch | wing | barn (render3d/townbuild.js), else a shop.
export const TOWN = {
  w: 2000, h: 1600, wall: 30,
  talkRadius: 48,
  spawn: { x: 1000, y: 820 },     // plaza, when a slot is loaded
  gateSpawn: { x: 1000, y: 1420 }, // in front of the gate, after a trip
  buildings: [
    house('inn', 120, { theme: 'inn', sign: 'inn', roof: '#7a2e55', name: 'Penginapan' }),
    house('potion', 380, { theme: 'potion', sign: 'potion', roof: '#3b3480', name: 'Toko Ramuan' }),
    house('gear', 1180, { theme: 'smith', sign: 'pow', roof: '#4a3a33', name: 'Pandai Besi' }),
    house('guild', 1440, { theme: 'guild', sign: 'arm', roof: '#2f5a43', name: 'Balai Petualang' }),
    // your home and the neighbours (west)
    { id: 'myhome', kind: 'house', x: 110, y: 400, w: 180, h: 160, style: 'cottage', roof: '#8a4a2a', name: 'Rumahmu' },
    { id: 'home1', kind: 'house', x: 360, y: 370, w: 170, h: 190, style: 'tall', roof: '#4a5a7a' },
    { id: 'home2', kind: 'house', x: 110, y: 680, w: 170, h: 150, style: 'thatch', roof: '#b89a52' },
    { id: 'home3', kind: 'house', x: 360, y: 680, w: 210, h: 160, style: 'wing', roof: '#6a3a3a' },
    { id: 'barn', kind: 'house', x: 110, y: 1180, w: 240, h: 190, style: 'barn', roof: '#5a2a20' },
    // the east side
    { id: 'home4', kind: 'house', x: 1480, y: 380, w: 160, h: 150, style: 'cottage', roof: '#3a6a5a' },
    { id: 'home5', kind: 'house', x: 1720, y: 360, w: 170, h: 190, style: 'tall', roof: '#7a5a2a' },
    { id: 'home6', kind: 'house', x: 1700, y: 1180, w: 180, h: 150, style: 'thatch', roof: '#a88a4a' },
    { id: 'fire', kind: 'fire', x: 978, y: 700, w: 44, h: 30 },
    { id: 'bigtree', kind: 'bigtree', x: 930, y: 120, w: 140, h: 110 },
    { id: 'well', kind: 'well', x: 640, y: 960, w: 50, h: 40 },
    { id: 'field1', kind: 'garden', x: 110, y: 960, w: 200, h: 80 },
    { id: 'field2', kind: 'garden', x: 360, y: 960, w: 200, h: 80 },
    { id: 'field3', kind: 'garden', x: 410, y: 1180, w: 160, h: 80 },
    { id: 'pond', kind: 'pond', x: 1440, y: 1200, w: 200, h: 120 },
    { id: 'market1', kind: 'market', x: 720, y: 1150, w: 130, h: 60, goods: 'fruit' },
    { id: 'market2', kind: 'market', x: 1150, y: 1150, w: 130, h: 60, goods: 'cloth' },
    { id: 'statue', kind: 'statue', x: 1240, y: 900, w: 40, h: 30 },
    { id: 'gate', kind: 'gate', x: 910, y: 1470, w: 180, h: 100 },
    { id: 'barber', kind: 'stall', x: 620, y: 560, w: 116, h: 56, name: 'Tukang Cukur' },
    { id: 'stable', kind: 'stall', x: 1480, y: 640, w: 116, h: 56, name: 'Kandang' },
    // the paddock east of the stable (posts & rails; the gap on the west side is the way in)
    { id: 'fence1', kind: 'fence', x: 1640, y: 780, w: 300, h: 14 },
    { id: 'fence3', kind: 'fence', x: 1926, y: 794, w: 14, h: 230 },
    { id: 'fence2', kind: 'fence', x: 1640, y: 1024, w: 300, h: 14 },
    { id: 'fence0', kind: 'fence', x: 1640, y: 794, w: 14, h: 80 },
  ],
  npcs: [
    npc('gate', 'gate', 'Penjaga Rolan', 1000, 1452, { hair: 1, hairColor: 0 }, ['#6b7280', '#4b5563']),
    npc('barber', 'barber', 'Bang Rudi', 678, 640, { hair: 1, hairColor: 3 }, ['#e0527a', '#a8355a']),
    npc('stable', 'stable', 'Mbah Sarju', 1538, 720, { hair: 4, hairColor: 1 }, ['#6a4a2a', '#4a3018'], { title: 'Penjaga Kandang' }),
    npc('dara', 'talk', 'Dara', 920, 790, { hair: 2, hairColor: 4 }, ['#b33a3a', '#7d2424'], { title: 'Petualang', lines: [
      'Lendir itu lambat, tapi jangan biarkan mereka mengepungmu.',
      'Kalau lantai sudah bersih, ambil dulu semua permata sebelum masuk portal.',
      'Musuh yang bersinar emas itu elite. Kuat, tapi selalu menjatuhkan barang bagus.',
      'Aku pernah sampai Lantai 4… lalu golem itu menginjakku. Hahaha.',
    ] }),
    npc('odo', 'talk', 'Kakek Odo', 1070, 770, { hair: 4, hairColor: 2 }, ['#6d6a5c', '#4a473d'], { title: 'Tetua Kota', lines: [
      'Dulu Ruang Bawah Tanah itu gudang anggur. Sampai Raja Maw bangun dari tidurnya.',
      'Raja Maw menunggu di lantai paling dalam. Bawa ramuan perisai, Nak.',
      'Api unggun ini tak pernah padam sejak kota ini berdiri.',
      'Rumahmu masih seperti dulu. Tidurlah di sana kalau lelah, gratis, tidak seperti penginapan Marta.',
    ] }),
    npc('pip', 'talk', 'Pip', 1000, 860, { hair: 0, hairColor: 5 }, ['#3fa7d6', '#2a7aa3'], { title: 'Anak Kota', scale: 0.72, wander: { rx: 130, ry: 30, speed: 0.45 }, lines: [
      'Kak! Kak! Kakak petualang ya? Keren!',
      'Nenek Mira bilang ramuan amuk bikin orang jadi galak. Aku mau coba!',
      'Kalau besar nanti aku mau jadi pemanah seperti Kak Ruko.',
    ] }),
    npc('patrol', 'talk', 'Prajurit Gani', 1000, 300, { hair: 1, hairColor: 3 }, ['#4b5563', '#374151'], { title: 'Penjaga Kota', wander: { rx: 280, ry: 6, speed: 0.1 }, lines: [
      'Malam ini tenang. Semoga tetap begitu.',
      'Pandai Brom menjual peti gear. Peti Agung mahal, tapi isinya bisa Mitos!',
      'Jangan berkeliaran di dekat gerbang kalau HP-mu tipis.',
    ] }),
    npc('sela', 'talk', 'Sela', 1110, 680, { hair: 3, hairColor: 0 }, ['#d4a017', '#9c7410'], { title: 'Penyanyi Keliling', lines: [
      '♪ Di bawah tanah gelap gulita, sang petualang mencari cahaya… ♪',
      'Lagu baruku tentang pahlawan yang mengalahkan Raja Maw. Mungkin tentangmu?',
      'Penginapan Bu Marta punya sup terbaik di seluruh negeri.',
    ] }),
    // the villagers at their daily work
    npc('darto', 'talk', 'Pak Darto', 210, 1080, { hair: 1, hairColor: 1 }, ['#6a7a3a', '#4a5a26'], { title: 'Petani', wander: { rx: 90, ry: 4, speed: 0.12 }, lines: [
      'Panen labu tahun ini besar-besar. Nanti kubawakan satu untuk ibumu.',
      'Sejak segel retak, babi hutan makin sering merusak ladang.',
    ] }),
    npc('sri', 'talk', 'Bu Sri', 460, 1080, { hair: 3, hairColor: 1 }, ['#a85a6a', '#7a3a4a'], { title: 'Peramu Daun', lines: [
      'Daun-daun ini nanti kujual ke Toko Ramuan. Lumayan untuk uang jajan Tika.',
      'Kalau kau melihat Bunga Kunang di hutan, petikkan satu untukku, ya.',
    ] }),
    npc('ijah', 'talk', 'Nenek Ijah', 300, 870, { hair: 4, hairColor: 5 }, ['#7a5a7a', '#5a3a5a'], { title: 'Nenek Tukang Cerita', lines: [
      'Dulu, waktu gerhana kecil itu, seluruh desa berkumpul di rumahmu. Kau menangis keras sekali.',
      'Kata orang tua dulu, kelima pecahan segel saling memanggil kalau didekatkan.',
    ] }),
    npc('tika', 'talk', 'Tika', 700, 1030, { hair: 2, hairColor: 2 }, ['#e0a03a', '#a8742a'], { title: 'Anak Desa', scale: 0.7, wander: { rx: 70, ry: 40, speed: 0.5 }, lines: [
      'Aku sedang menghitung ember. Satu, dua… eh, lupa lagi.',
      'Kakak tahu tidak? Di dasar sumur ini ada katak raksasa! …Mungkin.',
    ] }),
    npc('bimo', 'talk', 'Bimo', 1560, 900, { hair: 0, hairColor: 0 }, ['#5a8a3a', '#3a6a26'], { title: 'Anak Kandang', scale: 0.74, wander: { rx: 60, ry: 60, speed: 0.35 }, lines: [
      'Kuda-kuda Mbah Sarju suka wortel. Jangan bilang-bilang aku memberi mereka diam-diam.',
      'Suatu hari aku mau menunggang kuda sampai ke Bekubara!',
    ] }),
    npc('joko', 'talk', 'Mas Joko', 385, 1300, { hair: 0, hairColor: 3 }, ['#7a6a5a', '#5a4a3a'], { title: 'Pandai Kayu', lines: [
      'Atap lumbung ini bocor lagi. Untung hujan jarang di musim ini.',
      'Gagang kapak, kaki meja, pagar kandang… semua di desa ini buatanku.',
    ] }),
    npc('rini', 'talk', 'Mbak Rini', 785, 1230, { hair: 3, hairColor: 3 }, ['#d46a3a', '#a8482a'], { title: 'Pedagang Buah', lines: [
      'Apel segar dari kebun bukit! Untuk petualang, gratis satu… kalau kau senyum.',
      'Para pedagang dari Rimbawana bilang jalan ke timur makin berbahaya.',
    ] }),
    npc('wati', 'talk', 'Bu Wati', 1215, 1230, { hair: 2, hairColor: 0 }, ['#5a6aa8', '#3a4a7a'], { title: 'Pedagang Kain', lines: [
      'Kain ini ditenun di Bekubara. Hangat sekali untuk perjalanan ke utara.',
      'Mantel petualang? Datang lagi kalau koinmu sudah banyak, ya.',
    ] }),
    npc('lala', 'talk', 'Lala', 930, 690, { hair: 3, hairColor: 2 }, ['#c84a8a', '#8a2a5a'], { title: 'Penari Desa', lines: [
      'Aku berlatih untuk Festival Api Unggun tahun depan. Lihat putaranku!',
      'Sela bilang tarianku mirip nyala api. Itu pujian, kan?',
    ] }),
    npc('rangga', 'talk', 'Rangga', 1820, 650, { hair: 1, hairColor: 1 }, ['#4a5a3a', '#2e3a26'], { title: 'Pemburu', lines: [
      'Jejak serigala bayang makin dekat ke tembok desa. Hati-hati kalau keluar malam.',
      'Busur ini warisan ayahku. Belum pernah meleset… hampir.',
    ] }),
    npc('pengelana', 'talk', 'Sang Pengelana', 600, 900, { hair: 5, hairColor: 4 }, ['#5a4a6a', '#3a2e4a'], { title: 'Pengelana', lines: [
      'Air sumur desa ini yang paling segar di seluruh lembah.',
      'Aku sudah melihat Menara Gerhana dari jauh. Jangan ke sana sebelum siap.',
    ] }),
    npc('guard2', 'talk', 'Penjaga Sumi', 1130, 1440, { hair: 2, hairColor: 0 }, ['#5a6270', '#3e4450'], { title: 'Penjaga Gerbang', lines: [
      'Gerbang ditutup kalau gerhana datang lagi. Pulanglah sebelum itu.',
      'Rolan bilang aku terlalu cerewet untuk jadi penjaga. Menurutmu?',
    ] }),
  ],
  lamps: [{ x: 880, y: 640 }, { x: 1120, y: 640 }, { x: 880, y: 900 }, { x: 1120, y: 900 }, { x: 600, y: 400 }, { x: 1400, y: 400 },
    { x: 860, y: 1360 }, { x: 1140, y: 1360 }, { x: 330, y: 620 }, { x: 1680, y: 620 }],
  decor: [
    { kind: 'barrel', x: 330, y: 260 }, { kind: 'barrel', x: 346, y: 272 }, { kind: 'crate', x: 600, y: 260 }, { kind: 'crate', x: 1400, y: 262 },
    { kind: 'bench', x: 900, y: 760 }, { kind: 'bench', x: 1100, y: 760 }, { kind: 'bench', x: 1000, y: 640 },
    { kind: 'crate', x: 1620, y: 690 }, { kind: 'barrel', x: 1640, y: 700 }, { kind: 'crate', x: 380, y: 1160 }, { kind: 'barrel', x: 370, y: 1340 },
    { kind: 'crate', x: 860, y: 1180 }, { kind: 'barrel', x: 1300, y: 1180 }, { kind: 'bench', x: 560, y: 920 },
  ],
};

// interiors
// back: depth of the back wall (solid); furniture with solid: true blocks walking.
// Door gap in the bottom wall, centred. lights: warm/cool glows (x, y, r, rgb).
const room = (id, w, h, extra) => ({ id, w, h, wall: 24, back: 76, doorW: 50, talkRadius: 70, ...extra });

export const INTERIORS = {
  // your own home (2026-11-12): sleep in your bed for free, like at the inn
  myhome: room('myhome', 400, 300, {
    name: 'Rumahmu', floor: 'wood', wallColor: '#5a4636',
    furniture: [
      { kind: 'bed', x: 30, y: 84, w: 74, h: 110, solid: true },
      { kind: 'fireplace', x: 290, y: 14, w: 80, h: 64, solid: true },
      { kind: 'table', x: 170, y: 150, w: 80, h: 46, solid: true },
      { kind: 'stool', x: 150, y: 208 }, { kind: 'stool', x: 250, y: 208 },
      { kind: 'shelf', x: 120, y: 18, w: 120, h: 50, items: 'mugs' },
      { kind: 'chest', x: 320, y: 220, w: 46, h: 30, solid: true },
      { kind: 'rug', x: 140, y: 130, w: 140, h: 100, color: '#7a3a2a' },
      { kind: 'plant', x: 34, y: 230, w: 26, h: 26, solid: true },
      { kind: 'window', x: 50, y: 22, w: 46, h: 40 },
    ],
    lights: [{ x: 330, y: 60, r: 200, rgb: '255,150,70' }, { x: 200, y: 160, r: 120, rgb: '255,200,130' }],
    npcs: [
      npc('bed', 'rest', 'Tempat Tidur', 120, 150, null, ['#8a6a4a', '#5a4030'], { object: 'bed' }),
    ],
  }),
  inn: room('inn', 480, 340, {
    name: 'Penginapan', floor: 'wood', wallColor: '#5a3346',
    furniture: [
      { kind: 'counter', x: 40, y: 112, w: 170, h: 28, solid: true },
      { kind: 'fireplace', x: 300, y: 18, w: 96, h: 62, solid: true },
      { kind: 'stairs', x: 424, y: 76, w: 32, h: 92, solid: true },
      { kind: 'table', x: 268, y: 190, w: 48, h: 34, solid: true },
      { kind: 'table', x: 360, y: 252, w: 48, h: 34, solid: true },
      { kind: 'stool', x: 252, y: 205 }, { kind: 'stool', x: 332, y: 205 },
      { kind: 'stool', x: 344, y: 268 }, { kind: 'stool', x: 424, y: 268 },
      { kind: 'barrel', x: 52, y: 176, w: 22, h: 26, solid: true }, { kind: 'barrel', x: 52, y: 210, w: 22, h: 26, solid: true },
      { kind: 'rug', x: 150, y: 196, w: 90, h: 60 },
      { kind: 'shelf', x: 50, y: 20, w: 140, h: 50, items: 'mugs' },
      { kind: 'window', x: 220, y: 22, w: 46, h: 40 },
    ],
    npcs: [
      npc('inn', 'inn', 'Bu Marta', 124, 96, { hair: 3, hairColor: 1 }, ['#c2662d', '#8f4519']),
      npc('tired', 'talk', 'Petualang Lelah', 250, 210, { hair: 0, hairColor: 2 }, ['#5b6b3a', '#3d4a26'], { title: 'Tamu', lines: [
        'Zzz… hah? Oh. Aku baru pulang dari Lantai 3. Lenganku masih gemetar.',
        'Tidur di sini memulihkan HP penuh. Mahal sedikit, tapi sepadan.',
      ] }),
      npc('garo', 'talk', 'Garo', 440, 262, { hair: 4, hairColor: 3 }, ['#8a5a2b', '#5e3c1b'], { title: 'Pedagang Keliling', lines: [
        'Barang dari dungeon laku keras di kota sebelah. Simpan yang langka-langka!',
        'Kudengar ada cincin yang bisa membangkitkan orang mati. Cincin Phoenix namanya.',
      ] }),
    ],
    lights: [{ x: 348, y: 70, r: 190, rgb: '255,150,60' }, { x: 292, y: 196, r: 80, rgb: '255,200,120' }, { x: 384, y: 258, r: 80, rgb: '255,200,120' }, { x: 124, y: 110, r: 110, rgb: '255,190,110' }],
  }),
  potion: room('potion', 440, 320, {
    name: 'Toko Ramuan', floor: 'stone', wallColor: '#3a3366',
    furniture: [
      { kind: 'counter', x: 140, y: 112, w: 160, h: 28, solid: true, cloth: '#5b3f9e' },
      { kind: 'shelf', x: 34, y: 16, w: 120, h: 56, items: 'bottles' },
      { kind: 'shelf', x: 286, y: 16, w: 120, h: 56, items: 'bottles' },
      { kind: 'herbs', x: 170, y: 20, w: 100, h: 30 },
      { kind: 'cauldron', x: 60, y: 186, w: 48, h: 36, solid: true },
      { kind: 'crate', x: 370, y: 236, w: 30, h: 28, solid: true }, { kind: 'crate', x: 384, y: 262, w: 30, h: 28, solid: true },
      { kind: 'rug', x: 176, y: 196, w: 90, h: 56, color: '#4b3a7a' },
      { kind: 'plant', x: 40, y: 262 },
    ],
    npcs: [
      npc('potion', 'potion', 'Nenek Mira', 220, 96, { hair: 4, hairColor: 5 }, ['#8b5cf6', '#6d3fd6']),
      npc('lio', 'talk', 'Lio', 330, 196, { hair: 2, hairColor: 1 }, ['#2f6fb0', '#1f4f80'], { title: 'Murid Penyihir', lines: [
        'Ramuan Perisai itu menyerap pukulan. Pas untuk melawan bos!',
        'Ramuan Angin bikin kakimu ringan, dodge-mu juga lebih cepat siap.',
        'Aku sedang belajar menyeduh Ramuan Besar. Baru meledak tiga kali.',
      ] }),
    ],
    lights: [{ x: 84, y: 196, r: 150, rgb: '90,255,140' }, { x: 220, y: 110, r: 120, rgb: '200,150,255' }, { x: 94, y: 50, r: 70, rgb: '255,120,180' }, { x: 346, y: 50, r: 70, rgb: '120,200,255' }],
  }),
  gear: room('gear', 460, 320, {
    name: 'Pandai Besi', floor: 'stone', wallColor: '#3d3533',
    furniture: [
      { kind: 'forge', x: 30, y: 30, w: 100, h: 80, solid: true },
      { kind: 'anvil', x: 172, y: 150, w: 40, h: 22, solid: true },
      { kind: 'rack', x: 270, y: 18, w: 160, h: 56 },
      { kind: 'armorstand', x: 400, y: 186, w: 28, h: 24, solid: true },
      { kind: 'barrel', x: 30, y: 250, w: 22, h: 26, solid: true, water: true },
      { kind: 'crate', x: 400, y: 262, w: 30, h: 28, solid: true },
      { kind: 'grind', x: 300, y: 214, w: 36, h: 26, solid: true },
      { kind: 'counter', x: 320, y: 132, w: 90, h: 26, solid: true, cloth: '#5a3a7a' },
    ],
    npcs: [
      npc('gear', 'gear', 'Pandai Brom', 230, 148, { hair: 0, hairColor: 3 }, ['#7a6f66', '#57504a']),
      npc('jeweler', 'jeweler', 'Sari', 360, 120, { hair: 2, hairColor: 5 }, ['#5a3a7a', '#3a2450']),
      npc('tika', 'talk', 'Tika', 120, 150, { hair: 3, hairColor: 4 }, ['#a0522d', '#6e3a1f'], { title: 'Murid Pandai Besi', lines: [
        'Gear rongsokan dari dungeon bisa dijual ke Guru Brom. Lumayan buat beli ramuan.',
        'Gear dari dungeon dipasang lewat panel Karakter, tab Gear.',
        'Gear Mitos itu merah menyala. Aku belum pernah lihat langsung.',
      ] }),
    ],
    lights: [{ x: 80, y: 80, r: 220, rgb: '255,120,40' }, { x: 192, y: 150, r: 70, rgb: '255,170,90' }],
  }),
  guild: room('guild', 520, 340, {
    name: 'Balai Petualang', floor: 'wood', wallColor: '#2f4a3c',
    furniture: [
      { kind: 'board', x: 40, y: 18, w: 110, h: 54 },
      { kind: 'trophy', x: 236, y: 10, w: 48, h: 50 },
      { kind: 'banner', x: 180, y: 14, w: 24, h: 56, color: '#b33a3a' },
      { kind: 'banner', x: 316, y: 14, w: 24, h: 56, color: '#d4a017' },
      { kind: 'desk', x: 210, y: 118, w: 100, h: 26, solid: true },
      { kind: 'longtable', x: 150, y: 196, w: 220, h: 36, solid: true },
      { kind: 'bench', x: 160, y: 186, w: 200, h: 8 }, { kind: 'bench', x: 160, y: 242, w: 200, h: 8 },
      { kind: 'barrel', x: 466, y: 100, w: 22, h: 26, solid: true }, { kind: 'barrel', x: 466, y: 132, w: 22, h: 26, solid: true },
      { kind: 'window', x: 380, y: 22, w: 46, h: 40 },
      { kind: 'dummy', x: 46, y: 150, w: 26, h: 22, solid: true },
    ],
    npcs: [
      npc('trainer', 'trainer', 'Guru Hadi', 100, 150, { hair: 0, hairColor: 5 }, ['#3a3a3a', '#222']),
      npc('vera', 'board', 'Kapten Vera', 260, 104, { hair: 1, hairColor: 4 }, ['#2f6b4f', '#1f4a36'], { title: 'Ketua Balai' }),
      npc('ruko', 'talk', 'Ruko', 130, 248, { hair: 0, hairColor: 0 }, ['#2f8a4e', '#1f5e35'], { title: 'Pemanah', lines: [
        'Jaga jarak, tembak, mundur. Itu rahasia pemanah.',
        'LUK menaikkan peluang barang langka. Aku menaruh semua poinku di sana… mungkin terlalu banyak.',
      ] }),
      npc('lin', 'talk', 'Lin', 420, 176, { hair: 4, hairColor: 1 }, ['#6d3fd6', '#4b2a99'], { title: 'Penyihir', lines: [
        'Nova Es membekukan semua di sekitarmu. Pakai saat terkepung.',
        'DEX memperpendek jeda skill. Penyihir sangat butuh itu.',
      ] }),
      npc('bram', 'talk', 'Bram', 420, 270, { hair: 1, hairColor: 2 }, ['#9b2c2c', '#6b1e1e'], { title: 'Ksatria', lines: [
        'VIT, VIT, VIT! Darah tebal tak pernah salah.',
        'Ramuan Amuk sebelum bos. Percayalah padaku.',
      ] }),
    ],
    lights: [{ x: 260, y: 214, r: 170, rgb: '255,190,110' }, { x: 260, y: 40, r: 90, rgb: '255,170,90' }, { x: 95, y: 50, r: 80, rgb: '255,190,110' }],
  }),
};

// Doors: outdoors in front of each house that has an interior; indoors in the gap of the bottom wall.
export const DOORS = TOWN.buildings.filter((b) => INTERIORS[b.id]).map((b) => {
  const r = INTERIORS[b.id];
  return {
    house: b.id,
    out: { x: b.x + b.w / 2 - 20, y: b.y + b.h - 2, w: 40, h: 16 },         // walk up into it to enter
    in: { x: r.w / 2 - r.doorW / 2, y: r.h - r.wall + 4, w: r.doorW, h: 30 }, // walk down into it to leave
    inside: { x: r.w / 2, y: r.h - r.wall - 22 },
    outside: { x: b.x + b.w / 2, y: b.y + b.h + 26 },
  };
});
