export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@nuxtjs/mdc", "@nuxt/fonts"],
  css: ["~/assets/css/main.css", "~/assets/css/site.css"],
  fonts: {
    defaults: {
      weights: [400, 500, 600],
      styles: ["normal"],
      subsets: ["latin"],
    },
  },
  runtimeConfig: {
    public: {
      appwrite: {
        endpoint: "https://nyc.cloud.appwrite.io/v1",
        projectId: "6adf1e9f0019873f1a42",
        databaseId: "ppogg",
        bucketId: "media",
      },
    },
  },
  routeRules: {
    "/": { cache: { maxAge: 60, swr: true } },
    "/_payload.json": { cache: { maxAge: 60, swr: true } },
    "/blog/**": { cache: { maxAge: 60, swr: true } },
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
