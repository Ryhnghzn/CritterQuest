// Golem Kristal, anime style (prototype for spec §41.2 arah C): a stone colossus plated in dark
// rock, blue crystal growing through the joints, a hexagonal crystal heart, a small helmeted head
// with a glowing V visor, one forearm grown into a huge faceted crystal blade. ≈ 400 art units tall.
import { part as softPart, stroke, glow, pal, far, limb, mix, trace } from '../src/art/anime/kit.js';

// every corner sharp (anime bosses are angular: plates, blades, spikes — not the heroes' soft curves)
const sharpPts = (pts) => pts.map((p) => [p[0], p[1], 1]);
const part = (g, pts, Pl, o = {}) => softPart(g, sharpPts(pts), Pl, { lw: 1.8, ...o });

const ROCK = pal('#3e4352', { shade: '#1a1c26', hi: '#727a8e', rim: 'rgba(130,220,255,.8)' });
const ROCK2 = pal('#2e3240', { shade: '#12141c', hi: '#5a6276', rim: 'rgba(130,220,255,.7)' });
const CRY = pal('#4aa8e8', { shade: '#1a4a8a', hi: '#d8f6ff', rim: 'rgba(255,255,255,.9)' });
const CRY2 = pal('#7ac8ff', { shade: '#2a6aa8', hi: '#ffffff', rim: 'rgba(255,255,255,.9)' });
const ICE = ['#ffffff', '#c8f0ff', '#7fd8ff', '#3a8ae8'];

function shard(g, x, y, h, w, lean, Pl) { part(g, [[x - w, y], [x + lean, y - h, 1], [x + w, y]], Pl, { sd: 2, lw: 1.8 }); }
function facets(g, pts, t) { // light lines across a crystal
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.5 + 0.3 * Math.sin(t * 3);
  stroke(g, pts, '#e8fbff', 1.4); g.restore();
}

export function drawCrystalGolem(g, t, phase = 1) {
  const br = Math.sin(t * 1.2) * 2, hot = phase > 1 ? 1.4 : 1;
  glow(g, 0, -220, 220, 'rgba(90,180,255,.5)', 0.35 * hot);
  // back crystal cluster
  for (const [x, y, h, w, l] of [[-80, -300, 110, 16, -30], [-50, -320, 140, 18, -10], [-20, -316, 96, 14, 14], [-104, -260, 80, 14, -40]]) shard(g, x, y + br, h, w, l, CRY);
  // far leg, far arm (a stone shield-arm)
  part(g, limb([-34, -170], [-46, -84], 64, 56), far(ROCK), { sd: 5 });
  part(g, limb([-46, -84], [-50, -10], 56, 48), far(ROCK), { sd: 5 });
  part(g, [[-90, -16], [-80, -40], [-20, -40], [-8, -12], [-12, 0], [-92, 0]], far(ROCK2), { sd: 4 });
  part(g, limb([-70, -280 + br], [-118, -190], 58, 50), far(ROCK), { sd: 5 });
  part(g, [[-160, -200], [-104, -214], [-82, -120], [-98, -60], [-150, -70], [-170, -130]], far(ROCK2), { sd: 5 }); // shield slab
  shard(g, -150, -150, 40, 10, -16, far(CRY));
  // near leg: a pillar with a crystal knee
  part(g, limb([26, -172], [38, -86], 68, 60), ROCK, { sd: 6 });
  part(g, limb([38, -86], [44, -10], 60, 52), ROCK, { sd: 6 });
  part(g, [[0, -16], [12, -42], [76, -42], [96, -12], [92, 0], [0, 0]], ROCK2, { sd: 5 });
  part(g, [[22, -110], [40, -132], [60, -110], [40, -92]], CRY2, { sd: 2 });
  shard(g, 50, -100, 34, 9, 12, CRY);
  // hips
  part(g, [[-72, -196], [64, -196], [76, -160], [48, -140], [-50, -140], [-80, -160]], ROCK2, { sd: 6 });
  // torso: huge angular chest, crystal heart
  part(g, [[-86, -300 + br], [-40, -334 + br], [50, -334 + br], [96, -296 + br], [86, -230], [62, -190], [-64, -190], [-92, -236]], ROCK, { sd: 8 });
  stroke(g, [[-60, -290 + br], [-20, -250], [-40, -206]], 'rgba(10,12,20,.8)', 2);
  stroke(g, [[70, -284 + br], [40, -244], [56, -204]], 'rgba(10,12,20,.8)', 2);
  const hx = 4, hy = -262 + br;
  glow(g, hx, hy, 70, '#7fd8ff', 0.75 * hot);
  part(g, [[hx - 24, hy], [hx - 12, hy - 22], [hx + 12, hy - 22], [hx + 24, hy], [hx + 12, hy + 22], [hx - 12, hy + 22]], CRY2, { sd: 3 });
  facets(g, [[hx - 12, hy - 22], [hx, hy], [hx + 12, hy + 22]], t);
  glow(g, hx, hy, 22, '#ffffff', 0.9);
  if (phase > 1) { g.save(); g.globalCompositeOperation = 'lighter'; stroke(g, [[-80, -296], [-50, -270], [-70, -240], [-40, -210]], '#9fe8ff', 2.6); stroke(g, [[90, -290], [60, -264], [80, -232]], '#9fe8ff', 2.6); g.restore(); }
  // near arm: the forearm grows into a giant crystal blade
  part(g, limb([70, -290 + br], [116, -214], 60, 52), ROCK, { sd: 6 });
  part(g, [[100, -232], [134, -246], [154, -196], [132, -170], [104, -186]], ROCK2, { sd: 5 });
  const B = [[122, -214], [168, -250], [236, -214, 1], [330, -96, 1], [300, -60], [216, -112], [138, -166]];
  glow(g, 230, -150, 90, '#7fd8ff', 0.5 * hot);
  part(g, B, CRY, { sd: 6, lw: 2.4 });
  facets(g, [[150, -228], [250, -150], [316, -82]], t);
  facets(g, [[180, -244], [236, -214], [300, -110]], t + 1);
  // spiked crystal pauldrons
  for (const [x, s, P, C] of [[-74, -1, far(ROCK2), far(CRY)], [78, 1, ROCK2, CRY]]) {
    part(g, [[x - 40 * s, -282 + br], [x - 24 * s, -326 + br], [x + 20 * s, -340 + br], [x + 46 * s, -306 + br], [x + 40 * s, -276 + br]], P, { sd: 5 });
    shard(g, x - 6 * s, -330 + br, 46, 10, 10 * s, C); shard(g, x + 16 * s, -334 + br, 34, 8, 16 * s, C);
  }
  // head: a small helmet, a glowing V visor, a crystal crest
  const y = -352 + br;
  part(g, [[-26, y + 10], [-22, y - 22], [0, y - 34], [26, y - 24], [32, y + 2], [20, y + 18], [-18, y + 20]], ROCK2, { sd: 4 });
  g.save(); g.beginPath(); trace(g, [[2, y - 6, 1], [14, y + 2, 1], [28, y - 10, 1], [28, y - 4, 1], [14, y + 8, 1], [2, y, 1]]); g.fillStyle = phase > 1 ? '#ffffff' : '#bff4ff'; g.fill(); g.restore();
  glow(g, 16, y - 2, 22, '#7fd8ff', 0.9 * hot);
  for (const [x, h, l] of [[-12, 44, -14], [2, 60, -4], [16, 40, 8]]) shard(g, x, y - 26, h, 8, l, CRY2);
}

