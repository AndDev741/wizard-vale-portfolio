import { Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
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
import { Ambience } from "./ambience";
import { localDaylight } from "./daylight";
import { record, snapshot, type Deed, type Snapshot } from "./achievements";
import { achievements, findAchievement } from "../../data/achievements";
import { DeedsPanel } from "./DeedsPanel";
import { Peers, PresenceSync } from "./Peers";
import { Familiar } from "./Familiar";
import { Presence, type Link, type PeerAction } from "./presence";
import { readCompany, readLook, writeCompany } from "./look";

/**
 * Where the presence server lives. Unset in a real build means the vale is a
 * single-player place, which is how it behaves until the variable is set on the
 * deployment.
 *
 * In `astro dev` it defaults to the local worker, so `npm run presence:dev` in
 * another terminal is the whole setup. Without that worker the control says it
 * cannot reach the vale, which is a better answer than the control quietly not
 * being there.
 */
const PRESENCE_URL =
  (import.meta.env.PUBLIC_PRESENCE_URL as string | undefined) ??
  (import.meta.env.DEV ? "ws://localhost:8787/green" : undefined);

/**
 * The sound control. It starts silent on purpose: browsers will not let audio
 * begin without a gesture, and a site that makes noise unasked deserves the
 * back button. The choice is remembered between visits.
 */
function RoundToggle({
  on,
  onToggle,
  label,
  icons,
}: {
  on: boolean;
  onToggle: () => void;
  label: string;
  /** What to show when on, and when off. */
  icons: [ReactNode, ReactNode];
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      title={label}
      className={`mt-1 flex h-7 w-7 items-center justify-center rounded-full border backdrop-blur-sm transition-colors sm:h-8 sm:w-8 ${
        on
          ? "border-[#d99a3d] bg-[#d99a3d]/20 text-[#e0a44e]"
          : "border-white/20 bg-black/30 text-[#9aa69d] hover:bg-black/50"
      }`}
    >
      <span aria-hidden className="text-[13px] leading-none">
        {on ? icons[0] : icons[1]}
      </span>
      <span className="sr-only">{label}</span>
    </button>
  );
}

/** Corners pointing out, and the same pointing in. */
const EXPAND = (
  <svg viewBox="0 0 16 16" aria-hidden className="h-[13px] w-[13px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
    <path d="M6 2H2v4M10 2h4v4M6 14H2v-4M10 14h4v-4" />
  </svg>
);
const SHRINK = (
  <svg viewBox="0 0 16 16" aria-hidden className="h-[13px] w-[13px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
    <path d="M2 6h4V2M14 6h-4V2M2 10h4v4M14 10h-4v4" />
  </svg>
);

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
  // The vale's hour, read once, shared with the sound so the crickets know
  // whether it is night.
  const [sky] = useState(() => localDaylight());
  const [sound, setSound] = useState(false);
  const ambience = useRef<Ambience | null>(null);
  const [deeds, setDeeds] = useState<Snapshot>(() => snapshot());
  const [deedsOpen, setDeedsOpen] = useState(false);
  /** The badge just taken, shown as a toast and then let go. */
  const [won, setWon] = useState<string | null>(null);
  const [detail] = useState(() => (window.innerWidth < 700 ? 0.55 : 1));
  // Company is on by default, and off means the socket is never opened.
  const [company, setCompany] = useState(() => readCompany());
  // State, not a ref: mounting the peers is a render, and a ref does not cause one.
  const [presence, setPresence] = useState<Presence | null>(null);
  const [peersHere, setPeersHere] = useState(0);
  const [link, setLink] = useState<Link>("off");
  const stage = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);
  // iPhones do not do element fullscreen at all, so the control stays away
  // rather than offering something that cannot happen.
  const [canFocus] = useState(() => Boolean(document.fullscreenEnabled));

  const inputRef = useRef<InputVec>({ x: 0, z: 0 });
  const wizardRef = useRef<Group>(null);
  const camYawRef = useRef(Math.PI);

  const inside = view.kind === "interior";
  // Sitting lasts exactly as long as the seat's own dialog is open.
  const seated = dialog === "story:seat";

  /** One instance for the life of the island, torn down with it. */
  useEffect(() => {
    ambience.current = new Ambience();
    return () => {
      ambience.current?.dispose();
      ambience.current = null;
    };
  }, []);

  /**
   * Everything the visitor does passes through here. `record` is cheap and
   * almost always returns nothing, which is what makes it safe to call on
   * every footfall.
   */
  const noteDeed = useCallback((deed: Deed) => {
    const won = record(deed);
    if (!won.length) return;
    setDeeds(snapshot());
    setWon(won[0]);
  }, []);

  /** Where the sound thinks you are: out in the vale, or in one of the five. */
  const room = view.kind === "interior" ? view.place : "vale";
  const floor = view.kind === "interior" ? view.floor : 0;
  /**
   * She follows once you have petted her, and only from then: this is a visit,
   * not an account. The badge for petting her is kept between visits because
   * it is an achievement, but arriving to find a cat already at your heel
   * skips the only part that earns her, so she starts by the fire every time.
   */
  const [following, setFollowing] = useState(false);
  const stageId = `${room}:${floor}`;

  /** What the others see you doing. Walking is added by the sync, from input. */
  const doing: PeerAction = seated
    ? "sit"
    : dialog === null
      ? nearTrigger === "up" || nearTrigger === "down"
        ? "climb"
        : "idle"
      : dialog.startsWith("text:")
        ? "read"
        : dialog.startsWith("npc:")
          ? "talk"
          : dialog === "story:orb"
            ? "scry"
            : "look";

  /**
   * The socket, open only while company is on. Turning it off closes it rather
   * than filtering anyone out, so nothing about this visitor leaves the browser
   * after that.
   */
  useEffect(() => {
    if (!company || !Presence.configured(PRESENCE_URL)) return;
    const p = new Presence(PRESENCE_URL, readLook());
    p.open({ room: "vale", floor: 0, x: 0, z: 0, r: 0, a: "idle" });
    setPresence(p);
    const stop = p.onRoster(() => setPeersHere(p.peers.size));
    const stopLink = p.onLink(setLink);
    setLink(p.link);
    return () => {
      stop();
      stopLink();
      setLink("off");
      p.close();
      setPresence(null);
      setPeersHere(0);
    };
  }, [company]);

  /**
   * What the control says. Being alone and being unable to reach anyone look
   * identical otherwise, and one of those is a problem worth seeing.
   */
  const companyLabel = !company
    ? dict.world.companyOff
    : link === "in"
      ? dict.world.companyOn
      : link === "joining"
        ? dict.world.companyJoining
        : dict.world.companyLost;

  /**
   * What fills the screen: the whole hero section, marked `vale-focus` by the
   * page, so the header and the name come with it and only the rest of the page
   * is left behind. Walking already hides the name on its own, so walk mode in
   * here is the vale and nothing else. Falls back to this island if it is ever
   * used somewhere without that wrapper.
   */
  const focusTarget = useCallback(
    () => stage.current?.closest<HTMLElement>(".vale-focus") ?? stage.current,
    [],
  );

  // Escape and the browser's own controls leave without telling us, so the
  // state comes from the event and never from what we last did.
  useEffect(() => {
    const sync = () => setFocused(document.fullscreenElement === focusTarget());
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, [focusTarget]);

  const toggleFocus = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {
        // Already leaving.
      });
      return;
    }
    void focusTarget()?.requestFullscreen().catch(() => {
      // Refused, which some browsers do outside a plain click. Nothing breaks.
    });
  }, [focusTarget]);

  const toggleCompany = useCallback(() => {
    setCompany((was) => {
      writeCompany(!was);
      return !was;
    });
  }, []);

  const toggleSound = useCallback(() => {
    const next = !sound;
    setSound(next);
    if (next) {
      ambience.current?.start(room, sky.night);
      noteDeed({ kind: "sound" });
    } else ambience.current?.stop();
  }, [sound, room, sky.night, noteDeed]);

  // Walking into a building changes the place, not the track.
  useEffect(() => {
    if (sound) ambience.current?.setRoom(room, sky.night);
  }, [sound, room, sky.night]);

  /** Petting the cat, from a click on her or from the action button. */
  const petCat = useCallback(() => {
    ambience.current?.purr();
    setFollowing(true);
    noteDeed({ kind: "cat" });
  }, [noteDeed]);

  /** A board subject, turned into whatever deed it counts as. */
  const noteSubject = useCallback(
    (subject: string) => {
      if (subject.startsWith("text:")) noteDeed({ kind: "book", key: subject.slice(5) });
      else if (subject.startsWith("npc:")) noteDeed({ kind: "patron", key: subject.slice(4) });
      else if (subject === "story:seat") noteDeed({ kind: "sit" });
      else if (subject === "story:orb") noteDeed({ kind: "orb" });
      else if (
        subject === "project:beyou" &&
        view.kind === "interior" &&
        view.place === "projects"
      ) {
        noteDeed({ kind: "grimoire" });
      }
    },
    [noteDeed, view],
  );

  /** One stride. The wizard calls this, so the pace is his and not a timer's. */
  const onStep = useCallback(() => {
    ambience.current?.footstep();
    noteDeed({ kind: "walk", distance: 1.45 });
  }, [noteDeed]);

  // The hour the vale is at, and the language it is in, are deeds in themselves.
  useEffect(() => {
    noteDeed({ kind: "light", night: sky.night });
    noteDeed({ kind: "lang", lang });
  }, [noteDeed, sky.night, lang]);

  // A toast should not outstay its welcome.
  useEffect(() => {
    if (!won) return;
    const drop = window.setTimeout(() => setWon(null), 4200);
    return () => window.clearTimeout(drop);
  }, [won]);
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

  const openPlace = useCallback(
    (key: SectionKey) => {
      setFocus(key);
      setPanel(key);
      // The Raven Post has no door to walk through: reading its board IS the
      // visit. The other four are counted when you step inside them.
      if (key === "contact") noteDeed({ kind: "visit", place: key });
    },
    [noteDeed],
  );

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
      ambience.current?.door();
      noteDeed({ kind: "visit", place });
      wipe(() => {
        setNearTrigger(null);
        setView({ kind: "interior", place, floor: 0 });
      });
    },
    [wipe, noteDeed],
  );

  const leaveBuilding = useCallback(() => {
    inputRef.current.x = 0;
    inputRef.current.z = 0;
    setDialog(null);
    setDialogBack(null);
    const place = view.kind === "interior" ? view.place : null;
    ambience.current?.door();
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
          const floor = Math.max(0, Math.min(last, v.floor + delta));
          if (v.place === "projects") noteDeed({ kind: "floor", index: floor });
          return { ...v, floor };
        });
      });
    },
    [wipe, noteDeed],
  );

  /** Acting on whatever the wizard is standing next to. */
  const useTrigger = useCallback(
    (id: string) => {
      // The noticeboard stands in the vale but is not a place, so it is answered
      // before the branch that reads every vale trigger as one.
      if (id === "deeds") {
        setDeedsOpen(true);
        return;
      }
      if (id === "pet:cat") {
        petCat();
        return;
      }
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
        const subject = id.slice(6);
        setDialogBack(null);
        setDialog(subject);
        noteSubject(subject);
      }
    },
    [view, enterBuilding, openPlace, changeFloor, leaveBuilding, noteSubject, petCat],
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

  // The hero copy lives outside this island and above it in the stacking order,
  // so anything covering the screen has to ask for it to step aside.
  useEffect(() => {
    document.body.classList.toggle("vale-panel-open", panel !== null || deedsOpen);
    return () => document.body.classList.remove("vale-panel-open");
  }, [panel, deedsOpen]);

  useEffect(() => {
    document.body.classList.toggle("vale-roam", mode === "roam" || inside);
    return () => document.body.classList.remove("vale-roam");
  }, [mode, inside]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (deedsOpen) setDeedsOpen(false);
        else if (dialog) setDialog(null);
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
  }, [mode, panel, dialog, deedsOpen, inside, busy, nearTrigger, exitRoam, leaveBuilding, useTrigger]);

  /** What the prompt above the wizard's head should say. */
  const promptLabel = (() => {
    if (!nearTrigger) return null;
    // Before the vale branch: that one assumes the trigger is a place, and the
    // noticeboard is not one.
    if (nearTrigger === "deeds") return dict.world.deedsBoard;
    if (nearTrigger === "pet:cat") return dict.interior.petCat;
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
    if (nearTrigger === "board:story:seat") return dict.interior.sitDown;
    if (nearTrigger.startsWith("board:story:")) {
      return `${dict.interior.lookAt}: ${boardLabel(nearTrigger.slice(6), lang)}`;
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
    <div ref={stage} className="relative h-full w-full">
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
              seated={seated}
              night={sky.night}
              onStep={onStep}
              onPetCat={petCat}
              catAway={following}
              inputRef={inputRef}
              wizardRef={wizardRef}
              camYawRef={camYawRef}
              onNearTrigger={setNearTrigger}
              onOpenBoard={(subject: string) => {
                setDialogBack(null);
                setDialog(subject);
                noteSubject(subject);
              }}
            />
          ) : (
            <Scene
              onStep={onStep}
              deedsEarned={Object.keys(deeds.earned).length}
              deedsTotal={achievements.length}
              onOpenDeeds={() => setDeedsOpen(true)}
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
          {following && (
            <Familiar wizardRef={wizardRef} stageId={stageId} onPet={petCat} />
          )}
          {presence && (
            <>
              <Peers presence={presence} lang={lang} room={room} floor={floor} />
              <PresenceSync
                presence={presence}
                wizardRef={wizardRef}
                inputRef={inputRef}
                room={room}
                floor={floor}
                action={doing}
              />
            </>
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
          {/* Somebody else is about. Worth saying even when they are indoors,
              because an empty-looking vale that is not empty is a missed thing. */}
          {company && link === "lost" ? (
            <p className="rounded-full border border-white/20 bg-black/40 px-2.5 py-1 text-[11px] font-semibold text-[#9aa69d] backdrop-blur-sm sm:px-3 sm:py-1.5 sm:text-xs">
              {dict.world.companyLost}
            </p>
          ) : peersHere > 0 ? (
            <p className="rounded-full border border-[#d99a3d]/40 bg-[#d99a3d]/15 px-2.5 py-1 text-[11px] font-semibold text-[#e0a44e] backdrop-blur-sm sm:px-3 sm:py-1.5 sm:text-xs">
              {dict.company.here.replace("{n}", String(peersHere))}
            </p>
          ) : null}
          {places.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => openPlace(p.key)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm transition-colors sm:px-3 sm:py-1.5 sm:text-[13px] ${
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
            className="mt-1.5 rounded-full border border-[#d99a3d]/70 bg-black/30 px-2.5 py-1 text-[11px] font-bold text-[#e0a44e] backdrop-blur-sm hover:bg-black/50 sm:mt-2 sm:px-3 sm:py-1.5 sm:text-[13px]"
          >
            {mode === "roam" ? dict.world.exitWalk : dict.world.walk}
          </button>
          <RoundToggle
            on={sound}
            onToggle={toggleSound}
            label={sound ? dict.world.soundOn : dict.world.soundOff}
            icons={["\u{1F50A}", "\u{1F507}"]}
          />
          {Presence.configured(PRESENCE_URL) && (
            <RoundToggle
              on={company}
              onToggle={toggleCompany}
              label={`${companyLabel} \u2014 ${dict.company.note}`}
              icons={["\u{1F465}", "\u{1F464}"]}
            />
          )}
          {canFocus && (
            <RoundToggle
              on={focused}
              onToggle={toggleFocus}
              label={focused ? dict.world.focusOff : dict.world.focusOn}
              icons={[SHRINK, EXPAND]}
            />
          )}
        </div>
      )}

      {/* Inside: which floor you are on, and the stairs, as buttons too. */}
      {inside && interior && view.kind === "interior" && !dialog && (
        <div className="pointer-events-auto absolute right-3 top-1/2 z-[6] flex -translate-y-1/2 flex-col items-end gap-1.5">
          <p className="rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-semibold text-[#ece9dd] backdrop-blur-sm sm:px-3 sm:py-1.5 sm:text-xs">
            {floorKey ? dict.interior.floors[floorKey] : ""}
          </p>
          {interior.floors.length > 1 && (
            <p className="rounded-full bg-black/30 px-2.5 py-0.5 text-[10px] text-[#9aa69d] backdrop-blur-sm sm:px-3 sm:py-1 sm:text-[11px]">
              {dict.interior.floorOf
                .replace("{n}", String(view.floor + 1))
                .replace("{total}", String(interior.floors.length))}
            </p>
          )}
          {view.floor < interior.floors.length - 1 && (
            <button
              type="button"
              onClick={() => changeFloor(1)}
              className="mt-1 rounded-full border border-white/20 bg-black/30 px-2.5 py-1 text-[11px] font-semibold text-[#ece9dd] backdrop-blur-sm hover:bg-black/50 sm:px-3 sm:py-1.5 sm:text-xs"
            >
              {dict.interior.climb}
            </button>
          )}
          {view.floor > 0 && (
            <button
              type="button"
              onClick={() => changeFloor(-1)}
              className="rounded-full border border-white/20 bg-black/30 px-2.5 py-1 text-[11px] font-semibold text-[#ece9dd] backdrop-blur-sm hover:bg-black/50 sm:px-3 sm:py-1.5 sm:text-xs"
            >
              {dict.interior.descend}
            </button>
          )}
          <button
            type="button"
            onClick={leaveBuilding}
            className="mt-1.5 rounded-full border border-[#d99a3d]/70 bg-black/30 px-2.5 py-1 text-[11px] font-bold text-[#e0a44e] backdrop-blur-sm hover:bg-black/50 sm:mt-2 sm:px-3 sm:py-1.5 sm:text-xs"
          >
            {dict.interior.leaveBuilding}
          </button>
          <RoundToggle
            on={sound}
            onToggle={toggleSound}
            label={sound ? dict.world.soundOn : dict.world.soundOff}
            icons={["\u{1F50A}", "\u{1F507}"]}
          />
          {Presence.configured(PRESENCE_URL) && (
            <RoundToggle
              on={company}
              onToggle={toggleCompany}
              label={`${companyLabel} \u2014 ${dict.company.note}`}
              icons={["\u{1F465}", "\u{1F464}"]}
            />
          )}
          {canFocus && (
            <RoundToggle
              on={focused}
              onToggle={toggleFocus}
              label={focused ? dict.world.focusOff : dict.world.focusOn}
              icons={[SHRINK, EXPAND]}
            />
          )}
        </div>
      )}

      {/* Walk hint, and whatever is within reach */}
      {(mode === "roam" || inside) && !busy && (
        <div
          className={`pointer-events-none absolute inset-x-0 z-[6] flex flex-col items-center gap-2 px-4 sm:bottom-10 ${
            // The joystick stands 112px tall from 32px up, so on a touch screen
            // the hint has to start above its top edge or it reads through it.
            coarse ? "bottom-40" : "bottom-24"
          }`}
        >
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
          onTurn={() => ambience.current?.page()}
          onEnlarge={() => noteDeed({ kind: "diagram" })}
        />
      ) : (
        dialog && (
          <BoardDialog
            lang={lang}
            subject={dialog}
            onClose={() => {
              setDialog(null);
              setDialogBack(null);
            }}
            onPick={(next: string) => {
              setDialogBack(dialog);
              setDialog(next);
              noteSubject(next);
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
        )
      )}

      {deedsOpen && (
        <DeedsPanel lang={lang} deeds={deeds} onClose={() => setDeedsOpen(false)} />
      )}

      {/* A badge just taken. It says so and then gets out of the way. */}
      {won && (
        <div className="pointer-events-none absolute inset-x-0 top-20 z-[25] flex justify-center px-4">
          <div className="flex items-center gap-3 rounded-2xl border border-[#d99a3d]/50 bg-[#12161c]/90 px-4 py-2.5 shadow-[0_10px_40px_rgba(0,0,0,0.5)] backdrop-blur-sm">
            <span aria-hidden className="grid h-9 w-9 place-items-center rounded-lg bg-[#d99a3d]/20 text-lg">
              {findAchievement(won)?.icon ?? "\u2b50"}
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#d99a3d]">
                {dict.world.deedsWon}
              </p>
              <p className="text-sm font-bold text-[#ece9dd]">
                {findAchievement(won)?.name[lang] ?? won}
              </p>
            </div>
          </div>
        </div>
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
