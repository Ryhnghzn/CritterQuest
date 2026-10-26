// Hasil: run summary after death or surrender. Full version (gold, gear) in langkah 5.
import { el, button, fmtTime } from './screens.js';

// info: { char, result, levelsGained, isRecord, died, saveError }
export function renderResults(box, info, { onContinue }) {
  const { char, result, levelsGained, isRecord, died, saveError } = info;
  box.replaceChildren();
  const title = el('h2', died ? 'h bad' : 'h', died ? 'Tumbang!' : 'Ronde Selesai');
  const tiles = el('div', 'tiles');
  for (const [label, value] of [['Bertahan', fmtTime(result.time)], ['Kill', String(result.kills)], ['EXP', `+${result.exp}`]]) {
    const t = el('div', 'tile');
    t.append(el('span', null, label), el('b', null, value));
    tiles.append(t);
  }
  const badges = el('div', 'badges');
  if (levelsGained > 0) badges.append(el('span', 'badge mint', `Naik level! LV ${char.level}`));
  if (isRecord) badges.append(el('span', 'badge', 'Rekor baru!'));
  const err = el('div', 'err', saveError ? `Gagal menyimpan: ${saveError}` : '');
  const next = button('Kembali ke Kemah', 'btn', onContinue);
  next.id = 'tocamp';
  box.append(title, tiles, badges, err, next);
}
