import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { D1Like } from '../server/utils/db'
import { makeTestDb } from './helpers/d1'

vi.mock('h3', async (importOriginal) => ({
  ...(await importOriginal<typeof import('h3')>()),
  defineEventHandler: (handler: unknown) => handler,
}))

type Handler = (event: unknown) => Promise<unknown>

const ROUTES: Array<{ name: string; load: () => Promise<{ default: Handler }>; params: Record<string, string>; method: string }> = [
  { name: 'GET /api/admin/me', load: () => import('../server/api/admin/me.get'), params: {}, method: 'GET' },
  { name: 'GET /api/admin/[table]', load: () => import('../server/api/admin/[table]/index.get'), params: { table: 'apps' }, method: 'GET' },
  { name: 'POST /api/admin/[table]', load: () => import('../server/api/admin/[table]/index.post'), params: { table: 'apps' }, method: 'POST' },
  { name: 'PUT /api/admin/[table]/[id]', load: () => import('../server/api/admin/[table]/[id].put'), params: { table: 'apps', id: 'a1' }, method: 'PUT' },
  { name: 'DELETE /api/admin/[table]/[id]', load: () => import('../server/api/admin/[table]/[id].delete'), params: { table: 'apps', id: 'a1' }, method: 'DELETE' },
]

const NOW = '2026-01-01T00:00:00.000Z'
let db: D1Like

async function snapshot() {
  const out: unknown[] = []
  for (const t of ['apps', 'posts', 'pages']) out.push((await db.prepare(`SELECT * FROM ${t} ORDER BY id`).all()).results)
  return out
}

/** A request with no token. Access is configured unless `configured` is false. */
function tokenlessEvent(params: Record<string, string>, method: string, configured = true) {
  const env = configured
    ? { DB: db, ACCESS_TEAM_DOMAIN: 'team.cloudflareaccess.com', ACCESS_AUD: 'aud-123' }
    : { DB: db }
  return {
    node: { req: { headers: {}, method, url: '/api/admin/apps' }, res: {} },
    method,
    path: '/api/admin/apps',
    context: { params, cloudflare: { env } },
  }
}

beforeEach(async () => {
  db = makeTestDb()
  await db
    .prepare('INSERT INTO apps (id, name, kind, stack, year, status, href, "order", published, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind('a1', 'Seed', 'web', '["vue"]', 2026, 'live', 'https://x.test', 1, 1, NOW, NOW)
    .run()
  await db
    .prepare('INSERT INTO pages (id, slug, title, body, published, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind('p1', 'about', 'About', 'b', 1, NOW, NOW)
    .run()
})

describe('admin routes require the owner', () => {
  it.each(ROUTES)('$name gives 401 without a token and changes nothing', async ({ load, params, method }) => {
    const handler = (await load()).default
    const before = await snapshot()
    const error = await handler(tokenlessEvent(params, method)).then(() => null, (e: unknown) => e)
    expect(error).toMatchObject({ statusCode: 401 })
    expect(await snapshot()).toEqual(before)
  })

  it.each(ROUTES)('$name gives 500, not a pass, when Access is not configured', async ({ load, params, method }) => {
    const handler = (await load()).default
    const before = await snapshot()
    const error = await handler(tokenlessEvent(params, method, false)).then(() => null, (e: unknown) => e)
    expect(error).toMatchObject({ statusCode: 500 })
    expect(await snapshot()).toEqual(before)
  })
})
