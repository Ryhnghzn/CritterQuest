import { describe, it, expect } from 'vitest';
import { Game } from './run.js';
import { CLASSES, CLASS_BASE } from '../data/classes.js';
import { BRANCHES } from '../data/branches.js';
import { SKILL_FX } from '../data/skillfx.js';
import { ULT } from '../data/balance.js';
import { ICON_IDS } from '../art/sprites.js';
import { BRANCH_SKILL, BRANCH_AURA } from '../render/branchfx.js';
import { rand } from '../core/rng.js';

const DT = 1 / 60;
// the branches whose skills already have their own show (spec §48, done part by part)
const DONE = ['berserker', 'paladin'];
// skills that crack the ground where they land (the mark stays after the skill)
const CRACKS = new Set(['bloodrage', 'rageleap', 'judgment']);

function arena(job, branchId, skills, ult) {
  const g = new Game();
  g.start({ classId: job, stats: { ...CLASS_BASE, ...CLASSES[job].stats, crit: 50 }, skills, ult, branch: branchId });
  g.spawnT = 1e9;
  for (const [x, y] of [[40, 0], [-50, 20], [80, 60], [0, -70]]) {
    const e = g.spawnEnemy('tank');
    Object.assign(e, { x, y, hp: 1e6, maxHp: 1e6, speed: 0, dmg: 0 });
  }
  return g;
}
function cast(g, key, seconds = 3, watch = () => {}) {
  for (let t = 0; t < seconds; t += DT) {
    g.energy = 999; g.ultCharge = ULT.max; g.hitStop = 0;
    g.intent = { move: { x: 0, y: 0 }, aimAt: { x: 60, y: 10 }, dodge: false, attack: false, [key]: t === 0 };
    g.step(DT);
    watch(g);
  }
}
const all = Object.entries(BRANCHES).flatMap(([job, list]) => list.map((b) => ({ job, b })));

describe('skill Job Lanjutan punya tampilan sendiri (spec §48)', () => {
  it('tiap skill & ultimate cabang memakai ikon sendiri yang ada', () => {
    const base = new Set(Object.values(CLASSES).flatMap((c) => [...c.skills, ...(c.ults || [c.ult])].filter(Boolean).map((s) => s.icon)));
    for (const { b } of all) {
      for (const s of [...b.skills, b.ult]) {
        expect(s.icon, s.id).toBe(s.id);
        expect(ICON_IDS, s.id).toContain(s.icon);
        expect(base.has(s.icon), s.id).toBe(false);
      }
    }
  });

  for (const { job, b } of all.filter((x) => DONE.includes(x.b.id))) {
    it(`${b.name}: skill & ultimate punya gambar khas dan memunculkan efek`, () => {
      for (const s of [...b.skills, b.ult]) {
        expect(SKILL_FX[s.id], s.id).toBeTruthy();
        expect(BRANCH_SKILL[s.id] || BRANCH_AURA[s.id], s.id).toBeTypeOf('function');
      }
      for (const s of b.skills) {
        const g = arena(job, b.id, [s.id, null, null, null], b.ult);
        let peak = 0, cracks = 0;
        cast(g, 'skill1', 2.5, (gg) => { peak = Math.max(peak, gg.vfx.particles.size + gg.vfx.rings.size); cracks = Math.max(cracks, gg.vfx.cracks.size); });
        expect(peak, s.id).toBeGreaterThan(10);
        if (CRACKS.has(s.id)) expect(cracks, s.id).toBeGreaterThan(0);
      }
      const g = arena(job, b.id, [b.skills[0].id, null, null, null], b.ult);
      let peak = 0;
      cast(g, 'ult', 3.5, (gg) => { peak = Math.max(peak, gg.vfx.particles.size); });
      expect(peak, b.ult.id).toBeGreaterThan(20);
      expect(g.hits.every((h) => !h.ult || h.sid === b.ult.id)).toBe(true);
    });
  }

  it('Palu Penghakiman: palu kedua (L5) mengumpulkan cahaya sebelum jatuh, retakan bertahan lama', () => {
    const g = arena('warrior', 'paladin', ['judgment', null, null, null], null);
    g.levels = { judgment: 5 };
    g.pageDefs[0][0] = { ...BRANCHES.warrior[1].skills[1], after: { r: 90, mult: 5, ticks: 1, duration: 0.4 } };
    g.skillDefs = g.pageDefs[0];
    cast(g, 'skill1', 0.2);
    const wait = g.hits.find((h) => h.sid === 'judgment' && h.delay > 0);
    expect(wait).toBeTruthy();
    expect(g.vfx.particles.items.slice(0, g.vfx.particles.size).some((p) => p.kind === 'star')).toBe(true);
    cast(g, 'none', 1.2);
    expect(g.vfx.cracks.size).toBeGreaterThanOrEqual(2); // both hammers left their mark, still showing
  });

  it('efek cabang tidak mengubah hasil simulasi (RNG simulasi tak tersentuh)', () => {
    const run = (noFx) => {
      const b = BRANCHES.warrior[0];
      const g = arena('warrior', 'berserker', ['rageleap', 'bloodrage', null, null], b.ult);
      if (noFx) g.vfx.mul = 0;
      for (let t = 0; t < 3; t += DT) {
        g.energy = 999; g.ultCharge = ULT.max; g.hitStop = 0;
        g.intent = { move: { x: 0, y: 0 }, aimAt: { x: 60, y: 0 }, dodge: false, attack: true, skill1: t < DT, skill2: Math.abs(t - 1) < DT / 2, ult: Math.abs(t - 1.5) < DT / 2 };
        g.step(DT);
      }
      return [g.enemies.map((e) => Math.round(e.hp)).join(), rand()];
    };
    expect(run(false)).toEqual(run(true));
  });
});
