// Fully synthesized audio (WebAudio) — zero asset files, works offline + inside the extension.
import { Save } from './save.js';

let ctx = null, master = null, sfxBus = null, musicBus = null, musicFilter = null;
let musicOn = false, nextNoteTime = 0, step = 0, timer = null, nightMix = 0;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain(); master.connect(ctx.destination);
  sfxBus = ctx.createGain(); sfxBus.connect(master);
  musicFilter = ctx.createBiquadFilter(); musicFilter.type = 'lowpass'; musicFilter.frequency.value = 5000;
  musicBus = ctx.createGain(); musicBus.connect(musicFilter); musicFilter.connect(master);
  applyVolumes();
  return ctx;
}

export function applyVolumes() {
  if (!ctx) return;
  const s = Save.data.settings;
  sfxBus.gain.value = s.sfx * 0.55;
  musicBus.gain.value = s.music * 0.22;
}

export function unlockAudio() {
  const c = ensure();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

function tone({ f = 440, f2 = null, d = 0.12, type = 'square', v = 0.5, at = 0, bus = sfxBus, attack = 0.005 }) {
  if (!ctx) return;
  const t = ctx.currentTime + at;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + d);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g); g.connect(bus); o.start(t); o.stop(t + d + 0.02);
}

function noise({ d = 0.2, v = 0.4, at = 0, hp = 400, lp = 6000 }) {
  if (!ctx) return;
  const t = ctx.currentTime + at;
  const len = Math.floor(ctx.sampleRate * d);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate), data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const h = ctx.createBiquadFilter(); h.type = 'highpass'; h.frequency.value = hp;
  const l = ctx.createBiquadFilter(); l.type = 'lowpass'; l.frequency.value = lp;
  const g = ctx.createGain(); g.gain.value = v;
  src.connect(h); h.connect(l); l.connect(g); g.connect(sfxBus); src.start(t);
}

let coinCombo = 0, coinComboT = 0;
export const sfx = {
  jump() { tone({ f: 260, f2: 620, d: 0.16, type: 'square', v: 0.25 }); },
  doubleJump() { tone({ f: 420, f2: 980, d: 0.18, type: 'triangle', v: 0.35 }); },
  web() { noise({ d: 0.12, v: 0.3, hp: 1800, lp: 9000 }); tone({ f: 900, f2: 300, d: 0.14, type: 'sawtooth', v: 0.12 }); },
  power() { [523, 784, 1047, 1568].forEach((f, i) => tone({ f, d: 0.14, type: 'triangle', v: 0.3, at: i * 0.045 })); },
  land() { noise({ d: 0.07, v: 0.18, hp: 200, lp: 1200 }); },
  coin() {
    const now = performance.now();
    coinCombo = now - coinComboT < 450 ? Math.min(coinCombo + 1, 10) : 0; coinComboT = now;
    const b = 988 * Math.pow(2, coinCombo / 24);
    tone({ f: b, d: 0.07, type: 'square', v: 0.18 }); tone({ f: b * 1.335, d: 0.22, type: 'square', v: 0.18, at: 0.06 });
  },
  star() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ f, d: 0.18, type: 'triangle', v: 0.35, at: i * 0.06 })); },
  stomp() { tone({ f: 300, f2: 80, d: 0.14, type: 'square', v: 0.35 }); noise({ d: 0.08, v: 0.2, lp: 2000 }); },
  hurt() { tone({ f: 220, f2: 70, d: 0.3, type: 'sawtooth', v: 0.3 }); noise({ d: 0.15, v: 0.25, lp: 1500 }); },
  apple() { [660, 880, 1100].forEach((f, i) => tone({ f, d: 0.12, type: 'sine', v: 0.4, at: i * 0.05 })); },
  chest() { [392, 523, 659, 784, 1047].forEach((f, i) => tone({ f, d: 0.25, type: 'triangle', v: 0.3, at: i * 0.08 })); },
  bump() { tone({ f: 180, f2: 120, d: 0.1, type: 'square', v: 0.3 }); },
  crate() { noise({ d: 0.18, v: 0.35, hp: 150, lp: 2500 }); tone({ f: 140, f2: 60, d: 0.15, type: 'triangle', v: 0.3 }); },
  click() { tone({ f: 700, f2: 900, d: 0.05, type: 'triangle', v: 0.25 }); },
  checkpoint() { [523, 784, 1047].forEach((f, i) => tone({ f, d: 0.2, type: 'square', v: 0.18, at: i * 0.09 })); },
  buy() { [784, 988, 1175, 1568].forEach((f, i) => tone({ f, d: 0.15, type: 'square', v: 0.16, at: i * 0.05 })); },
  die() { [523, 440, 349, 262, 196].forEach((f, i) => tone({ f, d: 0.22, type: 'square', v: 0.22, at: i * 0.12 })); },
  gameOver() { [392, 370, 349, 330].forEach((f, i) => tone({ f, f2: f * 0.97, d: 0.4, type: 'triangle', v: 0.35, at: i * 0.3 })); },
  win() {
    const seq = [523, 659, 784, 1047, 784, 1047, 1319];
    seq.forEach((f, i) => tone({ f, d: 0.22, type: 'square', v: 0.2, at: i * 0.11 }));
    seq.forEach((f, i) => tone({ f: f / 2, d: 0.22, type: 'triangle', v: 0.25, at: i * 0.11 }));
  },
  dayBreak() { [392, 523, 659, 784].forEach((f, i) => tone({ f, d: 0.5, type: 'sine', v: 0.18, at: i * 0.12 })); },
  nightFall() { [659, 523, 440, 330].forEach((f, i) => tone({ f, d: 0.6, type: 'sine', v: 0.16, at: i * 0.14 })); },
};

