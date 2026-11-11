// Tumbang (death dialog): what felled the player, what it cost, one way on — wake in town.
import { el, button } from './screens.js';
import { ENEMIES } from '../data/enemies.js';
import { tr, t } from '../i18n.js';

// cause: { foe, dot, surrender } from Game.deathCause()
export function causeText(cause) {
  if (!cause) return '';
  if (cause.surrender) return tr('Kamu menyerah dan mundur dari pertempuran.');
  const foe = cause.foe && ENEMIES[cause.foe]?.name;
  if (cause.dot === 'poison') return foe ? t('Racun {foe} menghabisi sisa tenagamu.', { foe }) : tr('Racun menghabisi sisa tenagamu.');
  if (cause.dot === 'burn') return foe ? t('Luka bakar dari {foe} menghabisi sisa tenagamu.', { foe }) : tr('Luka bakar menghabisi sisa tenagamu.');
  if (foe) return t('Kamu dikalahkan oleh {foe}.', { foe });
  return tr('Tenagamu habis di tengah pertempuran.');
}

// Falling in an open region (spec §25.5). info: { region, town, cause, goldLost, wakeHpPct, saveError }
export function renderDeath(box, info, onRespawn) {
  box.replaceChildren();
  const title = el('h2', 'h bad', tr('Tumbang!'));
  const where = el('div', 'sub', info.region);
  const cause = el('div', 'deathcause', causeText(info.cause));
  const tiles = el('div', 'tiles two');
  for (const [label, value] of [['Koin hilang', `−${info.goldLost}`], ['Bangun dengan HP', `${info.wakeHpPct}%`]]) {
    const tile = el('div', 'tile');
    tile.append(el('span', null, tr(label)), el('b', null, value));
    tiles.append(tile);
  }
  const notes = el('div', 'sub', t('Kamu akan terbangun di {town}. EXP dan barang yang sudah didapat tetap tersimpan.', { town: info.town }));
  const err = el('div', 'err', info.saveError ? t('Gagal menyimpan: {e}', { e: info.saveError }) : '');
  const next = button(t('Bangkit di {town}', { town: info.town }), 'btn', onRespawn);
  next.id = 'tocamp';
  box.append(title, where, cause, tiles, notes, err, next);
}
