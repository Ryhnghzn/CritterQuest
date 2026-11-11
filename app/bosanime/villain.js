// Raja Lava v2 (prototype, spec §41.2 arah C): assembled from the anime character system itself
// (art/anime drawAnime: the rig, the anime head and hair, coat, pauldrons, Mitos armour and a
// fire greatsword), scaled up to boss size, then horns, a crown of flame and lava light on top.
// So the face, hair, cloth and motion are exactly as good as the heroes'.
import { drawAnime, ANIME } from '../src/art/anime/index.js';
import { part, glow, pal, far, Z } from '../src/art/anime/kit.js';
import { HERO_SCALE } from '../src/art/hero/index.js';

export const BOSS_SCALE = 2.3; // × the hero
const K = BOSS_SCALE * HERO_SCALE * 1.1 / Z; // art units → doll units, as art/hero drawHero scales a warrior
ANIME.warrior.OUTFITS.lavaking ||= {
  name: 'Raja Lava',
  coat: pal('#2a1e26', { shade: '#0e080e', hi: '#5a4450', rim: 'rgba(255,120,50,.85)' }),
  trim: '#ff8a2a',
  lining: pal('#a0201a', { shade: '#4a0808', hi: '#ff6a3a' }),
};
const HORN = pal('#2a2026', { shade: '#0c080c', hi: '#7a5e5a', rim: 'rgba(255,140,60,.9)' });
const LOOK = { style: 'long', hair: 'silver', eye: '#ff4a1a', element: 'fire', outfit: 'lavaking', gear: { weapon: 5, armor: 5, boots: 5, helm: null, amulet: 5, ring: 5 } };
const sharp = (pts) => pts.map(([x, y]) => [x, y, 1]);

// attack: 0..1 through a swing (null = idle). view: 'right' | 'front' | 'left' — a boss always faces
// the player, so it has no back view; left is the right view mirrored.
export function drawLavaKingV2(g, t, phase = 1, attack = null, view = 'right') {
  const hot = phase > 1 ? 1.5 : 1;
  glow(g, 0, -95 * K, 95 * K, 'rgba(255,90,30,.55)', 0.4 * hot);
  g.save(); g.scale(view === 'left' ? -K : K, K);
  const front = view === 'front';
  const at = drawAnime(g, 'warrior', LOOK, { t, view: front ? 'front' : 'side', attackPhase: front ? undefined : attack ?? undefined });
  if (front) { frontCrown(g, at.head, t, hot); g.restore(); return at; }
  // horns sweeping back from the temples, a crown of flame between them
  const [hx, hy] = at.head;
  for (const [ox, oy, P, k] of [[-6, -9, far(HORN), 0.85], [2, -11, HORN, 1]]) {
    part(g, sharp([[hx + ox - 3, hy + oy + 3], [hx + ox - 10 * k, hy + oy - 6 * k], [hx + ox - 22 * k, hy + oy - 9 * k], [hx + ox - 30 * k, hy + oy - 20 * k], [hx + ox - 18 * k, hy + oy - 13 * k], [hx + ox - 6 * k, hy + oy - 9 * k], [hx + ox + 3, hy + oy]]), P, { sd: 1.4, lw: 1.3 });
  }
  for (let i = 0; i < 5; i++) { const x = hx - 8 + i * 4, f = 0.7 + 0.3 * Math.sin(t * 8 + i * 2); glow(g, x, hy - 16 - f * 5, 6 * f * hot, '#ff8a2a', 0.85); glow(g, x, hy - 15 - f * 3, 2.6 * f, '#fff2b0', 0.95); }
  glow(g, hx + 6, hy + 1, 7 * hot, '#ff6a1a', 0.7); // burning eyes
  g.restore();
  return at;
}

// seen from the front: the horns curl out from both temples, the flames sit centred, two burning eyes
function frontCrown(g, [hx, hy], t, hot) {
  for (const s of [-1, 1]) {
    part(g, sharp([[hx + s * 5, hy - 7], [hx + s * 13, hy - 12], [hx + s * 24, hy - 13], [hx + s * 31, hy - 26], [hx + s * 21, hy - 21], [hx + s * 11, hy - 15], [hx + s * 4, hy - 4]]), HORN, { sd: 1.4, lw: 1.3 });
    glow(g, hx + s * 4.6, hy + 3, 6 * hot, '#ff6a1a', 0.75);
  }
  for (let i = 0; i < 5; i++) { const x = hx - 8 + i * 4, f = 0.7 + 0.3 * Math.sin(t * 8 + i * 2); glow(g, x, hy - 16 - f * 5, 6 * f * hot, '#ff8a2a', 0.85); glow(g, x, hy - 15 - f * 3, 2.6 * f, '#fff2b0', 0.95); }
}
