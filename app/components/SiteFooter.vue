<script setup lang="ts">
import { SERVICES, SITE } from '~/data/site'
</script>

<template>
  <footer class="site-footer">
    <div class="wrap cols">
      <div>
        <p class="brand">{{ SITE.name }}<span>.gg</span></p>
        <p class="blurb">Software, web and platform engineering for organizations that need it to work.</p>
        <p><a :href="`mailto:${SITE.email}`">{{ SITE.email }}</a></p>
      </div>
      <nav aria-label="Services">
        <h2>Services</h2>
        <NuxtLink v-for="s in SERVICES" :key="s.id" :to="`/services#${s.id}`">{{ s.title }}</NuxtLink>
      </nav>
      <nav aria-label="Company">
        <h2>Company</h2>
        <NuxtLink to="/#work">Work</NuxtLink>
        <NuxtLink to="/#approach">Approach</NuxtLink>
        <NuxtLink to="/blog">Blog</NuxtLink>
        <NuxtLink to="/#contact">Contact</NuxtLink>
      </nav>
    </div>
    <div class="wrap legal">
      <span>&copy; {{ new Date().getFullYear() }} {{ SITE.domain }}. All rights reserved.</span>
    </div>
  </footer>
</template>
