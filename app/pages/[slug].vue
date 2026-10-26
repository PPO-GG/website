<script setup lang="ts">
import { isValidSlug } from '~/utils/content/slug'

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

useSeoMeta({ title: `${page.value.title} | PPO` })
</script>

<template>
  <div v-if="page" class="wrap page">
    <NuxtLink class="back" to="/">ppo.gg</NuxtLink>
    <article class="post">
      <h1>{{ page.title }}</h1>
      <MDC :value="page.body" tag="div" />
    </article>
  </div>
</template>
