// Save format (spec §9.2–9.3): version migration and validation. Pure — never
// touches storage, so corrupt data is only ever reported, never rewritten.
import { tr, t } from '../i18n.js';
import { CLASSES } from '../data/classes.js';
import {
  SLOT_COUNT, NAME_MAX, HAIR_STYLES, HAIR_COLORS, CHAR_LEVEL_MAX, INVENTORY_MAX, STASH_MAX, ATTRS, POINTS_PER_LEVEL, SKILL_SLOTS,
} from '../data/balance.js';
import { POTION_IDS, POTION_MAX, BELT_SIZE, DEFAULT_BELT } from '../data/potions.js';
import { BONUS_IDS, RARITIES, UNIQUES } from '../data/items.js';
import { DUNGEON_IDS } from '../data/dungeons.js';
import { START_TIME } from '../data/time.js';
import { MAT_IDS, GEM_IDS, GEM_TIERS, SOCKETS, ENHANCE } from '../data/forge.js';
import { SETTING_CHOICES, SETTING_DEFAULTS } from '../data/settings.js';
import { TALENTS, TALENT_IDS, TALENT_EVERY } from '../data/talents.js';
import { BOUNTY_COUNT, BOUNTY_KINDS, STARTER_BOUNTIES } from '../data/bounties.js';
import { BESTIARY_IDS } from '../data/collection.js';
import { TOWN_IDS, REGION_IDS, regionById, EXPEDITIONS, TREASURE } from '../data/world.js';
import { isFogValid } from './world.js';
import { WORLD } from '../data/worldmap.js';
import { MAIN, SIDE, QUEST_IDS } from '../data/quests.js';
import { MOUNT_DEFS, PITY_IDS } from '../data/mounts.js';
import { freshMounts, storyMounts } from './stable.js';

export const SAVE_VERSION = 22;

