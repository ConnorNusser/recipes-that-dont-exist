import React, { useEffect, useState, useCallback } from "react";
import { BASE, todayUTC, currentStreak } from "./lib.js";
import Sidebar from "./Sidebar.jsx";
import Recipe from "./Recipe.jsx";
import About from "./About.jsx";

function useHash() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const fn = () => setHash(location.hash);
    window.addEventListener("hashchange", fn);
    return () => window.removeEventListener("hashchange", fn);
  }, []);
  return hash.replace(/^#\/?/, "");
}

function Countdown() {
  const [text, setText] = useState("--:--:--");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
      const s = Math.max(0, Math.floor((next - now) / 1000));
      const pad = (n) => String(n).padStart(2, "0");
      setText(`${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="countdown-chip" title="Time until the next recipe (00:00 UTC)">
      <span className="pulse-dot" />
      next recipe <span id="countdown">{text}</span>
    </div>
  );
}

export default function App() {
  const [index, setIndex] = useState(null);
  const [recipe, setRecipe] = useState(null);
  const [streak, setStreak] = useState(currentStreak());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const hash = useHash();

  useEffect(() => {
    fetch(`${BASE}recipes/index.json`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const today = todayUTC();
        const list = data.recipes.filter((r) => r.date <= today);
        list.sort((a, b) => b.date.localeCompare(a.date));
        setIndex(list);
      });
  }, []);

  const isAbout = hash === "about";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(hash) ? hash : index?.[0]?.date;

  useEffect(() => {
    if (!date || isAbout) return;
    setRecipe(null);
    fetch(`${BASE}recipes/${date}.json`, { cache: "no-store" })
      .then((r) => r.json())
      .then(setRecipe)
      .catch(() => setRecipe({ error: true }));
    setSidebarOpen(false);
  }, [date, isAbout]);

  const refreshStreak = useCallback(() => setStreak(currentStreak()), []);

  const crumb = isAbout ? "About" : recipe?.id || "—";

  return (
    <div className="app">
      <Sidebar
        index={index || []}
        activeDate={isAbout ? "about" : date}
        streak={streak}
        open={sidebarOpen}
      />
      <main className="main">
        <header className="topbar">
          <button className="menu-btn" aria-label="Menu" onClick={() => setSidebarOpen((v) => !v)}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M1 3.25c0-.41.34-.75.75-.75h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 3.25Zm0 4.75c0-.41.34-.75.75-.75h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 8Zm.75 4a.75.75 0 0 0 0 1.5h12.5a.75.75 0 0 0 0-1.5H1.75Z"/></svg>
          </button>
          <div className="breadcrumb">
            <span className="crumb-root">Recipes</span>
            <span className="crumb-sep">›</span>
            <span className="crumb-id">{crumb}</span>
          </div>
          <div className="topbar-right">
            <Countdown />
          </div>
        </header>

        <div className="content">
          {isAbout ? (
            <About />
          ) : !index ? (
            <div className="loading">Loading</div>
          ) : !date ? (
            <div className="loading">No recipes yet. The first one is on its way.</div>
          ) : !recipe ? (
            <div className="loading">Loading</div>
          ) : recipe.error ? (
            <div className="loading">That recipe couldn't be loaded.</div>
          ) : (
            <Recipe key={recipe.date} recipe={recipe} isToday={recipe.date === index[0]?.date} onPlayed={refreshStreak} />
          )}
        </div>
      </main>
    </div>
  );
}
