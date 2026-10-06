// Mundo 3D: relevo, céu dinâmico, rio, cachoeira, Pedra Branca, Mata Atlântica,
// construções de época e ferrovia. Tudo procedural (sem downloads pesados).
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { heightAt, riverX, noise, ss, lerp, rng, WATER_Y, FALLS, trackX, trackY } from './terrain.js';
import { Builder, G, CLAY, Character, SURF, UNIFORMS, surfMaterial } from './characters.js';
import { P } from './story.js';

const Q = new URLSearchParams(location.search).get('q');
export const LOW = Q === 'low' || Q === 'test' || (Q !== 'high' && /Quest|OculusBrowser|Android|iPhone|iPad|Mobile/i.test(navigator.userAgent));
const TEST = Q === 'test';
const U = UNIFORMS;

// ---------- texturas de texto (placas) ----------
export function textCanvas(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function signTex(text, bg = '#3b2416', fg = '#f1e3c2') {
  return textCanvas(512, 128, (x, w, h) => {
    x.fillStyle = bg; x.fillRect(0, 0, w, h);
    x.strokeStyle = fg; x.lineWidth = 6; x.strokeRect(10, 10, w - 20, h - 20);
    x.fillStyle = fg; x.font = 'bold 62px Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(text, w / 2, h / 2 + 4);
  });
}
function sign(text, w, h, bg, fg) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: signTex(text, bg, fg), roughness: 0.7 }));
  m.material.userData.own = true;
  return m;
}

// ---------- materiais ----------
const M = {
  tree: surfMaterial({ wind: 0.012, roughness: 0.85, flat: true }), palm: surfMaterial({ wind: 0.03, roughness: 0.85, flat: true }),
  grass: surfMaterial({ wind: 0.12, roughness: 0.9, flat: true }), still: surfMaterial({ roughness: 0.9, flat: true }),
  clay: CLAY
};

// ---------- vegetação (geometrias base) ----------
const T = SURF;
function treeGeo(variant) {
  const b = new Builder(); b.cur = T.bark;
  if (variant === 0) {
    b.seg('#5b4330', [0, -0.5, 0], [0, 4.2, 0], 0.32, 0.2);
    b.seg('#5b4330', [0, 3, 0], [1.1, 4.6, 0.3], 0.13, 0.08); b.cur = T.leaf;
    b.add(G.lsph, '#4f7d36', [0, 5.2, 0], [2.3, 1.7, 2.3]);
    b.add(G.lsph, '#5f8f3c', [1.2, 5.6, 0.6], [1.6, 1.3, 1.6]);
    b.add(G.lsph, '#456f30', [-1.1, 4.9, -0.5], [1.5, 1.2, 1.5]);
  } else if (variant === 1) {
    b.seg('#6b5240', [0, -0.5, 0], [0, 7.5, 0], 0.35, 0.18); b.cur = T.leaf;
    b.add(G.lsph, '#3f6b2e', [0, 8.2, 0], [3.0, 1.4, 3.0]);
    b.add(G.lsph, '#4e7f37', [0.8, 9.0, -0.4], [2.0, 1.1, 2.0]);
  } else {
    b.seg('#4a3a2c', [0, -0.5, 0], [0, 3.2, 0], 0.22, 0.14); b.cur = T.leaf;
    b.add(G.lsph, '#6a9440', [0, 3.8, 0], [1.6, 2.1, 1.6]);
    b.add(G.lsph, '#c9b24a', [0.6, 4.6, 0.7], [0.35, 0.35, 0.35]);
  }
  return b.geometry();
}
function palmGeo() {
  const b = new Builder(); b.cur = T.bark;
  b.seg('#7d6a55', [0, -0.3, 0], [0.2, 9, 0], 0.13, 0.1); b.cur = T.leaf;
  b.add(G.cyl, '#5c7a2e', [0.2, 9.2, 0], [0.16, 0.8, 0.16]);
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2;
    b.add(G.lsph, i % 2 ? '#4f7d2e' : '#5e8e36', [0.2 + Math.sin(a) * 1.3, 9.3 - 0.4, Math.cos(a) * 1.3], [0.28, 0.08, 1.6], [0.5, a, 0]);
  }
  return b.geometry();
}
function bananaGeo() {
  const b = new Builder(); b.cur = T.bark;
  b.seg('#6f8a3c', [0, -0.2, 0], [0, 2.3, 0], 0.18, 0.14); b.cur = T.leaf;
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2 + 0.3;
    b.add(G.lsph, i % 2 ? '#7fae45' : '#6c9c3a', [Math.sin(a) * 1.0, 2.6, Math.cos(a) * 1.0], [0.4, 0.06, 1.3], [0.55, a, 0]);
  }
  return b.geometry();
}
function shrubGeo(c1, c2) {
  const b = new Builder(); b.cur = T.leaf;
  b.add(G.lsph, c1, [0, 0.45, 0], [0.9, 0.7, 0.9]);
  b.add(G.lsph, c2, [0.5, 0.6, 0.2], [0.55, 0.5, 0.55]);
  b.add(G.lsph, c1, [-0.4, 0.5, -0.3], [0.5, 0.45, 0.5]);
  return b.geometry();
}
function coffeeGeo() {
  const b = new Builder(); b.cur = T.bark;
  b.seg('#5a4430', [0, 0, 0], [0, 0.5, 0], 0.05, 0.04); b.cur = T.leaf;
  b.add(G.lsph, '#2f5a26', [0, 1.0, 0], [0.75, 0.95, 0.75]);
  b.add(G.lsph, '#38692c', [0.2, 1.5, 0.1], [0.5, 0.5, 0.5]); b.cur = T.smooth;
  for (let i = 0; i < 7; i++) { const a = i * 2.4; b.add(G.tiny, '#b5271f', [Math.sin(a) * 0.62, 0.8 + (i % 3) * 0.25, Math.cos(a) * 0.62], 0.06); }
  return b.geometry();
}
const BLADE = new THREE.ConeGeometry(1, 1, 3, 1, true);
function grassGeo() {
  const b = new Builder();
  for (let i = 0; i < 5; i++) { const a = i * 1.3; b.add(BLADE, i % 2 ? '#7a9e42' : '#6a8f3a', [Math.sin(a) * 0.15, 0.3, Math.cos(a) * 0.15], [0.06, 0.65, 0.06], [Math.sin(a) * 0.25, 0, Math.cos(a) * 0.25]); }
  return b.geometry();
}
function flowerGeo() {
  const b = new Builder();
  b.seg('#5f8a3a', [0, 0, 0], [0, 0.35, 0], 0.012);
  b.add(G.tiny, '#ffffff', [0, 0.38, 0], [0.07, 0.04, 0.07]);
  b.add(G.tiny, '#f2c94c', [0, 0.4, 0], 0.025);
  return b.geometry();
}
function rockGeo() {
  const b = new Builder(); b.cur = T.rock;
  b.add(new THREE.DodecahedronGeometry(1, 0), '#8a8378', [0, 0.2, 0], [1, 0.7, 1.2]);
  b.add(new THREE.DodecahedronGeometry(0.6, 0), '#7b7468', [0.8, 0.1, 0.3], [1, 0.8, 1]);
  return b.geometry();
}
const VEG = {};
function vegGeos() {
  if (VEG.t0) return VEG;
  Object.assign(VEG, {
    t0: [treeGeo(0), M.tree], t1: [treeGeo(1), M.tree], t2: [treeGeo(2), M.tree], palm: [palmGeo(), M.palm], banana: [bananaGeo(), M.palm],
    shrub: [shrubGeo('#3f6b2e', '#4e7d36'), M.tree], fern: [shrubGeo('#557f34', '#679540'), M.grass], coffee: [coffeeGeo(), M.tree],
    grass: [grassGeo(), M.grass], flower: [flowerGeo(), M.grass], rock: [rockGeo(), M.still]
  });
  for (const [g] of Object.values(VEG)) g.userData.shared = true;
  return VEG;
}

// Instâncias agrupadas em blocos espaciais (culling por bloco, inclusive nas sombras)
function instanced(list, group, cast = true) {
  const V = vegGeos(), tiles = new Map(), T = 90;
  for (const it of list) {
    const key = it.k + '|' + Math.floor(it.x / T) + '|' + Math.floor(it.z / T);
    if (!tiles.has(key)) tiles.set(key, []);
    tiles.get(key).push(it);
  }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color(), up = new THREE.Vector3(0, 1, 0);
  for (const [key, arr] of tiles) {
    const [geo, mat] = V[key.split('|')[0]];
    const im = new THREE.InstancedMesh(geo, mat, arr.length);
    arr.forEach((it, i) => {
      q.setFromAxisAngle(up, it.r); s.setScalar(it.s); if (it.sy) s.y *= it.sy;
      m4.compose(p.set(it.x, it.y, it.z), q, s); im.setMatrixAt(i, m4);
      c.setRGB(1 + (it.hue || 0) * 2, 1 + (it.l || 0), 1 - (it.hue || 0) * 2);
      im.setColorAt(i, c);
    });
    im.computeBoundingSphere();
    im.castShadow = cast && !/grass|flower|fern/.test(key); im.receiveShadow = true;
    group.add(im);
  }
}

