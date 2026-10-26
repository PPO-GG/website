import { describe, expect, it } from 'vitest'
import type { AppRow, PageRow, PostRow } from '~/types/app'
import { mapApp, mapPage, mapPost } from '~/utils/content/mappers'

const url = (id: string) => `https://files.test/${id}`

const appRow = (over: Partial<AppRow> = {}): AppRow => ({
  $id: 'a1', name: 'Rundown', kind: 'Broadcasting Application', stack: ['nuxt', 'yjs'], year: 2026,
  status: 'live', href: 'https://stagepoint.io', order: 1, published: true, ...over,
})

describe('mapApp', () => {
  it('copies the plain fields and uses $id as id', () => {
    const a = mapApp(appRow(), url)
    expect(a).toMatchObject({ id: 'a1', name: 'Rundown', stack: ['nuxt', 'yjs'], year: 2026, status: 'live', order: 1 })
  })
  it('turns imageId into an image URL', () => {
    expect(mapApp(appRow({ imageId: 'f9' }), url).img).toBe('https://files.test/f9')
  })
  it('leaves img and description unset when the row has none', () => {
    const a = mapApp(appRow({ imageId: null, description: null }), url)
    expect(a.img).toBeUndefined()
    expect(a.description).toBeUndefined()
  })
  it('passes an external imageUrl through when there is no imageId', () => {
    expect(mapApp(appRow({ imageUrl: 'https://x.test/a.webp' }), url).img).toBe('https://x.test/a.webp')
  })
  it('prefers an uploaded image over an external imageUrl', () => {
    expect(mapApp(appRow({ imageId: 'f9', imageUrl: 'https://x.test/a.webp' }), url).img).toBe('https://files.test/f9')
  })
  it('keeps beta as beta', () => {
    expect(mapApp(appRow({ status: 'beta' }), url).status).toBe('beta')
  })
  it('treats an unknown status as wip, never as live', () => {
    expect(mapApp(appRow({ status: 'archived' }), url).status).toBe('wip')
  })
})

describe('mapPost and mapPage', () => {
  it('maps a post and defaults a missing description to empty text', () => {
    const row: PostRow = { $id: 'p1', slug: 'hi', title: 'Hi', body: '# Hi', publishedAt: '2026-10-26T00:00:00.000Z', published: true }
    expect(mapPost(row)).toEqual({ id: 'p1', slug: 'hi', title: 'Hi', description: '', body: '# Hi', publishedAt: '2026-10-26T00:00:00.000Z' })
  })
  it('maps a page', () => {
    const row: PageRow = { $id: 'g1', slug: 'about', title: 'About', body: 'text', published: true }
    expect(mapPage(row)).toEqual({ id: 'g1', slug: 'about', title: 'About', body: 'text' })
  })
})
