// The hero film's content: our house (../house) from a single-line concept to the full coordinated model.
// Every element, line, label and camera move is a pure function of film time t (seconds, looping every LOOP),
// so `?t=<s>` freezes any exact frame and the recording is deterministic. No three.js in here (scene.ts draws it).
import { HOUSE } from "../house";
import { LOOP, STAGES } from "./stages";

export type V3 = [number, number, number];
export type Dir = "+x" | "-x" | "+y" | "-y" | "+z" | "-z";

/* ---------- palette (sRGB, fed raw to the shaders) ---------- */
export const PAGE = 0xfaf7f2, NAVY = 0x1f2557, RED = 0xda483b, WHITE = 0xffffff;
export const STRUCT = 0xd9dceb, STRUCT_EDGE = 0x4b5180;
const DUCT = 0xddd4c5, BRANCH = 0xede7dc, PIPE = 0xa1937a, TRAY = 0xc2b6a1, MEP_EDGE = 0x645949;
const FIRE = 0xc3c6da;                     // fire services: navy tint, never red
const FURN = 0xf8f4ed, FURN_SOFT = 0xece4d6;
export const rgb = (h: number): V3 => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];

/* ---------- small math ---------- */
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const smooth = (a: number, b: number, x: number) => { const k = clamp01((x - a) / (b - a)); return k * k * (3 - 2 * k); };
export const mix = (a: number, b: number, k: number) => a + (b - a) * k;
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const dist = (a: V3, b: V3) => Math.hypot(...sub(a, b));
export const lerp3 = (a: V3, b: V3, k: number): V3 => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)];
/** Fade in over [a, b], out over [c, d]. */
const win = (t: number, a: number, b: number, c: number, d: number) => smooth(a, b, t) * (1 - smooth(c, d, t));

/* ---------- stage times ---------- */
const [S1, S2, S3, S4, S5, S6] = STAGES.map((s) => s.start);
export { LOOP };

/* ---------- house → world: plan x east 0–12, y south 0–9  →  X = x − 6, Z = y − 4.5, Y up ---------- */
const P = (x: number, y: number, Y: number): V3 => [x - 6, Y, y - 4.5];
const { t: WT, level: LV, head: HEAD, slab: SLABT, parapet: PARAPET } = HOUSE;
const H2 = WT / 2, GRID = HOUSE.grid;

/* ---------- layers: per-instance id → per-layer uniforms (ghost, tint, cut) and explode offsets ---------- */
export const SITE = 0, FRAME = 1, SLAB = 2, ARCH = 3, MEP = 4, INT = 5, FLOOR = 6, LAYERS = 7;
/** Explode group of each layer: 0 site · 1 structure · 2 architecture · 3 MEPF · 4 interiors. */
export const GROUP = [0, 1, 1, 2, 3, 4, 4];

export interface El { a: V3; b: V3; dir: Dir; fill: number; alpha: number; edge: number; ai: number; born: number; dur: number; layer: number }
export const boxes: El[] = [], slabs: El[] = [], cyls: El[] = [];
const put = (list: El[], a: V3, b: V3, dir: Dir, fill: number, born: number, dur: number, layer: number, o: Partial<El> = {}) =>
  list.push({ a, b, dir, fill, alpha: 1, edge: NAVY, ai: 0, born, dur, layer, ...o }) - 1;
/** Plan rectangle x0..x1 × y0..y1 from Y0 to Y1, growing up. */
const blk = (list: El[], x0: number, y0: number, x1: number, y1: number, Y0: number, Y1: number, fill: number, born: number, dur: number, layer: number, o: Partial<El> = {}) =>
  put(list, P(x0, y0, Y0), P(x1, y1, Y1), "+y", fill, born, dur, layer, o);
/** Axis-aligned run along the centre line s→e (world), w wide and h tall (w along x, h along z when vertical). */
function run(list: El[], s: V3, e: V3, w: number, h: number, fill: number, born: number, dur: number, layer: number, o: Partial<El> = {}) {
  const i = [0, 1, 2].find((k) => s[k] !== e[k]) ?? 1;
  const dir = ((e[i] > s[i] ? "+" : "-") + "xyz"[i]) as Dir;
  const x: V3 = i === 0 ? [0, h / 2, w / 2] : i === 2 ? [w / 2, h / 2, 0] : [w / 2, 0, h / 2];
  return put(list, [s[0] - x[0], s[1] - x[1], s[2] - x[2]], [e[0] + x[0], e[1] + x[1], e[2] + x[2]], dir, fill, born, dur, layer, o);
}

/* ================= 02 · ARCHITECTURE: the white model, extruded from the plan ================= */
const T_PLINTH = S2 + 0.35, T_GF = S2 + 0.5, T_SLAB1 = S2 + 1.4, T_FF = S2 + 1.75, T_ROOF = S2 + 2.6, T_PARA = S2 + 2.85;
/** Along-wall extent: north/south walls run past the corners, the others stop at the faces they meet. */
const span = (k: number): [number, number] => {
  const [x0, y0, x1, y1] = HOUSE.walls[k], len = x1 - x0 + y1 - y0;
  return k <= 1 ? [-H2, len + H2] : [H2, len - H2];
};
/** Plan corners of wall k between s0 and s1 along it, grown outwards by `out` on the +side (sunshades). */
function wallRect(k: number, s0: number, s1: number, o0 = -H2, o1 = H2): [number, number, number, number] {
  const [x0, y0, x1] = HOUSE.walls[k];
  return x1 !== x0 ? [x0 + s0, y0 + o0, x0 + s1, y0 + o1] : [x0 + o0, y0 + s0, x0 + o1, y0 + s1];
}
const wave = (x: number, y: number) => 0.4 * (x + y) / 21; // back (north-west) corner first, the front last
/** A rising extrusion plane per floor: an element from Y0 to Y1 is born when the plane reaches Y0. */
function rise(list: El[], r: [number, number, number, number], Y0: number, Y1: number, base: number, t0: number, v: number, fill: number, layer: number, o: Partial<El> = {}) {
  const d = wave((r[0] + r[2]) / 2, (r[1] + r[3]) / 2);
  return blk(list, r[0], r[1], r[2], r[3], Y0, Y1, fill, t0 + d + (Y0 - base) / v, (Y1 - Y0) / v, layer, o);
}
const opsOf = (k: number, f: number) => HOUSE.openings.filter((o) => o.wall === k && (o.floor ?? f) === f).sort((a, b) => a.at - b.at);

