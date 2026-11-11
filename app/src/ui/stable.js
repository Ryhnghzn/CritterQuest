// The Stable (spec §35.2): the shop tab (buy mounts and colours) and the mount list
// shared by the Stable's Kandang tab and the character panel's Mount tab.
// Previews are canvases animated by ONE requestAnimationFrame loop that drops canvases
// once they are detached or hidden, and stops when none are left (track() restarts it).
import { el, button } from './screens.js';
import { MAJESTIC_BY_ID } from '../render/world.js';
import { drawMajesticRidden } from '../art/mounts.js';
import { MOUNT_DEFS, MOUNT_IDS, SKIN_PRICE } from '../data/mounts.js';
import { RARITIES } from '../data/items.js';
import { tr, t } from '../i18n.js';

const BONUS_TEXT = {
  goldfind: 'Koin +{n}%', expfind: 'EXP +{n}%', potionheal: 'Ramuan pulih +{n}%',
  matfind: 'Bahan +{n}%', gearfind: 'Gear +{n}%', maxHp: 'HP maks +{n}%', magnet: 'Magnet +{n}%',
};
export const bonusText = (id) => Object.entries(MOUNT_DEFS[id].bonus)
  .map(([k, v]) => t(BONUS_TEXT[k], { n: Math.round(v * 100) })).join(' · ');

function sourceText(id) {
  const d = MOUNT_DEFS[id];
  if (d.source === 'story') return tr('Hadiah cerita');
  if (d.source === 'stable') return t('Dijual di Kandang: {n} koin', { n: d.price });
  if (d.source === 'marks') return tr('Toko Lencana');
  return tr('Jatuh dari bos');
}

// ---- animated previews ----
const views = new Set();
let looping = false;

function drawView(v, time) {
  const cv = v.cv, W = cv.width, H = cv.height;
  const g = cv.getContext('2d');
  g.clearRect(0, 0, W, H);
  const m = MAJESTIC_BY_ID[v.id], sc = m.scale || 1;
  const S = Math.min(H / (120 * sc), W / (150 * sc));
  g.save();
  g.translate(W * 0.5, H * 0.88); g.scale(S, S);
  g.beginPath(); g.ellipse(0, 0, 26 * sc * (m.fly ? 0.8 : 1), 26 * sc * 0.18, 0, 0, Math.PI * 2);
  g.fillStyle = 'rgba(0,0,0,.4)'; g.fill();
  drawMajesticRidden(g, m, { t: time, m: 1, w: time * 8, skin: v.skin }, null, null);
  g.restore();
}

function frame(ms) {
  for (const v of views) {
    if (!v.cv.isConnected || !v.cv.getClientRects().length) { if (++v.miss > 3) views.delete(v); continue; }
    v.miss = 0;
    drawView(v, ms / 1000 + v.id.length);
  }
  if (views.size) requestAnimationFrame(frame); else looping = false;
}

function track(cv, id, skin) {
  views.add({ cv, id, skin, miss: 0 });
  if (!looping) { looping = true; requestAnimationFrame(frame); }
}

function preview(id, skin, owned = true) {
  const cv = el('canvas', `mpv${owned ? '' : ' unowned'}`);
  const dpr = Math.min(devicePixelRatio || 1, 2);
  cv.width = Math.round(132 * dpr); cv.height = Math.round(92 * dpr);
  track(cv, id, skin);
  return cv;
}

const rarityPill = (id) => {
  const r = RARITIES[MOUNT_DEFS[id].rarity];
  const p = el('span', 'pill', tr(r.name));
  p.style.setProperty('--c', r.color);
  return p;
};

