<script setup lang="ts">
const props = defineProps<{ lines: string[] }>()

const TYPE_MS = 45
const ERASE_MS = 18
const HOLD_MS = 2200
const GAP_MS = 300

const text = ref(props.lines[0] ?? '')
let stopped = false

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

onMounted(async () => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !props.lines.length) return
  let i = 0
  while (!stopped) {
    const s = props.lines[i++ % props.lines.length]!
    for (let k = 1; k <= s.length && !stopped; k++) {
      text.value = s.slice(0, k)
      await wait(TYPE_MS)
    }
    await wait(HOLD_MS)
    for (let k = s.length; k >= 0 && !stopped; k--) {
      text.value = s.slice(0, k)
      await wait(ERASE_MS)
    }
    await wait(GAP_MS)
  }
})
onBeforeUnmount(() => {
  stopped = true
})
</script>

<template>
  <p class="line" aria-live="off">{{ text }}<span class="caret" /></p>
</template>
