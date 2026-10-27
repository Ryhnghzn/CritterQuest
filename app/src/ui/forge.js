// Forge & jeweller panels (spec §20): pick an item from the bag, then enhance /
// reroll / salvage (Pandai Brom) or socket / unsocket / combine gems (Sari).
import { el, button } from './screens.js';
import { gearCanvas } from '../art/gear.js';
import { RARITIES, BONUSES } from '../data/items.js';
import { MATS, MAT_IDS, ENHANCE, enhanceCost, GEMS, GEM_IDS, GEM_TIERS, GEM_TIER_NAMES, GEM_COMBINE, UNSOCKET_GOLD } from '../data/forge.js';
import { itemName, itemStats, statText } from '../meta/itemgen.js';
import { isEquipped } from '../meta/gear.js';
import { rerollCost, salvageYield, combineCost } from '../meta/forge.js';

let picked = null;          // item id in the forge / jeweller
let toSalvage = new Set();  // items marked for salvaging

const sorted = (inv) => inv.slice().sort((a, b) => b.rarity - a.rarity || (b.plus || 0) - (a.plus || 0) || b.itemLevel - a.itemLevel);

export function matsBar(char) {
  const bar = el('div', 'matsbar');
  bar.append(el('span', 'hchip gold', `${char.gold} koin`));
  for (const m of MAT_IDS) {
    const c = el('span', 'hchip mat');
    c.style.setProperty('--c', MATS[m].color);
    c.append(el('i'), `${char.mats[m]} ${MATS[m].name}`);
    bar.append(c);
  }
  return bar;
}

function itemTile(char, it, sel, onClick) {
  const t = button('', `gtile${sel ? ' sel' : ''}`, onClick);
  t.style.setProperty('--c', RARITIES[it.rarity].color);
  t.append(gearCanvas(it, 26), el('span', 'ilv', String(it.itemLevel)));
  if (it.plus) t.append(el('span', 'iplus', `+${it.plus}`));
  if (isEquipped(char, it)) t.append(el('span', 'eq', 'E'));
  t.title = itemName(it);
  t.dataset.item = it.id;
  return t;
}

function picker(char, filter, redraw) {
  const grid = el('div', 'gearbag');
  const items = sorted(char.inventory).filter(filter);
  if (picked && !items.some((x) => x.id === picked)) picked = null;
  for (const it of items) grid.append(itemTile(char, it, it.id === picked, () => { picked = it.id; redraw(); }));
  if (!items.length) grid.append(el('div', 'note', 'Tidak ada gear yang cocok di tas.'));
  return grid;
}

function costRow(char, cost) {
  const row = el('div', 'costs');
  if (cost.gold) row.append(el('span', `cost${char.gold < cost.gold ? ' short' : ''}`, `${cost.gold} koin`));
  for (const m of MAT_IDS) if (cost[m]) row.append(el('span', `cost${char.mats[m] < cost[m] ? ' short' : ''}`, `${cost[m]} ${MATS[m].name}`));
  return row;
}

// ——— Pandai Brom: Tempa ———
export function forgePanel(char, { onEnhance, onReroll }, redraw) {
  const wrap = el('div', 'forge');
  wrap.append(matsBar(char), picker(char, () => true, redraw));
  const it = picked && char.inventory.find((x) => x.id === picked);
  if (!it) { wrap.append(el('div', 'note', 'Pilih gear untuk ditempa.')); return wrap; }
  const card = el('div', 'panel fcard');
  card.style.setProperty('--c', RARITIES[it.rarity].color);
  const head = el('div', 'gdhead');
  const ic = el('span', 'gdic'); ic.append(gearCanvas(it, 40));
  const nm = el('div'); nm.append(el('b', 'gdname', itemName(it)), el('span', 'gdsub', `${RARITIES[it.rarity].name} · LV ${it.itemLevel} · tempa +${it.plus}/${ENHANCE.max}`));
  head.append(ic, nm);
  card.append(head);

  if (it.plus < ENHANCE.max) {
    const bare = { ...it, bonuses: [], sockets: [] }; // compare the base stats only
    const now = itemStats(bare), next = itemStats({ ...bare, plus: it.plus + 1 });
    const lines = el('div', 'gdlines');
    for (const k of Object.keys(it.base)) lines.append(el('div', 'base', `${statText(k, now[k])}  →  ${statText(k, next[k]).replace(/ .*/, '')}`));
    card.append(lines);
    const p = it.plus, chance = ENHANCE.chance[p];
    card.append(el('div', `note chance${chance < 1 ? ' risky' : ''}`,
      chance >= 1 ? 'Peluang berhasil 100%' : `Peluang berhasil ${Math.round(chance * 100)}%${p >= ENHANCE.dropFrom ? ' — gagal: turun 1 tingkat' : ' — gagal: tetap'}`));
    card.append(costRow(char, enhanceCost(it, p)));
    const b = button(`Tempa ke +${p + 1}`, 'btn small', () => onEnhance(it.id));
    b.id = 'forge-enhance';
    card.append(b);
  } else card.append(el('div', 'note', 'Sudah ditempa maksimal.'));

  if (it.bonuses.length) {
    card.append(el('span', 'note', 'Asah ulang satu bonus:'));
    const rc = rerollCost(it);
    it.bonuses.forEach((bn, i) => {
      const row = el('div', 'rerow');
      const btn = button('Acak', 'btn ghost small', () => onReroll(it.id, i));
      btn.dataset.line = i;
      row.append(el('span', 'bonus', statText(bn.stat, bn.value)), btn);
      card.append(row);
    });
    card.append(costRow(char, rc));
  }
  wrap.append(card);
  return wrap;
}

