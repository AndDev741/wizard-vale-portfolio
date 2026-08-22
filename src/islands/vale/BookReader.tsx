import { useEffect, useMemo, useRef, useState } from "react";
import { t, type Lang } from "../../i18n/ui";
import { docsUrl, libraryLeaf } from "../../data/writingTopics";

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
    } catch {
      // The caption stays: "an illustration is being inked here".
    }
  });
}

/**
 * A text from the Beyou docs, read as a book rather than a web page. The content
 * is the real markdown, fetched through the docs API at build time and already
 * split into leaves, so turning a page is instant and nothing has to load.
 */
export function BookReader({
  lang,
  textKey,
  onClose,
  onBack,
}: {
  lang: Lang;
  textKey: string;
  onClose: () => void;
  onBack?: () => void;
}) {
  const dict = t(lang);
  const leaf = libraryLeaf(textKey, lang);
  const [spread, setSpread] = useState(0);
  const [twoUp, setTwoUp] = useState(true);
  const bookRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setTwoUp(window.innerWidth >= 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const perSpread = twoUp ? 2 : 1;
  const spreads = leaf ? Math.max(1, Math.ceil(leaf.pages.length / perSpread)) : 1;
  const clamped = Math.min(spread, spreads - 1);

  const shown = useMemo(() => {
    if (!leaf) return [];
    const from = clamped * perSpread;
    return leaf.pages.slice(from, from + perSpread).map((html, i) => ({
      html,
      index: from + i,
    }));
  }, [leaf, clamped, perSpread]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setSpread((s) => Math.min(spreads - 1, s + 1));
      if (e.key === "ArrowLeft") setSpread((s) => Math.max(0, s - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, spreads]);

  // Ink whatever plates the current leaves carry, each time a page turns.
  useEffect(() => {
    inkDiagrams(bookRef.current);
  }, [shown]);

  if (!leaf) return null;

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
        <a
          href={docsUrl(lang, leaf.key)}
          rel="noopener"
          target="_blank"
          className="shrink-0 text-xs text-[#e8dcc0]/70 underline hover:text-[#e8dcc0]"
        >
          {dict.interior.onTheDocs}
        </a>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSpread((s) => Math.max(0, s - 1))}
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
            onClick={() => setSpread((s) => Math.min(spreads - 1, s + 1))}
            disabled={clamped >= spreads - 1}
            className="rounded-full border border-[#e8dcc0]/30 px-4 py-1.5 text-sm font-semibold disabled:opacity-30 enabled:hover:bg-white/10"
          >
            {dict.interior.nextLeaf}
          </button>
        </div>
      </div>
    </div>
  );
}
