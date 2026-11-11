// Core gameplay: physics, entities, camera, rendering, day/night lighting.
import { T, ROWS, VIEW_H, GAME, SKINS, POWERUPS } from './config.js';
import { Level, TILE, isSolid } from './levelgen.js';
import { clamp, lerp, rand, overlap, vibrate } from './util.js';
import { skyState, cyclePhase, drawBackground } from './sky.js';
import * as A from './art.js';
import { sfx, setNight } from './audio.js';
import { Save } from './save.js';

const P = GAME.player, W = GAME.web, PW = GAME.power;

export class Game {
  constructor({ mode = 'level', levelIndex = 1, hooks = {}, demo = false }) {
    this.mode = mode; this.demo = demo; this.hooks = hooks;
    this.level = new Level({ index: levelIndex, endless: mode === 'endless' });
    this.world = this.level.world;
    const s = Save.data;
    this.skin = SKINS[s.player.selectedSkin] || SKINS.red;
    this.maxHearts = P.maxHearts + (s.upgrades.extraHeart ? 1 : 0);
    this.hasDouble = !!s.upgrades.doubleJump; this.hasMagnet = !!s.upgrades.magnet;
    this.speedMult = s.upgrades.swift ? 1.12 : 1; this.jumpMult = s.upgrades.springLegs ? 1.1 : 1;
    this.powMult = s.upgrades.powerTime ? 1.5 : 1;
    this.webs = W.charges + (s.upgrades.webPro ? 2 : 0);
    this.pw = { boots: 0, spring: 0, shield: 0, magnet: 0 }; // active power-up timers (s)
    this.lives = mode === 'endless' ? 1 : P.startLives;
    this.score = 0; this.coins = 0; this.stars = 0; this.stomps = 0;
    this.time = 0; this.clock = 0; this.tookDamage = false; this.deaths = 0;
    this.state = 'play'; this.stateT = 0; this.freeze = 0; this.shake = 0;
    this.cycleSec = mode === 'endless' ? 55 : GAME.cycleSec;
    this.startPhase = mode === 'endless' ? 0.4 : this.world.startPhase;
    this.runSpeed = GAME.endless.startSpeed;
    this.ents = this.level.ents.map((e) => this.makeEnt(e));
    this.entCursor = this.level.ents.length;
    this.particles = []; this.bumps = new Map();
    this.respawn = { ...this.level.start };
    this.player = this.newPlayer();
    this.camX = 0; this.lastNight = null; this.hudKey = '';
    this.tiles = null; this.tileScale = 0;
  }

  newPlayer() {
    return { x: this.respawn.x, y: this.respawn.y, w: P.w, h: P.h, vx: 0, vy: 0, dir: 1, onGround: false, lastGround: -1, lastJumpPress: -1,
      jumping: false, airJumps: 0, lastTap: -9, web: null, webCd: 0, webFly: false, hearts: this.maxHearts, inv: 0, anim: 'idle', animT: 0, sx: 1, sy: 1, blinkT: 2, ride: null };
  }

  makeEnt(e) {
    const o = { ...e, alive: true, t: Math.random() * 6 };
    if (e.dx) o.x += e.dx;
    switch (e.type) {
      case 'coin': o.w = o.h = 32; break;
      case 'star': o.w = o.h = 40; o.x += 4; break;
      case 'apple': o.w = o.h = 30; o.x += 9; break;
      case 'chest': o.w = 44; o.h = 40; o.open = false; break;
      case 'mushroom': o.w = 36; o.h = 40; o.vx = -GAME.enemy.mushroomSpeed; o.vy = 0; o.dir = -1; o.squash = 0; break;
      case 'spike': o.w = 36; o.h = 36; o.x += 6; o.y += 4; o.x0 = o.x; o.rot = 0; break;
      case 'chicken': o.w = 44; o.h = 32; o.y0 = o.y; o.dir = -1; break;
      case 'mover': o.w = T * 2.5; o.h = 18; o.x0 = o.x; o.px = o.x; break;
      case 'checkpoint': o.w = 40; o.h = 96; o.active = false; break;
      case 'power': o.w = o.h = 40; o.y0 = o.y; break;
      case 'goal': o.w = 132; o.h = 150; break;
    }
    return o;
  }

  // ---------------- physics helpers ----------------
  collideX(b) {
    const lv = this.level;
    const r0 = Math.floor(b.y / T), r1 = Math.floor((b.y + b.h - 1) / T);
    if (b.vx > 0) {
      const c = Math.floor((b.x + b.w) / T);
      for (let r = r0; r <= r1; r++) if (isSolid(lv.tile(c, r))) { b.x = c * T - b.w; b.vx = 0; return 1; }
    } else if (b.vx < 0) {
      const c = Math.floor(b.x / T);
      for (let r = r0; r <= r1; r++) if (isSolid(lv.tile(c, r))) { b.x = (c + 1) * T; b.vx = 0; return -1; }
    }
    return 0;
  }

  collideY(b, prevBottom, onHead) {
    const lv = this.level;
    const c0 = Math.floor((b.x + 2) / T), c1 = Math.floor((b.x + b.w - 3) / T);
    if (b.vy >= 0) {
      const r = Math.floor((b.y + b.h) / T);
      for (let c = c0; c <= c1; c++) {
        const t = lv.tile(c, r);
        if (isSolid(t) || (t === TILE.PLAT && prevBottom <= r * T + 1)) { b.y = r * T - b.h; b.vy = 0; return 1; }
      }
    } else {
      const r = Math.floor(b.y / T);
      let hit = 0;
      // pick the tile most centered above the head
      const cx = Math.floor((b.x + b.w / 2) / T);
      for (const c of [cx, c0, c1]) {
        if (isSolid(lv.tile(c, r))) { if (!hit && onHead) onHead(c, r); hit = 1; }
      }
      if (hit) { b.y = (r + 1) * T; b.vy = 0; return -1; }
    }
    return 0;
  }

