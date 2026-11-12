// HUD "Bola & Bingkai" (spec §45.1): turns the existing HUD markup into the orb dock without
// changing any id (ui/hud.js, ui/touch.js and the cheat panel keep working). It only adds
// decoration (rune rings, bubbles, the middle frame with embers), groups the info corner and
// writes data/hud.js into CSS variables; ui/hud-orb.css does the rest under body.hud-orb.
// `?lama` (LOOK.hud null) leaves the old HUD untouched.
import { HUD, fanReach } from '../data/hud.js';
import { LOOK } from '../data/look.js';

const $ = (id) => document.getElementById(id);
export const hudOrb = () => LOOK.hud === 'orb';

const RUNE = '<svg class="rune" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="48" class="r1" pathLength="120"/><circle cx="50" cy="50" r="44.5" class="r2" pathLength="100"/></svg>';

function frag(html) { const t = document.createElement('template'); t.innerHTML = html; return t.content; }

export function setupHudOrb() {
  if (!hudOrb()) return;
  document.body.classList.add('hud-orb');
  const root = document.documentElement.style, px = (v) => `${v}px`;
  root.setProperty('--ho-orb-pc', px(HUD.orb.pc));
  root.setProperty('--ho-orb-touch', px(HUD.orb.touch));
  root.setProperty('--ho-overlap', px(HUD.overlap));
  root.setProperty('--ho-bottom-pc', px(HUD.dockBottom.pc));
  root.setProperty('--ho-bottom-touch', px(HUD.dockBottom.touch));
  root.setProperty('--ho-edge', px(HUD.edge));
  root.setProperty('--ho-atk', px(HUD.fan.atk));
  root.setProperty('--ho-fan-bottom', px(HUD.fan.bottom));
  root.setProperty('--ho-reach', px(fanReach()));

  // touch fan: every button sits at its angle / radius round the attack button
  const place = (id, a, r, size) => {
    const b = $(id);
    b.style.setProperty('--a', `${a}deg`); b.style.setProperty('--r', px(r)); b.style.setProperty('--s', px(size));
  };
  const f = HUD.fan;
  for (let i = 0; i < 4; i++) place(`act-s${i + 1}`, f.skill.from + i * f.skill.step, f.skill.r, f.skill.size);
  place('act-ult', f.ult.a, f.ult.r, f.ult.size);
  place('act-mount', f.mount.a, f.mount.r, f.mount.size);
  place('act-dodge', f.dodge.a, f.dodge.r, f.dodge.size);
  place('act-swap', f.swap.a, f.swap.r, f.swap.size);

  // orbs: a turning rune ring outside, bubbles rising inside the liquid
  const bubbles = Array.from({ length: HUD.bubbles }, (_, i) =>
    `<b class="bub" style="left:${12 + i * (76 / HUD.bubbles)}%;--d:${((i * 0.73) % 3).toFixed(2)}s;--s:${(2.2 + (i % 3) * 0.6).toFixed(1)}s"></b>`).join('');
  for (const bar of document.querySelectorAll('#hud .hpbar, #hud .enbar, #townhud .hpbar')) {
    bar.classList.add('orb');
    bar.prepend(frag(RUNE));
    bar.querySelector('i').append(frag(bubbles));
  }

  // the middle frame (behind the skills / belt) with embers rising off it
  const embers = Array.from({ length: HUD.embers }, (_, i) =>
    `<i style="left:${(i * 37) % 100}%;--d:${((i * 0.41) % 4).toFixed(2)}s;--s:${(2.6 + (i % 4) * 0.5).toFixed(1)}s;--x:${(i % 2 ? 1 : -1) * (6 + (i % 5) * 4)}px"></i>`).join('');
  for (const h of [$('hud'), $('townhud')]) h.append(frag(`<div class="hframe" aria-hidden="true"><div class="embers">${embers}</div></div>`));

  // the info corner (region / floor, kills, coins, clock, buffs) becomes one stack top left;
  // the quest tracker hangs under it (ui/hud.js updateQuestTracker)
  const info = (hud, ids) => {
    const box = document.createElement('div'); box.className = 'hinfo';
    for (const id of ids) box.append($(id));
    hud.prepend(box);
  };
  info($('hud'), ['meta', 'clock', 'buffs']);
  info($('townhud'), ['tmeta', 'tclock']);

  for (const id of ['act-attack', 'act-talk']) $(id).prepend(frag(RUNE));

  // the touch dock's frame is as wide as the belt; on PC as wide as the skill row (+ belt)
  const fit = () => {
    const w = Math.max($('actions').offsetWidth * (document.body.classList.contains('touch') ? 0 : 1), $('belt').offsetWidth);
    root.setProperty('--ho-fw', px(Math.max(150, w + 28)));
  };
  new ResizeObserver(fit).observe($('actions'));
  new ResizeObserver(fit).observe($('belt'));
  new MutationObserver(fit).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  fit();
}
