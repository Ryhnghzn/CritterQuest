import { describe, it, expect } from 'vitest';
import { Game, ST } from './run.js';
import { CLASSES, CLASS_BASE } from '../data/classes.js';
import { expToNext } from '../meta/character.js';

const setup = (classId) => ({ classId, stats: { ...CLASS_BASE, ...CLASSES[classId].stats } });
const CLASS_IDS = Object.keys(CLASSES);

// Plays a run headlessly: circle around the room attacking.
function simulate(classId, seconds) {
  const g = new Game();
  g.start(setup(classId));
  for (let i = 0; i < seconds * 60 && g.state !== ST.OVER; i++) {
    g.intent = { move: { x: Math.cos(g.time * 0.9), y: Math.sin(g.time * 0.9) }, aimAt: null, dodge: false, attack: true };
    g.step(1 / 60);
  }
  return g;
}

const snapshot = (g) => ({
  state: g.state, time: g.time, kills: g.kills, level: g.level, xp: g.xp,
  hp: g.stats.hp, px: g.px, py: g.py, enemies: g.enemies.length,
});

describe('run', () => {
  it('berjalan tanpa DOM untuk tiap kelas', () => {
    for (const c of CLASS_IDS) {
      const g = simulate(c, 30);
      expect(g.time).toBeGreaterThan(0);
      expect(g.kills).toBeGreaterThan(0);
    }
  });

  it('deterministik: ronde yang sama menghasilkan state yang sama', () => {
    for (const c of CLASS_IDS) {
      expect(snapshot(simulate(c, 60))).toEqual(snapshot(simulate(c, 60)));
    }
  });
});

describe('hasil ronde', () => {
  it('EXP = total nilai permata yang diambil', () => {
    const g = simulate('warrior', 90);
    let total = g.xp;
    for (let l = 1; l < g.level; l++) total += expToNext(l);
    const r = g.result();
    expect(r.exp).toBe(total);
    expect(r).toEqual({ time: g.time, kills: g.kills, exp: total, gold: g.gold, items: [], bossKills: 0, killsBy: { slink: 2 }, elites: 0, elitesBy: {}, floorsCleared: 0, floor: g.deepest, cleared: false, dungeon: 'shadow', mats: g.mats, gems: [] });
  });

  it('menghitung bos yang dikalahkan', () => {
    const g = new Game();
    g.start(setup('archer'));
    g.spawnEnemy('boss').hp = 0;
    g.step(1 / 60);
    expect(g.result().bossKills).toBe(1);
  });

  it('menyerah mengakhiri ronde tanpa kehilangan hadiah', () => {
    const g = simulate('warrior', 20);
    const hp = g.stats.hp;
    const before = g.result();
    g.surrender();
    expect(g.state).toBe(ST.OVER);
    expect(g.stats.hp).toBe(hp);
    expect(g.result()).toEqual(before);
  });
});

describe('stat kelas', () => {
  it('ronde dimulai dengan stat akhir karakter', () => {
    const g = new Game();
    const stats = { ...CLASS_BASE, ...CLASSES.warrior.stats, maxHp: 260 };
    g.start({ classId: 'warrior', stats });
    expect(g.stats.hp).toBe(260);
    expect(g.stats.def).toBe(2);
  });

  it('def mengurangi damage sentuh (minimal 1)', () => {
    const g = new Game();
    g.start({ ...setup('warrior'), stats: { ...setup('warrior').stats, def: 5 } });
    g.spawnT = 1e9;
    const e = g.spawnEnemy('slink'); // dmg 8
    e.x = 0; e.y = 0;
    g.step(1 / 60);
    expect(g.stats.hp).toBe(140 - 3);
  });
});