// --- Music: tiny step sequencer. Major-pentatonic by day, softer + filtered by night.
const BPM = 128, STEP = 60 / BPM / 2;
const CHORDS = [[48, 55, 64], [45, 52, 60], [41, 48, 57], [43, 50, 59]];          // C Am F G
const MELODY = [72, -1, 76, 79, 76, -1, 74, 72, 69, -1, 72, 74, 76, 74, 72, -1,
                72, -1, 76, 79, 81, 79, 76, -1, 74, 76, 74, 72, 67, -1, 72, -1];
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

function schedule() {
  while (nextNoteTime < ctx.currentTime + 0.12) {
    const t = nextNoteTime - ctx.currentTime;
    const chord = CHORDS[Math.floor(step / 8) % 4];
    if (step % 2 === 0) tone({ f: mtof(chord[0] - 12 + (step % 4 === 2 ? 12 : 0)), d: STEP * 1.6, type: 'triangle', v: 0.5, at: t, bus: musicBus });
    if (step % 8 === 0) chord.forEach((n) => tone({ f: mtof(n + 12), d: STEP * 7, type: 'sine', v: 0.12, at: t, bus: musicBus, attack: 0.05 }));
    const m = MELODY[step % 32];
    if (m > 0) tone({ f: mtof(m), d: STEP * 1.4, type: nightMix > 0.5 ? 'sine' : 'square', v: nightMix > 0.5 ? 0.22 : 0.1, at: t, bus: musicBus });
    if (step % 4 === 0 && nightMix < 0.6) noise({ d: 0.04, v: 0.05, at: t, hp: 6000 });
    nextNoteTime += STEP; step++;
  }
}

export function startMusic() {
  if (!ensure() || musicOn) return;
  musicOn = true; nextNoteTime = ctx.currentTime + 0.1; step = 0;
  timer = setInterval(schedule, 40);
}
export function stopMusic() { musicOn = false; clearInterval(timer); timer = null; }
export function setNight(n) {
  nightMix = n;
  if (musicFilter && ctx) musicFilter.frequency.setTargetAtTime(5200 - n * 4200, ctx.currentTime, 0.3);
}
export function suspendAll(yes) {
  if (!ctx) return;
  if (yes) ctx.suspend().catch(() => {}); else ctx.resume().catch(() => {});
}