// pixel aura: crystal shards circling (behind / in front by depth), twinkles, frost mist at the
// feet, motes of light drifting up. front: draw only the shards in front of the body.
export function crystalAura(g, x0, y0, s, t, phase, front) {
  const px = (x, y, c, size = 1) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), size, size); };
  const diamond = (x, y, r, c, hi) => { x = Math.round(x); y = Math.round(y); for (let i = -r; i <= r; i++) { const w = r - Math.abs(i); g.fillStyle = c; g.fillRect(x - w, y + i, w * 2 + 1, 1); } px(x - 1, y - 1, hi); };
  const n = phase > 1 ? 9 : 6, sp = phase > 1 ? 1.1 : 0.7;
  for (let i = 0; i < n; i++) {
    const a = t * sp + (i / n) * Math.PI * 2, z = Math.sin(a), isFront = z > 0;
    if (isFront !== front) continue;
    const R = (150 + (i % 3) * 25) * s, h = (-230 - (i % 2) * 70 + Math.sin(t * 2 + i) * 10) * s;
    diamond(x0 + Math.cos(a) * R, y0 + h + z * 18 * s, Math.max(2, Math.round((isFront ? 4 : 3) * s * 2.2)), isFront ? ICE[2] : ICE[3], ICE[0]);
  }
  if (front) return;
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2 + t * 0.2, R = (110 + Math.sin(t + i) * 10) * s; px(x0 + Math.cos(a) * R, y0 + Math.sin(a) * R * 0.22, i % 2 ? 'rgba(200,240,255,.7)' : 'rgba(120,200,255,.6)', 2); }
  for (let i = 0; i < (phase > 1 ? 40 : 24); i++) { const k = (t * (0.1 + (i % 5) * 0.02) + i * 0.171) % 1; px(x0 + Math.sin(i * 9.7) * 140 * s, y0 - k * 420 * s, k < 0.5 ? ICE[1] : ICE[2], 1); }
  for (let i = 0; i < 12; i++) { const on = Math.sin(t * 6 + i * 3.3) > 0.7; if (on) { const x = x0 + Math.sin(i * 4.1) * 130 * s, y = y0 + (-120 - (i * 37) % 260) * s; px(x, y, ICE[0]); px(x - 1, y, ICE[1]); px(x + 1, y, ICE[1]); px(x, y - 1, ICE[1]); px(x, y + 1, ICE[1]); } }
}
