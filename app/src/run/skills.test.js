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
  it('Tembakan Tembus: menembus semua musuh di garis', () => {
    const s = SK('archer', 1);
    const { g, e } = arena('archer', { x: 100 });
    const more = dummies(g, [[150, 0], [220, 0]]);
    cast(g, 2, { aimAt: { x: 500, y: 0 } });
    idle(g, 1);
    for (const x of [e, ...more]) expect(1e6 - x.hp).toBeCloseTo(s.mult * 11);
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
    expect(dealt(e)).toBeCloseTo(s.mult * 16 * (1 + 0.3 * (s.cost * 0.6) / 80), 0);
    expect(far.hp).toBe(1e6);
    idle(g, 0.2);
    const x = e.x;
    idle(g, s.freeze - 0.6);
    expect(e.x).toBe(x);
    idle(g, 1);
    expect(e.x).not.toBe(x);
  });
  it('Petir Berantai: melompat ke beberapa musuh', () => {
    const s = SK('mage', 1);
    const { g, e } = arena('mage', { x: 100 });
    const rest = dummies(g, Array.from({ length: s.count }, (_, i) => [100 + (i + 1) * 100, 0]));
    cast(g, 2, { aimAt: { x: 100, y: 0 } });
    const hitList = [e, ...rest].map((x) => 1e6 - x.hp);
    expect(hitList.slice(0, s.count).every((d) => Math.abs(d - s.mult * 16) < 1e-6)).toBe(true);
    expect(hitList[s.count]).toBe(0);
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
