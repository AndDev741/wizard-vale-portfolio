import { useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3, type Group } from "three";
import { easing } from "maath";
import type { SectionKey } from "../../i18n/ui";
import { places, placeCamera, overviewCamera } from "./world";

interface CameraRigProps {
  mode: "tour" | "roam";
  focus: SectionKey | "overview";
  wizardRef: RefObject<Group | null>;
}

export function CameraRig({ mode, focus, wizardRef }: CameraRigProps) {
  const look = useRef(new Vector3(...overviewCamera.look));

  useFrame((state, dt) => {
    let pos: [number, number, number];
    let target: [number, number, number];

    if (mode === "roam" && wizardRef.current) {
      const p = wizardRef.current.position;
      pos = [p.x, p.y + 4.4, p.z + 8];
      target = [p.x, p.y + 1.4, p.z];
    } else if (focus !== "overview") {
      const place = places.find((pl) => pl.key === focus);
      const cam = place ? placeCamera(place) : overviewCamera;
      pos = cam.pos;
      target = cam.look;
    } else {
      pos = overviewCamera.pos;
      target = overviewCamera.look;
    }

    // Portrait screens see a narrower slice of the world: pull the camera back.
    const aspect = state.size.width / state.size.height;
    const zoomOut = aspect < 0.8 ? 1.45 : aspect < 1.15 ? 1.18 : 1;
    if (zoomOut !== 1) {
      pos = [
        target[0] + (pos[0] - target[0]) * zoomOut,
        target[1] + (pos[1] - target[1]) * zoomOut,
        target[2] + (pos[2] - target[2]) * zoomOut,
      ];
    }

    const smoothing = mode === "roam" ? 0.28 : 0.9;
    easing.damp3(state.camera.position, pos, smoothing, dt);
    easing.damp3(look.current, target, smoothing, dt);
    state.camera.lookAt(look.current);
  });

  return null;
}
