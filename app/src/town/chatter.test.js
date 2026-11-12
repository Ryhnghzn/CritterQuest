import { describe, it, expect } from 'vitest';
import { chatter } from './chatter.js';

const talker = (id, x, y, lines = ['Halo?', 'Hari yang cerah!']) => ({ id, role: 'talk', name: id, x, y, lines });

describe('chatter (spec §45.4)', () => {
  it('only talkers near the player, nearest first, at most max', () => {
    const npcs = [talker('a', 100, 0), talker('b', 50, 0), talker('c', 900, 0), talker('d', 200, 0), { id: 'shop', role: 'potion', x: 10, y: 0 }];
    const r = chatter(npcs, { x: 0, y: 0 }, 0.5, {}, { max: 2, quiet: 0 });
    expect(r.map((c) => c.npc.id)).toEqual(['b', 'a']);
  });
  it('leaves out an NPC with a quest mark', () => {
    const r = chatter([talker('a', 10, 0), talker('b', 20, 0)], { x: 0, y: 0 }, 0.5, { a: '!' }, { quiet: 0 });
    expect(r.map((c) => c.npc.id)).toEqual(['b']);
  });
  it('types the line out and moves to the next one', () => {
    const n = talker('a', 0, 0, ['satu dua tiga', 'empat lima']);
    const lines = new Set();
    for (let t = 0; t < 30; t += 0.25) for (const c of chatter([n], { x: 0, y: 0 }, t, {}, { quiet: 0 })) { lines.add(c.text); expect(c.shown).toBeLessThanOrEqual(c.text.length); }
    expect(lines.size).toBe(2);
  });
  it('gives the line a mood', () => {
    const [c] = chatter([talker('a', 0, 0, ['Kau siapa?'])], { x: 0, y: 0 }, 1, {}, { quiet: 0 });
    expect(c.mood).toBe('ask');
  });
});
