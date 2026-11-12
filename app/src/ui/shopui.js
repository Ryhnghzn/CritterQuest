// Shop panel (spec §45.5, sample app/dialog.html → Pandai Brom): a grid of goods framed by rarity,
// a detail card (big icon, name in its rarity colour, stats against what is worn, chest odds, the
// price and Buy), the coins rolling to their new sum, a bag that bounces with what came in, and
// "Masuk tas" / "Terjual" notes. Pandai Brom first: Peti (buy chests) and Jual (sell gear); the
// other trades follow (plan Bagian E). The game state lives in main.js: buying / selling go
// through the ctx callbacks, the panel is drawn again after each one and plays what changed.
import { el, button } from './screens.js';
import { gearCanvas } from '../art/gear.js';
import { iconCanvas } from '../art/sprites.js';
import { CHESTS, DROP_WEIGHTS, RARITIES, SELL_PRICE } from '../data/items.js';
import { chestPrice, junkIds } from '../meta/shop.js';
import { itemName, itemStats, statText } from '../meta/itemgen.js';
import { isEquipped, equippedItem } from '../meta/gear.js';
import { tr, t, num } from '../i18n.js';

const SLOT_NAME = { weapon: 'Senjata', helm: 'Helm', armor: 'Zirah', boots: 'Sepatu', amulet: 'Kalung', ring: 'Cincin' };
let pick = { peti: 'chest', jual: null }; // the good shown in the card, per tab
let marked = new Set();                   // Jual: items ticked for selling
let lastGold = null, lastIds = null;      // what the previous draw showed (for the roll and "Masuk tas")
let pendingFx = null;                     // set right before buying / selling: what the next draw plays

let session = null;                       // which shop visit the remembered state belongs to

// tab: 'peti' | 'jual'; onTab(tab) (null: the caller has its own tabs); ctx: { onBuyChest(kind),
// onSell(ids) }; redraw(); title: the shop's name; visit: a key per shop visit (a new visit starts clean)
export function shopPanel(char, tab, onTab, ctx, redraw, title, visit = null) {
  if (visit !== session) { session = visit; lastGold = null; lastIds = null; marked = new Set(); pendingFx = null; }
  const root = el('div', 'shopui');
  const goldNow = char.gold, from = lastGold ?? goldNow;
  const ids = new Set(char.inventory.map((x) => x.id));
  const fresh = lastIds ? char.inventory.filter((x) => !lastIds.has(x.id)) : [];
  lastGold = goldNow; lastIds = ids;
  for (const id of marked) if (!ids.has(id)) marked.delete(id);

  // head: the shop, the bag (+n), the coins
  const head = el('div', 'sh-head');
  const bag = el('span', 'bag');
  bag.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 7V5a4 4 0 0 1 8 0v2"/><path d="M4 8h16l-1.4 12.2a2 2 0 0 1-2 1.8H7.4a2 2 0 0 1-2-1.8z"/><path d="M9 12h6"/></svg>';
  bag.append(el('b', 'cnt', fresh.length ? `+${fresh.length}` : ''));
  const gold = el('span', 'gold'); gold.append(el('i', 'coin'), el('b', null, String(from)));
  head.append(el('h3', null, title), bag, gold);
  const tabs = el('div', 'sh-tabs');
  if (onTab) for (const [id, label] of [['peti', 'Peti'], ['jual', 'Jual']]) {
    const b = button(tr(label), `tab${tab === id ? ' on' : ''}`, () => onTab(id));
    b.dataset.t = id;
    tabs.append(b);
  }
  const bodyEl = el('div', 'sh-body');
  const grid = el('div', 'sh-grid'), card = el('div', 'sh-card');
  bodyEl.append(grid, card);
  const log = el('div', 'sh-log');
  root.append(head, ...(onTab ? [tabs] : []), bodyEl, log);

  if (tab === 'peti') chestTab(char, grid, card, ctx, redraw);
  else sellTab(char, grid, card, ctx, redraw);

  // what just happened: the coins roll, the bag bounces, notes come in
  if (from !== goldNow) rollGold(gold.querySelector('b'), from, goldNow);
  const fx = pendingFx; pendingFx = null;
  if (fresh.length) {
    bag.classList.add('pop');
    for (const it of fresh) note(log, gearCanvas(it, 22), tr('Masuk tas'), itemName(it), RARITIES[it.rarity].color);
  }
  if (fx?.sold && goldNow > from) note(log, iconCanvas('coin', 20), t('Terjual {n}', { n: fx.sold }), `+${goldNow - from} ${tr('koin')}`, '#f0c870');
  if (fx && goldNow !== from) gold.classList.add('bump');
  return root;
}

