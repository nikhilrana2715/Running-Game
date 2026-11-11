// Generate Chrome Web Store images into store/ (needs puppeteer-core + local Chrome; serve dist/web first).
//   npm run build && node scripts/serve.mjs dist/web 5199   (other terminal)
//   npm i --no-save puppeteer-core && node scripts/store-assets.mjs
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = process.env.URL || 'http://localhost:5199/index.html?debug';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync('store', { recursive: true });
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
const p = await b.newPage();
await p.setViewport({ width: 1280, height: 800 });
await p.goto(URL, { waitUntil: 'load' }); await sleep(2500);
await p.evaluate(() => { const S = window.__fj.Save; S.data.daily.lastClaim = new Date().toLocaleDateString('en-CA'); S.data.player.coins = 2450; S.persist(); });
await p.evaluate(() => document.querySelectorAll('.modal').forEach((m) => (m.hidden = true)));
await sleep(400); await p.screenshot({ path: 'store/screenshot-1-menu.png' });
// gameplay with a web swing
await p.evaluate(() => window.__fj.start('level', 3)); await sleep(1800);
await p.keyboard.down('ArrowRight'); await sleep(700);
const tap = async () => { await p.keyboard.down('Space'); await sleep(70); await p.keyboard.up('Space'); };
await tap(); await sleep(80); await tap(); await sleep(230);
await p.screenshot({ path: 'store/screenshot-2-webswing.png' });
await sleep(2500); await p.keyboard.up('ArrowRight'); await sleep(800);
// night + power-up
await p.evaluate(() => { const g = window.__fj.game; g.time += 30; g.collectPower({ kind: 'shield', x: g.player.x, y: g.player.y, alive: true }); g.collectPower({ kind: 'boots', x: g.player.x, y: g.player.y, alive: true }); });
await sleep(500);
await p.screenshot({ path: 'store/screenshot-3-night-powerups.png' });
// daily missions
await p.evaluate(() => window.__fj.Save.data.daily.lastClaim = '');
await p.keyboard.press('Escape'); await sleep(200);
await p.evaluate(() => document.querySelector('[data-action="home"]').click()); await sleep(600);
await p.evaluate(() => document.querySelector('[data-action="daily"]').click()); await sleep(600);
await p.screenshot({ path: 'store/screenshot-4-daily.png' });
// small promo tile 440x280
const icon = fs.readFileSync('src/icons/icon-512.png').toString('base64');
await p.setViewport({ width: 440, height: 280 });
await p.setContent(`<html><body style="margin:0;width:440px;height:280px;display:flex;align-items:center;gap:18px;padding:0 26px;box-sizing:border-box;
  background:linear-gradient(160deg,#2FA8F5,#8E44D8);font-family:'Lilita One',Impact,sans-serif;color:#fff">
  <img src="data:image/png;base64,${icon}" style="width:150px;height:150px;border-radius:32px;box-shadow:0 8px 20px rgba(0,0,0,.35)">
  <div><div style="font-size:52px;line-height:.95;-webkit-text-stroke:2px #2B1A10;paint-order:stroke fill">Funny<br>Jump</div>
  <div style="font:700 17px system-ui;margin-top:10px">Run · Jump · Web Swing<br>Day ↔ Night mini game</div></div></body></html>`);
await sleep(300); await p.screenshot({ path: 'store/promo-small-440x280.png' });
await b.close();
console.log('✔ store/ images written');
