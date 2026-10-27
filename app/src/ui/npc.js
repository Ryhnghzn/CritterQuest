// NPC dialogs in town (spec §13.2, §15): Inn, potion shop (5 potions + belt),
// Pandai Besi (chests, selling gear), the dungeon gate (pick a floor) and
// townsfolk who just talk.
import { el, button, stage } from './screens.js';
import { portrait, HAIR_NAMES, HAIR_PALETTE, HAIR_COLOR_NAMES } from '../art/doll.js';
import { iconCanvas, gearIcon } from '../art/sprites.js';
import { POTIONS, POTION_IDS, POTION_MAX } from '../data/potions.js';
import { innPrice, chestPrice, junkIds, respecPrice } from '../meta/shop.js';
import { UPGRADES, upgradePrice, BARBER_PRICE } from '../data/shop.js';
import { spentPoints, unlockedDungeons } from '../meta/character.js';
import { DUNGEONS } from '../data/dungeons.js';
import { CHESTS, DROP_WEIGHTS, RARITIES, SELL_PRICE } from '../data/items.js';
import { itemName } from '../meta/itemgen.js';
import { isEquipped } from '../meta/gear.js';

let toSell = new Set(); // Pandai Besi: items marked for selling
let newLook = null;     // Tukang Cukur: style being tried on
let gateDungeon = null; // Penjaga gerbang: dungeon picked

const LINES = {
  inn: 'Selamat malam, petualang. Kasur hangat dan sup panas menunggumu.',
  potion: 'Hehehe… ramuan segar dari kuali. Mau yang mana?',
  gear: 'Tungku sudah panas! Mau beli peti, atau menjual barang rongsokan dari dungeon?',
  gate: 'Gerbang ini membuka jalan ke semua dungeon yang sudah kau taklukkan. Mau ke mana?',
  trainer: 'Otot tidak tumbuh dari duduk-duduk. Latihan denganku membuatmu lebih kuat — selamanya.',
  barber: 'Rambutmu kusut habis dari dungeon, ya? Duduk sini, biar kurapikan!',
};
const TITLES = { inn: 'Penginapan', potion: 'Toko Ramuan', gear: 'Pandai Besi', gate: 'Gerbang Dungeon', trainer: 'Pelatih', barber: 'Tukang Cukur', talk: 'Warga' };

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
  const role = el('span', 'pill', npc.title || TITLES[npc.role]);
  role.style.setProperty('--c', npc.outfit[0]);
  info.append(el('div', 'nm', npc.name), role);
  head.append(stage(portrait(null, { ...npc.look, outfit: npc.outfit }, 92), npc.outfit[0]), info);
  panel.append(head, el('div', 'npcline', `“${npc.role === 'talk' ? ctx.line : LINES[npc.role]}”`));

  if (npc.role !== 'talk') {
    const wallet = el('div', 'records');
    for (const text of [`${char.gold} koin`, `HP ${Math.ceil(hp)} / ${Math.round(maxHp)}`]) wallet.append(el('span', 'hchip', text));
    panel.append(wallet);
  }

  const actions = el('div', 'row');
  if (npc.role === 'inn') {
    const b = button(`Tidur — ${innPrice(char)} koin`, 'btn', ctx.onInn);
    b.id = 'npc-inn';
    actions.append(b);
  } else if (npc.role === 'potion') {
    panel.append(potionList(char, ctx.onBuyPotion), beltEditor(char, ctx.onBelt));
  } else if (npc.role === 'trainer') {
    panel.append(trainerList(char, ctx.onUpgrade, ctx.onRespec));
  } else if (npc.role === 'barber') {
    panel.append(barberPanel(char, ctx.onHaircut, () => renderNpc(box, npc, { ...ctx, message: null })));
  } else if (npc.role === 'gear') {
    panel.append(chestCards(char, ctx.onBuyChest), sellPanel(char, ctx.onSell, () => renderNpc(box, npc, { ...ctx, message: null })));
  } else if (npc.role === 'gate') {
    const open = unlockedDungeons(char);
    if (!open.some((d) => d.id === gateDungeon)) gateDungeon = open[open.length - 1].id;
    panel.append(dungeonPicker(char, open, () => renderNpc(box, npc, { ...ctx, message: null })));
    const rec = char.records.dungeons[gateDungeon];
    const deepest = Math.max(1, rec.bestFloor);
    const b = button(deepest > 1 ? `Lanjut ke Lantai ${deepest}` : 'Masuk Dungeon', 'btn big', () => ctx.onEnter(gateDungeon, deepest));
    b.id = 'npc-enter';
    actions.append(b);
    panel.append(actions);
    if (deepest > 1) {
      const floors = el('div', 'floors');
      floors.append(el('span', 'note', 'atau mulai dari:'));
      for (let f = 1; f < deepest; f++) {
        const fb = button(`Lantai ${f}`, 'btn ghost small', () => ctx.onEnter(gateDungeon, f));
        fb.dataset.floor = f;
        floors.append(fb);
      }
      panel.append(floors);
    }
  }
  if (actions.childElementCount && !actions.parentNode) panel.append(actions);

  const msg = el('div', 'npcmsg');
  if (ctx.message) {
    msg.textContent = ctx.message.text; msg.classList.toggle('ok', ctx.message.ok);
    if (ctx.message.color) msg.style.color = ctx.message.color;
  }
  else if (npc.role === 'gate' && hp < maxHp * 0.5) msg.textContent = 'HP-mu masih rendah. Istirahat dulu di Penginapan?';

  const close = button('Tutup', 'btn ghost', ctx.onClose);
  close.id = 'npc-close';
  panel.append(msg, close);
  box.append(panel);
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
  wrap.append(el('span', 'note', 'Sabuk (tombol 1–4) — ketuk untuk ganti:'));
  const row = el('div', 'row');
  char.belt.forEach((id, i) => {
    const b = button('', 'beltslot', () => onBelt(i));
    b.dataset.slot = i;
    if (id) b.append(iconCanvas(`pot_${id}`, 26));
    b.append(el('kbd', null, String(i + 1)));
    b.title = id ? POTIONS[id].name : 'Kosong';
    row.append(b);
  });
  wrap.append(row);
  return wrap;
}

