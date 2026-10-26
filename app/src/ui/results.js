// Hasil: run summary after death or surrender. Full version (gold, gear) in langkah 5.
import { el, button, fmtTime } from './screens.js';

// info: { char, result, levelsGained, isRecord, died, saveError }
export function renderResults(box, info, { onContinue }) {
  const { char, result, levelsGained, isRecord, died, saveError } = info;
  box.replaceChildren();
  const title = el('h1', 'logo small', died ? 'TUMBANG!' : 'RONDE SELESAI');
  if (died) title.style.color = 'var(--acc2)';
  const stats = el('div', 'stats');
  const line = (label, value) => {
    const d = el('div', null, `${label} `);
    d.append(el('b', null, value));
    return d;
  };
  stats.append(
    line('Bertahan', fmtTime(result.time)),
    line('Kill', String(result.kills)),
    line('EXP', `+${result.exp}`),
  );
  if (levelsGained > 0) stats.append(line('NAIK LEVEL!', `LV ${char.level}`));
  if (isRecord) stats.append(el('div', null, 'REKOR BARU!'));
  const err = el('div', 'err', saveError ? `Gagal menyimpan: ${saveError}` : '');
  const next = button('KEMBALI KE KEMAH', 'btn', onContinue);
  next.id = 'tocamp';
  box.append(title, stats, err, next);
}
