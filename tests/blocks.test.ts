import { describe, expect, it } from 'vitest'
import { BLOCK_TYPE } from '~/types/blocks'
import { blankBlock, parseBody, safeLink, safeSrc, serializeBlocks, validateBlocks } from '~/utils/content/blocks'
import { blankPage, pageToForm, toPageData, validatePage } from '~/utils/content/admin'

describe('parseBody', () => {
  it('treats plain text as Markdown', () => {
    expect(parseBody('# Hi')).toEqual({ kind: 'markdown', markdown: '# Hi' })
  })
  it('treats text that starts with a brace but is not builder JSON as Markdown', () => {
    expect(parseBody('{not json')).toEqual({ kind: 'markdown', markdown: '{not json' })
    expect(parseBody('{"v":9,"blocks":[]}').kind).toBe('markdown')
  })
  it('round-trips blocks', () => {
    const b = blankBlock(BLOCK_TYPE.Cta)
    Object.assign(b.data, { heading: 'Talk', ctaLabel: 'Go', ctaHref: '/contact' })
    const parsed = parseBody(serializeBlocks([b]))
    expect(parsed.kind).toBe('blocks')
    if (parsed.kind === 'blocks') {
      expect(parsed.blocks[0]?.type).toBe('cta')
      expect(parsed.blocks[0]?.data.heading).toBe('Talk')
    }
  })
  it('drops unknown block types and non-string values', () => {
    const body = JSON.stringify({ v: 1, blocks: [{ type: 'script', data: {} }, { type: 'text', data: { body: 5, heading: 'H' } }] })
    const parsed = parseBody(body)
    expect(parsed.kind === 'blocks' && parsed.blocks).toHaveLength(1)
    if (parsed.kind === 'blocks') expect(parsed.blocks[0]?.data).toEqual({ heading: 'H', body: '' })
  })
})

describe('safeLink and safeSrc', () => {
  it('allows site, anchor, https and mailto links', () => {
    for (const l of ['/a', '#a', 'https://x.io', 'mailto:a@b.co']) expect(safeLink(l)).toBe(l)
  })
  it('replaces script and protocol-relative links', () => {
    for (const l of ['javascript:alert(1)', '//evil.com', 'data:text/html,x', '']) expect(safeLink(l)).toBe('#')
  })
  it('only allows http(s) or site images', () => {
    expect(safeSrc('javascript:x')).toBe('')
    expect(safeSrc('//x.com/a.png')).toBe('')
    expect(safeSrc('/a.png')).toBe('/a.png')
  })
})

describe('validateBlocks', () => {
  it('requires at least one block', () => {
    expect(validateBlocks([])).toHaveLength(1)
  })
  it('reports missing required fields and bad links', () => {
    const cta = blankBlock(BLOCK_TYPE.Cta)
    cta.data.ctaHref = 'javascript:x'
    const errors = validateBlocks([cta])
    expect(errors.length).toBe(3) // heading, button text, bad link
  })
  it('accepts a complete text block', () => {
    const t = blankBlock(BLOCK_TYPE.Text)
    t.data.body = 'Hello'
    expect(validateBlocks([t])).toEqual([])
  })
})

describe('page forms in builder mode', () => {
  it('stores blocks as JSON in the body and reads them back', () => {
    const t = blankBlock(BLOCK_TYPE.Text)
    t.data.body = 'Hello'
    const form = { ...blankPage(), title: 'About', slug: 'about', blocks: [t] }
    expect(validatePage(form)).toEqual([])
    const data = toPageData(form)
    const back = pageToForm({ $id: '1', title: 'About', slug: 'about', body: String(data.body), published: true })
    expect(back.mode).toBe('blocks')
    expect(back.blocks[0]?.data.body).toBe('Hello')
  })
})
