// How big and how long the Job Lanjutan skills look (spec §48). Visual only: the damage, area and
// timing of every skill stay in data/branches.js. Times are seconds, sizes game units unless noted.
//   crack: how long the ground stays cracked; linger: embers / motes still rising after the skill ends;
//   pulse: seconds between the rings a buff sends out; 3D values go to render3d/branch3d.js.
export const BRANCH_FX = {
  // Berserker
  bloodrage: { crack: 2.6, pulse: 0.55, drip: 0.35 },
  rageleap: { claw: 0.45, crack: 1.8 },
  ragnarok: { crack: 3.6, linger: 2.4, embers: 46, axes: 4, bolts: 5 },
  // Paladin
  holyguard: { pulse: 0.8, wings: 1, motes: 14 },
  judgment: { crack: 2.6, gather: 60, linger: 1.6 },
  sanctuary: { columns: 6, crosses: 8, linger: 2 },
};

// The 2.5D layer (render3d/branch3d.js): columns of light, falling hammers, the blood whirl.
// column: [width m, height m]; drop: the hammer's fall in seconds from `height` m.
export const BRANCH_3D = {
  bloodrage: { ring: 120, sparks: 46, light: { color: 0xff2030, peak: 34, life: 0.9, dist: 9 } },
  rageleap: { sparks: 18 },
  ragnarok: { tint: 0xff2a3a, glow: 1.5, sparks: 70, pillars: 6, light: { color: 0xff2030, peak: 40, life: 0.5, dist: 10 } },
  holyguard: { column: [1.6, 9], life: 0.9, ring: 90, sparks: 40, light: { color: 0xffd27a, peak: 36, life: 1, dist: 9 } },
  judgment: { drop: 0.16, height: 9, size: 4.2, column: [2.2, 10], columnLife: 0.8, sparks: 50, light: { color: 0xffe08a, peak: 50, life: 0.7, dist: 10 } },
  sanctuary: { column: [0.9, 7], center: [2.4, 12], sparks: 24, light: { color: 0xffd27a, peak: 30, dist: 11 } },
};
