import { Suspense, useMemo, type MutableRefObject, type RefObject } from "react";
import { Html, useGLTF } from "@react-three/drei";
import { BackSide, DoubleSide, type Group } from "three";
import { t, type Lang } from "../../i18n/ui";
import { findProject } from "../../data/projectDetail";
import { Model } from "./Instanced";
import { Wizard, type WizardStage, type WizardTrigger } from "./Wizard";
import type { InputVec } from "./useInput";
import {
  floorColliders,
  interiorModels,
  rad,
  ring,
  INTERIOR_PIVOT,
  type InteriorConfig,
  type InteriorFloor,
  towerInterior,
  type InteriorProp,
} from "./interiors";

const STEP_MODEL = "/models/dg_floor_wood_small.glb";
const TORCH_MODEL = "/models/dg_torch_mounted.glb";
const BANNER_MODEL = "/models/dg_banner_patternA_blue.glb";
const FRAME_MODEL = "/models/pictureframe_large_B.gltf";

// Every model the tower can ask for, warmed before anyone walks in.
for (const m of interiorModels(towerInterior)) {
  useGLTF.preload(m.startsWith("dg_") ? `/models/${m}.glb` : `/models/${m}.gltf`);
}
useGLTF.preload(FRAME_MODEL);

/** How far up the spiral climbs, and how far round the wall it wraps. */
const STAIR_STEPS = 16;
const STAIR_ARC = 120;
const STAIR_RADIUS_INSET = 1.7;
const HATCH_RADIUS = 1.6;

/** A prop, with its own off-origin geometry cancelled out. */
function Prop({ prop }: { prop: InteriorProp }) {
  const scale = prop.scale ?? 1;
  const rotY = prop.rotY ?? 0;
  const [ox, oz] = INTERIOR_PIVOT[prop.model] ?? [0, 0];
  const cos = Math.cos(rotY);
  const sin = Math.sin(rotY);
  const path = prop.model.startsWith("dg_")
    ? `/models/${prop.model}.glb`
    : `/models/${prop.model}.gltf`;
  return (
    <group
      position={[
        prop.x - (ox * cos + oz * sin) * scale,
        prop.y ?? 0,
        prop.z - (-ox * sin + oz * cos) * scale,
      ]}
      rotation-y={rotY}
      scale={scale}
    >
      <Model path={path} />
    </group>
  );
}

/**
 * The spiral. Each step is a wood tile turned to follow the wall, so it reads as
 * a staircase winding up the inside of the tower even though climbing it is a
 * trigger rather than real height.
 */
function Spiral({
  startAngle,
  radius,
  top,
}: {
  startAngle: number;
  radius: number;
  top: number;
}) {
  const steps = useMemo(() => {
    const out: Array<{ x: number; z: number; y: number; rotY: number; angle: number }> = [];
    for (let i = 0; i < STAIR_STEPS; i++) {
      const f = i / (STAIR_STEPS - 1);
      const angle = startAngle + f * STAIR_ARC;
      const [x, z] = ring(angle, radius);
      out.push({ x, z, y: 0.24 + f * (top - 0.9), rotY: rad(angle), angle });
    }
    return out;
  }, [startAngle, radius, top]);

  // A handrail on the inner edge: a post every other tread, with a short beam
  // bridging each pair, which is what stops the treads reading as loose planks.
  const rail = useMemo(() => {
    const posts = steps.filter((_, i) => i % 2 === 0);
    const beams: Array<{ x: number; z: number; y: number; rotY: number; len: number }> = [];
    for (let i = 0; i < posts.length - 1; i++) {
      const a = posts[i];
      const b = posts[i + 1];
      beams.push({
        x: (a.x + b.x) / 2,
        z: (a.z + b.z) / 2,
        y: (a.y + b.y) / 2 + 0.86,
        rotY: Math.atan2(b.x - a.x, b.z - a.z),
        len: Math.hypot(b.x - a.x, b.z - a.z) + 0.08,
      });
    }
    return { posts, beams };
  }, [steps]);

  const inner = radius - 0.72;

  return (
    <group>
      {steps.map((s, i) => (
        <group key={i} position={[s.x, s.y, s.z]} rotation-y={s.rotY} scale={0.85}>
          <Model path={STEP_MODEL} />
        </group>
      ))}
      {rail.posts.map((s, i) => {
        const [px, pz] = ring(s.angle, inner);
        return (
          <mesh key={`post-${i}`} position={[px, s.y + 0.48, pz]} castShadow>
            <cylinderGeometry args={[0.07, 0.07, 0.9, 6]} />
            <meshStandardMaterial color="#4a3524" />
          </mesh>
        );
      })}
      {rail.beams.map((b, i) => {
        const [bx, bz] = ring(
          (Math.atan2(b.x, b.z) * 180) / Math.PI,
          inner,
        );
        return (
          <mesh
            key={`beam-${i}`}
            position={[bx, b.y, bz]}
            rotation-y={b.rotY}
            castShadow
          >
            <boxGeometry args={[0.09, 0.11, b.len]} />
            <meshStandardMaterial color="#573f29" />
          </mesh>
        );
      })}
    </group>
  );
}

