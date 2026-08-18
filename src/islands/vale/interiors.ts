import type { SectionKey } from "../../i18n/ui";
import type { Obstacle } from "./props";

/**
 * What is inside a building. One config per place, so the other four can be
 * filled in later without touching the renderer: a place with no entry here
 * simply opens its panel from outside, as before.
 *
 * Floors are separate rooms rather than one tall model. Climbing is a trigger on
 * the staircase, which keeps the wizard's movement flat and avoids a height
 * field, while the spiral itself is still built and walked up to.
 */

export interface InteriorProp {
  model: string;
  x: number;
  z: number;
  y?: number;
  rotY?: number;
  scale?: number;
}

export interface InteriorBoard {
  /** Key into projectDetail, or "all" for the overview board. */
  project: string;
  /** Degrees around the room, 0 being straight ahead of the entrance. */
  angle: number;
}

export interface InteriorFloor {
  key: "grimoire" | "ledger" | "warding" | "attic" | "observatory";
  boards: InteriorBoard[];
  props: InteriorProp[];
  /** Wall angles, in degrees, for mounted torches. */
  torches: number[];
  /** Wall angles for hanging banners. */
  banners: number[];
  /** Warm light colour that gives the floor its mood. */
  accent: string;
}

export interface InteriorConfig {
  place: SectionKey;
  radius: number;
  wallHeight: number;
  /** Where the spiral to the next floor begins, in degrees. */
  stairsAngle: number;
  /** The opening you arrive through, and go back down by. */
  hatchAngle: number;
  /** Ground floor only: the way back out to the vale. */
  exitAngle: number;
  floors: InteriorFloor[];
}

export const rad = (deg: number) => (deg * Math.PI) / 180;

/** A point on a ring at the given angle, 0 being +Z. */
export function ring(angleDeg: number, radius: number): [number, number] {
  const a = rad(angleDeg);
  return [Math.sin(a) * radius, Math.cos(a) * radius];
}

/** A prop against the wall, turned to face the middle of the room. */
function wall(
  model: string,
  angleDeg: number,
  radius: number,
  y = 0,
  scale = 1,
): InteriorProp {
  const [x, z] = ring(angleDeg, radius);
  return { model, x, z, y, rotY: rad(angleDeg) + Math.PI, scale };
}

/** A prop standing on the floor, turned however you like. */
function floor(
  model: string,
  angleDeg: number,
  radius: number,
  rotOffset = 0,
  scale = 1,
  y = 0,
): InteriorProp {
  const [x, z] = ring(angleDeg, radius);
  return { model, x, z, y, rotY: rad(angleDeg) + Math.PI + rad(rotOffset), scale };
}

/**
 * Interior models whose geometry sits off their own origin. Wall-mounted pieces
 * are left alone on purpose: their offset pushes them into the room, which is
 * exactly where a torch or a frame should hang from its mount.
 */
export const INTERIOR_PIVOT: Record<string, [number, number]> = {
  dg_chest: [0, 0.36],
  dg_chest_gold: [0, 0.36],
};

/** Interior props solid enough to walk around: half their widest extent. */
export const INTERIOR_BLOCK: Record<string, number> = {
  dg_table_medium_decorated_A: 1.0,
  dg_chest: 0.95,
  dg_chest_gold: 0.95,
  dg_crates_stacked: 1.12,
  dg_keg: 1.0,
  dg_coin_stack_large: 0.83,
  dg_coin_stack_medium: 0.5,
  dg_trunk_medium_A: 0.48,
  dg_pillar_decorated: 1.0,
  dg_stool: 0.38,
};

const RADIUS = 8.5;
const WALL_H = 6.2;
/**
 * The room is read as a cutaway from outside the entrance, so the angles matter:
 * the spiral takes the right-hand arc, you arrive on the left, and the wall
 * facing the camera is left clear for the boards. Nothing decorative goes in the
 * stair arc, where it would end up behind the treads.
 */
const STAIRS_ANGLE = 215;
const HATCH_ANGLE = 120;
const EXIT_ANGLE = 180;

