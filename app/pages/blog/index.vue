<script setup lang="ts">
useSeoMeta({ title: 'Blog | PPO' })

const content = useContent()
const { data: loaded } = await useAsyncData('blog-list', () => content.posts())
const posts = computed(() => loaded.value?.data ?? [])
const failed = computed(() => loaded.value?.failed ?? false)

const formatDate = (iso: string) => iso.slice(0, 10)
</script>

<template>
  <div class="wrap page">
    <NuxtLink class="back" to="/">ppo.gg</NuxtLink>
    <h1>Blog</h1>
    <p v-if="failed" class="notice">Posts could not load. Reload the page in a minute.</p>
    <p v-else-if="!posts.length" class="empty">No posts yet.</p>
    <ul class="posts">
      <li v-for="p in posts" :key="p.id">
        <NuxtLink :to="`/blog/${p.slug}`">
          <b>{{ p.title }}</b>
          <span class="meta">{{ formatDate(p.publishedAt) }}</span>
          <span v-if="p.description" class="desc">{{ p.description }}</span>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
