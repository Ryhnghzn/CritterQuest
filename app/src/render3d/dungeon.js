// 2.5D dungeon renderer (plan "Tampilan 2.5D" §1). Same interface as render/world.js
// Renderer (draw, screenToWorld, avatar). The floor of each room is drawn once with the 2D
// drawRoom and becomes a texture; walls and pillars are 3D blocks; lamps light the room.
// The hero, monsters, ground effects and numbers come from Actors (actors.js).
import * as THREE from 'three';
import { S, toon, glowMat, sharp, SHARP, muted, detailed, sunAt } from './stage.js';
import { flameSet } from './billprops.js';
import { LOOK } from '../data/look.js';
import { Actors } from './actors.js';
import { wallCells } from './roomgrid.js';
import { drawRoom, flagTile, decorLights, dress } from '../render/dungeonroom.js';
import { portalLabel } from '../render/world.js';
import { SHAKE_PX } from '../data/fx.js';

const PORTAL_RGB = { down: '90,170,255', home: '255,200,90' };
export const rgbColor = (s) => { const [r, g, b] = s.split(',').map(Number); return new THREE.Color(r / 255, g / 255, b / 255); };
const ambientOf = (s) => { const m = /rgba?\(([^)]+)\)/.exec(s || ''); const [r, g, b] = m ? m[1].split(',').map(Number) : [4, 3, 14]; return new THREE.Color(r / 255, g / 255, b / 255); };

export function dispose(obj) {
  obj.traverse((o) => {
    o.geometry?.dispose();
    if (o.material && !o.material.userData?.shared) { o.material.map?.dispose(); o.material.dispose(); }
  });
}

export class Dungeon25 {
  // stage: the shared WebGL stage; flat: the 2D Renderer (owns the avatar, its sprites are baked at screen scale)
  constructor(view, flat, stage) {
    this.view = view;
    this.flat = flat;
    this.stage = stage;
    this.camX = 0; this.camY = 0;
    this.roomRef = null; this.frame = 0;
  }
  get avatar() { return this.flat.avatar; }
  set avatar(a) { this.flat.avatar = a; }
  screenToWorld(x, y) { return this.stage.screenToWorld(x, y); }
  hide() { this.stage.show(false); this.view.c.style.background = ''; }

  setup() {
    this.stage.init();
    const sc = this.scene = new THREE.Scene();
    this.hemi = new THREE.HemisphereLight(0x5a4a90, 0x140c18, 1.2); sc.add(this.hemi);
    this.moon = new THREE.DirectionalLight(0x9a8cff, 0.6); this.moon.position.set(-10, 20, -8); sc.add(this.moon, this.moon.target);
    this.pool = []; // point lights handed to the nearest lamps each frame
    for (let i = 0; i < 4; i++) { const L = new THREE.PointLight(0xffa050, 0, 10, 1.6); sc.add(L); this.pool.push(L); }
    this.heroLight = new THREE.PointLight(0xffd8a0, 4, 9, 1.6); sc.add(this.heroLight);
    this.actors = new Actors(this.view, this.flat, this.stage, sc);
  }