// ---------- construções ----------
function foundation(b, w, d, color = '#7d7266', depth = 6) { const c = b.cur; b.cur = T.stone; b.add(G.box, color, [0, -depth / 2 + 0.25, 0], [w + 0.3, depth, d + 0.3]); b.cur = c; }
function gableRoof(b, w, d, h, roof, over = 0.5, y0 = 0) {
  const c0 = b.cur; b.cur = T.tile;
  const half = w / 2 + over, ang = Math.atan2(h, half), len = Math.hypot(half, h);
  for (const sx of [-1, 1]) b.add(G.box, roof, [sx * half / 2, y0 + h / 2, 0], [len, 0.16, d + over * 2], [0, 0, -sx * ang]);
  b.add(G.box, '#6b2f1f', [0, y0 + h + 0.02, 0], [0.25, 0.2, d + over * 2 + 0.05]);
  b.cur = c0;
}
function gableEnds(b, w, d, h, wall, y0, surf = T.plaster) {
  const c0 = b.cur; b.cur = surf;
  const shape = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, h)]);
  const g = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
  b.add(g, wall, [0, y0, -d / 2]); b.cur = c0;
}
function windows(b, w, d, h, n, color, frame = '#f3efe6', y = 1.5, sides = [1, -1]) {
  for (const sz of sides) for (let i = 0; i < n; i++) {
    const x = (i + 0.5) / n * w - w / 2;
    b.cur = T.wood; b.add(G.box, frame, [x, y, sz * (d / 2 + 0.02)], [0.9, 1.25, 0.08]);
    b.cur = T.glass; b.add(G.box, color, [x, y, sz * (d / 2 + 0.05)], [0.7, 1.05, 0.06]);
    b.cur = T.wood; b.add(G.box, frame, [x, y, sz * (d / 2 + 0.07)], [0.06, 1.05, 0.04]);
  }
}
function house(o) {
  const b = new Builder(), { w, d, h } = o;
  foundation(b, w, d, o.base);
  b.cur = T.plaster; b.add(G.box, o.wall, [0, h / 2 + 0.25, 0], [w, h, d]);
  b.cur = T.stone; if (o.trim) b.add(G.box, o.trim, [0, 0.45, 0], [w + 0.06, 0.4, d + 0.06]);
  gableRoof(b, w, d, o.roofH || 1.8, o.roof, 0.6, h + 0.25);
  gableEnds(b, w, d, o.roofH || 1.8, o.wall, h + 0.25);
  if (o.win) windows(b, w, d, h, o.win, o.winColor || '#2f5d7a', o.frame, h * 0.55 + 0.25);
  b.cur = T.wood; b.add(G.box, o.door || '#5a3a22', [o.doorX || 0, 1.15, d / 2 + 0.05], [1.0, 1.9, 0.1]);
  b.cur = T.stone; if (o.chimney) b.add(G.box, '#8a7d6e', [w * 0.3, h + 1.6, -d * 0.2], [0.6, 1.6, 0.6]);
  b.cur = T.plaster;
  return b;
}
function casaGrande() {
  const b = house({ w: 17, d: 9, h: 4.2, wall: '#f1ece2', roof: '#a5482d', trim: '#c9c1b2', win: 7, winColor: '#2b5d86', roofH: 2.6, base: '#8b8173', door: '#2b5d86' });
  for (let i = 0; i < 6; i++) b.add(G.cyl, '#f6f2ea', [-7 + i * 2.8, 2.1, 6], [0.18, 3.8, 0.18]);
  b.cur = T.tile; b.add(G.box, '#a5482d', [0, 4.2, 6], [17.6, 0.18, 3.4], [-0.12, 0, 0]);
  b.cur = T.stone; b.add(G.box, '#bdb3a3', [0, -0.9, 6], [17, 2.7, 3.2]);
  for (let i = 0; i < 4; i++) b.add(G.box, '#9a907f', [0, -0.4 - i * 0.2, 8 + i * 0.4], [4, 1.2, 0.5]);
  return b;
}
function senzala() {
  const b = new Builder(), w = 22, d = 5.5, h = 2.6;
  foundation(b, w, d, '#6f6456');
  b.cur = T.plaster; b.add(G.box, '#a4825a', [0, h / 2 + 0.25, 0], [w, h, d]);
  gableRoof(b, w, d, 1.4, '#8a4a30', 0.7, h + 0.25); gableEnds(b, w, d, 1.4, '#a4825a', h + 0.25);
  b.cur = T.wood; for (let i = 0; i < 6; i++) b.add(G.box, '#2a1d14', [-9 + i * 3.6, 1.05, d / 2 + 0.05], [0.9, 1.7, 0.08]);
  return b;
}
function rancho(c = '#8a6a48') {
  const b = new Builder(), w = 4.4, d = 3.6, h = 2.0;
  b.cur = T.plaster; b.add(G.box, '#5e4a36', [0, -1.6, 0], [w + 0.4, 3.6, d + 0.4]);
  b.add(G.box, c, [0, h / 2 + 0.2, 0], [w, h, d]); b.cur = T.bark;
  for (let i = 0; i < 9; i++) b.add(G.box, '#5c432e', [-w / 2 + 0.25 + i * 0.49, h / 2 + 0.2, d / 2 + 0.02], [0.07, h, 0.05]);
  b.cur = T.wood; b.add(G.box, '#2a1d14', [0.6, 0.95, d / 2 + 0.06], [0.85, 1.5, 0.06]);
  b.cur = T.thatch; const half = w / 2 + 0.8, H = 1.9, ang = Math.atan2(H, half), len = Math.hypot(half, H);
  for (const sx of [-1, 1]) {
    b.add(G.box, '#bfa060', [sx * half / 2, h + 0.2 + H / 2, 0], [len, 0.3, d + 1.4], [0, 0, -sx * ang]);
    b.add(G.box, '#a88a4c', [sx * (half - 0.05), h + 0.2 - 0.05, 0], [0.4, 0.3, d + 1.45], [0, 0, -sx * ang]);
  }
  gableEnds(b, w, d, H, '#9c7a52', h + 0.2, T.wood);
  return b;
}
function capela() {
  const b = house({ w: 7, d: 12, h: 5, wall: '#f4f0e8', roof: '#a5482d', trim: '#d9cdb7', roofH: 2.6, door: '#6b3b22', base: '#8b8173' });
  b.cur = T.plaster; b.add(G.box, '#f4f0e8', [0, 4.5, 6.2], [2.8, 9, 2.6]);
  b.cur = T.tile; b.add(new THREE.ConeGeometry(2.1, 2.6, 4), '#a5482d', [0, 10.3, 6.2], 1, [0, Math.PI / 4, 0]);
  b.cur = T.smooth; b.add(G.box, '#e3d18f', [0, 12.2, 6.2], [0.12, 1.4, 0.12]); b.add(G.box, '#e3d18f', [0, 12.4, 6.2], [0.7, 0.12, 0.12]);
  b.add(G.box, '#3b2a1c', [0, 7.4, 7.55], [1, 1.4, 0.1]);
  b.add(G.cyl, '#c9a45a', [0, 7.3, 7.0], [0.35, 0.5, 0.35]);
  b.cur = T.wood; b.add(G.box, '#6b3b22', [0, 1.3, 7.55], [1.3, 2.4, 0.1]);
  b.cur = T.glass; b.add(G.cyl, '#3a5a7a', [0, 6.2, 7.52], [0.55, 0.06, 0.55], [Math.PI / 2, 0, 0]);
  return b;
}
function italianHouse() {
  const b = new Builder(), w = 9, d = 7;
  foundation(b, w, d, '#8a7d6e');
  b.cur = T.stone; b.add(G.box, '#b9aa92', [0, 1.55, 0], [w, 2.6, d]);
  b.cur = T.wood; b.add(G.box, '#9a6a42', [0, 4.15, 0], [w, 2.6, d]);
  gableRoof(b, w, d, 2.2, '#a5482d', 0.6, 5.45); gableEnds(b, w, d, 2.2, '#9a6a42', 5.45, T.wood);
  for (const x of [-2.8, 2.8]) for (const y of [1.6, 4.2]) {
    b.cur = T.plaster; b.add(G.box, '#efe6d2', [x, y, d / 2 + 0.05], [1.0, 1.3, 0.08]);
    b.cur = T.wood; b.add(G.box, '#3f6a4a', [x - 0.75, y, d / 2 + 0.07], [0.45, 1.3, 0.06]); b.add(G.box, '#3f6a4a', [x + 0.75, y, d / 2 + 0.07], [0.45, 1.3, 0.06]);
    b.cur = T.glass; b.add(G.box, '#2c2620', [x, y, d / 2 + 0.06], [0.8, 1.1, 0.06]);
  }
  b.cur = T.wood; b.add(G.box, '#5a3a22', [0, 1.3, d / 2 + 0.06], [1.2, 2.1, 0.08]);
  b.add(G.box, '#7f5534', [0, 2.95, d / 2 + 0.7], [3.4, 0.15, 1.4]);
  for (let i = 0; i < 8; i++) b.add(G.box, '#6b4428', [-1.6 + i * 0.46, 3.35, d / 2 + 1.35], [0.06, 0.7, 0.06]);
  b.add(G.box, '#6b4428', [0, 3.7, d / 2 + 1.35], [3.4, 0.08, 0.08]);
  b.cur = T.stone; b.add(G.box, '#8a7d6e', [2.6, 7.3, -1.2], [0.7, 2.0, 0.7]);
  return b;
}
function houseFrame() {
  const b = new Builder(), w = 9, d = 7; b.cur = T.wood;
  b.add(G.box, '#8a7d6e', [0, 0, 0], [w + 0.3, 0.6, d + 0.3]);
  for (const x of [-w / 2, 0, w / 2]) for (const z of [-d / 2, d / 2]) b.add(G.box, '#9a6a42', [x, 2.2, z], [0.25, 4, 0.25]);
  b.add(G.box, '#9a6a42', [0, 4.2, d / 2], [w, 0.25, 0.25]); b.add(G.box, '#9a6a42', [0, 4.2, -d / 2], [w, 0.25, 0.25]);
  return b;
}
function station() {
  const b = new Builder(), w = 14, d = 6, h = 3.8; b.cur = T.stone;
  b.add(G.box, '#9b9184', [-4.1, -0.8, 0], [2.6, 2.2, 26]);
  b.add(G.box, '#bdb3a3', [-4.1, 0.33, 0], [2.7, 0.08, 26.1]);
  foundation(b, d, w, '#8b8173');
  b.cur = T.plaster; b.add(G.box, '#d8ad66', [0, h / 2 + 0.25, 0], [d, h, w]);
  b.cur = T.stone; b.add(G.box, '#7a2e24', [0, 0.55, 0], [d + 0.06, 0.6, w + 0.06]);
  for (let i = 0; i < 5; i++) { const z = -5.6 + i * 2.8; b.cur = T.wood; b.add(G.box, '#efe6d2', [-d / 2 - 0.03, 1.9, z], [0.08, 1.9, 1.0]); b.cur = i === 2 ? T.wood : T.glass; b.add(G.box, i === 2 ? '#5a2f22' : '#2f4e3a', [-d / 2 - 0.06, 1.8, z], [0.06, 1.7, 0.8]); }
  b.cur = T.tile;
  const half = d / 2 + 1.8, H = 1.4, ang = Math.atan2(H, half), len = Math.hypot(half, H);
  for (const sx of [-1, 1]) b.add(G.box, '#7a2e24', [sx * half / 2, h + 0.25 + H / 2, 0], [len, 0.15, w + 1.6], [0, 0, sx * ang]);
  const sh = new THREE.Shape([new THREE.Vector2(-d / 2, 0), new THREE.Vector2(d / 2, 0), new THREE.Vector2(0, H)]);
  b.cur = T.plaster; b.add(new THREE.ExtrudeGeometry(sh, { depth: w, bevelEnabled: false }), '#d8ad66', [0, h + 0.25, -w / 2]);
  b.cur = T.wood; for (let i = 0; i < 6; i++) b.seg('#6b2a20', [-4.5, 0.35, -6.5 + i * 2.6], [-4.5, h + 0.2, -6.5 + i * 2.6], 0.07);
  b.add(G.box, '#6b4428', [-3.6, 0.8, 3.5], [0.5, 0.08, 2.2]);
  return b;
}
function shop() {
  const b = house({ w: 10, d: 7, h: 3.8, wall: '#ead9b2', roof: '#a5482d', trim: '#7a5a3a', base: '#8b8173', door: '#2f5d7a' });
  b.cur = T.wood; for (const x of [-3, 3]) b.add(G.box, '#2f5d7a', [x, 1.25, 3.55], [1.6, 2.0, 0.1]);
  b.cur = T.cloth; b.add(G.box, '#c8553d', [0, 3.35, 4.3], [10.4, 0.1, 1.9], [0.3, 0, 0]);
  for (let i = 0; i < 10; i++) b.add(G.box, i % 2 ? '#f2e6cc' : '#c8553d', [-4.7 + i * 1.04, 3.0, 5.2], [1.04, 0.3, 0.05]);
  return b;
}
function bridge() {
  const b = new Builder(), L = 22; b.cur = T.wood;
  b.add(G.box, '#7a5a3a', [0, 0.35, 0], [L, 0.25, 3.2]);
  for (let i = 0; i < 22; i++) b.add(G.box, i % 2 ? '#8a6a48' : '#6f5238', [-L / 2 + 0.5 + i, 0.5, 0], [0.9, 0.06, 3.3]);
  for (const sz of [-1.55, 1.55]) {
    b.add(G.box, '#5c432e', [0, 1.35, sz], [L, 0.12, 0.12]);
    for (let i = 0; i <= 11; i++) b.add(G.box, '#5c432e', [-L / 2 + i * 2, 0.9, sz], [0.14, 1.0, 0.14]);
  }
  b.cur = T.bark; for (const x of [-6, 0, 6]) for (const sz of [-1.4, 1.4]) b.add(G.cyl, '#4a3a2c', [x, -1.2, sz], [0.18, 3.2, 0.18]);
  return b;
}
function locomotive() {
  const b = new Builder();
  b.add(G.cyl, '#1d1d20', [0, 1.75, 1.2], [0.85, 4.6, 0.85], [Math.PI / 2, 0, 0]);
  b.add(G.cyl, '#3a3a40', [0, 1.75, 3.55], [0.9, 0.2, 0.9], [Math.PI / 2, 0, 0]);
  b.add(G.cyl, '#1d1d20', [0, 3.0, 2.8], [0.22, 1.0, 0.22]); b.add(G.cyl, '#1d1d20', [0, 3.6, 2.8], [0.38, 0.3, 0.38]);
  b.add(G.sph, '#c9a45a', [0, 2.65, 1.2], [0.3, 0.3, 0.4]);
  b.add(G.box, '#5e1d1a', [0, 2.0, -2.0], [2.1, 2.6, 2.2]); b.add(G.box, '#1d1d20', [0, 3.4, -2.0], [2.4, 0.15, 2.5]);
  for (const sx of [-1, 1]) b.add(G.box, '#e8d29a', [sx * 1.06, 2.4, -1.6], [0.04, 0.7, 0.8]);
  b.add(G.box, '#26262a', [0, 0.85, 0], [1.8, 0.4, 7.2]);
  b.add(G.box, '#7a1e1a', [0, 0.6, 3.9], [1.9, 0.5, 0.4], [-0.5, 0, 0]);
  b.add(G.sph, '#fff2c0', [0, 2.0, 3.65], [0.18, 0.18, 0.1]);
  for (let i = 0; i < 4; i++) for (const sx of [-1, 1]) b.add(G.cyl, '#8a1f1a', [sx * 0.85, 0.6, -2.4 + i * 1.6], [0.55, 0.12, 0.55], [0, 0, Math.PI / 2]);
  return b;
}
function wagon(c) {
  const b = new Builder();
  b.add(G.box, '#26262a', [0, 0.85, 0], [1.9, 0.3, 7]);
  b.cur = T.wood; b.add(G.box, c, [0, 1.95, 0], [2.1, 1.9, 6.8]);
  b.add(G.box, '#3a2a1c', [0, 3.0, 0], [2.3, 0.15, 7.0]);
  b.cur = T.glass; for (let i = 0; i < 4; i++) for (const sx of [-1, 1]) b.add(G.box, '#e8d29a', [sx * 1.06, 2.15, -2.4 + i * 1.6], [0.04, 0.7, 0.9]);
  b.cur = T.smooth; for (const z of [-2.5, 2.5]) for (const sx of [-1, 1]) b.add(G.cyl, '#2a2a2a', [sx * 0.85, 0.55, z], [0.45, 0.12, 0.45], [0, 0, Math.PI / 2]);
  return b;
}
function drum(big) {
  const b = new Builder(), r = big ? 0.32 : 0.22, l = big ? 1.1 : 0.8; b.cur = T.wood;
  b.add(G.cyl, '#7a4a2a', [0, 0, 0], [r, l, r]); b.cur = T.smooth; b.add(G.cyl, '#e8d6b0', [0, l / 2 + 0.01, 0], [r * 0.97, 0.02, r * 0.97]);
  for (const y of [-l * 0.3, l * 0.3]) b.add(G.ring, '#3b2414', [0, y, 0], [r * 1.01, r * 1.01, 0.3], [Math.PI / 2, 0, 0]);
  return b;
}
function puriShelter() {
  const b = new Builder(); b.cur = T.bark;
  for (const x of [-1.6, 1.6]) b.seg('#6b4a2b', [x, -0.2, 1.2], [x, 2.3, 1.2], 0.07);
  b.seg('#6b4a2b', [-1.8, 2.25, 1.2], [1.8, 2.25, 1.2], 0.06); b.cur = T.leaf;
  for (let i = 0; i < 9; i++) {
    const x = -1.6 + i * 0.4;
    b.add(G.lsph, i % 2 ? '#5e8e36' : '#4f7d2e', [x, 1.25, 0.15], [0.32, 0.08, 1.8], [-0.95, 0, (i % 3 - 1) * 0.08]);
  }
  return b;
}
function hammock(a, c) {
  const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector3(lerp(a[0], c[0], t), lerp(1.3, 1.3, t) - Math.sin(t * Math.PI) * 0.55, lerp(a[1], c[1], t))); }
  const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.22, 6, false);
  g.scale(1, 0.35, 1);
  const b = new Builder(); b.cur = T.cloth; b.add(g, '#c8a868', [0, 0.45, 0]); return b;
}
function campfire() {
  const b = new Builder(); b.cur = T.rock;
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; b.add(G.lsph, '#6f6a62', [Math.sin(a) * 0.75, 0.08, Math.cos(a) * 0.75], [0.2, 0.14, 0.18]); }
  b.cur = T.bark; for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI; b.add(G.cyl, '#4a3020', [0, 0.18, 0], [0.08, 1.2, 0.08], [Math.PI / 2 - 0.25, a, 0]); }
  return b;
}
function collectible(kind) {
  const b = new Builder();
  switch (kind) {
    case 'urucum':
      b.add(G.lsph, '#c4301f', [0, 0, 0], [0.18, 0.22, 0.18]);
      for (let i = 0; i < 10; i++) { const a = i * 2.4, y = (i / 10 - 0.5) * 0.3; b.add(G.cone, '#d8452e', [Math.sin(a) * 0.17, y, Math.cos(a) * 0.17], [0.03, 0.09, 0.03], [Math.cos(a) * 1.5, 0, -Math.sin(a) * 1.5]); }
      b.add(G.lsph, '#c4301f', [0.25, -0.05, 0.05], [0.14, 0.17, 0.14]);
      break;
    case 'sape': b.cur = T.thatch;
      b.add(G.cyl, '#c9ad68', [0, 0, 0], [0.22, 1.2, 0.22], [0, 0, 1.3]); b.add(G.cyl, '#7a5a30', [0, 0, 0], [0.235, 0.08, 0.235], [0, 0, 1.3]);
      break;
    case 'cova':
      b.add(G.sph, '#6b4a32', [0, -0.15, 0], [0.45, 0.15, 0.45]); b.add(G.cyl, '#7a5a3a', [0, 0.1, 0], [0.12, 0.22, 0.12]);
      b.add(G.lsph, '#4f8a34', [0, 0.32, 0], [0.18, 0.18, 0.18]);
      break;
    case 'lenha': b.cur = T.bark;
      for (let i = 0; i < 3; i++) b.add(G.cyl, '#7a5638', [0, i * 0.18 - 0.1, (i - 1) * 0.12], [0.1, 1.4, 0.1], [0, 0, Math.PI / 2]);
      break;
    case 'saca': b.cur = T.cloth;
      b.add(G.sph, '#b89a68', [0, 0, 0], [0.32, 0.38, 0.24]); b.add(G.cyl, '#8a6a40', [0, 0.36, 0], [0.08, 0.12, 0.08]);
      break;
    case 'caixa': b.cur = T.wood;
      b.add(G.box, '#a27448', [0, 0, 0], [0.6, 0.5, 0.5]); for (const y of [-0.15, 0.15]) b.add(G.box, '#7a5232', [0, y, 0], [0.62, 0.06, 0.52]);
      break;
  }
  return b.mesh();
}
export { collectible };

