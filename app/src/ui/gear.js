// Gear tab of the Karakter panel (spec §6.5, §14.2): the six equipped slots, the
// bag sorted by rarity, and a detail card with stats, special effect, the
// change if worn, and Pasang / Lepas / Buang (only in town).
import { el, button } from './screens.js';
import { iconCanvas, gearIcon } from '../art/sprites.js';
import { RARITIES, SLOTS, BONUSES } from '../data/items.js';
import { INVENTORY_MAX } from '../data/balance.js';
import { EQUIP_SLOTS } from '../meta/schema.js';
import { itemName, statText, effectText } from '../meta/itemgen.js';
import { equippedItem, isEquipped, canEquip, compare } from '../meta/gear.js';

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
    const t = tile(it, it ? () => pick(it.id) : null, slot);
    t.classList.add('slot');
    if (it && it.id === selected) t.classList.add('sel');
    worn.append(t);
  }

  const bag = el('div', 'gearbag');
  for (const it of sorted(char.inventory)) {
    const t = tile(it, () => pick(it.id));
    if (it.id === selected) t.classList.add('sel');
    if (isEquipped(char, it)) t.append(el('span', 'eq', 'E'));
    bag.append(t);
  }
  if (!char.inventory.length) bag.append(el('div', 'note', 'Tas kosong. Gear didapat di dungeon.'));

  const head = el('div', 'attrhead');
  head.append(el('b', null, 'Terpasang'), el('span', 'pts', `Tas ${char.inventory.length}/${INVENTORY_MAX}`));
  const left = el('div', 'panel gearside');
  left.append(head, worn, el('b', 'bagtitle', 'Tas'), bag);
  const right = el('div', 'panel gdetail');
  const it = selected && char.inventory.find((x) => x.id === selected);
  if (it) detail(right, char, it, opts);
  else right.append(el('div', 'note', 'Pilih gear untuk melihat detailnya.'));
  wrap.append(left, right);
  return wrap;
}

function tile(it, onClick, slot = null) {
  const t = button('', 'gtile', onClick || (() => {}));
  if (it) {
    t.style.setProperty('--c', RARITIES[it.rarity].color);
    t.append(iconCanvas(gearIcon(it), 28), el('span', 'ilv', String(it.itemLevel)));
    t.title = itemName(it);
    t.dataset.item = it.id;
  } else {
    t.classList.add('empty');
    t.append(iconCanvas(SLOT_ICON[slot], 24));
    t.title = `${SLOTS[slot].name} kosong`;
    t.disabled = true;
  }
  return t;
}

const signed = (stat, d) => {
  const b = BONUSES[stat];
  const v = b.pct ? Math.round(Math.abs(d) * 1000) / 10 : Math.round(Math.abs(d) * 10) / 10;
  return `${d > 0 ? '+' : '−'}${String(v).replace('.', ',')}${b.pct || b.unit === '%' ? '%' : ''} ${b.label}`;
};

function detail(box, char, it, opts) {
  const r = RARITIES[it.rarity];
  box.style.setProperty('--c', r.color);
  const top = el('div', 'gdhead');
  const ic = el('span', 'gdic');
  ic.append(iconCanvas(gearIcon(it), 40));
  const nm = el('div');
  nm.append(el('b', 'gdname', itemName(it)), el('span', 'gdsub', `${r.name} · ${SLOTS[it.slot].name} · LV ${it.itemLevel}`));
  top.append(ic, nm);
  box.append(top);

  const lines = el('div', 'gdlines');
  for (const [k, v] of Object.entries(it.base)) lines.append(el('div', 'base', statText(k, v)));
  for (const b of it.bonuses) lines.append(el('div', 'bonus', statText(b.stat, b.value)));
  const fx = effectText(it);
  if (fx) lines.append(el('div', 'fx', `★ ${fx}`));
  box.append(lines);

  const worn = isEquipped(char, it);
  const diff = compare(char, it.id);
  if (Object.keys(diff).length && canEquip(char, it)) {
    const cmp = el('div', 'gdcmp');
    cmp.append(el('span', 'note', worn ? 'Sumbangan saat ini:' : 'Bila dipakai:'));
    for (const [k, d] of Object.entries(diff)) {
      if (!BONUSES[k]) continue;
      cmp.append(el('span', `delta ${d > 0 ? 'up' : 'down'}`, signed(k, d)));
    }
    box.append(cmp);
  }

  if (!opts.editable) { box.append(el('div', 'note', 'Ganti gear di kota.')); return; }
  const act = el('div', 'row');
  if (!canEquip(char, it)) act.append(el('span', 'note', 'Bukan senjata kelasmu.'));
  else if (worn) { const b = button('Lepas', 'btn small', () => opts.onUnequip(it.slot)); b.id = 'gear-unequip'; act.append(b); }
  else { const b = button('Pasang', 'btn small', () => opts.onEquip(it.id)); b.id = 'gear-equip'; act.append(b); }
  const del = button('Buang', 'btn ghost small danger', () => opts.onDiscard(it.id));
  del.id = 'gear-discard';
  act.append(del);
  box.append(act);
}
