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
  // physically based material (realistic look); 'toon' name kept for call sites
  const m = new THREE.MeshStandardMaterial({ color, roughness: opts.rough ?? 0.7, metalness: opts.metal ?? 0, flatShading: !!opts.flat, ...opts.mat });
  if (opts.glow) { m.emissive = new THREE.Color(opts.glow); m.emissiveIntensity = 0; m.userData.glow = opts.glowMax ?? 0.8; }
  if (!opts.unique) MATS.set(key, m);
  return m;
}
const INK_MAT = new THREE.MeshBasicMaterial({ color: 0x2B1A10, side: THREE.BackSide });
// inverted-hull outline
function outline(mesh) { return mesh; } // cartoon ink outlines disabled in the realistic renderer

const G = {}; // shared geometries (barkTex/woodTex/stoneTex below are hoisted function-style consts -> used lazily at build time)
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
    case 'coin': g.add(mesh(G.coin, toon('#FFCB3D', { glow: '#FFB020', glowMax: 0.6, metal: 0.4, rough: 0.3 }))); break;
    case 'star': g.add(mesh(G.star, toon('#FFC21A', { glow: '#FFC933', glowMax: 1, metal: 0.25, rough: 0.35 }))); break;
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
    case 'mover': g.add(mesh(G.box, new THREE.MeshStandardMaterial({ map: woodTex(), roughness: 0.75 }), e.w / T, 0.38, 1.4, e.w / T / 2, -0.19, 0)); break;
    case 'crumble': { const m = new THREE.MeshStandardMaterial({ map: stoneTex(), roughness: 0.95 }); g.add(mesh(G.box, m, e.w / T, 0.38, 1.4, e.w / T / 2, -0.19, 0)); g.userData.mat = m; break; }
    case 'egg': g.add(outline(mesh(G.sphere, toon('#FFFDF5'), 0.34, 0.44, 0.34))); break;
    case 'power': {
      const def = POWERUPS[e.kind];
      const bub = new THREE.Mesh(G.sphere, new THREE.MeshStandardMaterial({ color: def.color, transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.3, emissive: new THREE.Color(def.color), emissiveIntensity: 0.3, depthWrite: false }));
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
    case 'crumble': g.position.set(X(e.x + (e.shk || 0)), Y(e.y), 0); ud.mat.color.set(e.trig > 0 || e.fall ? '#E0A080' : '#FFFFFF'); g.visible = !(e.back > 0); break;
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
      g.add(mesh(G.cyl, new THREE.MeshStandardMaterial({ map: barkTex(), roughness: 1 }), 0.26, h * 0.6, 0.26, 0, h * 0.3, 0));
      if (d.tree === 'pine') for (let i = 0; i < 4; i++) g.add(mesh(G.cone, toon(i % 2 ? '#2E6B2A' : '#3A7A33', { flat: true, rough: 0.9 }), 1.6 - i * 0.32, h * 0.38, 1.6 - i * 0.32, 0, h * (0.42 + i * 0.18), 0));
      else for (const [x, y, s, z] of [[-0.5, 0.68, 0.9, 0.1], [0.5, 0.66, 0.85, -0.1], [0, 0.9, 1.15, 0], [0.2, 0.78, 0.8, 0.45], [-0.25, 0.8, 0.75, -0.45]]) g.add(mesh(G.lowSphere, toon(world.grassDk, { flat: true, rough: 0.9 }), s * 1.35, s * 1.2, s * 1.25, x, h * y, z));
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
    case 'rock': g.add(mesh(new THREE.DodecahedronGeometry(0.4, 1), new THREE.MeshStandardMaterial({ map: stoneTex(), roughness: 0.95, flatShading: true }), 1.2, 0.7, 1, 0, 0.18, 0)); break;
    case 'mushdeco': for (const [x, s] of [[0, 1], [0.25, 0.7]]) { g.add(mesh(G.cyl, toon('#E8F7F2'), 0.07 * s, 0.3 * s, 0.07 * s, x, 0.15 * s, 0)); g.add(mesh(G.sphere, toon('#3CFFDC', { glow: '#3CFFDC', glowMax: 1.4 }), 0.3 * s, 0.16 * s, 0.3 * s, x, 0.3 * s, 0)); } break;
    case 'sign': {
      g.add(outline(mesh(G.cyl, toon('#8B4A1F'), 0.08, 1, 0.08, 0, 0.5, 0)));
      const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d');
      x.fillStyle = '#C8742A'; x.fillRect(0, 0, 256, 128); x.font = '64px "Lilita One",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#FFF'; x.strokeStyle = '#2B1A10'; x.lineWidth = 8; x.strokeText(d.text, 128, 68); x.fillText(d.text, 128, 68);
      const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
      g.add(outline(mesh(G.box, [toon('#C8742A'), toon('#C8742A'), toon('#C8742A'), toon('#C8742A'), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.8 }), toon('#C8742A')], 1.3, 0.65, 0.08, 0, 1.1, 0), 1.04));
      break;
    }
    default: return null;
  }
  g.position.set(X(d.x + 24), Y(d.y), d.type === 'sign' ? 0.2 : -0.75 - (d.v || 0) * 0.3);
  g.traverse((o) => { if (o.isMesh && o.material !== INK_MAT) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

// ---------------------------------------------------------------- procedural textures (realistic look)
function hash2(x, y, s) { const h = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return h - Math.floor(h); }
function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x, y, s, o = 4) => { let f = 0, a = 0.5, k = 1; for (let i = 0; i < o; i++) { f += vnoise(x * k, y * k, s + i) * a; k *= 2; a *= 0.5; } return f; };
const hexRgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const TEX = new Map();
function canvasTex(key, size, draw, repeat = true) {
  if (TEX.has(key)) return TEX.get(key);
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); draw(g, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  TEX.set(key, t); return t;
}
// per-pixel fbm colour field between two colours
function noiseFill(g, n, c1, c2, scale, seed, contrast = 1) {
  const img = g.createImageData(n, n), d = img.data, A = hexRgb(c1), B = hexRgb(c2);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    // tileable: blend 4 samples
    const fx = x / n, fy = y / n;
    const s = fbm(fx * scale, fy * scale, seed) * (1 - fx) * (1 - fy) + fbm((fx - 1) * scale, fy * scale, seed) * fx * (1 - fy) + fbm(fx * scale, (fy - 1) * scale, seed) * (1 - fx) * fy + fbm((fx - 1) * scale, (fy - 1) * scale, seed) * fx * fy;
    const k = Math.min(1, Math.max(0, (s - 0.5) * contrast + 0.5)), i = (y * n + x) * 4;
    d[i] = A[0] + (B[0] - A[0]) * k; d[i + 1] = A[1] + (B[1] - A[1]) * k; d[i + 2] = A[2] + (B[2] - A[2]) * k; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
}
const grassTex = (w) => canvasTex('grass' + w.grass, 256, (g, n) => {
  noiseFill(g, n, w.grassDk, w.grass, 6, 3, 1.6);
  const r = mulberry32(5);
  for (let i = 0; i < 2600; i++) { const x = r() * n, y = r() * n, l = 3 + r() * 6; g.strokeStyle = r() < 0.5 ? 'rgba(255,255,200,.18)' : 'rgba(0,40,0,.22)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 3, y - l); g.stroke(); }
});
const dirtTex = (w) => canvasTex('dirt' + w.dirt, 256, (g, n) => {
  noiseFill(g, n, w.dirtDk, w.dirt, 8, 11, 1.8);
  const r = mulberry32(9);
  for (let i = 0; i < 70; i++) {
    const x = r() * n, y = r() * n, rx = 3 + r() * 7, ry = rx * (0.5 + r() * 0.3);
    g.fillStyle = `rgba(${90 + r() * 60 | 0},${80 + r() * 50 | 0},${70 + r() * 40 | 0},.85)`; g.beginPath(); g.ellipse(x, y, rx, ry, r() * 3, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.ellipse(x - rx * 0.3, y - ry * 0.35, rx * 0.4, ry * 0.3, 0, 0, 7); g.fill();
  }
});
// side of a top block: dirt with a ragged grass fringe hanging over the upper edge
const sideTex = (w) => canvasTex('side' + w.grass + w.dirt, 256, (g, n) => {
  g.drawImage(dirtTex(w).image, 0, 0);
  const r = mulberry32(4); g.fillStyle = w.grassDk;
  g.beginPath(); g.moveTo(0, 0); g.lineTo(n, 0);
  for (let x = n; x >= 0; x -= 6) g.lineTo(x, 34 + r() * 26);
  g.closePath(); g.fill();
  g.fillStyle = w.grass; g.beginPath(); g.moveTo(0, 0); g.lineTo(n, 0); for (let x = n; x >= 0; x -= 5) g.lineTo(x, 18 + r() * 18); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,220,.25)'; g.fillRect(0, 0, n, 6);
});
const woodTex = () => canvasTex('wood', 256, (g, n) => {
  noiseFill(g, n, '#6B4223', '#A9743F', 3, 21, 1.4);
  const r = mulberry32(2);
  for (let y = 0; y < n; y += 2) { g.fillStyle = `rgba(60,30,10,${0.05 + r() * 0.08})`; g.fillRect(0, y + Math.sin(y * 0.05) * 2, n, 1); }
  g.fillStyle = 'rgba(40,20,5,.55)'; for (let y = 0; y < n; y += 64) g.fillRect(0, y, n, 3);
});
const barkTex = () => canvasTex('bark', 128, (g, n) => {
  noiseFill(g, n, '#3E2A1A', '#7A5434', 5, 31, 2);
  g.strokeStyle = 'rgba(20,10,5,.5)'; const r = mulberry32(8);
  for (let i = 0; i < 40; i++) { const x = r() * n; g.lineWidth = 1 + r() * 2; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 6, n * 0.3, x - 6, n * 0.6, x + 2, n); g.stroke(); }
});
const stoneTex = () => canvasTex('stone', 128, (g, n) => { noiseFill(g, n, '#6E6A78', '#B9B4C4', 7, 41, 1.8); });
const cloudTex = () => canvasTex('cloud', 128, (g, n) => {
  const gr = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, n, n);
}, false);

