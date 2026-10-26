import { Account, AppwriteException, Client, ID, Query, Storage, TablesDB } from 'appwrite'
import type { Models } from 'appwrite'
import { rowPermissions } from '~/utils/content/admin'

export const ADMIN_LABEL = 'admin'
export const ADMIN_TABLE = { Apps: 'apps', Posts: 'posts', Pages: 'pages' } as const
export type AdminTable = (typeof ADMIN_TABLE)[keyof typeof ADMIN_TABLE]

const LIST_LIMIT = 100
const HTTP = { Unauthorized: 401, Forbidden: 403, Conflict: 409 } as const

/** Turns an SDK error into one plain sentence for the person using the editor. */
export function explain(e: unknown): string {
  if (e instanceof AppwriteException) {
    if (e.code === HTTP.Unauthorized || e.code === HTTP.Forbidden) return 'Your login ended or has no access. Log in again.'
    if (e.code === HTTP.Conflict) return 'This slug is already in use. Choose a different slug.'
    return `Appwrite returned an error: ${e.message}`
  }
  return e instanceof Error ? e.message : 'Something went wrong. Try again.'
}

/** Client-side admin access. The session lives in the browser; Appwrite permissions are the real lock. */
export function useAdmin() {
  const cfg = useRuntimeConfig().public.appwrite
  const client = new Client().setEndpoint(cfg.endpoint).setProject(cfg.projectId)
  const account = new Account(client)
  const db = new TablesDB(client)
  const storage = new Storage(client)
  const user = useState<Models.User<Models.Preferences> | null>('admin-user', () => null)

  const isAdmin = (u: Models.User<Models.Preferences>) => u.labels.includes(ADMIN_LABEL)

  /** Restores a saved session. Returns false when nobody, or a non-admin, is logged in. */
  async function restore(): Promise<boolean> {
    try {
      const u = await account.get()
      user.value = isAdmin(u) ? u : null
    } catch {
      user.value = null // no session is the normal logged-out state
    }
    return user.value !== null
  }

  async function login(email: string, password: string): Promise<void> {
    await account.createEmailPasswordSession({ email, password })
    const u = await account.get()
    if (!isAdmin(u)) {
      await account.deleteSession({ sessionId: 'current' })
      throw new Error('This account has no admin access.')
    }
    user.value = u
  }

  async function logout(): Promise<void> {
    try {
      await account.deleteSession({ sessionId: 'current' })
    } finally {
      user.value = null
    }
  }

  async function list<R>(tableId: AdminTable, order: { key: string; desc?: boolean }): Promise<R[]> {
    const res = await db.listRows({
      databaseId: cfg.databaseId,
      tableId,
      queries: [order.desc ? Query.orderDesc(order.key) : Query.orderAsc(order.key), Query.limit(LIST_LIMIT)],
    })
    return res.rows as unknown as R[]
  }

  /** Creates (no id) or updates a row. Publishing is the read(any) permission, set here. */
  async function save(tableId: AdminTable, id: string | undefined, data: Record<string, unknown>, published: boolean): Promise<void> {
    const permissions = rowPermissions(published)
    if (id) await db.updateRow({ databaseId: cfg.databaseId, tableId, rowId: id, data, permissions })
    else await db.createRow({ databaseId: cfg.databaseId, tableId, rowId: ID.unique(), data, permissions })
  }

  async function remove(tableId: AdminTable, id: string): Promise<void> {
    await db.deleteRow({ databaseId: cfg.databaseId, tableId, rowId: id })
  }

  /** Uploads an image to the public media bucket. */
  async function upload(file: File): Promise<{ id: string; url: string }> {
    const created = await storage.createFile({ bucketId: cfg.bucketId, fileId: ID.unique(), file, permissions: ['read("any")'] })
    return { id: created.$id, url: `${cfg.endpoint}/storage/buckets/${cfg.bucketId}/files/${created.$id}/view?project=${cfg.projectId}` }
  }

  return { user, restore, login, logout, list, save, remove, upload }
}
