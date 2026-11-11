import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const OUT = process.argv[2];
fs.mkdirSync(OUT + '/sprites', { recursive: true }); fs.mkdirSync(OUT + '/sky', { recursive: true });
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', protocolTimeout: 600000, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage();
p.on('pageerror', (e) => console.log('ERR', e.message));
p.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
await p.goto('http://localhost:5299/bake.html'); await p.waitForFunction('window.ready', { timeout: 60000 });
const save = (file, dataUrl) => fs.writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
const meta = {};
const models = [
  ['island_tree_02', 1024, [0, 1.6]], ['tree_small_02', 1024, [0, 2.1]], ['fir_sapling', 768, [0, 1.2]],
  ['shrub_02', 512, [0, 1.5]], ['shrub_01', 512, [0]], ['fern_02', 512, [0, 1.3]], ['grass_medium_01', 512, [0, 1.1]],
  ['rock_moss_set_01', 512, [0]], ['boulder_01', 512, [0]], ['dandelion_01', 384, [0]],
];
for (const [id, size, yaws] of models) {
  for (let i = 0; i < yaws.length; i++) {
    const t0 = Date.now();
    const r = await p.evaluate((u, s, y) => window.bake(u, s, y), `./ph/models/${id}/${id}.gltf`, size, yaws[i]);
    const name = `${id}_${i}`; save(`${OUT}/sprites/${name}.webp`, r.data);
    meta[name] = { w: +r.w.toFixed(3), h: +r.h.toFixed(3), px: [r.W, r.H] };
    console.log(name, r.W + 'x' + r.H, ((Date.now() - t0) / 1000).toFixed(1) + 's');
  }
}
fs.writeFileSync(`${OUT}/sprites/meta.json`, JSON.stringify(meta, null, 1));
for (const [id, out] of [['kloofendal_48d_partly_cloudy_puresky', 'day'], ['qwantani_sunset_puresky', 'sunset'], ['qwantani_night_puresky', 'night']]) {
  save(`${OUT}/sky/${out}.jpg`, await p.evaluate((u) => window.resizeSky(u, 2048, 1024), `./ph/sky/${id}.jpg`)); console.log('sky', out);
}
await b.close();
