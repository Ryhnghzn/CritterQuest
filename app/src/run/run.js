// Core simulation. Fixed-timestep only; zero allocation in the hot loop
// (entities live in reused objects and are swap-removed when they die).
import { tr, t } from '../i18n.js';
import { rand, rrange, rint, resetRng } from '../core/rng.js';
import { CHAR_LEVEL_MAX, POINTS_PER_LEVEL, ENERGY, ULT } from '../data/balance.js';
import { expToNext } from '../meta/character.js';
import { POTIONS, POTION_IDS, POTION_CD, DEFAULT_BELT } from '../data/potions.js';
import { CLASSES, CLASS_BASE } from '../data/classes.js';
import { ENEMIES } from '../data/enemies.js';
import { sfx } from '../core/audio.js';
import { stepPlayer } from './player.js';
import { stepAttack, stepSkills, skillCooldown, chargeUlt } from './skills.js';
import { stepHits } from './hits.js';
import { FX } from '../data/dungeon.js';
import { dungeonById } from '../data/dungeons.js';
import { makeRoom } from './room.js';
import { initAi, aiStep, onDeath, stepShots, stepHazards, guardFactor } from './enemies.js';
import { startFloor, stepDungeon, enemyGoal, confineEnemy, dropLoot, gearPickedUp, hpMul } from './dungeon.js';

export const ST = { TITLE: 0, PLAY: 1, PAUSE: 3, OVER: 4 };

// What a run starts from: class, final stats (meta/character.js finalStats),
// the HP / potions the character carries in (spec §13.3) and its level / EXP:
// EXP gems level the character up right in the dungeon (spec §14.1). A run is one dungeon
// trip: floor after floor (run/dungeon.js) until a gold portal, death or giving up.
const DEFAULT_START = { classId: 'warrior', stats: { ...CLASS_BASE, ...CLASSES.warrior.stats } };
// hits from basic attacks fill energy (spec §18.2)
const BASIC_FX = new Set(['slash', 'stab', 'arrow', 'fireball', 'boom']);
// potion: belt slot to drink from this step (0–3), or -1
const IDLE = { move: { x: 0, y: 0 }, aimAt: null, dodge: false, attack: false, auto: false, skill1: false, skill2: false, skill3: false, skill4: false, ult: false, potion: -1 };
const NO_POTIONS = Object.fromEntries(POTION_IDS.map((id) => [id, 0]));
// potion buffs: stat → multiplier field on the potion (spec §15.2)
const BUFF_STATS = { wind: ['moveSpd'], rage: ['atk', 'atkSpd'] };
const BUFFED = ['moveSpd', 'atk', 'atkSpd', 'crit', 'critDmg']; // stats potions & skill buffs can change

