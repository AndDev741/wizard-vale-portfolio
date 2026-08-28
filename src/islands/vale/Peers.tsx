import { memo, useEffect, useMemo, useRef, useState, type MutableRefObject, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, useAnimations, useGLTF } from "@react-three/drei";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { CanvasTexture, Mesh, MeshStandardMaterial, type Group, type Texture } from "three";
import { t, type Lang } from "../../i18n/ui";
import { lookAccent, lookColor } from "./look";
import type { InputVec } from "./useInput";
import type { Peer, PeerAction, Presence } from "./presence";

/**
 * The other people in the vale.
 *
 * A peer's position is not React state. Arrivals and departures are, because
 * they change what exists; everything else is a number this reads once a frame
 * and eases toward, which is also what hides the gap between updates: the
 * server sends about five a second and the walk looks continuous anyway.
 */

/** How quickly a peer catches up to where the server says they are. */
const EASE = 7;
/** Past this they are treated as having teleported, and simply appear there. */
const JUMP = 6;

/** One tinted material per colour, shared by everyone wearing it. */
const materials = new Map<string, MeshStandardMaterial>();
/** The atlas with its own colours taken out. Built once, worn by everyone. */
let plainMap: Texture | null | undefined;

/**
 * The character is one mesh with one baked texture, so a tint cannot pick out
 * the robe. Worse, a tint MULTIPLIES: green over the mage's purple cloth comes
 * out grey, which is how the first attempt read. So the atlas is redrawn once
 * with its hue removed and its luminance kept, and then a tint lands as an
 * actual colour. Everyone shares that one greyscale copy.
 */
function plain(map: Texture | null): Texture | null {
  if (plainMap !== undefined) return plainMap;
  plainMap = null;
  const img = map?.image as CanvasImageSource & { width?: number; height?: number };
  const w = img?.width ?? 0;
  const h = img?.height ?? 0;
  if (!img || !w || !h) return plainMap;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const cx = canvas.getContext("2d");
    if (!cx) return plainMap;
    cx.drawImage(img, 0, 0);
    const frame = cx.getImageData(0, 0, w, h);
    const px = frame.data;
    for (let i = 0; i < px.length; i += 4) {
      const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      // Lifted and flattened: a multiply against near-black cloth is black
      // whatever colour you pick, so the darks come up and the range narrows.
      const v = Math.min(255, 96 + lum * 0.7);
      px[i] = v;
      px[i + 1] = v;
      px[i + 2] = v;
    }
    cx.putImageData(frame, 0, 0);
    const tex = new CanvasTexture(canvas);
    // GLTF textures are not flipped, and a CanvasTexture is by default.
    tex.flipY = map!.flipY;
    tex.colorSpace = map!.colorSpace;
    tex.wrapS = map!.wrapS;
    tex.wrapT = map!.wrapT;
    tex.needsUpdate = true;
    plainMap = tex;
  } catch {
    // Then peers wear the original texture and are told apart by their ring.
  }
  return plainMap;
}

function tinted(base: MeshStandardMaterial, peer: Peer): MeshStandardMaterial {
  const key = `${peer.hue}:${peer.dark ? "d" : "l"}`;
  const had = materials.get(key);
  if (had) return had;
  const mat = base.clone();
  const flat = plain(base.map);
  if (flat) mat.map = flat;
  mat.color = lookColor({ hue: peer.hue, dark: peer.dark });
  materials.set(key, mat);
  return mat;
}

