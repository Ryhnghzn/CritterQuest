import { describe, it, expect } from 'vitest';
import { pickWing } from './wingpick.js';
import { WINGS } from './wings.js';
import { WING_UNIQUE, WING_FULL_SET, WING_MYTHIC_WEAPON, WING_MYTHIC_ANY } from '../../data/wings.js';

const av = (over = {}) => ({ classId: 'warrior', look: { gear: {} }, fx: {}, set: -1, ...over });
const wep = (classId, rarity = 5) => ({ classId, look: { gear: { weapon: { rarity } } }, fx: {}, set: -1 });

describe('pilih sayap anime dari gear (spesifikasi §39)', () => {
  it('tanpa gear → tanpa sayap', () => {
    expect(pickWing(null)).toBeNull();
    expect(pickWing(av())).toBeNull();
  });

  it('helm Mitos saja → Malaikat', () => {
    expect(pickWing(av({ look: { gear: { helm: { rarity: 5 } } } }))).toBe('light');
  });

  it('senjata Mitos per job', () => {
    expect(pickWing(wep('warrior'))).toBe('phoenix');
    expect(pickWing(wep('archer'))).toBe('storm');
    expect(pickWing(wep('mage'))).toBe('void');
    expect(pickWing(wep('assassin'))).toBe('shadow');
  });

  it('efek unik menang atas senjata Mitos', () => {
    expect(pickWing({ classId: 'assassin', look: { gear: { weapon: { rarity: 5 } } }, fx: { lifesteal: 0.5 }, set: -1 })).toBe('blood');
  });

  it('set lengkap > senjata Mitos', () => {
    expect(pickWing({ classId: 'mage', look: { gear: { weapon: { rarity: 5 } } }, fx: {}, set: 4 })).toBe('blade');
  });

  it('efek unik > set lengkap', () => {
    expect(pickWing({ classId: 'warrior', look: { gear: {} }, fx: { dodgecd: 0.3 }, set: 4 })).toBe('wind');
  });

  it('urutan efek unik', () => {
    expect(pickWing(av({ fx: { phoenix: 1, shield: 0.5 } }))).toBe('phoenix');
    expect(pickWing(av({ fx: { chain: 0.2 } }))).toBe('storm');
    expect(pickWing(av({ fx: { shield: 0.5 } }))).toBe('ice');
  });

  it('Epik tanpa Mitos → tanpa sayap', () => {
    expect(pickWing(av({ set: 3 }))).toBeNull();
  });

  it('setiap sayap hasil pickWing ada di WINGS', () => {
    for (const [, w] of WING_UNIQUE) expect(WINGS[w]).toBeTruthy();
    expect(WINGS[WING_FULL_SET]).toBeTruthy();
    for (const w of Object.values(WING_MYTHIC_WEAPON)) expect(WINGS[w]).toBeTruthy();
    expect(WINGS[WING_MYTHIC_ANY]).toBeTruthy();
  });
});