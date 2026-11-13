import { describe, it, expect, vi } from 'vitest';
vi.mock('../core/audio.js', () => ({ sfx: new Proxy({}, { get: () => () => {} }) }));
import { Game, ST } from './run.js';
import { CLASSES, CLASS_BASE } from '../data/classes.js';
import { ESCORT, DEFEND, START_R } from '../data/questev.js';
import { setEvents, eventPoint } from './questev.js';
import { buildWorld } from './worldmap.js';
import { eventOf, questTalk, countQuests, activeQuests } from '../meta/quests.js';
import { questDef } from '../meta/quests.js';
import { createCharacter } from '../meta/character.js';

const idle = { move: { x: 0, y: 0 }, aimAt: null, dodge: false, attack: false, potion: -1 };
const game = () => {
  const g = new Game();
  g.explore({ classId: 'warrior', stats: { ...CLASS_BASE, ...CLASSES.warrior.stats }, at: 'rimba' });
  g.intent = idle; g.packT = 1e9; g.god = true; g.happenT = 1e9; // no happenings unless a test wants one
  return g;
};
const stepOf = (id) => questDef(id).steps.findIndex((s) => s.kind === 'event');
const evOf = (id) => eventOf(id, stepOf(id), questDef(id).steps[stepOf(id)]);
const run = (g, sec, each) => { for (let i = 0; i < sec * 60; i++) { each?.(); g.step(1 / 60); } };

describe('quest event: Kawal (§42)', () => {
  it('menunggu di awal, mulai saat didekati, berjalan di jalan sampai tujuan → berhasil', () => {
    const g = game(), d = evOf('e_peziarah');
    expect(d.route.length).toBeGreaterThan(20);
    for (const [x, y] of d.route) expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
    setEvents(g, [d]);
    const ev = g.events[0];
    run(g, 0.5);
    expect(ev.state).toBe('wait');
    g.px = d.start.x + START_R / 2; g.py = d.start.y;
    run(g, 0.1);
    expect(ev.state).toBe('run');
    expect(ev.npc.maxHp).toBeGreaterThan(ESCORT.hp.base);
    // the player walks along beside the walker; no enemy reaches it (packs cleared)
    run(g, 400, () => { g.px = ev.npc.x + 60; g.py = ev.npc.y; for (const e of g.enemies) e.hp = 0; });
    expect(ev.state).toBe('done');
    expect(g.eventsDone).toEqual([d.key]);
  });
  it('menunggu bila pemain tertinggal jauh', () => {
    const g = game(), d = evOf('e_peziarah');
    setEvents(g, [d]);
    const ev = g.events[0];
    g.px = d.start.x; g.py = d.start.y; run(g, 0.1);
    const x0 = ev.npc.x, y0 = ev.npc.y;
    g.px = d.start.x + ESCORT.wait + 300; run(g, 3, () => { g.enemies.length = 0; });
    expect(Math.hypot(ev.npc.x - x0, ev.npc.y - y0)).toBeLessThan(5);
  });
  it('tumbang → gagal tanpa hukuman: kembali menunggu di awal, musuh event hilang', () => {
    const g = game(), d = evOf('e_peziarah');
    setEvents(g, [d]);
    const ev = g.events[0];
    g.px = d.start.x; g.py = d.start.y; run(g, 0.1);
    run(g, 2, () => { g.packT = 1e9; });
    ev.npc.hp = 0.01;
    const e = g.spawnEnemy('slink'); e.ev = ev.key; e.target = ev.npc; e.x = ev.npc.x; e.y = ev.npc.y; e.dmg = 50;
    run(g, 0.2);
    expect(ev.state).toBe('wait');
    expect(g.enemies.filter((q) => q.ev === ev.key)).toHaveLength(0);
    expect([ev.npc.x, ev.npc.y]).toEqual([d.route[0][0], d.route[0][1]]);
    expect(g.eventsDone).toEqual([]);
  });
});

