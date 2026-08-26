import {
  memo,
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type MutableRefObject,
  type RefObject,
} from "react";
import { useFrame } from "@react-three/fiber";
import { Html, useAnimations, useGLTF, useTexture } from "@react-three/drei";
import {
  BackSide,
  CanvasTexture,
  Color,
  DoubleSide,
  SRGBColorSpace,
  type Group,
  type Mesh,
  type MeshStandardMaterial,
  type PointLight,
  type Sprite,
  type SpriteMaterial,
} from "three";
import { t, type Lang } from "../../i18n/ui";
import { boardLabel } from "./boardSubject";
import { findNpc } from "../../data/experienceNpcs";
import { findTopic, libraryLeaf } from "../../data/writingTopics";
import { Model } from "./Instanced";
import { Wizard, type WizardStage, type WizardTrigger } from "./Wizard";
import type { InputVec } from "./useInput";
import {
  floorColliders,
  interiorModels,
  rad,
  ring,
  shelfBookAngles,
  INTERIOR_PIVOT,
  type InteriorConfig,
  type InteriorFloor,
  interiors,
  type InteriorFixture,
  type InteriorNpc,
  type InteriorProp,
  COUCH_SEAT,
} from "./interiors";
import { findCottageObject } from "../../data/cottageObjects";
import { allTech } from "../../data/techSkills";

const LADDER_RUNG_GAP = 0.46;
const TORCH_MODEL = "/models/dg_torch_mounted.glb";
const BANNER_MODEL = "/models/dg_banner_patternA_blue.glb";
const FRAME_MODEL = "/models/pictureframe_large_B.gltf";
const COUCH_MODEL = "/models/couch.gltf";
const COTTAGE_FRAME = "/models/pictureframe_large_A.gltf";
/**
 * The family photo inside the cottage's frame. Set to a path under public/
 * (e.g. "/family.jpg") once the picture exists; null leaves the frame's own
 * blank canvas. Drawn unlit and full-res so it stays sharp in a dim room.
 */
const FRAME_PHOTO: string | null = "/family.jpg";
const JOURNAL_MODEL = "/models/book_single.gltf";

// Every model any interior can ask for, warmed before anyone walks in.
for (const config of Object.values(interiors)) {
  if (!config) continue;
  for (const m of interiorModels(config)) {
    useGLTF.preload(m.startsWith("dg_") ? `/models/${m}.glb` : `/models/${m}.gltf`);
  }
}
useGLTF.preload(FRAME_MODEL);
useGLTF.preload("/models/dg_sword_shield.glb");
for (const path of [COUCH_MODEL, COTTAGE_FRAME, JOURNAL_MODEL]) {
  useGLTF.preload(path);
}
/**
 * The three patrons are NOT warmed here. They are 3.5MB each, they only exist
 * in the Guild Hall, and preloading them cost every first visit ten megabytes
 * of characters most visitors never walk up to. They load when the hall does.
 */

/** How far the ladder stands off the wall, and how wide the hatch opening is. */
const LADDER_INSET = 0.75;
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
 * The way up: a ladder standing against the wall, reaching an opening in the
 * ceiling. Climbing is still a trigger rather than real height, so the wizard
 * stays on one plane, but a vertical ladder reads as a single obvious "up"
 * where a spiral of treads invited walking that the movement cannot do.
 */
function Ladder({
  angle,
  radius,
  top,
}: {
  angle: number;
  radius: number;
  top: number;
}) {
  const [x, z] = ring(angle, radius);
  const rungs = useMemo(() => {
    const out: number[] = [];
    for (let y = 0.42; y < top - 0.1; y += LADDER_RUNG_GAP) out.push(y);
    return out;
  }, [top]);

  return (
    <group position={[x, 0, z]} rotation-y={rad(angle) + Math.PI}>
      {[-0.52, 0.52].map((side) => (
        <mesh key={side} position={[side, (top + 0.5) / 2, 0]} castShadow>
          <boxGeometry args={[0.15, top + 0.5, 0.15]} />
          <meshStandardMaterial color="#5b4229" />
        </mesh>
      ))}
      {rungs.map((y) => (
        <mesh key={y} position={[0, y, 0.02]} castShadow>
          <boxGeometry args={[1.04, 0.1, 0.13]} />
          <meshStandardMaterial color="#6d5133" />
        </mesh>
      ))}
      {/* A short landing board at the top, so the ladder meets the opening. */}
      <mesh position={[0, top + 0.06, 0.7]} castShadow>
        <boxGeometry args={[1.6, 0.12, 1.4]} />
        <meshStandardMaterial color="#5b4229" />
      </mesh>
    </group>
  );
}

/**
 * Like the wizard's mage, each adventurer model ships every loadout attached at
 * once. One thing per hand: the knight keeps sword and round shield, the warrior
 * keeps his mug (it is a pub), and the apprentice keeps empty hands.
 */
const NPC_HIDDEN: Record<string, string[]> = {
  Knight: ["1H_Sword_Offhand", "Badge_Shield", "Rectangle_Shield", "Spike_Shield", "2H_Sword"],
  Barbarian: ["1H_Axe_Offhand", "Barbarian_Round_Shield", "1H_Axe", "2H_Axe"],
  Rogue: ["Knife_Offhand", "1H_Crossbow", "2H_Crossbow", "Knife", "Throwable"],
};

/** A patron of the hall: stands at their spot, idling, and talks when asked. */
/**
 * The trophy above each patron: the pack's shield-and-crossed-swords, tinted to
 * the metal of their rank. One geometry for all three, so the tiers differ in
 * metal and nothing else.
 */
const TIER_METAL: Record<InteriorNpc["tier"], string> = {
  copper: "#b06a2c",
  silver: "#e4edf7",
  gold: "#f3c536",
};