for (let f = 0; f < 2; f++) {
  const Yb = LV[f], Yt = LV[f + 1] - SLABT, t0 = f ? T_FF : T_GF, v = (Yt - Yb) / 0.75;
  HOUSE.walls.forEach((_, k) => {
    const [s0, s1] = span(k);
    let s = s0;
    for (const o of opsOf(k, f)) {
      const a = o.at - o.w / 2, b = o.at + o.w / 2;
      if (a > s) rise(boxes, wallRect(k, s, a), Yb, Yt, Yb, t0, v, WHITE, ARCH);
      rise(boxes, wallRect(k, a, b), Yb + HEAD, Yt, Yb, t0, v, WHITE, ARCH);                    // lintel
      if (!o.door) rise(boxes, wallRect(k, a, b), Yb, Yb + (o.sill ?? HOUSE.sill), Yb, t0, v, WHITE, ARCH); // sill
      if (k <= 3) { // sunshade over every outside opening; a deeper canopy over the front door
        const out = k === 0 || k === 2 ? -1 : 1, deep = o.door ? 0.9 : 0.5, wide = o.door ? 0.45 : 0.15;
        const r = wallRect(k, a - wide, b + wide, out > 0 ? H2 : -H2 - deep, out > 0 ? H2 + deep : -H2);
        const dir = (k <= 1 ? (out > 0 ? "+z" : "-z") : out > 0 ? "+x" : "-x") as Dir;
        put(boxes, P(r[0], r[1], Yb + HEAD), P(r[2], r[3], Yb + HEAD + 0.09), dir, WHITE, T_PARA + 0.15 + wave(r[0], r[1]) * 0.6, 0.3, ARCH);
      }
      s = b;
    }
    if (s1 > s) rise(boxes, wallRect(k, s, s1), Yb, Yt, Yb, t0, v, WHITE, ARCH);
  });
}
// Parapet on the outside walls.
for (let k = 0; k < 4; k++) rise(boxes, wallRect(k, ...span(k)), LV[2], LV[2] + PARAPET, LV[2], T_PARA, PARAPET / 0.35, WHITE, ARCH);
// Stair: one straight flight along grid C, rising north to the first floor (solid stepped mass).
{
  const [x0, y0, x1, y1] = HOUSE.stair, n = 16, g = (y1 - y0) / n, rh = LV[1] / n;
  for (let i = 0; i < n; i++) blk(boxes, x0, y1 - (i + 1) * g, x1, y1 - i * g, 0, (i + 1) * rh, WHITE, T_GF + 0.25 + i * 0.03, 0.3, ARCH);
}
// Slabs (their own mesh, drawn last: glass in the structure stage). The first floor has the stair opening.
const FX0 = -H2, FX1 = HOUSE.w + H2, FY0 = -H2, FY1 = HOUSE.d + H2;
{
  const [sx0, sy0, sx1, sy1] = HOUSE.stair, v = (FX1 - FX0) / 0.5;
  const sweep = (x0: number, y0: number, x1: number, y1: number, Y0: number, Y1: number, t0: number) =>
    put(slabs, P(x0, y0, Y0), P(x1, y1, Y1), "+x", WHITE, t0 + (x0 - FX0) / v, (x1 - x0) / v, SLAB);
  for (const [x0, y0, x1, y1] of [[FX0, FY0, sx0, FY1], [sx0, FY0, sx1, sy0], [sx0, sy1, sx1, FY1], [sx1, FY0, FX1, FY1]])
    sweep(x0, y0, x1, y1, LV[1] - SLABT, LV[1], T_SLAB1);
  sweep(FX0, FY0, FX1, FY1, LV[2] - SLABT, LV[2], T_ROOF);
}
// Site: a 450 mm plinth with two front steps (the house sits above the site level).
const GL = HOUSE.ground;
blk(boxes, -H2 - 0.1, -H2 - 0.1, HOUSE.w + H2 + 0.1, HOUSE.d + H2 + 0.1, GL, 0, WHITE, T_PLINTH, 0.3, SITE);
blk(boxes, 5.85, HOUSE.d + H2 + 0.1, 7.15, HOUSE.d + H2 + 0.4, GL, -0.15, WHITE, T_PLINTH + 0.2, 0.2, SITE);
blk(boxes, 5.85, HOUSE.d + H2 + 0.4, 7.15, HOUSE.d + H2 + 0.7, GL, -0.3, WHITE, T_PLINTH + 0.25, 0.2, SITE);
/* ================= 03 · STRUCTURE: footings, columns at every grid crossing, beams on the grid ================= */
const T_FOOT = S3 + 0.35, T_COL = S3 + 0.6, T_BEAM = S3 + 1.5;
const COL = 0.3, BW = 0.25, BD = 0.4, DEEP = 0.7;   // beams sit 10 mm proud of the 230 mm walls (no z-fighting)
const FR = { edge: STRUCT_EDGE };
export let BEAM_ID = -1;                              // the one deep beam (roof, grid 2, B–C): the clash
for (const x of GRID.x) for (const y of GRID.y) {
  const d = wave(x, y);
  blk(boxes, x - 0.55, y - 0.55, x + 0.55, y + 0.55, -1.5, -1.15, STRUCT, T_FOOT + d, 0.3, FRAME, FR);
  blk(boxes, x - COL / 2, y - COL / 2, x + COL / 2, y + COL / 2, -1.15, LV[2] - SLABT, STRUCT, T_COL + d, 0.9, FRAME, FR);
}
for (let f = 1; f <= 2; f++) {
  const top = LV[f] - SLABT, t0 = T_BEAM + (f - 1) * 0.35;
  for (const y of GRID.y) GRID.x.slice(1).forEach((x1, i) => {
    const x0 = GRID.x[i], deep = f === 2 && y === GRID.y[1] && i === 1, d = deep ? DEEP : BD;
    const id = run(boxes, P(x0 + COL / 2, y, top - d / 2), P(x1 - COL / 2, y, top - d / 2), BW, d, STRUCT, t0 + wave(x0, y), 0.35, FRAME, FR);
    if (deep) BEAM_ID = id;
  });
  for (const x of GRID.x) GRID.y.slice(1).forEach((y1, j) => {
    const y0 = GRID.y[j];
    run(boxes, P(x, y0 + COL / 2, top - BD / 2), P(x, y1 - COL / 2, top - BD / 2), BW, BD, STRUCT, t0 + wave(x, y0), 0.35, FRAME, FR);
  });
}

