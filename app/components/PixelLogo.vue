<script setup lang="ts">
const LOGO_SRC = "/logo.svg";
const LOGO_W = 1800;
const LOGO_H = 600;
const LOGO_FILL = 1;

const canvas = ref<HTMLCanvasElement>();
const failed = ref(false);
let pix: Pix | undefined;

function loadLogo(): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => {
      const c = makeCanvas(LOGO_W, LOGO_H);
      const s = Math.min(LOGO_W / im.width, LOGO_H / im.height) * LOGO_FILL;
      c.getContext("2d")?.drawImage(
        im,
        (LOGO_W - im.width * s) / 2,
        (LOGO_H - im.height * s) / 2,
        im.width * s,
        im.height * s,
      );
      resolve(c);
    };
    im.onerror = () => reject(new Error(`Logo failed to load: ${LOGO_SRC}`));
    im.src = LOGO_SRC;
  });
}

onMounted(async () => {
  if (!canvas.value) return;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  try {
    // Radial mode only reads steps[0] (coarsest block, in canvas px); each later level halves it
    // and the last is the sharp source. 15 canvas px = 10 CSS px at the full 1200px logo width
    // (1800 / 1200 = 1.5), which matches GlobeBackground's CELL. Keep the two in sync.
    pix = new Pix(canvas.value, {
      steps: [15, 7.5, 3.75, 1],
      ms: 150,
      radial: true,
      reduced,
    });
    pix.setSource(await loadLogo(), true);
  } catch (e) {
    console.error("PixelLogo: could not draw the logo", e);
    failed.value = true;
  }
});
onBeforeUnmount(() => pix?.destroy());

function enter(e: PointerEvent) {
  if (!pix) return;
  pix.point(e, !pix.influence);
  pix.hot = true;
}
function move(e: PointerEvent) {
  pix?.point(e);
}
function leave() {
  if (pix) pix.hot = false;
}
function press(e: PointerEvent) {
  if (e.pointerType !== "mouse") enter(e);
}
</script>

<template>
  <div
    class="logo"
    role="img"
    aria-label="ppo.gg"
    @pointerenter="enter"
    @pointermove="move"
    @pointerleave="leave"
    @pointerdown="press"
  >
    <canvas ref="canvas" />
    <span v-if="failed" class="logo-fallback">ppo.gg</span>
  </div>
</template>
