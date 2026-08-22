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
  /**
   * What the board shows, namespaced so one dialog can serve every building:
   * "project:<key>", "projects:all", "topic:<key>", "topics:all".
   */
  subject: string;
  /** Degrees around the room, 0 being straight ahead of the entrance. */
  angle: number;
}

export interface InteriorNpc {
  /** Key into experienceNpcs. */
  key: string;
  /** Character model file in public/models, without extension. */
  model: string;
  angle: number;
  radius: number;
  /** Extra turn on top of facing the room's centre. */
  faceOffset?: number;
}

export interface InteriorFloor {
  key:
    | "grimoire"
    | "ledger"
    | "warding"
    | "attic"
    | "observatory"
    | "readingRoom"
    | "gallery"
    | "tavern";
  boards: InteriorBoard[];
  npcs?: InteriorNpc[];
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
  dg_bed_decorated: [0.55, -0.03],
  dg_shelf_large: [0, 0.25],
  dg_wall_shelves: [0, 0.18],
  dg_key: [0.25, 0],
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
  dg_barrel_large: 0.9,
  dg_barrel_small_stack: 0.93,
  dg_box_large: 0.75,
  dg_table_long_decorated_A: 1.9,
  dg_table_long: 1.9,
  dg_table_medium: 1.0,
  dg_table_small: 0.5,
  dg_trunk_large_B: 0.75,
  dg_column: 0.35,
  dg_bed_decorated: 1.5,
  dg_coin_stack_small: 0.48,
};

const RADIUS = 8.5;
const WALL_H = 6.2;
/**
 * The room is read as a cutaway from outside the entrance, which fixes the
 * angles. The ladder up stands on the right, the hatch down opens on the left,
 * and the wall facing the camera is left for the boards. The middle is kept
 * clear on purpose: walking straight in from the door should reach the board
 * without weaving around furniture, so decoration lives in the wings.
 */
