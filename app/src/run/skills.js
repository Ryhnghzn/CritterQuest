// Class attacks (spec §4.2, §18.2): the basic attack (held, or automatic in auto
// mode) whose hits fill energy, and the two skills Q / E that spend it (short
// cooldowns, reduced by cdr).
import { CLASSES } from '../data/classes.js';
import { AUTO_ATTACK_MARGIN, CDR_MAX, ENERGY, ULT, SKILL_SLOTS, TEMPO } from '../data/balance.js';
import { makeArea, makeSweep, makeProjectile, makeOrbit } from './hits.js';
import { sfx } from '../core/audio.js';
import { castFx, focusShotFx } from './skillfx.js';
import { traitMods, traitCast, traitCastExecute, traitFocusShot } from './traits.js';

export const ATTACK_POSE = 0.15; // seconds the doll shows its attack pose
const DEG = Math.PI / 180;

// How close an enemy must be before auto mode bothers attacking.
function attackReach(a) { return a.kind === 'arc' ? a.r + AUTO_ATTACK_MARGIN : a.range; }

export function skillCooldown(stats, skill) {
  return skill.cd * (1 - Math.min(stats.cdr, CDR_MAX) / 100);
}

// the basic attack would really fire this step; auto mode never swings while mounted (spec §35.1)
export const attackWanted = (run, intent) => intent.attack || (intent.auto && run.mount?.state === 'none' && run.nearestEnemy(attackReach(CLASSES[run.classId].attack)) !== null);

export function stepAttack(run, intent, dt) {
  if (run.attackT > 0) run.attackT -= dt;
  // only counts down to just below zero, so holding the button keeps an exact cadence
  if (run.atkCd > 0) run.atkCd -= dt;
  if (run.atkCd > 0) return;
  const a = CLASSES[run.classId].attack;
  if (!attackWanted(run, intent)) return;

  run.atkCd += a.interval * TEMPO.attackInterval / run.stats.atkSpd; // spec §33.1
  run.attackT = ATTACK_POSE;
  const angle = Math.atan2(run.aimY, run.aimX);
  if (a.kind === 'arc') {
    const m = traitMods(run); // Murka widens the slash (equals the class attack without a trait)
    run.hits.push(makeArea({ x: run.px, y: run.py, r: m.arcR, angle, arc: m.arcDeg, mult: a.mult, fx: a.fx }));
    const wave = run.trait?.on > 0 && CLASSES[run.classId].trait.frenzy.wave;
    if (wave) { // Mengamuk: a small shockwave ahead of every swing; fx 'shout' is no basic fx, so it feeds no Murka / energy
      const w = makeArea({ x: run.px + run.aimX * m.arcR * 0.6, y: run.py + run.aimY * m.arcR * 0.6, r: wave.r, mult: wave.mult, fx: 'shout' });
      w.knock = wave.knock;
      run.hits.push(w);
    }
  } else {
    const focus = run.trait && traitFocusShot(run); // full Bidik: piercing, bigger, forced crit (spec §31.4)
    const shot = focus ? CLASSES[run.classId].trait.shot : null;
    const proj = makeProjectile({
      x: run.px + run.aimX * 8, y: run.py + run.aimY * 8, angle,
      speed: a.speed * TEMPO.projSpeed, range: a.range, r: shot ? a.r * shot.size : a.r, mult: a.mult,
      pierce: shot ? shot.pierce : a.pierce, explode: a.explode, fx: a.fx,
    });
    if (focus) { proj.crit = true; focusShotFx(run, angle); }
    run.hits.push(proj);
  }
  sfx.attack(a.fx);
}

// For the renderer only: which skill was just cast (n counts casts, so a repeat is seen too).
function markCast(run, skill) {
  run.castPose = { id: skill.id, n: (run.castPose?.n || 0) + 1, dur: skill.duration || 0 };
}

