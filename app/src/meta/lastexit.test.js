import { describe, it, expect } from 'vitest';
import { beat, closed, verdict } from './lastexit.js';

describe('cara game terakhir ditutup (spec §50)', () => {
  it('pertama kali / keluar wajar: tidak ada yang dilaporkan', () => {
    expect(verdict(null, 1000)).toBeNull();
    const n = beat(null, 0, 'run');
    expect(verdict(closed(n, 5000), 9000)).toBeNull();
    expect(verdict(closed(n, 5000, 'update'), 9000)).toBeNull();
  });

  it('catatan tanpa penutupan saat layar tampil = tertutup paksa, dengan tempat & lama bermain', () => {
    let n = beat(null, 0, 'town');
    n = beat(n, 12 * 60000, 'run');
    expect(n.since).toBe(0);
    expect(verdict(n, 12 * 60000 + 4000)).toEqual({ kind: 'killed', scene: 'run', minutes: 12, ago: 4 });
  });

  it('tertutup saat di latar belakang (pindah aplikasi) dibedakan', () => {
    const n = beat(beat(null, 0, 'run'), 60000, 'run', true);
    expect(verdict(n, 99000).kind).toBe('background');
  });

  it('catatan rusak diabaikan', () => {
    expect(verdict({ t: 'x' }, 1)).toBeNull();
    expect(verdict({}, 1)).toBeNull();
  });
});
