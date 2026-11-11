// Concept page for pets & mounts (app/pet.html): the creatures from src/art/companions.js,
// a stage where a hero rides the chosen mount with the chosen pet following, the cosmetics
// (colour skins, saddles, pet hats, trails, auras) and the gallery.
// Mounts: the majestic set (art/mounts.js, spec §35); ?lama shows the first concept.
import { MAJESTIC_MOUNTS, drawMajesticRidden, drawSummonRing } from '../src/art/mounts.js';
import { MONSTER_ART } from '../src/art/monsters.js';
import { MOUNTS as OLD_MOUNTS, PETS, SADDLES, HATS, TRAILS, AURAS, drawRidden, drawHat, drawTrail, drawAura } from '../src/art/companions.js';
import { drawDoll } from '../src/art/doll.js';
import { RARITIES } from '../src/data/items.js';
import { LOOK } from '../src/data/look.js';
import { pixelateCanvas } from '../src/render3d/pixelate.js';

const OLD = new URLSearchParams(location.search).has('lama');
const MOUNTS = OLD ? OLD_MOUNTS : MAJESTIC_MOUNTS;
const MYTH = { tier: 6, rarity: 5 }, LEG = { tier: 5, rarity: 4 }, EPIC = { tier: 4, rarity: 3 };
const RIDERS = {
  warrior: { name: 'Warrior', look: { hair: 1, hairColor: 2, gear: { weapon: MYTH, helm: LEG, armor: MYTH, boots: LEG } } },
  archer: { name: 'Archer', look: { hair: 3, hairColor: 4, gear: { weapon: LEG, armor: EPIC, boots: EPIC } } },
  mage: { name: 'Mage', look: { hair: 2, hairColor: 6, gear: { weapon: LEG, helm: EPIC, armor: LEG } } },
  assassin: { name: 'Assassin', look: { hair: 0, hairColor: 0, gear: { weapon: EPIC, armor: EPIC, boots: LEG } } },
};
const $ = (id) => document.getElementById(id);
const state = {
  cls: 'warrior', walk: true, mount: MOUNTS.find((m) => m.id === 'dragon'), pet: PETS.find((p) => p.id === 'babydragon'),
  skin: {}, saddle: 'royal', hat: 'crown', mountTrail: 'none', petTrail: 'stars', aura: OLD ? 'gold' : 'none',
  summonT: -9, foe: true, pixel: !!LOOK.pixel, view: 'turn', // side | front | back | turn (cycles; spec §38 for mounts)
};
const VIEW_CYCLE = ['side', 'front', 'side', 'back'];
const viewAt = (t) => (state.view === 'turn' ? VIEW_CYCLE[Math.floor(t / 2.2) % 4] : state.view);
const SUMMON = 1.1; // seconds (spec §35.1: 1 s)
const skinIx = (it) => state.skin[it.id] || 0;
const rider = () => ({ classId: state.cls, look: RIDERS[state.cls].look });
const dpr = () => Math.min(devicePixelRatio || 1, 2);

function fit(c) {
  const w = Math.round(c.clientWidth * dpr()), h = Math.round(c.clientHeight * dpr());
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  return c.getContext('2d');
}
const shadow = (g, rx, lift = 0) => {
  g.beginPath(); g.ellipse(0, 0, rx * (1 - Math.min(lift, 30) / 60), rx * 0.18, 0, 0, Math.PI * 2);
  g.fillStyle = 'rgba(0,0,0,.4)'; g.fill();
};

