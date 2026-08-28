/**
 * Who else is in the vale right now.
 *
 * One Durable Object holds every open connection and relays positions between
 * them. There is no database, no log and no account: the object knows only
 * where each socket says it is standing, and forgets it the moment the socket
 * closes. Nothing survives a restart, which is exactly right for presence.
 *
 * The server assigns the ids. A client that could name itself could name itself
 * something already taken, so it does not get to.
 */

export interface Env {
  GREEN: DurableObjectNamespace;
}

/** How many people can be in the vale at once before it turns arrivals away. */
const MAX_PEERS = 48;
/** Nobody needs to send faster than this, and a flood is refused. */
const MIN_GAP_MS = 55;
/** A whole message, generously. Anything larger is a mistake or an attack. */
const MAX_FRAME = 512;
/**
 * A socket that has said nothing for this long is gone, whatever it claims. A
 * phone that sleeps or a network that drops does not always close cleanly, and
 * the alternative is a stranger standing in the plaza forever. Clients send a
 * word every twenty seconds precisely so this can be enforced.
 */
const GHOST_MS = 65000;

/**
 * Everything a client is allowed to say about itself. Rooms and actions are
 * closed sets, so a peer can never push arbitrary text into anyone else's
 * screen; positions are clamped to a plausible world.
 */
const ROOMS = ["vale", "about", "projects", "experience", "writing", "contact"] as const;
const ACTIONS = [
  "idle",
  "walk",
  "read",
  "talk",
  "sit",
  "scry",
  "pet",
  "look",
  "climb",
] as const;
type Room = (typeof ROOMS)[number];
type Action = (typeof ACTIONS)[number];

/** What the object keeps per socket. Small, because it is serialised often. */
interface Peer {
  id: string;
  /** Hue of their robe, 0-359, and a light or dark cast. */
  hue: number;
  dark: boolean;
  room: Room;
  floor: number;
  x: number;
  z: number;
  r: number;
  a: Action;
  /** Last accepted frame, for the rate limit. Not sent to anyone. */
  seen: number;
  /**
   * Already swept. A closed socket lingers in the list for a moment, and
   * without this the next sweep finds it again and says goodbye twice.
   */
  gone?: boolean;
}

const ALLOWED_HOSTS = ["myportfolio.beyouweb.com", "wizard-vale-portfolio.pages.dev"];

/**
 * A machine on somebody's own network, or their own machine. These are allowed
 * so the whole thing can be tried on a laptop and a phone before it is
 * deployed anywhere. It gives nothing away: a page served from a private
 * address cannot be handed to a stranger, and the only thing behind this door
 * is a list of anonymous positions.
 */
function isPrivate(host: string): boolean {
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    host.endsWith(".localhost") ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  );
}

