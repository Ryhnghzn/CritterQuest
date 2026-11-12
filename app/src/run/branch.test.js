import { describe, it, expect } from 'vitest';
import { defenseCut } from '../meta/power.js';
import { BRANCHES, BRANCH, skillPool } from '../data/branches.js';
import { CLASSES, JOB_IDS } from '../data/classes.js';
import { pickBranch, changeBranch, branchChangePrice, treeRows, raise, equip, setUlt, passiveFx, wornIds, jobOf, equippedUlt, canTrial, spFree } from '../meta/jobs.js';
import { validateSlot } from '../meta/schema.js';
import { finalStats } from '../meta/character.js';
import { benchChar, benchGame, benchFight } from './benchkit.js';
import { ENEMIES } from '../data/enemies.js';
import { trialAt } from '../data/dungeons.js';
import { timeSlow } from './branch.js';

const ok = (r) => { expect(r.ok, r.reason).toBe(true); return r.char; };
const DT = 1 / 60;
const idle = (g, extra = {}) => { g.intent = { move: { x: 0, y: 0 }, aimAt: null, dodge: false, attack: false, potion: -1, held: [false, false, false, false], ...extra }; };
const step = (g, n = 1, extra = {}) => { for (let i = 0; i < n; i++) { idle(g, extra); g.step(DT); } };

// a level-32 character of `job` in branch `id`, both branch skills learned and worn on A3 / A4
function branched(job, id, level = 36) {
  let c = ok(pickBranch(benchChar(job, level), id, 1));
  const b = BRANCHES[job].find((x) => x.id === id);
  for (const s of b.skills) { c = ok(raise(c, s.id, 1)); }
  c = ok(equip(c, 0, 2, b.skills[0].id, 1)); c = ok(equip(c, 0, 3, b.skills[1].id, 1));
  return { c, b };
}
const quiet = (g) => { g.spawnT = 1e9; g.queueI = g.queue.length; g.wave = 99; };

describe('data cabang', () => {
  it('tiap job punya 2 cabang: 2 skill, 1 ultimate, 2 pasif, efek khas', () => {
    for (const job of JOB_IDS) {
      expect(BRANCHES[job].length).toBe(2);
      for (const b of BRANCHES[job]) {
        expect(b.skills.length).toBe(2); expect(b.passives.length).toBe(2);
        expect(b.ult.unlock).toBe(BRANCH.level); expect(Object.keys(b.fx).length).toBeGreaterThan(0);
        const ids = [...b.skills, b.ult, ...b.passives].map((d) => d.id);
        const base = [...CLASSES[job].skills, ...CLASSES[job].ults].map((d) => d.id);
        for (const id of ids) expect(base).not.toContain(id);
      }
    }
  });
});

describe('memilih & mengganti cabang (spec §43.10)', () => {
  it('terkunci sebelum level 30 dan untuk Pengembara; pertama gratis', () => {
    expect(pickBranch(benchChar('warrior', 29), 'berserker', 1).reason).toBe('locked');
    const c = benchChar('warrior', 30);
    expect(canTrial(c)).toBe(true);
    const g0 = c.gold, c2 = ok(pickBranch(c, 'berserker', 1));
    expect(c2.gold).toBe(g0);
    expect(jobOf(c2).branch).toBe('berserker');
    expect(canTrial(c2)).toBe(false);
    expect(pickBranch(c2, 'paladin', 1).reason).toBe('same');
    expect(pickBranch(c, 'sniper', 1).reason).toBe('bad'); // another job's branch
  });

  it('pohon skill memuat skill, ultimate, dan pasif cabang', () => {
    const { c, b } = branched('mage', 'chrono');
    const rows = treeRows(c);
    expect(rows.skill.filter((r) => r.branch).map((r) => r.id)).toEqual(b.skills.map((s) => s.id));
    expect(rows.ult.map((r) => r.id)).toContain(b.ult.id);
    expect(rows.passive.filter((r) => r.branch).length).toBe(2);
    expect(wornIds(c, 0).slice(2)).toEqual(b.skills.map((s) => s.id));
    let c2 = ok(raise(c, b.ult.id, 1)); c2 = ok(setUlt(c2, b.ult.id, 1));
    expect(equippedUlt(c2).id).toBe(b.ult.id);
    expect(validateSlot(c2)).toEqual([]);
  });

  it('ganti cabang: berbayar, SP cabang lama kembali, skill-nya lepas', () => {
    let { c, b } = branched('assassin', 'shade');
    c = ok(raise(c, b.ult.id, 1)); c = ok(setUlt(c, b.ult.id, 1));
    const free = spFree(c);
    expect(changeBranch({ ...c, gold: 0 }, 'bladedancer', 1).reason).toBe('gold');
    const price = branchChangePrice(c);
    const rich = { ...c, gold: price + 5 };
    const c2 = ok(changeBranch(rich, 'bladedancer', 1));
    expect(c2.gold).toBe(5);
    expect(jobOf(c2).branch).toBe('bladedancer');
    expect(wornIds(c2, 0).filter((id) => b.skills.some((s) => s.id === id))).toEqual([]);
    expect(jobOf(c2).ult).toBe(null);
    expect(spFree(c2)).toBeGreaterThan(free);
    expect(validateSlot(c2)).toEqual([]);
  });

  it('pasif & efek cabang masuk ke efek perjalanan dan stat', () => {
    let { c } = branched('warrior', 'paladin');
    expect(passiveFx(c).holyShield).toBe(0.01);
    const def0 = finalStats(c).def;
    c = ok(raise(c, 'bulwark', 1));
    expect(finalStats(c).def).toBeCloseTo(def0 + 2);
    c = ok(raise(c, 'faith', 1));
    expect(passiveFx(c).regen).toBeCloseTo(0.013);
  });
});

