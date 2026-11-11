// Front and back views of the majestic mounts (spec §35.3, §38): like the hero, a mount
// walking toward the camera shows its face, chest and forelegs; walking away, its rump, tail
// and hind legs. Same conventions as the side view (art/mounts.js): feet on y = 0, mount
// units, x centred. Each body type returns two layers round the rider:
//   under(g) — what lies behind the rider (the far half of the body, wings, the saddle cloth)
//   over(g)  — what stands in front of the rider (front: head, neck, chest, forelegs;
//              back: rump, tail, hind legs)
// The tack grows with rarity as in the side view: 0 steel face plate + cloth, 2 gold trim +
// collar, 3 plume + gold chest plate + sun crest, 4 gold hooves + pennant, 5 the dragon's gold.
import { kit, skinOf } from './companions.js';
import { glow, mix, dim, INK, TAU } from './hero/cel.js';
import { R, GOLD, GOLD_HEX, STEEL, LEATHER, plume, drape, sunCrest, pennant } from './mounttack.js';

const { E, piece, bone, featherWing, batWing, flames, hover, flap } = kit;

// mirror a drawing about x = 0 (the left half of a symmetric part)
function both(g, draw) {
  draw(1);
  g.save(); g.scale(-1, 1); draw(-1); g.restore();
}
// a calm eye seen from the front: almond, iris in the middle, a highlight
function eyeF(g, x, y, s, iris = '#3a2414', soft) {
  if (soft) glow(g, x, y, s * 3, soft, 0.3);
  g.beginPath(); g.moveTo(x - s, y); g.quadraticCurveTo(x, y - s * 0.95, x + s, y); g.quadraticCurveTo(x, y + s * 0.75, x - s, y); g.closePath();
  g.fillStyle = '#f6efe0'; g.fill();
  g.beginPath(); g.arc(x, y, s * 0.55, 0, TAU); g.fillStyle = iris; g.fill();
  g.beginPath(); g.arc(x + s * 0.22, y - s * 0.24, s * 0.2, 0, TAU); g.fillStyle = '#fff'; g.fill();
  g.lineWidth = 0.7; g.strokeStyle = INK;
  g.beginPath(); g.moveTo(x - s * 1.1, y); g.quadraticCurveTo(x, y - s * 1.15, x + s * 1.1, y); g.stroke();
}
// a leg seen from the front or back: hip → knee → foot, nearly straight; lift raises the foot
function legV(g, x, hipY, lift, w, Pal, out = 0.6) {
  const fy = -lift, ky = (hipY + fy) / 2 - lift * 0.4;
  bone(g, x, hipY, x + out * Math.sign(x || 1), ky, w * 1.3, w * 1.25, w, Pal);
  bone(g, x + out * Math.sign(x || 1), ky, x, fy, w, w * 0.92, w * 0.8, Pal);
  return { x, y: fy };
}
// a step: a foot lifts in turn while walking (front / back legs out of phase)
const lift = (p, ph, h = 3.2) => Math.max(0, Math.sin(p.w + ph)) * h * p.m;
// a hoof from the front: a rounded block, gold from rarity 4, feathered above
function hoofV(g, f, tier, feather, light, m) {
  if (feather) piece(g, [[f.x - 3, f.y - 2], [f.x - 2.8, f.y - 5.2], [f.x + 2.8, f.y - 5.2], [f.x + 3, f.y - 2]], feather, 0.5);
  piece(g, [[f.x - 2.8, f.y], [f.x - 2.5, f.y - 2.8], [f.x + 2.5, f.y - 2.8], [f.x + 2.8, f.y]], tier >= 4 ? GOLD : R('#2a2018'), 0.5);
  if (tier >= 4 && m) glow(g, f.x, f.y - 1, 6, light || 'rgba(255,226,150,.9)', 0.5);
}
const pawV = (g, f, Pal) => {
  piece(g, E(f.x, f.y - 1.8, 3.6, 2.3, 10), Pal, 0.5);
  g.lineWidth = 0.6; g.strokeStyle = 'rgba(0,0,0,.45)';
  g.beginPath(); for (const dx of [-1.2, 1.2]) { g.moveTo(f.x + dx, f.y - 0.2); g.lineTo(f.x + dx, f.y - 1.6); } g.stroke();
};
// the cloth over both flanks, seen from the front or back
function sideCloth(g, b, top, hem, half, cloth, tier, t) {
  const trim = tier >= 2 ? GOLD_HEX : '#e8d8b0';
  drape(g, [[-half - 1.5, top + 3 + b], [-half + 5, top + b]], hem + b, cloth, trim, t);
  drape(g, [[half - 5, top + b], [half + 1.5, top + 3 + b]], hem + b, cloth, trim, t);
}
// the saddle seen from the front / back: the blanket across the back, the seat, and the
// high pommel (front, over the rider's lap) or cantle (back, over the rider's hips)
function saddleV(g, y, w, tier, cloth, view, layer) {
  const trim = tier >= 2 ? GOLD_HEX : '#d8c8a0';
  if (layer === 'under') {
    piece(g, [[-w * 0.85, y - 1], [w * 0.85, y - 1], [w * 0.95, y + 7], [-w * 0.95, y + 7]], R(cloth), 1);
    g.lineWidth = 1.1; g.strokeStyle = trim; g.beginPath(); g.moveTo(-w * 0.9, y + 6); g.lineTo(w * 0.9, y + 6); g.stroke();
    piece(g, E(0, y, w * 0.5, 2.6, 12), LEATHER, 0.6);
    return;
  }
  // pommel (front) / cantle (back): a leather arch with gold caps
  const h = view === 'front' ? 6 : 5, ww = view === 'front' ? w * 0.32 : w * 0.45;
  piece(g, [[-ww, y + 1], [-ww * 0.8, y - h], [ww * 0.8, y - h], [ww, y + 1]], LEATHER, 0.6);
  if (tier >= 2) for (const s of [-1, 1]) piece(g, E(s * ww * 0.8, y - h, 1.3, 1.3, 8), GOLD, 0.3);
}
const crestPlate = (g, x, y, w, h, tier, t) => {
  piece(g, [[x - w, y - h], [x + w, y - h], [x + w * 1.1, y], [x, y + h * 0.9], [x - w * 1.1, y]], tier >= 3 ? GOLD : STEEL, 1);
  if (tier >= 3) sunCrest(g, x, y - h * 0.15, Math.min(w, h) * 0.45, t);
};

