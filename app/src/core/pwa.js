// Offline play (spec §32): registers the service worker that the build writes (dist/sw.js).
// Only in a build: under `npm run dev` files change all the time and must not be stored.
// onUpdate runs when a newer version has been stored and taken over while the game is open.
export function registerOffline(onUpdate) {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) onUpdate(); });
  addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* http without the Chrome flag: plays online only */ });
  });
}