// a row of choice buttons; redraw() rebuilds every row so the "on" states stay right
function buttons(box, list, isOn, onPick) {
  box.replaceChildren();
  for (const [id, label] of list) {
    const b = document.createElement('button');
    b.className = `btn${isOn(id) ? ' on' : ''}`; b.textContent = label;
    b.onclick = () => { onPick(id); redraw(); };
    box.append(b);
  }
}
function row(label, note, list, isOn, onPick) {
  const r = document.createElement('div'); r.className = 'row';
  r.innerHTML = `<div class="lbl">${label}${note ? `<small>${note}</small>` : ''}</div><div class="opts"></div>`;
  buttons(r.querySelector('.opts'), list, isOn, onPick);
  return r;
}
function redraw() {
  buttons($('classes'), Object.entries(RIDERS).map(([id, r]) => [id, r.name]), (id) => state.cls === id, (id) => { state.cls = id; });
  buttons($('modes'), [['walk', 'Berjalan'], ['idle', 'Diam'], ['summon', 'Panggil'], ['foe', 'Musuh pembanding']],
    (id) => (id === 'foe' ? state.foe : id === 'summon' ? false : (id === 'walk') === state.walk),
    (id) => { if (id === 'summon') state.summonT = performance.now() / 1000; else if (id === 'foe') state.foe = !state.foe; else state.walk = id === 'walk'; });
  if (!OLD) buttons($('views'), [['turn', 'Putar'], ['side', 'Samping'], ['front', 'Depan'], ['back', 'Belakang'], ...(LOOK.pixel ? [['px', state.pixel ? 'Pixel ✓' : 'Halus']] : [])],
    (id) => (id === 'px' ? state.pixel : state.view === id), (id) => { if (id === 'px') state.pixel = !state.pixel; else state.view = id; });
  const m = state.mount, p = state.pet;
  $('cosm').replaceChildren(
    row('Warna mount', m.name, m.skins.map((s, i) => [i, s.name]), (i) => skinIx(m) === i, (i) => { state.skin[m.id] = i; }),
    row('Warna pet', p.name, p.skins.map((s, i) => [i, s.name]), (i) => skinIx(p) === i, (i) => { state.skin[p.id] = i; }),
    ...(OLD ? [row('Pelana', null, SADDLES.map((s) => [s.id, s.name]), (id) => state.saddle === id, (id) => { state.saddle = id; })] : []),
    row('Topi pet', null, HATS.map((s) => [s.id, s.name]), (id) => state.hat === id, (id) => { state.hat = id; }),
    row('Jejak mount', null, TRAILS.map((s) => [s.id, s.name]), (id) => state.mountTrail === id, (id) => { state.mountTrail = id; }),
    row('Jejak pet', null, TRAILS.map((s) => [s.id, s.name]), (id) => state.petTrail === id, (id) => { state.petTrail = id; }),
    row('Aura', 'di bawah mount', AURAS.map((s) => [s.id, s.name]), (id) => state.aura === id, (id) => { state.aura = id; }),
  );
  for (const k of cards) k.c.classList.toggle('on', state[k.kind] === k.it);
  $('ver').innerHTML = OLD ? 'Versi lama · <a href="?">lihat versi megah</a>' : 'Versi megah · <a href="?lama">bandingkan dengan versi lama</a>';
  $('now').innerHTML = `<b>${m.name} ${m.skins[skinIx(m)].name}</b><span>bersama ${p.name} ${p.skins[skinIx(p)].name}</span>`;
}

// gallery
const cards = [];
function gallery(box, list, kind) {
  for (const it of list) {
    const c = document.createElement('div'); c.className = 'card';
    const cv = document.createElement('canvas');
    const r = RARITIES[it.rarity];
    c.innerHTML = `<div class="tx"><div class="nm"><b>${it.name}</b><span class="rar" style="color:${r.color}">${r.name}</span></div><span class="tag">${it.tag}${it.fly ? ' · Terbang' : ''} · ${it.skins.length} warna</span><p>${it.desc}</p></div>`;
    c.prepend(cv);
    c.onclick = () => { state[kind] = it; redraw(); scrollTo({ top: 0, behavior: 'smooth' }); };
    box.append(c);
    cards.push({ c, cv, it, kind });
  }
}
gallery($('mounts'), MOUNTS, 'mount');
gallery($('pets'), PETS, 'pet');
redraw();

