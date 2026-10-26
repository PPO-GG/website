import { describe, expect, it } from 'vitest'
import type { AppRow, PageRow, PostRow } from '~/types/app'
import {
  STACK_MAX, appToForm, blankApp, blankPage, blankPost, formatStack, pageToForm, parseStack, postToForm,
  rowPermissions, toAppData, toPageData, toPostData, validateApp, validatePage, validatePost,
} from '~/utils/content/admin'

describe('rowPermissions', () => {
  it('lets anyone read a published row', () => {
    expect(rowPermissions(true)).toEqual(['read("any")'])
  })
  it('gives a draft no public permission', () => {
    expect(rowPermissions(false)).toEqual([])
  })
})

describe('parseStack and formatStack', () => {
  it('splits on commas and slashes, trims, and drops empty items', () => {
    expect(parseStack('Nuxt, Yjs / R2 ,, ')).toEqual(['Nuxt', 'Yjs', 'R2'])
  })
  it('removes repeats ignoring case and keeps the first spelling', () => {
    expect(parseStack('Nuxt, nuxt, NUXT, Vue')).toEqual(['Nuxt', 'Vue'])
  })
  it('keeps at most STACK_MAX items', () => {
    const many = Array.from({ length: STACK_MAX + 5 }, (_, i) => `t${i}`).join(',')
    expect(parseStack(many)).toHaveLength(STACK_MAX)
  })
  it('returns an empty list for blank text', () => {
    expect(parseStack('  ')).toEqual([])
  })
  it('formats a list for the text box', () => {
    expect(formatStack(['Nuxt', 'Yjs'])).toBe('Nuxt, Yjs')
  })
})

const goodApp = () => ({ ...blankApp(), name: 'Rundown', kind: 'Web app', href: 'https://stagepoint.io', year: 2026 })

describe('validateApp', () => {
  it('accepts a complete form', () => {
    expect(validateApp(goodApp())).toEqual([])
  })
  it('accepts # and a site path as the link', () => {
    expect(validateApp({ ...goodApp(), href: '#' })).toEqual([])
    expect(validateApp({ ...goodApp(), href: '/about' })).toEqual([])
  })
  it('reports a missing name, kind, bad link and bad year', () => {
    const errors = validateApp({ ...goodApp(), name: ' ', kind: '', href: 'javascript:alert(1)', year: 1800 })
    expect(errors).toHaveLength(4)
  })
  it('rejects a year that is not a whole number', () => {
    expect(validateApp({ ...goodApp(), year: 2026.5 })).toHaveLength(1)
  })
})

const goodPost = () => ({ ...blankPost('2026-10-26'), title: 'Hello', slug: 'hello', body: 'Text' })

describe('validatePost', () => {
  it('accepts a complete form', () => {
    expect(validatePost(goodPost())).toEqual([])
  })
  it('rejects an empty title, a reserved slug, an empty body and a bad date', () => {
    expect(validatePost({ ...goodPost(), title: '', slug: 'admin', body: ' ', date: '26/10/2026' })).toHaveLength(4)
  })
  it('rejects a date that does not exist', () => {
    expect(validatePost({ ...goodPost(), date: '2026-02-31' })).toHaveLength(1)
  })
})

describe('validatePage', () => {
  it('accepts a complete form', () => {
    expect(validatePage({ ...blankPage(), title: 'About', slug: 'about', body: 'Hi' })).toEqual([])
  })
  it('rejects a bad slug', () => {
    expect(validatePage({ ...blankPage(), title: 'About', slug: 'About Us', body: 'Hi' })).toHaveLength(1)
  })
})

describe('toAppData', () => {
  it('trims text, parses the stack and turns empty optional text into null', () => {
    const data = toAppData({ ...goodApp(), name: '  Rundown ', stackText: 'Nuxt, Yjs', description: '  ', imageId: '', imageUrl: '' })
    expect(data).toMatchObject({ name: 'Rundown', stack: ['Nuxt', 'Yjs'], description: null, imageId: null, imageUrl: null })
  })
})

describe('toPostData', () => {
  it('builds the ISO publish time from the date and trims the slug', () => {
    const data = toPostData({ ...goodPost(), slug: ' hello ', description: '' })
    expect(data).toMatchObject({ slug: 'hello', publishedAt: '2026-10-26T00:00:00.000+00:00', description: null })
  })
})

describe('toPageData', () => {
  it('keeps title, slug, body and the published flag', () => {
    expect(toPageData({ title: ' About ', slug: 'about', body: 'Hi', published: true })).toEqual({ title: 'About', slug: 'about', body: 'Hi', published: true })
  })
})

describe('blank forms', () => {
  it('start as drafts', () => {
    expect(blankApp().published).toBe(false)
    expect(blankPost('2026-10-26')).toMatchObject({ published: false, date: '2026-10-26' })
    expect(blankPage().published).toBe(false)
  })
})

describe('row to form', () => {
  it('maps an app row, turning null text into empty text', () => {
    const row: AppRow = {
      $id: 'a', name: 'N', kind: 'K', stack: ['x', 'y'], year: 2026, status: 'beta', href: '#', order: 3,
      description: null, imageId: null, imageUrl: 'https://x.test/i.png', published: true,
    }
    expect(appToForm(row)).toMatchObject({ stackText: 'x, y', status: 'beta', description: '', imageId: '', imageUrl: 'https://x.test/i.png', published: true })
  })
  it('falls back to wip when the row status is unknown', () => {
    const row = { $id: 'a', name: 'N', kind: 'K', stack: [], year: 2026, status: 'zzz', href: '#', order: 0, published: false } as AppRow
    expect(appToForm(row).status).toBe('wip')
  })
  it('maps a post row and keeps only the date part of the publish time', () => {
    const row: PostRow = { $id: 'p', slug: 's', title: 'T', description: null, body: 'B', publishedAt: '2026-10-26T14:30:00.000+00:00', published: true }
    expect(postToForm(row)).toEqual({ title: 'T', slug: 's', description: '', body: 'B', date: '2026-10-26', published: true })
  })
  it('maps a page row', () => {
    const row: PageRow = { $id: 'g', slug: 'about', title: 'About', body: 'B', published: false }
    expect(pageToForm(row)).toEqual({ title: 'About', slug: 'about', body: 'B', published: false })
  })
})
