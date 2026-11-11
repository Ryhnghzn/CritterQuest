// Koleksi tab of the character panel (spec §24): bestiary milestones and the
// codex of unique items found.
import { el } from './screens.js';
import { enemyCanvas } from '../art/sprites.js';
import { BOSS_ART, bossPortrait } from '../art/bosses/index.js';
import { LOOK } from '../data/look.js';
import { gearCanvas } from '../art/gear.js';
import { ENEMIES } from '../data/enemies.js';
import { BESTIARY, BESTIARY_IDS, CODEX_FX } from '../data/collection.js';
import { UNIQUES, RARITIES } from '../data/items.js';
import { bestiaryTier, stepsOf, collectionStats } from '../meta/collection.js';
import { MOUNT_IDS } from '../data/mounts.js';
import { statText } from '../meta/itemgen.js';
import { tr, t } from '../i18n.js';

export function renderCollectionTab(char) {
  const body = el('div', 'cpbody coll');
  const best = el('div', 'panel');
  best.append(el('h3', null, tr('Bestiari')), el('div', 'note', tr('Tiap tonggak kill memberi bonus stat permanen.')));
  const total = Object.entries(collectionStats(char)).map(([k, v]) => statText(k, Math.round(v * 1000) / 1000)).join(' · ');
  if (total) best.append(el('div', 'colltotal', total));
  const list = el('div', 'bestlist');
  for (const id of BESTIARY_IDS) {
    const kills = char.records.bestiary[id];
    const tier = bestiaryTier(id, kills);
    const steps = stepsOf(id);
    const row = el('div', `beast${kills ? '' : ' unseen'}${ENEMIES[id].boss ? ' boss' : ''}`);
    row.dataset.enemy = id;
    row.append(LOOK.anime && BOSS_ART[id] ? bossPortrait(id, 34, LOOK.pixel) : enemyCanvas(id, ENEMIES[id].r, 34)); // anime bosses (spec §41.2)
    const info = el('div', 'binfo');
    info.append(el('b', null, kills ? ENEMIES[id].name : '???'));
    const pips = el('span', 'pips');
    for (let i = 0; i < steps.length; i++) pips.append(el('i', i < tier ? 'on' : null));
    const next = steps[tier];
    info.append(el('span', 'bsub', next ? t('{n} kill · berikutnya {next}', { n: kills, next }) : t('{n} kill · tuntas', { n: kills })));
    row.append(info, pips, el('span', 'bbonus', `${statText(BESTIARY[id].stat, BESTIARY[id].v)} ${tr('per tonggak')}`));
    list.append(row);
  }
  best.append(list);

  const codex = el('div', 'panel');
  const found = char.records.uniques;
  const pool = UNIQUES.filter((u) => u.classId === null || u.classId === char.classId); // what this class can find
  codex.append(el('h3', null, t('Kodeks Unik ({a}/{b})', { a: pool.filter((u) => found.includes(u.id)).length, b: pool.length })),
    el('div', 'note', t('Tiap item unik yang pernah ditemukan: Koin & EXP +{n}% di dungeon.', { n: Math.round(CODEX_FX.goldfind * 100) })));
  const grid = el('div', 'codex');
  for (const u of pool) {
    const has = found.includes(u.id);
    const cell = el('div', `cdx${has ? '' : ' unseen'}`);
    cell.style.setProperty('--c', RARITIES[u.rarity].color);
    cell.dataset.unique = u.id;
    const item = { slot: u.slot, classId: u.slot === 'weapon' ? char.classId : null, variant: 4, rarity: u.rarity, unique: u.id, plus: 0 };
    cell.append(gearCanvas(item, 30), el('span', null, has ? u.name : '???'));
    cell.title = has ? u.name : tr('Belum ditemukan');
    grid.append(cell);
  }
  codex.append(grid);
  const mounts = el('div', 'panel');
  mounts.append(el('h3', null, t('Mount {n}/{m}', { n: Object.keys(char.mounts.owned).length, m: MOUNT_IDS.length })),
    el('div', 'note', tr('Dapatkan dari cerita, Kandang, Toko Lencana, dan bos. Atur di tab Mount.')));
  mounts.dataset.row = 'mounts';
  body.append(best, mounts, codex);
  return body;
}
