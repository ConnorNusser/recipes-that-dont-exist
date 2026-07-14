import React, { useEffect, useMemo, useState } from "react";
import { seededOrder, recordPlay, currentStreak, confetti } from "./lib.js";

export default function Game({ recipe: r, onDone }) {
  const options = useMemo(() => {
    const opts = [
      { text: r.scenarioSummary, real: true },
      { text: r.decoys[0], real: false },
      { text: r.decoys[1], real: false },
    ];
    return seededOrder(3, r.date).map((i) => opts[i]);
  }, [r]);

  const [picked, setPicked] = useState(null); // index of the chosen option

  const resolve = (pos) => {
    if (picked !== null) return;
    const won = options[pos].real;
    recordPlay(r.date, won);
    if (won) confetti();
    setPicked(pos);
    onDone(won);
  };

  useEffect(() => {
    const fn = (e) => {
      const pos = ["1", "2", "3"].indexOf(e.key);
      if (pos >= 0) resolve(pos);
    };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  });

  const done = picked !== null;
  const won = done && options[picked].real;

  return (
    <div className="game-card">
      <div className="game-title">Which timeline cooked this?</div>
      <div className="game-sub">
        Three points of divergence. One of them produced the dish below. You get one guess a day; a correct pick extends your streak.
      </div>

      {options.map((opt, pos) => {
        let cls = "option";
        if (done) {
          if (opt.real) cls += " correct";
          else if (pos === picked) cls += " wrong";
          else cls += " dimmed";
        }
        return (
          <button key={pos} className={cls} disabled={done} onClick={() => resolve(pos)}>
            <span className="key">{pos + 1}</span>
            <span>{opt.text}</span>
          </button>
        );
      })}

      {done && (
        <>
          <div className={`game-result ${won ? "win" : "lose"}`}>
            {won
              ? `Correct. That makes ${currentStreak()} in a row.`
              : "Wrong timeline. The right one is marked above."}
          </div>
          <div className="scenario-body" style={{ marginTop: 14 }}>{r.scenario}</div>
        </>
      )}
    </div>
  );
}
