// Contoh HUD (prototipe, tidak masuk game): tiga arah A Bola & Bingkai, B Potret Anime,
// C Minimal Sinematik, di atas latar diam dengan angka tiruan yang bergerak sendiri.
import { iconCanvas } from '../src/art/sprites.js';
import { drawHero } from '../src/art/hero/index.js';
import { CLASSES } from '../src/data/classes.js';

const $ = (id) => document.getElementById(id);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

const VARIANTS = {
  A: { name: 'A · Bola & Bingkai', note: 'Bola HP (kiri) dan bola Energi (kanan) mengapit bar skill berbingkai ukir di bawah tengah. Cincin di bola Energi = mekanik kelas. Garis emas di atas bar = EXP. Info wilayah di kiri atas, peta mini kanan atas.' },
  B: { name: 'B · Potret Anime', note: 'Potret wajah hero di kiri atas, cincin emas = EXP, bar HP/Energi/mekanik kelas miring di sampingnya. Skill berbentuk permata melengkung di sekitar tombol serang (ibu jari kanan). Info wilayah, kill & uang memudar saat bertarung.' },
  C: { name: 'C · Minimal Sinematik', note: 'Saat tenang hampir semua hilang. Saat bertarung muncul garis HP tipis, skill bulat transparan. HP kritis = tepi layar merah berdenyut. Wilayah & uang hanya muncul sebentar saat berubah.' },
};
const CLS = ['warrior', 'archer', 'mage', 'assassin'];
const POTS = ['red', 'big', 'shield', 'wind'];

let variant = new URLSearchParams(location.search).get('v') || 'A';
let cls = 'warrior';
let view = null; // { root, update(s, dt), hurt() }

// ---- tiruan keadaan game -------------------------------------------------
const S = {
  hp: 1, en: 70, trait: 0.3, ult: 0.4, xp: 0.62, lv: 27, gold: 1840, kills: 52,
  cd: [0, 0, 0, 0], cdMax: [3, 8, 6, 5], pots: [3, 1, 2, 4], fight: true, hurtT: 9, t: 0,
  region: 'Hutan Kabut', area: 'Lv 24–27',
};
let nextHit = 1, nextSkill = 0.8, nextKill = 1.5;

function sim(dt) {
  S.t += dt; S.hurtT += dt;
  for (let i = 0; i < 4; i++) S.cd[i] = Math.max(0, S.cd[i] - dt);
  if (!S.fight) {
    S.hp = Math.min(1, S.hp + dt * 0.15); S.en = Math.min(100, S.en + dt * 20);
    S.trait = Math.max(0, S.trait - dt * 0.2);
    return;
  }
  S.en = Math.min(100, S.en + dt * 9);
  S.ult = Math.min(1, S.ult + dt * 0.035);
  if ((nextHit -= dt) <= 0) { nextHit = 0.8 + Math.random() * 1.6; hurt(0.04 + Math.random() * 0.09); }
  if ((nextSkill -= dt) <= 0) {
    nextSkill = 0.7 + Math.random() * 1.2;
    const i = [0, 1, 2, 3].find((k) => S.cd[k] <= 0 && S.en >= 35);
    if (i != null) { S.cd[i] = S.cdMax[i]; S.en -= 35; S.trait = Math.min(1, S.trait + 0.18); }
  }
  if ((nextKill -= dt) <= 0) { nextKill = 1 + Math.random() * 2; S.kills++; S.gold += 3 + Math.floor(Math.random() * 12); S.xp = (S.xp + 0.03) % 1; view?.gold?.(); }
  if (S.ult >= 1 && Math.random() < dt * 0.3) S.ult = 0;
  S.trait = Math.max(0, S.trait - dt * 0.04);
  if (S.hp < 0.22 && Math.random() < dt * 0.25) { S.hp = Math.min(1, S.hp + 0.4); S.pots[0] = Math.max(0, S.pots[0] - 1); }
}
function hurt(d) { S.hp = Math.max(0.05, S.hp - d); S.hurtT = 0; view?.hurt?.(); }

