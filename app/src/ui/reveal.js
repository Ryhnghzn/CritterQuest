// Item reveals (plan "Efek Lebay" §E): opening a chest bought at the smith (the
// lid flies off, beams in the rarity colour, the item rises out), the big
// card shown when a Mitos item is picked up mid-fight, and the reward pop-up when a
// quest, bounty or expedition is claimed. DOM + canvas overlays.
import { el } from './screens.js';
import { tr, t } from '../i18n.js';
import { MATS, GEMS } from '../data/forge.js';
import { POTIONS } from '../data/potions.js';
import { REWARD_POP } from '../data/itemfx.js';
import { iconCanvas } from '../art/sprites.js';
import { RARITIES, SLOTS, MYTHIC } from '../data/items.js';
import { CHEST_FX, MYTHIC_PICK } from '../data/itemfx.js';
import { drawGearIcon, gearCanvas } from '../art/gear.js';
import { itemName, gemName } from '../meta/itemgen.js';
import { INK } from '../art/gear.js';

const TAU = Math.PI * 2;
const ease = (k) => 1 - (1 - k) ** 3;
const clamp01 = (k) => Math.max(0, Math.min(1, k));

// Chest animation state at time t (s) for an item of `rarity`. Pure, so it is testable.
// shake: chest rattle 0..1 · lid: 0 shut … 1 flown off · beams: light 0..1 · rise: item 0..1 · done
export function chestPhase(t, rarity) {
  const { lidAt, duration, beams, sparks } = CHEST_FX;
  const open = clamp01((t - lidAt) / 0.5);
  return {
    shake: t < lidAt ? Math.min(1, t / lidAt) * CHEST_FX.shake : 0,
    lid: open,
    beams: ease(clamp01((t - lidAt) / 0.35)) * (1 - clamp01((t - duration + 0.3) / 0.3) * 0.3),
    beamCount: beams[rarity],
    sparks: sparks[rarity],
    rise: ease(clamp01((t - lidAt - 0.15) / 0.8)),
    name: t >= lidAt + 0.6,
    done: t >= duration,
  };
}

// Highest rarity among items (what colours the chest light).
export const topRarity = (items) => items.reduce((m, it) => Math.max(m, it.rarity), 0);

let active = null;