// MIGRATIONS[v] turns a version-v save into a version-(v+1) save. Malformed
// parts are passed through untouched so validation still reports them.
export const MIGRATIONS = {
  // v2 (spec §13.5): HP & potions persist between town and dungeon; shop
  // "starting potions" upgrade dropped; records follow dungeon floors.
  1: (d) => {
    const out = { ...d, version: 2, hp: null, potions: 0 };
    if (isObj(d.upgrades)) { const { potion, ...rest } = d.upgrades; out.upgrades = rest; }
    if (isObj(d.records)) {
      out.records = { bestFloor: 0, clears: 0, trips: d.records.runs, kills: d.records.kills, bossKills: d.records.bossKills };
    }
    return out;
  },
  // v3 (spec §14.3): stat points replace level-up cards; boots & amulet slots.
  2: (d) => {
    const out = { ...d, version: 3, attrs: { str: 0, vit: 0, agi: 0, dex: 0, luk: 0 } };
    if (isObj(d.equipped)) out.equipped = { ...d.equipped, boots: null, amulet: null };
    return out;
  },
  // v4 (spec §15.2): potions per type + a 4-slot belt; old potions are red ones.
  3: (d) => ({
    ...d, version: 4,
    potions: { ...Object.fromEntries(POTION_IDS.map((id) => [id, 0])), red: d.potions },
    belt: DEFAULT_BELT.slice(),
  }),
  // v5 (spec §18.3): records per dungeon; the old floor record belongs to the first one.
  4: (d) => {
    const out = { ...d, version: 5 };
    if (isObj(d.records)) {
      const { bestFloor, clears, ...rest } = d.records;
      out.records = { ...rest, dungeons: freshDungeonRecords() };
      out.records.dungeons.shadow = { bestFloor, clears };
    }
    return out;
  },
  // v6 (spec §18.4): the in-game clock is saved.
  5: (d) => ({ ...d, version: 6, clock: START_TIME }),
  // v7 (spec §20): materials & gems in the bag; items get a forge level and gem sockets.
  6: (d) => ({
    ...d, version: 7, mats: freshMats(), gems: freshGems(),
    inventory: Array.isArray(d.inventory)
      ? d.inventory.map((it) => (isObj(it) ? { ...it, plus: 0, sockets: Array(SOCKETS[it.rarity] ?? 0).fill(null) } : it))
      : d.inventory,
  }),
  // v8 (spec §21): skills worn on Q / E chosen from the class pool; talent ranks.
  7: (d) => ({
    ...d, version: 8,
    skills: Object.hasOwn(CLASSES, d.classId) ? CLASSES[d.classId].skills.slice(0, 2).map((s) => s.id) : ['', ''],
    talents: freshTalents(),
  }),
  // v9 (spec §22): four skill slots (keys 1–4); empty slots are null.
  8: (d) => ({ ...d, version: 9, skills: Array.isArray(d.skills) ? [...d.skills, null, null] : d.skills }),
  // v10 (spec §24): bounty board, Lencana, bestiary & unique codex (seeded from the bag).
  9: (d) => {
    const out = { ...d, version: 10, bounties: freshBounties(), marks: 0 };
    if (isObj(d.records)) {
      const uniques = Array.isArray(d.inventory) ? [...new Set(d.inventory.map((it) => it?.unique).filter(Boolean))] : [];
      out.records = { ...d.records, bestiary: freshBestiary(), uniques };
    }
    return out;
  },
  // v11 (spec §25.1): open world — last town, towns visited, explored regions.
  10: (d) => ({ ...d, version: 11, location: 'home', towns: ['home'], regions: {} }),
  // v12 (spec §25.5): bigger regions (old fog no longer fits), gates placed per character,
  // dungeons already entered count as found, expeditions.
  11: (d) => ({
    ...d, version: 12, regions: {}, expedition: null,
    world: { seed: worldSeed(isInt(d.createdAt) ? d.createdAt : 0, isInt(d.slot) ? d.slot : 0) },
    found: isObj(d.records) && isObj(d.records.dungeons)
      ? DUNGEON_IDS.filter((id) => d.records.dungeons[id]?.bestFloor > 0 || d.records.dungeons[id]?.clears > 0) : [],
  }),
  // v13 (spec §25.2): what was bought from the big-town merchants today, the Gudang.
  12: (d) => ({ ...d, version: 13, shops: {}, stash: [] }),
  // v14 (spec §25.3): hidden treasure chests already opened, per region.
  13: (d) => ({ ...d, version: 14, treasures: {} }),
  // v15 (spec §25.4): bestiary entries for the biome enemies.
  // v16 (spec §25.4): Makam Pasir — its dungeon record and its boss in the bestiary
  15: (d) => ({
    ...d, version: 16,
    records: isObj(d.records) && isObj(d.records.dungeons) && isObj(d.records.bestiary)
      ? { ...d.records, dungeons: { ...freshDungeonRecords(), ...d.records.dungeons }, bestiary: { ...freshBestiary(), ...d.records.bestiary } } : d.records,
  }),
  // v17 (spec §26): quests — the main quest starts at chapter 1 (synced to what was done when played).
  16: (d) => ({ ...d, version: 17, quests: freshQuests() }),
  // v18 (spec §26.7): Hantu Gerhana in the bestiary.
  // v19 (spec §26.7): Menara Gerhana's record, Sang Gerhana in the bestiary, when the story was first finished.
  18: (d) => ({
    ...d, version: 19,
    records: isObj(d.records) && isObj(d.records.dungeons) && isObj(d.records.bestiary)
      ? { ...d.records, dungeons: { ...freshDungeonRecords(), ...d.records.dungeons }, bestiary: { ...freshBestiary(), ...d.records.bestiary }, ending: null } : d.records,
  }),
  // v20: bounties are taken from the board before they count; a task already moving counts as taken.
  19: (d) => ({ ...d, version: 20, bounties: Array.isArray(d.bounties) ? d.bounties.map((b) => (isObj(b) ? { ...b, taken: isInt(b.have) && b.have > 0 } : b)) : d.bounties }),
  // v21 (spec §35.2): the Stable — owned mounts. Story mounts already earned are granted here.
  20: (d) => {
    const out = { ...d, version: 21, mounts: freshMounts() };
    if (isObj(out.quests) && Array.isArray(out.quests.done) && isObj(out.records)) storyMounts(out);
    return out;
  },
  // v22 (spec §40): one connected world — one fog for the world (the old regions' fog no longer
  // fits), regions only mark the zones set foot in.
  21: (d) => ({
    ...d, version: 22,
    world: isObj(d.world) ? { ...d.world, fog: '' } : d.world,
    regions: isObj(d.regions) ? Object.fromEntries(Object.keys(d.regions).map((id) => [id, {}])) : d.regions,
  }),
  17: (d) => ({ ...d, version: 18, records: isObj(d.records) && isObj(d.records.bestiary) ? { ...d.records, bestiary: { ...freshBestiary(), ...d.records.bestiary } } : d.records }),
  14: (d) => ({ ...d, version: 15, records: isObj(d.records) && isObj(d.records.bestiary) ? { ...d.records, bestiary: { ...freshBestiary(), ...d.records.bestiary } } : d.records }),
};