describe('quest event: Bertahan (§42)', () => {
  it('gelombang datang, musuh mengincar altar; bertahan sampai waktu habis → berhasil', () => {
    const g = game(), d = evOf('e_pos');
    setEvents(g, [d]);
    const ev = g.events[0];
    g.px = d.start.x; g.py = d.start.y; run(g, 0.1);
    expect(ev.state).toBe('run');
    run(g, 1);
    expect(g.enemies.some((e) => e.ev === ev.key && e.target === ev.altar)).toBe(true);
    run(g, DEFEND.time + 2, () => { g.px = d.start.x + 50; g.py = d.start.y; for (const e of g.enemies) e.hp = 0; });
    expect(ev.wave).toBe(DEFEND.waves.length);
    expect(ev.state).toBe('done');
    expect(eventPoint(ev)).toEqual(d.start);
  });
  it('altar hancur atau ditinggal → gagal, bisa diulang', () => {
    const g = game(), d = evOf('e_pos');
    setEvents(g, [d]);
    const ev = g.events[0];
    g.px = d.start.x; g.py = d.start.y; run(g, 0.1);
    ev.altar.hp = 0.01;
    const e = g.spawnEnemy('slink'); e.ev = ev.key; e.target = ev.altar; e.x = ev.altar.x + 10; e.y = ev.altar.y; e.dmg = 50;
    run(g, 0.2);
    expect(ev.state).toBe('wait');
    run(g, 4);
    g.px = d.start.x; g.py = d.start.y; run(g, 0.1);
    expect(ev.state).toBe('run');
    g.px = d.start.x + DEFEND.leave + 200; run(g, DEFEND.leaveT + 0.5, () => { g.enemies.length = 0; });
    expect(ev.state).toBe('wait');
  });
});

describe('langkah quest event (§42)', () => {
  it('event yang berhasil menyelesaikan langkahnya saat disimpan', () => {
    let c = createCharacter({ slot: 0, name: 'Rey', look: { hair: 0, hairColor: 0 }, classId: 'warrior' }, 1);
    c.towns.push('rimba'); c.location = 'rimba';
    const r = questTalk(c, 'e_pos', 'rimba', 'folk3', 2, () => 0.5);
    expect(r.ok).toBe(true);
    c = r.char;
    const a = activeQuests(c).find((q) => q.id === 'e_pos');
    expect(a.step.kind).toBe('event');
    countQuests(c, { events: [] });
    expect(c.quests.side.e_pos.step).toBe(1);
    countQuests(c, { events: [`e_pos:1`] });
    expect(c.quests.side.e_pos.step).toBe(2);
  });
  it('rute kawal tidak melewati benda padat dan berakhir sebelum gerbang kota', async () => {
    const { blocked } = await import('./worldmap.js');
    const w = buildWorld();
    for (const id of ['e_peziarah', 'e_patung']) {
      const d = evOf(id), end = d.route[d.route.length - 1], gate = w.towns[{ forest: 'rimba', ice: 'beku' }[d.region]];
      for (const [x, y] of d.route) expect(blocked(w, x, y, 12), id).toBe(false);
      expect(Math.hypot(end[0] - gate.x, end[1] - gate.y)).toBeGreaterThan(300);
    }
  });
});

