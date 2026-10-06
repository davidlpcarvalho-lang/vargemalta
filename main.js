import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { World, LOW, buildMemorial, collectible, textCanvas } from './world.js';
import { Character } from './characters.js';
import { CHAPTERS, EPILOGUE, SOURCES, NOTES, P, N } from './story.js';
import { heightAt, riverX, WATER_Y, FALLS } from './terrain.js';
import { AudioEngine } from './audio.js';
import { UI, Panel, drawDialogVR, drawCardVR, drawHudVR } from './ui.js';
import './style.css';

// ---------- renderização ----------
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
const PR_MAX = Math.min(devicePixelRatio, LOW ? 1.25 : 2), PR_MIN = LOW ? 0.75 : 1;
let pixelRatio = Math.min(PR_MAX, 1.5);
renderer.setPixelRatio(pixelRatio);
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.xr.enabled = true; renderer.xr.setReferenceSpaceType('local-floor');
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.08, 3000);
const rig = new THREE.Group(); rig.add(camera); camera.position.set(0, 1.6, 6);
const ui = new UI(), audio = new AudioEngine();

// ---------- pós-processamento (somente na tela; no VR renderiza direto) ----------
const POST = !LOW || /q=test/.test(location.search);
let composer = null, renderPass = null;
if (POST) {
  const rt = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: 4 });
  composer = new EffectComposer(renderer, rt);
  renderPass = new RenderPass(new THREE.Scene(), camera); composer.addPass(renderPass);
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.32, 0.55, 1.9));
  composer.addPass(new OutputPass());
  composer.addPass(new ShaderPass({
    uniforms: { tDiffuse: { value: null } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
      void main(){ vec4 c = texture2D(tDiffuse, vUv); vec2 d = vUv - 0.5; c.rgb *= 1.0 - dot(d, d) * 0.62;
        float l = dot(c.rgb, vec3(0.299, 0.587, 0.114)); c.rgb = mix(vec3(l), c.rgb, 1.1); c.rgb = mix(c.rgb, c.rgb * vec3(1.03, 1.0, 0.95), 0.6); gl_FragColor = c; }`
  }));
  composer.setPixelRatio(pixelRatio); composer.setSize(innerWidth, innerHeight);
}
function draw() {
  if (composer && !renderer.xr.isPresenting) { renderPass.scene = active; renderPass.camera = camera; composer.render(); }
  else renderer.render(active, camera);
}
// resolução dinâmica: mantém a fluidez ajustando a nitidez automaticamente
const perf = { t: 0, n: 0, tier: 2, slow: 0 };
function degrade() {
  if (++perf.slow < 2) return; perf.slow = 0;
  if (perf.tier === 2 && composer) { perf.tier = 1; composer = null; return; }        // 1) sem pós-processamento
  if (perf.tier >= 1) { perf.tier = 0; const sh = world.sun.shadow; sh.mapSize.set(1024, 1024); sh.map?.dispose(); sh.map = null; } // 2) sombras mais leves
}
function adaptResolution(rawDt) {
  if (renderer.xr.isPresenting || rawDt > 0.25) return;
  perf.t += rawDt; perf.n++;
  if (perf.t < 1.5) return;
  const avg = perf.t / perf.n; perf.t = perf.n = 0;
  let pr = pixelRatio;
  if (avg > 1 / 45 && pr <= PR_MIN + 0.01) degrade(); // já no mínimo e ainda lento: baixa um nível de qualidade
  const lo = perf.tier === 0 ? Math.min(PR_MIN, 0.85) : PR_MIN;
  if (avg > 1 / 48) pr = Math.max(lo, pr - 0.15); else if (avg < 1 / 58) pr = Math.min(PR_MAX, pr + 0.1);
  if (Math.abs(pr - pixelRatio) > 0.01) { pixelRatio = pr; renderer.setPixelRatio(pr); composer?.setPixelRatio(pr); }
}
const TOUCH = matchMedia('(pointer: coarse)').matches;
const HERO_ORDER = ['youssef', 'bento', 'pietro', 'puri']; // ordem da imagem de referência
const store = (() => { try { return JSON.parse(localStorage.getItem('cdm') || '{}'); } catch { return {}; } })();
store.done ||= {}; store.music ??= true; store.voice ??= false; store.sound ??= true;
audio.setMuted(!store.sound);
const persist = () => { try { localStorage.setItem('cdm', JSON.stringify(store)); } catch { } };

// ---------- memorial (menu) ----------
const menu = { scene: new THREE.Scene(), hover: -1 };
{
  const s = menu.scene; s.background = new THREE.Color('#0b0907'); s.fog = new THREE.Fog('#0b0907', 9, 26);
  const pm = new THREE.PMREMGenerator(renderer); s.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; s.environmentIntensity = 0.28;
  const floor = new THREE.Mesh(new THREE.CircleGeometry(40, 64), new THREE.MeshStandardMaterial({ color: '#17120e', roughness: 0.5, metalness: 0.15 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; s.add(floor);
  const mem = buildMemorial(['youssef', 'bento', 'pietro', 'arue'], ['LIBANÊS', 'ESCRAVIZADO', 'ITALIANO', 'INDÍGENA']);
  mem.chars[0].hold('L', 'flag'); mem.chars[2].hold('L', 'suitcase'); mem.chars[3].hold('R', 'spear');
  s.add(mem.group); menu.mem = mem;
  // caixas invisíveis para seleção (muito mais leve que testar cada triângulo)
  const hb = new THREE.BoxGeometry(1.0, 2.1, 0.8).translate(0, 1.05, 0), hm = new THREE.MeshBasicMaterial({ visible: false });
  menu.hit = mem.chars.map((c, i) => { const m = new THREE.Mesh(hb, hm); m.position.copy(c.root.position); m.userData.idx = i; mem.group.add(m); return m; });
  const key = new THREE.DirectionalLight('#ffe2bf', 1.6); key.position.set(-3, 7, 6); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -2 }); key.shadow.bias = -0.0005; s.add(key);
  const rim = new THREE.DirectionalLight('#8fb0ff', 1.4); rim.position.set(2, 4, -6); s.add(rim);
  s.add(new THREE.HemisphereLight('#5a4a3a', '#0b0907', 0.5));
  menu.spots = mem.chars.map(c => {
    const sp = new THREE.SpotLight('#ffd9a0', 18, 12, 0.42, 0.6, 1.4); sp.position.set(c.root.position.x, 5.2, 2.4); sp.target = c.root; s.add(sp); return sp;
  });
  const n = 300, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) pos.set([(Math.random() - 0.5) * 9, Math.random() * 5, (Math.random() - 0.5) * 4], i * 3);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  menu.dust = new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffe6b8', size: 0.02, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.add(menu.dust);
}

// ---------- mundo ----------
const world = new World(renderer);
let active = menu.scene;
const uiRoot = new THREE.Group();
const vrDialog = new Panel(1.5, 0.86), vrHud = new Panel(0.9, 0.3, 768), vrTitle = new Panel(2.6, 0.62, 1400), vrEpi = new Panel(0.9, 0.22, 640);
uiRoot.add(vrDialog.mesh, vrHud.mesh);
function setScene(s) { active = s; s.add(rig); s.add(uiRoot); }
setScene(menu.scene);

// marcador de objetivo
const marker = new THREE.Group();
{
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 70, 20, 1, true).translate(0, 35, 0), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { t: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform float t; varying vec2 vUv; void main(){ float a = pow(1.0 - vUv.y, 3.0) * (0.35 + 0.15 * sin(t * 3.0)); gl_FragColor = vec4(vec3(1.0, 0.82, 0.45) * a, a); }'
  }));
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.2), new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffb340', emissiveIntensity: 2 }));
  marker.add(beam, ring, gem); marker.userData = { beam, ring, gem }; marker.visible = false;
  world.scene.add(marker);
}
const glowTex = textCanvas(128, 128, (x) => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,230,160,1)'); g.addColorStop(0.3, 'rgba(255,200,110,.45)'); g.addColorStop(1, 'rgba(255,190,90,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); });
function nameTag(text) {
  const t = textCanvas(512, 112, (x, w, h) => { x.font = '600 50px Georgia, serif'; const tw = x.measureText(text).width + 60; x.fillStyle = 'rgba(16,12,9,.72)'; x.beginPath(); x.roundRect((w - tw) / 2, 14, tw, 84, 42); x.fill(); x.fillStyle = '#f4ead8'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, w / 2, 58); });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: false })); s.scale.set(1.6, 0.35, 1); s.position.y = 2.25; return s;
}

// ---------- estado ----------
const S = { mode: 'menu', ch: null, beat: null, beatIdx: -1, npcs: {}, items: [], extras: [], player: null, pos: new THREE.Vector3(), yaw: 0, camYaw: 0, camPitch: 0.3, camDist: 6.2, lastDrag: -9, dq: null, near: null, follow: null, xr: false, vrYaw: 0, panelYaw: 0, t: 0, lookAt: new THREE.Vector3(), card: null };
const input = { keys: {}, joy: { x: 0, y: 0 }, run: false };

function disposeObj(o) {
  o.traverse(m => {
    if ((m.isMesh || m.isSprite) && !m.geometry.userData.shared) m.geometry.dispose();
    if (m.isSprite) { m.material.map?.dispose(); m.material.dispose(); }
  });
  o.parent?.remove(o);
}
function clearActors() {
  Object.values(S.npcs).forEach(n => disposeObj(n.c.root)); S.npcs = {};
  S.items.forEach(i => disposeObj(i.g)); S.items = [];
  S.extras.forEach(c => { if (!c.npc) disposeObj(c.root); }); S.extras = [];
  if (S.player) disposeObj(S.player.root); S.player = null;
  if (S.memorial) { disposeObj(S.memorial.group); S.memorial = null; }
}
function spawnNPC(id, def) {
  const c = new Character(def.look, { anim: def.anim || 'idle' });
  const [x, z] = def.pos; c.root.position.set(x, world.walkHeight(x, z), z);
  c.root.rotation.y = def.face ?? Math.atan2(S.pos.x - x, S.pos.z - z);
  const tag = nameTag(def.name); tag.visible = false; c.root.add(tag); c.npc = true;
  if (def.hidden) c.root.visible = false;
  world.scene.add(c.root);
  S.npcs[id] = { c, def, tag, id, goal: null, baseAnim: def.anim || 'idle' };
}
const heroProps = { arue: ['R', 'spear'], pietro: ['L', 'suitcase'], youssef: ['L', 'case'] };

// ---------- capítulos ----------
async function startChapter(id) {
  audio.init();
  await ui.fade(true);
  ui.show('#menu', false); ui.closeCard(); ui.show('#pause', false);
  clearActors(); audio.setDrums(false); S.follow = null; S.dq = null;
  const ch = S.ch = CHAPTERS.find(c => c.id === id);
  world.loadChapter(id); world.setTime(ch.time, true);
  if (world.train) { const parked = id === 'youssef'; world.train.g.visible = parked; world.placeTrain(parked ? 0.5124 : 0.05); world.train.target = world.train.s; world.train.speed = 0; }
  S.player = new Character(ch.hero); if (heroProps[ch.hero]) S.player.hold(...heroProps[ch.hero]);
  world.scene.add(S.player.root);
  const [sx, sz] = ch.spawn; S.pos.set(sx, world.walkHeight(sx, sz), sz);
  const first = ch.npcs[ch.beats[0].npc]?.pos || [sx, sz - 5];
  S.yaw = Math.atan2(first[0] - sx, first[1] - sz); S.camYaw = S.yaw; S.camPitch = 0.3; S.vrYaw = S.yaw + Math.PI;
  for (const [nid, def] of Object.entries(ch.npcs)) spawnNPC(nid, def);
  setScene(world.scene); ui.show('#hud', false);
  audio.setTheme(ch.music); audio.musicOn = store.music;
  S.mode = 'intro'; S.t0 = S.t; S.snap = true;
  await precompile();
  showCard({ kicker: `${ch.intro.kicker} · ${ch.era}`, title: ch.intro.title, body: ch.intro.body, buttons: [['Começar', begin]] });
  await ui.fade(false);
}
function begin() { if (S.mode !== 'intro') return; closeCard(); S.mode = 'play'; ui.show('#hud'); ui.el.tag.textContent = `Capítulo ${S.ch.num} · ${S.ch.name}`; startBeat(0); }

function startBeat(i) {
  S.beatIdx = i; const b = S.ch.beats[i];
  if (!b) return endChapter();
  S.beat = b; S.visited = new Set(); S.trailIdx = 0; act(b.pre);
  if (b.type === 'card') {
    S.mode = 'card';
    showCard({ kicker: b.kicker, title: b.title, body: b.body, buttons: [['Continuar', async () => { closeCard(); await ui.fade(true); act(b.do); await ui.fade(false); S.mode = 'play'; startBeat(i + 1); }]] });
    return;
  }
  if (b.type === 'collect') b.pts.forEach(([x, z]) => {
    const g = new THREE.Group(), m = collectible(b.item); g.add(m);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); glow.scale.setScalar(1.6); g.add(glow);
    const y = world.walkHeight(x, z); g.position.set(x, y + 0.7, z); world.scene.add(g);
    glow.material.userData.own = true;
    S.items.push({ g, m, glow, x, z, y, got: false, ph: Math.random() * 6, kind: b.item });
  });
  if (b.type === 'trail') S.follow = b.follow;
  updateObjective();
}
function progress() {
  const b = S.beat; if (!b) return '';
  if (b.type === 'collect') return `${S.items.filter(i => i.got && i.kind === b.item).length}/${b.pts.length}`;
  if (b.type === 'visit') return `${S.visited.size}/${b.npcs.length}`;
  if (b.type === 'trail') return `${S.trailIdx}/${b.pts.length}`;
  return '';
}
function updateObjective() { if (S.beat) ui.objective(S.beat.obj, progress()); }
function completeBeat(npcId) {
  const b = S.beat; S.beat = null; marker.visible = false; act(b.do);
  const next = () => { audio.success(); ui.toast('Objetivo concluído'); startBeat(S.beatIdx + 1); };
  if (b.lines) dialog(b.lines, npcId || b.npc, next); else next();
}
function endChapter() {
  store.done[S.ch.id] = true; persist(); renderCards();
  S.mode = 'card'; ui.show('#hud', false); audio.success();
  const idx = CHAPTERS.indexOf(S.ch), nextCh = CHAPTERS.slice(idx + 1).concat(CHAPTERS.slice(0, idx)).find(c => !store.done[c.id]);
  const all = CHAPTERS.every(c => store.done[c.id]);
  const buttons = [];
  if (all) buttons.push(['Ver o epílogo', startEpilogue]);
  else if (nextCh) buttons.push([`Próximo: Capítulo ${nextCh.num} · ${nextCh.name}`, () => startChapter(nextCh.id)]);
  buttons.push(['Voltar ao memorial', toMenu]);
  showCard({ kicker: `Capítulo ${S.ch.num} concluído`, title: S.ch.outro.title, body: S.ch.outro.body, note: S.ch.outro.note, buttons });
}

// ---------- ações narrativas ----------
const npcGo = (id, x, z, speed = 3) => { const n = S.npcs[id]; if (n) { n.c.root.visible = true; n.goal = new THREE.Vector2(x, z); n.speed = speed; } };
function act(list) {
  for (const a of list || []) {
    const [k, p1, p2] = a.split(':');
    switch (k) {
      case 'time': world.setTime(p1); break;
      case 'smoke': world.smokes.forEach(s => { s.g.visible = true; }); break;
      case 'gather': ['rosa', 'joao', 'benedita', 'tome'].forEach((id, i) => npcGo(id, S.pos.x + Math.cos(i * 1.6) * 2.6, S.pos.z + Math.sin(i * 1.6) * 2.6, 6)); break;
      case 'free': S.player.setCuffs(false); ui.toast('As correntes ficaram para trás'); break;
      case 'arrive': {
        S.follow = null; const [qx, qz] = P.quilombo;
        [['rosa', -3, 2], ['joao', 3, -3], ['benedita', -6, -2], ['tome', 1, 4]].forEach(([id, dx, dz]) => npcGo(id, qx + dx, qz + dz, 3));
        S.npcs.luzia.c.root.visible = true; S.npcs.luzia.def.hidden = false; break;
      }
      case 'build': world.reveal(p1); audio.build(); if (p1 === 'house' && world.named.frame) world.named.frame.visible = false; break;
      case 'jongo': {
        const [fx, fz] = P.fire; world.named.fire.off = false;
        ['tambor1', 'tambor2'].forEach(id => { S.npcs[id].c.root.visible = true; S.npcs[id].def.hidden = false; const n = S.npcs[id]; n.c.root.rotation.y = Math.atan2(fx - n.c.root.position.x, fz - n.c.root.position.z); });
        const r = S.npcs.rosa; r.c.root.position.set(fx + 4.6, world.walkHeight(fx + 4.6, fz + 3.4), fz + 3.4); r.goal = null;
        const looks = ['blackWoman', 'blackMan', 'blackWoman2', 'blackChild', 'blackMan2', 'blackElderF'];
        looks.forEach((l, i) => { const c = new Character(l, { anim: 'dance' }); c.ring = i / looks.length * Math.PI * 2; world.scene.add(c.root); S.extras.push(c); });
        ['joao', 'benedita', 'luzia', 'tome'].forEach((id, i) => { const n = S.npcs[id]; n.goal = null; n.c.anim = 'dance'; n.c.ring = (i + 0.5) / 4 * Math.PI * 2 + 0.3; n.dancing = true; S.extras.push(n.c); });
        audio.setDrums(true); break;
      }
      case 'years': {
        world.setTownVisible(true); if (world.named.field) world.named.field.visible = true;
        if (world.named.tent) world.named.tent.visible = false;
        S.items.forEach(i => { if (i.kind === 'cova') disposeObj(i.g); }); S.items = S.items.filter(i => i.kind !== 'cova');
        world.setTime('day', true); S.player.hold('L', null); setTimeout(() => audio.bell(audio.ctx?.currentTime ?? 0, 0.14), 900);
        S.npcs.tropeiro.c.root.visible = true; S.npcs.tropeiro.def.hidden = false;
        const p = S.npcs.papa; p.c.root.position.set(P.plat[0] + 0.3, world.walkHeight(P.plat[0] + 0.3, 6), 6);
        world.placeTrain(0.05); world.train.target = 0.05; world.train.g.visible = true;
        break;
      }
      case 'train': if (world.train) { world.train.g.visible = true; world.placeTrain(0.14); world.train.target = 0.5124; audio.whistle(); } break;
      case 'depart': if (world.train) { world.train.target = 1.0; setTimeout(() => audio.whistle(), 300); } break;
      case 'move': if (p2 === 'shop') npcGo(p1, P.shop[0] - 7.5, P.shop[1] + 2.5, 4); break;
    }
  }
}

// ---------- diálogos e cartões ----------
const voices = () => (window.speechSynthesis?.getVoices() || []).filter(v => /pt[-_]BR/i.test(v.lang));
function speak(text, who) {
  if (!store.voice || !store.sound || !window.speechSynthesis) return;
  speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'pt-BR';
  const vs = voices(); if (vs.length) u.voice = vs[0]; u.rate = 1.03;
  u.pitch = who === N ? 0.92 : 1 + ((who.length * 7) % 5 - 2) * 0.07; speechSynthesis.speak(u);
}
const VOICE_PITCH = { 'Narração': 0 };
ui.onType = () => {
  if (!S.dq || (store.voice && store.sound)) return;
  const who = S.dq.who; if (who === N) return;
  const n = npcByName(who), L = n?.c.L || S.player?.L || {}, base = L.age === 'child' ? 560 : L.female ? 330 : L.age === 'elder' ? 175 : 205;
  audio.murmur(base * (1 + ((who.length * 13) % 7) * 0.025));
};
function npcByName(name) { return Object.values(S.npcs).find(n => n.def.name === name); }
function dialog(lines, npcId, done) {
  S.mode = 'dialog'; S.dq = { lines, i: 0, done, npc: npcId };
  const n = npcId && S.npcs[npcId]; if (n) { n.goal = null; }
  showLine();
}
function showLine() {
  const [who, text] = S.dq.lines[S.dq.i];
  ui.dialog(who, text); speak(text, who);
  const n = npcByName(who); if (n) S.dq.npc = n.id;
  S.dq.who = who;
  if (S.xr) drawDialogVR(vrDialog, who, text, `Gatilho: continuar  (${S.dq.i + 1}/${S.dq.lines.length})`);
}
function endDialog() {
  ui.closeDialog(); vrDialog.hide(); window.speechSynthesis?.cancel();
  const d = S.dq.done; S.dq = null; S.mode = 'play'; d && d();
}
function advance() {
  if (S.mode !== 'dialog' || !S.dq) return;
  const now = performance.now(); if (now - (S.dqT || 0) < 110) return; // ignora toques duplos acidentais (tempo real)
  S.dqT = now;
  if (!S.xr && ui.skipType()) return;
  audio.ui(); S.dq.i++;
  if (S.dq.i >= S.dq.lines.length) endDialog(); else showLine();
}
function skipDialog() { if (S.mode === 'dialog' && S.dq) { audio.ui(); endDialog(); } }
function showCard(c) {
  S.card = c; ui.card(c); audio.whoosh();
  if (S.xr) drawCardVR(vrDialog, c, 'Gatilho: ' + c.buttons[0][0]);
}
function closeCard() { ui.closeCard(); vrDialog.hide(); S.card = null; }

function talkTo(id) {
  const b = S.beat; if (!b) return;
  const n = S.npcs[id];
  if (b.type === 'talk' && b.npc === id) return completeBeat(id);
  if (b.type === 'visit') {
    const entry = b.npcs.find(e => e[0] === id); if (!entry || S.visited.has(id)) return;
    dialog([[n.def.name, entry[1]]], id, () => {
      S.visited.add(id); audio.collect(); updateObjective();
      if (S.visited.size >= b.npcs.length) completeBeat();
    });
  }
}
function interact() {
  audio.init();
  if (S.mode === 'dialog') return advance();
  if ((S.mode === 'card' || S.mode === 'intro' || S.mode === 'epilogue') && S.card) return S.card.buttons[0][1]();
  if (S.mode !== 'play' || !S.near) return;
  talkTo(S.near.id);
}

// ---------- epílogo ----------
async function startEpilogue() {
  audio.init(); await ui.fade(true);
  closeCard(); ui.show('#menu', false); ui.show('#hud', false); clearActors(); audio.setDrums(false);
  S.ch = null; S.beat = null;
  world.loadChapter('youssef'); world.setTime('dusk', true);
  world.train.g.visible = true; world.placeTrain(0.5124); world.train.target = 0.5124;
  const mem = buildMemorial(['youssef', 'bento', 'pietro', 'arue'], ['LIBANÊS', 'ESCRAVIZADO', 'ITALIANO', 'INDÍGENA']);
  mem.chars[0].hold('L', 'flag'); mem.chars[2].hold('L', 'suitcase'); mem.chars[3].hold('R', 'spear');
  const [mx, mz] = P.plaza; mem.group.position.set(mx, world.walkHeight(mx, mz), mz); mem.group.rotation.y = -Math.PI / 2;
  world.scene.add(mem.group); S.memorial = mem;
  [['elias', 'lebaneseMan', -2.6, 5.4], ['pietro', 'italianOld', -3.8, 4.6], ['ana', 'blackWoman2', -2.8, -5.4], ['menina', 'blackChild', -1.8, -4.6], ['tropeiro', 'tropeiro', -4, -4.4]].forEach(([id, look, dx, dz]) => spawnNPC(id, { name: '', look, pos: [mx + dx, mz + dz], face: Math.atan2(-dx, -dz) }));
  Object.values(S.npcs).forEach(n => { n.tag.visible = false; n.c.lookTarget = mem.group.position; });
  S.pos.set(mx - 7, world.walkHeight(mx - 7, mz), mz); S.yaw = Math.PI / 2; S.vrYaw = S.yaw + Math.PI;
  setScene(world.scene); audio.setTheme('epilogue');
  S.mode = 'epilogue'; S.snap = true;
  await precompile(); audio.bell(audio.ctx?.currentTime ?? 0, 0.1);
  showCard({ kicker: EPILOGUE.kicker, title: EPILOGUE.title, body: EPILOGUE.body, buttons: [['Voltar ao memorial', toMenu], ['Fontes e notas', showSources]] });
  await ui.fade(false);
}
// compila os shaders enquanto a tela está preta (evita engasgos ao começar)
async function precompile() { try { await renderer.compileAsync(world.scene, camera); } catch { } }
function sourcesHTML() { return `<ol class="src">${SOURCES.map(s => `<li>${s}</li>`).join('')}</ol>`; }
function showSources() {
  const back = S.mode === 'menu' ? () => { closeCard(); ui.show('#menu'); } : () => showCard({ kicker: EPILOGUE.kicker, title: EPILOGUE.title, body: EPILOGUE.body, buttons: [['Voltar ao memorial', toMenu], ['Fontes e notas', showSources]] });
  ui.show('#menu', false);
  showCard({ kicker: 'Pesquisa', title: 'Fontes e notas', body: sourcesHTML(), note: NOTES, buttons: [['Voltar', back]] });
}
async function toMenu() {
  await ui.fade(true);
  closeCard(); ui.closeDialog(); ui.show('#hud', false); ui.show('#pause', false); clearActors(); audio.setDrums(false);
  S.mode = 'menu'; S.ch = null; S.beat = null; marker.visible = false;
  setScene(menu.scene); renderCards(); ui.show('#menu'); audio.setTheme('menu');
  await ui.fade(false);
}

// ---------- menu HTML ----------
function renderCards() {
  const wrap = document.getElementById('cards'); wrap.innerHTML = '';
  HERO_ORDER.forEach((id, i) => {
    const ch = CHAPTERS.find(c => c.id === id), b = document.createElement('button');
    b.className = 'hero-card' + (store.done[id] ? ' done' : '');
    b.innerHTML = `<span class="num">Capítulo ${ch.num}</span><strong>${ch.name}</strong><span class="ppl">${ch.people}</span><span class="era">${ch.era}</span><span class="tag">${ch.tagline}</span>${store.done[id] ? '<span class="ok">✓ concluído</span>' : ''}`;
    b.onmouseenter = () => { menu.hover = i; }; b.onfocus = () => { menu.hover = i; };
    b.onmouseleave = () => { menu.hover = -1; };
    b.onclick = () => startChapter(id);
    wrap.appendChild(b);
  });
  const all = CHAPTERS.every(c => store.done[c.id]);
  document.getElementById('btn-epi').classList.toggle('glow', all);
}
renderCards();
document.getElementById('btn-epi').onclick = startEpilogue;
document.getElementById('btn-src').onclick = showSources;
const btnSnd = document.getElementById('btn-snd'), btnVoice = document.getElementById('btn-voice');
const btnSfx = document.getElementById('btn-sfx'), btnMute = document.getElementById('btn-mute');
const syncToggles = () => { btnSfx.textContent = 'Som: ' + (store.sound ? 'ligado' : 'desligado'); btnMute.textContent = store.sound ? '🔊' : '🔇'; btnMute.setAttribute('aria-label', store.sound ? 'Desligar som' : 'Ligar som'); document.querySelectorAll('.t-sound').forEach(e => e.textContent = btnSfx.textContent); btnSnd.textContent = 'Música: ' + (store.music ? 'ligada' : 'desligada'); btnVoice.textContent = 'Narração por voz: ' + (store.voice ? 'ligada' : 'desligada'); document.querySelectorAll('.t-music').forEach(e => e.textContent = btnSnd.textContent); document.querySelectorAll('.t-voice').forEach(e => e.textContent = btnVoice.textContent); };
const toggleMusic = () => { store.music = !store.music; audio.musicOn = store.music; persist(); syncToggles(); };
const toggleVoice = () => { store.voice = !store.voice; if (!store.voice) window.speechSynthesis?.cancel(); persist(); syncToggles(); };
const toggleSound = () => { store.sound = !store.sound; audio.init(); audio.setMuted(!store.sound); if (!store.sound) window.speechSynthesis?.cancel(); persist(); syncToggles(); };
btnSfx.onclick = toggleSound; btnMute.onclick = toggleSound; document.querySelectorAll('.t-sound').forEach(e => e.onclick = toggleSound);
btnSnd.onclick = toggleMusic; btnVoice.onclick = toggleVoice; syncToggles();
document.querySelectorAll('.t-music').forEach(e => e.onclick = toggleMusic);
document.querySelectorAll('.t-voice').forEach(e => e.onclick = toggleVoice);
document.getElementById('btn-pause').onclick = () => togglePause();
document.getElementById('p-resume').onclick = () => togglePause(false);
document.getElementById('p-restart').onclick = () => { ui.show('#pause', false); if (S.ch) startChapter(S.ch.id); };
document.getElementById('p-menu').onclick = () => toMenu();
function togglePause(on) {
  if (S.mode === 'menu') return;
  const p = document.getElementById('pause'), v = on ?? !p.classList.contains('on'); ui.show(p, v); S.paused = v;
}
document.addEventListener('pointerdown', () => audio.init(), { once: true });
document.addEventListener('keydown', () => audio.init(), { once: true });

// ---------- VR ----------
const vrBtn = document.getElementById('btn-vr');
if (navigator.xr) navigator.xr.isSessionSupported('immersive-vr').then(ok => { if (ok) { vrBtn.disabled = false; vrBtn.textContent = 'Entrar em VR'; } }).catch(() => { });
vrBtn.onclick = async () => {
  audio.init();
  const session = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'] });
  renderer.xr.setSession(session);
};
const ctrls = [0, 1].map(i => {
  const c = renderer.xr.getController(i), grip = renderer.xr.getControllerGrip(i);
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]), new THREE.LineBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.7 }));
  line.scale.z = 4; c.add(line); c.userData.line = line;
  const hand = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.09, 4, 8).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#d9b26f', roughness: 0.4 }));
  grip.add(hand);
  c.addEventListener('connected', e => { c.userData.src = e.data; });
  c.addEventListener('disconnected', () => { c.userData.src = null; });
  c.addEventListener('selectstart', () => onVRSelect(c));
  rig.add(c, grip); return c;
});
renderer.xr.addEventListener('sessionstart', () => {
  S.xr = true; document.body.classList.add('xr');
  if (S.mode === 'menu') { rig.position.set(0, 0, 3.4); rig.rotation.set(0, 0, 0); }
  if (S.card) drawCardVR(vrDialog, S.card, 'Gatilho: ' + S.card.buttons[0][0]);
  S.vrYaw = S.yaw + Math.PI;
});
renderer.xr.addEventListener('sessionend', () => {
  S.xr = false; document.body.classList.remove('xr'); rig.position.set(0, 0, 0); rig.rotation.set(0, 0, 0); vrDialog.hide(); vrHud.hide();
  camera.position.set(0, 1.5, 6); camera.quaternion.identity();
});
const ray = new THREE.Raycaster(), tmpM = new THREE.Matrix4();
function pointRay(c) { tmpM.identity().extractRotation(c.matrixWorld); ray.ray.origin.setFromMatrixPosition(c.matrixWorld); ray.ray.direction.set(0, 0, -1).applyMatrix4(tmpM); return ray; }
function pickMemorial(r) { const h = r.intersectObjects(menu.hit, false)[0]; return h ? h.object.userData.idx : -1; }
function onVRSelect(c) {
  audio.init();
  if (S.mode === 'menu') {
    const r = pointRay(c); if (r.intersectObject(vrEpi.mesh).length) return startEpilogue();
    const i = pickMemorial(r); if (i >= 0) startChapter(HERO_ORDER[i]);
    return;
  }
  interact();
}
vrTitle.mesh.position.set(0, 3.15, -0.6); vrEpi.mesh.position.set(0, 2.55, -0.6);
menu.scene.add(vrTitle.mesh, vrEpi.mesh);
function drawVRMenu() {
  vrTitle.draw((x, w, h) => {
    x.textAlign = 'center'; x.fillStyle = '#d9b26f'; x.font = '30px sans-serif'; x.fillText('VARGEM ALTA · ESPÍRITO SANTO', w / 2, 70);
    x.fillStyle = '#f4ead8'; x.font = '600 110px Georgia, serif'; x.fillText('Caminhos da Memória', w / 2, 190);
    x.fillStyle = 'rgba(244,234,216,.75)'; x.font = '32px sans-serif'; x.fillText('Aponte para um personagem e aperte o gatilho', w / 2, 280);
  });
  vrEpi.draw((x, w, h) => { x.fillStyle = 'rgba(16,12,9,.8)'; x.beginPath(); x.roundRect(4, 4, w - 8, h - 8, 40); x.fill(); x.strokeStyle = '#d9b26f'; x.lineWidth = 3; x.stroke(); x.fillStyle = '#f4ead8'; x.font = '600 52px Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('Epílogo', w / 2, h / 2); });
}
drawVRMenu(); vrTitle.mesh.visible = vrEpi.mesh.visible = false;

// ---------- entrada (teclado, mouse, toque, gamepad) ----------
addEventListener('keydown', e => {
  input.keys[e.code] = true;
  const act = ['KeyE', 'Space', 'Enter', 'NumpadEnter'].includes(e.code);
  if (S.mode === 'dialog') {
    if (act) { e.preventDefault(); if (!e.repeat) advance(); }
    else if (e.code === 'Escape') { e.preventDefault(); skipDialog(); }
    return;
  }
  if (e.code === 'KeyM' && !e.repeat) { toggleSound(); return; }
  if (e.code === 'Escape') { if (ui.el.card.classList.contains('on')) return; togglePause(); return; }
  if (!act || e.repeat) return;
  if (document.activeElement?.tagName === 'BUTTON' && e.code !== 'KeyE') return; // o próprio botão focado responde
  if (S.mode === 'play') { e.preventDefault(); interact(); }
  else if (S.card && ui.el.card.classList.contains('on')) { e.preventDefault(); ui.el.card.querySelector('.btns button')?.click(); }
});
addEventListener('keyup', e => { input.keys[e.code] = false; });
let drag = null;
canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, id: e.pointerId, touch: e.pointerType === 'touch' }; });
addEventListener('pointermove', e => {
  if (S.mode === 'menu' && !drag) { menu.mx = e.clientX / innerWidth * 2 - 1; menu.my = e.clientY / innerHeight * 2 - 1; menu.pointer = true; }
  if (!drag || drag.id !== e.pointerId) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
  if (S.mode === 'play' || S.mode === 'dialog') { S.camYaw -= dx * 0.0055; S.camPitch = Math.max(-0.1, Math.min(1.1, S.camPitch + dy * 0.004)); S.lastDrag = S.t; }
});
addEventListener('pointerup', e => {
  if (!drag || drag.id !== e.pointerId) return;
  const moved = Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6; drag = null;
  if (moved) return;
  if (S.mode === 'menu' && menu.hover >= 0) startChapter(HERO_ORDER[menu.hover]);
  else if (S.mode === 'dialog') advance();
});
ui.el.dialog.addEventListener('click', e => { if (e.target.closest('#skip')) return; advance(); });
document.getElementById('skip').addEventListener('click', e => { e.stopPropagation(); skipDialog(); });
canvas.addEventListener('wheel', e => { S.camDist = Math.max(2.6, Math.min(14, S.camDist + e.deltaY * 0.004)); }, { passive: true });
// joystick virtual
if (TOUCH) {
  document.body.classList.add('touch');
  const base = document.getElementById('joy'), knob = base.querySelector('i'); let jid = null, jc = null;
  base.addEventListener('pointerdown', e => { jid = e.pointerId; const r = base.getBoundingClientRect(); jc = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; base.setPointerCapture(e.pointerId); });
  base.addEventListener('pointermove', e => { if (e.pointerId !== jid) return; let dx = e.clientX - jc.x, dy = e.clientY - jc.y; const d = Math.hypot(dx, dy), m = 46; if (d > m) { dx *= m / d; dy *= m / d; } knob.style.transform = `translate(${dx}px,${dy}px)`; input.joy.x = dx / m; input.joy.y = -dy / m; });
  const end = () => { jid = null; knob.style.transform = ''; input.joy.x = input.joy.y = 0; };
  base.addEventListener('pointerup', end); base.addEventListener('pointercancel', end);
  document.getElementById('act').addEventListener('pointerdown', e => { e.preventDefault(); interact(); });
}
let padPrev = {};
function pollPad() {
  const gp = navigator.getGamepads?.()[0]; if (!gp || S.xr) return null;
  const dz = v => Math.abs(v) < 0.15 ? 0 : v;
  const a = gp.buttons[0]?.pressed, st = gp.buttons[9]?.pressed;
  if (a && !padPrev.a) { if (S.mode === 'menu') startChapter(HERO_ORDER[Math.max(0, menu.hover)]); else interact(); }
  if (st && !padPrev.st) togglePause();
  padPrev = { a, st };
  S.camYaw -= dz(gp.axes[2] || 0) * 0.04; S.camPitch = Math.max(-0.1, Math.min(1.1, S.camPitch + dz(gp.axes[3] || 0) * 0.03));
  if (S.mode === 'menu') { const x = dz(gp.axes[0]); if (Math.abs(x) > 0.6 && !padPrev.lock) { menu.hover = Math.max(0, Math.min(3, (menu.hover < 0 ? 0 : menu.hover) + Math.sign(x))); padPrev.lock = true; } else if (Math.abs(x) < 0.3) padPrev.lock = false; }
  return { x: dz(gp.axes[0]), y: -dz(gp.axes[1]), run: gp.buttons[1]?.pressed || gp.buttons[7]?.pressed };
}

// ---------- ciclo principal ----------
let lastT = performance.now();
const v3 = new THREE.Vector3(), v3b = new THREE.Vector3(), head = new THREE.Vector3(), fwd = new THREE.Vector3();
let stepIdx = 0, snapLock = false;

function movePlayer(dt, ix, iy, run) {
  const mag = Math.min(1, Math.hypot(ix, iy)); let speed = 0;
  if (mag > 0.05) {
    const yaw = S.xr ? S.headYaw : S.camYaw;
    const f = v3.set(Math.sin(yaw), 0, Math.cos(yaw)), r = v3b.set(-Math.cos(yaw), 0, Math.sin(yaw));
    const dx = f.x * iy + r.x * ix, dz = f.z * iy + r.z * ix, l = Math.hypot(dx, dz) || 1;
    speed = (run ? 8.5 : 5.2) * mag * (S.xr ? 0.75 : 1);
    const nx = S.pos.x + dx / l * speed * dt, nz = S.pos.z + dz / l * speed * dt;
    if (!world.blocked(nx, nz)) { S.pos.x = nx; S.pos.z = nz; }
    else if (!world.blocked(nx, S.pos.z)) S.pos.x = nx;
    else if (!world.blocked(S.pos.x, nz)) S.pos.z = nz;
    const ty = Math.atan2(dx, dz); let d = ty - S.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); S.yaw += d * Math.min(1, dt * 12);
    if (!S.xr && iy > 0.3 && S.t - S.lastDrag > 1.6) { let c = S.yaw - S.camYaw; c = Math.atan2(Math.sin(c), Math.cos(c)); S.camYaw += c * dt * 1.1; }
  }
  world.collide(S.pos);
  for (const n of Object.values(S.npcs)) { if (!n.c.root.visible) continue; const p = n.c.root.position, dx = S.pos.x - p.x, dz = S.pos.z - p.z, d = Math.hypot(dx, dz); if (d < 0.75 && d > 0.001) { S.pos.x = p.x + dx / d * 0.75; S.pos.z = p.z + dz / d * 0.75; } }
  const gy = world.walkHeight(S.pos.x, S.pos.z); S.pos.y += (gy - S.pos.y) * Math.min(1, dt * 18);
  return speed;
}

function updateNPCs(dt) {
  const fol = S.follow;
  if (fol) fol.forEach((id, i) => {
    const n = S.npcs[id], lead = i === 0 ? S.pos : S.npcs[fol[i - 1]].c.root.position, p = n.c.root.position;
    const d = Math.hypot(lead.x - p.x, lead.z - p.z);
    if (d > 2.4) { n.goal = new THREE.Vector2(lead.x - (lead.x - p.x) / d * 1.9, lead.z - (lead.z - p.z) / d * 1.9); n.speed = Math.min(8.5, 2 + d * 1.2); }
  });
  for (const n of Object.values(S.npcs)) {
    const c = n.c, p = c.root.position; let sp = 0;
    if (n.goal) {
      const dx = n.goal.x - p.x, dz = n.goal.y - p.z, d = Math.hypot(dx, dz);
      if (d < 0.25) n.goal = null;
      else { sp = Math.min(n.speed || 3, d * 3); p.x += dx / d * sp * dt; p.z += dz / d * sp * dt; let a = Math.atan2(dx, dz) - c.root.rotation.y; a = Math.atan2(Math.sin(a), Math.cos(a)); c.root.rotation.y += a * Math.min(1, dt * 8); }
    }
    p.y = world.walkHeight(p.x, p.z);
    const pd = Math.hypot(S.pos.x - p.x, S.pos.z - p.z);
    const talking = S.dq && S.dq.npc === n.id;
    if (talking && !n.goal) { let a = Math.atan2(S.pos.x - p.x, S.pos.z - p.z) - c.root.rotation.y; a = Math.atan2(Math.sin(a), Math.cos(a)); c.root.rotation.y += a * Math.min(1, dt * 5); }
    c.lookTarget = pd < 7 ? S.pos : null;
    if (!n.dancing) c.anim = talking ? 'talk' : n.baseAnim;
    c.update(dt, sp);
    n.tag.visible = S.mode === 'play' && c.root.visible && pd < 11 && !!n.def.name;
  }
  // roda de jongo
  const [fx, fz] = P.fire;
  for (const c of S.extras) {
    c.ring += dt * 0.22; const r = 3.0, x = fx + Math.cos(c.ring) * r, z = fz + Math.sin(c.ring) * r;
    c.root.position.set(x, world.walkHeight(x, z), z); c.root.rotation.y = Math.atan2(fx - x, fz - z) + Math.sin(S.t * 2 + c.ring) * 0.6;
    if (c.anim !== 'dance') c.anim = 'dance';
    if (!c.npc) c.update(dt, 0);
  }
}

function targetPos() {
  const b = S.beat; if (!b) return null;
  const visibleNPC = id => S.npcs[id] && S.npcs[id].c.root.visible ? S.npcs[id].c.root.position : null;
  switch (b.type) {
    case 'talk': return visibleNPC(b.npc);
    case 'visit': { let best = null, bd = 1e9; for (const [id] of b.npcs) { if (S.visited.has(id)) continue; const p = visibleNPC(id); if (!p) continue; const d = p.distanceTo(S.pos); if (d < bd) { bd = d; best = p; } } return best; }
    case 'goto': return v3.set(b.at[0], world.walkHeight(b.at[0], b.at[1]), b.at[1]).clone();
    case 'trail': { const pt = b.pts[S.trailIdx]; return pt ? new THREE.Vector3(pt[0], world.walkHeight(pt[0], pt[1]), pt[1]) : null; }
    case 'collect': { let best = null, bd = 1e9; for (const it of S.items) { if (it.got) continue; const d = Math.hypot(it.x - S.pos.x, it.z - S.pos.z); if (d < bd) { bd = d; best = new THREE.Vector3(it.x, it.y, it.z); } } return best; }
  }
  return null;
}

function updatePlay(dt, mv) {
  const b = S.beat;
  // coleta
  for (const it of S.items) {
    if (it.got) continue;
    it.g.position.y = it.y + 0.7 + Math.sin(S.t * 2.5 + it.ph) * 0.12; it.m.rotation.y += dt * 1.2; it.glow.material.opacity = 0.6 + Math.sin(S.t * 4 + it.ph) * 0.25;
    if (S.mode === 'play' && Math.hypot(it.x - S.pos.x, it.z - S.pos.z) < 1.8) {
      it.got = true; if (it.kind === 'cova') audio.dig(); audio.collect();
      if (it.kind === 'cova') { it.glow.visible = false; it.g.position.y = it.y + 0.15; it.m.scale.setScalar(1.6); }
      else { it.g.visible = false; }
      updateObjective();
      if (b && b.type === 'collect' && S.items.filter(i => i.got && i.kind === b.item).length >= b.pts.length) completeBeat();
    }
  }
  if (!S.beat || S.mode !== 'play') return;
  if (b.type === 'goto' && Math.hypot(b.at[0] - S.pos.x, b.at[1] - S.pos.z) < (b.r || 4)) completeBeat();
  if (b.type === 'trail') {
    const pt = b.pts[S.trailIdx];
    if (pt && Math.hypot(pt[0] - S.pos.x, pt[1] - S.pos.z) < 5) { S.trailIdx++; updateObjective(); audio.ui(); if (S.trailIdx >= b.pts.length) completeBeat(); }
  }
  // interação próxima
  S.near = null;
  if (S.beat) {
    const ids = b.type === 'talk' ? [b.npc] : b.type === 'visit' ? b.npcs.map(e => e[0]).filter(id => !S.visited.has(id)) : [];
    let bd = 3.4;
    for (const id of ids) { const n = S.npcs[id]; if (!n || !n.c.root.visible) continue; const d = Math.hypot(n.c.root.position.x - S.pos.x, n.c.root.position.z - S.pos.z); if (d < bd) { bd = d; S.near = n; } }
  }
}

const occRay = new THREE.Raycaster(), camDir = new THREE.Vector3();
function updateCamera(dt) {
  const k = 1 - Math.exp(-dt * 6);
  if (S.mode === 'intro') {
    const a = (S.t - S.t0) * 0.08 + S.yaw + Math.PI, r = 16;
    v3.set(S.pos.x + Math.sin(a) * r, S.pos.y + 7, S.pos.z + Math.cos(a) * r); v3.y = Math.max(v3.y, world.walkHeight(v3.x, v3.z) + 2);
    v3b.set(S.pos.x, S.pos.y + 1.4, S.pos.z);
    if (S.snap) { camera.position.copy(v3); S.lookAt.copy(v3b); S.snap = false; }
    camera.position.lerp(v3, k * 0.5); S.lookAt.lerp(v3b, k); camera.lookAt(S.lookAt); return;
  }
  if (S.mode === 'epilogue') {
    const m = S.memorial.group.position, a = -Math.PI / 2 + Math.sin(S.t * 0.09) * 0.55, r = 8.5;
    v3.set(m.x + Math.sin(a) * r, m.y + 1.9 + Math.sin(S.t * 0.2) * 0.3, m.z + Math.cos(a) * r);
    v3b.set(m.x, m.y + 1.2, m.z);
    if (S.snap) { camera.position.copy(v3); S.lookAt.copy(v3b); S.snap = false; }
    camera.position.lerp(v3, k * 0.4); S.lookAt.lerp(v3b, k); camera.lookAt(S.lookAt); return;
  }
  const npc = S.dq && S.dq.npc && S.npcs[S.dq.npc];
  if (S.mode === 'dialog' && npc) {
    const p = npc.c.root.position, mid = v3b.set((p.x + S.pos.x) / 2, (p.y + S.pos.y) / 2 + 1.35, (p.z + S.pos.z) / 2);
    const dx = p.x - S.pos.x, dz = p.z - S.pos.z, l = Math.hypot(dx, dz) || 1, side = S.dq.who === npc.def.name ? 1 : -1;
    v3.set(mid.x + (-dz / l) * 3.3 * side - dx / l * 1.4 * side, mid.y + 0.35, mid.z + (dx / l) * 3.3 * side - dz / l * 1.4 * side);
    v3.y = Math.max(v3.y, world.walkHeight(v3.x, v3.z) + 0.8);
    camera.position.lerp(v3, k * 0.6); S.lookAt.lerp(mid, k); camera.lookAt(S.lookAt); return;
  }
  const f = v3.set(Math.sin(S.camYaw), 0, Math.cos(S.camYaw));
  const tgt = v3b.set(S.pos.x, S.pos.y + 1.55, S.pos.z);
  // colisão de câmera: aproxima quando uma construção ou o trem fica no caminho
  let d = S.camDist;
  if ((S.occT = (S.occT || 0) + 1) % 2 === 0 || S.occD === undefined) {
    const dir = camDir.set(-f.x * Math.cos(S.camPitch), Math.sin(S.camPitch), -f.z * Math.cos(S.camPitch)).normalize();
    occRay.set(tgt, dir); occRay.far = S.camDist;
    const vis = world.occluders.filter(o => o.visible && o.parent?.visible !== false);
    const hit = occRay.intersectObjects(vis, false)[0];
    S.occD = hit ? Math.max(1.2, hit.distance - 0.35) : S.camDist;
  }
  S.camD = S.camD === undefined ? S.occD : S.camD + (S.occD - S.camD) * Math.min(1, dt * (S.occD < S.camD ? 14 : 3));
  d = Math.min(d, S.camD);
  const cp = new THREE.Vector3(tgt.x - f.x * d * Math.cos(S.camPitch), tgt.y + d * Math.sin(S.camPitch), tgt.z - f.z * d * Math.cos(S.camPitch));
  cp.y = Math.max(cp.y, world.walkHeight(cp.x, cp.z) + 0.6, WATER_Y + 0.4);
  camera.position.lerp(cp, 1 - Math.exp(-dt * 10)); S.lookAt.lerp(tgt, 1 - Math.exp(-dt * 14)); camera.lookAt(S.lookAt);
}

function updateXR(dt) {
  camera.getWorldPosition(head); camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
  S.headYaw = Math.atan2(fwd.x, fwd.z);
  let a = S.headYaw - S.panelYaw; a = Math.atan2(Math.sin(a), Math.cos(a)); S.panelYaw += a * Math.min(1, dt * (Math.abs(a) > 0.6 ? 4 : 0.8));
  const dir = v3.set(Math.sin(S.panelYaw), 0, Math.cos(S.panelYaw));
  vrDialog.mesh.position.copy(head).addScaledVector(dir, 1.45); vrDialog.mesh.position.y = head.y - 0.08; vrDialog.mesh.lookAt(head.x, vrDialog.mesh.position.y, head.z);
  vrHud.mesh.position.copy(head).addScaledVector(dir, 1.2); vrHud.mesh.position.y = head.y - 0.62; vrHud.mesh.lookAt(head);
  // controles
  let ix = 0, iy = 0, turn = 0, run = false;
  for (const c of ctrls) {
    const src = c.userData.src; if (!src?.gamepad) continue; const ax = src.gamepad.axes;
    if (src.handedness === 'left') { ix = ax[2] || 0; iy = -(ax[3] || 0); run = src.gamepad.buttons[1]?.pressed; }
    else if (src.handedness === 'right') turn = ax[2] || 0;
  }
  if (Math.abs(turn) > 0.65 && !snapLock) { S.vrYaw -= Math.sign(turn) * Math.PI / 6; snapLock = true; } else if (Math.abs(turn) < 0.3) snapLock = false;
  return { ix: Math.abs(ix) > 0.15 ? ix : 0, iy: Math.abs(iy) > 0.15 ? iy : 0, run };
}

let lastHud = '';
function loop() {
  const now = performance.now(), raw = (now - lastT) / 1000, dt = Math.min(0.05, raw); lastT = now; S.t += dt;
  adaptResolution(raw);
  if (S.mode === 'menu') {
    // memorial
    const cam = camera, aspect = innerWidth / innerHeight, D = Math.max(4.3, 4.1 / (Math.tan(THREE.MathUtils.degToRad(29)) * aspect));
    if (!S.xr) {
      const mx = menu.pointer ? menu.mx : Math.sin(S.t * 0.2) * 0.3;
      cam.position.lerp(v3.set(mx * 0.45, 1.45 + (aspect < 1 ? 0.5 : 0), D), S.t < 0.2 ? 1 : 0.04); cam.lookAt(0, aspect < 1 ? 1.35 : 0.92, 0);
      if (menu.pointer && !drag) { ray.setFromCamera(new THREE.Vector2(menu.mx, -menu.my), cam); const i = pickMemorial(ray); if (i !== menu.hoverPick) { menu.hoverPick = i; if (i >= 0) menu.hover = i; else if (!document.querySelector('.hero-card:hover')) menu.hover = -1; } }
      canvas.style.cursor = menu.hover >= 0 && menu.hoverPick >= 0 ? 'pointer' : '';
    } else {
      vrTitle.mesh.visible = vrEpi.mesh.visible = true;
      let hv = -1; for (const c of ctrls) { const i = pickMemorial(pointRay(c)); if (i >= 0) hv = i; } menu.hover = hv;
    }
    if (menu.hover !== menu.hlShown) { menu.hlShown = menu.hover; document.querySelectorAll('.hero-card').forEach((e, i) => e.classList.toggle('hl', i === menu.hover)); }
    menu.mem.chars.forEach((c, i) => {
      const on = i === menu.hover; c.anim = on ? 'wave' : 'idle'; c.update(dt, 0);
      c.root.rotation.y += ((on ? 0.25 * (c.root.position.x < 0 ? 1 : -1) : 0) - c.root.rotation.y) * 0.08;
      menu.spots[i].intensity += ((on ? 40 : menu.hover < 0 ? 18 : 9) - menu.spots[i].intensity) * 0.1;
    });
    menu.dust.rotation.y += dt * 0.02; audio.setAmbient({ world: false });
    if (S.xr) menu.scene.add(rig);
  } else {
    if (!S.xr) { vrTitle.mesh.visible = vrEpi.mesh.visible = false; }
    let ix = 0, iy = 0, run = false;
    const K = input.keys;
    ix = (K.KeyD || K.ArrowRight ? 1 : 0) - (K.KeyA || K.ArrowLeft ? 1 : 0);
    iy = (K.KeyW || K.ArrowUp ? 1 : 0) - (K.KeyS || K.ArrowDown ? 1 : 0);
    run = K.ShiftLeft || K.ShiftRight;
    if (input.joy.x || input.joy.y) { ix = input.joy.x; iy = input.joy.y; run = Math.hypot(ix, iy) > 0.92; }
    const pad = pollPad(); if (pad && (pad.x || pad.y)) { ix = pad.x; iy = pad.y; run = pad.run; }
    if (S.xr) { const x = updateXR(dt); ix = x.ix; iy = x.iy; run = x.run; }
    const canMove = S.mode === 'play' && !S.paused;
    const sp = canMove ? movePlayer(dt, ix, iy, run) : (world.collide(S.pos), 0);
    if (S.player) {
      S.player.root.position.copy(S.pos); S.player.root.rotation.y = S.yaw; S.player.update(dt, sp);
      S.player.root.visible = !S.xr && S.mode !== 'epilogue';
      if (S.mode === 'dialog' && S.dq?.npc) { const p = S.npcs[S.dq.npc]?.c.root.position; if (p) { let a = Math.atan2(p.x - S.pos.x, p.z - S.pos.z) - S.yaw; a = Math.atan2(Math.sin(a), Math.cos(a)); S.yaw += a * Math.min(1, dt * 5); } }
      const si = Math.floor(S.player.phase / Math.PI);
      if (sp > 0.5 && si !== stepIdx) {
        const onBridge = world.bridgeOn && Math.abs(S.pos.z - 30) < 1.7 && Math.abs(S.pos.x - riverX(30)) < 11;
        const onDeck = world.decks.some(d => !d.off && Math.abs(S.pos.x - d.x) < d.hw && Math.abs(S.pos.z - d.z) < d.hd);
        audio.step(heightAt(S.pos.x, S.pos.z) < WATER_Y && !onBridge ? 'water' : onBridge ? 'wood' : onDeck ? 'stone' : 'grass');
      }
      stepIdx = si;
    }
    if (S.memorial) S.memorial.chars.forEach(c => c.update(dt, 0));
    updateNPCs(dt);
    updatePlay(dt);
    // marcador + bússola
    const tp = S.mode === 'play' ? targetPos() : null;
    if (tp) {
      marker.visible = true; marker.position.copy(tp); const isNPC = S.beat.type === 'talk' || S.beat.type === 'visit';
      marker.userData.gem.position.y = isNPC ? 2.75 + Math.sin(S.t * 3) * 0.1 : 1.6; marker.userData.gem.rotation.y += dt * 2;
      marker.userData.ring.scale.setScalar(1 + Math.sin(S.t * 3) * 0.12); marker.userData.beam.material.uniforms.t.value = S.t;
      const yaw = S.xr ? S.headYaw : S.camYaw, dx = tp.x - S.pos.x, dz = tp.z - S.pos.z;
      const fx = Math.sin(yaw), fz = Math.cos(yaw), rx = -Math.cos(yaw), rz = Math.sin(yaw);
      ui.compass(Math.atan2(dx * rx + dz * rz, dx * fx + dz * fz), Math.hypot(dx, dz));
    } else { marker.visible = false; ui.compass(null); }
    const promptTxt = S.near && S.mode === 'play' ? `${S.xr ? 'Gatilho' : TOUCH ? '✋' : 'E'} — Conversar com ${S.near.def.name}` : '';
    ui.prompt(promptTxt);
    if (S.xr && S.mode === 'play' && S.beat) { const key = S.beat.obj + progress() + promptTxt; if (key !== lastHud) { lastHud = key; drawHudVR(vrHud, `${S.beat.obj} ${progress()}`, promptTxt); } }
    else if (S.xr) { vrHud.hide(); lastHud = ''; }
    if (S.xr) {
      rig.position.set(S.pos.x, S.pos.y, S.pos.z); rig.rotation.y = S.vrYaw;
      if (S.mode === 'dialog' && !vrDialog.mesh.visible && S.dq) showLine();
      if (S.card && !vrDialog.mesh.visible) drawCardVR(vrDialog, S.card, 'Gatilho: ' + S.card.buttons[0][0]);
    } else updateCamera(dt);
    // som ambiente
    const dRiver = Math.abs(S.pos.x - riverX(S.pos.z)), dFalls = Math.hypot(S.pos.x - FALLS.x, S.pos.z - FALLS.z);
    let fire = 0; for (const F of world.fires) if (!F.off) fire = Math.max(fire, 1 - Math.hypot(S.pos.x - F.x, S.pos.z - F.z) / 16);
    const T = world.train; if (T && T.g.visible) { const lp = T.cars[0].position, dT = Math.hypot(lp.x - S.pos.x, lp.z - S.pos.z); audio.setTrain(Math.max(0, 1 - dT / 140), Math.abs(T.speed) * 160); } else audio.setTrain(0, 0);
    const bell = world.track.visible ? Math.max(0, 1 - Math.hypot(S.pos.x - P.capela[0], S.pos.z - P.capela[1]) / 160) : 0;
    audio.setAmbient({ bell, river: Math.max(0, 1 - (dRiver - 6) / 45), falls: Math.max(0, 1 - dFalls / 70), fire, night: world.night, wind: 0.04 + Math.min(0.08, Math.max(0, S.pos.y) * 0.003) });
    world.update(dt, S.t, S.pos, camera);
  }
  draw();
}

addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); composer?.setSize(innerWidth, innerHeight); });
renderer.setAnimationLoop(loop);
audio.setTheme('menu');
requestAnimationFrame(() => { document.getElementById('loader').classList.add('off'); ui.show('#menu'); });
window.__game = { S, world, startChapter, startEpilogue, toMenu, CHAPTERS, interact, advance, targetPos, begin };
