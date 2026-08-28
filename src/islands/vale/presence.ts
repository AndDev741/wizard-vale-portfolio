/**
 * Who else is walking around, and telling them where you are.
 *
 * The socket carries nothing but a colour, a room, a position and one word for
 * what you are doing. No name, no account, and the id is handed out by the
 * server and thrown away when you close the tab, so two visits are not
 * connected to each other. Turning company off closes the socket rather than
 * hiding anyone: nothing leaves the browser after that.
 *
 * Positions live in a Map that React does not watch. A peer moving is not a
 * render, it is a number changing that the next frame reads. Only arrivals and
 * departures reach React, because those change what has to exist on screen.
 */

export type PeerAction =
  | "idle"
  | "walk"
  | "read"
  | "talk"
  | "sit"
  | "scry"
  | "pet"
  | "look"
  | "climb";

export interface Peer {
  id: string;
  hue: number;
  dark: boolean;
  room: string;
  floor: number;
  x: number;
  z: number;
  r: number;
  a: PeerAction;
}

/** What this visitor is doing, sent up to five times a second while moving. */
export interface SelfState {
  room: string;
  floor: number;
  x: number;
  z: number;
  r: number;
  a: PeerAction;
}

export interface Look {
  hue: number;
  dark: boolean;
}

export type Link = "off" | "joining" | "in" | "lost";

/** No point sending faster than the eye follows, and the server refuses it. */
const SEND_MS = 180;
/**
 * Standing still sends nothing, which is the point, but then a connection that
 * died without saying so looks exactly like someone who is just not moving.
 * This is the difference: a word every twenty seconds so the server can tell.
 */
const ALIVE_MS = 20000;
/** Below this, a move is not worth a frame. */
const MOVED = 0.05;
const TURNED = 0.04;

export class Presence {
  private ws: WebSocket | null = null;
  private url: string;
  private look: Look;
  private self: SelfState | null = null;
  private sentAt = 0;
  private sent: SelfState | null = null;
  private tries = 0;
  private timer: number | null = null;
  private closing = false;
  private roster = new Set<() => void>();
  private linkWatchers = new Set<(l: Link) => void>();
  private beat: number | null = null;

  /** Everyone else, by id. Read this in a frame loop, not in a render. */
  readonly peers = new Map<string, Peer>();
  /** The id the server gave us, once it has. */
  me: string | null = null;
  link: Link = "off";

  constructor(url: string, look: Look) {
    this.url = url;
    this.look = look;
  }

