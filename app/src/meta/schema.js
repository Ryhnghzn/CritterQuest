// Save format (spec §9.2–9.3): version migration and validation. Pure — never
// touches storage, so corrupt data is only ever reported, never rewritten.
import { CLASSES } from '../data/classes.js';
import {
  SLOT_COUNT, NAME_MAX, HAIR_STYLES, HAIR_COLORS, CHAR_LEVEL_MAX, INVENTORY_MAX,
} from '../data/balance.js';

export const SAVE_VERSION = 1;

// MIGRATIONS[v] turns a version-v save into a version-(v+1) save.
export const MIGRATIONS = {};

const EQUIP_SLOTS = ['weapon', 'helm', 'armor', 'ring'];
const UPGRADES = ['hp', 'atk', 'magnet', 'potion'];
const RECORDS = ['bestTime', 'runs', 'kills', 'bossKills'];
const BASE_STATS = ['atk', 'maxHp', 'def'];
const BONUS_STATS = ['atk', 'maxHp', 'atkSpd', 'crit', 'moveSpd', 'cdr'];
const RARITY_MAX = 3;

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isInt = (v, min = -Infinity, max = Infinity) => Number.isInteger(v) && v >= min && v <= max;
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
export const nameLength = (s) => [...s].length; // counts emoji as one character

export function migrate(data, steps = MIGRATIONS, target = SAVE_VERSION) {
  if (!isObj(data) || !isInt(data.version, 1)) throw new Error('versi tidak dikenal');
  if (data.version > target) throw new Error(`versi ${data.version} lebih baru dari game (${target})`);
  let out = structuredClone(data);
  while (out.version < target) {
    const step = steps[out.version];
    if (!step) throw new Error(`tidak ada migrasi dari versi ${out.version}`);
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
    && it.bonuses.every((b) => isObj(b) && BONUS_STATS.includes(b.stat) && isNum(b.value));
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
  need(isObj(d.upgrades) && UPGRADES.every((k) => isInt(d.upgrades[k], 0)), 'upgrades');
  need(isObj(d.records) && RECORDS.every((k) => isInt(d.records[k], 0)), 'records');

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
  if (err.length) return { status: 'corrupt', reason: `field tidak sah: ${err.join(', ')}`, raw };
  return { status: 'ok', data };
}

// Settings (spec §9.2) have their own version: v2 added autoAttack.
export const SETTINGS_VERSION = 2;
const SETTINGS_MIGRATIONS = {
  1: (d) => ({ ...d, version: 2, autoAttack: false }),
};

// Raw settings → current-version settings, or null when unusable (caller uses defaults).
export function readSettings(raw) {
  let s;
  try { s = migrate(raw, SETTINGS_MIGRATIONS, SETTINGS_VERSION); } catch (_) { return null; }
  if (typeof s.muted !== 'boolean' || !isInt(s.lastSlot, 0, SLOT_COUNT - 1)
    || typeof s.autoAttack !== 'boolean') return null;
  return { version: SETTINGS_VERSION, muted: s.muted, lastSlot: s.lastSlot, autoAttack: s.autoAttack };
}
