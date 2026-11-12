// Difficulty (spec §41.3): one setting per character, picked at the Adventurers' Hall (tab Tantangan) in
// town; it holds for the world and the dungeons. hp / dmg: enemy HP and damage (shots & zones too);
// tempo: how fast enemies act (1.25 = waits × 0.8); elite: elite chance ×; affixes: extra elite traits;
// reward: coins & EXP ×; rarityUp: chance a dropped piece comes one rarity higher; mythic: Mythic weight ×;
// goldKeep: share of the trip's coins kept after falling (Normal = data/dungeon.js DEATH.goldKeep). Neraka opens after the story's end on Sulit+.
export const DIFFICULTY = {
  normal: { id: 'normal', name: 'Normal', color: '#8ff5c8', hp: 1, dmg: 1, tempo: 1, elite: 1, affixes: 0, reward: 1, rarityUp: 0, mythic: 1, goldKeep: 0.5 },
  hard: { id: 'hard', name: 'Sulit', color: '#ffb347', hp: 2, dmg: 1.6, tempo: 1, elite: 2, affixes: 1, reward: 1.5, rarityUp: 0.25, mythic: 1, goldKeep: 0.4 },
  hell: { id: 'hell', name: 'Neraka', color: '#ff3b4a', hp: 4, dmg: 2.5, tempo: 1.25, elite: 3, affixes: 2, reward: 2.5, rarityUp: 0.4, mythic: 3, goldKeep: 0.25 },
};
export const DIFFICULTY_IDS = Object.keys(DIFFICULTY);
export const diffOf = (id) => DIFFICULTY[id] || DIFFICULTY.normal;
