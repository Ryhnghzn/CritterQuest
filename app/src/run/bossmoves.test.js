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
    step(g, secs(C.shade.warn) + 1);
    expect(g.shots.length).toBe(C.count * C.ring.count);
  });
});

// plan "Bos Berkesan" A: wind-ups, openings, shadows to break
describe('Raja Maw: membaca & membalas', () => {
  const shades = (g) => g.enemies.filter((e) => e.type === 'mawshade');
  it('bayangan bisa dihancurkan: yang hancur tidak menembak, tanpa hadiah & tidak dihitung', () => {
    const { g, b } = move('boss', 'clones'), C = ENEMIES.boss.clones;
    step(g);
    const [a] = shades(g);
    expect(shades(g).length).toBe(C.count);
    expect(a.maxHp).toBeCloseTo(b.maxHp * C.shade.hp);
    const kills = g.kills, gear = g.loot.length;
    a.hp = 0; step(g);
    expect(shades(g).length).toBe(C.count - 1);
    step(g, secs(C.shade.warn) + 1);
    expect(g.shots.length).toBe((C.count - 1) * C.ring.count);
    expect(g.kills).toBe(kills); expect(g.loot.length).toBe(gear);
    step(g, 30);
    expect(shades(g).length).toBe(0); // the one that fired fades too
  });
  it('bayangan hilang bersama Maw', () => {
    const { g, b } = move('boss', 'clones');
    step(g);
    b.hp = 0; step(g, 3);
    expect(shades(g).length).toBe(0);
  });
  it('Telan meleset → tersedak: diam, tanpa damage sentuh, menerima damage lebih', () => {
    const { g, b } = move('boss', 'gulp'), S = ENEMIES.boss.gulp;
    g.px = -2000; g.py = 0; // far out of the pull
    step(g, secs(S.fuse) + 2);
    expect(b.tired).toBeGreaterThan(0);
    expect(b.vulnT).toBeGreaterThan(0);
    const hp = b.hp; g.damageEnemy({ mult: 1, fx: 'slash' }, b);
    const hit = hp - b.hp; b.vulnT = 0; const hp2 = b.hp; g.damageEnemy({ mult: 1, fx: 'slash' }, b);
    expect(hit / (hp2 - b.hp)).toBeCloseTo(1 + S.choke.taken, 5);
    b.vulnT = S.choke.time;
    const x = b.x; g.px = b.x; g.py = b.y; const php = g.stats.hp; g.invuln = 0; step(g, 10);
    expect(b.x).toBe(x); expect(g.stats.hp).toBe(php); // stands, no touch damage
    step(g, secs(S.choke.time) + 1);
    expect(b.tired).toBe(0);
  });
  it('Telan kena → tidak tersedak', () => {
    const { g, b } = move('boss', 'gulp'), S = ENEMIES.boss.gulp;
    g.invuln = 0; g.dodgeInv = 0;
    step(g, secs(S.fuse) + 2, );
    expect(b.tired || 0).toBe(0);
  });
  it('fase 2: menggigit dua kali, dibidik ulang', () => {
    const { g, b } = move('boss', 'gulp'), S = ENEMIES.boss.gulp;
    b.phase = 1; b.hp = b.maxHp * 0.4;
    g.px = -2000;
    step(g, 2); expect(g.hazards.filter((h) => h.kind === 'hole').length).toBe(1);
    step(g, secs(S.fuse));
    const second = g.hazards.find((h) => h.kind === 'hole');
    expect(second).toBeTruthy(); expect(second.max).toBe(S.again);
    expect(b.tired || 0).toBe(0); // only the last bite chokes
    step(g, secs(S.again) + 2);
    expect(b.tired).toBeGreaterThan(0);
  });
  it('ancang-ancang: cincin tidak keluar sebelum waktunya; jurus tidak beruntun', () => {
    const g = start(), b = g.spawnEnemy('boss');
    b.x = 200; b.y = 0; b.speed = 0; b.actT = 0;
    let picked = null;
    for (let i = 0; i < 200 && picked !== 'ring'; i++) { b.pat = null; b.actT = 0; b.mode = 'walk'; b.lastPat = null; g.shots.length = 0; step(g); picked = b.pat?.id; }
    expect(picked).toBe('ring');
    expect(g.shots.length).toBe(0);
    step(g, secs(ENEMIES.boss.tell.ring) - 2); expect(g.shots.length).toBe(0);
    step(g, 4); expect(g.shots.length).toBeGreaterThan(0);
    let last = null;
    for (let i = 0; i < 60; i++) { b.pat = null; b.actT = 0; b.mode = 'walk'; step(g); if (b.pat) { expect(b.pat.id).not.toBe(last); last = b.pat.id; } else if (b.mode === 'wind') { expect('charge').not.toBe(last); last = 'charge'; } }
  });
  it('Sang Gerhana menggemakan Telan tanpa tersedak & Bayang Kembar tanpa bayangan', () => {
    const g = start(), b = g.spawnEnemy('eclipseboss');
    b.x = 200; b.speed = 0; b.actT = 99;
    b.pat = { id: 'clones', t: 0, n: 0, fireT: 0, a0: 0, cfg: ENEMIES.boss };
    step(g); expect(shades(g).length).toBe(0);
    b.pat = { id: 'gulp', t: 0, n: 0, fireT: 0, a0: 0, cfg: ENEMIES.boss }; g.px = -2000;
    step(g, secs(ENEMIES.boss.gulp.fuse) + 2);
    expect(b.tired || 0).toBe(0);
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

// plan "Bos Berkesan" B
describe('Raja Mumi: kutukan berbalik & sarkofagus', () => {
  const guardsOf = (g) => g.enemies.filter((e) => e.type === 'tombguard');
  it('kutukan yang meledak di tubuh Mumi membuatnya pingsan & terluka', () => {
    const { g, b } = move('tombboss', 'curse'), C = ENEMIES.tombboss.curse;
    g.px = 170; g.py = 0; // close to the mummy at (200, 0) while the mark follows
    step(g, secs(C.follow) + 2);
    g.px = -400; // step out before it bursts
    const hp = b.hp;
    step(g, secs(C.fuse - C.follow) + 2);
    expect(b.tired).toBeGreaterThan(0);
    expect(hp - b.hp).toBeCloseTo(b.maxHp * C.stun.hurt, 0);
  });
  it('kutukan jauh dari Mumi tidak apa-apa', () => {
    const { g, b } = move('tombboss', 'curse'), C = ENEMIES.tombboss.curse;
    g.px = -300; g.py = 0;
    step(g, secs(C.fuse) + 2);
    expect(b.tired || 0).toBe(0);
  });
  it('fase 2: sarkofagus melindungi; hancurkan semua → perisai runtuh & pingsan; tanpa hadiah', () => {
    const g = start(), b = g.spawnEnemy('tombboss'), G = ENEMIES.tombboss.guards;
    b.x = 200; b.speed = 0;
    b.hp = b.maxHp * 0.45; step(g);
    const gs = guardsOf(g);
    expect(gs.length).toBe(G.count);
    expect(gs[0].maxHp).toBeCloseTo(b.maxHp * G.hp);
    let hp = b.hp; g.damageEnemy({ mult: 1, fx: 'slash' }, b); const shielded = hp - b.hp;
    // auto-aim goes for a sarcophagus in reach before the shielded mummy
    g.px = b.x - 100; g.py = b.y; gs[0].x = g.px - 150; gs[0].y = b.y; // the mummy 100 away, a sarcophagus 150 away
    expect(g.nearestEnemy(400)).toBe(gs[0]);
    const kills = g.kills, gear = g.loot.length;
    gs[0].hp = 0; step(g);
    expect(b.tired || 0).toBe(0); // one still stands
    gs[1].hp = 0; step(g);
    expect(b.tired).toBeGreaterThan(0);
    expect(b.guards).toBe(null);
    expect(g.kills).toBe(kills); expect(g.loot.length).toBe(gear);
    b.vulnT = 0; hp = b.hp; g.damageEnemy({ mult: 1, fx: 'slash' }, b);
    expect(shielded / (hp - b.hp)).toBeCloseTo(1 - G.cut, 5);
  });
  it('sarkofagus hilang bersama Mumi', () => {
    const g = start(), b = g.spawnEnemy('tombboss');
    b.x = 200; b.speed = 0; b.hp = b.maxHp * 0.45; step(g);
    b.hp = 0; step(g, 3);
    expect(guardsOf(g).length).toBe(0);
  });
  it('gema Kutukan milik Sang Gerhana tidak membuatnya pingsan', () => {
    const g = start(), b = g.spawnEnemy('eclipseboss');
    b.x = 200; b.speed = 0; b.actT = 99;
    b.pat = { id: 'curse', t: 0, n: 0, fireT: 0, a0: 0, cfg: ENEMIES.tombboss };
    g.px = 190; step(g, secs(ENEMIES.tombboss.curse.fuse) + 2);
    expect(b.tired || 0).toBe(0);
  });
});

// plan "Bos Berkesan" C
describe('Raja Lava: kepanasan', () => {
  const M = ENEMIES.lavaboss.meteor;
  const volley = (g) => step(g, secs((M.count + 2) * M.gap + 0.5));
  it('setelah hujan meteor ia diam; dari belakang lebih sakit, dari depan biasa', () => {
    const { g, b } = move('lavaboss', 'meteor');
    g.px = 0; g.py = 0; g.god = true;
    volley(g);
    expect(b.vent).toBeTruthy(); expect(b.tired).toBeGreaterThan(0);
    const front = b.hp; g.damageEnemy({ mult: 1, fx: 'slash' }, b); const f = front - b.hp;
    g.px = b.x + 120; g.py = b.y; // round to its back (it faced the player at (0, 0))
    const back = b.hp; g.damageEnemy({ mult: 1, fx: 'slash' }, b); const k = (back - b.hp) / f;
    expect(k).toBeCloseTo(M.vent.back, 5);
    step(g, secs(M.vent.time) + 2);
    expect(b.vent).toBe(null);
  });
  it('fase 2: kolam lava di dekatnya membatu saat ia mendinginkan diri', () => {
    const { g, b } = move('lavaboss', 'meteor');
    b.phase = 1; b.hp = b.maxHp * 0.4; g.god = true;
    g.hazards.push({ kind: 'zone', pool: true, x: b.x + 60, y: 0, r: 70, t: 30, max: 30, dmg: 8, tick: 0.5, tk: 0, follow: 0, by: 'lavaboss' });
    g.hazards.push({ kind: 'zone', pool: true, x: b.x + 2000, y: 0, r: 70, t: 30, max: 30, dmg: 8, tick: 0.5, tk: 0, follow: 0, by: 'lavaboss' });
    volley(g); step(g, 2);
    expect(g.hazards.filter((h) => h.pool).length).toBe(1);
  });
  it('gema Meteor milik Sang Gerhana tidak membuatnya kepanasan', () => {
    const g = start(), b = g.spawnEnemy('eclipseboss');
    b.x = 200; b.speed = 0; b.actT = 99; g.god = true;
    b.pat = { id: 'meteor', t: 0, n: 0, fireT: 0, a0: 0, cfg: ENEMIES.lavaboss };
    volley(g);
    expect(b.vent || null).toBe(null);
  });
});
