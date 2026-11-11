import { describe, it, expect } from 'vitest';
import { Game } from './run.js';
import { CLASSES, CLASS_BASE } from '../data/classes.js';
import { AFFIXES } from '../data/enemies.js';
import { makeElite } from './dungeon.js';
import { rollAffixes, affixCount } from './affix.js';

const DT = 1 / 60;
function start() {
  const g = new Game();
  g.start({ classId: 'warrior', stats: { ...CLASS_BASE, ...CLASSES.warrior.stats, maxHp: 5000 } });
  g.spawnT = 1e9; g.queueI = g.queue.length; g.wave = 99; // no waves: only the enemies a test places
  return g;
}
const step = (g, n = 1) => {
  for (let i = 0; i < n; i++) {
    g.intent = { move: { x: 0, y: 0 }, aimAt: null, dodge: false, attack: false, potion: -1 };
    g.step(DT);
  }
};
const secs = (s) => Math.round(s * 60);
// an elite with exactly these traits, far enough not to touch the player
const elite = (g, type, traits, x = 300, y = 0) => {
  const e = g.spawnEnemy(type); e.x = x; e.y = y;
  makeElite(e, 0);
  rollAffixes(e, 0, traits);
  return e;
};
const hit = (g, e, mult = 1) => g.damageEnemy({ mult, fx: 'slash', x: g.px, y: g.py }, e);

describe('memilih sifat', () => {
  it('sifat berbeda satu sama lain dan cocok dengan perilaku musuh', () => {
    const g = start();
    for (let i = 0; i < 200; i++) {
      const e = g.spawnEnemy(i % 2 ? 'sandworm' : 'slink');
      rollAffixes(e, 2);
      expect(e.affixes.length).toBe(2);
      expect(new Set(e.affixes).size).toBe(2);
      for (const a of e.affixes) expect(AFFIXES[a].not?.includes(e.ai) ?? false).toBe(false);
    }
  });

  it('jumlah sifat: 1, atau 2 di level dunia tinggi / lantai dalam', () => {
    expect(affixCount({ level: 5 })).toBe(1);
    expect(affixCount({ level: 30 })).toBe(2);
    expect(affixCount({ floor: 2 })).toBe(1);
    expect(affixCount({ floor: 4 })).toBe(2);
  });

  it('makeElite memberi sifat; musuh biasa tidak punya', () => {
    const g = start();
    const plain = g.spawnEnemy('slink');
    expect(plain.affixes).toBeUndefined();
    const e = g.spawnEnemy('slink');
    makeElite(e, 1);
    expect(e.elite).toBe(true);
    expect(e.affixes.length).toBe(1);
  });
});

describe('sifat elite', () => {
  it('Cepat: jalan lebih cepat dan beraksi lebih sering', () => {
    const g = start();
    const e = elite(g, 'spitter', ['fast']);
    const base = g.spawnEnemy('spitter');
    expect(e.speed).toBeGreaterThan(base.speed * 1.3);
    e.actT = 1; base.actT = 1;
    base.x = 300; base.y = 200;
    step(g, secs(0.5));
    expect(e.actT).toBeLessThan(base.actT);
  });

  it('Berlapis: perisai menyerap dulu, lalu pulih setelah lama tidak diserang', () => {
    const g = start();
    const e = elite(g, 'tank', ['armored']);
    expect(e.armor).toBeCloseTo(e.maxHp * AFFIXES.armored.shield);
    const hp = e.hp;
    hit(g, e, 0.1);
    expect(e.hp).toBe(hp);
    expect(e.armor).toBeLessThan(e.armorMax);
    const left = e.armor;
    step(g, secs(AFFIXES.armored.idle - 1));
    expect(e.armor).toBeCloseTo(left);
    step(g, secs(AFFIXES.armored.idle + 2));
    expect(e.armor).toBeCloseTo(e.armorMax);
  });

  it('Berlapis: damage yang melebihi perisai mengenai HP', () => {
    const g = start();
    const e = elite(g, 'tank', ['armored']);
    e.armor = 1;
    const hp = e.hp;
    hit(g, e, 1);
    expect(e.armor).toBe(0);
    expect(e.hp).toBeLessThan(hp);
  });

  it('Pemanggil: memanggil kroco, paling banyak 4', () => {
    const g = start();
    elite(g, 'tank', ['caller']);
    step(g, secs(AFFIXES.caller.every * 4));
    const minis = g.enemies.filter((o) => o.type === AFFIXES.caller.type);
    expect(minis.length).toBe(AFFIXES.caller.max);
  });

  it('Berduri: kena serangan menembakkan duri, paling sering sekali per detik', () => {
    const g = start();
    const e = elite(g, 'tank', ['thorny']);
    hit(g, e, 0.01); hit(g, e, 0.01);
    expect(g.shots.length).toBe(AFFIXES.thorny.shot.count);
    step(g, secs(AFFIXES.thorny.cd + 0.1));
    hit(g, e, 0.01);
    expect(g.shots.length).toBeGreaterThan(AFFIXES.thorny.shot.count);
  });

  it('Meledak: saat mati meninggalkan lingkaran bahaya besar', () => {
    const g = start();
    const e = elite(g, 'slink', ['volatile']);
    e.hp = 0.001;
    hit(g, e, 1);
    step(g);
    expect(g.hazards.some((h) => h.kind === 'circle' && h.r === AFFIXES.volatile.radius && h.dmg > 0)).toBe(true);
  });

  it('Beraura: meninggalkan letupan kecil di belakangnya', () => {
    const g = start();
    elite(g, 'tank', ['aura']);
    step(g, secs(AFFIXES.aura.every + 0.1));
    expect(g.hazards.some((h) => h.kind === 'circle' && h.small && h.r === AFFIXES.aura.r)).toBe(true);
  });

  it('Penjelajah: tanda dulu, lalu muncul di dekat pemain', () => {
    const g = start();
    const e = elite(g, 'tank', ['blinker'], 900, 0);
    e.blinkT = 0;
    step(g);
    expect(e.hidden).toBe(true);
    expect(g.hazards.some((h) => h.kind === 'circle' && h.dmg === 0)).toBe(true);
    step(g, secs(AFFIXES.blinker.warn + 0.05));
    expect(e.hidden).toBe(false);
    expect(Math.hypot(e.x - g.px, e.y - g.py)).toBeLessThan(AFFIXES.blinker.near[1] + 40);
  });
});

describe('Berlapis vs stuns (spec §43.8)', () => {
  it('no freeze while the shield holds; frozen once it is broken', () => {
    const g = start();
    const e = elite(g, 'tank', ['armored']);
    g.damageEnemy({ mult: 0.01, fx: 'nova', freeze: 1.5, x: g.px, y: g.py }, e);
    expect(e.frozen).toBe(0);
    e.armor = 0;
    g.damageEnemy({ mult: 0.01, fx: 'nova', freeze: 1.5, x: g.px, y: g.py }, e);
    expect(e.frozen).toBeGreaterThan(1);
  });
});
