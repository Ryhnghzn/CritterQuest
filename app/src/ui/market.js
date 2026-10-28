// Big-town merchants (spec §25.2): gear displays (Pandai Senjata, Penjahit Zirah,
// Toko Perhiasan), the night merchant and the materials & gems trader.
import { el, button } from './screens.js';
import { gearCanvas } from '../art/gear.js';
import { RARITIES } from '../data/items.js';
import { MATS, GEMS, GEM_TIER_NAMES } from '../data/forge.js';
import { itemName, gemName } from '../meta/itemgen.js';
import { displayStock, nightStock, matsStock, isNight } from '../meta/market.js';
import { detail } from './gear.js';
import { matsBar } from './forge.js';
import { tr, t } from '../i18n.js';

let picked = null; // `${shop}:${key}` of the item looked at

// a grid of wares; tapping one shows its stats, price and a buy button
function wareGrid(char, shop, entries, onBuy, redraw) {
  const wrap = el('div', 'market');
  const grid = el('div', 'gearbag');
  for (const e of entries) {
    const id = `${shop}:${e.key}`;
    const g = button('', `gtile${picked === id ? ' sel' : ''}${e.sold ? ' empty' : ''}`, () => { picked = id; redraw(); });
    g.style.setProperty('--c', RARITIES[e.item.rarity].color);
    g.append(gearCanvas(e.item, 26), el('span', 'ilv', String(e.item.itemLevel)));
    if (e.sold) g.append(el('span', 'eq sold', '✓'));
    g.title = `${itemName(e.item)} — ${e.sold ? tr('Terjual') : t('{n} koin', { n: e.price })}`;
    g.dataset.ware = e.key;
    grid.append(g);
  }
  wrap.append(grid);
  const e = entries.find((x) => `${shop}:${x.key}` === picked) || entries.find((x) => !x.sold);
  if (e) {
    picked = `${shop}:${e.key}`;
    const box = el('div', 'panel gdetail');
    detail(box, char, e.item, { editable: false, quiet: true });
    const act = el('div', 'row');
    if (e.sold) act.append(el('span', 'note', tr('Terjual — stok baru besok pagi.')));
    else {
      const b = button(t('Beli — {n} koin', { n: e.price }), 'btn small', () => onBuy(e.key));
      b.id = 'market-buy';
      b.disabled = char.gold < e.price;
      act.append(b);
    }
    box.append(act);
    wrap.append(box);
  } else wrap.append(el('div', 'note', tr('Semua habis terjual. Stok baru besok pagi.')));
  return wrap;
}

export function displayPanel(char, townId, shop, onBuy, redraw) {
  const box = el('div', 'marketbox');
  box.append(el('div', 'note', tr('Stok berganti tiap pagi (05:00).')), wareGrid(char, shop, displayStock(char, townId, shop), onBuy, redraw));
  return box;
}

function gemRow(char, e, label, onBuy) {
  const row = el('div', 'shoprow');
  const ic = el('span', 'sic');
  const dot = el('i', 'gemdot');
  dot.style.setProperty('--c', GEMS[e.gem ?? e.id].color);
  ic.append(dot);
  const txt = el('div', 'stx');
  txt.append(el('b', null, label), el('span', null, e.left !== undefined ? t('Sisa {n} hari ini', { n: e.left }) : e.sold ? tr('Terjual') : tr('Hanya satu')));
  row.append(ic, txt, el('span', 'have', ''), onBuy);
  return row;
}

export function nightPanel(char, townId, { onBuyNight }, redraw) {
  const box = el('div', 'marketbox');
  if (!isNight(char.clock)) { box.append(el('div', 'note', tr('Garo hanya berdagang malam hari (18:00–05:00).'))); return box; }
  const s = nightStock(char, townId);
  box.append(el('div', 'note', tr('Barang langka, hanya malam ini.')), wareGrid(char, 'night', s.items, onBuyNight, redraw));
  const list = el('div', 'shoplist');
  for (const g of s.gems) {
    const buy = button(`${g.price}`, 'btn small buy', () => onBuyNight(g.key));
    buy.prepend(el('span', 'coin'));
    buy.disabled = g.sold || char.gold < g.price;
    buy.dataset.ware = g.key;
    list.append(gemRow(char, g, gemName(g.gem, g.tier), buy));
  }
  box.append(list);
  return box;
}

export function matsPanel(char, townId, { onBuyMat }) {
  const box = el('div', 'marketbox');
  box.append(matsBar(char), el('div', 'note', tr('Stok terbatas, diisi ulang tiap pagi.')));
  const list = el('div', 'shoplist');
  for (const e of matsStock(char, townId)) {
    const btns = el('span', 'buys');
    for (const n of e.kind === 'mat' ? [1, 10] : [1]) {
      const b = button(n === 1 ? `${e.price}` : `×10 · ${e.price * 10}`, 'btn small buy', () => onBuyMat(e.key, n));
      if (n === 1) b.prepend(el('span', 'coin'));
      b.disabled = e.left < n || char.gold < e.price * n;
      b.dataset.ware = `${e.key}x${n}`;
      btns.append(b);
    }
    if (e.kind === 'gem') { list.append(gemRow(char, e, gemName(e.id, e.tier), btns)); continue; }
    const row = el('div', 'shoprow');
    const ic = el('span', 'sic');
    const dot = el('i', 'gemdot mat');
    dot.style.setProperty('--c', MATS[e.id].color);
    ic.append(dot);
    const txt = el('div', 'stx');
    txt.append(el('b', null, MATS[e.id].name), el('span', null, t('Sisa {n} hari ini', { n: e.left })));
    row.append(ic, txt, el('span', 'have', String(char.mats[e.id])), btns);
    list.append(row);
  }
  box.append(list);
  return box;
}