describe('quest event: Buronan & Sarang (§42)', async () => {
  const { OUTLAW, NEST } = await import('../data/questev.js');
  it('buronan muncul saat didekati, kabur di 50%, tumbang → berhasil', () => {
    const g = game(), d = evOf('b_ekormerah');
    expect(Math.hypot(d.hint.x - d.start.x, d.hint.y - d.start.y)).toBeGreaterThan(100); // the map circle is off the spot
    setEvents(g, [d]);
    const ev = g.events[0];
    expect(eventPoint(ev).hint).toBe(OUTLAW.hint);
    g.px = d.start.x + OUTLAW.seen - 50; g.py = d.start.y; run(g, 0.1);
    expect(ev.state).toBe('run');
    const o = ev.foe;
    expect(o.type).toBe('scorpion');
    expect(o.mini && o.elite).toBe(true);
    o.hp = o.maxHp * 0.4;
    run(g, 0.1);
    expect(ev.fled).toBe(true);
    expect(o.target).toBeTruthy();
    run(g, 15, () => { g.px = o.x + 300; g.py = o.y; });
    expect(o.target).toBe(null);
    expect(Math.hypot(o.x - d.flee.x, o.y - d.flee.y)).toBeLessThan(100);
    o.hp = 0;
    run(g, 0.2);
    expect(ev.state).toBe('done');
    expect(g.eventsDone).toEqual([d.key]);
  });
  it('sarang mengirim musuh, diam di tempat; semua hancur → berhasil; ditinggal → ulang', () => {
    const g = game(), d = evOf('n_kawah');
    expect(d.spots).toHaveLength(5);
    setEvents(g, [d]);
    const ev = g.events[0];
    g.px = d.start.x; g.py = d.start.y; run(g, 0.1);
    expect(ev.state).toBe('run');
    expect(ev.nests).toHaveLength(5);
    run(g, NEST.every[1] + 1);
    expect(g.enemies.filter((e) => e.ev === ev.key && !e.nest).length).toBeGreaterThan(0);
    for (const n of ev.nests) expect([n.x, n.y]).toEqual([n.home.x, n.home.y]);
    for (const n of ev.nests) n.hp = 0;
    run(g, 0.2);
    expect(ev.state).toBe('done');
    const h = game();
    setEvents(h, [d]);
    const e2 = h.events[0];
    h.px = d.start.x; h.py = d.start.y; run(h, 0.1);
    h.px = d.start.x + NEST.leave + 300; run(h, NEST.leaveT + 0.5, () => { h.enemies = h.enemies.filter((e) => e.nest); });
    expect(e2.state).toBe('wait');
    expect(h.enemies.filter((e) => e.ev === e2.key)).toHaveLength(0);
  });
});

describe('quest event: Penyelamatan & Balapan (§42)', async () => {
  const { RESCUE, RACE } = await import('../data/questev.js');
  const { raceMedal } = await import('./questev.js');
  const { applyField } = await import('../meta/world.js');
  it('kamp: penjaga muncul, kandang terkunci sampai semua tumbang, lalu dibuka → berhasil', () => {
    const g = game(), d = evOf('r_kai');
    setEvents(g, [d]);
    const ev = g.events[0];
    g.px = d.start.x + RESCUE.near - 50; g.py = d.start.y; run(g, 0.1);
    expect(ev.state).toBe('run');
    expect(ev.guards).toHaveLength(RESCUE.guards);
    g.px = d.start.x; g.py = d.start.y; run(g, 0.2);
    expect(ev.state).toBe('run'); // still locked
    for (const e of ev.guards) e.hp = 0;
    run(g, 0.3);
    expect(ev.state).toBe('done');
    expect(g.eventsDone).toEqual([d.key]);
  });
  it('balapan: cincin di sepanjang jalan, medali dari waktu, rekor tersimpan; terlalu lambat → gagal', () => {
    const d = evOf('c_raka');
    expect(d.rings.length).toBeGreaterThan(4);
    expect(d.times.gold).toBeLessThan(d.times.silver);
    expect(d.times.silver).toBeLessThan(d.times.bronze);
    expect(raceMedal(d, d.times.gold - 1)).toBe('gold');
    expect(raceMedal(d, d.times.bronze + 1)).toBe(null);
    const g = game();
    setEvents(g, [d]);
    const ev = g.events[0];
    g.px = d.start.x; g.py = d.start.y; run(g, 0.1);
    expect(ev.state).toBe('run');
    const gold0 = g.gold;
    for (let i = 1; i < d.rings.length; i++) { g.px = d.rings[i][0]; g.py = d.rings[i][1]; run(g, 1 / 60); }
    expect(ev.state).toBe('done');
    expect(ev.medal).toBe('gold');
    expect(g.gold).toBeGreaterThan(gold0);
    const c = createCharacter({ slot: 0, name: 'Rey', look: { hair: 0, hairColor: 0 }, classId: 'warrior' }, 1);
    const r = applyField(c, { ...g.takeProgress(), region: 'forest', potions: c.potions }, 2);
    expect(r.char.quests.races.c_raka).toBeLessThan(d.times.gold);
    const h = game();
    setEvents(h, [d]);
    h.px = d.start.x; h.py = d.start.y; run(h, 0.1);
    run(h, d.times.bronze + 1, () => { h.enemies.length = 0; });
    expect(h.events[0].state).toBe('wait');
    expect(RACE.ringR).toBeGreaterThan(0);
  });
});

