import { describe, it, expect } from 'vitest';
import { Game } from './run.js';
import { CLASSES, CLASS_BASE } from '../data/classes.js';

const DT = 1 / 60;

// A run with no spawning and one dummy enemy (huge HP, standing still) at (x, y).
function arena(classId, { x = 30, y = 0, stats = {} } = {}) {
  const g = new Game();
  g.start({ classId, stats: { ...CLASS_BASE, ...CLASSES[classId].stats, crit: 0, ...stats } });
  g.spawnT = 1e9;
  const e = g.spawnEnemy('tank');
  Object.assign(e, { x, y, hp: 1e6, maxHp: 1e6, speed: 0, dmg: 0 });
  return { g, e };
}
function hold(g, seconds, intent) {
  for (let t = 0; t < seconds - 1e-9; t += DT) {
    g.intent = { move: { x: 0, y: 0 }, aimAt: null, dodge: false, attack: true, ...intent };
    g.step(DT);
  }
}
const dealt = (e) => 1e6 - e.hp;

describe('serangan dasar', () => {
  it('tidak menyerang bila tombol tidak ditahan', () => {
    const { g, e } = arena('warrior');
    hold(g, 1, { attack: false });
    expect(dealt(e)).toBe(0);
  });

  it('ritme = interval / atkSpd selama ditahan', () => {
    const { g, e } = arena('warrior'); // 0.55 s, atk 14
    hold(g, 1);
    expect(dealt(e)).toBeCloseTo(2 * 14);
    const fast = arena('warrior', { stats: { atkSpd: 2 } }); // 0.275 s
    hold(fast.g, 1);
    expect(dealt(fast.e)).toBeCloseTo(4 * 14);
  });

  it('kritis mengalikan damage dengan critDmg', () => {
    const { g, e } = arena('warrior', { stats: { crit: 100 } });
    hold(g, DT);
    expect(dealt(e)).toBeCloseTo(14 * 1.5);
  });

  it('tebasan warrior tidak mengenai musuh di belakang', () => {
    const { g, e } = arena('warrior', { x: -30 });
    g.aimX = 1; g.aimY = 0;
    hold(g, 1, { aimAt: { x: 100, y: 0 } });
    expect(dealt(e)).toBe(0);
  });

  it('tusukan assassin jarak dekat saja', () => {
    const near = arena('assassin', { x: 30 });
    hold(near.g, DT);
    expect(dealt(near.e)).toBeGreaterThan(0);
    const far = arena('assassin', { x: 80 });
    hold(far.g, 1, { aimAt: { x: 200, y: 0 } });
    expect(dealt(far.e)).toBe(0);
  });

  it('panah archer mencapai musuh jauh', () => {
    const { g, e } = arena('archer', { x: 300 });
    hold(g, 1);
    expect(dealt(e)).toBeGreaterThan(0);
  });

  it('bola api mage meledak dan mengenai musuh di sekitar', () => {
    const { g, e } = arena('mage', { x: 200 });
    const side = g.spawnEnemy('slink');
    Object.assign(side, { x: 200, y: 30, hp: 1e6, speed: 0, dmg: 0 });
    hold(g, 1);
    expect(dealt(e)).toBeCloseTo(16);
    expect(1e6 - side.hp).toBeCloseTo(16);
  });
});

// Extra still dummies at the given offsets; returns them.
function dummies(g, offsets, type = 'tank') {
  return offsets.map(([x, y]) => {
    const e = g.spawnEnemy(type);
    Object.assign(e, { x, y, hp: 1e6, maxHp: 1e6, speed: 0, dmg: 0 });
    return e;
  });
}
const cast = (g, n, extra = {}) => hold(g, DT, { attack: false, [`skill${n}`]: true, ...extra });
const idle = (g, s, extra = {}) => hold(g, s, { attack: false, ...extra });