export function stepSkills(run, intent, dt) {
  for (let i = 0; i < SKILL_SLOTS; i++) if (run.skillCd[i] > 0) run.skillCd[i] -= dt;
  if (run.buffT > 0) { run.buffT -= dt; if (run.buffT <= 0) run.dmgTakenMul = 1; }
  run.energy = Math.min(ENERGY.max, run.energy + ENERGY.regen * dt);
  if (run.noEnergyT > 0) run.noEnergyT -= dt;
  const skills = run.skillDefs;
  if (run.skillBuffT > 0 && (run.skillBuffT -= dt) <= 0) run.applyBuffs();
  const pressed = [intent.skill1, intent.skill2, intent.skill3, intent.skill4];
  const locked = traitMods(run).locked; // Kepanasan: every skill is locked (HUD reads run.trait.lock)
  for (let i = 0; i < SKILL_SLOTS; i++) {
    if (locked || !pressed[i] || !skills[i] || run.skillCd[i] > 0) continue;
    if (run.energy < skills[i].cost) { if (run.noEnergyT <= 0) sfx.noEnergy(); run.noEnergyT = 0.4; continue; }
    run.energy -= skills[i].cost;
    run.skillCdMax[i] = skillCooldown(run.stats, skills[i]);
    run.skillCd[i] = run.skillCdMax[i];
    const before = run.hits.length;
    castSkill(run, skills[i]);
    const mul = traitCast(run, skills[i]), exec = traitCastExecute(); // Panas / Bidik / Kombo (spec §31.3–31.5)
    for (let k = before; k < run.hits.length; k++) { // skill damage bonus, no energy, pierces shields
      const h = run.hits[k];
      h.skill = true; h.mult *= mul;
      if (exec) h.execute = exec;
    }
    castFx(run, skills[i], before);
    run.attackT = ATTACK_POSE;
    markCast(run, skills[i]);
    sfx.skill(skills[i].id);
  }
  // ultimate (key 5): its own charge bar, no energy, no cooldown (spec §22)
  if (intent.ult && run.ult && run.ultCharge >= ULT.max) {
    run.ultCharge = 0;
    const u = run.ult;
    const before = run.hits.length;
    castSkill(run, u);
    for (let k = before; k < run.hits.length; k++) { run.hits[k].skill = true; run.hits[k].ult = true; } // gold-edged numbers
    castFx(run, u, before);
    markCast(run, u);
    if (u.dmgTaken) { run.buffT = u.duration; run.dmgTakenMul = u.dmgTaken; }
    if (u.invuln) run.dodgeInv = Math.max(run.dodgeInv, u.invuln);
    run.attackT = ATTACK_POSE;
    run.showBanner(u.name.toUpperCase());
    run.addShake('heavy'); run.addHitStop('ult');
    run.vfx.flash('#fff3c4', 0.4, 0.18);
    run.vfx.ring(run.px, run.py, { r1: 120, life: 0.5, color: '#ffd166', width: 5 });
    sfx.ult(u.id);
  }
}

// Ultimate charge from kills and from damage taken.
export function chargeUlt(run, amount) {
  if (run.ult) run.ultCharge = Math.min(ULT.max, run.ultCharge + amount);
}

