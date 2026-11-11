// Procedural cartoon art: thick dark outlines, glossy fills. Everything drawn in world units.
import { T } from './config.js';

export const INK = '#2B1A10';
const TAU = Math.PI * 2;

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
export { rr as roundRect };
function fillStroke(ctx, fill, lw = 3) { ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke(); }
function starPath(ctx, cx, cy, ro, ri, n = 5, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) { const r = i % 2 ? ri : ro, a = rot + (i * Math.PI) / n; ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
  ctx.closePath();
}
export { starPath };

// ---------------- HERO ----------------
// (x,y) = bottom-center of feet. a = { state, t, dir, sx, sy, blink }
export function drawHero(ctx, x, y, skin, a) {
  const s = skin, t = a.t;
  ctx.save(); ctx.translate(x, y); ctx.scale(a.dir * (a.sx || 1), a.sy || 1);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const run = a.state === 'run', air = a.state === 'jump' || a.state === 'fall';
  const ph = t * 16;
  const legA = run ? Math.sin(ph) * 0.9 : air ? (a.state === 'jump' ? -0.6 : 0.4) : 0;
  const bob = run ? Math.abs(Math.sin(ph)) * -3 : a.state === 'idle' ? Math.sin(t * 3) * 1.2 : 0;

  // headband tails (behind)
  if (s.band) {
    ctx.strokeStyle = s.band; ctx.lineWidth = 5;
    const wv = Math.sin(t * 14) * 4;
    ctx.beginPath(); ctx.moveTo(-12, -46 + bob); ctx.quadraticCurveTo(-24, -48 + wv + bob, -32, -40 + wv * 1.4 + bob); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-12, -44 + bob); ctx.quadraticCurveTo(-22, -40 - wv + bob, -30, -34 - wv + bob); ctx.stroke();
  }
  // legs
  const leg = (ang, back) => {
    ctx.save(); ctx.translate(back ? -4 : 4, -14 + bob); ctx.rotate(ang);
    rr(ctx, -4, 0, 8, 12, 3); fillStroke(ctx, s.pants, 2.5);
    rr(ctx, -6, 9, 14, 7, 3.5); fillStroke(ctx, s.shoe, 2.5);
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(-4, 14, 10, 1.5);
    ctx.restore();
  };
  leg(-legA, true); leg(legA, false);
  // body (hoodie)
  rr(ctx, -12, -30 + bob, 24, 19, 7); fillStroke(ctx, s.hood);
  ctx.fillStyle = s.hoodDk; ctx.fillRect(-10, -16 + bob, 20, 3);
  if (s.badge === 'pad') { rr(ctx, -6, -25 + bob, 12, 7, 3); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.fillStyle = s.hoodDk; ctx.fillRect(-4, -22 + bob, 3, 1.5); ctx.fillRect(-3.2, -23 + bob, 1.5, 3.5); }
  else if (!s.robot) { ctx.strokeStyle = s.hoodDk; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-3, -29 + bob); ctx.lineTo(-3, -22 + bob); ctx.moveTo(3, -29 + bob); ctx.lineTo(3, -22 + bob); ctx.stroke(); }
  else { ctx.fillStyle = s.band; ctx.beginPath(); ctx.arc(0, -21 + bob, 3, 0, TAU); ctx.fill(); }
  // arms
  const armA = run ? -Math.sin(ph) * 1.0 : air ? -2.4 : a.state === 'win' ? -2.8 + Math.sin(t * 12) * 0.3 : 0.2;
  const arm = (ang, back) => {
    ctx.save(); ctx.translate(back ? -9 : 9, -26 + bob); ctx.rotate(ang * (back ? -1 : 1) * (air || a.state === 'win' ? -1 : 1));
    rr(ctx, -3.5, 0, 7, 13, 3.5); fillStroke(ctx, s.hood, 2.5);
    ctx.beginPath(); ctx.arc(0, 14, 4, 0, TAU); fillStroke(ctx, s.skin, 2.5);
    ctx.restore();
  };
  arm(armA, true);
  // head
  const hy = -46 + bob;
  if (s.pony) { ctx.beginPath(); ctx.ellipse(-17, hy - 4 + Math.sin(t * 10) * 2, 7, 11, 0.6, 0, TAU); fillStroke(ctx, s.hair, 2.5); }
  ctx.beginPath(); ctx.arc(0, hy, 17, 0, TAU); fillStroke(ctx, s.skin);
  // hair
  ctx.fillStyle = s.hair; ctx.strokeStyle = INK; ctx.lineWidth = 3;
  if (s.robot) {
    rr(ctx, -15, hy - 18, 30, 12, 5); fillStroke(ctx, s.hair);
    ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, hy - 18); ctx.lineTo(0, hy - 27); ctx.stroke();
    ctx.fillStyle = s.band; ctx.beginPath(); ctx.arc(0, hy - 28, 3.5, 0, TAU); ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(-17, hy - 2);
    const spikes = [[-19, -14], [-11, -12], [-12, -26], [-3, -16], [2, -30], [7, -16], [16, -24], [13, -10], [20, -8]];
    for (const [px, py] of spikes) ctx.lineTo(px, hy + py);
    ctx.lineTo(17, hy - 2); ctx.quadraticCurveTo(0, hy - 10, -17, hy - 2); ctx.closePath();
    fillStroke(ctx, s.hair);
  }
  // band
  if (s.band && !s.robot) { ctx.fillStyle = s.band; ctx.beginPath(); ctx.moveTo(-17, hy - 6); ctx.quadraticCurveTo(0, hy - 13, 17, hy - 6); ctx.lineTo(17, hy - 1); ctx.quadraticCurveTo(0, hy - 8, -17, hy - 1); ctx.closePath(); ctx.fill(); ctx.lineWidth = 2; ctx.stroke(); }
  if (s.mask) { ctx.fillStyle = s.hair; ctx.beginPath(); ctx.moveTo(-17, hy + 3); ctx.quadraticCurveTo(0, hy + 18, 17, hy + 3); ctx.lineTo(17, hy + 12); ctx.quadraticCurveTo(0, hy + 22, -15, hy + 10); ctx.closePath(); ctx.fill(); }
  // face
  const hurt = a.state === 'hurt' || a.state === 'die';
  ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
  if (hurt) {
    for (const ex of [4, 11]) { ctx.beginPath(); ctx.moveTo(ex - 3, hy - 2); ctx.lineTo(ex + 3, hy + 4); ctx.moveTo(ex + 3, hy - 2); ctx.lineTo(ex - 3, hy + 4); ctx.stroke(); }
    if (a.state === 'die') { ctx.fillStyle = '#5BC0FF'; ctx.beginPath(); ctx.ellipse(12, hy + 9 + (t * 30 % 10), 2.5, 4, 0, 0, TAU); ctx.fill(); }
  } else if (a.blink) {
    ctx.beginPath(); ctx.moveTo(2, hy + 1); ctx.lineTo(7, hy + 1); ctx.moveTo(9, hy + 1); ctx.lineTo(14, hy + 1); ctx.stroke();
  } else if (s.robot) {
    ctx.fillStyle = s.band; rr(ctx, 1, hy - 3, 14, 7, 3); ctx.fill();
  } else {
    for (const ex of [5, 12]) { ctx.beginPath(); ctx.ellipse(ex, hy + 1, 2.6, 3.6, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + 0.8, hy - 0.6, 1, 0, TAU); ctx.fill(); ctx.fillStyle = INK; }
  }
  if (!s.mask) {
    ctx.beginPath();
    if (hurt) { ctx.arc(9, hy + 12, 3.5, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    else if (air || a.state === 'win') { ctx.ellipse(9, hy + 9, 3.5, 4, 0, 0, TAU); ctx.fillStyle = '#B5323A'; ctx.fill(); ctx.stroke(); }
    else { ctx.arc(9, hy + 6, 5, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,110,110,.45)'; ctx.beginPath(); ctx.arc(14, hy + 6, 3, 0, TAU); ctx.fill();
  }
  arm(-armA, false);
  ctx.restore();
}

// ---------------- ENEMIES ----------------
export function drawMushroom(ctx, x, y, t, dir, squash = 0) {
  // "Grumpcap": purple cap, lime spots, grumpy brows. (x,y) bottom-center
  ctx.save(); ctx.translate(x, y); ctx.scale(dir * (1 + squash * 0.5), 1 - squash * 0.6);
  const w = Math.sin(t * 10) * 0.35;
  for (const fx of [-9, 9]) { ctx.save(); ctx.translate(fx, -6); ctx.rotate(fx > 0 ? w : -w); rr(ctx, -6, 0, 12, 7, 3.5); fillStroke(ctx, '#6B3A1E', 2.5); ctx.restore(); }
  rr(ctx, -13, -26, 26, 22, 9); fillStroke(ctx, '#FFF0D2');
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.ellipse(-5, -16, 2.5, 4, 0, 0, TAU); ctx.ellipse(6, -16, 2.5, 4, 0, 0, TAU); ctx.fill();
  ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-10, -23); ctx.lineTo(-2, -20); ctx.moveTo(10, -23); ctx.lineTo(3, -20); ctx.stroke();
  ctx.beginPath(); ctx.arc(1, -7, 3.5, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-23, -24); ctx.quadraticCurveTo(-22, -48, 0, -48); ctx.quadraticCurveTo(22, -48, 23, -24);
  ctx.quadraticCurveTo(0, -18, -23, -24); ctx.closePath(); fillStroke(ctx, '#8E44D8');
  ctx.fillStyle = '#B8F04A';
  [[-12, -36, 5], [4, -41, 4], [13, -31, 4.5], [-2, -30, 3]].forEach(([a, b, r]) => { ctx.beginPath(); ctx.arc(a, b, r, 0, TAU); ctx.fill(); });
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(-8, -43, 6, 2.5, -0.4, 0, TAU); ctx.fill();
  ctx.restore();
}

export function drawSpike(ctx, x, y, t, rot) {
  ctx.save(); ctx.translate(x, y - 20); ctx.rotate(rot);
  ctx.beginPath();
  for (let i = 0; i < 20; i++) { const r = i % 2 ? 15 : 24, a = (i * Math.PI) / 10; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  ctx.closePath(); fillStroke(ctx, '#3A3A4E');
  ctx.beginPath(); ctx.arc(0, 0, 15, 0, TAU); fillStroke(ctx, '#2A2A38', 2);
  ctx.rotate(-rot);
  ctx.fillStyle = '#FF4D4D';
  ctx.beginPath(); ctx.arc(-5, -1, 3.5, 0, TAU); ctx.arc(5, -1, 3.5, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-10, -8); ctx.lineTo(-2, -5); ctx.moveTo(10, -8); ctx.lineTo(2, -5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-5, 7); ctx.lineTo(-2, 5); ctx.lineTo(1, 7); ctx.lineTo(4, 5); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.ellipse(-6, -9, 5, 2.5, -0.5, 0, TAU); ctx.fill();
  ctx.restore();
}

export function drawChicken(ctx, x, y, t, dir) {
  ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
  const flap = Math.sin(t * 22);
  ctx.beginPath(); ctx.moveTo(-18, -2); ctx.lineTo(-30, -10); ctx.lineTo(-24, 2); ctx.lineTo(-30, 8); ctx.closePath(); fillStroke(ctx, '#F2F2F2', 2.5);
  ctx.beginPath(); ctx.ellipse(0, 0, 20, 16, 0, 0, TAU); fillStroke(ctx, '#FFFFFF');
  ctx.save(); ctx.translate(-2, -2); ctx.rotate(flap * 0.7 - 0.3); ctx.beginPath(); ctx.ellipse(-8, -6, 13, 7, -0.4, 0, TAU); fillStroke(ctx, '#EDEDED', 2.5); ctx.restore();
  ctx.beginPath(); ctx.moveTo(4, -15); ctx.quadraticCurveTo(6, -26, 11, -18); ctx.quadraticCurveTo(15, -26, 16, -13); ctx.closePath(); fillStroke(ctx, '#E53935', 2.5);
  ctx.beginPath(); ctx.moveTo(18, -4); ctx.lineTo(29, 0); ctx.lineTo(18, 4); ctx.closePath(); fillStroke(ctx, '#FF9F1C', 2.5);
  ctx.beginPath(); ctx.ellipse(18, 7, 3, 4.5, 0, 0, TAU); ctx.fillStyle = '#E53935'; ctx.fill();
  // sunglasses
  ctx.fillStyle = '#111'; rr(ctx, 4, -9, 9, 6, 2); ctx.fill(); rr(ctx, 13.5, -9, 7, 6, 2); ctx.fill();
  ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-2, -7); ctx.lineTo(5, -7); ctx.stroke();
  ctx.fillStyle = 'rgba(120,200,255,.8)'; ctx.fillRect(6, -8, 3, 1.5); ctx.fillRect(15, -8, 2.5, 1.5);
  ctx.strokeStyle = '#FF9F1C'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-3, 15); ctx.lineTo(-4, 22); ctx.moveTo(5, 15); ctx.lineTo(6, 22); ctx.stroke();
  ctx.restore();
}

