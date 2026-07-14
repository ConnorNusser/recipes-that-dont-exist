# Recipes That Don't Exist

One recipe a day from a timeline that never happened. Real ingredients, working technique, impossible history — verified by web search to not exist anywhere before publishing.

**Daily loop (the Wordle bit):** before the timeline is revealed, you get one guess — three points of divergence, one real. Correct guesses build a streak. New drop every day at 00:00 UTC.

## How it works

- **Site** — static, Linear-inspired UI (`index.html`, `styles.css`, `app.js`), served by GitHub Pages. Recipes are plain JSON in `recipes/`.
- **Generator** — `scripts/generate.mjs` calls the Claude API (`claude-opus-4-8`) with the `web_search` server tool. The model invents a dish from an alternate timeline, searches the web for matching published recipes, revises until nothing matches, and emits the recipe JSON with its verification queries and verdict attached.
- **Schedule** — `.github/workflows/daily.yml` runs shortly after 00:00 UTC, generates the day's recipe, and commits it. Pages redeploys automatically.
- **Variety** — seven scenario categories (conquest, ecological collapse, trade route, technology, climate, taboo, migration) rotate least-recently-used, and the prompt includes all prior titles/scenarios to prevent repeats.

## Setup

One secret is required for the daily Action:

```sh
gh secret set ANTHROPIC_API_KEY
```

Run a generation manually:

```sh
npm install
ANTHROPIC_API_KEY=... node scripts/generate.mjs   # no-ops if today's recipe exists
```

Preview locally:

```sh
npm run serve   # http://localhost:4173
```