// Chest-opening overlay; tap / Enter / Esc skips to the end, a second tap closes.
export function showChestOpen(items) {
  const list = Array.isArray(items) ? items : [items];
  if (!list.length || typeof document === 'undefined') return;
  closeReveal();
  const top = topRarity(list), item = list.find((it) => it.rarity === top);
  const color = RARITIES[top].color;
  const box = el('div', `reveal r${top}`);
  box.style.setProperty('--c', color);
  const size = Math.min(300, innerWidth - 40);
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const c = document.createElement('canvas');
  c.width = c.height = Math.round(size * dpr);
  c.style.width = c.style.height = `${size}px`;
  const name = el('div', 'rvname hidden', itemName(item));
  const sub = el('div', 'rvsub hidden', `${RARITIES[top].name} · ${SLOTS[item.slot].name} · LV ${item.itemLevel}`);
  const hint = el('div', 'rvhint', tr('Ketuk untuk lanjut'));
  box.append(c, name, sub, hint);
  document.body.append(box);
  const g = c.getContext('2d');
  let t0 = performance.now(), raf = 0;
  const frame = (now) => {
    const t = (now - t0) / 1000, p = chestPhase(t, top);
    drawChest(g, c.width / dpr, dpr, p, item, color, t);
    name.classList.toggle('hidden', !p.name); sub.classList.toggle('hidden', !p.name);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  const skip = () => {
    if ((performance.now() - t0) / 1000 < CHEST_FX.duration) t0 = performance.now() - CHEST_FX.duration * 1000;
    else closeReveal();
  };
  const key = (e) => { if (['Enter', 'Escape', ' '].includes(e.key)) { e.preventDefault(); skip(); } };
  box.addEventListener('click', skip);
  addEventListener('keydown', key, true);
  active = () => { cancelAnimationFrame(raf); removeEventListener('keydown', key, true); box.remove(); };
}

export function closeReveal() { if (active) { active(); active = null; } }

function drawChest(g, S, dpr, p, item, color, t) {
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, S, S);
  const k = S / 100; // drawing space 100 × 100
  g.scale(k, k);
  g.lineJoin = 'round';
  const cx = 50, cy = 66;
  // beams behind everything
  if (p.beams > 0) {
    g.save(); g.globalCompositeOperation = 'lighter';
    g.translate(cx, cy - 8);
    for (let i = 0; i < p.beamCount; i++) {
      const a = -Math.PI / 2 + ((i / Math.max(1, p.beamCount - 1)) - 0.5) * 2.2 + Math.sin(t * 1.5 + i) * 0.04;
      const len = (48 + (i % 3) * 8) * p.beams, w = 4 + (i % 2) * 3;
      g.save(); g.rotate(a);
      const gr = g.createLinearGradient(0, 0, len, 0);
      gr.addColorStop(0, `${color}dd`); gr.addColorStop(1, `${color}00`);
      g.beginPath(); g.moveTo(0, -1); g.lineTo(len, -w); g.lineTo(len, w); g.lineTo(0, 1); g.closePath();
      g.fillStyle = gr; g.fill();
      g.restore();
    }
    const glow = g.createRadialGradient(0, 0, 2, 0, 0, 40 * p.beams);
    glow.addColorStop(0, 'rgba(255,255,255,.9)'); glow.addColorStop(0.3, `${color}88`); glow.addColorStop(1, `${color}00`);
    g.fillStyle = glow; g.fillRect(-45, -45, 90, 90);
    g.restore();
  }
  // chest body
  const sh = p.shake ? Math.sin(t * 60) * p.shake * 2.2 : 0;
  g.save(); g.translate(cx + sh, cy);
  g.beginPath(); g.ellipse(0, 14, 26, 4, 0, 0, TAU); g.fillStyle = 'rgba(0,0,0,.4)'; g.fill();
  g.beginPath(); g.roundRect(-22, -10, 44, 24, 3); fillInk(g, lin(g, -10, 14, '#7a4a2a', '#3e2414'));
  for (const x of [-15, 15]) { g.beginPath(); g.rect(x - 2.5, -10, 5, 24); fillInk(g, '#b8bec9', 0.8); }
  g.beginPath(); g.roundRect(-4, -6, 8, 8, 1.5); fillInk(g, '#ffcf5a', 0.8);
  if (p.lid > 0) { // light spilling over the rim
    g.save(); g.globalCompositeOperation = 'lighter';
    g.beginPath(); g.ellipse(0, -10, 21, 3.5, 0, 0, TAU); g.fillStyle = `${color}cc`; g.fill(); g.restore();
  }
  g.restore();
  // lid: shut, then flung up and spinning away
  const lp = ease(p.lid);
  g.save();
  g.translate(cx + sh + lp * 34, cy - 10 - lp * 46 + lp * lp * 30);
  g.rotate(lp * 2.6);
  g.globalAlpha = 1 - clamp01((p.lid - 0.7) / 0.3);
  g.beginPath(); g.moveTo(-23, 0); g.lineTo(-23, -7); g.quadraticCurveTo(0, -17, 23, -7); g.lineTo(23, 0); g.closePath();
  fillInk(g, lin(g, -16, 0, '#8a5a36', '#4a2a16'));
  for (const x of [-15, 15]) { g.beginPath(); g.rect(x - 2.5, -11.5, 5, 11.5); fillInk(g, '#b8bec9', 0.8); }
  g.restore();
  // sparks bursting out
  if (p.lid > 0) {
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < p.sparks; i++) {
      const a = -Math.PI / 2 + Math.sin(i * 12.9898) * 1.3, sp = 30 + (i * 37 % 40);
      const life = clamp01(p.lid * 1.6 - (i % 5) * 0.08);
      const x = cx + Math.cos(a) * sp * life, y = cy - 10 + Math.sin(a) * sp * life + life * life * 18;
      g.globalAlpha = 1 - life;
      g.fillStyle = i % 3 ? color : '#ffffff';
      g.beginPath(); g.arc(x, y, 1.1, 0, TAU); g.fill();
    }
    g.restore();
  }
  // the item rising out
  if (p.rise > 0) {
    g.save();
    g.translate(cx, cy - 12 - p.rise * 34);
    const s = 0.4 + p.rise * 0.9;
    g.scale(s, s);
    g.globalAlpha = Math.min(1, p.rise * 2);
    drawGearIcon(g, item, 34, t);
    g.restore();
  }
}

