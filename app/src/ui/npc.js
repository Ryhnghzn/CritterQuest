// NPC dialogs in town (spec §13.2, §15): Inn, potion shop (5 potions + belt),
// Pandai Besi (chests, selling gear), the dungeon gate (pick a floor) and
// townsfolk who just talk.
import { el, button, stage, keepView } from './screens.js';
import { portrait, HAIR_NAMES, HAIR_PALETTE, HAIR_COLOR_NAMES } from '../art/doll.js';
import { iconCanvas } from '../art/sprites.js';
import { gearCanvas } from '../art/gear.js';
import { POTIONS, POTION_IDS, POTION_MAX } from '../data/potions.js';
import { innPrice, chestPrice, junkIds, respecPrice } from '../meta/shop.js';
import { UPGRADES, upgradePrice, BARBER_PRICE } from '../data/shop.js';
import { spentPoints } from '../meta/character.js';
import { jobOf, spRespecPrice, spTotal, spFree, jobChangePrice, branchOf, branchesOf, branchChangePrice } from '../meta/jobs.js';
import { BRANCH } from '../data/branches.js';
import { CLASSES, JOB_IDS } from '../data/classes.js';
import { JOB_PICK_LEVEL } from '../data/balance.js';
import { dungeonById } from '../data/dungeons.js';
import { REGIONS, TOWNS, TOWN_IDS, regionOfDungeon, regionOpen } from '../data/world.js';
import { teleportPrice } from '../meta/world.js';
import { CHESTS, DROP_WEIGHTS, RARITIES, SELL_PRICE } from '../data/items.js';
import { itemName } from '../meta/itemgen.js';
import { isEquipped } from '../meta/gear.js';
import { forgePanel, salvagePanel, socketPanel, combinePanel } from './forge.js';
import { bountyList, markShop, expeditionPanel } from './board.js';
import { challengePanel } from './challenge.js';
import { displayPanel, nightPanel, matsPanel, storagePanel } from './market.js';
import { questDef, shards } from '../meta/quests.js';
import { rewardChips, giveLines } from './journal.js';
import { SIDE_MAX } from '../data/quests.js';
import { renderStableList, renderStableShop } from './stable.js';
import { npcBust } from '../art/bust.js';
import { LOOK } from '../data/look.js';
import { tr, t, num } from '../i18n.js';

let toSell = new Set(); // Pandai Besi: items marked for selling
let newLook = null;     // Tukang Cukur: style being tried on
let smithTab = 'peti';  // Pandai Brom: peti | jual | tempa | urai
let gemTab = 'pasang';  // Tukang Permata: pasang | gabung
let boardTab = 'tugas'; // Kapten Vera: tugas | ekspedisi | lencana
let stableTab = 'beli'; // Mbah Sarju: beli | kandang

