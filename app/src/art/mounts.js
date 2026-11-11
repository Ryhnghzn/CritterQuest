// Majestic mounts (concept, app/pet.html; spec §35): the hero's steeds must read as noble
// companions, never as monsters. Rules, the opposite of the monster art:
// - bigger than a monster (scale ±1.4 of the old concept), heads up, long graceful gait;
// - a warm white / gold rim light instead of the biome rims, no comic hatching;
// - calm eyes (iris + highlight), never glowing slits;
// - tack and armour that grow richer with rarity: 0 steel face plate + cloth, 2 gold trim +
//   collar, 3 plume + chest plate + crest, 4 pennant + light motes, 5 crown light + more motes;
// - legendary and mythic ones fly.
// Same conventions as art/companions.js: facing right, feet on y = 0, back() under the rider,
// front() over it, saddle = the rider's hips; drawn at `scale` by drawMajesticRidden.
import { kit, skinOf } from './companions.js';
import { glow, mix, dim, INK, TAU } from './hero/cel.js';
import { drawMountView, hasViews } from './mountviews.js';
import { R, GOLD, GOLD_HEX, STEEL, calmEye, plume, drape, sunCrest, pennant, regalSaddle, reins } from './mounttack.js';

const { E, piece, bone, leg, featherWing, batWing, flames, swing, hover, flap, star5 } = kit;

// (palettes & tack: art/mounttack.js)

// Behind the mount: a soft light from above (rarity 3+), rising motes (4+), a glow on the
// ground and more motes (5). r: about half the mount's length, in mount units.
export function drawMajesty(g, m, pose, r = 30) {
  const tier = m.rarity, c = skinOf(m, pose), light = c.light || 'rgba(255,226,150,.9)', t = pose.t;
  if (tier < 3) return;
  g.save(); g.globalCompositeOperation = 'lighter';
  const top = -r * 4.2, gr = g.createLinearGradient(0, top, 0, 0);
  gr.addColorStop(0, 'rgba(255,240,200,0)'); gr.addColorStop(0.7, 'rgba(255,236,190,.10)'); gr.addColorStop(1, 'rgba(255,236,190,.16)');
  g.fillStyle = gr; g.beginPath(); g.moveTo(-r * 0.5, top); g.lineTo(r * 0.5, top); g.lineTo(r * 1.2, 0); g.lineTo(-r * 1.2, 0); g.closePath(); g.fill();
  if (tier >= 5) {
    const gg = g.createRadialGradient(0, 0, 0, 0, 0, r * 1.5);
    gg.addColorStop(0, light.replace(/[\d.]+\)$/, '.35)')); gg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gg; g.beginPath(); g.ellipse(0, 0, r * 1.5, r * 0.35, 0, 0, TAU); g.fill();
  }
  g.restore();
  if (tier >= 4) {
    const n = tier >= 5 ? 16 : 9;
    for (let i = 0; i < n; i++) {
      const k = (t * 0.45 + i / n) % 1, x = Math.sin(i * 2.4) * r * 1.1 - (pose.m ? k * r * 0.8 : 0), y = -k * r * 2.6 - 4;
      glow(g, x, y, 3.2, light, (1 - k) * Math.min(1, k * 4) * 0.9);
      if (i % 3 === 0) star5(g, x, y, 1.1 * (1 - k) + 0.3, `rgba(255,250,230,${(1 - k) * 0.9})`);
    }
  }
}

// The summon (spec §35.1): a gold rune ring opens on the ground, light pours down and the
// mount rises out of it. k: 0..1 over the summon; draw the mount with drawSummonMount.
// small progress bar above the head while the mount is being called (spec §35.1); k 0 → 1
export function drawSummonBar(g, k) {
  const w = 30, h = 4, y = -52;
  g.save();
  g.fillStyle = 'rgba(20,16,28,.85)'; g.fillRect(-w / 2 - 1, y - 1, w + 2, h + 2);
  g.fillStyle = '#ffd166'; g.fillRect(-w / 2, y, w * Math.max(0, Math.min(1, k)), h);
  g.restore();
}

export function drawSummonRing(g, k, t, r = 34) {
  const open = Math.min(1, k * 2.2), fade = k > 0.85 ? (1 - k) / 0.15 : 1, rr = r * (0.4 + open * 0.8);
  g.save(); g.globalCompositeOperation = 'lighter';
  g.globalAlpha = fade;
  g.lineWidth = 1.6; g.strokeStyle = 'rgba(255,214,120,.95)';
  g.beginPath(); g.ellipse(0, 0, rr, rr * 0.28, 0, 0, TAU); g.stroke();
  g.lineWidth = 0.9; g.beginPath(); g.ellipse(0, 0, rr * 0.78, rr * 0.22, 0, 0, TAU); g.stroke();
  for (let i = 0; i < 12; i++) { // rune ticks turning
    const a = i * TAU / 12 + t * 1.4, x = Math.cos(a) * rr * 0.89, y = Math.sin(a) * rr * 0.25;
    g.fillStyle = 'rgba(255,236,170,.95)'; g.fillRect(x - 1, y - 1.6, 2, 3.2);
  }
  const beam = Math.sin(Math.min(1, k * 1.4) * Math.PI) * 0.9, gr = g.createLinearGradient(0, -r * 5, 0, 0);
  gr.addColorStop(0, 'rgba(255,240,200,0)'); gr.addColorStop(1, `rgba(255,232,170,${0.5 * beam})`);
  g.fillStyle = gr; g.beginPath(); g.moveTo(-rr * 0.5, -r * 5); g.lineTo(rr * 0.5, -r * 5); g.lineTo(rr, 0); g.lineTo(-rr, 0); g.closePath(); g.fill();
  g.restore();
  for (let i = 0; i < 10; i++) { const q = (k * 1.6 + i / 10) % 1; glow(g, Math.cos(i * 2.1) * rr * 0.8, -q * r * 2.4, 3, 'rgba(255,226,150,.95)', (1 - q) * fade * 0.9); }
}

