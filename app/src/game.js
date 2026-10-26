// Core simulation. Fixed-timestep only; zero allocation in the hot loop
// (entities live in reused objects and are swap-removed when they die).
import { rand, rrange, rint, pick, resetRng } from './rng.js';
import {
  WORLD_R, MAX_WEAPONS, XP_BASE, XP_GROWTH, CRITTERS, WEAPONS,
  STAT_UPS, ENEMIES, WAVES, BOSS_EVERY, MAX_ENEMIES,
} from './data.js';
import { sfx } from './audio.js';
import { SPRITES } from './sprites.js';

export const ST = { TITLE: 0, PLAY: 1, LEVELUP: 2, PAUSE: 3, OVER: 4 };

export class Game {
  constructor() {
    this.enemies = [];
    this.projectiles = [];
    this.gems = [];
    this.fields = [];
    this.particles = [];
    this.floaters = [];
    this.state = ST.TITLE;
    this.critter = CRITTERS[0];
    this.best = this.loadBest();
    this.shake = 0;
    this.reset(CRITTERS[0]);
  }

  loadBest() {
    try {
      const b = JSON.parse(localStorage.getItem('cs-best') || 'null');
      if (b && Number.isFinite(b.time)) return b;
    } catch (_) { /* corrupted or blocked storage */ }
    return { time: 0, kills: 0, level: 0 };
  }
  saveBest() {
    if (this.time <= this.best.time) return;
    this.best = { time: Math.floor(this.time), kills: this.kills, level: this.level };
    try { localStorage.setItem('cs-best', JSON.stringify(this.best)); } catch (_) { /* ignore */ }
  }

  reset(critter) {
    resetRng();
    this.critter = critter;
    this.enemies.length = 0; this.projectiles.length = 0;
    this.gems.length = 0; this.fields.length = 0;
    this.particles.length = 0; this.floaters.length = 0;
    this.px = 0; this.py = 0;
    this.time = 0; this.kills = 0; this.level = 1;
    this.xp = 0; this.xpNeed = XP_BASE + XP_GROWTH;
    this.spawnT = 0; this.bossAt = BOSS_EVERY; this.bossAlive = false;
    this.pendingLevels = 0; this.choices = null;
    this.stats = {
      speed: critter.speed, maxHp: critter.hp, hp: critter.hp,
      dmgMul: 1, rateMul: 1, magnet: critter.magnet, armor: 0,
    };
    this.weapons = [this.newWeapon(critter.weapon)];
    this.upCounts = {}; // stat id -> times taken
    this.invuln = 0; this.flash = 0; this.shake = 0;
    this.banner = null; this.bannerT = 0;
    this.deathT = 0;
  }

  newWeapon(id) { return { id, level: 1, cd: 0.4, angle: rand() * 6.28 }; }

  start(critter) {
    this.reset(critter);
    this.state = ST.PLAY;
  }

  showBanner(text) { this.banner = text; this.bannerT = 2.4; }

  // ——————————————— fixed step ———————————————
  step(dt) {
    if (this.state !== ST.PLAY) return;
    this.time += dt;
    const s = this.stats;

    // movement
    const mv = this.moveVec;
    this.px += mv.x * s.speed * dt;
    this.py += mv.y * s.speed * dt;
    const dCenter = Math.hypot(this.px, this.py);
    if (dCenter > WORLD_R) { this.px *= WORLD_R / dCenter; this.py *= WORLD_R / dCenter; }

    if (this.invuln > 0) this.invuln -= dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.shake > 0) this.shake -= dt * 3;
    if (this.bannerT > 0) this.bannerT -= dt;

    this.spawnLogic(dt);
    this.updateWeapons(dt);
    this.updateProjectiles(dt);
    this.updateFields(dt);
    this.updateEnemies(dt);
    if (this.state !== ST.PLAY) return; // died this step: no gem pickup / level-up after death
    this.updateGems(dt);
    this.updateParticles(dt);
    this.updateFloaters(dt);

