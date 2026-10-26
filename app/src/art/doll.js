// Paper doll (spec §8): a character is composed from layers painted on one
// 16×20 skeleton facing right (left = horizontal flip). Layer order:
// body → armor → hair (hidden under a helm) → helm → weapon. Gear layers and
// the walk/attack/hurt frames arrive in langkah 3–4. Composites are cached per
// look and laid out as a sprite sheet so real image assets can replace them later.
export const DOLL_W = 16, DOLL_H = 20;

// frame name → cell indices in the sheet's single row
export const FRAMES = { idle: [0] };
const CELLS = 1;

const OUTLINE = '#1c1410';
const BODY_PAL = {
  o: OUTLINE, s: '#f2c29b', S: '#d49a74', e: '#241f1c', p: '#4a3b5c', b: '#3a2a20',
};

// c / C = outfit main / shade, tinted per class
export const OUTFIT = {
  warrior: ['#b04a3a', '#7e3026'],
  archer: ['#4f8a3c', '#356127'],
  mage: ['#4a5fc2', '#33428a'],
  assassin: ['#55556a', '#36364a'],
};

export const BODY = [
  '................',
  '................',
  '.....oooooo.....',
  '....osssssso....',
  '....osssssso....',
  '....ossssseo....',
  '....ossssseo....',
  '....osssssso....',
  '.....oSSSSo.....',
  '......oSSo......',
  '...occcccccco...',
  '..ocCccccccCco..',
  '..ocCccccccCco..',
  '..osCCCCCCCCso..',
  '...occcccccco...',
  '....oppppppo....',
  '....oppooppo....',
  '....oppooppo....',
  '....obboobbo....',
  '....oooooooo....',
];

// h / H = hair main / shade. Rows start at the top; missing rows are empty.
export const HAIR_NAMES = ['Pendek', 'Jabrik', 'Panjang', 'Bob', 'Kuncir'];
export const HAIR = [
  [
    '................',
    '................',
    '.....oooooo.....',
    '....ohhhhhho....',
    '....ohhhhHho....',
    '....ohH.........',
    '....oH..........',
  ],
  [
    '.....h..h..h....',
    '....ohhohhohho..',
    '....ohhhhhhhho..',
    '....ohhHhhhhho..',
    '....ohHhhhhhho..',
    '....ohH.........',
    '....oH..........',
  ],
  [
    '................',
    '................',
    '.....oooooo.....',
    '....ohhhhhho....',
    '...ohhhhhhHho...',
    '...ohhH.........',
    '...ohhH.........',
    '...ohhH.........',
    '...ohhH.........',
    '...ohH..........',
    '...oo...........',
  ],
  [
    '................',
    '................',
    '....oooooooo....',
    '...ohhhhhhhho...',
    '...ohhhhhhhho...',
    '...ohhH....ho...',
    '...ohhH....ho...',
    '...oooo....oo...',
  ],
  [
    '......ooo.......',
    '.....ohhho......',
    '.....oooooo.....',
    '....ohhhhhho....',
    '....ohhhhHho....',
    '.ooohH..........',
    'ohhhoH..........',
    'ohho............',
    '.oo.............',
  ],
];

export const HAIR_COLOR_NAMES = ['Hitam', 'Cokelat', 'Pirang', 'Merah', 'Biru', 'Putih'];
export const HAIR_PALETTE = [
  ['#2b2420', '#16110e'],
  ['#7a4a2a', '#55311a'],
  ['#e8c15a', '#b8902e'],
  ['#c2452e', '#8a2c1c'],
  ['#4a7fd0', '#2f5a9c'],
  ['#e8e8e8', '#b0b0b8'],
];

// palette keys each layer may use (checked by tests)
export const LAYER_KEYS = { body: 'oseSpbcC', hair: 'ohH' };

function paint(g, rows, pal, ox) {
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < DOLL_W; x++) {
      const col = pal[rows[y][x]];
      if (!col) continue;
      g.fillStyle = col;
      g.fillRect(ox + x, y, 1, 1);
    }
  }
}

const cache = new Map();

// → { image, w, h, frames } for a class + look ({ hair, hairColor }).
export function dollSheet(classId, look) {
  const key = `${classId}|${look.hair}|${look.hairColor}`;
  let sheet = cache.get(key);
  if (sheet) return sheet;
  const image = document.createElement('canvas');
  image.width = DOLL_W * CELLS; image.height = DOLL_H;
  const g = image.getContext('2d');
  const [c, C] = OUTFIT[classId];
  const [h, H] = HAIR_PALETTE[look.hairColor];
  for (let cell = 0; cell < CELLS; cell++) {
    const ox = cell * DOLL_W;
    paint(g, BODY, { ...BODY_PAL, c, C }, ox);
    paint(g, HAIR[look.hair], { o: OUTLINE, h, H }, ox);
  }
  sheet = { image, w: DOLL_W, h: DOLL_H, frames: FRAMES };
  cache.set(key, sheet);
  return sheet;
}

// Draws one frame with its top-left corner at (x, y).
export function drawDoll(g, sheet, frame, x, y, scale, flip = false) {
  const cell = sheet.frames[frame][0];
  g.save();
  g.imageSmoothingEnabled = false;
  if (flip) { g.translate(x + sheet.w * scale, y); g.scale(-1, 1); x = 0; y = 0; }
  g.drawImage(sheet.image, cell * sheet.w, 0, sheet.w, sheet.h, x, y, sheet.w * scale, sheet.h * scale);
  g.restore();
}

// A fresh <canvas> showing the idle frame, for menus.
export function portrait(classId, look, scale) {
  const c = document.createElement('canvas');
  c.width = DOLL_W * scale; c.height = DOLL_H * scale;
  drawDoll(c.getContext('2d'), dollSheet(classId, look), 'idle', 0, 0, scale);
  return c;
}
