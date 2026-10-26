import { APP_STATUS } from '~/types/app'
import type { AppEntry, AppRow, AppStatus, PageRow, Post, PostRow, SitePage } from '~/types/app'

const KNOWN_STATUS: readonly string[] = Object.values(APP_STATUS)

// An unknown status must never read as "live".
function toStatus(s: string): AppStatus {
  return KNOWN_STATUS.includes(s) ? (s as AppStatus) : APP_STATUS.Wip
}

export function mapApp(row: AppRow, imageUrl: (fileId: string) => string): AppEntry {
  return {
    id: row.$id,
    name: row.name,
    kind: row.kind,
    stack: row.stack,
    year: row.year,
    status: toStatus(row.status),
    href: row.href,
    order: row.order,
    ...(row.imageId ? { img: imageUrl(row.imageId) } : {}),
    ...(row.description ? { description: row.description } : {}),
  }
}

export function mapPost(row: PostRow): Post {
  return {
    id: row.$id,
    slug: row.slug,
    title: row.title,
    description: row.description ?? '',
    body: row.body,
    publishedAt: row.publishedAt,
  }
}

export function mapPage(row: PageRow): SitePage {
  return { id: row.$id, slug: row.slug, title: row.title, body: row.body }
}
