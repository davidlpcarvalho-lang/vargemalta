// Áudio 100% procedural (Web Audio): ambiente, passos, interface e temas musicais
// inspirados em cada matriz cultural (flauta, tambores do caxambu, acordeão, alaúde/oud).
const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);

export class AudioEngine {
  constructor() { this.ctx = null; this.theme = null; this.musicOn = true; this.muted = false; this.drums = false; this.amb = {}; this.train = { level: 0, rate: 0 }; this.nextChug = 0; this.nextCicada = 0; this.nextFrog = 0; this.nextPop = 0; this.nextBell = 0; this.bellNear = 0; this.fireLevel = 0; this.riverLevel = 0; this.day = true; }
  setMuted(m) {
    this.muted = m; if (!this.ctx) return;
    this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.08);
  }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const ctx = this.ctx = new C();
    this.master = ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.9; this.master.connect(ctx.destination);
    const comp = ctx.createDynamicsCompressor(); comp.connect(this.master);
    this.out = comp;
    this.music = ctx.createGain(); this.music.gain.value = 0.32; this.music.connect(comp);
    this.sfx = ctx.createGain(); this.sfx.gain.value = 0.6; this.sfx.connect(comp);
    this.ambBus = ctx.createGain(); this.ambBus.gain.value = 0.7; this.ambBus.connect(comp);
    // reverberação gerada
    const len = ctx.sampleRate * 2.6, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    this.verb = ctx.createConvolver(); this.verb.buffer = ir; const vg = ctx.createGain(); vg.gain.value = 0.35; this.verb.connect(vg); vg.connect(comp);
    // ruído
    const nb = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate), nd = nb.getChannelData(0);
    let last = 0; for (let i = 0; i < nd.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; nd[i] = w * 0.5 + last * 3; }
    this.noiseBuf = nb;
    const loop = (type, f, q, g) => {
      const s = ctx.createBufferSource(); s.buffer = nb; s.loop = true; s.playbackRate.value = 0.8 + Math.random() * 0.4;
      const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
      const gn = ctx.createGain(); gn.gain.value = g; s.connect(fl); fl.connect(gn); gn.connect(this.ambBus); s.start();
      return gn;
    };
    this.amb.wind = loop('lowpass', 380, 0.5, 0.05);
    this.amb.river = loop('bandpass', 900, 0.6, 0);
    this.amb.falls = loop('highpass', 500, 0.4, 0);
    this.amb.fire = loop('highpass', 2500, 0.8, 0);
    this.nextBird = 0; this.nextCricket = 0; this.nextBeat = 0; this.step16 = 0;
    this.timer = setInterval(() => this.tick(), 60);
  }
  env(g, t, a, d, peak) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  tone({ type = 'sine', f, t, a = 0.01, d = 0.4, g = 0.2, dest, verb = 0.3, vib = 0, detune = 0, filter }) {
    const ctx = this.ctx, o = ctx.createOscillator(), gn = ctx.createGain(); o.type = type; o.frequency.value = f; o.detune.value = detune;
    if (vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 5.2; lg.gain.value = vib; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + a + d + 0.1); }
    let node = o; if (filter) { const f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = filter; o.connect(f2); node = f2; }
    node.connect(gn); gn.connect(dest || this.music); if (verb) { const s = ctx.createGain(); s.gain.value = verb; gn.connect(s); s.connect(this.verb); }
    this.env(gn, t, a, d, g); o.start(t); o.stop(t + a + d + 0.05);
  }
  noise({ t, d = 0.1, f = 1000, type = 'bandpass', q = 1, g = 0.2, dest, rate = 1 }) {
    const ctx = this.ctx, s = ctx.createBufferSource(); s.buffer = this.noiseBuf; s.playbackRate.value = rate;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const gn = ctx.createGain();
    s.connect(fl); fl.connect(gn); gn.connect(dest || this.sfx); this.env(gn, t, 0.004, d, g); s.start(t, Math.random() * 2); s.stop(t + d + 0.05);
  }
  pluck(f, t, g = 0.25, dur = 1.6) { // Karplus-Strong (oud)
    const ctx = this.ctx, sr = ctx.sampleRate, n = Math.floor(sr * dur), buf = ctx.createBuffer(1, n, sr), d = buf.getChannelData(0);
    const p = Math.max(2, Math.floor(sr / f)), ring = new Float32Array(p); for (let i = 0; i < p; i++) ring[i] = Math.random() * 2 - 1;
    for (let i = 0; i < n; i++) { const k = i % p, nx = (k + 1) % p; const v = ring[k]; ring[k] = (v + ring[nx]) * 0.4975; d[i] = v; }
    const s = ctx.createBufferSource(); s.buffer = buf; const gn = ctx.createGain(); gn.gain.value = g; s.connect(gn); gn.connect(this.music);
    const v = ctx.createGain(); v.gain.value = 0.3; gn.connect(v); v.connect(this.verb); s.start(t);
  }
  drumHit(t, low, g = 0.5) {
    const ctx = this.ctx, o = ctx.createOscillator(), gn = ctx.createGain(); o.type = 'sine';
    const f0 = low ? 95 : 210; o.frequency.setValueAtTime(f0 * 1.6, t); o.frequency.exponentialRampToValueAtTime(f0, t + 0.06);
    o.connect(gn); gn.connect(this.music); const v = ctx.createGain(); v.gain.value = 0.2; gn.connect(v); v.connect(this.verb);
    this.env(gn, t, 0.003, low ? 0.45 : 0.22, g); o.start(t); o.stop(t + 0.6);
    this.noise({ t, d: 0.05, f: low ? 600 : 1800, g: g * 0.25, dest: this.music });
  }
  setTheme(name) { this.theme = name; this.step16 = 0; if (this.ctx) this.nextBeat = this.ctx.currentTime + 0.1; }
  setDrums(on) { this.drums = on; }
  // ---- ciclo ----
  tick() {
    const ctx = this.ctx; if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime, ahead = now + 0.25;
    // pássaros e grilos
    if (this.ambient !== 'none') {
      if (!this.night && now > this.nextBird) { this.bird(now + 0.05); this.nextBird = now + 1.5 + Math.random() * 4; }
      if (!this.night && this.inWorld && now > this.nextCicada) { this.cicada(now + 0.05); this.nextCicada = now + 18 + Math.random() * 22; }
      if (this.night && this.riverLevel > 0.15 && now > this.nextFrog) { this.frog(now + 0.05); this.nextFrog = now + 1.2 + Math.random() * 3 / this.riverLevel; }
      if (this.fireLevel > 0.05 && now > this.nextPop) { this.noise({ t: now + 0.02, d: 0.02, f: 3000 + Math.random() * 3000, type: 'highpass', g: 0.08 * this.fireLevel * Math.random(), dest: this.ambBus }); this.nextPop = now + 0.05 + Math.random() * 0.35; }
      if (this.train.level > 0.02 && this.train.rate > 0.05 && now > this.nextChug) { this.noise({ t: now + 0.02, d: 0.13, f: 260, type: 'lowpass', q: 0.7, g: 0.35 * this.train.level, dest: this.ambBus }); this.noise({ t: now + 0.02, d: 0.08, f: 2400, type: 'bandpass', q: 0.8, g: 0.06 * this.train.level, dest: this.ambBus }); this.nextChug = now + Math.max(0.12, 0.5 / this.train.rate); }
      if (this.bellNear > 0.05 && now > this.nextBell) { this.bell(now + 0.1, 0.12 * this.bellNear); this.nextBell = now + 50 + Math.random() * 30; }
      if (this.night && now > this.nextCricket) { for (let i = 0; i < 3; i++) this.tone({ f: 4200 + Math.random() * 300, t: now + i * 0.06, a: 0.005, d: 0.04, g: 0.025, dest: this.ambBus, verb: 0 }); this.nextCricket = now + 0.35 + Math.random() * 0.5; }
    }
    // música
    while (this.nextBeat < ahead) {
      const t = this.nextBeat, s = this.step16++;
      const bpm = { menu: 64, puri: 70, bento: 112, pietro: 96, youssef: 84, epilogue: 64 }[this.theme] || 70;
      const dur = 60 / bpm / 2; this.nextBeat += dur;
      if (this.musicOn) this.play(this.theme, s, t, dur);
      if (this.drums) this.jongo(s, t);
    }
  }
  bird(t) {
    const base = 2200 + Math.random() * 1800, n = 2 + Math.floor(Math.random() * 4), pan = this.ctx.createStereoPanner(); pan.pan.value = Math.random() * 2 - 1; pan.connect(this.ambBus);
    for (let i = 0; i < n; i++) {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain(), tt = t + i * 0.13;
      o.frequency.setValueAtTime(base, tt); o.frequency.exponentialRampToValueAtTime(base * (1.3 + Math.random() * 0.5), tt + 0.08);
      o.connect(g); g.connect(pan); this.env(g, tt, 0.01, 0.09, 0.03); o.start(tt); o.stop(tt + 0.12);
    }
  }
  jongo(s, t) {
    const p = s % 16; // tambu (grave) e candongueiro (agudo)
    if ([0, 6, 10].includes(p)) this.drumHit(t, true, 0.55);
    if ([2, 3, 5, 8, 11, 13, 14].includes(p)) this.drumHit(t, false, 0.28 + Math.random() * 0.08);
    if (p % 4 === 2) this.noise({ t, d: 0.06, f: 2400, q: 0.8, g: 0.18, dest: this.music });
  }
  play(theme, s, t, dur) {
    const S = s % 64;
    if (theme === 'menu' || theme === 'epilogue') {
      const chords = [[50, 57, 62, 65], [46, 53, 58, 62], [48, 55, 60, 64], [45, 52, 57, 60]];
      if (S % 16 === 0) chords[(S / 16) | 0].forEach((n, i) => this.tone({ type: 'triangle', f: NOTE(n), t: t + i * 0.04, a: 1.6, d: dur * 16, g: 0.05, filter: 1400, verb: 0.6 }));
      const mel = [74, 0, 72, 69, 0, 67, 69, 0, 72, 0, 74, 77, 0, 76, 74, 0];
      const m = mel[s % 16]; if (m && Math.random() < 0.75) this.tone({ f: NOTE(m), t, a: 0.005, d: 1.4, g: 0.06, verb: 0.7 });
    } else if (theme === 'puri') {
      if (S % 32 === 0) this.tone({ type: 'triangle', f: NOTE(45), t, a: 2, d: dur * 30, g: 0.05, filter: 600, verb: 0.5 });
      const mel = [69, 0, 0, 72, 74, 0, 72, 0, 69, 0, 67, 0, 69, 0, 0, 0, 76, 0, 74, 0, 72, 0, 74, 0, 69, 0, 0, 0, 0, 0, 0, 0];
      const m = mel[s % 32]; if (m) this.tone({ f: NOTE(m), t, a: 0.08, d: dur * 2.2, g: 0.07, vib: 4, verb: 0.6 });
      if (s % 4 === 0) this.noise({ t, d: 0.25, f: 6000, type: 'highpass', g: 0.02, dest: this.music });
    } else if (theme === 'bento') {
      if (S % 32 === 0) [38, 45, 50].forEach(n => this.tone({ type: 'triangle', f: NOTE(n), t, a: 1.5, d: dur * 30, g: 0.045, filter: 700, verb: 0.5 }));
      const mel = [62, 0, 65, 0, 67, 0, 0, 0, 65, 0, 62, 0, 60, 0, 0, 0];
      const m = mel[s % 16]; if (m && (S >> 4) % 2 === 0) this.tone({ type: 'sine', f: NOTE(m), t, a: 0.06, d: dur * 1.8, g: 0.06, vib: 3, verb: 0.5 });
    } else if (theme === 'pietro') { // valsa de acordeão
      const bar = (s / 3 | 0) % 8, beat = s % 3, roots = [48, 43, 43, 48, 53, 48, 43, 48], ch = [[64, 67], [62, 65], [62, 65], [64, 67], [65, 69], [64, 67], [62, 65], [64, 67]];
      if (beat === 0) this.tone({ type: 'sawtooth', f: NOTE(roots[bar]), t, a: 0.02, d: dur * 0.9, g: 0.05, filter: 900, verb: 0.2 });
      else ch[bar].forEach(n => this.tone({ type: 'sawtooth', f: NOTE(n - 12), t, a: 0.02, d: dur * 0.7, g: 0.03, filter: 1500, verb: 0.2, detune: 6 }));
      const mel = [76, 0, 79, 77, 0, 74, 74, 0, 77, 76, 0, 72, 72, 0, 76, 74, 0, 71, 72, 0, 0, 0, 0, 0];
      const m = mel[s % 24]; if (m) { this.tone({ type: 'sawtooth', f: NOTE(m), t, a: 0.04, d: dur * 1.6, g: 0.035, filter: 2200, verb: 0.3, detune: -7 }); this.tone({ type: 'sawtooth', f: NOTE(m), t, a: 0.04, d: dur * 1.6, g: 0.035, filter: 2200, verb: 0.3, detune: 7 }); }
    } else if (theme === 'youssef') { // maqam hijaz em ré
      const mel = [62, 63, 66, 67, 69, 0, 67, 66, 63, 0, 62, 0, 0, 0, 69, 70, 69, 67, 66, 0, 67, 66, 63, 62, 0, 0, 0, 0, 0, 0, 0, 0];
      const m = mel[s % 32]; if (m) this.pluck(NOTE(m - 12), t, 0.3);
      const p = s % 8; if (p === 0 || p === 5) this.drumHit(t, true, 0.22); if (p === 3 || p === 6 || p === 7) this.noise({ t, d: 0.05, f: 3000, g: 0.08, dest: this.music });
      if (S % 32 === 0) this.tone({ type: 'triangle', f: NOTE(38), t, a: 1, d: dur * 30, g: 0.04, filter: 500, verb: 0.4 });
    }
  }
  cicada(t) { // cigarras da Mata Atlântica
    const ctx = this.ctx, s = ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 4800 + Math.random() * 900; f.Q.value = 6;
    const am = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 38 + Math.random() * 12; lg.gain.value = 0.5; am.gain.value = 0.5; lfo.connect(lg); lg.connect(am.gain);
    const g = ctx.createGain(), pan = ctx.createStereoPanner(); pan.pan.value = Math.random() * 1.6 - 0.8;
    s.connect(f); f.connect(am); am.connect(g); g.connect(pan); pan.connect(this.ambBus);
    const d = 4 + Math.random() * 3; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + d * 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.start(t); lfo.start(t); s.stop(t + d + 0.1); lfo.stop(t + d + 0.1);
  }
  frog(t) { const n = 2 + Math.floor(Math.random() * 3), f = 260 + Math.random() * 160; for (let i = 0; i < n; i++) this.tone({ type: 'square', f, t: t + i * 0.11, a: 0.005, d: 0.06, g: 0.025 * this.riverLevel, dest: this.ambBus, verb: 0.2, filter: 900 }); }
  bell(t, g = 0.12) { [1, 2.0, 2.4, 3.0, 4.2].forEach((r, i) => this.tone({ f: 330 * r, t, a: 0.004, d: 3.2 - i * 0.4, g: g / (1 + i * 0.6), dest: this.ambBus, verb: 0.6 })); }
  // ---- efeitos ----
  murmur(pitch) { // "voz" estilizada das falas
    if (!this.ctx) return; const t = this.ctx.currentTime, f = pitch * (0.85 + Math.random() * 0.35);
    this.tone({ type: 'triangle', f, t, a: 0.008, d: 0.06, g: 0.035, dest: this.sfx, verb: 0.08, filter: 1600 });
  }
  whoosh() { if (!this.ctx) return; const ctx = this.ctx, t = ctx.currentTime, s = ctx.createBufferSource(); s.buffer = this.noiseBuf; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(2400, t + 0.5); const g = ctx.createGain(); s.connect(f); f.connect(g); g.connect(this.sfx); this.env(g, t, 0.15, 0.4, 0.07); s.start(t); s.stop(t + 0.6); }
  build() { if (!this.ctx) return; const t = this.ctx.currentTime; for (let i = 0; i < 6; i++) { const tt = t + i * 0.28 + Math.random() * 0.05; this.tone({ f: 190 + Math.random() * 40, t: tt, a: 0.002, d: 0.09, g: 0.12, dest: this.sfx, verb: 0.3 }); this.noise({ t: tt, d: 0.04, f: 1500, g: 0.1 }); } }
  dig() { if (!this.ctx) return; const t = this.ctx.currentTime; this.noise({ t, d: 0.18, f: 300, type: 'lowpass', g: 0.25 }); this.noise({ t: t + 0.2, d: 0.14, f: 260, type: 'lowpass', g: 0.18 }); }
  setTrain(level, rate) { this.train.level = level; this.train.rate = rate; }
  ui() { if (!this.ctx) return; this.tone({ f: 880, t: this.ctx.currentTime, a: 0.005, d: 0.08, g: 0.05, dest: this.sfx, verb: 0.1 }); }
  collect() { if (!this.ctx) return; const t = this.ctx.currentTime; [76, 81, 88].forEach((n, i) => this.tone({ f: NOTE(n), t: t + i * 0.07, a: 0.005, d: 0.4, g: 0.08, dest: this.sfx, verb: 0.4 })); }
  success() { if (!this.ctx) return; const t = this.ctx.currentTime; [64, 67, 72, 76].forEach((n, i) => this.tone({ type: 'triangle', f: NOTE(n), t: t + i * 0.11, a: 0.01, d: 1.1, g: 0.07, dest: this.sfx, verb: 0.6 })); }
  step(kind = 'grass') {
    if (!this.ctx) return; const t = this.ctx.currentTime;
    if (kind === 'water') this.noise({ t, d: 0.14, f: 1300, q: 0.7, g: 0.09 });
    else if (kind === 'wood') { this.tone({ f: 150 + Math.random() * 30, t, a: 0.002, d: 0.07, g: 0.07, dest: this.sfx, verb: 0.05 }); this.noise({ t, d: 0.04, f: 900, g: 0.05 }); }
    else if (kind === 'stone') this.noise({ t, d: 0.05, f: 1800 + Math.random() * 500, q: 1.4, g: 0.05 });
    else this.noise({ t, d: 0.08, f: 420 + Math.random() * 200, q: 0.9, g: 0.06 });
  }
  whistle() { if (!this.ctx) return; const t = this.ctx.currentTime; [0, 0.5].forEach(o => this.tone({ type: 'square', f: 520, t: t + o, a: 0.05, d: 0.4, g: 0.03, dest: this.sfx, verb: 0.8, filter: 1800 })); }
  setAmbient({ river = 0, falls = 0, fire = 0, night = 0, wind = 0.05, bell = 0, world = true }) {
    this.fireLevel = fire; this.riverLevel = river; this.bellNear = bell; this.inWorld = world;
    if (!this.ctx) return; const t = this.ctx.currentTime;
    this.amb.river.gain.setTargetAtTime(river * 0.18, t, 0.3); this.amb.falls.gain.setTargetAtTime(falls * 0.3, t, 0.3);
    this.amb.fire.gain.setTargetAtTime(fire * 0.05, t, 0.3); this.amb.wind.gain.setTargetAtTime(wind, t, 0.5);
    this.night = night > 0.5;
  }
}
