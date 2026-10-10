/**
 * The leaves are cut at build time for a leaf of one size, about 454 by 730px
 * of text. A window that gives the leaf less room than that would have the
 * reader scroll inside the page, and one that gives it more would leave blank
 * parchment at the foot. So the browser cuts them again for the leaf it actually
 * has: the same blocks, set one after another on a hidden leaf of that size, and
 * a new leaf started whenever the next block would not fit. The baked leaves are
 * what shows until that is done, and what a reader without scripts gets.
 */

/** The leaves cut for one size, and for each the baked block it starts with. */
export interface FittedLeaves {
  pages: string[];
  firstBlock: number[];
}

function parse(html: string): HTMLElement | null {
  const template = document.createElement("template");
  template.innerHTML = html;
  return template.content.firstElementChild as HTMLElement | null;
}

/** Every top-level block of the baked leaves, in reading order. */
export function blocksOf(pages: string[]): string[][] {
  return pages.map((html) => {
    const template = document.createElement("template");
    template.innerHTML = html;
    return [...template.content.children].map((el) => el.outerHTML);
  });
}

/** The baked leaves, described the way a fitted set is. */
export function bakedLeaves(pages: string[], blocks: string[][]): FittedLeaves {
  let at = 0;
  const firstBlock = blocks.map((leaf) => {
    const first = at;
    at += leaf.length;
    return first;
  });
  return { pages, firstBlock };
}

function naturalSize(src: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const done = () => resolve(img.naturalWidth ? { width: img.naturalWidth, height: img.naturalHeight } : null);
    img.onload = done;
    img.onerror = () => resolve(null);
    window.setTimeout(() => resolve(null), 4000);
    img.src = new URL(src, window.location.href).href;
  });
}

/**
 * Blocks whose height is only known once something has loaded, settled first so
 * the measuring is the same every time: a picture gets its pixel size, and a
 * diagram is drawn, since an inked plate is much taller than its caption.
 */
export async function settleBlocks(
  blocks: string[],
  inkPlate: (plate: HTMLElement) => Promise<void>,
): Promise<string[]> {
  return Promise.all(
    blocks.map(async (html) => {
      if (!html.includes("<img") && !html.includes("data-diagram")) return html;
      const el = parse(html);
      if (!el) return html;
      for (const img of el.querySelectorAll<HTMLImageElement>("img:not([height])")) {
        const size = await naturalSize(img.getAttribute("src") ?? "");
        if (size) {
          img.setAttribute("width", String(size.width));
          img.setAttribute("height", String(size.height));
        }
      }
      const plates = [
        ...(el.matches("figure[data-diagram]") ? [el] : []),
        ...el.querySelectorAll<HTMLElement>("figure[data-diagram]"),
      ];
      for (const plate of plates) {
        if (!plate.dataset.inked) await inkPlate(plate);
      }
      return el.outerHTML;
    }),
  );
}

/**
 * A block that can be broken across leaves, in units that are never cut: the
 * items of a list, the lines of a code block, the rows of a table (each piece
 * keeping the header). `make(from, to)` builds the piece holding those units.
 */
function breakable(el: HTMLElement): { units: number; least: number; make: (from: number, to: number) => HTMLElement } | null {
  if (el.tagName === "UL" || el.tagName === "OL") {
    const items = [...el.children];
    const start = Number(el.getAttribute("start") ?? 1);
    return {
      units: items.length,
      least: 2,
      make: (from, to) => {
        const piece = el.cloneNode(false) as HTMLElement;
        // A numbered list carries on counting from where the last leaf stopped.
        if (el.tagName === "OL" && from > 0) piece.setAttribute("start", String(start + from));
        items.slice(from, to).forEach((item) => piece.appendChild(item.cloneNode(true)));
        return piece;
      },
    };
  }
  const code = el.tagName === "PRE" ? el.querySelector("code") : null;
  if (code && el.children.length === 1) {
    const lines = (code.textContent ?? "").replace(/\n$/, "").split("\n");
    return {
      units: lines.length,
      least: 4,
      make: (from, to) => {
        const piece = el.cloneNode(false) as HTMLElement;
        const part = code.cloneNode(false) as HTMLElement;
        part.textContent = lines.slice(from, to).join("\n");
        piece.appendChild(part);
        return piece;
      },
    };
  }
  const body = el.tagName === "TABLE" ? el.querySelector("tbody") : null;
  if (body) {
    const head = el.querySelector("thead");
    const rows = [...body.children];
    return {
      units: rows.length,
      least: 2,
      make: (from, to) => {
        const piece = el.cloneNode(false) as HTMLElement;
        if (head) piece.appendChild(head.cloneNode(true));
        const part = body.cloneNode(false) as HTMLElement;
        rows.slice(from, to).forEach((row) => part.appendChild(row.cloneNode(true)));
        piece.appendChild(part);
        return piece;
      },
    };
  }
  return null;
}

