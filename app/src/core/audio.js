// Sound through the Web Audio API: files from public/audio/ (data/audio.js, spec §34), with
// synthesized sounds for everything that has no file yet.
// The context is created lazily on the first user gesture (autoplay policy).
// Mute is persisted by the caller (save settings), not here.
import { MUSIC, MUSIC_FADE, SOUNDS, PITCH_JITTER } from '../data/audio.js';

let ctx = null, master = null, musicGain = null, musicTimer = null, muted = false;
let sfxGain = null, vol = { music: 0.8, sfx: 0.8 }; // Settings → Suara (spec §29): 0..1 each

export function isMuted() { return muted; }
export function setMuted(v) {
  muted = v;
  if (master) master.gain.value = v ? 0 : 0.5;
}
export function toggleMuted() { setMuted(!muted); return muted; }
// music & sound effects volume, 0..100 each
export function setVolumes(music, sfx) {
  vol = { music: music / 100, sfx: sfx / 100 };
  if (musicGain) { musicGain.gain.value = vol.music; sfxGain.gain.value = vol.sfx; }
}

export function ensureAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.5;
  master.connect(ctx.destination);
  musicGain = ctx.createGain(); musicGain.gain.value = vol.music; musicGain.connect(master);
  sfxGain = ctx.createGain(); sfxGain.gain.value = vol.sfx; sfxGain.connect(master);
  loadSounds();
  if (wanted) playMusic(wanted); // asked for before the first gesture (title screen)
}

// sound effects: decoded once, name → { buffers, last, voices }
const loaded = new Map();
function loadSounds() {
  for (const [name, def] of Object.entries(SOUNDS)) {
    Promise.all(def.files.map((f) => fetch(`audio/${f}.mp3`).then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b))))
      .then((buffers) => loaded.set(name, { buffers, last: -9, voices: 0 }))
      .catch(() => { /* no file: the synthesized sound stays */ });
  }
}

// Plays a file sound; false when it has none yet, so the caller falls back to its synth.
function play(name) {
  const s = loaded.get(name), def = SOUNDS[name];
  if (!s) return false;
  if (muted || ctx.currentTime - s.last < def.gap || s.voices >= def.max) return true; // a busy fight: skip it, no synth on top
  s.last = ctx.currentTime; s.voices++;
  const src = ctx.createBufferSource(), g = ctx.createGain();
  src.buffer = s.buffers[Math.floor(Math.random() * s.buffers.length)];
  if (!def.steady) src.playbackRate.value = 1 + (Math.random() * 2 - 1) * PITCH_JITTER;
  g.gain.value = def.vol;
  src.connect(g); g.connect(sfxGain);
  src.onended = () => { s.voices--; };
  src.start();
  return true;
}

function tone(freq, dur, type = 'square', vol = 0.15, slide = 0, delay = 0, bus = sfxGain) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + delay;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g); g.connect(bus);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

function noise(dur = 0.1, vol = 0.12, delay = 0) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + delay;
  const n = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = ctx.createBufferSource(); s.buffer = buf;
  const g = ctx.createGain(); g.gain.value = vol;
  s.connect(g); g.connect(sfxGain); s.start(t0);
}

export const sfx = {
  shoot() { tone(760, 0.07, 'square', 0.05, -320); },
  zap() { tone(1400, 0.09, 'sawtooth', 0.06, -900); },
  hit(kind = 'hit') { if (!play(kind)) noise(0.06, 0.07); }, // 'hit' | 'hitHard' | 'hitCrit'
  enemyDie() { tone(320, 0.12, 'triangle', 0.1, -240); noise(0.08, 0.06); },
  gem() { tone(880, 0.06, 'sine', 0.08, 220); },
  heart() { tone(520, 0.12, 'sine', 0.1, 260); },
  // basic attacks, by fx name (data/classes.js)
  attack(fx) {
    if (play(fx)) return;
    if (fx === 'slash') { noise(0.09, 0.07); tone(420, 0.08, 'triangle', 0.05, -200); }
    else if (fx === 'stab') { tone(900, 0.05, 'square', 0.035, -400); }
    else if (fx === 'arrow') { tone(1200, 0.06, 'triangle', 0.05, -700); }
    else if (fx === 'fireball') { tone(260, 0.16, 'sawtooth', 0.05, 180); noise(0.1, 0.04); }
  },
  skill(id) {
    if (id === 'spin') { noise(0.3, 0.08); tone(300, 0.3, 'sawtooth', 0.05, -120); }
    else if (id === 'shout') { tone(160, 0.35, 'square', 0.08, 60); tone(240, 0.3, 'square', 0.05, 0, 0.05); }
    else if (id === 'rain') { for (let i = 0; i < 4; i++) tone(1300 - i * 120, 0.05, 'triangle', 0.04, -500, i * 0.06); }
    else if (id === 'pierce') { tone(700, 0.25, 'sawtooth', 0.06, -500); }
    else if (id === 'nova') { tone(1800, 0.4, 'sine', 0.06, -1400); noise(0.25, 0.05); }
    else if (id === 'chain') { tone(1400, 0.12, 'sawtooth', 0.07, -900); tone(1000, 0.12, 'sawtooth', 0.05, -600, 0.08); }
    else if (id === 'shadow') { noise(0.15, 0.08); tone(200, 0.15, 'sine', 0.06, 600); }
    else if (id === 'fan') { for (let i = 0; i < 3; i++) tone(1100, 0.04, 'square', 0.03, -400, i * 0.03); }
  },
  dodge() { noise(0.12, 0.06); tone(300, 0.12, 'sine', 0.05, 500); },
  fail() { tone(330, 0.12, 'triangle', 0.1, -80); tone(247, 0.22, 'triangle', 0.1, -60, 0.1); }, // a forge roll that missed
  hurt() { tone(220, 0.2, 'sawtooth', 0.16, -140); noise(0.12, 0.1); },
  fanfare() { // a reward claimed: rising arpeggio, a held chord and a sparkle on top
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, 'triangle', 0.11, 0, i * 0.09));
    for (const f of [523, 659, 784]) tone(f, 0.6, 'square', 0.045, 0, 0.38);
    [1568, 2093, 2637].forEach((f, i) => tone(f, 0.08, 'sine', 0.05, 0, 0.42 + i * 0.07));
  },
  levelup() { if (!play('levelup')) this.chime(); },
  clear() { if (!play('clear')) this.chime(); }, // a floor cleared
  chime() { tone(523, 0.1, 'square', 0.1); tone(659, 0.1, 'square', 0.1, 0, 0.09); tone(784, 0.16, 'square', 0.1, 0, 0.18); },
  pickCard() { tone(660, 0.08, 'square', 0.09); tone(990, 0.12, 'square', 0.09, 0, 0.07); },
  boss() { tone(110, 0.7, 'sawtooth', 0.2, -40); tone(82, 0.9, 'sawtooth', 0.18, 0, 0.25); noise(0.5, 0.08, 0.1); },
  gameover() {
    if (play('gameover')) return;
    tone(392, 0.18, 'triangle', 0.14); tone(311, 0.18, 'triangle', 0.14, 0, 0.16); tone(233, 0.4, 'triangle', 0.14, -60, 0.32);
  },
};

