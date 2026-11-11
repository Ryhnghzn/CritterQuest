import { describe, it, expect } from 'vitest';
import { Game, ST } from './run.js';
import { CLASSES, CLASS_BASE } from '../data/classes.js';
import { ENEMIES } from '../data/enemies.js';

const DT = 1 / 60;
function start() {
  const g = new Game();
  g.start({ classId: 'warrior', stats: { ...CLASS_BASE, ...CLASSES.warrior.stats, maxHp: 1000 } });
  g.spawnT = 1e9; g.queueI = g.queue.length; g.wave = 99; // no waves: only the enemies a test places
  return g;
}
const step = (g, n = 1, intent = {}) => {
  for (let i = 0; i < n; i++) {
    g.intent = { move: { x: 0, y: 0 }, aimAt: null, dodge: false, attack: false, potion: -1, ...intent };
    g.step(DT);
  }
};
const place = (g, type, x, y) => { const e = g.spawnEnemy(type); e.x = x; e.y = y; e.actT = 0; return e; };
const secs = (s) => Math.round(s * 60);

describe('penembak', () => {
  it('berhenti sebentar lalu menembak; proyektil melukai pemain', () => {
    const g = start();
    place(g, 'spitter', 180, 0);
    step(g, secs(ENEMIES.spitter.windup) + 2);
    expect(g.shots.length).toBe(1);
    const hp = g.stats.hp;
    step(g, secs(1.5));
    expect(g.stats.hp).toBeLessThan(hp);
    expect(g.shots.length).toBe(0);
  });

  it('dodge (kebal) menghindari proyektil', () => {
    const g = start();
    g.shots.push({ x: 30, y: 0, vx: -200, vy: 0, r: 5, dmg: 10, life: 5 });
    g.dodgeInv = 1;
    const hp = g.stats.hp;
    step(g, secs(0.4));
    expect(g.stats.hp).toBe(hp);
  });

  it('menjaga jarak: mundur bila pemain terlalu dekat', () => {
    const g = start();
    const e = place(g, 'spitter', 60, 0);
    e.actT = 99;
    step(g, secs(0.5));
    expect(e.x).toBeGreaterThan(60);
  });
});

describe('penyerbu', () => {
  it('peringatan garis, lalu menyeruduk cepat lurus', () => {
    const g = start();
    const e = place(g, 'charger', 200, 0);
    step(g);
    expect(e.mode).toBe('wind');
    expect(g.hazards.some((h) => h.kind === 'line')).toBe(true);
    const x0 = e.x;
    step(g, secs(ENEMIES.charger.windup));
    expect(e.x).toBeCloseTo(x0, 0);
    step(g, secs(0.2));
    expect(x0 - e.x).toBeGreaterThan(40);
  });
});

describe('pemanggil & penyembuh', () => {
  it('pemanggil memunculkan anak buah, maksimal 6', () => {
    const g = start();
    const e = place(g, 'summoner', 230, 0);
    for (let k = 0; k < 4; k++) { e.actT = 0; e.mode = 'walk'; step(g, secs(1)); }
    const mine = g.enemies.filter((o) => o.owner === e).length;
    expect(mine).toBe(6);
  });

  it('penyembuh memulihkan musuh di sekitarnya', () => {
    const g = start();
    place(g, 'healer', 200, 0);
    const t = place(g, 'tank', 230, 30);
    t.speed = 0; t.hp = 10;
    step(g, secs(ENEMIES.healer.windup) + 2);
    expect(t.hp).toBeGreaterThan(10);
  });
});

describe('peledak', () => {
  it('dekat pemain → lingkaran bahaya → meledak melukai pemain di dalamnya', () => {
    const g = start();
    const e = place(g, 'bomber', 35, 0);
    step(g);
    expect(e.mode).toBe('fuse');
    const hp = g.stats.hp;
    step(g, secs(ENEMIES.bomber.fuse) + 2);
    expect(g.stats.hp).toBeLessThan(hp);
    expect(g.enemies.includes(e)).toBe(false);
  });

  it('keluar dari lingkaran = aman', () => {
    const g = start();
    place(g, 'bomber', 35, 0);
    step(g);
    g.px = -200;
    const hp = g.stats.hp;
    step(g, secs(1));
    expect(g.stats.hp).toBe(hp);
  });

  it('dibunuh dari jauh tetap meledak di tempatnya', () => {
    const g = start();
    const e = place(g, 'bomber', 300, 0);
    e.hp = 0;
    step(g);
    expect(g.hazards.some((h) => h.kind === 'circle' && h.dmg > 0)).toBe(true);
  });
});