// ─── steeds: horse & pegasus ──────────────────────────────────────────────
function steedV(m, p, c, view, opt) {
  const tier = opt.tier || 0, fly = !!opt.fly, t = p.t;
  const b = fly ? hover(p, 3) - 8 : p.m ? -Math.abs(Math.sin(p.w)) * 1.4 * p.m : Math.sin(t * 2) * 0.35;
  const coat = R(c.coat, c.rim), far = dim(coat), mane = R(c.mane, c.rim), feather = R(c.feather || mix(c.coat, '#ffffff', 0.5), c.rim);
  const fl = fly ? flap(p, 3.6) : 0, light = c.light;
  const up = (ph) => (fly ? 5 + Math.sin(t * 2 + ph) * 1.2 : lift(p, ph));
  // the eye line: in front the head is lowered toward us, below the rider's shoulders; from
  // behind it rises past the rider, only the ears and the plume showing
  const hy = (view === 'front' ? -36 : -52) + b;
  const wings = (k) => { if (opt.wing) both(g0, () => featherWing(g0, -7, -38 + b, 40 * k, fl, dim(R(c.wing, c.rim)), dim(R(c.tip, c.rim)), true)); };
  let g0;
  const head = (g) => {
    // the mane falling down the near side of the neck, behind the face
    for (let i = 0; i < 4; i++) { const y = hy - 6 + i * 4, w = Math.sin(t * 3.2 + i) * 0.8 - (p.m ? 1 : 0); piece(g, [[4.4, y], [8 + w, y + 2], [7.4 + w, y + 6], [4.8, y + 4]], mane, 0.7); }
    // the long face toward us: broad brow, narrowing to the muzzle
    for (const s of [-1, 1]) piece(g, [[s * 2.2, hy - 6], [s * 5.4, hy - 13], [s * 4.8, hy - 5.5]], coat, 0.5); // ears
    piece(g, [[-5.4, hy - 6], [5.4, hy - 6], [5.8, hy - 1], [4.2, hy + 8], [3.4, hy + 13.5], [-3.4, hy + 13.5], [-4.2, hy + 8], [-5.8, hy - 1]], coat, 1.4);
    piece(g, E(0, hy + 12, 3.8, 2.8, 12), R(mix(c.coat, '#000000', 0.25), c.rim), 0.6);
    for (const s of [-1, 1]) { g.beginPath(); g.arc(s * 1.6, hy + 12.6, 0.7, 0, TAU); g.fillStyle = INK; g.fill(); }
    for (let i = 0; i < 4; i++) piece(g, [[-2 + i * 1.3, hy - 6.5], [-2.6 + i * 1.5 + Math.sin(t * 3 + i) * 0.5, hy - 1], [-1 + i * 1.3, hy - 5.5]], mane, 0.3); // forelock
    if (c.glowMane) for (let i = 0; i < 3; i++) glow(g, 6, hy - 4 + i * 5, 5, light, 0.35 + Math.sin(t * 3 + i) * 0.15);
    for (const s of [-1, 1]) eyeF(g, s * 4.6, hy - 0.5, 1.25, c.iris || '#2a1a10', c.glowMane ? light : undefined);
    // face plate (chanfron) down the middle, bridle across
    piece(g, [[-2.6, hy - 6], [2.6, hy - 6], [2, hy + 7], [-2, hy + 7]], tier >= 3 ? GOLD : STEEL, 0.6);
    g.lineWidth = 0.9; g.strokeStyle = tier >= 2 ? GOLD_HEX : '#3a2010';
    g.beginPath(); g.moveTo(-5.4, hy - 3.5); g.lineTo(5.4, hy - 3.5); g.moveTo(-3.8, hy + 9); g.lineTo(3.8, hy + 9); g.stroke();
    if (tier >= 2) piece(g, E(0, hy - 3, 1.2, 1.2, 8), R('#ff5d6d', 'rose'), 0.3);
    if (c.horn) { piece(g, [[-1.4, hy - 6], [0, hy - 21], [1.4, hy - 6]], GOLD, 0.5); glow(g, 0, hy - 15, 7, 'rgba(255,240,200,.8)', 0.45); }
    if (tier >= 3) plume(g, 0, hy - 7, t, c.plume || '#f4f0e6', 11);
    // reins from the bit to the rider's hands
    g.lineWidth = 0.8; g.strokeStyle = '#3a2010';
    g.beginPath(); for (const s of [-1, 1]) { g.moveTo(s * 3.6, hy + 11); g.quadraticCurveTo(s * 7, hy + 2, s * 5, m.saddle.y - 2 + b); } g.stroke();
  };
  const headBack = (g) => { // the back of the head over the neck, ears up, the mane down the crest
    piece(g, [[-6, -33 + b], [6, -33 + b], [4.6, hy + 3], [-4.6, hy + 3]], coat, 1.6);
    for (const s of [-1, 1]) piece(g, [[s * 2.2, hy - 5], [s * 5, hy - 12.5], [s * 4.6, hy - 4.5]], coat, 0.5);
    piece(g, [[-5.2, hy - 5], [5.2, hy - 5], [5, hy + 3], [-5, hy + 3]], coat, 1.2);
    for (let i = 0; i < 6; i++) { const y = hy - 5 + i * 3.4, w = Math.sin(t * 3 + i) * 0.9; piece(g, [[-1.6, y], [1.6, y], [1.2 + w, y + 4.5], [-1.2 + w, y + 4.5]], mane, 0.4); }
    if (c.horn) piece(g, [[-1.2, hy - 5], [0, hy - 19], [1.2, hy - 5]], GOLD, 0.5);
    if (tier >= 3) plume(g, 0, hy - 6, t, c.plume || '#f4f0e6', 10);
  };
  return {
    under(g) {
      g0 = g; wings(1);
      if (view === 'front') {
        for (const [x, ph] of [[-6.8, Math.PI], [6.8, 0]]) hoofV(g, legV(g, x, -24 + b, up(ph) + 2.6, 2.9, far), tier, dim(feather), light, p.m);
        piece(g, E(0, -31 + b, 12.5, 10.5, 20), coat, 2.6);
      } else {
        headBack(g);
        for (const [x, ph] of [[-6.4, 0], [6.4, Math.PI]]) hoofV(g, legV(g, x, -24 + b, up(ph) + 2.6, 2.9, far), tier, dim(feather), light, p.m);
        piece(g, E(0, -31 + b, 12.5, 10, 20), coat, 2.6);
      }
      if (m.rarity >= 4 && view === 'front') pennant(g, -8, m.saddle.y - 2 + b, t, c.cloth, 30);
      saddleV(g, m.saddle.y - 1 + b, m.saddleW, tier, c.cloth, view, 'under');
    },
    over(g) {
      if (view === 'front') {
        sideCloth(g, b, -36, -17, 12, c.cloth, tier, t);
        piece(g, E(0, -29 + b, 9.5, 8.8, 18), coat, 2);
        saddleV(g, m.saddle.y - 1 + b, m.saddleW, tier, c.cloth, view, 'over');
        for (const [x, ph] of [[-6.2, 0], [6.2, Math.PI]]) hoofV(g, legV(g, x, -24 + b, up(ph), 3.4, coat), tier, feather, light, p.m);
        crestPlate(g, 0, -29 + b, 6, 6, tier, t);
        head(g);
      } else {
        sideCloth(g, b, -37, -18, 12.5, c.cloth, tier, t);
        saddleV(g, m.saddle.y - 1 + b, m.saddleW, tier, c.cloth, view, 'over');
        piece(g, E(0, -30 + b, 12.8, 10.5, 22), coat, 3);
        g.lineWidth = 0.8; g.strokeStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.moveTo(0, -38 + b); g.lineTo(0, -24 + b); g.stroke();
        for (let i = 0; i < 3; i++) { // the tail, high and flowing
          const w = Math.sin(t * 3 + i * 0.7) * 2 + (p.m ? Math.sin(p.w) * 1.5 : 0);
          piece(g, [[-2 + i * 2, -37 + b], [-3 + i * 2 + w * 0.5, -28 + b], [-4 + i * 2 + w, -14 + b], [-1 + i * 2 + w, -12 + b], [0 + i * 2, -30 + b]], i === 1 ? mane : dim(mane), 0.9);
        }
        for (const [x, ph] of [[-7, 0], [7, Math.PI]]) hoofV(g, legV(g, x, -25 + b, up(ph), 3.6, coat, 1.4), tier, feather, light, p.m);
        if (m.rarity >= 4) pennant(g, -9, m.saddle.y - 2 + b, t, c.cloth, 30);
      }
    },
  };
}