export const worldSeed = (now, slot) => (Math.floor(Math.abs(now)) + slot * 7919) % 2147483647;

export const freshBounties = () => structuredClone(STARTER_BOUNTIES);
export const freshBestiary = () => Object.fromEntries(BESTIARY_IDS.map((id) => [id, 0]));
export const freshTalents = () => Object.fromEntries(TALENT_IDS.map((id) => [id, 0]));
export const freshMats = () => Object.fromEntries(MAT_IDS.map((id) => [id, 0]));
export const freshGems = () => Object.fromEntries(GEM_IDS.map((id) => [id, Array(GEM_TIERS).fill(0)]));

export const freshQuests = () => ({ main: { ch: 0, step: 0, prog: 0 }, side: {}, done: [], track: null });

export const freshDungeonRecords = () => Object.fromEntries(DUNGEON_IDS.map((id) => [id, { bestFloor: 0, clears: 0 }]));

export const EQUIP_SLOTS = ['weapon', 'helm', 'armor', 'boots', 'amulet', 'ring'];
const ATTR_IDS = ATTRS.map((a) => a.id);
const UPGRADES = ['hp', 'atk', 'magnet'];
const RECORDS = ['trips', 'kills', 'bossKills'];
const BASE_STATS = ['atk', 'maxHp', 'def', 'moveSpd', 'crit'];
const RARITY_MAX = RARITIES.length - 1;
const UNIQUE_IDS = UNIQUES.map((u) => u.id);

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isInt = (v, min = -Infinity, max = Infinity) => Number.isInteger(v) && v >= min && v <= max;
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
export const nameLength = (s) => [...s].length; // counts emoji as one character

export function migrate(data, steps = MIGRATIONS, target = SAVE_VERSION) {
  if (!isObj(data) || !isInt(data.version, 1)) throw new Error(tr('versi tidak dikenal'));
  if (data.version > target) throw new Error(t('versi {v} lebih baru dari game ({max})', { v: data.version, max: target }));
  let out = structuredClone(data);
  while (out.version < target) {
    const step = steps[out.version];
    if (!step) throw new Error(t('tidak ada migrasi dari versi {v}', { v: out.version }));
    out = step(out);
  }
  return out;
}

function validateItem(it) {
  return isObj(it)
    && typeof it.id === 'string' && it.id.length > 0
    && EQUIP_SLOTS.includes(it.slot)
    && (it.slot === 'weapon' ? Object.hasOwn(CLASSES, it.classId) : it.classId === null)
    && isInt(it.variant, 0)
    && isInt(it.rarity, 0, RARITY_MAX)
    && isInt(it.itemLevel, 1)
    && isObj(it.base) && Object.entries(it.base).every(([k, v]) => BASE_STATS.includes(k) && isNum(v))
    && Array.isArray(it.bonuses)
    && it.bonuses.every((b) => isObj(b) && BONUS_IDS.includes(b.stat) && isNum(b.value))
    && (it.unique === undefined || it.unique === null || UNIQUE_IDS.includes(it.unique))
    && isInt(it.plus, 0, ENHANCE.max)
    && Array.isArray(it.sockets) && it.sockets.length === SOCKETS[it.rarity]
    && it.sockets.every((s) => s === null || (isObj(s) && GEM_IDS.includes(s.gem) && isInt(s.tier, 1, GEM_TIERS)));
}

