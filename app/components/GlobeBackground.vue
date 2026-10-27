<script setup lang="ts">
// A slowly turning Earth drawn as a grid of squares. Land is bigger and brighter than sea.
const CELL = 10;
const SPIN = 0.00005; // radians per ms
const TILT = 0.41;
const START_LON = -1.1; // radians: which longitude faces us at load (the Americas)
const SEA_MIN = 0.16;
// Sun direction, set with two angles (degrees):
//  SUN_AZIMUTH: where the sun is on screen, clockwise from the top (0 = top, 90 = right, 180 = bottom, 270 = left)
//  SUN_PHASE: 0 = sun behind the viewer (full face lit), 90 = half lit, 150+ = thin crescent
const SUN_AZIMUTH = 300;
const SUN_PHASE = 38;
const _az = (SUN_AZIMUTH * Math.PI) / 180;
const _ph = (SUN_PHASE * Math.PI) / 180;
const LIGHT = [
  Math.sin(_ph) * Math.sin(_az),
  -Math.sin(_ph) * Math.cos(_az),
  Math.cos(_ph),
] as const;
const RAD = 180 / Math.PI;
const INTRO_MS = 2600; // squares grow in from the center outward, with a random offset per square
const INTRO_SPREAD = 0.3; // how long each square takes to grow, as a share of the sweep
const INTRO_NOISE = 0.3; // how much of the order is random
const HALO = 0.25; // atmosphere thickness beyond the disk, as a share of the radius
const SKY_BLUE = [140, 185, 255] as const; // Rayleigh: short wavelengths scatter most when the sun is high
const SKY_WARM = [255, 140, 80] as const; // low sun: the blue is scattered away along the long path, leaving orange
const TINT_LIMB = 1; // how strongly the rim of the lit side takes on the sky colour

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

// Sky colour for a point whose sun incidence is `d` (1 = sun overhead, 0 = on the terminator).
function skyColor(d: number): [number, number, number] {
  const s = clamp01(d / 0.5);
  const k = s * s * (3 - 2 * s); // smoothstep: 0 = sunset, 1 = daylight
  return [
    SKY_WARM[0] + (SKY_BLUE[0] - SKY_WARM[0]) * k,
    SKY_WARM[1] + (SKY_BLUE[1] - SKY_WARM[1]) * k,
    SKY_WARM[2] + (SKY_BLUE[2] - SKY_WARM[2]) * k,
  ];
}