// ─── big cats: lion & tiger ───────────────────────────────────────────────
function bigcatV(m, p, c, view, opt) {
  const tier = opt.tier, lion = opt.kind === 'lion', t = p.t;
  const b = p.m ? -Math.abs(Math.sin(p.w * 1.1)) * 1.6 * p.m : Math.sin(t * 2) * 0.4;
  const fur = R(c.fur, c.rim), far = dim(fur), maneP = R(c.mane || c.fur, c.rim), stripe = R(c.stripe || '#2a2630');
  const hy = (view === 'front' ? -29 : -44) + b; // in front: below the rider's shoulders
  const stripes = (g, x, y, w, n) => { if (!lion) for (let i = 0; i < n; i++) piece(g, [[x - w, y + i * 4], [x + w, y + i * 4 - 0.6], [x + w * 0.6, y + i * 4 + 1.6]], stripe, 0.2); };
  const maneRing = (g, rr, col, n, cx = 0, cy = hy + 1) => {
    const pts = [];
    for (let i = 0; i < n * 2; i++) {
      const a = (i / (n * 2)) * TAU + Math.sin(t * 1.5) * 0.04, q = i % 2 ? rr : rr * 0.74, wv = i % 2 ? Math.sin(t * 3 + i) * 0.8 : 0;
      pts.push([cx + Math.cos(a) * (q + wv), cy + Math.sin(a) * (q + wv) * 1.05]);
    }
    piece(g, pts, col, 2);
  };
  const face = (g) => {
    if (lion) { maneRing(g, 13, dim(maneP), 13); maneRing(g, 10.5, maneP, 12); }
    else piece(g, [[-10, hy - 2], [-11, hy + 5], [-6, hy + 9], [0, hy + 8], [6, hy + 9], [11, hy + 5], [10, hy - 2]], R(c.ruff || '#f4f0ea', c.rim), 1); // cheek ruff
    for (const s of [-1, 1]) piece(g, [[s * 4, hy - 7], [s * 7.5, hy - 12], [s * 8.5, hy - 5]], fur, 0.5);
    piece(g, [[-8, hy - 6], [8, hy - 6], [9, hy + 1], [6, hy + 7], [-6, hy + 7], [-9, hy + 1]], fur, 1.6);
    if (!lion) for (const s of [-1, 1]) for (const dy of [-5, -2.5]) { g.lineWidth = 0.9; g.strokeStyle = c.stripe; g.beginPath(); g.moveTo(s * 2, hy + dy); g.lineTo(s * 6.5, hy + dy + 0.8); g.stroke(); }
    piece(g, E(0, hy + 4, 5, 3.4, 12), R(c.muzzle || mix(c.fur, '#fff6e6', 0.6), c.rim), 0.8);
    piece(g, [[-1.8, hy + 1.6], [1.8, hy + 1.6], [0, hy + 3.6]], R('#3a2420'), 0.3);
    g.lineWidth = 0.7; g.strokeStyle = INK; g.beginPath(); g.moveTo(0, hy + 3.6); g.lineTo(0, hy + 5); g.moveTo(-2, hy + 5.8); g.quadraticCurveTo(0, hy + 4.6, 2, hy + 5.8); g.stroke();
    for (const s of [-1, 1]) eyeF(g, s * 3.6, hy - 2, 1.35, c.iris || '#5a3a10', c.soft);
    piece(g, [[-5, hy - 7], [5, hy - 7], [4.6, hy - 5.2], [-4.6, hy - 5.2]], tier >= 3 ? GOLD : STEEL, 0.4); // brow band
    if (tier >= 3) { piece(g, [[-1.4, hy - 7], [0, hy - 11], [1.4, hy - 7]], GOLD, 0.3); plume(g, 0, hy - 8, t, c.plume || '#c8263a', 10); }
  };
  const back = (g) => { // the back of the head (the mane, the ears) above the shoulders
    if (lion) { maneRing(g, 14, dim(maneP), 12, 0, hy); maneRing(g, 10.5, maneP, 11, 0, hy - 1); }
    for (const s of [-1, 1]) piece(g, [[s * 4, hy - 6], [s * 7.5, hy - 11], [s * 8.2, hy - 4]], fur, 0.5);
    if (!lion) { piece(g, E(0, hy - 1, 8, 7, 14), fur, 1.4); stripes(g, 0, hy - 5, 4.5, 3); }
  };
  return {
    under(g) {
      if (view === 'front') {
        for (const [x, ph] of [[-7, Math.PI], [7, 0]]) pawV(g, legV(g, x, -21 + b, lift(p, ph, 3) + 2.4, 3.6, far), far);
        piece(g, E(0, -28 + b, 13, 10.5, 20), fur, 2.8);
      } else {
        back(g);
        for (const [x, ph] of [[-7, 0], [7, Math.PI]]) pawV(g, legV(g, x, -21 + b, lift(p, ph, 3) + 2.4, 3.6, far), far);
        piece(g, E(0, -28 + b, 13, 10, 20), fur, 2.8);
      }
      saddleV(g, m.saddle.y - 1 + b, m.saddleW, tier, c.cloth, view, 'under');
    },
    over(g) {
      if (view === 'front') {
        sideCloth(g, b, -34, -18, 12, c.cloth, tier, t);
        saddleV(g, m.saddle.y - 1 + b, m.saddleW, tier, c.cloth, view, 'over');
        piece(g, E(0, -26 + b, 10, 8.5, 18), fur, 2); // chest
        stripes(g, 0, -30 + b, 3, 3);
        for (const [x, ph] of [[-6.6, 0], [6.6, Math.PI]]) pawV(g, legV(g, x, -22 + b, lift(p, ph, 3), 4.4, fur), fur);
        for (const s of [-1, 1]) piece(g, [[s * 5, -36 + b], [s * 12, -34 + b], [s * 13, -27 + b], [s * 8, -25 + b]], tier >= 3 ? GOLD : STEEL, 0.8); // pauldrons
        face(g);
      } else {
        sideCloth(g, b, -35, -18, 12.5, c.cloth, tier, t);
        saddleV(g, m.saddle.y - 1 + b, m.saddleW, tier, c.cloth, view, 'over');
        piece(g, E(0, -27 + b, 13, 10, 22), fur, 3);
        stripes(g, 0, -33 + b, 7, 3);
        const tw = Math.sin(t * 2.2) * 3; // the tail curls up behind
        piece(g, [[-1.6, -34 + b], [1.6, -34 + b], [3 + tw * 0.5, -46 + b], [1.5 + tw, -54 + b], [-1 + tw, -53 + b], [0.5 + tw * 0.4, -45 + b]], fur, 0.9);
        if (lion) piece(g, E(0.3 + tw, -55 + b, 3.2, 3.8, 10), maneP, 0.8);
        for (const [x, ph] of [[-7.4, 0], [7.4, Math.PI]]) pawV(g, legV(g, x, -22 + b, lift(p, ph, 3), 4.6, fur, 1.2), fur);
      }
    },
  };
}

