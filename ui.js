// Interface: HTML no modo tela e painéis 3D (canvas) dentro do óculos VR.
import * as THREE from 'three';

const $ = s => document.querySelector(s);
const strip = h => h.replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '');
export const SPEAKER_COLORS = { 'Narração': '#d9b26f', 'Aruê': '#e2763f', 'Bento': '#c9a14a', 'Pietro': '#7fa7c9', 'Youssef': '#d9545a' };

// ---------- painel VR ----------
export class Panel {
  constructor(w = 1.5, h = 0.86, px = 1024) {
    this.c = document.createElement('canvas'); this.c.width = px; this.c.height = Math.round(px * h / w);
    this.tex = new THREE.CanvasTexture(this.c); this.tex.colorSpace = THREE.SRGBColorSpace;
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, depthTest: false, fog: false }));
    this.mesh.renderOrder = 999; this.mesh.visible = false;
  }
  draw(fn) { const x = this.c.getContext('2d'); x.clearRect(0, 0, this.c.width, this.c.height); fn(x, this.c.width, this.c.height); this.tex.needsUpdate = true; this.mesh.visible = true; }
  hide() { this.mesh.visible = false; }
}
function roundRect(x, X, Y, W, H, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + W, Y, X + W, Y + H, r); x.arcTo(X + W, Y + H, X, Y + H, r); x.arcTo(X, Y + H, X, Y, r); x.arcTo(X, Y, X + W, Y, r); x.closePath(); }
function wrap(x, text, X, Y, maxW, lh, maxLines = 99) {
  let y = Y; for (const para of text.split('\n')) {
    let line = ''; for (const w of para.split(' ')) { const t = line ? line + ' ' + w : w; if (x.measureText(t).width > maxW && line) { x.fillText(line, X, y); y += lh; line = w; if (--maxLines <= 0) return y; } else line = t; }
    x.fillText(line, X, y); y += lh * 1.25;
  }
  return y;
}
function panelBg(x, w, h) {
  roundRect(x, 6, 6, w - 12, h - 12, 28); x.fillStyle = 'rgba(16,12,9,0.88)'; x.fill();
  x.lineWidth = 3; x.strokeStyle = 'rgba(217,178,111,0.7)'; x.stroke();
}
export function drawDialogVR(panel, who, text, hint) {
  panel.draw((x, w, h) => {
    panelBg(x, w, h);
    x.fillStyle = SPEAKER_COLORS[who] || '#e9d8b6'; x.font = '600 40px Georgia, serif'; x.fillText(who, 48, 78);
    x.fillStyle = '#f4ead8'; x.font = (who === 'Narração' ? 'italic ' : '') + '34px Georgia, serif'; wrap(x, text, 48, 140, w - 96, 46, 9);
    x.fillStyle = 'rgba(244,234,216,.55)'; x.font = '24px sans-serif'; x.fillText(hint, 48, h - 36);
  });
}
export function drawCardVR(panel, { kicker = '', title = '', body = '', note = '' }, hint) {
  panel.draw((x, w, h) => {
    panelBg(x, w, h);
    x.fillStyle = '#d9b26f'; x.font = '26px sans-serif'; x.fillText(kicker.toUpperCase(), 48, 70);
    x.fillStyle = '#f4ead8'; x.font = '600 52px Georgia, serif'; let y = wrap(x, title, 48, 136, w - 96, 58, 2);
    x.font = '29px Georgia, serif'; x.fillStyle = '#e9dcc4'; y = wrap(x, strip(body), 48, y + 10, w - 96, 40, 9);
    if (note) { x.font = 'italic 22px Georgia, serif'; x.fillStyle = 'rgba(233,220,196,.7)'; wrap(x, strip(note), 48, y + 4, w - 96, 30, 3); }
    x.fillStyle = '#d9b26f'; x.font = '600 26px sans-serif'; x.fillText(hint, 48, h - 36);
  });
}
export function drawHudVR(panel, obj, prompt) {
  panel.draw((x, w, h) => {
    roundRect(x, 4, 4, w - 8, h - 8, 20); x.fillStyle = 'rgba(16,12,9,0.7)'; x.fill();
    x.fillStyle = '#d9b26f'; x.font = '600 26px sans-serif'; x.fillText('OBJETIVO', 28, 46);
    x.fillStyle = '#f4ead8'; x.font = '30px Georgia, serif'; wrap(x, obj, 28, 92, w - 56, 36, 2);
    if (prompt) { x.fillStyle = '#ffe3a3'; x.font = '600 28px sans-serif'; x.fillText(prompt, 28, h - 26); }
  });
}