describe('cabang dalam pertarungan', () => {
  it('semua skill & ultimate cabang bisa dipakai tanpa galat', () => {
    for (const job of JOB_IDS) for (const b of BRANCHES[job]) {
      const { c } = branched(job, b.id);
      const g = benchGame(c); quiet(g);
      const e = g.spawnEnemy('tank'); e.x = g.px + 120; e.y = g.py; e.hp = e.maxHp = 1e7;
      g.energy = 100;
      step(g, 1, { aimAt: { x: e.x, y: e.y }, skill3: true });
      g.energy = 100; step(g, 30, { aimAt: { x: e.x, y: e.y } });
      step(g, 1, { aimAt: { x: e.x, y: e.y }, skill4: true });
      g.ult = b.ult; g.ultCharge = 999;
      step(g, 1, { aimAt: { x: e.x, y: e.y }, ult: true });
      step(g, 180, { aimAt: { x: e.x, y: e.y } });
      expect(e.hp, `${b.id}`).toBeLessThan(1e7);
    }
  });

  it('Berserker: Murka tidak turun; damage naik saat HP rendah; tanpa pengurangan damage', () => {
    const { c } = branched('warrior', 'berserker');
    const g = benchGame(c); quiet(g);
    g.trait.v = 60; step(g, 60 * 8);
    expect(g.trait.v).toBe(60);
    const e = g.spawnEnemy('tank'); e.x = g.px + 300; e.hp = e.maxHp = 1e7;
    g.stats.crit = -1000;
    g.damageEnemy({ mult: 1, fx: 'nova', x: 0, y: 0 }, e); const full = 1e7 - e.hp;
    e.hp = 1e7; g.stats.hp = g.stats.maxHp * BRANCH.lowHpAt;
    g.damageEnemy({ mult: 1, fx: 'nova', x: 0, y: 0 }, e); const low = 1e7 - e.hp;
    expect(low / full).toBeCloseTo(1 + 0.4, 1);
    g.trait.v = 100;
    const hp = g.stats.hp = g.stats.maxHp; g.invuln = 0; g.dodgeInv = 0;
    g.hurtPlayer(100);
    expect(hp - g.stats.hp).toBeCloseTo(100 * (1 - defenseCut(g.stats.def, g.level)) * (1 - (g.fx.rageArmor || 0))); // only Kulit Baja is left
  });

  it('Paladin: tebasan biasa menambah perisai suci sampai batas', () => {
    const { c } = branched('warrior', 'paladin');
    const g = benchGame(c); quiet(g);
    const e = g.spawnEnemy('tank'); e.x = g.px + 30; e.y = g.py; e.hp = e.maxHp = 1e7; e.frozen = 1e9; e.entering = false;
    step(g, 60 * 12, { attack: true, auto: true, aimAt: { x: e.x, y: e.y } });
    expect(g.shield).toBeCloseTo(g.stats.maxHp * BRANCH.holyCap);
  });

  it('Penyihir Waktu: musuh dekat lebih lambat; peluru bisa dipantulkan', () => {
    const { c } = branched('mage', 'chrono');
    const g = benchGame(c); quiet(g);
    const near = g.spawnEnemy('tank'); near.x = g.px + 140; near.y = g.py;
    const far = g.spawnEnemy('tank'); far.x = g.px + 400; far.y = g.py;
    expect(timeSlow(g, near)).toBeCloseTo(0.7);
    expect(timeSlow(g, far)).toBe(1);
    near.entering = false;
    const n0 = near.x; step(g, 10); const slowed = n0 - near.x;
    g.fx.timeSlow = 0; const n1 = near.x; step(g, 10);
    expect(slowed).toBeLessThan((n1 - near.x) * 0.85);
    g.fx.timeReflect = 1;
    const shot = { x: g.px + 5, y: g.py, vx: -100, vy: 0, life: 1, r: 6 };
    const hp = g.stats.hp; g.invuln = 0; g.dodgeInv = 0;
    expect(g.hurtPlayer(50, null, 'spitter', shot)).toBe(false);
    expect(g.stats.hp).toBe(hp); expect(shot.life).toBe(0);
  });

  it('Putar Balik: kembali ke tempat 3 detik lalu', () => {
    const { c } = branched('mage', 'chrono');
    const g = benchGame(c); quiet(g);
    step(g, 10);
    const x0 = g.px;
    step(g, 60 * 3, { move: { x: 1, y: 0 } });
    expect(g.px).toBeGreaterThan(x0 + 100);
    g.energy = 100; step(g, 1, { skill3: true });
    expect(Math.abs(g.px - x0)).toBeLessThan(40);
  });

  it('Penyihir Api: Panas penuh meledak & kepanasan lebih singkat', () => {
    const { c } = branched('mage', 'pyro');
    const g = benchGame(c); quiet(g);
    const n = g.hits.length;
    g.trait.v = 99; g.energy = 100;
    step(g, 1, { skill1: true });
    expect(g.trait.lock).toBeCloseTo(CLASSES.mage.trait.overheat.duration * 0.5, 1);
    expect(g.hits.slice(n).some((h) => h.fx === 'boom' && h.r >= BRANCH.heatBlast.r)).toBe(true);
  });

  it('Bayangan: pukulan pertama setelah menghindar pasti kritikal ×1,5', () => {
    const { c } = branched('assassin', 'shade');
    const g = benchGame(c); quiet(g);
    const e = g.spawnEnemy('tank'); e.x = g.px + 300; e.hp = e.maxHp = 1e7;
    g.stats.crit = -1000;
    g.damageEnemy({ mult: 1, fx: 'nova', x: 0, y: 0 }, e); const plain = 1e7 - e.hp;
    step(g, 1, { dodge: true });
    e.hp = 1e7; g.damageEnemy({ mult: 1, fx: 'nova', x: 0, y: 0 }, e);
    expect((1e7 - e.hp) / plain).toBeCloseTo(g.stats.critDmg * BRANCH.ambushMul, 1);
    e.hp = 1e7; g.damageEnemy({ mult: 1, fx: 'nova', x: 0, y: 0 }, e);
    expect(1e7 - e.hp).toBeCloseTo(plain, 0);
  });

  it('Penari Pedang: Kombo sampai 10 dan mempercepat serangan', () => {
    const { c } = branched('assassin', 'bladedancer');
    const g = benchGame(c); quiet(g);
    const e = g.spawnEnemy('tank'); e.x = g.px + 25; e.y = g.py; e.hp = e.maxHp = 1e7;
    e.frozen = 1e9; e.entering = false;
    step(g, 60 * 10, { attack: true, auto: true, aimAt: { x: e.x, y: e.y } });
    expect(g.trait.v).toBe(10);
  });

  it('Penembak Jitu: tembakan Bidik makin sakit makin jauh', () => {
    const { c } = branched('archer', 'sniper');
    const g = benchGame(c); quiet(g);
    const e = g.spawnEnemy('tank'); e.hp = e.maxHp = 1e7; g.stats.crit = -1000;
    e.x = g.px + 40; g.damageEnemy({ mult: 1, fx: 'nova', snipe: true, x: 0, y: 0 }, e); const close = 1e7 - e.hp;
    e.hp = 1e7; e.x = g.px + 400; g.damageEnemy({ mult: 1, fx: 'nova', snipe: true, x: 0, y: 0 }, e);
    expect((1e7 - e.hp) / close).toBeGreaterThan(1.8);
  });
});

