import { describe, it, expect } from 'vitest';
import { rollBounty, progressOf, advanceBounties, claimBounty, rerollBounty, rerollPrice, buyWithMarks, bountyReward, takeBounty, dropBounty } from './bounties.js';
import { createCharacter, applyTrip } from './character.js';
import { validateSlot } from './schema.js';
import { INVENTORY_MAX } from '../data/balance.js';
import { MOUNT_DEFS } from '../data/mounts.js';

const make = () => createCharacter({ slot: 0, name: 'Rey', look: { hair: 0, hairColor: 0 }, classId: 'mage' }, 1);
const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };
const pots = { red: 0, big: 0, shield: 0, wind: 0, rage: 0 };
const trip = (over) => ({ exp: 0, gold: 0, kills: 0, bossKills: 0, floor: 1, cleared: false, died: false, hp: 50, potions: pots, ...over });

describe('rollBounty', () => {
  it('selalu sah, hanya musuh & dungeon yang sudah terbuka', () => {
    const c = make();
    let rng = 0.123;
    const r = () => (rng = (rng * 9301 + 0.49297) % 1);
    for (let i = 0; i < 200; i++) {
      const b = rollBounty(c, r);
      expect(b.need).toBeGreaterThanOrEqual(1);
      expect(b.have).toBe(0);
      expect(b.taken).toBe(false);
      if (b.kind === 'boss' || b.kind === 'floors') expect(b.target).toBe('shadow');
      if (b.kind === 'kill') expect(['boss', 'mini']).not.toContain(b.target);
    }
  });
  it('tidak sama dengan tugas lain di papan', () => {
    const c = make();
    const others = [{ kind: 'elite', target: null }];
    for (let i = 0; i < 50; i++) expect(rollBounty(c, Math.random, others).kind === 'elite').toBe(false);
  });
});

describe('progres', () => {
  it('menghitung per jenis tugas, dungeon harus cocok', () => {
    const t = { killsBy: { slink: 7 }, elites: 2, bossKills: 1, dungeon: 'shadow', floorsCleared: 4, gold: 120 };
    expect(progressOf({ kind: 'kill', target: 'slink' }, t)).toBe(7);
    expect(progressOf({ kind: 'kill', target: 'dart' }, t)).toBe(0);
    expect(progressOf({ kind: 'elite' }, t)).toBe(2);
    expect(progressOf({ kind: 'boss', target: 'shadow' }, t)).toBe(1);
    expect(progressOf({ kind: 'boss', target: 'lava' }, t)).toBe(0);
    expect(progressOf({ kind: 'floors', target: 'shadow' }, t)).toBe(4);
    expect(progressOf({ kind: 'gold' }, t)).toBe(120);
  });
  it('tidak melebihi target; applyTrip memajukan tugas yang diambil (juga saat mati)', () => {
    expect(advanceBounties([{ kind: 'elite', target: null, need: 3, have: 2, taken: true }], { elites: 5 })[0].have).toBe(3);
    const c = make();
    c.bounties.forEach((b) => { b.taken = true; });
    const r = applyTrip(c, trip({ died: true, killsBy: { slink: 30 }, elites: 1, dungeon: 'shadow', floorsCleared: 1 }), 2);
    expect(r.char.bounties.map((b) => b.have)).toEqual([25, 1, 1]);
    expect(r.bountiesDone).toBe(1);
    expect(validateSlot(r.char)).toEqual([]);
  });
  it('tugas yang belum diambil tidak berprogres', () => {
    expect(advanceBounties([{ kind: 'elite', target: null, need: 3, have: 0, taken: false }], { elites: 5 })[0].have).toBe(0);
    const c = make();
    c.bounties[1].taken = true;
    const r = applyTrip(c, trip({ killsBy: { slink: 30 }, elites: 1, dungeon: 'shadow', floorsCleared: 1 }), 2);
    expect(r.char.bounties.map((b) => b.have)).toEqual([0, 1, 0]);
    expect(r.bountiesDone).toBe(0);
  });
});

