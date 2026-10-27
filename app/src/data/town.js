// Town map (spec §13.2), in world units. Outer walls are `wall` thick; every
// house stands against the north wall facing the plaza, the dungeon gate sits
// in the south wall. Buildings and fences are solid boxes.
const HOUSE_Y = 30, HOUSE_W = 190, HOUSE_H = 190;
const house = (id, x, extra) => ({ id, kind: 'house', x, y: HOUSE_Y, w: HOUSE_W, h: HOUSE_H, ...extra });
const front = (x) => ({ x: x + HOUSE_W / 2, y: HOUSE_Y + HOUSE_H + 26 }); // where a shopkeeper stands

export const TOWN = {
  w: 960, h: 780, wall: 30,
  talkRadius: 48,
  spawn: { x: 480, y: 500 },      // plaza, when a slot is loaded
  gateSpawn: { x: 480, y: 610 },  // in front of the gate, after a dungeon trip
  buildings: [
    house('inn', 58, { sign: 'inn', roof: '#7a2e55', name: 'Penginapan' }),
    house('potion', 276, { sign: 'potion', roof: '#2f4a80', name: 'Toko Ramuan' }),
    house('gear', 494, { sign: 'pow', roof: '#6a4426', name: 'Toko Gear' }),
    house('home', 712, { roof: '#2f5a43', name: 'Rumah' }),
    { id: 'fence0', kind: 'fence', x: 30, y: 150, w: 28, h: 70 },
    { id: 'fence1', kind: 'fence', x: 248, y: 150, w: 28, h: 70 },
    { id: 'fence2', kind: 'fence', x: 466, y: 150, w: 28, h: 70 },
    { id: 'fence3', kind: 'fence', x: 684, y: 150, w: 28, h: 70 },
    { id: 'fence4', kind: 'fence', x: 902, y: 150, w: 28, h: 70 },
    { id: 'fire', kind: 'fire', x: 458, y: 405, w: 44, h: 30 },
    { id: 'gate', kind: 'gate', x: 390, y: 650, w: 180, h: 100 },
  ],
  // look/outfit follow art/doll.js; role picks the dialog in ui/npc.js
  npcs: [
    { id: 'inn', role: 'inn', name: 'Bu Marta', ...front(58), look: { hair: 3, hairColor: 1 }, outfit: ['#c2662d', '#8f4519'] },
    { id: 'potion', role: 'potion', name: 'Nenek Mira', ...front(276), look: { hair: 4, hairColor: 5 }, outfit: ['#8b5cf6', '#6d3fd6'] },
    { id: 'gear', role: 'gear', name: 'Pandai Brom', ...front(494), look: { hair: 0, hairColor: 3 }, outfit: ['#7a6f66', '#57504a'] },
    { id: 'gate', role: 'gate', name: 'Penjaga Rolan', x: 480, y: 632, look: { hair: 1, hairColor: 0 }, outfit: ['#6b7280', '#4b5563'] },
  ],
  lamps: [{ x: 120, y: 330 }, { x: 840, y: 330 }, { x: 300, y: 560 }, { x: 660, y: 560 }],
  decor: [
    { kind: 'barrel', x: 60, y: 250 }, { kind: 'barrel', x: 76, y: 262 }, { kind: 'crate', x: 262, y: 250 },
    { kind: 'crate', x: 690, y: 252 }, { kind: 'barrel', x: 900, y: 255 },
    { kind: 'bench', x: 400, y: 490 }, { kind: 'bench', x: 560, y: 490 },
    { kind: 'crate', x: 80, y: 700 }, { kind: 'barrel', x: 880, y: 705 }, { kind: 'barrel', x: 900, y: 690 },
  ],
};