const LINES = {
  inn: 'Selamat malam, petualang. Kasur hangat dan sup panas menunggumu.',
  potion: 'Hehehe… ramuan segar dari kuali. Mau yang mana?',
  gear: 'Tungku sudah panas! Beli peti, jual rongsokan, tempa gear-mu, atau urai jadi bahan.',
  jeweler: 'Permata yang tepat di soket yang tepat… itu seni, Sayang.',
  gate: 'Gerbang dungeon tidak ada di kota. Carilah sendiri di luar sana, atau ambil ekspedisi di Balai Petualang.',
  trainer: 'Otot tidak tumbuh dari duduk-duduk. Latihan denganku membuatmu lebih kuat, selamanya.',
  board: 'Papan tugas sudah dibuka! Selesaikan tugas di dungeon, lalu ambil hadiahmu di sini.',
  barber: 'Rambutmu kusut habis dari dungeon, ya? Duduk sini, biar kurapikan!',
  teleport: 'Batu rune ini berdengung pelan. Sentuh, dan sebut kota yang pernah kau datangi.',
  weapons: 'Bilah-bilah terbaik kota ini. Pilih, pegang, rasakan beratnya.',
  armor: 'Zirah yang pas di badan menyelamatkan nyawa. Lihat-lihat dulu.',
  jewelry: 'Kalung dan cincin, masing-masing dengan kisahnya sendiri.',
  night: 'Psst… barang yang tak dijual di etalase. Hanya malam ini.',
  storage: 'Titip apa saja di sini. Barangmu aman, dan bisa kau ambil di kota besar mana pun.',
  stable: 'Kuda yang dirawat dengan sayang tak akan meninggalkanmu di tengah jalan.',
  mats: 'Debu, kristal, inti, permata: semua yang dibutuhkan pandai besi. Jumlahnya terbatas.',
};
const TITLES = { inn: 'Penginapan', potion: 'Toko Ramuan', gear: 'Pandai Besi', jeweler: 'Tukang Permata', gate: 'Penjaga Gerbang', trainer: 'Pelatih', barber: 'Tukang Cukur', board: 'Papan Tugas', talk: 'Warga',
  teleport: 'Perjalanan Cepat', weapons: 'Pandai Senjata', armor: 'Penjahit Zirah', jewelry: 'Toko Perhiasan', storage: 'Gudang', mats: 'Pedagang Bahan', stable: 'Penjaga Kandang', night: 'Pedagang Malam' };

// ctx: { char, hp, maxHp, message: { text, ok } | null, line (talk: what they say now),
//        onInn, onBuyPotion(id), onBelt(slot), onBuyChest(kind), onSell(ids), onUpgrade(id), onRespec(),
//        onHaircut(look), onEnter(dungeonId, floor), onClose }
// The dialog sits docked at the bottom: who speaks on the left (portrait, line, quest,
// messages), the shop on the right (scrolls on its own). Redraws keep the scroll.
export function renderNpc(box, npc, ctx) {
  const tab = { gear: smithTab, jeweler: gemTab, board: boardTab, stable: stableTab }[npc.role] || '';
  box.classList.add('dock');
  keepView(box, `npc:${npc.id}:${tab}`, () => buildNpc(box, npc, ctx));
}

