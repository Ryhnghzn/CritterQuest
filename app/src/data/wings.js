// Which wing an anime hero shows (spec §39, owner's Q&A 2026-11-09): picked from the worn gear,
// purely visual. Rules in order — the first that matches wins (art/anime/wingpick.js).
// unique: gear unique effects (meta/gear.js gearEffects) in priority order → wing
export const WING_UNIQUE = [
  ['phoenix', 'phoenix'],
  ['lifesteal', 'blood'],
  ['chain', 'storm'],
  ['shield', 'ice'],
  ['dodgecd', 'wind'],
];
export const WING_FULL_SET = 'blade';          // every slot Legendaris or better
// a Mitos weapon: by class (the class's Mitos element: Api, Petir, Kehampaan; Assassin = Bayangan)
export const WING_MYTHIC_WEAPON = { warrior: 'phoenix', archer: 'storm', mage: 'void', assassin: 'shadow' };
export const WING_MYTHIC_ANY = 'light';         // any other Mitos piece