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

## Rules (what players see) · v0.4 beta "Snug"
1. Seven quick rounds a day. Each names a real space: in a suitcase, through a door, on a table, in your pants pocket, on a sofa.
2. You have 25 seconds to name the biggest thing that still fits.
3. After each round, a scale shows how snug your fit was (rattles around → snug fit), plus hand-picked snug answers. Tap Next for the next round.
4. Pause from the top-left: two pauses per daily, a third ends it. Closing or reloading mid-round counts as a pause.

## Scoring
- Within 5% of the space's size = 100. Smaller things score whole-number points sliding down to 10 at about 2.5 sizes smaller (one size = 1.5×).
- More than 5% too big doesn't fit: try again while the clock runs. Open spaces (baskets, carts, beds, anything "on", doors and elevators, which you can tilt things through) accept things up to ~35% bigger. The space itself and kinds of it don't count.
- Specific is snugger: each level more specific than the everyday word counts 0.1 sizes closer (up to 0.3).
- A day is out of 700. Share marks: 📦 perfect fit · 🟧 60+ · 🟨 30+ · ⬜ under 30. Each word shows its % and can be used once a day.

## Daily schedule
The spaces live in `tools/fits.txt` (`phrase | word | usable inside size in cm | snug examples`). The build checks every example against the game's own sizes and only shows the ones that score 60+; it prints spaces with fewer than 2 good examples so you can tune them. `python3 tools/make_snug.py 2026-11-03 365` writes `data/fits.json` and `data/dailies.json`: 2 small, 3 medium and 2 big spaces a day, in a random order, every space used once before any repeat (120 spaces ≈ a repeat every 17 days; add lines to stretch that).

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
