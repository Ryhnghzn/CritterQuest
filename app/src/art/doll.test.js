import { describe, it, expect } from 'vitest';
import {
  DOLL_W, DOLL_H, BODY, HAIR, HAIR_NAMES, HAIR_PALETTE, HAIR_COLOR_NAMES, OUTFIT, LAYER_KEYS,
} from './doll.js';
import { HAIR_STYLES, HAIR_COLORS } from '../data/balance.js';
import { CLASSES } from '../data/classes.js';

const checkLayer = (rows, keys) => {
  expect(rows.length).toBeLessThanOrEqual(DOLL_H);
  rows.forEach((r, i) => {
    expect(r.length, `baris ${i}: "${r}"`).toBe(DOLL_W);
    for (const ch of r) expect(`.${keys}`).toContain(ch);
  });
};

describe('template paper doll', () => {
  it('badan pas di kerangka 16×20', () => {
    expect(BODY.length).toBe(DOLL_H);
    checkLayer(BODY, LAYER_KEYS.body);
  });

  it('tiap gaya rambut pas di kerangka', () => {
    HAIR.forEach((rows) => checkLayer(rows, LAYER_KEYS.hair));
  });

  it('jumlah gaya, warna, dan baju kelas cocok dengan data', () => {
    expect(HAIR.length).toBe(HAIR_STYLES);
    expect(HAIR_NAMES.length).toBe(HAIR_STYLES);
    expect(HAIR_PALETTE.length).toBe(HAIR_COLORS);
    expect(HAIR_COLOR_NAMES.length).toBe(HAIR_COLORS);
    expect(Object.keys(OUTFIT).sort()).toEqual(Object.keys(CLASSES).sort());
  });
});
