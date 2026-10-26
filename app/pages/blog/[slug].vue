<script setup lang="ts">
const route = useRoute()
const slug = String(route.params.slug)

const content = useContent()
const { data: loaded } = await useAsyncData(`blog-${slug}`, () => content.post(slug))
const post = computed(() => loaded.value?.data)

if (loaded.value?.failed) {
  throw createError({ statusCode: 503, statusMessage: 'Posts could not load', fatal: true })
}
if (!post.value) {
  throw createError({ statusCode: 404, statusMessage: 'Post not found', fatal: true })
}

const WORDS_PER_MIN = 220
const minutes = computed(() => Math.max(1, Math.round((post.value?.body.split(/\s+/).length ?? 0) / WORDS_PER_MIN)))
const date = computed(() =>
  new Date(post.value?.publishedAt ?? '').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }),
)

useSeoMeta({
  title: `${post.value.title} | PPO`,
  description: post.value.description,
  ogTitle: post.value.title,
  ogDescription: post.value.description,
  ogType: 'article',
})
</script>

<template>
  <main v-if="post" class="inner">
    <div class="wrap page">
      <NuxtLink class="back" to="/blog">All articles</NuxtLink>
      <article class="post">
        <h1>{{ post.title }}</h1>
        <p class="meta">{{ date }} &middot; {{ minutes }} min read</p>
        <MDC :value="post.body" tag="div" />
      </article>
    </div>
  </main>
</template>
