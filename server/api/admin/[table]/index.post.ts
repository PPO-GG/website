import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { requireOwner } from '../../../utils/access'
import { adminTable, createRow } from '../../../utils/admin-repo'
import { requireSameOriginWrite } from '../../../utils/csrf'
import { useDb } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  await requireOwner(event)
  requireSameOriginWrite(event, { json: true })
  const table = adminTable(getRouterParam(event, 'table'))
  const id = await createRow(useDb(event), table, await readBody(event))
  return { id }
})
