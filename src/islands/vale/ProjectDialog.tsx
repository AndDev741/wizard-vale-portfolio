import { useEffect } from "react";
import { t, type Lang } from "../../i18n/ui";
import { findProject, projectDetail } from "../../data/projectDetail";

/**
 * A project, read as a dialog in the middle of the screen rather than the side
 * drawer used out in the vale. Inside a building you are exploring, so the point
 * is to stop and look at one thing, then close it and carry on to the next.
 */
export function ProjectDialog({
  lang,
  project,
  onClose,
  onPick,
}: {
  lang: Lang;
  project: string;
  onClose: () => void;
  onPick: (key: string) => void;
}) {
  const dict = t(lang);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const detail = project === "all" ? null : findProject(project);

  return (
    <div
      className="absolute inset-0 z-[9] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={detail?.name ?? dict.interior.allTitle}
    >
      <button
        type="button"
        aria-label={dict.interior.dialogClose}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/65 backdrop-blur-sm"
      />
      <div className="relative max-h-[86%] w-full max-w-xl overflow-y-auto rounded-2xl border border-[#d99a3d]/40 bg-[#12161c]/95 p-6 text-[#ece9dd] shadow-[0_20px_70px_rgba(0,0,0,0.6)] sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            {detail ? (
              <>
                <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
                  {detail.name}
                </h2>
                <p className="mt-1 text-sm text-[#e0a44e]">{detail.tagline[lang]}</p>
                <p className="mt-1 text-xs text-[#9aa69d]">{detail.years}</p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
                  {dict.interior.allTitle}
                </h2>
                <p className="mt-1 text-sm text-[#e0a44e]">{dict.interior.allSub}</p>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full border border-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/10"
          >
            {dict.interior.dialogClose}
          </button>
        </div>

        {detail ? (
          <>
            <p className="mt-5 text-sm leading-relaxed text-[#c9cdc2]">
              {detail.blurb[lang]}
            </p>
            {detail.facts.length > 0 && (
              <div className="mt-5 space-y-3">
                {detail.facts.map((f, i) => (
                  <p
                    key={i}
                    className="border-l-2 border-[#d99a3d]/50 pl-3 text-sm leading-relaxed text-[#c9cdc2]"
                  >
                    {f[lang]}
                  </p>
                ))}
              </div>
            )}
            {detail.tech.length > 0 && (
              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#9aa69d]">
                  {dict.interior.techLabel}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {detail.tech.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/15 px-2.5 py-1 text-xs text-[#c9cdc2]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-6 flex flex-wrap gap-2">
              {detail.links.map((l, i) => (
                <a
                  key={l.url}
                  href={l.url}
                  rel="noopener"
                  target="_blank"
                  className={
                    i === 0
                      ? "inline-flex items-center rounded-full bg-[#d99a3d] px-4 py-2 text-sm font-bold text-[#221a0d] hover:opacity-90"
                      : "inline-flex items-center rounded-full border border-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/10"
                  }
                >
                  {l.label[lang]}
                </a>
              ))}
            </div>
          </>
        ) : (
          <ul className="mt-6 space-y-3">
            {projectDetail.map((p) => (
              <li key={p.key}>
                <button
                  type="button"
                  onClick={() => onPick(p.key)}
                  className="w-full rounded-xl border border-white/10 p-4 text-left transition-colors hover:border-[#d99a3d]/50 hover:bg-white/5"
                >
                  <span className="flex items-baseline gap-2">
                    <span className="font-bold">{p.name}</span>
                    <span className="ml-auto text-xs text-[#9aa69d]">{p.years}</span>
                  </span>
                  <span className="mt-1 block text-sm text-[#c9cdc2]">
                    {p.tagline[lang]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
