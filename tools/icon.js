// Renders app icons with the real game art. Used by scripts/icons.mjs via headless Chrome (--dump-dom).
import { drawHero, drawCoin, starPath } from '../src/js/art.js';
import { SKINS } from '../src/js/config.js';

function scene(g, S, withBg) {
  g.save(); g.scale(S / 512, S / 512);
  if (withBg) {
    const r = 112;
    g.beginPath(); g.roundRect(0, 0, 512, 512, r); g.clip();
    const sky = g.createLinearGradient(0, 0, 0, 512); sky.addColorStop(0, '#2FA8F5'); sky.addColorStop(1, '#8ED8FF');
    g.fillStyle = sky; g.fillRect(0, 0, 512, 512);
    // half-day / half-night diagonal (the game's signature)
    g.save(); g.beginPath(); g.moveTo(512, 0); g.lineTo(512, 300); g.lineTo(250, 0); g.closePath();
    const nt = g.createLinearGradient(512, 0, 300, 200); nt.addColorStop(0, '#0B1033'); nt.addColorStop(1, '#3A3570'); g.fillStyle = nt; g.fill();
    g.fillStyle = '#F4F1DC'; g.beginPath(); g.arc(440, 80, 34, 0, 7); g.fill();
    g.fillStyle = '#0E1442'; g.beginPath(); g.arc(456, 70, 30, 0, 7); g.fill();
    g.fillStyle = '#fff'; [[360, 40], [470, 170], [400, 140]].forEach(([x, y]) => { starPath(g, x, y, 7, 3); g.fill(); });
    g.restore();
    g.fillStyle = '#FFC933'; g.beginPath(); g.arc(90, 92, 46, 0, 7); g.fill(); g.lineWidth = 6; g.strokeStyle = '#E08A12'; g.stroke();
    g.fillStyle = '#4CAF1A'; g.beginPath(); g.ellipse(256, 560, 420, 170, 0, 0, 7); g.fill();
    g.fillStyle = '#7ED321'; g.beginPath(); g.ellipse(256, 575, 400, 160, 0, 0, 7); g.fill();
    g.lineWidth = 8; g.strokeStyle = '#2B1A10'; g.beginPath(); g.roundRect(4, 4, 504, 504, r - 4); g.stroke();
  }
  drawCoin(g, 400, 300, 0.2, 40);
  g.save(); g.translate(240, 440); g.scale(4.2, 4.2); drawHero(g, 0, 0, SKINS.red, { state: 'jump', t: 0.4, dir: 1, sx: 1, sy: 1 }); g.restore();
  g.restore();
}

const out = {};
const make = (name, S, withBg, pad = 0) => {
  const c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  if (pad) { g.translate(S * pad, S * pad); scene(g, S * (1 - pad * 2), withBg); } else scene(g, S, withBg);
  out[name] = c.toDataURL('image/png');
};
await document.fonts.ready;
for (const s of [16, 32, 48, 128, 192, 512]) make('icon-' + s, s, true);
for (const [d, s] of [['mdpi', 48], ['hdpi', 72], ['xhdpi', 96], ['xxhdpi', 144], ['xxxhdpi', 192]]) make('launcher-' + d, s, true);
for (const [d, s] of [['mdpi', 108], ['hdpi', 162], ['xhdpi', 216], ['xxhdpi', 324], ['xxxhdpi', 432]]) make('fg-' + d, s, false, 0.2);
make('maskable-512', 512, true, 0);
document.getElementById('out').textContent = JSON.stringify(out);
