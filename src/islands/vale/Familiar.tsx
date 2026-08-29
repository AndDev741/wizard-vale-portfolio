import { useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, Mesh } from "three";

/**
 * The cat, once she has decided about you.
 *
 * She sleeps by the fire in the Cottage until somebody pets her, and after that
 * she comes along. The deed that records the petting is kept in the browser, so
 * she remembers you between visits, which is about right for a cat.
 *
 * Built rather than modelled, like the sleeping one: none of the packs ship an
 * animal. Same fur, same low count of faces, and the walk is four legs swinging
 * from their tops with a tail that lags behind the turn.
 */

/**
 * Where she settles: a little behind, and off to one side. Directly behind is
 * where the camera also is, so a cat that trails him perfectly is a cat you
 * never see. Off the shoulder she is in frame and still out of the way.
 */
const TRAIL = 0.85;
const BESIDE = 0.72;
/** A shade larger than a cat really is, or she reads as a rock at this scale. */
const SIZE = 1.2;
/**
 * Where the head rests. It is a constant because the breathing wobble adds to
 * it: writing the wobble straight into position.y REPLACES this, which buried
 * her head at ground level under her own body and made her look, accurately
 * enough, like a cat that had been put on upside down.
 */
const HEAD_Y = 0.41;
/** She gives up chasing past this and is simply already there. */
const JUMP = 7;
/** Below this gap she stops walking and sits down. */
const REST = 0.24;

/** A touch lighter than the sleeping one: out here the ground is dark too. */
const FUR = "#6b5f56";
const PALER = "#8b7d71";
/** Feet and chest, so her shape breaks up instead of reading as one lump. */
const SOCK = "#b8ada0";