/** A framed board on the wall, with the project's name under it. */
function Board({
  angle,
  radius,
  label,
  onOpen,
}: {
  angle: number;
  radius: number;
  label: string;
  onOpen: () => void;
}) {
  const [x, z] = ring(angle, radius);
  return (
    <group
      position={[x, 2.7, z]}
      rotation-y={rad(angle) + Math.PI}
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "auto")}
      scale={1.5}
    >
      <Model path={FRAME_MODEL} />
      {/* Parchment behind the frame's opening, lit so it reads from across the room. */}
      <mesh position={[0, 0, 0.09]}>
        <planeGeometry args={[1.62, 0.86]} />
        <meshStandardMaterial
          color="#e8d6a8"
          emissive="#c8a86a"
          emissiveIntensity={0.35}
          side={DoubleSide}
        />
      </mesh>
      <Html position={[0, -0.82, 0.2]} center zIndexRange={[5, 0]}>
        <button
          type="button"
          onClick={onOpen}
          className="pointer-events-auto cursor-pointer whitespace-nowrap rounded-full border border-white/25 bg-black/55 px-3 py-1 text-xs font-semibold text-[#ece9dd] backdrop-blur-sm transition-colors hover:bg-black/80"
        >
          {label}
        </button>
      </Html>
    </group>
  );
}

interface InteriorProps {
  lang: Lang;
  config: InteriorConfig;
  floorIndex: number;
  paused: boolean;
  inputRef: MutableRefObject<InputVec>;
  wizardRef: RefObject<Group | null>;
  camYawRef: MutableRefObject<number>;
  onNearTrigger: (id: string | null) => void;
  onOpenBoard: (project: string) => void;
}