// ─── steeds: horse & pegasus ──────────────────────────────────────────────
// a noble horse: arched neck, head carried high, flowing mane & tail, feathered fetlocks.
// opt: { tier, fly, wing }
function steed(g, p, c, opt = {}) {
  const tier = opt.tier || 0, fly = !!opt.fly;
  const b = fly ? hover(p, 3) - 8 : p.m ? -Math.abs(Math.sin(p.w)) * 1.4 * p.m : Math.sin(p.t * 2) * 0.35;
  const coat = R(c.coat, c.rim), far = dim(coat), mane = R(c.mane, c.rim), feather = R(c.feather || mix(c.coat, '#ffffff', 0.5), c.rim);
  const fl = fly ? flap(p, 3.6) : 0;
  const legSwing = (ph) => (fly ? Math.sin(p.t * 2 + ph) * 0.15 - 0.5 : swing(p, ph, 0.55));
  const hoofAt = (f) => {
    piece(g, [[f.x - 2.6, f.y - 2], [f.x - 3, f.y - 5], [f.x + 3, f.y - 5], [f.x + 2.8, f.y - 2]], feather, 0.5);
    piece(g, [[f.x - 2.6, f.y], [f.x - 2.2, f.y - 2.6], [f.x + 2.4, f.y - 2.6], [f.x + 3, f.y]], tier >= 4 ? GOLD : R('#2a2018'), 0.5);
    if (tier >= 4 && p.m) glow(g, f.x, f.y - 1, 6, c.light || 'rgba(255,226,150,.9)', 0.5);
  };
  if (opt.wing) featherWing(g, 0, -40 + b, 40, fl, dim(R(c.wing, c.rim)), dim(R(c.tip, c.rim)), true);
  for (const [hx, ph] of [[-13, Math.PI], [12, 0]]) hoofAt(leg(g, hx, -22 + b, 22, legSwing(ph + 1.2), 3.2, far, fly ? 0.9 : 0.35));
  // tail: high carriage, three flowing strands
  for (let i = 0; i < 3; i++) {
    const w = Math.sin(p.t * 3 + i * 0.7) * 2 + (p.m ? -2 : 0);
    piece(g, [[-20, -33 + b + i], [-30 + w * 0.5, -32 + b + i * 2], [-36 + w, -22 + b + i * 3], [-34 + w, -8 + b + i * 2], [-28 + w * 0.5, -14 + b + i], [-24, -26 + b + i]], i === 1 ? mane : dim(mane), 1);
  }
  piece(g, E(0, -29 + b, 21, 9, 20), coat, 3);
  // neck & head: the crest arches, the head is carried high (squeezed toward the withers so
  // the ears end just above the rider's head)
  g.save(); g.translate(14, -25 + b); g.scale(0.92, 0.82); g.translate(-14, 30 - b);
  piece(g, [[9, -34 + b], [14, -50 + b], [21, -60 + b], [28, -59 + b], [25, -44 + b], [21, -26 + b], [12, -24 + b]], coat, 2.2);
  piece(g, [[22, -62 + b], [27, -64 + b], [38, -52 + b], [38.5, -47 + b], [34.5, -46 + b], [25, -53 + b]], coat, 1.4);
  piece(g, [[24, -62 + b], [24.5, -68 + b], [27.5, -62.5 + b]], coat, 0.6);
  g.beginPath(); g.arc(36, -48.5 + b, 0.7, 0, TAU); g.fillStyle = INK; g.fill(); // nostril
  if (c.horn) { piece(g, [[29, -62 + b], [36, -77 + b], [31.5, -61 + b]], GOLD, 0.5); glow(g, 34, -70 + b, 7, 'rgba(255,240,200,.8)', 0.45); }
  // mane: long strands along the crest, flowing back
  for (let i = 0; i < 5; i++) {
    const k = i / 4, x = 22 - k * 11, y = -60 + k * 24, w = Math.sin(p.t * 3.2 + i) * 1.6 - (p.m ? 2.5 : 0);
    piece(g, [[x + 1, y + b - 1], [x - 5 + w, y + 3 + b], [x - 7 + w, y + 10 + b], [x - 3, y + 7 + b], [x + 1.5, y + 6 + b]], mane, 0.9);
  }
  if (c.glowMane) for (let i = 0; i < 4; i++) glow(g, 18 - i * 3, -52 + i * 6 + b, 6, c.light, 0.35 + Math.sin(p.t * 3 + i) * 0.15);
  calmEye(g, 29.5, -56 + b, 1.5, c.iris || '#2a1a10', c.glowMane ? c.light : undefined);
  // bridle & face plate
  g.lineWidth = 0.9; g.strokeStyle = tier >= 2 ? GOLD_HEX : '#3a2010';
  g.beginPath(); g.moveTo(25, -60 + b); g.lineTo(34, -49 + b); g.moveTo(27, -54 + b); g.lineTo(37, -50 + b); g.stroke();
  piece(g, [[26, -62 + b], [31, -61 + b], [37.5, -51 + b], [34, -50 + b]], tier >= 3 ? GOLD : STEEL, 0.7);
  if (tier >= 2) piece(g, E(30, -58 + b, 1.2, 1.2, 8), R('#ff5d6d', 'rose'), 0.3);
  if (tier >= 3) plume(g, 25.5, -63 + b, p.t, c.plume || '#f4f0e6', 12);
  // neck armour plates (crinet) from rarity 2
  if (tier >= 2) for (let i = 0; i < 3; i++) piece(g, [[22 - i * 3.5, -56 + i * 7 + b], [26 - i * 3, -54 + i * 7 + b], [24 - i * 3, -48 + i * 7 + b], [19.5 - i * 3.5, -50 + i * 7 + b]], tier >= 4 ? GOLD : STEEL, 0.6);
  g.restore();
  for (const [hx, ph] of [[-12, 0], [13, Math.PI]]) hoofAt(leg(g, hx, -22 + b, 22, legSwing(ph), 3.5, coat, fly ? 0.9 : 0.35));
  // caparison over the flank, chest plate
  drape(g, [[-21, -31 + b], [-14, -36 + b], [0, -37.5 + b], [12, -35 + b], [17, -30 + b]], -16 + b, c.cloth, tier >= 2 ? GOLD_HEX : '#e8d8b0', p.t,
    tier >= 3 ? { x: -6, y: -25 + b } : null);
  piece(g, [[13, -34 + b], [21, -33 + b], [23, -24 + b], [17, -19 + b], [12, -24 + b]], tier >= 3 ? GOLD : STEEL, 1);
  reins(g, 34.2, -39.8 + b, 6, -36 + b); // the mouth, after the neck squeeze
  return b;
}

