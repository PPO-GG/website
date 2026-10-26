<script setup lang="ts">
const props = defineProps<{ lines: readonly string[] }>()

const HOLD_MS = 5200
const FADE_MS = 700

const index = ref(0)
const shown = ref(true)
let timer: ReturnType<typeof setTimeout> | undefined

function next() {
  shown.value = false
  timer = setTimeout(() => {
    index.value = (index.value + 1) % props.lines.length
    shown.value = true
    timer = setTimeout(next, HOLD_MS)
  }, FADE_MS)
}

onMounted(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || props.lines.length < 2) return
  timer = setTimeout(next, HOLD_MS)
})
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <p class="line" :class="{ out: !shown }" :style="{ '--fade': `${FADE_MS}ms` }">{{ lines[index] }}</p>
</template>
