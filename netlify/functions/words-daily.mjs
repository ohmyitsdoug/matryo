// Runs once a day, no AI. Looks at yesterday's unknown words (UTC) and counts how many
// DIFFERENT players typed each one.
//   AUTO_PLAYERS (default 5) or more players -> added automatically ("auto"), live in the game right away
//   REVIEW_PLAYERS (default 2) or more       -> waits for you in admin.html ("review")
// Size: players type a word right after something bigger, so it's sized about one size (1.5x)
// smaller than the usual thing they typed it after. If players disagree a lot about where it goes,
// it waits for review even with 5+ players. Anything you add, fix, reject or ignore wins.
// Env: AUTO_PLAYERS, REVIEW_PLAYERS, BLOCKED_WORDS (comma list), all optional
import { db, day, tierOf, cmOf, keys, rebuildLive } from '../lib/db.mjs';
export const config = { schedule: '@daily' };

const AUTO = +(process.env.AUTO_PLAYERS || 5);
const REVIEW = +(process.env.REVIEW_PLAYERS || 2);
const BLOCKED = new Set((process.env.BLOCKED_WORDS || '').split(',').map((w) => w.trim().toLowerCase().replace(/ /g, '_')).filter(Boolean));
const quantile = (xs, q) => { const s = [...xs].sort((a, b) => a - b); const i = (s.length - 1) * q, lo = Math.floor(i); return s[lo] + (s[Math.ceil(i)] - s[lo]) * (i - lo); };

export async function run(store, when = day(-1)) {
  const ks = await keys(store, `misses/${when}/`);
  if (!ks.length) return { day: when, auto: [], review: [] };
  const known = new Set();
  try { (await fetch(`${process.env.URL || ''}/data/words.json`).then((r) => r.json())).words.forEach(([w]) => known.add(w)); } catch {}
  for (const k of await keys(store, 'words/')) known.add(k.slice(6));
  for (const k of await keys(store, 'ignored/')) known.add(k.slice(8));

  const by = {};
  for (const k of ks) { const [, , word, device] = k.split('/'); (by[word] = by[word] || []).push({ key: k, device }); }
  const decided = { day: when, auto: [], review: [] };
  for (const [word, es] of Object.entries(by)) {
    const players = new Set(es.map((e) => e.device)).size;
    if (players < REVIEW || known.has(word) || BLOCKED.has(word) || !/^[a-z][a-z_]{2,29}$/.test(word)) continue;
    const rows = (await Promise.all(es.map((e) => store.get(e.key, { type: 'json' }).catch(() => null)))).filter(Boolean);
    const sizes = rows.map((r) => +r.size).filter((x) => Number.isFinite(x) && x > 0);
    if (!sizes.length) continue;
    const at = Math.max(1, quantile(sizes, 0.5) - 1);
    const spread = quantile(sizes, 0.75) - quantile(sizes, 0.25);
    const after = Object.entries(rows.reduce((m, r) => (r.container && (m[r.container] = (m[r.container] || 0) + 1), m), {}))
      .sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c.replace(/_/g, ' '));
    const status = players >= AUTO && spread <= 3 ? 'auto' : 'review';
    const size_cm = cmOf(at);
    await store.setJSON(`words/${word}`, { word, size_cm, tier: tierOf(size_cm), pop: 2, players, status, parent: null,
      note: `typed by ${players} players on ${when}, usually after ${after.join(', ') || '?'}${spread > 3 ? ' · players disagree on its size' : ''}`,
      created: new Date().toISOString() });
    decided[status].push(word);
  }
  if (decided.auto.length) await rebuildLive(store);
  return decided;
}
export default async () => new Response(JSON.stringify(await run(db())), { headers: { 'content-type': 'application/json' } });
