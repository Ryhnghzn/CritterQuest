// Papan Tugas & Toko Lencana at Kapten Vera (spec §24).
import { el, button } from './screens.js';
import { iconCanvas, enemyCanvas } from '../art/sprites.js';
import { ENEMIES } from '../data/enemies.js';
import { DUNGEONS } from '../data/dungeons.js';
import { MATS } from '../data/forge.js';
import { MARK_SHOP } from '../data/bounties.js';
import { bountyReward, isDone, rerollPrice } from '../meta/bounties.js';
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

export function bountyList(char, { onBountyClaim, onBountyReroll }) {
  const list = el('div', 'shoplist bounties');
  char.bounties.forEach((b, i) => {
    const done = isDone(b);
    const row = el('div', `shoprow bounty${done ? ' done' : ''}`);
    row.dataset.bounty = i;
    const ic = el('span', 'sic'); ic.append(bountyIcon(b));
    const txt = el('div', 'stx');
    const rw = bountyReward(char, b);
    const bar = el('div', 'bbar'); const fill = el('i'); fill.style.width = `${(b.have / b.need) * 100}%`; bar.append(fill);
    txt.append(el('b', null, bountyText(b)), bar,
      el('span', null, `${b.have} / ${b.need} · ${t('+{g} koin · +{e} EXP · +{d} {dust} · +{m} Lencana', { g: rw.gold, e: rw.exp, d: rw.dust, dust: MATS.dust.name, m: rw.marks })}`));
    const act = done
      ? button(tr('Klaim'), 'btn small claim', () => onBountyClaim(i))
      : button(tr('Ganti'), 'btn ghost small reroll', () => onBountyReroll(i));
    if (!done) { act.append(el('small', null, t('{n} koin', { n: rerollPrice(char) }))); act.disabled = char.gold < rerollPrice(char); }
    row.append(ic, txt, act);
    list.append(row);
  });
  list.append(el('div', 'note', tr('Progres dihitung dari setiap perjalanan ke dungeon, termasuk yang berakhir mati.')));
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
