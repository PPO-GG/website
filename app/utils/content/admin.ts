import { APP_STATUS } from '~/types/app'
import type { AppRow, AppStatus, PageRow, PostRow } from '~/types/app'
import type { Block } from '~/types/blocks'
import { BLOCK_TYPE } from '~/types/blocks'
import { blankBlock, parseBody, serializeBlocks, validateBlocks } from '~/utils/content/blocks'
import { isSystemSlug, isValidSlug } from '~/utils/content/slug'

export interface AppForm {
  name: string
  kind: string
  stackText: string
  year: number
  status: AppStatus
  href: string
  order: number
  description: string
  imageId: string
  imageUrl: string
  published: boolean
}

export interface PostForm {
  title: string
  slug: string
  description: string
  body: string
  /** Date part only, YYYY-MM-DD. */
  date: string
  published: boolean
}

export type PageMode = 'blocks' | 'markdown'

export interface PageForm {
  title: string
  slug: string
  mode: PageMode
  /** Used when mode is "markdown". */
  body: string
  /** Used when mode is "blocks". */
  blocks: Block[]
  published: boolean
}

export const YEAR_MIN = 1990
export const YEAR_MAX = 2100
export const STACK_MAX = 12

const HREF_OK = /^(#|\/|https?:\/\/)/
const DATE_SHAPE = /^\d{4}-\d{2}-\d{2}$/
const SLUG_HELP = 'Use only lowercase letters, numbers and single dashes in the slug. Do not use a reserved word.'
const KNOWN_STATUS: readonly string[] = Object.values(APP_STATUS)

const orNull = (s: string): string | null => s.trim() || null

function isRealDate(d: string): boolean {
  if (!DATE_SHAPE.test(d)) return false
  const t = new Date(`${d}T00:00:00.000Z`)
  return !Number.isNaN(t.getTime()) && t.toISOString().startsWith(d)
}

/** Read access for guests is the whole publish switch: Appwrite hides rows without it. */
export function rowPermissions(published: boolean): string[] {
  return published ? ['read("any")'] : []
}

export function parseStack(text: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of text.split(/[,/]/)) {
    const t = part.trim()
    const key = t.toLowerCase()
    if (!t || seen.has(key)) continue
    seen.add(key)
    out.push(t)
    if (out.length === STACK_MAX) break
  }
  return out
}

export function formatStack(stack: string[]): string {
  return stack.join(', ')
}

export function validateApp(f: AppForm): string[] {
  const errors: string[] = []
  if (!f.name.trim()) errors.push('Enter a name.')
  if (!f.kind.trim()) errors.push('Enter a kind, for example Web app.')
  if (!HREF_OK.test(f.href.trim())) errors.push('Use a link that starts with https://, or use #.')
  if (!Number.isInteger(f.year) || f.year < YEAR_MIN || f.year > YEAR_MAX) {
    errors.push(`Use a year from ${YEAR_MIN} to ${YEAR_MAX}.`)
  }
  return errors
}

export function validatePost(f: PostForm): string[] {
  const errors: string[] = []
  if (!f.title.trim()) errors.push('Enter a title.')
  if (!isValidSlug(f.slug.trim())) errors.push(SLUG_HELP)
  if (!f.body.trim()) errors.push('Write the body text.')
  if (!isRealDate(f.date)) errors.push('Use a date in the format YYYY-MM-DD.')
  return errors
}

export function validatePage(f: PageForm): string[] {
  const errors: string[] = []
  if (!f.title.trim()) errors.push('Enter a title.')
  if (!isValidSlug(f.slug.trim()) && !isSystemSlug(f.slug.trim())) errors.push(SLUG_HELP)
  if (f.mode === 'blocks') errors.push(...validateBlocks(f.blocks))
  else if (!f.body.trim()) errors.push('Write the body text.')
  return errors
}

export function toAppData(f: AppForm): Record<string, unknown> {
  return {
    name: f.name.trim(),
    kind: f.kind.trim(),
    stack: parseStack(f.stackText),
    year: f.year,
    status: f.status,
    href: f.href.trim(),
    order: f.order,
    description: orNull(f.description),
    imageId: orNull(f.imageId),
    imageUrl: orNull(f.imageUrl),
    published: f.published,
  }
}

export function toPostData(f: PostForm): Record<string, unknown> {
  return {
    title: f.title.trim(),
    slug: f.slug.trim(),
    description: orNull(f.description),
    body: f.body,
    publishedAt: `${f.date}T00:00:00.000+00:00`,
    published: f.published,
  }
}

export function toPageData(f: PageForm): Record<string, unknown> {
  const body = f.mode === 'blocks' ? serializeBlocks(f.blocks) : f.body
  return { title: f.title.trim(), slug: f.slug.trim(), body, published: f.published }
}

/** Moves a Markdown page into the builder as one text block, so no content is lost. */
export function markdownToBlocks(markdown: string): Block[] {
  const b = blankBlock(BLOCK_TYPE.Text)
  b.data.body = markdown
  return [b]
}

export const blankApp = (): AppForm => ({
  name: '', kind: '', stackText: '', year: new Date().getFullYear(), status: APP_STATUS.Live, href: '', order: 0,
  description: '', imageId: '', imageUrl: '', published: false,
})

export const blankPost = (today: string): PostForm => ({ title: '', slug: '', description: '', body: '', date: today, published: false })

export const blankPage = (): PageForm => ({ title: '', slug: '', mode: 'blocks', body: '', blocks: [], published: false })

export function appToForm(row: AppRow): AppForm {
  return {
    name: row.name,
    kind: row.kind,
    stackText: formatStack(row.stack ?? []),
    year: row.year,
    status: (KNOWN_STATUS.includes(row.status) ? row.status : APP_STATUS.Wip) as AppStatus,
    href: row.href,
    order: row.order ?? 0,
    description: row.description ?? '',
    imageId: row.imageId ?? '',
    imageUrl: row.imageUrl ?? '',
    published: row.published,
  }
}

export function postToForm(row: PostRow): PostForm {
  return {
    title: row.title,
    slug: row.slug,
    description: row.description ?? '',
    body: row.body,
    date: row.publishedAt.slice(0, 10),
    published: row.published,
  }
}

export function pageToForm(row: PageRow): PageForm {
  const parsed = parseBody(row.body)
  return parsed.kind === 'blocks'
    ? { title: row.title, slug: row.slug, mode: 'blocks', body: '', blocks: parsed.blocks, published: row.published }
    : { title: row.title, slug: row.slug, mode: 'markdown', body: parsed.markdown, blocks: [], published: row.published }
}
