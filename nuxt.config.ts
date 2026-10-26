export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  modules: ['@nuxtjs/mdc'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      appwrite: {
        endpoint: 'https://nyc.cloud.appwrite.io/v1',
        projectId: '6adf1e9f0019873f1a42',
        databaseId: 'ppogg',
        bucketId: 'media',
      },
    },
  },
  routeRules: {
    // Public pages re-render at most once a minute, so edits show up quickly without a hit per visit.
    '/': { swr: 60 },
    '/blog/**': { swr: 60 },
    '/admin/**': { ssr: false },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'PPO',
      meta: [{ name: 'description', content: 'ppo.gg builds software and web apps.' }],
      link: [
        { rel: 'icon', type: 'image/png', href: '/ppo.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&family=Space+Grotesk:wght@700&display=swap',
        },
      ],
    },
  },
})