describe('berperisai', () => {
  const hitFrom = (g, e, fx) => { const hp = e.hp; g.stats.crit = 0; g.damageEnemy({ mult: 1, fx }, e); return hp - e.hp; };
  it('serangan dasar dari depan −85%, dari belakang penuh, skill menembus', () => {
    const g = start();
    const e = place(g, 'shielder', 100, 0);
    e.face = Math.PI; // menghadap pemain (di kiri)
    expect(hitFrom(g, e, 'slash')).toBeCloseTo(14 * 0.15);
    expect(hitFrom(g, e, 'spin')).toBeCloseTo(14);
    e.face = 0; // membelakangi pemain
    expect(hitFrom(g, e, 'slash')).toBeCloseTo(14);
  });

  it('berbalik pelan ke arah pemain', () => {
    const g = start();
    const e = place(g, 'shielder', 100, 0);
    e.face = 0;
    step(g, secs(0.5));
    expect(Math.abs(e.face)).toBeGreaterThan(0.5);
    expect(Math.abs(e.face)).toBeLessThan(Math.PI - 0.5);
  });
});

describe('Raja Maw', () => {
  const boss = () => { const g = start(); const b = place(g, 'boss', 200, 0); b.speed = 0; return { g, b }; };
  const run = (id) => {
    const { g, b } = boss();
    b.actT = 99;
    b.pat = { id, t: 0, n: 0, fireT: 0, a0: 0 };
    return { g, b };
  };

  it('cincin: gelombang proyektil ke segala arah', () => {
    const { g } = run('ring');
    step(g);
    expect(g.shots.length).toBe(ENEMIES.boss.ring.count);
  });

  it('spiral: proyektil terus keluar selama beberapa detik', () => {
    const { g } = run('spiral');
    step(g, secs(1));
    expect(g.shots.length).toBeGreaterThan(15);
  });

  it('hentakan: lingkaran bahaya mengikuti posisi pemain', () => {
    const { g } = run('slam');
    step(g);
    g.px = 100; step(g, secs(0.5));
    const zones = g.hazards.filter((h) => h.kind === 'circle');
    expect(zones.length).toBe(2);
    expect(zones[1].x).toBeCloseTo(100);
  });

  it('marah di bawah 50% HP: pola lebih rapat', () => {
    const { g, b } = run('ring');
    b.hp = b.maxHp * 0.3; b.phase = 1; // already in phase 2 ("LAPAR!", spec §41.2): no phase change this step
    step(g);
    expect(g.shots.length).toBe(ENEMIES.boss.ring.count + 6);
  });

  it('memilih pola sendiri secara berkala', () => {
    const { g, b } = boss();
    b.actT = 0;
    step(g, secs(6));
    expect(g.shots.length + g.hazards.length + g.enemies.length - 1).toBeGreaterThan(0);
  });

  it('deterministik', () => {
    const play = () => { const { g, b } = boss(); b.actT = 0; g.god = true; step(g, secs(15)); return [g.shots.length, g.hazards.length, g.enemies.length, Math.round(g.stats.hp)]; };
    expect(play()).toEqual(play());
  });
});

describe('Hantu Gerhana (spec §26.7)', () => {
  it('menghilang (tak bisa dipukul), muncul di dekat pemain, lalu menembak cincin', () => {
    const g = start();
    const b = ENEMIES.wraith;
    const e = place(g, 'wraith', 400, 0);
    step(g, 2);
    expect(e.mode).toBe('fade');
    expect(e.hidden).toBe(true);
    step(g, secs(b.fade) + 1);
    expect(e.mode).toBe('appear');
    expect(e.hidden).toBe(false);
    const d = Math.hypot(e.x - g.px, e.y - g.py);
    expect(d).toBeGreaterThan(b.near[0] - 30);
    expect(d).toBeLessThan(b.near[1] + 30);
    step(g, secs(b.appear) + 1);
    expect(g.shots.length).toBe(b.ring.count);
    expect(e.mode).toBe('walk');
  });
});