// Music: two <audio> decks that stream the files (a decoded three-minute track would hold
// about 60 MB) and crossfade, between scenes and when a track nears its end.
let decks = null, live = 0, playing = null, wanted = null;

function makeDecks() {
  decks = [0, 1].map(() => {
    const d = { el: new Audio(), gain: ctx.createGain(), file: null };
    d.el.preload = 'auto';
    d.gain.gain.value = 0;
    ctx.createMediaElementSource(d.el).connect(d.gain);
    d.gain.connect(musicGain);
    d.el.addEventListener('timeupdate', () => {
      if (d === decks[live] && playing && d.el.duration - d.el.currentTime < MUSIC_FADE) crossfade(playing);
    });
    d.el.addEventListener('error', () => { if (d === decks[live] && playing) chiptune(); }); // no file: the old tune
    return d;
  });
}

function fade(d, to) {
  const t0 = ctx.currentTime;
  d.gain.gain.cancelScheduledValues(t0);
  d.gain.gain.setValueAtTime(d.gain.gain.value, t0);
  d.gain.gain.linearRampToValueAtTime(to, t0 + MUSIC_FADE);
  if (to === 0) setTimeout(() => { if (d !== decks[live] || !playing) d.el.pause(); }, MUSIC_FADE * 1000);
}

function crossfade(key) {
  stopChiptune();
  const from = decks[live], to = decks[1 - live], files = MUSIC[key];
  const pool = files.length > 1 ? files.filter((f) => f !== from.file) : files; // never the same region track twice in a row
  live = 1 - live; playing = key;
  to.file = pool[Math.floor(Math.random() * pool.length)];
  to.el.src = `audio/${to.file}.mp3`;
  to.el.play().catch(() => { /* interrupted by the next change */ });
  fade(to, 1);
  if (from.file) fade(from, 0);
}

// key: a name in data/audio.js MUSIC; safe to call every frame
export function playMusic(key) {
  wanted = key;
  if (!ctx || key === playing) return;
  if (!decks) makeDecks();
  crossfade(key);
}

export function stopMusic() {
  wanted = null; playing = null;
  stopChiptune();
  if (decks) fade(decks[live], 0);
}

// Tiny 8-step chiptune loop: bass on even steps, arpeggio on top. Only when a track fails to load.
const BPM = 112, STEP = 60 / BPM / 2;
const BASS = [110, 110, 130.8, 110, 98, 98, 146.8, 164.8];
const ARP = [440, 523, 659, 523, 440, 392, 523, 659];
let step = 0, nextT = 0;

function chiptune() {
  if (musicTimer) return;
  nextT = ctx.currentTime + 0.1;
  musicTimer = setInterval(() => {
    if (!ctx || muted) return;
    while (nextT < ctx.currentTime + 0.25) {
      tone(BASS[step], STEP * 0.9, 'triangle', 0.055, 0, nextT - ctx.currentTime, musicGain);
      if (step % 2 === 0) tone(ARP[(step / 2) | 0] * 2, STEP * 0.5, 'square', 0.02, 0, nextT - ctx.currentTime, musicGain);
      step = (step + 1) % 8;
      nextT += STEP;
    }
  }, 100);
}

function stopChiptune() {
  if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
}
