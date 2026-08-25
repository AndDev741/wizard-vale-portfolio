import { memo, Suspense, useMemo, useRef, type MutableRefObject, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Stars, useGLTF } from "@react-three/drei";
import { localDaylight } from "./daylight";
import type { Group, Points } from "three";
import { t, type Lang, type SectionKey } from "../../i18n/ui";
import {
  places,
  facingCenter,
  doorPoint,
  PLAZA_LIMIT,
  WELL_RADIUS,
  DOOR_TRIGGER,
  IDLE_SPOT,
  IDLE_ROT_Y,
  type PlaceConfig,
} from "./world";
import {
  clouds,
  cloudModels,
  grassPatches,
  lanterns,
  propModels,
  obstacles,
  ridge,
  scatter,
  thinGroups,
  villageProps,
  GROUND_RADIUS,
  POND,
} from "./props";
import { Instanced, InstancedGroups, Model } from "./Instanced";
import { Wizard, type WizardStage } from "./Wizard";
import type { InputVec } from "./useInput";

const PLACE_MODELS = [
  "/models/building_tavern_red.gltf",
  "/models/building_tower_A_blue.gltf",
  "/models/building_castle_yellow.gltf",
  "/models/building_home_A_green.gltf",
  "/models/building_well_blue.gltf",
  "/models/crate_A_small.gltf",
];
PLACE_MODELS.forEach((p) => useGLTF.preload(p));
propModels.forEach((m) => useGLTF.preload(`/models/${m}.gltf`));

function PlaceLabel({
  place,
  name,
  blurb,
  onClick,
}: {
  place: PlaceConfig;
  name: string;
  blurb: string;
  onClick: () => void;
}) {
  // No distanceFactor: these are map markers, so they hold one screen size.
  // Scaling them with distance made them fill the viewport whenever the camera
  // moved in close, either on a place fly-to or while walking past a door.
  return (
    <Html
      position={[0, place.labelHeight / place.scale, 0]}
      center
      zIndexRange={[5, 0]}
    >
      <button
        type="button"
        onClick={onClick}
        className="pointer-events-auto block w-[12rem] cursor-pointer rounded-2xl border border-white/25 bg-black/50 px-3 py-1.5 text-center backdrop-blur-sm transition-colors hover:bg-black/75"
      >
        <span className="block whitespace-nowrap text-xs font-bold text-[#ece9dd]">{name}</span>
        <span className="mt-0.5 block text-[11px] leading-snug text-[#c9cdc2]">{blurb}</span>
      </button>
    </Html>
  );
}

function Building({
  place,
  name,
  blurb,
  showLabel,
  onClick,
}: {
  place: PlaceConfig;
  name: string;
  blurb: string;
  showLabel: boolean;
  onClick: () => void;
}) {
  return (
    <group
      position={place.position}
      rotation-y={facingCenter(place.position)}
      scale={place.scale}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "auto")}
    >
      {place.model && <Model path={place.model} />}
      {showLabel && <PlaceLabel place={place} name={name} blurb={blurb} onClick={onClick} />}
    </group>
  );
}

/** The contact spot: a small post with a hanging amber sign and a crate of letters. */
function RavenPost({
  place,
  name,
  blurb,
  showLabel,
  onClick,
}: {
  place: PlaceConfig;
  name: string;
  blurb: string;
  showLabel: boolean;
  onClick: () => void;
}) {
  return (
    <group
      position={place.position}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "auto")}
    >
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.12, 2.4, 8]} />
        <meshStandardMaterial color="#4a3c2c" />
      </mesh>
      <mesh position={[0.55, 2.1, 0]} castShadow>
        <boxGeometry args={[1.1, 0.1, 0.1]} />
        <meshStandardMaterial color="#4a3c2c" />
      </mesh>
      <mesh position={[0.8, 1.62, 0]} castShadow>
        <boxGeometry args={[0.9, 0.55, 0.06]} />
        <meshStandardMaterial color="#d99a3d" />
      </mesh>
      <group position={[-0.9, 0, 0.4]} scale={1.5}>
        <Model path="/models/crate_A_small.gltf" />
      </group>
      {showLabel && <PlaceLabel place={place} name={name} blurb={blurb} onClick={onClick} />}
    </group>
  );
}

function Lantern({
  position,
  light,
  boost,
}: {
  position: [number, number, number];
  light: boolean;
  /** Lamps matter at midnight and barely register at noon. */
  boost: number;
}) {
  return (
    <group position={position}>
      <mesh position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.1, 2.2, 8]} />
        <meshStandardMaterial color="#39413a" />
      </mesh>
      <mesh position={[0, 2.32, 0]}>
        <icosahedronGeometry args={[0.17, 1]} />
        <meshStandardMaterial
          color="#ffc477"
          emissive="#ffb15e"
          emissiveIntensity={1.6}
        />
      </mesh>
      <mesh position={[0, 2.56, 0]} castShadow>
        <boxGeometry args={[0.2, 0.08, 0.2]} />
        <meshStandardMaterial color="#39413a" />
      </mesh>
      {light && boost > 0.15 && (
        <pointLight
          position={[0, 2.3, 0]}
          color="#ffb15e"
          intensity={10 * boost}
          distance={14}
          decay={2}
        />
      )}
    </group>
  );
}

