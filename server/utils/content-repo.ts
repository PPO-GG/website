import type { AppRow, PageRow, PostRow } from '~/types/app'
import type { D1Like } from './db'

export async function listPublishedApps(_db: D1Like): Promise<AppRow[]> {
  return []
}

export async function listPublishedPosts(_db: D1Like): Promise<PostRow[]> {
  return []
}

export async function getPublishedPost(_db: D1Like, _slug: string): Promise<PostRow | null> {
  return null
}

export async function getPublishedPage(_db: D1Like, _slug: string): Promise<PageRow | null> {
  return null
}