const isHeading = (el: Element | null) => !!el && /^H[1-6]$/.test(el.tagName);

/**
 * Sets the blocks on leaves of `width` by `height`, measured on a hidden leaf
 * inside `host` so it is dressed by the same styles as the real ones.
 */
export function fitLeaves(blocks: string[], host: HTMLElement, width: number, height: number): FittedLeaves {
  const leaf = document.createElement("div");
  leaf.className = "book-page book-page--opening";
  leaf.setAttribute("aria-hidden", "true");
  Object.assign(leaf.style, {
    position: "absolute",
    left: "-10000px",
    top: "0",
    width: `${width}px`,
    height: `${height}px`,
    overflow: "hidden",
    visibility: "hidden",
  });
  host.appendChild(leaf);

  const pages: string[] = [];
  const firstBlock: number[] = [];
  let from: number[] = [];

  const overflows = () => leaf.scrollHeight > leaf.clientHeight + 1;
  /** Nothing on the leaf yet but, at most, the heading carried over to it. */
  const fresh = () =>
    leaf.childElementCount === 0 || (leaf.childElementCount === 1 && isHeading(leaf.firstElementChild));
  const add = (el: HTMLElement, index: number) => {
    leaf.appendChild(el);
    from.push(index);
  };
  const removeLast = () => {
    leaf.lastElementChild?.remove();
    from.pop();
  };
  const turn = () => {
    // A heading never ends a leaf: it goes over with what it introduces.
    const last = leaf.lastElementChild;
    const carry = leaf.childElementCount > 1 && isHeading(last) ? last : null;
    const carryFrom = from[from.length - 1];
    if (carry) removeLast();
    if (leaf.childElementCount) {
      pages.push(leaf.innerHTML);
      firstBlock.push(from[0]);
    }
    leaf.replaceChildren();
    leaf.className = "book-page";
    from = [];
    if (carry) add(carry as HTMLElement, carryFrom);
  };

  blocks.forEach((html, index) => {
    let block = parse(html);
    while (block) {
      add(block, index);
      if (!overflows()) break;
      removeLast();

      const parts = breakable(block);
      if (parts && parts.units > 1) {
        // As much as fits here, but never a stray unit on either side of the turn.
        let fits = 0;
        while (fits < parts.units) {
          add(parts.make(0, fits + 1), index);
          const over = overflows();
          removeLast();
          if (over) break;
          fits += 1;
        }
        fits = Math.min(fits, parts.units - 1);
        if (parts.units - fits < parts.least) fits = Math.max(0, parts.units - parts.least);
        // A leaf with nothing on it takes at least one unit, whatever it costs.
        if (fits >= Math.min(parts.least, parts.units) || fresh()) {
          const take = Math.max(fits, 1);
          add(parts.make(0, take), index);
          turn();
          block = parts.make(take, parts.units);
          continue;
        }
      }
      if (!fresh()) {
        turn();
        continue;
      }
      // Too tall for any leaf on its own: it goes alone, and that leaf scrolls.
      add(block, index);
      turn();
      block = null;
    }
  });
  if (leaf.childElementCount) {
    pages.push(leaf.innerHTML);
    firstBlock.push(from[0]);
  }
  leaf.remove();
  return { pages: pages.length ? pages : ["<p></p>"], firstBlock: firstBlock.length ? firstBlock : [0] };
}
