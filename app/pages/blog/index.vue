<script setup lang="ts">
useSeoMeta({ title: 'Blog | PPO', description: 'Notes on building fast, beautiful and reliable software.' })

const content = useContent()
const { data: loaded } = await useAsyncData('blog-list', () => content.posts())
const posts = computed(() => loaded.value?.data ?? [])
const failed = computed(() => loaded.value?.failed ?? false)

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
</script>

<template>
  <main class="inner">
    <section class="blk blk-hero">
      <div class="wrap">
        <p class="eyebrow">Insights</p>
        <h1>Blog</h1>
        <p class="lead">Notes on building fast, beautiful and reliable software.</p>
      </div>
    </section>
    <section class="blk">
      <div class="wrap">
        <p v-if="failed" class="notice">Posts could not load. Reload the page in a minute.</p>
        <p v-else-if="!posts.length" class="empty">No posts yet.</p>
        <ul class="post-grid">
          <li v-for="p in posts" :key="p.id">
            <NuxtLink :to="`/blog/${p.slug}`" class="post-card">
              <span class="meta">{{ formatDate(p.publishedAt) }}</span>
              <b>{{ p.title }}</b>
              <span v-if="p.description" class="desc">{{ p.description }}</span>
              <span class="more">Read article</span>
            </NuxtLink>
          </li>
        </ul>
      </div>
    </section>
  </main>
</template>