function buildNpc(box, npc, ctx) {
  if (npc.role !== 'barber') newLook = null;
  const { char, hp, maxHp } = ctx;
  box.replaceChildren();
  const panel = el('div', 'panel npcpanel');
  const side = el('div', 'npcside'), body = el('div', 'npcbody');

  const head = el('div', 'npchead');
  const info = el('div', 'info');
  const role = el('span', 'pill', npc.title || tr(TITLES[npc.role]));
  role.style.setProperty('--c', npc.outfit[0]);
  info.append(el('div', 'nm', npc.name), role);
  if (!npc.object && LOOK.anime) { // a big chest-up portrait over the line, as if talking face to face
    head.classList.add('bust');
    head.style.setProperty('--c', npc.outfit[0]);
    head.append(npcBust({ ...npc.look, outfit: npc.outfit }, 220), info);
  } else head.append(stage(npc.object ? iconCanvas('zap', 92) : portrait(null, { ...npc.look, outfit: npc.outfit }, 92), npc.outfit[0]), info);
  // a quest step said here (spec §26.3) speaks first; the shop stays below it
  const offer = ctx.quests?.[0];
  side.append(head, el('div', 'npcline', `“${offer ? offer.say : npc.role === 'talk' ? ctx.line : tr(LINES[npc.role])}”`));
  if (offer) side.append(questBox(offer, ctx.onQuest, char));

  if (npc.role !== 'talk') {
    const wallet = el('div', 'records');
    const chips = [t('{n} koin', { n: char.gold }), `HP ${Math.ceil(hp)} / ${Math.round(maxHp)}`];
    if (npc.role === 'board') chips.push(t('{n} Lencana', { n: char.marks }));
    for (const text of chips) wallet.append(el('span', 'hchip', text));
    side.append(wallet);
  }

  const actions = el('div', 'row');
  if (npc.role === 'inn') {
    const b = button(t('Tidur ({n} koin)', { n: innPrice(char) }), 'btn', ctx.onInn);
    b.id = 'npc-inn';
    actions.append(b);
  } else if (npc.role === 'potion') {
    body.append(potionList(char, ctx.onBuyPotion), beltEditor(char, ctx.onBelt));
  } else if (npc.role === 'trainer') {
    body.append(jobPanel(char, ctx), trainerList(char, ctx.onUpgrade, ctx.onRespec, ctx.onTalentRespec));
  } else if (npc.role === 'barber') {
    body.append(barberPanel(char, ctx.onHaircut, () => renderNpc(box, npc, { ...ctx, message: null })));
  } else if (npc.role === 'gear') {
    const redraw = () => renderNpc(box, npc, { ...ctx, message: null });
    body.append(tabBar([['peti', 'Peti'], ['jual', 'Jual'], ['tempa', 'Tempa'], ['urai', 'Urai']], smithTab, (tab) => { smithTab = tab; redraw(); }));
    if (smithTab === 'peti') body.append(chestCards(char, ctx.onBuyChest));
    else if (smithTab === 'jual') body.append(sellPanel(char, ctx.onSell, redraw));
    else if (smithTab === 'tempa') body.append(forgePanel(char, ctx, redraw));
    else body.append(salvagePanel(char, ctx.onSalvage, redraw));
  } else if (npc.role === 'jeweler') {
    const redraw = () => renderNpc(box, npc, { ...ctx, message: null });
    body.append(tabBar([['pasang', 'Soket'], ['gabung', 'Gabung']], gemTab, (tab) => { gemTab = tab; redraw(); }));
    body.append(gemTab === 'pasang' ? socketPanel(char, ctx, redraw) : combinePanel(char, ctx.onCombine));
  } else if (npc.role === 'board') {
    const redraw = () => renderNpc(box, npc, { ...ctx, message: null });
    body.append(tabBar([['tugas', 'Tugas'], ['ekspedisi', 'Ekspedisi'], ['lencana', 'Lencana'], ['tantangan', 'Tantangan']], boardTab, (tab) => { boardTab = tab; redraw(); }));
    body.append(boardTab === 'tugas' ? bountyList(char, ctx) : boardTab === 'ekspedisi' ? expeditionPanel(char, ctx)
      : boardTab === 'tantangan' ? challengePanel(char, { ...ctx, inHome: char.location === 'home' }) : markShop(char, ctx.onMarkBuy)); // spec §41.3
  } else if (npc.role === 'stable') {
    const redraw = () => renderNpc(box, npc, { ...ctx, message: null });
    body.append(tabBar([['beli', 'Beli'], ['kandang', 'Kandang']], stableTab, (tab) => { stableTab = tab; redraw(); }));
    body.append(stableTab === 'beli' ? renderStableShop(char, ctx) : renderStableList(char, { canChange: true, onSetMount: ctx.onSetMount }));
  } else if (npc.role === 'gate') {
    // open world (spec §25.5): the town gate only leads out; dungeon gates are found out there
    const x = char.expedition;
    if (x) {
      const where = regionOfDungeon(x.dungeon);
      body.append(el('div', 'note exphint', t('Ekspedisi: {d}. Gerbangnya di {r} ({a}/{b} lantai)', { d: dungeonById(x.dungeon).name, r: where.name, a: x.have, b: x.need })));
    }
    // one world (spec §40): the gate leads out into it; the zones as a guide (levels, gates found)
    const regs = el('div', 'regions');
    const out = button(t('Keluar ke dunia'), 'btn region', () => ctx.onExplore());
    out.dataset.region = 'world';
    regs.append(out, el('span', 'note', tr('Wilayah:')));
    for (const r of REGIONS.filter((q) => regionOpen(q, shards(char)))) {
      const row = el('div', 'regionrow');
      const gates = r.dungeons.filter((d) => char.found.includes(d.id)).length;
      row.append(el('span', null, r.name), el('small', null, `LV ${r.levels[0]}–${r.levels[1]}${r.dungeons.length ? ` · ${t('gerbang {a}/{b}', { a: gates, b: r.dungeons.length })}` : ''}`));
      regs.append(row);
    }
    body.append(regs);
  } else if (npc.role === 'weapons' || npc.role === 'armor' || npc.role === 'jewelry') {
    body.append(displayPanel(char, char.location, npc.role, ctx.onBuyDisplay, () => renderNpc(box, npc, { ...ctx, message: null })));
  } else if (npc.role === 'night') {
    body.append(nightPanel(char, char.location, ctx, () => renderNpc(box, npc, { ...ctx, message: null })));
  } else if (npc.role === 'storage') {
    body.append(storagePanel(char, ctx));
  } else if (npc.role === 'mats') {
    body.append(matsPanel(char, char.location, ctx));
  } else if (npc.role === 'teleport') {
    body.append(teleportList(char, ctx.onTeleport));
  }
  if (actions.childElementCount && !actions.parentNode) (body.childElementCount ? body : side).append(actions);

  const msg = el('div', 'npcmsg');
  if (ctx.message) {
    msg.textContent = ctx.message.text; msg.classList.toggle('ok', ctx.message.ok);
    if (ctx.message.color) msg.style.color = ctx.message.color;
  }
  else if (npc.role === 'gate' && hp < maxHp * 0.5) msg.textContent = tr('HP-mu masih rendah. Istirahat dulu di Penginapan?');

  const close = button(tr('Tutup'), 'btn ghost', ctx.onClose);
  close.id = 'npc-close';
  side.append(msg, close);
  panel.append(side);
  if (body.childElementCount) panel.append(body); else panel.classList.add('solo');
  box.append(panel);
}