// ---- potongan bersama ----------------------------------------------------
const skillIcons = () => {
  const c = CLASSES[cls];
  return { skills: c.skills.slice(0, 4).map((s) => s.icon || s.id), ult: c.ult.icon, color: c.trait.color, name: c.name };
};
function slot(cls_, icon, size, key) {
  const b = el('div', `slot ${cls_}`);
  b.append(el('span', 'ic'));
  if (icon) b.firstChild.append(iconCanvas(icon, size));
  b.append(el('i', 'cd'), el('b', 'cdt'));
  if (key) b.append(el('kbd', '', key));
  return b;
}
function setCd(b, left, max) {
  b.style.setProperty('--cd', max ? (left / max).toFixed(3) : 0);
  b.querySelector('.cdt').textContent = left > 0 ? Math.ceil(left) : '';
  b.classList.toggle('ready', left <= 0);
  if (left <= 0 && b._was > 0) { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); }
  b._was = left;
}
const pct = (v) => `${Math.round(v * 100)}%`;
const hpText = () => `${Math.ceil(S.hp * 1460)} / 1460`;

// portrait: draw the anime hero big and centre its head in a square canvas
function portrait(size) {
  const c = el('canvas'); const dpr = Math.min(devicePixelRatio || 1, 2);
  c.width = c.height = Math.round(size * dpr); c.style.width = c.style.height = `${size}px`;
  const g = c.getContext('2d'), k = 3.6 * dpr * size / 80;
  const probe = document.createElement('canvas').getContext('2d');
  const a = drawHero(probe, cls, { hairColor: 0, hair: 0 }, { anime: true, t: 0, view: 'front' });
  const hy = a ? a.head.y : -70, hx = a ? a.head.x : 0;
  g.translate(c.width / 2 - hx * k, c.height * 0.56 - hy * k); g.scale(k, k);
  drawHero(g, cls, { hairColor: 0, hair: 0 }, { anime: true, t: 0, view: 'front' });
  return c;
}

// ---- A: Bola & Bingkai -----------------------------------------------------
// A's ambient cosmetics: a slowly turning rune ring, bubbles in the orbs, embers off the frame
const RUNE = '<svg class="rune" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" class="r1" pathLength="120"/><circle cx="50" cy="50" r="45" class="r2" pathLength="100"/></svg>';
const BUBBLES = Array.from({ length: 6 }, (_, i) => `<i class="bub" style="left:${12 + i * 14}%;--d:${(i * 0.73) % 3}s;--s:${2.2 + (i % 3) * 0.6}s"></i>`).join('');
const EMBERS = Array.from({ length: 14 }, (_, i) => `<i style="left:${(i * 37) % 100}%;--d:${(i * 0.41) % 4}s;--s:${2.6 + (i % 4) * 0.5}s;--x:${(i % 2 ? 1 : -1) * (6 + (i % 5) * 4)}px"></i>`).join('');
const orbBox = (orb) => { const b = el('div', 'orbbox', RUNE); b.append(orb); return b; };