/* ================= the AI agent (red square): one continuous path through the whole loop ================= */
interface Leg { p0: V3; t0: number; v: number; d: V3 }
export const AK: { t: number; p: V3 }[] = [];
const PEN_Y = 0.03;
let T = 0, AP: V3 = P(0, 0, PEN_Y);
AK.push({ t: 0, p: AP });
function go(q: V3, v: number): Leg {
  const len = dist(AP, q), d = sub(q, AP).map((c) => c / (len || 1)) as V3;
  const leg = { p0: AP, t0: T, v, d };
  T += len / v; AP = q; AK.push({ t: T, p: q });
  return leg;
}
const wait = (t: number) => { T = Math.max(T, t); AK.push({ t: T, p: AP }); };
const glide = (q: V3, tEnd: number) => go(q, dist(AP, q) / (tEnd - T)); // unseen move, arriving exactly at tEnd
const at = (leg: Leg, p: V3) => leg.t0 + dot(sub(p, leg.p0), leg.d) / leg.v; // when the agent passes p

/* 01 · CONCEPT: the agent leads the pen: outside walls as one loop, then each inside wall, then two dimension strings. */
export const SKETCH: { a: V3; b: V3; ta: number; tb: number; dim?: boolean }[] = [];
const V_PEN = 42;
const pen = (x: number, y: number, down: boolean, dim = false) => {
  const a = AP, t0 = T;
  go(P(x, y, PEN_Y), down ? V_PEN : V_PEN * 2.2);
  if (down) SKETCH.push({ a, b: AP, ta: t0, tb: T, dim });
};
wait(0.3);
for (const k of [0, 3, 1, 2, 4, 5, 7, 8, 6]) { // the outside loop, then every inside wall from its nearer end
  const [x0, y0, x1, y1] = HOUSE.walls[k], here = AP, near = dist(here, P(x0, y0, PEN_Y)) <= dist(here, P(x1, y1, PEN_Y));
  const [sx, sy, ex, ey] = near ? [x0, y0, x1, y1] : [x1, y1, x0, y0];
  if (dist(here, P(sx, sy, PEN_Y)) > 1e-6) pen(sx, sy, false);
  pen(ex, ey, true);
}
export const DIM_S = HOUSE.d + 1.4, DIM_E = HOUSE.w + 1.4; // dimension strings: south (12 000) and east (9 000)
pen(0, DIM_S, false); pen(HOUSE.w, DIM_S, true, true);
pen(DIM_E, HOUSE.d, false); pen(DIM_E, 0, true, true);
export const T_SKETCHED = T;

/* 04 · MEPF: the agent routes every service; each piece grows right behind it. */
const MEPO = { ai: 1, edge: MEP_EDGE };                 // routed by the agent: warm ink + a red wake
const FIREO = { ai: 1, edge: STRUCT_EDGE };
const FIX = { ai: 2, edge: MEP_EDGE };                  // the clash fix keeps a red outline for a while
const trail = (list: El[], leg: Leg, s: V3, e: V3, w: number, h: number, fill: number, o: Partial<El> = MEPO) =>
  run(list, s, e, w, h, fill, at(leg, s), dist(s, e) / leg.v, MEP, o);
