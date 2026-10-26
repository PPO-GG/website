// Pixel-resolve renderer. Client only: it needs canvas and requestAnimationFrame.

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

function ctx2d(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const x = c.getContext('2d')
  if (!x) throw new Error('2D canvas is not available')
  return x
}

/** Successive halving keeps big downscales from aliasing. */
export function downscale(src: HTMLCanvasElement, w: number, h: number): HTMLCanvasElement {
  let cur = src
  while (cur.width / 2 >= w && cur.height / 2 >= h) {
    const n = makeCanvas(Math.ceil(cur.width / 2), Math.ceil(cur.height / 2))
    const x = ctx2d(n)
    x.imageSmoothingQuality = 'high'
    x.drawImage(cur, 0, 0, n.width, n.height)
    cur = n
  }
  const o = makeCanvas(w, h)
  const x = ctx2d(o)
  x.imageSmoothingQuality = 'high'
  x.drawImage(cur, 0, 0, w, h)
  return o
}

interface Grid {
  cols: number
  rows: number
  a: Uint8Array
}

export interface PixOptions {
  /** Block sizes, coarse to fine. The last step (1) is the sharp source. */
  steps: number[]
  /** Milliseconds per step in smooth mode. */
  ms: number
  /** Squares that split near the pointer (logo). Off: whole image steps from blocks to sharp. */
  radial?: boolean
  reduced: boolean
}

const ALPHA_MIN = 115
const BUILD_MS = 1600
const GAP = 0.16
const RADIUS_RATIO = 0.11
const NOISE = 0.7
const GROW_MS = 220
const FOLLOW_MS = 90

const instances = new Set<Pix>()
let raf = 0

function loop(t: number): void {
  instances.forEach((p) => p.tick(t))
  raf = instances.size ? requestAnimationFrame(loop) : 0
}

export class Pix {
  hot = false
  private ctx: CanvasRenderingContext2D
  private level = 0
  private last = 0
  private lv: HTMLCanvasElement[] = []
  private grids: Grid[] = []
  private radial = false
  private p = 1 // build-up progress, 0 (nothing) to 1 (done)
  private pt = 0
  private f = 0 // pointer influence, 0 to 1
  private lt = 0
  private mx = 0
  private my = 0
  private tx = 0
  private ty = 0
  private rmax = 0

  constructor(private cv: HTMLCanvasElement, private opts: PixOptions) {
    this.ctx = ctx2d(cv)
    instances.add(this)
    if (!raf) raf = requestAnimationFrame(loop)
  }

  destroy(): void {
    instances.delete(this)
  }

  /** Pointer position in canvas pixels. Pass `snap` to jump instead of easing. */
  point(e: PointerEvent, snap = false): void {
    const r = this.cv.getBoundingClientRect()
    this.tx = ((e.clientX - r.left) / r.width) * this.cv.width
    this.ty = ((e.clientY - r.top) / r.height) * this.cv.height
    if (snap) {
      this.mx = this.tx
      this.my = this.ty
    }
  }

  get influence(): number {
    return this.f
  }

