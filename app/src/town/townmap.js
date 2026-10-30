// The town map (spec §30): every place and person worth finding, with the quests waiting there.
// Pure: the caller passes the quest marks (meta/quests.js npcMarks) and offers (talkOffers).
import { townDef, doorsOf } from '../data/towns.js';
import { SERVICES } from '../data/townmap.js';
import { strongerMark as stronger } from '../meta/quests.js';

// opts: { marks: { npcId: '!' | '?' | 'M!' | 'M?' } (meta/quests.js), offers: (npcId) => [{ title }], night }
// → { w, h, wall, places: [{ id, kind, x, y, w, h, name, sign, roof, door, people, mark }],
//     people: [{ id, role, name, title, x, y, mark, quests }] } — places hold who lives inside.
export function townMapInfo(townId, { marks = {}, offers = () => [], night = false } = {}) {
  const def = townDef(townId);
  const person = (n) => ({ id: n.id, role: n.role, name: n.name, title: n.title || null, mark: marks[n.id] || null, quests: offers(n.id).map((o) => o.title) });
  const doors = new Map(doorsOf(def).map((d) => [d.house, d.outside]));
  const places = def.buildings.map((b) => {
    const room = def.interiors[b.id];
    const people = room ? room.npcs.map(person) : [];
    return {
      id: b.id, kind: b.kind, x: b.x, y: b.y, w: b.w, h: b.h, name: b.name || null, sign: b.sign || null, roof: b.roof || null,
      door: doors.get(b.id) || null, people, mark: people.reduce((m, p) => stronger(m, p.mark), null),
    };
  });
  const people = def.npcs.filter((n) => !n.night || night).map((n) => ({ ...person(n), x: n.x, y: n.y }));
  return { w: def.w, h: def.h, wall: def.wall, places, people };
}

// Where the player is on the town map: outdoors where they stand, indoors at the house door.
export function playerSpot(info, town) {
  if (town.map === 'town') return { x: town.x, y: town.y, inside: null };
  const p = info.places.find((q) => q.id === town.map);
  return p?.door ? { x: p.door.x, y: p.door.y, inside: p } : { x: town.x, y: town.y, inside: null };
}

// The legend: quests first (who, what, where), then every service in town.
// → { quests: [{ mark, title, who, where, id }], shops: [{ role, icon, text, who, where, id }] } — id: the house, or the person outdoors
export function townLegend(info) {
  const quests = [], shops = [];
  const add = (p, where, id) => {
    for (const title of p.quests) quests.push({ mark: p.mark || '!', title, who: p.name, where, id });
    const s = SERVICES[p.role];
    if (s) shops.push({ role: p.role, icon: s.icon, text: s.text, who: p.name, where, id });
  };
  for (const pl of info.places) for (const p of pl.people) add(p, pl.name, pl.id);
  for (const p of info.people) add(p, null, p.id);
  quests.sort((a, b) => (a.mark === b.mark ? 0 : a.mark === '?' ? -1 : 1));
  return { quests, shops };
}
