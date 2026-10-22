"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { HOUSE, area, type Box, type Opening } from "./house";

// "Run plugin": a Revit-style window where the Enhcept add-in documents our sample house. Every line is generated
// from house.ts (the hero film's house too): plan, dimensions, tags, marks, elevations, sections and sheets, so they
// always agree. Plan coordinates in metres: x east, y south, north up.

type Pt = [number, number];
type Step = "dim" | "tag" | "detail" | "elev" | "sect" | "sheet";
type Shown = Record<Step, number>;
type Item = { at: Pt; to?: Pt; ms: number };

const { w: W, d: D, t: T, level: LV, ground: GL, head: HEAD, sill: SILL, parapet: PAR, slab: SLAB, stair: ST, grid: GRID } = HOUSE;
const H = T / 2;
const r1 = (v: number) => Math.round(v * 10) / 10;
const lvl = (z: number) => (z === 0 ? "±" : z > 0 ? "+" : "−") + Math.abs(z).toFixed(2);
const onFloor = (o: Opening, f: number) => (o.floor ?? f) === f;
const horiz = (o: Opening) => HOUSE.walls[o.wall][1] === HOUSE.walls[o.wall][3];
const mid = (o: Opening): Pt => { const [x, y] = HOUSE.walls[o.wall]; return horiz(o) ? [x + o.at, y] : [x, y + o.at]; };
const RISERS = Math.round((LV[1] - LV[0]) / 0.2); // 200 mm risers; the flight rises north from its foot at stair[3]
const GOING = (ST[3] - ST[1]) / RISERS;

/* ---------- Plan: SVG units = metres × S ---------- */

const S = 40, M = 3.35;          // M: margin for dimensions and marks around the house (room for phone-sized heads)
const RING = 2.75, R = 0.32;     // grid bubbles and view heads (radius R) sit on this ring outside the walls
const s = (m: number) => r1(m * S);
const xy = (x: number, y: number) => `${s(x)} ${s(y)}`;
const boxD = ([x0, y0, x1, y1]: Box) => `M${xy(x0, y0)}H${s(x1)}V${s(y1)}H${s(x0)}Z`;
const VB = `${-s(M)} ${-s(M)} ${s(W + 2 * M)} ${s(D + 2 * M)}`;

/** Walls (pieces between openings, ends run on by half a wall so corners close) and thin lines, for one floor. */
const FLOORS = [0, 1].map((f) => {
  let walls = "", lines = "";
  HOUSE.walls.forEach(([x0, y0, x1, y1], i) => {
    const h = y0 === y1;
    let from = -H;
    for (const o of [...HOUSE.openings.filter((o) => o.wall === i && onFloor(o, f)).sort((a, b) => a.at - b.at), null]) {
      const to = o ? o.at - o.w / 2 : x1 - x0 + y1 - y0 + H;
      walls += boxD(h ? [x0 + from, y0 - H, x0 + to, y0 + H] : [x0 - H, y0 + from, x0 + H, y0 + to]);
      if (o) from = o.at + o.w / 2;
    }
  });
  for (const o of HOUSE.openings.filter((o) => onFloor(o, f))) {
    const [cx, cy] = mid(o), h = horiz(o), a = o.w / 2;
    if (!o.door) { // frame, glass, frame
      for (const k of [-H, 0, H]) lines += h ? `M${xy(cx - a, cy + k)}H${s(cx + a)}` : `M${xy(cx + k, cy - a)}V${s(cy + a)}`;
      continue;
    }
    const sd = o.s ?? 1; // leaf hinged at the opening's start, open 90° towards side s
    const hinge: Pt = h ? [cx - a, cy + sd * H] : [cx + sd * H, cy - a];
    const open: Pt = h ? [hinge[0], hinge[1] + sd * o.w] : [hinge[0] + sd * o.w, hinge[1]];
    const shut: Pt = h ? [cx + a, hinge[1]] : [hinge[0], cy + a];
    const cw = (open[0] - hinge[0]) * (shut[1] - hinge[1]) - (open[1] - hinge[1]) * (shut[0] - hinge[0]) > 0;
    lines += `M${xy(...hinge)}L${xy(...open)}A${s(o.w)} ${s(o.w)} 0 0 ${cw ? 1 : 0} ${xy(...shut)}`;
  }
  const [x0, y0, x1, y1] = ST, cx = (x0 + x1) / 2;
  lines += boxD(ST);
  for (let k = 1; k < RISERS; k++) lines += `M${xy(x0, y1 - k * GOING)}H${s(x1)}`;
  if (f === 0) lines += `M${xy(cx, y1 - 0.15)}V${s(y0 + 0.3)}M${xy(cx - 0.13, y0 + 0.52)}L${xy(cx, y0 + 0.3)}L${xy(cx + 0.13, y0 + 0.52)}`;
  return { walls, lines };
});
const COLS = GRID.x.flatMap((x) => GRID.y.map((y) => boxD([x - 0.15, y - 0.15, x + 0.15, y + 0.15]))).join("");
const GRID_D = GRID.x.map((x) => `M${xy(x, R - RING)}V${s(D + 2.3)}`).join("") + GRID.y.map((y) => `M${xy(R - RING, y)}H${s(W + 2.3)}`).join("");

