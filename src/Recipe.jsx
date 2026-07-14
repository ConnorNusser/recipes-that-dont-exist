import React, { useEffect, useMemo, useState } from "react";
import { catColor, catArt, labelCat, fmtDate, parseServings, scaleAmount } from "./lib.js";

/* Split a long scenario string into two paragraphs at the sentence
   boundary nearest its midpoint. */
function splitParagraphs(text) {
  const sentences = text.match(/[^.!?]+[.!?]+(\s|$)/g);
  if (!sentences || sentences.length < 4) return [text];
  let acc = "";
  let i = 0;
  while (i < sentences.length && acc.length < text.length / 2) {
    acc += sentences[i];
    i++;
  }
  const rest = sentences.slice(i).join("");
  return rest.trim() ? [acc.trim(), rest.trim()] : [acc.trim()];
}

function Timeline({ scenario, color }) {
  const [open, setOpen] = useState(false);
  const paragraphs = useMemo(() => splitParagraphs(scenario), [scenario]);
  return (
    <div className="timeline-card" style={{ "--cat-color": color }}>
      <div className={`timeline-body${open ? "" : " collapsed"}${/^[A-Za-z]/.test(scenario) ? " dropcap" : ""}`}>
        {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
      </div>
      <button className={`timeline-toggle${open ? " open" : ""}`} onClick={() => setOpen(!open)}>
        {open ? "Collapse" : "Read the full account"}
        <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><path d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"/></svg>
      </button>
    </div>
  );
}

function IngredientRow({ amount, item, factor }) {
  const [checked, setChecked] = useState(false);
  return (
    <div className={`ing-row${checked ? " checked" : ""}`} onClick={() => setChecked(!checked)}>
      <span className="ing-check" />
      <span className="ing-item">{item}</span>
      <span className="ing-leader" />
      <span className="ing-amount">{scaleAmount(amount, factor) || "to taste"}</span>
    </div>
  );
}

/* If a step opens with a short "Do the thing:" lead-in, render it as a bold title. */
function splitStep(text) {
  const idx = text.indexOf(": ");
  if (idx > 0 && idx <= 60) {
    return { title: text.slice(0, idx), body: text.slice(idx + 2) };
  }
  return { title: null, body: text };
}

function Step({ num, text }) {
  const [done, setDone] = useState(false);
  const { title, body } = splitStep(text);
  return (
    <div className={`step${done ? " done" : ""}`} onClick={() => setDone(!done)}>
      <span className="step-num">{num}</span>
      <span className="step-content">
        {title && <span className="step-title">{title}</span>}
        <span className="step-text">{body.charAt(0).toUpperCase() + body.slice(1)}</span>
      </span>
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
      <Timeline scenario={r.scenario} color={color} />

      <div className="section-label">Ingredients</div>
      <div className="panel">
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

      <NextRecipe />

      <footer className="page-footer">
        <a href="#/about">How this works</a>
      </footer>
    </div>
  );
}
