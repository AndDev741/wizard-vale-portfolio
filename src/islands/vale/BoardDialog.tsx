import { useEffect } from "react";
import { t, type Lang } from "../../i18n/ui";
import { findProject, projectDetail } from "../../data/projectDetail";
import {
  findTopic,
  libraryLeaf,
  textsFetchedAt,
  writingTopics,
} from "../../data/writingTopics";
import { findNpc, experienceNpcs } from "../../data/experienceNpcs";
import { findCottageObject } from "../../data/cottageObjects";
import { localizeYears, subjectKey, subjectKind } from "./boardSubject";

/**
 * Whatever a board holds, read as a dialog in the middle of the screen rather
 * than the side drawer used out in the vale. Inside a building you are exploring,
 * so the point is to stop and look at one thing, then close it and carry on.
 *
 * The subject decides what it shows: a project, the list of projects, a shelf of
 * writing, or the library's whole index.
 */
export function BoardDialog({
  lang,
  subject,
  onClose,
  onPick,
  onBack,
}: {
  lang: Lang;
  subject: string;
  onClose: () => void;
  onPick: (subject: string) => void;
  /** Set when this dialog was opened from a list, to offer the way back. */
  onBack?: () => void;
}) {
  const dict = t(lang);
  const kind = subjectKind(subject);
  const key = subjectKey(subject);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);



  const project = kind === "project" ? findProject(key) : undefined;
  const topic = kind === "topic" ? findTopic(key) : undefined;
  const npc = kind === "npc" ? findNpc(key) : undefined;
  const story = kind === "story" ? findCottageObject(key) : undefined;

  const title =
    project?.name ??
    topic?.title[lang] ??
    npc?.name[lang] ??
    story?.title[lang] ??
    (kind === "npcs"
      ? dict.interior.rosterTitle
      : kind === "topics"
        ? dict.interior.indexTitle
        : dict.interior.allTitle);
  const subtitle =
    project?.tagline[lang] ??
    topic?.blurb[lang] ??
    npc?.role[lang] ??
    story?.subtitle[lang] ??
    (kind === "npcs"
      ? dict.interior.rosterSub
      : kind === "topics"
        ? dict.interior.indexSub
        : dict.interior.allSub);

  return (
    <div
      className="absolute inset-0 z-[30] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
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
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl">{title}</h2>
            <p className="mt-1 text-sm text-[#e0a44e]">{subtitle}</p>
            {project && (
              <p className="mt-1 text-xs text-[#9aa69d]">
                {localizeYears(project.years, lang)}
              </p>
            )}
            {npc && (
              <p className="mt-1 text-xs text-[#9aa69d]">
                {localizeYears(npc.years, lang)}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/10"
              >
                {dict.interior.backToList}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/10"
            >
              {dict.interior.dialogClose}
            </button>
          </div>
        </div>

        {project && (
          <>
            <p className="mt-5 text-sm leading-relaxed text-[#c9cdc2]">
              {project.blurb[lang]}
            </p>
            {project.facts.length > 0 && (
              <div className="mt-5 space-y-3">
                {project.facts.map((f, i) => (
                  <p
                    key={i}
                    className="border-l-2 border-[#d99a3d]/50 pl-3 text-sm leading-relaxed text-[#c9cdc2]"
                  >
                    {f[lang]}
                  </p>
                ))}
              </div>
            )}
            {project.tech.length > 0 && (
              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#9aa69d]">
                  {dict.interior.techLabel}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {project.tech.map((tag) => (
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
              {project.links.map((l, i) => (
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
        )}

        {npc && (
          <>
            {/* Their words, set as speech. */}
            <p className="mt-5 border-l-2 border-[#d99a3d]/60 pl-4 text-sm italic leading-relaxed text-[#e5e0d2]">
              &ldquo;{npc.speech[lang]}&rdquo;
            </p>
            <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-[#9aa69d]">
              {dict.interior.deedsLabel}
            </p>
            <ul className="mt-3 space-y-2.5">
              {npc.deeds.map((deed, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-[#c9cdc2]">
                  <span aria-hidden className="mt-[0.1rem] shrink-0 text-[#d99a3d]">
                    &bull;
                  </span>
                  <span>{deed[lang]}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#9aa69d]">
                {dict.interior.techLabel}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {npc.tech.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/15 px-2.5 py-1 text-xs text-[#c9cdc2]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-6">
              <a
                href={npc.link.url}
                rel="noopener"
                target="_blank"
                className="inline-flex items-center rounded-full bg-[#d99a3d] px-4 py-2 text-sm font-bold text-[#221a0d] hover:opacity-90"
              >
                {npc.link.label[lang]}
              </a>
            </div>
          </>
        )}

        {story && (
          <>
            {story.paragraphs.map((para, i) => (
              <p key={i} className="mt-4 text-sm leading-relaxed text-[#c9cdc2]">
                {para[lang]}
              </p>
            ))}
            {story.facts && (
              <ul className="mt-5 space-y-2">
                {story.facts.map((fact, i) => (
                  <li
                    key={i}
                    className="flex gap-2.5 text-sm leading-relaxed text-[#9aa69d]"
                  >
                    <span aria-hidden className="mt-[0.1rem] shrink-0 text-[#d99a3d]">
                      &bull;
                    </span>
                    <span>{fact[lang]}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {kind === "npcs" && (
          // The hall's catalogue: who is standing where, and why.
          <div className="mt-5 space-y-3">
            {experienceNpcs.map((patron) => (
              <button
                key={patron.key}
                type="button"
                onClick={() => onPick(`npc:${patron.key}`)}
                className="block w-full rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition-colors hover:border-[#d99a3d]/50 hover:bg-white/[0.06]"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-semibold text-[#ece9dd]">{patron.name[lang]}</p>
                  <p className="shrink-0 text-xs text-[#9aa69d]">
                    {localizeYears(patron.years, lang)}
                  </p>
                </div>
                <p className="mt-1 text-xs text-[#d99a3d]">{patron.role[lang]}</p>
                <p className="mt-2 text-sm leading-relaxed text-[#c9cdc2]">
                  {patron.tagline[lang]}
                </p>
              </button>
            ))}
          </div>
        )}

        {kind === "projects" && (
          <ul className="mt-6 space-y-3">
            {projectDetail.map((p) => (
              <li key={p.key}>
                <button
                  type="button"
                  onClick={() => onPick(`project:${p.key}`)}
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

        {topic && <TextList lang={lang} keys={topic.texts} onPick={onPick} />}

        {kind === "topics" && (
          <div className="mt-6 space-y-6">
            {writingTopics.map((tp) => (
              <div key={tp.key}>
                <h3 className="text-sm font-bold text-[#e0a44e]">{tp.title[lang]}</h3>
                <TextList lang={lang} keys={tp.texts} onPick={onPick} compact />
              </div>
            ))}
          </div>
        )}

        {(topic || kind === "topics") && textsFetchedAt && (
          <p className="mt-6 text-xs text-[#9aa69d]">
            {dict.interior.fromDocs.replace(
              "{date}",
              new Date(textsFetchedAt).toLocaleDateString(lang === "pt" ? "pt-BR" : "en-US"),
            )}
          </p>
        )}
      </div>
    </div>
  );
}

/** The texts on one shelf, each opening as a book. */
function TextList({
  lang,
  keys,
  onPick,
  compact = false,
}: {
  lang: Lang;
  keys: string[];
  onPick: (subject: string) => void;
  compact?: boolean;
}) {
  const dict = t(lang);
  return (
    <ul className={compact ? "mt-2 space-y-2" : "mt-6 space-y-3"}>
      {keys.map((k) => {
        const leaf = libraryLeaf(k, lang);
        if (!leaf) return null;
        return (
          <li key={k}>
            <button
              type="button"
              onClick={() => onPick(`text:${k}`)}
              className="w-full rounded-xl border border-white/10 p-4 text-left transition-colors hover:border-[#d99a3d]/50 hover:bg-white/5"
            >
              <span className="flex items-baseline gap-2">
                <span aria-hidden="true">{leaf.coverEmoji}</span>
                <span className="font-bold leading-snug">{leaf.title}</span>
              </span>
              <span className="mt-1 block text-xs text-[#9aa69d]">
                {dict.interior.leaves
                  .replace("{pages}", String(leaf.pages.length))
                  .replace("{minutes}", String(leaf.readingMinutes))}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
