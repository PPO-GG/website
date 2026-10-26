<script setup lang="ts">
import type { AppEntry } from '~/types/app'

const props = defineProps<{ apps: AppEntry[] }>()

const canvas = ref<HTMLCanvasElement>()
const active = ref<AppEntry>()
let pix: Pix | undefined

onMounted(async () => {
  if (!canvas.value) return
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  pix = new Pix(canvas.value, { steps: [40, 20, 10, 5, 2, 1], ms: 90, reduced })
  const first = props.apps[0]
  if (first) await show(first, false)
})
onBeforeUnmount(() => pix?.destroy())

async function show(app: AppEntry, hot: boolean) {
  if (!pix) return
  if (active.value?.name === app.name) {
    pix.hot = hot
    return
  }
  active.value = app
  const shot = await shotFor(app)
  if (active.value?.name !== app.name) return
  pix.setSource(shot, true)
  pix.hot = hot
}
function hostOf(href: string, fallback: string): string {
  try {
    return new URL(href).host
  } catch {
    return fallback // placeholder links like "#"
  }
}
function release() {
  if (pix) pix.hot = false
}
</script>

<template>
  <div class="apps">
    <ul class="list">
      <li v-for="a in apps" :key="a.name">
        <a
          class="row"
          :class="{ on: active?.name === a.name }"
          :href="a.href"
          @pointerenter="show(a, true)"
          @focus="show(a, true)"
          @pointerleave="release"
          @blur="release"
        >
          <b>{{ a.name }}</b>
          <span class="tag" :class="{ wip: a.status === 'wip' }">{{ a.status }}</span>
          <span class="meta">{{ a.kind }} / {{ a.year }}</span>
          <span v-if="a.description" class="desc">{{ a.description }}</span>
          <span class="chips">
            <span v-for="s in a.stack.split('/')" :key="s" class="chip">{{ s.trim() }}</span>
          </span>
        </a>
      </li>
    </ul>
    <div class="preview">
      <div class="bar" aria-hidden="true">
        <i /><i /><i />
        <span class="host">{{ active ? hostOf(active.href, active.name) : '' }}</span>
      </div>
      <div class="shot" aria-hidden="true"><canvas ref="canvas" /></div>
    </div>
  </div>
</template>
