// Bootstrap: wires the game, renderer, input, audio and the DOM screens
// together and runs the fixed-timestep loop.
import { Game, ST } from './run/run.js';
import { Renderer } from './render/world.js';
import { CRITTERS } from './data/classes.js';
import { SPRITES, bakeAll } from './art/sprites.js';
import { input, pollMove, input as inp } from './core/input.js';
import { ensureAudio, startMusic, stopMusic, toggleMuted, isMuted, sfx } from './core/audio.js';
import { STEP, startLoop } from './core/loop.js';

const $ = (id) => document.getElementById(id);
const canvas = $('game');
bakeAll();
const game = new Game();
const R = new Renderer(canvas);

let selected = 0;
let paused = false;
let simT = 0;

// ——— build the critter select cards ———
const critRow = $('critters');
CRITTERS.forEach((c, i) => {
  const card = document.createElement('div');
  card.className = 'card' + (i === 0 ? ' sel' : '');
  const cv = document.createElement('canvas');
  cv.width = 64; cv.height = 64;
  const g = cv.getContext('2d');
  const img = SPRITES[c.sprite];
  g.imageSmoothingEnabled = false;
  g.drawImage(img, (64 - img.width * 4) / 2, (64 - img.height * 4) / 2, img.width * 4, img.height * 4);
  card.appendChild(cv);
  const nm = document.createElement('div'); nm.className = 'nm'; nm.textContent = c.name;
  const ds = document.createElement('div'); ds.className = 'ds'; ds.textContent = c.desc;
  card.appendChild(nm); card.appendChild(ds);
  card.addEventListener('click', () => {
    selected = i;
    critRow.querySelectorAll('.card').forEach((el, j) => el.classList.toggle('sel', j === i));
    ensureAudio(); sfx.pickCard();
  });
  critRow.appendChild(card);
});

function fmtTime(t) { t = Math.floor(t); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; }

function show(id) {
  for (const s of ['title', 'levelup', 'pause', 'gameover']) $(s).classList.toggle('hidden', s !== id);
  const inGame = id === null;
  $('hud').classList.toggle('hidden', inGame || game.state === ST.TITLE);
  $('weapons').classList.toggle('hidden', id !== null && id !== 'levelup' ? true : inGame);
  $('mute').classList.toggle('hidden', game.state === ST.TITLE && id === 'title');
}
function hideAll() {
  for (const s of ['title', 'levelup', 'pause', 'gameover']) $(s).classList.add('hidden');
  $('hud').classList.remove('hidden');
  $('weapons').classList.remove('hidden');
  $('mute').classList.remove('hidden');
}

function startRun() {
  ensureAudio(); startMusic();
  game.start(CRITTERS[selected]);
  hideAll();
  refreshWeaponBar();
}

function toTitle() {
  game.state = ST.TITLE;
  stopMusic();
  show('title');
  $('mute').classList.remove('hidden');
  updateBestLabel();
}

function updateBestLabel() {
  $('best').textContent = fmtTime(game.best.time);
}

// ——— level-up screen ———
function showLevelUp() {
  const box = $('choices');
  box.innerHTML = '';
  game.choices.forEach((c, i) => {
    const d = game.describeChoice(c);
    const card = document.createElement('div');
    card.className = 'card';
    card.style.width = '190px';
    if (d.icon && SPRITES[d.icon]) {
      const cv = document.createElement('canvas');
      cv.width = 48; cv.height = 48;
      const g = cv.getContext('2d');
      g.imageSmoothingEnabled = false;
      const img = SPRITES[d.icon];
      g.drawImage(img, (48 - img.width * 3) / 2, (48 - img.height * 3) / 2, img.width * 3, img.height * 3);
      card.appendChild(cv);
    }
    const tag = document.createElement('div'); tag.className = 'ds'; tag.style.color = '#ffd54a';
    tag.textContent = `#${i + 1} ${c.label || ''}`;
    const nm = document.createElement('div'); nm.className = 'nm'; nm.textContent = d.name;
    const ds = document.createElement('div'); ds.className = 'ds'; ds.textContent = d.desc;
    card.append(tag, nm, ds);
    card.addEventListener('click', () => pickChoice(i));
    box.appendChild(card);
  });
  show('levelup');
}

function pickChoice(i) {
  if (game.state !== ST.LEVELUP || !game.choices[i]) return;
  game.applyChoice(game.choices[i]);
  refreshWeaponBar();
  if (game.state === ST.PLAY) hideAll();
  else showLevelUp();
}

