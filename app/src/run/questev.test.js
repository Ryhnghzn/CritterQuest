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
