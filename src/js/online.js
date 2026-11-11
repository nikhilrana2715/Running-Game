// Online leaderboard (Supabase PostgREST, no SDK). Public publishable key: safe to ship — the `scores` table
// only allows SELECT + INSERT for anon (RLS), with CHECK constraints on every column; nothing can be edited or deleted.
const URL_ = 'https://wtzqbwsdqsefihtkdnnt.supabase.co/rest/v1/scores';
const KEY = 'sb_publishable_N9IwFYn8KwkHPYM9YkT_nQ_p7WcrmPL';
const H = { apikey: KEY, 'Content-Type': 'application/json' };

async function req(url, opts = {}, ms = 6000) {
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { ...opts, headers: { ...H, ...(opts.headers || {}) }, signal: ctl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const txt = await r.text(); // 201/204 inserts come back with an empty body
    return txt ? JSON.parse(txt) : null;
  } finally { clearTimeout(timer); }
}

export const cleanName = (s) => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 16);

export function topScores(mode = 'endless', limit = 20) {
  return req(`${URL_}?select=name,score,distance,level,created_at&mode=eq.${mode}&order=score.desc,created_at.asc&limit=${limit}`);
}

export async function submitScore({ name, mode, score, distance = 0, level = null }) {
  const row = { name: cleanName(name), mode, score: Math.max(0, Math.min(5000000, Math.floor(score))), distance: Math.max(0, Math.floor(distance)), level };
  if (!row.name) throw new Error('name');
  await req(URL_, { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(row) });
  // rank = number of strictly better scores + 1 (best effort: the score is already saved)
  try {
    const r = await fetch(`${URL_}?select=id&mode=eq.${mode}&score=gt.${row.score}`, { method: 'HEAD', headers: { ...H, Prefer: 'count=exact' } });
    const total = +(r.headers.get('content-range') || '').split('/')[1];
    return Number.isFinite(total) ? total + 1 : null;
  } catch (_) { return null; }
}
