// The upright part of the Job Lanjutan skills in 2.5D (spec §48): columns of light, a hammer
// falling from the sky, the blood whirl with its pillars. Driven from render3d/spell3d.js:
//   branchHit3d(sp, h, …)   — every frame for each live hit of a branch skill (true = handled,
//                             the base look's billboard is not added)
//   branchFrame3d(sp, game) — every frame: new casts (buffs, dashes), hero auras, animations
// Purely visual (Math.random is fine here, like spell3d.js); numbers in data/branchfx.js BRANCH_3D.
import * as THREE from 'three';
import { BRANCH_3D as D } from '../data/branchfx.js';
import { SPELL3D as C } from '../data/spell3d.js';
import { S } from './stage.js';

const TAU = Math.PI * 2;
const cols = (...hex) => hex.map((h) => new THREE.Color(h));
const RED = cols(0xff3040, 0xff7a8a, 0xc21f3a, 0xffd6d6), GOLD = cols(0xffe9a8, 0xffd166, 0xffffff, 0xfff3c4);

// ---- building blocks --------------------------------------------------------------------
// animations run before spell3d moves its meshes: fn(e, t, dt) each frame, done() when e ends
function anim(sp, e, fn, done) { if (e) (sp.branchAnims ||= []).push({ e, fn, done }); return e; }
// a column of light standing at (x, y): size [width m, height m]; rises in `grow` s, fades at the end
function column(sp, x, y, size, tint, life, o = {}) {
  const e = sp.add('column', x, y, { ax: 0.5, ay: 1, tint, glow: o.glow ?? 1.5, additive: true, life, delay: o.delay });
  if (!e) return null;
  const [w, hgt] = size, grow = o.grow ?? 0.12, fade = o.fade ?? 0.4;
  e.mesh.scale.set(w, 0.01, 1);
  return anim(sp, e, (e, t) => {
    const up = Math.min(1, e.t / grow), out = Math.min(1, (e.life - e.t) / fade), beat = o.pulse ? 1 + 0.12 * Math.sin(t * o.pulse) : 1;
    e.mesh.scale.set(w * beat * (o.thin ? 0.4 + 0.6 * out : 1), hgt * up, 1);
    e.mesh.material.opacity = out;
    if (o.follow) { e.x = o.follow.x + (o.dx?.(t) ?? 0); e.y = o.follow.y + (o.dy?.(t) ?? 0); }
  });
}
// a soft flat ring of light on the ground, diameter `d` game units
function disc(sp, x, y, d, tint, life, o = {}) {
  const e = sp.add('disc', x, y, { flat: true, tint, glow: o.glow ?? 1.3, additive: true, life, fade: o.fade ?? 0.3 });
  if (!e) return null;
  e.mesh.scale.set(d * S, 1, d * S);
  if (o.spin) e.spin = o.spin;
  if (o.follow) anim(sp, e, (e, t) => { e.x = o.follow.x; e.y = o.follow.y; if (o.beat) { const k = d * S * (1 + 0.08 * Math.sin(t * o.beat)); e.mesh.scale.set(k, 1, k); } });
  return e;
}
// a ring kicked out along the ground (the shock frames), tinted
function ring(sp, x, y, r, tint, glow = 1.4) {
  return sp.add('shock', x, y, { flat: true, m: (r * S) / C.shock.ringR, fps: C.shock.fps, glow, tint });
}
const up = (sp, x, y, n, speed, colors, life, h = 0.4) => sp.burst(x * S, h, y * S, n, speed, colors, life, 2.5, speed * 0.8);
// sparks spiralling up round (x, y): radius r game units
function spiral(sp, x, y, r, n, colors, spin = 3) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, R = r * (0.4 + Math.random() * 0.6) * S;
    sp.spark(x * S + Math.cos(a) * R, 0.2 + Math.random() * 0.6, y * S + Math.sin(a) * R, -Math.sin(a) * spin, 1.5 + Math.random() * 2.5, Math.cos(a) * spin, 0.6 + Math.random() * 0.5, colors[i % colors.length], -0.5);
  }
}
const lit = (sp, L, x, y, follow = null, h = 40) => sp.light(L.color, L.peak, follow ? 1e9 : L.life, L.dist, x, h, y, follow);
const free = (L) => { if (L) { L.follow = null; L.life = 0; } };
// how many to emit this frame for a rate per second
const per = (rate, dt, mul) => Math.floor(rate * mul * dt + Math.random());
// a hit is over when its life runs out or it stopped coming through game.hits (run reset, scene change)
const over = (h, t) => !(h.life > 0) || t - (h.b3dT ?? t) > 0.25;
// a standing billboard `w` metres wide (its picture's own proportions)
function fit(e, w) { if (e) { const fr = e.fr[0]; e.mesh.scale.set(w, (w * fr.h) / fr.w, 1); } return e; }
// end a follower when `gone()` turns true
function until(e, gone) { if (e) e.until = gone; }

