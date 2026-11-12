// Particles of the Job Lanjutan skills (spec §48), called from run/skillfx.js for the skills whose
// id belongs to a branch. Like run/skillfx.js it only writes to run.vfx (its own PRNG) and visual
// flags, never to the simulation.
//   branchCastFx   — the skill / ultimate fires
//   branchWaitFx   — a hit that has not landed yet (a hammer about to fall)
//   branchStepFx   — every step a hit lives (first step, ticks, last step)
//   branchImpactFx — a hit lands on an enemy
//   branchDashFx / branchBuffFx — the hero dashing / under a buff
import { PALETTES } from '../data/fx.js';
import { SKILL_FX } from '../data/skillfx.js';
import { BRANCH_FX as B } from '../data/branchfx.js';

const TAU = Math.PI * 2;
const DUST = ['#8a7560', '#6a5a48', '#a08a70'];
const BLOOD = PALETTES.blood, HOLY = PALETTES.holy;
const DARK_BLOOD = ['#5c0a18', '#8a0f22', '#c21f3a'];
const steps = (v, rate, dt) => Math.floor(rate * v.mul * dt + v.rand());

function inside(v, x, y, r) {
  const a = v.rand() * TAU, d = Math.sqrt(v.rand()) * r;
  return [x + Math.cos(a) * d, y + Math.sin(a) * d];
}
function suck(v, x, y, R, color, life = 0.35, kind = 'dot', size = 2) {
  const a = v.rand() * TAU, c = Math.cos(a), s = Math.sin(a);
  v.spawn(kind, x + c * R, y + s * R, (-c * R) / life, (-s * R) / life, life, size, color);
}
// rising embers / motes; life: [min, max] — long lives keep the place glowing after the skill
function rise(v, x, y, n, color, spread, speed, life = [0.5, 1], kind = 'ember') {
  for (let i = 0; i < n * v.mul; i++) {
    v.spawn(kind, x + v.range(-spread, spread), y + v.range(-spread * 0.5, spread * 0.5), v.range(-20, 20), -v.range(speed * 0.4, speed),
      v.range(life[0], life[1]), v.range(1.4, 3), color, 0.97, -30);
  }
}
// stacked shock rings: n rings, `gap` s apart, growing to r1
function rings(v, x, y, r1, cols, n = 3, gap = 0.1, width = 7) {
  for (let i = 0; i < n; i++) v.ring(x, y, { r1: r1 * (0.6 + 0.4 * (i / Math.max(1, n - 1))), life: 0.45 + i * 0.05, color: cols[i % cols.length], width: Math.max(2, width - i * 1.5), delay: i * gap });
}
// three parallel claw rakes across (x, y) at angle a
function claws(v, x, y, a, len, color, life = 0.3) {
  const nx = -Math.sin(a), ny = Math.cos(a);
  for (const o of [-7, 0, 7]) v.cut(x + nx * o, y + ny * o, a, len, color, life);
}