  /**
   * True when there is somewhere to connect to at all.
   *
   * A page served over https cannot open a plain ws:// socket to anywhere but
   * itself: the browser refuses it. Treating that as unconfigured is better
   * than retrying forever against something that can never answer, and it
   * makes the mistake visible as "no control" rather than as a mystery.
   */
  static configured(url: string | undefined): url is string {
    if (typeof url !== "string" || !/^wss?:\/\//.test(url)) return false;
    if (url.startsWith("wss://")) return true;
    if (window.location.protocol !== "https:") return true;
    try {
      const host = new URL(url).hostname;
      return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
    } catch {
      return false;
    }
  }

  open(self: SelfState) {
    this.self = self;
    this.closing = false;
    this.connect();
    // On a timer rather than in `push`, which runs from the render loop: a
    // browser pauses frames in a window that is not in front, and the person
    // in that window has not left.
    this.beat ??= window.setInterval(() => this.keepalive(), ALIVE_MS);
  }

  close() {
    this.closing = true;
    if (this.beat !== null) {
      window.clearInterval(this.beat);
      this.beat = null;
    }
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
    const ws = this.ws;
    this.ws = null;
    try {
      ws?.close(1000, "left");
    } catch {
      // Already gone.
    }
    this.peers.clear();
    this.me = null;
    this.setLink("off");
    this.announce();
  }

  /** Called every frame. Sends only when something actually changed. */
  push(self: SelfState, now: number) {
    this.self = self;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    if (now - this.sentAt < SEND_MS) return;
    const last = this.sent;
    const still =
      last !== null &&
      last.a === self.a &&
      last.room === self.room &&
      last.floor === self.floor &&
      Math.abs(last.x - self.x) < MOVED &&
      Math.abs(last.z - self.z) < MOVED &&
      Math.abs(last.r - self.r) < TURNED;
    if (still) return;
    this.sentAt = now;
    this.sent = { ...self };
    this.send({ t: "m", ...self });
  }

  /** A word to say we are still here, whether or not anything moved. */
  private keepalive() {
    if (!this.self || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.sentAt = performance.now();
    this.send({ t: "m", ...this.self });
  }

  /** Fires when somebody arrives or leaves, which is when React must run. */
  onRoster(fn: () => void) {
    this.roster.add(fn);
    return () => {
      this.roster.delete(fn);
    };
  }

  onLink(fn: (l: Link) => void) {
    this.linkWatchers.add(fn);
    return () => {
      this.linkWatchers.delete(fn);
    };
  }

  private connect() {
    if (this.closing) return;
    this.setLink(this.tries === 0 ? "joining" : "lost");
    let ws: WebSocket;
    try {
      ws = new WebSocket(this.url);
    } catch {
      this.retry();
      return;
    }
    this.ws = ws;

    ws.addEventListener("open", () => {
      if (this.closing) {
        try {
          ws.close();
        } catch {
          /* nothing to do */
        }
        return;
      }
      this.tries = 0;
      this.sent = null;
      const s = this.self;
      this.send({ t: "hi", hue: this.look.hue, dark: this.look.dark, ...(s ?? {}) });
    });

    ws.addEventListener("message", (ev) => this.take(ev.data));

    ws.addEventListener("close", () => {
      if (this.ws === ws) this.ws = null;
      this.peers.clear();
      this.me = null;
      this.announce();
      this.retry();
    });

    ws.addEventListener("error", () => {
      // `close` always follows, and that is where the retry lives.
    });
  }

  private take(data: unknown) {
    if (typeof data !== "string") return;
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(data) as Record<string, unknown>;
    } catch {
      return;
    }
    if (msg.t === "here") {
      this.me = typeof msg.you === "string" ? msg.you : null;
      this.peers.clear();
      for (const p of (msg.peers as Peer[]) ?? []) this.peers.set(p.id, p);
      this.setLink("in");
      this.announce();
      return;
    }
    if (msg.t === "join") {
      const p = msg.peer as Peer | undefined;
      if (p?.id) {
        this.peers.set(p.id, p);
        this.announce();
      }
      return;
    }
    if (msg.t === "m") {
      const p = msg.peer as Peer | undefined;
      if (!p?.id) return;
      const had = this.peers.get(p.id);
      this.peers.set(p.id, p);
      // Only a change of room reaches React, because that changes who has to
      // exist on screen. Position and action are read from this map by the
      // frame loop instead.
      if (!had || had.room !== p.room || had.floor !== p.floor) this.announce();
      return;
    }
    if (msg.t === "bye") {
      const id = msg.id;
      if (typeof id === "string" && this.peers.delete(id)) this.announce();
    }
  }

  private send(msg: unknown) {
    try {
      this.ws?.send(JSON.stringify(msg));
    } catch {
      // The close handler will pick it up.
    }
  }

  private retry() {
    if (this.closing || this.timer !== null) return;
    this.tries += 1;
    this.setLink("lost");
    // Back off to half a minute: an absent server should cost nothing to have.
    const wait = Math.min(30000, 800 * 2 ** Math.min(this.tries, 5));
    this.timer = window.setTimeout(() => {
      this.timer = null;
      this.connect();
    }, wait);
  }

  private setLink(l: Link) {
    if (this.link === l) return;
    this.link = l;
    this.linkWatchers.forEach((fn) => fn(l));
  }

  private announce() {
    this.roster.forEach((fn) => fn());
  }
}
