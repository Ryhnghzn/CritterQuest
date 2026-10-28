// Quest journal (spec §26.3): a tab of the character panel (and key J). The main
// quest's chapter with the steps done so far, then the side quests being worked on.
import { el } from './screens.js';
import { dungeonById } from '../data/dungeons.js';
import { ENEMIES } from '../data/enemies.js';
import { TOWNS, regionOfDungeon, regionById } from '../data/world.js';
import { RARITIES } from '../data/items.js';
import { MAIN, SHARDS, SIDE_MAX } from '../data/quests.js';
import { activeQuests, shards, mainDone } from '../meta/quests.js';
import { tr, t } from '../i18n.js';

const town = (id) => TOWNS[id]?.name ?? id;

// One line for a step: "Temukan gerbang Gua Kristal di Padang Es"
export function stepText(s) {
  switch (s.kind) {
    case 'talk': return t('Bicara dengan {who} di {town}', { who: s.who, town: town(s.town) });
    case 'town': return t('Pergi ke {town}', { town: town(s.town) });
    case 'gate': return t('Temukan gerbang {d} di {r}', { d: dungeonById(s.dungeon).name, r: regionOfDungeon(s.dungeon)?.name ?? '' });
    case 'boss': return t('Kalahkan bos {d} (lantai 5)', { d: dungeonById(s.dungeon).name });
    case 'kill': return s.region ? t('Kalahkan {n} {enemy} di {r}', { n: s.n, enemy: ENEMIES[s.enemy].name, r: regionById(s.region).name }) : t('Kalahkan {n} {enemy}', { n: s.n, enemy: ENEMIES[s.enemy].name });
    case 'elite': return s.region ? t('Kalahkan {n} elite di {r}', { n: s.n, r: regionById(s.region).name }) : t('Kalahkan {n} elite', { n: s.n });
    default: return '';
  }
}

// "Hadiah: Pecahan Segel · gear Epik · permata tk 2 · koin & EXP"
export function rewardText(reward) {
  const out = [];
  if (reward.shard) out.push(tr('Pecahan Segel'));
  if (reward.gear) out.push(t('gear {r}', { r: RARITIES[reward.gear.rarity].name }));
  for (const g of reward.gems || []) out.push(t('permata tk {n}', { n: g.tier }));
  if (reward.gold || reward.exp) out.push(tr('koin & EXP'));
  return out.join(' · ');
}

function questCard(a, main) {
  const card = el('div', `quest${main ? ' main' : ''}`);
  card.dataset.quest = a.id;
  const head = el('div', 'qhead');
  head.append(el('span', 'pill', main ? t('Bab {n}', { n: a.def.ch + 1 }) : tr('Side quest')), el('b', null, a.def.title));
  card.append(head);
  const steps = el('ol', 'qsteps');
  a.def.steps.forEach((s, i) => {
    if (i > a.state.step) return; // what comes next stays a surprise
    const li = el('li', i < a.state.step ? 'done' : 'now', stepText(s));
    if (i === a.state.step && (s.kind === 'kill' || s.kind === 'elite')) li.append(el('span', 'qprog', ` ${a.state.prog}/${s.n}`));
    steps.append(li);
  });
  card.append(steps, el('div', 'qreward', `${tr('Hadiah')}: ${rewardText(a.def.reward)}`));
  return card;
}

export function renderQuestTab(char) {
  const body = el('div', 'cpbody journal');
  const main = el('div', 'panel');
  const head = el('div', 'attrhead');
  head.append(el('h3', null, tr('Quest Utama')), el('span', 'pts shards', t('Pecahan Segel {n}/{max}', { n: shards(char), max: SHARDS })));
  main.append(head);
  const list = activeQuests(char);
  const m = list.find((a) => a.def.main);
  if (m) main.append(questCard(m, true));
  else if (mainDone(char)) main.append(el('div', 'note', tr('Kelima Pecahan Segel sudah terkumpul. Kisahnya berlanjut… (segera)')));
  const done = MAIN.filter((q) => char.quests.done.includes(q.id));
  if (done.length) {
    const past = el('div', 'qdone');
    for (const q of done) past.append(el('span', 'hchip', `✓ ${q.title}`));
    main.append(past);
  }
  const side = el('div', 'panel');
  const sides = list.filter((a) => !a.def.main);
  const sh = el('div', 'attrhead');
  sh.append(el('h3', null, tr('Side Quest')), el('span', 'pts', `${sides.length} / ${SIDE_MAX}`));
  side.append(sh);
  if (sides.length) for (const a of sides) side.append(questCard(a, false));
  else side.append(el('div', 'note', tr('Belum ada side quest. Carilah orang bertanda ! di kota dan di jalan.')));
  body.append(main, side);
  return body;
}
