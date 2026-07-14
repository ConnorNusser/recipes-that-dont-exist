export const BASE = import.meta.env.BASE_URL;

export const CAT_COLORS = {
  "conquest": "#d0654f",
  "ecological-collapse": "#93ac60",
  "trade-route": "#dcae53",
  "technology": "#7ba3c9",
  "climate": "#7fbcc4",
  "taboo": "#b28bc0",
  "migration": "#d97757",
};
export const CAT_FALLBACK = "#a09a89";

export const catColor = (c) => CAT_COLORS[c] || CAT_FALLBACK;
export const catArt = (c) => `${BASE}assets/cat-${CAT_COLORS[c] ? c : "conquest"}.jpg`;
export const labelCat = (c) => (c || "unknown").replace(/-/g, " ");

export const todayUTC = () => new Date().toISOString().slice(0, 10);

export function fmtDate(iso) {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/* ---------- servings scaling ---------- */

const FRACTIONS = { "¼": 0.25, "½": 0.5, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3, "⅛": 0.125 };

export function parseServings(str) {
  const m = String(str).match(/\d+/);
  return m ? parseInt(m[0], 10) : 4;
}

function fmtQty(v) {
  if (v >= 10) return String(Math.round(v));
  const whole = Math.floor(v + 1e-9);
  const frac = v - whole;
  const near = (a, b) => Math.abs(a - b) < 0.04;
  for (const [ch, val] of Object.entries(FRACTIONS)) {
    if (near(frac, val)) return (whole ? whole : "") + ch;
  }
  if (near(frac, 0)) return String(whole);
  return String(Math.round(v * 10) / 10);
}

// Scale the leading quantity of an amount string, e.g. "1½ tbsp" at 2x becomes "3 tbsp"
export function scaleAmount(original, factor) {
  if (factor === 1 || !original) return original;
  const m = original.match(/^(\d+(?:\.\d+)?)?\s*([¼½¾⅓⅔⅛])?/);
  if (!m || (!m[1] && !m[2])) return original;
  const value = (m[1] ? parseFloat(m[1]) : 0) + (m[2] ? FRACTIONS[m[2]] : 0);
  const rest = original.slice(m[0].length);
  return fmtQty(value * factor) + (rest && !rest.startsWith(" ") ? " " : "") + rest;
}
