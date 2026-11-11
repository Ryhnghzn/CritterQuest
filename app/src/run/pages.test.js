// Two skill pages (spec §43.6).
import { describe, it, expect } from 'vitest';
import { Game } from './run.js';
import { CLASSES, CLASS_BASE } from '../data/classes.js';
import { PAGE_B_LEVEL } from '../data/balance.js';

const DT = 1 / 60, idle = { move: { x: 0, y: 0 }, aimAt: null, dodge: false, attack: false, potion: -1 };
const game = (level = 20, page = 0) => {
  const g = new Game();
  g.start({ classId: 'mage', stats: { ...CLASS_BASE, ...CLASSES.mage.stats }, level, skills: ['nova', 'chain', null, null], skillsB: ['meteor', 'blink', null, null], page });
  g.spawnT = 1e9;
  return g;
};
const press = (g, extra) => { g.intent = { ...idle, ...extra }; g.step(DT); g.intent = { ...idle }; };

describe('skill pages', () => {
  it('Q swaps at once: keys 1–4 now cast page B', () => {
    const g = game();
    expect(g.skillDefs[0].id).toBe('nova');
    press(g, { swap: true });
    expect(g.page).toBe(1); expect(g.skillDefs[0].id).toBe('meteor');
    g.energy = 100; press(g, { skill1: true });
    expect(g.pageCd[1][0]).toBeGreaterThan(0); expect(g.pageCd[0][0]).toBe(0);
  });
  it('the hidden page keeps cooling down', () => {
    const g = game();
    g.energy = 100; press(g, { skill1: true });
    const cd = g.pageCd[0][0];
    press(g, { swap: true });
    for (let i = 0; i < 60; i++) g.step(DT);
    expect(g.pageCd[0][0]).toBeLessThan(cd - 0.9);
  });
  it('page B is locked below its level (and when empty)', () => {
    const g = game(PAGE_B_LEVEL - 1);
    press(g, { swap: true });
    expect(g.page).toBe(0);
    const e = new Game();
    e.start({ classId: 'mage', stats: { ...CLASS_BASE, ...CLASSES.mage.stats }, level: 30, skills: ['nova', null, null, null] });
    e.intent = { ...idle, swap: true }; e.step(DT);
    expect(e.page).toBe(0);
  });
  it('starts on the remembered page; a skill can be changed on page B mid-trip', () => {
    const g = game(20, 1);
    expect(g.page).toBe(1);
    g.setSkills(['meteor', 'nova', null, null], 1);
    expect(g.pageDefs[1][1].id).toBe('nova'); expect(g.pageCd[1][1]).toBeGreaterThan(0);
  });
});
