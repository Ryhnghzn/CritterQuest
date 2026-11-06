import { describe, it, expect } from 'vitest';
import { Game, ST } from './run.js';
import { CLASSES, CLASS_BASE } from '../data/classes.js';
import { expToNext } from '../meta/character.js';
import { TEMPO } from '../data/balance.js';
import { MOUNT } from '../data/mounts.js';

const setup = (classId) => ({ classId, stats: { ...CLASS_BASE, ...CLASSES[classId].stats } });
const CLASS_IDS = Object.keys(CLASSES);

// Plays a run headlessly: circle around the room attacking.
function simulate(classId, seconds) {
  const g = new Game();
  g.start(setup(classId));
  for (let i = 0; i < seconds * 60 && g.state !== ST.OVER; i++) {
    const k = 1 / TEMPO.move; // the same circle as before the tempo pass (spec §33.1)
    g.intent = { move: { x: Math.cos(g.time * 0.9) * k, y: Math.sin(g.time * 0.9) * k }, aimAt: null, dodge: false, attack: true };
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
    expect(r.exp).toBe(Math.floor(total + 1e-9)); // per-enemy EXP is fractional since §33.4
    expect(Object.values(r.killsBy).reduce((a, b) => a + b, 0)).toBe(g.kills);
    expect(r).toEqual({ time: g.time, kills: g.kills, exp: r.exp, gold: g.gold, items: g.loot, bossKills: g.bossKills, killsBy: g.killsBy, elites: g.elites, elitesBy: g.elitesBy, floorsCleared: g.floorsCleared, floor: g.deepest, cleared: false, dungeon: 'shadow', mats: g.mats, gems: [] });
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

  it('naik ke level ultimate di dalam run langsung membuka ultimate', () => {
    const g = new Game();
    g.start({ classId: 'warrior', stats: { ...CLASS_BASE, ...CLASSES.warrior.stats }, skills: ['spin', 'shout', null, null], level: 24 });
    expect(g.ult).toBeNull();
    g.gems.push({ x: g.px, y: g.py, v: expToNext(24) + 1 });
    g.step(1 / 60);
    expect(g.level).toBe(25);
    expect(g.ult?.id).toBe('bladestorm');
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

describe('Warrior: Murka & Terjang', () => {
  const warrior = (extra = {}) => {
    const g = new Game();
    g.start({ classId: 'warrior', stats: { ...CLASS_BASE, ...CLASSES.warrior.stats }, skills: ['charge', 'spin', null, null], level: 5, ...extra });
    return g;
  };
  const press = { move: { x: 0, y: 0 }, aimAt: null, dodge: false, attack: false, auto: false, skill1: true, skill2: false, skill3: false, skill4: false, ult: false, potion: -1 };

  it('Terjang yang membunuh musuh memulihkan jedanya seketika', () => {
    const g = warrior();
    const e = g.spawnEnemy('slink');
    e.hp = 1; e.x = g.px + 40; e.y = g.py;
    g.energy = 100;
    g.intent = press;
    g.step(1 / 60);
    expect(e.hp).toBeLessThanOrEqual(0);
    expect(g.skillCd[0]).toBe(0);
  });

  it('Terjang tanpa membunuh tetap memakai jeda', () => {
    const g = warrior();
    const e = g.spawnEnemy('slink');
    e.hp = 1e9; e.maxHp = 1e9; e.x = g.px + 40; e.y = g.py;
    g.energy = 100;
    g.intent = press;
    g.step(1 / 60);
    expect(g.skillCd[0]).toBeGreaterThan(1);
  });

  it('serangan dasar yang kena mengisi Murka', () => {
    const g = warrior();
    const e = g.spawnEnemy('slink');
    e.hp = 1e9; e.maxHp = 1e9; e.x = g.px + 20; e.y = g.py;
    g.intent = { ...press, skill1: false, attack: true };
    g.step(1 / 60);
    expect(g.trait.v).toBeGreaterThanOrEqual(3);
  });
  it('damage dari skill mereset jeda Murka tanpa menambah bar', () => {
    const g = warrior();
    const e = g.spawnEnemy('slink');
    e.hp = 1e9; e.maxHp = 1e9;
    g.trait.idle = 2.5;
    g.damageEnemy({ mult: 1, skill: true, fx: 'spin' }, e);
    expect(g.trait.idle).toBe(0);
    expect(g.trait.v).toBe(0);
  });
});

describe('Mage Panas, Archer Bidik, Assassin Kombo (wiring)', () => {
  const mk = (classId, skills, level = 25) => {
    const g = new Game();
    g.start({ classId, stats: { ...CLASS_BASE, ...CLASSES[classId].stats, crit: 0 }, skills, level });
    g.spawnT = 1e9;
    return g;
  };
  const idle = { move: { x: 0, y: 0 }, aimAt: null, dodge: false, attack: false, auto: false, skill1: false, skill2: false, skill3: false, skill4: false, ult: false, potion: -1 };
  const dummy = (g, x = 40, y = 0) => { const e = g.spawnEnemy('tank'); Object.assign(e, { x: g.px + x, y: g.py + y, hp: 1e6, maxHp: 1e6, speed: 0, dmg: 0 }); return e; };

  it('Kepanasan mengunci semua skill dan memperlambat gerak', () => {
    const g = mk('mage', ['meteor', 'nova', null, null]);
    g.energy = 100;
    g.trait.v = 60;
    g.intent = { ...idle, skill1: true };
    g.step(1 / 60); // 60 + 33 = 93: bonus, still ready
    expect(g.trait.lock).toBe(0);
    g.energy = 100; g.skillCd[1] = 0; g.trait.v = 80;
    g.intent = { ...idle, skill2: true };
    g.step(1 / 60); // nova (45 × 0.6 = 27) tips it over
    expect(g.trait.lock).toBeGreaterThan(2);
    g.energy = 100; g.skillCd[0] = 0;
    g.intent = { ...idle, skill1: true };
    g.step(1 / 60);
    expect(g.skillCd[0]).toBe(0); // not cast
    expect(g.energy).toBeGreaterThan(95); // and no energy spent
    g.intent = { ...idle, move: { x: 1, y: 0 } };
    const x0 = g.px; g.step(1 / 60);
    const slowed = g.px - x0;
    g.trait.lock = 0; g.intent = { ...idle, move: { x: 1, y: 0 } };
    const x1 = g.px; g.step(1 / 60);
    expect(slowed).toBeLessThan((g.px - x1) * 0.8);
  });

  it('bonus damage Panas dan pengali Kombo masuk ke hit skill', () => {
    const a = mk('assassin', ['fan', null, null, null]);
    dummy(a);
    a.energy = 100; a.trait.v = 5;
    a.intent = { ...idle, skill1: true };
    a.step(1 / 60);
    const fan = a.hits.filter((h) => h.skill);
    expect(fan.length).toBeGreaterThan(0);
    expect(fan[0].mult).toBeCloseTo(CLASSES.assassin.skills[1].mult * 2.25);
    expect(fan[0].execute).toBe(0.3);
    expect(a.trait.v).toBe(0);
  });

  it('eksekusi: musuh biasa di bawah 30% mati, bos dan elite tidak', () => {
    const g = mk('assassin', ['fan', null, null, null]);
    const mkE = (extra) => { const e = dummy(g); Object.assign(e, extra); e.hp = 29; e.maxHp = 100; return e; };
    const normal = mkE({}), boss = mkE({ boss: true }), elite = mkE({ elite: true }), healthy = mkE({}); healthy.hp = 50;
    for (const e of [normal, boss, elite, healthy]) g.damageEnemy({ mult: 0.001, skill: true, execute: 0.3, fx: 'dagger' }, e);
    expect(normal.hp).toBeLessThanOrEqual(0);
    expect(boss.hp).toBeGreaterThan(0);
    expect(elite.hp).toBeGreaterThan(0);
    expect(healthy.hp).toBeGreaterThan(0);
  });

  it('skillDmg Panas menambah damage skill', () => {
    const g = mk('mage', ['nova', null, null, null]);
    const e = dummy(g);
    g.damageEnemy({ mult: 1, skill: true, fx: 'nova' }, e);
    const base = 1e6 - e.hp; e.hp = 1e6;
    g.trait.v = 90;
    g.damageEnemy({ mult: 1, skill: true, fx: 'nova' }, e);
    expect(1e6 - e.hp).toBeCloseTo(base * 1.3, 0);
  });

  it('panah Bidik penuh: menembus 3, lebih besar, pasti kritis', () => {
    const g = mk('archer', ['rain', null, null, null]);
    g.trait.v = 100; g.trait.focus = true;
    g.intent = { ...idle, attack: true };
    g.step(1 / 60);
    const p = g.hits.find((h) => h.kind === 'proj');
    expect(p.pierce).toBe(3);
    expect(p.r).toBe(CLASSES.archer.attack.r * 2);
    expect(p.crit).toBe(true);
    expect(g.trait.v).toBeLessThan(2); // emptied (the same step may refill a sliver)
    const e = dummy(g);
    g.damageEnemy({ mult: 1, crit: true, fx: 'arrow' }, e); // crit stat is 0 here
    expect(1e6 - e.hp).toBeCloseTo(g.stats.atk * g.stats.critDmg, 0);
  });

  it('Lompatan Mundur mengisi Bidik dan lompatannya tidak menghapusnya; panah berikutnya fokus', () => {
    const g = mk('archer', ['leap', null, null, null]);
    g.energy = 100;
    g.intent = { ...idle, skill1: true };
    g.step(1 / 60);
    expect(g.dodgeT).toBeGreaterThan(0);
    for (let i = 0; i < 4; i++) { g.intent = { ...idle }; g.step(1 / 60); }
    expect(g.trait.focus).toBe(true);
    g.intent = { ...idle, attack: true };
    g.step(1 / 60);
    const p = g.hits.find((h) => h.kind === 'proj');
    expect(p.crit).toBe(true);
    expect(p.pierce).toBe(3);
  });

  it('menghindar sungguhan mengosongkan Bidik', () => {
    const g = mk('archer', ['rain', null, null, null]);
    g.trait.v = 100; g.trait.focus = true;
    g.intent = { ...idle, dodge: true };
    g.step(1 / 60);
    expect(g.trait.focus).toBe(false);
    expect(g.trait.v).toBe(0);
  });
});

const exploreGame = (extra = {}) => { const g = new Game(); g.explore({ ...setup('warrior'), region: 'forest', ...extra }); return g; };

// tingkat modul: dipakai juga oleh tes Bagian B (impor ke field.test.js atau salin)
const HORSE = { id: 'horse', rarity: 0, fly: false, skin: 0 };
// panggil lalu tunggu 70 langkah; musuh dibersihkan tiap langkah supaya tidak ada pukulan yang menjatuhkan
export const rideNow = (g) => {
  g.intent = { ...g.intent, mount: true }; g.enemies.length = 0; g.step(1 / 60);
  g.intent = { ...g.intent, mount: false };
  for (let i = 0; i < 70; i++) { g.enemies.length = 0; g.step(1 / 60); }
};
describe('mount di wilayah (§35.1)', () => {
  it('tanpa setup.mount: tombol mount tidak berbuat apa-apa', () => {
    const g = exploreGame(); rideNow(g);
    expect(g.mount.state).toBe('none');
  });
  it('menunggang: lebih cepat ×MOUNT.speed', () => {
    const a = exploreGame({ mount: HORSE }), b = exploreGame({ mount: HORSE });
    rideNow(a); a.enemies.length = 0; b.enemies.length = 0;
    const ax = a.px, bx = b.px;
    a.intent = { ...a.intent, move: { x: 1, y: 0 } }; b.intent = { ...b.intent, move: { x: 1, y: 0 } };
    a.step(1 / 60); b.step(1 / 60);
    expect((a.px - ax) / (b.px - bx)).toBeCloseTo(MOUNT.speed[0], 1);
  });
  it('menekan menghindar saat menunggang: turun dan menghindar di langkah yang sama', () => {
    const g = exploreGame({ mount: HORSE }); rideNow(g); g.enemies.length = 0;
    g.intent = { ...g.intent, dodge: true }; g.step(1 / 60);
    expect(g.mount.state).toBe('none');
    expect(g.dodgeT).toBeGreaterThan(0);
  });
  it('kena pukul saat menunggang: jatuh dan terkunci', () => {
    const g = exploreGame({ mount: HORSE }); rideNow(g);
    g.invuln = 0; g.dodgeInv = 0;
    expect(g.hurtPlayer(5)).toBe(true);
    expect(g.mount.state).toBe('none');
    expect(g.mount.lock).toBeGreaterThan(0);
    expect(g.mountFxT).toBe(MOUNT.fxTime);
  });
  it('kena pukul saat baru memanggil: batal tanpa debu', () => {
    const g = exploreGame({ mount: HORSE });
    g.intent = { ...g.intent, mount: true }; g.enemies.length = 0; g.step(1 / 60);
    expect(g.mount.state).toBe('summoning');
    g.invuln = 0; g.dodgeInv = 0; g.hurtPlayer(5);
    expect(g.mount.state).toBe('none');
    expect(g.mountFxT).toBe(0);
  });
  it('dungeon: mount tidak pernah aktif', () => {
    const g = new Game(); g.start({ classId: 'warrior', stats: { ...CLASS_BASE, ...CLASSES.warrior.stats }, mount: HORSE });
    expect(g.mount.id).toBe(null);
  });
});
