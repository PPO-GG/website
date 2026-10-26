export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  modules: ['@nuxt/content'],
  // Node's built-in sqlite (Node 22.5+) avoids compiling better-sqlite3.
  content: { experimental: { sqliteConnector: 'native' } },
  css: ['~/assets/css/main.css'],
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
