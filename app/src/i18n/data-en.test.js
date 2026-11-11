// localizeData mutates the shared data modules, so it lives in its own test file
// (Vitest isolates modules per file) and never leaks English into other tests.
import { describe, it, expect, beforeAll } from 'vitest';
import { setLang } from '../i18n.js';
import { localizeData } from './data-en.js';
import { CLASSES } from '../data/classes.js';
import { RARITIES, SLOTS, VARIANTS, BONUSES, EFFECTS, UNIQUES, CHESTS } from '../data/items.js';
import { MARK_SHOP } from '../data/bounties.js';
import { MAJESTIC_MOUNTS } from '../art/mounts.js';
import { REGIONS, TOWNS } from '../data/world.js';
import { ENEMIES, AFFIXES } from '../data/enemies.js';
import { DUNGEONS } from '../data/dungeons.js';
import { POTIONS } from '../data/potions.js';
import { MATS, GEMS, GEM_TIER_NAMES } from '../data/forge.js';
import { UMUM, PASSIVES } from '../data/skilltree.js';
import { UPGRADES } from '../data/shop.js';
import { ATTRS } from '../data/balance.js';
import { PHASES } from '../data/time.js';
import { TOWN_DEFS } from '../data/towns.js';
import { HAIR_NAMES, HAIR_COLOR_NAMES } from '../art/doll.js';
import { itemName, statText, effectText } from '../meta/itemgen.js';

// every display string of the data, in a fixed order
function strings() {
  const out = [];
  for (const c of Object.values(CLASSES)) {
    out.push(c.desc);
    for (const s of [...c.skills, c.ult].filter(Boolean)) out.push(s.name, s.desc);
  }
  out.push(...RARITIES.map((r) => r.name), ...Object.values(SLOTS).map((s) => s.name));
  for (const list of Object.values(VARIANTS.weapon)) out.push(...list);
  for (const [k, list] of Object.entries(VARIANTS)) if (k !== 'weapon') out.push(...list);
  for (const b of Object.values(BONUSES)) out.push(b.suffix);
  out.push(...Object.values(EFFECTS).map((e) => e.desc), ...UNIQUES.map((u) => u.name), ...Object.values(CHESTS).map((c) => c.name));
  for (const o of MARK_SHOP) out.push(o.name, o.desc);
  for (const m of MAJESTIC_MOUNTS) out.push(m.name, m.desc, m.tag, ...m.skins.map((s) => s.name));
  out.push(...REGIONS.map((r) => r.name), ...Object.values(TOWNS).map((tw) => tw.name));
  out.push(...Object.values(ENEMIES).map((e) => e.name).filter((n) => n !== 'Golem'));
  out.push(...Object.values(AFFIXES).map((a) => a.name));
  for (const d of DUNGEONS) out.push(d.name, d.short);
  for (const p of Object.values(POTIONS)) out.push(p.name, p.desc);
  out.push(...Object.values(MATS).map((m) => m.name), ...Object.values(GEMS).map((g) => g.name), ...GEM_TIER_NAMES);
  for (const t of [...UMUM, ...Object.values(PASSIVES).flat()]) out.push(t.name, t.desc);
  for (const u of Object.values(UPGRADES)) out.push(u.name, u.desc);
  out.push(...ATTRS.slice(1).map((a) => a.desc), ...PHASES.map((p) => p.name));
  out.push(...HAIR_NAMES.filter((h) => h !== 'Bob'), ...HAIR_COLOR_NAMES);
  for (const def of Object.values(TOWN_DEFS)) out.push(...def.buildings.map((b) => b.name).filter(Boolean), ...Object.values(def.interiors).map((r) => r.name));
  for (const n of new Set(Object.values(TOWN_DEFS).flatMap((d) => [...d.npcs, ...Object.values(d.interiors).flatMap((r) => r.npcs || [])]))) {
    if (n.title) out.push(n.title);
    out.push(...(n.lines || []));
  }
  return out;
}

// words that are the same in both languages
const SAME = ['Meteor', 'Shuriken', 'Armor', 'Yeti', 'Salamander', 'EXP +{v}%', 'Lava', 'ATK +3%', 'ATK +5%', 'Magnet +20', 'Griffin', 'Aurora'];

const item = (o) => ({ slot: 'weapon', classId: 'warrior', variant: 1, rarity: 1, itemLevel: 5, base: {}, bonuses: [], unique: null, plus: 0, sockets: [], ...o });

describe('localizeData (English)', () => {
  let before;
  beforeAll(() => {
    before = strings();
    setLang('en');
    localizeData();
  });

  it('translates every display string (proper names excepted)', () => {
    const after = strings();
    expect(after).toHaveLength(before.length);
    const same = before.filter((s, i) => s === after[i] && !SAME.includes(s));
    expect(same).toEqual([]);
  });

  it('reads naturally in English', () => {
    expect(CLASSES.warrior.desc).toBe('Thick-blooded, cleaves up close.');
    expect(CLASSES.mage.skills.find((s) => s.id === 'nova').name).toBe('Frost Nova');
    expect(VARIANTS.weapon.warrior[0]).toBe('Wooden Sword');
    expect(VARIANTS.ring[6]).toBe('Eternal Ring');
    expect(SLOTS.helm.name).toBe('Helmet');
    expect(RARITIES.map((r) => r.name)).toEqual(['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic']);
    expect(UNIQUES.find((u) => u.name === 'Phoenix Ring')).toBeTruthy();
    expect(ENEMIES.slink.name).toBe('Ooze');
    expect(DUNGEONS[0].name).toBe('Shadow Crypt');
    expect(MATS.dust.name).toBe('Rune Dust');
    expect(PHASES.map((p) => p.name)).toEqual(['Morning', 'Day', 'Evening', 'Night']);
    const odo = TOWN_DEFS.home.npcs.find((n) => n.name === 'Old Odo');
    expect(odo.title).toBe('Town Elder');
    expect(odo.lines).toContain('This bonfire has never gone out since the town was founded.');
  });

  it('names the mounts and their colours', () => {
    expect(MAJESTIC_MOUNTS.map((m) => m.name)).toEqual(['War Horse', 'Great Wolf', 'Stag of Light', 'Royal Lion', 'White Tiger', 'Dawn Pegasus', 'Griffin', 'Dragon', 'Sky Whale']);
    expect(MAJESTIC_MOUNTS[0].skins.map((s) => s.name)).toEqual(['Chestnut', 'Snow White', 'Noble Black']);
    expect(MARK_SHOP.find((o) => o.id === 'lion')).toMatchObject({ name: 'Royal Lion', desc: 'Epic mount · Max HP +5%' });
  });

  it('puts the bonus word in front and uses a decimal point', () => {
    expect(itemName(item({ bonuses: [{ stat: 'atkSpd', value: 0.04 }] }))).toBe('Swift Iron Sword');
    expect(itemName(item({ plus: 3 }))).toBe('+3 Iron Sword');
    expect(statText('atkSpd', 0.045)).toBe('+4.5% Attack speed');
    expect(effectText(item({ unique: UNIQUES[0].id }))).not.toContain(',');
  });
});
