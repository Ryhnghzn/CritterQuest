// Class attacks (spec §4.2, §18.2): the basic attack (held, or automatic in auto
// mode) whose hits fill energy, and the two skills Q / E that spend it (short
// cooldowns, reduced by cdr).
import { CLASSES } from '../data/classes.js';
import { AUTO_ATTACK_MARGIN, CDR_MAX, ENERGY, ULT, SKILL_SLOTS, TEMPO } from '../data/balance.js';
import { makeArea, makeSweep, makeProjectile, makeOrbit } from './hits.js';
import { sfx } from '../core/audio.js';
import { castFx, focusShotFx } from './skillfx.js';
import { traitMods, traitCast, traitCastExecute, traitFocusShot, traitRage, comboTempo } from './traits.js';
import { isHeld, beginHeld, stepHeld, openParry } from './tempo.js';
import { summon, stepSummons } from './summons.js';
import { castFocus } from './focus.js';
import { armAmbush, castRewind } from './branch.js';

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

  run.atkCd += a.interval * TEMPO.attackInterval / (run.stats.atkSpd * comboTempo(run)); // spec §33.1; Penari Pedang
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
      pierce: (shot ? shot.pierce : a.pierce) + (run.skillBuffT > 0 ? run.skillBuff?.pierceBasic || 0 : 0), explode: a.explode, fx: a.fx, // Mata Elang L5
    });
    if (focus) { proj.crit = true; proj.snipe = true; focusShotFx(run, angle); } // snipe: Penembak Jitu's range bonus
    run.hits.push(proj);
  }
  sfx.attack(a.fx);
}

// For the renderer only: which skill was just cast (n counts casts, so a repeat is seen too).
function markCast(run, skill) {
  run.castPose = { id: skill.id, n: (run.castPose?.n || 0) + 1, dur: skill.duration || 0 };
}

// energy a skill costs this run: Hemat Mana (spec §43.3) takes a share off
export const skillCost = (run, s) => s.cost * (1 - (run.fx?.manaSave || 0));

// a skill with charges: the second cast must come within CHARGE_WINDOW s, at least CHARGE_GAP s after the first
const CHARGE_WINDOW = 2, CHARGE_GAP = 0.25;

