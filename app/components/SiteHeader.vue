<script setup lang="ts">
import type { NavLink } from "~/utils/content/site";
import { navAttrs } from "~/utils/content/site";

defineProps<{ banner?: string; nav: NavLink[] }>();

const open = ref(false);
const isScrolled = ref(false);
const route = useRoute();
watch(
  () => route.fullPath,
  () => (open.value = false),
);

const onScroll = () => {
  isScrolled.value = window.scrollY > 20;
};

onMounted(() => {
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
});

onUnmounted(() => {
  window.removeEventListener("scroll", onScroll);
});
</script>

<template>
  <header class="site-header" :class="{ open, scrolled: isScrolled }">
    <div class="bar wrap">
      <NuxtLink to="/" class="brand-logo" aria-label="Home">
        <img src="/logo.svg" alt="PPO" height="32" />
      </NuxtLink>
      <button
        type="button"
        class="burger"
        :aria-expanded="open"
        aria-controls="site-nav"
        aria-label="Menu"
        @click="open = !open"
      >
        <i /><i /><i />
      </button>
      <nav id="site-nav" aria-label="Main">
        <NuxtLink
          v-for="n in nav"
          :key="n.to + n.label"
          :to="navAttrs(n.to).to"
          :external="navAttrs(n.to).external"
          :class="{ here: route.path === n.to }"
          active-class=""
          exact-active-class=""
          >{{ n.label }}</NuxtLink
        >
        <NuxtLink class="btn small" to="/#contact">Contact</NuxtLink>
      </nav>
    </div>
  </header>
</template>
