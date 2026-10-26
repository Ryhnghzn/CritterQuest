// Procedural pixel-art sprites. Every sprite is defined as a string map and
// baked into a small offscreen canvas once at startup — no image files.
function bake(rows, palette, scale = 1) {
  const h = rows.length, w = rows[0].length;
  const c = document.createElement('canvas');
  c.width = w * scale; c.height = h * scale;
  const g = c.getContext('2d');
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const col = palette[rows[y][x]];
    if (!col) continue;
    g.fillStyle = col;
    g.fillRect(x * scale, y * scale, scale, scale);
  }
  return c;
}

const CRITTER_PAL = {
  '.': null,
  o: '#1c1410', // outline
  W: '#fff7ee', // white
  K: '#241f1c', // black
  N: '#ff8a5c', // nose
};

export const SPRITES = {};

export function bakeAll() {
  // —— Emberkit: fox-like critter ——
  SPRITES.ember = bake([
    'o..............o',
    '.oo..........oo.',
    '.oro........oro.',
    '.orrrrooooorrrro',
    '.orrrrrrrrrrrrro',
    'oorrrrrrrrrrrrro',
    'orrrrWKrrrrWKrro',
    'orrrrKKrrrrKKrro',
    'orrrrrrrNNrrrrro',
    '.orrrrrrNNrrrrro',
    '.orrrrrrrrrrrro.',
    '..oorrrrrrrrroo.',
    '....ooooooooo...',
  ], { ...CRITTER_PAL, r: '#ff9b3d', o: '#6b3410' });

  // —— Bulblub: frog-like critter ——
  SPRITES.bulb = bake([
    '..oo........oo..',
    '.oWWo......oWWo.',
    '.oWKo......oWKo.',
    '.oooooooooooooo.',
    'obbbbbbbbbbbbbbo',
    'obbbbbbbbbbbbbbo',
    'obbKbbbbbbbbbKbo',
    'obbbbbNNNNbbbbbo',
    'obbbbNNNNNNbbbbo',
    '.obbbbbbbbbbbbo.',
    '.obbbbbbbbbbbbo.',
    '..oooooooooooo..',
  ], { ...CRITTER_PAL, b: '#4fd18b', o: '#145c36' });

  // —— Zepwing: bird-like critter ——
  SPRITES.zep = bake([
    '.......oo.......',
    '......oyyo......',
    '.....oyyyyo.....',
    '....oyyyyyyo....',
    '..ooyyyyyyyooo..',
    '.oyyyyyyyyyyyyo.',
    'oyyyyWKyyyyWKyyo',
    'oyyyyyKyyyyKyyyo',
    'oyyyyyyNNNNyyyyo',
    '.oyyyyyyyyyyyyo.',
    '..oyyyyyyyyyyo..',
    '....oooooooo....',
  ], { ...CRITTER_PAL, y: '#ffd54a', o: '#8a6410' });

  const BLOB_PAL = { o: '#2a1440', b: '#5b2d8f', B: '#7a45c2', W: '#fff', K: '#1a0b2e', R: '#ff5a6e', m: '#c26bd8' };

  // —— Slink: common chaser blob ——
  SPRITES.slink = bake([
    '....oooooo....',
    '..oobbbbbboo..',
    '.obbbbbbbbbbo.',
    '.obWKbbbbWKbo.',
    'obbbbbbbbbbbbo',
    'obbbbbRRRRbbbo',
    'obbbbbbbbbbbbo',
    '.obbbbbbbbbbo.',
    '..oooooooooo..',
  ], BLOB_PAL);

  // —— Darter: fast zigzag blob ——
  SPRITES.dart = bake([
    '..oo....oo..',
    '.obbooooobbo',
    'obbWKbbbWKbo',
    'obbbbbbbbbbo',
    'obbbRRRRbbbo',
    '.obbbbbbbbo.',
    '..oooooooo..',
  ], BLOB_PAL);

  // —— Bulwark: tank blob ——
  SPRITES.tank = bake([
    '.....oooooo.....',
    '...ooBBBBBBoo...',
    '..oBBBBBBBBBBo..',
    '.oBBWKBBBBWKBBo.',
    '.oBBBBBBBBBBBBo.',
    'oBBBBRRRRRRBBBBo',
    'oBBBBRRRRRRBBBBo',
    'oBBBBBBBBBBBBBBo',
    '.oBBBBBBBBBBBBo.',
    '.oBBBBBBBBBBBBo.',
    '..oBBBBBBBBBBo..',
    '...oooooooooo...',
  ], BLOB_PAL);

  // —— Maw King: boss ——
  SPRITES.boss = bake([
    '....oo........oo....',
    '...ommo......ommo...',
    '..ommmmo....ommmmo..',
    '.ommmmmmmmmmmmmmmmo.',
    'ommmmmWKmmmmmmWKmmmo',
    'ommmmmmmmmmmmmmmmmmo',
    'ommmmmRRRRRRRRmmmmmo',
    'ommmmmRWRRRRWRmmmmmo',
    'ommmmmRRRRRRRRmmmmmo',
    'ommmmmmmmmmmmmmmmmmo',
    '.ommmmmmmmmmmmmmmmo.',
    '.ommmmmmmmmmmmmmmmo.',
    '..ommmmmmmmmmmmmmo..',
    '...oooooooooooooo...',
  ], BLOB_PAL);

  // —— Pickups ——
  SPRITES.gem = bake([
    '..gg..',
    '.gyyyg',
    'gyyyyy',
    '.gyyyg',
    '..gg..',
  ], { g: '#2c8f5b', y: '#8fffc0' });

  SPRITES.bigGem = bake([
    '...gggg...',
    '..gyyyyy..',
    '.gyyyyyyy.',
    'gyyyyyyyyy',
    'gyyyWyyyyg',
    'gyyyyyyyyy',
    '.gyyyyyyy.',
    '..gyyyyy..',
    '...gggg...',
  ], { g: '#2c8f5b', y: '#8fffc0', W: '#eafff3' });

  SPRITES.heart = bake([
    '.rr.rr.',
    'rWWrWWr',
    'rWWWWWr',
    'rWWWWWr',
    '.rWWWr.',
    '..rWr..',
    '...r...',
  ], { r: '#a3122a', W: '#ff5a6e' });

  // —— Weapon icons (16x16) ——
  SPRITES.iconEmber = bake([
    '................',
    '.......oo.......',
    '......oFFo......',
    '.....oFFFFo.....',
    '....oFFWFFFo....',
    '...oFFFWWFFFo...',
    '...oFFWWWWFFo...',
    '...oFFWWWWFFo...',
    '....oFFWWFFo....',
    '.....oooooo.....',
  ], { o: '#571b00', F: '#ff7847', W: '#ffd54a' });

  SPRITES.iconBubble = bake([
    '................',
    '.....oooooo.....',
    '....oCCCCCCo....',
    '...oCCWCCCCCo...',
    '...oCCCCWCCCo...',
    '...oCCCCCCWCo...',
    '....oCCCCCCo....',
    '.....oooooo.....',
    '................',
  ], { o: '#0b4d6b', C: '#6ec9ff', W: '#e6f7ff' });

  SPRITES.iconGale = bake([
    '................',
    '.....gg..gg.....',
    '....gLLggLLg....',
    '....gLggggLg....',
    '.....ggLLgg.....',
    '....gLLggLLg....',
    '....gLggggLg....',
    '.....gg..gg.....',
    '................',
  ], { g: '#3f6d1c', L: '#a8e063' });

  SPRITES.iconZap = bake([
    '................',
    '........YY......',
    '.......YYo......',
    '......YYo.......',
    '..YY..Yo........',
    '...YYoY.........',
    '....oY.....YY...',
    '...YY.....Yo....',
    '...o......o.....',
    '................',
  ], { Y: '#ffe95a', o: '#8a6a00' });

  SPRITES.iconThorn = bake([
    '................',
    '.......GG.......',
    '......GgGg......',
    '.....Gg..gG.....',
    '..GG.Gg..gG.GG..',
    '.GggGG....GGggG.',
    '.Gg..G....G..gG.',
    '..GG........GG..',
    '................',
  ], { G: '#2c8f3f', g: '#8fffb0' });

  // —— Ground decoration tufts ——
  SPRITES.tuft = bake([
    '.g.g.',
    'gg.gg',
    '.ggg.',
  ], { g: '#24402c' });

  SPRITES.flower = bake([
    '.p.p.',
    'ppppp',
    '.ppp.',
    '..g..',
  ], { p: '#c26bd8', g: '#2c8f3f' });
}

// Draw a baked sprite centered at (x, y) with a uniform world scale.
export function drawSprite(ctx, img, x, y, scale, flip = false) {
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(img, -img.width * scale / 2, -img.height * scale / 2, img.width * scale, img.height * scale);
  ctx.restore();
}