function Trophy({ angle, radius, tier }: { angle: number; radius: number; tier: InteriorNpc["tier"] }) {
  const { scene } = useGLTF("/models/dg_sword_shield.glb");
  const [x, z] = ring(angle, radius);
  // Cloned per trophy: three of these hang in one room, each its own colour.
  const trophy = useMemo(() => {
    const copy = scene.clone(true);
    copy.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      const source = mesh.material as MeshStandardMaterial;
      const mat = source.clone();
      mat.color = new Color(TIER_METAL[tier]);
      mesh.material = mat;
    });
    return copy;
  }, [scene, tier]);

  return (
    <group position={[x, 3.95, z]} rotation-y={rad(angle) + Math.PI} scale={1.2}>
      <primitive object={trophy} />
    </group>
  );
}

function Npc({
  npc,
  lang,
  onTalk,
}: {
  npc: InteriorNpc;
  lang: Lang;
  onTalk: () => void;
}) {
  const group = useRef<Group>(null);
  const { scene, animations } = useGLTF(`/models/${npc.model}.glb`);
  const { actions } = useAnimations(animations, group);
  const detail = findNpc(npc.key);
  const [x, z] = ring(npc.angle, npc.radius);

  useLayoutEffect(() => {
    const hidden = new Set(NPC_HIDDEN[npc.model] ?? []);
    scene.traverse((o) => {
      if ((o as Mesh).isMesh) (o as Mesh).castShadow = true;
      if (hidden.has(o.name)) o.visible = false;
    });
  }, [scene, npc.model]);

  useEffect(() => {
    const idle = actions["Idle"];
    // Offset each patron's loop so the room does not idle in unison.
    if (idle) {
      idle.reset().play();
      idle.time = (npc.angle % 7) / 7;
    }
    return () => {
      Object.values(actions).forEach((a) => a?.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions]);

  return (
    <group
      ref={group}
      position={[x, 0, z]}
      rotation-y={rad(npc.angle) + Math.PI + (npc.faceOffset ?? 0)}
      onClick={(e) => {
        e.stopPropagation();
        onTalk();
      }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "auto")}
    >
      <primitive object={scene} />
      <Html position={[0, npc.plateY ?? 2.6, 0]} center zIndexRange={[5, 0]}>
        <button
          type="button"
          onClick={onTalk}
          className="pointer-events-auto block w-[11.5rem] cursor-pointer rounded-2xl border border-white/25 bg-black/60 px-3 py-1.5 text-center backdrop-blur-sm transition-colors hover:bg-black/80"
        >
          <span className="block whitespace-nowrap text-xs font-bold text-[#ece9dd]">
            {detail?.name[lang] ?? npc.key}
          </span>
          {detail && (
            <span className="mt-0.5 block text-[11px] leading-snug text-[#c9cdc2]">
              {detail.tagline[lang]}
            </span>
          )}
        </button>
      </Html>
    </group>
  );
}

/**
 * A bookcase holding one subject: a wooden case against the wall, and on its
 * shelf the subject's texts standing as real books, each one openable. The case
 * is built from primitives so the shelf height is known exactly, which is what
 * lets the books sit on the board instead of hovering near it.
 */
function Bookcase({
  angle,
  radius,
  topicKey,
  lang,
  onOpenText,
}: {
  angle: number;
  radius: number;
  topicKey: string;
  lang: Lang;
  onOpenText: (key: string) => void;
}) {
  const topic = findTopic(topicKey);
  const [x, z] = ring(angle, radius - 0.42);
  const texts = topic?.texts ?? [];
  const wood = "#4a3524";
  const boardWood = "#5b4229";
  const W = 2.3;
  const H = 2.7;
  const D = 0.5;
  // The book model's origin sits at its middle (min/max y = -0.25/0.25), so a
  // book placed at the board's height is half buried in it. Every book height
  // here is measured from the surface it stands on, plus that half.
  const BOOK_SCALE = 1.15;
  const BOOK_HALF = 0.25 * BOOK_SCALE;
  const SHELF_BOARD_Y = 1.68;
  const SHELF_TOP = SHELF_BOARD_Y + 0.04;
  const BOOK_Y = SHELF_TOP + BOOK_HALF;
  // A lower shelf, filled with books that are only books. With the readable
  // ones raised, the bottom half of the case was an empty box.
  const LOWER_BOARD_Y = 0.74;
  const LOWER_BOOK_Y = LOWER_BOARD_Y + 0.04 + BOOK_HALF;
  const CASE_TOP = H + 0.06;
  const CROWN_SCALE = 0.85;

  return (
    <group position={[x, 0, z]} rotation-y={rad(angle) + Math.PI}>
      {/* back panel, sides, top, base, and the shelf board the books stand on */}
      <mesh position={[0, H / 2, -D / 2 + 0.03]} castShadow>
        <boxGeometry args={[W, H, 0.06]} />
        <meshStandardMaterial color={wood} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[(side * W) / 2, H / 2, 0]} castShadow>
          <boxGeometry args={[0.1, H, D]} />
          <meshStandardMaterial color={boardWood} />
        </mesh>
      ))}
      <mesh position={[0, H, 0]} castShadow>
        <boxGeometry args={[W + 0.16, 0.12, D + 0.1]} />
        <meshStandardMaterial color={boardWood} />
      </mesh>
      <mesh position={[0, 0.08, 0]} castShadow>
        <boxGeometry args={[W + 0.16, 0.16, D + 0.1]} />
        <meshStandardMaterial color={boardWood} />
      </mesh>
      {[SHELF_BOARD_Y, LOWER_BOARD_Y].map((y) => (
        <mesh key={y} position={[0, y, 0]} castShadow>
          <boxGeometry args={[W - 0.1, 0.08, D - 0.08]} />
          <meshStandardMaterial color={boardWood} />
        </mesh>
      ))}

      {/* the lower shelf's filling: spines only, nothing to open */}
      {[-0.72, 0, 0.72].map((bx, i) => (
        <group
          key={bx}
          position={[bx, LOWER_BOOK_Y, 0.04]}
          rotation-y={-0.2 + i * 0.22}
          scale={BOOK_SCALE}
        >
          <Model path="/models/book_set.gltf" />
        </group>
      ))}
      {/* a little decoration on top, so the case reads lived-in */}
      <group
        position={[-0.55, CASE_TOP + 0.25 * CROWN_SCALE, 0]}
        rotation-y={0.4}
        scale={CROWN_SCALE}
      >
        <Model path="/models/book_set.gltf" />
      </group>
      {/* the subject, above the case. Books carry only their emoji: seven full
          titles side by side turned into a pile of labels, and the walk-up
          prompt already names the book. */}
      <Html position={[0, H + 0.75, 0.2]} center zIndexRange={[5, 0]}>
        <p className="pointer-events-none whitespace-nowrap rounded-full border border-[#d99a3d]/50 bg-black/60 px-3 py-1 text-xs font-bold text-[#e8dcc0] backdrop-blur-sm">
          {topic?.title[lang] ?? topicKey}
        </p>
      </Html>

      {/* the books themselves: one per text, standing on the shelf */}
      {texts.map((key, i) => {
        const leaf = libraryLeaf(key, lang);
        if (!leaf) return null;
        const count = texts.length;
        const spacing = Math.min(1.05, (W - 0.5) / Math.max(count, 1));
        const bx = (i - (count - 1) / 2) * spacing;
        return (
          <group key={key} position={[bx, BOOK_Y, 0.06]}>
            <group
              rotation-y={-0.25 + i * 0.5}
              scale={BOOK_SCALE}
              onClick={(e) => {
                e.stopPropagation();
                onOpenText(key);
              }}
              onPointerOver={() => (document.body.style.cursor = "pointer")}
              onPointerOut={() => (document.body.style.cursor = "auto")}
            >
              <Model path="/models/book_set.gltf" />
            </group>
            <Html position={[0, 0.82, 0.3]} center zIndexRange={[5, 0]}>
              <button
                type="button"
                onClick={() => onOpenText(key)}
                aria-label={leaf.title}
                title={leaf.title}
                className="pointer-events-auto cursor-pointer rounded-full border border-white/25 bg-black/55 px-2 py-0.5 text-sm backdrop-blur-sm transition-colors hover:bg-black/80"
              >
                {leaf.coverEmoji}
              </button>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

/** A reading stand with an open book on it, presenting a whole board subject. */
function Lectern({
  angle,
  radius,
  subject,
  lang,
  onOpen,
}: {
  angle: number;
  radius: number;
  subject: string;
  lang: Lang;
  onOpen: () => void;
}) {
  const [x, z] = ring(angle, radius);
  return (
    <group
      position={[x, 0, z]}
      rotation-y={rad(angle)}
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "auto")}
    >
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[0.22, 1.1, 0.22]} />
        <meshStandardMaterial color="#4a3524" />
      </mesh>
      <mesh position={[0, 0.06, 0]} castShadow>
        <boxGeometry args={[0.7, 0.12, 0.7]} />
        <meshStandardMaterial color="#5b4229" />
      </mesh>
      {/* the slanted rest, and the book lying on it rather than sunk in it */}
      <mesh position={[0, 1.16, 0]} rotation-x={-0.35} castShadow>
        <boxGeometry args={[0.85, 0.06, 0.6]} />
        <meshStandardMaterial color="#5b4229" />
      </mesh>
      <group position={[0, 1.16 + 0.03 + 0.25 * 1.1, 0]} rotation-x={-0.35} scale={1.1}>
        <Model path="/models/book_set.gltf" />
      </group>
      <Html position={[0, 2.55, 0]} center zIndexRange={[5, 0]}>
        <button
          type="button"
          onClick={onOpen}
          className="pointer-events-auto cursor-pointer whitespace-nowrap rounded-full border border-white/25 bg-black/55 px-3 py-1 text-xs font-semibold text-[#ece9dd] backdrop-blur-sm transition-colors hover:bg-black/80"
        >
          {boardLabel(subject, lang)}
        </button>
      </Html>
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
  /** True while the open dialog is the one belonging to this room's seat. */
  seated?: boolean;
  /** 0 in daylight, 1 after dark. Windows and arrow slits answer to it. */
  night?: number;
  /** One footfall, per stride. */
  onStep?: () => void;
}


/**
 * A fire that will not sit still. The light wobbles on two sines that do not
 * divide into each other, which is enough to read as flame without a texture.
 */
function Hearth({ angle, radius }: { angle: number; radius: number }) {
  const light = useRef<PointLight>(null);
  const flame = useRef<Group>(null);
  const [x, z] = ring(angle, radius);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const wobble = Math.sin(time * 8.3) * 0.5 + Math.sin(time * 3.1) * 0.5;
    if (light.current) light.current.intensity = 26 + wobble * 7;
    if (flame.current) {
      const s = 1 + wobble * 0.07;
      flame.current.scale.set(1, s, 1);
    }
  });

  const stone = "#7d7166";
  const dark = "#231b16";
  return (
    <group position={[x, 0, z]} rotation-y={rad(angle) + Math.PI}>
      {/* the surround: two jambs, a lintel, and a chimney breast above it */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 1.05, 1.1, 0]} castShadow>
          <boxGeometry args={[0.5, 2.2, 0.75]} />
          <meshStandardMaterial color={stone} />
        </mesh>
      ))}
      <mesh position={[0, 2.32, 0]} castShadow>
        <boxGeometry args={[2.6, 0.45, 0.85]} />
        <meshStandardMaterial color={stone} />
      </mesh>
      <mesh position={[0, 3.35, 0.06]}>
        <boxGeometry args={[1.9, 1.6, 0.62]} />
        <meshStandardMaterial color="#6e645b" />
      </mesh>
      {/* the firebox, and the hearthstone it spills onto */}
      <mesh position={[0, 1.1, -0.12]}>
        <boxGeometry args={[1.6, 2.2, 0.5]} />
        <meshStandardMaterial color={dark} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.04, 0.62]} receiveShadow>
        <planeGeometry args={[2.6, 1.1]} />
        <meshStandardMaterial color="#8a7d70" />
      </mesh>
      {/* logs, and the flame over them */}
      {[-0.32, 0.02, 0.34].map((ox, i) => (
        <mesh
          key={ox}
          position={[ox, 0.16, 0.06]}
          rotation-z={Math.PI / 2}
          rotation-x={i * 0.5}
          castShadow
        >
          <cylinderGeometry args={[0.11, 0.11, 1.1, 6]} />
          <meshStandardMaterial color="#4a3524" />
        </mesh>
      ))}
      <group ref={flame} position={[0, 0.3, 0.06]}>
        <mesh>
          <coneGeometry args={[0.42, 0.95, 7]} />
          <meshStandardMaterial
            color="#ff9b3d"
            emissive="#ff7a1a"
            emissiveIntensity={2.4}
            transparent
            opacity={0.92}
          />
        </mesh>
        <mesh position={[0, 0.12, 0]}>
          <coneGeometry args={[0.22, 0.7, 6]} />
          <meshStandardMaterial
            color="#ffe08a"
            emissive="#ffd166"
            emissiveIntensity={3}
          />
        </mesh>
      </group>
      <pointLight
        ref={light}
        position={[0, 0.75, 0.55]}
        color="#ff9a4d"
        intensity={26}
        distance={16}
        decay={2}
        castShadow={false}
      />
    </group>
  );
}

