// Generates PNG icons from the game's own art using headless Chrome. Run: node scripts/icons.mjs
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import { serve } from './serve.mjs';

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find((p) => fs.existsSync(p));
if (!CHROME) { console.error('Chrome/Edge not found'); process.exit(1); }

const server = await serve('.', 5199);
const { stdout: dom } = await promisify(execFile)(CHROME, ['--headless=new', '--disable-gpu', '--virtual-time-budget=8000', '--dump-dom', 'http://localhost:5199/tools/icon.html'], { encoding: 'utf8', maxBuffer: 64 << 20 });
server.close();
const json = dom.match(/<pre id="out">([\s\S]*?)<\/pre>/)[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const icons = JSON.parse(json);
const write = (file, url) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64')); };

for (const [k, v] of Object.entries(icons)) if (k.startsWith('icon-') || k.startsWith('maskable')) write(`src/icons/${k}.png`, v);
fs.mkdirSync('assets/android', { recursive: true });
for (const [k, v] of Object.entries(icons)) {
  if (k.startsWith('launcher-')) write(`assets/android/mipmap-${k.slice(9)}/ic_launcher.png`, v), write(`assets/android/mipmap-${k.slice(9)}/ic_launcher_round.png`, v);
  if (k.startsWith('fg-')) write(`assets/android/mipmap-${k.slice(3)}/ic_launcher_foreground.png`, v);
}
console.log('icons written:', Object.keys(icons).length);