function chestTab(char, grid, card, ctx, redraw) {
  const kinds = Object.keys(CHESTS);
  if (!kinds.includes(pick.peti)) pick.peti = kinds[0];
  for (const kind of kinds) {
    const c = CHESTS[kind], price = chestPrice(char, kind), top = DROP_WEIGHTS[c.source].findLastIndex((w) => w > 0);
    const cell = button('', `cell r${top}${pick.peti === kind ? ' on' : ''}${char.gold < price ? ' poor' : ''}`, () => { pick.peti = kind; redraw(); });
    cell.style.setProperty('--rc', RARITIES[top].color);
    cell.dataset.chest = kind;
    cell.append(iconCanvas('chest', 40), priceTag(price));
    grid.append(cell);
  }
  const kind = pick.peti, c = CHESTS[kind], price = chestPrice(char, kind);
  const w = DROP_WEIGHTS[c.source], total = w.reduce((a, b) => a + b, 0), top = w.findLastIndex((x) => x > 0);
  card.style.setProperty('--rc', RARITIES[top].color);
  card.append(cardTop(iconCanvas('chest', 64), c.name, t('1 gear LV {n}', { n: char.level })));
  const info = el('div', 'cd-info');
  const odds = el('div', 'odds');
  w.forEach((x, r) => { if (x) { const s = el('span'); const dot = el('i'); dot.style.background = RARITIES[r].color; s.append(dot, `${RARITIES[r].name} ${num(Math.round((x / total) * 1000) / 10)}%`); odds.append(s); } });
  info.append(el('p', 'desc', tr('Satu gear acak setingkat levelmu.')), odds);
  const foot = el('div', 'cd-foot');
  const buy = button('', `buy${char.gold < price ? ' poor' : ''}`, () => { pendingFx = { bought: kind }; ctx.onBuyChest(kind); });
  buy.append(`${tr('Beli')} · `, el('i', 'coin'), String(price));
  buy.dataset.chest = kind;
  foot.append(buy);
  card.append(info, foot);
}

function sellTab(char, grid, card, ctx, redraw) {
  const items = char.inventory.slice().sort((a, b) => a.rarity - b.rarity || a.itemLevel - b.itemLevel);
  if (!items.some((x) => x.id === pick.jual)) pick.jual = items.find((x) => !isEquipped(char, x))?.id ?? null;
  for (const it of items) {
    const worn = isEquipped(char, it);
    const cell = button('', `cell r${it.rarity}${pick.jual === it.id ? ' on' : ''}${marked.has(it.id) ? ' marked' : ''}${worn ? ' worn' : ''}`, () => {
      pick.jual = it.id;
      if (!worn) { if (marked.has(it.id)) marked.delete(it.id); else marked.add(it.id); }
      redraw();
    });
    cell.style.setProperty('--rc', RARITIES[it.rarity].color);
    cell.dataset.item = it.id;
    cell.append(gearCanvas(it, 40), worn ? el('b', 'pr eq', tr('Dipakai')) : priceTag(SELL_PRICE(it)));
    grid.append(cell);
  }
  if (!items.length) grid.append(el('p', 'empty', tr('Tasmu kosong.')));
  const it = items.find((x) => x.id === pick.jual);
  if (it) {
    card.style.setProperty('--rc', RARITIES[it.rarity].color);
    card.append(cardTop(gearCanvas(it, 64), itemName(it), `${RARITIES[it.rarity].name} · ${tr(SLOT_NAME[it.slot])} · LV ${it.itemLevel}`));
    const info = el('div', 'cd-info');
    const now = itemStats(it), worn = equippedItem(char, it.slot), cur = worn && worn.id !== it.id ? itemStats(worn) : null;
    for (const [stat, v] of Object.entries(now)) {
      const row = el('div', 'st'); row.append(el('span', null, statText(stat, v)));
      const d = cur ? v - (cur[stat] || 0) : 0;
      if (d) row.append(el('em', d > 0 ? 'up' : 'dn', `${d > 0 ? '▲' : '▼'} ${num(Math.round(Math.abs(d) * 10) / 10)}`));
      info.append(row);
    }
    if (cur) info.append(el('div', 'vs', `${tr('Dibanding yang kau pakai')}: ${itemName(worn)}`));
    card.append(info);
  } else card.append(el('p', 'empty', tr('Ketuk barang untuk melihatnya.')));
  const total = items.filter((x) => marked.has(x.id)).reduce((n, x) => n + SELL_PRICE(x), 0);
  const foot = el('div', 'cd-foot wrap');
  const pickJunk = (r) => button(tr(r === 0 ? 'Pilih semua Biasa' : 'Pilih ≤ Bagus'), 'btn ghost small', () => { marked = new Set(junkIds(char, r)); redraw(); });
  const sell = button('', 'buy sell', () => { const ids = [...marked]; marked.clear(); pendingFx = { sold: ids.length }; ctx.onSell(ids); });
  sell.id = 'npc-sell';
  if (marked.size) sell.append(`${t('Jual {n}', { n: marked.size })} · `, el('i', 'coin'), String(total)); else sell.append(tr('Pilih barang untuk dijual'));
  sell.disabled = !marked.size;
  foot.append(pickJunk(0), pickJunk(1), sell);
  card.append(foot);
}

function cardTop(icon, name, sub) {
  const top = el('div', 'cd-top'), ic = el('div', 'cd-ic');
  ic.append(icon);
  const nm = el('div', 'cd-nm'); nm.append(el('b', null, name), el('span', null, sub));
  top.append(ic, nm);
  return top;
}
function priceTag(n) { const b = el('b', 'pr'); b.append(el('i', 'coin'), String(n)); return b; }
function note(log, icon, label, text, color) {
  const n = el('div', 'note');
  n.style.setProperty('--rc', color);
  n.append(icon, el('span', null, label), el('b', null, text));
  log.prepend(n);
  setTimeout(() => n.classList.add('out'), 3200);
  setTimeout(() => n.remove(), 3700);
}
function rollGold(b, from, to) {
  const t0 = performance.now(), dur = 700;
  const step = (now) => {
    if (!b.isConnected) return;
    const k = Math.min(1, (now - t0) / dur), e = 1 - (1 - k) ** 3;
    b.textContent = String(Math.round(from + (to - from) * e));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
