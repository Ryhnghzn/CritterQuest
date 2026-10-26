// Save storage (spec §9): IndexedDB, or an in-memory fallback when it is
// unavailable (blocked, some private modes). No DOM; the IndexedDB factory is
// injectable so tests can use fake-indexeddb.
import { SLOT_COUNT } from '../data/balance.js';
import { readSlot, readSettings, validateSlot } from './schema.js';

export const DB_NAME = 'critter-quest';
const DB_VERSION = 1;

function openDb(idb) {
  return new Promise((resolve, reject) => {
    const req = idb.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('slots')) db.createObjectStore('slots', { keyPath: 'slot' });
      if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Both backends share one tiny API: get / put / del per object store.
// Writes resolve only once the transaction has committed.
function idbBackend(db) {
  const run = (name, mode, fn) => new Promise((resolve, reject) => {
    const tx = db.transaction(name, mode);
    const req = fn(tx.objectStore(name));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('transaksi dibatalkan'));
  });
  return {
    get: (name, key) => run(name, 'readonly', (s) => s.get(key)),
    put: (name, value, key) => run(name, 'readwrite', (s) => (key === undefined ? s.put(value) : s.put(value, key))),
    del: (name, key) => run(name, 'readwrite', (s) => s.delete(key)),
  };
}

function memoryBackend() {
  const stores = { slots: new Map(), settings: new Map() };
  return {
    get: async (name, key) => structuredClone(stores[name].get(key)),
    put: async (name, value, key) => { stores[name].set(key ?? value.slot, structuredClone(value)); },
    del: async (name, key) => { stores[name].delete(key); },
  };
}

function makeStore(b, persistent) {
  return {
    persistent, // false = memory only, progress is lost on reload

    // → [{ slot, status: 'empty' }| { slot, status: 'ok', data } | { slot, status: 'corrupt', reason, raw }]
    async loadSlots() {
      const out = [];
      for (let slot = 0; slot < SLOT_COUNT; slot++) {
        const raw = await b.get('slots', slot);
        out.push(raw === undefined ? { slot, status: 'empty' } : { slot, ...readSlot(raw) });
      }
      return out;
    },

    async saveSlot(data) {
      const err = validateSlot(data);
      if (err.length) throw new Error(`data slot tidak sah: ${err.join(', ')}`);
      const prev = await b.get('slots', data.slot);
      if (prev !== undefined && readSlot(prev).status === 'corrupt') {
        throw new Error(`slot ${data.slot} rusak; hapus dulu sebelum menyimpan`);
      }
      await b.put('slots', data);
    },

    deleteSlot: (slot) => b.del('slots', slot),
    loadSettings: async () => readSettings(await b.get('settings', 'main')),
    saveSettings: (s) => b.put('settings', s, 'main'),
  };
}

function defaultFactory() {
  try { return globalThis.indexedDB || null; } catch (_) { return null; } // access can throw (SecurityError)
}

export async function openStore(idb = defaultFactory()) {
  if (idb) {
    try { return makeStore(idbBackend(await openDb(idb)), true); } catch (_) { /* fall back to memory */ }
  }
  return makeStore(memoryBackend(), false);
}