// ---------------- ITEMS ----------------
export function drawCoin(ctx, cx, cy, t, r = 14) {
  const sx = Math.cos(t * 4);
  ctx.save(); ctx.translate(cx, cy); ctx.scale(Math.max(0.12, Math.abs(sx)), 1);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); fillStroke(ctx, sx > 0 ? '#FFC933' : '#F0A41C', 2.5);
  ctx.beginPath(); ctx.arc(0, 0, r * 0.72, 0, TAU); ctx.strokeStyle = '#E08A12'; ctx.lineWidth = 2; ctx.stroke();
  if (sx > 0) { starPath(ctx, 0, 0, r * 0.45, r * 0.2); ctx.fillStyle = '#FFE58A'; ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(-r * .35, -r * .4, r * .22, r * .12, -0.6, 0, TAU); ctx.fill();
  ctx.restore();
}

export function drawStar(ctx, cx, cy, t, r = 20, empty = false) {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.sin(t * 2) * 0.15);
  const s = 1 + Math.sin(t * 5) * 0.06; ctx.scale(s, s);
  if (!empty) {
    const g = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 2); g.addColorStop(0, 'rgba(255,230,120,.55)'); g.addColorStop(1, 'rgba(255,230,120,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 2, 0, TAU); ctx.fill();
  }
  starPath(ctx, 0, 0, r, r * 0.48); ctx.lineJoin = 'round';
  fillStroke(ctx, empty ? '#5B6478' : '#FFC933', 3);
  if (!empty) { starPath(ctx, -2, -2, r * 0.55, r * 0.25); ctx.fillStyle = '#FFE98F'; ctx.fill(); }
  ctx.restore();
}

