import type { AppEntry, AppRow, PageRow, Post, PostRow, SitePage } from '~/types/app'
import { mapApp, mapPage, mapPost } from '~/utils/content/mappers'

export interface Loaded<T> {
  data: T
  /** True when the content API could not be reached or answered with an error. */
  failed: boolean
}

/** Public read access to published content through the site's own API. Writes live in the admin area. */
export function useContent() {
  const api = useRequestFetch()

  const fileUrl = (fileId: string) => `/media/${fileId}`

  // A failed read is logged with its context and returned as `failed`, so pages can say so
  // instead of showing an empty site that looks intentional.
  async function load<R, T>(what: string, path: string, map: (res: R) => T, empty: T): Promise<Loaded<T>> {
    try {
      return { data: map(await api<R>(path)), failed: false }
    } catch (e) {
      console.error(`[content] could not load ${what} from "${path}"`, e)
      return { data: empty, failed: true }
    }
  }

  return {
    fileUrl,
    apps: (): Promise<Loaded<AppEntry[]>> =>
      load<AppRow[], AppEntry[]>('apps', '/api/content/apps', (rows) => rows.map((r) => mapApp(r, fileUrl)), []),
    posts: (): Promise<Loaded<Post[]>> =>
      load<PostRow[], Post[]>('posts', '/api/content/posts', (rows) => rows.map(mapPost), []),
    post: (slug: string): Promise<Loaded<Post | undefined>> =>
      load<PostRow | null, Post | undefined>('post', `/api/content/posts/${encodeURIComponent(slug)}`, (row) => (row ? mapPost(row) : undefined), undefined),
    page: (slug: string): Promise<Loaded<SitePage | undefined>> =>
      load<PageRow | null, SitePage | undefined>('page', `/api/content/pages/${encodeURIComponent(slug)}`, (row) => (row ? mapPage(row) : undefined), undefined),
  }
}
