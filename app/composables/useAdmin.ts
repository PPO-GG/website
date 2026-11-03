export const ADMIN_TABLE = { Apps: 'apps', Posts: 'posts', Pages: 'pages' } as const
export type AdminTable = (typeof ADMIN_TABLE)[keyof typeof ADMIN_TABLE]

const HTTP = { Unauthorized: 401, Forbidden: 403, Conflict: 409, TooLarge: 413, UnsupportedType: 415, Invalid: 422 } as const

interface FetchLikeError {
  statusCode?: number
  status?: number
  data?: { errors?: unknown }
  message?: string
}

/** Turns a failed request into one plain sentence for the person using the editor. */
export function explain(e: unknown): string {
  if (e && typeof e === 'object') {
    const err = e as FetchLikeError
    switch (err.statusCode ?? err.status) {
      case HTTP.Unauthorized:
      case HTTP.Forbidden:
        return 'Your login ended or has no access. Log in again.'
      case HTTP.Conflict:
        return 'This slug is already in use. Choose a different slug.'
      case HTTP.Invalid:
        if (Array.isArray(err.data?.errors) && err.data.errors.length) return err.data.errors.join(' ')
        break
      case HTTP.TooLarge:
        return 'The file is too big. The limit is 10 MB.'
      case HTTP.UnsupportedType:
        return 'This file type is not allowed. Use png, jpg, webp, gif or svg.'
    }
  }
  return e instanceof Error ? e.message : 'Something went wrong. Try again.'
}

/** Client-side admin access. Cloudflare Access guards the routes; the server checks every request. */
export function useAdmin() {
  const user = useState<{ email: string } | null>('admin-user', () => null)
  const api = useRequestFetch()

  /** Asks the server who is logged in. Returns false when nobody has access. */
  async function restore(): Promise<boolean> {
    try {
      user.value = await api<{ email: string }>('/api/admin/me')
    } catch {
      user.value = null // no access is the normal logged-out state
    }
    return user.value !== null
  }

  async function list<R>(tableId: AdminTable, order: { key: string; desc?: boolean }): Promise<R[]> {
    return await api<R[]>(`/api/admin/${tableId}`, { query: { sort: order.key, ...(order.desc ? { desc: 1 } : {}) } })
  }

  /** Creates (no id) or replaces a row. */
  async function save(tableId: AdminTable, id: string | undefined, data: Record<string, unknown>): Promise<void> {
    if (id) await api(`/api/admin/${tableId}/${id}`, { method: 'PUT', body: data })
    else await api(`/api/admin/${tableId}`, { method: 'POST', body: data })
  }

  async function remove(tableId: AdminTable, id: string): Promise<void> {
    await api(`/api/admin/${tableId}/${id}`, { method: 'DELETE' })
  }

  /** Uploads an image to the media store. */
  async function upload(file: File): Promise<{ id: string; url: string }> {
    const body = new FormData()
    body.append('file', file)
    return await api<{ id: string; url: string }>('/api/admin/upload', { method: 'POST', body })
  }

  return { user, restore, list, save, remove, upload }
}
