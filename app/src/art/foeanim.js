// Animated monsters (proposal, app/gerak.html; not in the game yet): the anime-kit beasts of art/beasts.js
// with their parts posed, so they walk, wind up, strike, flinch and fall instead of standing as one picture.
// Same shapes and colours as art/beasts.js; the frame is the same (facing right, kit units, body ≈ ±60,
// feet near y = 42). pose: { t, walk (gait phase, rad), move 0..1, wind 0..1 (wind-up), strike 0..1 (the
// blow), hurt 0..1 (just struck), die 0..1 (0 = alive) }.
import { limb, pal, glow, mix } from './anime/kit.js';
import { part, eye, fangs, blade } from './foes.js';
import { ooze } from './beasts.js';

const RIM = { toxic: 'rgba(150,255,110,.8)', ice: 'rgba(150,225,255,.9)', stone: 'rgba(255,160,90,.75)' };
const T = (skin, rim, accent, eyeC = accent) => ({
  skin: pal(skin, { rim: RIM[rim] }), dark: pal(mix(skin, '#0a0612', 0.45), { rim: null }), accent, eye: eyeC,
});
// the same colour sets as art/beasts.js (wolf, tank, slink)
export const FOE_ANIM_COLORS = { wolf: T('#2e2a40', 'ice', '#9fe8ff'), tank: T('#57525e', 'stone', '#ff9a3a'), slink: T('#6a2c88', 'toxic', '#b8ff6a') };

const rot = ([x, y], [cx, cy], a) => { const c = Math.cos(a), s = Math.sin(a); return [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]; };
const add = ([x, y], dx, dy) => [x + dx, y + dy];
const ease = (k) => k * k * (3 - 2 * k);

// A leg from a hip that moves with the body to a foot that swings about it and stays on the ground.
function leg(g, hip0, foot0, body, swing, lift, ground, w1, w2, pl) {
  const hip = body(hip0);
  let foot = rot(add(foot0, hip[0] - hip0[0], 0), hip, swing);
  foot = [foot[0], Math.min(ground - lift, Math.max(hip[1] + 8, foot[1]))];
  part(g, limb(hip, foot, w1, w2), pl, { sd: 2 });
}

