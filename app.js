/* Recipes That Don't Exist — daily alt-history recipes, warm Claude-style */

const CAT_COLORS = {
  "conquest": "#c14e3b",
  "ecological-collapse": "#6e8b3d",
  "trade-route": "#d99a2b",
  "technology": "#4a7ba6",
  "climate": "#5e9fa8",
  "taboo": "#9c6baa",
  "migration": "#d97757",
};
const CAT_EMOJI = {
  "conquest": "⚔️",
  "ecological-collapse": "🌾",
  "trade-route": "⛵",
  "technology": "⚙️",
  "climate": "🌦️",
  "taboo": "🕯️",
  "migration": "🧭",
};
const CAT_FALLBACK = "#a09a89";

const state = { index: [], cache: {}, current: null };

const $ = (sel) => document.querySelector(sel);

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(iso) {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/* ---------- storage (streak + played state) ---------- */

function store() {
  try { return JSON.parse(localStorage.getItem("rtde") || "{}"); } catch { return {}; }
}
function save(s) { localStorage.setItem("rtde", JSON.stringify(s)); }

function recordPlay(date, won) {
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

function currentStreak() {
  const s = store();
  if (!s.lastWin) return 0;
  const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  return (s.lastWin === todayUTC() || s.lastWin === yesterday) ? (s.streak || 0) : 0;
}

function renderStreak() {
  $("#streak-count").textContent = currentStreak();
}

/* ---------- countdown to 00:00 UTC ---------- */

function tickCountdown() {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  let s = Math.max(0, Math.floor((next - now) / 1000));
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  $("#countdown").textContent = `${h}:${m}:${sec}`;
}

/* ---------- confetti ---------- */

function confetti() {
  const colors = ["#d97757", "#d99a2b", "#6e8b3d", "#c14e3b", "#5e9fa8", "#f2c94c", "#9c6baa"];
  const layer = document.createElement("div");
  layer.className = "confetti-layer";
  for (let i = 0; i < 90; i++) {
    const bit = document.createElement("div");
    bit.className = "confetti-bit";
    bit.style.left = Math.random() * 100 + "vw";
    bit.style.background = colors[i % colors.length];
    bit.style.animationDuration = 1.6 + Math.random() * 1.6 + "s";
    bit.style.animationDelay = Math.random() * 0.5 + "s";
    bit.style.transform = `rotate(${Math.random() * 360}deg)`;
    layer.appendChild(bit);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 3800);
}

/* ---------- data ---------- */

async function loadIndex() {
  const res = await fetch("recipes/index.json", { cache: "no-store" });
  const data = await res.json();
  const today = todayUTC();
  state.index = data.recipes.filter((r) => r.date <= today);
  state.index.sort((a, b) => b.date.localeCompare(a.date));
}

async function loadRecipe(date) {
  if (!state.cache[date]) {
    const res = await fetch(`recipes/${date}.json`, { cache: "no-store" });
    state.cache[date] = await res.json();
  }
  return state.cache[date];
}

/* ---------- sidebar ---------- */

function renderSidebar() {
  const list = $("#archive-list");
  list.innerHTML = "";
  for (const r of state.index) {
    const a = document.createElement("a");
    a.className = "archive-item";
    a.href = `#/${r.date}`;
    a.dataset.date = r.date;
    a.innerHTML = `
      <span class="cat-dot" style="background:${CAT_COLORS[r.category] || CAT_FALLBACK}"></span>
      <span class="archive-id">${esc(r.id)}</span>
      <span class="archive-title">${esc(r.title)}</span>`;
    list.appendChild(a);
  }
  $("#nav-today").href = state.index.length ? `#/${state.index[0].date}` : "#";
}

function markActive(date) {
  document.querySelectorAll(".archive-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.date === date);
  });
  $("#nav-today").classList.toggle("active", state.index.length > 0 && date === state.index[0].date);
  $("#nav-about").classList.toggle("active", date === "about");
}

/* ---------- helpers ---------- */

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// deterministic shuffle seeded by date so option order is stable per day
function seededOrder(n, seedStr) {
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

function parseServings(str) {
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

// Scale the leading quantity of an amount string, e.g. "1½ tbsp" × 2 → "3 tbsp"
function scaleAmount(original, factor) {
  if (factor === 1 || !original) return original;
  const m = original.match(/^(\d+(?:\.\d+)?)?\s*([¼½¾⅓⅔⅛])?/);
  if (!m || (!m[1] && !m[2])) return original;
  let value = (m[1] ? parseFloat(m[1]) : 0) + (m[2] ? FRACTIONS[m[2]] : 0);
  const scaled = value * factor;
  const rest = original.slice(m[0].length);
  return fmtQty(scaled) + (rest && !rest.startsWith(" ") ? " " : "") + rest;
}

/* ---------- recipe rendering ---------- */

function renderRecipe(r) {
  state.current = r;
  $("#crumb-id").textContent = r.id;
  const isToday = state.index.length && r.date === state.index[0].date;
  const catColor = CAT_COLORS[r.category] || CAT_FALLBACK;
  const emoji = CAT_EMOJI[r.category] || "🍲";
  const played = store().played?.[r.date];
  const baseServings = parseServings(r.servings);

  const el = document.createElement("div");
  el.className = "recipe-page";
  el.innerHTML = `
    <div class="hero" style="--hero-tint:${catColor}2e">
      <span class="hero-emoji">${emoji}</span>
      <div class="issue-meta-row">
        ${isToday ? `<span class="chip chip-today">Today · ${fmtDate(r.date)}</span>` : `<span class="chip">${fmtDate(r.date)}</span>`}
        <span class="chip"><span class="dot" style="background:${catColor}"></span>${esc(labelCat(r.category))}</span>
        <span class="chip">✦ unattested in this timeline</span>
      </div>
      <h1 class="issue-title">${esc(r.title)}</h1>
      <p class="issue-tagline">${esc(r.tagline)}</p>
    </div>

    <div class="props">
      <span class="prop stepper">
        <button id="serv-minus" aria-label="Fewer servings">−</button>
        <b id="serv-count">${baseServings}</b>
        <button id="serv-plus" aria-label="More servings">+</button>
        <span id="serv-label">servings</span>
      </span>
      <span class="prop">Diverged <b>${esc(r.divergence.year)}</b></span>
      <span class="prop">${esc(r.divergence.label)}</span>
      <span class="prop">${esc(r.region)}</span>
      <span class="prop"><b>${esc(r.difficulty)}</b></span>
      <span class="prop">${esc(r.time)}</span>
    </div>

    <div class="section-label">The timeline</div>
    <div id="scenario-slot"></div>

    <div class="section-label">Ingredients <small>tap to check off</small></div>
    <div id="ingredients"></div>

    <div class="section-label">Method <small>tap steps as you go</small></div>
    <div id="method"></div>

    <div class="section-label">Novelty check</div>
    <div class="verify-card">
      <svg class="verify-icon" width="17" height="17" viewBox="0 0 16 16" fill="currentColor"><path d="M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16Zm3.78-9.72a.75.75 0 0 0-1.06-1.06L6.75 9.19 5.28 7.72a.75.75 0 0 0-1.06 1.06l2 2c.3.3.77.3 1.06 0l4.5-4.5Z"/></svg>
      <div>
        <div class="verify-title">No published match found</div>
        <div class="verify-body">${esc(r.verification.verdict)} <span style="color:var(--text-tertiary)">Checked ${esc(r.verification.checkedAt)}.</span></div>
        <div class="verify-queries">${r.verification.queries.map((q) => `<span class="query-tag">${esc(q)}</span>`).join("")}</div>
      </div>
    </div>
  `;

  // scenario: game for today's unplayed recipe, otherwise reveal
  const slot = el.querySelector("#scenario-slot");
  if (isToday && !played) {
    slot.appendChild(buildGame(r));
  } else {
    slot.appendChild(buildScenario(r, played));
  }

  // ingredients
  const ing = el.querySelector("#ingredients");
  for (const group of r.ingredients) {
    const g = document.createElement("div");
    g.className = "ing-group";
    if (group.group) g.innerHTML = `<div class="ing-group-name">${esc(group.group)}</div>`;
    for (const item of group.items) {
      const row = document.createElement("div");
      row.className = "ing-row";
      row.innerHTML = `<span class="ing-check"></span><span class="ing-amount" data-original="${esc(item.amount)}">${esc(item.amount)}</span><span class="ing-item">${esc(item.item)}</span>`;
      row.addEventListener("click", () => row.classList.toggle("checked"));
      g.appendChild(row);
    }
    ing.appendChild(g);
  }

  // servings stepper
  let servings = baseServings;
  const rescale = () => {
    el.querySelector("#serv-count").textContent = servings;
    const factor = servings / baseServings;
    el.querySelectorAll(".ing-amount").forEach((span) => {
      span.textContent = scaleAmount(span.dataset.original, factor);
    });
  };
  el.querySelector("#serv-minus").addEventListener("click", () => { if (servings > 1) { servings--; rescale(); } });
  el.querySelector("#serv-plus").addEventListener("click", () => { if (servings < 99) { servings++; rescale(); } });
  el.querySelector("#serv-label").textContent = /piece|makes/i.test(r.servings) ? "pieces" : "servings";

  // method — steps check off as you cook
  const method = el.querySelector("#method");
  r.method.forEach((step, i) => {
    const s = document.createElement("div");
    s.className = "step";
    s.innerHTML = `<span class="step-num">${i + 1}</span><span class="step-text">${esc(step)}</span>`;
    s.addEventListener("click", () => s.classList.toggle("done"));
    method.appendChild(s);
  });

  const content = $("#content");
  content.innerHTML = "";
  content.appendChild(el);
  content.scrollTop = 0;
}

function labelCat(c) {
  return (c || "unknown").replace(/-/g, " ");
}

function buildScenario(r, played) {
  const wrap = document.createElement("div");
  let note = "";
  if (played === "win") note = `<div class="reveal-note">✓ You guessed this timeline correctly.</div>`;
  if (played === "lose") note = `<div class="reveal-note">✗ You guessed a decoy timeline that day.</div>`;
  wrap.innerHTML = `<div class="scenario-body">${esc(r.scenario)}</div>${note}`;
  return wrap;
}

function buildGame(r) {
  const card = document.createElement("div");
  card.className = "game-card";
  card.innerHTML = `
    <div class="game-title">Which timeline cooked this?</div>
    <div class="game-sub">Read the ingredients below, then pick the point of divergence. One guess per day — a correct pick extends your streak.</div>
  `;

  const options = [
    { text: r.scenarioSummary, real: true },
    { text: r.decoys[0], real: false },
    { text: r.decoys[1], real: false },
  ];
  const order = seededOrder(3, r.date);
  const keys = ["1", "2", "3"];
  const buttons = [];

  order.forEach((idx, pos) => {
    const opt = options[idx];
    const btn = document.createElement("button");
    btn.className = "option";
    btn.innerHTML = `<span class="key">${keys[pos]}</span><span>${esc(opt.text)}</span>`;
    btn.addEventListener("click", () => resolve(opt, btn));
    buttons.push({ btn, opt });
    card.appendChild(btn);
  });

  const keyHandler = (e) => {
    const pos = keys.indexOf(e.key);
    if (pos >= 0 && buttons[pos] && !buttons[pos].btn.disabled) {
      resolve(buttons[pos].opt, buttons[pos].btn);
    }
  };
  document.addEventListener("keydown", keyHandler);

  function resolve(opt, btn) {
    document.removeEventListener("keydown", keyHandler);
    const won = opt.real;
    recordPlay(r.date, won);
    renderStreak();
    if (won) confetti();
    for (const { btn: b, opt: o } of buttons) {
      b.disabled = true;
      if (o.real) b.classList.add("correct");
      else if (b === btn) b.classList.add("wrong");
      else b.classList.add("dimmed");
    }
    const result = document.createElement("div");
    result.className = `game-result ${won ? "win" : "lose"}`;
    result.textContent = won
      ? `Correct — streak ${currentStreak()} 🔥 Here's the full timeline:`
      : "Not this time. Here's what actually diverged:";
    card.appendChild(result);

    const reveal = buildScenario(r);
    reveal.style.marginTop = "14px";
    card.appendChild(reveal);
  }

  return card;
}

/* ---------- about ---------- */

function renderAbout() {
  $("#crumb-id").textContent = "About";
  const content = $("#content");
  content.innerHTML = `
    <div class="about">
      <h1>Recipes that don't exist</h1>
      <p>Every day at 00:00 UTC, this site publishes one recipe that has never been published anywhere — verified by web search before it ships. Each dish comes from a timeline that diverged from ours: a conquest that went the other way, a crop that went extinct, a trade route that opened three centuries early.</p>
      <p>The ingredients are real and the techniques work. The history is the only fictional ingredient.</p>
      <p>Before you read the timeline, you get one guess: three points of divergence, one of them real (well — "real"). A correct guess extends your streak. Come back tomorrow.</p>
      <p class="muted">Generated daily by Claude with web-search novelty verification. Recipes are checked against published sources at generation time; if a match exists, the recipe is revised until it doesn't.</p>
    </div>`;
  markActive("about");
}

/* ---------- routing ---------- */

async function route() {
  const hash = location.hash.replace(/^#\/?/, "");
  if (hash === "about") return renderAbout();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(hash) ? hash : (state.index[0] && state.index[0].date);
  if (!date) {
    $("#content").innerHTML = `<div class="loading">No recipes yet — the first drop is coming.</div>`;
    return;
  }
  markActive(date);
  try {
    const r = await loadRecipe(date);
    renderRecipe(r);
  } catch {
    $("#content").innerHTML = `<div class="loading">Couldn't load that recipe.</div>`;
  }
  $("#sidebar").classList.remove("open");
}

/* ---------- init ---------- */

(async function init() {
  tickCountdown();
  setInterval(tickCountdown, 1000);
  $("#menu-btn").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
  window.addEventListener("hashchange", route);
  await loadIndex();
  renderSidebar();
  renderStreak();
  route();
})();