function buildA() {
  const I = skillIcons(), root = el('div', 'va');
  root.style.setProperty('--tc', I.color);
  const top = el('div', 'a-top', `<b class="rg">${S.region}</b><span>${S.area}</span><span class="gk"><i class="coin"></i><b class="g"></b> · ☠ <b class="k"></b></span>`);
  const mini = el('div', 'a-mini', '<b class="sweep"></b><i class="me"></i><i class="e" style="left:30%;top:40%"></i><i class="e" style="left:62%;top:58%"></i><i class="q" style="left:70%;top:24%"></i>');
  const orbHp = el('div', 'orb hp', `<i class="liq">${BUBBLES}</i>`+'<i class="gloss"></i><b class="num"></b>');
  const orbEn = el('div', 'orb en', `<svg class="tr" viewBox="0 0 100 100"><circle cx="50" cy="50" r="47" class="bg"/><circle cx="50" cy="50" r="47" class="fg" pathLength="100"/></svg><i class="liq">${BUBBLES}</i><i class="gloss"></i><b class="num"></b>`);
  const mid = el('div', 'a-mid');
  const xp = el('div', 'a-xp', '<i></i><b class="lv"></b>');
  const row = el('div', 'a-row');
  const sk = I.skills.map((ic, i) => slot('sq', ic, 30, String(i + 1)));
  const ult = slot('sq ult', I.ult, 34, '5');
  const dodge = slot('sq small', 'spd', 22, '␣');
  row.append(...sk, ult, dodge);
  const belt = el('div', 'a-belt');
  const pots = POTS.map((p, i) => { const b = slot('pot', `pot_${p}`, 20, 'ZXCV'[i]); b.append(el('b', 'n')); return b; });
  belt.append(...pots);
  mid.append(xp, row, belt);
  const dock = el('div', 'a-dock'); dock.append(orbBox(orbHp), mid, orbBox(orbEn), el('div', 'embers', EMBERS));
  // touch only (HP mode): attack button for the right thumb, joystick on the left
  // the skills also sit on an arc round the attack button; HP mode shows this arc instead of the centre row
  const fan = el('div', 'a-fan');
  const atk = el('div', 'slot atk', `${RUNE}<span class="ic"></span>`); atk.querySelector('.ic').append(iconCanvas('pow', 36));
  const skF = I.skills.map((ic, i) => { const b = slot('sq fsk', ic, 24); b.style.setProperty('--a', `${-90 - i * 35}deg`); return b; });
  const ultF = slot('sq ult fult', I.ult, 28), dodgeF = slot('sq fdodge', 'spd', 20);
  fan.append(atk, ...skF, ultF, dodgeF);
  sk.push(...skF);
  root.append(top, mini, dock, fan, el('div', 'joyghost a-joy'));
  return {
    root,
    update() {
      orbHp.style.setProperty('--f', S.hp); orbHp.querySelector('.num').textContent = Math.ceil(S.hp * 1460);
      orbHp.classList.toggle('low', S.hp < 0.3);
      orbEn.style.setProperty('--f', S.en / 100); orbEn.querySelector('.num').textContent = Math.floor(S.en);
      orbEn.style.setProperty('--t', S.trait);
      xp.querySelector('i').style.width = pct(S.xp); xp.querySelector('.lv').textContent = `LV ${S.lv}`;
      sk.forEach((b, i) => { setCd(b, S.cd[i % 4], S.cdMax[i % 4]); b.classList.toggle('noen', S.en < 35); });
      for (const u of [ult, ultF]) { u.style.setProperty('--u', S.ult); u.classList.toggle('full', S.ult >= 1); }
      setCd(dodge, 0, 0); setCd(dodgeF, 0, 0);
      pots.forEach((b, i) => { b.querySelector('.n').textContent = S.pots[i]; b.classList.toggle('empty', !S.pots[i]); });
      top.querySelector('.g').textContent = S.gold; top.querySelector('.k').textContent = S.kills;
      $('vig').classList.toggle('low', S.hp < 0.3);
    },
    hurt() {
      orbHp.classList.remove('shake'); void orbHp.offsetWidth; orbHp.classList.add('shake');
      $('vig').classList.remove('hit'); void $('vig').offsetWidth; $('vig').classList.add('hit');
    },
  };
}