export function drawApple(ctx, cx, cy, t) {
  ctx.save(); ctx.translate(cx, cy + Math.sin(t * 3) * 3);
  ctx.beginPath(); ctx.moveTo(0, -10); ctx.bezierCurveTo(-18, -20, -20, 6, -6, 13); ctx.quadraticCurveTo(0, 15, 6, 13); ctx.bezierCurveTo(20, 6, 18, -20, 0, -10); ctx.closePath(); fillStroke(ctx, '#E53935');
  ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(2, -18); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(8, -17, 6, 3, -0.5, 0, TAU); fillStroke(ctx, '#7ED321', 2);
  ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.ellipse(-7, -5, 3, 5, 0.3, 0, TAU); ctx.fill();
  ctx.restore();
}

export function drawChest(ctx, x, y, open, t) {
  // (x,y) bottom-left, 44x34
  ctx.save(); ctx.translate(x, y);
  if (open) {
    const g = ctx.createRadialGradient(22, -24, 2, 22, -24, 50); g.addColorStop(0, 'rgba(255,230,120,.9)'); g.addColorStop(1, 'rgba(255,230,120,0)');
    ctx.fillStyle = g; ctx.fillRect(-30, -80, 104, 90);
  }
  rr(ctx, 0, -22, 44, 22, 4); fillStroke(ctx, '#B5651D');
  ctx.fillStyle = '#FFC933'; ctx.fillRect(3, -22, 5, 22); ctx.fillRect(36, -22, 5, 22);
  ctx.save(); ctx.translate(0, -22); if (open) ctx.rotate(-0.9);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -8); ctx.quadraticCurveTo(22, -20, 44, -8); ctx.lineTo(44, 0); ctx.closePath(); fillStroke(ctx, '#C8742A');
  ctx.restore();
  rr(ctx, 18, -26, 8, 10, 2); fillStroke(ctx, '#FFC933', 2);
  ctx.restore();
}