  // the room: built once per floor
  buildRoom(game) {
    const sc = this.scene, room = game.room, theme = game.dungeon.theme;
    if (this.roomGroup) { sc.remove(this.roomGroup); dispose(this.roomGroup); }
    const G = this.roomGroup = new THREE.Group(); sc.add(G);
    this.roomRef = room;
    // floor: the 2D drawRoom painted once into a texture
    const half = room.bound + 220, side = half * 2, k = Math.min(sharp('floor', this.stage.lite), SHARP.floorMax / side);
    const c = document.createElement('canvas'); c.width = c.height = Math.ceil(side * k);
    const g = c.getContext('2d');
    g.fillStyle = '#05040c'; g.fillRect(0, 0, c.width, c.height);
    g.setTransform(k, 0, 0, k, half * k, half * k);
    const tile = flagTile(k, theme.floor), pat = g.createPattern(tile.canvas, 'repeat');
    pat.setTransform(new DOMMatrix().scale(tile.T / tile.canvas.width));
    g.lineJoin = 'round';
    drawRoom(g, room, theme, pat, 0, () => true);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = SHARP.aniso;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(side * S, side * S), muted(LOOK.detail > 0 ? detailed(new THREE.MeshLambertMaterial({ map: tex }), 'slab') : new THREE.MeshLambertMaterial({ map: tex })));
    floor.rotation.x = -Math.PI / 2; G.add(floor);
    // walls: chunky stone blocks around the floor
    const wallMat = toon(theme.wall, 0x3a2a5a, 'stone'), capMat = toon(new THREE.Color(theme.wall).multiplyScalar(0.7).getHex(), 0, 'stone');
    wallMat.userData.shared = capMat.userData.shared = true;
    const cells = wallCells(room, 40, 2), CH = 80;
    const blocks = new THREE.InstancedMesh(new THREE.BoxGeometry(40 * S * 0.98, 1, 40 * S * 0.98), wallMat, cells.length);
    const caps = new THREE.InstancedMesh(new THREE.BoxGeometry(40 * S * 0.86, 0.18, 40 * S * 0.86), capMat, cells.length);
    this.walls = { cells, blocks, caps, k: cells.map(() => 1), CH };
    this.setWalls(true);
    G.add(blocks, caps);
    for (const q of room.pillars) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(q.r * S, q.r * S * 1.15, 95 * S, 8), wallMat);
      p.position.set(q.x * S, 95 * S / 2, q.y * S); G.add(p);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(q.r * S * 1.25, q.r * S * 1.25, 8 * S, 8), capMat);
      top.position.set(q.x * S, 95 * S, q.y * S); G.add(top);
    }
    // lamps: a post with a glowing flame (the light comes from the pool)
    const dr = dress(room, theme), torches = [];
    for (const l of dr.lamps) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(2.5 * S, 3.5 * S, 34 * S, 5), toon(0x2a2228, 0, 'wood'));
      post.material.userData.shared = true;
      post.position.set(l.x * S, 17 * S, l.y * S); G.add(post);
      const col = l.kind === 'crystal' ? rgbColor(theme.glow[0]) : rgbColor(theme.light);
      if (LOOK.illustrated && l.kind !== 'crystal') { torches.push({ x: l.x, y: l.y, h: 33, s: 1 }); continue; } // plan C4: drawn flames
      const flame = new THREE.Mesh(new THREE.ConeGeometry(5 * S, 14 * S, 6), glowMat(col, 2));
      flame.position.set(l.x * S, 40 * S, l.y * S); flame.userData.flicker = Math.random() * 9; G.add(flame);
    }
    if (torches.length) G.add(flameSet(torches));
    // the rune circle at the centre lights up when the floor is clear
    this.rune = new THREE.Mesh(new THREE.RingGeometry(55 * S, 62 * S, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x9a7aff).multiplyScalar(1.6), transparent: true, opacity: 0.2, depthWrite: false }));
    this.rune.rotation.x = -Math.PI / 2; this.rune.position.y = 0.03; G.add(this.rune);
    this.portalGroup = new THREE.Group(); G.add(this.portalGroup); this.portalRef = null;
    const amb = ambientOf(theme.ambient);
    this.hemi.color.copy(amb).multiplyScalar(6).lerp(new THREE.Color(0x6a5aa0), 0.5);
  }

  buildPortals(game) {
    const P = this.portalGroup;
    while (P.children.length) { const o = P.children.pop(); dispose(o); }
    this.portalRef = game.portals;
    for (const p of game.portals) {
      const col = rgbColor(PORTAL_RGB[p.kind] || '200,200,255');
      const grp = new THREE.Group(); grp.position.set(p.x * S, 0, p.y * S);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(26 * S, 3 * S, 6, 32), glowMat(col, 2));
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.1; grp.add(ring);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(24 * S, 32), new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(1.2), transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }));
      disc.rotation.x = -Math.PI / 2; disc.position.y = 0.08; grp.add(disc);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(20 * S, 26 * S, 140 * S, 24, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
      beam.position.y = 70 * S; grp.add(beam);
      grp.userData = { ring, beam, p };
      P.add(grp);
    }
  }

  // wall blocks between the camera (south) and the hero sink to stubs, so nothing hides the fight
  setWalls(all, px = 0, py = 0, dt = 1) {
    const { cells, blocks, caps, k, CH } = this.walls, d = this._d || (this._d = new THREE.Object3D());
    const ys = Math.sin(this.stage.yaw), yc = Math.cos(this.stage.yaw);
    let changed = all;
    cells.forEach((cl, i) => {
      const dx = cl.x - px, dy = cl.y - py, along = dx * ys + dy * yc, side = Math.abs(dx * yc - dy * ys); // towards the camera / across
      const near = !all && along > -30 && along < 460 && side < 300 + along * 0.35;
      const goal = near ? 0.12 : 1, nk = all ? 1 : k[i] + (goal - k[i]) * Math.min(1, dt * 10);
      if (!all && Math.abs(nk - k[i]) < 0.002) return;
      k[i] = nk; changed = true;
      const h = CH * cl.h * nk * S;
      d.position.set(cl.x * S, h / 2, cl.y * S); d.scale.set(1, h, 1); d.updateMatrix(); blocks.setMatrixAt(i, d.matrix);
      d.position.set(cl.x * S, h + 0.09, cl.y * S); d.scale.set(1, 1, 1); d.updateMatrix(); caps.setMatrixAt(i, d.matrix);
    });
    if (changed) { blocks.instanceMatrix.needsUpdate = true; caps.instanceMatrix.needsUpdate = true; }
  }

  // per frame
  // building ahead (the loading screen, ui/loading.js)
  needsWarm(game) { return !!game.room && !!game.dungeon && (!this.hemi || game.room !== this.roomRef); }
  async warm(game, step) {
    await step(0.15, 'torch');
    if (!this.hemi) this.setup();
    const lite = game.vfx?.mul < 1 && !game.vfx?.tempLite; // the load guard's lite is the effects only
    if (lite !== this.stage.lite) this.stage.setQuality(lite);
    await step(0.45, 'dungeon');
    this.buildRoom(game);
    if (game.portals !== this.portalRef) this.buildPortals(game);
    await step(0.75, 'shadow');
    await this.stage.compile(this.scene);
  }

  draw(game, t) {
    if (!game.room || !game.dungeon) { this.hide(); this.flat.draw(game, t); return; }
    if (!this.hemi) this.setup();
    const st = this.stage, v = this.view;
    st.show(true);
    v.c.style.background = 'transparent';
    const lite = game.vfx?.mul < 1 && !game.vfx?.tempLite;
    if (lite !== st.lite) st.setQuality(lite);
    if (game.room !== this.roomRef) this.buildRoom(game);
    if (game.portals !== this.portalRef) this.buildPortals(game);
    this.frame++;
    const playing = game.state !== 0;
    const tx = playing ? game.px : Math.sin(t * 0.07) * 160, ty = playing ? game.py : Math.cos(t * 0.05) * 120;
    if (Math.hypot(tx - this.camX, ty - this.camY) > 400) { this.camX = tx; this.camY = ty; } // a jump: snap
    this.camX += (tx - this.camX) * (playing ? 0.12 : 0.02);
    this.camY += (ty - this.camY) * (playing ? 0.12 : 0.02);
    const sh = playing && game.shake > 0 && this.flat.shakeOn ? game.shake * SHAKE_PX * S : 0;
    st.shake.x = (Math.random() - 0.5) * sh; st.shake.y = (Math.random() - 0.5) * sh;
    st.punch = playing && this.flat.punchOn ? game.punch || 0 : 0; // camera punch (plan "Rasa Pukulan" B)
    st.look(this.camX, this.camY);
    sunAt(this.moon, this.camX * S, this.camY * S, [-10, 20, -8]); // follows the camera: its shadows cover the view

    this.setWalls(false, this.camX, this.camY, 1 / 60);
    this.lights(game, t, playing);
    this.actors.fx3d(game, t, playing); // before the decal: it sorts the particles into air / ground
    if (!lite || this.frame % 2 === 0) this.actors.paintDecal(game, t, lite, this.camX, this.camY);
    this.actors.drawHero(game, t, playing, lite);
    this.actors.drawEnemies(game, t, playing);
    this.animate(game, t);
    st.render(this.scene);
    this.actors.overlay(game, playing, playing ? 1 - game.floorT * 2.5 : 0);
    if (playing) this.labels(game);
  }

  // what each portal does, on the floor below its ring (over the beam it can slide under the HUD)
  labels(game) {
    const g = this.view.ctx, dpr = this.view.c.width / innerWidth;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.font = '700 15px Barlow, system-ui, sans-serif'; g.textAlign = 'center';
    for (const q of game.portals) {
      const p = this.stage.project(q.x, q.y + 62);
      if (!p) continue;
      const name = portalLabel(q.kind, game.floor);
      g.globalAlpha = q.armed ? 1 : 0.5;
      g.lineWidth = 4; g.strokeStyle = 'rgba(10,8,20,.9)'; g.strokeText(name, p.x, p.y);
      g.fillStyle = `rgb(${PORTAL_RGB[q.kind]})`; g.fillText(name, p.x, p.y);
    }
    g.globalAlpha = 1;
    g.setTransform(1, 0, 0, 1, 0, 0);
  }

  lights(game, t, playing) {
    const theme = game.dungeon.theme, list = [];
    decorLights(game.room, theme, t, list);
    if (playing) for (const p of game.portals) list.push({ x: p.x, y: p.y - 10, r: 200, rgb: PORTAL_RGB[p.kind] || '200,200,255', tint: 0.2 });
    const px = this.camX, py = this.camY;
    list.sort((a, b) => Math.hypot(a.x - px, a.y - py) - Math.hypot(b.x - px, b.y - py));
    const n = this.stage.lite ? 2 : 4;
    this.pool.forEach((L, i) => {
      const l = i < n ? list[i] : null;
      if (!l) { L.intensity = 0; return; }
      L.position.set(l.x * S, 2, l.y * S); L.color.copy(rgbColor(l.rgb)); L.distance = l.r * S * 2; L.intensity = 110 * l.tint * LOOK.points;
    });
    const dark = game.dark;
    this.hemi.intensity = (dark ? 0.35 : 2.4) * LOOK.ambient;
    this.moon.intensity = (dark ? 0.1 : 1.1) * LOOK.key;
    this.heroLight.position.set(game.px * S, 2.4, game.py * S);
    this.heroLight.intensity = playing ? (dark ? 12 : 7) : 0;
  }

  animate(game, t) {
    this.roomGroup.traverse((o) => { if (o.userData.flicker != null) o.scale.setScalar(1 + Math.sin(t * 11 + o.userData.flicker) * 0.12); });
    this.rune.material.opacity = game.floorClear ? 0.75 + Math.sin(t * 2) * 0.15 : 0.18;
    for (const grp of this.portalGroup.children) {
      const { ring, beam, p } = grp.userData;
      const k = Math.min(1, (game.clearT ?? 1) * 1.5);
      grp.scale.setScalar(0.3 + 0.7 * k);
      ring.rotation.z = t * (p.armed === false ? 0.6 : 1.6);
      beam.material.opacity = (p.armed === false ? 0.12 : 0.26) + Math.sin(t * 3) * 0.05;
    }
  }
}
