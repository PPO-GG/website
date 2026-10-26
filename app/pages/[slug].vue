<script setup lang="ts">
import { isValidSlug } from '~/utils/content/slug'
import { parseBody } from '~/utils/content/blocks'

const route = useRoute()
const slug = String(route.params.slug)

// Reserved or malformed slugs never reach the database.
if (!isValidSlug(slug)) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
}

const content = useContent()
const { data: loaded } = await useAsyncData(`page-${slug}`, () => content.page(slug))
const page = computed(() => loaded.value?.data)

if (loaded.value?.failed) {
  throw createError({ statusCode: 503, statusMessage: 'Page could not load', fatal: true })
}
if (!page.value) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
}

const body = computed(() => parseBody(page.value?.body ?? ''))
useSeoMeta({ title: `${page.value.title} | PPO` })
</script>

<template>
  <main v-if="page" class="inner">
    <BlocksBlockRenderer v-if="body.kind === 'blocks'" :blocks="body.blocks" />
    <div v-else class="wrap page">
      <article class="post">
        <h1>{{ page.title }}</h1>
        <MDC :value="body.markdown" tag="div" />
      </article>
    </div>
  </main>
</template>
