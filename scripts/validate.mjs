/**
 * Validation gate for a recipe file. Used by the daily-recipe Claude skill
 * (and available to humans) before committing a generated recipe.
 *
 * Usage: node scripts/validate.mjs public/recipes/2026-07-15.json
 * Exits 0 on pass; prints every failure and exits 1 otherwise.
 */

import fs from "node:fs";
import path from "node:path";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/validate.mjs <recipe.json>");
  process.exit(1);
}

const errors = [];
const recipe = JSON.parse(fs.readFileSync(file, "utf8"));
const indexPath = path.join(path.dirname(file), "index.json");
const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));

// Required fields
for (const field of ["id", "date", "title", "tagline", "region", "divergence", "difficulty", "servings", "time", "scenario", "references", "category", "ingredients", "method", "verification"]) {
  if (!recipe[field]) errors.push(`Missing field: ${field}`);
}

// Shapes
if (!/^RCP-\d{3}$/.test(recipe.id || "")) errors.push(`Bad id: ${recipe.id}`);
if (!/^\d{4}-\d{2}-\d{2}$/.test(recipe.date || "")) errors.push(`Bad date: ${recipe.date}`);
if (recipe.divergence && (!recipe.divergence.year || !recipe.divergence.label)) errors.push("divergence needs year and label");

// Scenario length
const words = (recipe.scenario || "").split(/\s+/).filter(Boolean).length;
if (words < 110 || words > 240) errors.push(`Scenario is ${words} words (want 150-200)`);

// References: 3-4 canonical Wikipedia links
if (!Array.isArray(recipe.references) || recipe.references.length < 3) {
  errors.push("Need at least 3 references");
} else {
  for (const ref of recipe.references) {
    if (!ref.title || !/^https:\/\/en\.wikipedia\.org\/wiki\/[^ ]+$/.test(ref.url || "")) {
      errors.push(`Bad reference: ${JSON.stringify(ref)}`);
    }
  }
}

// Ingredients structure
if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
  errors.push("ingredients must be a non-empty array of groups");
} else {
  for (const g of recipe.ingredients) {
    if (!Array.isArray(g.items) || g.items.length === 0) errors.push(`Ingredient group "${g.group}" has no items`);
    for (const it of g.items || []) {
      if (typeof it.item !== "string" || !it.item) errors.push("Ingredient item missing text");
      if (typeof it.amount !== "string") errors.push(`Ingredient "${it.item}" amount must be a string (may be empty)`);
    }
  }
}

// Method
if (!Array.isArray(recipe.method) || recipe.method.length < 4) errors.push("method needs at least 4 steps");

// Verification: at least 4 recorded searches + a verdict
if (!Array.isArray(recipe.verification?.queries) || recipe.verification.queries.length < 4) {
  errors.push("verification.queries must record at least 4 searches");
}
if (!recipe.verification?.verdict) errors.push("verification.verdict missing");

// Style: no emoji anywhere, no em/en dashes anywhere (URLs exempt), no exclamation marks in prose
const flatStrings = [];
(function walk(v, key) {
  if (typeof v === "string") { if (key !== "url") flatStrings.push(v); }
  else if (Array.isArray(v)) v.forEach((x) => walk(x, key));
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, k);
})(recipe, "");
const flat = flatStrings.join("\n");
if (/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u.test(flat)) errors.push("Emoji detected: not allowed anywhere");
if (/[–—]/.test(flat)) errors.push("Em/en dash detected: use periods, commas, colons, or hyphens");
if (/!/.test(recipe.scenario || "") || /!/.test(recipe.tagline || "")) errors.push("Exclamation mark in scenario or tagline");

// Index consistency
const entry = index.recipes.find((r) => r.date === recipe.date);
if (!entry) errors.push(`No index.json entry for ${recipe.date}`);
else {
  if (entry.title !== recipe.title) errors.push("index.json title does not match recipe");
  if (entry.id !== recipe.id) errors.push("index.json id does not match recipe");
  if (entry.category !== recipe.category) errors.push("index.json category does not match recipe");
}

// References resolve (network best-effort: tolerate rate limiting, fail on 404)
for (const ref of recipe.references || []) {
  try {
    const res = await fetch(ref.url, { method: "HEAD", redirect: "follow", headers: { "user-agent": "recipes-validate/1.0" } });
    if (res.status === 404) errors.push(`Reference 404s: ${ref.url}`);
  } catch {
    console.warn(`(network) Could not check ${ref.url} — skipping`);
  }
}

if (errors.length) {
  console.error(`FAIL — ${file}:`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`PASS — ${file} (${recipe.id}: ${recipe.title})`);
