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

  it('pilar yang menunggu hanya berdebu; retakan baru muncul saat pilar meletus', () => {
    const g = arena('warrior', ['quake', null, null, null]);
    cast(g, 'skill1', 0.05); // one pillar has erupted, four wait
    const waiting = g.hits.filter((h) => h.sid === 'quake' && h.delay > 0);
    expect(waiting.length).toBeGreaterThan(0);
    expect(waiting.every((h) => h.fxAge === undefined)).toBe(true);
    cast(g, 'skill1', 0); // no-op
    for (let t = 0; t < 0.5; t += DT) { g.hitStop = 0; g.intent = { move: { x: 0, y: 0 }, aimAt: { x: 60, y: 10 }, dodge: false, attack: false }; g.step(DT); }
    expect(g.vfx.cracks.size).toBeGreaterThanOrEqual(4);
  });

  it('jejak Panah Naga mengeluarkan bara; busur bumerang berbalik memicu efek putar', () => {
    const g = arena('archer', ['pierce', null, null, null]);
    cast(g, 'skill1', 0.8);
    expect(g.hits.some((h) => h.part === 'trail' && h.fxAge > 0)).toBe(true);
    const w = arena('warrior', ['axe', null, null, null]);
    cast(w, 'skill1', 1.2);
    const axe = w.hits.find((h) => h.sid === 'axe');
    expect(axe?.returning).toBe(true);
    expect(axe.fxTurned).toBe(true);
  });
});

describe('momen puncak mekanik khas (spec §31.8)', () => {
  const mk = (classId, skills = [null, null, null, null]) => {
    const g = new Game();
    g.start({ classId, stats: { ...CLASS_BASE, ...CLASSES[classId].stats, crit: 0 }, skills, level: 25 });
    g.spawnT = 1e9;
    return g;
  };
  const idle = { move: { x: 0, y: 0 }, aimAt: null, dodge: false, attack: false, auto: false, skill1: false, skill2: false, skill3: false, skill4: false, ult: false, potion: -1 };
  const lite = (g) => { g.vfx.mul = 0.5; };
  const count = (g, kind) => g.vfx.particles.items.slice(0, g.vfx.particles.size).filter((p) => p.kind === kind);
  const victim = (g, hp, maxHp = 100) => { const e = g.spawnEnemy('tank'); Object.assign(e, { x: g.px + 40, y: g.py, hp, maxHp, speed: 0, dmg: 0 }); return e; };

  it('Mengamuk mulai: kilat merah, getar, hit-stop', () => {
    const g = mk('warrior');
    g.trait.v = CLASSES.warrior.trait.max - 0.01;
    g.damageEnemy({ mult: 0.001, fx: CLASSES.warrior.attack.fx }, victim(g, 1e6, 1e6));
    expect(g.trait.on).toBeGreaterThan(0);
    expect(g.vfx.flashes.size).toBe(1);
    expect(g.shake).toBeGreaterThan(0);
    expect(g.hitStop).toBeGreaterThan(0);
  });

  it('gerak tenang: Mengamuk tanpa kilat', () => {
    const g = mk('warrior');
    g.calm = true;
    g.trait.v = CLASSES.warrior.trait.max - 0.01;
    g.damageEnemy({ mult: 0.001, fx: CLASSES.warrior.attack.fx }, victim(g, 1e6, 1e6));
    expect(g.trait.on).toBeGreaterThan(0);
    expect(g.vfx.flashes.size).toBe(0);
  });

  it('Kepanasan: asap naik dari pemain, kecuali efek Ringan', () => {
    for (const [isLite, want] of [[false, true], [true, false]]) {
      const g = mk('mage');
      if (isLite) lite(g);
      g.trait.lock = 2;
      for (let i = 0; i < 30; i++) { g.intent = { ...idle }; g.step(DT); }
      expect(count(g, 'smoke').length > 0, `lite=${isLite}`).toBe(want);
    }
  });

  it('tembakan Bidik: garis cahaya menembus layar + hit-stop; Ringan tanpa garis', () => {
    for (const [isLite, want] of [[false, true], [true, false]]) {
      const g = mk('archer');
      if (isLite) lite(g);
      g.trait.v = 100; g.trait.focus = true;
      g.intent = { ...idle, attack: true };
      g.step(DT);
      const long = count(g, 'beam').filter((p) => Math.hypot(p.x2 - p.x, p.y2 - p.y) > 1000);
      expect(long.length > 0, `lite=${isLite}`).toBe(want);
      expect(g.hitStop).toBeGreaterThan(0);
    }
  });

  it('eksekusi Kombo: layar hitam-putih sesaat + tebasan merah; gerak tenang tanpa hitam-putih', () => {
    const g = mk('assassin');
    g.damageEnemy({ mult: 0.001, skill: true, execute: 0.3, fx: 'dagger' }, victim(g, 29));
    expect(g.vfx.grayT).toBeGreaterThan(0);
    expect(count(g, 'cut').length).toBeGreaterThan(0);
    const calm = mk('assassin');
    calm.calm = true;
    calm.damageEnemy({ mult: 0.001, skill: true, execute: 0.3, fx: 'dagger' }, victim(calm, 29));
    expect(calm.vfx.grayT).toBe(0);
    const none = mk('assassin'); // no execute: a plain hit
    none.damageEnemy({ mult: 0.001, skill: true, execute: 0.3, fx: 'dagger' }, victim(none, 80));
    expect(none.vfx.grayT).toBe(0);
  });
});
