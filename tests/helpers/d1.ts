import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'
import type { D1Like, D1StatementLike } from '../../server/utils/db'

type SqlValue = null | number | bigint | string

const MIGRATION = fileURLToPath(new URL('../../migrations/0001_init.sql', import.meta.url))

/** In-memory SQLite with the D1 subset the server code uses. Like D1, calls reject on SQL errors. */
export function makeTestDb(): D1Like {
  const db = new DatabaseSync(':memory:')
  db.exec(readFileSync(MIGRATION, 'utf8'))
  const statement = (sql: string, params: unknown[]): D1StatementLike => ({
    bind: (...next) => statement(sql, next),
    all: async <T>() => ({ results: db.prepare(sql).all(...(params as SqlValue[])) as T[] }),
    first: async <T>() => (db.prepare(sql).get(...(params as SqlValue[])) as T | undefined) ?? null,
    run: async () => {
      const { changes } = db.prepare(sql).run(...(params as SqlValue[]))
      return { success: true, meta: { changes: Number(changes) } }
    },
  })
  return { prepare: (sql) => statement(sql, []) }
}
