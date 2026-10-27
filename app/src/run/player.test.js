import { describe, it, expect } from 'vitest';
import { Game } from './run.js';
import { stepPlayer } from './player.js';
import { CLASSES, CLASS_BASE } from '../data/classes.js';
import { DODGE, AUTO_AIM_RANGE } from '../data/balance.js';
import { ROOM } from '../data/dungeon.js';

const STATS = { ...CLASS_BASE, ...CLASSES.archer.stats }; // moveSpd 115
const DT = 1 / 60;

function fresh() {
  const g = new Game();
  g.start({ classId: 'archer', stats: STATS });
  g.enemies.length = 0;
  return g;
}
const intent = (over = {}) => ({ move: { x: 0, y: 0 }, aimAt: null, dodge: false, ...over });
function hold(g, seconds, it = intent()) {
  for (let t = 0; t < seconds - 1e-9; t += DT) stepPlayer(g, it, DT);
}

describe('gerak', () => {
  it('kecepatan = moveSpd', () => {
    const g = fresh();
    stepPlayer(g, intent({ move: { x: 1, y: 0 } }), 0.5);
    expect(g.px).toBeCloseTo(57.5);
  });

  it('tidak menembus dinding ruangan', () => {
    const g = fresh();
    g.px = ROOM.r - 13; g.py = 0;
    hold(g, 1, intent({ move: { x: 1, y: 0 } }));
    expect(Math.hypot(g.px, g.py)).toBeLessThanOrEqual(ROOM.r - 12 + 1e-6);
  });
});

describe('dodge', () => {
  it('melesat 150 px dalam 0,18 s ke arah gerak, mengabaikan input selama melesat', () => {
    const g = fresh();
    stepPlayer(g, intent({ move: { x: 0, y: 1 }, dodge: true }), DT);
    hold(g, DODGE.duration, intent({ move: { x: 1, y: 0 } }));
    expect(g.py).toBeCloseTo(DODGE.distance, 0);
  });

  it('tanpa gerak, melesat ke arah bidik', () => {
    const g = fresh();
    g.aimX = 1; g.aimY = 0;
    stepPlayer(g, intent({ dodge: true }), DT);
    hold(g, DODGE.duration);
    expect(g.px).toBeCloseTo(DODGE.distance, 0);
  });

  it('kebal 0,25 s, lalu tidak', () => {
    const g = fresh();
    stepPlayer(g, intent({ dodge: true }), DT);
    expect(g.dodgeInv).toBeGreaterThan(0);
    hold(g, DODGE.invuln);
    expect(g.dodgeInv).toBeLessThanOrEqual(0);
  });

  it('cooldown 1,2 s', () => {
    const g = fresh();
    g.aimX = 1; g.aimY = 0;
    stepPlayer(g, intent({ dodge: true }), DT);
    hold(g, 0.5);
    const x = g.px;
    stepPlayer(g, intent({ dodge: true }), DT);
    hold(g, 0.3);
    expect(g.px).toBe(x);
    hold(g, DODGE.cooldown);
    stepPlayer(g, intent({ dodge: true }), DT);
    hold(g, DODGE.duration);
    expect(g.px).toBeCloseTo(x + DODGE.distance, 0);
  });

  it('kontak musuh saat dodge tidak melukai', () => {
    const g = fresh();
    g.spawnT = 1e9;
    g.spawnEnemy('slink');
    g.enemies[0].x = 0; g.enemies[0].y = 0;
    g.intent = intent({ dodge: true, move: { x: 1, y: 0 } });
    const hp = g.stats.hp;
    g.step(DT);
    expect(g.stats.hp).toBe(hp);
  });
});

describe('bidik', () => {
  it('mengikuti titik bidik (mouse)', () => {
    const g = fresh();
    stepPlayer(g, intent({ aimAt: { x: 0, y: -40 } }), DT);
    expect(g.aimX).toBeCloseTo(0);
    expect(g.aimY).toBeCloseTo(-1);
  });

  it('otomatis ke musuh terdekat dalam jangkauan', () => {
    const g = fresh();
    g.spawnEnemy('slink');
    Object.assign(g.enemies[0], { x: -100, y: 0 });
    stepPlayer(g, intent({ move: { x: 0, y: 1 } }), DT);
    expect(g.aimX).toBeCloseTo(-1, 1);
  });

  it('tanpa musuh dalam jangkauan: arah gerak; diam: arah terakhir', () => {
    const g = fresh();
    g.spawnEnemy('slink');
    Object.assign(g.enemies[0], { x: AUTO_AIM_RANGE + 50, y: 0 });
    stepPlayer(g, intent({ move: { x: 0, y: -1 } }), DT);
    expect(g.aimY).toBeCloseTo(-1);
    stepPlayer(g, intent(), DT);
    expect(g.aimY).toBeCloseTo(-1);
  });
});