const STAIRS_ANGLE = 270;
const HATCH_ANGLE = 100;
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
      // Beyou. The floor still being written, so it is the working study.
      key: "grimoire",
      accent: "#ffb15e",
      boards: [{ subject: "project:beyou", angle: 0 }],
      torches: [28, 332, 132, 216],
      banners: [334, 26],
      props: [
        { model: "rug_oval_A", x: 0, z: 3.4, scale: 1.4, rotY: 0 },
        // the desk, off to one side so it never stands in front of the board
        floor("dg_table_medium_decorated_A", 322, 5.2, 0, 1),
        { model: "book_set", x: -3.6, z: 3.4, y: 1.02, rotY: 0.5, scale: 0.9 },
        { model: "book_single", x: -2.6, z: 4.4, y: 1.02, rotY: -0.6, scale: 0.9 },
        floor("dg_stool", 308, 4.4, 0, 1),
        floor("dg_candle_melted", 334, 6.6, 0, 1),
        floor("dg_bottle_A_labeled_green", 316, 6.9, 0, 1),
        // the reading side
        wall("dg_wall_shelves", 48, RADIUS - 0.1, 0, 1),
        wall("dg_shelf_large", 70, RADIUS - 0.2, 2.4, 1),
        floor("dg_trunk_medium_A", 62, 6.6, 20, 1),
        // the store side
        wall("dg_shelves", 132, RADIUS - 0.2, 1.6, 1),
        floor("dg_bottle_B_brown", 138, 6.8, 0, 1),
        floor("dg_bottle_C_green", 144, 6.4, 0, 1),
        floor("dg_candle_lit", 150, 5.6, 0, 1),
        floor("dg_barrel_small_stack", 212, 6.4, 15, 1),
        floor("dg_box_large", 232, 6.6, -10, 1),
        floor("dg_crates_stacked", 118, 6.6, 0, 1),
      ],
    },
    {
      // BitData. A blockchain is a ledger, so this floor is coin and record.
      key: "ledger",
      accent: "#e0c060",
      boards: [{ subject: "project:bitdata", angle: 0 }],
      torches: [40, 320, 136, 224],
      banners: [26, 334],
      props: [
        { model: "rug_rectangle_stripes_A", x: 0, z: 3, scale: 1.3, rotY: 0 },
        floor("dg_chest_gold", 320, 5, 0, 1),
        floor("dg_coin_stack_large", 306, 6.4, 0, 1),
        floor("dg_coin_stack_medium", 336, 4.4, 0, 1),
        floor("dg_barrel_large", 300, 6.9, 0, 1),
        floor("dg_chest", 34, 5.2, -15, 1),
        floor("dg_coin_stack_small", 52, 4.2, 0, 1),
        floor("dg_coin_stack_medium", 66, 6.2, 0, 1),
        wall("dg_wall_shelves", 66, RADIUS - 0.1, 0, 1),
        floor("dg_table_medium_decorated_A", 142, 5.4, 0, 1),
        { model: "dg_plate_food_A", x: 3.9, z: -3.6, y: 0.98, rotY: 0.3, scale: 0.8 },
        wall("dg_shelf_large", 120, RADIUS - 0.2, 2.4, 1),
        floor("dg_candle_lit", 156, 6.2, 0, 1),
        floor("dg_trunk_large_B", 212, 6.2, 20, 1),
        floor("dg_box_large", 236, 6.6, 0, 1),
        floor("dg_crates_stacked", 116, 6.8, 0, 1),
      ],
    },
    {
      // Rinha de Backend. Wards decide what gets through, same as fraud checks.
      key: "warding",
      accent: "#8fb3ff",
      boards: [{ subject: "project:rinha", angle: 0 }],
      torches: [44, 316, 130, 228],
      banners: [334, 26],
      props: [
        { model: "rug_oval_A", x: 0, z: 3.2, scale: 1.3, rotY: 0.2 },
        wall("dg_sword_shield", 330, RADIUS - 0.15, 2.5, 1),
        wall("dg_sword_shield_gold", 30, RADIUS - 0.15, 2.5, 1),
        floor("dg_column", 306, 6.9, 0, 1),
        floor("dg_column", 54, 6.9, 0, 1),
        floor("dg_keg", 318, 6, 0, 1),
        floor("dg_stool", 336, 4.4, 0, 1),
        floor("dg_stool", 26, 4.6, 0, 1),
        floor("dg_bottle_B_brown", 44, 6.5, 0, 1),
        wall("dg_shelf_small_candles", 72, RADIUS - 0.2, 2, 1),
        wall("dg_wall_shelves", 116, RADIUS - 0.1, 0, 1),
        floor("dg_table_medium_decorated_A", 138, 5.2, 0, 1),
        floor("dg_candle_triple", 152, 6.4, 0, 1),
        floor("dg_barrel_large", 220, 6.6, 0, 1),
        floor("dg_crates_stacked", 240, 6.6, -20, 1),
        floor("dg_bottle_C_green", 208, 5.6, 0, 1),
      ],
    },
    {
      // The small works, and the 2023 relic they grew out of.
      key: "attic",
      accent: "#c08a5e",
      boards: [
        { subject: "project:babel", angle: 340 },
        { subject: "project:markdown", angle: 12 },
        { subject: "project:pomodoro", angle: 48 },
        { subject: "project:habittracker", angle: 312 },
      ],
      torches: [0, 122, 234, 300 ],
      banners: [],
      props: [
        { model: "rug_rectangle_stripes_A", x: 0.2, z: 3, scale: 1.2, rotY: -0.2 },
        // an old bed, because every attic has one
        floor("dg_bed_decorated", 126, 5.6, 0, 1),
        floor("dg_trunk_large_B", 214, 6.2, 20, 1),
        floor("dg_trunk_medium_A", 236, 6.4, -15, 1),
        floor("dg_trunk_medium_A", 200, 5.6, 10, 1),
        floor("dg_box_large", 306, 6.5, 0, 1),
        floor("dg_barrel_small_stack", 326, 6.7, 15, 1),
        floor("dg_crates_stacked", 148, 6.7, 0, 1),
        floor("dg_candle_melted", 214, 5.2, 0, 1),
        floor("dg_candle_lit", 156, 4.8, 0, 1),
        wall("dg_shelf_large", 116, RADIUS - 0.2, 2.4, 1),
        wall("dg_shelves", 68, RADIUS - 0.2, 1.6, 1),
        { model: "book_single", x: -3.4, z: 3.2, y: 0, rotY: 0.8, scale: 0.9 },
        { model: "book_set", x: 3.2, z: 2.8, y: 0, rotY: -0.5, scale: 0.9 },
        floor("dg_key", 60, 4.4, 0, 1),
      ],
    },
    {
      // The top of the tower: everything visible at once.
      key: "observatory",
      accent: "#a9c7ff",
      // The overview straight ahead, with the two full-stack apps flanking it.
      // The pillars and the bookcase moved off these angles so nothing on the
      // wall stands in front of a board.
      boards: [
        { subject: "projects:all", angle: 0 },
        { subject: "project:eshop", angle: 310 },
        { subject: "project:dreamsboard", angle: 50 },
      ],
      torches: [30, 330, 126, 234],
      banners: [342, 22],
      props: [
        { model: "rug_oval_A", x: 0, z: 2.4, scale: 1.6, rotY: 0 },
        // the planning table, pushed to the flank so the board stays in view
        floor("dg_table_long_decorated_A", 312, 5, 20, 1),
        { model: "book_set", x: -3.4, z: 3.2, y: 1.02, rotY: -0.3, scale: 0.9 },
        { model: "dg_plate_food_A", x: -4.4, z: 2.2, y: 0.98, rotY: 0.4, scale: 0.8 },
        // Kept on the near flanks. Anywhere between the camera and a board and
        // a four-unit pillar simply stands in front of it.
        floor("dg_pillar_decorated", 130, 7, 0, 1),
        floor("dg_pillar_decorated", 230, 7, 0, 1),
        floor("dg_column", 160, 7.2, 0, 1),
        floor("dg_column", 200, 7.2, 0, 1),
        wall("dg_wall_shelves", 92, RADIUS - 0.1, 0, 1),
        floor("dg_stool", 338, 4.4, 0, 1),
        floor("dg_stool", 24, 4.6, 0, 1),
        floor("dg_candle_triple", 210, 6.2, 0, 1),
        floor("dg_candle_lit", 156, 6.4, 0, 1),
        floor("dg_bottle_C_green", 146, 6.8, 0, 1),
        floor("dg_trunk_medium_A", 244, 6.4, 0, 1),
      ],
    },
  ],
};


