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

useSeoMeta({ title: `${post.value.title} | PPO`, description: post.value.description })
</script>

<template>
  <div v-if="post" class="wrap page">
    <NuxtLink class="back" to="/blog">blog</NuxtLink>
    <article class="post">
      <h1>{{ post.title }}</h1>
      <p class="meta">{{ post.publishedAt.slice(0, 10) }}</p>
      <MDC :value="post.body" tag="div" />
    </article>
  </div>
</template>
