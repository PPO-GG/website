export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  // nitro-cloudflare-dev gives `nuxt dev` the D1/R2 bindings and .dev.vars from wrangler.jsonc (local only).
  modules: ["@nuxtjs/mdc", "@nuxt/fonts", "nitro-cloudflare-dev"],
  css: ["~/assets/css/main.css", "~/assets/css/site.css"],
  fonts: {
    defaults: {
      weights: [400, 500, 600],
      styles: ["normal"],
      subsets: ["latin"],
    },
  },
  nitro: { preset: "cloudflare_module" },
  // No page cache: every public request reads D1, so an unpublish shows at once. See README > Caching.
  routeRules: {
    "/admin/**": { ssr: false },
  },
  app: {
    head: {
      htmlAttrs: { lang: "en" },
      title: "PPO",
      meta: [
        {
          name: "description",
          content:
            "PPO designs and builds powerful, fast and beautiful software.",
        },
      ],
      link: [{ rel: "icon", type: "image/png", href: "/ppo.png" }],
    },
  },
});
