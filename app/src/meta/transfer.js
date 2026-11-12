// Export / import of one save slot (spec §9.3, langkah 6B). Pure: the file text in and out; the DOM
// (download, file picker) lives in main.js. A file holds { game, version, exported, save }; a bare slot
// object (an older or hand-made file) is accepted too. Imports go through migrate + validate like a load.
import { readSlot } from './schema.js';
import { t } from '../i18n.js';

export const FILE_TAG = 'critter-quest';

// file name: critter-quest-<name>.json (letters, digits, - and _ only)
export function exportName(name) {
  const safe = String(name || 'save').normalize('NFKD').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'save';
  return `${FILE_TAG}-${safe}.json`;
}
// raw: the slot's stored data (also a corrupt one, to rescue it)
export function exportText(raw, now) {
  return JSON.stringify({ game: FILE_TAG, version: raw?.version ?? null, exported: now, save: raw }, null, 1);
}

// → { ok: true, data } (migrated, valid, placed in `slot`) or { ok: false, reason }
export function importText(text, slot, now) {
  let obj;
  try { obj = JSON.parse(text); } catch { return { ok: false, reason: t('bukan file JSON') }; }
  const raw = obj && typeof obj === 'object' && obj.game === FILE_TAG ? obj.save : obj;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, reason: t('bukan save Critter Quest') };
  const r = readSlot(structuredClone(raw));
  if (r.status !== 'ok') return { ok: false, reason: r.reason };
  return { ok: true, data: { ...r.data, slot, updatedAt: now } };
}