// ─── wolf ──────────────────────────────────────────────────────────────────
function wolfV(m, p, c, view, tier) {
  const t = p.t, b = p.m ? -Math.abs(Math.sin(p.w * 1.2)) * 1.8 * p.m : Math.sin(t * 2) * 0.4;
  const fur = R(c.fur, c.rim), far = dim(fur), ruff = R(c.ruff || mix(c.fur, '#ffffff', 0.35), c.rim);
  const hy = (view === 'front' ? -29 : -43) + b, foot = (f, P) => piece(g0, E(f.x, f.y - 1.6, 3, 1.9, 8), P, 0.4);
  let g0;
  const collar = (g) => {
    const pts = [];
    for (let i = 0; i < 20; i++) { const a = (i / 20) * TAU, q = i % 2 ? 11 : 8.6; pts.push([Math.cos(a) * q, -32 + b + Math.sin(a) * q * 0.85]); }
    piece(g, pts, ruff, 2);
  };
  return {
    under(g) {
      g0 = g;
      if (view === 'front') {
        for (const [x, ph] of [[-6.4, Math.PI], [6.4, 0]]) foot(legV(g, x, -20 + b, lift(p, ph, 3) + 2.4, 3.1, far), far);
        piece(g, E(0, -27 + b, 11.5, 9.5, 18), fur, 2.6);
      } else {
        for (const s of [-1, 1]) piece(g, [[s * 2.5, hy - 4], [s * 5.6, hy - 13], [s * 6.6, hy - 3]], fur, 0.6);
        piece(g, E(0, hy, 7, 6, 14), fur, 1.4);
        collar(g);
        for (const [x, ph] of [[-6, 0], [6, Math.PI]]) foot(legV(g, x, -20 + b, lift(p, ph, 3) + 2.4, 3.1, far), far);
        piece(g, E(0, -27 + b, 11.5, 9.5, 18), fur, 2.6);
      }
      saddleV(g, m.saddle.y - 1 + b, m.saddleW, tier, c.cloth, view, 'under');
    },
    over(g) {
      g0 = g;
      if (view === 'front') {
        sideCloth(g, b, -33, -18, 11, c.cloth, tier, t);
        saddleV(g, m.saddle.y - 1 + b, m.saddleW, tier, c.cloth, view, 'over');
        collar(g);
        for (const [x, ph] of [[-5.6, 0], [5.6, Math.PI]]) foot(legV(g, x, -21 + b, lift(p, ph, 3), 3.8, fur), fur);
        piece(g, [[-5, -28 + b], [5, -28 + b], [5.6, -20 + b], [0, -17 + b], [-5.6, -20 + b]], tier >= 2 ? GOLD : STEEL, 0.8); // collar plate
        // the head: pointed ears, a long snout toward us
        for (const s of [-1, 1]) piece(g, [[s * 2.6, hy - 5], [s * 6, hy - 14], [s * 7, hy - 3.5]], fur, 0.6);
        piece(g, [[-7.4, hy - 5], [7.4, hy - 5], [8, hy + 1], [3.6, hy + 7], [-3.6, hy + 7], [-8, hy + 1]], fur, 1.4);
        piece(g, [[-3.2, hy + 1], [3.2, hy + 1], [2.6, hy + 8.6], [-2.6, hy + 8.6]], ruff, 0.6);
        piece(g, E(0, hy + 8.4, 2, 1.4, 8), R('#1a2030'), 0.3);
        for (const s of [-1, 1]) eyeF(g, s * 3.6, hy - 1.4, 1.3, c.iris || '#3a5a8a', c.soft);
        piece(g, [[-2.4, hy - 5], [2.4, hy - 5], [1.8, hy + 1], [-1.8, hy + 1]], tier >= 3 ? GOLD : STEEL, 0.5); // face plate
      } else {
        sideCloth(g, b, -33, -18, 11.5, c.cloth, tier, t);
        saddleV(g, m.saddle.y - 1 + b, m.saddleW, tier, c.cloth, view, 'over');
        piece(g, E(0, -27 + b, 12, 9.6, 20), fur, 3);
        const tw = Math.sin(t * 3) * 2; // a full raised tail
        piece(g, [[-3, -33 + b], [3, -33 + b], [5 + tw, -42 + b], [2 + tw, -49 + b], [-2 + tw, -48 + b], [-4 + tw * 0.5, -40 + b]], fur, 1.4);
        piece(g, [[2 + tw, -49 + b], [0 + tw, -52 + b], [-2 + tw, -48 + b]], ruff, 0.4);
        for (const [x, ph] of [[-6.6, 0], [6.6, Math.PI]]) foot(legV(g, x, -21 + b, lift(p, ph, 3), 4, fur, 1.2), fur);
      }
    },
  };
}