function Fireflies({ count = 64, night = 1 }: { count?: number; night?: number }) {
  const ref = useRef<Points>(null);
  const seeds = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        radius: 5 + ((i * 37) % 19),
        angle: (i * 2.399) % (Math.PI * 2),
        height: 0.8 + ((i * 13) % 22) / 10,
        speed: 0.1 + ((i * 7) % 10) / 45,
        phase: i * 1.7,
      })),
    [count],
  );
  const positions = useMemo(() => new Float32Array(count * 3), [count]);

  useFrame(({ clock }) => {
    const pts = ref.current;
    if (!pts) return;
    const time = clock.elapsedTime;
    const attr = pts.geometry.attributes.position;
    const arr = attr.array as Float32Array;
    // Indexed rather than forEach: the callback was a fresh closure every frame.
    for (let i = 0; i < seeds.length; i++) {
      const s = seeds[i];
      const a = s.angle + time * s.speed;
      arr[i * 3] = Math.cos(a) * s.radius;
      arr[i * 3 + 1] = s.height + Math.sin(time * 0.8 + s.phase) * 0.5;
      arr[i * 3 + 2] = Math.sin(a) * s.radius;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.14}
        color="#ffd27a"
        transparent
        opacity={0.85 * night}
        sizeAttenuation
      />
    </points>
  );
}

/** The cloud layer turns as one piece, so the sky is never quite still. */
function Clouds() {
  const ref = useRef<Group>(null);
  const groups = useMemo(() => {
    const big = clouds.filter((_, i) => i % 2 === 0);
    const small = clouds.filter((_, i) => i % 2 === 1);
    return { [cloudModels[0]]: big, [cloudModels[1]]: small };
  }, []);

  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.006;
  });

  return (
    <group ref={ref}>
      <InstancedGroups groups={groups} castShadow={false} />
    </group>
  );
}

interface SceneProps {
  lang: Lang;
  mode: "tour" | "roam";
  paused: boolean;
  inputRef: MutableRefObject<InputVec>;
  wizardRef: RefObject<Group | null>;
  onPlaceClick: (key: SectionKey) => void;
  onNearTrigger: (id: string | null) => void;
  camYawRef: MutableRefObject<number>;
  /** Set when he has just come back out of a building: spawn him at its door. */
  exitedFrom?: SectionKey | null;
  /** 1 on desktop, lower on small screens: thins the scattered rings. */
  detail: number;
}

