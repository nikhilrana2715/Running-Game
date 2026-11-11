import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const dir = process.argv[2];
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
const p = await b.newPage(); await p.goto('http://localhost:5299/bake.html'); await p.waitForFunction('window.ready');
for (const f of fs.readdirSync(dir)) {
  const nor = f.includes('_nor'), s = nor ? 512 : 1024;
  const url = 'data:image/jpeg;base64,' + fs.readFileSync(`${dir}/${f}`).toString('base64');
  const out = await p.evaluate(async (u, s, q) => { const i = new Image(); i.src = u; await i.decode(); const c = document.createElement('canvas'); c.width = c.height = s; c.getContext('2d').drawImage(i, 0, 0, s, s); return c.toDataURL('image/jpeg', q); }, url, s, nor ? 0.9 : 0.82);
  fs.writeFileSync(`${dir}/${f}`, Buffer.from(out.split(',')[1], 'base64'));
}
await b.close();