describe('ambil & batal', () => {
  it('ambil menandai tugas; batal menghapus progresnya', () => {
    const c = make();
    const t = takeBounty(c, 0, 5);
    expect(t.ok).toBe(true);
    expect(t.char.bounties[0].taken).toBe(true);
    expect(c.bounties[0].taken).toBe(false); // original untouched
    expect(takeBounty(t.char, 0, 5).reason).toBe('taken');
    t.char.bounties[0].have = 7;
    const d = dropBounty(t.char, 0, 6);
    expect(d.ok).toBe(true);
    expect(d.char.bounties[0]).toMatchObject({ taken: false, have: 0 });
    expect(validateSlot(d.char)).toEqual([]);
    expect(dropBounty(d.char, 0, 6).reason).toBe('nottaken');
    expect(takeBounty(c, 9, 5).reason).toBe('none');
  });
  it('tugas yang sudah diambil tidak bisa diganti', () => {
    const c = make(); c.gold = 100; c.bounties[0].taken = true;
    expect(rerollBounty(c, 0, Math.random, 5).reason).toBe('taken');
  });
});

describe('klaim & ganti', () => {
  it('klaim memberi hadiah dan mengganti tugas', () => {
    const c = make();
    c.bounties[0].taken = true;
    c.bounties[0].have = c.bounties[0].need;
    const rw = bountyReward(c, c.bounties[0]);
    const r = claimBounty(c, 0, seq(0.5, 0.3, 0.7), 5);
    expect(r.ok).toBe(true);
    expect(r.char.gold).toBe(rw.gold);
    expect(r.char.marks).toBe(rw.marks);
    expect(r.char.mats.dust).toBe(rw.dust);
    expect(r.char.exp + (r.levelsGained ? 1 : 0)).toBeGreaterThan(0);
    expect(r.char.bounties[0]).toMatchObject({ have: 0, taken: false });
    expect(validateSlot(r.char)).toEqual([]);
    expect(c.marks).toBe(0); // original untouched
  });
  it('belum selesai tidak bisa diklaim', () => {
    expect(claimBounty(make(), 1, Math.random, 5)).toEqual({ ok: false, reason: 'notdone' });
  });
  it('ganti tugas butuh koin', () => {
    const c = make();
    expect(rerollBounty(c, 0, Math.random, 5).reason).toBe('gold');
    c.gold = 100;
    const r = rerollBounty(c, 0, Math.random, 5);
    expect(r.ok).toBe(true);
    expect(r.char.gold).toBe(100 - rerollPrice(c));
  });
});

describe('toko Lencana', () => {
  it('peti Lencana memberi gear Epik di level karakter', () => {
    const c = make(); c.marks = 20;
    const r = buyWithMarks(c, 'chest', Math.random, 5);
    expect(r.ok).toBe(true);
    expect(r.item.rarity).toBe(3);
    expect(r.item.itemLevel).toBe(1);
    expect(r.char.marks).toBe(8);
    expect(r.char.inventory).toHaveLength(1);
    expect(validateSlot(r.char)).toEqual([]);
  });
  it('bahan & permata; Lencana kurang atau tas penuh ditolak', () => {
    const c = make(); c.marks = 10;
    expect(buyWithMarks(c, 'crystal', Math.random, 5).char.mats.crystal).toBe(5);
    const g = buyWithMarks(c, 'gem', () => 0, 5);
    expect(g.char.gems.ruby[1]).toBe(1);
    expect(buyWithMarks({ ...c, marks: 1 }, 'core', Math.random, 5).reason).toBe('marks');
    const full = { ...c, marks: 50, inventory: Array(INVENTORY_MAX).fill(null) };
    expect(buyWithMarks(full, 'chest', Math.random, 5).reason).toBe('bag');
  });
  it('Singa Kerajaan: beli sekali memberi mount, kedua kali ditolak (owned)', () => {
    const c = make(); c.marks = 200;
    const r = buyWithMarks(c, 'lion', Math.random, 5);
    expect(r.ok).toBe(true);
    expect(r.mount).toBe('lion');
    expect(r.char.mounts.owned.lion).toEqual([0]);
    expect(r.char.marks).toBe(200 - MOUNT_DEFS.lion.marks);
    expect(validateSlot(r.char)).toEqual([]);
    const again = buyWithMarks(r.char, 'lion', Math.random, 6);
    expect(again.ok).toBe(false);
    expect(again.reason).toBe('owned');
    expect(c.mounts.owned.lion).toBeUndefined();
  });
});
