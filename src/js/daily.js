// Daily Reward (7-day login streak) + 3 Daily Missions. Progress = stats delta since the day started,
// so gameplay code needs no extra hooks: it just keeps bumping Save.data.stats.
import { Save } from './save.js';
import { mulberry32 } from './util.js';

export const DAILY_REWARDS = [50, 75, 100, 150, 200, 250, 500];

const POOL = [
  { key: 'totalCoins', text: 'Collect {n} coins',      n: [100, 200, 350], reward: [60, 100, 150] },
  { key: 'webs',       text: 'Web Swing {n} times',    n: [3, 6, 10],      reward: [60, 100, 150] },
  { key: 'stomps',     text: 'Stomp {n} enemies',      n: [5, 10, 20],     reward: [60, 100, 150] },
  { key: 'powerups',   text: 'Grab {n} power-ups',     n: [2, 4, 7],       reward: [60, 100, 150] },
  { key: 'runs',       text: 'Play {n} runs',          n: [3, 5, 8],       reward: [50, 80, 120] },
];

const today = () => new Date().toLocaleDateString('en-CA'); // local YYYY-MM-DD
const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toLocaleDateString('en-CA'); };

// Roll today's missions once per day (seeded by date so a reload gives the same set).
export function ensureDay() {
  const d = Save.data.daily, day = today();
  if (d.day === day) return d;
  const rng = mulberry32([...day].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0);
  const pool = [...POOL], picks = [];
  while (picks.length < 3) picks.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  d.day = day;
  d.missions = picks.map((m) => {
    const tier = Math.floor(rng() * 3);
    return { key: m.key, text: m.text.replace('{n}', m.n[tier]), goal: m.n[tier], reward: m.reward[tier], base: Save.data.stats[m.key] || 0, claimed: false };
  });
  Save.persist();
  return d;
}

export const missionProgress = (m) => Math.min(m.goal, (Save.data.stats[m.key] || 0) - m.base);

export function rewardState() {
  const d = Save.data.daily;
  const claimedToday = d.lastClaim === today();
  // streak continues only if last claim was yesterday (or today)
  const cont = d.lastClaim === yesterday() || claimedToday;
  const streak = cont ? d.streak : 0;
  const nextDay = claimedToday ? streak : (streak % 7) + 1; // 1..7
  return { claimedToday, streak, nextDay, amount: DAILY_REWARDS[nextDay - 1] };
}

export function claimReward() {
  const r = rewardState(); if (r.claimedToday) return 0;
  const d = Save.data.daily;
  d.streak = r.nextDay; d.lastClaim = today();
  Save.grant(r.amount);
  if (r.nextDay === 7) Save.data.upgrades.revive += 1; // week bonus
  Save.persist();
  return r.amount;
}

export function claimMission(i) {
  const m = ensureDay().missions[i];
  if (!m || m.claimed || missionProgress(m) < m.goal) return 0;
  m.claimed = true; Save.grant(m.reward); Save.persist();
  return m.reward;
}

export function hasClaimable() {
  const d = ensureDay();
  return !rewardState().claimedToday || d.missions.some((m) => !m.claimed && missionProgress(m) >= m.goal);
}
