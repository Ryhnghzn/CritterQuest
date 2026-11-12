import { describe, it, expect } from 'vitest';
import { exportName, exportText, importText, FILE_TAG } from './transfer.js';
import { createCharacter } from './character.js';
import { SAVE_VERSION, validateSlot } from './schema.js';

const make = () => createCharacter({ slot: 0, name: 'Reyhan ✨', look: { hair: 1, hairColor: 2 }, classId: 'novice' }, 5);

describe('ekspor / impor save (6B)', () => {
  it('nama file aman', () => {
    expect(exportName('Reyhan ✨')).toBe(`${FILE_TAG}-reyhan.json`);
    expect(exportName('')).toBe(`${FILE_TAG}-save.json`);
  });
  it('ekspor lalu impor ke slot lain: data sama, slot berganti', () => {
    const c = make();
    const r = importText(exportText(c, 9), 2, 10);
    expect(r.ok).toBe(true);
    expect(r.data.slot).toBe(2);
    expect(r.data.name).toBe(c.name);
    expect(r.data.updatedAt).toBe(10);
    expect(validateSlot(r.data)).toEqual([]);
  });
  it('slot polos (tanpa bungkus) juga diterima; versi lama dimigrasi', () => {
    const c = make();
    expect(importText(JSON.stringify(c), 1, 1).ok).toBe(true);
    const { difficulty, unlocked, rift, ...v25 } = c;
    const r = importText(JSON.stringify({ ...v25, version: 25 }), 1, 1);
    expect(r.ok).toBe(true);
    expect(r.data.version).toBe(SAVE_VERSION);
  });
  it('menolak file rusak', () => {
    expect(importText('bukan json', 0, 1).ok).toBe(false);
    expect(importText('[1,2]', 0, 1).ok).toBe(false);
    expect(importText(JSON.stringify({ game: FILE_TAG, save: { version: 999 } }), 0, 1).ok).toBe(false);
    expect(importText(JSON.stringify({ ...make(), level: -3 }), 0, 1).ok).toBe(false);
  });
});
