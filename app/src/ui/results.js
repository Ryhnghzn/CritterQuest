// Hasil Perjalanan (spec §13.4): shown after returning, dying or giving up.
import { el, button } from './screens.js';

// info: { char, trip, levelsGained, goldLost, newRecord, saveError }
export function renderResults(box, info, { onContinue }) {
  const { char, trip, levelsGained, goldLost, newRecord, saveError } = info;
  box.replaceChildren();
  const titleText = trip.died ? 'Tumbang!' : trip.cleared ? 'Dungeon Tamat!' : 'Pulang dengan Selamat';
  const title = el('h2', trip.died ? 'h bad' : 'h', titleText);
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
  const err = el('div', 'err', saveError ? `Gagal menyimpan: ${saveError}` : '');
  const next = button('Kembali ke Kota', 'btn', onContinue);
  next.id = 'tocamp';
  box.append(title, tiles, badges, notes, err, next);
}
