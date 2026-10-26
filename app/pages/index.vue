<script setup lang="ts">
import { defaultHome } from '~/data/defaults'

const blocks = await useManagedPage('home', defaultHome)

useSeoMeta({
  title: 'PPO | Software, web and platform engineering',
  description: 'PPO designs and builds powerful, fast and beautiful software: web applications, platforms, intelligence tooling and technical advisory.',
})
</script>

<template>
  <main>
    <BlocksBlockRenderer :blocks="blocks" />
  </main>
</template>