describe('serang otomatis', () => {
  it('menyerang sendiri bila ada musuh dalam jangkauan', () => {
    const { g, e } = arena('warrior', { x: 40 });
    idle(g, 1, { auto: true });
    expect(dealt(e)).toBeGreaterThan(0);
  });
  it('tidak mengayun ke udara bila musuh di luar jangkauan', () => {
    const { g, e } = arena('warrior', { x: 300 });
    idle(g, 1, { auto: true });
    expect(dealt(e)).toBe(0);
    expect(g.attackT).toBeLessThanOrEqual(0);
  });
  it('archer otomatis menembak musuh jauh', () => {
    const { g, e } = arena('archer', { x: 300 });
    idle(g, 1.5, { auto: true });
    expect(dealt(e)).toBeGreaterThan(0);
  });
});

const SK = (cls, i) => CLASSES[cls].skills[i];

describe('energi', () => {
  it('serangan dasar yang kena mengisi energi; skill memakai energi', () => {
    const { g } = arena('warrior', { x: 40 });
    g.energy = 0;
    hold(g, 0.1);
    expect(g.energy).toBeGreaterThanOrEqual(CLASSES.warrior.attack.energy);
    g.energy = 100;
    cast(g, 1);
    expect(g.energy).toBeCloseTo(100 - SK('warrior', 0).cost, 0);
  });

  it('energi kurang: skill tidak keluar', () => {
    const { g, e } = arena('warrior', { x: 40 });
    g.energy = 10;
    cast(g, 1);
    expect(g.noEnergyT).toBeGreaterThan(0); // HUD shakes the energy bar
    idle(g, 1.2);
    expect(dealt(e)).toBe(0);
  });

  it('energi pulih pelan dengan sendirinya, maksimal 100', () => {
    const { g } = arena('warrior', { x: 900 });
    g.energy = 0;
    idle(g, 2);
    expect(g.energy).toBeCloseTo(6, 0);
    g.energy = 99.9; idle(g, 1);
    expect(g.energy).toBe(100);
  });
});

describe('tanda pose skill (untuk gambar)', () => {
  it('mencatat skill yang dipakai dan menghitung tiap pemakaian', () => {
    const { g } = arena('warrior', { x: 40 });
    g.energy = 100;
    expect(g.castPose).toBeUndefined();
    cast(g, 1);
    expect(g.castPose).toEqual({ id: SK('warrior', 0).id, n: 1, dur: SK('warrior', 0).duration || 0 });
    idle(g, SK('warrior', 0).cd + 0.1);
    cast(g, 1);
    expect(g.castPose.n).toBe(2);
  });
});

describe('cooldown skill', () => {
  it('tidak bisa dipakai lagi sebelum cooldown habis', () => {
    const { g, e } = arena('warrior', { x: 40 });
    g.energy = 100;
    cast(g, 1);
    const once = () => dealt(e);
    idle(g, 0.1);
    const after = once();
    cast(g, 1);
    idle(g, 0.1);
    expect(g.energy).toBeCloseTo(100 - SK('warrior', 0).cost + 0.5, 0);
    expect(dealt(e)).toBeGreaterThanOrEqual(after);
  });
  it('cdr mengurangi cooldown, maksimal 40%', () => {
    const a = arena('warrior', { stats: { cdr: 20 } });
    cast(a.g, 1);
    expect(a.g.skillCdMax[0]).toBeCloseTo(SK('warrior', 0).cd * 0.8);
    const b = arena('warrior', { stats: { cdr: 90 } });
    cast(b.g, 1);
    expect(b.g.skillCdMax[0]).toBeCloseTo(SK('warrior', 0).cd * 0.6);
  });
});

describe('skill warrior', () => {
  it('Putaran Pedang: tik × mult di sekeliling, menarik musuh mendekat', () => {
    const s = SK('warrior', 0);
    const { g, e } = arena('warrior', { x: 80 });
    const [behind] = dummies(g, [[-80, 0]]);
    cast(g, 1);
    idle(g, 1.2);
    expect(dealt(e)).toBeCloseTo(s.ticks * s.mult * 14);
    expect(1e6 - behind.hp).toBeCloseTo(s.ticks * s.mult * 14);
    expect(e.x).toBeLessThan(80);
  });
  it('Teriakan Baja: damage diterima dikurangi, gelombang kejut mendorong musuh', () => {
    const s = SK('warrior', 1);
    const { g, e } = arena('warrior', { x: 60, stats: { def: 0 } });
    cast(g, 2);
    expect(dealt(e)).toBeCloseTo(s.blast.mult * 14);
    idle(g, 0.3);
    expect(e.x).toBeGreaterThan(60);
    const [biter] = dummies(g, [[0, 0]]);
    biter.dmg = 10;
    const hp = g.stats.hp;
    idle(g, DT);
    expect(hp - g.stats.hp).toBeCloseTo(10 * s.dmgTaken);
    g.invuln = 0;
    idle(g, s.duration + 0.2);
    g.invuln = 0;
    Object.assign(biter, { x: g.px, y: g.py, kx: 0, ky: 0 });
    const hp2 = g.stats.hp;
    idle(g, DT);
    expect(hp2 - g.stats.hp).toBe(10);
  });
});

