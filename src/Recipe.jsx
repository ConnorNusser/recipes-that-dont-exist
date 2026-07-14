import React, { useEffect, useMemo, useState } from "react";
import { catColor, catArt, labelCat, fmtDate, parseServings, scaleAmount } from "./lib.js";

function IngredientRow({ amount, item, factor }) {
  const [checked, setChecked] = useState(false);
  return (
    <div className={`ing-row${checked ? " checked" : ""}`} onClick={() => setChecked(!checked)}>
      <span className="ing-check" />
      <span className="ing-amount">{scaleAmount(amount, factor)}</span>
      <span className="ing-item">{item}</span>
    </div>
  );
}

function Step({ num, text }) {
  const [done, setDone] = useState(false);
  return (
    <div className={`step${done ? " done" : ""}`} onClick={() => setDone(!done)}>
      <span className="step-num">{num}</span>
      <span className="step-text">{text}</span>
    </div>
  );
}

function NextRecipe() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const secondsLeft = Math.max(0, Math.floor((next - now) / 1000));
  const pad = (n) => String(n).padStart(2, "0");
  const time = `${pad(Math.floor(secondsLeft / 3600))}:${pad(Math.floor((secondsLeft % 3600) / 60))}:${pad(secondsLeft % 60)}`;
  const dayElapsed = 1 - secondsLeft / 86400;

  return (
    <div className="next-card">
      <div className="next-row">
        <span className="next-label">Next recipe</span>
        <span className="next-time">{time}</span>
      </div>
      <div className="next-bar">
        <div className="next-fill" style={{ width: `${(dayElapsed * 100).toFixed(2)}%` }} />
      </div>
      <div className="next-sub">A new dish from a new timeline, every day at 00:00 UTC.</div>
    </div>
  );
}

export default function Recipe({ recipe: r, isToday }) {
  const base = useMemo(() => parseServings(r.servings), [r.servings]);
  const [servings, setServings] = useState(base);
  const factor = servings / base;
  const color = catColor(r.category);
  const unit = /piece|makes/i.test(r.servings) ? "Pieces" : "Servings";
  const number = r.id.replace(/^RCP-/, "No. ");

  return (
    <div className="recipe-page">
      <header className="recipe-head">
        <div className="medallion">
          <img src={catArt(r.category)} alt="" />
        </div>
        <div className="overline" style={{ "--cat-color": color }}>
          <span>{number}</span>
          <span className="sep">·</span>
          <span className="cat">{labelCat(r.category)}</span>
          <span className="sep">·</span>
          <span>{isToday ? `Today, ${fmtDate(r.date)}` : fmtDate(r.date)}</span>
        </div>
        <h1 className="issue-title">{r.title}</h1>
        <p className="issue-tagline">{r.tagline}</p>
      </header>

      <div className="meta">
        <div className="meta-item">
          <div className="meta-label">{unit}</div>
          <div className="meta-value stepper-ctl">
            <button aria-label="Fewer" onClick={() => servings > 1 && setServings(servings - 1)}>−</button>
            <b>{servings}</b>
            <button aria-label="More" onClick={() => servings < 99 && setServings(servings + 1)}>+</button>
          </div>
        </div>
        <div className="meta-item">
          <div className="meta-label">Diverged</div>
          <div className="meta-value">{r.divergence.year}<small>{r.divergence.label}</small></div>
        </div>
        <div className="meta-item">
          <div className="meta-label">Region</div>
          <div className="meta-value">{r.region}</div>
        </div>
        <div className="meta-item">
          <div className="meta-label">Difficulty</div>
          <div className="meta-value">{r.difficulty}</div>
        </div>
        <div className="meta-item">
          <div className="meta-label">Time</div>
          <div className="meta-value">{r.time}</div>
        </div>
      </div>

      <div className="section-label">The timeline</div>
      <div className="scenario-body">{r.scenario}</div>

      <div className="section-label">Ingredients</div>
      <div>
        {r.ingredients.map((group, gi) => (
          <div className="ing-group" key={gi}>
            {group.group && <div className="ing-group-name">{group.group}</div>}
            {group.items.map((item, ii) => (
              <IngredientRow key={ii} amount={item.amount} item={item.item} factor={factor} />
            ))}
          </div>
        ))}
      </div>

      <div className="section-label">Method</div>
      <div>
        {r.method.map((step, i) => <Step key={i} num={i + 1} text={step} />)}
      </div>

      <div className="section-label">Novelty check</div>
      <div className="verify-card">
        <svg className="verify-icon" width="17" height="17" viewBox="0 0 16 16" fill="currentColor"><path d="M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16Zm3.78-9.72a.75.75 0 0 0-1.06-1.06L6.75 9.19 5.28 7.72a.75.75 0 0 0-1.06 1.06l2 2c.3.3.77.3 1.06 0l4.5-4.5Z"/></svg>
        <div>
          <div className="verify-title">No published match found</div>
          <div className="verify-body">
            {r.verification.verdict}{" "}
            <span style={{ color: "var(--text-tertiary)" }}>Checked {r.verification.checkedAt}.</span>
          </div>
          <div className="verify-queries">
            {r.verification.queries.map((q, i) => <span className="query-tag" key={i}>{q}</span>)}
          </div>
        </div>
      </div>

      <NextRecipe />
    </div>
  );
}