function PlanArt({ f, hatch }: { f: number; hatch?: boolean }) {
  const { walls, lines } = FLOORS[f];
  return (
    <g className="pd-walls">
      <path className="wo" d={walls} />
      <path className="wf" d={walls} />
      {hatch !== undefined && <path className={`wh${hatch ? " on" : ""}`} d={walls} />}
      <path className="col" d={COLS} />
      <path className="ln" d={lines} />
    </g>
  );
}

/* Dimensions: room-by-room strings (the front gets its openings), then overall strings, clockwise. */
type Side = "N" | "E" | "S" | "W";
const uniq = (a: number[]) => [...new Set(a)].sort((p, q) => p - q);
const roomPts = (side: Side) => uniq(HOUSE.rooms.map((r) => r.box)
  .filter((b) => (side === "N" ? b[1] === 0 : side === "S" ? b[3] === D : side === "W" ? b[0] === 0 : b[2] === W))
  .flatMap((b) => (side === "N" || side === "S" ? [b[0], b[2]] : [b[1], b[3]])));
const frontPts = uniq([0, W, ...HOUSE.openings.filter((o) => o.wall === 1 && onFloor(o, 0)).flatMap((o) => [o.at - o.w / 2, o.at + o.w / 2])]);
const DIMS = ([
  ["N", roomPts("N"), 1.05], ["E", roomPts("E"), 1.05], ["S", frontPts, 1.05], ["W", roomPts("W"), 1.05],
  ["N", [0, W], 1.65], ["E", [0, D], 1.65], ["S", [0, W], 1.65], ["W", [0, D], 1.65],
] as [Side, number[], number][]).map(([side, pts, off]) => {
  const xs = side === "N" || side === "S", out = side === "N" || side === "W" ? -1 : 1;
  const base = side === "S" ? D : side === "E" ? W : 0, line = base + out * off;
  const at = (a: number, o: number): Pt => (xs ? [a, o] : [o, a]);
  const [a, b] = side === "S" || side === "W" ? [pts[pts.length - 1], pts[0]] : [pts[0], pts[pts.length - 1]];
  const e = 0.12 * Math.sign(b - a);
  let marks = "";
  for (const v of pts) {
    const [x, y] = at(v, line);
    marks += `M${xy(...at(v, base + out * 0.35))}L${xy(...at(v, line + out * 0.12))}M${xy(x - 0.12, y + 0.12)}L${xy(x + 0.12, y - 0.12)}`;
  }
  return {
    xs, from: at(a, line), to: at(b, line), marks,
    line: `M${xy(...at(a - e, line))}L${xy(...at(b + e, line))}`,
    texts: pts.slice(1).map((v, i) => ({ at: at((pts[i] + v) / 2, line + out * 0.24), mm: Math.round((v - pts[i]) * 1000) })),
  };
});
const DIM_TOTAL = DIMS.reduce((n, d) => n + d.texts.length, 0);