export function branchCastFx(run, s, at) {
  const v = run.vfx, x = run.px, y = run.py, n = SKILL_FX[s.id]?.n ?? 10;
  const a = Math.atan2(run.aimY, run.aimX);
  switch (s.id) {
    case 'bloodrage': // the warrior roars: red flash, rings, a cracked floor, a geyser of blood
      if (!run.calm) v.flash('#ff1a2a', 0.32, 0.22);
      rings(v, x, y, 120, [BLOOD[2], BLOOD[1], DARK_BLOOD[1]], 3, 0.12, 8);
      v.crack(x, y + 8, { rays: 11, len: 70, color: BLOOD[2], life: B.bloodrage.crack });
      v.burst('blast', x, y, BLOOD, { n, speed: 1.5 });
      v.burst('kill', x, y - 6, DARK_BLOOD, { n: 14, angle: -Math.PI / 2, spread: 1.6, speed: 1.6 });
      rise(v, x, y + 8, n, BLOOD, 18, 140, [0.6, 1.2]);
      run.addShake('medium'); run.addHitStop?.('frenzy');
      break;
    case 'rageleap': // take-off: the floor splits under the feet
      v.ring(x, y + 6, { r1: 70, life: 0.35, color: BLOOD[2], width: 6 });
      v.crack(x, y + 8, { rays: 7, len: 46, color: BLOOD[2], life: B.rageleap.crack });
      v.burst('smoke', x, y + 8, DUST, { n: 8, speed: 1.6 });
      v.burst('blast', x, y, BLOOD, { n, angle: a + Math.PI, spread: 1.4 });
      break;
    case 'ragnarok': // the storm wakes: dark-red flash, the ground bursts open
      if (!run.calm) v.flash('#8a0010', 0.4, 0.3);
      rings(v, x, y, s.r * 1.3, [BLOOD[1], BLOOD[2], '#ffd6d6'], 4, 0.08, 10);
      v.crack(x, y + 8, { rays: 16, len: s.r * 1.1, color: BLOOD[1], life: B.ragnarok.crack });
      v.burst('blast', x, y, BLOOD, { n, speed: 2 });
      v.burst('kill', x, y, DARK_BLOOD, { n: 18, speed: 2 });
      run.addShake('heavy'); run.addHitStop?.('ult');
      break;
    case 'holyguard': // a ray of light lands on the paladin: golden rings, motes rising
      if (!run.calm) v.flash('#fff3c4', 0.28, 0.2);
      rings(v, x, y, 90, [HOLY[2], HOLY[1], '#ffffff'], 3, 0.1, 6);
      v.burst('stars', x, y - 10, HOLY, { n, speed: 1.3 });
      rise(v, x, y + 6, n, HOLY, 22, 110, [0.8, 1.4], 'star');
      run.addShake('light');
      break;
    case 'judgment': // the sky marks the spot (the hammer itself lands in branchStepFx)
      v.ring(at.x, at.y, { r0: s.r * 1.4, r1: s.r * 0.2, life: 0.3, color: HOLY[2], width: 3 });
      v.burst('stars', x, y - 10, HOLY, { n: 8, angle: a, spread: 0.8 });
      break;
    case 'sanctuary': // holy ground spreads from the paladin
      if (!run.calm) v.flash('#fff6d8', 0.35, 0.3);
      rings(v, x, y, s.r * 1.2, ['#ffffff', HOLY[1], HOLY[2]], 4, 0.1, 8);
      v.crack(x, y + 6, { rays: 12, len: s.r, color: HOLY[2], life: 2.4 });
      v.burst('stars', x, y, HOLY, { n, speed: 1.8 });
      rise(v, x, y, n, HOLY, s.r * 0.6, 120, [1, 1.8], 'star');
      run.addShake('medium'); run.addHitStop?.('ult');
      break;
  }
}

// a hit waiting to land (h.delay > 0): Palu Penghakiman's second hammer gathers light first
export function branchWaitFx(run, h, dt) {
  const v = run.vfx;
  if (h.sid === 'judgment') for (let i = steps(v, B.judgment.gather, dt); i > 0; i--) suck(v, h.x, h.y, v.range(h.r * 0.6, h.r * 1.4), HOLY, 0.3, 'star', 2.2);
}