/** Preview deploys get their own subdomain, and are still the same site. */
function originAllowed(origin: string): boolean {
  if (!origin) return false;
  let host: string;
  try {
    host = new URL(origin).hostname;
  } catch {
    return false;
  }
  if (isPrivate(host)) return true;
  return ALLOWED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

function clamp(v: unknown, lo: number, hi: number, fallback: number): number {
  const n = typeof v === "number" && Number.isFinite(v) ? v : fallback;
  return Math.min(hi, Math.max(lo, n));
}

function asRoom(v: unknown): Room {
  return (ROOMS as readonly string[]).includes(v as string) ? (v as Room) : "vale";
}

function asAction(v: unknown): Action {
  return (ACTIONS as readonly string[]).includes(v as string) ? (v as Action) : "idle";
}

/** What goes over the wire about a peer: everything but the bookkeeping. */
function wire(p: Peer) {
  return {
    id: p.id,
    hue: p.hue,
    dark: p.dark,
    room: p.room,
    floor: p.floor,
    x: p.x,
    z: p.z,
    r: p.r,
    a: p.a,
  };
}

export class ValeGreen implements DurableObject {
  constructor(private state: DurableObjectState) {}

  async fetch(request: Request): Promise<Response> {
    if (this.state.getWebSockets().length >= MAX_PEERS) {
      return new Response("the vale is full", { status: 503 });
    }
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    // Hibernation: an idle vale costs nothing while everyone stands still.
    this.state.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(ws: WebSocket, raw: ArrayBuffer | string) {
    if (typeof raw !== "string" || raw.length > MAX_FRAME) {
      ws.close(1009, "too much");
      return;
    }
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return;
    }

    const now = Date.now();
    const mine = this.read(ws);

    if (msg.t === "hi") {
      if (mine) return; // already introduced
      const peer: Peer = {
        // Random rather than counted: a counter lives in memory, and memory is
        // exactly what hibernation throws away. Ids only have to be unique
        // among the sockets open right now, and 40 bits is plenty for 48 of them.
        id: Math.random().toString(36).slice(2, 10),
        hue: Math.round(clamp(msg.hue, 0, 359, 0)),
        dark: msg.dark === true,
        room: asRoom(msg.room),
        floor: Math.round(clamp(msg.floor, 0, 8, 0)),
        x: clamp(msg.x, -40, 40, 0),
        z: clamp(msg.z, -40, 40, 0),
        r: clamp(msg.r, -Math.PI * 2, Math.PI * 2, 0),
        a: asAction(msg.a),
        seen: now,
      };
      this.write(ws, peer);
      this.sweep(now);
      // Tell the newcomer who is already here, and tell everyone else about them.
      const others = this.peers().filter((p) => p.id !== peer.id);
      ws.send(JSON.stringify({ t: "here", you: peer.id, peers: others.map(wire) }));
      this.broadcast({ t: "join", peer: wire(peer) }, ws);
      return;
    }

    if (msg.t === "m") {
      if (!mine) return;
      if (now - mine.seen < MIN_GAP_MS) return;
      mine.seen = now;
      mine.room = asRoom(msg.room);
      mine.floor = Math.round(clamp(msg.floor, 0, 8, mine.floor));
      mine.x = clamp(msg.x, -40, 40, mine.x);
      mine.z = clamp(msg.z, -40, 40, mine.z);
      mine.r = clamp(msg.r, -Math.PI * 2, Math.PI * 2, mine.r);
      mine.a = asAction(msg.a);
      this.write(ws, mine);
      this.broadcast({ t: "m", peer: wire(mine) }, ws);
      this.sweep(now);
    }
  }

  /**
   * Close anything that has gone quiet. Closing is enough: the close handler
   * tells everyone else, so there is one path out of the vale and not two.
   */
  private sweep(now: number) {
    for (const ws of this.state.getWebSockets()) {
      const p = this.read(ws);
      if (!p || p.gone || now - p.seen < GHOST_MS) continue;
      p.gone = true;
      this.write(ws, p);
      // Said out loud rather than left to the close handler, which does not
      // always run for a close this side started. A second bye is harmless:
      // the clients have already forgotten them.
      this.broadcast({ t: "bye", id: p.id }, ws);
      try {
        ws.close(1001, "quiet too long");
      } catch {
        // Already closing.
      }
    }
  }

  webSocketClose(ws: WebSocket) {
    this.leave(ws);
  }

  webSocketError(ws: WebSocket) {
    this.leave(ws);
  }

  private leave(ws: WebSocket) {
    const p = this.read(ws);
    if (p && !p.gone) this.broadcast({ t: "bye", id: p.id }, ws);
  }

  private read(ws: WebSocket): Peer | null {
    try {
      return (ws.deserializeAttachment() as Peer | null) ?? null;
    } catch {
      return null;
    }
  }

  private write(ws: WebSocket, peer: Peer) {
    ws.serializeAttachment(peer);
  }

  private peers(): Peer[] {
    const out: Peer[] = [];
    for (const ws of this.state.getWebSockets()) {
      const p = this.read(ws);
      if (p && !p.gone) out.push(p);
    }
    return out;
  }

  private broadcast(msg: unknown, except: WebSocket) {
    const body = JSON.stringify(msg);
    for (const ws of this.state.getWebSockets()) {
      if (ws === except) continue;
      try {
        ws.send(body);
      } catch {
        // A socket that will not take it is one that is already going away.
      }
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== "/green") {
      return new Response("nothing here", { status: 404 });
    }
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("this door only takes websockets", { status: 426 });
    }
    if (!originAllowed(request.headers.get("Origin") ?? "")) {
      return new Response("not from there", { status: 403 });
    }
    // Everyone shares one green, which is the point of a village.
    const id = env.GREEN.idFromName("green");
    return env.GREEN.get(id).fetch(request);
  },
} satisfies ExportedHandler<Env>;
