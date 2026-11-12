// The place being entered, for the loading screen's destination card (spec §46): its name, what
// it is, the enemy levels, the enemies one meets there (seen in the bestiary or not yet), the boss
// of a dungeon and the quest being followed. Pure.
import { TOWNS, REGIONS } from '../data/world.js';
import { dungeonById, BOSS_TYPES } from '../data/dungeons.js';
import { ENEMIES } from '../data/enemies.js';
import { activeQuests } from './quests.js';
import { powerOf, placeRec, powerTone } from './power.js';

const seenOf = (char, id) => (char?.records?.bestiary?.[id] || 0) > 0;
const foe = (char, id) => ({ id, name: ENEMIES[id].name, seen: seenOf(char, id) });

// kind: 'town' | 'region' | 'dungeon'; id: the town, region or dungeon id. max: enemies listed.
// Returns null for an unknown place.
export function destinationInfo(char, kind, id, max = 4) {
  let out = null;
  if (kind === 'town') {
    const t = TOWNS[id];
    if (t) out = { kind, id, name: t.name, levels: null, foes: [], boss: null };
  } else if (kind === 'region') {
    const r = REGIONS.find((x) => x.id === id);
    if (r) {
      const ids = Object.entries(r.enemies || {}).sort((a, b) => b[1] - a[1]).map(([e]) => e).filter((e) => ENEMIES[e]);
      out = { kind, id, name: r.name, levels: r.levels, foes: ids.slice(0, max).map((e) => foe(char, e)), boss: null };
    }
  } else if (kind === 'dungeon') {
    const d = dungeonById(id);
    if (d) {
      const count = {};
      let boss = null;
      for (const f of d.floors) for (const w of f.waves) for (const [e, n] of Object.entries(w.mix)) {
        if (BOSS_TYPES.includes(e) || ENEMIES[e]?.boss) { boss = boss || e; continue; }
        if (ENEMIES[e]) count[e] = (count[e] || 0) + n;
      }
      const ids = Object.entries(count).sort((a, b) => b[1] - a[1]).map(([e]) => e);
      out = { kind, id, name: d.name, levels: null, floors: d.floors.length, foes: ids.slice(0, max).map((e) => foe(char, e)), boss: boss ? foe(char, boss) : null };
    }
  }
  if (!out) return null;
  // Power (spec §47.6): yours against the place's recommended range; the colour follows its hardest end
  const rec = placeRec(out.kind, out.id, out.levels, out.floors);
  out.power = char?.classId && rec ? { mine: powerOf(char), lo: rec.lo, hi: rec.hi, tone: powerTone(powerOf(char), rec.hi) } : null;
  // the quest followed (the tracked one, else the main story)
  const list = char?.quests ? activeQuests(char) : [];
  const a = list.find((q) => q.id === char.quests.track) || list[0];
  out.quest = a?.step ? { title: a.def.title, main: !!a.def.main, ch: a.def.ch, step: a.step } : null;
  return out;
}
