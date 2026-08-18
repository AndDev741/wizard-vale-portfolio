/**
 * Everything in the vale that is not an interactive place.
 *
 * Model scale note: the KayKit hexagon pack is authored at strategy-game scale
 * (a house is ~0.9 units tall). The interactive buildings render at 3.1 so they
 * read next to a 1.7-unit wizard, so every prop here uses roughly that factor
 * too. A few models are authored sinking below their origin (they were made to
 * drop into a tile socket); those carry an explicit `y` to lift them back up.
 */

export interface Placement {
  x: number;
  z: number;
  y?: number;
  rotY: number;
  scale: number;
}

export interface Obstacle {
  x: number;
  z: number;
  r: number;
  /**
   * Present on walls. The obstacle is then the segment from (x, z) to
   * (x2, z2) with radius r, rather than a circle: a fence panel is nearly
   * four units long, and a circle wide enough to cover it would stop the
   * wizard well short of the timber.
   */
  x2?: number;
  z2?: number;
}

/** Radii that define the rings of the world. */
export const FOREST_INNER = 31;
export const FOREST_OUTER = 44;
export const HILL_INNER = 46;
export const HILL_OUTER = 60;
export const MOUNTAIN_INNER = 72;
export const MOUNTAIN_OUTER = 104;
export const GROUND_RADIUS = 150;

const B = 3.1; // shared building/prop scale

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface RingSpec {
  seed: number;
  count: number;
  rMin: number;
  rMax: number;
  /** [model, scaleMin, scaleMax, sinkFraction] */
  models: Array<[string, number, number, number?]>;
  avoid?: Obstacle[];
  /** keep placements this far apart from each other */
  spacing?: number;
}

/**
 * Deterministic scatter over an annulus. Runs once at module load, so the vale
 * looks identical on every visit (and between the poster image and the canvas).
 */
function scatterRing(spec: RingSpec): Record<string, Placement[]> {
  const rnd = mulberry32(spec.seed);
  const out: Record<string, Placement[]> = {};
  const taken: Array<{ x: number; z: number; r: number }> = [];
  const spacing = spec.spacing ?? 0;
  let placed = 0;
  let guard = 0;

  while (placed < spec.count && guard < spec.count * 60) {
    guard += 1;
    const angle = rnd() * Math.PI * 2;
    // sqrt keeps the density even across the annulus instead of bunching inward
    const t = Math.sqrt(rnd());
    const radius = spec.rMin + (spec.rMax - spec.rMin) * t;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    if (spec.avoid?.some((a) => Math.hypot(x - a.x, z - a.z) < a.r)) continue;
    if (spacing > 0 && taken.some((p) => Math.hypot(x - p.x, z - p.z) < spacing)) continue;

    const pick = spec.models[Math.floor(rnd() * spec.models.length)];
    const [model, sMin, sMax, sink = 0] = pick;
    const scale = sMin + rnd() * (sMax - sMin);

    out[model] ??= [];
    out[model].push({
      x,
      z,
      y: sink ? -sink * scale : undefined,
      rotY: rnd() * Math.PI * 2,
      scale,
    });
    taken.push({ x, z, r: spacing });
    placed += 1;
  }
  return out;
}

/** Merge scatter results so one model ends up in a single instanced draw. */
function mergeGroups(...groups: Array<Record<string, Placement[]>>): Record<string, Placement[]> {
  const out: Record<string, Placement[]> = {};
  for (const g of groups) {
    for (const [model, items] of Object.entries(g)) {
      out[model] = (out[model] ?? []).concat(items);
    }
  }
  return out;
}

/**
 * Not every model is centred on its own origin. The straight fence panels are
 * authored a whole unit to -x (they were made to line up along a hex tile edge)
 * and the gates half a unit, so a fence run placed at one x was drawn 3.1 units
 * to the side, through whatever stood there, with the gate jogged 1.5 out of
 * line with its own panels. These are each model's local offset, measured from
 * the gltf position accessors, and place() cancels them out. So a coordinate in
 * this file means where the thing actually appears.
 */
const PIVOT: Record<string, [number, number]> = {
  fence_wood_straight: [-1, 0],
  fence_stone_straight: [-1, 0],
  fence_wood_straight_gate: [-0.504, 0],
  fence_stone_straight_gate: [-0.519, 0],
  building_watermill_blue: [0, 0.248],
  building_lumbermill_red: [-0.003, 0.205],
  building_stage_A: [0.043, 0.095],
  flag_red: [0, -0.11],
  flag_blue: [0, -0.11],
  flag_green: [0, -0.11],
  flag_yellow: [0, -0.11],
};

