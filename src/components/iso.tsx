// Isometric line-art from tiny 3D primitives. World axes: +x right-down, +y left-down, +z up.
// Primitives draw in array order, so list them back to front.

type P3 = [number, number, number];
export type Prim = { box: number[]; t?: string } | { line: P3[]; t?: string };

const C = Math.cos(Math.PI / 6);
export const sx = ([x, y]: P3) => (x - y) * C;
export const sy = ([x, y, z]: P3) => (x + y) / 2 - z;
const pts = (p: P3[]) => p.map((q) => `${sx(q).toFixed(1)},${sy(q).toFixed(1)}`).join(" ");

// The three visible faces of a box [x, y, z, w, d, h]: left (+y), right (+x), top (+z).
function faces([x, y, z, w, d, h]: number[]): [string, P3[]][] {
  const X = x + w, Y = y + d, Z = z + h;
  return [
    ["fl", [[x, Y, z], [X, Y, z], [X, Y, Z], [x, Y, Z]]],
    ["fr", [[X, y, z], [X, Y, z], [X, Y, Z], [X, y, Z]]],
    ["ft", [[x, y, Z], [X, y, Z], [X, Y, Z], [x, Y, Z]]],
  ];
}

export function IsoPrims({ prims }: { prims: Prim[] }) {
  return prims.map((p, i) =>
    "box" in p ? (
      <g key={i} className={`ib ${p.t ?? ""}`}>
        {faces(p.box).map(([k, f]) => <polygon key={k} className={k} points={pts(f)} />)}
      </g>
    ) : (
      <polyline key={i} className={p.t} points={pts(p.line)} />
    ),
  );
}

export function Iso({ prims, className = "" }: { prims: Prim[]; className?: string }) {
  const all = prims.flatMap((p) => ("box" in p ? faces(p.box).flatMap(([, f]) => f) : p.line));
  const xs = all.map(sx), ys = all.map(sy), pad = 4;
  const x0 = Math.min(...xs) - pad, y0 = Math.min(...ys) - pad;
  const vb = [x0, y0, Math.max(...xs) - x0 + pad, Math.max(...ys) - y0 + pad].map((n) => n.toFixed(1)).join(" ");
  return (
    <svg className={`iso ${className}`} viewBox={vb} aria-hidden="true">
      <IsoPrims prims={prims} />
    </svg>
  );
}

const sq = (x: number, y: number, z: number, s: number): P3[] => [[x, y, z], [x + s, y, z], [x + s, y + s, z], [x, y + s, z], [x, y, z]];

// One small red cube per icon: the AI square from the logo.
export const ICONS: Record<string, Prim[]> = {
  bim: [
    { box: [0, 0, 0, 64, 46, 3] },
    ...[0, 25].flatMap((z) => [
      { box: [3, 3, z + 3, 4, 4, 22] }, { box: [57, 3, z + 3, 4, 4, 22] }, { box: [3, 39, z + 3, 4, 4, 22] },
      { box: [30, 3, z + 3, 4, 4, 22] }, { box: [57, 39, z + 3, 4, 4, 22] },
      { box: [0, 0, z + 25, 64, 46, 3], t: "glass" },
    ]),
    { box: [42, 8, 53, 12, 10, 7], t: "red" },
  ],
  map: [
    { line: [[34, 26, 50], [0, 0, 4]], t: "dash" },
    { line: [[34, 26, 50], [68, 0, 4]], t: "dash" },
    { line: [[34, 26, 50], [0, 52, 4]], t: "dash" },
    { box: [0, 0, 0, 68, 52, 4] },
    { box: [8, 6, 4, 52, 40, 4] },
    { box: [16, 12, 8, 36, 28, 4] },
    { box: [24, 18, 12, 20, 16, 4] },
    { box: [30, 22, 50, 8, 8, 3] },
    { line: [[34, 26, 50], [68, 52, 4]], t: "dash" },
    { box: [31, 23, 16, 6, 6, 6], t: "red" },
  ],
  plug: [
    { box: [0, 0, 0, 56, 56, 14] },
    { line: sq(20, 20, 14, 16), t: "dash" },
    { line: [[20, 36, 14], [20, 36, 30]], t: "dash" },
    { line: [[36, 36, 14], [36, 36, 30]], t: "dash" },
    { line: [[36, 20, 14], [36, 20, 30]], t: "dash" },
    { box: [20, 20, 30, 16, 16, 16], t: "red" },
  ],
  app: [
    { box: [0, 0, 0, 62, 42, 3] },
    { box: [7, 16, 3, 48, 4, 36] },
    { line: [[11, 20, 34], [51, 20, 34]] },
    { line: [[11, 20, 27], [36, 20, 27]], t: "thin" },
    { line: [[11, 20, 22], [44, 20, 22]], t: "thin" },
    { line: [[11, 20, 17], [30, 20, 17]], t: "thin" },
    { box: [41, 20, 9, 9, 1, 6], t: "red" },
  ],
  erp: [
    { box: [0, 0, 0, 66, 40, 3] },
    { box: [6, 14, 3, 10, 12, 12] },
    { box: [21, 14, 3, 10, 12, 21] },
    { box: [36, 14, 3, 10, 12, 30] },
    { box: [51, 14, 3, 10, 12, 40], t: "red" },
  ],
  ai: [
    { line: [[0, 0, 0], [48, 0, 0]], t: "dash" },
    { line: [[0, 0, 0], [0, 48, 0]], t: "dash" },
    { line: [[0, 0, 0], [0, 0, 48]], t: "dash" },
    { box: [14, 14, 14, 20, 20, 20], t: "red" },
    { box: [0, 0, 0, 48, 48, 48], t: "ghost" },
  ],
  academy: [
    { box: [0, 0, 0, 50, 16, 30] },
    { box: [0, 16, 0, 50, 16, 20] },
    { box: [0, 32, 0, 50, 16, 10] },
    { box: [20, 3, 30, 10, 10, 10], t: "red" },
  ],
  roadmap: [
    { line: [[7, -72, 3], [7, 7, 3]], t: "dash" },
    { box: [0, -72, 0, 14, 14, 3], t: "ghost" },
    { box: [0, -54, 0, 14, 14, 3], t: "ghost" },
    { box: [0, -36, 0, 14, 14, 3], t: "ghost" },
    { box: [0, -18, 0, 14, 14, 3] },
    { box: [0, 0, 0, 14, 14, 3] },
    { box: [3, 3, 3, 8, 8, 8], t: "red" },
  ],
};

export function IsoIcon({ name, className }: { name: string; className?: string }) {
  return <Iso prims={ICONS[name]} className={className} />;
}
