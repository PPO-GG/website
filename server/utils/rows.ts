import type { AppRow, PageRow, PostRow } from '~/types/app'

export const TABLE = { Apps: 'apps', Posts: 'posts', Pages: 'pages' } as const
export type Table = (typeof TABLE)[keyof typeof TABLE]

/** Converts a raw D1 row to the app row shape. */
export function dbToRow(_table: Table, raw: Record<string, unknown>): AppRow | PostRow | PageRow {
  return raw as unknown as AppRow
}

/** Converts admin data to D1 column values. */
export function dataToDb(_table: Table, id: string, data: Record<string, unknown>): Record<string, unknown> {
  return { id, ...data }
}
