<script setup lang="ts">
useSeoMeta({ title: 'Blog | ppo.gg' })

const { data: posts } = await useAsyncData('blog-list', () =>
  queryCollection('blog').order('date', 'DESC').select('path', 'title', 'description', 'date').all(),
)
</script>

<template>
  <div class="wrap page">
    <NuxtLink class="back" to="/">ppo.gg</NuxtLink>
    <h1>Blog</h1>
    <p v-if="!posts?.length" class="empty">No posts yet. Add a markdown file to <code>content/blog</code>.</p>
    <ul class="posts">
      <li v-for="p in posts" :key="p.path">
        <NuxtLink :to="p.path">
          <b>{{ p.title }}</b>
          <span class="meta">{{ p.date }}</span>
          <span v-if="p.description" class="desc">{{ p.description }}</span>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
