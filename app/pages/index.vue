<script setup lang="ts">
import { PROCESS, SERVICES, SITE, TAGLINES } from '~/data/site'

const content = useContent()
const { data: loaded } = await useAsyncData('apps', () => content.apps())
const list = computed(() => loaded.value?.data ?? [])
const failed = computed(() => loaded.value?.failed ?? false)

useSeoMeta({
  title: 'PPO | Software, web and platform engineering',
  description: 'PPO designs and builds powerful, fast and beautiful software: web applications, platforms, automation and technical advisory.',
})
</script>

<template>
  <main>
    <div id="top" class="hero">
      <ClientOnly><GlobeBackground /></ClientOnly>
      <ClientOnly>
        <PixelLogo />
        <template #fallback><div class="logo" /></template>
      </ClientOnly>
      <RotatingLine :lines="TAGLINES" />
      <a class="scroll-cue" href="#services" aria-label="Scroll to services">Scroll</a>
    </div>

    <section id="services" class="section" aria-labelledby="services-h">
      <div class="wrap">
        <p class="eyebrow">What we do</p>
        <h2 id="services-h" class="section-title">Services</h2>
        <p class="lead">Engineering, design and intelligence tooling for organizations that need software to be reliable, fast and decisive.</p>
        <ul class="cards">
          <li v-for="(s, i) in SERVICES" :key="s.id" class="card">
            <span class="num">SVC-{{ String(i + 1).padStart(2, '0') }}</span>
            <h3>{{ s.title }}</h3>
            <p>{{ s.summary }}</p>
            <NuxtLink class="more" :to="`/services#${s.id}`">Learn more</NuxtLink>
          </li>
        </ul>
      </div>
    </section>

    <section id="work" class="section" aria-labelledby="work-h">
      <div class="wrap">
        <p class="eyebrow">Portfolio</p>
        <h2 id="work-h" class="section-title">Selected work</h2>
        <p v-if="failed" class="notice">Projects could not load. Reload the page in a minute.</p>
        <AppList v-else :apps="list" />
      </div>
    </section>

    <section id="approach" class="section" aria-labelledby="approach-h">
      <div class="wrap">
        <p class="eyebrow">How we work</p>
        <h2 id="approach-h" class="section-title">Our approach</h2>
        <ol class="steps">
          <li v-for="(p, i) in PROCESS" :key="p.title">
            <span class="num">{{ String(i + 1).padStart(2, '0') }}</span>
            <h3>{{ p.title }}</h3>
            <p>{{ p.text }}</p>
          </li>
        </ol>
      </div>
    </section>

    <section id="contact" class="section" aria-labelledby="contact-h">
      <div class="wrap">
        <div class="cta">
          <div>
            <h2 id="contact-h">Start a project</h2>
            <p>Tell us what you are building. We reply within two business days.</p>
          </div>
          <a class="btn primary" :href="`mailto:${SITE.email}`">{{ SITE.email }}</a>
        </div>
      </div>
    </section>
  </main>
</template>
