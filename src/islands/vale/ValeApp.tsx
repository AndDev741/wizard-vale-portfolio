import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import type { Group } from "three";
import { t, type Lang, type SectionKey } from "../../i18n/ui";
import { Scene } from "./Scene";
import { CameraRig } from "./CameraRig";
import { Panel } from "./Panels";
import { Joystick } from "./Joystick";
import { useKeyboardInput, type InputVec } from "./useInput";
import { places } from "./world";

type Mode = "tour" | "roam";
type Focus = SectionKey | "overview";

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
  const [nearDoor, setNearDoor] = useState<SectionKey | null>(null);
  // Read synchronously: this island is client:only, and the Canvas reads
  // `detail` for its shadow setting on the very first render.
  const [coarse] = useState(() => window.matchMedia("(pointer: coarse)").matches);
  const [detail] = useState(() => (window.innerWidth < 700 ? 0.55 : 1));

  const inputRef = useRef<InputVec>({ x: 0, z: 0 });
  const wizardRef = useRef<Group>(null);
  const camYawRef = useRef(Math.PI);
  useKeyboardInput(inputRef, mode === "roam" && panel === null);

  const openPlace = useCallback((key: SectionKey) => {
    setFocus(key);
    setPanel(key);
  }, []);

  const closePanel = useCallback(() => {
    setPanel(null);
    setFocus((prev) => (prev === "overview" ? prev : prev));
  }, []);

  const startRoam = useCallback(() => {
    setPanel(null);
    setFocus("overview");
    setMode("roam");
  }, []);

  const exitRoam = useCallback(() => {
    setMode("tour");
    setNearDoor(null);
    setFocus("overview");
    inputRef.current.x = 0;
    inputRef.current.z = 0;
  }, []);

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
    document.body.classList.toggle("vale-roam", mode === "roam");
    return () => document.body.classList.remove("vale-roam");
  }, [mode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (panel) setPanel(null);
        else if (mode === "roam") exitRoam();
      }
      if (
        mode === "roam" &&
        panel === null &&
        nearDoor &&
        (e.key === "e" || e.key === "E" || e.key === "Enter")
      ) {
        openPlace(nearDoor);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, panel, nearDoor, exitRoam, openPlace]);

  return (
    <div className="relative h-full w-full">
      <Canvas
        dpr={[1, 1.75]}
        shadows={detail === 1}
        camera={{ fov: 42, position: [0, 15, 29.5], near: 0.5, far: 420 }}
        gl={{ antialias: true }}
      >
        <Suspense fallback={null}>
          <Scene
            lang={lang}
            mode={mode}
            paused={panel !== null}
            inputRef={inputRef}
            wizardRef={wizardRef}
            onPlaceClick={openPlace}
            onNearDoor={setNearDoor}
            camYawRef={camYawRef}
            detail={detail}
          />
          <Ready onReady={onReady} />
        </Suspense>
        <CameraRig
          mode={mode}
          focus={focus}
          wizardRef={wizardRef}
          camYawRef={camYawRef}
        />
      </Canvas>

      {/* Dock: place shortcuts + walk toggle. An open panel would sit on top of
          it, so on wide screens it steps aside to the panel's left edge, and on
          narrow ones (where the panel is full width) it gets out of the way. */}
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

      {/* Roam hint + door prompt */}
      {mode === "roam" && panel === null && (
        <div className="pointer-events-none absolute inset-x-0 bottom-24 z-[6] flex flex-col items-center gap-2 px-4 sm:bottom-10">
          {nearDoor && (
            <button
              type="button"
              onClick={() => openPlace(nearDoor)}
              className="pointer-events-auto rounded-full bg-[#d99a3d] px-5 py-2 text-sm font-bold text-[#221a0d] active:scale-[0.98]"
            >
              {dict.world.enter}: {dict.world.places[nearDoor]}
            </button>
          )}
          <p className="rounded-full bg-black/40 px-4 py-1.5 text-center text-xs text-[#c9cdc2] backdrop-blur-sm">
            {coarse ? dict.world.hintWalkTouch : dict.world.hintWalk}
          </p>
        </div>
      )}

      {mode === "roam" && coarse && panel === null && (
        <Joystick inputRef={inputRef} />
      )}

      {panel && (
        <Panel lang={lang} section={panel} onClose={closePanel} />
      )}
    </div>
  );
}
