import { describe, it, expect } from 'vitest';
import { Game } from './run.js';
import { CLASSES, CLASS_BASE } from '../data/classes.js';
import { SKILL_FX } from '../data/skillfx.js';
import { ULT } from '../data/balance.js';
import { rand } from '../core/rng.js';

const DT = 1 / 60;

// Every skill / ultimate of a class worn, energy & ult charge full, enemies around.
function arena(classId, skills) {
  const g = new Game();
  g.start({ classId, stats: { ...CLASS_BASE, ...CLASSES[classId].stats, crit: 50 }, skills, ult: CLASSES[classId].ult });
  g.spawnT = 1e9;
  for (const [x, y] of [[40, 0], [-50, 20], [80, 60], [0, -70]]) {
    const e = g.spawnEnemy('tank');
    Object.assign(e, { x, y, hp: 1e6, maxHp: 1e6, speed: 0, dmg: 0 });
  }
  return g;
}
function cast(g, key, seconds = 3) {
  for (let t = 0; t < seconds; t += DT) {
    g.energy = 999; g.ultCharge = ULT.max; g.hitStop = 0;
    g.intent = { move: { x: 0, y: 0 }, aimAt: { x: 60, y: 10 }, dodge: false, attack: true, [key]: t === 0 };
    g.step(DT);
  }
}

describe('efek skill', () => {
  it('setiap skill & ultimate punya data efek', () => {
    for (const c of Object.values(CLASSES)) {
      for (const s of [...c.skills, c.ult]) expect(SKILL_FX[s.id], s.id).toBeTruthy();
    }
  });

  for (const c of Object.values(CLASSES)) {
    const ids = c.skills.map((s) => s.id);
    it(`${c.id}: semua skill & ultimate berjalan dan memunculkan efek`, () => {
      for (let i = 0; i < ids.length; i += 4) {
        const worn = ids.slice(i, i + 4);
        while (worn.length < 4) worn.push(null);
        worn.forEach((id, k) => {
          if (!id) return;
          const g = arena(c.id, worn);
          let peak = 0;
          const orig = g.vfx.step.bind(g.vfx);
          g.vfx.step = (dt) => { peak = Math.max(peak, g.vfx.particles.size + g.vfx.rings.size); orig(dt); };
          cast(g, `skill${k + 1}`);
          expect(peak, id).toBeGreaterThan(0);
        });
      }
      const g = arena(c.id, ids.slice(0, 4));
      cast(g, 'ult');
      expect(g.vfx.particles.items.length).toBeGreaterThan(0);
    });
  }

  it('pool tidak melampaui batas walau semua efek menumpuk', () => {
    const g = arena('mage', ['nova', 'meteor', 'inferno', 'chain']);
    for (let t = 0; t < 4; t += DT) {
      g.energy = 999; g.ultCharge = ULT.max; g.skillCd.fill(0);
      g.intent = { move: { x: 0, y: 0 }, aimAt: { x: 60, y: 0 }, dodge: false, attack: true, skill1: true, skill2: true, skill3: true, skill4: true, ult: true };
      g.step(DT);
      expect(g.vfx.particles.size).toBeLessThanOrEqual(g.vfx.particles.cap);
    }
  });

  it('efek tidak mengubah hasil simulasi (RNG simulasi tak tersentuh)', () => {
    const run = (noFx) => {
      const g = arena('warrior', ['spin', 'quake', 'shout', 'charge']);
      if (noFx) g.vfx.mul = 0;
      for (let t = 0; t < 3; t += DT) {
        g.energy = 999; g.hitStop = 0;
        g.intent = { move: { x: 0, y: 0 }, aimAt: { x: 60, y: 0 }, dodge: false, attack: true, skill1: t < DT, skill2: Math.abs(t - 1) < DT / 2 };
        g.step(DT);
      }
      return [g.enemies.map((e) => e.hp).join(), rand()];
    };
    expect(run(false)).toEqual(run(true));
  });
});