function lin(g, y0, y1, c0, c1) { const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, c0); gr.addColorStop(1, c1); return gr; }
function fillInk(g, fill, lw = 1.2) { g.fillStyle = fill; g.fill(); g.lineWidth = lw; g.strokeStyle = INK; g.stroke(); }

// Big card for a Mitos item picked up mid-fight; fades by itself, doesn't block play.
let cardTimer = 0;
export function showMythicCard(item) {
  if (typeof document === 'undefined') return;
  document.querySelector('.mythcard')?.remove();
  const card = el('div', 'mythcard');
  card.style.setProperty('--c', RARITIES[item.rarity].color);
  const ic = el('span', 'mcic'); ic.append(gearCanvas(item, 64));
  const txt = el('div');
  txt.append(el('span', 'mclabel', item.rarity === MYTHIC ? tr('ITEM MITOS!') : RARITIES[item.rarity].name), el('b', 'mcname', itemName(item)), el('span', 'mcsub', `${SLOTS[item.slot].name} · LV ${item.itemLevel}`));
  card.append(ic, txt);
  document.body.append(card);
  clearTimeout(cardTimer);
  cardTimer = setTimeout(() => { card.classList.add('out'); setTimeout(() => card.remove(), 400); }, MYTHIC_PICK.card * 1000);
}

