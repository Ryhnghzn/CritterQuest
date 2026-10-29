// Character style comparison: the game's current doll vs three heroic styles.
import { drawDoll } from '../src/art/doll.js';
import { drawHero, rimOf } from './heroes.js';
import { drawHades } from './hades.js';

const DPR = Math.min(devicePixelRatio || 1, 2);
const $ = (id) => document.getElementById(id);
const MYTHIC_GEAR = { weapon: { tier: 6, rarity: 5 }, helm: { tier: 6, rarity: 5 }, armor: { tier: 6, rarity: 5 }, boots: { tier: 6, rarity: 5 } };
const LOOK = { warrior: { hair: 1, hairColor: 0, gear: MYTHIC_GEAR }, mage: { hair: 2, hairColor: 5, gear: MYTHIC_GEAR } };
const CARDS = [
  ['now', 'Sekarang', 'chibi', 'Kepala ⅓ badan, bulat, mata besar.'],
  ['A', 'A — Heroik ramping', 'wajah terlihat', 'Proporsi dewasa, wajah tegas, warna kelas jelas.'],
  ['B', 'B — Siluet gelap', 'misterius', 'Badan gelap bergaris cahaya, mata & rune menyala.'],
  ['C', 'C — Ksatria berpelindung', 'gear menonjol', 'Helm/tudung tertutup, bahu berlapis, permata Mitos.'],
  ['D', 'D — Gaya Hades', 'komik gelap', 'Bersudut, bayangan hitam tegas, cahaya tepi berwarna, garis tinta tipis.'],
];

// pose selection
const POSES = [['cycle', 'Siklus'], ['idle', 'Diam'], ['walk', 'Jalan'], ['attack', 'Serang']];
const params = new URLSearchParams(location.search);
let poseMode = params.get('pose') || 'cycle';
const fixedT = params.has('t') ? +params.get('t') : null; // freeze time (screenshots)
const tabs = $('poses');
for (const [id, label] of POSES) {
  const b = document.createElement('button');
  b.textContent = label; b.dataset.id = id;
  b.onclick = () => { poseMode = id; for (const x of tabs.children) x.classList.toggle('on', x.dataset.id === id); };
  tabs.append(b);
}
for (const x of tabs.children) x.classList.toggle('on', x.dataset.id === poseMode);

function poseAt(t) {
  const T = t % 6;
  const m = poseMode === 'cycle' ? (T < 2 ? 'idle' : T < 4 ? 'walk' : 'attack') : poseMode;
  if (m === 'idle') return { name: 'Diam', p: { t } };
  if (m === 'walk') return { name: 'Jalan', p: { t, moving: 1, walk: t * 9 } };
  const a = (t % 1) / 0.85;
  return { name: 'Serang', p: { t, attack: a <= 1 ? a : -1 } };
}
const dollPose = (p) => ({ t: p.t, moving: p.moving || 0, walk: p.walk || 0, attack: p.attack >= 0 ? Math.sin(p.attack * Math.PI) : 0 });

// one figure: style id, class, scale so the character is ~`px` CSS pixels tall
function figure(g, style, classId, p, px) {
  if (style === 'now') { const k = px / 46; g.scale(k, k); drawDoll(g, classId, LOOK[classId], dollPose(p)); }
  else if (style === 'D') { const k = px / 80; g.scale(k, k); drawHades(g, classId, p); }
  else if (rimOf(style, classId)) silhouette(g, style, classId, p, px);
  else { const k = px / 80; g.scale(k, k); drawHero(g, style, classId, p); }
}

// style B: draw the hero off-screen, then lay a rim-coloured copy shifted towards the
// light (top-left) and glowing behind it, so only the outer edge catches the light
const off = document.createElement('canvas'), og = off.getContext('2d');
const tint = document.createElement('canvas'), tg = tint.getContext('2d');
function silhouette(g, style, classId, p, px) {
  const S = Math.ceil(px * 1.9 * DPR), oy = S * 0.84, k = (px / 80) * DPR;
  off.width = off.height = tint.width = tint.height = S;
  og.translate(S / 2, oy); og.scale(k, k); drawHero(og, style, classId, p);
  tg.drawImage(off, 0, 0); tg.globalCompositeOperation = 'source-in';
  tg.fillStyle = rimOf(style, classId); tg.fillRect(0, 0, S, S);
  const s = S / DPR, x = -s / 2, y = -oy / DPR, d = Math.max(0.8, px / 110);
  g.save();
  g.shadowColor = rimOf(style, classId); g.shadowBlur = px / 12;
  g.globalAlpha = 0.55; g.drawImage(tint, x, y, s, s);
  g.shadowBlur = 0; g.globalAlpha = 1;
  g.drawImage(tint, x - d, y - d * 0.8, s, s);
  g.drawImage(off, x, y, s, s);
  g.restore();
}