/**
 * A window with actual daylight behind it, which is what separates this room
 * from the other three: they are lit by fire through arrow slits at night.
 */
function Daylight({
  angle,
  radius,
  night,
}: {
  angle: number;
  radius: number;
  /** A cottage with blazing daylight windows at 2am reads as a mistake. */
  night: number;
}) {
  const [x, z] = ring(angle, radius);
  const [lx, lz] = ring(angle, radius - 1.6);
  const frame = "#6d5138";
  const pane = night > 0.6 ? "#2c3c5c" : night > 0.25 ? "#a8bcd8" : "#f4f7ff";
  const glow = night > 0.6 ? "#41598c" : night > 0.25 ? "#c3d4ea" : "#dceaff";
  return (
    <group>
      <group position={[x, 2.25, z]} rotation-y={rad(angle) + Math.PI} scale={0.78}>
        {/* the opening, blown out to daylight */}
        <mesh>
          <planeGeometry args={[1.5, 1.9]} />
          <meshStandardMaterial
            color={pane}
            emissive={glow}
            emissiveIntensity={1.5 - night * 0.75}
          />
        </mesh>
        {/* frame and mullions, so it reads as a window and not a hole */}
        <mesh position={[0, 0, 0.04]}>
          <boxGeometry args={[1.68, 0.12, 0.12]} />
          <meshStandardMaterial color={frame} />
        </mesh>
        <mesh position={[0, 0, 0.04]}>
          <boxGeometry args={[0.1, 2.04, 0.12]} />
          <meshStandardMaterial color={frame} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={`v${side}`} position={[(side * 1.66) / 2, 0, 0.04]}>
            <boxGeometry args={[0.14, 2.04, 0.14]} />
            <meshStandardMaterial color={frame} />
          </mesh>
        ))}
        {[-1, 1].map((side) => (
          <mesh key={`h${side}`} position={[0, (side * 2.02) / 2, 0.04]}>
            <boxGeometry args={[1.8, 0.14, 0.14]} />
            <meshStandardMaterial color={frame} />
          </mesh>
        ))}
        {/* a sill, with the daylight catching it */}
        <mesh position={[0, -1.08, 0.16]} castShadow>
          <boxGeometry args={[1.9, 0.12, 0.42]} />
          <meshStandardMaterial color={frame} />
        </mesh>
      </group>
      {/* the light itself, standing inside the room from the opening */}
      <pointLight
        position={[lx, 2.6, lz]}
        color={night > 0.6 ? "#93aee0" : "#e8f0ff"}
        intensity={20 - night * 11}
        distance={15}
        decay={2}
      />
    </group>
  );
}

