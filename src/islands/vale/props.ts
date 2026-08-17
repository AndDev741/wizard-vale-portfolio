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
}

/** Radii that define the rings of the world. */
export const FOREST_INNER = 26;
export const FOREST_OUTER = 37;
export const HILL_INNER = 40;
export const HILL_OUTER = 54;
export const MOUNTAIN_INNER = 66;
export const MOUNTAIN_OUTER = 92;
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

function place(
  model: string,
  x: number,
  z: number,
  rotY = 0,
  scale = B,
  y?: number,
): [string, Placement] {
  return [model, { x, z, rotY, scale, y }];
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
export const POND = { x: 20, z: 2, r: 4.6 };

const villagePairs: Array<[string, Placement]> = [
  // Market row and a tent beside the Guild Hall, so that corner feels traded-in
  place("building_market_red", 18.5, -11, 2.3, B),
  place("tent", 15.6, -14.2, 0.7, 3.6),
  place("crate_A_big", 16.8, -12.6, 0.4, B),
  place("crate_open", 17.6, -13.6, 1.2, B),
  place("sack", 15.2, -12.9, 0.2, B * 1.2),
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
  place("building_home_A_red", -11.5, 19, 3.4, B),
  place("building_home_B_yellow", -17.5, 15, 2.2, B),

  // Working west: a lumber yard and the windmill on open ground
  place("building_lumbermill_red", -21, 3, 1.5, B, 0.24 * B),
  place("resource_lumber", -18.6, 5.4, 0.5, B),
  place("resource_lumber", -18.9, 4.2, 2.4, B),
  place("pallet", -19.6, 6.6, 0.3, B),
  place("tree_single_A_cut", -23.5, 7.5, 0, 3.2),
  place("tree_single_A_cut", -22.2, 9.4, 1.1, 3.0),
  place("building_windmill_green", -20, -12.5, 2.6, B, 0.5 * B),

  // North: the sleeping side of the village, plus the site where v2 gets built
  place("building_home_A_red", 4.5, -19.5, 3.0, B),
  place("building_home_B_green", -7.5, -18.5, 2.7, B),
  place("building_scaffolding", -2, -21.5, 0.4, B),
  place("resource_stone", 0.6, -19.4, 1.3, B),
  place("ladder", -9.6, -16.4, 1.9, B),

  // The pond east, with the watermill dipping its wheel in
  place("building_watermill_blue", 24.2, -2.6, 1.9, B),
  place("bucket_water", 17.2, 4.6, 0.5, B * 1.3),
  place("bucket_empty", 16.6, 5.3, 1.4, B * 1.3),

  // A second market corner and odds and ends along the ring road
  place("tent", 21.6, -6.2, 2.9, 3.4),
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
  place("building_stage_A", 2.5, 6.2, 0.25, B),
  place("crate_long_A", -3.4, -4.6, 0.6, B),
  place("barrel", -4.2, -3.8, 0, B),
  place("crate_B_small", -3.1, -3.2, 1.1, B),
  place("bucket_empty", 1.8, -2.4, 0, B * 1.3),

  // A coloured pennant by each door, matching that building's roof
  place("flag_red", 9.4, -4.6, 2.1, 5.2),
  place("flag_blue", -10.3, -6.2, 4.0, 5.2),
  place("flag_yellow", -9.6, 6.9, 5.4, 5.2),
  place("flag_green", 8.7, 7.1, 0.8, 5.2),

  // Fences: the Cottage's garden, the Library's low stone wall, the farm edge
  place("fence_wood_straight", 14.6, 4.2, 0, B),
  place("fence_wood_straight_gate", 14.6, 7.77, 0, B),
  place("fence_wood_straight", 14.6, 11.34, 0, B),
  place("fence_stone_straight", -16.4, 5.6, 0, B),
  place("fence_stone_straight_gate", -16.4, 9.17, 0, B),
  place("fence_stone_straight", -16.4, 12.74, 0, B),

  // Water plants around the pond rim
  place("waterplant_C", 17.4, -0.8, 0.4, 3.4),
  place("waterplant_B", 18.2, 5.6, 1.9, 3.4),
  place("waterplant_A", 22.8, 4.8, 2.7, 3.4),
  place("waterplant_C", 23.4, -0.4, 5.1, 3.2),
  place("waterlily_A", 19.4, 1.2, 0.6, 4),
  place("waterlily_B", 21.2, 3.4, 2.2, 4),
  place("waterlily_A", 18.6, 3.8, 4.4, 3.6),

  // A few trees inside the village, kept clear of the paths
  place("tree_single_B", 6.2, -13.4, 0.5, 3.4),
  place("tree_single_A", -6.4, -12.2, 2.2, 3.2),
  place("tree_single_B", -18.4, -4.6, 1.1, 3.6),
  place("tree_single_A", -14.8, 14.6, 3.3, 3.3),
  place("tree_single_B", -5.6, 15.4, 5.0, 3.4),
  place("tree_single_A", 14.2, -17.2, 1.8, 3.2),
  place("tree_single_B", 23.6, 8.4, 2.4, 3.5),
  place("tree_single_A", 25.2, -6.8, 0.9, 3.3),
];

export const villageProps = fromPairs(villagePairs);

/** Solid things the wizard should walk around, on top of the interactive places. */
export const obstacles: Obstacle[] = [
  { x: 18.5, z: -11, r: 3.4 },
  { x: 15.6, z: -14.2, r: 1.3 },
  { x: 2, z: 20, r: 3.2 },
  { x: -11.5, z: 19, r: 1.9 },
  { x: -17.5, z: 15, r: 2.1 },
  { x: -21, z: 3, r: 2.4 },
  { x: -20, z: -12.5, r: 2.2 },
  { x: 4.5, z: -19.5, r: 1.9 },
  { x: -7.5, z: -18.5, r: 2.1 },
  { x: -2, z: -21.5, r: 3.2 },
  { x: 24.2, z: -2.6, r: 2.2 },
  { x: POND.x, z: POND.z, r: POND.r },
  { x: 2.5, z: 6.2, r: 1.8 },
  // village trees
  { x: 6.2, z: -13.4, r: 0.9 },
  { x: -6.4, z: -12.2, r: 0.9 },
  { x: -18.4, z: -4.6, r: 0.9 },
  { x: -14.8, z: 14.6, r: 0.9 },
  { x: -5.6, z: 15.4, r: 0.9 },
  { x: 14.2, z: -17.2, r: 0.9 },
];

// ---------------------------------------------------------------------------
// Scattered rings
// ---------------------------------------------------------------------------

const forest = scatterRing({
  seed: 20260817,
  count: 78,
  rMin: FOREST_INNER,
  rMax: FOREST_OUTER,
  spacing: 3.1,
  models: [
    ["trees_A_medium", 2.6, 3.4],
    ["trees_A_large", 2.8, 3.6],
    ["trees_A_small", 2.4, 3.1],
    ["trees_B_medium", 2.6, 3.4],
    ["trees_B_large", 2.8, 3.6],
    ["trees_B_small", 2.4, 3.1],
    ["tree_single_A", 3.0, 3.8],
    ["tree_single_B", 3.0, 3.8],
  ],
});

/** Sparse trees just outside the village, softening the jump to dense forest. */
const treeline = scatterRing({
  seed: 77123,
  count: 40,
  rMin: 21,
  rMax: 26.5,
  spacing: 3.2,
  models: [
    ["tree_single_A", 3.0, 3.7],
    ["tree_single_B", 3.0, 3.7],
    ["trees_B_small", 2.3, 2.9],
  ],
  avoid: [
    { x: POND.x, z: POND.z, r: 9 },
    { x: 24.2, z: -2.6, r: 7 },
    { x: -2, z: -21.5, r: 7 },
    { x: 2, z: 20, r: 8 },
  ],
});

const rocksNear = scatterRing({
  seed: 4242,
  count: 40,
  rMin: 12,
  rMax: 26,
  spacing: 2.4,
  models: [
    ["rock_single_A", 1.8, 3.0],
    ["rock_single_B", 1.6, 2.6],
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
    ["rock_single_C", 2.4, 3.8],
    ["rock_single_D", 2.2, 3.4],
    ["rock_single_E", 2.6, 4.2],
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
    ["mountain_A", 3, 4.6, 0.05],
    ["mountain_C", 3, 4.6, 0.05],
  ],
});

const mountains = scatterRing({
  seed: 60660,
  count: 13,
  rMin: MOUNTAIN_INNER,
  rMax: MOUNTAIN_OUTER,
  spacing: 17,
  models: [
    ["mountain_A", 8, 13, 0.04],
    ["mountain_B", 8, 14, 0.04],
    ["mountain_C", 8, 13, 0.04],
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
