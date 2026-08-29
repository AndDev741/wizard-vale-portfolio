# Wizard Vale

My portfolio as a small 3D magic vale. Every section of the site is a place: the Guild Hall holds my work experience as a quest board, the Wizard's Tower holds my projects, the Library holds my writing, the Cottage is about me, and the Raven Post is how you reach me.

Two ways to visit:

- **Walk.** A wizard you control with WASD, arrow keys, or a touch joystick. Get close to a door and enter.
- **Click.** A dock of shortcuts flies the camera to each place and opens its panel. The classic pages (`/about`, `/projects`, `/experience`, `/writing`) exist as plain fast HTML too, in English and Portuguese.

What is in there, besides the five places: all four buildings are enterable and
furnished; the vale keeps your local hour, so it is dusk here when it is dusk
there; each room has its own sound, off by default and switched on from the
control in the corner; fifteen badges hang on a noticeboard in the plaza; a cat
sleeps by the fire in the Cottage and follows you once you pet her; anyone else
visiting at the same time is walking around in there with you; and a control
next to the others fills the screen with the vale alone.

Live at **[myportfolio.beyouweb.com](https://myportfolio.beyouweb.com)**.

## Stack

- [Astro](https://astro.build) static shell, all content prerendered in `en` (root) and `pt` (`/pt`)
- [React Three Fiber](https://r3f.docs.pmnd.rs) island for the vale, lazy-loaded, WebGL-gated, disabled under `prefers-reduced-motion`
- Tailwind CSS 4, Satoshi (self-hosted), Phosphor icons
- 3D models by [Kay Lousberg](https://www.kaylousberg.com), all CC0: Medieval Hexagon and City Builder for the village, Dungeon Remastered for what fills the rooms, Adventurers for the wizard and the three patrons, Furniture Bits for the Cottage. The cat is not from any of them: no pack ships an animal, so both cats are built out of primitives in `Interior.tsx` and `Familiar.tsx`
- Sound. Everything is synthesised in the browser except three recordings:
  - The cat's purr: [Purring cat](https://commons.wikimedia.org/wiki/File:Purring_cat.oga) by Mysid, public domain, cut to 1.3s. Chosen by measurement: most purr recordings put everything below 80Hz, which small speakers cannot reproduce, and this one is close-miked and nearly flat up past 3kHz
  - The hearth: [Fireplace Sound loop](https://opengameart.org/content/fireplace-sound-loop) by pagdev, CC0, cut to a seamless 14s loop
  - The Guild Hall: [Medieval: Minstrel Dance](https://opengameart.org/content/medieval-minstrel-dance) by randommind, CC0
  - The vale: [Medieval: Harvest Season](https://opengameart.org/content/medieval-harvest-season) by randommind, CC0, cut to a 32.6s loop

## Development

```bash
npm install
npm run dev       # dev server
npm run build     # static build to dist/
npm run preview       # serve the build locally
npm run preview:live  # ...and run the /api/status function with it
```

`preview` is the plain static build, which is enough for everything except the
scrying orb: `astro preview` does not run Cloudflare Functions, so `/api/status`
would 404 and the orb would show its clouded state. Use `preview:live` to review
it for real. To see the orb with the full seventeen monitors rather than the
four-URL fallback, copy `.dev.vars.example` to `.dev.vars` and paste a GlitchTip
API token. That file is git-ignored.

Content lives in `src/i18n/ui.ts` (copy) and `src/data/` (quests, projects, writing, contact). The world layout (building positions, camera targets, walk physics constants) lives in `src/islands/vale/world.ts`.

## Deploy (Cloudflare Pages)

1. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git → this repo.
2. Framework preset: **Astro**. Build command `npm run build`, output directory `dist`.
3. Set the real URL in `astro.config.mjs` (`site:`) so canonical and OG tags
   point at the right domain. Already done: `https://myportfolio.beyouweb.com`.
4. Two environment variables on the project, both of which only take effect on
   the **next** build, because Pages binds them per deployment. Adding one and
   not rebuilding does nothing at all.
   - `GLITCHTIP_TOKEN`, a **Secret**. Without it the orb falls back to probing
     the public Beyou URLs from the edge.
   - `PUBLIC_PRESENCE_URL`, plain **Text**, the `wss://` address of the
     presence Worker. It has to be Text, not Secret: Vite reads it during the
     build and it ends up in the bundle either way, so it is a public address
     behind an origin allowlist rather than a secret. Without it the vale is
     single-player and its control does not appear.

## Multiplayer

Everyone in the vale can see everyone else walking around, and one word about
what each of them is doing. It carries a colour, a room, a position and that
word. No name, no account, no database: the server holds open sockets and
nothing else, and the id it hands out is gone when the tab closes. Visitors can
switch it off, which closes their socket rather than hiding other people, and
the default is on.

Live since 2026-08-28, at `wss://wizard-vale-presence.beyouwebapp.workers.dev/green`.

The presence server is a separate Worker in `presence/`, so it cannot affect the
site: with no `PUBLIC_PRESENCE_URL` set in a real build, the vale is
single-player and the control does not appear.

The control says which of those it is, which matters because being alone and
being unable to reach anybody otherwise look identical: **showing** means
connected, **joining** means trying, **cannot reach the vale** means the server
is not answering, and no control at all means no URL was configured.

### Trying it without deploying anything

Two terminals. The first runs the presence server, the second the site pointed
at it:

```bash
npm run presence:dev
PUBLIC_PRESENCE_URL=ws://localhost:8787/green npm run preview:mp
```

`npm run dev` works too: in dev the site defaults to that same local worker, so
two terminals is still the whole setup.

Then open <http://localhost:8788> twice. Use one normal window and one private
window: they have separate storage, so they roll different colours and you can
actually tell them apart. Press **Walk** in both and they will see each other.

To try it on a phone at the same time, both servers already listen on the whole
network, so point the variable at this machine's address instead:

```bash
# find this machine's address: `ip -4 addr` on Linux, `ipconfig` on Windows
PUBLIC_PRESENCE_URL=ws://192.168.x.y:8787/green npm run preview:mp
```

and open `http://192.168.x.y:8788` on the phone. Private addresses are on the
origin allowlist for exactly this.

### Deploying it

```bash
npm run presence:deploy
```

Then set `PUBLIC_PRESENCE_URL` on the Pages project to the `wss://.../green` URL
it prints, and rebuild.

One Durable Object holds the room, using the WebSocket Hibernation API so an
idle vale bills nothing. Durable Objects are on the Workers free plan with the
SQLite backend, and incoming WebSocket messages bill at 20:1, so the free
100k requests a day is about two million messages. The client only sends when
something actually changed: standing still sends nothing at all. `presence/src/index.ts`
allowlists the site's origins, assigns the ids, caps the room at 48 people,
rate-limits each socket and validates every field against closed sets, so a peer
cannot push text into anyone else's screen. A socket that goes quiet for more
than a minute is closed and announced as gone, because a phone that sleeps does
not always close cleanly and the alternative is a stranger standing in the plaza
forever; clients send a word every twenty seconds so that rule can be applied.

## Built

- Building interiors, all four, in `interiors.ts`
- A crystal ball in the Cottage showing what the monitoring stack sees, through `functions/api/status.ts`
- Day/night cycle from the visitor's own clock, and a voice for each room: `daylight.ts`, `ambience.ts`
- Fifteen badges on a noticeboard in the plaza: `data/achievements.ts`, kept in the browser
- A cat familiar: pet her in the Cottage and she comes along, `Familiar.tsx`
- Multiplayer presence: `presence/`, see above
- Model compression, `scripts/optimize-models.mjs`, which documents at length why quantize, Draco and meshopt are all forbidden here
- A control that fills the screen with the vale alone

## Known gaps

- The cat has no colliders. Lead her into a table and she walks through it. She
  mostly follows where you have already walked, so it rarely shows, and giving
  her collision would mean a second movement system for a cat.
- Multiplayer has been tested against a real deployed Worker but never with
  several real people on real connections. The interpolation is tuned for about
  five updates a second; `EASE` in `Peers.tsx` is the number to change if it
  looks jumpy, and `MAX_PEERS` in the Worker if a crowd gets heavy.
- The vale runs at something under 30fps on a mid-range Android. Playable, not
  smooth.