const LIB_RADIUS = 9;

/**
 * The Library. Columns of shelves around the walls, and a framed board for each
 * subject, which opens the texts as a book. Every text is the real thing, pulled
 * from the Beyou docs API at build time; personal writing can join the same
 * shelves later without touching this file's shape.
 *
 * Floor props stay off the middle: the entrance corridor runs straight to the
 * boards, so anything on the floor sits at 40 degrees or more off the door line.
 */
export const libraryInterior: InteriorConfig = {
  place: "writing",
  radius: LIB_RADIUS,
  wallHeight: 6.4,
  stairsAngle: STAIRS_ANGLE,
  hatchAngle: HATCH_ANGLE,
  exitAngle: EXIT_ANGLE,
  floors: [
    {
      key: "readingRoom",
      accent: "#e8c98a",
      boards: [
        { subject: "topic:infra", angle: 328 },
        { subject: "topic:ai", angle: 352 },
        { subject: "topic:mobile", angle: 16 },
        { subject: "topic:speed", angle: 40 },
      ],
      torches: [340, 4, 28, 200],
      banners: [310, 58],
      props: [
        { model: "rug_rectangle_stripes_A", x: 0, z: 3.4, scale: 1.4, rotY: 0 },
        // four columns of books, on the flanks where they hide no board
        wall("dg_wall_shelves", 70, LIB_RADIUS - 0.1, 0, 1),
        wall("dg_wall_shelves", 125, LIB_RADIUS - 0.1, 0, 1),
        wall("dg_wall_shelves", 230, LIB_RADIUS - 0.1, 0, 1),
        wall("dg_wall_shelves", 300, LIB_RADIUS - 0.1, 0, 1),
        // two reading desks, flanking the way in
        floor("dg_table_long", 138, 5.9, 15, 1),
        floor("dg_table_long", 222, 5.9, -15, 1),
        floor("dg_stool", 128, 4.6, 0, 1),
        floor("dg_stool", 232, 4.6, 0, 1),
        // books left open on the desks
        { model: "book_set", x: 4.2, z: -3.9, y: 1.02, rotY: 0.5, scale: 0.9 },
        { model: "book_single", x: 3.3, z: -4.8, y: 1.02, rotY: -0.2, scale: 0.9 },
        { model: "book_set", x: -4.3, z: -3.8, y: 1.02, rotY: -0.5, scale: 0.9 },
        { model: "dg_candle_lit", x: -3.4, z: -4.9, y: 1.02, rotY: 0, scale: 0.85 },
        floor("dg_candle_lit", 148, 6.6, 0, 1),
        floor("dg_candle_triple", 240, 6.4, 0, 1),
        floor("dg_trunk_large_B", 246, 6.8, 20, 1),
        floor("dg_trunk_medium_A", 116, 6.9, -20, 1),
        floor("dg_bottle_C_green", 254, 6.4, 0, 1),
      ],
    },
    {
      key: "gallery",
      accent: "#bfa77a",
      boards: [
        { subject: "topics:all", angle: 0 },
        { subject: "topic:security", angle: 332 },
      ],
      torches: [348, 20, 96, 208],
      banners: [312, 44],
      props: [
        { model: "rug_oval_A", x: 0, z: 3, scale: 1.5, rotY: 0 },
        wall("dg_wall_shelves", 62, LIB_RADIUS - 0.1, 0, 1),
        wall("dg_wall_shelves", 125, LIB_RADIUS - 0.1, 0, 1),
        wall("dg_wall_shelves", 230, LIB_RADIUS - 0.1, 0, 1),
        wall("dg_wall_shelves", 300, LIB_RADIUS - 0.1, 0, 1),
        floor("dg_table_long", 220, 5.9, -15, 1),
        floor("dg_table_medium", 140, 5.6, 0, 1),
        floor("dg_stool", 230, 4.6, 0, 1),
        floor("dg_stool", 132, 4.4, 0, 1),
        { model: "book_set", x: -4.2, z: -3.8, y: 1.02, rotY: -0.5, scale: 0.9 },
        { model: "book_single", x: 3.9, z: -4.1, y: 1.02, rotY: 0.6, scale: 0.9 },
        floor("dg_candle_melted", 152, 6.6, 0, 1),
        floor("dg_candle_lit", 244, 6.5, 0, 1),
        floor("dg_trunk_medium_A", 250, 6.9, 0, 1),
        floor("dg_box_large", 118, 6.8, 10, 1),
        floor("dg_column", 205, 7.2, 0, 1),
      ],
    },
  ],
};