/**
 * Fence panels block as walls. The gates deliberately do not: their arch is an
 * opening, so a run of fence with a gate in it has a way through.
 */
const WALL: Record<string, { span: number; r: number }> = {
  fence_wood_straight: { span: 1.15, r: 0.55 },
  fence_stone_straight: { span: 1.15, r: 0.65 },
};

/**
 * Props solid enough to walk around, as half their widest local extent. The
 * radius is that half-extent at the placement scale, plus room for the wizard's
 * own body. Anything absent from here is flat or small enough to walk over.
 */
const PROP_HALF: Record<string, number> = {
  barrel: 0.1,
  crate_A_big: 0.105,
  crate_A_small: 0.07,
  crate_B_small: 0.07,
  crate_open: 0.165,
  crate_long_A: 0.2,
  resource_lumber: 0.345,
  resource_stone: 0.21,
  pallet: 0.15,
  wheelbarrow: 0.255,
  ladder: 0.125,
  tree_single_A_cut: 0.085,
  flag_red: 0.13,
  flag_blue: 0.13,
  flag_green: 0.13,
  flag_yellow: 0.13,
};
const BODY_ROOM = 0.35;

/** Filled by place() as the village is laid out, so it can never drift. */
const placedObstacles: Obstacle[] = [];

function place(
  model: string,
  x: number,
  z: number,
  rotY = 0,
  scale = B,
  y?: number,
): [string, Placement] {
  const [ox, oz] = PIVOT[model] ?? [0, 0];
  // Where the local offset lands once the model is turned: three rotates
  // (ox, oz) about Y to (ox·cos + oz·sin, -ox·sin + oz·cos).
  const cos = Math.cos(rotY);
  const sin = Math.sin(rotY);
  const dx = (ox * cos + oz * sin) * scale;
  const dz = (-ox * sin + oz * cos) * scale;

  const wall = WALL[model];
  if (wall) {
    // The panel runs along its local z axis, which turns to (sin, cos).
    const half = (wall.span / 2) * scale;
    placedObstacles.push({
      x: x - sin * half,
      z: z - cos * half,
      x2: x + sin * half,
      z2: z + cos * half,
      r: wall.r,
    });
  } else {
    const half = PROP_HALF[model];
    if (half !== undefined) {
      placedObstacles.push({ x, z, r: half * scale + BODY_ROOM });
    }
  }

  return [model, { x: x - dx, z: z - dz, rotY, scale, y }];
}