// rarity odds of a chest, e.g. "Langka 50% · Epik 35% · …"
function odds(source) {
  const w = DROP_WEIGHTS[source], total = w.reduce((a, b) => a + b, 0);
  return w.map((x, r) => (x ? `${RARITIES[r].name} ${Math.round((x / total) * 1000) / 10}%` : null)).filter(Boolean).join(' · ');
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
    card.append(el('b', null, c.name), el('span', 'note', `1 gear LV ${char.level}`), el('span', 'odds', odds(c.source)), b);
    row.append(card);
  }
  return row;
}

function sellPanel(char, onSell, redraw) {
  for (const id of toSell) if (!char.inventory.some((x) => x.id === id)) toSell.delete(id);
  const wrap = el('div', 'sellbox');
  const head = el('div', 'attrhead');
  head.append(el('b', null, 'Jual gear'), el('span', 'pts', 'ketuk untuk memilih'));
  const grid = el('div', 'gearbag');
  const items = char.inventory.slice().sort((a, b) => a.rarity - b.rarity || a.itemLevel - b.itemLevel);
  for (const it of items) {
    const worn = isEquipped(char, it);
    const t = button('', `gtile${toSell.has(it.id) ? ' sel' : ''}${worn ? ' empty' : ''}`, () => {
      if (worn) return;
      if (toSell.has(it.id)) toSell.delete(it.id); else toSell.add(it.id);
      redraw();
    });
    t.style.setProperty('--c', RARITIES[it.rarity].color);
    t.append(iconCanvas(gearIcon(it), 26), el('span', 'ilv', String(it.itemLevel)));
    if (worn) t.append(el('span', 'eq', 'E'));
    t.title = `${itemName(it)} — ${worn ? 'sedang dipakai' : `${SELL_PRICE(it)} koin`}`;
    t.dataset.item = it.id;
    grid.append(t);
  }
  if (!items.length) grid.append(el('div', 'note', 'Tasmu kosong.'));
  const total = char.inventory.filter((it) => toSell.has(it.id)).reduce((n, it) => n + SELL_PRICE(it), 0);
  const act = el('div', 'row');
  const pickJunk = (r) => button(r === 0 ? 'Pilih semua Biasa' : 'Pilih ≤ Bagus', 'btn ghost small', () => { toSell = new Set(junkIds(char, r)); redraw(); });
  const sell = button(`Jual ${toSell.size} — ${total} koin`, 'btn small', () => { const ids = [...toSell]; toSell.clear(); onSell(ids); });
  sell.id = 'npc-sell';
  sell.disabled = !toSell.size;
  act.append(pickJunk(0), pickJunk(1), sell);
  wrap.append(head, grid, act);
  return wrap;
}