// ─── big cats: lion & tiger ───────────────────────────────────────────────
function bigcat(g, p, c, opt) {
  const tier = opt.tier, lion = opt.kind === 'lion';
  const b = p.m ? -Math.abs(Math.sin(p.w * 1.1)) * 1.6 * p.m : Math.sin(p.t * 2) * 0.4;
  const fur = R(c.fur, c.rim), far = dim(fur), paw = (f, Pp) => piece(g, E(f.x + 1.2, f.y - 1.8, 3.6, 2.2, 10), Pp, 0.5);
  for (const [hx, ph] of [[-13, Math.PI], [12, 0]]) paw(leg(g, hx, -20 + b, 20, swing(p, ph + 1, 0.6), 4.2, far), far);
  // tail curling up, a tuft (lion) or rings (tiger)
  const tw = Math.sin(p.t * 2.2) * 3;
  piece(g, [[-19, -28 + b], [-28, -30 + b], [-36, -36 + b + tw * 0.4], [-40, -44 + b + tw], [-37, -45 + b + tw], [-33, -37 + b], [-26, -26 + b]], fur, 1);
  if (lion) piece(g, E(-39, -46 + b + tw, 3.4, 3.8, 10, 0.4), R(c.mane, c.rim), 0.8);
  else for (let i = 0; i < 3; i++) piece(g, E(-29 - i * 4, -32 - i * 4 + b + tw * i * 0.3, 1.4, 2.4, 6, 0.6), R(c.stripe), 0.2);
  piece(g, E(0, -27 + b, 21, 9.5, 20), fur, 3.2);
  if (!lion) for (let i = 0; i < 5; i++) {
    const x = -14 + i * 6.5;
    piece(g, [[x, -36 + b], [x + 2.4, -36 + b], [x + 0.6, -27 + b], [x - 0.4, -30 + b]], R(c.stripe), 0.2);
  }
  // shoulders & chest rise to the head
  piece(g, [[8, -35 + b], [15, -39 + b], [22, -37 + b], [24, -24 + b], [16, -18 + b], [8, -20 + b]], fur, 2);
  const hx = 25, hy = -37 + b;
  if (lion) { // the mane: three layers of locks around the head
    for (const [rr, col, n] of [[15, dim(R(c.mane, c.rim)), 13], [12.5, R(c.mane, c.rim), 12]]) {
      const pts = [];
      for (let i = 0; i < n * 2; i++) {
        const a = (i / (n * 2)) * TAU + Math.sin(p.t * 1.5) * 0.04, q = i % 2 ? rr : rr * 0.74, wv = i % 2 ? Math.sin(p.t * 3 + i) * 0.8 : 0;
        pts.push([hx - 2 + Math.cos(a) * (q + wv), hy + 1 + Math.sin(a) * (q + wv) * 1.05]);
      }
      piece(g, pts, col, 2);
    }
  } else { // the tiger's cheek ruff
    piece(g, [[hx - 8, hy - 6], [hx - 11, hy + 1], [hx - 8, hy + 8], [hx - 3, hy + 6], [hx, hy + 9], [hx + 2, hy + 3]], R(c.ruff || '#f4f0ea', c.rim), 1);
  }
  // head & muzzle
  piece(g, [[hx - 7, hy - 6], [hx - 2, hy - 9], [hx + 6, hy - 8], [hx + 11, hy - 2], [hx + 12, hy + 3], [hx + 7, hy + 7], [hx - 3, hy + 6], [hx - 7, hy + 1]], fur, 1.6);
  piece(g, [[hx + 5, hy - 1], [hx + 12, hy + 0.5], [hx + 12, hy + 4], [hx + 7, hy + 6.5], [hx + 3, hy + 4]], R(c.muzzle || mix(c.fur, '#fff6e6', 0.6), c.rim), 0.8);
  piece(g, [[hx + 10, hy - 0.4], [hx + 13, hy + 0.4], [hx + 11.6, hy + 2.4]], R('#3a2420'), 0.3);
  for (const ex of [-4, 1.5]) piece(g, [[hx + ex, hy - 7], [hx + ex + 1.6, hy - 12], [hx + ex + 4, hy - 7.5]], fur, 0.5);
  if (!lion) for (const [sx, sy] of [[-3, -7], [0, -8], [3, -7.5]]) { g.lineWidth = 1; g.strokeStyle = c.stripe; g.beginPath(); g.moveTo(hx + sx, hy + sy); g.lineTo(hx + sx + 0.6, hy + sy + 3); g.stroke(); }
  calmEye(g, hx + 5, hy - 3, 1.5, c.iris || '#5a3a10', c.soft);
  // a crown band on the brow
  piece(g, [[hx - 4, hy - 7.5], [hx + 7, hy - 6.5], [hx + 6.5, hy - 4.8], [hx - 4.4, hy - 5.6]], tier >= 3 ? GOLD : STEEL, 0.5);
  if (tier >= 3) { piece(g, [[hx + 1, hy - 7.5], [hx + 2.5, hy - 11], [hx + 4, hy - 7.3]], GOLD, 0.3); plume(g, hx - 3, hy - 8, p.t, c.plume || '#c8263a', 11); }
  for (const [lx, ph] of [[-12, 0], [13, Math.PI]]) paw(leg(g, lx, -20 + b, 20, swing(p, ph, 0.6), 4.6, fur), fur);
  // pauldron + cloth
  drape(g, [[-20, -30 + b], [-12, -35.5 + b], [2, -36.5 + b], [12, -34 + b]], -17 + b, c.cloth, tier >= 2 ? GOLD_HEX : '#e8d8b0', p.t, tier >= 3 ? { x: -5, y: -25 + b } : null);
  piece(g, [[11, -38 + b], [20, -37 + b], [22, -29 + b], [16, -25 + b], [10, -29 + b]], tier >= 3 ? GOLD : STEEL, 1);
  g.lineWidth = 0.8; g.strokeStyle = GOLD_HEX; g.beginPath(); g.moveTo(12, -31 + b); g.lineTo(20, -31 + b); g.stroke();
  return b;
}

