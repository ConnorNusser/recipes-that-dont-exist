/**
 * Daily recipe generator — three-stage pipeline.
 *
 *   1. Ideate  — propose 5 divergence premises (forced spread across
 *                centuries/continents, seasonal produce, no repeats).
 *   2. Craft   — a fresh context judges the premises, develops the winner
 *                into a full recipe, and runs a deep novelty check with
 *                web search (dish name, ingredient pairs, nearest-cuisine
 *                reframings) plus Wikipedia grounding.
 *   3. Sound   — a test-kitchen pass checks ratios, temperatures, times,
 *                step order, and style, correcting the recipe if needed.
 *
 * Writes public/recipes/<date>.json and updates public/recipes/index.json.
 * Requires ANTHROPIC_API_KEY. Run: node scripts/generate.mjs
 */

import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const RECIPES_DIR = path.join(ROOT, "public", "recipes");
const INDEX_PATH = path.join(RECIPES_DIR, "index.json");
const MODEL = "claude-opus-4-8";

const CATEGORIES = [
  "conquest",            // an invasion/empire went the other way
  "ecological-collapse", // a crop, species, or resource vanished
  "trade-route",         // a trade route opened (or closed) centuries off-schedule
  "technology",          // a food technology arrived early or never
  "climate",             // drought, frost, a shifted growing zone
  "taboo",               // a religious/legal food rule took a different path
  "migration",           // a people ended up somewhere else entirely
];

const CATEGORY_HINTS = {
  "conquest": "An invasion, occupation, or empire that went differently — two cuisines forced together.",
  "ecological-collapse": "A staple crop, fish stock, or species that disappeared — cuisine rebuilt around the gap.",
  "trade-route": "A trade route that opened or closed centuries off-schedule — ingredients arriving where they never did.",
  "technology": "A food technology (canning, refrigeration, distillation, nixtamalization...) arriving early, late, or never.",
  "climate": "A drought, frost, or shifted growing zone that rewrote what a region could grow.",
  "taboo": "A religious or legal food rule that took a different path — a forbidden ingredient embraced, or a common one banned.",
  "migration": "A people who ended up somewhere else entirely, carrying their pantry into a foreign larder.",
};

const STYLE_GUIDE = `Voice and style — this matters as much as the content:
- Write like a good food-history writer: plain, concrete, specific. Dates, names, quantities, causes.
- No emojis anywhere, in any field. No exclamation marks. No rhetorical questions.
- Avoid breathless or promotional language: never "elevate", "delightful", "magical", "a symphony of", "takes X to the next level", "rich tapestry".
- Prefer periods over em dashes. Short sentences are fine.
- The tagline is one flat declarative sentence, not a pitch.`;

const RECIPE_SCHEMA = `{
  "title": "string — the dish name, specific and evocative",
  "tagline": "string — one flat declarative sentence",
  "region": "string — where in the alt-timeline this is eaten",
  "divergence": { "year": "string", "label": "string — 2-6 word name for the divergence event" },
  "difficulty": "Easy | Medium | Hard",
  "servings": "string, e.g. 'Serves 4'",
  "time": "string, e.g. '1 hr 20 min'",
  "scenario": "string — 150-200 words. How this timeline diverged and how it produced this exact dish. Concrete dates, names, causality. Period-accurate ingredients (e.g. no tomatoes in Europe before 1500s).",
  "references": [ { "title": "string — Wikipedia article title", "url": "https://en.wikipedia.org/wiki/..." } ],
  "ingredients": [ { "group": "string — section name", "items": [ { "amount": "string with metric units", "item": "string" } ] } ],
  "method": ["string — step 1, ideally opening with a short lead-in like 'Start the broth: ...'", "..."],
  "verification": { "queries": ["string — every web search you ran to check novelty"], "verdict": "string — 1-2 sentences: what you searched, the nearest existing dishes, why this matches none of them" }
}`;

/* ---------------- setup ---------------- */

const today = new Date().toISOString().slice(0, 10);
const monthName = new Date().toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
const index = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8"));

if (index.recipes.some((r) => r.date === today)) {
  console.log(`Recipe for ${today} already exists — nothing to do.`);
  process.exit(0);
}

