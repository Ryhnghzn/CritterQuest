// Contoh toko Pandai Brom (prototipe): tab Peti / Senjata / Zirah / Jual, kisi barang berbingkai
// rarity, kartu detail dengan perbandingan gear terpakai, jumlah, tombol beli; NPC menanggapi.
import { gearCanvas } from '../src/art/gear.js';
import { iconCanvas } from '../src/art/sprites.js';
import { makeItem, dropItem, itemName, itemStats, statText } from '../src/meta/itemgen.js';
import { RARITIES } from '../src/data/items.js';

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const SLOT_NAME = { weapon: 'Senjata', helm: 'Helm', armor: 'Zirah', boots: 'Sepatu', amulet: 'Kalung', ring: 'Cincin' };
const PRICE = [60, 140, 320, 780, 1900, 4800];
const SELL = [8, 20, 45, 110, 260, 600];
const LV = 27;

const gen = (slot, rarity) => makeItem({ slot, classId: 'warrior', rarity, itemLevel: LV }, Math.random);
const equipped = Object.fromEntries(['weapon', 'helm', 'armor', 'boots', 'amulet', 'ring'].map((s) => [s, gen(s, 2)]));

function stock() {
  return {
    peti: [
      { kind: 'chest', src: 'chest', name: 'Peti Gear', icon: 'chest', price: 30 + 10 * LV, rarity: 1, qty: true,
        desc: 'Satu gear acak setingkat levelmu.', odds: [55, 28, 12, 4, 0.9, 0.1] },
      { kind: 'chest', src: 'grand', name: 'Peti Agung', icon: 'chest', price: 150 + 40 * LV, rarity: 4, qty: true,
        desc: 'Satu gear acak, minimal Langka. Bisa Mitos!', odds: [0, 0, 62, 28, 8.5, 1.5] },
    ],
    senjata: [0, 1, 2, 3, 4, 5].map((r) => ({ kind: 'gear', item: gen('weapon', r), price: PRICE[r] })),
    zirah: [['helm', 1], ['armor', 3], ['boots', 2], ['amulet', 4], ['ring', 0], ['armor', 5], ['helm', 2], ['boots', 1]]
      .map(([s, r]) => ({ kind: 'gear', item: gen(s, r), price: PRICE[r] })),
    jual: [['ring', 0], ['helm', 0], ['boots', 1], ['weapon', 1], ['amulet', 0], ['armor', 2], ['helm', 1]]
      .map(([s, r]) => ({ kind: 'gear', item: gen(s, r), price: SELL[r], sell: true })),
  };
}