// ─── wolf ──────────────────────────────────────────────────────────────────
function direwolf(g, p, c, tier) {
  const b = p.m ? -Math.abs(Math.sin(p.w * 1.2)) * 1.8 * p.m : Math.sin(p.t * 2) * 0.4;
  const fur = R(c.fur, c.rim), far = dim(fur), ruff = R(c.ruff || mix(c.fur, '#ffffff', 0.35), c.rim);
  const foot = (f, Pp) => piece(g, E(f.x + 1, f.y - 1.6, 3, 1.8, 8), Pp, 0.4);
  for (const [hx, ph] of [[-12, Math.PI], [11, 0]]) foot(leg(g, hx, -19 + b, 19, swing(p, ph + 1, 0.65), 3.6, far), far);
  // a full, raised tail
  const tw = Math.sin(p.t * 3) * 2;
  piece(g, [[-17, -28 + b], [-26, -34 + b + tw * 0.5], [-36, -36 + b + tw], [-40, -32 + b + tw], [-34, -26 + b + tw * 0.5], [-24, -22 + b], [-18, -21 + b]], fur, 1.6);
  piece(g, [[-36, -36 + b + tw], [-41, -33 + b + tw], [-37, -31 + b + tw]], ruff, 0.5);
  piece(g, E(-1, -26 + b, 19, 8.5, 18), fur, 3);
  // the ruff: a collar of locks around the neck
  const pts = [];
  for (let i = 0; i < 18; i++) { const a = -1.9 + (i / 17) * 3.6, q = i % 2 ? 12 : 9; pts.push([12 + Math.cos(a) * q * 0.8, -31 + b + Math.sin(a) * q]); }
  piece(g, [[6, -38 + b], ...pts, [6, -18 + b]], ruff, 2);
  // head held high
  piece(g, [[14, -42 + b], [20, -46 + b], [31, -41 + b], [36, -37 + b], [34, -34 + b], [24, -31 + b], [15, -33 + b]], fur, 1.4);
  piece(g, [[33, -37 + b], [36.5, -37 + b], [35, -34.5 + b]], R('#1a2030'), 0.3);
  for (const ex of [16, 20]) piece(g, [[ex, -44 + b], [ex + 1.2, -52 + b], [ex + 4, -45 + b]], fur, 0.6);
  calmEye(g, 25.5, -40.5 + b, 1.4, c.iris || '#3a5a8a', c.soft);
  // face plate & collar
  piece(g, [[18, -46 + b], [24, -45.5 + b], [33, -39.5 + b], [29, -38 + b], [19, -42 + b]], tier >= 3 ? GOLD : STEEL, 0.6);
  piece(g, [[8, -37 + b], [14, -38 + b], [18, -26 + b], [12, -22 + b], [7, -26 + b]], tier >= 2 ? GOLD : STEEL, 0.8);
  for (const [hx, ph] of [[-11, 0], [12, Math.PI]]) foot(leg(g, hx, -19 + b, 19, swing(p, ph, 0.65), 3.8, fur), fur);
  drape(g, [[-18, -28 + b], [-10, -33.5 + b], [3, -34 + b], [9, -31 + b]], -17 + b, c.cloth, tier >= 2 ? GOLD_HEX : '#e8d8b0', p.t);
  return b;
}

// ─── stag ──────────────────────────────────────────────────────────────────
// a branch of the antler; glows at the tips
function antler(g, x, y, a, len, depth, col, tip, t) {
  const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
  bone(g, x, y, ex, ey, 1.2 + depth * 0.5, 1.1 + depth * 0.45, 0.8 + depth * 0.35, col);
  if (depth <= 0) { glow(g, ex, ey, 4.5, tip, 0.55 + Math.sin(t * 3 + x) * 0.25); return; }
  antler(g, ex, ey, a - 0.42, len * 0.72, depth - 1, col, tip, t);
  antler(g, ex, ey, a + 0.38, len * 0.62, depth - 1, col, tip, t);
}
function stag(g, p, c, tier) {
  const b = p.m ? -Math.abs(Math.sin(p.w)) * 1.4 * p.m : Math.sin(p.t * 2) * 0.35;
  const coat = R(c.coat, c.rim), far = dim(coat), chest = R(c.chest || '#f6f0e4', c.rim);
  const hoof = (f) => piece(g, [[f.x - 1.8, f.y], [f.x - 1.4, f.y - 2.4], [f.x + 1.8, f.y - 2.4], [f.x + 2.2, f.y]], tier >= 2 ? GOLD : R('#2a2018'), 0.4);
  for (const [hx, ph] of [[-12, Math.PI], [11, 0]]) hoof(leg(g, hx, -24 + b, 24, swing(p, ph + 1.2, 0.5), 2.6, far, 0.45));
  piece(g, [[-18, -32 + b], [-23, -36 + b + Math.sin(p.t * 4) * 0.8], [-22, -30 + b]], chest, 0.5);
  piece(g, E(0, -31 + b, 18.5, 8, 18), coat, 2.8);
  for (const [sx, sy] of [[-10, -34], [-4, -36], [2, -35], [-7, -30], [-1, -31]]) piece(g, E(sx, sy + b, 1.4, 1, 6), R('#fff8ea'), 0.1);
  g.save(); g.translate(14, -27 + b); g.scale(0.94, 0.84); g.translate(-14, 31 - b);
  piece(g, [[9, -36 + b], [13, -50 + b], [18, -58 + b], [23, -57 + b], [21, -44 + b], [18, -27 + b], [10, -26 + b]], coat, 2);
  // chest ruff
  piece(g, [[13, -46 + b], [20, -44 + b], [21, -30 + b], [17, -25 + b], [13, -30 + b], [15, -36 + b]], chest, 1);
  // head
  piece(g, [[17, -60 + b], [22, -62 + b], [31, -53 + b], [31, -50 + b], [28, -49.5 + b], [19, -55 + b]], coat, 1.2);
  piece(g, [[16, -59 + b], [11, -63 + b], [17, -61.5 + b]], coat, 0.5);
  antler(g, 20, -61 + b, -1.75, 9, 2, R(c.antler, 'holy'), c.light, p.t);
  antler(g, 22, -61 + b, -1.35, 8, 2, R(c.antler, 'holy'), c.light, p.t + 1);
  if (tier >= 2) for (const [rx, ry] of [[19.6, -64.5], [22.4, -64.2]]) piece(g, E(rx, ry + b, 1.4, 0.9, 8), GOLD, 0.2);
  calmEye(g, 24, -57 + b, 1.4, c.iris || '#2a1a10', c.light);
  g.lineWidth = 0.9; g.strokeStyle = tier >= 2 ? GOLD_HEX : '#3a2010';
  g.beginPath(); g.moveTo(21, -60 + b); g.lineTo(29, -51 + b); g.stroke();
  g.restore();
  for (const [hx, ph] of [[-11, 0], [12, Math.PI]]) hoof(leg(g, hx, -24 + b, 24, swing(p, ph, 0.5), 2.8, coat, 0.45));
  drape(g, [[-17, -33 + b], [-9, -38 + b], [4, -38.5 + b], [12, -35 + b]], -21 + b, c.cloth, tier >= 2 ? GOLD_HEX : '#e8d8b0', p.t);
  // leaves of light drifting off when it walks
  for (let i = 0; i < 5; i++) { const k = (p.t * 0.6 + i / 5) % 1; glow(g, -16 - k * 26, -30 - Math.sin(k * 5 + i) * 6 + b, 3, c.light, (1 - k) * (0.3 + p.m * 0.5)); }
  reins(g, 28.4, -42.4 + b, 6, -40 + b);
  return b;
}

