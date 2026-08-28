import type { Lang, SectionKey } from "../../i18n/ui";
import { achievements } from "../../data/achievements";

/**
 * Which badges this visitor has, kept in their own browser. Nothing is sent
 * anywhere: there is no account here and no reason to want one, so the record
 * lives in localStorage and belongs to whoever is looking.
 *
 * Progress for the counted ones is kept as sets rather than tallies, so
 * reading the same book twice does not move the bar.
 */

const STORE_KEY = "vale:deeds";

/** Distance on foot, in world units, that counts as having gone for a walk. */
const STROLL_DISTANCE = 300;

export type Deed =
  | { kind: "visit"; place: SectionKey }
  | { kind: "book"; key: string }
  | { kind: "patron"; key: string }
  | { kind: "floor"; index: number }
  | { kind: "lang"; lang: Lang }
  | { kind: "light"; night: number }
  | { kind: "walk"; distance: number }
  | { kind: "sit" }
  | { kind: "grimoire" }
  | { kind: "cat" }
  | { kind: "diagram" }
  | { kind: "orb" }
  | { kind: "sound" };

interface Progress {
  places: string[];
  books: string[];
  patrons: string[];
  langs: string[];
  walked: number;
}

interface Store {
  /** id -> ISO instant it was earned. */
  earned: Record<string, string>;
  progress: Progress;
}

const empty = (): Store => ({
  earned: {},
  progress: { places: [], books: [], patrons: [], langs: [], walked: 0 },
});

/**
 * The record, held in memory for the life of the page. It has to be: `record`
 * is called once a stride, and distance walked accumulates across calls. Reading
 * storage fresh each time would throw away every partial step.
 */
let cached: Store | null = null;

function read(): Store {
  if (cached) return cached;
  cached = load();
  return cached;
}

function load(): Store {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Partial<Store>;
    const base = empty();
    return {
      earned: { ...base.earned, ...(parsed.earned ?? {}) },
      progress: { ...base.progress, ...(parsed.progress ?? {}) },
    };
  } catch {
    // A private window, cleared data, or a shape from an older build: start over
    // rather than throwing on the way into the scene.
    return empty();
  }
}

function write(store: Store) {
  cached = store;
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    // Storage refused. The badges then last as long as the tab, which is a
    // smaller loss than a crash.
  }
}

/** Adds to a set, and says whether it was new. */
function add(list: string[], value: string): boolean {
  if (list.includes(value)) return false;
  list.push(value);
  return true;
}

const TOTAL = new Map(achievements.map((a) => [a.id, a.outOf ?? 1]));

/**
 * The whole record, plus what is earned. Reading is cheap and the scene needs
 * this on mount, so it is recomputed rather than cached.
 */
export interface Snapshot {
  earned: Record<string, string>;
  /** id -> how far along, for the counted ones. */
  counts: Record<string, number>;
}

function snapshotOf(store: Store): Snapshot {
  return {
    earned: store.earned,
    counts: {
      wanderer: store.progress.places.length,
      bookworm: store.progress.books.length,
      listener: store.progress.patrons.length,
      bilingual: store.progress.langs.length,
    },
  };
}

export function snapshot(): Snapshot {
  return snapshotOf(read());
}

export function totalOf(id: string): number {
  return TOTAL.get(id) ?? 1;
}

/**
 * Records something the visitor did and returns the ids of any badges that
 * became theirs because of it. Returns an empty array almost always, which is
 * the point: it is safe to call on every step.
 */
export function record(deed: Deed): string[] {
  const store = read();
  const p = store.progress;
  let changed = false;
  const win: string[] = [];

  const give = (id: string) => {
    if (store.earned[id]) return;
    store.earned[id] = new Date().toISOString();
    win.push(id);
    changed = true;
  };

  switch (deed.kind) {
    case "visit":
      if (add(p.places, deed.place)) changed = true;
      if (p.places.length >= 5) give("wanderer");
      break;
    case "book":
      if (add(p.books, deed.key)) changed = true;
      give("reader");
      if (p.books.length >= (TOTAL.get("bookworm") ?? 7)) give("bookworm");
      break;
    case "patron":
      if (add(p.patrons, deed.key)) changed = true;
      if (p.patrons.length >= 3) give("listener");
      break;
    case "lang":
      if (add(p.langs, deed.lang)) changed = true;
      if (p.langs.length >= 2) give("bilingual");
      break;
    case "floor":
      // The observatory is the tower's fifth room.
      if (deed.index >= 4) give("summit");
      break;
    case "light":
      if (deed.night > 0.6) give("nightowl");
      if (deed.night < 0.2) give("daybreak");
      break;
    case "walk": {
      const next = p.walked + deed.distance;
      // Only persist every so often: this arrives once a stride.
      if (Math.floor(next / 25) !== Math.floor(p.walked / 25)) changed = true;
      p.walked = next;
      if (next >= STROLL_DISTANCE) give("stroll");
      break;
    }
    case "sit":
      give("hearth");
      break;
    case "grimoire":
      give("grimoire");
      break;
    case "cat":
      give("cat");
      break;
    case "diagram":
      give("illustrated");
      break;
    case "orb":
      give("scryer");
      break;
    case "sound":
      give("earful");
      break;
  }

  if (changed) write(store);
  return win;
}
