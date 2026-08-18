import type { SectionKey } from "../../i18n/ui";

export interface PlaceConfig {
  key: SectionKey;
  model: string | null;
  position: [number, number, number];
  scale: number;
  labelHeight: number;
  /**
   * Height the place-view camera frames for, when the roof height is a poor
   * guide. The raven post is a small prop, so framing it from its own height
   * puts the camera down among the plaza furniture.
   */
  viewHeight?: number;
  /**
   * Degrees to swing the place-view camera off the radial line. Defaults to
   * PLACE_VIEW_SWING; flip the sign when the default approach looks through
   * something, such as the wizard idling by the well.
   */
  viewSwing?: number;
  /** XZ circle used both as roam collider and door-trigger anchor. */
  colliderRadius: number;
}

/** Buildings arranged around the well at the origin. */
export const places: PlaceConfig[] = [
  {
    key: "experience",
    model: "/models/building_tavern_red.gltf",
    position: [12, 0, -7],
    scale: 6,
    labelHeight: 9.6,
    colliderRadius: 4.2,
  },
  {
    key: "projects",
    model: "/models/building_tower_A_blue.gltf",
    position: [-13, 0, -8],
    scale: 6,
    labelHeight: 14.4,
    colliderRadius: 3.6,
  },
  {
    key: "writing",
    model: "/models/building_castle_yellow.gltf",
    position: [-12, 0, 9],
    scale: 3,
    labelHeight: 13.1,
    colliderRadius: 3.6,
  },
  {
    key: "about",
    model: "/models/building_home_A_green.gltf",
    position: [11, 0, 9],
    scale: 7,
    labelHeight: 7.6,
    colliderRadius: 3.2,
  },
  {
    key: "contact",
    model: null, // custom raven post built from primitives and a crate
    position: [-4, 0, 10.5],
    scale: 1,
    labelHeight: 2.9,
    viewHeight: 8,
    viewSwing: -22,
    colliderRadius: 1.4,
  },
];

/** Rotation so a model whose door faces +Z looks at the plaza center. */
export function facingCenter([x, , z]: [number, number, number]): number {
  return Math.atan2(-x, -z);
}

/** Door point: on the plaza side of the building, just outside its collider. */
export function doorPoint(place: PlaceConfig): [number, number] {
  const [x, , z] = place.position;
  const len = Math.hypot(x, z) || 1;
  const d = place.colliderRadius + 1.4;
  return [x - (x / len) * d, z - (z / len) * d];
}

export interface CameraTarget {
  pos: [number, number, number];
  look: [number, number, number];
}

export const overviewCamera: CameraTarget = {
  pos: [0, 31, 55],
  look: [0, 1, -2],
};

/**
 * Where to sit when a place is opened. The distance is derived from the
 * building's own height (labelHeight clears its roof) rather than fixed, so a
 * tall tower is framed from further back than a cottage and none of them
 * overflow the viewport. A fixed distance only ever suits one building size.
 */
/** Default approach angle, swung off the straight radial line. See placeCamera. */
const PLACE_VIEW_SWING = 20;

export function placeCamera(place: PlaceConfig): CameraTarget {
  const [x, , z] = place.position;
  const len = Math.hypot(x, z) || 1;
  const height = place.viewHeight ?? place.labelHeight;
  const back = height * 1.3 + 6;

  // Backing straight off toward the middle of the plaza would, for the shorter
  // buildings, park the camera on top of the well and fill the frame with its
  // roof. Swinging the approach sideways clears the plaza furniture and gives a
  // three-quarter view of the door rather than a flat elevation.
  const inX = -x / len;
  const inZ = -z / len;
  const swing = ((place.viewSwing ?? PLACE_VIEW_SWING) * Math.PI) / 180;
  const cos = Math.cos(swing);
  const sin = Math.sin(swing);
  const dirX = inX * cos - inZ * sin;
  const dirZ = inX * sin + inZ * cos;

  return {
    pos: [x + dirX * back, height * 0.6, z + dirZ * back],
    look: [x, height * 0.4, z],
  };
}

export const WALK_SPEED = 3.6;
/** How far out the wizard may wander: the whole village, short of the treeline. */
export const PLAZA_LIMIT = 22;
/** The follow camera stays inside this radius so it never enters the forest. */
export const ROAM_CAM_LIMIT = 25;
export const WELL_RADIUS = 2.2;
export const DOOR_TRIGGER = 2.3;

/** Wizard idle spot next to the well while in tour mode. */
export const IDLE_SPOT: [number, number, number] = [3.1, 0, 3.2];
export const IDLE_ROT_Y = 2.5;