// ---------- memorial (pedestal com os 4 protagonistas, como na imagem de referência) ----------
const ICON = {
  'LIBANÊS': (x) => { x.fillStyle = '#3b2414'; for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(60, 28 + i * 14); x.lineTo(60 - 12 - i * 6, 46 + i * 14); x.lineTo(60 + 12 + i * 6, 46 + i * 14); x.fill(); } x.fillRect(57, 86, 6, 14); },
  'ESCRAVIZADO': (x) => { x.strokeStyle = '#3b2414'; x.lineWidth = 7; x.beginPath(); x.ellipse(48, 72, 18, 11, -0.7, 0, 7); x.stroke(); x.beginPath(); x.ellipse(74, 52, 18, 11, -0.7, 0, 7); x.stroke(); },
  'ITALIANO': (x) => { x.fillStyle = '#3b2414'; x.fillRect(28, 40, 64, 56); x.fillStyle = '#d6b88c'; for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) { x.beginPath(); x.arc(36 + i * 16, 58 + r * 24, 5, Math.PI, 0); x.rect(31 + i * 16, 58 + r * 24, 10, 10); x.fill(); } },
  'INDÍGENA': (x) => { x.fillStyle = '#3b2414'; x.save(); x.translate(60, 62); x.rotate(-0.7); x.beginPath(); x.ellipse(0, 0, 13, 38, 0, 0, 7); x.fill(); x.fillRect(-2, 30, 4, 22); x.restore(); }
};
function plaqueTex(label) {
  return textCanvas(512, 128, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#e2c79a'); g.addColorStop(1, '#c9a674'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#8a6a44'; x.lineWidth = 5; x.strokeRect(6, 6, w - 12, h - 12);
    ICON[label]?.(x);
    x.font = '600 50px Georgia, serif'; x.textBaseline = 'middle'; x.textAlign = 'center';
    x.fillStyle = 'rgba(255,240,210,.6)'; x.fillText(label, 300, h / 2 + 2);
    x.fillStyle = '#3b2414'; x.fillText(label, 299, h / 2);
  });
}
export function buildMemorial(heroes, plaques) {
  const g = new THREE.Group(), W = 7.6;
  const base = new THREE.Mesh(new RoundedBoxGeometry(W, 0.34, 1.5, 4, 0.06), new THREE.MeshStandardMaterial({ color: '#5a3820', roughness: 0.45 }));
  base.position.y = 0.17; base.castShadow = base.receiveShadow = true; g.add(base);
  const top = new THREE.Mesh(new RoundedBoxGeometry(W - 0.1, 0.06, 1.4, 2, 0.02), new THREE.MeshStandardMaterial({ color: '#6b4428', roughness: 0.5 }));
  top.position.y = 0.35; top.receiveShadow = true; g.add(top);
  const chars = [];
  heroes.forEach((look, i) => {
    const x = (i - 1.5) * 1.85;
    const c = new Character(look); c.root.position.set(x, 0.38, 0); g.add(c.root); chars.push(c);
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshStandardMaterial({ map: plaqueTex(plaques[i]), roughness: 0.55, metalness: 0.1 }));
    pl.position.set(x, 0.17, 0.752); g.add(pl);
  });
  return { group: g, chars };
}

