// NPC dialogs in town (spec §13.2, §15): Inn, potion shop (5 potions + belt),
// Pandai Besi (chests, selling gear), the dungeon gate (pick a floor) and
// townsfolk who just talk.
import { el, button, stage } from './screens.js';
import { portrait, HAIR_NAMES, HAIR_PALETTE, HAIR_COLOR_NAMES } from '../art/doll.js';
import { iconCanvas } from '../art/sprites.js';
import { gearCanvas } from '../art/gear.js';
import { POTIONS, POTION_IDS, POTION_MAX } from '../data/potions.js';
import { innPrice, chestPrice, junkIds, respecPrice } from '../meta/shop.js';
import { UPGRADES, upgradePrice, BARBER_PRICE } from '../data/shop.js';
import { spentPoints } from '../meta/character.js';
import { spentTalents, talentRespecPrice } from '../meta/talents.js';
import { dungeonById } from '../data/dungeons.js';
import { REGIONS, TOWNS, TOWN_IDS, regionOfDungeon } from '../data/world.js';
import { teleportPrice } from '../meta/world.js';
import { CHESTS, DROP_WEIGHTS, RARITIES, SELL_PRICE } from '../data/items.js';
import { itemName } from '../meta/itemgen.js';
import { isEquipped } from '../meta/gear.js';
import { forgePanel, salvagePanel, socketPanel, combinePanel } from './forge.js';
import { bountyList, markShop, expeditionPanel } from './board.js';
import { displayPanel, nightPanel, matsPanel, storagePanel } from './market.js';
import { tr, t, num } from '../i18n.js';

let toSell = new Set(); // Pandai Besi: items marked for selling
let newLook = null;     // Tukang Cukur: style being tried on
let smithTab = 'peti';  // Pandai Brom: peti | jual | tempa | urai
let gemTab = 'pasang';  // Tukang Permata: pasang | gabung
let boardTab = 'tugas'; // Kapten Vera: tugas | ekspedisi | lencana

const LINES = {
  inn: 'Selamat malam, petualang. Kasur hangat dan sup panas menunggumu.',
  potion: 'Hehehe… ramuan segar dari kuali. Mau yang mana?',
  gear: 'Tungku sudah panas! Beli peti, jual rongsokan, tempa gear-mu, atau urai jadi bahan.',
  jeweler: 'Permata yang tepat di soket yang tepat… itu seni, Sayang.',
  gate: 'Gerbang dungeon tidak ada di kota. Carilah sendiri di luar sana — atau ambil ekspedisi di Balai Petualang.',
  trainer: 'Otot tidak tumbuh dari duduk-duduk. Latihan denganku membuatmu lebih kuat — selamanya.',
  board: 'Papan tugas sudah dibuka! Selesaikan tugas di dungeon, lalu ambil hadiahmu di sini.',
  barber: 'Rambutmu kusut habis dari dungeon, ya? Duduk sini, biar kurapikan!',
  teleport: 'Batu rune ini berdengung pelan. Sentuh, dan sebut kota yang pernah kau datangi.',
  weapons: 'Bilah-bilah terbaik kota ini. Pilih, pegang, rasakan beratnya.',
  armor: 'Zirah yang pas di badan menyelamatkan nyawa. Lihat-lihat dulu.',
  jewelry: 'Kalung dan cincin, masing-masing dengan kisahnya sendiri.',
  night: 'Psst… barang yang tak dijual di etalase. Hanya malam ini.',
  storage: 'Titip apa saja di sini. Barangmu aman, dan bisa kau ambil di kota besar mana pun.',
  mats: 'Debu, kristal, inti, permata — semua yang dibutuhkan pandai besi. Jumlahnya terbatas.',
};
const TITLES = { inn: 'Penginapan', potion: 'Toko Ramuan', gear: 'Pandai Besi', jeweler: 'Tukang Permata', gate: 'Penjaga Gerbang', trainer: 'Pelatih', barber: 'Tukang Cukur', board: 'Papan Tugas', talk: 'Warga',
  teleport: 'Perjalanan Cepat', weapons: 'Pandai Senjata', armor: 'Penjahit Zirah', jewelry: 'Toko Perhiasan', storage: 'Gudang', mats: 'Pedagang Bahan', night: 'Pedagang Malam' };

