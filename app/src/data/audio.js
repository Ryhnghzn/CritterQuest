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
  // enemies falling
  dieSmall: { files: ['sfx-mati-kecil', 'sfx-mati-kecil2'], vol: 0.45, gap: 0.05, max: 4 },
  dieBig: { files: ['sfx-mati-besar', 'sfx-mati-besar2'], vol: 0.6, gap: 0.1, max: 2 },
  dieBoss: { files: ['sfx-mati-bos', 'sfx-mati-bos2', 'sfx-mati-bos3'], vol: 0.85, gap: 0.5, max: 1 },
  // the player
  hurtLight: { files: ['sfx-luka-ringan', 'sfx-luka-ringan2'], vol: 0.55, gap: 0.25, max: 1 },
  hurtHeavy: { files: ['sfx-luka-berat', 'sfx-luka-berat2'], vol: 0.65, gap: 0.3, max: 1 },
  playerDie: { files: ['sfx-pemain-mati'], vol: 0.8, gap: 1, max: 1, steady: true },
  dodge: { files: ['sfx-menghindar'], vol: 0.5, gap: 0.1, max: 2 },
  noEnergy: { files: ['sfx-energi-habis'], vol: 0.5, gap: 0.5, max: 1 },
  // skills (which skill sounds like what: SKILL_SOUND below)
  skillSpin: { files: ['sfx-skill-putar'], vol: 0.6, gap: 0.2, max: 2 },
  skillBuff: { files: ['sfx-skill-buff'], vol: 0.6, gap: 0.2, max: 1 },
  skillFire: { files: ['sfx-skill-api'], vol: 0.6, gap: 0.2, max: 2 },
  skillIce: { files: ['sfx-skill-es'], vol: 0.6, gap: 0.2, max: 2 },
  skillThunder: { files: ['sfx-skill-petir'], vol: 0.6, gap: 0.2, max: 2 },
  skillEarth: { files: ['sfx-skill-tanah'], vol: 0.65, gap: 0.2, max: 2 },
  skillShot: { files: ['sfx-skill-panah-kuat'], vol: 0.6, gap: 0.2, max: 2 },
  skillRain: { files: ['sfx-skill-hujan-panah'], vol: 0.55, gap: 0.2, max: 2 },
  skillKnives: { files: ['sfx-skill-belati'], vol: 0.6, gap: 0.2, max: 2 },
  skillPoison: { files: ['sfx-skill-racun'], vol: 0.55, gap: 0.2, max: 2 },
  skillDash: { files: ['sfx-skill-terjang'], vol: 0.6, gap: 0.15, max: 2 },
  ultBladestorm: { files: ['sfx-ult-badai-pedang'], vol: 0.85, gap: 1, max: 1 },
  ultStarfall: { files: ['sfx-ult-hujan-bintang'], vol: 0.85, gap: 1, max: 1 },
  ultMeteors: { files: ['sfx-ult-hujan-meteor'], vol: 0.85, gap: 1, max: 1 },
  ultShadows: { files: ['sfx-ult-seribu-bayangan'], vol: 0.85, gap: 1, max: 1 },
};

// skill / ultimate id (data/classes.js) → sound above; a skill missing here keeps its synth
export const SKILL_SOUND = {
  spin: 'skillSpin', shout: 'skillBuff', quake: 'skillEarth', charge: 'skillDash', axe: 'skillSpin', warcry: 'skillBuff',
  rain: 'skillRain', pierce: 'skillShot', volley: 'skillShot', leap: 'skillDash', hawk: 'skillBuff',
  nova: 'skillIce', chain: 'skillThunder', meteor: 'skillFire', blink: 'skillDash', inferno: 'skillFire', manashield: 'skillBuff',
  shadow: 'skillDash', fan: 'skillKnives', poison: 'skillPoison', smoke: 'skillPoison', shuriken: 'skillKnives', assassinate: 'skillBuff',
  bladestorm: 'ultBladestorm', starfall: 'ultStarfall', meteorstorm: 'ultMeteors', thousandshadows: 'ultShadows',
};
export const BIG_ENEMY_R = 16; // an enemy this wide or more (or an elite) falls with the big sound
export const HURT_HEAVY = 0.15; // a hit taking this share of max HP or more groans heavily
export const PITCH_JITTER = 0.08; // ± random pitch, so repeated hits do not sound identical
