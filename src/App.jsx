import React, { useEffect, useState } from "react";
import { BASE, todayUTC } from "./lib.js";
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

export default function App() {
  const [index, setIndex] = useState(null);
  const [recipe, setRecipe] = useState(null);
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

  return (
    <div className="app">
      <button className="menu-btn" aria-label="Open archive" onClick={() => setSidebarOpen(true)}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M1 3.25c0-.41.34-.75.75-.75h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 3.25Zm0 4.75c0-.41.34-.75.75-.75h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 8Zm.75 4a.75.75 0 0 0 0 1.5h12.5a.75.75 0 0 0 0-1.5H1.75Z"/></svg>
      </button>

      {sidebarOpen && <div className="backdrop" onClick={() => setSidebarOpen(false)} />}
      <Sidebar
        index={index || []}
        activeDate={isAbout ? "about" : date}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {isAbout ? (
        <About />
      ) : !index || (date && !recipe) ? (
        <div className="loading">Loading</div>
      ) : !date ? (
        <div className="loading">No recipes yet. The first one is on its way.</div>
      ) : recipe.error ? (
        <div className="loading">That recipe couldn't be loaded.</div>
      ) : (
        <Recipe key={recipe.date} recipe={recipe} isToday={recipe.date === index[0]?.date} />
      )}
    </div>
  );
}
