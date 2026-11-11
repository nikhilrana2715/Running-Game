// 3D renderer (three.js, vendored locally -> offline + extension-CSP safe).
// Gameplay is untouched: Game still simulates in 2D pixels; this module just draws that state in 3D.
// World mapping: 1 unit = 1 tile (T px). x3 = x / T, y3 = -y / T, gameplay plane is z = 0.
// The camera looks straight at z = 0 with the same framing as the 2D view, so a point on that plane lands on
// exactly the same screen pixel as in 2D -> particles/popups can still be drawn by the 2D overlay (drawOverlay).
import * as THREE from '../vendor/three.module.min.js';
import { T, ROWS, VIEW_H, POWERUPS } from './config.js';
import { TILE } from './levelgen.js';
import * as A from './art.js';
import { mulberry32 } from './util.js';

const CH = 16;                 // columns per terrain chunk
const FOV = 40;
const DIST = (ROWS / 2) / Math.tan((FOV / 2) * Math.PI / 180);
const GROUND_D = 2.4;          // ground block depth (z)
const X = (px) => px / T, Y = (py) => -py / T;
const col3 = (c) => new THREE.Color(c[0] / 255, c[1] / 255, c[2] / 255);

export function webglOK() {
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (_) { return false; }
}

// 3-step toon ramp shared by every material -> flat cartoon shading like the 2D art.
let RAMP = null;
function ramp() {
  if (RAMP) return RAMP;
  const d = new Uint8Array([90, 170, 255]);
  RAMP = new THREE.DataTexture(d, 3, 1, THREE.RedFormat); RAMP.minFilter = RAMP.magFilter = THREE.NearestFilter; RAMP.needsUpdate = true;
  return RAMP;
}
const MATS = new Map();
function toon(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!opts.unique && MATS.has(key)) return MATS.get(key);
  const m = new THREE.MeshToonMaterial({ color, gradientMap: ramp(), ...opts.mat });
  if (opts.glow) { m.emissive = new THREE.Color(opts.glow); m.emissiveIntensity = 0; m.userData.glow = opts.glowMax ?? 0.8; }
  if (!opts.unique) MATS.set(key, m);
  return m;
}
const INK_MAT = new THREE.MeshBasicMaterial({ color: 0x2B1A10, side: THREE.BackSide });
// inverted-hull outline
function outline(mesh, s = 1.08) { const o = new THREE.Mesh(mesh.geometry, INK_MAT); o.scale.setScalar(s); mesh.add(o); return mesh; }

const G = {}; // shared geometries
function geos() {
  if (G.box) return G;
  G.box = new THREE.BoxGeometry(1, 1, 1);
  G.sphere = new THREE.SphereGeometry(0.5, 16, 12);
  G.lowSphere = new THREE.IcosahedronGeometry(0.5, 1);
  G.cyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 14);
  G.cone = new THREE.ConeGeometry(0.5, 1, 10);
  G.coin = new THREE.CylinderGeometry(0.3, 0.3, 0.08, 20); G.coin.rotateX(Math.PI / 2);
  const st = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.2 : 0.42; i ? st.lineTo(Math.cos(a) * r, Math.sin(a) * r) : st.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  G.star = new THREE.ExtrudeGeometry(st, { depth: 0.14, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 1 }); G.star.center(); G.star.rotateZ(Math.PI);
  G.torus = new THREE.TorusGeometry(0.29, 0.045, 8, 24);
  G.arch = new THREE.TorusGeometry(1.25, 0.16, 8, 24, Math.PI);
  return G;
}
const mesh = (geo, mat, sx = 1, sy = 1, sz = 1, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.castShadow = true; return m; };

