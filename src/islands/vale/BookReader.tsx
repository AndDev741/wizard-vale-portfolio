import { useEffect, useMemo, useRef, useState } from "react";
import { t, type Lang } from "../../i18n/ui";
import type { LibraryLeaf } from "../../data/writingTopics";

/**
 * The diagrams. A leaf can carry an illustration plate whose data attribute
 * holds a mermaid source (put there at build time), and this inks it: mermaid is
 * imported only when a plate is actually on screen, themed to the parchment, and
 * the drawn SVG replaces the plate's caption. A plate that fails to draw keeps
 * its caption, which is what the plate said anyway.
 */
let mermaidReady: Promise<typeof import("mermaid")["default"]> | null = null;

function loadMermaid() {
  mermaidReady ??= import("mermaid").then((mod) => {
    mod.default.initialize({
      startOnLoad: false,
      theme: "base",
      themeVariables: {
        background: "transparent",
        primaryColor: "#e9dbb6",
        primaryBorderColor: "#7a5a2a",
        primaryTextColor: "#3d2f1e",
        secondaryColor: "#dfcfa4",
        tertiaryColor: "#e4d5ae",
        lineColor: "#6b4e22",
        textColor: "#3d2f1e",
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: "14px",
      },
    });
    return mod.default;
  });
  return mermaidReady;
}

let inkCounter = 0;

/** Draws one diagram source into a container, at its own id. */
async function drawInto(host: HTMLElement | null, source: string) {
  if (!host) return;
  try {
    const mermaid = await loadMermaid();
    inkCounter += 1;
    const { svg } = await mermaid.render(`book-zoom-${inkCounter}`, source);
    host.innerHTML = svg;
  } catch {
    host.textContent = "";
  }
}

function inkDiagrams(root: HTMLElement | null) {
  if (!root) return;
  const plates = root.querySelectorAll<HTMLElement>(
    "figure[data-diagram]:not([data-inked])",
  );
  plates.forEach(async (plate) => {
    plate.dataset.inked = "1";
    try {
      const bytes = Uint8Array.from(atob(plate.dataset.diagram ?? ""), (c) =>
        c.charCodeAt(0),
      );
      const source = new TextDecoder().decode(bytes);
      const mermaid = await loadMermaid();
      inkCounter += 1;
      const { svg } = await mermaid.render(`book-diagram-${inkCounter}`, source);
      plate.innerHTML = svg;
      plate.classList.add("book-plate--inked");
      // Small diagrams are unreadable at leaf width, so the plate opens.
      plate.setAttribute("role", "button");
      plate.setAttribute("tabindex", "0");
    } catch {
      // The caption stays: "an illustration is being inked here".
    }
  });
}

/** Charts and pictures on a leaf open full size too, from the keyboard as well. */
function markImages(root: HTMLElement | null, label: string) {
  root?.querySelectorAll<HTMLImageElement>(".book-page img:not([tabindex])").forEach((img) => {
    img.tabIndex = 0;
    img.title = label;
  });
}

/** What is open full size: a diagram drawn from its source, or an image. */
type Zoom = { kind: "diagram"; source: string } | { kind: "image"; src: string; alt: string };

/**
 * A text from the shelves, read as a book rather than a web page. The content is
 * the real markdown, split into leaves at build time, so turning a page is
 * instant and nothing has to load. It takes the leaf itself rather than a key,
 * so a page that shows one book does not carry the whole library with it.
 */
