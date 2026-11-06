// Sound files (spec §34), all in public/audio/ as .mp3. Several files under one name: one is
// picked at random each time, so a sound or a region's music does not wear out. A sound not
// listed here (or a file that fails to load) keeps the synthesized sound in core/audio.js.
export const MUSIC = {
  judul: ['musik-judul'],
  kota: ['musik-kota'],
  wilayah: ['musik-wilayah', 'musik-wilayah2'],
  dungeon: ['musik-dungeon'],
  bos: ['musik-bos'],
  epilog: ['musik-epilog'],
};
export const MUSIC_FADE = 2; // seconds of crossfade between tracks

// vol: 0..1; gap: seconds before the same sound may play again; max: voices at once
export const SOUNDS = {
  slash: { files: ['sfx-serang-pedang'], vol: 0.7, gap: 0.08, max: 3 },
  stab: { files: ['sfx-serang-belati'], vol: 0.6, gap: 0.08, max: 3 },
  arrow: { files: ['sfx-serang-panah'], vol: 0.6, gap: 0.08, max: 3 },
  fireball: { files: ['sfx-serang-sihir'], vol: 0.6, gap: 0.08, max: 3 },
  hit: { files: ['sfx-hit-biasa'], vol: 0.45, gap: 0.05, max: 4 },
  hitHard: { files: ['sfx-hit-keras'], vol: 0.55, gap: 0.05, max: 3 },
  hitCrit: { files: ['sfx-hit-kritis'], vol: 0.65, gap: 0.06, max: 3 },
  levelup: { files: ['jingle-naik-level'], vol: 0.8, gap: 1, max: 1, steady: true },
  clear: { files: ['jingle-tamat'], vol: 0.8, gap: 1, max: 1, steady: true },
  gameover: { files: ['jingle-kalah'], vol: 0.9, gap: 1, max: 1, steady: true },
};
export const PITCH_JITTER = 0.08; // ± random pitch, so repeated hits do not sound identical
