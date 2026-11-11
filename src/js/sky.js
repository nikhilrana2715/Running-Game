// Day <-> night cycle + parallax background (sky, sun/moon, stars, clouds, mountains, hills, tree line).
import { VIEW_H } from './config.js';
import { hexToRgb, mixRgb, rgb, rgba, smooth, clamp, noise1, mulberry32 } from './util.js';

// Phase p in [0,1): 0 midnight, .25 sunrise, .5 noon, .75 sunset.
const KEYS = [
  [0.00, '#070B2A', '#1A2560', '#151B45'],
  [0.20, '#0E1442', '#2E2D6B', '#1D2155'],
  [0.25, '#4C5FB8', '#FF9F7A', '#7A5A8E'],
  [0.30, '#2E9BF0', '#FFD49A', '#8FB4D8'],
  [0.36, '#2FA8F5', '#8ED8FF', '#A8D8F0'],
  [0.64, '#2FA8F5', '#8ED8FF', '#A8D8F0'],
  [0.70, '#3C86DC', '#FFC27A', '#B49AB8'],
  [0.75, '#5B48AC', '#FF7A59', '#8E5C8A'],
  [0.80, '#251F63', '#8A4A8C', '#3A2C66'],
  [0.86, '#070B2A', '#1A2560', '#151B45'],
  [1.00, '#070B2A', '#1A2560', '#151B45'],
].map(([p, a, b, c]) => [p, hexToRgb(a), hexToRgb(b), hexToRgb(c)]);

export function nightFactor(p) {
  if (p < 0.2 || p > 0.86) return 1;
  if (p < 0.32) return 1 - smooth((p - 0.2) / 0.12);
  if (p > 0.7) return smooth((p - 0.7) / 0.16);
  return 0;
}

export function skyState(p) {
  p = ((p % 1) + 1) % 1;
  let i = 0; while (i < KEYS.length - 2 && KEYS[i + 1][0] <= p) i++;
  const [p0, t0, b0, h0] = KEYS[i], [p1, t1, b1, h1] = KEYS[i + 1];
  const k = clamp((p - p0) / (p1 - p0 || 1), 0, 1);
  const night = nightFactor(p);
  // warmth = golden-hour glow strength
  const warm = Math.max(0, 1 - Math.abs(p - 0.25) / 0.06) + Math.max(0, 1 - Math.abs(p - 0.75) / 0.07);
  return { p, top: mixRgb(t0, t1, k), bottom: mixRgb(b0, b1, k), haze: mixRgb(h0, h1, k), night, warm: clamp(warm, 0, 1) };
}

export function cyclePhase(sec, startPhase, mode, cycleSec) {
  if (mode === 'day') return 0.5;
  if (mode === 'night') return 0.0;
  return (startPhase + sec / cycleSec) % 1;
}

// ---------- background drawing ----------
const rng = mulberry32(777);
const STARS = Array.from({ length: 140 }, () => ({ x: rng(), y: rng() * 0.75, r: 0.6 + rng() * 1.6, tw: rng() * 6.28 }));
const CLOUDS = Array.from({ length: 9 }, (_, i) => ({ x: i * 520 + rng() * 300, y: 60 + rng() * 200, s: 0.6 + rng() * 0.7 }));
let shooting = null;

