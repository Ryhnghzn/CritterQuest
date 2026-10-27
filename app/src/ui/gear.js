// Gear tab of the Karakter panel (spec §6.5, §14.2): the six equipped slots, the
// bag sorted by rarity, and a detail card with stats, special effect, the
// change if worn, and Pasang / Lepas / Buang (only in town).
import { el, button } from './screens.js';
import { iconCanvas } from '../art/sprites.js';
import { gearCanvas } from '../art/gear.js';
import { GEMS, GEM_TIER_NAMES } from '../data/forge.js';
import { RARITIES, SLOTS, BONUSES } from '../data/items.js';
import { INVENTORY_MAX } from '../data/balance.js';
import { EQUIP_SLOTS } from '../meta/schema.js';
import { itemName, statText, effectText } from '../meta/itemgen.js';
import { equippedItem, isEquipped, canEquip, compare } from '../meta/gear.js';
import { tr, t, num } from '../i18n.js';

const SLOT_ICON = { weapon: 'gearSword', helm: 'gearHelm', armor: 'gearArmor', boots: 'gearBoots', amulet: 'gearAmulet', ring: 'gearRing' };
let selected = null; // id of the item shown in the detail card (kept across redraws)

const sorted = (inv) => inv.slice().sort((a, b) => b.rarity - a.rarity || b.itemLevel - a.itemLevel);

// opts: { editable, onEquip(id), onUnequip(slot), onDiscard(id) }
export function renderGearTab(char, opts, redraw) {
  const wrap = el('div', 'geartab');
  if (selected && !char.inventory.some((x) => x.id === selected)) selected = null;
  const pick = (id) => {
    selected = id;
    redraw();
    // phones: the detail card sits below the bag
    if (innerWidth < 760) document.querySelector('.gdetail')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  const worn = el('div', 'gearworn');
  for (const slot of EQUIP_SLOTS) {
    const it = equippedItem(char, slot);
    const g = tile(it, it ? () => pick(it.id) : null, slot);
    g.classList.add('slot');
    if (it && it.id === selected) g.classList.add('sel');
    worn.append(g);
  }

  const bag = el('div', 'gearbag');
  for (const it of sorted(char.inventory)) {
    const g = tile(it, () => pick(it.id));
    if (it.id === selected) g.classList.add('sel');
    if (isEquipped(char, it)) g.append(el('span', 'eq', 'E'));
    bag.append(g);
  }
  if (!char.inventory.length) bag.append(el('div', 'note', tr('Tas kosong. Gear didapat di dungeon.')));

  const head = el('div', 'attrhead');
  head.append(el('b', null, tr('Terpasang')), el('span', 'pts', t('Tas {n}/{m}', { n: char.inventory.length, m: INVENTORY_MAX })));
  const left = el('div', 'panel gearside');
  left.append(head, worn, el('b', 'bagtitle', tr('Tas')), bag);
  const right = el('div', 'panel gdetail');
  const it = selected && char.inventory.find((x) => x.id === selected);
  if (it) detail(right, char, it, opts);
  else right.append(el('div', 'note', tr('Pilih gear untuk melihat detailnya.')));
  wrap.append(left, right);
  return wrap;
}

function tile(it, onClick, slot = null) {
  const g = button('', 'gtile', onClick || (() => {}));
  if (it) {
    g.style.setProperty('--c', RARITIES[it.rarity].color);
    g.append(gearCanvas(it, 28), el('span', 'ilv', String(it.itemLevel)));
    if (it.plus) g.append(el('span', 'iplus', `+${it.plus}`));
    g.title = itemName(it);
    g.dataset.item = it.id;
  } else {
    g.classList.add('empty');
    g.append(iconCanvas(SLOT_ICON[slot], 24));
    g.title = t('{s} kosong', { s: SLOTS[slot].name });
    g.disabled = true;
  }
  return g;
}

const signed = (stat, d) => {
  const b = BONUSES[stat];
  const v = b.pct ? Math.round(Math.abs(d) * 1000) / 10 : Math.round(Math.abs(d) * 10) / 10;
  return `${d > 0 ? '+' : '−'}${num(v)}${b.pct || b.unit === '%' ? '%' : ''} ${b.label}`;
};

function detail(box, char, it, opts) {
  const r = RARITIES[it.rarity];
  box.style.setProperty('--c', r.color);
  const top = el('div', 'gdhead');
  const ic = el('span', 'gdic');
  ic.append(gearCanvas(it, 40));
  const nm = el('div');
  nm.append(el('b', 'gdname', itemName(it)), el('span', 'gdsub', `${r.name} · ${SLOTS[it.slot].name} · LV ${it.itemLevel}`));
  top.append(ic, nm);
  box.append(top);

  const lines = el('div', 'gdlines');
  for (const [k, v] of Object.entries(it.base)) lines.append(el('div', 'base', statText(k, v)));
  for (const b of it.bonuses) lines.append(el('div', 'bonus', statText(b.stat, b.value)));
  it.sockets.forEach((s) => lines.append(s
    ? el('div', 'gem', `◆ ${GEMS[s.gem].name} ${GEM_TIER_NAMES[s.tier - 1]}: ${statText(GEMS[s.gem].stat, GEMS[s.gem].values[s.tier - 1])}`)
    : el('div', 'gem empty', `◇ ${tr('Soket kosong')}`)));
  const fx = effectText(it);
  if (fx) lines.append(el('div', 'fx', `★ ${fx}`));
  box.append(lines);

  const worn = isEquipped(char, it);
  const diff = compare(char, it.id);
  if (Object.keys(diff).length && canEquip(char, it)) {
    const cmp = el('div', 'gdcmp');
    cmp.append(el('span', 'note', tr(worn ? 'Sumbangan saat ini:' : 'Bila dipakai:')));
    for (const [k, d] of Object.entries(diff)) {
      if (!BONUSES[k]) continue;
      cmp.append(el('span', `delta ${d > 0 ? 'up' : 'down'}`, signed(k, d)));
    }
    box.append(cmp);
  }

  if (!opts.editable) { box.append(el('div', 'note', tr('Ganti gear di kota.'))); return; }
  const act = el('div', 'row');
  if (!canEquip(char, it)) act.append(el('span', 'note', tr('Bukan senjata kelasmu.')));
  else if (worn) { const b = button(tr('Lepas'), 'btn small', () => opts.onUnequip(it.slot)); b.id = 'gear-unequip'; act.append(b); }
  else { const b = button(tr('Pasang'), 'btn small', () => opts.onEquip(it.id)); b.id = 'gear-equip'; act.append(b); }
  const del = button(tr('Buang'), 'btn ghost small danger', () => opts.onDiscard(it.id));
  del.id = 'gear-discard';
  act.append(del);
  box.append(act);
}