// noise-displaced landform with vertex colours (hills / snowy mountains)
function landform(seed, kind) {
  const geo = new THREE.IcosahedronGeometry(1, kind === 'mount' ? 5 : 4), p = geo.attributes.position, col = [], v = new THREE.Vector3();
  const rock = new THREE.Color('#6F6A66'), rock2 = new THREE.Color('#8E877F'), snow = new THREE.Color('#F4F7FB'), g1 = new THREE.Color('#3D7A28'), g2 = new THREE.Color('#6A9F3A'), tmp = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = fbm(v.x * 2.2 + seed, v.z * 2.2 + v.y * 1.3, seed, 5);
    const amp = kind === 'mount' ? 0.35 : 0.12, s = 1 + (n - 0.5) * amp * 2;
    v.multiplyScalar(s);
    if (kind === 'mount') v.y *= 1 + Math.max(0, v.y) * 0.6; // sharpen the peak
    p.setXYZ(i, v.x, v.y, v.z);
    if (kind === 'mount') {
      const h = v.y + (n - 0.5) * 0.25;
      tmp.copy(rock).lerp(rock2, fbm(v.x * 6, v.y * 6, seed + 3)); if (h > 0.55) tmp.lerp(snow, Math.min(1, (h - 0.55) * 6));
    } else tmp.copy(g1).lerp(g2, fbm(v.x * 5, v.z * 5, seed + 7, 3));
    col.push(tmp.r, tmp.g, tmp.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  return geo;
}

// ---------------------------------------------------------------- photo assets (CC0, Poly Haven; baked by scripts in repo docs)
const ASSET = (p) => new URL(`../assets3d/${p}`, import.meta.url).href;
const LOADER = new THREE.TextureLoader();
const PHOTO = new Map();
function photo(path, { srgb = true, repeat = true, key = path } = {}) {
  if (PHOTO.has(key)) return PHOTO.get(key);
  const t = LOADER.load(ASSET(path)); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  PHOTO.set(key, t); return t;
}
// sprite metadata: real-world size (m) of each baked impostor
const SPR = {
  island_tree_02_0: [4.21, 3.41], island_tree_02_1: [4.18, 3.41], tree_small_02_0: [2.92, 4.56], tree_small_02_1: [5.18, 4.56],
  fir_sapling_0: [2.74, 1.30], fir_sapling_1: [1.68, 1.30], shrub_02_0: [6.57, 2.55], shrub_02_1: [2.60, 2.55], shrub_01_0: [2.59, 0.40],
  fern_02_0: [1.97, 0.43], fern_02_1: [2.09, 0.43], grass_medium_01_0: [5.61, 0.34], grass_medium_01_1: [2.70, 0.34],
  rock_moss_set_01_0: [8.0, 1.77], boulder_01_0: [1.27, 1.0], dandelion_01_0: [4.21, 0.17],
};
const M2U = 1 / 1.15; // metres -> world units (hero ~1.4 units ≈ 1.6 m)
const SPR_MATS = new Map();
function sprMat(name) {
  if (SPR_MATS.has(name)) return SPR_MATS.get(name);
  const m = new THREE.MeshBasicMaterial({ map: photo(`sprites/${name}.webp`, { repeat: false }), alphaTest: 0.42, side: THREE.DoubleSide, fog: true });
  SPR_MATS.set(name, m); return m;
}
const PLANE = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0); // anchored at bottom centre
// a photo impostor standing on (x, y) at depth z; scale multiplies the real size
function sprite(name, x, y, z, scale = 1, flip = false) {
  const [w, h] = SPR[name], m = new THREE.Mesh(PLANE, sprMat(name));
  m.scale.set(w * M2U * scale * (flip ? -1 : 1), h * M2U * scale, 1); m.position.set(x, y, z);
  return m;
}

