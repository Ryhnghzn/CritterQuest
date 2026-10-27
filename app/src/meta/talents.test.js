import { describe, it, expect } from 'vitest';
import { equipSkill, allocateTalents, freeTalents, talentFx, respecTalents, wornSkills, mergeFx } from './talents.js';
import { createCharacter, finalStats } from './character.js';
import { validateSlot } from './schema.js';

const NOW = 1761436800000;
const make = (over = {}) => ({ ...createCharacter({ slot: 0, name: 'Rey', look: { hair: 0, hairColor: 0 }, classId: 'warrior' }, NOW), ...over });

describe('pool skill', () => {
  it('skill baru terbuka sesuai level dan bisa dipasang di Q/E', () => {
    expect(equipSkill(make(), 0, 'quake', NOW).reason).toBe('locked');
    const r = equipSkill(make({ level: 5 }), 0, 'quake', NOW);
    expect(r.char.skills).toEqual(['quake', 'shout']);
    expect(wornSkills(r.char).map((s) => s.id)).toEqual(['quake', 'shout']);
    expect(validateSlot(r.char)).toEqual([]);
  });
  it('memasang skill yang ada di tombol lain menukarnya', () => {
    expect(equipSkill(make(), 0, 'shout', NOW).char.skills).toEqual(['shout', 'spin']);
    expect(equipSkill(make(), 0, 'nova', NOW).reason).toBe('bad');
  });
});

describe('bakat', () => {
  it('1 poin tiap 2 level; menambah stat dan efek', () => {
    const c = make({ level: 10 });
    expect(freeTalents(c)).toBe(5);
    const t = allocateTalents(c, { might: 3, vamp: 2 }, NOW);
    expect(freeTalents(t)).toBe(0);
    expect(finalStats(t).atk).toBeCloseTo(finalStats(c).atk * 1.09);
    expect(talentFx(t).lifesteal).toBeCloseTo(0.012);
    expect(validateSlot(t)).toEqual([]);
    expect(allocateTalents(c, { might: 6 }, NOW)).toBeNull();
    expect(allocateTalents(c, { might: 5, vigor: 1 }, NOW)).toBeNull();
  });
  it('atur ulang bakat: bayar, poin kembali', () => {
    const t = allocateTalents(make({ level: 10, gold: 1000 }), { might: 2 }, NOW);
    const r = respecTalents(t, NOW);
    expect(freeTalents(r.char)).toBe(5);
    expect(r.char.gold).toBeLessThan(1000);
  });
  it('efek bakat & gear dijumlah', () => {
    expect(mergeFx({ lifesteal: 0.03, phoenix: 0.3 }, { lifesteal: 0.006, skillDmg: 0.1 })).toEqual({ lifesteal: 0.036, phoenix: 0.3, skillDmg: 0.1 });
  });
});
