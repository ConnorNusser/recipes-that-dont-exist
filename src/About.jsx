import React from "react";

export default function About() {
  return (
    <div className="about">
      <h1>Recipes that don't exist</h1>
      <p>
        Every day at 00:00 UTC this site publishes one recipe that has never been
        published anywhere else. Each dish comes from a timeline that split off
        from ours at a specific point: a war that went the other way, a crop that
        died out, a trade route that opened three centuries early.
      </p>
      <p>
        The ingredients are real, the amounts are exact, and the technique works.
        The history is the only invented part.
      </p>
      <p>
        Before the timeline is revealed, you get one guess. Three points of
        divergence are listed; one of them is the source of the dish. A correct
        guess extends your streak.
      </p>
      <p className="muted">
        Recipes are checked against published sources by web search at generation
        time. If a close match exists, the recipe is revised until none does. The
        search queries and verdict are printed at the bottom of every recipe.
      </p>
    </div>
  );
}