  setSource(src: HTMLCanvasElement, reset: boolean): void {
    const { steps, radial, reduced } = this.opts
    const n = steps.length
    this.cv.width = src.width
    this.cv.height = src.height
    // Radial: every level is exactly 2x2 cells per parent, so cells split one by one.
    const c0 = Math.ceil(src.width / steps[0]!)
    const r0 = Math.ceil(src.height / steps[0]!)
    this.lv = steps.map((b, k) => {
      if (radial) return k === n - 1 ? src : downscale(src, c0 << k, r0 << k)
      return b === 1 ? src : downscale(src, Math.max(1, Math.ceil(src.width / b)), Math.max(1, Math.ceil(src.height / b)))
    })
    this.grids = []
    let canRead = !!radial
    if (radial) {
      try {
        this.grids = this.lv.slice(0, n - 1).map((c) => {
          const d = ctx2d(c).getImageData(0, 0, c.width, c.height).data
          const a = new Uint8Array(c.width * c.height)
          for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3]!
          return { cols: c.width, rows: c.height, a }
        })
      } catch {
        canRead = false // tainted canvas: fall back to smooth blocks
      }
    }
    this.radial = canRead && !reduced
    this.rmax = src.width * RADIUS_RATIO
    if (!this.mx) {
      this.mx = this.tx = src.width / 2
      this.my = this.ty = src.height / 2
    }
    if (reset) {
      this.level = reduced ? n - 1 : 0
      this.p = reduced || !this.radial ? 1 : 0
      this.pt = 0
    }
    this.draw()
  }

  private draw(): void {
    if (!this.lv.length) return
    if (this.radial) return this.drawRadial()
    const c = this.ctx
    c.clearRect(0, 0, this.cv.width, this.cv.height)
    c.imageSmoothingEnabled = this.level === this.opts.steps.length - 1
    c.drawImage(this.lv[this.level]!, 0, 0, this.cv.width, this.cv.height)
  }

  // Squares near the pointer split into 4, again and again. A fixed random offset
  // per cell makes the border between coarse and fine noisy instead of a clean ring.
  private drawRadial(): void {
    const c = this.ctx
    const W = this.cv.width
    const H = this.cv.height
    const T = this.opts.steps.length - 1
    const R = this.f * this.rmax
    const x = this.mx
    const y = this.my
    const grids = this.grids
    const p = this.p
    const path = new Path2D()
    const vec = new Path2D()
    let hasVec = false

    const cell = (k: number, q: number, r: number): void => {
      const g = grids[k]!
      const a = g.a[r * g.cols + q]!
      if (a === 0) return
      const cw = W / g.cols
      const ch = H / g.rows
      let target = 0
      if (R > 1) {
        const d = Math.hypot((q + 0.5) * cw - x, (r + 0.5) * ch - y)
        if (d < R * 1.35) {
          const h = ((((q * 73856093) ^ (r * 19349663) ^ (k * 83492791)) >>> 0) % 1000) / 1000
          const u = 1 - d / R + (h - 0.5) * NOISE
          target = u <= 0 ? 0 : Math.min(T, 1 + Math.floor(u * T))
        }
      }
      if (target > k) {
        if (k < T - 1) {
          const q2 = q * 2
          const r2 = r * 2
          cell(k + 1, q2, r2)
          cell(k + 1, q2 + 1, r2)
          cell(k + 1, q2, r2 + 1)
          cell(k + 1, q2 + 1, r2 + 1)
        } else {
          vec.rect(q * cw, r * ch, cw, ch)
          hasVec = true
        }
        return
      }
      if (a < ALPHA_MIN) return
      if (p < 1) {
        const j = ((q * 73856093) ^ (r * 19349663)) >>> 0
        const t = q / g.cols
        if (t + (((j % 1000) / 1000) * 0.18) > p * 1.18) return
      }
      const gx = cw * GAP
      const gy = ch * GAP
      path.rect(q * cw + gx / 2, r * ch + gy / 2, cw - gx, ch - gy)
    }

    const g0 = grids[0]!
    for (let r = 0; r < g0.rows; r++) for (let q = 0; q < g0.cols; q++) cell(0, q, r)
    c.clearRect(0, 0, W, H)
    c.fillStyle = '#fff'
    c.fill(path)
    if (hasVec) {
      const bx = Math.max(0, x - R * 1.4)
      const by = Math.max(0, y - R * 1.4)
      const bw = Math.min(W, x + R * 1.4) - bx
      const bh = Math.min(H, y + R * 1.4) - by
      c.save()
      c.clip(vec)
      c.imageSmoothingEnabled = true
      c.drawImage(this.lv[T]!, bx, by, bw, bh, bx, by, bw, bh)
      c.restore()
    }
  }

  tick(t: number): void {
    if (this.opts.reduced) {
      this.level = this.opts.steps.length - 1
      return
    }
    if (this.p < 1) {
      if (!this.pt) this.pt = t
      this.p = Math.min(1, (t - this.pt) / BUILD_MS)
      this.draw()
    }
    if (this.radial) {
      const dt = this.lt ? Math.min(64, t - this.lt) : 16
      this.lt = t
      const to = this.hot ? 1 : 0
      const df = (to - this.f) * Math.min(1, dt / GROW_MS)
      const dx = (this.tx - this.mx) * Math.min(1, dt / FOLLOW_MS)
      const dy = (this.ty - this.my) * Math.min(1, dt / FOLLOW_MS)
      if (Math.abs(df) > 1e-4 || (this.f > 0 && Math.abs(dx) + Math.abs(dy) > 0.05)) {
        this.f = Math.abs(to - this.f) < 0.003 ? to : this.f + df
        this.mx += dx
        this.my += dy
        this.draw()
      }
      return
    }
    if (t - this.last < this.opts.ms) return
    const target = this.hot ? this.opts.steps.length - 1 : 0
    if (this.level === target) return
    this.last = t
    this.level += this.level < target ? 1 : -1
    this.draw()
  }
}