describe('Peristiwa dunia (§42)', async () => {
  const { HAPPEN } = await import('../data/questev.js');
  const { stepHappenings } = await import('./questev.js');
  const { zoneToWorld } = await import('./worldmap.js');
  const at = (g) => { const p = zoneToWorld('forest', 0.5, 0.5); g.px = p.x; g.py = p.y; };
  it('muncul sendiri di dekat pemain, hilang bila diabaikan, tidak ikut terhapus saat quest disegarkan', () => {
    const g = game(); at(g);
    g.happenT = 0; stepHappenings(g, 1 / 60);
    const ev = g.events.find((e) => e.world);
    expect(ev).toBeTruthy();
    const d = Math.hypot(ev.start.x - g.px, ev.start.y - g.py);
    expect(d).toBeGreaterThan(HAPPEN.dist[0] - 50);
    setEvents(g, []);
    expect(g.events).toContain(ev);
    stepHappenings(g, HAPPEN.expire + 1);
    expect(g.events.includes(ev)).toBe(false);
  });
  it('karavan sampai → koin; hujan meteor: kristal dipungut, selesai → koin & kristal', () => {
    const g = game(); at(g);
    let tries = 0;
    while (!g.events.some((e) => e.world && e.kind === 'escort') && tries++ < 60) { g.events = []; g.happenT = 0; stepHappenings(g, 1 / 60); }
    const car = g.events.find((e) => e.kind === 'escort');
    expect(car).toBeTruthy();
    g.px = car.start.x; g.py = car.start.y; run(g, 0.1);
    const gold0 = g.gold;
    run(g, 60, () => { g.px = car.npc.x + 50; g.py = car.npc.y; for (const e of g.enemies) e.hp = 0; g.happenT = 1e9; });
    expect(g.events.includes(car)).toBe(false);
    expect(g.gold).toBeGreaterThan(gold0);
    const h = game(); at(h);
    tries = 0;
    while (!h.events.some((e) => e.kind === 'meteor') && tries++ < 60) { h.events = []; h.happenT = 0; stepHappenings(h, 1 / 60); }
    const m = h.events.find((e) => e.kind === 'meteor');
    h.px = m.start.x; h.py = m.start.y; h.god = false; run(h, 0.1);
    expect(m.state).toBe('run');
    run(h, HAPPEN.meteor.time + HAPPEN.meteor.warn + 1, () => { h.invuln = 99; h.happenT = 1e9; if (m.crystals[0]) { h.px = m.crystals[0].x; h.py = m.crystals[0].y; } });
    run(h, HAPPEN.meteor.life + 1, () => { h.happenT = 1e9; });
    expect(m.got).toBeGreaterThan(5);
    expect(h.mats.crystal).toBe(m.got);
    expect(h.events.includes(m)).toBe(false);
  });
});

