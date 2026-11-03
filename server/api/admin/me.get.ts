import { defineEventHandler } from 'h3'
import { requireOwner } from '../../utils/access'

export default defineEventHandler(async (event) => {
  const { email } = await requireOwner(event)
  return { email }
})