describe('skill archer', () => {
  it('Hujan Panah: tik × mult di titik bidik', () => {
    const s = SK('archer', 0);
    const { g, e } = arena('archer', { x: 200 });
    const [near] = dummies(g, [[0, 30]]);
    cast(g, 1, { aimAt: { x: 200, y: 0 } });
    idle(g, 2, { aimAt: { x: 200, y: 0 } });
    expect(dealt(e)).toBeCloseTo(s.ticks * s.mult * 11);
    expect(near.hp).toBe(1e6);
  });
  it('Hujan Panah: titik bidik dibatasi jaraknya', () => {
    const { g } = arena('archer', { x: 900 });
    cast(g, 1, { aimAt: { x: 1000, y: 0 } });
    const area = g.hits.find((h) => h.fx === 'rain');
    expect(Math.hypot(area.x, area.y)).toBeCloseTo(SK('archer', 0).maxDist);
  });
  it('Panah Naga: menembus semua musuh di garis (jejak terbakar menambah damage)', () => {
    const s = SK('archer', 1);
    const { g, e } = arena('archer', { x: 100 });
    const more = dummies(g, [[150, 0], [220, 0]]);
    cast(g, 2, { aimAt: { x: 500, y: 0 } });
    idle(g, 1);
    // direct hit once (not twice) plus at most a few ticks of the burning trail under it
    for (const x of [e, ...more]) {
      expect(1e6 - x.hp).toBeGreaterThanOrEqual(s.mult * 11 - 1e-6);
      expect(1e6 - x.hp).toBeLessThan(s.mult * 11 * 1.6);
    }
  });
});

describe('skill mage', () => {
  it('Nova Es: damage di sekeliling, mendorong & membekukan', () => {
    const s = SK('mage', 0);
    const { g, e } = arena('mage', { x: 60 });
    const [far] = dummies(g, [[s.r + 80, 0]]);
    e.speed = 40;
    cast(g, 1);
    // the cast itself adds Panas (cost × 0.6), and that heat already boosts its own hits (spec §31.3)
    expect(dealt(e)).toBeCloseTo(s.mult * 16 * (1 + 0.3 * (s.cost * 0.6) / 80), 1);
    expect(far.hp).toBe(1e6);
    idle(g, 0.2);
    const x = e.x;
    idle(g, s.freeze - 0.6);
    expect(e.x).toBe(x);
    idle(g, 1);
    expect(e.x).not.toBe(x);
  });
  it('Badai Petir: sambaran berurutan pada musuh berbeda, tiap musuh kena sekali', () => {
    const s = SK('mage', 1);
    const { g, e } = arena('mage', { x: 100 });
    // a 4×3 grid, 70 px apart (inside the room, and far enough that one strike never touches its neighbour)
    const rest = dummies(g, Array.from({ length: s.count }, (_, i) => [100 + ((i + 1) % 4) * 70, Math.floor((i + 1) / 4) * 70]));
    const all = [e, ...rest];
    cast(g, 2, { aimAt: { x: 100, y: 0 } });
    const strikes = g.hits.filter((h) => h.sid === 'chain');
    expect(strikes.length).toBe(s.count);
    expect(new Set(strikes.map((h) => h.target)).size).toBe(s.count);
    expect(strikes[0].target).toBe(e);
    strikes.forEach((h, i) => { expect(h.kind).toBe('area'); expect(h.skill).toBe(true); expect(h.delay).toBeGreaterThan(s.gap * i - 0.05); expect(h.delay).toBeLessThanOrEqual(s.gap * i + 1e-9); });
    idle(g, 1.5, { aimAt: { x: 100, y: 0 } });
    const hitList = all.map((x) => 1e6 - x.hp);
    // the cast adds Panas, which lifts the damage a little (spec §31.3)
    const struck = hitList.filter((d) => d > 0);
    expect(struck.length).toBe(s.count);
    expect(struck.every((d) => d >= s.mult * 16 - 1e-6 && d <= s.mult * 16 * 1.4)).toBe(true);
  });
  it('Badai Petir: sambaran jatuh satu per satu menurut waktu', () => {
    const s = SK('mage', 1);
    const { g, e } = arena('mage', { x: 100 });
    const rest = dummies(g, [[200, 0], [300, 0], [400, 0]]);
    cast(g, 2, { aimAt: { x: 100, y: 0 } });
    expect(1e6 - e.hp).toBeGreaterThan(0);
    expect(rest[2].hp).toBe(1e6);
    idle(g, s.gap * 3 + 0.05, { aimAt: { x: 100, y: 0 } });
    expect(rest[2].hp).toBeLessThan(1e6);
  });
  it('Badai Petir: musuh lebih sedikit dari count = sambaran sebanyak musuh', () => {
    const { g } = arena('mage', { x: 100 });
    dummies(g, [[200, 0]]);
    cast(g, 2, { aimAt: { x: 100, y: 0 } });
    expect(g.hits.filter((h) => h.sid === 'chain').length).toBe(2);
  });
});