// Returns a list of problems; empty means the slot is valid for SAVE_VERSION.
export function validateSlot(d) {
  if (!isObj(d)) return ['bukan objek'];
  const err = [];
  const need = (ok, field) => { if (!ok) err.push(field); };
  need(d.version === SAVE_VERSION, 'version');
  need(isInt(d.slot, 0, SLOT_COUNT - 1), 'slot');
  need(isInt(d.createdAt, 0) && isInt(d.updatedAt, 0), 'createdAt/updatedAt');
  need(typeof d.name === 'string' && d.name === d.name.trim()
    && nameLength(d.name) >= 1 && nameLength(d.name) <= NAME_MAX, 'name');
  need(isObj(d.look) && isInt(d.look.hair, 0, HAIR_STYLES - 1)
    && isInt(d.look.hairColor, 0, HAIR_COLORS - 1), 'look');
  need(Object.hasOwn(CLASSES, d.classId), 'classId');
  need(isInt(d.level, 1, CHAR_LEVEL_MAX), 'level');
  need(isInt(d.exp, 0), 'exp');
  need(isInt(d.gold, 0), 'gold');
  need(isInt(d.clock, 0), 'clock');
  need(isObj(d.mats) && MAT_IDS.every((k) => isInt(d.mats[k], 0)), 'mats');
  const pool = Object.hasOwn(CLASSES, d.classId) ? CLASSES[d.classId].skills.map((s) => s.id) : [];
  const worn = Array.isArray(d.skills) ? d.skills.filter((id) => id !== null) : [];
  need(Array.isArray(d.skills) && d.skills.length === SKILL_SLOTS && new Set(worn).size === worn.length && worn.every((id) => pool.includes(id)), 'skills');
  const talentsOk = isObj(d.talents) && TALENTS.every((t) => isInt(d.talents[t.id], 0, t.max));
  need(talentsOk, 'talents');
  if (talentsOk && isInt(d.level, 1)) need(Object.values(d.talents).reduce((a, b) => a + b, 0) <= Math.floor(d.level / TALENT_EVERY), 'talents: poin melebihi level');
  need(isObj(d.gems) && GEM_IDS.every((k) => Array.isArray(d.gems[k]) && d.gems[k].length === GEM_TIERS && d.gems[k].every((n) => isInt(n, 0))), 'gems');
  need(d.hp === null || isInt(d.hp, 0), 'hp');
  need(isInt(d.marks, 0), 'marks');
  need(TOWN_IDS.includes(d.location) && Array.isArray(d.towns) && d.towns.every((id) => TOWN_IDS.includes(id))
    && new Set(d.towns).size === d.towns.length && d.towns.includes(d.location), 'location/towns');
  need(isObj(d.world) && isInt(d.world.seed, 0) && isFogValid(d.world.fog, WORLD), 'world');
  need(Array.isArray(d.found) && d.found.every((id) => DUNGEON_IDS.includes(id)) && new Set(d.found).size === d.found.length, 'found');
  need(d.expedition === null || (isObj(d.expedition) && Object.hasOwn(EXPEDITIONS, d.expedition.dungeon)
    && isInt(d.expedition.need, 1) && isInt(d.expedition.have, 0, d.expedition.need)), 'expedition');
  need(isObj(d.regions) && Object.entries(d.regions).every(([id, r]) => REGION_IDS.includes(id) && isObj(r)), 'regions');
  need(Array.isArray(d.bounties) && d.bounties.length === BOUNTY_COUNT && d.bounties.every((b) => isObj(b)
    && Object.hasOwn(BOUNTY_KINDS, b.kind) && (b.target === null || typeof b.target === 'string')
    && isInt(b.need, 1) && isInt(b.have, 0, b.need) && typeof b.taken === 'boolean' && (b.taken || b.have === 0)), 'bounties');
  need(isObj(d.records) && isObj(d.records.bestiary) && BESTIARY_IDS.every((id) => isInt(d.records.bestiary[id], 0)), 'records.bestiary');
  need(isObj(d.records) && Array.isArray(d.records.uniques) && d.records.uniques.every((id) => UNIQUE_IDS.includes(id))
    && new Set(d.records.uniques).size === d.records.uniques.length, 'records.uniques');
  const ms = d.mounts;
  need(isObj(ms) && isObj(ms.owned) && isObj(ms.skin) && isObj(ms.pity)
    && Object.entries(ms.owned).every(([id, sk]) => MOUNT_DEFS[id] && Array.isArray(sk) && sk.length >= 1 && new Set(sk).size === sk.length && sk.every((i) => isInt(i, 0, MOUNT_DEFS[id].skins - 1)))
    && (ms.active === null || Object.hasOwn(ms.owned, ms.active))
    && Object.entries(ms.skin).every(([id, i]) => ms.owned[id]?.includes(i))
    && Object.entries(ms.pity).every(([id, n]) => PITY_IDS.includes(id) && isInt(n, 0)), 'mounts');
  need(isObj(d.potions) && POTION_IDS.every((id) => isInt(d.potions[id], 0, POTION_MAX))
    && Object.keys(d.potions).length === POTION_IDS.length, 'potions');
  need(Array.isArray(d.belt) && d.belt.length === BELT_SIZE
    && d.belt.every((id) => id === null || POTION_IDS.includes(id)), 'belt');
  need(isObj(d.upgrades) && UPGRADES.every((k) => isInt(d.upgrades[k], 0)), 'upgrades');
  need(isObj(d.records) && RECORDS.every((k) => isInt(d.records[k], 0)) && (d.records.ending === null || isInt(d.records.ending, 0)), 'records');
  need(isObj(d.records) && isObj(d.records.dungeons) && DUNGEON_IDS.every((id) => {
    const r = d.records.dungeons[id];
    return isObj(r) && isInt(r.bestFloor, 0, 5) && isInt(r.clears, 0);
  }), 'records.dungeons');
  const attrsOk = isObj(d.attrs) && ATTR_IDS.every((k) => isInt(d.attrs[k], 0));
  need(attrsOk, 'attrs');
  if (attrsOk && isInt(d.level, 1)) {
    const spent = ATTR_IDS.reduce((n, k) => n + d.attrs[k], 0);
    need(spent <= POINTS_PER_LEVEL * (d.level - 1), 'attrs: poin melebihi level');
  }

  const q = d.quests, sideDef = (id) => SIDE.find((x) => x.id === id);
  need(isObj(q) && isObj(q.main) && isInt(q.main.ch, 0, MAIN.length) && isInt(q.main.prog, 0)
    && (q.main.ch === MAIN.length ? q.main.step === 0 : isInt(q.main.step, 0, MAIN[q.main.ch].steps.length - 1))
    && isObj(q.side) && Object.entries(q.side).every(([id, st]) => sideDef(id) && isObj(st) && isInt(st.step, 0, sideDef(id).steps.length - 1) && isInt(st.prog, 0))
    && Array.isArray(q.done) && q.done.every((id) => QUEST_IDS.includes(id)) && new Set(q.done).size === q.done.length
    && (q.track === null || QUEST_IDS.includes(q.track)), 'quests');
  need(isObj(d.treasures) && Object.entries(d.treasures).every(([id, list]) => REGION_IDS.includes(id) && Array.isArray(list)
    && list.every((i) => isInt(i, 0, TREASURE.count - 1)) && new Set(list).size === list.length), 'treasures');
  need(isObj(d.shops) && Object.entries(d.shops).every(([k, v]) => /^[a-z]+:[a-z]+$/.test(k) && TOWN_IDS.includes(k.split(':')[0])
    && isObj(v) && isInt(v.day) && isObj(v.sold) && Object.values(v.sold).every((n) => isInt(n, 1))), 'shops');
  const stash = Array.isArray(d.stash) && d.stash.length <= STASH_MAX ? d.stash : null;
  need(stash, 'stash');
  if (stash) {
    stash.forEach((it, i) => need(validateItem(it), `stash[${i}]`));
    need(new Set(stash.map((it) => it?.id)).size === stash.length, 'stash: id ganda');
  }
  const inv = Array.isArray(d.inventory) && d.inventory.length <= INVENTORY_MAX ? d.inventory : null;
  need(inv, 'inventory');
  if (inv) {
    inv.forEach((it, i) => need(validateItem(it), `inventory[${i}]`));
    need(new Set(inv.map((it) => it?.id)).size === inv.length, 'inventory: id ganda');
  }
  need(isObj(d.equipped), 'equipped');
  if (isObj(d.equipped)) {
    for (const slot of EQUIP_SLOTS) {
      const id = d.equipped[slot];
      if (id === null) continue;
      const it = inv && inv.find((x) => x?.id === id);
      need(it && it.slot === slot, `equipped.${slot}`);
    }
  }
  return err;
}

