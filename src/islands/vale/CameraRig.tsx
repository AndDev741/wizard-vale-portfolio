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
}

const FOLLOW_DIST = 10;
const FOLLOW_HEIGHT = 6.8;

export function CameraRig({ mode, focus, wizardRef, camYawRef }: CameraRigProps) {
  const look = useRef(new Vector3(...overviewCamera.look));

  // Entering walk mode, sit straight behind him instead of swinging into place.
  useEffect(() => {
    if (mode === "roam") {
      camYawRef.current = wizardRef.current?.rotation.y ?? Math.PI;
    }
  }, [mode, camYawRef, wizardRef]);

  useFrame((state, dt) => {
    let pos: [number, number, number];
    let target: [number, number, number];
    const aspect = state.size.width / state.size.height;

    if (mode === "roam" && wizardRef.current) {
      const p = wizardRef.current.position;

      // The camera yaw chases the wizard's facing, so it always ends up behind
      // his back. Chasing it (rather than snapping) turns a sharp change of
      // direction into a camera that swings around instead of cutting.
      let delta = wizardRef.current.rotation.y - camYawRef.current;
      delta = Math.atan2(Math.sin(delta), Math.cos(delta));
      camYawRef.current += delta * Math.min(1, dt * 2.6);

      const yaw = camYawRef.current;
      const sin = Math.sin(yaw);
      const cos = Math.cos(yaw);

      // Shorten the boom rather than let the camera back into the treeline.
      let dist = FOLLOW_DIST * (aspect < 0.8 ? 1.22 : 1);
      let camX = p.x - sin * dist;
      let camZ = p.z - cos * dist;
      while (dist > 3.2 && Math.hypot(camX, camZ) > ROAM_CAM_LIMIT) {
        dist -= 0.4;
        camX = p.x - sin * dist;
        camZ = p.z - cos * dist;
      }

      pos = [camX, p.y + FOLLOW_HEIGHT, camZ];
      target = [p.x, p.y + 2, p.z];
      easing.damp3(state.camera.position, pos, 0.24, dt);
      easing.damp3(look.current, target, 0.24, dt);
      state.camera.lookAt(look.current);
      return;
    }

    if (focus !== "overview") {
      const place = places.find((pl) => pl.key === focus);
      const cam = place ? placeCamera(place) : overviewCamera;
      pos = cam.pos;
      target = cam.look;
    } else {
      pos = overviewCamera.pos;
      target = overviewCamera.look;
    }

    // Portrait screens see a narrower slice of the world: pull the camera back.
    const zoomOut = aspect < 0.8 ? 1.45 : aspect < 1.15 ? 1.18 : 1;
    if (zoomOut !== 1) {
      pos = [
        target[0] + (pos[0] - target[0]) * zoomOut,
        target[1] + (pos[1] - target[1]) * zoomOut,
        target[2] + (pos[2] - target[2]) * zoomOut,
      ];
    }

    easing.damp3(state.camera.position, pos, 0.9, dt);
    easing.damp3(look.current, target, 0.9, dt);
    state.camera.lookAt(look.current);
  });

  return null;
}