const V_DUCT = 20, V_HOP = 60, V_PIPE = 26;
const RX = 6.5, RY = 3.35, YF = 5.65, YG = 2.25, DW = 0.7, DH = 0.4; // supply riser (plan) + duct levels
const UNIT = P(6.5, 1.6, LV[2] + 0.95);
wait(S2 + 0.1);
glide(UNIT, S4);
blk(boxes, 5.6, 1.0, 7.4, 2.2, LV[2], LV[2] + 0.8, BRANCH, S4 + 0.02, 0.3, MEP, MEPO); // roof AC unit
wait(S4 + 0.2);
go(P(RX, 2.2, 6.75), V_HOP);
let leg = go(P(RX, RY, 6.75), V_DUCT);
trail(boxes, leg, P(RX, 2.2, 6.75), P(RX, RY + 0.275, 6.75), 0.55, DH, DUCT);
export let CLASH_ID = -1;
const CLASH_Y = GRID.y[1];                               // the main crosses grid 2 under the deep beam
/** One pass down the hall at duct level Y: duct main, cable tray and sprinkler main grow together; branches as it passes. */
function hall(Y: number, clash: boolean) {
  const down = go(P(RX, RY, Y), V_DUCT);
  trail(boxes, down, P(RX, RY, Y === YF ? 6.95 : YF - DH / 2), P(RX, RY, Y - DH / 2), 0.55, 0.55, DUCT);
  const pass = go(P(RX, 8.4, Y), V_DUCT), y0 = RY + 0.275, y1 = 8.4 + DW / 2;
  if (clash) {
    trail(boxes, pass, P(RX, y0, Y), P(RX, CLASH_Y - 0.45, Y), DW, DH, DUCT);
    CLASH_ID = trail(boxes, pass, P(RX, CLASH_Y - 0.45, Y), P(RX, CLASH_Y + 0.45, Y), DW, DH, DUCT);
    trail(boxes, pass, P(RX, CLASH_Y + 0.45, Y), P(RX, y1, Y), DW, DH, DUCT);
  } else trail(boxes, pass, P(RX, y0, Y), P(RX, y1, Y), DW, DH, DUCT);
  const tray = Y - 0.41 + (clash ? 0 : 0.61), fire = Y - 0.27 + (clash ? 0 : 0.59); // FF: under the deep beam
  trail(boxes, pass, P(5.45, 3.4, tray), P(5.45, 8.6, tray), 0.3, 0.08, TRAY);
  trail(cyls, pass, P(5.9, 3.4, fire), P(5.9, 8.6, fire), 0.15, 0.15, FIRE, FIREO);
  for (const [by, to] of [[3.75, 3.2], [7.2, 3.2], [5.6, 9.8], [7.8, 9.8]]) { // supply branches into the rooms
    const s = P(to < RX ? RX - DW / 2 : RX + DW / 2, by, Y), e = P(to, by, Y);
    run(boxes, s, e, 0.4, 0.26, BRANCH, at(pass, s), dist(s, e) / V_DUCT, MEP, MEPO);
  }
  for (const by of [5.0, 8.0]) { // sprinkler branch lines + heads
    const tb = at(pass, P(RX, by, Y));
    run(cyls, P(5.9, by, fire), P(1.2, by, fire), 0.12, 0.12, FIRE, tb, 4.7 / V_DUCT, MEP, FIREO);
    run(cyls, P(5.9, by, fire), P(10.8, by, fire), 0.12, 0.12, FIRE, tb, 4.9 / V_DUCT, MEP, FIREO);
    for (const hx of [1.6, 3.8, 9.2, 11.0])
      put(boxes, P(hx - 0.1, by - 0.1, fire - 0.06), P(hx + 0.1, by + 0.1, fire - 0.24), "-y", FIRE, tb + Math.abs(hx - 5.9) / V_DUCT, 0.15, MEP, FIREO);
  }
  return pass;
}
hall(YF, true);
go(P(RX, RY, YF), V_HOP);
const gf = hall(YG, false);
// Distribution board by the front door, its conduit up through both floors to the trays.
blk(boxes, 5.15, 8.55, 5.35, 8.85, 1.2, 1.8, TRAY, at(gf, P(RX, 8.4, YG)), 0.2, MEP, MEPO);
run(cyls, P(5.25, 8.7, 1.8), P(5.25, 8.7, YF - 0.35), 0.08, 0.08, TRAY, at(gf, P(RX, 8.4, YG)) + 0.1, 0.35, MEP, MEPO);
// Plumbing: roof tank → down-take in the toilet stack → branches along the north wall to the kitchen/bath stack.
const TANK = P(10.4, 1.2, LV[2] + 0.05);
leg = go(P(10.95, 1.2, 6.55), V_HOP);
run(cyls, TANK, P(10.4, 1.2, LV[2] + 1.05), 1.1, 1.1, TRAY, T - 0.05, 0.3, MEP, MEPO);
leg = go(P(11.6, 1.2, 6.55), V_PIPE);
trail(cyls, leg, P(10.95, 1.2, 6.55), P(11.6, 1.2, 6.55), 0.18, 0.18, PIPE);
leg = go(P(11.6, 0.32, 6.55), V_PIPE);
trail(cyls, leg, P(11.6, 1.2, 6.55), P(11.6, 0.32, 6.55), 0.18, 0.18, PIPE);
leg = go(P(11.6, 0.32, 0.55), V_PIPE);
trail(cyls, leg, P(11.6, 0.32, 6.55), P(11.6, 0.32, 0.55), 0.18, 0.18, PIPE);
run(cyls, P(11.6, 0.32, 3.85), P(5.45, 0.32, 3.85), 0.18, 0.18, PIPE, at(leg, P(11.6, 0.32, 3.85)), 6.15 / V_PIPE, MEP, MEPO);
leg = go(P(5.45, 0.32, 0.55), V_PIPE);
trail(cyls, leg, P(11.6, 0.32, 0.55), P(5.45, 0.32, 0.55), 0.18, 0.18, PIPE);
// Drainage: two soil stacks (kitchen/bath, toilet/bath 2) from under the floor to vents above the roof.
go(P(5.5, 0.75, -0.8), V_HOP);
run(cyls, P(5.5, 0.75, -0.8), P(5.5, 0.75, 7.1), 0.26, 0.26, PIPE, T, 7.9 / V_PIPE, MEP, MEPO);
leg = go(P(8.5, 0.75, -0.8), V_PIPE);
trail(cyls, leg, P(5.5, 0.75, -0.8), P(8.5, 0.75, -0.8), 0.24, 0.24, PIPE);
run(cyls, P(8.5, 0.75, -0.8), P(8.5, -1.6, -0.8), 0.24, 0.24, PIPE, T, 2.35 / V_PIPE, MEP, MEPO);
blk(boxes, 8.2, -1.9, 8.8, -1.3, -0.95, GL, TRAY, T + 2.35 / V_PIPE, 0.2, MEP, MEPO); // inspection chamber
leg = go(P(8.5, 0.75, 7.1), V_PIPE);
trail(cyls, leg, P(8.5, 0.75, -0.8), P(8.5, 0.75, 7.1), 0.26, 0.26, PIPE);
// Clash: the agent flies to it, the duct piece flashes, retracts, and a dogleg drops under the deep beam.
export const CLASH_P = P(RX, CLASH_Y, YF);
go(CLASH_P, 30);
export const T_FLASH = T + 0.05, T_CUT = T_FLASH + 0.5;
wait(T_CUT + 0.2);
const YD = YF - 0.35, Z0 = CLASH_Y - 0.4, Z1 = CLASH_Y + 0.4, V_FIX = 6;
go(P(RX, Z0, YF), V_FIX);
leg = go(P(RX, Z0, YD), V_FIX);
trail(boxes, leg, P(RX, Z0, YF + DH / 2), P(RX, Z0, YD - DH / 2), DW, 0.25, DUCT, FIX);
leg = go(P(RX, Z1, YD), V_FIX);
trail(boxes, leg, P(RX, Z0 + 0.125, YD), P(RX, Z1 - 0.125, YD), DW, DH, DUCT, FIX);
leg = go(P(RX, Z1, YF), V_FIX);
trail(boxes, leg, P(RX, Z1, YD - DH / 2), P(RX, Z1, YF + DH / 2), DW, 0.25, DUCT, FIX);
export const T_FIXED = T;
wait(T_FIXED + 0.65);
glide(P(0, 0, PEN_Y), LOOP); // unseen: back to the pen's first corner, so the loop seam is continuous

