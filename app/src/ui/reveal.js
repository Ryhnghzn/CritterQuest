// Item reveals (plan "Efek Lebay" §E): opening a chest bought at the smith (the
// lid flies off, beams in the rarity colour, the item rises out) and the big
// card shown when a Mitos item is picked up mid-fight. DOM + canvas overlays.
import { el } from './screens.js';
import { tr } from '../i18n.js';
import { RARITIES, SLOTS, MYTHIC } from '../data/items.js';
import { CHEST_FX, MYTHIC_PICK } from '../data/itemfx.js';
import { drawGearIcon, gearCanvas } from '../art/gear.js';
import { itemName } from '../meta/itemgen.js';
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
