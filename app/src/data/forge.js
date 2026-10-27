// Forging, materials and gems (spec §20, langkah 9A). Every number of the item
// grind lives here.

// Materials, stacked in the save (char.mats).
export const MATS = {
  dust: { name: 'Debu Rune', color: '#c9b8a0' },
  crystal: { name: 'Kristal Arkana', color: '#7fd0ff' },
  core: { name: 'Inti Kegelapan', color: '#c26bff' },
};
export const MAT_IDS = Object.keys(MATS);

// Salvaging an item by rarity (Biasa … Mitos) → materials; Epik+ may also yield a gem.
export const SALVAGE = [
  { dust: 2 },
  { dust: 4 },
  { dust: 6, crystal: 1 },
  { dust: 8, crystal: 2 },
  { dust: 10, crystal: 4, core: 1 },
  { dust: 15, crystal: 6, core: 3 },
];
export const SALVAGE_GEM = { fromRarity: 3, chance: 0.35 }; // a tier-1 gem

// Found in the dungeon: per cleared floor, per boss, per elite.
export const MAT_DROPS = {
  floor: { dust: 3 },              // × floor number
  boss: { crystal: 3, core: 1 },   // + one tier-1 gem
  eliteDustChance: 0.5,            // elites drop 1–3 dust with this chance
};

// Enhancing +0 … +15: base stats × (1 + PER_PLUS × plus).
export const ENHANCE = {
  max: 15,
  perPlus: 0.1,
  // success chance for the step from +p to +p+1 (index p)
  chance: [1, 1, 1, 1, 1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.35, 0.3, 0.25, 0.2],
  dropFrom: 10,                    // failing from +10 up loses one level
};
// Cost of the step from +p: gold, dust, crystal, core
export function enhanceCost(item, p) {
  return {
    gold: 10 * item.itemLevel * (p + 1),
    dust: 2 + 2 * p,
    crystal: p >= 5 ? p - 4 : 0,
    core: p >= 10 ? 1 : 0,
  };
}

// Rerolling one bonus line: crystals + gold.
export const REROLL = { crystal: 2, goldPerLevel: 5 };

// Gems: type → stat; value per tier 1…5. Sockets by rarity (Langka 1, Epik 1, Legendaris 2, Mitos 2).
export const GEMS = {
  ruby: { name: 'Rubi', stat: 'atk', values: [3, 6, 10, 16, 24], color: '#e0405a' },
  emerald: { name: 'Zamrud', stat: 'maxHp', values: [15, 30, 50, 80, 120], color: '#4fd88a' },
  diamond: { name: 'Berlian', stat: 'def', values: [1, 2, 3.5, 5.5, 8], color: '#e8f4ff' },
  topaz: { name: 'Topas', stat: 'crit', values: [1, 2, 3.5, 5, 7], color: '#ffc94d' },
  amethyst: { name: 'Kecubung', stat: 'critDmg', values: [0.05, 0.1, 0.17, 0.25, 0.35], color: '#b06bff' },
  sapphire: { name: 'Safir', stat: 'cdr', values: [1, 2, 3.5, 5, 7], color: '#4f8fe0' },
};
export const GEM_IDS = Object.keys(GEMS);
export const GEM_TIERS = 5;
export const GEM_TIER_NAMES = ['Retak', 'Biasa', 'Jernih', 'Sempurna', 'Agung'];
export const SOCKETS = [0, 0, 1, 1, 2, 2];
export const GEM_COMBINE = { count: 3, goldPerTier: 40 };   // 3 of tier t → 1 of tier t+1, gold × t
export const UNSOCKET_GOLD = 30;                            // taking a gem out (it is kept)