// o: { first, last, ticked } (see run/skillfx.js stepHitFx)
export function branchStepFx(run, h, dt, o) {
  const v = run.vfx, id = h.sid, S = SKILL_FX[id] || {};
  switch (id) {
    case 'bloodrage':
    case 'rageleap':
      if (h.fx === 'shout' && o.first) { // L5 blast: a shockwave of blood (Lompatan Amuk)
        rings(v, h.x, h.y, h.r * 1.2, [BLOOD[2], BLOOD[1]], 2, 0.08, 7);
        v.burst('kill', h.x, h.y, DARK_BLOOD, { n: 12, speed: 1.6 });
        run.addShake('medium');
      }
      break;
    case 'ragnarok': {
      for (let i = steps(v, S.rate, dt); i > 0; i--) { // blood dragged into the eye of the storm
        if (v.rand() < 0.55) suck(v, h.x, h.y, h.r * v.range(0.8, 1.3), DARK_BLOOD, 0.45, 'dot', v.range(1.6, 3));
        else {
          const q = v.rand() * TAU, R = v.range(10, h.r * 0.8);
          v.spawn('ember', h.x + Math.cos(q) * R, h.y + Math.sin(q) * R * 0.6, -Math.sin(q) * 180, Math.cos(q) * 90 - 70, v.range(0.4, 0.9), v.range(1.8, 3.2), BLOOD, 0.95, -40);
        }
      }
      for (let i = 0; i < o.ticked; i++) { // every blow: axe cuts flashing across the storm
        for (let k = 0; k < 3; k++) { const [px, py] = inside(v, h.x, h.y, h.r * 0.85); v.cut(px, py, v.rand() * TAU, v.range(40, 70), k ? BLOOD[1] : '#ffd6d6', 0.3); }
        v.ring(h.x, h.y, { r1: h.r, life: 0.3, color: BLOOD[2], width: 4 });
        run.addShake('light');
      }
      if (o.last) { // the storm bursts
        if (!run.calm) v.flash('#ff3040', 0.45, 0.25);
        rings(v, h.x, h.y, h.r * 1.7, ['#ffffff', BLOOD[1], BLOOD[2], DARK_BLOOD[0]], 4, 0.09, 11);
        v.crack(h.x, h.y + 10, { rays: 18, len: h.r * 1.3, color: BLOOD[1], life: B.ragnarok.crack });
        v.burst('blast', h.x, h.y, BLOOD, { n: 40, speed: 2.2 });
        v.burst('kill', h.x, h.y, DARK_BLOOD, { n: 24, speed: 2.4 });
        rise(v, h.x, h.y, B.ragnarok.embers, BLOOD, h.r * 0.8, 90, [1.2, B.ragnarok.linger]);
        run.addShake('heavy'); run.addHitStop?.('ult');
      }
      break;
    }
    case 'holyguard':
      if (h.fx === 'shout' && o.first) { // L5: a wave of holy light
        rings(v, h.x, h.y, h.r * 1.2, ['#ffffff', HOLY[2]], 2, 0.08, 7);
        v.burst('stars', h.x, h.y, HOLY, { n: 16, speed: 1.6 });
        run.addShake('medium');
      }
      break;
    case 'judgment':
      if (o.first) { // the hammer lands
        if (!run.calm) v.flash('#fff3c4', 0.3, 0.15);
        rings(v, h.x, h.y, h.r * 1.5, ['#ffffff', HOLY[1], HOLY[2]], 3, 0.07, 9);
        v.crack(h.x, h.y + 4, { rays: 12, len: h.r * 1.4, color: HOLY[2], life: B.judgment.crack });
        v.burst('stars', h.x, h.y, HOLY, { n: S.n ?? 20, speed: 1.8 });
        v.burst('shards', h.x, h.y, ['#ffffff', '#fff3c4', '#e6d6a0'], { n: 12, speed: 1.4 });
        v.burst('smoke', h.x, h.y + 6, ['#e8dcc0', '#c8b890'], { n: 8, speed: 2 });
        rise(v, h.x, h.y, 16, HOLY, h.r * 0.6, 100, [0.8, B.judgment.linger], 'star');
        run.addShake('heavy');
      }
      for (let i = steps(v, S.dust ?? 20, dt); i > 0; i--) { const [px, py] = inside(v, h.x, h.y, h.r); v.spawn('star', px, py, 0, -20, 0.4, 2.4, HOLY); }
      break;
    case 'sanctuary': {
      for (let i = steps(v, S.rate, dt); i > 0; i--) { // motes rising out of the holy ground
        const [px, py] = inside(v, h.x, h.y, h.r * 0.95);
        v.spawn(v.rand() < 0.5 ? 'star' : 'ember', px, py, v.range(-8, 8), -v.range(30, 80), v.range(0.6, 1.2), v.range(1.6, 2.8), HOLY, 0.98, -20);
      }
      for (let i = 0; i < o.ticked; i++) { // every pulse: a ring of light runs out to the rim
        v.ring(h.x, h.y, { r0: 10, r1: h.r, life: 0.5, color: HOLY[1], width: 5 });
        v.burst('stars', h.x, h.y, HOLY, { n: 8, speed: 1.4 });
      }
      if (o.last) {
        if (!run.calm) v.flash('#ffffff', 0.35, 0.2);
        rings(v, h.x, h.y, h.r * 1.4, ['#ffffff', HOLY[1], HOLY[2]], 3, 0.1, 9);
        v.burst('stars', h.x, h.y, HOLY, { n: 30, speed: 2 });
        rise(v, h.x, h.y, 30, HOLY, h.r * 0.8, 110, [1.2, B.sanctuary.linger], 'star');
        run.addShake('medium');
      }
      break;
    }
  }
}