function castSkill(run, s) {
  const angle = Math.atan2(run.aimY, run.aimX);
  switch (s.kind) {
    case 'area': {
      let x = run.px, y = run.py;
      if (s.at === 'aim') {
        let dx = run.aimPX - run.px, dy = run.aimPY - run.py;
        const d = Math.hypot(dx, dy);
        if (d > s.maxDist) { dx *= s.maxDist / d; dy *= s.maxDist / d; }
        x += dx; y += dy;
      }
      run.hits.push(makeArea({
        x, y, r: s.r, mult: s.mult, ticks: s.ticks ?? 1, duration: s.duration ?? 0,
        follow: !!s.follow, freeze: s.freeze ?? 0, fx: s.look || s.id,
      }));
      run.hits[run.hits.length - 1].knock = s.knock || 0;
      break;
    }
    case 'proj':
      run.hits.push(makeProjectile({
        x: run.px + run.aimX * 8, y: run.py + run.aimY * 8, angle,
        speed: s.speed, range: s.range, r: s.r, mult: s.mult, pierce: s.pierce, explode: s.explode || null, fx: s.look || s.id,
        delay: s.delay || 0, boomerang: !!s.boomerang, pull: s.pull || 0, trail: s.trail || null, split: s.split || null,
      }));
      break;
    case 'line': // pillars fixed on the line at cast time; each erupts `gap` s after the one before
      for (let i = 0; i < s.count; i++) {
        const d = s.step * (i + 1);
        const pillar = makeArea({ x: run.px + run.aimX * d, y: run.py + run.aimY * d, r: s.r, mult: s.mult, duration: s.life, freeze: s.freeze ?? 0, fx: s.look || s.id, delay: s.gap * i });
        pillar.knock = s.knock || 0;
        pillar.angle = angle;                       // direction of the fissure (visual only)
        pillar.reach = i < s.count - 1 ? s.step : 0; // px to the next pillar: the crack leaps there when this one erupts
        run.hits.push(pillar);
      }
      break;
    case 'fan': { // a full circle (spread 360) spaces the arrows by count, not count - 1
      const full = s.spread >= 360, n = s.count;
      for (let k = 0; k < n; k++) {
        const a = angle + (n > 1 ? k / (full ? n : n - 1) - (full ? 0 : 0.5) : 0) * s.spread * DEG;
        const ring = s.ring || 0;
        run.hits.push(makeProjectile({
          x: run.px + Math.cos(a) * ring, y: run.py + Math.sin(a) * ring, angle: a, speed: s.speed, range: s.range, r: s.r, mult: s.mult,
          pierce: s.pierce || 0, fx: s.look || 'dagger', split: s.split || null, delay: s.delay || 0, curve: s.curve || 0,
          hover: s.delay ? ring : 0, // floats on the ring round the player until it launches
        }));
      }
      break;
    }
    case 'orbit': {
      const o = makeOrbit({ radius: s.radius, spin: s.spin, every: s.every, duration: s.duration, r: s.r, mult: s.mult, angle, throw: s.throw || null, fx: s.look || s.id });
      o.x = run.px + run.aimX * s.radius; o.y = run.py + run.aimY * s.radius;
      run.hits.push(o);
      break;
    }
    case 'storm':
      storm(run, s);
      break;
    case 'dash': {
      const dir = s.back ? -1 : 1; // Lompatan Mundur jumps away from the aim
      if (s.blast) blast(run, s.blast);
      run.dodgeT = s.duration;
      run.dashSpeed = s.distance / s.duration;
      run.skillDash = true; // skill dashes never clear Bidik
      run.dodgeX = run.aimX * dir; run.dodgeY = run.aimY * dir;
      run.dodgeInv = Math.max(run.dodgeInv, s.duration + 0.1);
      if (s.mult > 0) {
        const sw = makeSweep({ x: run.px, y: run.py, r: s.r, mult: s.mult, duration: s.duration + 0.05, follow: true, fx: s.look || s.id });
        if (s.resetOnKill) sw.resetSid = s.id; // a kill makes the skill ready again (Terjang)
        run.hits.push(sw);
      }
      break;
    }
    case 'buff':
      run.buffT = s.duration;
      run.dmgTakenMul = s.dmgTaken;
      if (s.atk || s.atkSpd || s.crit || s.critDmg) {
        run.skillBuff = { atk: s.atk, atkSpd: s.atkSpd, crit: s.crit, critDmg: s.critDmg };
        run.skillBuffT = s.duration;
        run.applyBuffs();
      }
      if (s.blast) blast(run, s.blast);
      break;
    default:
      throw new Error(`unknown skill kind ${s.kind}`);
  }
}

// shockwave around the player (Teriakan Baja, Bom Asap, Lompatan Mundur)
function blast(run, b) {
  run.hits.push(makeArea({ x: run.px, y: run.py, r: b.r, mult: b.mult, fx: b.freeze ? 'nova' : 'shout', duration: 0.35, freeze: b.freeze || 0 }));
  run.hits[run.hits.length - 1].knock = b.knock || 0;
}

// Badai Petir: lightning picks a chain of targets and every one gets its own lightning
// strike (an area riding on the enemy), `gap` s after the one before.
function storm(run, s) {
  const list = pickChain(run, s);
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    const strike = makeArea({ x: e.x, y: e.y, r: s.r, mult: s.mult, fx: 'chain', delay: s.gap * i });
    strike.target = e;
    strike.only = e; // this strike hurts its own victim alone, however crowded it is
    run.hits.push(strike);
  }
}

// Targets of a lightning chain: first = enemy nearest the aim point within range, then each jump
// goes to the nearest enemy not yet struck.
function pickChain(run, s) {
  const out = [];
  let cur = null, best = Infinity;
  for (const e of run.enemies) {
    if (e.hp <= 0 || Math.hypot(e.x - run.px, e.y - run.py) > s.range) continue;
    const d = Math.hypot(e.x - run.aimPX, e.y - run.aimPY);
    if (d < best) { best = d; cur = e; }
  }
  while (cur && out.length < s.count) {
    out.push(cur);
    let next = null, bd = s.jump;
    for (const e of run.enemies) {
      if (e.hp <= 0 || out.includes(e)) continue;
      const d = Math.hypot(e.x - cur.x, e.y - cur.y);
      if (d < bd) { bd = d; next = e; }
    }
    cur = next;
  }
  return out;
}
