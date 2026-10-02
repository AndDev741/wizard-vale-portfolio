/**
 * Bakes the writing kept in this repo into book pages for the Library, the same
 * way `fetch-library.mjs` bakes the Beyou docs. These texts have no home
 * anywhere else, so the book is the only way to read them.
 *
 * Each text is one markdown file in `writing/`, named by its key, with a small
 * front matter block:
 *
 *   ---
 *   title: "The title"
 *   summary: "One or two lines, optional"
 *   emoji: "🔬"
 *   date: 2026-09-30
 *   tags: [cpu, cache]
 *   ---
 *
 * `<key>.pt.md` beside it, when there is one, is the Portuguese edition. Without
 * it Portuguese readers get the English one. Images go in
 * `public/writing/<key>/` and are linked by their public path.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { paginate, readingMinutes } from "./leaves.mjs";

const SOURCE = new URL("../writing/", import.meta.url);
const PUBLIC = new URL("../public/", import.meta.url);
const OUT = new URL("../src/data/generated/ownTexts.json", import.meta.url);

const unquote = (value) => value.trim().replace(/^(["'])(.*)\1$/, "$2");

/** Flat `key: value` lines and `[a, b]` lists. Nothing here needs more YAML than that. */
function frontMatter(source) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source);
  if (!match) return { data: {}, body: source };
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = /^([\w-]+):\s*(.*)$/.exec(line);
    if (!field) continue;
    const value = field[2].trim();
    data[field[1]] =
      value.startsWith("[") && value.endsWith("]")
        ? value.slice(1, -1).split(",").map(unquote).filter(Boolean)
        : unquote(value);
  }
  return { data, body: source.slice(match[0].length) };
}

/** Width and height from a PNG's header. Other formats pay a flat cost instead. */
function imageSize(src) {
  if (!src.startsWith("/")) return null;
  let bytes;
  try {
    bytes = readFileSync(new URL(`.${src}`, PUBLIC));
  } catch {
    console.warn(`[writing] image not found in public/: ${src}`);
    return null;
  }
  const isPng = bytes.length > 24 && bytes.toString("latin1", 1, 4) === "PNG";
  return isPng ? { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) } : null;
}

async function edition(file, locale) {
  const { data, body } = frontMatter(await readFile(new URL(file, SOURCE), "utf8"));
  return {
    data,
    edition: {
      title: data.title ?? file,
      summary: data.summary || null,
      readingMinutes: readingMinutes(body),
      pages: paginate(body, locale, { imageSize, splitCode: true }),
    },
  };
}

async function main() {
  let files = [];
  try {
    files = (await readdir(SOURCE)).filter((f) => f.endsWith(".md"));
  } catch {
    // No writing folder: nothing of my own on the shelves yet.
  }

  const texts = {};
  for (const file of files.filter((f) => !f.endsWith(".pt.md"))) {
    const key = file.slice(0, -".md".length);
    const { data, edition: en } = await edition(file, "en");
    const date = data.date ? new Date(data.date) : null;
    texts[key] = {
      key,
      publishedAt: date && !Number.isNaN(date.valueOf()) ? date.toISOString() : null,
      coverEmoji: data.emoji ?? null,
      coverColor: data.color ?? null,
      tags: Array.isArray(data.tags) ? data.tags : [],
      en,
    };
    if (files.includes(`${key}.pt.md`)) {
      texts[key].pt = (await edition(`${key}.pt.md`, "pt")).edition;
    }
  }

  await writeFile(OUT, `${JSON.stringify({ texts }, null, 2)}\n`);
  const pageCount = Object.values(texts).reduce(
    (n, t) => n + t.en.pages.length + (t.pt?.pages.length ?? 0),
    0,
  );
  console.log(`[writing] ${Object.keys(texts).length} texts, ${pageCount} pages.`);
}

main();
