import { BLOCK_TYPE } from '~/types/blocks'
import type { Block, BlockDef, BlockType } from '~/types/blocks'

export const BLOCK_DEFS: readonly BlockDef[] = [
  {
    type: BLOCK_TYPE.Hero,
    label: 'Hero banner',
    hint: 'Large heading with an optional button.',
    fields: [
      { key: 'eyebrow', label: 'Small label above', kind: 'text' },
      { key: 'heading', label: 'Heading', kind: 'text', required: true },
      { key: 'text', label: 'Text', kind: 'textarea' },
      { key: 'ctaLabel', label: 'Button text', kind: 'text' },
      { key: 'ctaHref', label: 'Button link', kind: 'link' },
    ],
  },
  {
    type: BLOCK_TYPE.Text,
    label: 'Text',
    hint: 'A heading and formatted text (Markdown).',
    fields: [
      { key: 'heading', label: 'Heading', kind: 'text' },
      { key: 'body', label: 'Text', kind: 'markdown', required: true },
    ],
  },
  {
    type: BLOCK_TYPE.Features,
    label: 'Card grid',
    hint: 'A row of cards for services, benefits or steps.',
    fields: [
      { key: 'heading', label: 'Heading', kind: 'text' },
      { key: 'intro', label: 'Intro', kind: 'textarea' },
    ],
    itemLabel: 'Card',
    itemFields: [
      { key: 'title', label: 'Title', kind: 'text', required: true },
      { key: 'text', label: 'Text', kind: 'textarea' },
      { key: 'href', label: 'Link (optional)', kind: 'link' },
    ],
  },
  {
    type: BLOCK_TYPE.Stats,
    label: 'Key figures',
    hint: 'Large numbers with captions.',
    fields: [{ key: 'heading', label: 'Heading', kind: 'text' }],
    itemLabel: 'Figure',
    itemFields: [
      { key: 'value', label: 'Value', kind: 'text', required: true },
      { key: 'label', label: 'Caption', kind: 'text', required: true },
    ],
  },
  {
    type: BLOCK_TYPE.Image,
    label: 'Image',
    hint: 'A full-width image with a caption.',
    fields: [
      { key: 'src', label: 'Image', kind: 'image', required: true },
      { key: 'alt', label: 'Description for screen readers', kind: 'text', required: true },
      { key: 'caption', label: 'Caption', kind: 'text' },
    ],
  },
  {
    type: BLOCK_TYPE.Cta,
    label: 'Call to action',
    hint: 'A highlighted panel that sends people to a link.',
    fields: [
      { key: 'heading', label: 'Heading', kind: 'text', required: true },
      { key: 'text', label: 'Text', kind: 'textarea' },
      { key: 'ctaLabel', label: 'Button text', kind: 'text', required: true },
      { key: 'ctaHref', label: 'Button link', kind: 'link', required: true },
    ],
  },
]

const DEFS = new Map<BlockType, BlockDef>(BLOCK_DEFS.map((d) => [d.type, d]))
const KNOWN_TYPES: readonly string[] = BLOCK_DEFS.map((d) => d.type)