// ─── stag ──────────────────────────────────────────────────────────────────
function antlerV(g, x, y, a, len, depth, col, tip, t) {
  const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
  bone(g, x, y, ex, ey, 1.2 + depth * 0.5, 1.1 + depth * 0.45, 0.8 + depth * 0.35, col);
  if (depth <= 0) { glow(g, ex, ey, 4.5, tip, 0.55 + Math.sin(t * 3 + x) * 0.25); return; }
  antlerV(g, ex, ey, a - 0.42, len * 0.72, depth - 1, col, tip, t);
  antlerV(g, ex, ey, a + 0.38, len * 0.62, depth - 1, col, tip, t);
}
function stagV(m, p, c, view, tier) {
  const t = p.t, b = p.m ? -Math.abs(Math.sin(p.w)) * 1.4 * p.m : Math.sin(t * 2) * 0.35;
  const coat = R(c.coat, c.rim), far = dim(coat), chest = R(c.chest || '#f6f0e4', c.rim), hy = (view === 'front' ? -36 : -55) + b;
  const hoof = (f) => piece(g0, [[f.x - 2, f.y], [f.x - 1.7, f.y - 2.4], [f.x + 1.7, f.y - 2.4], [f.x + 2, f.y]], tier >= 2 ? GOLD : R('#2a2018'), 0.4);
  let g0;
  const antlers = (g) => { // a crown spreading to both sides, glowing at the tips
    antlerV(g, -2.2, hy - 6, -2.0, 9, 2, R(c.antler, 'holy'), c.light, t);
    antlerV(g, 2.2, hy - 6, -1.14, 9, 2, R(c.antler, 'holy'), c.light, t + 1);
    if (tier >= 2) for (const s of [-1, 1]) piece(g, E(s * 2.4, hy - 6.5, 1.4, 0.9, 8), GOLD, 0.2);
  };
  const motes = (g) => { for (let i = 0; i < 5; i++) { const k = (t * 0.6 + i / 5) % 1; glow(g, Math.sin(i * 2.3) * 12, -30 - k * 18 + b, 3, c.light, (1 - k) * (0.3 + p.m * 0.5)); } };
  return {
    under(g) {
      g0 = g;
      if (view === 'front') {
        for (const [x, ph] of [[-6, Math.PI], [6, 0]]) hoof(legV(g, x, -26 + b, lift(p, ph, 3) + 2.6, 2.3, far));
        piece(g, E(0, -32 + b, 11, 9, 18), coat, 2.4);
      } else {
        antlers(g);
        piece(g, [[-4.2, hy - 5], [4.2, hy - 5], [3.6, hy + 4], [-3.6, hy + 4]], coat, 1);
        for (const s of [-1, 1]) piece(g, [[s * 3.4, hy - 3], [s * 9, hy - 6], [s * 4, hy]], coat, 0.5); // ears to the side
        piece(g, [[-5, -34 + b], [5, -34 + b], [3.6, -52 + b], [-3.6, -52 + b]], coat, 1.4);
        for (const [x, ph] of [[-5.6, 0], [5.6, Math.PI]]) hoof(legV(g, x, -26 + b, lift(p, ph, 3) + 2.6, 2.3, far));
        piece(g, E(0, -32 + b, 11, 9, 18), coat, 2.4);
      }
      saddleV(g, m.saddle.y - 1 + b, m.saddleW, tier, c.cloth, view, 'under');
    },
    over(g) {
      g0 = g;
      if (view === 'front') {
        sideCloth(g, b, -37, -21, 10.5, c.cloth, tier, t);
        saddleV(g, m.saddle.y - 1 + b, m.saddleW, tier, c.cloth, view, 'over');
        piece(g, E(0, -31 + b, 8, 7.5, 16), coat, 1.8);
        for (const [x, ph] of [[-5.2, 0], [5.2, Math.PI]]) hoof(legV(g, x, -26 + b, lift(p, ph, 3), 2.7, coat));
        // the white chest ruff, a fine head lowered toward us
        piece(g, [[-3.6, -40 + b], [3.6, -40 + b], [4.6, -32 + b], [0, -26 + b], [-4.6, -32 + b]], chest, 0.8);
        antlers(g);
        for (const s of [-1, 1]) piece(g, [[s * 3.4, hy - 3], [s * 9.4, hy - 6.5], [s * 4.4, hy + 0.5]], coat, 0.5);
        piece(g, [[-4.4, hy - 6], [4.4, hy - 6], [4.6, hy], [2.4, hy + 9], [-2.4, hy + 9], [-4.6, hy]], coat, 1.2);
        piece(g, E(0, hy + 8.4, 2.2, 1.6, 8), R('#2a1a14'), 0.3);
        for (const s of [-1, 1]) eyeF(g, s * 3, hy - 1, 1.2, c.iris || '#2a1a10', c.light);
        g.lineWidth = 0.9; g.strokeStyle = tier >= 2 ? GOLD_HEX : '#3a2010';
        g.beginPath(); g.moveTo(-4.4, hy - 2.5); g.lineTo(4.4, hy - 2.5); g.stroke();
        g.lineWidth = 0.8; g.strokeStyle = '#3a2010';
        g.beginPath(); for (const s of [-1, 1]) { g.moveTo(s * 2.2, hy + 7); g.quadraticCurveTo(s * 6, hy, s * 5, m.saddle.y - 2 + b); } g.stroke();
      } else {
        sideCloth(g, b, -37, -21, 11, c.cloth, tier, t);
        saddleV(g, m.saddle.y - 1 + b, m.saddleW, tier, c.cloth, view, 'over');
        piece(g, E(0, -32 + b, 11.2, 9.2, 20), coat, 2.8);
        piece(g, E(0, -32 + b, 5.6, 6.4, 14), chest, 0.6); // the white rump patch
        piece(g, [[-1.6, -38 + b], [1.6, -38 + b], [1, -33 + b + Math.sin(t * 4) * 0.6], [-1, -33 + b]], coat, 0.4);
        for (const [x, ph] of [[-6, 0], [6, Math.PI]]) hoof(legV(g, x, -26 + b, lift(p, ph, 3), 2.9, coat, 1.2));
        motes(g);
      }
    },
  };
}

