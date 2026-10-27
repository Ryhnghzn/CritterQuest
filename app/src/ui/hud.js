// In-run HUD (DOM): bars, counters and banner (~10×/s), action cooldown rings (every frame).
import { DODGE, ENERGY } from '../data/balance.js';
import { CLASSES } from '../data/classes.js';
import { POTIONS, POTION_CD, POTION_IDS } from '../data/potions.js';
import { iconCanvas } from '../art/sprites.js';
import { clockText } from '../meta/clock.js';

const $ = (id) => document.getElementById(id);

export function updateHUD(game) {
  const s = game.stats;
  $('hpfill').style.transform = `scaleX(${Math.max(0, s.hp / s.maxHp)})`;
  $('hptext').textContent = `${Math.ceil(Math.max(0, s.hp))} / ${Math.round(s.maxHp)}`;
  $('xpfill').style.transform = `scaleX(${Math.min(1, game.xp / game.xpNeed)})`;
  $('lvltext').textContent = `LV ${game.level}`;
  const waves = game.dungeon.floors[game.floor - 1]?.waves.length ?? 0;
  $('floor').textContent = `${game.dungeon.short} ${game.floor} · ${game.floorClear ? 'bersih' : `G${game.wave + 1}/${waves}`}`;
  $('kills').textContent = game.kills;
  $('gold').textContent = game.gold;
  $('dmg').style.opacity = game.flash > 0 ? 0.9 : 0;
  $('enfill').style.transform = `scaleX(${game.energy / ENERGY.max})`;
  $('entext').textContent = `Energi ${Math.floor(game.energy)}`;
  $('enbar').classList.toggle('empty', game.noEnergyT > 0);
  const chips = [];
  if (game.shield > 0) chips.push(['shield', `Perisai ${Math.ceil(game.shield)}`]);
  for (const id of ['wind', 'rage']) if (game.buffs[id] > 0) chips.push([id, `${POTIONS[id].name.replace('Ramuan ', '')} ${Math.ceil(game.buffs[id])}s`]);
  const box = $('buffs'), key = chips.map((c) => c[1]).join('|');
  if (box.dataset.key !== key) {
    box.dataset.key = key;
    box.replaceChildren(...chips.map(([id, text]) => {
      const b = document.createElement('span');
      b.className = 'buff'; b.textContent = text; b.style.setProperty('--c', POTIONS[id].light);
      return b;
    }));
  }
  const b = $('banner');
  if (game.bannerT > 0 && game.banner) { b.textContent = game.banner; b.style.opacity = 1; }
  else b.style.opacity = 0;
}

// --cd: remaining cooldown fraction drawn as a dark sweep over the button;
// skills also show the seconds left.
export function updateActions(game) {
  ring($('act-dodge'), game.dodgeCd, DODGE.cooldown);
  updateBelt(game.belt, game.potions, game.potionCd);
  const skills = CLASSES[game.classId].skills;
  for (const [i, id] of [[0, 'act-q'], [1, 'act-e']]) {
    $(id).querySelector('.cost').textContent = skills[i].cost;
    $(id).classList.toggle('noen', game.energy < skills[i].cost);
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

// Belt buttons: icon of the potion in each slot, how many are carried, shared cooldown.
export function updateBelt(belt, potions, cd) {
  belt.forEach((id, i) => {
    const b = $(`pot${i}`);
    if (b.dataset.id !== String(id)) {
      b.dataset.id = String(id);
      b.querySelector('.ic').replaceChildren(...(id ? [iconCanvas(`pot_${id}`, 28)] : []));
      b.title = id ? `${POTIONS[id].name}: ${POTIONS[id].desc} (${i + 1})` : `Slot ${i + 1} kosong`;
    }
    const n = id ? potions[id] : 0;
    b.querySelector('.cnt').textContent = n;
    b.classList.toggle('none', !id);
    b.classList.toggle('empty', n <= 0);
    ring(b, cd, POTION_CD);
  });
}

// Town HUD: name, level, live HP, coins, potions.
export function updateTownHUD(char, town) {
  $('tname').textContent = char.name;
  $('tlv').textContent = `LV ${char.level}`;
  $('thpfill').style.transform = `scaleX(${Math.max(0, town.hp / town.maxHp)})`;
  $('thptext').textContent = `${Math.ceil(town.hp)} / ${Math.round(town.maxHp)}`;
  $('tgold').textContent = char.gold;
  $('tpot').textContent = POTION_IDS.reduce((n, id) => n + char.potions[id], 0);
  updateBelt(char.belt, char.potions, 0);
}

// In-game clock in both HUDs: "Hari 3 · 18:40 · Sore" (spec §18.4).
const PHASE_MARK = { dawn: '◒', sun: '☀', dusk: '◓', moon: '☾' };
export function updateClock(clock) {
  const c = clockText(clock);
  const text = `${PHASE_MARK[c.phase.icon]} Hari ${c.day} · ${c.time} · ${c.phase.name}`;
  for (const id of ['tclock', 'clock']) {
    const el = $(id);
    if (el.textContent !== text) { el.textContent = text; el.dataset.phase = c.phase.icon; }
  }
}