// One card per mount. Owned: colour chips (pick one in town) and "Tunggangi".
// Not owned: a dark silhouette and how to get it.
// opts: { canChange, onSetMount(id, skin) }
export function renderStableList(char, { canChange = false, onSetMount } = {}) {
  const list = el('div', 'shoplist mountlist');
  const my = char.mounts;
  for (const id of MOUNT_IDS) {
    const def = MOUNT_DEFS[id], art = MAJESTIC_BY_ID[id];
    const owned = my.owned[id];
    const active = my.active === id;
    const row = el('div', `shoprow mcard${owned ? '' : ' locked'}${active ? ' active' : ''}`);
    row.dataset.mount = id;
    row.style.setProperty('--c', RARITIES[def.rarity].color);
    const skin = owned ? (my.skin[id] ?? owned[0]) : 0;
    const txt = el('div', 'stx');
    const top = el('div', 'mtop');
    top.append(el('b', null, owned ? art.name : '???'), owned ? rarityPill(id) : el('span', null, ''));
    if (def.fly && owned) top.append(el('span', 'mfly', tr('Terbang')));
    txt.append(top);
    if (owned) {
      txt.append(el('span', null, bonusText(id)));
      const chips = el('div', 'mskins');
      for (const s of owned) {
        const b = button(art.skins[s].name, `btn small mskin${s === skin ? ' on' : ''}`, () => onSetMount?.(id, s));
        b.disabled = !canChange || (active && s === skin);
        b.dataset.skin = String(s);
        chips.append(b);
      }
      txt.append(chips);
    } else {
      txt.append(el('span', null, sourceText(id)));
    }
    const side = el('div', 'buys');
    if (active) side.append(el('span', 'have', tr('Dipakai')));
    else if (owned && canChange) {
      const b = button(tr('Tunggangi'), 'btn small buy', () => onSetMount?.(id, skin));
      b.dataset.ride = id;
      side.append(b);
    }
    row.append(preview(id, skin, !!owned), txt, side);
    list.append(row);
  }
  if (!canChange) list.prepend(el('div', 'note', tr('Ganti mount di kota (Kandang atau panel ini).')));
  return list;
}

// Shop tab: mounts sold for coins, then the colours still missing on owned mounts.
// ctx: { onBuyMount(id), onBuySkin(id, skin) }
export function renderStableShop(char, { onBuyMount, onBuySkin }) {
  const list = el('div', 'shoplist mountlist');
  for (const id of MOUNT_IDS.filter((k) => MOUNT_DEFS[k].source === 'stable')) {
    const def = MOUNT_DEFS[id], art = MAJESTIC_BY_ID[id];
    const has = !!char.mounts.owned[id];
    const row = el('div', `shoprow mcard${has ? ' active' : ''}`);
    row.dataset.mount = id;
    row.style.setProperty('--c', RARITIES[def.rarity].color);
    const txt = el('div', 'stx');
    const top = el('div', 'mtop');
    top.append(el('b', null, art.name), rarityPill(id));
    txt.append(top, el('span', null, art.desc), el('span', null, bonusText(id)));
    const side = el('div', 'buys');
    if (has) side.append(el('span', 'have', tr('Dimiliki')));
    else {
      const b = button(t('{n} koin', { n: def.price }), 'btn small buy', () => onBuyMount(id));
      b.dataset.buyMount = id;
      b.disabled = char.gold < def.price;
      side.append(b);
    }
    row.append(preview(id, char.mounts.skin[id] ?? 0, true), txt, side);
    list.append(row);
  }
  const skins = [];
  for (const id of MOUNT_IDS) {
    const owned = char.mounts.owned[id];
    if (!owned) continue;
    for (let s = 0; s < MOUNT_DEFS[id].skins; s++) if (!owned.includes(s)) skins.push([id, s]);
  }
  if (skins.length) {
    list.append(el('div', 'note', t('Warna tambahan, {n} koin per warna.', { n: SKIN_PRICE })));
    for (const [id, s] of skins) {
      const art = MAJESTIC_BY_ID[id];
      const row = el('div', 'shoprow mcard');
      row.dataset.mount = id;
      row.style.setProperty('--c', RARITIES[MOUNT_DEFS[id].rarity].color);
      const txt = el('div', 'stx');
      txt.append(el('b', null, `${art.name} · ${art.skins[s].name}`));
      const b = button(t('{n} koin', { n: SKIN_PRICE }), 'btn small buy', () => onBuySkin(id, s));
      b.dataset.buySkin = `${id}:${s}`;
      b.disabled = char.gold < SKIN_PRICE;
      const side = el('div', 'buys'); side.append(b);
      row.append(preview(id, s, true), txt, side);
      list.append(row);
    }
  }
  return list;
}
