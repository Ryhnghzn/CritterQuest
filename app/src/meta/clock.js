// In-game clock helpers (spec §18.4). Pure.
import { DAY, PHASES, SKY, INN_WAKE } from '../data/time.js';

export const minuteOfDay = (clock) => ((Math.floor(clock) % DAY) + DAY) % DAY;
export const dayOf = (clock) => Math.floor(clock / DAY) + 1;

export function phaseOf(clock) {
  const h = minuteOfDay(clock) / 60;
  let p = PHASES[PHASES.length - 1];
  for (const x of PHASES) if (h >= x.from) p = x;
  return p;
}

// "Hari 3 · 18:40 · Sore"
export function clockText(clock) {
  const m = minuteOfDay(clock);
  const hh = String(Math.floor(m / 60)).padStart(2, '0'), mm = String(m % 60).padStart(2, '0');
  return { day: dayOf(clock), time: `${hh}:${mm}`, phase: phaseOf(clock) };
}

// The town's light at this time: { dark: 0..1, rgb: [r,g,b], warm: 0..1, night: 0..1 }
export function skyAt(clock) {
  const h = minuteOfDay(clock) / 60;
  let i = 0;
  while (i < SKY.length - 2 && SKY[i + 1].h <= h) i++;
  const a = SKY[i], b = SKY[i + 1], k = (h - a.h) / (b.h - a.h);
  const mix = (x, y) => x + (y - x) * k;
  const dark = mix(a.dark, b.dark);
  return { dark, rgb: a.rgb.map((v, j) => Math.round(mix(v, b.rgb[j]))), warm: mix(a.warm, b.warm), night: Math.min(1, dark / 0.8) };
}

// Sleeping at the Inn: until INN_WAKE the next morning (or today, if before it).
export function nextMorning(clock) {
  const start = clock - minuteOfDay(clock);
  return minuteOfDay(clock) < INN_WAKE - 60 ? start + INN_WAKE : start + 1440 + INN_WAKE;
}