export class Game {
  constructor() {
    this.enemies = [];
    this.hits = [];       // live attack instances (run/hits.js)
    this.shots = [];      // enemy projectiles (run/enemies.js)
    this.hazards = [];    // telegraphed danger zones
    this.pulses = [];     // expanding rings (heal, blast) — visual only
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
      time: this.time, kills: this.kills, exp: Math.floor(this.expGained), gold: this.gold, items: this.loot.slice(),
      mats: { ...this.mats }, gems: this.gemsFound.slice(),
      bossKills: this.bossKills, killsBy: { ...this.killsBy }, elites: this.elites, floorsCleared: this.floorsCleared, floor: this.deepest, cleared: this.cleared, dungeon: this.dungeon.id,
    };
  }

  // Pause → Menyerah: ends the trip; the caller treats it like dying (spec §13.4).
  surrender() {
    this.state = ST.OVER;
  }

  // effects: special effects of the equipped unique gear, { effect: value } (meta/gear.js)
  // dungeon: id from data/dungeons.js (spec §18.3)
  // skills: the two skill ids worn on Q / E (spec §21), default the class's first two
  // ult: the class ultimate when unlocked (meta/talents.js ultimateOf), else null
  reset({ classId, stats, hp = stats.maxHp, potions = NO_POTIONS, belt = DEFAULT_BELT, level = 1, exp = 0, luk = 0, effects = {}, dungeon = 'shadow', skills = null, ult = null }) {
    resetRng();
    this.classId = classId;
    this.enemies.length = 0; this.hits.length = 0;
    this.shots.length = 0; this.hazards.length = 0; this.pulses.length = 0;
    this.gems.length = 0;
    this.particles.length = 0; this.floaters.length = 0;
    this.px = 0; this.py = 0;
    this.intent = IDLE;
    this.moveX = 0; this.moveY = 0;
    this.aimX = 1; this.aimY = 0;
    this.atkCd = 0; this.attackT = 0;
    this.aimPX = 0; this.aimPY = 0;
    this.skillCd = [0, 0, 0, 0];
    this.energy = ENERGY.start; this.noEnergyT = 0;
    const pool = CLASSES[classId].skills;
    this.skillDefs = (skills || [pool[0].id, pool[1].id, null, null]).map((id) => (id ? pool.find((s) => s.id === id) : null));
    while (this.skillDefs.length < 4) this.skillDefs.push(null);
    this.skillCdMax = this.skillDefs.map((sk) => (sk ? skillCooldown(stats, sk) : 0));
    this.ult = ult; this.ultCharge = 0;
    this.skillBuff = null; this.skillBuffT = 0; // atk / atkSpd / crit / critDmg from a buff skill
    this.buffT = 0; this.dmgTakenMul = 1;
    this.dashSpeed = 0;
    this.dodgeT = 0; this.dodgeCd = 0; this.dodgeInv = 0; this.dodgeX = 0; this.dodgeY = 0;
    this.time = 0; this.kills = 0;
    this.killsBy = {}; this.elites = 0; this.floorsCleared = 0; // bounties & bestiary (spec §24)
    this.expGained = 0; this.bossKills = 0; this.gold = 0;
    this.loot = []; this.luk = luk; // gear picked up this trip; LUK raises its rarity
    this.mats = { dust: 0, crystal: 0, core: 0 }; this.gemsFound = []; // forge materials & gems (spec §20)
    // character level & EXP, live during the trip
    this.level = level; this.xp = exp; this.xpNeed = expToNext(level); this.levelsGained = 0;
    // dungeon progress (run/dungeon.js)
    this.dungeon = dungeonById(dungeon);
    this.room = makeRoom('round', rand);
    this.floor = 0; this.deepest = 0; this.cleared = false; this.returned = false;
    this.wave = 0; this.queue = []; this.queueI = 0; this.spawnT = 0; this.waveGap = 0;
    this.floorT = 0; this.floorClear = false; this.clearT = 0;
    this.portals = []; this.exit = null;
    this.baseStats = { ...stats }; // final stats before potion buffs
    this.stats = { ...stats, hp };
    this.potions = { ...potions }; this.belt = belt.slice(); this.potionCd = 0;
    this.buffs = { wind: 0, rage: 0 }; // seconds left
    this.shield = 0; this.shieldT = 0; this.shieldMax = 0;
    this.dodgeCdMul = 1;
    this.fx = { ...effects }; this.fxShieldT = 0; this.frenzyOn = false; this.revived = false;
    this.applyBuffs();
    this.invuln = 0; this.flash = 0; this.shake = 0;
    this.banner = null; this.bannerT = 0;
    this.deathT = 0;
  }

  // setup.floor: floor to start on (spec §15.3), default 1
  start(setup) {
    this.reset(setup);
    startFloor(this, setup.floor || 1);
    this.state = ST.PLAY;
  }

  showBanner(text) { this.banner = text; this.bannerT = 2.4; }

  // New final stats mid-trip (points spent in the dungeon): current HP stays,
  // plus whatever max HP was added.
  setStats(stats) {
    const hp = Math.min(stats.maxHp, this.stats.hp + Math.max(0, stats.maxHp - this.stats.maxHp));
    this.baseStats = { ...stats };
    this.stats = { ...stats, hp };
    this.applyBuffs();
    this.skillCdMax = this.skillDefs.map((sk) => (sk ? skillCooldown(stats, sk) : 0));
  }

  // stats = base stats × active potion buffs
  applyBuffs() {
    for (const k of BUFFED) this.stats[k] = this.baseStats[k];
    for (const [id, keys] of Object.entries(BUFF_STATS)) {
      if (this.buffs[id] <= 0) continue;
      for (const k of keys) this.stats[k] *= 1 + POTIONS[id][k];
    }
    if (this.frenzyOn) this.stats.atkSpd *= 1 + this.fx.frenzy;
    const sb = this.skillBuffT > 0 && this.skillBuff;
    if (sb) {
      this.stats.atk *= 1 + (sb.atk || 0); this.stats.atkSpd *= 1 + (sb.atkSpd || 0);
      this.stats.crit += sb.crit || 0; this.stats.critDmg += sb.critDmg || 0;
    }
    this.dodgeCdMul = (this.buffs.wind > 0 ? POTIONS.wind.dodgeCd : 1) * (1 - (this.fx.dodgecd || 0));
  }

  // coins are worth more in harder dungeons (and with Liontin Keserakahan)
  addGold(n) { this.gold += Math.round(n * this.dungeon.rewardMul * (1 + (this.fx.goldfind || 0))); }

  // Unique gear that works over time: regeneration, periodic shield, frenzy at low HP.
  stepEffects(dt) {
    const fx = this.fx, s = this.stats;
    if (fx.regen) s.hp = Math.min(s.maxHp, s.hp + s.maxHp * fx.regen * dt);
    if (fx.shield && (this.fxShieldT -= dt) <= 0) {
      this.fxShieldT = FX.shieldEvery;
      this.shieldMax = Math.max(this.shield, s.maxHp * fx.shield);
      this.shield = this.shieldMax;
      this.shieldT = FX.shieldEvery;
    }
    if (fx.frenzy && this.frenzyOn !== s.hp < s.maxHp * FX.frenzyBelow) {
      this.frenzyOn = !this.frenzyOn;
      this.applyBuffs();
    }
  }

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
    this.stepEffects(dt);
    stepHits(this.hits, this.enemies, dt, this.hitCtx);
    stepDungeon(this, dt);
    this.updateEnemies(dt);
    if (this.state === ST.PLAY) stepShots(this, dt, this.room.bound);
    if (this.state === ST.PLAY) stepHazards(this, dt);
    if (this.state !== ST.PLAY) return; // died this step: no gem pickup after death
    this.updateGems(dt);
    this.updateParticles(dt);
    this.updateFloaters(dt);
    if (this.exit) this.takeExit();
  }

  // Blue portal: next floor (EXP, HP and potions carry over). Gold: go home.
  // Anything still on the ground is picked up on the way out.
  takeExit() {
    const kind = this.exit;
    this.exit = null;
    for (const g of this.gems) this.pickup(g);
    this.gems.length = 0;
    sfx.levelup();
    if (kind === 'down') startFloor(this, this.floor + 1);
    else { this.returned = true; this.state = ST.OVER; }
  }

  // ——————————————— spawning ———————————————
  // Placed at the player; run/dungeon.js spawnFromLane moves it into a lane.
  spawnEnemy(typeId) {
    const base = ENEMIES[typeId];
    const hp = base.hp * hpMul(Math.max(1, this.floor), this.dungeon);
    const e = {
      type: typeId, x: this.px, y: this.py,
      hp, maxHp: hp,
      speed: base.speed * rrange(0.9, 1.1), dmg: base.dmg * this.dungeon.dmgMul,
      r: base.r, xp: Math.round(base.xp * this.dungeon.rewardMul), sprite: base.sprite, score: base.score,
      wob: rand() * 6.28, flash: 0, frozen: 0, kx: 0, ky: 0,
      lane: null, entering: false, elite: false, boss: !!base.boss,
    };
    initAi(e);
    this.enemies.push(e);
    if (e.boss) sfx.boss();
    return e;
  }

  // Drink from a belt slot (spec §15.2): heal, shield or a timed buff; one
  // shared lockout between drinks. Buffs tick down here too.
  stepPotion(dt) {
    if (this.potionCd > 0) this.potionCd -= dt;
    let changed = false;
    for (const id in this.buffs) {
      if (this.buffs[id] <= 0) continue;
      this.buffs[id] -= dt;
      if (this.buffs[id] <= 0) changed = true;
    }
    if (this.shieldT > 0 && (this.shieldT -= dt) <= 0) this.shield = 0;
    const id = this.belt[this.intent.potion];
    if (id && this.potionCd <= 0 && this.potions[id] > 0 && this.drink(id)) {
      this.potions[id] -= 1;
      this.potionCd = POTION_CD;
      sfx.heart();
    }
    if (changed) this.applyBuffs();
  }

  // Applies one potion; false when it would do nothing (healing at full HP).
  drink(id) {
    const p = POTIONS[id], s = this.stats;
    if (p.heal) {
      if (s.hp >= s.maxHp) return false;
      s.hp = Math.min(s.maxHp, s.hp + s.maxHp * p.heal);
      this.addFloater(this.px, this.py - 30, `+${Math.round(s.maxHp * p.heal)}`, p.light);
    } else if (p.shield) {
      this.shieldMax = this.shield = s.maxHp * p.shield;
      this.shieldT = p.dur;
      this.addFloater(this.px, this.py - 30, tr('Perisai!'), p.light);
    } else {
      this.buffs[id] = p.dur;
      this.applyBuffs();
      this.addFloater(this.px, this.py - 30, `${p.name.replace('Ramuan ', '').replace(/ Potion$/, '')}!`, p.light);
    }
    return true;
  }

  // ——————————————— combat ———————————————
  // Damage rules (spec §5.2): atk × skill multiplier × (crit ? critDmg : 1).
  damageEnemy(h, e) {
    const s = this.stats;
    const crit = rand() * 100 < s.crit;
    const fx = this.fx;
    let dmg = s.atk * h.mult * (crit ? s.critDmg : 1) * guardFactor(this, e, h) * (h.skill ? 1 + (this.fx.skillDmg || 0) : 1);
    if (fx.execute && e.hp < e.maxHp * FX.executeBelow) dmg *= 1 + fx.execute;
    if (fx.bossdmg && (e.boss || e.elite)) dmg *= 1 + fx.bossdmg;
    e.hp -= dmg;
    if (BASIC_FX.has(h.fx) && !h.skill) this.energy = Math.min(ENERGY.max, this.energy + CLASSES[this.classId].attack.energy * (1 + (fx.energy || 0)));
    if (h.knock && !e.boss) { // push away from (or pull toward) the area's centre
      const dx = e.x - h.x, dy = e.y - h.y, d = Math.hypot(dx, dy) || 1;
      e.kx += (dx / d) * h.knock; e.ky += (dy / d) * h.knock;
    }
    if (fx.lifesteal) s.hp = Math.min(s.maxHp, s.hp + dmg * fx.lifesteal);
    if (fx.chain && !h.chained && rand() < fx.chain) this.chainFrom(e);
    e.flash = 0.12;
    if (h.freeze) e.frozen = Math.max(e.frozen, h.freeze);
    this.floaters.push({ x: e.x + rrange(-4, 4), y: e.y - e.r, text: String(Math.round(dmg)), color: crit ? '#ffd166' : '#ffffff', life: 0.7, big: crit });
    sfx.hit();
  }

  // chain lightning from a struck enemy to its nearest neighbour
  chainFrom(e) {
    let best = null, bd = FX.chainRange * FX.chainRange;
    for (const o of this.enemies) {
      if (o === e || o.hp <= 0) continue;
      const d = (o.x - e.x) ** 2 + (o.y - e.y) ** 2;
      if (d < bd) { bd = d; best = o; }
    }
    if (!best) return;
    this.spawnLightning(e.x, e.y, best.x, best.y);
    this.damageEnemy({ mult: FX.chainMult, chained: true }, best);
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
      // walk in through the lane, then the enemy's own behaviour (run/enemies.js)
      let vx, vy;
      const goal = enemyGoal(this, e);
      if (e.entering) {
        const ga = Math.atan2(goal.y - e.y, goal.x - e.x);
        vx = Math.cos(ga) * e.speed; vy = Math.sin(ga) * e.speed;
      } else ({ vx, vy } = aiStep(this, e, dt));
      if (e.type === 'dart') { // zig-zag flight
        const z = Math.sin(e.wob) * 0.7, c = Math.cos(z), s = Math.sin(z);
        [vx, vy] = [vx * c - vy * s, vx * s + vy * c];
      }
      e.x += (vx + e.kx) * dt;
      e.y += (vy + e.ky) * dt;
      e.kx *= 0.86; e.ky *= 0.86;
      confineEnemy(this, e);
      // touch damage
      const rr = e.r + 10;
      if (e.dmg > 0 && (e.x - this.px) ** 2 + (e.y - this.py) ** 2 < rr * rr && this.hurtPlayer(e.dmg)) {
        const a = Math.atan2(this.py - e.y, this.px - e.x);
        if (this.fx.thorns) { e.hp -= this.stats.atk * this.fx.thorns; e.flash = 0.12; }
        e.kx = -Math.cos(a) * 220; e.ky = -Math.sin(a) * 220;
        if (this.state !== ST.PLAY) return;
      }
    }
  }

  // Any damage to the player (touch, projectile, blast): def, Teriakan Baja, shield,
  // short invulnerability. Returns false when it did not land (dodging / invulnerable).
  hurtPlayer(raw) {
    if (this.invuln > 0 || this.dodgeInv > 0) return false;
    let dmg = Math.max(1, raw - this.stats.def) * this.dmgTakenMul;
    if (this.shield > 0) { const soak = Math.min(this.shield, dmg); this.shield -= soak; dmg -= soak; }
    this.stats.hp -= dmg;
    chargeUlt(this, (dmg / this.stats.maxHp) * ULT.hurtPct);
    this.invuln = 0.7; this.flash = 0.25; this.shake = 0.6;
    sfx.hurt();
    this.spawnBurst(this.px, this.py, '#ff5a6e', 8);
    if (this.stats.hp <= 0) this.die();
    return true;
  }

  killEnemy(e) {
    onDeath(this, e);
    this.kills += 1;
    this.killsBy[e.type] = (this.killsBy[e.type] || 0) + 1;
    if (e.elite) this.elites += 1;
    chargeUlt(this, e.boss ? ULT.boss : e.elite ? ULT.elite : ULT.kill);
    sfx.enemyDie();
    this.spawnBurst(e.x, e.y, e.boss ? '#c26bd8' : '#7a45c2', e.boss ? 26 : 8);
    dropLoot(this, e);
    if (this.fx.explode) {
      this.spawnBurst(e.x, e.y, '#ff9a3c', 12);
      for (const o of this.enemies) {
        if (o !== e && o.hp > 0 && (o.x - e.x) ** 2 + (o.y - e.y) ** 2 < FX.explodeRadius ** 2) { o.hp -= this.stats.atk * this.fx.explode; o.flash = 0.12; }
      }
    }
    if (e.boss) {
      this.bossKills += 1;
      this.showBanner(t('{name} TUMBANG!', { name: ENEMIES[e.type].name.toUpperCase() }));
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        this.gems.push({ x: e.x + Math.cos(a) * 30, y: e.y + Math.sin(a) * 30, v: 5, mag: false, big: true, t: rand() * 6 });
      }
      this.shake = 1;
      return;
    }
    // xp gem
    if (e.xp > 0) this.gems.push({ x: e.x, y: e.y, v: e.xp, mag: false, big: e.xp >= 5, t: rand() * 6 });
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
    } else if (g.gear) {
      gearPickedUp(this, g.gear);
      sfx.pickCard();
    } else if (g.coin) {
      this.addGold(g.v);
      this.addFloater(g.x, g.y, `+${g.v}`, '#ffd166');
      sfx.gem();
    } else {
      const v = g.v * (1 + (this.fx.expfind || 0)); // fractions add up over the trip
      this.xp += v;
      this.expGained += v;
      this.addFloater(g.x, g.y, `+${Math.round(v * 10) / 10}`, '#8fffc0');
      sfx.gem();
      while (this.level < CHAR_LEVEL_MAX && this.xp >= this.xpNeed) {
        this.xp -= this.xpNeed;
        this.level++;
        this.levelsGained++;
        this.xpNeed = expToNext(this.level);
        this.showBanner(t('Naik level! LV {n}', { n: this.level }));
        this.addFloater(this.px, this.py - 44, t('+{n} poin', { n: POINTS_PER_LEVEL }), '#8fffc0');
        sfx.levelup();
      }
    }
  }

  die() {
    if (this.god) { this.stats.hp = this.stats.maxHp; return; } // cheat panel
    if (this.fx.phoenix && !this.revived) { // Cincin Phoenix: rise once per trip
      this.revived = true;
      this.stats.hp = this.stats.maxHp * this.fx.phoenix;
      this.invuln = FX.phoenixInvuln;
      this.showBanner(tr('Bangkit dari abu!'));
      this.spawnBurst(this.px, this.py, '#ff9a3c', 30);
      sfx.levelup();
      return;
    }
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
    const Q = this.pulses;
    for (let i = Q.length - 1; i >= 0; i--) { if ((Q[i].t -= dt) <= 0) { Q[i] = Q[Q.length - 1]; Q.pop(); } }
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