describe('Sang Gerhana (spec §26.7)', () => {
  it('berganti fase saat HP turun: gelap di fase 2 & 3, pola sesuai fase', () => {
    const g = start();
    const e = place(g, 'eclipseboss', 300, 0);
    step(g, 2);
    expect(e.phase || 0).toBe(0);
    expect(g.dark).toBe(false);
    e.hp = e.maxHp * 0.6;
    step(g, 2);
    expect(e.phase).toBe(1);
    expect(g.dark).toBe(true);
    e.hp = e.maxHp * 0.3;
    step(g, 2);
    expect(e.phase).toBe(2);
  });

  it('sinar melukai pemain yang berdiri di jalurnya saat meledak', () => {
    const g = start();
    g.hazards.push({ kind: 'line', x: g.px - 200, y: g.py, x2: g.px + 200, y2: g.py, w: 34, t: 0.05, max: 0.5, dmg: 50 });
    const hp = g.stats.hp;
    step(g, 6);
    expect(g.stats.hp).toBeLessThan(hp);
  });

  it('lubang hitam menarik pemain lalu meledak', () => {
    const g = start();
    const x0 = g.px;
    g.hazards.push({ kind: 'hole', x: g.px + 150, y: g.py, r: 110, t: 1, max: 1, dmg: 40, pull: 120 });
    step(g, 30);
    expect(g.px).toBeGreaterThan(x0 + 20);
  });
});

describe('Katak Rawa (spec §41.1)', () => {
  it('menandai lingkaran di posisi pemain, melompat ke sana, lalu mendarat melukai', () => {
    const g = start();
    const e = place(g, 'marshfrog', 200, 0);
    step(g);
    expect(e.mode).toBe('air');
    const mark = g.hazards.find((h) => h.kind === 'circle' && h.by === 'marshfrog');
    expect(mark).toBeTruthy();
    expect(Math.hypot(mark.x - g.px, mark.y - g.py)).toBeLessThan(1);
    const hp = g.stats.hp;
    step(g, secs(ENEMIES.marshfrog.windup) + 2);
    expect(Math.hypot(e.x - mark.x, e.y - mark.y)).toBeLessThan(12);
    expect(g.stats.hp).toBeLessThan(hp);
  });

  it('pemain yang pindah keluar lingkaran aman', () => {
    const g = start();
    place(g, 'marshfrog', 200, 0);
    step(g);
    const hp = g.stats.hp;
    g.px = -200;
    step(g, secs(ENEMIES.marshfrog.windup) + 2);
    expect(g.stats.hp).toBe(hp);
  });
});

describe('Semak Penyergap (spec §41.1)', () => {
  it('diam menyamar (tak bisa dipukul) sampai pemain mendekat, lalu menerjang', () => {
    const g = start();
    const e = place(g, 'bushling', 300, 0);
    step(g, 30);
    expect(e.hidden).toBe(true);
    expect(e.x).toBe(300);
    const hp = e.hp;
    g.damageEnemy({ mult: 5, fx: 'slash' }, e);
    expect(e.hp).toBe(hp);
    g.px = 300 - ENEMIES.bushling.trigger + 10;
    step(g);
    expect(e.hidden).toBe(false);
    expect(e.mode).toBe('pounce');
    const x0 = e.x;
    step(g, 6);
    expect(e.x).toBeLessThan(x0 - 20);
  });

  it('bersembunyi lagi bila pemain lama menjauh', () => {
    const g = start();
    const e = place(g, 'bushling', 60, 0);
    step(g, secs(1));
    expect(e.hidden).toBe(false);
    g.px = -2000;
    step(g, secs(ENEMIES.bushling.rehide + 0.5));
    expect(e.hidden).toBe(true);
  });
});

describe('Roh Embun (spec §41.1)', () => {
  it('meninggalkan genangan es yang memperlambat pemain di dalamnya', () => {
    const g = start();
    place(g, 'mistwisp', 300, 0);
    step(g, secs(2));
    const zones = g.hazards.filter((h) => h.kind === 'puddle');
    expect(zones.length).toBeGreaterThan(2);
    const z = zones[0];
    g.px = z.x; g.py = z.y;
    g.slowT = 0;
    step(g, 2);
    expect(g.slowT).toBeGreaterThan(0);
    expect(g.slowK).toBeCloseTo(ENEMIES.mistwisp.puddle.slow[0]);
  });

  it('genangan hilang setelah umurnya habis', () => {
    const g = start();
    const e = place(g, 'mistwisp', 300, 0);
    step(g, secs(1));
    e.hp = 0; e.speed = 0;
    step(g, secs(ENEMIES.mistwisp.puddle.life + 0.2));
    expect(g.hazards.filter((h) => h.kind === 'puddle').length).toBe(0);
  });
});

