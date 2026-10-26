import type { AppEntry } from '~/types/app'

const SHOT_W = 960
const SHOT_H = 600

const cache = new Map<string, HTMLCanvasElement>()

/** Placeholder screenshot: a wireframe seeded by the app name, so the effect has something to resolve. */
function wireframe(name: string): HTMLCanvasElement {
  const c = makeCanvas(SHOT_W, SHOT_H)
  const x = c.getContext('2d')
  if (!x) throw new Error('2D canvas is not available')
  let s = 0
  for (const ch of name) s = (s * 31 + ch.charCodeAt(0)) >>> 0
  const r = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296
  x.fillStyle = '#fff'
  x.strokeStyle = '#fff'
  x.lineWidth = 6
  x.strokeRect(30, 30, SHOT_W - 60, SHOT_H - 60)
  x.fillRect(30, 30, SHOT_W - 60, 56)
  x.fillRect(30, 86, 190, SHOT_H - 116)
  for (let i = 0; i < 6; i++) x.fillRect(52, 120 + i * 42, 60 + r() * 100, 14)
  for (let i = 0; i < 4; i++) {
    const h = 60 + r() * 220
    x.fillRect(260 + i * 160, 520 - h, 110, h)
  }
  x.fillRect(260, 120, 300 + r() * 200, 22)
  x.font = '700 64px "Space Grotesk",sans-serif'
  x.fillText(name, 540, 200)
  return c
}

/** Screenshot canvas for an app: its `img` if it loads, else the wireframe. */
export async function shotFor(app: AppEntry): Promise<HTMLCanvasElement> {
  const hit = cache.get(app.id)
  if (hit) return hit
  let out: HTMLCanvasElement | undefined
  const imgSrc = app.img
  if (imgSrc) {
    out = await new Promise<HTMLCanvasElement | undefined>((resolve) => {
      const im = new Image()
      im.onload = () => {
        const c = makeCanvas(SHOT_W, SHOT_H)
        c.getContext('2d')?.drawImage(im, 0, 0, SHOT_W, SHOT_H)
        resolve(c)
      }
      im.onerror = () => resolve(undefined)
      im.src = imgSrc
    })
  }
  out ??= wireframe(app.name)
  cache.set(app.id, out)
  return out
}
