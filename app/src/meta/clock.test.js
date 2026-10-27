import { describe, it, expect } from 'vitest';
import { clockText, phaseOf, skyAt, nextMorning, dayOf, minuteOfDay } from './clock.js';

const at = (day, h, m = 0) => (day - 1) * 1440 + h * 60 + m;

describe('jam dalam game', () => {
  it('hari, jam, dan bagian hari', () => {
    expect(clockText(at(3, 18, 40))).toEqual({ day: 3, time: '18:40', phase: expect.objectContaining({ name: 'Malam' }) });
    expect(phaseOf(at(1, 5)).name).toBe('Pagi');
    expect(phaseOf(at(1, 12)).name).toBe('Siang');
    expect(phaseOf(at(1, 16)).name).toBe('Sore');
    expect(phaseOf(at(1, 2)).name).toBe('Malam');
    expect(dayOf(at(2, 0))).toBe(2);
    expect(minuteOfDay(at(4, 1, 5))).toBe(65);
  });

  it('terang siang, gelap malam, hangat saat senja', () => {
    expect(skyAt(at(1, 12)).dark).toBeLessThan(0.15);
    expect(skyAt(at(1, 23)).dark).toBeGreaterThan(0.75);
    expect(skyAt(at(1, 17)).warm).toBeGreaterThan(skyAt(at(1, 12)).warm);
    expect(skyAt(at(1, 23)).night).toBeCloseTo(1, 1);
  });

  it('tidur di penginapan: bangun pukul 07:00', () => {
    expect(nextMorning(at(1, 22))).toBe(at(2, 7));
    expect(nextMorning(at(2, 3))).toBe(at(2, 7));
    expect(nextMorning(at(2, 9))).toBe(at(3, 7));
  });
});
