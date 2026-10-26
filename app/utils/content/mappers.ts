import type { AppEntry, AppRow, PageRow, Post, PostRow, SitePage } from '~/types/app'

export function mapApp(_row: AppRow, _imageUrl: (fileId: string) => string): AppEntry {
  throw new Error('not implemented')
}

export function mapPost(_row: PostRow): Post {
  throw new Error('not implemented')
}

export function mapPage(_row: PageRow): SitePage {
  throw new Error('not implemented')
}
