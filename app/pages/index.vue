<script setup lang="ts">
import type { AppEntry } from '~/types/app'

const { data: apps } = await useAsyncData('apps', () => queryCollection('apps').order('order', 'ASC').all())
const list = computed<AppEntry[]>(() => apps.value ?? [])

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
        <AppList :apps="list" />
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
