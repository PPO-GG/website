import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { adminTable, createRow, deleteRow, listRows, updateRow } from '../server/utils/admin-repo'
import type { D1Like } from '../server/utils/db'
import { TABLE } from '../server/utils/rows'
import { makeTestDb } from './helpers/d1'

let db: D1Like

const app = (over: Record<string, unknown> = {}) => ({
  name: 'Alpha', kind: 'Web app', stack: ['vue'], year: 2025, status: 'live', href: 'https://x.test',
  order: 1, description: null, imageId: null, imageUrl: null, published: false, ...over,
})
const post = (over: Record<string, unknown> = {}) => ({
  slug: 'hello', title: 'Hello', description: null, body: 'Some text', publishedAt: '2026-01-01T00:00:00.000+00:00',
  published: false, ...over,
})
const page = (over: Record<string, unknown> = {}) => ({ slug: 'about', title: 'About', body: 'Some text', published: false, ...over })

const rawRows = async (table: string) => (await db.prepare(`SELECT * FROM ${table} ORDER BY id`).all()).results

async function expectHttp(promise: Promise<unknown>, statusCode: number, data?: unknown) {
  const error = await promise.then(() => null, (e: unknown) => e)
  expect(error).toMatchObject(data === undefined ? { statusCode } : { statusCode, data })
}