// ─── griffin ───────────────────────────────────────────────────────────────
function griffinV(m, p, c, view, tier) {
  const t = p.t, b = hover(p) - 8, fl = flap(p, 4.6);
  const fur = R(c.fur, c.rim), feather = R(c.head, c.rim), wingP = R(c.wing, c.rim), tip = R(c.tip, c.rim), hy = (view === 'front' ? -36 : -50) + b;
  const wings = (g, near) => both(g, () => featherWing(g, -6, -39 + b, near ? 44 : 40, fl, near ? wingP : dim(wingP), near ? tip : dim(tip), !near));
  const talons = (g, x) => { bone(g, x, -27 + b, x * 1.1, -16 + b, 3.4, 3.4, 2.8, fur); kit.claws(g, { x: x * 1.1 - 2, y: -15 + b }, '#3a2a1a'); };
  return {
    under(g) {
      wings(g, view === 'back');
      if (view === 'front') {
        piece(g, E(0, -31 + b, 12, 10, 18), fur, 2.6);
      } else { // the eagle head behind the rider: a crest of long feathers
        piece(g, E(0, hy, 6.4, 6.4, 14), feather, 1.2);
        for (let i = 0; i < 4; i++) piece(g, [[-3 + i * 2, hy - 4], [-5 + i * 3.4, hy - 12 + Math.sin(t * 3 + i)], [-1 + i * 2, hy - 3]], feather, 0.4);
        piece(g, E(0, -31 + b, 12, 10, 18), fur, 2.6);
      }
      saddleV(g, m.saddle.y - 1 + b, m.saddleW, tier, c.cloth, view, 'under');
    },
    over(g) {
      if (view === 'front') {
        sideCloth(g, b, -36, -21, 11.5, c.cloth, 4, t);
        saddleV(g, m.saddle.y - 1 + b, m.saddleW, tier, c.cloth, view, 'over');
        // feathered chest and neck, the gold chest plate with the crest
        piece(g, [[-8, -40 + b], [8, -40 + b], [9, -28 + b], [0, -21 + b], [-9, -28 + b]], feather, 1.6);
        piece(g, [[-5, -36 + b], [5, -36 + b], [5.6, -28 + b], [0, -23 + b], [-5.6, -28 + b]], GOLD, 0.8);
        sunCrest(g, 0, -30 + b, 2.2, t);
        for (const x of [-6, 6]) talons(g, x);
        // the eagle's head: crest feathers, eyes to the sides, the hooked gold beak pointing down at us
        for (let i = 0; i < 4; i++) piece(g, [[-3 + i * 2, hy - 4], [-5 + i * 3.4, hy - 12 + Math.sin(t * 3 + i)], [-1 + i * 2, hy - 3]], feather, 0.4);
        piece(g, E(0, hy, 6.6, 6.8, 16), feather, 1.2);
        piece(g, [[-5.4, hy - 4.2], [5.4, hy - 4.2], [4.8, hy - 2.4], [-4.8, hy - 2.4]], GOLD, 0.3); // helm ridge
        for (const s of [-1, 1]) eyeF(g, s * 3.6, hy - 0.4, 1.35, c.iris || '#6a3a08', c.soft);
        piece(g, [[-2.6, hy + 1.6], [2.6, hy + 1.6], [1.6, hy + 6], [0, hy + 8.4], [-1.6, hy + 6]], GOLD, 0.6);
        wings(g, true);
      } else {
        sideCloth(g, b, -36, -21, 12, c.cloth, 4, t);
        saddleV(g, m.saddle.y - 1 + b, m.saddleW, tier, c.cloth, view, 'over');
        piece(g, E(0, -30 + b, 12.4, 10, 20), fur, 3); // the lion half
        const tw = Math.sin(t * 3) * 2;
        piece(g, [[-1.4, -33 + b], [1.4, -33 + b], [1 + tw, -24 + b], [-1 + tw, -24 + b]], fur, 0.6);
        piece(g, E(tw, -22 + b, 2.8, 3.4, 8), feather, 0.6);
        for (const x of [-7, 7]) bone(g, x, -26 + b, x * 1.15, -15 + b, 3.8, 3.8, 3, fur);
      }
    },
  };
}