function fromPairs(pairs: Array<[string, Placement]>): Record<string, Placement[]> {
  const out: Record<string, Placement[]> = {};
  for (const [model, p] of pairs) {
    out[model] ??= [];
    out[model].push(p);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Landmarks: the rest of the village, hand placed into the gaps between the
// five interactive places.
// ---------------------------------------------------------------------------

/** Models whose y is lifted so they rest on the ground (authored minY < 0). */
export const POND = { x: 21.5, z: 0.5, r: 6 };

const villagePairs: Array<[string, Placement]> = [
  // Market row and a tent beside the Guild Hall, so that corner feels traded-in
  place("building_market_red", 20, -12, 2.3, 5),
  place("tent", 14.6, -16.6, 0.7, 4.5),
  place("crate_A_big", 16.4, -14.4, 0.4, B),
  place("crate_open", 17.2, -15.4, 1.2, B),
  place("sack", 16.9, -13.4, 0.2, B * 1.2),
  place("barrel", 20.4, -9.4, 0, B),
  place("barrel", 20.9, -10.2, 0.7, B),

  // Farmland south, behind the Cottage and the Raven Post: a fenced garden,
  // with the reed models standing in as rows of crops.
  place("wheelbarrow", 5.6, 17.4, 2.1, B * 1.1),
  place("sack", 4.4, 18.6, 0.9, B * 1.2),
  place("sack", 5.1, 19.2, 2.4, B * 1.2),
  place("pallet", 6.4, 18.4, 0.5, B),
  place("waterplant_C", -0.6, 19.2, 0.3, 3.6),
  place("waterplant_B", 0.8, 19.6, 1.4, 3.4),
  place("waterplant_C", 2.2, 19.3, 2.7, 3.5),
  place("waterplant_B", 3.5, 19.7, 4.1, 3.3),
  place("waterplant_C", -0.2, 21.4, 5.2, 3.4),
  place("waterplant_B", 1.4, 21.8, 0.8, 3.5),
  place("waterplant_C", 3.0, 21.5, 2.2, 3.3),
  place("building_home_A_red", -11.5, 19, 3.4, 6.5),
  place("building_home_B_yellow", -17.5, 15, 2.2, 5),

  // Working west: a lumber yard and the windmill on open ground
  place("building_lumbermill_red", -21, 3, 1.5, 5.5),
  place("resource_lumber", -18.6, 5.4, 0.5, B),
  place("resource_lumber", -18.9, 4.2, 2.4, B),
  place("pallet", -19.6, 6.6, 0.3, B),
  place("tree_single_A_cut", -23.5, 7.5, 0, 3.2),
  place("tree_single_A_cut", -22.2, 9.4, 1.1, 3.0),
  place("building_windmill_green", -20, -12.5, 2.6, 6),

  // North: the sleeping side of the village, plus the site where v2 gets built
  place("building_home_A_red", 6, -20, 3.0, 6.5),
  place("building_home_B_green", -7.5, -18.5, 2.7, 5),
  place("building_scaffolding", -2, -22.5, 0.4, 4.2),
  place("resource_stone", 1.8, -20.2, 1.3, B),
  place("ladder", -9.6, -16.4, 1.9, B),

  // The pond east, with the watermill dipping its wheel in
  place("building_watermill_blue", 25.4, -3, 1.9, 5),
  place("bucket_water", 17.6, 6.4, 0.5, B * 1.6),
  place("bucket_empty", 16.9, 7.2, 1.4, B * 1.6),

  // A second market corner and odds and ends along the ring road
  place("tent", 21.6, -6.2, 2.9, 4.2),
  place("crate_long_A", 20.2, -7.4, 1.7, B),
  place("resource_stone", 13.6, -12.4, 0.8, B),
  place("barrel", -15.4, -8.6, 0, B),
  place("crate_A_big", -14.6, -9.4, 1.1, B),
  place("ladder", -12.2, 12.8, 0.6, B),
  place("resource_lumber", -8.4, 18.2, 1.9, B),
  place("wheelbarrow", -14.2, 18.4, 0.7, B * 1.1),
  place("crate_open", 8.4, -16.8, 2.2, B),
  place("sack", 7.6, -17.4, 0.4, B * 1.2),

  // Plaza dressing
  place("building_stage_A", 2.5, 6.2, 0.25, 5),
  place("crate_long_A", -3.4, -4.6, 0.6, B),
  place("barrel", -4.2, -3.8, 0, B),
  place("crate_B_small", -3.1, -3.2, 1.1, B),
  place("bucket_empty", 1.8, -2.4, 0, B * 1.3),

  // A coloured pennant by each door, matching that building's roof
  place("flag_red", 6.4, -8.6, 2.1, 5.2),
  place("flag_blue", -10.3, -3.2, 4.0, 5.2),
  place("flag_yellow", -9.6, 3.9, 5.4, 5.2),
  place("flag_green", 6, 8, 0.8, 5.2),

  // Fences: the Cottage's garden, the Library's low stone wall, the farm edge
  place("fence_wood_straight", 16.6, 6.9, 0, B),
  place("fence_wood_straight_gate", 18.1, 10.47, 0, B),
  place("fence_wood_straight", 16.6, 13.8, 0, B),
  place("fence_stone_straight", -18.5, 5.6, 0, B),
  place("fence_stone_straight_gate", -18.5, 9.17, 0, B),
  place("fence_stone_straight", -18.5, 12.74, 0, B),

  // Water plants around the pond rim
  place("waterplant_C", 15.2, 1.6, 0.4, 5.6),
  place("waterplant_B", 16.3, -3.2, 1.9, 5.4),
  place("waterplant_A", 18.3, 6, 2.7, 5.6),
  place("waterplant_C", 23.7, 6.5, 5.1, 5.2),
  place("waterplant_B", 24.7, -5, 3.3, 5.4),
  place("waterlily_A", 20.5, 1.5, 0.6, 5),
  place("waterlily_B", 22.8, 2.6, 2.2, 5),
  place("waterlily_A", 19.8, -1.4, 4.4, 4.6),

  // A few trees inside the village, kept clear of the paths
  place("tree_single_B", 6.2, -13.4, 0.5, 7),
  place("tree_single_A", -6.4, -12.2, 2.2, 6.6),
  place("tree_single_B", -18.4, -4.6, 1.1, 7.2),
  place("tree_single_A", -14.8, 14.6, 3.3, 6.8),
  place("tree_single_B", -5.6, 15.4, 5.0, 7),
  place("tree_single_A", 14.2, -17.2, 1.8, 6.6),
  place("tree_single_B", 23.6, 8.4, 2.4, 7),
  place("tree_single_A", 25.2, -6.8, 0.9, 6.8),
];

export const villageProps = fromPairs(villagePairs);

/** Solid things the wizard should walk around, on top of the interactive places. */
const landmarkObstacles: Obstacle[] = [
  // Radii come from each model's own bounding box at the scale it renders,
  // plus a little margin so the wizard never clips a wall.
  { x: 20, z: -12, r: 4.4 },      // market row
  { x: 14.6, z: -16.6, r: 1.2 },  // tent by the market
  { x: 21.6, z: -6.2, r: 1.1 },   // tent on the ring road
  { x: -11.5, z: 19, r: 2.8 },    // house, south
  { x: -17.5, z: 15, r: 2.8 },    // house, south west
  { x: -21, z: 3, r: 3.7 },       // lumber mill
  { x: -20, z: -12.5, r: 3.4 },   // windmill
  { x: 6, z: -20, r: 2.8 },       // house, north
  { x: -7.5, z: -18.5, r: 2.8 },  // house, north west
  { x: -2, z: -22.5, r: 4.3 },    // the site where v2 gets built
  { x: 25.4, z: -3, r: 3.1 },     // watermill
  { x: POND.x, z: POND.z, r: POND.r },
  { x: 2.5, z: 6.2, r: 2.6 },     // the plaza stage
  // village trees
  { x: 6.2, z: -13.4, r: 2.2 },
  { x: -6.4, z: -12.2, r: 2.1 },
  { x: -18.4, z: -4.6, r: 2.3 },
  { x: -14.8, z: 14.6, r: 2.2 },
  { x: -5.6, z: 15.4, r: 2.2 },
  { x: 14.2, z: -17.2, r: 2.1 },
];

// ---------------------------------------------------------------------------
// Scattered rings
// ---------------------------------------------------------------------------

const forest = scatterRing({
  seed: 20260817,
  count: 96,
  rMin: FOREST_INNER,
  rMax: FOREST_OUTER,
  spacing: 5.5,
  models: [
    ["trees_A_medium", 4.8, 6.2],
    ["trees_A_large", 5.5, 7.0],
    ["trees_A_small", 5.0, 6.5],
    ["trees_B_medium", 4.8, 6.2],
    ["trees_B_large", 5.0, 6.5],
    ["trees_B_small", 5.5, 7.0],
    ["tree_single_A", 6.5, 8.0],
    ["tree_single_B", 6.5, 8.0],
  ],
});

/** Sparse trees just outside the village, softening the jump to dense forest. */
const treeline = scatterRing({
  seed: 77123,
  count: 42,
  rMin: 26,
  rMax: 31.5,
  spacing: 5,
  models: [
    ["tree_single_A", 6.2, 7.6],
    ["tree_single_B", 6.2, 7.6],
    ["trees_B_small", 5.2, 6.4],
  ],
  // Several village buildings sit inside this band, so the treeline has to
  // steer around them or a trunk grows through a roof.
  avoid: [
    { x: POND.x, z: POND.z, r: 12 },
    { x: 25.4, z: -3, r: 10 },
    { x: -2, z: -22.5, r: 11 },
    { x: 2, z: 20, r: 10 },
    { x: 20, z: -12, r: 11 },
    { x: 14.6, z: -16.6, r: 8 },
    { x: -11.5, z: 19, r: 9 },
    { x: -17.5, z: 15, r: 9 },
    { x: 6, z: -20, r: 9 },
    { x: -7.5, z: -18.5, r: 9 },
    { x: -21, z: 3, r: 10 },
    { x: -20, z: -12.5, r: 10 },
  ],
});

const rocksNear = scatterRing({
  seed: 4242,
  count: 40,
  rMin: 12,
  rMax: 26,
  spacing: 2.4,
  models: [
    ["rock_single_A", 3.0, 5.0],
    ["rock_single_B", 2.8, 4.4],
  ],
  avoid: [
    { x: 0, z: 0, r: 11 },
    { x: 12, z: -7, r: 6 },
    { x: -13, z: -8, r: 6 },
    { x: -12, z: 9, r: 6 },
    { x: 11, z: 9, r: 6 },
    { x: -4, z: 10.5, r: 4 },
    { x: POND.x, z: POND.z, r: 6 },
    { x: 18.5, z: -11, r: 5 },
    { x: 2, z: 20, r: 5 },
  ],
});

const rocksFar = scatterRing({
  seed: 99881,
  count: 22,
  rMin: 27,
  rMax: 40,
  spacing: 3,
  models: [
    ["rock_single_C", 4.0, 6.4],
    ["rock_single_D", 3.8, 5.8],
    ["rock_single_E", 4.4, 7.0],
  ],
});

/**
 * Hills and mountains close the valley. The grass-topped terrain tiles in this
 * pack read as floating yellow platforms on open ground, so the horizon is
 * built from the plain rock variants instead, sunk slightly to bury the base.
 */
const foothills = scatterRing({
  seed: 5150,
  count: 10,
  rMin: HILL_INNER + 6,
  rMax: HILL_OUTER,
  spacing: 9,
  models: [
    ["mountain_A", 4.5, 7, 0.05],
    ["mountain_C", 4.5, 7, 0.05],
  ],
});

const mountains = scatterRing({
  seed: 60660,
  count: 13,
  rMin: MOUNTAIN_INNER,
  rMax: MOUNTAIN_OUTER,
  spacing: 17,
  models: [
    ["mountain_A", 11, 17, 0.04],
    ["mountain_B", 11, 18, 0.04],
    ["mountain_C", 11, 17, 0.04],
  ],
});

/** Instanced scatter, grouped so each model is one draw call. */
export const scatter = mergeGroups(forest, treeline, rocksNear, rocksFar);

/** Terrain on the skyline, drawn darker so it sits behind the vale. */
export const ridge = mergeGroups(foothills, mountains);

/** Clouds drift as one slowly turning layer. */
export const clouds: Placement[] = [
  { x: 42, z: -26, y: 38, rotY: 0.4, scale: 2.2 },
  { x: -48, z: 14, y: 44, rotY: 2.1, scale: 2.6 },
  { x: 10, z: 56, y: 40, rotY: 4.2, scale: 1.9 },
  { x: -22, z: -52, y: 46, rotY: 1.1, scale: 2.4 },
  { x: 60, z: 30, y: 36, rotY: 3.3, scale: 2 },
  { x: -58, z: -34, y: 48, rotY: 5.4, scale: 2.3 },
];
export const cloudModels = ["cloud_big", "cloud_small"] as const;

/** Soft colour patches that keep the grass from reading as one flat disc. */
export const grassPatches: Array<{ x: number; z: number; r: number; color: string }> = [
  { x: -18, z: -22, r: 12, color: "#28402f" },
  { x: 24, z: 16, r: 10, color: "#31492f" },
  { x: -26, z: 12, r: 9, color: "#28402f" },
  { x: 12, z: -24, r: 11, color: "#31492f" },
  { x: 0, z: 28, r: 14, color: "#28402f" },
  { x: -32, z: -4, r: 10, color: "#2f4632" },
];

/** Lantern posts: four around the plaza, plus a pair further out on the roads. */
export const lanterns: Array<[number, number]> = [
  [5.5, -5.5],
  [-5.5, -5.5],
  [-5.5, 5.5],
  [5.5, 5.5],
  [15.8, -6.4],
  [-16.2, -3.2],
  [1.6, 14.2],
  [-9.2, -14.6],
  [17.4, 8.8],
];

/**
 * Everything the wizard has to walk around: the hand-placed landmarks, the
 * fences and props derived while the village was laid out, and the lamp posts.
 * Circles unless they carry a second point, in which case they are wall
 * segments. Assembled here so nothing needs listing twice.
 */
export const obstacles: Obstacle[] = [
  ...landmarkObstacles,
  ...placedObstacles,
  ...lanterns.map(([x, z]) => ({ x, z, r: 0.45 })),
];

/** Thin a scatter group down for small screens, keeping the layout stable. */
export function thinGroups(
  groups: Record<string, Placement[]>,
  keep: number,
): Record<string, Placement[]> {
  if (keep >= 1) return groups;
  const out: Record<string, Placement[]> = {};
  for (const [model, items] of Object.entries(groups)) {
    // Keeps an evenly spread `keep` fraction, and keeps it stable across reloads.
    const kept = items.filter(
      (_, i) => Math.floor((i + 1) * keep) > Math.floor(i * keep),
    );
    if (kept.length) out[model] = kept;
  }
  return out;
}

/** Every model this module can ask for, so the loader can prefetch them. */
export const propModels = Array.from(
  new Set([
    ...Object.keys(villageProps),
    ...Object.keys(scatter),
    ...Object.keys(ridge),
    ...cloudModels,
  ]),
);
