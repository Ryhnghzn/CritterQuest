// In-run HUD (DOM): bars, counters and banner (~10×/s), action cooldown rings (every frame).
import { DODGE, ENERGY, ULT } from '../data/balance.js';
import { fieldHere } from '../run/field.js';
import { POTIONS, POTION_CD, POTION_IDS } from '../data/potions.js';
import { iconCanvas } from '../art/sprites.js';
import { clockText } from '../meta/clock.js';
import { activeQuests } from '../meta/quests.js';
import { stepText } from './journal.js';
import { tr, t } from '../i18n.js';
import { CLASSES } from '../data/classes.js';
import { traitLevel } from '../run/traits.js';

const $ = (id) => document.getElementById(id);

export function updateHUD(game) {
  const s = game.stats;
  $('hpfill').style.transform = `scaleX(${Math.max(0, s.hp / s.maxHp)})`;
  $('hptext').textContent = `${Math.ceil(Math.max(0, s.hp))} / ${Math.round(s.maxHp)}`;
  $('xpfill').style.transform = `scaleX(${Math.min(1, game.xp / game.xpNeed)})`;
  $('lvltext').textContent = `LV ${game.level}`;
  if (game.field) $('floor').textContent = fieldHere(game); // region & enemy level here (spec §25.1)
  else {
    const waves = game.dungeon.floors[game.floor - 1]?.waves.length ?? 0;
    $('floor').textContent = `${game.dungeon.short} ${game.floor} · ${game.floorClear ? tr('bersih') : `G${game.wave + 1}/${waves}`}`;
  }
  $('kills').textContent = game.kills;
  $('gold').textContent = game.gold;
  $('dmg').style.opacity = game.flash > 0 ? 0.9 : 0;
  $('enfill').style.transform = `scaleX(${game.energy / ENERGY.max})`;
  $('entext').textContent = t('Energi {n}', { n: Math.floor(game.energy) });
  $('enbar').classList.toggle('empty', game.noEnergyT > 0);
  const tc = CLASSES[game.classId].trait, tb = $('trbar'), tp = $('trpips');
  const combo = tc?.id === 'combo';
  tb.classList.toggle('hidden', !tc || combo);
  tp.classList.toggle('hidden', !combo);
  if (tc) { // class signature bar (spec §31)
    const tr_ = game.trait, v = Math.floor(tr_.v);
    if (combo) {
      tp.style.setProperty('--c', tc.color);
      tp.title = tr('Kombo');
      const pips = tp.children;
      for (let i = 0; i < pips.length; i++) pips[i].classList.toggle('on', i < v);
    } else {
      const hot = tc.id === 'heat' ? tr_.lock > 0 : tr_.on > 0;
      const text = tc.id === 'heat' ? (tr_.lock > 0 ? t('Kepanasan {s}s', { s: tr_.lock.toFixed(1) }) : t('Panas {n}', { n: v }))
        : tc.id === 'focus' ? tr('Bidik')
        : tr_.on > 0 ? t('MENGAMUK {s}s', { s: Math.ceil(tr_.on) }) : t('Murka {n}', { n: v });
      tb.style.setProperty('--c', tc.color);
      $('trfill').style.transform = `scaleX(${traitLevel(game)})`;
      $('trtext').textContent = text;
      tb.classList.toggle('hot', hot);
      tb.classList.toggle('ready', tc.id === 'focus' && tr_.focus);
    }
  }
  const chips = [];
  if (game.shield > 0) chips.push(['shield', t('Perisai {n}', { n: Math.ceil(game.shield) })]);
  for (const id of ['wind', 'rage']) if (game.buffs[id] > 0) chips.push([id, `${POTIONS[id].name.replace(/^Ramuan | Potion$/, '')} ${Math.ceil(game.buffs[id])}s`]);
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
  const skills = game.skillDefs;
  for (let i = 0; i < 4; i++) {
    const b = $(`act-s${i + 1}`), sk = skills[i];
    if (b.dataset.skill !== (sk?.name ?? '')) { // a slot can fill mid-trip (level up, Skill tab)
      b.dataset.skill = sk?.name ?? '';
      b.classList.toggle('none', !sk);
      b.querySelector('.ic').replaceChildren(...(sk ? [iconCanvas(sk.icon || sk.id, 30)] : []));
      b.title = sk ? `${sk.name} (${i + 1})` : t('Slot {n} kosong', { n: i + 1 });
    }
    b.querySelector('.cost').textContent = sk ? sk.cost : '';
    b.classList.toggle('noen', !!sk && game.energy < sk.cost);
    b.classList.toggle('locked', !!sk && !!game.trait && game.trait.lock > 0); // Kepanasan
    const left = ring(b, game.skillCd[i], game.skillCdMax[i]);
    b.querySelector('.cdt').textContent = left > 0 ? Math.ceil(left) : '';
  }
  // ultimate: gold ring fills with its charge (spec §22)
  const u = $('act-ult');
  if (u.dataset.skill !== (game.ult?.name ?? '')) { // it can open mid-trip
    u.dataset.skill = game.ult?.name ?? '';
    u.classList.toggle('locked', !game.ult);
    u.querySelector('.ic').replaceChildren(...(game.ult ? [iconCanvas(game.ult.icon, 30)] : []));
    u.title = game.ult ? `${game.ult.name} (5)` : '';
  }
  if (game.ult) {
    u.style.setProperty('--u', (game.ultCharge / ULT.max).toFixed(3));
    u.classList.toggle('ready', game.ultCharge >= ULT.max);
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
      b.title = id ? `${POTIONS[id].name}: ${POTIONS[id].desc} (${'ZXCV'[i]})` : t('Slot {k} kosong', { k: 'ZXCV'[i] });
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
  const text = `${PHASE_MARK[c.phase.icon]} ${t('Hari {d}', { d: c.day })} · ${c.time} · ${c.phase.name}`;
  for (const id of ['tclock', 'clock']) {
    const el = $(id);
    if (el.textContent !== text) { el.textContent = text; el.dataset.phase = c.phase.icon; }
  }
}

// Quest tracker (spec §26.3): the main quest (or the tracked one) in the corner under the
// HUD, with its current step; the head folds it down to the quest's name. The fold is a
// per-device convenience (localStorage).
let qtMin = false;
let lastKey = '';
try { qtMin = localStorage.getItem('cq.qtrack') === 'min'; } catch { /* storage off: start open */ }
document.getElementById('qthead')?.addEventListener('click', () => {
  qtMin = !qtMin;
  try { localStorage.setItem('cq.qtrack', qtMin ? 'min' : 'open'); } catch { /* fine */ }
  $('qtrack').classList.toggle('min', qtMin);
  $('qttog').textContent = qtMin ? '+' : '−';
});

export function updateQuestTracker(char, show = true) {
  const box = $('qtrack');
  const list = char ? activeQuests(char) : [];
  const a = list.find((q) => q.id === char?.quests.track) || list[0];
  if (!show || !a?.step) { box.classList.add('hidden'); return; }
  const hud = [$('hud'), $('townhud')].find((h) => !h.classList.contains('hidden'));
  if (!hud) { box.classList.add('hidden'); return; }
  const top = Math.round((hud.getBoundingClientRect().bottom + 8) / (parseFloat(getComputedStyle(box).zoom) || 1)); // landscape phones zoom it
  const key = `${a.id}:${a.state.step}:${a.state.prog}:${top}`;
  if (key === lastKey && !box.classList.contains('hidden')) return; // ~8×/s: only touch the DOM on change
  lastKey = key;
  box.style.top = `${top}px`;
  $('qttitle').textContent = a.def.main ? `${t('Bab {n}', { n: a.def.ch + 1 })} · ${a.def.title}` : a.def.title;
  $('qttitle').title = $('qttitle').textContent;
  const s = a.step, counted = s.kind === 'kill' || s.kind === 'elite';
  $('qtstep').textContent = stepText(s);
  if (counted) { const p = document.createElement('span'); p.className = 'qprog'; p.textContent = ` ${a.state.prog}/${s.n}`; $('qtstep').append(p); }
  $('qttog').textContent = qtMin ? '+' : '−';
  box.classList.toggle('min', qtMin);
  box.classList.remove('hidden');
}

// Points not yet spent (attributes + talents): a number on the Karakter button that pulses.
export function updatePointsBadge({ attr, talent }) {
  const btn = $('charbtn'), n = Math.max(0, attr) + Math.max(0, talent);
  let b = $('ptsbadge'); // a sibling: the button itself is clipped to its chamfered frame
  if (!b) { b = document.createElement('span'); b.id = 'ptsbadge'; btn.after(b); }
  b.classList.toggle('hidden', btn.classList.contains('hidden'));
  const text = n ? String(n) : '';
  if (b.textContent === text) return;
  b.textContent = text;
  btn.classList.toggle('alert', n > 0);
  btn.title = n ? `${tr('Karakter (I)')}: ${t('{a} poin atribut · {b} poin bakat', { a: Math.max(0, attr), b: Math.max(0, talent) })}` : tr('Karakter (I)');
}
