import { t, type Lang } from "../../i18n/ui";
import { achievements } from "../../data/achievements";
import { totalOf, type Snapshot } from "./achievements";

/**
 * The noticeboard, read up close. Earned badges carry their icon and the date
 * they were taken; the rest sit dimmed with their hint showing, because a
 * locked badge that hides what it wants is just a locked door.
 */
export function DeedsPanel({
  lang,
  deeds,
  onClose,
}: {
  lang: Lang;
  deeds: Snapshot;
  onClose: () => void;
}) {
  const dict = t(lang);
  const earnedCount = achievements.filter((a) => deeds.earned[a.id]).length;

  const when = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === "pt" ? "pt-BR" : "en-GB", {
      day: "numeric",
      month: "short",
    });

  return (
    <div
      className="absolute inset-0 z-[20] flex items-center justify-center px-3 py-6 sm:px-6"
      role="dialog"
      aria-modal="true"
      aria-label={dict.world.deedsBoard}
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
            <h2 className="text-2xl font-bold tracking-tight">{dict.world.deedsBoard}</h2>
            <p className="mt-1 text-sm text-[#d99a3d]">
              {dict.world.deedsCount
                .replace("{n}", String(earnedCount))
                .replace("{total}", String(achievements.length))}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full border border-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/10"
          >
            {dict.interior.dialogClose}
          </button>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-[#9aa69d]">{dict.world.deedsNote}</p>

        <ul className="mt-6 space-y-2">
          {achievements.map((a) => {
            const at = deeds.earned[a.id];
            const total = totalOf(a.id);
            const count = deeds.counts[a.id] ?? 0;
            const partial = !at && total > 1 && count > 0;
            return (
              <li
                key={a.id}
                className={`flex items-start gap-3 rounded-xl border p-3 transition-colors ${
                  at
                    ? "border-[#d99a3d]/45 bg-[#d99a3d]/[0.07]"
                    : "border-white/10 bg-white/[0.02]"
                }`}
              >
                <span
                  aria-hidden
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-lg ${
                    at ? "bg-[#d99a3d]/20" : "bg-white/5 opacity-40 grayscale"
                  }`}
                >
                  {a.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p
                      className={`text-sm font-semibold ${
                        at ? "text-[#ece9dd]" : "text-[#8b948c]"
                      }`}
                    >
                      {a.name[lang]}
                    </p>
                    <span className="shrink-0 text-[11px] text-[#9aa69d]">
                      {at
                        ? when(at)
                        : partial
                          ? `${count}/${total}`
                          : dict.world.deedsLocked}
                    </span>
                  </div>
                  <p
                    className={`mt-0.5 text-xs leading-snug ${
                      at ? "text-[#c9cdc2]" : "text-[#7c857e]"
                    }`}
                  >
                    {a.hint[lang]}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