export function drawCheckpoint(ctx, x, y, active, t) {
  // (x,y) top of pole, pole 96 tall
  ctx.save(); ctx.translate(x, y);
  rr(ctx, 20, 0, 6, 96, 3); fillStroke(ctx, '#E9E2D0', 2.5);
  ctx.beginPath(); ctx.arc(23, 0, 6, 0, TAU); fillStroke(ctx, '#FFC933', 2.5);
  const w = Math.sin(t * 6) * 4;
  ctx.beginPath(); ctx.moveTo(26, 6); ctx.quadraticCurveTo(44, 6 + w, 60, 14 + w); ctx.quadraticCurveTo(44, 24 - w, 26, 32); ctx.closePath();
  fillStroke(ctx, active ? '#7ED321' : '#9AA3B2', 2.5);
  if (active) { starPath(ctx, 40, 19, 6, 2.8); ctx.fillStyle = '#FFF'; ctx.fill(); }
  ctx.restore();
}

export function drawGoal(ctx, x, y, t) {
  // finish gate: two posts + checkered banner + balloons. (x,y) top-left, height 150
  ctx.save(); ctx.translate(x, y);
  const bal = [['#E53935', -6], ['#FFC933', 18], ['#2FA8F5', 112], ['#8E44D8', 132]];
  for (const [c, bx] of bal) {
    const by = -26 + Math.sin(t * 2 + bx) * 5;
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(bx, by + 14); ctx.lineTo(bx < 60 ? 8 : 124, 28); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(bx, by, 11, 14, 0, 0, TAU); fillStroke(ctx, c, 2.5);
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(bx - 4, by - 5, 3, 5, 0.3, 0, TAU); ctx.fill();
  }
  rr(ctx, 0, 0, 14, 150, 4); fillStroke(ctx, '#8B4A1F'); rr(ctx, 118, 0, 14, 150, 4); fillStroke(ctx, '#8B4A1F');
  ctx.save(); rr(ctx, 4, 14, 124, 34, 6); ctx.clip();
  for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) { ctx.fillStyle = (i + j) % 2 ? '#fff' : '#222'; ctx.fillRect(4 + i * 8, 14 + j * 8.5, 8, 8.5); }
  ctx.restore(); rr(ctx, 4, 14, 124, 34, 6); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
  rr(ctx, 30, 22, 72, 20, 8); fillStroke(ctx, '#FFC933', 2.5);
  ctx.fillStyle = INK; ctx.font = '16px "Lilita One", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('GOAL', 66, 33);
  ctx.restore();
}