// ─── dragon ────────────────────────────────────────────────────────────────
function dragonV(m, p, c, view) {
  const t = p.t, b = hover(p, 4) - 10, fl = flap(p, 3);
  const sc = R(c.scale, c.rim), belly = R(c.belly, c.rim), wingP = R(c.wing, c.rim), horn = R(c.horn, 'holy'), spine = R(c.spine, c.rim);
  const hy = (view === 'front' ? -38 : -58) + b; // in front: the head lowered below the rider's shoulders
  const wings = (g, near) => both(g, () => batWing(g, -7, -42 + b, near ? 54 : 48, fl, near ? wingP : dim(wingP), !near));
  const horns = (g) => { for (const s of [-1, 1]) for (const [x0, y0, x1, y1] of [[3, -5, 9, -17], [4.6, -3, 12, -12]]) piece(g, [[s * x0, hy + y0], [s * x1, hy + y1], [s * (x0 + 2.6), hy + y0 + 0.6]], horn, 0.5); };
  const claws = (g, x) => { bone(g, x, -28 + b, x * 1.1, -17 + b, 4.4, 4.4, 3.2, sc); kit.claws(g, { x: x * 1.1 - 2, y: -16 + b }, GOLD_HEX); };
  return {
    under(g) {
      wings(g, view === 'back');
      if (view === 'front') {
        piece(g, E(0, -32 + b, 14, 11, 20), sc, 3);
      } else { // horned head and neck behind the rider
        piece(g, [[-5, -38 + b], [5, -38 + b], [4, hy + 2], [-4, hy + 2]], sc, 1.4);
        piece(g, E(0, hy + 2, 6.4, 5.6, 14), sc, 1.2);
        horns(g);
        piece(g, E(0, -32 + b, 14, 11, 20), sc, 3);
      }
      saddleV(g, m.saddle.y - 1 + b, m.saddleW, 5, c.cloth, view, 'under');
    },
    over(g) {
      if (view === 'front') {
        sideCloth(g, b, -39, -24, 13, c.cloth, 5, t);
        saddleV(g, m.saddle.y - 1 + b, m.saddleW, 5, c.cloth, view, 'over');
        piece(g, [[-9, -40 + b], [9, -40 + b], [10, -28 + b], [0, -22 + b], [-10, -28 + b]], belly, 1.4);
        // the gold chest plate, then the head lowered toward us
        piece(g, [[-6, -38 + b], [6, -38 + b], [6.6, -29 + b], [0, -24 + b], [-6.6, -29 + b]], GOLD, 1);
        sunCrest(g, 0, -32 + b, 2.4, t);
        for (const x of [-7.5, 7.5]) claws(g, x);
        horns(g);
        piece(g, [[-6.4, hy - 4], [6.4, hy - 4], [7, hy + 2], [4, hy + 10], [-4, hy + 10], [-7, hy + 2]], sc, 1.4);
        piece(g, [[-3.6, hy + 5], [3.6, hy + 5], [3, hy + 11.5 + Math.max(0, Math.sin(t * 0.8)) * 1.6], [-3, hy + 11.5 + Math.max(0, Math.sin(t * 0.8)) * 1.6]], R(mix(c.scale, '#000000', 0.3), c.rim), 0.6);
        for (const s of [-1, 1]) { g.beginPath(); g.arc(s * 1.8, hy + 6.4, 0.7, 0, TAU); g.fillStyle = INK; g.fill(); }
        piece(g, [[-1.6, hy - 4], [0, hy - 7.5], [1.6, hy - 4]], GOLD, 0.2); // brow crest
        for (const s of [-1, 1]) eyeF(g, s * 3.8, hy - 0.6, 1.5, c.iris || '#7a4a08', c.light);
        const breath = Math.max(0, Math.sin(t * 0.8) - 0.6) * 2.5;
        if (breath > 0) { flames(g, [[-2, hy + 12], [0, hy + 14], [2, hy + 12]], t * 1.5, c.core, c.breath, 3 + breath * 2); glow(g, 0, hy + 14, 14, c.breath, breath * 0.6); }
        wings(g, false);
      } else {
        sideCloth(g, b, -40, -25, 13.5, c.cloth, 5, t);
        saddleV(g, m.saddle.y - 1 + b, m.saddleW, 5, c.cloth, view, 'over');
        piece(g, E(0, -31 + b, 14.4, 11, 22), sc, 3.4);
        for (let i = 0; i < 3; i++) piece(g, [[-2, -40 + i * 4 + b], [0, -45 + i * 4 + b], [2, -40 + i * 4 + b]], spine, 0.4);
        // the tail sweeps up behind, ending in the gold blade
        const tw = Math.sin(t * 1.6) * 4;
        piece(g, [[-4, -32 + b], [4, -32 + b], [3 + tw * 0.3, -20 + b], [1.5 + tw, -8 + b], [-1.5 + tw, -8 + b], [-3 + tw * 0.3, -20 + b]], sc, 1.4);
        piece(g, [[tw - 3, -8 + b], [tw, -1 + b], [tw + 3, -8 + b]], GOLD, 0.5);
        for (const x of [-8, 8]) bone(g, x, -27 + b, x * 1.15, -17 + b, 4.6, 4.6, 3.4, sc);
        wings(g, true);
      }
    },
  };
}

