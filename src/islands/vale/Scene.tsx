import { useMemo, useRef, type MutableRefObject, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Clone, Html, Stars, useGLTF } from "@react-three/drei";
import type { Group, Points } from "three";
import { t, type Lang, type SectionKey } from "../../i18n/ui";
import { places, facingCenter, type PlaceConfig } from "./world";
import { Wizard } from "./Wizard";
import type { InputVec } from "./useInput";

const MODEL_PATHS = [
  "/models/building_tavern_red.gltf",
  "/models/building_tower_A_blue.gltf",
  "/models/building_church_yellow.gltf",
  "/models/building_home_A_green.gltf",
  "/models/building_well_blue.gltf",
  "/models/tree_single_A.gltf",
  "/models/tree_single_B.gltf",
  "/models/trees_A_medium.gltf",
  "/models/rock_single_A.gltf",
  "/models/barrel.gltf",
  "/models/crate_A_small.gltf",
  "/models/fence_wood_straight.gltf",
];
MODEL_PATHS.forEach((p) => useGLTF.preload(p));

function Model({ path }: { path: string }) {
  const { scene } = useGLTF(path);
  return <Clone object={scene} />;
}

function PlaceLabel({
  place,
  name,
  onClick,
}: {
  place: PlaceConfig;
  name: string;
  onClick: () => void;
}) {
  return (
    <Html
      position={[0, place.labelHeight / place.scale, 0]}
      center
      distanceFactor={16}
      zIndexRange={[5, 0]}
    >
      <button
        type="button"
        onClick={onClick}
        className="pointer-events-auto cursor-pointer whitespace-nowrap rounded-full border border-white/25 bg-black/45 px-3 py-1 text-xs font-semibold text-[#ece9dd] backdrop-blur-sm transition-colors hover:bg-black/70"
      >
        {name}
      </button>
    </Html>
  );
}

function Building({
  place,
  name,
  onClick,
}: {
  place: PlaceConfig;
  name: string;
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
      <PlaceLabel place={place} name={name} onClick={onClick} />
    </group>
  );
}

/** The contact spot: a small post with a hanging amber sign and a crate of letters. */
function RavenPost({
  place,
  name,
  onClick,
}: {
  place: PlaceConfig;
  name: string;
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
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.09, 0.12, 2.4, 8]} />
        <meshStandardMaterial color="#4a3c2c" />
      </mesh>
      <mesh position={[0.55, 2.1, 0]}>
        <boxGeometry args={[1.1, 0.1, 0.1]} />
        <meshStandardMaterial color="#4a3c2c" />
      </mesh>
      <mesh position={[0.8, 1.62, 0]}>
        <boxGeometry args={[0.9, 0.55, 0.06]} />
        <meshStandardMaterial color="#d99a3d" />
      </mesh>
      <group position={[-0.9, 0, 0.4]} scale={1.5}>
        <Model path="/models/crate_A_small.gltf" />
      </group>
      <PlaceLabel place={place} name={name} onClick={onClick} />
    </group>
  );
}

function Lantern({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.07, 0.1, 2.2, 8]} />
        <meshStandardMaterial color="#39413a" />
      </mesh>
      <mesh position={[0, 2.3, 0]}>
        <boxGeometry args={[0.32, 0.4, 0.32]} />
        <meshStandardMaterial
          color="#ffb15e"
          emissive="#ffb15e"
          emissiveIntensity={2.4}
        />
      </mesh>
      <pointLight
        position={[0, 2.3, 0]}
        color="#ffb15e"
        intensity={10}
        distance={13}
        decay={2}
      />
    </group>
  );
}

function Fireflies({ count = 42 }: { count?: number }) {
  const ref = useRef<Points>(null);
  const seeds = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        radius: 5 + ((i * 37) % 17),
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
    seeds.forEach((s, i) => {
      const a = s.angle + time * s.speed;
      arr[i * 3] = Math.cos(a) * s.radius;
      arr[i * 3 + 1] = s.height + Math.sin(time * 0.8 + s.phase) * 0.5;
      arr[i * 3 + 2] = Math.sin(a) * s.radius;
    });
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
        opacity={0.85}
        sizeAttenuation
      />
    </points>
  );
}

const TREES: Array<[number, number, "A" | "B" | "cluster", number]> = [
  [16, -14, "A", 2.6],
  [21, -4, "B", 3.0],
  [19, 6, "A", 2.4],
  [14, 15, "B", 2.8],
  [-16, -14, "B", 2.7],
  [-21, -2, "A", 3.1],
  [-19, 13, "A", 2.5],
  [-13, 17, "B", 2.6],
  [4, -17, "A", 2.9],
  [-5, -18, "B", 2.5],
  [7, 18, "B", 2.4],
  [-8, 19, "A", 2.8],
  [25, -11, "cluster", 2.6],
  [-25, 7, "cluster", 2.8],
];

