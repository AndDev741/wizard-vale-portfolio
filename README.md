# Wizard Vale

My portfolio as a small 3D magic vale. Every section of the site is a place: the Guild Hall holds my work experience as a quest board, the Wizard's Tower holds my projects, the Library holds my writing, the Cottage is about me, and the Raven Post is how you reach me.

Two ways to visit:

- **Walk.** A wizard you control with WASD, arrow keys, or a touch joystick. Get close to a door and enter.
- **Click.** A dock of shortcuts flies the camera to each place and opens its panel. The classic pages (`/about`, `/projects`, `/experience`, `/writing`) exist as plain fast HTML too, in English and Portuguese.

Live at: (Cloudflare Pages URL after first deploy)

## Stack

- [Astro](https://astro.build) static shell, all content prerendered in `en` (root) and `pt` (`/pt`)
- [React Three Fiber](https://r3f.docs.pmnd.rs) island for the vale, lazy-loaded, WebGL-gated, disabled under `prefers-reduced-motion`
- Tailwind CSS 4, Satoshi (self-hosted), Phosphor icons
- 3D models by [Kay Lousberg](https://www.kaylousberg.com) (KayKit Medieval Hexagon Pack + Adventurers Character Pack, CC0)

## Development

```bash
npm install
npm run dev       # dev server
npm run build     # static build to dist/
npm run preview   # serve the build locally
```

Content lives in `src/i18n/ui.ts` (copy) and `src/data/` (quests, projects, writing, contact). The world layout (building positions, camera targets, walk physics constants) lives in `src/islands/vale/world.ts`.

## Deploy (Cloudflare Pages)

1. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git → this repo.
2. Framework preset: **Astro**. Build command `npm run build`, output directory `dist`.
3. After the first deploy, set the real URL in `astro.config.mjs` (`site:`) so canonical/OG tags point at the right domain, and push again.

## Roadmap

- Building interiors
- A crystal ball in the Cottage streaming live Grafana metrics from the machine that hosts Beyou
- Day/night cycle, ambient sound with a mute control
- A "visited every place" achievement
- A cat familiar that follows the wizard
- Model compression (gltf-transform) once the asset set grows
