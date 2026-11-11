// Build: src/ -> dist/web (PWA + Capacitor webDir) and dist/extension (Chrome MV3) + zip.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const BUILD = Date.now().toString(36);

const rm = (p) => fs.rmSync(p, { recursive: true, force: true });
const copy = (a, b) => fs.cpSync(a, b, { recursive: true });
const list = (dir, base = dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
  const p = path.join(dir, d.name); return d.isDirectory() ? list(p, base) : [path.relative(base, p).split(path.sep).join('/')];
});

rm('dist'); fs.mkdirSync('dist');

// ---- web / PWA / Android webDir
copy('src', 'dist/web');
const assets = ['./', ...list('dist/web').filter((f) => f !== 'sw.js').map((f) => './' + f)];
const sw = fs.readFileSync('dist/web/sw.js', 'utf8').replace('__BUILD__', BUILD).replace('__ASSETS__', JSON.stringify(assets));
fs.writeFileSync('dist/web/sw.js', sw);

// ---- Chrome extension
copy('src', 'dist/extension');
rm('dist/extension/sw.js'); rm('dist/extension/manifest.webmanifest');
for (const f of fs.readdirSync('extension')) copy(path.join('extension', f), path.join('dist/extension', f));
const man = fs.readFileSync('dist/extension/manifest.json', 'utf8').replace('__VERSION__', pkg.version);
fs.writeFileSync('dist/extension/manifest.json', man);
// manifest link is meaningless inside an extension page; drop it
const idx = 'dist/extension/index.html';
fs.writeFileSync(idx, fs.readFileSync(idx, 'utf8').replace(/\s*<link rel="manifest"[^>]*>/, ''));

const zipName = `funny-jump-extension-v${pkg.version}.zip`;
try {
  // Windows: bsdtar can write zip (-a). Linux/macOS (CI): use zip.
  if (process.platform === 'win32') execFileSync('tar', ['-a', '-c', '-f', `../${zipName}`, '*'], { cwd: 'dist/extension', shell: true, stdio: 'ignore' });
  else execFileSync('zip', ['-qr', `../${zipName}`, '.'], { cwd: 'dist/extension', stdio: 'ignore' });
  console.log(`✔ dist/${zipName}`);
} catch { console.log('(zip skipped: no zip tool)'); }

console.log(`✔ dist/web (${assets.length} files, build ${BUILD})`);
console.log('✔ dist/extension (load unpacked in chrome://extensions)');
