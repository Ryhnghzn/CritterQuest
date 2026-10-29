// Collection (spec §24): kills per enemy type unlock small permanent stat
// bonuses at each milestone; every unique item found adds coin & EXP find.
//   stat / v: added to final stats once per milestone reached
export const BESTIARY_STEPS = [25, 100, 300, 1000];
export const BOSS_STEPS = [1, 5, 15, 40];

export const BESTIARY = {
  slink: { stat: 'maxHp', v: 6 },
  mini: { stat: 'maxHp', v: 4 },
  dart: { stat: 'moveSpd', v: 1.5 },
  tank: { stat: 'def', v: 1 },
  spitter: { stat: 'crit', v: 0.5 },
  charger: { stat: 'atk', v: 1 },
  summoner: { stat: 'cdr', v: 1 },
  healer: { stat: 'maxHp', v: 10 },
  bomber: { stat: 'critDmg', v: 0.03 },
  shielder: { stat: 'def', v: 1.5 },
  wolf: { stat: 'moveSpd', v: 1.5 },
  yeti: { stat: 'maxHp', v: 12 },
  icewisp: { stat: 'cdr', v: 1 },
  scorpion: { stat: 'crit', v: 0.5 },
  sandworm: { stat: 'def', v: 1.5 },
  imp: { stat: 'critDmg', v: 0.03 },
  salamander: { stat: 'atk', v: 1.5 },
  wraith: { stat: 'cdr', v: 1 },
  boss: { stat: 'atk', v: 2 },
  crystalboss: { stat: 'def', v: 2 },
  sporeboss: { stat: 'maxHp', v: 20 },
  tombboss: { stat: 'crit', v: 1 },
  lavaboss: { stat: 'critDmg', v: 0.05 },
  eclipseboss: { stat: 'atk', v: 3 },
};
export const BESTIARY_IDS = Object.keys(BESTIARY);

// per unique found: fractions added to the run's goldfind / expfind
export const CODEX_FX = { goldfind: 0.01, expfind: 0.01 };
