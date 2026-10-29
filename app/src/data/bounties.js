// Bounty board (spec §24): three tasks at a time; a task counts only once it is taken (Ambil).
//   need: [min, max] rolled count (kill: scaled by the enemy's weight);
//   weight: how often a kind is rolled. Rewards scale with character level.
export const BOUNTY_COUNT = 3;
export const BOUNTY_KINDS = {
  kill: { weight: 4, need: [20, 40] },
  elite: { weight: 2, need: [3, 8] },
  boss: { weight: 1, need: [1, 1] },
  floors: { weight: 2, need: [3, 8] },
  gold: { weight: 1, need: [150, 400] },
};
// bigger enemies count as more (a Golem bounty asks for fewer kills)
export const KILL_WEIGHT = { slink: 1, mini: 1, dart: 1, spitter: 1.5, bomber: 1.5, healer: 2, charger: 2, tank: 3, summoner: 3, shielder: 3 };

// reward = base + perLevel × level; marks fixed per kind
export const BOUNTY_REWARD = {
  gold: { base: 40, perLevel: 12 },
  exp: { base: 30, perLevel: 10 },
  dust: { base: 3, perLevel: 0.2 },
  marks: { kill: 2, elite: 2, boss: 3, floors: 2, gold: 1 },
};
export const BOUNTY_REROLL = { perLevel: 15 };

// Lencana shop; item: a gear piece of that rarity at the character's level
export const MARK_SHOP = [
  { id: 'chest', name: 'Peti Lencana', desc: '1 gear Epik', price: 12, item: { rarity: 3 } },
  { id: 'crystal', name: 'Kristal Arkana ×5', desc: 'Bahan tempa +5 ke atas', price: 4, mats: { crystal: 5 } },
  { id: 'core', name: 'Inti Kegelapan', desc: 'Bahan tempa +10 ke atas', price: 5, mats: { core: 1 } },
  { id: 'gem', name: 'Permata acak', desc: '1 permata tingkat Biasa', price: 6, gem: 2 },
  { id: 'dust', name: 'Debu Rune ×20', desc: 'Bahan tempa', price: 2, mats: { dust: 20 } },
];

// the board of a new (or migrated) character
export const STARTER_BOUNTIES = [
  { kind: 'kill', target: 'slink', need: 25, have: 0, taken: false },
  { kind: 'elite', target: null, need: 3, have: 0, taken: false },
  { kind: 'floors', target: 'shadow', need: 3, have: 0, taken: false },
];