// The quest the NPC just spoke of, with the button that moves it on.
function questBox(o, onQuest, char) {
  const box = el('div', 'questbox');
  const def = questDef(o.id);
  box.append(el('span', 'pill', def.main ? t('Bab {n}: {title}', { n: def.ch + 1, title: o.title }) : o.title));
  if (o.give) box.append(giveList(o.give, o.can, char));
  if (o.ends || o.start) { const rw = el('div', 'qreward'); rw.append(el('span', 'qrlabel', tr('Hadiah')), rewardChips(char, o.reward)); box.append(rw); }
  if (o.choice) { // spec §42: two answers, each with what it adds to the reward
    const opts = el('div', 'qchoice');
    o.choice.forEach((op, i) => {
      const b = button(tr(op.label), 'btn small', () => onQuest(o.id, i));
      if (Object.keys(op.reward).length) b.append(el('span', 'qchoicerw', null), rewardChips(char, op.reward));
      opts.append(b);
    });
    box.append(opts);
    return box;
  }
  const label = o.give ? tr('Serahkan') : o.start ? tr('Terima') : o.ends ? tr('Lapor & ambil hadiah') : tr('Lanjut');
  const b = button(o.give && o.ends ? tr('Serahkan & ambil hadiah') : label, 'btn small', () => onQuest(o.id));
  b.id = 'quest-go';
  b.disabled = !!o.full || (o.give && !o.can.ok);
  box.append(b);
  if (o.full) box.append(el('div', 'note', t('Jurnal penuh ({n} side quest).', { n: SIDE_MAX })));
  return box;
}

// What a give step asks for, each with what the bag holds (spec §26.5)
function giveList(step, can, char) {
  const list = el('div', 'qgive');
  const chip = (text, ok) => list.append(el('span', `hchip${ok ? ' ok' : ' miss'}`, text));
  for (const line of giveLines(step, char)) chip(line.text, line.ok);
  if (can?.gear.length) list.append(el('div', 'note', `${tr('Akan diserahkan')}: ${can.gear.map((it) => itemName(it)).join(', ')}`));
  return list;
}

