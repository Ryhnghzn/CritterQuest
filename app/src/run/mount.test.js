import { describe, it, expect } from 'vitest';
import { freshMount, startSummon, stepMount, dismount, mountSpeedMul, canCrossWater, isRiding, wantsAction } from './mount.js';
import { MOUNT } from '../data/mounts.js';

const HORSE = { id: 'horse', rarity: 0, fly: false, skin: 0 };
const DRAGON = { id: 'dragon', rarity: 5, fly: true, skin: 0 };
const ride = (def) => { const m = freshMount(def); startSummon(m); stepMount(m, MOUNT.summon + 0.01); return m; };

describe('mount (§35.1)', () => {
  it('tanpa mount: tidak bisa memanggil', () => {
    const m = freshMount(null);
    expect(startSummon(m)).toBe(false);
    expect(m.state).toBe('none');
  });
  it('memanggil 1 dtk lalu menunggang', () => {
    const m = freshMount(HORSE);
    expect(startSummon(m)).toBe(true);
    expect(m.state).toBe('summoning');
    expect(stepMount(m, MOUNT.summon - 0.05)).toBe(null);
    expect(isRiding(m)).toBe(false);
    expect(stepMount(m, 0.1)).toBe('rode');
    expect(isRiding(m)).toBe(true);
  });
  it('kecepatan: ×1 saat jalan kaki, sesuai rarity saat menunggang', () => {
    const m = freshMount(HORSE);
    expect(mountSpeedMul(m)).toBe(1);
    startSummon(m); expect(mountSpeedMul(m)).toBe(1); // memanggil: masih jalan kaki
    stepMount(m, MOUNT.summon + 0.01);
    expect(mountSpeedMul(m)).toBe(MOUNT.speed[0]);
    expect(mountSpeedMul(ride(DRAGON))).toBe(MOUNT.speed[5]);
  });
  it('menyeberang air hanya saat menunggang mount terbang', () => {
    expect(canCrossWater(ride(HORSE))).toBe(false);
    const d = freshMount(DRAGON);
    expect(canCrossWater(d)).toBe(false);
    expect(canCrossWater(ride(DRAGON))).toBe(true);
  });
  it('aksi: turun tanpa jeda, bisa dipanggil lagi segera', () => {
    const m = ride(HORSE);
    expect(dismount(m, 'action')).toBe(true);
    expect(m.state).toBe('none');
    expect(m.lock).toBe(0);
    expect(startSummon(m)).toBe(true);
  });
  it('aksi saat memanggil: panggilan batal', () => {
    const m = freshMount(HORSE); startSummon(m);
    expect(dismount(m, 'action')).toBe(true);
    expect(m.state).toBe('none');
  });
  it('kena pukul: jatuh, terkunci 3 dtk', () => {
    const m = ride(HORSE);
    expect(dismount(m, 'hit')).toBe(true);
    expect(m.lock).toBe(MOUNT.fallLock);
    expect(startSummon(m)).toBe(false);
    stepMount(m, MOUNT.fallLock - 0.1);
    expect(startSummon(m)).toBe(false);
    stepMount(m, 0.2);
    expect(startSummon(m)).toBe(true);
  });
  it('sudah jalan kaki: dismount tidak melakukan apa-apa', () => {
    const m = freshMount(HORSE);
    expect(dismount(m, 'hit')).toBe(false);
    expect(m.lock).toBe(0);
  });
  it('wantsAction: hanya serang sungguhan, atau skill / ultimate / menghindar yang siap', () => {
    const idle = { attack: false, auto: false, dodge: false, skill1: false, skill2: false, skill3: false, skill4: false, ult: false };
    const ready = { skill: [true, true, true, true], dodge: true, ult: true };
    const none = { skill: [false, false, false, false], dodge: false, ult: false };
    expect(wantsAction(idle, ready)).toBe(false);
    expect(wantsAction({ ...idle, auto: true }, ready)).toBe(false); // serang otomatis tidak menurunkan
    expect(wantsAction({ ...idle, attack: true }, none)).toBe(true);
    for (const k of ['dodge', 'skill1', 'skill4', 'ult']) {
      expect(wantsAction({ ...idle, [k]: true }, ready)).toBe(true);
      expect(wantsAction({ ...idle, [k]: true }, none)).toBe(false); // tekan yang tak bisa jalan: tetap menunggang
    }
  });
  it('kena pukul saat memanggil: batal tanpa kunci', () => {
    const m = freshMount(HORSE); startSummon(m);
    expect(dismount(m, 'hit')).toBe(true);
    expect(m.state).toBe('none');
    expect(m.lock).toBe(0);
  });
});