function face(ctx, x, y, r, kind, t) {
  ctx.save(); ctx.translate(x, y);
  ctx.strokeStyle = 'rgba(80,40,10,.75)'; ctx.fillStyle = 'rgba(80,40,10,.75)'; ctx.lineWidth = r * 0.07; ctx.lineCap = 'round';
  if (kind === 'sun') {
    const blink = (t % 4) < 0.12;
    if (blink) { ctx.beginPath(); ctx.moveTo(-r * .38, -r * .1); ctx.lineTo(-r * .18, -r * .1); ctx.moveTo(r * .18, -r * .1); ctx.lineTo(r * .38, -r * .1); ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(-r * .28, -r * .12, r * .08, 0, 7); ctx.arc(r * .28, -r * .12, r * .08, 0, 7); ctx.fill(); }
    ctx.beginPath(); ctx.arc(0, r * .08, r * .32, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    ctx.fillStyle = 'rgba(255,120,90,.45)'; ctx.beginPath(); ctx.arc(-r * .5, r * .18, r * .12, 0, 7); ctx.arc(r * .5, r * .18, r * .12, 0, 7); ctx.fill();
  } else {
    ctx.strokeStyle = 'rgba(60,70,120,.7)';
    ctx.beginPath(); ctx.arc(-r * .25, -r * .05, r * .12, 0.1 * Math.PI, 0.9 * Math.PI); ctx.moveTo(r * .37, -r * .05); ctx.arc(r * .25, -r * .05, r * .12, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, r * .2, r * .12, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
  }
  ctx.restore();
}

function drawSunMoon(ctx, vw, vh, st, t) {
  const arc = (q) => ({ x: vw * (0.08 + 0.84 * q), y: vh * 0.62 - Math.sin(q * Math.PI) * vh * 0.5 });
  // Sun visible p .2 -> .8
  const qs = (st.p - 0.2) / 0.6;
  if (qs > -0.05 && qs < 1.05) {
    const { x, y } = arc(clamp(qs, 0, 1)); const r = 46;
    const glow = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 4);
    glow.addColorStop(0, `rgba(255,${200 - st.warm * 60},${110 - st.warm * 60},.55)`); glow.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = glow; ctx.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.25);
    ctx.fillStyle = `rgba(255,${190 - st.warm * 40},60,.9)`;
    for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.beginPath(); ctx.moveTo(r * 1.05, -8); ctx.lineTo(r * 1.45 + Math.sin(t * 3 + i) * 4, 0); ctx.lineTo(r * 1.05, 8); ctx.fill(); }
    ctx.restore();
    const g = ctx.createRadialGradient(x - r * .3, y - r * .3, r * .2, x, y, r);
    g.addColorStop(0, '#FFF6B0'); g.addColorStop(1, st.warm > .3 ? '#FF9F1C' : '#FFC933');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(200,110,20,.6)'; ctx.stroke();
    face(ctx, x, y, r, 'sun', t);
  }
  // Moon visible p .7 -> 1.3
  const qm = (((st.p + 0.3) % 1) - 0.0) / 0.6;
  if (qm > -0.05 && qm < 1.05 && st.night > 0.05) {
    const { x, y } = arc(clamp(qm, 0, 1)); const r = 34;
    ctx.globalAlpha = st.night;
    const glow = ctx.createRadialGradient(x, y, r, x, y, r * 4);
    glow.addColorStop(0, 'rgba(190,210,255,.35)'); glow.addColorStop(1, 'rgba(190,210,255,0)');
    ctx.fillStyle = glow; ctx.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
    ctx.fillStyle = '#F4F1DC'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(190,190,170,.6)';
    [[-10, -8, 6], [8, 10, 5], [12, -12, 3.5]].forEach(([dx, dy, rr]) => { ctx.beginPath(); ctx.arc(x + dx, y + dy, rr, 0, 7); ctx.fill(); });
    face(ctx, x, y, r, 'moon', t);
    ctx.globalAlpha = 1;
  }
}

function cloud(ctx, x, y, s) {
  ctx.beginPath();
  ctx.arc(x, y, 34 * s, Math.PI * 0.5, Math.PI * 1.5);
  ctx.arc(x + 40 * s, y - 26 * s, 38 * s, Math.PI, Math.PI * 1.85);
  ctx.arc(x + 92 * s, y - 14 * s, 30 * s, Math.PI * 1.2, Math.PI * 1.95);
  ctx.arc(x + 118 * s, y + 4 * s, 26 * s, Math.PI * 1.5, Math.PI * 0.5);
  ctx.closePath(); ctx.fill();
}

function ridge(ctx, vw, camX, factor, base, amp, freq, seed, color, step = 10) {
  const off = camX * factor;
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, VIEW_H);
  for (let x = -step; x <= vw + step; x += step) {
    const wx = (x + off) * freq;
    const y = base - (noise1(wx, seed) * 0.65 + noise1(wx * 2.3, seed + 3) * 0.35) * amp;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(vw + step, VIEW_H); ctx.closePath(); ctx.fill();
}

function treeLine(ctx, vw, camX, factor, base, color, kind) {
  const off = camX * factor, sp = 46;
  ctx.fillStyle = color;
  const start = Math.floor(off / sp) - 1;
  for (let i = start; i < start + vw / sp + 3; i++) {
    const x = i * sp - off;
    const h = 50 + noise1(i * 0.37, 9) * 70;
    if (kind === 'pine') {
      ctx.beginPath(); ctx.moveTo(x - 24, base); ctx.lineTo(x, base - h - 30); ctx.lineTo(x + 24, base); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(x, base - h * 0.6, 24 + h * 0.15, 0, 7); ctx.fill();
      ctx.fillRect(x - 4, base - h * 0.6, 8, h * 0.6);
    }
  }
  ctx.fillRect(0, base - 6, vw, VIEW_H - base + 6);
}