function refreshWeaponBar() {
  const bar = $('weapons');
  bar.innerHTML = '';
  for (const w of game.weapons) {
    const def = { ember: 'iconEmber', bubble: 'iconBubble', gale: 'iconGale', zap: 'iconZap', thorn: 'iconThorn' }[w.id];
    const slot = document.createElement('div');
    slot.className = 'slot';
    const cv = document.createElement('canvas');
    cv.width = 34; cv.height = 34;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    const img = SPRITES[def];
    g.drawImage(img, (34 - img.width * 2) / 2, (34 - img.height * 2) / 2, img.width * 2, img.height * 2);
    slot.appendChild(cv);
    const lv = document.createElement('em'); lv.textContent = 'Lv' + w.level;
    slot.appendChild(lv);
    bar.appendChild(slot);
  }
}

// ——— buttons ———
$('start').addEventListener('click', startRun);
$('resume').addEventListener('click', () => { game.state = ST.PLAY; hideAll(); });
$('restart1').addEventListener('click', startRun);
$('quit1').addEventListener('click', toTitle);
$('restart2').addEventListener('click', startRun);
$('quit2').addEventListener('click', toTitle);
$('mute').addEventListener('click', () => {
  ensureAudio();
  $('mute').textContent = toggleMuted() ? 'SUARA OFF' : 'SUARA ON';
});

// ——— keyboard shortcuts ———
inp.onAction.push((code) => {
  if (code === 'KeyM') { $('mute').click(); return; }
  if (game.state === ST.TITLE && (code === 'Space' || code === 'Enter')) { startRun(); return; }
  if (game.state === ST.PLAY && code === 'Escape') {
    game.state = ST.PAUSE; show('pause'); return;
  }
  if (game.state === ST.PAUSE && code === 'Escape') { game.state = ST.PLAY; hideAll(); return; }
  if (game.state === ST.OVER && code === 'Space') { startRun(); return; }
  if (game.state === ST.LEVELUP && code.startsWith('Digit')) {
    pickChoice(Number(code.slice(5)) - 1);
  }
});

// ——— HUD (DOM, updated ~10x/s is plenty) ———
let hudT = 0;
function updateHUD() {
  const s = game.stats;
  $('hpfill').style.transform = `scaleX(${Math.max(0, s.hp / s.maxHp)})`;
  $('hptext').textContent = `HP ${Math.ceil(Math.max(0, s.hp))}/${s.maxHp}`;
  $('xpfill').style.transform = `scaleX(${Math.min(1, game.xp / game.xpNeed)})`;
  $('lvltext').textContent = `LV ${game.level}`;
  $('time').textContent = fmtTime(game.time);
  $('kills').textContent = game.kills;
  $('best').textContent = fmtTime(Math.max(game.best.time, game.time));
  $('dmg').style.opacity = game.flash > 0 ? 0.9 : 0;
  const b = $('banner');
  if (game.bannerT > 0 && game.banner) { b.textContent = game.banner; b.style.opacity = 1; }
  else b.style.opacity = 0;
}

function gameOverScreen() {
  const isRecord = game.time >= game.best.time && game.time > 0;
  $('finalstats').innerHTML =
    `Bertahan <b>${fmtTime(game.time)}</b><br>` +
    `Kill <b>${game.kills}</b> · Level <b>${game.level}</b><br>` +
    (isRecord ? `<span style="color:#ffd54a">REKOR BARU!</span>` : `Rekor: <b>${fmtTime(game.best.time)}</b>`);
  show('gameover');
}

// ——— main loop ———
function tick() {
  simT += STEP;
  pollMove();
  game.moveVec = { x: input.x, y: input.y };
  const wasPlaying = game.state === ST.PLAY;
  game.step(STEP);
  // react only on the PLAY -> LEVELUP/OVER transition; rebuilding the cards
  // every frame swaps the DOM between mousedown and mouseup and kills clicks
  if (!wasPlaying) return false;
  if (game.state === ST.LEVELUP) { showLevelUp(); refreshWeaponBar(); return true; }
  if (game.state === ST.OVER) { gameOverScreen(); refreshWeaponBar(); return true; }
  return false;
}

function frame(dt) {
  R.draw(game, simT);
  hudT += dt;
  if (hudT > 0.12 && game.state !== ST.TITLE) { hudT = 0; updateHUD(); }
  window.__SCENE_READY__ = true;
}

toTitle();
const loop = startLoop(tick, frame);

// ——— screenshot / debug hooks ———
window.__seek = (t) => {
  const v = Number(t) || 0;
  if (game.state === ST.TITLE) { game.start(CRITTERS[selected]); hideAll(); }
  game.moveVec = { x: 0.6, y: 0.35 };
  const n = Math.floor(v / STEP);
  for (let i = 0; i < n && game.state === ST.PLAY; i++) {
    simT += STEP;
    game.step(STEP);
    if (game.state === ST.LEVELUP) game.applyChoice(game.choices[0]);
  }
  R.draw(game, simT);
};
window.__play = () => { loop.resetClock(); };
const T_PARAM = new URLSearchParams(location.search).get('t');
if (T_PARAM !== null) window.__seek(T_PARAM);
window.__game = game;
window.__input = input; // debug/test hook: lets scripts drive the joystick
