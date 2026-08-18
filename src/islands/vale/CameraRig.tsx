import { useEffect, useRef, type MutableRefObject, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3, type Group } from "three";
import { easing } from "maath";
import type { SectionKey } from "../../i18n/ui";
import { places, placeCamera, overviewCamera, ROAM_CAM_LIMIT } from "./world";

interface CameraRigProps {
  mode: "tour" | "roam";
  focus: SectionKey | "overview";
  wizardRef: RefObject<Group | null>;
  /** Shared with the Wizard, which steers by this yaw. */
  camYawRef: MutableRefObject<number>;
  /**
   * Set while inside a building: the room's size, and the angle to view it from.
   */
  indoors?: { radius: number; viewAngle: number };
}

const FOLLOW_DIST = 10;
const FOLLOW_HEIGHT = 6.8;

/**
 * Yaw offsets to try, in order, when the spot straight behind him is blocked.
 * Swinging the camera round to the side beats shortening the boom until it is
 * sitting on his hat, which is what stepping out of a door used to look like.
 */
const YAW_ESCAPES = [0, 0.44, -0.44, 0.87, -0.87, 1.31, -1.31, 1.75, -1.75, 2.36, -2.36, Math.PI];

/** Somewhere the follow camera can sit: inside the bowl, outside every building. */
function cameraIsClear(x: number, z: number): boolean {
  if (Math.hypot(x, z) > ROAM_CAM_LIMIT) return false;
  for (let i = 0; i < places.length; i++) {
    const pl = places[i];
    if (
      Math.hypot(x - pl.position[0], z - pl.position[2]) <
      pl.colliderRadius + 0.8
    ) {
      return false;
    }
  }
  return true;
}

/**
 * And somewhere he can actually be seen from. A spot can be perfectly clear and
 * still be useless, with a turret between the lens and the wizard, so the line
 * between them is sampled too.
 */
function hasClearView(camX: number, camZ: number, wx: number, wz: number): boolean {
  for (let step = 1; step <= 3; step++) {
    const f = step / 4;
    const sx = camX + (wx - camX) * f;
    const sz = camZ + (wz - camZ) * f;
    for (let i = 0; i < places.length; i++) {
      const pl = places[i];
      if (Math.hypot(sx - pl.position[0], sz - pl.position[2]) < pl.colliderRadius) {
        return false;
      }
    }
  }
  return true;
}

export function CameraRig({ mode, focus, wizardRef, camYawRef, indoors }: CameraRigProps) {
  const look = useRef(new Vector3(...overviewCamera.look));
  // Reused every frame. Building fresh arrays here was handing the collector a
  // steady drip of garbage, which is what the periodic hitch felt like.
  const wantPos = useRef(new Vector3());
  const wantLook = useRef(new Vector3());

  // Entering walk mode, sit straight behind him instead of swinging into place.
  useEffect(() => {
    if (mode === "roam") {
      camYawRef.current = wizardRef.current?.rotation.y ?? Math.PI;
    }
  }, [mode, camYawRef, wizardRef]);

  useFrame((state, dt) => {
    const pos = wantPos.current;
    const target = wantLook.current;
    const aspect = state.size.width / state.size.height;

    if (mode === "roam" && wizardRef.current) {
      const p = wizardRef.current.position;

      if (indoors) {
        // A round room has no space for a boom behind him: six units back is
        // already through the wall. So the room is shown as a cutaway diorama
        // from a fixed vantage outside it. The wall is a cylinder drawn only on
        // its inner face and the ceiling disc faces down, so both vanish from
        // this angle and the whole floor is visible.
        const a = (indoors.viewAngle * Math.PI) / 180;
        const ax = Math.sin(a);
        const az = Math.cos(a);
        const back = indoors.radius * (aspect < 0.8 ? 2.6 : 2.15);
        pos.set(ax * back + p.x * 0.12, indoors.radius * 1.06, az * back + p.z * 0.12);
        target.set(p.x * 0.3, 1.7, p.z * 0.3);
        // The camera no longer turns with him, so the frame he steers by is the
        // one it looks along. Fixed, which makes the controls predictable.
        camYawRef.current = Math.atan2(-ax, -az);
        easing.damp3(state.camera.position, pos, 0.5, dt);
        easing.damp3(look.current, target, 0.5, dt);
        state.camera.lookAt(look.current);
        return;
      }

      // The camera yaw chases the wizard's facing, so it always ends up behind
      // his back. Chasing it (rather than snapping) turns a sharp change of
      // direction into a camera that swings around instead of cutting.
      let delta = wizardRef.current.rotation.y - camYawRef.current;
      delta = Math.atan2(Math.sin(delta), Math.cos(delta));
      camYawRef.current += delta * Math.min(1, dt * 2.6);

      // Look for somewhere to stand: straight behind him first, then further and
      // further round to the side. Stepping out of a door leaves him facing the
      // plaza with the building right at his back, so the spot behind him is
      // inside a wall, and shortening the boom alone ends up on top of his hat.
      const base = camYawRef.current;
      const dist = FOLLOW_DIST * (aspect < 0.8 ? 1.22 : 1);
      let yaw = base;
      let camX = p.x - Math.sin(base) * dist;
      let camZ = p.z - Math.cos(base) * dist;
      let settled = cameraIsClear(camX, camZ) && hasClearView(camX, camZ, p.x, p.z);
      if (!settled) {
        for (let i = 1; i < YAW_ESCAPES.length; i++) {
          const candidate = base + YAW_ESCAPES[i];
          const cx = p.x - Math.sin(candidate) * dist;
          const cz = p.z - Math.cos(candidate) * dist;
          if (cameraIsClear(cx, cz) && hasClearView(cx, cz, p.x, p.z)) {
            yaw = candidate;
            camX = cx;
            camZ = cz;
            settled = true;
            break;
          }
        }
      }
      if (!settled) {
        // Nowhere clear at full length: pull in along the way it already faces.
        let shortened = dist;
        while (shortened > 2.4 && !cameraIsClear(camX, camZ)) {
          shortened -= 0.4;
          camX = p.x - Math.sin(base) * shortened;
          camZ = p.z - Math.cos(base) * shortened;
        }
      }
      // Keep the steering frame on the camera, so "up" still means away from it.
      camYawRef.current = yaw;

      pos.set(camX, p.y + FOLLOW_HEIGHT, camZ);
      target.set(p.x, p.y + 2, p.z);
      easing.damp3(state.camera.position, pos, 0.24, dt);
      easing.damp3(look.current, target, 0.24, dt);
      state.camera.lookAt(look.current);
      return;
    }

    const place = focus !== "overview" ? places.find((pl) => pl.key === focus) : undefined;
    const cam = place ? placeCamera(place) : overviewCamera;
    pos.set(cam.pos[0], cam.pos[1], cam.pos[2]);
    target.set(cam.look[0], cam.look[1], cam.look[2]);

    // Portrait screens see a narrower slice of the world: pull the camera back.
    const zoomOut = aspect < 0.8 ? 1.45 : aspect < 1.15 ? 1.18 : 1;
    if (zoomOut !== 1) {
      pos.set(
        target.x + (pos.x - target.x) * zoomOut,
        target.y + (pos.y - target.y) * zoomOut,
        target.z + (pos.z - target.z) * zoomOut,
      );
    }

    easing.damp3(state.camera.position, pos, 0.9, dt);
    easing.damp3(look.current, target, 0.9, dt);
    state.camera.lookAt(look.current);
  });

  return null;
}