// ——— reward pop-up ———
// r: { title, sub?, gold, exp, items: [item], gems: [{ gem, tier }], marks, mats: { id: n },
//      potions: { id: n }, shard, levelsGained } — every part optional.
// Rays and confetti behind, one card per reward popping in turn, coins & EXP counting up.
// A tap / Enter / Esc closes it (after a short guard so the claiming tap does not).
export function showRewardPop(r) {
  if (typeof document === 'undefined') return;
  closeReveal();
  const top = topRarity(r.items || []);
  const color = r.items?.length ? RARITIES[top].color : '#ffd24a';
  const box = el('div', 'rwpop');
  box.style.setProperty('--c', color);
  const fx = document.createElement('canvas');
  fx.className = 'rwfx';
  const rays = el('div', 'rwrays');
  const title = el('div', 'rwtitle', r.title);
  const cards = el('div', 'rwcards');
  const counters = [];
  const card = (icon, label, c = null, count = 0) => {
    const k = el('div', 'rwcard');
    if (c) k.style.setProperty('--c', c);
    k.style.animationDelay = `${0.35 + cards.childElementCount * REWARD_POP.stagger}s`;
    const ic = el('div', 'rwic'); if (icon) ic.append(icon);
    const b = el('b', null, count ? '+0' : label);
    if (count) counters.push({ el: b, n: count, fmt: label, at: 0.35 + cards.childElementCount * REWARD_POP.stagger });
    k.append(ic, b);
    cards.append(k);
  };
  if (r.shard) card(iconCanvas('zap', 40), tr('Pecahan Segel'), '#ffd24a');
  for (const it of r.items || []) card(gearCanvas(it, 52), itemName(it), RARITIES[it.rarity].color);
  for (const g of r.gems || []) card(iconCanvas('gem', 38), gemName(g.gem, g.tier), GEMS[g.gem].color);
  if (r.marks) { const m = el('span', 'markic big'); card(m, t('+{n} Lencana', { n: r.marks }), '#9fe0ff'); }
  for (const [m, n] of Object.entries(r.mats || {})) { if (!n) continue; const d = el('i', 'matdot big'); d.style.background = MATS[m].color; card(d, `+${n} ${MATS[m].name}`, MATS[m].color); }
  for (const [p, n] of Object.entries(r.potions || {})) if (n) card(iconCanvas(`pot_${p}`, 38), `+${n} ${POTIONS[p].name}`);
  if (r.gold) card(el('span', 'coin big'), '{n} koin', '#e6c27a', r.gold);
  if (r.exp) card(el('span', 'rwexp', 'EXP'), '{n} EXP', '#8ff5c8', r.exp);
  box.append(fx, rays, title);
  if (r.sub) box.append(el('div', 'rwsub', r.sub));
  box.append(cards);
  if (r.levelsGained) box.append(el('div', 'rwlevel', r.levelsGained > 1 ? t('Naik {n} level!', { n: r.levelsGained }) : tr('Naik level!')));
  box.append(el('div', 'rvhint', tr('Ketuk untuk lanjut')));
  document.body.append(box);

  const dpr = Math.min(devicePixelRatio || 1, 2);
  const W = innerWidth, H = innerHeight;
  fx.width = Math.round(W * dpr); fx.height = Math.round(H * dpr);
  const g = fx.getContext('2d');
  const palette = ['#ffd24a', '#ff6b6b', '#7fd8ff', '#8ff5c8', '#ffffff', color];
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches; // no confetti when the system asks for less motion
  const bits = Array.from({ length: calm ? 0 : REWARD_POP.confetti }, (_, i) => ({
    x: W / 2, y: H * 0.36, a: Math.random() * TAU, v: 260 + Math.random() * 520, spin: (Math.random() - 0.5) * 14,
    w: 4 + Math.random() * 6, h: 3 + Math.random() * 4, c: palette[i % palette.length], delay: (i % 3) * 0.12,
  }));
  const t0 = performance.now();
  let raf = 0;
  const frame = (now) => {
    const s = (now - t0) / 1000;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    for (const b of bits) {
      const k = s - b.delay;
      if (k <= 0 || k > REWARD_POP.life) continue;
      const drag = (1 - Math.exp(-k * 2.2)) / 2.2; // fast burst slowing down, then falling
      const x = b.x + Math.cos(b.a) * b.v * drag, y = b.y + Math.sin(b.a) * b.v * drag + 260 * k * k * 0.5;
      g.save(); g.translate(x, y); g.rotate(b.spin * k);
      g.globalAlpha = Math.min(1, (REWARD_POP.life - k) / 0.6);
      g.fillStyle = b.c; g.fillRect(-b.w / 2, -b.h / 2, b.w, b.h * Math.abs(Math.cos(b.spin * k * 0.7)) + 0.6);
      g.restore();
    }
    for (const c of counters) {
      const k = clamp01((s - c.at) / REWARD_POP.count);
      c.el.textContent = `+${t(c.fmt, { n: Math.round(c.n * ease(k)) })}`;
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  const close = () => { if (performance.now() - t0 > REWARD_POP.guard * 1000) closeReveal(); };
  const key = (e) => { if (['Enter', 'Escape', ' '].includes(e.key)) { e.preventDefault(); e.stopImmediatePropagation(); close(); } };
  box.addEventListener('click', close);
  addEventListener('keydown', key, true);
  active = () => { cancelAnimationFrame(raf); removeEventListener('keydown', key, true); box.remove(); };
}
