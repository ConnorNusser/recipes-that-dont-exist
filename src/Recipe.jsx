import React, { useMemo, useState } from "react";
import { catColor, catArt, labelCat, fmtDate, parseServings, scaleAmount, store } from "./lib.js";
import Game from "./Game.jsx";

function Scenario({ recipe, played }) {
  return (
    <div>
      <div className="scenario-body">{recipe.scenario}</div>
      {played === "win" && <div className="reveal-note">You picked the right timeline.</div>}
      {played === "lose" && <div className="reveal-note">You picked a decoy that day.</div>}
    </div>
  );
}

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

export default function Recipe({ recipe: r, isToday, onPlayed }) {
  const base = useMemo(() => parseServings(r.servings), [r.servings]);
  const [servings, setServings] = useState(base);
  const [played, setPlayed] = useState(() => store().played?.[r.date]);
  const factor = servings / base;
  const color = catColor(r.category);
  const unit = /piece|makes/i.test(r.servings) ? "pieces" : "servings";

  return (
    <div className="recipe-page">
      <div className="hero" style={{ "--hero-tint": color + "2e" }}>
        <img className="hero-art" src={catArt(r.category)} alt="" />
        <div className="issue-meta-row">
          {isToday
            ? <span className="chip chip-today">Today · {fmtDate(r.date)}</span>
            : <span className="chip">{fmtDate(r.date)}</span>}
          <span className="chip"><span className="dot" style={{ background: color }} />{labelCat(r.category)}</span>
          <span className="chip">unattested</span>
        </div>
        <h1 className="issue-title">{r.title}</h1>
        <p className="issue-tagline">{r.tagline}</p>
      </div>

      <div className="props">
        <span className="prop stepper">
          <button aria-label="Fewer" onClick={() => servings > 1 && setServings(servings - 1)}>−</button>
          <b>{servings}</b>
          <button aria-label="More" onClick={() => servings < 99 && setServings(servings + 1)}>+</button>
          <span>{unit}</span>
        </span>
        <span className="prop">Diverged <b>{r.divergence.year}</b></span>
        <span className="prop">{r.divergence.label}</span>
        <span className="prop">{r.region}</span>
        <span className="prop"><b>{r.difficulty}</b></span>
        <span className="prop">{r.time}</span>
      </div>

      <div className="section-label">The timeline</div>
      {isToday && !played ? (
        <Game
          recipe={r}
          onDone={(won) => { setPlayed(won ? "win" : "lose"); onPlayed(); }}
        />
      ) : (
        <Scenario recipe={r} played={played} />
      )}

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
    </div>
  );
}