describe('HP awal & ramuan di dungeon', () => {
  const pots = (o = {}) => ({ red: 0, big: 0, shield: 0, wind: 0, rage: 0, ...o });
  const start = (over) => {
    const g = new Game();
    g.start({ ...setup('warrior'), ...over });
    g.spawnT = 1e9;
    return g;
  };
  // potion: belt slot (0–3) or -1
  const step = (g, potion = -1) => {
    g.intent = { move: { x: 0, y: 0 }, aimAt: null, dodge: false, attack: false, potion };
    g.step(1 / 60);
  };
  const wait = (g, s) => { for (let i = 0; i < s * 60; i++) step(g); };

  it('ronde dimulai dengan HP karakter saat ini', () => {
    expect(start({ hp: 40 }).stats.hp).toBe(40);
    expect(start({}).stats.hp).toBe(140);
  });

  it('bisa mulai di lantai lain', () => {
    const g = start({ floor: 4 });
    expect(g.floor).toBe(4);
    expect(g.result().floor).toBe(4);
  });

  it('Ramuan Merah (slot 1): pulih 40% HP maks, jeda 1 detik, stok berkurang', () => {
    const g = start({ hp: 20, potions: pots({ red: 2 }) });
    step(g, 0);
    expect(g.stats.hp).toBeCloseTo(76);
    expect(g.potions.red).toBe(1);
    step(g, 0);
    expect(g.potions.red).toBe(1);
    wait(g, 1.1);
    step(g, 0);
    expect(g.potions.red).toBe(0);
    expect(g.stats.hp).toBe(132);
  });

  it('ramuan pulih tidak terbuang saat HP penuh; slot kosong / stok habis tidak berbuat apa-apa', () => {
    const g = start({ potions: pots({ red: 1, big: 0 }) });
    step(g, 0);
    expect(g.potions.red).toBe(1);
    g.stats.hp = 10;
    step(g, 1);
    expect(g.stats.hp).toBe(10);
    const h = start({ hp: 10, potions: pots({ red: 3 }), belt: [null, 'red', null, null] });
    step(h, 0);
    expect(h.stats.hp).toBe(10);
  });

  it('Ramuan Besar pulih 80%', () => {
    const g = start({ hp: 10, potions: pots({ big: 1 }) });
    step(g, 1);
    expect(g.stats.hp).toBeCloseTo(10 + 112);
  });

  it('Ramuan Perisai menyerap damage sentuh selama 8 detik', () => {
    const g = start({ potions: pots({ shield: 1 }) });
    step(g, 2);
    expect(g.shield).toBeCloseTo(140 * 0.3);
    const e = g.spawnEnemy('slink'); e.x = 0; e.y = 0; // dmg 8 − def 2
    step(g);
    expect(g.stats.hp).toBe(140);
    expect(g.shield).toBeCloseTo(42 - 6);
    e.hp = 0;
    wait(g, 8.1);
    expect(g.shield).toBe(0);
  });

  it('Ramuan Angin & Amuk: stat naik selama 10 detik lalu kembali', () => {
    const g = start({ potions: pots({ wind: 1, rage: 1 }), belt: ['wind', 'rage', null, null] });
    const base = { ...g.stats };
    step(g, 0);
    wait(g, 1.1);
    step(g, 1);
    expect(g.stats.moveSpd).toBeCloseTo(base.moveSpd * 1.35);
    expect(g.stats.atk).toBeCloseTo(base.atk * 1.3);
    expect(g.stats.atkSpd).toBeCloseTo(base.atkSpd * 1.2);
    expect(g.dodgeCdMul).toBe(0.5);
    g.setStats({ ...setup('warrior').stats, atk: 20 }); // poin dibagi di tengah buff
    expect(g.stats.atk).toBeCloseTo(26);
    wait(g, 10);
    expect(g.stats.moveSpd).toBeCloseTo(base.moveSpd);
    expect(g.stats.atk).toBe(20);
    expect(g.dodgeCdMul).toBe(1);
  });
});

describe('level karakter di dungeon', () => {
  const start = (level = 1, exp = 0) => {
    const g = new Game();
    g.start({ ...setup('warrior'), level, exp });
    g.spawnT = 1e9;
    return g;
  };
  const gem = (g, v) => { g.gems.push({ x: g.px, y: g.py, v, mag: false, big: false, t: 0 }); g.step(1 / 60); };

  it('permata EXP menambah EXP karakter dan naik level tanpa menghentikan permainan', () => {
    const g = start(2, 60); // butuh 70
    gem(g, 15);
    expect(g.level).toBe(3);
    expect(g.xp).toBe(5);
    expect(g.levelsGained).toBe(1);
    expect(g.state).toBe(ST.PLAY);
    expect(g.result().exp).toBe(15);
  });

  it('setStats: HP sekarang tetap, ditambah kenaikan HP maks', () => {
    const g = start();
    g.stats.hp = 50;
    g.setStats({ ...setup('warrior').stats, maxHp: 160 });
    expect(g.stats.hp).toBe(70);
    expect(g.stats.maxHp).toBe(160);
  });
});