// ─── griffin ───────────────────────────────────────────────────────────────
function griffin(g, p, c, tier) {
  const b = hover(p) - 8, fl = flap(p, 4.6);
  const fur = R(c.fur, c.rim), feather = R(c.head, c.rim), wingP = R(c.wing, c.rim), tip = R(c.tip, c.rim);
  featherWing(g, 2, -38 + b, 40, fl, dim(wingP), dim(tip), true);
  piece(g, [[-20, -32 + b], [-32, -36 + b + Math.sin(p.t * 3) * 2], [-38, -34 + b], [-28, -27 + b]], fur, 1);
  piece(g, E(-38, -35 + b, 3, 3.8, 8), R(c.head, c.rim), 0.8);
  for (const hx of [-12, 8]) bone(g, hx, -26 + b, hx - 6, -15 + b, 3.6, 3.6, 2.8, dim(fur));
  piece(g, E(-2, -31 + b, 21, 9.5, 18), fur, 3);
  // feathered chest & neck, a crest of long feathers
  piece(g, [[8, -38 + b], [14, -48 + b], [22, -50 + b], [27, -43 + b], [23, -29 + b], [12, -23 + b]], feather, 2);
  for (let i = 0; i < 4; i++) piece(g, [[19 - i * 2, -50 + b + i * 1.4], [10 - i * 2.5, -56 + b + i * 2.2 + Math.sin(p.t * 3 + i)], [15 - i * 2, -47 + b + i * 1.6]], feather, 0.5);
  piece(g, [[22, -50 + b], [31, -48 + b], [34, -43 + b], [30, -41 + b], [25, -42 + b]], feather, 1);
  piece(g, [[30, -48 + b], [38, -45 + b], [38.5, -40.5 + b], [35.5, -42 + b], [31, -43 + b]], GOLD, 0.8);
  calmEye(g, 27, -46 + b, 1.5, c.iris || '#6a3a08', c.soft);
  // gold chest plate with the crest, a helm ridge
  piece(g, [[13, -40 + b], [22, -39 + b], [24, -29 + b], [17, -23 + b], [12, -29 + b]], GOLD, 1);
  sunCrest(g, 18, -32 + b, 2.2, p.t);
  piece(g, [[21, -51.5 + b], [30, -49.5 + b], [29, -47.5 + b], [21, -49 + b]], GOLD, 0.3);
  for (const hx of [-14, 10]) { bone(g, hx, -26 + b, hx - 8, -17 + b, 3.8, 3.8, 3, fur); kit.claws(g, { x: hx - 10, y: -16 + b }, '#3a2a1a'); }
  drape(g, [[-18, -34 + b], [-10, -38.5 + b], [4, -39 + b], [10, -36 + b]], -21 + b, c.cloth, GOLD_HEX, p.t, { x: -4, y: -28 + b, r: 2.6 });
  featherWing(g, -1, -39 + b, 44, fl, wingP, tip);
  return b;
}

