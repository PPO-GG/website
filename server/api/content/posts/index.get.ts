import { defineEventHandler } from 'h3'
import { listPublishedPosts } from '../../../utils/content-repo'
import { readPublic } from '../../../utils/db'

export default defineEventHandler((event) => readPublic(event, listPublishedPosts))
