// Peta Usang (plan docs/superpowers/plans/2026-11-13-eksplorasi.md bagian B): an elite in the world may drop an
// old map. It shows a circle on the map, not a point: somewhere in it a mound of earth waits, seen only up close.
// Standing on it digs up a chest's haul — sometimes a pack comes out first. Only for this trip (not saved), but
// what is dug up is saved at once. Pure logic on the run; the views read run.oldMap.
import { t } from '../i18n.js';
import { rand, rrange } from '../core/rng.js';
import { OLD_MAP } from '../data/world.js';
import { blocked, inHub, zoneAt } from './worldmap.js';
import { spawnGroup, treasureLoot } from './field.js';
import { sfx } from '../core/audio.js';

let mapN = 0;
// A slain enemy: an elite in the world may leave a map (when none is being followed)
export function mapDrop(run, e) {
  if (!run.field || !e.elite || e.boss || e.mini || run.oldMap || !run.fmap?.cols) return null;
  if (rand() >= OLD_MAP.chance) return null;
  return placeMap(run);
}
export function placeMap(run) {
  const M = OLD_MAP;
  for (let i = 0; i < 16; i++) {
    const a = rand() * Math.PI * 2, d = rrange(M.dist[0], M.dist[1]), x = run.px + Math.cos(a) * d, y = run.py + Math.sin(a) * d;
    if (blocked(run.fmap, x, y, 60) || inHub(x, y) || zoneAt(run.fmap, x, y) === 'eclipse') continue;
    const off = rand() * M.hint * 0.3, b = rand() * Math.PI * 2; // the circle is not centred on it
    run.oldMap = { key: `oldmap:${++mapN}`, x, y, hx: x + Math.cos(b) * off, hy: y + Math.sin(b) * off, r: M.hint, hold: 0, seen: false, trap: rand() < M.trap };
    run.showBanner(t('Peta Usang! Ada lingkaran di petamu (M).'));
    sfx.glint();
    return run.oldMap;
  }
  return null;
}

// Each step in the world: noticing the mound, digging it
export function stepOldMap(run, dt) {
  const m = run.oldMap;
  if (!m || !run.field) return;
  const d2 = (run.px - m.x) ** 2 + (run.py - m.y) ** 2;
  if (!m.seen && d2 < OLD_MAP.seen ** 2) { m.seen = true; run.addFloater(run.px, run.py - 50, t('Tanah di sini pernah digali…'), '#e8c48a'); sfx.glint(); }
  if (d2 < OLD_MAP.dig ** 2) m.hold += dt; else m.hold = Math.max(0, m.hold - dt * 2);
  if (m.hold < OLD_MAP.hold) return;
  run.oldMap = null;
  run.vfx?.burst('smoke', m.x, m.y, ['#8a6a48', '#5a4632'], { n: 12, speed: 1.3 });
  if (m.trap) { // something was waiting under it
    const made = spawnGroup(run, m.x, m.y, OLD_MAP.pack, zoneAt(run.fmap, m.x, m.y));
    if (made[0]) { made[0].elite = true; made[0].hp *= 3; made[0].maxHp = made[0].hp; made[0].r *= 1.3; }
    run.showBanner(t('Jebakan! Sesuatu menjaga harta ini.'));
    run.addShake?.('medium');
  } else run.showBanner(t('Harta terkubur ditemukan!'));
  treasureLoot(run, m.x, m.y, false);
  run.eventsDone.push(m.key); // saves the haul at once (main.js); no quest knows this key
}
