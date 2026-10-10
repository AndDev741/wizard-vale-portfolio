/**
 * Cuts a markdown text into book leaves for the Library. Shared by the two
 * places texts come from: the Beyou docs API (`fetch-library.mjs`) and the
 * markdown kept in this repo (`bake-writing.mjs`).
 */
import { marked } from "marked";

/**
 * Roughly what fits on one parchment leaf before it needs turning. Measured
 * against the rendered page rather than guessed: the first pass used a quarter of
 * this and left three quarters of every leaf blank.
 */
export const PAGE_BUDGET = 1750;
const HEADING_ORPHAN_LIMIT = 0.62;

/**
 * What a picture or a line of code costs, in the same units as prose. Measured
 * on a two-leaf spread: the budget fills about 730px of leaf, which is 2.4 per
 * pixel, and the text column is 454px wide. So an image drawn at full width
 * costs 1090 per unit of height over width, and a code line, which is 16.3px and
 * never wraps, pays for its height rather than its length.
 */
const IMAGE_COST_PER_ASPECT = 1090;
const IMAGE_MARGIN_COST = 40;
const IMAGE_UNKNOWN_COST = 700;
const CODE_LINE_COST = 39;
const CODE_BLOCK_COST = 75;
/** The fewest code lines worth starting at the foot of a leaf, or leaving on the next. */
const MIN_CODE_LINES = 6;
/** The same for the items of a list. */
const MIN_LIST_ITEMS = 2;

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

/** The images in a paragraph, whether they stand alone or sit in its text. */
function paragraphImages(token) {
  if (token.type !== "paragraph" || !token.tokens?.length) return [];
  return token.tokens.filter((t) => t.type === "image");
}

/**
 * Split rendered markdown into pages, breaking only between blocks.
 *
 * These are opt-in, so the docs texts keep the typesetting they were reviewed
 * in:
 * - `imageSize(src)` returns an image's pixel size, or null. Given it, an image
 *   pays for the height it takes, and its <img> carries its width and height.
 * - `splitCode` lets a code block too long for any single leaf carry on over the
 *   next ones, in pieces. Blocks that fit on a leaf are never cut.
 * - `splitLists` lets a list that does not fit in what is left of a leaf carry
 *   on over the next one, breaking between items. An item is never cut.
 * - `keepWithNext` turns the leaf before a heading when the block under it will
 *   not fit beside it, so a heading never sits alone over blank parchment while
 *   its table starts the next leaf.
 */