// Teleport stone (spec §25.2): every town already visited, priced by its tier.
function teleportList(char, onGo) {
  const list = el('div', 'regions');
  for (const id of TOWN_IDS) {
    const known = char.towns.includes(id), here = char.location === id, price = teleportPrice(id);
    const b = button('', 'btn small region', () => onGo(id));
    b.append(el('span', null, known ? TOWNS[id].name : '???'),
      el('small', null, here ? tr('Kamu di sini') : known ? t('{n} koin', { n: price }) : tr('Belum pernah dikunjungi')));
    b.disabled = !known || here || char.gold < price;
    b.dataset.town = id;
    list.append(b);
  }
  return list;
}

function potionList(char, onBuy) {
  const list = el('div', 'shoplist');
  for (const id of POTION_IDS) {
    const p = POTIONS[id];
    const row = el('div', 'shoprow');
    const ic = el('span', 'sic');
    ic.append(iconCanvas(`pot_${id}`, 30));
    const txt = el('div', 'stx');
    txt.append(el('b', null, p.name), el('span', null, p.desc));
    const have = el('span', 'have', `${char.potions[id]}/${POTION_MAX}`);
    const buy = button(`${p.price}`, 'btn small buy', () => onBuy(id));
    buy.dataset.potion = id;
    buy.prepend(el('span', 'coin'));
    buy.disabled = char.potions[id] >= POTION_MAX || char.gold < p.price;
    row.append(ic, txt, have, buy);
    list.append(row);
  }
  return list;
}

// Four belt slots; tapping one puts the next potion type in it.
function beltEditor(char, onBelt) {
  const wrap = el('div', 'beltedit');
  wrap.append(el('span', 'note', tr('Sabuk (tombol Z X C V). Ketuk untuk ganti:')));
  const row = el('div', 'row');
  char.belt.forEach((id, i) => {
    const b = button('', 'beltslot', () => onBelt(i));
    b.dataset.slot = i;
    if (id) b.append(iconCanvas(`pot_${id}`, 26));
    b.append(el('kbd', null, 'ZXCV'[i]));
    b.title = id ? POTIONS[id].name : tr('Kosong');
    row.append(b);
  });
  wrap.append(row);
  return wrap;
}

// rarity odds of a chest, e.g. "Langka 50% · Epik 35% · …"
function odds(source) {
  const w = DROP_WEIGHTS[source], total = w.reduce((a, b) => a + b, 0);
  return w.map((x, r) => (x ? `${RARITIES[r].name} ${num(Math.round((x / total) * 1000) / 10)}%` : null)).filter(Boolean).join(' · ');
}

function chestCards(char, onBuy) {
  const row = el('div', 'chests');
  for (const [kind, c] of Object.entries(CHESTS)) {
    const card = el('div', `chest ${kind}`);
    const price = chestPrice(char, kind);
    const b = button(String(price), 'btn small buy', () => onBuy(kind));
    b.prepend(el('span', 'coin'));
    b.dataset.chest = kind;
    b.disabled = char.gold < price;
    card.append(el('b', null, c.name), el('span', 'note', t('1 gear LV {n}', { n: char.level })), el('span', 'odds', odds(c.source)), b);
    row.append(card);
  }
  return row;
}