export function drawMover(ctx, x, y, w) {
  rr(ctx, x, y, w, 18, 8); fillStroke(ctx, '#C8742A');
  ctx.fillStyle = '#8B4A1F'; for (let i = 1; i < w / 24; i++) ctx.fillRect(x + i * 24, y + 3, 2.5, 12);
  ctx.fillStyle = '#FFC933'; for (const px of [x + 8, x + w - 8]) { ctx.beginPath(); ctx.arc(px, y + 9, 3, 0, TAU); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(x + 6, y + 3, w - 12, 2.5);
}

export function drawSign(ctx, x, y, text) {
  ctx.save(); ctx.translate(x, y);
  rr(ctx, 26, -54, 8, 54, 2); fillStroke(ctx, '#8B4A1F', 2.5);
  ctx.rotate(-0.05); rr(ctx, -10, -84, 82, 38, 7); fillStroke(ctx, '#C8742A');
  ctx.fillStyle = '#8B4A1F'; ctx.fillRect(-6, -66, 74, 2);
  ctx.fillStyle = '#FFF4D6'; ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.font = '22px "Lilita One", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.strokeText(text, 31, -65); ctx.fillText(text, 31, -65);
  ctx.restore();
}

// ---------------- DECOR ----------------
export function drawDecor(ctx, d, world, t, night) {
  const { x, y, v } = d;
  ctx.lineJoin = 'round';
  switch (d.type) {
    case 'tree': {
      const h = 90 + v * 60;
      rr(ctx, x + 18, y - h * 0.55, 12, h * 0.55, 4); fillStroke(ctx, '#7A4A22', 2.5);
      if (d.tree === 'pine') {
        for (let i = 0; i < 3; i++) { const yy = y - h * 0.4 - i * h * 0.22, ww = 38 - i * 9; ctx.beginPath(); ctx.moveTo(x + 24 - ww, yy); ctx.lineTo(x + 24, yy - h * 0.38); ctx.lineTo(x + 24 + ww, yy); ctx.closePath(); fillStroke(ctx, i % 2 ? world.grassDk : '#3F8F3A'); }
      } else {
        ctx.beginPath(); ctx.arc(x + 4, y - h * 0.62, 22, 0, TAU); ctx.arc(x + 44, y - h * 0.62, 22, 0, TAU); ctx.arc(x + 24, y - h * 0.85, 30, 0, TAU); fillStroke(ctx, world.grassDk);
        ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.arc(x + 14, y - h * 0.92, 10, 0, TAU); ctx.fill();
        if (v > 0.6) { ctx.fillStyle = '#E53935'; [[x + 8, y - h * .6], [x + 36, y - h * .75], [x + 26, y - h * .95]].forEach(([a, b]) => { ctx.beginPath(); ctx.arc(a, b, 4, 0, TAU); ctx.fill(); }); }
      }
      break;
    }
    case 'bush':
      ctx.beginPath(); ctx.arc(x + 8, y - 10, 14, Math.PI, 0); ctx.arc(x + 26, y - 16, 18, Math.PI, 0); ctx.arc(x + 44, y - 10, 13, Math.PI, 0); ctx.closePath(); fillStroke(ctx, world.grass);
      ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.beginPath(); ctx.arc(x + 22, y - 24, 6, 0, TAU); ctx.fill();
      break;
    case 'flowers':
      for (let i = 0; i < 3; i++) {
        const fx = x + i * 13, fy = y - 14 - (i % 2) * 6, sw = Math.sin(t * 2 + i + v * 6) * 2;
        ctx.strokeStyle = '#3F8F23'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fx, y); ctx.lineTo(fx + sw, fy); ctx.stroke();
        const col = ['#FF6FA8', '#FFC933', '#FFFFFF', '#8E44D8'][Math.floor((v * 10 + i) % 4)];
        ctx.fillStyle = col; for (let k = 0; k < 5; k++) { const a = k * 1.256 + t * 0.2; ctx.beginPath(); ctx.arc(fx + sw + Math.cos(a) * 4, fy + Math.sin(a) * 4, 3, 0, TAU); ctx.fill(); }
        ctx.fillStyle = night > 0.4 ? '#FFF7A0' : '#FF9F1C'; ctx.beginPath(); ctx.arc(fx + sw, fy, 2.2, 0, TAU); ctx.fill();
      }
      break;
    case 'fence':
      ctx.fillStyle = '#E8C48A'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
      rr(ctx, x - 4, y - 30, 64, 6, 2); ctx.fill(); ctx.stroke(); rr(ctx, x - 4, y - 16, 64, 6, 2); ctx.fill(); ctx.stroke();
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x + i * 24, y); ctx.lineTo(x + i * 24, y - 36); ctx.lineTo(x + i * 24 + 5, y - 42); ctx.lineTo(x + i * 24 + 10, y - 36); ctx.lineTo(x + i * 24 + 10, y); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      break;
    case 'rock':
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 4, y - 16); ctx.lineTo(x + 18, y - 24); ctx.lineTo(x + 34, y - 14); ctx.lineTo(x + 38, y); ctx.closePath(); fillStroke(ctx, '#A7A9B4');
      ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.moveTo(x + 8, y - 14); ctx.lineTo(x + 18, y - 20); ctx.lineTo(x + 20, y - 14); ctx.fill();
      break;
    case 'mushdeco': {
      // tiny glowing teal mushrooms (glow at night)
      for (let i = 0; i < 2; i++) {
        const mx = x + i * 14, mh = 12 + i * 5;
        ctx.fillStyle = '#FFF0D2'; ctx.fillRect(mx - 2, y - mh, 4, mh);
        ctx.beginPath(); ctx.ellipse(mx, y - mh, 8 - i, 6, 0, Math.PI, 0); fillStroke(ctx, '#2FD5C0', 2);
      }
      break;
    }
    case 'sign': drawSign(ctx, x, y, d.text); break;
  }
}

