import { defineEventHandler, getRouterParam } from 'h3'
import { getPublishedPost } from '../../../utils/content-repo'
import { readPublic } from '../../../utils/db'

export default defineEventHandler((event) => {
  const slug = getRouterParam(event, 'slug') ?? ''
  return readPublic(event, (db) => getPublishedPost(db, slug))
})