export function agentAt(t: number): V3 {
  const s = ((t % LOOP) + LOOP) % LOOP;
  let i = 1;
  while (i < AK.length - 1 && AK[i].t < s) i++;
  const a = AK[i - 1], b = AK[i];
  return lerp3(a.p, b.p, clamp01((s - a.t) / Math.max(b.t - a.t, 1e-6)));
}

/* ================= 05 · INTERIORS: ground-floor fit-out and finishes ================= */
const T_FIT = S5 + 0.75;
const fit = (r: number, x0: number, y0: number, x1: number, y1: number, Y0: number, Y1: number, fill = FURN) =>
  blk(boxes, x0, y0, x1, y1, Y0, Y1, fill, T_FIT + 0.18 * r + 0.06 * Y0, 0.35, INT);
// living: sofa (seat, back, arms), armchair, coffee table
fit(0, 0.3, 5.6, 1.2, 7.8, 0, 0.42, FURN_SOFT); fit(0, 0.3, 5.6, 0.5, 7.8, 0.42, 0.85, FURN_SOFT);
fit(0, 0.3, 5.6, 1.2, 5.8, 0.42, 0.62, FURN_SOFT); fit(0, 0.3, 7.6, 1.2, 7.8, 0.42, 0.62, FURN_SOFT);
fit(0, 1.65, 6.2, 2.35, 7.2, 0, 0.38); fit(0, 2.9, 7.7, 3.7, 8.5, 0, 0.42, FURN_SOFT); fit(0, 2.9, 8.3, 3.7, 8.5, 0.42, 0.8, FURN_SOFT);
// dining: table and six chairs
fit(1, 1.6, 1.8, 3.4, 2.7, 0, 0.75);
for (const cx of [1.9, 2.5, 3.1]) {
  fit(1, cx - 0.22, 1.3, cx + 0.22, 1.72, 0, 0.45); fit(1, cx - 0.22, 1.3, cx + 0.22, 1.36, 0.45, 0.9);
  fit(1, cx - 0.22, 2.78, cx + 0.22, 3.2, 0, 0.45); fit(1, cx - 0.22, 3.14, cx + 0.22, 3.2, 0.45, 0.9);
}
// kitchen: L counter, fridge
fit(2, 5.6, 0.12, 7.88, 0.72, 0, 0.9); fit(2, 7.28, 0.72, 7.88, 2.4, 0, 0.9); fit(2, 5.15, 2.15, 5.85, 2.85, 0, 1.8);
// toilet: WC (pan + cistern), vanity
fit(4, 9.4, 0.12, 9.8, 0.75, 0, 0.4); fit(4, 9.35, 0.12, 9.85, 0.3, 0.4, 0.8); fit(4, 10.6, 0.12, 11.4, 0.6, 0, 0.85);
// bedroom: bed + headboard, side tables, wardrobe
fit(5, 9.8, 4.8, 11.88, 6.6, 0, 0.45, FURN_SOFT); fit(5, 11.74, 4.8, 11.88, 6.6, 0.45, 0.85);
fit(5, 11.4, 4.3, 11.88, 4.75, 0, 0.5); fit(5, 11.4, 6.65, 11.88, 7.1, 0, 0.5); fit(5, 8.12, 3.0, 8.72, 5.0, 0, 2.1);
// floor finishes, tinted per room (just above the plinth top, under the furniture)
const FINISH = [0xeadcc4, 0xeadcc4, 0xe6e2da, 0xefe8dc, 0xdfe3ea, 0xe7d8bf];
HOUSE.rooms.forEach(({ box: [x0, y0, x1, y1] }, i) => {
  const v = 14 / 0.45;
  put(boxes, P(x0 + H2, y0 + H2, 0), P(x1 - H2, y1 - H2, 0.03), "+x", FINISH[i], S5 + 0.55 + (x0 + y0) / v, (x1 - x0) / v, FLOOR, { edge: MEP_EDGE });
});

/* ================= ground lines: LineSegments with a per-vertex reveal time ================= */
export const LP: number[] = [], LC: number[] = [], LD: number[] = [], LA: number[] = [];
const SOLID = 0, DASH = 1, DASHDOT = 2, CENTRE = 3;
export const G_SKETCH = 0, G_DIMS = 1, G_PLAN = 2, G_GRID = 3, G_SITE = 4, LINE_GROUPS = 5;
export const LINE_TO_GROUP = [2, 2, 2, 1, 0]; // explode group of each line group
function seg(a: V3, b: V3, ta: number, tb: number, color: number, alpha: number, group: number, pat = SOLID, ai = 0, d0 = 0) {
  const c = rgb(color);
  for (const [p, t, d] of [[a, ta, d0], [b, tb, d0 + dist(a, b)]] as [V3, number, number][]) {
    LP.push(...p); LC.push(...c, alpha); LD.push(t, d, pat, group); LA.push(ai);
  }
}
function poly(pts: V3[], t0: number, t1: number, color: number, alpha: number, group: number, pat = SOLID) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + dist(pts[i - 1], pts[i]));
  const k = (t1 - t0) / (cum[cum.length - 1] || 1);
  for (let i = 1; i < pts.length; i++) seg(pts[i - 1], pts[i], t0 + k * cum[i - 1], t0 + k * cum[i], color, alpha, group, pat, 0, cum[i - 1]);
}
const circle = (x: number, y: number, r: number, Y: number) => Array.from({ length: 25 }, (_, i) => P(x + r * Math.cos(i * Math.PI / 12), y + r * Math.sin(i * Math.PI / 12), Y));

