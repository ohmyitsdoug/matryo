# Matryo

Daily word game: today's place and a big thing to start from (A BASEBALL GAME · STADIUM). Name smaller and smaller things in 60 seconds.

```
index.html          the game (works on its own; logging and shared stats use the Netlify functions)
admin.html          stats and word review, protected by ADMIN_PASSWORD
config.js           optional: where the server functions live (default /.netlify/functions)
package.json        one dependency for the server functions: @netlify/blobs
data/words.json     ~2,800 everyday words + ~8,600 specific kinds (COFFEE CUP, DEMITASSE), each with an exact size
data/categories.json  places with their start word and typical things (the on-theme bonus)
data/dailies.json   365 dailies (category, start word; the old floor/bottom fields are no longer used)
netlify/functions/  log (visits, unknown words, finished rounds), words + stats (read by the game),
                    admin (admin page), words-daily (adds player words each day), stats-hourly (rebuilds stats)
netlify/lib/db.mjs  shared storage helpers; everything is kept in Netlify Blobs
tools/              scripts and source files for words, categories and the schedule
review/             spreadsheet of every word for you to check
```

## Rules (what players see) · v0.2 beta
1. Each daily is a big word and a small word about 8 sizes apart (one size = 1.5×), revealed when the round starts. Example: BATHTUB → GARLIC.
2. In 60 seconds, name 7 things that fit between them, in any order. Everyday things, no proper nouns.
3. Lenient on purpose: a word counts if it's clearly between the ends and at least half a size from your other words. There are about 14 half-size spots and you need any 7. The round ends early once all 7 are in.
4. Pause from the top-left: two pauses per daily, a third ends it. Closing or reloading mid-round counts as a pause.

Results list everything biggest to smallest, with each word's % (how common in English until a daily has 25+ rounds, then the share of players who said it). Sizes you skipped show common answers.

## Scoring
| Per word (max 100) | Points |
| --- | --- |
| Fits in the gap | 50 |
| Specific: +5 per level below the everyday word | up to +15 |
| Rare | +5 / +10 / +15 / +20 |
| Next down: smaller than the word you named before it | +10 |
| Played in the last 7 days | half, recovering over the week |

| Round bonus | Points |
| --- | --- |
| All 7 filled | +100 |
| Even steps: one word in each of the 7 sizes between the ends | +50 |
| Finished early | +2 per second left |

Ranking is by total points, so filling all 7 matters most and rare, specific words decide between full ladders.

## Daily schedule
`tools/make_pairs.py 2026-11-03 365` builds `data/dailies.json`: well-known words (from the place lists in `tools/categories.txt` plus very common words) paired about 8 sizes apart, only where every size in between has at least 5 everyday words. A word comes back as an end at most every 40 days, and no pair repeats. Words that make confusing ends (BAT, CHIP, MATCH…) are listed in `tools/pair_avoid.txt`; add to it and rerun to swap any you don't like.

## Going live (about 15 minutes, Netlify only)

No database account and no sign-in providers. Netlify hosts the game, runs the server functions, and stores everything in Netlify Blobs (built in). Players don't sign in; their scores, streaks and badges live in their browser.

1. **Put the folder on GitHub** (e.g. `ohmyitsdoug/matryo`). Deploy from Git so Netlify installs `@netlify/blobs` for the functions; a drag-and-drop deploy doesn't install dependencies.
2. **Netlify → Add new site → Import from Git** → pick the repo. Build command: leave empty. Publish directory: `.` (netlify.toml already says this).
3. **Site configuration → Environment variables** → add `ADMIN_PASSWORD` (8+ characters; this unlocks `/admin.html`). Optional: `AUTO_PLAYERS` (default 5), `REVIEW_PLAYERS` (default 2), `BLOCKED_WORDS` (comma list of words never to add).
4. **Deploys → Trigger deploy** so the functions see the variable.
5. **Domain management → Add a domain** → `matryo.io`, then follow Netlify's DNS steps at your registrar. HTTPS turns on by itself.
6. **Check it:** play a daily, open `matryo.io/admin.html`, enter the password. Today's visitors and the finished round should show (daily stats refresh hourly and every time you open the page). Netlify → Functions shows `words-daily` (daily) and `stats-hourly` (hourly) as scheduled.

## Accepting new words (no AI)

There is no AI anywhere in the game or its server jobs. New words come from players and from you.

When a player types a word the game doesn't know, `log` records it once per player per day (an anonymous random device id, never a name), together with what they typed it after. Once a day `words-daily` looks at yesterday (UTC) and counts different players per word:
1. `AUTO_PLAYERS` (5) or more players → added automatically (`auto`) and live on the next visit.
2. `REVIEW_PLAYERS` (2) or more → queued for you (`review`).
3. Size: about one size (1.5×) smaller than the median thing players typed it after. If players disagree a lot about where it goes (more than 3 sizes apart), it waits for review even with 5+ players.
4. Skipped: words already known or rejected, anything in `BLOCKED_WORDS`, and anything that isn't plain letters.

Open `/admin.html` (with your ADMIN_PASSWORD) to see stats and:
- **Add a word by hand:** a size in mm/cm/m/km, or "same size as" a known word, plus an optional "kind of" word (Surgeon → Doctor).
- **Needs a decision:** approve (with a size you can change) or reject.
- **Auto-approved:** fix the size or undo.
- **Most-typed unknown words:** "Add…" fills the form with a suggested size, or ignore it.

Words you approve or add load into the game on the next visit, no redeploy needed.

## Editing the starting word list

1. Change a size in `tools/sizes/*.txt` (format `size_cm: word word two_word`; later files win, `sizes_z.txt` is for fixes), add other meanings in `senses.txt` (wing: 5000), or add a specific kind in `specific_extra.tsv` (souvenir_cup → cup). The review sheet is `review/snug-words-review.csv`.
2. `cd tools && FREQ=path/to/en_full.txt python3 build_words.py` (frequency list from github.com/hermitdave/FrequencyWords, optional)
3. `python3 make_dailies.py 2026-11-01 365` to rebuild the schedule (pick your real launch date).