export function BookReader({
  lang,
  leaf,
  onClose,
  onBack,
  onTurn,
  onEnlarge,
}: {
  lang: Lang;
  leaf: LibraryLeaf;
  onClose: () => void;
  onBack?: () => void;
  /** A leaf turning. In the library it is most of the soundtrack. */
  onTurn?: () => void;
  /** A diagram or a chart opened full size. */
  onEnlarge?: () => void;
}) {
  const dict = t(lang);
  const [spread, setSpread] = useState(0);
  const [twoUp, setTwoUp] = useState(true);
  const [zoomed, setZoomed] = useState<Zoom | null>(null);
  const bookRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setTwoUp(window.innerWidth >= 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const perSpread = twoUp ? 2 : 1;
  const spreads = Math.max(1, Math.ceil(leaf.pages.length / perSpread));
  const clamped = Math.min(spread, spreads - 1);

  const shown = useMemo(() => {
    const from = clamped * perSpread;
    return leaf.pages.slice(from, from + perSpread).map((html, i) => ({
      html,
      index: from + i,
    }));
  }, [leaf, clamped, perSpread]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // The vale listens for Escape as well, and would act on whatever is
        // behind: the book behind a diagram, or the panel or building behind the
        // book. Capture phase plus this closes one layer per press.
        e.stopPropagation();
        if (zoomed) setZoomed(null);
        else onClose();
        return;
      }
      if (zoomed) return;
      if (e.key === "ArrowRight") {
        setSpread((s) => {
          const next = Math.min(spreads - 1, s + 1);
          if (next !== s) onTurn?.();
          return next;
        });
      }
      if (e.key === "ArrowLeft") {
        setSpread((s) => {
          const next = Math.max(0, s - 1);
          if (next !== s) onTurn?.();
          return next;
        });
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose, spreads, zoomed, onTurn]);

  // Drawn large, from the source rather than by copying the leaf's SVG: mermaid
  // wires its arrowheads to ids inside the document, and two copies would fight.
  useEffect(() => {
    if (zoomed?.kind === "diagram") drawInto(zoomRef.current, zoomed.source);
  }, [zoomed]);

  /** A plate or an image anywhere in the open book opens it full size. */
  const openPlate = (target: EventTarget | null) => {
    const el = target as HTMLElement | null;
    if (el instanceof HTMLImageElement && el.closest(".book-page")) {
      setZoomed({ kind: "image", src: el.currentSrc || el.src, alt: el.alt });
      onEnlarge?.();
      return;
    }
    const plate = el?.closest<HTMLElement>("figure[data-diagram]");
    if (!plate?.classList.contains("book-plate--inked")) return;
    try {
      const bytes = Uint8Array.from(atob(plate.dataset.diagram ?? ""), (c) =>
        c.charCodeAt(0),
      );
      setZoomed({ kind: "diagram", source: new TextDecoder().decode(bytes) });
      onEnlarge?.();
    } catch {
      // Nothing to open: the plate keeps its caption.
    }
  };

  const onBookKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      // Space would scroll the leaf as well as opening what is focused.
      if (e.target instanceof HTMLImageElement) e.preventDefault();
      openPlate(e.target);
    }
  };

  // Ink whatever plates the current leaves carry, each time a page turns.
  useEffect(() => {
    inkDiagrams(bookRef.current);
    markImages(bookRef.current, dict.interior.enlarge);
  }, [shown, dict]);

  return (
    <div
      className="absolute inset-0 z-[30] flex flex-col items-center justify-center gap-3 px-3 pb-4 pt-[4.5rem] sm:px-6 sm:pb-6"
      role="dialog"
      aria-modal="true"
      aria-label={leaf.title}
    >
      <button
        type="button"
        aria-label={dict.interior.dialogClose}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/75 backdrop-blur-sm"
      />

      <div className="relative flex w-full max-w-5xl items-center justify-between gap-3 text-[#e8dcc0]">
        <p className="min-w-0 truncate text-sm font-semibold sm:text-base">
          <span className="mr-2">{leaf.coverEmoji}</span>
          {leaf.title}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="rounded-full border border-[#e8dcc0]/30 px-3 py-1 text-xs font-semibold hover:bg-white/10"
            >
              {dict.interior.backToShelf}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#e8dcc0]/30 px-3 py-1 text-xs font-semibold hover:bg-white/10"
          >
            {dict.interior.dialogClose}
          </button>
        </div>
      </div>

      {/* The open book: two leaves on a wide screen, one on a narrow one. */}
      <div
        ref={bookRef}
        onClick={(e) => openPlate(e.target)}
        onKeyDown={onBookKey}
        className="relative flex w-full max-w-5xl flex-1 gap-0 overflow-hidden rounded-lg shadow-[0_24px_80px_rgba(0,0,0,0.7)]"
      >
        {shown.map((page, i) => (
          <div
            key={page.index}
            className={`book-leaf ${i === 0 && shown.length > 1 ? "book-leaf--left" : ""} ${
              i === 1 ? "book-leaf--right" : ""
            }`}
          >
            <div
              className={`book-page ${page.index === 0 ? "book-page--opening" : ""}`}
              dangerouslySetInnerHTML={{ __html: page.html }}
            />
            <span className="book-folio">{page.index + 1}</span>
          </div>
        ))}
      </div>

      <div className="relative flex w-full max-w-5xl items-center justify-between gap-3 text-[#e8dcc0]">
        {leaf.docsUrl ? (
          <a
            href={leaf.docsUrl}
            rel="noopener"
            target="_blank"
            className="shrink-0 text-xs text-[#e8dcc0]/70 underline hover:text-[#e8dcc0]"
          >
            {dict.interior.onTheDocs}
          </a>
        ) : leaf.lang !== lang ? (
          <p className="min-w-0 text-xs text-[#e8dcc0]/70">{dict.interior.onlyInEnglish}</p>
        ) : (
          // Nothing lives anywhere else, and the turning controls stay on the right.
          <span />
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSpread((s) => Math.max(0, s - 1));
              onTurn?.();
            }}
            disabled={clamped === 0}
            className="rounded-full border border-[#e8dcc0]/30 px-4 py-1.5 text-sm font-semibold disabled:opacity-30 enabled:hover:bg-white/10"
          >
            {dict.interior.prevLeaf}
          </button>
          <p className="w-24 text-center text-xs text-[#e8dcc0]/70">
            {dict.interior.leafOf
              .replace("{n}", String(clamped + 1))
              .replace("{total}", String(spreads))}
          </p>
          <button
            type="button"
            onClick={() => {
              setSpread((s) => Math.min(spreads - 1, s + 1));
              onTurn?.();
            }}
            disabled={clamped >= spreads - 1}
            className="rounded-full border border-[#e8dcc0]/30 px-4 py-1.5 text-sm font-semibold disabled:opacity-30 enabled:hover:bg-white/10"
          >
            {dict.interior.nextLeaf}
          </button>
        </div>
      </div>

      {/* One diagram, as large as the screen allows. Some of them are drawn with
          a dozen boxes, and a leaf is not wide enough to read those. */}
      {zoomed && (
        // Anywhere on this closes it. The diagram covers nearly the whole
        // screen, so a click on the parchment is the obvious way out and used
        // to do nothing at all.
        <div
          className="fixed inset-0 z-[40] flex cursor-zoom-out flex-col items-center justify-center gap-3 bg-[#0b0f0d] px-3 pb-4 pt-[4.5rem] sm:px-6 sm:pb-6"
          role="dialog"
          aria-modal="true"
          aria-label={dict.interior.enlarge}
          onClick={() => setZoomed(null)}
        >
          <div className="flex w-full max-w-6xl items-center justify-between gap-3 text-[#e8dcc0]">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{leaf.title}</p>
              <p className="mt-0.5 truncate text-xs text-[#e8dcc0]/60">
                {dict.interior.zoomHint}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setZoomed(null)}
              className="shrink-0 rounded-full border border-[#e8dcc0]/40 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/15"
            >
              ✕ {dict.interior.closeDiagram}
            </button>
          </div>
          {zoomed.kind === "image" ? (
            <div className="book-zoom w-full max-w-6xl min-h-0 flex-1 overflow-hidden rounded-lg p-4">
              <img src={zoomed.src} alt={zoomed.alt} className="book-zoom-image" />
            </div>
          ) : (
            <div
              ref={zoomRef}
              className="book-zoom w-full max-w-6xl min-h-0 flex-1 overflow-hidden rounded-lg p-4"
            />
          )}
        </div>
      )}
    </div>
  );
}
