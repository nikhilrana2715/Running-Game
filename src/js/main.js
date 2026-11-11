// App controller: screens, HUD, store, settings, trophies, main loop, platform glue (web / extension / Android).
import { GAME, LEVEL_COUNT, SKINS, UPGRADES, WORLDS, POWERUPS, worldFor } from './config.js';
import { Game } from './game.js';
import { Save } from './save.js';
import { initInput, updateInput, input } from './input.js';
import { sfx, unlockAudio, startMusic, applyVolumes, suspendAll } from './audio.js';
import { heroThumb } from './art.js';
import { t, applyI18n } from './i18n.js';
import { fmtNum, fmtTime } from './util.js';
import { DAILY_REWARDS, ensureDay, missionProgress, rewardState, claimReward, claimMission, hasClaimable } from './daily.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const html = document.documentElement;
const params = new URLSearchParams(location.search);
const IS_POPUP = params.get('mode') === 'popup';
const IS_EXT = location.protocol === 'chrome-extension:';
const CAP = window.Capacitor;
const IS_NATIVE = !!(CAP && CAP.isNativePlatform && CAP.isNativePlatform());
if (IS_POPUP) html.classList.add('popup');

const canvas = $('#stage'), ctx = canvas.getContext('2d', { alpha: false });
let game = null, demo = null, screen = 'loading', backTo = 'menu', paused = false, levelPage = 0;
let lastRun = { mode: 'level', level: 1 }, lastN = -1, lastHud = {};

// ---------------- canvas sizing ----------------
function resize() {
  const dpr = Math.min(IS_POPUP ? 1.5 : 2, window.devicePixelRatio || 1);
  const w = IS_POPUP ? 780 : innerWidth, h = IS_POPUP ? 440 : innerHeight;
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  const coarse = matchMedia('(pointer: coarse)').matches;
  $('#rotate').hidden = !(coarse && innerHeight > innerWidth && !IS_POPUP);
}
addEventListener('resize', resize);

// ---------------- screens ----------------
function show(name) {
  if (name === 'back') name = backTo;
  if (['store', 'settings', 'trophy'].includes(name) && ['menu', 'levels'].includes(screen)) backTo = screen;
  screen = name;
  $$('.screen').forEach((s) => s.classList.toggle('is-active', s.id === 'scr-' + name));
  const playing = name === 'play';
  $('#hud').hidden = !playing; $('#playfield').hidden = !playing;
  applyControls();
  if (name === 'menu' || name === 'levels' || name === 'store') updateWallets();
  if (name === 'menu') { $('#daily-dot').hidden = !hasClaimable(); if (!dailyAuto && !rewardState().claimedToday && !IS_POPUP) dailyAuto = true, setTimeout(() => { if (screen === 'menu' && !modalOpen()) openDaily(); }, 500); }
  if (name === 'levels') renderLevels();
  if (name === 'store') renderStore();
  if (name === 'settings') renderSettings();
  if (name === 'trophy') renderTrophy();
  if (!playing) { bankLive(); game = null; closeModals(); }
}

function closeModals() { $$('.modal').forEach((m) => (m.hidden = true)); paused = false; }
function openModal(id) { $$('.modal').forEach((m) => (m.hidden = m.id !== id)); }
const modalOpen = () => $$('.modal').some((m) => !m.hidden);

function updateWallets() { $$('.js-coins').forEach((el) => (el.textContent = fmtNum(Save.data.player.coins))); }

let toastTimer = 0, dailyAuto = false;
function toast(msg) {
  const el = $('#toast'); el.textContent = msg; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 1600);
}

function applyControls() {
  const s = Save.data.settings, el = $('#controls');
  const touch = matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 0 && !matchMedia('(pointer: fine)').matches);
  const vis = s.controls === 'always' || (s.controls === 'auto' && touch);
  el.hidden = !(screen === 'play' && vis);
  el.classList.toggle('desktop', !touch);
  html.style.setProperty('--ctl-size', `${Math.round((IS_POPUP ? 60 : Math.min(96, Math.max(64, innerHeight * 0.17))) * s.controlSize)}px`);
}