/** Asleep, and breathing. It does nothing else, which is the point of it. */
function Cat({ angle, radius, rotOffset = 0 }: { angle: number; radius: number; rotOffset?: number }) {
  const body = useRef<Group>(null);
  const [x, z] = ring(angle, radius);
  useFrame((state) => {
    if (!body.current) return;
    const breath = 1 + Math.sin(state.clock.elapsedTime * 1.15) * 0.035;
    body.current.scale.set(1, breath, 1);
  });
  const fur = "#5b5049";
  const paler = "#776a60";
  return (
    <group position={[x, 0, z]} rotation-y={rad(angle) + Math.PI + rad(rotOffset)}>
      <group ref={body}>
        {/* curled up: a flattened ball, a head tucked against it, a tail round */}
        <mesh position={[0, 0.19, 0]} scale={[1, 0.62, 0.82]} castShadow>
          <sphereGeometry args={[0.32, 14, 12]} />
          <meshStandardMaterial color={fur} />
        </mesh>
        <mesh position={[0.2, 0.19, 0.19]} castShadow>
          <sphereGeometry args={[0.17, 14, 12]} />
          <meshStandardMaterial color={fur} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh
            key={side}
            position={[0.24 + side * 0.02, 0.32, 0.19 + side * 0.1]}
            rotation-x={-0.3}
            castShadow
          >
            <coneGeometry args={[0.06, 0.12, 5]} />
            <meshStandardMaterial color={paler} />
          </mesh>
        ))}
        <mesh position={[-0.2, 0.11, 0.24]} rotation-x={Math.PI / 2} castShadow>
          <torusGeometry args={[0.19, 0.055, 6, 14, Math.PI * 1.35]} />
          <meshStandardMaterial color={paler} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * The laptop, built rather than modelled because no medieval pack ships one,
 * and it is the whole point of the desk: the machine the story happened on.
 */