/* Tags: rooms (name + clear area), door and window marks, wall types. */
type Tag = { at: Pt; text: string; sub?: string; shape: "room" | "door" | "win" | "wall" };
const NUDGE: Record<string, Pt> = { KITCHEN: [0.35, -0.35], HALL: [-0.5, -0.6], TOILET: [0, -0.25] }; // clear of swings and the stair
const gf = HOUSE.openings.filter((o) => onFloor(o, 0));
const doors = gf.filter((o) => o.door), wins = gf.filter((o) => !o.door);
const mark = (o: Opening): Tag => {
  const [x, y] = mid(o), h = horiz(o);
  const k = o.door ? -(o.s ?? 1) * 0.45 : 0.5 * Math.sign(h ? y - D / 2 : x - W / 2); // doors: off the swing; windows: outside
  const no = String((o.door ? doors : wins).indexOf(o) + 1).padStart(2, "0");
  return { at: h ? [x, y + k] : [x + k, y], text: (o.door ? "D" : "W") + no, shape: o.door ? "door" : "win" };
};
const clockwise = ([x, y]: Pt) => (Math.atan2(y - D / 2, x - W / 2) + 2.75 * Math.PI) % (2 * Math.PI); // from north-west
const TAGS: Tag[] = [
  ...HOUSE.rooms.map(({ name, box }): Tag => {
    const [dx, dy] = NUDGE[name[0]] ?? [0, 0];
    return { at: [(box[0] + box[2]) / 2 + dx, (box[1] + box[3]) / 2 + dy], text: name[0], sub: `${area(box).toFixed(1)} m²`, shape: "room" };
  }),
  ...gf.map(mark).sort((a, b) => clockwise(a.at) - clockwise(b.at)),
  { at: [0, 3.6], text: `EXT ${Math.round(T * 1000)}`, shape: "wall" },
  { at: [2.5, 4.5], text: `INT ${Math.round(T * 1000)}`, shape: "wall" },
];

/* Detail: hatching, grid bubbles, elevation markers, section marks, spot levels. They also define the views. */
const FACADES = [ // the façade seen, and whether its left-to-right runs against the wall's direction
  { id: "N", name: "North", wall: 0, mirror: true, mark: [2.5, -RING] as Pt },
  { id: "E", name: "East", wall: 3, mirror: true, mark: [W + RING, 2.25] as Pt },
  { id: "S", name: "South", wall: 1, mirror: false, mark: [2.5, D + RING] as Pt },
  { id: "W", name: "West", wall: 2, mirror: false, mark: [-RING, 2.25] as Pt },
];
type Cut = { key: string; name: string; axis: "x" | "y"; c: number; look: Pt };
const CUTS: Cut[] = [
  { key: "A", name: "A–A", axis: "x", c: 6.5, look: [1, 0] },   // north–south through the front door, hall and kitchen; looks east at the stair
  { key: "B", name: "B–B", axis: "y", c: 6.75, look: [0, -1] }, // west–east through the living room, hall, stair and bedroom; looks north
];
const heads = ({ axis, c }: Cut): [Pt, Pt] => (axis === "x" ? [[c, -RING], [c, D + RING]] : [[-RING, c], [W + RING, c]]);
const toward = ([x, y]: Pt): Pt => (Math.abs(y - D / 2) > D / 2 ? [0, -Math.sign(y - D / 2)] : [-Math.sign(x - W / 2), 0]);
type Det = { kind: "hatch" | "bubble" | "elev" | "sect" | "spot"; at: Pt; to?: Pt; dir?: Pt; text: string };
const DETAIL: Det[] = [
  { kind: "hatch", at: [-0.3, -0.3], to: [W + 0.3, D + 0.3], text: "" },
  ...GRID.y.map((y, i): Det => ({ kind: "bubble", at: [-RING, y], text: String(i + 1) })),
  ...GRID.x.map((x, i): Det => ({ kind: "bubble", at: [x, -RING], text: String.fromCharCode(65 + i) })),
  ...FACADES.map((f): Det => ({ kind: "elev", at: f.mark, dir: toward(f.mark), text: f.id })),
  ...CUTS.map((c): Det => ({ kind: "sect", at: heads(c)[0], to: heads(c)[1], dir: c.look, text: c.key })),
  { kind: "spot", at: [0.55, 8.35], text: `FFL ${lvl(LV[0])}` },
  { kind: "spot", at: [7.25, 9.62], text: `GL ${lvl(GL)}` },
];

function Head({ at: [x, y], dir: [dx, dy], text }: { at: Pt; dir: Pt; text: string }) {
  const q = (a: number, b: number) => xy(x + dx * a - dy * b, y + dy * a + dx * b);
  return (
    <g className="pd-s pd-hd">
      <path className="tri" d={`M${q(R * 0.5, R * 0.87)}L${q(R + 0.26, 0)}L${q(R * 0.5, -R * 0.87)}Z`} />
      <circle cx={s(x)} cy={s(y)} r={s(R)} />
      <text x={s(x)} y={s(y)}>{text}</text>
    </g>
  );
}

/* ---------- Elevations and sections: thumbnail units = metres × E ---------- */

