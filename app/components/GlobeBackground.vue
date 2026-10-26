<script setup lang="ts">
// A slowly turning Earth drawn as a grid of squares. Land is bigger and brighter than sea.
const CELL = 9
const SPIN = 0.00005 // radians per ms
const TILT = 0.41
const START_LON = -1.1 // radians: which longitude faces us at load (the Americas)
const SEA_MIN = 0.16
const LIGHT = [-0.45, -0.5, 0.74] as const
const RAD = 180 / Math.PI
const INTRO_MS = 2600 // squares grow in from the center outward, with a random offset per square
const INTRO_SPREAD = 0.3 // how long each square takes to grow, as a share of the sweep
const INTRO_NOISE = 0.3 // how much of the order is random

function cellNoise(gx: number, gy: number): number {
  const h = Math.imul(gx * 73856093, 1) ^ Math.imul(gy * 19349663, 1)
  return (((h ^ (h >>> 13)) >>> 0) % 1000) / 1000
}

const canvas = ref<HTMLCanvasElement>()
let raf = 0
let stop = () => {}

onMounted(() => {
  const cv = canvas.value
  const ctx = cv?.getContext('2d')
  if (!cv || !ctx) return
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  let w = 0
  let h = 0
  let t0 = 0

  function resize() {
    if (!cv || !ctx) return
    const dpr = Math.min(2, devicePixelRatio || 1)
    w = innerWidth
    h = innerHeight
    cv.width = w * dpr
    cv.height = h * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
  resize()
  addEventListener('resize', resize)

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t
  const lenL = Math.hypot(...LIGHT)
  const ct = Math.cos(TILT)
  const st = Math.sin(TILT)

  function frame(t: number) {
    if (!ctx) return
    // Page 1: big and centered behind the logo. Page 2: pushed to the lower right.
    const prog = Math.min(1, Math.max(0, scrollY / Math.max(1, innerHeight)))
    const m = Math.min(w, h)
    const cx = lerp(w * 0.5, w * 0.84, prog)
    const cy = lerp(h * 0.5, h * 0.92, prog)
    const R = lerp(m * 0.42, m * 0.6, prog)
    const base = lerp(0.3, 0.2, prog)
    if (!t0) t0 = t
    const intro = reduced ? 1 : Math.min(1, (t - t0) / INTRO_MS)
    const sweep = (1 - Math.pow(1 - intro, 2)) * (1 + INTRO_SPREAD + INTRO_NOISE)
    const ang = reduced ? 0 : t * SPIN
    const ca = Math.cos(ang)
    const sa = Math.sin(ang)

    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = '#fff'
    const x0 = Math.floor((cx - R) / CELL) * CELL
    const y0 = Math.floor((cy - R) / CELL) * CELL
    for (let py = y0; py < cy + R; py += CELL) {
      for (let px = x0; px < cx + R; px += CELL) {
        const nx = (px + CELL / 2 - cx) / R
        const ny = (py + CELL / 2 - cy) / R
        const r2 = nx * nx + ny * ny
        if (r2 >= 1) continue
        let grow = 1
        if (intro < 1) {
          const order = Math.sqrt(r2) * (1 - INTRO_NOISE) + cellNoise(px / CELL, py / CELL) * INTRO_NOISE
          grow = Math.min(1, Math.max(0, (sweep - order) / INTRO_SPREAD))
          if (grow === 0) continue
        }
        const nz = Math.sqrt(1 - r2)
        // view space -> object space: undo the tilt (north pole leans toward us), then the spin
        const up = -ny
        const y1 = up * ct + nz * st
        const z1 = -up * st + nz * ct
        const ox = nx * ca - z1 * sa
        const oz = nx * sa + z1 * ca
        const lat = Math.asin(Math.max(-1, Math.min(1, y1))) * RAD
        const lon = (Math.atan2(ox, oz) + START_LON) * RAD
        const land = isEarthLand(((lon + 540) % 360) - 180, lat)
        const lit = Math.max(0, (nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]) / lenL)
        const limb = 1 - Math.pow(r2, 3) // fade toward the rim
        const size = (land ? CELL * (0.5 + 0.42 * lit) : CELL * (SEA_MIN + 0.14 * lit)) * grow
        ctx.globalAlpha = base * limb * (land ? 0.55 + 0.45 * lit : 0.55) * grow
        ctx.fillRect(px + (CELL - size) / 2, py + (CELL - size) / 2, size, size)
      }
    }
    ctx.globalAlpha = 1
    if (!reduced) raf = requestAnimationFrame(frame)
  }
  raf = requestAnimationFrame(frame)
  if (reduced) addEventListener('scroll', () => requestAnimationFrame(frame), { passive: true })

  stop = () => {
    cancelAnimationFrame(raf)
    removeEventListener('resize', resize)
  }
})
onBeforeUnmount(() => stop())
</script>

<template>
  <canvas ref="canvas" class="globe" aria-hidden="true" />
</template>
