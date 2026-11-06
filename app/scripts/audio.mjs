// Turns the originals in art-src/audio/ into the small files the game loads from
// public/audio/ (`npm run audio`, needs ffmpeg): music is levelled, jingles and sound effects
// are cut to length so they fit the pace of a fight. Files already built are skipped unless
// the original is newer.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, statSync, existsSync } from 'node:fs';
import { basename, extname, join } from 'node:path';

const SRC = '../art-src/audio', OUT = 'public/audio';
const JINGLE_LEN = { 'jingle-naik-level': 3, 'jingle-tamat': 5, 'jingle-kalah': 5 }; // seconds
const SFX_LEN = { 'sfx-hit-biasa': 0.4, 'sfx-hit-keras': 0.5, 'sfx-hit-kritis': 0.7, 'sfx-serang-sihir': 1, 'sfx-serang-pedang': 0.6 };
const SFX_DEFAULT_LEN = 0.7;
const LEVEL = 'loudnorm=I=-16:TP=-1.5:LRA=11';

const ffmpeg = (...args) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args]);

// peak of a clip in dB, after a filter
function peak(file, filter) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', file, '-af', `${filter},volumedetect`, '-f', 'null', '-'], { encoding: 'utf8' });
  return Number(/max_volume: (-?[\d.]+) dB/.exec(r.stderr)?.[1] ?? 0);
}

function build(file, name, out) {
  if (name.startsWith('musik-')) return ffmpeg('-i', file, '-af', LEVEL, '-ar', '44100', '-ac', '2', '-b:a', '96k', out);
  if (name.startsWith('jingle-')) {
    const len = JINGLE_LEN[name] ?? 5;
    return ffmpeg('-i', file, '-af', `atrim=0:${len},afade=out:st=${len - 0.5}:d=0.5,${LEVEL}`, '-ar', '44100', '-ac', '2', '-b:a', '96k', out);
  }
  const len = SFX_LEN[name] ?? SFX_DEFAULT_LEN;
  const cut = `silenceremove=start_periods=1:start_threshold=-40dB,atrim=0:${len},afade=out:st=${len - 0.08}:d=0.08`;
  return ffmpeg('-i', file, '-af', `${cut},volume=${-1 - peak(file, cut)}dB`, '-ar', '44100', '-ac', '1', '-b:a', '96k', out);
}

mkdirSync(OUT, { recursive: true });
for (const dir of ['musik', 'sfx']) {
  for (const f of readdirSync(join(SRC, dir))) {
    const file = join(SRC, dir, f), name = basename(f, extname(f)), out = join(OUT, `${name}.mp3`);
    if (existsSync(out) && statSync(out).mtimeMs > statSync(file).mtimeMs) continue;
    build(file, name, out);
    console.log(name, `${(statSync(out).size / 1024).toFixed(0)} KB`);
  }
}