describe('ujian Bayangan Diri (patokan bot)', () => {
  it('bos ujian ada, dan pertarungannya lama & berbahaya bagi yang tidak menghindar', () => {
    expect(ENEMIES.shadowself.boss).toBe(true);
    trialAt(BRANCH.level);
    const times = [], lost = [];
    for (const job of JOB_IDS) {
      const c = benchChar(job, BRANCH.level);
      let g = benchGame(c, 'trial', 5); g.god = true;
      const b = g.spawnEnemy('shadowself'); b.x = g.px + 200;
      times.push(benchFight(g, [b], 300).time);
      g = benchGame(c, 'trial', 5);
      const b2 = g.spawnEnemy('shadowself'); b2.x = g.px + 200;
      lost.push(benchFight(g, [b2], 30).hpLost);
    }
    const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length, report = `kill ${times.map(Math.round)} · lost ${lost.map((v) => Math.round(v * 100))}%`;
    expect(mean(times), report).toBeGreaterThanOrEqual(50); expect(mean(times), report).toBeLessThanOrEqual(140);
    expect(mean(lost), report).toBeGreaterThanOrEqual(0.4);
    expect(trialAt(BRANCH.level + 10).hpMul).toBeGreaterThan(BRANCH.trial.hpMul);
    trialAt(BRANCH.level);
  });
});
