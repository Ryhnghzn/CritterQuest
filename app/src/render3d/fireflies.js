// Fireflies (plan C4, like the look prototype): a few dozen glowing specks drifting at knee to
// head height around the camera target at night in green places. Visual only (Math.random).
import * as THREE from 'three';
import { S } from './stage.js';

const N = 48, R = 13; // count, spread radius (metres)
let tex = null;
function glow() {
  if (tex) return tex;
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  return (tex = new THREE.CanvasTexture(c));
}

export class Fireflies {
  constructor(scene) {
    this.pos = new Float32Array(N * 3); this.col = new Float32Array(N * 3);
    this.seed = Array.from({ length: N }, () => ({ x: (Math.random() - 0.5) * 2 * R, z: (Math.random() - 0.5) * 2 * R, h: 0.3 + Math.random() * 1.5, ph: Math.random() * 9, sp: 0.3 + Math.random() * 0.5 }));
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.points = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.22, map: glow(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.points.frustumCulled = false; this.points.renderOrder = 4; scene.add(this.points);
  }
  // cx, cy: camera target (game units); amount 0..1 (0 = hidden: by day, in deserts)
  update(t, cx, cy, amount) {
    this.points.visible = amount > 0.02;
    if (!this.points.visible) return;
    const tx = cx * S, tz = cy * S;
    for (let i = 0; i < N; i++) {
      const f = this.seed[i];
      // each one wanders on its own slow loop; positions wrap round the camera so they stay near
      let x = f.x + Math.sin(t * f.sp + f.ph) * 1.6, z = f.z + Math.cos(t * f.sp * 0.8 + f.ph * 1.3) * 1.6;
      x = ((x - tx) % (2 * R) + 3 * R) % (2 * R) - R + tx; z = ((z - tz) % (2 * R) + 3 * R) % (2 * R) - R + tz;
      this.pos[i * 3] = x; this.pos[i * 3 + 1] = f.h + Math.sin(t * 1.7 + f.ph) * 0.25; this.pos[i * 3 + 2] = z;
      const blink = Math.max(0, Math.sin(t * 1.3 + f.ph * 2)) ** 2 * amount;
      this.col[i * 3] = 0.95 * blink; this.col[i * 3 + 1] = 0.85 * blink; this.col[i * 3 + 2] = 0.4 * blink;
    }
    this.points.geometry.attributes.position.needsUpdate = true; this.points.geometry.attributes.color.needsUpdate = true;
  }
}
