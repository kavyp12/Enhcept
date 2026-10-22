"use client";

import { useEffect, useRef, useState } from "react";
import css from "./hero.module.css";

// Full-bleed layer behind the hero copy. The three.js film loads client-only, after first paint.
// Without WebGL it shows the recorded poster instead (made by tools/record-hero.mjs).
export default function HeroStage() {
  const ref = useRef<HTMLDivElement>(null);
  const [still, setStill] = useState(false);

  useEffect(() => {
    const host = ref.current;
    let dispose: (() => void) | null = null;
    let dead = false;
    const start = () => {
      if (dead) return;
      import("./scene")
        .then(({ mount }) => {
          if (dead || !host) return;
          dispose = mount(host);
          if (!dispose) setStill(true);
        })
        .catch(() => {}); // a failed chunk just leaves the cream background
    };
    // Build the film after the page's first frame, once the main thread is idle: the headline paints
    // first, then the heavy WebGL setup (shader compile), which is slow on phones and GPU-less browsers.
    const frame = requestAnimationFrame(() => {
      if ("requestIdleCallback" in window) requestIdleCallback(start, { timeout: 1000 });
      else setTimeout(start, 50); // Safari has no requestIdleCallback
    });
    return () => { dead = true; cancelAnimationFrame(frame); dispose?.(); };
  }, []);

  return (
    <div ref={ref} className="hero-stage" aria-hidden="true">
      {still && <div className={css.still} style={{ backgroundImage: "url(/media/hero.jpg)" }} />}
    </div>
  );
}