function mixWhite(c: [number, number, number], t: number): string {
  const r = 255 + (c[0] - 255) * t;
  const g = 255 + (c[1] - 255) * t;
  const b = 255 + (c[2] - 255) * t;
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

function cellNoise(gx: number, gy: number): number {
  const h = Math.imul(gx * 73856093, 1) ^ Math.imul(gy * 19349663, 1);
  return (((h ^ (h >>> 13)) >>> 0) % 1000) / 1000;
}

const canvas = ref<HTMLCanvasElement>();
let raf = 0;
let stop = () => {};

onMounted(() => {
  const cv = canvas.value;
  const ctx = cv?.getContext("2d");
  if (!cv || !ctx) return;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let w = 0;
  let h = 0;
  let t0 = 0;

  function resize() {
    if (!cv || !ctx) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    w = innerWidth;
    h = innerHeight;
    cv.width = w * dpr;
    cv.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  addEventListener("resize", resize);

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const lenL = Math.hypot(...LIGHT);
  const ct = Math.cos(TILT);
  const st = Math.sin(TILT);

  function frame(t: number) {
    if (!ctx) return;
    // Big and centered behind the logo, then pushed to the lower right and faded as the page scrolls.
    const prog = Math.min(1, Math.max(0, scrollY / Math.max(1, innerHeight)));
    const m = Math.min(w, h);
    const cx = lerp(w * 0.5, w * 0.84, prog);
    const cy = lerp(h * 0.5, h * 0.92, prog);
    const R = lerp(m * 0.42, m * 0.6, prog);
    const base = lerp(0.3, 0.07, prog);
    if (!t0) t0 = t;
    const intro = reduced ? 1 : Math.min(1, (t - t0) / INTRO_MS);
    const sweep =
      (1 - Math.pow(1 - intro, 2)) * (1 + INTRO_SPREAD + INTRO_NOISE);
    const ang = reduced ? 0 : t * SPIN;
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);

    ctx.clearRect(0, 0, w, h);
    // Opaque black body so the starfield doesn't show through the gaps between squares.
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(cx, cy, R * (1 - Math.pow(1 - intro, 2)), 0, Math.PI * 2);
    ctx.fill();
    const RH = R * (1 + HALO);
    const x0 = Math.floor((cx - RH) / CELL) * CELL;
    const y0 = Math.floor((cy - RH) / CELL) * CELL;
    for (let py = y0; py < cy + RH; py += CELL) {
      for (let px = x0; px < cx + RH; px += CELL) {
        const nx = (px + CELL / 2 - cx) / R;
        const ny = (py + CELL / 2 - cy) / R;
        const r2 = nx * nx + ny * ny;
        const e = Math.sqrt(r2);
        if (e >= 1 + HALO) continue;
        let grow = 1;
        if (intro < 1) {
          const order =
            e * (1 - INTRO_NOISE) +
            cellNoise(px / CELL, py / CELL) * INTRO_NOISE;
          grow = Math.min(1, Math.max(0, (sweep - order) / INTRO_SPREAD));
          if (grow === 0) continue;
        }
        if (r2 >= 1) {
          // Atmosphere halo: sits just past the limb, brightest where the sun side meets the rim.
          const fall = 1 - (e - 1) / HALO;
          const sunSide = (nx * LIGHT[0] + ny * LIGHT[1]) / (e * lenL); // incidence along the rim direction
          const glow = fall * fall * clamp01(sunSide + 0.3);
          if (glow < 0.02) continue;
          const hsize = CELL * (0.2 + 0.5 * glow) * grow;
          ctx.fillStyle = mixWhite(skyColor(sunSide + 0.15), 0.9);
          ctx.globalAlpha = base * 1.1 * glow * grow;
          ctx.fillRect(
            px + (CELL - hsize) / 2,
            py + (CELL - hsize) / 2,
            hsize,
            hsize,
          );
          continue;
        }
        const nz = Math.sqrt(1 - r2);
        // view space -> object space: undo the tilt (north pole leans toward us), then the spin
        const up = -ny;
        const y1 = up * ct + nz * st;
        const z1 = -up * st + nz * ct;
        const ox = nx * ca - z1 * sa;
        const oz = nx * sa + z1 * ca;
        const lat = Math.asin(Math.max(-1, Math.min(1, y1))) * RAD;
        const lon = (Math.atan2(ox, oz) + START_LON) * RAD;
        const land = isEarthLand(((lon + 540) % 360) - 180, lat);
        const lit = Math.max(
          0,
          (nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]) / lenL,
        );
        const limb = 1 - Math.pow(r2, 3); // fade toward the rim
        const size =
          (land ? CELL * (0.5 + 0.42 * lit) : CELL * (SEA_MIN + 0.14 * lit)) *
          grow;
        // Rayleigh tint: more atmosphere along the line of sight near the rim (~1/nz), only where the sun reaches.
        const air = 1 - nz; // 0 at the center, 1 at the rim
        const sunny = clamp01((lit + 0.1) * 1.4);
        const tint = clamp01(air * air * 1.4) * sunny * TINT_LIMB;
        ctx.fillStyle = mixWhite(skyColor(lit), tint);
        ctx.globalAlpha =
          base * limb * (land ? 0.55 + 0.45 * lit : 0.55) * grow;
        ctx.fillRect(
          px + (CELL - size) / 2,
          py + (CELL - size) / 2,
          size,
          size,
        );
      }
    }
    ctx.globalAlpha = 1;
    if (!reduced) raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  if (reduced)
    addEventListener("scroll", () => requestAnimationFrame(frame), {
      passive: true,
    });

  stop = () => {
    cancelAnimationFrame(raf);
    removeEventListener("resize", resize);
  };
});
onBeforeUnmount(() => stop());
</script>

<template>
  <canvas ref="canvas" class="globe" aria-hidden="true" />
</template>
