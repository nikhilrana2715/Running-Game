// Versioned localStorage save (roadmap §6). Every access wrapped: storage can be blocked.
import { LEVEL_COUNT } from './config.js';

const KEY = 'funnyJump.save.v1';
const VERSION = 1;

function fresh() {
  const levels = {};
  for (let i = 1; i <= LEVEL_COUNT; i++) levels[i] = { unlocked: i === 1, stars: 0, bestScore: 0, bestTime: 0 };
  return {
    version: VERSION,
    player: { name: 'Player', coins: 0, selectedSkin: 'red' },
    unlockedSkins: ['red'],
    upgrades: { extraHeart: false, doubleJump: false, magnet: false, swift: false, springLegs: false, webPro: false, powerTime: false, revive: 0 },
    levels,
    endless: { bestDistance: 0, bestScore: 0 },
    daily: { day: '', missions: [], lastClaim: '', streak: 0 },
    settings: { music: 0.6, sfx: 0.9, vibration: true, lang: 'en', controls: 'auto', controlSize: 1, cycle: 'auto' },
    stats: { totalCoins: 0, deaths: 0, playTimeSec: 0, stomps: 0, runs: 0, webs: 0, powerups: 0 },
  };
}

function merge(base, data) {
  if (!data || typeof data !== 'object') return base;
  for (const k of Object.keys(base)) {
    if (data[k] === undefined) continue;
    if (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) base[k] = merge(base[k], data[k]);
    else base[k] = data[k];
  }
  return base;
}

let state = fresh();
try { const raw = localStorage.getItem(KEY); if (raw) state = merge(fresh(), JSON.parse(raw)); } catch (_) {}

export const Save = {
  get data() { return state; },
  persist() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) {} },
  reset() { const s = state.settings; state = fresh(); state.settings = s; this.persist(); },
  addCoins(n) { state.player.coins += n; state.stats.totalCoins += Math.max(0, n); this.persist(); },
  grant(n) { state.player.coins += n; this.persist(); }, // rewards: don't count toward 'collect coins'
  spend(n) { if (state.player.coins < n) return false; state.player.coins -= n; this.persist(); return true; },
  totalStars() { return Object.values(state.levels).reduce((a, l) => a + l.stars, 0); },
  recordLevel(n, { stars, score, time }) {
    const l = state.levels[n];
    l.stars = Math.max(l.stars, stars);
    l.bestScore = Math.max(l.bestScore, score);
    if (!l.bestTime || time < l.bestTime) l.bestTime = Math.round(time);
    if (state.levels[n + 1]) state.levels[n + 1].unlocked = true;
    this.persist();
  },
};