// Rotate categories: least-recently-used.
const lastUsed = new Map(CATEGORIES.map((c) => [c, "0000-00-00"]));
for (const r of index.recipes) {
  if (lastUsed.has(r.category) && r.date > lastUsed.get(r.category)) {
    lastUsed.set(r.category, r.date);
  }
}
const category = [...lastUsed.entries()].sort((a, b) => a[1].localeCompare(b[1]))[0][0];
const nextId = `RCP-${String(index.recipes.length + 1).padStart(3, "0")}`;

// Recent recipes, with year/region pulled from their files, to force spread.
const recent = index.recipes.slice(0, 5).map((r) => {
  try {
    const full = JSON.parse(fs.readFileSync(path.join(RECIPES_DIR, `${r.date}.json`), "utf8"));
    return `- "${full.title}" — diverged ${full.divergence.year} (${full.divergence.label}), ${full.region}, category ${r.category}`;
  } catch {
    return `- "${r.title}" (${r.category})`;
  }
});
const allTitles = index.recipes.map((r) => `- ${r.title}`).join("\n");

/* ---------------- API plumbing ---------------- */

const client = new Anthropic();

async function callClaude(prompt, { tools } = {}) {
  let messages = [{ role: "user", content: prompt }];
  let response;
  for (let i = 0; i < 10; i++) {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 64000,
      thinking: { type: "adaptive" },
      ...(tools ? { tools } : {}),
      messages,
    });
    response = await stream.finalMessage();
    if (response.stop_reason !== "pause_turn") break;
    messages = [...messages, { role: "assistant", content: response.content }];
  }
  const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
  const match = [...text.matchAll(/```json\s*([\s\S]*?)```/g)].pop();
  if (!match) throw new Error("No JSON block in model output");
  return JSON.parse(match[1]);
}

/* ---------------- stage 1: ideate ---------------- */

async function ideate() {
  const prompt = `You are the ideation stage for "Recipes That Don't Exist" — a site that publishes one recipe per day from an alternate-history timeline. Your only job is to propose premises; someone else will write the recipe.

Today's category: **${category}** — ${CATEGORY_HINTS[category]}

The last five recipes (do not reuse their centuries, their continents, or anything close to their premises):
${recent.join("\n") || "- (none yet)"}

Every published title (never propose a similar dish):
${allTitles || "- (none yet)"}

It is ${monthName}. Favor dishes whose fresh ingredients are in season in northern-hemisphere markets now, or that rely on pantry and preserved goods.

Propose exactly 5 premises. Each must:
- pivot on real, checkable history (a real battle, blight, treaty, technology, or migration that could have gone otherwise)
- name a specific year and place, in a different century AND on a different continent from the recipes listed above — and vary century/continent across your 5
- lead causally to ONE specific dish concept using real, purchasable ingredients
- differ sharply from each other in era, geography, and dish type

Output a single \`\`\`json block:
{"premises": [{"year": "...", "region": "...", "divergence": "one sentence, the real event bent", "dish": "one sentence dish concept", "keyIngredients": ["...", "..."], "whySurprising": "one sentence"}]}`;

  const out = await callClaude(prompt);
  if (!Array.isArray(out.premises) || out.premises.length < 3) throw new Error("Ideation returned too few premises");
  return out.premises;
}

/* ---------------- stage 2: craft + deep novelty check ---------------- */

