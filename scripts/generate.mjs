/**
 * Daily recipe generator.
 *
 * Generates one alt-history recipe that does not exist anywhere, using the
 * Claude API with the web_search server tool to verify novelty before
 * publishing. Writes recipes/<date>.json and updates recipes/index.json.
 *
 * Requires ANTHROPIC_API_KEY. Run: node scripts/generate.mjs
 */

import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const RECIPES_DIR = path.join(ROOT, "public", "recipes");
const INDEX_PATH = path.join(RECIPES_DIR, "index.json");

const CATEGORIES = [
  "conquest",            // an invasion/empire went the other way
  "ecological-collapse", // a crop, species, or resource vanished
  "trade-route",         // a trade route opened (or closed) centuries off-schedule
  "technology",          // a food technology arrived early or never
  "climate",             // drought, frost, a shifted growing zone
  "taboo",               // a religious/legal food rule took a different path
  "migration",           // a people ended up somewhere else entirely
];

const today = new Date().toISOString().slice(0, 10);
const index = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8"));

if (index.recipes.some((r) => r.date === today)) {
  console.log(`Recipe for ${today} already exists — nothing to do.`);
  process.exit(0);
}

// Rotate categories: pick the least-recently-used one.
const lastUsed = new Map(CATEGORIES.map((c) => [c, "0000-00-00"]));
for (const r of index.recipes) {
  if (lastUsed.has(r.category) && r.date > lastUsed.get(r.category)) {
    lastUsed.set(r.category, r.date);
  }
}
const category = [...lastUsed.entries()].sort((a, b) => a[1].localeCompare(b[1]))[0][0];

const nextId = `RCP-${String(index.recipes.length + 1).padStart(3, "0")}`;
const existingTitles = index.recipes.map((r) => `- ${r.title} (${r.category})`).join("\n");

const SCHEMA_EXAMPLE = `{
  "title": "string — the dish name, specific and evocative",
  "tagline": "string — one sentence hook",
  "region": "string — where in the alt-timeline this is eaten",
  "divergence": { "year": "string", "label": "string — 2-6 word name for the divergence event" },
  "difficulty": "Easy | Medium | Hard",
  "servings": "string, e.g. 'Serves 4'",
  "time": "string, e.g. '1 hr 20 min'",
  "scenario": "string — 150-200 words. How this timeline diverged and how it produced this exact dish. Concrete dates, names, causality. Period-accurate ingredients (e.g. no tomatoes in Europe before 1500s).",
  "references": [ { "title": "string — Wikipedia article title", "url": "https://en.wikipedia.org/wiki/..." } ],
  "ingredients": [ { "group": "string — section name", "items": [ { "amount": "string with metric units", "item": "string" } ] } ],
  "method": ["string — step 1", "..."],
  "verification": { "queries": ["string — each web search you ran to check novelty"], "verdict": "string — 1-2 sentences: what you searched, what the nearest existing dishes are, why this doesn't match any of them" }
}`;

const PROMPT = `You are the daily recipe author for "Recipes That Don't Exist" — a site that publishes one recipe per day that has never been published anywhere on Earth, born from an alternate-history timeline.

Today's category: **${category}**
${CATEGORY_HINT(category)}

Already published (do NOT repeat these dishes, core techniques, or scenarios):
${existingTitles || "- (none yet)"}

Voice and style — this matters as much as the content:
- Write like a good food-history writer: plain, concrete, specific. Dates, names, quantities, causes.
- No emojis anywhere, in any field. No exclamation marks. No rhetorical questions.
- Avoid breathless or promotional language: never "elevate", "delightful", "magical", "a symphony of", "takes X to the next level", "rich tapestry".
- Prefer periods over em dashes. Short sentences are fine.
- The tagline is one flat declarative sentence, not a pitch.

Requirements:
1. Invent a dish from a specific alternate timeline. The divergence must be concrete (a year, an event) and the dish must follow *causally* from it. The scenario is 150-200 words of restrained popular history.
2. Every ingredient must be REAL and purchasable today, with exact metric amounts. The technique must actually work — a competent home cook should be able to cook this and have it taste good. Respect historical ingredient availability inside the fiction (e.g. no New World crops in pre-1500 Europe).
3. VERIFY NOVELTY with web search before finalizing: search the proposed dish name and 2-3 searches for its key ingredient/technique combinations. If you find a published recipe that substantially matches, revise the dish and search again. Record your final queries and verdict in the verification field.
4. GROUND THE HISTORY: the divergence must pivot on real, checkable history. Provide 3-4 "references" — English Wikipedia articles about the real events, people, organisms, or foods your scenario bends (the battle that went differently, the crop disease, the ingredient's real origin). Use canonical en.wikipedia.org URLs and verify each article exists (web search) before including it. Do not link articles about the fictional outcome, only the real anchors.

When you are confident the dish does not exist, output the final recipe as a single JSON object in a \`\`\`json fenced code block, matching exactly this shape:

${SCHEMA_EXAMPLE}

Output nothing after the JSON block.`;

function CATEGORY_HINT(cat) {
  const hints = {
    "conquest": "An invasion, occupation, or empire that went differently — two cuisines forced together.",
    "ecological-collapse": "A staple crop, fish stock, or species that disappeared — cuisine rebuilt around the gap.",
    "trade-route": "A trade route that opened or closed centuries off-schedule — ingredients arriving where they never did.",
    "technology": "A food technology (canning, refrigeration, distillation, nixtamalization...) arriving early, late, or never.",
    "climate": "A drought, frost, or shifted growing zone that rewrote what a region could grow.",
    "taboo": "A religious or legal food rule that took a different path — a forbidden ingredient embraced, or a common one banned.",
    "migration": "A people who ended up somewhere else entirely, carrying their pantry into a foreign larder.",
  };
  return hints[cat] || "";
}

const client = new Anthropic();

async function generateOnce(attempt) {
  console.log(`Attempt ${attempt}: generating ${nextId} (${category}) for ${today}...`);

  let messages = [{ role: "user", content: PROMPT }];
  let response;

  // Manual loop to handle pause_turn from the server-side web_search tool.
  for (let i = 0; i < 8; i++) {
    const stream = client.messages.stream({
      model: "claude-opus-4-8",
      max_tokens: 64000,
      thinking: { type: "adaptive" },
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 10 }],
      messages,
    });
    response = await stream.finalMessage();
    if (response.stop_reason !== "pause_turn") break;
    messages = [...messages, { role: "assistant", content: response.content }];
  }

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  const match = [...text.matchAll(/```json\s*([\s\S]*?)```/g)].pop();
  if (!match) throw new Error("No JSON block in model output");
  const recipe = JSON.parse(match[1]);

  for (const field of ["title", "tagline", "region", "divergence", "difficulty", "servings", "time", "scenario", "references", "ingredients", "method", "verification"]) {
    if (!recipe[field]) throw new Error(`Missing field: ${field}`);
  }
  if (!Array.isArray(recipe.references) || !recipe.references.every((x) => /^https:\/\/en\.wikipedia\.org\/wiki\//.test(x.url))) {
    throw new Error("references must be en.wikipedia.org links");
  }
  return recipe;
}

let recipe;
for (let attempt = 1; attempt <= 3; attempt++) {
  try {
    recipe = await generateOnce(attempt);
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
