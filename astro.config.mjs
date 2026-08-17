// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // Update once the Cloudflare Pages project (or custom domain) exists.
  site: "https://wizard-vale-portfolio.pages.dev",
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
