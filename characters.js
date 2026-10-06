// Personagens estilizados (visual "figura de vinil", como na imagem de referência),
// montados com primitivas mescladas por membro: poucas draw calls, roda em óculos VR.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Superfícies (padrões procedurais no shader, sem baixar imagens)
export const SURF = { smooth: 0, wood: 1, tile: 2, thatch: 3, stone: 4, plaster: 5, leaf: 6, bark: 7, cloth: 8, hair: 9, glass: 10, rock: 11 };
export const UNIFORMS = { time: { value: 0 }, night: { value: 0 } };
const SURF_GLSL = `
float sh1(float n){ return fract(sin(n) * 43758.5453); }
float shh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float sn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(shh(i), shh(i+vec2(1,0)), f.x), mix(shh(i+vec2(0,1)), shh(i+vec2(1,1)), f.x), f.y); }
float surfPattern(float sid, vec3 op, vec3 on, out float glow){
  glow = 0.0;
  vec3 an = abs(on);
  vec2 uv = an.y > max(an.x, an.z) ? op.xz : (an.x > an.z ? op.zy : op.xy);
  if (sid < 0.5) return 1.0;
  if (sid < 1.5) { float u = uv.x * 3.6, id = floor(u), f = fract(u);
    float gap = smoothstep(0.0, 0.05, f) * smoothstep(1.0, 0.95, f);
    return (0.84 + 0.16 * sh1(id * 13.7) + 0.1 * sn(vec2(id * 5.0, uv.y * 2.5))) * mix(0.62, 1.0, gap); }
  if (sid < 2.5) { float r = uv.x * 3.2, row = floor(r), fr = fract(r), c = fract(uv.y * 3.4 + row * 0.5);
    return (0.78 + 0.26 * sin(c * 3.14159)) * mix(0.62, 1.0, smoothstep(0.0, 0.12, fr)) * (0.92 + 0.12 * sh1(row * 3.1 + floor(uv.y * 3.4 + row * 0.5))); }
  if (sid < 3.5) return 0.74 + 0.34 * sn(vec2(uv.y * 34.0, uv.x * 1.6)) * (0.8 + 0.2 * smoothstep(0.0, 0.2, fract(uv.x * 2.6)));
  if (sid < 4.5) { float r = uv.y * 2.9, row = floor(r), fr = fract(r), u = uv.x * 1.7 + row * 0.5, fu = fract(u);
    float mortar = smoothstep(0.0, 0.07, fr) * smoothstep(1.0, 0.93, fr) * smoothstep(0.0, 0.05, fu) * smoothstep(1.0, 0.95, fu);
    return (0.8 + 0.22 * sh1(floor(u) * 7.3 + row * 1.9) + 0.08 * sn(uv * 9.0)) * mix(0.6, 1.0, mortar); }
  if (sid < 5.5) return (0.9 + 0.1 * sn(uv * 1.3) + 0.05 * sn(uv * 11.0)) * mix(0.72, 1.0, smoothstep(0.05, 1.3, op.y));
  if (sid < 6.5) return (0.72 + 0.4 * sn(op.xz * 2.4 + op.y * 1.7) * sn(op.xy * 3.3)) * (0.66 + 0.34 * (on.y * 0.5 + 0.5));
  if (sid < 7.5) return 0.72 + 0.32 * sn(vec2(atan(op.z, op.x) * 2.5, op.y * 0.7)) * sn(vec2(atan(op.z, op.x) * 9.0, op.y * 3.0));
  if (sid < 8.5) return 0.9 + 0.11 * sn(uv * 55.0) + 0.04 * sn(uv * 7.0);
  if (sid < 9.5) return 0.8 + 0.3 * sn(vec2(atan(op.x, op.z) * 24.0, op.y * 5.0));
  if (sid < 10.5) { glow = 1.0; return 0.75 + 0.4 * smoothstep(0.3, 0.9, fract(uv.y * 0.8 + uv.x * 0.6)); }
  return 0.78 + 0.26 * sn(op.xy * 1.4 + op.z) + 0.1 * sn(op.zy * 6.0);
}`;
// Material com padrões de superfície (+ balanço de vento opcional)
export function surfMaterial({ wind = 0, roughness = 0.6, flat = false, rim = 0 } = {}) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness, metalness: 0, flatShading: flat });
  m.onBeforeCompile = sh => {
    sh.uniforms.uTime = UNIFORMS.time; sh.uniforms.uNight = UNIFORMS.night;
    sh.vertexShader = 'uniform float uTime;\nattribute float surf;\nvarying float vSurf; varying vec3 vOP; varying vec3 vON;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vSurf = surf; vOP = position; vON = normal;
      ${wind ? `vec3 ip = vec3(0.0);
      #ifdef USE_INSTANCING
        ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
      #endif
      float sw = max(0.0, transformed.y) * ${wind.toFixed(4)};
      transformed.x += sin(uTime * 1.4 + ip.x * 0.13 + ip.z * 0.07) * sw;
      transformed.z += cos(uTime * 1.1 + ip.z * 0.11) * sw * 0.6;` : ''}`);
    sh.fragmentShader = 'uniform float uNight;\nvarying float vSurf; varying vec3 vOP; varying vec3 vON;\n' + SURF_GLSL + '\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float glow; diffuseColor.rgb *= surfPattern(floor(vSurf + 0.5), vOP, normalize(vON), glow);
      totalEmissiveRadiance += vec3(1.0, 0.62, 0.3) * glow * uNight * 2.4;`);
    if (rim) sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      float rimF = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 3.0);
      totalEmissiveRadiance += diffuseColor.rgb * rimF * ${rim.toFixed(3)};`);
  };
  m.customProgramCacheKey = () => 'surf' + wind + flat + rim;
  return m;
}
export const CLAY = surfMaterial({ roughness: 0.58 });
export const CHAR = surfMaterial({ roughness: 0.5, rim: 0.55 }); // brilho de contorno estilo vinil
const BLOB = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 0.55, polygonOffset: true, polygonOffsetFactor: -2, map: (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(0,0,0,.75)'); g.addColorStop(0.55, 'rgba(0,0,0,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})() });
const BLOB_G = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2); BLOB_G.userData.shared = true;

const G = {
  sph: new THREE.SphereGeometry(1, 20, 14),
  msph: new THREE.SphereGeometry(1, 12, 8),
  tiny: new THREE.IcosahedronGeometry(1, 0),
  tcone: new THREE.ConeGeometry(1, 1, 5),
  lsph: new THREE.IcosahedronGeometry(1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 16),
  box: new THREE.BoxGeometry(1, 1, 1),
  cone: new THREE.ConeGeometry(1, 1, 12),
  cap: new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
  smile: new THREE.TorusGeometry(1, 0.2, 6, 14, Math.PI),
  ring: new THREE.TorusGeometry(1, 0.16, 6, 20)
};
for (const g of Object.values(G)) g.userData.shared = true;
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();

export class Builder {
  // cur = superfície atual; L = aparência do personagem (superfície automática pela cor)
  constructor(L = null) { this.parts = []; this.cur = 0; this.L = L; }
  surfFor(color) {
    const L = this.L; if (!L) return this.cur;
    if (color === L.skin || /^#(fbfaf6|2a1a10|050302|ffffff|5a2318|3d3a37|57534e)$/i.test(color)) return SURF.smooth;
    if (color === L.hair || color === L.beardColor) return SURF.hair;
    if (/^#(d8c08a|cdb27a|c9a868|a98a50)$/i.test(color)) return SURF.thatch;
    return SURF.cloth;
  }
  tag(g, color) {
    const n = g.attributes.position.count, sf = new Float32Array(n).fill(this.surfFor(color));
    g.setAttribute('surf', new THREE.BufferAttribute(sf, 1));
  }
  add(geo, color, p = [0, 0, 0], s = [1, 1, 1], r = [0, 0, 0]) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (g.attributes.uv) g.deleteAttribute('uv');
    if (typeof s === 'number') s = [s, s, s];
    _m.compose(_v.set(p[0], p[1], p[2]), _q.setFromEuler(_e.set(r[0], r[1], r[2])), _s.set(s[0], s[1], s[2]));
    g.applyMatrix4(_m);
    const c = new THREE.Color(color), n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    this.tag(g, color);
    this.parts.push(g);
    return this;
  }
  // cilindro entre dois pontos
  seg(color, a, b, r0, r1 = r0, geo = G.cyl) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), len = A.distanceTo(B);
    const g = new THREE.CylinderGeometry(r1, r0, len, 10).toNonIndexed();
    g.deleteAttribute('uv');
    _q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
    _m.compose(A.clone().add(B).multiplyScalar(0.5), _q, _s.set(1, 1, 1));
    g.applyMatrix4(_m);
    this.parts.push(g);
    const c = new THREE.Color(color), n = g.attributes.position.count, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    this.tag(g, color);
    return this;
  }
  geometry() { const g = mergeGeometries(this.parts); g.computeBoundingSphere(); return g; }
  mesh(mat = CLAY, shadow = true) {
    const m = new THREE.Mesh(this.geometry(), mat);
    m.castShadow = shadow; m.receiveShadow = true;
    return m;
  }
}
export { G };

// ---------- aparências ----------
const SK = { light: '#e9c3a3', tan: '#c99a76', olive: '#b98b66', brown: '#9a6b47', puri: '#a8714a', dark: '#6a4128', deep: '#4f2f1d' };
export const LOOKS = {
  youssef: { skin: SK.tan, hair: '#22160f', hairStyle: 'short', beard: 'full', hat: 'fez', shirt: '#efe7d8', sleeves: 'long', vest: '#1c1c20', sash: '#9b1c22', pants: '#242428', pantsStyle: 'baggy', shoes: '#141414', keffiyeh: true },
  bento: { skin: SK.dark, hair: '#150e0a', hairStyle: 'curly', shirt: null, pants: '#d8ccb0', pantsStyle: 'rolled', rope: '#b39866', cuffs: true, muscle: true },
  pietro: { skin: SK.light, hair: '#2a1c13', hairStyle: 'short', beard: 'mustache', hat: 'cap', hatColor: '#3a3a40', shirt: '#eee6d2', sleeves: 'rolled', vest: '#4b4b52', pants: '#37373d', shoes: '#171717', strap: '#6b4428' },
  arue: { skin: SK.puri, hair: '#110d0b', hairStyle: 'long', hat: 'feathers', paint: true, necklace: true, bands: true, shirt: null, pantsStyle: 'fiber', muscle: false },
  puriElder: { skin: '#9a6643', hair: '#3b3633', hairStyle: 'long', paint: true, necklace: true, shirt: null, pantsStyle: 'fiber', female: true, age: 'elder' },
  puriMan: { skin: '#a46d47', hair: '#120d0b', hairStyle: 'long', paint: true, bands: true, shirt: null, pantsStyle: 'fiber' },
  puriWoman: { skin: '#ad754e', hair: '#120d0b', hairStyle: 'long', paint: true, necklace: true, shirt: null, pantsStyle: 'fiber', female: true },
  puriChild: { skin: '#ad754e', hair: '#120d0b', hairStyle: 'long', paint: true, shirt: null, pantsStyle: 'fiber', age: 'child' },
  blackElderF: { skin: SK.deep, hair: '#d9d4cc', hairStyle: 'scarf', scarf: '#c8553d', shirt: '#e8dcc3', sleeves: 'long', dress: '#7c5a3c', female: true, age: 'elder' },
  blackMan: { skin: SK.dark, hair: '#150e0a', hairStyle: 'curly', shirt: '#cfc2a4', sleeves: 'rolled', pants: '#8c7b5d', pantsStyle: 'rolled', rope: '#9f8456' },
  blackMan2: { skin: SK.deep, hair: '#150e0a', hairStyle: 'curly', shirt: '#efe7d8', sleeves: 'rolled', pants: '#5d4b36', pantsStyle: 'rolled', hat: 'straw' },
  blackElderM: { skin: SK.deep, hair: '#cfc8bd', hairStyle: 'curly', beard: 'full', beardColor: '#cfc8bd', shirt: '#b7a684', sleeves: 'long', pants: '#6e5d44', pantsStyle: 'rolled', hat: 'straw' },
  blackElderM2: { skin: SK.dark, hair: '#cfc8bd', hairStyle: 'curly', shirt: '#ddd0b3', sleeves: 'rolled', pants: '#4f4436', pantsStyle: 'rolled' },
  blackWoman: { skin: SK.dark, hair: '#150e0a', hairStyle: 'scarf', scarf: '#e0b53f', shirt: '#f0e8d8', sleeves: 'rolled', dress: '#3f6b8a', female: true },
  blackWoman2: { skin: SK.deep, hair: '#150e0a', hairStyle: 'scarf', scarf: '#8d3b6e', shirt: '#efe2c6', sleeves: 'rolled', dress: '#a4552f', female: true },
  blackChild: { skin: SK.dark, hair: '#150e0a', hairStyle: 'curly', shirt: '#f2c94c', sleeves: 'none', dress: '#e3e0d8', female: true, age: 'child' },
  italianMan: { skin: '#e3b494', hair: '#3a2a1e', hairStyle: 'short', beard: 'mustache', hat: 'straw', shirt: '#e6dcc6', sleeves: 'rolled', vest: '#5a4a3a', pants: '#4a4036', shoes: '#211a14', hold: 'hoe' },
  italianWoman: { skin: '#ecc6a6', hair: '#4a2f1f', hairStyle: 'scarf', scarf: '#d8d2c4', shirt: '#f0ece2', sleeves: 'long', dress: '#7a2e2e', female: true },
  italianChild: { skin: '#ecc6a6', hair: '#6b4a2e', hairStyle: 'bun', shirt: '#e8e0d0', sleeves: 'long', dress: '#4d6b8a', female: true, age: 'child' },
  italianOld: { skin: '#e3b494', hair: '#bdb6ad', hairStyle: 'short', beard: 'mustache', beardColor: '#bdb6ad', hat: 'cap', hatColor: '#4a4036', shirt: '#eee6d2', sleeves: 'rolled', vest: '#4b4b52', pants: '#37373d', shoes: '#171717' },
  tropeiro: { skin: SK.brown, hair: '#1a120d', hairStyle: 'short', beard: 'mustache', hat: 'straw', shirt: '#c9b48c', sleeves: 'rolled', pants: '#5c4a35', pantsStyle: 'normal', shoes: '#3b2a1c' },
  lebaneseMan: { skin: SK.olive, hair: '#1e140e', hairStyle: 'short', beard: 'mustache', shirt: '#f2ede2', sleeves: 'long', vest: '#2e2a3a', pants: '#2b2b30', shoes: '#151515', hat: 'fez' },
  ladyF: { skin: SK.light, hair: '#5a3a24', hairStyle: 'bun', shirt: '#f2efe8', sleeves: 'long', dress: '#3c4a6b', female: true }
};

// ---------- montagem ----------
function head(L) {
  const b = new Builder(L), r = 0.165, hair = L.hair || '#111';
  b.add(G.sph, L.skin, [0, 0, 0], [r, r * 1.04, r * 0.98]);
  b.add(G.msph, L.skin, [r * 0.97, -0.01, 0], [0.035, 0.05, 0.03]);
  b.add(G.msph, L.skin, [-r * 0.97, -0.01, 0], [0.035, 0.05, 0.03]);
  for (const sx of [-1, 1]) {
    b.add(G.sph, '#fbfaf6', [sx * 0.06, 0.004, 0.128], [0.043, 0.05, 0.03]);
    b.add(G.sph, '#2a1a10', [sx * 0.06, 0.0, 0.15], [0.03, 0.035, 0.016]);
    b.add(G.msph, '#050302', [sx * 0.06, 0.0, 0.158], [0.016, 0.019, 0.01]);
    b.add(G.msph, '#ffffff', [sx * 0.052, 0.014, 0.166], 0.008);
    b.add(G.box, hair, [sx * 0.062, 0.068, 0.152], [0.06, 0.014, 0.016], [0, 0, sx * -0.12]);
    if (L.paint) for (const dy of [0, -0.03]) b.add(G.box, '#c0281e', [sx * 0.098, -0.035 + dy, 0.118], [0.05, 0.012, 0.01], [0, sx * 0.75, sx * 0.12]);
  }
  b.add(G.msph, L.skin, [0, -0.035, 0.162], [0.025, 0.022, 0.022]);
  if (L.beard === 'full') b.add(G.sph, L.beardColor || hair, [0, -0.07, 0.025], [0.152, 0.12, 0.14]);
  if (L.beard) {
    b.add(G.msph, L.beardColor || hair, [0.022, -0.063, 0.16], [0.03, 0.011, 0.012], [0, 0, -0.25]);
    b.add(G.msph, L.beardColor || hair, [-0.022, -0.063, 0.16], [0.03, 0.011, 0.012], [0, 0, 0.25]);
  }
  b.add(G.smile, '#5a2318', [0, -0.078, 0.158], [0.024, 0.02, 0.02], [0, 0, Math.PI]);
  const tilt = [-0.42, 0, 0];
  switch (L.hairStyle) {
    case 'short': b.add(G.cap, hair, [0, 0.012, -0.012], [r * 1.05, r * 1.0, r * 1.06], tilt); break;
    case 'curly':
      b.add(G.cap, hair, [0, 0.015, -0.01], [r * 1.05, r * 0.95, r * 1.05], tilt);
      for (let i = 0; i < 46; i++) {
        const u = (i * 0.618) % 1, v = (i / 46);
        const th = u * Math.PI * 2, ph = Math.acos(1 - v * 0.95);
        const x = Math.sin(ph) * Math.sin(th), y = Math.cos(ph), z = Math.sin(ph) * Math.cos(th);
        if (z > 0.55 && y < 0.62) continue;
        const R = r * 1.04;
        b.add(G.lsph, hair, [x * R, y * R * 0.98 + 0.012, z * R - 0.012], 0.042);
      }
      break;
    case 'long':
      b.add(G.cap, hair, [0, 0.012, -0.01], [r * 1.06, r * 1.0, r * 1.07], [-0.2, 0, 0]);
      b.add(G.box, hair, [0, -0.17, -0.1], [0.3, 0.42, 0.08], [0.12, 0, 0]);
      b.add(G.box, hair, [0, 0.105, 0.115], [0.25, 0.05, 0.06], [0.5, 0, 0]);
      for (const sx of [-1, 1]) b.add(G.box, hair, [sx * 0.15, -0.1, -0.02], [0.05, 0.3, 0.14]);
      break;
    case 'bun':
      b.add(G.cap, hair, [0, 0.012, -0.012], [r * 1.05, r * 1.0, r * 1.06], tilt);
      b.add(G.sph, hair, [0, 0.07, -0.16], 0.07);
      break;
    case 'scarf':
      b.add(G.cap, L.scarf, [0, 0.02, -0.01], [r * 1.12, r * 1.08, r * 1.12], [-0.3, 0, 0]);
      b.add(G.sph, L.scarf, [0, 0.03, -0.17], [0.07, 0.06, 0.05]);
      break;
  }
  switch (L.hat) {
    case 'fez':
      b.add(G.cyl, '#a41d22', [0.01, 0.17, -0.01], [0.115, 0.15, 0.115], [-0.08, 0, -0.06]);
      b.add(G.cyl, '#8e171c', [0.01, 0.245, -0.016], [0.1, 0.012, 0.1], [-0.08, 0, -0.06]);
      b.add(G.box, '#1a1a1a', [-0.06, 0.2, -0.06], [0.012, 0.12, 0.012], [0, 0, 0.3]);
      break;
    case 'cap':
      b.add(G.sph, L.hatColor, [0, 0.105, 0.0], [0.18, 0.085, 0.19]);
      b.add(G.cyl, L.hatColor, [0, 0.09, 0.0], [0.172, 0.04, 0.178]);
      b.add(G.box, '#2b2b30', [0, 0.085, 0.17], [0.2, 0.02, 0.09], [0.15, 0, 0]);
      break;
    case 'straw':
      b.add(G.cyl, '#d8c08a', [0, 0.11, 0], [0.32, 0.018, 0.32]);
      b.add(G.cyl, '#cdb27a', [0, 0.17, 0], [0.16, 0.12, 0.16]);
      b.add(G.cyl, '#6b4a2b', [0, 0.13, 0], [0.163, 0.03, 0.163]);
      break;
    case 'feathers': {
      b.add(G.cyl, '#7a4a28', [0, 0.085, 0], [0.175, 0.05, 0.178]);
      b.add(G.cyl, '#b4322a', [0, 0.085, 0], [0.177, 0.016, 0.18]);
      const cols = ['#e2b43a', '#d8452e', '#1d1d1d', '#e07a2a', '#c92f22', '#e2b43a', '#1d1d1d', '#d8452e', '#e2b43a'];
      cols.forEach((c, i) => {
        const a = (i - 4) * 0.2;
        b.add(G.sph, c, [Math.sin(a) * 0.16, 0.25 - Math.abs(i - 4) * 0.012, -Math.cos(a) * 0.05 - 0.02], [0.04, 0.17, 0.012], [-0.15, a, -a * 1.1]);
      });
      break;
    }
  }
  return b.mesh(CHAR);
}

function torso(L) {
  const b = new Builder(L), top = L.shirt || L.skin, fem = L.female;
  const w = fem ? 0.86 : 1;
  b.add(G.cyl, top, [0, 0.27, 0], [0.19 * w, 0.5, 0.13], [0, 0, 0]);
  b.add(G.sph, top, [0, 0.47, 0], [0.205 * w, 0.09, 0.135]);
  b.add(G.cyl, L.skin, [0, 0.56, 0], [0.052, 0.12, 0.052]);
  for (const sx of [-1, 1]) b.add(G.sph, top, [sx * 0.2 * w, 0.47, 0], [0.075, 0.075, 0.075]);
  if (!L.shirt && L.muscle) for (const sx of [-1, 1]) b.add(G.sph, L.skin, [sx * 0.072, 0.39, 0.075], [0.095, 0.065, 0.06], [0, 0, sx * 0.2]);
  if (L.shirt) b.add(G.ring, top, [0, 0.52, 0.02], [0.065, 0.065, 0.09], [Math.PI / 2 + 0.2, 0, 0]);
  if (L.vest) {
    const vg = new THREE.CylinderGeometry(0.2, 0.185, 0.46, 20, 1, true, 0.45, Math.PI * 2 - 0.9);
    b.add(vg, L.vest, [0, 0.27, 0], [1, 1, 0.74]);
    b.add(G.sph, L.vest, [0, 0.47, -0.01], [0.215, 0.085, 0.145]);
    for (let i = 0; i < 4; i++) b.add(G.tiny, '#a89a7a', [0.06, 0.4 - i * 0.07, 0.135], 0.011);
  }
  if (L.sash) b.add(G.cyl, L.sash, [0, 0.06, 0], [0.175, 0.1, 0.135]);
  if (L.rope) b.add(G.ring, L.rope, [0, 0.04, 0], [0.17, 0.13, 0.25], [Math.PI / 2, 0, 0]);
  if (L.strap) { b.add(G.box, L.strap, [0, 0.28, 0.0], [0.03, 0.62, 0.3], [0, 0, 0.62]); b.add(G.box, '#7a5030', [-0.21, 0.03, 0.02], [0.08, 0.16, 0.14]); }
  if (L.keffiyeh) {
    for (let i = 0; i < 9; i++) for (let k = 0; k < 2; k++) b.add(G.box, (i + k) % 2 ? '#b22a2a' : '#f3eee6', [0.105 + k * 0.042 + i * 0.003, 0.5 - i * 0.052, 0.132 + Math.sin(i * 0.4) * 0.008], [0.042, 0.052, 0.022], [0.05, 0, -0.06]);
    for (let k = 0; k < 4; k++) b.add(G.box, '#f3eee6', [0.11 + k * 0.022, 0.03, 0.135], [0.007, 0.05, 0.007]);
  }
  if (L.keffiyeh) b.add(G.ring, '#f3eee6', [0, 0.53, 0], [0.11, 0.11, 0.3], [Math.PI / 2 + 0.15, 0, 0]);
  if (L.necklace) {
    b.add(G.ring, '#5a2f17', [0, 0.53, 0.02], [0.1, 0.1, 0.12], [Math.PI / 2 + 0.45, 0, 0]);
    for (let i = 0; i < 7; i++) { const a = (i - 3) * 0.35; b.add(G.tcone, '#f4ecd8', [Math.sin(a) * 0.09, 0.47 - Math.cos(a) * 0.015, 0.1 + Math.cos(a) * 0.02], [0.012, 0.05, 0.012], [Math.PI, 0, 0]); }
  }
  // quadril / saia
  if (L.dress) {
    b.add(new THREE.CylinderGeometry(0.17, 0.3, 0.62, 18), L.dress, [0, -0.2, 0]);
  } else if (L.pantsStyle === 'fiber') {
    b.add(G.cyl, '#b4322a', [0, 0.04, 0], [0.165, 0.07, 0.125]);
    for (let i = 0; i < 6; i++) b.add(G.box, i % 2 ? '#e2b43a' : '#1d1d1d', [Math.sin(i * 1.05) * 0.166, 0.04, Math.cos(i * 1.05) * 0.127], [0.03, 0.03, 0.01], [0, i * 1.05, 0]);
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      b.add(G.box, i % 3 ? '#c9a868' : '#a98a50', [Math.sin(a) * 0.17, -0.18, Math.cos(a) * 0.13], [0.05, 0.42, 0.012], [Math.cos(a) * 0.12, a, -Math.sin(a) * 0.12]);
    }
  } else {
    b.add(G.cyl, L.pants, [0, 0.02, 0], [0.168, 0.12, 0.128]);
  }
  return b.mesh(CHAR);
}

function arm(L, side) {
  const b = new Builder(L), top = L.shirt || L.skin;
  const sleeveLong = L.shirt && L.sleeves === 'long', rolled = L.shirt && L.sleeves === 'rolled';
  b.add(G.cyl, L.shirt && L.sleeves !== 'none' ? top : L.skin, [0, -0.14, 0], [0.055, 0.28, 0.055]);
  b.add(G.msph, sleeveLong ? top : L.skin, [0, -0.28, 0], 0.05);
  b.add(G.cyl, sleeveLong ? top : L.skin, [0, -0.4, 0], [0.048, 0.25, 0.048]);
  if (rolled) b.add(G.cyl, top, [0, -0.27, 0], [0.062, 0.06, 0.062]);
  b.add(G.sph, L.skin, [0, -0.55, 0.005], [0.052, 0.066, 0.04]);
  b.add(G.msph, L.skin, [side * -0.035, -0.525, 0.03], [0.02, 0.035, 0.02], [0.3, 0, 0]);
  if (L.cuffs) { b.add(G.cyl, '#3d3a37', [0, -0.46, 0], [0.072, 0.09, 0.072]); b.add(G.ring, '#57534e', [0, -0.46, 0], [0.072, 0.072, 0.2], [Math.PI / 2, 0, 0]); }
  if (L.bands) for (const y of [-0.12, -0.45]) { b.add(G.cyl, '#b4322a', [0, y, 0], [0.062, 0.04, 0.062]); b.add(G.cyl, '#1d1d1d', [0, y, 0], [0.064, 0.012, 0.064]); }
  return b.mesh(CHAR);
}

function leg(L) {
  const b = new Builder(L), p = L.pants || L.skin;
  switch (L.pantsStyle) {
    case 'baggy':
      b.add(G.cyl, p, [0, -0.3, 0], [0.11, 0.6, 0.11]);
      b.add(G.sph, p, [0, -0.55, 0], [0.105, 0.1, 0.105]);
      b.add(G.cyl, p, [0, -0.66, 0], [0.065, 0.1, 0.065]);
      break;
    case 'rolled':
      b.add(G.cyl, p, [0, -0.25, 0], [0.085, 0.5, 0.085]);
      b.add(G.cyl, p, [0, -0.5, 0], [0.09, 0.07, 0.09]);
      b.add(G.cyl, L.skin, [0, -0.64, 0], [0.055, 0.24, 0.055]);
      break;
    case 'fiber':
      b.add(G.cyl, L.skin, [0, -0.35, 0], [0.07, 0.72, 0.07]);
      if (L.bands !== undefined || L.paint) for (const y of [-0.66, -0.7]) b.add(G.cyl, '#4a2c18', [0, y, 0], [0.06, 0.018, 0.06]);
      break;
    default:
      if (L.dress) b.add(G.cyl, L.skin, [0, -0.4, 0], [0.058, 0.68, 0.058]);
      else b.add(G.cyl, p, [0, -0.36, 0], [0.078, 0.72, 0.078]);
  }
  if (L.shoes) b.add(G.sph, L.shoes, [0, -0.745, 0.04], [0.075, 0.055, 0.135]);
  else b.add(G.sph, L.skin, [0, -0.75, 0.035], [0.065, 0.04, 0.12]);
  return b.mesh(CHAR);
}

// ---------- objetos de mão ----------
let flagTex;
function flagTexture() {
  if (flagTex) return flagTex;
  const c = document.createElement('canvas'); c.width = 192; c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#ee161f'; x.fillRect(0, 0, 192, 128);
  x.fillStyle = '#fff'; x.fillRect(0, 32, 192, 64);
  x.fillStyle = '#00a651';
  for (let i = 0; i < 5; i++) { const w = 18 + i * 9, y = 38 + i * 11; x.beginPath(); x.moveTo(96, y - 4); x.lineTo(96 - w / 2, y + 9); x.lineTo(96 + w / 2, y + 9); x.fill(); }
  x.fillRect(92, 90, 8, 6);
  flagTex = new THREE.CanvasTexture(c); flagTex.colorSpace = THREE.SRGBColorSpace;
  return flagTex;
}
export function prop(kind) {
  const b = new Builder(); b.cur = /suitcase|case/.test(kind) ? SURF.cloth : SURF.wood;
  switch (kind) {
    case 'spear':
      b.add(G.cyl, '#8a5a32', [0, 0.25, 0], [0.018, 1.9, 0.018]);
      b.add(G.cone, '#4a4440', [0, 1.28, 0], [0.04, 0.18, 0.02]);
      b.add(G.cyl, '#b4322a', [0, 1.13, 0], [0.024, 0.05, 0.024]);
      return b.mesh(CHAR);
    case 'suitcase':
      b.add(G.box, '#7a4526', [0, -0.18, 0], [0.42, 0.3, 0.13]);
      b.add(G.box, '#5a321b', [0, -0.18, 0], [0.43, 0.04, 0.135]);
      b.add(G.ring, '#3f2312', [0, -0.01, 0], [0.05, 0.035, 0.1]);
      for (const sx of [-1, 1]) b.add(G.box, '#c8a050', [sx * 0.14, -0.05, 0.066], [0.03, 0.03, 0.01]);
      return b.mesh(CHAR);
    case 'case':
      b.add(G.box, '#5b3a22', [0, -0.2, 0], [0.48, 0.34, 0.2]);
      b.add(G.box, '#3b2414', [0, -0.2, 0], [0.49, 0.05, 0.21]);
      for (const sx of [-1, 1]) b.add(G.box, '#2a1a10', [sx * 0.13, -0.2, 0], [0.04, 0.35, 0.21]);
      b.add(G.ring, '#2a1a10', [0, 0, 0], [0.06, 0.04, 0.1]);
      return b.mesh(CHAR);
    case 'hoe':
      b.add(G.cyl, '#8a5a32', [0, 0.2, 0], [0.018, 1.5, 0.018]);
      b.add(G.box, '#5a5a5a', [0, 0.93, 0.08], [0.16, 0.12, 0.012], [0.5, 0, 0]);
      return b.mesh(CHAR);
    case 'flag': {
      b.add(G.cyl, '#6b4428', [0, 0.25, 0], [0.014, 0.9, 0.014]);
      const g = new THREE.Group(); g.add(b.mesh());
      const geo = new THREE.PlaneGeometry(0.42, 0.28, 12, 1);
      const f = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: flagTexture(), side: THREE.DoubleSide, roughness: 0.8 }));
      f.position.set(0.22, 0.56, 0); f.castShadow = true;
      g.add(f); return g;
    }
  }
}

// ---------- personagem animado ----------
export class Character {
  constructor(look, opts = {}) {
    const L = typeof look === 'string' ? LOOKS[look] : look;
    this.L = L;
    const root = this.root = new THREE.Group();
    const s = L.age === 'child' ? 0.62 : L.age === 'elder' ? 0.95 : 1;
    const legLen = 0.78;
    this.body = new THREE.Group(); root.add(this.body);
    this.hips = new THREE.Group(); this.hips.position.y = legLen; this.body.add(this.hips);
    this.torso = torso(L); this.hips.add(this.torso);
    this.headPivot = new THREE.Group(); this.headPivot.position.y = 0.6 + 0.16; this.hips.add(this.headPivot);
    this.head = head(L); this.headPivot.add(this.head);
    const lid = new Builder(); for (const sx of [-1, 1]) lid.add(G.msph, L.skin, [sx * 0.06, 0.006, 0.13], [0.048, 0.056, 0.05]);
    this.lids = lid.mesh(CHAR, false); this.lids.visible = false; this.head.add(this.lids); this.blinkAt = 1 + Math.random() * 4;
    this.blob = new THREE.Mesh(BLOB_G, BLOB); this.blob.position.y = 0.03; this.blob.scale.setScalar(L.age === 'child' ? 0.6 : 0.95); this.blob.renderOrder = 1; root.add(this.blob);
    if (L.age === 'child') this.head.scale.setScalar(1.25);
    const w = L.female ? 0.86 : 1;
    this.armL = new THREE.Group(); this.armL.position.set(0.215 * w, 0.46, 0); this.hips.add(this.armL); this.armL.add(arm(L, 1));
    this.armR = new THREE.Group(); this.armR.position.set(-0.215 * w, 0.46, 0); this.hips.add(this.armR); this.armR.add(arm(L, -1));
    this.legL = new THREE.Group(); this.legL.position.set(0.085, legLen, 0); this.body.add(this.legL); this.legL.add(leg(L));
    this.legR = new THREE.Group(); this.legR.position.set(-0.085, legLen, 0); this.body.add(this.legR); this.legR.add(leg(L));
    this.body.scale.setScalar(s);
    if (L.age === 'elder') this.hips.rotation.x = 0.08;
    this.phase = Math.random() * 10; this.t = Math.random() * 10; this.speed = 0;
    this.anim = opts.anim || 'idle';
    this.holdL = null; this.holdR = null;
    if (L.hold) this.hold('R', L.hold);
    this.lookTarget = null;
    root.traverse(o => { if (o.isMesh) o.userData.char = this; });
  }
  hold(side, kind) {
    const arm = side === 'L' ? this.armL : this.armR, key = 'hold' + side;
    if (this[key]) { arm.remove(this[key]); this[key] = null; }
    if (!kind) return;
    const p = prop(kind); p.position.set(0, -0.56, 0.03);
    if (kind === 'flag') p.position.set(0.02, -0.56, 0.05);
    arm.add(p); this[key] = p; this[key + 'Kind'] = kind;
  }
  setCuffs(on) {
    if (!on) { this.L = { ...this.L, cuffs: false }; for (const a of [this.armL, this.armR]) { const old = a.children[0]; a.remove(old); old.geometry.dispose(); a.add(arm(this.L, a === this.armL ? 1 : -1)); a.children.unshift(a.children.pop()); if (a === this.armL && this.holdL) a.add(this.holdL); if (a === this.armR && this.holdR) a.add(this.holdR); } }
  }
  update(dt, speed = 0) {
    this.t += dt;
    const t = this.t, mv = Math.min(1, speed / 4.5);
    this.phase += dt * (2.2 + speed * 1.9);
    const ph = this.phase, sn = Math.sin(ph), amt = Math.min(1, speed / 1.6);
    let la = 0, ra = 0, ll = 0, lr = 0, bob = 0, lz = 0.06, rz = -0.06, hipY = 0, yaw = 0;
    if (amt > 0.02) {
      ll = sn * 0.62 * amt; lr = -ll; la = -sn * (0.5 + mv * 0.3) * amt; ra = -la;
      bob = Math.abs(Math.cos(ph)) * 0.045 * amt; yaw = sn * 0.07 * amt;
    } else {
      const br = Math.sin(t * 1.8);
      bob = br * 0.006; la = br * 0.03; ra = -br * 0.03;
      switch (this.anim) {
        case 'work': ra = -0.9 + Math.sin(t * 3) * 0.35; la = -0.6 + Math.sin(t * 3 + 1) * 0.3; hipY = 0.25 + Math.sin(t * 3) * 0.05; break;
        case 'fish': ra = -1.0; la = -0.8; hipY = 0.05; break;
        case 'drum': ra = -0.9 + Math.max(0, Math.sin(t * 9.5)) * 0.5; la = -0.9 + Math.max(0, Math.sin(t * 9.5 + Math.PI)) * 0.5; hipY = 0.18; bob = Math.abs(Math.sin(t * 4.75)) * 0.02; break;
        case 'dance': {
          const d = Math.sin(t * 4.2); ll = d * 0.35; lr = -d * 0.35; la = -1.9 - Math.sin(t * 8.4) * 0.25; ra = -1.9 + Math.sin(t * 8.4) * 0.25;
          lz = 0.35; rz = -0.35; bob = Math.abs(Math.sin(t * 4.2)) * 0.07; yaw = d * 0.3; break;
        }
        case 'talk': ra = -0.35 + Math.sin(t * 2.6) * 0.25; rz = -0.2; break;
        case 'wave': ra = -2.6 + Math.sin(t * 7) * 0.3; rz = -0.4; break;
      }
    }
    if (this.holdRKind && amt < 0.02 && this.anim !== 'drum') ra = Math.max(ra, -0.35);
    if (this.holdLKind === 'flag') { la = -0.55; lz = 0.12; }
    if (this.holdLKind === 'suitcase' || this.holdLKind === 'case') la *= 0.35;
    const k = Math.min(1, dt * 12);
    this.legL.rotation.x += (ll - this.legL.rotation.x) * k; this.legR.rotation.x += (lr - this.legR.rotation.x) * k;
    this.armL.rotation.x += (la - this.armL.rotation.x) * k; this.armR.rotation.x += (ra - this.armR.rotation.x) * k;
    this.armL.rotation.z += (lz - this.armL.rotation.z) * k; this.armR.rotation.z += (rz - this.armR.rotation.z) * k;
    this.hips.rotation.y += (yaw - this.hips.rotation.y) * k;
    this.body.position.y = bob;
    const tx = (this.L.age === 'elder' ? 0.08 : 0) + hipY;
    this.hips.rotation.x += (tx - this.hips.rotation.x) * k;
    // olhar
    let hy = Math.sin(t * 0.5) * 0.15, hx = 0;
    if (this.lookTarget) {
      const p = this.root.position, d = Math.atan2(this.lookTarget.x - p.x, this.lookTarget.z - p.z) - this.root.rotation.y;
      hy = Math.atan2(Math.sin(d), Math.cos(d)); hy = Math.max(-1, Math.min(1, hy));
    }
    this.headPivot.rotation.y += (hy - this.headPivot.rotation.y) * Math.min(1, dt * 4);
    this.headPivot.rotation.x = hx;
    if (this.holdL && this.holdLKind === 'flag') this.holdL.children[1].rotation.y = Math.sin(t * 2.4) * 0.25;
    // piscar de olhos
    if (t > this.blinkAt) { this.lids.visible = true; if (t > this.blinkAt + 0.12) { this.lids.visible = false; this.blinkAt = t + 2.2 + Math.random() * 3.5 + (Math.random() < 0.2 ? -2 : 0); } }
  }
}
