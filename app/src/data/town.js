// Town map and building interiors (spec §13.2, §15.1), in world units.
// Outdoors: outer walls `wall` thick, houses along the north wall facing the
// plaza, the dungeon gate in the south wall; buildings and fences are solid
// boxes. Each house has a door; walking into it enters its interior, where the
// shopkeepers live. Townsfolk (role 'talk') stand or stroll around and chat.
const HOUSE_Y = 30, HOUSE_W = 190, HOUSE_H = 190;
const house = (id, x, extra) => ({ id, kind: 'house', x, y: HOUSE_Y, w: HOUSE_W, h: HOUSE_H, ...extra });

// look/outfit follow art/doll.js. wander: { rx, ry, speed } strolls around (x, y).
const npc = (id, role, name, x, y, look, outfit, extra) => ({ id, role, name, x, y, look, outfit, ...extra });

export const TOWN = {
  w: 960, h: 780, wall: 30,
  talkRadius: 48,
  spawn: { x: 480, y: 500 },      // plaza, when a slot is loaded
  gateSpawn: { x: 480, y: 610 },  // in front of the gate, after a dungeon trip
  buildings: [
    house('inn', 58, { theme: 'inn', sign: 'inn', roof: '#7a2e55', name: 'Penginapan' }),
    house('potion', 276, { theme: 'potion', sign: 'potion', roof: '#3b3480', name: 'Toko Ramuan' }),
    house('gear', 494, { theme: 'smith', sign: 'pow', roof: '#4a3a33', name: 'Pandai Besi' }),
    house('guild', 712, { theme: 'guild', sign: 'arm', roof: '#2f5a43', name: 'Balai Petualang' }),
    { id: 'fence0', kind: 'fence', x: 30, y: 150, w: 28, h: 70 },
    { id: 'fence1', kind: 'fence', x: 248, y: 150, w: 28, h: 70 },
    { id: 'fence2', kind: 'fence', x: 466, y: 150, w: 28, h: 70 },
    { id: 'fence3', kind: 'fence', x: 684, y: 150, w: 28, h: 70 },
    { id: 'fence4', kind: 'fence', x: 902, y: 150, w: 28, h: 70 },
    { id: 'fire', kind: 'fire', x: 458, y: 405, w: 44, h: 30 },
    { id: 'gate', kind: 'gate', x: 390, y: 650, w: 180, h: 100 },
    { id: 'barber', kind: 'stall', x: 80, y: 548, w: 116, h: 56, name: 'Tukang Cukur' },
  ],
  npcs: [
    npc('gate', 'gate', 'Penjaga Rolan', 480, 632, { hair: 1, hairColor: 0 }, ['#6b7280', '#4b5563']),
    npc('barber', 'barber', 'Bang Rudi', 138, 628, { hair: 1, hairColor: 3 }, ['#e0527a', '#a8355a']),
    npc('dara', 'talk', 'Dara', 418, 396, { hair: 2, hairColor: 4 }, ['#b33a3a', '#7d2424'], { title: 'Petualang', lines: [
      'Lendir itu lambat, tapi jangan biarkan mereka mengepungmu.',
      'Kalau lantai sudah bersih, ambil dulu semua permata sebelum masuk portal.',
      'Musuh yang bersinar emas itu elite. Kuat, tapi selalu menjatuhkan barang bagus.',
      'Aku pernah sampai Lantai 4… lalu golem itu menginjakku. Hahaha.',
    ] }),
    npc('odo', 'talk', 'Kakek Odo', 560, 478, { hair: 4, hairColor: 2 }, ['#6d6a5c', '#4a473d'], { title: 'Tetua Kota', lines: [
      'Dulu Ruang Bawah Tanah itu gudang anggur. Sampai Raja Maw bangun dari tidurnya.',
      'Raja Maw menunggu di lantai paling dalam. Bawa ramuan perisai, Nak.',
      'Api unggun ini tak pernah padam sejak kota ini berdiri.',
    ] }),
    npc('pip', 'talk', 'Pip', 480, 470, { hair: 0, hairColor: 5 }, ['#3fa7d6', '#2a7aa3'], { title: 'Anak Kota', scale: 0.72, wander: { rx: 110, ry: 40, speed: 0.45 }, lines: [
      'Kak! Kak! Kakak petualang ya? Keren!',
      'Nenek Mira bilang ramuan amuk bikin orang jadi galak. Aku mau coba!',
      'Kalau besar nanti aku mau jadi pemanah seperti Kak Ruko.',
    ] }),
    npc('patrol', 'talk', 'Prajurit Gani', 480, 300, { hair: 1, hairColor: 3 }, ['#4b5563', '#374151'], { title: 'Penjaga Kota', wander: { rx: 320, ry: 6, speed: 0.12 }, lines: [
      'Malam ini tenang. Semoga tetap begitu.',
      'Pandai Brom menjual peti gear. Peti Agung mahal, tapi isinya bisa Mitos!',
      'Jangan berkeliaran di dekat gerbang kalau HP-mu tipis.',
    ] }),
    npc('sela', 'talk', 'Sela', 846, 372, { hair: 3, hairColor: 0 }, ['#d4a017', '#9c7410'], { title: 'Penyanyi Keliling', lines: [
      '♪ Di bawah tanah gelap gulita, sang petualang mencari cahaya… ♪',
      'Lagu baruku tentang pahlawan yang mengalahkan Raja Maw. Mungkin tentangmu?',
      'Penginapan Bu Marta punya sup terbaik di seluruh negeri.',
    ] }),
  ],
  lamps: [{ x: 120, y: 330 }, { x: 840, y: 330 }, { x: 300, y: 560 }, { x: 660, y: 560 }],
  decor: [
    { kind: 'barrel', x: 60, y: 250 }, { kind: 'barrel', x: 76, y: 262 }, { kind: 'crate', x: 262, y: 250 },
    { kind: 'crate', x: 690, y: 252 }, { kind: 'barrel', x: 900, y: 255 },
    { kind: 'bench', x: 400, y: 490 }, { kind: 'bench', x: 560, y: 490 },
    { kind: 'crate', x: 80, y: 700 }, { kind: 'barrel', x: 880, y: 705 }, { kind: 'barrel', x: 900, y: 690 },
  ],
};

// ——— interiors ———
// back: depth of the back wall (solid); furniture with solid: true blocks walking.
// Door gap in the bottom wall, centred. lights: warm/cool glows (x, y, r, rgb).
const room = (id, w, h, extra) => ({ id, w, h, wall: 24, back: 76, doorW: 50, talkRadius: 70, ...extra });

export const INTERIORS = {
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
      npc('vera', 'talk', 'Kapten Vera', 260, 104, { hair: 1, hairColor: 4 }, ['#2f6b4f', '#1f4a36'], { title: 'Ketua Balai', lines: [
        'Selamat datang di Balai Petualang. Papan tugas akan segera dibuka.',
        'Kau bisa melanjutkan dari lantai terdalam yang pernah kau capai — bilang saja ke Rolan di gerbang.',
        'Kepala di dinding itu? Replika. Raja Maw yang asli masih hidup di bawah sana.',
      ] }),
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
