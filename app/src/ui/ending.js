// Epilog (spec §26.7): shown once, after Sang Gerhana falls for the first time — the end
// of the story in a few lines and a summary of the journey. The game goes on afterwards.
import { el, button } from './screens.js';
import { CLASSES } from '../data/classes.js';
import { DAY } from '../data/time.js';
import { tr, t } from '../i18n.js';

const LINES = [
  'Sang Gerhana runtuh. Cahaya kelima Pecahan Segel menyatu, dan langit di atas Tanah Gerhana retak terbuka — bukan oleh kegelapan, melainkan oleh fajar.',
  'Di Kota Awal, api unggun Kakek Odo menyala lebih terang dari biasanya. Di Rimbawana, Bekubara, Pasirluas, dan Baraapi, orang-orang menengadah dan tak tahu mengapa mereka tersenyum.',
  'Kisah ini selesai. Petualanganmu belum.',
];

export function renderEnding(box, char, onDone) {
  box.replaceChildren();
  const r = char.records;
  box.append(el('h2', 'h ending', tr('Fajar Kembali')));
  const story = el('div', 'panel endstory');
  for (const line of LINES) story.append(el('p', null, tr(line)));
  box.append(story);
  const tiles = el('div', 'tiles');
  const days = Math.max(1, Math.floor(char.clock / DAY) + 1);
  for (const [label, value] of [
    [tr('Pahlawan'), `${char.name} · ${CLASSES[char.classId].name}`],
    [tr('Level'), String(char.level)],
    [tr('Hari'), String(days)],
    [tr('Perjalanan'), String(r.trips)],
    [tr('Kill'), String(r.kills)],
    [tr('Bos'), String(r.bossKills)],
  ]) {
    const tile = el('div', `tile${value.length > 8 ? ' wide' : ''}`);
    tile.append(el('span', null, label), el('b', null, value));
    tiles.append(tile);
  }
  box.append(tiles, el('div', 'note', tr('Laporkan kemenanganmu pada Kakek Odo untuk hadiah terakhir. Menara Gerhana bisa didaki lagi kapan saja.')));
  const b = button(t('Lanjutkan'), 'btn', onDone);
  b.id = 'ending-ok';
  box.append(b);
}