// say(text, mood): the NPC answers in the dialog box; done(): back to the conversation
export function shopUI({ say, done, tab: first = 'senjata' }) {
  const S = stock();
  let gold = 2400, shown = gold, tab = first, pick = 0, qty = 1;
  const marked = new Set();
  const root = el('div', 'shopui');
  root.onclick = (e) => e.stopPropagation();
  const head = el('div', 'sh-head', `<h3>Bengkel Brom</h3><span class="bag" title="Tas"><svg viewBox="0 0 24 24"><path d="M8 7V5a4 4 0 0 1 8 0v2"/><path d="M4 8h16l-1.4 12.2a2 2 0 0 1-2 1.8H7.4a2 2 0 0 1-2-1.8z"/><path d="M9 12h6"/></svg><b class="cnt"></b></span><span class="gold"><i class="coin"></i><b></b></span><button class="x" title="Selesai">✕</button>`);
  const tabs = el('div', 'sh-tabs');
  const body = el('div', 'sh-body');
  const grid = el('div', 'sh-grid'), card = el('div', 'sh-card');
  body.append(grid, card);
  const log = el('div', 'sh-log');   // "Masuk tas" notes
  root.append(head, tabs, body, log);
  let bagN = 0;
  head.querySelector('.x').onclick = () => done();

  for (const [id, label] of [['peti', 'Peti'], ['senjata', 'Senjata'], ['zirah', 'Zirah'], ['jual', 'Jual']]) {
    const b = el('button', 'tab', label); b.dataset.t = id;
    b.onclick = () => { tab = id; pick = 0; qty = 1; marked.clear(); render(); if (id === 'jual') say('Rongsokanmu? Hmm… taruh saja, akan kutimbang.', 'think'); };
    tabs.append(b);
  }

  const list = () => S[tab];
  const rarityOf = (e) => (e.kind === 'gear' ? e.item.rarity : e.rarity);
  const nameOf = (e) => (e.kind === 'gear' ? itemName(e.item) : e.name);
  const iconOf = (e, size) => (e.kind === 'gear' ? gearCanvas(e.item, size) : iconCanvas(e.icon, size));

  function render() {
    for (const b of tabs.children) b.classList.toggle('on', b.dataset.t === tab);
    grid.replaceChildren(...list().map((e, i) => {
      const c = el('button', `cell r${rarityOf(e)}`);
      c.style.setProperty('--rc', RARITIES[rarityOf(e)].color);
      c.append(iconOf(e, 40), el('b', 'pr', `<i class="coin"></i>${e.price}`));
      c.classList.toggle('on', i === pick);
      c.classList.toggle('marked', marked.has(i));
      c.classList.toggle('poor', !e.sell && !e.sold && e.price > gold);
      c.classList.toggle('sold', !!e.sold);
      c.onclick = () => {
        if (tab === 'jual') { if (marked.has(i)) marked.delete(i); else marked.add(i); }
        if (pick !== i) { pick = i; qty = 1; }
        render();
      };
      return c;
    }));
    renderCard();
  }

  function renderCard() {
    const e = list()[pick];
    if (!e) { card.replaceChildren(el('p', 'empty', 'Kosong. Brom sudah membeli semuanya.')); return; }
    const r = rarityOf(e), rc = RARITIES[r].color;
    card.style.setProperty('--rc', rc);
    const top = el('div', 'cd-top');
    const ic = el('div', 'cd-ic'); ic.append(iconOf(e, 64));
    top.append(ic, el('div', 'cd-nm', `<b>${nameOf(e)}</b><span>${e.kind === 'gear' ? `${RARITIES[r].name} · ${SLOT_NAME[e.item.slot]} · Lv ${LV}` : 'Peti'}</span>`));
    const info = el('div', 'cd-info');
    if (e.kind === 'gear') {
      const now = itemStats(e.item), cur = itemStats(equipped[e.item.slot]);
      for (const [stat, v] of Object.entries(now)) {
        const d = v - (cur[stat] || 0);
        const cmp = e.sell ? '' : d > 0 ? `<em class="up">▲ ${+d.toFixed(1)}</em>` : d < 0 ? `<em class="dn">▼ ${+(-d).toFixed(1)}</em>` : '';
        info.append(el('div', 'st', `<span>${statText(stat, v)}</span>${cmp}`));
      }
      if (!e.sell) info.append(el('div', 'vs', `Dibanding yang kau pakai: ${itemName(equipped[e.item.slot])}`));
    } else {
      info.append(el('p', 'desc', e.desc));
      const odds = el('div', 'odds');
      e.odds.forEach((p, i) => { if (p) odds.append(el('span', '', `<i style="background:${RARITIES[i].color}"></i>${RARITIES[i].name} ${p}%`)); });
      info.append(odds);
    }
    const foot = el('div', 'cd-foot');
    if (tab === 'jual') {
      const sum = [...marked].reduce((s, i) => s + list()[i].price, 0);
      const b = el('button', 'buy sell', marked.size ? `Jual ${marked.size} barang · <i class="coin"></i>${sum}` : 'Pilih barang untuk dijual');
      b.disabled = !marked.size;
      b.onclick = () => {
        gold += sum; bump();
        S.jual = list().filter((_, i) => !marked.has(i)); marked.clear(); pick = 0;
        say(sum > 200 ? 'Wah, ada yang lumayan juga. Ini uangmu.' : 'Rongsokan semua… tapi ya sudah, ini uangnya.', sum > 200 ? 'happy' : 'worry');
        render();
      };
      foot.append(b);
    } else if (e.sold) {
      foot.append(el('div', 'owned', '✓ Sudah masuk tas'));
    } else {
      if (e.qty) {
        const st = el('div', 'qty', `<button class="m">−</button><b>${qty}</b><button class="p">+</button>`);
        st.querySelector('.m').onclick = () => { qty = Math.max(1, qty - 1); renderCard(); };
        st.querySelector('.p').onclick = () => { qty = Math.min(10, qty + 1); renderCard(); };
        foot.append(st);
      }
      const total = e.price * qty, can = total <= gold;
      const b = el('button', `buy${can ? '' : ' poor'}`, `Beli · <i class="coin"></i>${total}`);
      b.onclick = () => {
        if (!can) { say('Uangmu kurang, Nak. Brom tidak memberi utang!', 'angry'); b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope'); return; }
        gold -= total; bump();
        flyCoins(b);
        if (e.kind === 'gear') {
          flyToBag(card.querySelector('.cd-ic canvas'));
          e.sold = true; e.fresh = true;
          say(r >= 4 ? 'Ha! Mata yang tajam. Itu karya terbaikku.' : r >= 2 ? 'Pilihan bagus. Jangan sampai patah.' : 'Barang sederhana, tapi jujur.', r >= 4 ? 'shock' : 'happy');
          render();
          setTimeout(() => addBag([e.item]), 650);
        } else {
          const got = Array.from({ length: qty }, () => dropItem({ source: e.src, classId: 'warrior', charLevel: LV, level: LV }, Math.random));
          render();
          reveal(got);
        }
      };
      foot.append(b);
    }
    card.replaceChildren(top, info, foot);
    if (e.sold) card.append(el('div', `stamp${e.fresh ? ' fresh' : ''}`, 'DIBELI'));
    if (e.fresh) { e.fresh = false; burst(ic, r); }
  }

  // the gold counter rolls to its new value
  function bump() { head.querySelector('.gold').classList.remove('bump'); void head.offsetWidth; head.querySelector('.gold').classList.add('bump'); }
  function flyCoins(from) {
    const a = from.getBoundingClientRect(), b = head.querySelector('.gold').getBoundingClientRect(), o = root.getBoundingClientRect();
    const k = o.width / root.offsetWidth || 1; // the phone frame is scaled
    for (let i = 0; i < 7; i++) {
      const c = el('i', 'coin fly');
      c.style.left = `${(a.left + a.width / 2 - o.left) / k}px`; c.style.top = `${(a.top - o.top) / k}px`;
      c.style.setProperty('--dx', `${(b.left - a.left - a.width / 2) / k + (Math.random() - 0.5) * 30}px`);
      c.style.setProperty('--dy', `${(b.top - a.top) / k}px`);
      c.style.animationDelay = `${i * 45}ms`;
      root.append(c); setTimeout(() => c.remove(), 900);
    }
  }
  (function roll() {
    if (root.isConnected) root._seen = true;
    else if (root._seen) return; // closed: stop counting
    shown += (gold - shown) * 0.2; if (Math.abs(gold - shown) < 1) shown = gold;
    head.querySelector('b').textContent = Math.round(shown);
    requestAnimationFrame(roll);
  })();

  // ---- tanda sudah dibeli -------------------------------------------------------
  function burst(ic, r) { // rays + sparks round the big icon, stronger for Epik and up
    const rc = RARITIES[r].color, fx = el('div', `burst${r >= 3 ? ' big' : ''}`);
    fx.style.setProperty('--rc', rc);
    for (let i = 0; i < (r >= 3 ? 16 : 10); i++) {
      const sp = el('i'); const a = (i / (r >= 3 ? 16 : 10)) * Math.PI * 2;
      sp.style.setProperty('--x', `${Math.cos(a) * (50 + Math.random() * 30)}px`); sp.style.setProperty('--y', `${Math.sin(a) * (50 + Math.random() * 30)}px`);
      fx.append(sp);
    }
    ic.append(fx); setTimeout(() => fx.remove(), 1400);
    if (r >= 4) { root.classList.remove('flash'); void root.offsetWidth; root.classList.add('flash'); }
  }
  function flyToBag(src) {
    if (!src) return;
    const o = root.getBoundingClientRect(), k = o.width / root.offsetWidth || 1;
    const a = src.getBoundingClientRect(), bag = head.querySelector('.bag').getBoundingClientRect();
    const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    c.getContext('2d').drawImage(src, 0, 0);
    c.className = 'flyitem';
    c.style.left = `${(a.left - o.left) / k}px`; c.style.top = `${(a.top - o.top) / k}px`;
    c.style.width = `${a.width / k}px`; c.style.height = `${a.height / k}px`;
    c.style.setProperty('--dx', `${(bag.left + bag.width / 2 - a.left - a.width / 2) / k}px`);
    c.style.setProperty('--dy', `${(bag.top + bag.height / 2 - a.top - a.height / 2) / k}px`);
    root.append(c); setTimeout(() => c.remove(), 750);
  }
  function addBag(items) {
    bagN += items.length;
    const bg = head.querySelector('.bag');
    bg.querySelector('.cnt').textContent = `+${bagN}`;
    bg.classList.remove('pop'); void bg.offsetWidth; bg.classList.add('pop');
    for (const it of items) {
      const n = el('div', 'note', '<span>Masuk tas</span>');
      n.style.setProperty('--rc', RARITIES[it.rarity].color);
      n.prepend(gearCanvas(it, 22)); n.append(el('b', '', itemName(it)));
      log.prepend(n); setTimeout(() => n.classList.add('out'), 3200); setTimeout(() => n.remove(), 3700);
    }
  }
  // a bought chest opens on the spot: it rattles, bursts with the best rarity's colour, the items rise
  function reveal(items) {
    const top = Math.max(...items.map((i) => i.rarity)), rc = RARITIES[top].color;
    const ov = el('div', 'reveal');
    ov.style.setProperty('--rc', rc);
    const box = el('div', 'rv-chest'); box.append(iconCanvas('chest', 90));
    const row = el('div', 'rv-items');
    items.forEach((it, i) => {
      const c = el('div', 'rv-it'); c.style.setProperty('--rc', RARITIES[it.rarity].color); c.style.setProperty('--i', i);
      c.append(gearCanvas(it, 52), el('b', '', itemName(it)), el('span', '', RARITIES[it.rarity].name));
      row.append(c);
    });
    ov.append(el('div', 'rv-rays'), box, row, el('p', 'rv-tap', 'Ketuk untuk menyimpan ke tas'));
    root.append(ov);
    setTimeout(() => { ov.classList.add('open'); if (top >= 4) { root.classList.remove('flash'); void root.offsetWidth; root.classList.add('flash'); } }, 900);
    say(top >= 4 ? 'Hah?! Itu… itu cahaya Legendaris! Beruntung sekali kau!' : top >= 3 ? 'Ooh, ungu! Lumayan sekali.' : 'Yah, isinya biasa saja. Coba lagi?', top >= 4 ? 'shock' : top >= 3 ? 'happy' : 'think');
    ov.onclick = () => { ov.classList.add('done'); setTimeout(() => ov.remove(), 400); addBag(items); };
  }

  render();
  return root;
}