// ---- per hit ------------------------------------------------------------------------------
const HIT = {
  rageleap(sp, h, t, mul) { // the leap itself is followed in branchFrame3d; the L5 blast is a red shockwave
    if (h.fx === 'shout' && !sp.seen.has(h)) { sp.seen.add(h); ring(sp, h.x, h.y, h.r * 1.3, 0xff3040); up(sp, h.x, h.y, Math.round(24 * mul), 4, RED, 0.7); }
  },
  bloodrage() {},
  ragnarok(sp, h, t, mul) {
    if (h.delay > 0 || sp.seen.has(h)) return;
    sp.seen.add(h);
    const R = D.ragnarok;
    const w = sp.add('whirl', h.x, h.y, { flat: true, h: C.whirl.h, m: (h.r * 1.2 * S) / 40, fps: C.whirl.fps, loop: true, life: 1e9, glow: R.glow, tint: R.tint });
    if (w) w.spin = -14;
    const inner = sp.add('whirl', h.x, h.y, { flat: true, h: C.whirl.h * 2.2, m: (h.r * 0.7 * S) / 40, fps: C.whirl.fps, loop: true, life: 1e9, glow: R.glow, tint: 0xffd6d6 });
    if (inner) inner.spin = 18;
    for (let i = 0; i < R.pillars; i++) { // pillars of blood-stone bursting round the warrior, one after another
      const a = (i / R.pillars) * TAU;
      fit(sp.add('pillar', h.x + Math.cos(a) * h.r * 0.85, h.y + Math.sin(a) * h.r * 0.85, { ax: 0.5, ay: 1, sched: C.pillar.sched, tint: 0xff5060, glow: 1.3, delay: i * 0.06, flip: i % 2 === 0 }), h.r * 0.6 * S);
    }
    const L = lit(sp, R.light, h.x, h.y, h);
    let ticks = h.ticksLeft, ended = false;
    anim(sp, w || inner, (e, tt, dt) => {
      if (ended) return;
      for (const m of [w, inner]) if (m) { m.x = h.x; m.y = h.y; }
      spiral(sp, h.x, h.y, h.r, per(R.sparks, dt, mul), RED, 4);
      if (h.ticksLeft !== ticks) { ticks = h.ticksLeft; ring(sp, h.x, h.y, h.r, 0xff3040, 1.2); }
      if (!over(h, tt)) return;
      ended = true;
      for (const m of [w, inner]) if (m) m.life = 0; // the storm bursts
      free(L);
      sp.boom(h.x, h.y, h.r * 0.9, mul);
      ring(sp, h.x, h.y, h.r * 1.6, 0xff3040, 1.6);
      column(sp, h.x, h.y, [3.2, 9], 0xff3040, 0.55, { grow: 0.06, fade: 0.4, thin: true });
      up(sp, h.x, h.y, Math.round(70 * mul), 6, RED, 1);
    });
  },
  holyguard(sp, h, t, mul) { // L5: a wave of holy light
    if (h.fx === 'shout' && !sp.seen.has(h)) { sp.seen.add(h); ring(sp, h.x, h.y, h.r * 1.3, 0xffd166); up(sp, h.x, h.y, Math.round(24 * mul), 4, GOLD, 0.7); }
  },
  judgment(sp, h, t, mul) {
    if (h.delay > 0 || sp.seen.has(h)) return;
    sp.seen.add(h);
    const J = D.judgment;
    const e = sp.add('spear', h.x, h.y, { ax: 1, ay: 0.5, fps: C.spear.fps, loop: true, life: J.drop, glow: 1.8, tint: 0xffe08a });
    const land = () => { // the hammer of light strikes
      column(sp, h.x, h.y, J.column, 0xffe08a, J.columnLife, { grow: 0.05, fade: 0.5, thin: true });
      ring(sp, h.x, h.y, h.r * 1.5, 0xffd166, 1.6);
      ring(sp, h.x, h.y, h.r * 0.9, 0xffffff, 1.2);
      disc(sp, h.x, h.y, h.r * 2.4, 0xffd166, 1.4, { fade: 1 });
      up(sp, h.x, h.y, Math.round(J.sparks * mul), 5.5, GOLD, 0.9);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; sp.dust(h.x + Math.cos(a) * h.r * 0.7, h.y + Math.sin(a) * h.r * 0.6, mul); }
      lit(sp, J.light, h.x, h.y);
    };
    if (!e) { land(); return; }
    const fr = e.fr[0];
    e.mesh.scale.set(J.size, (J.size * fr.h) / fr.w, 1);
    e.drop = { from: J.height, tilt: 0 }; e.roll = -Math.PI / 2;
    e.then = land;
  },
  sanctuary(sp, h, t, mul) {
    if (h.delay > 0 || sp.seen.has(h)) return;
    sp.seen.add(h);
    const Z = D.sanctuary, n = 6, parts = [];
    parts.push(column(sp, h.x, h.y, Z.center, 0xffe9a8, 1e9, { follow: h, pulse: 5, grow: 0.25 }));
    for (let i = 0; i < n; i++) { // columns standing on the rim, wheeling round (as the ground circle's lights)
      const q = (i / n) * TAU;
      parts.push(column(sp, h.x, h.y, Z.column, 0xffd166, 1e9, { follow: h, grow: 0.3, delay: i * 0.05, pulse: 7, dx: (tt) => Math.cos(q + tt * 0.4) * h.r, dy: (tt) => Math.sin(q + tt * 0.4) * h.r * 0.8 }));
    }
    parts.push(disc(sp, h.x, h.y, h.r * 2.1, 0xffd166, 1e9, { follow: h, spin: 0.5, beat: 4 }));
    const L = lit(sp, Z.light, h.x, h.y, h);
    let ticks = h.ticksLeft, ended = false;
    anim(sp, parts.find(Boolean), (e, tt, dt) => {
      if (ended) return;
      spiral(sp, h.x, h.y, h.r, per(Z.sparks, dt, mul), GOLD, 0.6);
      if (h.ticksLeft !== ticks) { ticks = h.ticksLeft; ring(sp, h.x, h.y, h.r, 0xffd166, 1.3); }
      if (!over(h, tt)) return;
      ended = true;
      for (const p of parts) if (p) p.life = Math.min(p.life, p.t + 0.4);
      free(L);
      ring(sp, h.x, h.y, h.r * 1.4, 0xffffff, 1.6);
      up(sp, h.x, h.y, Math.round(50 * mul), 5, GOLD, 1.1);
    });
  },
};
export const BRANCH_SIDS = new Set(Object.keys(HIT));
export function branchHit3d(sp, h, t, mul, yaw) { h.b3dT = t; HIT[h.sid](sp, h, t, mul, yaw); return true; }

