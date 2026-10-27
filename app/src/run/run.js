// Core simulation. Fixed-timestep only; zero allocation in the hot loop
// (entities live in reused objects and are swap-removed when they die).
import { rand, rrange, rint, resetRng } from '../core/rng.js';
import { XP_BASE, XP_GROWTH, STAT_UPS } from '../data/balance.js';
import { POTION } from '../data/dungeon.js';
import { CLASSES, CLASS_BASE } from '../data/classes.js';
import { ENEMIES } from '../data/enemies.js';
import { sfx } from '../core/audio.js';
import { stepPlayer } from './player.js';
import { stepAttack, stepSkills, skillCooldown } from './skills.js';
import { stepHits } from './hits.js';
import { startFloor, stepDungeon, enemyGoal, confineEnemy, dropCoins, hpMul } from './dungeon.js';

export const ST = { TITLE: 0, PLAY: 1, LEVELUP: 2, PAUSE: 3, OVER: 4 };

// What a run starts from: class, final stats (meta/character.js finalStats),
// and the HP / potions the character carries in (spec §13.3). A run is one dungeon
// trip: floor after floor (run/dungeon.js) until a gold portal, death or giving up.
const DEFAULT_START = { classId: 'warrior', stats: { ...CLASS_BASE, ...CLASSES.warrior.stats } };
const IDLE = { move: { x: 0, y: 0 }, aimAt: null, dodge: false, attack: false, auto: false, skill1: false, skill2: false, potion: false };

export class Game {
  constructor() {
    this.enemies = [];
    this.hits = [];       // live attack instances (run/hits.js)
    this.gems = [];
    this.particles = [];
    this.floaters = [];
    this.state = ST.TITLE;
    this.shake = 0;
    this.reset(DEFAULT_START);
    const run = this;
    this.hitCtx = {
      get px() { return run.px; }, get py() { return run.py; },
      onHit: (h, e) => this.damageEnemy(h, e),
      add: (h) => this.hits.push(h),
    };
  }

  // Rewards earned so far; meta/character.js applyTrip turns them into save data (spec §13.4).
  result() {
    return {
      time: this.time, kills: this.kills, exp: this.expGained, gold: this.gold, items: [],
      bossKills: this.bossKills, floor: this.deepest, cleared: this.cleared,
    };
  }

  // Pause → Menyerah: ends the trip; the caller treats it like dying (spec §13.4).
  surrender() {
    this.state = ST.OVER;
  }

  reset({ classId, stats, hp = stats.maxHp, potions = 0 }) {
    resetRng();
    this.classId = classId;
    this.enemies.length = 0; this.hits.length = 0;
    this.gems.length = 0;
    this.particles.length = 0; this.floaters.length = 0;
    this.px = 0; this.py = 0;
    this.intent = IDLE;
    this.moveX = 0; this.moveY = 0;
    this.aimX = 1; this.aimY = 0;
    this.atkCd = 0; this.attackT = 0;
    this.aimPX = 0; this.aimPY = 0;
    this.skillCd = [0, 0];
    this.skillCdMax = CLASSES[classId].skills.map((sk) => skillCooldown(stats, sk));
    this.buffT = 0; this.dmgTakenMul = 1;
    this.dashSpeed = 0;
    this.dodgeT = 0; this.dodgeCd = 0; this.dodgeInv = 0; this.dodgeX = 0; this.dodgeY = 0;
    this.time = 0; this.kills = 0; this.level = 1;
    this.expGained = 0; this.bossKills = 0; this.gold = 0;
    this.xp = 0; this.xpNeed = XP_BASE + XP_GROWTH;
    // dungeon progress (run/dungeon.js)
    this.floor = 0; this.deepest = 0; this.cleared = false; this.returned = false;
    this.wave = 0; this.queue = []; this.queueI = 0; this.spawnT = 0; this.waveGap = 0;
    this.floorT = 0; this.floorClear = false; this.clearT = 0;
    this.portals = []; this.exit = null;
    this.pendingLevels = 0; this.choices = null;
    // run stats: the character's final stats, then multiplied by level-up blessings
    this.stats = { ...stats, hp, dmgMul: 1 };
    this.potions = potions; this.potionCd = 0;
    this.upCounts = {}; // stat id -> times taken
    this.invuln = 0; this.flash = 0; this.shake = 0;
    this.banner = null; this.bannerT = 0;
    this.deathT = 0;
  }

