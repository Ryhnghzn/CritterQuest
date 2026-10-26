// All sound is synthesized with the Web Audio API — no audio files.
// The context is created lazily on the first user gesture (autoplay policy).
// Mute is persisted by the caller (save settings), not here.
let ctx = null, master = null, musicGain = null, musicTimer = null, muted = false;

export function isMuted() { return muted; }
export function setMuted(v) {
  muted = v;
  if (master) master.gain.value = v ? 0 : 0.5;
}
export function toggleMuted() { setMuted(!muted); return muted; }

export function ensureAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.5;
  master.connect(ctx.destination);
}

function tone(freq, dur, type = 'square', vol = 0.15, slide = 0, delay = 0) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + delay;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g); g.connect(master);
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
  s.connect(g); g.connect(master); s.start(t0);
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
  dodge() { noise(0.12, 0.06); tone(300, 0.12, 'sine', 0.05, 500); },
  hurt() { tone(220, 0.2, 'sawtooth', 0.16, -140); noise(0.12, 0.1); },
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
      tone(BASS[step], STEP * 0.9, 'triangle', 0.055, 0, nextT - ctx.currentTime);
      if (step % 2 === 0) tone(ARP[(step / 2) | 0] * 2, STEP * 0.5, 'square', 0.02, 0, nextT - ctx.currentTime);
      step = (step + 1) % 8;
      nextT += STEP;
    }
  }, 100);
}

export function stopMusic() {
  if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
}
