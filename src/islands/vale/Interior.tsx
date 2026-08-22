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
import { Html, useAnimations, useGLTF } from "@react-three/drei";
import { BackSide, DoubleSide, type Group, type Mesh } from "three";
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
  type InteriorNpc,
  type InteriorProp,
} from "./interiors";

const LADDER_RUNG_GAP = 0.46;
const TORCH_MODEL = "/models/dg_torch_mounted.glb";
const BANNER_MODEL = "/models/dg_banner_patternA_blue.glb";
const FRAME_MODEL = "/models/pictureframe_large_B.gltf";

// Every model any interior can ask for, warmed before anyone walks in.
for (const config of Object.values(interiors)) {
  if (!config) continue;
  for (const m of interiorModels(config)) {
    useGLTF.preload(m.startsWith("dg_") ? `/models/${m}.glb` : `/models/${m}.gltf`);
  }
}
useGLTF.preload(FRAME_MODEL);
for (const model of ["Knight", "Barbarian", "Rogue"]) {
  useGLTF.preload(`/models/${model}.glb`);
}

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
      <Html position={[0, 2.6, 0]} center zIndexRange={[5, 0]}>
        <button
          type="button"
          onClick={onTalk}
          className="pointer-events-auto cursor-pointer whitespace-nowrap rounded-full border border-white/25 bg-black/55 px-3 py-1 text-xs font-semibold text-[#ece9dd] backdrop-blur-sm transition-colors hover:bg-black/80"
        >
          {detail?.name[lang] ?? npc.key}
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
  const SHELF_Y = 1.18;

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
      <mesh position={[0, SHELF_Y - 0.06, 0]} castShadow>
        <boxGeometry args={[W - 0.1, 0.08, D - 0.08]} />
        <meshStandardMaterial color={boardWood} />
      </mesh>
      {/* a little decoration on top, so the case reads lived-in */}
      <group position={[-0.55, H + 0.06, 0]} rotation-y={0.4} scale={0.85}>
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
          <group key={key} position={[bx, SHELF_Y, 0.06]}>
            <group
              rotation-y={-0.25 + i * 0.5}
              scale={1.15}
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
      <mesh position={[0, 1.16, 0]} rotation-x={-0.35} castShadow>
        <boxGeometry args={[0.85, 0.06, 0.6]} />
        <meshStandardMaterial color="#5b4229" />
      </mesh>
      <group position={[0, 1.26, 0]} rotation-x={-0.35} scale={1.1}>
        <Model path="/models/book_set.gltf" />
      </group>
      <Html position={[0, 1.95, 0]} center zIndexRange={[5, 0]}>
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
}: InteriorProps) {
  const dict = t(lang);
  const floor: InteriorFloor = config.floors[floorIndex];
  const isGround = floorIndex === 0;
  const isTop = floorIndex === config.floors.length - 1;
  const wallTop = config.wallHeight;

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
        position={[ladderAt[0] * 0.7, wallTop - 0.6, ladderAt[1] * 0.7]}
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
      {/* And one on each flank: anything against the side walls sits outside the
          reach of the middle light and reads as a black slab without these. */}
      {[90, 270].map((a) => {
        const [fx, fz] = ring(a, config.radius * 0.62);
        return (
          <pointLight
            key={`fill-${a}`}
            position={[fx, 3.6, fz]}
            color="#ffdcb0"
            intensity={13}
            distance={14}
            decay={2}
          />
        );
      })}

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

