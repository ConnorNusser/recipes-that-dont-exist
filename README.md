# Recipes That Don't Exist

One recipe a day from a timeline that never happened. Real ingredients, working technique, invented history. Every recipe is checked against published sources by web search before it ships.

**The daily loop:** before the timeline is revealed, you get one guess. Three points of divergence, one real. Correct guesses build a streak. New recipe at 00:00 UTC.

## Stack

- **Site** — React + Vite (`src/`), hosted on Vercel (auto-deploys pushes to `main`), with `@vercel/analytics` for traffic. Recipes are plain JSON in `public/recipes/`.
- **Artwork** — category illustrations in `public/assets/` are custom linocut-style pieces generated with Google Gemini (Nano Banana Pro), one per scenario category.
- **Generator** — `scripts/generate.mjs` runs a three-stage pipeline against the Claude API (`claude-opus-4-8`): (1) ideate five divergence premises, forced to spread across centuries and continents and to favor in-season ingredients; (2) a fresh context judges the premises, develops the winner, and runs a deep novelty check with the `web_search` server tool (dish name, quoted ingredient-pair searches, nearest-cuisine reframings) plus Wikipedia grounding for the real history; (3) a test-kitchen pass verifies ratios, temperatures, times, and step order, correcting the recipe if needed.
- **Schedule** — a Mac mini runs the Claude Code skill nightly (see below); every push to `main` triggers a Vercel redeploy.
- **Variety** — seven scenario categories (conquest, ecological collapse, trade route, technology, climate, taboo, migration) rotate least-recently-used, and the prompt includes all prior titles to prevent repeats.

## Daily generation

**Primary: a Mac mini running the Claude Code skill.** The repo ships a project skill (`.claude/skills/daily-recipe/`) that runs the full pipeline — ideation, deep novelty search, Wikipedia grounding, test-kitchen pass — validates with `scripts/validate.mjs`, commits, and pushes. Runs under a Claude subscription; no API key.

One-time setup on the mini:

```sh
git clone https://github.com/ConnorNusser/recipes-that-dont-exist.git ~/recipes-that-dont-exist
cd ~/recipes-that-dont-exist && npm install
claude          # log in once, then exit
# confirm git push works (gh auth login / ssh key)
cp ops/com.connor.recipes-daily.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.connor.recipes-daily.plist
```

Test a run by hand:

```sh
cd ~/recipes-that-dont-exist && claude -p "/daily-recipe" --dangerously-skip-permissions
```

The skill self-heals: each run generates any date missing from the last three days, so a slept-through night is filled in the next evening. Logs land in `/tmp/recipes-daily.log`.

**Dead fallback: GitHub Actions.** `.github/workflows/daily.yml` still runs nightly but skips quietly unless an `ANTHROPIC_API_KEY` secret is set (`gh secret set ANTHROPIC_API_KEY`). With the secret it calls `scripts/generate.mjs` — the same pipeline as an API script — and no-ops whenever the mini already published.

## Development

```sh
npm install
npm run dev                                        # local dev server
npm run build && npm run preview                   # production build
ANTHROPIC_API_KEY=... node scripts/generate.mjs    # generate today's recipe (no-ops if it exists)
```
