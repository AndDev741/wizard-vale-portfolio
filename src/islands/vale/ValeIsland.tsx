import { lazy, Suspense, useEffect, useState } from "react";
import type { Lang } from "../../i18n/ui";

const ValeApp = lazy(() => import("./ValeApp"));

function supported(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function ValeIsland({ lang }: { lang: Lang }) {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    if (supported()) setOk(true);
  }, []);
  if (!ok) return null;
  return (
    <Suspense fallback={null}>
      <ValeApp lang={lang} />
    </Suspense>
  );
}
