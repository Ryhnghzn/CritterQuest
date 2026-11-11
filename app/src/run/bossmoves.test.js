// Signature moves and phase 2 of the dungeon bosses (spec §41.2, plan bos-khas B2–B4).
import { describe, it, expect } from 'vitest';
import { Game } from './run.js';
import { CLASSES, CLASS_BASE } from '../data/classes.js';
import { ENEMIES } from '../data/enemies.js';
import { BOSS_TYPES } from '../data/dungeons.js';

const DT = 1 / 60;
function start() {
  const g = new Game();
  g.start({ classId: 'warrior', stats: { ...CLASS_BASE, ...CLASSES.warrior.stats, maxHp: 100000 } });
  g.spawnT = 1e9; g.queueI = g.queue.length; g.wave = 99;
  return g;
}
const step = (g, n = 1) => { for (let i = 0; i < n; i++) { g.intent = { move: { x: 0, y: 0 }, aimAt: null, dodge: false, attack: false, potion: -1 }; g.step(DT); } };
const secs = (s) => Math.round(s * 60);
// a boss standing still at (200, 0), running one move
function move(type, id) {
  const g = start(), b = g.spawnEnemy(type);
  b.x = 200; b.y = 0; b.speed = 0; b.actT = 99;
  b.pat = { id, t: 0, n: 0, fireT: 0, a0: 0 };
  return { g, b };
}

describe('every boss has its own moves and a phase 2', () => {
  it('signature moves are in its phase lists, and the phases differ', () => {
    for (const type of BOSS_TYPES.filter((t) => t !== 'eclipseboss')) {
      const B = ENEMIES[type];
      expect(B.signature.length, type).toBe(2);
      for (const id of B.signature) { expect(B.phases[0].patterns, type).toContain(id); expect(B[id], `${type}.${id}`).toBeTruthy(); }
      expect(B.phases[1].at).toBe(0.5);
      expect(B.phases[1].name).toBeTruthy();
    }
    const sigs = BOSS_TYPES.filter((t) => t !== 'eclipseboss').flatMap((t) => ENEMIES[t].signature);
    expect(new Set(sigs).size).toBe(sigs.length); // no two bosses share a move
  });
  it('dropping to half HP changes phase with a banner', () => {
    const g = start(), b = g.spawnEnemy('lavaboss');
    b.x = 200; b.speed = 0; let banner = null; g.showBanner = (s) => { banner = s; };
    b.hp = b.maxHp * 0.45; step(g);
    expect(b.phase).toBe(1); expect(banner).toBe(ENEMIES.lavaboss.phases[1].name);
  });
});

describe('Raja Maw', () => {
  it('Telan: pulls the player toward its mouth, then bites', () => {
    const { g } = move('boss', 'gulp');
    step(g);
    const h = g.hazards.find((z) => z.kind === 'hole');
    expect(h).toBeTruthy();
    const x0 = g.px; step(g, secs(0.5));
    expect(g.px).toBeGreaterThan(x0); // dragged toward the boss on the right
  });
  it('Bayang Kembar: shadows appear around the player, then each fires a ring', () => {
    const { g } = move('boss', 'clones'), C = ENEMIES.boss.clones;
    step(g);
    expect(g.hazards.filter((z) => z.dmg === 0).length).toBe(C.count);
    step(g, secs(C.warn) + 1);
    expect(g.shots.length).toBe(C.count * C.ring.count);
  });
});

describe('Golem Kristal', () => {
  it('Prisma: beams flare one after another between crystals around the player', () => {
    const { g } = move('crystalboss', 'prism'), P = ENEMIES.crystalboss.prism;
    step(g, secs(P.gap * 3)); // beams last `fuse`: several are up at once
    expect(g.hazards.filter((z) => z.kind === 'line' && z.dmg > 0).length).toBeGreaterThan(1);
  });
  it('Hujan Serpih: rows of shards sweep from the boss toward the player', () => {
    const { g } = move('crystalboss', 'shardrain'), S = ENEMIES.crystalboss.shardrain;
    step(g, secs(S.gap * 3));
    const rows = g.hazards.filter((z) => z.kind === 'circle' && z.small);
    expect(rows.length).toBeGreaterThanOrEqual((S.width * 2 + 1) * 2);
  });
});