// ─── dragon ────────────────────────────────────────────────────────────────
function dragon(g, p, c) {
  const b = hover(p, 4) - 10, fl = flap(p, 3);
  const sc = R(c.scale, c.rim), belly = R(c.belly, c.rim), wingP = R(c.wing, c.rim), horn = R(c.horn, 'holy');
  batWing(g, 2, -42 + b, 48, fl, dim(wingP), true);
  const tw = Math.sin(p.t * 1.6) * 4;
  piece(g, [[-20, -31 + b], [-36, -29 + b + tw * 0.4], [-54, -21 + b + tw], [-64, -24 + b + tw], [-56, -16 + b + tw], [-36, -23 + b], [-20, -23 + b]], sc, 1.6);
  piece(g, [[-62, -24 + b + tw], [-71, -31 + b + tw], [-69, -19 + b + tw]], GOLD, 0.6); // gold tail blade
  for (const hx of [-14, 10]) bone(g, hx, -27 + b, hx - 7, -17 + b, 4.2, 4.2, 3, dim(sc));
  piece(g, E(-2, -32 + b, 24, 10.5, 20), sc, 3.4);
  piece(g, [[-16, -27 + b], [12, -27 + b], [16, -23 + b], [-12, -22 + b]], belly, 1);
  for (let i = 0; i < 6; i++) piece(g, [[-18 + i * 6, -41.5 + b], [-15 + i * 6, -47 + b], [-12 + i * 6, -41.5 + b]], R(c.spine, c.rim), 0.5);
  // a long proud neck; gold harness plates down it
  piece(g, [[12, -37 + b], [19, -50 + b], [27, -60 + b], [34, -60 + b], [31, -48 + b], [23, -31 + b], [16, -25 + b]], sc, 2);
  for (let i = 0; i < 4; i++) piece(g, [[27 - i * 3.6, -58 + i * 7 + b], [31.5 - i * 3, -56.5 + i * 7 + b], [29 - i * 3, -51 + i * 7 + b], [24.5 - i * 3.6, -52.5 + i * 7 + b]], GOLD, 0.5);
  // head: long snout, a crown of swept-back horns with gold rings
  piece(g, [[26, -62 + b], [35, -66 + b], [46, -60 + b], [48, -55 + b], [41, -53 + b], [30, -54 + b]], sc, 1.4);
  piece(g, [[32, -55 + b], [47, -54.5 + b], [44, -51.5 + b + Math.max(0, Math.sin(p.t * 0.8)) * 2], [33, -52 + b]], R(mix(c.scale, '#000000', 0.3), c.rim), 0.8);
  for (const [x0, y0, x1, y1] of [[28, -63, 16, -72], [31, -64.5, 22, -77], [34, -65.5, 30, -79]]) {
    piece(g, [[x0, y0 + b], [x1, y1 + b], [x0 + 3, y0 + b + 0.5]], horn, 0.6);
    piece(g, E(x0 + (x1 - x0) * 0.3 + 1, y0 + (y1 - y0) * 0.3 + b, 1.6, 1, 8, -0.6), GOLD, 0.2);
  }
  piece(g, [[38, -62 + b], [43, -61 + b], [40, -59.5 + b]], GOLD, 0.2); // brow crest
  calmEye(g, 38.5, -59 + b, 1.7, c.iris || '#7a4a08', c.light);
  const breath = Math.max(0, Math.sin(p.t * 0.8) - 0.6) * 2.5;
  if (breath > 0) { flames(g, [[50, -54 + b], [55, -55 + b], [60, -56 + b]], p.t * 1.5, c.core, c.breath, 3 + breath * 2); glow(g, 56, -56 + b, 16, c.breath, breath * 0.6); }
  // gold chest plate & harness
  piece(g, [[14, -38 + b], [23, -38 + b], [25, -28 + b], [18, -22 + b], [13, -28 + b]], GOLD, 1);
  sunCrest(g, 19, -31 + b, 2.4, p.t);
  for (const hx of [-16, 12]) { bone(g, hx, -27 + b, hx - 8, -18 + b, 4.6, 4.6, 3.4, sc); kit.claws(g, { x: hx - 10, y: -17 + b }, GOLD_HEX); }
  drape(g, [[-18, -36 + b], [-10, -41 + b], [4, -41.5 + b], [11, -38 + b]], -24 + b, c.cloth, GOLD_HEX, p.t, { x: -4, y: -31 + b, r: 2.8 });
  batWing(g, 0, -43 + b, 54, fl, wingP);
  // gold claws on the wing's elbow
  return b;
}

// ─── sky whale ─────────────────────────────────────────────────────────────
function skywhale(g, p, c) {
  const b = hover(p, 5) - 14, sw = Math.sin(p.t * 1.5);
  const skin = R(c.skin, c.rim), belly = R(c.belly, c.rim), fin = R(c.fin, c.rim);
  piece(g, [[-30, -34 + b], [-44, -32 + b + sw * 3], [-56, -44 + b + sw * 5], [-51, -32 + b + sw * 4], [-58, -22 + b + sw * 5], [-44, -27 + b + sw * 3]], fin, 1.4);
  g.lineWidth = 1; g.strokeStyle = GOLD_HEX; g.beginPath(); g.moveTo(-56, -44 + b + sw * 5); g.lineTo(-51, -32 + b + sw * 4); g.lineTo(-58, -22 + b + sw * 5); g.stroke();
  piece(g, [[-34, -32 + b], [-20, -47 + b], [4, -53 + b], [27, -49 + b], [40, -36 + b], [38, -25 + b], [21, -17 + b], [-10, -17 + b], [-28, -23 + b]], skin, 3.6);
  piece(g, [[-20, -23 + b], [0, -18 + b], [25, -19 + b], [36, -27 + b], [21, -23 + b], [-4, -22 + b]], belly, 1);
  for (let i = 0; i < 16; i++) {
    const x = -26 + ((i * 37) % 60), y = -45 + ((i * 23) % 21), a = 0.5 + Math.sin(p.t * 3 + i) * 0.5;
    glow(g, x, y + b, 3, c.star, a * 0.8); g.fillStyle = `rgba(255,255,255,${a})`; g.fillRect(x - 0.5, y + b - 0.5, 1.1, 1.1);
  }
  // gold harness bands
  for (const x of [-12, 14]) { piece(g, [[x - 2, -51 + b + Math.abs(x) * 0.03], [x + 2, -51 + b], [x + 3, -19 + b], [x - 1, -19 + b]], GOLD, 0.6); }
  piece(g, [[4, -23 + b], [12, -12 + b + sw * 2], [19, -10 + b + sw * 2], [15, -21 + b]], fin, 1);
  calmEye(g, 29, -33 + b, 1.9, mix(c.skin, '#000000', 0.5), c.star);
  g.lineWidth = 1; g.strokeStyle = INK; g.beginPath(); g.moveTo(31, -26 + b); g.quadraticCurveTo(35, -25 + b, 38, -28 + b); g.stroke();
  // a crown of light over the brow
  const cy = -55 + b + Math.sin(p.t * 2) * 0.8;
  glow(g, 22, cy, 9, c.star, 0.5);
  g.beginPath(); g.ellipse(22, cy, 6, 1.8, -0.15, 0, TAU); g.lineWidth = 1.4; g.strokeStyle = '#fff2c0'; g.stroke();
  for (let i = 0; i < 3; i++) { const k = (p.t * 0.5 + i / 3) % 1; glow(g, -10 + i * 3, -54 + b - k * 16, 3 + k * 3, c.star, (1 - k) * 0.6); }
  return b;
}