// ---- B: Potret Anime ---------------------------------------------------------
function buildB() {
  const I = skillIcons(), root = el('div', 'vb');
  root.style.setProperty('--tc', I.color);
  const port = el('div', 'b-port');
  const face = el('div', 'b-face'); face.append(portrait(84));
  const ring = el('div', 'b-ring', `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="47" class="bg"/><circle cx="50" cy="50" r="47" class="fg" pathLength="100"/></svg><b class="lv"></b>`);
  ring.prepend(face);
  const side = el('div', 'b-side', `<div class="b-name">${I.name} <span>· Penguasa Murka</span></div>
    <div class="b-bar hp"><i class="lag"></i><i class="f"></i><b></b></div>
    <div class="b-bar en"><i class="f"></i><b></b></div>
    <div class="b-bar tr"><i class="f"></i></div>
    <div class="b-buffs"><span style="--c:#9fd0ff">Perisai 6s</span><span style="--c:#ffd27a">Angin 12s</span></div>`);
  port.append(ring, side);
  const meta = el('div', 'b-meta', `<div class="mini"><i class="me"></i><i class="e" style="left:30%;top:40%"></i><i class="e" style="left:62%;top:58%"></i><i class="q" style="left:70%;top:24%"></i></div>
    <div class="info"><b class="rg">${S.region}</b><span>${S.area}</span><span><i class="coin"></i><b class="g"></b></span><span>☠ <b class="k"></b></span></div>`);
  const fan = el('div', 'b-fan');
  const atk = el('div', 'slot atk', '<span class="ic"></span>'); atk.firstChild.append(iconCanvas('pow', 40));
  const sk = I.skills.map((ic, i) => { const b = slot('gem', ic, 26, String(i + 1)); b.style.setProperty('--a', `${-90 - i * 30}deg`); return b; });
  // order around the thumb: 4 skills on an arc from the top to the left of the attack button
  const ult = slot('gem ult', I.ult, 30, '5');
  const dodge = slot('gem dodge', 'spd', 22, '␣');
  fan.append(atk, ...sk, ult, dodge);
  const belt = el('div', 'b-belt');
  const pots = POTS.map((p, i) => { const b = slot('pot', `pot_${p}`, 20, 'ZXCV'[i]); b.append(el('b', 'n')); return b; });
  belt.append(...pots);
  root.append(port, meta, fan, belt, el('div', 'joyghost'));
  let lag = 1;
  return {
    root,
    update(dt) {
      lag = lag > S.hp ? Math.max(S.hp, lag - dt * 0.35) : S.hp;
      const hp = side.querySelector('.hp');
      hp.querySelector('.f').style.transform = `scaleX(${S.hp})`; hp.querySelector('.lag').style.transform = `scaleX(${lag})`;
      hp.querySelector('b').textContent = hpText(); hp.classList.toggle('low', S.hp < 0.3);
      const en = side.querySelector('.en'); en.querySelector('.f').style.transform = `scaleX(${S.en / 100})`; en.querySelector('b').textContent = Math.floor(S.en);
      side.querySelector('.tr .f').style.transform = `scaleX(${S.trait})`;
      ring.querySelector('.fg').style.strokeDasharray = `${S.xp * 100} 100`;
      ring.querySelector('.lv').textContent = S.lv;
      sk.forEach((b, i) => { setCd(b, S.cd[i], S.cdMax[i]); b.classList.toggle('noen', S.en < 35); });
      ult.style.setProperty('--u', S.ult); ult.classList.toggle('full', S.ult >= 1);
      setCd(dodge, 0, 0);
      pots.forEach((b, i) => { b.querySelector('.n').textContent = S.pots[i]; b.classList.toggle('empty', !S.pots[i]); });
      meta.classList.toggle('dim', S.fight);
      meta.querySelector('.g').textContent = S.gold; meta.querySelector('.k').textContent = S.kills;
    },
    hurt() { ring.classList.remove('flash'); void ring.offsetWidth; ring.classList.add('flash'); },
  };
}

// ---- C: Minimal Sinematik ---------------------------------------------------
function buildC() {
  const I = skillIcons(), root = el('div', 'vc');
  root.style.setProperty('--tc', I.color);
  const life = el('div', 'c-life', '<div class="hp"><i class="lag"></i><i class="f"></i></div><div class="en"><i class="f"></i></div><div class="tr"><i class="f"></i></div><b class="num"></b>');
  const toast = el('div', 'c-toast', `<b>${S.region}</b><span>${S.area}</span>`);
  const gold = el('div', 'c-gold', '<i class="coin"></i><b></b>');
  const ring = el('div', 'c-skills');
  const sk = I.skills.map((ic, i) => slot('dot', ic, 22, String(i + 1)));
  const ult = slot('dot ult', I.ult, 26, '5');
  const atk = el('div', 'slot dot atk', '<span class="ic"></span>'); atk.firstChild.append(iconCanvas('pow', 32));
  ring.append(atk, ...sk, ult);
  root.append(life, toast, gold, ring, el('div', 'joyghost'));
  let lag = 1, goldT = 9, wasFight = null, toastT = 0;
  return {
    root,
    update(dt) {
      lag = lag > S.hp ? Math.max(S.hp, lag - dt * 0.35) : S.hp;
      life.querySelector('.hp .f').style.transform = `scaleX(${S.hp})`;
      life.querySelector('.hp .lag').style.transform = `scaleX(${lag})`;
      life.querySelector('.en .f').style.transform = `scaleX(${S.en / 100})`;
      life.querySelector('.tr .f').style.transform = `scaleX(${S.trait})`;
      life.querySelector('.num').textContent = Math.ceil(S.hp * 1460);
      const show = S.fight || S.hp < 0.999;
      life.classList.toggle('show', show); life.classList.toggle('loud', S.hurtT < 1.2 || S.hp < 0.3);
      ring.classList.toggle('show', S.fight);
      sk.forEach((b, i) => setCd(b, S.cd[i], S.cdMax[i]));
      ult.style.setProperty('--u', S.ult); ult.classList.toggle('full', S.ult >= 1);
      if (wasFight !== S.fight) { wasFight = S.fight; toastT = 2.6; }
      toastT -= dt; toast.classList.toggle('show', toastT > 0);
      goldT += dt; gold.classList.toggle('show', goldT < 1.6); gold.querySelector('b').textContent = S.gold;
      $('vig').classList.toggle('low', S.hp < 0.3);
    },
    hurt() { $('vig').classList.remove('hit'); void $('vig').offsetWidth; $('vig').classList.add('hit'); },
    gold() { goldT = 0; },
  };
}

