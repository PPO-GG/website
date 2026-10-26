<script setup lang="ts">
const content = useContent()
const { data: loaded } = await useAsyncData('apps', () => content.apps())
const list = computed(() => loaded.value?.data ?? [])
const failed = computed(() => loaded.value?.failed ?? false)

// The home page is a stack of full-screen pages with no scrollbar.
useHead({ htmlAttrs: { class: 'paged' } })

const PAGES = [
  { id: 'top', label: 'logo' },
  { id: 'work', label: 'projects' },
]
</script>

<template>
  <div class="wrap">
    <ClientOnly><GlobeBackground /></ClientOnly>
    <PageDots :pages="PAGES" />
    <main>
      <div id="top" class="hero">
        <ClientOnly>
          <PixelLogo />
          <template #fallback><div class="logo" /></template>
        </ClientOnly>
      </div>

      <section id="work" aria-label="Apps">
        <p v-if="failed" class="notice">Projects could not load. Reload the page in a minute.</p>
        <AppList v-else :apps="list" />
        <footer>
          <span>ppo.gg &copy; 2026</span>
          <span>
            <NuxtLink to="/blog">blog</NuxtLink>
            &nbsp;/&nbsp;
            <a href="mailto:hello@ppo.gg">hello@ppo.gg</a>
          </span>
        </footer>
      </section>
    </main>
  </div>
</template>
