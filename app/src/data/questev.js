// Quest events in the world (spec §42): the numbers of every field form. A quest step
// { kind: 'event', event, … } starts when the player comes within START_R of its start.
export const START_R = 200;          // walk this close to an event's start to begin it
export const RETRY_AFTER = 3;        // seconds after a failure before it can start again
export const TOUCH = 1.1;            // an enemy touching a guarded NPC / altar: × its dmg per second

// Kawal: someone walks a road to a town; packs come for them
export const ESCORT = {
  speed: 105,                        // units per second along the route
  wait: 520,                         // stops to wait while the player is farther than this
  hp: { base: 160, perLevel: 22 },   // the walker's HP at the player's level
  packEvery: [5, 8],                 // seconds between packs coming for them
  pack: [3, 5], ahead: [520, 700],   // pack size, how far from the walker they appear
  chase: 0.7,                        // part of a pack that goes for the walker (the rest for the player)
  arrive: 70,                        // this close to the route's end = safe
  heal: 0.04,                        // HP back per second (× max) while no enemy is near
};

// Bertahan: an altar / home with HP; waves come from all sides
export const DEFEND = {
  hp: { base: 260, perLevel: 30 },
  time: 75,                          // seconds to hold
  waves: [[0, 4], [18, 6], [36, 8], [54, 10]], // [second, size]; later waves come stronger
  waveMul: 0.12,                     // HP × (1 + waveMul × wave index)
  ring: [560, 720],                  // where a wave appears round the altar
  chase: 0.6,                        // part of a wave that goes for the altar
  leave: 720, leaveT: 4,             // walking this far away for this long fails it
  mop: 2,                            // success once the time is up and at most this many attackers are left
};

// Buronan: a named elite somewhere in a circle; at half HP it flees to a second spot
export const OUTLAW = {
  hint: 900,                         // radius of the circle drawn on the map round where it lurks
  seen: 650,                         // it shows itself (and the hunt begins) this close
  hp: 9, dmg: 1.5, size: 1.6,        // × a pack enemy of its zone and level
  flee: 0.5,                         // flees once at this part of its HP…
  fleeSpeed: 2.2, heal: 0.15,        // …this much faster, and heals this part of its HP when it gets there
  escort: 4,                         // enemies of its zone round it when it shows itself
};

// Sarang: nests that keep sending enemies until destroyed
export const NEST = {
  ring: 420,                         // nests stand on a ring of this radius round the place
  near: 700,                         // the fight begins this close to the place
  hp: 7, size: 34,                   // × a pack enemy's HP; the nest's radius
  every: [5, 8], send: 2,            // seconds between sendings, enemies per sending (per nest)
  cap: 14,                           // most of its enemies alive at once
  leave: 1100, leaveT: 5,            // walking this far away for this long resets it
};

// Penyelamatan: a camp with guards round a cage; beat the guards, then open the cage
export const RESCUE = {
  near: 700,                         // the guards rise this close to the camp
  guards: 6, eliteGuards: 1,         // guards (of the zone), of them elites
  guardHp: 1.6,                      // × a pack enemy's HP (guards are not the horde)
  openR: 80,                         // walk this close to the opened cage to free the captive
  leave: 1100, leaveT: 5,            // walking this far away for this long resets the camp
  fence: 300,                        // the camp's fence of stakes (radius, drawn only)
};

// Balapan: rings of light along a road, against the clock
export const RACE = {
  every: 900,                        // a ring every this far along the route
  ringR: 120,                        // passing this close takes a ring
  // medals by average speed over the route (units per second): bronze can be walked,
  // silver needs a quick run or a mount, gold a good mount
  pace: { bronze: 135, silver: 200, gold: 260 },
  bonus: { bronze: 0.5, silver: 1, gold: 2 }, // × QUEST_REWARD gold at the player's level, paid at the finish
};

// Peristiwa dunia: chance happenings near the player, not part of a quest; ignored ones fade
export const HAPPEN = {
  first: 150, every: [300, 480],     // seconds before the first, between the next ones
  dist: [900, 1400],                 // how far from the player one appears
  expire: 150, far: 2800,            // gone if not started in this many seconds, or left this far behind
  // per kind: weight w; `when` = the parts of the day it can come (data/time.js PHASES icons:
  // dawn, sun, dusk, moon; none = any); nightMul: the weight × this at night; cool: seconds before the
  // same kind can come again (plan "Momen Acak")
  kinds: {
    caravan: { w: 1, when: ['dawn', 'sun'] },
    raid: { w: 1 },
    meteor: { w: 0.8 },
    wisp: { w: 1, when: ['dusk', 'moon'] },
    giant: { w: 0.25, nightMul: 3, cool: 900 },
  },
  seen: 950,                         // a quiet happening shows on the map once the player comes this close
  // Cahaya Aneh: a light that drifts off when you come near; caught → a gift, or a trap
  wisp: {
    dist: [700, 1100], near: 320, catch: 60, speed: 140, time: 20, expire: 120,
    glow: 26,                        // particles / s while it hangs there (× quality)
    trap: 0.3, pack: 6,              // chance it calls an ambush instead, pack size (one of them elite)
    gift: { gold: 1.2, mats: { dust: [4, 9], crystal: [0, 2] }, gem: 0.35 }, // coins × QUEST_REWARD gold; gem chance
  },
  // Raksasa Pengembara: a crowned giant walking the land; fight it, follow it or let it go
  giant: {
    dist: [1400, 1900], life: 240, wander: 9, speed: 26,   // seconds before it leaves, between new wander goals
    engage: 480, rumble: [5, 8], hear: 2400,               // fights when this close (or struck); quakes felt within `hear`
    hp: 30, dmg: 1.7, size: 2.3,                           // × a zone enemy at that level
  },  caravan: { len: 1800, gold: 1.5 }, // a short escort along the nearest road; purse × QUEST_REWARD gold
  raid: { time: 40, waves: [[0, 4], [13, 6], [26, 8]], gold: 2, hp: 0.7 }, // a short defence; barricade HP × DEFEND.hp
  meteor: {
    time: 22, every: 0.9, r: 380, near: 400,   // seconds, between falls, area radius, start distance
    warn: 1.1, blast: 85, dmg: 0.16,           // warning before impact, blast radius, damage × max HP
    pick: 55, life: 14, gold: 0.15,            // crystal pickup radius, seconds it lies there, coins each × QUEST_REWARD gold
    leave: 1200,                               // walking this far from the shower ends it
  },
};