describe('skill assassin', () => {
  it('Langkah Bayangan: melesat ke arah bidik, melukai yang dilewati, kebal', () => {
    const s = SK('assassin', 0);
    const { g, e } = arena('assassin', { x: 60 });
    const [second] = dummies(g, [[120, 0]]);
    cast(g, 1, { aimAt: { x: 500, y: 0 } });
    expect(g.dodgeInv).toBeGreaterThan(0);
    idle(g, 0.4, { aimAt: { x: 500, y: 0 } });
    expect(g.px).toBeCloseTo(s.distance, 0);
    expect(dealt(e)).toBeCloseTo(s.mult * 9);
    expect(1e6 - second.hp).toBeCloseTo(s.mult * 9);
  });
  it('Kipas Belati: belati menyebar', () => {
    const { g } = arena('assassin', { x: 900 });
    cast(g, 2, { aimAt: { x: 500, y: 0 } });
    expect(g.hits.filter((h) => h.fx === 'dagger').length).toBe(SK('assassin', 1).count);
  });
});


describe('pool skill (6 per kelas)', () => {
  it('tiap skill bisa dipakai di Q dan bekerja', () => {
    for (const [classId, cls] of Object.entries(CLASSES)) {
      for (const s of cls.skills) {
        const other = cls.skills.find((x) => x.id !== s.id).id;
        const g = new Game();
        g.start({ classId, stats: { ...CLASS_BASE, ...cls.stats, crit: 0 }, skills: [s.id, other] });
        g.spawnT = 1e9;
        const e = g.spawnEnemy('tank');
        Object.assign(e, { x: 80, y: 0, hp: 1e6, maxHp: 1e6, speed: 0, dmg: 0 });
        g.energy = 100;
        const atk = g.stats.atk;
        hold(g, DT, { attack: false, skill1: true, aimAt: { x: 80, y: 0 } });
        expect(g.energy, s.id).toBeLessThan(100);
        hold(g, 2, { attack: false, aimAt: { x: 80, y: 0 } });
        if (s.kind === 'buff' && (s.atk || s.crit)) {
          const g2 = new Game();
          g2.start({ classId, stats: { ...CLASS_BASE, ...cls.stats }, skills: [s.id, other] });
          g2.energy = 100;
          const c0 = g2.stats.crit;
          hold(g2, DT, { attack: false, skill1: true });
          expect(g2.stats.atk > atk || g2.stats.crit > c0, s.id).toBe(true);
          hold(g2, s.duration + 0.5, { attack: false });
          expect(g2.stats.atk, s.id).toBeCloseTo(atk);
        } else if (s.mult > 0 || s.blast) {
          expect(1e6 - e.hp, s.id).toBeGreaterThan(0);
        }
      }
    }
  });

  it('bakat Fokus Sihir menaikkan damage skill; serangan dasar tidak', () => {
    const g = new Game();
    g.start({ classId: 'mage', stats: { ...CLASS_BASE, ...CLASSES.mage.stats, crit: 0 }, effects: { skillDmg: 0.4 } });
    g.spawnT = 1e9;
    const e = g.spawnEnemy('tank'); Object.assign(e, { x: 300, hp: 1e6, maxHp: 1e6 });
    g.damageEnemy({ mult: 1, skill: true }, e);
    expect(1e6 - e.hp).toBeCloseTo(16 * 1.4);
    e.hp = 1e6;
    g.damageEnemy({ mult: 1, fx: 'fireball' }, e);
    expect(1e6 - e.hp).toBeCloseTo(16);
  });

  it('bakat Aliran Energi menambah energi dari serangan dasar; skill tidak mengisi energi', () => {
    const g = new Game();
    g.start({ classId: 'warrior', stats: { ...CLASS_BASE, ...CLASSES.warrior.stats }, effects: { energy: 0.5 } });
    g.spawnT = 1e9;
    const e = g.spawnEnemy('tank'); Object.assign(e, { x: 300, hp: 1e6, maxHp: 1e6 });
    g.energy = 0;
    g.damageEnemy({ mult: 1, fx: 'slash' }, e);
    expect(g.energy).toBeCloseTo(7 * 1.5);
    g.damageEnemy({ mult: 1, fx: 'slash', skill: true }, e);
    expect(g.energy).toBeCloseTo(7 * 1.5);
  });
});

