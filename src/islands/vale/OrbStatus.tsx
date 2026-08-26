import { useEffect, useState } from "react";
import { t, type Lang } from "../../i18n/ui";

/**
 * What the orb actually shows: the live state of everything Beyou runs, read
 * through this site's own /api/status function. See functions/api/status.ts for
 * why it cannot be fetched from the browser directly.
 */

interface Service {
  name: string;
  group: string;
  up: boolean;
  since: string | null;
  interval: number | null;
  kind: string;
}

interface Status {
  checkedAt: string;
  source: "monitors" | "probe";
  total: number;
  down: number;
  services: Service[];
}

const GROUP_ORDER = ["app", "watching", "chores"] as const;

/** "8 days", "4 hours", "12 minutes": the longest unit that still says something. */
function heldFor(since: string | null, lang: Lang): string | null {
  if (!since) return null;
  const ms = Date.now() - new Date(since).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const mins = Math.floor(ms / 60000);
  const pt = lang === "pt";
  if (mins < 60) return `${mins} ${pt ? "min" : "min"}`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours} ${pt ? (hours === 1 ? "hora" : "horas") : hours === 1 ? "hour" : "hours"}`;
  const days = Math.floor(hours / 24);
  return `${days} ${pt ? (days === 1 ? "dia" : "dias") : days === 1 ? "day" : "days"}`;
}

export function OrbStatus({ lang }: { lang: Lang }) {
  const dict = t(lang);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  const [data, setData] = useState<Status | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/status", { headers: { accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json: Status) => {
        if (!alive) return;
        setData(json);
        setState("ready");
      })
      .catch(() => alive && setState("failed"));
    return () => {
      alive = false;
    };
  }, []);

  if (state === "loading") {
    return (
      <p className="mt-4 text-sm text-[#9aa69d]">{dict.interior.orbReading}</p>
    );
  }
  if (state === "failed" || !data) {
    return <p className="mt-4 text-sm text-[#9aa69d]">{dict.interior.orbClouded}</p>;
  }

  const allUp = data.down === 0;
  const groups = GROUP_ORDER.map((key) => ({
    key,
    label: dict.interior.orbGroups[key],
    items: data.services.filter((s) => s.group === key),
  })).filter((g) => g.items.length);

  return (
    <div className="mt-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-bold text-[#ece9dd]">
          <span
            aria-hidden
            className={`mr-2 inline-block h-2 w-2 rounded-full ${
              allUp ? "bg-[#7fd48a]" : "bg-[#e08a5f]"
            }`}
          />
          {allUp
            ? dict.interior.orbAllUp.replace("{n}", String(data.total))
            : dict.interior.orbSomeDown
                .replace("{down}", String(data.down))
                .replace("{n}", String(data.total))}
        </p>
        {data.source === "probe" && (
          <span className="shrink-0 text-[11px] text-[#9aa69d]">
            {dict.interior.orbProbed}
          </span>
        )}
      </div>

      <div className="mt-4 space-y-4">
        {groups.map((group) => (
          <div key={group.key}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9aa69d]">
              {group.label}
            </p>
            <ul className="mt-1.5 space-y-1">
              {group.items.map((s) => {
                const held = heldFor(s.since, lang);
                return (
                  <li
                    key={s.name}
                    className="flex items-baseline justify-between gap-3 text-sm"
                  >
                    <span className="flex min-w-0 items-baseline gap-2">
                      <span
                        aria-hidden
                        className={`inline-block h-1.5 w-1.5 shrink-0 translate-y-[-1px] rounded-full ${
                          s.up ? "bg-[#7fd48a]" : "bg-[#e08a5f]"
                        }`}
                      />
                      <span className="truncate text-[#c9cdc2]">{s.name}</span>
                    </span>
                    <span className="shrink-0 text-[11px] text-[#9aa69d]">
                      {s.up
                        ? held
                          ? dict.interior.orbUpFor.replace("{age}", held)
                          : dict.interior.orbUp
                        : dict.interior.orbDown}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
