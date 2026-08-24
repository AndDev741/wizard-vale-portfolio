// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  /**
   * The custom domain, not the pages.dev one. Both serve this build, so this
   * decides which of them the canonical links, the hreflang pairs and the
   * social card's absolute URL point at: without it search engines index the
   * Cloudflare subdomain and the real address inherits none of it.
   */
  site: "https://myportfolio.beyouweb.com",
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
