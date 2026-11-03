import { describe, expect, it } from 'vitest'
import { dataToDb, dbToRow, TABLE } from '../server/utils/rows'
import { makeTestDb } from './helpers/d1'

const rawApp = {
  id: 'a1', name: 'N', kind: 'K', stack: '["a","b"]', year: 2024, status: 'live', href: 'https://x.y',
  order: 3, description: null, imageId: null, imageUrl: null, published: 1,
  createdAt: '2024-01-01', updatedAt: '2024-01-02',
}

describe('dbToRow', () => {
  it('parses stack JSON and published 0/1 for apps', () => {
    const row = dbToRow(TABLE.Apps, rawApp)
    expect(row).toMatchObject({ id: 'a1', stack: ['a', 'b'], published: true, order: 3, description: null })
    expect(row).not.toHaveProperty('createdAt')
  })

  it('maps unknown published values to false', () => {
    expect(dbToRow(TABLE.Pages, { id: 'p', slug: 's', title: 't', body: 'b', published: 2 }).published).toBe(false)
    expect(dbToRow(TABLE.Pages, { id: 'p', slug: 's', title: 't', body: 'b', published: null }).published).toBe(false)
    expect(dbToRow(TABLE.Pages, { id: 'p', slug: 's', title: 't', body: 'b', published: 0 }).published).toBe(false)
  })

  it('falls back to an empty stack when the JSON is bad', () => {
    expect(dbToRow(TABLE.Apps, { ...rawApp, stack: 'nope' })).toMatchObject({ stack: [] })
  })
})

describe('dataToDb', () => {
  it('writes stack as JSON text and published as 0/1', () => {
    const out = dataToDb(TABLE.Apps, 'a1', { name: 'N', stack: ['a', 'b'], published: true })
    expect(out).toMatchObject({ id: 'a1', name: 'N', stack: '["a","b"]', published: 1 })
    expect(dataToDb(TABLE.Posts, 'p', { published: false })).toMatchObject({ published: 0 })
  })

  it('round-trips an app', () => {
    const data = {
      name: 'N', kind: 'K', stack: ['a', 'b'], year: 2024, status: 'live', href: 'https://x.y',
      order: 3, description: null, imageId: null, imageUrl: null, published: true,
    }
    expect(dbToRow(TABLE.Apps, dataToDb(TABLE.Apps, 'a1', data))).toEqual({ id: 'a1', ...data })
  })

  it('round-trips a post', () => {
    const data = { slug: 's', title: 't', description: null, body: 'b', publishedAt: '2024-01-01T00:00:00.000Z', published: false }
    expect(dbToRow(TABLE.Posts, dataToDb(TABLE.Posts, 'p1', data))).toEqual({ id: 'p1', ...data })
  })
})

describe('migration', () => {
  it('applies and enforces unique post slugs', async () => {
    const db = makeTestDb()
    const insert = (id: string) =>
      db.prepare('INSERT INTO posts (id, slug, title, body, publishedAt, published, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(id, 'same', 't', 'b', '2024-01-01T00:00:00.000Z', 1, 'now', 'now').run()
    await insert('1')
    await expect(insert('2')).rejects.toThrow(/UNIQUE/)
  })

  it('stores apps with a quoted order column', async () => {
    const db = makeTestDb()
    await db.prepare('INSERT INTO apps (id, name, kind, stack, year, status, href, "order", published, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind('a', 'n', 'k', '[]', 2024, 'live', 'h', 2, 1, 'now', 'now').run()
    const row = await db.prepare('SELECT * FROM apps ORDER BY "order"').first<{ order: number }>()
    expect(row?.order).toBe(2)
  })
})
