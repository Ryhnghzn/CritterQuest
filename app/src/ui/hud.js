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

// --cd: remaining cooldown fraction drawn as a dark sweep over the button;
// skills also show the seconds left.
export function updateActions(game) {
  ring($('act-dodge'), game.dodgeCd, DODGE.cooldown);
  for (const [i, id] of [[0, 'act-q'], [1, 'act-e']]) {
    const left = ring($(id), game.skillCd[i], game.skillCdMax[i]);
    $(id).querySelector('.cdt').textContent = left > 0 ? Math.ceil(left) : '';
  }
}

function ring(btn, cd, max) {
  const left = Math.max(0, cd);
  btn.style.setProperty('--cd', (max > 0 ? left / max : 0).toFixed(3));
  btn.classList.toggle('ready', left <= 0);
  return left;
}
