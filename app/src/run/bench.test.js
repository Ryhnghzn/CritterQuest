// Bench (spec §43.8): an average build per job at levels 10/20/30/40, Normal difficulty, fixed RNG, never
// dodging. Fails when the numbers make the game too easy (or far too hard):
//   a level-matched pack dies in 4–8 s with skills; a pack with an elite costs 40–60% HP without dodging;
//   a level-matched boss lasts 60–90 s (its time only: the bot cannot dodge, so it fights invulnerable).
// Averages over the four jobs and levels must sit in those bands; each level must stay in a looser band.
import { describe, it, expect } from 'vitest';
import { benchChar, benchGame, benchPack, benchFight } from './benchkit.js';
import { makeItem } from '../meta/itemgen.js';
import { powerOf, recPower } from '../meta/power.js';

const PACK = { 10: ['slink', 'wolf', 'spitter', 'slink', 'charger', 'dart', 'slink'], 20: ['frostslink', 'yeti', 'frostspitter', 'icewisp', 'frostslink', 'frosttank', 'frostslink'], 30: ['scorpion', 'sandslink', 'vulture', 'sandworm', 'scorpion', 'sandslink', 'spitter'], 40: ['imp', 'salamander', 'magmaslink', 'emberbomber', 'imp', 'tank', 'magmaslink'] };
const BOSS = { 10: ['shadow', 'boss'], 20: ['fungus', 'sporeboss'], 30: ['tomb', 'tombboss'], 40: ['lava', 'lavaboss'] };
const LEVELS = [10, 20, 30, 40], JOBS = ['warrior', 'archer', 'mage', 'assassin'];

describe('bench (spec §43.8)', () => {
  it('packs, elites and bosses take the time and the HP they should', () => {
    const per = {};
    for (const L of LEVELS) for (const job of JOBS) {
      const c = benchChar(job, L);
      let g = benchGame(c); const pack = benchFight(g, benchPack(g, L, PACK[L]));
      g = benchGame(c); const elite = benchFight(g, benchPack(g, L, PACK[L].slice(0, 4), true));
      g = benchGame(c, BOSS[L][0], 5); g.god = true;
      const b = g.spawnEnemy(BOSS[L][1]); b.x = g.px + 200;
      const boss = benchFight(g, [b], 200);
      (per[L] ||= []).push({ pack: pack.time, elite: elite.hpLost, boss: boss.time });
    }
    const mean = (rows, k) => rows.reduce((a, r) => a + r[k], 0) / rows.length;
    const all = Object.values(per).flat();
    const report = LEVELS.map((L) => `L${L}: pack ${mean(per[L], 'pack').toFixed(1)}s, elite ${(mean(per[L], 'elite') * 100).toFixed(0)}%, boss ${mean(per[L], 'boss').toFixed(0)}s`).join(' · ');
    expect(mean(all, 'pack'), report).toBeGreaterThanOrEqual(4); expect(mean(all, 'pack'), report).toBeLessThanOrEqual(8);
    expect(mean(all, 'elite'), report).toBeGreaterThanOrEqual(0.4); expect(mean(all, 'elite'), report).toBeLessThanOrEqual(0.6);
    expect(mean(all, 'boss'), report).toBeGreaterThanOrEqual(60); expect(mean(all, 'boss'), report).toBeLessThanOrEqual(90);
    for (const L of LEVELS) {
      expect(mean(per[L], 'pack'), report).toBeGreaterThanOrEqual(3); expect(mean(per[L], 'pack'), report).toBeLessThanOrEqual(9);
      expect(mean(per[L], 'elite'), report).toBeGreaterThanOrEqual(0.25); expect(mean(per[L], 'elite'), report).toBeLessThanOrEqual(0.85);
      expect(mean(per[L], 'boss'), report).toBeGreaterThanOrEqual(55); expect(mean(per[L], 'boss'), report).toBeLessThanOrEqual(120);
    }
  }, 300000);

  // spec §47: the Power gap. Far stronger than a place → it barely hurts; far weaker → it is a wall.
  it('level 50 bergear Mitos di wilayah level 35: kehilangan HP < 10% (tanpa menghindar)', () => {
    let seed = 3; const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const lost = [];
    for (const job of JOBS) {
      const c = benchChar(job, 50);
      c.inventory = [];
      for (const slot of ['weapon', 'helm', 'armor', 'boots', 'amulet', 'ring']) { const it = makeItem({ slot, classId: job, rarity: 5, itemLevel: 50 }, rng); c.inventory.push(it); c.equipped[slot] = it.id; }
      let g = benchGame(c); lost.push(benchFight(g, benchPack(g, 35, PACK[30])).hpLost);
      g = benchGame(c); lost.push(benchFight(g, benchPack(g, 35, PACK[30].slice(0, 4), true)).hpLost);
    }
    const mean = lost.reduce((a, b) => a + b, 0) / lost.length;
    expect(mean, lost.map((x) => (x * 100).toFixed(0)).join(' ')).toBeLessThan(0.1);
  }, 120000);

  it('Power setengah dari saran: kelompok + elite terasa berat (HP hilang > 70% atau mati)', () => {
    const lost = [];
    for (const job of JOBS) {
      const c = benchChar(job, 20); // fighting level 30–31 foes: about half the recommended Power
      expect(powerOf(c) / recPower(31)).toBeLessThan(0.65);
      const g = benchGame(c); const r = benchFight(g, benchPack(g, 31, PACK[30].slice(0, 4), true));
      lost.push(r.died ? 1 : r.hpLost);
    }
    expect(lost.reduce((a, b) => a + b, 0) / lost.length, lost.join(' ')).toBeGreaterThan(0.7);
  }, 120000);
});