export function stepSkills(run, intent, dt) {
  const cds = run.pageCd || [run.skillCd], maxes = run.pageCdMax || [run.skillCdMax]; // both pages cool down (spec §43.6)
  for (const cd of cds) for (let i = 0; i < SKILL_SLOTS; i++) if (cd[i] > 0) cd[i] -= dt;
  if (run.charges) run.charges.forEach((ch, p) => { for (let i = 0; i < SKILL_SLOTS; i++) if (ch[i] > 0 && (ch[i] -= dt) <= 0) { ch[i] = 0; cds[p][i] = maxes[p][i]; } }); // the second cast was not used
  if (run.buffT > 0) { run.buffT -= dt; if (run.buffT <= 0) run.dmgTakenMul = 1; }
  run.energy = Math.min(ENERGY.max, run.energy + ENERGY.regen * dt);
  if (run.noEnergyT > 0) run.noEnergyT -= dt;
  const skills = run.skillDefs;
  if (run.skillBuffT > 0 && (run.skillBuffT -= dt) <= 0) run.applyBuffs();
  stepHeld(run, intent, dt); // tempo skills being held, the parry window (spec §43.4)
  stepSummons(run, dt);      // towers, clones, runes
  if (run.focusMark && (run.focusMark.t -= dt) <= 0) run.focusMark = null; // a focused ultimate's mark
  if (run.chain && (run.chain.win -= dt) <= 0) endChain(run); // the window ran out
  const pressed = [intent.skill1, intent.skill2, intent.skill3, intent.skill4];
  const locked = traitMods(run).locked; // Kepanasan: every skill is locked (HUD reads run.trait.lock)
  for (let i = 0; i < SKILL_SLOTS; i++) {
    if (locked || !pressed[i] || !skills[i] || run.held) continue;
    if (run.chain && run.chain.i === i && run.chain.page === (run.page || 0)) { chainNext(run, skills[i]); continue; } // the next step of a chain
    if (run.skillCd[i] > 0) continue;
    const cost = skillCost(run, skills[i]);
    if (run.energy < cost) { if (run.noEnergyT <= 0) sfx.noEnergy(); run.noEnergyT = 0.4; continue; }
    run.energy -= cost;
    if (skills[i].kind === 'chain') { // Tarian Tiga Tebasan: step ① now; the cooldown waits for the end of the chain
      run.skillCdMax[i] = skillCooldown(run.stats, skills[i]);
      run.chain = { i, page: run.page || 0, step: 0, win: 0 };
      chainNext(run, skills[i]); markCast(run, skills[i]); sfx.skill(skills[i].id);
      continue;
    }
    if (isHeld(skills[i])) { // charge / channel: fires while / when let go; the cooldown starts at the end (run/tempo.js)
      run.skillCdMax[i] = skillCooldown(run.stats, skills[i]);
      traitCast(run, skills[i]);
      beginHeld(run, i, skills[i]); markCast(run, skills[i]); sfx.skill(skills[i].id);
      continue;
    }
    run.skillCdMax[i] = skillCooldown(run.stats, skills[i]);
    run.skillCd[i] = run.skillCdMax[i];
    if (skills[i].charges > 1) { // L3 (spec §43.4): a second cast right after the first; the cooldown waits for it
      run.charges ||= [[0, 0, 0, 0], [0, 0, 0, 0]];
      const ch = run.charges[run.page || 0];
      if (!ch[i]) { ch[i] = CHARGE_WINDOW; run.skillCd[i] = CHARGE_GAP; } else ch[i] = 0;
    }
    const before = run.hits.length;
    castSkill(run, skills[i]);
    const mul = traitCast(run, skills[i]), exec = traitCastExecute(); // Panas / Bidik / Kombo (spec §31.3–31.5)
    for (let k = before; k < run.hits.length; k++) { // skill damage bonus, no energy, pierces shields
      const h = run.hits[k];
      h.skill = true; h.mult *= mul;
      if (exec) h.execute = exec;
      if (skills[i].kind === 'area' && run.fx?.areaUp && h.r) h.r *= 1 + run.fx.areaUp; // Ledakan Besar
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
      if (s.burn) run.hits[run.hits.length - 1].burn = s.burn; // Badai Api L5
      if (s.vuln) run.hits[run.hits.length - 1].vuln = s.vuln; // Kabut Racun L5: the foes inside take more
      if (s.after) later(run, s.after, x, y, s.duration ?? 0, s.look || s.id);           // L5: a vortex / lava stays
      if (s.finale) later(run, { ...s.finale, duration: 0.35 }, x, y, s.duration ?? 0, 'boom'); // L5: a big blast at the end
      if (s.shatter) { run.shatterT = s.shatter.time; run.shatter = s.shatter; }           // Nova Es L5 (run/run.js killEnemy)
      break;
    }
    case 'proj': { // count + spread: several at once (Panah Naga L5); twin: a second one a moment later (Kapak Bumerang L3)
      const n = s.count || 1, shots = s.twin ? [0, s.twin] : [0];
      for (const wait of shots) for (let k = 0; k < n; k++) {
        const a = angle + (n > 1 ? (k / (n - 1) - 0.5) * (s.spread || 0) * DEG : 0);
        const p = makeProjectile({
          x: run.px + run.aimX * 8, y: run.py + run.aimY * 8, angle: a,
          speed: s.speed, range: s.range, r: s.r, mult: s.mult, pierce: s.pierce, explode: s.explode || null, fx: s.look || s.id,
          delay: (s.delay || 0) + wait, boomerang: !!s.boomerang, pull: s.pull || 0, trail: s.trail || null, split: s.split || null,
        });
        if (s.crit) p.crit = true; // Tembakan Kepala L5
        if (s.pause) p.pause = s.pause; // a boomerang waits spinning at the far end (Kapak Bumerang L5)
        run.hits.push(p);
      }
      break;
    }
    case 'line': // pillars fixed on the line at cast time; each erupts `gap` s after the one before
      for (let i = 0; i < s.count; i++) {
        const d = s.step * (i + 1);
        const pillar = makeArea({ x: run.px + run.aimX * d, y: run.py + run.aimY * d, r: s.r, mult: s.mult, duration: s.life, freeze: s.freeze ?? 0, fx: s.look || s.id, delay: s.gap * i });
        pillar.knock = s.knock || 0;
        pillar.angle = angle;                       // direction of the fissure (visual only)
        pillar.reach = i < s.count - 1 ? s.step : 0; // px to the next pillar: the crack leaps there when this one erupts
        run.hits.push(pillar);
      }
      if (s.finale) { const d = s.step * s.count; later(run, { ...s.finale, duration: 0.35 }, run.px + run.aimX * d, run.py + run.aimY * d, s.gap * (s.count - 1) + s.life * 0.5, 'boom'); } // Retakan Bumi L5
      break;
    case 'fan': { // a full circle (spread 360) spaces the arrows by count, not count - 1
      const full = s.spread >= 360, n = s.count;
      for (let k = 0; k < n; k++) {
        const a = angle + (n > 1 ? k / (full ? n : n - 1) - (full ? 0 : 0.5) : 0) * s.spread * DEG;
        const ring = s.ring || 0;
        run.hits.push(makeProjectile({
          x: run.px + Math.cos(a) * ring, y: run.py + Math.sin(a) * ring, angle: a, speed: s.speed, range: s.range, r: s.r, mult: s.mult,
          pierce: s.pierce || 0, fx: s.look || 'dagger', split: s.split || null, delay: s.delay || 0, curve: s.curve || 0, boomerang: !!s.returns, // L5: they come back once
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
      armAmbush(run); // Bayangan: a dash counts like a dodge
      if (s.mult > 0) {
        const sw = makeSweep({ x: run.px, y: run.py, r: s.r, mult: s.mult, duration: s.duration + 0.05, follow: true, fx: s.look || s.id });
        if (s.resetOnKill) sw.resetSid = s.id; // a kill makes the skill ready again (Terjang)
        run.hits.push(sw);
      }
      // along the dash path, laid down as the hero passes: a fire trail (Terjang L5), a shadow that slashes again (Langkah Bayangan L5)
      const path = (every, fn) => { for (let d = every; d <= s.distance; d += every) fn(run.px + run.dodgeX * d, run.py + run.dodgeY * d, (d / s.distance) * s.duration); };
      if (s.trail) path(s.trail.every * (s.distance / s.duration), (x, y, at) => later(run, { r: s.trail.r, mult: s.trail.mult, ticks: s.trail.ticks, duration: s.trail.life }, x, y, at, 'trail'));
      if (s.echo) path(s.r * 1.5, (x, y, at) => later(run, { r: s.r, mult: s.mult * 0.6, duration: 0.1 }, x, y, s.echo + at, s.look || s.id));
      break;
    }
    case 'parry':
      openParry(run, s);
      break;
    case 'turret': case 'rune': { // at the aim point, clamped like an aimed area (run/summons.js)
      let dx = run.aimPX - run.px, dy = run.aimPY - run.py;
      const d = Math.hypot(dx, dy);
      if (d > s.maxDist) { dx *= s.maxDist / d; dy *= s.maxDist / d; }
      summon(run, s, run.px + dx, run.py + dy);
      break;
    }
    case 'clone':
      summon(run, s, run.px, run.py);
      break;
    case 'focus': // the focused ultimates (run/focus.js)
      castFocus(run, s);
      break;
    case 'buff':
      run.buffT = s.duration;
      run.dmgTakenMul = s.dmgTaken;
      if (s.atk || s.atkSpd || s.crit || s.critDmg || s.moveSpd || s.pierceBasic || s.killExtend || s.lifesteal) {
        run.skillBuff = { atk: s.atk, atkSpd: s.atkSpd, crit: s.crit, critDmg: s.critDmg, moveSpd: s.moveSpd, pierceBasic: s.pierceBasic, killExtend: s.killExtend, lifesteal: s.lifesteal, extended: 0 };
        run.skillBuffT = s.duration;
        run.applyBuffs();
      }
      if (s.blast) blast(run, s.blast);
      if (s.rage) traitRage(run, s.rage);                                           // Amarah Perang L5: Murka at once
      if (s.invuln) run.dodgeInv = Math.max(run.dodgeInv, s.invuln);                  // Bom Asap L5
      if (s.ambush) run.ambushT = s.invuln || 1.5;                                  // Menghilang: the next hit is an ambush
      if (s.endBlast) later(run, { ...s.endBlast, duration: 0.35, follow: true }, run.px, run.py, s.duration, 'nova'); // Perisai Mana L5
      break;
    case 'rewind': // Putar Balik (spec §43.10, run/branch.js)
      castRewind(run, s);
      break;
    default:
      throw new Error(`unknown skill kind ${s.kind}`);
  }
}

// Chains (spec §43.4): each press plays the next step and opens a new window; after step 3 (or a missed window)
// the cooldown starts.
function chainNext(run, s) {
  const c = run.chain, step = ++c.step;
  const st = s[`s${step}`];
  if (step === 1) castSkill(run, { ...st, kind: 'dash', id: s.id, look: s.look });
  else {
    const h = makeArea({ x: run.px + (step === 3 ? run.aimX * 30 : 0), y: run.py + (step === 3 ? run.aimY * 30 : 0), r: st.r, mult: st.mult, freeze: st.freeze || 0, fx: s.look || s.id, duration: 0.2 });
    h.skill = true; run.hits.push(h);
    if (st.wave) { const w = makeArea({ x: run.px, y: run.py, r: st.wave.r, mult: st.wave.mult, fx: 'shout', duration: 0.35 }); w.skill = true; w.knock = 160; run.hits.push(w); }
    if (step === 3) run.addShake?.('medium');
  }
  for (let k = run.hits.length - 1; k >= 0 && !run.hits[k].skill; k--) run.hits[k].skill = true;
  run.attackT = ATTACK_POSE;
  c.win = s.window;
  if (step >= 3) endChain(run);
}
function endChain(run) {
  const c = run.chain;
  run.chain = null;
  const cds = run.pageCd || [run.skillCd], maxes = run.pageCdMax || [run.skillCdMax];
  cds[c.page][c.i] = maxes[c.page][c.i];
}

// An area that starts `at` s from now (after an L5 skill: a vortex, lava, a final blast, a trail patch).
function later(run, a, x, y, at, fx) {
  const h = makeArea({ x, y, r: a.r, mult: a.mult, ticks: a.ticks ?? 1, duration: a.duration ?? 0.35, follow: !!a.follow, freeze: a.freeze ?? 0, fx, delay: at });
  h.knock = a.knock || 0;
  if (fx === 'trail') h.part = 'trail';
  run.hits.push(h);
  return h;
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