// ─── the roster ────────────────────────────────────────────────────────────
// light: the colour of its glow (majesty motes, hoof light); cloth: the caparison
export const MAJESTIC_MOUNTS = [
  {
    id: 'horse', name: 'Kuda Perang', rarity: 0, tag: 'Normal', scale: 1.35, len: 30, saddle: { x: 0, y: -36 }, saddleW: 15,
    desc: 'Kuda perang berzirah, setia sampai akhir. Hadiah bab 1.',
    skins: [
      { name: 'Kastanye', c: { coat: '#8a4e2a', mane: '#2a1810', cloth: '#7a1e1e', rim: 'dusk' } },
      { name: 'Putih Salju', c: { coat: '#ece8e0', mane: '#c8c0b4', cloth: '#1e3a6a', rim: 'ice' } },
      { name: 'Hitam Bangsawan', c: { coat: '#2a2630', mane: '#121016', cloth: '#5a1a2a', rim: 'holy', iris: '#5a3a1a' } },
    ],
    back(g, p) { this.b = steed(g, p, skinOf(this, p), { tier: 0 }); },
  },
  {
    id: 'snowwolf', name: 'Serigala Raksasa', rarity: 2, tag: 'Normal', scale: 1.35, len: 28, saddle: { x: -2, y: -33 }, saddleW: 14,
    desc: 'Serigala utara sebesar kuda, berkalung zirah.',
    skins: [
      { name: 'Salju', c: { fur: '#e4eaf0', ruff: '#ffffff', cloth: '#1e3a6a', rim: 'ice', iris: '#3a6aa0' } },
      { name: 'Abu Perak', c: { fur: '#8a909c', ruff: '#d8dce4', cloth: '#3a1a4a', rim: 'holy', iris: '#5a4a1a' } },
      { name: 'Emas Senja', c: { fur: '#c8904a', ruff: '#f4dcb0', cloth: '#6a1a1a', rim: 'gold', iris: '#5a2a0a' } },
    ],
    back(g, p) { this.b = direwolf(g, p, skinOf(this, p), 2); },
  },
  {
    id: 'stag', name: 'Rusa Cahaya', rarity: 2, tag: 'Normal', scale: 1.35, len: 26, saddle: { x: -1, y: -38 }, saddleW: 13,
    desc: 'Rusa hutan suci; ujung tanduknya berpendar.',
    skins: [
      { name: 'Perak Bulan', c: { coat: '#c8ccd8', chest: '#ffffff', antler: '#f4f0e0', cloth: '#2a3a6a', rim: 'ice', light: 'rgba(190,230,255,.95)' } },
      { name: 'Emas Hutan', c: { coat: '#b07a40', chest: '#f6e8cc', antler: '#f0e0b0', cloth: '#2a4a2a', rim: 'gold', light: 'rgba(255,226,140,.95)' } },
      { name: 'Fajar', c: { coat: '#c88a8a', chest: '#fff0f0', antler: '#ffe8f0', cloth: '#5a2a4a', rim: 'rose', light: 'rgba(255,200,230,.95)' } },
    ],
    back(g, p) { this.b = stag(g, p, skinOf(this, p), 2); },
  },
  {
    id: 'lion', name: 'Singa Kerajaan', rarity: 3, tag: 'Agung', scale: 1.4, len: 30, saddle: { x: -2, y: -35 }, saddleW: 14,
    desc: 'Singa pengawal raja, bersurai lebat dan berzirah emas.',
    skins: [
      { name: 'Emas', c: { fur: '#d0a058', mane: '#8a4a1a', cloth: '#7a1a1a', rim: 'gold', iris: '#6a3a08' } },
      { name: 'Putih', c: { fur: '#f0e8dc', mane: '#d8c8a8', cloth: '#1e3a6a', rim: 'holy', iris: '#3a5a8a' } },
      { name: 'Malam Berbintang', c: { fur: '#3a3448', mane: '#1a1424', cloth: '#2a1a4a', rim: 'gold', iris: '#a87a1a', plume: '#ffd36a' } },
    ],
    back(g, p) { this.b = bigcat(g, p, skinOf(this, p), { tier: 3, kind: 'lion' }); },
  },
  {
    id: 'tiger', name: 'Harimau Putih', rarity: 3, tag: 'Agung', scale: 1.4, len: 30, saddle: { x: -2, y: -35 }, saddleW: 14,
    desc: 'Harimau penjaga gunung, berzirah baja perang.',
    skins: [
      { name: 'Putih Salju', c: { fur: '#f2eee8', stripe: '#2a2630', cloth: '#1e3a6a', rim: 'ice', iris: '#3a6aa0', plume: '#4a8ad8' } },
      { name: 'Emas Loreng', c: { fur: '#d8883a', stripe: '#2a1a14', ruff: '#fff4e0', cloth: '#5a1a1a', rim: 'gold', iris: '#5a3a08' } },
      { name: 'Perak Bulan', c: { fur: '#b8bcc8', stripe: '#3a3a5a', cloth: '#2a1a4a', rim: 'holy', iris: '#6a4ab0', plume: '#c8b0ff' } },
    ],
    back(g, p) { this.b = bigcat(g, p, skinOf(this, p), { tier: 3, kind: 'tiger' }); },
  },
  {
    id: 'pegasus', name: 'Pegasus Fajar', rarity: 4, tag: 'Legenda', fly: true, scale: 1.4, len: 32, saddle: { x: 0, y: -36 }, saddleW: 15,
    desc: 'Kuda bersayap pembawa cahaya; terbang melintasi sungai.',
    skins: [
      { name: 'Fajar', c: { coat: '#f6f2ea', mane: '#ffd890', wing: '#f4eee0', tip: '#ffd36a', feather: '#fff6e0', cloth: '#7a2a1a', rim: 'gold', glowMane: true, light: 'rgba(255,220,140,.95)', iris: '#5a3a10' } },
      { name: 'Senja', c: { coat: '#f4dce0', mane: '#ff9ab8', wing: '#ffe4ec', tip: '#ff8ab0', feather: '#fff0f4', cloth: '#4a1a3a', rim: 'rose', glowMane: true, light: 'rgba(255,180,210,.95)', iris: '#5a1a3a' } },
      { name: 'Bintang', c: { coat: '#dfe6f4', mane: '#9ac0ff', wing: '#e8f0ff', tip: '#8ab4ff', feather: '#f4f8ff', cloth: '#1a2a5a', rim: 'ice', glowMane: true, light: 'rgba(170,210,255,.95)', iris: '#1a3a6a' } },
    ],
    back(g, p) { this.b = steed(g, p, skinOf(this, p), { tier: 4, fly: true, wing: true }); },
  },
  {
    id: 'griffin', name: 'Griffin', rarity: 4, tag: 'Legenda', fly: true, scale: 1.4, len: 30, saddle: { x: -3, y: -40 }, saddleW: 14,
    desc: 'Setengah elang, setengah singa, tunggangan para ksatria langit.',
    skins: [
      { name: 'Emas', c: { fur: '#c8984a', head: '#f6f2e6', wing: '#9a6a32', tip: '#f4dca8', cloth: '#7a1a1a', rim: 'gold', iris: '#6a3a08' } },
      { name: 'Badai', c: { fur: '#8a94a4', head: '#eef2fa', wing: '#4a5a7a', tip: '#c8dcff', cloth: '#1a2a5a', rim: 'ice', iris: '#1a3a6a', light: 'rgba(170,210,255,.95)' } },
      { name: 'Salju', c: { fur: '#e8e4dc', head: '#ffffff', wing: '#d8d4cc', tip: '#ffffff', cloth: '#2a3a6a', rim: 'holy', iris: '#5a3a10' } },
    ],
    back(g, p) { this.b = griffin(g, p, skinOf(this, p), 4); },
  },
  {
    id: 'dragon', name: 'Naga', rarity: 5, tag: 'Mitos', fly: true, scale: 1.45, len: 36, saddle: { x: -4, y: -42 }, saddleW: 15,
    desc: 'Naga purba bermahkota tanduk; tunduk hanya pada penakluk gerhana.',
    skins: [
      { name: 'Bara Emas', c: { scale: '#b0301e', belly: '#f0b060', wing: '#7a1a14', spine: '#ffd36a', horn: '#f4e8d0', cloth: '#3a1a1a', core: '#fff0a0', breath: 'rgba(255,140,40,.85)', rim: 'gold', light: 'rgba(255,200,120,.95)', iris: '#8a4a08' } },
      { name: 'Es', c: { scale: '#5a96d8', belly: '#e4f0fc', wing: '#2e5a9a', spine: '#ffffff', horn: '#f4f8ff', cloth: '#1a2a5a', core: '#ffffff', breath: 'rgba(150,220,255,.85)', rim: 'ice', light: 'rgba(190,230,255,.95)', iris: '#1a4a8a' } },
      { name: 'Emas', c: { scale: '#d0a038', belly: '#fff2c8', wing: '#9a6a1a', spine: '#fff4c0', horn: '#fffaf0', cloth: '#5a1a1a', core: '#ffffff', breath: 'rgba(255,230,140,.85)', rim: 'gold', light: 'rgba(255,230,150,.95)', iris: '#6a3a08' } },
      { name: 'Giok', c: { scale: '#2a8a6a', belly: '#d8f4e4', wing: '#145a44', spine: '#ffd36a', horn: '#f4f0e0', cloth: '#3a1a1a', core: '#f0fff8', breath: 'rgba(140,255,200,.85)', rim: 'jade', light: 'rgba(170,255,210,.95)', iris: '#6a4a08' } },
    ],
    back(g, p) { this.b = dragon(g, p, skinOf(this, p)); },
  },
  {
    id: 'skywhale', name: 'Paus Langit', rarity: 5, tag: 'Mitos', fly: true, scale: 1.45, len: 38, saddle: { x: -4, y: -49 }, saddleW: 14,
    desc: 'Paus yang berenang di antara bintang, bermahkota cahaya.',
    skins: [
      { name: 'Malam', c: { skin: '#2e4290', belly: '#a8c4f0', fin: '#6a7ae8', cloth: '#1a1a4a', star: 'rgba(220,235,255,.9)', rim: 'ice', light: 'rgba(200,220,255,.95)' } },
      { name: 'Fajar', c: { skin: '#d0607a', belly: '#ffe0bc', fin: '#ffa868', cloth: '#5a1a2a', star: 'rgba(255,240,200,.9)', rim: 'gold', light: 'rgba(255,220,170,.95)' } },
      { name: 'Aurora', c: { skin: '#1e6a6a', belly: '#b4f4e0', fin: '#5ae0b4', cloth: '#1a3a3a', star: 'rgba(170,255,220,.9)', rim: 'jade', light: 'rgba(170,255,220,.95)' } },
    ],
    back(g, p) { this.b = skywhale(g, p, skinOf(this, p)); },
  },
];
for (const m of MAJESTIC_MOUNTS) {
  m.front = function front(g, p) {
    regalSaddle(g, this.saddle.x, this.saddle.y - 1 + (this.b || 0), this.saddleW, this.rarity, skinOf(this, p).cloth, p.t);
  };
}