function emojiTexture(ch, size = 128) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); g.font = `${size * 0.7}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, size / 2, size / 2 + size * 0.04);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------------------------------------------------------------- hero
function buildHero(skin) {
  geos();
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const hood = toon(skin.hood), hoodDk = toon(skin.hoodDk), pants = toon(skin.pants), shoe = toon(skin.shoe), skinM = toon(skin.skin), hair = toon(skin.hair);
  const legs = [], arms = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(0.11 * s, 0.42, 0); body.add(hip);
    hip.add(outline(mesh(G.box, pants, 0.15, 0.36, 0.17, 0, -0.18, 0)));
    hip.add(outline(mesh(G.box, shoe, 0.18, 0.1, 0.27, 0, -0.38, 0.05)));
    legs.push(hip);
    const sh = new THREE.Group(); sh.position.set(0.27 * s, 0.76, 0); body.add(sh);
    sh.add(outline(mesh(G.box, hoodDk, 0.11, 0.32, 0.12, 0, -0.15, 0)));
    sh.add(mesh(G.sphere, skinM, 0.12, 0.12, 0.12, 0, -0.33, 0));
    arms.push(sh);
  }
  body.add(outline(mesh(G.box, hood, 0.44, 0.4, 0.3, 0, 0.6, 0)));
  if (skin.badge) body.add(mesh(G.box, toon('#FFC933'), 0.12, 0.08, 0.02, 0, 0.62, 0.16));
  const head = new THREE.Group(); head.position.set(0, 1.0, 0); body.add(head);
  head.add(outline(mesh(G.sphere, skinM, 0.56, 0.54, 0.52), 1.06));
  const eye = toon('#1B1B24');
  if (skin.robot) {
    head.add(mesh(G.box, toon('#2FD5FF', { glow: '#2FD5FF' }), 0.38, 0.1, 0.05, 0, 0.02, 0.25));
    head.add(mesh(G.cyl, hair, 0.03, 0.22, 0.03, 0, 0.36, 0)); head.add(mesh(G.sphere, toon('#E53935', { glow: '#FF3030' }), 0.09, 0.09, 0.09, 0, 0.48, 0));
  } else {
    for (const s of [-1, 1]) head.add(mesh(G.sphere, eye, 0.07, 0.1, 0.05, 0.1 * s, 0.03, 0.25));
    // spiky hair
    const n = skin.pony ? 5 : 7;
    for (let i = 0; i < n; i++) {
      const a = (i / (n - 1) - 0.5) * 2.2, c = mesh(G.cone, hair, 0.16, 0.3, 0.16, Math.sin(a) * 0.2, 0.22 + Math.cos(a) * 0.08, -0.04);
      c.rotation.z = -a * 0.9; c.rotation.x = -0.35; head.add(c);
    }
    head.add(mesh(G.sphere, hair, 0.56, 0.36, 0.52, 0, 0.12, -0.04));
    if (skin.pony) { const p = mesh(G.sphere, hair, 0.2, 0.34, 0.2, 0, 0.0, -0.32); p.rotation.x = 0.6; head.add(p); }
  }
  if (skin.mask) head.add(mesh(G.box, toon('#14141C'), 0.54, 0.16, 0.5, 0, -0.1, 0.04));
  if (skin.band) {
    const band = toon(skin.band), b = mesh(G.torus, band, 0.95, 0.95, 0.95, 0, 0.1, 0); b.rotation.x = Math.PI / 2; head.add(b);
    const tail = mesh(G.box, band, 0.06, 0.05, 0.3, 0.06, 0.1, -0.38); tail.rotation.y = 0.4; head.add(tail);
  }
  root.userData = { body, legs, arms, head, skin };
  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return root;
}

function animHero(h, pl, inv, playing) {
  const { body, legs, arms, head } = h.userData, t = pl.animT, st = pl.anim;
  const run = st === 'run', air = st === 'jump' || st === 'fall';
  const ph = t * 16, sw = run ? Math.sin(ph) * 0.9 : 0;
  legs[0].rotation.x = run ? sw : air ? (st === 'jump' ? -0.7 : 0.3) : 0;
  legs[1].rotation.x = run ? -sw : air ? (st === 'jump' ? 0.2 : -0.3) : 0;
  arms[0].rotation.x = run ? -sw : air ? -2.6 : 0; arms[1].rotation.x = run ? sw : air ? (pl.web ? -2.9 : -2.2) : 0;
  arms[0].rotation.z = air ? 0.3 : 0.08; arms[1].rotation.z = air ? -0.3 : -0.08;
  if (st === 'win') { arms[0].rotation.x = arms[1].rotation.x = -2.8; arms[0].rotation.z = Math.sin(t * 12) * 0.4 + 0.4; }
  body.position.y = run ? Math.abs(Math.sin(ph)) * 0.05 : st === 'idle' ? Math.sin(t * 3) * 0.015 : 0;
  body.rotation.z = st === 'hurt' ? 0.4 : 0;
  body.rotation.x = run ? 0.12 : 0;
  head.rotation.y = st === 'idle' ? Math.sin(t * 0.8) * 0.3 : 0;
  h.rotation.y = st === 'die' ? t * 10 : st === 'win' ? Math.min(Math.PI * 2, t * 4) * 0 + 0.2 : (pl.dir || 1) * 1.0;
  h.scale.set(pl.sx || 1, pl.sy || 1, pl.sx || 1).multiplyScalar(0.9 * 1.15);
  h.visible = !(inv > 0 && playing && Math.floor(inv * 14) % 2 === 0);
}

// ---------------------------------------------------------------- entities
function buildEnt(e, world) {
  geos();
  const g = new THREE.Group();
  switch (e.type) {
    case 'coin': g.add(outline(mesh(G.coin, toon('#FFC933', { glow: '#FFB020', glowMax: 0.9 })), 1.12)); break;
    case 'star': g.add(outline(mesh(G.star, toon('#FFD23F', { glow: '#FFC933', glowMax: 1 })), 1.1)); break;
    case 'apple': g.add(outline(mesh(G.sphere, toon('#E53935'), 0.55, 0.5, 0.55))); g.add(mesh(G.box, toon('#7ED321'), 0.16, 0.06, 0.08, 0.1, 0.3, 0)); break;
    case 'chest': {
      const wood = toon('#B5651D'), gold = toon('#FFC933', { glow: '#FFC933', glowMax: 0.4 });
      g.add(outline(mesh(G.box, wood, 0.9, 0.45, 0.6, 0, 0.22, 0)));
      const lid = new THREE.Group(); lid.position.set(0, 0.45, -0.3); g.add(lid);
      lid.add(outline(mesh(G.box, wood, 0.92, 0.2, 0.62, 0, 0.1, 0.3))); lid.add(mesh(G.box, gold, 0.14, 0.16, 0.64, 0, 0.1, 0.31));
      g.add(mesh(G.box, gold, 0.14, 0.45, 0.62, 0, 0.22, 0)); g.userData.lid = lid; break;
    }
    case 'mushroom': {
      const b = new THREE.Group(); g.add(b);
      b.add(outline(mesh(G.cyl, toon('#FFE9C9'), 0.42, 0.42, 0.42, 0, 0.21, 0)));
      const cap = outline(mesh(G.sphere, toon('#8E44D8'), 0.86, 0.6, 0.8, 0, 0.5, 0)); b.add(cap);
      for (const [x, y, z] of [[0.2, 0.68, 0.22], [-0.22, 0.62, 0.2], [0, 0.78, -0.1], [0.3, 0.55, -0.1]]) b.add(mesh(G.sphere, toon('#FFFFFF'), 0.15, 0.1, 0.15, x, y, z));
      for (const s of [-1, 1]) b.add(mesh(G.sphere, toon('#1B1B24'), 0.07, 0.1, 0.05, 0.09 * s, 0.3, 0.2));
      g.userData.body = b; break;
    }
    case 'spike': {
      const m = toon('#4A4A5A'), core = outline(mesh(G.lowSphere, m, 0.55, 0.55, 0.55)); g.add(core);
      const ico = new THREE.IcosahedronGeometry(1, 0).attributes.position, seen = new Set();
      for (let i = 0; i < ico.count; i++) {
        const v = new THREE.Vector3().fromBufferAttribute(ico, i), k = v.toArray().map((n) => n.toFixed(2)).join(); if (seen.has(k)) continue; seen.add(k);
        const c = mesh(G.cone, toon('#D8D8E0'), 0.14, 0.26, 0.14); c.position.copy(v.clone().multiplyScalar(0.33)); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize()); g.add(c);
      }
      for (const s of [-1, 1]) g.add(mesh(G.sphere, toon('#FF3030', { glow: '#FF2020', glowMax: 1 }), 0.08, 0.08, 0.05, 0.09 * s, 0.05, 0.26));
      break;
    }
    case 'chicken': {
      const w = toon('#FFFFFF');
      g.add(outline(mesh(G.sphere, w, 0.8, 0.62, 0.6)));
      g.add(mesh(G.sphere, toon('#E53935'), 0.18, 0.2, 0.08, 0.2, 0.36, 0));
      const beak = mesh(G.cone, toon('#FF9F1C'), 0.14, 0.22, 0.14, 0.45, 0.02, 0); beak.rotation.z = -Math.PI / 2; g.add(beak);
      g.add(mesh(G.box, toon('#111111'), 0.3, 0.1, 0.5, 0.26, 0.12, 0));
      const wings = [];
      for (const s of [-1, 1]) { const wg = new THREE.Group(); wg.position.set(-0.05, 0.08, 0.28 * s); wg.add(mesh(G.sphere, toon('#EDEDED'), 0.45, 0.12, 0.3, -0.1, 0, 0.1 * s)); g.add(wg); wings.push(wg); }
      g.userData.wings = wings; break;
    }
    case 'mover': g.add(outline(mesh(G.box, toon('#C8742A'), e.w / T, 0.38, 1.4, e.w / T / 2, -0.19, 0), 1.03)); break;
    case 'crumble': { const m = toon('#A7A2B5', { unique: true }); g.add(outline(mesh(G.box, m, e.w / T, 0.38, 1.4, e.w / T / 2, -0.19, 0), 1.03)); g.userData.mat = m; break; }
    case 'egg': g.add(outline(mesh(G.sphere, toon('#FFFDF5'), 0.34, 0.44, 0.34))); break;
    case 'power': {
      const def = POWERUPS[e.kind];
      const bub = new THREE.Mesh(G.sphere, new THREE.MeshToonMaterial({ color: def.color, gradientMap: ramp(), transparent: true, opacity: 0.4, emissive: new THREE.Color(def.color), emissiveIntensity: 0.25 }));
      bub.scale.setScalar(0.85); g.add(bub);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTexture(def.icon), depthWrite: false })); sp.scale.setScalar(0.6); g.add(sp);
      break;
    }
    case 'checkpoint': {
      g.add(outline(mesh(G.cyl, toon('#8B4A1F'), 0.08, 2, 0.08, 0, 1, 0)));
      const flag = mesh(G.box, toon('#9AA3B5', { unique: true }), 0.6, 0.38, 0.04, 0.3, 1.75, 0); g.add(flag); g.userData.flag = flag; break;
    }
    case 'goal': {
      const pc = toon('#8E44D8'), arch = mesh(G.arch, toon('#FFC933', { glow: '#FFC933', glowMax: 0.6 }), 1, 1, 1, 0, 2.2, 0);
      for (const s of [-1, 1]) g.add(outline(mesh(G.box, pc, 0.3, 2.3, 0.4, 1.25 * s, 1.15, 0), 1.05));
      g.add(arch);
      const flag = mesh(G.box, toon('#E53935'), 0.8, 0.5, 0.05, 0.4, 3.6, 0); g.add(flag); g.add(mesh(G.cyl, toon('#8B4A1F'), 0.06, 1.3, 0.06, 0, 3.1, 0));
      g.userData.flag = flag; break;
    }
    default: return null;
  }
  g.traverse((o) => { if (o.isMesh && o.material !== INK_MAT) o.castShadow = true; });
  return g;
}

function placeEnt(g, e, t, night) {
  const ud = g.userData;
  switch (e.type) {
    case 'coin': g.position.set(X(e.x + 16), Y(e.y + 16 + Math.sin(e.t * 3) * 2), 0); g.rotation.y = e.t * 3; break;
    case 'star': g.position.set(X(e.x + 20), Y(e.y + 20 + Math.sin(e.t * 2.5) * 4), 0); g.rotation.y = Math.sin(e.t * 2) * 0.6; break;
    case 'apple': g.position.set(X(e.x + 15), Y(e.y + 15 + Math.sin(e.t * 3) * 3), 0); g.rotation.y = e.t; break;
    case 'chest': g.position.set(X(e.x + 22), Y(e.y + e.h), 0); ud.lid.rotation.x = e.open ? -1.1 : 0; break;
    case 'mushroom': g.position.set(X(e.x + e.w / 2), Y(e.y + e.h), 0); g.rotation.y = e.dir < 0 ? -0.6 : 0.6; ud.body.scale.y = 1 + Math.sin(e.t * 10) * 0.05; ud.body.rotation.z = Math.sin(e.t * 10) * 0.08; break;
    case 'spike': g.position.set(X(e.x + e.w / 2), Y(e.y + e.h / 2), 0); g.rotation.z = -(e.rot || 0); break;
    case 'chicken': g.position.set(X(e.x + e.w / 2), Y(e.y + e.h / 2), 0); g.rotation.y = Math.PI; ud.wings.forEach((w, i) => (w.rotation.x = Math.sin(e.t * 22) * 0.8 * (i ? 1 : -1))); break;
    case 'mover': g.position.set(X(e.x), Y(e.y), 0); break;
    case 'crumble': g.position.set(X(e.x + (e.shk || 0)), Y(e.y), 0); ud.mat.color.set(e.trig > 0 || e.fall ? '#C98A6E' : '#A7A2B5'); g.visible = !(e.back > 0); break;
    case 'egg': g.position.set(X(e.x + 8), Y(e.y + 10), 0); g.rotation.z = Math.sin(e.t * 10) * 0.25; break;
    case 'power': g.position.set(X(e.x + 20), Y(e.y + 20), 0); g.children[0].scale.setScalar(0.85 + Math.sin(e.t * 4) * 0.04); break;
    case 'checkpoint': g.position.set(X(e.x + 4), Y(e.y + e.h), 0); ud.flag.material.color.set(e.active ? '#7ED321' : '#9AA3B5'); ud.flag.rotation.y = Math.sin(t * 3) * 0.2; break;
    case 'goal': g.position.set(X(e.x + 66), Y(e.y + e.h), -0.2); ud.flag.rotation.y = Math.sin(t * 3) * 0.3; break;
  }
}

// ---------------------------------------------------------------- decor
function buildDecor(d, world) {
  geos();
  const g = new THREE.Group(), r = mulberry32(Math.floor(d.x * 13 + d.v * 9973));
  switch (d.type) {
    case 'tree': {
      const h = 2 + d.v * 1.4;
      g.add(outline(mesh(G.cyl, toon('#8B5A2B'), 0.24, h * 0.55, 0.24, 0, h * 0.27, 0), 1.06));
      if (d.tree === 'pine') for (let i = 0; i < 3; i++) g.add(outline(mesh(G.cone, toon(i % 2 ? world.grassDk : '#3F8F3A'), 1.5 - i * 0.35, h * 0.42, 1.5 - i * 0.35, 0, h * (0.45 + i * 0.22), 0), 1.04));
      else for (const [x, y, s] of [[-0.45, 0.7, 0.9], [0.45, 0.68, 0.85], [0, 0.92, 1.15]]) g.add(outline(mesh(G.lowSphere, toon(world.grassDk), s * 1.3, s * 1.2, s * 1.2, x, h * y, 0), 1.04));
      break;
    }
    case 'bush': for (const [x, s] of [[-0.35, 0.6], [0.15, 0.8], [0.55, 0.55]]) g.add(outline(mesh(G.lowSphere, toon(world.grass), s, s * 0.8, s, x, s * 0.3, 0), 1.05)); break;
    case 'flowers': {
      const cols = ['#FF6FA8', '#FFC933', '#FFFFFF', '#8E44D8'];
      for (let i = 0; i < 5; i++) { const x = (r() - 0.5) * 1.1, z = (r() - 0.5) * 0.8, h = 0.2 + r() * 0.2; g.add(mesh(G.cyl, toon('#4CAF1A'), 0.03, h, 0.03, x, h / 2, z)); g.add(mesh(G.sphere, toon(cols[(r() * 4) | 0]), 0.14, 0.12, 0.14, x, h, z)); }
      break;
    }
    case 'fence': {
      const w = toon('#D9A066');
      for (const x of [-0.5, 0, 0.5]) g.add(outline(mesh(G.box, w, 0.1, 0.6, 0.1, x, 0.3, 0), 1.08));
      for (const y of [0.22, 0.45]) g.add(outline(mesh(G.box, w, 1.15, 0.08, 0.06, 0, y, 0), 1.05));
      break;
    }
    case 'rock': g.add(outline(mesh(new THREE.DodecahedronGeometry(0.4, 0), toon('#9A9AAA'), 1.2, 0.7, 1, 0, 0.18, 0), 1.06)); break;
    case 'mushdeco': for (const [x, s] of [[0, 1], [0.25, 0.7]]) { g.add(mesh(G.cyl, toon('#E8F7F2'), 0.07 * s, 0.3 * s, 0.07 * s, x, 0.15 * s, 0)); g.add(mesh(G.sphere, toon('#3CFFDC', { glow: '#3CFFDC', glowMax: 1.4 }), 0.3 * s, 0.16 * s, 0.3 * s, x, 0.3 * s, 0)); } break;
    case 'sign': {
      g.add(outline(mesh(G.cyl, toon('#8B4A1F'), 0.08, 1, 0.08, 0, 0.5, 0)));
      const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d');
      x.fillStyle = '#C8742A'; x.fillRect(0, 0, 256, 128); x.font = '64px "Lilita One",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#FFF'; x.strokeStyle = '#2B1A10'; x.lineWidth = 8; x.strokeText(d.text, 128, 68); x.fillText(d.text, 128, 68);
      const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
      g.add(outline(mesh(G.box, [toon('#C8742A'), toon('#C8742A'), toon('#C8742A'), toon('#C8742A'), new THREE.MeshToonMaterial({ map: tx, gradientMap: ramp() }), toon('#C8742A')], 1.3, 0.65, 0.08, 0, 1.1, 0), 1.04));
      break;
    }
    default: return null;
  }
  g.position.set(X(d.x + 24), Y(d.y), d.type === 'sign' ? 0.2 : -0.75 - (d.v || 0) * 0.3);
  g.traverse((o) => { if (o.isMesh && o.material !== INK_MAT) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

// ---------------------------------------------------------------- renderer
export class Renderer3D {
  constructor(canvas) {
    this.canvas = canvas;
    this.r = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.r.outputColorSpace = THREE.SRGBColorSpace;
    this.r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(FOV, 16 / 9, 0.5, 400);
    this.quality = 'hd';

    // sky gradient (screen-space background texture, redrawn when colours change)
    this.skyCv = document.createElement('canvas'); this.skyCv.width = 2; this.skyCv.height = 256;
    this.skyTex = new THREE.CanvasTexture(this.skyCv); this.skyTex.colorSpace = THREE.SRGBColorSpace;
    this.scene.background = this.skyTex;
    this.scene.fog = new THREE.Fog(0xA8D8F0, 40, 160);

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x557744, 1.2); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 2); this.sun.castShadow = true;
    const sc = this.sun.shadow.camera; sc.left = -22; sc.right = 22; sc.top = 14; sc.bottom = -14; sc.near = 1; sc.far = 80;
    this.sun.shadow.mapSize.set(2048, 2048); this.sun.shadow.bias = -0.0008;
    this.scene.add(this.sun, this.sun.target);
    this.lantern = new THREE.PointLight(0xFFB86E, 0, 7, 2); this.scene.add(this.lantern);

    this.world = new THREE.Group(); this.scene.add(this.world);
    this.bg = new THREE.Group(); this.scene.add(this.bg);
    this.buildSky();
    this.level = null; this.chunks = new Map(); this.ents = new Map(); this.decor = null; this.hero = null; this.heroSkin = null;
    this.lastClean = 0;
  }

  setQuality(q) {
    this.quality = q;
    const hd = q === 'hd';
    this.r.shadowMap.enabled = hd; this.sun.castShadow = hd;
    this.r.setPixelRatio(hd ? Math.min(2, window.devicePixelRatio || 1) : Math.min(1.25, window.devicePixelRatio || 1));
    MATS.forEach((m) => (m.needsUpdate = true));
  }

  resize(w, h) { this.r.setSize(w, h, false); this.cam.aspect = w / h; this.cam.updateProjectionMatrix(); }

  buildSky() {
    geos();
    // sun + moon
    this.sunM = new THREE.Mesh(G.sphere, new THREE.MeshBasicMaterial({ color: 0xFFE27A, fog: false })); this.sunM.scale.setScalar(9);
    this.moonM = new THREE.Mesh(G.sphere, new THREE.MeshBasicMaterial({ color: 0xEEF2FF, fog: false })); this.moonM.scale.setScalar(6);
    const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
    this.sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xFFD27A, transparent: true, opacity: 0.6, fog: false, depthWrite: false })); this.sunGlow.scale.setScalar(40);
    this.moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x9FB4FF, transparent: true, opacity: 0.4, fog: false, depthWrite: false })); this.moonGlow.scale.setScalar(26);
    this.bg.add(this.sunM, this.moonM, this.sunGlow, this.moonGlow);
    // stars
    const rng = mulberry32(99), pos = [];
    for (let i = 0; i < 500; i++) pos.push((rng() - 0.5) * 420, rng() * 120 - 20, -150 - rng() * 30);
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.1, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    this.bg.add(this.stars);
    // clouds (pool, wrap around camera)
    this.clouds = [];
    const cm = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: ramp() }); this.cloudMat = cm;
    for (let i = 0; i < 14; i++) {
      const c = new THREE.Group(), n = 3 + ((rng() * 3) | 0);
      for (let k = 0; k < n; k++) c.add(mesh(G.lowSphere, cm, 3 + rng() * 2.5, 2.2 + rng() * 1.5, 2.5, k * 2.2 - n, rng() * 0.8, 0));
      c.userData = { span: 220, base: i * 16 + rng() * 8, y: 4 + rng() * 14, z: -45 - rng() * 30, sp: 0.3 + rng() * 0.5 };
      c.traverse((o) => (o.castShadow = false)); this.clouds.push(c); this.bg.add(c);
    }
    // background hills + mountains (pools)
    this.hills = []; this.mounts = [];
    for (let i = 0; i < 14; i++) { const h = mesh(G.lowSphere, toon('#5DBB2F', { unique: true }), 14 + rng() * 10, 10 + rng() * 8, 10, 0, 0, 0); h.castShadow = false; h.userData = { base: i * 12, y: -14.5, z: -16 - rng() * 6, span: 168 }; this.hills.push(h); this.bg.add(h); }
    for (let i = 0; i < 10; i++) { const m = mesh(G.cone, toon('#8FA8C8', { unique: true }), 34 + rng() * 20, 26 + rng() * 22, 20, 0, 0, 0); m.castShadow = false; m.userData = { base: i * 26, y: -6, z: -70 - rng() * 15, span: 260 }; this.mounts.push(m); this.bg.add(m); }
    this.floor = mesh(new THREE.PlaneGeometry(600, 120), toon('#4CAF1A', { unique: true }), 1, 1, 1, 0, -14.6, -64); this.floor.rotation.x = -Math.PI / 2; this.floor.castShadow = false; this.floor.receiveShadow = true;
    this.bg.add(this.floor);
  }

  // ---- level / chunks
  setLevel(level) {
    for (const c of this.chunks.values()) { this.world.remove(c.group); c.group.children.forEach((o) => o.dispose?.()); }
    this.chunks.clear();
    for (const m of this.ents.values()) this.world.remove(m); this.ents.clear();
    if (this.decor) this.world.remove(this.decor);
    this.decor = new THREE.Group(); this.world.add(this.decor); this.decorDone = 0;
    this.level = level; this.dirty = new Set();
    const w = level.world;
    // terrain materials from the 2D tile art (keeps the cartoon look)
    const S = A.makeTileSprites(w, 96), tex = (cv) => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
    const m = (opts) => new THREE.MeshToonMaterial({ gradientMap: ramp(), ...opts });
    const grassTop = m({ color: w.grass }), dirt = m({ map: tex(S.dirt) }), grassSide = m({ map: tex(S.grass) });
    this.tm = {
      top: [grassSide, grassSide, grassTop, dirt, grassSide, grassSide],   // px nx py ny pz nz
      dirt: [dirt, dirt, dirt, dirt, dirt, dirt],
      plat: m({ map: tex(S.plat) }),
      box: m({ map: tex(S.box), emissive: new THREE.Color('#FFB020'), emissiveIntensity: 0 }),
      used: m({ map: tex(S.used) }), crate: m({ map: tex(S.crate) }),
    };
    this.hills.forEach((h) => h.material.color.set(w.hill));
    this.floor.material.color.set(w.grassDk);
    // mark tile edits (lucky boxes used, crates broken) so the chunk is rebuilt
    const orig = level.set.bind(level);
    level.set = (c, r, v) => { orig(c, r, v); this.dirty.add(Math.floor(c / CH)); };
  }

  buildChunk(k) {
    const lv = this.level, c0 = k * CH, c1 = Math.min(lv.cols.length, c0 + CH);
    const lists = { top: [], dirt: [], plat: [], box: [], used: [], crate: [] };
    for (let c = c0; c < c1; c++) {
      const col = lv.cols[c];
      for (let r = 0; r < ROWS; r++) {
        const t = col[r]; if (!t) continue;
        if (t === TILE.GROUND) (r === 0 || col[r - 1] !== TILE.GROUND ? lists.top : lists.dirt).push([c, r]);
        else if (t === TILE.PLAT) lists.plat.push([c, r]);
        else if (t === TILE.BOX) lists.box.push([c, r]);
        else if (t === TILE.USED) lists.used.push([c, r]);
        else if (t === TILE.CRATE) lists.crate.push([c, r]);
      }
    }
    const group = new THREE.Group(), mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    for (const [kind, arr] of Object.entries(lists)) {
      if (!arr.length) continue;
      const im = new THREE.InstancedMesh(G.box, this.tm[kind], arr.length);
      arr.forEach(([c, r], i) => {
        if (kind === 'top' || kind === 'dirt') { s.set(1.001, 1.001, GROUND_D); p.set(c + 0.5, -(r + 0.5), 0); }
        else if (kind === 'plat') { s.set(1, 0.32, 1.5); p.set(c + 0.5, -(r + 0.16), 0); }
        else { s.set(1, 1, 1); p.set(c + 0.5, -(r + 0.5), 0); }
        im.setMatrixAt(i, mtx.compose(p, q, s));
      });
      im.castShadow = kind !== 'dirt'; im.receiveShadow = true; group.add(im);
    }
    this.world.add(group);
    return { group, cols: c1 - c0 };
  }

  syncChunks(camX3, vw3) {
    const lv = this.level, k0 = Math.max(0, Math.floor((camX3 - 6) / CH)), k1 = Math.floor((camX3 + vw3 + 6) / CH);
    for (let k = k0; k <= k1; k++) {
      if (k * CH >= lv.cols.length) break;
      const have = this.chunks.get(k), need = Math.min(CH, lv.cols.length - k * CH);
      if (have && have.cols === need && !this.dirty.has(k)) continue;
      if (have) { this.world.remove(have.group); have.group.children.forEach((o) => o.dispose?.()); }
      this.dirty.delete(k);
      this.chunks.set(k, this.buildChunk(k));
    }
    for (const [k, c] of this.chunks) if (k < k0 - 2 || k > k1 + 2) { this.world.remove(c.group); c.group.children.forEach((o) => o.dispose?.()); this.chunks.delete(k); }
    // decor (append-only, culled by visibility)
    const D = lv.decor;
    for (; this.decorDone < D.length; this.decorDone++) { const g = buildDecor(D[this.decorDone], lv.world); if (g) { g.userData.x = D[this.decorDone].x; this.decor.add(g); } }
    const L = (camX3 - 8) * T, R = (camX3 + vw3 + 8) * T;
    for (let i = this.decor.children.length - 1; i >= 0; i--) {
      const g = this.decor.children[i]; g.visible = g.userData.x > L && g.userData.x < R;
      if (lv.endless && g.userData.x < L - 40 * T) this.decor.remove(g);
    }
  }

  // ---- per-frame
  render(game, cw, ch) {
    const scale = ch / VIEW_H, vw = cw / scale;
    game.viewW = vw;
    if (game.level !== this.level) this.setLevel(game.level);
    const st = game.sky || { night: 0, top: [47, 168, 245], bottom: [142, 216, 255], haze: [168, 216, 240], warm: 0, p: 0.5 };
    const n = st.night, t = game.clock;
    const camX3 = X(game.camX), vw3 = vw / T, cx = camX3 + vw3 / 2, cy = -ROWS / 2;
    const sh = game.shake ? (Math.random() - 0.5) * game.shake / T : 0, sv = game.shake ? (Math.random() - 0.5) * game.shake / T : 0;
    // Camera sits UP (sees the tops of blocks) but uses an off-axis frustum so the z=0 gameplay plane
    // keeps the exact 2D framing (overlay particles still line up).
    const UP = 4.5;
    this.cam.position.set(cx + sh, cy + sv + UP, DIST); this.cam.lookAt(cx + sh, cy + sv + UP, 0);
    this.cam.aspect = cw / ch; this.cam.updateProjectionMatrix();
    const P = this.cam.projectionMatrix.elements; P[9] = -P[5] * UP / DIST;
    this.cam.projectionMatrixInverse.copy(this.cam.projectionMatrix).invert();

    // sky + fog
    const g2 = this.skyCv.getContext('2d'), gr = g2.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, `rgb(${st.top.map((v) => v | 0)})`); gr.addColorStop(0.75, `rgb(${st.bottom.map((v) => v | 0)})`); gr.addColorStop(1, `rgb(${st.haze.map((v) => v | 0)})`);
    g2.fillStyle = gr; g2.fillRect(0, 0, 2, 256); this.skyTex.needsUpdate = true;
    this.scene.fog.color.copy(col3(st.haze));

    // celestial: angle across the sky from phase
    const sa = ((st.p - 0.25) / 0.5) * Math.PI, ma = sa - Math.PI;
    this.sunM.position.set(cx - Math.cos(sa) * 70, cy - 30 + Math.sin(sa) * 75, -160); this.sunGlow.position.copy(this.sunM.position);
    this.moonM.position.set(cx - Math.cos(ma) * 70, cy - 30 + Math.sin(ma) * 75, -160); this.moonGlow.position.copy(this.moonM.position);
    this.sunM.visible = this.sunGlow.visible = Math.sin(sa) > -0.1; this.moonM.visible = this.moonGlow.visible = Math.sin(ma) > -0.1;
    this.stars.material.opacity = n * (0.75 + Math.sin(t * 2) * 0.1); this.stars.position.x = cx * 0.9;

    // lights
    const day = 1 - n;
    this.hemi.intensity = 0.45 + day * 0.85;
    this.hemi.color.copy(col3(st.top)).lerp(new THREE.Color(0xffffff), 0.55 * day + 0.2);
    this.hemi.groundColor.set(n > 0.5 ? 0x223355 : 0x557744);
    this.sun.intensity = 0.35 + day * 1.9;
    this.sun.color.set(n > 0.5 ? 0x9FB4FF : 0xffffff).lerp(new THREE.Color(0xFFA060), st.warm * 0.7);
    const lightDir = n > 0.5 ? -1 : 1;
    this.sun.position.set(cx + 10 * lightDir, cy + 22, 26); this.sun.target.position.set(cx, cy, 0);
    const pl = game.player;
    this.lantern.position.set(X(pl.x + pl.w / 2), Y(pl.y + pl.h / 2) + 0.6, 1.2); this.lantern.intensity = n * 9;
    // glowing materials
    MATS.forEach((m) => { if (m.userData.glow) m.emissiveIntensity = m.userData.glow * n; });
    if (this.tm) this.tm.box.emissiveIntensity = 0.6 * n;
    const tint = new THREE.Color(0xffffff).lerp(new THREE.Color(0x5A6390), n * 0.7); this.cloudMat.color.copy(tint);

    // parallax pools (wrap to stay around camera)
    const wrap = (o, f) => { const u = o.userData; const rel = ((u.base - cx * f) % u.span + u.span) % u.span - u.span / 2; return cx + rel; };
    for (const h of this.hills) h.position.set(wrap(h, 0), h.userData.y, h.userData.z);
    for (const m of this.mounts) { m.position.set(wrap(m, 0), m.userData.y, m.userData.z); m.material.color.copy(col3(st.haze)).lerp(new THREE.Color(0x6E86A8), 0.35); }
    for (const c of this.clouds) { const u = c.userData; u.base += u.sp * 0.016; c.position.set(wrap(c, 0.6), u.y, u.z); }
    this.floor.position.x = cx;

    // terrain + entities
    this.syncChunks(camX3, vw3);
    const L = game.camX - 300, R = game.camX + vw + 300, seen = new Set();
    for (const e of game.ents) {
      if (!e.alive || e.x > R || e.x + (e.w || 60) < L) continue;
      let m = this.ents.get(e);
      if (m === undefined) { m = buildEnt(e, this.level.world); this.ents.set(e, m); if (m) this.world.add(m); }
      if (!m) continue;
      m.visible = true; placeEnt(m, e, t, n); seen.add(e);
    }
    for (const [e, m] of this.ents) if (m && !seen.has(e)) m.visible = false;
    if (t - this.lastClean > 2) {
      this.lastClean = t; const live = new Set(game.ents);
      for (const [e, m] of this.ents) if (!live.has(e) || (!e.alive && !seen.has(e))) { if (m) this.world.remove(m); this.ents.delete(e); }
    }

    // hero
    if (this.heroSkin !== game.skin) { if (this.hero) this.world.remove(this.hero); this.hero = buildHero(game.skin); this.heroSkin = game.skin; this.world.add(this.hero); }
    this.hero.position.set(X(pl.x + pl.w / 2), Y(pl.y + pl.h), 0);
    animHero(this.hero, pl, pl.inv, game.state === 'play');

    this.r.render(this.scene, this.cam);
  }

  // 2D overlay in exactly the 2D game's coordinates: particles, popups, web line, shield.
  drawOverlay(game, ctx, cw, ch) {
    const scale = ch / VIEW_H, cam = Math.round(game.camX * scale) / scale;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cw, ch);
    ctx.setTransform(scale, 0, 0, scale, -cam * scale, 0);
    const pl = game.player;
    if (pl.web) A.drawWeb(ctx, pl.x + pl.w / 2 + pl.web.dir * 8, pl.y + 18, pl.web.ax, pl.web.ay);
    if (game.pw?.shield > 0 && game.state === 'play') A.drawShield(ctx, pl.x + pl.w / 2, pl.y + pl.h / 2, game.clock, game.pw.shield);
    game.drawParticles(ctx, false); game.drawParticles(ctx, true);
  }
}
