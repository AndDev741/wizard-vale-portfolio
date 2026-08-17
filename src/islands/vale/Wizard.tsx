import { useEffect, useMemo, useRef, type MutableRefObject, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import type { Group } from "three";
import type { SectionKey } from "../../i18n/ui";
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

interface WizardProps {
  mode: "tour" | "roam";
  paused: boolean;
  inputRef: MutableRefObject<InputVec>;
  wizardRef: RefObject<Group | null>;
  onNearDoor: (key: SectionKey | null) => void;
}

export function Wizard({ mode, paused, inputRef, wizardRef, onNearDoor }: WizardProps) {
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
    ],
    [],
  );

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
      const nx = x / Math.max(len, 1);
      const nz = z / Math.max(len, 1);
      const speed = WALK_SPEED * Math.min(len, 1);
      g.position.x += nx * speed * dt;
      g.position.z += nz * speed * dt;

      const dist = Math.hypot(g.position.x, g.position.z);
      if (dist > PLAZA_LIMIT) {
        g.position.x *= PLAZA_LIMIT / dist;
        g.position.z *= PLAZA_LIMIT / dist;
      }
      for (const c of colliders) {
        const dx = g.position.x - c.x;
        const dz = g.position.z - c.z;
        const d = Math.hypot(dx, dz);
        if (d < c.r && d > 0.0001) {
          g.position.x = c.x + (dx / d) * c.r;
          g.position.z = c.z + (dz / d) * c.r;
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