const E = 20, TW = 16.4, TOP = 7.7, BOTTOM = -0.9;
const VB_T = `0 0 ${TW * E} ${(TOP - BOTTOM) * E}`;
const Z = (z: number) => r1((TOP - z) * E);
const xOf = (L: number) => (u: number) => r1((u + (TW - L - 4) / 2 + 0.6) * E); // centres the view plus its level heads
const rc = (x0: number, y0: number, x1: number, y1: number) => ({ x: Math.min(x0, x1), y: Math.min(y0, y1), width: r1(Math.abs(x1 - x0)), height: r1(Math.abs(y1 - y0)) });

function Levels({ x }: { x: number }) {
  return (
    <g className="pd-lv">
      {LV.map((z) => (
        <g key={z}>
          <path d={`M${x + 4} ${Z(z)}H${x + 16}M${x + 16} ${Z(z)}l-4 -6h8z`} />
          <text x={x + 22} y={Z(z)}>{lvl(z)}</text>
        </g>
      ))}
    </g>
  );
}

function Elev({ wall, mirror }: { wall: number; mirror: boolean }) {
  const [x0, y0, x1, y1] = HOUSE.walls[wall], L = x1 - x0 + y1 - y0, X = xOf(L);
  const U = (p: number) => X(mirror ? L - p : p);
  return (
    <g className="pd-el">
      <rect className="pl" {...rc(X(-H), Z(0), X(L + H), Z(GL))} />
      <rect className="wa" {...rc(X(-H), Z(0), X(L + H), Z(LV[2]))} />
      <rect className="wa" {...rc(X(-H - 0.06), Z(LV[2]), X(L + H + 0.06), Z(LV[2] + PAR))} />
      <path className="th" d={[LV[1] - SLAB, LV[1], LV[2]].map((z) => `M${X(-H)} ${Z(z)}H${X(L + H)}`).join("")} />
      {HOUSE.openings.filter((o) => o.wall === wall).flatMap((o, i) => [0, 1].filter((f) => onFloor(o, f)).map((f) => {
        const a = U(o.at - o.w / 2), b = U(o.at + o.w / 2), m = r1((a + b) / 2);
        const z0 = Z(LV[f] + (o.door ? 0 : o.sill ?? SILL)), z1 = Z(LV[f] + HEAD);
        return (
          <g key={`${i}-${f}`} className={o.door ? "dr" : "wn"}>
            <rect {...rc(a, z1, b, z0)} />
            <path d={o.door ? `M${r1(m + (b - a) * 0.3)} ${r1((z0 + z1) / 2)}h1.5` : `${o.w >= 1 ? `M${m} ${z1}V${z0}` : ""}M${Math.min(a, b) - 1.5} ${z0}H${Math.max(a, b) + 1.5}`} />
          </g>
        );
      }))}
      <path className="gl" d={`M${X(-0.6)} ${Z(GL)}H${X(L + 0.6)}`} />
      <Levels x={X(L + H)} />
    </g>
  );
}

