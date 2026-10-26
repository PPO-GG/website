<script setup lang="ts">
interface Page {
  id: string
  label: string
}

const props = defineProps<{ pages: Page[] }>()

const current = ref(props.pages[0]?.id ?? '')
let observer: IntersectionObserver | undefined

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) if (e.isIntersecting) current.value = e.target.id
    },
    { threshold: 0.55 },
  )
  for (const p of props.pages) {
    const el = document.getElementById(p.id)
    if (el) observer.observe(el)
  }
})
onBeforeUnmount(() => {
  observer?.disconnect()
  window.removeEventListener('wheel', onWheel)
})

// One wheel gesture flips one page. The lock ignores the tail of a trackpad swipe.
const WHEEL_MIN = 4
const LOCK_MS = 900
let locked = false

function onWheel(e: WheelEvent) {
  if (Math.abs(e.deltaY) < WHEEL_MIN) return
  e.preventDefault()
  if (locked) return
  const i = props.pages.findIndex((p) => p.id === current.value)
  const next = props.pages[Math.min(props.pages.length - 1, Math.max(0, i + Math.sign(e.deltaY)))]
  if (!next || next.id === current.value) return
  locked = true
  go(next.id)
  setTimeout(() => (locked = false), LOCK_MS)
}

onMounted(() => window.addEventListener('wheel', onWheel, { passive: false }))

function go(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}
</script>

<template>
  <nav class="dots" aria-label="Pages">
    <button
      v-for="p in pages"
      :key="p.id"
      type="button"
      :class="{ on: current === p.id }"
      :aria-label="`Go to ${p.label}`"
      :aria-current="current === p.id ? 'page' : undefined"
      @click="go(p.id)"
    />
  </nav>
</template>