// ---------------- TILES (cached sprites) ----------------
export function makeTileSprites(world, px) {
  const mk = (fn) => { const c = document.createElement('canvas'); c.width = c.height = Math.ceil(px); const g = c.getContext('2d'); g.scale(px / T, px / T); g.lineJoin = 'round'; fn(g); return c; };
  const pebbles = (g, seed) => {
    g.fillStyle = world.dirtDk;
    for (let i = 0; i < 4; i++) { const a = Math.sin(seed * 9.1 + i * 3.7) * 0.5 + 0.5, b = Math.sin(seed * 4.3 + i * 5.1) * 0.5 + 0.5; g.beginPath(); g.ellipse(6 + a * 36, 8 + b * 34, 4, 2.6, 0, 0, TAU); g.fill(); }
  };
  const dirt = (g, seed) => { g.fillStyle = world.dirt; g.fillRect(0, 0, T, T); pebbles(g, seed); };
  return {
    dirt: mk((g) => dirt(g, 1)),
    dirt2: mk((g) => dirt(g, 2)),
    grass: mk((g) => {
      dirt(g, 3);
      g.fillStyle = world.grassDk; g.beginPath(); g.moveTo(0, 0); g.lineTo(T, 0); g.lineTo(T, 18);
      for (let i = 4; i >= 0; i--) g.quadraticCurveTo(i * 12 + 6, 26, i * 12, 18);
      g.closePath(); g.fill();
      g.fillStyle = world.grass; g.fillRect(0, 0, T, 13);
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, 3, T, 3);
      g.fillStyle = INK; g.fillRect(0, 0, T, 2.5);
    }),
    plat: mk((g) => {
      rr(g, 1, 2, T - 2, 22, 8); g.fillStyle = world.dirt; g.fill();
      g.fillStyle = world.grass; rr(g, 0, 0, T, 12, 6); g.fill();
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(4, 3, T - 8, 2.5);
      rr(g, 1, 0, T - 2, 24, 8); g.lineWidth = 2.5; g.strokeStyle = INK; g.stroke();
    }),
    box: mk((g) => {
      rr(g, 2, 2, T - 4, T - 4, 7); g.fillStyle = '#FFB020'; g.fill();
      const gr = g.createLinearGradient(0, 0, 0, T); gr.addColorStop(0, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; rr(g, 4, 4, T - 8, T / 2, 5); g.fill();
      rr(g, 2, 2, T - 4, T - 4, 7); g.lineWidth = 3; g.strokeStyle = INK; g.stroke();
      starPath(g, T / 2, T / 2 + 1, 13, 6); g.fillStyle = '#FFFFFF'; g.fill(); g.lineWidth = 2.5; g.stroke();
      g.fillStyle = '#B5651D'; for (const [a, b] of [[8, 8], [T - 8, 8], [8, T - 8], [T - 8, T - 8]]) { g.beginPath(); g.arc(a, b, 2.5, 0, TAU); g.fill(); }
    }),
    used: mk((g) => {
      rr(g, 2, 2, T - 4, T - 4, 7); g.fillStyle = '#9C7A5A'; g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke();
      g.fillStyle = '#7A5A3E'; for (const [a, b] of [[8, 8], [T - 8, 8], [8, T - 8], [T - 8, T - 8]]) { g.beginPath(); g.arc(a, b, 2.5, 0, TAU); g.fill(); }
    }),
    crate: mk((g) => {
      rr(g, 2, 2, T - 4, T - 4, 4); g.fillStyle = '#D08A3E'; g.fill();
      g.strokeStyle = '#8B4A1F'; g.lineWidth = 4; g.beginPath(); g.moveTo(8, 8); g.lineTo(T - 8, T - 8); g.moveTo(T - 8, 8); g.lineTo(8, T - 8); g.stroke();
      g.lineWidth = 3; g.strokeRect(7, 7, T - 14, T - 14);
      rr(g, 2, 2, T - 4, T - 4, 4); g.strokeStyle = INK; g.stroke();
    }),
  };
}