function backdrop(g, w, h, floorY) {
  const bg = g.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#16101f'); bg.addColorStop(1, '#0a0710');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  const lt = g.createRadialGradient(w * 0.5, floorY - h * 0.35, 4, w * 0.5, floorY - h * 0.3, h * 0.7);
  lt.addColorStop(0, 'rgba(255,170,90,.16)'); lt.addColorStop(1, 'rgba(255,170,90,0)');
  g.fillStyle = lt; g.fillRect(0, 0, w, h);
  g.fillStyle = '#1b1426'; g.fillRect(0, floorY, w, h - floorY);
  g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(0, floorY, w, 1);
}

const draws = [];
for (const classId of ['warrior', 'mage']) {
  for (const [style, title, tag, desc] of CARDS) {
    const card = document.createElement('div'); card.className = 'card';
    card.innerHTML = `<h3>${title}<span>${tag}</span></h3>`;
    const c = document.createElement('canvas');
    const W = 240, H = 280;
    c.width = W * DPR; c.height = H * DPR; c.style.aspectRatio = `${W}/${H}`;
    const p = document.createElement('p'); p.textContent = desc;
    card.append(c, p);
    $(`g-${classId}`).append(card);
    const g = c.getContext('2d');
    draws.push((t) => {
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      backdrop(g, W, H, 236);
      g.beginPath(); g.ellipse(W / 2, 238, 34, 7, 0, 0, Math.PI * 2); g.fillStyle = 'rgba(0,0,0,.45)'; g.fill();
      const { name, p: pose } = poseAt(t);
      g.save(); g.translate(W / 2 - 16, 238);
      figure(g, style, classId, pose, 196);
      g.restore();
      g.font = '600 12px Fredoka, sans-serif'; g.fillStyle = 'rgba(255,255,255,.45)'; g.fillText(name, 10, 18);
    });
  }
}

// small, in-game sizes
{
  const c = $('small'), W = 1100, H = 230;
  c.width = W * DPR; c.height = H * DPR; c.style.aspectRatio = `${W}/${H}`;
  const g = c.getContext('2d');
  const order = [];
  for (const classId of ['warrior', 'mage']) for (const [style] of CARDS) order.push([style, classId]);
  draws.push((t) => {
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    backdrop(g, W, H, H);
    const { p: pose } = poseAt(t);
    order.forEach(([style, classId], i) => {
      for (const [y, px] of [[118, 92], [206, 50]]) {
        const x = 60 + i * 109;
        g.beginPath(); g.ellipse(x, y, px * 0.18, px * 0.04, 0, 0, Math.PI * 2); g.fillStyle = 'rgba(0,0,0,.45)'; g.fill();
        g.save(); g.translate(x, y); figure(g, style, classId, pose, px); g.restore();
      }
    });
  });
}

// the heroes as the game draws them now (drawDoll → style D), all gear tiers
{
  const c = $('ingame'), W = 1100, ROW = 170, CLS = ['warrior', 'archer', 'mage', 'assassin'], H = ROW * CLS.length;
  c.width = W * DPR; c.height = H * DPR; c.style.aspectRatio = `${W}/${H}`;
  const g = c.getContext('2d');
  const looks = [{ hair: 0, hairColor: 0 }];
  for (let tier = 0; tier <= 6; tier++) {
    const r = Math.min(5, Math.floor(tier * 5 / 6)), piece = { tier, rarity: r };
    looks.push({ hair: (tier + 1) % 5, hairColor: tier % 6, gear: { weapon: piece, helm: piece, armor: piece, boots: piece } });
  }
  draws.push((t) => {
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    backdrop(g, W, H, H);
    const { p: pose } = poseAt(t);
    const dp = { t: pose.t, moving: pose.moving || 0, walk: pose.walk || 0, attackPhase: pose.attack >= 0 ? pose.attack : undefined, slow: true };
    CLS.forEach((cls, row) => looks.forEach((look, i) => {
      const x = 70 + i * 130, y = ROW * (row + 1) - 16;
      g.beginPath(); g.ellipse(x, y, 22, 5, 0, 0, Math.PI * 2); g.fillStyle = 'rgba(0,0,0,.45)'; g.fill();
      g.save(); g.translate(x, y); g.scale(2.9, 2.9); drawDoll(g, cls, look, dp); g.restore();
    }));
  });
}

const t0 = performance.now();
let logged = false;
function frame(now) {
  const t = fixedT ?? Math.max(0, (now - t0) / 1000);
  for (const d of draws) {
    try { d(t); } catch (e) { if (!logged) { console.error(e); logged = true; } }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
