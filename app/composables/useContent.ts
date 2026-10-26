import { Client, Query, TablesDB } from 'appwrite'
import type { AppEntry, AppRow, PageRow, Post, PostRow, SitePage } from '~/types/app'
import { mapApp, mapPage, mapPost } from '~/utils/content/mappers'

const TABLE = { Apps: 'apps', Posts: 'posts', Pages: 'pages' } as const
const LIST_LIMIT = 100

export interface Loaded<T> {
  data: T
  /** True when Appwrite could not be reached or answered with an error. */
  failed: boolean
}

/** Public read access to published content. Writes live in the admin area. */
export function useContent() {
  const cfg = useRuntimeConfig().public.appwrite
  const client = new Client().setEndpoint(cfg.endpoint).setProject(cfg.projectId)
  const db = new TablesDB(client)

  const fileUrl = (fileId: string) => `${cfg.endpoint}/storage/buckets/${cfg.bucketId}/files/${fileId}/view?project=${cfg.projectId}`

  // A failed read is logged with its context and returned as `failed`, so pages can say so
  // instead of showing an empty site that looks intentional.
  async function load<R, T>(what: string, tableId: string, queries: string[], map: (rows: R[]) => T, empty: T): Promise<Loaded<T>> {
    try {
      const res = await db.listRows({ databaseId: cfg.databaseId, tableId, queries })
      return { data: map(res.rows as unknown as R[]), failed: false }
    } catch (e) {
      console.error(`[content] could not load ${what} from table "${tableId}"`, e)
      return { data: empty, failed: true }
    }
  }

  const published = Query.equal('published', true)

  return {
    fileUrl,
    apps: (): Promise<Loaded<AppEntry[]>> =>
      load<AppRow, AppEntry[]>('apps', TABLE.Apps, [published, Query.orderAsc('order'), Query.limit(LIST_LIMIT)], (rows) => rows.map((r) => mapApp(r, fileUrl)), []),
    posts: (): Promise<Loaded<Post[]>> =>
      load<PostRow, Post[]>('posts', TABLE.Posts, [published, Query.orderDesc('publishedAt'), Query.limit(LIST_LIMIT)], (rows) => rows.map(mapPost), []),
    post: (slug: string): Promise<Loaded<Post | undefined>> =>
      load<PostRow, Post | undefined>('post', TABLE.Posts, [published, Query.equal('slug', slug), Query.limit(1)], (rows) => (rows[0] ? mapPost(rows[0]) : undefined), undefined),
    page: (slug: string): Promise<Loaded<SitePage | undefined>> =>
      load<PageRow, SitePage | undefined>('page', TABLE.Pages, [published, Query.equal('slug', slug), Query.limit(1)], (rows) => (rows[0] ? mapPage(rows[0]) : undefined), undefined),
  }
}