const BUILD = { A: buildA, B: buildB, C: buildC };

// ---- latar & kontrol ---------------------------------------------------------
const bg = new Image(); bg.src = './img/load_forest.webp';
const scene = $('scene'), sg = scene.getContext('2d');
function drawScene() {
  const r = scene.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
  const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
  if (scene.width !== w || scene.height !== h) { scene.width = w; scene.height = h; }
  sg.setTransform(1, 0, 0, 1, 0, 0);
  sg.fillStyle = '#0b0810'; sg.fillRect(0, 0, w, h);
  if (bg.complete && bg.naturalWidth) {
    const k = Math.max(w / bg.naturalWidth, h / bg.naturalHeight);
    sg.globalAlpha = 0.55; sg.drawImage(bg, (w - bg.naturalWidth * k) / 2, (h - bg.naturalHeight * k) / 2, bg.naturalWidth * k, bg.naturalHeight * k); sg.globalAlpha = 1;
  }
  const s = h / 230;
  sg.fillStyle = 'rgba(0,0,0,.35)'; sg.beginPath(); sg.ellipse(w / 2, h * 0.62, 26 * s, 8 * s, 0, 0, 7); sg.fill();
  sg.translate(w / 2, h * 0.62); sg.scale(s, s);
  drawHero(sg, cls, { hairColor: 0, hair: 0 }, { anime: true, t: S.t, moving: S.fight, walk: S.t * 6 });
}

function mount() {
  view = BUILD[variant]();
  $('hud').replaceChildren(view.root);
  $('note').textContent = VARIANTS[variant].note;
  $('vig').className = 'vig';
  for (const b of $('pick').children) b.classList.toggle('on', b.dataset.v === variant);
  for (const b of $('cls').children) b.classList.toggle('on', b.dataset.c === cls);
}
for (const [k, v] of Object.entries(VARIANTS)) {
  const b = el('button', 'btn', v.name); b.dataset.v = k;
  b.onclick = () => { variant = k; history.replaceState(null, '', `?v=${k}`); mount(); };
  $('pick').append(b);
}
for (const c of CLS) {
  const b = el('button', 'btn', CLASSES[c].name); b.dataset.c = c;
  b.onclick = () => { cls = c; mount(); };
  $('cls').append(b);
}
$('phone').onclick = () => { $('wrap').classList.toggle('phone'); $('phone').classList.toggle('on'); fit(); };
$('fight').onclick = () => { S.fight = !S.fight; $('fight').classList.toggle('on', S.fight); };
$('fight').classList.toggle('on', S.fight);
$('hit').onclick = () => hurt(0.25);

// phone mode: a 844×390 landscape screen (iPhone 13/14) scaled to fit
function fit() {
  const st = $('stage'), wr = $('wrap');
  if (!wr.classList.contains('phone')) { st.style.transform = ''; return; }
  const k = Math.min(1, (wr.clientWidth - 16) / 844, (wr.clientHeight - 16) / 390);
  st.style.transform = `scale(${k})`;
}
addEventListener('resize', fit);

let last = performance.now(), acc = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  sim(dt);
  acc += dt;
  if (acc > 1 / 30) { view.update(acc); drawScene(); acc = 0; }
  requestAnimationFrame(frame);
}
mount();
requestAnimationFrame(frame);
