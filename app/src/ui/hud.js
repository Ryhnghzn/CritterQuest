// In-run HUD (DOM): bars, counters and banner (~10×/s), action cooldown rings (every frame).
import { fmtTime } from './screens.js';
import { DODGE } from '../data/balance.js';

const $ = (id) => document.getElementById(id);

export function updateHUD(game) {
  const s = game.stats;
  $('hpfill').style.transform = `scaleX(${Math.max(0, s.hp / s.maxHp)})`;
  $('hptext').textContent = `${Math.ceil(Math.max(0, s.hp))} / ${Math.round(s.maxHp)}`;
  $('xpfill').style.transform = `scaleX(${Math.min(1, game.xp / game.xpNeed)})`;
  $('lvltext').textContent = `LV ${game.level}`;
  $('time').textContent = fmtTime(game.time);
  $('kills').textContent = game.kills;
  $('best').textContent = fmtTime(Math.max(game.best.time, game.time));
  $('dmg').style.opacity = game.flash > 0 ? 0.9 : 0;
  const b = $('banner');
  if (game.bannerT > 0 && game.banner) { b.textContent = game.banner; b.style.opacity = 1; }
  else b.style.opacity = 0;
}

// --cd: remaining cooldown fraction drawn as a dark sweep over the button.
export function updateActions(game) {
  const k = Math.max(0, game.dodgeCd) / DODGE.cooldown;
  const b = $('act-dodge');
  b.style.setProperty('--cd', k.toFixed(3));
  b.classList.toggle('ready', k <= 0);
}