const ROCKS: Array<[number, number, number]> = [
  [7, -13, 1.8],
  [-6.5, 15.5, 2.2],
  [20, 11, 1.6],
];

const LANTERNS: Array<[number, number, number]> = [
  [5.5, 0, -5.5],
  [-5.5, 0, -5.5],
  [-5.5, 0, 5.5],
  [5.5, 0, 5.5],
];

interface SceneProps {
  lang: Lang;
  mode: "tour" | "roam";
  paused: boolean;
  inputRef: MutableRefObject<InputVec>;
  wizardRef: RefObject<Group | null>;
  onPlaceClick: (key: SectionKey) => void;
  onNearDoor: (key: SectionKey | null) => void;
}

export function Scene({
  lang,
  mode,
  paused,
  inputRef,
  wizardRef,
  onPlaceClick,
  onNearDoor,
}: SceneProps) {
  const dict = t(lang);

  return (
    <>
      <color attach="background" args={["#141c28"]} />
      <fog attach="fog" args={["#141c28", 30, 78]} />
      <hemisphereLight args={["#7787b8", "#31402f", 0.55]} />
      <directionalLight color="#ffb877" intensity={2.4} position={[-18, 16, 6]} />
      <Stars radius={70} depth={30} count={1500} factor={3.5} saturation={0} fade speed={0.4} />

      {/* Ground: grass disc, packed-dirt plaza, dirt paths to each door */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.02}>
        <circleGeometry args={[48, 48]} />
        <meshStandardMaterial color="#2c4534" />
      </mesh>
      <mesh rotation-x={-Math.PI / 2}>
        <circleGeometry args={[8.5, 40]} />
        <meshStandardMaterial color="#4d4636" />
      </mesh>
      {places.map((p) => {
        const dist = Math.hypot(p.position[0], p.position[2]);
        const len = Math.max(dist - 6, 2);
        return (
          <group key={`path-${p.key}`} rotation-y={Math.atan2(p.position[0], p.position[2])}>
            <mesh rotation-x={-Math.PI / 2} position={[0, 0.006, dist / 2]}>
              <planeGeometry args={[1.7, len]} />
              <meshStandardMaterial color="#4d4636" />
            </mesh>
          </group>
        );
      })}

      {/* The well at the heart of the plaza */}
      <group scale={2.6}>
        <Model path="/models/building_well_blue.gltf" />
      </group>

      {places.map((p) =>
        p.model ? (
          <Building
            key={p.key}
            place={p}
            name={dict.world.places[p.key]}
            onClick={() => onPlaceClick(p.key)}
          />
        ) : (
          <RavenPost
            key={p.key}
            place={p}
            name={dict.world.places[p.key]}
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

      {LANTERNS.map((pos, i) => (
        <Lantern key={i} position={pos} />
      ))}

      {TREES.map(([x, z, kind, scale], i) => (
        <group key={`tree-${i}`} position={[x, 0, z]} scale={scale} rotation-y={i * 1.3}>
          <Model
            path={
              kind === "cluster"
                ? "/models/trees_A_medium.gltf"
                : kind === "A"
                  ? "/models/tree_single_A.gltf"
                  : "/models/tree_single_B.gltf"
            }
          />
        </group>
      ))}

      {ROCKS.map(([x, z, scale], i) => (
        <group key={`rock-${i}`} position={[x, 0, z]} scale={scale} rotation-y={i * 2.1}>
          <Model path="/models/rock_single_A.gltf" />
        </group>
      ))}

      {/* Clutter by the tavern door and the cottage garden */}
      <group position={[9.2, 0, -4.2]} scale={1.7}>
        <Model path="/models/barrel.gltf" />
      </group>
      <group position={[8.3, 0, -5.4]} scale={1.6} rotation-y={0.6}>
        <Model path="/models/crate_A_small.gltf" />
      </group>
      <group position={[7.6, 0, 11.2]} scale={1.4} rotation-y={0.68}>
        <Model path="/models/fence_wood_straight.gltf" />
      </group>
      <group position={[9.1, 0, 12.4]} scale={1.4} rotation-y={0.68}>
        <Model path="/models/fence_wood_straight.gltf" />
      </group>

      <Fireflies />

      <Wizard
        mode={mode}
        paused={paused}
        inputRef={inputRef}
        wizardRef={wizardRef}
        onNearDoor={onNearDoor}
      />
    </>
  );
}
