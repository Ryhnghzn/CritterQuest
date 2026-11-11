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
  g.intent = idle; g.packT = 1e9; g.god = true;
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