describe('Penjaga Cermin (spec §41.1)', () => {
  const arrow = (g, x, vx) => ({ kind: 'proj', x, y: 0, vx, vy: 0, angle: vx > 0 ? 0 : Math.PI, speed: Math.abs(vx), range: 900, dist: 0, r: 4, mult: 1, pierce: 0, hitSet: new Set(), fx: 'arrow', trailT: 0 });

  it('berkilat lalu mengangkat cermin; panah dari depan dipantulkan ke pemain', () => {
    const g = start();
    const e = place(g, 'mirrorguard', 200, 0);
    step(g);
    expect(e.mode).toBe('flash');
    step(g, secs(ENEMIES.mirrorguard.windup) + 1);
    expect(e.mode).toBe('hold');
    const hp = e.hp;
    g.hits.push(arrow(g, 150, 400));
    step(g, 10);
    expect(e.hp).toBe(hp);
    expect(g.shots.some((s) => s.by === 'mirrorguard' && s.vx < 0)).toBe(true);
  });

  it('panah dari belakang tetap melukai, juga saat cermin turun', () => {
    const g = start();
    const e = place(g, 'mirrorguard', 200, 0);
    step(g, secs(ENEMIES.mirrorguard.windup) + 2);
    const hp = e.hp;
    g.hits.push(arrow(g, 260, -400));
    step(g, 10);
    expect(e.hp).toBeLessThan(hp);
    e.mode = 'walk'; e.actT = 99;
    const hp2 = e.hp;
    g.hits.push(arrow(g, 150, 400));
    step(g, 10);
    expect(e.hp).toBeLessThan(hp2);
  });
});

describe('Hyena Pasir (spec §41.1)', () => {
  it('mengepung di jarak ring, lalu melolong bersamaan (garis) dan menyerbu', () => {
    const g = start();
    const b = ENEMIES.hyena;
    const pack = [0, 1, 2, 3].map((i) => { const e = place(g, 'hyena', Math.cos(i * 1.6) * 400, Math.sin(i * 1.6) * 400); e.actT = 99; return e; });
    step(g, secs(2.5));
    for (const e of pack) expect(Math.abs(Math.hypot(e.x - g.px, e.y - g.py) - b.ring)).toBeLessThan(40);
    pack[0].actT = 0;
    step(g);
    for (const e of pack) expect(e.mode).toBe('wind');
    expect(g.hazards.filter((h) => h.kind === 'line' && h.by === 'hyena').length).toBe(4);
    step(g, secs(b.windup) + 3);
    for (const e of pack) expect(e.mode).toBe('dash');
  });
});

describe('Kumbang Pembelah (spec §41.1)', () => {
  it('mati → 2 kumbang kecil; kumbang kecil mati → 2 tungau; tungau tidak membelah', () => {
    const g = start();
    const e = place(g, 'splitbeetle', 300, 0);
    e.hp = 0;
    step(g);
    const small = g.enemies.filter((o) => o.type === 'beetlet');
    expect(small.length).toBe(2);
    for (const o of small) o.hp = 0;
    step(g);
    const mites = g.enemies.filter((o) => o.type === 'mite');
    expect(mites.length).toBe(4);
    for (const o of mites) o.hp = 0;
    step(g);
    expect(g.enemies.length).toBe(0);
  });
});

describe('Meriam Magma (spec §41.1)', () => {
  it('menjaga jarak jauh dan menembak lambung: lingkaran di posisi pemain yang meledak', () => {
    const g = start();
    const b = ENEMIES.mortar;
    const e = place(g, 'mortar', 150, 0);
    e.actT = 99;
    step(g, secs(1.5));
    expect(e.x).toBeGreaterThan(200);
    e.actT = 0;
    step(g, secs(b.windup) + 2);
    const shell = g.hazards.find((h) => h.by === 'mortar');
    expect(shell).toBeTruthy();
    expect(Math.hypot(shell.x - g.px, shell.y - g.py)).toBeLessThan(5);
    const hp = g.stats.hp;
    step(g, secs(b.lob.fuse) + 2);
    expect(g.stats.hp).toBeLessThan(hp);
  });
});