function Wanderer({ peer, presence, lang }: { peer: Peer; presence: Presence; lang: Lang }) {
  const dict = t(lang);
  const group = useRef<Group>(null);
  const { scene, animations } = useGLTF("/models/Mage.glb");

  // A skinned mesh cannot be in two places, so each peer gets a real clone.
  const body = useMemo(() => {
    const copy = cloneSkinned(scene);
    copy.traverse((node) => {
      if (!(node instanceof Mesh)) return;
      node.castShadow = true;
      const base = node.material;
      if (base instanceof MeshStandardMaterial) node.material = tinted(base, peer);
      // The model ships alternative props; the wizard hides the same ones.
      if (node.name === "Spellbook_open" || node.name === "2H_Staff") node.visible = false;
    });
    return copy;
  }, [scene, peer.hue, peer.dark]);

  const { actions } = useAnimations(animations, group);
  const playing = useRef<string>("Idle");

  useEffect(() => {
    actions["Idle"]?.reset().play();
    return () => {
      Object.values(actions).forEach((a) => a?.stop());
    };
  }, [actions]);

  const shown = useRef<{ x: number; z: number; r: number } | null>(null);
  const label = useRef<HTMLSpanElement>(null);

  useFrame((_, delta) => {
    const g = group.current;
    const live = presence.peers.get(peer.id);
    if (!g || !live) return;

    if (!shown.current) shown.current = { x: live.x, z: live.z, r: live.r };
    const s = shown.current;
    const far = Math.hypot(live.x - s.x, live.z - s.z) > JUMP;
    const k = far ? 1 : Math.min(1, delta * EASE);
    s.x += (live.x - s.x) * k;
    s.z += (live.z - s.z) * k;
    // Turn the short way round, so crossing the back of the circle does not spin.
    const turn = ((live.r - s.r + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    s.r += turn * k;

    g.position.set(s.x, 0, s.z);
    g.rotation.y = s.r;

    const want =
      live.a === "sit" ? "Sit_Chair_Idle" : live.a === "walk" ? "Walking_A" : "Idle";
    if (want !== playing.current) {
      actions[playing.current]?.fadeOut(0.2);
      actions[want]?.reset().fadeIn(0.2).play();
      playing.current = want;
    }

    // Written straight into the node, for the same reason the position is: a
    // React update competes with the render loop for priority and lost, which
    // showed up as a label a second and a half behind the person.
    const words = dict.company.doing[live.a];
    if (label.current && label.current.textContent !== words) {
      label.current.textContent = words;
    }
  });

  const accent = lookAccent({ hue: peer.hue, dark: peer.dark });

  return (
    <group ref={group}>
      <primitive object={body} />
      {/* A ring on the ground: at village distance this is what actually tells
          two visitors apart, more than the tint on the cloth does. */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.02}>
        <ringGeometry args={[0.42, 0.56, 24]} />
        <meshBasicMaterial color={accent} transparent opacity={0.75} />
      </mesh>
      {/* Fixed screen size, like the building names: a label that shrinks with
          distance is unreadable exactly when you want to know who is over
          there. Their colour is their name, so the words are for the action. */}
      <Html position={[0, 2.15, 0]} center zIndexRange={[4, 0]}>
        <span
          ref={label}
          className="pointer-events-none whitespace-nowrap rounded-full border border-black/20 px-2 py-[3px] text-[10px] font-semibold text-[#12100c] shadow-sm"
          style={{ background: accent }}
        >
          {dict.company.doing[peer.a]}
        </span>
      </Html>
    </group>
  );
}

function PeersInner({
  presence,
  lang,
  room,
  floor,
}: {
  presence: Presence;
  lang: Lang;
  room: string;
  floor: number;
}) {
  /**
   * Only who is here. Everything else about a peer, position and action alike,
   * is read out of the map by the frame loop, because a React update has to
   * wait its turn behind the render loop and a person should not.
   */
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    const sync = () => {
      const now: string[] = [];
      presence.peers.forEach((p) => {
        if (p.room === room && p.floor === floor) now.push(p.id);
      });
      now.sort();
      setIds((was) =>
        was.length === now.length && was.every((v, i) => v === now[i]) ? was : now,
      );
    };
    sync();
    return presence.onRoster(sync);
  }, [presence, room, floor]);

  return (
    <>
      {ids.map((id) => {
        const peer = presence.peers.get(id);
        return peer ? <Wanderer key={id} peer={peer} presence={presence} lang={lang} /> : null;
      })}
    </>
  );
}

export const Peers = memo(PeersInner);


/**
 * Telling the server where you are. This lives inside the canvas because the
 * only honest source for the wizard's position is the object that moves him,
 * and that is only readable in a frame. It sends when something changed and
 * stays quiet otherwise.
 */
export function PresenceSync({
  presence,
  wizardRef,
  inputRef,
  room,
  floor,
  action,
}: {
  presence: Presence;
  wizardRef: RefObject<Group | null>;
  inputRef: MutableRefObject<InputVec>;
  room: string;
  floor: number;
  /** What the app knows you are doing. Walking is decided here, from the input. */
  action: PeerAction;
}) {
  useFrame(() => {
    const g = wizardRef.current;
    if (!g) return;
    const input = inputRef.current;
    const moving = Math.abs(input.x) > 0.05 || Math.abs(input.z) > 0.05;
    presence.push(
      {
        room,
        floor,
        // Two decimals is finer than anyone can see and keeps the frame small.
        x: Math.round(g.position.x * 100) / 100,
        z: Math.round(g.position.z * 100) / 100,
        r: Math.round(g.rotation.y * 100) / 100,
        a: action === "idle" && moving ? "walk" : action,
      },
      performance.now(),
    );
  });
  return null;
}
