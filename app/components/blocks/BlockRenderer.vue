<script setup lang="ts">
import type { Block } from '~/types/blocks'
import { isExternal, safeLink, safeSrc } from '~/utils/content/blocks'

defineProps<{ blocks: Block[] }>()

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

      <section v-else-if="b.type === 'cta'" class="blk">
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
    </template>
  </div>
</template>