// 01: the pen's single-line walls and dimension strings (red while fresh), extension lines and ticks.
for (const s of SKETCH) seg(s.a, s.b, s.ta, s.tb, NAVY, 0.9, s.dim ? G_DIMS : G_SKETCH, SOLID, 1);
const [DS, DE] = SKETCH.filter((s) => s.dim); // south (west → east), east (south → north)
const dimT = (s: typeof DS, k: number) => mix(s.ta, s.tb, k);
for (const x of GRID.x) {
  const t = dimT(DS, x / HOUSE.w);
  seg(P(x, HOUSE.d + 0.4, PEN_Y), P(x, DIM_S + 0.3, PEN_Y), t, t, NAVY, 0.5, G_DIMS);
  seg(P(x - 0.2, DIM_S + 0.2, PEN_Y), P(x + 0.2, DIM_S - 0.2, PEN_Y), t, t, NAVY, 0.9, G_DIMS);
}
for (const y of GRID.y) {
  const t = dimT(DE, 1 - y / HOUSE.d);
  seg(P(HOUSE.w + 0.4, y, PEN_Y), P(DIM_E + 0.3, y, PEN_Y), t, t, NAVY, 0.5, G_DIMS);
  seg(P(DIM_E - 0.2, y + 0.2, PEN_Y), P(DIM_E + 0.2, y - 0.2, PEN_Y), t, t, NAVY, 0.9, G_DIMS);
}
// 02: the lines thicken into a double-line plan: wall faces, jambs, door leaves and swings, window breaks.
{
  const tw = (x: number, y: number) => S2 + 0.05 + 0.55 * (x + y) / 21;
  const wp = (k: number, s: number, o: number): [number, number] => {
    const [x0, y0, x1] = HOUSE.walls[k];
    return x1 !== x0 ? [x0 + s, y0 + o] : [x0 + o, y0 + s];
  };
  const pl = (p: [number, number], q: [number, number], alpha = 0.85) => seg(P(...p, PEN_Y), P(...q, PEN_Y), tw(...p), tw(...q), NAVY, alpha, G_PLAN);
  HOUSE.walls.forEach((_, k) => {
    const [s0, s1] = span(k), face = (a: number, b: number, al = 0.85) => { pl(wp(k, a, -H2), wp(k, b, -H2), al); pl(wp(k, a, H2), wp(k, b, H2), al); };
    let s = s0;
    for (const o of opsOf(k, 0)) {
      const a = o.at - o.w / 2, b = o.at + o.w / 2;
      if (a > s) face(s, a);
      pl(wp(k, a, -H2), wp(k, a, H2)); pl(wp(k, b, -H2), wp(k, b, H2));
      if (o.door) {
        const sd = o.s ?? 1, arc = Array.from({ length: 13 }, (_, i) => wp(k, a + o.w * Math.cos((Math.PI / 2) * (1 - i / 12)), sd * (H2 + o.w * Math.sin((Math.PI / 2) * (1 - i / 12)))));
        pl(wp(k, a, sd * H2), arc[0], 0.75);
        for (let i = 1; i < arc.length; i++) pl(arc[i - 1], arc[i], 0.45);
      } else { face(a, b, 0.4); pl(wp(k, a, 0), wp(k, b, 0), 0.6); }
      s = b;
    }
    if (s1 > s) face(s, s1);
  });
}
// 03: the structural grid, A–D and 1–3, with bubbles at the front ends.
export const BUBBLES: { label: string; at: V3; t: number }[] = [];
const T_GRID = S3 + 0.1;
GRID.x.forEach((x, i) => {
  poly([P(x, -1.3, PEN_Y), P(x, HOUSE.d + 2.2, PEN_Y)], T_GRID + 0.08 * i, T_GRID + 0.6 + 0.08 * i, NAVY, 0.42, G_GRID, DASHDOT);
  BUBBLES.push({ label: "ABCD"[i], at: P(x, HOUSE.d + 2.75, PEN_Y), t: T_GRID + 0.55 + 0.08 * i });
});
GRID.y.forEach((y, j) => {
  poly([P(-1.3, y, PEN_Y), P(HOUSE.w + 2.2, y, PEN_Y)], T_GRID + 0.12 + 0.08 * j, T_GRID + 0.72 + 0.08 * j, NAVY, 0.42, G_GRID, DASHDOT);
  BUBBLES.push({ label: String(j + 1), at: P(HOUSE.w + 2.75, y, PEN_Y), t: T_GRID + 0.67 + 0.08 * j });
});
// Site (from 02): plot boundary, the road in front, the path to the door, contours and three trees.
{
  const T0 = S2 + 0.45, YS = GL + 0.015, Q = (x: number, y: number) => P(x, y, YS);
  poly([Q(-3, -3.5), Q(15, -3.5), Q(15, 12.4), Q(-3, 12.4), Q(-3, -3.5)], T0, T0 + 1.2, NAVY, 0.38, G_SITE, DASHDOT);
  poly([Q(-20, 13.3), Q(32, 13.3)], T0 + 0.2, T0 + 1.2, NAVY, 0.45, G_SITE);
  poly([Q(-20, 19.3), Q(32, 19.3)], T0 + 0.25, T0 + 1.25, NAVY, 0.45, G_SITE);
  poly([Q(-20, 16.3), Q(32, 16.3)], T0 + 0.3, T0 + 1.3, NAVY, 0.3, G_SITE, CENTRE);
  for (const x of [5.95, 7.05]) poly([Q(x, HOUSE.d + 0.95), Q(x, 13.3)], T0 + 0.6, T0 + 0.9, NAVY, 0.4, G_SITE);
  poly([Q(8.5, -1.6), Q(14, -1.6), Q(14, 13.3)], T0 + 0.7, T0 + 1.3, PIPE, 0.7, G_SITE, DASH); // drain to the road sewer
  for (let k = 0; k < 3; k++) {
    const pts: V3[] = [];
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2, r = 11 + 3.6 * k + 1.3 * Math.sin(2 * a + 0.6 + 0.4 * k) + 0.8 * Math.sin(3 * a + 2 - 0.5 * k);
      pts.push(Q(6 + 1.25 * r * Math.cos(a), 3.5 + r * Math.sin(a)));
    }
    poly(pts, T0 + 0.1 * k, T0 + 1.4 + 0.1 * k, PIPE, 0.4, G_SITE);
  }
  for (const [x, y] of [[-1.5, 10.4], [13.7, 11.0], [-1.7, -1.6]]) {
    poly(circle(x, y, 1.1, YS), T0 + 0.9, T0 + 1.4, PIPE, 0.55, G_SITE);
    poly([Q(x - 0.3, y), Q(x + 0.3, y)], T0 + 1.3, T0 + 1.4, PIPE, 0.55, G_SITE);
    poly([Q(x, y - 0.3), Q(x, y + 0.3)], T0 + 1.3, T0 + 1.4, PIPE, 0.55, G_SITE);
  }
}

