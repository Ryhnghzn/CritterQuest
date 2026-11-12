import { describe, it, expect } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { openStore, DB_NAME } from './save.js';
import { createCharacter } from './character.js';

const char = (slot = 0) => createCharacter(
  { slot, name: 'Rey', look: { hair: 1, hairColor: 2 }, classId: 'archer' }, 1761436800000,
);

// Writes a value straight into the slots store, bypassing validation.
function putRaw(idb, value) {
  return new Promise((resolve, reject) => {
    const req = idb.open(DB_NAME, 1);
    req.onsuccess = () => {
      const tx = req.result.transaction('slots', 'readwrite');
      tx.objectStore('slots').put(value);
      tx.oncomplete = () => { req.result.close(); resolve(); };
      tx.onerror = () => reject(tx.error);
    };
    req.onerror = () => reject(req.error);
  });
}

describe('openStore (IndexedDB)', () => {
  it('mulai dengan 3 slot kosong', async () => {
    const store = await openStore(new IDBFactory());
    expect(store.persistent).toBe(true);
    expect(await store.loadSlots()).toEqual([
      { slot: 0, status: 'empty' }, { slot: 1, status: 'empty' }, { slot: 2, status: 'empty' },
    ]);
  });

  it('slot tersimpan bertahan setelah "muat ulang" (koneksi baru)', async () => {
    const idb = new IDBFactory();
    await (await openStore(idb)).saveSlot(char(1));
    const slots = await (await openStore(idb)).loadSlots();
    expect(slots[1]).toEqual({ slot: 1, status: 'ok', data: char(1) });
    expect(slots[0].status).toBe('empty');
  });

  it('menghapus slot', async () => {
    const store = await openStore(new IDBFactory());
    await store.saveSlot(char(2));
    await store.deleteSlot(2);
    expect((await store.loadSlots())[2].status).toBe('empty');
  });

  it('menolak menyimpan data tidak sah', async () => {
    const store = await openStore(new IDBFactory());
    await expect(store.saveSlot({ ...char(0), level: 0 })).rejects.toThrow();
    expect((await store.loadSlots())[0].status).toBe('empty');
  });

  it('slot rusak dilaporkan dan tidak pernah ditimpa', async () => {
    const idb = new IDBFactory();
    const store = await openStore(idb);
    const broken = { slot: 0, version: 99, name: 'dari masa depan' };
    await putRaw(idb, broken);
    const [s0] = await store.loadSlots();
    expect(s0.status).toBe('corrupt');
    expect(s0.raw).toEqual(broken);
    await expect(store.saveSlot(char(0))).rejects.toThrow(/rusak/);
    expect((await store.loadSlots())[0].raw).toEqual(broken);
    await store.deleteSlot(0);
    await store.saveSlot(char(0));
    expect((await store.loadSlots())[0].status).toBe('ok');
  });

  it('menyimpan dan membaca pengaturan', async () => {
    const idb = new IDBFactory();
    const store = await openStore(idb);
    expect(await store.loadSettings()).toBeNull();
    const s = { version: 7, muted: true, lastSlot: 2, autoAttack: true, lang: 'id', effects: 'lite', musicVol: 80, sfxVol: 80, view: '25d', sharp: 'normal', showFps: false, shake: true, dmgNumbers: true, zoom: 'far', camSens: 'normal', camera: 'top' };
    await store.saveSettings(s);
    expect(await (await openStore(idb)).loadSettings()).toEqual(s);
  });

  it('pengaturan versi 1 dimigrasi saat dimuat', async () => {
    const store = await openStore(new IDBFactory());
    await store.saveSettings({ version: 1, muted: true, lastSlot: 1 });
    expect(await store.loadSettings()).toEqual({ version: 7, muted: true, lastSlot: 1, autoAttack: false, lang: 'en', effects: 'auto', musicVol: 80, sfxVol: 80, view: '25d', sharp: 'normal', showFps: false, shake: true, dmgNumbers: true, zoom: 'far', camSens: 'normal', camera: 'top' });
  });
});

describe('openStore (fallback memori)', () => {
  it('dipakai bila IndexedDB tidak ada', async () => {
    const store = await openStore(null);
    expect(store.persistent).toBe(false);
    await store.saveSlot(char(0));
    expect((await store.loadSlots())[0]).toEqual({ slot: 0, status: 'ok', data: char(0) });
  });

  it('dipakai bila membuka IndexedDB gagal', async () => {
    const failing = {
      open() {
        const req = {};
        queueMicrotask(() => { req.error = new Error('diblokir'); req.onerror?.(); });
        return req;
      },
    };
    const store = await openStore(failing);
    expect(store.persistent).toBe(false);
    const s = { version: 7, muted: false, lastSlot: 0, autoAttack: false, lang: 'en', effects: 'full', musicVol: 80, sfxVol: 80, view: '25d', sharp: 'normal', showFps: false, shake: true, dmgNumbers: true, zoom: 'far', camSens: 'normal', camera: 'top' };
    await store.saveSettings(s);
    expect(await store.loadSettings()).toEqual(s);
  });

  it('salinan data terpisah dari objek pemanggil', async () => {
    const store = await openStore(null);
    const c = char(0);
    await store.saveSlot(c);
    c.name = 'Diubah';
    expect((await store.loadSlots())[0].data.name).toBe('Rey');
  });
});