function Laptop({ angle, radius, y = 0 }: { angle: number; radius: number; y?: number }) {
  const [x, z] = ring(angle, radius);
  const shell = "#2b2f36";
  return (
    <group position={[x, y, z]} rotation-y={rad(angle) + Math.PI} scale={1.75}>
      <mesh position={[0, 0.014, 0]} castShadow>
        <boxGeometry args={[0.44, 0.028, 0.3]} />
        <meshStandardMaterial color={shell} />
      </mesh>
      {/* the keyboard well, and a trackpad, so the shape is not just a slab */}
      <mesh position={[0, 0.03, -0.02]}>
        <boxGeometry args={[0.38, 0.006, 0.16]} />
        <meshStandardMaterial color="#1d2026" />
      </mesh>
      <mesh position={[0, 0.03, 0.1]}>
        <boxGeometry args={[0.14, 0.006, 0.09]} />
        <meshStandardMaterial color="#22262c" />
      </mesh>
      {/* the lid, open, with the screen alight */}
      <group position={[0, 0.028, -0.15]} rotation-x={-0.32}>
        <mesh position={[0, 0.15, 0]} castShadow>
          <boxGeometry args={[0.44, 0.3, 0.016]} />
          <meshStandardMaterial color={shell} />
        </mesh>
        <mesh position={[0, 0.15, 0.011]}>
          <planeGeometry args={[0.39, 0.25]} />
          <meshStandardMaterial
            color="#9fd0ff"
            emissive="#5f9de0"
            emissiveIntensity={1.4}
          />
        </mesh>
      </group>
      <pointLight
        position={[0, 0.4, -0.1]}
        color="#9ec9ff"
        intensity={1.6}
        distance={2.2}
        decay={2}
      />
    </group>
  );
}

/** The scrying orb: what the monitoring stack sees, if it could be held. */
function Orb({ angle, radius, y = 0 }: { angle: number; radius: number; y?: number }) {
  const glow = useRef<Mesh>(null);
  const light = useRef<PointLight>(null);
  const [x, z] = ring(angle, radius);
  useFrame((state) => {
    const pulse = 0.5 + Math.sin(state.clock.elapsedTime * 1.6) * 0.5;
    if (light.current) light.current.intensity = 5 + pulse * 3.5;
    if (glow.current) {
      const mat = glow.current.material as MeshStandardMaterial;
      mat.emissiveIntensity = 1.5 + pulse * 0.9;
    }
  });
  return (
    <group position={[x, y, z]} rotation-y={rad(angle) + Math.PI}>
      {/* a turned stand, three feet and a collar */}
      <mesh position={[0, 0.05, 0]} castShadow>
        <cylinderGeometry args={[0.17, 0.21, 0.1, 12]} />
        <meshStandardMaterial color="#4a3524" />
      </mesh>
      <mesh position={[0, 0.13, 0]}>
        <torusGeometry args={[0.14, 0.03, 6, 14]} />
        <meshStandardMaterial color="#8a6a3a" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh ref={glow} position={[0, 0.3, 0]} castShadow>
        <sphereGeometry args={[0.2, 20, 16]} />
        <meshStandardMaterial
          color="#8fd8ff"
          emissive="#3fa9e0"
          emissiveIntensity={1.8}
          transparent
          opacity={0.86}
          roughness={0.1}
        />
      </mesh>
      <pointLight
        ref={light}
        position={[0, 0.32, 0]}
        color="#7fd0ff"
        intensity={6}
        distance={4.5}
        decay={2}
      />
    </group>
  );
}

/** The picture inside the frame, unlit so the room's dimness cannot blur it. */
function FramePhoto({ url }: { url: string }) {
  const texture = useTexture(url, (tex) => {
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = 8;
  });
  // pictureframe_large_A's opening is ~0.84 x 1.04 of its 1.0 x 1.2 face, and
  // its own blank canvas sits deep in the box: the photo goes just in front of
  // it, still behind the border's outer edge at 0.20.
  return (
    <mesh position={[0, 0, 0.185]}>
      <planeGeometry args={[0.84, 1.04]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

/**
 * The grimoire: the book still being written, floating open over a pedestal.
 * It is the whole point of the room named after it, so the flagship project is
 * read from it rather than from a frame on the wall.
 */
function Grimoire({ angle, radius }: { angle: number; radius: number }) {
  const book = useRef<Group>(null);
  const light = useRef<PointLight>(null);
  const [x, z] = ring(angle, radius);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    if (book.current) {
      book.current.position.y = 1.75 + Math.sin(time * 0.9) * 0.09;
      book.current.rotation.y = rad(angle) + Math.PI + Math.sin(time * 0.45) * 0.18;
    }
    if (light.current) light.current.intensity = 7 + Math.sin(time * 2.3) * 1.4;
  });

  const cover = "#5a2f22";
  const pages = "#efe3c2";
  return (
    <group position={[x, 0, z]}>
      {/* the pedestal, and the rune ring it stands in */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.42, 1.1, 10]} />
        <meshStandardMaterial color="#5d5347" />
      </mesh>
      <mesh position={[0, 1.12, 0]} castShadow>
        <cylinderGeometry args={[0.42, 0.32, 0.14, 10]} />
        <meshStandardMaterial color="#6b6154" />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.04, 0]}>
        <ringGeometry args={[0.85, 1.05, 40]} />
        <meshStandardMaterial
          color="#ffb15e"
          emissive="#ff9d3d"
          emissiveIntensity={1.3}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* the book itself: two halves open in a shallow V, pages on each */}
      <group ref={book} position={[0, 1.75, 0]}>
        {[-1, 1].map((side) => (
          <group key={side} rotation-z={side * 0.22}>
            <mesh position={[side * 0.42, 0, 0]} castShadow>
              <boxGeometry args={[0.84, 0.06, 1.06]} />
              <meshStandardMaterial color={cover} />
            </mesh>
            <mesh position={[side * 0.4, 0.055, 0]}>
              <boxGeometry args={[0.72, 0.05, 0.94]} />
              <meshStandardMaterial
                color={pages}
                emissive="#ffdf9e"
                emissiveIntensity={0.55}
              />
            </mesh>
          </group>
        ))}
        {/* the spine, closing the V */}
        <mesh position={[0, -0.09, 0]} castShadow>
          <boxGeometry args={[0.2, 0.08, 1.06]} />
          <meshStandardMaterial color={cover} />
        </mesh>
      </group>

      <pointLight
        ref={light}
        position={[0, 2.1, 0]}
        color="#ffc37a"
        intensity={7}
        distance={7}
        decay={2}
      />
    </group>
  );
}

/**
 * One thing in the cottage: the seat, the laptop, the journal, the orb, the
 * frame, the hearth, a window, the cat. The ones with a subject carry a label
 * you can click, and the seat is where the wizard actually sits down.
 */
