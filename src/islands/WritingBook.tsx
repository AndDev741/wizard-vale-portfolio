import { useCallback, useEffect, useRef, useState } from "react";
import type { Lang } from "../i18n/ui";
import type { LibraryLeaf } from "../data/writingTopics";
import { BookReader } from "./vale/BookReader";

const PREFIX = "#read-";

/**
 * The Library's book, on the plain Writing page. Writing that lives only on this
 * site has nowhere to link out to, so its card links to `#read-<key>` and this
 * opens the book over the page. The hash makes an open book a link of its own,
 * and Back closes it.
 */
export default function WritingBook({ lang, leaves }: { lang: Lang; leaves: LibraryLeaf[] }) {
  const [open, setOpen] = useState<LibraryLeaf | null>(null);
  // Opened by a click on this page, so there is an entry in history to go back to.
  const pushed = useRef(false);

  useEffect(() => {
    const sync = () => {
      const hash = location.hash;
      const key = hash.startsWith(PREFIX) ? decodeURIComponent(hash.slice(PREFIX.length)) : null;
      setOpen(leaves.find((leaf) => leaf.key === key) ?? null);
    };
    const onHash = () => {
      pushed.current = location.hash.startsWith(PREFIX);
      sync();
    };
    sync();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [leaves]);

  useEffect(() => {
    if (!open) return;
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = before;
    };
  }, [open]);

  const close = useCallback(() => {
    if (pushed.current) {
      pushed.current = false;
      history.back();
    } else {
      // Arrived with the book already open: nothing of ours to go back to.
      history.replaceState(null, "", location.pathname + location.search);
      setOpen(null);
    }
  }, []);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60]">
      <BookReader lang={lang} leaf={open} onClose={close} />
    </div>
  );
}
