// Big-town merchants (spec §25.2): daily displays of gear, the night merchant,
// the materials & gems trader. Stock is rolled from the character's world seed,
// the town, the shop and the day, so only what was bought is saved.
// Rows are by town tier (TOWNS[].tier, 1…4); weights are rarity Biasa … Mitos.

export const MARKET_DAY_START = 5 * 60;   // stock changes at 05:00 (game clock)
export const NIGHT_HOURS = [18, 5];       // the night merchant is on the plaza from 18:00 to 05:00

// shop → slots it sells (a weapon is always for the buyer's class)
export const DISPLAY_SHOPS = {
  weapons: ['weapon'],
  armor: ['helm', 'armor', 'boots'],
  jewelry: ['amulet', 'ring'],
};

// per tier: items on show per shop, rarity weights, item level range (clamped
// around the buyer's level), price = sell price × markup
export const DISPLAY = [
  null,
  { count: { weapons: 4, armor: 6, jewelry: 4 }, weights: [0, 30, 45, 20, 5, 0], levels: [3, 18], markup: 5 },
  { count: { weapons: 5, armor: 7, jewelry: 5 }, weights: [0, 10, 45, 35, 9, 1], levels: [10, 28], markup: 5.5 },
  { count: { weapons: 5, armor: 8, jewelry: 5 }, weights: [0, 0, 35, 45, 17, 3], levels: [20, 38], markup: 6 },
  { count: { weapons: 6, armor: 9, jewelry: 6 }, weights: [0, 0, 20, 45, 28, 7], levels: [30, 50], markup: 6.5 },
];
export const DISPLAY_AHEAD = 2; // item level = buyer's level (clamped to the range) + 0…2

// night merchant: a few rare pieces of any slot and a couple of gems, dearer
export const NIGHT = [
  null,
  { items: 3, weights: [0, 0, 40, 45, 13, 2], markup: 8, gems: 2, gemTier: [1, 2] },
  { items: 3, weights: [0, 0, 25, 50, 20, 5], markup: 8, gems: 2, gemTier: [2, 3] },
  { items: 4, weights: [0, 0, 10, 50, 30, 10], markup: 8.5, gems: 3, gemTier: [2, 3] },
  { items: 4, weights: [0, 0, 0, 45, 40, 15], markup: 9, gems: 3, gemTier: [3, 4] },
];

// materials & gems trader: price per piece and how many are for sale each day
export const MAT_PRICE = { dust: 4, crystal: 45, core: 260 };
export const MAT_STOCK = [
  null,
  { dust: 150, crystal: 10, core: 1 },
  { dust: 200, crystal: 15, core: 2 },
  { dust: 250, crystal: 20, core: 3 },
  { dust: 300, crystal: 30, core: 4 },
];
export const GEM_PRICE = [120, 420, 1400, 4500]; // tier 1…4
export const GEM_SHOP = [null, { tiers: [1], each: 2 }, { tiers: [1, 2], each: 2 }, { tiers: [1, 2], each: 3 }, { tiers: [2, 3], each: 2 }];
export const PRICE_TIER_UP = 0.1;   // materials & gems cost +10% per town tier above 1