// ---------- HTML ----------
export class UI {
  constructor() {
    this.el = { menu: $('#menu'), hud: $('#hud'), obj: $('#obj-text'), prog: $('#obj-prog'), tag: $('#chap-tag'), arrow: $('#arrow'), dist: $('#dist'), prompt: $('#prompt'), dialog: $('#dialog'), who: $('#who'), txt: $('#txt'), card: $('#card'), fade: $('#fade'), letter: $('#letterbox'), toast: $('#toast'), pause: $('#pause') };
    this.typing = null;
  }
  show(id, on = true) {
    const e = typeof id === 'string' ? $(id) : id; e.classList.toggle('on', on);
    // tela escondida não pode receber foco nem teclado (evita acionar botões invisíveis)
    e.inert = !on; if (!on && e.contains(document.activeElement)) document.activeElement.blur();
  }
  fade(on) { return new Promise(r => { this.el.fade.classList.toggle('on', on); setTimeout(r, on ? 650 : 50); }); }
  objective(text, prog = '') { this.el.obj.textContent = text; this.el.prog.textContent = prog; this.el.hud.querySelector('.objective').classList.remove('pulse'); void this.el.hud.offsetWidth; this.el.hud.querySelector('.objective').classList.add('pulse'); }
  prompt(t) { t = t || ''; if (t === this._prompt) return; this._prompt = t; this.el.prompt.textContent = t; this.el.prompt.classList.toggle('on', !!t); }
  compass(angle, dist) {
    const c = this.el.arrow.parentElement, on = angle !== null;
    if (on !== this._cOn) { this._cOn = on; c.style.opacity = on ? 1 : 0; }
    if (!on) return;
    const a = Math.round(angle * 50) / 50, d = Math.round(dist);
    if (a !== this._cA) { this._cA = a; this.el.arrow.style.transform = `rotate(${a}rad)`; }
    if (d !== this._cD) { this._cD = d; this.el.dist.textContent = d + ' m'; }
  }
  toast(t) { const e = this.el.toast; e.textContent = t; e.classList.remove('on'); void e.offsetWidth; e.classList.add('on'); }
  dialog(who, text) {
    const d = this.el; d.dialog.classList.add('on'); d.letter.classList.add('on');
    d.who.textContent = who; d.who.style.color = SPEAKER_COLORS[who] || '#e9d8b6';
    d.dialog.classList.toggle('narr', who === 'Narração');
    clearInterval(this.typing); let i = 0; d.txt.textContent = ''; this.full = text; this.done = false;
    let k = 0;
    this.typing = setInterval(() => { i += 2; d.txt.textContent = text.slice(0, i); if (++k % 4 === 0 && /\w/.test(text[i] || '')) this.onType?.(); if (i >= text.length) { clearInterval(this.typing); this.done = true; } }, 16);
  }
  skipType() { if (!this.done) { clearInterval(this.typing); this.el.txt.textContent = this.full; this.done = true; return true; } return false; }
  closeDialog() { clearInterval(this.typing); this.done = true; this.el.dialog.classList.remove('on'); this.el.letter.classList.remove('on'); }
  card({ kicker = '', title = '', body = '', note = '', extra = '', buttons = [] }) {
    const c = this.el.card;
    c.querySelector('.k').textContent = kicker; c.querySelector('h2').innerHTML = title;
    c.querySelector('.b').innerHTML = body; c.querySelector('.n').innerHTML = note; c.querySelector('.x').innerHTML = extra;
    const bt = c.querySelector('.btns'); bt.innerHTML = '';
    let used = false; // cada cartão aceita um único clique (sem acionamento duplo)
    buttons.forEach(([label, fn, primary], i) => { const b = document.createElement('button'); b.textContent = label; b.className = primary || i === 0 ? 'primary' : ''; b.onclick = () => { if (used) return; used = true; fn(); }; bt.appendChild(b); });
    this.show(c, true); setTimeout(() => { if (c.classList.contains('on')) bt.querySelector('button')?.focus(); }, 400);
  }
  closeCard() { this.show(this.el.card, false); }
}
