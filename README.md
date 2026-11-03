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

## Rules (what players see) · v0.1 beta
1. Each daily shows a place (A HOSPITAL); the start word is revealed when the round begins.
2. Name as many things as you can, each one smaller than the last. 60 seconds. Everyday items, no proper nouns.
3. The tighter the fit, the more it scores. Specific, on-theme and rare words score extra.
4. The run ends when time is up, or when you reach something with nothing smaller (bacteria, a germ). No hidden bottom and no bottom bonus.
5. Pause from the top-left button: it goes back home and freezes the clock. Two pauses per daily; a third ends it. Closing or reloading mid-round counts as a pause.

Menu: your stats, six badges, history, settings (dark mode, animations), clear results. Admin stats and word review live at /admin.html. The sun/moon button switches light and dark.

## Scoring (the "How scoring works" screen explains this to players)
Sizes use a scale where one size = 1.5x. `words.json` stores each word's exact size on that scale (24.13), so words inside one size can still be ordered.
Each word scores up to 100. Points add up:
| Part | Points |
| --- | --- |
| Perfect fit: at least ~10% smaller but less than one size | 50 |
| Snug fit: one size down, or smaller by less than ~10% | 40 |
| 2 / 3 / 4 / 5 / 6 sizes | 30 / 25 / 20 / 15 / 10 |
| Kind of: same size but a kind of the last thing (DOCTOR after PERSON) | 25 |
| On theme | +20 |
| Specific: +5 per level below the everyday word | up to +15 |
| Rare | +5 / +10 / +15 |
| 7+ sizes, the same size and not a kind of it (NURSE after DOCTOR), or bigger | not allowed |
- Played in the last 7 days: the word's total is halved, recovering to full over the week. A strong round is roughly 600–900.
- Rare words show a %: "rarer than 65% of words" (everyday-English frequency among the plain words) until a daily has 25+ rounds, then "only 4% of players".
- People: occupations and roles (doctor, nurse, umpire, camper…) are person-sized and count as a kind of person (`tools/sizes/sizes_zz.txt`, `specific_extra.tsv`).
- Results: your path with tags, where you stopped → the smallest on-theme thing on the place's list, a typical path to reveal, share text with ⭐ perfect · 🟦 snug · 🟨 tight/good · ⬜ big · 🔹 kind of.

## Daily schedule
Daily #1 is Nov 3 2026. `tools/categories.txt` has 40 starter categories (NAME | start word | typical things). The schedule shuffles them and uses each once before repeating, so 40 categories = 40 days without a repeat. Add categories to reach 365, then run `python3 tools/make_dailies.py 2026-11-03 365` (keep the same start date so numbers don't shift).
Other everyday names for things (MED KIT → FIRST AID KIT) live in `tools/sizes/aliases.txt`.

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