function sellPanel(char, onSell, redraw) {
  for (const id of toSell) if (!char.inventory.some((x) => x.id === id)) toSell.delete(id);
  const wrap = el('div', 'sellbox');
  const head = el('div', 'attrhead');
  head.append(el('b', null, tr('Jual gear')), el('span', 'pts', tr('ketuk untuk memilih')));
  const grid = el('div', 'gearbag');
  const items = char.inventory.slice().sort((a, b) => a.rarity - b.rarity || a.itemLevel - b.itemLevel);
  for (const it of items) {
    const worn = isEquipped(char, it);
    const g = button('', `gtile${toSell.has(it.id) ? ' sel' : ''}${worn ? ' empty' : ''}`, () => {
      if (worn) return;
      if (toSell.has(it.id)) toSell.delete(it.id); else toSell.add(it.id);
      redraw();
    });
    g.style.setProperty('--c', RARITIES[it.rarity].color);
    g.append(gearCanvas(it, 26), el('span', 'ilv', String(it.itemLevel)));
    if (worn) g.append(el('span', 'eq', 'E'));
    g.title = `${itemName(it)} · ${worn ? tr('sedang dipakai') : t('{n} koin', { n: SELL_PRICE(it) })}`;
    g.dataset.item = it.id;
    grid.append(g);
  }
  if (!items.length) grid.append(el('div', 'note', tr('Tasmu kosong.')));
  const total = char.inventory.filter((it) => toSell.has(it.id)).reduce((n, it) => n + SELL_PRICE(it), 0);
  const act = el('div', 'row');
  const pickJunk = (r) => button(tr(r === 0 ? 'Pilih semua Biasa' : 'Pilih ≤ Bagus'), 'btn ghost small', () => { toSell = new Set(junkIds(char, r)); redraw(); });
  const sell = button(t('Jual {n} ({g} koin)', { n: toSell.size, g: total }), 'btn small', () => { const ids = [...toSell]; toSell.clear(); onSell(ids); });
  sell.id = 'npc-sell';
  sell.disabled = !toSell.size;
  act.append(pickJunk(0), pickJunk(1), sell);
  wrap.append(head, grid, act);
  return wrap;
}

// Jobs at the Trainer (spec §43.1): a Pengembara tries any job and picks one from JOB_PICK_LEVEL (free);
// later the other jobs can be tried and changed to (a price that grows each change).
// ctx: onTryJob(id), onPickJob(id), onChangeJob(id)
function jobPanel(char, ctx) {
  const list = el('div', 'shoplist jobs');
  const novice = char.classId === 'novice', price = novice ? 0 : jobChangePrice(char);
  list.append(el('div', 'label', novice
    ? (char.level >= JOB_PICK_LEVEL ? tr('Pilih jalanmu! Coba dulu, lalu pilih satu job (gratis).') : t('Coba tiap job di arena latihan. Memilih job terbuka di level {n}.', { n: JOB_PICK_LEVEL }))
    : t('Job sekarang: {job}. Ganti job di sini; level, gear, dan koin tetap.', { job: CLASSES[char.classId].name })));
  for (const id of JOB_IDS) {
    const C = CLASSES[id], row = el('div', `shoprow${char.classId === id ? ' worn' : ''}`);
    const ic = el('span', 'sic'); ic.append(portrait(id, { hair: char.look.hair, hairColor: char.look.hairColor }, 40));
    const txt = el('div', 'stx'); txt.append(el('b', null, C.name), el('span', null, C.desc));
    const act = el('span', 'skbtns');
    if (char.classId === id) act.append(el('span', 'have', tr('Job sekarang')));
    else {
      const tryB = button(tr('Coba'), 'btn small ghost', () => ctx.onTryJob(id)); tryB.dataset.tryjob = id;
      act.append(tryB);
      if (novice) {
        const pick = button(tr('Pilih'), 'btn small', () => ctx.onPickJob(id)); pick.dataset.pickjob = id;
        pick.disabled = char.level < JOB_PICK_LEVEL;
        act.append(pick);
      } else {
        const ch = button(String(price), 'btn small buy', () => ctx.onChangeJob(id)); ch.prepend(el('span', 'coin')); ch.dataset.changejob = id;
        ch.disabled = char.gold < price;
        act.append(ch);
      }
    }
    row.append(ic, txt, act);
    list.append(row);
  }
  if (!novice) branchRows(char, ctx, list);
  return list;
}