describe('4 slot skill & ultimate', () => {
  const mk = (over = {}) => {
    const g = new Game();
    g.start({ classId: 'warrior', stats: { ...CLASS_BASE, ...CLASSES.warrior.stats, crit: 0 }, ...over });
    g.spawnT = 1e9;
    return g;
  };
  it('skill di slot 3 & 4 dipakai dengan tombolnya; slot kosong tidak berbuat apa-apa', () => {
    const g = mk({ skills: ['spin', 'shout', 'quake', 'axe'] });
    g.energy = 100;
    hold(g, DT, { attack: false, skill3: true, aimAt: { x: 80, y: 0 } });
    expect(g.energy).toBeCloseTo(100 - 45, 0);
    const h = mk({ skills: ['spin', null, null, null] });
    h.energy = 100;
    hold(h, DT, { attack: false, skill2: true, skill4: true });
    expect(h.energy).toBeCloseTo(100, 0);
  });
  it('ultimate: terisi dari kill & damage, dipakai saat penuh lalu kosong', () => {
    const g = mk({ ult: CLASSES.warrior.ult });
    expect(g.ultCharge).toBe(0);
    const e = g.spawnEnemy('slink'); e.x = 300; e.hp = 0;
    hold(g, DT, { attack: false });
    expect(g.ultCharge).toBeGreaterThan(0);
    hold(g, DT, { attack: false, ult: true });
    expect(g.hits.some((x) => x.fx === 'spin' && x.r === CLASSES.warrior.ult.r)).toBe(false); // belum penuh
    g.ultCharge = 100;
    hold(g, DT, { attack: false, ult: true });
    expect(g.ultCharge).toBe(0);
    expect(g.dmgTakenMul).toBe(CLASSES.warrior.ult.dmgTaken);
    expect(g.hits.some((x) => x.skill && x.r === CLASSES.warrior.ult.r)).toBe(true);
  });
  it('tanpa ultimate (di bawah LV 25) bar tidak terisi', () => {
    const g = mk();
    const e = g.spawnEnemy('slink'); e.x = 300; e.hp = 0;
    hold(g, DT, { attack: false });
    expect(g.ultCharge).toBe(0);
  });
});