async function craft(premises) {
  const prompt = `You are the author for "Recipes That Don't Exist" — one recipe per day that has never been published anywhere, from an alternate-history timeline.

${STYLE_GUIDE}

An ideation stage proposed these premises:
\`\`\`json
${JSON.stringify({ premises }, null, 2)}
\`\`\`

STEP 1 — JUDGE. Pick the single premise with the best balance of: surprise, causal tightness (the dish must follow inevitably from the divergence), and cookability (a competent home cook succeeds on the first try and it tastes good). You may sharpen the winning premise. Ignore sunk cost; most premises should lose.

STEP 2 — DEVELOP. Write the full recipe. Every ingredient real and purchasable, exact metric amounts, technique that actually works. Respect historical ingredient availability inside the fiction. The scenario is 150-200 words of restrained popular history.

STEP 3 — DEEP NOVELTY CHECK with web search. This is the heart of the job; be thorough:
a. Search the exact proposed dish name.
b. Search each unusual ingredient PAIRING as a quoted phrase — the 2-3 combinations doing the most work (e.g. "\\"miso caramel\\" torte", "\\"saffron congee\\"").
c. Reframe the dish in the vocabulary of its nearest real cuisines and search those names too. A saffron rice porridge with fish is findable as "congee", "juk", "risotto", or "arroz caldo" — search the names a food writer from each tradition would use.
d. If ANY published recipe substantially matches the dish (same core combination and form, even under a different name), revise the recipe and repeat a-c.
Record every final query in verification.queries (at least 4) and write an honest verdict naming the nearest existing dishes.

STEP 4 — GROUND THE HISTORY. Provide 3-4 "references": English Wikipedia articles about the REAL events, people, organisms, or foods your scenario bends. Canonical en.wikipedia.org URLs only; verify each article exists via web search. Never link the fictional outcome, only the real anchors.

Output the final recipe as a single \`\`\`json block matching exactly:
${RECIPE_SCHEMA}

Output nothing after the JSON block.`;

  return callClaude(prompt, {
    tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 16 }],
  });
}

/* ---------------- stage 3: soundness check ---------------- */

async function soundnessCheck(recipe) {
  const prompt = `You are the test-kitchen editor for a recipe site. Below is a recipe draft. Verify it would actually work in a home kitchen, and fix anything that would not.

Check, in order:
1. Quantities and ratios are plausible for the stated servings (flour:liquid, gelling, seasoning levels, pan sizes vs volumes).
2. Times and temperatures are correct for each technique (baking, reductions, proofing, frying).
3. Steps are in a workable order, nothing is used before it is prepared, and no listed ingredient goes unused (and nothing is used that is not listed).
4. The fiction is period-consistent (no ingredient that could not exist in that timeline's pantry).
5. Style: ${STYLE_GUIDE.split("\n").slice(1).join(" ")}

If corrections are needed, make them directly. Keep the dish's identity; do not redesign it.

\`\`\`json
${JSON.stringify(recipe, null, 2)}
\`\`\`

Output a single \`\`\`json block:
{"notes": "one or two sentences on what you changed, or 'No changes.'", "recipe": { ...the full corrected recipe, same schema as the input... }}`;

  const out = await callClaude(prompt);
  if (!out.recipe) throw new Error("Soundness check returned no recipe");
  console.log(`Test kitchen: ${out.notes}`);
  return out.recipe;
}

/* ---------------- validation ---------------- */

function validate(recipe) {
  for (const field of ["title", "tagline", "region", "divergence", "difficulty", "servings", "time", "scenario", "references", "ingredients", "method", "verification"]) {
    if (!recipe[field]) throw new Error(`Missing field: ${field}`);
  }
  if (!Array.isArray(recipe.references) || !recipe.references.every((x) => /^https:\/\/en\.wikipedia\.org\/wiki\//.test(x.url))) {
    throw new Error("references must be en.wikipedia.org links");
  }
  if (!Array.isArray(recipe.verification.queries) || recipe.verification.queries.length < 4) {
    throw new Error("verification.queries must record at least 4 searches");
  }
}

/* ---------------- main ---------------- */

let recipe;
for (let attempt = 1; attempt <= 3; attempt++) {
  try {
    console.log(`Attempt ${attempt}: generating ${nextId} (${category}) for ${today}...`);
    const premises = await ideate();
    console.log(`Ideated ${premises.length} premises.`);
    const draft = await craft(premises);
    console.log(`Drafted: ${draft.title}`);
    recipe = await soundnessCheck(draft);
    validate(recipe);
    break;
  } catch (err) {
    console.error(`Attempt ${attempt} failed: ${err.message}`);
    if (attempt === 3) process.exit(1);
  }
}

const full = {
  id: nextId,
  date: today,
  ...recipe,
  category,
  verification: { checkedAt: today, ...recipe.verification },
};

fs.writeFileSync(path.join(RECIPES_DIR, `${today}.json`), JSON.stringify(full, null, 2) + "\n");
index.recipes.unshift({ date: today, id: nextId, title: full.title, category });
index.recipes.sort((a, b) => b.date.localeCompare(a.date));
fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2) + "\n");

console.log(`Published ${nextId}: ${full.title}`);
