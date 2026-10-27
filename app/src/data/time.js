// In-game clock (spec §18.4): one day passes in 8 real minutes; the town's
// light follows the hour. Times are minutes since day 1, 00:00.
export const DAY = 24 * 60;
export const GAME_MIN_PER_SEC = DAY / (8 * 60);
export const START_TIME = 7 * 60;      // new characters wake at 07:00 on day 1
export const INN_WAKE = 7 * 60;        // sleeping at the Inn: until 07:00 the next morning
export const PHASES = [                // from hour → name
  { from: 5, name: 'Pagi', icon: 'dawn' },
  { from: 10, name: 'Siang', icon: 'sun' },
  { from: 15, name: 'Sore', icon: 'dusk' },
  { from: 18, name: 'Malam', icon: 'moon' },
];
// Town light through the day: darkness (alpha of the dark layer), its colour,
// and a warm glow over the scene at dawn / dusk. Linear between key hours.
export const SKY = [
  { h: 0, dark: 0.82, rgb: [8, 6, 26], warm: 0 },
  { h: 4.5, dark: 0.8, rgb: [10, 8, 30], warm: 0 },
  { h: 6, dark: 0.5, rgb: [50, 24, 60], warm: 0.1 },
  { h: 7.5, dark: 0.22, rgb: [40, 30, 60], warm: 0.05 },
  { h: 10, dark: 0.06, rgb: [20, 20, 40], warm: 0 },
  { h: 15, dark: 0.1, rgb: [30, 20, 30], warm: 0.02 },
  { h: 17, dark: 0.3, rgb: [70, 30, 30], warm: 0.12 },
  { h: 18.5, dark: 0.58, rgb: [40, 16, 44], warm: 0.06 },
  { h: 20, dark: 0.8, rgb: [8, 6, 26], warm: 0 },
  { h: 24, dark: 0.82, rgb: [8, 6, 26], warm: 0 },
];