describe('skill lebay: Warrior & Archer (§31.7)', () => {
  const mk = (classId, skills) => {
    const g = new Game();
    g.start({ classId, stats: { ...CLASS_BASE, ...CLASSES[classId].stats, crit: 0 }, skills });
    g.spawnT = 1e9;
    g.energy = 100;
    return g;
  };
  const cast = (g, slot, aim = { x: 100, y: 0 }) => hold(g, DT, { attack: false, [`skill${slot}`]: true, aimAt: aim });

  it('Retakan Bumi: 5 pilar berurutan sepanjang bidikan, dihitung saat cast', () => {
    const g = mk('warrior', ['quake', null, null, null]);
    cast(g, 1);
    const pillars = g.hits.filter((h) => h.sid === 'quake');
    expect(pillars.length).toBe(5);
    pillars.sort((a, b) => a.x - b.x);
    pillars.forEach((h, i) => {
      expect(h.kind).toBe('area');
      expect(h.x).toBeCloseTo(52 * (i + 1) + (g.px - 0), 0);
      expect(h.y).toBeCloseTo(g.py, 0);
      expect(h.r).toBe(45);
      expect(h.skill).toBe(true);
      expect(h.knock).toBe(160);
      expect(h.freeze).toBe(0.3);
      expect(h.delay).toBeGreaterThan(0.08 * i - 0.05);
      expect(h.delay).toBeLessThanOrEqual(0.08 * i + 1e-9);
    });
    // walking away afterwards does not drag the pillars along
    const x0 = pillars[4].x;
    hold(g, 0.2, { attack: false, move: { x: -1, y: 0 }, aimAt: { x: 100, y: 0 } });
    expect(pillars[4].x).toBe(x0);
  });

  it('Retakan Bumi: musuh di ujung kena belakangan daripada yang dekat', () => {
    const g = mk('warrior', ['quake', null, null, null]);
    const near = g.spawnEnemy('tank'), far = g.spawnEnemy('tank');
    Object.assign(near, { x: 52, y: 0, hp: 1e6, maxHp: 1e6, speed: 0, dmg: 0 });
    Object.assign(far, { x: 260, y: 0, hp: 1e6, maxHp: 1e6, speed: 0, dmg: 0 });
    cast(g, 1, { x: 300, y: 0 });
    hold(g, 0.1, { attack: false, aimAt: { x: 300, y: 0 } });
    expect(near.hp).toBeLessThan(1e6);
    expect(far.hp).toBe(1e6);
    hold(g, 0.4, { attack: false, aimAt: { x: 300, y: 0 } });
    expect(far.hp).toBeLessThan(1e6);
  });

  it('Kapak Bumerang: pergi-pulang, kena dua kali dan menyeret musuh', () => {
    const g = mk('warrior', ['axe', null, null, null]);
    const e = g.spawnEnemy('tank');
    Object.assign(e, { x: 150, y: 0, hp: 1e6, maxHp: 1e6, speed: 0, dmg: 0 });
    cast(g, 1, { x: 300, y: 0 });
    const axe = g.hits.find((h) => h.sid === 'axe');
    expect(axe.boomerang).toBe(true);
    expect(axe.pull).toBeGreaterThan(0);
    expect(axe.skill).toBe(true);
    hold(g, 2.5, { attack: false, aimAt: { x: 300, y: 0 } });
    expect(g.hits.some((h) => h.sid === 'axe')).toBe(false); // caught
    const per = 14 * SK('warrior', 4).mult; // atk × mult
    expect(1e6 - e.hp).toBeCloseTo(per * 2, 0);
  });

  it('Panah Naga: tertunda 0,3 dtk lalu menabur jejak area yang membawa flag skill', () => {
    const g = mk('archer', ['pierce', null, null, null]);
    cast(g, 1);
    const p = g.hits.find((h) => h.sid === 'pierce');
    expect(p.delay).toBeGreaterThan(0.25);
    const x0 = p.x;
    hold(g, 0.1, { attack: false, aimAt: { x: 100, y: 0 } });
    expect(p.x).toBe(x0);
    hold(g, 0.5, { attack: false, aimAt: { x: 100, y: 0 } });
    const trail = g.hits.filter((h) => h.part === 'trail');
    expect(trail.length).toBeGreaterThan(0);
    expect(trail.every((h) => h.skill && h.sid === 'pierce' && h.kind === 'area')).toBe(true);
  });

  it('Panah Pecah: 5 panah pecah menjadi 15 yang masih berstatus skill', () => {
    const g = mk('archer', ['volley', null, null, null]);
    cast(g, 1);
    const arrows = g.hits.filter((h) => h.sid === 'volley');
    expect(arrows.length).toBe(5);
    expect(arrows.every((h) => h.split && h.skill)).toBe(true);
    hold(g, 0.4, { attack: false, aimAt: { x: 100, y: 0 } });
    const kids = g.hits.filter((h) => h.sid === 'volley');
    expect(kids.length).toBe(15);
    expect(kids.every((h) => h.skill && !h.split)).toBe(true);
  });
});