export const BLOCKS_MAX = 40
export const ITEMS_MAX = 12
const FORMAT_VERSION = 1
const LINK_OK = /^(#|\/(?!\/)|https?:\/\/|mailto:)/i
const SRC_OK = /^(\/(?!\/)|https?:\/\/)/i

export const blockDef = (t: BlockType): BlockDef => DEFS.get(t)!

let counter = 0
const newId = () => `b${Date.now().toString(36)}${(counter++).toString(36)}`

const emptyRow = (fields: { key: string }[]): Record<string, string> => Object.fromEntries(fields.map((f) => [f.key, '']))

export function blankItem(type: BlockType): Record<string, string> {
  return emptyRow(blockDef(type).itemFields ?? [])
}

export function blankBlock(type: BlockType): Block {
  const def = blockDef(type)
  return { id: newId(), type, data: emptyRow(def.fields), items: def.itemFields ? [blankItem(type), blankItem(type)] : [] }
}

/** A link that cannot run script. Anything else becomes "#". */
export function safeLink(href: string | undefined): string {
  const h = (href ?? '').trim()
  return LINK_OK.test(h) ? h : '#'
}

export const isExternal = (href: string) => /^https?:\/\//i.test(href)

export function safeSrc(src: string | undefined): string {
  const s = (src ?? '').trim()
  return SRC_OK.test(s) ? s : ''
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '')

function cleanRow(raw: unknown, fields: { key: string }[]): Record<string, string> {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return Object.fromEntries(fields.map((f) => [f.key, str(r[f.key])]))
}

export type ParsedBody = { kind: 'blocks'; blocks: Block[] } | { kind: 'markdown'; markdown: string }

/** A page body is either Markdown (older pages) or JSON written by the page builder. */
export function parseBody(body: string): ParsedBody {
  const t = body.trimStart()
  if (!t.startsWith('{')) return { kind: 'markdown', markdown: body }
  try {
    const j = JSON.parse(t) as { v?: unknown; blocks?: unknown }
    if (j.v !== FORMAT_VERSION || !Array.isArray(j.blocks)) return { kind: 'markdown', markdown: body }
    const blocks: Block[] = []
    for (const raw of j.blocks.slice(0, BLOCKS_MAX)) {
      const b = (raw ?? {}) as { type?: unknown; data?: unknown; items?: unknown }
      if (typeof b.type !== 'string' || !KNOWN_TYPES.includes(b.type)) continue // a block type this site no longer knows is dropped
      const type = b.type as BlockType
      const def = blockDef(type)
      const items = Array.isArray(b.items) && def.itemFields ? b.items.slice(0, ITEMS_MAX).map((i) => cleanRow(i, def.itemFields!)) : []
      blocks.push({ id: newId(), type, data: cleanRow(b.data, def.fields), items })
    }
    return { kind: 'blocks', blocks }
  } catch {
    return { kind: 'markdown', markdown: body } // text that merely starts with "{"
  }
}

export function serializeBlocks(blocks: Block[]): string {
  return JSON.stringify({ v: FORMAT_VERSION, blocks: blocks.map(({ type, data, items }) => ({ type, data, items })) })
}

export function validateBlocks(blocks: Block[]): string[] {
  const errors: string[] = []
  if (!blocks.length) errors.push('Add at least one block.')
  if (blocks.length > BLOCKS_MAX) errors.push(`Use at most ${BLOCKS_MAX} blocks.`)
  blocks.forEach((b, i) => {
    const def = blockDef(b.type)
    const where = `Block ${i + 1} (${def.label})`
    for (const f of def.fields) {
      const v = (b.data[f.key] ?? '').trim()
      if (f.required && !v) errors.push(`${where}: fill in "${f.label}".`)
      else if (v && f.kind === 'link' && !LINK_OK.test(v)) errors.push(`${where}: "${f.label}" must start with https://, /, # or mailto:.`)
      else if (v && f.kind === 'image' && !SRC_OK.test(v)) errors.push(`${where}: "${f.label}" must be an https:// or / address.`)
    }
    if (b.items.length > ITEMS_MAX) errors.push(`${where}: use at most ${ITEMS_MAX} rows.`)
    b.items.forEach((it, k) => {
      for (const f of def.itemFields ?? []) {
        const v = (it[f.key] ?? '').trim()
        if (f.required && !v) errors.push(`${where}, ${def.itemLabel?.toLowerCase()} ${k + 1}: fill in "${f.label}".`)
        else if (v && f.kind === 'link' && !LINK_OK.test(v)) errors.push(`${where}, ${def.itemLabel?.toLowerCase()} ${k + 1}: "${f.label}" must start with https://, /, # or mailto:.`)
      }
    })
  })
  return errors
}
