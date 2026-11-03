import type { AppRow, PageRow, PostRow } from '~/types/app'
import { isSystemSlug, isValidSlug } from '~/utils/content/slug'
import type { D1Like } from './db'
import { dbToRow, TABLE } from './rows'

const LIST_LIMIT = 100

/** Public reads return only rows with published = 1. */
export async function listPublishedApps(db: D1Like): Promise<AppRow[]> {
  const { results } = await db
    .prepare('SELECT * FROM apps WHERE published = 1 ORDER BY "order" ASC, name ASC LIMIT ?')
    .bind(LIST_LIMIT)
    .all()
  return results.map((r) => dbToRow(TABLE.Apps, r) as AppRow)
}

export async function listPublishedPosts(db: D1Like): Promise<PostRow[]> {
  const { results } = await db
    .prepare('SELECT * FROM posts WHERE published = 1 ORDER BY publishedAt DESC LIMIT ?')
    .bind(LIST_LIMIT)
    .all()
  return results.map((r) => dbToRow(TABLE.Posts, r) as PostRow)
}

export async function getPublishedPost(db: D1Like, slug: string): Promise<PostRow | null> {
  if (!isValidSlug(slug)) return null
  const raw = await db.prepare('SELECT * FROM posts WHERE published = 1 AND slug = ? LIMIT 1').bind(slug).first()
  return raw ? (dbToRow(TABLE.Posts, raw) as PostRow) : null
}

/** System pages (home, services, site-settings) are reserved slugs but are served here. */
export async function getPublishedPage(db: D1Like, slug: string): Promise<PageRow | null> {
  if (!isSystemSlug(slug) && !isValidSlug(slug)) return null
  const raw = await db.prepare('SELECT * FROM pages WHERE published = 1 AND slug = ? LIMIT 1').bind(slug).first()
  return raw ? (dbToRow(TABLE.Pages, raw) as PageRow) : null
}