/**
 * The Guild Hall: a pub. No boards on the walls here, because the experience is
 * told by the patrons: three figures, each an age of the same career, and
 * talking to them opens their tale. The middle stays clear, as everywhere.
 */
export const guildInterior: InteriorConfig = {
  place: "experience",
  radius: 9,
  wallHeight: 6.2,
  stairsAngle: STAIRS_ANGLE,
  hatchAngle: HATCH_ANGLE,
  exitAngle: EXIT_ANGLE,
  floors: [
    {
      key: "tavern",
      accent: "#ff9d5c",
      boards: [],
      npcs: [
        { key: "warrior", model: "Barbarian", angle: 352, radius: 4.6 },
        { key: "soldier", model: "Knight", angle: 45, radius: 5 },
        { key: "apprentice", model: "Rogue", angle: 305, radius: 5.2 },
      ],
      torches: [330, 22, 128, 232],
      banners: [8],
      props: [
        { model: "rug_oval_A", x: 0, z: 2.6, scale: 1.5, rotY: 0 },
        // the bar: a long counter with kegs and a barrel stack behind it
        floor("dg_table_long", 282, 5.9, 90, 1),
        floor("dg_keg", 285, 7.6, 0, 0.9),
        floor("dg_barrel_small_stack", 297, 7.4, 10, 1),
        floor("dg_barrel_large", 271, 7.5, 0, 0.9),
        { model: "adv_mug_full", x: -6.1, z: -2.1, y: 1.02, rotY: 0.6, scale: 0.9 },
        { model: "adv_mug_empty", x: -5.7, z: -3, y: 1.02, rotY: -0.4, scale: 0.9 },
        // the warrior's table, right of the middle
        floor("dg_table_medium", 355, 5.8, 0, 1),
        floor("dg_chair", 348, 4.9, 160, 1),
        { model: "adv_mug_full", x: -0.4, z: 5.7, y: 1.02, rotY: 0.3, scale: 0.9 },
        { model: "dg_plate_food_A", x: 0.4, z: 5.9, y: 0.98, rotY: -0.2, scale: 0.8 },
        // the soldier's table
        floor("dg_table_medium", 52, 6.2, 20, 1),
        floor("dg_stool", 58, 5, 0, 1),
        { model: "adv_mug_empty", x: 4.9, z: 3.9, y: 1.02, rotY: 1.1, scale: 0.9 },
        // decoration: the hall keeps its trophies
        wall("dg_sword_shield", 0, 8.9, 2.6, 1),
        wall("dg_sword_shield_gold", 28, 8.85, 2.5, 1),
        wall("dg_shelf_small_candles", 318, 8.8, 2.1, 1),
        wall("dg_wall_shelves", 120, 8.9, 0, 1),
        floor("dg_crates_stacked", 138, 6.9, 15, 1),
        floor("dg_trunk_medium_A", 222, 6.8, -10, 1),
        floor("dg_candle_lit", 152, 6, 0, 1),
        floor("dg_candle_triple", 240, 6.2, 0, 1),
        floor("dg_bottle_B_brown", 260, 6.4, 0, 1),
        floor("dg_bottle_A_labeled_green", 300, 6.6, 0, 1),
      ],
    },
  ],
};

export const interiors: Partial<Record<SectionKey, InteriorConfig>> = {
  projects: towerInterior,
  writing: libraryInterior,
  experience: guildInterior,
};

export function interiorFor(place: SectionKey): InteriorConfig | undefined {
  return interiors[place];
}

/** Every model an interior can ask for, so they can be prefetched together. */
export function interiorModels(config: InteriorConfig): string[] {
  const set = new Set<string>([
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
  for (const npc of floor.npcs ?? []) {
    const [x, z] = ring(npc.angle, npc.radius);
    out.push({ x, z, r: 0.85 });
  }
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