// true when the branch skill drew its own impact (else run/skillfx.js shows a plain spark burst)
export function branchImpactFx(run, h, e, crit) {
  const v = run.vfx, boost = crit ? 1.5 : 1;
  switch (h.sid) {
    case 'rageleap':
    case 'ragnarok': {
      const q = Math.atan2(e.y - h.y, e.x - h.x) + Math.PI / 2;
      claws(v, e.x, e.y, q, 20 * boost, BLOOD[1], 0.3);
      v.burst('kill', e.x, e.y, DARK_BLOOD, { n: 6 * boost });
      return true;
    }
    case 'judgment':
    case 'sanctuary':
      v.burst('stars', e.x, e.y - 6, HOLY, { n: 5 * boost });
      v.cut(e.x, e.y, Math.PI / 2, 18, '#fff3c4', 0.25); v.cut(e.x, e.y - 4, 0, 12, '#fff3c4', 0.25); // a cross of light
      return true;
  }
  return false;
}

// the hero dashing with a branch skill; done: the dash just ended. true when handled.
export function branchDashFx(run, id, dt, done) {
  const v = run.vfx, x = run.px, y = run.py;
  if (id !== 'rageleap') return false;
  if (!done) {
    const mv = Math.atan2(run.dodgeY, run.dodgeX);
    for (let i = steps(v, SKILL_FX.rageleap.rate, dt); i > 0; i--) {
      v.spawn('ember', x + v.range(-8, 8), y + v.range(-6, 8), -run.dodgeX * 60 + v.range(-20, 20), -run.dodgeY * 60 - v.range(10, 50), v.range(0.3, 0.6), v.range(1.8, 3), BLOOD, 0.93, -20);
      if (v.rand() < 0.25) claws(v, x - run.dodgeX * 16, y - run.dodgeY * 16, mv + Math.PI / 2, 16, BLOOD[2], B.rageleap.claw);
    }
  } else { // landing: the ground caves in
    v.ring(x, y + 6, { r1: 80, life: 0.4, color: BLOOD[2], width: 7 });
    v.crack(x, y + 8, { rays: 9, len: 56, color: BLOOD[1], life: B.rageleap.crack });
    v.burst('smoke', x, y + 8, DUST, { n: 8, speed: 1.8 });
    v.burst('blast', x, y, BLOOD, { n: 14, speed: 1.4 });
    run.addShake('medium');
  }
  return true;
}

// the hero under a branch buff (run.buffSid); true when handled
export function branchBuffFx(run, id, dt) {
  const v = run.vfx, x = run.px, y = run.py, S = SKILL_FX[id];
  switch (id) {
    case 'bloodrage': {
      for (let i = steps(v, S.rate, dt); i > 0; i--) {
        if (v.rand() < 0.6) v.spawn('ember', x + v.range(-12, 12), y + 8, v.range(-10, 10), -v.range(50, 110), v.range(0.5, 0.9), v.range(1.6, 2.8), BLOOD, 0.97, -30);
        else v.spawn('dot', x + v.range(-8, 8), y - v.range(4, 20), v.range(-15, 15), v.range(-10, 10), 0.5, 1.8, DARK_BLOOD, 0.96, 320); // blood dripping
      }
      run.fxPulseT = (run.fxPulseT || 0) - dt;
      if (run.fxPulseT <= 0) { run.fxPulseT = B.bloodrage.pulse; v.ring(x, y + 8, { r0: 8, r1: 46, life: 0.4, color: BLOOD[2], width: 3 }); }
      return true;
    }
    case 'holyguard': {
      for (let i = steps(v, S.rate, dt); i > 0; i--) v.spawn('star', x + v.range(-24, 24), y + v.range(-20, 10), 0, -v.range(12, 30), v.range(0.6, 1), 2.4, HOLY, 0.98);
      run.fxPulseT = (run.fxPulseT || 0) - dt;
      if (run.fxPulseT <= 0) { run.fxPulseT = B.holyguard.pulse; v.ring(x, y + 4, { r0: 20, r1: 52, life: 0.5, color: HOLY[2], width: 3 }); }
      return true;
    }
  }
  return false;
}