describe('Ratu Spora', () => {
  it('Ladang Jamur: mushrooms around the player burst with poison', () => {
    const { g } = move('sporeboss', 'shrooms');
    step(g);
    const m = g.hazards.filter((z) => z.kind === 'circle' && z.onHit?.poison);
    expect(m.length).toBe(ENEMIES.sporeboss.shrooms.count);
  });
  it('Awan Racun: a cloud that follows the player and hurts every tick inside', () => {
    const { g } = move('sporeboss', 'cloud');
    step(g);
    const c = g.hazards.find((z) => z.kind === 'zone');
    const d0 = Math.hypot(c.x - g.px, c.y - g.py);
    step(g, secs(1));
    expect(Math.hypot(c.x - g.px, c.y - g.py)).toBeLessThan(d0);
    c.x = g.px; c.y = g.py; const hp = g.stats.hp; g.invuln = 0;
    step(g, secs(0.6));
    expect(g.stats.hp).toBeLessThan(hp);
  });
  it('phase 2 pools stay, at most `max` at a time', () => {
    const { g, b } = move('sporeboss', 'pools'), P = ENEMIES.sporeboss.pools;
    for (let i = 0; i < 4; i++) { b.pat = { id: 'pools', t: 0, n: 0, fireT: 0, a0: 0 }; step(g); }
    expect(g.hazards.filter((z) => z.pool).length).toBe(P.max);
  });
});

describe('Raja Mumi', () => {
  it('Kutukan: the mark follows the player, then stops before it bursts', () => {
    const { g } = move('tombboss', 'curse'), C = ENEMIES.tombboss.curse;
    step(g);
    const m = g.hazards.find((z) => z.chase);
    g.px = 40; step(g); expect(m.x).toBeCloseTo(40);
    step(g, secs(C.follow)); g.px = -60; step(g);
    expect(m.x).not.toBeCloseTo(-60);
  });
  it('Badai Pasir: the wind pushes the player while scarabs fly with it', () => {
    const { g } = move('tombboss', 'sandstorm');
    const x0 = g.px, y0 = g.py;
    step(g, secs(1));
    expect(Math.hypot(g.px - x0, g.py - y0)).toBeGreaterThan(30);
    expect(g.shots.some((s) => s.look === 'scarab')).toBe(true);
  });
});

describe('Raja Lava', () => {
  it('Erupsi: three cracks crawl outward from the boss', () => {
    const { g, b } = move('lavaboss', 'eruption'), E = ENEMIES.lavaboss.eruption;
    step(g, secs(E.gap * 4));
    const c = g.hazards.filter((z) => z.kind === 'circle' && z.small);
    expect(c.length).toBeGreaterThanOrEqual(E.lines * 3);
    const far = Math.max(...c.map((z) => Math.hypot(z.x - b.x, z.y - b.y)));
    expect(far).toBeGreaterThan(b.r + E.step * 2);
  });
  it('Meteor: big circles land on the player one after another', () => {
    const { g } = move('lavaboss', 'meteor'), M = ENEMIES.lavaboss.meteor;
    step(g, secs(M.gap * (M.count - 1) + 0.1)); // the last has landed, the first not yet burst
    expect(g.hazards.filter((z) => z.r === M.r).length).toBe(M.count);
  });
});

describe('Sang Gerhana', () => {
  it('its echo plays a signature move of another boss', () => {
    const g = start(), b = g.spawnEnemy('eclipseboss');
    b.x = 200; b.speed = 0; b.phase = 1; b.hp = b.maxHp * 0.6; b.actT = 0;
    const seen = new Set();
    for (let i = 0; i < 40; i++) { b.pat = null; b.actT = 0; b.mode = 'walk'; step(g); if (b.pat?.echo) seen.add(b.pat.id); }
    const sigs = new Set(ENEMIES.eclipseboss.echo.flatMap((id) => ENEMIES[id].signature));
    expect(seen.size).toBeGreaterThan(0);
    for (const id of seen) expect(sigs.has(id)).toBe(true);
  });
});
