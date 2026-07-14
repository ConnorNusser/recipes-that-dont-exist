import React, { useEffect, useState } from "react";
import { BASE, todayUTC } from "./lib.js";
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

function Arrow({ dir, target, title }) {
  const disabled = !target;
  return (
    <a
      className={`nav-arrow ${dir}${disabled ? " disabled" : ""}`}
      href={disabled ? undefined : `#/${target}`}
      title={disabled ? undefined : title}
      aria-label={dir === "prev" ? "Earlier recipe" : "Later recipe"}
    >
      {dir === "prev" ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M9.78 12.78a.75.75 0 0 1-1.06 0L4.47 8.53a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 1 1 1.06 1.06L6.06 8l3.72 3.72a.75.75 0 0 1 0 1.06Z"/></svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z"/></svg>
      )}
    </a>
  );
}

export default function App() {
  const [index, setIndex] = useState(null);
  const [recipe, setRecipe] = useState(null);
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
  }, [date, isAbout]);

  // index is newest-first: "older" is the next entry, "newer" the previous
  const pos = index && date ? index.findIndex((r) => r.date === date) : -1;
  const older = pos >= 0 ? index[pos + 1] : null;
  const newer = pos > 0 ? index[pos - 1] : null;

  useEffect(() => {
    const fn = (e) => {
      if (isAbout) return;
      if (e.key === "ArrowLeft" && older) location.hash = `#/${older.date}`;
      if (e.key === "ArrowRight" && newer) location.hash = `#/${newer.date}`;
    };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [isAbout, older, newer]);

  return (
    <div className="app">
      {!isAbout && index && (
        <>
          <Arrow dir="prev" target={older?.date} title={older?.title} />
          <Arrow dir="next" target={newer?.date} title={newer?.title} />
        </>
      )}

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
