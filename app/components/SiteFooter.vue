<script setup lang="ts">
import { SITE } from "~/data/site";
import type { SiteSettings } from "~/utils/content/site";
import { navAttrs } from "~/utils/content/site";
import { slugify } from "~/utils/content/slug";

defineProps<{ settings: SiteSettings; services: string[] }>();
</script>

<template>
  <footer class="site-footer">
    <div class="wrap cols">
      <div>
        <NuxtLink to="/" class="brand-logo" aria-label="Home">
          <img src="/logo.svg" alt="PPO" height="32" />
        </NuxtLink>
        <p class="blurb">{{ settings.blurb }}</p>
        <p>
          <a :href="`mailto:${settings.email}`">{{ settings.email }}</a>
        </p>
      </div>
      <nav aria-label="Services">
        <h2>Services</h2>
        <NuxtLink
          v-for="s in services"
          :key="s"
          :to="`/services#${slugify(s)}`"
          >{{ s }}</NuxtLink
        >
      </nav>
      <nav aria-label="Company">
        <h2>Company</h2>
        <NuxtLink
          v-for="n in settings.nav"
          :key="n.to + n.label"
          :to="navAttrs(n.to).to"
          :external="navAttrs(n.to).external"
          >{{ n.label }}</NuxtLink
        >
      </nav>
    </div>
    <div class="wrap legal">
      <span
        >&copy; {{ new Date().getFullYear() }} {{ SITE.domain }}. All rights
        reserved.</span
      >
    </div>
  </footer>
</template>