  // ---------------- update ----------------
  update(dt, input) {
    this.clock += dt;
    if (this.freeze > 0) { this.freeze -= dt; return; }
    this.stateT += dt;
    if (this.state === 'play') this.time += dt;
    this.shake = Math.max(0, this.shake - dt * 30);

    const pl = this.player;
    if (this.state === 'play') this.updatePlayer(dt, input);
    else if (this.state === 'dying') {
      pl.vy += GAME.gravity * dt; pl.y += pl.vy * dt; pl.animT += dt;
      if (this.stateT > 1.6) this.afterDeath();
    } else if (this.state === 'win') {
      pl.animT += dt; pl.vx = this.stateT < 1.2 ? 160 : 0; pl.vy += GAME.gravity * dt;
      pl.x += pl.vx * dt; this.collideX(pl); const pb = pl.y + pl.h; pl.y += pl.vy * dt; if (this.collideY(pl, pb) === 1) pl.onGround = true;
      pl.anim = this.stateT < 1.2 ? 'run' : 'win';
      if (this.stateT > 0.2 && Math.random() < dt * 30) this.confetti(pl.x + rand(-200, 300), this.camY0 ?? -20);
      if (this.stateT > 2.4 && !this.reported) { this.reported = true; this.hooks.onComplete?.(this.result()); }
    }

    this.updateEnts(dt);
    this.updateParticles(dt);

    // camera
    const vw = this.viewW || 1280;
    let target = pl.x - vw * GAME.camera.lead;
    if (this.mode === 'endless') target = pl.x - vw * 0.28;
    target = Math.max(0, target);
    if (this.mode === 'level') target = Math.min(target, this.level.cols.length * T - vw);
    this.camX = lerp(this.camX, target, 1 - Math.pow(1 - GAME.camera.lerp, dt * 60));
    if (this.mode === 'endless') this.level.extend(Math.ceil((this.camX + vw * 2) / T));

    // day / night
    const ph = cyclePhase(this.time + (this.demo ? this.clock * 2 : 0), this.startPhase, Save.data.settings.cycle, this.cycleSec);
    this.sky = skyState(ph);
    const isNight = this.sky.night > 0.5;
    if (this.lastNight !== null && isNight !== this.lastNight && !this.demo) {
      (isNight ? sfx.nightFall : sfx.dayBreak)();
      this.hooks.onPhase?.(isNight);
    }
    this.lastNight = isNight;
    setNight(this.sky.night);

    if (this.mode === 'endless' && this.state === 'play') {
      this.runSpeed = Math.min(GAME.endless.maxSpeed, this.runSpeed + GAME.endless.speedGainPerSec * dt);
      // 1 point per metre travelled
      const m = Math.floor(this.player.x / T);
      if (m > (this.bestM || 0)) { this.score += m - (this.bestM || 0); this.bestM = m; }
    }
    this.emitHud();
  }

