// The impact ladder (plan "Rasa Pukulan" A): shake tiers, rate-limited hit-stops, recoil,
// damage-number kinds, deaths and boss phases. Presentation only: damage stays the same.
import { describe, it, expect } from 'vitest';
import { Game } from './run.js';
import { recoilOf } from './vfx.js';
import { CLASSES, CLASS_BASE } from '../data/classes.js';
import { SHAKE, HITSTOP, HITSTOP_GAP, RECOIL, FLOATER_MAX } from '../data/fx.js';

const DT = 1 / 60;
function start() {
  const g = new Game();
  g.start({ classId: 'warrior', stats: { ...CLASS_BASE, ...CLASSES.warrior.stats, maxHp: 100000 } });
  g.spawnT = 1e9; g.queueI = g.queue.length; g.wave = 99;
  g.stats.crit = 0;
  return g;
}
const step = (g) => { g.intent = { move: { x: 0, y: 0 }, aimAt: null, dodge: false, attack: false, potion: -1 }; g.step(DT); };

describe('guncangan layar', () => {
  it("tingkat 'big' ada dan tidak membuat guncangan NaN", () => {
    const g = start();
    g.addShake('big');
    expect(g.shake).toBe(SHAKE.big);
    g.addShake('medium');
    expect(g.shake).toBe(SHAKE.big);
  });
  it('tingkat yang tidak dikenal diabaikan, guncangan tetap bekerja sesudahnya', () => {
    const g = start();
    g.addShake('tidak-ada');
    expect(Number.isFinite(g.shake)).toBe(true);
    g.addShake('heavy');
    expect(g.shake).toBe(SHAKE.heavy);
  });
});

describe('hit-stop bertingkat', () => {
  it('kritikal beruntun hanya menjeda sekali per jarak minimum', () => {
    const g = start();
    g.addHitStop('crit'); expect(g.hitStop).toBe(HITSTOP.crit);
    g.hitStop = 0;
    g.addHitStop('crit'); expect(g.hitStop).toBe(0); // same moment: skipped
    g.time += HITSTOP_GAP.crit + 0.01;
    g.addHitStop('crit'); expect(g.hitStop).toBe(HITSTOP.crit);
  });
  it('jeda besar tidak dibatasi dan menang dari yang kecil', () => {
    const g = start();
    g.addHitStop('crit'); g.addHitStop('bossKill');
    expect(g.hitStop).toBe(HITSTOP.bossKill);
    expect(HITSTOP.bossKill).toBeLessThanOrEqual(HITSTOP.max);
  });
  it('hit skill menjeda sekali pada musuh pertama, pukulan biasa tidak', () => {
    const g = start(), a = g.spawnEnemy('tank'), b = g.spawnEnemy('tank');
    a.x = b.x = 300;
    g.damageEnemy({ mult: 0.01, fx: 'slash' }, a);
    expect(g.hitStop).toBe(0);
    const h = { mult: 0.01, fx: 'spin', skill: true };
    g.damageEnemy(h, a); expect(g.hitStop).toBe(HITSTOP.skill);
    g.hitStop = 0; g.time += 1;
    g.damageEnemy(h, b); expect(g.hitStop).toBe(0); // the same hit reaching a second enemy
  });
});

describe('musuh tersentak (hanya gambar)', () => {
  it('menjauh dari pukulan lalu kembali, posisi asli tidak berubah', () => {
    const g = start(), e = g.spawnEnemy('tank');
    e.x = 300; e.y = 0; e.speed = 0;
    g.damageEnemy({ kind: 'area', x: 0, y: 0, mult: 0.01, fx: 'slash' }, e);
    expect(e.x).toBe(300);
    const r = recoilOf(e);
    expect(r.x).toBeCloseTo(RECOIL.normal); expect(r.y).toBeCloseTo(0);
    for (let i = 0; i < 20; i++) step(g);
    expect(recoilOf(e).x).toBe(0);
  });
  it('kritikal mendorong lebih jauh, bos lebih sedikit', () => {
    const g = start(), e = g.spawnEnemy('tank'), b = g.spawnEnemy('boss');
    e.x = 300; b.x = 300; b.y = 200;
    g.damageEnemy({ kind: 'area', x: 0, y: 0, mult: 0.01, fx: 'slash', crit: true }, e);
    expect(e.recoil).toBe(RECOIL.crit);
    g.damageEnemy({ kind: 'area', x: 0, y: 0, mult: 0.01, fx: 'slash', crit: true }, b);
    expect(b.recoil).toBeCloseTo(RECOIL.crit * RECOIL.boss);
  });
  it('damage tidak berubah karena tampilan baru', () => {
    const g = start(), e = g.spawnEnemy('tank');
    e.x = 300; const hp = e.hp;
    g.damageEnemy({ mult: 1, fx: 'slash' }, e);
    expect(hp - e.hp).toBeCloseTo(g.stats.atk * (e.gap?.dealt || 1), 5);
  });
});

describe('angka damage', () => {
  it('hit skill memakai gaya skill, kritikal dan ult tetap', () => {
    const g = start(), e = g.spawnEnemy('tank'); e.x = 300;
    g.damageEnemy({ mult: 0.01, fx: 'spin', skill: true }, e);
    g.damageEnemy({ mult: 0.01, fx: 'spin', skill: true, crit: true }, e);
    g.damageEnemy({ mult: 0.01, fx: 'spin', skill: true, ult: true }, e);
    expect(g.floaters.slice(-3).map((f) => f.kind)).toEqual(['skill', 'crit', 'ult']);
  });
  it('angka biasa berhenti di batas, kritikal tetap muncul', () => {
    const g = start();
    for (let i = 0; i < FLOATER_MAX + 20; i++) g.addFloater(0, 0, '1', '#fff', 'normal', true);
    expect(g.floaters.length).toBe(FLOATER_MAX);
    g.addFloater(0, 0, '9', '#fff', 'crit', true);
    expect(g.floaters.length).toBe(FLOATER_MAX + 1);
  });
});

describe('kematian & bos', () => {
  it('elite mati menjeda sebentar, musuh biasa tidak', () => {
    const g = start(), n = g.spawnEnemy('tank'), el = g.spawnEnemy('tank');
    n.x = el.x = 300; el.elite = true;
    n.hp = 0; step(g); expect(g.hitStop).toBe(0);
    el.hp = 0; step(g); expect(g.hitStop).toBe(HITSTOP.elite);
  });
  it('bos ganti fase: jeda panjang & guncangan besar', () => {
    const g = start(), b = g.spawnEnemy('lavaboss');
    b.x = 200; b.speed = 0;
    b.hp = b.maxHp * 0.45; step(g);
    expect(b.phase).toBe(1);
    expect(g.hitStop).toBe(HITSTOP.phase);
    expect(g.shake).toBeGreaterThan(SHAKE.heavy * 0.9);
  });
});
