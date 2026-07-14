# Recipes That Don't Exist

One recipe a day from a timeline that never happened. Real ingredients, working technique, invented history. Every recipe is checked against published sources by web search before it ships.

**The daily loop:** before the timeline is revealed, you get one guess. Three points of divergence, one real. Correct guesses build a streak. New recipe at 00:00 UTC.

## Stack

- **Site** — React + Vite (`src/`), deployed to GitHub Pages by `.github/workflows/deploy.yml`. Recipes are plain JSON in `public/recipes/`.
- **Artwork** — category illustrations in `public/assets/` are custom linocut-style pieces generated with Google Gemini (Nano Banana Pro), one per scenario category.
- **Generator** — `scripts/generate.mjs` calls the Claude API (`claude-opus-4-8`) with the `web_search` server tool. The model invents a dish from an alternate timeline, searches for matching published recipes, revises until nothing matches, and emits the recipe JSON with its verification queries and verdict attached.
- **Schedule** — `.github/workflows/daily.yml` runs shortly after 00:00 UTC, generates the day's recipe, and commits it; the deploy workflow rebuilds the site when it finishes.
- **Variety** — seven scenario categories (conquest, ecological collapse, trade route, technology, climate, taboo, migration) rotate least-recently-used, and the prompt includes all prior titles to prevent repeats.

## Setup

One secret is required for the daily Action:

```sh
gh secret set ANTHROPIC_API_KEY
```

## Development

```sh
npm install
npm run dev                                        # local dev server
npm run build && npm run preview                   # production build
ANTHROPIC_API_KEY=... node scripts/generate.mjs    # generate today's recipe (no-ops if it exists)
```