// ---------------- gameplay ----------------
const hooks = {
  onHud: renderHud,
  onComplete: (r) => {
    Save.recordLevel(r.level, { stars: r.rating, score: r.score, time: r.time });
    bankCoins(r);
    Save.data.stats.playTimeSec += Math.round(r.time); Save.persist();
    showComplete(r);
  },
  onGameOver: (r) => {
    bankCoins(r);
    Save.data.stats.playTimeSec += Math.round(r.time);
    if (r.mode === 'endless') { const e = Save.data.endless; e.bestDistance = Math.max(e.bestDistance, r.distance); e.bestScore = Math.max(e.bestScore, r.score); }
    Save.persist(); showOver(r);
  },
  onPhase: (night) => toast(night ? t('nightFalls') : t('dayBreaks')),
  onToast: (m) => toast(m === 'Checkpoint!' ? t('checkpoint') : m),
};
// Bank coins picked up so far in the current run (quit / retry / app closed) - coins are never lost.
function bankLive() { if (game) bankCoins({ coins: game.coins }); }
addEventListener('pagehide', bankLive);
document.addEventListener('visibilitychange', () => { if (document.hidden) bankLive(); });
function bankCoins(r) { const g = game; const n = r.coins - (g?.banked || 0); if (n > 0) Save.addCoins(n); if (g) g.banked = r.coins; }

function start(mode, level = 1) {
  lastRun = { mode, level };
  bankLive();
  game = new Game({ mode, levelIndex: level, hooks });
  game.banked = 0;
  Save.data.stats.runs++; Save.persist();
  lastHud = {}; input.clear(); closeModals();
  show('play');
  const av = $('#hud-avatar'), th = heroThumb(game.skin, 64);
  av.width = th.width; av.height = th.height; av.getContext('2d').drawImage(th, 0, 0);
  $('#hud-stars-pill').hidden = mode !== 'level';
  $('#hud-dist-pill').hidden = mode !== 'endless';
  toast(mode === 'endless' ? '🏃 ' + t('endless', 'Endless Run') : `${t('world')} · ${worldFor(level).name} · ${level}`);
  startMusic();
  if (Save.data.stats.webs < 3) setTimeout(() => { if (game && screen === 'play') toast(t('webHint', '🕸️ Double-tap JUMP in air = Web Swing!')); }, 2200);
}

function renderHud(h) {
  const set = (id, v) => { const el = $(id); if (el.textContent !== String(v)) { el.textContent = v; return true; } return false; };
  set('#hud-lives', h.lives);
  if (set('#hud-score', fmtNum(h.score))) {}
  if (h.coins !== lastHud.coins && set('#hud-coins', fmtNum(h.coins))) bump($('#hud-coins').parentElement);
  if (h.stars !== lastHud.stars) { set('#hud-stars', `${h.stars}/${h.totalStars}`); if (lastHud.stars !== undefined) bump($('#hud-stars-pill')); }
  set('#hud-dist', fmtNum(h.distance));
  set('#hud-time', fmtTime(h.time));
  if (h.hearts !== lastHud.hearts || h.maxHearts !== lastHud.maxHearts) {
    const box = $('#hud-hearts'); box.innerHTML = '';
    for (let i = 0; i < h.maxHearts; i++) {
      const on = i < h.hearts;
      box.insertAdjacentHTML('beforeend', `<svg class="${on ? '' : 'off'}${!on && lastHud.hearts > i ? ' lost' : ''}"><use href="#i-heart"/></svg>`);
    }
  }
  set('#hud-web', h.webs);
  if (h.combo !== lastHud.combo) { $('#hud-combo').hidden = h.combo <= 1; set('#hud-combo-x', 'x' + h.combo); if (h.combo > 1) bump($('#hud-combo')); }
  if (h.webs !== lastHud.webs && lastHud.webs !== undefined) bump($('#hud-web-pill'));
  const pk = h.pw.map(([k, v]) => k + v).join();
  if (pk !== (lastHud.pk || '')) $('#hud-powers').innerHTML = h.pw.map(([k, v]) => `<span class="pw-chip" style="--pc:${POWERUPS[k].color}">${POWERUPS[k].icon}<b>${v}</b></span>`).join('');
  h.pk = pk;
  if ((h.night > 0.5) !== (lastHud.night > 0.5)) $('#hud-phase use').setAttribute('href', h.night > 0.5 ? '#i-moon' : '#i-sun');
  lastHud = h;
}
function bump(el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }

function pause(yes = !paused) {
  if (screen !== 'play' || !game || game.state !== 'play') return;
  paused = yes; input.clear();
  if (paused) { openModal('mdl-pause'); syncToggles(); } else closeModals();
  sfx.click();
}

function showOver(r) {
  $('#over-score').textContent = fmtNum(r.score);
  $('#over-dist-row').hidden = r.mode !== 'endless';
  $('#over-dist').textContent = fmtNum(r.distance) + 'm';
  $('#over-best').textContent = r.mode === 'endless' ? fmtNum(Save.data.endless.bestScore) : fmtNum(Save.data.levels[r.level].bestScore);
  const packs = Save.data.upgrades.revive, cost = 150;
  $('#revive-label').textContent = packs > 0 ? `${t('revive')} (${packs})` : `${t('revive')} ${cost}🪙`;
  $('#btn-revive').disabled = !(packs > 0 || Save.data.player.coins >= cost);
  sfx.gameOver();
  setTimeout(() => openModal('mdl-over'), 300);
}

function showComplete(r) {
  $('#win-coins').textContent = fmtNum(r.coins);
  $('#win-stars').textContent = `${r.stars}/${r.totalStars}`;
  $('#win-time').textContent = fmtTime(r.time);
  const bonus = []; if (r.timeBonus) bonus.push(`⏱ +${r.timeBonus}`); if (r.noDmg) bonus.push(`💖 No damage +${r.noDmg}`);
  $('#win-bonus').textContent = bonus.join('   ');
  $('#btn-next').hidden = r.level >= LEVEL_COUNT;
  const stars = $$('#big-stars .bs'); stars.forEach((s) => s.classList.remove('on'));
  openModal('mdl-complete');
  stars.forEach((s, i) => { if (i < r.rating) setTimeout(() => { s.classList.add('on'); sfx.star(); }, 450 + i * 380); });
  // score count-up
  const el = $('#win-score'), t0 = performance.now();
  const step = (now) => { const k = Math.min(1, (now - t0) / 1100); el.textContent = fmtNum(r.score * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

function doAction(a) {
  sfx.click();
  switch (a) {
    case 'endless': start('endless'); break;
    case 'daily': openDaily(); break;
    case 'close-daily': closeModals(); $('#daily-dot').hidden = !hasClaimable(); break;
    case 'resume': pause(false); break;
    case 'retry': start(lastRun.mode, lastRun.level); break;
    case 'home': show(lastRun.mode === 'level' ? 'levels' : 'menu'); break;
    case 'next': start('level', Math.min(LEVEL_COUNT, lastRun.level + 1)); break;
    case 'revive': {
      if (!game) return;
      if (Save.data.upgrades.revive > 0) { Save.data.upgrades.revive--; Save.persist(); }
      else if (!Save.spend(150)) { toast(t('notEnough')); return; }
      closeModals(); game.revive(); sfx.apple();
      break;
    }
  }
}

// ---------------- daily rewards + missions ----------------
function openDaily() { ensureDay(); renderDaily(); openModal('mdl-daily'); }
function renderDaily() {
  const r = rewardState(), d = ensureDay();
  $('#daily-strip').innerHTML = DAILY_REWARDS.map((amt, i) => {
    const day = i + 1, done = day <= r.streak && (r.claimedToday || day < r.nextDay), next = !r.claimedToday && day === r.nextDay;
    return `<div class="dday${done ? ' done' : ''}${next ? ' next' : ''}"><span>${t('day', 'Day')} ${day}</span>${day === 7 ? '🎁' : '🪙'}<b>${amt}</b></div>`;
  }).join('');
  const cb = $('#btn-claim-daily');
  cb.disabled = r.claimedToday;
  $('#claim-daily-label').textContent = r.claimedToday ? t('comeBack', 'Come back tomorrow!') : `${t('claim', 'Claim')} +${r.amount}`;
  const box = $('#missions'); box.innerHTML = '';
  d.missions.forEach((m, i) => {
    const p = missionProgress(m), ok = p >= m.goal;
    const row = document.createElement('div'); row.className = 'mrow';
    row.innerHTML = `<span>${m.text} <small>(${fmtNum(p)}/${fmtNum(m.goal)})</small></span><div class="bar"><i style="width:${(p / m.goal) * 100}%"></i></div>`;
    const b = document.createElement('button'); b.className = 'btn btn--sm ' + (m.claimed ? 'btn--green' : ok ? 'btn--yellow' : 'btn--navy');
    b.innerHTML = m.claimed ? '✔' : `<svg><use href="#i-coin"/></svg>${m.reward}`; b.disabled = m.claimed || !ok;
    b.addEventListener('click', () => { const n = claimMission(i); if (n) { sfx.buy(); toast(`+${n} 🪙`); updateWallets(); renderDaily(); } });
    row.appendChild(b); box.appendChild(row);
  });
  $('#daily-dot').hidden = !hasClaimable();
}

// ---------------- level select ----------------
function renderLevels() {
  const L = Save.data.levels, per = GAME.levelsPerPage, pages = GAME.pages;
  levelPage = Math.max(0, Math.min(pages - 1, levelPage));
  const grid = $('#level-grid'); grid.innerHTML = '';
  let current = 1; for (let i = 1; i <= LEVEL_COUNT; i++) if (L[i].unlocked) current = i;
  const worlds = new Set();
  for (let i = levelPage * per + 1; i <= (levelPage + 1) * per; i++) {
    const l = L[i]; worlds.add(worldFor(i).name);
    const b = document.createElement('button');
    b.className = 'level-btn' + (l.unlocked ? '' : ' is-locked') + (i === current && l.stars === 0 ? ' is-current' : '');
    b.style.setProperty('--lb', l.unlocked ? worldColor(i) : '');
    b.innerHTML = l.unlocked
      ? `<span class="num">${i}</span><span class="lstars">${[0, 1, 2].map((k) => `<svg class="${k < l.stars ? 'on' : ''}"><use href="#i-star"/></svg>`).join('')}</span>`
      : `<svg class="lock"><use href="#i-lock"/></svg>`;
    b.setAttribute('aria-label', `Level ${i}${l.unlocked ? '' : ' locked'}`);
    b.addEventListener('click', () => { if (!l.unlocked) { sfx.bump(); b.animate([{ translate: '-6px 0' }, { translate: '6px 0' }, { translate: '0 0' }], 220); return; } sfx.click(); start('level', i); });
    grid.appendChild(b);
  }
  $('#world-name').textContent = [...worlds].join('  ·  ');
  $('#pg-dots').innerHTML = Array.from({ length: pages }, (_, i) => `<i class="${i === levelPage ? 'on' : ''}"></i>`).join('');
  $('#pg-prev').disabled = levelPage === 0; $('#pg-next').disabled = levelPage === pages - 1;
}
function worldColor(i) { const w = worldFor(i); return { 'Green Meadow': '#2FA8F5', 'Waterfall Valley': '#22B5C8', 'Forest Heights': '#4CC23A', 'Rocky Mountains': '#8E8EA8', 'Twilight Woods': '#8E44D8', 'Sunset Peaks': '#FF8A3D' }[w.name]; }

// ---------------- store ----------------
let storeTab = 'skins';
function renderStore() {
  $$('.tab').forEach((b) => b.classList.toggle('is-on', b.dataset.tab === storeTab));
  const g = $('#store-grid'); g.innerHTML = ''; const s = Save.data;
  if (storeTab === 'skins') {
    for (const [id, sk] of Object.entries(SKINS)) {
      const owned = s.unlockedSkins.includes(id), eq = s.player.selectedSkin === id;
      const card = document.createElement('div'); card.className = 'item' + (eq ? ' is-equipped' : '');
      card.appendChild(heroThumb(sk, 88, 'idle'));
      card.insertAdjacentHTML('beforeend', `<h3>${sk.name}</h3>${owned ? `<span class="owned-tag">${t('owned')}</span>` : ''}`);
      const btn = document.createElement('button'); btn.className = 'btn btn--sm ' + (eq ? 'btn--green' : owned ? 'btn--purple' : 'btn--yellow');
      btn.innerHTML = eq ? t('equipped') : owned ? t('equip') : `<svg><use href="#i-coin"/></svg>${fmtNum(sk.price)}`;
      btn.disabled = eq;
      btn.addEventListener('click', () => {
        if (!owned) { if (!Save.spend(sk.price)) { sfx.bump(); toast(t('notEnough')); return; } s.unlockedSkins.push(id); sfx.buy(); }
        else sfx.click();
        s.player.selectedSkin = id; Save.persist(); renderStore(); updateWallets();
        if (demo) demo.skin = sk;
      });
      card.appendChild(btn); g.appendChild(card);
    }
  } else {
    const icons = { heart: '❤️', wing: '🪽', magnet: '🧲', revive: '💖', swift: '👟', spring: '🦘', web: '🕸️', bolt: '⚡' };
    for (const [id, u] of Object.entries(UPGRADES)) {
      const owned = u.consumable ? false : !!s.upgrades[id];
      const card = document.createElement('div'); card.className = 'item' + (owned ? ' is-equipped' : '');
      card.innerHTML = `<div class="uicon">${icons[u.icon]}</div><h3>${u.name}</h3><p>${u.desc}${u.consumable ? ` · ${t('owned')}: ${s.upgrades[id]}` : ''}</p>`;
      const btn = document.createElement('button'); btn.className = 'btn btn--sm ' + (owned ? 'btn--green' : 'btn--yellow');
      btn.innerHTML = owned ? t('owned') : `<svg><use href="#i-coin"/></svg>${fmtNum(u.price)}`; btn.disabled = owned;
      btn.addEventListener('click', () => {
        if (!Save.spend(u.price)) { sfx.bump(); toast(t('notEnough')); return; }
        if (u.consumable) s.upgrades[id] += u.consumable; else s.upgrades[id] = true;
        sfx.buy(); Save.persist(); renderStore(); updateWallets();
      });
      card.appendChild(btn); g.appendChild(card);
    }
  }
  updateWallets();
}

// ---------------- settings ----------------
let resetArmed = 0;
function renderSettings() {
  const s = Save.data.settings;
  $('#set-music').value = s.music; $('#set-sfx').value = s.sfx;
  $$('.seg').forEach((seg) => { const k = seg.dataset.set; $$('button', seg).forEach((b) => b.classList.toggle('is-on', String(s[k]) === b.dataset.v)); });
}
function bindSettings() {
  $('#set-music').addEventListener('input', (e) => { Save.data.settings.music = +e.target.value; applyVolumes(); Save.persist(); });
  $('#set-sfx').addEventListener('input', (e) => { Save.data.settings.sfx = +e.target.value; applyVolumes(); Save.persist(); });
  $('#set-sfx').addEventListener('change', () => sfx.coin());
  $$('.seg').forEach((seg) => seg.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const k = seg.dataset.set; let v = b.dataset.v;
    if (v === 'true' || v === 'false') v = v === 'true'; else if (!isNaN(+v)) v = +v;
    Save.data.settings[k] = v; Save.persist(); sfx.click();
    if (k === 'lang') applyI18n();
    applyControls(); renderSettings();
  }));
  $('#btn-reset').addEventListener('click', (e) => {
    if (Date.now() - resetArmed < 2500) { Save.reset(); resetArmed = 0; e.currentTarget.textContent = t('reset'); toast('✔'); sfx.click(); updateWallets(); return; }
    resetArmed = Date.now(); e.currentTarget.textContent = t('confirmReset'); sfx.bump();
    setTimeout(() => { if (Date.now() - resetArmed >= 2400) $('#btn-reset').textContent = t('reset'); }, 2600);
  });
}
function syncToggles() {
  const s = Save.data.settings;
  $$('.js-toggle').forEach((b) => b.classList.toggle('is-off', s[b.dataset.toggle] === 0));
}

// ---------------- trophies ----------------
function renderTrophy() {
  const s = Save.data, stars = Save.totalStars();
  const done = Object.values(s.levels).filter((l) => l.stars > 0).length;
  $('#stats').innerHTML = [
    [`${stars}/${LEVEL_COUNT * 3}`, '⭐ Stars'], [`${done}/${LEVEL_COUNT}`, 'Levels'], [fmtNum(s.endless.bestDistance) + 'm', '🏃 Best run'],
    [fmtNum(s.stats.totalCoins), '🪙 Coins earned'], [fmtNum(s.stats.stomps), '👟 Stomps'], [fmtTime(s.stats.playTimeSec), '⏱ Play time'],
  ].map(([b, l]) => `<div class="stat"><b>${b}</b><span>${l}</span></div>`).join('');
  const ach = [
    ['First Steps', 'Finish level 1', done, 1], ['Star Collector', 'Earn 30 stars', stars, 30], ['Perfectionist', 'Earn all 72 stars', stars, 72],
    ['Coin Hoarder', 'Earn 2,000 coins', s.stats.totalCoins, 2000], ['Stomp Master', 'Stomp 100 enemies', s.stats.stomps, 100],
    ['Marathon', 'Run 500m in Endless', s.endless.bestDistance, 500], ['Night Runner', 'Run 1,500m in Endless', s.endless.bestDistance, 1500],
    ['World Tour', 'Finish all 24 levels', done, 24], ['Fashionista', 'Own all 5 skins', s.unlockedSkins.length, 5],
  ];
  $('#achievements').innerHTML = ach.map(([n, d, v, goal]) => {
    const k = Math.min(1, v / goal);
    return `<li class="ach ${k >= 1 ? 'done' : ''}"><div class="medal"><svg><use href="#i-${k >= 1 ? 'trophy' : 'lock'}"/></svg></div><div class="info"><h4>${n}</h4><small>${d} · ${fmtNum(Math.min(v, goal))}/${fmtNum(goal)}</small><div class="bar"><i style="width:${k * 100}%"></i></div></div></li>`;
  }).join('');
}

// ---------------- wiring ----------------
function wire() {
  initInput($('#controls'), $('#playfield'));
  document.addEventListener('click', (e) => {
    const go = e.target.closest('[data-go]'); if (go) { sfx.click(); show(go.dataset.go); return; }
    const act = e.target.closest('[data-action]'); if (act) { doAction(act.dataset.action); return; }
    const tab = e.target.closest('[data-tab]'); if (tab) { storeTab = tab.dataset.tab; sfx.click(); renderStore(); return; }
    const tg = e.target.closest('.js-toggle');
    if (tg) { const k = tg.dataset.toggle, s = Save.data.settings; s[k] = s[k] === 0 ? (k === 'music' ? 0.6 : 0.9) : 0; Save.persist(); applyVolumes(); syncToggles(); sfx.click(); }
  });
  $('#btn-pause').addEventListener('click', () => pause(true));
  $('#pg-prev').addEventListener('click', () => { levelPage--; sfx.click(); renderLevels(); });
  $('#pg-next').addEventListener('click', () => { levelPage++; sfx.click(); renderLevels(); });
  bindSettings();
  $('#btn-claim-daily').addEventListener('click', () => {
    const n = claimReward(); if (!n) return;
    sfx.chest(); toast(`+${n} 🪙` + (rewardState().streak === 7 ? ' + 💖' : '')); updateWallets(); renderDaily();
  });

  const back = () => {
    if (screen !== 'play' && modalOpen()) { closeModals(); return; }
    if (screen === 'play') { if (!$('#mdl-pause').hidden) pause(false); else if (!modalOpen()) pause(true); }
    else if (screen === 'levels') show('menu');
    else if (['store', 'settings', 'trophy'].includes(screen)) show('back');
    else if (screen === 'menu' && IS_NATIVE) CAP.Plugins?.App?.exitApp?.();
  };
  input.onPause(back);
  input.onConfirm(() => {
    if (screen === 'menu') show('levels');
    else if (!$('#mdl-complete').hidden) doAction($('#btn-next').hidden ? 'home' : 'next');
    else if (!$('#mdl-over').hidden) doAction('retry');
    else if (!$('#mdl-pause').hidden) pause(false);
  });

  // first gesture unlocks audio
  const unlock = () => { unlockAudio(); startMusic(); };
  addEventListener('pointerdown', unlock, { once: true });
  addEventListener('keydown', unlock, { once: true });

  document.addEventListener('visibilitychange', () => {
    suspendAll(document.hidden);
    if (document.hidden && screen === 'play' && !paused && !modalOpen()) pause(true);
  });

  // platform glue
  if (IS_POPUP) {
    const b = $('#btn-fulltab'); b.hidden = false;
    b.addEventListener('click', () => {
      const url = location.href.split('?')[0];
      if (window.chrome?.tabs?.create) chrome.tabs.create({ url }); else window.open(url, '_blank');
    });
  }
  if (IS_NATIVE) {
    $('#btn-exit').hidden = false;
    $('#btn-exit').addEventListener('click', () => CAP.Plugins?.App?.exitApp?.());
    CAP.Plugins?.App?.addListener?.('backButton', back);
    CAP.Plugins?.App?.addListener?.('appStateChange', ({ isActive }) => { suspendAll(!isActive); if (!isActive && screen === 'play' && !paused && !modalOpen()) pause(true); });
  }
  if (!IS_EXT && !IS_NATIVE && 'serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

// ---------------- loop ----------------
let last = performance.now();
function frame(now) {
  const dt = Math.min(1 / 30, Math.max(0, (now - last) / 1000)); last = now;
  updateInput();
  const g = screen === 'play' && game ? game : demo;
  if (g) {
    if (g === demo || !paused) g.update(dt, input);
    g.render(ctx, canvas.width, canvas.height);
    const n = Math.round((g.sky?.night || 0) * 50) / 50;
    if (n !== lastN) { lastN = n; html.style.setProperty('--n', n); html.classList.toggle('is-night', n > 0.5); }
  }
  requestAnimationFrame(frame);
}

// Test hook: only with ?debug in URL
if (params.has('debug')) window.__fj = { get game() { return game; }, get demo() { return demo; }, start, Save };

async function boot() {
  resize(); applyI18n(); wire(); applyVolumes();
  const bar = $('#loadbar'); bar.style.width = '30%';
  demo = new Game({ mode: 'endless', demo: true });
  requestAnimationFrame(frame);
  try { await Promise.race([Promise.all([document.fonts.load('40px "Lilita One"'), document.fonts.load('500 16px Fredoka')]), new Promise((r) => setTimeout(r, 2500))]); } catch (_) {}
  bar.style.width = '100%';
  setTimeout(() => show('menu'), 350);
}
boot();