// ---- casts with no hit of their own, the hero under a buff ------------------------------------
const CAST = {
  bloodrage(sp, game, mul) {
    const B = D.bloodrage, x = game.px, y = game.py;
    ring(sp, x, y, B.ring, 0xff3040, 1.6);
    column(sp, x, y, [2.4, 6], 0xff3040, 0.6, { grow: 0.08, thin: true });
    up(sp, x, y, Math.round(B.sparks * mul), 5, RED, 0.9);
    lit(sp, B.light, x, y);
    until(disc(sp, x, y, 110, 0xff3040, 1e9, { follow: { get x() { return game.px; }, get y() { return game.py + 8; } }, beat: 9, spin: -2 }), () => !(game.buffT > 0 && game.buffSid === 'bloodrage'));
  },
  holyguard(sp, game, mul) {
    const G = D.holyguard, x = game.px, y = game.py;
    column(sp, x, y, G.column, 0xffe9a8, G.life, { grow: 0.1, fade: 0.5 });
    ring(sp, x, y, G.ring, 0xffd166, 1.5);
    up(sp, x, y, Math.round(G.sparks * mul), 4, GOLD, 1);
    lit(sp, G.light, x, y);
    until(disc(sp, x, y, 90, 0xffd166, 1e9, { follow: { get x() { return game.px; }, get y() { return game.py + 6; } }, beat: 4, spin: 1.5 }), () => !(game.buffT > 0 && game.buffSid === 'holyguard'));
  },
  rageleap(sp, game, mul) {
    const x = game.dashFromX ?? game.px, y = game.dashFromY ?? game.py;
    sp.dust(x, y, mul); up(sp, x, y, Math.round(D.rageleap.sparks * mul), 4, RED, 0.6);
    sp.leap = true;
  },
};

export function branchFrame3d(sp, game, t, dt, mul) {
  const cp = game.castPose;
  if (cp !== sp.bPose) { // a new cast (spell3d.js keeps its own record of the same thing)
    if (cp && sp.bPose !== undefined) CAST[cp.id]?.(sp, game, mul);
    sp.bPose = cp;
  }
  if (sp.leap) { // Lompatan Amuk: red sparks in the air, the ground caves in where it lands
    if (game.dodgeT > 0) spiral(sp, game.px, game.py, 14, per(80, dt, mul), RED, 1);
    else {
      sp.leap = false;
      ring(sp, game.px, game.py, 80, 0xff3040, 1.5);
      for (let i = 0; i < 4; i++) sp.dust(game.px + (i - 1.5) * 14, game.py + 4, mul);
      up(sp, game.px, game.py, Math.round(30 * mul), 4.5, RED, 0.7);
    }
  }
  if (game.buffT > 0) { // embers / motes rising off the hero
    if (game.buffSid === 'bloodrage') spiral(sp, game.px, game.py, 22, per(26, dt, mul), RED, 0.6);
    else if (game.buffSid === 'holyguard') spiral(sp, game.px, game.py, 26, per(18, dt, mul), GOLD, 0.4);
  }
  const A = sp.branchAnims;
  if (!A) return;
  for (let i = A.length - 1; i >= 0; i--) {
    const a = A[i], e = a.e;
    if (!e.mesh.parent || e.t >= e.life) { A.splice(i, 1); a.done?.(); continue; }
    if (e.until?.()) e.life = Math.min(e.life, e.t + 0.3);
    a.fn(e, t, dt);
  }
}