describe('skill lebay: Mage & Assassin (§31.7)', () => {
  const mk = (classId, skills) => {
    const g = new Game();
    g.start({ classId, stats: { ...CLASS_BASE, ...CLASSES[classId].stats, crit: 0 }, skills });
    g.spawnT = 1e9;
    g.energy = 100;
    return g;
  };
  const still = (g, x, y = 0) => { const e = g.spawnEnemy('tank'); Object.assign(e, { x, y, hp: 1e6, maxHp: 1e6, speed: 0, dmg: 0 }); return e; };
  const cast = (g, aim = { x: 100, y: 0 }, extra = {}) => hold(g, DT, { attack: false, skill1: true, aimAt: aim, ...extra });

  it('Matahari Kecil: bola api lambat dengan jejak, meledak dan menebar 6 serpihan', () => {
    const g = mk('mage', ['inferno', null, null, null]);
    const near = still(g, 100), farOne = still(g, 230);
    cast(g);
    const ball = g.hits.find((h) => h.sid === 'inferno');
    expect(ball.trail).toBeTruthy();
    expect(ball.explode.shards.count).toBe(6);
    expect(ball.speed).toBeLessThan(250);
    let shards = [];
    for (let i = 0; i < 120 && !shards.length; i++) { hold(g, DT, { attack: false, aimAt: { x: 100, y: 0 } }); shards = g.hits.filter((h) => h.part === 'shard'); }
    expect(shards.length).toBe(6);
    expect(shards.every((h) => h.skill && h.sid === 'inferno')).toBe(true);
    expect(g.hits.some((h) => h.part === 'trail' && h.sid === 'inferno')).toBe(true);
    idle(g, 1, { aimAt: { x: 100, y: 0 } });
    expect(1e6 - farOne.hp).toBeGreaterThan(0); // shards carry the fire further out
    // the struck enemy takes the blast (+ Panas) and nothing from the point-blank shards
    expect(1e6 - near.hp).toBeGreaterThan(SK('mage', 4).mult * 16 - 1e-6);
    expect(1e6 - near.hp).toBeLessThan(SK('mage', 4).mult * 16 * 1.5);
  });

  it('Lingkaran Belati: 11 belati melayang melingkar, lalu melesat melengkung', () => {
    const g = mk('assassin', ['fan', null, null, null]);
    cast(g, { x: 500, y: 0 });
    const ds = g.hits.filter((h) => h.sid === 'fan');
    const s = SK('assassin', 1);
    expect(ds.length).toBe(s.count);
    for (const d of ds) {
      expect(Math.hypot(d.x - g.px, d.y - g.py)).toBeCloseTo(s.ring);
      expect(d.delay).toBeGreaterThan(s.delay - 0.05);
      expect(d.curve).toBe(s.curve);
      expect(d.hover).toBe(s.ring);
      expect(d.skill).toBe(true);
    }
    const dirs = ds.map((d) => Math.atan2(d.y - g.py, d.x - g.px)).sort((a, b) => a - b);
    for (let i = 1; i < dirs.length; i++) expect(dirs[i] - dirs[i - 1]).toBeCloseTo((2 * Math.PI) / s.count, 3);
    const d0 = ds[0], x0 = d0.x, a0 = d0.angle;
    idle(g, 0.2, { aimAt: { x: 500, y: 0 } });
    expect(d0.x).toBe(x0); // still floating
    idle(g, 0.6, { aimAt: { x: 500, y: 0 } });
    expect(Math.hypot(d0.x - g.px, d0.y - g.py)).toBeGreaterThan(s.ring + 50);
    expect(Math.abs(d0.angle - a0)).toBeGreaterThan(0.5); // curved
  });

  it('Lingkaran Belati: belati ikut pemain selama melayang, melesat dari cincin di posisi saat itu', () => {
    const g = mk('assassin', ['fan', null, null, null]);
    cast(g, { x: 500, y: 0 });
    const s = SK('assassin', 1);
    const d0 = g.hits.find((h) => h.sid === 'fan');
    hold(g, 0.2, { attack: false, move: { x: 1, y: 0 }, aimAt: { x: 500, y: 0 } });
    expect(g.px).toBeGreaterThan(5);
    expect(d0.delay).toBeGreaterThan(0);
    expect(Math.hypot(d0.x - g.px, d0.y - g.py)).toBeCloseTo(s.ring);
    hold(g, 0.1, { attack: false, move: { x: 0, y: 0 }, aimAt: { x: 500, y: 0 } });
    // launched from the ring round where the player stood at launch time
    const px = g.px;
    hold(g, s.delay, { attack: false, move: { x: 0, y: 0 }, aimAt: { x: 500, y: 0 } });
    expect(d0.delay).toBeLessThanOrEqual(0);
    expect(Math.hypot(d0.x - px, d0.y - g.py)).toBeGreaterThan(s.ring);
  });

  it('Badai Petir: tiap sambaran hanya melukai sasarannya, walau musuh bergerombol', () => {
    const s = SK('mage', 1);
    const g = mk('mage', ['chain', null, null, null]);
    const es = [[100, 0], [110, 20], [90, 20], [120, -10], [100, -25]].map(([x, y]) => still(g, x, y));
    cast(g, { x: 100, y: 0 });
    idle(g, 1.2);
    const d = es.map((e) => 1e6 - e.hp);
    expect(d.every((x) => x >= s.mult * g.stats.atk - 1e-6 && x <= s.mult * g.stats.atk * 1.4)).toBe(true); // one strike each, not five
  });

  it('Badai Petir: sasaran yang mati sebelum sambaran tidak melukai tetangga', () => {
    const g = mk('mage', ['chain', null, null, null]);
    const [a, b] = [still(g, 100, 0), still(g, 110, 10)];
    cast(g, { x: 100, y: 0 });
    b.hp = 0; // dies before its strike lands (second strike, delay 0.1)
    const before = 1e6 - a.hp;
    idle(g, 0.5);
    expect(1e6 - a.hp).toBe(before);
  });

  it('Shuriken Raksasa: berputar di sekitar pemain, kena berulang, lalu dilempar ke bidikan', () => {
    const s = SK('assassin', 4);
    const g = mk('assassin', ['shuriken', null, null, null]);
    g.trait.v = 5; // Kombo full: x2.25 and execute
    const e = still(g, 70, 0), e2 = still(g, -70, 0);
    cast(g, { x: 0, y: 400 });
    const o = g.hits.find((h) => h.kind === 'orbit');
    expect(o.sid).toBe('shuriken');
    expect(o.skill && o.execute === 0.3).toBeTruthy();
    expect(o.mult).toBeCloseTo(s.mult * 2.25);
    let n = 0;
    for (let t = 0; t < 2.9; t += DT) { hold(g, DT, { attack: false, aimAt: { x: 0, y: 400 } }); }
    n = (1e6 - e.hp) / (16 * 0 + g.stats.atk * s.mult * 2.25);
    expect(n).toBeGreaterThan(1.5);
    expect(n).toBeLessThanOrEqual(s.duration / s.every + 1e-6);
    expect(1e6 - e2.hp).toBeGreaterThan(0); // the blade came round to the other side too
    idle(g, 0.4, { aimAt: { x: 0, y: 400 } });
    const th = g.hits.find((h) => h.part === 'throw');
    expect(th).toBeTruthy();
    expect(th.skill && th.sid === 'shuriken' && th.execute === 0.3).toBeTruthy();
    expect(th.mult).toBeCloseTo(s.throw.mult * 2.25);
    expect(th.vy).toBeGreaterThan(Math.abs(th.vx));
  });
});
