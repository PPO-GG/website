import { beforeEach, describe, expect, it, vi } from 'vitest'
import { checkUpload, isMediaId } from '../server/utils/media'
import type { R2BucketLike } from '../server/utils/media'

const files = vi.hoisted(() => ({ parts: [] as unknown[] | undefined }))
const owner = vi.hoisted(() => ({ fail: null as null | { statusCode: number } }))

vi.mock('h3', async (importOriginal) => ({
  ...(await importOriginal<typeof import('h3')>()),
  defineEventHandler: (handler: unknown) => handler,
  readMultipartFormData: async () => files.parts,
}))
vi.mock('../server/utils/access', () => ({
  requireOwner: async () => {
    if (owner.fail) throw Object.assign(new Error('denied'), owner.fail)
    return { email: 'owner@example.com' }
  },
}))

type Handler = (event: unknown) => Promise<unknown>
const MB10 = 10 * 1024 * 1024
const err = (p: Promise<unknown>) => p.then(() => null, (e: unknown) => e)
const code = (fn: () => void) => {
  try {
    fn()
  } catch (e) {
    return (e as { statusCode?: number }).statusCode
  }
  return undefined
}

function fakeR2() {
  const store = new Map<string, { body: Uint8Array; contentType: string }>()
  const bucket: R2BucketLike = {
    put: async (key, body, o) => {
      store.set(key, { body, contentType: o.httpMetadata.contentType })
    },
    get: async (key) => {
      const o = store.get(key)
      return o ? { body: o.body, httpMetadata: { contentType: o.contentType }, size: o.body.length } : null
    },
  }
  return { bucket, store }
}

let r2: ReturnType<typeof fakeR2>

function event(over: { method?: string; params?: Record<string, string>; headers?: Record<string, string> } = {}) {
  const method = over.method ?? 'POST'
  const headers = { host: 'localhost', ...(over.headers ?? {}) }
  return {
    method,
    path: '/x',
    node: { req: { method, url: '/x', headers }, res: {} },
    context: { params: over.params ?? {}, cloudflare: { env: { MEDIA: r2.bucket } } },
  }
}
const part = (filename: string, type: string, size = 4, name = 'file') => ({ name, filename, type, data: new Uint8Array(size).fill(1) })

const upload = async () => (await import('../server/api/admin/upload.post')).default as Handler
const serve = async () => (await import('../server/routes/media/[id].get')).default as Handler

beforeEach(() => {
  r2 = fakeR2()
  files.parts = []
  owner.fail = null
})

describe('checkUpload', () => {
  it.each(['a.html', 'a.exe', 'x.png.html', 'noext', 'a.', '.png.exe'])('rejects %s with 415', (name) => {
    expect(code(() => checkUpload(name, 10, 'image/png'))).toBe(415)
  })
  it('rejects 10 MB + 1 byte with 413', () => {
    expect(code(() => checkUpload('a.png', MB10 + 1, 'image/png'))).toBe(413)
  })
  it.each([
    ['a.png', 'image/png'],
    ['a.jpg', 'image/jpeg'],
    ['a.jpeg', 'image/jpeg'],
    ['a.WEBP', 'image/webp'],
    ['a.gif', 'image/gif'],
    ['a.svg', 'image/svg+xml'],
  ])('accepts %s at exactly 10 MB', (name, type) => {
    expect(code(() => checkUpload(name, MB10, type))).toBeUndefined()
  })
  it.each([
    ['a.png', 'text/html'],
    ['a.png', 'image/jpeg'],
    ['a.svg', 'image/png'],
    ['a.png', ''],
  ])('rejects %s declared as "%s" with 415', (name, type) => {
    expect(code(() => checkUpload(name, 10, type))).toBe(415)
  })
})

describe('isMediaId', () => {
  const uuid = '123e4567-e89b-12d3-a456-426614174000'
  it.each([`${uuid}.png`, `${uuid}.jpg`, `${uuid}.jpeg`, `${uuid}.webp`, `${uuid}.gif`, `${uuid}.svg`])('accepts %s', (id) => {
    expect(isMediaId(id)).toBe(true)
  })
  it.each(['../x', '', undefined, `${uuid.toUpperCase()}.png`, `${uuid}.html`, `${uuid}.PNG`, '123e4567.png', `../${uuid}.png`, `${uuid}.png/x`])(
    'rejects %s',
    (id) => {
      expect(isMediaId(id)).toBe(false)
    },
  )
})

