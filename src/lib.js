export const BASE = import.meta.env.BASE_URL;

export const CAT_COLORS = {
  "conquest": "#c14e3b",
  "ecological-collapse": "#6e8b3d",
  "trade-route": "#d99a2b",
  "technology": "#4a7ba6",
  "climate": "#5e9fa8",
  "taboo": "#9c6baa",
  "migration": "#d97757",
};
export const CAT_FALLBACK = "#a09a89";

export const catColor = (c) => CAT_COLORS[c] || CAT_FALLBACK;
export const catArt = (c) => `${BASE}assets/cat-${CAT_COLORS[c] ? c : "conquest"}.jpg`;
export const labelCat = (c) => (c || "unknown").replace(/-/g, " ");

export const todayUTC = () => new Date().toISOString().slice(0, 10);

export function fmtDate(iso) {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/* ---------- storage (streak + played state) ---------- */

export function store() {
  try { return JSON.parse(localStorage.getItem("rtde") || "{}"); } catch { return {}; }
}
function save(s) { localStorage.setItem("rtde", JSON.stringify(s)); }

export function recordPlay(date, won) {
  const s = store();
  s.played = s.played || {};
  if (s.played[date]) return s; // one guess per day
  s.played[date] = won ? "win" : "lose";
  if (won) {
    const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    s.streak = (s.lastWin === yesterday ? (s.streak || 0) : 0) + 1;
    s.lastWin = date;
    s.best = Math.max(s.best || 0, s.streak);
  } else {
    s.streak = 0;
  }
  save(s);
  return s;
}

export function currentStreak() {
  const s = store();
  if (!s.lastWin) return 0;
  const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  return (s.lastWin === todayUTC() || s.lastWin === yesterday) ? (s.streak || 0) : 0;
}

/* ---------- deterministic option order, seeded by date ---------- */

export function seededOrder(n, seedStr) {
  let seed = 0;
  for (const ch of seedStr) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const arr = [...Array(n).keys()];
  for (let i = arr.length - 1; i > 0; i--) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
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

/* ---------- confetti ---------- */

export function confetti() {
  const colors = ["#d97757", "#d99a2b", "#6e8b3d", "#c14e3b", "#5e9fa8", "#9c6baa"];
  const layer = document.createElement("div");
  layer.className = "confetti-layer";
  for (let i = 0; i < 90; i++) {
    const bit = document.createElement("div");
    bit.className = "confetti-bit";
    bit.style.left = Math.random() * 100 + "vw";
    bit.style.background = colors[i % colors.length];
    bit.style.animationDuration = 1.6 + Math.random() * 1.6 + "s";
    bit.style.animationDelay = Math.random() * 0.5 + "s";
    layer.appendChild(bit);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 3800);
}