  updatePlayer(dt, input) {
    const pl = this.player, now = this.time;
    pl.animT += dt; pl.inv = Math.max(0, pl.inv - dt);
    // horizontal
    let want = 0;
    if (this.demo) want = 1;
    else if (this.mode === 'endless') want = input.left ? 0.65 : input.right ? 1.22 : 1;
    else want = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    for (const k in this.pw) this.pw[k] = Math.max(0, this.pw[k] - dt);
    pl.webCd = Math.max(0, pl.webCd - dt);
    const boots = this.pw.boots > 0 ? PW.bootsMult : 1;
    const maxV = (this.mode === 'endless' ? this.runSpeed : P.speed) * this.speedMult * boots;
    const target = want * maxV;
    const acc = (pl.onGround ? P.accel : P.airAccel) * (want === 0 ? P.drag / P.accel : 1);
    // after a web release keep the momentum while airborne (no air-brake back to run speed)
    const keepFly = pl.webFly && !pl.onGround && Math.abs(pl.vx) > Math.abs(target) && (target === 0 || Math.sign(pl.vx) === Math.sign(target));
    if (pl.web) { /* momentum owned by the web */ }
    else if (keepFly) pl.vx -= Math.sign(pl.vx) * W.airDrag * dt;  // slow bleed, not a hard brake
    else if (pl.vx < target) pl.vx = Math.min(target, pl.vx + acc * dt);
    else if (pl.vx > target) pl.vx = Math.max(target, pl.vx - acc * dt);
    if (pl.onGround) pl.webFly = false;
    if (boots > 1 && pl.onGround && Math.random() < dt * 30) this.spark(pl.x + pl.w / 2 - pl.dir * 14, pl.y + pl.h - 6, '#8FD8FF', 120);
    if (want !== 0 && this.mode !== 'endless') pl.dir = want > 0 ? 1 : -1;
    if (this.mode === 'endless') pl.dir = 1;

    // jump (coyote + buffer + variable height + optional double jump)
    if (pl.onGround) { pl.lastGround = now; pl.airJumps = 0; }
    const jp = this.demo ? this.demoJump() : input.jumpPressed;
    // double-tap (second press within doubleTapMs, while airborne) = Web Swing
    let webTap = false;
    if (jp && !this.demo) {
      const dbl = now - pl.lastTap <= W.doubleTapMs / 1000;
      webTap = (dbl || (pl.webFly && !pl.onGround)) && this.webs > 0 && !pl.web && pl.webCd <= 0;
      pl.lastTap = webTap ? -9 : now;
    }
    if (webTap) { this.startWeb(); pl.lastJumpPress = -1; }
    else if (jp) pl.lastJumpPress = now;
    const jMult = this.jumpMult * (this.pw.spring > 0 ? PW.springMult : 1);
    const canCoyote = now - pl.lastGround <= P.coyoteMs / 1000;
    const buffered = pl.lastJumpPress >= 0 && now - pl.lastJumpPress <= P.jumpBufferMs / 1000;
    if (pl.web) { /* swinging: no normal jumps */ }
    else if (buffered && canCoyote && !pl.jumping) {
      if (this.pw.spring > 0) for (let i = 0; i < 8; i++) this.spark(pl.x + pl.w / 2, pl.y + pl.h, '#B6F27A', 200);
      pl.vy = P.jumpVelocity * jMult; pl.jumping = true; pl.lastJumpPress = -1; pl.lastGround = -1; pl.onGround = false; pl.ride = null;
      pl.sx = 0.75; pl.sy = 1.3; this.dust(pl.x + pl.w / 2, pl.y + pl.h, 6); sfx.jump();
    } else if (jp && !webTap && !pl.onGround && this.hasDouble && pl.airJumps < 1 && !canCoyote) {
      pl.vy = P.doubleJumpVelocity * jMult; pl.airJumps++; pl.jumping = true; pl.lastJumpPress = -1; pl.sx = 0.8; pl.sy = 1.25;
      for (let i = 0; i < 10; i++) this.spark(pl.x + pl.w / 2, pl.y + pl.h, '#FFFFFF'); sfx.doubleJump();
    }
    if (!this.demo && input.jumpReleased && pl.vy < 0 && pl.jumping && !pl.web && !pl.webFly) pl.vy *= P.jumpCutMultiplier;

    // gravity
    const gliding = pl.webFly && pl.flyT > 0;
    if (gliding) pl.flyT -= dt;
    if (gliding && Math.random() < dt * 45) this.particles.push({ kind: 'dust', x: pl.x + pl.w / 2 - pl.dir * 16, y: pl.y + rand(10, pl.h - 6), vx: -pl.dir * 60, vy: 0, life: 0.35, max: 0.35, size: rand(3, 6) });
    pl.vy = Math.min(gliding ? W.glideFall : GAME.maxFall, pl.vy + GAME.gravity * (gliding ? W.glideGrav : 1) * dt);
    if (pl.web) this.swing(dt);

    // ride moving platform
    if (pl.ride) pl.x += pl.ride.dx || 0;
    pl.ride = null;

    // integrate (substeps for stability)
    const steps = dt > 1 / 70 ? 2 : 1, sdt = dt / steps;
    const wasGround = pl.onGround; let landed = false, hitWall = false;
    for (let i = 0; i < steps; i++) {
      pl.x += pl.vx * sdt; if (this.collideX(pl)) hitWall = true;
      const prevBottom = pl.y + pl.h;
      pl.y += pl.vy * sdt;
      const res = this.collideY(pl, prevBottom, (c, r) => this.headHit(c, r));
      if (res === 1) landed = true;
      // moving platforms (one-way)
      if (pl.vy >= 0) {
        for (const m of this.ents) {
          if (m.type !== 'mover' || !m.alive) continue;
          if (pl.x + pl.w > m.x + 4 && pl.x < m.x + m.w - 4 && prevBottom <= m.y + 6 && pl.y + pl.h >= m.y) {
            pl.y = m.y - pl.h; pl.vy = 0; landed = true; pl.ride = m;
          }
        }
      }
    }
    pl.onGround = landed;
    if (landed) pl.jumping = false;
    if (pl.web && hitWall) this.releaseWeb(false);
    if (landed && !wasGround) { pl.sx = 1.25; pl.sy = 0.78; this.dust(pl.x + pl.w / 2, pl.y + pl.h, 5); sfx.land(); }
    if (pl.x < 0) { pl.x = 0; pl.vx = Math.max(0, pl.vx); }
    if (pl.y < 4) { pl.y = 4; if (pl.vy < 0) pl.vy = 0; }               // web flights stay on screen

    // squash recover
    pl.sx = lerp(pl.sx, 1, Math.min(1, dt * 12)); pl.sy = lerp(pl.sy, 1, Math.min(1, dt * 12));
    pl.blinkT -= dt; if (pl.blinkT < -0.12) pl.blinkT = rand(2, 4.5);

    // anim state
    if (pl.inv > P.invincibleMs / 1000 - 0.35) pl.anim = 'hurt';
    else if (pl.web) pl.anim = 'jump';
    else if (!pl.onGround) pl.anim = pl.vy < 0 ? 'jump' : 'fall';
    else pl.anim = Math.abs(pl.vx) > 30 ? 'run' : 'idle';

    // run dust
    if (pl.onGround && Math.abs(pl.vx) > 200 && Math.random() < dt * 10) this.dust(pl.x + pl.w / 2 - pl.dir * 10, pl.y + pl.h, 1);

    // pit
    if (pl.y > VIEW_H + 40) this.die(true);

    // goal
    if (this.mode === 'level' && pl.x > this.level.goalX + 50) this.win();
  }

  // ---------------- Web Swing ----------------
  // Phase 1 "zip": web sticks ahead-up, hero is yanked along it (overrides gravity).
  // Phase 2 "fling": released with big forward speed + lift, then glides (low gravity) for W.glide s.
  // Tapping jump again while flying chains another web (if charges left).
  startWeb() {
    const pl = this.player, cx = pl.x + pl.w / 2, cy = pl.y + 16, dir = pl.dir || 1;
    const ax = cx + dir * W.reachX, ay = Math.max(T * 0.6, cy - W.reachY);
    pl.web = { ax, ay, t: 0, dir }; this.webs--; pl.webFly = false; pl.flyT = 0; pl.jumping = false; pl.onGround = false; pl.ride = null;
    Save.data.stats.webs++; sfx.web(); vibrate(20, Save.data.settings.vibration);
    for (let i = 0; i < 10; i++) this.spark(ax, ay, '#FFFFFF', 160);
  }