function ValeScene({
  lang,
  mode,
  paused,
  inputRef,
  wizardRef,
  onPlaceClick,
  onNearTrigger,
  camYawRef,
  exitedFrom,
  detail,
}: SceneProps) {
  const dict = t(lang);
  const scattered = useMemo(() => thinGroups(scatter, detail), [detail]);
  // Read once per mount: the vale sits at the visitor's own hour and stays
  // there. A sky that cycles while you read is a distraction, not a detail.
  const sky = useMemo(() => localDaylight(), []);

  /** The vale as somewhere to walk: its edge, what blocks, and the five doors. */
  const stage = useMemo<WizardStage>(() => {
    // Stepping out of a building should leave you on its doorstep, not back in
    // the middle of the plaza.
    const from = exitedFrom ? places.find((p) => p.key === exitedFrom) : undefined;
    let spawn: [number, number, number] = IDLE_SPOT;
    let spawnRotY = Math.PI;
    if (from) {
      const [dx, dz] = doorPoint(from);
      const len = Math.hypot(dx, dz) || 1;
      // A pace further out than the door itself, facing back into the village,
      // with the door still inside its trigger so you can turn round and re-enter.
      spawn = [dx - (dx / len) * 1.6, 0, dz - (dz / len) * 1.6];
      spawnRotY = facingCenter([spawn[0], 0, spawn[2]]);
    }
    return {
      id: exitedFrom ? `vale:door-${exitedFrom}` : "vale",
      bounds: PLAZA_LIMIT,
      colliders: [
        { x: 0, z: 0, r: WELL_RADIUS },
        ...places.map((p) => ({ x: p.position[0], z: p.position[2], r: p.colliderRadius })),
        ...obstacles,
      ],
      triggers: places.map((p) => {
        const [x, z] = doorPoint(p);
        return { id: p.key, x, z, r: DOOR_TRIGGER };
      }),
      idle: { spot: IDLE_SPOT, rotY: IDLE_ROT_Y },
      // Facing into the village, so the first thing you see is his back.
      spawn,
      spawnRotY,
    };
  }, [exitedFrom]);
  // Labels are for the tour only, and on a phone they collide with the dock,
  // which already lists every place. `detail` is 1 only on wide screens.
  const showLabels = mode === "tour" && detail === 1;

  return (
    <>
      <color attach="background" args={[sky.air]} />
      <fog attach="fog" args={[sky.air, sky.fogNear, sky.fogFar]} />
      <hemisphereLight args={[sky.skyTop, sky.skyGround, sky.hemiIntensity]} />
      {/* The sun, or the moon standing in for it after dark. Its shadow camera
          covers the village only, so the plaza gets crisp shadows without
          spending resolution on the horizon. */}
      <directionalLight
        color={sky.sunColor}
        intensity={sky.sunIntensity}
        position={sky.sun}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-camera-near={1}
        shadow-camera-far={120}
        shadow-bias={-0.0015}
        shadow-normalBias={0.02}
      />
      {/* Cool fill from the opposite side so shadowed faces keep some shape. */}
      <directionalLight color={sky.fillColor} intensity={sky.fillIntensity} position={[22, 12, -16]} />
      {/* Stars only when there are stars to see. */}
      {sky.night > 0.15 && (
        <Stars
          radius={150}
          depth={60}
          count={Math.round(1800 * sky.night)}
          factor={5}
          saturation={0}
          fade
          speed={0.4}
        />
      )}

      {/* Ground: a wide grass plate, soft colour patches, the packed plaza,
          the roads out to each door, and the pond east of the village. */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.03} receiveShadow>
        <circleGeometry args={[GROUND_RADIUS, 64]} />
        <meshStandardMaterial color={sky.ground} />
      </mesh>
      {grassPatches.map((p, i) => (
        <mesh
          key={`patch-${i}`}
          rotation-x={-Math.PI / 2}
          position={[p.x, -0.02, p.z]}
          receiveShadow
        >
          <circleGeometry args={[p.r, 24]} />
          <meshStandardMaterial color={p.color} />
        </mesh>
      ))}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[11, 48]} />
        <meshStandardMaterial color="#4d4636" />
      </mesh>
      {places.map((p) => {
        const dist = Math.hypot(p.position[0], p.position[2]);
        const len = Math.max(dist - 6, 2);
        return (
          <group key={`path-${p.key}`} rotation-y={Math.atan2(p.position[0], p.position[2])}>
            <mesh rotation-x={-Math.PI / 2} position={[0, 0.008, dist / 2]} receiveShadow>
              <planeGeometry args={[1.7, len]} />
              <meshStandardMaterial color="#4d4636" />
            </mesh>
          </group>
        );
      })}
      <mesh rotation-x={-Math.PI / 2} position={[POND.x, -0.01, POND.z]} receiveShadow>
        <circleGeometry args={[POND.r + 0.7, 36]} />
        <meshStandardMaterial color="#463d2e" />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[POND.x, 0.012, POND.z]}>
        <circleGeometry args={[POND.r, 36]} />
        <meshStandardMaterial color="#2c5a6d" roughness={0.18} metalness={0.15} />
      </mesh>

      {/* The well at the heart of the plaza */}
      <group scale={5}>
        <Model path="/models/building_well_blue.gltf" />
      </group>

      {places.map((p) =>
        p.model ? (
          <Building
            key={p.key}
            place={p}
            name={dict.world.places[p.key]}
            blurb={dict.world.blurbs[p.key]}
            showLabel={showLabels}
            onClick={() => onPlaceClick(p.key)}
          />
        ) : (
          <RavenPost
            key={p.key}
            place={p}
            name={dict.world.places[p.key]}
            blurb={dict.world.blurbs[p.key]}
            showLabel={showLabels}
            onClick={() => onPlaceClick(p.key)}
          />
        ),
      )}

      {/* Arcane light in the tower's top window */}
      <pointLight
        position={[-13, 10, -8]}
        color="#8fb3ff"
        intensity={9}
        distance={12}
        decay={2}
      />

      {lanterns.map(([x, z], i) => (
        <Lantern key={`lantern-${i}`} position={[x, 0, z]} light={i < 4} boost={sky.lampBoost} />
      ))}

      <InstancedGroups groups={villageProps} />
      <InstancedGroups groups={scattered} />
      <InstancedGroups groups={ridge} castShadow={false} tint={0.42} />
      <Clouds />
      {sky.night > 0.25 && <Fireflies night={sky.night} />}

      {/* The wizard is the heaviest single download, so the vale is allowed to
          appear before he walks on. */}
      <Suspense fallback={null}>
        <Wizard
          stage={stage}
          walking={mode === "roam"}
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

/**
 * Memoised: walking past a door sets state up in ValeApp, and every one of those
 * renders would otherwise clone the buildings and rebuild the instanced batches.
 */
export const Scene = memo(ValeScene);
