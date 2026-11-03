import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { requireOwner } from '../../../utils/access'
import { adminTable, updateRow } from '../../../utils/admin-repo'
import { useDb } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  await requireOwner(event)
  const table = adminTable(getRouterParam(event, 'table'))
  const id = getRouterParam(event, 'id') ?? ''
  await updateRow(useDb(event), table, id, await readBody(event))
  return { id }
})