function drawPet(g, pet, pose, withCosm) {
  if (withCosm) drawTrail(g, state.petTrail, pose.t, pose.m, 22, pet.fly ? -16 : 0);
  const head = pet.draw(g, pose);
  if (withCosm) drawHat(g, state.hat, head, pose.t);
}
// the rider as in the game: the anime style when the game uses it (spec §39)
const riderDoll = (g, cls, look, p) => drawDoll(g, cls, look, { ...p, anime: !OLD && !!LOOK.anime });
function drawMount(g, mount, pose, rd, withCosm) {
  const S = mount.scale || 1;
  if (withCosm) { drawAura(g, state.aura, pose.t, 30 * S); drawTrail(g, state.mountTrail, pose.t, pose.m, 50 * S, mount.fly ? -30 * S : 0); }
  if (OLD) drawRidden(g, mount, pose, rd, drawDoll);
  else drawMajesticRidden(g, mount, pose, rd, riderDoll);
}

// Pixel art like the game (render3d/actors.js, spec §39): the mount and rider are drawn small,
// LOOK.pixel.k pixels per game unit in the game's riding box, run through the same filter and
// enlarged without smoothing. draw(gg) paints in game units, feet at the origin.
const BOX = { hx: 120, ht: 150, hb: 14 };
const pixBuf = new Map();
function inPixels(g, x, y, S, key, draw) {
  if (!state.pixel || OLD || !LOOK.pixel) { g.save(); g.translate(x, y); g.scale(S, S); draw(g); g.restore(); return; }
  const K = LOOK.pixel.k, w = BOX.hx * 2 * K, h = (BOX.ht + BOX.hb) * K;
  let c = pixBuf.get(key);
  if (!c) { c = document.createElement('canvas'); c.width = w; c.height = h; pixBuf.set(key, c); }
  const gg = c.getContext('2d', { willReadFrequently: true });
  gg.setTransform(1, 0, 0, 1, 0, 0); gg.clearRect(0, 0, w, h);
  gg.setTransform(K, 0, 0, K, BOX.hx * K, BOX.ht * K); gg.lineJoin = 'round';
  draw(gg);
  pixelateCanvas(c, LOOK.pixel);
  g.save(); g.imageSmoothingEnabled = false;
  g.drawImage(c, x - BOX.hx * S, y - BOX.ht * S, BOX.hx * 2 * S, (BOX.ht + BOX.hb) * S);
  g.restore();
}

