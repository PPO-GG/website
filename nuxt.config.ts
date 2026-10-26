export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  modules: ['@nuxtjs/mdc', '@nuxt/fonts'],
  css: ['~/assets/css/main.css', '~/assets/css/site.css'],
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
    // Public pages are cached for 30 seconds. swr is off on purpose: with swr the first visit after
    // an edit still gets the old page, so a change looked like it had not saved.
    '/': { cache: { maxAge: 30, swr: false } },
    '/_payload.json': { cache: { maxAge: 30, swr: false } },
    '/blog/**': { cache: { maxAge: 30, swr: false } },
    '/admin/**': { ssr: false },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'PPO',
      meta: [{ name: 'description', content: 'PPO designs and builds powerful, fast and beautiful software.' }],
      link: [
        { rel: 'icon', type: 'image/png', href: '/ppo.png' },
      ],
    },
  },
})
