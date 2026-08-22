import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import type { Group } from "three";
import { t, type Lang, type SectionKey } from "../../i18n/ui";
import { Scene } from "./Scene";
import { Interior } from "./Interior";
import { CameraRig } from "./CameraRig";
import { Panel } from "./Panels";
import { BoardDialog } from "./BoardDialog";
import { BookReader } from "./BookReader";
import { Joystick } from "./Joystick";
import { useKeyboardInput, type InputVec } from "./useInput";
import { places } from "./world";
import { interiorFor } from "./interiors";
import { boardLabel } from "./boardSubject";

type Mode = "tour" | "roam";
type Focus = SectionKey | "overview";
/** Out in the vale, or inside a numbered floor of one of its buildings. */
type View = { kind: "vale" } | { kind: "interior"; place: SectionKey; floor: number };

/** Mounts inside the models' Suspense boundary: runs only once everything loaded. */
function Ready({ onReady }: { onReady: () => void }) {
  useEffect(() => onReady(), [onReady]);
  return null;
}

export default function ValeApp({ lang }: { lang: Lang }) {
  const dict = t(lang);
  const [mode, setMode] = useState<Mode>("tour");
  const [focus, setFocus] = useState<Focus>("overview");
  const [panel, setPanel] = useState<SectionKey | null>(null);
  const [view, setView] = useState<View>({ kind: "vale" });
  const [dialog, setDialog] = useState<string | null>(null);
  // What to go back to when a book is closed: the shelf it came off.
  const [dialogBack, setDialogBack] = useState<string | null>(null);
  const [nearTrigger, setNearTrigger] = useState<string | null>(null);
  const [exitedFrom, setExitedFrom] = useState<SectionKey | null>(null);
  const [fading, setFading] = useState(false);
  // Read synchronously: this island is client:only, and the Canvas reads
  // `detail` for its shadow setting on the very first render.
  const [coarse] = useState(() => window.matchMedia("(pointer: coarse)").matches);
  const [detail] = useState(() => (window.innerWidth < 700 ? 0.55 : 1));

  const inputRef = useRef<InputVec>({ x: 0, z: 0 });
  const wizardRef = useRef<Group>(null);
  const camYawRef = useRef(Math.PI);

  const inside = view.kind === "interior";
  const interior = inside ? interiorFor(view.place) : undefined;
  const busy = panel !== null || dialog !== null;
  useKeyboardInput(inputRef, (mode === "roam" || inside) && !busy);

  /** A short black wipe, so moving between floors is not an instant cut. */
  const wipe = useCallback((change: () => void) => {
    setFading(true);
    window.setTimeout(() => {
      change();
      window.setTimeout(() => setFading(false), 90);
    }, 220);
  }, []);

  const openPlace = useCallback((key: SectionKey) => {
    setFocus(key);
    setPanel(key);
  }, []);

  const closePanel = useCallback(() => setPanel(null), []);

  const startRoam = useCallback(() => {
    setPanel(null);
    setFocus("overview");
    setExitedFrom(null);
    setMode("roam");
  }, []);

  const exitRoam = useCallback(() => {
    setMode("tour");
    setNearTrigger(null);
    setFocus("overview");
    inputRef.current.x = 0;
    inputRef.current.z = 0;
  }, []);

  const enterBuilding = useCallback(
    (place: SectionKey) => {
      inputRef.current.x = 0;
      inputRef.current.z = 0;
      setPanel(null);
      setFocus("overview");
      wipe(() => {
        setNearTrigger(null);
        setView({ kind: "interior", place, floor: 0 });
      });
    },
    [wipe],
  );

  const leaveBuilding = useCallback(() => {
    inputRef.current.x = 0;
    inputRef.current.z = 0;
    setDialog(null);
    setDialogBack(null);
    const place = view.kind === "interior" ? view.place : null;
    wipe(() => {
      setNearTrigger(null);
      setExitedFrom(place);
      setView({ kind: "vale" });
      setMode("roam");
    });
  }, [wipe, view]);

  const changeFloor = useCallback(
    (delta: number) => {
      inputRef.current.x = 0;
      inputRef.current.z = 0;
      wipe(() => {
        setNearTrigger(null);
        setView((v) => {
          if (v.kind !== "interior") return v;
          const config = interiorFor(v.place);
          const last = (config?.floors.length ?? 1) - 1;
          return { ...v, floor: Math.max(0, Math.min(last, v.floor + delta)) };
        });
      });
    },
    [wipe],
  );

  /** Acting on whatever the wizard is standing next to. */
  const useTrigger = useCallback(
    (id: string) => {
      if (view.kind === "vale") {
        const place = id as SectionKey;
        if (interiorFor(place)) enterBuilding(place);
        else openPlace(place);
        return;
      }
      if (id === "up") changeFloor(1);
      else if (id === "down") changeFloor(-1);
      else if (id === "exit") leaveBuilding();
      else if (id.startsWith("board:")) {
        setDialogBack(null);
        setDialog(id.slice(6));
      }
    },
    [view, enterBuilding, openPlace, changeFloor, leaveBuilding],
  );

  const onReady = useCallback(() => {
    document.getElementById("vale-poster")?.classList.add("is-hidden");
    window.dispatchEvent(new Event("vale:ready"));
  }, []);

  // The static hero button asks for walk mode through this event.
  useEffect(() => {
    const handler = () => startRoam();
    window.addEventListener("vale:roam", handler);
    return () => window.removeEventListener("vale:roam", handler);
  }, [startRoam]);

  useEffect(() => {
    document.body.classList.toggle("vale-panel-open", panel !== null);
    return () => document.body.classList.remove("vale-panel-open");
  }, [panel]);

  useEffect(() => {
    document.body.classList.toggle("vale-roam", mode === "roam" || inside);
    return () => document.body.classList.remove("vale-roam");
  }, [mode, inside]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (dialog) setDialog(null);
        else if (panel) setPanel(null);
        else if (inside) leaveBuilding();
        else if (mode === "roam") exitRoam();
        return;
      }
      if (!busy && nearTrigger && (e.key === "e" || e.key === "E" || e.key === "Enter")) {
        useTrigger(nearTrigger);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, panel, dialog, inside, busy, nearTrigger, exitRoam, leaveBuilding, useTrigger]);

  /** What the prompt above the wizard's head should say. */
  const promptLabel = (() => {
    if (!nearTrigger) return null;
    if (view.kind === "vale") {
      const key = nearTrigger as SectionKey;
      return `${dict.world.enter}: ${dict.world.places[key]}`;
    }
    if (nearTrigger === "up") return dict.interior.climb;
    if (nearTrigger === "down") return dict.interior.descend;
    if (nearTrigger === "exit") return dict.interior.leaveBuilding;
    if (nearTrigger.startsWith("board:npc:")) {
      return `${dict.interior.talk}: ${boardLabel(nearTrigger.slice(6), lang)}`;
    }
    if (nearTrigger.startsWith("board:text:")) {
      return `${dict.interior.read}: ${boardLabel(nearTrigger.slice(6), lang)}`;
    }
    if (nearTrigger.startsWith("board:")) return dict.interior.read;
    return null;
  })();

  const floorKey =
    interior && view.kind === "interior" ? interior.floors[view.floor].key : null;

  return (
    <div className="relative h-full w-full">
      <Canvas
        dpr={[1, 1.75]}
        shadows={detail === 1}
        camera={{ fov: 42, position: [0, 15, 29.5], near: 0.5, far: 420 }}
        gl={{ antialias: true }}
      >
        <Suspense fallback={null}>
          {interior && view.kind === "interior" ? (
            <Interior
              lang={lang}
              config={interior}
              floorIndex={view.floor}
              paused={busy}
              inputRef={inputRef}
              wizardRef={wizardRef}
              camYawRef={camYawRef}
              onNearTrigger={setNearTrigger}
              onOpenBoard={(subject: string) => {
                setDialogBack(null);
                setDialog(subject);
              }}
            />
          ) : (
            <Scene
              lang={lang}
              mode={mode}
              paused={panel !== null}
              inputRef={inputRef}
              wizardRef={wizardRef}
              onPlaceClick={openPlace}
              onNearTrigger={setNearTrigger}
              camYawRef={camYawRef}
              exitedFrom={exitedFrom}
              detail={detail}
            />
          )}
          <Ready onReady={onReady} />
        </Suspense>
        <CameraRig
          mode={inside ? "roam" : mode}
          focus={focus}
          wizardRef={wizardRef}
          camYawRef={camYawRef}
          indoors={interior ? { radius: interior.radius, viewAngle: interior.exitAngle } : undefined}
        />
      </Canvas>

      {/* Dock: place shortcuts + walk toggle. An open panel would sit on top of
          it, so on wide screens it steps aside to the panel's left edge, and on
          narrow ones (where the panel is full width) it gets out of the way. */}
      {!inside && (
        <div
          className={`pointer-events-auto absolute top-1/2 z-[6] -translate-y-1/2 flex-col items-end gap-1.5 ${
            panel ? "hidden md:flex md:right-[29rem]" : "flex right-3"
          }`}
        >
          {places.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => openPlace(p.key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold backdrop-blur-sm transition-colors sm:text-[13px] ${
                panel === p.key
                  ? "border-[#d99a3d] bg-[#d99a3d] text-[#221a0d]"
                  : "border-white/20 bg-black/30 text-[#ece9dd] hover:bg-black/50"
              }`}
            >
              {dict.world.places[p.key]}
            </button>
          ))}
          <button
            type="button"
            onClick={mode === "roam" ? exitRoam : startRoam}
            className="mt-2 rounded-full border border-[#d99a3d]/70 bg-black/30 px-3 py-1.5 text-xs font-bold text-[#e0a44e] backdrop-blur-sm hover:bg-black/50 sm:text-[13px]"
          >
            {mode === "roam" ? dict.world.exitWalk : dict.world.walk}
          </button>
        </div>
      )}

      {/* Inside: which floor you are on, and the stairs, as buttons too. */}
      {inside && interior && view.kind === "interior" && !dialog && (
        <div className="pointer-events-auto absolute right-3 top-1/2 z-[6] flex -translate-y-1/2 flex-col items-end gap-1.5">
          <p className="rounded-full bg-black/45 px-3 py-1.5 text-xs font-semibold text-[#ece9dd] backdrop-blur-sm">
            {floorKey ? dict.interior.floors[floorKey] : ""}
          </p>
          {interior.floors.length > 1 && (
            <p className="rounded-full bg-black/30 px-3 py-1 text-[11px] text-[#9aa69d] backdrop-blur-sm">
              {dict.interior.floorOf
                .replace("{n}", String(view.floor + 1))
                .replace("{total}", String(interior.floors.length))}
            </p>
          )}
          {view.floor < interior.floors.length - 1 && (
            <button
              type="button"
              onClick={() => changeFloor(1)}
              className="mt-1 rounded-full border border-white/20 bg-black/30 px-3 py-1.5 text-xs font-semibold text-[#ece9dd] backdrop-blur-sm hover:bg-black/50"
            >
              {dict.interior.climb}
            </button>
          )}
          {view.floor > 0 && (
            <button
              type="button"
              onClick={() => changeFloor(-1)}
              className="rounded-full border border-white/20 bg-black/30 px-3 py-1.5 text-xs font-semibold text-[#ece9dd] backdrop-blur-sm hover:bg-black/50"
            >
              {dict.interior.descend}
            </button>
          )}
          <button
            type="button"
            onClick={leaveBuilding}
            className="mt-2 rounded-full border border-[#d99a3d]/70 bg-black/30 px-3 py-1.5 text-xs font-bold text-[#e0a44e] backdrop-blur-sm hover:bg-black/50"
          >
            {dict.interior.leaveBuilding}
          </button>
        </div>
      )}

      {/* Walk hint, and whatever is within reach */}
      {(mode === "roam" || inside) && !busy && (
        <div className="pointer-events-none absolute inset-x-0 bottom-24 z-[6] flex flex-col items-center gap-2 px-4 sm:bottom-10">
          {nearTrigger && promptLabel && (
            <button
              type="button"
              onClick={() => useTrigger(nearTrigger)}
              className="pointer-events-auto rounded-full bg-[#d99a3d] px-5 py-2 text-sm font-bold text-[#221a0d] active:scale-[0.98]"
            >
              {promptLabel}
            </button>
          )}
          <p className="rounded-full bg-black/40 px-4 py-1.5 text-center text-xs text-[#c9cdc2] backdrop-blur-sm">
            {inside
              ? coarse
                ? dict.interior.hintTouch
                : dict.interior.hint
              : coarse
                ? dict.world.hintWalkTouch
                : dict.world.hintWalk}
          </p>
        </div>
      )}

      {(mode === "roam" || inside) && coarse && !busy && <Joystick inputRef={inputRef} />}

      {panel && (
        <Panel
          lang={lang}
          section={panel}
          onClose={closePanel}
          onEnter={interiorFor(panel) ? () => enterBuilding(panel) : undefined}
        />
      )}

      {dialog?.startsWith("text:") ? (
        <BookReader
          lang={lang}
          textKey={dialog.slice(5)}
          onClose={() => {
            setDialog(null);
            setDialogBack(null);
          }}
          onBack={
            dialogBack
              ? () => {
                  setDialog(dialogBack);
                  setDialogBack(null);
                }
              : undefined
          }
        />
      ) : (
        dialog && (
          <BoardDialog
            lang={lang}
            subject={dialog}
            onClose={() => setDialog(null)}
            onPick={(next: string) => {
              setDialogBack(dialog);
              setDialog(next);
            }}
          />
        )
      )}

      {/* The wipe between floors */}
      <div
        className={`pointer-events-none absolute inset-0 z-[8] bg-black transition-opacity duration-200 ${
          fading ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
