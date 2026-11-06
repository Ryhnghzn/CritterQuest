import { describe, it, expect } from 'vitest';
import { MOUNT, MOUNT_DEFS, MOUNT_IDS } from './mounts.js';
import { MAJESTIC_MOUNTS } from '../art/mounts.js';
import { RARITIES } from './items.js';

describe('data mount (§35)', () => {
  it('id, rarity, terbang & jumlah warna cocok dengan gambar', () => {
    expect(MAJESTIC_MOUNTS.map((m) => m.id).sort()).toEqual([...MOUNT_IDS].sort());
    for (const m of MAJESTIC_MOUNTS) {
      const d = MOUNT_DEFS[m.id];
      expect(d.rarity).toBe(m.rarity);
      expect(!!d.fly).toBe(!!m.fly);
      expect(d.skins).toBe(m.skins.length);
    }
  });
  it('kecepatan untuk tiap rarity, naik bersama rarity', () => {
    expect(MOUNT.speed.length).toBe(RARITIES.length);
    for (let i = 1; i < MOUNT.speed.length; i++) expect(MOUNT.speed[i]).toBeGreaterThan(MOUNT.speed[i - 1]);
  });
  it('yang terbang = Legendaris ke atas', () => {
    for (const d of Object.values(MOUNT_DEFS)) expect(!!d.fly).toBe(d.rarity >= 4);
  });
});