export function Familiar({
  wizardRef,
  /** Changes when the room does, so she arrives with you instead of walking in. */
  stageId,
  onPet,
}: {
  wizardRef: RefObject<Group | null>;
  stageId: string;
  /** She is the thing you pet, wherever she happens to be standing. */
  onPet?: () => void;
}) {
  const root = useRef<Group>(null);
  const legs = useRef<(Mesh | null)[]>([]);
  const tail = useRef<Group>(null);
  const head = useRef<Group>(null);
  const at = useRef<{ x: number; z: number; r: number } | null>(null);
  const arrivedIn = useRef<string>("");
  /** Smoothed so a single fast frame does not make her sprint. */
  const pace = useRef(0);

  useFrame((state, delta) => {
    const g = root.current;
    const wizard = wizardRef.current;
    if (!g || !wizard) return;

    // Behind and off his right shoulder.
    const facing = wizard.rotation.y;
    const fx = Math.sin(facing);
    const fz = Math.cos(facing);
    const wantX = wizard.position.x - fx * TRAIL + fz * BESIDE;
    const wantZ = wizard.position.z - fz * TRAIL - fx * BESIDE;

    if (!at.current || arrivedIn.current !== stageId) {
      // A new room is not a walk across the vale: she is just there already.
      at.current = { x: wantX, z: wantZ, r: facing };
      arrivedIn.current = stageId;
    }
    const a = at.current;

    const gap = Math.hypot(wantX - a.x, wantZ - a.z);
    if (gap > JUMP) {
      a.x = wantX;
      a.z = wantZ;
    } else if (gap > REST) {
      // Faster the further behind she is, which is how a cat catches up:
      // unhurried until it is actually losing you.
      const speed = Math.min(1, delta * (2.2 + gap * 1.6));
      a.x += (wantX - a.x) * speed;
      a.z += (wantZ - a.z) * speed;
      // She looks where she is going.
      const heading = Math.atan2(wantX - a.x, wantZ - a.z);
      const turn = ((heading - a.r + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      a.r += turn * Math.min(1, delta * 6);
    } else {
      // Caught up: she turns and looks at him, the way a cat does when it stops.
      // Facing the same way he does would mean the camera, which sits behind
      // him, only ever saw the back of her head, which is to say a lump.
      const toHim = Math.atan2(
        wizard.position.x - a.x,
        wizard.position.z - a.z,
      );
      const turn = ((toHim - a.r + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      a.r += turn * Math.min(1, delta * 3);
    }

    g.position.set(a.x, 0, a.z);
    g.rotation.y = a.r;

    // Walking is the gap, smoothed: she should not flicker between gaits when
    // he shuffles a step.
    const want = gap > REST ? Math.min(1, gap / 1.2) : 0;
    pace.current += (want - pace.current) * Math.min(1, delta * 5);
    const walking = pace.current;

    const t = state.clock.elapsedTime;
    const swing = Math.sin(t * 9) * 0.5 * walking;
    legs.current.forEach((leg, i) => {
      if (!leg) return;
      // Diagonal pairs, the way a cat actually walks.
      const phase = i === 0 || i === 3 ? swing : -swing;
      leg.rotation.x = phase;
    });
    if (tail.current) {
      // Near vertical, tipping a little forward as she picks up. A cat walking
      // carries its tail up, and it is the line that says cat from behind,
      // which is the angle you see her from most.
      tail.current.rotation.z = Math.sin(t * 3.2) * (0.1 + walking * 0.2);
      tail.current.rotation.x = -0.12 - walking * 0.22;
    }
    if (head.current) {
      head.current.position.y = HEAD_Y + 0.02 * Math.sin(t * 2.1) * (1 - walking);
    }
    // A small bob, so she is not a rigid model sliding along.
    g.position.y = walking * Math.abs(Math.sin(t * 9)) * 0.03 * SIZE;
  });

  return (
    <group
      ref={root}
      scale={SIZE}
      onClick={(e) => {
        e.stopPropagation();
        onPet?.();
      }}
      onPointerOver={() => onPet && (document.body.style.cursor = "pointer")}
      onPointerOut={() => onPet && (document.body.style.cursor = "auto")}
    >
      {/* Body: long and low. Everything else is measured off its front and back
          edges, at z +/- 0.31, because the first attempt put the head inside it
          and from behind she was a loaf with a pole in it. */}
      <mesh position={[0, 0.29, 0]} scale={[0.72, 0.6, 1.3]} castShadow>
        <sphereGeometry args={[0.24, 14, 12]} />
        <meshStandardMaterial color={FUR} />
      </mesh>
      {/* Chest, at the front underside where it shows from the side. */}
      <mesh position={[0, 0.22, 0.24]} scale={[0.62, 0.7, 0.62]}>
        <sphereGeometry args={[0.16, 10, 8]} />
        <meshStandardMaterial color={SOCK} />
      </mesh>
      {/* Head, well clear of the body: it sits forward of the front edge, on a
          short neck, which is what makes her read as an animal and not a lump. */}
      <group ref={head} position={[0, HEAD_Y, 0.33]}>
        <mesh castShadow>
          <sphereGeometry args={[0.145, 14, 12]} />
          <meshStandardMaterial color={FUR} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.075, 0.13, -0.01]} rotation-x={-0.15} castShadow>
            <coneGeometry args={[0.05, 0.12, 5]} />
            <meshStandardMaterial color={PALER} />
          </mesh>
        ))}
        {/* muzzle */}
        <mesh position={[0, -0.04, 0.11]} scale={[1, 0.8, 1]}>
          <sphereGeometry args={[0.07, 10, 8]} />
          <meshStandardMaterial color={SOCK} />
        </mesh>
      </group>
      {/* Neck: short. It only has to close the gap between the body's front
          edge and the back of the head, and any more than that reads as a
          creature with a giraffe's problem. */}
      <mesh position={[0, 0.37, 0.25]} rotation-x={0.45} castShadow>
        <capsuleGeometry args={[0.092, 0.04, 3, 8]} />
        <meshStandardMaterial color={FUR} />
      </mesh>
      {/* Four legs, hanging from their tops so the swing reads as a stride. */}
      {[
        [-0.12, 0.21],
        [0.12, 0.21],
        [-0.12, -0.19],
        [0.12, -0.19],
      ].map(([lx, lz], i) => (
        <group key={i} position={[lx, 0.26, lz]}>
          <mesh
            ref={(m) => {
              legs.current[i] = m;
            }}
            position={[0, -0.1, 0]}
            castShadow
          >
            <capsuleGeometry args={[0.036, 0.15, 3, 6]} />
            <meshStandardMaterial color={FUR} />
          </mesh>
          <mesh position={[0, -0.2, 0.01]} castShadow>
            <sphereGeometry args={[0.045, 8, 6]} />
            <meshStandardMaterial color={SOCK} />
          </mesh>
        </group>
      ))}
      {/* Tail, from the rump and up. Thin: at any real size a thick one stops
          being a tail and becomes a mast. */}
      <group ref={tail} position={[0, 0.36, -0.31]}>
        <mesh position={[0, 0.16, 0]} castShadow>
          <capsuleGeometry args={[0.026, 0.3, 3, 6]} />
          <meshStandardMaterial color={PALER} />
        </mesh>
        <mesh position={[0, 0.33, 0]} castShadow>
          <sphereGeometry args={[0.036, 8, 6]} />
          <meshStandardMaterial color={SOCK} />
        </mesh>
      </group>
    </group>
  );
}