function trainerList(char, onUpgrade, onRespec) {
  const list = el('div', 'shoplist');
  for (const [id, u] of Object.entries(UPGRADES)) {
    const tier = char.upgrades[id], maxed = tier >= u.max;
    const row = el('div', 'shoprow');
    const ic = el('span', 'sic');
    ic.append(iconCanvas(id === 'hp' ? 'vit' : id === 'atk' ? 'pow' : 'mag', 28));
    const txt = el('div', 'stx');
    txt.append(el('b', null, u.name), el('span', null, `${u.desc} per tingkat`));
    const price = upgradePrice(id, tier);
    const b = button(maxed ? 'Maks' : String(price), 'btn small buy', () => onUpgrade(id));
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
  txt.append(el('b', null, 'Atur Ulang Poin'), el('span', null, 'Semua poin atribut kembali, bisa dibagi lagi'));
  const price = respecPrice(char);
  const b = button(String(price), 'btn small buy', onRespec);
  b.prepend(el('span', 'coin'));
  b.id = 'npc-respec';
  b.disabled = !spentPoints(char) || char.gold < price;
  row.append(ic, txt, el('span', 'have', `${spentPoints(char)} poin`), b);
  list.append(row);
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
  const go = button(same ? 'Pilih gaya baru' : `Potong — ${BARBER_PRICE} koin`, 'btn small', () => { const l = newLook; newLook = null; onHaircut(l); });
  go.id = 'npc-haircut';
  go.disabled = same || char.gold < BARBER_PRICE;
  opts.append(el('span', 'note', 'Gaya'), hair, el('span', 'note', 'Warna'), colors, go);
  wrap.append(pv, opts);
  return wrap;
}

// one card per dungeon: open ones can be picked, the next locked one shows what opens it
function dungeonPicker(char, open, redraw) {
  const row = el('div', 'dungeons');
  DUNGEONS.forEach((d, i) => {
    const isOpen = open.includes(d);
    if (!isOpen && i > open.length) return;
    const rec = char.records.dungeons[d.id];
    const card = button('', `dcard ${d.id}${d.id === gateDungeon ? ' sel' : ''}${isOpen ? '' : ' locked'}`, () => {
      if (!isOpen) return;
      gateDungeon = d.id;
      redraw();
    });
    card.dataset.dungeon = d.id;
    card.style.setProperty('--c', `rgb(${d.theme.light})`);
    card.append(el('b', null, d.name));
    if (isOpen) card.append(el('span', null, `Lantai ${rec.bestFloor}/5${rec.clears ? ` · tamat ${rec.clears}×` : ''}`));
    else card.append(el('span', null, `Terkunci — tamatkan ${DUNGEONS[i - 1].short}`));
    row.append(card);
  });
  return row;
}