// decor -> photo vegetation (replaces the old primitive trees/bushes)
function buildDecorReal(d, world) {
  const g = new THREE.Group(), r = mulberry32(Math.floor(d.x * 13 + (d.v || 0) * 9973)), flip = r() < 0.5;
  switch (d.type) {
    case 'tree': {
      const pick = d.tree === 'pine' ? ['tree_small_02_0', 'tree_small_02_1'] : ['island_tree_02_0', 'island_tree_02_1', 'tree_small_02_0'];
      g.add(sprite(pick[(r() * pick.length) | 0], 0, 0, 0, 0.9 + (d.v || 0) * 0.5, flip));
      g.add(sprite('fern_02_0', 0.3, 0, 0.3, 1.1, flip));
      break;
    }
    case 'bush': g.add(sprite(r() < 0.5 ? 'shrub_02_1' : 'fir_sapling_1', 0, 0, 0, 0.8 + r() * 0.3, flip)); break;
    case 'flowers': g.add(sprite('dandelion_01_0', 0, 0, 0.2, 0.5, flip)); g.add(sprite('fern_02_1', 0.2, 0, 0, 0.9, flip)); break;
    case 'rock': g.add(sprite(r() < 0.6 ? 'boulder_01_0' : 'rock_moss_set_01_0', 0, -0.05, 0, r() < 0.6 ? 0.7 : 0.18, flip)); break;
    case 'fence': {
      const w = new THREE.MeshStandardMaterial({ map: photo('tex/brown_planks_05_diff.jpg'), roughness: 0.85 });
      for (const x of [-0.5, 0, 0.5]) g.add(mesh(G.box, w, 0.1, 0.6, 0.1, x, 0.3, 0));
      for (const y of [0.22, 0.45]) g.add(mesh(G.box, w, 1.15, 0.08, 0.06, 0, y, 0));
      break;
    }
    default: return buildDecor(d, world); // mushdeco + sign keep their 3D versions
  }
  g.position.set(X(d.x + 24), Y(d.y), -0.55 - (d.v || 0) * 0.5);
  g.traverse((o) => { if (o.isMesh && !o.material.alphaTest) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

// ---------------------------------------------------------------- sky dome: blend of three real sky panoramas
const SKY_VS = `varying vec3 vDir; void main(){ vDir = (modelMatrix * vec4(position,1.0)).xyz - cameraPosition; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position,1.0); gl_Position.z = gl_Position.w; }`;
const SKY_FS = `
uniform sampler2D tDay; uniform sampler2D tSet; uniform sampler2D tNight; uniform float wSet; uniform float wNight; uniform float spin; uniform float bright; varying vec3 vDir;
void main(){
  vec3 d = normalize(vDir);
  vec2 uv = vec2(atan(d.z, d.x) / 6.2831853 + 0.5 + spin, asin(clamp(d.y, -1.0, 1.0)) / 3.1415927 + 0.5);
  vec3 c = texture2D(tDay, uv).rgb;
  c = mix(c, texture2D(tSet, uv).rgb, wSet);
  c = mix(c, texture2D(tNight, uv).rgb, wNight);
  gl_FragColor = vec4(c * bright, 1.0);
}`;

// ---------------------------------------------------------------- renderer
export class Renderer3D {
  constructor(canvas) {
    this.canvas = canvas;
    this.r = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.r.outputColorSpace = THREE.SRGBColorSpace;
    this.r.toneMapping = THREE.ACESFilmicToneMapping; this.r.toneMappingExposure = 1.0;
    this.r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(FOV, 16 / 9, 0.5, 900);
    this.quality = 'hd';
    this.scene.fog = new THREE.FogExp2(0xC8D8E8, 0.006);

    const sky = (n) => { const t = photo(`sky/${n}.jpg`, { repeat: false }); t.wrapS = THREE.RepeatWrapping; return t; };
    this.skyU = { tDay: { value: sky('day') }, tSet: { value: sky('sunset') }, tNight: { value: sky('night') }, wSet: { value: 0 }, wNight: { value: 0 }, spin: { value: 0 }, bright: { value: 1 } };
    const skyMat = new THREE.ShaderMaterial({ uniforms: this.skyU, vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false, fog: false });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(600, 48, 24), skyMat); this.sky.renderOrder = -10; this.scene.add(this.sky);
    this.pmrem = new THREE.PMREMGenerator(this.r);
    this.envScene = new THREE.Scene(); this.envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 48, 24), skyMat));
    this.envT = -99; this.envRT = null;

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x3d4a2c, 0.25); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 3);
    const sc = this.sun.shadow.camera; sc.left = -26; sc.right = 26; sc.top = 16; sc.bottom = -16; sc.near = 1; sc.far = 100;
    this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.03; this.sun.shadow.radius = 4;
    this.scene.add(this.sun, this.sun.target);
    this.lantern = new THREE.PointLight(0xFFB06A, 0, 8, 2); this.scene.add(this.lantern);

    this.world = new THREE.Group(); this.scene.add(this.world);
    this.bg = new THREE.Group(); this.scene.add(this.bg);
    this.buildBackdrop();
    this.level = null; this.chunks = new Map(); this.ents = new Map(); this.decor = null; this.hero = null; this.heroSkin = null;
    this.lastClean = 0; this.composer = null;
  }

  setQuality(q) {
    this.quality = q;
    const hd = q === 'hd';
    this.r.shadowMap.enabled = true; this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(hd ? 2048 : 1024, hd ? 2048 : 1024); this.sun.shadow.map?.dispose(); this.sun.shadow.map = null;
    this.r.setPixelRatio(hd ? Math.min(2, window.devicePixelRatio || 1) : Math.min(1, window.devicePixelRatio || 1));
    for (const c of this.chunks.values()) this.disposeChunk(c);
    this.chunks.clear();
    this.post = hd;
    if (hd && !this.composerPromise) this.composerPromise = this.initPost();
  }

  // bloom + vignette (HD only); loaded lazily so Lite never pays for it
  async initPost() {
    try {
      const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }, { ShaderPass }] = await Promise.all([
        import('../vendor/jsm/postprocessing/EffectComposer.js'), import('../vendor/jsm/postprocessing/RenderPass.js'),
        import('../vendor/jsm/postprocessing/UnrealBloomPass.js'), import('../vendor/jsm/postprocessing/OutputPass.js'),
        import('../vendor/jsm/postprocessing/ShaderPass.js')]);
      const size = this.r.getSize(new THREE.Vector2());
      const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
      const c = new EffectComposer(this.r, rt);
      c.addPass(new RenderPass(this.scene, this.cam));
      this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.28, 0.55, 0.9); c.addPass(this.bloom);
      c.addPass(new OutputPass());
      c.addPass(new ShaderPass({
        uniforms: { tDiffuse: { value: null }, amt: { value: 0.32 } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: 'uniform sampler2D tDiffuse; uniform float amt; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); vec2 p = vUv - 0.5; float v = 1.0 - amt * smoothstep(0.25, 0.85, dot(p, p) * 2.2); gl_FragColor = vec4(c.rgb * v, c.a); }',
      }));
      this.composer = c; this.resizePost();
    } catch (err) { console.warn('post-processing unavailable', err); }
  }
  resizePost() { if (!this.composer) return; const s = this.r.getSize(new THREE.Vector2()); this.composer.setPixelRatio(this.r.getPixelRatio()); this.composer.setSize(s.x, s.y); }

  resize(w, h) { this.r.setSize(w, h, false); this.cam.aspect = w / h; this.cam.updateProjectionMatrix(); this.resizePost(); }

  buildBackdrop() {
    geos();
    const rng = mulberry32(99);
    // far mountains + mid hills (noise landforms) – heavily hazed by fog for aerial perspective
    const landMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
    this.mounts = []; this.hills = [];
    for (let i = 0; i < 0; i++) { // snowy low-poly peaks removed: the real sky panorama already has a horizon
      const m = new THREE.Mesh(landform(i * 3.1 + 1, 'mount'), landMat); m.scale.set(38 + rng() * 22, 16 + rng() * 14, 26);
      m.userData = { base: i * 38 + rng() * 10, y: -22, z: -190 - rng() * 50, span: 342 }; this.mounts.push(m); this.bg.add(m);
    }
    const hillMat = new THREE.MeshStandardMaterial({ map: photo('tex/leafy_grass_diff.jpg', { key: 'hill' }), color: 0x9fb48a, roughness: 1 });
    hillMat.map.repeat.set(10, 6); hillMat.color.set('#86ad62'); hillMat.map.needsUpdate = true;
    for (let i = 0; i < 12; i++) {
      const h = new THREE.Mesh(landform(i * 7.7 + 2, 'hill'), hillMat); h.scale.set(24 + rng() * 14, 7 + rng() * 5, 14);
      h.receiveShadow = true; h.userData = { base: i * 19, y: -16, z: -70 - rng() * 20, span: 228 }; this.hills.push(h); this.bg.add(h);
    }
    // forest backdrop: photo trees in two depth bands (wrap around the camera)
    this.forest = [];
    const trees = ['island_tree_02_0', 'island_tree_02_1', 'tree_small_02_0', 'tree_small_02_1', 'fir_sapling_0', 'shrub_02_0'];
    for (let i = 0; i < 64; i++) {
      const name = trees[(rng() * trees.length) | 0], far = i % 2 === 1;
      const s = (name.startsWith('fir') || name.startsWith('shrub') ? 1.6 : 1.0) * (far ? 1.6 + rng() * 0.6 : 1.05 + rng() * 0.45);
      const m = sprite(name, 0, -15.3, 0, s, rng() < 0.5);
      m.userData = { base: i * (far ? 5.2 : 3.4) + rng() * 2, span: 64 * (far ? 5.2 : 3.4) / 2 * 1, z: far ? -40 - rng() * 14 : -16 - rng() * 12 };
      m.userData.span = (far ? 5.2 : 3.4) * 32;
      this.forest.push(m); this.bg.add(m);
    }
    // undergrowth line just behind the level
    for (let i = 0; i < 40; i++) {
      const m = sprite(rng() < 0.5 ? 'shrub_02_0' : 'fir_sapling_0', 0, -15.3, 0, 1.1 + rng() * 0.5, rng() < 0.5);
      m.userData = { base: i * 4.4 + rng() * 2, span: 40 * 4.4, z: -9 - rng() * 5 }; this.forest.push(m); this.bg.add(m);
    }
    // valley floor
    const fm = new THREE.MeshStandardMaterial({ map: photo('tex/leafy_grass_diff.jpg', { key: 'floor' }), normalMap: photo('tex/leafy_grass_nor.jpg', { srgb: false, key: 'floorN' }), color: 0xb8c8a0, roughness: 1 });
    fm.map.repeat.set(140, 50); fm.normalMap.repeat.set(140, 50); fm.map.needsUpdate = fm.normalMap.needsUpdate = true;
    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(800, 280), fm); this.floor.rotation.x = -Math.PI / 2; this.floor.position.set(0, -15.3, -136); this.floor.receiveShadow = true;
    this.bg.add(this.floor);
  }

  // ---- level / chunks
  setLevel(level) {
    for (const c of this.chunks.values()) this.disposeChunk(c);
    this.chunks.clear();
    for (const m of this.ents.values()) if (m) this.world.remove(m); this.ents.clear();
    if (this.decor) this.world.remove(this.decor);
    this.decor = new THREE.Group(); this.world.add(this.decor); this.decorDone = 0;
    this.level = level; this.dirty = new Set();
    const w = level.world;
    const S = A.makeTileSprites(w, 128), tex = (cv) => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
    const pm = (name, o = {}) => new THREE.MeshStandardMaterial({ map: photo(`tex/${name}_diff.jpg`), normalMap: photo(`tex/${name}_nor.jpg`, { srgb: false }), roughness: 0.95, ...o });
    // world tint keeps each world's personality (meadow, forest, rocky, twilight, sunset)
    const grassTint = new THREE.Color(w.grass).lerp(new THREE.Color('#ffffff'), 0.35);
    const soilTint = new THREE.Color(w.dirt).lerp(new THREE.Color('#ffffff'), 0.6);
    this.tm = {
      grass: pm('leafy_grass', { color: grassTint }),
      soil: pm('excavated_soil_wall', { color: soilTint }),
      plat: pm('brown_planks_05', { roughness: 0.8 }),
      box: new THREE.MeshStandardMaterial({ map: tex(S.box), roughness: 0.45, metalness: 0.1, emissive: new THREE.Color('#FFB020'), emissiveIntensity: 0 }),
      used: new THREE.MeshStandardMaterial({ map: tex(S.used), roughness: 0.8 }),
      crate: pm('brown_planks_05', { color: 0xd9b48a, roughness: 0.85 }),
    };
    this.floor.material.color.copy(grassTint).lerp(new THREE.Color('#8fbf5a'), 0.5);
    const orig = level.set.bind(level);
    level.set = (c, r, v) => { orig(c, r, v); this.dirty.add(Math.floor(c / CH)); };
  }

  disposeChunk(c) { this.world.remove(c.group); c.group.traverse((o) => { if (o.isMesh && o.userData.own) o.geometry.dispose(); if (o.isInstancedMesh) o.dispose(); }); }

  // Terrain mesher: only exposed faces, world-space UVs so the photo textures flow across tiles without seams.
  buildChunk(k) {
    const lv = this.level, c0 = k * CH, c1 = Math.min(lv.cols.length, c0 + CH), D = GROUND_D / 2, TS = 0.5; // TS = texture repeats per unit
    const isG = (c, r) => lv.tile(c, r) === TILE.GROUND;
    const gq = { p: [], n: [], u: [], i: [] }, sq = { p: [], n: [], u: [], i: [] };
    const quad = (q, a, b, c, d, nrm, uv) => { const s = q.p.length / 3; q.p.push(...a, ...b, ...c, ...d); for (let j = 0; j < 4; j++) q.n.push(...nrm); q.u.push(...uv); q.i.push(s, s + 1, s + 2, s, s + 2, s + 3); };
    const others = { plat: [], box: [], used: [], crate: [] }, tops = [];
    for (let c = c0; c < c1; c++) {
      const col = lv.cols[c];
      for (let r = 0; r < ROWS; r++) {
        const t = col[r]; if (!t) continue;
        if (t !== TILE.GROUND) { const key = t === TILE.PLAT ? 'plat' : t === TILE.BOX ? 'box' : t === TILE.USED ? 'used' : 'crate'; others[key].push([c, r]); continue; }
        const x0 = c, x1 = c + 1, y0 = -(r + 1), y1 = -r;
        const top = r === 0 || !isG(c, r - 1);
        // front face (soil; the grass lip covers the upper edge)
        quad(sq, [x0, y0, D], [x1, y0, D], [x1, y1, D], [x0, y1, D], [0, 0, 1], [x0 * TS, y0 * TS, x1 * TS, y0 * TS, x1 * TS, y1 * TS, x0 * TS, y1 * TS]);
        if (top) { quad(gq, [x0, y1, D], [x1, y1, D], [x1, y1, -D], [x0, y1, -D], [0, 1, 0], [x0 * TS, D * TS, x1 * TS, D * TS, x1 * TS, -D * TS, x0 * TS, -D * TS]); tops.push([c, r]); }
        if (!isG(c - 1, r) && c > 0) quad(sq, [x0, y0, -D], [x0, y0, D], [x0, y1, D], [x0, y1, -D], [-1, 0, 0], [-D * TS, y0 * TS, D * TS, y0 * TS, D * TS, y1 * TS, -D * TS, y1 * TS]);
        if (!isG(c + 1, r)) quad(sq, [x1, y0, D], [x1, y0, -D], [x1, y1, -D], [x1, y1, D], [1, 0, 0], [D * TS, y0 * TS, -D * TS, y0 * TS, -D * TS, y1 * TS, D * TS, y1 * TS]);
      }
    }
    const group = new THREE.Group();
    const mk = (q, mat) => {
      if (!q.i.length) return;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(q.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(q.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(q.u, 2)); g.setIndex(q.i);
      const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; m.userData.own = true; group.add(m);
    };
    mk(sq, this.tm.soil); mk(gq, this.tm.grass);
    // grass lip overhanging the front edge of every top tile
    if (tops.length) {
      const lip = new THREE.InstancedMesh(G.box, this.tm.grass, tops.length), mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1.02, 0.16, GROUND_D + 0.14), p = new THREE.Vector3();
      tops.forEach(([c, r], i) => lip.setMatrixAt(i, mtx.compose(p.set(c + 0.5, -r - 0.06, 0), q, s)));
      lip.receiveShadow = true; lip.castShadow = true; group.add(lip);
    }
    // boxes / crates / one-way planks
    const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    for (const [kind, arr] of Object.entries(others)) {
      if (!arr.length) continue;
      const im = new THREE.InstancedMesh(G.box, this.tm[kind], arr.length);
      arr.forEach(([c, r], i) => {
        if (kind === 'plat') { s.set(1.02, 0.28, 1.5); p.set(c + 0.5, -(r + 0.14), 0); } else { s.set(0.98, 0.98, 0.98); p.set(c + 0.5, -(r + 0.5), 0); }
        im.setMatrixAt(i, mtx.compose(p, q, s));
      });
      im.castShadow = true; im.receiveShadow = true; group.add(im);
    }
    // photo grass & ferns along the front and back edges of the tops
    const rr = mulberry32(k * 977 + 1), dense = this.quality === 'hd';
    for (const [c, r] of tops) {
      const n = dense ? 2 : 1;
      for (let j = 0; j < n; j++) group.add(sprite(rr() < 0.5 ? 'grass_medium_01_1' : 'grass_medium_01_0', c + rr(), -r, D + 0.02 - rr() * 0.12, 1.1 + rr() * 0.7, rr() < 0.5));
      if (dense) group.add(sprite(rr() < 0.5 ? 'grass_medium_01_0' : 'fern_02_0', c + rr(), -r, -D + 0.2 + rr() * 0.4, 1.2 + rr() * 0.8, rr() < 0.5));
      if (rr() < 0.15) group.add(sprite('dandelion_01_0', c + rr(), -r, D - 0.25, 0.45, rr() < 0.5));
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
      if (have) this.disposeChunk(have);
      this.dirty.delete(k);
      this.chunks.set(k, this.buildChunk(k));
    }
    for (const [k, c] of this.chunks) if (k < k0 - 2 || k > k1 + 2) { this.disposeChunk(c); this.chunks.delete(k); }
    const D = lv.decor;
    for (; this.decorDone < D.length; this.decorDone++) { const g = buildDecorReal(D[this.decorDone], lv.world); if (g) { g.userData.x = D[this.decorDone].x; this.decor.add(g); } }
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
    const st = game.sky || { night: 0, warm: 0, p: 0.5, haze: [168, 216, 240] };
    const n = st.night, t = game.clock, day = 1 - n, warm = st.warm || 0;
    const camX3 = X(game.camX), vw3 = vw / T, cx = camX3 + vw3 / 2, cy = -ROWS / 2;
    const sh = game.shake ? (Math.random() - 0.5) * game.shake / T : 0, sv = game.shake ? (Math.random() - 0.5) * game.shake / T : 0;
    // Camera raised (sees block tops) with an off-axis frustum so the z=0 gameplay plane keeps the exact 2D framing.
    const UP = 2.6;
    this.cam.position.set(cx + sh, cy + sv + UP, DIST); this.cam.lookAt(cx + sh, cy + sv + UP, 0);
    this.cam.aspect = cw / ch; this.cam.updateProjectionMatrix();
    const P = this.cam.projectionMatrix.elements; P[9] = -P[5] * UP / DIST;
    this.cam.projectionMatrixInverse.copy(this.cam.projectionMatrix).invert();

    // sky: day -> golden hour -> night panoramas
    const wNight = Math.min(1, n * 1.15), wSet = Math.min(1, warm * 1.3) * (1 - wNight * 0.7);
    this.skyU.wNight.value = wNight; this.skyU.wSet.value = wSet; this.skyU.spin.value = cx * 0.0004 + 0.12;
    this.skyU.bright.value = 0.95 - wNight * 0.45;
    this.sky.position.copy(this.cam.position);
    const fogDay = new THREE.Color(0xC4D4E4), fogSet = new THREE.Color(0xD9B48E), fogNight = new THREE.Color(0x232838);
    this.scene.fog.color.copy(fogDay).lerp(fogSet, wSet).lerp(fogNight, wNight);
    this.scene.fog.density = 0.0055 + wNight * 0.004;
    if (t - this.envT > (this.quality === 'hd' ? 1.5 : 4) || !this.envRT) {
      this.envT = t; const old = this.envRT;
      this.envRT = this.pmrem.fromScene(this.envScene, 0.03); this.scene.environment = this.envRT.texture; old?.dispose();
    }
    this.r.toneMappingExposure = 0.95 + day * 0.15;

    // sun / moon key light
    const sa = ((st.p - 0.25) / 0.5) * Math.PI;
    const useMoon = n > 0.5;
    const elev = useMoon ? 0.55 : Math.max(0.12, Math.sin(sa));
    const side = useMoon ? -0.6 : -Math.cos(sa);
    this.sun.position.set(cx + side * 34, cy + elev * 40, 22); this.sun.target.position.set(cx, cy, 0);
    this.sun.intensity = useMoon ? 0.45 : 0.8 + 2.6 * day * Math.min(1, Math.sin(Math.max(0, sa)) * 2);
    this.sun.color.setRGB(1, 0.95, 0.86).lerp(new THREE.Color(1, 0.58, 0.32), Math.min(1, warm));
    if (useMoon) this.sun.color.setRGB(0.6, 0.7, 1);
    this.hemi.intensity = 0.12 + day * 0.25;
    const pl = game.player;
    this.lantern.position.set(X(pl.x + pl.w / 2), Y(pl.y + pl.h / 2) + 0.7, 1.4); this.lantern.intensity = n * 7;
    MATS.forEach((m) => { if (m.userData.glow) m.emissiveIntensity = m.userData.glow * (0.1 + n); });
    if (this.tm) this.tm.box.emissiveIntensity = 0.1 + 0.8 * n;
    // photo sprites are pre-lit: tint them with the current light
    const tint = new THREE.Color(1, 1, 1).lerp(new THREE.Color(1, 0.8, 0.62), Math.min(1, warm) * 0.8).lerp(new THREE.Color(0.2, 0.24, 0.36), wNight);
    SPR_MATS.forEach((m) => m.color.copy(tint));
    if (this.bloom) this.bloom.strength = 0.22 + n * 0.25;

    // parallax pools (wrap around the camera)
    const wrap = (u) => { const rel = ((u.base - cx) % u.span + u.span) % u.span - u.span / 2; return cx + rel; };
    for (const h of this.hills) h.position.set(wrap(h.userData), h.userData.y, h.userData.z);
    for (const m of this.mounts) m.position.set(wrap(m.userData), m.userData.y, m.userData.z);
    for (const f of this.forest) { f.position.x = wrap(f.userData); f.position.z = f.userData.z; }
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

    if (this.post && this.composer) this.composer.render(); else this.r.render(this.scene, this.cam);
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