describe('efek item unik', () => {
  const start = (effects, over = {}) => {
    const g = new Game();
    g.start({ ...setup('warrior'), effects, ...over });
    g.spawnT = 1e9;
    return g;
  };
  const step = (g) => { g.intent = { move: { x: 0, y: 0 }, aimAt: null, dodge: false, attack: false, potion: -1 }; g.step(1 / 60); };
  const hit = (g, e, mult = 1) => g.damageEnemy({ mult }, e);
  const noCrit = (g) => { g.stats.crit = 0; };

  it('eksekusi: damage +v ke musuh di bawah 30% HP', () => {
    const g = start({ execute: 0.5 }); noCrit(g);
    const e = g.spawnEnemy('tank'); e.x = 300;
    hit(g, e); const full = e.maxHp - e.hp;
    e.hp = e.maxHp * 0.2; const before = e.hp; hit(g, e);
    expect(before - e.hp).toBeCloseTo(full * 1.5);
  });

  it('damage bos & elite, menghisap darah', () => {
    const g = start({ bossdmg: 0.4, lifesteal: 0.05 }); noCrit(g);
    const b = g.spawnEnemy('boss'); b.x = 300;
    g.stats.hp = 50;
    hit(g, b);
    expect(b.maxHp - b.hp).toBeCloseTo(14 * 1.4);
    expect(g.stats.hp).toBeCloseTo(50 + 14 * 1.4 * 0.05);
  });

  it('petir berantai menyambar musuh terdekat', () => {
    const g = start({ chain: 1 }); noCrit(g);
    const a = g.spawnEnemy('tank'); a.x = 300; a.y = 0;
    const b = g.spawnEnemy('tank'); b.x = 360; b.y = 0;
    hit(g, a);
    expect(b.maxHp - b.hp).toBeCloseTo(14 * 0.8);
  });

  it('duri melukai penyerang; ledakan saat musuh tumbang', () => {
    const g = start({ thorns: 1, explode: 1 }); noCrit(g);
    const e = g.spawnEnemy('tank'); e.x = 0; e.y = 0;
    step(g);
    expect(e.maxHp - e.hp).toBeCloseTo(14);
    const k = g.spawnEnemy('slink'); k.x = 300; k.y = 0; k.hp = 0;
    const n = g.spawnEnemy('tank'); n.x = 320; n.y = 0;
    e.hp = e.maxHp; g.invuln = 99;
    step(g);
    expect(n.maxHp - n.hp).toBeCloseTo(14);
  });

  it('regenerasi & perisai berkala', () => {
    const g = start({ regen: 0.01, shield: 0.15 }, { hp: 10 });
    step(g);
    expect(g.shield).toBeCloseTo(140 * 0.15);
    for (let i = 0; i < 60; i++) step(g);
    expect(g.stats.hp).toBeCloseTo(10 + 1.4 * (61 / 60), 1);
  });

  it('amuk saat HP di bawah 50%; jeda dodge lebih cepat', () => {
    const g = start({ frenzy: 0.3, dodgecd: 0.4 }, { hp: 100 });
    const base = g.stats.atkSpd;
    step(g);
    expect(g.stats.atkSpd).toBeCloseTo(base);
    expect(g.dodgeCdMul).toBeCloseTo(0.6);
    g.stats.hp = 60; step(g);
    expect(g.stats.atkSpd).toBeCloseTo(base * 1.3);
    g.stats.hp = 100; step(g);
    expect(g.stats.atkSpd).toBeCloseTo(base);
  });

  it('koin & EXP bertambah', () => {
    const g = start({ goldfind: 0.4, expfind: 0.25 });
    g.addGold(10);
    expect(g.gold).toBe(14);
    g.gems.push({ x: g.px, y: g.py, v: 4, mag: false, big: false, t: 0 });
    step(g);
    expect(g.expGained).toBeCloseTo(5);
  });

  it('Cincin Phoenix: bangkit sekali dengan 30% HP', () => {
    const g = start({ phoenix: 0.3 });
    g.die();
    expect(g.state).toBe(ST.PLAY);
    expect(g.stats.hp).toBeCloseTo(42);
    g.die();
    expect(g.state).toBe(ST.OVER);
  });

  it('setSkills: slot yang berubah mulai dengan jeda penuh, slot lain tetap', () => {
    const g = new Game();
    g.start({ classId: 'warrior', stats: { ...CLASS_BASE, ...CLASSES.warrior.stats }, skills: ['spin', 'shout', null, null], level: 20 });
    g.skillCd[0] = 0.5;
    g.setSkills(['spin', 'warcry', null, null]);
    expect(g.skillDefs[1].id).toBe('warcry');
    expect(g.skillCd[1]).toBeCloseTo(g.skillCdMax[1]);
    expect(g.skillCd[0]).toBe(0.5);
  });

  it('naik level di dalam run memasang skill baru ke slot kosong pertama', () => {
    const g = new Game();
    g.start({ classId: 'warrior', stats: { ...CLASS_BASE, ...CLASSES.warrior.stats }, skills: ['spin', 'shout', null, null], level: 4 });
    expect(g.skillDefs[2]).toBeNull();
    g.gems.push({ x: g.px, y: g.py, v: expToNext(4) + 1 });
    g.step(1 / 60);
    expect(g.level).toBe(5);
    expect(g.skillDefs[2]?.id).toBe('quake');
    expect(g.bannerT).toBeGreaterThan(0);
  });

  it('level-up di run tidak mengisi lagi slot yang dikosongkan lewat setSkills di level yang sama', () => {
    const g = new Game();
    g.start({ classId: 'warrior', stats: { ...CLASS_BASE, ...CLASSES.warrior.stats }, skills: ['spin', 'shout', null, null], level: 4 });
    g.gems.push({ x: g.px, y: g.py, v: expToNext(4) + 1 });
    g.step(1 / 60);
    expect(g.skillDefs[2]?.id).toBe('quake');
    g.setSkills(['spin', 'shout', null, null]); // player unequips it
    g.step(1 / 60);
    expect(g.skillDefs[2]).toBeNull(); // the run never re-equips on its own
  });
});
