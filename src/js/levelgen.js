// Seeded procedural level builder. Levels 1..24 are deterministic; endless mode streams chunks forever.
import { T, ROWS, LEVEL_COUNT, worldFor, WORLDS, POWERUPS } from './config.js';
import { mulberry32 } from './util.js';

export const TILE = { EMPTY: 0, GROUND: 1, PLAT: 2, BOX: 3, USED: 4, CRATE: 5 };
export const isSolid = (t) => t === 1 || t === 3 || t === 4 || t === 5;

export class Level {
  constructor({ index = 0, endless = false }) {
    this.index = index; this.endless = endless;
    this.world = endless ? WORLDS[0] : worldFor(index);
    this.cols = []; this.ents = []; this.decor = [];
    this.goalX = Infinity; this.checkpoints = []; this.totalStars = 0;
    this.rng = mulberry32(endless ? (Date.now() & 0xffffff) : 1000 + index * 7919);
    this.diff = endless ? 0.1 : Math.min(1, (index - 1) / (LEVEL_COUNT - 1));
    this.h = 12;                 // current ground top row
    this.targetLen = endless ? Infinity : 110 + index * 6;
    this.starMarks = endless ? [] : [0.14, 0.32, 0.5, 0.68, 0.86].map((f) => Math.floor(f * this.targetLen));
    this.signPlaced = false;
    // separate stream for power-ups so tile layouts stay identical to before
    this.prng = mulberry32((endless ? (Date.now() & 0xffffff) : 1000 + index * 7919) ^ 0x5bd1e995);
    this.nextPow = 24;
    this.build();
  }

  // ---- tile access
  tile(c, r) {
    if (c < 0) return TILE.GROUND;          // left wall
    if (r < 0 || r >= ROWS) return TILE.EMPTY;
    if (c >= this.cols.length) { if (this.endless) this.extend(c + 40); else return TILE.EMPTY; }
    return this.cols[c][r];
  }
  set(c, r, v) { if (this.cols[c] && r >= 0 && r < ROWS) this.cols[c][r] = v; }
  groundTop(c) { const col = this.cols[c]; if (!col) return ROWS; for (let r = 0; r < ROWS; r++) if (col[r] === TILE.GROUND) return r; return ROWS; }

  // ---- column helpers
  pushCol(top) { const col = new Uint8Array(ROWS); if (top < ROWS) for (let r = top; r < ROWS; r++) col[r] = TILE.GROUND; this.cols.push(col); return this.cols.length - 1; }
  ent(type, c, yTop, extra = {}) { this.ents.push({ type, x: c * T, y: yTop, ...extra }); }
  r(a, b) { return a + this.rng() * (b - a); }
  ri(a, b) { return Math.floor(this.r(a, b + 1)); }
  chance(p) { return this.rng() < p; }

  build() {
    // start: safe flat runway
    for (let i = 0; i < 10; i++) { const c = this.pushCol(this.h); if (i > 2 && i % 4 === 0) this.decorAt(c); }
    this.start = { x: 3 * T, y: this.h * T - 60 };
    if (this.endless) { this.extend(80); return; }
    while (this.cols.length < this.targetLen) this.segment();
    this.finish();
  }

  extend(upTo) { while (this.cols.length < upTo) this.segment(); }

  // Stars: placed when generation crosses a mark
  maybeStar(c, yTop) {
    if (!this.starMarks.length || c < this.starMarks[0]) return false;
    this.starMarks.shift(); this.ent('star', c, yTop - 8); this.totalStars++; return true;
  }

  decorAt(c) {
    const h = this.groundTop(c); if (h >= ROWS) return;
    const k = this.rng();
    const type = k < 0.22 ? 'tree' : k < 0.45 ? 'bush' : k < 0.7 ? 'flowers' : k < 0.82 ? 'fence' : k < 0.92 ? 'rock' : 'mushdeco';
    this.decor.push({ type, x: c * T + this.r(0, 20), y: h * T, v: this.rng(), tree: this.world.tree });
  }

  coinsRow(c0, n, row) { for (let i = 0; i < n; i++) this.ent('coin', c0 + i, row * T + 8, { dx: 8 }); }
  coinArc(c0, width, baseRow) {
    const n = Math.max(3, width + 1);
    for (let i = 0; i < n; i++) {
      const f = i / (n - 1);
      const y = baseRow * T - Math.sin(f * Math.PI) * T * 2.2 - 30;
      this.ents.push({ type: 'coin', x: (c0 + f * width) * T + 8, y });
    }
  }

