<script setup lang="ts">
import { SITE } from '~/data/site'
import type { NavLink } from '~/utils/content/site'
import { navAttrs } from '~/utils/content/site'

defineProps<{ banner: string; nav: NavLink[] }>()

const open = ref(false)
const clock = ref('')
let tick: ReturnType<typeof setInterval> | undefined
const stamp = () => (clock.value = new Date().toISOString().slice(11, 19))
onMounted(() => {
  stamp()
  tick = setInterval(stamp, 1000)
})
onBeforeUnmount(() => clearInterval(tick))
const route = useRoute()
watch(() => route.fullPath, () => (open.value = false))
</script>

<template>
  <header class="site-header" :class="{ open }">
    <div class="strip">
      <div class="wrap">
        <span>{{ banner }}</span>
        <span class="sys"><i aria-hidden="true" />SYS ONLINE</span>
        <span class="utc">{{ clock ? `UTC ${clock}` : '' }}</span>
      </div>
    </div>
    <div class="wrap bar">
      <NuxtLink to="/" class="brand" aria-label="PPO home">{{ SITE.name }}<span>.gg</span></NuxtLink>
      <button type="button" class="burger" :aria-expanded="open" aria-controls="site-nav" aria-label="Menu" @click="open = !open">
        <i /><i /><i />
      </button>
      <nav id="site-nav" aria-label="Main">
        <NuxtLink v-for="n in nav" :key="n.to + n.label" :to="navAttrs(n.to).to" :external="navAttrs(n.to).external" :class="{ here: route.path === n.to }" active-class="" exact-active-class="">{{ n.label }}</NuxtLink>
        <NuxtLink class="btn small" to="/#contact">Contact</NuxtLink>
      </nav>
    </div>
  </header>
</template>
