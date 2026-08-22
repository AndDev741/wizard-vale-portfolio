/**
 * Pulls the Beyou docs blog through its public API and writes it into the repo
 * as book pages, ready for the Library to read.
 *
 * Fetched at build time rather than in the browser for two reasons. The docs API
 * only answers same-origin requests, by design, so a browser on the portfolio's
 * domain gets "Invalid CORS request"; and the backend lives on a laptop, so a
 * runtime dependency would mean the Library breaks whenever that machine is off.
 * Baked in, it always renders, and refreshes on the next deploy.
 *
 * If the API cannot be reached the existing file is kept and the build carries on.
 */
import { readFile, writeFile } from "node:fs/promises";
import { marked } from "marked";

const API = process.env.BEYOU_DOCS_API ?? "https://docs.beyouweb.com/api/v1";
const OUT = new URL("../src/data/generated/libraryTexts.json", import.meta.url);
const LOCALES = ["en", "pt"];
/**
 * Roughly what fits on one parchment leaf before it needs turning. Measured
 * against the rendered page rather than guessed: the first pass used a quarter of
 * this and left three quarters of every leaf blank.
 */
const PAGE_BUDGET = 1750;
const HEADING_ORPHAN_LIMIT = 0.62;

async function getJson(path) {
  const res = await fetch(`${API}${path}`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`${res.status} on ${path}`);
  return res.json();
}

/**
 * A mermaid fence is a diagram, and its source rendered as text on a book page
 * is gibberish. It becomes an illustration plate that carries the diagram's
 * source with it (base64, in a data attribute), so the reader can draw the real
 * diagram in the browser. Until that happens, or if it fails, the plate shows
 * this caption instead.
 */
const PLATE_LABEL = {
  en: "An illustration is being inked here.",
  pt: "Uma ilustração está sendo desenhada aqui.",
};

/** Split rendered markdown into pages, breaking only between blocks. */
function paginate(markdown, locale) {
  const tokens = marked.lexer(markdown ?? "");
  const pages = [];
  let current = "";
  let used = 0;

  const flush = () => {
    if (current.trim()) pages.push(current);
    current = "";
    used = 0;
  };

  for (const token of tokens) {
    if (token.type === "space") continue;
    const isDiagram = token.type === "code" && /^mermaid$/i.test(token.lang ?? "");
    const html = isDiagram
      ? `<figure class="book-plate book-plate--diagram" data-diagram="${Buffer.from(
          token.text ?? "",
          "utf8",
        ).toString("base64")}"><span>${PLATE_LABEL[locale] ?? PLATE_LABEL.en}</span></figure>`
      : marked.parser([token]);
    const text = isDiagram ? "" : (token.raw ?? "").replace(/\s+/g, " ").trim();
    // A drawn diagram takes real page height, so it pays more than its caption.
    const cost = isDiagram ? 700 : Math.max(text.length, 40);

    // Do not leave a heading stranded at the foot of a page.
    const isHeading = token.type === "heading";
    const wouldOrphan = isHeading && used > PAGE_BUDGET * HEADING_ORPHAN_LIMIT;
    if (used > 0 && (used + cost > PAGE_BUDGET || wouldOrphan)) flush();

    current += html;
    used += cost;
  }
  flush();
  return pages.length ? pages : ["<p></p>"];
}

function readingMinutes(markdown) {
  const words = (markdown ?? "").trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

async function main() {
  const texts = {};
  try {
    for (const locale of LOCALES) {
      const list = await getJson(`/docs/blog/topics?locale=${locale}`);
      for (const item of list) {
        const detail = await getJson(
          `/docs/blog/topics/${encodeURIComponent(item.key)}?locale=${locale}`,
        );
        const entry = (texts[item.key] ??= {
          key: item.key,
          publishedAt: item.publishedAt ?? null,
          coverEmoji: item.coverEmoji ?? null,
          coverColor: item.coverColor ?? null,
          tags: item.tags ? JSON.parse(item.tags) : [],
        });
        entry[locale] = {
          title: detail.title ?? item.title,
          summary: item.summary ?? null,
          readingMinutes: readingMinutes(detail.docMarkdown),
          pages: paginate(detail.docMarkdown, locale),
        };
      }
    }
  } catch (error) {
    console.warn(`[library] docs API unreachable (${error.message}).`);
    try {
      await readFile(OUT);
      console.warn("[library] keeping the copy already in the repo.");
      return;
    } catch {
      console.warn("[library] no copy in the repo either; writing an empty set.");
      await writeFile(OUT, JSON.stringify({ fetchedAt: null, texts: {} }, null, 2));
      return;
    }
  }

  const keys = Object.keys(texts);
  if (!keys.length) {
    console.warn("[library] the API returned nothing; leaving the current file alone.");
    return;
  }
  // A stamp, so it is obvious how old the baked copy is.
  const payload = { fetchedAt: new Date().toISOString(), texts };
  await writeFile(OUT, `${JSON.stringify(payload, null, 2)}\n`);
  const pageCount = keys.reduce(
    (n, k) => n + (texts[k].en?.pages.length ?? 0) + (texts[k].pt?.pages.length ?? 0),
    0,
  );
  console.log(`[library] ${keys.length} texts, ${pageCount} pages, both languages.`);
}

main();