  segment() {
    const d = this.diff, len = this.cols.length;
    if (this.endless) this.diff = Math.min(1, 0.1 + len / 2500);
    const opts = [
      ['flat', 3], ['gap', 2 + d * 2], ['step', 1.5], ['plats', 1 + d * 2], ['boxes', 1.3],
      ['mush', 1.6 + d], ['spike', d > 0.12 ? 1 + d * 2 : 0], ['chicken', d > 0.26 ? 0.8 + d * 2 : 0],
      ['mover', d > 0.26 ? 0.7 + d * 1.5 : 0], ['crates', d > 0.35 ? 0.9 : 0.3], ['chest', 0.35],
    ];
    if (!this.endless && this.index === 1 && !this.signPlaced && len > 14) { this.signPlaced = true; return this.segGap(true); }
    let tot = opts.reduce((a, o) => a + o[1], 0), k = this.rng() * tot, pick = 'flat';
    for (const [n, w] of opts) { if ((k -= w) <= 0) { pick = n; break; } }
    this['seg' + pick[0].toUpperCase() + pick.slice(1)]();
    this.maybePower();
  }

  // Drop a floating power-up bubble every ~22-40 columns on solid ground (walk-through height).
  maybePower() {
    const n = this.cols.length;
    if (n < this.nextPow || (!this.endless && n > this.targetLen - 8)) return;
    for (let c = n - 1; c > n - 6; c--) {
      const g = this.groundTop(c);
      if (g >= ROWS || g < 3 || this.groundTop(c - 1) !== g) continue;
      const list = Object.entries(POWERUPS); let k = this.prng() * list.reduce((a, [, p]) => a + p.w, 0), kind = list[0][0];
      for (const [id, p] of list) { if ((k -= p.w) <= 0) { kind = id; break; } }
      this.ents.push({ type: 'power', kind, x: c * T + 6, y: g * T - 78 });
      this.nextPow = n + 22 + Math.floor(this.prng() * 18);
      return;
    }
  }

  flatRun(n, decor = true) { const out = []; for (let i = 0; i < n; i++) { const c = this.pushCol(this.h); out.push(c); if (decor && this.chance(0.3)) this.decorAt(c); } return out; }

  segFlat() {
    const cs = this.flatRun(this.ri(4, 8));
    if (this.chance(0.6)) this.coinsRow(cs[1], cs.length - 2, this.h - 1);
    if (!this.maybeStar(cs[cs.length - 2], (this.h - 3) * T) && this.chance(0.1)) this.ent('apple', cs[2], (this.h - 3) * T);
  }

  segGap(sign = false) {
    const pre = this.flatRun(sign ? 4 : 2, false);
    if (sign) this.decor.push({ type: 'sign', x: pre[1] * T, y: this.h * T, text: 'JUMP!' });
    const w = sign ? 2 : this.ri(2, Math.min(4, 2 + Math.round(this.diff * 3)));
    const c0 = this.cols.length;
    for (let i = 0; i < w; i++) this.pushCol(ROWS);
    this.coinArc(c0 - 0.5, w, this.h);
    if (this.maybeStar(c0 + (w - 1) / 2, (this.h - 4) * T)) {}
    this.flatRun(2, false);
  }

  segStep() {
    const up = this.chance(0.5) ? -1 : 1, amt = this.ri(1, 2);
    this.h = Math.max(8, Math.min(12, this.h + up * amt));
    const cs = this.flatRun(this.ri(3, 6));
    if (this.chance(0.5)) this.coinsRow(cs[0], 3, this.h - 1);
    this.maybeStar(cs[cs.length - 1], (this.h - 2) * T);
  }

  segPlats() {
    this.flatRun(2, false);
    const n = this.ri(1, 2 + Math.round(this.diff));
    for (let p = 0; p < n; p++) {
      for (let i = 0; i < 2; i++) this.pushCol(ROWS);
      const row = this.h - this.ri(1, 2);
      const c0 = this.cols.length;
      for (let i = 0; i < 3; i++) { this.pushCol(ROWS); this.set(c0 + i, row, 2); }
      this.coinsRow(c0, 3, row - 1);
      if (!this.maybeStar(c0 + 1, (row - 3) * T) && this.chance(0.15)) this.ent('apple', c0 + 1, (row - 2) * T);
    }
    for (let i = 0; i < 2; i++) this.pushCol(ROWS);
    this.flatRun(2, false);
  }

