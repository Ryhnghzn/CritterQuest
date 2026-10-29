// All sound is synthesized with the Web Audio API — no audio files.
// The context is created lazily on the first user gesture (autoplay policy).
// Mute is persisted by the caller (save settings), not here.
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
  hit() { noise(0.06, 0.07); },
  enemyDie() { tone(320, 0.12, 'triangle', 0.1, -240); noise(0.08, 0.06); },
  gem() { tone(880, 0.06, 'sine', 0.08, 220); },
  heart() { tone(520, 0.12, 'sine', 0.1, 260); },
  // basic attacks, by fx name (data/classes.js)
  attack(fx) {
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
  hurt() { tone(220, 0.2, 'sawtooth', 0.16, -140); noise(0.12, 0.1); },
  fanfare() { // a reward claimed: rising arpeggio, a held chord and a sparkle on top
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, 'triangle', 0.11, 0, i * 0.09));
    for (const f of [523, 659, 784]) tone(f, 0.6, 'square', 0.045, 0, 0.38);
    [1568, 2093, 2637].forEach((f, i) => tone(f, 0.08, 'sine', 0.05, 0, 0.42 + i * 0.07));
  },
  levelup() { tone(523, 0.1, 'square', 0.1); tone(659, 0.1, 'square', 0.1, 0, 0.09); tone(784, 0.16, 'square', 0.1, 0, 0.18); },
  pickCard() { tone(660, 0.08, 'square', 0.09); tone(990, 0.12, 'square', 0.09, 0, 0.07); },
  boss() { tone(110, 0.7, 'sawtooth', 0.2, -40); tone(82, 0.9, 'sawtooth', 0.18, 0, 0.25); noise(0.5, 0.08, 0.1); },
  gameover() { tone(392, 0.18, 'triangle', 0.14); tone(311, 0.18, 'triangle', 0.14, 0, 0.16); tone(233, 0.4, 'triangle', 0.14, -60, 0.32); },
};

// Tiny 8-step chiptune loop: bass on even steps, arpeggio on top.
const BPM = 112, STEP = 60 / BPM / 2;
const BASS = [110, 110, 130.8, 110, 98, 98, 146.8, 164.8];
const ARP = [440, 523, 659, 523, 440, 392, 523, 659];
let step = 0, nextT = 0;

export function startMusic() {
  ensureAudio();
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

export function stopMusic() {
  if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
}
