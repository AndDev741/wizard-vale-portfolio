/**
 * What the scrying orb sees. A Cloudflare Pages Function, which is the only
 * place this can honestly live:
 *
 *  - The browser cannot ask GlitchTip anything: its monitor API needs a token,
 *    and a token on a public static site is not a token.
 *  - The browser cannot check Beyou directly either. The one endpoint that
 *    tells the truth (docs.beyouweb.com/api/v1/...) refuses foreign origins by
 *    design, and the one that answers (beyouweb.com/api/v1/...) returns the
 *    frontend's index.html with a 200, so a naive probe reports green with the
 *    backend dead.
 *  - And this runs on Cloudflare rather than on the laptop it watches, so it
 *    still answers when that laptop is down, which is the only moment an
 *    uptime page is worth anything.
 *
 * Set GLITCHTIP_TOKEN in the Pages project's environment variables (encrypted).
 * Without it the endpoint still works, falling back to probing the public URLs
 * directly, which loses the history but keeps the truth.
 */

interface Env {
  GLITCHTIP_TOKEN?: string;
}

const GLITCHTIP = "https://mnt.beyouweb.com";
const ORG = "beyou";

/** Which group a monitor belongs to, matched on its name. */
function groupOf(name: string): "app" | "watching" | "chores" {
  const n = name.toLowerCase();
  if (/backup|restore|scheduler|nudge|watchtower/.test(n)) return "chores";
  if (/grafana|prometheus|loki|alloy|glitchtip/.test(n)) return "watching";
  return "app";
}

/**
 * Names as they should read on a public page. GlitchTip's own names carry
 * internal detail ("Beyou postgres (app DB)"), and the raw records carry the
 * container hostnames and the heartbeat write endpoints, none of which belong
 * anywhere near a browser.
 */
function tidy(name: string): string {
  return name
    .replace(/^Beyou\s+/i, "")
    .replace(/\s*\(self\)$/i, "")
    .replace(/\s*\(public\)$/i, "")
    .replace(/\s+heartbeat$/i, "")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

interface Service {
  name: string;
  group: string;
  up: boolean;
  /** ISO instant it last changed state, which is how long it has held. */
  since: string | null;
  /** Seconds between checks. */
  interval: number | null;
  kind: string;
}

/** The public sites, probed straight from the edge when GlitchTip is silent. */
const DIRECT: Array<{ name: string; url: string; expect: RegExp }> = [
  // Content type matters: the frontend answers 200 to everything, so a status
  // code alone would call a dead backend healthy.
  { name: "Backend API", url: "https://docs.beyouweb.com/api/v1/docs/blog/topics", expect: /json/ },
  { name: "Docs site", url: "https://docs.beyouweb.com/en", expect: /html/ },
  { name: "Landing page", url: "https://beyouweb.com/pt/", expect: /html/ },
  { name: "GlitchTip", url: "https://mnt.beyouweb.com/", expect: /html/ },
];

async function probeDirect(): Promise<Service[]> {
  const results = await Promise.all(
    DIRECT.map(async (target) => {
      try {
        const res = await fetch(target.url, {
          method: "GET",
          redirect: "follow",
          signal: AbortSignal.timeout(6000),
        });
        const type = res.headers.get("content-type") ?? "";
        return {
          name: target.name,
          group: "app",
          up: res.ok && target.expect.test(type),
          since: null,
          interval: null,
          kind: "probe",
        };
      } catch {
        return {
          name: target.name,
          group: "app",
          up: false,
          since: null,
          interval: null,
          kind: "probe",
        };
      }
    }),
  );
  return results;
}

export const onRequestGet = async (context: { env: Env }): Promise<Response> => {
  const token = context.env.GLITCHTIP_TOKEN;
  let services: Service[] = [];
  let source: "monitors" | "probe" = "probe";

  if (token) {
    try {
      const res = await fetch(`${GLITCHTIP}/api/0/organizations/${ORG}/monitors/`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(7000),
      });
      if (res.ok) {
        const raw = (await res.json()) as Array<Record<string, unknown>>;
        services = raw.map((m) => ({
          name: tidy(String(m.name ?? "")),
          group: groupOf(String(m.name ?? "")),
          up: Boolean(m.isUp),
          since: typeof m.lastChange === "string" ? m.lastChange : null,
          interval: typeof m.interval === "number" ? m.interval : null,
          kind: String(m.monitorType ?? ""),
        }));
        source = "monitors";
      }
    } catch {
      // GlitchTip lives on the machine being watched, so silence here is data:
      // fall through and probe from the edge instead.
    }
  }

  if (!services.length) services = await probeDirect();

  const down = services.filter((s) => !s.up).length;
  const body = JSON.stringify({
    checkedAt: new Date().toISOString(),
    source,
    total: services.length,
    down,
    services,
  });

  return new Response(body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      // One minute at the edge: even a busy day is a request a minute to a
      // laptop, and a status a minute old is still a live status.
      "cache-control": "public, max-age=30, s-maxage=60",
      "access-control-allow-origin": "*",
    },
  });
};