  swing(dt) {
    const pl = this.player, w = pl.web; w.t += dt;
    const cx = pl.x + pl.w / 2, cy = pl.y + 16;
    const tx = w.ax + w.dir * 40, ty = w.ay + 80;               // aim just under/past the anchor
    const dx = tx - cx, dy = ty - cy, d = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, dt * 12);
    pl.vx = lerp(pl.vx, (dx / d) * W.zip, k); pl.vy = lerp(pl.vy, (dy / d) * W.zip, k);
    if (w.t > W.maxTime || d < 50 || (cx - w.ax) * w.dir > -10) this.releaseWeb(true);
  }

  releaseWeb(fling) {
    const pl = this.player; if (!pl.web) return;
    const dir = pl.web.dir;
    if (fling) {
      pl.vx = dir * Math.max(Math.abs(pl.vx), W.flingX); pl.vy = Math.min(pl.vy * 0.3, 0) - W.flingY;
      pl.webFly = true; pl.flyT = W.glide; pl.sx = 0.8; pl.sy = 1.25;
      for (let i = 0; i < 8; i++) this.spark(pl.x + pl.w / 2, pl.y + pl.h / 2, '#FFFFFF', 200);
    }
    pl.web = null; pl.webCd = W.cooldown; pl.jumping = false; pl.airJumps = 0;
  }

  collectPower(e) {
    const pl = this.player, def = POWERUPS[e.kind];
    e.alive = false; Save.data.stats.powerups++;
    if (e.kind === 'heart') pl.hearts = Math.min(this.maxHearts, pl.hearts + 1);
    else if (e.kind === 'web') this.webs = Math.min(W.maxCharges, this.webs + 1);
    else this.pw[e.kind] = PW[e.kind] * this.powMult;
    this.score += 25; sfx.power(); vibrate(25, Save.data.settings.vibration);
    this.popup(e.x + 20, e.y - 6, def.label, def.color === '#FFFFFF' ? '#E8F4FF' : def.color);
    for (let i = 0; i < 14; i++) this.spark(e.x + 20, e.y + 20, i % 2 ? def.color : '#FFFFFF', 260);
  }

  demoJump() {
    // Attract-mode autopilot: jump at gaps, walls, and enemies.
    const pl = this.player; if (!pl.onGround) return false;
    const ahead = Math.floor((pl.x + pl.w + 30) / T), foot = Math.floor((pl.y + pl.h + 4) / T);
    const r = Math.floor((pl.y + pl.h - 10) / T);
    if (!isSolid(this.level.tile(ahead, foot)) && this.level.tile(ahead, foot) !== TILE.PLAT) return true;
    if (isSolid(this.level.tile(ahead, r))) return true;
    for (const e of this.ents) if (e.alive && (e.type === 'mushroom' || e.type === 'spike') && e.x - pl.x > 0 && e.x - pl.x < 90) return true;
    return Math.random() < 0.004;
  }

  headHit(c, r) {
    const t = this.level.tile(c, r);
    if (t === TILE.BOX) {
      this.level.set(c, r, TILE.USED); this.bumps.set(c + ',' + r, 0.18); sfx.bump();
      const pl = this.player;
      if (pl.hearts < this.maxHearts && Math.random() < 0.35) {
        const e = this.makeEnt({ type: 'apple', x: c * T, y: r * T - 44 }); e.pop = 0.3; this.ents.push(e);
      } else {
        this.addCoins(1, c * T + T / 2, r * T - 10);
        this.particles.push({ kind: 'coinpop', x: c * T + T / 2, y: r * T - 10, vx: 0, vy: -520, life: 0.45, max: 0.45 });
      }
      this.enemyBump(c, r);
    } else if (t === TILE.CRATE) {
      this.level.set(c, r, TILE.EMPTY); sfx.crate(); this.shake = 4;
      for (let i = 0; i < 8; i++) this.particles.push({ kind: 'chunk', x: c * T + T / 2, y: r * T + T / 2, vx: rand(-220, 220), vy: rand(-500, -150), life: 0.9, max: 0.9, rot: rand(0, 6), vr: rand(-12, 12), size: rand(6, 12) });
      if (Math.random() < 0.4) this.addCoins(2, c * T + T / 2, r * T);
    } else this.bumps.set(c + ',' + r, 0.1);
  }

  enemyBump(c, r) {
    for (const e of this.ents) if (e.alive && e.type === 'mushroom' && Math.abs(e.x + e.w / 2 - (c * T + T / 2)) < T && Math.abs(e.y + e.h - r * T) < 8) this.killEnemy(e);
  }

  addCoins(n, x, y) {
    this.coins += n; this.score += GAME.score.coin * n; sfx.coin();
    this.popup(x, y, `+${GAME.score.coin * n}`, '#FFE58A');
    for (let i = 0; i < 5; i++) this.spark(x, y, '#FFE58A');
  }

  hurt(fromX) {
    const pl = this.player;
    if (pl.inv > 0 || this.state !== 'play' || this.demo) return;
    if (this.pw.shield > 0) {
      this.pw.shield = 0; pl.inv = 1; sfx.bump(); this.shake = 5;
      this.popup(pl.x + pl.w / 2, pl.y - 10, 'Blocked!', '#D7B8FF');
      for (let i = 0; i < 16; i++) this.spark(pl.x + pl.w / 2, pl.y + pl.h / 2, '#C9A2FF', 300);
      return;
    }
    pl.hearts--; this.tookDamage = true;
    pl.inv = P.invincibleMs / 1000;
    pl.vx = (pl.x + pl.w / 2 < fromX ? -1 : 1) * P.knockbackX; pl.vy = P.knockbackY; pl.onGround = false;
    this.shake = 10; this.freeze = 0.06; sfx.hurt(); vibrate(60, Save.data.settings.vibration);
    if (pl.hearts <= 0) this.die();
  }

  die() {
    if (this.state !== 'play') return;
    if (this.demo) { this.player = this.newPlayer(); this.camX = 0; this.runSpeed = GAME.endless.startSpeed; return; }
    this.state = 'dying'; this.stateT = 0; this.deaths++; Save.data.stats.deaths++;
    this.player.web = null;
    const pl = this.player; pl.anim = 'die'; pl.vy = -620; pl.vx = 0; pl.hearts = 0;
    this.shake = 12; sfx.die(); vibrate([80, 40, 120], Save.data.settings.vibration);
  }

  afterDeath() {
    this.lives--;
    if (this.lives > 0) {
      this.state = 'play'; this.stateT = 0;
      this.player = this.newPlayer(); this.player.inv = 1.2;
      this.camX = Math.max(0, this.respawn.x - (this.viewW || 1280) * GAME.camera.lead);
    } else if (!this.reported) {
      this.state = 'over'; this.reported = true;
      this.hooks.onGameOver?.(this.result());
    }
  }

  revive() {
    this.lives = 1; this.reported = false; this.state = 'play'; this.stateT = 0;
    if (this.mode === 'endless') {
      // respawn on nearest safe ground ahead
      let c = Math.floor((this.player.x) / T);
      for (let i = 0; i < 60; i++, c++) { const g = this.level.groundTop(c); if (g < ROWS && this.level.groundTop(c + 1) === g && this.level.groundTop(c + 2) === g) break; }
      this.respawn = { x: c * T, y: this.level.groundTop(c) * T - P.h - 4 };
      for (const e of this.ents) if (e.alive && (e.type === 'mushroom' || e.type === 'spike' || e.type === 'chicken') && Math.abs(e.x - this.respawn.x) < 500) e.alive = false;
    }
    this.player = this.newPlayer(); this.player.inv = 2;
    this.camX = Math.max(0, this.respawn.x - (this.viewW || 1280) * 0.3);
  }

  win() {
    if (this.state !== 'play') return;
    this.state = 'win'; this.stateT = 0; sfx.win(); vibrate(40, Save.data.settings.vibration);
  }

  result() {
    const timeBonus = this.mode === 'level' ? Math.max(0, Math.round((this.level.parTime - this.time) * GAME.score.timeBonusPerSec)) : 0;
    const noDmg = this.mode === 'level' && this.state === 'win' && !this.tookDamage ? GAME.score.noDamage : 0;
    const won = this.state === 'win';
    const final = this.score + (won ? timeBonus + noDmg : 0);
    let rating = 0;
    if (won) {
      rating = 1;
      if (this.stars >= 3 || final >= 1500 + this.level.index * 80) rating = 2;
      if (this.stars >= this.level.totalStars || (this.deaths === 0 && this.stars >= 3)) rating = 3;
    }
    return { mode: this.mode, level: this.level.index, won, score: final, base: this.score, timeBonus, noDmg, coins: this.coins, stars: this.stars,
      totalStars: this.level.totalStars, time: this.time, rating, distance: Math.floor(this.player.x / T), stomps: this.stomps };
  }

  killEnemy(e, byStomp) {
    e.alive = false; this.stomps++; this.score += GAME.score.stomp; Save.data.stats.stomps++;
    this.popup(e.x + e.w / 2, e.y, `+${GAME.score.stomp}`, '#FFFFFF');
    this.particles.push({ kind: 'corpse', type: e.type, x: e.x + e.w / 2, y: e.y + e.h, vx: byStomp ? 0 : 80, vy: byStomp ? 0 : -400, life: 0.6, max: 0.6, dir: e.dir || -1 });
    for (let i = 0; i < 8; i++) this.spark(e.x + e.w / 2, e.y + e.h / 2, '#FFFFFF');
    sfx.stomp(); this.freeze = 0.05; this.shake = 5; vibrate(25, Save.data.settings.vibration);
  }

  updateEnts(dt) {
    const pl = this.player, live = this.state === 'play';
    const viewL = this.camX - 300, viewR = this.camX + (this.viewW || 1280) + 300;
    const pbox = { x: pl.x + 3, y: pl.y + 4, w: pl.w - 6, h: pl.h - 4 };
    // endless: pull new entities from the generator
    if (this.level.ents.length > this.entCursor) { for (let i = this.entCursor; i < this.level.ents.length; i++) this.ents.push(this.makeEnt(this.level.ents[i])); this.entCursor = this.level.ents.length; }
    if (this.mode === 'endless' && this.ents.length > 400) this.ents = this.ents.filter((e) => e.alive && e.x > this.camX - 600);

    for (const e of this.ents) {
      if (!e.alive) continue;
      e.t += dt;
      if (e.x > viewR + 400 || e.x + (e.w || 0) < viewL - 400) { if (e.type !== 'mover') continue; }
      switch (e.type) {
        case 'coin': {
          if ((this.hasMagnet || this.pw.magnet > 0) && live) {
            const dx = pl.x + pl.w / 2 - (e.x + 16), dy = pl.y + pl.h / 2 - (e.y + 16), d = Math.hypot(dx, dy);
            if (d < (this.pw.magnet > 0 ? 260 : 170)) { e.x += (dx / d) * 520 * dt; e.y += (dy / d) * 520 * dt; }
          }
          if (live && overlap(pbox, e)) { e.alive = false; this.addCoins(1, e.x + 16, e.y + 16); }
          break;
        }
        case 'star':
          if (live && overlap(pbox, e)) {
            e.alive = false; this.stars++; this.score += GAME.score.star; sfx.star();
            this.popup(e.x + 20, e.y, `+${GAME.score.star}`, '#FFC933');
            for (let i = 0; i < 18; i++) this.spark(e.x + 20, e.y + 20, i % 2 ? '#FFC933' : '#FFFFFF', 300);
            this.hooks.onToast?.(`⭐ ${this.stars}/${this.level.totalStars}`);
          }
          break;
        case 'apple':
          if (e.pop > 0) { e.pop -= dt; e.y -= 120 * dt; }
          if (live && overlap(pbox, e)) {
            e.alive = false; pl.hearts = Math.min(this.maxHearts, pl.hearts + 1); this.score += GAME.score.apple; sfx.apple();
            this.popup(e.x + 15, e.y, '+❤', '#FF8A80'); for (let i = 0; i < 8; i++) this.spark(e.x + 15, e.y + 15, '#FF8A80');
          }
          break;
        case 'chest':
          if (!e.open && live && overlap(pbox, e)) {
            e.open = true; const n = 20 + Math.floor(Math.random() * 31);
            this.coins += n; this.score += GAME.score.chest; sfx.chest(); vibrate(40, Save.data.settings.vibration);
            this.popup(e.x + 22, e.y - 20, `+${n} 🪙`, '#FFE58A');
            for (let i = 0; i < 16; i++) this.particles.push({ kind: 'coinfly', x: e.x + 22, y: e.y, vx: rand(-200, 200), vy: rand(-650, -350), life: 0.9, max: 0.9 });
          }
          break;
        case 'mushroom': {
          e.vy = Math.min(GAME.maxFall, (e.vy || 0) + GAME.gravity * dt);
          e.x += e.vx * dt;
          if (this.collideX(e)) { e.dir *= -1; }
          // turn at ledges
          const frontC = Math.floor((e.dir > 0 ? e.x + e.w + 2 : e.x - 2) / T), footR = Math.floor((e.y + e.h + 2) / T);
          const below = this.level.tile(frontC, footR);
          if (!isSolid(below) && below !== TILE.PLAT) e.dir *= -1;
          e.vx = e.dir * GAME.enemy.mushroomSpeed * (1 + this.level.diff * 0.6);
          const pb = e.y + e.h; e.y += e.vy * dt; this.collideY(e, pb);
          if (e.y > VIEW_H + 50) e.alive = false;
          this.touchEnemy(e, pbox, true);
          break;
        }
        case 'spike':
          if (e.roll) { e.x = e.x0 + Math.sin(e.t * 1.4) * e.range; e.rot = Math.sin(e.t * 1.4) * e.range / 18; }
          else e.rot = Math.sin(e.t * 2) * 0.15;
          this.touchEnemy(e, pbox, false);
          break;
        case 'chicken':
          e.x -= GAME.enemy.chickenSpeed * dt * (this.mode === 'endless' ? 1.6 : 1);
          e.y = e.y0 + Math.sin(e.t * 2.4) * 34;
          this.touchEnemy(e, pbox, true);
          break;
        case 'mover': {
          const nx = e.x0 + (Math.sin(e.t * e.speed) * 0.5 + 0.5) * e.range;
          e.dx = nx - e.x; e.x = nx;
          break;
        }
        case 'power':
          e.y = e.y0 + Math.sin(e.t * 3) * 6;
          if (live && overlap(pbox, e)) this.collectPower(e);
          break;
        case 'checkpoint':
          if (!e.active && live && pl.x > e.x) {
            e.active = true; this.respawn = { x: e.x, y: e.y + e.h - P.h - 4 }; sfx.checkpoint();
            this.hooks.onToast?.('Checkpoint!'); for (let i = 0; i < 12; i++) this.spark(e.x + 40, e.y + 15, '#7ED321', 250);
          }
          break;
      }
    }
    for (const [k, v] of this.bumps) { const nv = v - dt; if (nv <= 0) this.bumps.delete(k); else this.bumps.set(k, nv); }
  }

  touchEnemy(e, pbox, stompable) {
    if (this.state !== 'play' || !overlap(pbox, e)) return;
    const pl = this.player;
    const fromAbove = pl.vy > 50 && pl.y + pl.h - pl.vy * (1 / 60) <= e.y + 14;
    if (fromAbove && stompable) {
      this.killEnemy(e, true);
      pl.vy = GAME.enemy.stompBounce; pl.jumping = true; pl.airJumps = 0; pl.sx = 1.2; pl.sy = 0.8;
    } else this.hurt(e.x + e.w / 2);
  }

  // ---------------- particles ----------------
  dust(x, y, n) { for (let i = 0; i < n; i++) this.particles.push({ kind: 'dust', x: x + rand(-10, 10), y: y - 4, vx: rand(-90, 90), vy: rand(-80, -10), life: 0.45, max: 0.45, size: rand(5, 10) }); }
  spark(x, y, color, sp = 220) { const a = rand(0, 6.28), v = rand(sp * 0.4, sp); this.particles.push({ kind: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.5, max: 0.5, color, size: rand(2, 4.5) }); }
  popup(x, y, text, color) { this.particles.push({ kind: 'text', x, y, vx: 0, vy: -70, life: 0.9, max: 0.9, text, color }); }
  confetti(x, y) {
    const cols = ['#E53935', '#FFC933', '#2FA8F5', '#7ED321', '#8E44D8', '#FF6FA8'];
    this.particles.push({ kind: 'conf', x, y, vx: rand(-60, 60), vy: rand(60, 200), life: 3, max: 3, color: cols[(Math.random() * 6) | 0], rot: rand(0, 6), vr: rand(-8, 8), size: rand(6, 11) });
  }

  updateParticles(dt) {
    const night = this.sky ? this.sky.night : 0;
    // fireflies at night
    if (night > 0.5 && Math.random() < dt * 4 * night) {
      this.particles.push({ kind: 'fly', x: this.camX + rand(0, this.viewW || 1280), y: rand(VIEW_H * 0.45, VIEW_H * 0.85), vx: rand(-20, 20), vy: rand(-15, 15), life: 5, max: 5, ph: rand(0, 6) });
    }
    const out = [];
    for (const p of this.particles) {
      p.life -= dt; if (p.life <= 0) continue;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.kind === 'spark' || p.kind === 'chunk' || p.kind === 'coinfly' || p.kind === 'corpse') p.vy += 1400 * dt;
      if (p.kind === 'coinpop') p.vy += 2000 * dt;
      if (p.kind === 'dust') { p.vx *= 0.92; p.size += dt * 14; }
      if (p.kind === 'conf') { p.vx += Math.sin(p.life * 6) * 6; p.rot += p.vr * dt; }
      if (p.kind === 'chunk') p.rot += p.vr * dt;
      if (p.kind === 'fly') { p.vx += rand(-40, 40) * dt; p.vy += rand(-40, 40) * dt; }
      out.push(p);
    }
    this.particles = out.length > 600 ? out.slice(-600) : out;
  }

  emitHud() {
    if (!this.hooks.onHud || this.demo) return;
    const pl = this.player;
    const h = {
      mode: this.mode, lives: this.lives, hearts: pl.hearts, maxHearts: this.maxHearts, score: this.score, coins: this.coins,
      stars: this.stars, totalStars: this.level.totalStars, time: Math.floor(this.time), distance: Math.floor(pl.x / T),
      night: Math.round((this.sky?.night || 0) * 50) / 50,
      webs: this.webs, pw: Object.entries(this.pw).filter(([, v]) => v > 0).map(([k, v]) => [k, Math.ceil(v)]),
    };
    const key = JSON.stringify(h);
    if (key !== this.hudKey) { this.hudKey = key; this.hooks.onHud(h); }
  }

  // ---------------- render ----------------
  render(ctx, cw, ch) {
    const scale = ch / VIEW_H, vw = cw / scale;
    this.viewW = vw;
    if (!this.tiles || Math.abs(this.tileScale - scale) > 0.001) { this.tiles = A.makeTileSprites(this.world, T * scale); this.tileScale = scale; }
    const st = this.sky || skyState(this.startPhase), t = this.clock;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    drawBackground(ctx, vw, this.camX, st, this.world, t, 1 / 60);

    const sx = this.shake ? rand(-this.shake, this.shake) : 0, sy = this.shake ? rand(-this.shake, this.shake) : 0;
    const cam = Math.round(this.camX * scale) / scale;
    ctx.save(); ctx.translate(-cam + sx, sy);
    const L = cam - 120, R = cam + vw + 120;

    // decor
    for (const d of this.level.decor) if (d.x > L - 100 && d.x < R) A.drawDecor(ctx, d, this.world, t, st.night);
    this.drawTiles(ctx, cam, vw);

    const pl = this.player;
    // entities (back to front)
    for (const e of this.ents) {
      if (!e.alive || e.x > R || e.x + (e.w || 60) < L) continue;
      switch (e.type) {
        case 'coin': A.drawCoin(ctx, e.x + 16, e.y + 16 + Math.sin(e.t * 3) * 2, e.t); break;
        case 'star': A.drawStar(ctx, e.x + 20, e.y + 20 + Math.sin(e.t * 2.5) * 4, e.t); break;
        case 'apple': A.drawApple(ctx, e.x + 15, e.y + 15, e.t); break;
        case 'chest': A.drawChest(ctx, e.x, e.y + e.h, e.open, e.t); break;
        case 'mushroom': A.drawMushroom(ctx, e.x + e.w / 2, e.y + e.h, e.t, e.dir < 0 ? 1 : -1); break;
        case 'spike': A.drawSpike(ctx, e.x + e.w / 2, e.y + e.h + 2, e.t, e.rot); break;
        case 'chicken': A.drawChicken(ctx, e.x + e.w / 2, e.y + e.h / 2, e.t, e.dir < 0 ? 1 : -1); break;
        case 'mover': A.drawMover(ctx, e.x, e.y, e.w); break;
        case 'checkpoint': A.drawCheckpoint(ctx, e.x, e.y, e.active, e.t); break;
        case 'goal': A.drawGoal(ctx, e.x, e.y, e.t); break;
        case 'power': A.drawPower(ctx, e.x + 20, e.y + 20, e.t, POWERUPS[e.kind]); break;
      }
    }
    // web line
    if (pl.web) A.drawWeb(ctx, pl.x + pl.w / 2 + pl.web.dir * 8, pl.y + 18, pl.web.ax, pl.web.ay);
    // player
    if (!(pl.inv > 0 && this.state === 'play' && Math.floor(pl.inv * 14) % 2 === 0)) {
      const ds = P.drawScale;
      ctx.save(); ctx.translate(pl.x + pl.w / 2, pl.y + pl.h); ctx.scale(ds, ds);
      A.drawHero(ctx, 0, 0, this.skin, { state: pl.anim, t: pl.animT, dir: pl.dir, sx: pl.sx, sy: pl.sy, blink: pl.blinkT < 0 });
      ctx.restore();
    }
    if (this.pw.shield > 0 && this.state === 'play') A.drawShield(ctx, pl.x + pl.w / 2, pl.y + pl.h / 2, this.clock, this.pw.shield);
    this.drawParticles(ctx, false);
    ctx.restore();

    // ---- night lighting: darkness with a warm lantern around the hero
    if (st.night > 0.01) {
      const px = pl.x + pl.w / 2 - cam, py = pl.y + pl.h / 2;
      const g = ctx.createRadialGradient(px, py, 70, px, py, 520);
      const a = 0.5 * st.night;
      g.addColorStop(0, `rgba(8,12,40,${a * 0.15})`); g.addColorStop(0.5, `rgba(8,12,40,${a * 0.7})`); g.addColorStop(1, `rgba(6,8,30,${a})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, vw, VIEW_H);
      // emissive glows
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(-cam, 0);
      const glow = (x, y, r, c, al) => { const gg = ctx.createRadialGradient(x, y, 0, x, y, r); gg.addColorStop(0, `rgba(${c},${al})`); gg.addColorStop(1, `rgba(${c},0)`); ctx.fillStyle = gg; ctx.fillRect(x - r, y - r, r * 2, r * 2); };
      glow(pl.x + pl.w / 2, pl.y + pl.h / 2, 150, '255,190,110', 0.22 * st.night);
      for (const e of this.ents) {
        if (!e.alive || e.x > R || e.x < L) continue;
        if (e.type === 'coin') glow(e.x + 16, e.y + 16, 34, '255,210,90', 0.35 * st.night);
        else if (e.type === 'star') glow(e.x + 20, e.y + 20, 80, '255,220,120', 0.5 * st.night);
        else if (e.type === 'spike') glow(e.x + e.w / 2, e.y + 18, 30, '255,60,60', 0.35 * st.night);
        else if (e.type === 'checkpoint' && e.active) glow(e.x + 40, e.y + 18, 60, '140,255,120', 0.35 * st.night);
        else if (e.type === 'power') glow(e.x + 20, e.y + 20, 60, '200,230,255', 0.45 * st.night);
        else if (e.type === 'goal') glow(e.x + 66, e.y + 30, 160, '255,220,140', 0.4 * st.night);
      }
      for (const d of this.level.decor) if (d.type === 'mushdeco' && d.x > L && d.x < R) glow(d.x + 7, d.y - 14, 40, '60,255,220', 0.45 * st.night);
      this.drawTileGlows(ctx, cam, vw, glow, st.night);
      ctx.restore();
    }
    // UI-layer particles (text, fireflies) above darkness
    ctx.save(); ctx.translate(-cam, 0); this.drawParticles(ctx, true); ctx.restore();
  }

  drawTiles(ctx, cam, vw) {
    const lv = this.level, S = this.tiles;
    const c0 = Math.max(0, Math.floor(cam / T) - 1), c1 = Math.min(lv.cols.length - 1, Math.ceil((cam + vw) / T) + 1);
    ctx.lineWidth = 3; ctx.strokeStyle = A.INK;
    for (let c = c0; c <= c1; c++) {
      const col = lv.cols[c]; if (!col) continue;
      for (let r = 0; r < ROWS; r++) {
        const t = col[r]; if (!t) continue;
        const x = c * T, y = r * T;
        if (t === TILE.GROUND) {
          const top = r === 0 || col[r - 1] !== TILE.GROUND;
          ctx.drawImage(top ? S.grass : ((c + r) % 3 ? S.dirt : S.dirt2), x, y, T + 1, T + 1); // +1 hides sub-pixel seams
          const lg = lv.tile(c - 1, r) === TILE.GROUND || c === 0, rg = lv.tile(c + 1, r) === TILE.GROUND;
          if (!lg) { ctx.beginPath(); ctx.moveTo(x + 1.5, y + (top ? 0 : 0)); ctx.lineTo(x + 1.5, y + T); ctx.stroke(); }
          if (!rg) { ctx.beginPath(); ctx.moveTo(x + T - 1.5, y); ctx.lineTo(x + T - 1.5, y + T); ctx.stroke(); }
        } else if (t === TILE.PLAT) ctx.drawImage(S.plat, x, y, T, T);
        else {
          const b = this.bumps.get(c + ',' + r) || 0;
          const off = b > 0 ? -Math.sin((b / 0.18) * Math.PI) * 10 : 0;
          ctx.drawImage(t === TILE.BOX ? S.box : t === TILE.USED ? S.used : S.crate, x, y + off, T, T);
        }
      }
    }
  }

  drawTileGlows(ctx, cam, vw, glow, night) {
    const lv = this.level;
    const c0 = Math.max(0, Math.floor(cam / T) - 1), c1 = Math.min(lv.cols.length - 1, Math.ceil((cam + vw) / T) + 1);
    for (let c = c0; c <= c1; c++) { const col = lv.cols[c]; if (!col) continue; for (let r = 0; r < ROWS; r++) if (col[r] === TILE.BOX) glow(c * T + T / 2, r * T + T / 2, 60, '255,190,60', 0.4 * night); }
  }

  drawParticles(ctx, top) {
    for (const p of this.particles) {
      const k = p.life / p.max;
      const isTop = p.kind === 'text' || p.kind === 'fly' || p.kind === 'conf';
      if (isTop !== top) continue;
      switch (p.kind) {
        case 'dust': ctx.fillStyle = `rgba(255,255,255,${k * 0.7})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 7); ctx.fill(); break;
        case 'spark': ctx.fillStyle = p.color; ctx.globalAlpha = k; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 7); ctx.fill(); ctx.globalAlpha = 1; break;
        case 'coinpop': case 'coinfly': A.drawCoin(ctx, p.x, p.y, p.life * 10, 12); break;
        case 'chunk': ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = '#D08A3E'; ctx.strokeStyle = A.INK; ctx.lineWidth = 2; ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size); ctx.strokeRect(-p.size / 2, -p.size / 2, p.size, p.size); ctx.restore(); break;
        case 'corpse':
          ctx.save(); ctx.globalAlpha = k;
          if (p.type === 'mushroom') A.drawMushroom(ctx, p.x, p.y, 0, p.dir < 0 ? 1 : -1, 1 - k * 0.3);
          else if (p.type === 'chicken') { ctx.translate(p.x, p.y); ctx.rotate(Math.PI); A.drawChicken(ctx, 0, 0, 0, 1); }
          ctx.restore(); break;
        case 'text':
          ctx.save(); ctx.globalAlpha = Math.min(1, k * 2); ctx.font = '22px "Lilita One", sans-serif'; ctx.textAlign = 'center';
          ctx.lineWidth = 5; ctx.strokeStyle = A.INK; ctx.strokeText(p.text, p.x, p.y); ctx.fillStyle = p.color; ctx.fillText(p.text, p.x, p.y); ctx.restore(); break;
        case 'fly': {
          const a = Math.min(1, k * 3, (1 - k) * 3) * (0.5 + 0.5 * Math.sin(this.clock * 6 + p.ph)) * (this.sky?.night || 0);
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 10); g.addColorStop(0, `rgba(230,255,120,${a})`); g.addColorStop(1, 'rgba(230,255,120,0)');
          ctx.fillStyle = g; ctx.fillRect(p.x - 10, p.y - 10, 20, 20); break;
        }
        case 'conf': ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color; ctx.globalAlpha = Math.min(1, k * 2); ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); ctx.restore(); break;
      }
    }
  }
}
