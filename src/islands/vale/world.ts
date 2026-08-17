import type { SectionKey } from "../../i18n/ui";

export interface PlaceConfig {
  key: SectionKey;
  model: string | null;
  position: [number, number, number];
  scale: number;
  labelHeight: number;
  /** XZ circle used both as roam collider and door-trigger anchor. */
  colliderRadius: number;
}

/** Buildings arranged around the well at the origin. */
export const places: PlaceConfig[] = [
  {
    key: "experience",
    model: "/models/building_tavern_red.gltf",
    position: [12, 0, -7],
    scale: 3.1,
    labelHeight: 6.6,
    colliderRadius: 4.0,
  },
  {
    key: "projects",
    model: "/models/building_tower_A_blue.gltf",
    position: [-13, 0, -8],
    scale: 3.1,
    labelHeight: 9.8,
    colliderRadius: 3.4,
  },
  {
    key: "writing",
    model: "/models/building_church_yellow.gltf",
    position: [-12, 0, 9],
    scale: 3.1,
    labelHeight: 7.4,
    colliderRadius: 4.0,
  },
  {
    key: "about",
    model: "/models/building_home_A_green.gltf",
    position: [11, 0, 9],
    scale: 3.1,
    labelHeight: 5.8,
    colliderRadius: 3.6,
  },
  {
    key: "contact",
    model: null, // custom raven post built from primitives and a crate
    position: [-4, 0, 10.5],
    scale: 1,
    labelHeight: 2.9,
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
  pos: [0, 15, 29.5],
  look: [0, 0.8, -1],
};

export function placeCamera(place: PlaceConfig): CameraTarget {
  const [x, , z] = place.position;
  const len = Math.hypot(x, z) || 1;
  const back = 8.5;
  return {
    pos: [x - (x / len) * back, 4.6, z - (z / len) * back],
    look: [x, 2.4, z],
  };
}

export const WALK_SPEED = 3.6;
export const PLAZA_LIMIT = 17;
export const WELL_RADIUS = 2.6;
export const DOOR_TRIGGER = 2.3;

/** Wizard idle spot next to the well while in tour mode. */
export const IDLE_SPOT: [number, number, number] = [3.1, 0, 3.2];
export const IDLE_ROT_Y = 2.5;