export function paginate(
  markdown,
  locale,
  { imageSize, splitCode = false, splitLists = false, keepWithNext = false } = {},
) {
  const tokens = marked.lexer(markdown ?? "").filter((t) => t.type !== "space");
  const pages = [];
  let current = "";
  let used = 0;

  const flush = () => {
    if (current.trim()) pages.push(current);
    current = "";
    used = 0;
  };

  const place = (html, cost, isHeading = false) => {
    // Do not leave a heading stranded at the foot of a page.
    const wouldOrphan = isHeading && used > PAGE_BUDGET * HEADING_ORPHAN_LIMIT;
    if (used > 0 && (used + cost > PAGE_BUDGET || wouldOrphan)) flush();
    current += html;
    used += cost;
  };

  const isDiagram = (token) => token.type === "code" && /^mermaid$/i.test(token.lang ?? "");
  const textCost = (token) => Math.max((token.raw ?? "").replace(/\s+/g, " ").trim().length, 40);
  const itemsCost = (items) => items.reduce((sum, item) => sum + textCost(item), 0);

  /** A paragraph with pictures in it, sized, and what it costs. Null without pictures. */
  const pictured = (token) => {
    const images = imageSize ? paragraphImages(token) : [];
    if (!images.length) return null;
    let html = marked.parser([token]);
    const words = images
      .reduce((raw, image) => raw.replace(image.raw, ""), token.raw ?? "")
      .replace(/\s+/g, " ")
      .trim();
    let cost = words.length;
    for (const image of images) {
      const size = imageSize(image.href);
      cost += size
        ? Math.round((IMAGE_COST_PER_ASPECT * size.height) / size.width) + IMAGE_MARGIN_COST
        : IMAGE_UNKNOWN_COST;
      if (size) {
        html = html.replace(
          `<img src="${image.href}"`,
          `<img src="${image.href}" width="${size.width}" height="${size.height}"`,
        );
      }
    }
    return { html, cost };
  };

  /** The least of a block that has to share a leaf with the heading above it. */
  const leadCost = (token) => {
    if (!token) return 0;
    if (isDiagram(token)) return 700;
    const picture = pictured(token);
    if (picture) return picture.cost;
    if (token.type === "code") {
      const lines = (token.text ?? "").split("\n").length;
      return CODE_BLOCK_COST + Math.min(lines, splitCode ? MIN_CODE_LINES : lines) * CODE_LINE_COST;
    }
    if (splitLists && token.type === "list") return itemsCost(token.items.slice(0, MIN_LIST_ITEMS));
    return textCost(token);
  };

  for (const [index, token] of tokens.entries()) {
    if (isDiagram(token)) {
      const source = Buffer.from(token.text ?? "", "utf8").toString("base64");
      const label = PLATE_LABEL[locale] ?? PLATE_LABEL.en;
      // A drawn diagram takes real page height, so it pays more than its caption.
      place(
        `<figure class="book-plate book-plate--diagram" data-diagram="${source}"><span>${label}</span></figure>`,
        700,
      );
      continue;
    }

    const picture = pictured(token);
    if (picture) {
      place(picture.html, picture.cost);
      continue;
    }

    if (splitCode && token.type === "code") {
      const lines = (token.text ?? "").split("\n");
      const perLeaf = Math.floor((PAGE_BUDGET - CODE_BLOCK_COST) / CODE_LINE_COST);
      const piece = (from, to) =>
        marked.parser([{ ...token, text: lines.slice(from, to).join("\n") }]);

      if (lines.length <= perLeaf) {
        place(piece(0, lines.length), CODE_BLOCK_COST + lines.length * CODE_LINE_COST);
        continue;
      }
      // Too long for any leaf: fill what is left of this one, then carry on.
      let start = 0;
      while (start < lines.length) {
        let room = Math.floor((PAGE_BUDGET - used - CODE_BLOCK_COST) / CODE_LINE_COST);
        const left = lines.length - start;
        // Leave enough behind that the last piece is more than a stub.
        if (left > room && left - room < MIN_CODE_LINES) room = left - MIN_CODE_LINES;
        if (room < MIN_CODE_LINES) {
          flush();
          continue;
        }
        const take = Math.min(left, room);
        current += piece(start, start + take);
        used += CODE_BLOCK_COST + take * CODE_LINE_COST;
        start += take;
        if (start < lines.length) flush();
      }
      continue;
    }

    if (splitLists && token.type === "list" && used + textCost(token) > PAGE_BUDGET) {
      const { items } = token;
      const piece = (from, to) =>
        marked.parser([
          {
            ...token,
            items: items.slice(from, to),
            // A numbered list carries on counting from where the last leaf stopped.
            start: token.ordered ? Number(token.start || 1) + from : token.start,
          },
        ]);
      let start = 0;
      while (start < items.length) {
        let take = 0;
        while (
          start + take < items.length &&
          used + itemsCost(items.slice(start, start + take + 1)) <= PAGE_BUDGET
        ) {
          take++;
        }
        const left = items.length - start;
        // Leave enough behind that the next leaf does not start with a stray item.
        if (take < left && left - take < MIN_LIST_ITEMS) take = left - MIN_LIST_ITEMS;
        if (take < Math.min(MIN_LIST_ITEMS, left) && used > 0) {
          flush();
          continue;
        }
        // An item longer than a whole leaf still has to go somewhere.
        take = Math.max(take, 1);
        current += piece(start, start + take);
        used += itemsCost(items.slice(start, start + take));
        start += take;
        if (start < items.length) flush();
      }
      continue;
    }

    const isHeading = token.type === "heading";
    const cost = textCost(token);
    if (keepWithNext && isHeading && used > 0) {
      const next = Math.min(leadCost(tokens[index + 1]), PAGE_BUDGET);
      if (used + cost + next > PAGE_BUDGET) flush();
    }
    place(marked.parser([token]), cost, isHeading);
  }
  flush();
  return pages.length ? pages : ["<p></p>"];
}

export function readingMinutes(markdown) {
  const words = (markdown ?? "").trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}
