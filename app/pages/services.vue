<script setup lang="ts">
import { defaultServices } from '~/data/defaults'

const blocks = await useManagedPage('services', defaultServices)

useSeoMeta({
  title: 'Services | PPO',
  description: 'Custom web applications, platform engineering, design, modernization, intelligence tooling and technical advisory from PPO.',
})
</script>

<template>
  <main class="inner">
    <BlocksBlockRenderer :blocks="blocks" />
  </main>
</template>
