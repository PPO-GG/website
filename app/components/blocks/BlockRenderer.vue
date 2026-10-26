<script setup lang="ts">
import type { Block } from '~/types/blocks'
import { isExternal, safeLink, safeSrc, toLines } from '~/utils/content/blocks'
import { slugify } from '~/utils/content/slug'

defineProps<{ blocks: Block[] }>()

const content = useContent()
const { data: loaded } = await useAsyncData('apps', () => content.apps())
const apps = computed(() => loaded.value?.data ?? [])
const appsFailed = computed(() => loaded.value?.failed ?? false)

const down = () => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })
const anchorOf = (b: Block) => b.data.anchor || undefined
const moreLink = (base: string | undefined, title: string) => (base ? `${safeLink(base)}#${slugify(title)}` : '')

const attrs = (href: string) => {
  const h = safeLink(href)
  return { href: h, target: isExternal(h) ? '_blank' : undefined, rel: isExternal(h) ? 'noopener' : undefined }
}
</script>

<template>
  <div class="blocks">
    <template v-for="b in blocks" :key="b.id">
      <section v-if="b.type === 'hero'" class="blk blk-hero">
        <div class="wrap">
          <p v-if="b.data.eyebrow" class="eyebrow">{{ b.data.eyebrow }}</p>
          <h1>{{ b.data.heading }}</h1>
          <p v-if="b.data.text" class="lead">{{ b.data.text }}</p>
          <a v-if="b.data.ctaLabel && b.data.ctaHref" class="btn primary" v-bind="attrs(b.data.ctaHref)">{{ b.data.ctaLabel }}</a>
        </div>
      </section>

      <section v-else-if="b.type === 'text'" class="blk blk-text">
        <div class="wrap narrow post">
          <h2 v-if="b.data.heading">{{ b.data.heading }}</h2>
          <MDC :value="b.data.body ?? ''" tag="div" />
        </div>
      </section>

      <section v-else-if="b.type === 'features'" class="blk">
        <div class="wrap">
          <h2 v-if="b.data.heading" class="blk-title">{{ b.data.heading }}</h2>
          <p v-if="b.data.intro" class="lead">{{ b.data.intro }}</p>
          <ul class="cards">
            <li v-for="(it, i) in b.items" :key="i" class="card">
              <span class="num">{{ String(i + 1).padStart(2, '0') }}</span>
              <h3>{{ it.title }}</h3>
              <p v-if="it.text">{{ it.text }}</p>
              <a v-if="it.href" class="more" v-bind="attrs(it.href)">Learn more</a>
            </li>
          </ul>
        </div>
      </section>

      <section v-else-if="b.type === 'stats'" class="blk">
        <div class="wrap">
          <h2 v-if="b.data.heading" class="blk-title">{{ b.data.heading }}</h2>
          <dl class="stats">
            <div v-for="(it, i) in b.items" :key="i">
              <dt>{{ it.value }}</dt>
              <dd>{{ it.label }}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section v-else-if="b.type === 'image'" class="blk">
        <figure v-if="safeSrc(b.data.src)" class="wrap blk-image">
          <img :src="safeSrc(b.data.src)" :alt="b.data.alt" loading="lazy">
          <figcaption v-if="b.data.caption">{{ b.data.caption }}</figcaption>
        </figure>
      </section>

      <section v-else-if="b.type === 'cta'" :id="anchorOf(b)" :class="b.data.anchor ? 'section' : 'blk'">
        <div class="wrap">
          <div class="cta">
            <div>
              <h2>{{ b.data.heading }}</h2>
              <p v-if="b.data.text">{{ b.data.text }}</p>
            </div>
            <a class="btn primary" v-bind="attrs(b.data.ctaHref ?? '')">{{ b.data.ctaLabel }}</a>
          </div>
        </div>
      </section>

      <div v-else-if="b.type === 'pixelhero'" id="top" class="hero">
        <ClientOnly><GlobeBackground /></ClientOnly>
        <ClientOnly>
          <PixelLogo />
          <template #fallback><div class="logo" /></template>
        </ClientOnly>
        <RotatingLine :lines="toLines(b.data.taglines)" />
        <button type="button" class="scroll-cue" aria-label="Scroll down" @click="down">Scroll</button>
      </div>

      <section v-else-if="b.type === 'services'" :id="anchorOf(b)" class="section" :class="{ plain: !b.data.anchor }">
        <div class="wrap">
          <p v-if="b.data.eyebrow" class="eyebrow">{{ b.data.eyebrow }}</p>
          <h2 v-if="b.data.heading" class="section-title">{{ b.data.heading }}</h2>
          <p v-if="b.data.intro" class="lead">{{ b.data.intro }}</p>
          <ul v-if="b.data.layout !== 'detailed'" class="cards">
            <li v-for="(it, i) in b.items" :key="i" class="card">
              <span class="num">SVC-{{ String(i + 1).padStart(2, '0') }}</span>
              <h3>{{ it.title }}</h3>
              <p v-if="it.summary">{{ it.summary }}</p>
              <NuxtLink v-if="b.data.moreHref" class="more" :to="moreLink(b.data.moreHref, it.title ?? '')">Learn more</NuxtLink>
            </li>
          </ul>
          <div v-else class="detail">
            <article v-for="(it, i) in b.items" :id="slugify(it.title ?? '')" :key="i" class="service">
              <div>
                <span class="num">SVC-{{ String(i + 1).padStart(2, '0') }}</span>
                <h2>{{ it.title }}</h2>
                <p v-if="it.summary">{{ it.summary }}</p>
              </div>
              <ul class="ticks">
                <li v-for="p in toLines(it.points)" :key="p">{{ p }}</li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section v-else-if="b.type === 'steps'" :id="anchorOf(b)" class="section">
        <div class="wrap">
          <p v-if="b.data.eyebrow" class="eyebrow">{{ b.data.eyebrow }}</p>
          <h2 v-if="b.data.heading" class="section-title">{{ b.data.heading }}</h2>
          <ol class="steps">
            <li v-for="(it, i) in b.items" :key="i">
              <span class="num">{{ String(i + 1).padStart(2, '0') }}</span>
              <h3>{{ it.title }}</h3>
              <p v-if="it.text">{{ it.text }}</p>
            </li>
          </ol>
        </div>
      </section>

      <section v-else-if="b.type === 'work'" :id="anchorOf(b)" class="section">
        <div class="wrap">
          <p v-if="b.data.eyebrow" class="eyebrow">{{ b.data.eyebrow }}</p>
          <h2 v-if="b.data.heading" class="section-title">{{ b.data.heading }}</h2>
          <p v-if="appsFailed" class="notice">Projects could not load. Reload the page in a minute.</p>
          <AppList v-else :apps="apps" />
        </div>
      </section>
    </template>
  </div>
</template>