  start(setup) {
    this.reset(setup);
    startFloor(this, 1);
    this.state = ST.PLAY;
  }

  showBanner(text) { this.banner = text; this.bannerT = 2.4; }

  // ——————————————— fixed step ———————————————
  step(dt) {
    if (this.state !== ST.PLAY) return;
    this.time += dt;
    stepPlayer(this, this.intent, dt);

    if (this.invuln > 0) this.invuln -= dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.shake > 0) this.shake -= dt * 3;
    if (this.bannerT > 0) this.bannerT -= dt;

    stepAttack(this, this.intent, dt);
    stepSkills(this, this.intent, dt);
    this.stepPotion(dt);
    stepHits(this.hits, this.enemies, dt, this.hitCtx);
    stepDungeon(this, dt);
    this.updateEnemies(dt);
    if (this.state !== ST.PLAY) return; // died this step: no gem pickup / level-up after death
    this.updateGems(dt);
    this.updateParticles(dt);
    this.updateFloaters(dt);
    if (this.exit) this.takeExit();

    // level-up gate (not after going home: the trip is over)
    if (this.state === ST.PLAY && this.pendingLevels > 0) {
      this.choices = this.rollChoices();
      this.state = ST.LEVELUP;
      sfx.levelup();
    }
  }

  // Blue portal: next floor (blessings, EXP and HP carry over). Gold: go home.
  // Anything still on the ground is picked up on the way out.
  takeExit() {
    const kind = this.exit;
    this.exit = null;
    for (const g of this.gems) this.pickup(g);
    this.gems.length = 0;
    sfx.levelup();
    if (kind === 'down') startFloor(this, this.floor + 1);
    else { this.returned = true; this.state = ST.OVER; return; }
    if (this.pendingLevels > 0) { this.choices = this.rollChoices(); this.state = ST.LEVELUP; }
  }

  // ——————————————— spawning ———————————————
  // Placed at the player; run/dungeon.js spawnFromLane moves it into a lane.
  spawnEnemy(typeId) {
    const base = ENEMIES[typeId];
    const hp = base.hp * hpMul(Math.max(1, this.floor));
    const e = {
      type: typeId, x: this.px, y: this.py,
      hp, maxHp: hp,
      speed: base.speed * rrange(0.9, 1.1), dmg: base.dmg,
      r: base.r, xp: base.xp, sprite: base.sprite, score: base.score,
      wob: rand() * 6.28, flash: 0, frozen: 0, kx: 0, ky: 0,
      lane: null, entering: false,
    };
    this.enemies.push(e);
    if (typeId === 'boss') sfx.boss();
    return e;
  }

  // Drink: heal a fraction of max HP, short lockout between drinks.
  stepPotion(dt) {
    if (this.potionCd > 0) this.potionCd -= dt;
    if (!this.intent.potion || this.potionCd > 0 || this.potions <= 0) return;
    const s = this.stats;
    if (s.hp >= s.maxHp) return;
    s.hp = Math.min(s.maxHp, s.hp + s.maxHp * POTION.heal);
    this.potions -= 1;
    this.potionCd = POTION.cooldown;
    this.addFloater(this.px, this.py - 30, `+${Math.round(s.maxHp * POTION.heal)}`, '#ff8aa3');
    sfx.heart();
  }

  // ——————————————— combat ———————————————
  // Damage rules (spec §5.2): atk × skill multiplier × (crit ? critDmg : 1), × level-up power.
  damageEnemy(h, e) {
    const s = this.stats;
    const crit = rand() * 100 < s.crit;
    const dmg = s.atk * h.mult * s.dmgMul * (crit ? s.critDmg : 1);
    e.hp -= dmg;
    e.flash = 0.12;
    if (h.freeze) e.frozen = Math.max(e.frozen, h.freeze);
    this.floaters.push({ x: e.x + rrange(-4, 4), y: e.y - e.r, text: String(Math.round(dmg)), color: crit ? '#ffd166' : '#ffffff', life: 0.7, big: crit });
    sfx.hit();
  }

  nearestEnemy(maxDist = 1e9) {
    let best = null, bd = maxDist * maxDist;
    for (const e of this.enemies) {
      const d = (e.x - this.px) ** 2 + (e.y - this.py) ** 2;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  updateEnemies(dt) {
    const E = this.enemies;
    for (let i = E.length - 1; i >= 0; i--) {
      const e = E[i];
      if (e.hp <= 0) {
        this.killEnemy(e);
        E[i] = E[E.length - 1]; E.pop();
        continue;
      }
      if (e.flash > 0) e.flash -= dt;
      if (e.frozen > 0) { e.frozen -= dt; continue; } // frozen: no movement, no touch damage
      e.wob += dt * 5;
      const goal = enemyGoal(this, e);
      const a = Math.atan2(goal.y - e.y, goal.x - e.x);
      const zig = e.type === 'dart' ? Math.sin(e.wob) * 0.7 : 0;
      e.x += (Math.cos(a + zig) * e.speed + e.kx) * dt;
      e.y += (Math.sin(a + zig) * e.speed + e.ky) * dt;
      e.kx *= 0.86; e.ky *= 0.86;
      confineEnemy(e);
      // touch damage
      const rr = e.r + 10;
      if (this.invuln <= 0 && this.dodgeInv <= 0 && (e.x - this.px) ** 2 + (e.y - this.py) ** 2 < rr * rr) {
        const dmg = Math.max(1, e.dmg - this.stats.def) * this.dmgTakenMul;
        this.stats.hp -= dmg;
        this.invuln = 0.7; this.flash = 0.25; this.shake = 0.6;
        sfx.hurt();
        this.spawnBurst(this.px, this.py, '#ff5a6e', 8);
        e.kx = -Math.cos(a) * 220; e.ky = -Math.sin(a) * 220;
        if (this.stats.hp <= 0) { this.die(); return; }
      }
    }
  }

  killEnemy(e) {
    this.kills += 1;
    sfx.enemyDie();
    this.spawnBurst(e.x, e.y, e.type === 'boss' ? '#c26bd8' : '#7a45c2', e.type === 'boss' ? 26 : 8);
    dropCoins(this, e);
    if (e.type === 'boss') {
      this.bossKills += 1;
      this.showBanner('RAJA MAW TUMBANG!');
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        this.gems.push({ x: e.x + Math.cos(a) * 30, y: e.y + Math.sin(a) * 30, v: 5, mag: false, big: true, t: rand() * 6 });
      }
      this.shake = 1;
      return;
    }
    // xp gem
    this.gems.push({ x: e.x, y: e.y, v: e.xp, mag: false, big: e.xp >= 5, t: rand() * 6 });
    // rare heart drop
    if (rand() < 0.018) this.gems.push({ x: e.x, y: e.y, v: 0, mag: false, big: false, heart: true, t: 0 });
  }

  updateGems(dt) {
    const G = this.gems;
    for (let i = G.length - 1; i >= 0; i--) {
      const g = G[i];
      g.t += dt * 4;
      const dx = this.px - g.x, dy = this.py - g.y;
      const d2 = dx * dx + dy * dy;
      if (!g.mag && d2 < this.stats.magnet * this.stats.magnet) g.mag = true;
      if (g.mag) {
        const d = Math.sqrt(d2) || 1;
        const sp = 260 + (this.stats.magnet / Math.max(d, 1)) * 120;
        g.x += (dx / d) * sp * dt;
        g.y += (dy / d) * sp * dt;
      }
      if (d2 < 14 * 14) {
        this.pickup(g);
        G[i] = G[G.length - 1]; G.pop();
      }
    }
  }

  pickup(g) {
    if (g.heart) {
      this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + 20);
      this.addFloater(g.x, g.y, '+20', '#ff5a6e');
      sfx.heart();
    } else if (g.coin) {
      this.gold += g.v;
      this.addFloater(g.x, g.y, `+${g.v}`, '#ffd166');
      sfx.gem();
    } else {
      this.xp += g.v;
      this.expGained += g.v;
      this.addFloater(g.x, g.y, `+${g.v}`, '#8fffc0');
      sfx.gem();
      while (this.xp >= this.xpNeed) {
        this.xp -= this.xpNeed;
        this.level++;
        this.xpNeed = XP_BASE + XP_GROWTH * this.level;
        this.pendingLevels++;
      }
    }
  }

  // ——————————————— level up ———————————————
  rollChoices() {
    // run blessings only; the class decides the attack (spec §5.5)
    const cands = [];
    for (const s of STAT_UPS) {
      if ((this.upCounts[s.id] || 0) < s.max) cands.push({ kind: 'stat', id: s.id });
    }
    // shuffle
    for (let i = cands.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [cands[i], cands[j]] = [cands[j], cands[i]];
    }
    const out = cands.slice(0, 3);
    while (out.length < 3) out.push({ kind: 'heal', id: 'heal' });
    return out;
  }

  describeChoice(c) {
    if (c.kind === 'heal') return { name: 'Camilan Darurat', desc: 'Pulih 30 HP sekarang', icon: 'heart' };
    if (c.kind === 'stat') {
      const s = STAT_UPS.find((x) => x.id === c.id);
      return { name: s.name, desc: s.desc(), icon: s.id };
    }
    return null;
  }

  applyChoice(c) {
    if (c.kind === 'heal') this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + 30);
    else if (c.kind === 'stat') {
      this.upCounts[c.id] = (this.upCounts[c.id] || 0) + 1;
      const s = this.stats;
      if (c.id === 'spd') s.moveSpd *= 1.12;
      if (c.id === 'vit') { s.maxHp += 25; s.hp = Math.min(s.maxHp, s.hp + 25); }
      if (c.id === 'pow') s.dmgMul *= 1.15;
      if (c.id === 'hst') s.atkSpd *= 1.12;
      if (c.id === 'mag') s.magnet += 35;
      if (c.id === 'arm') s.def += 2;
    }
    this.pendingLevels--;
    if (this.pendingLevels > 0) this.choices = this.rollChoices();
    else { this.choices = null; this.state = ST.PLAY; }
    sfx.pickCard();
  }

  die() {
    this.stats.hp = 0;
    this.state = ST.OVER;
    sfx.gameover();
    this.spawnBurst(this.px, this.py, '#ff5a6e', 30);
  }

  // ——————————————— fx ———————————————
  spawnBurst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2, sp = rrange(30, 140);
      this.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: rrange(0.25, 0.6), maxLife: 0.6, color, size: rint(2, 4), line: false,
      });
    }
  }

  spawnLightning(x1, y1, x2, y2) {
    this.particles.push({ x: x1, y: y1, x2, y2, vx: 0, vy: 0, life: 0.32, maxLife: 0.32, color: '#ffe95a', size: 2, line: true });
  }

  updateParticles(dt) {
    const P = this.particles;
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      p.life -= dt;
      if (p.life <= 0) { P[i] = P[P.length - 1]; P.pop(); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 0.92; p.vy *= 0.92;
    }
  }

  addFloater(x, y, text, color) {
    this.floaters.push({ x, y, text, color, life: 0.8 });
  }
  updateFloaters(dt) {
    const F = this.floaters;
    for (let i = F.length - 1; i >= 0; i--) {
      const f = F[i];
      f.life -= dt; f.y -= 26 * dt;
      if (f.life <= 0) { F[i] = F[F.length - 1]; F.pop(); }
    }
  }
}