function Sect({ cut: { axis, c, look } }: { cut: Cut }) {
  const L = axis === "x" ? D : W, X = xOf(L), [sx0, sy0, sx1, sy1] = ST, rise = (LV[1] - LV[0]) / RISERS;
  const walls = HOUSE.walls.flatMap(([x0, y0, x1, y1], i) => { // walls running across the cut line
    const [lo, hi, u] = axis === "x" ? [x0, x1, y0] : [y0, y1, x0];
    if ((axis === "x") !== (y0 === y1) || c < lo - H || c > hi + H) return [];
    const gaps = HOUSE.openings.filter((o) => o.wall === i && Math.abs(c - lo - o.at) < o.w / 2)
      .flatMap((o) => [0, 1].filter((f) => onFloor(o, f)).map((f) => ({ z0: LV[f] + (o.door ? 0 : o.sill ?? SILL), z1: LV[f] + HEAD, glass: !o.door })))
      .sort((a, b) => a.z0 - b.z0);
    return [{ u, zs: [GL, ...gaps.flatMap((g) => [g.z0, g.z1]), LV[2] + (i < 4 ? PAR : 0)], gaps }];
  });
  const rooms = HOUSE.rooms.filter(({ box: b }) => (axis === "x" ? b[0] < c && c < b[2] : b[1] < c && c < b[3]))
    .map(({ name, box: b }) => ({ name, m: axis === "x" ? (b[1] + b[3]) / 2 : (b[0] + b[2]) / 2 }));
  const stairCut = axis === "y" && sy0 < c && c < sy1;
  const stairSeen = axis === "x" && (look[0] > 0 ? sx0 > c : sx1 < c);
  let stair = "";
  if (stairSeen) { // the flight beyond the cut, in profile: foot at sy1, head at sy0
    stair = `M${X(sy1)} ${Z(0)}`;
    for (let k = 1; k <= RISERS; k++) stair += `V${Z(k * rise)}H${X(sy1 - k * GOING)}`;
    stair += `M${X(sy1 - 2 * GOING)} ${Z(0)}L${X(sy0)} ${Z(LV[1] - SLAB - 0.3)}`;
  }
  const zc = ((sy1 - c) / (sy1 - sy0)) * (LV[1] - LV[0]); // where the cut meets the flight
  if (stairCut) {
    for (let k = Math.ceil(zc / rise); k <= RISERS; k++) stair += `M${X(sx0)} ${Z(k * rise)}H${X(sx1)}`;
    stair += `M${X(sx0)} ${Z(zc)}V${Z(LV[1])}M${X(sx1)} ${Z(zc)}V${Z(LV[1])}`;
  }
  return (
    <g className="pd-se">
      <rect className="pl" {...rc(X(-H), Z(-SLAB), X(L + H), Z(GL))} />
      {LV.flatMap((z, f) => (f === 1 && stairCut ? [[-H, sx0], [sx1, L + H]] : [[-H, L + H]]).map(([a, b]) => (
        <rect key={`${f}-${a}`} className="cut" {...rc(X(a), Z(z - SLAB), X(b), Z(z))} />
      )))}
      {walls.map(({ u, zs, gaps }) => (
        <g key={u}>
          {zs.filter((_, j) => j % 2 === 0).map((z0, j) => <rect key={z0} className="cut" {...rc(X(u - H), Z(z0), X(u + H), Z(zs[2 * j + 1]))} />)}
          {gaps.filter((g) => g.glass).map((g) => <path key={g.z0} className="gz" d={`M${X(u)} ${Z(g.z0)}V${Z(g.z1)}`} />)}
        </g>
      ))}
      {stair && <path className="st" d={stair} />}
      {stairCut && <rect className="cut" {...rc(X(sx0), Z(zc), X(sx1), Z(zc - 0.2))} />}
      {rooms.flatMap(({ name, m }) => [0, 1].map((f) => <text key={name[f]} x={X(m)} y={Z(LV[f] + 2.3)}>{name[f]}</text>))}
      <path className="gl" d={`M${X(-0.6)} ${Z(GL)}H${X(L + 0.6)}`} />
      <Levels x={X(L + H)} />
    </g>
  );
}

/* ---------- Sheets: A3 landscape, units = mm ---------- */

const SHEETS = [{ no: "A-101", name: "Plans" }, { no: "A-201", name: "Elevations" }, { no: "A-301", name: "Sections" }];

function SheetArt({ i }: { i: number }) {
  const views = i === 0
    ? [0, 1].map((f) => ({ x: 22 + f * 148, y: 92, k: 0.28, w: 134, h: 101, art: <PlanArt f={f} /> }))
    : i === 1
      ? FACADES.map((f, j) => ({ x: 18 + (j % 2) * 150, y: 50 + (j >> 1) * 110, k: 0.44, w: 144, h: 76, art: <Elev wall={f.wall} mirror={f.mirror} /> }))
      : CUTS.map((c, j) => ({ x: 46, y: 18 + j * 138, k: 0.68, w: 223, h: 117, art: <Sect cut={c} /> }));
  return (
    <g className="pd-sh">
      <rect className="paper" width="420" height="297" />
      <path className="fr" d="M8 8H412V289H8ZM318 8V289M318 62H412M318 206H412M318 244H412" />
      <rect className="logo" x="328" y="20" width="16" height="16" />
      <path className="bar" d="M352 24h44M352 33h28M328 80h66M328 92h46M328 104h56M328 220h58M328 230h36" />
      <text className="sn" x="365" y="276">{SHEETS[i].no}</text>
      {views.map((v, j) => (
        <g key={j} className="sv" style={{ transitionDelay: `${120 + j * 110}ms` }}>
          <g transform={`translate(${v.x} ${v.y}) scale(${v.k})`}>{v.art}</g>
          <path className="vt" d={`M${v.x} ${v.y + v.h + 8}h${r1(v.w * 0.4)}`} />
        </g>
      ))}
    </g>
  );
}

/* ---------- The run ---------- */

