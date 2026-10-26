// Playable characters & their auto-fire weapons (+5 levels each).
// Prototype content: replaced by the 4 classes (spec §4.2) in langkah 3.
export const CRITTERS = [
  {
    id: 'ember', name: 'EMBERKIT', sprite: 'ember',
    desc: 'Rubah api. Cepat & tembakan tunggal yang sakit.',
    hp: 90, speed: 118, magnet: 70, weapon: 'ember',
  },
  {
    id: 'bulb', name: 'BULBLUB', sprite: 'bulb',
    desc: 'Katak gelembung. Tebal darah, tembakan menyebar.',
    hp: 125, speed: 100, magnet: 70, weapon: 'bubble',
  },
  {
    id: 'zep', name: 'ZEPWING', sprite: 'zep',
    desc: 'Burung angin. Pisau orbit & daya tarik permata besar.',
    hp: 85, speed: 112, magnet: 110, weapon: 'gale',
  },
];

// Weapon level tables. Each weapon fires automatically.
export const WEAPONS = {
  ember: {
    id: 'ember', name: 'Tembakan Api', icon: 'iconEmber',
    desc: (l) => `Proyektil api ke musuh terdekat. (Lv ${l})`,
    levels: [
      { dmg: 14, count: 1, rate: 0.85, speed: 300, pierce: 0 },
      { dmg: 18, count: 1, rate: 0.75, speed: 320, pierce: 0 },
      { dmg: 18, count: 2, rate: 0.75, speed: 320, pierce: 0 },
      { dmg: 24, count: 2, rate: 0.62, speed: 340, pierce: 1 },
      { dmg: 30, count: 3, rate: 0.55, speed: 360, pierce: 1 },
    ],
  },
  bubble: {
    id: 'bubble', name: 'Ledakan Gelembung', icon: 'iconBubble',
    desc: (l) => `Semprotan gelembung menyebar. (Lv ${l})`,
    levels: [
      { dmg: 9, count: 3, rate: 1.0, speed: 220, pierce: 0 },
      { dmg: 11, count: 4, rate: 0.95, speed: 230, pierce: 0 },
      { dmg: 13, count: 5, rate: 0.9, speed: 240, pierce: 0 },
      { dmg: 16, count: 6, rate: 0.85, speed: 250, pierce: 1 },
      { dmg: 20, count: 7, rate: 0.75, speed: 260, pierce: 1 },
    ],
  },
  gale: {
    id: 'gale', name: 'Cincin Angin', icon: 'iconGale',
    desc: (l) => `Pisau angin mengorbit, memantul pelan. (Lv ${l})`,
    levels: [
      { dmg: 10, count: 2, rate: 2.4, speed: 2.6, pierce: 99, radius: 62 },
      { dmg: 13, count: 3, rate: 2.4, speed: 2.8, pierce: 99, radius: 66 },
      { dmg: 16, count: 3, rate: 2.2, speed: 3.0, pierce: 99, radius: 72 },
      { dmg: 20, count: 4, rate: 2.0, speed: 3.2, pierce: 99, radius: 78 },
      { dmg: 26, count: 5, rate: 1.8, speed: 3.5, pierce: 99, radius: 86 },
    ],
  },
  zap: {
    id: 'zap', name: 'Sambaran Petir', icon: 'iconZap',
    desc: (l) => `Petir berantai melompat ke musuh terdekat. (Lv ${l})`,
    levels: [
      { dmg: 16, count: 2, rate: 1.6, speed: 0, pierce: 0 },
      { dmg: 20, count: 3, rate: 1.5, speed: 0, pierce: 0 },
      { dmg: 26, count: 4, rate: 1.4, speed: 0, pierce: 0 },
      { dmg: 32, count: 5, rate: 1.25, speed: 0, pierce: 0 },
      { dmg: 40, count: 7, rate: 1.1, speed: 0, pierce: 0 },
    ],
  },
  thorn: {
    id: 'thorn', name: 'Ladang Duri', icon: 'iconThorn',
    desc: (l) => `Zona duri berkala di sekitarmu. (Lv ${l})`,
    levels: [
      { dmg: 12, count: 1, rate: 2.2, speed: 0, pierce: 0, radius: 78 },
      { dmg: 16, count: 1, rate: 2.0, speed: 0, pierce: 0, radius: 90 },
      { dmg: 20, count: 1, rate: 1.8, speed: 0, pierce: 0, radius: 102 },
      { dmg: 26, count: 1, rate: 1.6, speed: 0, pierce: 0, radius: 114 },
      { dmg: 34, count: 1, rate: 1.4, speed: 0, pierce: 0, radius: 128 },
    ],
  },
};
