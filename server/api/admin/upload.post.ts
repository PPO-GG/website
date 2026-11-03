import { defineEventHandler } from 'h3'
import { requireOwner } from '../../utils/access'
import { requireSameOriginWrite } from '../../utils/csrf'
import { uploadMedia } from '../../utils/media'

export default defineEventHandler(async (event) => {
  await requireOwner(event)
  requireSameOriginWrite(event, { json: false })
  return uploadMedia(event)
})