describe('Momen acak: peristiwa diam (rencana "Momen Acak")', async () => {
  const { HAPPEN } = await import('../data/questev.js');
  const { stepHappenings, kindWeights } = await import('./questev.js');
  const { zoneToWorld } = await import('./worldmap.js');
  const at = (g) => { const p = zoneToWorld('forest', 0.5, 0.5); g.px = p.x; g.py = p.y; };
  const force = (g, kind, phase = 'moon') => {
    g.phase = phase;
    for (let i = 0; i < 200 && !g.events.some((e) => e.kind === kind); i++) { g.events = []; g.enemies = []; g.happenCool = {}; g.happenT = 0; stepHappenings(g, 1 / 60); }
    return g.events.find((e) => e.kind === kind);
  };
  it('waktu menentukan jenis: siang tanpa Cahaya Aneh, malam tanpa Karavan, Raksasa lebih sering di malam hari', () => {
    const g = game();
    g.phase = 'sun'; const day = Object.fromEntries(kindWeights(g));
    g.phase = 'moon'; const night = Object.fromEntries(kindWeights(g));
    expect(day.wisp).toBeUndefined(); expect(day.caravan).toBeGreaterThan(0);
    expect(night.caravan).toBeUndefined(); expect(night.wisp).toBeGreaterThan(0);
    expect(night.giant).toBeCloseTo(day.giant * HAPPEN.kinds.giant.nightMul);
    g.happenCool = { giant: 10 };
    expect(Object.fromEntries(kindWeights(g)).giant).toBeUndefined();
  });
  it('Cahaya Aneh: diam (tanpa banner), terlihat saat dekat, kabur saat didekati, tertangkap → hadiah atau jebakan', () => {
    const g = game(); at(g);
    let banner = null; g.showBanner = (s) => { banner = s; };
    const w = force(g, 'wisp');
    g.events = [w]; banner = null; g.happenT = 1e9; stepHappenings(g, 1 / 60); // tries before may have shown other kinds
    expect(w).toBeTruthy(); expect(w.quiet).toBe(true); expect(banner).toBe(null); expect(w.seen).toBeFalsy();
    g.px = w.orb.x + HAPPEN.seen - 100; g.py = w.orb.y; run(g, 0.1, () => { g.happenT = 1e9; });
    expect(w.seen).toBe(true);
    g.px = w.orb.x + HAPPEN.wisp.near - 20; g.py = w.orb.y; run(g, 0.1, () => { g.happenT = 1e9; });
    expect(w.state).toBe('run');
    const x0 = w.orb.x; run(g, 0.5, () => { g.happenT = 1e9; });
    expect(Math.hypot(w.orb.x - g.px, w.orb.y - g.py)).toBeGreaterThan(HAPPEN.wisp.near - 20); // it drifts away
    expect(w.orb.x).not.toBe(x0);
    const gold0 = g.gold, foes0 = g.enemies.length;
    run(g, 0.2, () => { g.px = w.orb.x; g.py = w.orb.y; g.happenT = 1e9; });
    expect(g.events.includes(w)).toBe(false);
    expect(g.gold > gold0 || g.enemies.length > foes0).toBe(true);
  });
  it('Cahaya Aneh yang tidak terkejar lenyap sendiri', () => {
    const g = game(); at(g);
    const w = force(g, 'wisp');
    g.px = w.orb.x + HAPPEN.wisp.near - 20; g.py = w.orb.y; run(g, 0.1, () => { g.happenT = 1e9; });
    g.px -= 3000; run(g, HAPPEN.wisp.time + 1, () => { g.happenT = 1e9; });
    expect(g.events.includes(w)).toBe(false);
  });
  it('Raksasa Pengembara: berjalan sendiri, menyerang bila didekati, kalah → harta Penguasa; jeda sebelum muncul lagi', () => {
    const g = game(); at(g);
    const ev = force(g, 'giant');
    expect(ev).toBeTruthy();
    const foe = ev.foe;
    expect(foe.mini && foe.lord && foe.ev === ev.key).toBe(true);
    expect(g.happenCool.giant).toBe(HAPPEN.kinds.giant.cool);
    const x0 = foe.x, y0 = foe.y;
    run(g, 3, () => { g.happenT = 1e9; });
    expect(ev.state).toBe('wait');
    expect(Math.hypot(foe.x - x0, foe.y - y0)).toBeGreaterThan(10); // it wanders
    g.px = foe.x + HAPPEN.giant.engage - 50; g.py = foe.y; run(g, 0.1, () => { g.happenT = 1e9; });
    expect(ev.state).toBe('run');
    const gold0 = g.gold;
    foe.hp = 0; run(g, 0.2, () => { g.happenT = 1e9; });
    expect(g.events.includes(ev)).toBe(false);
    expect(g.gold).toBeGreaterThan(gold0);
    expect(g.eventsDone).toContain(ev.key);
  });
  it('Raksasa yang diabaikan pergi dan membawa dirinya (tidak ada musuh tertinggal)', () => {
    const g = game(); at(g);
    const ev = force(g, 'giant'), foe = ev.foe;
    g.px -= 1000; // stays out of reach
    run(g, HAPPEN.giant.life + 2, () => { g.happenT = 1e9; foe.target = null; foe.x = g.px + 2000; foe.y = g.py; foe.speed = 0; });
    expect(g.events.includes(ev)).toBe(false);
    expect(g.enemies.includes(foe)).toBe(false);
  });
  it('Pedagang Kelana: hanya malam; berdiri di dekatnya = membeli, pergi = menolak; koin kurang = tidak jadi', () => {
    const g = game(); at(g);
    g.phase = 'sun'; expect(Object.fromEntries(kindWeights(g)).peddler).toBeUndefined();
    const ev = force(g, 'peddler', 'moon');
    expect(ev && ev.quiet).toBe(true);
    const keep = () => { g.happenT = 1e9; };
    // walk up, then away before the hold is done: nothing bought
    g.px = ev.start.x + 50; g.py = ev.start.y; run(g, HAPPEN.peddler.hold * 0.5, keep);
    expect(ev.deal.price).toBeGreaterThan(0);
    g.px = ev.start.x + 600; run(g, 1, keep);
    expect(g.spent).toBe(0); expect(ev.sold).toBeFalsy();
    // too poor: he refuses
    g.wallet = 0; g.gold = 0;
    g.px = ev.start.x + 50; run(g, HAPPEN.peddler.hold + 0.2, keep);
    expect(g.spent).toBe(0); expect(ev.sold).toBeFalsy();
    // enough coins: stand there and it is bought, once
    g.wallet = ev.deal.price + 5;
    const gems0 = g.gemsFound.length, mats0 = { ...g.mats };
    run(g, HAPPEN.peddler.hold + 3.5, keep);
    expect(ev.sold).toBe(true); expect(g.spent).toBe(ev.deal.price);
    expect(g.gemsFound.length > gems0 || g.mats.crystal > mats0.crystal).toBe(true);
    expect(g.eventsDone).toContain(ev.key);
    run(g, HAPPEN.peddler.hold * 2, keep);
    expect(g.spent).toBe(ev.deal.price); // only one sale
    run(g, HAPPEN.peddler.after + 1, keep);
    expect(g.events.includes(ev)).toBe(false); // packs up and goes
  });
  it('koin yang dibelanjakan dipotong dari save, tugas koin tetap menghitung yang didapat', async () => {
    const { applyField } = await import('../meta/world.js');
    const g = game();
    g.gold = 40; g.spent = 100;
    const part = g.takeProgress();
    expect(part.spent).toBe(100); expect(g.spent).toBe(0);
    const char = { ...createCharacter({ slot: 0, name: 'Rey', look: { hair: 0, hairColor: 0 }, classId: 'warrior' }, 1), gold: 500 };
    const r = applyField(char, { ...part, region: 'forest' }, 0, () => 0.5);
    expect(r.char.gold).toBe(440);
  });
  it('Kabut Sunyi: kabut menebal lalu hilang sendiri, tanpa tanda di peta', () => {
    const g = game(); at(g);
    const ev = force(g, 'mist', 'dawn');
    expect(ev).toBeTruthy();
    const keep = () => { g.happenT = 1e9; };
    run(g, 20, keep);
    expect(g.mist).toBeGreaterThan(0.9);
    expect(ev.seen).toBeFalsy();
    run(g, HAPPEN.mist.time, keep);
    expect(g.events.includes(ev)).toBe(false);
    run(g, 30, keep);
    expect(g.mist).toBe(0);
  });
});