// Serigala: a lean wolf; trots with diagonal legs, crouches and bares its teeth, lunges with the jaw wide
export function wolfAnim(g, c, p) {
  const { t = 0, walk = 0, move = 0, wind = 0, strike = 0, hurt = 0, die = 0 } = p;
  const bob = Math.abs(Math.sin(walk)) * 3 * move;
  const lunge = strike * 18 - wind * 7 - hurt * 9;
  const low = wind * 7 - strike * 3 + hurt * 2 + ease(die) * 24 - bob;
  const tilt = -wind * 0.1 + strike * 0.12 - hurt * 0.22 + ease(die) * 0.12;
  const body = (pt) => add(rot(pt, [0, -4], tilt), lunge, low);
  const G = 42, sw = (ph) => Math.sin(walk + ph) * 0.5 * move * (1 - die), up = (ph) => Math.max(0, Math.cos(walk + ph)) * 5 * move;
  const reach = strike * 0.5 - wind * 0.25, splay = ease(die) * 0.9;
  // far legs (darker), then the tail
  leg(g, [-28, 8], [-36, 40], body, sw(Math.PI) - splay, up(Math.PI), G, 9, 6, c.dark);
  leg(g, [18, 8], [14, 40], body, sw(0) + reach + splay, up(0), G, 9, 6, c.dark);
  g.save(); g.translate(lunge, low);
  g.translate(0, -4); g.rotate(tilt); g.translate(0, 4);
  { // the smoky tail sways, drops while winding up
    const a = Math.sin(t * 3) * 0.12 + Math.sin(walk) * 0.18 * move - wind * 0.35 + hurt * 0.3 + ease(die) * 0.4;
    g.save(); g.translate(-50, 0); g.rotate(a); g.translate(50, 0);
    part(g, [[-50, -4], [-70, -20], [-62, -2], [-72, 6], [-54, 6]], c.dark, { sd: 2 });
    g.restore();
  }
  part(g, [[-52, 4], [-46, -14], [-16, -22], [16, -26], [30, -14], [26, 10], [-12, 14], [-44, 14]], c.skin, { sd: 5 });
  const bristle = wind * 6 + strike * 4; // hackles rise
  for (const [x, y, len, a] of [[4, -24, 16, -2.0], [14, -26, 18, -1.7], [24, -22, 14, -1.3]]) part(g, blade(x, y, len + bristle, a, 5), c.dark, { sd: 1, lw: 1.2 });
  { // the head nods with the trot, lowers to stare, snaps forward; the lower jaw opens
    const nod = Math.sin(walk * 2) * 0.05 * move + wind * 0.18 - strike * 0.12 + ease(die) * 0.45;
    const open = Math.min(1, strike * 1.1 + wind * 0.35 + hurt * 0.6);
    g.save(); g.translate(24, -12); g.rotate(nod); g.translate(-24, 12);
    part(g, [[22, -26], [40, -30], [64, -14], [62, -4], [38, -2], [24, -8]], c.skin, { sd: 3 });
    part(g, [[34, -6], [62, -8], [56, open * 9], [36, open * 6]], pal('#100810', { rim: null }), { sd: 1, lw: 1.2 });
    fangs(g, 38, 60, -7, 5, 4);
    if (open > 0.2) fangs(g, 38, 56, open * 6 + 1, 4, 3 + open * 2, false);
    part(g, [[26, -26], [28, -42 + wind * 4], [36, -28]], c.skin, { sd: 1, lw: 1.2 }); // the ear flattens
    if (die < 0.6) eye(g, 42, -18, 3.5, c.eye); else { g.strokeStyle = '#0c0a0f'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(39, -18); g.lineTo(45, -18); g.stroke(); }
    if (wind > 0.3) glow(g, 42, -18, 8, c.eye, wind * 0.8);
    g.restore();
  }
  g.restore();
  // near legs
  leg(g, [-34, 10], [-42, 42], body, sw(0) - splay, up(0), G, 10, 7, c.skin);
  leg(g, [20, 6], [26, 42], body, sw(Math.PI) + reach + splay, up(Math.PI), G, 10, 7, c.skin);
}