const ORDER: Step[] = ["dim", "tag", "detail", "elev", "sect", "sheet"];
const NEEDS: Partial<Record<Step, Step[]>> = { elev: ["detail"], sect: ["detail"], sheet: ["detail", "elev", "sect"] }; // views need their marks; sheets need views
const HOP = 120, GAP = 280;
const HOME: Pt = [-2.6, -2.6], PARK: Pt = [W + 2.6, -2.6]; // PARK: while the AI works in the project browser
const ITEMS: Record<Step, Item[]> = {
  dim: DIMS.map((d) => ({ at: d.from, to: d.to, ms: HOP + 300 })),
  tag: TAGS.map((t) => ({ at: t.at, ms: 125 })),
  detail: DETAIL.map((d) => ({ at: d.at, to: d.to, ms: d.kind === "hatch" ? HOP + 520 : d.to ? HOP + 380 : 150 })),
  elev: FACADES.map((f) => ({ at: f.mark, ms: 480 })),
  sect: CUTS.map((c) => ({ at: heads(c)[0], ms: 560 })),
  sheet: SHEETS.map(() => ({ at: PARK, ms: 720 })),
};
const COUNT = Object.fromEntries(ORDER.map((k) => [k, ITEMS[k].length])) as Shown;
const NONE = Object.fromEntries(ORDER.map((k) => [k, 0])) as Shown;
const ALL = COUNT;
const STEPS: Record<Step, { label: string; icon: string; busy: string; done: string }> = {
  dim: { label: "Dimension", icon: "M3 13h18M3 9v8M21 9v8M1.5 14.5l3-3M19.5 14.5l3-3M9 9h6", busy: "Placing dimensions", done: `Dimensions placed: ${DIM_TOTAL}.` },
  tag: { label: "Tag", icon: "M4 8h11l5 4-5 4H4zM7.5 12h5", busy: "Tagging rooms, doors, windows and walls", done: `Tags placed: ${TAGS.length}.` },
  detail: { label: "Detail", icon: "M12 3a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7M12 10v11M8 17h8", busy: "Adding grids, marks and hatching", done: "Detail placed: grid bubbles, elevation markers, section marks, wall hatching and spot levels." },
  elev: { label: "Elevations", icon: "M4 20V10l8-5.5 8 5.5v10zM2.5 20h19M10 20v-4.5h4V20", busy: "Cutting elevations", done: "Elevations created: north, east, south and west." },
  sect: { label: "Sections", icon: "M7 8.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7M10.5 12H21M15 7v10", busy: "Cutting sections", done: "Sections created: A–A and B–B." },
  sheet: { label: "Sheets", icon: "M3 5h18v14H3zM15.5 5v14M15.5 15H21M6 9h6.5M6 12h4.5", busy: "Placing views on sheets", done: "Sheets created: A-101 plans, A-201 elevations and A-301 sections." },
};
const RIBBON: [string, Step[]][] = [["Annotate", ["dim", "tag", "detail"]], ["Views", ["elev", "sect"]], ["Publish", ["sheet"]]];
const ROOMS = HOUSE.rooms.map((r) => r.name[0].toLowerCase());
const PLAN_LABEL = `Ground floor plan of the sample house, ${W} by ${D} metres: ${ROOMS.slice(0, -1).join(", ")} and ${ROOMS.at(-1)}, with a stair in the hall.`;

const QUERY = "(prefers-reduced-motion: reduce)";
const onMotionChange = (cb: () => void) => { const m = matchMedia(QUERY); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); };

function Thumb({ on, fresh, label, vb, children }: { on: boolean; fresh: boolean; label: React.ReactNode; vb: string; children: React.ReactNode }) {
  return (
    <li className={`pd-th${on ? " on" : ""}${fresh ? " fresh" : ""}`} aria-hidden={on ? undefined : true}>
      <svg viewBox={vb} aria-hidden="true"><g>{children}</g></svg>
      <span>{label}</span>
    </li>
  );
}

