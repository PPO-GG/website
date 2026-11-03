import type { D1Like } from './db'
import type { Table } from './rows'

export interface SortSpec {
  key: string
  desc?: boolean
}

export const SORT_KEYS: Record<Table, readonly string[]> = {
  apps: ['order', 'name'],
  posts: ['publishedAt', 'title'],
  pages: ['title', 'slug'],
}

/** Maps the `[table]` route parameter to a table. Anything else is a 404. */
export function adminTable(_name: string | undefined): Table {
  throw new Error('not implemented')
}

export async function listRows(_db: D1Like, _table: Table, _sort: SortSpec): Promise<unknown[]> {
  throw new Error('not implemented')
}

/** Validates and inserts a row. Returns the new id. */
export async function createRow(_db: D1Like, _table: Table, _data: unknown): Promise<string> {
  throw new Error('not implemented')
}

export async function updateRow(_db: D1Like, _table: Table, _id: string, _data: unknown): Promise<void> {
  throw new Error('not implemented')
}

export async function deleteRow(_db: D1Like, _table: Table, _id: string): Promise<void> {
  throw new Error('not implemented')
}
