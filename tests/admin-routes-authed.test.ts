import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { D1Like } from '../server/utils/db'
import { makeTestDb } from './helpers/d1'

vi.mock('h3', async (importOriginal) => ({
  ...(await importOriginal<typeof import('h3')>()),
  defineEventHandler: (handler: unknown) => handler,
  readBody: async (event: { body?: unknown }) => event.body,
}))
vi.mock('../server/utils/access', () => ({ requireOwner: async () => ({ email: 'owner@example.com' }) }))

type Handler = (event: unknown) => Promise<unknown>
const getList = async () => (await import('../server/api/admin/[table]/index.get')).default as Handler
const post = async () => (await import('../server/api/admin/[table]/index.post')).default as Handler
const put = async () => (await import('../server/api/admin/[table]/[id].put')).default as Handler
const del = async () => (await import('../server/api/admin/[table]/[id].delete')).default as Handler
const me = async () => (await import('../server/api/admin/me.get')).default as Handler

const NOW = '2026-01-01T00:00:00.000Z'
let db: D1Like

function event(method: string, params: Record<string, string>, opts: { url?: string; body?: unknown; headers?: Record<string, string> } = {}) {
  const url = opts.url ?? '/api/admin/x'
  const headers = { host: 'localhost', ...(opts.headers ?? {}) }
  return { method, path: url, body: opts.body, node: { req: { method, url, headers }, res: {} }, context: { params, cloudflare: { env: { DB: db } } } }
}
const JSON_HEADERS = { 'content-type': 'application/json' }
const err = (p: Promise<unknown>) => p.then(() => null, (e: unknown) => e)
const rows = async (t: string) => (await db.prepare(`SELECT * FROM ${t} ORDER BY id`).all()).results

const page = (over: Record<string, unknown> = {}) => ({ slug: 'about', title: 'About', body: 'text', published: false, ...over })
const app = (name: string, order: number) => ({
  name, kind: 'Web', stack: [], year: 2025, status: 'live', href: 'https://x.test', order, description: null, imageId: null, imageUrl: null, published: true,
})

async function seedApp(id: string, name: string, order: number) {
  await db
    .prepare('INSERT INTO apps (id, name, kind, stack, year, status, href, "order", published, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, name, 'web', '[]', 2026, 'live', 'https://x.test', order, 1, NOW, NOW)
    .run()
}

beforeEach(() => {
  db = makeTestDb()
})

describe('authorised admin routes', () => {
  it('me returns the email', async () => {
    expect(await (await me())(event('GET', {}))).toEqual({ email: 'owner@example.com' })
  })

  it('POST returns { id } and stores the row', async () => {
    const out = (await (await post())(event('POST', { table: 'pages' }, { body: page(), headers: JSON_HEADERS }))) as { id: string }
    expect(out.id).toMatch(/^[0-9a-f-]{36}$/)
    expect((await rows('pages'))[0]).toMatchObject({ id: out.id, slug: 'about' })
  })

  it('PUT uses the URL id, not the body id', async () => {
    const a = (await (await post())(event('POST', { table: 'pages' }, { body: page({ slug: 'a' }), headers: JSON_HEADERS }))) as { id: string }
    const b = (await (await post())(event('POST', { table: 'pages' }, { body: page({ slug: 'b' }), headers: JSON_HEADERS }))) as { id: string }
    await (await put())(event('PUT', { table: 'pages', id: a.id }, { body: { ...page({ slug: 'a', title: 'Changed' }), id: b.id }, headers: JSON_HEADERS }))
    const all = await rows('pages')
    expect(all.find((r) => r.id === a.id)?.title).toBe('Changed')
    expect(all.find((r) => r.id === b.id)?.title).toBe('About')
  })

  it('GET parses sort and desc', async () => {
    await seedApp('1', 'B', 1)
    await seedApp('2', 'A', 2)
    const names = async (url: string) =>
      ((await (await getList())(event('GET', { table: 'apps' }, { url }))) as Array<{ name: string }>).map((r) => r.name)
    expect(await names('/api/admin/apps')).toEqual(['B', 'A'])
    expect(await names('/api/admin/apps?sort=name')).toEqual(['A', 'B'])
    expect(await names('/api/admin/apps?sort=name&desc=1')).toEqual(['B', 'A'])
    expect(await names('/api/admin/apps?sort=order&desc=1')).toEqual(['A', 'B'])
    expect(await err(names('/api/admin/apps?sort=id'))).toMatchObject({ statusCode: 400 })
  })

  it('GET uses a default sort per table', async () => {
    for (const table of ['apps', 'posts', 'pages']) {
      expect(await (await getList())(event('GET', { table }, { url: `/api/admin/${table}` }))).toEqual([])
    }
  })

  it('gives 404 for an unknown table on every route', async () => {
    const calls = [
      async () => (await getList())(event('GET', { table: 'users' })),
      async () => (await post())(event('POST', { table: 'users' }, { body: {}, headers: JSON_HEADERS })),
      async () => (await put())(event('PUT', { table: 'users', id: '1' }, { body: {}, headers: JSON_HEADERS })),
      async () => (await del())(event('DELETE', { table: 'users', id: '1' })),
    ]
    for (const c of calls) expect(await err(c())).toMatchObject({ statusCode: 404 })
  })

  it('DELETE removes a system-slug page', async () => {
    const { id } = (await (await post())(event('POST', { table: 'pages' }, { body: page({ slug: 'home', title: 'Home' }), headers: JSON_HEADERS }))) as { id: string }
    await (await del())(event('DELETE', { table: 'pages', id }))
    expect(await rows('pages')).toEqual([])
  })
})

describe('cross-site writes', () => {
  it('give 403 or 415 and change nothing', async () => {
    await seedApp('1', 'Seed', 1)
    const before = [await rows('apps'), await rows('pages')]
    const cross = { ...JSON_HEADERS, 'sec-fetch-site': 'cross-site' }
    const calls = [
      async () => (await post())(event('POST', { table: 'pages' }, { body: page({ slug: 'home', published: true }), headers: cross })),
      async () => (await put())(event('PUT', { table: 'apps', id: '1' }, { body: app('Hacked', 1), headers: cross })),
      async () => (await del())(event('DELETE', { table: 'apps', id: '1' }, { headers: { 'sec-fetch-site': 'cross-site' } })),
      async () => (await post())(event('POST', { table: 'pages' }, { body: page(), headers: { 'content-type': 'application/x-www-form-urlencoded' } })),
    ]
    const codes: number[] = []
    for (const c of calls) codes.push(((await err(c())) as { statusCode: number }).statusCode)
    expect(codes).toEqual([403, 403, 403, 415])
    expect([await rows('apps'), await rows('pages')]).toEqual(before)
  })
})