// Avatar for HUD / store previews (draws hero into a small canvas)
export function heroThumb(skin, size = 64, state = 'idle') {
  const c = document.createElement('canvas'); const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = c.height = size * dpr; const g = c.getContext('2d'); g.scale(dpr * size / 80, dpr * size / 80);
  drawHero(g, 40, 76, skin, { state, t: 0.3, dir: 1 });
  return c;
}

// ---------------- POWER-UPS / WEB ----------------
// Floating soap-bubble with the power-up glyph inside.
export function drawPower(ctx, cx, cy, t, def) {
  ctx.save(); ctx.translate(cx, cy);
  const s = 1 + Math.sin(t * 4) * 0.05; ctx.scale(s, s);
  const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 34); g.addColorStop(0, def.color + 'AA'); g.addColorStop(1, def.color + '00');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 34, 0, TAU); ctx.fill();
  const b = ctx.createRadialGradient(-6, -8, 2, 0, 0, 22); b.addColorStop(0, 'rgba(255,255,255,.95)'); b.addColorStop(0.6, 'rgba(255,255,255,.35)'); b.addColorStop(1, def.color + 'CC');
  ctx.beginPath(); ctx.arc(0, 0, 20, 0, TAU); ctx.fillStyle = b; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
  ctx.font = '22px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(def.icon, 0, 1);
  ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.ellipse(-9, -11, 5, 3, -0.6, 0, TAU); ctx.fill();
  ctx.restore();
}

// Web line from the hero's hand to the anchor, with a splat where it sticks.
export function drawWeb(ctx, x0, y0, x1, y1) {
  ctx.save(); ctx.lineCap = 'round';
  ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.translate(x1, y1); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 14, Math.sin(a) * 14); ctx.stroke(); }
  for (const r of [6, 11]) { ctx.beginPath(); for (let i = 0; i <= 6; i++) { const a = (i / 6) * TAU; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); } ctx.stroke(); }
  ctx.restore();
}

// Shield bubble around the hero; flickers in its last 2 s.
export function drawShield(ctx, cx, cy, t, left) {
  if (left < 2 && Math.floor(t * 10) % 2) return;
  ctx.save(); ctx.translate(cx, cy);
  const r = 44 + Math.sin(t * 6) * 2;
  const g = ctx.createRadialGradient(0, 0, r * 0.6, 0, 0, r); g.addColorStop(0, 'rgba(180,140,255,0)'); g.addColorStop(1, 'rgba(180,140,255,.45)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(215,184,255,.9)'; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.restore();
}