export const towerInterior: InteriorConfig = {
  place: "projects",
  radius: RADIUS,
  wallHeight: WALL_H,
  stairsAngle: STAIRS_ANGLE,
  hatchAngle: HATCH_ANGLE,
  exitAngle: EXIT_ANGLE,
  floors: [
    {
      // Beyou. The floor that is still being written, so it is the working desk.
      key: "grimoire",
      accent: "#ffb15e",
      boards: [{ project: "beyou", angle: 0 }],
      torches: [340, 48, 96],
      banners: [338, 22],
      props: [
        { model: "rug_oval_A", x: 0, z: 2.6, scale: 1.4, rotY: 0 },
        floor("dg_table_medium_decorated_A", 0, 3.4, 0, 1),
        { model: "book_set", x: -0.5, z: 3.1, y: 1.02, rotY: 0.4, scale: 0.9 },
        { model: "book_single", x: 0.6, z: 3.6, y: 1.02, rotY: -0.7, scale: 0.9 },
        floor("dg_stool", 336, 4.6, 0, 1),
        floor("dg_stool", 24, 4.6, 0, 1),
        wall("dg_shelves", 95, RADIUS - 0.2, 1.6, 1),
        wall("dg_shelf_small_candles", 68, RADIUS - 0.2, 1.9, 1),
        floor("dg_bottle_A_labeled_green", 150, 6.4, 0, 1),
        floor("dg_bottle_B_brown", 162, 6.1, 0, 1),
        floor("dg_trunk_medium_A", 78, 6.6, 20, 1),
        floor("dg_candle_triple", 90, 6.2, 0, 1),
      ],
    },
    {
      // BitData. A blockchain is a ledger, so this floor is coin and record.
      key: "ledger",
      accent: "#e0c060",
      boards: [{ project: "bitdata", angle: 0 }],
      torches: [345, 60, 100],
      banners: [12],
      props: [
        { model: "rug_rectangle_stripes_A", x: 0, z: 2.2, scale: 1.3, rotY: 0 },
        floor("dg_chest_gold", 350, 4.4, 0, 1),
        floor("dg_chest", 20, 4.8, -15, 1),
        floor("dg_coin_stack_large", 338, 5.9, 0, 1),
        floor("dg_coin_stack_medium", 6, 3.2, 0, 1),
        floor("dg_coin_stack_medium", 44, 5.4, 0, 1),
        floor("dg_crates_stacked", 150, 6.2, 15, 1),
        floor("dg_trunk_medium_A", 95, 6.4, 0, 1),
        wall("dg_shelves", 78, RADIUS - 0.2, 1.6, 1),
        floor("dg_candle_lit", 168, 5.4, 0, 1),
      ],
    },
    {
      // Rinha de Backend. Wards decide what gets through, same as fraud checks.
      key: "warding",
      accent: "#8fb3ff",
      boards: [{ project: "rinha", angle: 0 }],
      torches: [350, 72, 104],
      banners: [340, 18],
      props: [
        { model: "rug_oval_A", x: 0, z: 2.4, scale: 1.3, rotY: 0.2 },
        wall("dg_sword_shield", 345, RADIUS - 0.15, 2.4, 1),
        wall("dg_sword_shield", 40, RADIUS - 0.15, 2.4, 1),
        floor("dg_keg", 155, 6.2, 0, 1),
        floor("dg_crates_stacked", 84, 6.4, -20, 1),
        floor("dg_stool", 350, 4.2, 0, 1),
        floor("dg_bottle_B_brown", 8, 3.6, 0, 1),
        floor("dg_candle_triple", 90, 6.2, 0, 1),
        wall("dg_shelf_small_candles", 62, RADIUS - 0.2, 1.9, 1),
      ],
    },
    {
      // The small works, and the 2023 relic they grew out of.
      key: "attic",
      accent: "#c08a5e",
      boards: [
        { project: "babel", angle: 345 },
        { project: "markdown", angle: 15 },
        { project: "pomodoro", angle: 55 },
        { project: "habittracker", angle: 78 },
      ],
      torches: [0, 100, 145],
      banners: [],
      props: [
        { model: "rug_rectangle_stripes_A", x: 0.4, z: 1.8, scale: 1.2, rotY: -0.3 },
        floor("dg_trunk_medium_A", 150, 5.4, 30, 1),
        floor("dg_trunk_medium_A", 172, 6.4, -10, 1),
        floor("dg_trunk_medium_A", 195, 5.8, 15, 1),
        floor("dg_crates_stacked", 140, 6.6, 0, 1),
        floor("dg_keg", 205, 6.6, 0, 0.8),
        wall("dg_shelves", 108, RADIUS - 0.2, 1.6, 1),
        floor("dg_candle_lit", 95, 4.8, 0, 1),
        { model: "book_single", x: -2.4, z: 2.2, y: 0, rotY: 0.8, scale: 0.9 },
      ],
    },
    {
      // The top of the tower: everything visible at once.
      key: "observatory",
      accent: "#a9c7ff",
      boards: [{ project: "all", angle: 0 }],
      torches: [345, 42, 100, 150],
      banners: [352, 60],
      props: [
        { model: "rug_oval_A", x: 0, z: 0, scale: 1.6, rotY: 0 },
        floor("dg_table_medium_decorated_A", 0, 2.8, 0, 1),
        { model: "book_set", x: 0.2, z: 2.5, y: 1.02, rotY: -0.3, scale: 0.9 },
        floor("dg_pillar_decorated", 140, 6.8, 0, 1),
        floor("dg_pillar_decorated", 90, 6.8, 0, 1),
        floor("dg_stool", 336, 4.4, 0, 1),
        floor("dg_stool", 26, 4.4, 0, 1),
        floor("dg_candle_triple", 165, 5.8, 0, 1),
        floor("dg_bottle_A_labeled_green", 172, 6.4, 0, 1),
      ],
    },
  ],
};

export const interiors: Partial<Record<SectionKey, InteriorConfig>> = {
  projects: towerInterior,
};

export function interiorFor(place: SectionKey): InteriorConfig | undefined {
  return interiors[place];
}

/** Every model an interior can ask for, so they can be prefetched together. */
export function interiorModels(config: InteriorConfig): string[] {
  const set = new Set<string>([
    "dg_floor_wood_small",
    "dg_torch_mounted",
    "dg_banner_patternA_blue",
    "pictureframe_large_B",
  ]);
  for (const f of config.floors) for (const p of f.props) set.add(p.model);
  return [...set];
}

/**
 * The colliders for one floor: the room wall as a ring the wizard stays inside,
 * plus a circle for each prop worth walking around. Derived from the same
 * placements the renderer uses, so they cannot drift.
 */
export function floorColliders(config: InteriorConfig, floor: InteriorFloor): Obstacle[] {
  const out: Obstacle[] = [];
  for (const p of floor.props) {
    const half = INTERIOR_BLOCK[p.model];
    if (half === undefined) continue;
    const scale = p.scale ?? 1;
    const [ox, oz] = INTERIOR_PIVOT[p.model] ?? [0, 0];
    const rotY = p.rotY ?? 0;
    const cos = Math.cos(rotY);
    const sin = Math.sin(rotY);
    out.push({
      x: p.x + (ox * cos + oz * sin) * scale,
      z: p.z + (-ox * sin + oz * cos) * scale,
      r: half * scale + 0.35,
    });
  }
  return out;
}
