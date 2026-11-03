import type { AppRow, PageRow, PostRow } from '~/types/app'

export const TABLE = { Apps: 'apps', Posts: 'posts', Pages: 'pages' } as const
export type Table = (typeof TABLE)[keyof typeof TABLE]

/** Columns each table exposes to the app (createdAt and updatedAt stay in the database). */
const COLUMNS: Record<Table, readonly string[]> = {
  apps: ['name', 'kind', 'stack', 'year', 'status', 'href', 'order', 'description', 'imageId', 'imageUrl', 'published'],
  posts: ['slug', 'title', 'description', 'body', 'publishedAt', 'published'],
  pages: ['slug', 'title', 'body', 'published'],
}

function parseStack(value: unknown): string[] {
  if (typeof value !== 'string') return []
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : []
  } catch {
    return []
  }
}

/** Converts a raw D1 row to the app row shape. Only `1` and `true` count as published. */
export function dbToRow(table: Table, raw: Record<string, unknown>): AppRow | PostRow | PageRow {
  const row: Record<string, unknown> = { id: raw.id }
  for (const key of COLUMNS[table]) if (key in raw) row[key] = raw[key]
  row.published = raw.published === 1 || raw.published === true
  if (table === TABLE.Apps) row.stack = parseStack(raw.stack)
  return row as unknown as AppRow | PostRow | PageRow
}

/** Converts admin data to D1 column values. */
export function dataToDb(table: Table, id: string, data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { id }
  for (const key of COLUMNS[table]) if (key in data) out[key] = data[key]
  if ('published' in out) out.published = out.published === true ? 1 : 0
  if (table === TABLE.Apps && 'stack' in out) out.stack = JSON.stringify(out.stack ?? [])
  return out
}