/* ================= explode: a diagonal fan of the five layers (the hero band is short and wide) ================= */
export const DEG = Math.PI / 180;
const FAN_AZ = 40 * DEG; // camera azimuth during the explode: the fan runs along the screen's x
/** World offset of explode group g at amount e. `tall` bands (phones) stack more than they fan. */
export function explodeOffset(g: number, e: number, tall: boolean): V3 {
  const side = (g - 2) * (tall ? 4.5 : 12.5) * e, up = g * (tall ? 6.5 : 1.7) * e;
  return [Math.cos(FAN_AZ) * side, up, -Math.sin(FAN_AZ) * side];
}
/** Assembled bounds of each explode group (for framing and the layer tags). */
export const GROUP_BOX: [V3, V3][] = [
  [P(-0.4, -0.4, GL), P(12.4, 9.9, 0)],
  [P(-0.6, -0.6, -1.5), P(12.6, 9.6, LV[2])],
  [P(-0.7, -0.7, 0), P(12.7, 9.7, LV[2] + PARAPET)],
  [P(5.1, -0.4, -0.95), P(11.9, 9.0, LV[2] + 1.05)],
  [P(0, 0, 0), P(12, 9, 2.1)],
];

/* ================= HTML overlay: labels (rooms, dimensions, grid bubbles) and callout tags ================= */
export interface Label { text: string; at: V3; t0: number; t1: number; t2: number; t3: number; kind: "room" | "dim" | "bub" }
export const LABELS: Label[] = [];
HOUSE.rooms.forEach(({ name, box: [x0, y0, x1, y1] }, i) => {
  const at = P((x0 + x1) / 2 - (i === 3 ? 0.55 : 0), (y0 + y1) / 2, PEN_Y);
  LABELS.push({ text: name[0], at, t0: 0.95 + 0.17 * i, t1: 1.25 + 0.17 * i, t2: S2 + 0.75, t3: S2 + 1.1, kind: "room" });
  LABELS.push({ text: name[0], at, t0: S5 + 1.4 + 0.08 * i, t1: S5 + 1.7 + 0.08 * i, t2: S6 - 0.1, t3: S6 + 0.25, kind: "room" });
});
LABELS.push({ text: "12 000", at: P(HOUSE.w / 2, DIM_S, PEN_Y), t0: dimT(DS, 0.5), t1: dimT(DS, 0.5) + 0.25, t2: S2 + 3.2, t3: S2 + 3.8, kind: "dim" });
LABELS.push({ text: "9 000", at: P(DIM_E, HOUSE.d / 2, PEN_Y), t0: dimT(DE, 0.5), t1: dimT(DE, 0.5) + 0.25, t2: S2 + 3.2, t3: S2 + 3.8, kind: "dim" });
for (const b of BUBBLES) LABELS.push({ text: b.label, at: b.at, t0: b.t, t1: b.t + 0.3, t2: S5, t3: S5 + 0.4, kind: "bub" });

export interface Tag { text: string; then?: string; at: V3; group: number; side: -1 | 0 | 1; t: number; t2?: number; out: [number, number]; ai?: boolean }
const top = ([a, b]: [V3, V3]): V3 => [(a[0] + b[0]) / 2, b[1], (a[2] + b[2]) / 2];
const VIEW_AT = P(0, HOUSE.d, 1.6);
export const TAGS: Tag[] = [
  { text: "AI · CLASH DUCT × BEAM", then: " · RESOLVED", at: CLASH_P, group: 3, side: 1, t: T_FLASH, t2: T_FIXED, out: [S5 + 0.3, S5 + 0.6], ai: true },
  ...["SITE", "STRUCTURE", "ARCHITECTURE", "MEPF", "INTERIORS"].map((text, g): Tag => ({ text, at: top(GROUP_BOX[g]), group: g, side: 0, t: S6 + 0.5 + 0.08 * g, out: [S6 + 2.1, S6 + 2.4] })),
  { text: "ELEVATION · SOUTH", at: VIEW_AT, group: 2, side: -1, t: S6 + 3.55, out: [S6 + 4.3, S6 + 4.45] },
  { text: "SECTION A–A", at: VIEW_AT, group: 2, side: -1, t: S6 + 4.55, out: [S6 + 5.3, S6 + 5.45] },
  { text: "PLAN · GROUND FLOOR", at: VIEW_AT, group: 2, side: -1, t: S6 + 5.75, out: [LOOP - 0.5, LOOP - 0.1] },
];