// Job Lanjutan (spec §43.10): from BRANCH.level the trial against Bayangan Diri; after it, change branch here.
// ctx: onBranchTrial(), onChangeBranch(id)
function branchRows(char, ctx, list) {
  const now = branchOf(char), price = branchChangePrice(char);
  list.append(el('div', 'label', now ? t('Job Lanjutan: {b}. Ganti cabang tanpa ujian ulang.', { b: now.name })
    : char.level >= BRANCH.level ? tr('Job Lanjutan: kalahkan Bayangan Diri — dirimu sendiri — lalu pilih satu cabang.')
      : t('Job Lanjutan terbuka di level {n}: ujian melawan Bayangan Diri.', { n: BRANCH.level })));
  for (const b of branchesOf(char.classId)) {
    const row = el('div', `shoprow${now?.id === b.id ? ' worn' : ''}`);
    const ic = el('span', 'sic brdot'); ic.style.background = b.color; ic.style.color = b.color;
    const name = el('b', null, b.name); name.style.color = b.color;
    const txt = el('div', 'stx'); txt.append(name, el('span', null, b.desc), el('span', 'meta', `${b.skills.map((s) => s.name).join(' · ')} · ${b.ult.name}`));
    const act = el('span', 'skbtns');
    if (now?.id === b.id) act.append(el('span', 'have', tr('Cabang sekarang')));
    else if (now) {
      const ch = button(String(price), 'btn small buy', () => ctx.onChangeBranch(b.id)); ch.prepend(el('span', 'coin')); ch.dataset.changebranch = b.id;
      ch.disabled = char.gold < price;
      act.append(ch);
    }
    row.append(ic, txt, act);
    list.append(row);
  }
  if (!now) {
    const go = button(tr('Mulai Ujian'), 'btn', () => ctx.onBranchTrial()); go.dataset.branchtrial = '1';
    go.disabled = char.level < BRANCH.level;
    list.append(go);
  }
}

function trainerList(char, onUpgrade, onRespec, onTalentRespec) {
  const list = el('div', 'shoplist');
  for (const [id, u] of Object.entries(UPGRADES)) {
    const tier = char.upgrades[id], maxed = tier >= u.max;
    const row = el('div', 'shoprow');
    const ic = el('span', 'sic');
    ic.append(iconCanvas(id === 'hp' ? 'vit' : id === 'atk' ? 'pow' : 'mag', 28));
    const txt = el('div', 'stx');
    txt.append(el('b', null, u.name), el('span', null, t('{d} per tingkat', { d: u.desc })));
    const price = upgradePrice(id, tier);
    const b = button(maxed ? tr('Maks') : String(price), 'btn small buy', () => onUpgrade(id));
    if (!maxed) b.prepend(el('span', 'coin'));
    b.dataset.upgrade = id;
    b.disabled = maxed || char.gold < price;
    row.append(ic, txt, el('span', 'have', `${tier}/${u.max}`), b);
    list.append(row);
  }
  const row = el('div', 'shoprow');
  const ic = el('span', 'sic');
  ic.append(iconCanvas('trainer', 28));
  const txt = el('div', 'stx');
  txt.append(el('b', null, tr('Atur Ulang Poin')), el('span', null, tr('Semua poin atribut kembali, bisa dibagi lagi')));
  const price = respecPrice(char);
  const b = button(String(price), 'btn small buy', onRespec);
  b.prepend(el('span', 'coin'));
  b.id = 'npc-respec';
  b.disabled = !spentPoints(char) || char.gold < price;
  row.append(ic, txt, el('span', 'have', t('{n} poin', { n: spentPoints(char) })), b);
  list.append(row);
  // skill points of the current job (spec §43): the first reset is free
  const trow = el('div', 'shoprow');
  const tic = el('span', 'sic'); tic.append(iconCanvas('hst', 28));
  const ttx = el('div', 'stx');
  ttx.append(el('b', null, tr('Atur Ulang SP')), el('span', null, tr('Semua SP job ini kembali; skill bawaan tetap level 1')));
  const free = jobOf(char).freeRespec, tp = free ? 0 : spRespecPrice(char), used = spTotal(char.level) - spFree(char);
  const tb = button(free ? tr('Gratis') : String(tp), 'btn small buy', onTalentRespec);
  if (!free) tb.prepend(el('span', 'coin'));
  tb.id = 'npc-talent-respec';
  tb.disabled = !used || char.gold < tp;
  trow.append(tic, ttx, el('span', 'have', t('{n} SP', { n: used })), tb);
  list.append(trow);
  return list;
}

