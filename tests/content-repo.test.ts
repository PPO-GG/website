import { beforeEach, describe, expect, it } from 'vitest'
import { getPublishedPage, getPublishedPost, listPublishedApps, listPublishedPosts } from '../server/utils/content-repo'
import { useDb } from '../server/utils/db'
import type { D1Like } from '../server/utils/db'
import { makeTestDb } from './helpers/d1'

const NOW = '2026-01-01T00:00:00.000Z'
let db: D1Like

async function addApp(id: string, name: string, order: number, published: number) {
  await db
    .prepare('INSERT INTO apps (id, name, kind, stack, year, status, href, "order", published, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, name, 'web', '["vue"]', 2026, 'live', 'https://x.test', order, published, NOW, NOW)
    .run()
}
async function addPost(id: string, slug: string, publishedAt: string, published: number) {
  await db
    .prepare('INSERT INTO posts (id, slug, title, body, publishedAt, published, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, slug, `T ${slug}`, 'b', publishedAt, published, NOW, NOW)
    .run()
}
async function addPage(id: string, slug: string, published: number) {
  await db
    .prepare('INSERT INTO pages (id, slug, title, body, published, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(id, slug, `T ${slug}`, 'b', published, NOW, NOW)
    .run()
}
const broken: D1Like = {
  prepare: () => {
    throw new Error('D1 down')
  },
}

beforeEach(() => {
  db = makeTestDb()
})

describe('listPublishedApps', () => {
  it('returns only published apps, ordered by order then name, without timestamps', async () => {
    await addApp('a1', 'Zed', 1, 1)
    await addApp('a2', 'Draft', 0, 0)
    await addApp('a3', 'Alpha', 1, 1)
    await addApp('a4', 'First', 0, 1)
    const rows = await listPublishedApps(db)
    expect(rows.map((r) => r.name)).toEqual(['First', 'Alpha', 'Zed'])
    expect(rows[0]).toMatchObject({ id: 'a4', stack: ['vue'], published: true, order: 0 })
    expect(rows[0]).not.toHaveProperty('createdAt')
  })
  it('drops an app once it is unpublished', async () => {
    await addApp('a1', 'One', 0, 1)
    expect(await listPublishedApps(db)).toHaveLength(1)
    await db.prepare('UPDATE apps SET published = 0 WHERE id = ?').bind('a1').run()
    expect(await listPublishedApps(db)).toEqual([])
  })
  it('throws when the database fails', async () => {
    await expect(listPublishedApps(broken)).rejects.toThrow('D1 down')
  })
})

describe('listPublishedPosts', () => {
  it('returns only published posts, newest first', async () => {
    await addPost('p1', 'old', '2026-01-01', 1)
    await addPost('p2', 'draft', '2026-03-01', 0)
    await addPost('p3', 'new', '2026-02-01', 1)
    const rows = await listPublishedPosts(db)
    expect(rows.map((r) => r.slug)).toEqual(['new', 'old'])
    expect(rows[0]).not.toHaveProperty('updatedAt')
  })
  it('drops a post once it is unpublished', async () => {
    await addPost('p1', 'one', '2026-01-01', 1)
    expect(await listPublishedPosts(db)).toHaveLength(1)
    await db.prepare('UPDATE posts SET published = 0 WHERE id = ?').bind('p1').run()
    expect(await listPublishedPosts(db)).toEqual([])
  })
  it('throws when the database fails', async () => {
    await expect(listPublishedPosts(broken)).rejects.toThrow('D1 down')
  })
})

describe('getPublishedPost', () => {
  it('returns a published post and null for a draft, a missing slug or an invalid slug', async () => {
    await addPost('p1', 'live', '2026-01-01', 1)
    await addPost('p2', 'draft', '2026-01-01', 0)
    expect(await getPublishedPost(db, 'live')).toMatchObject({ id: 'p1', slug: 'live', published: true })
    expect(await getPublishedPost(db, 'draft')).toBeNull()
    expect(await getPublishedPost(db, 'missing')).toBeNull()
    expect(await getPublishedPost(db, "x' OR '1'='1")).toBeNull()
  })
  it('returns null after unpublishing', async () => {
    await addPost('p1', 'live', '2026-01-01', 1)
    expect(await getPublishedPost(db, 'live')).not.toBeNull()
    await db.prepare('UPDATE posts SET published = 0 WHERE id = ?').bind('p1').run()
    expect(await getPublishedPost(db, 'live')).toBeNull()
  })
  it('throws when the database fails', async () => {
    await expect(getPublishedPost(broken, 'live')).rejects.toThrow('D1 down')
  })
})

describe('getPublishedPage', () => {
  it('returns a published page, and null for a draft or missing slug', async () => {
    await addPage('g1', 'about', 1)
    await addPage('g2', 'secret', 0)
    expect(await getPublishedPage(db, 'about')).toMatchObject({ id: 'g1', slug: 'about', published: true })
    expect(await getPublishedPage(db, 'secret')).toBeNull()
    expect(await getPublishedPage(db, 'nope')).toBeNull()
  })
  it('serves the system pages home, services and site-settings', async () => {
    await addPage('s1', 'home', 1)
    await addPage('s2', 'services', 1)
    await addPage('s3', 'site-settings', 1)
    for (const slug of ['home', 'services', 'site-settings']) expect((await getPublishedPage(db, slug))?.slug).toBe(slug)
  })
  it('returns null for an unpublished system page and an invalid slug', async () => {
    await addPage('s1', 'home', 0)
    await addPage('s2', 'admin', 1)
    expect(await getPublishedPage(db, 'home')).toBeNull()
    expect(await getPublishedPage(db, 'Bad Slug')).toBeNull()
    expect(await getPublishedPage(db, 'admin')).toBeNull()
  })
  it('returns null after unpublishing', async () => {
    await addPage('g1', 'about', 1)
    expect(await getPublishedPage(db, 'about')).not.toBeNull()
    await db.prepare('UPDATE pages SET published = 0 WHERE id = ?').bind('g1').run()
    expect(await getPublishedPage(db, 'about')).toBeNull()
  })
  it('throws when the database fails', async () => {
    await expect(getPublishedPage(broken, 'about')).rejects.toThrow('D1 down')
  })
})

describe('useDb', () => {
  it('throws a 500 when the binding is missing', () => {
    for (const context of [{}, { cloudflare: {} }, { cloudflare: { env: {} } }]) {
      let caught: unknown
      try {
        useDb({ context })
      } catch (e) {
        caught = e
      }
      expect(caught).toMatchObject({ statusCode: 500 })
    }
  })
  it('returns the binding when present', () => {
    expect(useDb({ context: { cloudflare: { env: { DB: db } } } })).toBe(db)
  })
})