function Fixture({
  fixture,
  lang,
  night,
  onOpen,
}: {
  fixture: InteriorFixture;
  lang: Lang;
  night: number;
  onOpen: () => void;
}) {
  const [x, z] = ring(fixture.angle, fixture.radius);
  const facing = rad(fixture.angle) + Math.PI + rad(fixture.rotOffset ?? 0);
  const detail = fixture.subject?.startsWith("story:")
    ? findCottageObject(fixture.subject.slice(6))
    : undefined;
  const label = fixture.subject
    ? (detail?.title[lang] ?? boardLabel(fixture.subject, lang))
    : "";

  const body = (() => {
    switch (fixture.kind) {
      case "hearth":
        return <Hearth angle={fixture.angle} radius={fixture.radius} />;
      case "window":
        return <Daylight angle={fixture.angle} radius={fixture.radius} night={night} />;
      case "cat":
        return (
          <Cat angle={fixture.angle} radius={fixture.radius} rotOffset={fixture.rotOffset} />
        );
      case "laptop":
        return <Laptop angle={fixture.angle} radius={fixture.radius} y={fixture.y} />;
      case "orb":
        return <Orb angle={fixture.angle} radius={fixture.radius} y={fixture.y} />;
      case "sofa":
        return (
          <group position={[x, 0, z]} rotation-y={facing}>
            <Model path={COUCH_MODEL} />
          </group>
        );
      case "frame":
        return (
          <group position={[x, fixture.y ?? 2.4, z]} rotation-y={facing} scale={1.5}>
            <Model path={COTTAGE_FRAME} />
            {FRAME_PHOTO && <FramePhoto url={FRAME_PHOTO} />}
          </group>
        );
      case "journal":
        return (
          <group position={[x, fixture.y ?? 0, z]} rotation-y={facing + 0.4} scale={1.2}>
            <Model path={JOURNAL_MODEL} />
          </group>
        );
      case "grimoire":
        return <Grimoire angle={fixture.angle} radius={fixture.radius} />;
    }
  })();

  if (!fixture.subject) return body;

  // Heights chosen so neighbours do not stack: the couch and the low table in
  // front of it are only three units apart and project almost on top of one
  // another from the diorama camera.
  const labelY =
    fixture.kind === "frame"
      ? (fixture.y ?? 2.4) + 1
      : fixture.kind === "grimoire"
        ? 2.75
        : fixture.kind === "sofa"
          ? 2.15
        : fixture.kind === "orb"
          ? (fixture.y ?? 0) + 0.95
          : (fixture.y ?? 0) + 1.35;

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "auto")}
    >
      {body}
      <Html position={[x, labelY, z]} center zIndexRange={[5, 0]}>
        <button
          type="button"
          onClick={onOpen}
          className="pointer-events-auto cursor-pointer whitespace-nowrap rounded-full border border-white/25 bg-black/55 px-3 py-1 text-xs font-semibold text-[#f0e7d6] backdrop-blur-sm transition-colors hover:bg-black/80"
        >
          {label}
        </button>
      </Html>
    </group>
  );
}

const TECH_TIER_COLORS = [
  "#e0a44e",
  "#8fd8ff",
  "#b7e08a",
  "#e08a9b",
  "#c9a3e8",
  "#8ae0cf",
  "#e0c98a",
  "#9bb1e8",
  "#e88a5f",
  "#a3e89b",
];

function techLogoTexture(icon: string): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  const img = new Image();
  img.onload = () => {
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, 128, 128);
    ctx.drawImage(img, 8, 8, 112, 112);
    tex.needsUpdate = true;
  };
  img.src = `/tech/${icon}.svg`;
  return tex;
}

function techLabelTexture(text: string): { tex: CanvasTexture; aspect: number } {
  const font = "600 44px system-ui, -apple-system, sans-serif";
  const probe = document.createElement("canvas").getContext("2d")!;
  probe.font = font;
  const w = Math.ceil(probe.measureText(text).width) + 36;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = 76;
  const ctx = canvas.getContext("2d")!;
  ctx.font = font;
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.9)";
  ctx.shadowBlur = 10;
  ctx.fillStyle = "#ece9dd";
  ctx.fillText(text, 18, 40);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  return { tex, aspect: w / 76 };
}

/**
 * The skill procession over the Guild Hall: every technology orbiting slowly
 * in the void above the open room, its name under it. Two counter-rotating
 * rings, because the sliver of sky the diorama camera sees is only a few
 * degrees tall: stacking rows there collided with the site's own header, so
 * the skills parade through the visible arc instead of all standing in it.
 * Labels are canvas sprites rather than DOM: fifty drei Html elements would
 * each reproject every frame, and a sprite costs nothing once built.
 */