beforeEach(() => {
  db = makeTestDb()
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('adminTable', () => {
  it('accepts the three tables', () => {
    expect(adminTable('apps')).toBe('apps')
    expect(adminTable('posts')).toBe('posts')
    expect(adminTable('pages')).toBe('pages')
  })
  it('gives 404 for anything else', () => {
    for (const name of ['users', 'sqlite_master', '', undefined, 'apps; DROP TABLE apps']) {
      expect(() => adminTable(name)).toThrow(expect.objectContaining({ statusCode: 404 }))
    }
  })
})

describe('create and list', () => {
  it('round-trips an app', async () => {
    const id = await createRow(db, TABLE.Apps, app())
    expect(id).toMatch(/^[0-9a-f-]{36}$/)
    expect(await listRows(db, TABLE.Apps, { key: 'order' })).toEqual([{ id, ...app() }])
  })
  it('round-trips a post', async () => {
    const id = await createRow(db, TABLE.Posts, post())
    expect(await listRows(db, TABLE.Posts, { key: 'title' })).toEqual([{ id, ...post() }])
  })
  it('round-trips a page', async () => {
    const id = await createRow(db, TABLE.Pages, page())
    expect(await listRows(db, TABLE.Pages, { key: 'slug' })).toEqual([{ id, ...page() }])
  })
  it('stamps createdAt and updatedAt as ISO strings', async () => {
    const id = await createRow(db, TABLE.Pages, page())
    const [raw] = await rawRows('pages')
    expect(raw.id).toBe(id)
    expect(new Date(raw.createdAt as string).toISOString()).toBe(raw.createdAt)
    expect(raw.updatedAt).toBe(raw.createdAt)
  })
  it('lists drafts and published rows, capped at 100', async () => {
    await createRow(db, TABLE.Apps, app({ name: 'Draft', published: false }))
    await createRow(db, TABLE.Apps, app({ name: 'Live', published: true }))
    expect(await listRows(db, TABLE.Apps, { key: 'name' })).toHaveLength(2)
    for (let i = 0; i < 101; i++) await createRow(db, TABLE.Apps, app({ name: `App ${i}` }))
    expect(await listRows(db, TABLE.Apps, { key: 'name' })).toHaveLength(100)
  })
  it('sorts by whitelisted keys, ascending and descending', async () => {
    await createRow(db, TABLE.Apps, app({ name: 'B', order: 1 }))
    await createRow(db, TABLE.Apps, app({ name: 'A', order: 2 }))
    const names = async (sort: { key: string; desc?: boolean }) =>
      (await listRows(db, TABLE.Apps, sort)).map((r) => (r as { name: string }).name)
    expect(await names({ key: 'name' })).toEqual(['A', 'B'])
    expect(await names({ key: 'name', desc: true })).toEqual(['B', 'A'])
    expect(await names({ key: 'order' })).toEqual(['B', 'A'])
    expect(await names({ key: 'order', desc: true })).toEqual(['A', 'B'])
  })
  it('accepts exactly the whitelisted sort keys per table', async () => {
    const allowed = { apps: ['order', 'name'], posts: ['publishedAt', 'title'], pages: ['title', 'slug'] } as const
    for (const table of Object.values(TABLE)) {
      for (const key of allowed[table]) await expect(listRows(db, table, { key })).resolves.toEqual([])
      for (const key of ['id', 'createdAt', 'body', '"order"', 'name; DROP TABLE apps', '']) {
        await expectHttp(listRows(db, table, { key }), 400)
      }
    }
  })
  it('keeps the other tables sort keys out', async () => {
    await expectHttp(listRows(db, TABLE.Apps, { key: 'slug' }), 400)
    await expectHttp(listRows(db, TABLE.Posts, { key: 'order' }), 400)
    await expectHttp(listRows(db, TABLE.Pages, { key: 'publishedAt' }), 400)
  })
})

describe('validation', () => {
  it('gives 422 with the existing messages', async () => {
    await expectHttp(createRow(db, TABLE.Apps, app({ year: 1800 })), 422, { errors: ['Use a year from 1990 to 2100.'] })
    await expectHttp(createRow(db, TABLE.Posts, post({ title: '  ' })), 422, { errors: ['Enter a title.'] })
    await expectHttp(createRow(db, TABLE.Pages, page({ title: '' })), 422, { errors: ['Enter a title.'] })
    await expectHttp(createRow(db, TABLE.Pages, page({ slug: 'Bad Slug' })), 422, {
      errors: ['Use only lowercase letters, numbers and single dashes in the slug. Do not use a reserved word.'],
    })
    await expectHttp(createRow(db, TABLE.Posts, post({ slug: 'admin' })), 422)
    await expectHttp(createRow(db, TABLE.Posts, post({ publishedAt: 'nonsense' })), 422)
    for (const t of ['apps', 'posts', 'pages']) expect(await rawRows(t)).toEqual([])
  })
  it('validates on update too and leaves the row alone', async () => {
    const id = await createRow(db, TABLE.Apps, app())
    const before = await rawRows('apps')
    await expectHttp(updateRow(db, TABLE.Apps, id, app({ year: 3000 })), 422, { errors: ['Use a year from 1990 to 2100.'] })
    expect(await rawRows('apps')).toEqual(before)
  })
  it('rejects non-object bodies with 400', async () => {
    for (const body of [null, undefined, 'x', 5, true, [], [app()]]) {
      await expectHttp(createRow(db, TABLE.Apps, body), 400)
      await expectHttp(updateRow(db, TABLE.Apps, 'x', body), 400)
    }
  })
  it('rejects wrong field types with 422 instead of throwing', async () => {
    await expectHttp(createRow(db, TABLE.Apps, app({ name: 5 })), 422)
    await expectHttp(createRow(db, TABLE.Apps, app({ name: undefined })), 422)
    await expectHttp(createRow(db, TABLE.Apps, app({ year: '2025' })), 422)
    await expectHttp(createRow(db, TABLE.Apps, app({ order: 'x' })), 422)
    await expectHttp(createRow(db, TABLE.Apps, app({ description: 5 })), 422)
    await expectHttp(createRow(db, TABLE.Apps, app({ published: 'yes' })), 422)
    await expectHttp(createRow(db, TABLE.Posts, post({ body: { a: 1 } })), 422)
    await expectHttp(createRow(db, TABLE.Pages, page({ slug: null })), 422)
    expect(await rawRows('apps')).toEqual([])
  })
  it('requires stack to be an array of strings', async () => {
    for (const stack of ['vue', [1], ['a', null], { 0: 'a' }, undefined]) {
      await expectHttp(createRow(db, TABLE.Apps, app({ stack })), 422)
    }
  })
  it('allows only live, beta and wip for app status', async () => {
    for (const status of ['live', 'beta', 'wip']) await createRow(db, TABLE.Apps, app({ name: status, status }))
    for (const status of ['gone', '', 5, undefined]) await expectHttp(createRow(db, TABLE.Apps, app({ status })), 422)
    expect((await rawRows('apps')).map((r) => r.status).sort()).toEqual(['beta', 'live', 'wip'])
  })
  it('saves system slugs as pages', async () => {
    for (const slug of ['home', 'services', 'site-settings']) await createRow(db, TABLE.Pages, page({ slug, title: slug }))
    expect((await rawRows('pages')).map((r) => r.slug).sort()).toEqual(['home', 'services', 'site-settings'])
  })
  it('ignores unknown and server-owned columns in the body', async () => {
    const id = await createRow(db, TABLE.Pages, {
      ...page(), id: 'attacker', createdAt: '1999', updatedAt: '1999', evil: 'x', 'slug) VALUES (1); --': 'x',
    })
    const [raw] = await rawRows('pages')
    expect(raw.id).toBe(id)
    expect(id).not.toBe('attacker')
    expect(raw.createdAt).not.toBe('1999')
    expect(raw).not.toHaveProperty('evil')
  })
})

describe('published flag', () => {
  it('keeps drafts as drafts and publishes only when asked', async () => {
    const draft = await createRow(db, TABLE.Pages, page({ slug: 'a', published: false }))
    const live = await createRow(db, TABLE.Pages, page({ slug: 'b', published: true }))
    const rows = await rawRows('pages')
    expect(rows.find((r) => r.id === draft)?.published).toBe(0)
    expect(rows.find((r) => r.id === live)?.published).toBe(1)
  })
  it('defaults to draft when the flag is missing on create', async () => {
    await createRow(db, TABLE.Posts, post({ published: undefined }))
    expect((await rawRows('posts'))[0].published).toBe(0)
  })
  it('lets update unpublish and publish', async () => {
    const id = await createRow(db, TABLE.Posts, post({ published: true }))
    await updateRow(db, TABLE.Posts, id, post({ published: false }))
    expect((await rawRows('posts'))[0].published).toBe(0)
    await updateRow(db, TABLE.Posts, id, post({ published: true }))
    expect((await rawRows('posts'))[0].published).toBe(1)
  })
})

describe('update', () => {
  it('keeps createdAt and bumps updatedAt', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    const id = await createRow(db, TABLE.Apps, app())
    vi.setSystemTime(new Date('2026-02-01T00:00:00.000Z'))
    await updateRow(db, TABLE.Apps, id, app({ name: 'Renamed' }))
    const [raw] = await rawRows('apps')
    expect(raw).toMatchObject({ id, name: 'Renamed', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-02-01T00:00:00.000Z' })
  })
  it('gives 404 for an unknown id, and writes nothing', async () => {
    await createRow(db, TABLE.Apps, app())
    const before = await rawRows('apps')
    await expectHttp(updateRow(db, TABLE.Apps, 'nope', app({ name: 'Other' })), 404)
    expect(await rawRows('apps')).toEqual(before)
  })
  it('gives 409 when the slug belongs to another row', async () => {
    await createRow(db, TABLE.Pages, page({ slug: 'one' }))
    const id = await createRow(db, TABLE.Pages, page({ slug: 'two' }))
    await expectHttp(updateRow(db, TABLE.Pages, id, page({ slug: 'one' })), 409)
  })
})

describe('delete', () => {
  it('removes the row', async () => {
    const id = await createRow(db, TABLE.Posts, post())
    await deleteRow(db, TABLE.Posts, id)
    expect(await rawRows('posts')).toEqual([])
  })
  it('gives 404 for an unknown id', async () => {
    await expectHttp(deleteRow(db, TABLE.Posts, 'nope'), 404)
  })
})

describe('slug uniqueness', () => {
  it('gives 409 for a duplicate slug', async () => {
    await createRow(db, TABLE.Posts, post())
    await expectHttp(createRow(db, TABLE.Posts, post({ title: 'Other' })), 409)
    expect(await rawRows('posts')).toHaveLength(1)
  })
  it('leaves one row and one 409 for two concurrent creates', async () => {
    const results = await Promise.allSettled([createRow(db, TABLE.Pages, page()), createRow(db, TABLE.Pages, page())])
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    expect(failed).toHaveLength(1)
    expect(failed[0].reason).toMatchObject({ statusCode: 409 })
    expect(await rawRows('pages')).toHaveLength(1)
  })
})

describe('database failures', () => {
  it('give a 500 with no SQL text', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const broken: D1Like = {
      prepare: () => {
        throw new Error('SELECT secret FROM somewhere failed')
      },
    }
    for (const op of [
      () => listRows(broken, TABLE.Apps, { key: 'name' }),
      () => createRow(broken, TABLE.Apps, app()),
      () => updateRow(broken, TABLE.Apps, 'x', app()),
      () => deleteRow(broken, TABLE.Apps, 'x'),
    ]) {
      const error = (await op().then(() => null, (e: unknown) => e)) as { statusCode: number; statusMessage: string; message: string }
      expect(error.statusCode).toBe(500)
      expect(`${error.statusMessage} ${error.message}`).not.toMatch(/secret|SELECT/)
    }
  })
})
