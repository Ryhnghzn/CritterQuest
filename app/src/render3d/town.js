// 2.5D towns and building interiors (plan "Tampilan 2.5D" §3). Same draw signature as the
// 2D TownRenderer (render/town.js): draw(town, t, avatar, clock, backdropId). Each town and
// each room is built in 3D once from its data (townbuild.js, interior3d.js) and cached;
// the hero and the townsfolk are the game's 2D dolls standing as billboards; role tags,
// names, quest marks, shop plates and the door fade are drawn on the 2D canvas on top.
import * as THREE from 'three';
import { S, sharp } from './stage.js';
import { billMat, canvasTexture } from './actors.js';
import { NightMats, setGhost, GEO } from './kit3d.js';
import { occludes, nearest, facesCamera } from './townkit.js';
import { buildTown } from './townbuild.js';
import { buildRoom } from './interior3d.js';
import { townDef } from '../data/towns.js';
import { npcAt } from '../town/town.js';
import { skyAt } from '../meta/clock.js';
import { drawDoll } from '../art/doll.js';
import { levelRing, auraBack, auraFront, bestRarity } from '../art/aura.js';
import { tag, plate, questMark } from '../render/paint.js';
import { doorFade } from '../render/town.js';
import { tr } from '../i18n.js';

const DOLL = 0.82;
const HX = 58, HT = 100, HB = 14;           // billboard box around the feet (game units), as in actors.js
const POOL = 5, POOL_LITE = 2;              // point lights handed to the nearest sources (+1 on the hero)
const PN = 140;                             // particles: embers, sparks, smoke, snow / sand / leaves
const MOTES = { snow: [0.9, 0.95, 1.1], sand: [0.9, 0.7, 0.45], ember: [1.6, 0.55, 0.2], leaf: [0.45, 0.8, 0.35] };
const cDay = new THREE.Color(0xcfd8ff), cNight = new THREE.Color(0x4a3c78), gDay = new THREE.Color(0x5a4a3a), gNight = new THREE.Color(0x120a14);
const sDay = new THREE.Color(0xfff0d8), sNight = new THREE.Color(0x9a8cff), sWarm = new THREE.Color(0xff9a5a);

export class Town25 {
  constructor(view, flat, stage) {
    this.view = view; this.flat = flat; this.stage = stage;
    this.places = new Map();
    this.bills = new Map(); this.shown = [];
    this.camX = 0; this.camY = 0; this.lastT = 0; this.frame = 0;
    this.walk = 0; this.facing = 1;
    this._v = new THREE.Vector3(); this._w = new THREE.Vector3();
    this._near = new Int32Array(8); this._d = new Float64Array(8); this._act = [];
    this.pose = { t: 0, moving: 0, walk: 0 };
  }
  screenToWorld(x, y) { return this.stage.screenToWorld(x, y); }
  hide() {
    if (!this.scene) return;
    if (this.stage.visible) this.stage.show(false);
    if (this.bloomBase != null && this.stage.bloom) { this.stage.bloom.strength = this.bloomBase; this.bloomBase = null; }
    this.view.c.style.background = '';
  }

