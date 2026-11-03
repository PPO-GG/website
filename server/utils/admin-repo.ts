import { createError, isError } from 'h3'
import type { AppRow, PageRow, PostRow } from '~/types/app'
import { APP_STATUS } from '~/types/app'
import {
  appToForm, pageToForm, postToForm, toAppData, toPageData, toPostData, validateApp, validatePage, validatePost,
} from '~/utils/content/admin'
import type { D1Like } from './db'
import { dataToDb, dbToRow, TABLE } from './rows'
import type { Table } from './rows'

export interface SortSpec {
  key: string
  desc?: boolean
}

const LIST_LIMIT = 100
const UNIQUE_VIOLATION = 'UNIQUE constraint failed'

/** The columns a list may be sorted by. Only these reach the ORDER BY clause. */
export const SORT_KEYS: Record<Table, readonly string[]> = {
  apps: ['order', 'name'],
  posts: ['publishedAt', 'title'],
  pages: ['title', 'slug'],
}

type FieldKind = 'string' | 'string?' | 'number' | 'number?' | 'boolean?' | 'strings'

/** Field types the server checks before any form code runs. A `?` field may be missing. */
const FIELDS: Record<Table, Record<string, FieldKind>> = {
  apps: {
    name: 'string', kind: 'string', stack: 'strings', year: 'number', status: 'string', href: 'string',
    order: 'number?', description: 'string?', imageId: 'string?', imageUrl: 'string?', published: 'boolean?',
  },
  posts: { slug: 'string', title: 'string', description: 'string?', body: 'string', publishedAt: 'string', published: 'boolean?' },
  pages: { slug: 'string', title: 'string', body: 'string', published: 'boolean?' },
}

const APP_STATUSES: readonly string[] = Object.values(APP_STATUS)

const httpError = (statusCode: number, statusMessage: string, data?: unknown) => createError({ statusCode, statusMessage, data })
const invalid = (errors: string[]) => httpError(422, 'Invalid content', { errors })

/** Maps the `[table]` route parameter to a table. Anything else is a 404. */
export function adminTable(name: string | undefined): Table {
  const found = (Object.values(TABLE) as string[]).find((t) => t === name)
  if (!found) throw httpError(404, 'Not found')
  return found as Table
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function kindMatches(kind: FieldKind, value: unknown): boolean {
  switch (kind) {
    case 'string': return typeof value === 'string'
    case 'string?': return value == null || typeof value === 'string'
    case 'number': return typeof value === 'number' && Number.isFinite(value)
    case 'number?': return value == null || (typeof value === 'number' && Number.isFinite(value))
    case 'boolean?': return value == null || typeof value === 'boolean'
    case 'strings': return Array.isArray(value) && value.every((s) => typeof s === 'string')
  }
}

/** Keeps only known fields, rejects wrong types, then runs the shared form checks. Returns the data to store. */
function validated(table: Table, id: string, body: unknown): Record<string, unknown> {
  if (!isPlainObject(body)) throw httpError(400, 'Send a JSON object')
  const spec = FIELDS[table]
  const errors: string[] = []
  const data: Record<string, unknown> = {}
  for (const [key, kind] of Object.entries(spec)) {
    const value = body[key]
    if (!kindMatches(kind, value)) errors.push(`The "${key}" field has the wrong type.`)
    else if (value !== undefined) data[key] = value
  }
  if (table === TABLE.Apps && typeof data.status === 'string' && !APP_STATUSES.includes(data.status)) {
    errors.push('Use live, beta or wip as the status.')
  }
  if (errors.length) throw invalid(errors)

  data.published = data.published === true
  const row = { id, ...data }
  let messages: string[]
  let stored: Record<string, unknown>
  if (table === TABLE.Apps) {
    const form = appToForm({ order: 0, ...row } as unknown as AppRow)
    messages = validateApp(form)
    stored = toAppData(form)
  } else if (table === TABLE.Posts) {
    const form = postToForm(row as unknown as PostRow)
    messages = validatePost(form)
    stored = toPostData(form)
  } else {
    const form = pageToForm(row as unknown as PageRow)
    messages = validatePage(form)
    stored = toPageData(form)
  }
  if (messages.length) throw invalid(messages)
  return stored
}

/** Runs a database call. Known errors pass through; a slug clash is 409; anything else is a 500 with no detail. */
async function guarded<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (error) {
    if (isError(error)) throw error
    const text = error instanceof Error ? error.message : ''
    if (text.includes(UNIQUE_VIOLATION) && text.includes('slug')) throw httpError(409, 'That slug is already in use')
    console.error('admin content write failed', error)
    throw httpError(500, 'Database unavailable')
  }
}

export async function listRows(db: D1Like, table: Table, sort: SortSpec): Promise<unknown[]> {
  if (!SORT_KEYS[table].includes(sort.key)) throw httpError(400, 'Unknown sort key')
  const direction = sort.desc ? 'DESC' : 'ASC'
  return guarded(async () => {
    const { results } = await db
      .prepare(`SELECT * FROM ${table} ORDER BY "${sort.key}" ${direction}, id ASC LIMIT ?`)
      .bind(LIST_LIMIT)
      .all()
    return results.map((r) => dbToRow(table, r))
  })
}

/** Validates and inserts a row. Returns the new id. */
export async function createRow(db: D1Like, table: Table, data: unknown): Promise<string> {
  const id = crypto.randomUUID()
  const values = dataToDb(table, id, validated(table, id, data))
  const now = new Date().toISOString()
  const columns = [...Object.keys(values), 'createdAt', 'updatedAt']
  const params = [...Object.values(values), now, now]
  const sql = `INSERT INTO ${table} (${columns.map((c) => `"${c}"`).join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`
  await guarded(() => db.prepare(sql).bind(...params).run())
  return id
}

export async function updateRow(db: D1Like, table: Table, id: string, data: unknown): Promise<void> {
  const { id: _id, ...values } = dataToDb(table, id, validated(table, id, data))
  const columns = [...Object.keys(values), 'updatedAt']
  const params = [...Object.values(values), new Date().toISOString(), id]
  const sql = `UPDATE ${table} SET ${columns.map((c) => `"${c}" = ?`).join(', ')} WHERE id = ?`
  const result = await guarded(() => db.prepare(sql).bind(...params).run())
  if (result.meta.changes === 0) throw httpError(404, 'Not found')
}

export async function deleteRow(db: D1Like, table: Table, id: string): Promise<void> {
  const result = await guarded(() => db.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run())
  if (result.meta.changes === 0) throw httpError(404, 'Not found')
}
