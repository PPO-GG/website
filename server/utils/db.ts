import { createError } from 'h3'

/** The subset of Cloudflare D1 that server code uses. Lets tests swap in an in-memory SQLite. */
export interface D1Result<T = Record<string, unknown>> {
  results: T[]
}

export interface D1StatementLike {
  bind(...params: unknown[]): D1StatementLike
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>
  first<T = Record<string, unknown>>(): Promise<T | null>
  run(): Promise<unknown>
}

export interface D1Like {
  prepare(sql: string): D1StatementLike
}

/** Any H3 event: only the Cloudflare context is read. */
export interface DbEvent {
  context: { cloudflare?: { env?: { DB?: D1Like } } }
}

/** The D1 binding for this request. A missing binding is a server error, never an empty result. */
export function useDb(event: DbEvent): D1Like {
  const db = event.context.cloudflare?.env?.DB
  if (!db) throw createError({ statusCode: 500, statusMessage: 'Database unavailable' })
  return db
}

/** Runs a public read. Any D1 failure becomes a 500 with no detail in the response. */
export async function readPublic<T>(event: DbEvent, read: (db: D1Like) => Promise<T>): Promise<T> {
  const db = useDb(event)
  try {
    return await read(db)
  } catch (error) {
    console.error('public content read failed', error)
    throw createError({ statusCode: 500, statusMessage: 'Database unavailable' })
  }
}
