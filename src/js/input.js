// Unified input: keyboard + mouse + multi-touch on-screen buttons + gamepad.
const held = { left: false, right: false, jump: false };
const sources = { key: { left: false, right: false, jump: false }, pad: { left: false, right: false, jump: false }, touch: { left: false, right: false, jump: false }, tap: { jump: false } };
let jumpPressedEdge = false, jumpReleasedEdge = false, prevJump = false;
const listeners = { pause: [], confirm: [] };
let btns = [];
const pointers = new Map(); // pointerId -> button key or 'tap'

const KEYS = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  Space: 'jump', ArrowUp: 'jump', KeyW: 'jump', KeyZ: 'jump', KeyK: 'jump',
};

export function initInput(controlsEl, playfieldEl) {
  addEventListener('keydown', (e) => {
    if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    const k = KEYS[e.code];
    if (k) { sources.key[k] = true; e.preventDefault(); }
    if (!e.repeat && (e.code === 'Escape' || e.code === 'KeyP')) listeners.pause.forEach((f) => f());
    if (!e.repeat && e.code === 'Enter') listeners.confirm.forEach((f) => f());
  });
  addEventListener('keyup', (e) => { const k = KEYS[e.code]; if (k) sources.key[k] = false; });
  addEventListener('blur', () => { for (const s of Object.values(sources)) for (const k in s) s[k] = false; pointers.clear(); });

  btns = [...controlsEl.querySelectorAll('[data-key]')];
  const hit = (x, y) => {
    for (const b of btns) {
      const r = b.getBoundingClientRect();
      const pad = 14; // forgiving hit area
      if (x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad) return b.dataset.key;
    }
    return null;
  };
  const refreshTouch = () => {
    const t = sources.touch; t.left = t.right = t.jump = false; sources.tap.jump = false;
    for (const k of pointers.values()) { if (k === 'tap') sources.tap.jump = true; else if (k in t) t[k] = true; }
    for (const b of btns) b.classList.toggle('is-down', [...pointers.values()].includes(b.dataset.key));
  };
  // Buttons layer: slide finger between left/right works because we hit-test on every move.
  controlsEl.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const k = hit(e.clientX, e.clientY) || 'tap'; // empty area of the control layer = jump tap
    if (k === 'pause') { listeners.pause.forEach((f) => f()); return; }
    pointers.set(e.pointerId, k);
    try { controlsEl.setPointerCapture(e.pointerId); } catch (_) {}
    refreshTouch();
  });
  controlsEl.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId) || pointers.get(e.pointerId) === 'tap') return;
    const k = hit(e.clientX, e.clientY);
    if (k && k !== 'pause' && k !== pointers.get(e.pointerId)) { pointers.set(e.pointerId, k); refreshTouch(); }
  });
  const up = (e) => { if (pointers.delete(e.pointerId)) refreshTouch(); };
  controlsEl.addEventListener('pointerup', up);
  controlsEl.addEventListener('pointercancel', up);
  // Click / tap anywhere on the playfield = jump (mouse-only play).
  playfieldEl.addEventListener('pointerdown', (e) => {
    if (e.button !== undefined && e.button > 0) return;
    pointers.set(e.pointerId, 'tap'); refreshTouch();
  });
  playfieldEl.addEventListener('pointerup', up);
  playfieldEl.addEventListener('pointercancel', up);
  playfieldEl.addEventListener('pointerleave', up);
  playfieldEl.addEventListener('contextmenu', (e) => e.preventDefault());
}

function pollPad() {
  const p = sources.pad; p.left = p.right = p.jump = false;
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const g of pads) {
    if (!g) continue;
    const ax = g.axes[0] || 0;
    p.left ||= ax < -0.4 || !!g.buttons[14]?.pressed;
    p.right ||= ax > 0.4 || !!g.buttons[15]?.pressed;
    p.jump ||= !!(g.buttons[0]?.pressed || g.buttons[1]?.pressed || g.buttons[12]?.pressed);
    if (g.buttons[9]?.pressed && !pollPad.startDown) listeners.pause.forEach((f) => f());
    pollPad.startDown = !!g.buttons[9]?.pressed;
  }
}

export function updateInput() {
  pollPad();
  held.left = sources.key.left || sources.pad.left || sources.touch.left;
  held.right = sources.key.right || sources.pad.right || sources.touch.right;
  held.jump = sources.key.jump || sources.pad.jump || sources.touch.jump || sources.tap.jump;
  jumpPressedEdge = held.jump && !prevJump;
  jumpReleasedEdge = !held.jump && prevJump;
  prevJump = held.jump;
}

export const input = {
  get left() { return held.left; },
  get right() { return held.right; },
  get jump() { return held.jump; },
  get jumpPressed() { return jumpPressedEdge; },
  get jumpReleased() { return jumpReleasedEdge; },
  onPause(f) { listeners.pause.push(f); },
  onConfirm(f) { listeners.confirm.push(f); },
  clear() { for (const s of Object.values(sources)) for (const k in s) s[k] = false; pointers.clear(); prevJump = false; btns.forEach((b) => b.classList.remove('is-down')); },
};