function barberPanel(char, onHaircut, redraw) {
  newLook ??= { ...char.look };
  const wrap = el('div', 'barber');
  const pv = el('div', 'pv');
  pv.append(stage(portrait(char.classId, newLook, 110), '#e0527a'));
  const opts = el('div', 'bopts');
  const hair = el('div', 'row');
  HAIR_NAMES.forEach((n, i) => {
    const b = button(n, `chip${newLook.hair === i ? ' sel' : ''}`, () => { newLook.hair = i; redraw(); });
    b.dataset.hair = i;
    hair.append(b);
  });
  const colors = el('div', 'row');
  HAIR_PALETTE.forEach(([main], i) => {
    const b = button('', `swatch${newLook.hairColor === i ? ' sel' : ''}`, () => { newLook.hairColor = i; redraw(); });
    b.style.background = main; b.title = HAIR_COLOR_NAMES[i];
    b.dataset.color = i;
    colors.append(b);
  });
  const same = newLook.hair === char.look.hair && newLook.hairColor === char.look.hairColor;
  const go = button(same ? tr('Pilih gaya baru') : t('Potong ({n} koin)', { n: BARBER_PRICE }), 'btn small', () => { const l = newLook; newLook = null; onHaircut(l); });
  go.id = 'npc-haircut';
  go.disabled = same || char.gold < BARBER_PRICE;
  opts.append(el('span', 'note', tr('Gaya')), hair, el('span', 'note', tr('Warna')), colors, go);
  wrap.append(pv, opts);
  return wrap;
}

// one card per dungeon: open ones can be picked, the next locked one shows what opens it
function tabBar(tabs, current, onPick) {
  const bar = el('div', 'tabs');
  for (const [id, label] of tabs) {
    const b = button(tr(label), `tab${id === current ? ' on' : ''}`, () => onPick(id));
    b.dataset.tab = id;
    bar.append(b);
  }
  return bar;
}

// A dungeon gate found in a region (spec §25.5): enter on the deepest floor reached, or an earlier one.
// ctx: { char, onEnter(dungeonId, floor), onClose }
export function renderDungeonGate(box, dungeonId, ctx) {
  const d = dungeonById(dungeonId);
  const rec = ctx.char.records.dungeons[d.id];
  box.classList.remove('dock', 'still');
  delete box.dataset.view;
  box.replaceChildren();
  const panel = el('div', 'panel npcpanel gatepanel');
  panel.style.setProperty('--c', `rgb(${d.theme.light})`);
  panel.append(el('h2', 'h', d.name));
  panel.append(el('div', 'sub', `${t('Lantai {n}/5', { n: rec.bestFloor })}${rec.clears ? ` · ${t('tamat {n}×', { n: rec.clears })}` : ''}`));
  const x = ctx.char.expedition;
  if (x && x.dungeon === d.id) panel.append(el('div', 'note exphint', t('Ekspedisi: bersihkan {n} lantai ({a}/{b})', { n: x.need, a: x.have, b: x.need })));
  const deepest = Math.max(1, rec.bestFloor);
  const b = button(deepest > 1 ? t('Lanjut ke Lantai {n}', { n: deepest }) : tr('Masuk Dungeon'), 'btn big', () => ctx.onEnter(d.id, deepest));
  b.id = 'npc-enter';
  panel.append(b);
  if (deepest > 1) {
    const floors = el('div', 'floors');
    floors.append(el('span', 'note', tr('atau mulai dari:')));
    for (let f = 1; f < deepest; f++) {
      const fb = button(t('Lantai {n}', { n: f }), 'btn ghost small', () => ctx.onEnter(d.id, f));
      fb.dataset.floor = f;
      floors.append(fb);
    }
    panel.append(floors);
  }
  panel.append(el('div', 'note', tr('Pulang lewat portal emas membawamu kembali ke gerbang ini.')));
  const close = button(tr('Tutup'), 'btn ghost', ctx.onClose);
  close.id = 'npc-close';
  panel.append(close);
  box.append(panel);
}
