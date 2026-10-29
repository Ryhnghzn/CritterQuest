import { describe, it, expect } from 'vitest';
import { townMapInfo, playerSpot, townLegend } from './townmap.js';
import { createTown } from './town.js';
import { SERVICES } from '../data/townmap.js';
import { townDef } from '../data/towns.js';
import { TOWN_IDS } from '../data/world.js';

describe('peta kota', () => {
  it('memuat semua bangunan dan orang di luar rumah', () => {
    const def = townDef('home'), info = townMapInfo('home');
    expect(info.places.map((p) => p.id)).toEqual(def.buildings.map((b) => b.id));
    expect(info.people.map((p) => p.id)).toEqual(def.npcs.filter((n) => !n.night).map((n) => n.id));
    expect([info.w, info.h]).toEqual([def.w, def.h]);
  });

  it('rumah berisi penjaga tokonya, dengan pintu di depan', () => {
    const inn = townMapInfo('home').places.find((p) => p.id === 'inn');
    expect(inn.people.map((p) => p.role)).toContain('inn');
    expect(inn.door.y).toBeGreaterThan(inn.y + inn.h);
  });

  it('pedagang malam hanya ada saat malam', () => {
    const night = townDef('rimba').npcs.find((n) => n.night);
    expect(townMapInfo('rimba').people.some((p) => p.id === night.id)).toBe(false);
    expect(townMapInfo('rimba', { night: true }).people.some((p) => p.id === night.id)).toBe(true);
  });

  it('tanda quest naik ke rumah; ? mengalahkan !', () => {
    const info = townMapInfo('home', { marks: { inn: '!', tired: '?' }, offers: (id) => (id === 'inn' ? [{ title: 'Sup Hangat' }] : []) });
    const inn = info.places.find((p) => p.id === 'inn');
    expect(inn.people.find((p) => p.id === 'inn')).toMatchObject({ mark: '!', quests: ['Sup Hangat'] });
    expect(inn.mark).toBe('?');
    expect(info.places.find((p) => p.id === 'potion').mark).toBe(null);
  });

  it('posisi pemain: di luar apa adanya, di dalam rumah di depan pintunya', () => {
    const info = townMapInfo('home'), t = createTown({ moveSpd: 1, hp: 1, maxHp: 1 });
    expect(playerSpot(info, t)).toEqual({ x: t.x, y: t.y, inside: null });
    const inn = info.places.find((p) => p.id === 'inn');
    expect(playerSpot(info, { ...t, map: 'inn', x: 5, y: 5 })).toEqual({ x: inn.door.x, y: inn.door.y, inside: inn });
  });

  it('daftar: quest (yang ? dulu) lalu semua layanan, dengan tempatnya', () => {
    const info = townMapInfo('home', { marks: { odo: '!', inn: '?' }, offers: (id) => (id === 'odo' ? [{ title: 'A' }] : id === 'inn' ? [{ title: 'B' }] : []) });
    const { quests, shops } = townLegend(info);
    expect(quests).toEqual([{ mark: '?', title: 'B', who: 'Bu Marta', where: 'Penginapan', id: 'inn' }, { mark: '!', title: 'A', who: 'Kakek Odo', where: null, id: 'odo' }]);
    expect(shops.find((s) => s.role === 'inn')).toMatchObject({ who: 'Bu Marta', where: 'Penginapan', icon: 'inn' });
    expect(shops.find((s) => s.role === 'gate').where).toBe(null);
  });

  it('setiap kota: semua penjaga toko punya keterangan layanan', () => {
    for (const id of TOWN_IDS) {
      const roles = [...townMapInfo(id, { night: true }).places.flatMap((p) => p.people), ...townMapInfo(id, { night: true }).people].map((p) => p.role);
      for (const r of roles.filter((x) => x !== 'talk')) expect(SERVICES[r], `${id}: ${r}`).toBeTruthy();
    }
  });
});