  setup() {
    this.stage.init();
    const sc = this.scene = new THREE.Scene();
    this.hemi = new THREE.HemisphereLight(0x4a3c78, 0x120a14, 1.6); sc.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0x9a8cff, 1.2); sc.add(this.sun); sc.add(this.sun.target);
    this.pool = [];
    for (let i = 0; i < POOL; i++) { const L = new THREE.PointLight(0xffa050, 0, 10, 1.6); sc.add(L); this.pool.push(L); }
    this.heroLight = new THREE.PointLight(0xffd8a0, 0, 7, 1.6); sc.add(this.heroLight);
    this.fog = new THREE.Fog(0x0a0812, 26, 58);
    // shared materials whose look follows the clock
    this.mats = {
      nightMats: new NightMats(),
      emberMat: new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff6a20).multiplyScalar(1.6) }),
      runeMat: new THREE.MeshBasicMaterial({ color: new THREE.Color(0xb48cff).multiplyScalar(1.6), transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
      lavaMat: new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff5a1a).multiplyScalar(1.5) }),
      fireMat: new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffb347).multiplyScalar(2.2) }),
      roomWin: new THREE.MeshBasicMaterial({ color: 0x9fd8ff }),
      glassMat: new THREE.MeshLambertMaterial({ color: 0xa8d0ff, transparent: true, opacity: 0.28, depthWrite: false }),
    };
    // billboards: one plane shape, its origin at the feet
    this.billGeo = new THREE.PlaneGeometry(HX * 2 * S, (HT + HB) * S); this.billGeo.translate(0, (HT - HB) / 2 * S, 0);
    this.shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, depthWrite: false });
    this.people = new THREE.Group(); sc.add(this.people);
    this.hero = this.makeBill(); this.hero.lite = null;
    // particles
    this.pdata = new Float32Array(PN * 8); // x, y, z, vx, vy, vz, life, kind
    this.pcol = new Float32Array(PN * 3); this.ppos = new Float32Array(PN * 3);
    const pg = this.pgeo = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(this.ppos, 3)); pg.setAttribute('color', new THREE.BufferAttribute(this.pcol, 3));
    const pts = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.15, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    pts.frustumCulled = false; sc.add(pts);
  }

  // building ahead (the loading screen, ui/loading.js)
  // Does the town / room still have to be built before it can be shown?
  needsWarm(town, backdropId = 'home') {
    if (!this.scene) return true;
    const def = townDef(town ? town.id : backdropId), room = town && town.map !== 'town' ? def.interiors[town.map] : null;
    return !this.places.has(room ? `room:${room.id}` : `town:${def.id}`);
  }
  // Builds it in steps; step(progress, what) shows them and waits a frame between.
  async warm(town, avatar, backdropId, step) {
    await step(0.15, 'torch');
    if (!this.scene) this.setup();
    if (avatar && !!avatar.lite !== this.stage.lite) this.stage.setQuality(!!avatar.lite);
    await step(0.4, 'town');
    const def = townDef(town ? town.id : backdropId), room = town && town.map !== 'town' ? def.interiors[town.map] : null;
    const place = this.placeOf(def, room);
    if (place !== this.place) this.enter(place);
    await step(0.7, 'shadow');
    await this.stage.compile(this.scene);
  }

  // places (built once, cached)
  placeOf(def, room) {
    const key = room ? `room:${room.id}` : `town:${def.id}`;
    let p = this.places.get(key);
    if (!p) {
      p = room ? buildRoom(room, this.mats) : buildTown(def, this.mats);
      p.key = key; p.room = room || null;
      if (!room) for (const d of p.doors) d.ids = (def.interiors?.[d.b.id]?.npcs || []).map((n) => n.id);
      this.places.set(key, p);
    }
    return p;
  }
  enter(p) {
    if (this.place) this.scene.remove(this.place.root);
    this.place = p; this.scene.add(p.root);
    // the townsfolk of the last place are not needed any more
    for (const [n, b] of this.bills) { this.people.remove(b.grp); b.tex.dispose(); b.mesh.material.dispose(); this.bills.delete(n); }
    this.shown.length = 0;
    this.snap = true;
    for (let i = 0; i < PN; i++) this.pdata[i * 8 + 6] = 0;
  }

  makeBill() {
    const c = document.createElement('canvas'), tex = canvasTexture(c);
    const mesh = new THREE.Mesh(this.billGeo, billMat(tex)); mesh.renderOrder = 2;
    const sh = new THREE.Mesh(GEO.disc, this.shadowMat); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02; sh.scale.set(24 * S, 9 * S, 1);
    const grp = new THREE.Group(); grp.add(sh, mesh); this.people.add(grp);
    return { c, g: c.getContext('2d'), tex, mesh, grp, pose: { t: 0, moving: 0, walk: 0 }, look: null };
  }
  // the canvas of a billboard at resolution k px per game unit; returns its 2D context, origin at the feet
  canvasOf(b, k) {
    const w = Math.ceil(HX * 2 * k), h = Math.ceil((HT + HB) * k);
    if (b.c.width !== w || b.c.height !== h) { b.c.width = w; b.c.height = h; b.tex.dispose(); }
    const g = b.g;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h);
    g.setTransform(k, 0, 0, k, HX * k, HT * k);
    g.lineJoin = 'round';
    return g;
  }

  // per frame
  draw(town, t, avatar, clock, backdropId = 'home') {
    if (!this.scene) this.setup();
    const st = this.stage, v = this.view;
    st.show(true);
    v.c.style.background = 'transparent';
    const lite = avatar ? !!avatar.lite : st.lite;
    if (lite !== st.lite) st.setQuality(lite);
    const dt = Math.max(0, Math.min(0.1, t - this.lastT)); this.lastT = t;
    this.frame++;
    const sky = skyAt(clock), night = sky.night;
    const def = townDef(town ? town.id : backdropId);
    const room = town && town.map !== 'town' ? def.interiors[town.map] : null;
    const place = this.placeOf(def, room);
    if (place !== this.place) this.enter(place);

    // camera: follows the hero; behind the menus it drifts slowly over the plaza
    let tx, ty;
    if (room) { tx = room.w / 2 + (town.x - room.w / 2) * 0.55; ty = (room.back + room.h) / 2 + (town.y - (room.back + room.h) / 2) * 0.55; }
    else if (town) { tx = town.x; ty = town.y; }
    else { tx = def.spawn.x + Math.sin(t * 0.08) * 120; ty = def.spawn.y - 60 + Math.cos(t * 0.06) * 90; }
    if (this.snap || Math.hypot(tx - this.camX, ty - this.camY) > 900) { this.camX = tx; this.camY = ty; this.snap = false; }
    const k = town ? 0.14 : 0.03;
    this.camX += (tx - this.camX) * k; this.camY += (ty - this.camY) * k;
    st.shake.x = st.shake.y = 0;
    st.look(this.camX, this.camY);
    const hx = town ? town.x : this.camX, hy = town ? town.y : this.camY, yaw = st.yaw;

    this.sky(place, sky, lite);
    if (room) {
      for (const pn of place.panels) {
        const goal = facesCamera(pn.p, yaw) ? 0.12 : 1;
        const nk = pn.k + (goal - pn.k) * Math.min(1, dt * 10);
        if (Math.abs(nk - pn.k) > 0.002) { pn.k = nk; pn.grp.scale.y = nk; }
      }
    } else {
      for (const s of place.sinks) s.update(hx, hy, yaw, dt);
      for (const o of place.occluders) setGhost(o, !!town && occludes(o.x0, o.y0, o.x1, o.y1, hx, hy, yaw, o.reach));
      for (const c of place.carts) c.visible = !!town?.night;
    }
    this.lights(place, hx, hy, t, night, town);
    this.animate(place, t, night);
    this.particles(place, dt, lite, room ? null : def.theme?.motes);
    this.people_(place, town, t, avatar, lite, room ? room.npcs : def.npcs);
    st.render(this.scene);
    this.overlay(place, town, t, room);
  }

  sky(place, sky, lite) {
    const n = sky.night, sc = this.scene, st = this.stage;
    if (place.room) {
      this.hemi.color.set(0x8a7aa8); this.hemi.groundColor.set(0x1a1018); this.hemi.intensity = 1.1;
      this.sun.color.set(0xffe0c0); this.sun.intensity = 0.35;
      this.sun.position.set(this.camX * S, 20, this.camY * S + 12); this.sun.target.position.set(this.camX * S, 0, this.camY * S);
      sc.background = this.bgRoom || (this.bgRoom = new THREE.Color(0x07050f)); sc.fog = null;
    } else {
      const s = place.st;
      this.hemi.color.copy(cDay).lerp(cNight, n); this.hemi.groundColor.copy(gDay).lerp(gNight, n);
      this.hemi.intensity = 1.5 + 0.2 * n;
      this.sun.color.copy(sDay).lerp(sNight, n).lerp(sWarm, Math.min(0.6, sky.warm * 3));
      this.sun.intensity = 2.4 - 1.3 * n;
      this.sun.position.set(this.camX * S - 15, 30, this.camY * S - 10); this.sun.target.position.set(this.camX * S, 0, this.camY * S);
      const bg = place.bg || (place.bg = new THREE.Color());
      bg.set(s.day).lerp(place.nightBg || (place.nightBg = new THREE.Color(s.sky)), n);
      sc.background = bg; this.fog.color.copy(bg); sc.fog = this.fog;
      this.fog.near = 24 * st.zoom; this.fog.far = 58 * st.zoom; // the camera backs off when zooming out
    }
    this.sun.target.updateMatrixWorld();
    this.mats.nightMats.set(place.room ? 0 : n);
    this.mats.roomWin.color.set(n > 0.5 ? 0x1c2a5a : 0xbfe4ff);
    if (!lite && st.bloom) {
      if (this.bloomBase == null) this.bloomBase = st.bloom.strength;
      st.bloom.strength = place.room ? 0.55 : 0.28 + 0.5 * n;
    }
    this.night = n;
  }

  lights(place, hx, hy, t, night, town) {
    const act = this._act; act.length = 0;
    for (const l of place.lights) {
      const f = l.night === true ? night : l.night === 'day' ? 1 - night : l.night === 'cart' ? (town?.night ? 1 : 0) : 1;
      if (f > 0.05) { l.f = f; act.push(l); }
    }
    const n = this.stage.lite ? POOL_LITE : POOL;
    const cnt = nearest(act, hx, hy, n, this._near, this._d);
    for (let i = 0; i < POOL; i++) {
      const L = this.pool[i];
      L.visible = i < n; // fewer lights in Ringan (a shader change only when the setting flips)
      if (i >= cnt) { L.intensity = 0; continue; }
      const l = act[this._near[i]], fl = 1 + Math.sin(t * 11 + l.ph) * 0.07 + Math.sin(t * 23 + l.ph) * 0.04;
      L.position.set(l.x * S, l.h * S, l.y * S); L.color.copy(l.color); L.distance = l.dist; L.intensity = l.int * l.f * fl;
    }
    const H = this.heroLight;
    H.position.set(hx * S, 2.2, (hy + 10) * S);
    H.intensity = !town ? 0 : place.room ? 2 : 1 + 4 * night; // stays in the scene (no shader change)
  }

  animate(place, t, night) {
    for (const f of place.flames) {
      const ph = f.userData.flicker || 0;
      f.scale.set(1, 1 + Math.sin(t * 11 + ph) * 0.12, 1);
    }
    const m = this.mats;
    m.emberMat.color.setRGB(1, 0.42, 0.13).multiplyScalar(1.2 + 0.5 * Math.sin(t * 2));
    m.runeMat.color.setRGB(0.7, 0.55, 1).multiplyScalar(1.1 + 0.6 * (0.5 + 0.5 * Math.sin(t * 2.4)));
    m.lavaMat.color.setRGB(1, 0.3, 0.06).multiplyScalar(0.95 + 0.15 * Math.sin(t * 1.3));
    if (place.veil) place.veil.opacity = 0.28 + 0.1 * Math.sin(t * 2.2);
  }

  // embers from fires, sparks from forges, bubbles, chimney smoke, and the town's own motes
  particles(place, dt, lite, motes) {
    const D = this.pdata, P = this.ppos, C = this.pcol, src = place.embers, smk = place.smokes || [];
    const mote = motes && MOTES[motes], spawn = lite ? 0.5 : 1;
    for (let i = 0; i < PN; i++) {
      const o = i * 8;
      if (D[o + 6] <= 0) {
        const r = Math.random();
        if (r < 0.32 * spawn && src.length) {
          const e = src[(Math.random() * src.length) | 0], w = e.w || 14;
          D[o] = (e.x + (Math.random() - 0.5) * w) * S; D[o + 1] = e.h * S; D[o + 2] = (e.y + (Math.random() - 0.5) * w * 0.6) * S;
          D[o + 3] = (Math.random() - 0.5) * 0.3; D[o + 4] = e.kind === 'bubble' ? 0.5 : 1.4 + Math.random() * 1.4; D[o + 5] = (Math.random() - 0.5) * 0.3;
          D[o + 6] = e.kind === 'bubble' ? 0.7 : 0.7 + Math.random() * 1; D[o + 7] = e.kind === 'bubble' ? 2 : 1;
        } else if (r < 0.45 * spawn && smk.length) {
          const s = smk[(Math.random() * smk.length) | 0];
          D[o] = s.x * S; D[o + 1] = s.h * S; D[o + 2] = s.y * S;
          D[o + 3] = 0.15 + Math.random() * 0.25; D[o + 4] = 0.5 + Math.random() * 0.4; D[o + 5] = (Math.random() - 0.5) * 0.1;
          D[o + 6] = 2 + Math.random() * 1.5; D[o + 7] = 3;
        } else if (r < 0.6 * spawn && mote) {
          D[o] = this.camX * S + (Math.random() - 0.5) * 30; D[o + 1] = 1 + Math.random() * 7; D[o + 2] = this.camY * S + (Math.random() - 0.6) * 22;
          const fall = motes === 'ember' ? 0.5 : motes === 'snow' ? -0.6 : -0.15;
          D[o + 3] = motes === 'sand' ? 1.6 : (Math.random() - 0.5) * 0.4; D[o + 4] = fall; D[o + 5] = (Math.random() - 0.5) * 0.3;
          D[o + 6] = 2 + Math.random() * 2; D[o + 7] = 4;
        } else { P[i * 3 + 1] = -50; continue; }
      }
      D[o + 6] -= dt;
      D[o] += D[o + 3] * dt; D[o + 1] += D[o + 4] * dt; D[o + 2] += D[o + 5] * dt;
      P[i * 3] = D[o]; P[i * 3 + 1] = D[o + 1]; P[i * 3 + 2] = D[o + 2];
      const a = Math.min(1, D[o + 6]), kind = D[o + 7];
      if (kind === 1) { C[i * 3] = 1.6 * a; C[i * 3 + 1] = 0.6 * a; C[i * 3 + 2] = 0.2 * a; }
      else if (kind === 2) { C[i * 3] = 0.4 * a; C[i * 3 + 1] = 1.5 * a; C[i * 3 + 2] = 0.6 * a; }
      else if (kind === 3) { C[i * 3] = 0.22 * a; C[i * 3 + 1] = 0.2 * a; C[i * 3 + 2] = 0.26 * a; }
      else { const m = MOTES[motes] || MOTES.snow; C[i * 3] = m[0] * a * 0.7; C[i * 3 + 1] = m[1] * a * 0.7; C[i * 3 + 2] = m[2] * a * 0.7; }
    }
    this.pgeo.attributes.position.needsUpdate = true; this.pgeo.attributes.color.needsUpdate = true;
  }

  // the hero and the townsfolk as upright 2D dolls facing the camera
  people_(place, town, t, avatar, lite, npcs) {
    const yaw = this.stage.yaw, cy = Math.cos(yaw), sy = Math.sin(yaw);
    for (const b of this.shown) b.grp.visible = false;
    this.shown.length = 0;
    const hx = town ? town.x : this.camX, hy = town ? town.y : this.camY, nt = town ? town.t : t;
    const kN = sharp('npc', lite);
    let i = 0;
    for (const n of npcs) {
      i++;
      if (n.object === 'stone' || (n.night && !town?.night)) continue;
      const p = n.wander ? npcAt(n, nt) : null;
      const x = p ? p.x : n.x, y = p ? p.y : n.y, moving = p ? p.moving : 0;
      if (Math.abs(x - this.camX) > 900 || Math.abs(y - this.camY) > 800) continue;
      let b = this.bills.get(n);
      if (!b) { b = this.makeBill(); b.look = { ...n.look, outfit: n.outfit, npc: n }; b.fresh = true; this.bills.set(n, b); }
      const sc = n.scale || 1;
      const facing = moving ? (p.facing || 1) * (cy >= 0 ? 1 : -1) : ((hx - x) * cy - (hy - y) * sy < 0 ? -1 : 1);
      if (b.fresh || (this.frame + i) % 2 === 0 || facing !== b.facing) { // redrawn every other frame
        const g = this.canvasOf(b, kN), pose = b.pose;
        pose.t = t + n.x; pose.moving = moving; pose.walk = t * 5 * moving;
        g.scale(DOLL * facing, DOLL);
        drawDoll(g, null, b.look, pose);
        b.tex.needsUpdate = true; b.fresh = false; b.facing = facing;
      }
      b.grp.position.set(x * S, 0, (y + 10 * sc) * S); b.grp.scale.setScalar(sc);
      b.mesh.rotation.y = yaw;
      b.grp.visible = true; this.shown.push(b);
    }
    // the hero
    const H = this.hero;
    H.grp.visible = !!(town && avatar);
    if (!H.grp.visible) return;
    const moving = Math.min(1, Math.hypot(town.moveX, town.moveY));
    const sx = town.moveX * cy - town.moveY * sy; // screen-x of the walk (camera may be turned)
    if (sx > 0.1) this.facing = 1; else if (sx < -0.1) this.facing = -1;
    this.walk += moving * 0.22;
    const g = this.canvasOf(H, sharp('hero', lite)), best = bestRarity(avatar.look.gear);
    levelRing(g, 0, 0, avatar.level || 1, t, { lite });
    const opt = { host: this, lite, best, set: avatar.set, frenzyOn: false };
    auraBack(g, 0, 0, avatar.fx, t, opt);
    g.save(); g.scale(DOLL * this.facing, DOLL);
    const pose = this.pose; pose.t = t; pose.moving = moving; pose.walk = this.walk;
    drawDoll(g, avatar.classId, avatar.look, pose);
    g.restore();
    auraFront(g, 0, 0, avatar.fx, best, t, { ...opt, level: avatar.level, facing: this.facing });
    H.tex.needsUpdate = true;
    H.grp.position.set(town.x * S, 0, (town.y + 10) * S);
    H.mesh.rotation.y = yaw;
  }

  // game point at height h (game units) → CSS px into this._p; false when off screen
  proj(x, y, h) {
    const cam = this.stage.camera, v = this._v.set(x * S, h * S, y * S).project(cam);
    if (v.z > 1 || v.x < -1.2 || v.x > 1.2 || v.y < -1.2 || v.y > 1.3) return false;
    const yaw = this.stage.yaw, w = this._w.set((x + 10 * Math.cos(yaw)) * S, h * S, (y - 10 * Math.sin(yaw)) * S).project(cam);
    this.px = (v.x * 0.5 + 0.5) * innerWidth; this.py = (-v.y * 0.5 + 0.5) * innerHeight;
    this.pk = Math.hypot(w.x - v.x, w.y - v.y) * 0.5 * innerWidth / 10;
    return true;
  }

  // the 2D canvas on top: role tags, names, quest marks, shop plates, vignette, door fade
  overlay(place, town, t, room) {
    const v = this.view, g = v.ctx, dpr = v.c.width / innerWidth;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, v.c.width, v.c.height);
    const def = place.def, npcs = room ? room.npcs : def.npcs, nt = town ? town.t : t;
    const at = (s) => g.setTransform(s, 0, 0, s, this.px * dpr, this.py * dpr);
    const scaleOf = () => Math.max(0.7, Math.min(1.7, this.pk)) * dpr;
    if (!room) { // shop name plates and quest marks over the doors
      for (const d of place.doors) {
        if (Math.abs(d.x - this.camX) > 520 || Math.abs(d.y - this.camY) > 460) continue;
        if (!this.proj(d.x, d.y + 4, d.top)) continue;
        const s = scaleOf();
        if (d.b.name) { at(s); plate(g, tr(d.b.name), 0, 0); }
        if (town?.marks) for (const id of d.ids) if (town.marks[id]) { at(s); questMark(g, 0, -22 + Math.sin(t * 4) * 3, town.marks[id], t); break; }
      }
    } else if (this.proj(room.w / 2, room.h - 6, 0)) { at(scaleOf()); plate(g, tr('Keluar'), 0, 0, '#2a2440'); }
    for (const n of npcs) {
      if (n.night && !town?.night) continue;
      const p = n.wander ? npcAt(n, nt) : null, x = p ? p.x : n.x, y = p ? p.y : n.y, sc = n.scale || 1;
      if (Math.abs(x - this.camX) > 700 || Math.abs(y - this.camY) > 600) continue;
      const stone = n.object === 'stone';
      if (!this.proj(x, y + 10 * sc, stone ? 92 : 64 * sc)) continue;
      at(scaleOf());
      tag(g, n, 0, 40 * sc, t, town?.near === n, town?.marks?.[n.id]);
    }
    v.vignetteOverlay();
    doorFade(v, town);
  }
}


