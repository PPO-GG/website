import { describe, expect, it } from 'vitest'
import { isValidSlug, slugify, RESERVED_SLUGS, SLUG_MAX } from '~/utils/content/slug'

describe('slugify', () => {
  it('lowercases and joins words with dashes', () => {
    expect(slugify('Hello, World!')).toBe('hello-world')
  })
  it('collapses repeated separators and trims dashes', () => {
    expect(slugify('  --A   B__C--  ')).toBe('a-b-c')
  })
  it('drops accents and symbols it cannot keep', () => {
    expect(slugify('Café déjà vu ✨')).toBe('cafe-deja-vu')
  })
  it('cuts to the maximum length without a trailing dash', () => {
    const s = slugify('word '.repeat(60))
    expect(s.length).toBeLessThanOrEqual(SLUG_MAX)
    expect(s.endsWith('-')).toBe(false)
  })
  it('returns an empty string when nothing usable is left', () => {
    expect(slugify('!!!')).toBe('')
  })
})

describe('isValidSlug', () => {
  it('accepts lowercase words joined by single dashes', () => {
    expect(isValidSlug('about')).toBe(true)
    expect(isValidSlug('my-first-post-2')).toBe(true)
  })
  it.each(['', 'Upper', 'a b', '-a', 'a-', 'a--b', 'a_b', 'a/b', 'x'.repeat(SLUG_MAX + 1)])('rejects %j', (s) => {
    expect(isValidSlug(s)).toBe(false)
  })
  it('rejects every reserved slug', () => {
    expect(RESERVED_SLUGS).toEqual(expect.arrayContaining(['admin', 'blog', 'api']))
    for (const s of RESERVED_SLUGS) expect(isValidSlug(s)).toBe(false)
  })
})