// Raw value from storage → { status: 'ok', data } | { status: 'corrupt', reason, raw }.
export function readSlot(raw) {
  let data;
  try { data = migrate(raw); } catch (e) { return { status: 'corrupt', reason: e.message, raw }; }
  const err = validateSlot(data);
  if (err.length) return { status: 'corrupt', reason: t('field tidak sah: {list}', { list: err.join(', ') }), raw };
  return { status: 'ok', data };
}

// Settings (spec §9.2) have their own version: v2 added autoAttack, v4 the effects level,
// v5 the Settings menu (spec §29), v6 the camera turn speed.
export const SETTINGS_VERSION = 6;
const SETTINGS_MIGRATIONS = {
  1: (d) => ({ ...d, version: 2, autoAttack: false }),
  2: (d) => ({ ...d, version: 3, lang: 'en' }), // spec §23: English by default
  3: (d) => ({ ...d, version: 4, effects: 'full' }), // plan "Efek Lebay" §A
  // v5: 'full' meant "full, dropping to lite on low FPS" — that is now 'auto'
  4: (d) => ({ ...d, version: 5, effects: d.effects === 'full' ? 'auto' : d.effects, ...SETTING_DEFAULTS }),
  5: (d) => ({ ...d, version: 6, camSens: 'normal' }),
};
const pickOf = (key) => (v) => SETTING_CHOICES[key].includes(v);
const isVol = (v) => isInt(v, 0, 100);
const isBool = (v) => typeof v === 'boolean';
const SETTING_CHECKS = {
  muted: isBool, lastSlot: (v) => isInt(v, 0, SLOT_COUNT - 1), autoAttack: isBool, lang: pickOf('lang'), effects: pickOf('effects'),
  musicVol: isVol, sfxVol: isVol, view: pickOf('view'), sharp: pickOf('sharp'), showFps: isBool, shake: isBool, dmgNumbers: isBool, zoom: pickOf('zoom'), camSens: pickOf('camSens'),
};

// Raw settings → current-version settings, or null when unusable (caller uses defaults).
export function readSettings(raw) {
  let s;
  try { s = migrate(raw, SETTINGS_MIGRATIONS, SETTINGS_VERSION); } catch (_) { return null; }
  if (!Object.entries(SETTING_CHECKS).every(([k, ok]) => ok(s[k]))) return null;
  return { version: SETTINGS_VERSION, ...Object.fromEntries(Object.keys(SETTING_CHECKS).map((k) => [k, s[k]])) };
}

export const freshSettings = (muted = false) => ({ version: SETTINGS_VERSION, muted, lastSlot: 0, autoAttack: false, lang: 'en', effects: 'auto', ...SETTING_DEFAULTS });
