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
import { paginate, readingMinutes } from "./leaves.mjs";

const API = process.env.BEYOU_DOCS_API ?? "https://docs.beyouweb.com/api/v1";
const OUT = new URL("../src/data/generated/libraryTexts.json", import.meta.url);
const LOCALES = ["en", "pt"];

async function getJson(path) {
  const res = await fetch(`${API}${path}`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`${res.status} on ${path}`);
  return res.json();
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