const FIRE_M = [new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb347').multiplyScalar(2.6), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff6a1f').multiplyScalar(2.2), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })];
const SMOKE_G = new THREE.IcosahedronGeometry(1, 1); SMOKE_G.userData.shared = true;

// ---------- presets de horário ----------
const PRESETS = {
  morning: { elev: 13, az: 100, sun: '#ffd2a0', sunI: 2.6, hemi: 0.9, sky: '#bcd7ff', ground: '#6b6a3a', fog: '#c6d3d6', dens: 0.0058, exp: 0.82, turb: 5, ray: 1.6, env: 0.32, night: 0 },
  day: { elev: 52, az: 160, sun: '#fff3df', sunI: 3.0, hemi: 0.95, sky: '#bcd7ff', ground: '#6b6a3a', fog: '#c0d3de', dens: 0.0048, exp: 0.66, turb: 3.5, ray: 1.2, env: 0.35, night: 0 },
  afternoon: { elev: 27, az: 245, sun: '#ffe0b0', sunI: 2.8, hemi: 0.9, sky: '#c2d6f0', ground: '#6b6a3a', fog: '#cfd3cc', dens: 0.0052, exp: 0.74, turb: 5, ray: 1.6, env: 0.32, night: 0 },
  dusk: { elev: 2.5, az: 252, sun: '#ff8a4a', sunI: 1.7, hemi: 0.55, sky: '#8a7fb8', ground: '#4a3a2a', fog: '#c98d70', dens: 0.0062, exp: 0.95, turb: 8, ray: 3, env: 0.3, night: 0.35 },
  dawn: { elev: 4, az: 88, sun: '#ffa86a', sunI: 1.9, hemi: 0.6, sky: '#9fb0d8', ground: '#4a4a32', fog: '#c8aa9c', dens: 0.0065, exp: 0.92, turb: 7, ray: 2.6, env: 0.3, night: 0.1 },
  night: { elev: -12, az: 252, lightElev: 48, lightAz: 200, sun: '#8fa8ff', sunI: 0.55, hemi: 0.32, sky: '#3a4a7a', ground: '#141a24', fog: '#0c1424', dens: 0.0075, exp: 1.05, turb: 2, ray: 0.6, env: 0.15, night: 1 }
};

// ---------- mundo ----------
export class World {
  constructor(renderer) {
    this.renderer = renderer;
    const scene = this.scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2('#c6d3d6', 0.0055);
    this.pmrem = new THREE.PMREMGenerator(renderer);
    // céu
    const sky = this.sky = new Sky(); sky.scale.setScalar(4000); scene.add(sky);
    const su = sky.material.uniforms; su.mieCoefficient.value = 0.004; su.mieDirectionalG.value = 0.82;
    su.cloudCoverage.value = 0.38; su.cloudDensity.value = 0.45; su.cloudElevation.value = 0.55; su.cloudScale.value = 0.00025;
    this.skyScene = new THREE.Scene(); this.skySun = new THREE.Vector3();
    // luzes
    this.hemi = new THREE.HemisphereLight('#bcd7ff', '#6b6a3a', 0.9); scene.add(this.hemi);
    const sun = this.sun = new THREE.DirectionalLight('#ffd2a0', 2.6);
    sun.castShadow = true; const sm = LOW ? 1024 : 2048; sun.shadow.mapSize.set(sm, sm);
    const sc = sun.shadow.camera; sc.left = sc.bottom = -48; sc.right = sc.top = 48; sc.near = 1; sc.far = 175;
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
    scene.add(sun, sun.target);
    this.timeCur = { ...PRESETS.morning }; this.timeFrom = null; this.timeTo = null; this.timeK = 1;
    this.buildTerrain(); this.buildWater(); this.buildFalls(); this.buildPedra(); this.buildSkyFx(); this.buildTrack();
    this.chapterGroup = new THREE.Group(); scene.add(this.chapterGroup);
    this.applyTime(PRESETS.morning, true);
  }