// the stage: a forest floor scrolling under the rider
const TREES = Array.from({ length: 24 }, (_, i) => ({ x: i * 97 % 2400, h: 60 + (i * 53 % 90), w: 26 + (i * 31 % 30), far: i % 3 === 0 }));
function drawStage(t) {
  const c = $('stage'), g = fit(c), W = c.width, H = c.height, k = H / 200, gy = H * 0.8;
  const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#07060f'); sky.addColorStop(0.6, '#1a1026'); sky.addColorStop(1, '#0b0709');
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  g.beginPath(); g.arc(W * 0.8, H * 0.22, H * 0.09, 0, Math.PI * 2); g.fillStyle = '#ffd9a0'; g.fill();
  g.beginPath(); g.arc(W * 0.8 - H * 0.008, H * 0.22, H * 0.084, 0, Math.PI * 2); g.fillStyle = '#07060f'; g.fill();
  const scroll = state.walk ? t * 70 * k : 0;
  for (const far of [true, false]) {
    const sp = far ? 0.35 : 0.7;
    g.fillStyle = far ? '#140c1a' : '#0e0912';
    for (const tr of TREES) {
      if (tr.far !== far) continue;
      const x = ((tr.x * k - scroll * sp) % (2400 * k) + 2400 * k) % (2400 * k) - 100 * k;
      g.beginPath(); g.moveTo(x, gy); g.lineTo(x + tr.w * k / 2, gy - tr.h * k * (far ? 1.2 : 1)); g.lineTo(x + tr.w * k, gy); g.fill();
    }
  }
  g.fillStyle = '#16101a'; g.fillRect(0, gy, W, H - gy);
  g.fillStyle = '#2a2018'; g.fillRect(0, gy, W, 6 * k);
  g.fillStyle = 'rgba(255,220,170,.06)';
  for (let x = -(scroll % (60 * k)); x < W; x += 60 * k) g.fillRect(x, gy + 12 * k, 22 * k, 2 * k);
  const S = k * (OLD ? 1.7 : 1.3), m = state.walk ? 1 : 0;
  g.save(); g.translate(W * 0.27, gy); g.scale(S, S);
  shadow(g, 9, state.pet.fly ? 16 : 0); drawPet(g, state.pet, { t, m, w: t * 11, skin: skinIx(state.pet) }, true);
  g.restore();
  // a monster next to it: same game units (an enemy wolf, r 12), to compare size & colour
  if (state.foe) {
    g.save(); g.translate(W * 0.86, gy - 12 * S * 0.55); g.scale(-S, S);
    MONSTER_ART.wolf(g, 12);
    g.restore();
    g.font = `600 ${Math.round(11 * k)}px Barlow, sans-serif`; g.fillStyle = 'rgba(232,220,196,.55)'; g.textAlign = 'center';
    g.fillText('musuh (Serigala Bayang)', W * 0.86, gy + 22 * k);
  }
  const ms = state.mount.scale || 1, sk = (t - state.summonT) / SUMMON;
  inPixels(g, W * 0.56, gy, S, 'stage', (g) => {
  if (sk >= 0 && sk < 1) drawSummonRing(g, sk, t, 30 * ms);
  if (sk < 0 || sk >= 0.35) {
    // the mount rises out of the light and rears up once (rotates about the hind feet)
    const a = sk >= 1 || sk < 0 ? 1 : Math.min(1, (sk - 0.35) / 0.3), rear = sk >= 0.55 && sk < 1 ? Math.sin((sk - 0.55) / 0.45 * Math.PI) : 0;
    g.globalAlpha = a;
    shadow(g, 26 * ms, state.mount.fly ? 12 : 0);
    g.translate(-14 * ms, 0); g.rotate(state.mount.fly ? -rear * 0.12 : -rear * 0.28); g.translate(14 * ms, -(1 - a) * 10);
    const view = viewAt(t);
    if (view === 'side') drawMount(g, state.mount, { t, m: sk >= 0 && sk < 1 ? 0 : m, w: t * 9, skin: skinIx(state.mount), saddle: state.saddle }, rider(), true);
    else drawMount(g, state.mount, { t, m: sk >= 0 && sk < 1 ? 0 : m, w: t * 9, skin: skinIx(state.mount), view }, rider(), true);
  }
  });
}

function drawCard(k, t) {
  const g = fit(k.cv), W = k.cv.width, H = k.cv.height;
  g.clearRect(0, 0, W, H);
  const tt = t + k.it.id.length, pose = { t: tt, m: 1, w: tt * 8, skin: skinIx(k.it), saddle: state.saddle, view: k.kind === 'mount' ? viewAt(t) : undefined };
  g.save();
  if (k.kind === 'mount') {
    const S = H / (120 * (k.it.scale || 1));
    inPixels(g, W * 0.52, H * 0.88, S, `card:${k.it.id}`, (g) => {
      shadow(g, 26 * (k.it.scale || 1), k.it.fly ? 12 : 0);
      drawMount(g, k.it, pose, { classId: 'warrior', look: RIDERS.warrior.look }, false);
    });
  } else {
    const S = H / 44; g.translate(W * 0.5, H * 0.84); g.scale(S, S);
    shadow(g, 10, k.it.fly ? 14 : 0);
    drawPet(g, k.it, pose, false);
  }
  g.restore();
}

function frame(ms) {
  const t = ms / 1000;
  drawStage(t);
  for (const k of cards) {
    const r = k.cv.getBoundingClientRect();
    if (r.bottom > 0 && r.top < innerHeight) drawCard(k, t);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
