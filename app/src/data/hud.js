// HUD "Bola & Bingkai" (spec §45.1, sample app/hud.html?v=A): sizes, the touch fan round the
// attack button and the decoration counts. ui/hudorb.js turns these into CSS variables.
// Angles are in degrees, clockwise from the right (−90 = straight up); radii in CSS px from
// the attack button's centre.
export const HUD = {
  orb: { pc: 112, touch: 76 },          // HP / Energy orb diameter
  overlap: 10,                          // how far the orbs tuck under the middle frame
  dockBottom: { pc: 10, touch: 6 },
  edge: 30,                             // touch: gap to the screen sides (rounded corners, notch)
  fan: {
    atk: 84, bottom: 16,                // attack / talk button size and gap to the bottom
    skill: { size: 50, r: 100, from: -90, step: -35 }, // skills 1–4 on the inner ring
    ult: { a: -105, r: 172, size: 58 },
    mount: { a: -128, r: 170, size: 44 },
    dodge: { a: -151, r: 168, size: 46 },
    swap: { a: -176, r: 152, size: 42 },
  },
  lowHp: 0.3,                           // below this share of max HP: pulsing orb + red screen edge
  embers: 14,                           // embers rising off the middle frame
  bubbles: 6,                           // bubbles rising in each orb
};

// how far the fan reaches left of the attack button's centre (touch dock keeps clear of it)
export function fanReach(f = HUD.fan) {
  const at = (a, r, size) => -r * Math.cos((a * Math.PI) / 180) + size / 2;
  const skills = [0, 1, 2, 3].map((i) => at(f.skill.from + i * f.skill.step, f.skill.r, f.skill.size));
  return Math.ceil(Math.max(f.atk / 2, ...skills, at(f.ult.a, f.ult.r, f.ult.size), at(f.mount.a, f.mount.r, f.mount.size),
    at(f.dodge.a, f.dodge.r, f.dodge.size), at(f.swap.a, f.swap.r, f.swap.size)));
}
