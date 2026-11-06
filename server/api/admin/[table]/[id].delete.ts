import { defineEventHandler, getRouterParam } from 'h3'
import { requireOwner } from '../../../utils/access'
import { adminTable, deleteRow } from '../../../utils/admin-repo'
import { requireSameOriginWrite } from '../../../utils/csrf'
import { useDb } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  await requireOwner(event)
  requireSameOriginWrite(event, { json: false })
  const table = adminTable(getRouterParam(event, 'table'))
  await deleteRow(useDb(event), table, getRouterParam(event, 'id') ?? '')
  return { id: getRouterParam(event, 'id') }
})
