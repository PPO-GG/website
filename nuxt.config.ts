export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@nuxtjs/mdc", "@nuxt/fonts"],
  css: ["~/assets/css/main.css", "~/assets/css/site.css"],
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
    "/": { cache: { maxAge: 30, swr: false } },
    "/_payload.json": { cache: { maxAge: 30, swr: false } },
    "/blog/**": { cache: { maxAge: 30, swr: false } },
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
