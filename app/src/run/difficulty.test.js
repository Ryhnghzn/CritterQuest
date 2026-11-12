import { describe, it, expect } from 'vitest';
import { Game, foePower } from './run.js';
import { CLASSES, CLASS_BASE } from '../data/classes.js';
import { DIFFICULTY } from '../data/difficulty.js';
import { rollRarity } from '../meta/itemgen.js';
import { setDifficulty, levelOpen } from '../meta/difficulty.js';
import { createCharacter, applyTrip } from '../meta/character.js';

const game = (difficulty) => { const g = new Game(); g.start({ classId: 'warrior', stats: { ...CLASS_BASE, ...CLASSES.warrior.stats }, difficulty }); return g; };

describe('tingkat kesulitan dalam perjalanan', () => {
  it('HP, damage, EXP, peluru, dan tempo musuh ikut tingkat', () => {
    const n = game('normal'), h = game('hell');
    const a = n.spawnEnemy('slink'), b = h.spawnEnemy('slink');
    expect(b.maxHp / a.maxHp).toBeCloseTo(DIFFICULTY.hell.hp);
    expect(b.dmg / a.dmg).toBeCloseTo(DIFFICULTY.hell.dmg);
    expect(b.xp).toBeGreaterThan(a.xp);
    expect(b.tempo).toBeCloseTo(DIFFICULTY.hell.tempo);
    expect(foePower(h, b) / foePower(n, a)).toBeCloseTo(DIFFICULTY.hell.dmg);
    n.addGold(100); h.addGold(100);
    expect(h.gold / n.gold).toBeCloseTo(DIFFICULTY.hell.reward, 1);
  });

  it('rarity: Neraka lebih sering naik satu tingkat', () => {
    let s = 3; const rng = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const avg = (diff) => { let t = 0; for (let i = 0; i < 4000; i++) t += rollRarity('elite', 0, rng, diff); return t / 4000; };
    expect(avg(DIFFICULTY.hell)).toBeGreaterThan(avg(null) + 0.2);
  });
});

describe('memilih tingkat', () => {
  const make = () => createCharacter({ slot: 0, name: 'Bot', look: { hair: 0, hairColor: 0 }, classId: 'mage' }, 1);
  it('Sulit terbuka sejak awal; Neraka setelah tamat di Sulit', () => {
    let c = make();
    expect(setDifficulty(c, 'hell', 1).reason).toBe('locked');
    c = setDifficulty(c, 'hard', 1).char;
    expect(c.difficulty).toBe('hard');
    expect(setDifficulty(c, 'hard', 1).reason).toBe('same');
    const trip = { exp: 0, gold: 0, kills: 0, bossKills: 1, killsBy: {}, elites: 0, floorsCleared: 5, dungeon: 'spire', floor: 5, cleared: true, died: false, hp: 1, potions: c.potions, items: [], mats: {}, gems: [] };
    c = applyTrip(c, trip, 2).char;
    expect(c.unlocked).toEqual({ hell: true, rift: true });
    expect(levelOpen(c, 'hell')).toBe(true);
  });
  it('tamat di Normal hanya membuka Celah', () => {
    const c = make();
    const trip = { exp: 0, gold: 0, kills: 0, bossKills: 1, killsBy: {}, elites: 0, floorsCleared: 5, dungeon: 'spire', floor: 5, cleared: true, died: false, hp: 1, potions: c.potions, items: [], mats: {}, gems: [] };
    expect(applyTrip(c, trip, 2).char.unlocked).toEqual({ hell: false, rift: true });
  });
  it('koin yang hilang saat tumbang ikut tingkat', () => {
    const c = { ...make(), difficulty: 'hell' };
    const trip = { exp: 0, gold: 1000, kills: 0, bossKills: 0, killsBy: {}, elites: 0, floorsCleared: 0, dungeon: 'shadow', floor: 1, cleared: false, died: true, hp: 1, potions: c.potions, items: [], mats: {}, gems: [] };
    expect(applyTrip(c, trip, 2).char.gold).toBe(Math.floor(1000 * DIFFICULTY.hell.goldKeep));
  });
});
