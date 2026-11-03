import { defineEventHandler, getQuery, getRouterParam } from 'h3'
import { requireOwner } from '../../../utils/access'
import { adminTable, listRows } from '../../../utils/admin-repo'
import { useDb } from '../../../utils/db'

const DEFAULT_SORT = { apps: 'order', posts: 'publishedAt', pages: 'title' } as const

export default defineEventHandler(async (event) => {
  await requireOwner(event)
  const table = adminTable(getRouterParam(event, 'table'))
  const query = getQuery(event)
  const key = typeof query.sort === 'string' ? query.sort : DEFAULT_SORT[table]
  return listRows(useDb(event), table, { key, desc: query.desc === '1' })
})