/* ================= the film state at time t ================= */
/** Representative frame per stage (reduced motion, rail clicks) and the frame each stage holds after a click. */
export const STILLS = [T_SKETCHED + 0.1, S3 - 0.1, S4 - 0.1, T_FIXED + 0.45, S6 - 0.15, S6 + 1.6];
export const STILL = STILLS[5];
export const HOLDS = [S2 - 0.05, S3 - 0.05, S4 - 0.05, S5 - 0.05, S6 - 0.05, S6 + 5.9];

export interface FilmState {
  az: number; el: number; margin: number; explode: number;
  yLo: number; yHi: number;   // vertical range the camera frames (footings only in 03; the ground floor in 05)
  layers: number[];  // per layer: fill alpha, edge alpha, structure tint, cut (0 off, 0.5 cut, 1 cut + poché)
  cutY: number; cutZ: number; lines: number[];
  agent: V3; agentA: number; ringA: number; ringR: number; flash: number; fix: number;
}
export function state(time: number): FilmState {
  const t = ((time % LOOP) + LOOP) % LOOP, tau = t - S6;
  // camera: a plan on paper (top-down, north up) tilts to the iso view; 06 orbits to the south elevation, then up to the plan
  const tilt = smooth(S1 + 2.3, S2 + 2.4, t), o1 = smooth(2.9, 3.9, tau), o2 = smooth(4.3, 4.9, tau), o3 = smooth(5.3, 6.1, tau);
  const az = mix(mix(0, 47, tilt) - 7 * smooth(S2 + 2.4, S5 + 2, t), 0, o1);
  const el = mix(mix(mix(mix(90, 30, tilt) + 7 * win(t, S5 + 0.2, S5 + 1, S6 + 0.2, S6 + 0.9), 3, o1), 9, o2), 90, o3);
  const margin = mix(mix(1.2, 0.45, smooth(S2 + 1.5, S2 + 3, t)), 1.2, o3);
  const explode = win(t, S6, S6 + 0.9, S6 + 2.2, S6 + 2.9);
  const fade = 1 - smooth(LOOP - 0.55, LOOP - 0.05, t);
  const ghost = win(t, S3, S3 + 0.6, S5, S5 + 0.5);
  const frameA = 1 - smooth(S5 + 0.1, S5 + 0.6, t) + win(t, S6, S6 + 0.4, S6 + 2.4, S6 + 2.9);
  const m4 = win(t, S4 - 0.3, S4 + 0.3, S6, S6 + 0.4); // 04: frame and glass step back so the services read
  const mepA = 1 - smooth(S5 + 0.1, S5 + 0.5, t) + smooth(S6, S6 + 0.4, t);
  const L = (fill: number, edge: number, tint: number, cut: number) => [fill * fade, edge * fade, tint, cut];
  const layers = [
    L(mix(1, 0.12, ghost), mix(1, 0.45, ghost), 0, 1),
    L(frameA * (1 - 0.6 * m4), frameA * (1 - 0.35 * m4), 0, 1),
    L(mix(1, mix(0.3, 0.14, m4), ghost), mix(1, 0.85, ghost), Math.max(ghost, explode), 1),
    L(1 - ghost, mix(1, 0.25, ghost), 0, 1),
    L(mepA, mepA, 0, 0.5), L(1, 1, 0, 0.5), L(1, 1, 0, 0.5),
  ].flat();
  const cutY = mix(9, 1.3, Math.max(smooth(S5 + 0.25, S5 + 1, t) * (1 - smooth(S6, S6 + 0.7, t)), smooth(5.3, 6, tau)));
  const cutZ = mix(12, 0.8, win(t, S6 + 4.3, S6 + 4.8, S6 + 5.3, S6 + 5.9));
  const lines = [1 - smooth(S2 + 0.1, S2 + 0.6, t), 1 - smooth(S2 + 3.2, S2 + 3.8, t), 1 - smooth(S3, S3 + 0.5, t), 1 - smooth(S5, S5 + 0.4, t), 1 - win(t, S6 + 2.9, S6 + 3.4, S6 + 5.4, S6 + 5.9)].map((a) => a * fade);
  const agentA = win(t, 0.1, 0.3, T_SKETCHED + 0.05, T_SKETCHED + 0.3) + win(t, S4 + 0.02, S4 + 0.17, T_FIXED + 0.35, T_FIXED + 0.6);
  const pulse = Math.cos((t - T_FLASH) * Math.PI * 5), hot = t >= T_FLASH && t < T_CUT;
  return {
    az, el, margin, explode, layers,
    yLo: mix(GL, -1.5, Math.max(win(t, S3 - 0.2, S3 + 0.6, S5, S5 + 0.8), explode)),
    yHi: mix(LV[2] + 1.05, 2.6, win(t, S5 + 0.2, S5 + 1.1, S6 - 0.1, S6 + 0.6)), cutY, cutZ, lines, agent: agentAt(t), agentA,
    ringA: smooth(T_FLASH, T_FLASH + 0.15, t) * (1 - smooth(T_CUT, T_FIXED, t)) * (hot ? 0.6 + 0.4 * pulse : 1),
    ringR: 13 + (hot ? 2.5 * Math.sin((t - T_FLASH) * Math.PI * 5) : 12 * smooth(T_CUT, T_FIXED, t)),
    flash: hot ? 0.55 + 0.45 * pulse : t >= T_CUT ? 1 : 0,
    fix: 1 - smooth(S5, S5 + 0.6, t),
  };
}