    // level-up gate
    if (this.pendingLevels > 0) {
      this.choices = this.rollChoices();
      this.state = ST.LEVELUP;
      sfx.levelup();
    }
  }

  // ——————————————— spawning ———————————————
  spawnLogic(dt) {
    const t = this.time;
    if (t >= this.bossAt && !this.bossAlive) {
      this.bossAlive = true;
      this.spawnEnemy('boss');
      this.showBanner('RAJA MAW DATANG!');
      sfx.boss();
    }
    let wave = WAVES[0];
    for (const w of WAVES) if (t >= w.at) wave = w;
    this.spawnT -= dt;
    if (this.spawnT <= 0 && this.enemies.length < MAX_ENEMIES) {
      this.spawnT = wave.interval * rrange(0.8, 1.2);
      const n = wave.batch + Math.floor(t / 200);
      for (let i = 0; i < n; i++) this.spawnEnemy(pick(wave.types));
    }
  }

  spawnEnemy(typeId) {
    const base = ENEMIES[typeId];
    const hpMul = typeId === 'boss' ? 1 + this.time / 400 : 1 + this.time / 320;
    const a = rand() * Math.PI * 2;
    const dist = Math.max(this.viewR || 400, 300) + rrange(60, 200);
    const e = {
      type: typeId, x: this.px + Math.cos(a) * dist, y: this.py + Math.sin(a) * dist,
      hp: base.hp * hpMul, maxHp: base.hp * hpMul,
      speed: base.speed * rrange(0.9, 1.1), dmg: base.dmg,
      r: base.r, xp: base.xp, sprite: base.sprite, score: base.score,
      hurtCd: 0, wob: rand() * 6.28, flash: 0, knock: 0, kx: 0, ky: 0,
    };
    this.enemies.push(e);
    return e;
  }

  // ——————————————— weapons ———————————————
  updateWeapons(dt) {
    for (const w of this.weapons) {
      const def = WEAPONS[w.id];
      const L = def.levels[w.level - 1];
      w.cd -= dt * this.stats.rateMul;
      if (w.id === 'gale') w.angle += L.speed * dt * this.stats.rateMul;
      if (w.cd > 0) continue;
      const fired = this.fire(w, L);
      if (fired) w.cd = L.rate;
    }
  }

  nearestEnemy(maxDist = 1e9) {
    let best = null, bd = maxDist * maxDist;
    for (const e of this.enemies) {
      const d = (e.x - this.px) ** 2 + (e.y - this.py) ** 2;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  fire(w, L) {
    const px = this.px, py = this.py;
    if (w.id === 'ember' || w.id === 'bubble') {
      let target = this.nearestEnemy(520);
      if (!target) { w.cd = 0.15; return false; }
      const baseA = Math.atan2(target.y - py, target.x - px);
      const spread = w.id === 'bubble' ? 0.32 : 0.09;
      for (let i = 0; i < L.count; i++) {
        const off = (i - (L.count - 1) / 2) * spread;
        const a = baseA + off + rrange(-0.03, 0.03);
        this.projectiles.push({
          kind: w.id, x: px, y: py, vx: Math.cos(a) * L.speed, vy: Math.sin(a) * L.speed,
          dmg: L.dmg, r: w.id === 'bubble' ? 8 : 5, pierce: L.pierce, life: 2.2, spin: 0,
        });
      }
      sfx.shoot();
      return true;
    }
    if (w.id === 'gale') return true; // continuous, handled in collision
    if (w.id === 'zap') {
      const target = this.nearestEnemy(420);
      if (!target) { w.cd = 0.15; return false; }
      let from = { x: px, y: py };
      let cur = target;
      const hit = new Set();
      for (let i = 0; i < L.count && cur; i++) {
        this.hurtEnemy(cur, L.dmg);
        hit.add(cur);
        this.spawnLightning(from.x, from.y, cur.x, cur.y);
        from = cur;
        // next nearest not yet hit
        let bn = null, bd = 180 * 180;
        for (const e of this.enemies) {
          if (hit.has(e) || e.hp <= 0) continue;
          const d = (e.x - from.x) ** 2 + (e.y - from.y) ** 2;
          if (d < bd) { bd = d; bn = e; }
        }
        cur = bn;
      }
      sfx.zap();
      return true;
    }
    if (w.id === 'thorn') {
      this.fields.push({ x: px, y: py, r: L.radius, dmg: L.dmg, life: 0.5, maxLife: 0.5 });
      return true;
    }
    return false;
  }

  updateProjectiles(dt) {
    const P = this.projectiles;
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      p.life -= dt;
      if (p.life <= 0) { P[i] = P[P.length - 1]; P.pop(); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      // collide with enemies
      for (const e of this.enemies) {
        if (e.hp <= 0 || e.hurtCd > 0) continue;
        const rr = e.r + p.r;
        if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 < rr * rr) {
          this.hurtEnemy(e, p.dmg);
          this.spawnBurst(p.x, p.y, '#ffd54a', 4);
          if (p.pierce > 0) { p.pierce--; e.hurtCd = 0.05; }
          else { p.life = 0; break; }
        }
      }
      if (p.life <= 0 && P[i] === p) { P[i] = P[P.length - 1]; P.pop(); }
    }
  }

  updateFields(dt) {
    for (let i = this.fields.length - 1; i >= 0; i--) {
      const f = this.fields[i];
      f.life -= dt;
      if (f.life <= 0) { this.fields[i] = this.fields[this.fields.length - 1]; this.fields.pop(); continue; }
      for (const e of this.enemies) {
        if (e.hp <= 0 || e.hurtCd > 0) continue;
        const rr = e.r + f.r;
        if ((e.x - f.x) ** 2 + (e.y - f.y) ** 2 < rr * rr) this.hurtEnemy(e, f.dmg);
      }
    }
  }

  updateEnemies(dt) {
    const E = this.enemies;
    // gale blades: continuous damage around the player
    for (const w of this.weapons) {
      if (w.id !== 'gale') continue;
      const L = WEAPONS.gale.levels[w.level - 1];
      for (let b = 0; b < L.count; b++) {
        const a = w.angle + (b / L.count) * Math.PI * 2;
        const bx = this.px + Math.cos(a) * L.radius;
        const by = this.py + Math.sin(a) * L.radius;
        for (const e of E) {
          if (e.hp <= 0 || e.hurtCd > 0) continue;
          const rr = e.r + 12;
          if ((e.x - bx) ** 2 + (e.y - by) ** 2 < rr * rr) {
            this.hurtEnemy(e, L.dmg);
            this.spawnBurst(bx, by, '#a8e063', 3);
          }
        }
      }
    }
    for (let i = E.length - 1; i >= 0; i--) {
      const e = E[i];
      if (e.hp <= 0) {
        this.killEnemy(e);
        E[i] = E[E.length - 1]; E.pop();
        continue;
      }
      if (e.hurtCd > 0) e.hurtCd -= dt;
      if (e.flash > 0) e.flash -= dt;
      e.wob += dt * 5;
      const a = Math.atan2(this.py - e.y, this.px - e.x);
      const zig = e.type === 'dart' ? Math.sin(e.wob) * 0.7 : 0;
      e.x += (Math.cos(a + zig) * e.speed + e.kx) * dt;
      e.y += (Math.sin(a + zig) * e.speed + e.ky) * dt;
      e.kx *= 0.86; e.ky *= 0.86;
      // touch damage
      const rr = e.r + 10;
      if (this.invuln <= 0 && (e.x - this.px) ** 2 + (e.y - this.py) ** 2 < rr * rr) {
        const dmg = Math.max(1, e.dmg - this.stats.armor);
        this.stats.hp -= dmg;
        this.invuln = 0.7; this.flash = 0.25; this.shake = 0.6;
        sfx.hurt();
        this.spawnBurst(this.px, this.py, '#ff5a6e', 8);
        e.kx = -Math.cos(a) * 220; e.ky = -Math.sin(a) * 220;
        if (this.stats.hp <= 0) { this.die(); return; }
      }
    }
  }

  hurtEnemy(e, dmg) {
    e.hp -= dmg * this.stats.dmgMul;
    e.flash = 0.12;
    e.hurtCd = Math.max(e.hurtCd, 0.24);
    sfx.hit();
  }

  killEnemy(e) {
    this.kills += 1;
    sfx.enemyDie();
    this.spawnBurst(e.x, e.y, e.type === 'boss' ? '#c26bd8' : '#7a45c2', e.type === 'boss' ? 26 : 8);
    if (e.type === 'boss') {
      this.bossAlive = false;
      this.bossAt += BOSS_EVERY;
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
        if (g.heart) {
          this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + 20);
          this.addFloater(g.x, g.y, '+20', '#ff5a6e');
          sfx.heart();
        } else {
          this.xp += g.v;
          this.addFloater(g.x, g.y, `+${g.v}`, '#8fffc0');
          sfx.gem();
          while (this.xp >= this.xpNeed) {
            this.xp -= this.xpNeed;
            this.level++;
            this.xpNeed = XP_BASE + XP_GROWTH * this.level;
            this.pendingLevels++;
          }
        }
        G[i] = G[G.length - 1]; G.pop();
      }
    }
  }

  // ——————————————— level up ———————————————
  rollChoices() {
    const cands = [];
    for (const w of this.weapons) {
      if (w.level < 5) {
        cands.push({ kind: 'weapon', id: w.id, to: w.level + 1, label: 'NAIKKAN' });
      }
    }
    if (this.weapons.length < MAX_WEAPONS) {
      for (const id of Object.keys(WEAPONS)) {
        if (!this.weapons.some((w) => w.id === id)) {
          cands.push({ kind: 'new', id, to: 1, label: 'SENJATA BARU' });
        }
      }
    }
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
      return { name: s.name, desc: s.desc(), icon: null };
    }
    const w = WEAPONS[c.id];
    return { name: `${c.kind === 'new' ? '' : '↑ '}${w.name} Lv${c.to}`, desc: w.desc(c.to), icon: w.icon };
  }

  applyChoice(c) {
    if (c.kind === 'heal') this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + 30);
    else if (c.kind === 'stat') {
      this.upCounts[c.id] = (this.upCounts[c.id] || 0) + 1;
      const s = this.stats;
      if (c.id === 'spd') s.speed *= 1.12;
      if (c.id === 'vit') { s.maxHp += 25; s.hp = Math.min(s.maxHp, s.hp + 25); }
      if (c.id === 'pow') s.dmgMul *= 1.15;
      if (c.id === 'hst') s.rateMul *= 1.12;
      if (c.id === 'mag') s.magnet += 35;
      if (c.id === 'arm') s.armor += 2;
    } else if (c.kind === 'new') this.weapons.push(this.newWeapon(c.id));
    else { const w = this.weapons.find((x) => x.id === c.id); w.level = c.to; }
    this.pendingLevels--;
    if (this.pendingLevels > 0) this.choices = this.rollChoices();
    else { this.choices = null; this.state = ST.PLAY; }
    sfx.pickCard();
  }

  die() {
    this.stats.hp = 0;
    this.state = ST.OVER;
    this.saveBest();
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
    this.particles.push({ x: x1, y: y1, x2, y2, vx: 0, vy: 0, life: 0.18, maxLife: 0.18, color: '#ffe95a', size: 2, line: true });
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