describe('Totem Bara (spec §41.1)', () => {
  it('musuh di dekatnya lebih cepat & berperisai; perisai menyerap damage; hilang saat totem mati', () => {
    const g = start();
    const b = ENEMIES.embertotem;
    const t = place(g, 'embertotem', 500, 0);
    const o = place(g, 'tank', 560, 0);
    const sp = o.speed;
    step(g, 2);
    expect(t.x).toBe(500);
    expect(o.speed).toBeCloseTo(sp * (1 + b.haste));
    expect(o.ward).toBeCloseTo(o.maxHp * b.ward);
    const hp = o.hp;
    g.damageEnemy({ mult: 0.5, fx: 'slash', crit: false }, o);
    expect(o.hp).toBe(hp);
    expect(o.ward).toBeLessThan(o.maxHp * b.ward);
    t.hp = 0;
    step(g, secs(0.5));
    expect(o.speed).toBeCloseTo(sp);
    expect(o.ward || 0).toBe(0);
  });

  it('obelisk: sinar berputar melukai pemain yang tersentuh', () => {
    const g = start();
    const b = ENEMIES.voidobelisk;
    const ob = place(g, 'voidobelisk', 150, 0);
    ob.beamA = Math.PI; // pointing at the player
    const hp = g.stats.hp;
    step(g, 2);
    expect(g.stats.hp).toBeLessThan(hp);
    const g2 = start();
    const ob2 = place(g2, 'voidobelisk', 150, 0);
    ob2.beamA = Math.PI / 2;
    const hp2 = g2.stats.hp;
    step(g2, 2);
    expect(g2.stats.hp).toBe(hp2);
    expect(b.beam.len).toBeGreaterThan(150);
  });
});

describe('Kembar Hampa (spec §41.1)', () => {
  it('berpasangan; sinar penghubung melukai pemain di antaranya', () => {
    const g = start();
    const a = place(g, 'voidtwin', 0, -120), c = place(g, 'voidtwin', 0, 120);
    a.speed = 0; c.speed = 0;
    const hp = g.stats.hp;
    step(g, 3);
    expect(a.partner).toBe(c);
    expect(g.stats.hp).toBeLessThan(hp);
  });

  it('yang tumbang bangkit lagi setelah beberapa detik, kecuali kembarannya ikut tumbang', () => {
    const g = start();
    const b = ENEMIES.voidtwin;
    const a = place(g, 'voidtwin', 400, -100), c = place(g, 'voidtwin', 400, 100);
    step(g);
    a.hp = 0;
    step(g);
    expect(g.enemies).toContain(a);
    expect(a.down).toBe(true);
    step(g, secs(b.revive) + 2);
    expect(a.down).toBe(false);
    expect(a.hp).toBeCloseTo(a.maxHp * b.reviveHp);
    a.hp = 0; step(g);
    c.hp = 0; step(g, 2);
    expect(g.enemies.includes(a) || g.enemies.includes(c)).toBe(false);
  });
});

describe('kekuatan serangan musuh §41.1 ikut foePower (spec §43 G)', () => {
  it('peluru meriam dikali foePower sekali; pantulan cermin seperti damage sentuhnya', async () => {
    const { foePower } = await import('./run.js');
    const g = start();
    const m = place(g, 'mortar', 300, 0);
    step(g, secs(ENEMIES.mortar.windup) + 2);
    const shell = g.hazards.find((h) => h.by === 'mortar');
    expect(shell.dmg).toBeCloseTo(ENEMIES.mortar.lob.dmg * foePower(g, m));
    const mg = place(g, 'mirrorguard', 200, 0);
    step(g, secs(ENEMIES.mirrorguard.windup) + 2);
    g.hits.push({ kind: 'proj', x: 150, y: 0, vx: 400, vy: 0, angle: 0, speed: 400, range: 900, dist: 0, r: 4, mult: 1, pierce: 0, hitSet: new Set(), fx: 'arrow', trailT: 0 });
    step(g, 10);
    const back = g.shots.find((s) => s.by === 'mirrorguard');
    expect(back.dmg).toBeCloseTo(ENEMIES.mirrorguard.reflect.dmg * (mg.dmg / ENEMIES.mirrorguard.dmg));
    expect(back.dmg).toBeGreaterThan(ENEMIES.mirrorguard.reflect.dmg * 2);
  });
});
