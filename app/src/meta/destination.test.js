import { describe, it, expect } from 'vitest';
import { destinationInfo } from './destination.js';
import { createCharacter } from './character.js';
import { REGIONS } from '../data/world.js';
import { DUNGEONS } from '../data/dungeons.js';

const NOW = 1_700_000_000_000;
const make = () => createCharacter({ slot: 0, name: 'Rey', look: { hair: 0, hairColor: 0 }, classId: 'warrior' }, NOW);

describe('destinationInfo (spec §46)', () => {
  it('names a town without enemies', () => {
    const d = destinationInfo(make(), 'town', 'home');
    expect(d.kind).toBe('town');
    expect(d.name).toBeTruthy();
    expect(d.foes).toEqual([]);
  });
  it('lists a region\'s most common enemies first, with its levels', () => {
    const r = REGIONS[0], d = destinationInfo(make(), 'region', r.id, 3);
    expect(d.levels).toEqual(r.levels);
    expect(d.foes).toHaveLength(3);
    const top = Object.entries(r.enemies).sort((a, b) => b[1] - a[1])[0][0];
    expect(d.foes[0].id).toBe(top);
  });
  it('marks enemies already in the bestiary as seen', () => {
    const c = make(), r = REGIONS[0], first = destinationInfo(c, 'region', r.id).foes[0].id;
    expect(destinationInfo(c, 'region', r.id).foes[0].seen).toBe(false);
    c.records.bestiary[first] = 3;
    expect(destinationInfo(c, 'region', r.id).foes[0].seen).toBe(true);
  });
  it('finds a dungeon\'s boss apart from its other enemies', () => {
    const d = destinationInfo(make(), 'dungeon', DUNGEONS[0].id);
    expect(d.boss).toBeTruthy();
    expect(d.foes.some((f) => f.id === d.boss.id)).toBe(false);
    expect(d.floors).toBe(DUNGEONS[0].floors.length);
  });
  it('carries the quest being followed', () => {
    const d = destinationInfo(make(), 'town', 'home');
    expect(d.quest === null || typeof d.quest.title === 'string').toBe(true);
  });
  it('returns null for an unknown place', () => {
    expect(destinationInfo(make(), 'region', 'nowhere')).toBeNull();
    expect(destinationInfo(make(), 'town', 'nowhere')).toBeNull();
  });
});