// ─── sky whale ─────────────────────────────────────────────────────────────
function whaleV(m, p, c, view) {
  const t = p.t, b = hover(p, 5) - 14, sw = Math.sin(t * 1.5);
  const skin = R(c.skin, c.rim), belly = R(c.belly, c.rim), fin = R(c.fin, c.rim);
  const stars = (g, rx, ry, cy) => { for (let i = 0; i < 10; i++) { const x = Math.sin(i * 2.7) * rx * 0.8, y = cy + Math.cos(i * 1.9) * ry * 0.6, a = 0.5 + Math.sin(t * 3 + i) * 0.5; glow(g, x, y, 3, c.star, a * 0.8); g.fillStyle = `rgba(255,255,255,${a})`; g.fillRect(x - 0.5, y - 0.5, 1.1, 1.1); } };
  const fins = (g, k) => both(g, () => piece(g, [[-14, -26 + b], [-24, -18 + b + sw * 2 * k], [-26, -12 + b + sw * 2 * k], [-15, -20 + b]], fin, 1));
  const crown = (g, y) => {
    const cy = y + Math.sin(t * 2) * 0.8;
    glow(g, 0, cy, 9, c.star, 0.5);
    g.beginPath(); g.ellipse(0, cy, 6, 1.8, 0, 0, TAU); g.lineWidth = 1.4; g.strokeStyle = '#fff2c0'; g.stroke();
  };
  return {
    under(g) {
      fins(g, 1);
      if (view === 'back') piece(g, E(0, -44 + b, 15, 10, 20), skin, 2); // the brow ahead of the rider
      crown(g, (view === 'back' ? -56 : -62) + b); // the crown of light floats behind the rider's head
      saddleV(g, m.saddle.y - 1 + b, m.saddleW, 5, c.cloth, view, 'under');
    },
    over(g) {
      if (view === 'front') {
        // the great round face toward us, the rider riding on the crown of its back
        piece(g, E(0, -32 + b, 19, 17, 24), skin, 3.6);
        piece(g, E(0, -22 + b, 14, 7.5, 18), belly, 1);
        stars(g, 15, 10, -38 + b);
        for (const x of [-9, 9]) piece(g, [[x - 1.8, -47 + b], [x + 1.8, -47 + b], [x + 2, -17 + b], [x - 2, -17 + b]], GOLD, 0.5); // harness bands
        for (const s of [-1, 1]) eyeF(g, s * 9.5, -33 + b, 1.9, mix(c.skin, '#000000', 0.5), c.star);
        g.lineWidth = 1; g.strokeStyle = INK; g.beginPath(); g.moveTo(-8, -25 + b); g.quadraticCurveTo(0, -21.5 + b, 8, -25 + b); g.stroke();
        fins(g, -1);
        saddleV(g, m.saddle.y - 1 + b, m.saddleW, 5, c.cloth, view, 'over');
      } else {
        saddleV(g, m.saddle.y - 1 + b, m.saddleW, 5, c.cloth, view, 'over');
        piece(g, E(0, -30 + b, 16, 14, 22), skin, 3.4);
        stars(g, 13, 9, -34 + b);
        // the fluke rising and falling behind
        piece(g, [[-3, -26 + b], [3, -26 + b], [2, -14 + b + sw * 2], [14, -10 + b + sw * 4], [10, -5 + b + sw * 3], [0, -9 + b + sw * 2], [-10, -5 + b + sw * 3], [-14, -10 + b + sw * 4], [-2, -14 + b + sw * 2]], fin, 1.4);
        g.lineWidth = 1; g.strokeStyle = GOLD_HEX; g.beginPath(); g.moveTo(-14, -10 + b + sw * 4); g.lineTo(0, -9 + b + sw * 2); g.lineTo(14, -10 + b + sw * 4); g.stroke();
      }
    },
  };
}

const VIEWS = {
  horse: (m, p, c, v) => steedV(m, p, c, v, { tier: 0 }),
  snowwolf: (m, p, c, v) => wolfV(m, p, c, v, 2),
  stag: (m, p, c, v) => stagV(m, p, c, v, 2),
  lion: (m, p, c, v) => bigcatV(m, p, c, v, { tier: 3, kind: 'lion' }),
  tiger: (m, p, c, v) => bigcatV(m, p, c, v, { tier: 3, kind: 'tiger' }),
  pegasus: (m, p, c, v) => steedV(m, p, c, v, { tier: 4, fly: true, wing: true }),
  griffin: (m, p, c, v) => griffinV(m, p, c, v, 4),
  dragon: (m, p, c, v) => dragonV(m, p, c, v),
  skywhale: (m, p, c, v) => whaleV(m, p, c, v),
};
export const hasViews = (m) => !!VIEWS[m.id];

// A majestic mount seen from the front or back with its rider between its layers. The bob
// (m.b) is kept so the rider sits right; the rider is drawn in the same view.
export function drawMountView(g, m, pose, rider, drawDoll, view, majesty) {
  const S = m.scale || 1, L = VIEWS[m.id](m, pose, skinOf(m, pose), view);
  g.save(); g.scale(S, S); majesty?.(g); L.under(g); g.restore();
  // the bob of the side view's body math: same formulas, so the rider rides with it
  const b = bobOf(m, pose);
  if (rider) {
    g.save(); g.translate(0, (m.saddle.y + b) * S + 12.5); g.scale(0.82, 0.82);
    drawDoll(g, rider.classId, rider.look, { t: pose.t, view });
    g.restore();
  }
  g.save(); g.scale(S, S); L.over(g); g.restore();
}
// the body's bob, as each view drawer computes it
function bobOf(m, p) {
  if (m.id === 'skywhale') return hover(p, 5) - 14;
  if (m.id === 'dragon') return hover(p, 4) - 10;
  if (m.id === 'griffin') return hover(p) - 8;
  if (m.id === 'pegasus') return hover(p, 3) - 8;
  if (m.id === 'lion' || m.id === 'tiger') return p.m ? -Math.abs(Math.sin(p.w * 1.1)) * 1.6 * p.m : Math.sin(p.t * 2) * 0.4;
  if (m.id === 'snowwolf') return p.m ? -Math.abs(Math.sin(p.w * 1.2)) * 1.8 * p.m : Math.sin(p.t * 2) * 0.4;
  return p.m ? -Math.abs(Math.sin(p.w)) * 1.4 * p.m : Math.sin(p.t * 2) * 0.35;
}
