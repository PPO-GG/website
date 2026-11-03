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

export function useDb(_event: unknown): D1Like {
  return undefined as unknown as D1Like
}
