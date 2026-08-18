import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type MutableRefObject,
  type RefObject,
} from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import type { Group, Mesh } from "three";
import type { SectionKey } from "../../i18n/ui";
import { obstacles } from "./props";
import {
  places,
  doorPoint,
  WALK_SPEED,
  PLAZA_LIMIT,
  WELL_RADIUS,
  DOOR_TRIGGER,
  IDLE_SPOT,
  IDLE_ROT_Y,
} from "./world";
import type { InputVec } from "./useInput";

/** Loadout options in the source model that must not render together. */
const HIDDEN_PROPS = new Set(["Spellbook", "Spellbook_open", "2H_Staff"]);

interface WizardProps {
  mode: "tour" | "roam";
  paused: boolean;
  inputRef: MutableRefObject<InputVec>;
  wizardRef: RefObject<Group | null>;
  /** Damped camera yaw, written by CameraRig. Input is relative to it. */
  camYawRef: MutableRefObject<number>;
  onNearDoor: (key: SectionKey | null) => void;
}

export function Wizard({
  mode,
  paused,
  inputRef,
  wizardRef,
  camYawRef,
  onNearDoor,
}: WizardProps) {
  const { scene, animations } = useGLTF("/models/Mage.glb");
  const { actions } = useAnimations(animations, wizardRef as RefObject<Group>);
  const current = useRef("Idle");
  const lastDoor = useRef<SectionKey | null>(null);

  const doors = useMemo(
    () =>
      places.map((p) => {
        const [x, z] = doorPoint(p);
        return { key: p.key, x, z };
      }),
    [],
  );
  const colliders = useMemo(
    () => [
      { x: 0, z: 0, r: WELL_RADIUS },
      ...places.map((p) => ({ x: p.position[0], z: p.position[2], r: p.colliderRadius })),
      ...obstacles,
    ],
    [],
  );

  useLayoutEffect(() => {
    scene.traverse((o) => {
      if ((o as Mesh).isMesh) (o as Mesh).castShadow = true;
      // The pack ships every loadout option attached at once: both spellbooks
      // share handslot.l and both the wand and the staff share handslot.r, so
      // each hand held two intersecting objects. Keep the wand alone; in the
      // idle pose the raised left hand tucks a book under the hat brim.
      if (HIDDEN_PROPS.has(o.name)) o.visible = false;
    });
  }, [scene]);

  const setAction = (name: string) => {
    if (current.current === name) return;
    const next = actions[name];
    if (!next) return;
    actions[current.current]?.fadeOut(0.25);
    next.reset().fadeIn(0.25).play();
    current.current = name;
  };

  useEffect(() => {
    actions["Idle"]?.reset().play();
    return () => {
      Object.values(actions).forEach((a) => a?.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const g = wizardRef.current;
    if (!g) return;
    if (mode === "tour") {
      g.position.set(...IDLE_SPOT);
      g.rotation.y = IDLE_ROT_Y;
      setAction("Idle");
      lastDoor.current = null;
      onNearDoor(null);
    } else {
      // Start walk mode facing into the village, so the first thing the visitor
      // sees is his back and the road ahead.
      g.rotation.y = Math.PI;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useFrame((_, dt) => {
    const g = wizardRef.current;
    if (!g) return;
    if (mode !== "roam" || paused) {
      setAction("Idle");
      return;
    }
    const { x, z } = inputRef.current;
    const len = Math.hypot(x, z);
    if (len > 0.12) {
      // Input is read in screen space and rotated into the world by the camera's
      // yaw, so "up" on the keyboard or stick always means away from the camera
      // no matter which way the wizard has turned.
      const yaw = camYawRef.current;
      const sin = Math.sin(yaw);
      const cos = Math.cos(yaw);
      const wx = -z * sin - x * cos;
      const wz = -z * cos + x * sin;
      const nx = wx / Math.max(len, 1);
      const nz = wz / Math.max(len, 1);
      const speed = WALK_SPEED * Math.min(len, 1);
      g.position.x += nx * speed * dt;
      g.position.z += nz * speed * dt;

      const dist = Math.hypot(g.position.x, g.position.z);
      if (dist > PLAZA_LIMIT) {
        g.position.x *= PLAZA_LIMIT / dist;
        g.position.z *= PLAZA_LIMIT / dist;
      }
      // Push out of anything solid. A collider with a second point is a wall,
      // so the push comes from the nearest point along its length; without one
      // it is a circle and the nearest point is simply its centre. Resolving
      // against every collider each frame lets the wizard slide along a fence
      // rather than stick to it.
      //
      // Several passes, because colliders overlap: being pushed clear of the
      // pond can land him inside the tent on its bank, and one pass would leave
      // him there. Three settles every overlap in the village.
      for (let pass = 0; pass < 3; pass++)
      for (const c of colliders) {
        let nearX = c.x;
        let nearZ = c.z;
        if (c.x2 !== undefined && c.z2 !== undefined) {
          const vx = c.x2 - c.x;
          const vz = c.z2 - c.z;
          const lenSq = vx * vx + vz * vz;
          const t =
            lenSq > 0
              ? Math.max(
                  0,
                  Math.min(
                    1,
                    ((g.position.x - c.x) * vx + (g.position.z - c.z) * vz) / lenSq,
                  ),
                )
              : 0;
          nearX = c.x + vx * t;
          nearZ = c.z + vz * t;
        }
        const dx = g.position.x - nearX;
        const dz = g.position.z - nearZ;
        const d = Math.hypot(dx, dz);
        if (d < c.r && d > 0.0001) {
          g.position.x = nearX + (dx / d) * c.r;
          g.position.z = nearZ + (dz / d) * c.r;
        }
      }

      const target = Math.atan2(nx, nz);
      let diff = target - g.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      g.rotation.y += diff * Math.min(1, dt * 12);
      setAction("Walking_A");
    } else {
      setAction("Idle");
    }

    let near: SectionKey | null = null;
    for (const d of doors) {
      if (Math.hypot(g.position.x - d.x, g.position.z - d.z) < DOOR_TRIGGER) {
        near = d.key;
        break;
      }
    }
    if (near !== lastDoor.current) {
      lastDoor.current = near;
      onNearDoor(near);
    }
  });

  return (
    <group ref={wizardRef} position={IDLE_SPOT} rotation-y={IDLE_ROT_Y} scale={1}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload("/models/Mage.glb");