// A majestic mount with its rider: the mount is drawn at its own scale, the rider at the
// usual 0.82; the pennant (rarity 4+) stands behind the rider.
// pose.view: 'front' / 'back' (walking toward / away from the camera, spec §38) uses
// art/mountviews.js; anything else is the side view.
export function drawMajesticRidden(g, m, pose, rider, drawDoll) {
  const S = m.scale || 1;
  if ((pose.view === 'front' || pose.view === 'back') && hasViews(m)) {
    drawMountView(g, m, pose, rider, drawDoll, pose.view, (gg) => drawMajesty(gg, m, pose, m.len));
    return;
  }
  g.save(); g.scale(S, S); drawMajesty(g, m, pose, m.len); m.back(g, pose);
  if (m.rarity >= 4) pennant(g, m.saddle.x - m.saddleW * 0.5, m.saddle.y - 2 + (m.b || 0), pose.t, skinOf(m, pose).cloth, 30);
  g.restore();
  if (rider) {
    const s = m.saddle, b = m.b || 0;
    g.save(); g.translate(s.x * S, (s.y + b) * S + 12.5); g.scale(0.82, 0.82);
    drawDoll(g, rider.classId, rider.look, { t: pose.t });
    g.restore();
  }
  g.save(); g.scale(S, S); m.front(g, pose); g.restore();
}
