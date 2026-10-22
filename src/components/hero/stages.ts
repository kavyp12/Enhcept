// The hero film's six stages, plus a tiny store shared by the film (scene.ts) and the stage rail (StageRail.tsx).
// No three.js here, so the rail never pulls the film's code into the page bundle.

export const STAGES = [
  { n: "01", name: "Concept", line: "A single-line plan: rooms, walls, first dimensions.", start: 0, end: 3 },
  { n: "02", name: "Architecture", line: "Walls, doors and windows, modelled in 3D.", start: 3, end: 7 },
  { n: "03", name: "Structure", line: "Grid, footings, columns, beams and slabs.", start: 7, end: 10.5 },
  { n: "04", name: "MEPF", line: "Air, water, drainage, power and fire, routed and clash-checked.", start: 10.5, end: 14.5 },
  { n: "05", name: "Interiors", line: "Furniture, fittings and finishes.", start: 14.5, end: 17.5 },
  { n: "06", name: "Full model", line: "Every layer, coordinated in one model.", start: 17.5, end: 24 },
] as const;
export const LOOP = 24; // seconds; the film loops forever

/** Index of the stage playing at film time t (any t, wrapped to the loop). */
export const stageAt = (t: number) => {
  const s = ((t % LOOP) + LOOP) % LOOP;
  const i = STAGES.findIndex((g) => s < g.end);
  return i < 0 ? STAGES.length - 1 : i;
};

let active = 0;
const listeners = new Set<() => void>();
let seeker: ((i: number) => void) | null = null;

export const getActive = () => active;
export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
/** Called by the film when the playing stage changes (never per frame). */
export function setActive(i: number) {
  if (i === active) return;
  active = i;
  listeners.forEach((fn) => fn());
}
/** The film registers how to jump to a stage; null when it unmounts. */
export const setSeeker = (fn: ((i: number) => void) | null) => { seeker = fn; };
/** Rail click: the film jumps there (and holds); without a film the rail still shows the stage. */
export function seekStage(i: number) {
  setActive(i);
  seeker?.(i);
}