// ——— Pandai Brom: Urai ———
export function salvagePanel(char, onSalvage, redraw) {
  for (const id of toSalvage) if (!char.inventory.some((x) => x.id === id)) toSalvage.delete(id);
  const wrap = el('div', 'sellbox');
  wrap.append(matsBar(char));
  const grid = el('div', 'gearbag');
  for (const it of sorted(char.inventory).reverse()) {
    const worn = isEquipped(char, it);
    const t = itemTile(char, it, toSalvage.has(it.id), () => {
      if (worn) return;
      if (toSalvage.has(it.id)) toSalvage.delete(it.id); else toSalvage.add(it.id);
      redraw();
    });
    if (worn) t.classList.add('empty');
    grid.append(t);
  }
  wrap.append(grid);
  const marked = char.inventory.filter((it) => toSalvage.has(it.id));
  const y = salvageYield(marked);
  const yieldText = MAT_IDS.filter((m) => y[m]).map((m) => `${y[m]} ${MATS[m].name}`).join(', ') || '—';
  wrap.append(el('div', 'note', `Hasil: ${yieldText}${marked.some((it) => it.rarity >= 3) ? ' (+ peluang permata)' : ''}`));
  const act = el('div', 'row');
  const pick = (r) => button(r === 0 ? 'Pilih semua Biasa' : 'Pilih ≤ Bagus', 'btn ghost small', () => {
    toSalvage = new Set(char.inventory.filter((it) => it.rarity <= r && !isEquipped(char, it)).map((it) => it.id));
    redraw();
  });
  const go = button(`Urai ${toSalvage.size}`, 'btn small', () => { const ids = [...toSalvage]; toSalvage.clear(); onSalvage(ids); });
  go.id = 'forge-salvage';
  go.disabled = !toSalvage.size;
  act.append(pick(0), pick(1), go);
  wrap.append(act);
  return wrap;
}

// ——— Tukang Permata: Pasang ———
const gemLabel = (gem, tier) => `${GEMS[gem].name} ${GEM_TIER_NAMES[tier - 1]}`;
const gemText = (gem, tier) => statText(GEMS[gem].stat, GEMS[gem].values[tier - 1]);

export function socketPanel(char, { onSocket, onUnsocket }, redraw) {
  const wrap = el('div', 'forge');
  wrap.append(picker(char, (it) => it.sockets.length > 0, redraw));
  const it = picked && char.inventory.find((x) => x.id === picked);
  if (!it) { wrap.append(el('div', 'note', 'Pilih gear yang punya lubang soket (Langka ke atas).')); return wrap; }
  const card = el('div', 'panel fcard');
  card.style.setProperty('--c', RARITIES[it.rarity].color);
  card.append(el('b', 'gdname', itemName(it)));
  it.sockets.forEach((s, i) => {
    const row = el('div', 'socket');
    if (s) {
      const gem = el('span', 'gemtag', `${gemLabel(s.gem, s.tier)} · ${gemText(s.gem, s.tier)}`);
      gem.style.setProperty('--c', GEMS[s.gem].color);
      const b = button(`Lepas (${UNSOCKET_GOLD} koin)`, 'btn ghost small', () => onUnsocket(it.id, i));
      row.append(gem, b);
    } else {
      row.append(el('span', 'note', `Soket ${i + 1} kosong — pilih permata:`));
      const opts = el('div', 'gemopts');
      for (const g of GEM_IDS) for (let t = GEM_TIERS; t >= 1; t--) {
        const n = char.gems[g][t - 1];
        if (!n) continue;
        const b = button(`${gemLabel(g, t)} ×${n}`, 'gemopt', () => onSocket(it.id, i, g, t));
        b.style.setProperty('--c', GEMS[g].color);
        b.title = gemText(g, t);
        b.dataset.gem = `${g}${t}`;
        opts.append(b);
      }
      if (!opts.childElementCount) opts.append(el('span', 'note', 'Belum punya permata. Didapat dari bos & mengurai gear Epik ke atas.'));
      row.append(opts);
    }
    card.append(row);
  });
  wrap.append(card);
  return wrap;
}

// ——— Tukang Permata: Gabung ———
export function combinePanel(char, onCombine) {
  const wrap = el('div', 'gemtable');
  const head = el('div', 'gemrow head');
  head.append(el('span', null, 'Permata'));
  for (let t = 1; t <= GEM_TIERS; t++) head.append(el('span', null, GEM_TIER_NAMES[t - 1]));
  wrap.append(head);
  for (const g of GEM_IDS) {
    const row = el('div', 'gemrow');
    const name = el('b', null, GEMS[g].name);
    name.style.color = GEMS[g].color;
    row.append(name);
    for (let t = 1; t <= GEM_TIERS; t++) {
      const n = char.gems[g][t - 1];
      const cell = el('span', 'gemcell');
      cell.append(el('i', null, String(n)));
      if (t < GEM_TIERS && n >= GEM_COMBINE.count) {
        const b = button(`3→1 · ${combineCost(t)}`, 'btn ghost small', () => onCombine(g, t));
        b.dataset.combine = `${g}${t}`;
        cell.append(b);
      }
      row.append(cell);
    }
    wrap.append(row);
  }
  wrap.append(el('div', 'note', `Gabungkan ${GEM_COMBINE.count} permata menjadi 1 tingkat lebih tinggi. Efek: ${GEM_IDS.map((g) => `${GEMS[g].name} = ${BONUSES[GEMS[g].stat].label}`).join(', ')}.`));
  return wrap;
}