export function drawBackground(ctx, vw, camX, st, world, t, dt) {
  const vh = VIEW_H;
  // Sky gradient
  const g = ctx.createLinearGradient(0, 0, 0, vh);
  g.addColorStop(0, rgb(st.top)); g.addColorStop(0.75, rgb(st.bottom)); g.addColorStop(1, rgb(st.bottom));
  ctx.fillStyle = g; ctx.fillRect(0, 0, vw, vh);

  // Stars
  if (st.night > 0.02) {
    for (const s of STARS) {
      const a = st.night * (0.55 + 0.45 * Math.sin(t * 2 + s.tw));
      ctx.fillStyle = `rgba(255,255,240,${a})`;
      const x = ((s.x * vw * 1.4 - camX * 0.02) % vw + vw) % vw;
      ctx.beginPath(); ctx.arc(x, s.y * vh, s.r, 0, 7); ctx.fill();
    }
    // Shooting star
    if (!shooting && st.night > 0.8 && Math.random() < dt * 0.15) shooting = { x: Math.random() * vw, y: Math.random() * vh * 0.3, life: 1 };
    if (shooting) {
      shooting.life -= dt * 1.4; shooting.x += 700 * dt; shooting.y += 260 * dt;
      const a = Math.max(0, shooting.life) * st.night;
      const gr = ctx.createLinearGradient(shooting.x, shooting.y, shooting.x - 120, shooting.y - 45);
      gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = gr; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(shooting.x, shooting.y); ctx.lineTo(shooting.x - 120, shooting.y - 45); ctx.stroke();
      if (shooting.life <= 0) shooting = null;
    }
  }

  drawSunMoon(ctx, vw, vh, st, t);

  // Clouds
  const cloudCol = mixRgb(mixRgb([255, 255, 255], [255, 190, 170], st.warm * 0.7), [70, 80, 140], st.night * 0.85);
  ctx.fillStyle = rgba(cloudCol, 0.92 - st.night * 0.35);
  const span = 9 * 520;
  for (const c of CLOUDS) {
    const x = (((c.x - camX * 0.12 - t * 12 * c.s) % span) + span) % span - 200;
    if (x < vw + 200) cloud(ctx, x, c.y, c.s);
  }

  // Far mountains (atmospheric tint toward haze)
  const hill = hexToRgb(world.hill);
  const far = mixRgb(mixRgb([120, 150, 200], st.haze, 0.55), [20, 25, 60], st.night * 0.6);
  ridge(ctx, vw, camX, 0.08, vh * 0.62, 260, 0.0035, 1, rgb(far), 12);
  // Snow caps hint
  if (world.name === 'Rocky Mountains' || world.name === 'Sunset Peaks') {
    ctx.globalAlpha = 0.25 * (1 - st.night * 0.6);
    ridge(ctx, vw, camX, 0.08, vh * 0.62 - 6, 260, 0.0035, 1, 'rgba(255,255,255,1)', 12);
    ctx.globalAlpha = 1; ridge(ctx, vw, camX, 0.08, vh * 0.66, 240, 0.0035, 1, rgb(far), 12);
  }
  // Waterfalls
  if (world.waterfall) {
    const off = camX * 0.08, sp = 900;
    for (let i = Math.floor(off / sp) - 1; i < (off + vw) / sp + 1; i++) {
      const x = i * sp + 300 - off;
      const top = vh * 0.62 - noise1((i * sp + 300) * 0.0035, 1) * 200;
      const wg = ctx.createLinearGradient(0, top, 0, vh * 0.75);
      wg.addColorStop(0, rgba(mixRgb([220, 245, 255], [120, 140, 200], st.night), 0.9)); wg.addColorStop(1, rgba([255, 255, 255], 0.3));
      ctx.fillStyle = wg; ctx.fillRect(x - 10, top, 20, vh * 0.75 - top);
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      for (let k = 0; k < 4; k++) ctx.fillRect(x - 8 + k * 5, top + ((t * 160 + k * 37) % (vh * 0.75 - top)), 2, 16);
    }
  }
  // Near hills
  const near = mixRgb(mixRgb(hill, st.haze, 0.35), [15, 30, 50], st.night * 0.65);
  ridge(ctx, vw, camX, 0.22, vh * 0.74, 130, 0.006, 5, rgb(near), 10);
  // Tree line
  const tl = mixRgb(mixRgb(hill, [20, 70, 40], 0.45), [10, 22, 35], st.night * 0.7);
  treeLine(ctx, vw, camX, 0.42, vh * 0.86, rgb(tl), world.tree);
  // Golden-hour wash
  if (st.warm > 0.02) { ctx.fillStyle = `rgba(255,140,60,${st.warm * 0.12})`; ctx.fillRect(0, 0, vw, vh); }
}