export default function PluginDemo() {
  const still = useSyncExternalStore(onMotionChange, () => matchMedia(QUERY).matches, () => false);
  const [shown, setShown] = useState<Shown | null>(null); // null until used: reduced motion then shows the finished state
  const [busy, setBusy] = useState<Step | null>(null);
  const [fresh, setFresh] = useState("");
  const [cursor, setCursor] = useState<{ at: Pt; ms: number; lin?: boolean }>({ at: HOME, ms: 0 });
  const [msg, setMsg] = useState("");
  const timers = useRef<number[]>([]);
  useEffect(() => { const list = timers.current; return () => list.forEach(clearTimeout); }, []);

  const cur = shown ?? (still ? ALL : NONE);
  const done = (k: Step) => cur[k] === COUNT[k];
  const stop = () => timers.current.splice(0).forEach(clearTimeout);
  const announce = (text: string) => setMsg((m) => (m.endsWith(" ") ? text : `${text} `)); // always a change, so it is read again

  function play(steps: Step[], from: Shown) {
    stop();
    const said = steps.length === ORDER.length
      ? `Run all finished: ${DIM_TOTAL} dimensions, ${TAGS.length} tags, ${FACADES.length + CUTS.length} views and ${SHEETS.length} sheets.`
      : steps.map((k) => STEPS[k].done).join(" ");
    const next = { ...from };
    for (const k of steps) next[k] = still ? COUNT[k] : 0;
    setShown(next);
    if (still) return announce(said);
    setMsg("");
    setBusy(steps[0]);
    let t = 0;
    const at = (fn: () => void) => { timers.current.push(window.setTimeout(fn, t)); };
    for (const k of steps) {
      at(() => setBusy(k));
      ITEMS[k].forEach((it, i) => {
        at(() => setCursor({ at: it.at, ms: HOP }));
        t += HOP;
        at(() => {
          setShown((p) => ({ ...(p ?? NONE), [k]: i + 1 }));
          setFresh(`${k}${i}`);
          if (it.to) setCursor({ at: it.to, ms: it.ms - HOP, lin: true });
        });
        t += it.ms - HOP;
      });
      t += GAP;
    }
    at(() => { setBusy(null); setFresh(""); setCursor({ at: HOME, ms: 500 }); announce(said); });
  }

  const run = (k: Step) => !busy && play([...(NEEDS[k] ?? []).filter((d) => !done(d)), k], cur);
  function runAll() {
    if (busy) return;
    const todo = ORDER.filter((k) => !done(k));
    play(todo.length ? todo : ORDER, todo.length ? cur : NONE);
  }
  function reset() {
    stop();
    setShown(NONE);
    setBusy(null);
    setFresh("");
    setCursor({ at: HOME, ms: 300 });
    announce("Reset: the plan is back to walls only.");
  }

  const on = (k: Step, i: number) => (i < cur[k] ? " on" : "");
  const dims = DIMS.slice(0, cur.dim).reduce((n, d) => n + d.texts.length, 0);
  const state = busy ? `${STEPS[busy].busy}…` : ORDER.every(done) ? "Done · ready for an engineer to check" : ORDER.some((k) => cur[k]) ? "Ready" : "Ready · press Run all";

  return (
    <div className="pd">
      <p className="pd-title"><span>Sample house · Floor plan: Ground floor</span><i aria-hidden="true">–  ▢  ✕</i></p>
      <div className="pd-tabs" aria-hidden="true">
        {["Architecture", "Structure", "Annotate", "View", "Manage"].map((t) => <span key={t}>{t}</span>)}
        <span className="on">Enhcept</span>
      </div>

      <div className="pd-ribbon">
        <div className="pd-steps">
          {RIBBON.map(([group, ids]) => (
            <div key={group} className="pd-rg">
              {ids.map((k) => (
                <button key={k} type="button" className={`pd-rb${busy === k ? " busy" : ""}`} onClick={() => run(k)} aria-disabled={busy ? true : undefined}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d={STEPS[k].icon} /></svg>
                  <span>{STEPS[k].label}</span>
                  {done(k) && <><svg className="ok" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6.5l2.2 2.2L9.5 3.5" /></svg><span className="sr-only"> (done)</span></>}
                </button>
              ))}
              <span className="pd-rl" aria-hidden="true">{group}</span>
            </div>
          ))}
        </div>
        <div className="pd-go">
          <button type="button" className="btn btn-red btn-sm" onClick={runAll} aria-disabled={busy ? true : undefined}>Run all <span className="sq" aria-hidden="true" /></button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={reset}>Reset</button>
        </div>
      </div>

      <div className="pd-bar">
        <p><span className="sq" aria-hidden="true" />{state}</p>
        <p className="pd-count">
          <span><b>{dims}</b> dimensions</span><span><b>{cur.tag}</b> tags</span><span><b>{cur.elev + cur.sect}</b> views</span><span><b>{cur.sheet}</b> sheets</span>
        </p>
      </div>

      <div className="pd-body">
        <div className="pd-canvas">
          <svg className="pd-plan" viewBox={VB} role="img" aria-label={PLAN_LABEL}>
            <defs>
              <pattern id="pd-hp" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V5" /></pattern>
              <pattern id="pd-ht" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V3" /></pattern>
            </defs>
            <path className="pd-grid" d={GRID_D} />
            <PlanArt f={0} hatch={cur.detail > 0} />

            {DIMS.map((d, i) => (
              <g key={i} className={`pd-dim${on("dim", i)}`}>
                <path className="dl" pathLength={1} d={d.line} />
                <g className="dx">
                  <path d={d.marks} />
                  {d.texts.map(({ at: [x, y], mm }, j) => (
                    <g key={j} transform={d.xs ? undefined : `rotate(-90 ${s(x)} ${s(y)})`}><text x={s(x)} y={s(y)}>{mm}</text></g>
                  ))}
                </g>
              </g>
            ))}

            {TAGS.map(({ at: [mx, my], text, sub, shape }, i) => {
              const x = s(mx), y = s(my), w = shape === "wall" ? 44 : 24;
              return shape === "room" ? (
                <g key={i} className={`pd-a pd-s pd-room${on("tag", i)}`}>
                  <text className="rn" x={x} y={y - 7}>{text}</text>
                  <text className="ra" x={x} y={y + 7}>{sub}</text>
                </g>
              ) : (
                <g key={i} className={`pd-a pd-s pd-tg${on("tag", i)}`}>
                  <rect x={x - w / 2} y={y - 6.5} width={w} height={13} rx={shape === "win" ? 6.5 : 1.5} />
                  <text x={x} y={y}>{text}</text>
                </g>
              );
            })}

            {DETAIL.map((d, i) => {
              const cls = `pd-a${on("detail", i)}`, [x, y] = d.at;
              if (d.kind === "bubble") return <g key={i} className={`${cls} pd-s pd-hd`}><circle cx={s(x)} cy={s(y)} r={s(R)} /><text x={s(x)} y={s(y)}>{d.text}</text></g>;
              if (d.kind === "elev") return <g key={i} className={cls}><Head at={d.at} dir={d.dir!} text={d.text} /></g>;
              if (d.kind === "sect") {
                const ends = [d.at, d.to!], stub = ends.map((p) => { const [tx, ty] = toward(p); return `M${xy(p[0] + tx * R, p[1] + ty * R)}L${xy(p[0] + tx * (R + 0.3), p[1] + ty * (R + 0.3))}`; }).join("");
                return <g key={i} className={cls}><path className="pd-stub" d={stub} />{ends.map((p) => <Head key={p.join()} at={p} dir={d.dir!} text={d.text} />)}</g>;
              }
              if (d.kind === "spot") return (
                <g key={i} className={`${cls} pd-s pd-spot`}>
                  <path d={`M${xy(x - 0.18, y)}H${s(x + 0.18)}M${xy(x - 0.11, y - 0.19)}H${s(x + 0.11)}L${xy(x, y)}Z`} />
                  <text x={s(x + 0.2)} y={s(y - 0.2)}>{d.text}</text>
                </g>
              );
              return null; // the hatch is drawn with the walls
            })}

            <g className="pd-cur" style={{ transform: `translate(${s(cursor.at[0])}px, ${s(cursor.at[1])}px)`, transitionDuration: `${cursor.ms}ms`, transitionTimingFunction: cursor.lin ? "linear" : undefined }}>
              <rect x="-6" y="-6" width="12" height="12" />
            </g>
          </svg>
        </div>

        <div className="pd-pane">
          <p className="pd-ph">Project browser</p>
          <div>
            <p className="pd-gh">Elevations <span>{cur.elev}/{FACADES.length}</span></p>
            <ul className="pd-thumbs">
              {FACADES.map((f, i) => <Thumb key={f.id} on={i < cur.elev} fresh={fresh === `elev${i}`} label={f.name} vb={VB_T}><Elev wall={f.wall} mirror={f.mirror} /></Thumb>)}
            </ul>
          </div>
          <div>
            <p className="pd-gh">Sections <span>{cur.sect}/{CUTS.length}</span></p>
            <ul className="pd-thumbs">
              {CUTS.map((c, i) => <Thumb key={c.key} on={i < cur.sect} fresh={fresh === `sect${i}`} label={`Section ${c.name}`} vb={VB_T}><Sect cut={c} /></Thumb>)}
            </ul>
          </div>
          <div>
            <p className="pd-gh">Sheets <span>{cur.sheet}/{SHEETS.length}</span></p>
            <ul className="pd-thumbs pd-sheets">
              {SHEETS.map((sh, i) => <Thumb key={sh.no} on={i < cur.sheet} fresh={fresh === `sheet${i}`} label={<>{sh.no}<br />{sh.name}</>} vb="0 0 420 297"><SheetArt i={i} /></Thumb>)}
            </ul>
          </div>
        </div>
      </div>
      <p className="sr-only" role="status">{msg}</p>
    </div>
  );
}
