"use client";

import { useSyncExternalStore } from "react";
import css from "./hero.module.css";
import { STAGES, getActive, seekStage, subscribe } from "./stages";

// Stage rail under the hero copy: lights up as the film plays (the film notifies on stage change only; the active
// step's progress line reads --hero-p, which the film sets on .hero). A click jumps the film there and holds it.
export default function StageRail() {
  const active = useSyncExternalStore(subscribe, getActive, () => 0);
  const s = STAGES[active];
  return (
    <div className={css.rail}>
      <div className={css.steps} role="group" aria-label="Hero film stages">
        {STAGES.map((g, i) => (
          <button key={g.n} type="button" className={css.step} aria-label={`${g.n} ${g.name}`} aria-current={i === active ? "step" : undefined} onClick={() => seekStage(i)}>
            <span className={css.mark} aria-hidden="true" />
            {g.n}
            <span className={css.name}>{g.name}</span>
            <span className={css.bar} aria-hidden="true" />
          </button>
        ))}
      </div>
      <p className={css.caption}>
        <span className={css.kick}>{s.n} · {s.name.toUpperCase()}</span>
        {s.line}
      </p>
    </div>
  );
}
