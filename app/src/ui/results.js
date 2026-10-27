// Hasil Perjalanan (spec §13.4): shown after returning, dying or giving up.
import { el, button } from './screens.js';
import { gearCanvas } from '../art/gear.js';
import { RARITIES } from '../data/items.js';
import { itemName } from '../meta/itemgen.js';
import { dungeonById } from '../data/dungeons.js';
import { MATS, MAT_IDS } from '../data/forge.js';

// info: { char, trip, levelsGained, goldLost, itemsKept, itemsLost, itemsLeft, newRecord, saveError }
export function renderResults(box, info, { onContinue }) {
  const { char, trip, levelsGained, goldLost, itemsKept, itemsLost, itemsLeft, matsLost, gemsLost, newRecord, saveError } = info;
  box.replaceChildren();
  const titleText = trip.died ? 'Tumbang!' : trip.cleared ? 'Dungeon Tamat!' : 'Pulang dengan Selamat';
  const title = el('h2', trip.died ? 'h bad' : 'h', titleText);
  const where = el('div', 'sub', dungeonById(trip.dungeon).name);
  const tiles = el('div', 'tiles');
  const floor = trip.floor > 0 ? String(trip.floor) : '—';
  for (const [label, value] of [['Lantai', floor], ['Kill', String(trip.kills)], ['EXP', `+${trip.exp}`], ['Koin', `+${trip.gold - goldLost}`]]) {
    const t = el('div', 'tile');
    t.append(el('span', null, label), el('b', null, value));
    tiles.append(t);
  }
  const badges = el('div', 'badges');
  if (trip.cleared) badges.append(el('span', 'badge', 'Raja Maw tumbang!'));
  if (newRecord) badges.append(el('span', 'badge', `Rekor baru: Lantai ${trip.floor}`));
  if (levelsGained > 0) badges.append(el('span', 'badge mint', `Naik level! LV ${char.level}`));
  const notes = el('div', 'sub');
  if (trip.died) notes.textContent = `Kamu terbangun di kota dengan sisa tenaga.${goldLost > 0 ? ` ${goldLost} koin hilang.` : ''}`;
  const loot = el('div', 'loot');
  for (const [items, cls] of [[itemsKept, ''], [itemsLost, 'lost'], [itemsLeft, 'lost']]) {
    for (const it of items) loot.append(lootRow(it, cls));
  }
  if (itemsLost.length) notes.append(el('div', null, `${itemsLost.length} gear hilang saat tumbang.`));
  // forge materials & gems brought home (spec §20)
  const got = MAT_IDS.map((m) => [m, (trip.mats?.[m] || 0) - (matsLost?.[m] || 0)]).filter(([, n]) => n > 0);
  const gemsGot = (trip.gems?.length || 0) - (gemsLost?.length || 0);
  const matRow = el('div', 'matsbar');
  for (const [m, n] of got) {
    const c = el('span', 'hchip mat'); c.style.setProperty('--c', MATS[m].color);
    c.append(el('i'), `+${n} ${MATS[m].name}`); matRow.append(c);
  }
  if (gemsGot) matRow.append(el('span', 'hchip', `+${gemsGot} permata`));
  if (itemsLeft.length) notes.append(el('div', null, `Tas penuh: ${itemsLeft.length} gear ditinggal.`));
  const err = el('div', 'err', saveError ? `Gagal menyimpan: ${saveError}` : '');
  const next = button('Kembali ke Kota', 'btn', onContinue);
  next.id = 'tocamp';
  box.append(title, where, tiles, badges);
  if (matRow.childElementCount) box.append(matRow);
  if (loot.childElementCount) box.append(loot);
  box.append(notes, err, next);
}

function lootRow(it, cls) {
  const r = RARITIES[it.rarity];
  const row = el('div', `lootrow ${cls}`.trim());
  row.style.setProperty('--c', r.color);
  const ic = el('span', 'lic');
  ic.append(gearCanvas(it, 26));
  row.append(ic, el('b', null, itemName(it)), el('span', 'lr', `${r.name} · LV ${it.itemLevel}`));
  return row;
}
