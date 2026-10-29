// Papan Tugas & Toko Lencana at Kapten Vera (spec §24).
import { el, button } from './screens.js';
import { iconCanvas, enemyCanvas } from '../art/sprites.js';
import { ENEMIES } from '../data/enemies.js';
import { DUNGEONS } from '../data/dungeons.js';
import { MATS } from '../data/forge.js';
import { MARK_SHOP } from '../data/bounties.js';
import { bountyReward, isDone, rerollPrice } from '../meta/bounties.js';
import { expeditionList, expeditionReward } from '../meta/world.js';
import { regionById } from '../data/world.js';
import { tr, t } from '../i18n.js';

const dungeonOf = (id) => DUNGEONS.find((d) => d.id === id);
// the boss waiting on the last floor of a dungeon
const bossOf = (d) => Object.keys(d.floors.at(-1).waves.find((w) => Object.keys(w.mix).some((k) => ENEMIES[k].boss)).mix).find((k) => ENEMIES[k].boss);

export function bountyText(b) {
  switch (b.kind) {
    case 'kill': return t('Buru {n} {name}', { n: b.need, name: ENEMIES[b.target].name });
    case 'elite': return t('Kalahkan {n} musuh elite', { n: b.need });
    case 'boss': return t('Kalahkan {name} di {dungeon}', { name: ENEMIES[bossOf(dungeonOf(b.target))].name, dungeon: dungeonOf(b.target).short });
    case 'floors': return t('Bersihkan {n} lantai di {dungeon}', { n: b.need, dungeon: dungeonOf(b.target).short });
    case 'gold': return t('Kumpulkan {n} koin di dungeon', { n: b.need });
    default: return b.kind;
  }
}

function bountyIcon(b) {
  if (b.kind === 'kill') return enemyCanvas(b.target, ENEMIES[b.target].r, 34);
  if (b.kind === 'boss') { const id = bossOf(dungeonOf(b.target)); return enemyCanvas(id, ENEMIES[id].r, 34); }
  return iconCanvas({ elite: 'pow', floors: 'arm', gold: 'mag' }[b.kind], 30);
}

export function bountyList(char, { onBountyClaim, onBountyReroll, onBountyTake, onBountyDrop }) {
  const list = el('div', 'shoplist bounties');
  char.bounties.forEach((b, i) => {
    const done = isDone(b);
    const row = el('div', `shoprow bounty${b.taken ? ' active' : ''}${done ? ' done' : ''}`);
    row.dataset.bounty = i;
    const ic = el('span', 'sic'); ic.append(bountyIcon(b));
    const txt = el('div', 'stx');
    const rw = bountyReward(char, b);
    txt.append(el('b', null, bountyText(b)));
    if (b.taken) { const bar = el('div', 'bbar'); const fill = el('i'); fill.style.width = `${(b.have / b.need) * 100}%`; bar.append(fill); txt.append(bar); }
    txt.append(el('span', null, `${b.taken ? `${b.have} / ${b.need}` : tr('Belum diambil')} · ${t('+{g} koin · +{e} EXP · +{d} {dust} · +{m} Lencana', { g: rw.gold, e: rw.exp, d: rw.dust, dust: MATS.dust.name, m: rw.marks })}`));
    const acts = el('div', 'bacts');
    if (done) acts.append(button(tr('Klaim'), 'btn small claim', () => onBountyClaim(i)));
    else if (b.taken) acts.append(button(tr('Batal'), 'btn ghost small drop', () => onBountyDrop(i)));
    else {
      const re = button(tr('Ganti'), 'btn ghost small reroll', () => onBountyReroll(i));
      re.append(el('small', null, t('{n} koin', { n: rerollPrice(char) }))); re.disabled = char.gold < rerollPrice(char);
      acts.append(button(tr('Ambil'), 'btn small take', () => onBountyTake(i)), re);
    }
    row.append(ic, txt, acts);
    list.append(row);
  });
  list.append(el('div', 'note', tr('Ambil tugas dulu. Progres dihitung dari setiap perjalanan setelah tugas diambil, termasuk yang berakhir mati.')));
  return list;
}

export function markShop(char, onMarkBuy) {
  const list = el('div', 'shoplist');
  for (const o of MARK_SHOP) {
    const row = el('div', 'shoprow');
    const txt = el('div', 'stx');
    txt.append(el('b', null, o.name), el('span', null, o.desc));
    const b = button(String(o.price), 'btn small buy', () => onMarkBuy(o.id));
    b.prepend(el('span', 'markic'));
    b.dataset.mark = o.id;
    b.disabled = char.marks < o.price;
    row.append(txt, b);
    list.append(row);
  }
  return list;
}

// Expeditions (spec §25.5): one at a time; its gate gets a marker on the map and an arrow.
export function expeditionPanel(char, { onExpTake, onExpClaim, onExpDrop }) {
  const list = el('div', 'shoplist expeditions');
  const rw = expeditionReward(char);
  for (const e of expeditionList(char)) {
    const d = dungeonOf(e.dungeon);
    const x = e.active ? char.expedition : null;
    const done = x && x.have >= x.need;
    const row = el('div', `shoprow bounty${e.active ? ' active' : ''}${done ? ' done' : ''}${e.fits ? '' : ' unfit'}`);
    row.dataset.expedition = e.dungeon;
    const ic = el('span', 'sic'); const boss = bossOf(d); ic.append(enemyCanvas(boss, ENEMIES[boss].r, 34));
    const txt = el('div', 'stx');
    txt.append(el('b', null, `${d.name} · LV ${e.levels[0]}–${e.levels[1]}`));
    if (x) { const bar = el('div', 'bbar'); const fill = el('i'); fill.style.width = `${(x.have / x.need) * 100}%`; bar.append(fill); txt.append(bar); }
    txt.append(el('span', null, `${t('Bersihkan {n} lantai', { n: e.floors })} · ${t('gerbang di {r}', { r: regionById(e.region).name })}${e.found ? ` · ${tr('sudah ditemukan')}` : ''}${x ? ` · ${x.have}/${x.need}` : ''}`),
      el('span', null, t('+{g} koin · +{e} EXP · +{m} Lencana', { g: rw.gold, e: rw.exp, m: rw.marks })));
    let act;
    if (done) act = button(tr('Klaim'), 'btn small claim', () => onExpClaim());
    else if (e.active) act = button(tr('Batal'), 'btn ghost small', onExpDrop);
    else act = button(tr('Ambil'), 'btn small', () => onExpTake(e.dungeon));
    row.append(ic, txt, act);
    list.append(row);
  }
  list.append(el('div', 'note', tr('Satu ekspedisi sekaligus. Gerbangnya ditandai di peta dan panah emas menunjuk ke sana.')));
  return list;
}
