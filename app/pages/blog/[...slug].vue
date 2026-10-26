<script setup lang="ts">
const route = useRoute()

const { data: post } = await useAsyncData(`blog-${route.path}`, () => queryCollection('blog').path(route.path).first())
if (!post.value) {
  throw createError({ statusCode: 404, statusMessage: 'Post not found', fatal: true })
}

useSeoMeta({ title: `${post.value.title} | ppo.gg`, description: post.value.description })
</script>

<template>
  <div v-if="post" class="wrap page">
    <NuxtLink class="back" to="/blog">blog</NuxtLink>
    <article class="post">
      <h1>{{ post.title }}</h1>
      <p class="meta">{{ post.date }}</p>
      <ContentRenderer :value="post" />
    </article>
  </div>
</template>
