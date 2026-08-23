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
  /** The metal of the trophy on the wall behind them: their rank, in short. */
  tier: "copper" | "silver" | "gold";
  /** Key into experienceNpcs. */
  key: string;
  /** Character model file in public/models, without extension. */
  model: string;
  angle: number;
  radius: number;
  /** Extra turn on top of facing the room's centre. */
  faceOffset?: number;
  /** Height of the name plate, to keep neighbouring plates from colliding. */
  plateY?: number;
}

export interface InteriorBookshelf {
  /** Key into writingTopics: its texts become the books standing on this case. */
  topic: string;
  angle: number;
}

export interface InteriorLectern {
  /** Board subject the open book presents, e.g. "topics:all". */
  subject: string;
  angle: number;
  radius: number;
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
  bookshelves?: InteriorBookshelf[];
  lecterns?: InteriorLectern[];
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

/**
 * How far a model's origin sits above its own bottom. Most of the dungeon pack
 * is modelled with its origin on the floor, so it is absent here; the books and
 * the mugs are modelled around their middle, and placing one at the height of a
 * tabletop buries half of it in the wood.
 */
const MODEL_LIFT: Record<string, number> = {
  book_set: 0.25,
  book_single: 0.25,
  adv_mug_full: 0.239,
  adv_mug_empty: 0.239,
};

/** Tabletop height of dg_table_long / dg_table_medium at scale 1. */
export const TABLE_TOP = 1;

/**
 * Same as onTop, but placed by the ring coordinates the furniture itself uses.
 * Guessing x/z by eye for something meant to sit on a table put two mugs three
 * units off the bar; sharing the angle and radius makes that mistake impossible.
 */
export function onTopRing(
  model: string,
  angleDeg: number,
  radius: number,
  surfaceY: number,
  rotY: number,
  scale: number,
): InteriorProp {
  const [x, z] = ring(angleDeg, radius);
  return onTop(model, x, z, surfaceY, rotY, scale);
}

/** A prop standing ON a surface, rather than at a height guessed by eye. */
export function onTop(
  model: string,
  x: number,
  z: number,
  surfaceY: number,
  rotY: number,
  scale: number,
): InteriorProp {
  return { model, x, z, y: surfaceY + (MODEL_LIFT[model] ?? 0) * scale, rotY, scale };
}

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
        onTop("book_set", -3.6, 3.4, TABLE_TOP, 0.5, 0.9),
        onTop("book_single", -2.6, 4.4, TABLE_TOP, -0.6, 0.9),
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
        onTop("dg_plate_food_A", 3.9, -3.6, TABLE_TOP, 0.3, 0.8),
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
        onTop("book_single", -3.4, 3.2, 0, 0.8, 0.9),
        onTop("book_set", 3.2, 2.8, 0, -0.5, 0.9),
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
        onTop("book_set", -3.4, 3.2, TABLE_TOP, -0.3, 0.9),
        onTop("dg_plate_food_A", -4.4, 2.2, TABLE_TOP, 0.4, 0.8),
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
      boards: [],
      // One case per subject, its texts standing on the shelf as real books.
      bookshelves: [
        { topic: "infra", angle: 328 },
        { topic: "ai", angle: 355 },
        { topic: "mobile", angle: 19 },
        { topic: "speed", angle: 46 },
      ],
      torches: [341, 7, 32, 200],
      banners: [305, 64],
      props: [
        { model: "rug_rectangle_stripes_A", x: 0, z: 3.4, scale: 1.4, rotY: 0 },
        // filled bookcases stay on the flanks, dressing rather than content
        wall("dg_wall_shelves", 125, LIB_RADIUS - 0.1, 0, 1),
        wall("dg_wall_shelves", 230, LIB_RADIUS - 0.1, 0, 1),
        // two reading desks, flanking the way in
        floor("dg_table_long", 138, 5.9, 15, 1),
        floor("dg_table_long", 222, 5.9, -15, 1),
        floor("dg_stool", 128, 4.6, 0, 1),
        floor("dg_stool", 232, 4.6, 0, 1),
        // books left open on the desks
        onTop("book_set", 4.2, -3.9, TABLE_TOP, 0.5, 0.9),
        onTop("book_single", 3.3, -4.8, TABLE_TOP, -0.2, 0.9),
        onTop("book_set", -4.3, -3.8, TABLE_TOP, -0.5, 0.9),
        onTop("dg_candle_lit", -3.4, -4.9, TABLE_TOP, 0, 0.85),
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
      boards: [],
      bookshelves: [{ topic: "security", angle: 332 }],
      // The whole index, as an open book on a stand in the middle of the floor.
      lecterns: [{ subject: "topics:all", angle: 8, radius: 4.6 }],
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
        onTop("book_set", -4.2, -3.8, TABLE_TOP, -0.5, 0.9),
        onTop("book_single", 3.9, -4.1, TABLE_TOP, 0.6, 0.9),
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
      // Left to right as the room is seen: apprentice, soldier, warrior. Larger
      // angles fall to the left of the frame, so the order reads backwards here.
      npcs: [
        { key: "apprentice", model: "Rogue", angle: 54, radius: 5.1, tier: "copper" },
        { key: "soldier", model: "Knight", angle: 0, radius: 5.2, tier: "silver", plateY: 3.15 },
        { key: "warrior", model: "Barbarian", angle: 306, radius: 5.1, tier: "gold" },
      ],
      // The hall's own catalogue, on a stand in the middle of the floor.
      lecterns: [{ subject: "npcs:all", angle: 150, radius: 3.1 }],
      torches: [30, 336, 126, 246],
      banners: [78, 286],
      props: [
        { model: "rug_oval_A", x: 0, z: 2.2, scale: 1.5, rotY: 0 },

        // the bar, along the left wall as you look in
        floor("dg_table_long", 98, 6.4, 90, 1),
        floor("dg_keg_decorated", 104, 8, 0, 0.9),
        floor("dg_barrel_small_stack", 80, 8.2, 10, 1),
        floor("dg_barrel_large_decorated", 114, 7.9, 0, 0.9),
        onTopRing("adv_mug_full", 94, 6, TABLE_TOP, 0.6, 0.9),
        onTopRing("adv_mug_empty", 103, 6.2, TABLE_TOP, -0.4, 0.9),
        onTopRing("dg_plate_stack", 108, 6.4, TABLE_TOP, 0.2, 0.9),
        onTopRing("dg_bottle_A_brown", 90, 6.5, TABLE_TOP, 0, 0.9),
        wall("dg_shelf_large", 98, 8.85, 0, 1),
        wall("dg_shelf_small_candles", 84, 8.8, 2.2, 1),

        // the apprentice's corner: a small table, barely used
        floor("dg_table_small", 68, 6.7, 20, 1),
        floor("dg_stool", 75, 5.8, 0, 1),
        onTopRing("adv_mug_full", 68, 6.6, TABLE_TOP, 0.4, 0.85),
        onTopRing("dg_plate_small", 70, 6.9, TABLE_TOP, -0.3, 0.8),

        // the soldier's table, squarely in the middle of the back wall
        floor("dg_table_medium", 348, 7.1, 0, 1),
        floor("dg_chair", 342, 6, 170, 1),
        floor("dg_stool", 12, 6.2, 0, 1),
        onTopRing("adv_mug_empty", 346, 6.9, TABLE_TOP, 0.8, 0.9),
        onTopRing("dg_plate_food_A", 351, 7.3, TABLE_TOP, -0.2, 0.8),
        onTopRing("dg_bottle_C_brown", 344, 7.4, TABLE_TOP, 0, 0.9),

        // the warrior's table, the loud end of the room
        floor("dg_table_long", 322, 7.4, 28, 1),
        floor("dg_chair", 326, 6, 150, 1),
        floor("dg_stool", 293, 6.1, 0, 1),
        onTopRing("adv_mug_full", 320, 7.1, TABLE_TOP, 0.3, 0.95),
        onTopRing("dg_plate_food_B", 325, 7.5, TABLE_TOP, -0.2, 0.8),
        onTopRing("dg_bottle_A_green", 316, 7.6, TABLE_TOP, 0, 0.9),

        // the rest of the hall: storage, spare drink, and light
        floor("dg_crates_stacked", 146, 7.2, 15, 1),
        floor("dg_barrel_small", 158, 7.4, 0, 1),
        floor("dg_trunk_medium_A", 214, 7.2, -10, 1),
        floor("dg_trunk_large_B", 228, 7.3, 12, 1),
        floor("dg_barrel_large", 244, 7.5, 0, 0.9),
        floor("dg_candle_triple", 200, 7, 0, 1),
        floor("dg_candle_lit", 166, 6.6, 0, 1),
        floor("dg_bottle_B_brown", 252, 7.2, 0, 1),
        floor("dg_bottle_A_labeled_green", 262, 7.4, 0, 1),
        floor("dg_column", 270, 8, 0, 1),
        floor("dg_column", 134, 8.2, 0, 1),
        wall("dg_wall_shelves", 250, 8.9, 0, 1),
        wall("dg_shelf_small_candles", 210, 8.8, 2.2, 1),
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
/**
 * Where each book of a topic stands: spread along its case, as small angle
 * offsets. Shared by the renderer (to place the book models) and the stage (to
 * place their triggers), so the prompt always lines up with the book.
 */
export function shelfBookAngles(shelfAngle: number, count: number): number[] {
  if (count <= 1) return [shelfAngle];
  const spreadDeg = 7.5;
  const step = spreadDeg / (count - 1);
  return Array.from({ length: count }, (_, i) => shelfAngle - spreadDeg / 2 + i * step);
}

export function floorColliders(config: InteriorConfig, floor: InteriorFloor): Obstacle[] {
  const out: Obstacle[] = [];
  for (const npc of floor.npcs ?? []) {
    const [x, z] = ring(npc.angle, npc.radius);
    out.push({ x, z, r: 0.85 });
  }
  for (const lectern of floor.lecterns ?? []) {
    const [x, z] = ring(lectern.angle, lectern.radius);
    out.push({ x, z, r: 0.75 });
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