  segBoxes() {
    const cs = this.flatRun(this.ri(5, 7));
    const row = this.h - 4, c = cs[1] + this.ri(0, 1);
    const n = this.ri(1, 3);
    for (let i = 0; i < n; i++) this.set(c + i, row, this.chance(0.7) ? TILE.BOX : TILE.CRATE);
    if (this.chance(0.5)) this.coinsRow(c, n, row - 1);
    this.maybeStar(c + n, (this.h - 3) * T);
  }

  segMush() {
    const cs = this.flatRun(this.ri(6, 9));
    const n = this.diff > 0.5 && this.chance(0.5) ? 2 : 1;
    for (let i = 0; i < n; i++) this.ent('mushroom', cs[3 + i * 2], this.h * T - 40);
    this.coinsRow(cs[2], 3, this.h - 3);
    this.maybeStar(cs[cs.length - 2], (this.h - 3) * T);
  }

  segSpike() {
    const cs = this.flatRun(this.ri(5, 7));
    const roll = this.diff > 0.45 && this.chance(0.5);
    this.ent('spike', cs[3], this.h * T - 40, { roll, range: roll ? T * 2 : 0 });
    this.coinArc(cs[2], 2, this.h);
  }

  segChicken() {
    const cs = this.flatRun(this.ri(6, 9));
    this.ent('chicken', cs[cs.length - 1], (this.h - this.ri(2, 3)) * T);
    if (this.chance(0.5)) this.coinsRow(cs[1], 4, this.h - 1);
    this.maybeStar(cs[4], (this.h - 4) * T);
  }

  segMover() {
    this.flatRun(2, false);
    const w = this.ri(6, 8), c0 = this.cols.length;
    for (let i = 0; i < w; i++) this.pushCol(ROWS);
    const row = this.h - this.ri(0, 1);
    this.ent('mover', c0 + 0.5, row * T, { range: (w - 3.5) * T, speed: 0.6 + this.diff * 0.5, phase: this.rng() * 6 });
    this.coinsRow(c0 + 2, w - 4, row - 2);
    this.maybeStar(c0 + w / 2, (row - 3) * T);
    this.flatRun(2, false);
  }

  segCrates() {
    const cs = this.flatRun(this.ri(5, 7));
    const c = cs[3], tall = this.diff > 0.5 && this.chance(0.5) ? 2 : 1;
    for (let i = 0; i < tall; i++) this.set(c, this.h - 1 - i, TILE.CRATE);
    if (this.chance(0.5)) this.set(c + 1, this.h - 1, TILE.CRATE);
    this.ent('coin', c, (this.h - tall - 2) * T + 8, { dx: 8 });
    this.maybeStar(cs[cs.length - 1], (this.h - 3) * T);
  }

  segChest() {
    // little raised ledge with a chest (secret-ish bonus)
    const cs = this.flatRun(4);
    const row = this.h - 3, c0 = this.cols.length;
    for (let i = 0; i < 4; i++) { this.pushCol(this.h); if (i > 0) this.set(c0 + i, row, 2); }
    this.ent('chest', c0 + 2, row * T - 40);
    this.flatRun(2);
    this.maybeStar(cs[1], (this.h - 3) * T);
  }

  finish() {
    // Checkpoint in middle
    const mid = Math.floor(this.cols.length / 2);
    for (let c = mid; c < this.cols.length; c++) {
      const g = this.groundTop(c);
      if (g < ROWS && this.groundTop(c + 1) === g && this.groundTop(c - 1) === g) { this.ent('checkpoint', c, g * T - 96); this.checkpoints.push(c); break; }
    }
    // Any remaining stars
    while (this.starMarks.length) { this.starMarks.length = this.starMarks.length; this.starMarks[0] = this.cols.length; this.flatRun(2); this.maybeStar(this.cols.length - 1, (this.h - 3) * T); }
    const cs = this.flatRun(14);
    this.goalX = cs[6] * T;
    this.ent('goal', cs[6], this.h * T - 150);
    for (let i = 0; i < 3; i++) this.ent('coin', cs[2] + i, (this.h - 2) * T + 8, { dx: 8 });
    this.parTime = (this.goalX / 260) * 1.6 + 10;
  }
}