function TechConstellation({ wallTop }: { wallTop: number }) {
  const rings = [useRef<Group>(null), useRef<Group>(null)];

  const items = useMemo(() => {
    const cats = [...new Set(allTech.map((t) => t.category))];
    return allTech.map((t, i) => {
      const ring2 = i % 2 === 1;
      const slot = Math.floor(i / 2);
      const count = Math.ceil(allTech.length / 2);
      const angle = (360 / count) * slot + (ring2 ? 360 / count / 2 : 0);
      const radius = ring2 ? 13.5 : 11.5;
      const [x, z] = ring(angle, radius);
      const baseAngle = rad(angle);
      const { tex, aspect } = techLabelTexture(t.name);
      return {
        key: t.name,
        logo: t.icon ? techLogoTexture(t.icon) : null,
        ringIndex: ring2 ? 1 : 0,
        x,
        z,
        y: (ring2 ? wallTop + 0.85 : wallTop + 0.5) + (slot % 2) * 0.22,
        color: TECH_TIER_COLORS[cats.indexOf(t.category) % TECH_TIER_COLORS.length],
        tex,
        aspect,
        baseAngle,
        phase: i * 0.61,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallTop]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    // Opposite directions, slightly different speeds: neighbours drift apart.
    if (rings[0].current) rings[0].current.rotation.y = time * 0.045;
    if (rings[1].current) rings[1].current.rotation.y = -time * 0.034;
    for (const ref of rings) {
      const g = ref.current;
      if (!g) continue;
      for (let i = 0; i < g.children.length; i++) {
        const child = g.children[i];
        child.position.y = child.userData.baseY + Math.sin(time * 0.7 + i) * 0.08;
        const head = child.children[0] as Mesh | Sprite;
        if ((head as Mesh).isMesh) head.rotation.y = time * 0.4 + i;
        // A full ring has a near side, and the near side marches through the
        // middle of the tavern at billboard size. Fade anything that swings
        // out of the back arc, so the parade only exists behind the room.
        const world = child.userData.baseAngle + g.rotation.y;
        const towardBack = Math.cos(world);
        const fade = Math.max(0, Math.min(1, (towardBack + 0.05) / 0.35));
        child.visible = fade > 0.01;
        (head.material as MeshStandardMaterial | SpriteMaterial).opacity = fade;
        const label = child.children[1] as Sprite;
        (label.material as SpriteMaterial).opacity = fade;
      }
    }
  });

  return (
    <>
      {[0, 1].map((ringIndex) => (
        <group key={ringIndex} ref={rings[ringIndex]}>
          {items
            .filter((item) => item.ringIndex === ringIndex)
            .map((item) => (
              <group
                key={item.key}
                position={[item.x, item.y, item.z]}
                userData={{ baseY: item.y, baseAngle: item.baseAngle }}
              >
                {item.logo ? (
                  <sprite scale={[0.72, 0.72, 1]}>
                    <spriteMaterial map={item.logo} transparent depthWrite={false} />
                  </sprite>
                ) : (
                  <mesh>
                    <octahedronGeometry args={[0.18]} />
                    <meshStandardMaterial
                      color={item.color}
                      emissive={item.color}
                      emissiveIntensity={0.85}
                      roughness={0.3}
                      transparent
                    />
                  </mesh>
                )}
                <sprite position={[0, -0.62, 0]} scale={[item.aspect * 0.4, 0.4, 1]}>
                  <spriteMaterial map={item.tex} transparent depthWrite={false} />
                </sprite>
              </group>
            ))}
        </group>
      ))}
    </>
  );
}

function InteriorScene({
  lang,
  config,
  floorIndex,
  paused,
  inputRef,
  wizardRef,
  camYawRef,
  onNearTrigger,
  onOpenBoard,
  seated = false,
  night = 0.75,
  onStep,
}: InteriorProps) {
  const dict = t(lang);
  const floor: InteriorFloor = config.floors[floorIndex];
  const isGround = floorIndex === 0;
  const isTop = floorIndex === config.floors.length - 1;
  const wallTop = config.wallHeight;
  // The cottage is meant to read as home rather than as a firelit cellar, so
  // the surfaces, the sky light and the fills all change with it.
  const home = config.mood === "home";
  const skin = home
    ? { floor: "#8a6a45", wall: "#b39b7a", ceiling: "#5f4a35" }
    : { floor: "#6b5540", wall: "#59616e", ceiling: "#3b414c" };

  const ladderAt = ring(config.stairsAngle, config.radius - LADDER_INSET);
  const ladderStand = ring(config.stairsAngle, config.radius - 2.1);
  const hatch = ring(config.hatchAngle, config.radius - 2.4);
  const exit = ring(config.exitAngle, config.radius - 1.4);

  const stage = useMemo<WizardStage>(() => {
    const triggers: WizardTrigger[] = [];
    if (!isTop) triggers.push({ id: "up", x: ladderStand[0], z: ladderStand[1], r: 1.8 });
    if (isGround) {
      triggers.push({ id: "exit", x: exit[0], z: exit[1], r: 1.7 });
    } else {
      triggers.push({ id: "down", x: hatch[0], z: hatch[1], r: 1.7 });
    }
    for (const b of floor.boards) {
      const [bx, bz] = ring(b.angle, config.radius - 2.2);
      triggers.push({ id: `board:${b.subject}`, x: bx, z: bz, r: 2 });
    }
    for (const npc of floor.npcs ?? []) {
      const [nx, nz] = ring(npc.angle, npc.radius);
      triggers.push({ id: `board:npc:${npc.key}`, x: nx, z: nz, r: 2.1 });
    }
    for (const shelf of floor.bookshelves ?? []) {
      const texts = findTopic(shelf.topic)?.texts ?? [];
      const angles = shelfBookAngles(shelf.angle, texts.length);
      texts.forEach((key, i) => {
        const [bx, bz] = ring(angles[i], config.radius - 2.1);
        triggers.push({ id: `board:text:${key}`, x: bx, z: bz, r: 1.6 });
      });
    }
    for (const lectern of floor.lecterns ?? []) {
      const [lx, lz] = ring(lectern.angle, lectern.radius);
      triggers.push({ id: `board:${lectern.subject}`, x: lx, z: lz, r: 2 });
    }
    for (const fixture of floor.fixtures ?? []) {
      if (!fixture.subject) continue;
      // The trigger sits on the object itself with a generous reach, rather
      // than at a guessed spot in front of it. Furniture blocks the wizard from
      // ever standing where the object is, so a point in a walkable gap has to
      // be found by hand and breaks the moment the furniture moves; a radius
      // wide enough to catch him at the object's edge never does.
      const [fx, fz] = ring(fixture.angle, fixture.radius);
      const reach = fixture.kind === "sofa" || fixture.kind === "frame" ? 2.2 : 1.9;
      triggers.push({ id: `board:${fixture.subject}`, x: fx, z: fz, r: reach });
    }
    // Arriving from below you step out of the hatch; on the ground floor you
    // come in through the door.
    const spawnSpot = isGround ? exit : hatch;
    const sofa = (floor.fixtures ?? []).find((f) => f.seat);
    // A little forward of the couch's centre, so he lands on the cushion rather
    // than inside the backrest, and turned to face the room.
    const seatSpot = sofa ? ring(sofa.angle, sofa.radius - 0.28) : null;
    return {
      id: `${config.place}:${floorIndex}`,
      bounds: config.radius - 1.1,
      colliders: floorColliders(config, floor),
      triggers,
      spawn: [spawnSpot[0] * 0.5, 0, spawnSpot[1] * 0.5],
      spawnRotY: Math.atan2(-spawnSpot[0], -spawnSpot[1]),
      seat:
        sofa && seatSpot
          ? {
              spot: [seatSpot[0], COUCH_SEAT - 0.42, seatSpot[1]],
              rotY: rad(sofa.angle) + Math.PI,
            }
          : undefined,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, floorIndex]);

  return (
    <>
      <color attach="background" args={[home ? "#141013" : "#0d1014"]} />
      <hemisphereLight
        args={home ? ["#e7d7bb", "#6b4f34", 0.95] : ["#7f8fae", "#3a3026", 0.7]}
      />
      {/* The room's own light, tinted to this floor's mood. */}
      <pointLight
        position={[0, wallTop - 1.4, 0]}
        color={floor.accent}
        intensity={home ? 20 : 38}
        distance={26}
        decay={2}
      />
      <pointLight
        position={[ladderAt[0] * 0.7, wallTop - 0.6, ladderAt[1] * 0.7]}
        color="#ffd9a0"
        intensity={12}
        distance={14}
        decay={2}
      />
      {/* A fill on the entrance side, which the room's own light barely reaches. */}
      <pointLight
        position={[exit[0] * 0.75, 4.2, exit[1] * 0.75]}
        color={home ? "#ffdcb4" : "#ffcf9c"}
        intensity={home ? 9 : 16}
        distance={16}
        decay={2}
      />
      {/* And one on each flank: anything against the side walls sits outside the
          reach of the middle light and reads as a black slab without these. */}
      {(home ? [200] : [90, 270]).map((a) => {
        const [fx, fz] = ring(a, config.radius * 0.62);
        return (
          <pointLight
            key={`fill-${a}`}
            position={[fx, 3.6, fz]}
            color={home ? "#ffe2bd" : "#ffdcb0"}
            intensity={home ? 8 : 13}
            distance={14}
            decay={2}
          />
        );
      })}

      {/* Floor, wall and ceiling. The wall is a cylinder seen from the inside. */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[config.radius, 48]} />
        <meshStandardMaterial color={skin.floor} />
      </mesh>
      <mesh position={[0, wallTop / 2, 0]}>
        <cylinderGeometry args={[config.radius, config.radius, wallTop, 48, 1, true]} />
        <meshStandardMaterial color={skin.wall} side={BackSide} />
      </mesh>
      <mesh rotation-x={Math.PI / 2} position={[0, wallTop, 0]}>
        <circleGeometry args={[config.radius, 48]} />
        <meshStandardMaterial color={skin.ceiling} />
      </mesh>
      {/* The way up, as an opening cut in the ceiling above the ladder. */}
      {!isTop && (
        <mesh
          rotation-x={Math.PI / 2}
          position={[ladderAt[0] * 0.82, wallTop - 0.02, ladderAt[1] * 0.82]}
        >
          <circleGeometry args={[1.6, 24]} />
          <meshBasicMaterial color="#08090b" />
        </mesh>
      )}

      {/* Night through the arrow slits. The cottage gets real windows instead. */}
      {(home ? [] : [36, 144, 252, 324]).map((a) => {
        const [wx, wz] = ring(a, config.radius - 0.06);
        return (
          <mesh
            key={`win-${a}`}
            position={[wx, 3.6, wz]}
            rotation-y={rad(a) + Math.PI}
          >
            <planeGeometry args={[0.5, 1.5]} />
            <meshStandardMaterial
              color={night > 0.5 ? "#2b3a55" : "#c9d8ee"}
              emissive={night > 0.5 ? "#3f5f8f" : "#cfe0f6"}
              emissiveIntensity={night > 0.5 ? 0.7 : 1.15}
            />
          </mesh>
        );
      })}

      {/* No ladder on the top floor: there is nothing above it to reach. */}
      {!isTop && (
        <Ladder angle={config.stairsAngle} radius={config.radius - LADDER_INSET} top={wallTop} />
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

      {floor.boards.map((b) => (
        <Board
          key={b.subject}
          angle={b.angle}
          radius={config.radius - 0.1}
          label={boardLabel(b.subject, lang)}
          onOpen={() => onOpenBoard(b.subject)}
        />
      ))}

      {(floor.bookshelves ?? []).map((shelf) => (
        <Bookcase
          key={shelf.topic}
          angle={shelf.angle}
          radius={config.radius}
          topicKey={shelf.topic}
          lang={lang}
          onOpenText={(key) => onOpenBoard(`text:${key}`)}
        />
      ))}

      {(floor.lecterns ?? []).map((lectern) => (
        <Lectern
          key={lectern.subject}
          angle={lectern.angle}
          radius={lectern.radius}
          subject={lectern.subject}
          lang={lang}
          onOpen={() => onOpenBoard(lectern.subject)}
        />
      ))}

      {floor.key === "tavern" && <TechConstellation wallTop={wallTop} />}

      {(floor.fixtures ?? []).map((fixture, i) => (
        <Fixture
          key={`fix-${fixture.kind}-${i}`}
          fixture={fixture}
          lang={lang}
          night={night}
          onOpen={() => fixture.subject && onOpenBoard(fixture.subject)}
        />
      ))}

      {(floor.npcs ?? []).map((npc) => (
        <Trophy
          key={`trophy-${npc.key}`}
          angle={npc.angle}
          radius={config.radius - 0.15}
          tier={npc.tier}
        />
      ))}

      {(floor.npcs ?? []).map((npc) => (
        <Npc
          key={npc.key}
          npc={npc}
          lang={lang}
          onTalk={() => onOpenBoard(`npc:${npc.key}`)}
        />
      ))}

      <Suspense fallback={null}>
        <Wizard
          seated={seated}
          onStep={onStep}
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

/**
 * Memoised on purpose. Walking in and out of a trigger radius sets state up in
 * ValeApp, and without this every prop in the room would be cloned again on each
 * of those renders, which showed up as a stutter while walking.
 */
export const Interior = memo(InteriorScene);