describe('POST /api/admin/upload', () => {
  it('gives 401 without a token and leaves R2 untouched', async () => {
    owner.fail = { statusCode: 401 }
    files.parts = [part('a.png', 'image/png')]
    expect(await err((await upload())(event()))).toMatchObject({ statusCode: 401 })
    expect(r2.store.size).toBe(0)
  })
  it('gives 403 for a cross-site upload and leaves R2 untouched', async () => {
    files.parts = [part('a.png', 'image/png')]
    const e = event({ headers: { 'sec-fetch-site': 'cross-site' } })
    expect(await err((await upload())(e))).toMatchObject({ statusCode: 403 })
    expect(r2.store.size).toBe(0)
  })
  it('stores one object and returns id and url', async () => {
    files.parts = [part('Photo.PNG', 'image/png')]
    const result = (await (await upload())(event())) as { id: string; url: string }
    expect(result.id).toMatch(/^[0-9a-f-]{36}\.png$/)
    expect(result.url).toBe(`/media/${result.id}`)
    expect([...r2.store.keys()]).toEqual([result.id])
    expect(r2.store.get(result.id)?.contentType).toBe('image/png')
  })
  it('stores jpeg as given', async () => {
    files.parts = [part('a.jpeg', 'image/jpeg')]
    const result = (await (await upload())(event())) as { id: string }
    expect(result.id.endsWith('.jpeg')).toBe(true)
  })
  it.each([
    ['x.png.html', 'image/png', 415],
    ['a.png', 'text/html', 415],
    ['a.exe', 'application/octet-stream', 415],
  ])('rejects %s (%s) with %i before writing', async (name, type, status) => {
    files.parts = [part(name, type)]
    expect(await err((await upload())(event()))).toMatchObject({ statusCode: status })
    expect(r2.store.size).toBe(0)
  })
  it('checks the real byte length, not a header', async () => {
    files.parts = [part('a.png', 'image/png', MB10 + 1)]
    const e = event({ headers: { 'content-length': '10' } })
    expect(await err((await upload())(e))).toMatchObject({ statusCode: 413 })
    expect(r2.store.size).toBe(0)
  })
  it.each([
    ['no parts', undefined],
    ['empty', []],
    ['wrong field name', [part('a.png', 'image/png', 4, 'other')]],
    ['two files', [part('a.png', 'image/png'), part('b.png', 'image/png')]],
    ['no filename', [{ name: 'file', type: 'image/png', data: new Uint8Array(4) }]],
  ])('gives 400 for %s', async (_label, parts) => {
    files.parts = parts as unknown[] | undefined
    expect(await err((await upload())(event()))).toMatchObject({ statusCode: 400 })
    expect(r2.store.size).toBe(0)
  })
})

describe('GET /media/[id]', () => {
  const png = '123e4567-e89b-12d3-a456-426614174000.png'
  const svg = '123e4567-e89b-12d3-a456-426614174001.svg'
  beforeEach(async () => {
    await r2.bucket.put(png, new Uint8Array([1, 2]), { httpMetadata: { contentType: 'text/html' } })
    await r2.bucket.put(svg, new Uint8Array([3]), { httpMetadata: { contentType: 'image/svg+xml' } })
  })

  it('serves png with cache and nosniff headers and the type from the extension', async () => {
    const res = (await (await serve())(event({ method: 'GET', params: { id: png } }))) as Response
    expect(res.headers.get('content-type')).toBe('image/png')
    expect(res.headers.get('cache-control')).toBe('public, max-age=31536000, immutable')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('content-security-policy')).toBeNull()
  })
  it('serves svg with the sandbox header', async () => {
    const res = (await (await serve())(event({ method: 'GET', params: { id: svg } }))) as Response
    expect(res.headers.get('content-type')).toBe('image/svg+xml')
    expect(res.headers.get('content-security-policy')).toBe('sandbox')
  })
  it('gives 404 for an unknown id', async () => {
    const id = '123e4567-e89b-12d3-a456-426614174999.png'
    expect(await err((await serve())(event({ method: 'GET', params: { id } })))).toMatchObject({ statusCode: 404 })
  })
  it('gives 404 for an invalid id without touching R2', async () => {
    const get = vi.fn()
    r2.bucket.get = get
    for (const id of ['../x', '', 'ABC.png']) {
      expect(await err((await serve())(event({ method: 'GET', params: { id } })))).toMatchObject({ statusCode: 404 })
    }
    expect(get).not.toHaveBeenCalled()
  })
  it('gives a generic 500 when R2 fails', async () => {
    r2.bucket.get = async () => {
      throw new Error('secret detail')
    }
    const error = await err((await serve())(event({ method: 'GET', params: { id: png } })))
    expect(error).toMatchObject({ statusCode: 500 })
    expect(JSON.stringify(error)).not.toContain('secret')
  })
})