  // ----- relevo -----
  // Grade com detalhe fino na área jogável (±300 m) e mais grossa até 900 m (horizonte sem borda)
  buildTerrain() {
    const N = LOW ? 200 : 280, Hi = LOW ? 85 : 120, No = N / 2 - Hi, R0 = 300, R1 = 900;
    this.grid = { N, Hi, No, R0, R1, sIn: R0 / Hi, sOut: (R1 - R0) / No };
    const coord = j => Math.abs(j) <= Hi ? j * this.grid.sIn : Math.sign(j) * (R0 + (Math.abs(j) - Hi) * this.grid.sOut);
    const g = new THREE.PlaneGeometry(1, 1, N, N); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position, H = this.hgrid = new Float32Array((N + 1) * (N + 1));
    for (let iz = 0; iz <= N; iz++) for (let ix = 0; ix <= N; ix++) {
      const i = iz * (N + 1) + ix, x = coord(ix - N / 2), z = coord(iz - N / 2), r = Math.max(Math.abs(x), Math.abs(z));
      // serras distantes fechando o vale
      const h = heightAt(x, z) + ss(330, 760, r) * (55 + noise(x * 0.004, z * 0.004) * 45);
      p.setXYZ(i, x, h, z); H[i] = h;
    }
    g.computeVertexNormals(); g.computeBoundingSphere();
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(p.count * 3), 3));
    const tm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96 });
    tm.onBeforeCompile = sh => {
      sh.vertexShader = 'varying vec3 vWP;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = 'varying vec3 vWP;\nfloat th(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\nfloat tn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(th(i), th(i+vec2(1,0)), f.x), mix(th(i+vec2(0,1)), th(i+vec2(1,1)), f.x), f.y); }\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        float dn = tn(vWP.xz * 0.45) * 0.55 + tn(vWP.xz * 1.9) * 0.3 + tn(vWP.xz * 7.0) * 0.15;
        diffuseColor.rgb *= 0.84 + dn * 0.3;`);
    };
    this.terrain = new THREE.Mesh(g, tm);
    this.terrain.receiveShadow = true;
    this.scene.add(this.terrain);
  }
  paintTerrain(cfg) {
    const g = this.terrain.geometry, p = g.attributes.position, col = g.attributes.color, n = g.attributes.normal, c = new THREE.Color();
    const C = { grass: new THREE.Color('#5d8a37'), grass2: new THREE.Color('#7c9c45'), pasture: new THREE.Color('#8fa955'), forest: new THREE.Color('#3d6a2a'), rock: new THREE.Color('#867d70'), mud: new THREE.Color('#8f7d5a'), bed: new THREE.Color('#4e4a3a'), path: new THREE.Color('#a8865c'), soil: new THREE.Color('#8a5a3a') };
    const segs = [];
    for (const path of cfg.paths || []) for (let i = 0; i < path.length - 1; i++) segs.push([path[i], path[i + 1]]);
    const distSeg = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz))); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); };
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), d = Math.abs(x - riverX(z));
      const nv = noise(x * 0.05, z * 0.05) * 0.5 + 0.5, wild = d > 50 ? 1 : cfg.valleyForest;
      c.copy(C.grass).lerp(C.grass2, nv);
      if (wild < 0.5 && d < 60) c.lerp(C.pasture, 0.55 * (1 - wild) * (1 - ss(40, 60, d)));
      c.lerp(C.forest, ss(0.3, 0.9, wild * (0.6 + nv * 0.5)) * 0.6);
      c.lerp(C.mud, 1 - ss(5, 11, d)); if (y < WATER_Y + 0.2) c.copy(C.bed);
      const slope = 1 - n.getY(i); c.lerp(C.rock, ss(0.28, 0.5, slope));
      for (const f of cfg.fields || []) { const dd = Math.hypot(x - f[0], z - f[1]); if (dd < f[2]) c.lerp(C.soil, (1 - ss(f[2] - 4, f[2], dd)) * (0.55 + 0.25 * Math.sin(x * 1.2))); }
      let pd = 99; for (const [a, b] of segs) pd = Math.min(pd, distSeg(x, z, a, b));
      if (pd < 3) c.lerp(C.path, (1 - ss(1.2, 3, pd)) * 0.9);
      if (cfg.track && Math.abs(x - trackX(z)) < 3.2) c.lerp(new THREE.Color('#7a6a58'), 0.8);
      col.setXYZ(i, c.r, c.g, c.b);
    }
    col.needsUpdate = true;
  }

  // ----- água -----
  waterMat(extra = {}) {
    return new THREE.ShaderMaterial({
      transparent: true, fog: true, depthWrite: false,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uDeep: { value: new THREE.Color('#1f4a52') }, uShallow: { value: new THREE.Color('#4f8a7e') }, uSky: { value: new THREE.Color('#bcd7ff') }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color('#fff') }, uFlow: { value: extra.flow ?? 1 }, uPool: { value: extra.pool ? new THREE.Vector3(FALLS.x, FALLS.z, 1) : new THREE.Vector3() } }]),
      vertexShader: `varying vec2 vUv; varying vec3 vW;
        #include <fog_pars_vertex>
        void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
        }`,
      fragmentShader: `uniform float uTime, uFlow; uniform vec3 uDeep, uShallow, uSky, uSunDir, uSunCol, uPool; varying vec2 vUv; varying vec3 vW;
        float riverX(float z){ return -8.0 + 16.0 * sin(z * 0.022) + 5.0 * sin(z * 0.061 + 1.3); }
        #include <fog_pars_fragment>
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
        void main(){
          vec2 q = vW.xz * 0.35; float t = uTime * uFlow;
          float a = n(q + vec2(0.0, t * 0.9)) * 0.6 + n(q * 2.3 - vec2(t * 0.4, t * 1.3)) * 0.4;
          vec3 nrm = normalize(vec3((a - 0.5) * 0.5, 1.0, (n(q * 1.7 + vec2(t, 0.0)) - 0.5) * 0.5));
          vec3 V = normalize(cameraPosition - vW);
          float fr = pow(1.0 - max(dot(V, nrm), 0.0), 3.0);
          vec3 col = mix(uShallow, uDeep, 0.55 + a * 0.3);
          col = mix(col, uSky, fr * 0.65);
          float streak = smoothstep(0.72, 0.95, n(vec2(vW.x * 0.9, vW.z * 0.25 - t * 1.6)));
          col += streak * 0.12 * uFlow;
          vec3 R = reflect(-uSunDir, nrm); float sp = pow(max(dot(R, V), 0.0), 120.0);
          col += uSunCol * sp * 1.6;
          // espuma nas margens e no vau; mais claro onde é raso
          float edge = uPool.z > 0.5 ? length(vW.xz - uPool.xy) - 4.6 : abs(vW.x - riverX(vW.z)) - 4.4;
          float ford = 1.0 - smoothstep(3.0, 7.0, abs(vW.z - 30.0));
          col = mix(col, uShallow * 1.25, max(ford * 0.45, smoothstep(0.0, 1.6, edge) * 0.4));
          float fn = n(vW.xz * 1.3 + vec2(t * 0.6, -t)) ;
          float foam = smoothstep(0.55, 1.0, edge * 0.55 + fn * 0.6) + ford * smoothstep(0.62, 0.9, fn) * 0.6;
          col = mix(col, vec3(0.92, 0.95, 0.95) * (0.6 + 0.4 * length(uSunCol) / 1.7), clamp(foam, 0.0, 1.0) * 0.75);
          gl_FragColor = vec4(col, 0.86);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }`
    });
  }
  buildWater() {
    const pts = [], uvs = [], idx = [], Wd = 9.5;
    let k = 0;
    for (let z = -880; z <= 880; z += 2.5, k++) {
      const x = riverX(z);
      pts.push(x - Wd, WATER_Y, z, x + Wd, WATER_Y, z); uvs.push(0, z / 10, 1, z / 10);
      if (k) { const a = (k - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.setIndex(idx);
    this.waterMats = [this.waterMat()];
    this.river = new THREE.Mesh(g, this.waterMats[0]); this.river.renderOrder = 2; this.scene.add(this.river);
  }
  buildFalls() {
    const F = FALLS, pool = this.waterMat({ flow: 0.35, pool: true }); this.waterMats.push(pool);
    const pm = new THREE.Mesh(new THREE.CircleGeometry(7, 40), pool); pm.rotation.x = -Math.PI / 2; pm.position.set(F.x, F.y - 0.5, F.z); pm.renderOrder = 2; this.scene.add(pm);
    // paredão de rocha
    const b = new Builder(), R = rng(42);
    b.cur = SURF.rock;
    for (let i = 0; i < 20; i++) { // blocos embutidos na face do paredão
      let dz = (R() - 0.5) * 18; if (Math.abs(dz) < 3) dz = Math.sign(dz || 1) * (3 + R() * 2);
      b.add(new THREE.DodecahedronGeometry(1, 0), i % 3 ? '#77706a' : '#8a837a', [F.x - 5.2 - R() * 1.2, F.y + 1 + R() * 16, F.z + dz], [2 + R() * 2, 2 + R() * 3, 2 + R() * 2], [R() * 3, R() * 3, R() * 3]);
    }
    for (let i = 0; i < 8; i++) b.add(new THREE.DodecahedronGeometry(1, 0), '#6f685f', [F.x - 7 - R() * 7, F.y + 19, F.z + (R() - 0.5) * 14], [2.5, 1.6, 2.5], [R(), R(), R()]);
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, x = F.x + Math.cos(a) * 7.8, z = F.z + Math.sin(a) * 7.8; b.add(G.lsph, '#6a6560', [x, Math.min(F.y - 0.6, heightAt(x, z) - 0.2), z], [1.1, 0.7, 1.1]); }
    const rocks = b.mesh(M.still); this.scene.add(rocks);
    // queda d'água
    const H = 20;
    const fm = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, uniforms: { uTime: U.time },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; vec3 p = position; p.z += sin(uv.y * 3.14) * 0.6 * (1.0 - uv.y); gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0); }`,
      fragmentShader: `uniform float uTime; varying vec2 vUv;
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
        float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
        void main(){ float s = n(vec2(vUv.x * 14.0, vUv.y * 3.0 + uTime * 2.6)) * 0.6 + n(vec2(vUv.x * 30.0, vUv.y * 6.0 + uTime * 4.0)) * 0.4;
          vec3 c = mix(vec3(0.55,0.75,0.78), vec3(0.97,0.99,1.0), smoothstep(0.35, 0.8, s));
          float a = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x) * (0.75 + s * 0.25);
          gl_FragColor = vec4(c, a);
          #include <colorspace_fragment>
        }`
    });
    const fall = new THREE.Mesh(new THREE.PlaneGeometry(5, H, 1, 16), fm);
    fall.position.set(F.x - 2.9, F.y - 0.5 + H / 2, F.z); fall.rotation.y = Math.PI / 2; this.scene.add(fall);
    // espuma
    this.foam = []; const fmM = new THREE.MeshStandardMaterial({ color: '#f4f8f8', roughness: 1, transparent: true, opacity: 0.85 });
    for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(G.lsph, fmM); m.position.set(F.x - 2.4 + Math.random() * 1.5, F.y - 0.5, F.z + (Math.random() - 0.5) * 4); m.userData.ph = Math.random() * 6; this.scene.add(m); this.foam.push(m); }
  }
  buildPedra() {
    const g = new THREE.SphereGeometry(1, 72, 48), p = g.attributes.position, cols = [];
    const c = new THREE.Color(), a = new THREE.Color('#dedad2'), d = new THREE.Color('#8c877e'), moss = new THREE.Color('#5d7a3a');
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const k = 1 + noise(x * 2.2, z * 2.2 + y) * 0.06 + noise(x * 6, y * 6) * 0.015;
      p.setXYZ(i, x * k, Math.max(y, -0.3) * (y > 0 ? 1 : 0.3), z * k);
      const streak = ss(0.35, 0.8, noise(Math.atan2(x, z) * 9, y * 0.6) * 0.5 + 0.5);
      c.copy(a).lerp(d, streak * 0.6); c.lerp(moss, 1 - ss(-0.05, 0.25, y));
      cols.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }));
    const [x, z] = P.pedra; m.scale.set(40, 66, 30); m.position.set(x, heightAt(x, z) - 18, z); m.rotation.y = 0.5;
    m.castShadow = true; m.receiveShadow = true; this.scene.add(m);
  }
  buildTrack() {
    const g = new THREE.Group(), sleepers = [], rails = [];
    this.trackPts = [];
    for (let z = 300; z >= -300; z -= 1.2) this.trackPts.push(new THREE.Vector3(trackX(z), trackY(z) + 0.15, z));
    const sm = new THREE.InstancedMesh(new THREE.BoxGeometry(2.4, 0.16, 0.3), new THREE.MeshStandardMaterial({ color: '#5a4430', roughness: 0.9 }), this.trackPts.length);
    const rm = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 0.14, 1.25), new THREE.MeshStandardMaterial({ color: '#6b6460', roughness: 0.4, metalness: 0.6 }), this.trackPts.length * 2);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), o = new THREE.Object3D();
    this.trackPts.forEach((p, i) => {
      const n = this.trackPts[Math.min(i + 1, this.trackPts.length - 1)], pr = this.trackPts[Math.max(i - 1, 0)];
      o.position.copy(p); o.lookAt(p.x + (n.x - pr.x), p.y + (n.y - pr.y), p.z + (n.z - pr.z)); o.updateMatrix();
      sm.setMatrixAt(i, o.matrix);
      for (const s of [-1, 1]) { o.position.copy(p).add(new THREE.Vector3(s * 0.72, 0.15, 0).applyQuaternion(o.quaternion)); o.updateMatrix(); rm.setMatrixAt(i * 2 + (s > 0 ? 1 : 0), o.matrix); o.position.copy(p); }
    });
    sm.receiveShadow = rm.receiveShadow = true; sm.computeBoundingSphere(); rm.computeBoundingSphere();
    g.add(sm, rm); this.track = g; g.visible = false; this.scene.add(g);
  }
  buildSkyFx() {
    // estrelas
    const n = 1500, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = 1500, s = Math.sqrt(1 - u * u); pos.set([Math.cos(a) * s * r, Math.abs(u) * r * 0.9 + 60, Math.sin(a) * s * r], i * 3); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#fff', size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    this.scene.add(this.stars);
    this.moon = new THREE.Mesh(new THREE.SphereGeometry(28, 24, 16), new THREE.MeshBasicMaterial({ color: '#f4f1e2', fog: false, transparent: true, opacity: 0 }));
    this.moon.position.setFromSphericalCoords(1400, THREE.MathUtils.degToRad(42), THREE.MathUtils.degToRad(200)); this.scene.add(this.moon);
    // vaga-lumes / pólen ao redor do jogador
    const fn = 160, fp = new Float32Array(fn * 3); for (let i = 0; i < fn * 3; i++) fp[i] = (Math.random() - 0.5) * 50;
    const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(fp, 3));
    this.motes = new THREE.Points(fg, new THREE.PointsMaterial({ color: '#fff3c4', size: 0.14, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.motes.frustumCulled = false; this.scene.add(this.motes);
    // pássaros (silhueta de asa recortada, voando alto)
    this.birds = new THREE.Group(); const bm = new THREE.MeshStandardMaterial({ color: '#2a2622', side: THREE.DoubleSide, roughness: 1 });
    const wing = new THREE.BufferGeometry(); wing.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.12, 0, 0, -0.14, 0.95, 0, -0.32, 0, 0, 0.12, 0.95, 0, -0.32, 0.55, 0, 0.02], 3)); wing.computeVertexNormals();
    const body = new THREE.SphereGeometry(1, 8, 6); body.scale(0.09, 0.07, 0.32);
    for (let i = 0; i < 10; i++) {
      const bird = new THREE.Group(), pl = new THREE.Mesh(wing, bm), pr = new THREE.Mesh(wing, bm); pr.scale.x = -1;
      bird.add(pl, pr, new THREE.Mesh(body, bm)); bird.scale.setScalar(1.4);
      bird.userData = { pl, pr, r: 40 + Math.random() * 60, h: 55 + Math.random() * 30, s: 0.1 + Math.random() * 0.08, ph: Math.random() * 6, cx: (Math.random() - 0.5) * 120, cz: (Math.random() - 0.5) * 120 };
      this.birds.add(bird);
    }
    this.scene.add(this.birds);
  }

  // ----- horário -----
  setTime(name, instant = false) {
    const to = PRESETS[name]; if (!to) return;
    if (instant) { this.timeTo = null; this.applyTime(to, true); return; }
    this.timeFrom = { ...this.timeCur }; this.timeTo = to; this.timeK = 0;
  }
  applyTime(t, env) {
    const cur = this.timeCur; Object.assign(cur, t);
    const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - t.elev), THREE.MathUtils.degToRad(t.az));
    this.sky.material.uniforms.sunPosition.value.copy(sunDir);
    const su = this.sky.material.uniforms; su.turbidity.value = t.turb; su.rayleigh.value = t.ray;
    su.cloudCoverage.value = lerp(0.38, 0.2, t.night);
    const le = t.lightElev ?? t.elev, la = t.lightAz ?? t.az;
    this.lightDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - Math.max(le, 6)), THREE.MathUtils.degToRad(la));
    this.sun.color.set(t.sun); this.sun.intensity = t.sunI;
    this.hemi.color.set(t.sky); this.hemi.groundColor.set(t.ground); this.hemi.intensity = t.hemi;
    this.scene.fog.color.set(t.fog); this.scene.fog.density = t.dens;
    this.renderer.toneMappingExposure = t.exp;
    this.scene.environmentIntensity = t.env;
    this.stars.material.opacity = ss(0.3, 1, t.night); this.moon.material.opacity = ss(0.3, 1, t.night);
    this.night = t.night; U.night.value = t.night;
    for (const w of this.waterMats || []) { w.uniforms.uSky.value.set(t.fog).lerp(new THREE.Color(t.sky), 0.4); w.uniforms.uSunDir.value.copy(this.lightDir); w.uniforms.uSunCol.value.set(t.sun).multiplyScalar(t.night > 0.5 ? 0.4 : 1); w.uniforms.uDeep.value.set(t.night > 0.5 ? '#0c1c26' : '#1f4a52'); w.uniforms.uShallow.value.set(t.night > 0.5 ? '#1c3440' : '#4f8a7e'); }
    if (env) this.refreshEnv();
  }
  refreshEnv() {
    const u = this.sky.material.uniforms; u.showSunDisc.value = 0;
    this.skyScene.add(this.sky);
    if (this.envRT) this.envRT.dispose();
    this.envRT = this.pmrem.fromScene(this.skyScene, 0, 1, 5000);
    this.scene.environment = this.envRT.texture;
    this.scene.add(this.sky); u.showSunDisc.value = 1;
  }

  // ----- capítulos -----
  clearChapter() {
    const g = this.chapterGroup;
    g.traverse(o => {
      if (o.isInstancedMesh) o.dispose();
      if ((o.isMesh || o.isSprite) && o.geometry && !o.geometry.userData.shared) o.geometry.dispose?.();
      if (o.material?.userData.own) { o.material.map?.dispose(); o.material.dispose(); }
    });
    g.clear(); this.colliders = []; this.named = {}; this.fires = []; this.smokes = []; this.reveals = []; this.bridgeOn = false; this.train = null; this.track.visible = false; this.decks = []; this.occluders = [];
  }
  place(builder, x, z, rot = 0, opts = {}) {
    const m = builder.mesh ? builder.mesh(opts.mat || M.clay) : builder;
    let y = opts.y;
    if (y === undefined) { y = -1e9; const r = opts.r || 3; for (const [dx, dz] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]]) y = Math.max(y, this.groundY(x + dx, z + dz)); }
    m.position.set(x, y, z); m.rotation.y = rot;
    this.chapterGroup.add(m);
    if (opts.box) this.occluders.push(m);
    if (opts.box) this.colliders.push({ x, z, hw: opts.box[0] / 2, hd: opts.box[1] / 2, rot });
    if (opts.name) this.named[opts.name] = m;
    if (opts.hidden) { m.visible = false; m.userData.baseScale = m.scale.clone(); }
    return m;
  }
  fire(x, z, big = 1) {
    const g = new THREE.Group(), y = this.groundY(x, z);
    g.add(campfire().mesh(M.clay));
    const fl = FIRE_M[0], fl2 = FIRE_M[1];
    const flames = [];
    for (let i = 0; i < 5; i++) { const f = new THREE.Mesh(G.cone, i % 2 ? fl : fl2); f.position.set((Math.random() - 0.5) * 0.4, 0.5, (Math.random() - 0.5) * 0.4); f.userData.ph = Math.random() * 6; f.userData.s = (0.25 + Math.random() * 0.2) * big; g.add(f); flames.push(f); }
    const light = new THREE.PointLight('#ff9a4a', 0, 22 * big, 1.6); light.position.y = 1.2; g.add(light);
    g.position.set(x, y, z); this.chapterGroup.add(g);
    const F = { g, flames, light, big, x, z }; this.fires.push(F); return F;
  }
  smokeColumn(x, z, scale = 1) {
    const g = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: '#8a8580', transparent: true, opacity: 0.55, roughness: 1, depthWrite: false });
    mat.userData.own = true; const parts = [];
    for (let i = 0; i < 12; i++) { const m = new THREE.Mesh(SMOKE_G, mat); m.userData.ph = i / 12; parts.push(m); g.add(m); }
    g.position.set(x, this.groundY(x, z), z); g.scale.setScalar(scale); g.visible = false; this.chapterGroup.add(g);
    const S = { g, parts }; this.smokes.push(S); return S;
  }

  loadChapter(id) {
    this.clearChapter();
    const veg = [], R = rng(id.length * 97 + 13), excl = [];
    const ex = (x, z, r) => excl.push([x, z, r]);
    let cfg = { valleyForest: 0.12, paths: [], fields: [], track: false };
    const coffeeRows = (cx, cz, w, d, rot, density = 1) => {
      const c = Math.cos(rot), s = Math.sin(rot);
      for (let i = -w / 2; i <= w / 2; i += 2.6) for (let j = -d / 2; j <= d / 2; j += 1.7 / density) {
        const x = cx + i * c + j * s, z = cz - i * s + j * c; veg.push({ k: 'coffee', x, y: this.groundY(x, z), z, r: R() * 6, s: 0.8 + R() * 0.35 });
      }
      ex(cx, cz, Math.max(w, d) * 0.6);
    };
    const add = (fn) => fn();
    const town = () => {
      cfg.track = true; this.track.visible = true;
      this.place(station(), P.station[0], P.station[1], 0, { box: [7, 15], name: 'station' });
      this.decks.push({ x: P.station[0] - 4.1, z: P.station[1], hw: 1.35, hd: 13, y: this.named.station.position.y + 0.37 });
      const st = sign('VARGEM ALTA', 4.2, 1.05, '#f1e3c2', '#5a2018'); st.rotation.y = -Math.PI / 2; st.position.set(-3.08, 3.3, 0); this.named.station.add(st);
      this.place(capela(), P.capela[0], P.capela[1], -Math.PI / 2 + 0.2, { box: [7.5, 15], r: 5 });
      const houses = [[E2(46, -8), '#e8d3a8'], [E2(58, 4), '#d6e0d0'], [E2(56, 22), '#f0d6c8'], [E2(42, 28), '#e9e1cf'], [E2(66, -8), '#dcd2b8']];
      houses.forEach(([[x, z], col], i) => this.place(house({ w: 6, d: 5, h: 3, wall: col, roof: '#a5482d', trim: '#7a5a3a', win: 2, winColor: '#3f6a4a', roofH: 1.6, base: '#8b8173' }), x, z, -Math.PI / 2 + (i % 2) * 0.3, { box: [6.5, 5.5] }));
      ex(P.station[0], P.station[1], 14); ex(P.capela[0], P.capela[1], 12); ex(P.plaza[0], P.plaza[1], 9); houses.forEach(([[x, z]]) => ex(x, z, 7));
      cfg.paths.push([[P.station[0] + 4, -30], [P.station[0] + 4, 40]], [[P.station[0], 6], [P.shop[0], P.shop[1]], [P.capela[0], P.capela[1]]]);
      cfg.paths.push([[P.station[0], P.station[1] + 10], [riverX(30) + 14, 30], [riverX(30) - 14, 30], [P.lote[0] + 6, P.lote[1] - 4]]);
      cfg.paths.push([[P.station[0] + 6, -4], [P.quilombo[0], P.quilombo[1] + 6]], [[P.station[0] + 6, 14], [P.casa[0] - 6, P.casa[1]]]);
      // ponte
      this.place(bridge(), riverX(30), 30, 0, { y: 0 });
      this.bridgeOn = true; ex(riverX(30), 30, 10);
      const loco = locomotive().mesh(), w1 = wagon('#6b3a24').mesh(), w2 = wagon('#3f5a3a').mesh();
      const train = new THREE.Group(); train.add(loco, w1, w2); this.chapterGroup.add(train); this.occluders.push(loco, w1, w2);
      this.train = { g: train, cars: [loco, w1, w2], s: 0.3, target: 0.5, speed: 0, steam: this.smokeColumn(0, 0, 0.35) };
      this.train.steam.g.visible = true; this.chapterGroup.remove(this.train.steam.g); loco.add(this.train.steam.g); this.train.steam.g.position.set(0, 3.6, 2.8); this.train.steam.g.scale.setScalar(0.07);
      this.placeTrain(0.6);
    };
    const fazenda = (withSenzala = true) => {
      this.place(casaGrande(), P.casa[0], P.casa[1], -Math.PI / 2, { box: [17.5, 10], r: 8 });
      if (withSenzala) this.place(senzala(), P.senzala[0], P.senzala[1], -Math.PI / 2 - 0.15, { box: [22.5, 6], r: 8 });
      const t = new Builder(); t.cur = SURF.stone; t.add(G.box, '#a6765a', [0, -1.35, 0], [12, 3, 16]); t.cur = SURF.smooth;
      t.cur = SURF.cloth; for (let r = 0; r < 5; r++) for (let i = 0; i < 4; i++) t.add(G.msph, (r + i) % 3 ? '#7a4630' : '#8e3f2a', [-3.6 + i * 2.4 + (r % 2) * 0.8, 0.12, -5.6 + r * 2.8], [0.95, 0.22, 0.7]);
      t.cur = SURF.wood; t.add(G.box, '#7a5a3a', [3.2, 0.3, 5.5], [0.08, 0.06, 1.6], [0, 0, 0.4]);
      for (let i = 0; i < 3; i++) t.add(G.cyl, '#6b4428', [-5.6, 0.6, -4 + i * 4], [0.03, 1.2, 0.03], [0, 0, 0.6]);
      this.place(t, P.terreiro[0], P.terreiro[1], 0.05, { r: 6 });
      coffeeRows(P.coffeeE[0], P.coffeeE[1], 22, 30, 0.1);
      ex(P.casa[0], P.casa[1], 15); ex(P.senzala[0], P.senzala[1], 14); ex(P.terreiro[0], P.terreiro[1], 11);
      cfg.fields.push([P.coffeeE[0], P.coffeeE[1], 22]);
      cfg.paths.push([[P.terreiro[0], P.terreiro[1]], [P.casa[0] - 6, P.casa[1]], [P.senzala[0] - 4, P.senzala[1]]]);
      for (let i = 0; i < 4; i++) veg.push({ k: 'palm', x: P.casa[0] - 12 + i * 3, y: this.groundY(P.casa[0] - 12 + i * 3, P.casa[1] + 11), z: P.casa[1] + 11, r: R() * 6, s: 0.9 + R() * 0.2 });
    };
    const quilombo = (n = 4, established = false) => {
      const spots = [[-8, 6, 0.4], [6, 9, -0.3], [-12, -6, 1.2], [9, -8, -1.0], [16, 2, -1.4], [-2, -14, 2.6]];
      spots.slice(0, n).forEach(([dx, dz, r]) => this.place(rancho(established ? '#9a7a54' : '#8a6a48'), P.quilombo[0] + dx, P.quilombo[1] + dz, r, { box: [5, 4.5] }));
      ex(P.quilombo[0], P.quilombo[1], 20);
      for (let i = 0; i < 8; i++) { const a = i * 0.8, x = P.quilombo[0] + Math.cos(a) * 22, z = P.quilombo[1] + Math.sin(a) * 22; veg.push({ k: 'banana', x, y: this.groundY(x, z), z, r: R() * 6, s: 0.9 + R() * 0.4 }); }
    };
    const lote = (built) => {
      if (built) { this.place(italianHouse(), P.lote[0], P.lote[1], Math.PI / 2 - 0.3, { box: [9.5, 7.5], r: 5, name: 'house' }); this.chimney(this.named.house); }
      if (built) coffeeRows(P.coffeeW[0], P.coffeeW[1], 18, 22, -0.2); else ex(P.coffeeW[0], P.coffeeW[1], 14);
      ex(P.lote[0], P.lote[1], 14); cfg.fields.push([P.coffeeW[0], P.coffeeW[1], 17]);
      cfg.paths.push([[P.lote[0] + 8, P.lote[1] + 30], [P.lote[0] + 6, P.lote[1] + 4], [P.coffeeW[0] + 8, P.coffeeW[1]]]);
    };

    if (id === 'puri') {
      cfg.valleyForest = 1;
      const [cx, cz] = P.camp; ex(cx, cz, 16); ex(P.falls[0] + 6, P.falls[1], 24); ex(P.ridge[0], P.ridge[1], 9);
      this.place(puriShelter(), cx - 4, cz - 6, 0.3, { box: [3.6, 1.5] }); this.place(puriShelter(), cx + 6, cz - 3, -0.9, { box: [3.6, 1.5] }); this.place(puriShelter(), cx - 7, cz + 4, 1.9, { box: [3.6, 1.5] });
      this.place(hammock([-1.8, 0], [1.8, 0.4]), cx + 2, cz + 9, 0.4);
      for (const [dx, dz] of [[-0.2, 9], [3.8, 9.8]]) this.place(new Builder().seg('#6b4a2b', [0, -0.2, 0], [0, 1.9, 0], 0.08), cx + dx, cz + dz);
      this.fire(cx + 1, cz - 1, 0.8);
      cfg.paths.push([[cx, cz], [P.falls[0] + 10, P.falls[1] + 2]], [[cx, cz], [riverX(30) - 12, 30], [riverX(30) + 12, 30], [P.ridge[0], P.ridge[1]]]);
      for (let i = 0; i < 7; i++) this.smokeColumn(E2(60 + i * 18, 150 + (i % 3) * 22)[0], 150 + (i % 3) * 22, 3 + (i % 2));
    } else if (id === 'bento') {
      fazenda(true); quilombo(3);
      this.place(rancho(), P.quilombo[0] - 3, P.quilombo[1] - 12, 0.9, { box: [5, 4.5], name: 'rancho', hidden: true });
      const fx = P.fire[0], fz = P.fire[1]; this.fire(fx, fz, 1.3); this.named.fire = this.fires[0]; this.fires[0].off = true;
      ex(fx, fz, 8);
      const d1 = drum(true).mesh(), d2 = drum(false).mesh();
      this.place(d1, fx - 3.6, fz + 0.5, 0, { y: this.groundY(fx - 3.6, fz + 0.5) + 0.3 }); d1.rotation.z = 1.2;
      this.place(d2, fx - 2.8, fz - 2.2, 0.6, { y: this.groundY(fx - 2.8, fz - 2.2) + 0.22 }); d2.rotation.z = 1.2;
      cfg.paths.push([E2(60, 26), E2(64, 10), E2(62, -8), E2(58, -26), E2(54, -40), [P.quilombo[0], P.quilombo[1]]]);
    } else if (id === 'pietro') {
      lote(false); fazenda(false); quilombo(4, true);
      this.place(houseFrame(), P.lote[0], P.lote[1], Math.PI / 2 - 0.3, { box: [9.5, 7.5], r: 5, name: 'frame' });
      this.place(italianHouse(), P.lote[0], P.lote[1], Math.PI / 2 - 0.3, { r: 5, name: 'house', hidden: true }); this.chimney(this.named.house);
      const tent = new Builder(); tent.add(new THREE.ConeGeometry(2.2, 2.4, 4), '#d8ccb0', [0, 1.2, 0], 1, [0, Math.PI / 4, 0]);
      this.place(tent, P.lote[0] + 9, P.lote[1] - 4, 0, { box: [3, 3], name: 'tent' });
      town(); this.setTownVisible(false);
      this.named.field = this.coffeeField(P.coffeeW[0], P.coffeeW[1], 18, 22, -0.2); this.named.field.visible = false;
      cfg.paths.push([[P.lote[0] + 10, P.lote[1] + 40], [P.lote[0] + 8, P.lote[1] + 6]]);
    } else {
      lote(true); fazenda(false); quilombo(6, true); town();
      this.place(shop(), P.shop[0], P.shop[1], -Math.PI / 2, { box: [10.5, 7.5], r: 5, name: 'shop' });
      const sg = sign('ARMAZÉM', 3.6, 0.9, '#2f5d7a', '#f1e3c2'); sg.position.set(0, 3.9, 3.56); this.named.shop.add(sg);
      const goods = new Builder();
      for (let i = 0; i < 5; i++) goods.add(G.box, '#a27448', [-3.5 + i * 0.7, 0.3, 4.6], [0.6, 0.5, 0.5]);
      for (let i = 0; i < 4; i++) goods.add(G.sph, '#b89a68', [2 + i * 0.6, 0.4, 4.7], [0.3, 0.38, 0.24]);
      for (let i = 0; i < 3; i++) goods.add(G.cyl, ['#c8553d', '#3f6a8a', '#e0b53f'][i], [-0.6 + i * 0.6, 0.55, 4.8], [0.22, 0.9, 0.22], [Math.PI / 2, 0, 0]);
      this.place(goods, P.shop[0], P.shop[1], -Math.PI / 2, { name: 'goods', hidden: true, r: 5 });
      ex(P.shop[0], P.shop[1], 12);
    }
    if (id === 'epilogue') { /* usa o cenário do capítulo IV */ }

    ex(P.pedra[0], P.pedra[1], 40);
    // vegetação por máscara
    const step = TEST ? 14 : LOW ? 7.2 : 5.2;
    const isEx = (x, z) => { for (const [ex_, ez, er] of excl) if ((x - ex_) ** 2 + (z - ez) ** 2 < er * er) return true; for (const pth of cfg.paths) for (let i = 0; i < pth.length - 1; i++) { const a = pth[i], b = pth[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz))); if (Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t) < 3) return true; } if (cfg.track && Math.abs(x - trackX(z)) < 4.5) return true; return false; };
    for (let x = -290; x < 290; x += step) for (let z = -290; z < 290; z += step) {
      const px = x + (R() - 0.5) * step, pz = z + (R() - 0.5) * step, d = Math.abs(px - riverX(pz));
      if (d < 9 || isEx(px, pz)) continue;
      const y = this.groundY(px, pz), nv = noise(px * 0.02, pz * 0.02) * 0.5 + 0.5;
      const wild = d > 52 ? 0.9 : cfg.valleyForest;
      const pr = wild * (0.55 + nv * 0.6) - (Math.hypot(px, pz) > 200 ? 0.15 : 0);
      if (R() < pr) {
        const r = R(), k = r < 0.08 ? 'palm' : r < 0.45 ? 't0' : r < 0.75 ? 't1' : 't2';
        veg.push({ k, x: px, y, z: pz, r: R() * 6.28, s: 0.75 + R() * 0.75, hue: (R() - 0.5) * 0.08, l: (R() - 0.5) * 0.15 });
        if (R() < 0.5) veg.push({ k: R() < 0.6 ? 'shrub' : 'fern', x: px + 2, y: this.groundY(px + 2, pz + 1), z: pz + 1, r: R() * 6, s: 0.8 + R() });
      } else if (R() < 0.08 && d < 70) {
        veg.push({ k: R() < 0.3 ? 'banana' : 't0', x: px, y, z: pz, r: R() * 6.28, s: 0.8 + R() * 0.6, hue: (R() - 0.5) * 0.06 });
      } else if (R() < 0.04) veg.push({ k: 'rock', x: px, y: y - 0.2, z: pz, r: R() * 6, s: 0.6 + R() * 1.4 });
    }
    // capim e flores perto da área jogável
    const gN = TEST ? 300 : LOW ? 2200 : 5200;
    for (let i = 0; i < gN; i++) {
      const x = (R() - 0.5) * 240 + riverX(0) + 10, z = (R() - 0.5) * 260, d = Math.abs(x - riverX(z));
      if (d < 7.5 || isEx(x, z)) continue;
      veg.push({ k: R() < 0.12 ? 'flower' : R() < 0.2 ? 'fern' : 'grass', x, y: this.groundY(x, z), z, r: R() * 6, s: 0.7 + R() * 0.8 });
    }
    instanced(veg, this.chapterGroup);
    this.paintTerrain(cfg);
    return this.named;
  }
  chimney(house) { // fumaça saindo da chaminé da casa italiana
    const sm = this.smokeColumn(0, 0, 0.12); this.chapterGroup.remove(sm.g); house.add(sm.g);
    sm.g.position.set(2.6, 8.3, -1.2); sm.g.visible = true; return sm;
  }
  setTownVisible(v) {
    this.track.visible = v; if (this.train) this.train.g.visible = v;
    for (const k of ['station']) if (this.named[k]) this.named[k].visible = v;
    this.chapterGroup.children.forEach(o => { if (o.userData.town === undefined && o.position && Math.abs(o.position.x - trackX(o.position.z)) < 45 && o.position.z > -30 && o.position.z < 40 && !o.isInstancedMesh && o !== this.named.frame && o !== this.named.house && o !== this.named.tent) o.userData.town = true; if (o.userData.town) o.visible = v; });
    this.colliders.forEach(c => { if (Math.abs(c.x - trackX(c.z)) < 45 && c.z > -30 && c.z < 40) c.off = !v; });
    this.decks.forEach(d => { d.off = !v; });
    this.bridgeOn = v;
  }
  coffeeField(cx, cz, w, d, rot) {
    const list = [], c = Math.cos(rot), s = Math.sin(rot), R = rng(5);
    for (let i = -w / 2; i <= w / 2; i += 2.6) for (let j = -d / 2; j <= d / 2; j += 1.7) {
      const x = cx + i * c + j * s, z = cz - i * s + j * c; list.push({ k: 'coffee', x: x - cx, y: this.groundY(x, z), z: z - cz, r: R() * 6, s: 0.8 + R() * 0.35 });
    }
    const g = new THREE.Group(); instanced(list, g); g.position.set(cx, 0, cz);
    g.children.forEach(m => { m.frustumCulled = false; });
    this.chapterGroup.add(g); return g;
  }
  reveal(name) {
    const m = this.named[name]; if (!m) return;
    m.visible = true; m.scale.set(1, 0.001, 1); this.reveals.push({ m, t: 0 });
  }
  placeTrain(s) {
    const T = this.train; if (!T) return; T.s = s;
    const pts = this.trackPts, n = pts.length;
    T.cars.forEach((car, i) => {
      const f = (s * (n - 1)) - i * 6.2; const k = Math.max(0, Math.min(n - 2, Math.floor(f))), fr = Math.min(1, Math.max(0, f - k));
      const a = pts[k], b = pts[k + 1];
      car.position.lerpVectors(a, b, fr); car.lookAt(b.x + (b.x - a.x) * 10, car.position.y, b.z + (b.z - a.z) * 10);
    });
  }
  // altura exata da malha do chão (mesma triangulação da GPU: nada flutua nem afunda)
  groundY(x, z) {
    const { N, Hi, R0, sIn, sOut } = this.grid, inv = v => Math.abs(v) <= R0 ? v / sIn : Math.sign(v) * (Hi + (Math.abs(v) - R0) / sOut);
    let fx = inv(x) + N / 2, fz = inv(z) + N / 2;
    if (!(fx >= 0 && fz >= 0 && fx < N && fz < N)) return heightAt(x, z);
    const ix = Math.floor(fx), iz = Math.floor(fz), W = N + 1, Hg = this.hgrid; fx -= ix; fz -= iz;
    const ha = Hg[iz * W + ix], hd = Hg[iz * W + ix + 1], hb = Hg[(iz + 1) * W + ix], hc = Hg[(iz + 1) * W + ix + 1];
    return fx + fz <= 1 ? ha + (hd - ha) * fx + (hb - ha) * fz : hc + (hb - hc) * (1 - fx) + (hd - hc) * (1 - fz);
  }
  // altura caminhável (inclui a ponte)
  walkHeight(x, z) {
    let h = this.groundY(x, z);
    if (this.bridgeOn && Math.abs(z - 30) < 1.7 && Math.abs(x - riverX(30)) < 11) h = Math.max(h, 0.55);
    for (const d of this.decks) if (!d.off && Math.abs(x - d.x) < d.hw && Math.abs(z - d.z) < d.hd) h = Math.max(h, d.y);
    return h;
  }
  blocked(x, z) {
    const h = heightAt(x, z), onBridge = this.bridgeOn && Math.abs(z - 30) < 1.5 && Math.abs(x - riverX(30)) < 11;
    if (!onBridge && h < -1.5) return true;
    if (h > 42 || Math.abs(z) > 175 || Math.abs(x - riverX(z)) > 125) return true;
    return false;
  }
  collide(pos, r = 0.45) {
    for (const c of this.colliders) {
      if (c.off) continue;
      const cs = Math.cos(c.rot), sn = Math.sin(c.rot), dx = pos.x - c.x, dz = pos.z - c.z;
      const lx = dx * cs - dz * sn, lz = dx * sn + dz * cs;
      const qx = Math.max(-c.hw, Math.min(c.hw, lx)), qz = Math.max(-c.hd, Math.min(c.hd, lz));
      const ox = lx - qx, oz = lz - qz, d = Math.hypot(ox, oz);
      if (d < r) {
        let nx, nz, push;
        if (d > 1e-4) { nx = ox / d; nz = oz / d; push = r - d; }
        else { const px = c.hw - Math.abs(lx), pz = c.hd - Math.abs(lz); if (px < pz) { nx = Math.sign(lx) || 1; nz = 0; push = px + r; } else { nx = 0; nz = Math.sign(lz) || 1; push = pz + r; } }
        const wx = nx * cs + nz * sn, wz = -nx * sn + nz * cs;
        pos.x += wx * push; pos.z += wz * push;
      }
    }
  }

  update(dt, t, focus, camera) {
    U.time.value = t;
    for (const w of this.waterMats) w.uniforms.uTime.value = t;
    this.sky.material.uniforms.time.value = t;
    if (this.timeTo) {
      this.timeK = Math.min(1, this.timeK + dt / 4);
      const k = ss(0, 1, this.timeK), A = this.timeFrom, B = this.timeTo, o = {};
      for (const key in B) {
        if (typeof B[key] === 'number') o[key] = lerp(A[key] ?? B[key], B[key], k);
        else o[key] = '#' + new THREE.Color(A[key]).lerp(new THREE.Color(B[key]), k).getHexString();
      }
      if (A.lightElev === undefined && B.lightElev !== undefined) { o.lightElev = k < 0.5 ? undefined : B.lightElev; o.lightAz = k < 0.5 ? undefined : B.lightAz; }
      if (A.lightElev !== undefined && B.lightElev === undefined) { o.lightElev = k < 0.5 ? A.lightElev : undefined; o.lightAz = k < 0.5 ? A.lightAz : undefined; }
      this.applyTime(o, false);
      if ((this.envTick = (this.envTick || 0) + dt) > (LOW ? 9 : 1) || this.timeK >= 1) { this.envTick = 0; this.refreshEnv(); }
      if (this.timeK >= 1) { this.timeTo = null; this.timeCur = { ...B }; }
    }
    // sombra segue o jogador
    const f = focus;
    this.sun.position.copy(f).addScaledVector(this.lightDir, 120); this.sun.target.position.copy(f); this.sun.target.updateMatrixWorld();
    // fogueiras
    for (const F of this.fires) {
      const on = !F.off; F.g.children.forEach((c, i) => { if (i > 0 && c.isMesh) c.visible = on; });
      F.light.intensity = on ? (14 + Math.sin(t * 17) * 2 + Math.sin(t * 7.3) * 3) * F.big * (0.35 + this.night) : 0;
      for (const fl of F.flames) { const s = fl.userData.s * (1 + Math.sin(t * 13 + fl.userData.ph) * 0.25); fl.scale.set(s, s * 2.6 * (1 + Math.sin(t * 9 + fl.userData.ph) * 0.2), s); fl.position.y = 0.2 + fl.scale.y / 2; }
    }
    for (const S of this.smokes) {
      if (!S.g.visible) continue;
      S.parts.forEach((m, i) => { const k = (m.userData.ph + t * 0.05) % 1; m.position.set(Math.sin(k * 6 + m.userData.ph * 9) * 2 * k, k * 40, Math.cos(k * 5) * 1.5 * k); m.scale.setScalar(2 + k * 7); if (i === 0) m.material.opacity = 0.42; });
    }
    for (const fm of this.foam) { const s = 0.8 + Math.sin(t * 6 + fm.userData.ph) * 0.35; fm.scale.set(s, s * 0.6, s); }
    for (const r of this.reveals) { r.t = Math.min(1, r.t + dt / 1.6); const k = ss(0, 1, r.t); r.m.scale.set(1, Math.max(0.001, k), 1); }
    this.reveals = this.reveals.filter(r => r.t < 1);
    // trem
    const T = this.train;
    if (T && T.g.visible) {
      const d = T.target - T.s; T.speed = lerp(T.speed, Math.sign(d) * Math.min(0.03, Math.abs(d) * 0.25), dt * 1.2);
      if (Math.abs(d) > 0.0005) this.placeTrain(T.s + T.speed * dt); else T.speed = 0;
      T.moving = Math.abs(T.speed) > 0.0006;
    }
    // partículas ao redor
    this.motes.visible = this.night > 0.25; this.motes.position.set(f.x, f.y, f.z);
    const mm = this.motes.material; mm.color.set(this.night > 0.5 ? '#c8ff6a' : '#fff3c4'); mm.size = this.night > 0.5 ? 0.22 : 0.09; mm.opacity = (this.night > 0.5 ? 0.9 : 0.35) * (0.7 + Math.sin(t * 3) * 0.3);
    const mp = this.motes.geometry.attributes.position; for (let i = 0; i < mp.count; i++) mp.setY(i, ((mp.getY(i) + 25 + dt * 0.4 * (i % 3 + 1)) % 50) - 20 + Math.sin(t + i) * 0.01); mp.needsUpdate = true;
    this.birds.visible = this.night < 0.5;
    this.birds.children.forEach(b => { const u = b.userData, a = t * u.s + u.ph; b.position.set(u.cx + Math.cos(a) * u.r, u.h + Math.sin(a * 2) * 3, u.cz + Math.sin(a) * u.r); b.rotation.y = -a + Math.PI; const fl = Math.sin(t * 7 + u.ph) * 0.55 * (Math.sin(t * 0.7 + u.ph) > -0.3 ? 1 : 0.1); u.pl.rotation.z = fl; u.pr.rotation.z = -fl; });
  }
}
function E2(dx, z) { return [riverX(z) + dx, z]; }