export function Interior({
  lang,
  config,
  floorIndex,
  paused,
  inputRef,
  wizardRef,
  camYawRef,
  onNearTrigger,
  onOpenBoard,
}: InteriorProps) {
  const dict = t(lang);
  const floor: InteriorFloor = config.floors[floorIndex];
  const isGround = floorIndex === 0;
  const isTop = floorIndex === config.floors.length - 1;
  const wallTop = config.wallHeight;

  const stairBase = ring(config.stairsAngle, config.radius - STAIR_RADIUS_INSET);
  const stairTopAngle = config.stairsAngle + STAIR_ARC;
  const stairTop = ring(stairTopAngle, config.radius - STAIR_RADIUS_INSET);
  const hatch = ring(config.hatchAngle, config.radius - 2.4);
  const exit = ring(config.exitAngle, config.radius - 1.4);

  const stage = useMemo<WizardStage>(() => {
    const triggers: WizardTrigger[] = [];
    if (!isTop) triggers.push({ id: "up", x: stairBase[0], z: stairBase[1], r: 1.7 });
    if (isGround) {
      triggers.push({ id: "exit", x: exit[0], z: exit[1], r: 1.7 });
    } else {
      triggers.push({ id: "down", x: hatch[0], z: hatch[1], r: 1.7 });
    }
    for (const b of floor.boards) {
      const [bx, bz] = ring(b.angle, config.radius - 2.2);
      triggers.push({ id: `board:${b.project}`, x: bx, z: bz, r: 2 });
    }
    // Arriving from below you step out of the hatch; on the ground floor you
    // come in through the door.
    const spawnSpot = isGround ? exit : hatch;
    return {
      id: `${config.place}:${floorIndex}`,
      bounds: config.radius - 1.1,
      colliders: floorColliders(config, floor),
      triggers,
      spawn: [spawnSpot[0] * 0.5, 0, spawnSpot[1] * 0.5],
      spawnRotY: Math.atan2(-spawnSpot[0], -spawnSpot[1]),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, floorIndex]);

  return (
    <>
      <color attach="background" args={["#0d1014"]} />
      <hemisphereLight args={["#7f8fae", "#3a3026", 0.7]} />
      {/* The room's own light, tinted to this floor's mood. */}
      <pointLight
        position={[0, wallTop - 1.4, 0]}
        color={floor.accent}
        intensity={38}
        distance={26}
        decay={2}
      />
      <pointLight
        position={[stairTop[0] * 0.7, wallTop - 0.6, stairTop[1] * 0.7]}
        color="#ffd9a0"
        intensity={12}
        distance={14}
        decay={2}
      />
      {/* A fill on the entrance side, which the room's own light barely reaches. */}
      <pointLight
        position={[exit[0] * 0.75, 4.2, exit[1] * 0.75]}
        color="#ffcf9c"
        intensity={16}
        distance={16}
        decay={2}
      />

      {/* Floor, wall and ceiling. The wall is a cylinder seen from the inside. */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[config.radius, 48]} />
        <meshStandardMaterial color="#6b5540" />
      </mesh>
      <mesh position={[0, wallTop / 2, 0]}>
        <cylinderGeometry args={[config.radius, config.radius, wallTop, 48, 1, true]} />
        <meshStandardMaterial color="#59616e" side={BackSide} />
      </mesh>
      <mesh rotation-x={Math.PI / 2} position={[0, wallTop, 0]}>
        <circleGeometry args={[config.radius, 48]} />
        <meshStandardMaterial color="#3b414c" />
      </mesh>
      {/* The way up, as an opening cut in the ceiling above the last step. */}
      {!isTop && (
        <mesh rotation-x={Math.PI / 2} position={[stairTop[0], wallTop - 0.02, stairTop[1]]}>
          <circleGeometry args={[1.5, 24]} />
          <meshBasicMaterial color="#08090b" />
        </mesh>
      )}

      {/* Night through the arrow slits. */}
      {[36, 144, 252, 324].map((a) => {
        const [wx, wz] = ring(a, config.radius - 0.06);
        return (
          <mesh
            key={`win-${a}`}
            position={[wx, 3.6, wz]}
            rotation-y={rad(a) + Math.PI}
          >
            <planeGeometry args={[0.5, 1.5]} />
            <meshStandardMaterial
              color="#2b3a55"
              emissive="#3f5f8f"
              emissiveIntensity={0.7}
            />
          </mesh>
        );
      })}

      {/* No spiral on the top floor: there is nothing above it to reach. */}
      {!isTop && (
        <Spiral
          startAngle={config.stairsAngle}
          radius={config.radius - STAIR_RADIUS_INSET}
          top={wallTop}
        />
      )}

      {/* Where you came up, or the door out. */}
      {isGround ? (
        // The doorway is marked on the floor rather than as a panel on the wall:
        // the camera looks in over that wall, so a panel there would stand in
        // front of the room and hide whoever is standing in the entrance.
        <group position={[exit[0], 0, exit[1]]} rotation-y={rad(config.exitAngle)}>
          <mesh rotation-x={-Math.PI / 2} position={[0, 0.03, 0]} receiveShadow>
            <planeGeometry args={[3, 1.8]} />
            <meshStandardMaterial color="#4a4a52" />
          </mesh>
          <mesh rotation-x={-Math.PI / 2} position={[0, 0.05, 0.75]}>
            <planeGeometry args={[3, 0.3]} />
            <meshStandardMaterial
              color="#8fb3ff"
              emissive="#5f86c8"
              emissiveIntensity={0.9}
            />
          </mesh>
        </group>
      ) : (
        <group position={[hatch[0], 0, hatch[1]]}>
          <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
            <circleGeometry args={[HATCH_RADIUS, 24]} />
            <meshBasicMaterial color="#0a0b0d" />
          </mesh>
          {[0, 90, 180, 270].map((a) => {
            const [px, pz] = ring(a, HATCH_RADIUS + 0.16);
            return (
              <mesh key={`rail-${a}`} position={[px, 0.5, pz]} castShadow>
                <cylinderGeometry args={[0.07, 0.07, 1, 6]} />
                <meshStandardMaterial color="#4a3524" />
              </mesh>
            );
          })}
        </group>
      )}

      {/* Mounted torches, with a warm light on the two nearest the entrance. */}
      {floor.torches.map((a, i) => {
        const [tx, tz] = ring(a, config.radius - 0.25);
        return (
          <group key={`torch-${a}`}>
            <group position={[tx, 3.1, tz]} rotation-y={rad(a) + Math.PI}>
              <Model path={TORCH_MODEL} />
            </group>
            {i < 2 && (
              <pointLight
                position={[tx * 0.86, 3.4, tz * 0.86]}
                color="#ffa94d"
                intensity={14}
                distance={12}
                decay={2}
              />
            )}
          </group>
        );
      })}

      {floor.banners.map((a) => {
        const [bx, bz] = ring(a, config.radius - 0.12);
        return (
          <group key={`banner-${a}`} position={[bx, 2.4, bz]} rotation-y={rad(a) + Math.PI}>
            <Model path={BANNER_MODEL} />
          </group>
        );
      })}

      {floor.props.map((p, i) => (
        <Prop key={`prop-${i}`} prop={p} />
      ))}

      {floor.boards.map((b) => {
        const project = findProject(b.project);
        const label = b.project === "all" ? dict.interior.allTitle : (project?.name ?? b.project);
        return (
          <Board
            key={b.project}
            angle={b.angle}
            radius={config.radius - 0.1}
            label={label}
            onOpen={() => onOpenBoard(b.project)}
          />
        );
      })}

      <Suspense fallback={null}>
        <Wizard
          stage={stage}
          walking
          paused={paused}
          inputRef={inputRef}
          wizardRef={wizardRef}
          camYawRef={camYawRef}
          onNearTrigger={onNearTrigger}
        />
      </Suspense>
    </>
  );
}

