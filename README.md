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

## Rules (what players see) · v0.3 beta "Halfway"
1. Seven quick rounds a day. Each round shows a big thing and a small thing about 3 sizes apart (one size = 1.5×), e.g. CHAIR and PLATE.
2. You have 20 seconds to name the thing closest to halfway between their sizes ("as many times smaller than the big one as it is bigger than the small one").
3. After each round you see where your word landed on a scale, the everyday words nearest the middle, and your points. Tap Next for the next round.
4. Pause from the top-left: two pauses per daily, a third ends it. Closing or reloading mid-round counts as a pause.

## Scoring
- Within 0.15 sizes of the middle = 100. Further away scores less, down to 10 at the edges. Bigger than the big thing or smaller than the small one doesn't count (try again while the clock runs).
- Specific is closer: each level more specific than the everyday word counts 0.15 sizes nearer the middle (up to 0.45), so DEMITASSE beats CUP at the same size.
- A day is out of 700. Share marks: 🎯 90+ · 🟧 60+ · 🟨 30+ · ⬜ under 30.
- Each word shows its % (how common in English until a daily has 25+ rounds, then the share of players who said it). A word can only be used once per day.

## Daily schedule
`tools/make_halfway.py 2026-11-03 365` builds `data/dailies.json`: 7 rounds a day, one from each scale band (small things to big things, in a random order). Ends are everyday objects from the place lists plus very common words, 2.8–3.2 sizes apart, with at least 6 everyday words near the middle. An end word doesn't come back within 14 days and a pair not within 90. Confusing words (BAT, CHIP, MATCH…) go in `tools/pair_avoid.txt`; add to it and rerun. (`tools/make_pairs.py` is the v0.2 "fill the gap" schedule, kept for reference.)

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
