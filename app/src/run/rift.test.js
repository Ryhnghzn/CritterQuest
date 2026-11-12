import { describe, it, expect } from 'vitest';
import { Game } from './run.js';
import { CLASSES, CLASS_BASE } from '../data/classes.js';
import { RIFT, BLESSINGS, RIFT_POOL } from '../data/rift.js';
import { ENEMIES } from '../data/enemies.js';
import { makeRiftFloor, riftMul, pickBlessing, riftHaul, isBossFloor } from './rift.js';
import { createCharacter, applyTrip } from '../meta/character.js';
import { validateSlot } from '../meta/schema.js';

const DT = 1 / 60;
let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
function rift(floor = 1, extra = {}) {
  const g = new Game();
  g.start({ classId: 'mage', stats: { ...CLASS_BASE, ...CLASSES.mage.stats, maxHp: 1e6 }, dungeon: 'rift', floor, ...extra });
  return g;
}
const clear = (g) => { g.queueI = g.queue.length; g.wave = 99; for (const e of g.enemies) e.hp = 0; g.enemies.length = 0; g.intent = { move: { x: 0, y: 0 }, attack: false, potion: -1 }; g.step(DT); };

describe('lantai Celah', () => {
  it('lantai kelipatan 5 berisi satu bos; lantai biasa 3 gelombang yang makin ramai', () => {
    for (const f of [5, 10, 25]) {
      const fl = makeRiftFloor(f, rnd);
      expect(fl.waves.length).toBe(1);
      const [id] = Object.keys(fl.waves[0].mix);
      expect(ENEMIES[id].boss).toBe(true);
    }
    const count = (fl) => fl.waves.reduce((s, w) => s + Object.values(w.mix).reduce((a, b) => a + b, 0), 0);
    const a = makeRiftFloor(1, rnd), b = makeRiftFloor(21, rnd);
    expect(a.waves.length).toBe(RIFT.waves.length);
    expect(count(b)).toBeGreaterThan(count(a));
    for (const w of a.waves) for (const id of Object.keys(w.mix)) expect(RIFT_POOL).toContain(id);
    expect(count(makeRiftFloor(1, rnd, 0.4))).toBeGreaterThan(count(a));
  });

  it('musuh makin kuat tiap lantai (+8%)', () => {
    const g1 = rift(1), g9 = rift(9);
    const a = g1.spawnEnemy('slink'), b = g9.spawnEnemy('slink');
    expect(b.maxHp / a.maxHp).toBeCloseTo(riftMul(9), 1);
    expect(b.dmg / a.dmg).toBeCloseTo(riftMul(9), 1);
  });

  it('lantai biasa bersih: 3 berkah ditawarkan; lantai bos bersih: titik simpan', () => {
    const g = rift(4);
    clear(g);
    expect(g.floorClear).toBe(true);
    expect(g.rift.offer.length).toBe(RIFT.offer);
    expect(g.portals.map((p) => p.kind).sort()).toEqual(['down', 'home']);
    const g5 = rift(5);
    g5.gold = 120;
    clear(g5);
    expect(g5.rift.offer).toBe(null);
    expect(g5.rift.checkpoint).toBe(5);
    expect(g5.rift.safe.gold).toBe(g5.gold);
    expect(isBossFloor(5)).toBe(true);
  });

  it('berkah mengubah stat perjalanan', () => {
    const g = rift(1);
    const atk = g.stats.atk, hp = g.stats.maxHp;
    g.rift.offer = ['fury', 'glass', 'flow'];
    expect(pickBlessing(g, 'mend')).toBe(false);
    expect(pickBlessing(g, 'fury')).toBe(true);
    expect(g.stats.atk).toBeCloseTo(atk * 1.3);
    expect(g.stats.maxHp).toBeCloseTo(hp * 0.8);
    expect(g.rift.offer).toBe(null);
    g.rift.offer = ['glass', 'flow', 'greed'];
    const cdr = g.stats.cdr; pickBlessing(g, 'flow');
    expect(g.stats.cdr).toBeCloseTo(cdr + 0.2);
    g.rift.offer = ['glass', 'greed', 'luck'];
    const rw = g.mods.reward; pickBlessing(g, 'greed');
    expect(g.mods.reward).toBeCloseTo(rw * 2);
    expect(g.rift.more).toBeCloseTo(0.4);
    expect(BLESSINGS.length).toBeGreaterThanOrEqual(10);
  });

  it('tumbang: hadiah hanya sampai titik simpan', () => {
    const g = rift(5);
    g.gold = 100; g.loot.push({ id: 'a' });
    clear(g);
    expect(g.rift.checkpoint).toBe(5);
    const safe = g.gold; // + the floor's coin bonus
    g.gold = 400; g.loot.push({ id: 'b' });
    const fell = riftHaul(g, true), home = riftHaul(g, false);
    expect(fell.gold).toBe(safe); expect(fell.loot.length).toBe(1);
    expect(home.gold).toBe(400); expect(home.loot.length).toBe(2);
    expect(fell.checkpoint).toBe(5); expect(fell.best).toBe(5);
  });

  it('applyTrip: rekor & titik simpan Celah, bukan catatan dungeon', () => {
    const c = createCharacter({ slot: 0, name: 'Bot', look: { hair: 0, hairColor: 0 }, classId: 'mage' }, 1);
    c.unlocked.rift = true;
    const trip = { exp: 0, gold: 50, kills: 0, bossKills: 0, killsBy: {}, elites: 0, floorsCleared: 7, dungeon: 'rift', floor: 7, cleared: false, died: true, hp: 1, potions: c.potions, items: [], mats: {}, gems: [], rift: { best: 7, checkpoint: 5 } };
    const r = applyTrip(c, trip, 2, () => 0.99);
    expect(r.char.rift).toEqual({ best: 7, checkpoint: 5 });
    expect(r.char.gold).toBe(50); // already cut to the checkpoint: nothing more lost
    expect(r.char.found).not.toContain('rift');
    expect(validateSlot(r.char)).toEqual([]);
  });
});
