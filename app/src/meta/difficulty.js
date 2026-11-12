// Difficulty & the Rift's record (spec §41.3). Pure: changes return { ok: true, char } or { ok: false, reason }
// ('locked' | 'same' | 'bad').
import { DIFFICULTY } from '../data/difficulty.js';

// which levels this character may pick: Neraka only after the story was finished on Sulit or Neraka
export const levelOpen = (char, id) => !!DIFFICULTY[id] && (id !== 'hell' || !!char.unlocked?.hell);

export function setDifficulty(char, id, now) {
  if (!DIFFICULTY[id]) return { ok: false, reason: 'bad' };
  if (!levelOpen(char, id)) return { ok: false, reason: 'locked' };
  if (char.difficulty === id) return { ok: false, reason: 'same' };
  return { ok: true, char: { ...structuredClone(char), difficulty: id, updatedAt: now } };
}
