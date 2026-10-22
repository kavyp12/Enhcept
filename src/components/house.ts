// Our own two-storey house, 12 × 9 m, drawn for this site (never traced from a client job). One source for the hero
// film (hero/scene.ts) and the plugin demo, so the plan, the 3D model, the elevations and the sections always agree.
// Plan coordinates in metres: x runs east 0–12, y runs south 0–9 (north is up on the plan). The entrance faces south.

/** A wall centre line, from the smaller coordinate to the larger: [x0, y0, x1, y1]. */
export type Wall = [number, number, number, number];
/**
 * An opening in walls[wall], centred `at` metres from the wall's start, `w` wide.
 * Doors run from the floor to HOUSE.head and swing towards side s (+1 = towards +x / +y). Windows run from
 * `sill` (default HOUSE.sill) to HOUSE.head. `floor` limits it to one storey (0 ground, 1 first); default both.
 */
export type Opening = { wall: number; at: number; w: number; door?: boolean; s?: 1 | -1; sill?: number; floor?: 0 | 1 };
/** Rectangle between wall centre lines: [x0, y0, x1, y1]. */
export type Box = [number, number, number, number];

export const HOUSE = {
  w: 12, d: 9,
  t: 0.23,                     // wall thickness, every wall
  level: [0, 3.2, 6.4],        // finished levels: ground floor, first floor, roof
  ground: -0.45,               // site level: the house sits on a 450 mm plinth
  slab: 0.15,
  parapet: 0.9,                // roof parapet height
  head: 2.1,                   // door and window head height, above each floor
  sill: 0.9,
  grid: { x: [0, 5, 8, 12], y: [0, 4.5, 9] }, // gridlines A–D and 1–3, a column at every crossing
  walls: [
    [0, 0, 12, 0],     // 0 north
    [0, 9, 12, 9],     // 1 south, the front
    [0, 0, 0, 9],      // 2 west
    [12, 0, 12, 9],    // 3 east (walls 0–3 are the outside walls)
    [5, 0, 5, 9],      // 4 on grid B
    [8, 0, 8, 9],      // 5 on grid C
    [0, 4.5, 5, 4.5],  // 6
    [8, 2.4, 12, 2.4], // 7
    [5, 3, 8, 3],      // 8
  ] as Wall[],
  openings: [
    { wall: 0, at: 2.5, w: 1.5 }, { wall: 0, at: 6.5, w: 1.2 }, { wall: 0, at: 10, w: 0.6, sill: 1.5 },
    { wall: 1, at: 2.5, w: 1.8 }, { wall: 1, at: 10, w: 1.8 },
    { wall: 1, at: 6.5, w: 1.0, door: true, s: -1, floor: 0 }, // front door
    { wall: 1, at: 6.5, w: 1.2, floor: 1 },                    // first-floor window over it
    { wall: 2, at: 2.25, w: 1.2 }, { wall: 2, at: 6.75, w: 1.5 },
    { wall: 3, at: 5.7, w: 1.5 },
    { wall: 4, at: 1.5, w: 0.9, door: true, s: -1 },
    { wall: 4, at: 3.75, w: 0.9, door: true, s: -1 },
    { wall: 4, at: 6.8, w: 0.9, door: true, s: -1 },
    { wall: 5, at: 8.3, w: 0.9, door: true, s: 1 },
    { wall: 7, at: 2, w: 0.8, door: true, s: -1 },
    { wall: 8, at: 1.5, w: 0.9, door: true, s: -1 },
  ] as Opening[],
  rooms: [ // names: [ground floor, first floor]
    { name: ["LIVING", "BED 1"], box: [0, 4.5, 5, 9] as Box },
    { name: ["DINING", "BED 2"], box: [0, 0, 5, 4.5] as Box },
    { name: ["KITCHEN", "BATH"], box: [5, 0, 8, 3] as Box },
    { name: ["HALL", "LOUNGE"], box: [5, 3, 8, 9] as Box },
    { name: ["TOILET", "BATH 2"], box: [8, 0, 12, 2.4] as Box },
    { name: ["BEDROOM", "BED 3"], box: [8, 2.4, 12, 9] as Box },
  ],
  stair: [6.95, 3.5, 7.9, 7.75] as Box, // one straight flight along grid C, rising north to the first floor
};

/** Clear floor area of a room in m² (between the wall faces). */
export const area = ([x0, y0, x1, y1]: Box) => (x1 - x0 - HOUSE.t) * (y1 - y0 - HOUSE.t);
