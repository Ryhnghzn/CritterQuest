import { describe, it, expect } from 'vitest';
import { benchChar, benchGame, benchPack } from './benchkit.js';
import { foeLevel } from './run.js';
import { gapOf } from '../meta/power.js';
import { DUNGEON_LEVEL } from '../data/power.js';

describe('selisih Power dalam pertarungan (spec §47.3)', () => {
  it('musuh level rendah memukul lebih pelan dan lebih cepat tumbang; musuh level tinggi sebaliknya', () => {
    const c = benchChar('warrior', 30);
    const g = benchGame(c);
    const [low] = benchPack(g, 10, ['scorpion']), [high] = benchPack(g, 45, ['scorpion']);
    expect(low.gap.taken).toBeLessThan(1); expect(low.gap.dealt).toBeGreaterThan(1);
    expect(high.gap.taken).toBeGreaterThan(1); expect(high.gap.dealt).toBeLessThan(1);
    expect(low.gap).toEqual(gapOf(g.power, 10));
    // the same hit lands softer from the weaker one, after its level's own scaling
    for (const e of [low, high]) { e.hp = e.maxHp = 1e7; e.frozen = 1e9; }
    g.stats.crit = -1000;
    g.damageEnemy({ mult: 1, fx: 'nova', x: 0, y: 0 }, low); g.damageEnemy({ mult: 1, fx: 'nova', x: 0, y: 0 }, high);
    expect(1e7 - low.hp).toBeGreaterThan(1e7 - high.hp);
  });

  it('level musuh dungeon: level dungeon + lantai; Celah & Ujian mengikuti karakter', () => {
    const g = benchGame(benchChar('mage', 20), 'tomb', 3);
    expect(foeLevel(g)).toBe(DUNGEON_LEVEL.tomb + 2 * DUNGEON_LEVEL.perFloor);
    const r = benchGame(benchChar('mage', 20), 'rift', 1);
    expect(foeLevel(r)).toBe(20);
  });

  it('tanpa Power (tes lama, menu judul) tidak ada selisih', () => {
    const g = benchGame(benchChar('archer', 30));
    g.reset({ classId: 'archer', stats: g.stats });
    const e = g.spawnEnemy('slink');
    expect(e.gap).toEqual({ taken: 1, dealt: 1 });
  });
});
