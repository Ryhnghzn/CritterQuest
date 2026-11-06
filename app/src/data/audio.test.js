import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { MUSIC, SOUNDS } from './audio.js';

describe('daftar suara', () => {
  it('setiap file yang tercatat ada di public/audio', () => {
    const files = [...Object.values(MUSIC).flat(), ...Object.values(SOUNDS).flatMap((s) => s.files)];
    expect(files.filter((f) => !existsSync(`public/audio/${f}.mp3`))).toEqual([]);
  });

  it('musik wilayah punya dua lagu untuk diacak', () => {
    expect(MUSIC.wilayah).toHaveLength(2);
  });
});
