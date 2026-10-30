// Concept page for pets & mounts (app/pet.html): the creatures from src/art/companions.js,
// a stage where a hero rides the chosen mount with the chosen pet following, the cosmetics
// (colour skins, saddles, pet hats, trails, auras) and the gallery.
import { MOUNTS, PETS, SADDLES, HATS, TRAILS, AURAS, drawRidden, drawHat, drawTrail, drawAura } from '../src/art/companions.js';
import { drawDoll } from '../src/art/doll.js';
import { RARITIES } from '../src/data/items.js';

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
  skin: {}, saddle: 'royal', hat: 'crown', mountTrail: 'none', petTrail: 'stars', aura: 'gold',
};
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
  buttons($('modes'), [['walk', 'Berjalan'], ['idle', 'Diam']], (id) => (id === 'walk') === state.walk, (id) => { state.walk = id === 'walk'; });
  const m = state.mount, p = state.pet;
  $('cosm').replaceChildren(
    row('Warna mount', m.name, m.skins.map((s, i) => [i, s.name]), (i) => skinIx(m) === i, (i) => { state.skin[m.id] = i; }),
    row('Warna pet', p.name, p.skins.map((s, i) => [i, s.name]), (i) => skinIx(p) === i, (i) => { state.skin[p.id] = i; }),
    row('Pelana', null, SADDLES.map((s) => [s.id, s.name]), (id) => state.saddle === id, (id) => { state.saddle = id; }),
    row('Topi pet', null, HATS.map((s) => [s.id, s.name]), (id) => state.hat === id, (id) => { state.hat = id; }),
    row('Jejak mount', null, TRAILS.map((s) => [s.id, s.name]), (id) => state.mountTrail === id, (id) => { state.mountTrail = id; }),
    row('Jejak pet', null, TRAILS.map((s) => [s.id, s.name]), (id) => state.petTrail === id, (id) => { state.petTrail = id; }),
    row('Aura', 'di bawah mount', AURAS.map((s) => [s.id, s.name]), (id) => state.aura === id, (id) => { state.aura = id; }),
  );
  for (const k of cards) k.c.classList.toggle('on', state[k.kind] === k.it);
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
function drawMount(g, mount, pose, rd, withCosm) {
  if (withCosm) { drawAura(g, state.aura, pose.t, 30); drawTrail(g, state.mountTrail, pose.t, pose.m, 50, mount.fly ? -30 : 0); }
  drawRidden(g, mount, pose, rd, drawDoll);
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
  const S = k * 1.7, m = state.walk ? 1 : 0;
  g.save(); g.translate(W * 0.27, gy); g.scale(S, S);
  shadow(g, 9, state.pet.fly ? 16 : 0); drawPet(g, state.pet, { t, m, w: t * 11, skin: skinIx(state.pet) }, true);
  g.restore();
  g.save(); g.translate(W * 0.56, gy); g.scale(S, S);
  shadow(g, 26, state.mount.fly ? 12 : 0); drawMount(g, state.mount, { t, m, w: t * 9, skin: skinIx(state.mount), saddle: state.saddle }, rider(), true);
  g.restore();
}

function drawCard(k, t) {
  const g = fit(k.cv), W = k.cv.width, H = k.cv.height;
  g.clearRect(0, 0, W, H);
  const tt = t + k.it.id.length, pose = { t: tt, m: 1, w: tt * 8, skin: skinIx(k.it), saddle: state.saddle };
  g.save();
  if (k.kind === 'mount') {
    const S = H / 120; g.translate(W * 0.52, H * 0.88); g.scale(S, S);
    shadow(g, 26, k.it.fly ? 12 : 0);
    drawMount(g, k.it, pose, { classId: 'warrior', look: RIDERS.warrior.look }, false);
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