// ctx: { char, hp, maxHp, message: { text, ok } | null, line (talk: what they say now),
//        onInn, onBuyPotion(id), onBelt(slot), onBuyChest(kind), onSell(ids), onUpgrade(id), onRespec(),
//        onHaircut(look), onEnter(dungeonId, floor), onClose }
export function renderNpc(box, npc, ctx) {
  if (npc.role !== 'barber') newLook = null;
  const { char, hp, maxHp } = ctx;
  box.replaceChildren();
  const panel = el('div', 'panel npcpanel');

  const head = el('div', 'npchead');
  const info = el('div', 'info');
  const role = el('span', 'pill', npc.title || tr(TITLES[npc.role]));
  role.style.setProperty('--c', npc.outfit[0]);
  info.append(el('div', 'nm', npc.name), role);
  head.append(stage(npc.object ? iconCanvas('zap', 92) : portrait(null, { ...npc.look, outfit: npc.outfit }, 92), npc.outfit[0]), info);
  panel.append(head, el('div', 'npcline', `“${npc.role === 'talk' ? ctx.line : tr(LINES[npc.role])}”`));

  if (npc.role !== 'talk') {
    const wallet = el('div', 'records');
    const chips = [t('{n} koin', { n: char.gold }), `HP ${Math.ceil(hp)} / ${Math.round(maxHp)}`];
    if (npc.role === 'board') chips.push(t('{n} Lencana', { n: char.marks }));
    for (const text of chips) wallet.append(el('span', 'hchip', text));
    panel.append(wallet);
  }

  const actions = el('div', 'row');
  if (npc.role === 'inn') {
    const b = button(t('Tidur — {n} koin', { n: innPrice(char) }), 'btn', ctx.onInn);
    b.id = 'npc-inn';
    actions.append(b);
  } else if (npc.role === 'potion') {
    panel.append(potionList(char, ctx.onBuyPotion), beltEditor(char, ctx.onBelt));
  } else if (npc.role === 'trainer') {
    panel.append(trainerList(char, ctx.onUpgrade, ctx.onRespec, ctx.onTalentRespec));
  } else if (npc.role === 'barber') {
    panel.append(barberPanel(char, ctx.onHaircut, () => renderNpc(box, npc, { ...ctx, message: null })));
  } else if (npc.role === 'gear') {
    const redraw = () => renderNpc(box, npc, { ...ctx, message: null });
    panel.append(tabBar([['peti', 'Peti'], ['jual', 'Jual'], ['tempa', 'Tempa'], ['urai', 'Urai']], smithTab, (tab) => { smithTab = tab; redraw(); }));
    if (smithTab === 'peti') panel.append(chestCards(char, ctx.onBuyChest));
    else if (smithTab === 'jual') panel.append(sellPanel(char, ctx.onSell, redraw));
    else if (smithTab === 'tempa') panel.append(forgePanel(char, ctx, redraw));
    else panel.append(salvagePanel(char, ctx.onSalvage, redraw));
  } else if (npc.role === 'jeweler') {
    const redraw = () => renderNpc(box, npc, { ...ctx, message: null });
    panel.append(tabBar([['pasang', 'Soket'], ['gabung', 'Gabung']], gemTab, (tab) => { gemTab = tab; redraw(); }));
    panel.append(gemTab === 'pasang' ? socketPanel(char, ctx, redraw) : combinePanel(char, ctx.onCombine));
  } else if (npc.role === 'board') {
    const redraw = () => renderNpc(box, npc, { ...ctx, message: null });
    panel.append(tabBar([['tugas', 'Tugas'], ['ekspedisi', 'Ekspedisi'], ['lencana', 'Lencana']], boardTab, (tab) => { boardTab = tab; redraw(); }));
    panel.append(boardTab === 'tugas' ? bountyList(char, ctx) : boardTab === 'ekspedisi' ? expeditionPanel(char, ctx) : markShop(char, ctx.onMarkBuy));
  } else if (npc.role === 'gate') {
    // open world (spec §25.5): the town gate only leads out; dungeon gates are found out there
    const x = char.expedition;
    if (x) {
      const where = regionOfDungeon(x.dungeon);
      panel.append(el('div', 'note exphint', t('Ekspedisi: {d} — gerbangnya di {r} ({a}/{b} lantai)', { d: dungeonById(x.dungeon).name, r: where.name, a: x.have, b: x.need })));
    }
    const regs = el('div', 'regions');
    regs.append(el('span', 'note', tr('Keluar ke wilayah:')));
    for (const r of REGIONS.filter((q) => q.from === char.location || q.to === char.location)) {
      const b = button('', 'btn small region', () => ctx.onExplore(r.id));
      const gates = r.dungeons.filter((d) => char.found.includes(d.id)).length;
      b.append(el('span', null, r.name), el('small', null, `LV ${r.levels[0]}–${r.levels[1]}${r.dungeons.length ? ` · ${t('gerbang {a}/{b}', { a: gates, b: r.dungeons.length })}` : ''}`));
      b.dataset.region = r.id;
      regs.append(b);
    }
    panel.append(regs);
  } else if (npc.role === 'weapons' || npc.role === 'armor' || npc.role === 'jewelry') {
    panel.append(displayPanel(char, char.location, npc.role, ctx.onBuyDisplay, () => renderNpc(box, npc, { ...ctx, message: null })));
  } else if (npc.role === 'night') {
    panel.append(nightPanel(char, char.location, ctx, () => renderNpc(box, npc, { ...ctx, message: null })));
  } else if (npc.role === 'storage') {
    panel.append(storagePanel(char, ctx));
  } else if (npc.role === 'mats') {
    panel.append(matsPanel(char, char.location, ctx));
  } else if (npc.role === 'teleport') {
    panel.append(teleportList(char, ctx.onTeleport));
  }
  if (actions.childElementCount && !actions.parentNode) panel.append(actions);

  const msg = el('div', 'npcmsg');
  if (ctx.message) {
    msg.textContent = ctx.message.text; msg.classList.toggle('ok', ctx.message.ok);
    if (ctx.message.color) msg.style.color = ctx.message.color;
  }
  else if (npc.role === 'gate' && hp < maxHp * 0.5) msg.textContent = tr('HP-mu masih rendah. Istirahat dulu di Penginapan?');

  const close = button(tr('Tutup'), 'btn ghost', ctx.onClose);
  close.id = 'npc-close';
  panel.append(msg, close);
  box.append(panel);
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
  wrap.append(el('span', 'note', tr('Sabuk (tombol Z X C V) — ketuk untuk ganti:')));
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
    g.title = `${itemName(it)} — ${worn ? tr('sedang dipakai') : t('{n} koin', { n: SELL_PRICE(it) })}`;
    g.dataset.item = it.id;
    grid.append(g);
  }
  if (!items.length) grid.append(el('div', 'note', tr('Tasmu kosong.')));
  const total = char.inventory.filter((it) => toSell.has(it.id)).reduce((n, it) => n + SELL_PRICE(it), 0);
  const act = el('div', 'row');
  const pickJunk = (r) => button(tr(r === 0 ? 'Pilih semua Biasa' : 'Pilih ≤ Bagus'), 'btn ghost small', () => { toSell = new Set(junkIds(char, r)); redraw(); });
  const sell = button(t('Jual {n} — {g} koin', { n: toSell.size, g: total }), 'btn small', () => { const ids = [...toSell]; toSell.clear(); onSell(ids); });
  sell.id = 'npc-sell';
  sell.disabled = !toSell.size;
  act.append(pickJunk(0), pickJunk(1), sell);
  wrap.append(head, grid, act);
  return wrap;
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
  // talents (spec §21)
  const trow = el('div', 'shoprow');
  const tic = el('span', 'sic'); tic.append(iconCanvas('hst', 28));
  const ttx = el('div', 'stx');
  ttx.append(el('b', null, tr('Atur Ulang Bakat')), el('span', null, tr('Semua poin bakat kembali, bisa dibagi lagi')));
  const tp = talentRespecPrice(char);
  const tb = button(String(tp), 'btn small buy', onTalentRespec);
  tb.prepend(el('span', 'coin'));
  tb.id = 'npc-talent-respec';
  tb.disabled = !spentTalents(char) || char.gold < tp;
  trow.append(tic, ttx, el('span', 'have', t('{n} poin', { n: spentTalents(char) })), tb);
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
  const go = button(same ? tr('Pilih gaya baru') : t('Potong — {n} koin', { n: BARBER_PRICE }), 'btn small', () => { const l = newLook; newLook = null; onHaircut(l); });
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
