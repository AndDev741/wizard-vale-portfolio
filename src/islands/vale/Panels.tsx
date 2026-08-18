import { t, localizePath, type Lang, type SectionKey } from "../../i18n/ui";
import { quests } from "../../data/quests";
import { flagshipLinks, shelf } from "../../data/projects";
import { posts, postUrl } from "../../data/writing";
import { contact } from "../../data/contact";

interface PanelProps {
  lang: Lang;
  section: SectionKey;
  onClose: () => void;
  /** Given when this place has an interior, so it can be walked into. */
  onEnter?: () => void;
}

const linkClass =
  "inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-[#ece9dd] transition-colors hover:bg-white/10";

function PanelContent({ lang, section }: { lang: Lang; section: SectionKey }) {
  const dict = t(lang);

  if (section === "about") {
    return (
      <>
        <h2 className="text-2xl font-bold tracking-tight">{dict.about.title}</h2>
        <div className="mt-4 space-y-4">
          {dict.about.paragraphs.map((p, i) => (
            <p key={i} className="text-sm leading-relaxed text-[#c9cdc2]">
              {p}
            </p>
          ))}
        </div>
      </>
    );
  }

  if (section === "experience") {
    return (
      <>
        <h2 className="text-2xl font-bold tracking-tight">{dict.experience.title}</h2>
        <p className="mt-2 text-sm text-[#c9cdc2]">{dict.experience.role}</p>
        <div className="mt-5 space-y-5">
          {quests.map((q) => (
            <div key={q.title.en}>
              <h3 className="font-bold">{q.title[lang]}</h3>
              <p className="mt-1 text-sm leading-relaxed text-[#c9cdc2]">{q.body[lang]}</p>
              <p className="mt-1 text-sm font-semibold text-[#e0a44e]">{q.reward[lang]}</p>
            </div>
          ))}
        </div>
      </>
    );
  }

  if (section === "projects") {
    return (
      <>
        <h2 className="text-2xl font-bold tracking-tight">{dict.projects.flagshipName}</h2>
        <p className="mt-2 text-sm text-[#c9cdc2]">{dict.projects.flagshipTag}</p>
        <div className="mt-4 space-y-3">
          {dict.projects.flagshipFacts.map((f, i) => (
            <p key={i} className="text-sm leading-relaxed text-[#c9cdc2]">
              {f}
            </p>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <a
            href={flagshipLinks.app}
            rel="noopener"
            className="inline-flex items-center gap-2 rounded-full bg-[#d99a3d] px-4 py-2 text-sm font-bold text-[#221a0d] hover:opacity-90"
          >
            {dict.projects.liveApp}
          </a>
          <a href={flagshipLinks.docs} rel="noopener" className={linkClass}>
            {dict.projects.docs}
          </a>
          <a href={flagshipLinks.source} rel="noopener" className={linkClass}>
            {dict.projects.source}
          </a>
        </div>
        <h3 className="mt-8 font-bold">{dict.projects.shelfTitle}</h3>
        <ul className="mt-3 space-y-2">
          {shelf.map((item) => (
            <li key={item.name}>
              <a
                href={item.url}
                rel="noopener"
                className="text-sm font-semibold text-[#e0a44e] hover:underline"
              >
                {item.name}
              </a>
              <span className="text-xs text-[#9aa69d]"> · {item.lang} · {item.year}</span>
            </li>
          ))}
        </ul>
      </>
    );
  }

  if (section === "writing") {
    return (
      <>
        <h2 className="text-2xl font-bold tracking-tight">{dict.writing.title}</h2>
        <p className="mt-2 text-sm text-[#c9cdc2]">{dict.writing.sub}</p>
        <ul className="mt-5 space-y-4">
          {posts.map((post) => (
            <li key={post.key}>
              <a
                href={postUrl(lang, post.key)}
                rel="noopener"
                className="text-sm font-semibold leading-snug text-[#ece9dd] hover:text-[#e0a44e]"
              >
                {post.title[lang]}
              </a>
            </li>
          ))}
        </ul>
      </>
    );
  }

  return (
    <>
      <h2 className="text-2xl font-bold tracking-tight">{dict.contact.title}</h2>
      <p className="mt-2 text-sm text-[#c9cdc2]">{dict.contact.sub}</p>
      <div className="mt-5 flex flex-col items-start gap-2">
        <a
          href={`mailto:${contact.email}`}
          className="inline-flex items-center gap-2 rounded-full bg-[#d99a3d] px-4 py-2 text-sm font-bold text-[#221a0d] hover:opacity-90"
        >
          {dict.contact.email}
        </a>
        <a href={contact.github} rel="noopener" className={linkClass}>
          {dict.contact.github}
        </a>
        <a href={contact.linkedin} rel="noopener" className={linkClass}>
          {dict.contact.linkedin}
        </a>
      </div>
    </>
  );
}

export function Panel({ lang, section, onClose, onEnter }: PanelProps) {
  const dict = t(lang);
  const pageHref = section === "contact" ? null : localizePath(lang, `/${section}`);

  return (
    <aside
      role="dialog"
      aria-label={dict.world.places[section]}
      className="pointer-events-auto absolute inset-y-0 right-0 z-[8] w-full max-w-md overflow-y-auto border-l border-white/10 bg-[#10161a]/92 p-6 pt-20 text-[#ece9dd] backdrop-blur-md sm:p-8 sm:pt-24"
    >
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-semibold text-[#e0a44e]">
          {dict.world.places[section]}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/10"
        >
          {dict.world.close}
        </button>
      </div>
      {onEnter && (
        <button
          type="button"
          onClick={onEnter}
          className="mt-4 w-full rounded-full bg-[#d99a3d] px-4 py-2.5 text-sm font-bold text-[#221a0d] hover:opacity-90 active:scale-[0.99]"
        >
          {dict.interior.goInside}
        </button>
      )}
      <div className="mt-4">
        <PanelContent lang={lang} section={section} />
      </div>
      {pageHref && (
        <a
          href={pageHref}
          className="mt-8 inline-flex items-center gap-2 rounded-full border border-[#d99a3d]/60 px-4 py-2 text-sm font-bold text-[#e0a44e] hover:bg-white/5"
        >
          {dict.world.openPage}
        </a>
      )}
    </aside>
  );
}
