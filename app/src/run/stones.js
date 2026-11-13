// Lingkaran Batu (plan docs/superpowers/plans/2026-11-13-eksplorasi.md bagian A): some of the world's ruins —
// rings of standing stones that are only scenery by day — wake at night. Their runes glow; standing in the middle
// for a moment gives a small gift, once a night each. No marker on the map: they are found by looking.
// Pure logic on the run (no DOM); the 3D view reads run.stonesLit.
import { t } from '../i18n.js';
import { rand, rint } from '../core/rng.js';
import { STONES } from '../data/world.js';
import { chunksNear } from './worldmap.js';
import { addMats } from './dungeon.js';
import { GEM_IDS, GEMS } from '../data/forge.js';
import { sfx } from '../core/audio.js';

// which ruins wake: one in STONES.every, picked from where it stands (the same in every save)
export const ruinKey = (ru) => `${Math.round(ru.x)}:${Math.round(ru.y)}`;
export function wakes(ru) {
  const h = Math.imul(Math.round(ru.x) * 73856093 ^ Math.round(ru.y) * 19349663, 2654435761) >>> 0;
  return h % STONES.every === 0;
}
// which night it is (a night runs 18:00 → 05:00, counted from its evening)
export const nightOf = (clock) => Math.floor(((clock || 0) - 18 * 60) / 1440);

// Each step in the world: the awake rings near the player (run.stonesLit, for the view), noticing them,
// standing in them, the gift.
export function stepStones(run, dt) {
  const lit = run.stonesLit || (run.stonesLit = []);
  lit.length = 0;
  if (run.phase !== 'moon' || !run.fmap?.cols) return;
  const st = run.stones || (run.stones = { seen: new Set(), got: new Map(), hold: 0, at: null });
  const night = nightOf(run.clock), v = run.vfx;
  for (const c of chunksNear(run.fmap, run.px, run.py, 1)) {
    for (const ru of c.ruins || []) {
      if (!wakes(ru)) continue;
      const key = ruinKey(ru), spent = st.got.get(key) === night;
      const d2 = (run.px - ru.x) ** 2 + (run.py - ru.y) ** 2;
      if (d2 > (STONES.seen + 300) ** 2) continue;
      const here = !spent && d2 < (ru.r * STONES.inner) ** 2;
      if (here) { if (st.at !== key) { st.at = key; st.hold = 0; } st.hold += dt; } else if (st.at === key) st.hold = Math.max(0, st.hold - dt * 2);
      lit.push({ x: ru.x, y: ru.y, r: ru.r, spent, hold: st.at === key ? Math.min(1, st.hold / STONES.hold) : 0 });
      if (spent) continue;
      if (d2 < STONES.seen ** 2 && !st.seen.has(`${key}@${night}`)) { // seen: a wondering line, a chime
        st.seen.add(`${key}@${night}`);
        run.addFloater(run.px, run.py - 50, t('Batu-batu itu bercahaya…'), '#9fd8ff');
        sfx.glint();
      }
      if (v) for (let i = Math.floor(STONES.glow * v.mul * dt + v.rand()); i > 0; i--) { // motes rising off the stones
        const a = v.rand() * Math.PI * 2;
        v.spawn(v.rand() < 0.3 ? 'star' : 'dot', ru.x + Math.cos(a) * ru.r, ru.y + Math.sin(a) * ru.r, 0, -v.range(15, 35), v.range(0.6, 1.1), v.range(1.4, 2.4), ['#9fd8ff', '#c9b8ff', '#ffffff'], 0.97, -12);
      }
      if (here && st.hold >= STONES.hold) gift(run, ru, key, night);
    }
  }
}

function gift(run, ru, key, night) {
  const st = run.stones, G = STONES.gift;
  st.got.set(key, night); st.hold = 0; st.at = null;
  const mats = { dust: rint(G.dust[0], G.dust[1]), crystal: rint(G.crystal[0], G.crystal[1]) };
  run.addFloater(ru.x, ru.y - 40, t('Lingkaran batu memberimu hadiah'), '#9fd8ff');
  addMats(run, mats, 0, -70); // its own +n lines
  if (rand() < G.gem) { // rewards from the simulation's RNG (effects keep their own)
    const gem = GEM_IDS[Math.floor(rand() * GEM_IDS.length)];
    run.gemsFound.push({ gem, tier: Math.min(4, 1 + Math.floor(run.level / 15)) });
    run.addFloater(ru.x, ru.y - 88, `+${GEMS[gem].name}`, GEMS[gem].color);
  }
  run.vfx?.ring(ru.x, ru.y, { r0: 10, r1: ru.r * 1.2, life: 0.6, color: '#9fd8ff', width: 4 });
  run.vfx?.burst('stars', ru.x, ru.y, ['#ffffff', '#9fd8ff', '#c9b8ff'], { n: 14 });
  run.eventsDone.push(`stones:${key}`); // saves the gift at once (main.js); no quest knows this key
  sfx.glint();
}
