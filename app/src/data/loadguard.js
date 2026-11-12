// Load guard (owner 2026-11-12: "don't let it crash"): busy fights ease off on their own before
// the phone runs out of memory or frames. Level 1 stills the HUD's decorations; level 2 also
// renders the 3D world at one pixel per CSS pixel with lite effects (render3d Stage lite) until
// the fight calms down. run/loadguard.js decides; the numbers live here.
export const LOAD_GUARD = {
  // enemies alive at which a level starts (phones: touch), and below which it may end
  calm: { foes: 18, touchFoes: 12, fps: 40 },
  lite: { foes: 34, touchFoes: 24, fps: 28 },
  window: 0.5,   // s per FPS sample
  rise: 1,       // s of over-the-line samples before a level starts
  settle: 4,     // s of easy samples before a level ends
  ease: 0.7,     // a level ends below this share of its enemy count
};
