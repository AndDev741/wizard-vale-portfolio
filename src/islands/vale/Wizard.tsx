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
import type { Obstacle } from "./props";
import { WALK_SPEED } from "./world";
import type { InputVec } from "./useInput";

/** Loadout options in the source model that must not render together. */
const HIDDEN_PROPS = new Set(["Spellbook", "Spellbook_open", "2H_Staff"]);

export interface WizardTrigger {
  id: string;
  x: number;
  z: number;
  r: number;
}

/**
 * Where the wizard is allowed to be. The vale passes one of these, and so does
 * each floor of a building interior, which is the whole reason it is a
 * parameter: the movement, collision and trigger code is the same indoors.
 */
export interface WizardStage {
  /** Identity, so arriving somewhere new repositions him. */
  id: string;
  /** He cannot walk further than this from the origin. */
  bounds: number;
  colliders: Obstacle[];
  triggers: WizardTrigger[];
  /** Where he waits while not walking. Interiors leave this out. */
  idle?: { spot: [number, number, number]; rotY: number };
  spawn: [number, number, number];
  spawnRotY: number;
}

interface WizardProps {
  stage: WizardStage;
  /** False in the vale's click-tour, where he only stands and idles. */
  walking: boolean;
  paused: boolean;
  inputRef: MutableRefObject<InputVec>;
  wizardRef: RefObject<Group | null>;
  /** Damped camera yaw, written by CameraRig. Input is relative to it. */
  camYawRef: MutableRefObject<number>;
  onNearTrigger: (id: string | null) => void;
}

export function Wizard({
  stage,
  walking,
  paused,
  inputRef,
  wizardRef,
  camYawRef,
  onNearTrigger,
}: WizardProps) {
  const { scene, animations } = useGLTF("/models/Mage.glb");
  const { actions } = useAnimations(animations, wizardRef as RefObject<Group>);
  const current = useRef("Idle");
  const lastTrigger = useRef<string | null>(null);

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

  // Put him where this stage wants him, on arrival and when walking starts.
  useEffect(() => {
    const g = wizardRef.current;
    if (!g) return;
    if (!walking && stage.idle) {
      g.position.set(...stage.idle.spot);
      g.rotation.y = stage.idle.rotY;
      setAction("Idle");
    } else {
      g.position.set(...stage.spawn);
      g.rotation.y = stage.spawnRotY;
    }
    lastTrigger.current = null;
    onNearTrigger(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walking, stage.id]);

  const colliders = stage.colliders;
  const triggers = stage.triggers;
  const bounds = stage.bounds;

  useFrame((_, dt) => {
    const g = wizardRef.current;
    if (!g) return;
    if (!walking || paused) {
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
      if (dist > bounds) {
        g.position.x *= bounds / dist;
        g.position.z *= bounds / dist;
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
      // Indexed loops: for-of builds an iterator, and this runs 3 x colliders
      // times a frame, which is exactly the kind of steady garbage that shows up
      // as an occasional hitch.
      for (let pass = 0; pass < 3; pass++)
        for (let ci = 0; ci < colliders.length; ci++) {
          const c = colliders[ci];
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

    let near: string | null = null;
    let bestDist = Infinity;
    for (let ti = 0; ti < triggers.length; ti++) {
      const t = triggers[ti];
      const d = Math.hypot(g.position.x - t.x, g.position.z - t.z);
      if (d < t.r && d < bestDist) {
        bestDist = d;
        near = t.id;
      }
    }
    if (near !== lastTrigger.current) {
      lastTrigger.current = near;
      onNearTrigger(near);
    }
  });

  const initial = useMemo(
    () => (walking || !stage.idle ? stage.spawn : stage.idle.spot),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <group ref={wizardRef} position={initial} rotation-y={stage.spawnRotY} scale={1}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload("/models/Mage.glb");