// Golem Batu: heavy stone; stomps with a sway, raises its fist high, slams it down, crumbles apart
export function golemAnim(g, c, p) {
  const { t = 0, walk = 0, move = 0, wind = 0, strike = 0, hurt = 0, die = 0 } = p;
  const d = ease(die), step = Math.sin(walk) * move;
  const sway = step * 0.05 - hurt * 0.15 + wind * -0.06 + strike * 0.1;
  const low = Math.abs(Math.cos(walk)) * 3 * move + strike * 5 + d * 18;
  const body = (pt) => add(rot(pt, [0, 30], sway), 0, low);
  const G = 44;
  leg(g, [-22, 20], [-28, 44], body, -Math.max(0, step) * 0.25, Math.max(0, step) * 7, G, 18, 14, c.dark);
  leg(g, [14, 20], [20, 44], body, Math.max(0, -step) * 0.25, Math.max(0, -step) * 7, G, 18, 14, c.dark);
  g.save(); g.translate(0, low); g.translate(0, 30); g.rotate(sway); g.translate(0, -30);
  part(g, [[-52, 4], [-60, 26], [-42, 34], [-36, 10]].map((q) => add(q, -wind * 4, d * 14)), c.dark, { sd: 2 }); // far fist
  g.save(); g.translate(-d * 6, d * 10); g.rotate(-d * 0.15);
  part(g, [[-38, 28], [-44, -18], [-24, -40], [14, -44], [36, -26], [40, 8], [32, 30]], c.skin, { sd: 6 });                  // torso
  const hot = Math.max(0, 0.5 + wind * 0.6 + strike * 0.4 + Math.sin(t * 2) * 0.1) * (1 - d);
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
  for (const l of [[[-24, -20], [-10, -6], [-18, 10], [-6, 24]], [[14, -28], [6, -12], [18, 2]]]) {
    g.beginPath(); l.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.lineWidth = 6; g.strokeStyle = mix(c.accent, '#000000', 0.5); g.globalAlpha = 0.5 * hot; g.stroke();
    g.lineWidth = 2; g.globalAlpha = Math.min(1, hot * 1.4); g.strokeStyle = c.accent; g.stroke();
  }
  g.restore();
  glow(g, -4, -6, 22 + wind * 8, c.accent, 0.5 * hot + wind * 0.3);
  g.restore();
  { // the head block: bobs, and tumbles off when it crumbles
    g.save(); g.translate(d * 18, d * 52); g.rotate(d * 0.9);
    part(g, [[-12, -38], [-8, -60], [16, -64], [26, -44], [12, -36]], c.skin, { sd: 3 });
    if (d < 0.5) eye(g, 14, -50, 4, c.accent, 0);
    g.restore();
  }
  { // the near arm: hangs, swings with the step, rises behind its head, slams down in front
    const sh = [30, -10];
    let a = step * 0.25 - wind * 2.3 + strike * 0.9 - hurt * 0.4 + d * 0.8;
    if (strike > 0) a = -2.3 * (1 - strike) + 0.75 * strike; // from up behind to down in front
    const hand = rot([50, 14], sh, a);
    part(g, limb(sh, hand, 18, 14), c.skin, { sd: 3 });
    const f = [[42, 8], [64, 6], [66, 30], [44, 34]].map((q) => rot(add(q, hand[0] - 50, hand[1] - 14), hand, a * 0.5));
    part(g, f, c.skin, { sd: 3 });
    if (strike > 0.85) glow(g, hand[0] + 10, hand[1] + 14, 30, c.accent, (strike - 0.85) * 5);
  }
  g.restore();
}

// Lendir: a slime; bounces when it moves, flattens to gather itself, springs forward, wobbles when struck,
// melts into a puddle
export function slimeAnim(g, c, p) {
  const { t = 0, walk = 0, move = 0, wind = 0, strike = 0, hurt = 0, die = 0 } = p;
  const d = ease(die), hop = Math.abs(Math.sin(walk)) * move;
  const jig = Math.sin(t * 22) * hurt;
  const sy = (1 + Math.sin(t * 4) * 0.04) * (1 - hop * 0.1 + Math.max(0, 0.15 - Math.abs(Math.sin(walk)) * 0.15) * move) * (1 - wind * 0.22 + strike * 0.12) * (1 - jig * 0.12) * (1 - d * 0.78);
  const sx = (1 + wind * 0.2 + strike * 0.25 + jig * 0.12 + d * 0.6) / Math.max(0.6, sy) ** 0.3;
  g.save();
  g.translate(strike * 16 - wind * 4, -hop * 14);
  g.translate(0, 42); g.scale(sx, sy); g.translate(0, -42);
  if (strike > 0) { g.translate(0, 42); g.transform(1, 0, strike * 0.25, 1, 0, 0); g.translate(0, -42); } // leans into the spring
  g.globalAlpha = 1 - Math.max(0, d - 0.7) / 0.3 * 0.6;
  ooze(g, c);
  g.restore();
  if (d > 0.2) { // what is left of it on the ground
    g.save(); g.globalAlpha = Math.min(0.8, d); g.beginPath(); g.ellipse(0, 42, 40 + d * 20, 7, 0, 0, Math.PI * 2);
    g.fillStyle = mix(c.skin.base, '#000000', 0.2); g.fill(); g.restore();
  }
}

export const FOE_ANIM = { wolf: wolfAnim, tank: golemAnim, slink: slimeAnim };
